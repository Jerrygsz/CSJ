// 回归测试：Boss 打完 → 结算（客机不得再点第二遍对话）+ 结算界面可聊天/表情
//
// 用户报的 bug：打完最后的 Boss，房主点完收尾对话、客机也同步点完了，
// 客机却还会再来第二遍完整对话，要点完才进结算。
//   根因：客机镜像过来的 Boss 血量归零 → 本地 pendingEnding 置真 →
//         客机又自己跑了一次 startOutro()，把收尾对话再播一遍。
//   修法：共斗中的客机不自己走收尾，结尾交给房主（收尾对话同步 + end 广播）。
//
// 同时验证：结算（victory）态下飞鸽与表情可用、结算面板上移不挡下方。
//
// 运行：在仓库根目录(fanren/)执行  node qa/verify-coop-endgame.mjs
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
  self._h = {}; var ROOM = 'frend'; var ch = new BroadcastChannel('frend');
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
  p.on('pageerror', e => errs.push(tag + ' PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(tag + ' CONSOLE ' + m.text()); });
}
let hostP = await ctx.newPage(); watch(hostP, 'HOST');
let clientP = await ctx.newPage(); watch(clientP, 'CLIENT');
await Promise.all([hostP.addInitScript(FAKE_SDK), clientP.addInitScript(FAKE_SDK)]);
await Promise.all([hostP.goto(BASE, { waitUntil: 'load' }), clientP.goto(BASE, { waitUntil: 'load' })]);
await Promise.all([
  hostP.waitForFunction(() => !!window.__FR && !!window.Net && !!window.Chat, { timeout: 15000 }),
  clientP.waitForFunction(() => !!window.__FR && !!window.Net && !!window.Chat, { timeout: 15000 })
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

// 角色对齐（房主落在哪页不固定）
let roles = null;
for (let i = 0; i < 40; i++) {
  await hostP.evaluate(() => window.Coop.tickSend(0.2));
  await clientP.evaluate(() => { window.__FR.coopSend(); window.__FR.coopTick(2); });
  await wait(150);
  roles = { h: await hostP.evaluate(() => window.__FR.G.coopRole), c: await clientP.evaluate(() => window.__FR.G.coopRole) };
  if ((roles.h === 'host' && roles.c === 'client') || (roles.h === 'client' && roles.c === 'host')) break;
}
if (roles.h !== 'host') { const t = hostP; hostP = clientP; clientP = t; }
const aligned = { host: await hostP.evaluate(() => window.__FR.G.coopRole), client: await clientP.evaluate(() => window.__FR.G.coopRole) };
ok(aligned.host === 'host' && aligned.client === 'client', '角色选举稳定', aligned);

// 双方进图（静音随机剧情，只测收尾）
await hostP.evaluate(() => { window.__FR.enterMap('houshan', 'easy'); window.__FR.skipStory(); window.__FR.muteStory(true); });
await clientP.evaluate(() => { window.__FR.enterMap('houshan', 'easy'); window.__FR.skipStory(); window.__FR.muteStory(true); });
let shared = false;
for (let i = 0; i < 40; i++) {
  await hostP.evaluate(() => window.Coop.tickSend(0.2));
  await clientP.evaluate(() => { window.__FR.coopSend(); window.__FR.coopTick(2); });
  await wait(150);
  shared = await clientP.evaluate(() => window.__FR.G.coopShared);
  if (shared) break;
}
ok(shared, '共斗已成立（同图）', { shared });

// ============ 核心：打完 Boss 的收尾流程 ============
// 房主：杀掉 Boss → 进入收尾（startOutro 走真实链路）
const hostOutro = await hostP.evaluate(() => {
  const g = window.__FR.G;
  // 造一个 Boss 并打死，走真实的 onBossDead → pendingEnding → startOutro
  if (!g.boss) {
    window.__FR.spawn('wolf', 1);
    const es = g.enemies.filter(x => !x._remote);
    const e = es[es.length - 1];
    if (e) { e.boss = true; g.boss = e; g.bossActive = true; g.bossSpawned = true; }
  }
  if (g.boss) window.__FR.damageEnemyById(g.boss._id, 1e9);
  // 击杀会置 hitStop（顿帧），前几帧 update 会早退 —— 清掉并多推几帧，
  // 让 vacuumT 走完 → pendingEnding → startOutro 真正发生
  g.hitStop = 0;
  g.vacuumT = 0.05;
  g.pendingEnding = true;
  window.__FR.tickFrames(12, 0.05);
  return { state: g.state, dialogN: g.dialogLines ? g.dialogLines.length : 0, id: g.dialogId, pending: g.pendingEnding };
});
ok(hostOutro.dialogN > 0 || hostOutro.state !== 'play', '房主：Boss 倒下 → 进入收尾对话/结算', hostOutro);

// 客机同步到房主的收尾对话
for (let i = 0; i < 20; i++) {
  await hostP.evaluate(() => window.Coop.tickSend(0.2));
  await clientP.evaluate(() => { window.__FR.coopTick(2); });
  await wait(150);
  if (await clientP.evaluate(() => window.__FR.dialogState().n > 0)) break;
}
const clientMirrored = await clientP.evaluate(() => window.__FR.dialogState());
ok(clientMirrored.n > 0 || clientMirrored.state !== 'play', '客机：同步到房主的收尾对话', clientMirrored);

// 客机点完（或同步点完）后，不得再冒出第二遍对话
await clientP.evaluate(() => { while (window.__FR.G.dialogLines) window.__FR.advanceDialog(); });
// 房主点完收尾 → 进结算
await hostP.evaluate(() => { while (window.__FR.G.dialogLines) window.__FR.advanceDialog(); window.Coop.tickSend(0.2); });
await wait(700);
// 推几帧：若客机本地 pendingEnding 仍会触发，这里就会再弹一次完整对话
await clientP.evaluate(() => window.__FR.tickFrames(25, 0.05));
await wait(900);
const clientAfter = await clientP.evaluate(() => ({
  state: window.__FR.G.state,
  dialogN: window.__FR.G.dialogLines ? window.__FR.dialogState().n : 0,
  frozen: window.__FR.frozen(),
  pending: window.__FR.G.pendingEnding,
  outroTrace: window.__FR.G._outroTrace || [],
  dialogId: window.__FR.G.dialogId,
  synced: !!window.__FR.G.dialogSynced
}));
ok(clientAfter.dialogN === 0, '客机：没有再冒出第二遍收尾对话（这是本 bug 的核心）', clientAfter);
ok(clientAfter.state === 'victory', '客机：已进结算界面', clientAfter);
ok(clientAfter.pending === false, '客机：本地 pendingEnding 已清（不会二次触发收尾）', clientAfter);

// ============ 结算界面：可聊天 / 表情 / 面板不挡下方 ============
const settle = await clientP.evaluate(() => {
  const v = document.getElementById('victory');
  const panel = v ? v.querySelector('.panel') : null;
  const cs = v ? getComputedStyle(v) : null;
  const pr = panel ? panel.getBoundingClientRect() : null;
  return {
    visible: v ? getComputedStyle(v).display !== 'none' : false,
    overlayPointer: cs ? cs.pointerEvents : '',
    panelPointer: panel ? getComputedStyle(panel).pointerEvents : '',
    panelTop: pr ? Math.round(pr.top) : null,
    panelBottom: pr ? Math.round(pr.bottom) : null,
    screenH: window.innerHeight,
    chatVisible: window.Chat.isVisible(),
    hasEmojiBar: window.Chat._hasEmojiBar()
  };
});
ok(settle.visible, '结算界面已显示', settle);
ok(settle.overlayPointer === 'none' && settle.panelPointer === 'auto',
  '结算遮罩不吃点击，只有面板吃（下方留出可用空间）', settle);
ok(settle.panelTop < settle.screenH * 0.25, '结算面板已上移（顶部区域）', settle);
ok(settle.panelBottom < settle.screenH * 0.7, '面板下方留有空间', settle);
ok(settle.chatVisible === true, '结算态下飞鸽仍可用（好说话）', settle);
ok(settle.hasEmojiBar === true, '表情包存在', settle);

// 结算态发一条文字聊天
await clientP.click('#chatBtn');
await wait(250);
await clientP.fill('#chatInput', '打完了，走？');
await clientP.click('#chatBtn');
await wait(500);
let hostGot = null;
for (let i = 0; i < 20; i++) {
  hostGot = await hostP.evaluate(() => window.Chat._lines());
  if (hostGot.some(l => l.indexOf('打完了，走？') >= 0)) break;
  await wait(200);
}
ok(hostGot && hostGot.some(l => l.indexOf('打完了，走？') >= 0), '结算态文字聊天送达对方', hostGot);

// 结算态发一个表情
await clientP.evaluate(() => window.Chat._sendEmoji('🎉'));
await wait(500);
let hostEmoji = null;
for (let i = 0; i < 20; i++) {
  hostEmoji = await hostP.evaluate(() => window.Chat._lines());
  if (hostEmoji.some(l => l.indexOf('🎉') >= 0)) break;
  await wait(200);
}
ok(hostEmoji && hostEmoji.some(l => l.indexOf('🎉') >= 0), '表情包送达对方', hostEmoji);

// 角色在结算态不能移动
const noMove = await clientP.evaluate(() => {
  const g = window.__FR.G;
  const p0 = { x: g.player.x, y: g.player.y };
  window.__FR.tickFrames(15, 0.05);
  return { p0, p1: { x: g.player.x, y: g.player.y } };
});
ok(Math.abs(noMove.p1.x - noMove.p0.x) < 1 && Math.abs(noMove.p1.y - noMove.p0.y) < 1,
  '结算态角色不能移动', noMove);

// 自己点「离开地图」才走
const leaveBtn = await clientP.evaluate(() => {
  const b = document.getElementById('vBack');
  return { exists: !!b, text: b ? b.textContent : '' };
});
ok(leaveBtn.exists && leaveBtn.text.indexOf('离开地图') >= 0, '有「离开地图」按钮，想走再自己点', leaveBtn);

// 新消息仍只走 DataChannel
const metered = (await hostP.evaluate(() => (window.__meteredLog || []).slice()))
  .concat(await clientP.evaluate(() => (window.__meteredLog || []).slice()));
const GAME = new Set(['state', 'enemy', 'hit', 'hurt', 'taken', 'end', 'ack', 'ping', 'pong', 'reward', 'down', 'revive', 'revived', 'fx', 'dlg', 'pause', 'chat', 'enc']);
ok(metered.filter(m => m && m.t && GAME.has(m.t)).length === 0, 'chat/dlg 等仍未走 Metered', metered.slice(0, 4).map(m => m && m.t));

ok(errs.length === 0, '两端页面均无报错', errs.slice(0, 6));

await b.close();
server.close();
console.log('\n== 收尾结算：客机不再点第二遍 + 结算可聊天/表情 ==');
if (bad.length) { console.log('失败项：'); for (const m of bad) console.log('  ✗ ' + m); }
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
process.exit(fail ? 1 : 0);
