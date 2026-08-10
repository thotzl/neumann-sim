const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { runPython } = require('./python_executor');
const envManager = require('./environment');

function runSystemAutomations(vDir, universeDir, state) {
    const activeScriptsDir = path.join(vDir, "_verse", "scripts", "active");
    let autoOutput = "";

    if (!fs.existsSync(activeScriptsDir)) return "";

    // SSoT: Query all active target-bound scripts from the database
    const dbPath = path.join(universeDir, "universe.db");
    if (!fs.existsSync(dbPath)) return "";

    const getScriptsScript = `
import sqlite3, json, os
conn = sqlite3.connect('${dbPath}')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Query all registered scripts with an active target
try:
    cursor.execute("SELECT id, name, path, target, owner_id FROM scripts WHERE target IS NOT NULL AND target != ''")
    rows = cursor.fetchall()
except sqlite3.OperationalError:
    rows = []

active_scripts = []
for r in rows:
    target = r['target']
    target_type, target_id = target.split('::')
    
    is_valid = False
    location = 'Deep Space'
    
    if target_type == 'ship':
        cursor.execute("SELECT system_name, has_logic_core FROM ships WHERE id = CAST(? AS INTEGER)", (target_id,))
        ship = cursor.fetchone()
        if ship and ship['has_logic_core'] == 1:
            is_valid = True
            location = ship['system_name']
    elif target_type == 'system':
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type = 'ami_hub' AND status = 'active'", (target_id,))
        if cursor.fetchone():
            is_valid = True
            location = target_id
            
    if is_valid:
        active_scripts.append({
            'id': r['id'],
            'name': r['name'],
            'path': r['path'],
            'target': target,
            'owner_id': r['owner_id'],
            'target_type': target_type,
            'target_id': target_id,
            'location': location
        })
conn.close()
print(json.dumps(active_scripts))
`.trim();

    let activeScripts = [];
    try {
        const jsonOut = execSync(`python3 -c "${getScriptsScript.replace(/"/g, '\\"')}"`).toString().trim();
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
        const syncProxyScript = `
import sqlite3
conn = sqlite3.connect('${dbPath}')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

target_type = '${item.target_type}'
target_id = '${item.target_id}'
proxy_id = '${proxyId}'

if target_type == 'ship':
    cursor.execute("SELECT name, x, y, system_name FROM ships WHERE id = CAST(? AS INTEGER)", (target_id,))
    ship = cursor.fetchone()
    if ship:
        cursor.execute("INSERT OR IGNORE INTO agents (id, chosen_name, host_type, host_id, active_ship_id, current_x, current_y) VALUES (?, ?, 'ship', ?, ?, ?, ?)",
                       (proxy_id, ship[0], target_id, int(target_id), ship[1], ship[2]))
        cursor.execute("UPDATE agents SET current_x = ?, current_y = ? WHERE id = ?", (ship[1], ship[2], proxy_id))
elif target_type == 'system':
    cursor.execute("SELECT x, y FROM systems WHERE name = ?", (target_id,))
    sys = cursor.fetchone()
    if sys:
        cursor.execute("SELECT id FROM infrastructure WHERE system_name = ? AND type IN ('sem_matrix', 'ami_hub') AND status = 'active'", (target_id,))
        infra = cursor.fetchone()
        host_id = str(infra[0]) if infra else '1'
        cursor.execute("INSERT OR IGNORE INTO agents (id, chosen_name, host_type, host_id, active_ship_id, current_x, current_y) VALUES (?, ?, 'matrix', ?, NULL, ?, ?)",
                       (proxy_id, 'AMI-' + target_id, host_id, sys[0], sys[1]))
conn.commit()
conn.close()
`.trim();

        try {
            execSync(`python3 -c "${syncProxyScript.replace(/"/g, '\\"')}"`);
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
