from .system_service import get_system_or_fail
from .agent_service import get_agent_or_fail

def pay_pipeline_costs(cursor, agent_id, system_name, energy_cost, matter_cost, matter_type="raw_matter"):
    """
    Kapselt die Ressourcen-Überprüfung und den Ressourcen-Abzug aus dem kombinierten
    Pool von Agent (Inventory) und System (Depot).
    Gibt ein Dict mit den abgezogenen Beträgen zurück, oder False bei Fehlschlag.
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

    if energy_from_inventory > 0:
        cursor.execute("UPDATE agents SET energy_inventory = energy_inventory - ? WHERE id = ?", (energy_from_inventory, agent_id))
    if energy_from_depot > 0:
        cursor.execute("UPDATE systems SET energy_depot = energy_depot - ? WHERE name = ?", (energy_from_depot, system_name))
        
    if matter_from_inventory > 0:
        cursor.execute(f"UPDATE agents SET {mat_col_inv} = {mat_col_inv} - ? WHERE id = ?", (matter_from_inventory, agent_id))
    if matter_from_depot > 0:
        cursor.execute(f"UPDATE systems SET {mat_col_depot} = {mat_col_depot} - ? WHERE name = ?", (matter_from_depot, system_name))
        
    return {
        "matter_from_depot": matter_from_depot,
        "matter_from_inventory": matter_from_inventory,
        "energy_from_depot": energy_from_depot,
        "energy_from_inventory": energy_from_inventory
    }
