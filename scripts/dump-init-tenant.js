const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../scripts/init-tenant.js');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');
console.log(lines.slice(100, 140).join('\n'));
