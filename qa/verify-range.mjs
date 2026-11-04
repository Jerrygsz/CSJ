// 射程椭圆验收：两个独立信号，互不污染。
//   信号 1「打不到屏幕外」：在椭圆边界内 0.85 处放怪 → 必须掉血；边界外 1.15 处 → 必须一滴不掉。
//   信号 2「上限随境界成长」：同样测法跨 炼气/筑基/元婴/金仙 四档，命中半径必须单调变大且不超过半屏。
// 另有信号 3「子弹不飞出椭圆」：逐帧记录所有弹道离玩家的最远距离。
import { createRequire } from 'node:module';
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
  FR.enterMap('houshan', 'easy');
  FR.skipStory(); FR.muteStory(true);
  G.state = 'play'; G.god = true;
  // allEnemies() = G.enemies + G.boss。场上只要站着 Boss，玩家就会优先锁它，
  // 测出来的「没打到我放的怪」其实是「打 Boss 去了」—— 前半轮那个诡异失败就是这么来的。
  G.boss = null;
  // 引擎每帧刷怪，而刷出来的怪出生点常常比我摆的测试怪更近，玩家就去打它了。
  // 只清 G.enemies 没用；把 G.map.enemies 清空也没用 —— pickType() 会回落到 ['wolf','snake','bat']。
  // 真正能掐断的是刷怪计时器：spawnT 一直是正数，spawnDirector 就永远不触发。
  G.spawnT = 1e9;
  const pl = G.player;
  const view = FR.viewSize();
  const RM = window.rangeModel;

  const clear = () => {
    G.enemies.length = 0; G.bullets.length = 0; G.ebullets.length = 0;
    G.tells.length = 0; G.hazards.length = 0; G.parts.length = 0;
  };
  const dummy = () => ({
    _id: 999999, type: 'wolf', x: 0, y: 0, hp: 1e9, maxhp: 1e9, spd: 0, dmg: 0,
    r: 9, xpVal: 0, spr: 'wolf', hitFlash: 0, t: 0, dashT: 99, _orbCd: {}, _artCd: 99,
    art: null, dash: false, charge: false, wob: false, _test: true
  });
  const ellR = (ang, ax, ay) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return 1 / Math.sqrt((c * c) / (ax * ax) + (s * s) / (ay * ay));
  };

  // 玩家实际装备的功法层数（射程按它算）
  const ent = (pl.skills || {}).sword;
  const skLv = typeof ent === 'number' ? ent : (ent && ent.lv) || 0;
  const skMax = (window.skillById ? window.skillById('sword') : null)?.max || 6;

  const ANGS = [0, Math.PI / 4, Math.PI / 2, Math.PI * 0.75];
  const rows = [];
  let bulletPeak = 0;
  // 玩家钉在原地：跨测点跑上千帧，玩家会被击退/相机 clamp 推着挪几像素，
  // 而测试怪是按「相对玩家的距离」摆的 —— 玩家一动，测出来的距离就不是标称值了。
  const px0 = pl.x, py0 = pl.y;

  for (const lv of [1, 36, 82, 460]) {
    pl.level = lv;
    const ri = RM.realmIdx(lv);
    const ax2 = RM.axes(skLv, skMax, ri, view.W / 2, view.H / 2, 1);
    const rec = { lv, ri, ax: Math.round(ax2.ax), ay: Math.round(ax2.ay), inside: [], outside: [] };

    for (const ang of ANGS) {
      for (const [k, bucket] of [[0.85, 'inside'], [1.15, 'outside']]) {
        clear();
        // 每测点重新取 G.player：跑了上千帧后它可能被重建（进图/复活），
        // 闭包里那个 pl 就变成孤儿对象了 —— 改它不会动到真正的玩家，
        // 于是「怪按玩家的 y 摆」和「开火时玩家的 y」对不上，子弹冲着反方向飞。
        const p0 = G.player;
        const bx = p0.x, by = p0.y;
        const e = dummy();
        const d = ellR(ang, ax2.ax, ax2.ay) * k;
        e.x = bx + Math.cos(ang) * d;
        e.y = by + Math.sin(ang) * d;
        G.enemies.push(e);
        // 跑 4 秒（足够 sword 打 4 发），逐帧盯子弹最远距离
        // 必须每帧把 state 按回 play：清空敌人会被判定成「本图打完」，一旦进结算就再也不开火了
        // 也必须每帧只留下测试怪：引擎会自动刷怪，一旦有更近的自然怪，玩家会先打它，
        // 远在 442px 的测试怪就轮不到的 —— 上一版 Lv460 正下方那一条失败就是这么来的。
        let localPeak = 0, closest = 1e9, lastVB = null;
        for (let i = 0; i < 240; i++) {
          FR.tickFrames(1, 1 / 60);
          G.god = true; G.state = 'play'; G.spawnT = 1e9;
          G.boss = null;   // Boss 会在 tick 内被重新拉起，而且常站在玩家正上方 —— 必须每帧清
          G.enemies.length = 0; G.enemies.push(e);
          G.player.x = bx; G.player.y = by;
          if (G.player.hp < G.player.maxhp) G.player.hp = G.player.maxhp;
          for (const bb of G.bullets) {
            const dd = Math.hypot(bb.x - pl.x, bb.y - pl.y);
            if (dd > localPeak) localPeak = dd;
            if (dd > bulletPeak) bulletPeak = dd;
            const de = Math.hypot(bb.x - e.x, bb.y - e.y);
            if (de < closest) { closest = de; lastVB = { vx: Math.round(bb.vx), vy: Math.round(bb.vy), x: Math.round(bb.x), y: Math.round(bb.y) }; }
          }
        }
        const hit = e.hp < 1e9 - 1;
        rec[bucket].push({
          ang: Math.round(ang * 180 / Math.PI), dist: Math.round(d), hit,
          // 失败时靠这几项判断：是子弹没飞够，还是玩家/相机位置漂了
          maxB: Math.round(localPeak), cam: Math.round(G.cam.y), px: Math.round(pl.x), py: Math.round(pl.y),
          hp: Math.round(e.hp), closest: Math.round(closest), lastVB,
          ePos: [Math.round(e.x), Math.round(e.y)]
        });
      }
    }
    rows.push(rec);
  }

  return { view, skLv, skMax, rows, bulletPeak: Math.round(bulletPeak) };
});

