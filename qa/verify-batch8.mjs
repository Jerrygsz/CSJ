// 回归测试：批次 8 · 同行纪（随行者的往来账 + 羁绊三档）
//
// 这一批的规则全是**纯逻辑**：场数只由「打完一张图时带的是谁」决定，档位只由场数决定，
// 效果只是把本命绝学的 CD 乘一个数。所以整组断言不需要真的打一场仗 ——
// __FR.finishMapNow() 走的正是 finishMap 这条唯一收口（连破境图「关没闭成」的分支都在里面）。
//
// A 组  结构：三个档位 / 四个探针齐全
// B 组  档位边界：0·7·8·24·25·200 与「再几场」的算头
// C 组  记场：带一只记一场、不带不记、两个人各记各的、破境图关没闭成不记
// D 组  生死之交：25 场的人殒了，打完这一图自个儿回来；没到那一档的不回来
// E 组  殒落计数：走 hurtAlly 真死一次，down 才 +1
// F 组  本命 CD：三档乘数 + 源码真的把 ownerId 接进 tickAllySkill
// G 组  洞府：灵宠 / 同伴页的标签与那一行字、静修页「同行」一节的排序与条数
// H 组  双皮：金皮亮字、水墨皮墨字（别拿一个皮的经验推另一个皮）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

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
await page.waitForFunction(() => !!window.__FR && !!window.ALLY_SKILLS, { timeout: 20000 });

// ---------- A 组：结构与档位表 ----------
const A = await page.evaluate(() => ({
  tiers: window.__FR.bondTiers(),
  miss: ['bond', 'bondCd', 'bondTiers', 'togetherRows', 'setTogether', 'allySkCd',
    'allyDeadMap', 'setAllyDead', 'giveMate', 'clearAlly', 'hitAlly']
    .filter(k => typeof window.__FR[k] !== 'function'),
  petIds: (window.PETS || []).length, mateIds: (window.MATES || []).length
}));
ok(A.miss.length === 0, '同行纪探针全部暴露', A.miss);
ok(A.tiers.length === 3 && A.tiers.map(t => t.label).join('') === '初识相熟生死之交',
  '三档齐备且顺序为 初识 → 相熟 → 生死之交', A.tiers);
ok(A.tiers[0].n === 0 && A.tiers[1].n === 8 && A.tiers[2].n === 25,
  '三档门槛 0 / 8 / 25 场', A.tiers.map(t => t.n));
ok(A.tiers[0].cd === 1 && A.tiers[1].cd === 0.88 && A.tiers[2].cd === 0.78,
  '本命绝学 CD 乘数 1 / 0.88 / 0.78', A.tiers.map(t => t.cd));
ok(A.tiers[0].back === false && A.tiers[1].back === false && A.tiers[2].back === true,
  '只有生死之交有「自个儿回来」那一条', A.tiers.map(t => t.back));

// 新档：这本账是空账，不因老档白送档位
const fresh = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { has: Object.prototype.hasOwnProperty.call(raw, 'together'), n: window.__FR.bond('p_tihun').n };
});
ok(fresh.n === 0, '新档读出来就是初识（0 场）', fresh);

// ---------- B 组：档位边界 ----------
const B = await page.evaluate(() => {
  const id = 'p_tihun', out = {};
  for (const n of [0, 7, 8, 24, 25, 200]) {
    const r = window.__FR.setTogether(id, n, 0);
    out[n] = { tier: r.tier, label: r.label, cd: window.__FR.bondCd(id), left: r.next ? r.next.left : null, nextLabel: r.next ? r.next.label : null };
  }
  return out;
});
ok(B[0].tier === 0 && B[7].tier === 0 && B[8].tier === 1 && B[24].tier === 1 && B[25].tier === 2 && B[200].tier === 2,
  '档位边界：0·7 初识 / 8·24 相熟 / 25·200 生死之交', { 0: B[0].tier, 7: B[7].tier, 8: B[8].tier, 24: B[24].tier, 25: B[25].tier, 200: B[200].tier });
