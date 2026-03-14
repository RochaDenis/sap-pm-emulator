const fs = require('fs');
const filepath = './src/config/swagger.js';
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes('🔵 SAP ECC')) {
  // Replace the first 'tags: [' with the new tag definition included
  content = content.replace(
    'tags: [',
    "tags: [\n    { name: '🔵 SAP ECC', description: 'SAP ECC Endpoints' },"
  );
  
  // Replace all other endpoint tags arrays
  content = content.replace(/tags:\s*\[\s*'PM_/g, "tags: ['🔵 SAP ECC', 'PM_");

  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Swagger updated successfully!');
} else {
  console.log('Swagger already contains the new tags.');
}
