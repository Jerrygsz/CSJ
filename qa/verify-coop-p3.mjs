// 回归测试：双人联机 P3「房主权威共怪」
// 结构（硬断言）：coop.js 新钩子已暴露、单人无远程怪、单人不受影响。
// 联机（软断言，依赖网络 + Metered key 的 Send 权限）：
//   - 房主生成 Boss → 客机收到远程怪（共怪可见，host 状态→client 同步）
//   - 房主改 Boss 血 → 客机快照下降（房主权威）
//   - 客机上报命中 → 房主对应怪状态变化（双方都能打，房主仲裁）
//   - 房主侧队友致伤 → 客机玩家扣血（受伤同步）
//   - 房主 AI 择近：怪追「较近的队友」而非玩家（怪追两人）
//
// 关键：用 __FR 钩子（boss / tickSend / stepEnemies / forcePartner / reportHit /
//      simPartnerHurt / setEnemyHp / enemyHp）确定性驱动，绕过后台标签 rAF 节流；
//      用 Boss 作同步实体（不被 spawnDirector 移除、血量高不会被测杀）。
//
// 运行：在仓库根目录(fanren/)执行  node qa/verify-coop-p3.mjs
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
  hasReportHit: typeof window.__FR.reportHit === 'function',
  hasSimHurt: typeof window.__FR.simPartnerHurt === 'function',
  hasEnemyHp: typeof window.__FR.enemyHp === 'function',
  hasSetHp: typeof window.__FR.setEnemyHp === 'function',
  hasRemote: typeof window.__FR.remoteCount === 'function',
  hasForceP: typeof window.__FR.forcePartner === 'function',
  hasStep: typeof window.__FR.stepEnemies === 'function',
  hasDmg: typeof window.__FR.damageEnemyById === 'function',
  hasPhp: typeof window.__FR.playerHp === 'function',
  hasBoss: typeof window.__FR.boss === 'function',
  hasBossId: typeof window.__FR.bossId === 'function'
}));
ok(struct.hasCoop, '联机模块 Coop 已挂上', struct);
ok(struct.hasReportHit && struct.hasSimHurt && struct.hasEnemyHp && struct.hasSetHp &&
   struct.hasRemote && struct.hasForceP && struct.hasStep && struct.hasDmg && struct.hasPhp &&
   struct.hasBoss && struct.hasBossId,
   'P3 调试钩子已暴露（reportHit/simPartnerHurt/enemyHp/setEnemyHp/remoteCount/forcePartner/stepEnemies/damageEnemyById/playerHp/boss/bossId）', struct);

// ---------- 单人安全 ----------
await page.evaluate(() => window.__FR.enterMap('houshan', 'easy'));
await wait(400);
const soloRemote = await page.evaluate(() => window.__FR.remoteCount());
ok(soloRemote === 0, '单人未联机时无任何远程怪（不串入假怪）', { soloRemote });
await page.evaluate(() => window.__FR.toTitle());

