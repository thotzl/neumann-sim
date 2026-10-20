const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

console.log(`\x1b[36m🚀 Starting Consolidated newman-hud C2 Suite...\x1b[0m\n`);

// --- AUTOMATIC TYPE SYNCHRONIZATION ON STARTUP (v13.9.2 SSoT) ---
try {
    console.log(`\x1b[33m🔄 Auto-synchronizing TypeScript types from Python SSoT generator...\x1b[0m`);
    execSync(`python3 ${path.join(__dirname, '../src/bob_os/core/lib/generator.py')} --generate-types`, { stdio: 'inherit' });
} catch (err) {
    console.error(`\x1b[31m❌ Auto-type sync failed: ${err.message}\x1b[0m`);
}

// --- VoG TOKEN (TCK-140) ---
// Reihenfolge: Shell-Env > VOG_TOKEN aus Root-.env (liest auch die Engine) > einmalig generiert.
function readTokenFromDotEnv() {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        if (!fs.existsSync(envPath)) return null;
        const line = fs.readFileSync(envPath, 'utf8').split('\n').map(l => l.trim()).find(l => l.startsWith('VOG_TOKEN='));
        if (!line) return null;
        const val = line.slice('VOG_TOKEN='.length).trim().replace(/^(['"])(.*)\1$/, '$2');
        return val || null;
    } catch (e) {
        return null;
    }
}

let vogToken = process.env.VOG_TOKEN || readTokenFromDotEnv();
if (!vogToken) {
    vogToken = crypto.randomBytes(24).toString('hex');
    console.log(`\x1b[33m🔑 VOG_TOKEN not set. Generated session token: ${vogToken}\x1b[0m`);
    console.log(`\x1b[33m   Set VOG_TOKEN=<token> in .env so the engine can broadcast to the HUD.\x1b[0m`);
}

const viteHost = process.env.VITE_HOST || 'localhost';

// 1. Boot the VoG C2 WebSocket Broker on Port 3001
const vogServer = spawn('node', [path.join(__dirname, 'vog_server.cjs')], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VOG_TOKEN: vogToken }
});

// 2. Boot Vite React Client on Port 5173 (LogPanel sendet VoG-Nachrichten -> Token als VITE_VOG_TOKEN)
const vite = spawn('npx', ['vite', '--port', '5173', '--host', viteHost], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_VOG_TOKEN: vogToken }
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
