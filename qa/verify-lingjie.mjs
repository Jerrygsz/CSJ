// 校验灵界篇（化神之后）：地图链、炼虚突破关、原著灵物、备齐判定
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8998;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const run = (body) => page.evaluate(`(()=>{const F=window.__FR;${body}})()`);

// ---- 1) 地图存在与 chain ----
const ALL_IDS = ['anyuan', 'heifeng', 'lianxu', 'fengyuan', 'guanghan', 'heti_guan',
  'shengdao', 'mojie', 'yitian', 'huangquan', 'xiaoling', 'sanjie', 'jiujie', 'zhenxian', 'xianjie'];
const maps = await page.evaluate((ids) => window.MAPS.filter(m => ids.includes(m.id))
  .map(m => ({ id: m.id, type: m.type, unlock: m.unlock, next: m.next, startLevel: m.startLevel, endLevel: m.endLevel })), ALL_IDS);
ok(maps.length === 15, '灵界十五张图已注册', maps);
const chain = await page.evaluate((ids) => {
  const g = id => window.MAPS.find(m => m.id === id) || {};
  const o = { fs: g('feisheng').next };
  for (const id of ids) o[id] = g(id);
  o.ay = g('anyuan'); o.hf = g('heifeng'); o.lx = g('lianxu');
  o.fy = g('fengyuan'); o.gh = g('guanghan'); o.hg = g('heti_guan');
  return o;
}, ALL_IDS);
ok(chain.fs === 'anyuan', '飞升图 next 已接安远城', chain.fs);
ok(chain.ay.unlock === 'feisheng' && chain.ay.next === 'heifeng', '安远城 unlock=feisheng / next=heifeng', chain.ay);
ok(chain.hf.unlock === 'anyuan' && chain.hf.next === 'lianxu', '黑凤族 unlock=安远城 / next=炼虚关', chain.hf);
ok(chain.lx && chain.lx.unlock === 'heifeng', '炼虚关 unlock=黑凤族', chain.lx);
ok(chain.lx && chain.lx.endLevel === 150, '破境图 lianxu 的 endLevel=150（洞府突破可反查）', chain.lx);
ok(chain.lx && chain.lx.next === 'fengyuan', '炼虚关 next=风元大陆', chain.lx);
ok(chain.fy && chain.fy.next === 'guanghan', '风元大陆 next=广寒界', chain.fy);
ok(chain.gh && chain.gh.unlock === 'fengyuan' && chain.gh.next === 'heti_guan', '广寒界 unlock=风元 / next=合体关', chain.gh);
ok(chain.hg && chain.hg.unlock === 'guanghan', '合体关 unlock=广寒界', chain.hg);
ok(chain.hg && chain.hg.endLevel === 200, '破境图 heti_guan 的 endLevel=200（洞府突破可反查）', chain.hg);

// V10–V12 链
const LINKS = [
  ['heti_guan', 'shengdao', 200], ['shengdao', 'mojie', null], ['mojie', 'yitian', null],
  ['yitian', 'huangquan', null], ['huangquan', 'xiaoling', null], ['xiaoling', 'sanjie', null],
  ['sanjie', 'jiujie', 260], ['jiujie', 'zhenxian', 330], ['zhenxian', 'xianjie', 420]
];
for (const [from, to, endLv] of LINKS) {
  ok(chain[from] && chain[from].next === to, `${from} next=${to}`, chain[from]);
  if (endLv) ok(chain[from].endLevel === endLv, `破境图 ${from} endLevel=${endLv}`, chain[from]);
}
ok(chain.xianjie && chain.xianjie.next === null, '飞升仙界为终点（next=null）', chain.xianjie);

