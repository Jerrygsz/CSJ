// 校验仙界篇（飞升之后）：卷一《风起灵寰》六图、金仙破境关、仙界材料/功法、掉落分层
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8997;
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

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const IDS = ['linghuan', 'suxing', 'lingyan', 'xiaoping', 'tiangui', 'poxu', 'wumengdao'];

// ---- 1) 六图注册与链条 ----
console.log('\n== 1. 卷一六图与链条 ==');
const M1 = await page.evaluate((ids) => {
  const W = window, M = id => W.MAPS.find(m => m.id === id) || {};
  return {
    maps: ids.map(id => {
      const m = M(id);
      return { id, name: m.name, type: m.type, arc: m.arc, pos: m.pos, unlock: m.unlock, next: m.next, lv: m.startLevel };
    }),
    prevNext: M('xianjie').next,
    prevClear: M('xianjie').clearDesc
  };
}, IDS);
ok(M1.maps.length === 7 && M1.maps.every(m => m.arc === 'M'), '卷一七图已注册且都在 arc M（仙界篇）', M1.maps);
ok(M1.prevNext === 'linghuan', '前传终点「飞升仙界」接上灵寰界（不再是终点）', M1.prevNext);
const chain = M1.maps.map(m => m.next);
ok(chain[0] === 'suxing' && chain[1] === 'lingyan' && chain[2] === 'xiaoping'
  && chain[3] === 'tiangui' && chain[4] === 'poxu' && chain[5] === 'wumengdao' && chain[6] === null,
  '链条完整：灵寰界→苏醒→冷焰宗→掌天瓶→天鬼→破碎虚空→乌蒙岛（金仙破境图）', chain);
ok(M1.maps.every(m => m.unlock), '每张图都有解锁前驱', M1.maps.map(m => m.unlock));

// ---- 2) 密度是波形，不是连排剧情 ----
console.log('\n== 2. 密度波形 ==');
const T2 = await page.evaluate((ids) => {
  const W = window;
  return {
    types: ids.map(id => (W.MAPS.find(m => m.id === id) || {}).type),
    lines: ids.map(id => ((W.MAP_STORIES[id] || []).length)),
    texts: ids.map(id => (W.MAP_STORIES[id] || []).map(x => x[1]).join(''))
  };
}, IDS);
ok(T2.types.join(',') === 'story,story,boss,story,boss,story,story',
  '卷一也是波形（剧情→剧情→战斗→剧情→战斗→剧情→破境）', T2.types);
ok(T2.lines.every(n => n >= 9), '每张图对白都不少于 9 行', T2.lines);
ok(/石头哥哥/.test(T2.texts[0]) && /拨浪鼓/.test(T2.texts[0]), '灵寰界写的是「石头哥哥」与拨浪鼓（X1C1-C3）', T2.texts[0].slice(0, 20));
ok(/人族第一修士/.test(T2.texts[1]) && /灵界第一大乘/.test(T2.texts[1]), '苏醒那张写回「人族第一修士，灵界第一大乘」（X1C12 原句）', '');
ok(/谪仙/.test(T2.texts[2]) && /流落/.test(T2.texts[2]), '冷焰宗那张有「谪仙」与「流落」（X1C39 原句）', '');
ok(/掌天瓶/.test(T2.texts[3]) && /它回来了/.test(T2.texts[3]), '掌天瓶回归（X1C41-C42）', '');
ok(/玄黄之索/.test(T2.texts[4]) && /天鬼/.test(T2.texts[4]), '天鬼那张用玄黄之索收百目天鬼（X1C65-C67）', '');
ok(/破碎虚空/.test(T2.texts[5]) && /气泡/.test(T2.texts[5]), '破碎虚空与神秘气泡（X1C79-C80）', '');

