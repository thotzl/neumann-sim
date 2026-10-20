const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { WebSocketServer } = require('ws');

// --- Security config (TCK-140) ---
// Bind nur lokal; LAN-Zugriff nur explizit per VOG_HOST.
const HOST = process.env.VOG_HOST || '127.0.0.1';
const PORT = process.env.VOG_PORT !== undefined ? Number(process.env.VOG_PORT) : 3001;
// CORS/WebSocket-Origin-Allowlist (Vite dev server), comma-separated.
const ALLOWED_ORIGINS = new Set(
    (process.env.VOG_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
        .split(',').map(s => s.trim()).filter(Boolean)
);
// Shared secret for write endpoints. Generated once if not provided.
let VOG_TOKEN = process.env.VOG_TOKEN;
if (!VOG_TOKEN) {
    VOG_TOKEN = crypto.randomBytes(24).toString('hex');
    console.log(`[VoG Server] VOG_TOKEN not set. Generated token for this session: ${VOG_TOKEN}`);
    console.log('[VoG Server] Set VOG_TOKEN (e.g. in .env) so the engine can broadcast.');
}
const TOKEN_BUF = Buffer.from(VOG_TOKEN);
// Body limits: /vog ist kleiner Text; Broadcasts tragen Weltzustand + volle History.
const MAX_VOG_BYTES = 1024 * 1024; // 1 MB
const MAX_BROADCAST_BYTES = Number(process.env.VOG_MAX_BROADCAST_BYTES) || 16 * 1024 * 1024; // 16 MB
// Sektor-Endpoint: max. angefragte Fläche (Welt-Einheiten², vor 40%-Padding).
// 1e11 ≈ 1080p-Viewport bis Zoom ~0.0033 bzw. 4K bis ~0.0066 (Zoom-Clamp im Client: 0.002).
// Darüber iteriert der Generator >1M Zellen à 500 Einheiten pro Request.
const MAX_SECTOR_AREA = 1e11;
const MAX_SEED_LENGTH = 64;
const MIN_DENSITY = 0;
const MAX_DENSITY = 10;

// Automatische Detektion des neuesten/zuletzt geänderten Experiments in /experiments
function detectLatestExperiment() {
    const experimentsDir = path.resolve(__dirname, '../experiments');
    if (!fs.existsSync(experimentsDir)) return 'ONE';
    try {
        const dirs = fs.readdirSync(experimentsDir);
        let latestDir = null;
        let latestTime = 0;

        dirs.forEach(dir => {
            const fullPath = path.join(experimentsDir, dir);
            const stateFile = path.join(fullPath, '_verse', 'world_state.json');
            if (fs.existsSync(stateFile)) {
                const stat = fs.statSync(stateFile);
                if (stat.mtimeMs > latestTime) {
                    latestTime = stat.mtimeMs;
                    latestDir = dir;
                }
            }
        });
        return latestDir || 'ONE';
    } catch (e) {
        return 'ONE';
    }
}

// Hole die aktuelle Version aus den Argumenten oder detektiere sie automatisch
const vArg = process.argv.find(arg => arg.startsWith('--v='));
const version = vArg ? vArg.split('=')[1] : detectLatestExperiment();

let experimentDir = path.resolve(__dirname, `../experiments/${version}`);

const clients = new Set();

// V12.0 In-Memory Cache representing the dynamic Single Source of Truth
let latestWorldState = null;
let latestHistory = [];

function sendJson(res, code, obj) {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
}

function isAllowedOrigin(origin) {
    return origin === undefined || ALLOWED_ORIGINS.has(origin);
}

function hasValidToken(req) {
    const given = req.headers['x-vog-token'];
    if (typeof given !== 'string') return false;
    const buf = Buffer.from(given);
    return buf.length === TOKEN_BUF.length && crypto.timingSafeEqual(buf, TOKEN_BUF);
}

function isJson(req) {
    const ct = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    return ct === 'application/json';
}

// Guard + bounded body reader for write endpoints. Calls onBody(string) only if all checks pass.
function readGuardedBody(req, res, maxBytes, onBody) {
    if (!hasValidToken(req)) return sendJson(res, 401, { status: 'error', message: 'Missing or invalid X-VoG-Token.' });
    if (!isJson(req)) return sendJson(res, 415, { status: 'error', message: 'Content-Type must be application/json.' });
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
        res.setHeader('Connection', 'close');
        return sendJson(res, 413, { status: 'error', message: 'Payload too large.' });
    }
    const chunks = [];
    let size = 0;
    let aborted = false;
    req.on('data', chunk => {
        if (aborted) return;
        size += chunk.length;
        if (size > maxBytes) {
            aborted = true;
            res.setHeader('Connection', 'close');
            sendJson(res, 413, { status: 'error', message: 'Payload too large.' });
            return;
        }
        chunks.push(chunk);
    });
    req.on('end', () => {
        if (!aborted) onBody(Buffer.concat(chunks).toString('utf8'));
    });
}

