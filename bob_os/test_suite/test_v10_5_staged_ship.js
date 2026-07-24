const { processActions } = require('../../sim_engine/utils/environment.js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootMockDir = './test_env_staged_ship';
const mockDir = path.join(rootMockDir, '_verse');
const dbPath = path.join(mockDir, 'universe.db');

if (fs.existsSync(rootMockDir)) fs.rmSync(rootMockDir, { recursive: true, force: true });
fs.mkdirSync(rootMockDir, { recursive: true });
fs.mkdirSync(mockDir, { recursive: true });

// Symlink zur Core-Engine erstellen
fs.symlinkSync(path.resolve('bob_os/core'), path.resolve(rootMockDir, 'core'), 'dir');

console.log("Starte unbestechlichen E2E-Workflow-Test für Etappen-Schiffsbau...");

// 1. Initialisiere eine frische Test-Datenbank per init_db.py
try {
    execSync(`TEST_DB_PATH=${dbPath} PYTHONPATH=bob_os python3 bob_os/core/bin/init_db.py`, { stdio: 'pipe' });
} catch (e) {
    console.error("Datenbank-Initialisierung fehlgeschlagen:", e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
}

// 2. Führe die Migrationslogik aus, um die Spalten für das Etappenbau-System zu verifizieren
try {
    execSync(`TEST_DB_PATH=${dbPath} PYTHONPATH=bob_os python3 -m core.lib.migrations`, { stdio: 'pipe' });
    console.log("[SUCCESS] Datenbank-Migration fehlerfrei angewendet.");
} catch (e) {
    console.error("Datenbank-Migration fehlgeschlagen:", e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
}

// 3. Seede die Testdaten
const seedScriptPath = path.join(rootMockDir, 'seed_staged_db.py');
const seedScriptContent = `
import os
import sqlite3

db_path = os.environ.get('TEST_DB_PATH', 'test_env_staged_ship/_verse/universe.db')
conn = sqlite3.connect(db_path)
# Seede ein System mit ausreichend veredelter Materie im Depot
conn.execute("INSERT OR IGNORE INTO systems (name, x, y, extractable_matter_in_core, raw_matter_depot, refined_matter_depot, energy_depot) VALUES ('SYS-A', 0, 0, 10000, 1000, 5000, 1000)")
conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health) VALUES (1, 'SYS-A', 'shipyard', 'active', 1, 100)")
conn.execute("INSERT INTO infrastructure (id, system_name, type, status, level, health) VALUES (2, 'SYS-A', 'sem_matrix', 'active', 1, 100)")
conn.execute("INSERT INTO agents (id, chosen_name, host_id, host_type, status, current_x, current_y, active_ship_id) VALUES ('Instance-1', 'Robert', '2', 'matrix', 'active', 0, 0, NULL)")
conn.commit()
conn.close()
print("[SEED SUCCESS] Testdaten injiziert.")
`;

try {
    fs.writeFileSync(seedScriptPath, seedScriptContent.trim());
    execSync(`TEST_DB_PATH=${dbPath} python3 ${seedScriptPath}`, { stdio: 'pipe' });
    fs.unlinkSync(seedScriptPath);
} catch (e) {
    console.error("Datenbank-Seeding fehlgeschlagen:", e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
}

// Hilfsfunktion zum Abfeuern von Bob-Befehlen
function runBobAction(actionString) {
    const pythonCmd = `TEST_DB_PATH=${dbPath} PYTHONPATH=bob_os:test_env_staged_ship/core VERSE_DIR=test_env_staged_ship BOB_CYCLE=1 BOB_ID=Instance-1 python3 -m core.bin.bob "${actionString}"`;
    try {
        const out = execSync(pythonCmd, { encoding: 'utf8' });
        return out;
    } catch (e) {
        return e.stdout ? e.stdout.toString() : e.message;
    }
}

// VERIFIKATIONS-WORKFLOW

// Schritt 1: Speichere einen neuen Gitter-Blueprint namens "E2E-Carrier" (Kosten: 3800 refined_matter)
console.log("\nSchritt 1: Blueprint erstellen...");
const designOutput = runBobAction('save_blueprint(name="E2E-Carrier", matrix_json="[[\\"engine\\", \\"cargo\\"], [\\"logic_core\\", \\"battery\\"]]")');
if (!designOutput.includes("[SUCCESS] Blueprint 'E2E-Carrier' successfully saved")) {
    console.error("FEHLER beim Speichern des Blueprints:", designOutput);
    process.exit(1);
}
console.log("  ✅ Blueprint erfolgreich in Sektor-Wiki registriert.");

// Schritt 2: Etappenbau starten. Zahle 1000 refined_matter an (Teilbetrag)
console.log("\nSchritt 2: Anzahlung von 1000 refined_matter einreichen...");
const buildPartialOutput = runBobAction('build_ship(blueprint_name="E2E-Carrier", matter_to_invest=1000)');
if (!buildPartialOutput.includes("Invested 1000 refined_matter in E2E-Carrier construction. Progress: 1000/2250.")) {
    console.error("FEHLER beim Teil-Bau:", buildPartialOutput);
    process.exit(1);
}
console.log("  ✅ Anzahlung fehlerfrei verbucht.");

// Schritt 3: Einstiegs-Schutz prüfen (me.board() muss fehlschlagen!)
console.log("\nSchritt 3: Boarding-Blockade während der Konstruktion verifizieren...");
const boardDeniedOutput = runBobAction('board(ship_id=1)');
if (!boardDeniedOutput.includes("[DENIED] Cannot board. Ship 'Ship-1' (ID: 1) is still under construction!")) {
    console.error("FEHLER: Bordschutz hat unfertiges Schiff fälschlicherweise freigegeben!", boardDeniedOutput);
    process.exit(1);
}
console.log("  ✅ Unfertiges Schiff wirksam gegen Einstieg gesperrt.");

// Schritt 4: Zweite Rate einzahlen (1000 refined_matter)
console.log("\nSchritt 4: Zweite Rate von 1000 refined_matter einzahlen...");
const buildSecondOutput = runBobAction('build_ship(blueprint_name="E2E-Carrier", matter_to_invest=1000)');
if (!buildSecondOutput.includes("Progress: 2000/2250.")) {
    console.error("FEHLER bei zweiter Einzahlung:", buildSecondOutput);
    process.exit(1);
}
console.log("  ✅ Zweite Rate erfolgreich verbucht.");

// Schritt 5: Restzahlung bis zur Fertigstellung (250 refined_matter)
console.log("\nSchritt 5: Restliche 250 refined_matter einzahlen und fertigstellen...");
const buildCompleteOutput = runBobAction('build_ship(blueprint_name="E2E-Carrier", matter_to_invest=250)');
if (!buildCompleteOutput.includes("built successfully!")) {
    console.error("FEHLER bei Fertigstellung:", buildCompleteOutput);
    process.exit(1);
}
console.log("  ✅ Schiff erfolgreich im Trockendock vollendet.");

// Schritt 6: Einstieg nach Fertigstellung verifizieren (me.board() muss klappen!)
console.log("\nSchritt 6: Boarding nach vollendetem Bau verifizieren...");
const boardSuccessOutput = runBobAction('board(ship_id=1)');
if (!boardSuccessOutput.includes("[SUCCESS] Boarded ship 'Ship-1' (ID: 1).")) {
    console.error("FEHLER: Boarding schlug nach Fertigstellung fehl!", boardSuccessOutput);
    process.exit(1);
}
console.log("  ✅ Boarding glückte fehlerfrei. Klon Robert hat das Steuer übernommen.");

// Schritt 7: Aussteigen
runBobAction('exit_ship()');

// Schritt 8: Etappenbau-Recycling & 100%-Refunding verifizieren
console.log("\nSchritt 7: 100%-Rückerstattung bei unfertigem Abbau prüfen...");
// Starte neues Schiff im Etappenbau (Scout mit 400 raw_matter Anzahlung)
runBobAction('build_ship(blueprint_name="Scout", matter_to_invest=400)');
// Prüfe Depot-Inhalt vor Abbau via synchroner Python-Abfrage
const beforeDeconstructDb = execSync(`python3 -c "import sqlite3; conn = sqlite3.connect('${dbPath}'); print(conn.execute(\\"SELECT raw_matter_depot FROM systems WHERE name='SYS-A'\\").fetchone()[0])"`).toString().trim();

// Führe Abbau durch
const deconstructOutput = runBobAction('deconstruct_ship(ship_id=2)');
if (!deconstructOutput.includes("Refunded 400 raw_matter (100% of progress) to Sektor Depot.")) {
    console.error("FEHLER bei 100%-Rückerstattung des unfertigen Schiffs:", deconstructOutput);
    process.exit(1);
}

// Prüfe Depot-Inhalt nach Abbau via synchroner Python-Abfrage
const afterDeconstructDb = execSync(`python3 -c "import sqlite3; conn = sqlite3.connect('${dbPath}'); print(conn.execute(\\"SELECT raw_matter_depot FROM systems WHERE name='SYS-A'\\").fetchone()[0])"`).toString().trim();
const refundDelta = parseInt(afterDeconstructDb) - parseInt(beforeDeconstructDb);
if (refundDelta !== 400) {
    console.error(`FEHLER: Physische Rückerstattung in DB stimmt nicht überein! Erwartet: 400, Erhalten: ${refundDelta}`);
    process.exit(1);
}
console.log("  ✅ 100%-Salvage-Refundierung bei unfertigem Abbau verifiziert (400 raw_matter erstattet).");

console.log("\n🎉 ALL TESTS IN STAGED CONSTRUCTION TEST SUITE PASSED SUCCESSFULLY!");

// Müllabfuhr
if (fs.existsSync(rootMockDir)) fs.rmSync(rootMockDir, { recursive: true, force: true });
process.exit(0);
