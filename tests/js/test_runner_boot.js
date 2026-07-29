const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const expName = 'test_boot';
const expDir = path.resolve(`experiments/${expName}`);
const verseDir = path.join(expDir, '_verse');
const coreDir = path.join(expDir, 'core');

try {
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
    
    // 1. Create directories
    fs.mkdirSync(path.join(verseDir, 'tools'), { recursive: true });
    fs.mkdirSync(path.join(coreDir, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(coreDir, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(expDir, 'scripts', 'active'), { recursive: true });
    fs.mkdirSync(path.join(expDir, 'scripts', 'passive'), { recursive: true });

    // 2. Generate dummy config
    fs.writeFileSync(path.join(expDir, 'config.json'), JSON.stringify({
        rounds: 2, config_override: { max_turns: 10, model: "gemini-2.5-flash" },
        agents: [{ id: "Instance-1", location: "SYS_X0_Y0", system_prompt: "Father" }]
    }));

    // 3. Copy blueprints (Core only, as tools are gone)
    execSync(`cp -r src/bob_os/core/* ${coreDir}/`);
    execSync(`cp -r src/bob_os/_verse/population.json ${verseDir}/`);

    // 4. Initialize DB
    execSync(`python3 core/bin/init_db.py`, { 
        cwd: expDir, 
        env: { ...process.env, PYTHONPATH: expDir } 
    });

    // 5. Generate population with Original-Bob (Instance-1) and Clone (Instance-2)
    fs.writeFileSync(path.join(verseDir, 'population.json'), JSON.stringify({
        version: 1,
        agents: [
            { id: "Instance-1", location: "SYS_X0_Y0", status: "active", system_prompt: "Father" },
            { id: "Instance-2", parent_id: "Instance-1", location: "SYS_X0_Y0", status: "active", system_prompt: "Child" }
        ]
    }));

    // 6. Fake an existing state.json for Instance-1
    fs.writeFileSync(path.join(expDir, 'state.json'), JSON.stringify({
        round: 1, currentTurnIndex: 0, totalTurns: 0,
        agents: [{ id: "Instance-1", alive: true }],
        histories: { "Instance-1": [{ agent: "Instance-1", text: "I am the Father." }] }
    }));

    // 7. Execute Runner (API-Mock)
    process.env.E2E_MOCK = 'true';
    execSync(`node src/sim_engine/runner.js ${expName}`, { stdio: 'inherit' });

    console.log("✅ Runner Boot Sequence (Clone) Test successful!");

    // 8. Test Original-Bob (complete restart)
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
    
    fs.mkdirSync(path.join(coreDir, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(coreDir, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(verseDir, 'tools'), { recursive: true });
    fs.mkdirSync(path.join(expDir, 'scripts', 'active'), { recursive: true });
    fs.writeFileSync(path.join(expDir, 'config.json'), JSON.stringify({
        rounds: 1, config_override: { max_turns: 10, model: "gemini-2.5-flash" },
        agents: [{ id: "Instance-1", location: "SYS_X0_Y0", system_prompt: "Father" }]
    }));
    execSync(`cp -r src/bob_os/core/* ${coreDir}/`);
    
    execSync(`python3 core/bin/init_db.py`, { 
        cwd: expDir, 
        env: { ...process.env, PYTHONPATH: expDir } 
    });
    
    fs.writeFileSync(path.join(verseDir, 'population.json'), JSON.stringify({
        version: 1,
        agents: [ { id: "Instance-1", location: "SYS_X0_Y0", status: "active", system_prompt: "Father" } ]
    }));

    execSync(`node src/sim_engine/runner.js ${expName}`, { stdio: 'inherit' });
    
    console.log("✅ Runner Boot Sequence (Original-Bob) Test successful!");
    
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
} catch(e) {
    console.error("❌ Test failed:\n", e.message);
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
    process.exit(1);
}