const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { checkAccess } = require('../services/acl_service');
const { parseRunBlocks } = require('./action_parser');
const { PYTHON_BIN } = require('../helpers/python_bin');
const { childEnv } = require('../helpers/child_env');

// TCK-138: Allowlist & path guards (no shell anywhere)
const SAFE_FILE_NAME = /^[A-Za-z0-9._/-]+$/;
const SCRIPT_RUN = /^python3?\s+(scripts\/[A-Za-z0-9._/-]+\.py)$/;

// True if fullPath lies strictly inside root (trailing separator prevents '_verse_evil' prefix bypass)
function isInside(root, fullPath) {
    return fullPath.startsWith(path.resolve(root) + path.sep);
}

function getEnvState(universeDir) {
    const bobPath = path.join(universeDir, '..', 'core', 'bin', 'bob.py');
    const expRoot = path.resolve(universeDir, '..');
    try {
        const out = execFileSync(PYTHON_BIN, [bobPath, '--help'], {
            env: childEnv({ PYTHONPATH: expRoot })
        }).toString();
        
        const parts = out.split("-".repeat(50));
        if (parts.length >= 3) {
            return "AVAILABLE HARDWARE (V8.0 UNIFIED LOGIC):\n" + parts[1].trim() + "\n\n" + parts[2].trim();
        } else if (parts.length >= 2) {
            return "AVAILABLE HARDWARE (V8.0 UNIFIED LOGIC):\n" + parts[1].trim();
        }
        return out;
    } catch (e) {
        return "HARDWARE (Unified Command Line):\nUse the 'me' command for all hardware actions.\nSyntax: [RUN: me method(key=val)].";
    }
}

