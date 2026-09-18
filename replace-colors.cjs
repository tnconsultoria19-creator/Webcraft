const fs = require('fs');
const path = require('path');

const replacements = {
  // Primary
  '1E3FB4': '245F6B',
  '1e3fb4': '245F6B',
  '1832A0': '1E505A',
  '1832a0': '1E505A',
  '163094': '1E505A',
  '163094': '1E505A',
  'E8EFFD': 'E5EEEE',
  'e8effd': 'E5EEEE',
  'd8e5fc': 'E5EEEE',
  
  // Success
  '00CB49': '4F765C',
  '00cb49': '4F765C',
  '2BC155': '4F765C',
  '2bc155': '4F765C',

  // Error/Danger
  'FF3B30': 'A65B55',
  'ff3b30': 'A65B55',
  'F94687': 'A65B55',
  'f94687': 'A65B55',

  // Warning/Ochre
  'FFBC11': 'D9A441',
  'ffbc11': 'D9A441',
  'FFCC00': 'D9A441',
  'ffcc00': 'D9A441',
  'ff9900': 'D9A441',
  'FF9900': 'D9A441',

  // Other Accents
  'A02CFA': '686E5E', // purple -> olive
  'a02cfa': '686E5E',
  '1EA7C5': 'B56F55', // cyan -> terracotta
  '1ea7c5': 'B56F55',

  // Text
  '222B40': '292A29',
  '222b40': '292A29',
  '7e7e7e': '68645D',
  '7E7E7E': '68645D',
  'adb5bd': '969188',
  'A1A1AF': '969188',
  'a1a1af': '969188',

  // Borders
  'e7e7e7': 'DDD8CE',
  'E7E7E7': 'DDD8CE',

  // Surfaces
  'F4F5F9': 'F0EDE5',
  'f4f5f9': 'F0EDE5',
  'F4F5F7': 'F0EDE5',
  'f4f5f7': 'F0EDE5',
  'eaecef': 'E8E9E2',
  
  // Backgrounds
  'F9F9F9': 'F4F1EA',
  'f9f9f9': 'F4F1EA'
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        processDirectory(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const [oldHex, newHex] of Object.entries(replacements)) {
        const regex = new RegExp(oldHex, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, newHex);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

processDirectory(path.join(process.cwd(), 'src'));
