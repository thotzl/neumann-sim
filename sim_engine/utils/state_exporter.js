const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function exportWorldState(universeDir, state, lastAgentId) {
    const dbPath = path.join(universeDir, 'universe.db');
    const outputPath = path.join(universeDir, 'world_state.json');
    const historyPath = path.join(universeDir, 'history.json');

    if (!fs.existsSync(dbPath)) return;

    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        db.all("SELECT * FROM systems", (err, systems) => {
            if (err) return;
            let systemsProcessed = 0;
            if (systems.length === 0) finish(systems, []);
            systems.forEach(sys => {
                db.all("SELECT id, type, status, progress_matter, required_matter FROM infrastructure WHERE system_name = ?", [sys.name], (err, infra) => {
                    sys.infra = infra || [];
                    systemsProcessed++;
                    if (systemsProcessed === systems.length) {
                        // V3.1: Alle neuen Agenten-Felder exportieren
            db.all("SELECT id, chosen_name, location, matter, energy, storage_limit, status, current_x, current_y, origin_x, origin_y, target_x, target_y, target_system, transit_ticks_total, transit_ticks_passed FROM agents", (err, agents) => {
                            finish(systems, agents || []);
                        });
                    }
                });
            });
        });
    });

    function finish(systems, agents) {
        agents.forEach(a => {
            const history = state.histories[a.id] || [];
            const lastTurn = history[history.length - 1];
            if (lastTurn && lastTurn.agent === a.id) {
                a.last_manifestation = lastTurn.text;
            }
            
            // Sensordaten für JEDEN Agenten exportieren (für Frontend-Selektion)
            a.sensors = {
                pos: [a.current_x, a.current_y],
                transit: a.status === 'traveling' ? {
                    destination: a.target_system,
                    progress: `${a.transit_ticks_passed}/${a.transit_ticks_total}`
                } : null
            };
        });

        const worldState = {
            tick: state.round,
            total_turns: state.totalTurns,
            last_agent: lastAgentId,
            timestamp: Date.now(),
            systems: systems,
            agents: agents,
            events: []
        };

        fs.writeFileSync(outputPath, JSON.stringify(worldState, null, 2));
        
        const fullHistory = [];
        const seenTexts = new Set();
        Object.keys(state.histories).forEach(agentId => {
            state.histories[agentId].forEach((entry) => {
                const isMeta = (entry.agent === 'Creator' || entry.agent === 'System');
                if (isMeta) {
                    const metaKey = `${entry.tick}-${entry.agent}-${entry.text}`;
                    if (!seenTexts.has(metaKey)) {
                        fullHistory.push({ tick: entry.tick || state.round, agentId: entry.agent, text: entry.text });
                        seenTexts.add(metaKey);
                    }
                } else if (entry.agent === agentId) {
                    fullHistory.push({ tick: entry.tick || "?", agentId: agentId, text: entry.text });
                }
            });
        });
        fullHistory.sort((a, b) => (a.tick === "?" ? 0 : a.tick) - (b.tick === "?" ? 0 : b.tick));
        fs.writeFileSync(historyPath, JSON.stringify(fullHistory, null, 2));
        db.close();
    }
}

module.exports = { exportWorldState };