ok(B[0].cd === 1 && B[7].cd === 1 && B[8].cd === 0.88 && B[25].cd === 0.78 && B[200].cd === 0.78,
  'CD 乘数跟着档位走（不是跟着场数线性变）', { 0: B[0].cd, 7: B[7].cd, 8: B[8].cd, 25: B[25].cd, 200: B[200].cd });
ok(B[0].left === 8 && B[8].left === 17 && B[25].left === null,
  '「再几场到下一档」算得准（0→差 8，8→差 17，25→到底了）', { 0: B[0].left, 8: B[8].left, 25: B[25].left });
ok(B[0].nextLabel === '相熟' && B[8].nextLabel === '生死之交',
  '下一档的名字对得上', { 0: B[0].nextLabel, 8: B[8].nextLabel });

// ---------- C 组：记场 ----------
// 进一张安静的战斗图：关掉剧情与自主刷怪，场上只有我们摆的那几只
await page.evaluate(() => {
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.muteStory(true);
  window.__FR.setSpawn(false);
});
await wait(400);
const inMap = await page.evaluate(() => ({ state: window.__FR.stats().state, map: window.__FR.G.map ? window.__FR.G.map.id : null }));
ok(inMap.state === 'play' && inMap.map === 'houshan', '进入战斗图并处于 play', inMap);

const C1 = await page.evaluate(() => {
  window.__FR.clearAlly();
  window.__FR.givePet('p_tihun');
  window.__FR.setTogether('p_tihun', 0, 0);
  window.__FR.finishMapNow();
  const r = window.__FR.bond('p_tihun');
  return { n: r.n, map: r.map, year: r.year, hasYear: r.year >= 0 };
});
ok(C1.n === 1, '带着一只打完一张图 → 记一场', C1);
ok(C1.map === 'houshan', '最后一仗落在刚打完那张图上', C1);
ok(C1.year >= 0 && Number.isInteger(C1.year), '记下那一年（入道年数，整数）', C1);

const C2 = await page.evaluate(() => {
  window.__FR.clearAlly();
  window.__FR.setTogether('p_tihun', 5, 0);
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.muteStory(true); window.__FR.setSpawn(false);
  window.__FR.finishMapNow();
  return window.__FR.bond('p_tihun').n;
});
ok(C2 === 5, '不带随行者打完一张图 → 一场不记（袋子躺着的不算同行）', { n: C2 });

const C3 = await page.evaluate(() => {
  window.__FR.clearAlly();
  window.__FR.givePet('p_tihun'); window.__FR.giveMate('m_yuanyao');
  window.__FR.setTogether('p_tihun', 0, 0); window.__FR.setTogether('m_yuanyao', 3, 0);
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.muteStory(true); window.__FR.setSpawn(false);
  window.__FR.finishMapNow();
  return { pet: window.__FR.bond('p_tihun').n, mate: window.__FR.bond('m_yuanyao').n };
});
ok(C3.pet === 1 && C3.mate === 4, '灵宠与同伴各记各的（互不顶替）', C3);

// 破境图：关没闭成（破境之物未齐）不算「一起走过」—— 人还在图里耗着
const C4 = await page.evaluate(() => {
  window.__FR.clearAlly();
  window.__FR.givePet('p_tihun'); window.__FR.setTogether('p_tihun', 0, 0);
  window.__FR.enterMap('zhuji', 'easy');
  window.__FR.muteStory(true); window.__FR.setSpawn(false);
  const before = window.__FR.bond('p_tihun').n;
  const r = window.__FR.finishMapNow();
  return { before, after: window.__FR.bond('p_tihun').n, blocked: r.pending === true, note: r.note };
});
ok(C4.blocked === true && /修为未达|未齐/.test(C4.note),
  '前提：筑基门这一趟真没闭成（停在关前：修为未达或物事未齐）', C4);
ok(C4.after === C4.before, '关没闭成的那一趟不记同行（胜场照记，同行不记）', C4);

