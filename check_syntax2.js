const fs = require('fs');
const file = 'js/story/chap_08_august.js';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// 用更聪明的方法找问题。二分法找错误位置
function findBadLine(lines) {
  // 前向查找
  for (let i = 0; i < lines.length; i++) {
    const partial = lines.slice(0, i+1).join('\n');
    try {
      // 确保能解析
      new Function(`var window={}; ${partial}\n;`);
    } catch (e) {
      // 第一次失败了
      console.log(`Fail at line ${i+1}: ${lines[i]}`);
      console.log(`  prev: ${lines[i-1] || ''}`);
      console.log(`  error: ${e.message}`);
      break;
    }
  }
}
findBadLine(lines);