// ---------- 连通 ----------
const room = 'csj-p3-' + Date.now();
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
  // 两人进同一张战斗图
  await page.evaluate(() => window.__FR.enterMap('houshan', 'easy'));
  await page2.evaluate(() => window.__FR.enterMap('houshan', 'easy'));
  await wait(400);
  const roleA = await page.evaluate(() => window.__FR.coopRole());
  const hostP = roleA === 'host' ? page : page2;
  const clientP = roleA === 'host' ? page2 : page;
  ok(roleA === 'host' || roleA === 'client', '两人都获得联机角色（host/client）', { roleA });

  // 房主：开 god，生成 Boss 作为稳定的同步实体（不被 spawnDirector 移除、血量高不会被测杀）
  await hostP.evaluate(() => { window.__FR.G.god = true; window.__FR.boss(); });
  const hid = await hostP.evaluate(() => window.__FR.bossId());
  ok(hid !== null, '房主存在可识别的 Boss _id（用于共怪同步验证）', { hid });

  // 房主周期发敌人快照；轮询等客机收到该 Boss（绕过高延迟 + 后台标签节流）
  let cMeta = null;
  for (let i = 0; i < 40; i++) {
    await hostP.evaluate(() => window.Coop.tickSend(0.2));
    await wait(250);
    cMeta = await clientP.evaluate(id => window.__FR.enemyMeta(id), hid);
    if (cMeta && cMeta.remote === true) break;
  }
  const clientRemote = await clientP.evaluate(() => window.__FR.remoteCount());
  ok(clientRemote >= 1, '客机收到房主敌人快照（remoteCount>=1，共怪可见）', { clientRemote });
  ok(cMeta && cMeta.remote === true, '客机的怪是远程实体（_remote=true）', cMeta);

  // 血量一致性：房主前台自动战斗会持续打怪，两边读取有「一击之内」的时差。
  // 改为轮询两边，取最小差值；只要存在某一刻差值 ≤1 击血量，即证明镜像无偏差（不掩盖缩放/错怪类真 bug）。
  let hHp0 = null, cHp0 = null, minHpDiff = 1e9;
  for (let i = 0; i < 20; i++) {
    await hostP.evaluate(() => window.Coop.tickSend(0.2));
    const h = await hostP.evaluate(id => window.__FR.enemyHp(id), hid);
    const c = await clientP.evaluate(id => window.__FR.enemyHp(id), hid);
    hHp0 = h; cHp0 = c;
    const d = Math.abs((c || 0) - (h || 0));
    if (d < minHpDiff) minHpDiff = d;
    if (d <= 15) break;
    await wait(250);
  }
  ok(cHp0 !== null && minHpDiff <= 15, '客机快照的血量与房主一致（镜像无偏差，容忍一击之内时差）', { hHp0, cHp0, minHpDiff });

  // 链路1：房主直接改怪血（setEnemyHp）→ 客机快照下降（host 状态→client 同步）
  const targetHp = Math.round((hHp0 || 100) * 0.7);
  await hostP.evaluate(([id, hp]) => window.__FR.setEnemyHp(id, hp), [hid, targetHp]);
  const hHp1 = await hostP.evaluate(id => window.__FR.enemyHp(id), hid);
  let cHp1 = null;
  for (let i = 0; i < 20; i++) {
    await hostP.evaluate(() => window.Coop.tickSend(0.2));
    await wait(250);
    cHp1 = await clientP.evaluate(id => window.__FR.enemyHp(id), hid);
    if (cHp1 !== null && cHp1 < hHp0 - 1) break;
  }
  ok(hHp1 === targetHp && cHp1 !== null && cHp1 < hHp0 - 1, '房主改怪血后，客机快照同步下降（房主权威）', { hHp0, targetHp, hHp1, cHp1 });

  // 链路2：客机上报命中（真实路径 damageEnemy）→ 房主对应怪状态变化（命中上报触达 host）
  const hHp2 = await hostP.evaluate(id => window.__FR.enemyHp(id), hid);
  await clientP.evaluate(id => window.__FR.reportHit(id, 50), hid);
  let hHp3 = null;
  for (let i = 0; i < 30; i++) {
    await wait(300);
    hHp3 = await hostP.evaluate(id => window.__FR.enemyHp(id), hid);
    if (hHp3 !== hHp2) break;   // 命中上报触达 → 状态变化（降血或打死移除）即生效
  }
  ok(hHp3 !== hHp2, '客机上报命中后，房主权威怪状态变化（命中上报生效）', { hHp2, hHp3 });

  // 链路3：房主侧队友致伤 → 客机玩家扣血（受伤同步）
  // 关键：两个干扰源必须先掐掉，否则断言会偶发假阴性——
  //   ① 房主的怪持续撞 partner → 客机反复进无敌帧(iv)，显式致伤被 `if (p.iv>0) return` 挡掉；
  //   ② P4 之后客机有镜像掉落，踩到草药会回血，把扣血抹平。
  // 做法：把客机挪到远处（怪够不着、掉落也够不着），每轮发伤前清一次 iv 再发。
  await clientP.evaluate(() => window.__FR.teleport(-3000, -3000));
  await clientP.evaluate(() => { window.__FR.G.god = false; window.__FR.G.player.iv = 0; });
  await wait(500);
  const cHpA = await clientP.evaluate(() => window.__FR.playerHp());
  let cHpB = cHpA;
  for (let i = 0; i < 25; i++) {
    await clientP.evaluate(() => { window.__FR.G.player.iv = 0; });
    await hostP.evaluate(() => window.__FR.simPartnerHurt(40));
    await hostP.evaluate(() => window.Coop.tickSend(0.2));
    await wait(200);
    cHpB = await clientP.evaluate(() => window.__FR.playerHp());
    if (cHpB < cHpA - 10) break;
  }
  ok(cHpB < cHpA - 10, '房主侧队友被怪撞 → 客机玩家扣血（受伤同步）', { cHpA, cHpB });
  // 对照：受伤入口本身在客机可用（先清 iv，排除「无敌帧挡刀」干扰，专注验证入口）
  const cSelf = await clientP.evaluate(() => { window.__FR.G.player.iv = 0; const a = window.__FR.playerHp(); window.__FR.hurtSelf(40); return { a, b: window.__FR.playerHp() }; });
  ok(cSelf.b < cSelf.a - 10, '（对照）客机 hurtSelf 入口可用', cSelf);

  // 怪追两人：房主 AI 择近（追较近的队友而非玩家）—— 全在同步 evaluate 内完成，避免自动战斗杀怪
  // 注意：before 必须在 stepEnemies 之前抓取，否则会被同一次移动抹平，误判「怪没动」。
  const chase = await hostP.evaluate(() => {
    window.__FR.teleport(0, 0);
    window.__FR.spawn('wolf', 1);
    const es = window.__FR.G.enemies.filter(x => !x._remote);
    const e = es[es.length - 1];
    if (!e) return { err: 'no wolf' };
    const bx = e.x, by = e.y;                       // 移动前原始坐标
    window.__FR.forcePartner(bx, by + 50);           // 队友在怪正下方 50px，比玩家更近
    const before = { x: Math.round(bx), y: Math.round(by) };
    const stepRet = window.__FR.stepEnemies(0.1);
    const role = window.__FR.coopRole();
    const pt = window.__FR.G.partner ? { x: Math.round(window.__FR.G.partner.x), y: Math.round(window.__FR.G.partner.y), shown: window.__FR.G.partner.shown } : null;
    const e2 = window.__FR.G.enemies.find(x => x._id === e._id);
    const after = e2 ? { x: Math.round(e2.x), y: Math.round(e2.y) } : null;
    const d0 = 50;                                  // 朝 partner 的原始距离，应随移动缩短
    const d1 = e2 ? Math.hypot(e2.x - bx, e2.y - (by + 50)) : null;
    return { stepRet, role, pt, before, after, d0, d1 };
  });
  ok(chase && chase.d1 !== null && chase.d1 < chase.d0 - 1, '房主模式下怪追「较近的队友」而非玩家（朝 partner 移动）', chase);

  await page.evaluate(() => window.Net.leave());
  await page2.evaluate(() => window.Net.leave());
  await wait(400);
}

ok(errs.length === 0, '页面无报错', errs.slice(0, 6));

await b.close();

console.log('\n== 双人联机 P3 房主权威共怪 ==');
console.log('  房间示例：' + room + '　连通：' + (linked ? '是' : '未在本环境验证'));
if (bad.length) { console.log('失败项：'); for (const m of bad) console.log('  ✗ ' + m); }
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
process.exit(fail ? 1 : 0);
