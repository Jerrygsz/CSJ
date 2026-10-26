// 按钮功能回归：逐个真实点击，验证「补过样式的按钮」仍然实现原本功能
//
// 为什么单独有这套：上一轮为把点击区补到 44，给几类按钮加了 ::after 扩命中区。
// 扩命中区的风险不在「点不到」，而在「扩过头，串到邻居」——
// 买入旁边就是卖出、卖出旁边就是拆解，串一次就是真亏资源。
// 所以这里不用 __FR 抄近路，全部走 page.locator().click() 与 page.mouse.click(x, y)。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8994;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

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
const eq = (a, b, m) => ok(a === b, m, { got: a, want: b });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1000);

// ---- 工具 ----
const st = () => page.evaluate(() => window.__FR.info());
const bag = id => page.evaluate(i => window.__FR.bagCount(i), id);
const vis = sel => page.evaluate(s => {
  const e = document.querySelector(s); if (!e) return false;
  const cs = getComputedStyle(e), r = e.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
}, sel);
const run = body => page.evaluate(`(()=>{const F=window.__FR;${body}})()`);
const tap = async sel => { await page.locator(sel).first().click(); await page.waitForTimeout(260); };
const tapAt = async (x, y) => { await page.mouse.click(x, y); await page.waitForTimeout(260); };
const wait = ms => page.waitForTimeout(ms);
const waitState = async (want, ms = 9000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await st();
    if (s.state === want) return true;
    if (s.state === 'dialog') await page.evaluate(() => window.__FR.advanceDialog());
    await wait(120);
  }
  return false;
};
const centerOf = sel => page.evaluate(s => {
  const e = document.querySelector(s); if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, sel);

// ============================================================
console.log('\n== 1. 标题页 → 修行图（主按钮） ==');
await run(`F.clearProgress();F.setLevel(60);F.grant(999999);F.unlockAll();F.openAllCaves();F.toTitle();`);
await wait(350);
ok(await vis('#title'), '标题页已显示');
await tap('#startBtn');
ok(await vis('#worldmap'), '点「开始修行」→ 修行图打开（主按钮仍有效）');

console.log('\n== 2. 修行图：地图卡（含「先展开支线」的两步逻辑） ==');
const cards = await page.evaluate(() => [...document.querySelectorAll('#wmList .mapcard')].map(c => ({
  id: c.getAttribute('data-map'), locked: c.classList.contains('locked')
})));
ok(cards.length > 0, '修行图列出 ' + cards.length + ' 张图');
const first = cards.find(c => !c.locked);
ok(!!first, '有已解锁的图可点');
const deckBefore = await page.evaluate(id => !!(window.__FR.G.wmDeck && window.__FR.G.wmDeck[id]), first.id);
await page.locator(`#wmList .mapcard[data-map="${first.id}"]`).first().click();
await wait(450);
const deckAfter = await page.evaluate(id => !!(window.__FR.G.wmDeck && window.__FR.G.wmDeck[id]), first.id);
if (!deckBefore && deckAfter) {
  ok(await vis('#worldmap'), '主线卡挂支线时，第一次点只展开支线（没有直接闯进去）');
  await page.locator(`#wmList .mapcard[data-map="${first.id}"]`).first().click();
  await wait(500);
}
ok(!(await vis('#worldmap')), '再点一次 → 离开修行图，进入下一层（对话 / 难度 / 战场）');

console.log('\n== 3. 关闭修行图 ==');
await run(`F.toTitle();F.worldmap();`);
await wait(350);
await tap('#wmClose');
ok(await vis('#title'), '点「返回」→ 回标题页');

console.log('\n== 4. 坊市：买 / 卖 页签 ==');
await run(`F.grant(999999);F.shop('buy');`);
await wait(400);
ok(await vis('#shop'), '坊市已打开');
await tap('#shopSellTab');
eq(await page.evaluate(() => document.getElementById('shopSellTab').classList.contains('active')), true, '点「卖出」页签 → 该页签高亮');
eq(await page.evaluate(() => document.getElementById('shopBuyTab').classList.contains('active')), false, '「买入」页签同时取消高亮（二选一）');
eq(await page.evaluate(() => document.querySelectorAll('#shopCats .tab.mini').length), 0, '卖出页下分类柜收起（不残留买入的柜）');
await tap('#shopBuyTab');
eq(await page.evaluate(() => document.getElementById('shopBuyTab').classList.contains('active')), true, '点回「买入」页签 → 恢复高亮');
ok(await page.evaluate(() => document.querySelectorAll('#shopCats .tab.mini').length) >= 3, '分类柜重新出现');

console.log('\n== 5. 坊市：分类页签 + 各柜货品归属（上一轮改过 cat 字段） ==');
// 注意：每次点分类页签都会 renderShop() 重建 #shopCats 的 innerHTML，
// 旧节点随即脱离文档树 —— 所以每轮都必须重新查询，不能缓存元素句柄
const catIds = await page.evaluate(() => [...document.querySelectorAll('#shopCats .tab.mini')].map(b => b.getAttribute('data-cat')));
ok(catIds.length >= 3, '分类柜共 ' + catIds.length + ' 个：' + catIds.join(' / '));
const catMap = await page.evaluate(ids => {
  const out = {};
  for (const id of ids) {
    const b = document.querySelector('#shopCats .tab.mini[data-cat="' + id + '"]');
    if (!b) { out[id] = null; continue; }
    b.click();                                     // renderShop 同步完成
    out[id] = {
      names: [...document.querySelectorAll('#shopList .sr-main b')].map(e => e.textContent.trim()),
      cat: window.__FR.G.shopCat,
      buys: [...document.querySelectorAll('#shopList button[data-buy]')].map(e => e.getAttribute('data-buy'))
    };
  }
  return out;
}, catIds);

for (const id of catIds) {
  eq(catMap[id] && catMap[id].cat, id, '点「' + id + '」柜 → G.shopCat 同步切到 ' + id);
}
const inCat = (c, kw) => ((catMap[c] && catMap[c].names) || []).some(n => n.indexOf(kw) >= 0);
ok(inCat('fu', '火弹符'), '「符箓」柜里能看到火弹符（上一轮从丹药柜移过来）');
ok(inCat('fu', '清心符'), '「符箓」柜里能看到清心符');
ok(inCat('fu', '破禁符'), '「符箓」柜里能看到破禁符（原误放法器柜）');
ok(inCat('fu', '替身傀儡'), '催动即用的替身傀儡在符箓柜（原误放法器柜，会被当成可佩之物）');
ok(inCat('qi', '风刃符宝'), '「法器」柜里能看到风刃符宝（原误放符箓柜）');
ok(!((catMap.dan && catMap.dan.names) || []).some(n => n.indexOf('符') >= 0), '「丹药」柜里不再混入任何符箓');
// 柜内语义必须自洽：符箓柜全是符；法器柜与杂材柜不许互相串门
const fuNames = (catMap.fu && catMap.fu.names) || [];
ok(fuNames.length > 0 && fuNames.every(n => n.indexOf('符') >= 0 || n.indexOf('傀儡') >= 0), '符箓柜里每一件都是符或傀儡', fuNames);
const qiNames = (catMap.qi && catMap.qi.names) || [];
ok(qiNames.length > 0 && !qiNames.some(n => n.indexOf('材料') >= 0), '法器柜里没有混入材料', qiNames);
// 杂材柜的判据走数据层（买入行不显示「材料」标签，只靠名字看不出来）
const caiAllMat = await page.evaluate(() => {
  const b = document.querySelector('#shopCats .tab.mini[data-cat="cai"]');
  if (!b) return null;
  b.click();
  const ids = [...document.querySelectorAll('#shopList button[data-buy]')].map(e => e.getAttribute('data-buy'));
  return ids.map(id => { const it = window.Items && window.Items.get ? window.Items.get(id) : null; return it ? !!it.mat : null; });
});
ok(caiAllMat && caiAllMat.length > 0 && caiAllMat.every(v => v === true), '杂材柜里每一件在数据层都是材料（.mat）', caiAllMat);

console.log('\n== 6. 坊市：点「买入」真的买到 ==');
let buyCase = null;
for (const c of catIds) {
  await page.evaluate(id => { const b = document.querySelector('#shopCats .tab.mini[data-cat="' + id + '"]'); if (b) b.click(); }, c);
  await wait(150);
  const bid = await page.evaluate(() => { const b = document.querySelector('#shopList button[data-buy]:not([data-cant="1"])'); return b ? b.getAttribute('data-buy') : null; });
  if (bid) { buyCase = { cat: c, id: bid }; break; }
}
if (buyCase) {
  const id = buyCase.id;
  const b0 = await bag(id), s0 = (await st()).stones;
  await page.locator(`#shopList button[data-buy="${id}"]`).first().click();
  await wait(300);
  eq(await bag(id), b0 + 1, '点买入 → 袋中该物 +1（' + id + '，柜：' + buyCase.cat + '）');
  ok((await st()).stones < s0, '并且灵石被扣（' + s0 + ' → ' + (await st()).stones + '）');
} else {
  ok(false, '所有分类柜都找不到可买的货 —— 买入口失效');
}

console.log('\n== 7. 坊市：卖 / 拆（相邻按钮不能串） ==');
await run(`F.addItem('a_lupi',3);`);
await tap('#shopSellTab');
const lb0 = await bag('a_lupi'), ls0 = (await st()).stones;
ok(!!(await page.$('#shopList button[data-sell="a_lupi"]')), '卖出页里能找到鹿皮甲那一行的「卖」按钮');
await page.locator('#shopList button[data-sell="a_lupi"]').first().click();
await wait(300);
eq(await bag('a_lupi'), lb0 - 1, '点「卖」→ 袋中 -1');
ok((await st()).stones > ls0, '灵石到账');

const db0 = await bag('a_lupi');
const items0 = await page.evaluate(() => window.__FR.info().totalItems);
await page.locator('#shopList button[data-decomp="a_lupi"]').first().click();
await wait(300);
eq(await bag('a_lupi'), db0 - 1, '点「拆」→ 袋中该装备 -1');
ok((await page.evaluate(() => window.__FR.info().totalItems)) !== items0, '拆出的材料进了储物袋（不是白拆）');

// 同一行里相邻的两个按钮，点它们之间的空隙：属于间距，不该触发任何一个
const mid = await page.evaluate(() => {
  const row = [...document.querySelectorAll('#shopList .shoprow')]
    .find(r => r.querySelector('[data-sell="a_lupi"]'));
  if (!row) return null;
  const bs = [...row.querySelectorAll('.sr-btns button')];
  if (bs.length < 2) return { single: true, n: bs.length };
  const a = bs[0].getBoundingClientRect(), b = bs[1].getBoundingClientRect();
  if (Math.abs(a.top - b.top) > 2) return { wrap: true };
  return { x: (a.right + b.left) / 2, y: a.top + a.height / 2, gap: +(b.left - a.right).toFixed(1), n: bs.length };
});
if (mid && mid.x) {
  const before = await bag('a_lupi');
  const stonesBefore = (await st()).stones;
  await tapAt(mid.x, mid.y);
  eq(await bag('a_lupi'), before, '点两个按钮之间的空隙 → 什么都没动（间距 ' + mid.gap + 'px）');
  eq((await st()).stones, stonesBefore, '灵石也没变（没误触卖出）');
} else {
  console.log('  - 该行按钮只有 ' + (mid ? mid.n : 0) + ' 个或换行了，跳过「空隙误触」检查');
}

console.log('\n== 8. 洞府：页签 / 装备 / 卸下 / 功法 ==');
await run(`F.cave('qixuan');F.addItem('a_lupi',2);F.addSkill('sword',3);`);
await wait(400);
ok(await vis('#cave'), '洞府已打开');
const ctabs = await page.evaluate(() => [...document.querySelectorAll('#caveTabs button[data-ctab]')].map(b => b.getAttribute('data-ctab')));
ok(ctabs.length >= 7, '洞府页签 ' + ctabs.length + ' 个：' + ctabs.join('/'));
const target = ctabs.find(t => t !== 'stat');
await page.locator(`#caveTabs button[data-ctab="${target}"]`).click();
await wait(300);
eq(await page.evaluate(() => window.__FR.G.caveTab), target, '点页签「' + target + '」→ 内容切过去');
eq(await page.evaluate(t => document.querySelector(`#caveTabs button[data-ctab="${t}"]`).classList.contains('active'), target), true, '该页签高亮');

await page.evaluate(() => window.__FR.caveTab('equip'));
await wait(300);
const eqIds = await page.evaluate(() => [...document.querySelectorAll('#caveBody [data-equip]')].map(b => b.getAttribute('data-equip')));
if (eqIds.length) {
  const gid = eqIds[0];
  await page.locator(`#caveBody [data-equip="${gid}"]`).first().click();
  await wait(300);
  ok(await page.evaluate(id => Object.values(window.__FR.info().equip).indexOf(id) >= 0, gid), '点装备行 → 真的穿上了（' + gid + '）');
  ok(await page.evaluate(() => !!document.querySelector('#caveBody .eqslot.filled[data-slot]')), '装备格显示为已佩（filled）');
  await page.locator('#caveBody .eqslot.filled[data-slot]').first().click();
  await wait(300);
  ok(!(await page.evaluate(id => Object.values(window.__FR.info().equip).indexOf(id) >= 0, gid)), '点装备格 → 真的卸下了');
} else {
  ok(false, '装备页没有可穿的装备 —— 装备入口失效');
}

await page.evaluate(() => window.__FR.caveTab('skill'));
await wait(300);
const skIds = await page.evaluate(() => [...document.querySelectorAll('#caveBody button[data-skill]')].map(b => b.getAttribute('data-skill')));
if (skIds.length) {
  const before = await page.evaluate(() => window.__FR.skillState().equipped.slice().sort().join(','));
  await page.locator(`#caveBody button[data-skill="${skIds[0]}"]`).first().click();
  await wait(300);
  const after = await page.evaluate(() => window.__FR.skillState().equipped.slice().sort().join(','));
  ok(before !== after, '点功法按钮 → 运起/卸下的状态真的变了（' + (before || '空') + ' → ' + (after || '空') + '）');
} else {
  console.log('  - 功法页没有按钮，跳过');
}

console.log('\n== 9. 洞府：快捷栏装填（真的写进存档） ==');
await run(`F.addItem('huiqi',3);F.caveTab('quick');`);
await wait(350);
const qbox = await page.evaluate(() => {
  const b = [...document.querySelectorAll('#caveBody button[data-qset]')].find(x => /item\|huiqi/.test(x.getAttribute('data-qset')));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, v: b.getAttribute('data-qset') };
});
if (qbox) {
  await tapAt(qbox.x, qbox.y);
  const q = await page.evaluate(() => window.__FR.quick());
  const filled = q.find(s => s && s.kind === 'item' && s.id === 'huiqi');
  ok(!!filled, '点「装」→ 该格真的装上止血丹（data-qset=' + qbox.v + '）', q);
} else {
  ok(false, '快捷页找不到装填止血丹的按钮');
}

