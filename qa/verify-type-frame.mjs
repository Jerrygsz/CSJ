// 类型骨架回归：守「按类型给骨架」这条口径，以及它最容易破的三处。
//
// 起因：柳岐老祖（原著「九条尾巴的雪白巨狐」）挂在 haishou 蛟龙图上整整半年没人发现，
// 因为 qa/audit-sprite-usage.mjs 只扫 `boss:` 字段，际遇角色整片漏检。
// 这条口径之后要长期成立，所以把三件事固化成断言：
//
//   ① 蛟龙图不许再挂到「兽」身上（boss / 际遇具名角色）；
//   ② 三张兽形骨架必须是「正面」——判据是逐行左右镜像相等，侧视图过不了；
//   ③ 脸的两只眼睛必须分得开（woodling 第一版两眼相邻，实拍读成一个洞）。
//
//   node qa/verify-type-frame.mjs
import fs from 'fs';
import path from 'path';

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

const SRC = fs.readFileSync('js/sprites.js', 'utf8');
const TYPE_FRAMES = ['liuqi', 'beast4', 'beast4big', 'beast4low', 'woodling'];

// 取某张精灵的 rows 数组
function rowsOf(name) {
  const i = SRC.indexOf("name: '" + name + "'");
  if (i < 0) return null;
  const j = SRC.indexOf('rows: [', i);
  if (j < 0) return null;
  const k = SRC.indexOf(']', j);
  return [...SRC.slice(j, k).matchAll(/'([^']*)'/g)].map(m => m[1]);
}

console.log('\n【1】五张类型骨架的存在与尺寸');
for (const n of TYPE_FRAMES) {
  const r = rowsOf(n);
  ok(!!r, n + ' 有定义');
  if (!r) continue;
  const w = r[0].length, h = r.length;
  ok(w === 16 && h === 16, n + ' 是 16x16（非人形要 256 格）', [w, h]);
  ok(r.every(x => x.length === w), n + ' 行宽一致（不错位）', r.map(x => x.length));
}

console.log('\n【2】兽形骨架必须是正面（逐行左右镜像相等）');
// 侧视图（第一版就是侧视）在这一项上必挂：身体一横铺，左右差一大截。
// 允许 ±0：像素图正面就该严格对称，差一格说明某侧多画了一块。
for (const n of ['beast4', 'beast4big']) {
  const r = rowsOf(n);
  if (!r) { ok(false, n + ' 缺失'); continue; }
  const bad = [];
  r.forEach((row, i) => {
    const rev = row.split('').reverse().join('');
    if (row !== rev) bad.push(i);
  });
  ok(bad.length === 0, n + ' 逐行左右对称（正面视图）', bad.length ? { 不对称行: bad } : undefined);
}

console.log('\n【3】脸：两只眼睛必须分得开');
{
  // woodling 的眼是 b（暗木），第一版写成 bb 相邻 → 实拍读成「一个洞」
  const r = rowsOf('woodling');
  const eyeRow = r && r.find(x => x.includes('b') && !x.includes('Bb'));
  const s = r && r.join('\n');
  const pair = s && /b[^b]*b/.test(r.filter(x => (x.match(/b/g) || []).length === 2).join(''));
  ok(!!pair, 'woodling 两只眼睛在同一行且中间隔开', r && r.filter(x => (x.match(/b/g) || []).length));
  ok(!/bb/.test(r ? r.slice(5, 9).join('') : ''), 'woodling 脸部不出现相邻的 bb（会读成一个洞）');
}
{
  // liuqi 的眼是 S（淡灰瞳），要 2 格宽 —— 1 格宽在 22 倍放大下是个点，读成呆
  const r = rowsOf('liuqi');
  const eyes = r && r.filter(x => x.includes('SS'));
  ok(!!eyes && eyes.length === 1, 'liuqi 眼睛为 2 格宽的细长眼（不是 1 格点）', eyes);
}

console.log('\n【4】蛟龙图（haishou）不许再挂到兽 / 具名角色身上');
{
  // haishou 是「横躺的蓝灰蛟龙」，只该给海妖兽那种真·蛟形小怪用。
  // 允许出现的唯一一处：late.js 里 haishou 小怪自己的定义行。
  const files = fs.readdirSync('js').filter(f => f.endsWith('.js') && f !== 'sprites.js');
  const bad = [];
  for (const f of files) {
    fs.readFileSync(path.join('js', f), 'utf8').split('\n').forEach((l, i) => {
      if (!/spr:\s*'haishou'/.test(l)) return;
      // 小怪定义行带 tier/mats（boss 行带 hp/spd/dmg/r/spr 五件套）
      if (/tier:/.test(l) && /mats:/.test(l)) return;
      bad.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 90));
    });
  }
  ok(bad.length === 0, '没有任何 boss / 际遇角色挂 haishou', bad);
}

