// 回归测试：批次22「历练岁月（按行为记账）+ 静修际遇一次性 + 满修为可静养产绿液」
//
// 三件事：
//   A 际遇按钮演完就消失 —— repeat:true 的小事按设计不写 save.met，
//     菜单「待办」必须主动排除，否则百药园那个受伤弟子永远挂在静修页。
//   B 满修为 / 灵气已尽照样能闭关静养：不涨修为、不碰突破信号，
//     但照扣洞府租、照凝绿液；撞境界门那一次也补上绿液。
//   C 历练岁月是本世累计的行为账（落存档、转世清零），与「入道年数」那本
//     境界现推的道行账并存：进图/扫荡/静修/洞府/坊市各按天数，炼丹按丹方 days。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';

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

const game = fs.readFileSync(join(root, 'js', 'game.js'), 'utf8');
const recipes = fs.readFileSync(join(root, 'js', 'recipes.js'), 'utf8');

// ---------- A 静态：际遇按钮排除 repeat ----------
const encFn = (game.match(/function encCondOkNoNpc\(e\) \{[\s\S]*?\n  \}/) || [''])[0];
ok(/if \(e\.repeat\) return false;/.test(encFn), '静修页「际遇」按钮排除 repeat:true 的小事（否则演完又生成）', encFn.slice(0, 200));
ok(/function pendingEncOf\(mapId\)[\s\S]{0,200}\.filter\(encCondOkNoNpc\)/.test(game), '待办按钮走 encCondOkNoNpc');

