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
const maps = await page.evaluate(() => window.MAPS.filter(m => ['anyuan', 'heifeng', 'lianxu'].includes(m.id))
  .map(m => ({ id: m.id, type: m.type, unlock: m.unlock, next: m.next, startLevel: m.startLevel, endLevel: m.endLevel })));
ok(maps.length === 3, '灵界三张图已注册（anyuan / heifeng / lianxu）', maps);
const chain = await page.evaluate(() => {
  const g = id => window.MAPS.find(m => m.id === id) || {};
  return { fs: g('feisheng').next, ay: g('anyuan'), hf: g('heifeng'), lx: g('lianxu') };
});
ok(chain.fs === 'anyuan', '飞升图 next 已接安远城', chain.fs);
ok(chain.ay.unlock === 'feisheng' && chain.ay.next === 'heifeng', '安远城 unlock=feisheng / next=heifeng', chain.ay);
ok(chain.hf.unlock === 'anyuan' && chain.hf.next === 'lianxu', '黑凤族 unlock=安远城 / next=炼虚关', chain.hf);
ok(chain.lx && chain.lx.unlock === 'heifeng', '炼虚关 unlock=黑凤族', chain.lx);
ok(chain.lx && chain.lx.endLevel === 150, '破境图 lianxu 的 endLevel=150（洞府突破可反查）', chain.lx);

// ---- 2) 炼虚突破关 ----
const b150 = await page.evaluate(() => {
  const b = (window.BREAKTHROUGH || []).find(x => x.lv === 150);
  return b ? { realm: b.realm, items: b.items, story: b.story, stones: b.stones } : null;
});
ok(!!b150, 'BREAKTHROUGH 含 lv150', b150);
ok(b150 && b150.realm === '炼虚初期', 'lv150 = 炼虚初期', b150 && b150.realm);
ok(b150 && b150.items && b150.items[0] && b150.items[0][0] === 'tenglong', '炼虚关需要腾龙丹', b150 && b150.items);
ok(b150 && b150.story && b150.story[0] && b150.story[0].id === 'heifeng', '炼虚关需已通黑凤族', b150 && b150.story);

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

// ---- 6) 洞府冲关入口 + 真实突破 ----
await run(`F.clearProgress();F.setLevel(149);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',1);F.setStones(20000);`);
const st = await page.evaluate(() => window.__FR.startBreak(150));
ok(st && st.map === 'lianxu', '洞府「突破」入口反查到炼虚关（lianxu）', st);

await run(`F.clearProgress();F.setLevel(149);F.god(true);F.clearMap('heifeng');F.addItem('tenglong',3);F.setStones(20000);`);
const br = await page.evaluate(() => window.__FR.breakNow(150));
ok(br && br.cult === 150, 'breakNow(150) 成功推进到炼虚（cultivate=150）', br);

ok(errors.length === 0, '页面无 JS 报错', errors);

console.log('\n  结果:', pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