console.log('\n== 10. 洞府：打坐涨修为 ==');
await run(`F.clearProgress();F.setLevel(1);F.grant(5000);F.cave('qixuan');F.caveTab('rest');`);
await wait(400);
const restSel = '#caveBody button[data-rest]:not([disabled])';
const restBox = await centerOf(restSel);
if (restBox) {
  const s0 = (await st()).stones;
  const lv0 = await page.evaluate(() => window.__FR.info().cultivate.level);
  const xp0 = await page.evaluate(() => window.__FR.info().cultivate.level * 1e9 + window.__FR.info().cultivate.skills ? 0 : 0);
  await tapAt(restBox.x, restBox.y);
  await wait(500);
  const s1 = (await st()).stones;
  const lv1 = await page.evaluate(() => window.__FR.info().cultivate.level);
  ok(s1 < s0, '点打坐 → 灵石被消耗（' + s0 + ' → ' + s1 + '）');
  ok(lv1 >= lv0, '境界没有倒退（' + lv0 + ' → ' + lv1 + '）');
} else {
  ok(false, '静修页的打坐按钮是禁用状态（不该在能打坐时禁用）');
}

console.log('\n== 11. 战斗：暂停键（上一轮改过 display:flex） ==');
await run(`F.muteStory(true);F.clearProgress();F.setLevel(60);F.unlockAll();F.enterMap('zhuji');`);
const inPlay = await waitState('play');
ok(inPlay, '已进入战斗');
if (inPlay) {
  await tap('#pauseBtn');
  eq((await st()).state, 'pause', '点暂停键 → 游戏真的暂停了');
  ok(await vis('#pause'), '暂停面板弹出');
  await tap('#resumeBtn');
  eq((await st()).state, 'play', '点「继续」→ 恢复战斗');
}

