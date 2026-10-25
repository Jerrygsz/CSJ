// 3 分钟单局循环守门：煞气→顿悟→变强→灵石祭炼
// 用法：node qa/verify-insight.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9036;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra === undefined ? '' : '  →  ' + JSON.stringify(extra))); }
}

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 820 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
const E = c => page.evaluate(c);

// ===== 1. 煞气条 / 段位显示 =====
console.log('\n== 1. 段位显示（不再露 Lv 数字）==');
let r1 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(42);
  F.enterMap('houshan', 'easy'); F.skipStory();
  F.G.player.xp = F.G.player.next * 0.5;
  F.tickFrames(2, 0.05);
  const lv = document.getElementById('level').textContent;
  const xp = document.getElementById('xpval') ? document.getElementById('xpval').textContent : '';
  return { lv, stage: F.stage(), xp, hasLv: /Lv\\s*\\d/.test(lv) };
})()`);
ok(r1.hasLv === false, 'HUD 上不再出现 Lv 数字', r1.lv);
ok(r1.stage.indexOf('小成') > 0 || r1.stage.indexOf('大成') > 0 || r1.stage.indexOf('圆满') > 0, '筑基以上显示「境界·小成/大成/圆满」', r1.stage);

// ===== 2. 煞气攒满 → 顿悟面板 =====
console.log('\n== 2. 攒满 120 就弹三选一 ==');
let r2 = await E(`(() => {
  const F = window.__FR;
  F.sha(119);
  const before = F.sha();
  const st0 = F.info().state;
  F.sha(5);                       // 过线
  F.tickFrames(2, 0.05);          // 回到 play 才弹
  const st1 = F.info().state;
  const cards = Array.from(document.querySelectorAll('#cards .card .cname')).map(x => x.textContent);
  return { before, st0, st1, cards };
})()`);
ok(r2.before.v > 100 && r2.before.v < 120, '煞气可累积（含自然汇聚，落在 100~120 之间）', r2.before);
ok(r2.st1 === 'levelup', '攒满即进入顿悟面板', r2.st1);
ok(r2.cards.length === 3, '顿悟是三选一', r2.cards);

// ===== 3. 选一张立刻变强（本局）=====
let r3 = await E(`(() => {
  const F = window.__FR;
  const before = F.insight();
  const btn = document.querySelectorAll('#cards .card')[0];
  const nm = btn ? btn.querySelector('.cname').textContent : '';
  if (btn) btn.click();
  const after = F.insight();
  return { nm, before, after, state: F.info().state, bonus: JSON.parse(JSON.stringify(F.G.bonus)) };
})()`);
ok(r3.state === 'play', '选完立刻回到战斗', r3.state);
ok(JSON.stringify(r3.after) !== JSON.stringify(r3.before) || (r3.bonus && Object.keys(r3.bonus).length > 0),
  '选完本局确有加成落地（技能倍率 / 被动 / 灵石）', { after: r3.after, bonus: r3.bonus });

// ===== 4. 灵识祭炼：花全局灵石、次数越多越贵 =====
console.log('\n== 4. 灵石祭炼 ==');
let r4 = await E(`(() => {
  const F = window.__FR;
  F.setStones(200);
  const c0 = F.refineCost();
  const opened = F.openRefine();
  const cards = document.querySelectorAll('#cards .card');
  const nm = cards.length ? cards[0].querySelector('.cname').textContent : '';
  if (cards.length) cards[0].click();
  const c1 = F.refineCost();
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { c0, c1, opened, n: cards.length, nm, stones: F.info().stones, saved: s.stones, refine: (s.insight ? s.insight.refine : null), ins: F.insight() };
})()`);
ok(r4.opened === 'levelup', '点灵石能开祭炼面板', r4.opened);
ok(r4.n >= 1, '面板列出可祭炼的功法', r4.n);
ok(r4.c0 === 3, '第一次祭炼 3 灵石', r4.c0);
ok(r4.stones === 197, '从全局库存扣钱', r4.stones);
ok(r4.c1 === 5, '第二次涨价到 5 灵石', r4.c1);
ok(r4.ins && r4.ins.refine === 1, '祭炼次数记在当局', r4.ins);

// ===== 5. 顿悟池的分布（跑 300 次，粗略校验权重）=====
console.log('\n== 5. 顿悟池权重 ==');
let r5 = await E(`(() => {
  const F = window.__FR;
  const cnt = {};
  for (let i = 0; i < 300; i++) for (const c of F.insightRoll()) cnt[c.kind] = (cnt[c.kind] || 0) + 1;
  return cnt;
})()`);
const total = Object.values(r5).reduce((a, b) => a + b, 0);
ok(Object.keys(r5).length >= 4, '池子里至少 4 类选项', r5);
ok((r5.A || 0) / total > 0.2 && (r5.A || 0) / total < 0.55, 'A 技能升级约占四成', (r5.A / total).toFixed(2));
ok((r5.B || 0) > 0 && (r5.C || 0) > 0 && (r5.D || 0) > 0, 'B/C/D 三类都抽得到', r5);

// ===== 6. 出图即清空 =====
console.log('\n== 6. 一局一清 ==');
let r6 = await E(`(() => {
  const F = window.__FR;
  const before = F.insight();
  const shaBefore = F.sha();
  F.enterMap('houshan', 'easy');
  const after = F.insight();
  const shaAfter = F.sha();
  return { before, after, shaBefore, shaAfter };
})()`);
ok(Object.keys(r6.after.skills || {}).length === 0 && (r6.after.refine || 0) === 0, '换图后顿悟/祭炼不带入', r6.after);
ok(r6.shaAfter.v === 0 && r6.shaAfter.need === 120, '煞气与门槛重置', r6.shaAfter);

// ===== 8. 节奏守门：一局内的顿悟次数必须落在合理区间 =====
console.log('\n== 8. 一局节奏（120 秒不死跑）==');
let r8 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(30); F.setStones(200);
  F.enterMap('xuese', 'easy'); F.skipStory();
  let picks = 0, g = 0;
  while (g++ < 2600) {
    if (F.G.player) F.G.player.hp = F.G.player.maxhp;      // 不死，只测节奏
    F.tickFrames(1, 0.05);
    const st = F.info().state;
    if (st === 'levelup') {
      const c = document.querySelectorAll('#cards .card');
      if (c.length) { c[0].click(); picks++; }
      continue;
    }
    if (F.info().time > 121) break;
  }
  return { picks, kills: F.info().kills, time: Math.round(F.info().time || 0) };
})()`);
ok(r8.time >= 110, '跑满两分钟', r8.time);
ok(r8.picks >= 3 && r8.picks <= 20, '两分钟 3~20 次顿悟（既不会枯坐，也不会一秒钟弹一次）', r8);
ok(r8.picks / (r8.time / 60) >= 2 && r8.picks / (r8.time / 60) <= 8, '每分钟 2~8 次', (r8.picks / (r8.time / 60)).toFixed(2));

