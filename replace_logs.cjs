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

const files = walk('d:/PDAM_seruyan/src/pages/accounting/views');
let changed = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  let isChanged = false;
  if (newContent.includes('ke CSV')) {
    newContent = newContent.replace(/ke CSV/g, 'ke PDF');
    isChanged = true;
  }
  if (newContent.includes('Export CSV')) {
    newContent = newContent.replace(/Export CSV/g, 'Export PDF');
    isChanged = true;
  }
  if (isChanged) {
    fs.writeFileSync(file, newContent, 'utf8');
    changed++;
    console.log('Modified', file);
  }
});
console.log('Done, modified', changed, 'files');