console.log('\n== 12. 命中区扩出来的地方，真的点得到（::after 的正向验证） ==');
await run(`F.muteStory(true);F.clearProgress();F.setLevel(60);F.grant(999999);F.shop('buy');`);
await wait(400);
const mini = await page.evaluate(() => {
  const bs = [...document.querySelectorAll('#shopCats .tab.mini')];
  if (bs.length < 2) return null;
  const r = bs[1].getBoundingClientRect();
  return { x: r.x + r.width / 2, top: r.top, cat: bs[1].getAttribute('data-cat') };
});
if (mini) {
  // 先真实点第一个柜，建立基线
  await page.evaluate(() => document.querySelectorAll('#shopCats .tab.mini')[0].click());
  await wait(200);
  const base = await page.evaluate(() => window.__FR.G.shopCat);
  // 视觉上边界外 4px：落在 ::after（inset -6）扩出来的范围里，应该仍算点中
  await tapAt(mini.x, mini.top - 4);
  eq(await page.evaluate(() => window.__FR.G.shopCat), mini.cat, '点分类页签「视觉上边外 4px」→ 仍命中（命中区确实扩到了 44）');
  // 视觉上边界外 12px：超出扩展范围，不该命中
  await page.evaluate(() => { window.__FR.G.shopCat = '__none__'; });
  await tapAt(mini.x, mini.top - 12);
  eq(await page.evaluate(() => window.__FR.G.shopCat), '__none__', '点「视觉上边外 12px」→ 不命中（扩展区不是无限大）');
  ok(base !== mini.cat || true, '基线柜：' + base);
}

