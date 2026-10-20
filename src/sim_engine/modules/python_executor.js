const { execFileSync } = require('child_process');
const path = require('path');
const { PYTHON_BIN } = require('../helpers/python_bin');

/**
 * Executes a Python script or tool within the experiment context.
 * No shell: script and args are passed as argv array.
 */
function runPython(vDir, scriptPath, args = [], options = {}) {
    const bobId = options.bobId || null;
    const coreLibPath = path.resolve(vDir, 'core', 'lib');
    const env = {
        ...process.env,
        PYTHONPATH: [path.resolve(vDir), coreLibPath].join(path.delimiter)
    };
    if (bobId) {
        env.BOB_ID = bobId;
    }
    if (options.aclState) {
        env.BOB_ACL = JSON.stringify(options.aclState);
    }

    const { bobId: _b, aclState: _a, ...execOptions } = options;
    const mergedOptions = {
        cwd: vDir,
        timeout: 15000,
        encoding: 'utf8',
        stdio: 'pipe',
        env: env,
        ...execOptions
    };

    const argv = Array.isArray(args) ? args.map(String) : (args ? [String(args)] : []);
    return execFileSync(PYTHON_BIN, [scriptPath, ...argv], mergedOptions).toString();
}

module.exports = { runPython };
