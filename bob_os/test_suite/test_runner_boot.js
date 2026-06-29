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
        rounds: 2, config_override: { max_turns: 10 },
        agents: [{ id: "Bob-1", location: "SYS-X0-Y0", system_prompt: "Vater" }]
    }));

    // 3. Kopiere Blueprints
    execSync(`cp -r bob_os/_verse/tools/* ${path.join(verseDir, 'tools/')}`);
    execSync(`cp -r bob_os/core/* ${coreDir}/`);
    execSync(`cp -r bob_os/_verse/population.json ${verseDir}/`);

    // 4. Initialisiere DB
    // PYTHONPATH muss auf expDir zeigen
    execSync(`python3 core/bin/init_db.py`, { 
        cwd: expDir, 
        env: { ...process.env, PYTHONPATH: expDir } 
    });

    // 5. Erzeuge Population mit Ur-Bob (Bob-1) und Klon (Bob-2)
    fs.writeFileSync(path.join(verseDir, 'population.json'), JSON.stringify({
        version: 1,
        agents: [
            { id: "Bob-1", location: "SYS-X0-Y0", status: "active", system_prompt: "Vater" },
            { id: "Bob-2", parent_id: "Bob-1", location: "SYS-X0-Y0", status: "active", system_prompt: "Kind" }
        ]
    }));

    // 6. Fake eine existierende state.json für Bob-1 (um Vererbung zu simulieren)
    fs.writeFileSync(path.join(expDir, 'state.json'), JSON.stringify({
        round: 1, currentTurnIndex: 0, totalTurns: 0,
        agents: [{ id: "Bob-1", alive: true }],
        histories: { "Bob-1": [{ agent: "Bob-1", text: "Ich bin der Vater." }] }
    }));

    // 7. Führe Runner aus (API-Mock)
    process.env.E2E_MOCK = 'true';
    execSync(`node sim_engine/runner.js ${expName}`, { stdio: 'inherit' });

    // 8. Validierung Klon (Bob-2)
    const finalState = JSON.parse(fs.readFileSync(path.join(expDir, 'state.json'), 'utf8'));
    const hist = finalState.histories['Bob-2'];

    if (!hist) throw new Error("Bob-2 Historie fehlt.");
    const bootTurn = hist.find(h => h.text.includes("[SYSTEM BOOT"));
    if (!bootTurn || !bootTurn.text.includes("[SYSTEM BOOT SEQUENZ ABGESCHLOSSEN]")) throw new Error("Boot-Sequence fehlt.");
    if (!bootTurn.text.includes("Abstammung: Klon von Bob-1")) throw new Error("Abstammung fehlt im Boot.");
    if (!bootTurn.text.includes("matter_limit")) throw new Error("Omni-Dashboard fehlt im Boot.");

    console.log("✅ Runner Boot-Sequenz (Klon) Test erfolgreich!");

    // 9. Teste Ur-Bob (kompletter Neustart ohne Fake-State)
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
    
    // Setup für neuen Run
    fs.mkdirSync(path.join(verseDir, 'tools'), { recursive: true });
    fs.mkdirSync(path.join(coreDir, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(coreDir, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(expDir, 'scripts', 'active'), { recursive: true });
    fs.mkdirSync(path.join(expDir, 'scripts', 'passive'), { recursive: true });
    fs.writeFileSync(path.join(expDir, 'config.json'), JSON.stringify({
        rounds: 1, config_override: { max_turns: 10 },
        agents: [{ id: "Bob-1", location: "SYS-X0-Y0", system_prompt: "Vater" }]
    }));
    execSync(`cp -r bob_os/_verse/tools/* ${path.join(verseDir, 'tools/')}`);
    execSync(`cp -r bob_os/core/* ${coreDir}/`);
    
    execSync(`python3 core/bin/init_db.py`, { 
        cwd: expDir, 
        env: { ...process.env, PYTHONPATH: expDir } 
    });
    
    // Nur Bob-1
    fs.writeFileSync(path.join(verseDir, 'population.json'), JSON.stringify({
        version: 1,
        agents: [ { id: "Bob-1", location: "SYS-X0-Y0", status: "active", system_prompt: "Vater" } ]
    }));

    execSync(`node sim_engine/runner.js ${expName}`, { stdio: 'inherit' });
    
    const urState = JSON.parse(fs.readFileSync(path.join(expDir, 'state.json'), 'utf8'));
    const urHist = urState.histories['Bob-1'];
    
    if (!urHist) throw new Error("Bob-1 Historie fehlt.");
    const urBoot = urHist.find(h => h.text.includes("[SYSTEM BOOT"));
    if (!urBoot || !urBoot.text.includes("[SYSTEM BOOT SEQUENZ ABGESCHLOSSEN]")) throw new Error("Ur-Bob Boot fehlt.");
    if (!urBoot.text.includes("Identität: Bob-1")) throw new Error("Ur-Bob Identität falsch.");
    if (urBoot.text.includes("Abstammung: Klon")) throw new Error("Ur-Bob sollte keine Abstammung haben.");
    if (!urBoot.text.includes("matter_limit")) throw new Error("Ur-Bob Omni-Dashboard fehlt.");

    console.log("✅ Runner Boot-Sequenz (Ur-Bob) Test erfolgreich!");
    
    // Cleanup
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
} catch(e) {
    console.error("❌ Test fehlgeschlagen:\n", e);
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
    process.exit(1);
}