// ---- 2) 炼虚突破关 ----
const b150 = await page.evaluate(() => {
  const b = (window.BREAKTHROUGH || []).find(x => x.lv === 150);
  return b ? { realm: b.realm, items: b.items, story: b.story, stones: b.stones } : null;
});
ok(!!b150, 'BREAKTHROUGH 含 lv150', b150);
ok(b150 && b150.realm === '炼虚初期', 'lv150 = 炼虚初期', b150 && b150.realm);
ok(b150 && b150.items && b150.items[0] && b150.items[0][0] === 'tenglong', '炼虚关需要腾龙丹', b150 && b150.items);
ok(b150 && b150.story && b150.story[0] && b150.story[0].id === 'heifeng', '炼虚关需已通黑凤族', b150 && b150.story);

const b200 = await page.evaluate(() => {
  const b = (window.BREAKTHROUGH || []).find(x => x.lv === 200);
  return b ? { realm: b.realm, items: b.items, mats: b.mats, story: b.story, stones: b.stones } : null;
});
ok(!!b200, 'BREAKTHROUGH 含 lv200', b200);
ok(b200 && b200.realm === '合体初期', 'lv200 = 合体初期', b200 && b200.realm);
ok(b200 && b200.items && b200.items[0] && b200.items[0][0] === 'heti', '合体关需要合体丹', b200 && b200.items);
ok(b200 && b200.mats && b200.mats[0] && b200.mats[0][0] === 'm_zhenlingxue', '合体关需要真灵之血', b200 && b200.mats);
ok(b200 && b200.story && b200.story[0] && b200.story[0].id === 'guanghan', '合体关需已通广寒界', b200 && b200.story);

const high = await page.evaluate(() => [260, 330, 420].map(lv => {
  const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv);
  return b ? { lv, realm: b.realm, mats: b.mats, story: b.story, stones: b.stones } : null;
}));
ok(high.every(Boolean), 'BREAKTHROUGH 含 260 / 330 / 420', high);
ok(high[0] && high[0].realm === '大乘期', 'lv260 = 大乘期', high[0]);
ok(high[1] && high[1].realm === '渡劫期', 'lv330 = 渡劫期', high[1]);
ok(high[2] && high[2].realm === '真仙', 'lv420 = 真仙', high[2]);
ok(high[0] && high[0].mats.some(m => m[0] === 'm_xuantianteng') && high[0].mats.some(m => m[0] === 'm_zhenlingxue'), '大乘关需玄天仙藤 + 真灵之血', high[0]);
ok(high[0] && high[0].story[0].id === 'xiaoling', '大乘关需已通小灵天', high[0]);
ok(high[1] && high[1].story[0].id === 'sanjie', '渡劫关需已通三劫', high[1]);
ok(high[2] && high[2].story[0].id === 'jiujie', '真仙关需已通九劫', high[2]);
ok(await page.evaluate(() => (window.BREAKTHROUGH || []).some(x => x.lv === 260) &&
  !(window.BREAKTHROUGH || []).some(x => ['dachengdan', 'dujiedan', 'lianxudan'].includes(x.items && x.items[0] && x.items[0][0]))),
  '无自造丹（大乘丹/渡劫丹/炼虚丹）');

// ---- 3) 原著灵物 ----
const its = await page.evaluate(() => ['tenglong', 'm_zhenlingxue', 'm_zhenlinglin', 'heti', 't_xuantianjian']
  .map(id => ({ id, ok: !!(window.ALL_ITEMS || []).find(x => x.id === id) })));
ok(its.every(x => x.ok), '原著灵物已入库（腾龙丹/真灵之血/真灵鳞片/合体丹/玄天斩灵剑）', its);

// ---- 4) 「备齐」判定 ----
await run(`F.clearProgress();F.setLevel(149);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',1);F.setStones(20000);`);
ok(await page.evaluate(() => window.__FR.breakCan(150)) === true, '修为149 + 腾龙丹 + 已通黑凤族 → breakCan(150)=true');

await run(`F.clearProgress();F.setLevel(149);F.clearMap('heifeng');F.setStones(20000);`);
ok(await page.evaluate(() => window.__FR.breakCan(150)) === false, '缺腾龙丹 → breakCan(150)=false');

await run(`F.clearProgress();F.setLevel(149);F.addItem('tenglong',1);F.setStones(20000);`);
ok(await page.evaluate(() => window.__FR.breakCan(150)) === false, '未通黑凤族 → breakCan(150)=false');

