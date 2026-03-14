const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determine the database path (fallback to standard local DB if ENV not set)
const dbPath = process.env.V4_DB_PATH || path.resolve(__dirname, '../../../database-s4.db');

// Creates a new independent instance of sqlite3 database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`[S/4HANA] ❌ Error connecting to SQLite: ${err.message}`);
  } else {
    // Enable WAL (Write-Ahead Logging) and Foreign Keys for better performance and integrity
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) {
        console.error(`[S/4HANA] ❌ Error enabling foreign keys: ${err.message}`);
      }
    });
  }
});

// Helper for Promisifying single queries
const getAsync = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper for Promisifying multiple row queries
const allAsync = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper for Promisifying INSERT/UPDATE/DELETE
const runAsync = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

module.exports = {
  db,
  getAsync,
  allAsync,
  runAsync
};
