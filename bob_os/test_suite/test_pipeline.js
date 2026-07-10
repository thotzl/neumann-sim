const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const expName = 'pipeline_test';
const expDir = path.resolve(`experiments/${expName}`);

console.log("Teste Meta-Pipelines (Build & Inject)...");

try {
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });

    // 1. Test: Build OHNE Mission MUSS fehlschlagen
    try {
        execSync(`python3 bob_os/build.py ${expName} --rounds 1 --skip-tests`, { stdio: 'ignore' });
        throw new Error("Build ohne Mission hätte fehlschlagen müssen!");
    } catch (e) {
        if (!e.message.includes("fehlschlagen müssen")) {
            console.log("  ✅ Build Rejection (Missing args) erfolgreich.");
        } else {
            throw e;
        }
    }

    // 2. Test: Normaler Build
    try {
        execSync(`python3 bob_os/build.py ${expName} --rounds 1 --skip-tests --mission "Test"`, { stdio: 'pipe' });
    } catch (e) {
        console.error("Build-Output (stderr):", e.stderr.toString());
        console.error("Build-Output (stdout):", e.stdout.toString());
        throw e;
    }
    
    // 3. Test: Wurden core und sim_engine mitkopiert?
    if (!fs.existsSync(path.join(expDir, 'sim_engine/runner.js'))) {
        throw new Error("sim_engine wurde beim Build nicht ins Experiment kopiert!");
    }
    if (!fs.existsSync(path.join(expDir, 'core/lib/db_config.py'))) {
        throw new Error("core/lib wurde beim Build nicht ins Experiment kopiert!");
    }
    console.log("  ✅ Autarker Build (core & sim_engine Kopie) erfolgreich.");

    // 4. Test: Inject Tool
    const dummyFile = path.resolve('sim_engine/utils/dummy_inject_test.txt');
    fs.writeFileSync(dummyFile, "INJECT_TEST");
    
    execSync(`node sim_engine/inject.js ${expName} engine`, { stdio: 'ignore' });
    
    if (!fs.existsSync(path.join(expDir, 'sim_engine/utils/dummy_inject_test.txt'))) {
        throw new Error("Inject.js hat die Datei nicht ins Experiment synchronisiert!");
    }
    console.log("  ✅ Injektion (Engine Sync) erfolgreich.");

    // Cleanup
    fs.unlinkSync(dummyFile);
    fs.rmSync(expDir, { recursive: true, force: true });
    
    console.log("🎉 Meta-Pipeline Test erfolgreich.");
} catch(e) {
    console.error("❌ Pipeline Test fehlgeschlagen:", e.message);
    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });
    process.exit(1);
}
