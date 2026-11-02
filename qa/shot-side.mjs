// 截图支线图：五里沟(huixiang) 与 越国·京城皇宫(heisha) 进入后的对白/地图卡
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9081;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);

const shot = async (id, file) => {
  const res = await page.evaluate(async (id) => {
    const F = window.__FR;
    F.clearProgress(); F.setLevel(660); F.unlockAll();
    const mid = F.enterMap(id, 'easy');
    F.tickFrames(2);
    F.skipStory(); F.tickFrames(2);
    return F.info().mapId;
  }, id);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(here, file) });
  console.log(id, '→', res, 'shot', file);
};

await shot('huixiang', 'shot-side-huixiang.png');
await shot('heisha', 'shot-side-heisha.png');
await b.close(); server.close();
console.log('done');
