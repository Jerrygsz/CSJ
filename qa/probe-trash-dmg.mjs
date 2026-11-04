// 实测「小怪真的撞上来时，玩家掉多少血」——不看配置，看 hitPlayer 之后的气血变化。
// 顺带跑一段「站着不动 60 秒」，量真实危机感（hp 最低点 / 是否阵亡）。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9119;
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

const CASES = [
  { id: 'houshan', lv: 1 }, { id: 'zhuji', lv: 35 }, { id: 'yanjia', lv: 36 },
  { id: 'shixiao', lv: 80 }, { id: 'zhuimo', lv: 90 }, { id: 'xisha', lv: 460 },
];

console.log('== 真实接触伤害（把怪贴到玩家身上，看气血实际掉多少） ==');
for (const c of CASES) {
  const page = await b.newPage({ viewport: { width: 420, height: 820 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  const r = await page.evaluate(({ id, lv }) => {
    const F = window.__FR, G = F.G;
    F.clearProgress(); F.setLevel(lv); F.muteStory(true);
    F.enterMap(id, 'easy');
    for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
    G.state = 'play';
    F.clear();
    const p = G.player;
    p.maxhp = p.maxhp; p.hp = p.maxhp;
    const hp0 = p.hp, maxhp = p.maxhp;

    const type = (G.map.enemies && G.map.enemies[0]) || 'wolf';
    F.spawn(type, 1);
    const e = G.enemies.filter(x => !x.elite)[0];
    if (!e) return { err: 'no enemy' };
    // 贴脸：把怪放在玩家身上，等一帧让它触发碰撞
    e.x = p.x; e.y = p.y;
    p.iv = 0;
    F.tickFrames(2, 0.05);
    const lost = hp0 - p.hp;
    return { maxhp, lost, decl: e.dmg, ratio: lost / maxhp, type, name: (window.ENEMY_TYPES[type] || {}).name };
  }, c);
  if (r.err) { console.log(`${c.id}  ${r.err}`); await page.close(); continue; }
  console.log(`${String(c.lv).padStart(4)} ${c.id.padEnd(9)} 气血 ${String(Math.round(r.maxhp)).padStart(7)}  ` +
    `${r.name}/${r.type}  字段dmg ${String(r.decl).padStart(6)}  →  实掉 ${String(Math.round(r.lost)).padStart(7)} ` +
    `(${(r.ratio * 100).toFixed(1)}% 气血，${r.ratio > 0 ? Math.round(1 / r.ratio) : '∞'} 击死)`);
  await page.close();
}
await b.close(); server.close();
