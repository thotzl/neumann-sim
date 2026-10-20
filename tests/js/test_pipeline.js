const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

// build.py and inject.js resolve experiments via BOB_EXPERIMENTS_DIR: keep fixtures out of the repo.
const expRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bob-pipeline-'));
process.on('exit', () => fs.rmSync(expRoot, { recursive: true, force: true }));
process.env.BOB_EXPERIMENTS_DIR = expRoot;

const expName = 'pipeline_test';
const expDir = path.join(expRoot, expName);

console.log("Testing Meta-Pipelines (Build & Inject)...");

try {
    // 1. Test: Build WITHOUT Mission MUST fail
    try {
        execSync(`python3 scripts/build.py ${expName} --rounds 1 --skip-tests`, { stdio: 'ignore' });
        throw new Error("Build without mission should have failed!");
    } catch (e) {
        if (!e.message.includes("should have failed")) {
            console.log("  ✅ Build Rejection (Missing args) successful.");
        } else {
            throw e;
        }
    }

    // 2. Test: Normal Build
    try {
        execSync(`python3 scripts/build.py ${expName} --rounds 1 --skip-tests --mission "Test"`, { stdio: 'pipe' });
    } catch (e) {
        console.error("Build Output (stderr):", e.stderr.toString());
        console.error("Build Output (stdout):", e.stdout.toString());
        throw e;
    }

    // 3. Test: Were core and sim_engine copied?
    if (!fs.existsSync(path.join(expDir, 'sim_engine/core/runner.js'))) {
        throw new Error("sim_engine was not copied to the experiment during build!");
    }
    if (!fs.existsSync(path.join(expDir, 'core/lib/db_config.py'))) {
        throw new Error("core/lib was not copied to the experiment during build!");
    }
    console.log("  ✅ Self-contained Build (core & sim_engine copy) successful.");

    // 4. Test: Inject Tool (remove an engine file from the experiment; injection must restore it)
    const injectedFile = path.join(expDir, 'sim_engine/helpers/constants.js');
    fs.unlinkSync(injectedFile);

    execSync(`node scripts/inject.js ${expName} engine`, { stdio: 'ignore' });

    if (!fs.existsSync(injectedFile)) {
        throw new Error("Inject.js did not synchronize the file to the experiment!");
    }
    console.log("  ✅ Injection (Engine Sync) successful.");

    console.log("🎉 Meta-Pipeline Test successful.");
} catch(e) {
    console.error("❌ Pipeline Test failed:", e.message);
    process.exit(1);
}
