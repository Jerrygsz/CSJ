// 回归测试：联机「对话同步 + 冻结」/「飞鸽传书聊天」/「暂停同步」
//
// ① 剧情对话同步：房主起对话 → 客机镜像同一段；房主逐句推进 → 客机跟着跳；
//    房主收摊 → 客机解冻恢复战斗。客机若先点掉 → 场上冻结（怪物/特效/掉落静止）
//    且等房主点完立即恢复。
// ② 飞鸽传书：左下角鸽子按钮，点开向左延展输入框，发送走 DataChannel，
//    对方收到；记录框 10% 半透明、发送后 3 秒自动隐藏。
// ③ 暂停同步：任一方暂停 → 对方同步暂停；恢复亦同步。
// ④ 三种新消息（dlg/pause/chat）都不得走 Metered。
//
// 用本地假 Metered（BroadcastChannel）+ 真实 WebRTC，不依赖联网。
// 运行：在仓库根目录(fanren/)执行  node qa/verify-coop-chat.mjs
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
  self._h = {}; var ROOM = 'frchat'; var ch = new BroadcastChannel('frchat');
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
  await wait(160);
  roles = { host: await hostP.evaluate(() => window.__FR.G.coopRole), client: await clientP.evaluate(() => window.__FR.G.coopRole) };
  if ((roles.host === 'host' && roles.client === 'client') || (roles.host === 'client' && roles.client === 'host')) break;
}
if (roles.host !== 'host') { const t = hostP; hostP = clientP; clientP = t; }
const aligned = { host: await hostP.evaluate(() => window.__FR.G.coopRole), client: await clientP.evaluate(() => window.__FR.G.coopRole) };
ok(aligned.host === 'host' && aligned.client === 'client', '角色选举稳定', { before: roles, aligned });

// 双方进同一张图
// 静音地图随机剧情：否则客机可能被动进入 dialog 态，后面的暂停断言会被打断
await hostP.evaluate(() => { window.__FR.enterMap('houshan', 'easy'); window.__FR.skipStory(); window.__FR.muteStory(true); });
await clientP.evaluate(() => { window.__FR.enterMap('houshan', 'easy'); window.__FR.skipStory(); window.__FR.muteStory(true); });
let shared = false;
for (let i = 0; i < 40; i++) {
  await hostP.evaluate(() => window.Coop.tickSend(0.2));
  await clientP.evaluate(() => { window.__FR.coopSend(); window.__FR.coopTick(2); });
  await wait(160);
  shared = await clientP.evaluate(() => window.__FR.G.coopShared);
  if (shared) break;
}
ok(shared, '共斗已成立（同图）', { shared });

// ======================= ① 剧情对话同步 =======================
const LINES = [['韩立', '这是第一句。'], ['旁白', '这是第二句。'], ['韩立', '这是第三句。']];
// 房主起对话
await hostP.evaluate(lines => {
  const g = window.__FR.G;
  window.__FR.showLines(lines, null, 'test');
}, LINES);
await wait(150);
// 让房主把 dlg 广播出去（tickSend 在 play 才跑，这里手动推一次）
await hostP.evaluate(() => window.Coop.tickSend(0.2));
await clientP.evaluate(() => { window.__FR.coopSend(); window.__FR.coopTick(2); });
await wait(400);

const mirrored = await clientP.evaluate(() => {
  const g = window.__FR.G;
  return { state: g.state, idx: g.dialogIdx, n: g.dialogLines ? g.dialogLines.length : 0, synced: !!g.dialogSynced };
});
ok(mirrored.state === 'dialog' && mirrored.n === 3 && mirrored.idx === 0,
  '房主起对话 → 客机镜像出同一段对话', mirrored);

// 房主推进一句 → 客机同步跳到同一句
await hostP.evaluate(() => { window.__FR.advanceDialog(); window.Coop.tickSend(0.2); });
await wait(400);
const adv1 = await clientP.evaluate(() => ({ idx: window.__FR.G.dialogIdx, state: window.__FR.G.state }));
ok(adv1.idx === 1, '房主点一句 → 客机同步跳到同一句', adv1);

// 客机先把自己这段点完 → 应进入冻结（等房主）
await clientP.evaluate(() => {
  const g = window.__FR.G;
  while (g.dialogLines) window.__FR.advanceDialog();
});
await wait(200);
const frozen = await clientP.evaluate(() => ({ frozen: window.__FR.frozen(), state: window.__FR.G.state }));
ok(frozen.frozen === true, '客机先点掉对话 → 场上冻结（等房主）', frozen);

// 冻结期间世界静止：怪物位置不动
const still = await clientP.evaluate(() => {
  const g = window.__FR.G;
  const e = g.enemies[0];
  const before = e ? { x: e.x, y: e.y } : null;
  window.__FR.tickFrames(20, 0.05);
  const after = e ? { x: e.x, y: e.y } : null;
  return { before, after };
});
ok(!still.before || (still.before.x === still.after.x && still.before.y === still.after.y),
  '冻结期间怪物静止（功法特效/掉落一并停住）', still);

