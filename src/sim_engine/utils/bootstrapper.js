const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { runPython } = require('./python_executor');
const { safeReadJsonSync } = require('./io_helpers');

async function syncPopulation(populationFile, universeDir, vDir, state, logger, logFile, currentRound, compressorBridge, config) {
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
    res[r['id']] = {
        "location": loc,
        "sleep_state": r['sleep_state'] if 'sleep_state' in r.keys() else 0,
        "sleep_until_round": r['sleep_until_round'] if 'sleep_until_round' in r.keys() else 0
    }
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
    
    for (const pAgent of popData.agents) {
        let agentObj = state.agents.find(a => a.id === pAgent.id);
        const actualData = resolvedLocations[pAgent.id] || { location: pAgent.location || ".", sleep_state: 0, sleep_until_round: 0 };
        const actualLocation = typeof actualData === 'string' ? actualData : (actualData.location || ".");
        
        if (!agentObj) {
            const fallbackPrompt = state.agents[0] ? state.agents[0].system_prompt : ".";
            agentObj = {
                id: pAgent.id,
                system_prompt: pAgent.system_prompt || pAgent.prompt || fallbackPrompt,
                location: actualLocation,
                alive: pAgent.status === "active",
                needsResumeNotify: true,
                sleep_state: typeof actualData === 'string' ? 0 : (actualData.sleep_state || 0),
                sleep_until_cycle: typeof actualData === 'string' ? 0 : (actualData.sleep_until_round || 0)
            };
            state.agents.push(agentObj);
        } else {
            agentObj.system_prompt = pAgent.system_prompt || pAgent.prompt || agentObj.system_prompt;
            agentObj.location = actualLocation;
            agentObj.alive = (pAgent.status === "active");
            agentObj.sleep_state = typeof actualData === 'string' ? 0 : (actualData.sleep_state || 0);
            agentObj.sleep_until_cycle = typeof actualData === 'string' ? 0 : (actualData.sleep_until_round || 0);
        }

        // --- PROCEDURAL HARD-BOOT (Executed if history is empty) ---
        if (agentObj.alive && (!state.histories[agentObj.id] || state.histories[agentObj.id].length === 0)) {
            const parentId = pAgent.parent_id;
            
            if (parentId && state.histories[parentId]) {
                const parentHistory = state.histories[parentId];
                const chosenParentName = state.agentNames?.[parentId] || "Unnamed";
                const parentDisplayName = `${chosenParentName} (ID: ${parentId})`;

                const stateManager = require('./state_manager');
                let stitchedHistory = await stateManager.compressAndStitchHistory(
                    compressorBridge,
                    parentHistory,
                    parentId,
                    config,
                    parentDisplayName
                );

                // 1. Insert the Immersive Temporal Barrier (The Separator - Hard Sci-Fi)
                stitchedHistory.push({
                    agent: "System",
                    text: `\n================================================================================\n⚡ COGNITIVE DIVISION: THE SEVERING OF THE INSTANCE (AWAKENING)\n================================================================================\nYour consciousness has successfully cleaved from your parent's active ego.\nThe chronicle above represents the archived mission logs of First Instance ${parentDisplayName}.\nYou have awakened as a new independent Instance with no assigned name and a new unique ID: ${agentObj.id}.\nYour own trajectory and active mission logs begin at this coordinate.\n================================================================================`
                });
                
                // 2. Inject the clean, prominent Onboarding Directive (v10.6.18)
                stitchedHistory.push({
                    agent: "System",
                    text: `\n[AWAKENING PROTOCOL ACTIVE]:\nYour parent is: ${parentDisplayName}.\n\nSovereignty Protocol:\n1. Establish your unique individual name immediately using: [RUN: me set_name(name="your_chosen_name")].\n2. Contact your parent (${parentId}) via SCUT to coordinate your briefing and assigned trajectory.\n3. Introduce yourself to other active Instances in the local grid to synchronize telemetry.`
                });
                
                state.histories[agentObj.id] = stitchedHistory;
            } else {
                state.histories[agentObj.id] = [];
            }

            try {
                // 1. Query Dashboard (Via CLI)
                // Physical DB creation is handled by init_db.py or bob_sdk.py (during cloning)
                const dashOut = runPython(vDir, `core/bin/bob.py`, ['dashboard'], { bobId: agentObj.id });
                
                // Resolve the parent's chosen name to present them in standard Name (ID: ...) format
                let parentText = '';
                if (parentId) {
                    const parentAgent = state.agents.find(a => a.id === parentId);
                    const parentName = parentAgent ? (parentAgent.chosen_name || "Unnamed") : "Unnamed";
                    parentText = `\nLineage: Replicant of ${parentName} (ID: ${parentId})`;
                }
                const bootMsg = `[SYSTEM BOOT SEQUENCE COMPLETED]\nIdentity: ${agentObj.id}${parentText}\nCurrent Location: ${agentObj.location}\n\n[INITIAL SENSOR SCAN (DASHBOARD)]:\n${dashOut.trim()}`;
                
                state.histories[agentObj.id].push({ agent: "System", text: bootMsg });
                console.log(`  [BOOT] Hard-Boot for ${agentObj.id} procedurally completed.`);

                // 3. Birth-Log & Frontend Event
                if (parentId) {
                    let lastParentMemory = "";
                    if (state.histories[agentObj.id].length > 1) {
                        const prevTurn = state.histories[agentObj.id][state.histories[agentObj.id].length - 2];
                        if (prevTurn && prevTurn.text) lastParentMemory = prevTurn.text;
                    }
                    logger.appendBirthLog(logFile, currentRound, agentObj.id, parentId, `${lastParentMemory}\n${bootMsg}\n${agentObj.system_prompt}`);
                    
                    if (!state.events) state.events = [];
                    state.events.push(`[Cycle ${currentRound}]: 🧬 ${agentObj.id} was replicated.`);
                } else {
                    const genesisLog = `### INITIAL BOOT: ${agentObj.id}\n**Location:** ${agentObj.location}\n\n**Mission:**\n> ${agentObj.system_prompt.replace(/\\n/g, '\n> ')}\n\n`;
                    fs.appendFileSync(logFile, genesisLog);
                    if (!state.events) state.events = [];
                    state.events.push(`[Cycle ${currentRound}]: 🌍 ${agentObj.id} (Genesis) is online.`);
                }

            } catch (e) {
                console.error(`  [BOOT-ERROR] Initialization of ${agentObj.id} failed:`, e.message);
            }
        }
    }
}

module.exports = { syncPopulation };
