// 列出精灵库全部名字与尺寸，用于查重（新图命名前先跑一次）
import fs from 'fs';
const s = fs.readFileSync('js/sprites.js', 'utf8');
const out = [];
const re = /name:\s*'([a-z0-9_]+)'[\s\S]*?rows:\s*\[([\s\S]*?)\n    \]\s*\}/g;
let m;
while ((m = re.exec(s))) {
  const rows = [...m[2].matchAll(/'([^']*)'/g)].map(x => x[1]);
  out.push({ n: m[1], w: rows[0] ? rows[0].length : 0, h: rows.length });
}
console.log('精灵总数 ' + out.length);
for (const x of out) console.log(x.n.padEnd(18) + x.w + 'x' + x.h);
