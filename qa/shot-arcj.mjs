// 截图：修行图「灵界·百族」段（炼虚 → 合体）按原著排布后的样子
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9041;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);
await page.evaluate(() => {
  const F = window.__FR;
  F.unlockAll(); F.setLevel(180); F.setStones(1392449);
  // 打到广寒界通关、元合岛合体关待冲关 —— 与玩家的实际进度一致
  ['qinluo', 'anyuan', 'luori', 'shanku', 'tianyuan', 'lingdi', 'muzu', 'zhenchan', 'tianpeng', 'minghe', 'lianxu',
    'fengyuan', 'huohu', 'shisan', 'mojin', 'guanghan'].forEach(id => F.clearMap(id));
});
await page.waitForTimeout(300);
await page.click('#startBtn');
await page.waitForTimeout(600);
await page.evaluate(() => {
  const list = document.getElementById('wmList');
  const arc = Array.from(list.querySelectorAll('*')).find(el => /灵界·百族/.test(el.textContent) && el.children.length <= 3);
  (arc || list).scrollIntoView({ block: 'start' });
  window.scrollTo(0, 0);
  const panel = document.querySelector('#worldmap .wm-panel');
  if (panel) panel.scrollTop = 0;
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(root, 'qa', 'shot-arcj.png') });

// 黑隐山脈开场（玄天之争）对白
await page.evaluate(() => {
  const F = window.__FR;
  F.G.state = 'title'; F.setLevel(180); F.god(true); F.unlockAll();
  F.enterMap('fengyuan');
});
await page.waitForTimeout(500);
for (let k = 0; k < 4; k++) { await page.evaluate(() => window.__FR.skipStory()); await page.waitForTimeout(120); }
await page.screenshot({ path: join(root, 'qa', 'shot-heiyin-story.png') });
await browser.close(); server.close();
console.log('shot done');
