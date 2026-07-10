const fs = require('fs');
const path = require('path');
const { runPython } = require('./python_executor');

function syncPopulation(populationFile, universeDir, vDir, state, logger, logFile, currentRound) {
    let popData = null;
    if (!fs.existsSync(populationFile)) {
        popData = { 
            version: 1, 
            agents: state.agents.filter(a => a.alive).map(a => ({
                id: a.id, location: a.location || ".", system_prompt: a.system_prompt, status: "active" 
            }))
        };
        fs.writeFileSync(populationFile, JSON.stringify(popData, null, 2));
    } else {
        try {
            popData = JSON.parse(fs.readFileSync(populationFile, 'utf8'));
        } catch (e) { return; }
    }

    if (!popData || !Array.isArray(popData.agents)) return;
    
    popData.agents.forEach(pAgent => {
        let agentObj = state.agents.find(a => a.id === pAgent.id);
        if (!agentObj) {
            const fallbackPrompt = state.agents[0] ? state.agents[0].system_prompt : ".";
            agentObj = {
                id: pAgent.id,
                system_prompt: pAgent.system_prompt || pAgent.prompt || fallbackPrompt,
                location: pAgent.location || ".",
                alive: pAgent.status === "active",
                needsResumeNotify: true
            };
            state.agents.push(agentObj);
        } else {
            agentObj.system_prompt = pAgent.system_prompt || pAgent.prompt || agentObj.system_prompt;
            agentObj.location = pAgent.location || ".";
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
                // 1. Physische Manifestation in SQLite (Via Executor)
                const dbScript = `
import sqlite3
import sys
conn = sqlite3.connect(sys.argv[1])
conn.execute("INSERT OR IGNORE INTO agents (id, chosen_name, location, matter, energy, storage_limit, status, current_x, current_y) VALUES (?, 'Unnamed', ?, 0, 100, 100, 'active', 0, 0)", (sys.argv[2], sys.argv[3]))
conn.commit()
conn.close()
`;
                require('child_process').execFileSync('python3', ['-c', dbScript, path.join(universeDir, 'universe.db'), agentObj.id, agentObj.location || 'SYS-X0-Y0']);

                // 2. Dashboard abfragen (Via CLI)
                const dashOut = runPython(vDir, `core/bin/bob.py`, ['dashboard'], { bobId: agentObj.id });
                
                const parentText = parentId ? `\nAbstammung: Klon von ${parentId}` : '';
                const bootMsg = `[SYSTEM BOOT SEQUENZ ABGESCHLOSSEN]\nIdentität: ${agentObj.id}${parentText}\nAktueller Standort: ${agentObj.location}\n\n[INITIALER SENSOR-SCAN (DASHBOARD)]:\n${dashOut.trim()}`;
                
                state.histories[agentObj.id].push({ agent: "System", text: bootMsg });
                console.log(`  [BOOT] Hard-Boot für ${agentObj.id} prozessual abgeschlossen.`);

                // 3. Birth-Log & Frontend Event
                let lastParentMemory = "";
                if (state.histories[agentObj.id].length > 1) {
                    const prevTurn = state.histories[agentObj.id][state.histories[agentObj.id].length - 2];
                    if (prevTurn && prevTurn.text) lastParentMemory = prevTurn.text;
                }
                logger.appendBirthLog(logFile, currentRound, agentObj.id, parentId, `${lastParentMemory}\n${bootMsg}\n${agentObj.system_prompt}`);
                
                if (!state.events) state.events = [];
                state.events.push(`[Zyklus ${currentRound}]: 🧬 ${agentObj.id} wurde initialisiert.`);

            } catch (e) {
                console.error(`  [BOOT-FEHLER] Initialisierung von ${agentObj.id} gescheitert:`, e.message);
            }
        }
    });
}

module.exports = { syncPopulation };
