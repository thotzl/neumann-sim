const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function deploy(targetVersion) {
    const baseDir = path.resolve(__dirname, '..');
    const experimentsDir = path.join(baseDir, 'experiments');
    const sourceTools = path.join(baseDir, 'bob_os', '_verse', 'tools');
    const testHub = path.join(__dirname, 'test_all.js');

    console.log("==========================================");
    console.log("   BOB-OS DEPLOYMENT SYSTEM               ");
    console.log("==========================================\n");

    // 1. RUN TESTS FIRST
    console.log("[1/2] Führe Verifikations-Tests aus...");
    try {
        execSync(`node ${testHub}`, { stdio: 'inherit' });
        console.log("\n✅ Tests erfolgreich. Starte Deployment...\n");
    } catch (e) {
        console.error("\n🚨 [ABBRUCH] Tests fehlgeschlagen. Deployment verweigert.");
        process.exit(1);
    }

    // 2. IDENTIFY TARGETS
    let targets = [];
    if (targetVersion) {
        const vPath = path.join(experimentsDir, targetVersion);
        if (fs.existsSync(vPath)) {
            targets.push(targetVersion);
        } else {
            console.error(`❌ Fehler: Version ${targetVersion} nicht gefunden.`);
            process.exit(1);
        }
    } else {
        targets = fs.readdirSync(experimentsDir).filter(f => fs.statSync(path.join(experimentsDir, f)).isDirectory());
    }

    // 3. UPDATE TOOLS
    console.log(`[2/2] Update Tools in ${targets.length} Experimenten...`);
    targets.forEach(v => {
        const targetTools = path.join(experimentsDir, v, '_verse', 'tools');
        if (!fs.existsSync(targetTools)) {
            console.log(`- Überspringe ${v}: Kein tools Ordner gefunden.`);
            return;
        }

        const files = fs.readdirSync(sourceTools).filter(f => f.endsWith('.py'));
        files.forEach(file => {
            // Wir überspringen NIEMALS DB-Configs oder ähnliches, da wir im Master fixen
            // Aber wir stellen sicher, dass wir nur die .py Dateien überschreiben
            const srcFile = path.join(sourceTools, file);
            const destFile = path.join(targetTools, file);
            fs.copyFileSync(srcFile, destFile);
        });
        console.log(`- ${v}: ${files.length} Tools aktualisiert.`);
    });

    console.log("\n==========================================");
    console.log("   🎉 DEPLOYMENT ERFOLGREICH ABGESCHLOSSEN ");
    console.log("==========================================\n");
}

const version = process.argv[2];
deploy(version);
