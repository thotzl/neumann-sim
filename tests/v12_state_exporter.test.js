const fs = require('fs');
const path = require('path');
const http = require('http');
const stateExporter = require('../sim_engine/utils/state_exporter');

describe('V12.0 Augmented State Exporter Broadcast Test', () => {
    let mockServer;
    let receivedPayload = null;
    const testPort = 3333;

    beforeAll((done) => {
        // Set the test port environment variable for the exporter to point to our mock server
        process.env.C2_PORT = String(testPort);

        // Start a mock V12 gateway server on Port 3333
        mockServer = http.createServer((req, res) => {
            if (req.method === 'POST' && req.url === '/api/broadcast') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                    receivedPayload = JSON.parse(body);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'success' }));
                });
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        mockServer.listen(testPort, () => {
            console.log(`[TEST MOCK] Mock V12 Server listening on port ${testPort}`);
            done();
        });
    });

    afterAll((done) => {
        delete process.env.C2_PORT;
        mockServer.close(done);
    });

    test('should successfully export world state and broadcast payload to Port 3001', (done) => {
        // Prepare mock environment directories
        const tempExpDir = path.join(__dirname, 'integration_test_dir', 'temp_v12_exp');
        const universeDir = path.join(tempExpDir, '_verse');
        fs.mkdirSync(universeDir, { recursive: true });

        const mockStateFile = path.join(tempExpDir, 'state.json');
        const mockState = {
            round: 42,
            totalTurns: 100,
            events: ['[Event #1] Mock Event'],
            histories: {
                'Bob': [{ tick: 42, agent: 'Bob', text: 'Thinking about mining...' }]
            }
        };
        fs.writeFileSync(mockStateFile, JSON.stringify(mockState));

        // Create temporary test SQLite database and populate it
        const sqlite3 = require('sqlite3').verbose();
        const dbPath = path.join(universeDir, 'universe.db');
        process.env.TEST_DB_PATH = dbPath;
        process.env.TEST_STATE_PATH = mockStateFile;

        const db = new sqlite3.Database(dbPath);
        db.serialize(() => {
            db.run("CREATE TABLE IF NOT EXISTS systems (name TEXT PRIMARY KEY, x INTEGER, y INTEGER, extractable_matter_in_core INTEGER, max_extractable_matter INTEGER, raw_matter_depot INTEGER, depot_matter_capacity INTEGER, energy_depot INTEGER, depot_energy_capacity INTEGER, refined_matter_depot INTEGER, display_name TEXT)");
            db.run("CREATE TABLE IF NOT EXISTS infrastructure (id INTEGER PRIMARY KEY, system_name TEXT, type TEXT, status TEXT, health INTEGER, max_health INTEGER, level INTEGER, progress_matter INTEGER, required_matter INTEGER)");
            db.run("CREATE TABLE IF NOT EXISTS ships (id INTEGER PRIMARY KEY, name TEXT, chassis TEXT, pilot_id TEXT, system_name TEXT, mass INTEGER, max_speed REAL, thrust INTEGER, has_drill INTEGER, has_fabricator INTEGER, has_logic_core INTEGER, blueprint_name TEXT, progress_matter INTEGER, required_matter INTEGER)");
            db.run("CREATE TABLE IF NOT EXISTS memos (id INTEGER PRIMARY KEY, agent_id TEXT, content TEXT, status TEXT, created_cycle INTEGER)");
            db.run("CREATE TABLE IF NOT EXISTS docs (id INTEGER PRIMARY KEY, author_id TEXT, system_name TEXT, title TEXT, content TEXT, created_cycle INTEGER)");
            db.run("CREATE TABLE IF NOT EXISTS blueprints (id INTEGER PRIMARY KEY, name TEXT, author_id TEXT, matrix_json TEXT, stats_json TEXT)");
            db.run("CREATE TABLE IF NOT EXISTS visual_events (cycle INTEGER, actor_id TEXT, event_type TEXT, description TEXT)");

            db.run("INSERT INTO systems (name, x, y, extractable_matter_in_core, max_extractable_matter, raw_matter_depot, depot_matter_capacity, energy_depot, depot_energy_capacity, refined_matter_depot, display_name) VALUES ('SYS_X0_Y0', 0, 0, 35000, 100000, 4000, 5000, 4500, 5000, 0, 'Core')");
            db.run("INSERT INTO ships (id, name, chassis, pilot_id, system_name, mass, max_speed, thrust, has_drill, has_fabricator, has_logic_core, blueprint_name, progress_matter, required_matter) VALUES (1, 'Pioneer-1', 'Scout', 'Bob', 'SYS_X0_Y0', 290, 34.48, 500, 0, 0, 1, 'Scout', 0, 0)", () => {
                
                // Trigger the augmented state export!
                stateExporter.exportWorldState(universeDir, mockState, 'Bob');

                // Wait 150ms for the asynchronous, non-blocking HTTP post broadcast to arrive
                setTimeout(() => {
                    try {
                        expect(receivedPayload).not.toBeNull();
                        expect(receivedPayload.type).toBe('LIVE_STATE_UPDATE');
                        expect(receivedPayload.state.tick).toBe(42);
                        expect(receivedPayload.state.last_agent).toBe('Bob');
                        expect(receivedPayload.state.systems[0].name).toBe('SYS_X0_Y0');
                        expect(receivedPayload.state.ships[0].name).toBe('Pioneer-1');
                        expect(receivedPayload.history[0].agentId).toBe('Bob');
                        expect(receivedPayload.history[0].text).toBe('Thinking about mining...');
                        
                        console.log('✅ [V12 MOCK TEST] E2E Real-time Broadcast verified successfully!');
                        
                        // Clean up temp environment
                        db.close(() => {
                            fs.rmSync(tempExpDir, { recursive: true, force: true });
                            done();
                        });
                    } catch (err) {
                        db.close(() => {
                            fs.rmSync(tempExpDir, { recursive: true, force: true });
                            done(err);
                        });
                    }
                }, 150);
            });
        });
    });
});
