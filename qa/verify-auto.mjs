// 校验自动战斗（站桩挂机）：按钮该不该露面、站着不动、对白自己点、煞气满自己选卡、
// 进了结算就收工。核心口径是「到结算为止 —— 一张图一趟，不跨图、不替玩家花灵石」。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8998;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const boot = (mapId) => page.evaluate((id) => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(60); F.god(true); F.unlockAll();
  F.enterMap(id, 'easy');
  for (let k = 0; k < 3; k++) { F.skipStory(); F.tickFrames(2); }
  return F.autoInfo();
}, mapId);

// ---------------------------------------------------------------- 1. 按钮露面规则
console.log('\n== 1. 按钮只在能打的图上露面 ==');
const b1 = await boot('houshan');
await page.waitForTimeout(160);
const dom1 = await page.evaluate(() => document.getElementById('autoBtn').style.display);
ok(b1.should === true && dom1 === 'flex', '战斗图（后山）上按钮出现', { should: b1.should, dom: dom1 });
ok(b1.on === false && b1.lit === false, '刚进图时是关着的', b1);

const b2 = await boot('suxing');
await page.waitForTimeout(160);
const dom2 = await page.evaluate(() => document.getElementById('autoBtn').style.display);
ok(b2.should === false && dom2 === 'none', '纯剧情图上按钮不出现（一进去就结算，没有可自动的事）', { should: b2.should, dom: dom2 });

const b3 = await boot('tainan');
await page.waitForTimeout(160);
const dom3 = await page.evaluate(() => document.getElementById('autoBtn').style.display);
ok(b3.should === false && dom3 === 'none', '坊市上按钮不出现', { should: b3.should, dom: dom3 });

// ---------------------------------------------------------------- 2. 站桩
console.log('\n== 2. 站桩：开了就不认方向键 ==');
await boot('houshan');
await page.waitForTimeout(140);
// 先把怪清干净：这一段验的是「按键不生效」，躲弹幕另在第 9 段
// （不清的话怪贴上来时侧身让半步，位移就不是 0 了 —— 那是第 9 段要验的事）
await page.evaluate(() => { window.__FR.clear(); window.__FR.autoMode(true); });
const s0 = await page.evaluate(() => window.__FR.autoInfo());
await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowDown');
await page.waitForTimeout(900);
await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowDown');
const s1 = await page.evaluate(() => window.__FR.autoInfo());
const moved = Math.hypot(s1.px - s0.px, s1.py - s0.py);
ok(s1.on === true, '自动开着', s1.on);
ok(moved < 1, '场上没有威胁时，按住两个方向键 0.9 秒，人一步没挪', { from: [s0.px, s0.py], to: [s1.px, s1.py], d: +moved.toFixed(2) });
const s2 = await page.evaluate(() => window.__FR.autoDodgeInfo());
ok(s2.dir === null, '没有威胁就不躲（站桩不等于乱走）', s2.dir);

// ---------------------------------------------------------------- 3. 关掉后操作恢复
console.log('\n== 3. 关掉之后方向键立刻回来 ==');
await page.evaluate(() => window.__FR.autoMode(false));
const w0 = await page.evaluate(() => window.__FR.autoInfo());
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(700);
await page.keyboard.up('ArrowRight');
const w1 = await page.evaluate(() => window.__FR.autoInfo());
ok(w1.on === false, '关掉了', w1.on);
ok(Math.abs(w1.px - w0.px) > 5, '关掉后按右键，人真的走了', { from: w0.px, to: w1.px });