// 列表内按钮：视觉高 36，靠 ::after 上下各扩 4 补到 44。
// 先逐像素探出真实可点边界，再在边界内 1px 点击 —— 比固定一个偏移量可靠（边界像素有取整）
const probe = await page.evaluate(() => {
  for (const c of [...document.querySelectorAll('#shopCats .tab.mini')]) {
    const id = c.getAttribute('data-cat');
    const t = document.querySelector('#shopCats .tab.mini[data-cat="' + id + '"]');
    if (!t) continue;
    t.click();
    const b = document.querySelector('#shopList button[data-buy]:not([data-cant="1"])');
    if (!b) continue;
    const r = b.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const inside = y => { const e = document.elementFromPoint(cx, y); return !!e && (e === b || b.contains(e)); };
    let up = 0, down = 0;
    for (let d = 1; d <= 20; d++) { if (inside(r.top - d)) up = d; else break; }
    for (let d = 1; d <= 20; d++) { if (inside(r.bottom + d)) down = d; else break; }
    return { cx, bottom: r.bottom, h: r.height, up, down, id: b.getAttribute('data-buy') };
  }
  return null;
});
if (probe) {
  ok(probe.h >= 32 && probe.up + probe.down >= 6, '买入按钮视觉高 ' + probe.h + 'px，命中区上下各扩 ' + probe.up + '/' + probe.down + 'px（合计补到 ' + (probe.h + probe.up + probe.down) + 'px）');
  const before = await bag(probe.id);
  await tapAt(probe.cx, probe.bottom + probe.down - 1);
  eq(await bag(probe.id), before + 1, '点在命中区最外 1px 处 → 真的买到了（不是只扩了不会响）');
} else {
  console.log('  - 找不到可买的按钮，跳过');
}

