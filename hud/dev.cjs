const { spawn } = require('child_process');
const path = require('path');

console.log(`\x1b[36m🚀 Starting Consolidated newman-hud C2 Suite...\x1b[0m\n`);

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
