const { execSync } = require('child_process');
const path = require('path');

console.log('[AxiomGO] Starting production boot...');

// Run ECC seed
try {
  console.log('[AxiomGO] Seeding ECC database...');
  execSync('node src/seed/index.js', { stdio: 'inherit' });
  console.log('[AxiomGO] ECC seed complete.');
} catch(e) {
  console.error('[AxiomGO] ECC seed failed:', e.message);
}

// Run S4HANA seed
try {
  console.log('[AxiomGO] Seeding S4HANA database...');
  execSync('node src/v4/seed/index.js', { stdio: 'inherit' });
  console.log('[AxiomGO] S4HANA seed complete.');
} catch(e) {
  console.error('[AxiomGO] S4HANA seed failed:', e.message);
}

// Start server
console.log('[AxiomGO] Starting server...');
require('../server.js');
