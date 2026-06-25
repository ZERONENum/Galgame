const fs = require('fs');
const file = 'js/story/chap_08_august.js';
const content = fs.readFileSync(file, 'utf8');

// 尝试用 vm 模块解析
const vm = require('vm');
try {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(content, sandbox);
  console.log('vm: OK');
} catch (e) {
  console.log('vm error:', e.message);
  // 找行号
  const m = e.message.match(/(\d+):(\d+)/);
  if (m) {
    const [_, ln, col] = m;
    const lines = content.split('\n');
    console.log(`around line ${ln}: ${lines[ln-1]}`);
  }
}

// 用 Function 包一层
try {
  const wrapped = `var window = {}; ${content}`;
  new Function(wrapped);
  console.log('Function: OK');
} catch (e) {
  console.log('Function error:', e.message);
}

// 更精确：逐字符解析找错误位置
try {
  new Function(content);
} catch (e) {
  console.log('raw Function error:', e.message);
}
