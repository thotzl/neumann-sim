const { execSync } = require('child_process');

function runTest(name, command) {
    console.log(`\n--- Running ${name} ---`);
    console.log(`Command: ${command}`);
    try {
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${name} passed.`);
        return true;
    } catch (e) {
        console.error(`\n❌ ${name} FAILED.`);
        return false;
    }
}

async function start() {
    console.log("==========================================");
    console.log("   BOB-OS CENTRAL TEST HUB (CI)           ");
    console.log("==========================================\n");

    const tests = [
        { name: "Python Core Services", cmd: "PYTHONPATH=bob_os python3 tests/python/test_core_services.py" },
        { name: "Python Bob SDK & Security", cmd: "PYTHONPATH=bob_os python3 -m unittest discover -s tests/python/sdk_tests -p 'test_*.py'" },
        { name: "Python Physics v3 (Geometry)", cmd: "PYTHONPATH=bob_os python3 -m unittest discover -s tests/python -p 'test_v3_*.py'" },
        { name: "Python Logistics v3.1 (Transit)", cmd: "PYTHONPATH=bob_os python3 tests/python/test_v3_1_logistics.py" },
        { name: "Python Ship Balancing Simulation", cmd: "PYTHONPATH=bob_os python3 sim_engine/verify_ship_balancing.py" },
        { name: "Python Economy Balancing Simulation", cmd: "PYTHONPATH=bob_os python3 sim_engine/verify_economy_balancing.py" },
        { name: "JS Environment Core", cmd: "node tests/js/test_environment.js" },
        { name: "JS Parser Isolation", cmd: "node tests/js/test_environment_replace.js" },
        { name: "JS Diary-Only Memory", cmd: "node tests/js/test_diary_only.js" },
        { name: "JS Bracket-Counting Parser", cmd: "node tests/js/test_parser_brackets.js" },
        { name: "JS Ship-Workflow E2E", cmd: "node tests/js/test_v10_5_ship_workflow_e2e.js" },
        { name: "JS Staged Ship-Construction", cmd: "node tests/js/test_v10_5_staged_ship.js" },
        { name: "JS SCUT Name-First Inbox Formatting", cmd: "node tests/js/test_v10_5_scut_name_formatting.js" },
        { name: "JS Sandbox Isolation & NameError Fix", cmd: "node tests/js/test_v10_5_sandbox_isolation.js" },
        { name: "JS Matrix-Sleep E2E", cmd: "node tests/js/test_v10_5_matrix_sleep_e2e.js" },
        { name: "JS Adaptive Memory Escalation", cmd: "node tests/js/test_v10_5_memory_escalation.js" },
        { name: "JS Standby Wakeup Manager Unit", cmd: "node tests/js/test_v10_6_wakeup_manager.js" },
        { name: "JS Decentralized Clone Compression", cmd: "node tests/js/test_v10_6_clone_compression.js" },
        { name: "Meta-Pipeline (Build/Inject)", cmd: "node tests/js/test_pipeline.js" },
        { name: "Runner Hard-Boot & Inheritance", cmd: "node tests/js/test_runner_boot.js" },
        { name: "E2E Mock Simulation Loop", cmd: "node tests/js/test_e2e.js" },
        { name: "Swarm Integration Test (ACL/Transit/Automation)", cmd: "node tests/js/test_swarm_e2e.js" }
    ];

    let allPassed = true;
    for (const t of tests) {
        if (!runTest(t.name, t.cmd)) {
            allPassed = false;
            break; // Fail fast
        }
    }

    if (allPassed) {
        console.log("\n==========================================");
        console.log("   🎉 ALL TESTS PASSED SUCCESSFULLY!      ");
        console.log("==========================================\n");
        process.exit(0);
    } else {
        console.log("\n==========================================");
        console.log("   🚨 CI PIPELINE FAILED!                 ");
        console.log("==========================================\n");
        process.exit(1);
    }
}

start();
