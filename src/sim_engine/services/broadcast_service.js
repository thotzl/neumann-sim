const http = require('http');

let tokenWarned = false;

/**
 * Sends a JSON WebSocket broadcast payload to the local VoG C2 server (Port 3001).
 * Operates purely in-memory and fails silently in <1ms on socket blockages.
 */
function postToVogServer(payload) {
    try {
        const broadcastPort = process.env.C2_PORT || 3001;
        // VoG-Server bindet per Default nur 127.0.0.1 (TCK-140); Wildcard-Binds lokal ansprechen.
        const vogHost = process.env.VOG_HOST;
        const hostname = vogHost && vogHost !== '0.0.0.0' && vogHost !== '::' ? vogHost : '127.0.0.1';
        const req = http.request({
            hostname: hostname,
            port: broadcastPort,
            path: '/api/broadcast',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'X-VoG-Token': process.env.VOG_TOKEN || ''
            }
        }, (res) => {
            // Token-Mismatch einmalig melden, sonst bleibt der Monitor kommentarlos leer (TCK-140)
            if (res.statusCode === 401 && !tokenWarned) {
                tokenWarned = true;
                console.warn('[VoG] Broadcast rejected (401): VOG_TOKEN of engine and monitor differ. Set the same VOG_TOKEN in the root .env.');
            }
            res.resume();
        });

        req.on('error', () => {
            // Fail silently
        });

        req.setTimeout(500, () => {
            req.destroy();
        });

        req.write(payload);
        req.end();
    } catch (e) {
        // Fail silently
    }
}

/**
 * Reusable, high-performance State Broadcasting hook.
 * Accepts a partial state update and streams it instantly to the browser
 * over WebSockets without doing any database queries or file operations.
 */
function broadcastPartialState(partialState) {
    const payload = JSON.stringify({ type: 'LIVE_STATE_UPDATE', state: partialState });
    postToVogServer(payload);
}

/**
 * Reusable, high-performance Real-Time Logs Broadcasting hook.
 * Streams thoughts, actions, and system logs instantly to the browser
 * over WebSockets without doing any database queries or file operations (100% disk-free).
 */
function broadcastRealtimeLogs(logs) {
    const payload = JSON.stringify({ type: 'REALTIME_LOGS', logs: logs });
    postToVogServer(payload);
}

module.exports = { broadcastPartialState, broadcastRealtimeLogs, postToVogServer };
