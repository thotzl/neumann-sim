const http = require('http');

/**
 * Sends a JSON WebSocket broadcast payload to the local VoG C2 server (Port 3001).
 * Operates purely in-memory and fails silently in <1ms on socket blockages.
 */
function postToVogServer(payload) {
    try {
        const broadcastPort = process.env.C2_PORT || 3001;
        const req = http.request({
            hostname: 'localhost',
            port: broadcastPort,
            path: '/api/broadcast',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, () => {});

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

module.exports = { broadcastPartialState, broadcastRealtimeLogs };
