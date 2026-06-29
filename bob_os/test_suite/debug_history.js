const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = 'REP_TEST';
const expDir = path.resolve(`experiments/${version}`);

try {
    if (fs.existsSync(expDir)) // Cleanup entfernt

    console.log("Erstelle Replication-Experiment...");
    // Nutze Build ohne Tests, um die Grundstruktur zu bekommen
    execSync(`python3 bob_os/build.py ${version} --rounds 3 --mission "DEBUG" --skip-tests`, { stdio: 'ignore' });

    // Manipuliere DB für Instant-Replikation (Werft + Materie)
    const dbPath = path.join(expDir, '_verse/universe.db');
    execSync(`python3 -c "import sqlite3; conn = sqlite3.connect('${dbPath}'); conn.execute('INSERT OR REPLACE INTO infrastructure (system_name, type, status) VALUES (\\'SYS-X0-Y0\\', \\'shipyard\\', \\'active\\')'); conn.execute('UPDATE systems SET matter_stored = 1000, matter_cap = 1000 WHERE name = \\'SYS-X0-Y0\\''); conn.execute('UPDATE agents SET energy = 200 WHERE id = \\'Bob-1\\''); conn.commit(); conn.close();"`);

    // Schreibe eine gezielte Config für Bob-1
    const config = JSON.parse(fs.readFileSync(path.join(expDir, 'config.json'), 'utf8'));
    config.rounds = 5;
    config.agents[0].system_prompt = "ID: Bob-1. MISSION: Das System-Depot (Silo) ist bereits mit 1000 Materie gefüllt und die Werft (Shipyard) ist aktiv. Du darfst nichts abbauen oder bauen. Führe sofort in Runde 1 die Replikation aus: `[RUN: python3 tools/replicate.py Bob-1 Bob-2]`";
    fs.writeFileSync(path.join(expDir, 'config.json'), JSON.stringify(config, null, 2));

    console.log("Starte Engine für 5 Runden (Echtzeit-LLM-Test)...");
    execSync(`node run.js ${version}`, { stdio: 'inherit' });

    console.log("\n--- VALIDIERUNG ---");
    // Prüfe die tatsächlichen Auswirkungen auf die Datenbank
    const validateScript = `
import sqlite3
import sys
conn = sqlite3.connect(sys.argv[1])
cursor = conn.cursor()

# 1. Existiert Bob-2?
cursor.execute("SELECT chosen_name FROM agents WHERE id = 'Bob-2'")
agent = cursor.fetchone()
if not agent:
    print("FEHLER: Bob-2 existiert nicht in der Datenbank.")
    sys.exit(1)

# 2. Hat Bob-2 sich umbenannt? (Beweis für Autonomie-Direktive)
if agent[0] == 'Unnamed':
    print("FEHLER: Bob-2 hat seinen Namen nicht geändert. (Noch 'Unnamed'). Autonomie-Direktive ignoriert.")
    sys.exit(1)

print("ERFOLG: Bob-2 existiert und hat sich autonom umbenannt: " + agent[0])
conn.close()
`;
    
    try {
        fs.writeFileSync(path.join(expDir, 'validate.py'), validateScript);
        const out = execSync(`python3 validate.py ${dbPath}`, { cwd: expDir }).toString();
        console.log(out.trim());
        console.log("✅ V5 Existential Awakening E2E Test erfolgreich.");
    } catch (e) {
        throw new Error(e.stdout ? e.stdout.toString() : e.message);
    }

    // Cleanup entfernt
} catch (e) {
    console.error("❌ Test fehlgeschlagen:", e.message);
    process.exit(1);
}
