// 追击速度验收：在真实地图里看生成的怪实际速度，和它的原始 spd 对账。
// 三个信号：
//   1. 有没有怪快过玩家（96）—— 没有就是「越往后越危险」没落地
//   2. 猎手随境界是否单调变快
//   3. 肉盾有没有被一刀切加速（用户红线：慢的怪不能拉快）
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const MAPS = [
  { id: 'houshan', tag: '炼气' }, { id: 'xuese', tag: '炼气' },
  { id: 'yanjia', tag: '筑基' }, { id: 'ningcui', tag: '筑基' },
  { id: 'yinming', tag: '结丹' }, { id: 'sanjian', tag: '结丹' },
  { id: 'cangkun', tag: '元婴' }, { id: 'zhenmo', tag: '元婴' },
  { id: 'muzu', tag: '化神' },
  { id: 'huanxiao', tag: '合体' },
  { id: 'shiyin', tag: '大乘' },
  { id: 'xisha', tag: '金仙' }
];

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const results = [];
for (const m of MAPS) {
  const r = await p.evaluate(({ id }) => {
    const FR = window.__FR, G = FR.G;
    FR.skipStory(); FR.muteStory(true);
    FR.enterMap(id, 'easy');
    FR.skipStory(); FR.muteStory(true);
    G.state = 'play'; G.god = true;
    // 让引擎自己刷满一批，不要手放：要看的是「引擎实际给出的速度」
    for (let i = 0; i < 60 * 20; i++) {
      FR.tickFrames(1, 1 / 60);
      G.god = true; G.state = 'play';
      if (G.player.hp < G.player.maxhp) G.player.hp = G.player.maxhp;
    }
    const seen = new Map();
    for (const e of G.enemies) {
      if (e.elite) continue;   // 精英速度是硬编码的，不走 chaseSpd，混进来会把结论带偏
      const base = (window.ENEMY_TYPES[e.type] || {}).spd || 0;
      const prev = seen.get(e.type);
      if (!prev || e.spd > prev.now) seen.set(e.type, { type: e.type, base, now: Math.round(e.spd * 10) / 10 });
    }
    return {
      enemies: [...seen.values()].sort((a, b) => b.now - a.now),
      playerSpd: G.player.spd, n: G.enemies.length,
      hunter: G._hunterType || null
    };
  }, m);
  results.push({ ...m, ...r });
}

console.log('图'.padEnd(10) + '境界'.padEnd(6) + '怪数'.padStart(4) + '  猎手        最快原→现   玩家  超玩家?');
const byRealm = new Map();
let fail = 0;
for (const r of results) {
  const top = r.enemies[0];
  if (!top) { console.log(`${r.tag.padEnd(6)} ${r.id} 无怪`); continue; }
  const over = top.now > r.playerSpd;
  if (!byRealm.has(r.tag)) byRealm.set(r.tag, []);
  byRealm.get(r.tag).push(top.now);
  console.log(
    r.id.padEnd(10) + r.tag.padEnd(6) + String(r.n).padStart(4) +
    '  ' + String(r.hunter || '-').slice(0, 12).padEnd(13) +
    `${top.base} → ${top.now}`.padEnd(12) +
    String(r.playerSpd).padStart(4) + '   ' + (over ? '是 ▲' : '否')
  );
  // 肉盾检查：原始 spd < 45 的，涨幅不得超过 25%
  for (const e of r.enemies) {
    if (e.base > 0 && e.base < 45) {
      const gain = (e.now / e.base - 1) * 100;
      if (gain > 25) {
        console.log(`   ✗ 肉盾被拉快：${e.type} ${e.base} → ${e.now}（+${gain.toFixed(0)}%）`);
        fail++;
      }
    }
  }
}

console.log('\n=== 各境界最快无远程怪（应随境界单调上升）===');
const order = ['炼气', '筑基', '结丹', '元婴', '化神', '合体', '大乘', '金仙'];
let prev = 0, mono = true;
for (const k of order) {
  const arr = byRealm.get(k);
  if (!arr) continue;
  const mx = Math.max(...arr);
  if (mx < prev - 0.5) mono = false;
  console.log(`${k}  ${mx}${mx > 96 ? '  ▲ 超过玩家' : ''}`);
  prev = mx;
}
console.log(mono ? '\n✓ 单调上升' : '\n✗ 有回落');
await b.close();
process.exit(fail ? 1 : 0);
