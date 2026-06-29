const fs = require('fs');
const path = require('path');
const { runPython } = require('./python_executor');
const envManager = require('./environment');

function runAutomations(agentId, vDir, universeDir, state) {
    const activeScriptsDir = path.join(vDir, "_verse", "scripts", "active");
    let autoOutput = "";

    if (fs.existsSync(activeScriptsDir)) {
        const scripts = fs.readdirSync(activeScriptsDir).filter(f => f.endsWith('.py'));
        for (const script of scripts) {
            try {
                // Wir übergeben dem Python Skript nun auch die AgentID als Argument 1
                const out = runPython(vDir, `_verse/scripts/active/${script}`, [agentId]);
                if (out) {
                    const feedback = envManager.processActions(out, universeDir, agentId, state);
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
