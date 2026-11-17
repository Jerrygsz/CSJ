// 回归测试：批次 9 · 放生（账本结转 + 故交册 + 告别 + 防误触）
//
// 这一批补的是上一轮自己的漏洞：批次 8 建了同行账与羁绊三档（CD / 回生），
// 但放生不碰账本 —— 养到生死之交再放生、重获一只，档位白送，容量 2/4/6 的选择压力被绕过。
//
// A 组  结构：探针齐全、新档两本账都是空的
// B 组  放生清账：现役账删掉、重获同一只从初识起、CD 回 1、回生没了
// C 组  故交册：结转的账字段齐（场数/殒落/最后一仗/放生年份）、按放生先后倒序
// D 组  老档迁移 / 清档：两本账各自补齐与清空
// E 组  两段式：有账的第一次只上膛不放、第二次才真放；空账一按就放；3 秒超时重算
// F 组  残留清理：放生一只「已殒 + 欠费」的，旧账一并清，重获不再是殒落态
// G 组  告别词：报场数与档位（走真实点击入口，读 banner）
// H 组  洞府 UI：故交节出现、条目与数据一致；只有现役的在工作账本里
// I 组  双皮：故交行墨字 / 亮字站对边；零 pageerror
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 400, height: 812 } });
const errs = [];
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR && !!window.ALLY_SKILLS, { timeout: 20000 });

// ---------- A 组：结构与探针 ----------
const A = await page.evaluate(() => ({
  miss: ['requestRelease', 'releaseArm', 'clearReleaseArm', 'goneRows', 'bond', 'bondCd', 'setTogether',
    'givePet', 'releasePet', 'allyDeadMap', 'setAllyDead', 'clearAlly', 'enterMap', 'finishMapNow',
    'setSpawn', 'muteStory', 'cave', 'G']
    .filter(k => window.__FR[k] === undefined),
  gone: window.__FR.goneRows().length,
  raw: (() => { const r = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}'); return {
    together: r.together, togetherGone: r.togetherGone }; })()
}));
ok(A.miss.length === 0, '放生探针全部暴露', A.miss);
ok(A.gone === 0, '新档故交册是空的', A.gone);
ok(A.raw.together && A.raw.togetherGone && !Object.keys(A.raw.togetherGone).length,
  '新档两本账都在存档里、故交册空', A.raw);

// ---------- B/C 组：放生清账 + 故交册 ----------
const BC = await page.evaluate(() => {
  const F = window.__FR, out = {};
  F.clearAlly(); F.givePet('p_tihun');
  F.setTogether('p_tihun', 25, 2, 'xutian');   // 生死之交，殒过 2 回，最后一仗虚天殿
  const before = { n: F.bond('p_tihun').n, cd: F.bondCd('p_tihun'), back: F.bond('p_tihun').back };
  const rel = F.requestRelease('p_tihun');      // 第一段：上膛
  const armed = !!F.releaseArm();
  const afterArm = F.bond('p_tihun').n;         // 上膛时还没放
  const rel2 = F.requestRelease('p_tihun');     // 第二段：真放
  const after = { n: F.bond('p_tihun').n, cd: F.bondCd('p_tihun'), back: F.bond('p_tihun').back };
  const gone = F.goneRows()[0];
  // 重获同一只
  F.givePet('p_tihun');
  const reborn = { n: F.bond('p_tihun').n, cd: F.bondCd('p_tihun'), back: F.bond('p_tihun').back };
  out.before = before; out.armed = armed; out.afterArm = afterArm; out.after = after;
  out.rel2 = { armed: rel2.armed, goneN: rel2.gone && rel2.gone.n }; out.gone = gone; out.reborn = reborn;
  return out;
});
ok(BC.before.n === 25 && BC.before.cd === 0.78 && BC.before.back === true,
  '前提：先养到生死之交（25 场 / CD 0.78 / 自动回生）', BC.before);
ok(BC.armed === true && BC.afterArm === 25, '第一段只上膛，账还在（没真放）', { armed: BC.armed, n: BC.afterArm });
ok(BC.rel2.armed === false && BC.rel2.goneN === 25, '第二段才真放，结转出去 25 场', BC.rel2);
ok(BC.after.n === 0 && BC.after.cd === 1 && BC.after.back === false,
  '放生后现役账清零：CD 回 1、自动回生没了（成本真实）', BC.after);
ok(!!BC.gone && BC.gone.n === 25 && BC.gone.down === 2 && BC.gone.map === 'xutian' &&
  BC.gone.label === '生死之交' && BC.gone.goneAt >= 0 && BC.gone.goneTs > 0,
  '故交册字段齐：场数 / 殒落 / 最后一仗 / 档位 / 放生年份与墙钟', BC.gone);
ok(BC.reborn.n === 0 && BC.reborn.cd === 1 && BC.reborn.back === false,
  '重获同一只从初识起 —— 档位不再白送（本轮要堵的漏洞）', BC.reborn);

