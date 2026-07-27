const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function reset() {
    const expName = process.argv[2];
    if (!expName) {
        console.log("Usage: node reset.js <experiment_name>");
        process.exit(1);
    }

    const expDir = path.join(__dirname, 'experiments', expName);
    const configFile = path.join(expDir, 'config.json');

    if (!fs.existsSync(configFile)) {
        console.error(`[ERROR] Experiment '${expName}' existiert nicht oder besitzt kein config.json.`);
        process.exit(1);
    }

    console.log(`[RESET] Backe Konfiguration für '${expName}' auf...`);
    const configContent = fs.readFileSync(configFile, 'utf8');

    console.log(`[RESET] Lösche komplettes Experiment-Verzeichnis '${expDir}'...`);
    if (fs.existsSync(expDir)) {
        fs.rmSync(expDir, { recursive: true, force: true });
    }

    console.log(`[RESET] Baue frische Struktur mit 'build.py' auf...`);
    try {
        // Erzeuge ein temporäres Dummy-Experiment über den Builder
        execSync(`python3 bob_os/build.py ${expName} --rounds 1 --mission "temp" --skip-tests`, {
            stdio: 'inherit'
        });
    } catch (e) {
        console.error(`[ERROR] Rebuild über 'build.py' fehlgeschlagen:`, e.message);
        process.exit(1);
    }

    console.log(`[RESET] Setze die gesicherte Original-Konfiguration wieder ein...`);
    fs.writeFileSync(configFile, configContent, 'utf8');

    // WICHTIG: Lösche die Dummy-Datenbank, da sie auf der falschen (Dummy-)Config basiert
    const dbFile = path.join(expDir, '_verse', 'universe.db');
    if (fs.existsSync(dbFile)) {
        fs.unlinkSync(dbFile);
    }

    // NEU: Initialisiere die leeren Tabellenstrukturen frisch in der gelöschten Datenbank!
    // Dadurch existieren alle Tabellen (systems, agents, etc.), sind aber völlig leer.
    // Wenn der Runner startet, kann er sie fehlerfrei basierend auf der restaurierten config.json seeden!
    console.log(`[RESET] Erzeuge leere Tabellenstrukturen (init_db.py)...`);
    try {
        const initScript = path.join(expDir, 'core', 'bin', 'init_db.py');
        execSync(`python3 ${initScript}`, {
            env: { ...process.env, PYTHONPATH: expDir },
            stdio: 'inherit'
        });
    } catch (e) {
        console.error(`[ERROR] Erzeugung des Datenbank-Schemas fehlgeschlagen:`, e.message);
        process.exit(1);
    }

    // Lösche auch die neu generierte state.json, um einen sauberen Hard-Boot zu erzwingen
    const stateFile = path.join(expDir, 'state.json');
    if (fs.existsSync(stateFile)) {
        fs.unlinkSync(stateFile);
    }

    console.log(`\n🎉 [SUCCESS] Experiment '${expName}' wurde erfolgreich zurückgesetzt!`);
    console.log(`Die Code-Hüllen (core & sim_engine) wurden frisch synchronisiert, während deine config.json zu 100% erhalten blieb.`);
    console.log(`Starte den Lauf einfach wieder mit: npm run sim ${expName}`);
}

reset();
