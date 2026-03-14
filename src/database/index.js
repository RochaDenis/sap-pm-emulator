/**
 * SAP PM Emulator — Database Connection & Initialization
 *
 * Uses better-sqlite3 for synchronous, fast SQLite access.
 * Creates all SAP PM tables on startup (IF NOT EXISTS).
 */

const path = require('path');
const Database = require('better-sqlite3');
const { SCHEMA, TABLE_ORDER } = require('./schema');
require('dotenv').config();

// Resolve DB file path — default to ./data/sap_pm.db
const DB_PATH = process.env.DB_PATH || './database.db';

// Ensure the data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Open (or create) the database
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Enable foreign key enforcement
db.pragma('foreign_keys = ON');

/**
 * Initialize all tables in dependency order.
 * Uses a transaction so all tables are created atomically.
 */
function initializeDatabase() {
    const createAll = db.transaction(() => {
        for (const table of TABLE_ORDER) {
            db.exec(SCHEMA[table]);
        }
    });

    createAll();

    // Verify all tables were created
    const existing = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all()
        .map(row => row.name);

    const expected = [...TABLE_ORDER].sort();
    const missing = expected.filter(t => !existing.includes(t));

    if (missing.length > 0) {
        throw new Error(`Failed to create tables: ${missing.join(', ')}`);
    }

    console.log(`[DB] All ${TABLE_ORDER.length} SAP PM tables created successfully:`);
    console.log(`[DB]   ${TABLE_ORDER.join(', ')}`);
    console.log(`[DB] Database path: ${DB_PATH}`);
}

// Run initialization on import
initializeDatabase();

module.exports = { db, initializeDatabase, DB_PATH };
