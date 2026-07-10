const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function runSql(dbPath, sql) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.serialize(() => {
            db.run(sql, (err) => {
                db.close();
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

function getSql(dbPath, sql) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.get(sql, (err, row) => {
            db.close();
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function runSwarmE2E() {
    console.log("🚀 Starte V9.0 Swarm E2E Test (Automation, Transit, SCUT & ACL)...");
    const version = 'swarm_e2e_test';
    const expDir = path.join(__dirname, '../experiments', version);
    const dbPath = path.join(expDir, '_verse', 'universe.db');
    const statePath = path.join(expDir, 'state.json');

    try {
        if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });

        console.log("- Erstelle Experiment...");
        execSync(`python3 bob_os/build.py ${version} --rounds 1 --skip-tests --mission "Swarm Test"`, { stdio: 'inherit' });
        
        // 1. Setup DB (Bob-1 und Bob-2 in SYS-A, Ziel SYS-B)
        await runSql(dbPath, "INSERT INTO systems (name, extractable_matter_in_core, depot_matter_capacity, x, y) VALUES ('SYS-A', 5000, 1000, 0, 0)");
        await runSql(dbPath, "INSERT INTO systems (name, extractable_matter_in_core, x, y) VALUES ('SYS-B', 5000, 600, 0)"); // 2 Ticks
        await runSql(dbPath, "UPDATE agents SET location = 'SYS-A', energy_inventory = 500, matter_storage_capacity = 1000 WHERE id = 'Bob-1'");
        await runSql(dbPath, "INSERT INTO agents (id, chosen_name, location, energy_inventory, raw_matter_inventory, matter_storage_capacity, status, current_x, current_y) VALUES ('Bob-2', 'Klon', 'SYS-A', 500, 0, 100, 'active', 0, 0)");

        // 2. Setup State (Beide Bobs in TurnSequence)
        const initialState = {
            round: 1, currentTurnIndex: 0, totalTurns: 0,
            agents: [
                { id: "Bob-1", location: "SYS-A", alive: true, needsResumeNotify: false },
                { id: "Bob-2", location: "SYS-A", alive: true, needsResumeNotify: false }
            ],
            turnSequence: ["Bob-1", "Bob-2"],
            histories: {
                "Bob-1": [{ agent: "System", text: "Boot" }],
                "Bob-2": [{ agent: "System", text: "Boot" }]
            },
            security: { acl: {}, wallets: {} }
        };
        fs.writeFileSync(statePath, JSON.stringify(initialState, null, 2));
        
        const popPath = path.join(expDir, '_verse', 'population.json');
        const popData = JSON.parse(fs.readFileSync(popPath, 'utf8'));
        popData.agents.push({
            id: "Bob-2", parent_id: "Bob-1", location: "SYS-A", status: "active", system_prompt: "Test Klon"
        });
        fs.writeFileSync(popPath, JSON.stringify(popData, null, 2));

        // --- TICK 1: Bob-1 schreibt geschütztes Skript und schickt SCUT ---
        console.log("- Tick 1: Bob-1 (Skripting & SCUT)...");
        process.env.E2E_MOCK = 'true';
        process.env.E2E_MOCK_RESPONSE_BOB1 = `
ANALYSE: Ich erstelle ein Skript und lade Bob-2 ein.
AKTION:
[WRITE: scripts/active/auto.py (READ_KEY: secret)]
import bob_sdk; me = bob_sdk.Agent(); me.mine()
[END]
[RUN: bob scut(receiver_id=Bob-2, message=Der Schlüssel ist secret)]`;
        process.env.E2E_MOCK_RESPONSE_BOB2 = `
ANALYSE: Ich warte.
AKTION:
[RUN: bob poll()]`;

        const configPath = path.join(expDir, 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.rounds = 2; 
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        execSync(`node sim_engine/runner.js ${version}`, { stdio: 'inherit', env: process.env });

        // Validiere State nach Tick 1
        const stateTick1 = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        if (!stateTick1.security.acl['scripts/active/auto.py'] || stateTick1.security.acl['scripts/active/auto.py'].read_key !== 'secret') {
            throw new Error("ACL Read-Key wurde nicht gesetzt!");
        }

        // --- TICK 2: Bob-2 liest Skript (Security Check) und reist ab ---
        console.log("- Tick 2: Bob-2 (Wallet, Read & Transit)...");
        config.rounds = 4;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        process.env.E2E_MOCK_RESPONSE_BOB1 = `ANALYSE: Nichts.\nAKTION:\n`;
        process.env.E2E_MOCK_RESPONSE_BOB2 = `
ANALYSE: Ich nutze den Key, lese das Skript und fliege nach SYS-B.
AKTION:
[KEY: ADD auth secret]
[READ: scripts/active/auto.py]
[RUN: bob move(target_system=SYS-B)]`;

        execSync(`node sim_engine/runner.js ${version}`, { stdio: 'inherit', env: process.env });

        // Validiere Automation
        const bob1 = await getSql(dbPath, "SELECT raw_matter_inventory FROM agents WHERE id='Bob-1'");
        if (bob1.raw_matter_inventory < 100) throw new Error("Automation Skript (auto.py) wurde im System-Turn nicht ausgeführt!");

        // --- TICK 3: Arrival Validierung ---
        console.log("- Tick 3: Validierung...");
        const bob2Arrived = await getSql(dbPath, "SELECT status, location, current_x FROM agents WHERE id='Bob-2'");
        if (bob2Arrived.status !== 'active' || bob2Arrived.location !== 'SYS-B' || bob2Arrived.current_x !== 600) {
            throw new Error(`Transit Ankunft fehlerhaft (Physik Loop)! State: ${JSON.stringify(bob2Arrived)}`);
        }

        console.log("✅ Swarm E2E Test (SCUT, ACL, Automation, Transit) erfolgreich!");

    } catch (e) {
        console.error("❌ Swarm E2E Test fehlgeschlagen:", e.message);
        process.exit(1);
    }
}

runSwarmE2E();
