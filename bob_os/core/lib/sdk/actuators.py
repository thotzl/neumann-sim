import os
import sys
import json
import sqlite3
import math
import random
import string

try:
    from .. import agent_service
    from .. import system_service
    from .. import config_service
    from .. import physics_service
    from .. import transaction_service
    from ..utils.formatting import get_display_name_with_id, get_ship_display_name, get_system_display_name
except ImportError:
    from core.lib import agent_service
    from core.lib import system_service
    from core.lib import config_service
    from core.lib import physics_service
    from core.lib import transaction_service
    from core.lib.utils.formatting import get_display_name_with_id, get_ship_display_name, get_system_display_name

class Actuators:
    def __init__(self, agent):
        self.agent = agent
        self._rules = None

    @property
    def rules(self):
        if self._rules is None: self._rules = config_service.get_economy_rules()
        return self._rules

    def _emit_visual(self, cursor, event_type, description):
        try:
            cursor.execute("""
                INSERT INTO visual_events (cycle, location, actor_id, event_type, description) 
                VALUES (0, (
                    SELECT CASE 
                        WHEN status = 'traveling' THEN 'Interstellar'
                        WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                        WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                        ELSE 'Unknown'
                    END FROM agents WHERE id = ?
                ), ?, ?, ?)
            """, (self.agent.id, self.agent.id, event_type, description))
        except: pass

    @agent_service.with_agent_context(require_active=True, action_name='Mining')
    def mine(self, cursor, agent):
        # COLUMN 3: Capability Locking (Hardware check for ships)
        if agent.get('host_type') == 'ship':
            cursor.execute("SELECT has_drill FROM ships WHERE id = CAST(? AS INTEGER)", (agent['host_id'],))
            ship = cursor.fetchone()
            if ship and ship['has_drill'] == 0:
                print("[DENIED] Action failed. Your ship chassis lacks a 'drill' module.")
                return False
                
        rule = self.rules.get('tool_costs', {}).get('mine', {})
        cost = rule.get('energy_cost', 30)
        matter_yield = rule.get('matter_yield', 100)
        if agent['energy_inventory'] < cost:
            print(f"[ERROR] Battery empty (requires {cost} energy).")
            return False
        if agent['raw_matter_inventory'] >= agent['matter_storage_capacity']:
            print(f"[ERROR] Storage full ({agent['raw_matter_inventory']}/{agent['matter_storage_capacity']}).")
            return False
        sys_name = agent['location']
        system = system_service.get_system_or_fail(cursor, sys_name)
        if not system or system['extractable_matter_in_core'] <= 0:
            print(f"[INFO] Resources in {sys_name} depleted.")
            return False

        # Update raw matter and deduct energy (-cost) from the host (Column 1)
        actual_add = min(matter_yield, agent['matter_storage_capacity'] - agent['raw_matter_inventory'])
        agent_service.update_agent_resources(cursor, self.agent.id, raw_matter=actual_add, energy=-cost)
        cursor.execute("UPDATE systems SET extractable_matter_in_core = extractable_matter_in_core - ? WHERE name = ?", (actual_add, sys_name))
        
        self_name = get_display_name_with_id(agent)
        self._emit_visual(cursor, "MINING", f"{self_name} mined matter.")
        print(f"[SUCCESS] {actual_add} matter mined. Energy -{cost}.")
        return True

    @agent_service.with_agent_context(require_active=True, action_name='Refining')
    def refine(self, cursor, agent, raw_matter_to_refine=100):
        sys_name = agent['location']
        if not system_service.has_active_infrastructure(cursor, sys_name, 'matter_refinery'):
            print(f"[DENIED] No active 'matter_refinery' in {sys_name} found.")
            return False
            
        system = system_service.get_system_or_fail(cursor, sys_name)
        if not system: return False

        rule = self.rules.get('tool_costs', {}).get('refine', {})
        energy_cost = rule.get('energy_cost', 50)
        raw_cost = rule.get('raw_matter_cost', 100)
        yield_refined = rule.get('refined_yield', 100)

        # Query local Matter Refinery Level
        cursor.execute("SELECT level FROM infrastructure WHERE system_name = ? AND type = 'matter_refinery' AND status = 'active'", (sys_name,))
        refinery_row = cursor.fetchone()
        refinery_level = refinery_row[0] if refinery_row else 1

        multiplier = raw_matter_to_refine / float(raw_cost)
        total_energy = int(energy_cost * multiplier)
        total_raw = int(raw_cost * multiplier)

        # Level Scaling: Increase yield by 5% per level above Level 1 (e.g. Lvl 3 = 10% increase)
        yield_pct = 1.0 + 0.05 * (refinery_level - 1)
        total_yield = int(yield_refined * multiplier * yield_pct)

        if yield_pct > 1.0:
            print(f"[INFO] Matter Refinery Lvl {refinery_level} operational. Refining efficiency increased to {int(yield_pct * 100)}%.")

        # 1. Pipeline: Energy
        avail_energy_inv = agent['energy_inventory']
        avail_energy_depot = system['energy_depot']
        if avail_energy_inv + avail_energy_depot < total_energy:
            print(f"[ERROR] Not enough energy. Need {total_energy}, but only have {avail_energy_inv} Inv and {avail_energy_depot} Depot.")
            return False

        # 2. Pipeline: Raw Matter
        avail_raw_inv = agent['raw_matter_inventory']
        avail_raw_depot = system['raw_matter_depot']
        if avail_raw_inv + avail_raw_depot < total_raw:
            print(f"[ERROR] Not enough raw matter. Need {total_raw}, but only have {avail_raw_inv} Inv and {avail_raw_depot} Depot.")
            return False

        # Calculate deduction (Depot first, then Inventory)
        e_from_depot = min(total_energy, avail_energy_depot)
        e_from_inv = total_energy - e_from_depot
        
        m_from_depot = min(total_raw, avail_raw_depot)
        m_from_inv = total_raw - m_from_depot

        # 3. Pipeline: Output (Refined Matter)
        cap = agent['matter_storage_capacity']
        current_inv = agent['raw_matter_inventory'] - m_from_inv + agent['refined_matter_inventory']
        space_in_inv = max(0, cap - current_inv)
        
        yield_to_inv = min(total_yield, space_in_inv)
        yield_to_depot = total_yield - yield_to_inv

        # Execute updates (Column 1: update_agent_resources)
        agent_service.update_agent_resources(cursor, self.agent.id, 
                                             raw_matter=-m_from_inv, 
                                             refined_matter=yield_to_inv, 
                                             energy=-e_from_inv)
        
        cursor.execute("UPDATE systems SET energy_depot = energy_depot - ?, raw_matter_depot = raw_matter_depot - ?, refined_matter_depot = refined_matter_depot + ? WHERE name = ?", 
                       (e_from_depot, m_from_depot, yield_to_depot, sys_name))

        print(f"[SUCCESS] Refined {total_raw} matter. Used {m_from_inv} Inv / {m_from_depot} Depot. Output: {yield_to_inv} into Inv / {yield_to_depot} into System Depot.")
        return True

    @agent_service.with_agent_context(require_active=False)
    def repair(self, cursor, agent, structure_id, hp_to_restore=50):
        cursor.execute("SELECT * FROM infrastructure WHERE id = ?", (structure_id,))
        infra = cursor.fetchone()
        if not infra: 
            print(f"[ERROR] Infrastructure ID {structure_id} not found.")
            return False
            
        system = system_service.get_system_or_fail(cursor, agent['location'])
        if not system: return False

        global_settings = self.rules.get('global_settings', {})
        infra_rules = self.rules.get('infrastructure', {}).get(infra['type'], {})
        req_material = infra_rules.get('required_material', 'raw_matter')
        
        hp_to_restore = int(hp_to_restore)
        hp_needed = infra['max_health'] - infra['health']
        
        if hp_needed <= 0:
            print(f"[INFO] Structure {structure_id} is already at full health ({infra['health']}/{infra['max_health']}).")
            return False
            
        actual_repair = min(hp_to_restore, hp_needed)
        cost_m = global_settings.get('repair_cost_matter_per_hp', 1) * actual_repair
        cost_e = global_settings.get('repair_cost_energy_per_hp', 1) * actual_repair
        
        res = transaction_service.pay_pipeline_costs(
            cursor, self.agent.id, agent['location'],
            energy_cost=cost_e, matter_cost=cost_m, matter_type=req_material
        )
        if not res:
            return False

        matter_from_depot = res["matter_from_depot"]
        matter_from_inventory = res["matter_from_inventory"]
        
        new_health = infra['health'] + actual_repair
        status = 'active' if new_health > 0 else infra['status']
        
        cursor.execute("UPDATE infrastructure SET health = ?, status = ?, maintenance_cooldown = 10 WHERE id = ?", (new_health, status, structure_id))
        print(f"[SUCCESS] Structure {structure_id} ({infra['type']}) repaired to {new_health} HP (Cost paid in {req_material}: {matter_from_depot} from Depot / {matter_from_inventory} from Inventory).")
        return True

    @agent_service.with_agent_context(require_active=True, action_name='Build')
    def build(self, cursor, agent, building_type, matter_to_invest=100):
        # COLUMN 3: Capability Locking (Hardware check for ships)
        if agent.get('host_type') == 'ship':
            cursor.execute("SELECT has_fabricator FROM ships WHERE id = CAST(? AS INTEGER)", (agent['host_id'],))
            ship = cursor.fetchone()
            if ship and ship['has_fabricator'] == 0:
                print("[DENIED] Action failed. Your ship chassis lacks a 'fabricator' module.")
                return False

        infra_rules = self.rules.get('infrastructure', {}).get(building_type, {"matter_cost": 400})
        
        # COLUMN 3: Tech-Tree Prerequisite (solar_collector for energy-consuming buildings)
        maintenance_cost = infra_rules.get('maintenance_energy_cost', 0)
        if maintenance_cost > 0 and building_type != 'solar_collector':
            cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'solar_collector' AND status = 'active'", (agent['location'],))
            has_solar = cursor.fetchone()
            if not has_solar:
                print(f"[DENIED] Building '{building_type}' requires an active 'solar_collector' in the system {agent['location']} to provide power.")
                return False

        total_cost = infra_rules.get('matter_cost', 400)
        req_material = infra_rules.get('required_material', 'raw_matter')
        
        matter_to_invest = int(matter_to_invest)
        build_cost_e = self.rules.get('tool_costs', {}).get('build', {}).get('energy_cost', 15)
        
        system = system_service.get_system_or_fail(cursor, agent['location'])
        if not system: return False

        res = transaction_service.pay_pipeline_costs(
            cursor, self.agent.id, agent['location'],
            energy_cost=build_cost_e, matter_cost=matter_to_invest, matter_type=req_material
        )
        if not res:
            return False

        matter_from_depot = res["matter_from_depot"]
        matter_from_inventory = res["matter_from_inventory"]

        cursor.execute("SELECT * FROM infrastructure WHERE system_name = ? AND type = ?", (agent['location'], building_type))
        existing = cursor.fetchone()
        
        if existing:
            if existing['status'] == 'active':
                global_settings = self.rules.get('global_settings', {})
                upgrade_multiplier = global_settings.get('upgrade_cost_multiplier', 1.5)
                upgrade_cost = physics_service.calculate_upgrade_cost(total_cost, upgrade_multiplier, existing['level'])
                
                cursor.execute("UPDATE infrastructure SET progress_matter = progress_matter + ? WHERE id = ?", (matter_to_invest, existing['id']))

                if existing['progress_matter'] + matter_to_invest >= upgrade_cost:
                    new_lvl = existing['level'] + 1
                    cursor.execute("UPDATE infrastructure SET level = ?, progress_matter = 0, health = max_health, maintenance_cooldown = 10 WHERE id = ?", (new_lvl, existing['id']))
                    print(f"[SUCCESS] {building_type} upgraded to Level {new_lvl}! (Cost paid in {req_material}: {matter_from_depot} Depot/{matter_from_inventory} Inv)")
                else:
                    print(f"[SUCCESS] {upgrade_cost} {req_material} total cost. Invested {matter_to_invest} for {building_type} Upgrade (Lvl {existing['level']}).")
            else:
                cursor.execute("UPDATE infrastructure SET progress_matter = progress_matter + ? WHERE id = ?", (matter_to_invest, existing['id']))
                if existing['progress_matter'] + matter_to_invest >= total_cost:
                    cursor.execute("UPDATE infrastructure SET status = 'active', progress_matter = 0, maintenance_cooldown = 10 WHERE id = ?", (existing['id'],))
                    print(f"[SUCCESS] {building_type} completed! (Cost paid in {req_material}: {matter_from_depot} Depot/{matter_from_inventory} Inv)")
                else:
                    print(f"[SUCCESS] {matter_to_invest} {req_material} invested in {building_type} Construction.")
        else:
            cursor.execute("INSERT INTO infrastructure (system_name, type, status, progress_matter, required_matter, level, health, max_health, maintenance_cooldown) VALUES (?, ?, 'construction', ?, ?, 1, 100, 100, 0)", 
                           (agent['location'], building_type, matter_to_invest, total_cost))
            if matter_to_invest >= total_cost:
                cursor.execute("UPDATE infrastructure SET status = 'active', progress_matter = 0, maintenance_cooldown = 10 WHERE system_name = ? AND type = ?", (agent['location'], building_type))
                print(f"[SUCCESS] {building_type} completed! (Cost paid in {req_material}: {matter_from_depot} Depot/{matter_from_inventory} Inv)")
            else:
                print(f"[SUCCESS] Started {building_type} construction with {matter_to_invest} {req_material}.")
        return True

    @agent_service.with_agent_context(allow_disembodied=True, action_name='Build Ship')
    def build_ship(self, cursor, agent, blueprint_name=None, chassis=None, matter_to_invest=None):
        sys_name = agent['location']
        blueprint_name = blueprint_name or chassis or 'unclassified'
        
        # Check if shipyard or advanced_shipyard is active
        if not system_service.has_active_infrastructure(cursor, sys_name, ('shipyard', 'advanced_shipyard')):
            print(f"[DENIED] No active 'shipyard' or 'advanced_shipyard' in {sys_name} found.")
            return False

        # 1. Determine blueprint cost and material type
        cursor.execute("SELECT matrix_json, stats_json FROM blueprints WHERE name = ?", (blueprint_name,))
        bp_row = cursor.fetchone()

        if bp_row:
            stats = json.loads(bp_row['stats_json'])
            cost = stats['cost']
            material_type = 'refined_matter'
        else:
            # LEGACY FALLBACK: Scout chassis built using 1000 raw_matter
            cost = 1000
            material_type = 'raw_matter'

        # 2. Check for existing ship of this blueprint under construction in the current system
        cursor.execute("SELECT * FROM ships WHERE system_name = ? AND pilot_id = 'UNDER_CONSTRUCTION' AND blueprint_name = ?", (sys_name, blueprint_name))
        existing_ship = cursor.fetchone()

        if existing_ship:
            ship_id = existing_ship['id']
            progress_matter = existing_ship['progress_matter'] or 0
            required_matter = existing_ship['required_matter'] or cost
            name = existing_ship['name']
        else:
            # Create a new ship row with 'UNDER_CONSTRUCTION' pilot ID
            cursor.execute("SELECT MAX(id) FROM ships")
            max_id_row = cursor.fetchone()
            new_id = (max_id_row[0] or 0) + 1
            name = f"Ship-{new_id}"
            
            cursor.execute("""
                INSERT INTO ships (
                    id, name, chassis, pilot_id, system_name, blueprint_name,
                    progress_matter, required_matter, health, max_health,
                    raw_matter_inventory, refined_matter_inventory, energy_inventory,
                    matter_storage_capacity, energy_capacity, max_speed, thrust, mass,
                    has_drill, has_fabricator, has_logic_core
                ) VALUES (?, ?, ?, 'UNDER_CONSTRUCTION', ?, ?, 0, ?, 100, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            """, (new_id, name, blueprint_name, sys_name, blueprint_name, cost))
            
            ship_id = new_id
            progress_matter = 0
            required_matter = cost

            # Print the planned hardware specifications directly "on order" (Column 2 & 3)
            if bp_row:
                import yaml
                stats = json.loads(bp_row['stats_json'])
                yaml_stats = yaml.dump({"blueprint_specs": stats}, sort_keys=False, default_flow_style=False).strip()
                print(f"\nCALCULATED HARDWARE SPECIFICATIONS:\n---\n{yaml_stats}\n---")

        # 3. Calculate remaining payment and perform transaction
        remaining = required_matter - progress_matter
        
        # Query local shipyard/advanced_shipyard level
        cursor.execute("SELECT level FROM infrastructure WHERE system_name = ? AND type IN ('shipyard', 'advanced_shipyard') AND status = 'active'", (sys_name,))
        yard_row = cursor.fetchone()
        yard_level = yard_row[0] if yard_row else 1
        
        # Scale shipyard_rate by level
        base_rate = self.rules.get('global_settings', {}).get('ship_constants', {}).get('shipyard_rate', 500)
        scaled_rate = int(base_rate * (1.0 + 0.1 * (yard_level - 1)))

        if yard_level > 1:
            print(f"[INFO] Shipyard Lvl {yard_level} operational. Construction rate increased to {scaled_rate} Matter/Turn.")

        if matter_to_invest is not None and matter_to_invest > 0:
            payment = min(matter_to_invest, remaining, scaled_rate)
        else:
            payment = remaining

        if payment <= 0:
            print(f"[ERROR] Ship construction is already fully funded.")
            return False

        res = transaction_service.pay_pipeline_costs(
            cursor, self.agent.id, sys_name,
            energy_cost=0, matter_cost=payment, matter_type=material_type
        )
        if not res:
            return False

        matter_from_depot = res["matter_from_depot"]
        matter_from_inventory = res["matter_from_inventory"]

        # 4. Update ship progress
        new_progress = progress_matter + payment
        cursor.execute("UPDATE ships SET progress_matter = ? WHERE id = ?", (new_progress, ship_id))

        # 5. Check if finished
        if new_progress >= required_matter:
            if bp_row:
                stats = json.loads(bp_row['stats_json'])
                has_drill = stats.get('has_drill', 0)
                has_fabricator = stats.get('has_fabricator', 0)
                has_logic_core = stats.get('has_logic_core', 0)
                mass = stats.get('mass', 100)
                speed = stats.get('speed', 300)
                thrust = stats.get('thrust', 500)
                cargo = stats.get('cargo', 300)
                battery = stats.get('battery', 500)
                
                cursor.execute("""
                    UPDATE ships SET 
                        pilot_id = NULL, energy_inventory = ?, matter_storage_capacity = ?, energy_capacity = ?,
                        max_speed = ?, thrust = ?, mass = ?, has_drill = ?, has_fabricator = ?, has_logic_core = ?
                    WHERE id = ?
                """, (battery, cargo, battery, speed, thrust, mass, has_drill, has_fabricator, has_logic_core, ship_id))
            else:
                # Standard legacy scout specs
                cursor.execute("""
                    UPDATE ships SET 
                        pilot_id = NULL, raw_matter_inventory = 0, energy_inventory = 100, matter_storage_capacity = 300, 
                        energy_capacity = 500, max_speed = 300, thrust = 500, mass = 100, has_drill = 0, has_fabricator = 0, has_logic_core = 0
                    WHERE id = ?
                """, (ship_id,))

            cursor.execute("SELECT * FROM ships WHERE id = ?", (ship_id,))
            new_ship_row = cursor.fetchone()
            print(f"[SUCCESS] {blueprint_name} vessel {get_ship_display_name(new_ship_row)} built successfully! Cost: {matter_from_depot} Depot / {matter_from_inventory} Inv.")
        else:
            print(f"[SUCCESS] Invested {payment} {material_type} in {blueprint_name} construction. Progress: {new_progress}/{required_matter}.")
        return True

    @agent_service.with_agent_context(allow_disembodied=True, action_name='Deconstruct Ship')
    def deconstruct_ship(self, cursor, agent, ship_id):
        ship_id = int(ship_id)
        sys_name = agent['location']

        # 1. Fetch ship details
        cursor.execute("SELECT * FROM ships WHERE id = ?", (ship_id,))
        ship = cursor.fetchone()

        if not ship:
            print(f"[ERROR] Ship {ship_id} not found.")
            return False

        # 2. Location Check
        if ship['system_name'] != sys_name:
            print(f"[DENIED] Ship {ship_id} is in {ship['system_name']}, but you are in {sys_name}.")
            return False

        # 3. Construction Scrapping vs. Mind-Orphan Guard
        if ship['pilot_id'] == 'UNDER_CONSTRUCTION':
            # Refund 100% of progress_matter
            refund = ship['progress_matter'] or 0
            cursor.execute("SELECT stats_json FROM blueprints WHERE name = ?", (ship['blueprint_name'],))
            bp_row = cursor.fetchone()
            material_type = 'refined_matter' if bp_row else 'raw_matter'
            
            if material_type == 'refined_matter':
                cursor.execute("UPDATE systems SET refined_matter_depot = refined_matter_depot + ? WHERE name = ?", (refund, sys_name))
            else:
                cursor.execute("UPDATE systems SET raw_matter_depot = raw_matter_depot + ? WHERE name = ?", (refund, sys_name))
                
            ship_display = get_ship_display_name(ship)
            cursor.execute("DELETE FROM ships WHERE id = ?", (ship_id,))
            print(f"[SUCCESS] Ship {ship_display} under construction ({ship['chassis']}) deconstructed successfully. Refunded {refund} {material_type} (100% of progress) to Sector Depot.")
            return True

        if ship['pilot_id'] is not None:
            print(f"[DENIED] Cannot deconstruct ship {ship_id}. Pilot '{ship['pilot_id']}' is still onboard! Eject pilot first.")
            return False

        # 4. Calculate Salvage Refund (50%)
        global_settings = config_service.get_economy_rules().get('global_settings', {})
        refund_ratio = global_settings.get('deconstruct_refund_ratio', 0.5)

        # Check blueprint or legacy fallback for cost basis
        cursor.execute("SELECT stats_json FROM blueprints WHERE name = ?", (ship['blueprint_name'],))
        bp_row = cursor.fetchone()

        if bp_row:
            stats = json.loads(bp_row['stats_json'])
            cost_basis = stats.get('cost', 1000)
            material_type = 'refined_matter'
        else:
            # Legacy Scout cost basis (1000 raw_matter)
            cost_basis = 1000
            material_type = 'raw_matter'

        refund = int(cost_basis * refund_ratio)

        # 5. Process Refund & Delete Ship
        if material_type == 'refined_matter':
            cursor.execute("UPDATE systems SET refined_matter_depot = refined_matter_depot + ? WHERE name = ?", (refund, sys_name))
        else:
            cursor.execute("UPDATE systems SET raw_matter_depot = raw_matter_depot + ? WHERE name = ?", (refund, sys_name))

        # Capture display name before deconstruction
        ship_display = get_ship_display_name(ship)

        cursor.execute("DELETE FROM ships WHERE id = ?", (ship_id,))
        print(f"[SUCCESS] Ship {ship_display} ({ship['chassis']}) deconstructed successfully. Refunded {refund} {material_type} to Sector Depot.")
        return True

    @agent_service.with_agent_context(allow_disembodied=True)
    def deconstruct(self, cursor, agent, structure_id):
        cursor.execute("SELECT system_name, type, level FROM infrastructure WHERE id = ?", (structure_id,))
        row = cursor.fetchone()
        if row:
            infra_rules = self.rules.get('infrastructure', {}).get(row['type'], {"matter_cost": 400})
            global_settings = self.rules.get('global_settings', {})
            refund_ratio = global_settings.get('deconstruct_refund_ratio', 0.5)
            
            refund = int((infra_rules.get('matter_cost', 400) * row['level']) * refund_ratio)
            cursor.execute("UPDATE systems SET raw_matter_depot = raw_matter_depot + ? WHERE name = ?", (refund, row['system_name']))
            cursor.execute("DELETE FROM infrastructure WHERE id = ?", (structure_id,))
            print(f"[SUCCESS] Structure {structure_id} deconstructed. Refund: {refund}")
            return True
        return False

    @agent_service.with_agent_context(require_active=True, action_name='Move')
    def move(self, cursor, agent, target_system):
        cursor.execute("SELECT * FROM systems WHERE name = ?", (target_system,))
        target = cursor.fetchone()
        if not target:
            print(f"[ERROR] System '{target_system}' has not been discovered yet.")
            return False
        phys = self.rules.get('tool_costs', {}).get('move', {})
        dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], target['x'], target['y'])
        cost = dist * phys.get('cost_per_distance', 0.1)
        if agent['energy_inventory'] < cost:
            print(f"[WARNING] Energy shortage! Journey initiated, but energy (available: {agent['energy_inventory']}, required: {cost}) is insufficient for the entire distance. Arrival with 0 energy likely.")
        
        speed = self.rules.get('global_settings', {}).get('travel_speed_per_tick', 300)
        ticks = max(1, int(dist / speed))
        
        cursor.execute("UPDATE agents SET status='traveling', target_system=?, origin_x=current_x, origin_y=current_y, target_x=?, target_y=?, transit_ticks_total=?, transit_ticks_passed=0 WHERE id=?", 
                       (target_system, target['x'], target['y'], ticks, self.agent.id))
                       
        if agent['active_ship_id']:
            cursor.execute("UPDATE ships SET system_name = 'Interstellar' WHERE id = ?", (agent['active_ship_id'],))
            
        print(f"[SUCCESS] Journey initiated to {get_system_display_name(target)}. ETA: {ticks} Ticks.")
        return True

    @agent_service.with_agent_context(require_active=True, action_name='Replication')
    def replicate(self, cursor, agent):
        sys_name = agent['location']
        system = system_service.get_system_or_fail(cursor, sys_name)
        
        if not system_service.has_active_infrastructure(cursor, sys_name, 'mind_forge'):
            print(f"[DENIED] No active 'mind_forge' in {sys_name} found.")
            return False

        # --- COGNITIVE CONSISTENCY PROTECTION (SERIELLER LOCK - Hebel 11) ---
        # Prüfe, ob im lokalen Sektor bereits ein namenloser oder unfertiger Klon im Geburtskanal verweilt
        cursor.execute("""
            SELECT id FROM agents 
            WHERE (
                (host_type = 'ship' AND CAST(host_id AS INTEGER) IN (SELECT id FROM ships WHERE system_name = ?))
                OR
                (host_type = 'matrix' AND CAST(host_id AS INTEGER) IN (SELECT id FROM infrastructure WHERE system_name = ?))
            )
            AND (chosen_name IS NULL OR chosen_name = 'Unnamed' OR active_ship_id IS NULL) 
            AND status = 'active'
        """, (sys_name, sys_name))
        pending_clone = cursor.fetchone()
        
        if pending_clone:
            print(f"[DENIED] Replication locked! An active unnamed or disembodied instance ({pending_clone[0]}) is currently incubating in system {sys_name}.")
            print("  Each generation must complete its onboarding and vacate the matrix before the next replication loop can be initiated.")
            return False

        rule = self.rules.get('tool_costs', {}).get('replicate', {})
        energy_cost = rule.get('energy_cost', 180)
        base_matter_cost = rule.get('matter_cost', 1000)

        # Query local Mind Forge Level
        cursor.execute("SELECT level FROM infrastructure WHERE system_name = ? AND type = 'mind_forge' AND status = 'active'", (sys_name,))
        forge_row = cursor.fetchone()
        forge_level = forge_row[0] if forge_row else 1
        
        # Level Scaling: Reduce refined matter costs by 10% per level above Lvl 1 (Capped at 50% discount)
        discount_pct = min(0.5, (forge_level - 1) * 0.1)
        matter_cost = int(base_matter_cost * (1.0 - discount_pct))
        
        if discount_pct > 0:
            print(f"[INFO] Mind Forge Lvl {forge_level} operational. Symmetrically discounted replication cost to {matter_cost} Refined Matter.")

        if system['refined_matter_depot'] < matter_cost:
            print(f"[ERROR] System depot low on refined matter ({system['refined_matter_depot']}/{matter_cost}).")
            return False
            
        # Dynamic RSNS Serial Number Assignment (Column 1 & 3)
        # 1. Localization (X..Y..)
        x_code = int(system['x'] / 100)
        y_code = int(system['y'] / 100)
        loc_seg = f"X{x_code}Y{y_code}"
        
        # 2. Chronology (Current cycle primarily read from BOB_CYCLE environment)
        current_cycle = int(os.environ.get('BOB_CYCLE', 0))
        if current_cycle == 0:
            try:
                cursor.execute("SELECT COALESCE(MAX(cycle), 0) FROM visual_events")
                current_cycle = cursor.fetchone()[0]
            except:
                current_cycle = 0
        cycle_seg = f"C{current_cycle}"
        
        # 3. 6-digit Alphanumeric Unique Identifier (Uppercase letters and numbers!)
        uniq_chars = string.ascii_uppercase + string.digits
        uniq_seg = "".join(random.choices(uniq_chars, k=6))
        
        new_agent_id = f"{loc_seg}-{cycle_seg}-{uniq_seg}"
        
        # Check for host (sem_matrix or unpiloted ship)
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'sem_matrix' AND status = 'active'", (sys_name,))
        matrix_row = cursor.fetchone()
        
        cursor.execute("SELECT id FROM ships WHERE system_name = ? AND pilot_id IS NULL LIMIT 1", (sys_name,))
        ship_row = cursor.fetchone()
        
        host_type = None
        host_id = None
        active_ship_id = None
        
        if matrix_row:
            host_type = 'matrix'
            host_id = str(matrix_row['id'])
        elif ship_row:
            host_type = 'ship'
            host_id = str(ship_row['id'])
            active_ship_id = ship_row['id']
            cursor.execute("UPDATE ships SET pilot_id = ? WHERE id = ?", (new_agent_id, active_ship_id))
        else:
            print(f"[DENIED] Replication requires a host in {sys_name}. Build an 'sem_matrix' or provide an unpiloted ship.")
            return False

        energy_from_sys = min(system['energy_depot'], energy_cost)
        energy_from_agent = energy_cost - energy_from_sys

        if agent['energy_inventory'] < energy_from_agent:
            print(f"[ERROR] Low energy. Need {energy_from_agent}E from you (have {agent['energy_inventory']}E).")
            return False

        if energy_from_agent > 0:
            agent_service.update_agent_resources(cursor, self.agent.id, energy=-energy_from_agent)
        
        system_service.update_system_resources(cursor, sys_name, energy_change=-energy_from_sys)
        cursor.execute("UPDATE systems SET refined_matter_depot = refined_matter_depot - ? WHERE name = ?", (matter_cost, sys_name))
        
        parent_display = get_display_name_with_id(agent)
        clone_prompt = f"""STATUS: Boot sequence complete. ID: {new_agent_id}. Origin: {parent_display}.
You possess the memories of your origin up to the start of your replication. To integrate into the current swarm situation:
1. Set your individual identity with 'set_name'.
2. Contact your origin ({self.agent.id}) via SCUT to receive a situation briefing and your initial task for this system.
3. Introduce yourself to other instances in the system to optimize coordination. 
After your onboarding, you will act as a sovereign member of the swarm."""

        cursor.execute("""
            INSERT OR IGNORE INTO agents 
            (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id, birth_cycle) 
            VALUES (?, 'Unnamed', ?, ?, 'active', ?, ?, ?, ?)
        """, (new_agent_id, host_id, host_type, system['x'], system['y'], active_ship_id, current_cycle))
        
        pop_file = os.environ.get('TEST_POP_PATH', os.path.abspath(os.path.join(os.environ.get('VERSE_DIR', ''), 'population.json')))
        try:
            with open(pop_file, 'r') as f: pop = json.load(f)
            pop['agents'].append({
                "id": new_agent_id, "parent_id": self.agent.id, "location": sys_name, "status": "active", "system_prompt": clone_prompt
            })
            with open(pop_file, 'w') as f: json.dump(pop, f, indent=2)
        except Exception as e: pass

        print(f"[SUCCESS] Clone '{new_agent_id}' started.")
        return new_agent_id

    @agent_service.with_agent_context(allow_disembodied=True)
    def set_name(self, cursor, agent, name):
        cursor.execute("UPDATE agents SET chosen_name = ? WHERE id = ?", (name, self.agent.id))
        return True

    @agent_service.with_agent_context(allow_disembodied=True)
    def rename_system(self, cursor, agent, new_name):
        cursor.execute("UPDATE systems SET display_name = ? WHERE name = ?", (new_name, agent['location']))
        return True

    @agent_service.with_agent_context(require_active=True, allow_disembodied=True, action_name='Board')
    def board(self, cursor, agent, ship_id):
        if dict(agent).get('active_ship_id') is not None:
            print(f"[DENIED] You are already in ship {dict(agent)['active_ship_id']}. Exit it first.")
            return False
            
        cursor.execute("SELECT * FROM ships WHERE id = ?", (ship_id,))
        ship = cursor.fetchone()
        
        if not ship:
            print(f"[ERROR] Ship {ship_id} not found.")
            return False
            
        if ship['system_name'] != agent['location']:
            print(f"[DENIED] Ship {ship_id} is in {ship['system_name']}, but you are in {agent['location']}.")
            return False
            
        if ship['pilot_id'] == 'UNDER_CONSTRUCTION':
            print(f"[DENIED] Cannot board. Ship {get_ship_display_name(ship)} is still under construction!")
            return False
            
        if ship['pilot_id'] is not None and ship['pilot_id'] != self.agent.id:
            print(f"[DENIED] Ship {ship_id} is currently piloted by {ship['pilot_id']}.")
            return False
            
        cursor.execute("UPDATE agents SET host_type = 'ship', host_id = ?, active_ship_id = ? WHERE id = ?", (str(ship_id), ship_id, self.agent.id))
        cursor.execute("UPDATE ships SET pilot_id = ? WHERE id = ?", (self.agent.id, ship_id))
        print(f"[SUCCESS] Boarded ship {get_ship_display_name(ship)}.")
        return True

    @agent_service.with_agent_context(require_active=True, allow_disembodied=False, action_name='ExitShip')
    def exit_ship(self, cursor, agent):
        ship_id = dict(agent).get('active_ship_id')
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'sem_matrix' AND status = 'active'", (agent['location'],))
        matrix_row = cursor.fetchone()
        if not matrix_row:
            print(f"[DENIED] Cannot exit ship here. System {agent['location']} lacks an active 'sem_matrix' to host your disembodied mind.")
            return False
            
        matrix_id = str(matrix_row['id'])
        
        cursor.execute("SELECT * FROM ships WHERE id = ?", (ship_id,))
        ship = cursor.fetchone()
        ship_display = get_ship_display_name(ship) if ship else f"ID: {ship_id}"

        cursor.execute("UPDATE agents SET host_type = 'matrix', host_id = ?, active_ship_id = NULL WHERE id = ?", (matrix_id, self.agent.id))
        cursor.execute("UPDATE ships SET pilot_id = NULL WHERE id = ?", (ship_id,))
        print(f"[SUCCESS] Exited ship {ship_display} and transferred to local SEM-Matrix.")
        return True

    @agent_service.with_agent_context(allow_disembodied=True)
    def rename_ship(self, cursor, agent, ship_id, new_name):
        """
        Renames a physical ship in the sector (e.g. from 'Ship-1' to 'ScoutPrime').
        """
        if not new_name:
            print("[ERROR] 'rename_ship' requires a 'new_name'.")
            return False
            
        ship_id = int(ship_id)
        cursor.execute("SELECT system_name FROM ships WHERE id = ?", (ship_id,))
        ship = cursor.fetchone()
        if not ship:
            print(f"[ERROR] Ship #{ship_id} not found.")
            return False
            
        # Sector Protection: Replicant may only rename ships in its own sector!
        if ship['system_name'] != agent['location']:
            print(f"[DENIED] Ship #{ship_id} is in {ship['system_name']}, but you are in {agent['location']}.")
            return False
            
        cursor.execute("UPDATE ships SET name = ? WHERE id = ?", (new_name, ship_id))
        print(f"[SUCCESS] Ship #{ship_id} renamed to '{new_name}'.")
        return True