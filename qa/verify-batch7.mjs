// 回归测试：批次 7 · P2-3 联机闭环（双人合击 + 协作解锁）
//
// 这一批的两条判定都是**纯逻辑**：夹击看成「两秒内两人是否都出过手」，
// 合击看成「更紧的窗口内交替命中够不够数」。所以不需要真的开两个浏览器 —
// 用 __FR.coopMark(id, partner) 替队友标一笔命中即可，判定路径与真实联机完全一致
// （真实联机里 partner 那一笔来自 onData('hit') → damageEnemyById → damageEnemy）。
//
// A 组  夹击：单人不成、窗口成立、超窗不续、罩扣更快、只对精英/Boss 报字
// B 组  合击：小怪不累计、精英攒够 4 下出手、真伤够、CD 内不出手、单人永不触发
// C 组  档位：初会 / 默契 / 同心 三档的边界与数值
// D 组  存档：新档有字段、合击落盘、老档补零账
// E 组  UI：联机面板的共斗默契块
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
const ctx = await b.newContext({ viewport: { width: 400, height: 812 } });
const errs = [];
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR && !!window.Coop, { timeout: 20000 });

// 结构：这一批新增的钩子与常量都得在
const struct = await page.evaluate(() => ({
  hasMarkHit: typeof window.Coop.markHit === 'function',
  hasCrossMul: typeof window.Coop.crossMul === 'function',
  hasTieState: typeof window.Coop.tieState === 'function',
  hasFireTie: typeof window.Coop.fireTieById === 'function',
  tiers: Array.isArray(window.Coop.TIERS) ? window.Coop.TIERS.length : 0,
  tierNames: (window.Coop.TIERS || []).map(t => t.name),
  need: window.Coop.TIE_NEED,
  win: window.Coop.CROSS_WIN,
  fns: ['coopTieN', 'coopWinN', 'addCoopTie', 'addCoopWin', 'setCoopTie', 'coopMark', 'crossOf', 'setWard', 'tieFire', 'tieState']
    .filter(k => typeof window.__FR[k] !== 'function')
}));
ok(struct.hasMarkHit && struct.hasCrossMul && struct.hasTieState && struct.hasFireTie,
  '联机模块暴露夹击 / 合击的四个入口', struct);
ok(struct.tiers === 3 && struct.tierNames.join('') === '初会默契同心',
  '共斗默契三档齐备（初会 / 默契 / 同心）', struct);
ok(struct.need === 4 && struct.win === 2, '合击需 4 下、夹击窗口 2 秒', struct);
ok(struct.fns.length === 0, 'P2-3 调试钩子全部暴露', struct.fns);

await page.evaluate(() => { window.__FR.setCoopTie(0); });

// 进一张安静的战斗图：关掉剧情与自主刷怪，场上只有我们摆的那几只
await page.evaluate(() => {
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.muteStory(true);
  window.__FR.setSpawn(false);
});
await wait(500);
const inMap = await page.evaluate(() => ({ state: window.__FR.stats().state, hasPlayer: !!window.__FR.G.player }));
ok(inMap.state === 'play' && inMap.hasPlayer, '进入战斗图并处于 play（后续几组都在同一个战场里做）', inMap);

