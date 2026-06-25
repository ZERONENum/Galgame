const fs = require('fs');
const files = process.argv.slice(2);
for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  let textSum = 0;
  // Match text: "...", handling escaped quotes not needed since source uses "" consistently but JSON-style
  const re = /text:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    textSum += m[1].replace(/\\n/g, '').length;
  }
  console.log(f, 'text_chars=', textSum);
}
