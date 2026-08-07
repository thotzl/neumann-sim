const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { safeReadJsonSync } = require('../helpers/io_helpers');
const { UniverseGenerator, hashStringToInt } = require('./generator');

function exportWorldState(universeDir, state, lastAgentId) {
    const dbPath = path.join(universeDir, 'universe.db');
    const outputPath = path.join(universeDir, 'world_state.json');
    const historyPath = path.join(universeDir, 'history.json');

    if (!fs.existsSync(dbPath)) return;

    // Load experiment seed from config.json
    const configPath = path.join(universeDir, '../config.json');
    let seed = 'BobOS_V12';
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            seed = config.seed || seed;
        }
    } catch (e) {
        // fail silently
    }

    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        db.all("SELECT * FROM systems", (err, systems) => {
            if (err) return;
            let systemsProcessed = 0;
            if (systems.length === 0) finish(systems, [], []);
            systems.forEach(sys => {
                // Parse coordinates from name or read from DB columns
                const x = sys.x;
                const y = sys.y;
                
                // Get procedural starting system or natural cell system
                const startSys = UniverseGenerator.getStartingSystem(seed, 1.0);
                let genSys = null;
                if (sys.name === startSys.id) {
                    genSys = startSys;
                } else {
                    const cx = Math.floor(x / 500);
                    const cy = Math.floor(y / 500);
                    genSys = UniverseGenerator.getSectorInCell(cx, cy, hashStringToInt(seed), 1.0);
                }
                
                if (genSys) {
                    sys.mass = genSys.mass;
                    sys.spectralClass = genSys.spectralClass;
                    sys.occurrence = genSys.occurrence;
                    sys.anomaly = genSys.anomaly;
                    sys.anomalyAngle = genSys.anomalyAngle;
                    sys.debrisBelt = genSys.debrisBelt;
                    sys.system = genSys.system; // Dynamic planetary system details!
                    sys.warpCurrent = genSys.warpCurrent;
                }

                db.all("SELECT id, type, status, health, max_health, level, progress_matter, required_matter, linked_system FROM infrastructure WHERE system_name = ?", [sys.name], (err, infra) => {
                    sys.infra = infra || [];
                    systemsProcessed++;
                    if (systemsProcessed === systems.length) {
                        db.all("SELECT * FROM v_agents", (err, agents) => {
                            if (err) {
                                db.all("SELECT * FROM agents", (errLegacy, legacyAgents) => {
                                    handleAgentsAndShips(legacyAgents || []);
                                });
                            } else {
                                handleAgentsAndShips(agents || []);
                            }
                        });

                        function handleAgentsAndShips(agentsList) {
                            db.all("SELECT * FROM ships", (err, ships) => {
                                db.all("SELECT * FROM memos", (errMemos, memos) => {
                                    db.all("SELECT * FROM docs", (errDocs, docs) => {
                                        db.all("SELECT * FROM blueprints", (errBp, blueprints) => {
                                            db.all("SELECT rowid, * FROM visual_events ORDER BY rowid DESC LIMIT 200", (errEv, visualEvents) => {
                                                finish(systems, agentsList, ships || [], memos || [], docs || [], visualEvents || [], blueprints || []);
                                            });
                                        });
                                    });
                                });
                            });
                        }
                    }
                });
            });
        });
    });

    function finish(systems, agents, ships, memos = [], docs = [], visual_events = [], blueprints = []) {
        let popData = {};
        const popJson = safeReadJsonSync(path.join(universeDir, 'population.json'), null);
        if (popJson && Array.isArray(popJson.agents)) {
            popJson.agents.forEach(a => {
                if (a.parent_id) popData[a.id] = a.parent_id;
            });
        }

        agents.forEach(a => {
            // Set parent_id on root of agent for frontend compatibility
            a.parent_id = popData[a.id] || null;

            // Resolve location dynamically for the monitor
            if (a.status === 'traveling') {
                a.location = 'Interstellar';
            } else if (a.host_type === 'ship' && a.host_id) {
                const ship = ships.find(s => s.id.toString() === a.host_id.toString());
                a.location = ship ? ship.system_name : 'Unknown';
            } else if (a.host_type === 'matrix' && a.host_id) {
                let systemName = 'Unknown';
                for (const sys of systems) {
                    if (sys.infra && sys.infra.some(inf => inf.id.toString() === a.host_id.toString())) {
                        systemName = sys.name;
                        break;
                    }
                }
                a.location = systemName;
            } else {
                a.location = 'Unknown';
            }

            const history = state.histories[a.id] || [];
            
            // Find the last actual thought process of the agent (backwards)
            let lastThoughtEntry = null;
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].agent === a.id) {
                    lastThoughtEntry = history[i];
                    break;
                }
            }
            
            if (lastThoughtEntry) {
                a.last_manifestation = lastThoughtEntry.text;
            }
            
            // Export sensor data for EVERY agent (Omni-Format)
            const previews = [];
            if (a.status !== 'traveling') {
                systems.forEach(s => {
                    if (s.name !== a.location) {
                        const dist = Math.sqrt(Math.pow(s.x - a.current_x, 2) + Math.pow(s.y - a.current_y, 2));
                        
                        let speed = 300;
                        if (a.host_type === 'ship' && a.host_id) {
                            const ship = ships.find(shp => s.id && shp.id.toString() === a.host_id.toString());
                            if (ship && ship.max_speed) {
                                speed = parseFloat(ship.max_speed);
                            }
                        }
                        
                        previews.push({
                            target: s.display_name || s.name,
                            dist: Math.round(dist * 10) / 10,
                            cost: Math.floor(dist * 0.1),
                            ticks: Math.max(1, Math.ceil(dist / speed))
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
                    raw_matter_inventory: a.raw_matter_inventory,
                    matter_limit: a.matter_storage_capacity,
                    energy_inventory: a.energy_inventory,
                    energy_limit: 200,
                    refined_matter_inventory: a.refined_matter_inventory
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
            stardate: process.env.BOB_STARDATE || `${state.round}::${state.actualRoundTicks || 1}`,
            total_turns: state.totalTurns,
            timestamp: Date.now(),
            seed: seed,
            experiment_dir: path.resolve(path.join(universeDir, '..')),
            systems: systems,
            agents: agents,
            ships: ships,
            memos: memos,
            docs: docs,
            blueprints: blueprints,
            visual_events: visual_events,
            events: state.events || []
        };
        
        const fullHistory = [];
        const seenTexts = new Set();
        Object.keys(state.histories).forEach(agentId => {
            state.histories[agentId].forEach((entry) => {
                const isMeta = (entry.agent === 'Creator' || entry.agent === 'System');
                if (isMeta) {
                    const metaKey = `${entry.tick}-${entry.agent}-${entry.text}`;
                    if (!seenTexts.has(metaKey)) {
                        fullHistory.push({ 
                            tick: entry.tick || state.round, 
                            stardate: entry.stardate || null,
                            agentId: entry.agent, 
                            text: entry.text 
                        });
                        seenTexts.add(metaKey);
                    }
                } else if (entry.agent === agentId) {
                    fullHistory.push({ 
                        tick: entry.tick || "?", 
                        stardate: entry.stardate || null,
                        agentId: agentId, 
                        text: entry.text 
                    });
                }
            });
        });
        
        fullHistory.sort((a, b) => {
            const parseSD = (sd) => {
                if (!sd) return [0, 0];
                const parts = sd.toString().split('::');
                return [parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0];
            };
            const [c_a, t_a] = parseSD(a.stardate || a.tick);
            const [c_b, t_b] = parseSD(b.stardate || b.tick);
            if (c_a !== c_b) return c_a - c_b;
            return t_a - t_b;
        });

        // ========================================================
        // V12.0 AUGMENTED REAL-TIME WEB_BROADCAST (Silently Decoupled)
        // ========================================================
        const payload = JSON.stringify({ type: 'LIVE_STATE_UPDATE', state: worldState, history: fullHistory });
        postToVogServer(payload);

        db.close();
    }
}

/**
 * Sends a JSON WebSocket broadcast payload to the local VoG C2 server.
 * Operates purely in-memory and fails silently in <1ms on socket blockages.
 */
function postToVogServer(payload) {
    try {
        const http = require('http');
        const broadcastPort = process.env.C2_PORT || 3001;
        const req = http.request({
            hostname: 'localhost',
            port: broadcastPort,
            path: '/api/broadcast',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, () => {});

        req.on('error', () => {
            // Fail silently
        });

        req.setTimeout(500, () => {
            req.destroy();
        });

        req.write(payload);
        req.end();
    } catch (e) {
        // Fail silently
    }
}

/**
 * Reusable, high-performance State Broadcasting hook.
 * Accepts a partial state update and streams it instantly to the browser
 * over WebSockets without doing any database queries or file operations.
 */
function broadcastPartialState(partialState) {
    const payload = JSON.stringify({ type: 'LIVE_STATE_UPDATE', state: partialState });
    postToVogServer(payload);
}

module.exports = { exportWorldState, broadcastPartialState };