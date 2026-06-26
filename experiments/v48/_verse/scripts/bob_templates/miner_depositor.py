import os
    agent_id = os.environ.get("BOB_ID", "UNKNOWN")
    print(f"[RUN: python3 tools/mine.py {agent_id}]")
    print(f"[RUN: python3 tools/deposit.py {agent_id} silo matter 100]")