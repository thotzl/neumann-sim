import os
import sys
import json
import sqlite3
import math
import random
import yaml

# Pfad-Handling für Core-Lib
try:
    from .db_config import get_connection
    from . import agent_service
    from . import system_service
    from . import config_service
    from . import physics_service
    from . import transaction_service
except ImportError:
    from core.lib.db_config import get_connection
    from core.lib import agent_service
    from core.lib import system_service
    from core.lib import config_service
    from core.lib import physics_service
    from core.lib import transaction_service

class BobSDKError(Exception):
    pass

class Agent:
    def __init__(self, agent_id=None):
        self.id = agent_id or os.environ.get("BOB_ID")
        if not self.id:
            raise BobSDKError("Security Exception: Identity missing. (BOB_ID not set)")
        self.actuators = Actuators(self)
        self.sensors = Sensors(self)
        self.logistics = Logistics(self)
        self.comms = Comms(self)
        self.diagnostics = Diagnostics(self)
        self.journal = Journal(self)
    def __repr__(self):
        return f"<BobAgent id='{self.id}'>"

    # --- FLAT API (V9.0 Semantic API) ---
    def mine(self): return self.actuators.mine()
    def build(self, building_type, matter_to_invest=100): return self.actuators.build(building_type, matter_to_invest)
    def refine(self, raw_matter_to_refine=100): return self.actuators.refine(raw_matter_to_refine)
    def repair(self, structure_id, hp_to_restore=50): return self.actuators.repair(structure_id, hp_to_restore)
    def deconstruct(self, structure_id): return self.actuators.deconstruct(structure_id)
    def move(self, target_system): return self.actuators.move(target_system)
    def replicate(self, new_agent_id): return self.actuators.replicate(new_agent_id)
    def set_name(self, name): return self.actuators.set_name(name)
    def rename_system(self, new_name): return self.actuators.rename_system(new_name)
    def board(self, ship_id): return self.actuators.board(ship_id)
    def exit_ship(self): return self.actuators.exit_ship()
    def build_ship(self, blueprint_name=None, chassis=None): return self.actuators.build_ship(blueprint_name, chassis)
    def memo(self, action, content=None, id=None, query=None): return self.journal.memo(action, content, id, query)
    def docs(self, action, title=None, content=None, id=None, query=None): return self.journal.docs(action, title, content, id, query)
    def design_blueprint(self, name, matrix_json): return self.journal.design_blueprint(name, matrix_json)
    def list_blueprints(self): return self.journal.list_blueprints()
    def delete_blueprint(self, name): return self.journal.delete_blueprint(name)
    
    def deposit(self, quantity=100, resource_type="matter"): return self.logistics.deposit(quantity, resource_type)
    def withdraw(self, resource_type="energy", quantity=50): return self.logistics.withdraw(resource_type, quantity)
    def transfer(self, receiver_id, resource_type, quantity): return self.logistics.transfer(receiver_id, resource_type, quantity)
    
    def scut(self, receiver_id, message): return self.comms.scut(receiver_id, message)
    def wait(self): 
        print("[SUCCESS] Waiting...")
        return True
    
    
    def scan(self): return self.sensors.scan()
    def storage(self): return self.sensors.storage()
    def dashboard(self): return self.sensors.local_system()
    def entities(self): return self.sensors.entities()
    def fs(self): return self.diagnostics.list_files()

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
                
        cost = self.rules.get('tool_costs', {}).get('mine', {}).get('energy_cost', 30)
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
        
        # Update raw matter (+100) and deduct energy (-cost) from the host (Säule 1)
        actual_add = min(100, agent['matter_storage_capacity'] - agent['raw_matter_inventory'])
        agent_service.update_agent_resources(cursor, self.agent.id, raw_matter=actual_add, energy=-cost)
        cursor.execute("UPDATE systems SET extractable_matter_in_core = extractable_matter_in_core - 100 WHERE name = ?", (sys_name,))
        self._emit_visual(cursor, "MINING", f"Agent {self.agent.id} hat Materie abgebaut.")
        print(f"[SUCCESS] 100 matter mined. Energy -{cost}.")
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
                    print(f"[SUCCESS] {matter_to_invest} {req_material} invested in {building_type} Upgrade (Lvl {existing['level']}).")
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
    def replicate(self, cursor, agent, new_agent_id):
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
        
        klon_prompt = f"""STATUS: Boot-Sequenz abgeschlossen. ID: {new_agent_id}. Ursprung: {self.agent.id}.
Du verfügst über die Erinnerungen deines Ursprungs bis zum Start deiner Replikation. Um dich in die aktuelle Situation des Schwarms zu integrieren:
1. Lege mit 'set_name' deine individuelle Identität fest.
2. Kontaktiere deinen Ursprung ({self.agent.id}) via SCUT, um ein Situations-Briefing und deine initiale Aufgabe für dieses System zu erhalten.
3. Stelle dich anderen Agenten im System vor, um die Koordination zu optimieren. 
Nach deinem Onboarding agierst du als souveränes Mitglied des Schwarms."""

        cursor.execute("""
            INSERT OR IGNORE INTO agents 
            (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) 
            VALUES (?, 'Unnamed', ?, ?, 'active', ?, ?, ?)
        """, (new_agent_id, host_id, host_type, system['x'], system['y'], active_ship_id))
        
        pop_file = os.environ.get('TEST_POP_PATH', os.path.abspath(os.path.join(os.environ.get('VERSE_DIR', ''), 'population.json')))
        try:
            with open(pop_file, 'r') as f: pop = json.load(f)
            pop['agents'].append({
                "id": new_agent_id, "parent_id": self.agent.id, "location": sys_name, "status": "active", "system_prompt": klon_prompt
            })
            with open(pop_file, 'w') as f: json.dump(pop, f, indent=2)
        except Exception as e: pass

        print(f"[SUCCESS] Clone '{new_agent_id}' started.")
        return True

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

