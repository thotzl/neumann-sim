import os

AGENT_ID = os.environ.get('BOB_ID', 'Bob-12')
SYSTEM_NAME = 'System_C'

# Query agent status
agent_status_cmd = f"python3 tools/query.py \"SELECT matter, energy FROM agents WHERE id='{AGENT_ID}';\""
print(f"[RUN: {agent_status_cmd}]")

# Query infrastructure status for System_C
infra_status_cmd = f"python3 tools/query.py \"SELECT type, status, progress_matter, required_matter FROM infrastructure WHERE system_name='{SYSTEM_NAME}' AND (type='matter_silo' OR type='solar_collector');\""
print(f"[RUN: {infra_status_cmd}]")

# Query system resources
system_resources_cmd = f"python3 tools/query.py \"SELECT resources, matter_stored FROM systems WHERE name='{SYSTEM_NAME}';\""
print(f"[RUN: {system_resources_cmd}]")

# Placeholder for actual logic based on query results
# For now, let's assume silo is ready and start mining/depositing
# The full logic will be implemented in subsequent turns after confirming queries work in a script
print(f"[RUN: python3 tools/mine.py {AGENT_ID}]")
print(f"[RUN: python3 tools/deposit.py {AGENT_ID} silo matter 100]")
# If silo has 400 matter and solar collector is not built, build it.
# This will be refined.
print(f"[RUN: python3 tools/build.py {AGENT_ID} solar_collector]")