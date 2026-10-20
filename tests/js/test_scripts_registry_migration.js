const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

// TCK-145: 'npm run inject <exp> migrate' on an experiment where the pre-TCK-145 runtime DDL
// already created 'scripts' and ships/systems.active_script_id before 0005 was applied.

const repoRoot = path.resolve(__dirname, '../..');
const expsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bob-test-registry-migration-'));
process.on('exit', () => fs.rmSync(expsDir, { recursive: true, force: true }));
const migrationsDir = path.join(repoRoot, 'src/bob_os/core/migrations');
const allMigrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

const RUNTIME_DDL = `
CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, content TEXT, path TEXT NOT NULL,
    target TEXT DEFAULT NULL, owner_id TEXT NOT NULL, read_key TEXT DEFAULT NULL,
    write_key TEXT DEFAULT NULL, created_cycle INTEGER DEFAULT 0
);
ALTER TABLE ships ADD COLUMN active_script_id INTEGER DEFAULT NULL;
ALTER TABLE systems ADD COLUMN active_script_id INTEGER DEFAULT NULL;
INSERT INTO scripts (name, path, owner_id) VALUES ('old.py', 'scripts/old.py', 'Instance-1');
`;

function openDb(dbPath) {
    const db = new sqlite3.Database(dbPath);
    return {
        exec: sql => new Promise((res, rej) => db.exec(sql, e => e ? rej(e) : res())),
        all: (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r))),
        close: () => new Promise(res => db.close(res))
    };
}

function inject(expName) {
    return execFileSync(process.execPath, [path.join(repoRoot, 'scripts/inject.js'), expName, 'migrate'], {
        cwd: repoRoot, env: { ...process.env, BOB_EXPERIMENTS_DIR: expsDir }, stdio: 'pipe'
    }).toString();
}

async function columnCount(db, table, column) {
    return (await db.all(`PRAGMA table_info(${table})`)).filter(c => c.name === column).length;
}

async function run() {
    console.log("Test 1: Old experiment (0001-0004 + runtime DDL) migrates via inject...");
    const verseDir = path.join(expsDir, 'OLD', '_verse');
    fs.mkdirSync(verseDir, { recursive: true });
    const dbPath = path.join(verseDir, 'universe.db');
    let db = openDb(dbPath);
    await db.exec("CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    for (const f of allMigrations.filter(f => f < '0005')) {
        await db.exec(fs.readFileSync(path.join(migrationsDir, f), 'utf8'));
        await db.exec(`INSERT INTO schema_migrations (version) VALUES ('${f}')`);
    }
    await db.exec(RUNTIME_DDL);
    await db.close();

    const out = inject('OLD');
    assert.ok(out.includes("Column 'ships.active_script_id' already exists, skipping ADD COLUMN."), out);
    assert.ok(out.includes("Migration '0007_scripts_registry.sql' applied successfully."), out);

    db = openDb(dbPath);
    const versions = (await db.all("SELECT version FROM schema_migrations")).map(r => r.version);
    assert.deepStrictEqual(versions.sort(), allMigrations);
    assert.strictEqual(await columnCount(db, 'ships', 'active_script_id'), 1);
    assert.strictEqual(await columnCount(db, 'systems', 'active_script_id'), 1);
    assert.strictEqual(await columnCount(db, 'agents', 'last_status'), 1, "0006 must still apply after 0005");
    assert.strictEqual((await db.all("SELECT name FROM scripts"))[0].name, 'old.py');
    assert.strictEqual((await db.all("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_scripts_path'")).length, 1);
    await db.close();

    console.log("Test 2: Re-running inject migrate is a no-op...");
    const again = inject('OLD');
    assert.ok(!again.includes('Applying migration'), again);

    console.log("Test 3: Fully migrated experiment that later ran the runtime DDL gets 0007...");
    const verse2 = path.join(expsDir, 'NEW', '_verse');
    fs.mkdirSync(verse2, { recursive: true });
    const db2Path = path.join(verse2, 'universe.db');
    execFileSync(process.execPath, [path.join(repoRoot, 'scripts/migrate.js'), db2Path], { cwd: repoRoot, stdio: 'pipe' });
    db = openDb(db2Path);
    await db.exec("DELETE FROM schema_migrations WHERE version = '0007_scripts_registry.sql'; DROP INDEX idx_scripts_path;");
    await db.close();
    inject('NEW');
    db = openDb(db2Path);
    assert.strictEqual((await db.all("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_scripts_path'")).length, 1);
    await db.close();

    console.log("\n🎉 SCRIPTS REGISTRY MIGRATION TESTS PASSED!");
}

run().catch(e => {
    console.error("❌ Scripts registry migration test failed:", e.stderr ? e.stderr.toString() : e.message);
    process.exitCode = 1;
});