// ---------- A 组：夹击 ----------
const A = await page.evaluate(() => {
  const g = window.__FR.G;
  const out = {};
  const setup = (o) => {
    o = o || {};
    g.enemies.length = 0; g.texts.length = 0;
    window.__FR.spawnNear(200, 100, 'wolf', !!o.elite, 5000);
    const e = g.enemies[g.enemies.length - 1];
    g.coopRole = 'host';
    g.time = 50; g._tieCd = o.cd == null ? -99 : o.cd;
    e._hitMark = { me: -99, pt: -99 }; e._cross = 0;
    return e;
  };
  const hit = (e, partner, dt) => { g.time += (dt == null ? 0.1 : dt); window.__FR.coopMark(e._id, partner); };

  // A1 单人连打十下：永不成立
  let e = setup();
  for (let i = 0; i < 10; i++) hit(e, false);
  out.solo = window.__FR.crossOf(e._id);

  // A2 我方一下 + 队友一下（0.3s 内）：成立
  e = setup();
  hit(e, false, 0.2); hit(e, true, 0.3);
  out.duo = window.__FR.crossOf(e._id);

  // A3 超窗（3 秒后队友才补）：不成立
  e = setup();
  hit(e, false, 0.2);
  out.gapBefore = window.__FR.crossOf(e._id).cross;
  hit(e, true, 3.0);
  out.gapAfter = window.__FR.crossOf(e._id).cross;

  // A4 夹击 vs 普通：罩被扣掉多少（每次先清干净上一笔）
  e = setup();
  const wardOf = (crossed) => {
    e._hitMark = { me: -99, pt: -99 }; e._cross = 0;
    if (crossed) { hit(e, false, 0.1); hit(e, true, 0.1); }
    else { hit(e, false, 0.1); hit(e, false, 0.1); }
    window.__FR.setWard(e._id, 1.0);
    const before = e.ward;
    window.__FR.damageEnemyById(e._id, 1000);
    return Math.round(before - e.ward);
  };
  out.wardPlain = wardOf(false);
  out.wardCross = wardOf(true);

  // A5 「夹击」两个字只在精英/Boss 上喊：小怪不喊
  e = setup({ elite: false });
  g.texts.length = 0;
  hit(e, false, 0.1); hit(e, true, 0.1);
  out.mobTexts = g.texts.filter(t => t.text === '夹击').length;
  out.mobCross = window.__FR.crossOf(e._id).cross > 0;

  e = setup({ elite: true });
  g.texts.length = 0;
  hit(e, false, 0.1); hit(e, true, 0.1);
  out.eliteTexts = g.texts.filter(t => t.text === '夹击').length;

  g.coopRole = null;
  return out;
});
ok(A.solo.cross <= 0, '单人连打十下：夹击不成立（对单机零影响）', A.solo);
ok(A.duo.cross > 0, '我方与队友在两秒内各出一手：夹击成立', A.duo);
ok(A.gapBefore <= 0 && A.gapAfter <= 0, '隔了三秒才补上第二手：夹击不成立（窗口真在起作用）', A);
ok(A.wardPlain > 0 && A.wardCross / A.wardPlain > 1.7,
  '夹击时护体灵光扣得更快（实测 ≥1.7 倍）', { plain: A.wardPlain, cross: A.wardCross, k: +(A.wardCross / A.wardPlain).toFixed(2) });
ok(A.mobCross === true && A.mobTexts === 0, '小怪也吃夹击加成，但不喊字（一屏二十六只同时喊等于没喊）', A);
ok(A.eliteTexts === 1, '精英夹击时报一声「夹击」', A);

// A6 真实联机链路：客机的命中上报（t:'hit'）必须被标成「队友打的」。
// 这一条是整套机制的地基 —— 少了 src:'partner'，真实对局里夹击永远不会成立，
// 而用 coopMark(id, true) 直接标一笔的测试又会全绿，问题被完美掩盖。
const A6 = await page.evaluate(() => {
  const g = window.__FR.G;
  g.enemies.length = 0;
  window.__FR.spawnNear(200, 100, 'wolf', true, 5000);
  const e = g.enemies[g.enemies.length - 1];
  g.coopRole = 'host'; g.time = 80;
  e._hitMark = { me: -99, pt: -99 }; e._cross = 0;
  const hp0 = e.hp;
  window.Coop.onData('peer-x', { t: 'hit', id: e._id, dmg: 50 });
  const m1 = e._hitMark;
  // 队友那一笔落下后，我方再补一手，夹击应当成立
  window.__FR.coopMark(e._id, false);
  return { ptSet: m1.pt > 0, meSet: m1.me, hpDropped: e.hp < hp0, cross: window.__FR.crossOf(e._id).cross };
});
ok(A6.ptSet && A6.hpDropped, '队友的命中上报（t:hit）真的落在权威怪身上，并记成「队友打的」', A6);
ok(A6.cross > 0, '真实上报链路下夹击能成立（不只是测试用的 coopMark 能）', A6);

