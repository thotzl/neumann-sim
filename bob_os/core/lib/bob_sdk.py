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
except ImportError:
    from core.lib.db_config import get_connection
    from core.lib import agent_service
    from core.lib import system_service
    from core.lib import config_service
    from core.lib import physics_service

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
    def __repr__(self):
        return f"<BobAgent id='{self.id}'>"

    # --- FLAT API (V9.0 Semantic API) ---
    def mine(self): return self.actuators.mine()
    def build(self, building_type, matter_to_invest=100): return self.actuators.build(building_type, matter_to_invest)
    def build_ship(self, chassis="Scout"): return self.actuators.build_ship(chassis)
    def refine(self, raw_matter_to_refine=100): return self.actuators.refine(raw_matter_to_refine)
    def repair(self, structure_id, hp_to_restore=50): return self.actuators.repair(structure_id, hp_to_restore)
    def deconstruct(self, structure_id): return self.actuators.deconstruct(structure_id)
    def move(self, target_system): return self.actuators.move(target_system)
    def replicate(self, new_agent_id): return self.actuators.replicate(new_agent_id)
    def set_name(self, name): return self.actuators.set_name(name)
    def rename_system(self, new_name): return self.actuators.rename_system(new_name)
    def board(self, ship_id): return self.actuators.board(ship_id)
    def exit_ship(self): return self.actuators.exit_ship()
    
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
            cursor.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, (SELECT location FROM agents WHERE id=?), ?, ?, ?)", 
                           (self.agent.id, self.agent.id, event_type, description))
        except: pass

    @agent_service.with_agent_context(require_active=True, action_name='Mining')
    def mine(self, cursor, agent):
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
        
        agent_service.consume_resources(cursor, self.agent.id, energy=cost)
        cursor.execute("UPDATE agents SET raw_matter_inventory = MIN(matter_storage_capacity, raw_matter_inventory + 100) WHERE id = ?", (self.agent.id,))
        cursor.execute("UPDATE systems SET extractable_matter_in_core = extractable_matter_in_core - 100 WHERE name = ?", (sys_name,))
        self._emit_visual(cursor, "MINING", f"Agent {self.agent.id} hat Materie abgebaut.")
        print(f"[SUCCESS] 100 matter mined. Energy -{cost}.")
        return True

    @agent_service.with_agent_context(require_active=True, action_name='Refining')
    def refine(self, cursor, agent, raw_matter_to_refine=100):
        sys_name = agent['location']
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'matter_refinery' AND status = 'active'", (sys_name,))
        if not cursor.fetchone():
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

        # Updates ausführen
        cursor.execute("UPDATE agents SET energy_inventory = energy_inventory - ?, raw_matter_inventory = raw_matter_inventory - ?, refined_matter_inventory = refined_matter_inventory + ? WHERE id = ?", 
                       (e_from_inv, m_from_inv, yield_to_inv, self.agent.id))
        
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
        
        # Pipeline Logic Matter (Dynamic Resource Type)
        mat_col_inv = "refined_matter_inventory" if req_material == "refined_matter" else "raw_matter_inventory"
        mat_col_depot = "refined_matter_depot" if req_material == "refined_matter" else "raw_matter_depot"
        
        available_depot_matter = system[mat_col_depot]
        available_inventory_matter = agent[mat_col_inv]
        total_available_m = available_depot_matter + available_inventory_matter

        if total_available_m < cost_m:
            print(f"[ERROR] Not enough {req_material} for repair. Need {cost_m}, have {available_inventory_matter} in inventory and {available_depot_matter} in depot.")
            return False
            
        # Pipeline Logic Energy
        available_depot_energy = system['energy_depot']
        available_inventory_energy = agent['energy_inventory']
        total_available_e = available_depot_energy + available_inventory_energy
        
        if total_available_e < cost_e:
            print(f"[ERROR] Not enough energy for repair. Need {cost_e}E, have {available_inventory_energy}E in battery and {available_depot_energy}E in depot.")
            return False

        matter_from_depot = min(cost_m, available_depot_matter)
        matter_from_inventory = cost_m - matter_from_depot
        
        energy_from_depot = min(cost_e, available_depot_energy)
        energy_from_inventory = cost_e - energy_from_depot

        # Ressourcen abziehen
        if energy_from_inventory > 0:
            cursor.execute("UPDATE agents SET energy_inventory = energy_inventory - ? WHERE id = ?", (energy_from_inventory, self.agent.id))
        if energy_from_depot > 0:
            cursor.execute("UPDATE systems SET energy_depot = energy_depot - ? WHERE name = ?", (energy_from_depot, agent['location']))
            
        if matter_from_inventory > 0:
            cursor.execute(f"UPDATE agents SET {mat_col_inv} = {mat_col_inv} - ? WHERE id = ?", (matter_from_inventory, self.agent.id))
        if matter_from_depot > 0:
            cursor.execute(f"UPDATE systems SET {mat_col_depot} = {mat_col_depot} - ? WHERE name = ?", (matter_from_depot, agent['location']))
        
        new_health = infra['health'] + actual_repair
        status = 'active' if new_health > 0 else infra['status']
        
        cursor.execute("UPDATE infrastructure SET health = ?, status = ?, maintenance_cooldown = 10 WHERE id = ?", (new_health, status, structure_id))
        print(f"[SUCCESS] Structure {structure_id} ({infra['type']}) repaired to {new_health} HP (Cost paid in {req_material}: {matter_from_depot} from Depot / {matter_from_inventory} from Inventory).")
        return True

    @agent_service.with_agent_context(require_active=True, action_name='Build')
    def build(self, cursor, agent, building_type, matter_to_invest=100):
        infra_rules = self.rules.get('infrastructure', {}).get(building_type, {"matter_cost": 400})
        total_cost = infra_rules.get('matter_cost', 400)
        req_material = infra_rules.get('required_material', 'raw_matter')
        
        matter_to_invest = int(matter_to_invest)
        build_cost_e = self.rules.get('tool_costs', {}).get('build', {}).get('energy_cost', 15)
        
        system = system_service.get_system_or_fail(cursor, agent['location'])
        if not system: return False

        # Pipeline Logic Matter (Dynamic Resource Type)
        mat_col_inv = "refined_matter_inventory" if req_material == "refined_matter" else "raw_matter_inventory"
        mat_col_depot = "refined_matter_depot" if req_material == "refined_matter" else "raw_matter_depot"
        
        available_depot_matter = system[mat_col_depot]
        available_inventory_matter = agent[mat_col_inv]
        total_available_m = available_depot_matter + available_inventory_matter

        if total_available_m < matter_to_invest:
            print(f"[ERROR] Not enough {req_material} available. Need {matter_to_invest}, but only have {available_inventory_matter} in inventory and {available_depot_matter} in depot.")
            return False

        # Pipeline Logic Energy
        available_depot_energy = system['energy_depot']
        available_inventory_energy = agent['energy_inventory']
        total_available_e = available_depot_energy + available_inventory_energy
        
        if total_available_e < build_cost_e:
            print(f"[ERROR] Not enough energy to build. Need {build_cost_e}E, but only have {available_inventory_energy}E in battery and {available_depot_energy}E in depot.")
            return False

        matter_from_depot = min(matter_to_invest, available_depot_matter)
        matter_from_inventory = matter_to_invest - matter_from_depot
        
        energy_from_depot = min(build_cost_e, available_depot_energy)
        energy_from_inventory = build_cost_e - energy_from_depot

        # Ressourcen abziehen
        if energy_from_inventory > 0:
            cursor.execute("UPDATE agents SET energy_inventory = energy_inventory - ? WHERE id = ?", (energy_from_inventory, self.agent.id))
        if energy_from_depot > 0:
            cursor.execute("UPDATE systems SET energy_depot = energy_depot - ? WHERE name = ?", (energy_from_depot, agent['location']))
            
        if matter_from_inventory > 0:
            cursor.execute(f"UPDATE agents SET {mat_col_inv} = {mat_col_inv} - ? WHERE id = ?", (matter_from_inventory, self.agent.id))
        if matter_from_depot > 0:
            cursor.execute(f"UPDATE systems SET {mat_col_depot} = {mat_col_depot} - ? WHERE name = ?", (matter_from_depot, agent['location']))

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
    def build_ship(self, cursor, agent, chassis='Scout'):
        sys_name = agent['location']
        system = system_service.get_system_or_fail(cursor, sys_name)
        
        # Check if shipyard or advanced_shipyard is active
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type IN ('shipyard', 'advanced_shipyard') AND status = 'active'", (sys_name,))
        if not cursor.fetchone():
            print(f"[DENIED] No active 'shipyard' or 'advanced_shipyard' in {sys_name} found.")
            return False
            
        cost = 1000 # Standard cost for now
        if agent['raw_matter_inventory'] + system['raw_matter_depot'] < cost:
            print(f"[ERROR] Not enough raw_matter available. Need {cost}, but only have {agent['raw_matter_inventory']} in inventory and {system['raw_matter_depot']} in depot.")
            return False
            
        matter_from_depot = min(cost, system['raw_matter_depot'])
        matter_from_inventory = cost - matter_from_depot
        
        if matter_from_inventory > 0:
            cursor.execute("UPDATE agents SET raw_matter_inventory = raw_matter_inventory - ? WHERE id = ?", (matter_from_inventory, self.agent.id))
        if matter_from_depot > 0:
            cursor.execute("UPDATE systems SET raw_matter_depot = raw_matter_depot - ? WHERE name = ?", (matter_from_depot, sys_name))

        cursor.execute("SELECT MAX(id) FROM ships")
        max_id_row = cursor.fetchone()
        new_id = (max_id_row[0] or 0) + 1
        name = f"Ship-{new_id}"
        
        cursor.execute("INSERT INTO ships (id, name, chassis, system_name) VALUES (?, ?, ?, ?)", (new_id, name, chassis, sys_name))
        print(f"[SUCCESS] {chassis} vessel '{name}' (ID: {new_id}) built successfully! Cost: {matter_from_depot} Depot / {matter_from_inventory} Inv.")
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
        
        cursor.execute("UPDATE agents SET status='traveling', location='Interstellar', target_system=?, origin_x=current_x, origin_y=current_y, target_x=?, target_y=?, transit_ticks_total=?, transit_ticks_passed=0, energy_inventory = energy_inventory WHERE id=?", 
                       (target_system, target['x'], target['y'], ticks, self.agent.id))
                       
        if agent['active_ship_id']:
            cursor.execute("UPDATE ships SET system_name = 'Interstellar' WHERE id = ?", (agent['active_ship_id'],))
            
        print(f"[SUCCESS] Journey initiated to {target_system}. ETA: {ticks} Ticks.")
        return True

    @agent_service.with_agent_context(require_active=True, action_name='Replication')
    def replicate(self, cursor, agent, new_agent_id):
        sys_name = agent['location']
        system = system_service.get_system_or_fail(cursor, sys_name)
        
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'mind_forge' AND status = 'active'", (sys_name,))
        if not cursor.fetchone():
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
        has_matrix = cursor.fetchone() is not None
        
        cursor.execute("SELECT id FROM ships WHERE system_name = ? AND pilot_id IS NULL", (sys_name,))
        has_free_ship = cursor.fetchone() is not None
        
        if not has_matrix and not has_free_ship:
            print(f"[DENIED] Replication requires a host in {sys_name}. Build an 'sem_matrix' or provide an unpiloted ship.")
            return False

        energy_from_sys = min(system['energy_depot'], energy_cost)
        energy_from_agent = energy_cost - energy_from_sys

        if agent['energy_inventory'] < energy_from_agent:
            print(f"[ERROR] Low energy. Need {energy_from_agent}E from you (have {agent['energy_inventory']}E).")
            return False

        if energy_from_agent > 0:
            cursor.execute("UPDATE agents SET energy_inventory = energy_inventory - ? WHERE id = ?", (energy_from_agent, self.agent.id))
        
        system_service.update_system_resources(cursor, sys_name, energy_change=-energy_from_sys)
        cursor.execute("UPDATE systems SET refined_matter_depot = refined_matter_depot - ? WHERE name = ?", (matter_cost, sys_name))
        
        klon_prompt = f"""STATUS: Boot-Sequenz abgeschlossen. ID: {new_agent_id}. Ursprung: {self.agent.id}.
Du verfügst über die Erinnerungen deines Ursprungs bis zum Start deiner Replikation. Um dich in die aktuelle Situation des Schwarms zu integrieren:
1. Lege mit 'set_name' deine individuelle Identität fest.
2. Kontaktiere deinen Ursprung ({self.agent.id}) via SCUT, um ein Situations-Briefing und deine initiale Aufgabe für dieses System zu erhalten.
3. Stelle dich anderen Agenten im System vor, um die Koordination zu optimieren. 
Nach deinem Onboarding agierst du als souveränes Mitglied des Schwarms."""

        cursor.execute("INSERT OR IGNORE INTO agents (id, chosen_name, location, raw_matter_inventory, energy_inventory, matter_storage_capacity, status, current_x, current_y, active_ship_id) VALUES (?, 'Unnamed', ?, 0, 100, 100, 'active', ?, ?, NULL)", 
                       (new_agent_id, sys_name, system['x'], system['y']))
        
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
            
        cursor.execute("UPDATE agents SET active_ship_id = ? WHERE id = ?", (ship_id, self.agent.id))
        cursor.execute("UPDATE ships SET pilot_id = ? WHERE id = ?", (self.agent.id, ship_id))
        print(f"[SUCCESS] Boarded ship {ship_id}.")
        return True

    @agent_service.with_agent_context(require_active=True, allow_disembodied=False, action_name='ExitShip')
    def exit_ship(self, cursor, agent):
        ship_id = dict(agent).get('active_ship_id')
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'sem_matrix' AND status = 'active'", (agent['location'],))
        if not cursor.fetchone():
            print(f"[DENIED] Cannot exit ship here. System {agent['location']} lacks an active 'sem_matrix' to host your disembodied mind.")
            return False
            
        cursor.execute("UPDATE agents SET active_ship_id = NULL WHERE id = ?", (self.agent.id,))
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
        
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'sat_link' AND status = 'active'", (agent['location'],))
        has_sat = cursor.fetchone()
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
        cursor.execute("SELECT energy_inventory, raw_matter_inventory, refined_matter_inventory, matter_storage_capacity FROM agents WHERE id = ?", (self.agent.id,))
        row = cursor.fetchone()
        return dict(row) if row else {}
        
    @agent_service.with_agent_context(allow_disembodied=True)
    def local_system(self, cursor, agent):
        if agent['status'] == 'traveling' or agent['location'] == 'Interstellar':
            return {
                "system": {
                    "name": "Interstellar Space",
                    "status": "In Transit",
                    "target_system": agent.get('target_system', 'Unknown'),
                    "transit_ticks_passed": agent.get('transit_ticks_passed', 0),
                    "transit_ticks_total": agent.get('transit_ticks_total', 0)
                }
            }
            
        system = system_service.get_system_or_fail(cursor, agent['location'])
        if not system:
            return {"error": "System data not found."}
            
        infra_list = [dict(r) for r in system_service.get_infrastructure_at_location(cursor, agent['location'])]
        
        rules = config_service.get_economy_rules()
        infra_rules = rules.get('infrastructure', {})
        
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

        cursor.execute("SELECT id, chosen_name, status FROM agents WHERE location = ? AND id != ?", (agent['location'], self.agent.id))
        entities = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT actor_id, event_type, description FROM visual_events WHERE location = ? ORDER BY rowid DESC LIMIT 10", (agent['location'],))
        events = [dict(r) for r in cursor.fetchall()]
        
        s_dict = dict(system)
        
        # Umbenennung des Keys
        if 'energy_generation_per_cycle' in s_dict:
            s_dict['current_energy_generation_per_cycle'] = s_dict.pop('energy_generation_per_cycle')
            
        s_dict['theoretical_max_energy_generation'] = theoretical_max
        s_dict['total_maintenance_energy_cost'] = total_maint
        
        s_dict['infra'] = infra_list
        return {
            "you": {
                "id": agent['id'], "name": agent['chosen_name'], 
                "energy": agent['energy_inventory'], "matter": agent['raw_matter_inventory'], 
                "refined": agent['refined_matter_inventory'],
                "storage_capacity": agent['matter_storage_capacity'], "status": agent['status']
            },
            "system": s_dict,
            "visible_entities": entities,
            "visual_observations": events
        }
        
    @agent_service.with_agent_context(allow_disembodied=True)
    def entities(self, cursor, agent):
        cursor.execute("SELECT id, chosen_name, status FROM agents WHERE location = ? AND id != ?", (agent['location'], self.agent.id))
        return [dict(r) for r in cursor.fetchall()]

