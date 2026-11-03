// 节奏体检：同屏峰值 / 单局击杀 / 顿悟次数
// 用法：node qa/pacing.mjs --tag=before|after [--god]
// 口径沿用第 74 轮的三条铁律：一图一页、冻经验、正常走位（不贴脸也不逃）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9095;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const TAG = (process.argv.find(a => a.startsWith('--tag=')) || '--tag=run').split('=')[1];
const GOD = process.argv.includes('--god');

const b = await chromium.launch({ channel: 'chrome' });

// 先从页面里挑出 4 张不同境界的战斗图（有推进阶段、bossAt > 0）
const pickPage = await b.newPage();
await pickPage.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await pickPage.waitForFunction(() => !!window.__FR);
const targets = await pickPage.evaluate(() => {
  const seen = new Map();
  for (const m of window.MAPS) if (!seen.has(m.id)) seen.set(m.id, m);
  const uniq = [...seen.values()].filter(m => m.type === 'combat' && (m.bossAt || 0) > 0);
  uniq.sort((a, c) => (a.startLevel || 1) - (c.startLevel || 1));
  return uniq.map(m => ({ id: m.id, lv: m.startLevel, bossAt: m.bossAt }));
});
await pickPage.close();

const LIMIT = Number((process.argv.find(a => a.startsWith('--limit=')) || '--limit=0').split('=')[1]);
const list = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;

const rows = [];
for (const t of list) {
  const page = await b.newPage({ viewport: { width: 420, height: 820 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  const r = await page.evaluate(({ id, lv, god }) => {
    const F = window.__FR, G = F.G;
    const m = window.MAPS.find(x => x.id === id);
    F.clearProgress(); F.setLevel(lv || 1); F.muteStory(true);
    if (god) F.setGod(true);
    F.enterMap(id, 'easy');
    for (let i = 0; i < 14 && G.state === 'dialog'; i++) F.skipStory();
    const p = G.player;
    // 装满可用槽位（真实玩家会在「战前运功」里挑，不装的话高级图等于裸奔 1/4 实力）
    {
      const cap = window.skillSlots ? window.skillSlots(lv || 1) : 1;
      const starts = Object.entries(m.startSkills || {}).sort((a, b) => b[1] - a[1]);
      const sk = {};
      for (const [id, L] of starts.slice(0, cap)) sk[id] = L;
      if (Object.keys(sk).length) { G.player.skills = sk; p.skills = sk; }
    }
    p.next = 1e12;                     // 冻经验：升级选卡不打断计时
    G.noSha = false;

    let peak = 0, t = 0, insights = 0, dead = false, frames = 0;
    let jsMs = 0;
    const CAP = 260;
    let bossSeen = false;
    while (t < CAP) {
      const st = G.state;
      if (st === 'levelup') { insights++; if (!F.insightAuto()) { G.state = 'play'; } continue; }
      if (st === 'pause') { F.resume(); continue; }
      if (st === 'dialog') { F.skipStory(); continue; }
      if (st === 'gameover') { dead = true; break; }
      if (st === 'down') { dead = true; break; }
      if (!G.boss) {
        // 正常走位：朝最近之敌靠到 220px（远在射程内，又不用贴脸），
        let near = null, nd = 1e9;
        for (const e of G.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < nd) { nd = d; near = e; } }
        if (near && nd > 220) {
          const a = Math.atan2(near.y - p.y, near.x - p.x);
          p.x += Math.cos(a) * 90 * 0.05; p.y += Math.sin(a) * 90 * 0.05;
        }
        // 被三只以上贴身、且血掉了三成：闪一下脱身（模拟真人会按闪身）
        if (F.dash && (G.dashCd || 0) <= 0 && p.hp < p.maxhp * 0.7) {
          let close = 0;
          for (const e of G.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < 110) close++;
          if (close >= 3) F.dash();
        }
        // 弹幕近身就横移
        for (const eb of G.ebullets) {
          const dd = Math.hypot(p.x - eb.x, p.y - eb.y);
          if (dd < 90) {
            const a2 = Math.atan2(p.y - eb.y, p.x - eb.x) + Math.PI / 2;
            p.x += Math.cos(a2) * 110 * 0.05; p.y += Math.sin(a2) * 110 * 0.05; break;
          }
        }
      }
      const t0 = performance.now();
      F.tickFrames(1, 0.05);
      jsMs += performance.now() - t0;
      frames++;
      t += 0.05;
      if (!G.boss) peak = Math.max(peak, G.enemies.length);
      if (G.boss) bossSeen = true;
      if (bossSeen && !G.boss) break;    // Boss 已死，本局结束
    }
    return {
      id, lv,
      peak,
      kills: G.kills,
      insights,
      dur: +t.toFixed(1),
      dead,
      bossKilled: bossSeen ? !G.boss : false,
      frameMs: +(jsMs / Math.max(1, frames)).toFixed(3),
      hpLeft: p ? Math.round(100 * Math.max(0, p.hp) / p.maxhp) : 0
    };
  }, { id: t.id, lv: t.lv, god: GOD });
  rows.push(r);
  await page.close();
  console.log(`${String(r.lv).padStart(4)} ${r.id.padEnd(14)} 峰值${String(r.peak).padStart(3)}只  击杀${String(r.kills).padStart(4)}  顿悟${String(r.insights).padStart(2)}次  ${String(r.dur).padStart(5)}s  ${r.dead ? '阵亡' : '存活 ' + r.hpLeft + '%'}  ${r.frameMs}ms/帧`);
}

const sum = {
  tag: TAG, god: GOD,
  ok: rows.filter(r => !r.dead && r.bossKilled).length,
  avgKillsAlive: rows.filter(r => !r.dead).length ? Math.round(rows.filter(r => !r.dead).reduce((a, r) => a + r.kills, 0) / rows.filter(r => !r.dead).length) : 0,
  maps: rows.length,
  avgPeak: +(rows.reduce((a, r) => a + r.peak, 0) / rows.length).toFixed(1),
  maxPeak: Math.max(...rows.map(r => r.peak)),
  avgKills: Math.round(rows.reduce((a, r) => a + r.kills, 0) / rows.length),
  avgInsights: +(rows.reduce((a, r) => a + r.insights, 0) / rows.length).toFixed(1),
  avgFrameMs: +(rows.reduce((a, r) => a + r.frameMs, 0) / rows.length).toFixed(3),
  deaths: rows.filter(r => r.dead).length,
  rows
};
fs.mkdirSync(join(here, 'balance'), { recursive: true });
fs.writeFileSync(join(here, 'balance', `pacing-${TAG}${GOD ? '-god' : ''}.json`), JSON.stringify(sum, null, 1));
console.log('\n汇总', JSON.stringify({ 平均峰值: sum.avgPeak, 最高峰值: sum.maxPeak, 平均击杀: sum.avgKills, 平均顿悟: sum.avgInsights, 平均帧耗: sum.avgFrameMs, 阵亡: sum.deaths + '/' + sum.maps }));
await b.close(); server.close();