function processActions(text, universeDir, agentId, state) {
    let feedback = "";

    if (typeof text !== 'string') {
        text = text ? text.toString() : "";
    }

    if (!state.security) state.security = { acl: {}, wallets: {} };
    if (!state.security.wallets[agentId]) state.security.wallets[agentId] = {};

    let activeText = text;
    const actionSplit = text.split(/ACTION(?:S)?[\s:]+/i);
    if (actionSplit.length > 1) {
        activeText = actionSplit.slice(1).join("ACTION:");
    }

    // --- WALLET MANAGEMENT ---
    const keyRegex = /\[KEY:\s*(ADD|REMOVE)\s+([a-zA-Z0-9_-]+)(?:\s+([a-zA-Z0-9_-]+))?\]/gi;
    let match;
    while ((match = keyRegex.exec(activeText)) !== null) {
        const action = match[1].toUpperCase();
        const label = match[2];
        const secret = match[3];

        if (action === 'ADD' && secret) {
            state.security.wallets[agentId][label] = secret;
            feedback += `[SUCCESS: Key '${label}' added to keyring.]\n`;
        } else if (action === 'REMOVE') {
            delete state.security.wallets[agentId][label];
            feedback += `[SUCCESS: Key '${label}' removed from keyring.]\n`;
        }
    }

    // --- WRITE & REPLACE ---
    // Match any [WRITE: ... ] ... [END] block
    const fileRegex = /\[(?:WRITE|REPLACE):([^\]]+)\]([\s\S]*?)\[END\]/gi;
    let safeRunText = activeText;

    while ((match = fileRegex.exec(activeText)) !== null) {
        const tagHeader = match[1].trim();
        let content = match[2].trim();

        safeRunText = safeRunText.replace(match[0], `[FILE_OPERATION_REMOVED_FROM_PARSE_TREE]`);

        if (content.startsWith('```')) {
            content = content.replace(/^```[a-zA-Z]*\n/, ''); 
            content = content.replace(/\n```$/, '');
        }
        content = content.split('\n').map(line => line.replace(/^`|`$/g, '')).join('\n');

        // Parse header components
        const headerParts = tagHeader.split(/\s+/);
        const rawFileName = headerParts[0].trim();

        if (!SAFE_FILE_NAME.test(rawFileName)) {
            feedback += `[DENIED: '${rawFileName}' - Invalid file name. Allowed characters: A-Z a-z 0-9 . _ - /]\n`;
            continue;
        }

        const readKeyMatch = tagHeader.match(/\(READ_KEY:\s*([a-zA-Z0-9_-]+)\)/i);
        const readKey = readKeyMatch ? readKeyMatch[1] : null;
        const writeKey = tagHeader.match(/\(WRITE_KEY:\s*([a-zA-Z0-9_-]+)\)/i);
        const writeKeyVal = writeKey ? writeKey[1] : null;

        const targetMatch = tagHeader.match(/target=([a-zA-Z0-9_:-]+)/i);
        const target = targetMatch ? targetMatch[1].trim() : null;

        // Resolve absolute and relative paths (root is _verse/)
        let filePath = "";
        if (target) {
            const [targetType, targetId] = target.toLowerCase().split('::');
            const cleanTargetId = target.split('::')[1];
            if (targetType === 'ship') {
                filePath = `scripts/active/ships/${cleanTargetId}/${rawFileName}`;
            } else if (targetType === 'system') {
                filePath = `scripts/active/systems/${cleanTargetId}/${rawFileName}`;
            } else {
                filePath = rawFileName;
            }
        } else {
            filePath = rawFileName.includes('/') ? rawFileName : `scripts/${rawFileName}`;
        }
        // Canonical ACL key ('scripts/./x.py' == 'scripts/x.py')
        filePath = path.posix.normalize(filePath);

        const fullPath = path.resolve(universeDir, filePath);

        if (!filePath.startsWith("scripts/") || !isInside(path.join(universeDir, 'scripts'), fullPath)) {
            feedback += `[DENIED: '${filePath}' - You are only allowed to modify files in the 'scripts/' directory. Other directories are protected hardware layers.]\n`;
            continue;
        }

        const access = checkAccess(filePath, 'WRITE', agentId, state);
        if (!access.granted) {
            feedback += access.reason + "\n";
            continue;
        }

        // Proximity & Hardware Verification Lockouts (TCK-145: kernel script, schema via migrations)
        const dbPath = path.join(universeDir, 'universe.db');
        const expRoot = path.resolve(universeDir, '..');
        const kernelEnv = childEnv({ PYTHONPATH: expRoot, TEST_DB_PATH: dbPath });
        if (target) {
            try {
                const checkOut = execFileSync(PYTHON_BIN, [path.join(expRoot, 'core', 'bin', 'script_target_check.py'), String(agentId), target], { env: kernelEnv }).toString().trim();
                if (checkOut.startsWith('[DENIED:')) {
                    feedback += checkOut + "\n";
                    continue;
                }
            } catch (err) {
                feedback += `[ERROR: Hardware validation failed due to internal environment error.]\n`;
                continue;
            }
        }

        try {
            // Write to physical Air-Gapped Silo File
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, content);

            // Relational SSoT Database Persistence & Linkage (content via stdin, metadata via argv)
            const scriptId = execFileSync(PYTHON_BIN, [path.join(expRoot, 'core', 'bin', 'script_register.py'),
                filePath, String(agentId), readKey || '', writeKeyVal || '',
                target || '', rawFileName, String(parseInt(state.round, 10) || 0)
            ], { input: content, env: kernelEnv }).toString().trim();

            // Sync with existing ACL state in-memory as backup / UI compatibility
            if (readKey || writeKeyVal || !state.security.acl[filePath]) {
                const aclEntry = state.security.acl[filePath] || { owner: agentId };
                if (readKey) aclEntry.read_key = readKey;
                if (writeKeyVal) aclEntry.write_key = writeKeyVal;
                state.security.acl[filePath] = aclEntry;
            }
            if (state.security.acl[filePath]) {
                state.security.acl[filePath].owner = agentId;
            }

            if (target) {
                feedback += `[SUCCESS: '${rawFileName}' registered in database as Script ID ${scriptId} and deployed to ${target}]\n`;
            } else {
                feedback += `[SUCCESS: '${filePath}' registered in database as Script ID ${scriptId}]\n`;
            }
        } catch (e) {
            feedback += `[ERROR: File write error: ${e.message}]\n`;
        }
    }

    // --- READ ---
    const readRegex = /\[READ:\s*([a-zA-Z0-9._\-\/]+)\]/gi;
    while ((match = readRegex.exec(safeRunText)) !== null) {
        const filePath = path.posix.normalize(match[1].trim());
        const fullPath = path.resolve(universeDir, filePath);

        if (!filePath.startsWith("scripts/") || !isInside(path.join(universeDir, 'scripts'), fullPath)) {
            feedback += `[DENIED: '${filePath}' - [READ] is only allowed for 'scripts/'.]\n`;
            continue;
        }

        const access = checkAccess(filePath, 'READ', agentId, state);
        if (!access.granted) {
            feedback += access.reason + "\n";
            continue;
        }

        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Escaping to prevent prompt injection (neutralize action keywords)
            const safeContent = content.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
            feedback += `[CONTENT OF '${filePath}':\n${safeContent}\n]\n`;
        } else {
            feedback += `[ERROR: File '${filePath}' not found.]\n`;
        }
        safeRunText = safeRunText.replace(match[0], ''); // Remove tag so it's not mistakenly recognized as RUN
    }

    // --- DELETE ---
    const delRegex = /\[DELETE:\s*([a-zA-Z0-9._\-\/]+)\]/gi;
    while ((match = delRegex.exec(safeRunText)) !== null) {
        const filePath = path.posix.normalize(match[1].trim());
        const fullPath = path.resolve(universeDir, filePath);

        if (!filePath.startsWith("scripts/") || !isInside(path.join(universeDir, 'scripts'), fullPath)) {
            feedback += `[DENIED: '${filePath}' - You are only allowed to delete files in the 'scripts/' directory.]\n`;
            continue;
        }

        const access = checkAccess(filePath, 'DELETE', agentId, state);
        if (!access.granted) {
            feedback += access.reason + "\n";
            continue;
        }

        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            delete state.security.acl[filePath];
            feedback += `[SUCCESS: '${filePath}' deleted.]\n`;
        } else {
            feedback += `[ERROR: File '${filePath}' not found.]\n`;
        }
        safeRunText = safeRunText.replace(match[0], '');
    }

    // --- RUN (V10.5 Bracket-Counting Parser) ---
    const { blocks } = parseRunBlocks(safeRunText);
    
    let chainFailed = false;
    
    for (const block of blocks) {
        let cmd = block.cmd;

        if (cmd === "..." || cmd === "" || cmd.startsWith("<")) continue;

        let displayCmd = cmd; // The original command the agent wrote

        // Action Chain Short-Circuiting
        if (chainFailed && (cmd.includes("move(") || cmd.includes("route(") || cmd.includes("jump(") || cmd.includes("sleep("))) {
            feedback += `[ABORTED: '${cmd}' was bypassed because a preceding logistics or loading action in this chain failed.]\n`;
            continue;
        }

        // RUN-Allowlist (TCK-138): only SDK calls -> bob.py, or strictly parsed 'python3 scripts/<file>.py'.
        // Everything is executed via execFile (argv array, no shell).
        const expRoot = path.resolve(universeDir, '..');
        // TCK-139: allowlisted env, no API keys/tokens for agent-reachable Python
        const runEnv = childEnv({
            PYTHONPATH: expRoot,
            BOB_ID: String(agentId),
            BOB_CYCLE: String(state?.round || 0),
            TEST_DB_PATH: path.join(universeDir, 'universe.db')
        });
        let argv = null;
        let funcPart = null;
        const scriptMatch = cmd.match(SCRIPT_RUN);

        if (/^me\s/.test(cmd)) {
            funcPart = cmd.replace(/^me\s+/, "").trim();
        } else if (cmd.startsWith("me.")) {
            funcPart = cmd.replace(/^me\./, "").trim();
        } else if (cmd.startsWith("me(")) {
            funcPart = cmd;
        }

        if (funcPart !== null) {
            argv = [path.join(expRoot, 'core', 'bin', 'bob.py'), funcPart];
            runEnv.BOB_ACL = JSON.stringify(state.security?.acl || {});
        } else if (cmd.startsWith("bob ") || cmd.startsWith("bob(")) {
            feedback += `[CLI ERROR] Syntax 'bob ...' is deprecated. Use 'me ...' (Example: [RUN: me mine()]).\n`;
            continue;
        } else if (scriptMatch) {
            // Manual-run agent scripts (ACL-guarded, must stay under _verse/scripts/)
            const scriptPath = path.posix.normalize(scriptMatch[1]);
            const fullScript = path.resolve(universeDir, scriptPath);
            if (!scriptPath.startsWith("scripts/") || !isInside(path.join(universeDir, 'scripts'), fullScript)) {
                feedback += `[DENIED: '${displayCmd}' - Scripts must reside in 'scripts/'.]\n`;
                continue;
            }
            const access = checkAccess(scriptPath, 'RUN', agentId, state);
            if (!access.granted) {
                feedback += `[RESPONSE: '${displayCmd}' -> ${access.reason}]\n`;
                continue;
            }
            argv = [fullScript];
        } else {
            feedback += `[DENIED: '${displayCmd}' is not an allowed command. Use the SDK: [RUN: me <method>(...)]]\n`;
            continue;
        }

        try {
            const out = execFileSync(PYTHON_BIN, argv, {
                cwd: universeDir,
                timeout: 15000,
                stdio: 'pipe',
                env: runEnv
            }).toString();
            feedback += `[RESPONSE: '${displayCmd}' ::\n${out.trim() || "OK"}]\n`;

            if (out.includes('[ERROR]') || out.includes('[DENIED]')) {
                if (displayCmd.includes('withdraw') || displayCmd.includes('deposit') || displayCmd.includes('refine') || displayCmd.includes('build_ship') || displayCmd.includes('build(') || displayCmd.includes('build\n') || displayCmd.includes('mine(') || displayCmd.includes('mine\n')) {
                    chainFailed = true;
                }
            }
        } catch (e) {
            let err = e.stderr ? e.stderr.toString() : e.message;
            err = err.split(expRoot).join('');
            feedback += `[ERROR-RESPONSE: '${displayCmd}' ::\n${err.trim()}]\n`;

            if (err.includes('[ERROR]') || err.includes('[DENIED]')) {
                if (displayCmd.includes('withdraw') || displayCmd.includes('deposit') || displayCmd.includes('refine') || displayCmd.includes('build_ship') || displayCmd.includes('build(') || displayCmd.includes('build\n') || displayCmd.includes('mine(') || displayCmd.includes('mine\n')) {
                    chainFailed = true;
                }
            }
        }
    }
    return feedback;
}

module.exports = { getEnvState, processActions };