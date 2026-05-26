const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/ciudadanos/route.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');
console.log(lines.slice(220, 260).join('\n'));
