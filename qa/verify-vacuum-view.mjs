// 验证「Boss 战后只自动拾取视野内的掉落」：
// 视野内放 3 件、视野外放 3 件，打死 Boss 跑完收取流程，看剩下几件、在哪。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9123;
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

const r = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  F.clearProgress(); F.setLevel(20); F.muteStory(true);
  F.enterMap('houshan', 'easy');
  for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
  G.state = 'play';
  F.god(true);
  F.clear();
  const p = G.player;

  // 手工摆点：近处 3 件（必然在视野内）、远处 3 件（一屏之外）
  const pool = window.Items.byRarity(2);
  const mk = (dx, dy) => ({ x: p.x + dx, y: p.y + dy, r: 9, bob: 0, item: pool[0] });
  const near = [mk(60, 0), mk(-80, 40), mk(0, 120)];
  const far = [mk(2000, 0), mk(0, 2400), mk(-2600, -1800)];
  for (const l of near.concat(far)) G.loot.push(Object.assign({}, l));
  const mark = G.loot.length;

  const invBefore = F.inventory().total;
  F.boss(); F.killBoss();     // 打死（含 extraBoss 续战）

  // 跑完战后收取演出
  let frames = 0;
  while (G.state === 'play' && frames < 300) { F.tickFrames(1, 0.05); frames++; }

  const left = G.loot.map(l => ({ dx: Math.round(l.x - p.x), dy: Math.round(l.y - p.y) }));
  return {
    before: mark,
    after: G.loot.length,
    left,
    invBefore, invAfter: F.inventory().total,
    state: G.state,
    frames
  };
});
console.log(`战后掉落：放置 ${r.before} 件 → 剩 ${r.after} 件（视野外应剩 3）`);
console.log(`剩余位置：${r.left.map(o => `(${o.dx},${o.dy})`).join(' ') || '（无）'}`);
console.log(`储物袋：${r.invBefore} → ${r.invAfter} 件　收取后状态 ${r.state}，跑了 ${r.frames} 帧`);
console.log(r.after === 3 && r.left.every(o => Math.abs(o.dx) > 500 || Math.abs(o.dy) > 500) ? 'PASS 视野外未拾取' : 'FAIL 视野外被误收或被吸走');

// 反证：调试接口的全收仍然能收干净（collect 无参 = 旧语义）
const r2 = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  const n0 = G.loot.length;
  const n = F.collect();
  return { n0, got: n, after: G.loot.length };
});
console.log(`\n调试 collectAll 全收：剩 ${r2.n0} 件 → 收走 ${r2.got} → 剩 ${r2.after}（应为 0）`);

await b.close(); server.close();
