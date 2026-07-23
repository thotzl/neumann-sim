const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function runSwarmE2E() {
    console.log("🚀 Starte V9.0 Swarm E2E Test...");
    const version = 'swarm_e2e_test';
    const expDir = path.join(__dirname, '../experiments', version);
    const dbPath = path.join(expDir, '_verse', 'universe.db');

    const runSql = (db, sql) => new Promise((res, rej) => db.run(sql, (err) => err ? rej(err) : res()));
    const getSql = (db, sql) => new Promise((res, rej) => db.get(sql, (err, row) => err ? rej(err) : res(row)));

    try {
        if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
        execSync(`python3 bob_os/build.py ${version} --rounds 5 --skip-tests --mission "Swarm Test"`, { stdio: 'pipe' });
        
        const configPath = path.join(expDir, 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const startSys = config.agents[0].location; // Alpha_Centauri or SYS-X0-Y0
        
        config.agents.push({
            id: "Instance-2",
            location: startSys,
            chosen_name: "Bob-2",
            system_prompt: "Receiver"
        });
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Seed everything
        execSync(`python3 core/bin/init_db.py --seed`, { cwd: expDir, env: { ...process.env, PYTHONPATH: expDir } });

        const db = new sqlite3.Database(dbPath);
        await runSql(db, "INSERT OR IGNORE INTO systems (name, extractable_matter_in_core, x, y) VALUES ('SYS-B', 5000, 600, 0)");
        await runSql(db, `UPDATE agents SET energy_inventory = 500 WHERE id IN ('Instance-1', 'Instance-2')`);

        process.env.E2E_MOCK = 'true';
        process.env.E2E_MOCK_STEP_1_INSTANCE1 = "ANALYSE: Skript.\nAKTION:\n[WRITE: scripts/active/auto.py (READ_KEY: secret)]\nimport bob_sdk; me = bob_sdk.Agent(); me.mine()\n[END]\n[RUN: me scut(receiver_id=Instance-2, message=secret)]";
        process.env.E2E_MOCK_STEP_2_INSTANCE2 = `ANALYSE: Move.\nAKTION:\n[KEY: ADD auth secret]\n[READ: scripts/active/auto.py]\n[RUN: me move(target_system=SYS-B)]`;

        execSync(`node sim_engine/runner.js ${version}`, { stdio: 'inherit', env: process.env });

        const bob1 = await getSql(db, "SELECT raw_matter_inventory FROM agents WHERE id='Instance-1'");
        if (bob1.raw_matter_inventory < 100) throw new Error("Automation fehlgeschlagen!");

        const bob2 = await getSql(db, `
            SELECT 
                CASE 
                    WHEN status = 'traveling' THEN 'Interstellar'
                    WHEN host_type = 'ship' THEN (SELECT system_name FROM ships WHERE id = CAST(host_id AS INTEGER))
                    WHEN host_type = 'matrix' THEN (SELECT system_name FROM infrastructure WHERE id = CAST(host_id AS INTEGER))
                    ELSE 'Unknown'
                END AS location,
                last_seen_event_id
            FROM agents WHERE id='Instance-2'
        `);
        if (bob2.location !== 'SYS-B') throw new Error(`Ankunft fehlgeschlagen! Ist: ${bob2.location}`);
        
        // Test-Gaps schließen (Task 3)
        // 1. last_seen_event_id muss inkrementiert sein (Visual Events wurden nicht vom Runner gelöscht)
        if (bob2.last_seen_event_id === 0) throw new Error("last_seen_event_id wurde nicht inkrementiert! Visual Events wurden vermutlich gelöscht oder ignoriert.");

        // 2. JS State Location Desynchronisation prüfen
        const finalState = JSON.parse(fs.readFileSync(path.join(expDir, 'state.json'), 'utf8'));
        const jsBob2 = finalState.agents.find(a => a.id === 'Instance-2');
        if (jsBob2.location !== 'SYS-B') throw new Error(`JS State Location Desynchronisation! Ist im JS State: ${jsBob2.location}, sollte aber SYS-B sein.`);

        console.log("✅ Swarm E2E Test erfolgreich!");
        db.close();
    } catch (error) {
        console.error("❌ Swarm Test fehlgeschlagen:", error.message);
        process.exit(1);
    }
}
runSwarmE2E();
