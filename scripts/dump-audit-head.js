const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/audit.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');
console.log(lines.slice(0, 60).join('\n'));
