const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/ciudadanos/route.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const startIdx = content.indexOf('export async function POST');
if (startIdx !== -1) {
  console.log(content.substring(startIdx, startIdx + 800));
}