// 房主点完 → 客机解冻，恢复战斗
await hostP.evaluate(() => {
  const g = window.__FR.G;
  while (g.dialogLines) window.__FR.advanceDialog();
  window.Coop.tickSend(0.2);
});
await wait(400);
const resumed = await clientP.evaluate(() => ({ frozen: window.__FR.frozen(), state: window.__FR.G.state }));
ok(resumed.frozen === false && resumed.state === 'play', '房主点完 → 客机解冻并立刻恢复战斗', resumed);

// ======================= ② 飞鸽传书 =======================
const ui = await clientP.evaluate(() => {
  const wrap = document.getElementById('chatWrap');
  const log = document.getElementById('chatLog');
  const btn = document.getElementById('chatBtn');
  return {
    exists: !!wrap && !!log && !!btn,
    dove: btn ? btn.textContent : '',
    logBg: log ? getComputedStyle(log).backgroundColor : '',
    open: window.Chat._open()
  };
});
ok(ui.exists && ui.dove.indexOf('🕊') >= 0, '左下角鸽子按钮存在（🕊）', ui);
ok(/0\.1\)/.test(ui.logBg) || /rgba\(0,\s*0,\s*0,\s*0\.1/.test(ui.logBg),
  '聊天记录背景 10% 半透明', { logBg: ui.logBg });

// 点开 → 输入框延展
await clientP.click('#chatBtn');
await wait(300);
const opened = await clientP.evaluate(() => ({
  open: window.Chat._open(),
  w: document.getElementById('chatInput').getBoundingClientRect().width
}));
ok(opened.open && opened.w > 100, '点鸽子 → 横条输入框延展出来', opened);

// 输入并发送
await clientP.fill('#chatInput', '道友，快来帮我');
await clientP.click('#chatBtn');
await wait(500);
const sent = await clientP.evaluate(() => ({
  lines: window.Chat._lines(),
  open: window.Chat._open(),
  logShown: window.Chat._logShown()
}));
ok(sent.lines.some(l => l.indexOf('道友，快来帮我') >= 0), '发送后记入聊天记录', sent.lines);
ok(sent.open === false, '发送后输入框收起', sent);

// 对方收到
let got = null;
for (let i = 0; i < 20; i++) {
  got = await hostP.evaluate(() => window.Chat._lines());
  if (got.some(l => l.indexOf('道友，快来帮我') >= 0)) break;
  await wait(200);
}
ok(got && got.some(l => l.indexOf('道友，快来帮我') >= 0), '房主收到客机的飞鸽传书', got);

// 发送后 3 秒自动隐藏记录框
await wait(3400);
const autoHidden = await clientP.evaluate(() => window.Chat._logShown());
ok(autoHidden === false, '发送后 3 秒自动隐藏聊天记录框', { autoHidden });

// ======================= ③ 暂停同步 =======================
// 客机暂停 → 房主同步暂停
// 确保双方都处于战斗态（前面若有残留对话先点掉）
await hostP.evaluate(() => { window.__FR.skipStory(); window.__FR.G.state = 'play'; });
await clientP.evaluate(() => { window.__FR.skipStory(); window.__FR.G.state = 'play'; });
await wait(150);
await clientP.evaluate(() => { window.__FR.pause(); window.__FR.coopSend(); window.Coop.tickSend(0.2); });
await wait(500);
let pauseSync = null;
for (let i = 0; i < 20; i++) {
  pauseSync = {
    client: await clientP.evaluate(() => window.__FR.G.state),
    host: await hostP.evaluate(() => window.__FR.G.state)
  };
  if (pauseSync.host === 'pause') break;
  await wait(200);
}
ok(pauseSync.client === 'pause', '客机可暂停', pauseSync);
ok(pauseSync.host === 'pause', '客机暂停 → 房主同步暂停', pauseSync);

// 房主恢复 → 客机同步恢复
await hostP.evaluate(() => { window.__FR.resume(); window.Coop.tickSend(0.2); });
await wait(500);
let resumeSync = null;
for (let i = 0; i < 20; i++) {
  resumeSync = {
    client: await clientP.evaluate(() => window.__FR.G.state),
    host: await hostP.evaluate(() => window.__FR.G.state)
  };
  if (resumeSync.client === 'play') break;
  await wait(200);
}
ok(resumeSync.host === 'play' && resumeSync.client === 'play', '房主恢复 → 客机同步恢复', resumeSync);

// ======================= ④ 新消息不走 Metered =======================
const metered = (await hostP.evaluate(() => (window.__meteredLog || []).slice()))
  .concat(await clientP.evaluate(() => (window.__meteredLog || []).slice()));
const GAME = new Set(['state', 'enemy', 'hit', 'hurt', 'taken', 'end', 'ack', 'ping', 'pong', 'reward', 'down', 'revive', 'revived', 'fx', 'dlg', 'pause', 'chat']);
ok(metered.filter(m => m && m.t && GAME.has(m.t)).length === 0,
  'dlg / pause / chat 等全部业务数据未走 Metered', metered.slice(0, 5).map(m => m && m.t));

ok(errs.length === 0, '两端页面均无报错', errs.slice(0, 6));

await b.close();
server.close();
console.log('\n== 联机：对话同步+冻结 / 飞鸽传书 / 暂停同步 ==');
if (bad.length) { console.log('失败项：'); for (const m of bad) console.log('  ✗ ' + m); }
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
process.exit(fail ? 1 : 0);
