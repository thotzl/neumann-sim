const sqlite3 = require('sqlite3').verbose();

class Database {
    constructor(dbPath) {
        this.db = new sqlite3.Database(dbPath);
        // Busy timeout first: concurrent handles switching to WAL otherwise fail with SQLITE_BUSY (TCK-141)
        this.db.configure('busyTimeout', 30000);
        const warn = (err) => { if (err) console.warn(`[DB] PRAGMA failed on ${dbPath}: ${err.message}`); };
        this.db.serialize(() => {
            this.db.run("PRAGMA journal_mode = WAL", warn);
            this.db.run("PRAGMA synchronous = NORMAL", warn);
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = Database;
