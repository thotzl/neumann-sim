import os
import sys

try:
    from .. import agent_service
    from .. import system_service
    from ..utils.formatting import get_display_name_with_id
except ImportError:
    from core.lib import agent_service
    from core.lib import system_service
    from core.lib.utils.formatting import get_display_name_with_id

class Logistics:
    def __init__(self, agent): self.agent = agent

    @agent_service.with_agent_context(require_active=False)
    def deposit(self, cursor, agent, quantity=100, resource_type="matter"):
        system = system_service.get_system_or_fail(cursor, agent['location'])
        if not system:
            print("[ERROR] Cannot deposit resources while in deep interstellar space.")
            return False
        
        quantity = int(quantity)
        if resource_type in ["matter", "raw_matter"]:
            if agent['raw_matter_inventory'] < quantity:
                print(f"[ERROR] Not enough matter in inventory ({agent['raw_matter_inventory']} < {quantity}).")
                return False
            space_left = system['depot_matter_capacity'] - system['raw_matter_depot']
            if space_left <= 0:
                print(f"[ERROR] System depot is full ({system['raw_matter_depot']}/{system['depot_matter_capacity']}).")
                return False
            
            amount_to_deposit = min(quantity, space_left)
            agent_service.consume_resources(cursor, agent['id'], matter=amount_to_deposit)
            cursor.execute("UPDATE systems SET raw_matter_depot = raw_matter_depot + ? WHERE name = ?", (amount_to_deposit, agent['location']))
            print(f"[SUCCESS] {amount_to_deposit} matter deposited.")
            return True
            
        elif resource_type == "energy":
            if agent['energy_inventory'] < quantity:
                print(f"[ERROR] Not enough energy in inventory ({agent['energy_inventory']} < {quantity}).")
                return False
            space_left = system['depot_energy_capacity'] - system['energy_depot']
            if space_left <= 0:
                print(f"[ERROR] Energy depot is full ({system['energy_depot']}/{system['depot_energy_capacity']}).")
                return False
                
            amount_to_deposit = min(quantity, space_left)
            agent_service.consume_resources(cursor, agent['id'], energy=amount_to_deposit)
            cursor.execute("UPDATE systems SET energy_depot = energy_depot + ? WHERE name = ?", (amount_to_deposit, agent['location']))
            print(f"[SUCCESS] {amount_to_deposit} energy deposited.")
            return True
            
        elif resource_type == "refined_matter":
            if agent['refined_matter_inventory'] < quantity:
                print(f"[ERROR] Not enough refined matter in inventory ({agent['refined_matter_inventory']} < {quantity}).")
                return False
            # We assume that refined_matter can be stored indefinitely or with the same cap as matter. 
            # For simplicity: no hard cap for refined matter for now, unless strictness is desired. (Pillar 1)
            agent_service.update_agent_resources(cursor, self.agent.id, refined_matter=-quantity)
            cursor.execute("UPDATE systems SET refined_matter_depot = refined_matter_depot + ? WHERE name = ?", (quantity, agent['location']))
            print(f"[SUCCESS] {quantity} refined_matter deposited.")
            return True
            
        else:
            print(f"[ERROR] Unknown resource: {resource_type}")
            return False

    @agent_service.with_agent_context(require_active=False)
    def withdraw(self, cursor, agent, resource_type="energy", quantity=50):
        system = system_service.get_system_or_fail(cursor, agent['location'])
        if not system:
            print("[ERROR] Cannot withdraw resources while in deep interstellar space.")
            return False
        
        quantity = int(quantity)
        
        if resource_type == 'energy':
            avail = system['energy_depot']
        elif resource_type in ['matter', 'raw_matter']:
            avail = system['raw_matter_depot']
        elif resource_type == 'refined_matter':
            avail = system['refined_matter_depot']
        else:
            print(f"[ERROR] Unknown resource: {resource_type}")
            return False

        if avail <= 0:
            print(f"[ERROR] System depot is empty for {resource_type}.")
            return False
            
        amount_to_withdraw = min(quantity, avail)
        
        if resource_type == 'energy':
            space_left = agent['energy_capacity'] - agent['energy_inventory']
            if space_left <= 0:
                print(f"[ERROR] Your battery is full ({agent['energy_inventory']}/{agent['energy_capacity']}).")
                return False
            actual_withdraw = min(amount_to_withdraw, space_left)
            
            agent_service.update_agent_resources(cursor, self.agent.id, energy=actual_withdraw)
            cursor.execute("UPDATE systems SET energy_depot = energy_depot - ? WHERE name = ?", (actual_withdraw, agent['location']))
            print(f"[SUCCESS] {actual_withdraw} energy withdrawn.")
            return True
        elif resource_type in ['matter', 'raw_matter']:
            current_total = agent['raw_matter_inventory'] + agent['refined_matter_inventory']
            space_left = agent['matter_storage_capacity'] - current_total
            if space_left <= 0:
                print(f"[ERROR] Your storage is full ({current_total}/{agent['matter_storage_capacity']}).")
                return False
            actual_withdraw = min(amount_to_withdraw, space_left)
            
            agent_service.update_agent_resources(cursor, self.agent.id, raw_matter=actual_withdraw)
            cursor.execute("UPDATE systems SET raw_matter_depot = raw_matter_depot - ? WHERE name = ?", (actual_withdraw, agent['location']))
            print(f"[SUCCESS] {actual_withdraw} matter withdrawn.")
            return True
        elif resource_type == 'refined_matter':
            current_total = agent['raw_matter_inventory'] + agent['refined_matter_inventory']
            space_left = agent['matter_storage_capacity'] - current_total
            if space_left <= 0:
                print(f"[ERROR] Your storage is full ({current_total}/{agent['matter_storage_capacity']}).")
                return False
            actual_withdraw = min(amount_to_withdraw, space_left)
            
            agent_service.update_agent_resources(cursor, self.agent.id, refined_matter=actual_withdraw)
            cursor.execute("UPDATE systems SET refined_matter_depot = refined_matter_depot - ? WHERE name = ?", (actual_withdraw, agent['location']))
            print(f"[SUCCESS] {actual_withdraw} refined_matter withdrawn.")
            return True

    @agent_service.with_agent_context(allow_disembodied=True)
    def transfer(self, cursor, agent, receiver_id, resource_type, quantity):
        target = agent_service.get_agent_or_fail(cursor, receiver_id)
        if not target or agent['location'] != target['location']: return False
        quantity = int(quantity)
        
        if resource_type == 'energy':
            if agent['energy_inventory'] < quantity: return False
            agent_service.update_agent_resources(cursor, self.agent.id, energy=-quantity)
            agent_service.update_agent_resources(cursor, receiver_id, energy=quantity)
        elif resource_type in ['matter', 'raw_matter']:
            if agent['raw_matter_inventory'] < quantity: return False
            agent_service.update_agent_resources(cursor, self.agent.id, raw_matter=-quantity)
            agent_service.update_agent_resources(cursor, receiver_id, raw_matter=quantity)
        elif resource_type == 'refined_matter':
            if agent['refined_matter_inventory'] < quantity: return False
            agent_service.update_agent_resources(cursor, self.agent.id, refined_matter=-quantity)
            agent_service.update_agent_resources(cursor, receiver_id, refined_matter=quantity)
        else:
            print(f"[ERROR] Unknown resource for transfer: {resource_type}")
            return False
            
        print(f"[SUCCESS] {quantity} {resource_type} transferred to {get_display_name_with_id(target)}.")
        return True