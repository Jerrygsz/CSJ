// 校验 sprites.js 里每张精灵的 rows：行宽必须全等、宽高必须成组一致。
// 手写像素最容易犯的错就是某一行多打一个点 —— 渲染时不会报错，只是那一行整体错位。
//
//   node tools/check_rows.mjs            全部
//   node tools/check_rows.mjs liuqi      只查若干张
import fs from 'fs';

const src = fs.readFileSync('js/sprites.js', 'utf8');
const only = process.argv.slice(2);

// 只抓 row 数组：{ name: 'xxx', pal: {...}, rows: [ '...', ... ] }
const re = /name:\s*'([^']+)'[\s\S]*?rows:\s*\[([\s\S]*?)\]\s*\}/g;
let m, bad = 0, n = 0;
const seen = new Set();

while ((m = re.exec(src))) {
  const name = m[1];
  if (seen.has(name)) continue;
  seen.add(name);
  if (only.length && !only.includes(name)) continue;
  const rows = [...m[2].matchAll(/'([^']*)'/g)].map(x => x[1]);
  if (!rows.length) continue;
  n++;
  const w = rows[0].length, h = rows.length;
  const errs = [];
  rows.forEach((r, i) => { if (r.length !== w) errs.push(`row${i} 宽 ${r.length}（应为 ${w}）→ "${r}"`); });
  // 尺寸只允许这几组：人形 12x14、14x15、14x14、16x16、兽 16x10、图标类更小
  const ok = (w === 12 && h === 14) || (w === 14 && h === 15) || (w === 14 && h === 14) ||
             (w === 16 && h === 16) || (w === 16 && h === 10);
  if (!ok) errs.push(`尺寸 ${w}x${h} 不在白名单（12x14 / 14x14 / 14x15 / 16x16 / 16x10）`);
  if (errs.length) { bad++; console.log(`✗ ${name}  ${w}x${h}`); errs.forEach(e => console.log('    ' + e)); }
}
console.log(bad ? `\n${bad} / ${n} 张有问题` : `\n全部 ${n} 张行宽一致`);
process.exit(bad ? 1 : 0);