// ---------------------------------------------------------------- 4. 对白自动推进
console.log('\n== 4. 有对话就自己点过去 ==');
const d0 = await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(60); F.unlockAll();
  F.enterMap('suxing', 'easy');          // 剧情图：一进去就是 12 句的一段
  return F.autoInfo();
});
ok(d0.state === 'dialog', '进剧情图就弹了一段对白', d0.state);
const d1 = await page.evaluate(() => {
  const F = window.__FR;
  F.autoMode(true);
  // 先只喂 0.2 秒：这时候还停在第 1 句（开局留半拍，不会一开就跳）
  const early = F.autoTick(4, 0.05);
  const full = F.autoTick(600, 0.08);
  return { early, full, after: F.autoInfo() };
});
ok(d1.early.idx === 0, '刚开起来不抢着点（留半拍给人看清）', d1.early);
ok(d1.after.state === 'victory', '十二句自己点完了，直接走到结算', d1.after.state);
ok(d1.after.on === false, '到结算自动关掉（一张图一趟）', d1.after.on);
ok(d1.after.should === false, '结算画面按钮也收起', d1.after.should);

// ---------------------------------------------------------------- 5. 煞气满自动选卡
console.log('\n== 5. 煞气满 / 升级的三选一自己选 ==');
const c = await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(60); F.god(true); F.unlockAll();
  F.enterMap('houshan', 'easy');
  for (let k = 0; k < 3; k++) { F.skipStory(); F.tickFrames(2); }
  F.autoMode(true);
  F.sha(99999);                  // 灌满煞气 → 下一帧弹出顿悟三选一
  F.tickFrames(5);
  const before = F.autoInfo();
  // 先喂一点点：还在面板上（留了落手前的停顿）
  const early = F.autoTick(2, 0.05);
  const done = F.autoTick(80, 0.05);
  const after = F.autoInfo();
  return { before, early, done, after };
});
ok(c.before.state === 'levelup' && c.before.cards === 3, '煞气满了，三选一面板弹出来', c.before);
ok(c.early.state === 'levelup', '不马上落手（先停一下）', c.early.state);
ok(c.after.state === 'play' && c.after.cards === 0, '自己选了第一张，回到战斗', c.after);
ok(c.after.on === true, '选完卡自动继续（不是一选完就退）', c.after.on);

// ---------------------------------------------------------------- 6. 祭炼面板不替玩家花钱
console.log('\n== 6. 祭炼面板不替玩家花灵石 ==');
const r = await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(60); F.god(true); F.unlockAll(); F.stones(99999);
  F.enterMap('houshan', 'easy');
  for (let k = 0; k < 3; k++) { F.skipStory(); F.tickFrames(2); }
  F.autoMode(true);
  const st0 = F.info().stones;
  document.getElementById('stones').click();   // 玩家自己点灵石 → 开祭炼面板
  const a = F.autoInfo();
  F.autoTick(80, 0.05);
  const b = F.autoInfo();
  return { st0, st1: F.info().stones, opened: a.state, cards: a.cards, after: b.state, on: b.on };
});
ok(r.opened === 'levelup' && r.cards > 0, '祭炼面板真的打开了（一屏灵石卡）', { state: r.opened, cards: r.cards });
ok(r.after === 'play', '自动把它收掉、回到战场（没把人卡在面板上）', r.after);
ok(r.st1 === r.st0, '一颗灵石都没花（挂机不替人做花钱的决定）', { before: r.st0, after: r.st1 });
ok(r.on === true, '收掉面板后自动还在', r.on);

console.log('\n== 7. 一路自动到结算 ==');
const fin = await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(60); F.god(true); F.unlockAll();
  F.enterMap('houshan', 'easy');
  for (let k = 0; k < 3; k++) { F.skipStory(); F.tickFrames(2); }
  F.autoMode(true);
  F.boss(); F.killBoss();        // 出 Boss 并连杀（后山还有一段续战 Boss）
  const seen = [];
  for (let g = 0; g < 300; g++) {
    const a = F.autoInfo();
    if (seen[seen.length - 1] !== a.state) seen.push(a.state);
    if (a.state === 'victory') break;
    F.tickFrames(10);
    F.autoTick(120, 0.08);
    if (F.autoInfo().state === 'play' && F.info().enemies === 0) F.killBoss();
  }
  const a = F.autoInfo();
  return { state: a.state, on: a.on, should: a.should, seen, cleared: F.info().cleared.indexOf('houshan') >= 0 };
});
ok(fin.state === 'victory', '整场跑到结算画面', fin.state);
ok(fin.cleared === true, '这张图记进已通关', fin.cleared);
ok(fin.on === false, '结算时自动已收工', fin.on);
ok(fin.should === false, '结算时按钮收起', fin.should);

