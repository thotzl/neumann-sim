import os
import sys
import json
import sqlite3
import math
import random

# Pfad-Handling für Core-Lib
try:
    from .db_config import get_connection
    from . import agent_service
    from . import system_service
    from . import config_service
    from . import physics_service
except ImportError:
    from db_config import get_connection
    import agent_service
    import system_service
    import config_service
    import physics_service

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

    # --- FLAT API (V8.8 Proxy Methods) ---
    def mine(self): return self.actuators.mine()
    def build(self, type, amount=100): return self.actuators.build(type, amount)
    def refine(self, amount=100): return self.actuators.refine(amount)
    def repair(self, infra_id, amount=50): return self.actuators.repair(infra_id, amount)
    def deconstruct(self, infra_id): return self.actuators.deconstruct(infra_id)
    def move(self, target_sys): return self.actuators.move(target_sys)
    def replicate(self, new_id): return self.actuators.replicate(new_id)
    def set_name(self, name): return self.actuators.set_name(name)
    def rename_system(self, new_name): return self.actuators.rename_system(new_name)
    
    def deposit(self, amount=100, resource="matter"): return self.logistics.deposit(amount, resource)
    def withdraw(self, resource="energy", amount=50): return self.logistics.withdraw(resource, amount)
    def transfer(self, to, resource, amount): return self.logistics.transfer(to, resource, amount)
    
    def scut(self, to, msg): return self.comms.scut(to, msg)
    def poll(self): return self.comms.poll_radio()
    
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

    def mine(self):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            if not agent or not agent_service.require_active_status(agent, 'Mining'): return False
            cost = self.rules.get('actions', {}).get('mine', {}).get('energy_cost', 30)
            if agent['energy'] < cost: 
                print(f"[FEHLER] Batterie leer (braucht {cost} Energie).")
                return False
            if agent['matter'] >= agent['storage_limit']:
                print(f"[FEHLER] Speicher voll ({agent['matter']}/{agent['storage_limit']}).")
                return False
            sys_name = agent['location']
            system = system_service.get_system_or_fail(cursor, sys_name)
            if not system or system['resources'] <= 0:
                print(f"[INFO] Ressourcen in {sys_name} erschöpft.")
                return False
            cursor.execute("UPDATE agents SET energy = energy - ?, matter = matter + 100 WHERE id = ?", (cost, self.agent.id))
            cursor.execute("UPDATE systems SET resources = resources - 100 WHERE name = ?", (sys_name,))
            self._emit_visual(cursor, "MINING", f"Agent {self.agent.id} hat Materie abgebaut.")
            conn.commit()
            print(f"[SUCCESS] 100 matter mined. Energy -{cost}.")
            return True
        finally: conn.close()

    def refine(self, amount=100):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            if not agent_service.require_active_status(agent, 'Refining'): return False
            
            # Check if refinery exists in system
            cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'matter_refinery' AND status = 'active'", (agent['location'],))
            if not cursor.fetchone():
                print(f"[DENIED] No active 'matter_refinery' in {agent['location']} found.")
                return False
                
            rule = self.rules.get('actions', {}).get('refine', {})
            energy_cost = rule.get('energy_cost', 50)
            raw_cost = rule.get('raw_matter_cost', 100)
            yield_refined = rule.get('refined_yield', 100)
            
            if agent['energy'] < energy_cost: return False
            if agent['matter'] < raw_cost:
                print(f"[ERROR] Not enough raw matter (have {agent['matter']}, need {raw_cost}).")
                return False
            
            cursor.execute("UPDATE agents SET energy = energy - ?, matter = matter - ?, refined_matter = refined_matter + ? WHERE id = ?", 
                           (energy_cost, raw_cost, yield_refined, self.agent.id))
            conn.commit()
            print(f"[SUCCESS] Refined {raw_cost} matter into {yield_refined} refined units.")
            return True
        finally: conn.close()

    def repair(self, infra_id, amount=50):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            cursor.execute("SELECT * FROM infrastructure WHERE id = ?", (infra_id,))
            infra = cursor.fetchone()
            if not infra: return False
            
            # Repair costs: 1 energy and 1 matter per HP
            if agent['energy'] < amount or agent['matter'] < amount:
                print(f"[ERROR] Not enough resources for repair (need {amount}E and {amount}M).")
                return False
            
            new_health = min(infra['max_health'], infra['health'] + amount)
            # Re-activate if was offline
            status = 'active' if new_health > 0 else infra['status']
            
            cursor.execute("UPDATE infrastructure SET health = ?, status = ? WHERE id = ?", (new_health, status, infra_id))
            cursor.execute("UPDATE agents SET energy = energy - ?, matter = matter - ? WHERE id = ?", (amount, amount, self.agent.id))
            conn.commit()
            print(f"[SUCCESS] Infra {infra_id} repaired to {new_health} HP.")
            return True
        finally: conn.close()

    def build(self, type, amount=100):
        infra_type = type
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            if not agent_service.require_active_status(agent, 'Build'): return False
            
            infra_rules = self.rules.get('infrastructure', {}).get(infra_type, {"matter_cost": 400})
            total_cost = infra_rules.get('matter_cost', 400)
            
            # Check for existing project OR upgrade
            cursor.execute("SELECT * FROM infrastructure WHERE system_name = ? AND type = ?", (agent['location'], infra_type))
            existing = cursor.fetchone()
            
            cursor.execute("UPDATE agents SET energy = energy - 15 WHERE id = ?", (self.agent.id,))
            
            if existing:
                if existing['status'] == 'active':
                    # UPGRADE Logic
                    upgrade_cost = total_cost * 1.5 # Upgrades are more expensive
                    cursor.execute("UPDATE infrastructure SET progress_matter = progress_matter + ? WHERE id = ?", (amount, existing['id']))
                    if existing['progress_matter'] + amount >= upgrade_cost:
                        new_lvl = existing['level'] + 1
                        cursor.execute("UPDATE infrastructure SET level = ?, progress_matter = 0, health = max_health WHERE id = ?", (new_lvl, existing['id']))
                        print(f"[SUCCESS] {infra_type} upgraded to Level {new_lvl}!")
                        # Apply bonus again (simplified: bonus is additive per level)
                        self._apply_infra_bonus(cursor, agent['location'], infra_type, infra_rules)
                    else:
                        print(f"[SUCCESS] {amount} matter invested in {infra_type} Upgrade (Lvl {existing['level']}).")
                else:
                    # Continue construction
                    cursor.execute("UPDATE infrastructure SET progress_matter = progress_matter + ? WHERE id = ?", (amount, existing['id']))
                    if existing['progress_matter'] + amount >= total_cost:
                        cursor.execute("UPDATE infrastructure SET status = 'active', progress_matter = 0 WHERE id = ?", (existing['id'],))
                        self._apply_infra_bonus(cursor, agent['location'], infra_type, infra_rules)
                        print(f"[SUCCESS] {infra_type} completed!")
            else:
                # New construction
                cursor.execute("INSERT INTO infrastructure (system_name, type, status, progress_matter, required_matter, level, health, max_health) VALUES (?, ?, 'construction', ?, ?, 1, 100, 100)", 
                               (agent['location'], infra_type, amount, total_cost))
                if amount >= total_cost:
                    cursor.execute("UPDATE infrastructure SET status = 'active', progress_matter = 0 WHERE system_name = ? AND type = ?", (agent['location'], infra_type))
                    self._apply_infra_bonus(cursor, agent['location'], infra_type, infra_rules)
                    print(f"[SUCCESS] {infra_type} completed!")
            
            conn.commit()
            return True
        finally: conn.close()

    def _apply_infra_bonus(self, cursor, system_name, infra_type, rules):
        if 'matter_capacity_bonus' in rules:
            cursor.execute("UPDATE systems SET matter_cap = matter_cap + ? WHERE name = ?", (rules['matter_capacity_bonus'], system_name))
        if 'energy_capacity_bonus' in rules:
            cursor.execute("UPDATE systems SET energy_cap = energy_cap + ? WHERE name = ?", (rules['energy_capacity_bonus'], system_name))
        if 'energy_regen_bonus' in rules:
            cursor.execute("UPDATE systems SET passive_energy_rate = passive_energy_rate + ? WHERE name = ?", (rules['energy_regen_bonus'], system_name))

    def deconstruct(self, infra_id):
        conn = get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("SELECT system_name, type, level FROM infrastructure WHERE id = ?", (infra_id,))
            row = cursor.fetchone()
            if row:
                infra_rules = self.rules.get('infrastructure', {}).get(row['type'], {"matter_cost": 400})
                refund = (infra_rules.get('matter_cost', 400) * row['level']) // 2
                cursor.execute("UPDATE systems SET matter_stored = matter_stored + ? WHERE name = ?", (refund, row['system_name']))
                cursor.execute("DELETE FROM infrastructure WHERE id = ?", (infra_id,))
                # Note: This doesn't remove the capacity bonus yet (complex to track), but it's okay for now
                conn.commit()
                print(f"[SUCCESS] Object {infra_id} deconstructed. Refund: {refund}")
                return True
            return False
        finally: conn.close()

    def move(self, target_sys):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            if not agent_service.require_active_status(agent, 'Move'): return False
            cursor.execute("SELECT * FROM systems WHERE name = ?", (target_sys,))
            target = cursor.fetchone()
            if not target:
                print(f"[FEHLER] System '{target_sys}' wurde noch nicht entdeckt.")
                return False
            phys = self.rules.get('actions', {}).get('move', {})
            dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], target['x'], target['y'])
            cost = dist * phys.get('cost_per_distance', 0.1)
            if agent['energy'] < cost: return False
            cursor.execute("UPDATE agents SET status='traveling', target_system=?, origin_x=current_x, origin_y=current_y, target_x=?, target_y=?, transit_ticks_total=MAX(1, CAST(?/300 AS INT)), transit_ticks_passed=0, energy=energy-? WHERE id=?", 
                           (target_sys, target['x'], target['y'], dist, cost, self.agent.id))
            conn.commit()
            print(f"[SUCCESS] Journey initiated to {target_sys}.")
            return True
        finally: conn.close()

    def replicate(self, new_id):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            if not agent_service.require_active_status(agent, 'Replication'): return False
            
            sys_name = agent['location']
            system = system_service.get_system_or_fail(cursor, sys_name)
            
            cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'shipyard' AND status = 'active'", (sys_name,))
            if not cursor.fetchone():
                print(f"[DENIED] No active 'shipyard' in {sys_name} found.")
                return False

            rule = self.rules.get('actions', {}).get('replicate', {})
            energy_cost = rule.get('energy_cost', 180)
            matter_cost = rule.get('matter_cost', 1000)

            if system['matter_stored'] < matter_cost: return False
            if agent['energy'] < energy_cost: return False

            cursor.execute("UPDATE agents SET energy = energy - ? WHERE id = ?", (energy_cost, self.agent.id))
            system_service.update_system_resources(cursor, sys_name, matter_change=-matter_cost)
            
            cursor.execute("INSERT OR IGNORE INTO agents (id, chosen_name, location, matter, energy, storage_limit, status, current_x, current_y) VALUES (?, 'Unnamed', ?, 0, 100, 100, 'active', ?, ?)", 
                           (new_id, sys_name, system['x'], system['y']))
            conn.commit()
            print(f"[SUCCESS] Clone '{new_id}' started.")
            return True
        finally: conn.close()

    def set_name(self, new_name):
        conn = get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("UPDATE agents SET chosen_name = ? WHERE id = ?", (new_name, self.agent.id))
            conn.commit()
            return True
        finally: conn.close()

    def rename_system(self, new_display_name):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id)
            cursor.execute("UPDATE systems SET display_name = ? WHERE name = ?", (new_display_name, agent['location']))
            conn.commit()
            return True
        finally: conn.close()

