const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function deploy(targetVersion) {
    const baseDir = path.resolve(__dirname, '..');
    const experimentsDir = path.join(baseDir, 'experiments');
    const sourceTools = path.join(baseDir, 'bob_os', '_verse', 'tools');
    const testHub = path.join(baseDir, 'tests', 'test_all.js');

    console.log("==========================================");
    console.log("   BOB-OS DEPLOYMENT SYSTEM               ");
    console.log("==========================================\n");

    // 1. RUN TESTS FIRST
    console.log("[1/2] Running verification tests...");
    try {
        execSync(`node ${testHub}`, { stdio: 'inherit' });
        console.log("\n✅ Tests successful. Starting deployment...\n");
    } catch (e) {
        console.error("\n🚨 [ABORT] Tests failed. Deployment denied.");
        process.exit(1);
    }

    // 2. IDENTIFY TARGETS
    let targets = [];
    if (targetVersion) {
        const versionPath = path.join(experimentsDir, targetVersion);
        if (fs.existsSync(versionPath)) {
            targets.push(targetVersion);
        } else {
            console.error(`❌ Error: Version ${targetVersion} not found.`);
            process.exit(1);
        }
    } else {
        targets = fs.readdirSync(experimentsDir).filter(f => fs.statSync(path.join(experimentsDir, f)).isDirectory());
    }

    // 3. UPDATE TOOLS
    console.log(`[2/2] Updating tools in ${targets.length} experiments...`);
    targets.forEach(v => {
        const targetTools = path.join(experimentsDir, v, '_verse', 'tools');
        if (!fs.existsSync(targetTools)) {
            console.log(`- Skipping ${v}: No tools folder found.`);
            return;
        }

        const files = fs.readdirSync(sourceTools).filter(f => f.endsWith('.py'));
        files.forEach(file => {
            // We NEVER skip DB configs or similar, as we fix them in master
            // But we ensure that we only overwrite .py files
            const srcFile = path.join(sourceTools, file);
            const destFile = path.join(targetTools, file);
            fs.copyFileSync(srcFile, destFile);
        });
        console.log(`- ${v}: ${files.length} tools updated.`);
    });

    console.log("\n==========================================");
    console.log("   🎉 DEPLOYMENT SUCCESSFULLY COMPLETED ");
    console.log("==========================================\n");
}

const version = process.argv[2];
deploy(version);