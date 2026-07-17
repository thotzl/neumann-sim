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

        // Ermittle Standort für die lokale Zustellung
        const ownerAgent = state.agents.find(a => a.id === ownerId) || state.agents[0];
        const targetLocation = ownerAgent ? ownerAgent.location : "Deep Space";

        try {
            // Führe Skript im Namen des Besitzers aus
            const out = runPython(vDir, `_verse/${scriptRelPath}`, [], { bobId: ownerId, aclState: state.security?.acl || {} });
            
            let feedback = "";
            let reportOut = "Keine Ausgaben.";
            
            if (out) {
                feedback = envManager.processActions(out, universeDir, ownerId, state);
                reportOut = out.trim();
            }
            
            const report = `
[AUTOMATION-REPORT]
- System: ${targetLocation}
- Skript: ${script}
- Besitzer: ${ownerId}
- Status: OK
- Output: ${reportOut}
- Ergebnis: ${feedback.trim() || 'Keine Engine-Aktionen'}`.trim();

            autoOutput += `\n${report}`;
            
            // Zustellung an alle im System
            state.agents.filter(a => a.alive && a.location === targetLocation).forEach(a => {
                if (!state.global_inbox[a.id]) state.global_inbox[a.id] = [];
                state.global_inbox[a.id].push({ type: 'automation', text: report });
            });
        } catch (e) {
            let err = e.stderr ? e.stderr.toString() : e.message;
            const expRoot = path.resolve(vDir);
            err = err.split(expRoot).join('');
            
            const errorMsg = `
[AUTOMATION-REPORT]
- System: ${targetLocation}
- Skript: ${script}
- Besitzer: ${ownerId}
- Status: FEHLGESCHLAGEN
- Fehler: ${err.trim()}`.trim();

            autoOutput += `\n${errorMsg}`;
            
            // Fehler-Zustellung an alle im System
            state.agents.filter(a => a.alive && a.location === targetLocation).forEach(a => {
                if (!state.global_inbox[a.id]) state.global_inbox[a.id] = [];
                state.global_inbox[a.id].push({ type: 'automation', text: errorMsg });
            });
        }
    }
    return autoOutput ? `[SYSTEM-AUTOMATION]:${autoOutput}` : "";
}

module.exports = { runSystemAutomations };
