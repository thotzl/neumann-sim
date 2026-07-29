const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = 'REP_TEST';
const expDir = path.resolve(`experiments/${version}`);

try {
    if (fs.existsSync(expDir)) // Cleanup removed

    console.log("Creating Replication Experiment...");
    // Use build without tests to get the basic structure
    execSync(`python3 scripts/build.py ${version} --rounds 3 --mission "DEBUG" --skip-tests`, { stdio: 'ignore' });

    // Manipulate DB for instant replication (Shipyard + Matter)
    const dbPath = path.join(expDir, '_verse/universe.db');
    execSync(`python3 -c "import sqlite3; conn = sqlite3.connect('${dbPath}'); conn.execute('INSERT OR REPLACE INTO infrastructure (system_name, type, status) VALUES (\\'SYS_X0_Y0\\', \\'shipyard\\', \\'active\\')'); conn.execute('UPDATE systems SET raw_matter_depot = 1000, depot_matter_capacity = 1000 WHERE name = \\'SYS_X0_Y0\\''); conn.execute('UPDATE agents SET energy_inventory = 200 WHERE id = \\'Instance-1\\''); conn.commit(); conn.close();"`);

    // Write a specific config for Instance-1
    const config = JSON.parse(fs.readFileSync(path.join(expDir, 'config.json'), 'utf8'));
    config.rounds = 5;
    config.agents[0].system_prompt = "ID: Instance-1. MISSION: The system depot (silo) is already filled with 1000 matter and the shipyard is active. You are not allowed to mine or build anything. Immediately perform replication in Round 1: `[RUN: python3 tools/replicate.py Instance-1 Instance-2]`";
    fs.writeFileSync(path.join(expDir, 'config.json'), JSON.stringify(config, null, 2));

    console.log("Starting Engine for 5 rounds (Real-time LLM test)...");
    execSync(`node run.js ${version}`, { stdio: 'inherit' });

    console.log("\n--- VALIDATION ---");
    // Check the actual effects on the database
    const validateScript = `
import sqlite3
import sys
conn = sqlite3.connect(sys.argv[1])
cursor = conn.cursor()

# 1. Does Instance-2 exist?
cursor.execute("SELECT chosen_name FROM agents WHERE id = 'Instance-2'")
agent = cursor.fetchone()
if not agent:
    print("ERROR: Instance-2 does not exist in the database.")
    sys.exit(1)

# 2. Has Instance-2 renamed itself? (Proof of Autonomy Directive)
if agent[0] == 'Unnamed':
    print("ERROR: Instance-2 has not changed its name. (Still 'Unnamed'). Autonomy Directive ignored.")
    sys.exit(1)

print("SUCCESS: Instance-2 exists and has autonomously renamed itself: " + agent[0])
conn.close()
`;
    
    try {
        fs.writeFileSync(path.join(expDir, 'validate.py'), validateScript);
        const out = execSync(`python3 validate.py ${dbPath}`, { cwd: expDir }).toString();
        console.log(out.trim());
        console.log("✅ V5 Existential Awakening E2E Test successful.");
    } catch (e) {
        throw new Error(e.stdout ? e.stdout.toString() : e.message);
    }

    // Cleanup removed
} catch (e) {
    console.error("❌ Test failed:", e.message);
    process.exit(1);
}