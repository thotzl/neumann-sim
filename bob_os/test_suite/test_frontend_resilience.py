import os
import json
import time

# Testet die Resilienz des Frontends gegen korrupte Daten und Standortwechsel (v3.0)

def write_state(data, path='experiments/v48/_verse/world_state.json'):
    tmp_path = path + ".tmp"
    with open(tmp_path, 'w') as f:
        json.dump(data, f, indent=2)
    os.rename(tmp_path, path)
    print(f"State written to {path}")

base_state = {
    "tick": 42,
    "total_turns": 100,
    "last_agent": "Instance-1",
    "timestamp": int(time.time()),
    "systems": [
        {"name": "SYS-X0-Y0", "display_name": "Home", "x": 0, "y": 0, "extractable_matter_in_core": 5000, "energy_rate": 10, "infra": []}
    ],
    "agents": [
        {"id": "Instance-1", "chosen_name": "Pioneer", "location": "SYS-X0-Y0", "raw_matter_inventory": 50, "energy_inventory": 120, "matter_storage_capacity": 100, "status": "active", "last_manifestation": "Stable state."}
    ],
    "events": []
}

# 1. Normal Update
s1 = base_state.copy()
s1["tick"] = 43
s1["agents"][0]["raw_matter_inventory"] = 80
s1["agents"][0]["energy_inventory"] = 110
s1["agents"][0]["last_manifestation"] = "Mining successful."

# 2. Corrupt JSON (Trigger SyntaxError in Frontend)
def write_corrupt(path='experiments/v48/_verse/world_state.json'):
    with open(path, 'w') as f:
        f.write("{ 'corrupt': true, }") # Invalid JSON
    print("Corrupt JSON written.")

# 3. System Discovery & Movement (v3.0 coordinates)
s2 = base_state.copy()
s2["tick"] = 44
s2["systems"].append({"name": "SYS-X500Y500", "display_name": "New World", "x": 500, "y": 500, "extractable_matter_in_core": 3000, "energy_rate": 5, "infra": []})
s2["agents"][0]["location"] = "SYS-X500Y500"
s2["agents"][0]["last_manifestation"] = "Traveling to New World."

if __name__ == "__main__":
    # Wir nutzen v48 als Test-Hub, da es im Produktiv-Prompt referenziert wird
    os.makedirs('experiments/v48/_verse', exist_ok=True)
    
    print("Step 1: Normal Update")
    write_state(s1)
    time.sleep(1)
    
    print("Step 2: Corrupt JSON")
    write_corrupt()
    time.sleep(1)
    
    print("Step 3: Recovery & Movement")
    write_state(s2)
    time.sleep(1)
    
    print("Test sequence finished.")