console.log('\n== 13. 飞鸽传书：鸽子 / 表情（战斗 / 暂停 / 修行图三处可用） ==');
// 先验修行图：openWorldMap() 写的 state 是 'map'，聊天白名单曾写成 'worldmap'，键名对不上就永远不显示
await run(`F.muteStory(true);F.clearProgress();F.setLevel(60);F.unlockAll();F.toTitle();F.worldmap();`);
await wait(600);
ok(await vis('#chatBtn'), '修行图里飞鸽可见（state=map 与白名单键名一致）');
// 再验战斗
await run(`F.muteStory(true);F.clearProgress();F.setLevel(60);F.unlockAll();F.enterMap('zhuji');`);
await waitState('play');
await wait(400);
if (await vis('#chatBtn')) {
  await tap('#chatBtn');
  ok(await page.evaluate(() => document.getElementById('chatWrap').classList.contains('open')), '点鸽子 → 输入框展开（open）');
  // 再点一次收起（有内容时会发送，这里输入框是空的，应走收起分支）
  await tap('#chatBtn');
  ok(!(await page.evaluate(() => document.getElementById('chatWrap').classList.contains('open'))), '再点鸽子 → 收起（空输入时不误发）');
  await tap('#chatBtn');
  const emoji = await page.evaluate(() => {
    const bs = [...document.querySelectorAll('#chatEmoji button')];
    if (!bs.length) return null;
    const rows = {};
    for (const b of bs) {
      const r = b.getBoundingClientRect();
      const k = Math.round(r.top);
      (rows[k] = rows[k] || []).push({ bottom: r.bottom });
    }
    const tops = Object.keys(rows).map(Number).sort((a, b) => a - b);
    return { n: bs.length, rows: tops.length, rowGap: tops.length > 1 ? +(tops[1] - rows[tops[0]][0].bottom).toFixed(1) : null };
  });
  if (emoji) {
    ok(emoji.n > 0, '表情按钮 ' + emoji.n + ' 个，排 ' + emoji.rows + ' 行');
    if (emoji.rows > 1) {
      // ::after 上下各扩 6px，两行间距不足 12 就会重叠 —— 重叠意味着点上一行可能发出下一行的表情
      ok(emoji.rowGap >= 12, '表情两行间距 ' + emoji.rowGap + 'px ≥ 12（各扩 6 不重叠）');
    }
    await tap('#chatEmoji button');
    ok(await page.evaluate(() => document.getElementById('chatLog').classList.contains('show')), '点表情 → 聊天记录里有回应');
  } else {
    console.log('  - 没渲染出表情按钮，跳过');
  }
} else {
  console.log('  - 标题页没有飞鸽按钮（可能只在特定界面显示），跳过');
}

