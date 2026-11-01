// 截图：灵界 V10「魔劫」段（合体 → 大乘）按原著重排后的样子
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9045;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);

// ① 修行图：天渊城来客……镇魔锁已了，停在倚天城（城破那一战）
await page.evaluate(() => {
  const F = window.__FR;
  F.unlockAll(); F.setLevel(225); F.setStones(2680000);
  ['qinluo', 'anyuan', 'luori', 'shanku', 'tianyuan', 'lingdi', 'muzu', 'zhenchan', 'tianpeng', 'minghe', 'lianxu',
    'fengyuan', 'huohu', 'shisan', 'mojin', 'guanghan', 'heti_guan',
    'liangzu', 'jiuxian', 'heiyu', 'longjia', 'shengdao', 'zhenling', 'mojie', 'diyuan2', 'moban', 'huangquan'
  ].forEach(id => { try { F.clearMap(id); } catch (e) {} });
});
await page.waitForTimeout(300);
await page.click('#startBtn');
await page.waitForTimeout(600);
await page.evaluate(() => {
  const list = document.getElementById('wmList');
  const arc = Array.from(list.querySelectorAll('*')).find(el => /灵界·魔劫/.test(el.textContent) && el.children.length <= 3);
  (arc || list).scrollIntoView({ block: 'start' });
  const panel = document.querySelector('#worldmap .wm-panel');
  if (panel && arc) panel.scrollTop = arc.offsetTop - 40;
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(root, 'qa', 'shot-arcK-board.png') });

// ② 苦灵岛：三方对峙换三日洗灵池
await page.evaluate(() => {
  const F = window.__FR;
  F.G.state = 'title'; F.setLevel(230); F.god(true); F.unlockAll();
  F.enterMap('modajie');
});
await page.waitForTimeout(600);
await page.screenshot({ path: join(root, 'qa', 'shot-arcK-kulingdao.png') });
for (let k = 0; k < 6; k++) { await page.evaluate(() => window.__FR.skipStory()); await page.waitForTimeout(100); }
await page.screenshot({ path: join(root, 'qa', 'shot-arcK-kulingdao-2.png') });

// ③ 倚天城：城破
await page.evaluate(() => {
  const F = window.__FR;
  F.G.state = 'title'; F.setLevel(225); F.god(true); F.unlockAll();
  F.enterMap('yitian');
});
await page.waitForTimeout(600);
for (let k = 0; k < 4; k++) { await page.evaluate(() => window.__FR.skipStory()); await page.waitForTimeout(100); }
await page.screenshot({ path: join(root, 'qa', 'shot-arcK-yitian.png') });

await browser.close(); server.close();
console.log('shot done');
