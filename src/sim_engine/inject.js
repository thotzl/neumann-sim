const fs = require('fs');
const path = require('path');

const expName = process.argv[2];
const sourcePath = process.argv[3]; // Can be a path or "engine" or "tools"

if (!expName || !sourcePath) {
    console.log("Syntax: npm run inject <experiment_name> <file_or_alias>");
    console.log("Examples:");
    console.log("  npm run inject ONE sim_engine/utils/environment.js");
    console.log("  npm run inject ONE engine   (Copies entire sim_engine)");
    console.log("  npm run inject ONE tools    (Copies tools & system_libs)");
    process.exit(1);
}

const expDir = path.join(__dirname, '../../experiments', expName);
if (!fs.existsSync(expDir)) {
    console.error(`[ERROR] Experiment '${expName}' does not exist.`);
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
    console.log(`Injecting entire Node.js Engine into ${expName}...`);
    copyRecursiveSync(__dirname, path.join(expDir, 'sim_engine'));
    console.log(`[SUCCESS] Engine synchronized.`);
} else if (sourcePath === 'tools') {
    console.log(`Injecting Python Tools & Libs into ${expName}...`);
    copyRecursiveSync(path.join(__dirname, '../bob_os/core'), path.join(expDir, 'core'));
    console.log(`[SUCCESS] Python logic synchronized.`);
} else if (sourcePath === 'migrate') {
    console.log(`Executing database migration for ${expName}...`);
    // Copy migrations.py
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
        console.log(`[SUCCESS] Migration applied successfully.`);
    } catch (e) {
        console.error(`[MIGRATION ERROR]`, e.message);
        process.exit(1);
    }
    process.exit(0);
} else {
    const absoluteSrc = path.resolve(sourcePath);
    if (!fs.existsSync(absoluteSrc)) {
        console.error(`[ERROR] Source does not exist: ${absoluteSrc}`);
        process.exit(1);
    }
    
    const projectRoot = path.resolve(path.join(__dirname, '../..'));
    let relPath = path.relative(projectRoot, absoluteSrc);
    
    if (relPath.startsWith('experiments')) {
        console.error("[ERROR] You cannot inject files from the experiments/ folder.");
        process.exit(1);
    }

    // Strip "src/" prefix if present to normalize relative paths for the sandbox
    if (relPath.startsWith('src' + path.sep)) {
        relPath = relPath.substring(4);
    }

    let targetRelPath = relPath;
    if (relPath.startsWith(path.join('bob_os', '_verse'))) {
        targetRelPath = relPath.replace(path.join('bob_os', '_verse'), '_verse');
    } else if (relPath.startsWith(path.join('bob_os', 'core'))) {
        targetRelPath = relPath.replace(path.join('bob_os', 'core'), 'core');
    }

    const targetPath = path.join(expDir, targetRelPath);
    console.log(`Injecting ${relPath} -> ${targetPath}`);
    
    copyRecursiveSync(absoluteSrc, targetPath);
    console.log(`[SUCCESS] Injection complete.`);
}