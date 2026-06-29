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

    // Sicherstellen, dass text ein String ist (execSync gibt oft Buffer zurück)
    if (typeof text !== 'string') {
        text = text ? text.toString() : "";
    }

    // Extrahiere nur den aktiven Teil des LLM Outputs (Vermeidung von Phantom-Aktionen in ANALYSE)
    let activeText = text;
    const actionSplit = text.split(/AKTION(?:EN)?[:]/i);
    if (actionSplit.length > 1) {
        activeText = actionSplit.slice(1).join("AKTION:");
    }

    // --- WRITE & REPLACE ---
    // Behandle REPLACE wie WRITE (komplettes Überschreiben der Datei)
    const fileRegex = /\[(?:WRITE|REPLACE):\s*([a-zA-Z0-9._\-\/]+)\]([\s\S]*?)\[END\]/g;
    let match;
    let safeRunText = activeText; // Kopie für den Run-Regex, aus der die Dateiinhalte entfernt werden

    while ((match = fileRegex.exec(activeText)) !== null) {
        const filePath = match[1];
        let content = match[2].trim();

        // Entferne den gesamten Datei-Block aus dem safeRunText, damit [RUN: ] darin nicht ausgeführt wird
        safeRunText = safeRunText.replace(match[0], `[FILE_OPERATION_REMOVED_FROM_PARSE_TREE]`);

        // Sanitize: Entferne umgebende Markdown-Blöcke
        if (content.startsWith('```')) {
            content = content.replace(/^```[a-zA-Z]*\n/, ''); 
            content = content.replace(/\n```$/, '');
        }

        // Sanitize: Einzelne Backticks
        content = content.split('\n').map(line => line.replace(/^`|`$/g, '')).join('\n');

        const fullPath = path.resolve(universeDir, filePath);
        // Jail-Check: Verhindert Ausbruch aus _verse/
        if (!fullPath.startsWith(path.resolve(universeDir))) continue;

        // Sandbox Guard: Verhindert Modifikation von Hardware (tools/) oder Core-Dateien
        if (!filePath.startsWith("scripts/")) {
            feedback += `[VERWEIGERT: '${filePath}' - Du darfst nur Dateien im 'scripts/' Verzeichnis modifizieren. Andere Verzeichnisse sind geschützte Hardware-Ebenen.]\n`;
            continue;
        }

        try {
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, content);
            feedback += `[ERFOLG: '${filePath}' manifestiert]\n`;
        } catch (e) {}
    }

    // --- RUN ---
    // Wir nutzen safeRunText, der keine Datei-Inhalte (und somit keine Pseudo-[RUN] Befehle des LLMs) mehr enthält
    const runRegex = /\[RUN:\s*(.*?)\]/g;
    while ((match = runRegex.exec(safeRunText)) !== null) {
        let cmd = match[1].trim().replace(/^`|`$/g, '');
        
        // Anti-Halluzinations-Schutz für Platzhalter im Fließtext
        if (cmd === "..." || cmd === "" || cmd.startsWith("<")) continue;

        try {
            const out = execSync(cmd, { 
                cwd: universeDir, 
                timeout: 15000, 
                stdio: 'pipe',
                env: { ...process.env, PYTHONPATH: path.resolve(universeDir, '..') }
            }).toString();
            feedback += `[RESONANZ: '${cmd}' -> ${out || "OK"}]\n`;
        } catch (e) {
            const err = e.stderr ? e.stderr.toString() : e.message;
            feedback += `[FEHLER-RESONANZ: '${cmd}' -> ${err.trim()}]\n`;
        }
    }
    return feedback;
}

module.exports = { getEnvState, processActions };
