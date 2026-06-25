const fs = require('fs');
const file = 'js/story/chap_08_august.js';
const content = fs.readFileSync(file, 'utf8');

// 用 require vm 真实加载检查语法
const vm = require('vm');
try {
  new Function(content);
  console.log('raw OK');
} catch (e) {
  console.log('raw fail:', e.message);
  // 更详细地找问题：用 try to parse line by line
}

// 另一种方式：用 vm.Script
try {
  new vm.Script(content);
  console.log('vm.Script OK');
} catch (e) {
  console.log('vm.Script fail:', e.message);
  // 错误信息通常包含位置
}

// 看是否是 BOM 或不可见字符
const firstBytes = [];
for (let i = 0; i < 10; i++) firstBytes.push(content.charCodeAt(i));
console.log('First char codes:', firstBytes);

// 找单行含有"XXX","YYY","ZZZ"格式的可疑字符
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  // 检查引号是否平衡（不算转义的情况，粗略）
  const line = lines[i];
  let dq = 0, sq = 0, bt = 0;
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '\\') { j++; continue; }
    if (line[j] === '"') dq++;
    if (line[j] === "'") sq++;
    if (line[j] === '`') bt++;
  }
  if (dq % 2 !== 0) {
    console.log(`LINE ${i+1}: odd double quotes=${dq}: ${line.trim().slice(0,200)}`);
  }
}
