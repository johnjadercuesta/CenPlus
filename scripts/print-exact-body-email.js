const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/lideres/[id]/route.ts');
const content = fs.readFileSync(filePath, 'utf-8');

const startIdx = content.indexOf('if (body.email !== undefined)');
if (startIdx !== -1) {
  console.log("Substring found! Exact content:");
  console.log(JSON.stringify(content.substring(startIdx, startIdx + 450)));
} else {
  console.log("Not found!");
}
