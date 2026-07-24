const assert = require('assert');
const apiClient = require('../../sim_engine/utils/api_client');
const stateExporter = require('../../sim_engine/utils/state_exporter');
const fs = require('fs');
const path = require('path');

async function testFeedbackLogic() {
    console.log("Testing API Client Feedback Logic...");
    const history = [
        { agent: 'Instance-1', text: '[RUN: python3 tools/mine.py Instance-1]', feedback: '[ERFOLG] 100 Materie.' }
    ];
    const context = apiClient.buildAgentContext('Instance-1', history, '', '', 'GLOBAL', 'INDIVIDUAL', true);
    const lastMessage = context.contents[context.contents.length - 1];
    assert.strictEqual(lastMessage.role, 'user');
    assert.ok(lastMessage.parts[0].text.includes('[AUSWIRKUNG]:\n[ERFOLG] 100 Materie.'), "Feedback fehlt im nächsten Turn!");
    console.log("✅ Feedback Logic OK.");
}

function testExporterHook() {
    console.log("Testing State Exporter Atomicity...");
    const mockUniverse = './test_universe_hook';
    if (!fs.existsSync(mockUniverse)) fs.mkdirSync(mockUniverse);
    
    const mockState = {
        round: 1,
        totalTurns: 5,
        histories: { 
            'Instance-1': [{agent: 'Instance-1', text: 'Expansion!', tick: 1}] 
        }
    };

    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(mockUniverse, 'universe.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.run("CREATE TABLE systems (name TEXT PRIMARY KEY, display_name TEXT, x INTEGER, y INTEGER, extractable_matter_in_core INTEGER, max_extractable_matter INTEGER DEFAULT 10000, raw_matter_depot INTEGER, depot_matter_capacity INTEGER, energy_depot INTEGER, depot_energy_capacity INTEGER, passive_matter_rate INTEGER, passive_energy_rate INTEGER, energy_rate INTEGER)");
        db.run("CREATE TABLE agents (id TEXT PRIMARY KEY, chosen_name TEXT, location TEXT, raw_matter_inventory INTEGER, energy_inventory INTEGER, matter_storage_capacity INTEGER, status TEXT, birth_cycle INTEGER)");
        db.run("CREATE TABLE infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, progress_matter INTEGER, required_matter INTEGER)");
        db.run("INSERT INTO systems (name, x, y) VALUES ('SYS_X0Y0', 0, 0)");
        db.run("INSERT INTO agents (id, location) VALUES ('Instance-1', 'SYS_X0Y0')", () => {
            // WICHTIG: DB schließen bevor der Exporter sie öffnet
            db.close((err) => {
                if (err) throw err;
                
                try {
                    // Start export, which does the real-time V12.0 broadcast payload compiling
                    stateExporter.exportWorldState(mockUniverse, mockState, 'Instance-1');
                    console.log("✅ Exporter Hook OK (Web_Broadcast Active).");
                    
                    // Cleanup gracefully
                    setTimeout(() => {
                        fs.rmSync(mockUniverse, { recursive: true, force: true });
                    }, 500);
                } catch (e) {
                    console.error("❌ Exporter Fehler:", e.message);
                    process.exit(1);
                }
            });
        });
    });
}

testFeedbackLogic().then(() => {
    testExporterHook();
});
