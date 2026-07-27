const { execSync } = require('child_process');
const path = require('path');

/**
 * Executes a Python script or tool within the experiment context.
 */
function runPython(vDir, scriptPath, args = [], options = {}) {
    const bobId = options.bobId || null;
    const coreLibPath = path.resolve(vDir, 'core', 'lib');
    const env = { 
        ...process.env, 
        PYTHONPATH: `${path.resolve(vDir)}:${coreLibPath}` 
    };
    if (bobId) {
        env.BOB_ID = bobId;
    }
    if (options.aclState) {
        env.BOB_ACL = JSON.stringify(options.aclState);
    }

    const defaultOptions = {
        cwd: vDir,
        timeout: 15000,
        encoding: 'utf8',
        stdio: 'pipe',
        env: env
    };

    const mergedOptions = { ...defaultOptions, ...options };
    
    // V8 syntax robustness: Quote arguments individually if it's an array
    let argString = args;
    if (Array.isArray(args)) {
        argString = args.map(arg => `'${arg.replace(/'/g, "'\\''")}'`).join(' ');
    }
    
    return execSync(`python3 ${scriptPath} ${argString}`, mergedOptions).toString();
}

module.exports = { runPython };