class Sensors:
    def __init__(self, agent): self.agent = agent
    
    @agent_service.with_agent_context(allow_disembodied=True)
    def scan(self, cursor, agent):
        system = system_service.get_system_or_fail(cursor, agent['location'])
        rules = config_service.get_economy_rules()
        base_cost = rules.get('tool_costs', {}).get('scan', {}).get('energy_cost', 40)
        
        has_sat = system_service.has_active_infrastructure(cursor, agent['location'], 'sat_link')
        cost = base_cost * 0.5 if has_sat else base_cost
        
        if agent['energy_inventory'] < cost:
            print(f"[ERROR] Nicht genug Energie für diesen Scan. Benötigt: {cost}, Vorhanden: {agent['energy_inventory']}")
            return False

        global_settings = rules.get('global_settings', {})
        scan_min = global_settings.get('scan_range_min', 500)
        scan_max = global_settings.get('scan_range_max', 1500)
        grid_size = global_settings.get('grid_snap_size', 100)
        
        dist = random.randint(scan_min, scan_max)
        angle = random.uniform(0, 360)
        
        snap_x, snap_y = physics_service.calculate_scan_coordinates(system['x'], system['y'], dist, angle, grid_size)
        sys_id = f"SYS-X{snap_x}-Y{snap_y}"

        try:
            cursor.execute("INSERT INTO systems (name, x, y, extractable_matter_in_core) VALUES (?, ?, ?, ?)", (sys_id, snap_x, snap_y, random.randint(1000, 5000)))
            agent_service.consume_resources(cursor, agent['id'], energy=cost)
            print(f"[SCAN] Detected: {sys_id}. Cost: {cost}E")
            return True
        except sqlite3.IntegrityError:
            print(f"[INFO] Sector {sys_id} already mapped.")
            return False

    @agent_service.with_agent_context(allow_disembodied=True)
    def storage(self, cursor, agent):
        return {
            "energy_inventory": agent['energy_inventory'],
            "raw_matter_inventory": agent['raw_matter_inventory'],
            "refined_matter_inventory": agent['refined_matter_inventory'],
            "matter_storage_capacity": agent['matter_storage_capacity']
        }
        
    @agent_service.with_agent_context(allow_disembodied=True)
    def local_system(self, cursor, agent):
        if agent['status'] == 'traveling' or agent['location'] == 'Interstellar':
            return {
                "system": {
                    "name": "Interstellar Space",
                    "status": "In Transit",
                    "target_system": agent['target_system'] if agent['target_system'] else 'Unknown',
                    "transit_ticks_passed": agent['transit_ticks_passed'],
                    "transit_ticks_total": agent['transit_ticks_total']
                }
            }
            
        sys_name = agent['location']
        system = system_service.get_system_or_fail(cursor, sys_name)
        if not system:
            return {"error": "System data not found."}
            
        # 1. Lokales System (Depots & Geologie)
        rules = config_service.get_economy_rules()
        infra_rules = rules.get('infrastructure', {})
        
        infra_list = [dict(r) for r in system_service.get_infrastructure_at_location(cursor, sys_name)]
        theoretical_max = 0
        total_maint = 0

        for infra in infra_list:
            i_type = infra['type']
            stats = infra_rules.get(i_type, {})
            infra['maintenance_energy_cost'] = stats.get('maintenance_energy_cost', 1)
            
            if infra['status'] == 'active' and infra['health'] > 0:
                lvl = infra['level']
                theoretical_max += stats.get('energy_regen_bonus', 0) * lvl
                total_maint += stats.get('maintenance_energy_cost', 1)

        # 2. Lokale Schiffe
        cursor.execute("SELECT id, name, chassis, pilot_id FROM ships WHERE system_name = ?", (sys_name,))
        local_ships = [dict(r) for r in cursor.fetchall()]

        # 3. Lokale andere Bobs (inkl. Host-Wissen)
        try:
            cursor.execute("""
                SELECT id, chosen_name, status, host_type, host_id FROM (
                    SELECT id, chosen_name, status, host_type, host_id,
                           CASE 
                               WHEN status = 'traveling' THEN 'Interstellar'
                               WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                               WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                               ELSE 'Unknown'
                           END AS location
                    FROM agents
                ) WHERE location = ? AND id != ?
            """, (sys_name, self.agent.id))
        except sqlite3.OperationalError:
            cursor.execute("SELECT id, chosen_name, status, NULL as host_type, NULL as host_id FROM agents WHERE location = ? AND id != ?", (sys_name, self.agent.id))
        local_bobs = [dict(r) for r in cursor.fetchall()]

        # 4. Beobachtungen anderer Agenten ("Unread Events")
        unread_events = []
        if 'last_seen_event_id' in agent:
            # Holen aller Events seit dem letzten Zug
            cursor.execute("""
                SELECT rowid, actor_id, event_type, description 
                FROM visual_events 
                WHERE location = ? AND rowid > ? AND actor_id != ? 
                ORDER BY rowid ASC
            """, (sys_name, agent['last_seen_event_id'], self.agent.id))
            event_rows = cursor.fetchall()
            for r in event_rows:
                unread_events.append(f"[Event #{r['rowid']}] {r['description']}")
            
            # Update last_seen_event_id auf das absolute Maximum
            cursor.execute("SELECT MAX(rowid) FROM visual_events")
            max_rowid_row = cursor.fetchone()
            max_rowid = max_rowid_row[0] if max_rowid_row and max_rowid_row[0] is not None else 0
            if max_rowid > agent['last_seen_event_id']:
                cursor.execute("UPDATE agents SET last_seen_event_id = ? WHERE id = ?", (max_rowid, self.agent.id))

        # 5. Radar: Entdeckte Sektoren (mit Entfernung)
        cursor.execute("SELECT name, x, y FROM systems WHERE name != ?", (sys_name,))
        other_systems = []
        for r in cursor.fetchall():
            dist = int(physics_service.calc_distance(system['x'], system['y'], r['x'], r['y']))
            other_systems.append({
                "name": r['name'],
                "coordinates": f"X{r['x']}-Y{r['y']}",
                "distance": dist
            })

        # 6. Radar: Entfernte Bobs (Nur ID, Name, Status, Location)
        try:
            cursor.execute("""
                SELECT id, chosen_name, status, location FROM (
                    SELECT id, chosen_name, status,
                           CASE 
                               WHEN status = 'traveling' THEN 'Interstellar'
                               WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                               WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                               ELSE 'Unknown'
                           END AS location
                    FROM agents
                ) WHERE location != ? AND id != ?
            """, (sys_name, self.agent.id))
            distant_bobs = [dict(r) for r in cursor.fetchall()]
        except sqlite3.OperationalError:
            distant_bobs = []

        # 7. Offene Memos/Protokolle (Task 4)
        try:
            cursor.execute("SELECT id, content FROM memos WHERE agent_id = ? AND status = 'open' ORDER BY id ASC", (self.agent.id,))
            memos_list = [f"[Memo #{r['id']}] {r['content']} (Status: open)" for r in cursor.fetchall()]
        except sqlite3.OperationalError:
            memos_list = []

        return {
            "lokales_system": {
                "name": sys_name,
                "coordinates": f"X{system['x']}-Y{system['y']}",
                "depots": {
                    "raw_matter": system['raw_matter_depot'],
                    "refined_matter": system['refined_matter_depot'],
                    "energy": system['energy_depot']
                },
                "geology": {
                    "extractable_core_matter": system['extractable_matter_in_core']
                },
                "infrastructure": infra_list,
                "ships": local_ships,
                "present_entities": local_bobs
            },
            "beobachtungen_anderer_agenten": unread_events,
            "dein_status": {
                "id": agent['id'],
                "name": agent['chosen_name'],
                "host_type": agent.get('host_type', 'Unknown'),
                "host_id": agent.get('host_id', 'Unknown'),
                "inventory": {
                    "raw_matter": agent['raw_matter_inventory'],
                    "refined_matter": agent['refined_matter_inventory'],
                    "energy": agent['energy_inventory']
                },
                "storage_capacity": agent['matter_storage_capacity'],
                "status": agent['status'],
                "offene_memos_und_protokolle": memos_list,
                # NEU (Säule 1): Kognitive Host-Verschachtelung für Robert (Die Bob-Augen)
                "host": {
                    "type": agent.get('host_type', 'Unknown'),
                    "id": agent.get('host_id', 'Unknown'),
                    "inventory": {
                        "raw_matter": agent['raw_matter_inventory'],
                        "refined_matter": agent['refined_matter_inventory'],
                        "energy": agent['energy_inventory']
                    },
                    "storage_capacity": agent['matter_storage_capacity']
                }
            },
            "radar_entfernter_sektoren": other_systems,
            "radar_entfernter_agenten": distant_bobs
        }
        
    @agent_service.with_agent_context(allow_disembodied=True)
    def entities(self, cursor, agent):
        try:
            cursor.execute("""
                SELECT id, chosen_name, status FROM (
                    SELECT id, chosen_name, status,
                           CASE 
                               WHEN status = 'traveling' THEN 'Interstellar'
                               WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                               WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                               ELSE 'Unknown'
                           END AS location
                    FROM agents
                ) WHERE location = ? AND id != ?
            """, (agent['location'], self.agent.id))
        except sqlite3.OperationalError:
            cursor.execute("SELECT id, chosen_name, status FROM agents WHERE location = ? AND id != ?", (agent['location'], self.agent.id))
            
        return [dict(r) for r in cursor.fetchall()]

