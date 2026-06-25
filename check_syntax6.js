const fs = require('fs');
const file = 'js/story/chap_08_august.js';
const content = fs.readFileSync(file, 'utf8');

// 正确的语法检查：用 eval 包裹成可执行
try {
  const wrapped = `(function(){ var window = {};\n ${content}\n ;})`;
  new Function(wrapped)();
  console.log('Parsed OK');
} catch (e) {
  console.log('Parse fail:', e.message);
  // 用更细的方式找行号
  // 逐行解析 JSON 结构
}

// 更可靠：直接用 node 的 acorn/esprima。不用外部模块，自己写个简单解析器
// 或者：用 JSON.parse 检查关键部分

// 检查整个文件结构：找到所有 { speaker: "xxx", text: "..." } 的行
// 看是否有 char 字段被插错了位置
const lines = content.split('\n');
console.log('\nLooking for lines with char NOT in a nested {...} structure...');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // 检查：有 char: { 但结构可能有问题 - 看括号匹配
  if (/char:\s*\{/.test(line)) {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (opens !== closes) {
      console.log(`LINE ${i+1} unbalanced braces (${opens} vs ${closes}): ${line.trim().slice(0,200)}`);
    }
  }
}
