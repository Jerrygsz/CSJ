// 截图：修行图（世界地图）卡片上的篇章印记（P0-5），金皮 + 墨皮各一张。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9137;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.png':'image/png' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p==='/') p='/index.html'; const f = join(root,p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200,{ 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT,'127.0.0.1',r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport:{width:430,height:920}, deviceScaleFactor: 2 });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

console.log('step: goto');
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);
console.log('step: set save');
await page.evaluate(() => {
  const ids = window.MAPS.map(m => m.id);
  const dc = {}; for (const id of ids) dc[id] = { easy: true };
  const s = {};
  s.unlocked = ids; s.cleared = ids; s.caves = Object.keys(window.CAVES || {}); s.diffClear = dc;
  s.cultivate = { level: 200, xp: 0, skills: {} }; s.inventory = {}; s.stones = 50000;
  s.best = { level: 200, time: 0, kills: 0 };
  localStorage.setItem('fanren_save_v1', JSON.stringify(s));
});
await page.reload({ waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);
await page.waitForTimeout(300);
console.log('step: open worldmap');
await page.evaluate(() => window.__FR.worldmap());
await page.waitForTimeout(400);
console.log('step: ready');

// 金皮
await page.evaluate(() => { const p = document.querySelector('#worldmap .wm-panel'); if (p) p.scrollTop = 0; });
await page.waitForTimeout(200);
await page.screenshot({ path: join(root, 'qa', 'shot-worldmap-seal-jin.png') });

// 墨皮
await page.evaluate(() => { const el = document.getElementById('skinGuigu'); if (el) el.click(); });
await page.waitForTimeout(300);
await page.evaluate(() => { const p = document.querySelector('#worldmap .wm-panel'); if (p) p.scrollTop = 0; });
await page.waitForTimeout(200);
await page.screenshot({ path: join(root, 'qa', 'shot-worldmap-seal-guigu.png') });

console.log('pageerrors:', errs.length ? errs : 'none');
await b.close(); server.close(); process.exit(0);