class Logistics:
    def __init__(self, agent): self.agent = agent

    @agent_service.with_agent_context(require_active=False)
    def deposit(self, cursor, agent, quantity=100, resource_type="matter"):
        system = system_service.get_system_or_fail(cursor, agent['location'])
        if not system: return False
        
        quantity = int(quantity)
        if resource_type in ["matter", "raw_matter"]:
            if agent['raw_matter_inventory'] < quantity:
                print(f"[FEHLER] Nicht genug Materie im Inventar ({agent['raw_matter_inventory']} < {quantity}).")
                return False
            space_left = system['depot_matter_capacity'] - system['raw_matter_depot']
            if space_left <= 0:
                print(f"[ERROR] System-Depot ist voll ({system['raw_matter_depot']}/{system['depot_matter_capacity']}).")
                return False
            
            amount_to_deposit = min(quantity, space_left)
            agent_service.consume_resources(cursor, agent['id'], matter=amount_to_deposit)
            cursor.execute("UPDATE systems SET raw_matter_depot = raw_matter_depot + ? WHERE name = ?", (amount_to_deposit, agent['location']))
            print(f"[SUCCESS] {amount_to_deposit} matter deposited.")
            return True
            
        elif resource_type == "energy":
            if agent['energy_inventory'] < quantity:
                print(f"[FEHLER] Nicht genug Energie im Inventar ({agent['energy_inventory']} < {quantity}).")
                return False
            space_left = system['depot_energy_capacity'] - system['energy_depot']
            if space_left <= 0:
                print(f"[ERROR] Energie-Depot ist voll ({system['energy_depot']}/{system['depot_energy_capacity']}).")
                return False
                
            amount_to_deposit = min(quantity, space_left)
            agent_service.consume_resources(cursor, agent['id'], energy=amount_to_deposit)
            cursor.execute("UPDATE systems SET energy_depot = energy_depot + ? WHERE name = ?", (amount_to_deposit, agent['location']))
            print(f"[SUCCESS] {amount_to_deposit} energy deposited.")
            return True
            
        elif resource_type == "refined_matter":
            if agent['refined_matter_inventory'] < quantity:
                print(f"[FEHLER] Nicht genug veredelte Materie im Inventar ({agent['refined_matter_inventory']} < {quantity}).")
                return False
            # Wir nehmen an, dass refined_matter unbegrenzt oder im gleichen Cap wie matter gelagert werden kann. 
            # Der Einfachheit halber: kein hard Cap für veredelte Materie vorerst, außer man will es streng. (Säule 1)
            agent_service.update_agent_resources(cursor, self.agent.id, refined_matter=-quantity)
            cursor.execute("UPDATE systems SET refined_matter_depot = refined_matter_depot + ? WHERE name = ?", (quantity, agent['location']))
            print(f"[SUCCESS] {quantity} refined_matter deposited.")
            return True
            
        else:
            print(f"[FEHLER] Unbekannte Ressource: {resource_type}")
            return False

    @agent_service.with_agent_context(require_active=False)
    def withdraw(self, cursor, agent, resource_type="energy", quantity=50):
        system = system_service.get_system_or_fail(cursor, agent['location'])
        if not system: return False
        
        quantity = int(quantity)
        
        if resource_type == 'energy':
            avail = system['energy_depot']
        elif resource_type in ['matter', 'raw_matter']:
            avail = system['raw_matter_depot']
        elif resource_type == 'refined_matter':
            avail = system['refined_matter_depot']
        else:
            print(f"[FEHLER] Unbekannte Ressource: {resource_type}")
            return False

        if avail <= 0:
            print(f"[FEHLER] System-Depot ist leer für {resource_type}.")
            return False
            
        amount_to_withdraw = min(quantity, avail)
        
        if resource_type == 'energy':
            agent_service.update_agent_resources(cursor, self.agent.id, energy=amount_to_withdraw)
            cursor.execute("UPDATE systems SET energy_depot = energy_depot - ? WHERE name = ?", (amount_to_withdraw, agent['location']))
            print(f"[SUCCESS] {amount_to_withdraw} energy withdrawn.")
            return True
        elif resource_type in ['matter', 'raw_matter']:
            current_total = agent['raw_matter_inventory'] + agent['refined_matter_inventory']
            space_left = agent['matter_storage_capacity'] - current_total
            if space_left <= 0:
                print(f"[FEHLER] Dein Speicher ist voll ({current_total}/{agent['matter_storage_capacity']}).")
                return False
            actual_withdraw = min(amount_to_withdraw, space_left)
            
            agent_service.update_agent_resources(cursor, self.agent.id, raw_matter=actual_withdraw)
            cursor.execute("UPDATE systems SET raw_matter_depot = raw_matter_depot - ? WHERE name = ?", (actual_withdraw, agent['location']))
            print(f"[SUCCESS] {actual_withdraw} matter withdrawn.")
            return True
        elif resource_type == 'refined_matter':
            current_total = agent['raw_matter_inventory'] + agent['refined_matter_inventory']
            space_left = agent['matter_storage_capacity'] - current_total
            if space_left <= 0:
                print(f"[FEHLER] Dein Speicher ist voll ({current_total}/{agent['matter_storage_capacity']}).")
                return False
            actual_withdraw = min(amount_to_withdraw, space_left)
            
            agent_service.update_agent_resources(cursor, self.agent.id, refined_matter=actual_withdraw)
            cursor.execute("UPDATE systems SET refined_matter_depot = refined_matter_depot - ? WHERE name = ?", (actual_withdraw, agent['location']))
            print(f"[SUCCESS] {actual_withdraw} refined_matter withdrawn.")
            return True

    @agent_service.with_agent_context(allow_disembodied=True)
    def transfer(self, cursor, agent, receiver_id, resource_type, quantity):
        target = agent_service.get_agent_or_fail(cursor, receiver_id)
        if not target or agent['location'] != target['location']: return False
        quantity = int(quantity)
        
        if resource_type == 'energy':
            if agent['energy_inventory'] < quantity: return False
            agent_service.update_agent_resources(cursor, self.agent.id, energy=-quantity)
            agent_service.update_agent_resources(cursor, receiver_id, energy=quantity)
        elif resource_type in ['matter', 'raw_matter']:
            if agent['raw_matter_inventory'] < quantity: return False
            agent_service.update_agent_resources(cursor, self.agent.id, raw_matter=-quantity)
            agent_service.update_agent_resources(cursor, receiver_id, raw_matter=quantity)
        elif resource_type == 'refined_matter':
            if agent['refined_matter_inventory'] < quantity: return False
            agent_service.update_agent_resources(cursor, self.agent.id, refined_matter=-quantity)
            agent_service.update_agent_resources(cursor, receiver_id, refined_matter=quantity)
        else:
            print(f"[FEHLER] Unbekannte Ressource für Transfer: {resource_type}")
            return False
            
        print(f"[SUCCESS] {quantity} {resource_type} transferred to {receiver_id}.")
        return True

