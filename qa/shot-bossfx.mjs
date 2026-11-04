// 诊断：Boss 连打 10 秒，每 1 秒抓一帧，看画面上到底出现了什么
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;
const MAP = process.env.MAP || 'mishi';
const TAG = process.env.TAG || 'bossfx';

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const info = await p.evaluate((id) => {
  const FR = window.__FR, G = FR.G;
  FR.skipStory(); FR.muteStory(true);
  FR.enterMap(id, 'easy');
  if (G.state !== 'play') G.state = 'play';
  FR.tickFrames(60, 1 / 60);
  if (!G.boss) FR.boss();
  G.enemies.length = 0; G.ebullets.length = 0; G.tells.length = 0; G.parts.length = 0;
  if (window.FX3) FX3.clear();
  const nm = (G.boss || {}).name;
  const kit = (window.BOSS_KITS || {})[nm] || (window.BOSS_KIT_MORE || {})[nm] || null;
  return { boss: nm, kit: kit ? kit.skills.map(s => s.fx + '·' + s.n) : null };
}, MAP);
console.log('Boss =', info.boss, ' 招式 =', JSON.stringify(info.kit));

// 十个采样点：每个点推进 1 秒再截图，记录当帧各类实体的数量与半径（半径能看出是不是同一个圆球）
const log = [];
for (let i = 0; i < 10; i++) {
  const s = await p.evaluate(() => {
    const FR = window.__FR, G = FR.G;
    FR.tickFrames(60, 1 / 60);
    G.player.hp = G.player.maxhp;
    if (G.state !== 'play') G.state = 'play';
    if (G.boss) G.boss.hp = G.boss.maxhp;
    FR.render();
    return {
      eb: G.ebullets.length,
      radii: [...new Set(G.ebullets.map(x => x.r))].slice(0, 6),
      tells: G.tells.length,
      parts: G.parts.length,
      bossState: G.boss ? (G.boss.pending ? '蓄力' : (G.boss.dashing > 0 ? '冲撞' : '常态')) : '无',
    };
  });
  await p.screenshot({ path: `qa/shots/${TAG}-${i}.png` });
  log.push(s);
  console.log(`t=${i + 1}s 子弹${s.eb} 半径[${s.radii}] 预警${s.tells} 粒子${s.parts} Boss:${s.bossState}`);
}
await b.close();
