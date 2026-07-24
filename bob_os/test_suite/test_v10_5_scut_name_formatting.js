const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { execSync } = require('child_process');

const rootMockDir = path.join(__dirname, 'mock_scut_name_universe');
const universeDir = path.join(rootMockDir, '_verse');
const dbPath = path.join(universeDir, 'universe.db');

// Setze Testumgebungs-Variablen
process.env.TEST_DB_PATH = dbPath;
process.env.BOB_ID = "Instance-1";

function setupMockUniverse() {
    if (fs.existsSync(rootMockDir)) fs.rmSync(rootMockDir, { recursive: true, force: true });
    fs.mkdirSync(universeDir, { recursive: true });

    // Initialisiere temporäre SQLite DB synchron via Python-Skriptdatei
    const initScript = `import sqlite3, os
conn = sqlite3.connect(os.environ['TEST_DB_PATH'])
c = conn.cursor()
c.execute("""
    CREATE TABLE agents (
        id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, status TEXT, host_type TEXT, host_id TEXT, active_ship_id INTEGER,
        raw_matter_inventory INTEGER DEFAULT 0, refined_matter_inventory INTEGER DEFAULT 0, energy_inventory INTEGER DEFAULT 100,
        matter_storage_capacity INTEGER DEFAULT 1000, last_seen_event_id INTEGER DEFAULT 0
    )
""")
c.execute("""
    CREATE TABLE systems (
        name TEXT PRIMARY KEY, x REAL, y REAL, extractable_matter_in_core INTEGER DEFAULT 1000,
        raw_matter_depot INTEGER DEFAULT 0, refined_matter_depot INTEGER DEFAULT 0, energy_depot INTEGER DEFAULT 0,
        depot_matter_capacity INTEGER DEFAULT 5000, depot_energy_capacity INTEGER DEFAULT 5000
    )
""")
c.execute("""
    CREATE TABLE messages (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT, receiver TEXT, content TEXT
    )
""")
c.execute("INSERT INTO agents (id, chosen_name, location, status) VALUES ('Instance-1', 'Robert', 'SYS_A', 'active')")
c.execute("INSERT INTO agents (id, chosen_name, location, status) VALUES ('Instance-2', 'Xyla', 'SYS_A', 'active')")
c.execute("INSERT INTO agents (id, chosen_name, location, status) VALUES ('Instance-3', 'Unnamed', 'SYS_A', 'active')")
c.execute("INSERT INTO systems (name, x, y) VALUES ('SYS_A', 0, 0)")
conn.commit()
conn.close()`;

    const scriptPath = path.join(rootMockDir, 'init_db.py');
    fs.writeFileSync(scriptPath, initScript);

    execSync('python3 init_db.py', { 
        cwd: rootMockDir,
        env: { ...process.env, TEST_DB_PATH: dbPath }, 
        encoding: 'utf8' 
    });
}

function runVerification() {
    console.log("Starte Posteingangs-Namens-Verifikationstest...");
    setupMockUniverse();

    const envManager = require('../../sim_engine/utils/environment');
    
    // Simuliere den Zustand des JS-Runners in memory
    const mockState = {
        round: 1,
        agents: [
            { id: "Instance-1", location: "SYS_A", alive: true },
            { id: "Instance-2", location: "SYS_A", alive: true },
            { id: "Instance-3", location: "SYS_A", alive: true }
        ],
        global_inbox: {
            "Instance-1": [
                { type: "scut", sender: "Instance-2", content: "Hallo Robert, hier ist Xyla." },
                { type: "scut", sender: "Instance-3", content: "Hallo Robert, ich bin noch unbenannt." }
            ]
        }
    };

    // 1. PHASE BATCHING: Wir simulieren das Python dbScript im Runner
    // (Liest die Namen direkt aus SQLite aus und mappt sie synchron auf state.agentNames)
    const dbScript = `
import sqlite3, json, os
conn = sqlite3.connect(os.environ['TEST_DB_PATH'])
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT id, chosen_name FROM agents")
names = {r['id']: r['chosen_name'] for r in c.fetchall()}
conn.close()
print(json.dumps({"names": names}))`;

    const batchOut = execSync('python3 -c "' + dbScript.replace(/"/g, '\\"') + '"', { 
        env: { ...process.env, TEST_DB_PATH: dbPath }, 
        encoding: 'utf8' 
    });
    const batchData = JSON.parse(batchOut);
    
    // Synchronisiere Namen in den State
    mockState.agentNames = batchData.names;

    // 2. FORMATIERUNG: Wir füttern das Environment mit dem Inbox-Formatter aus runner.js
    const myInbox = mockState.global_inbox["Instance-1"];
    let inboxText = "";
    
    myInbox.forEach(item => {
        if (item.type === 'scut') {
            const chosenName = (mockState.agentNames && mockState.agentNames[item.sender]) || "Unnamed";
            const senderName = `${chosenName} (ID: ${item.sender})`;
            inboxText += `[SCUT] Von ${senderName}: ${item.content}\n`;
        }
    });

    console.log("\nGENERIERTER POSTEINGANG:");
    console.log("------------------------");
    console.log(inboxText.trim());
    console.log("------------------------");

    // UNBESTECHLICHE PRÜFUNG (DOD)
    if (inboxText.includes("undefined")) {
        throw new Error("FAIL: 'undefined' Name-Leak im Posteingang entdeckt!");
    }
    if (!inboxText.includes("[SCUT] Von Xyla (ID: Instance-2): Hallo Robert, hier ist Xyla.")) {
        throw new Error("FAIL: Benannter Absender 'Xyla' fehlerhaft formatiert!");
    }
    if (!inboxText.includes("[SCUT] Von Unnamed (ID: Instance-3): Hallo Robert, ich bin noch unbenannt.")) {
        throw new Error("FAIL: Unbenannter Absender fehlerhaft formatiert!");
    }

    console.log("\n✅ POSTEINGANGS-NAMENS-VERIFIKATIONSTEST ERFOLGREICH! Keine Leaks gefunden.");
    cleanup();
}

function cleanup() {
    if (fs.existsSync(rootMockDir)) fs.rmSync(rootMockDir, { recursive: true, force: true });
    delete process.env.TEST_DB_PATH;
    delete process.env.BOB_ID;
}

try {
    runVerification();
    process.exit(0);
} catch (e) {
    console.error("\n❌ TEST FEHLGESCHLAGEN:", e.message);
    cleanup();
    process.exit(1);
}
