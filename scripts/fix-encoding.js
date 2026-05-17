const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = {
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã­': 'í',
  'Ã³': 'ó',
  'Ãº': 'ú',
  'Ã±': 'ñ',
  'Ã‘': 'Ñ',
  'Ã ': 'Á',
  'Ã‰': 'É',
  'Ã\u008D': 'Í',
  'Ã“': 'Ó',
  'Ãš': 'Ú',
  'Â¿': '¿',
  'Â¡': '¡',
  'AuditorÃa': 'Auditoría',
  'GestiÃ³n': 'Gestión',
  'ConfiguraciÃ³n': 'Configuración'
};

let filesFixed = 0;

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    for (const [bad, good] of Object.entries(replacements)) {
      content = content.split(bad).join(good);
    }
    
    // Some edge cases with 'í'
    content = content.split('AuditorÃ\u00ADa').join('Auditoría');
    content = content.split('GestiÃ³n').join('Gestión');
    content = content.split('ConfiguraciÃ³n').join('Configuración');
    content = content.split('organizaciÃ³n').join('organización');
    content = content.split('autenticaciÃ³n').join('autenticación');
    content = content.split('GestiÃ³n').join('Gestión');
    content = content.split('Ã\u00AD').join('í');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed:', filePath);
      filesFixed++;
    }
  }
});

console.log(`Total files fixed: ${filesFixed}`);