class Sensors:
    def __init__(self, agent): self.agent = agent
    def scan(self):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            if agent['status'] != 'active': return False
            
            system = system_service.get_system_or_fail(cursor, agent['location'])
            rules = config_service.get_economy_rules()
            base_cost = rules.get('actions', {}).get('scan', {}).get('energy_cost', 40)
            
            # Check for Sat-Link bonus
            cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'sat_link' AND status = 'active'", (agent['location'],))
            has_sat = cursor.fetchone()
            cost = base_cost * 0.5 if has_sat else base_cost
            
            if agent['energy'] < cost: return False

            # Point generation
            phys = {"scan_range_min": 500, "scan_range_max": 1500}
            dist = random.randint(phys['scan_range_min'], phys['scan_range_max'])
            angle = random.uniform(0, 360)
            snap_x = int(round((system['x'] + dist * math.cos(math.radians(angle))) / 100.0) * 100)
            snap_y = int(round((system['y'] + dist * math.sin(math.radians(angle))) / 100.0) * 100)
            sys_id = f"SYS-X{snap_x}-Y{snap_y}"

            try:
                cursor.execute("INSERT INTO systems (name, x, y, resources) VALUES (?, ?, ?, ?)", (sys_id, snap_x, snap_y, random.randint(1000, 5000)))
                cursor.execute("UPDATE agents SET energy = energy - ? WHERE id = ?", (cost, agent['id']))
                conn.commit()
                print(f"[SCAN] Detected: {sys_id}. Cost: {cost}E")
                return True
            except sqlite3.IntegrityError:
                print(f"[INFO] Sector {sys_id} already mapped.")
                return False
        finally: conn.close()

    def storage(self):
        conn = get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("SELECT energy, matter, refined_matter, storage_limit FROM agents WHERE id = ?", (self.agent.id,))
            row = cursor.fetchone()
            return dict(row) if row else {}
        finally: conn.close()
        
    def local_system(self):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            system = system_service.get_system_or_fail(cursor, agent['location'])
            cursor.execute("SELECT * FROM infrastructure WHERE system_name = ?", (agent['location'],))
            infra = [dict(r) for r in cursor.fetchall()]
            
            return {
                "you": {"id": agent['id'], "energy": agent['energy'], "matter": agent['matter'], "refined": agent['refined_matter']},
                "system": dict(system),
                "infra": infra
            }
        finally: conn.close()
        
    def entities(self):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id)
            cursor.execute("SELECT id, chosen_name, status FROM agents WHERE location = ? AND id != ?", (agent['location'], self.agent.id))
            return [dict(r) for r in cursor.fetchall()]
        finally: conn.close()

