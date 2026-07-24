const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = 'first_start_e2e_test';
const expDir = path.join(__dirname, '..', 'experiments', version);
const dbPath = path.join(expDir, '_verse', 'universe.db');

async function runSql(db, query) {
    return new Promise((resolve, reject) => {
        db.run(query, function(err) {
            if (err) reject(err); else resolve(this);
        });
    });
}

async function getSql(db, query) {
    return new Promise((resolve, reject) => {
        db.get(query, (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
}

async function runE2E() {
    console.log("=== Starte First-Start (Prerun) E2E Test ===");

    if (fs.existsSync(expDir)) {
        fs.rmSync(expDir, { recursive: true, force: true });
    }

    // 1. Build Phase
    console.log("- Erstelle Experiment via Build...");
    // Nutze default-Parameter
    execSync(`python3 bob_os/build.py ${version} --rounds 1 --skip-tests --mission "Finde Erde"`, { stdio: 'inherit' });

    // 2. Modifikation der config.json VOR dem Start (Simuliert manuellen Eingriff)
    console.log("- Editiere config.json...");
    const configPath = path.join(expDir, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    config.agents[0].id = "Robert";
    config.agents[0].chosen_name = "Rob";
    config.agents[0].location = "Alpha_Centauri";
    config.agents[0].system_prompt = "MISSION: Überlebe.";
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // 3. Simulierter Lauf (nur 1 Runde, um Prerun auszulösen)
    console.log("- Starte Runner (Prerun sollte triggern)...");
    process.env.E2E_MOCK = 'true';
    execSync(`node sim_engine/runner.js ${version}`, { stdio: 'inherit', env: process.env });

    // 4. Verifikation der Datenbank
    console.log("- Validiere DB...");
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(dbPath);

    try {
        const agent = await getSql(db, "SELECT * FROM agents WHERE id = 'Robert'");
        if (!agent) throw new Error("Agent 'Robert' wurde nicht angelegt!");
        if (agent.chosen_name !== "Rob") throw new Error(`Falscher chosen_name: ${agent.chosen_name}`);
        if (agent.location !== "Alpha_Centauri") throw new Error(`Falsche Location: ${agent.location}`);
        
        const system = await getSql(db, "SELECT * FROM systems WHERE name = 'Alpha_Centauri'");
        if (!system) throw new Error("System 'Alpha_Centauri' wurde nicht angelegt!");
        
        // Prüfe ob SYS_X0_Y0 exisitiert
        const defaultSys = await getSql(db, "SELECT * FROM systems WHERE name = 'SYS_X0_Y0'");
        if (defaultSys) throw new Error("SYS_X0_Y0 wurde fälschlicherweise als Fallback angelegt!");

        console.log("- DB Validation OK.");

        // 5. Verifikation des Logs
        console.log("- Validiere Log...");
        const logPath = path.join(expDir, 'log.md');
        const logContent = fs.readFileSync(logPath, 'utf8');
        
        if (!logContent.includes("### INITIALER BOOT: Robert")) {
            throw new Error("Genesis Log Header fehlt!");
        }
        if (logContent.includes("TRUNCATED INITIAL CONTEXT")) {
            throw new Error("Genesis Log wurde fälschlicherweise abgeschnitten (Truncated)!");
        }
        if (!logContent.includes("MISSION: Überlebe.")) {
            throw new Error("Mission fehlt im Genesis Log!");
        }
        
        console.log("- Log Validation OK.");
        console.log("=== First-Start E2E Test ERFOLGREICH ===");
    } finally {
        db.close();
    }
}

runE2E().catch(err => {
    console.error("Test fehlgeschlagen:", err);
    process.exit(1);
});