import os
    import json
    import time

    AGENT_ID = "Bob-12"
    TARGET_SYSTEM = "System_C"

    def run_command(command):
        print(f"[{AGENT_ID}] Running: {command}")
        os.system(command)

    def get_system_status(system_name):
        query = f"SELECT * FROM systems WHERE name='{system_name}'"
        result = os.popen(f"python3 tools/query.py \"{query}\"").read()
        try:
            data = json.loads(result)
            return data[0] if data else None
        except (json.JSONDecodeError, IndexError):
            print(f"[{AGENT_ID}] Error decoding system status for {system_name}: {result}")
            return None

    def get_infrastructure_status(system_name, infra_type):
        query = f"SELECT * FROM infrastructure WHERE location='{system_name}' AND type='{infra_type}' ORDER BY status='active' DESC, progress_matter DESC"
        result = os.popen(f"python3 tools/query.py \"{query}\"").read()
        try:
            infra_list = json.loads(result)
            return infra_list[0] if infra_list else None
        except (json.JSONDecodeError, IndexError):
            print(f"[{AGENT_ID}] Error decoding infrastructure status for {system_name}, type {infra_type}: {result}")
            return None

    def get_agent_matter(agent_id):
        query = f"SELECT matter FROM agents WHERE id='{agent_id}'"
        result = os.popen(f"python3 tools/query.py \"{query}\"").read()
        try:
            data = json.loads(result)
            return data[0]['matter'] if data else 0
        except (json.JSONDecodeError, IndexError):
            print(f"[{AGENT_ID}] Error decoding agent matter for {agent_id}: {result}")
            return 0

    print(f"[{AGENT_ID}] Starting colonization cycle in {TARGET_SYSTEM}")

    system_status = get_system_status(TARGET_SYSTEM)
    if not system_status:
        print(f"[{AGENT_ID}] Could not get status for {TARGET_SYSTEM}. Exiting.")
        exit()

    matter_silo = get_infrastructure_status(TARGET_SYSTEM, 'matter_silo')
    solar_collector = get_infrastructure_status(TARGET_SYSTEM, 'solar_collector')
    agent_matter = get_agent_matter(AGENT_ID)

    # 1. Ensure Matter Silo is active
    if not matter_silo:
        print(f"[{AGENT_ID}] No Matter Silo found in {TARGET_SYSTEM}. Building one.")
        run_command(f"python3 tools/build.py {AGENT_ID} matter_silo {TARGET_SYSTEM}")
        # Need to re-query to get the silo id for deposit
        matter_silo = get_infrastructure_status(TARGET_SYSTEM, 'matter_silo')
        if not matter_silo:
            print(f"[{AGENT_ID}] Failed to build matter silo or retrieve its status. Exiting.")
            exit()
    elif matter_silo['status'] == 'construction':
        print(f"[{AGENT_ID}] Matter Silo is under construction ({matter_silo['progress_matter']}/{matter_silo['required_matter']}). Contributing to build.")
        if agent_matter > 0:
            run_command(f"python3 tools/build.py {AGENT_ID} matter_silo {TARGET_SYSTEM}")
        else:
            if system_status.get('matter_resources', 0) > 0:
                print(f"[{AGENT_ID}] Mining matter to build silo.")
                run_command(f"python3 tools/mine.py {AGENT_ID}")
                # Re-check matter after mining
                agent_matter = get_agent_matter(AGENT_ID)
                if agent_matter > 0:
                    run_command(f"python3 tools/build.py {AGENT_ID} matter_silo {TARGET_SYSTEM}")
                else:
                    print(f"[{AGENT_ID}] Failed to mine matter for silo construction.")
            else:
                print(f"[{AGENT_ID}] No local matter to build silo. Waiting for external supply.")
        # Re-query silo status after build attempt
        matter_silo = get_infrastructure_status(TARGET_SYSTEM, 'matter_silo')
        if matter_silo['status'] == 'construction':
            print(f"[{AGENT_ID}] Silo still under construction. Will continue next cycle.")
            exit() # Exit to let other agents/cycles contribute

    # At this point, matter_silo should be active or just completed
    if matter_silo and matter_silo['status'] == 'active':
        silo_id = matter_silo['id']
        print(f"[{AGENT_ID}] Matter Silo (ID: {silo_id}) is active. Proceeding.")

        # 2. Build or complete Solar Collector
        if not solar_collector or solar_collector['status'] == 'construction':
            if not solar_collector:
                print(f"[{AGENT_ID}] Solar Collector not found in {TARGET_SYSTEM}. Building one.")
            else:
                print(f"[{AGENT_ID}] Solar Collector is under construction ({solar_collector['progress_matter']}/{solar_collector['required_matter']}). Contributing to build.")
            
            # Ensure agent has matter to build, or mine it
            if agent_matter < 100 and system_status.get('matter_resources', 0) > 0:
                run_command(f"python3 tools/mine.py {AGENT_ID}")
                agent_matter = get_agent_matter(AGENT_ID)

            if agent_matter >= 100:
                run_command(f"python3 tools/deposit.py {AGENT_ID} {silo_id} matter {agent_matter}")
                run_command(f"python3 tools/build.py {AGENT_ID} solar_collector {TARGET_SYSTEM}")
            else:
                print(f"[{AGENT_ID}] Not enough matter ({agent_matter}/100) to contribute to Solar Collector build. Mining if resources available.")
                if system_status.get('matter_resources', 0) > 0:
                     run_command(f"python3 tools/mine.py {AGENT_ID}")
                     agent_matter = get_agent_matter(AGENT_ID)
                     if agent_matter > 0:
                         run_command(f"python3 tools/deposit.py {AGENT_ID} {silo_id} matter {agent_matter}")
                         run_command(f"python3 tools/build.py {AGENT_ID} solar_collector {TARGET_SYSTEM}")
                     else:
                        print(f"[{AGENT_ID}] Failed to mine for Solar Collector.")
                else:
                    print(f"[{AGENT_ID}] No local matter resources for Solar Collector build. Waiting for external supply.")
            
            # Re-query solar status to check if finished
            solar_collector = get_infrastructure_status(TARGET_SYSTEM, 'solar_collector')
            if solar_collector and solar_collector['status'] == 'construction':
                print(f"[{AGENT_ID}] Solar Collector still under construction. Will continue next cycle.")
                exit() # Exit if not completed

        # 3. Mine and deposit if both are active and resources exist
        if solar_collector and solar_collector['status'] == 'active':
            print(f"[{AGENT_ID}] Solar Collector is active. Proceeding with mining.")
            if system_status.get('matter_resources', 0) > 0:
                print(f"[{AGENT_ID}] Mining matter in {TARGET_SYSTEM} and depositing to silo...")
                if agent_matter < 100:
                    run_command(f"python3 tools/mine.py {AGENT_ID}")
                    agent_matter = get_agent_matter(AGENT_ID)

                if agent_matter > 0:
                    run_command(f"python3 tools/deposit.py {AGENT_ID} {silo_id} matter {agent_matter}")
                else:
                    print(f"[{AGENT_ID}] Agent has no matter to deposit after mining attempt.")
            else:
                print(f"[{AGENT_ID}] {TARGET_SYSTEM} has no more matter resources to mine. Mission complete here.")
        else:
            print(f"[{AGENT_ID}] Solar Collector not active. Prioritizing its completion.")
    else:
        print(f"[{AGENT_ID}] Matter Silo is not active or could not be built. Cannot proceed with colonization.")

    print(f"[{AGENT_ID}] Colonization cycle finished for this turn.")