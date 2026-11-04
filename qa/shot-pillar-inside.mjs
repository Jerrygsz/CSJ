// 提亮后的可读性代价检查：柱身是画在角色**之后**的一层（为了"从我身上穿过去"的层次），
// 提亮 32% 就等于给柱内的角色盖了一层更浓的色纱。这里把玩家和一只小怪都摆进柱心，
// 判断提亮后还能不能认出「柱子里站着谁」。
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
  G.enemies.length = 0; G.ebullets.length = 0; G.tells.length = 0; G.parts.length = 0;
  G.hazards.length = 0; G.boss = null;
  if (window.FX3) FX3.clear();
  const pl = G.player;
  // 柱就落在玩家脚下，Boss 尺寸、最亮的一档（道祖 280）
  G.hazards.push({
    kind: 'pillar', x: pl.x, y: pl.y, r: 52, t: 1.4, dur: 1.4, age: 0.4,
    dmg: 0, tick: 9, color: '#ffd98a', h: 280
  });
  // 柱子里放两只小怪，看能不能从光里认出来
  const kinds = (window.ENEMY_KINDS || ['wolf', 'bandit']);
  for (let i = 0; i < 2; i++) {
    G.enemies.push({
      kind: kinds[i % kinds.length], x: pl.x - 26 + i * 38, y: pl.y - 46,
      hp: 40, maxhp: 40, spd: 0, dmg: 0, r: 12, atk: 0, cd: 99, hitFlash: 0, t: 0
    });
  }
  FR.render();
  return { px: pl.x, py: pl.y, n: G.enemies.length };
});
console.log(JSON.stringify(r));
await p.screenshot({ path: 'qa/shots/pillar-inside.png' });
await b.close();
