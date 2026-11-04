// 首关 houshan 真实场景探针：不冻经验，玩家边打边升级（真实新手体验）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9100;
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

for (let run = 0; run < 3; run++) {
  const page = await b.newPage({ viewport: { width: 420, height: 820 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  const out = await page.evaluate(() => {
    const F = window.__FR, G = F.G;
    F.clearProgress(); F.setLevel(1); F.muteStory(true);
    F.enterMap('houshan', 'easy');
    for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
    const p = G.player; // 不冻经验：任由升级（真实新手就是一路捡修为）
    let t = 0, bossSeen = false, dead = false, levelAtBoss = 0, hpAtBoss = 0, minHp = 100;
    while (t < 260) {
      const st = G.state;
      if (st === 'levelup') { if (!F.insightAuto || !F.insightAuto()) G.state = 'play'; continue; }
      if (st === 'pause') { F.resume(); continue; }
      if (st === 'dialog') { F.skipStory(); continue; }
      if (st === 'gameover' || st === 'down') { dead = true; break; }
      if (!G.boss) {
        let near = null, nd = 1e9;
        for (const e of G.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < nd) { nd = d; near = e; } }
        if (near && nd > 220) { const a = Math.atan2(near.y - p.y, near.x - p.x); p.x += Math.cos(a) * 90 * 0.05; p.y += Math.sin(a) * 90 * 0.05; }
        if (near && nd < 110 && p.hp < p.maxhp * 0.7) { /* 新手会挨打，但也有闪身 */ }
        if (F.dash && (G.dashCd || 0) <= 0 && p.hp < p.maxhp * 0.55) { let c = 0; for (const e of G.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < 110) c++; if (c >= 2) F.dash(); }
      }
      F.tickFrames(1, 0.05); t += 0.05;
      if (p.maxhp > 0) minHp = Math.min(minHp, 100 * p.hp / p.maxhp);
      if (G.boss && !bossSeen) { bossSeen = true; levelAtBoss = p.level; hpAtBoss = Math.round(100 * p.hp / p.maxhp); }
      if (bossSeen && !G.boss) break;
    }
    return { dead, dur: +t.toFixed(0), lvAtBoss: levelAtBoss, hpAtBoss, minHp: Math.round(minHp), finalLv: p.level, maxHp: Math.round(p.maxhp), bossKilled: bossSeen ? !G.boss : false, kills: G.kills };
  });
  console.log(`run${run + 1}: ${out.dead ? '阵亡@' + out.dur + 's' : '通关'}  进Boss时 lv${out.lvAtBoss} hp${out.hpAtBoss}%  全程最低hp${out.minHp}%  终lv${out.finalLv}(maxHp${out.maxHp})  kills${out.kills}  bossKilled=${out.bossKilled}`);
  await page.close();
}
await b.close(); server.close();
