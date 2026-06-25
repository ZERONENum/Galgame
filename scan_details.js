const fs = require('fs');
const path = require('path');

const files = [
  "js/story/chap_03_march.js",
  "js/story/chap_06_june.js",
  "js/story/chap_08_august.js",
  "js/story/chap_10_october.js",
  "js/story/common_10.js",
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

// 有立绘的角色映射（speaker -> 基础 char key，及位置）
const charMap = {
  "白石雪乃": { key: "白石雪乃温柔", pos: "right" },
  "白石雪乃（内心）": { key: "白石雪乃温柔", pos: "right" },
  "佐藤健太": { key: "佐藤健太爽朗", pos: "left" },
  "西园寺凛": { key: "西园寺凛温柔", pos: "right" },
  "西园寺凛（内心）": { key: "西园寺凛温柔", pos: "right" },
  "水野真理": { key: "水野真理", pos: "left" },
  "小林栖": { key: "小林栖_认真", pos: "right" },
  "妈妈": { key: "童年妈妈_温柔", pos: "left" },
  "外婆": { key: "童年外婆_慈祥", pos: "right" },
  "检票员姐姐": { key: "童年检票员_热情", pos: "left" },
  "护士": { key: "童年护士_温柔", pos: "right" },
  "街拍师": { key: "童年街拍师_惊喜", pos: "right" },
  "馆长": { key: "童年馆长_白发", pos: "left" },
  "高桥惠子老师": { key: "高桥惠子微笑", pos: "right" },
  "高桥老师": { key: "高桥惠子微笑", pos: "right" },
  "学生A": { key: "学生A", pos: "left" },
  "学生B": { key: "学生B", pos: "right" },
  "学生C": { key: "学生C", pos: "left" },
  "食堂阿姨": { key: "食堂阿姨", pos: "right" },
  "豆浆阿姨": { key: "豆浆阿姨", pos: "left" },
  "图书管理员": { key: "图书管理员", pos: "left" },
  "教导主任": { key: "教导主任", pos: "right" },
  "店员": { key: "店员", pos: "right" },
  "低年级学妹": { key: "低年级学妹", pos: "right" },
  "学生黑影学妹": { key: "学生黑影学妹", pos: "left" },
  "学生黑影带包女": { key: "学生黑影带包女", pos: "right" },
  "学生黑影背包男": { key: "学生黑影背包男", pos: "left" },
  "橘猫": { key: "橘猫", pos: "left" },
  "橘猫另一只": { key: "橘猫另一只", pos: "right" },
  "店员黑影": { key: "店员黑影", pos: "left" },
  "馆长孙女": { key: "馆长孙女", pos: "right" },
};

// 不需要 char 的角色（林栖第一人称 + 无立绘角色）
const noCharSpeakers = new Set([
  "林栖", "旁白", "广播", "广播（回音）", "阿姨甲", "阿姨乙", "阿姨丙",
  "售货员小哥", "邻村小孩"
]);

const totalByFile = {};

for (const f of files) {
  const fullPath = path.join('/workspace', f);
  if (!fs.existsSync(fullPath)) {
    console.log('MISSING FILE:', f);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  let count = 0;
  const details = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 检测 speaker:"xxx"
    const sm = line.match(/speaker:\s*"([^"]+)"/);
    if (!sm) continue;
    const speaker = sm[1];
    // 如果已经有 char 字段，跳过
    if (/\bchar\s*:/.test(line)) continue;
    // 如果是林栖或无立绘角色，跳过
    if (noCharSpeakers.has(speaker)) continue;
    // 如果不在 charMap，警告
    if (!charMap[speaker]) {
      details.push(`LINE ${i+1}: UNMAPPED speaker="${speaker}" => ${line.trim()}`);
      continue;
    }
    count++;
    details.push(`LINE ${i+1}: speaker="${speaker}" -> char {${charMap[speaker].pos}: "${charMap[speaker].key}"}`);
  }
  totalByFile[f] = count;
  console.log(`\n=== ${f} === needs fix: ${count}`);
  for (const d of details) console.log('  ', d);
}

console.log('\n=== TOTAL SUMMARY ===');
let total = 0;
for (const [f, c] of Object.entries(totalByFile)) {
  console.log(`  ${f}: ${c}`);
  total += c;
}
console.log(`TOTAL: ${total}`);
