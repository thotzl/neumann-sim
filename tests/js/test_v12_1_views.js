const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("==================================================");
console.log("🚀 STARTING TCK-121 DATABASE VIEWS UNIT TESTS");
console.log("==================================================");

const tempDir = path.resolve(__dirname, 'temp_tck_121_test');
const dbPath = path.join(tempDir, 'test_views.db');

if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

const db = new sqlite3.Database(dbPath);

try {
    // 1. Load and execute migrations
    console.log("Step 1: Loading SQL migrations 0001, 0002, and 0003...");
    const migration0001 = fs.readFileSync(path.join(__dirname, '../../src/bob_os/core/migrations/0001_ground_zero.sql'), 'utf8');
    const migration0002 = fs.readFileSync(path.join(__dirname, '../../src/bob_os/core/migrations/0002_add_emergency_beacons.sql'), 'utf8');
    const migration0003 = fs.readFileSync(path.join(__dirname, '../../src/bob_os/core/migrations/0003_unified_views.sql'), 'utf8');

    db.serialize(() => {
        db.exec(migration0001);
        db.exec(migration0002);
        db.exec(migration0003, (err) => {
            if (err) {
                console.error("❌ Migration failed:", err.message);
                process.exit(1);
            }
            console.log("✅ Migrations executed successfully.");

            // 2. Populate reference data
            console.log("Step 2: Seeding test records (systems, infrastructure, ships, agents, blueprints)...");
            db.serialize(() => {
                db.run("INSERT INTO systems (name, x, y, depot_matter_capacity, depot_energy_capacity, raw_matter_depot, energy_depot) VALUES ('SYS_X0_Y0', 0, 0, 5000, 10000, 1200, 8000)");
                db.run("INSERT INTO infrastructure (id, system_name, type, status) VALUES (10, 'SYS_X0_Y0', 'sem_matrix', 'active')");
                db.run("INSERT INTO ships (id, name, chassis, system_name, raw_matter_inventory, refined_matter_inventory, energy_inventory, energy_capacity, matter_storage_capacity, blueprint_name) VALUES (1, 'ShipA', 'Scout', 'SYS_X0_Y0', 100, 200, 300, 1000, 500, 'Scout')");
                db.run("INSERT INTO blueprints (name, stats_json) VALUES ('Scout', '{\"mass\":290,\"max_speed\":34.48}')");

                db.run("INSERT INTO agents (id, chosen_name, host_id, host_type, status) VALUES ('agent_ship', 'Pilot-Bob', '1', 'ship', 'docked')");
                db.run("INSERT INTO agents (id, chosen_name, host_id, host_type, status) VALUES ('agent_matrix', 'Server-Bob', '10', 'matrix', 'idle')");
                db.run("INSERT INTO agents (id, chosen_name, host_id, host_type, status) VALUES ('agent_traveller', 'Voyager-Bob', null, null, 'traveling')", () => {

                    // 3. Test: Verify v_agents dynamic mappings
                    console.log("Step 3: Querying and validating v_agents view...");
                    db.all("SELECT * FROM v_agents ORDER BY id ASC", (err, rows) => {
                        assert.strictEqual(err, null, `Error querying v_agents: ${err?.message}`);
                        assert.strictEqual(rows.length, 3, `Expected 3 agents, found ${rows.length}`);

                        // 3.1 Validate Interstellar traveler
                        const traveller = rows.find(r => r.id === 'agent_traveller');
                        assert.strictEqual(traveller.location, 'Interstellar', "Traveling agent location must be 'Interstellar'");

                        // 3.2 Validate Ship-hosted Agent
                        const shipAgent = rows.find(r => r.id === 'agent_ship');
                        assert.strictEqual(shipAgent.location, 'SYS_X0_Y0', "Ship-hosted agent location resolution failed");
                        assert.strictEqual(shipAgent.raw_matter_inventory, 100, "Ship raw matter inventory resolution failed");
                        assert.strictEqual(shipAgent.refined_matter_inventory, 200, "Ship refined matter inventory resolution failed");
                        assert.strictEqual(shipAgent.energy_inventory, 300, "Ship energy inventory resolution failed");
                        assert.strictEqual(shipAgent.energy_capacity, 1000, "Ship energy capacity resolution failed");
                        assert.strictEqual(shipAgent.matter_storage_capacity, 500, "Ship matter capacity resolution failed");

                        // 3.3 Validate Matrix-hosted Agent
                        const matrixAgent = rows.find(r => r.id === 'agent_matrix');
                        assert.strictEqual(matrixAgent.location, 'SYS_X0_Y0', "Matrix-hosted agent location resolution failed");
                        assert.strictEqual(matrixAgent.raw_matter_inventory, 1200, "Matrix raw matter inventory (system depot) failed");
                        assert.strictEqual(matrixAgent.energy_inventory, 8000, "Matrix energy inventory (system depot) failed");
                        assert.strictEqual(matrixAgent.energy_capacity, 10000, "Matrix energy capacity (system capacity) failed");
                        assert.strictEqual(matrixAgent.matter_storage_capacity, 5000, "Matrix matter capacity (system capacity) failed");

                        console.log("✅ v_agents verification passed.");

                        // 4. Test: Verify v_ships blueprint statistics join
                        console.log("Step 4: Querying and validating v_ships view...");
                        db.get("SELECT * FROM v_ships WHERE id = 1", (err, row) => {
                            assert.strictEqual(err, null, `Error querying v_ships: ${err?.message}`);
                            assert.ok(row, "Ship row not found in v_ships");
                            assert.strictEqual(row.name, 'ShipA', "Ship name mapping failed");
                            assert.ok(row.blueprint_stats_json.includes('"mass":290'), "Ship blueprint statistics join failed");

                            console.log("✅ v_ships verification passed.");

                            // Clean up
                            db.close(() => {
                                fs.rmSync(tempDir, { recursive: true, force: true });
                                console.log("\n🎉 ALL DATABASE VIEWS UNIT TESTS PASSED SUCCESSFULLY!");
                                process.exit(0);
                            });
                        });
                    });
                });
            });
        });
    });

} catch (e) {
    console.error("\n❌ Database views unit test failed:", e.message);
    db.close(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
        process.exit(1);
    });
}
