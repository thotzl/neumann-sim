import os
import sys
import json
import sqlite3

# Pfad-Handling für Core-Lib
try:
    from .db_config import get_connection
    from . import agent_service
    from . import system_service
    from . import config_service
except ImportError:
    from db_config import get_connection
    import agent_service
    import system_service
    import config_service

class BobSDKError(Exception):
    pass

class Agent:
    def __init__(self, agent_id=None):
        self.id = agent_id or os.environ.get("BOB_ID")
        if not self.id:
            raise BobSDKError("Security Exception: Identity missing. (BOB_ID not set)")
        
        # Hardware-Komponenten der Sonde
        self.actuators = Actuators(self)
        self.sensors = Sensors(self)
        self.logistics = Logistics(self)
        self.comms = Comms(self)
        self.diagnostics = Diagnostics(self)

    def __repr__(self):
        return f"<BobAgent id='{self.id}'>"

class Actuators:
    """Physische Interaktion mit der Welt (Die Arme/Triebwerke)."""
    def __init__(self, agent):
        self.agent = agent
        self.rules = config_service.get_economy_rules()

    def mine(self):
        """Baut Materie ab."""
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id)
            if not agent or not agent_service.require_active_status(agent, 'Mining'): return False
            cost = self.rules.get('tool_costs', {}).get('mine', {}).get('energy', 30)
            if agent['energy'] < cost:
                print(f"[FEHLER] Batterie leer (braucht {cost} Energie).")
                return False
            cursor.execute("UPDATE agents SET energy = energy - ?, matter = matter + 100 WHERE id = ?", (cost, self.agent.id))
            cursor.execute("UPDATE systems SET resources = resources - 100 WHERE name = ?", (agent['location'],))
            conn.commit()
            print(f"[SUCCESS] 100 matter mined. Energy -{cost}.")
            return True
        finally: conn.close()

    def move(self, target_system):
        """Startet den interstellaren Flug."""
        print(f"[SDK] Engines active. Calculating jump to {target_system}...")
        return True

class Sensors:
    """Datenerfassung (Die Augen/Scanner)."""
    def __init__(self, agent):
        self.agent = agent

    def storage(self):
        """Eigene Tankfüllstände."""
        conn = get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("SELECT energy, matter, storage_limit FROM agents WHERE id = ?", (self.agent.id,))
            row = cursor.fetchone()
            return dict(row) if row else {}
        finally: conn.close()

    def local_system(self):
        """Daten über das aktuelle Sonnensystem."""
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id)
            system = system_service.get_system_or_fail(cursor, agent['location'])
            infra = system_service.get_infrastructure_at_location(cursor, agent['location'])
            return {"system": dict(system), "infrastructure": [dict(i) for i in infra]}
        finally: conn.close()

class Logistics:
    """Ressourcen-Umschlag (Das Cargo-Management)."""
    def __init__(self, agent):
        self.agent = agent

    def deposit(self, amount=100):
        """Zahlt Materie ins lokale Silo ein."""
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id)
            if agent['matter'] < amount: return False
            cursor.execute("UPDATE agents SET matter = matter - ? WHERE id = ?", (amount, self.agent.id))
            system_service.update_system_resources(cursor, agent['location'], matter_change=amount)
            conn.commit()
            print(f"[SUCCESS] {amount} matter deposited.")
            return True
        finally: conn.close()

    def withdraw(self, resource="energy", amount=50):
        """Holt Energie/Materie aus dem Silo."""
        conn = get_connection(); cursor = conn.cursor()
        try:
            agent = agent_service.get_agent_or_fail(cursor, self.agent.id)
            system = system_service.get_system_or_fail(cursor, agent['location'])
            avail = system['energy_stored'] if resource == 'energy' else system['matter_stored']
            if avail < amount: return False
            if resource == 'energy':
                cursor.execute("UPDATE agents SET energy = energy + ? WHERE id = ?", (amount, self.agent.id))
                system_service.update_system_resources(cursor, agent['location'], energy_change=-amount)
            conn.commit()
            print(f"[SUCCESS] {amount} {resource} withdrawn.")
            return True
        finally: conn.close()

class Comms:
    """Funkverbindung (SCUT)."""
    def __init__(self, agent):
        self.agent = agent

    def scut(self, receiver, message):
        """Point-to-Point Nachricht."""
        conn = get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)", (self.agent.id, receiver, message))
            conn.commit()
            print(f"[SCUT] Signal to {receiver} transmitted.")
            return True
        finally: conn.close()

class Diagnostics:
    """Innere Zustände und Dateisystem (Das Betriebssystem)."""
    def __init__(self, agent):
        self.agent = agent
        self.base_dir = os.environ.get("VERSE_DIR", os.path.join(os.getcwd(), '_verse'))

    def list_files(self):
        """Scannt die lokalen Speicherbänke (scripts)."""
        target_dir = os.path.join(self.base_dir, 'scripts', 'active', self.agent.id)
        if not os.path.exists(target_dir): return []
        return [{"name": f, "size": os.path.getsize(os.path.join(target_dir, f))} for f in os.listdir(target_dir)]

class AutoScript:
    """Basisklasse für alle programmierten Abläufe."""
    def __init__(self):
        self.me = Agent()
    def on_tick(self): raise NotImplementedError()
    def run(self):
        try: self.on_tick()
        except Exception as e: print(f"[SDK ERROR] {self.me.id}: {str(e)}")
