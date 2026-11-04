// 逐招实拍：把每种弹体/地面区单独放一次，各截一张，拼成接触表。
// 目的不是验证"能不能跑"，而是验证"七种东西在画面上能不能分得开"。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;
const TAG = process.env.TAG || 'fx';

const SK = {
  orb:    { n: '环射', fx: 'ring', num: 14, spd: 175, k: 0.5, tele: 0.3 },
  shard:  { n: '扇形齐射', fx: 'fan', num: 7, spread: 0.2, spd: 210, k: 0.5, tele: 0.3 },
  blade:  { n: '贯刺', fx: 'beam', spd: 600, r: 11, k: 0.6, tele: 0.3 },
  drop:   { n: '天降', fx: 'rain', num: 6, rad: 130, r: 10, k: 0.5, tele: 0.3 },
  mist:   { n: '毒雾', fx: 'mist', num: 10, spd: 46, r: 17, k: 0.34, dur: 2.6, tele: 0.3 },
  heavy:  { n: '爆发', fx: 'nova', num: 16, spd: 190, k: 0.5, tele: 0.3 },
  bind:   { n: '困阵', fx: 'trap', dur: 1.2, k: 0.7, tele: 0.3 },
  ice:    { n: '冰封', fx: 'chill', dur: 1.6, slow: 0.45, k: 0.5, tele: 0.3 },
  vortex: { n: '漩涡', fx: 'pull', dist: 80, k: 0.5, tele: 0.3 },
  dash:   { n: '冲撞', fx: 'dash', dist: 4.6, k: 0.6, tele: 0.3, _f: 24 },
  blink:  { n: '瞬移', fx: 'blink', dist: 200, k: 0.4, tele: 0.3, _f: 21 },
  // 持续型三招（真判定，走 G.hazards）
  pillar: { n: '光柱', fx: 'pillar', rad: 48, dur: 2.2, k: 0.30, c: '#ff8a3a', tele: 0.3, _f: 30 },
  sweep:  { n: '横扫光刃', fx: 'sweep', len: 420, r: 16, arc: 2.0, dur: 2.4, k: 0.32, c: '#ffb060', tele: 0.3, _f: 32 },
  spike:  { n: '地刺', fx: 'spike', num: 6, r: 26, k: 0.55, c: '#e8c88a', tele: 0.3, _f: 24 },
};

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

if (process.env.SKIN === 'ink') {
  await p.evaluate(() => { const el = document.getElementById('skinGuigu'); if (el) el.click(); });
}
await p.evaluate(() => {
  const FR = window.__FR, G = FR.G;
  FR.skipStory(); FR.muteStory(true);
  FR.enterMap('houshan', 'easy');
  if (G.state !== 'play') G.state = 'play';
  FR.tickFrames(40, 1 / 60);
  G.enemies.length = 0; G.ebullets.length = 0; G.tells.length = 0; G.zones.length = 0; G.parts.length = 0; G.hazards.length = 0;
  if (window.FX3) FX3.clear();
  if (!G.boss) FR.boss();
  G.player.x = 240; G.player.y = 620;
  if (G.boss) { G.boss.x = 240; G.boss.y = 380; G.boss.hp = G.boss.maxhp = 1e9; }
});

for (const key of Object.keys(SK)) {
  const stat = await p.evaluate((o) => {
    const FR = window.__FR, G = FR.G;
    const b = G.boss; if (!b) return { err: 'no boss' };
    G.ebullets.length = 0; G.tells.length = 0; G.zones.length = 0; G.parts.length = 0; G.hazards.length = 0;
    if (window.FX3) FX3.clear();
    b.pending = null; b.dashing = 0;
    b.kit = { skills: [o.sk] };     // 只留这一招，保证这一帧画面里只有它
    b.cds = [0];
    G.player.x = 240; G.player.y = 620; G.player.hp = G.player.maxhp;
    b.x = 240; b.y = 380;
    // 前摇 0.3s ≈ 18 帧，再推 16 帧让弹幕飞出来一点
    const nf = o.sk._f || 34;
    for (let i = 0; i < nf; i++) {
      FR.tickFrames(1, 1 / 60);
      G.player.hp = G.player.maxhp;
      if (G.state !== 'play') G.state = 'play';
      b.x = 240; b.y = 380;
    }
    FR.render();
    return {
      eb: G.ebullets.length,
      kinds: [...new Set(G.ebullets.map(x => x.k || '?'))],
      zones: G.zones.map(z => z.kind),
      haz: G.hazards.map(h => h.kind),
      tells: G.tells.length,
    };
  }, { sk: SK[key] });
  await p.screenshot({ path: `qa/shots/${TAG}-${key}.png` });
  console.log(`${key.padEnd(7)} 子弹${String(stat.eb).padStart(3)} 形体[${stat.kinds}] 地面区[${stat.zones}] 持续[${stat.haz}] 预警${stat.tells}`);
}
await b.close();
