// 线上核验：批次 8（同行纪）在 GitHub Pages 上真的生效
// 注意：下面两处版本串每轮发版后要跟着改（验的就是「这一个版本」在线上）
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
await page.waitForFunction(() => !!window.__FR && !!window.ALLY_SKILLS, { timeout: 30000 });

const ver = await page.evaluate(() => (document.getElementById('ver') || {}).textContent || '');
ok(/v?20261116E/.test(ver), '线上版本串 20261116E', ver);
ok(/20261116E/.test(await page.evaluate(() => (document.querySelector('script[src*="game.js"]') || {}).src || '')),
  'game.js 的 ?v= 也是 20261116E');

const api = await page.evaluate(() => ({
  miss: ['bond', 'bondCd', 'bondTiers', 'togetherRows', 'setTogether', 'allyDeadMap', 'setAllyDead', 'giveMate', 'clearAlly', 'hitAlly']
    .filter(k => typeof window.__FR[k] !== 'function'),
  tiers: window.__FR.bondTiers()
}));
ok(api.miss.length === 0, '线上带着同行纪的整套探针', api.miss);
ok(api.tiers.length === 3 && api.tiers.map(t => t.label).join('') === '初识相熟生死之交',
  '线上三档齐备', api.tiers.map(t => t.label));
ok(api.tiers.map(t => t.cd).join(',') === '1,0.88,0.78', '线上 CD 乘数 1 / 0.88 / 0.78', api.tiers.map(t => t.cd));

// 记场：带一只打完一图记一场；不带不记
await page.evaluate(() => {
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.muteStory(true);
  window.__FR.setSpawn(false);
});
await wait(500);
const rec = await page.evaluate(() => {
  const F = window.__FR, out = {};
  F.clearAlly();
  F.setTogether('p_tihun', 0, 0);
  F.enterMap('houshan', 'easy');
  F.finishMapNow();
  out.solo = { n: F.bond('p_tihun').n };                       // 场上没人 → 不该记
  F.clearAlly(); F.givePet('p_tihun'); F.setTogether('p_tihun', 0, 0);
  F.enterMap('houshan', 'easy');
  F.finishMapNow();
  const r = F.bond('p_tihun');
  out.withPet = { n: r.n, map: r.map, year: r.year };
  out.tiers = [0, 8, 25].map(n => { F.setTogether('p_tihun', n, 0); return F.bondCd('p_tihun'); });
  return out;
});
ok(rec.solo.n === 0, '线上：不带随行者打完一图不记同行', rec.solo);
ok(rec.withPet.n === 1 && rec.withPet.map === 'houshan' && rec.withPet.year >= 0,
  '线上：带一只打完一图记一场（落图名与年份）', rec.withPet);
ok(rec.tiers.join(',') === '1,0.88,0.78', '线上：三档乘数真的按档位走', rec.tiers);

// 生死之交：殒了，带着名字打完这一图自个儿回来
const back = await page.evaluate(() => {
  const F = window.__FR;
  F.clearAlly(); F.givePet('p_tihun'); F.setTogether('p_tihun', 25, 0);
  F.enterMap('houshan', 'easy');
  F.setAllyDead('p_tihun');
  const before = !!F.allyDeadMap()['p_tihun'];
  F.finishMapNow();
  return { before, after: !!F.allyDeadMap()['p_tihun'] };
});
ok(back.before === true && back.after === false, '线上：生死之交殒了会自个儿回来', back);

const disk = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return raw.together || null;
});
ok(disk && disk['p_tihun'] && disk['p_tihun'].n > 0, '线上：同行账写进存档', disk && disk['p_tihun']);

// 洞府：灵宠页的羁绊标签与那一行字、静修页的「同行」一节
const ui = await page.evaluate(() => {
  const F = window.__FR;
  F.setTogether('p_tihun', 12, 0, 'xutian');
  F.givePet('p_tihun');
  const k = Object.keys(window.CAVES || {})[0];
  F.G.caveTab = 'pet'; F.cave(k);
  const body = document.getElementById('caveBody');
  // 场上有几只宠是不确定的（这一趟可能顺手孵出一只云翅鸟）—— 得按名字找到啼魂兽那一条，
  // 不能抓第一个 .bond（第一只不一定是它）。
  const row = [...body.querySelectorAll('.recrow')].find(r =>
    ((r.querySelector('.rr-main b') || {}).textContent || '').indexOf('啼魂兽') >= 0);
  const tag = row ? row.querySelector('.bond') : null;
  const line = row ? row.querySelector('.bond-line') : null;
  const pet = { bond: tag ? tag.textContent : null, data: tag ? tag.getAttribute('data-bond') : null, line: line ? line.textContent : null };
  F.G.caveTab = 'rest'; F.cave(k);
  const secs = [...document.querySelectorAll('#caveBody .cave-sec')];
  const sec = secs.find(s => ((s.querySelector('.cs-title') || {}).textContent || '') === '同行');
  const rows = sec ? [...sec.querySelectorAll('.jz-row')].map(r => (r.querySelector('i') || {}).textContent) : [];
  return { pet, hasTogether: !!sec, rows };
});
ok(ui.pet.bond === '相熟' && ui.pet.data === '1', '线上：灵宠页挂着羁绊标签', ui.pet);
ok(/同行 12 场/.test(ui.pet.line || '') && /再 13 场到「生死之交」/.test(ui.pet.line || ''),
  '线上：灵宠页那一行报场数与「再几场」', ui.pet.line);
ok(ui.hasTogether === true && ui.rows.length > 0 && ui.rows[0] === '12 场',
  '线上：静修页「同行」一节按场数排出条目', { has: ui.hasTogether, rows: ui.rows });

ok(errs.length === 0, '线上零 pageerror', errs.slice(0, 5));
ok(net404.length === 0, '线上无 4xx/5xx 资源', net404.slice(0, 5));

await b.close();
console.log('\n== 线上核验 · 批次 8 ==');
if (bad.length) { console.log('失败项：'); bad.forEach(m => console.log('  ✗ ' + m)); }
console.log('\nRESULT ' + pass + '/' + (pass + fail) + (fail ? '  有红' : '  全绿'));
process.exit(fail ? 1 : 0);
