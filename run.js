const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const version = process.argv[2];

if (!version) {
    console.error("\x1b[31m[FEHLER]\x1b[0m Bitte Experiment-Version angeben. Beispiel: npm run sim ONE");
    process.exit(1);
}

const runnerPath = path.join(__dirname, 'experiments', version, 'sim_engine', 'runner.js');

if (!fs.existsSync(runnerPath)) {
    console.error(`\x1b[31m[FEHLER]\x1b[0m Engine nicht gefunden: ${runnerPath}`);
    console.error(`Hast du das Experiment gebaut? (python3 bob_os/build.py ${version})`);
    process.exit(1);
}

console.log(`\x1b[36m🚀 Starte isolierte Engine für Experiment: ${version}...\x1b[0m\n`);

try {
    spawnSync('node', [runnerPath, version], { stdio: 'inherit' });
} catch (e) {
    console.error("Prozess abgebrochen.");
}