function broadcastToClients(msg) {
    clients.forEach(client => {
        if (client.readyState === 1) { // 1 is OPEN
            client.send(msg);
        }
    });
}

const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    // Fremde Browser-Origins komplett abweisen (CSRF / Drive-by-Prompt-Injection)
    if (!isAllowedOrigin(origin)) {
        return sendJson(res, 403, { status: 'error', message: 'Origin not allowed.' });
    }
    // CORS Header nur für erlaubte Origins
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VoG-Token');
    }

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const pathname = req.url.split('?')[0];

    // Augmented V12.0 Broadcast Entry point
    if (req.method === 'POST' && pathname === '/api/broadcast') {
        readGuardedBody(req, res, MAX_BROADCAST_BYTES, (body) => {
            try {
                const data = JSON.parse(body);

                if (data.type === 'LIVE_STATE_UPDATE') {
                    // Update the active experiment folder dynamically if sent by the state exporter!
                    if (data.state && data.state.experiment_dir) {
                        experimentDir = data.state.experiment_dir;
                    }

                    // Cache the latest snapshot in memory with robust in-memory merging (V13.4)
                    latestWorldState = latestWorldState ? { ...latestWorldState, ...data.state } : data.state;
                    if (data.history) {
                        latestHistory = data.history;
                    }

                    // Broadcast live state updates immediately to all connected websocket clients
                    broadcastToClients(JSON.stringify({
                        type: 'LIVE_STATE_UPDATE',
                        state: data.state,
                        history: data.history
                    }));
                } else if (data.type === 'REALTIME_LOGS') {
                    // Forward real-time logs immediately to all connected web clients (V13.5 RTES)
                    broadcastToClients(JSON.stringify(data));
                }

                sendJson(res, 200, { status: 'success', message: 'Broadcast successful.' });
            } catch (e) {
                sendJson(res, 400, { status: 'error', message: e.message });
            }
        });
    }
    // Real-Time Granular Event Log Entry point (Supports single event or array of events)
    else if (req.method === 'POST' && (pathname === '/api/events' || pathname === '/api/event')) {
        readGuardedBody(req, res, MAX_BROADCAST_BYTES, (body) => {
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
                broadcastToClients(JSON.stringify({
                    type: 'REALTIME_LOGS',
                    logs: events
                }));

                sendJson(res, 200, { status: 'success', message: 'Events broadcasted.' });
            } catch (e) {
                sendJson(res, 400, { status: 'error', message: e.message });
            }
        });
    }
    // Existing Voice of God msg injector
    else if (req.method === 'POST' && pathname === '/vog') {
        readGuardedBody(req, res, MAX_VOG_BYTES, (body) => {
            try {
                const data = JSON.parse(body);
                if (typeof data.message === 'string' && data.message && fs.existsSync(experimentDir)) {
                    const msgFile = path.join(experimentDir, 'creator_msg.txt');
                    // Schreibe die Nachricht in die Datei
                    fs.writeFileSync(msgFile, data.message);
                    sendJson(res, 200, { status: 'success', message: 'Message injected.' });
                } else {
                    sendJson(res, 400, { status: 'error', message: 'Invalid payload or universe not found.' });
                }
            } catch (e) {
                sendJson(res, 400, { status: 'error', message: e.message });
            }
        });
    }
    // Endpoint for procedural universe sector generation using the Python SSoT subprocess
    else if (req.method === 'GET' && pathname === '/api/universe/sectors') {
        const params = new URL(req.url, 'http://localhost').searchParams;
        const num = (key, fallback) => {
            const raw = params.get(key);
            if (raw === null || raw.trim() === '') return fallback;
            return Number(raw);
        };
        const minX = num('minX', NaN);
        const maxX = num('maxX', NaN);
        const minY = num('minY', NaN);
        const maxY = num('maxY', NaN);
        const seed = params.get('seed') || 'BobOS_V12';
        const density = num('density', 1.0);

        // Validierung: endliche Zahlen, nicht-negative Ausdehnung, Fläche, Seed-Länge, Dichte
        const width = maxX - minX;
        const height = maxY - minY;
        let invalid = null;
        if (![minX, maxX, minY, maxY].every(Number.isFinite)) invalid = 'Missing or invalid coordinate parameters.';
        else if (width < 0 || height < 0) invalid = 'Bounding box must satisfy minX <= maxX and minY <= maxY.';
        else if (width * height > MAX_SECTOR_AREA) invalid = `Requested area exceeds limit (${MAX_SECTOR_AREA}).`;
        else if (seed.length > MAX_SEED_LENGTH) invalid = `Seed exceeds ${MAX_SEED_LENGTH} characters.`;
        else if (!Number.isFinite(density) || density < MIN_DENSITY || density > MAX_DENSITY) invalid = `Density must be within [${MIN_DENSITY}, ${MAX_DENSITY}].`;
        if (invalid) return sendJson(res, 400, { status: 'error', message: invalid });

        // --- DER GENIALE VIEWPORT-PUFFER (CLIENT-SIDE PADDING) ---
        // Wir schlagen 40 % Overflow-Puffer auf alle vier Ränder auf,
        // um angrenzende Sektoren asynchron im Hintergrund vorab zu laden.
        const padX = width * 0.4;
        const padY = height * 0.4;

        const paddedMinX = minX - padX;
        const paddedMaxX = maxX + padX;
        const paddedMinY = minY - padY;
        const paddedMaxY = maxY + padY;

        // Ausführen des Python-Subprozesses (execFile, keine Shell). `--opt=value`-Form,
        // damit ein Seed wie "--generate-types" nicht als Option geparst wird.
        const pythonScript = path.resolve(__dirname, '../src/bob_os/core/lib/generator.py');

        execFile('python3', [
            pythonScript,
            `--min-x=${paddedMinX}`,
            `--max-x=${paddedMaxX}`,
            `--min-y=${paddedMinY}`,
            `--max-y=${paddedMaxY}`,
            `--seed=${seed}`,
            `--density=${density}`
        ], { maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[VoG Server] Subprocess error: ${stderr || error.message}`);
                sendJson(res, 500, { status: 'error', message: 'Universe generation subprocess failure.' });
                return;
            }

            try {
                const sectors = JSON.parse(stdout);
                sendJson(res, 200, sectors);
            } catch (e) {
                console.error(`[VoG Server] JSON Parse failure on generator output: ${e.message}`);
                sendJson(res, 500, { status: 'error', message: 'Malformed JSON output from generator.' });
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Setup the WebSocket Server on top of the HTTP Server (Origin-Check gegen Cross-Site-WS-Hijacking)
const wss = new WebSocketServer({
    server,
    verifyClient: (info) => isAllowedOrigin(info.req.headers.origin)
});

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

server.listen(PORT, HOST, () => {
    const actualPort = server.address().port;
    console.log(`[VoG Server] Listening on ${HOST}:${actualPort} for experiment ${version} (WebSockets Active)`);
});
