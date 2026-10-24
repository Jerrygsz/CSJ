import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9006;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 820 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
await page.evaluate(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(35);
  F.addItem('zhuji', 5);
  for (const id of ['m_yusuizhi', 'm_zihua', 'm_tianling']) F.addItem(id, 3);
  F.setStones(5000); F.clearMap('zhuji');
  F.cave('qixuan'); F.caveTab('break');
});
await page.waitForTimeout(300);
await page.screenshot({ path: join(here, 'shot-break-panel.png') });
await page.evaluate(() => { const btn = document.querySelector('button[data-breaknow="36"]'); if (btn) btn.click(); });
await page.waitForTimeout(400);
await page.screenshot({ path: join(here, 'shot-break-prefight.png') });
await b.close(); server.close();
console.log('done');
