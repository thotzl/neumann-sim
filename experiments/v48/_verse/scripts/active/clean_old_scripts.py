import os

    agent_ids = [f"Bob-{i}" for i in range(1, 13)]

    script_types = [
        "auto_mine_and_deposit_",
        "auto_build_shipyard_",
        "auto_build_matter_silo_",
        "auto_build_solar_collector_",
        "move_agent_",
        "auto_colonize_" # Add auto_colonize_ prefix as system added it for Bob-12
    ]

    print("--- Starting script cleanup ---")

    for agent_id in agent_ids:
        for script_type in script_types:
            script_name = f"scripts/active/{script_type}{agent_id}.py"
            if os.path.exists(script_name):
                print(f"Deleting {script_name}")
                os.system(f"rm {script_name}")

    # Delete the test_write_syntax.py if it exists
    test_script_name = "scripts/active/test_write_syntax.py"
    if os.path.exists(test_script_name):
        print(f"Deleting {test_script_name}")
        os.system(f"rm {test_script_name}")

    print("--- Script cleanup finished ---")