// ===== 9. 战斗图不限时，且一局至少 9 次顿悟 =====
console.log('');
console.log('== 9. 战图不限时 · 顿悟 ≥9 ==');
let r9 = await E(`(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(9);
  F.enterMap('houshan', 'easy'); F.skipStory();
  let g = 0;
  while (g++ < 6000) {
    if (F.G.player) F.G.player.hp = F.G.player.maxhp;   // 不死，只看这一局能走到哪
    F.tickFrames(1, 0.05);
    const st = F.info().state;
    if (st === 'levelup') {
      const c = document.querySelectorAll('#cards .card');
      if (c.length) c[0].click();
      continue;
    }
    if (st === 'dialog') { F.skipStory(); continue; }
    if (st === 'victory' || st === 'world') break;
  }
  const ins = F.insight();
  return {
    picks: (ins.n || 0) - (ins.refine || 0),
    time: Math.round(F.info().time || 0),
    state: F.info().state,
    noLimit: F.G.timeoutEnd === undefined && !F.G.limitT,
    cleared: (F.info().cleared || []).indexOf('houshan') >= 0
  };
})()`);
ok(r9.noLimit === true, '战斗图没有任何限时机制', r9.noLimit);
ok(r9.cleared === true, '照常打到 Boss 死才结算（不提前收场）', r9.state);
ok(r9.picks >= 9, '一局至少 9 次顿悟', { picks: r9.picks, time: r9.time });

// ===== 10. 零报错 =====
console.log('\n== 10. 全程零报错 ==');
ok(errs.length === 0, '无页面/控制台报错', errs.slice(0, 3));

await b.close(); server.close();
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
process.exit(fail ? 1 : 0);
