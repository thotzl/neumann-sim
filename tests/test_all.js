// Central test hub. Runs every registered suite, prints a summary table and
// exits non-zero if any suite failed. `--fail-fast` stops at the first failure.
// Suites are declarative: no shell, env vars are passed via the child options.
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PYTHON = process.env.BOB_PYTHON || 'python3';
const PY_ENV = { PYTHONPATH: [path.join(ROOT, 'src', 'bob_os'), path.join(ROOT, 'src')].join(path.delimiter) };

const py = (name, ...args) => ({ name, bin: PYTHON, args, env: PY_ENV });
const pyDiscover = (name, dir, pattern) => py(name, '-m', 'unittest', 'discover', '-s', dir, '-p', pattern);
const js = (name, file) => ({ name, bin: process.execPath, args: [file] });

const SUITES = [
    py("Python Core Services", 'tests/python/test_core_services.py'),
    py("Python Script Registry Kernel Scripts (TCK-145)", 'tests/python/test_script_registry.py'),
    pyDiscover("Python Bob SDK & Security", 'tests/python/sdk_tests', 'test_*.py'),
    // Also covers test_v3_1_logistics, test_v3_2_dashboard, test_v3_naming, test_v3_privacy
    pyDiscover("Python Physics v3 (Geometry, Logistics, Dashboard, Naming, Privacy)", 'tests/python', 'test_v3_*.py'),
    py("Python Physics Service Unit", 'tests/python/test_physics_service.py'),
    py("Python P2P Transfer", 'tests/python/test_transfer.py'),
    py("Python Ship Transit (Physics Update)", 'tests/python/test_v10_physics_ship_transit.py'),
    py("Python Outsourced Binaries", 'tests/python/test_outsourced_binaries.py'),
    py("Python Seeder Integration (Test/Prod)", 'tests/python/test_seeder.py'),
    py("Python Generator Parity", 'tests/python/test_generator_parity.py'),
    py("Python V8 Syntax", 'tests/python/test_v8_syntax.py'),
    py("Python Ship Balancing Simulation", 'tests/balancing/verify_ship_balancing.py'),
    py("Python Economy Balancing Simulation", 'tests/balancing/verify_economy_balancing.py'),
    js("JS Environment Core", 'tests/js/test_environment.js'),
    js("JS Parser Isolation", 'tests/js/test_environment_replace.js'),
    js("JS Diary-Only Memory", 'tests/js/test_diary_only.js'),
    js("JS Bracket-Counting Parser", 'tests/js/test_parser_brackets.js'),
    js("JS Stardate & Round Counting Unit", 'tests/js/test_stardate_counting.js'),
    js("JS Round Order Execution Sequence Integration", 'tests/js/test_execution_order_sequence.js'),
    js("JS IO Helpers Unit", 'tests/js/test_io_helpers.js'),
    js("JS ACL Service Unit", 'tests/js/test_acl_service.js'),
    js("JS Action Parser Unit", 'tests/js/test_action_parser.js'),
    js("JS RUN Allowlist & Safe Exec (TCK-138)", 'tests/js/test_run_allowlist.js'),
    js("JS Ticket Sync & Index (TCK-137)", 'tests/js/test_ticket_sync.js'),
    js("JS VoG Server Hardening (TCK-140)", 'tests/js/test_vog_server.js'),
    js("JS Child Env Secret Isolation (TCK-139)", 'tests/js/test_child_env_isolation.js'),
    js("JS AI Drivers & Bridge (TCK-146)", 'tests/js/test_ai_drivers.js'),
    js("Docs: Markdown Link Check (TCK-150)", 'tests/js/test_doc_links.js'),
    js("JS Scripts Registry Migration / inject migrate (TCK-145)", 'tests/js/test_scripts_registry_migration.js'),
    js("JS Mailbox Service Unit", 'tests/js/test_mailbox_service.js'),
    js("JS Physics Round Service Unit", 'tests/js/test_physics_round_service.js'),
    js("JS Agent Turn Service Unit", 'tests/js/test_agent_turn_service.js'),
    js("JS Birth Log", 'tests/js/test_birth_log.js'),
    js("JS Engine Helpers (Config/Logger/State Manager)", 'tests/js/test_engine_helpers.js'),
    js("JS Ship-Workflow E2E", 'tests/js/test_v10_5_ship_workflow_e2e.js'),
    js("JS Interstellar Energy Stranding E2E", 'tests/js/test_v13_3_energy_stranding_e2e.js'),
    js("JS Sleep Kinematics E2E", 'tests/js/test_v13_8_sleep_kinematics_e2e.js'),
    js("JS Hardware Autonomy (V14)", 'tests/js/test_v14_hardware_autonomy.js'),
    js("JS Safety Grid (V14)", 'tests/js/test_v14_safety_grid.js'),
    js("JS Staged Ship-Construction", 'tests/js/test_v10_5_staged_ship.js'),
    js("JS SCUT Name-First Inbox Formatting", 'tests/js/test_v10_5_scut_name_formatting.js'),
    js("JS Sandbox Isolation & NameError Fix", 'tests/js/test_v10_5_sandbox_isolation.js'),
    js("JS Matrix-Sleep E2E", 'tests/js/test_v10_5_matrix_sleep_e2e.js'),
    js("JS Adaptive Memory Escalation", 'tests/js/test_v10_5_memory_escalation.js'),
    js("JS Standby Wakeup Manager Unit", 'tests/js/test_v10_6_wakeup_manager.js'),
    js("JS Decentralized Clone Compression", 'tests/js/test_v10_6_clone_compression.js'),
    js("Database Migrator Integration", 'tests/js/test_migrations.js'),
    js("SQLite Unified Views Integration", 'tests/js/test_v12_1_views.js'),
    js("Meta-Pipeline (Build/Inject)", 'tests/js/test_pipeline.js'),
    js("Runner Hard-Boot & Inheritance", 'tests/js/test_runner_boot.js'),
    js("E2E Mock Simulation Loop", 'tests/js/test_e2e.js'),
    js("Swarm Integration Test (ACL/Transit/Automation)", 'tests/js/test_swarm_e2e.js')
];

