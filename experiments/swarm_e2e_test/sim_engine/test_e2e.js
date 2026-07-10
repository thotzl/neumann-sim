const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function runE2ETest() {
    console.log("🚀 Starte E2E Mock-Loop Test...");
    const version = 'e2e_test_run';
    const expDir = path.join(__dirname, '../experiments', version);
    const dbPath = path.join(expDir, '_verse', 'universe.db');
    const statePath = path.join(expDir, 'state.json');
    const configPath = path.join(expDir, 'config.json');

    try {
        if (fs.existsSync(expDir)) {
            fs.rmSync(expDir, { recursive: true, force: true });
        }

        console.log("- Erstelle Test-Experiment...");
        execSync(`python3 bob_os/build.py ${version} --rounds 3 --skip-tests --mission "E2E Test"`, { stdio: 'inherit' });

        // Injiziere extrem niedriges Token-Limit für den Test
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if(!config.config_override) config.config_override = {};
        config.config_override.token_limit = 5; // 5 Tokens (20 Zeichen) provozieren sofortige Destillation
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        console.log("- Starte Runner mit API-Mock...");
        process.env.E2E_MOCK = 'true';
        
        try {
            const runnerOutput = execSync(`node sim_engine/runner.js ${version}`, { encoding: 'utf8' });
            // Harter Check auf verborgene Node.js Runner Fehler
            if (runnerOutput.includes("[SENSOR-ERROR]") || runnerOutput.includes("[RADIO-ERROR]")) {
                throw new Error("Runner produzierte interne Sensor/Radio Fehler:\n" + runnerOutput);
            }
        } catch(e) {
            throw new Error("Runner Crash oder interner Fehler:\n" + (e.stdout || e.message));
        }

        console.log("- Validiere Ergebnisse in der Datenbank...");
        const db = new sqlite3.Database(dbPath);
        
        db.get("SELECT raw_matter_inventory, energy_inventory FROM agents WHERE id='Bob-1'", (err, row) => {
            if (err) throw err;
            console.log(`  Bob-1 Status: Matter=${row.raw_matter_inventory}, Energy=${row.energy_inventory}`);

            // In 3 Runden baut der Mock 3x ab (300M). Energie: 500 - 3*30 + 3*10 = 440.
            if (row.raw_matter_inventory < 100) throw new Error(`Bob hat nicht die erwartete Materie (Hat: ${row.raw_matter_inventory}, Soll: >=100)`);
            if (row.energy_inventory !== 440) throw new Error(`Bob hat falsche Energie (Hat: ${row.energy_inventory}, Soll: 440)`);            
            
            // Validiere, ob das Gedächtnis destilliert wurde
            console.log("- Validiere Gedächtnis-Destillation...");
            const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            const history = state.histories['Bob-1'];
            const hasExtract = history.some(h => h.text.includes('[GEDÄCHTNIS-EXTRAKT]'));
            if (!hasExtract) {
                throw new Error("❌ Destillation wurde nicht ausgeführt, obwohl Token-Limit extrem niedrig war!");
            }
            console.log("  ✅ Distillation erfolgreich getriggert und gespeichert.");

            db.get("SELECT extractable_matter_in_core FROM systems WHERE name='SYS-X0-Y0'", (err, sysRow) => {
                if (err) throw err;
                console.log(`  System Ressourcen: ${sysRow.extractable_matter_in_core}`);
                
                if (sysRow.extractable_matter_in_core >= 10000) throw new Error("Ressourcen wurden nicht abgebaut!");
                console.log("✅ E2E Mock-Loop, Boot-Sequenz und Memory-Management erfolgreich abgeschlossen.");
                db.close();
                fs.rmSync(expDir, { recursive: true, force: true });
            });
        });

    } catch (e) {
        console.error("❌ E2E Test fehlgeschlagen:", e.message);
        process.exit(1);
    }
}

runE2ETest();