// ---------- B 组：合击 ----------
const B = await page.evaluate(() => {
  const g = window.__FR.G;
  const out = {};
  window.__FR.setCoopTie(0);
  const setup = (o) => {
    o = o || {};
    g.enemies.length = 0; g.texts.length = 0;
    window.__FR.spawnNear(200, 100, 'wolf', !!o.elite, 5000);
    const e = g.enemies[g.enemies.length - 1];
    g.coopRole = 'host';
    g.time = 50; g._tieCd = o.cd == null ? -99 : o.cd;
    e._hitMark = { me: -99, pt: -99 }; e._cross = 0;
    return e;
  };
  const alt = (e, n, dt) => {
    for (let i = 0; i < n; i++) {
      g.time += (dt == null ? 0.2 : dt); window.__FR.coopMark(e._id, false);
      g.time += (dt == null ? 0.2 : dt); window.__FR.coopMark(e._id, true);
    }
  };

  // B1 小怪：交替二十下也不出合击
  let e = setup({ elite: false });
  out.mobBefore = window.__FR.coopTieN();
  alt(e, 10);
  out.mobAfter = window.__FR.coopTieN();

  // B2 精英：交替够数就出手
  e = setup({ elite: true });
  out.eliteBefore = window.__FR.coopTieN();
  alt(e, 2);
  out.eliteAfter = window.__FR.coopTieN();
  out.cdAfter = window.__FR.tieState().cdLeft;
  out.topText = g.texts.map(t => t.text).filter(t => /^合击/.test(t));

  // B3 真伤：直接出手一次，量掉的血
  e = setup({ elite: true });
  const hp0 = e.hp;
  const r = window.__FR.tieFire(e._id);
  out.tie = r;
  out.hpDrop = Math.round(hp0 - e.hp);
  out.pctOf = +(out.hpDrop / (e.maxhp || 1) * 100).toFixed(2);

  // B4 CD 内再按一次：拒绝
  out.second = window.__FR.tieFire(e._id);

  // B5 单人（无联机角色）：交替二十下，默契一点不涨
  window.__FR.setCoopTie(0);
  e = setup({ elite: true });
  g.coopRole = null;
  for (let i = 0; i < 20; i++) {
    g.time += 0.2; window.__FR.coopMark(e._id, false);
    g.time += 0.2; window.__FR.coopMark(e._id, true);
  }
  out.soloTie = window.__FR.coopTieN();
  g.coopRole = null;
  return out;
});
ok(B.mobBefore === B.mobAfter, '小怪再多交替出手也不出合击（合击只打硬仗）', B);
ok(B.eliteAfter > B.eliteBefore, '精英上交替命中够数：合击出手并记一次默契', B);
ok(B.cdAfter > 0, '合击出手后进入冷却', B);
ok(B.topText.length >= 1, '合击在场上留下「合击 N」的飘字', B);
ok(B.tie && B.tie.dmg >= 120, '合击真伤不低于 120 的兜底', B.tie);
ok(B.pctOf >= 0.5, '一记合击至少啃掉目标 0.5% 气血（罩在时按六成算）', { pct: B.pctOf, drop: B.hpDrop });
ok(B.second && B.second.blocked === 'cd', '冷却期内再触发被拒（CD 真的在挡）', B.second);
ok(B.soloTie === 0, '单人环境下默契一点不涨（联机机制不泄漏到单机）', B);

// ---------- C 组：三档默契 ----------
const C = await page.evaluate(() => {
  const out = [];
  for (const n of [0, 5, 6, 19, 20, 200]) {
    window.__FR.setCoopTie(n);
    const s = window.__FR.tieState();
    out.push({ n, tier: s.tier, name: s.name, cd: s.cd, pct: +s.pct.toFixed(3), ward: s.ward, tieWin: s.tieWin, next: s.next });
  }
  window.__FR.setCoopTie(0);
  return out;
});
const at = n => C.find(x => x.n === n);
ok(at(0).name === '初会' && at(5).name === '初会', '合击 0~5 次：初会', C);
ok(at(6).name === '默契' && at(19).name === '默契', '合击 6~19 次：默契', C);
ok(at(20).name === '同心' && at(200).name === '同心', '合击 20 次以上：同心', C);
ok(at(0).cd === 9 && at(0).pct === 0.012, '初会：冷却 9 秒、一记 1.2% 气血', at(0));
ok(at(6).cd === 7 && at(6).pct === 0.02, '默契：冷却 7 秒、一记 2%（升档有实感）', at(6));
ok(at(20).cd === 5, '同心：冷却 5 秒（合击更频繁）', at(20));
ok(at(0).ward === 1.8 && at(6).ward === 2.2, '默契起夹击破罩倍率 1.8 → 2.2', { a: at(0).ward, b: at(6).ward });
ok(at(5).next && at(5).next.left === 1 && at(19).next.left === 1, '「再差几次」算得准（5→差1、19→差1）', C);
ok(at(200).next === null, '同心已是顶档，没有下一档', at(200));