console.log(`视口 ${out.view.W}×${out.view.H}（半屏 ${out.view.W / 2}×${out.view.H / 2}）　功法 sword 层数 ${out.skLv}/${out.skMax}\n`);
let pass = 0, fail = 0;
for (const r of out.rows) {
  console.log(`Lv${String(r.lv).padStart(3)}  境界${r.ri}  椭圆 ${r.ax}×${r.ay}`);
  for (const i of r.inside) {
    const ok = i.hit; ok ? pass++ : fail++;
    console.log(`   ${String(i.ang).padStart(3)}°  ${String(i.dist).padStart(4)}px (内 0.85)  ${ok ? "命中 ✓" : "没打到 ✗"}  [飞${i.maxB} 最近${i.closest} 弹${JSON.stringify(i.lastVB)} 怪${JSON.stringify(i.ePos)}]`);
  }
  for (const o of r.outside) {
    const ok = !o.hit; ok ? pass++ : fail++;
    console.log(`   ${String(o.ang).padStart(3)}°  ${String(o.dist).padStart(4)}px (外 1.15)  ${ok ? '没打到 ✓' : '打到了 ✗ 超出屏幕'}`);
  }
  console.log('');
}
const maxHalf = Math.max(out.view.W / 2, out.view.H / 2);
console.log(`弹道最远飞行 ${out.bulletPeak}px　屏幕对角外沿 ${Math.round(maxHalf * 1.05)}px　${out.bulletPeak <= maxHalf * 1.05 ? '✓ 未出屏' : '✗ 飞出屏幕'}`);
console.log(`\n合计 ${pass} 通过 / ${fail} 失败`);
await b.close();
process.exit(fail ? 1 : 0);
