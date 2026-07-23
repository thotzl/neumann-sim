const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { runPython } = require('./python_executor');
const { safeReadJsonSync } = require('./io_helpers');

function syncPopulation(populationFile, universeDir, vDir, state, logger, logFile, currentRound) {
    // Dynamically resolve actual locations from SQLite universe.db (Step 2)
    let resolvedLocations = {};
    const dbPath = path.join(universeDir, 'universe.db');
    if (fs.existsSync(dbPath)) {
        try {
            const pyScript = `
import sqlite3, json
from core.lib.agent_service import resolve_agent_location
conn = sqlite3.connect('${dbPath.replace(/\\/g, '\\\\')}')
conn.row_factory = sqlite3.Row
c_outer = conn.cursor()
c_inner = conn.cursor()
res = {}
for r in c_outer.execute('SELECT * FROM agents'):
    loc = resolve_agent_location(c_inner, r['host_type'], r['host_id'], r['status'])
    res[r['id']] = loc
conn.close()
print(json.dumps(res))`;
            const out = execSync(`python3 -c "${pyScript.replace(/"/g, '\\"')}"`, {
                env: { ...process.env, PYTHONPATH: path.resolve(universeDir, '..') }
            }).toString().trim();
            resolvedLocations = JSON.parse(out);
        } catch (e) {
            console.error("[SYNC-LOCATION-ERROR]", e.message);
        }
    }

    let popData = safeReadJsonSync(populationFile);
    if (!popData) {
        popData = { 
            version: 1, 
            agents: state.agents.filter(a => a.alive).map(a => ({
                id: a.id, location: a.location || ".", system_prompt: a.system_prompt, status: "active" 
            }))
        };
        fs.writeFileSync(populationFile, JSON.stringify(popData, null, 2));
    } else {
        if (!popData.agents || popData.agents.length === 0) {
             popData.agents = state.agents.filter(a => a.alive).map(a => ({
                id: a.id, location: a.location || ".", system_prompt: a.system_prompt, status: "active" 
            }));
            fs.writeFileSync(populationFile, JSON.stringify(popData, null, 2));
        }
    }

    if (!popData || !Array.isArray(popData.agents)) return;

    // Self-healing: Ensure all state.agents exist in popData.agents (Task 3)
    let popChanged = false;
    state.agents.forEach(sa => {
        let exists = popData.agents.some(pa => pa.id === sa.id);
        if (!exists) {
            popData.agents.push({
                id: sa.id,
                location: sa.location,
                status: sa.alive ? "active" : "inactive",
                system_prompt: sa.system_prompt
            });
            popChanged = true;
        }
    });
    if (popChanged) {
        fs.writeFileSync(populationFile, JSON.stringify(popData, null, 2));
    }
    
    popData.agents.forEach(pAgent => {
        let agentObj = state.agents.find(a => a.id === pAgent.id);
        const actualLocation = resolvedLocations[pAgent.id] || pAgent.location || ".";
        if (!agentObj) {
            const fallbackPrompt = state.agents[0] ? state.agents[0].system_prompt : ".";
            agentObj = {
                id: pAgent.id,
                system_prompt: pAgent.system_prompt || pAgent.prompt || fallbackPrompt,
                location: actualLocation,
                alive: pAgent.status === "active",
                needsResumeNotify: true
            };
            state.agents.push(agentObj);
        } else {
            agentObj.system_prompt = pAgent.system_prompt || pAgent.prompt || agentObj.system_prompt;
            agentObj.location = actualLocation;
            agentObj.alive = (pAgent.status === "active");
        }

        // --- PROZESSUALER HARD-BOOT (Wird ausgeführt wenn Historie noch leer ist) ---
        if (agentObj.alive && (!state.histories[agentObj.id] || state.histories[agentObj.id].length === 0)) {
            const parentId = pAgent.parent_id;
            
            if (parentId && state.histories[parentId]) {
                state.histories[agentObj.id] = JSON.parse(JSON.stringify(state.histories[parentId]));
            } else {
                state.histories[agentObj.id] = [];
            }

            try {
                // 1. Dashboard abfragen (Via CLI)
                // Die physische DB-Erstellung übernimmt init_db.py oder bob_sdk.py (beim Klonen)
                const dashOut = runPython(vDir, `core/bin/bob.py`, ['dashboard'], { bobId: agentObj.id });
                
                const parentText = parentId ? `\nAbstammung: Replikant von ${parentId}` : '';
                const bootMsg = `[SYSTEM BOOT SEQUENZ ABGESCHLOSSEN]\nIdentität: ${agentObj.id}${parentText}\nAktueller Standort: ${agentObj.location}\n\n[INITIALER SENSOR-SCAN (DASHBOARD)]:\n${dashOut.trim()}`;
                
                state.histories[agentObj.id].push({ agent: "System", text: bootMsg });
                console.log(`  [BOOT] Hard-Boot für ${agentObj.id} prozessual abgeschlossen.`);

                // 3. Birth-Log & Frontend Event
                if (parentId) {
                    let lastParentMemory = "";
                    if (state.histories[agentObj.id].length > 1) {
                        const prevTurn = state.histories[agentObj.id][state.histories[agentObj.id].length - 2];
                        if (prevTurn && prevTurn.text) lastParentMemory = prevTurn.text;
                    }
                    logger.appendBirthLog(logFile, currentRound, agentObj.id, parentId, `${lastParentMemory}\n${bootMsg}\n${agentObj.system_prompt}`);
                    
                    if (!state.events) state.events = [];
                    state.events.push(`[Zyklus ${currentRound}]: 🧬 ${agentObj.id} wurde repliziert.`);
                } else {
                    const genesisLog = `### INITIALER BOOT: ${agentObj.id}\n**Standort:** ${agentObj.location}\n\n**Mission:**\n> ${agentObj.system_prompt.replace(/\\n/g, '\n> ')}\n\n**Sensoren:**\n\`\`\`json\n${dashOut.trim()}\n\`\`\`\n\n`;
                    fs.appendFileSync(logFile, genesisLog);
                    if (!state.events) state.events = [];
                    state.events.push(`[Zyklus ${currentRound}]: 🌍 ${agentObj.id} (Genesis) ist online.`);
                }

            } catch (e) {
                console.error(`  [BOOT-FEHLER] Initialisierung von ${agentObj.id} gescheitert:`, e.message);
            }
        }
    });
}

module.exports = { syncPopulation };