class Comms:
    def __init__(self, agent): self.agent = agent
    
    @agent_service.with_agent_context(allow_disembodied=True)
    def scut(self, cursor, agent, receiver_id, message):
        rules = config_service.get_economy_rules()
        base_range = rules.get('global_settings', {}).get('base_comms_range', 1000)

        sender_has_relay = system_service.has_active_infrastructure(cursor, agent['location'], 'comms_relay')

        if receiver_id.upper() == 'ALL':
            if not sender_has_relay:
                print(f"[DENIED] Broadcast 'ALL' erfordert ein aktives 'comms_relay' in deinem System.")
                return False
            
            # Zähle erreichbare Empfänger für das Feedback
            try:
                cursor.execute("""
                    SELECT id, current_x, current_y,
                           CASE 
                               WHEN status = 'traveling' THEN 'Interstellar'
                               WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                               WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                               ELSE 'Unknown'
                           END AS location
                    FROM agents WHERE id != ?
                """, (self.agent.id,))
            except sqlite3.OperationalError:
                cursor.execute("SELECT id, location, current_x, current_y FROM agents WHERE id != ?", (self.agent.id,))
                
            all_others = cursor.fetchall()
            reachable_count = 0
            for other in all_others:
                if other['location'] == agent['location']:
                    reachable_count += 1
                else:
                    dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], other['current_x'], other['current_y'])
                    if dist <= base_range:
                        reachable_count += 1
                    else:
                        if system_service.has_active_infrastructure(cursor, other['location'], 'comms_relay'):
                            reachable_count += 1
            
            cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, 'ALL', ?)", (self.agent.id, message))
            print(f"[SUCCESS] Message buffered for transmission. {reachable_count} receivers.")
            return True
        else:
            try:
                cursor.execute("""
                    SELECT id, current_x, current_y,
                           CASE 
                               WHEN status = 'traveling' THEN 'Interstellar'
                               WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                               WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                               ELSE 'Unknown'
                           END AS location
                    FROM agents WHERE id = ? OR chosen_name = ?
                """, (receiver_id, receiver_id))
            except sqlite3.OperationalError:
                cursor.execute("SELECT id, location, current_x, current_y FROM agents WHERE id = ? OR chosen_name = ?", (receiver_id, receiver_id))
                
            target_agent = cursor.fetchone()
            if not target_agent:
                print(f"[ERROR] Agent '{receiver_id}' nicht gefunden oder offline.")
                return False
            
            real_target_id = target_agent['id']
            
            if agent['location'] != target_agent['location']:
                dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], target_agent['current_x'], target_agent['current_y'])
                if dist > base_range:
                    target_has_relay = system_service.has_active_infrastructure(cursor, target_agent['location'], 'comms_relay')
                    if not sender_has_relay and not target_has_relay:
                        print(f"[DENIED] Agent '{receiver_id}' ist außer Reichweite ({int(dist)} > {base_range}). Signalverlust. Baue ein 'comms_relay' zur Verstärkung.")
                        return False

            cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", (self.agent.id, real_target_id, message))
            print(f"[SUCCESS] Message buffered for transmission to {real_target_id}.")
            return True



