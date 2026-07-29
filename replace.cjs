const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:/PDAM_seruyan/src');
let changed = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('exportToCSV')) {
    const newContent = content.replace(/exportToCSV/g, 'exportToPDF');
    fs.writeFileSync(file, newContent, 'utf8');
    changed++;
    console.log('Modified', file);
  }
});
console.log('Done, modified', changed, 'files');