class Logistics:
    def __init__(self, agent): self.agent = agent
    def deposit(self, amount=100, resource="matter"):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            system = system_service.get_system_or_fail(cursor, agent['location'])
            
            if resource == "matter":
                if agent['matter'] < amount: return False
                if system['matter_stored'] + amount > system['matter_cap']: return False
                cursor.execute("UPDATE agents SET matter = matter - ? WHERE id = ?", (amount, self.agent.id))
                cursor.execute("UPDATE systems SET matter_stored = matter_stored + ? WHERE name = ?", (amount, agent['location']))
            elif resource == "energy":
                if agent['energy'] < amount: return False
                if system['energy_stored'] + amount > system['energy_cap']: return False
                cursor.execute("UPDATE agents SET energy = energy - ? WHERE id = ?", (amount, self.agent.id))
                cursor.execute("UPDATE systems SET energy_stored = energy_stored + ? WHERE name = ?", (amount, agent['location']))
            conn.commit(); return True
        finally: conn.close()

    def withdraw(self, resource="energy", amount=50):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            system = system_service.get_system_or_fail(cursor, agent['location'])
            avail = system['energy_stored'] if resource == 'energy' else system['matter_stored']
            if avail < amount: return False
            
            if resource == 'energy':
                cursor.execute("UPDATE agents SET energy = energy + ? WHERE id = ?", (amount, self.agent.id))
                cursor.execute("UPDATE systems SET energy_stored = energy_stored - ? WHERE name = ?", (amount, agent['location']))
            else:
                cursor.execute("UPDATE agents SET matter = matter + ? WHERE id = ?", (amount, self.agent.id))
                cursor.execute("UPDATE systems SET matter_stored = matter_stored - ? WHERE name = ?", (amount, agent['location']))
            conn.commit(); return True
        finally: conn.close()

    def transfer(self, target_id, resource, amount):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            target = agent_service.get_agent_or_fail(cursor, target_id)
            if not agent or not target or agent['location'] != target['location']: return False
            if resource == 'energy':
                if agent['energy'] < amount: return False
                cursor.execute("UPDATE agents SET energy = energy - ?, energy = energy + ? WHERE id = ? AND id = ?", (amount, amount, self.agent.id, target_id))
            else:
                if agent['matter'] < amount: return False
                cursor.execute("UPDATE agents SET matter = matter - ?, matter = matter + ? WHERE id = ? AND id = ?", (amount, amount, self.agent.id, target_id))
            conn.commit(); return True
        finally: conn.close()

class Comms:
    def __init__(self, agent): self.agent = agent
    def scut(self, receiver, message):
        conn = get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", (self.agent.id, receiver, message))
            conn.commit(); return True
        finally: conn.close()
    def poll_radio(self):
        conn = get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("SELECT rowid, sender, content FROM messages WHERE receiver = ? OR receiver = 'ALL'", (self.agent.id,))
            rows = cursor.fetchall()
            if not rows: return ""
            output = ""; delete_ids = []
            for r in rows:
                output += f"Von {r['sender']}: {r['content']}\n"; delete_ids.append(r['rowid'])
            placeholders = ','.join('?' * len(delete_ids))
            cursor.execute(f"DELETE FROM messages WHERE rowid IN ({placeholders})", (tuple(delete_ids) if len(delete_ids) > 1 else delete_ids[0],))
            conn.commit(); return output.strip()
        finally: conn.close()

class Diagnostics:
    def __init__(self, agent):
        self.agent = agent
        self.base_dir = os.environ.get("VERSE_DIR", os.path.join(os.getcwd(), '_verse'))
    def list_files(self):
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
