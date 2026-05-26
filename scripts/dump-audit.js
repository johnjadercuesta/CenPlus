const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/audit.ts');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(content);
} else {
  console.log("src/lib/audit.ts does not exist!");
}
