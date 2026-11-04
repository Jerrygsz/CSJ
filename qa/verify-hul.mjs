// 验证 hulMap 生效：进图各刷一只，读真实 maxhp，算同图相对硬度与离散度
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9102;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 820 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

for (const id of ['zhuimo', 'xiaoji', 'xisha']) {
  const r = await page.evaluate((id) => {
    const F = window.__FR, G = F.G;
    const m = window.MAPS.find(x => x.id === id);
    F.clearProgress(); F.setLevel(m.startLevel || 1); F.muteStory(true);
    F.enterMap(id, 'easy');
    for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
    G.state = 'play';
    F.clear();
    const E = m.enemies || [];
    for (const t of E) F.spawn(t, 1);
    G.enemies.forEach(e => { e.spd = 0; });
    const got = G.enemies.map(e => ({ t: e.type, name: (window.ENEMY_TYPES[e.type] || {}).name, hp: Math.round(e.maxhp) }));
    const avg = got.reduce((a, c) => a + c.hp, 0) / got.length;
    const rels = got.map(o => +(o.hp / avg).toFixed(2));
    return { id, got: got.map((o, i) => `${o.name}:${rels[i]}`), spread: +(Math.max(...rels) / Math.min(...rels)).toFixed(2), hasHulMap: !!m.hulMap };
  }, id);
  console.log(`${r.id.padEnd(8)} hulMap=${r.hasHulMap}  同图相对硬度 ${r.got.join(', ')}   离散度×${r.spread}`);
}
await b.close(); server.close();