// ---------- B 静态：满修为可静养 ----------
ok(/<button class="btn small" data-rest="1">闭关一次<\/button>/.test(game), '闭关按钮不再被 capped||atGate 禁用');
ok(!/data-rest="1"[\s\S]{0,80}disabled/.test(game), '闭关按钮上没有 disabled');
const doRestFn = (game.match(/function doRest\(times\) \{[\s\S]*?\n  \}/) || [''])[0];
ok(!/if \(lv >= c\.capLevel\) break;/.test(doRestFn), '灵气已尽不再 early-break');
ok(/if \(!capped && !atGate\) \{[\s\S]{0,300}addCultivateXp/.test(doRestFn), '满修为跳过 addCultivateXp（不碰突破信号）');
ok(/idle\+\+;   \/\/ 静养/.test(doRestFn), '静养单独计数');
ok(/if \(gated\) break;/.test(doRestFn) && /if \(hasBottle\) save\.greenLiquid/.test(doRestFn), '撞境界门那次也先凝绿液再 break');

// ---------- C 静态：历练岁月 ----------
ok(/version: 5,[\s\S]{0,600}erosDays: 0,/.test(game), 'defaultSave 有 erosDays');
ok(/erosDays: Math\.max\(0, Math\.floor\(\+s\.erosDays \|\| 0\)\),/.test(game), 'loadSave 清洗 erosDays（禁 |0）');
ok(/save\.erosDays = 0;   \/\/ 历练岁月是「这一世」的账/.test(game), 'resetAllProgress 清零 erosDays（本世账）');
ok(/const EROS_DAYS = \{[\s\S]{0,900}encounter: 1/.test(game) && /beidanHalf: 183/.test(game), '动作→天数表齐全（含备丹/冲关里程碑）');
ok(/function addErosDays\(n\)[\s\S]{0,300}writeSave\(\)/.test(game), '记账即落盘（洞府/坊市入口原本不写档）');
ok(/addErosDays\(EROS_DAYS\.enterMap\)/.test(game), '进战斗图计一日');
ok(/addErosDays\(EROS_DAYS\.sweep \* SWEEP_N\)/.test(game), '扫荡按趟计（SWEEP_N 趟 = N 日）');
ok(/addErosDays\(EROS_DAYS\.rest \* n\)/.test(game), '闭关/静养按次数计');
ok(/addErosDays\(EROS_DAYS\.cave\)/.test(game) && /addErosDays\(EROS_DAYS\.shop\)/.test(game), '进出洞府/坊市各计一日');
ok(/addErosShichen\(Math\.max\(1, Math\.floor\(\+\(r\.hours \|\| 1\) \|\| 1\)\)\)/.test(game), '开炉按丹方 hours 记时辰细账（不再记成整日）');
ok(/addErosDays\(EROS_DAYS\.finish\)/.test(game) && /addErosDays\(EROS_DAYS\.encounter\)/.test(game), '通关与际遇各计一日');
ok(/<i>历练岁月<\/i><b>' \+ erosText\(\)/.test(game), '静修页属性格并列显示历练岁月');
ok(/class="jz-row eros"/.test(game), '岁月纪年表末尾有历练汇总行');
// —— 三层时间分离（原著考据）：单炉一个时辰 / 备齐丹药半年 / 服丹冲关一年 ——
ok(/id: 'r_zhuji'[^\n]*rate: 0\.25, hours: 1/.test(recipes), '筑基丹单炉 1 时辰、初期成丹率 0.25（原著十颗成三颗≈30%）');
ok(/id: 'r_tenglong'[^\n]*hours: 1/.test(recipes), '腾龙丹单炉也记 1 时辰（六十年苦修是整段周期，不摊到每炉）');
ok(!/days: 3650|days: 21900/.test(recipes), '丹方里不再有「把整段备药周期当单炉耗时」的 3650/21900 日');
ok((recipes.match(/kind: 'alchemy'[^\n]*hours: \d+/g) || []).length === 7, '七味丹方都有 hours（时辰）字段');
ok(/const BREAK_CLOSE_DAYS = \{ 36: 365, 56: 730, 82: 1095, 112: 2190 \}/.test(game), '四道破境门各有闭关岁月：筑基365/结丹730/元婴1095/化神2190 日');
ok(/beidanHalf: 183/.test(game) && /breakBase: 365/.test(game), '备丹半年=183 日、冲关兜底=365 日两个里程碑常量');
ok(/function breakCloseDays\(b\)/.test(game) && /addErosDays\(breakCloseDays\(gate\)\)/.test(game) && /addErosDays\(breakCloseDays\(b\)\)/.test(game), '冲关记账接进剧情图与洞府直冲两条成功路径');
ok(/function beidanProgress\(justMade\)[\s\S]{0,450}addErosDays\(EROS_DAYS\.beidanHalf\)/.test(game), '首次炼成筑基丹补记半年里程碑');
ok(/if \(r\.out === 'zhuji'\) beidanProgress\(true\)/.test(game), '开炉成功分支挂上备丹里程碑');
ok(/if \(r\.out === 'zhuji'\) beidanProgress\(\)/.test(game), '炸炉也算进备丹半年（前二十几次全废）');
// 时辰细账：三处对称 + 进位
ok(/erosShichen: 0,/.test(game) && /beidanDone: false,/.test(game), 'defaultSave 有时辰细账与备丹里程碑字段');
ok(/erosShichen: Math\.min\(11, Math\.max\(0, Math\.floor\(\+s\.erosShichen \|\| 0\)\)\)/.test(game), 'loadSave 清洗时辰细账到 0~11');
ok(/save\.erosShichen = 0;/.test(game) && /save\.beidanDone = false;/.test(game), 'resetAllProgress 清零本世账（时辰、备丹）');
ok(/function addErosShichen\(n\)[\s\S]{0,350}save\.erosDays = erosDays\(\) \+ days/.test(game), '时辰满 12 进位成一日');
// 冷却：只拦 UI 点击，不进 craftRecipe（闸门/挂机不受影响）
ok(/const CRAFT_COOL_MS = 1500/.test(game), '单炉冷却 1.5 秒（只拦 UI 连点）');
ok(/function craftOnCool\(\)/.test(game) && /craftOnCool\(\)/.test(game), '冷却判定存在');
ok(/if \(rr && rr\.kind === 'alchemy' && craftOnCool\(\)\)/.test(game), '冷却只在 UI 点击层拦截炼丹');
ok(!/function craftRecipe\(rid\)[\s\S]{0,3200}craftOnCool/.test(game), 'craftRecipe 本体不含冷却闸门（调试口同步连开不阻塞）');
ok(/^    beidan: \{[\s\S]{0,500}seal: '备丹'/m.test(fs.readFileSync(join(root, 'js', 'chronicle.js'), 'utf8')), '纪年卡新增「备丹」三屏');

// ==================== 运行时 ====================
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(URL);
await page.waitForFunction(() => !!window.__FR, null, { timeout: 15000 });
await page.evaluate((k) => localStorage.removeItem(k), SAVE_KEY);
await page.reload();
await page.waitForFunction(() => !!window.__FR, null, { timeout: 15000 });
await page.evaluate(() => window.__FR.muteStory && window.__FR.muteStory(true));

// R1 新档从 0 记起，两本账分开
const r1 = await page.evaluate(() => {
  const F = window.__FR;
  return { d: F.erosDays(), y: F.yearNow(), keys: F.saveKeys().includes('erosDays'), dkeys: F.saveDefaultKeys().includes('erosDays'), tbl: F.erosTable() };
});
ok(r1.d === 0, '新档历练岁月从 0 日起', r1.d);
ok(r1.keys && r1.dkeys, 'erasDays 在 defaultSave 与实际存档里都在（三处对称的运行时侧）', r1);
ok(r1.tbl && r1.tbl.enterMap === 1 && r1.tbl.sweep === 1 && r1.tbl.rest === 1 && r1.tbl.cave === 1 && r1.tbl.shop === 1,
   '动作表各项为 1 日', r1.tbl);
const yearBefore = r1.y;

// R2 各入口各计一日（不重绘页签重复计）
const r2 = await page.evaluate(() => {
  const F = window.__FR;
  const seq = [];
  seq.push(['start', F.erosDays()]);
  F.enterMap('qixuan'); seq.push(['enterMap', F.erosDays()]);
  F.shop('buy');        seq.push(['shop', F.erosDays()]);
  F.cave('cuiping');    seq.push(['cave', F.erosDays()]);
  F.addErosDays(5);     seq.push(['add5', F.erosDays()]);
  return { seq, y: F.yearNow() };
});
ok(r2.seq[1][1] === 1, '进一次战斗图 +1 日', r2.seq);
ok(r2.seq[2][1] === 2, '进一次坊市 +1 日', r2.seq);
const shopStart = game.indexOf('function renderShop() {');
const shopFn = game.slice(shopStart, game.indexOf('\n  function ', shopStart + 10));
ok(shopStart >= 0 && !/addErosDays/.test(shopFn), '坊市切页签走 renderShop，不重复记账');
ok(r2.seq[3][1] === 3, '进一次洞府 +1 日', r2.seq);
ok(r2.seq[4][1] === 8, '直接记账 5 日可累加', r2.seq);
ok(Math.abs(r2.y - yearBefore) < 0.01, '历练岁月涨了，入道年数（道行账）没跟着动', { before: yearBefore, after: r2.y });

// R3 落盘：刷新后还在
await page.reload();
await page.waitForFunction(() => !!window.__FR, null, { timeout: 15000 });
const r3 = await page.evaluate(() => window.__FR.erosDays());
ok(r3 === 8, '刷新后历练岁月仍是 8 日（落过盘）', r3);

// R4 静修页显示两本账
const r4 = await page.evaluate(() => {
  const F = window.__FR;
  F.cave('cuiping');
  const tab = document.querySelector('[data-ctab="rest"]');
  if (tab) tab.click();
  const body = document.getElementById('caveBody') ? document.getElementById('caveBody').textContent : document.body.textContent;
  const shown = (body.match(/历练岁月\s*(\d+)\s*日/) || [])[1];
  return { clicked: !!tab, hasEros: /历练岁月/.test(body), hasYear: /入道年数/.test(body), shown: shown, now: F.erosDays() };
});
ok(r4.clicked && r4.hasEros && r4.hasYear, '静修页同时显示「入道年数」与「历练岁月」两栏', r4);
ok(Number(r4.shown) === r4.now && r4.now > 0, '显示当前历练天数（与存档一致）', r4);

// R5 静修际遇按钮：百药园草庐（huangfeng 来自 yaoyuan）那个 repeat 弟子不该再出现
const r5 = await page.evaluate(() => {
  const F = window.__FR;
  F.cave('huangfeng');
  const tab = document.querySelector('[data-ctab="rest"]');
  if (tab) tab.click();
  const btns = [...document.querySelectorAll('[data-enc]')].map(b => b.getAttribute('data-enc'));
  return { btns: btns, repeatShown: btns.includes('e_shang') };
});
ok(!r5.repeatShown, '静修页不再出现 repeat:true 的「受伤的守园弟子」按钮', r5);

// R6 满修为可静养：先给灵石 + 掌天瓶（否则 doRest 因灵石不足停、无瓶也不凝液）
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('fanren_save_v1'));
  raw.stones = 50000;
  raw.inventory = raw.inventory || {};
  raw.inventory.gupu = 1;
  localStorage.setItem('fanren_save_v1', JSON.stringify(raw));
});
await page.reload();
await page.waitForFunction(() => !!window.__FR, null, { timeout: 15000 });
const r6 = await page.evaluate(() => {
  const F = window.__FR;
  const before = F.erosDays();
  F.setLevel(1);
  F.setXp(999999);          // 修为顶到门口
  const xp0 = F.saveXp();
  F.cave('cuiping');
  const tab = document.querySelector('[data-ctab="rest"]');
  if (tab) tab.click();
  const btn = document.querySelector('[data-rest="1"]');
  const disabled = !!(btn && btn.disabled);
  const liquid0 = (function () { try { return JSON.parse(localStorage.getItem('fanren_save_v1')).greenLiquid || 0; } catch (e) { return 0; } })();
  if (btn && !btn.disabled) btn.click();
  const raw = JSON.parse(localStorage.getItem('fanren_save_v1'));
  return { disabled, liquid0, liquid1: raw.greenLiquid || 0, xp0: xp0, xp1: raw.cultivate && raw.cultivate.xp, d0: before, d1: raw.erosDays };
});
ok(r6.disabled === false, '修为顶在门口时闭关按钮仍可点', r6);
ok(r6.liquid1 > r6.liquid0, '静养照样凝出绿液（原来撞门那次 break 在产液之前）', r6);
ok(r6.xp1 <= r6.xp0, '静养不涨修为（xp 没有上升）', r6);
ok(r6.d1 > r6.d0, '静养也记历练岁月', r6);

// ===== R7 时辰细账：单炉 1 时辰，12 时辰进位成 1 日 =====
// 用调试口清本世账（不 reload：reload 会把旧内存态写回 localStorage，清档被复活）
await page.evaluate(() => window.__FR.erosReset());
const r7 = await page.evaluate(() => {
  const F = window.__FR;
  const a = { d: F.erosDays(), s: F.erosShichen() };
  const r = F.addErosShichen(1);            // 1 时辰
  const r11 = F.addErosShichen(10);         // 累到 11 时辰
  const r12 = F.addErosShichen(1);          // 第 12 时辰 → 进位成 1 日
  return { a, r, r11, r12, end: { d: F.erosDays(), s: F.erosShichen() } };
});
ok(r7.a.d === 0 && r7.a.s === 0, '新档时辰细账从 0 起', r7.a);
ok(r7.r.days === 0 && r7.r.shichen === 1, '单炉记 1 时辰，不记成 1 日', r7.r);
ok(r7.r11.shichen === 11 && r7.r11.days === 0, '累到 11 时辰仍是 0 日', r7.r11);
ok(r7.r12.days === 1 && r7.r12.shichen === 0, '第 12 时辰进位成 1 日、余数归零', r7.r12);

// ===== R8 备丹半年里程碑：一次入账 + 转世清零 =====
const r8 = await page.evaluate(() => {
  const F = window.__FR;
  const before = F.erosDays();
  const first = F.beidanNow();              // 首次：+183
  const done1 = F.beidanDone();
  const second = F.beidanNow();             // 再次：不重复
  return { before, first, done1, second, after: F.erosDays() };
});
ok(r8.first - r8.before === 183, '首次炼成筑基丹补记半年=183 日', r8);
ok(r8.done1 === true, '备丹里程碑本世标记已置位', r8);
ok(r8.second === r8.first, '再次触发不重复记账（一次性）', r8);
// 落盘后刷新仍在
await page.reload();
await page.waitForFunction(() => !!window.__FR, null, { timeout: 15000 });
const r8b = await page.evaluate(() => ({ d: window.__FR.erosDays(), done: window.__FR.beidanDone() }));
ok(r8b.d === 184 && r8b.done === true, '备丹里程碑落盘（刷新后 1 日+183=184 仍在）', r8b);

// ===== R9 冷却只拦 UI、不阻塞调试口 =====
// 清本世账用调试口（saveApi.clear 会连 seen 一起清，但这里只要干净的本世账）
const r9 = await page.evaluate(() => {
  const F = window.__FR;
  F.erosReset();
  return { ms: F.craftCoolMs(), left: F.craftCoolLeft(), before: F.erosDays() * 12 + F.erosShichen() };
});
ok(r9.ms === 1500, '单炉冷却常量为 1.5 秒', r9.ms);
ok(r9.left === 0, '初始无冷却（调试口不自动触发）', r9);
// craftRecipe 本体不含 craftOnCool 由上面的静态断言证明；运行时再确认调试口调用不启动冷却：
// 用 addErosShichen 模拟「调试口连续 12 炉的记账」，冷却态必须始终为 0（脚本连开不被拖）。
const r9b = await page.evaluate(() => {
  const F = window.__FR;
  for (let i = 0; i < 12; i++) F.addErosShichen(1);
  return { after: F.erosDays() * 12 + F.erosShichen(), coolLeft: F.craftCoolLeft() };
});
ok(r9b.after - r9.before === 12 && r9b.coolLeft === 0, '连开 12 炉记账不启动冷却（闸门/挂机不受影响）', { r9, r9b });

// ===== R10 冲关闭关岁月梯度（静态表 + 兜底） =====
const r10 = await page.evaluate(() => window.__FR.erosBreakDays());
ok(r10 && r10['36'] === 365 && r10['56'] === 730 && r10['82'] === 1095 && r10['112'] === 2190,
   '四道门闭关岁月梯度正确（筑基一年→化神六年）', r10);

ok(errors.length === 0, '全程无 JS 报错', errors.slice(0, 4));

await browser.close();
console.log('历练岁月 / 静修际遇 / 满修为静养 回归：' + pass + ' 通过，' + fail + ' 失败');
if (fail) { console.log('失败项：\n - ' + bad.join('\n - ')); process.exit(1); }
