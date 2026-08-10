const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { checkAccess } = require('../services/acl_service');
const { parseRunBlocks } = require('./action_parser');

function getEnvState(universeDir) {
    const bobPath = path.join(universeDir, '..', 'core', 'bin', 'bob.py');
    const expRoot = path.resolve(universeDir, '..');
    try {
        const out = execSync(`python3 ${bobPath} --help`, {
            env: { ...process.env, PYTHONPATH: expRoot }
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
            filePath = (rawFileName.includes('/') || rawFileName.includes('\\')) ? rawFileName : `scripts/${rawFileName}`;
        }

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

        // Proximity & Hardware Verification Lockouts
        const dbPath = path.join(universeDir, 'universe.db');
        if (target) {
            const checkScript = `
import sqlite3, os, sys
conn = sqlite3.connect('${dbPath}')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Self-healing database structure initialization
cursor.execute("""
CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT,
    path TEXT NOT NULL,
    target TEXT DEFAULT NULL,
    owner_id TEXT NOT NULL,
    read_key TEXT DEFAULT NULL,
    write_key TEXT DEFAULT NULL,
    created_cycle INTEGER DEFAULT 0
)
""")
try:
    cursor.execute("ALTER TABLE ships ADD COLUMN active_script_id INTEGER DEFAULT NULL")
except sqlite3.OperationalError:
    pass
try:
    cursor.execute("ALTER TABLE systems ADD COLUMN active_script_id INTEGER DEFAULT NULL")
except sqlite3.OperationalError:
    pass

# Query agent location
cursor.execute("SELECT location FROM v_agents WHERE id = ?", ('${agentId}',))
agent = cursor.fetchone()
agent_loc = agent['location'] if agent else 'Unknown'

target = '${target}'
target_type, target_id = target.lower().split('::')
clean_target_id = target.split('::')[1]

if target_type == 'ship':
    cursor.execute("SELECT system_name, has_logic_core FROM ships WHERE id = CAST(? AS INTEGER)", (clean_target_id,))
    ship = cursor.fetchone()
    if not ship:
        print('[DENIED: Target vessel ID ' + clean_target_id + ' not found in sector database.]')
    elif ship['system_name'] != agent_loc:
        print('[DENIED: Proximity Lockout. Direct localized flashing of Vessel \\'Ship-' + clean_target_id + '\\' failed. The target vessel is stationed in system \\'' + ship['system_name'] + '\\', but your consciousness is currently located in \\'' + agent_loc + '\\'.]')
    elif ship['has_logic_core'] != 1:
        print('[DENIED: Vessel \\'Ship-' + clean_target_id + '\\' lacks a physical \\'logic_core\\' module. Onboard autonomous programming is impossible.]')
    else:
        print('[SUCCESS]')
elif target_type == 'system':
    if clean_target_id != agent_loc:
        print('[DENIED: Proximity Lockout. Sektor-level automation deployment failed. You cannot deploy an active AMI routine to the \\'' + clean_target_id + '\\' matrix hub while your own consciousness is stationed in \\'' + agent_loc + '\\'.]')
    else:
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'ami_hub' AND status = 'active'", (clean_target_id,))
        if not cursor.fetchone():
            print('[DENIED: Sector \\'' + clean_target_id + '\\' lacks an active \\'ami_hub\\' (Artificial Machine Intelligence Hub). Sector-level background automation is impossible.]')
        else:
            print('[SUCCESS]')
else:
    print('[SUCCESS]')
conn.close()
`.trim();
            try {
                const checkOut = execSync(`python3 -c "${checkScript.replace(/"/g, '\\"')}"`).toString().trim();
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

            // Relational SSoT Database Persistence & Linkage
            const dbWriteScript = `
import sqlite3, os, sys
conn = sqlite3.connect('${dbPath}')
cursor = conn.cursor()

# Self-healing database structure initialization
cursor.execute("""
CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT,
    path TEXT NOT NULL,
    target TEXT DEFAULT NULL,
    owner_id TEXT NOT NULL,
    read_key TEXT DEFAULT NULL,
    write_key TEXT DEFAULT NULL,
    created_cycle INTEGER DEFAULT 0
)
""")
try:
    cursor.execute("ALTER TABLE ships ADD COLUMN active_script_id INTEGER DEFAULT NULL")
except sqlite3.OperationalError:
    pass
try:
    cursor.execute("ALTER TABLE systems ADD COLUMN active_script_id INTEGER DEFAULT NULL")
except sqlite3.OperationalError:
    pass

cursor.execute("SELECT id FROM scripts WHERE path = ?", ('${filePath}',))
row = cursor.fetchone()

script_id = None
if row:
    script_id = row[0]
    cursor.execute("UPDATE scripts SET content = ?, owner_id = ?, read_key = ?, write_key = ?, target = ? WHERE id = ?",
                   (sys.argv[1], '${agentId}', ${readKey ? `'${readKey}'` : 'None'}, ${writeKeyVal ? `'${writeKeyVal}'` : 'None'}, '${target || ""}', script_id))
else:
    cursor.execute("INSERT INTO scripts (name, content, path, target, owner_id, read_key, write_key, created_cycle) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                   ('${rawFileName}', sys.argv[1], '${filePath}', '${target || ""}', '${agentId}', ${readKey ? `'${readKey}'` : 'None'}, ${writeKeyVal ? `'${writeKeyVal}'` : 'None'}, ${state.round || 0}))
    script_id = cursor.lastrowid

target = '${target || ""}'
if target.startswith('ship::'):
    clean_target_id = target.split('::')[1]
    cursor.execute("UPDATE ships SET active_script_id = ? WHERE id = CAST(? AS INTEGER)", (script_id, clean_target_id))
elif target.startswith('system::'):
    clean_target_id = target.split('::')[1]
    cursor.execute("UPDATE systems SET active_script_id = ? WHERE name = ?", (script_id, clean_target_id))

conn.commit()
conn.close()
print(script_id)
`.trim();

            const safeContentArg = content.replace(/'/g, "'\\''");
            const scriptId = execSync(`python3 -c "${dbWriteScript.replace(/"/g, '\\"')}" '${safeContentArg}'`).toString().trim();

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

        // Path Mapping for Unified CLI (V10.0 Functional)
        if (cmd.startsWith("me ")) {
            const funcPart = cmd.replace(/^me\s+/, "").trim();
            const safeFuncPart = funcPart.replace(/'/g, "'\\''");
            const aclState = state.security?.acl || {};
            cmd = `BOB_ACL='${JSON.stringify(aclState)}' python3 ../core/bin/bob.py '${safeFuncPart}'`;
        } else if (cmd.startsWith("me.")) {
            const funcPart = cmd.replace(/^me\./, "").trim();
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

            if (out.includes('[ERROR]') || out.includes('[DENIED]')) {
                if (displayCmd.includes('withdraw') || displayCmd.includes('deposit') || displayCmd.includes('refine') || displayCmd.includes('build_ship') || displayCmd.includes('build(') || displayCmd.includes('build\n') || displayCmd.includes('mine(') || displayCmd.includes('mine\n')) {
                    chainFailed = true;
                }
            }
        } catch (e) {
            let err = e.stderr ? e.stderr.toString() : e.message;
            const expRoot = path.resolve(universeDir, '..');
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