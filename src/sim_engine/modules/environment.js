const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getEnvState(universeDir) {
    const bobPath = path.join(universeDir, '..', 'core', 'bin', 'bob.py');
    const expRoot = path.resolve(universeDir, '..');
    try {
        const out = execSync(`python3 ${bobPath} --help`, {
            env: { ...process.env, PYTHONPATH: expRoot }
        }).toString();
        
        const parts = out.split("-".repeat(50));
        if (parts.length >= 2) {
            return "AVAILABLE HARDWARE (V8.0 UNIFIED LOGIC):\n" + parts[1].trim();
        }
        return out;
    } catch (e) {
        return "HARDWARE (Unified Command Line):\nUse the 'me' command for all hardware actions.\nSyntax: [RUN: me method(key=val)].";
    }
}

function checkAccess(filePath, action, agentId, state) {
    if (!state.security) state.security = { acl: {}, wallets: {} };
    const acl = state.security.acl[filePath];
    if (!acl) return { granted: true };

    const wallet = state.security.wallets[agentId] || {};
    const myKeys = Object.values(wallet);

    // Master Key overrides everything
    if (acl.write_key && myKeys.includes(acl.write_key)) return { granted: true };

    if (action === 'WRITE' || action === 'REPLACE' || action === 'DELETE') {
        if (acl.write_key) {
            return { granted: false, reason: `[DENIED: Cryptographic protection. You do not have a matching WRITE_KEY in your keyring. Contact the creator (${acl.owner}) via SCUT for access.]` };
        } else if (acl.read_key) {
            // If only READ_KEY is set, it also acts as a WRITE_KEY (Closed Circle)
            if (!myKeys.includes(acl.read_key)) {
                return { granted: false, reason: `[DENIED: Cryptographic protection. You do not have a matching KEY in your keyring. Contact the creator (${acl.owner}) via SCUT for access.]` };
            }
        }
    } else if (action === 'READ' || action === 'RUN') {
        if (acl.read_key && !myKeys.includes(acl.read_key)) {
            return { granted: false, reason: `[DENIED: Cryptographic protection. You do not have a matching READ_KEY in your keyring. Contact the creator (${acl.owner}) via SCUT for access.]` };
        }
    }
    return { granted: true };
}

