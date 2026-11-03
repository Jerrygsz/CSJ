// 聚焦复现：zhuimo / xiaoji / xisha 为何 peak=0
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9097;
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

const TARGETS = ['zhuimo', 'xiaoji', 'xisha'];
for (const id of TARGETS) {
  const page = await b.newPage({ viewport: { width: 420, height: 820 } });
  page.on('console', m => { if (m.type() === 'error') console.log(`  [console.error] ${m.text()}`); });
  page.on('pageerror', e => console.log(`  [pageerror] ${e.message}`));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  const out = await page.evaluate((id) => {
    const F = window.__FR, G = F.G;
    const m = window.MAPS.find(x => x.id === id);
    F.clearProgress(); F.setLevel(m.startLevel || 1); F.muteStory(true);
    F.enterMap(id, 'easy');
    for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
    const cap = window.skillSlots ? window.skillSlots(m.startLevel || 1) : 1;
    const starts = Object.entries(m.startSkills || {}).sort((a, b) => b[1] - a[1]);
    const sk = {};
    for (const [sid, L] of starts.slice(0, cap)) sk[sid] = L;
    if (Object.keys(sk).length) { G.player.skills = sk; }
    G.player.next = 1e12;
    const log = [];
    for (let i = 0; i < 200 && G.state === 'play'; i++) {
      if (i % 20 === 0) log.push({ f: i, t: +G.time.toFixed(1), spawnT: +G.spawnT.toFixed(2), en: G.enemies.length, bossS: G.bossSpawned, bossA: G.bossActive, vac: +G.vacuumT.toFixed(2), st: G.state });
      F.tickFrames(1, 0.05);
    }
    const types = {}; for (const e of G.enemies) types[e.type] = (types[e.type] || 0) + 1;
    return { id, startLevel: m.startLevel, mapType: m.type, enemies: m.enemies, hasBoss: !!m.boss, bossAt: m.bossAt, peakType: types, finalEnemies: G.enemies.length, log, state: G.state, bossSpawned: G.bossSpawned, time: +G.time.toFixed(1) };
  }, id);
  console.log(`\n=== ${id} (startLevel ${out.startLevel}, type ${out.mapType}, bossAt ${out.bossAt}, hasBoss ${out.hasBoss}) ===`);
  console.log('map.enemies =', JSON.stringify(out.enemies));
  console.log('spawnT/enemies trace:');
  for (const l of out.log) console.log('  ', JSON.stringify(l));
  console.log('final: state', out.state, 'time', out.time, 'bossSpawned', out.bossSpawned, 'enemiesNow', out.finalEnemies, 'peakTypes', JSON.stringify(out.peakType));
  await page.close();
}
await b.close(); server.close();
