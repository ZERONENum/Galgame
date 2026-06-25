const fs = require('fs');
const file = 'js/story/chap_08_august.js';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// 逐行添加，找到首次产生语法错误的位置
const prefix = `var window={};\n`;
let accumulated = prefix;
let firstFail = -1;
for (let i = 0; i < lines.length; i++) {
  const test = accumulated + lines[i] + '\n';
  try {
    new Function(test);
    accumulated = test;
  } catch (e) {
    // 可能还没写完。加个 "; "试一试
    try {
      new Function(test + '};');
      // 正常跳过
      accumulated = test;
      continue;
    } catch (e2) {}
    // 还是失败，再试试更多闭合
    try {
      new Function(test + ']};');
      accumulated = test;
      continue;
    } catch (e3) {}
    // 还是失败，试试 '});
    try {
      new Function(test + '});');
      accumulated = test;
      continue;
    } catch (e4) {}
    // 真正失败
    if (firstFail < 0) {
      firstFail = i + 1;
      console.log(`First real fail at line ${firstFail}: ${lines[i].trim().slice(0,200)}`);
      console.log(`  prev: ${(lines[i-1] || '').trim().slice(0,200)}`);
      // 只报告前 5 个
      let count = 0;
      for (let j = i; j < lines.length && count < 5; j++) {
        const t2 = prefix + lines.slice(0, j+1).join('\n') + '\n';
        let ok = false;
        for (const c of [';', '};', ']};', '});']) {
          try { new Function(t2 + c); ok = true; break; } catch (e) {}
        }
        if (!ok) {
          console.log(`  fail ${j+1}: ${lines[j].trim().slice(0,200)}`);
          count++;
        }
      }
      break;
    }
  }
}

// 检查文件里是否有未配对的引号字符 - 更精确，检查 \"
// 直接打印每个含双引号的行及其前后，看具体文件内容
console.log('\n=== Lines with possibly problematic chars ===');
for (let i = 0; i < lines.length; i++) {
  if (/\\\\["']/.test(lines[i])) {
    console.log(`${i+1}: ${lines[i].trim().slice(0,200)}`);
  }
}
