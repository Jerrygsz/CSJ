// 审计：boss / 具名 NPC 的外观覆盖情况
//
// 用途：查「哪些 boss 还在共用轮换图」「哪些专属精灵画了却没接上」。
// 只报告、不判定失败（不是回归守门），加完新 boss 后跑一次即可看清单。
//
//   node qa/audit-sprite-usage.mjs
//
// 两类检查：
//   ① 按 spr 归并全部 boss —— 同一张图挂了多少个具名者，一眼看出撞图重灾区
//   ② 扫专属精灵在 js/ 下的实际引用 —— 只存在于 sprites.js 里的就是「画了没用上」

import fs from 'fs';
import path from 'path';

const DIR = 'js';
const SCAN = ['maps.js', 'late.js', 'late2.js', 'late3.js', 'lingjie.js', 'xianjie.js', 'coop.js', 'game.js', 'encounters.js'];
const OWN = ['mo2', 'wangchan', 'lifeiyu', 'zhangtie', 'lihuayuan', 'nangongwan', 'ziling', 'yuanyao', 'dayan',
  'luxiong', 'qingyan', 'rehuo', 'jingyang', 'xiedaoren', 'jintong', 'liuleer', 'yuehuang', 'liudao',
  'qianlaomo', 'xuangu', 'yecha', 'yanyue', 'hanlishang', 'longjia', 'fujia', 'qinglong', 'lizunzhe',
  'xueguang', 'shouzun', 'yuansha', 'guxiuhai', 'shiyan', 'luanming', 'guanghan',
  'jinguang', 'xiongsiwang', 'tuntian', 'guimu', 'baimu', 'guhuang',
  'xiaojinhan', 'dongfangbai', 'qimozi', 'miaofa', 'donglihu', 'guhuojin',
  // 第二档 14 张（元魇铺 2 个化身位、马良铺 2 个形态位）
  'yuanyan', 'baohua', 'huangyuanzi', 'yinchiyecha', 'aoxiao', 'zhiyang', 'liuzizai',
  'bumietianzun', 'guilingzi', 'lufuren', 'maliang', 'miaohe', 'lengyan', 'heitian',
  // 第三档兽形（16x16），此前 9 个 beast 型 boss 全共用 haishou
  'moyuanbeast', 'mingchong', 'xiuluo'];

// ---------- ① boss 归并 ----------
// 注意：extraBoss 是数组，一行里可能挂好几个首领（如 lingjie 的 双修夫妇 / 五光族），
// 所以不能只取行内第一个 name+spr，要逐个对象配对。
const rows = [];
for (const f of SCAN) {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) continue;
  fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
    if (!/boss/i.test(l) || /^\s*\/\//.test(l)) return;
    const pair = /name:\s*'([^']*)'[^}]*?spr:\s*'([^']*)'/g;
    let m, hit = false;
    while ((m = pair.exec(l))) {
      hit = true;
      rows.push({ file: f.replace('.js', ''), line: i + 1, name: m[1], spr: m[2] });
    }
    if (!hit && /boss:\s*\{/.test(l)) {
      const nm = (l.match(/name:\s*'([^']*)'/) || [])[1] || '?';
      rows.push({ file: f.replace('.js', ''), line: i + 1, name: nm, spr: '(默认)' });
    }
  });
}

const bySpr = {};
for (const r of rows) (bySpr[r.spr] = bySpr[r.spr] || []).push(r);

console.log('=== boss 共 ' + rows.length + ' 个，按精灵归并 ===\n');
const owned = [], shared = [];
for (const k of Object.keys(bySpr).sort((a, b) => bySpr[b].length - bySpr[a].length)) {
  const isOwn = OWN.includes(k);
  (isOwn ? owned : shared).push(k);
  const tag = isOwn ? '专属' : '通用';
  console.log('[' + k + '] ' + tag + ' x' + bySpr[k].length);
  for (const r of bySpr[k]) console.log('    ' + r.name + '  (' + r.file + ':' + r.line + ')');
  console.log('');
}
const ownCount = owned.reduce((n, k) => n + bySpr[k].length, 0);
const sharedCount = shared.reduce((n, k) => n + bySpr[k].length, 0);
console.log('专属图覆盖 ' + ownCount + ' 个 boss / 共用图 ' + sharedCount + ' 个 boss\n');

// ---------- ② 专属精灵引用 ----------
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js') && f !== 'sprites.js');
const refs = {};
for (const n of OWN) refs[n] = [];
for (const f of files) {
  fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').forEach((l, i) => {
    for (const n of OWN) {
      // spr 字段 + NPC_FACE 小像映射都算「用上了」
      if (new RegExp("spr:\\s*'" + n + "'").test(l) || new RegExp(":\\s*'" + n + "'").test(l)) {
        refs[n].push(f.replace('.js', '') + ':' + (i + 1));
      }
    }
  });
}

console.log('=== 专属精灵 ' + OWN.length + ' 张的引用 ===\n');
const dead = [];
for (const n of OWN) {
  if (!refs[n].length) { dead.push(n); continue; }
  console.log('  ' + n.padEnd(12) + ' x' + refs[n].length + '   ' + refs[n].slice(0, 4).join(' '));
}
console.log('\n=== 一次都没引用的（画了没用上） ===');
console.log(dead.length ? '  ' + dead.join(' ') : '  （无）');