// ---------------------------------------------------------------- 8. 进新图重新归零
console.log('\n== 8. 换一张图要重新点一次 ==');
const n = await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(60); F.god(true); F.unlockAll();
  F.enterMap('houshan', 'easy');
  for (let k = 0; k < 3; k++) { F.skipStory(); F.tickFrames(2); }
  F.autoMode(true);
  const on1 = F.autoInfo().on;
  F.enterMap('mkuang', 'easy');
  for (let k = 0; k < 3; k++) { F.skipStory(); F.tickFrames(2); }
  return { on1, on2: F.autoInfo().on, map: F.autoInfo().map };
});
ok(n.on1 === true, '前一张图开着', n.on1);
ok(n.on2 === false, '换图后自动复位（「到结算为止」的边界就在这儿）', { map: n.map, on: n.on2 });

// ---------------------------------------------------------------- 9. 顺带躲一下
console.log('\n== 9. 自动战斗会侧身让开，但不是跑开 ==');
const dj = await page.evaluate(() => {
  const F = window.__FR;
  const boot = () => {
    F.clearProgress(); F.setLevel(60); F.god(false); F.unlockAll();
    F.enterMap('houshan', 'easy');
    for (let k = 0; k < 3; k++) { F.skipStory(); F.tickFrames(2); }
    F.clear(); F.heal();
  };
  const loop = (n, onFrame) => {
    let maxMove = 0, drift = 0;
    const p0 = F.autoDodgeInfo();
    for (let i = 0; i < n; i++) {
      if (onFrame) onFrame(i);
      F.tickFrames(1);
      const d = F.autoDodgeInfo();
      if (!d) continue;
      if (d.state === 'dialog') F.skipStory();
      maxMove = Math.max(maxMove, Math.hypot(d.px - p0.px, d.py - p0.py));
      if (d.anchor) drift = Math.max(drift, Math.hypot(d.px - d.anchor.x, d.py - d.anchor.y));
    }
    const d = F.autoDodgeInfo();
    return { hp0: p0.hp, hp1: d.hp, lost: p0.hp - d.hp, maxMove: +maxMove.toFixed(1), drift: +drift.toFixed(1) };
  };

  // ① 站着不动挨一发：对照组
  boot(); F.autoMode(false); F.autoShot(180, 190, 30);
  const stand = loop(45);
  // ② 同一发弹幕，开着自动
  boot(); F.autoMode(true); F.autoShot(180, 190, 30);
  const one = loop(45);
  const dir0 = F.autoDodgeInfo();
  // ③ 躲完回原位
  const home = loop(120);
  const endD = F.autoDodgeInfo();
  const backDist = endD.anchor ? Math.hypot(endD.px - endD.anchor.x, endD.py - endD.anchor.y) : -1;
  // ④ 弹幕流：站 vs 自动，各挨 300 帧
  boot(); F.autoMode(false);
  const bStand = loop(300, i => { if (i % 8 === 0) F.autoShot(210, 200, 25); });
  boot(); F.autoMode(true);
  const bAuto = loop(300, i => { if (i % 8 === 0) F.autoShot(210, 200, 25); });
  // ⑤ Boss 算威胁
  boot(); F.autoMode(true); F.boss();
  const nearBoss = F.autoDodgeInfo();
  return { stand, one, dir0, home, backDist: +backDist.toFixed(1), bStand, bAuto, nearBoss: nearBoss.threats };
});
ok(dj.stand.lost > 0 && dj.stand.maxMove < 1, '关着自动：一发弹幕打在身上，人也不动（对照组）', dj.stand);
ok(dj.one.lost === 0, '开着自动：同一发弹幕一滴血没掉（侧身让开了）', dj.one);
ok(dj.one.maxMove > 15, '让开的那一下是真挪了步（不是判定放宽了）', dj.one.maxMove);
ok(dj.one.maxMove < 90, '只让半步：位移没超过一个身位，人还在原地附近', dj.one.maxMove);
ok(dj.home.maxMove < 95, '连躲几秒也不往外跑（远处的怪不算威胁）', dj.home);
ok(dj.backDist < 25, '躲完自己走回原来站着的地方', dj.backDist);
ok(dj.bAuto.lost * 3 < dj.bStand.lost, '弹幕流：自动比站着少挨一大截（不到三分之一）', { stand: dj.bStand.lost, auto: dj.bAuto.lost });
ok(dj.bAuto.drift < 100, '整段弹幕下来人没被赶出场：离锚点始终不到 100px', dj.bAuto.drift);
ok(dj.nearBoss >= 1, 'Boss 贴上来也算威胁（冲刺时会侧让）', dj.nearBoss);