// ---- 3) 金仙破境关 ----
console.log('\n== 3. 金仙破境关 ==');
const G3 = await page.evaluate(() => {
  const W = window;
  const g = W.BREAKTHROUGH.find(x => x.lv === 460) || {};
  const rl = W.REALM_LAYERS.filter(r => r.lv <= 460).pop() || {};
  return {
    exists: !!g.lv, realm: g.realm, from: g.from, mats: g.mats, stones: g.stones,
    story: (g.story || []).map(s => s.id),
    text: (g.lines || []).map(x => x[1]).join(''),
    layer: rl.name, layerLv: rl.lv,
    slots: W.skillSlots(460), cap: W.realmSkillCap(460)
  };
});
ok(G3.exists && G3.realm === '金仙', '金仙破境关已立（lv460）', G3);
const WM = await page.evaluate(() => {
  const W = window;
  const m = W.MAPS.find(x => x.id === 'wumengdao') || {};
  const g = W.BREAKTHROUGH.find(x => x.lv === 460) || {};
  const text = (W.MAP_STORIES['wumengdao'] || []).map(x => x[1]).join('');
  return { endLevel: m.endLevel, type: m.type, unlock: m.unlock, next: m.next, text,
    lines: (W.MAP_STORIES['wumengdao'] || []).length,
    gateStory: (g.story || []).map(s => s.id) };
});
ok(WM.endLevel === 460 && WM.type === 'story' && WM.unlock === 'poxu',
  '乌蒙岛是金仙破境图（endLevel=460，前置破碎虚空）', WM);
ok(/三十六仙窍/.test(WM.text) && /黑风海域/.test(WM.text) && /五衰/.test(WM.text),
  '乌蒙岛对白用原著口径：黑风海域 / 三十六仙窍 / 五衰', WM.text.slice(0, 24));
ok(G3.story.length === 1 && G3.story[0] === 'poxu', '金仙关的剧情前置是卷一末图「破碎虚空」', G3.story);
ok(/五衰/.test(G3.text) && /三十六仙窍/.test(G3.text), '关卡对白用原著口径：五衰 + 三十六仙窍（X2C151/C327）', G3.text.slice(0, 24));
ok(G3.mats.some(x => x[0] === 'm_xianyuanshi') && G3.mats.some(x => x[0] === 'm_xuanhuang'), '金仙关消耗仙元石与玄黄之气', G3.mats);
ok(G3.layer === '金仙' && G3.layerLv === 460, '境界层已加金仙档', G3);
ok(G3.slots === 9 && G3.cap === 11, '金仙功法位 9、层数上限 11', { slots: G3.slots, cap: G3.cap });

// ---- 4) 仙界材料 / 成品 / 功法 / 敌人 ----
console.log('\n== 4. 仙界条目 ==');
const I4 = await page.evaluate(() => {
  const W = window;
  const get = id => (W.ALL_ITEMS || []).find(x => x.id === id) || null;
  const list = ['m_xianyuanshi', 'm_xuanhuang', 't_xuanhuangs', 't_lingyingjianfu', 't_tianwaifeidou', 'sk_niandan', 'sk_nuoyi'];
  const items = {};
  for (const id of list) { const it = get(id); items[id] = it ? { name: it.name, req: it.req, rarity: it.rarity, teach: it.teach || null, noDrop: !!it.noDrop } : null; }
  return {
    items,
    skills: W.SKILLS.filter(s => ['niandan', 'nuoyi'].indexOf(s.id) >= 0).map(s => ({ id: s.id, minLv: s.minLv, type: s.type })),
    enemies: ['lh_xiongshou', 'lh_hanbing', 'lh_lingzhu', 'lh_baishi', 'lh_tiangui'].map(k => !!W.ENEMY_TYPES[k]),
    bossNames: ['lingyan', 'tiangui'].map(id => { const m = W.MAPS.find(x => x.id === id); return m && m.boss ? m.boss.name : null; }),
    prevKeeps: ['dan_guangling', 't_xuantianjian', 'm_zhenlingxue'].map(id => !!get(id))
  };
});
ok(I4.items.m_xianyuanshi && I4.items.m_xianyuanshi.rarity === 4, '仙元石已入库（仙界通用之物）', I4.items.m_xianyuanshi);
ok(I4.items.t_xuanhuangs && I4.items.t_xuanhuangs.noDrop === true, '玄黄之索入库且不进随机池（原著只此一件）', I4.items.t_xuanhuangs);
ok(I4.items.t_lingyingjianfu && I4.items.t_tianwaifeidou, '灵婴剑符 / 天外飞豆入库', I4.items);
ok(I4.skills.length === 2 && I4.skills.every(s => s.minLv >= 430), '仙界功法两门（逆丹诀 430 / 小挪移空间术 440）', I4.skills);
ok(I4.items.sk_niandan && I4.items.sk_niandan.teach === 'niandan', '法诀道具与功法对应', I4.items.sk_niandan);
ok(I4.enemies.every(Boolean), '仙界篇敌人条目齐（5 种）', I4.enemies);
ok(I4.bossNames[0] === '白石真人' && I4.bossNames[1] === '百目天鬼', '两个 Boss 用的是原著人物', I4.bossNames);
ok(I4.prevKeeps.every(Boolean), '前传物品未被仙界篇改动', I4.prevKeeps);

