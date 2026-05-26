const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/lideres/[id]/route.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('organizaci')) {
    console.log(`Line ${idx + 1}: ${line}`);
    // Print char codes
    for (let i = 0; i < line.length; i++) {
      console.log(`Char at ${i}: ${line[i]} (code: ${line.charCodeAt(i)})`);
    }
  }
});
