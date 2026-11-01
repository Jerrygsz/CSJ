// 截图：修行图「灵界·初入」按原著重排后的 11 图，以及两段剧情实拍
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9044;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);

// 打到「广寒界已通、元合岛合体待冲」这一段：初入灵界全了，百族 5/6
await page.evaluate(() => {
  const F = window.__FR;
  F.unlockAll(); F.setLevel(180); F.setStones(1392449);
  ['qinluo', 'anyuan', 'luori', 'shanku', 'tianyuan', 'lingdi', 'muzu', 'zhenchan', 'tianpeng', 'minghe', 'lianxu',
    'fengyuan', 'huohu', 'shisan', 'mojin', 'guanghan'].forEach(id => F.clearMap(id));
});
await page.waitForTimeout(300);
await page.click('#startBtn');
await page.waitForTimeout(700);
await page.evaluate(() => {
  const list = document.getElementById('wmList');
  const sec = Array.from(list.querySelectorAll('.wm-sec')).find(el => /灵界·初入/.test(el.textContent));
  if (sec) sec.scrollIntoView({ block: 'start' });
  const panel = document.querySelector('#worldmap .wm-panel') || list;
  if (panel) panel.scrollTop = Math.max(0, (sec ? sec.offsetTop - 70 : 0));
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(root, 'qa', 'shot-arc1.png') });

// 安远城·兽潮（剧情实拍）
await page.evaluate(() => {
  const F = window.__FR;
  F.G.state = 'title'; F.setLevel(150); F.god(true); F.enterMap('anyuan');
});
await page.waitForTimeout(500);
await page.waitForTimeout(300);
await page.screenshot({ path: join(root, 'qa', 'shot-anyuan-story.png') });

// 木族领地·芝龙果（Boss 前开场）
await page.evaluate(() => {
  const F = window.__FR;
  F.G.state = 'title'; F.setLevel(150); F.god(true); F.enterMap('muzu');
});
await page.waitForTimeout(500);
await page.waitForTimeout(300);
await page.screenshot({ path: join(root, 'qa', 'shot-muzu-story.png') });

await browser.close(); server.close();
console.log('shot done');
