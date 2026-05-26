const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/ciudadanos/[id]/route.ts');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(content);
} else {
  console.log("src/app/api/ciudadanos/[id]/route.ts does not exist!");
}
