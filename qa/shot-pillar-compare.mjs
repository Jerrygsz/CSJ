// 纯柱体对照：画面里只留两根柱（最矮 185 / 最高 280），清掉弹幕、预警、粒子、敌人。
// 目的：直接看「同一套柱身画法，高度变了多少」以及「矮柱会不会变成光墩」。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const r = await p.evaluate(() => {
  const FR = window.__FR, G = FR.G;
  FR.skipStory(); FR.muteStory(true);
  FR.enterMap('mishi', 'easy');
  FR.skipStory(); FR.muteStory(true);
  if (G.state !== 'play') G.state = 'play';
  G.god = true;
  FR.tickFrames(30, 1 / 60);
  // 清场：只留地形和玩家
  G.enemies.length = 0; G.ebullets.length = 0; G.tells.length = 0; G.parts.length = 0;
  G.hazards.length = 0; G.boss = null;
  if (window.FX3) FX3.clear();
  const pl = G.player;
  const mk = (dx, h, rad, col) => ({
    kind: 'pillar', x: pl.x + dx, y: pl.y - 30, r: rad,
    t: 1.4, dur: 1.4, age: 0.4, dmg: 0, tick: 9, color: col, h: h
  });
  G.hazards.push(mk(-118, 185, 46, '#8fd8ff'));   // 矿脉·磁光兽 档
  G.hazards.push(mk(118, 280, 52, '#ffd98a'));    // 东离虎·道祖 档
  FR.render();
  return { px: pl.x, py: pl.y, n: G.hazards.length };
});
console.log(JSON.stringify(r));
await p.screenshot({ path: 'qa/shots/pillar-compare.png' });
await b.close();
