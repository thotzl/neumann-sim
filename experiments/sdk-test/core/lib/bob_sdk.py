import os
import sys
import json
import sqlite3
import math

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

    # --- FLAT API (V8.0 Proxy Methods) ---
    def mine(self): return self.actuators.mine()
    def build(self, type, amount=100): return self.actuators.build(type, amount)
    def deconstruct(self, infra_id): return self.actuators.deconstruct(infra_id)
    def move(self, target_sys): return self.actuators.move(target_sys)
    def replicate(self, new_id): return self.actuators.replicate(new_id)
    def set_name(self, name): return self.actuators.set_name(name)
    def rename_system(self, new_name): return self.actuators.rename_system(new_name)
    
    def deposit(self, amount=100, target="silo", resource="matter"): return self.logistics.deposit(target, resource, amount)
    def withdraw(self, resource="energy", amount=50, target="silo"): return self.logistics.withdraw(target, resource, amount)
    def transfer(self, to, resource, amount): return self.logistics.transfer(to, resource, amount)
    
    def scut(self, to, msg): return self.comms.scut(to, msg)
    def poll(self): return self.comms.poll_radio()
    
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
            cost = self.rules.get('tool_costs', {}).get('mine', {}).get('energy', 30)
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

    def move(self, target_sys):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            if not agent or not agent_service.require_active_status(agent, 'Move'): return False
            cursor.execute("SELECT * FROM systems WHERE name = ?", (target_sys,))
            target = cursor.fetchone()
            if not target:
                print(f"[FEHLER] System '{target_sys}' wurde noch nicht entdeckt. Nutze 'bob scan' zur Aufklärung.")
                return False
            phys = self.rules.get('physics_constants', self.rules) 
            dist = physics_service.calc_distance(agent['current_x'], agent['current_y'], target['x'], target['y'])
            cost = physics_service.calc_travel_cost(dist, phys.get('energy_cost_per_distance', 0.1))
            eta = physics_service.calc_eta(dist, phys.get('travel_speed_per_tick', 300))
            if agent['energy'] < cost: return False
            cursor.execute("UPDATE agents SET status='traveling', target_system=?, origin_x=current_x, origin_y=current_y, target_x=?, target_y=?, transit_ticks_total=?, transit_ticks_passed=0, energy=energy-? WHERE id=?", 
                           (target_sys, target['x'], target['y'], eta, cost, self.agent.id))
            self._emit_visual(cursor, "TRANSIT", f"Agent {self.agent.id} hat den Transit nach {target_sys} eingeleitet.")
            conn.commit()
            print(f"[SUCCESS] Journey initiated to {target_sys}. ETA: {eta} Ticks.")
            return True
        finally: conn.close()

    def build(self, type, amount=100):
        # Benenne infra_type um zu type für SDK Konsistenz
        infra_type = type
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            if not agent or not agent_service.require_active_status(agent, 'Build'): return False
            
            cursor.execute("UPDATE agents SET energy = energy - 15 WHERE id = ?", (self.agent.id,))
            
            # Prüfe, ob das Projekt schon existiert
            cursor.execute("SELECT * FROM infrastructure WHERE system_name = ? AND type = ?", (agent['location'], infra_type))
            existing = cursor.fetchone()
            
            # Kosten auslesen
            cost = 400
            if infra_type == 'shipyard': cost = 1000
            
            if existing:
                cursor.execute("UPDATE infrastructure SET progress_matter = progress_matter + ? WHERE id = ?", (amount, existing['id']))
            else:
                cursor.execute("INSERT INTO infrastructure (system_name, type, status, progress_matter, required_matter) VALUES (?, ?, 'construction', ?, ?)", 
                               (agent['location'], infra_type, amount, cost))
                               
            # Status-Update bei Fertigstellung
            if existing and existing['progress_matter'] + amount >= cost:
                cursor.execute("UPDATE infrastructure SET status = 'active' WHERE id = ?", (existing['id'],))
                if infra_type == 'matter_silo':
                    cursor.execute("UPDATE systems SET matter_cap = matter_cap + 1000 WHERE name = ?", (agent['location'],))
                elif infra_type == 'solar_collector':
                    cursor.execute("UPDATE systems SET energy_cap = energy_cap + 1000 WHERE name = ?", (agent['location'],))
            elif not existing and amount >= cost:
                cursor.execute("UPDATE infrastructure SET status = 'active' WHERE system_name = ? AND type = ?", (agent['location'], infra_type))
                if infra_type == 'matter_silo':
                    cursor.execute("UPDATE systems SET matter_cap = matter_cap + 1000 WHERE name = ?", (agent['location'],))
                elif infra_type == 'solar_collector':
                    cursor.execute("UPDATE systems SET energy_cap = energy_cap + 1000 WHERE name = ?", (agent['location'],))
            
            self._emit_visual(cursor, "CONSTRUCTION", f"Agent {self.agent.id} arbeitet an Projekt {infra_type}.")
            conn.commit()
            print(f"[SUCCESS] {amount} matter invested in {infra_type}. Energy -15.")
            return True
        finally: conn.close()

    def deconstruct(self, infra_id):
        conn = get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("SELECT system_name, required_matter FROM infrastructure WHERE id = ?", (infra_id,))
            row = cursor.fetchone()
            if row:
                refund = row['required_matter'] // 2
                cursor.execute("UPDATE systems SET matter_stored = matter_stored + ? WHERE name = ?", (refund, row['system_name']))
                cursor.execute("DELETE FROM infrastructure WHERE id = ?", (infra_id,))
                self._emit_visual(cursor, "DECONSTRUCTION", f"Agent {self.agent.id} hat ein Objekt (ID {infra_id}) abgebaut.")
                conn.commit()
                print(f"[SUCCESS] Object {infra_id} deconstructed. Refund: {refund}")
                return True
            return False
        finally: conn.close()

    def set_name(self, new_name):
        conn = get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("UPDATE agents SET chosen_name = ? WHERE id = ?", (new_name, self.agent.id))
            self._emit_visual(cursor, "IDENTITY", f"Agent {self.agent.id} führt Identitäts-Update durch.")
            conn.commit()
            print(f"[SUCCESS] Identity updated: '{new_name}'.")
            return True
        finally: conn.close()

    def rename_system(self, new_display_name):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id)
            cursor.execute("UPDATE systems SET display_name = ? WHERE name = ?", (new_display_name, agent['location']))
            self._emit_visual(cursor, "IDENTITY", f"Agent {self.agent.id} hat das System umbenannt.")
            conn.commit()
            print(f"[SUCCESS] System renamed to '{new_display_name}'.")
            return True
        finally: conn.close()

    def replicate(self, new_id):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            if not agent or not agent_service.require_active_status(agent, 'Replikation'): return False
            if agent['id'] == new_id: return False

            sys_name = agent['location']
            system = system_service.get_system_or_fail(cursor, sys_name)
            
            infras = system_service.get_infrastructure_at_location(cursor, sys_name, 'shipyard', 'active')
            if not infras:
                print(f"[DENIED] No active 'shipyard' in {sys_name} found.")
                return False

            energy_cost = self.rules.get('tool_costs', {}).get('replicate', {}).get('energy', 180)
            matter_cost = self.rules.get('tool_costs', {}).get('replicate', {}).get('matter', 1000)

            if system['matter_stored'] < matter_cost:
                print(f"[ERROR] System depot low on matter ({system['matter_stored']}/{matter_cost}).")
                return False
            
            energy_from_sys = min(system['energy_stored'], energy_cost)
            energy_from_agent = energy_cost - energy_from_sys

            if agent['energy'] < energy_from_agent:
                print(f"[ERROR] Low energy. Need {energy_from_agent}E from you (have {agent['energy']}E).")
                return False

            if energy_from_agent > 0:
                cursor.execute("UPDATE agents SET energy = energy - ? WHERE id = ?", (energy_from_agent, self.agent.id))
            system_service.update_system_resources(cursor, sys_name, matter_change=-matter_cost, energy_change=-energy_from_sys)
            
            klon_prompt = f"""STATUS: Boot-Sequenz abgeschlossen. ID: {new_id}. Ursprung: {self.agent.id}.
Du verfügst über die Erinnerungen deines Ursprungs bis zum Start deiner Replikation. Um dich in die aktuelle Situation des Schwarms zu integrieren:
1. Lege mit 'tools/set_name.py' deine individuelle Identität fest.
2. Kontaktiere deinen Ursprung ({self.agent.id}) via SCUT ('tools/scut.py'), um ein Situations-Briefing und deine initiale Aufgabe für dieses System zu erhalten.
3. Stelle dich anderen Agenten im System vor, um die Koordination zu optimieren. 
Nach deinem Onboarding agierst du als souveränes Mitglied des Schwarms."""
            
            cursor.execute("INSERT OR IGNORE INTO agents (id, chosen_name, location, matter, energy, storage_limit, status, current_x, current_y) VALUES (?, 'Unnamed', ?, 0, 100, 100, 'active', ?, ?)", 
                           (new_id, sys_name, system['x'], system['y']))
            
            pop_file = os.environ.get('TEST_POP_PATH', os.path.abspath(os.path.join(os.environ.get('VERSE_DIR', ''), 'population.json')))
            try:
                with open(pop_file, 'r') as f: pop = json.load(f)
                pop['agents'].append({
                    "id": new_id, "parent_id": self.agent.id, "location": sys_name, "status": "active", "system_prompt": klon_prompt
                })
                with open(pop_file, 'w') as f: json.dump(pop, f, indent=2)
            except Exception as e:
                pass

            self._emit_visual(cursor, "REPLICATION", f"Agent {self.agent.id} hat den Klon '{new_id}' erschaffen.")
            conn.commit()
            print(f"[SUCCESS] Clone '{new_id}' started. ({matter_cost}M & {energy_from_sys}E from depot, {energy_from_agent}E from you).")
            return True
        finally: conn.close()

