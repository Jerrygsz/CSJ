import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8997;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

async function setup(opts) {
  await page.evaluate((o) => {
    const F = window.__FR;
    F.clearProgress();
    F.setLevel(o.level);
    F.setStones(o.stones);
    F.addItem('tenglong', o.tenglong);
    if (o.heifeng) F.clearMap('minghe');   // 黑凤族领地通关
    F.cave('tycave');                         // 开洞府（同时把 tycave 加入存档）
    F.caveTab('break');                       // 切到「进阶」tab
  }, opts);
}

async function caveHtml() {
  await page.waitForTimeout(150);
  return await page.evaluate(() => {
    const secs = [...document.querySelectorAll('.cave-sec2, .cs-title, .brk-row, .cs-note')];
    return secs.map(e => e.textContent.trim()).join(' || ');
  });
}

async function mapReport() {
  await page.evaluate(() => { window.__FR.enterMap('lianxu'); });
  await page.waitForTimeout(1800);
  const banner = await page.evaluate(() => window.__FR.lastBanner());
  const dlg = await page.evaluate(() => {
    const d = document.querySelector('#dialog, .dialog');
    return d ? d.textContent.replace(/\s+/g, ' ').slice(0, 200) : null;
  });
  const state = await page.evaluate(() => window.__FR.info().state);
  return { banner, dlg, state };
}

async function gate150() {
  return await page.evaluate(() => {
    const g = (window.BREAKTHROUGH || []).find(x => x.lv === 150);
    if (!g) return 'no gate 150';
    return { realm: g.realm, from: g.from, items: g.items, mats: g.mats, stones: g.stones, story: g.story };
  });
}

console.log('=== Scenario A: 化神后期圆满 149 + 腾龙丹1 + 灵石20000 + 黑凤族通关 ===');
await setup({ level: 149, stones: 20000, tenglong: 1, heifeng: true });
console.log('gate lv150 =', JSON.stringify(await gate150()));
console.log('CAVE =', await caveHtml());
const a = await mapReport();
console.log('MAP banner =', JSON.stringify(a.banner), '| state =', a.state);
console.log('MAP dialog =', JSON.stringify(a.dlg));

console.log('\n=== Scenario B: 同上但缺腾龙丹（tenglong=0）===');
await setup({ level: 149, stones: 20000, tenglong: 0, heifeng: true });
console.log('CAVE =', await caveHtml());
const b = await mapReport();
console.log('MAP banner =', JSON.stringify(b.banner), '| state =', b.state);

console.log('\n=== Scenario C: 同上但缺冥河通关（heifeng=false）===');
await setup({ level: 149, stones: 20000, tenglong: 1, heifeng: false });
console.log('CAVE =', await caveHtml());
const c = await mapReport();
console.log('MAP banner =', JSON.stringify(c.banner), '| state =', c.state);

console.log('\nerrors:', errors);
await browser.close();
server.close();