// ---------------------------------------------------------------- 10. 升级/突破三选一也要自己选
// 这块面板和煞气顿悟不是同一套：卡挂在 elCards 上、点了走 chooseCard，而不是 G.cardsNow。
// 以前只认 G.cardsNow，于是每升一级就卡在那儿等人点（实战里升级比煞气满频繁得多）。
console.log('\n== 10. 升级/突破三选一也能自动选 ==');
await boot('houshan');
await page.evaluate(() => window.__FR.autoMode(true));
// 真循环里会插剧情对话，先把对话点掉再开面板，免得把 openLevel 挡在 dialog 上
const drain = () => page.evaluate(() => {
  const F = window.__FR;
  for (let k = 0; k < 30 && F.info().state !== 'play'; k++) {
    if (F.info().state === 'dialog') F.skipStory();
    F.tickFrames(2);
  }
  return F.info().state;
});
const lv = [];
for (let round = 0; round < 3; round++) {
  await drain();
  await page.evaluate(() => window.__FR.openLevel());
  const opened = await page.evaluate(() => ({
    state: window.__FR.autoInfo().state,
    cards: document.querySelectorAll('#levelup .card').length
  }));
  await page.waitForTimeout(1700);   // 留足落手前的停顿 + 一帧渲染
  const closed = await page.evaluate(() => ({
    state: window.__FR.autoInfo().state,
    panel: document.getElementById('levelup').style.display,
    on: window.__FR.autoInfo().on
  }));
  lv.push({ opened, closed });
}
ok(lv.every(x => x.opened.state === 'levelup' && x.opened.cards === 3), '三选一面板真的弹出来了（升级/突破那一套）', lv.map(x => x.opened));
ok(lv.every(x => x.closed.panel === 'none'), '三块面板都被自动点掉、真的收起来了（一轮三次都不卡）', lv.map(x => x.closed.panel));
ok(lv.every(x => x.closed.state !== 'levelup'), '点完之后不再停在选卡态（对话顶上来不算卡）', lv.map(x => x.closed.state));
ok(lv.every(x => x.closed.on === true), '选完卡自动还在', lv.map(x => x.closed.on));

// 升级面板刚点完，紧接着煞气满再弹一块：两块面板轮着来也不会互相打架
await drain();
const mix = await page.evaluate(() => {
  const F = window.__FR;
  const s = F.sha();                 // 只补「刚好够一格」的煞气，别攒出一长串 pending
  F.sha(s.need * 1.2);
  return { pending: F.sha().pending, state: F.autoInfo().state };
});
await page.waitForTimeout(2200);
const mix2 = await page.evaluate(() => ({
  state: window.__FR.autoInfo().state,
  panel: document.getElementById('levelup').style.display,
  pending: window.__FR.sha().pending
}));
ok(mix.pending >= 1, '灌满一格煞气，顿悟排上了', mix);
ok(mix2.panel === 'none' && mix2.pending === 0, '紧接着弹的煞气顿悟也自己选掉了（没和升级面板打架）', mix2);

console.log('\n--------------------------------');
ok(errors.length === 0, '全程无 JS 报错', errors.slice(0, 3));
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
