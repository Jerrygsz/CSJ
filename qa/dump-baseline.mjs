// 基线导出：在真实运行的游戏里取数，不用静态推算。
// 取三样：
//   1. 每张主图的等级段 + 该图小怪的实际血量 / 速度分布（血量含 hpMulBase、图内 rel、levelPad）
//   2. 22 门攻击功法的原始参数
//   3. 每个大境界的名字与等级区间
import { createRequire } from 'node:module';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const out = await p.evaluate(() => {
  const FR = window.__FR, G = FR.G;
  FR.skipStory(); FR.muteStory(true);

  // ---- 1. 功法原始参数 ----
  const skills = (window.SKILLS || []).filter(s => s.atk).map(s => ({
    id: s.id, name: s.name, type: s.type, minLv: s.minLv, max: s.max, kind: s.atk.kind,
    base: s.atk.base, perLv: s.atk.perLv, cd: s.atk.cd, cdBase: s.atk.cdBase, cdPerLv: s.atk.cdPerLv, cdMin: s.atk.cdMin,
    countBase: s.atk.countBase, countPerLv: s.atk.countPerLv,
    pierceBase: s.atk.pierceBase, range: s.atk.range, life: s.atk.life, rad: s.atk.rad, radBase: s.atk.radBase
  }));

  // ---- 2. 境界 ----
  const realms = (window.REALM_LAYERS || []).map(r => ({ name: r.name, from: r.from, to: r.to }));

  // ---- 3. 主图 + 实际刷出的怪 ----
  const maps = [];
  for (const m of (window.MAPS || [])) {
    if (m.side || !m.enemies || !m.enemies.length) continue;
    if ((m.startLevel || 1) > 500) continue;   // 跳过后段超长尾
    FR.enterMap(m.id, 'easy');
    FR.skipStory(); FR.muteStory(true);
    if (G.state !== 'play') G.state = 'play';
    G.god = true;
    G.enemies.length = 0;
    // 跑一段时间让它自然刷怪，记录每种怪的第一只
    const seen = {};
    for (let i = 0; i < 60 * 25; i++) {
      FR.tickFrames(1, 1 / 60);
      G.player.hp = G.player.maxhp;
      for (const e of G.enemies) {
        if (!seen[e.type]) seen[e.type] = { type: e.type, hp: Math.round(e.hp), spd: Math.round(e.spd * 10) / 10, r: e.r, dmg: Math.round(e.dmg) };
      }
      G.enemies.length = 0;   // 清掉防止堆积影响刷怪
      if (G.state !== 'play') G.state = 'play';
    }
    const list = Object.values(seen);
    if (!list.length) continue;
    const hpAvg = list.reduce((a, c) => a + c.hp, 0) / list.length;
    maps.push({
      id: m.id, name: m.name, lv: m.startLevel || 1, arc: m.arc || '',
      n: list.length,
      hpAvg: Math.round(hpAvg),
      hpMin: Math.min(...list.map(x => x.hp)), hpMax: Math.max(...list.map(x => x.hp)),
      spdAvg: Math.round(list.reduce((a, c) => a + c.spd, 0) / list.length * 10) / 10,
      spdMin: Math.min(...list.map(x => x.spd)), spdMax: Math.max(...list.map(x => x.spd)),
      mobs: list
    });
  }

  return { skills, realms, maps, W: G.W || 480, H: G.H || 864 };
});

fs.writeFileSync('qa/baseline.json', JSON.stringify(out, null, 2));
console.log('地图 ' + out.maps.length + ' 张 · 功法 ' + out.skills.length + ' 门 · 境界 ' + out.realms.length + ' 层');
console.log('\n图'.padEnd(20) + 'lv'.padStart(4) + '怪'.padStart(3) + '平均血'.padStart(9) + '血区间'.padStart(16) + '平均速'.padStart(7) + '速区间');
for (const m of out.maps) {
  console.log(
    (m.name || m.id).slice(0, 18).padEnd(20) + String(m.lv).padStart(4) + String(m.n).padStart(3) +
    String(m.hpAvg).padStart(9) + (m.hpMin + '~' + m.hpMax).padStart(16) +
    String(m.spdAvg).padStart(7) + ('  ' + m.spdMin + '~' + m.spdMax)
  );
}
await b.close();
