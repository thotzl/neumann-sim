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
        { name: "Python Core Services", cmd: "python3 bob_os/test_suite/test_core_services.py" },
        { name: "Python Bob SDK & Security", cmd: "python3 -m unittest discover -s bob_os/test_suite/sdk_tests -p 'test_*.py'" },
        { name: "Python Physics v3 (Geometry)", cmd: "python3 -m unittest discover -s bob_os/test_suite -p 'test_v3_*.py'" },
        { name: "Python Logistics v3.1 (Transit)", cmd: "python3 bob_os/test_suite/test_v3_1_logistics.py" },
        { name: "JS Environment Core", cmd: "node bob_os/test_suite/test_environment.js" },
        { name: "JS Parser Isolation", cmd: "node bob_os/test_suite/test_environment_replace.js" },
        { name: "Meta-Pipeline (Build/Inject)", cmd: "node bob_os/test_suite/test_pipeline.js" },
        { name: "Runner Hard-Boot & Inheritance", cmd: "node bob_os/test_suite/test_runner_boot.js" },
        { name: "E2E Mock Simulation Loop", cmd: "node sim_engine/test_e2e.js" }
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