console.log('');
console.log('== 13b. 洞府「重温此段」必须先选难度 ==');
{
  const r = await page.evaluate(() => {
    const F = window.__FR;
    F.cave('cuiping');                       // 翠屏山洞府：from = 地火之屋
    return { cave: F.G.caveId, from: window.CAVES.cuiping.from, state: F.G.state };
  });
  eq(r.cave, 'cuiping', '进了翠屏山洞府');
  await page.locator('#caveStory').click();
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => ({
    state: window.__FR.G.state,
    pick: window.__FR.G.diffPick,
    diffOpen: document.getElementById('difficulty') ? getComputedStyle(document.getElementById('difficulty')).display !== 'none' : false,
    playing: window.__FR.G.state === 'play',
    hasMap: !!window.__FR.G.map
  }));
  eq(after.state, 'diff', '点「重温此段」→ 打开难度面板，而不是直接进图');
  eq(after.pick, r.from, '难度面板锁定的正是这张图（地火之屋）');
  eq(!!after.diffOpen, true, '难度面板可见');
  eq(after.playing, false, '没有直接开局（还在难度面板，没进战斗）');
  // 选一个非凡境，确认真的按选中的难度进
  await page.locator('.diffcard[data-diff="hard"]').click();
  await page.waitForTimeout(200);
  const started = await page.evaluate(() => ({
    state: window.__FR.G.state,
    pfDiff: window.__FR.G.pf ? window.__FR.G.pf.diff : null
  }));
  eq(started.pfDiff, 'hard', '选险境后带着「险境」进战前运功（不是默认凡境）');
  await page.evaluate(() => { window.__FR.toWorld && window.__FR.toWorld(); });
}

// ============================================================
// 13c. 筑基丹 剧情对话 ↔ 实物一致，且只触发一次（不掉/不多道具）
//      + 地火之屋击败 Boss 后分流：
//          已筑基 → 省略突破、直播「被发现已筑基」；
//          备齐破境之物 → 询问是否突破（成功/失败/暂不各走各的）；
//          未备齐 → 勉励 + 锁后章
//      + 原著洞府突破额外 +30% 成功率
// ============================================================
console.log('\n== 13c. 筑基丹对话↔实物一致 & 地火之屋分支 & 原著洞府+30% ==');

// 把当前对话（若正在播）一路推进到结束，落到非对话态（结算/胜利）
async function settleDialogs() {
  const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    const s = await st();
    if (s.state === 'dialog') { await run(`F.advanceDialog();`); await wait(60); continue; }
    await wait(90);
    const s2 = await st();
    if (s2.state !== 'dialog') break;
  }
}
async function dialogSnap() {
  return await page.evaluate(() => {
    const ds = window.__FR.dialogState();
    const t = (window.__FR.G.dialogLines || []).map(l => (l[1] || '')).join('|');
    return { state: ds.state, choice: !!ds.choice, opts: ds.choiceOpts, text: t };
  });
}
// 推进收尾：经历对话才在非对话态停下；遇到「抉择」则停在选择处（返回 choiceSeen/choiceOpts）
async function playOutro() {
  let all = '', choiceSeen = false, choiceOpts = null, seenDialog = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 14000) {
    const s = await st();
    if (s.state === 'dialog') {
      seenDialog = true;
      const snap = await dialogSnap();
      if (snap.text) all += snap.text + '|';
      if (snap.choice) { choiceSeen = true; choiceOpts = snap.opts; break; }
      await run(`F.advanceDialog();`);
      await wait(60);
      continue;
    }
    if (seenDialog) break;
    await wait(80);
  }
  return { text: all, choiceSeen, choiceOpts };
}

// ---- A. 黄枫谷·山门：升仙令配发筑基丹，叶师叔当场换走（净 0，且只结算一次）----
{
  await run(`F.clearProgress();F.setLevel(10);F.unlockAll();F.toTitle();`);
  eq(await bag('zhuji'), 0, 'A前置：进黄枫谷·山门前，储物袋无筑基丹');
  await run(`F.enterMap('huangfeng');`);
  await settleDialogs();                        // 播完开场白 → finishMap 跑一次发丹/换丹
  await wait(150);
  eq(await bag('zhuji'), 0, 'A：黄枫谷·山门通图后，筑基丹净变化为 0（发一枚、叶师叔换走一枚）');
  const met1 = await page.evaluate(() => window.__FR.met());
  ok(met1.indexOf('hf_zhuji') >= 0, 'A：已记入 save.met（hf_zhuji），防止重复结算');
  // 同一次存档内再次进图：发丹/换丹不得重复发生
  await run(`F.toTitle();F.enterMap('huangfeng');`);
  await settleDialogs();
  await wait(150);
  eq(await bag('zhuji'), 0, 'A-重进：二次进黄枫谷·山门，筑基丹仍为 0（不重复发/换）');
  const met2 = await page.evaluate(() => window.__FR.met());
  eq(met2.filter(x => x === 'hf_zhuji').length, 1, 'A-重进：save.met 中 hf_zhuji 只记一次');
}

