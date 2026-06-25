const fs = require('fs');
const path = require('path');

const files = [
  "js/story/chap_03_march.js",
  "js/story/chap_06_june.js",
  "js/story/chap_08_august.js",
  "js/story/chap_10_october.js",
  "js/story/common_11.js",
  "js/story/common_12.js",
  "js/story/common_split.js",
  "js/story/finale.js",
  "js/story/route_shiraishi.js",
  "js/story/route_sato.js",
  "js/story/route_saionji.js",
  "js/story/route_mizuno.js",
  "js/story/childhood/childhood_01_rainbow.js",
  "js/story/childhood/childhood_02_tears.js",
  "js/story/childhood/childhood_03_silverwing.js",
  "js/story/childhood/childhood_04_enamel.js",
  "js/story/childhood/childhood_05_rooster.js",
  "js/story/childhood/childhood_end.js",
  "js/story/childhood/childhood_side01_candybox.js",
  "js/story/childhood/childhood_side02_lemon.js",
  "js/story/childhood/childhood_side03_plane.js",
  "js/story/childhood/childhood_side04_button.js",
  "js/story/prologue.js"
];

const charMapSpeakers = new Set([
  "白石雪乃", "白石雪乃（内心）", "佐藤健太", "西园寺凛", "西园寺凛（内心）",
  "水野真理", "小林栖", "妈妈", "外婆", "检票员姐姐", "护士", "街拍师",
  "馆长", "高桥惠子老师", "高桥老师", "学生A", "学生B", "学生C",
  "食堂阿姨", "豆浆阿姨", "图书管理员", "教导主任", "店员", "低年级学妹",
  "学生黑影学妹", "学生黑影带包女", "学生黑影背包男", "橘猫", "橘猫另一只",
  "店员黑影", "馆长孙女"
]);

const noCharSpeakers = new Set([
  "林栖", "旁白", "广播", "广播（回音）", "阿姨甲", "阿姨乙", "阿姨丙",
  "售货员小哥", "邻村小孩"
]);

let totalSyntaxOk = 0;
let totalRemain = 0;

for (const f of files) {
  const fullPath = path.join('/workspace', f);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');

  // 语法检查：尝试用 Function 解析
  let syntaxOk = true;
  try {
    // 把 window.X = 变成一个可解析的结构
    const wrapped = `(function(){ var window = {}; ${content}; return Object.keys(window); })();`;
    eval(wrapped);
  } catch (e) {
    syntaxOk = false;
    console.log(`SYNTAX ERROR in ${f}: ${e.message}`);
  }
  if (syntaxOk) totalSyntaxOk++;

  // 二次扫描
  const lines = content.split('\n');
  let remain = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sm = line.match(/speaker:\s*"([^"]+)"/);
    if (!sm) continue;
    const speaker = sm[1];
    if (/\bchar\s*:/.test(line)) continue;
    if (noCharSpeakers.has(speaker)) continue;
    if (!charMapSpeakers.has(speaker)) continue;
    remain++;
    console.log(`  STILL MISSING in ${f} line ${i+1}: ${line.trim().slice(0,120)}`);
  }
  totalRemain += remain;
  console.log(`${f}: syntax=${syntaxOk ? 'OK' : 'FAIL'}, remaining_missing=${remain}`);
}

console.log(`\n=== VALIDATION: syntax_ok=${totalSyntaxOk}/${files.length}, still_missing=${totalRemain}`);
