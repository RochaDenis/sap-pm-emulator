const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database.db';

let db;

/**
 * Returns the SQLite database instance (singleton).
 * Creates the connection on first call.
 */
function getDatabase() {
  if (!db) {
    const resolvedPath = path.resolve(DB_PATH);
    db = new Database(resolvedPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    console.log(`[SAP-PM] SQLite connected: ${resolvedPath}`);
  }
  return db;
}

/**
 * Closes the database connection gracefully.
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[SAP-PM] SQLite connection closed.');
  }
}

module.exports = { getDatabase, closeDatabase };
