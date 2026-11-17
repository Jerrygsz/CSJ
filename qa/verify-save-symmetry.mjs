// 回归测试：存档字段对称（P0 · 批次 10）
//
// 起因：defaultSave 里有 stoneBurned / deathLost / alchemy / gardenCharge / gardenTick 五个字段，
// 但 loadSave 重建 save 对象时漏了它们。各处虽有 `|| {}` 兜底不崩，可一旦读档就被当成空账：
// 道陨掉的道具再也赎不回、炼丹熟手加成清零、药圃百年进度归零 —— 玩得越久丢得越多，且无声。
//
// 本闸守四件事：
// A  新档：loadSave 重建对象的键集 ⊇ defaultSave 的键集（一个都不能漏）
// B  读档：带真数据 / 带脏数据的老档重载后，五个字段被正确读回与清洗
// C  转世：本世账（deathLost/alchemy/wushuai/allyDead/allyOwe/gardenTick）清空，
//          生涯累计 stoneBurned 按原设计保留
// D  主循环：连错进安全模式、干净帧恢复（旧版 _loopErrN 只增不减，9 次偶发错永久关特效）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';
const SAVE_KEY = 'fanren_save_v1';

let pass = 0, fail = 0;
const bad = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; return true; }
  fail++; bad.push(msg + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  return false;
}

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 400, height: 812 } });
const errs = [];
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

// ---------- A 组：新档键集对称 ----------
const A = await page.evaluate(() => {
  const F = window.__FR;
  const def = F.saveDefaultKeys(), live = F.saveKeys();
  return {
    missing: def.filter(k => live.indexOf(k) < 0),
    fields: F.saveFields()
  };
});
ok(A.missing.length === 0, 'loadSave 重建后包含 defaultSave 全部字段', A.missing);
ok(A.fields.stoneBurned === 0 && A.fields.alchemy && A.fields.alchemy.n === 0,
  '新档 stoneBurned / alchemy.n 为 0', A.fields);
ok(A.fields.deathLost && !Object.keys(A.fields.deathLost).length
  && A.fields.gardenCharge && !Object.keys(A.fields.gardenCharge).length && A.fields.gardenTick === 0,
  '新档 deathLost / gardenCharge 空账、gardenTick=0', A.fields);

// ---------- B 组：老档读回与清洗 ----------
// 直接塞一份「带真数据 + 带脏数据」的存档再 reload，走真实 loadSave 路径。
await page.evaluate((key) => {
  localStorage.setItem(key, JSON.stringify({
    version: 5,
    stones: 1234,
    // 真的：十几位累计灵石 + 道陨掉落账 + 炼丹熟手 + 药圃进度 + 零头
    stoneBurned: 123456789012,
    deathLost: { xutian: { items: { i_a: 3, i_b: 0, i_c: -2 } }, jiedan: 'bad' },
    alchemy: { n: 17 },
    gardenCharge: { g1: 55, g2: 999, g3: -7 },
    gardenTick: 0.42,
    allyDead: { p_tihun: 1700000000000 },
    allyOwe: { p_yinyue: true },
    wushuai: { n: 2, log: { a: 1 } }
  }));
}, SAVE_KEY);
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

const B = await page.evaluate(() => window.__FR.saveFields());
ok(B.stoneBurned === 123456789012, '累计灵石十余位不被 |0 截断', B.stoneBurned);
ok(B.deathLost && B.deathLost.xutian && B.deathLost.xutian.items
  && B.deathLost.xutian.items.i_a === 3, '道陨道具账读回', B.deathLost);
ok(B.deathLost && !B.deathLost.xutian.items.i_b && !B.deathLost.xutian.items.i_c,
  '道陨账里 0 / 负数件数被洗掉', B.deathLost);
ok(B.deathLost && !B.deathLost.jiedan, '非对象形态的道陨账被丢弃', B.deathLost);
ok(B.alchemy && B.alchemy.n === 17, '炼丹熟手次数读回', B.alchemy);
ok(B.gardenCharge && B.gardenCharge.g1 === 55 && B.gardenCharge.g2 === 99 && !B.gardenCharge.g3,
  '药圃进度读回并 clamp 到 99 / 洗掉负数', B.gardenCharge);
