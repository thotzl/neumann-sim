const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const version = process.argv[2];

if (!version) {
    console.error("\x1b[31m[ERROR]\x1b[0m Please specify experiment version. Example: npm run sim ONE");
    process.exit(1);
}

const runnerPath = path.join(__dirname, 'experiments', version, 'sim_engine', 'runner.js');

if (!fs.existsSync(runnerPath)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Engine not found: ${runnerPath}`);
    console.error(`Have you built the experiment? (python3 bob_os/build.py ${version})`);
    process.exit(1);
}

console.log(`\x1b[36m🚀 Starting isolated engine for experiment: ${version}...\x1b[0m\n`);

try {
    spawnSync('node', [runnerPath, version], { stdio: 'inherit' });
} catch (e) {
    console.error("Process aborted.");
}