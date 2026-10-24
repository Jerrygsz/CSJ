// 回归测试：双人联机 P4「共享战斗结算」
// 结构（硬断言）：P4 钩子已暴露、单人无远程掉落、单人掉落不受影响。
// 联机（软断言，依赖网络 + Metered key 的 Send 权限）：
//   - 房主击杀怪物掉落 → 客机镜像看到远程掉落（掉落同步可见）
//   - 客机走到掉落上 → 本地入袋（奖励落到自己存档）+ 上报领取 → 房主移除（防重复拾取）
//   - 房主通关 → 广播胜利 → 客机进入通关演出/胜利结算（共享胜利）
//   - 房主/客机任一方倒下 → 广播失败 → 双方进入败北结算（共享败北）
//
// 关键：用 __FR 钩子（enterMap/skipStory/teleport/spawn/damageEnemyById/tickPickups/
//      dropList/hostDrops/claimedCount/stats/startOutro/gameOver）确定性驱动，
//      绕过后台标签 rAF 节流与高延迟。
//
// 运行：在仓库根目录(fanren/)执行  node qa/verify-coop-p4.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';

let pass = 0, fail = 0;
const bad = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; return true; }
  fail++; bad.push(msg + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  return false;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 400, height: 760 } });
const errs = [];
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 15000 });

// ---------- 结构 ----------
const struct = await page.evaluate(() => ({
  hasCoop: !!window.Coop,
  hasStartOutro: typeof window.__FR.startOutro === 'function',
  hasGameOver: typeof window.__FR.gameOver === 'function',
  hasDropList: typeof window.__FR.dropList === 'function',
  hasHostDrops: typeof window.__FR.hostDrops === 'function',
  hasClaimed: typeof window.__FR.claimedCount === 'function',
  hasTickPickups: typeof window.__FR.tickPickups === 'function',
  hasStats: typeof window.__FR.stats === 'function',
  hasEndSent: typeof window.__FR.endSent === 'function',
  hasSendEnd: typeof window.Coop.sendEnd === 'function',
  hasReportTaken: typeof window.Coop.reportTaken === 'function'
}));
ok(struct.hasCoop, '联机模块 Coop 已挂上', struct);
ok(struct.hasStartOutro && struct.hasGameOver && struct.hasDropList && struct.hasHostDrops &&
   struct.hasClaimed && struct.hasTickPickups && struct.hasStats && struct.hasEndSent &&
   struct.hasSendEnd && struct.hasReportTaken,
   'P4 调试钩子已暴露（startOutro/gameOver/dropList/hostDrops/claimedCount/tickPickups/stats/endSent/Coop.sendEnd/Coop.reportTaken）', struct);

// ---------- 单人安全 ----------
await page.evaluate(() => window.__FR.enterMap('houshan', 'easy'));
await wait(400);
const solo = await page.evaluate(() => ({
  remote: window.__FR.dropList().filter(d => d.remote).length,
  drops: window.__FR.hostDrops().total,
  stats: window.__FR.stats()
}));
ok(solo.remote === 0, '单人未联机时无任何远程掉落（不串入假掉落）', solo);
ok(solo.stats.state === 'play', '单人进图后处于战斗状态（不受影响）', solo.stats);
await page.evaluate(() => window.__FR.toTitle());

// ---------- 连通 ----------
const room = 'csj-p4-' + Date.now();
const page2 = await ctx.newPage();
page2.on('pageerror', e => errs.push('P2 PAGEERR ' + e.message));
await page2.goto(URL, { waitUntil: 'load' });
await page2.waitForFunction(() => !!window.__FR, { timeout: 15000 });

let linked = false;
try {
  await page.evaluate(r => window.Net.join(r), room);
  await wait(2500);
  await page2.evaluate(r => window.Net.join(r), room);
  for (let i = 0; i < 30; i++) {
    await wait(500);
    const s = await page.evaluate(() => window.Net.peers().length);
    const s2 = await page2.evaluate(() => window.Net.peers().length);
    if (s >= 1 && s2 >= 1) { linked = true; break; }
  }
} catch (e) {
  console.log('  ⚠ 连通异常：' + e.message + ' → 需人工用两个浏览器窗口验证');
}
if (linked) ok(true, '两个页面进入同一房间并互相发现（P2P 接通）', { room });
else console.log('  ⚠ 未在本环境完成连通（无网络 / key 未开 Send / 沙箱限制）→ 同步部分需人工验证');

