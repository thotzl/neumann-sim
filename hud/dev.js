const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
// Argumente parsen (z.B. --v=ONE, --exp=ONE oder --experiment=ONE)
const vArg = process.argv.find(arg => arg.startsWith('--v=') || arg.startsWith('--exp=') || arg.startsWith('--experiment='));
const version = vArg ? vArg.split('=')[1] : null;

if (!version) {
    console.error("❌ Fehler: Bitte gib das aktive Experiment an, z.B.:");
    console.error("   npm run dev --exp=ONE");
    console.error("   oder: npm run dev -- --v=ONE");
    console.error("   (Du kannst auch das alternative dev:sandbox Skript für die reine Sandbox nutzen)");
    process.exit(1);
}

const expVerseDir = path.resolve(__dirname, `../experiments/${version}/_verse`);
const publicDir = path.resolve(__dirname, 'public');
const publicLiveVerse = path.resolve(__dirname, 'public/live_verse');

if (!fs.existsSync(expVerseDir)) {
    console.error(`❌ Fehler: Experiment-Verzeichnis ${expVerseDir} nicht gefunden.`);
    process.exit(1);
}

// Sicherstellen, dass public-Verzeichnis existiert
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// Symlink erstellen/erneuern
if (fs.existsSync(publicLiveVerse)) {
    try {
        fs.unlinkSync(publicLiveVerse);
    } catch (e) {
        // Defensive handling
    }
}
try {
    fs.symlinkSync(expVerseDir, publicLiveVerse, 'dir');
} catch (e) {
    console.warn("⚠️ Symlink-Kopplung fehlgeschlagen (evtl. ungenügende Rechte):", e.message);
}

console.log(`🚀 Starte newman-hud für Experiment: ${version}`);
console.log(`🔗 Link: public/live_verse -> experiments/${version}/_verse`);

// VoG API Broker Server auf Port 3001 im Hintergrund starten (nutzt den bestehenden Broker aus monitor)
const vogServer = spawn('node', [path.resolve(__dirname, '../monitor/vog_server.cjs'), `--v=${version}`], {
    stdio: 'inherit',
    shell: true
});

// Vite Entwicklungsserver starten
const vite = spawn('npx', ['vite'], {
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
