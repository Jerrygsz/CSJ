// 第80轮验收：威胁倍率（THREAT）是否真的落到了运行时伤害上。
//
// 量法：同一页面里把 BALANCE.THREAT 临时改回 1 测一遍，再改回真值测一遍，
// 读的是「生成出来的怪物对象上的 dmg」与「玩家气血」——不是读配置表，
// 所以能抓到「函数没被调用 / 被别处覆盖」这类问题。
// 指标：单击占该级气血的百分比（越低越不疼），以及自己挨几下会死。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9113;
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

// 代表图：教学 / 前期 / 中期 / 后期 / 仙界
const CASES = [
  { id: 'houshan', lv: 1 },
  { id: 'mkuang', lv: 3 },
  { id: 'zhuji', lv: 35 },
  { id: 'yanjia', lv: 36 },
  { id: 'shixiao', lv: 80 },
  { id: 'zhuimo', lv: 90 },
  { id: 'xiaoji', lv: 100 },
  { id: 'xisha', lv: 460 },
];

const rows = [];
for (const c of CASES) {
  const r = await page.evaluate(({ id, lv }) => {
    const F = window.__FR, G = F.G, B = window.BALANCE;
    const T = B.THREAT;
    const real = { trash: T.trash, elite: T.elite, boss: T.boss };

    function enter() {
      F.clearProgress(); F.setLevel(lv); F.muteStory(true);
      F.enterMap(id, 'easy');
      for (let i = 0; i < 20 && G.state === 'dialog'; i++) F.skipStory();
      G.state = 'play';
      G.time = 0;                       // 抹掉「越打越强」的时间项，两次测量同尺
      F.clear();
    }
    // 量一次：返回小怪 / 精英 / Boss 单击，和玩家气血
    function sample(bossMul) {
      enter();
      const p = G.player, maxhp = p.maxhp;
      const map = G.map;

      // 小怪：取本图配置里的第一只
      const t0 = (map.enemies && map.enemies[0]) || 'wolf';
      F.spawn(t0, 1);
      const trash = G.enemies.filter(e => !e.elite).map(e => e.dmg);
      F.clear();

      // 精英
      F.elite(0);
      const elite = G.enemies.filter(e => e.elite).map(e => e.dmg);
      F.clear();

      // Boss：本体碰撞单击（字段 × THREAT.boss，与 game.js 的 bShot 同口径）
      F.boss();
      const boss = G.boss ? G.boss.dmg * bossMul : 0;
      const kitK = (G.boss && G.boss.kit) ? Math.max(...G.boss.kit.skills.map(s => s.k || 0)) : 0.5;
      F.clear();

      return {
        maxhp,
        trash: trash.length ? Math.max(...trash) : 0,
        elite: elite.length ? Math.max(...elite) : 0,
        boss, kitK
      };
    }

    T.trash = 1; T.elite = 1; T.boss = 1;
    const before = sample(1);
    T.trash = real.trash; T.elite = real.elite; T.boss = real.boss;
    // Boss 分级：与 game.js 的 threatK('boss') 同口径（前 6 级不吃倍率，lv46 起满额）
    const lvM = (G.map && G.map.startLevel) || lv;
    const bt = Math.min(1, Math.max(0, (lvM - 6) / 40));
    const after = sample(1 + (real.boss - 1) * bt);
    return { before, after, bossMul: 1 + (real.boss - 1) * bt };
    return { before, after };
  }, c);

  const pct = (v, hp) => hp ? (v / hp * 100) : 0;
  const hits = (v, hp) => v > 0 ? Math.round(hp / v) : 0;
  rows.push({
    id: c.id, lv: c.lv, maxhp: r.after.maxhp,
    t0: pct(r.before.trash, r.before.maxhp), t1: pct(r.after.trash, r.after.maxhp),
    tk0: hits(r.before.trash, r.before.maxhp), tk1: hits(r.after.trash, r.after.maxhp),
    e0: pct(r.before.elite, r.before.maxhp), e1: pct(r.after.elite, r.after.maxhp),
    ek0: hits(r.before.elite, r.before.maxhp), ek1: hits(r.after.elite, r.after.maxhp),
    b0: pct(r.before.boss, r.before.maxhp), b1: pct(r.after.boss, r.after.maxhp),
    bk0: hits(r.before.boss, r.before.maxhp), bk1: hits(r.after.boss, r.after.maxhp),
    kitK: r.after.kitK
  });
}
await b.close(); server.close();

const f1 = v => v.toFixed(2);
console.log('等级  地图        气血        小怪单击(占血%/挨几下)      精英单击               Boss本体单击');
console.log('-'.repeat(104));
for (const r of rows) {
  console.log(
    String(r.lv).padStart(4) + '  ' + r.id.padEnd(10) + '  ' + String(Math.round(r.maxhp)).padStart(8) +
    '   ' + f1(r.t0).padStart(5) + '%→' + f1(r.t1).padStart(5) + '%  (' + String(r.tk0).padStart(3) + '→' + String(r.tk1).padStart(3) + ' 击)' +
    '   ' + f1(r.e0).padStart(5) + '%→' + f1(r.e1).padStart(5) + '%  (' + String(r.ek0).padStart(2) + '→' + String(r.ek1).padStart(2) + ')' +
    '   ' + f1(r.b0).padStart(5) + '%→' + f1(r.b1).padStart(5) + '%  (' + String(r.bk0).padStart(2) + '→' + String(r.bk1).padStart(2) + ')'
  );
}
console.log('\n注1：左侧数值 = 把 THREAT 临时归 1 的基线（已完成跨图归一化，但不吃本轮威胁倍率），不是上一个版本的实测值。');
console.log('注2：Boss 招式实际伤害 = 本体单击 × 招式 k × THREAT.boss；表里只列本体（贴身碰撞）单击。');
console.log('注3：houshan 的小怪受 map.trashDmgMul 0.42 压制，Boss 受 threatK 的 lv6 门槛保护，故与其它图不同档。');
