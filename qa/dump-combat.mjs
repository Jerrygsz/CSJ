// 导出 late2 / xianjie 战斗图的敌人配比 + 当前同图相对硬度(开方)的离散度
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9101;
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
const page = await b.newPage();
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
const rows = await page.evaluate(() => {
  const seen = new Set(); const out = [];
  for (const m of window.MAPS) {
    if (seen.has(m.id)) continue; seen.add(m.id);
    if (m.type !== 'combat') continue;
    const lv = m.startLevel || 1;
    if (lv < 80) continue; // 只看后期（late2 / xianjie）
    const E = m.enemies || [];
    if (!E.length) continue;
    const hps = E.map(t => (window.ENEMY_TYPES[t] || {}).hp || 0);
    const avg = hps.reduce((a, c) => a + c, 0) / hps.length;
    const rels = hps.map(h => Math.pow(h / avg, 0.5));
    out.push({ id: m.id, lv, enemies: E, rels: rels.map(r => +r.toFixed(2)), spread: +(Math.max(...rels) / Math.min(...rels)).toFixed(2), names: E.map(t => (window.ENEMY_TYPES[t] || {}).name || t) });
  }
  return out.sort((a, c) => a.lv - c.lv);
});
for (const r of rows) {
  console.log(`lv${String(r.lv).padStart(3)} ${r.id.padEnd(12)} spread×${r.spread}  [${r.names.map((n, i) => n + ':' + r.rels[i]).join(', ')}]`);
}
await b.close(); server.close();
