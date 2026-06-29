const fs = require('fs');
const path = require('path');
const { runPython } = require('./python_executor');

function runAutomations(agentId, vDir, universeDir) {
    const activeScriptsDir = path.join(vDir, "_verse", "scripts", "active");
    let autoOutput = "";

    if (fs.existsSync(activeScriptsDir)) {
        const scripts = fs.readdirSync(activeScriptsDir).filter(f => f.endsWith('.py'));
        for (const script of scripts) {
            try {
                const out = runPython(vDir, `_verse/scripts/active/${script}`);
                if (out) {
                    const feedback = envManager.processActions(out, universeDir);
                    autoOutput += `\n[Skript: ${script}]:\n${out}\n[Ergebnis]:\n${feedback}`;
                }
            } catch (e) {
                const err = e.stderr ? e.stderr.toString() : e.message;
                autoOutput += `\n[Skript: ${script} FEHLGESCHLAGEN]:\n${err.trim()}`;
            }
        }
    }
    return autoOutput ? `[AUTOMATION-ERGEBNIS]:${autoOutput}` : "";
}

module.exports = { runAutomations };
