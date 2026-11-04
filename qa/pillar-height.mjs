// 光柱柱高（sk.h）体检：把 18 条 pillar 招式与它所属 Boss 的体型（r / scale）对上，
// 输出建议 h。口径：柱高 = Boss 体型 × 系数，再按「属性重量」分档。
//   · 体型先用 r（碰撞半径），scale 只做交叉校验（同一个 r 下 scale 大 = 视觉更高）。
//   · 系数 5.0 为基础档：r=21 → 105px 太矮，光柱至少要高过 Boss 本体两倍才像"从天上压下来"。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || '.');
const arts = fs.readFileSync(path.join(ROOT, 'js/arts.js'), 'utf8');

// ---------- 1. 从 arts.js 抓出「Boss 名 -> pillar 招式」 ----------
const bossBlocks = [];
const reBoss = /^\s*'([^']+)':\s*\{\s*tag:/gm;
let m;
while ((m = reBoss.exec(arts))) bossBlocks.push({ name: m[1], at: m.index });
bossBlocks.forEach((b, i) => { b.end = i + 1 < bossBlocks.length ? bossBlocks[i + 1].at : arts.length; });

const pillars = [];
for (const b of bossBlocks) {
  const body = arts.slice(b.at, b.end);
  const lines = body.split('\n');
  for (const ln of lines) {
    if (!/fx:\s*'pillar'/.test(ln)) continue;
    const n = (ln.match(/n:\s*'([^']+)'/) || [])[1];
    const rad = +((ln.match(/rad:\s*([\d.]+)/) || [])[1] || 46);
    const hasH = /h:\s*[\d.]+/.test(ln);
    pillars.push({ boss: b.name, skill: n, rad, hasH });
  }
}

// ---------- 2. 从所有数据文件抓 Boss 体型 ----------
const jsDir = path.join(ROOT, 'js');
const sizeMap = new Map();
for (const f of fs.readdirSync(jsDir)) {
  if (!f.endsWith('.js')) continue;
  const src = fs.readFileSync(path.join(jsDir, f), 'utf8');
  const re = /name:\s*'([^']+)'([^{}]*?)\br:\s*(\d+)([^{}]*?)\bscale:\s*([\d.]+)/g;
  let k;
  while ((k = re.exec(src))) {
    const [, nm, , r, , scale] = k;
    // 同一个名字可能出现在多张图里（重复刷），取最大 r
    const prev = sizeMap.get(nm);
    if (!prev || +r > prev.r) sizeMap.set(nm, { r: +r, scale: +scale, file: f });
  }
  // 有的记录没有 scale 字段
  const re2 = /name:\s*'([^']+)'([^{}]*?)\br:\s*(\d+)(?:[^{}]*?\bdmg:)/g;
  while ((k = re2.exec(src))) {
    const nm = k[1], r = +k[3];
    if (!sizeMap.has(nm)) sizeMap.set(nm, { r, scale: null, file: f });
  }
}

// ---------- 3. 报 ----------
const uniq = [...new Set(pillars.map(p => p.boss))];
console.log('pillar 招式数：' + pillars.length + '，涉及 Boss：' + uniq.length + '\n');
console.log('Boss'.padEnd(22) + 'r'.padStart(4) + 'scale'.padStart(7) + '  招式'.padEnd(12) + 'rad' + '   当前h  建议h');
console.log('-'.repeat(84));
const out = [];
for (const p of pillars) {
  const s = sizeMap.get(p.boss);
  const r = s ? s.r : null;
  // 建议：柱高跟体型走，但不低于 150（否则看不见），不高于 340（否则出屏幕）
  const h = r ? Math.max(150, Math.min(340, Math.round(r * 7.2 / 10) * 10)) : null;
  out.push({ ...p, r, scale: s?.scale ?? null, h });
  console.log(
    p.boss.padEnd(22) +
    String(r ?? '??').padStart(4) +
    String(s?.scale ?? '-').padStart(7) +
    ('  ' + p.skill).padEnd(14) +
    String(p.rad).padStart(4) +
    '   ' + (p.hasH ? '有' : '无').padStart(4) +
    '   ' + String(h ?? '??').padStart(4)
  );
}
const noSize = out.filter(o => o.r == null).map(o => o.boss);
if (noSize.length) console.log('\n[缺体型] ' + [...new Set(noSize)].join(' / '));

fs.writeFileSync(path.join(ROOT, 'qa/pillar-height.json'), JSON.stringify(out, null, 2));
console.log('\n写入 qa/pillar-height.json');
