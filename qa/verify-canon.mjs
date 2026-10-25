// 剧情补遗守门：①太南小会后万小山遇害（原著转折）②古传送阵修为受创 + 重修期
// ③昊元丹/培婴丹只作修行辅助、不入突破门 ④太南小会散场后「后巷」可去
// 用法：node qa/verify-canon.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9022;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra === undefined ? '' : '  →  ' + JSON.stringify(extra))); }
}

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
const E = c => page.evaluate(c);

// ===== 1. 万小山遇害（原著：散修三人谋财，韩立杀二、一逃）=====
console.log('\n== 1. 太南小会：万小山之死 ==');
let r1 = await E(`(() => {
  const s = (window.MAP_STORIES || {}).tainan || [];
  return { n: s.length, txt: s.map(x => x[1]).join('') };
})()`);
ok(r1.n >= 18, '太南小会对话已加长（含回程一段）', r1.n);
ok(r1.txt.indexOf('万小山') >= 0 && r1.txt.indexOf('刀口') >= 0, '写入万小山被劫杀', r1.txt.slice(-80));
ok(r1.txt.indexOf('三个人') >= 0 && r1.txt.indexOf('一个钻进林子') >= 0, '韩立杀二、一人逃（原著情节）', '');

// ===== 2. 古传送阵：跌回练气四层（照原著）+ 不吃抬级 + 高阶战图不放行 =====
console.log('\n== 2. 跌回练气四层 ==');
let r2 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(48);
  F.enterMap('guchuan', 'easy'); F.skipStory();
  F.finishMapNow();
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  const lv = F.info().cultivate.level;
  // 受创期进「魁星岛」（剧情图，图下限 44）—— 不该被抬到 44
  F.enterMap('kuixing', 'easy'); F.skipStory();
  const lvAfterMap = F.G.player ? F.G.player.level : null;
  // 受创期进「六连殿」（战图，46）—— 不放行
  const before = F.G.mapId;
  F.enterMap('liulian', 'easy');
  return {
    lv, wounded: s.wounded || null, lvAfterMap, blocked: F.G.mapId === before ? 'blocked' : F.G.mapId,
    desc: (document.getElementById('victoryDesc') || {}).textContent || ''
  };
})()`);
ok(r2.lv === 7, '跌回练气四层（Lv7 即练气四层，照原著照抄）', r2.lv);
ok(r2.wounded && r2.wounded.to === 48, '记下受创前境界（筑基后期）', r2.wounded);
ok(r2.lvAfterMap === 7, '受创期不吃地图基础等级（进魁星岛仍是练气四层）', r2.lvAfterMap);
ok(r2.blocked === 'blocked', '受创期不放行高阶战图（六连殿要筑基后期才出海）', r2.blocked);

// ===== 2b. 三段闭关重修（按原著节奏）=====
console.log('\n== 2b. 小寰岛闭关重修 ==');
let r2b = await E(`(() => {
  const F = window.__FR;
  F.setLevel(7); F.setStones(9000);
  const a = F.rebuild(19);
  const b = F.rebuild(36);
  const c = F.rebuild(48);
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { a, b, c, wounded: s.wounded || null, stones: F.info().stones };
})()`);
ok(r2b.a.ok && r2b.a.lv === 19, '闭关一年 → 练气九层', r2b.a);
ok(r2b.b.ok && r2b.b.lv === 36, '再闭关一年 → 筑基初期', r2b.b);
ok(r2b.c.ok && r2b.c.lv === 48, '闭关六年 → 筑基后期（大衍诀/身外化身）', r2b.c);
ok(r2b.wounded === null, '修回原层后受创状态解除', r2b.wounded);

let r2c = await E(`(() => {
  const F = window.__FR;
  F.setLevel(7); F.setStones(100);            // 灵石不够
  return F.rebuild(19);
})()`);
ok(r2c.ok === false && r2c.lv === 7, '灵石不足时重修不生效', r2c);

// 受创状态必须能存住（读档之后还在，否则一刷新就白跌）
await E(`(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(48);
  F.enterMap('guchuan', 'easy'); F.skipStory(); F.finishMapNow();
})()`);
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
const r2d = await E(`(() => {
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { lv: s.cultivate ? s.cultivate.level : null, wounded: s.wounded || null };
})()`);
ok(r2d.lv === 7 && r2d.wounded && r2d.wounded.to === 48, '读档后仍是练气四层、受创状态仍在', r2d);

// ===== 3. 昊元丹 / 培婴丹：只作修行辅助，不入突破门 =====
console.log('\n== 3. 昊元丹 / 培婴丹 ==');
let r3 = await E(`(() => {
  const W = window;
  const shop = (W.SHOP_STOCK || []).map(x => x.id);
  const inGate = ['haoyuan', 'peiyin'].filter(id => (W.BREAKTHROUGH || []).some(b =>
    (b.items || []).some(x => x[0] === id) || (b.needs || []).some(x => x[0] === id)));
  return {
    has: ['haoyuan', 'peiyin'].every(id => !!W.Items.get(id)),
    shop: shop.indexOf('haoyuan') >= 0 && shop.indexOf('peiyin') >= 0,
    inGate
  };
})()`);
ok(r3.has === true, '两味丹都已录入', r3);
ok(r3.shop === true, '坊市有售（原著：灵丹，非独一份）', r3);
ok(r3.inGate.length === 0, '不设关卡（原著只作辅助，未点名关卡）', r3.inGate);

// ===== 4. 太南小会散场后「后巷」可去 =====
console.log('\n== 4. 后巷不再是死内容 ==');
let r4 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(10);
  F.enterMap('tainan', 'easy'); F.skipStory(); F.finishMapNow();
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { unlocked: (s.unlocked || []).indexOf('heixiang') >= 0, side: F.sideMaps().filter(x => x.id === 'heixiang')[0] || null };
})()`);
ok(r4.unlocked === true, '通关太南小会后开「后巷」', r4);
ok(r4.side && r4.side.on === true, '后巷在支线列表里亮起', r4.side);

// ===== 5. 零报错 =====
console.log('\n== 5. 全程零报错 ==');
ok(errs.length === 0, '无页面/控制台报错', errs.slice(0, 3));

await b.close(); server.close();
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
process.exit(fail ? 1 : 0);
