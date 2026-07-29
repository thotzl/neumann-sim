const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// Hole die aktuelle Version aus den Argumenten oder fallback auf v48
const vArg = process.argv.find(arg => arg.startsWith('--v='));
const version = vArg ? vArg.split('=')[1] : 'v48';

const experimentDir = path.resolve(__dirname, `../experiments/${version}`);

const clients = new Set();

// V12.0 In-Memory Cache representing the dynamic Single Source of Truth
let latestWorldState = null;
let latestHistory = [];

const server = http.createServer((req, res) => {
    // CORS Header
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Augmented V12.0 Broadcast Entry point
    if (req.method === 'POST' && req.url === '/api/broadcast') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                // Cache the latest snapshot in memory (0% SSD IO)
                latestWorldState = data.state;
                latestHistory = data.history;

                // Broadcast live state updates immediately to all connected websocket clients
                const broadcastMsg = JSON.stringify({
                    type: 'LIVE_STATE_UPDATE',
                    state: data.state,
                    history: data.history
                });

                clients.forEach(client => {
                    if (client.readyState === 1) { // 1 is OPEN
                        client.send(broadcastMsg);
                    }
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Broadcast successful.' }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: e.message }));
            }
        });
    }
    // Real-Time Granular Event Log Entry point (Supports single event or array of events)
    else if (req.method === 'POST' && (req.url === '/api/events' || req.url === '/api/event')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const events = Array.isArray(payload) ? payload : [payload];
                
                events.forEach(event => {
                    latestHistory.push({
                        tick: event.tick,
                        agentId: event.agentId,
                        agentName: event.agentName,
                        type: event.type,
                        text: event.text
                    });
                });

                // Broadcast the array of events to all browser clients in-order
                const eventMsg = JSON.stringify({
                    type: 'REALTIME_LOGS',
                    logs: events
                });

                clients.forEach(client => {
                    if (client.readyState === 1) { // 1 is OPEN
                        client.send(eventMsg);
                    }
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Events broadcasted.' }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: e.message }));
            }
        });
    }
    // Existing Voice of God msg injector
    else if (req.method === 'POST' && req.url === '/vog') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data.message && fs.existsSync(experimentDir)) {
                    const msgFile = path.join(experimentDir, '_verse', 'creator_msg.txt');
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

// Setup the WebSocket Server on top of the HTTP Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('[VoG Server] Web-client connected via WebSocket.');
    clients.add(ws);

    // One-time Initial full state load-push (Prefer in-memory cache, fallback to disk for legacy startups)
    if (latestWorldState) {
        ws.send(JSON.stringify({ type: 'INIT', state: latestWorldState, history: latestHistory }));
        console.log('[VoG Server] Initial state payload transmitted from in-memory cache.');
    } else {
        try {
            const stateFile = path.join(experimentDir, '_verse/world_state.json');
            const historyFile = path.join(experimentDir, 'history.json');
            if (fs.existsSync(stateFile)) {
                latestWorldState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
                latestHistory = fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf8')) : [];
                ws.send(JSON.stringify({ type: 'INIT', state: latestWorldState, history: latestHistory }));
                console.log('[VoG Server] Initial state loaded from legacy disk backup.');
            } else {
                console.log('[VoG Server] No state in-memory or on disk yet. Awaiting first turn...');
            }
        } catch (e) {
            console.error('[VoG Server] Error loading startup fallback:', e.message);
        }
    }

    ws.on('close', () => {
        console.log('[VoG Server] Web-client disconnected.');
        clients.delete(ws);
    });

    ws.on('error', (err) => {
        console.error('[VoG Server] WebSocket error:', err.message);
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`[VoG Server] Listening on port ${PORT} for experiment ${version} (WebSockets Active)`);
});
