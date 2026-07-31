const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const universeDir = path.resolve(__dirname, '../experiments/expanse_2/_verse');
const dbPath = path.join(universeDir, 'universe.db');

const db = new sqlite3.Database(dbPath);

let state = {
    systems: [],
    agents: [],
    ships: [],
    memos: [],
    docs: [],
    visual_events: [],
    blueprints: [],
    logs: []
};

db.serialize(() => {
    db.all("SELECT * FROM systems", (err, systems) => {
        state.systems = systems || [];
        db.all("SELECT * FROM agents", (err, agents) => {
            state.agents = agents || [];
            db.all("SELECT * FROM ships", (err, ships) => {
                state.ships = ships || [];
                db.all("SELECT * FROM infrastructure", (err, infra) => {
                    // map infra to systems
                    if (infra) {
                        infra.forEach(inf => {
                            let sys = state.systems.find(s => s.name === inf.system_name);
                            if (sys) {
                                if (!sys.infra) sys.infra = [];
                                sys.infra.push(inf);
                            }
                        });
                    }
                    fs.writeFileSync(path.join(__dirname, 'mock_state.json'), JSON.stringify(state, null, 2));
                    console.log("mock_state.json created successfully.");
                });
            });
        });
    });
});
