import os
import sys
import json
import yaml

try:
    from .. import agent_service
    from .. import config_service
    from .. import physics_service
except ImportError:
    from core.lib import agent_service
    from core.lib import config_service
    from core.lib import physics_service

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
            print(f"[FEHLER] Blueprint-Planung fehlgeschlagen: {stats['error']}")
            return False
            
        yaml_stats = yaml.dump({"blueprint_specs": stats}, sort_keys=False, default_flow_style=False).strip()
        print(f"[SUCCESS] Blueprint '{name}' successfully simulated/planned (NOT SAVED)!")
        print(f"\nERRECHNETE HARDWARE-SPEZIFIKATIONEN:\n---\n{yaml_stats}\n---")
        print(f"[HINWEIS]: Dieser Befehl dient rein der risikofreien Simulation. Um diesen Entwurf dauerhaft im Sektor-Wiki zu speichern, führe 'me.save_blueprint(name, matrix)' aus!")
        return True

    @agent_service.with_agent_context(allow_disembodied=True)
    def save_blueprint(self, cursor, agent, name, matrix_json):
        if not name or not matrix_json:
            print("[FEHLER] 'save_blueprint' erfordert einen 'name' und ein 'matrix_json' Layout.")
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
            print(f"[FEHLER] Blueprint-Speicherung fehlgeschlagen: {stats['error']}")
            return False
            
        cursor.execute("""
            INSERT OR REPLACE INTO blueprints (name, author_id, matrix_json, stats_json)
            VALUES (?, ?, ?, ?)
        """, (name, self.agent.id, json.dumps(matrix), json.dumps(stats)))
        
        yaml_stats = yaml.dump({"blueprint_specs": stats}, sort_keys=False, default_flow_style=False).strip()
        print(f"[SUCCESS] Blueprint '{name}' successfully saved to sector database!")
        print(f"\nERRECHNETE HARDWARE-SPEZIFIKATIONEN:\n---\n{yaml_stats}\n---")
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