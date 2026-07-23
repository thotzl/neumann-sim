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

    try {
        // - Erstelle Test-Experiment (Nutze build.py für korrekte Struktur)
        console.log("- Erstelle Test-Experiment...");
        if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
        execSync(`python3 bob_os/build.py ${version} --rounds 3 --skip-tests --mission "E2E Test Mission"`, { stdio: 'inherit' });

        // Wir modifizieren die Config so, dass das Token-Limit extrem niedrig ist, 
        // um eine Destillation nach 3 Runden zu erzwingen.
        const configPath = path.join(expDir, 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.config_override = { model: "gemini-1.5-flash", token_limit: 100 }; // Extrem niedrig
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        console.log("- Starte Runner mit API-Mock...");
        process.env.E2E_MOCK = 'true';
        
        // HINWEIS: Wir machen KEINEN manuellen DB-Insert mehr. 
        // Die runner.js MUSS den Agenten aus der config.json via init_db.py --seed anlegen.

        try {
            const runnerOutput = execSync(`node sim_engine/runner.js ${version}`, { encoding: 'utf8' });
            if (runnerOutput.includes("FEHLER") || runnerOutput.includes("Error")) {
                console.error("Runner meldet interne Fehler:\n", runnerOutput);
                process.exit(1);
            }
        } catch (e) {
            console.error("Runner Absturz:", e.message);
            process.exit(1);
        }

        console.log("- Validiere Ergebnisse in der Datenbank...");
        const db = new sqlite3.Database(dbPath);
        
        // Der Agent 'Instance-1' (Default ID von build.py) muss existieren und Materie gesammelt haben.
        db.get("SELECT s.raw_matter_inventory, s.energy_inventory, a.active_ship_id FROM agents a JOIN ships s ON a.active_ship_id = s.id WHERE a.id='Instance-1'", (err, row) => {
            if (err) throw err;
            if (!row) throw new Error("Agent 'Instance-1' wurde nicht in der DB angelegt! [PRERUN FAIL]");
            
            console.log(`  Instance-1 Status: Matter=${row.raw_matter_inventory}, Energy=${row.energy_inventory}, Ship=${row.active_ship_id}`);

            // In 3 Runden baut der Mock 3x ab (300M).
            if (row.raw_matter_inventory < 100) throw new Error(`Instance hat nicht die erwartete Materie (Hat: ${row.raw_matter_inventory}, Soll: >=100)`);
            
            // Validiere, ob das Gedächtnis destilliert wurde
            console.log("- Validiere Gedächtnis-Destillation...");
            const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            const history = state.histories['Instance-1'];
            const hasExtract = history.some(h => h.text.includes('[GEDÄCHTNIS-EXTRAKT]'));
            if (!hasExtract) {
                throw new Error("❌ Destillation wurde nicht ausgeführt, obwohl Token-Limit extrem niedrig war!");
            }
            console.log("  ✅ Distillation erfolgreich getriggert und gespeichert.");

            db.get("SELECT extractable_matter_in_core FROM systems WHERE name='Alpha_Centauri'", (err, sysRow) => {
                if (err) throw err;
                console.log(`  System Ressourcen: ${sysRow.extractable_matter_in_core}`);
                if (sysRow.extractable_matter_in_core >= 10000) throw new Error("Kern-Ressourcen wurden nicht abgebaut!");
                
                console.log("✅ E2E Mock-Loop, Boot-Sequenz und Memory-Management erfolgreich abgeschlossen.");
                db.close();
            });
        });

    } catch (error) {
        console.error("❌ E2E Test fehlgeschlagen:", error.message);
        process.exit(1);
    }
}

runE2ETest();