// ---------- D 组：存档 ----------
const D = await page.evaluate(() => {
  window.__FR.setCoopTie(3);
  window.__FR.addCoopTie();
  const raw = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  const g = window.__FR.G;
  // 合击真的会写盘：清掉内存值再从 localStorage 读回来对
  const n = window.__FR.coopTieN();
  window.__FR.addCoopWin();
  const raw2 = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { mem: n, disk: raw && raw.coop, winDisk: raw2 && raw2.coop, peers: !!document.getElementById('coopTie') };
});
ok(D.disk && D.disk.tie === 4, '合击次数落盘（1+3=4）', D.disk);
ok(D.winDisk && D.winDisk.win === 1, '并肩胜场也落盘', D.winDisk);

// 老存档（完全没有 coop 字段）读进来要补零账，而不是报错或变成 NaN
const p2 = await ctx.newPage();
p2.on('pageerror', e => errs.push('OLD PAGEERR ' + e.message));
await p2.addInitScript(() => {
  const k = 'fanren_save_v1';
  const s = JSON.parse(localStorage.getItem(k) || '{}');
  delete s.coop;                       // 模拟老档：这一批之前根本没有这个字段
  s.cultivate = { level: 30, xp: 0, skills: { sword: 3 } };
  s.cleared = ['houshan'];
  localStorage.setItem(k, JSON.stringify(s));
});
await p2.goto(URL, { waitUntil: 'load' });
await p2.waitForFunction(() => !!window.__FR && !!window.Coop, { timeout: 20000 });
const old = await p2.evaluate(() => ({ n: window.__FR.coopTieN(), w: window.__FR.coopWinN(), tier: window.__FR.tieState().name, lv: window.__FR.G && window.__FR.G.player ? window.__FR.G.player.level : null }));
ok(old.n === 0 && old.w === 0 && old.tier === '初会', '老存档没有 coop 字段：补零账，落在「初会」档', old);
await p2.close();

// ---------- E 组：联机面板 ----------
await page.evaluate(() => {
  window.__FR.setCoopTie(12);
  window.__FR.toTitle();
});
await wait(300);
const uiClosed = await page.evaluate(() => {
  const el = document.getElementById('coopTie');
  return { exists: !!el, text: el ? el.textContent.trim() : '' };
});
ok(uiClosed.exists, '联机面板里有共斗默契那一块', uiClosed);
await page.evaluate(() => document.getElementById('coopBtn').click());
await wait(400);
const ui = await page.evaluate(() => {
  const el = document.getElementById('coopTie');
  const bar = el && el.querySelector('.ct-bar i');
  const s = window.__FR.tieState();
  return {
    text: el ? el.textContent.replace(/\s+/g, ' ').trim() : '',
    barW: bar ? bar.style.width : null,
    head: el && el.querySelector('.ct-head b') ? el.querySelector('.ct-head b').textContent : '',
    tier: s.name, n: s.n, next: s.next
  };
});
ok(/共斗默契/.test(ui.head) && ui.tier === '默契', '面板报出当前档位（默契）', ui);
ok(new RegExp('合击 12 次').test(ui.text), '面板报出合击次数', ui.text.slice(0, 120));
ok(/再合击 8 次到「同心」/.test(ui.text), '面板报出到下一档还差几次', ui.text.slice(0, 160));
ok(ui.barW && parseInt(ui.barW, 10) > 0 && parseInt(ui.barW, 10) < 100, '进度条按当前档内进度填充（0~100 之间）', ui.barW);
await page.evaluate(() => { const c = document.getElementById('coopClose'); if (c) c.click(); });
await wait(200);

ok(errs.length === 0, '页面无报错', errs.slice(0, 6));

await b.close();

console.log('\n== 批次 7 · P2-3 双人合击 + 协作解锁 ==');
if (bad.length) { console.log('失败项：'); for (const m of bad) console.log('  ✗ ' + m); }
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
process.exit(fail ? 1 : 0);
