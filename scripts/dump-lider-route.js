const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/lideres/[id]/route.ts');
const content = fs.readFileSync(filePath, 'utf-8');
console.log(content);
