const fs = require('fs');
const path = require('path');
const { runPython } = require('./python_executor');
const envManager = require('./environment');

function runSystemAutomations(vDir, universeDir, state) {
    const activeScriptsDir = path.join(vDir, "_verse", "scripts", "active");
    let autoOutput = "";

    if (!fs.existsSync(activeScriptsDir)) return "";

    // Cleanup logic: Completely remove old, unprotected files from the Bob sandbox
    const oldMePy = path.join(activeScriptsDir, "me.py");
    const oldSitePy = path.join(activeScriptsDir, "sitecustomize.py");
    if (fs.existsSync(oldMePy)) {
        try { fs.unlinkSync(oldMePy); } catch (e) {}
    }
    if (fs.existsSync(oldSitePy)) {
        try { fs.unlinkSync(oldSitePy); } catch (e) {}
    }

    // Place dynamically generated me.py in the protected core/lib folder (Pillar 3)
    const coreLibDir = path.join(vDir, "core", "lib");
    const mePyPath = path.join(coreLibDir, "me.py");
    const mePyContent = `import os
import sys
from core.lib.bob_sdk import Agent

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
        self.host = HostObject(dash.get('your_status', {}))
        self.depots = DepotsObject(dash.get('local_system', {}))

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

# Dynamically export only public, callable methods of MeAgent into the module namespace (100% DRY & secure!)
for _name in dir(_agent):
    if not _name.startswith('_'):
        _attr = getattr(_agent, _name)
        if callable(_attr):
            globals()[_name] = _attr
`;
    fs.writeFileSync(mePyPath, mePyContent);

    // Write sitecustomize.py for permanent, import-free bootstrapping support
    const sitePyPath = path.join(coreLibDir, "sitecustomize.py");
    const sitePyContent = `import builtins
import me
builtins.me = me
`;
    fs.writeFileSync(sitePyPath, sitePyContent);

    const scripts = fs.readdirSync(activeScriptsDir).filter(f => f.endsWith('.py') && f !== 'me.py' && f !== 'sitecustomize.py');
    for (const script of scripts) {
        const scriptRelPath = `scripts/active/${script}`;
        const acl = state.security?.acl?.[scriptRelPath];
        const ownerId = acl ? acl.owner : "Unknown";

        // Determine location for local delivery
        const ownerAgent = state.agents.find(a => a.id === ownerId) || state.agents[0];
        const targetLocation = ownerAgent ? ownerAgent.location : "Deep Space";

        try {
            // Execute script on behalf of the owner
            const out = runPython(vDir, `_verse/${scriptRelPath}`, [], { bobId: ownerId, aclState: state.security?.acl || {} });
            
            let feedback = "";
            let reportOut = "No output.";
            
            if (out) {
                feedback = envManager.processActions(out, universeDir, ownerId, state);
                reportOut = out.trim();
            }
            
            const report = `
[AUTOMATION-REPORT]
- System: ${targetLocation}
- Script: ${script}
- Owner: ${ownerId}
- Status: OK
- Output: ${reportOut}
- Result: ${feedback.trim() || 'No engine actions'}`.trim();

            autoOutput += `\n${report}`;
            
            // Delivery to everyone in the system
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
- Script: ${script}
- Owner: ${ownerId}
- Status: FAILED
- Error: ${err.trim()}`.trim();

            autoOutput += `\n${errorMsg}`;
            
            // Error delivery to everyone in the system
            state.agents.filter(a => a.alive && a.location === targetLocation).forEach(a => {
                if (!state.global_inbox[a.id]) state.global_inbox[a.id] = [];
                state.global_inbox[a.id].push({ type: 'automation', text: errorMsg });
            });
        }
    }
    return autoOutput ? `[SYSTEM-AUTOMATION]:${autoOutput}` : "";
}

module.exports = { runSystemAutomations };