// 故交册按放生先后倒序
const order = await page.evaluate(() => {
  const F = window.__FR;
  F.clearAlly();
  F.givePet('p_liuyi'); F.setTogether('p_liuyi', 3, 0, 'houshan');
  F.clearReleaseArm(); F.requestRelease('p_liuyi'); F.requestRelease('p_liuyi');
  F.givePet('p_kui'); F.setTogether('p_kui', 9, 0, 'jingu');
  F.clearReleaseArm(); F.requestRelease('p_kui'); F.requestRelease('p_kui');
  return F.goneRows().map(r => ({ id: r.id, ts: r.goneTs, n: r.n }));
});
ok(order.length >= 2 && order[0].ts >= order[1].ts,
  '故交册按放生先后倒序（最近放的排最前）', order);

// ---------- D 组：老档迁移 / 清档 ----------
// 老档没有 togetherGone，要在 load 之前塞一份带脏数据的存档进去，再看迁移洗成什么样。
const oldPage = await ctx.newPage();
await oldPage.addInitScript(() => {
  localStorage.setItem('fanren_save_v1', JSON.stringify({
    cultivate: { level: 30, xp: 0 },
    together: { p_tihun: { n: '9', down: '2', map: 'houshan', year: '207' } },
    // 老档这本不存在；故意塞一行脏的，验证逐行洗字段 + 不把坏值带进来
    togetherGone: {
      p_liuyi: { n: '7', down: '1', map: 'jingu', year: '100', goneAt: '207', goneTs: '1600000000000' },
      p_bad: null
    }
  }));
});
await oldPage.goto(URL, { waitUntil: 'load' });
await oldPage.waitForFunction(() => !!window.__FR, { timeout: 20000 });
const D = await oldPage.evaluate(() => {
  const F = window.__FR;
  const raw = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  const gone = F.goneRows();
  return { togetherN: F.bond('p_tihun').n, gone: gone.map(r => ({ id: r.id, n: r.n, goneAt: r.goneAt, goneTs: r.goneTs })),
    rawKeys: Object.keys(raw.togetherGone || {}) };
});
ok(D.togetherN === 9, '老档的现役账迁移时字符串场数洗成整数', D.togetherN);
ok(D.gone.length === 1 && D.gone[0].id === 'p_liuyi' && D.gone[0].n === 7 &&
  D.gone[0].goneAt === 207 && D.gone[0].goneTs === 1600000000000,
  '老档的故交册逐行洗字段（含 13 位墙钟不被 32 位截断），脏行丢弃', D.gone);
const Dclear = await oldPage.evaluate(() => {
  window.__FR.clearProgress();
  const raw = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { t: Object.keys(raw.together || {}).length, g: Object.keys(raw.togetherGone || {}).length };
});
ok(Dclear.t === 0 && Dclear.g === 0, '清档后两本账一起清空（转世是另一世的人）', Dclear);
await oldPage.close();

// ---------- E 组：两段式的空账直放与超时 ----------
const E = await page.evaluate(() => {
  const F = window.__FR, out = {};
  // 空账：一按就放
  F.clearAlly(); F.givePet('p_yunchi');
  const r1 = F.requestRelease('p_yunchi');
  out.empty = { armed: r1.armed, gone: !!r1.gone, left: F.pets().owned.length };
  // 有账：上膛后清掉状态（模拟超时 / 换页），再按要重新上膛而不是直接放
  F.givePet('p_tihun'); F.setTogether('p_tihun', 10, 0, 'houshan');
  const a1 = F.requestRelease('p_tihun');
  F.clearReleaseArm();
  const a2 = F.requestRelease('p_tihun');
  out.timeout = { a1: a1.armed, a2: a2.armed, n: F.bond('p_tihun').n };
  return out;
});
ok(E.empty.armed === false && E.empty.gone === false && E.empty.left === 1,
  '从没带出门的（空账）一按就放、也不进故交册（没交情可记）', E.empty);
ok(E.timeout.a1 === true && E.timeout.a2 === true && E.timeout.n === 10,
  '上膛状态清掉后（超时/换页）再按要重新上膛，不会误放', E.timeout);

// ---------- F 组：殒落 / 欠费残留清理 ----------
const Fgrp = await page.evaluate(() => {
  const F = window.__FR;
  F.clearAlly(); F.givePet('p_liuyi'); F.setTogether('p_liuyi', 12, 1, 'houshan');
  F.setAllyDead('p_liuyi');
  const before = !!F.allyDeadMap()['p_liuyi'];
  F.clearReleaseArm(); F.requestRelease('p_liuyi'); const r = F.requestRelease('p_liuyi');
  const after = !!F.allyDeadMap()['p_liuyi'];
  F.givePet('p_liuyi');
  const raw = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return { before, after, dead: !!(raw.allyDead || {})['p_liuyi'], owe: !!(raw.allyOwe || {})['p_liuyi'], gone: !!r.gone };
});
ok(Fgrp.before === true && Fgrp.after === false && Fgrp.dead === false && Fgrp.owe === false,
  '放生时殒落 / 欠费旧账一并清，重获不是殒落态', Fgrp);

