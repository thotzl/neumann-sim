/**
 * Procedural system details (spectral class, planets, warp current, ...) for the world-state export.
 * Single source is the Python generator (TCK-144): `generator.py --systems-stdin`.
 * Details are deterministic per seed + name + position, so they are cached in-process and
 * Python only runs for systems that were not resolved before.
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { PYTHON_BIN } = require('./python_bin');
const { childEnv } = require('./child_env');

// Repo layout: src/bob_os/core; injected experiments ship the kernel as <exp>/core next to <exp>/_verse
const MASTER_KERNEL_ROOT = path.resolve(__dirname, '..', '..', 'bob_os');
const GENERATOR_REL = path.join('core', 'lib', 'generator.py');

const cache = new Map();
const keyOf = (seed, sys) => JSON.stringify([seed, sys.name, sys.x, sys.y]);

function kernelRoot(universeDir) {
    const expRoot = path.resolve(universeDir, '..');
    return fs.existsSync(path.join(expRoot, GENERATOR_REL)) ? expRoot : MASTER_KERNEL_ROOT;
}

/**
 * Resolves details for `systems` ([{name, x, y}]) and calls back with Map(name -> sector|null).
 * On generator failure the callback still fires; unresolved systems map to null and are retried next export.
 */
function loadSystemDetails(universeDir, seed, systems, callback) {
    const done = () => callback(new Map(systems.map(s => [s.name, cache.get(keyOf(seed, s)) || null])));
    const missing = systems.filter(s => !cache.has(keyOf(seed, s)));
    if (missing.length === 0) return done();

    const root = kernelRoot(universeDir);
    const child = execFile(PYTHON_BIN, [path.join(root, GENERATOR_REL), `--seed=${seed}`, '--systems-stdin'], {
        env: childEnv({ PYTHONPATH: root }),
        maxBuffer: 64 * 1024 * 1024
    }, (err, stdout, stderr) => {
        if (err) {
            console.error(`[StateExporter] generator.py failed: ${stderr || err.message}`);
            return done();
        }
        try {
            const details = JSON.parse(stdout);
            missing.forEach(s => cache.set(keyOf(seed, s), details[s.name] || null));
        } catch (e) {
            console.error(`[StateExporter] Malformed generator.py output: ${e.message}`);
        }
        done();
    });
    child.stdin.on('error', () => { /* reported via the exit callback */ });
    child.stdin.end(JSON.stringify(missing.map(({ name, x, y }) => ({ name, x, y }))));
}

module.exports = { loadSystemDetails };