if (linked) {
  await page.evaluate(() => window.__FR.enterMap('houshan', 'easy'));
  await page2.evaluate(() => window.__FR.enterMap('houshan', 'easy'));
  await wait(400);
  const roleA = await page.evaluate(() => window.__FR.coopRole());
  const hostP = roleA === 'host' ? page : page2;
  const clientP = roleA === 'host' ? page2 : page;
  ok(roleA === 'host' || roleA === 'client', '两人都获得联机角色（host/client）', { roleA });

  // ========== 链路A：掉落同步 + 拾取同步 ==========
  // 房主把玩家挪远、刷一只狼、立刻击杀 → 掉落出现在狼位（远离房主，避免房主自动拾取）
  const wolf = await hostP.evaluate(() => {
    window.__FR.teleport(400, 400);
    window.__FR.spawn('wolf', 1);
    const es = window.__FR.G.enemies.filter(x => !x._remote);
    const e = es[es.length - 1];
    return e ? { id: e._id, x: Math.round(e.x), y: Math.round(e.y) } : null;
  });
  ok(wolf && wolf.id != null, '房主刷出可识别的狼（掉落来源）', wolf);
  // 房主站到掉落 320px 外：够远不会自动捡走掉落，但仍在掉落同步的 1000px 半径内
  // （快照现在按距离裁剪带宽，掉落在两人 1000px 外就不会同步 —— 这是有意为之）
  await hostP.evaluate(w => window.__FR.teleport(w.x - 320, w.y), wolf);
  const killRes = await hostP.evaluate(id => window.__FR.damageEnemyById(id, 99999), wolf.id);
  const hDrops0 = await hostP.evaluate(() => window.__FR.hostDrops());
  ok(hDrops0.total >= 1, '房主击杀后场上出现掉落（待同步给客机）', hDrops0);

  // 房主周期广播 → 客机镜像看到远程掉落
  let cRemoteDrops = -1;
  let cDropPos = null;
  for (let i = 0; i < 40; i++) {
    await hostP.evaluate(() => window.Coop.tickSend(0.2));
    // 客机是后台标签时 rAF 会被节流，这里手动推一下，保证它拿到最新的房主位置/状态
    await clientP.evaluate(() => { window.__FR.coopSend(); window.__FR.coopTick(2); });
    await wait(250);
    const r = await clientP.evaluate(() => {
      const ds = window.__FR.dropList().filter(d => d.remote);
      return { n: ds.length, first: ds[0] || null };
    });
    cRemoteDrops = r.n;
    if (r.first) cDropPos = { x: r.first.x, y: r.first.y, id: r.first.id };
    if (cRemoteDrops >= 1) break;
  }
  ok(cRemoteDrops >= 1, '客机镜像看到房主的远程掉落（掉落同步可见）', { cRemoteDrops, cDropPos });

  // 客机走到掉落上 → 真实 updatePickups 入袋 + 上报领取；房主随后移除该掉落
  const cBefore = await clientP.evaluate(() => window.__FR.stats());
  // 没同步到掉落时别硬解引用 —— 否则整套件崩在这一行，看不到上面真正的失败原因
  if (cDropPos) await clientP.evaluate(p => window.__FR.teleport(p.x, p.y), cDropPos);
  let claimed = 0, cAfter = cBefore;
  for (let i = 0; i < 30; i++) {
    await clientP.evaluate(() => window.__FR.tickPickups(0.05));
    await wait(120);
    claimed = await clientP.evaluate(() => window.__FR.claimedCount());
    cAfter = await clientP.evaluate(() => window.__FR.stats());
    if (claimed >= 1) break;
  }
  ok(claimed >= 1, '客机走到掉落上完成领取（claimedCount>=1）', { claimed });
  const rewardGained = (cAfter.stones !== cBefore.stones) || (cAfter.xp !== cBefore.xp) || (cAfter.level !== cBefore.level);
  ok(rewardGained, '客机领取的奖励落到自己存档（灵石/修为/等级变化）', { before: cBefore, after: cAfter });

  // 房主侧：收到领取上报后移除该掉落（防重复拾取）；总数下降
  let hDrops1 = hDrops0;
  for (let i = 0; i < 25; i++) {
    await hostP.evaluate(() => window.Coop.tickSend(0.2));
    await wait(200);
    hDrops1 = await hostP.evaluate(() => window.__FR.hostDrops());
    if (hDrops1.total < hDrops0.total) break;
  }
  ok(hDrops1.total < hDrops0.total, '房主收到领取上报后移除该掉落（防重复拾取）', { hDrops0: hDrops0.total, hDrops1: hDrops1.total });

  // ========== 链路B：共享胜利 ==========
  // 房主走真实通关链：startOutro → finishMap → showVictory（内部广播 win）
  await hostP.evaluate(() => window.__FR.skipStory());   // 清掉可能残留的进图对话
  await hostP.evaluate(() => window.__FR.startOutro());
  // 房主自己先确实走到 victory 再去验客机（演出可能夹着升级对话，一帧推不完）
  let hVict = '';
  for (let i = 0; i < 20; i++) {
    hVict = await hostP.evaluate(() => { window.__FR.skipStory(); return window.__FR.stats().state; });
    if (hVict === 'victory') break;
    await wait(150);
  }
  let cWin = false, cEndWin = false;
  for (let i = 0; i < 30; i++) {
    await wait(250);
    const r = await clientP.evaluate(() => ({ end: window.__FR.endSent(), state: window.__FR.stats().state }));
    cEndWin = r.end;
    if (r.state === 'dialog') { await clientP.evaluate(() => window.__FR.skipStory()); }  // 推进客机的通关演出
    if (r.state === 'victory') { cWin = true; break; }
  }
  ok(cEndWin, '房主通关后客机收到胜利广播（endSent=true）', { cEndWin });
  ok(cWin, '客机与房主共享胜利结算（进入 victory）', { cWin });

  // 复位，准备失败链路
  await page.evaluate(() => window.Net.leave());
  await page2.evaluate(() => window.Net.leave());
  await wait(400);
  await page.evaluate(() => window.__FR.toTitle());
  await page2.evaluate(() => window.__FR.toTitle());
  await wait(200);
  await page.evaluate(r => window.Net.join(r), room + '-b');
  await wait(2000);
  await page2.evaluate(r => window.Net.join(r), room + '-b');
  for (let i = 0; i < 30; i++) {
    await wait(500);
    const s = await page.evaluate(() => window.Net.peers().length);
    const s2 = await page2.evaluate(() => window.Net.peers().length);
    if (s >= 1 && s2 >= 1) break;
  }
  await page.evaluate(() => window.__FR.enterMap('houshan', 'easy'));
  await page2.evaluate(() => window.__FR.enterMap('houshan', 'easy'));
  await wait(400);
  const roleB = await page.evaluate(() => window.__FR.coopRole());
  const hostP2 = roleB === 'host' ? page : page2;
  const clientP2 = roleB === 'host' ? page2 : page;

  // ========== 链路C：共享败北 ==========
  await hostP2.evaluate(() => window.__FR.gameOver());   // 房主倒下 → 广播 lose
  let cLose = false, cEndLose = false;
  for (let i = 0; i < 30; i++) {
    await wait(250);
    const r = await clientP2.evaluate(() => ({ end: window.__FR.endSent(), state: window.__FR.stats().state }));
    cEndLose = r.end;
    if (r.state === 'gameover') { cLose = true; break; }
  }
  ok(cEndLose, '任一方倒下后客机收到失败广播（endSent=true）', { cEndLose });
  ok(cLose, '客机与房主共享败北结算（进入 gameover）', { cLose });

  await page.evaluate(() => window.Net.leave());
  await page2.evaluate(() => window.Net.leave());
  await wait(400);
}

ok(errs.length === 0, '页面无报错', errs.slice(0, 6));

await b.close();

console.log('\n== 双人联机 P4 共享战斗结算 ==');
console.log('  房间示例：' + room + '　连通：' + (linked ? '是' : '未在本环境验证'));
if (bad.length) { console.log('失败项：'); for (const m of bad) console.log('  ✗ ' + m); }
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
process.exit(fail ? 1 : 0);
