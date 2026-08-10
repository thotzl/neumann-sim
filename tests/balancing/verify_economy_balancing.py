import json
import os
import sys
import math

def load_rules():
    tests_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_root = os.path.dirname(tests_dir)
    rules_path = os.path.join(project_root, 'src', 'bob_os', 'core', 'lib', 'ECONOMY_RULES.json')
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

    print(f"🔄 Loaded API Version: {rules.get('api_version', 'v10.5')}")
    print(f"📦 Default Sector Depot Capacity: {default_depot_limit} RM/Raw")
    print(f"🧠 Default Disembodied Agent Capacity: {default_agent_matter_limit} RM/Raw")
    print(f"🎨 Default Sector Core Resources (Amount): {default_core_resources} Raw")
    
    # -------------------------------------------------------------
    # 📊 CHECK 1: STORAGE VS COST DEADLOCK CHECK
    # -------------------------------------------------------------
    print("\n[CHECK 1] Storage vs. Construction Cost Deadlocks...")
    
    # Calculate the total material cost of a basic self-sustaining starting colony
    # (1 of each structure in infrastructure to unlock all systems, plus a basic fleet of 1 Scout + 2 Miners)
    total_infra_cost = sum(specs['matter_cost'] for specs in infra.values())
    basic_fleet_cost = 1750 + 2 * 2400 # 1 Scout (1750) + 2 Miners (2400) = 6550
    total_starting_cost = total_infra_cost + basic_fleet_cost
    
    print(f"  - Total Basic Colonization Cost (Buildings + Fleet): {total_starting_cost} RM/Raw")
    
    if default_core_resources < total_starting_cost * 2.0:
        errors.append(f"DEADLOCK: Sector core resources ({default_core_resources}) are too low! Replicants will deplete the sector ({total_starting_cost} RM needed x2.0 safety factor = {total_starting_cost*2}) completely before stable colonization is achieved!")
    else:
        print(f"  ✅ Sector core resources ({default_core_resources}) sufficient for {round(default_core_resources/total_starting_cost, 1)}x complete sector colonizations (optimal safety buffer).")

    # 1. Can the first silos be built?
    if 'matter_silo' in infra:
        silo_cost = infra['matter_silo']['matter_cost']
        silo_req = infra['matter_silo']['required_material']
        
        if silo_req == 'raw_matter' and silo_cost > default_depot_limit:
            errors.append(f"DEADLOCK: matter_silo costs {silo_cost} raw_matter, but exceeds the initial depot capacity of {default_depot_limit}!")
            
    # 2. Can the matter_refinery be built (required for all refined_matter buildings!)?
    if 'matter_refinery' in infra:
        ref_cost = infra['matter_refinery']['matter_cost']
        ref_req = infra['matter_refinery']['required_material']
        
        if ref_req == 'raw_matter' and ref_cost > default_depot_limit:
            errors.append(f"DEADLOCK: matter_refinery costs {ref_cost} raw_matter, but exceeds the initial depot capacity of {default_depot_limit}! Refining forever impossible.")

    # 3. Can refined_matter buildings ever be built?
    for name, specs in infra.items():
        cost = specs['matter_cost']
        req = specs['required_material']
        
        # If it costs refined_matter, the maximum capacity of refined_matter in the depot (after silo upgrades) 
        # or in the standard depot must be sufficient to pay for the building!
        if req == 'refined_matter':
            # A standard silo increases depot volume, but we check if the standard depot limit is sufficient
            if cost > default_depot_limit:
                warnings.append(f"WARNING: Refined building '{name}' costs {cost} refined_matter. Exceeds standard depot capacity of {default_depot_limit}. Silos absolutely necessary beforehand!")

    # -------------------------------------------------------------
    # 🔋 CHECK 2: ENERGY LOOP & MAINTENANCE SUSTAINABILITY
    # -------------------------------------------------------------
    print("\n[CHECK 2] Energy Loop & Sustainability Analyses...")
    
    # Solar collector must generate more energy than its own maintenance costs
    if 'solar_collector' in infra:
        solar = infra['solar_collector']
        regen = solar.get('energy_regen_bonus', 0)
        drain = solar.get('maintenance_energy_cost', 0)
        
        net_gain = regen - drain
        if net_gain <= 0:
            errors.append(f"DEADLOCK: solar_collector generation error! Regen (+{regen}E) <= Maintenance (-{drain}E).")
        else:
            print(f"  ✅ solar_collector Net Gain: +{net_gain}E per round.")

    # -------------------------------------------------------------
    # 🏢 CHECK 2B: ENDGAME SECTOR ENERGY DEFICIT STRESSTEST (Steel-man Fix 3)
    # -------------------------------------------------------------
    print("\n[CHECK 2B] Sektor Energy-Balance Stresstest (Observatory & Casimir)...")
    if 'observatory' in infra:
        obs_cost = infra['observatory'].get('maintenance_energy_cost', 10)
        # Verify if standard solar generator can cover the observatory's standby cost
        solar_net_gain = infra.get('solar_collector', {}).get('energy_regen_bonus', 100) - infra.get('solar_collector', {}).get('maintenance_energy_cost', 0)
        if solar_net_gain < obs_cost:
            errors.append(f"DEADLOCK: Observatory maintenance ({obs_cost}E) is greater than standard solar net gain ({solar_net_gain}E)! Sektors will black out immediately upon constructing an observatory!")
        else:
            print(f"  ✅ Sektor energy budget: Standard solar generator covers observatory standby with net positive: +{solar_net_gain - obs_cost}E.")

    if 'casimir_plant' in infra:
        cas_regen = infra['casimir_plant'].get('energy_regen_bonus', 5000)
        print(f"  ✅ Casimir Plant yields +{cas_regen}E/tick (Provides immense surplus for stargate networks).")

    # -------------------------------------------------------------
    # ⚗ CHECK 3: CONVERSION RATIOS (Refining)
    # -------------------------------------------------------------
    print("\n[CHECK 3] Refining Efficiency (Refining Ratios)...")
    
    if 'refine' in tool_costs:
        ref = tool_costs['refine']
        raw_cost = ref.get('raw_matter_cost', 100)
        yield_mat = ref.get('refined_yield', 100)
        energy_cost = ref.get('energy_cost', 50)
        
        if raw_cost <= 0 or yield_mat <= 0:
            errors.append("DEADLOCK: Invalid refining ratio (Cost/Yield <= 0).")
        else:
            ratio = yield_mat / float(raw_cost)
            print(f"  Refining Ratio: {raw_cost} Raw -> {yield_mat} Refined (Ratio: {ratio*100}%). Energy Cost: {energy_cost}E.")
            if ratio > 2.0:
                warnings.append(f"WARNING: Extremely high refining ratio ({ratio*100}%). Exploit risk!")

    # -------------------------------------------------------------
    # 🛸 CHECK 4: SHIPS PHYSICS COHERENCE (Pillar 3)
    # -------------------------------------------------------------
    print("\n[CHECK 4] Physics Symmetry of Grid Modules...")
    
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
            warnings.append(f"WARNING: Module '{name}' has no construction cost!")
        if mass <= 0:
            warnings.append(f"WARNING: Module '{name}' has no inertial mass!")

    # -------------------------------------------------------------
    # ⚖️ CHECK 5: UTILITY-TO-COST RATIO & BALANCING CHECK
    # -------------------------------------------------------------
    print("\n[CHECK 5] Ship Cost-to-Utility Proportionality (Calibration)...")
    
    base_mass = ship_constants.get('base_mass', 50)
    base_speed = ship_constants.get('base_speed', 20)
    base_travel_cost = ship_constants.get('base_travel_cost', 0.05)
    mass_efficiency_divisor = ship_constants.get('mass_efficiency_divisor', 1000)
    shipyard_rate = ship_constants.get('shipyard_rate', 250)

    # Simulate representative standard classes for ratio checking
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
        # Calculate mass & cost analogous to physics_service.py (completely code-independent!)
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
                
            # Scalable modules
            val_key = comp[2]
            val = comp[3] * count
            max_per_tile = c_rule[f"max_{val_key}_per_tile"]
            
            total_mass += val * c_rule.get(f'mass_per_{val_key}', 0)
            total_cost += val * c_rule.get(f'cost_per_{val_key}', 0)
            
            if c_type == 'engine': thrust = val
            if c_type == 'cargo': cargo_capacity = val
            if c_type == 'battery': battery_capacity = val

        # Actual Travel Stats
        speed = round((thrust / float(total_mass)) * base_speed, 2) if thrust > 0 else 0
        build_time = math.ceil(total_cost / float(shipyard_rate))
        
        # UTILITY SCORE CALCULATION
        u_mining = (1000 if has_drill else 0) * (cargo_capacity / 1000.0)
        u_logistics = (speed / 10.0) * (battery_capacity / 1000.0)
        u_autonomy = 1000 if has_logic_core else 0
        
        total_utility = u_mining + u_logistics + u_autonomy
        efficiency = round(total_utility / float(total_cost), 4) if total_cost > 0 else 0
        efficiencies[class_name] = (total_utility, total_cost, efficiency)
        
        print(f"  - {class_name:12} :: Utility: {total_utility:6.1f} | Cost: {total_cost:4} RM | Efficiency: {efficiency:6.4f} | Build Time: {build_time} Rounds")
        
        if build_time > 50:
            errors.append(f"DEADLOCK: Build time for '{class_name}' is an unreasonable {build_time} rounds! Adjust shipyard_rate.")

    # Check proportionality: Is the Heavy Miner unbeatably more efficient than the standard Miner?
    miner_eff = efficiencies["Miner"][2]
    heavy_eff = efficiencies["Heavy Miner"][2]
    
    if heavy_eff > miner_eff * 3.0:
        errors.append(f"UNBALANCED: Heavy Miner is {round(heavy_eff/miner_eff, 1)}x more efficient than the standard Miner! It overshadows standard ship choices.")

    # -------------------------------------------------------------
    # 🏢 CHECK 6: SHIP VS INFRASTRUCTURE COST RATIO
    # -------------------------------------------------------------
    print("\n[CHECK 6] Ship vs. Planetary Factory Price Proportionality...")
    shipyard_cost = infra.get('shipyard', {}).get('matter_cost', 1800)
    miner_cost = efficiencies["Miner"][1]
    
    if miner_cost > shipyard_cost:
        errors.append(f"UNBALANCED: A modular standard Miner ({miner_cost} RM) is more expensive than a planetary shipyard ({shipyard_cost} RM)! This devalues ships compared to buildings.")
    else:
        print(f"  ✅ Ship-to-Factory proportionality optimal. Standard Miner ({miner_cost} RM) costs {round((miner_cost/shipyard_cost)*100, 1)}% of a shipyard ({shipyard_cost} RM).")

    # -------------------------------------------------------------
    # 🏎️ CHECK 7: EXPRESS GROWTH & LOGISTICS COMPLIANCE (v13.8)
    # -------------------------------------------------------------
    print("\n[CHECK 7] Express Growth and Logistics Limits...")
    mine_yield = tool_costs.get('mine', {}).get('matter_yield', 0)
    agent_matter = agent_limits.get('matter', 0)
    refinery_cost = infra.get('matter_refinery', {}).get('matter_cost', 0)
    mind_forge_cost = infra.get('mind_forge', {}).get('matter_cost', 0)

    if mine_yield != 500:
        errors.append(f"LOGISTICS ERROR: Mine yield is {mine_yield} RM, expected exactly 500 RM for Express Growth!")
    else:
        print(f"  ✅ Mine Yield compliant: {mine_yield} RM (Verdoppelt).")

    if agent_matter != 1000:
        errors.append(f"LOGISTICS ERROR: Replicant cargo capacity is {agent_matter} RM, expected exactly 1000 RM for Express Growth!")
    else:
        print(f"  ✅ Replicant Cargo Limit compliant: {agent_matter} RM (Verdoppelt).")

    if refinery_cost != 750:
        errors.append(f"BALANCE ERROR: matter_refinery cost is {refinery_cost} RM, expected exactly 750 RM (Halbiert)!")
    else:
        print(f"  ✅ Refinery Cost compliant: {refinery_cost} RM.")

    if shipyard_cost != 1300:
        errors.append(f"BALANCE ERROR: shipyard cost is {shipyard_cost} RM, expected exactly 1300 RM!")
    else:
        print(f"  ✅ Shipyard Cost compliant: {shipyard_cost} RM.")

    if mind_forge_cost != 1500:
        errors.append(f"BALANCE ERROR: mind_forge cost is {mind_forge_cost} RM, expected exactly 1500 FM (Halbiert)!")
    else:
        print(f"  ✅ Mind Forge Cost compliant: {mind_forge_cost} FM.")

    # -------------------------------------------------------------
    # 🏆 BALANCING SUMMARY
    # -------------------------------------------------------------
    print("\n==========================================")
    print("   BALANCING REPORT SUMMARY       ")
    print("==========================================")
    
    if warnings:
        print(f"⚠️  {len(warnings)} Warnings identified:")
        for w in warnings:
            print(f"   - {w}")
    else:
        print("  ✅ No warnings. Economy extremely harmonious.")
        
    if errors:
        print(f"❌ {len(errors)} CRITICAL BALANCING ERRORS FOUND:")
        for e in errors:
            print(f"   - {e}")
        print("\nBalancing FAILED. Please correct ECONOMY_RULES.json!")
        sys.exit(1)
    else:
        print("\n🎉 BALANCING SUCCESSFUL! No critical deadlocks or loops found.")
        sys.exit(0)

if __name__ == '__main__':
    run_balance_check()