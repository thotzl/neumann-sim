const { execSync } = require('child_process');
const path = require('path');

/**
 * Führt ein Python-Skript oder Tool innerhalb des Experiment-Kontexts aus.
 */
function runPython(vDir, scriptPath, args = [], options = {}) {
    const bobId = options.bobId || null;
    const env = { ...process.env, PYTHONPATH: path.resolve(vDir) };
    if (bobId) {
        env.BOB_ID = bobId;
    }

    const defaultOptions = {
        cwd: vDir,
        timeout: 15000,
        encoding: 'utf8',
        stdio: 'pipe',
        env: env
    };

    const mergedOptions = { ...defaultOptions, ...options };
    const argString = Array.isArray(args) ? args.join(' ') : args;
    
    return execSync(`python3 ${scriptPath} ${argString}`, mergedOptions).toString();
}

module.exports = { runPython };
