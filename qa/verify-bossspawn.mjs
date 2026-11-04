// Boss 登场路径体检：哪些图「有 Boss 配置，却永远不会刷出 Boss」。
// 病根在 updateEnemies 里的调度条件：
//     const at = G.map.bossAt || 0;  if (at > 0 && G.time >= at) spawnBoss();
// bossAt 缺省/写 0 时 at 恒为 0，条件永不成立 —— 只有 type:'boss'（开门即 Boss）能靠开场回调放出来。
// 所以「战斗图 + bossAt 缺省」= 死循环小怪图，打到天荒地老也没有 Boss（掩月宗就是这一例）。
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
  const MAPS = window.MAPS || [];
  const rows = [];
  for (const m of MAPS) {
    if (!m.boss) continue;
    const type = m.type || 'combat';
    const at = m.bossAt || 0;
    // 能否刷出 Boss（与 game.js 里 updateEnemies 的调度口径保持一致）：
    //   type:'boss' → 开场回调里直接 spawnBoss()，不依赖 bossAt
    //   其它类型      → 认 bossAt > 0；漏填时由代码兜底到 120s
    let canSpawn, why, at2 = at;
    if (type === 'boss') {
      canSpawn = !!m.intro && !!window.MAP_STORIES && !!window.MAP_STORIES[m.intro];
      why = canSpawn ? '开场即 Boss' : '缺少开场剧情（intro 未注册）';
    } else if (at > 0) {
      canSpawn = true; why = at + 's 后登场';
    } else {
      // 兜底分支：代码里已改成 120s，这里同步，避免体检比代码乐观
      canSpawn = true; at2 = 120; why = 'bossAt 漏填 → 兜底 120s';
    }
    rows.push({ id: m.id, name: m.name, type, bossAt: at2, raw: at, boss: m.boss.name, canSpawn, why, intro: !!m.intro });
  }
  return { total: MAPS.length, rows };
});

const bad = out.rows.filter(r => !r.canSpawn);
const fallback = out.rows.filter(r => r.raw === 0 && r.type !== 'boss');
console.log(`地图总数 ${out.total}　有 Boss 配置 ${out.rows.length}　无法刷出 Boss ${bad.length}　走兜底 ${fallback.length}\n`);
if (bad.length) {
  console.log('id'.padEnd(16) + 'type'.padEnd(9) + 'bossAt'.padStart(7) + '  ' + 'Boss');
  for (const r of bad) console.log(String(r.id).padEnd(16) + r.type.padEnd(9) + String(r.bossAt).padStart(7) + '  ' + r.boss + '　← ' + r.why);
}
if (fallback.length) {
  console.log('\n仍靠兜底的地图（建议补真实 bossAt）：');
  for (const r of fallback) console.log('  ' + r.id + '　' + r.boss);
}

console.log('\n=== 按 type 汇总 ===');
const byType = {};
for (const r of out.rows) {
  byType[r.type] = byType[r.type] || { n: 0, ok: 0 };
  byType[r.type].n++; if (r.canSpawn) byType[r.type].ok++;
}
for (const k in byType) console.log(`${k.padEnd(10)} ${byType[k].ok}/${byType[k].n} 可刷出`);

await b.close();
