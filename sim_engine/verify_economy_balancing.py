import json
import os
import sys
import math

def load_rules():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rules_path = os.path.join(base_dir, 'bob_os', 'core', 'lib', 'ECONOMY_RULES.json')
    if not os.path.exists(rules_path):
        print(f"❌ Error: ECONOMY_RULES.json not found at {rules_path}")
        sys.exit(1)
    with open(rules_path, 'r') as f:
        return json.load(f)

def run_balance_check():
    print("==========================================")
    print("   BOB-OS ECONOMY BALANCING SIMULATOR    ")
    print("==========================================")
    
    rules = load_rules()
    errors = []
    warnings = []

    # 1. READ RULES SEGMENTS
    agent_limits = rules.get('agent_limits', {})
    tool_costs = rules.get('tool_costs', {})
    infra = rules.get('infrastructure', {})
    ship_phys = rules.get('ship_physics', {})
    global_set = rules.get('global_settings', {})
    ship_constants = global_set.get('ship_constants', {})
    
    # Starting/default depot limits
    default_depot_limit = global_set.get('default_sector_depot_capacity', 5000)
    default_agent_matter_limit = agent_limits.get('matter', 500)
    default_core_resources = global_set.get('default_sector_core_resources', 50000)

    print(f"🔄 Geladene API-Version: {rules.get('api_version', 'v10.5')}")
    print(f"📦 Standard Sektor-Depot Kapazität: {default_depot_limit} RM/Raw")
    print(f"🧠 Standard Disembodied Agent Kapazität: {default_agent_matter_limit} RM/Raw")
    print(f"🎨 Standard Sektor-Kern-Ressourcen (Menge): {default_core_resources} Raw")
    
    # -------------------------------------------------------------
    # 📊 CHECK 1: STORAGE VS COST DEADLOCK CHECK
    # -------------------------------------------------------------
    print("\n[CHECK 1] Storage vs. Construction Cost Deadlocks...")
    
    # Calculate the total material cost of a basic self-sustaining starting colony
    # (1 of each structure in infrastructure to unlock all systems, plus a basic fleet of 1 Scout + 2 Miners)
    total_infra_cost = sum(specs['matter_cost'] for specs in infra.values())
    basic_fleet_cost = 1750 + 2 * 2400 # 1 Scout (1750) + 2 Miners (2400) = 6550
    total_starting_cost = total_infra_cost + basic_fleet_cost
    
    print(f"  - Gesamtkosten Basis-Kolonisation (Gebäude + Flotte): {total_starting_cost} RM/Raw")
    
    if default_core_resources < total_starting_cost * 2.0:
        errors.append(f"DEADLOCK: Sektor-Kern-Ressourcen ({default_core_resources}) sind zu gering! Replikanten verbrauchen den Sektor ({total_starting_cost} RM benötigt x2.0 Sicherheits-Faktor = {total_starting_cost*2}) komplett, bevor eine stabile Kolonisation erreicht ist!")
    else:
        print(f"  ✅ Sektor-Kern-Ressourcen ({default_core_resources}) ausreichend für {round(default_core_resources/total_starting_cost, 1)}x vollständige Sektor-Kolonisationen (Sicherheits-Puffer optimal).")

    # 1. Kann man die ersten Silos bauen?
    if 'matter_silo' in infra:
        silo_cost = infra['matter_silo']['matter_cost']
        silo_req = infra['matter_silo']['required_material']
        
        if silo_req == 'raw_matter' and silo_cost > default_depot_limit:
            errors.append(f"DEADLOCK: matter_silo kostet {silo_cost} raw_matter, übersteigt aber das Anfangs-Depot von {default_depot_limit}!")
            
    # 2. Kann man die matter_refinery bauen (benötigt für alle refined_matter Gebäude!)?
    if 'matter_refinery' in infra:
        ref_cost = infra['matter_refinery']['matter_cost']
        ref_req = infra['matter_refinery']['required_material']
        
        if ref_req == 'raw_matter' and ref_cost > default_depot_limit:
            errors.append(f"DEADLOCK: matter_refinery kostet {ref_cost} raw_matter, übersteigt aber das Anfangs-Depot von {default_depot_limit}! Veredelung für immer unmöglich.")

    # 3. Können die refined_matter Gebäude jemals gebaut werden?
    for name, specs in infra.items():
        cost = specs['matter_cost']
        req = specs['required_material']
        
        # Wenn es refined_matter kostet, muss die maximale Kapazität von refined_matter im Depot (nach Silo-Upgrades) 
        # oder im standard Depot ausreichen, um das Gebäude zu bezahlen!
        if req == 'refined_matter':
            # Ein standard-Silo erhöht das Depot-Volumen, aber wir prüfen, ob die standard Depot-Obergrenze ausreicht
            if cost > default_depot_limit:
                warnings.append(f"WARNUNG: Veredeltes Gebäude '{name}' kostet {cost} refined_matter. Übersteigt das Standard-Depot von {default_depot_limit}. Silos zwingend vorab nötig!")

    # -------------------------------------------------------------
    # 🔋 CHECK 2: ENERGY LOOP & MAINTENANCE SUSTAINABILITY
    # -------------------------------------------------------------
    print("\n[CHECK 2] Energy Loop & Sustainability Analysen...")
    
    # Solar-Kollektor muss mehr Energie erzeugen als seine eigene Instandhaltung kostet
    if 'solar_collector' in infra:
        solar = infra['solar_collector']
        regen = solar.get('energy_regen_bonus', 0)
        drain = solar.get('maintenance_energy_cost', 0)
        
        netto = regen - drain
        if netto <= 0:
            errors.append(f"DEADLOCK: solar_collector Generierungs-Fehler! Regen (+{regen}E) <= Instandhaltung (-{drain}E).")
        else:
            print(f"  ✅ solar_collector Netto-Ertrag: +{netto}E pro Runde.")

    # -------------------------------------------------------------
    # ⚗ CHECK 3: CONVERSION RATIOS (Refining)
    # -------------------------------------------------------------
    print("\n[CHECK 3] Veredelungs-Effizienz (Refining Ratios)...")
    
    if 'refine' in tool_costs:
        ref = tool_costs['refine']
        raw_cost = ref.get('raw_matter_cost', 100)
        yield_mat = ref.get('refined_yield', 100)
        energy_cost = ref.get('energy_cost', 50)
        
        if raw_cost <= 0 or yield_mat <= 0:
            errors.append("DEADLOCK: Ungültiges Veredelungs-Verhältnis (Kosten/Ertrag <= 0).")
        else:
            ratio = yield_mat / float(raw_cost)
            print(f"  Veredelungs-Verhältnis: {raw_cost} Raw -> {yield_mat} Refined (Verhältnis: {ratio*100}%). Energie-Kosten: {energy_cost}E.")
            if ratio > 2.0:
                warnings.append(f"WARNUNG: Extrem hohes Veredelungs-Verhältnis ({ratio*100}%). Exploit-Gefahr!")

    # -------------------------------------------------------------
    # 🛸 CHECK 4: SHIPS PHYSICS COHERENCE (Säule 3)
    # -------------------------------------------------------------
    print("\n[CHECK 4] Physik-Symmetrie der Gitter-Module...")
    
    for name, specs in ship_phys.items():
        cost = specs.get('cost', 0)
        mass = specs.get('mass', 0)
        
        cost_key = next((k for k in specs if k.startswith('cost_per_')), None)
        mass_key = next((k for k in specs if k.startswith('mass_per_')), None)
        
        if cost_key:
            cost = specs[cost_key]
        if mass_key:
            mass = specs[mass_key]
            
        if cost <= 0 and name != 'chassis_tile':
            warnings.append(f"WARNUNG: Modul '{name}' hat keine Baukosten!")
        if mass <= 0:
            warnings.append(f"WARNUNG: Modul '{name}' besitzt keine Trägheits-Masse!")

    # -------------------------------------------------------------
    # ⚖️ CHECK 5: UTILITY-TO-COST RATIO & BALANCING CHECK
    # -------------------------------------------------------------
    print("\n[CHECK 5] Schiffskosten-zu-Gebrauchswert Verhältnismäßigkeit (Calibration)...")
    
    base_mass = ship_constants.get('base_mass', 50)
    base_speed = ship_constants.get('base_speed', 20)
    base_travel_cost = ship_constants.get('base_travel_cost', 0.05)
    mass_efficiency_divisor = ship_constants.get('mass_efficiency_divisor', 1000)
    shipyard_rate = ship_constants.get('shipyard_rate', 250)

    # Simuliere repräsentative Standard-Klassen zur Verhältnis-Prüfung
    # A. Scout (1x logic_core, 1x engine, 1x battery)
    # B. Miner (1x logic_core, 1x engine, 1x drill, 1x cargo)
    # C. Heavy Miner (1x logic_core, 2x engine, 2x drill, 2x cargo)
    
    classes = {
        "Scout": [("logic_core", 1), ("engine", 1, "thrust", 500), ("battery", 1, "energy", 5000)],
        "Miner": [("logic_core", 1), ("engine", 1, "thrust", 500), ("drill", 1), ("cargo", 1, "volume", 5000)],
        "Heavy Miner": [("logic_core", 1), ("engine", 2, "thrust", 1000), ("drill", 2), ("cargo", 2, "volume", 10000)]
    }

    efficiencies = {}
    for class_name, components in classes.items():
        # Berechne Masse & Kosten analog zu physics_service.py (völlig code-unabhängig!)
        num_tiles = sum(count for c in components for count in [c[1]]) + 1 # +1 for center/chassis
        total_mass = base_mass + num_tiles * ship_phys['chassis_tile']['mass']
        total_cost = num_tiles * ship_phys['chassis_tile']['cost']
        
        has_drill = False
        has_fab = False
        has_logic_core = False
        cargo_capacity = 0
        battery_capacity = 0
        thrust = 0
        
        for comp in components:
            c_type = comp[0]
            count = comp[1]
            c_rule = ship_phys[c_type]
            
            if 'mass' in c_rule and 'cost' in c_rule:
                total_mass += c_rule['mass'] * count
                total_cost += c_rule['cost'] * count
                if c_type == 'drill': has_drill = True
                if c_type == 'fabricator': has_fab = True
                if c_type == 'logic_core': has_logic_core = True
                continue
                
            # Skalierbare Module
            val_key = comp[2]
            val = comp[3] * count
            max_per_tile = c_rule[f"max_{val_key}_per_tile"]
            
            total_mass += val * c_rule.get(f'mass_per_{val_key}', 0)
            total_cost += val * c_rule.get(f'cost_per_{val_key}', 0)
            
            if c_type == 'engine': thrust = val
            if c_type == 'cargo': cargo_capacity = val
            if c_type == 'battery': battery_capacity = val

        # Reale Reise-Stats
        speed = round((thrust / float(total_mass)) * base_speed, 2) if thrust > 0 else 0
        build_time = math.ceil(total_cost / float(shipyard_rate))
        
        # UTILITY SCORE BERECHNUNG
        u_mining = (1000 if has_drill else 0) * (cargo_capacity / 1000.0)
        u_logistics = (speed / 10.0) * (battery_capacity / 1000.0)
        u_autonomy = 1000 if has_logic_core else 0
        
        total_utility = u_mining + u_logistics + u_autonomy
        efficiency = round(total_utility / float(total_cost), 4) if total_cost > 0 else 0
        efficiencies[class_name] = (total_utility, total_cost, efficiency)
        
        print(f"  - {class_name:12} :: Utility: {total_utility:6.1f} | Cost: {total_cost:4} RM | Efficiency: {efficiency:6.4f} | Bauzeit: {build_time} Runden")
        
        if build_time > 50:
            errors.append(f"DEADLOCK: Bauzeit für '{class_name}' beträgt unzumutbare {build_time} Runden! Passe shipyard_rate an.")

    # Prüfe Verhältnismäßigkeit: Ist der Heavy Miner unschlagbar viel effizienter als der standard Miner?
    miner_eff = efficiencies["Miner"][2]
    heavy_eff = efficiencies["Heavy Miner"][2]
    
    if heavy_eff > miner_eff * 3.0:
        errors.append(f"UNBALANCED: Heavy Miner ist {round(heavy_eff/miner_eff, 1)}x effizienter als der standard Miner! Erdrückt standard Schiffsauswahlen.")

    # -------------------------------------------------------------
    # 🏆 BALANCING ZUSAMMENFASSUNG
    # -------------------------------------------------------------
    print("\n==========================================")
    print("   BALANCING-REPORT ZUSAMMENFASSUNG       ")
    print("==========================================")
    
    if warnings:
        print(f"⚠️  {len(warnings)} Warnungen identifiziert:")
        for w in warnings:
            print(f"   - {w}")
    else:
        print("  ✅ Keine Warnungen. Wirtschaft extrem harmonisch.")
        
    if errors:
        print(f"❌ {len(errors)} KRITISCHE BALANCING-FEHLER GEFUNDEN:")
        for e in errors:
            print(f"   - {e}")
        print("\nBalancing FAILED. Bitte korrigiere die ECONOMY_RULES.json!")
        sys.exit(1)
    else:
        print("\n🎉 BALANCING ERFOLGREICH! Keine kritischen Deadlocks oder Loops gefunden.")
        sys.exit(0)

if __name__ == '__main__':
    run_balance_check()
