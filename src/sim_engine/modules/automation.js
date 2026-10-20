const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { runPython } = require('./python_executor');
const { PYTHON_BIN } = require('../helpers/python_bin');
const { childEnv } = require('../helpers/child_env');
const envManager = require('./environment');

function runSystemAutomations(vDir, universeDir, state) {
    const activeScriptsDir = path.join(vDir, "_verse", "scripts", "active");
    let autoOutput = "";

    if (!fs.existsSync(activeScriptsDir)) return "";

    // SSoT: Query all active target-bound scripts from the database
    const dbPath = path.join(universeDir, "universe.db");
    if (!fs.existsSync(dbPath)) return "";

    // TCK-145: kernel scripts in core/bin, DB via TEST_DB_PATH (core.lib.db_config)
    const binDir = path.join(vDir, "core", "bin");
    const kernelEnv = childEnv({ PYTHONPATH: path.resolve(vDir), TEST_DB_PATH: dbPath });

    let activeScripts = [];
    try {
        const jsonOut = execFileSync(PYTHON_BIN, [path.join(binDir, "script_list_active.py")], { env: kernelEnv }).toString().trim();
        activeScripts = JSON.parse(jsonOut);
    } catch (e) {
        // Fallback silently if table doesn't exist yet
    }

    if (activeScripts.length === 0) return "";

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
        self.matter_capacity = depots.get('matter_capacity', 0)
        self.energy_capacity = depots.get('energy_capacity', 0)

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

    for (const item of activeScripts) {
        const proxyId = item.target_type === 'ship' ? `Ship-${item.target_id}` : `System-${item.target_id}`;
        
        // Relational Proxy Agent Seeding (Synchronous db-sync block)
        try {
            execFileSync(PYTHON_BIN, [path.join(binDir, "script_sync_proxy.py"), String(item.target_type), String(item.target_id), proxyId], { env: kernelEnv });
        } catch (e) {
            console.error("[AUTOMATION ERROR] Failed to sync proxy:", e.message);
        }

        const targetLocation = item.location;

        try {
            // Execute script on behalf of the virtual proxy ID (Ship-8 or System-SYS_A)
            const out = runPython(vDir, `_verse/${item.path}`, [], { bobId: proxyId, aclState: state.security?.acl || {} });
            
            let feedback = "";
            let reportOut = "No output.";
            
            if (out) {
                feedback = envManager.processActions(out, universeDir, proxyId, state);
                reportOut = out.trim();
            }
            
            const report = `
[AUTOMATION-REPORT]
- System: ${targetLocation}
- Script: ${item.name}
- Target: ${item.target}
- Owner: ${item.owner_id}
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
- Script: ${item.name}
- Target: ${item.target}
- Owner: ${item.owner_id}
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
