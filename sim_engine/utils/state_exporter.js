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
            db.all("SELECT id, chosen_name, location, matter, energy, storage_limit, status, birth_cycle, current_x, current_y, origin_x, origin_y, target_x, target_y, target_system, transit_ticks_total, transit_ticks_passed FROM agents", (err, agents) => {                            finish(systems, agents || []);
                        });
                    }
                });
            });
        });
    });

    function finish(systems, agents) {
        let popData = {};
        try {
            const popJson = JSON.parse(require('fs').readFileSync(path.join(universeDir, 'population.json'), 'utf8'));
            popJson.agents.forEach(a => {
                if (a.parent_id) popData[a.id] = a.parent_id;
            });
        } catch(e) {}

        agents.forEach(a => {
            const history = state.histories[a.id] || [];
            const lastTurn = history[history.length - 1];
            if (lastTurn && lastTurn.agent === a.id) {
                a.last_manifestation = lastTurn.text;
            }
            
            // Sensordaten für JEDEN Agenten exportieren (Omni-Format)
            const previews = [];
            if (a.status !== 'traveling') {
                systems.forEach(s => {
                    if (s.name !== a.location) {
                        const dist = Math.sqrt(Math.pow(s.x - a.current_x, 2) + Math.pow(s.y - a.current_y, 2));
                        previews.push({
                            target: s.display_name || s.name,
                            dist: Math.round(dist * 10) / 10,
                            cost: Math.floor(dist * 0.1),
                            ticks: Math.max(1, Math.ceil(dist / 300))
                        });
                    }
                });
            }

            a.sensors = {
                id: a.id,
                parent_id: popData[a.id] || null,
                chosen_name: a.chosen_name,
                status: a.status,
                location: a.location,
                birth_cycle: a.birth_cycle,
                pos: { x: a.current_x, y: a.current_y },
                inventory: {
                    matter: a.matter,
                    matter_limit: a.storage_limit,
                    energy: a.energy,
                    energy_limit: 200
                },
                transit: a.status === 'traveling' ? {
                    destination: a.target_system,
                    progress_ticks: a.transit_ticks_passed,
                    total_ticks: a.transit_ticks_total,
                    target_pos: { x: a.target_x, y: a.target_y }
                } : null,
                travel_previews: previews
            };
        });

        const worldState = {
            tick: state.round,
            total_turns: state.totalTurns,
            last_agent: lastAgentId,
            timestamp: Date.now(),
            systems: systems,
            agents: agents,
            events: state.events || []
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
