from .system_service import get_system_or_fail
from .agent_service import get_agent_or_fail, update_agent_resources

def pay_pipeline_costs(cursor, agent_id, system_name, energy_cost, matter_cost, matter_type="raw_matter"):
    """
    Encapsulates resource checking and resource deduction from the combined
    pool of Agent (Inventory) and System (Depot).
    Returns a dict with the deducted amounts, or False on failure.
    """
    agent = get_agent_or_fail(cursor, agent_id)
    system = get_system_or_fail(cursor, system_name)
    if not agent or not system:
        return False
        
    mat_col_inv = "refined_matter_inventory" if matter_type == "refined_matter" else "raw_matter_inventory"
    mat_col_depot = "refined_matter_depot" if matter_type == "refined_matter" else "raw_matter_depot"
    
    available_depot_matter = system[mat_col_depot]
    available_inventory_matter = agent[mat_col_inv]
    total_available_m = available_depot_matter + available_inventory_matter

    if total_available_m < matter_cost:
        print(f"[ERROR] Not enough {matter_type} available. Need {matter_cost}, have {available_inventory_matter} in inventory and {available_depot_matter} in depot.")
        return False

    available_depot_energy = system['energy_depot']
    available_inventory_energy = agent['energy_inventory']
    total_available_e = available_depot_energy + available_inventory_energy
    
    if total_available_e < energy_cost:
        print(f"[ERROR] Not enough energy. Need {energy_cost}E, have {available_inventory_energy}E in battery and {available_depot_energy}E in depot.")
        return False

    matter_from_depot = min(matter_cost, available_depot_matter)
    matter_from_inventory = matter_cost - matter_from_depot
    
    energy_from_depot = min(energy_cost, available_depot_energy)
    energy_from_inventory = energy_cost - energy_from_depot

    # Deduct matter and energy via the unified update_agent_resources service (Pillar 1)
    if energy_from_inventory > 0 or matter_from_inventory > 0:
        if matter_type == "refined_matter":
            update_agent_resources(cursor, agent_id, refined_matter=-matter_from_inventory, energy=-energy_from_inventory)
        else:
            update_agent_resources(cursor, agent_id, raw_matter=-matter_from_inventory, energy=-energy_from_inventory)

    if energy_from_depot > 0:
        cursor.execute("UPDATE systems SET energy_depot = energy_depot - ? WHERE name = ?", (energy_from_depot, system_name))
        
    if matter_from_depot > 0:
        cursor.execute(f"UPDATE systems SET {mat_col_depot} = {mat_col_depot} - ? WHERE name = ?", (matter_from_depot, system_name))
        
    return {
        "matter_from_depot": matter_from_depot,
        "matter_from_inventory": matter_from_inventory,
        "energy_from_depot": energy_from_depot,
        "energy_from_inventory": energy_from_inventory
    }