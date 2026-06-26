import os
import json

# Funktion, um den Status des Systems abzurufen
def get_system_status():
    status_output = os.popen("python3 tools/dashboard.py").read()
    try:
        status_json = json.loads(status_output.split('-> ')[1])
        return status_json
    except json.JSONDecodeError:
        print(f"Fehler beim Parsen des JSON-Status: {status_output}")
        return None

# Hauptlogik des Skripts
status = get_system_status()
if status:
    alpha_centauri_status = next((s for s in status['systems'] if s['name'] == 'Alpha_Centauri'), None)
    if alpha_centauri_status:
        matter_stored = alpha_centauri_status['matter_stored']
        matter_cap = alpha_centauri_status['matter_cap']

        if matter_stored < matter_cap:
            print("[Bob-8] Materie-Depot hat Platz. Beginne mit Abbau und Einzahlung.")
            os.system("python3 tools/mine.py Bob-8")
            os.system("python3 tools/deposit.py Bob-8 silo matter 100")
        else:
            print(f"[Bob-8] Materie-Depot voll ({matter_stored}/{matter_cap}). Warte auf Platz.")
    else:
        print("[Bob-8] Alpha_Centauri Status nicht gefunden.")
else:
    print("[Bob-8] Systemstatus konnte nicht abgerufen werden.")