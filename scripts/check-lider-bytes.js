const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/lideres/[id]/route.ts');
if (!fs.existsSync(filePath)) {
  console.log("File does not exist!");
  process.exit(0);
}

const buf = fs.readFileSync(filePath);
console.log("Buffer length:", buf.length);

// Check if there are any non-ASCII bytes
let nonAsciiCount = 0;
for (let i = 0; i < buf.length; i++) {
  if (buf[i] > 127) {
    console.log(`Byte at offset ${i}: ${buf[i]} (hex: ${buf[i].toString(16)})`);
    nonAsciiCount++;
  }
}
console.log("Total non-ASCII bytes:", nonAsciiCount);

const str = buf.toString('utf-8');
console.log("Has \\uFFFD:", str.includes('\uFFFD'));
