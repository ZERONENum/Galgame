const fs = require('fs');
const file = 'js/story/chap_08_august.js';
const content = fs.readFileSync(file, 'utf8');

// 正确方式：它是 "window.CHAPTER_chap_08_august = { ... }" 语句
// 直接用 vm 执行，它会给你真实的语法错误
const vm = require('vm');
try {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(content, sandbox, { filename: file });
  console.log('VM run OK');
} catch (e) {
  console.log('VM error:', e.stack);
}

// 检查 text 内容中是否存在未转义的双引号
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // 找 text: "..." 模式
  const tm = line.match(/text:\s*"([^"]*)"/);
  // 如果没有匹配但这行含有 speaker 等，可能就是有问题的那行
  if (/speaker:/.test(line) && !/char:\s*\{[^}]*\}/.test(line) && !/text:\s*"/.test(line)) {
    console.log(`LINE ${i+1} (problematic text parsing): ${line.trim().slice(0,200)}`);
  }
}
