// Boss 名牌与顶栏不重叠 · 修仙感名牌 —— 窄屏（Jerry 手机同款比例）实测
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8996;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!fs.existsSync(f)) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });

// Jerry 手机：412×915 CSS 像素级别（截图 540 宽，同档窄屏）
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const r = await page.evaluate(() => {
  const F = window.__FR;
  F.unlockAll();
  F.god(true);
  F.enterMap('xuese', 'nightmare');
  return { state: F.info().state, lv: F.G.player ? F.G.player.level : -1 };
});
// 若开局带了「择一功法」弹层，点掉它（选第一项）
for (let i = 0; i < 6; i++) {
  const st = await page.evaluate(() => window.__FR.info().state);
  if (st === 'play') break;
  const opt = page.locator('#levelup button, #levelup .lu-item, #choice button').first();
  if (await opt.count()) await opt.click().catch(() => {});
  else await page.mouse.click(206, 458);
  await page.waitForTimeout(350);
}
// 把 Boss 摆上台（正常要打到触发线，验收不必等）：血量给到打不死，免得满级角色一秒把它扬了
const setBoss = (phase2) => page.evaluate((p2) => {
  const F = window.__FR;
  F.G.state = 'play';
  const b = F.G.boss;
  if (b) { b.phase2 = p2; b.hp = 9e9; b.maxhp = 9e9; return b.name; }
  F.G.boss = { _id: 99999, type: 'ranged', kind: 'ranged', name: '妙鹤真人', x: 240, y: 300,
    hp: 9e9, maxhp: 9e9, spd: 0, dmg: 0, r: 30, phase2: p2 };
  return F.G.boss.name;
}, phase2);
console.log('boss:', await setBoss(false));
await page.waitForTimeout(500);
console.log('boss after 500ms:', await setBoss(false));
const geo = await page.evaluate(() => {
  const tb = document.getElementById('topbar').getBoundingClientRect();
  const bw = document.getElementById('bosswrap').getBoundingClientRect();
  const mn = document.getElementById('mapName').getBoundingClientRect();
  return { topbarBottom: Math.round(tb.bottom), mapNameBottom: Math.round(mn.bottom), bossTop: Math.round(bw.top), bossName: document.getElementById('bossname').textContent, gap: Math.round(bw.top - Math.max(tb.bottom, mn.bottom)) };
});
await page.screenshot({ path: join(here, 'shot-bossbar.png') });

// 二阶段红光
await setBoss(true);
await page.waitForTimeout(400);
await page.screenshot({ path: join(here, 'shot-bossbar-p2.png') });

console.log(JSON.stringify({ ...r, ...geo, errors: errs }, null, 1));
await browser.close(); server.close();
