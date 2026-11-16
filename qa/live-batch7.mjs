// 线上核验：批次 7（P2-3 联机闭环）在 GitHub Pages 上真的生效
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const LIVE = 'https://jerrygsz.github.io/CSJ/index.html?live=1';
let pass = 0, fail = 0; const bad = [];
const ok = (c, m, e) => { if (c) { pass++; return 1; } fail++; bad.push(m + (e !== undefined ? '  → ' + JSON.stringify(e) : '')); return 0; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 400, height: 812 } });
const errs = [], net404 = [];
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
page.on('response', r => { if (r.status() >= 400) net404.push(r.status() + ' ' + r.url()); });

await page.goto(LIVE, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => !!window.__FR && !!window.Coop, { timeout: 30000 });

const ver = await page.evaluate(() => (document.getElementById('ver') || {}).textContent || '');
ok(/v?20261116C/.test(ver), '线上版本串 20261116C', ver);
ok(/20261116C/.test(await page.evaluate(() => (document.querySelector('script[src*="game.js"]') || {}).src || '')),
  'game.js 的 ?v= 也是 20261116C');

const api = await page.evaluate(() => ({
  markHit: typeof window.Coop.markHit, crossMul: typeof window.Coop.crossMul,
  tie: typeof window.Coop.tieState, fire: typeof window.Coop.fireTieById,
  tiers: (window.Coop.TIERS || []).map(t => t.name).join(''),
  need: window.Coop.TIE_NEED, win: window.Coop.CROSS_WIN
}));
ok(api.markHit === 'function' && api.crossMul === 'function' && api.tie === 'function' && api.fire === 'function',
  '线上联机模块带着夹击 / 合击的四个入口', api);
ok(api.tiers === '初会默契同心' && api.need === 4 && api.win === 2, '线上三档与窗口常量正确', api);

await page.evaluate(() => {
  window.__FR.setCoopTie(0);
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.muteStory(true);
  window.__FR.setSpawn(false);
});
await wait(600);

const logic = await page.evaluate(() => {
  const g = window.__FR.G;
  const out = {};
  g.enemies.length = 0; g.texts.length = 0;
  window.__FR.spawnNear(200, 100, 'wolf', true, 5000);
  const e = g.enemies[g.enemies.length - 1];
  const id = e._id;
  g.coopRole = 'host'; g.time = 50; g._tieCd = -99;
  e._hitMark = { me: -99, pt: -99 }; e._cross = 0;
  // 单人：连打十下
  for (let i = 0; i < 10; i++) { g.time += 0.1; window.__FR.coopMark(id, false); }
  out.solo = window.__FR.crossOf(id).cross;
  // 双人：各一下
  e._hitMark = { me: -99, pt: -99 }; e._cross = 0;
  g.time += 0.2; window.__FR.coopMark(id, false);
  g.time += 0.3; window.__FR.coopMark(id, true);
  out.duo = window.__FR.crossOf(id).cross;
  // 夹击破罩：普通 vs 夹击
  const wardOf = (crossed) => {
    e._hitMark = { me: -99, pt: -99 }; e._cross = 0;
    if (crossed) { g.time += 0.1; window.__FR.coopMark(id, false); g.time += 0.1; window.__FR.coopMark(id, true); }
    else { g.time += 0.1; window.__FR.coopMark(id, false); g.time += 0.1; window.__FR.coopMark(id, false); }
    window.__FR.setWard(id, 1.0);
    const before = e.ward;
    window.__FR.damageEnemyById(id, 1000);
    return Math.round(before - e.ward);
  };
  out.wardPlain = wardOf(false);
  out.wardCross = wardOf(true);
  // 合击：交替攒够 4 下
  window.__FR.setCoopTie(0); g._tieCd = -99;
  for (let i = 0; i < 4; i++) { g.time += 0.2; window.__FR.coopMark(id, false); g.time += 0.2; window.__FR.coopMark(id, true); }
  out.tieN = window.__FR.coopTieN();
  out.tieText = g.texts.map(t => t.text).filter(t => /^合击/.test(t)).length;
  g.coopRole = null;
  return out;
});
ok(logic.solo <= 0, '线上：单人连打十下不成夹击', logic.solo);
ok(logic.duo > 0, '线上：两人各一手成夹击', logic.duo);
ok(logic.wardPlain > 0 && logic.wardCross / logic.wardPlain > 1.7, '线上：夹击把护罩扣得更快（≥1.7×）',
  { plain: logic.wardPlain, cross: logic.wardCross });
ok(logic.tieN > 0 && logic.tieText > 0, '线上：交替命中攒够就出合击并留字', logic);

const disk = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return raw.coop || null;
});
ok(disk && typeof disk.tie === 'number' && disk.tie > 0, '线上：默契次数写进存档', disk);

// 面板
await page.evaluate(() => { window.__FR.setCoopTie(12); window.__FR.toTitle(); });
await wait(300);
const panel = await page.evaluate(() => {
  const el = document.getElementById('coopTie');
  return { exists: !!el };
});
ok(panel.exists, '线上：联机面板有共斗默契块', panel);
await page.evaluate(() => document.getElementById('coopBtn').click());
await wait(500);
const panelTxt = await page.evaluate(() => {
  const el = document.getElementById('coopTie');
  const bar = el && el.querySelector('.ct-bar i');
  return { t: el ? el.textContent.replace(/\s+/g, ' ').trim() : '', w: bar ? bar.style.width : null };
});
ok(/共斗默契 · 默契/.test(panelTxt.t) && /合击 12 次/.test(panelTxt.t) && /再合击 8 次到「同心」/.test(panelTxt.t),
  '线上：面板报出档位 / 次数 / 距下一档', panelTxt.t.slice(0, 140));
ok(panelTxt.w && parseInt(panelTxt.w, 10) > 0 && parseInt(panelTxt.w, 10) < 100, '线上：进度条按档内进度填充', panelTxt.w);

ok(errs.length === 0, '线上零 pageerror', errs.slice(0, 5));
ok(net404.length === 0, '线上无 4xx/5xx 资源', net404.slice(0, 5));

await b.close();
console.log('\n== 线上核验 · 批次 7 ==');
if (bad.length) { console.log('失败项：'); bad.forEach(m => console.log('  ✗ ' + m)); }
console.log('\nRESULT ' + pass + '/' + (pass + fail) + (fail ? '  有红' : '  全绿'));
process.exit(fail ? 1 : 0);
