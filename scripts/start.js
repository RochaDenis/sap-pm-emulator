const path = require('path');
const { execSync } = require('child_process');

process.env.DB_PATH = path.join(__dirname, '../database.db');
process.env.DB_PATH_S4 = path.join(__dirname, '../database-s4.db');

console.log('[AxiomGO] Boot sequence started...');
console.log('[AxiomGO] DB_PATH:', process.env.DB_PATH);
console.log('[AxiomGO] DB_PATH_S4:', process.env.DB_PATH_S4);

try {
  console.log('[AxiomGO] Seeding ECC...');
  execSync(`node ${path.join(__dirname, '../src/seed/index.js')}`, {
    stdio: 'inherit',
    env: { ...process.env }
  });
} catch(e) {
  console.error('[AxiomGO] ECC seed error:', e.message);
}

try {
  console.log('[AxiomGO] Seeding S4HANA...');
  execSync(`node ${path.join(__dirname, '../src/v4/seed/index.js')}`, {
    stdio: 'inherit',
    env: { ...process.env }
  });
} catch(e) {
  console.error('[AxiomGO] S4HANA seed error:', e.message);
}

console.log('[AxiomGO] Starting server...');
require('../server.js');
