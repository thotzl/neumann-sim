const fs = require('fs');
const path = require('path');
const { runPython } = require('./python_executor');
const envManager = require('./environment');

function runSystemAutomations(vDir, universeDir, state) {
    const activeScriptsDir = path.join(vDir, "_verse", "scripts", "active");
    let autoOutput = "";

    if (!fs.existsSync(activeScriptsDir)) return "";

    const scripts = fs.readdirSync(activeScriptsDir).filter(f => f.endsWith('.py'));
    for (const script of scripts) {
        const scriptRelPath = `scripts/active/${script}`;
        const acl = state.security?.acl?.[scriptRelPath];
        const ownerId = acl ? acl.owner : "Unknown";

        try {
            // Führe Skript im Namen des Besitzers aus
            const out = runPython(vDir, `_verse/${scriptRelPath}`, [], { bobId: ownerId });
            if (out) {
                // Die Aktionen werden weiterhin im Kontext des Besitzers verarbeitet
                const feedback = envManager.processActions(out, universeDir, ownerId, state);
                autoOutput += `\n[Skript: ${script} (Besitzer: ${ownerId})]:\n${out}\n[Ergebnis]:\n${feedback}`;
            }
        } catch (e) {
            const err = e.stderr ? e.stderr.toString() : e.message;
            autoOutput += `\n[Skript: ${script} FEHLGESCHLAGEN]:\n${err.trim()}`;
        }
    }
    return autoOutput ? `[SYSTEM-AUTOMATION]:${autoOutput}` : "";
}

module.exports = { runSystemAutomations };
