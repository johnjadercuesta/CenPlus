const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')) {
        callback(dirPath);
      }
    }
  });
}

walkDir(path.join(__dirname, '../src'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('\uFFFD') || content.includes('')) {
    console.log(`FOUND  IN: ${filePath}`);
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('\uFFFD') || line.includes('')) {
        console.log(`  Line ${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
