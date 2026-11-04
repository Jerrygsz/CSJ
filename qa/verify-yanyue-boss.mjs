// 掩月宗 Boss 登场实测：真进图、真跑帧，不加任何测试注水。
// 之前这张图 bossAt 写 0，updateEnemies 的 `at > 0` 永不成立 → 小怪无限刷、Boss 永不到场。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('页面错误：', e.message));
await p.goto(`http://127.0.0.1:8123/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const r = await p.evaluate(() => {
  const FR = window.__FR, G = FR.G;
  FR.muteStory(true);
  FR.enterMap('yanyue', 2);
  FR.skipStory(); FR.muteStory(true);
  G.state = 'play';
  FR.god(true);   // 只保玩家不死，不干预 Boss 调度

  const m = G.map;
  const log = { map: m.name, type: m.type, bossAt: m.bossAt, bossCfg: m.boss && m.boss.name };
  let spawnT = null, warnT = null, maxEnemies = 0;
  const clearCards = () => {
    // 顿悟/升级选卡（state === 'levelup'）会整屏压暗挡住画面：点第一张卡放过去
    if (G.state === 'levelup') {
      const c = document.querySelector('#levelup .card');
      if (c) c.click();
      const lv = document.getElementById('levelup');
      if (lv) lv.style.display = 'none';
    }
  };

  // 跑 200 秒（游戏内时间），逐帧盯 Boss 状态
  for (let i = 0; i < 60 * 200; i++) {
    FR.tickFrames(1, 1 / 60);
    clearCards();
    if (G.state !== 'play') { try { FR.pickChoice(0); } catch (e) {} }
    G.state = 'play';
    if (G.player.hp < G.player.maxhp) G.player.hp = G.player.maxhp;
    if (G.bossWarned && warnT === null) warnT = +G.time.toFixed(1);
    if (G.boss && spawnT === null) spawnT = +G.time.toFixed(1);
    if (G.enemies.length > maxEnemies) maxEnemies = G.enemies.length;
    if (spawnT !== null) break;
  }
  // 再跑 2.5 秒：让 Boss 站稳、出第一招。只锁血不改位置，位置是它自己登场时算的
  for (let i = 0; i < 150; i++) {
    FR.tickFrames(1, 1 / 60);
    clearCards();
    if (G.state !== 'play') { try { FR.pickChoice(0); } catch (e) {} }
    G.state = 'play';
    if (G.player.hp < G.player.maxhp) G.player.hp = G.player.maxhp;
    if (G.boss) G.boss.hp = G.boss.maxhp;
  }
  return {
    ...log,
    warnT, spawnT,
    bossName: G.boss ? G.boss.name : null,
    bossHp: G.boss ? Math.round(G.boss.maxhp) : null,
    bossR: G.boss ? G.boss.r : null,
    kit: G.boss && G.boss.kit ? (G.boss.kitNamed ? '专属' : '同族') : '无',
    alive: !!G.bossActive,
    maxEnemies,
    spawnInsideView: G.boss ? (Math.abs(G.boss.y - G.player.y) < 520 && Math.abs(G.boss.x - G.player.x) < 240) : null
  };
});

console.log(JSON.stringify(r, null, 1));
const ok = r.spawnT !== null && r.spawnT >= 115 && r.spawnT <= 125;
console.log(ok ? `\n✓ Boss「${r.bossName}」在 ${r.spawnT}s 登场（预警 ${r.warnT}s），血量 ${r.bossHp}` :
  `\n✗ 未在预期时点登场（spawnT=${r.spawnT}）`);

await p.screenshot({ path: 'qa/shots/yanyue-boss.png' });
await b.close();
