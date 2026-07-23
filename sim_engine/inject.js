const fs = require('fs');
const path = require('path');

const expName = process.argv[2];
const sourcePath = process.argv[3]; // Kann Pfad oder "engine" oder "tools" sein

if (!expName || !sourcePath) {
    console.log("Syntax: npm run inject <experiment_name> <file_or_alias>");
    console.log("Beispiele:");
    console.log("  npm run inject ONE sim_engine/utils/environment.js");
    console.log("  npm run inject ONE engine   (Kopiert gesamte sim_engine)");
    console.log("  npm run inject ONE tools    (Kopiert tools & system_libs)");
    process.exit(1);
}

const expDir = path.join(__dirname, '../experiments', expName);
if (!fs.existsSync(expDir)) {
    console.error(`[FEHLER] Experiment '${expName}' existiert nicht.`);
    process.exit(1);
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        if (!fs.existsSync(path.dirname(dest))) fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

if (sourcePath === 'engine') {
    console.log(`Injiziere gesamte Node.js Engine in ${expName}...`);
    copyRecursiveSync(path.join(__dirname, '../sim_engine'), path.join(expDir, 'sim_engine'));
    console.log(`[ERFOLG] Engine synchronisiert.`);
} else if (sourcePath === 'tools') {
    console.log(`Injiziere Python Tools & Libs in ${expName}...`);
    copyRecursiveSync(path.join(__dirname, '../bob_os/core'), path.join(expDir, 'core'));
    console.log(`[ERFOLG] Python Logik synchronisiert.`);
} else if (sourcePath === 'migrate') {
    console.log(`Führe Datenbank-Migration für ${expName} aus...`);
    // Kopiere migrations.py
    const srcMigrate = path.resolve(__dirname, '../bob_os/core/lib/migrations.py');
    const targetMigrate = path.join(expDir, 'core/lib/migrations.py');
    fs.copyFileSync(srcMigrate, targetMigrate);
    try {
        const { execSync } = require('child_process');
        execSync('python3 -m core.lib.migrations', {
            cwd: expDir,
            env: { ...process.env, PYTHONPATH: expDir },
            stdio: 'inherit'
        });
        console.log(`[ERFOLG] Migration erfolgreich angewendet.`);
    } catch (e) {
        console.error(`[MIGRATION FEHLER]`, e.message);
        process.exit(1);
    }
    process.exit(0);
} else {
    const absoluteSrc = path.resolve(sourcePath);
    if (!fs.existsSync(absoluteSrc)) {
        console.error(`[FEHLER] Quelle existiert nicht: ${absoluteSrc}`);
        process.exit(1);
    }
    
    const projectRoot = path.resolve(path.join(__dirname, '..'));
    const relPath = path.relative(projectRoot, absoluteSrc);
    
    if (relPath.startsWith('experiments')) {
        console.error("[FEHLER] Du kannst keine Dateien aus dem experiments/ Ordner injizieren.");
        process.exit(1);
    }

    let targetRelPath = relPath;
    if (relPath.startsWith(path.join('bob_os', '_verse'))) {
        targetRelPath = relPath.replace(path.join('bob_os', '_verse'), '_verse');
    } else if (relPath.startsWith(path.join('bob_os', 'core'))) {
        targetRelPath = relPath.replace(path.join('bob_os', 'core'), 'core');
    }

    const targetPath = path.join(expDir, targetRelPath);
    console.log(`Injiziere ${relPath} -> ${targetPath}`);
    
    copyRecursiveSync(absoluteSrc, targetPath);
    console.log(`[ERFOLG] Injektion abgeschlossen.`);
}
