const assert = require('assert');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const WebSocket = require('ws');

// TCK-140: VoG-Server Hardening (Bind, CORS, Token, Content-Type, Body-Limit, Sektor-Validierung)
const SERVER = path.resolve(__dirname, '../../hud/vog_server.cjs');
const TOKEN = 'test-token-0123456789';
const GOOD_ORIGIN = 'http://localhost:5173';
const EVIL_ORIGIN = 'http://evil.example';

function startServer() {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [SERVER], {
            env: { ...process.env, VOG_PORT: '0', VOG_HOST: '127.0.0.1', VOG_TOKEN: TOKEN, VOG_ALLOWED_ORIGINS: '' },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let out = '';
        const timer = setTimeout(() => reject(new Error(`Server start timeout. Output:\n${out}`)), 10000);
        const onData = (d) => {
            out += d.toString();
            const m = out.match(/Listening on ([\d.]+):(\d+)/);
            if (m) {
                clearTimeout(timer);
                resolve({ child, host: m[1], port: Number(m[2]), output: () => out });
            }
        };
        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited (${code}):\n${out}`)); });
    });
}

function request(port, { method = 'GET', urlPath = '/', headers = {}, body = null }) {
    return new Promise((resolve, reject) => {
        let gotResponse = false;
        const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers }, (res) => {
            gotResponse = true;
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
            res.on('error', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', (e) => { if (!gotResponse) reject(e); });
        if (body !== null) req.write(body);
        req.end();
    });
}

function postJson(port, urlPath, obj, extraHeaders = {}) {
    const body = JSON.stringify(obj);
    return request(port, {
        method: 'POST', urlPath, body,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...extraHeaders }
    });
}

function wsConnect(port, origin) {
    return new Promise((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}`, { origin });
        ws.on('open', () => { ws.close(); resolve('open'); });
        ws.on('unexpected-response', (req, res) => { req.destroy(); resolve(res.statusCode); });
        ws.on('error', () => resolve('error'));
    });
}

async function run() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vog-test-'));
    let srv = null;
    try {
        srv = await startServer();
        const { port } = srv;
        assert.strictEqual(srv.host, '127.0.0.1', 'Server must bind to 127.0.0.1');
        console.log(`Testing VoG server on 127.0.0.1:${port}...`);

        // 401: kein / falsches Token
        let r = await postJson(port, '/api/broadcast', { type: 'REALTIME_LOGS', logs: [] });
        assert.strictEqual(r.status, 401, 'Broadcast without token must be 401');
        r = await postJson(port, '/vog', { message: 'hi' }, { 'X-VoG-Token': 'wrong' });
        assert.strictEqual(r.status, 401, '/vog with wrong token must be 401');
        console.log('✅ 401 without/with wrong token');

        // 415: falscher Content-Type
        r = await request(port, {
            method: 'POST', urlPath: '/api/broadcast', body: '{"type":"REALTIME_LOGS"}',
            headers: { 'Content-Type': 'text/plain', 'X-VoG-Token': TOKEN }
        });
        assert.strictEqual(r.status, 415, 'text/plain must be 415');
        console.log('✅ 415 wrong content type');

        // 413: Body > 1 MB auf /vog
        r = await postJson(port, '/vog', { message: 'x'.repeat(1024 * 1024 + 10) }, { 'X-VoG-Token': TOKEN });
        assert.strictEqual(r.status, 413, 'Oversized /vog body must be 413');
        console.log('✅ 413 oversized body');

        // CORS: fremde Origin -> 403 ohne ACAO-Echo; Vite-Origin -> Echo
        r = await request(port, { method: 'OPTIONS', urlPath: '/vog', headers: { Origin: EVIL_ORIGIN } });
        assert.strictEqual(r.status, 403, 'Foreign origin preflight must be 403');
        assert.strictEqual(r.headers['access-control-allow-origin'], undefined, 'ACAO must not be echoed for foreign origin');
        r = await postJson(port, '/vog', { message: 'x' }, { 'X-VoG-Token': TOKEN, Origin: EVIL_ORIGIN });
        assert.strictEqual(r.status, 403, 'Foreign origin POST must be 403 even with token');
        r = await request(port, { method: 'OPTIONS', urlPath: '/vog', headers: { Origin: GOOD_ORIGIN } });
        assert.strictEqual(r.status, 204);
        assert.strictEqual(r.headers['access-control-allow-origin'], GOOD_ORIGIN);
        assert.ok(/x-vog-token/i.test(r.headers['access-control-allow-headers']), 'Preflight must allow X-VoG-Token');
        assert.notStrictEqual(r.headers['access-control-allow-origin'], '*');
        console.log('✅ CORS allowlist');

        // WebSocket: fremde Origin abgewiesen, Vite-Origin erlaubt
        assert.notStrictEqual(await wsConnect(port, EVIL_ORIGIN), 'open', 'Foreign-origin WebSocket must be rejected');
        assert.strictEqual(await wsConnect(port, GOOD_ORIGIN), 'open', 'Vite-origin WebSocket must connect');
        console.log('✅ WebSocket origin check');

        // 400: ungültige Sektor-Parameter (kein Python-Aufruf)
        const bad = [
            'minX=0&maxX=100&minY=0',                                   // fehlender Parameter
            'minX=abc&maxX=100&minY=0&maxY=100',                        // NaN
            'minX=0&maxX=1e400&minY=0&maxY=100',                        // Infinity
            'minX=100&maxX=0&minY=0&maxY=100',                          // invertierte Box
            'minX=0&maxX=1000000&minY=0&maxY=1000000',                  // Fläche 1e12 > Limit
            `minX=0&maxX=10&minY=0&maxY=10&seed=${'s'.repeat(65)}`,     // Seed zu lang
            'minX=0&maxX=10&minY=0&maxY=10&density=11',                 // Dichte > 10
            'minX=0&maxX=10&minY=0&maxY=10&density=-1'                  // Dichte < 0
        ];
        for (const q of bad) {
            r = await request(port, { urlPath: `/api/universe/sectors?${q}` });
            assert.strictEqual(r.status, 400, `Expected 400 for sectors?${q}, got ${r.status}`);
        }
        console.log('✅ 400 invalid sector params');

        // 200: gültiger Broadcast mit Token (setzt experiment_dir), danach /vog schreibt creator_msg.txt
        r = await postJson(port, '/api/broadcast',
            { type: 'LIVE_STATE_UPDATE', state: { tick: 1, experiment_dir: tmpDir }, history: [] },
            { 'X-VoG-Token': TOKEN });
        assert.strictEqual(r.status, 200, `Valid broadcast must be 200, got ${r.status}: ${r.body}`);
        r = await postJson(port, '/vog', { message: 'Let there be light' },
            { 'X-VoG-Token': TOKEN, 'Content-Type': 'application/json; charset=utf-8' });
        assert.strictEqual(r.status, 200, `Valid /vog must be 200, got ${r.status}: ${r.body}`);
        assert.strictEqual(fs.readFileSync(path.join(tmpDir, 'creator_msg.txt'), 'utf8'), 'Let there be light');
        console.log('✅ 200 valid broadcast + /vog with token');

        console.log('✅ VoG server hardening tests passed.');
    } finally {
        if (srv) srv.child.kill();
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

run().catch((e) => {
    console.error('❌ VoG server test FAILED:', e);
    process.exit(1);
});