console.log('\n【5】接线：画了必须用上');
{
  const need = [
    ['liuqi', ['encounters.js', 'game.js']],
    ['woodling', ['lingjie.js']],
    ['beast4', ['late2.js', 'xianjie.js']],
    ['beast4big', ['late.js', 'lingjie.js']],
    ['beast4low', ['lingjie.js']]
  ];
  for (const [n, where] of need) {
    const hit = where.filter(f => fs.readFileSync(path.join('js', f), 'utf8').includes("'" + n + "'"));
    ok(hit.length > 0, n + ' 已在 ' + where.join(' / ') + ' 接线', hit);
  }
}

console.log('\n【6】兽形头身比：读得出头，且三档之间有梯度');
{
  // 一版实拍「驮着球的羊」的根因就是头只占 4 行，身体一条宽横带 —— 读成「一块肉」。
  // 判据分两层：
  //   ① 中型 / 低伏：头要够大（前 8 行非空像素 ≥ 后 8 行 ×0.85）才读得出是兽；
  //   ② 大型：头身比必须**小于**中型 —— 「大」这个信息不靠放大，靠「头相对小」。
  // 注意 beast4big 的比值是有意压到 0.74 的，不能用统一阈值硬卡，
  // 那会把「大型」这个设计意图当成 bug 修掉。
  const ratio = {};
  for (const n of ['beast4', 'beast4big', 'beast4low']) {
    const r = rowsOf(n);
    if (!r) continue;
    const cnt = a => a.join('').split('').filter(c => c !== '.').length;
    const top = cnt(r.slice(0, 8)), bot = cnt(r.slice(8));
    ratio[n] = +(top / bot).toFixed(2);
    if (n !== 'beast4big') {
      ok(top >= bot * 0.85, n + ' 头够大（前 8 行 ≥ 后 8 行 ×0.85）', { top, bot, r: ratio[n] });
    }
  }
  ok(ratio.beast4big < ratio.beast4, '大型兽的头身比小于中型兽（「大」靠比例差，不靠放大）', ratio);
  ok(ratio.beast4low >= 0.85, '低伏兽的头没有被身体吃掉', ratio.beast4low);
}

console.log('\n【7】战斗尺寸：兽形 boss 的显示高度要落在人形 boss 的区间');
{
  // 换画布最容易漏的一件事：scale 是按旧画布的行数定的。
  // haishou 是 16x10，兽形骨架是 16x16 —— 沿用旧 scale 会让 boss 凭空矮 27%。
  // 基准（从代码里读出来的，不是估的）：
  //   玩家 hanli 12x14 @1.7  → 23.8px
  //   人形 boss 14 行 @6.0~6.9 → 84~97px
  //   兽形 boss 16 行     → 要 84~97px，scale 得给到 5.25~6.1
  // 断言的区间放宽到 72~104：人界的小 boss 允许比灵界矮一档，仙界的大兽允许高一档。
  const rows = [];
  for (const f of fs.readdirSync('js').filter(x => x.endsWith('.js') && x !== 'sprites.js')) {
    fs.readFileSync(path.join('js', f), 'utf8').split('\n').forEach((l, i) => {
      const m = l.match(/spr:\s*'(beast4big|beast4low|beast4|woodling)',\s*scale:\s*([\d.]+)/);
      if (m) rows.push({ spr: m[1], scale: +m[2], h: 16, px: +(16 * +m[2]).toFixed(1), at: f + ':' + (i + 1) });
    });
  }
  ok(rows.length >= 5, '抓到 ' + rows.length + ' 处兽形 boss 的 scale', rows.map(r => r.at));
  const out = rows.filter(r => r.px < 72 || r.px > 104);
  ok(out.length === 0, '兽形 boss 显示高度均在 72~104px（人形 boss 84~97px 的邻域）', out);
  console.log('     实测：' + rows.map(r => r.spr + ' ' + r.px + 'px').join(' / '));
}

console.log('\n────────────────────────');
if (fail === 0) console.log('全绿：' + pass + ' 通过 / 0 失败');
else console.log('失败：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail === 0 ? 0 : 1);
