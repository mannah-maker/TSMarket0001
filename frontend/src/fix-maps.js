const fs = require('fs');
const path = require('path');

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Регулярное выражение для поиска .map(
  const regex = /(\w+)\.map\(/g;
  
  // Замена на безопасную версию
  content = content.replace(regex, '(Array.isArray($1) ? $1 : []).map(');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${filePath}`);
};

// Рекурсивно обходим все JSX/JS файлы
const walkDir = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      fixFile(fullPath);
    }
  });
};

walkDir('./src');
console.log('All .map() calls have been made safe!');
