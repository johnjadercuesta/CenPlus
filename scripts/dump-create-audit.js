const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../scripts/create-audit-tables.js');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(content);
} else {
  console.log("scripts/create-audit-tables.js does not exist!");
}
