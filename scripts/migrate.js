const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.argv[2];
if (!dbPath) {
    console.error("[MIGRATOR ERROR] Please specify database file path. Example: node scripts/migrate.js experiments/ONE/_verse/universe.db");
    process.exit(1);
}

// Ensure parent directories exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`[MIGRATOR] Connecting to database: ${dbPath}`);
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(`[MIGRATOR ERROR] Failed to connect:`, err.message);
        process.exit(1);
    }
});

// Use serialization to guarantee order
db.serialize(() => {
    // 1. Create migrations tracking table
    db.run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error(`[MIGRATOR ERROR] Failed to create schema_migrations table:`, err.message);
            db.close();
            process.exit(1);
        }
        
        // 2. Read all migrations from migrations directory
        const migrationsDir = path.resolve(__dirname, '../src/bob_os/core/migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.error(`[MIGRATOR ERROR] Migrations directory not found at: ${migrationsDir}`);
            db.close();
            process.exit(1);
        }
        
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Natural alphabetical sort (0001_, 0002_ ...)
            
        if (files.length === 0) {
            console.log("[MIGRATOR] No SQL migration files found.");
            db.close();
            process.exit(0);
        }
        
        // Process each migration sequentially
        let index = 0;
        function processNext() {
            if (index >= files.length) {
                console.log("[MIGRATOR] All migrations verified/applied successfully.");
                db.close();
                process.exit(0);
            }
            
            const file = files[index];
            db.get(`SELECT version FROM schema_migrations WHERE version = ?`, [file], (err, row) => {
                if (err) {
                    console.error(`[MIGRATOR ERROR] Failed to query migrations table:`, err.message);
                    db.close();
                    process.exit(1);
                }
                
                if (row) {
                    // Already applied, skip to next
                    index++;
                    processNext();
                } else {
                    // Apply migration
                    console.log(`[MIGRATOR] Applying migration: ${file}...`);
                    const sqlPath = path.join(migrationsDir, file);
                    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
                    
                    db.serialize(() => {
                        db.run("BEGIN TRANSACTION");
                        db.exec(sqlContent, (err) => {
                            if (err) {
                                console.error(`[MIGRATOR ERROR] Migration '${file}' failed! Rolling back. Error:`, err.message);
                                db.run("ROLLBACK", () => {
                                    db.close();
                                    process.exit(1);
                                });
                            } else {
                                db.run(`INSERT INTO schema_migrations (version) VALUES (?)`, [file], (err) => {
                                    if (err) {
                                        console.error(`[MIGRATOR ERROR] Failed to log migration version in database:`, err.message);
                                        db.run("ROLLBACK", () => {
                                            db.close();
                                            process.exit(1);
                                        });
                                    } else {
                                        db.run("COMMIT", (err) => {
                                            if (err) {
                                                console.error("[MIGRATOR ERROR] Commit failed:", err.message);
                                                db.close();
                                                process.exit(1);
                                            } else {
                                                console.log(`[MIGRATOR SUCCESS] Migration '${file}' applied successfully.`);
                                                index++;
                                                processNext();
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    });
                }
            });
        }
        
        processNext();
    });
});
