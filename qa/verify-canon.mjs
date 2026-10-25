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

// ===== 2. 古传送阵：修为受创 + 重修期 =====
console.log('\n== 2. 修为受创与重修 ==');
let r2 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(48);
  F.enterMap('guchuan', 'easy'); F.skipStory();
  F.finishMapNow();
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { lv: F.info().cultivate.level, wounded: s.wounded || null, desc: (document.getElementById('victoryDesc') || {}).textContent || '' };
})()`);
ok(r2.lv === 46, '被吸走修为：跌两层（48 → 46，保底筑基初期）', r2.lv);
ok(r2.wounded && r2.wounded.to === 48 && r2.wounded.mult === 2, '记下重修目标与翻倍', r2.wounded);
ok(r2.desc.indexOf('修为受创') >= 0, '结算页写明修为受创', r2.desc);

let r2b = await E(`(() => {
  const F = window.__FR;
  F.setLevel(48);
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { wounded: s.wounded || null };
})()`);
ok(r2b.wounded === null, '修回原层后重修状态自动解除', r2b.wounded);

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