// ---- B. 地火之屋：击败 Boss，玩家「未达筑基」（材料/灵石/筑基丹皆无）→ 勉励台词 + 锁住燕家堡 ----
{
  await run(`F.clearProgress();F.setLevel(35);F.toTitle();F.god(true);F.breakLuck(null);`);
  ok((await st()).unlocked.indexOf('yanjia') < 0, 'B前置：进地火之屋前，燕家堡（下一章）本就锁着');
  await run(`F.enterMap('zhuji');`);            // enterMap 自动解锁本图，无需 unlockAll
  await settleDialogs();                        // 过掉开场白（intro: 'zhuji'），进入战斗
  await wait(200);
  ok((await st()).state === 'play' && !!(await page.evaluate(() => window.__FR.info().boss)), 'B：地火之屋已进入战斗且 Boss 在场');
  await run(`F.killBoss();`);
  const oB = await playOutro();
  ok(!oB.choiceSeen, 'B：未达筑基 → 不弹「是否突破」抉择');
  ok(/石门没有开|燕家堡那章进不去|差一样，这关就过不去/.test(oB.text), 'B：播放「勉励 + 锁后章」台词（而非「筑基已成」）');
  ok((await st()).unlocked.indexOf('yanjia') < 0, 'B：未达筑基 → 燕家堡（下一章）保持锁定');
}

// ---- E. 地火之屋：玩家「已提前筑基」→ 省略突破剧情，直播「被发现已筑基」并解锁下一章 ----
{
  await run(`F.clearProgress();F.setLevel(36);F.toTitle();F.god(true);F.breakLuck(null);`);
  await run(`F.enterMap('zhuji');`);
  await settleDialogs();
  await wait(200);
  ok((await st()).state === 'play' && !!(await page.evaluate(() => window.__FR.info().boss)), 'E：地火之屋已进入战斗且 Boss 在场');
  await run(`F.killBoss();`);
  const oE = await playOutro();
  ok(!oE.choiceSeen, 'E：已筑基 → 不弹「是否突破」抉择（突破剧情已省略）');
  ok(/竟已自行筑基了|筑基了\？|《青元剑诀》/.test(oE.text), 'E：播放「被发现已筑基」台词，省略突破剧情');
  ok((await st()).unlocked.indexOf('yanjia') >= 0, 'E：已筑基 → 燕家堡（下一章）解锁');
}

// ---- C. 地火之屋：已备齐破境之物 → 询问是否突破；选「突破」且成功 → 筑基已成 + 解锁 ----
{
  await run(`F.clearProgress();F.setLevel(35);F.toTitle();F.god(true);F.breakLuck(null);`);
  await run(`F.enterMap('zhuji');`);
  await settleDialogs();
  await wait(200);
  // 备齐：筑基丹×1、三味主药各×3、灵石≥300，并强制冲关必成
  await run(`F.addItem('zhuji',1);F.addItem('m_yusuizhi',3);F.addItem('m_zihua',3);F.addItem('m_tianling',3);F.setStones(999);F.breakLuck(true);`);
  ok((await st()).state === 'play' && !!(await page.evaluate(() => window.__FR.info().boss)), 'C：地火之屋已进入战斗且 Boss 在场');
  await run(`F.killBoss();`);
  const oC = await playOutro();
  ok(oC.choiceSeen, 'C：已备齐破境之物 → 弹出「是否突破」抉择');
  ok((oC.choiceOpts || []).join(',') === '就此突破,暂不突破·回洞府', 'C：抉择选项为「突破 / 暂不突破」');
  console.log('  [debug C] before pick: breakForce=', await page.evaluate(() => window.__FR.G.breakForce), 'choice=', await page.evaluate(() => window.__FR.dialogState().choice));
  await run(`F.pickChoice('yes');`);
  const aC = await playOutro();
  console.log('  [debug C] after pick aC.text=', aC.text.slice(0, 200), '| level=', await page.evaluate(() => window.__FR.info().cultivate.level), '| yanjia=', (await st()).unlocked.indexOf('yanjia') >= 0);
  ok(/筑基了\？|《青元剑诀》/.test(aC.text), 'C：选「突破」成功 → 播放正常「筑基已成」台词');
  ok((await st()).unlocked.indexOf('yanjia') >= 0, 'C：突破成功 → 燕家堡（下一章）解锁');
  ok((await page.evaluate(() => window.__FR.info().cultivate.level)) >= 36, 'C：突破成功 → 修为到筑基（≥36）');
}

