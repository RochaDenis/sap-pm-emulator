const Database = require('better-sqlite3');
const path = require('path');
const schema = require('./schema');

// Use environment DB_PATH_S4 or fallback to ./database-s4.db relative to CWD
const dbPath = path.resolve(process.cwd(), process.env.DB_PATH_S4 || './database-s4.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initS4Database() {
  try {
    // Array in FK-dependency order to avoid foreign key constraint errors
    const tablesInOrder = [
      'S4_EQUIPMENT',
      'S4_FUNCTIONALLOCATION',
      'S4_MAINTPLAN',
      'S4_MAINTENANCENOTIFICATION', // Depends on EQUIPMENT, FUNCTIONALLOCATION
      'S4_MAINTENANCEORDER',        // Depends on MAINTENANCENOTIFICATION
      'S4_MAINTENANCEORDER_OPERATION', // Depends on MAINTENANCEORDER
      'S4_MAINTPLAN_ITEM'           // Depends on MAINTPLAN, EQUIPMENT
    ];

    // Create tables
    for (const tableName of tablesInOrder) {
      if (schema[tableName]) {
        db.exec(schema[tableName]);
      }
    }

    console.log(`[S4-DB] All S/4HANA tables created: ${tablesInOrder.join(', ')}`);
  } catch (err) {
    console.error('[S4-DB] Error creating tables:', err);
    throw err;
  }
}

initS4Database();

module.exports = db;
