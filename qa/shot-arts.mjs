// 截图：小怪功法显形 / 精英放招 / 补表 Boss 出招
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const setup = async (mapId) => p.evaluate((id) => {
  const FR = window.__FR, G = FR.G;
  FR.skipStory(); FR.muteStory(true);
  FR.enterMap(id, 'easy');
  if (G.state !== 'play') G.state = 'play';
  G.enemies.length = 0; G.parts.length = 0; G.ebullets.length = 0; G.tells.length = 0;
  FX3.clear();
  FR.tickFrames(30, 1 / 60);
  G.enemies.length = 0;
  return { map: id, boss: (G.map && G.map.boss && G.map.boss.name) || null };
}, mapId);

// ---------- 1. 小怪功法显形 ----------
for (const [type, label] of [['wolf', 'claw'], ['dujiao', 'mist'], ['zhengdao', 'blade']]) {
  await setup('houshan');
  const ok = await p.evaluate((t) => {
    const FR = window.__FR, G = FR.G;
    FR.spawn(t, 1);
    const e = G.enemies[0]; if (!e) return false;
    e.hp = e.maxhp = 1e9;
    e.x = G.player.x + 10; e.y = G.player.y + 6;
    for (let i = 0; i < 6; i++) { FR.tickFrames(1, 1 / 60); G.player.hp = G.player.maxhp; if (G.state !== 'play') G.state = 'play'; }
    return G.parts.length;
  }, type);
  await p.waitForTimeout(60);
  await p.screenshot({ path: `qa/shots/art-trash-${label}.png` });
  console.log(`小怪 ${type} 形体${label} 粒子数 ${ok}`);
}

// ---------- 2. 精英放招 ----------
await setup('houshan');
const elite = await p.evaluate(() => {
  const FR = window.__FR, G = FR.G;
  FR.elite(0);
  const e = G.enemies.find(x => x.elite);
  if (!e) return null;
  e.hp = e.maxhp = 1e9;
  // 把它拉到玩家附近，推到「头顶报招名 + 地上预警圈」的那一刻
  for (let i = 0; i < 900; i++) {
    e.x = G.player.x + 90; e.y = G.player.y + 20;
    FR.tickFrames(1, 1 / 60);
    G.player.hp = G.player.maxhp; if (G.state !== 'play') G.state = 'play';
    if (e.pending) break;
  }
  return { name: e.name, kit: e.kit && e.kit.tag, skills: e.kit ? e.kit.skills.map(s => s.n) : [], pending: !!e.pending, tells: G.tells.length };
});
await p.screenshot({ path: 'qa/shots/art-elite.png' });
console.log('精英', JSON.stringify(elite));

// ---------- 3. 补表 Boss ----------
const bossInfo = await p.evaluate(() => {
  const more = window.BOSS_KIT_MORE || {};
  const m = (window.MAPS || []).find(x => x.boss && more[x.boss.name]);
  return m ? { id: m.id, name: m.boss.name } : null;
});
if (bossInfo) {
  await setup(bossInfo.id);
  const bi = await p.evaluate(() => {
    const FR = window.__FR, G = FR.G;
    FR.boss();
    const bs = G.boss; if (!bs) return null;
    for (let i = 0; i < 900; i++) {
      FR.tickFrames(1, 1 / 60);
      G.player.hp = G.player.maxhp; if (G.state !== 'play') G.state = 'play';
      if (bs.pending) break;
    }
    return { name: bs.name, kit: bs.kit && bs.kit.tag, named: !!bs.kitNamed, n: bs.kit ? bs.kit.skills.length : 0, pending: !!bs.pending };
  });
  await p.screenshot({ path: 'qa/shots/art-boss.png' });
  console.log('Boss', JSON.stringify(bi));
} else {
  console.log('未找到补表 Boss 所在图');
}

await b.close();
