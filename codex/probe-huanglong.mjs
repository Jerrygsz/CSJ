// 一次性探针：第三批 huanglong 装饰数 72 超风格基线 decorMax=70。
// 在真实浏览器里试 composition.breath / clusters 组合，读实际 decorCount，
// 挑一个既 ≤70、又不把「黄龙山大战横带」削成空画面的组合。只探不改文件。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');   // fanren/
const PORT = 9093;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 480, height: 900 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
await page.evaluate(() => {
  const ids = window.MAPS.map(m => m.id); const dc = {}; for (const id of ids) dc[id] = { easy: true };
  localStorage.setItem('fanren_save_v1', JSON.stringify({ unlocked: ids, cleared: ids,
    caves: Object.keys(window.CAVES || {}), diffClear: dc,
    cultivate: { level: 200, xp: 0, skills: {} }, inventory: {}, stones: 50000,
    best: { level: 200, time: 0, kills: 0 } }));
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

await page.evaluate(() => {
  window.__FR.skin('guigu'); window.__FR.enterMap('huanglong');
  window.__FR.G.state = 'play';
});
await page.waitForTimeout(400);
console.log('BASE', JSON.stringify(await page.evaluate(() => {
  const g = window.__FR.G, s = window.__FR.scenery3();
  return { cam: { x: g.cam.x, y: g.cam.y }, H: document.getElementById('game').height,
           chunks: Object.keys(g.chunkMap || {}).length, decor: s.decorCount,
           nn: s.decorNN, kinds: Object.keys(s.decorKinds) };
})));

for (const breath of [2, 3]) for (const clusters of [1, 2, 3]) {
  await page.evaluate(([b, c]) => {
    const co = window.MAP_CODEX.huanglong.composition;
    co.breath = b; co.clusters = c;
    const g = window.__FR.G;
    window.__FR.scenery3Enable(false); window.__FR.scenery3Enable(true);
    g.decor.length = 0; g.chunkMap = {};
  }, [breath, clusters]);
  await page.waitForTimeout(220);   // 让真实帧循环跑 ensureDecor()，renderOnce 不会触发它
  const r = await page.evaluate(() => {
    const s = window.__FR.scenery3();
    return { decorCount: s.decorCount, nn: s.decorNN, kinds: Object.keys(s.decorKinds) };
  });
  console.log('breath=' + breath, 'clusters=' + clusters, JSON.stringify(r));
}
await browser.close(); server.close();
