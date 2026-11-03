// 验证 zhuimo/xiaoji/xisha 修复：小怪刷得出、Boss 到点登场、本局能打完
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9098;
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
  page.on('pageerror', e => console.log(`  [pageerror] ${e.message}`));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  const r = await page.evaluate((id) => {
    const F = window.__FR, G = F.G;
    const m = window.MAPS.find(x => x.id === id);
    F.clearProgress(); F.setLevel(m.startLevel || 1); F.muteStory(true);
    F.enterMap(id, 'easy');
    for (let i = 0; i < 30 && G.state === 'dialog'; i++) F.skipStory();
    const cap = window.skillSlots ? window.skillSlots(m.startLevel || 1) : 1;
    const starts = Object.entries(m.startSkills || {}).sort((a, c) => c[1] - a[1]);
    const sk = {}; for (const [s, L] of starts.slice(0, cap)) sk[s] = L;
    if (Object.keys(sk).length) G.player.skills = sk;
    G.player.next = 1e12;
    let peak = 0, kills = 0, frames = 0, t = 0, bossSeen = false, dead = false, dur = 0;
    const CAP = 6000;
    while (t < CAP) {
      const st = G.state;
      if (st === 'levelup') { F.insightAuto ? F.insightAuto() : (G.state = 'play'); continue; }
      if (st === 'pause') { F.resume(); continue; }
      if (st === 'dialog') { F.skipStory(); continue; }
      if (st === 'gameover' || st === 'down') { dead = true; break; }
      if (!G.boss) {
        let near = null, nd = 1e9;
        for (const e of G.enemies) { const d = Math.hypot(e.x - G.player.x, e.y - G.player.y); if (d < nd) { nd = d; near = e; } }
        if (near && nd > 220) { const a = Math.atan2(near.y - G.player.y, near.x - G.player.x); G.player.x += Math.cos(a) * 90 * 0.05; G.player.y += Math.sin(a) * 90 * 0.05; }
        if (F.dash && (G.dashCd || 0) <= 0 && G.player.hp < G.player.maxhp * 0.7) { let c = 0; for (const e of G.enemies) if (Math.hypot(e.x - G.player.x, e.y - G.player.y) < 110) c++; if (c >= 3) F.dash(); }
      }
      F.tickFrames(1, 0.05); frames++; t += 0.05; dur = t;
      if (!G.boss) peak = Math.max(peak, G.enemies.length);
      if (G.boss) bossSeen = true;
      if (bossSeen && !G.boss) break;
    }
    return { id, lv: m.startLevel, bossAt: m.bossAt, peak, kills: G.kills, dur: +dur.toFixed(1), dead, bossKilled: bossSeen ? !G.boss : false, alive: !dead };
  }, id);
  console.log(`${String(r.lv).padStart(4)} ${r.id.padEnd(9)} 峰值${String(r.peak).padStart(3)}只  击杀${String(r.kills).padStart(4)}  ${String(r.dur).padStart(5)}s  ${r.dead ? '阵亡' : '存活'}  Boss击杀=${r.bossKilled}`);
  await page.close();
}
await b.close(); server.close();
