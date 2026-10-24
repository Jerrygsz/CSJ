// 回归测试：战前运功面板 + 支线叠牌挂靠
// 1) 进要动手的图之前先弹「运功」面板，择定功法再入山（剧情/坊市/洞府不受影响）
// 2) 功法按大境界分档：本境摊开，低境界收在各档里，点档名才展开
// 3) 低境界里已运起的功法，提到本境那一档并排列着，不必回低境界去卸
// 4) 记住上一张图的运起结果：下一张战斗图照此先运起
// 5) 支线图不再全排最后，而是像叠牌挂在引出它的主线卡后
//
// 运行：在仓库根目录(fanren/)执行  node qa/verify-prefight.mjs
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

const b = await chromium.launch({ channel: 'chrome' });
// 刻意用较矮的视口：功法一多、档位一展开，最容易顶出屏幕
const page = await b.newPage({ viewport: { width: 400, height: 620 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 15000 });
// 测试里统一用 F 指代调试接口
await page.evaluate(() => { window.F = window.__FR; });

// 摆到结丹（本境=结丹，槽位 3），学几门跨境功法
await page.evaluate(() => {
  F.clearProgress();
  F.unlockAll();
  F.openAllCaves();
  F.setLevel(60);                 // 结丹，本境 = 结丹档
  F.learn('sword');               // 练气档
  F.learn('regen');               // 练气档
  F.learn('xuemo');               // 结丹档
  // 多学几门，把低境界那一档塞满 —— 展开后必定超过一屏，才能验出「不顶出屏幕」
  ['fire', 'orb', 'nova', 'frost', 'swift', 'magnet', 'haste', 'gourd', 'changchun'].forEach(id => F.learn(id));
  F.setSkill('sword', true);      // 先运起一门「低境界」的
});

// ---------- 5) 支线叠牌：挂在引出它的主线卡后 ----------
const deckInfo = await page.evaluate(() => {
  const sides = F.sideMaps();
  const one = sides.find(s => !s.on) || sides[0];
  if (one) F.unlockSide(one.id);
  F.worldmap();
  const decks = [...document.querySelectorAll('.mapdeck')].map(d => ({
    main: d.getAttribute('data-deck'),
    sides: [...d.querySelectorAll('.deck-side .mapcard')].map(c => c.getAttribute('data-map')),
    open: d.classList.contains('open')
  }));
  // 修行图末尾是否还有「支线 · 因缘」整段
  const tail = [...document.querySelectorAll('.wm-sec')].map(s => s.textContent).join('|');
  return { sideId: one ? one.id : null, decks, tail };
});
ok(deckInfo.decks.length >= 1, '支线挂成了叠牌（.mapdeck 存在）', deckInfo.decks.length);
ok(deckInfo.decks.some(d => d.sides.indexOf(deckInfo.sideId) >= 0),
  '支线卡确实挂在某个主线卡的牌堆里', { side: deckInfo.sideId, decks: deckInfo.decks });
ok(!/支线 · 因缘/.test(deckInfo.tail), '不再有整段「支线·因缘」压在最后', deckInfo.tail);

// 点主线卡 → 展开（第一次点不进图）
const expand = await page.evaluate(() => {
  const d = document.querySelector('.mapdeck');
  const mainId = d.getAttribute('data-deck');
  const card = d.querySelector('.mapcard[data-map="' + mainId + '"]');
  card.click();
  const after = document.querySelector('.mapdeck[data-deck="' + mainId + '"]');
  return { mainId, open: after ? after.classList.contains('open') : null };
});
ok(expand.open === true, '点主线卡先展开牌堆（不直接进图）', expand);
const collapse = await page.evaluate(() => {
  const d = document.querySelector('.mapdeck[data-deck="' + (document.querySelector('.mapdeck').getAttribute('data-deck')) + '"]');
  d.querySelector('[data-decktog]').click();
  const after = document.querySelector('.mapdeck');
  return { open: after.classList.contains('open') };
});
ok(collapse.open === false, '点切换可收起牌堆', collapse);

// 学了一堆之后槽位会被自动占满，这里把「身上运着谁」定死，后面的断言才有准数：
// 只运两门 —— 低境界的御剑术 + 本境的血魔剑诀
await page.evaluate(() => {
  ['sword', 'regen', 'xuemo', 'fire', 'orb', 'nova', 'frost', 'swift', 'magnet', 'haste', 'gourd', 'changchun']
    .forEach(id => F.setSkill(id, false));
  F.setSkill('sword', true);
  F.setSkill('xuemo', true);
});
const equippedNow = await page.evaluate(() => F.skillState().equipped.slice());
ok(equippedNow.indexOf('sword') >= 0 && equippedNow.indexOf('xuemo') >= 0,
  '已明确运起：御剑术（练气档）+ 血魔剑诀（结丹档）', equippedNow);

// ---------- 1) 进战斗图前先弹运功面板 ----------
const toDiff = await page.evaluate(() => {
  const info = F.info();
  // 挑一张「没挂支线牌堆」的战斗图：挂了牌堆的主线卡第一次点是展开，不是进图
  const m = window.MAPS.find(x => !x.side && (x.type === 'combat' || x.type === 'boss') &&
    info.unlocked.indexOf(x.id) >= 0 && !document.querySelector('.mapdeck[data-deck="' + x.id + '"]'));
  if (!m) return { err: 'no combat map' };
  const card = document.querySelector('#wmList .mapcard[data-map="' + m.id + '"]');
  if (!card) return { err: 'no card' };
  card.click();
  return { mapId: m.id, diffShown: document.getElementById('difficulty').style.display };
});
ok(toDiff.diffShown === 'flex', '战斗图先择难度', toDiff);

const toPf = await page.evaluate(() => {
  const dc = document.querySelector('#diffList .diffcard');
  if (!dc) return { err: 'no diffcard' };
  dc.click();
  return {
    pfShown: document.getElementById('prefight').style.display,
    diffShown: document.getElementById('difficulty').style.display
  };
});
ok(toPf.pfShown === 'flex', '择完难度后先弹「运功」面板（不是直接开打）', toPf);
ok(toPf.diffShown !== 'flex', '难度面板已让位', toPf);

// ---------- 2)(3) 按大境界分档 + 低境界已运起的提到本境 ----------
const pf = await page.evaluate(() => {
  const blocks = [...document.querySelectorAll('#pfBody .pf-tier')].map(t => ({
    id: t.getAttribute('data-pftier'),
    cur: t.classList.contains('cur'),
    open: t.classList.contains('open'),
    skills: [...t.querySelectorAll('[data-pfskill]')].map(bt => bt.getAttribute('data-pfskill'))
  }));
  return { blocks, slots: (document.getElementById('pfSlots') || {}).textContent };
});
const curBlock = pf.blocks.find(x => x.cur);
ok(!!curBlock, '有「本境」那一档', pf.blocks);
ok(curBlock && curBlock.id === 'jiedan', '本境档是结丹（等级 60）', curBlock);
ok(curBlock && curBlock.open === true, '本境档默认摊开', curBlock);
const lowerBlocks = pf.blocks.filter(x => !x.cur);
ok(lowerBlocks.length >= 1, '低境界另成一档（收纳着）', lowerBlocks.map(x => x.id));
ok(lowerBlocks.every(x => !x.open), '低境界档默认收起，点档名才展开', lowerBlocks.map(x => ({ id: x.id, open: x.open })));
ok(curBlock && curBlock.skills.indexOf('sword') >= 0,
  '低境界已运起的御剑术被提到本境档并列（可直接卸，不必回低境界翻）', curBlock && curBlock.skills);

// 展开低境界档 → 能看到剩下的低境功法
const expandLower = await page.evaluate(() => {
  const t = [...document.querySelectorAll('#pfBody .pf-tier')].find(x => !x.classList.contains('cur'));
  if (!t) return { err: 'no lower' };
  const id = t.getAttribute('data-pftier');
  t.querySelector('.pf-tier-hd').click();
  const after = document.querySelector('#pfBody .pf-tier[data-pftier="' + id + '"]');
  return { id, open: after.classList.contains('open'), skills: [...after.querySelectorAll('[data-pfskill]')].map(b => b.getAttribute('data-pfskill')) };
});
ok(expandLower.open === true, '点档名能展开低境界档', expandLower);
ok((expandLower.skills || []).indexOf('regen') >= 0, '展开后能看到低境界的回春诀', expandLower.skills);

// ---------- 展开再多也不能顶出屏幕 ----------
const fit = await page.evaluate(() => {
  // 把所有档位全展开，造出最长的列表（点一次会重绘，所以每轮都要重新取节点）
  for (let i = 0; i < 12; i++) {
    const t = document.querySelector('#pfBody .pf-tier:not(.open)');
    if (!t) break;
    t.querySelector('.pf-tier-hd').click();
  }
  const panel = document.querySelector('#prefight .wm-panel');
  const body = document.getElementById('pfBody');
  const pr = panel.getBoundingClientRect();
  const br = body.getBoundingClientRect();
  return {
    top: Math.round(pr.top), bottom: Math.round(pr.bottom), vh: window.innerHeight,
    bodyTop: Math.round(br.top), bodyBottom: Math.round(br.bottom),
    overflowY: getComputedStyle(body).overflowY,
    scrollable: body.scrollHeight > body.clientHeight + 1,
    scrollH: body.scrollHeight, clientH: body.clientHeight,
    rows: document.querySelectorAll('#pfBody [data-pfskill]').length,
    tiers: document.querySelectorAll('#pfBody .pf-tier').length,
    openTiers: document.querySelectorAll('#pfBody .pf-tier.open').length
  };
});
ok(fit.top >= -1 && fit.bottom <= fit.vh + 1, '展开档位后面板整体仍在屏幕内', fit);
ok(fit.bodyBottom <= fit.vh + 1, '功法列表底部不越出屏幕', fit);
ok(fit.overflowY === 'auto' || fit.overflowY === 'scroll', '列表在面板内滚动（不撑破面板）', fit.overflowY);
ok(fit.scrollable === true, '内容确实超过一屏，且是靠滚动解决的（不是靠顶出去）', fit);

// ---------- 4) 记住：卸掉后重开，照上次结果先运起 ----------
const beforeGo = await page.evaluate(() => F.skillState().equipped.slice());
const went = await page.evaluate(() => {
  document.getElementById('pfGo').click();
  return { state: F.info().state, pfShown: document.getElementById('prefight').style.display };
});
ok(went.state === 'play' || went.state === 'dialog', '点「入山」才真的开打', went);
ok(went.pfShown !== 'flex', '开打后面板收起', went);

// 把御剑术卸了，再进下一张战斗图，应照记忆先运起
const memory = await page.evaluate(() => {
  F.setSkill('sword', false);
  const info = F.info();
  const m = window.MAPS.find(x => !x.side && (x.type === 'combat' || x.type === 'boss') &&
    info.unlocked.indexOf(x.id) >= 0 && !document.querySelector('.mapdeck[data-deck="' + x.id + '"]'));
  F.worldmap();
  const card = document.querySelector('#wmList .mapcard[data-map="' + m.id + '"]');
  card.click();
  document.querySelector('#diffList .diffcard').click();
  const blocks = [...document.querySelectorAll('#pfBody .pf-tier')].map(t => ({
    cur: t.classList.contains('cur'),
    skills: [...t.querySelectorAll('[data-pfskill]')].map(b => b.getAttribute('data-pfskill'))
  }));
  return { equipped: F.skillState().equipped.slice(), curSkills: (blocks.find(x => x.cur) || {}).skills };
});
const same = JSON.stringify(memory.equipped.slice().sort()) === JSON.stringify(beforeGo.slice().sort());
ok(same, '下一张战斗图照上一张的记忆先运起（与上次一致）', { before: beforeGo, after: memory.equipped });
ok(memory.equipped.indexOf('sword') >= 0, '记忆里有上次运起的御剑术（低境界那门也一并恢复）', memory.equipped);

ok(errs.length === 0, '页面无报错', errs.slice(0, 5));

await b.close();

console.log('\n== 战前运功 / 支线叠牌 ==');
if (bad.length) { console.log('失败项：'); for (const m of bad) console.log('  ✗ ' + m); }
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
process.exit(fail ? 1 : 0);
