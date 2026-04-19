const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const re = /<h2\s+className="text-3xl\s+font-bold\s+gradient-text\s+tracking-tight[\s\S]*?<\/h2>/g;

walkDir('src/pages', (filePath) => {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let newContent = content.replace(re, '');
    
    // Also, if fixing justify-between to justify-end when h2 is removed
    // We can do a second pass but it's risky to just replace "justify-between" globally.
    // Let's just remove the h2 first.
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log('Updated: ', filePath);
    }
  }
});
