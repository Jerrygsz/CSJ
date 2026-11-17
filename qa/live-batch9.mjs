// 线上核验：批次 9（放生）在 GitHub Pages 上真的生效
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const LIVE = 'https://jerrygsz.github.io/CSJ/index.html?live=1';
let pass = 0, fail = 0; const bad = [];
const ok = (c, m, e) => { if (c) { pass++; return 1; } fail++; bad.push(m + (e !== undefined ? '  → ' + JSON.stringify(e) : '')); return 0; };

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 400, height: 812 } });
const errs = [], net404 = [];
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
page.on('response', r => { if (r.status() >= 400) net404.push(r.status() + ' ' + r.url()); });

await page.goto(LIVE, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => !!window.__FR && !!window.ALLY_SKILLS, { timeout: 30000 });

const ver = await page.evaluate(() => (document.getElementById('ver') || {}).textContent || '');
ok(/v?20261117A/.test(ver), '线上版本串 20261117A', ver);
ok(/20261117A/.test(await page.evaluate(() => (document.querySelector('script[src*="game.js"]') || {}).src || '')),
  'game.js 的 ?v= 也是 20261117A');

const api = await page.evaluate(() => ({
  miss: ['requestRelease', 'releaseArm', 'clearReleaseArm', 'goneRows', 'bond', 'bondCd', 'setTogether', 'givePet', 'releasePet']
    .filter(k => typeof window.__FR[k] !== 'function')
}));
ok(api.miss.length === 0, '线上带着放生的整套探针', api.miss);

// 核心闭环：养到生死之交 → 放生 → 重获归初识 → 故交册留账
const core = await page.evaluate(() => {
  const F = window.__FR, out = {};
  F.clearAlly(); F.clearReleaseArm(); F.givePet('p_tihun');
  F.setTogether('p_tihun', 25, 2, 'xutian');
  out.before = { n: F.bond('p_tihun').n, cd: F.bondCd('p_tihun') };
  const a = F.requestRelease('p_tihun');
  out.armed = a.armed; out.armedN = F.bond('p_tihun').n;
  const r = F.requestRelease('p_tihun');
  out.goneN = r.gone && r.gone.n;
  out.after = { n: F.bond('p_tihun').n, cd: F.bondCd('p_tihun') };
  out.goneRows = F.goneRows().map(g => ({ id: g.id, n: g.n, down: g.down, label: g.label, goneTs: g.goneTs }));
  F.givePet('p_tihun');
  out.reborn = { n: F.bond('p_tihun').n, cd: F.bondCd('p_tihun') };
  return out;
});
ok(core.before.n === 25 && core.before.cd === 0.78, '线上：先养到生死之交', core.before);
ok(core.armed === true && core.armedN === 25, '线上：第一次只上膛不放', { a: core.armed, n: core.armedN });
ok(core.goneN === 25 && core.after.n === 0 && core.after.cd === 1,
  '线上：第二次真放，现役账清零、CD 回 1', { g: core.goneN, a: core.after });
ok(core.reborn.n === 0 && core.reborn.cd === 1, '线上：重获从初识起（漏洞已堵）', core.reborn);
ok(core.goneRows.length >= 1 && core.goneRows.some(g => g.id === 'p_tihun' && g.n === 25 && g.label === '生死之交' && g.goneTs > 0),
  '线上：故交册留着那笔账（含 13 位墙钟）', core.goneRows);

const disk = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').togetherGone || {});
ok(disk.p_tihun && disk.p_tihun.n === 25 && disk.p_tihun.goneTs > 0, '线上：故交册落盘', disk.p_tihun);

// 洞府「故交」节 DOM = 数据
const ui = await page.evaluate(() => {
  const F = window.__FR;
  F.G.caveTab = 'rest'; F.cave('jiezi');
  const secs = [...document.querySelectorAll('#caveBody .cave-sec')];
  const sec = secs.find(s => ((s.querySelector('.cs-title') || {}).textContent || '') === '故交');
  const rows = sec ? [...sec.querySelectorAll('.jz-row')].map(r => ({
    i: (r.querySelector('i') || {}).textContent, em: (r.querySelector('em') || {}).textContent })) : [];
  return { has: !!sec, rows, n: F.goneRows().length };
});
ok(ui.has === true && ui.rows.length === ui.n && ui.rows.length > 0, '线上：静修页「故交」节与数据一致', { has: ui.has, dom: ui.rows.length, data: ui.n });
ok(ui.rows.some(r => /放归/.test(r.i || '') && /同行 \d+ 场/.test(r.em || '')), '线上：故交条目报放归年份与场数', ui.rows[0]);

ok(errs.length === 0, '线上零 pageerror', errs.slice(0, 5));
ok(net404.length === 0, '线上无 4xx/5xx 资源', net404.slice(0, 5));

await b.close();
console.log('\n== 线上核验 · 批次 9 ==');
if (bad.length) { console.log('失败项：'); bad.forEach(m => console.log('  ✗ ' + m)); }
console.log('\nRESULT ' + pass + '/' + (pass + fail) + (fail ? '  有红' : '  全绿'));
process.exit(fail ? 1 : 0);
