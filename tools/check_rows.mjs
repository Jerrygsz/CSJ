// 校验 sprites.js 里每张精灵的 rows：行宽必须全等、宽高成组一致、
// 并且 rows 里出现的每个字符都必须在 pal 里有对应色。
//
// 第三条是踩过坑才加的：甘九真的 v3 忘写 S（肤色），渲染时 S 像素整片透明，
// 结果「一个没有脸的人」—— 游戏不报错，画布上就是少一块。
// 手写像素的三类错（行宽不齐 / 尺寸不对 / 调色板缺键）脚本都能拦，别用眼睛看。
//
//   node tools/check_rows.mjs            全部
//   node tools/check_rows.mjs liuqi      只查若干张
import fs from 'fs';

const src = fs.readFileSync('js/sprites.js', 'utf8');
const only = process.argv.slice(2);

// 只抓 row 数组：{ name: 'xxx', pal: {...}, rows: [ '...', ... ] }
const re = /name:\s*'([^']+)'[\s\S]*?rows:\s*\[([\s\S]*?)\]\s*\}/g;
let m, bad = 0, n = 0;
const warn = [];
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
  // 尺寸只提示不判错：老的小怪（狼 12x9 / 蛇 10x7 / 鬼修 12x13）本来就不是人形规格，
  // 属于历史遗留，强行统一会改动 20 多张已上线的图。
  const ok = (w === 12 && h === 14) || (w === 14 && h === 15) || (w === 14 && h === 14) ||
             (w === 16 && h === 16) || (w === 16 && h === 10);
  if (!ok) warn.push(`${name}: 尺寸 ${w}x${h} 非人形标准规格`);

  // 调色板覆盖：rows 用到的字符必须在 pal 里（'.' 是透明占位）
  const seg = m[0];
  const palM = seg.match(/pal:\s*\{([\s\S]*?)\}\s*,\s*rows/);
  if (palM) {
    // pal 里既有 'K: #xxx' 也有 'K'（外层共享常量简写），按逗号切段取首字母
    const keys = new Set(palM[1].split(',').map(x => x.trim().charAt(0)).filter(c => /[A-Za-z]/.test(c)));
    const used = new Set(rows.join('').split('').filter(c => c !== '.'));
    const miss = [...used].filter(c => !keys.has(c));
    const idle = [...keys].filter(c => !used.has(c));
    if (miss.length) errs.push(`调色板缺键：[${miss.join(' ')}] → 这些像素会渲染成透明`);
    // 多余键无害（只是定义了个没用上的色），单独提示，不算失败
    if (idle.length) warn.push(`${name}: 未用到的色 [${idle.join(' ')}]`);
  }

  if (errs.length) { bad++; console.log(`✗ ${name}  ${w}x${h}`); errs.forEach(e => console.log('    ' + e)); }
}
if (warn.length) console.log('\n提示（不影响渲染）：\n' + warn.map(x => '  · ' + x).join('\n'));
console.log(bad ? `\n${bad} / ${n} 张有问题` : `\n全部 ${n} 张行宽与调色板一致`);
process.exit(bad ? 1 : 0);
