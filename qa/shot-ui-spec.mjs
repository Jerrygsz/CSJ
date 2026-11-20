// 版式实拍：字号 / 间距收敛之后，看五个关键界面有没有被挤坏
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
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: Number(process.env.VW || 390), height: Number(process.env.VH || 844) }, deviceScaleFactor: 2 });
await page.goto('http://localhost:' + PORT + '/index.html');
await page.waitForTimeout(900);
fs.mkdirSync(join(here, 'shots'), { recursive: true });
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: join(here, 'shots', name + '-' + (process.env.VW || 390) + '.png') }); console.log('shot', name); };

await page.evaluate(() => { const F = window.__FR; F.clearProgress(); F.setLevel(60); F.unlockAll(); F.toTitle(); });
await shot('spec-title');
await page.evaluate(() => window.__FR.worldmap());
await shot('spec-worldmap');
await page.evaluate(() => { const F = window.__FR; F.closeAll && F.closeAll(); F.grant(99999); F.shop('buy'); });
await shot('spec-shop');
await page.evaluate(() => { const F = window.__FR; F.closeAll && F.closeAll(); F.addItem('a_lupi', 2); F.cave('qixuan'); F.caveTab('equip'); });
await shot('spec-cave');
await page.evaluate(() => { const F = window.__FR; F.closeAll && F.closeAll(); F.clearProgress(); F.setLevel(60); F.unlockAll(); F.muteStory(true); F.enterMap('zhuji'); for (let i = 0; i < 12; i++) { F.skipStory(); F.tickFrames(6, 0.05); } });
await shot('spec-fight');
await browser.close(); server.close();
