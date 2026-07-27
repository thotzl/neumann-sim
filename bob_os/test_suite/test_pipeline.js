const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const expName = 'pipeline_test';
const expDir = path.resolve(`experiments/${expName}`);

console.log("Testing Meta-Pipelines (Build & Inject)...");

try {
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });

    // 1. Test: Build WITHOUT Mission MUST fail
    try {
        execSync(`python3 bob_os/build.py ${expName} --rounds 1 --skip-tests`, { stdio: 'ignore' });
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
        execSync(`python3 bob_os/build.py ${expName} --rounds 1 --skip-tests --mission "Test"`, { stdio: 'pipe' });
    } catch (e) {
        console.error("Build Output (stderr):", e.stderr.toString());
        console.error("Build Output (stdout):", e.stdout.toString());
        throw e;
    }
    
    // 3. Test: Were core and sim_engine copied?
    if (!fs.existsSync(path.join(expDir, 'sim_engine/runner.js'))) {
        throw new Error("sim_engine was not copied to the experiment during build!");
    }
    if (!fs.existsSync(path.join(expDir, 'core/lib/db_config.py'))) {
        throw new Error("core/lib was not copied to the experiment during build!");
    }
    console.log("  ✅ Self-contained Build (core & sim_engine copy) successful.");

    // 4. Test: Inject Tool
    const dummyFile = path.resolve('sim_engine/utils/dummy_inject_test.txt');
    fs.writeFileSync(dummyFile, "INJECT_TEST");
    
    execSync(`node sim_engine/inject.js ${expName} engine`, { stdio: 'ignore' });
    
    if (!fs.existsSync(path.join(expDir, 'sim_engine/utils/dummy_inject_test.txt'))) {
        throw new Error("Inject.js did not synchronize the file to the experiment!");
    }
    console.log("  ✅ Injection (Engine Sync) successful.");

    // Cleanup
    fs.unlinkSync(dummyFile);
    fs.rmSync(expDir, { recursive: true, force: true });
    
    console.log("🎉 Meta-Pipeline Test successful.");
} catch(e) {
    console.error("❌ Pipeline Test failed:", e.message);
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
    process.exit(1);
}