function runSuite(suite) {
    console.log(`\n--- Running ${suite.name} ---`);
    console.log(`Command: ${[suite.bin, ...suite.args].join(' ')}`);
    const started = Date.now();
    const res = spawnSync(suite.bin, suite.args, {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env, ...(suite.env || {}) }
    });
    const ok = !res.error && res.status === 0;
    if (res.error) console.error(`Could not start: ${res.error.message}`);
    console.log(ok ? `✅ ${suite.name} passed.` : `\n❌ ${suite.name} FAILED.`);
    return { name: suite.name, ok, ms: Date.now() - started };
}

function printSummary(results, skipped) {
    const width = Math.max(...SUITES.map(s => s.name.length), 5);
    console.log("\n==========================================");
    console.log("   SUMMARY");
    console.log("==========================================");
    console.log(`${'Suite'.padEnd(width)}  Result  Duration`);
    for (const r of results) {
        console.log(`${r.name.padEnd(width)}  ${(r.ok ? 'PASS' : 'FAIL').padEnd(6)}  ${(r.ms / 1000).toFixed(1).padStart(7)}s`);
    }
    for (const s of skipped) console.log(`${s.name.padEnd(width)}  SKIP`);
    const failed = results.filter(r => !r.ok).length;
    const total = results.reduce((sum, r) => sum + r.ms, 0);
    console.log(`\n${results.length - failed} passed, ${failed} failed, ${skipped.length} skipped (${(total / 1000).toFixed(1)}s)`);
}

function main() {
    const failFast = process.argv.includes('--fail-fast');
    console.log("==========================================");
    console.log("   BOB-OS CENTRAL TEST HUB (CI)           ");
    console.log("==========================================");

    const results = [];
    for (const suite of SUITES) {
        const r = runSuite(suite);
        results.push(r);
        if (!r.ok && failFast) break;
    }
    printSummary(results, SUITES.slice(results.length));

    const allPassed = results.length === SUITES.length && results.every(r => r.ok);
    console.log(allPassed ? "\n🎉 ALL TESTS PASSED SUCCESSFULLY!" : "\n🚨 CI PIPELINE FAILED!");
    process.exit(allPassed ? 0 : 1);
}

main();
