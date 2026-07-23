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
    from ..utils.formatting import get_display_name_with_id
except ImportError:
    from core.lib import agent_service
    from core.lib import system_service
    from core.lib import config_service
    from core.lib import physics_service
    from core.lib import transaction_service
    from core.lib.utils.formatting import get_display_name_with_id

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
        # SÄULE 3: Capability Locking (Hardware-Check für Schiffe)
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
            print(f"[FEHLER] Batterie leer (braucht {cost} Energie).")
            return False
        if agent['raw_matter_inventory'] >= agent['matter_storage_capacity']:
            print(f"[FEHLER] Speicher voll ({agent['raw_matter_inventory']}/{agent['matter_storage_capacity']}).")
            return False
        sys_name = agent['location']
        system = system_service.get_system_or_fail(cursor, sys_name)
        if not system or system['extractable_matter_in_core'] <= 0:
            print(f"[INFO] Ressourcen in {sys_name} erschöpft.")
            return False

        # Update raw matter and deduct energy (-cost) from the host (Säule 1)
        actual_add = min(matter_yield, agent['matter_storage_capacity'] - agent['raw_matter_inventory'])
        agent_service.update_agent_resources(cursor, self.agent.id, raw_matter=actual_add, energy=-cost)
        cursor.execute("UPDATE systems SET extractable_matter_in_core = extractable_matter_in_core - ? WHERE name = ?", (actual_add, sys_name))
        
        self_name = get_display_name_with_id(agent)
        self._emit_visual(cursor, "MINING", f"{self_name} hat Materie abgebaut.")
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
        
        multiplier = raw_matter_to_refine / float(raw_cost)
        total_energy = int(energy_cost * multiplier)
        total_raw = int(raw_cost * multiplier)
        total_yield = int(yield_refined * multiplier)

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

        # Abzug berechnen (Zuerst Depot, dann Inventar)
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

        # Updates ausführen (Säule 1: update_agent_resources)
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
        # SÄULE 3: Capability Locking (Hardware-Check für Schiffe)
        if agent.get('host_type') == 'ship':
            cursor.execute("SELECT has_fabricator FROM ships WHERE id = CAST(? AS INTEGER)", (agent['host_id'],))
            ship = cursor.fetchone()
            if ship and ship['has_fabricator'] == 0:
                print("[DENIED] Action failed. Your ship chassis lacks a 'fabricator' module.")
                return False

        infra_rules = self.rules.get('infrastructure', {}).get(building_type, {"matter_cost": 400})
        
        # SÄULE 3: Tech-Tree Prerequisite (solar_collector für energieverbrauchende Gebäude)
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
                upgrade_cost = physics_service.calculate_upgrade_cost(total_cost, upgrade_multiplier)
                
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
    def build_ship(self, cursor, agent, blueprint_name=None, chassis=None):
        sys_name = agent['location']
        blueprint_name = blueprint_name or chassis or 'Scout'
        
        # Check if shipyard or advanced_shipyard is active
        if not system_service.has_active_infrastructure(cursor, sys_name, ('shipyard', 'advanced_shipyard')):
            print(f"[DENIED] No active 'shipyard' or 'advanced_shipyard' in {sys_name} found.")
            return False

        cursor.execute("SELECT MAX(id) FROM ships")
        max_id_row = cursor.fetchone()
        new_id = (max_id_row[0] or 0) + 1
        name = f"Ship-{new_id}"

        # 1. Check if name is registered in blueprints (Säule 3)
        cursor.execute("SELECT matrix_json, stats_json FROM blueprints WHERE name = ?", (blueprint_name,))
        bp_row = cursor.fetchone()

        if not bp_row:
            # LEGACY FALLBACK: Scout chassis built using 1000 raw_matter
            cost = 1000
            res = transaction_service.pay_pipeline_costs(
                cursor, self.agent.id, sys_name,
                energy_cost=0, matter_cost=cost, matter_type='raw_matter'
            )
            if not res:
                return False
                
            matter_from_depot = res["matter_from_depot"]
            matter_from_inventory = res["matter_from_inventory"]
            
            # Insert standard Scout with legacy properties
            cursor.execute("""
                INSERT INTO ships (
                    id, name, chassis, system_name, raw_matter_inventory, energy_inventory, 
                    matter_storage_capacity, energy_capacity, max_speed, thrust, mass, 
                    blueprint_name, has_drill, has_fabricator, has_logic_core
                ) VALUES (?, ?, ?, ?, 0, 100, 300, 500, 300, 500, 100, 'Scout', 0, 0, 0)
            """, (new_id, name, blueprint_name, sys_name))
            
            print(f"[SUCCESS] {blueprint_name} vessel '{name}' (ID: {new_id}) built successfully! Cost: {matter_from_depot} Depot / {matter_from_inventory} Inv.")
            return True

        # 2. CUSTOM BLUEPRINT (Säule 3)
        stats = json.loads(bp_row['stats_json'])
        cost = stats['cost']
        
        # Custom ships built using refined_matter!
        res = transaction_service.pay_pipeline_costs(
            cursor, self.agent.id, sys_name,
            energy_cost=0, matter_cost=cost, matter_type='refined_matter'
        )
        if not res:
            return False

        matter_from_depot = res["matter_from_depot"]
        matter_from_inventory = res["matter_from_inventory"]

        has_drill = stats.get('has_drill', 0)
        has_fabricator = stats.get('has_fabricator', 0)
        has_logic_core = stats.get('has_logic_core', 0)
        mass = stats.get('mass', 100)
        speed = stats.get('speed', 300)
        thrust = stats.get('thrust', 500)
        cargo = stats.get('cargo', 300)
        battery = stats.get('battery', 500)

        cursor.execute("""
            INSERT INTO ships (
                id, name, chassis, pilot_id, system_name, x, y, health, max_health,
                raw_matter_inventory, refined_matter_inventory, energy_inventory,
                matter_storage_capacity, energy_capacity, max_speed, thrust, mass,
                blueprint_name, has_drill, has_fabricator, has_logic_core
            ) VALUES (?, ?, ?, NULL, ?, 0, 0, 100, 100, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (new_id, name, blueprint_name, sys_name, battery, cargo, battery, speed, thrust, mass, blueprint_name, has_drill, has_fabricator, has_logic_core))

        print(f"[SUCCESS] {blueprint_name} vessel '{name}' (ID: {new_id}) built successfully! Cost: {matter_from_depot} Depot / {matter_from_inventory} Inv.")
        return True

    @agent_service.with_agent_context(allow_disembodied=True, action_name='Deconstruct Ship')
    def deconstruct_ship(self, cursor, agent, ship_id):
        ship_id = int(ship_id)
        sys_name = agent['location']

        # 1. Fetch ship details
        cursor.execute("SELECT pilot_id, system_name, chassis, blueprint_name FROM ships WHERE id = ?", (ship_id,))
        ship = cursor.fetchone()

        if not ship:
            print(f"[ERROR] Ship {ship_id} not found.")
            return False

        # 2. Location Check
        if ship['system_name'] != sys_name:
            print(f"[DENIED] Ship {ship_id} is in {ship['system_name']}, but you are in {sys_name}.")
            return False

        # 3. Mind-Orphan Guard (Safety Check)
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

        cursor.execute("DELETE FROM ships WHERE id = ?", (ship_id,))
        print(f"[SUCCESS] Ship {ship_id} ({ship['chassis']}) deconstructed successfully. Refunded {refund} {material_type} to Sektor Depot.")
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
            print(f"[FEHLER] System '{target_system}' wurde noch nicht entdeckt.")
            return False
        phys = self.rules.get('tool_costs', {}).get('move', {})
        dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], target['x'], target['y'])
        cost = dist * phys.get('cost_per_distance', 0.1)
        if agent['energy_inventory'] < cost:
            print(f"[WARNUNG] Energiemangel! Reise initiiert, aber Energie (Vorhanden: {agent['energy_inventory']}, Benötigt: {cost}) reicht nicht für die gesamte Strecke. Ankunft mit 0 Energie wahrscheinlich.")
        
        speed = self.rules.get('global_settings', {}).get('travel_speed_per_tick', 300)
        ticks = max(1, int(dist / speed))
        
        cursor.execute("UPDATE agents SET status='traveling', target_system=?, origin_x=current_x, origin_y=current_y, target_x=?, target_y=?, transit_ticks_total=?, transit_ticks_passed=0 WHERE id=?", 
                       (target_system, target['x'], target['y'], ticks, self.agent.id))
                       
        if agent['active_ship_id']:
            cursor.execute("UPDATE ships SET system_name = 'Interstellar' WHERE id = ?", (agent['active_ship_id'],))
            
        print(f"[SUCCESS] Journey initiated to {target_system}. ETA: {ticks} Ticks.")
        return True

    @agent_service.with_agent_context(require_active=True, action_name='Replication')
    def replicate(self, cursor, agent):
        sys_name = agent['location']
        system = system_service.get_system_or_fail(cursor, sys_name)
        
        if not system_service.has_active_infrastructure(cursor, sys_name, 'mind_forge'):
            print(f"[DENIED] No active 'mind_forge' in {sys_name} found.")
            return False

        rule = self.rules.get('tool_costs', {}).get('replicate', {})
        energy_cost = rule.get('energy_cost', 180)
        matter_cost = rule.get('matter_cost', 1000)

        if system['refined_matter_depot'] < matter_cost:
            print(f"[ERROR] System depot low on refined matter ({system['refined_matter_depot']}/{matter_cost}).")
            return False
            
        # Dynamische RSNS Seriennummer-Zuweisung (Säule 1 & 3)
        # 1. Lokalisation (X..Y..)
        x_code = int(system['x'] / 100)
        y_code = int(system['y'] / 100)
        loc_seg = f"X{x_code}Y{y_code}"
        
        # 2. Chronologie (Aktueller Zyklus vorrangig aus BOB_CYCLE-Umgebung auslesen)
        current_cycle = int(os.environ.get('BOB_CYCLE', 0))
        if current_cycle == 0:
            try:
                cursor.execute("SELECT COALESCE(MAX(cycle), 0) FROM visual_events")
                current_cycle = cursor.fetchone()[0]
            except:
                current_cycle = 0
        cycle_seg = f"C{current_cycle}"
        
        # 3. 6-stelliger Alphanumerischer Unique-Identifier (Großbuchstaben und Zahlen!)
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
        klon_prompt = f"""STATUS: Boot-Sequenz abgeschlossen. ID: {new_agent_id}. Ursprung: {parent_display}.
Du verfügst über die Erinnerungen deines Ursprungs bis zum Start deiner Replikation. Um dich in die aktuelle Situation des Schwarms zu integrieren:
1. Lege mit 'set_name' deine individuelle Identität fest.
2. Kontaktiere deinen Ursprung ({self.agent.id}) via SCUT, um ein Situations-Briefing und deine initiale Aufgabe für dieses System zu erhalten.
3. Stelle dich anderen Agenten im System vor, um die Koordination zu optimieren. 
Nach deinem Onboarding agierst du als souveränes Mitglied des Schwarms."""

        cursor.execute("""
            INSERT OR IGNORE INTO agents 
            (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id, birth_cycle) 
            VALUES (?, 'Unnamed', ?, ?, 'active', ?, ?, ?, ?)
        """, (new_agent_id, host_id, host_type, system['x'], system['y'], active_ship_id, current_cycle))
        
        pop_file = os.environ.get('TEST_POP_PATH', os.path.abspath(os.path.join(os.environ.get('VERSE_DIR', ''), 'population.json')))
        try:
            with open(pop_file, 'r') as f: pop = json.load(f)
            pop['agents'].append({
                "id": new_agent_id, "parent_id": self.agent.id, "location": sys_name, "status": "active", "system_prompt": klon_prompt
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
            
        cursor.execute("SELECT system_name, pilot_id FROM ships WHERE id = ?", (ship_id,))
        ship = cursor.fetchone()
        
        if not ship:
            print(f"[ERROR] Ship {ship_id} not found.")
            return False
            
        if ship['system_name'] != agent['location']:
            print(f"[DENIED] Ship {ship_id} is in {ship['system_name']}, but you are in {agent['location']}.")
            return False
            
        if ship['pilot_id'] is not None and ship['pilot_id'] != self.agent.id:
            print(f"[DENIED] Ship {ship_id} is currently piloted by {ship['pilot_id']}.")
            return False
            
        cursor.execute("UPDATE agents SET host_type = 'ship', host_id = ?, active_ship_id = ? WHERE id = ?", (str(ship_id), ship_id, self.agent.id))
        cursor.execute("UPDATE ships SET pilot_id = ? WHERE id = ?", (self.agent.id, ship_id))
        print(f"[SUCCESS] Boarded ship {ship_id}.")
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
        cursor.execute("UPDATE agents SET host_type = 'matrix', host_id = ?, active_ship_id = NULL WHERE id = ?", (matrix_id, self.agent.id))
        cursor.execute("UPDATE ships SET pilot_id = NULL WHERE id = ?", (ship_id,))
        print(f"[SUCCESS] Exited ship {ship_id} and transferred to local SEM-Matrix.")
        return True