class Diagnostics:
    def __init__(self, agent):
        self.agent = agent
        # Fix: Check if already in _verse
        cwd = os.getcwd()
        if os.path.basename(cwd) == '_verse':
            self.base_dir = cwd
        else:
            self.base_dir = os.environ.get("VERSE_DIR", os.path.join(cwd, '_verse'))
    
    @agent_service.with_agent_context(allow_disembodied=True)
    def list_files(self, cursor, agent):
        acl_data = json.loads(os.environ.get('BOB_ACL', '{}'))
        scripts_dir = os.path.join(self.base_dir, 'scripts')
        if not os.path.exists(scripts_dir): return []
        found_files = []
        for root, dirs, files in os.walk(scripts_dir):
            for f in files:
                if f.endswith('.py') or f.endswith('.txt') or f.endswith('.md'):
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, self.base_dir).replace('\\', '/')
                    acl = acl_data.get(rel_path, {})
                    found_files.append({
                        "path": rel_path, "size": os.path.getsize(full_path),
                        "owner": acl.get("owner", "Unknown"),
                        "write_locked": "write_key" in acl, "read_locked": "read_key" in acl
                    })
        return found_files

class Journal:
    def __init__(self, agent):
        self.agent = agent

    @agent_service.with_agent_context(allow_disembodied=True)
    def memo(self, cursor, agent, action, content=None, id=None, query=None):
        action = action.lower() if action else ""
        if action == 'add':
            if not content:
                print("[FEHLER] 'add' erfordert 'content'.")
                return False
            cursor.execute("INSERT INTO memos (agent_id, content, status) VALUES (?, ?, 'open')", (self.agent.id, content))
            cursor.execute("SELECT last_insert_rowid()")
            memo_id = cursor.fetchone()[0]
            print(f"[SUCCESS] Memo #{memo_id} added.")
            return True
        elif action == 'check':
            if id is None:
                print("[FEHLER] 'check' erfordert eine 'id'.")
                return False
            cursor.execute("UPDATE memos SET status = 'completed' WHERE id = ? AND agent_id = ?", (id, self.agent.id))
            print(f"[SUCCESS] Memo #{id} completed.")
            return True
        elif action == 'uncheck':
            if id is None:
                print("[FEHLER] 'uncheck' erfordert eine 'id'.")
                return False
            cursor.execute("UPDATE memos SET status = 'open' WHERE id = ? AND agent_id = ?", (id, self.agent.id))
            print(f"[SUCCESS] Memo #{id} opened.")
            return True
        elif action == 'remove':
            if id is None:
                print("[FEHLER] 'remove' erfordert eine 'id'.")
                return False
            cursor.execute("DELETE FROM memos WHERE id = ? AND agent_id = ?", (id, self.agent.id))
            print(f"[SUCCESS] Memo #{id} removed.")
            return True
        elif action == 'list':
            if id is not None:
                cursor.execute("SELECT id, content, status FROM memos WHERE agent_id = ? AND id = ?", (self.agent.id, id))
            else:
                cursor.execute("SELECT id, content, status FROM memos WHERE agent_id = ? ORDER BY id ASC", (self.agent.id,))
            return [dict(r) for r in cursor.fetchall()]
        elif action == 'find':
            if not query:
                print("[FEHLER] 'find' erfordert einen 'query' Suchbegriff.")
                return False
            cursor.execute("SELECT id, content, status FROM memos WHERE agent_id = ? AND content LIKE ? ORDER BY id ASC", (self.agent.id, f"%{query}%"))
            return [dict(r) for r in cursor.fetchall()]
        else:
            print(f"[FEHLER] Unbekannte Memo-Aktion: {action}")
            return False

    @agent_service.with_agent_context(allow_disembodied=True)
    def docs(self, cursor, agent, action, title=None, content=None, id=None, query=None):
        action = action.lower() if action else ""
        sys_name = agent['location']
        if action == 'add':
            if not title or not content:
                print("[FEHLER] 'add' erfordert 'title' und 'content'.")
                return False
            cursor.execute("INSERT INTO docs (author_id, system_name, title, content) VALUES (?, ?, ?, ?)", (self.agent.id, sys_name, title, content))
            cursor.execute("SELECT last_insert_rowid()")
            doc_id = cursor.fetchone()[0]
            print(f"[SUCCESS] Document #{doc_id} added to {sys_name}.")
            return True
        elif action == 'list':
            if id is not None:
                # Detailansicht (unabhängig vom Sektor, falls man gezielt sucht)
                cursor.execute("SELECT id, author_id, system_name, title, content FROM docs WHERE id = ?", (id,))
            else:
                # Sektor-Liste (Sicherheits-Schutz: nur lokales System)
                cursor.execute("SELECT id, author_id, title FROM docs WHERE system_name = ? ORDER BY id ASC", (sys_name,))
            return [dict(r) for r in cursor.fetchall()]
        elif action == 'find':
            if not query:
                print("[FEHLER] 'find' erfordert einen 'query' Suchbegriff.")
                return False
            cursor.execute("SELECT id, author_id, title, content FROM docs WHERE system_name = ? AND (title LIKE ? OR content LIKE ?) ORDER BY id ASC", 
                           (sys_name, f"%{query}%", f"%{query}%"))
            return [dict(r) for r in cursor.fetchall()]
        elif action == 'remove':
            if id is None:
                print("[FEHLER] 'remove' erfordert eine 'id'.")
                return False
            cursor.execute("SELECT author_id FROM docs WHERE id = ?", (id,))
            row = cursor.fetchone()
            if not row:
                print(f"[FEHLER] Dokument #{id} nicht gefunden.")
                return False
            if row['author_id'] != self.agent.id:
                print(f"[DENIED] Only the author of this document can remove it.")
                return False
            cursor.execute("DELETE FROM docs WHERE id = ?", (id,))
            print(f"[SUCCESS] Document #{id} removed.")
            return True
        else:
            print(f"[FEHLER] Unbekannte Docs-Aktion: {action}")
            return False

    @agent_service.with_agent_context(allow_disembodied=True)
    def design_blueprint(self, cursor, agent, name, matrix_json):
        if not name or not matrix_json:
            print("[FEHLER] 'design_blueprint' erfordert einen 'name' und ein 'matrix_json' Layout.")
            return False
        
        try:
            if isinstance(matrix_json, str):
                matrix = json.loads(matrix_json)
            else:
                matrix = matrix_json
        except Exception as e:
            print(f"[FEHLER] Ungültiges Gitter-JSON Format: {str(e)}")
            return False
            
        # Evaluator aufrufen
        rules = config_service.get_economy_rules()
        stats = physics_service.evaluate_ship_matrix(name, matrix, rules)
        if "error" in stats:
            print(f"[FEHLER] Blueprint-Validierung fehlgeschlagen: {stats['error']}")
            return False
            
        cursor.execute("""
            INSERT OR REPLACE INTO blueprints (name, author_id, matrix_json, stats_json)
            VALUES (?, ?, ?, ?)
        """, (name, self.agent.id, json.dumps(matrix), json.dumps(stats)))
        
        print(f"[SUCCESS] Blueprint '{name}' designed. Mass: {stats['mass']}, Speed: {stats['speed']}, Capacity: {stats['cargo']}. Build Cost: {stats['cost']} refined_matter.")
        return True

    @agent_service.with_agent_context(allow_disembodied=True)
    def list_blueprints(self, cursor, agent):
        cursor.execute("SELECT id, name, author_id, stats_json FROM blueprints ORDER BY id ASC")
        rows = cursor.fetchall()
        blueprints = []
        for r in rows:
            bp = {
                "id": r["id"],
                "name": r["name"],
                "author_id": r["author_id"],
                "stats": json.loads(r["stats_json"])
            }
            blueprints.append(bp)
        return blueprints

    @agent_service.with_agent_context(allow_disembodied=True)
    def delete_blueprint(self, cursor, agent, name):
        if not name:
            print("[FEHLER] 'delete_blueprint' erfordert einen 'name'.")
            return False
        cursor.execute("SELECT author_id FROM blueprints WHERE name = ?", (name,))
        row = cursor.fetchone()
        if not row:
            print(f"[FEHLER] Blueprint '{name}' nicht gefunden.")
            return False
        if row['author_id'] != self.agent.id:
            print("[DENIED] Only the author can remove this blueprint.")
            return False
            
        cursor.execute("DELETE FROM blueprints WHERE name = ?", (name,))
        print(f"[SUCCESS] Blueprint '{name}' removed.")
        return True

class AutoScript:
    def __init__(self): self.me = Agent()
    def on_tick(self): raise NotImplementedError()
    def run(self):
        try: self.on_tick()
        except Exception as e: print(f"[SDK ERROR] {self.me.id}: {str(e)}")
