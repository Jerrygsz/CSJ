// 首关 houshan 死亡成因探针：逐段记录 血量/敌人/是否Boss
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9099;
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

for (let run = 0; run < 8; run++) {
  const page = await b.newPage({ viewport: { width: 420, height: 820 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  const out = await page.evaluate(() => {
    const F = window.__FR, G = F.G;
    const m = window.MAPS.find(x => x.id === 'houshan');
    F.clearProgress(); F.setLevel(1); F.muteStory(true);
    F.enterMap('houshan', 'easy');
    for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
    const cap = window.skillSlots ? window.skillSlots(1) : 1;
    const sk = {}; const starts = Object.entries(m.startSkills || {}).sort((a, c) => c[1] - a[1]);
    for (const [s, L] of starts.slice(0, cap)) sk[s] = L; if (Object.keys(sk).length) G.player.skills = sk;
    G.player.next = 1e12;
    const p = G.player; const log = []; let t = 0, bossSeen = false, dead = false;
    let maxHp = p.maxhp;
    while (t < 200) {
      const st = G.state;
      if (st === 'levelup') { F.insightAuto ? F.insightAuto() : (G.state = 'play'); continue; }
      if (st === 'pause') { F.resume(); continue; }
      if (st === 'dialog') { F.skipStory(); continue; }
      if (st === 'gameover' || st === 'down') { dead = true; break; }
      if (!G.boss) {
        let near = null, nd = 1e9;
        for (const e of G.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < nd) { nd = d; near = e; } }
        if (near && nd > 220) { const a = Math.atan2(near.y - p.y, near.x - p.x); p.x += Math.cos(a) * 90 * 0.05; p.y += Math.sin(a) * 90 * 0.05; }
        if (F.dash && (G.dashCd || 0) <= 0 && p.hp < p.maxhp * 0.7) { let c = 0; for (const e of G.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < 110) c++; if (c >= 3) F.dash(); }
      }
      F.tickFrames(1, 0.05); t += 0.05;
      if (G.boss) bossSeen = true;
      if (Math.round(t * 20) % 100 === 0) log.push({ t: +t.toFixed(0), hp: Math.round(100 * p.hp / p.maxhp), en: G.enemies.length, boss: !!G.boss });
      if (bossSeen && !G.boss) break;
    }
    return { lv: p.level, maxHp: Math.round(maxHp), dead, dur: +t.toFixed(0), log, bossKilled: bossSeen ? !G.boss : false, kills: G.kills };
  });
  console.log(`\n--- run ${run + 1}  lv${out.lv} maxHp${out.maxHp} ${out.dead ? '阵亡@' + out.dur + 's' : '存活/通关'} kills=${out.kills} bossKilled=${out.bossKilled} ---`);
  console.log(out.log.map(l => `t${l.t} hp${l.hp}% en${l.en}${l.boss ? ' BOSS' : ''}`).join('  |  '));
  await page.close();
}
await b.close(); server.close();
