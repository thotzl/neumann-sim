
import sqlite3
import os
# Wir nutzen eine kleine Datei als Counter
count_file = "vampire_hits.txt"
if not os.path.exists(count_file): 
    count = 0
else:
    with open(count_file, "r") as f: count = int(f.read())

count += 1
with open(count_file, "w") as f: f.write(str(count))
print(f"[SDK DEBUG] Hit: {count}")
