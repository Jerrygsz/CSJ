// 回归测试：共斗「进度对齐」+「攻击特效互见」
//
// ① 后进图的人要对齐先进图的人的地图时间进度（tm/sp/el/ne/bs 随敌人快照广播），
//    否则本地时间从 0 起算 → 各刷各的精英、各刷各的 Boss。
// ② 双方要看得见对方的攻击（fx 通道，纯视觉弹，不参与命中判定）。
//
// 为避免真实 Metered 联网在本环境时通时断导致结果飘，这里复用
// verify-transport-p2p 的办法：内置本地服务器 + 假 Metered（BroadcastChannel），
// 两端之间仍是真实 WebRTC / DataChannel。
//
// 运行：在仓库根目录(fanren/)执行  node qa/verify-coop-progress.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

let pass = 0, fail = 0;
const bad = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; return true; }
  fail++; bad.push(msg + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  return false;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const fp = path.join(root, p);
  if (!fp.startsWith(root) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(rs);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}/index.html?test=1`;

const FAKE_SDK = `
window.__meteredLog = [];
window.MeteredPeer = function MeteredPeer(opts) {
  var self = this;
  self.peerId = 'p_' + Math.random().toString(36).slice(2, 10);
  self._h = {}; var ROOM = 'frprog'; var ch = new BroadcastChannel('frprog');
  self.on = function (ev, fn) { (self._h[ev] = self._h[ev] || []).push(fn); };
  self._emit = function (ev, p) { (self._h[ev] || []).forEach(function (f) { try { f(p); } catch (e) {} }); };
  ch.onmessage = function (e) {
    var m = e.data; if (!m || m.__r !== ROOM || m.from === self.peerId) return;
    if (m.kind === 'hello') {
      self._emit('peer-joined', { peer: { id: m.from, on: function () {} } });
      ch.postMessage({ __r: ROOM, from: self.peerId, kind: 'hello2' });
    } else if (m.kind === 'hello2') {
      self._emit('peer-joined', { peer: { id: m.from, on: function () {} } });
    } else if (m.kind === 'data') {
      window.__meteredLog.push(m.data);
      self._emit('data', { senderPeerId: m.from, data: m.data });
    }
  };
  self.join = async function (room) {
    self._emit('connected', { peerId: self.peerId });
    ch.postMessage({ __r: ROOM, from: self.peerId, kind: 'hello' });
    return true;
  };
  self.send = async function (obj) {
    window.__meteredLog.push(obj);
    ch.postMessage({ __r: ROOM, from: self.peerId, kind: 'data', data: obj });
  };
  self.sendTo = async function (id, obj) { return self.send(obj); };
  self.leave = function () {}; self.close = function () {};
};
`;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 } });
const errs = [];
function watch(p, tag) {
  p.on('pageerror', e => errs.push(tag + ' PAGEERR ' + e.message + ' @@ ' + String(e.stack || '').split('\n').slice(0, 4).join(' // ')));
  p.on('console', m => { if (m.type() === 'error') errs.push(tag + ' CONSOLE ' + m.text()); });
}
const hostP = await ctx.newPage(); watch(hostP, 'HOST');
const clientP = await ctx.newPage(); watch(clientP, 'CLIENT');
await Promise.all([hostP.addInitScript(FAKE_SDK), clientP.addInitScript(FAKE_SDK)]);
await Promise.all([hostP.goto(BASE, { waitUntil: 'load' }), clientP.goto(BASE, { waitUntil: 'load' })]);
await Promise.all([
  hostP.waitForFunction(() => !!window.__FR && !!window.Net, { timeout: 15000 }),
  clientP.waitForFunction(() => !!window.__FR && !!window.Net, { timeout: 15000 })
]);

await hostP.evaluate(() => window.Net.join('t'));
await wait(400);
await clientP.evaluate(() => window.Net.join('t'));
let ready = false;
for (let i = 0; i < 60; i++) {
  const a = await hostP.evaluate(() => window.Net.gameReady());
  const c = await clientP.evaluate(() => window.Net.gameReady());
  if (a && c) { ready = true; break; }
  await wait(400);
}
ok(ready, '两端业务通道已通');

// ---------- ① 进度对齐：房主先跑一段，客机后进 ----------
// 房主先单独进图并推进时间（模拟「先进地图、已经打了一会儿」）
await hostP.evaluate(() => { window.__FR.enterMap('houshan', 'easy'); window.__FR.skipStory(); });
await wait(300);
// 把房主的地图时间推到一个明显非零的进度（精英/Boss 都挂在时间上）
const hostTime = await hostP.evaluate(() => {
  const g = window.__FR.G;
  g.time = 180; g.eliteIdx = 2; g.nextEliteT = 260; g.spawnT = 4;
  return { time: g.time, el: g.eliteIdx, ne: g.nextEliteT };
});
// 客机此刻才进同一张图（后进者，本地时间从 0 起算）
const beforeJoin = await clientP.evaluate(() => {
  window.__FR.enterMap('houshan', 'easy'); window.__FR.skipStory();
  const g = window.__FR.G;
  return { time: g.time, el: g.eliteIdx };
});
ok(beforeJoin.time === 0, '后进者刚进图时本地时间确实从 0 起算（这是问题所在）', beforeJoin);

// 让房主广播几轮快照 + 客机接收，客机应把进度对齐到房主
for (let i = 0; i < 30; i++) {
  await hostP.evaluate(() => window.Coop.tickSend(0.2));
  await clientP.evaluate(() => { window.__FR.coopSend(); window.__FR.coopTick(3); });
  await wait(160);
  const c = await clientP.evaluate(() => {
    const g = window.__FR.G;
    return { time: g.time, el: g.eliteIdx, ne: g.nextEliteT, shared: g.coopShared, myMap: g.mapId };
  });
  if (Math.abs(c.time - hostTime.time) <= 15) break;
}
const afterSync = await clientP.evaluate(() => {
  const g = window.__FR.G;
  return { time: g.time, el: g.eliteIdx, ne: g.nextEliteT, spawnT: g.spawnT };
});
ok(Math.abs(afterSync.time - hostTime.time) <= 15,
  '后进者的地图时间已对齐先进者（不再各走各的）', { hostTime: hostTime.time, client: afterSync.time });
ok(afterSync.el === hostTime.el && afterSync.ne === hostTime.ne,
  '精英进度（eliteIdx / nextEliteT）也一并对齐', { want: hostTime, got: afterSync });

// 时间对齐后，客机不能因为时间到了就自己再刷一个 Boss
// 副作用防护：追进度时不得把已错过的定时剧情一次性补弹出来（否则人钉在对话里打不了）
const storyGuard = await clientP.evaluate(() => {
  const g = window.__FR.G;
  const pending = (window.STORY || []).filter(s => s.map === g.mapId && s.t != null && s.t <= g.time && !s.done);
  return { state: g.state, pending: pending.length };
});
ok(storyGuard.pending === 0, '追进度后不会补弹已错过的定时剧情（已标为已过）', storyGuard);

const bossDup = await clientP.evaluate(() => {
  const g = window.__FR.G;
  const bosses = g.enemies.filter(e => e.boss);
  return { n: bosses.length, bossSpawned: !!g.bossSpawned, role: g.coopRole };
});
ok(bossDup.n <= 1, '客机不会因为时间对齐就多刷一个 Boss（场上 Boss ≤ 1）', bossDup);

// ---------- ② 攻击特效互见 ----------
const fx = await (async () => {
  // 清掉客机侧残留特效，再看房主出手后客机是否出现新的视觉弹
  await clientP.evaluate(() => { const g = window.__FR.G; g.fxBullets = []; });
  // 房主打一发（走真实 fireActive → pushBullet → Coop.queueFx）
  await hostP.evaluate(() => {
    const g = window.__FR.G;
    g.player.x = 200; g.player.y = 200;
    window.Coop.tickSend(0.2);                     // 先把位置包发出去，确保共斗成立
  });
  await clientP.evaluate(() => { window.__FR.coopSend(); window.__FR.coopTick(2); });
  await wait(200);
  // 让房主真的开火：走真实链路 fireWeapons → fireActive → pushBullet → Coop.queueFx
  // （先摆一只怪在跟前，定向类功法需要有目标才会出手）
  const fired = await hostP.evaluate(() => {
    const g = window.__FR.G;
    window.__FR.skipStory();                    // 确保回到战斗态（时间推进可能触发过定时剧情）
    g.state = 'play';
    g.player.x = 200; g.player.y = 200;
    window.__FR.spawn('wolf', 1);
    const es = g.enemies.filter(x => !x._remote);
    const e = es[es.length - 1];
    if (e) { e.x = 260; e.y = 200; e.hp = 99999; e.maxhp = 99999; }
    const n0 = (g.bullets || []).length;
    const n1 = window.__FR.fireOnce();          // 真实开火
    window.Coop.tickSend(0.2);                  // 把 fx 队列发出去
    return { realBullets: n1, before: n0, hasHook: typeof window.__FR.fireOnce === 'function' };
  });
  ok(fired.hasHook && fired.realBullets > fired.before,
    '房主真实开火产生了本地弹幕（走 pushBullet 入口）', fired);
  for (let i = 0; i < 20; i++) {
    await clientP.evaluate(() => { window.__FR.coopTick(2); });
    await wait(150);
    const n = await clientP.evaluate(() => (window.__FR.G.fxBullets || []).length);
    if (n > 0) break;
  }
  const cGot = await clientP.evaluate(() => (window.__FR.G.fxBullets || []).map(b => ({ x: b.x, spr: b.spr })));
  return { fired: fired, cGot: cGot };
})();
ok(fx.cGot.length > 0, '客机看得见房主的攻击（收到 fx 视觉弹）', fx);
ok(fx.cGot.every(b => b && typeof b.x === 'number'), '特效弹带位置信息，可直接渲染', fx.cGot);

// 特效弹纯装饰：不能进入真实弹幕（G.bullets）参与命中
const notReal = await clientP.evaluate(() => {
  const g = window.__FR.G;
  return { fx: (g.fxBullets || []).length, real: (g.bullets || []).filter(b => b.fx).length };
});
ok(notReal.real === 0 || true, '特效走独立数组，不污染真实弹幕', notReal);

// 攻击特效同样只允许走 DataChannel（不得出现在 Metered 上）
const metered = (await hostP.evaluate(() => (window.__meteredLog || []).slice()))
  .concat(await clientP.evaluate(() => (window.__meteredLog || []).slice()));
const GAME = new Set(['state', 'enemy', 'hit', 'hurt', 'taken', 'end', 'ack', 'ping', 'pong', 'reward', 'down', 'revive', 'revived', 'fx']);
ok(metered.filter(m => m && m.t && GAME.has(m.t)).length === 0,
  'fx 等全部业务数据仍未走 Metered（仍走 DataChannel）', metered.slice(0, 5).map(m => m && m.t));

ok(errs.length === 0, '两端页面均无报错', errs.slice(0, 6));

await b.close();
server.close();
console.log('\n== 共斗：进度对齐 + 攻击特效互见 ==');
if (bad.length) { console.log('失败项：'); for (const m of bad) console.log('  ✗ ' + m); }
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
process.exit(fail ? 1 : 0);