// ---------- G 组：告别词走真实点击入口 ----------
await page.evaluate(() => {
  const F = window.__FR;
  F.setLevel(82);
  F.givePet('p_tihun'); F.setTogether('p_tihun', 25, 2, 'xutian');
  F.G.caveTab = 'pet'; F.cave('qixuan');
  F.clearReleaseArm();
});
await page.click('button[data-release="p_tihun"]');
const armBanner = await page.evaluate(() => (document.getElementById('banner') || {}).textContent || '');
ok(/真要放走/.test(armBanner || '') && /25 场/.test(armBanner || '') && /生死之交/.test(armBanner || ''),
  '第一次点：告别预备词报场数与档位', armBanner);
await page.click('button[data-release="p_tihun"]');
const goneBanner = await page.evaluate(() => (document.getElementById('banner') || {}).textContent || '');
ok(/已放归/.test(goneBanner || '') && /25 场/.test(goneBanner || '') && /故交册/.test(goneBanner || '') && /初识/.test(goneBanner || ''),
  '第二次点：真放的词报场数 / 故交册 / 重逢从初识起', goneBanner);

// ---------- H 组：洞府 UI ----------
const H = await page.evaluate(() => {
  const F = window.__FR;
  F.givePet('p_tihun'); F.setTogether('p_tihun', 5, 0, 'houshan');  // 留一只在工作账
  F.G.caveTab = 'rest'; F.cave('qixuan');
  const secs = [...document.querySelectorAll('#caveBody .cave-sec')];
  const pick = t => secs.find(s => ((s.querySelector('.cs-title') || {}).textContent || '') === t);
  const tog = pick('同行'), gone = pick('故交');
  const rows = s => s ? [...s.querySelectorAll('.jz-row')].map(r => ({
    i: (r.querySelector('i') || {}).textContent,
    b: (r.querySelector('b') || {}).textContent,
    em: (r.querySelector('em') || {}).textContent
  })) : [];
  return { hasTog: !!tog, hasGone: !!gone, togRows: rows(tog), goneRows: rows(gone), goneN: F.goneRows().length };
});
ok(H.hasTog === true && H.hasGone === true, '静修页同时有「同行」与「故交」两节', { tog: H.hasTog, gone: H.hasGone });
ok(H.togRows.length === 1 && /5 场/.test(H.togRows[0].i), '工作账只剩还在同行的那一只', H.togRows);
ok(H.goneRows.length === H.goneN && H.goneRows.length > 0,
  '故交册 DOM 行数 = 数据条数', { dom: H.goneRows.length, data: H.goneN });
ok(H.goneRows.some(r => /放归/.test(r.i || '') && /同行 \d+ 场/.test(r.em || '')),
  '故交条目报「何年放归」与「同行几场」', H.goneRows[0]);

// ---------- I 组：双皮字站对边 ----------
const lum = c => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : -1; };
const I = await page.evaluate(() => {
  const F = window.__FR, out = {};
  for (const skin of ['jin', 'guigu']) {
    F.skin(skin);
    F.G.caveTab = 'rest'; F.cave('qixuan');
    const r = document.querySelector('#caveBody .jz-row.gone');
    const b = r && r.querySelector('b');
    out[skin] = b ? { color: getComputedStyle(b).color, text: b.textContent } : null;
  }
  // 两段式的「再按一次」按钮：点完鼠标还停在上面，ghost:hover 的紫色不能盖过朱砂
  F.skin('jin');
  F.clearAlly(); F.givePet('p_tihun'); F.setTogether('p_tihun', 12, 0, 'xutian');
  F.G.caveTab = 'pet'; F.cave('qixuan');
  return out;
});
await page.click('button[data-release="p_tihun"]');
const armStyle = await page.evaluate(() => {
  const btn = document.querySelector('button[data-release="p_tihun"]');
  return btn ? { text: btn.textContent, color: getComputedStyle(btn).color, border: getComputedStyle(btn).borderTopColor } : null;
});
ok(!!armStyle && armStyle.text.indexOf('再按一次') >= 0, '上膛后按钮换文案', armStyle);
ok(!!armStyle && /rgb\(224,\s*87,\s*58\)/.test(armStyle.color),
  '鼠标停在按钮上时仍是朱砂字（不被 ghost:hover 的紫色盖掉）', armStyle);
ok(!!I.jin && lum(I.jin.color) > 140, '金皮故交名是亮字', I.jin && { c: I.jin.color, l: lum(I.jin.color) });
ok(!!I.guigu && lum(I.guigu.color) < 100, '水墨皮故交名是墨字', I.guigu && { c: I.guigu.color, l: lum(I.guigu.color) });
await page.evaluate(() => { window.__FR.skin('jin'); });

ok(errs.length === 0, '零 pageerror / console error', errs.slice(0, 5));

await b.close();
console.log('\n== 批次 9 · 放生 ==');
if (bad.length) { console.log('失败项：'); bad.forEach(m => console.log('  ✗ ' + m)); }
console.log('\nRESULT ' + pass + '/' + (pass + fail) + (fail ? '  有红' : '  全绿'));
process.exit(fail ? 1 : 0);