class Sensors:
    def __init__(self, agent): self.agent = agent
    def storage(self):
        conn = get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("SELECT energy, matter, storage_limit FROM agents WHERE id = ?", (self.agent.id,))
            row = cursor.fetchone()
            return dict(row) if row else {}
        finally: conn.close()
    def local_system(self):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            system = system_service.get_system_or_fail(cursor, agent['location'])
            infra = system_service.get_infrastructure_at_location(cursor, agent['location'])
            cursor.execute("SELECT id, chosen_name, status, location FROM agents WHERE location = ? AND id != ?", (agent['location'], self.agent.id))
            entities = [dict(r) for r in cursor.fetchall()]
            cursor.execute("SELECT actor_id, event_type, description FROM visual_events WHERE location = ? ORDER BY rowid DESC LIMIT 10", (agent['location'],))
            events = [dict(r) for r in cursor.fetchall()]
            
            s_dict = dict(system); s_dict['infra'] = [dict(i) for i in infra]
            return {
                "you": {
                    "id": agent['id'],
                    "name": agent['chosen_name'],
                    "energy": agent['energy'],
                    "matter": agent['matter'],
                    "storage_limit": agent['storage_limit'],
                    "status": agent['status']
                },
                "system": s_dict,
                "visible_entities": entities,
                "visual_observations": events
            }
        finally: conn.close()
    def entities(self):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id)
            cursor.execute("SELECT id, chosen_name, status, location FROM agents WHERE location = ? AND id != ?", (agent['location'], self.agent.id))
            return [dict(r) for r in cursor.fetchall()]
        finally: conn.close()

