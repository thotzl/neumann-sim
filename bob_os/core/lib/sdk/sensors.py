import os
import sys
import json
import sqlite3
import random

try:
    from .. import agent_service
    from .. import system_service
    from .. import config_service
    from .. import physics_service
    from ..utils.formatting import get_display_name, aggregate_ship_telemetry
except ImportError:
    from core.lib import agent_service
    from core.lib import system_service
    from core.lib import config_service
    from core.lib import physics_service
    from core.lib.utils.formatting import get_display_name, aggregate_ship_telemetry

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
            core_val = random.randint(50000, 500000)
            cursor.execute("""
                INSERT INTO systems 
                (name, x, y, extractable_matter_in_core, max_extractable_matter) 
                VALUES (?, ?, ?, ?, ?)
            """, (sys_id, snap_x, snap_y, core_val, core_val))
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
    def inspect(self, cursor, agent, ship_id=None, structure_id=None, system_name=None, blueprint_name=None):
        rules = config_service.get_economy_rules()
        
        # 1. Target A: Ship Inspection (Gitter, Inventare, Capabilities, Diagnostics)
        if ship_id is not None:
            cursor.execute("""
                SELECT id, name, chassis, pilot_id, health, max_health,
                       raw_matter_inventory, refined_matter_inventory, energy_inventory,
                       matter_storage_capacity, energy_capacity, max_speed, thrust, mass,
                       blueprint_name, has_drill, has_fabricator, has_logic_core
                FROM ships WHERE id = CAST(? AS INTEGER)
            """, (ship_id,))
            row = cursor.fetchone()
            if not row:
                print(f"[FEHLER] Schiff #{ship_id} nicht gefunden.")
                return False
                
            # Blueprint-Daten für Diagnostics (SSoT) laden
            bp_name = row['blueprint_name'] or row['chassis']
            cursor.execute("SELECT stats_json, matrix_json FROM blueprints WHERE name = ?", (bp_name,))
            bp = cursor.fetchone()
            
            bp_stats = json.loads(bp['stats_json']) if bp else None
            
            # Zentrales Aggregieren (Säule 1 & 3)
            ship_dict = aggregate_ship_telemetry(row, bp_stats)
            
            # Matrix-Layout anheften, falls verknüpft
            if bp:
                ship_dict['matrix'] = json.loads(bp['matrix_json'])
                
            return ship_dict
            
        # 2. Target B: Structure Inspection (HP, Upgrade Progress, Specs)
        elif structure_id is not None:
            cursor.execute("""
                SELECT id, system_name, type, status, progress_matter, required_matter, health, max_health, level, maintenance_cooldown
                FROM infrastructure WHERE id = CAST(? AS INTEGER)
            """, (structure_id,))
            row = cursor.fetchone()
            if not row:
                print(f"[FEHLER] Gebäude #{structure_id} nicht gefunden.")
                return False
                
            infra_dict = dict(row)
            i_type = row['type']
            infra_rules = rules.get('infrastructure', {}).get(i_type, {})
            infra_dict['specifications'] = {
                "maintenance_energy_cost": infra_rules.get('maintenance_energy_cost', 0),
                "energy_capacity_bonus": infra_rules.get('energy_capacity_bonus', 0) * row['level'],
                "matter_capacity_bonus": infra_rules.get('matter_capacity_bonus', 0) * row['level'],
                "energy_regen_bonus": infra_rules.get('energy_regen_bonus', 0) * row['level'],
                "matter_regen_bonus": infra_rules.get('matter_regen_bonus', 0) * row['level']
            }
            return infra_dict
            
        # 3. Target C: Sector Geology & Wiki Spionage
        elif system_name is not None:
            cursor.execute("SELECT name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot FROM systems WHERE name = ?", (system_name,))
            row = cursor.fetchone()
            if not row:
                print(f"[FEHLER] Sektor '{system_name}' nicht kartografiert.")
                return False
                
            sys_dict = dict(row)
            
            if system_name != agent['location']:
                has_sat = system_service.has_active_infrastructure(cursor, agent['location'], ('sat_link', 'comms_relay'))
                if not has_sat:
                    print(f"[DENIED] Spionage fehlgeschlagen. Sektor '{system_name}' ist außer Reichweite. Errichte einen 'sat_link' oder ein 'comms_relay'.")
                    return False
            
            cursor.execute("SELECT id, author_id, title FROM docs WHERE system_name = ? ORDER BY id ASC", (system_name,))
            sys_dict['public_sector_wiki_docs'] = [dict(r) for r in cursor.fetchall()]
            return sys_dict

        # 4. Target D: Blueprint Detail Retrieval (Säule 3)
        elif blueprint_name is not None:
            cursor.execute("SELECT id, name, author_id, matrix_json, stats_json FROM blueprints WHERE name = ?", (blueprint_name,))
            row = cursor.fetchone()
            if not row:
                print(f"[FEHLER] Blueprint '{blueprint_name}' nicht gefunden.")
                return False
            return {
                "id": row["id"],
                "name": row["name"],
                "author_id": row["author_id"],
                "matrix": json.loads(row["matrix_json"]),
                "stats": json.loads(row["stats_json"])
            }
            
        else:
            print("[FEHLER] 'inspect' erfordert 'ship_id', 'structure_id', 'system_name' oder 'blueprint_name'.")
            return False
        
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

        # 2. Lokale Schiffe (Inklusive progress_matter und required_matter für Etappenbau-Dashboard)
        cursor.execute("SELECT id, name, chassis, pilot_id, progress_matter, required_matter, blueprint_name FROM ships WHERE system_name = ?", (sys_name,))
        local_ships_raw = cursor.fetchall()
        
        local_ships = []
        for r in local_ships_raw:
            ship_dict = dict(r)
            if r['pilot_id'] == 'UNDER_CONSTRUCTION':
                bp_name = r['blueprint_name'] or r['chassis'] or 'unclassified'
                # Check blueprint to see material type
                cursor.execute("SELECT stats_json FROM blueprints WHERE name = ?", (bp_name,))
                bp_row = cursor.fetchone()
                material = 'refined_matter' if bp_row else 'raw_matter'
                prog = r['progress_matter'] or 0
                req = r['required_matter'] or 1000
                ship_dict['name'] = f"{r['name']} ({bp_name} Construction: {prog}/{req} {material})"
            local_ships.append(ship_dict)

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
        
        # Name-First Formatierung für lokale andere Instanzen (Säule 1 & 3)
        local_bobs = []
        for r in cursor.fetchall():
            local_bobs.append({
                "name": get_display_name(r),
                "id": r['id'],
                "chosen_name": r['chosen_name'], # Legacy-Alias für 100% Abwärtskompatibilität!
                "status": r['status'],
                "host_type": r['host_type'] if r['host_type'] else "Unknown",
                "host_id": r['host_id'] if r['host_id'] else "Unknown"
            })

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
            
            # 4a. Anonymisierungs-Mapping (SSoT-Muster)
            anonym_map = {
                "MINING": "[SENSORSIGNAL] Geologische Erschütterung: Rohmaterial-Minderwert im Sektor-Kern registriert.",
                "REFINING": "[NETZ-SIGNAL] Industrielle Aktivität: Lokale Raffinerie hat Veredelungsprozess gestartet.",
                "DEPOSIT": "[DEPOT-REGISTRIERUNG] Einzahlung erfasst: Materie/Energie im Sektor-Depot eingebucht.",
                "WITHDRAW": "[DEPOT-REGISTRIERUNG] Abbuchung erfasst: Materie/Energie aus Sektor-Depot entnommen.",
                "TRANSIT_BOARD": "[RADAR-SIGNAL] Cockpit-Kopplung: Ein Pilot hat ein Schiff betreten.",
                "TRANSIT_EXIT": "[RADAR-SIGNAL] Cockpit-Entkopplung: Ein Pilot hat ein Schiff verlassen.",
                "TRANSIT_DEPART": "[RADAR-ECHO] Hyperraum-Austritt: Ein Schiff hat den Sektor verlassen.",
                "TRANSIT_ARRIVE": "[RADAR-ECHO] Hyperraum-Eintritt: Ein Schiff ist im Sektor eingetroffen.",
                "CONSTRUCTION": "[WERFT-PROGNOSE] Trockendock-Aktivität: Ein neues Schiff/Gebäude wurde auf Kiel gelegt.",
                "DECONSTRUCTION": "[ABBAU-MELDUNG] Sektor-Masseänderung: Eine unbemannte Hülle/Station wurde dekonstruiert.",
                "RENAME": "[REGISTRY-UPDATE] Ein Schiff wurde registriert/umbenannt.",
                "MITOSIS": "[SYSTEM-PROTOTYP] Replikations-Mitoseschleife: Neue Instanz initialisiert.",
                "RELIC": "[SEKTOR-ARCHIV] Öffentliches Relikt im Sektor hinterlegt."
            }

            # 4b. Chronologische Aggregation / Kompression zur massiven Token-Ersparnis
            aggregated_list = []
            event_counts = {}  # Key: anonymisierte_description, Value: [count, first_rowid]
            
            for r in event_rows:
                event_type = r['event_type']
                desc = anonym_map.get(event_type, r['description'])
                
                if desc in event_counts:
                    event_counts[desc][0] += 1
                else:
                    event_counts[desc] = [1, r['rowid']]
                    aggregated_list.append(desc)
                    
            for desc in aggregated_list:
                count = event_counts[desc][0]
                rowid = event_counts[desc][1]
                if count == 1:
                    unread_events.append(f"[Event #{rowid}] {desc}")
                else:
                    unread_events.append(f"[Event #{rowid}] ({count}x) {desc}")
            
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
            
            # Name-First Formatierung für entfernte andere Instanzen (Säule 1 & 3)
            distant_bobs = []
            for r in cursor.fetchall():
                distant_bobs.append({
                    "name": get_display_name(r),
                    "id": r['id'],
                    "chosen_name": r['chosen_name'], # Legacy-Alias
                    "location": r['location'],
                    "status": r['status']
                })
        except sqlite3.OperationalError:
            distant_bobs = []

        # 7. Offene Memos/Protokolle (Task 4)
        try:
            cursor.execute("SELECT id, content FROM memos WHERE agent_id = ? AND status = 'open' ORDER BY id ASC", (self.agent.id,))
            memos_list = [f"[Memo #{r['id']}] {r['content']} (Status: open)" for r in cursor.fetchall()]
        except sqlite3.OperationalError:
            memos_list = []

        # Resolve dynamic inventory host and capacity limits (Säule 1 & 3)
        host_type = agent.get('host_type', 'Unknown')
        host_id = agent.get('host_id', 'Unknown')
        storage_capacity = agent['matter_storage_capacity']
        current_inventory_host = "Unknown"

        if host_type == 'ship':
            ship_name = "Unknown"
            cursor.execute("SELECT name FROM ships WHERE id = CAST(? AS INTEGER)", (host_id,))
            s_row = cursor.fetchone()
            if s_row:
                ship_name = s_row['name']
            current_inventory_host = f"ship '{ship_name}' (ID: {host_id})"
        elif host_type == 'matrix':
            # Dynamic override: Match capacity with Sektor Depot limit to prevent inventory overflow paradox!
            storage_capacity = system['depot_matter_capacity']
            current_inventory_host = f"system depot '{system['name']}'"

        # Host-Schiffsdaten vorab sauber laden (Säule 1 & 3: SSoT Telemetrie Aggregation)
        host_dict = {}
        if host_type == 'ship' and host_id:
            cursor.execute("""
                SELECT id, name, chassis, pilot_id, health, max_health,
                       raw_matter_inventory, refined_matter_inventory, energy_inventory,
                       matter_storage_capacity, energy_capacity, max_speed, thrust, mass,
                       blueprint_name, has_drill, has_fabricator, has_logic_core
                FROM ships WHERE id = CAST(? AS INTEGER)
            """, (host_id,))
            r = cursor.fetchone()
            if r:
                # Blueprint-Daten für exakte Diagnostics / Telemetrien laden
                bp_name = r['blueprint_name'] or r['chassis']
                cursor.execute("SELECT stats_json FROM blueprints WHERE name = ?", (bp_name,))
                bp = cursor.fetchone()
                
                bp_stats = json.loads(bp['stats_json']) if bp else None
                
                # SSoT Aggregation (Keine lambdas!)
                host_dict = aggregate_ship_telemetry(r, bp_stats)

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
            "letzte_system_wahrnehmungen": unread_events,
            "dein_status": {
                "id": agent['id'],
                "name": get_display_name(agent),
                "host_type": host_type,
                "host_id": host_id,
                "current_inventory_host": current_inventory_host,
                "inventory": {
                    "raw_matter": agent['raw_matter_inventory'],
                    "refined_matter": agent['refined_matter_inventory'],
                    "energy": agent['energy_inventory']
                },
                "storage_capacity": storage_capacity,
                "status": agent['status'],
                "offene_memos_und_protokolle": memos_list,
                "host": {
                    "type": host_type,
                    "id": host_id,
                    "inventory": {
                        "raw_matter": agent['raw_matter_inventory'],
                        "refined_matter": agent['refined_matter_inventory'],
                        "energy": agent['energy_inventory']
                    },
                    "storage_capacity": storage_capacity,
                    **host_dict
                }
            },
            "radar_entfernter_sektoren": other_systems,
            "radar_entfernter_signaturen": distant_bobs
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