function processActions(text, universeDir, agentId, state) {
    let feedback = "";

    if (typeof text !== 'string') {
        text = text ? text.toString() : "";
    }

    if (!state.security) state.security = { acl: {}, wallets: {} };
    if (!state.security.wallets[agentId]) state.security.wallets[agentId] = {};

    let activeText = text;
    const actionSplit = text.split(/ACTION(?:S)?[:]/i);
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
    const fileRegex = /\[(?:WRITE|REPLACE):\s*([a-zA-Z0-9._\-\/]+)(?:\s+\(READ_KEY:\s*([a-zA-Z0-9_-]+)\))?(?:\s+\(WRITE_KEY:\s*([a-zA-Z0-9_-]+)\))?\]([\s\S]*?)\[END\]/gi;
    let safeRunText = activeText;

    while ((match = fileRegex.exec(activeText)) !== null) {
        const filePath = match[1].trim();
        const readKey = match[2];
        const writeKey = match[3];
        let content = match[4].trim();

        safeRunText = safeRunText.replace(match[0], `[FILE_OPERATION_REMOVED_FROM_PARSE_TREE]`);

        if (content.startsWith('```')) {
            content = content.replace(/^```[a-zA-Z]*\n/, ''); 
            content = content.replace(/\n```$/, '');
        }
        content = content.split('\n').map(line => line.replace(/^`|`$/g, '')).join('\n');

        const fullPath = path.resolve(universeDir, filePath);
        if (!fullPath.startsWith(path.resolve(universeDir))) continue;

        if (!filePath.startsWith("scripts/")) {
            feedback += `[DENIED: '${filePath}' - You are only allowed to modify files in the 'scripts/' directory. Other directories are protected hardware layers.]\n`;
            continue;
        }

        const access = checkAccess(filePath, 'WRITE', agentId, state);
        if (!access.granted) {
            feedback += access.reason + "\n";
            continue;
        }

        try {
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, content);

            // Set or overwrite ACL if keys were provided OR if no ACL exists yet
            if (readKey || writeKey || !state.security.acl[filePath]) {
                const aclEntry = state.security.acl[filePath] || { owner: agentId };
                if (readKey) aclEntry.read_key = readKey;
                if (writeKey) aclEntry.write_key = writeKey;
                state.security.acl[filePath] = aclEntry;
            }

            feedback += `[SUCCESS: '${filePath}' manifested]\n`;
        } catch (e) {}
    }

    // --- READ ---
    const readRegex = /\[READ:\s*([a-zA-Z0-9._\-\/]+)\]/gi;
    while ((match = readRegex.exec(safeRunText)) !== null) {
        const filePath = match[1].trim();
        const fullPath = path.resolve(universeDir, filePath);
        if (!fullPath.startsWith(path.resolve(universeDir))) continue;

        if (!filePath.startsWith("scripts/")) {
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
        const filePath = match[1].trim();
        const fullPath = path.resolve(universeDir, filePath);
        if (!fullPath.startsWith(path.resolve(universeDir))) continue;

        if (!filePath.startsWith("scripts/")) {
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
    let pos = 0;
    while (true) {
        let startIdx = safeRunText.indexOf("[RUN:", pos);
        if (startIdx === -1) break;

        let braceCount = 1;
        let endIdx = startIdx + 5;
        while (endIdx < safeRunText.length && braceCount > 0) {
            if (safeRunText[endIdx] === '[') braceCount++;
            else if (safeRunText[endIdx] === ']') braceCount--;
            endIdx++;
        }

        if (braceCount !== 0) {
            // Unmatched brackets, slide forward to prevent hang
            pos = startIdx + 5;
            continue;
        }

        const fullBlock = safeRunText.substring(startIdx, endIdx);
        let cmd = safeRunText.substring(startIdx + 5, endIdx - 1).trim().replace(/^`|`$/g, '');

        // Splicing out the block (100% safe)
        safeRunText = safeRunText.substring(0, startIdx) + safeRunText.substring(endIdx);
        pos = startIdx; // Next startIdx search starts at the splice index

        if (cmd === "..." || cmd === "" || cmd.startsWith("<")) continue;

        let displayCmd = cmd; // The original command the agent wrote

        // Path Mapping for Unified CLI (V10.0 Functional)
        if (cmd.startsWith("me ")) {
            const funcPart = cmd.replace(/^me\s+/, "").trim();
            const safeFuncPart = funcPart.replace(/'/g, "'\\''");
            const aclState = state.security?.acl || {};
            cmd = `BOB_ACL='${JSON.stringify(aclState)}' python3 ../core/bin/bob.py '${safeFuncPart}'`;
        } else if (cmd.startsWith("me(")) {
            const safeFuncPart = cmd.substring(2).replace(/'/g, "'\\''");
            const aclState = state.security?.acl || {};
            cmd = `BOB_ACL='${JSON.stringify(aclState)}' python3 ../core/bin/bob.py 'me${safeFuncPart}'`;
        } else if (cmd.startsWith("bob ") || cmd.startsWith("bob(")) {
            feedback += `[CLI ERROR] Syntax 'bob ...' is deprecated. Use 'me ...' (Example: [RUN: me mine()]).\n`;
            continue;
        }

        // Security Hook for python3 scripts/
        if (cmd.includes("scripts/")) {
            const parts = cmd.split(' ');
            let targetScript = parts.find(p => p.includes("scripts/")).replace("_verse/", "");
            const access = checkAccess(targetScript, 'RUN', agentId, state);
            if (!access.granted) {
                feedback += `[RESPONSE: '${displayCmd}' -> ${access.reason}]\n`;
                continue;
            }
        }

        try {
            const expRoot = path.resolve(universeDir, '..');
            const out = execSync(cmd, { 
                cwd: universeDir, 
                timeout: 15000, 
                stdio: 'pipe',
                env: { 
                    ...process.env, 
                    PYTHONPATH: expRoot, 
                    BOB_ID: agentId,
                    BOB_CYCLE: String(state?.round || 0),
                    TEST_DB_PATH: path.join(universeDir, 'universe.db')
                }
            }).toString();
            feedback += `[RESPONSE: '${displayCmd}' ::\n${out.trim() || "OK"}]\n`;
        } catch (e) {
            let err = e.stderr ? e.stderr.toString() : e.message;
            const expRoot = path.resolve(universeDir, '..');
            err = err.split(expRoot).join('');
            feedback += `[ERROR-RESPONSE: '${displayCmd}' ::\n${err.trim()}]\n`;
        }
    }
    return feedback;
}

module.exports = { getEnvState, processActions };