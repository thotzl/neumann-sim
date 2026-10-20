const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

console.log("==================================================");
console.log("🚀 STARTING SQL-FILE DATABASE MIGRATION TESTS");
console.log("==================================================");

const testVDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bob-test-migrations-'));
process.on('exit', () => fs.rmSync(testVDir, { recursive: true, force: true }));
const dbPath = path.join(testVDir, 'universe.db');
const repoRoot = path.resolve(__dirname, '../..');

async function runSql(db, query) {
    return new Promise((resolve, reject) => {
        db.all(query, (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

async function runTests() {
    try {
        // 1. Run Ground Zero Migrations
        console.log("Step 1: Running Ground Zero Migrations on empty database...");
        execSync(`node scripts/migrate.js ${dbPath}`, { stdio: 'pipe' });
        
        const db = new sqlite3.Database(dbPath);
        
        // 2. Verify tables and tracking table
        console.log("Step 2: Verifying applied migrations and generated tables...");
        const migrations = await runSql(db, "SELECT * FROM schema_migrations");
        console.log("  Applied version tracking:", migrations);
        const appliedVersions = migrations.map(m => m.version);
        if (!appliedVersions.includes('0001_ground_zero.sql') || !appliedVersions.includes('0002_add_emergency_beacons.sql')) {
            throw new Error("schema_migrations table does not track baselines correctly!");
        }
        
        // Verify key tables exist
        const tables = await runSql(db, "SELECT name FROM sqlite_master WHERE type='table'");
        const tableNames = tables.map(t => t.name);
        console.log("  Created tables:", tableNames);
        
        const requiredTables = ['systems', 'agents', 'ships', 'blueprints', 'infrastructure', 'memos', 'docs', 'schema_migrations', 'emergency_beacons'];
        for (const req of requiredTables) {
            if (!tableNames.includes(req)) {
                throw new Error(`Required table '${req}' is missing from the database!`);
            }
        }
        console.log("  ✅ Baseline tables successfully verified.");
        
        // 3. Incremental migration check
        console.log("Step 3: Creating and applying an incremental migration...");
        // migrate.js reads migrations relative to its own location: run a copy of it inside the
        // temp dir so the incremental test migration never touches src/.
        const migratorRoot = path.join(testVDir, 'migrator');
        const migrationsDir = path.join(migratorRoot, 'src/bob_os/core/migrations');
        fs.cpSync(path.join(repoRoot, 'src/bob_os/core/migrations'), migrationsDir, { recursive: true });
        fs.mkdirSync(path.join(migratorRoot, 'scripts'), { recursive: true });
        fs.copyFileSync(path.join(repoRoot, 'scripts/migrate.js'), path.join(migratorRoot, 'scripts/migrate.js'));
        const baselineFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
        const baselineCount = baselineFiles.length;

        const nextMigrationFile = path.resolve(migrationsDir, '0009_test_patch.sql');
        const sqlContent = `
            ALTER TABLE agents ADD COLUMN test_patch_col TEXT DEFAULT 'unlocked';
            CREATE TABLE IF NOT EXISTS test_incremental_table (id INTEGER PRIMARY KEY);
        `;
        fs.writeFileSync(nextMigrationFile, sqlContent, 'utf8');
        
        // Execute migrator again
        execSync(`node ${path.join(migratorRoot, 'scripts/migrate.js')} ${dbPath}`, {
            stdio: 'pipe',
            env: { ...process.env, NODE_PATH: path.join(repoRoot, 'node_modules') }
        });

        // Verify applied migrations
        const updatedMigrations = await runSql(db, "SELECT version FROM schema_migrations ORDER BY version ASC");
        console.log("  Updated version tracking:", updatedMigrations.map(m => m.version));
        const updatedVersions = updatedMigrations.map(m => m.version);
        if (updatedVersions.length !== baselineCount + 1 || !updatedVersions.includes('0009_test_patch.sql')) {
            throw new Error("Incremental SQL migration was not tracked correctly!");
        }
        
        // Verify changes applied
        const agentCols = await runSql(db, "PRAGMA table_info(agents)");
        const colNames = agentCols.map(c => c.name);
        if (!colNames.includes('test_patch_col')) {
            throw new Error("Incremental ALTER TABLE column was not applied!");
        }
        
        const updatedTables = await runSql(db, "SELECT name FROM sqlite_master WHERE type='table'");
        const updatedTableNames = updatedTables.map(t => t.name);
        if (!updatedTableNames.includes('test_incremental_table')) {
            throw new Error("Incremental CREATE TABLE was not applied!");
        }
        console.log("  ✅ Incremental transaction applied successfully.");
        
        // Cleanup incremental migration file
        fs.unlinkSync(nextMigrationFile);
        db.close();
        
        // 4. Clean up test database
        if (fs.existsSync(testVDir)) {
            fs.rmSync(testVDir, { recursive: true, force: true });
        }
        
        console.log("\n🎉 ALL SQL-FILE DATABASE MIGRATION TESTS PASSED SUCCESSFULLY!");
        process.exit(0);
    } catch (e) {
        console.error("\n%s", `❌ Migration test failed: ${e.message}`);
        if (fs.existsSync(testVDir)) fs.rmSync(testVDir, { recursive: true, force: true });
        process.exit(1);
    }
}

runTests();