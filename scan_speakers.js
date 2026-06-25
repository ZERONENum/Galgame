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

// 收集所有speaker
const allSpeakers = new Set();
const missingByFile = {};

for (const f of files) {
  const fullPath = path.join('/workspace', f);
  if (!fs.existsSync(fullPath)) {
    console.log('MISSING FILE:', f);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  // 找所有 { ... speaker: "xxx" ... }
  const speakerRegex = /speaker:\s*"([^"]+)"/g;
  let m;
  while ((m = speakerRegex.exec(content)) !== null) {
    allSpeakers.add(m[1]);
  }
}

console.log('=== All unique speakers:');
for (const s of Array.from(allSpeakers).sort()) {
  console.log('  -', s);
}
