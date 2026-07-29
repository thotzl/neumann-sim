const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log("==================================================");
console.log("🚀 STARTING STANDALONE WAKEUP MANAGER UNIT TESTS");
console.log("==================================================");

// Import components
const wakeupManager = require('../../src/sim_engine/utils/wakeup_manager');
const Database = require('../../src/sim_engine/utils/db');

// Stub Database operations to prevent actual SQLite file writes during unit tests
Database.prototype.run = async function(sql, params) {
    return { lastID: 1, changes: 1 };
};
Database.prototype.close = async function() {
    return;
};

// Create a dummy log file to satisfy logging calls
const dummyLog = path.join(__dirname, 'dummy_standby.log');

async function runTests() {
    try {
        // --- TEST 1: SCUT WAKEUP SENSOR (AWAKE ON INCOMING RADIO MESSAGE) ---
        console.log("Test 1: Verifying SCUT wakeup sensor in Normal Sleep...");
        let agent1 = {
            id: "Instance-1",
            location: "SYS_X0_Y0",
            last_location: "SYS_X0_Y0",
            sleep_state: 1, // Normal Sleep
            sleep_until_cycle: 10,
            sleep_baselines: {
                bobs_count: 0,
                ships_count: 0,
                infra_count: 0,
                active_infra_count: 0,
                core_matter: 1000
            }
        };
        
        let state1 = {
            round: 5,
            global_inbox: {
                "Instance-1": [{ type: 'scut', sender: 'Instance-2', content: "Hello!" }]
            }
        };
        
        // Mock getSectorSnapshot internally using a stub to keep the test standalone/offline
        const originalSnapshot = wakeupManager.getSectorSnapshot;
        wakeupManager.getSectorSnapshot = async function(location, agentId, dbPath) {
            return {
                bobs_count: 0,
                ships_count: 0,
                infra_count: 0,
                active_infra_count: 0,
                core_matter: 1000,
                has_low_health: false,
                priority_scuts: 0
            };
        };

        let skipped = await wakeupManager.handleStandby(agent1, state1, {}, __dirname, dummyLog, "mock_db");
        assert.strictEqual(skipped, false); // False because it woke up!
        assert.strictEqual(agent1.sleep_state, 0);
        assert.strictEqual(agent1.wake_reason, "Incoming sub-etheric radio transmission (SCUT).");
        console.log("  ✅ Normal sleep successfully awakened by incoming SCUT radio message.");

        // --- TEST 2: SCUT DND MUTING BLOCK (DND DAMPENS NORMAL TRANSMISSIONS) ---
        console.log("Test 2: Verifying DND muting block...");
        let agent2 = {
            id: "Instance-1",
            location: "SYS_X0_Y0",
            last_location: "SYS_X0_Y0",
            sleep_state: 2, // DND / Flight-Mode Sleep
            sleep_until_cycle: 10,
            sleep_baselines: {
                bobs_count: 0,
                ships_count: 0,
                infra_count: 0,
                active_infra_count: 0,
                core_matter: 1000
            }
        };
        
        let state2 = {
            round: 5,
            global_inbox: {
                "Instance-1": [{ type: 'scut', sender: 'Instance-2', content: "Hello!" }] // Normal SCUT
            }
        };

        skipped = await wakeupManager.handleStandby(agent2, state2, {}, __dirname, dummyLog, "mock_db");
        assert.strictEqual(skipped, true); // True because it remained sleeping!
        assert.strictEqual(agent2.sleep_state, 2); 
        console.log("  ✅ DND flight-mode sleep successfully muted normal radio message.");

        // --- TEST 3: PRIORITY EMERGENCY OVERRIDE (BYPASS DND LOCKS) ---
        console.log("Test 3: Verifying Priority Emergency Overrides...");
        let agent3 = {
            id: "Instance-1",
            location: "SYS_X0_Y0",
            last_location: "SYS_X0_Y0",
            sleep_state: 2, // DND / Flight-Mode Sleep
            sleep_until_cycle: 10,
            sleep_baselines: {
                bobs_count: 0,
                ships_count: 0,
                infra_count: 0,
                active_infra_count: 0,
                core_matter: 1000
            }
        };
        
        // Mock getSectorSnapshot to return a priority message count of 1 (Emergency beacon)
        wakeupManager.getSectorSnapshot = async function(location, agentId, dbPath) {
            return {
                bobs_count: 0,
                ships_count: 0,
                infra_count: 0,
                active_infra_count: 0,
                core_matter: 1000,
                has_low_health: false,
                priority_scuts: 1 // Priority message!
            };
        };

        skipped = await wakeupManager.handleStandby(agent3, state2, {}, __dirname, dummyLog, "mock_db");
        assert.strictEqual(skipped, false); // False because it woke up!
        assert.strictEqual(agent3.sleep_state, 0); 
        assert.strictEqual(agent3.wake_reason, "Emergency Broadcast Beacon received with critical priority.");
        console.log("  ✅ Priority Emergency Overrides successfully bypassed DND.");

        // --- TEST 4: NAVI WAKEUP SENSOR (AWAKE ON TRAVEL ARRIVAL) ---
        console.log("Test 4: Verifying NAVI wakeup sensor...");
        let agent4 = {
            id: "Instance-1",
            location: "SYS_X0_Y0",
            last_location: "Interstellar", // Arrived!
            sleep_state: 1,
            sleep_until_cycle: 10,
            sleep_baselines: {
                bobs_count: 0,
                ships_count: 0,
                infra_count: 0,
                active_infra_count: 0,
                core_matter: 1000
            }
        };
        
        let state4 = {
            round: 5,
            global_inbox: {} // Clean empty inbox
        };
        
        // Reset snapshot to neutral
        wakeupManager.getSectorSnapshot = async function(location, agentId, dbPath) {
            return {
                bobs_count: 0,
                ships_count: 0,
                infra_count: 0,
                active_infra_count: 0,
                core_matter: 1000,
                has_low_health: false,
                priority_scuts: 0
            };
        };

        skipped = await wakeupManager.handleStandby(agent4, state4, {}, __dirname, dummyLog, "mock_db");
        assert.strictEqual(skipped, false); // False because it woke up!
        assert.strictEqual(agent4.sleep_state, 0);
        assert.strictEqual(agent4.wake_reason, "Transit complete. Reached destination coordinates.");
        console.log("  ✅ Travel arrival correctly triggered NAVI wakeup.");

        // --- TEST 5: DEMOGRAPHIC POPULATION WAKEUP SENSOR (NEW_BOB & NEW_SHIP) ---
        console.log("Test 5: Verifying Demographic wakeup sensor...");
        let agent5 = {
            id: "Instance-1",
            location: "SYS_X0_Y0",
            last_location: "SYS_X0_Y0",
            sleep_state: 1,
            sleep_until_cycle: 10,
            sleep_baselines: {
                bobs_count: 0, // Baseline is 0
                ships_count: 0,
                infra_count: 0,
                active_infra_count: 0,
                core_matter: 1000
            }
        };
        
        // Mock getSectorSnapshot to return a demographic change (1 other Bob arrived)
        wakeupManager.getSectorSnapshot = async function(location, agentId, dbPath) {
            return {
                bobs_count: 1, // Demographic contact!
                ships_count: 0,
                infra_count: 0,
                active_infra_count: 0,
                core_matter: 1000,
                has_low_health: false,
                priority_scuts: 0
            };
        };

        skipped = await wakeupManager.handleStandby(agent5, state4, {}, __dirname, dummyLog, "mock_db");
        assert.strictEqual(skipped, false); // False because it woke up!
        assert.strictEqual(agent5.sleep_state, 0);
        assert.ok(agent5.wake_reason.includes("Demographic contact!"));
        console.log("  ✅ Demographic population changes successfully triggered wakeup.");

        // Restore original functions & clean up
        wakeupManager.getSectorSnapshot = originalSnapshot;
        if (fs.existsSync(dummyLog)) fs.unlinkSync(dummyLog);
        
        console.log("\n🎉 ALL WAKEUP MANAGER STANDALONE UNIT TESTS PASSED SUCCESSFULLY!\n");
        
    } catch (e) {
        console.error("Test execution failed:", e);
        if (fs.existsSync(dummyLog)) fs.unlinkSync(dummyLog);
        process.exit(1);
    }
}

runTests();
