const fs = require('fs');
const path = require('path');
const { runPython } = require('./python_executor');
const envManager = require('./environment');

function runSystemAutomations(vDir, universeDir, state) {
    const activeScriptsDir = path.join(vDir, "_verse", "scripts", "active");
    let autoOutput = "";

    if (!fs.existsSync(activeScriptsDir)) return "";

    // Dynamisch generierte me.py injizieren, um NameErrors bei Bobs Automatisierungs-Skripten zu verhindern (Säule 3)
    const mePyPath = path.join(activeScriptsDir, "me.py");
    const mePyContent = `import os
import sys
from bob_os.core.lib.bob_sdk import Agent

class ResourceDict(dict):
    def __getattr__(self, name): return self.get(name, 0)

class HostObject:
    def __init__(self, agent_dict):
        self.type = agent_dict.get('host_type')
        self.id = agent_dict.get('host_id')
        inv = agent_dict.get('inventory', {})
        self.inventory = ResourceDict({
            'raw_matter': inv.get('raw_matter', 0),
            'refined_matter': inv.get('refined_matter', 0),
            'energy': inv.get('energy', 0)
        })
        self.storage_capacity = agent_dict.get('storage_capacity', 300)

class DepotsObject:
    def __init__(self, sys_dict):
        depots = sys_dict.get('depots', {})
        self.raw_matter = depots.get('raw_matter', 0)
        self.refined_matter = depots.get('refined_matter', 0)
        self.energy = depots.get('energy', 0)

class StatusWrapper:
    def __init__(self, dash):
        self.host = HostObject(dash.get('dein_status', {}))
        self.depots = DepotsObject(dash.get('lokales_system', {}))

class MeAgent(Agent):
    def __init__(self):
        super().__init__(os.environ.get('BOB_ID', 'Bob'))
        
    def status(self):
        dash = self.dashboard()
        return StatusWrapper(dash)
        
    def log(self, message):
        sys.stderr.write(f"# [LOG] {message}\\n")
        sys.stderr.flush()

_agent = MeAgent()

# Exportiere dynamisch alle öffentlichen Methoden und Attribute von MeAgent in den Modulnamensraum (100% DRY!)
for _name in dir(_agent):
    if not _name.startswith('_'):
        globals()[_name] = getattr(_agent, _name)
`;
    fs.writeFileSync(mePyPath, mePyContent);

    const scripts = fs.readdirSync(activeScriptsDir).filter(f => f.endsWith('.py') && f !== 'me.py');
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
