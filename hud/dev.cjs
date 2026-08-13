const { spawn, execSync } = require('child_process');
const path = require('path');

console.log(`\x1b[36m🚀 Starting Consolidated newman-hud C2 Suite...\x1b[0m\n`);

// --- AUTOMATIC TYPE SYNCHRONIZATION ON STARTUP (v13.9.2 SSoT) ---
try {
    console.log(`\x1b[33m🔄 Auto-synchronizing TypeScript types from Python SSoT generator...\x1b[0m`);
    execSync(`python3 ${path.join(__dirname, '../src/bob_os/core/lib/generator.py')} --generate-types`, { stdio: 'inherit' });
} catch (err) {
    console.error(`\x1b[31m❌ Auto-type sync failed: ${err.message}\x1b[0m`);
}

// 1. Boot the VoG C2 WebSocket Broker on Port 3001
const vogServer = spawn('node', [path.join(__dirname, 'vog_server.cjs')], {
    stdio: 'inherit',
    shell: true
});

// 2. Boot Vite React Client on Port 5173
const vite = spawn('npx', ['vite', '--port', '5173', '--host', '0.0.0.0'], {
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
