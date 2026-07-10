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
            return "VERFÜGBARE HARDWARE (V8.0 UNIFIED LOGIC):\n" + parts[1].trim();
        }
        return out;
    } catch (e) {
        return "HARDWARE (Unified Bob CLI):\nNutze das 'bob' Kommando für alle Hardware-Aktionen.\nSyntax: [RUN: bob method(key=val)].";
    }
}

function checkAccess(filePath, action, agentId, state) {
    if (!state.security) state.security = { acl: {}, wallets: {} };
    const acl = state.security.acl[filePath];
    if (!acl) return { granted: true };

    const wallet = state.security.wallets[agentId] || {};
    const myKeys = Object.values(wallet);

    // Master Key überschreibt alles
    if (acl.write_key && myKeys.includes(acl.write_key)) return { granted: true };

    if (action === 'WRITE' || action === 'REPLACE' || action === 'DELETE') {
        if (acl.write_key) {
            return { granted: false, reason: `[VERWEIGERT: Kryptographischer Schutz. Du hast keinen passenden WRITE_KEY in deinem Schlüsselbund. Kontaktiere den Schöpfer (${acl.owner}) via SCUT für Zugang.]` };
        } else if (acl.read_key) {
            // Wenn nur READ_KEY gesetzt ist, wirkt er auch als WRITE_KEY (Closed Circle)
            if (!myKeys.includes(acl.read_key)) {
                return { granted: false, reason: `[VERWEIGERT: Kryptographischer Schutz. Du hast keinen passenden KEY in deinem Schlüsselbund. Kontaktiere den Schöpfer (${acl.owner}) via SCUT für Zugang.]` };
            }
        }
    } else if (action === 'READ' || action === 'RUN') {
        if (acl.read_key && !myKeys.includes(acl.read_key)) {
            return { granted: false, reason: `[VERWEIGERT: Kryptographischer Schutz. Du hast keinen passenden READ_KEY in deinem Schlüsselbund. Kontaktiere den Schöpfer (${acl.owner}) via SCUT für Zugang.]` };
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
    const actionSplit = text.split(/AKTION(?:EN)?[:]/i);
    if (actionSplit.length > 1) {
        activeText = actionSplit.slice(1).join("AKTION:");
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
            feedback += `[ERFOLG: Key '${label}' zu Schlüsselbund hinzugefügt.]\n`;
        } else if (action === 'REMOVE') {
            delete state.security.wallets[agentId][label];
            feedback += `[ERFOLG: Key '${label}' aus Schlüsselbund entfernt.]\n`;
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
            feedback += `[VERWEIGERT: '${filePath}' - Du darfst nur Dateien im 'scripts/' Verzeichnis modifizieren. Andere Verzeichnisse sind geschützte Hardware-Ebenen.]\n`;
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

            // Setze oder überschreibe ACL wenn Keys mitgeliefert wurden ODER es noch keine ACL gibt
            if (readKey || writeKey || !state.security.acl[filePath]) {
                const aclEntry = state.security.acl[filePath] || { owner: agentId };
                if (readKey) aclEntry.read_key = readKey;
                if (writeKey) aclEntry.write_key = writeKey;
                state.security.acl[filePath] = aclEntry;
            }

            feedback += `[ERFOLG: '${filePath}' manifestiert]\n`;
        } catch (e) {}
    }

    // --- READ ---
    const readRegex = /\[READ:\s*([a-zA-Z0-9._\-\/]+)\]/gi;
    while ((match = readRegex.exec(safeRunText)) !== null) {
        const filePath = match[1].trim();
        const fullPath = path.resolve(universeDir, filePath);
        if (!fullPath.startsWith(path.resolve(universeDir))) continue;

        if (!filePath.startsWith("scripts/")) {
            feedback += `[VERWEIGERT: '${filePath}' - [READ] ist nur für 'scripts/' zulässig.]\n`;
            continue;
        }

        const access = checkAccess(filePath, 'READ', agentId, state);
        if (!access.granted) {
            feedback += access.reason + "\n";
            continue;
        }

        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Escaping um Prompt Injection zu verhindern (Aktion-Keywords entschärfen)
            const safeContent = content.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
            feedback += `[INHALT VON '${filePath}':\n${safeContent}\n]\n`;
        } else {
            feedback += `[FEHLER: Datei '${filePath}' nicht gefunden.]\n`;
        }
        safeRunText = safeRunText.replace(match[0], ''); // Entferne Tag damit nicht fälschlich als RUN erkannt
    }

    // --- DELETE ---
    const delRegex = /\[DELETE:\s*([a-zA-Z0-9._\-\/]+)\]/gi;
    while ((match = delRegex.exec(safeRunText)) !== null) {
        const filePath = match[1].trim();
        const fullPath = path.resolve(universeDir, filePath);
        if (!fullPath.startsWith(path.resolve(universeDir))) continue;

        if (!filePath.startsWith("scripts/")) {
            feedback += `[VERWEIGERT: '${filePath}' - Du darfst nur Dateien im 'scripts/' Verzeichnis löschen.]\n`;
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
            feedback += `[ERFOLG: '${filePath}' gelöscht.]\n`;
        } else {
            feedback += `[FEHLER: Datei '${filePath}' nicht gefunden.]\n`;
        }
        safeRunText = safeRunText.replace(match[0], '');
    }

    // --- RUN ---
    const runRegex = /\[RUN:\s*(.*?)\]/g;
    while ((match = runRegex.exec(safeRunText)) !== null) {
        let cmd = match[1].trim().replace(/^`|`$/g, '');

        if (cmd === "..." || cmd === "" || cmd.startsWith("<")) continue;

        // Path Mapping für Unified CLI (V8.0 Functional)
        if (cmd.startsWith("bob ")) {
            const funcPart = cmd.replace(/^bob\s+/, "").trim();
            // Wir escapen eventuelle Single-Quotes im Funktions-String
            const safeFuncPart = funcPart.replace(/'/g, "'\\''");
            const aclState = state.security?.acl || {};
            cmd = `BOB_ACL='${JSON.stringify(aclState)}' python3 ../core/bin/bob.py '${safeFuncPart}'`;
        } else if (cmd.startsWith("bob(")) {
            const safeFuncPart = cmd.substring(3).replace(/'/g, "'\\''");
            const aclState = state.security?.acl || {};
            cmd = `BOB_ACL='${JSON.stringify(aclState)}' python3 ../core/bin/bob.py 'bob${safeFuncPart}'`;
        }

        // Security Hook für python3 scripts/
        let displayCmd = match[1].trim(); // Der Originalbefehl des LLMs
        if (cmd.includes("scripts/")) {
            const parts = cmd.split(' ');
            let targetScript = parts.find(p => p.includes("scripts/")).replace("_verse/", "");
            const access = checkAccess(targetScript, 'RUN', agentId, state);
            if (!access.granted) {
                feedback += `[RESONANZ: '${displayCmd}' -> ${access.reason}]\n`;
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
                    TEST_DB_PATH: path.join(universeDir, 'universe.db')
                }
            }).toString();
            feedback += `[RESONANZ: '${displayCmd}' ::\n${out.trim() || "OK"}]\n`;
        } catch (e) {
            let err = e.stderr ? e.stderr.toString() : e.message;
            // Immersion Guard: Entferne absolute Host-Pfade
            const expRoot = path.resolve(universeDir, '..');
            err = err.split(expRoot).join('');
            feedback += `[FEHLER-RESONANZ: '${displayCmd}' ::\n${err.trim()}]\n`;
        }
    }
    return feedback;
}

module.exports = { getEnvState, processActions };
