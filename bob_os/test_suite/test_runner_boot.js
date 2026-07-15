const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const expName = 'test_boot';
const expDir = path.resolve(`experiments/${expName}`);
const verseDir = path.join(expDir, '_verse');
const coreDir = path.join(expDir, 'core');

try {
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
    
    // 1. Erstelle Verzeichnisse
    fs.mkdirSync(path.join(verseDir, 'tools'), { recursive: true });
    fs.mkdirSync(path.join(coreDir, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(coreDir, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(expDir, 'scripts', 'active'), { recursive: true });
    fs.mkdirSync(path.join(expDir, 'scripts', 'passive'), { recursive: true });

    // 2. Erzeuge Dummy config
    fs.writeFileSync(path.join(expDir, 'config.json'), JSON.stringify({
        rounds: 2, config_override: { max_turns: 10, model: "gemini-2.5-flash" },
        agents: [{ id: "Instance-1", location: "SYS-X0-Y0", system_prompt: "Vater" }]
    }));

    // 3. Kopiere Blueprints (Nur core, da tools weg sind)
    execSync(`cp -r bob_os/core/* ${coreDir}/`);
    execSync(`cp -r bob_os/_verse/population.json ${verseDir}/`);

    // 4. Initialisiere DB
    execSync(`python3 core/bin/init_db.py`, { 
        cwd: expDir, 
        env: { ...process.env, PYTHONPATH: expDir } 
    });

    // 5. Erzeuge Population mit Ur-Bob (Instance-1) und Klon (Instance-2)
    fs.writeFileSync(path.join(verseDir, 'population.json'), JSON.stringify({
        version: 1,
        agents: [
            { id: "Instance-1", location: "SYS-X0-Y0", status: "active", system_prompt: "Vater" },
            { id: "Instance-2", parent_id: "Instance-1", location: "SYS-X0-Y0", status: "active", system_prompt: "Kind" }
        ]
    }));

    // 6. Fake eine existierende state.json für Instance-1
    fs.writeFileSync(path.join(expDir, 'state.json'), JSON.stringify({
        round: 1, currentTurnIndex: 0, totalTurns: 0,
        agents: [{ id: "Instance-1", alive: true }],
        histories: { "Instance-1": [{ agent: "Instance-1", text: "Ich bin der Vater." }] }
    }));

    // 7. Führe Runner aus (API-Mock)
    process.env.E2E_MOCK = 'true';
    execSync(`node sim_engine/runner.js ${expName}`, { stdio: 'inherit' });

    console.log("✅ Runner Boot-Sequenz (Klon) Test erfolgreich!");

    // 8. Teste Ur-Bob (kompletter Neustart)
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
    
    fs.mkdirSync(path.join(coreDir, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(coreDir, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(verseDir, 'tools'), { recursive: true });
    fs.mkdirSync(path.join(expDir, 'scripts', 'active'), { recursive: true });
    fs.writeFileSync(path.join(expDir, 'config.json'), JSON.stringify({
        rounds: 1, config_override: { max_turns: 10, model: "gemini-2.5-flash" },
        agents: [{ id: "Instance-1", location: "SYS-X0-Y0", system_prompt: "Vater" }]
    }));
    execSync(`cp -r bob_os/core/* ${coreDir}/`);
    
    execSync(`python3 core/bin/init_db.py`, { 
        cwd: expDir, 
        env: { ...process.env, PYTHONPATH: expDir } 
    });
    
    fs.writeFileSync(path.join(verseDir, 'population.json'), JSON.stringify({
        version: 1,
        agents: [ { id: "Instance-1", location: "SYS-X0-Y0", status: "active", system_prompt: "Vater" } ]
    }));

    execSync(`node sim_engine/runner.js ${expName}`, { stdio: 'inherit' });
    
    console.log("✅ Runner Boot-Sequenz (Ur-Bob) Test erfolgreich!");
    
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
} catch(e) {
    console.error("❌ Test fehlgeschlagen:\n", e.message);
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
    process.exit(1);
}