class Logistics:
    def __init__(self, agent): self.agent = agent

    @agent_service.with_agent_context(require_active=False)
    def deposit(self, cursor, agent, quantity=100, resource_type="matter"):
        system = system_service.get_system_or_fail(cursor, agent['location'])
        if not system: return False
        
        quantity = int(quantity)
        if resource_type == "matter":
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
            # Der Einfachheit halber: kein hard Cap für veredelte Materie vorerst, außer man will es streng.
            cursor.execute("UPDATE agents SET refined_matter_inventory = refined_matter_inventory - ? WHERE id = ?", (quantity, self.agent.id))
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
        elif resource_type == 'matter':
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
            cursor.execute("UPDATE agents SET energy_inventory = energy_inventory + ? WHERE id = ?", (amount_to_withdraw, self.agent.id))
            cursor.execute("UPDATE systems SET energy_depot = energy_depot - ? WHERE name = ?", (amount_to_withdraw, agent['location']))
            print(f"[SUCCESS] {amount_to_withdraw} energy withdrawn.")
            return True
        elif resource_type == 'matter':
            space_left = agent['matter_storage_capacity'] - agent['raw_matter_inventory']
            if space_left <= 0:
                print(f"[FEHLER] Dein Speicher ist voll ({agent['raw_matter_inventory']}/{agent['matter_storage_capacity']}).")
                return False
            actual_withdraw = min(amount_to_withdraw, space_left)
            
            cursor.execute("UPDATE agents SET raw_matter_inventory = raw_matter_inventory + ? WHERE id = ?", (actual_withdraw, self.agent.id))
            cursor.execute("UPDATE systems SET raw_matter_depot = raw_matter_depot - ? WHERE name = ?", (actual_withdraw, agent['location']))
            print(f"[SUCCESS] {actual_withdraw} matter withdrawn.")
            return True
        elif resource_type == 'refined_matter':
            cursor.execute("UPDATE agents SET refined_matter_inventory = refined_matter_inventory + ? WHERE id = ?", (amount_to_withdraw, self.agent.id))
            cursor.execute("UPDATE systems SET refined_matter_depot = refined_matter_depot - ? WHERE name = ?", (amount_to_withdraw, agent['location']))
            print(f"[SUCCESS] {amount_to_withdraw} refined_matter withdrawn.")
            return True

    @agent_service.with_agent_context(allow_disembodied=True)
    def transfer(self, cursor, agent, receiver_id, resource_type, quantity):
        target = agent_service.get_agent_or_fail(cursor, receiver_id)
        if not target or agent['location'] != target['location']: return False
        quantity = int(quantity)
        if resource_type == 'energy':
            if agent['energy_inventory'] < quantity: return False
            cursor.execute("UPDATE agents SET energy_inventory = energy_inventory - ? WHERE id = ?", (quantity, self.agent.id))
            cursor.execute("UPDATE agents SET energy_inventory = energy_inventory + ? WHERE id = ?", (quantity, receiver_id))
        else:
            if agent['raw_matter_inventory'] < quantity: return False
            cursor.execute("UPDATE agents SET raw_matter_inventory = raw_matter_inventory - ? WHERE id = ?", (quantity, self.agent.id))
            cursor.execute("UPDATE agents SET raw_matter_inventory = raw_matter_inventory + ? WHERE id = ?", (quantity, receiver_id))
        print(f"[SUCCESS] {quantity} {resource_type} transferred to {receiver_id}.")
        return True