// ---------- D 组：生死之交自个儿回来 ----------
const D1 = await page.evaluate(() => {
  window.__FR.clearAlly();
  window.__FR.givePet('p_tihun');
  window.__FR.setTogether('p_tihun', 25, 0);
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.muteStory(true); window.__FR.setSpawn(false);
  window.__FR.setAllyDead('p_tihun');
  const before = !!window.__FR.allyDeadMap()['p_tihun'];
  window.__FR.finishMapNow();
  return { before, after: !!window.__FR.allyDeadMap()['p_tihun'], n: window.__FR.bond('p_tihun').n };
});
ok(D1.before === true && D1.after === false, '生死之交殒了，带着他打完这一图就自个儿回来了', D1);

const D2 = await page.evaluate(() => {
  window.__FR.clearAlly();
  window.__FR.givePet('p_tihun');
  window.__FR.setTogether('p_tihun', 7, 0);
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.muteStory(true); window.__FR.setSpawn(false);
  window.__FR.setAllyDead('p_tihun');
  window.__FR.finishMapNow();
  return { after: !!window.__FR.allyDeadMap()['p_tihun'], n: window.__FR.bond('p_tihun').n };
});
ok(D2.after === true, '还没到生死之交（7 场）的，殒了还是得回洞府交钱', D2);
ok(D2.n === 8, '— 顺手确认这一趟照记一场（7 → 8，正好跨进「相熟」）', D2);

// ---------- E 组：殒落计数 ----------
// 换一只没殒过的来死：D 组把啼魂留在殒落台账里了，makeAlly 见到台账就会直接给个死身子。
const E = await page.evaluate(() => {
  window.__FR.god(false);
  window.__FR.clearAlly();
  window.__FR.givePet('p_liuyi');
  window.__FR.setTogether('p_liuyi', 2, 0);
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.muteStory(true); window.__FR.setSpawn(false);
  const before = { dead: !!(window.__FR.G.pet && window.__FR.G.pet.dead), down: window.__FR.bond('p_liuyi').down };
  const r = window.__FR.hitAlly(1e9);
  const b = window.__FR.bond('p_liuyi');
  return { before: before, dead: r.petDead, down: b.down, n: b.n, tierBefore: b.tier };
});
ok(E.before.dead === false && E.before.down === 0, '前提：这只进场时还活着、名下没有殒落记录', E.before);
ok(E.dead === true, '真把随行者打死了（走 hurtAlly 这条唯一入口）', E);
ok(E.down === 1, '殒落记一笔（"他替你死过几回"有一半就靠这个）', E);
ok(E.n === 2 && E.tierBefore === 0, '— 殒落不改场数、也不改档位', E);

// ---------- F 组：本命绝学的 CD ----------
const F = await page.evaluate(() => {
  const id = 'p_tihun';
  const base = (window.ALLY_SKILLS[id] || {}).cd;
  const out = {};
  for (const n of [0, 8, 25]) {
    window.__FR.setTogether(id, n, 0);
    out[n] = +(base * window.__FR.bondCd(id)).toFixed(4);
  }
  return { base, out };
});
ok(F.base > 0, '前提：这一只有本命绝学的基础 CD', F);
ok(Math.abs(F.out[0] - F.base) < 1e-6, '初识：本命 CD 就是原始值', F);
ok(Math.abs(F.out[8] - F.base * 0.88) < 1e-6 && Math.abs(F.out[25] - F.base * 0.78) < 1e-6,
  '相熟 ×0.88 / 生死之交 ×0.78', F);

const gsrc = readFileSync(join(root, 'js', 'game.js'), 'utf8');
ok((gsrc.match(/bondCdMul\(ownerId\)/g) || []).length >= 2,
  'tickAllySkill 真把 ownerId 接进去了（蓄半程与重新计时两处都乘）');
ok(/if \(!blocked\) bumpTogether\(m\)/.test(gsrc),
  'finishMap 里只有「关闭成了」才记同行');
ok(!/save\.year\s*=/.test(gsrc) && !/save\.age\s*=/.test(gsrc),
  '仍然没有年份计数器落盘（年数由境界现推，同行纪只存「那一年的数」不存时间轴）');

