// 扫荡与掉落增幅的常驻回归
// 前置：无（自己起 headless 页面）
// 覆盖：费用公式 / 增幅区间 / 保底产量 / 未破难度拦截 / 灵石不足拦截 / 账目自洽 / 防连点
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9087;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.png':'image/png' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p==='/') p='/index.html'; const f = join(root,p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200,{ 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT,'127.0.0.1',r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport:{width:430,height:920} });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};

await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);

// 存档：全图解锁；血色禁地三档全破；其余图只破凡境
await page.evaluate(() => {
  const ids = window.MAPS.map(m => m.id);
  const dc = {};
  for (const id of ids) dc[id] = { easy: true };
  dc.xuese = { easy: true, hard: true, nightmare: true };
  const s = {};
  s.unlocked = ids; s.cleared = ids; s.caves = []; s.diffClear = dc;
  s.cultivate = { level: 40, xp: 0, skills: {} }; s.inventory = {};
  s.stones = 200000; s.best = { level: 40, time: 0, kills: 0 };
  localStorage.setItem('fanren_save_v1', JSON.stringify(s));
});
await page.reload({ waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);
await page.waitForTimeout(400);

// ---------- 1) 费用公式 ----------
console.log('\n【扫荡费用：总灵石 9%，保底 9999】');
const fee = await page.evaluate(() => {
  const F = window.__FR, o = {};
  F.setStones(200000); o.big = F.sweepCost();
  F.setStones(50000);  o.mid = F.sweepCost();
  F.setStones(9999);   o.low = F.sweepCost();
  F.setStones(1000);   o.poor = F.sweepCost();
  return o;
});
ok(fee.big === 18000, '灵石 200000 → 费用 18000（9%）', fee.big);
ok(fee.mid === 9999, '灵石 50000（9% 只有 4500）→ 走保底 9999', fee.mid);
ok(fee.low === 9999, '灵石 9999（正好保底）→ 9999', fee.low);
ok(fee.poor === 9999, '灵石 1000（连保底都不够）→ 仍报 9999，由调用方拦', fee.poor);

// ---------- 2) 增幅区间与基础配额 ----------
console.log('\n【随机增幅：1.0~3.0，再按难度叠】');
const rng = await page.evaluate(() => {
  const F = window.__FR, o = {};
  for (const d of ['easy', 'hard', 'nightmare']) o[d] = F.alchBonusRange(d);
  return o;
});
ok(rng.easy[0] === 1 && rng.easy[1] === 3, '凡境 ×1.00~3.00', rng.easy);
ok(rng.hard[0] === 1.25 && rng.hard[1] === 3.75, '险境 ×1.25~3.75', rng.hard);
ok(rng.nightmare[0] === 1.5 && rng.nightmare[1] === 4.5, '死境 ×1.50~4.50', rng.nightmare);

const base = await page.evaluate(() => {
  const F = window.__FR;
  return { easy: F.alchBase('xuese', 'easy'), hard: F.alchBase('xuese', 'hard'), nightmare: F.alchBase('xuese', 'nightmare') };
});
ok(base.easy === 27 && base.hard === 45 && base.nightmare === 72,
  '禁地保底 = 3/5/8 套 = 27/45/72 份', base);

// ---------- 3) 进图实发不低于保底 ----------
console.log('\n【进图保底：实发永不低于基础配额】');
const runs = [];
for (let i = 0; i < 10; i++) {
  const r = await page.evaluate(() => {
    const F = window.__FR, G = F.G;
    F.enterMap('xuese', 'easy');
    if (G.state === 'dialog') F.skipStory();
    return G.alch ? { base: G.alch.base, total: G.alch.total, bonus: G.alch.bonus } : null;
  });
  if (r) runs.push(r);
}
const under = runs.filter(r => r.total < r.base);
const overRange = runs.filter(r => r.bonus < 1 - 1e-9 || r.bonus > 3 + 1e-9);
ok(runs.length === 10, '十次进图都拿到配额', runs.length);
ok(under.length === 0, `十次实发全部 ≥ 保底（最低 ×${Math.min(...runs.map(r => r.bonus)).toFixed(2)}，最高 ×${Math.max(...runs.map(r => r.bonus)).toFixed(2)}）`, under);
ok(overRange.length === 0, '凡境手气全落在 1.0~3.0 内', overRange.map(r => r.bonus));
ok(new Set(runs.map(r => r.total)).size > 1, '产量确实是随机的（不是每次同一个数）', runs.map(r => r.total));

// ---------- 4) 拦截：未破难度 / 灵石不足 ----------
console.log('\n【拦截】');
const deny = await page.evaluate(() => {
  const F = window.__FR, o = {};
  F.setStones(200000);
  o.notCleared = F.sweep('heixiang', 'nightmare');   // 剧情图，无难度记录
  o.notCleared2 = F.sweep('xuese', 'nightmare') ? 'PASSED' : null;
  F.setStones(1000);
  o.poor = F.sweep('xuese', 'easy');
  F.setStones(200000);
  return o;
});
ok(deny.notCleared === null, '未破之境不可扫荡', deny.notCleared);
ok(deny.notCleared2 !== null, '已破之境可扫荡（三档都破过）', deny.notCleared2);
ok(deny.poor === null, '灵石不足保底时不可扫荡', deny.poor);

// ---------- 5) 账目自洽 + 九趟保底 ----------
console.log('\n【扫荡 ×9：扣费与收成】');
await page.waitForTimeout(1400);          // 躲开防连点锁
const res = await page.evaluate(() => {
  const F = window.__FR;
  F.setStones(200000);
  const r = F.sweep('xuese', 'hard');
  return { r: r, after: JSON.parse(localStorage.getItem('fanren_save_v1')).stones };
});
const r = res.r;
ok(!!r, '扫荡返回结算结果', r);
ok(r.cost === 18000, '本次扣费 18000', r.cost);
ok(res.after === r.stonesBefore - r.cost + r.stone,
  `账目自洽：${r.stonesBefore} − ${r.cost} + ${r.stone} = ${res.after}`, { after: res.after });
const matTotal = Object.keys(r.mats).reduce((a, k) => a + r.mats[k], 0);
ok(matTotal === r.matN, '材料清单与合计一致', { matTotal, matN: r.matN });
ok(r.matN >= 45 * 9, `九趟药材 ${r.matN} 味 ≥ 保底 ${45 * 9}（险境 5 套 × 9 趟，只算主药）`, r.matN);
ok(r.bMin >= 1.25 - 1e-9 && r.bMax <= 3.75 + 1e-9,
  `险境手气 ${r.bMin.toFixed(2)}~${r.bMax.toFixed(2)} 落在 1.25~3.75`, { bMin: r.bMin, bMax: r.bMax });

// ---------- 6) 防连点 ----------
console.log('\n【防连点】');
await page.waitForTimeout(1400);          // 等上一步的锁过期，才能验证「第二击被拦」
const doubleTap = await page.evaluate(() => {
  const F = window.__FR;
  F.setStones(200000);
  const a = F.sweep('xuese', 'easy');
  const b = F.sweep('xuese', 'easy');    // 1.2 秒内第二击
  return { a: !!a, b: !!b };
});
ok(doubleTap.a === true && doubleTap.b === false, '一秒多内连点只认一次（不重复扣费）', doubleTap);

// ---------- 7) 面板 ----------
console.log('\n【界面】');
await page.waitForTimeout(1400);
const ui = await page.evaluate(() => {
  const F = window.__FR;
  F.openDiff('xuese');
  const chip = F.sweepChipText();
  const cards = document.querySelectorAll('.diffcard').length;
  const sweeps = document.querySelectorAll('.dc-sweep').length;
  return { chip, cards, sweeps };
});
ok(/扫荡 ×9/.test(ui.chip || ''), '已破难度卡片上有「扫荡 ×9」入口：' + ui.chip, ui.chip);
ok(/灵石/.test(ui.chip || ''), '按钮上直接标出费用与单位', ui.chip);
ok(ui.sweeps === 3 && ui.cards === 3, '三档全破时三个难度各有扫荡入口', ui);
ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log('\n===================================');
console.log(`  ${pass} 通过 / ${fail} 失败`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
