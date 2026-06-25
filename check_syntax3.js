const fs = require('fs');
const file = 'js/story/chap_08_august.js';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// 从后面开始
function findBadLine(lines) {
  const prefix = `var window={};\n`;
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      new Function(prefix + lines.slice(0, i).join('\n') + '\n;');
      console.log(`OK up to line ${i}`);
      // 现在找首次失败的行
      for (let j = i + 1; j <= lines.length; j++) {
        try {
          new Function(prefix + lines.slice(0, j).join('\n') + '\n;');
        } catch (e) {
          console.log(`First fail at line ${j}: ${lines[j-1]}`);
          console.log(`  error: ${e.message}`);
          return;
        }
      }
      console.log('All lines OK');
      return;
    } catch (e) {}
  }
  console.log('First line fails');
}
findBadLine(lines);

// 或者直接用一个更简单的方法：把整个文件作为字符串解析，看它是不是合法的表达式/语句
// 先看前后端字符
console.log('\nFirst 200 chars:', content.slice(0, 200));
console.log('\nLast 200 chars:', content.slice(-200));

// 检查引号配对
let inString = null;
let lineNum = 1;
for (let i = 0; i < content.length; i++) {
  const c = content[i];
  if (c === '\n') lineNum++;
  if (c === '\\' && inString) { i++; continue; }
  if (c === '"' || c === "'" || c === '`') {
    if (inString === c) inString = null;
    else if (!inString) inString = c;
  }
}
console.log('\nUnclosed string:', inString);