// ---------- G 组：洞府的三个可见处 ----------
const caveKey = await page.evaluate(() => {
  const k = Object.keys(window.CAVES || {});
  return k.length ? k[0] : null;
});
ok(!!caveKey, '前提：至少有一座洞府', { caveKey });

// 摆一本有内容的账：30 场 / 12 场 / 3 场，好验排序
await page.evaluate(() => {
  window.__FR.setTogether('m_yuanyao', 30, 2);
  window.__FR.setTogether('p_tihun', 12, 0);
  window.__FR.setTogether('p_liuyi', 3, 1);
  window.__FR.giveMate('m_yuanyao');
  window.__FR.givePet('p_tihun');
  window.__FR.givePet('p_liuyi');   // 袋子里的第二只：页上要两条都在
});

await page.evaluate(k => { window.__FR.G.caveTab = 'pet'; window.__FR.cave(k); }, caveKey);
await wait(250);
const Gpet = await page.evaluate(() => {
  const body = document.getElementById('caveBody');
  const rows = [...body.querySelectorAll('.recrow')];
  const pick = name => {
    const r = rows.find(x => ((x.querySelector('.rr-main b') || {}).textContent || '').indexOf(name) >= 0);
    if (!r) return null;
    const tag = r.querySelector('.bond');
    const line = r.querySelector('.bond-line');
    return {
      bond: tag ? tag.textContent : null,
      dataBond: tag ? tag.getAttribute('data-bond') : null,
      line: line ? line.textContent : null
    };
  };
  return { total: rows.length, tihun: pick('啼魂'), liuyi: pick('六翼') };
});
ok(!!Gpet.tihun && Gpet.tihun.bond === '相熟' && Gpet.tihun.dataBond === '1',
  '灵宠页挂着羁绊标签（12 场 = 相熟，data-bond=1）', Gpet.tihun);
ok(!!Gpet.tihun && /同行 12 场/.test(Gpet.tihun.line || ''),
  '灵宠页那一行报场数', Gpet.tihun && Gpet.tihun.line);
ok(!!Gpet.tihun && /再 13 场到「生死之交」/.test(Gpet.tihun.line || ''),
  '灵宠页报「再几场到下一档」（25-12=13）', Gpet.tihun && Gpet.tihun.line);
ok(!!Gpet.liuyi && Gpet.liuyi.bond === '初识' && /殒过 1 回/.test(Gpet.liuyi.line || ''),
  '初识的挂「初识」；殒过的把次数写在那一行', Gpet.liuyi);

await page.evaluate(k => { window.__FR.G.caveTab = 'mate'; window.__FR.cave(k); }, caveKey);
await wait(250);
const Gmate = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#caveBody .recrow')];
  const r = rows.find(x => ((x.querySelector('.rr-main b') || {}).textContent || '').indexOf('元瑶') >= 0);
  if (!r) return null;
  const tag = r.querySelector('.bond');
  const line = r.querySelector('.bond-line');
  return {
    bond: tag ? tag.textContent : null, dataBond: tag ? tag.getAttribute('data-bond') : null,
    line: line ? line.textContent : null
  };
});
ok(!!Gmate && Gmate.bond === '生死之交' && Gmate.dataBond === '2',
  '同伴页挂着羁绊标签（30 场 = 生死之交）', Gmate);
ok(!!Gmate && /已是最深一档/.test(Gmate.line || ''),
  '到底的那一档不再报「还差几场」', Gmate && Gmate.line);

await page.evaluate(k => { window.__FR.G.caveTab = 'rest'; window.__FR.cave(k); }, caveKey);
await wait(250);
const Grest = await page.evaluate(() => {
  const secs = [...document.querySelectorAll('#caveBody .cave-sec')];
  const sec = secs.find(s => ((s.querySelector('.cs-title') || {}).textContent || '') === '同行');
  if (!sec) return { found: false };
  const rows = [...sec.querySelectorAll('.jz-row')].map(r => ({
    when: (r.querySelector('i') || {}).textContent || '',
    who: (r.querySelector('b') || {}).textContent || '',
    note: (r.querySelector('em') || {}).textContent || ''
  }));
  return { found: true, rows };
});
ok(Grest.found === true, '静修页有「同行」一节', Grest);
ok(Grest.found && Grest.rows.length === 3, '条数 = 真走过图的人数（3 条）', Grest.rows && Grest.rows.length);
ok(Grest.found && Grest.rows.map(r => r.when).join('|') === '30 场|12 场|3 场',
  '按场数降序（30 / 12 / 3）', Grest.rows && Grest.rows.map(r => r.when));