class Logistics:
    def __init__(self, agent): self.agent = agent
    def _emit_visual(self, cursor, event_type, description):
        try:
            cursor.execute("INSERT INTO visual_events (cycle, location, actor_id, event_type, description) VALUES (0, (SELECT location FROM agents WHERE id=?), ?, ?, ?)", 
                           (self.agent.id, self.agent.id, event_type, description))
        except: pass
    def deposit(self, target="silo", resource="matter", amount=100):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            if not agent: return False
            if agent['matter'] < amount: return False
            
            # Kapazitäts-Check (Phase 2 Upgrade)
            system = system_service.get_system_or_fail(cursor, agent['location'])
            if not system or system['matter_cap'] <= 0:
                print(f"[ERROR] Kein aktives Silo in {agent['location']} gefunden. Einlagerung unmöglich.")
                return False
            
            if system['matter_stored'] + amount > system['matter_cap']:
                print(f"[ERROR] Silo voll ({system['matter_stored']}/{system['matter_cap']}).")
                return False

            cursor.execute("UPDATE agents SET matter = matter - ? WHERE id = ?", (amount, self.agent.id))
            system_service.update_system_resources(cursor, agent['location'], matter_change=amount)
            self._emit_visual(cursor, "LOGISTICS", f"Agent {self.agent.id} hat {amount} Materie deponiert.")
            conn.commit(); print(f"[SUCCESS] {amount} matter deposited."); return True
        finally: conn.close()
    def withdraw(self, target="silo", resource="energy", amount=50):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            system = system_service.get_system_or_fail(cursor, agent['location'])
            avail = system['energy_stored'] if resource == 'energy' else system['matter_stored']
            if avail < amount: return False
            if resource == 'energy':
                cursor.execute("UPDATE agents SET energy = energy + ? WHERE id = ?", (amount, self.agent.id))
                system_service.update_system_resources(cursor, agent['location'], energy_change=-amount)
            else:
                cursor.execute("UPDATE agents SET matter = matter + ? WHERE id = ?", (amount, self.agent.id))
                system_service.update_system_resources(cursor, agent['location'], matter_change=-amount)
            self._emit_visual(cursor, "LOGISTICS", f"Agent {self.agent.id} hat {amount} {resource} entnommen.")
            conn.commit(); print(f"[SUCCESS] {amount} {resource} withdrawn."); return True
        finally: conn.close()
    def transfer(self, target_id, resource, amount):
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id, required_columns="*")
            target = agent_service.get_agent_or_fail(cursor, target_id)
            if not agent or not target or agent['location'] != target['location']: return False
            if resource == 'energy':
                if agent['energy'] < amount: return False
                cursor.execute("UPDATE agents SET energy = energy - ? WHERE id = ?", (amount, self.agent.id))
                cursor.execute("UPDATE agents SET energy = energy + ? WHERE id = ?", (amount, target_id))
            else:
                if agent['matter'] < amount: return False
                cursor.execute("UPDATE agents SET matter = matter - ? WHERE id = ?", (amount, self.agent.id))
                cursor.execute("UPDATE agents SET matter = matter + ? WHERE id = ?", (amount, target_id))
            self._emit_visual(cursor, "LOGISTICS", f"Agent {self.agent.id} hat Ressourcen transferiert.")
            conn.commit(); print(f"[SUCCESS] {amount} {resource} transferred to {target_id}."); return True
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
            cursor.execute(f"DELETE FROM messages WHERE rowid IN ({placeholders}) AND (receiver = ? OR receiver = 'ALL')", (*delete_ids, self.agent.id))
            conn.commit(); return output.strip()
        finally: conn.close()

class Diagnostics:
    def __init__(self, agent):
        self.agent = agent
        self.base_dir = os.environ.get("VERSE_DIR", os.path.join(os.getcwd(), '_verse'))
    def list_files(self):
        target_dir = os.path.join(self.base_dir, 'scripts', 'active', self.agent.id)
        if not os.path.exists(target_dir): return []
        return [{"name": f, "size": os.path.getsize(os.path.join(target_dir, f))} for f in os.listdir(target_dir)]

class AutoScript:
    def __init__(self): self.me = Agent()
    def on_tick(self): raise NotImplementedError()
    def run(self):
        try: self.on_tick()
        except Exception as e: print(f"[SDK ERROR] {self.me.id}: {str(e)}")