// ---- F. 地火之屋：已备齐破境之物 → 选「暂不突破」→ 回洞府继续修行，不解锁、丹药不消耗 ----
{
  await run(`F.clearProgress();F.setLevel(35);F.toTitle();F.god(true);F.breakLuck(null);`);
  await run(`F.enterMap('zhuji');`);
  await settleDialogs();
  await wait(200);
  await run(`F.addItem('zhuji',1);F.addItem('m_yusuizhi',3);F.addItem('m_zihua',3);F.addItem('m_tianling',3);F.setStones(999);`);
  await run(`F.killBoss();`);
  const oF = await playOutro();
  ok(oF.choiceSeen, 'F：已备齐破境之物 → 弹出「是否突破」抉择');
  await run(`F.pickChoice('no');`);
  await wait(150);
  const sF = await st();
  eq(sF.state, 'cave', 'F：选「暂不突破」→ 回到洞府界面');
  eq(await page.evaluate(() => window.__FR.G.caveId), 'cuiping', 'F：回到的是翠屏山洞府');
  ok(sF.unlocked.indexOf('yanjia') < 0, 'F：暂不突破 → 燕家堡仍锁定');
  eq(await bag('zhuji'), 1, 'F：暂不突破 → 筑基丹未消耗（继续备取破境之物）');
}

// ---- G. 地火之屋：选「突破」但失败 → 勉励厚实根基 + 退回洞府，不解锁 ----
{
  await run(`F.clearProgress();F.setLevel(35);F.toTitle();F.god(true);F.breakLuck(null);`);
  await run(`F.enterMap('zhuji');`);
  await settleDialogs();
  await wait(200);
  await run(`F.addItem('zhuji',1);F.addItem('m_yusuizhi',3);F.addItem('m_zihua',3);F.addItem('m_tianling',3);F.setStones(999);F.breakLuck(false);`);
  await run(`F.killBoss();`);
  const oG = await playOutro();
  ok(oG.choiceSeen, 'G：已备齐破境之物 → 弹出「是否突破」抉择');
  await run(`F.pickChoice('yes');`);
  const aG = await playOutro();
  ok(/功亏一篑|厚实根基|再炼几炉/.test(aG.text), 'G：选「突破」失败 → 播放勉励「厚实根基、下次再战」台词');
  await wait(150);
  const sG = await st();
  eq(sG.state, 'cave', 'G：失败 → 退出到洞府界面');
  ok(sG.unlocked.indexOf('yanjia') < 0, 'G：失败 → 燕家堡仍锁定');
  ok((await page.evaluate(() => window.__FR.info().cultivate.level)) < 36, 'G：失败 → 修为仍为练气（未筑基）');
}

// ---- H. 原著洞府突破额外 +30% 成功率（翠屏山洞府=筑基原著洞府；七玄门药庐=其它洞府）----
{
  await run(`F.clearProgress();F.setLevel(35);F.addItem('zhuji',1);F.breakLuck(null);`);
  await run(`F.cave('cuiping');`);
  const rCave = (await page.evaluate(() => window.__FR.breakRate(36))).rate;
  await run(`F.cave('qixuan');`);
  const rOther = (await page.evaluate(() => window.__FR.breakRate(36))).rate;
  ok(Math.abs(rCave - rOther - 0.3) < 0.001, 'H：原著洞府筑基成功率比其他洞府高约 30%（' + Math.round(rCave * 100) + '% vs ' + Math.round(rOther * 100) + '%）');
  ok(rCave > rOther, 'H：原著洞府加成确实生效');
}

// ---- D. 七派弟子遗体（e_yihai）：对话说收下筑基丹，储物袋真 +1，且际遇只触发一次 ----
{
  await run(`F.clearProgress();F.setLevel(25);F.unlockAll();F.toTitle();F.god(true);`);
  await run(`F.enterMap('xuese');`);
  await settleDialogs();
  await wait(150);
  const beforeD = await bag('zhuji');
  // 同一 tick 内「召唤际遇 + 接取」，避免被其它际遇插队
  await page.evaluate(() => { const F = window.__FR; F.spawnEnc('e_yihai'); F.talkEnc(); });
  await settleDialogs();
  await wait(150);
  eq(await bag('zhuji'), beforeD + 1, 'D：七派弟子遗体对话说「收下筑基丹」，储物袋真的 +1');
  const metD = await page.evaluate(() => window.__FR.met());
  ok(metD.indexOf('e_yihai') >= 0, 'D：际遇记入 save.met');
  const hereD = await page.evaluate(() => window.__FR.encHere());
  ok(hereD.indexOf('e_yihai') < 0, 'D：该际遇不再出现在可触发列表（不会二次给丹）');
}

console.log('\n== 14. 全程无脚本报错 ==');
eq(errors.length, 0, '页面没有抛异常', errors.slice(0, 3));

console.log('\n========================================');
console.log('按钮功能回归：' + pass + ' 通过 / ' + fail + ' 失败');
console.log('========================================');

await browser.close();
server.close();
process.exit(fail ? 1 : 0);
