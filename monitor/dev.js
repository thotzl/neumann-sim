const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Argumente parsen (z.B. --v=v47)
const vArg = process.argv.find(arg => arg.startsWith('--v='));
const version = vArg ? vArg.split('=')[1] : null;

if (!version) {
    console.error("❌ Fehler: Bitte gib eine Version an, z.B.: bun dev --v=v47");
    process.exit(1);
}

const expVerseDir = path.resolve(__dirname, `../experiments/${version}/_verse`);
const publicLiveVerse = path.resolve(__dirname, 'public/live_verse');

if (!fs.existsSync(expVerseDir)) {
    console.error(`❌ Fehler: Experiment-Verzeichnis ${expVerseDir} nicht gefunden.`);
    process.exit(1);
}

// Symlink erstellen/erneuern
if (fs.existsSync(publicLiveVerse)) {
    fs.unlinkSync(publicLiveVerse);
}
fs.symlinkSync(expVerseDir, publicLiveVerse, 'dir');

console.log(`🚀 Starte Monitor für Experiment: ${version}`);
console.log(`🔗 Link: public/live_verse -> experiments/${version}/_verse`);

// VoG API Server starten
const vogServer = spawn('node', ['vog_server.cjs', `--v=${version}`], {
    stdio: 'inherit',
    shell: true
});

// Vite starten
const vite = spawn('bun', ['run', 'vite', '--port', '5173', '--host', '0.0.0.0'], {
    stdio: 'inherit',
    shell: true
});

process.on('SIGINT', () => {
    vogServer.kill();
    vite.kill();
    process.exit();
});

vite.on('exit', (code) => {
    vogServer.kill();
    process.exit(code);
});