ok(Grest.found && /元瑶/.test(Grest.rows[0].who) && /生死之交/.test(Grest.rows[0].who),
  '第一行是走得最远的那个人', Grest.rows && Grest.rows[0]);
ok(Grest.found && /最后一仗/.test(Grest.rows[0].note) && /殒过 2 回/.test(Grest.rows[0].note),
  '那一行带着最后一仗与殒落数', Grest.rows && Grest.rows[0].note);

// ---------- H 组：两张皮的字站对边 ----------
const lum = c => {
  const m = String(c).match(/\d+(\.\d+)?/g) || [];
  return Math.round(0.3 * (+m[0] || 0) + 0.59 * (+m[1] || 0) + 0.11 * (+m[2] || 0));
};
const H = await page.evaluate(() => {
  const read = () => {
    const t = document.querySelector('#caveBody .bond');
    if (!t) return null;
    const cs = getComputedStyle(t);
    return { color: cs.color, border: cs.borderTopColor, text: t.textContent };
  };
  return { rest: read() };
});
// 灵宠页才有多档标签，切回去取色
await page.evaluate(k => { window.__FR.G.caveTab = 'pet'; window.__FR.cave(k); }, caveKey);
await wait(200);
const Hjin = await page.evaluate(() => {
  window.__FR.skin('jin');
  const t = document.querySelector('#caveBody .bond');
  return t ? { color: getComputedStyle(t).color, text: t.textContent } : null;
});
await page.evaluate(k => { window.__FR.cave(k); }, caveKey);
await wait(150);
const Hink = await page.evaluate(() => {
  window.__FR.skin('guigu');
  const t = document.querySelector('#caveBody .bond');
  return t ? { color: getComputedStyle(t).color, text: t.textContent } : null;
});
ok(!!Hjin && lum(Hjin.color) > 140, '金皮：羁绊标签是亮字（深底亮字）', Hjin && { c: Hjin.color, l: lum(Hjin.color) });
ok(!!Hink && lum(Hink.color) < 120, '水墨皮：羁绊标签是墨字（纸底墨字，别照抄金皮）', Hink && { c: Hink.color, l: lum(Hink.color) });
ok(!!(Hjin && Hink) && Math.abs(lum(Hjin.color) - lum(Hink.color)) > 40,
  '两张皮的标签明暗真拉开了（不是同一套色）', { jin: Hjin && lum(Hjin.color), ink: Hink && lum(Hink.color) });

// 顺手守住静修页那句提示：墨皮原来拿 --ok-soft（当底色用的淡竹青）当字，写在宣纸上整行消失
await page.evaluate(k => { window.__FR.G.caveTab = 'rest'; window.__FR.cave(k); }, caveKey);
await wait(200);
const Htip = await page.evaluate(() => {
  const t = document.querySelector('#caveBody .resttip');
  return t ? { color: getComputedStyle(t).color, text: t.textContent.slice(0, 16) } : null;
});
ok(!!Htip && lum(Htip.color) < 150, '墨皮静修页的提示行是墨字（不是当底色用的淡竹青）', Htip && { c: Htip.color, l: lum(Htip.color) });
await page.evaluate(() => { window.__FR.skin('jin'); });

// ---------- 收尾 ----------
ok(errs.length === 0, '整轮零 pageerror / console.error', errs.slice(0, 4));

console.log('');
console.log('PASS ' + pass + '  FAIL ' + fail);
if (fail) { for (const m of bad) console.log('  ✗ ' + m); }
else console.log('  批次 8 · 同行纪：全部通过');
await b.close();
process.exit(fail ? 1 : 0);