// ---- 5) 掉落分层：仙界档不出人界破烂 ----
console.log('\n== 5. 仙界掉落分层 ==');
const L5 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  F.clearProgress(); F.setLevel(419); F.god(true); F.unlockAll();
  F.enterMap('tiangui');
  const floor = F.lootFloor();
  const smallItems = [], smallMats = [];
  for (let i = 0; i < 12; i++) { const d = F.simDrop(0); if (!d) continue; if (d.mat) smallMats.push(d.mat); else smallItems.push(d.item); }
  const pool = [0, 1, 2, 3, 4].flatMap(r => F.dropPool(r).map(i => i.req));
  return {
    floor, smallItems, smallMats,
    poolMin: pool.length ? Math.min(...pool) : null, poolMax: pool.length ? Math.max(...pool) : null,
    era: F.lootEra()
  };
});
ok(L5.floor === 420, '仙界档成品门槛 420（真仙级往上）', L5.floor);
ok(L5.smallItems.length === 0, '仙界小怪不掉成品，只掉灵物', L5.smallItems);
ok(L5.poolMin === null || L5.poolMin >= 420, '仙界成品池里没有 req<420 的东西', { min: L5.poolMin, max: L5.poolMax });

// ---- 6) 全流程实测：把卷一走一遍 ----
console.log('\n== 6. 卷一全流程 ==');
const R6 = await page.evaluate(async (ids) => {
  const W = window, F = W.__FR;
  F.clearProgress(); F.setLevel(419); F.god(true); F.unlockAll();
  const steps = [];
  for (const id of ids) {
    F.enterMap(id, 'easy');
    for (let k = 0; k < 24; k++) { F.skipStory(); F.tickFrames(2); }
    const m = W.MAPS.find(x => x.id === id);
    if (m.boss) {
      F.boss(); F.killBoss();
      // 升级的三选一面板会挡住结算流程，必须在推进过程中顺手点掉
      for (let k = 0; k < 60; k++) { F.skipStory(); F.tickFrames(3); if (F.info().state === 'levelup') F.insightAuto(); }
    }
    for (let k = 0; k < 12; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
    const i = F.info();
    steps.push({ id, cleared: i.cleared.indexOf(id) >= 0, state: i.state, lv: i.level });
  }
  const bag = F.bag();
  return {
    steps,
    allCleared: steps.every(s => s.cleared),
    bag: { xianyuanshi: bag.m_xianyuanshi || 0, xuanhuang: bag.m_xuanhuang || 0, xuanhuangs: bag.t_xuanhuangs || 0, tianwaifeidou: bag.t_tianwaifeidou || 0 }
  };
}, IDS);
ok(R6.allCleared, '卷一六图可依次通关', R6.steps.filter(s => !s.cleared));
ok(R6.bag.xianyuanshi >= 1, '仙元石进背包（仙界关的消耗来源）', R6.bag);
ok(R6.bag.xuanhuangs >= 1 && R6.bag.tianwaifeidou >= 1, '玄黄之索 / 天外飞豆进背包', R6.bag);
ok(R6.steps.every(s => s.lv <= 420), '全程不越真仙档（≤420）', R6.steps.map(s => s.lv));

console.log('\n--------------------------------');
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
if (errors.length) console.log('页面错误:', errors.join(' | '));
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
