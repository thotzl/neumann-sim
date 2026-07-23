const { processActions } = require('../../sim_engine/utils/environment.js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootMockDir = './test_env_ship_workflow_e2e';
const mockDir = path.join(rootMockDir, '_verse');
const dbPath = path.join(mockDir, 'universe.db');

if (fs.existsSync(rootMockDir)) fs.rmSync(rootMockDir, { recursive: true, force: true });
fs.mkdirSync(rootMockDir, { recursive: true });
fs.mkdirSync(mockDir, { recursive: true });

// Erstelle Symlink zur Core-Engine, um den absoluten Pfad der Sandbox-Umgebung perfekt abzubilden!
fs.symlinkSync(path.resolve('bob_os/core'), path.resolve(rootMockDir, 'core'), 'dir');

console.log("Starte puren E2E-Workflow Test für konfigurierbare Gitter-Schiffe...");

// 1. Initialisiere eine frische Test-Datenbank per init_db.py
try {
    execSync(`TEST_DB_PATH=${dbPath} PYTHONPATH=bob_os python3 bob_os/core/bin/init_db.py`, { stdio: 'pipe' });
} catch (e) {
    console.error("Datenbank-Initialisierung fehlgeschlagen:", e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
}

// 2. Seede die Testdaten über ein temporäres Python-Skript (0 sperrenoffene SQLite-Connections!)
const seedScriptPath = path.join(rootMockDir, 'seed_e2e_db.py');
const seedScriptContent = `
import os
import sqlite3

db_path = os.environ.get('TEST_DB_PATH', 'test_env_ship_workflow_e2e/_verse/universe.db')
conn = sqlite3.connect(db_path)
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
    fs.unlinkSync(seedScriptPath); // Sofortige Müllabfuhr
} catch (e) {
    console.error("Datenbank-Seeding fehlgeschlagen:", e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
}

// 3. E2E Test-Ablauf über pure processActions-Auswertung
let mockState = { security: { acl: {}, wallets: {} } };
const absMockDir = path.resolve(mockDir);

// Setze TEST_DB_PATH und BOB_ID in der Umgebung, damit der Python-Subprozess sich mit der korrekten DB verbindet!
process.env.TEST_DB_PATH = dbPath;
process.env.BOB_ID = 'Instance-1';
process.env.PYTHONPATH = path.resolve('.');

try {
    // --- SCHRITT 0: PRÜFE LEERE BLAUPAUSEN-LISTE (list_blueprints empty info feedback) ---
    const emptyListInput = `
AKTION:
[RUN: me list_blueprints]
`;
    console.log("  0. Führe me.list_blueprints (Leeres Archiv) aus...");
    const feedbackEmptyList = processActions(emptyListInput, absMockDir, "Instance-1", mockState);
    if (!feedbackEmptyList.includes("[INFO] Keine Blaupausen im Sektor-Archiv registriert")) {
        throw new Error("SCHRITT 0 FAILED: Leere Blaupausen-Meldung wurde nicht ausgegeben! Feedback: " + feedbackEmptyList);
    }
    console.log("    ✅ Schritt 0 (Leeres Archiv: Info-Meldung) erfolgreich.");

    // --- SCHRITT A: BLUEPRINT SIMULATION (design_blueprint) ---
    const designInput = `
AKTION:
[RUN: me design_blueprint(name="E2E-Scout", matrix_json='[["logic_core", "engine"], ["battery", null]]')]
`;
    console.log("  1. Führe me.design_blueprint (Planungsphase) aus...");
    const feedbackDesign = processActions(designInput, absMockDir, "Instance-1", mockState);
    if (!feedbackDesign.includes("successfully simulated/planned")) {
        throw new Error("SCHRITT A FAILED: Blueprint-Planung wurde nicht erfolgreich bestätigt! Feedback: " + feedbackDesign);
    }
    console.log("    ✅ Schritt A (Planungsphase: simulated/not saved) erfolgreich.");

    // --- SCHRITT B: BLUEPRINT SPEICHERN (save_blueprint) ---
    const saveInput = `
AKTION:
[RUN: me save_blueprint(name="E2E-Scout", matrix_json='[["logic_core", "engine"], ["battery", null]]')]
`;
    console.log("  2. Führe me.save_blueprint (Speicherphase) aus...");
    const feedbackSave = processActions(saveInput, absMockDir, "Instance-1", mockState);
    if (!feedbackSave.includes("successfully saved to sector database")) {
        throw new Error("SCHRITT B FAILED: Speicherung wurde nicht erfolgreich bestätigt! Feedback: " + feedbackSave);
    }
    console.log("    ✅ Schritt B (Speicherphase: saved) erfolgreich.");

    // --- SCHRITT B-VERIFY: PRÜFE EINTRAG (list_blueprints) ---
    const listInput = `
AKTION:
[RUN: me list_blueprints]
`;
    console.log("  2-Verify. Überprüfe Blueprint-Eintrag über me.list_blueprints...");
    const feedbackList = processActions(listInput, absMockDir, "Instance-1", mockState);
    console.log("    [DIAGNOSTIK] list_blueprints Feedback:\n" + feedbackList);
    if (!feedbackList.includes("E2E-Scout")) {
        throw new Error("SCHRITT B-VERIFY FAILED: Blueprint existiert nicht in der Sektor-Liste! Feedback: " + feedbackList);
    }
    console.log("    ✅ Schritt B-Verify (Eintrag vorhanden) erfolgreich.");

    // --- SCHRITT C: SCHIFFSBAU (build_ship) ---
    const buildInput = `
AKTION:
[RUN: me build_ship(blueprint_name="E2E-Scout")]
`;
    console.log("  3. Führe me.build_ship (Bauphase) aus...");
    const feedbackBuild = processActions(buildInput, absMockDir, "Instance-1", mockState);
    if (!feedbackBuild.includes("built successfully") || !feedbackBuild.includes("Cost: 1750 Depot")) {
        throw new Error("SCHRITT C FAILED: Schiffsbau fehlgeschlagen oder falsche Kosten! Feedback: " + feedbackBuild);
    }
    console.log("    ✅ Schritt C (Bauphase: built with cost: 1750 refined_matter) erfolgreich.");

    // --- SCHRITT C-VERIFY: PRÜFE SPECS & DEPOT-ABZUG (inspect) ---
    const inspectInput = `
AKTION:
[RUN: me inspect(ship_id=1)]
[RUN: me inspect(system_name="SYS-A")]
`;
    console.log("  3-Verify. Inspiziere das neue Schiff und Sektor SYS-A depots...");
    const feedbackInspect = processActions(inspectInput, absMockDir, "Instance-1", mockState);
    if (!feedbackInspect.includes("logic_core: active") || !feedbackInspect.includes("refined_matter_depot: 3250")) {
        throw new Error("SCHRITT C-VERIFY FAILED: Falsche Gitter-Specs oder Depot-Ressourcen nicht abgezogen! Feedback: " + feedbackInspect);
    }
    console.log("    ✅ Schritt C-Verify (Specs & Depot-Abzug verifiziert) erfolgreich.");

    // --- SCHRITT D: RECYCLING (deconstruct_ship) ---
    const deconstructInput = `
AKTION:
[RUN: me deconstruct_ship(ship_id=1)]
`;
    console.log("  4. Führe me.deconstruct_ship (Recyclingphase) aus...");
    const feedbackDec = processActions(deconstructInput, absMockDir, "Instance-1", mockState);
    if (!feedbackDec.includes("deconstructed successfully") || !feedbackDec.includes("Refunded 875 refined_matter")) {
        throw new Error("SCHRITT D FAILED: Recycling oder Erstattung fehlgeschlagen! Feedback: " + feedbackDec);
    }
    console.log("    ✅ Schritt D (Recyclingphase: deconstructed & 50% refunded) erfolgreich.");

    // --- SCHRITT D-VERIFY: PRÜFE ERSTATTETES DEPOT (inspect) ---
    const inspectFinalInput = `
AKTION:
[RUN: me inspect(system_name="SYS-A")]
`;
    console.log("  4-Verify. Inspiziere Sektor-Depots nach Rückerstattung...");
    const feedbackInspectFinal = processActions(inspectFinalInput, absMockDir, "Instance-1", mockState);
    if (!feedbackInspectFinal.includes("refined_matter_depot: 4125")) {
        throw new Error("SCHRITT D-VERIFY FAILED: Rückerstattung von 875 refined_matter wurde nicht gutgeschrieben! Feedback: " + feedbackInspectFinal);
    }
    console.log("    ✅ Schritt D-Verify (Depot-Rückerstattung verifiziert) erfolgreich.");

    console.log("🎉 E2E-SCHIFFS-WORKFLOW INTEGRATIONSTEST ERFOLGREICH!");
    cleanup();
    process.exit(0);

} catch (error) {
    console.error("❌ E2E-SCHIFFS-WORKFLOW TEST FEHLGESCHLAGEN:", error.message);
    cleanup();
    process.exit(1);
}

function cleanup() {
    if (fs.existsSync(rootMockDir)) fs.rmSync(rootMockDir, { recursive: true, force: true });
    delete process.env.TEST_DB_PATH;
    delete process.env.BOB_ID;
}
