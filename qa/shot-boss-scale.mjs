// 首领战实拍：查「精灵进战斗以后」的比例与落地。
// 图鉴只能证明画得对，证明不了放进战斗里会不会悬空、被屏幕裁掉、或大得离谱。
//
// 用法：改下面 cases 里的 [地图 id, 名字（只用于日志）, 皮肤]，然后
//   node qa/shot-boss-scale.mjs
// 注意：带大招特效的首领（如古或今·混沌之身）会被弹幕糊住，看不出精灵 ——
// 这类换一张同量级、无强特效的图看比例即可，精灵本身由图鉴保证。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
import http from 'node:http';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(9135, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:9135/index.html?test=1&t=' + Date.now());
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

const cases = [
  ['yelang', '金光上人', 'jin'],
  ['yelang', '金光上人', 'guigu'],
];
let i = 0;
for (const [mapId, who, skin] of cases) {
  i++;
  await page.evaluate(({ mapId, skin }) => {
    window.__FR.skin(skin);
    window.__FR.enterMap(mapId);
    
  }, { mapId, skin });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    try { window.__FR.skipStory(); } catch (e) {}
    try { window.__FR.muteStory(true); } catch (e) {}
    const d = document.getElementById('dialog');
    if (d) d.style.display = 'none';
    document.querySelectorAll('.overlay').forEach(e => { if (e.id !== 'dialog') e.style.display = 'none'; });
  });
  await page.waitForTimeout(2600);
  const meta = await page.evaluate(() => {
    const b = window.__FR.info().boss;
    const id = window.__FR.bossId();
    return { b, m: id ? window.__FR.enemyMeta(id) : null, v: window.__FR.view() };
  });
  console.log('  meta', JSON.stringify(meta.b), JSON.stringify(meta.m));
  const out = join(root, 'qa/shot-boss-xj' + i + '-' + skin + '.png');
  await page.screenshot({ path: out });
  console.log(out);
}
await browser.close();
server.close();