ok(B.gardenTick === 0.42, '药圃零头读回', B.gardenTick);

// 脏数据档：NaN / 负数 / 超范围，全应回退成安全默认
await page.evaluate((key) => {
  const s = JSON.parse(localStorage.getItem(key) || '{}');
  s.stoneBurned = -5; s.alchemy = { n: 'x' }; s.gardenTick = 7;
  s.gardenCharge = { g1: -1 }; s.deathLost = null;
  localStorage.setItem(key, JSON.stringify(s));
}, SAVE_KEY);
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
const Bdirty = await page.evaluate(() => window.__FR.saveFields());
ok(Bdirty.stoneBurned === 0 && Bdirty.alchemy.n === 0 && Bdirty.gardenTick === 0,
  '脏的累计/次数/零头回 0', Bdirty);
ok(Bdirty.deathLost && !Object.keys(Bdirty.deathLost).length && !Object.keys(Bdirty.gardenCharge).length,
  '脏的空账回空对象', Bdirty);

// ---------- C 组：转世清账 ----------
// 先用探针回填一份「本世有账」，再 clearProgress，验证该清的清、该留的留。
const Cbefore = await page.evaluate(() => {
  // 通过 localStorage 回填一份完整的本世账，再 reload loadSave
  const s = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  s.stoneBurned = 88888;
  s.deathLost = { xutian: { items: { i_a: 2 } } };
  s.alchemy = { n: 9 }; s.gardenTick = 0.5;
  s.wushuai = { n: 3, log: { a: 1 } };
  s.allyDead = { p_tihun: 1 }; s.allyOwe = { p_yinyue: true };
  localStorage.setItem('fanren_save_v1', JSON.stringify(s));
  return true;
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
const C = await page.evaluate(() => {
  window.__FR.clearProgress();
  return window.__FR.saveFields();
});
ok(C.deathLost && !Object.keys(C.deathLost).length, '转世清空 deathLost', C.deathLost);
ok(C.alchemy && C.alchemy.n === 0, '转世清空 alchemy.n', C.alchemy);
ok(C.wushuai && C.wushuai.n === 0 && !Object.keys(C.wushuai.log || {}).length, '转世清空 wushuai', C.wushuai);
ok(C.allyDead && !Object.keys(C.allyDead).length && C.allyOwe && !Object.keys(C.allyOwe).length,
  '转世清空随行者殒落/欠费台账', C);
ok(C.gardenTick === 0, '转世清空药圃零头', C.gardenTick);
ok(C.stoneBurned === 88888, '转世保留生涯累计 stoneBurned（与 coop 同类不清）', C.stoneBurned);

// ---------- D 组：主循环安全模式可逆 ----------
const D = await page.evaluate(() => {
  const F = window.__FR;
  const a = F.injectLoopErr(9);          // 连错 9 帧 → 进安全模式
  const bMid = F.cleanFrames(3);         // 3 干净帧：还不够恢复
  const b = F.cleanFrames(177);          // 累计 180 干净帧 → 恢复
  const c = F.injectLoopErr(2);          // 偶发两帧：不该再进安全模式（连错语义）
  const d = F.cleanFrames(1);            // 一帧干净就清零
  return { a, bMid, b, c, d };
});
ok(D.a.safeMode === true && D.a.count > 8, '连错 9 帧进入安全模式', D.a);
ok(D.bMid.safeMode === true && D.bMid.okN >= 3, '少量干净帧还不恢复', D.bMid);
ok(D.b.safeMode === false && D.b.count === 0, '连续 180 干净帧自动恢复特效', D.b);
ok(D.c.safeMode === false && D.c.count === 2, '偶发两帧不再触发安全模式（连错非累计）', D.c);
ok(D.d.count === 0 && D.d.safeMode === false, '一帧干净即清零错误计数', D.d);

ok(errs.length === 0, '零 pageerror / console error', errs.slice(0, 5));

await b.close();
console.log('\n== 存档对称 · 批次 10 ==');
if (bad.length) { console.log('失败项：'); bad.forEach(m => console.log('  ✗ ' + m)); }
console.log('\nRESULT ' + pass + '/' + (pass + fail) + (fail ? '  有红' : '  全绿'));
process.exit(fail ? 1 : 0);
