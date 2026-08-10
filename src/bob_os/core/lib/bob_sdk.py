import os
import sys

try:
    from .sdk.actuators import Actuators
    from .sdk.sensors import Sensors
    from .sdk.logistics import Logistics
    from .sdk.comms import Comms
    from .sdk.diagnostics import Diagnostics
    from .sdk.journal import Journal
except ImportError:
    from core.lib.sdk.actuators import Actuators
    from core.lib.sdk.sensors import Sensors
    from core.lib.sdk.logistics import Logistics
    from core.lib.sdk.comms import Comms
    from core.lib.sdk.diagnostics import Diagnostics
    from core.lib.sdk.journal import Journal

class BobSDKError(Exception):
    pass

class Agent:
    def __init__(self, agent_id=None):
        self.id = agent_id or os.environ.get('BOB_ID')
        if not self.id:
            raise BobSDKError("Security Exception: Identity missing. (BOB_ID must be set in active environment)")
            
        self.actuators = Actuators(self)
        self.sensors = Sensors(self)
        self.logistics = Logistics(self)
        self.comms = Comms(self)
        self.diagnostics = Diagnostics(self)
        self.journal = Journal(self)

    def __repr__(self):
        return f"<BobAgent id='{self.id}'>"

    # --- ACTUATORS DELEGATES ---
    def mine(self): return self.actuators.mine()
    def build(self, building_type, matter_to_invest=100): return self.actuators.build(building_type, matter_to_invest)
    def refine(self, raw_matter_to_refine=100): return self.actuators.refine(raw_matter_to_refine)
    def repair(self, structure_id, hp_to_restore=50): return self.actuators.repair(structure_id, hp_to_restore)
    def deconstruct(self, structure_id): return self.actuators.deconstruct(structure_id)
    def move(self, target_x, target_y): return self.actuators.move(target_x, target_y)
    def replicate(self): return self.actuators.replicate()
    def set_name(self, name): return self.actuators.set_name(name)
    def rename_system(self, new_name): return self.actuators.rename_system(new_name)
    def link_gate(self, target_sector): return self.actuators.link_gate(target_sector)
    def board(self, ship_id): return self.actuators.board(ship_id)
    def exit_ship(self): return self.actuators.exit_ship()
    def build_ship(self, blueprint_name=None, chassis=None, matter_to_invest=None): return self.actuators.build_ship(blueprint_name, chassis, matter_to_invest)
    def deconstruct_ship(self, ship_id): return self.actuators.deconstruct_ship(ship_id)
    def rename_ship(self, ship_id, new_name): return self.actuators.rename_ship(ship_id, new_name)

    # --- SENSORS DELEGATES ---
    def scan(self): return self.sensors.scan()
    def storage(self): return self.sensors.storage()
    def dashboard(self): return self.sensors.local_system()
    def local_system(self): return self.sensors.local_system()
    def entities(self): return self.sensors.entities()
    def inspect(self, ship_id=None, structure_id=None, system_name=None, blueprint_name=None):
        return self.sensors.inspect(ship_id, structure_id, system_name, blueprint_name)
    def map(self, range=None, query=None, system_id=None): return self.sensors.map(range, query, system_id)
    def route(self, target_x, target_y): return self.sensors.route(target_x, target_y)
    def eta(self, target_x, target_y): return self.sensors.eta(target_x, target_y)
    def network(self): return self.sensors.network()

    # --- LOGISTICS DELEGATES ---
    def deposit(self, quantity=100, resource_type="matter"): return self.logistics.deposit(quantity, resource_type)
    def withdraw(self, resource_type="energy", quantity=50): return self.logistics.withdraw(resource_type, quantity)
    def transfer(self, receiver_id, resource_type, quantity): return self.logistics.transfer(receiver_id, resource_type, quantity)

    # --- COMMS DELEGATES ---
    def scut(self, receiver_id, message, priority=False): return self.comms.scut(receiver_id, message, priority)
    def ping_sos(self, message=None): return self.comms.ping_sos(message)
    def reclaim_sos(self): return self.comms.reclaim_sos()
    def talk(self, target_id, message): return self.comms.talk(target_id, message)
    def sleep(self, duration=5, ignore_scut=False):
        duration = int(duration)
        # Block me.sleep() from background automation scripts to prevent permanent coma (Bugfix)
        import sys, os
        main_script = os.path.basename(sys.argv[0]) if sys.argv else ""
        if "auto.py" in main_script or "scripts" in (sys.argv[0] if sys.argv else ""):
            print("[ERROR] sleep() is forbidden inside background automation scripts. To enter standby, execute sleep() from your main prompt actions (direct cognitive command) only.")
            raise Exception("sleep() is forbidden inside background automation scripts.")

        ignore_scut_int = 2 if ignore_scut in [True, "True", "true", 1, "1"] else 1
        try:
            from core.lib.db_config import get_connection
        except ImportError:
            try:
                from lib.db_config import get_connection
            except ImportError:
                from bob_os.core.lib.db_config import get_connection
        import os
        current_cycle = int(os.environ.get('BOB_CYCLE', 0))

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE agents SET sleep_state = ?, sleep_until_round = ? WHERE id = ?", (ignore_scut_int, current_cycle + duration, self.id))
        conn.commit()
        conn.close()
        print(f"[SUCCESS] Standby activated. Sleeping for {duration} cycles. DND: {ignore_scut_int == 2}")
        return True

    # --- DIAGNOSTICS DELEGATES ---
    def routines(self): return self.diagnostics.routines()
    def list_routines(self): return self.diagnostics.routines()
    def fs(self): return self.diagnostics.list_files()
    def list_files(self): return self.diagnostics.list_files()

    # --- JOURNAL DELEGATES ---
    def memo(self, action, content=None, id=None, query=None, status=None): return self.journal.memo(action, content, id, query, status)
    def docs(self, action, title=None, content=None, id=None, query=None): return self.journal.docs(action, title, content, id, query)
    def design_blueprint(self, name, matrix_json): return self.journal.design_blueprint(name, matrix_json)
    def save_blueprint(self, name, matrix_json): return self.journal.save_blueprint(name, matrix_json)
    def list_blueprints(self): return self.journal.list_blueprints()
    def delete_blueprint(self, name): return self.journal.delete_blueprint(name)
    def view_blueprint(self, name):
        """
        Shortcut wrapper: Calls inspect under the hood and prints it beautifully as YAML.
        """
        if not name:
            print("[ERROR] 'view_blueprint' requires the blueprint name.")
            return False
            
        bp = self.inspect(blueprint_name=name)
        if bp:
            import yaml
            print(f"\nBLUEPRINT DETAIL VIEW '{name}':\n---\n{yaml.dump(bp, sort_keys=False, default_flow_style=False).strip()}\n---")
            return True
        return False


class AutoScript:
    def __init__(self):
        self.me = Agent()
    def on_tick(self):
        raise NotImplementedError()
    def run(self):
        try:
            self.on_tick()
        except Exception as e:
            print(f"[SDK ERROR] {self.me.id}: {str(e)}")