import os

bob_id = os.environ.get('BOB_ID', 'Bob-10')

# Versuche, den Shipyard zu bauen. build.py entnimmt Materie direkt aus dem System-Silo.
# Dies wird Materie im System-Silo nutzen, um das Bauprojekt voranzutreiben.
print(f"[RUN: python3 tools/build.py {bob_id} shipyard]")