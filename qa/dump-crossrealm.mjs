// 跨境界诊断：把「玩家 DPS / 小怪真实血量 / 小怪速度 / 是否远程」对到同一张表。
// 用于回答三个问题：
//   Q1 远程功法射程够不够、有没有超出屏幕
//   Q2 每境界功法基础伤害 vs 该境界怪血厚（TTK 是不是"太肉"或"所向无敌"）
//   Q3 无远程能力的怪，速度有没有随境界变快
import { createRequire } from 'node:module';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const model = JSON.parse(fs.readFileSync('qa/balance/model.json', 'utf8'));
const dpsByMap = Object.fromEntries(model.map(m => [m.id, m]));

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const out = await p.evaluate(() => {
  const FR = window.__FR, G = FR.G;
  FR.skipStory(); FR.muteStory(true);
  const ARTS = window.TRASH_ARTS || {};
  const TYPES = window.ENEMY_TYPES || {};

  // 大境界：从境界名里认大境界关键词，取每个大境界覆盖的等级区间。
  // 不能用「去后缀」的写法 —— 境界名有「炼气期一层」「筑基初期」「化神后期」三种格式，
  // 去后缀会把「初期/后期」也一起去掉，分组全乱。
  const BIG = ['炼气', '筑基', '结丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫', '真仙', '金仙', '太乙', '大罗'];
  const groups = [];
  for (const r of (window.REALM_LAYERS || [])) {
    const hit = BIG.find(k => String(r.name).indexOf(k) === 0);
    if (!hit) continue;
    const g = groups.find(x => x.name === hit);
    if (g) { g.to = r.lv; } else groups.push({ name: hit, from: r.lv, to: r.lv });
  }

  const maps = [];
  for (const m of (window.MAPS || [])) {
    if (m.side || !m.enemies || !m.enemies.length) continue;
    if ((m.startLevel || 1) > 500) continue;
    FR.enterMap(m.id, 'easy');
    FR.skipStory(); FR.muteStory(true);
    if (G.state !== 'play') G.state = 'play';
    G.god = true;
    G.enemies.length = 0;
    // 不清空怪，让刷怪节奏保持原样；靠 25 秒把本图出怪种类都跑出来
    const seen = {};
    for (let i = 0; i < 60 * 25; i++) {
      FR.tickFrames(1, 1 / 60);
      G.player.hp = G.player.maxhp;
      for (const e of G.enemies) {
        if (seen[e.type]) continue;
        const art = ARTS[e.type] || null;
        seen[e.type] = {
          type: e.type,
          name: (TYPES[e.type] && TYPES[e.type].name) || e.type,
          hp: Math.round(e.hp),
          spd: Math.round(e.spd * 10) / 10,
          art: art ? art.n : null,
          ranged: !!(art && art.t === 'cast'),
          mobile: !!(art && (art.t === 'dash' || art.t === 'charge'))
        };
      }
      if (G.state !== 'play') G.state = 'play';
      if (Object.keys(seen).length >= (m.enemies.length || 99)) break;
    }
    const list = Object.values(seen);
    if (!list.length) continue;
    const avg = k => Math.round(list.reduce((a, c) => a + c[k], 0) / list.length);
    maps.push({
      id: m.id, name: m.name, lv: m.startLevel || 1, type: m.type || '',
      want: (m.enemies || []).length, got: list.length,
      hpAvg: avg('hp'), spdAvg: Math.round(list.reduce((a, c) => a + c.spd, 0) / list.length * 10) / 10,
      mobs: list
    });
  }
  return { groups, maps };
});

// ---- 聚合 ----
// 口径：**每张图单独算 TTK，再取中位**。
// 第一版把「跨图血量中位 ÷ 跨图 DPS 中位」当成 TTK —— 两个中位数相除不等于中位数，
// 算出来的 0.11 秒其实是拿 lv22 的血量除以 lv30 的 DPS，纯属胡说。
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const m of out.maps) {
  const d = (dpsByMap[m.id] || {}).dps || 0;
  m.dps = d;
  m.ttk = d ? +(m.hpAvg / d).toFixed(3) : null;
}
const rows = [];
for (const g of out.groups) {
  const ms = out.maps.filter(m => m.lv >= g.from && m.lv <= g.to + 1);
  if (!ms.length) continue;
  const allMobs = ms.flatMap(m => m.mobs);
  const near = allMobs.filter(x => !x.ranged);
  const far = allMobs.filter(x => x.ranged);
  const avgSpd = arr => arr.length ? Math.round(arr.reduce((a, c) => a + c.spd, 0) / arr.length * 10) / 10 : null;
  rows.push({
    realm: g.name, from: g.from, to: g.to, nMap: ms.length,
    dps: median(ms.map(m => m.dps).filter(Boolean)),
    hp: median(ms.map(m => m.hpAvg)),
    ttk: median(ms.map(m => m.ttk).filter(Boolean)),
    mobs: allMobs.length,
    nearN: near.length, nearSpd: avgSpd(near),
    farN: far.length, farSpd: avgSpd(far),
    nearMax: near.length ? Math.max(...near.map(x => x.spd)) : null
  });
}

fs.writeFileSync('qa/cross-realm.json', JSON.stringify({ rows, maps: out.maps, groups: out.groups }, null, 2));

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('大境界', 10) + pad('lv', 9) + pad('图', 3) + pad('玩家DPS', 9) + pad('小怪血', 9) + pad('TTK秒', 7) + pad('贴身怪速', 9) + pad('远程怪速', 9));
console.log('-'.repeat(74));
for (const r of rows) {
  console.log(
    pad(r.realm, 10) + pad(r.from + '-' + r.to, 9) + pad(r.nMap, 3) +
    pad(r.dps, 9) + pad(r.hp, 9) + pad(r.ttk, 7) +
    pad(r.nearSpd + '(' + r.nearN + ')', 9) + pad((r.farSpd ?? '-') + '(' + r.farN + ')', 9)
  );
}
console.log('\n注：TTK = 该境界中位图的小怪血量 / 该境界中位玩家DPS，越接近 0 越"一碰就碎"，越大越"肉"。');
await b.close();
