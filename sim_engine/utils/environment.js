const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getEnvState(universeDir) {
    const toolsDir = path.join(universeDir, 'tools');
    if (!fs.existsSync(toolsDir)) return "HARDWARE (tools/): Keine Tools gefunden.";
    
    try {
        const tools = fs.readdirSync(toolsDir).filter(f => f.endsWith('.py'));
        return "HARDWARE (tools/):\n" + tools.join(", ");
    } catch (e) {
        return "HARDWARE (tools/): Fehler beim Lesen.";
    }
}

function processActions(text, universeDir) {
    let feedback = "";
    // --- WRITE ---
    const writeRegex = /\[WRITE:\s*([a-zA-Z0-9._\-\/]+)\]([\s\S]*?)\[END\]/g;
    let match;
    while ((match = writeRegex.exec(text)) !== null) {
        const filePath = match[1];
        const content = match[2].trim();
        const fullPath = path.resolve(universeDir, filePath);
        if (!fullPath.startsWith(path.resolve(universeDir))) continue;
        try {
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, content);
            feedback += `[ERFOLG: '${filePath}' manifestiert]\n`;
        } catch (e) {}
    }
    // --- RUN ---
    const runRegex = /\[RUN:\s*(.*?)\]/g;
    while ((match = runRegex.exec(text)) !== null) {
        let cmd = match[1].trim().replace(/^`|`$/g, '');
        
        // Anti-Halluzinations-Schutz für Platzhalter im Fließtext
        if (cmd === "..." || cmd === "" || cmd.startsWith("<")) continue;

        try {
            const out = execSync(cmd, { cwd: universeDir, timeout: 15000, stdio: 'pipe' }).toString();
            feedback += `[RESONANZ: '${cmd}' -> ${out || "OK"}]\n`;
        } catch (e) {
            const err = e.stderr ? e.stderr.toString() : e.message;
            feedback += `[FEHLER-RESONANZ: '${cmd}' -> ${err.trim()}]\n`;
        }
    }
    return feedback;
}

module.exports = { getEnvState, processActions };