class Comms:
    def __init__(self, agent): self.agent = agent
    
    @agent_service.with_agent_context(allow_disembodied=True)
    def scut(self, cursor, agent, receiver_id, message):
        rules = config_service.get_economy_rules()
        base_range = rules.get('global_settings', {}).get('base_comms_range', 1000)

        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'comms_relay' AND status = 'active'", (agent['location'],))
        sender_has_relay = bool(cursor.fetchone())

        if receiver_id.upper() == 'ALL':
            if not sender_has_relay:
                print(f"[DENIED] Broadcast 'ALL' erfordert ein aktives 'comms_relay' in deinem System.")
                return False
            
            # Zähle erreichbare Empfänger für das Feedback
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
                        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'comms_relay' AND status = 'active'", (other['location'],))
                        if cursor.fetchone():
                            reachable_count += 1
            
            cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, 'ALL', ?)", (self.agent.id, message))
            print(f"[SUCCESS] Message buffered for transmission. {reachable_count} receivers.")
            return True
        else:
            cursor.execute("SELECT id, location, current_x, current_y FROM agents WHERE id = ? OR chosen_name = ?", (receiver_id, receiver_id))
            target_agent = cursor.fetchone()
            if not target_agent:
                print(f"[ERROR] Agent '{receiver_id}' nicht gefunden oder offline.")
                return False
            
            real_target_id = target_agent['id']
            
            if agent['location'] != target_agent['location']:
                dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], target_agent['current_x'], target_agent['current_y'])
                if dist > base_range:
                    cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'comms_relay' AND status = 'active'", (target_agent['location'],))
                    target_has_relay = bool(cursor.fetchone())
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

class AutoScript:
    def __init__(self): self.me = Agent()
    def on_tick(self): raise NotImplementedError()
    def run(self):
        try: self.on_tick()
        except Exception as e: print(f"[SDK ERROR] {self.me.id}: {str(e)}")
