const http = require('http');
const fs = require('fs');
const path = require('path');

// Hole die aktuelle Version aus den Argumenten oder fallback auf v48
const vArg = process.argv.find(arg => arg.startsWith('--v='));
const version = vArg ? vArg.split('=')[1] : 'v48';

const experimentDir = path.resolve(__dirname, `../experiments/${version}`);

const server = http.createServer((req, res) => {
    // CORS Header
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/vog') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data.message && fs.existsSync(experimentDir)) {
                    const msgFile = path.join(experimentDir, 'creator_msg.txt');
                    // Schreibe die Nachricht in die Datei
                    fs.writeFileSync(msgFile, data.message);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'success', message: 'Message injected.' }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'Invalid payload or universe not found.' }));
                }
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: e.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`[VoG Server] Listening on port ${PORT} for experiment ${version}`);
});