await run(`F.clearProgress();F.setLevel(140);F.clearMap('heifeng');F.addItem('tenglong',1);F.setStones(20000);`);
ok(await page.evaluate(() => window.__FR.breakCan(150)) === false, '修为未到化神后期(149) → breakCan(150)=false');

// ---- 4b) 合体关（200）备齐判定 ----
await run(`F.clearProgress();F.setLevel(199);F.god(true);F.clearMap('guanghan');F.addItem('heti',1);F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
ok(await page.evaluate(() => window.__FR.breakCan(200)) === true, '修为199 + 合体丹 + 真灵之血×2 + 已通广寒界 → breakCan(200)=true');

await run(`F.clearProgress();F.setLevel(199);F.clearMap('guanghan');F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
ok(await page.evaluate(() => window.__FR.breakCan(200)) === false, '缺合体丹 → breakCan(200)=false');

await run(`F.clearProgress();F.setLevel(199);F.addItem('heti',1);F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
ok(await page.evaluate(() => window.__FR.breakCan(200)) === false, '未通广寒界 → breakCan(200)=false');

await run(`F.clearProgress();F.setLevel(190);F.clearMap('guanghan');F.addItem('heti',1);F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
ok(await page.evaluate(() => window.__FR.breakCan(200)) === false, '修为未到炼虚后期(199) → breakCan(200)=false');

// ---- 4c) 260 / 330 / 420 备齐判定 ----
await run(`F.clearProgress();F.setLevel(259);F.god(true);F.clearMap('xiaoling');F.addItem('m_xuantianteng',1);F.addItem('m_zhenlingxue',3);F.setStones(65000);`);
ok(await page.evaluate(() => window.__FR.breakCan(260)) === true, '260 备齐（仙藤+真灵血+通小灵天）→ true');
await run(`F.clearProgress();F.setLevel(259);F.clearMap('xiaoling');F.addItem('m_zhenlingxue',3);F.setStones(65000);`);
ok(await page.evaluate(() => window.__FR.breakCan(260)) === false, '260 缺玄天仙藤 → false');

await run(`F.clearProgress();F.setLevel(329);F.god(true);F.clearMap('sanjie');F.addItem('m_xuantianteng',2);F.addItem('m_zhenlingxue',4);F.setStones(110000);`);
ok(await page.evaluate(() => window.__FR.breakCan(330)) === true, '330 备齐（仙藤×2+真灵血×4+通三劫）→ true');
await run(`F.clearProgress();F.setLevel(329);F.addItem('m_xuantianteng',2);F.addItem('m_zhenlingxue',4);F.setStones(110000);`);
ok(await page.evaluate(() => window.__FR.breakCan(330)) === false, '330 未通三劫 → false');

await run(`F.clearProgress();F.setLevel(419);F.god(true);F.clearMap('jiujie');F.addItem('m_xuantianteng',3);F.addItem('m_zhenlingxue',5);F.setStones(190000);`);
ok(await page.evaluate(() => window.__FR.breakCan(420)) === true, '420 备齐（仙藤×3+真灵血×5+通九劫）→ true');
await run(`F.clearProgress();F.setLevel(419);F.addItem('m_xuantianteng',3);F.addItem('m_zhenlingxue',5);F.setStones(190000);`);
ok(await page.evaluate(() => window.__FR.breakCan(420)) === false, '420 未通九劫 → false');

// ---- 5) 地图可进入 ----
await run(`F.clearProgress();F.setLevel(132);F.god(true);F.enterMap('anyuan');`);
await page.waitForTimeout(300);
const i1 = await page.evaluate(() => window.__FR.info());
ok(i1.mapId === 'anyuan', '可进入安远城', i1.mapId);
ok(i1.state === 'dialog', '安远城开场对白已播', i1.state);

await run(`F.clearProgress();F.setLevel(132);F.god(true);F.enterMap('heifeng');`);
await page.waitForTimeout(300);
const i2 = await page.evaluate(() => window.__FR.info());
ok(i2.mapId === 'heifeng', '可进入黑凤族领地', i2.mapId);
ok(i2.state === 'dialog', '黑凤族开场对白已播', i2.state);

await run(`F.clearProgress();F.setLevel(149);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',1);F.setStones(20000);F.enterMap('lianxu');`);
await page.waitForTimeout(300);
const i3 = await page.evaluate(() => window.__FR.info());
ok(i3.mapId === 'lianxu', '可进入炼虚破境图', i3.mapId);
ok(i3.state === 'dialog', '炼虚关开场对白已播', i3.state);

for (const mid of ['fengyuan', 'guanghan', 'heti_guan',
  'shengdao', 'mojie', 'yitian', 'huangquan', 'xiaoling', 'sanjie', 'jiujie', 'zhenxian', 'xianjie']) {
  await run(`F.clearProgress();F.setLevel(419);F.god(true);F.enterMap('${mid}');`);
  await page.waitForTimeout(200);
  const im = await page.evaluate(() => window.__FR.info());
  ok(im.mapId === mid, '可进入 ' + mid, im.mapId);
}

// ---- 6) 洞府冲关入口 + 真实突破 ----
await run(`F.clearProgress();F.setLevel(149);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',1);F.setStones(20000);`);
const st = await page.evaluate(() => window.__FR.startBreak(150));
ok(st && st.map === 'lianxu', '洞府「突破」入口反查到炼虚关（lianxu）', st);

await run(`F.clearProgress();F.setLevel(149);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',3);F.setStones(20000);`);
const br = await page.evaluate(() => window.__FR.breakNow(150));
ok(br && br.cult === 150, 'breakNow(150) 成功推进到炼虚（cultivate=150）', br);

await run(`F.clearProgress();F.setLevel(199);F.god(true);F.clearMap('guanghan');F.addItem('heti',1);F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
const st2 = await page.evaluate(() => window.__FR.startBreak(200));
ok(st2 && st2.map === 'heti_guan', '洞府「突破」入口反查到合体关（heti_guan）', st2);

await run(`F.clearProgress();F.setLevel(199);F.god(true);F.clearMap('guanghan');F.addItem('heti',3);F.addItem('m_zhenlingxue',2);F.setStones(35000);`);
const br2 = await page.evaluate(() => window.__FR.breakNow(200));
ok(br2 && br2.cult === 200, 'breakNow(200) 成功推进到合体（cultivate=200）', br2);

const HIGH = [
  { lv: 260, map: 'sanjie', lvBefore: 259, story: 'xiaoling', teng: 1, xue: 3, stones: 65000 },
  { lv: 330, map: 'jiujie', lvBefore: 329, story: 'sanjie', teng: 2, xue: 4, stones: 110000 },
  { lv: 420, map: 'zhenxian', lvBefore: 419, story: 'jiujie', teng: 3, xue: 5, stones: 190000 }
];
for (const h of HIGH) {
  await run(`F.clearProgress();F.setLevel(${h.lvBefore});F.god(true);F.clearMap('${h.story}');F.addItem('m_xuantianteng',${h.teng});F.addItem('m_zhenlingxue',${h.xue});F.setStones(${h.stones});`);
  const stH = await page.evaluate((lv) => window.__FR.startBreak(lv), h.lv);
  ok(stH && stH.map === h.map, `startBreak(${h.lv}) → ${h.map}`, stH);

  await run(`F.clearProgress();F.setLevel(${h.lvBefore});F.god(true);F.clearMap('${h.story}');F.addItem('m_xuantianteng',${h.teng});F.addItem('m_zhenlingxue',${h.xue});F.setStones(${h.stones});`);
  const brH = await page.evaluate((lv) => window.__FR.breakNow(lv), h.lv);
  ok(brH && brH.cult === h.lv, `breakNow(${h.lv}) 推进到 ${h.lv}`, brH);
}

ok(errors.length === 0, '页面无 JS 报错', errors);

console.log('\n  结果:', pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
