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

const IDS = ['linghuan', 'suxing', 'lingyan', 'xiaoping', 'tiangui', 'poxu', 'wumengdao', 'chulong', 'huijie', 'taiyi', 'dijiang', 'xingqi', 'dadi', 'daotian'];

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
ok(M1.maps.length === 14 && M1.maps.every(m => m.arc === 'M'), '仙界篇十四图已注册且都在 arc M', M1.maps);
ok(M1.prevNext === 'linghuan', '前传终点「飞升仙界」接上灵寰界（不再是终点）', M1.prevNext);
const chain = M1.maps.map(m => m.next);
ok(chain[0] === 'suxing' && chain[1] === 'lingyan' && chain[2] === 'xiaoping'
  && chain[3] === 'tiangui' && chain[4] === 'poxu' && chain[5] === 'wumengdao'
  && chain[6] === 'chulong' && chain[7] === 'huijie' && chain[8] === 'taiyi'
  && chain[9] === 'dijiang' && chain[10] === 'xingqi' && chain[11] === 'dadi' && chain[12] === 'daotian' && chain[13] === null,
  '链条完整：灵寰界→…→进阶太乙→帝江坊→五城会武→大墟→道天大劫', chain);
ok(M1.maps.every(m => m.unlock), '每张图都有解锁前驱', M1.maps.map(m => m.unlock));

// ---- 2) 密度是波形，不是连排剧情 ----
console.log('\n== 2. 密度波形 ==');
const T2 = await page.evaluate((ids) => {
  const W = window;
  return {
    types: ids.map(id => (W.MAPS.find(m => m.id === id) || {}).type),
    // 破境图（wumengdao / taiyi）的演出在 BREAKTHROUGH.lines 里，不在 MAP_STORIES
    lines: ids.map(id => {
      const m = W.MAPS.find(x => x.id === id) || {};
      // 破境图（endLevel = 关卡等级）的演出在同等级那道 BREAKTHROUGH 的 lines 里
      const br = (W.BREAKTHROUGH || []).find(b => b.lv === m.endLevel);
      return (W.MAP_STORIES[id] || []).length + (br ? (br.lines || []).length : 0);
    }),
    texts: ids.map(id => (W.MAP_STORIES[id] || []).map(x => x[1]).join(''))
  };
}, IDS);
ok(T2.types.join(',') === 'story,story,boss,story,boss,story,story,boss,story,story,market,story,boss,story',
  '仙界篇也是波形（静—打—静—大打—收—坊市—静—打—静）', T2.types);
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
const TY = await page.evaluate(() => {
  const W = window;
  const g = W.BREAKTHROUGH.find(x => x.lv === 520) || {};
  const m = W.MAPS.find(x => x.id === 'taiyi') || {};
  const rl = W.REALM_LAYERS.filter(r => r.lv <= 520).pop() || {};
  return { realm: g.realm, mats: g.mats, story: (g.story || []).map(s => s.id),
    text: (g.lines || []).map(x => x[1]).join(''), endLevel: m.endLevel, type: m.type,
    layer: rl.name, slots: W.skillSlots(520), cap: W.realmSkillCap(520) };
});
ok(TY.realm === '太乙' && TY.endLevel === 520 && TY.type === 'story', '太乙破境关已立（460→520，破境图进阶太乙）', TY);
ok(TY.story[0] === 'huijie', '太乙关的剧情前置是灰界', TY.story);
ok(/莲苞/.test(TY.text) && /异兽/.test(TY.text), '太乙关用原著口径：仙灵莲苞硬扛异兽围攻', TY.text.slice(0, 24));
ok(TY.layer === '太乙' && TY.slots === 10 && TY.cap === 12, '太乙档已进境界层（功法位 10 / 上限 12）', TY);
ok(G3.slots === 9 && G3.cap === 11, '金仙功法位 9、层数上限 11', { slots: G3.slots, cap: G3.cap });

// ---- 3·b) 后传卷三《时空迷踪》四图 + 帝江坊货架 + 大罗关 ----
console.log('\n== 3b. 卷三《时空迷踪》 ==');
const V3 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  const M = id => W.MAPS.find(m => m.id === id) || {};
  const get = id => (W.ALL_ITEMS || []).find(x => x.id === id) || null;
  F.clearProgress(); F.setLevel(519); F.god(true); F.unlockAll();

  // ① 帝江坊（market）
  // 注意：market 图的 reward 与 cleared 都在「关掉商店」时的 finishMap 里发，
  // 所以必须点一次 shopClose，否则拿到的是空袋子。
  F.enterMap('dijiang');
  const djState = F.info().state;
  for (let k = 0; k < 20; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
  const djShopState = F.info().state;
  const sc = document.getElementById('shopClose');
  if (sc) sc.click();
  for (let k = 0; k < 8; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
  const djBag = F.bag();
  const djCleared = F.info().cleared.indexOf('dijiang') >= 0;

  // ② 星器·五城会武（story）
  F.enterMap('xingqi');
  for (let k = 0; k < 20; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
  const xqBag = F.bag();

  // ③ 大墟（boss）
  F.enterMap('dadi', 'easy');
  for (let k = 0; k < 24; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
  const boss = F.boss();
  F.killBoss();
  for (let k = 0; k < 60; k++) { F.skipStory(); F.tickFrames(3); if (F.info().state === 'levelup') F.insightAuto(); }
  const ddCleared = F.info().cleared.indexOf('dadi') >= 0;

  // ④ 道天大劫（破境图 520→580）
  F.enterMap('daotian');
  for (let k = 0; k < 24; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }

  const g580 = W.BREAKTHROUGH.find(x => x.lv === 580) || {};
  const rl = W.REALM_LAYERS.filter(r => r.lv <= 580).pop() || {};
  const djText = (W.MAP_STORIES['dijiang'] || []).map(x => x[1]).join('');
  const xqText = (W.MAP_STORIES['xingqi'] || []).map(x => x[1]).join('');
  const ddText = (W.MAP_STORIES['dadi'] || []).map(x => x[1]).join('');
  const dtText = (W.MAP_STORIES['daotian'] || []).map(x => x[1]).join('');
  const stock = (W.SHOP_STOCK || []).filter(s => ['m_shijian', 'sk_dawuxing', 'sk_zhenyan'].indexOf(s.id) >= 0);

  return {
    dj: { type: M('dijiang').type, pos: M('dijiang').pos, unlock: M('dijiang').unlock, next: M('dijiang').next,
      text: djText, state: djState, shopState: djShopState, cleared: djCleared,
      item: get('t_taifeidumu') ? get('t_taifeidumu').name : null,
      gotFruit: (djBag.t_taifeidumu || 0) },
    xq: { type: M('xingqi').type, pos: M('xingqi').pos, unlock: M('xingqi').unlock, next: M('xingqi').next,
      text: xqText, gotShield: (xqBag.t_xingqidun || 0) },
    dd: { type: M('dadi').type, lv: M('dadi').startLevel, unlock: M('dadi').unlock, next: M('dadi').next,
      bossName: (M('dadi').boss || {}).name, bossHp: (M('dadi').boss || {}).hp, text: ddText, cleared: ddCleared },
    dt: { type: M('daotian').type, endLevel: M('daotian').endLevel, unlock: M('daotian').unlock,
      next: M('daotian').next, text: dtText },
    g580: { realm: g580.realm, mats: g580.mats, story: (g580.story || []).map(s2 => s2.id),
      text: (g580.lines || []).map(x => x[1]).join('') },
    realm: rl.name, slots: W.skillSlots(580), cap: W.realmSkillCap(580),
    skills: W.SKILLS.filter(s2 => s2.minLv >= 520).map(s2 => s2.id),
    stock: stock.map(s2 => s2.id + '@' + s2.price),
    boss
  };
});
ok(V3.dj.type === 'market' && /夜阳城/.test(V3.dj.pos) && V3.dj.unlock === 'taiyi' && V3.dj.next === 'xingqi',
  '帝江坊是仙界唯一 market 图，挂在进阶太乙之后（X3C828）', V3.dj);
ok(/不许驾车入内/.test(V3.dj.text) && /摩诃区/.test(V3.dj.text) && /太蜚独目/.test(V3.dj.text)
  && /时间法则/.test(V3.dj.text),
  '帝江坊对白用原著实词：夜阳城/摩诃区/太蜚独目/时间法则之物', V3.dj.text.slice(0, 24));
ok(V3.dj.shopState === 'shop', '帝江坊进得去（摆摊状态）', V3.dj.shopState);
ok(!!V3.dj.item && V3.dj.gotFruit >= 1 && V3.dj.cleared, '太蜚独目入库并由帝江坊结算给出',
  { item: V3.dj.item, n: V3.dj.gotFruit, cleared: V3.dj.cleared });
ok(V3.xq.type === 'story' && V3.xq.unlock === 'dijiang' && V3.xq.next === 'dadi',
  '星器·五城会武串在帝江坊与大墟之间（X3C892–C913）', V3.xq);
ok(/星器/.test(V3.xq.text) && /星斗盾/.test(V3.xq.text) && /五城会武/.test(V3.xq.text)
  && /精血/.test(V3.xq.text),
  '星器对白用原著实词：星器/星斗盾/五城会武/精血祭炼', V3.xq.text.slice(0, 24));
ok(V3.xq.gotShield >= 1, '星斗盾由五城会武给出', { n: V3.xq.gotShield });
ok(V3.dd.type === 'boss' && V3.dd.lv === 520 && V3.dd.unlock === 'xingqi' && V3.dd.next === 'daotian',
  '大墟串在五城会武与道天大劫之间（X3C917–C943）', V3.dd);
ok(/昏黄/.test(V3.dd.text) && /戈壁/.test(V3.dd.text) && /鳞犼/.test(V3.dd.text) && /埋骨/.test(V3.dd.text),
  '大墟对白用原著实词：昏黄戈壁/鳞犼/埋骨之地', V3.dd.text.slice(0, 24));
ok(!!V3.boss && V3.dd.cleared, '大墟首领能刷出来且能通关', { boss: V3.boss, cleared: V3.dd.cleared });
ok(V3.dt.type === 'story' && V3.dt.endLevel === 580 && V3.dt.unlock === 'dadi' && V3.dt.next === null,
  '道天大劫是大罗破境图（520→580）', V3.dt);
ok(/高如皇天/.test(V3.dt.text) && /灰黑/.test(V3.dt.text) && /三十六仙窍/.test(V3.dt.text),
  '道天大劫用原著实词：高如皇天/灰黑/三十六仙窍', V3.dt.text.slice(0, 24));
ok(V3.g580.realm === '大罗' && V3.g580.story[0] === 'dadi', '大罗破境关已立（lv580），前置大墟', V3.g580);
ok(/高如皇天/.test(V3.g580.text), '大罗关演出用原著口径', V3.g580.text.slice(0, 20));
ok(V3.realm === '大罗' && V3.slots === 11 && V3.cap === 13, '大罗档已进境界层（功法位 11 / 上限 13）', V3);
ok(V3.skills.indexOf('dawuxing') >= 0 && V3.skills.indexOf('zhenyan') >= 0, '卷三两门功法已入库', V3.skills);
ok(V3.stock.length === 3, '帝江坊货架上架了时间法则之物与两门卷三功法', V3.stock);

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
    if (m.type === 'market') {
      // 坊市不靠打架通关：得把摊关掉（shopClose）才会结算并记入已通关
      const sc = document.getElementById('shopClose');
      if (sc) sc.click();
      for (let k = 0; k < 12; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
    }
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
ok(R6.steps.slice(0, 7).every(s => s.lv <= 420) && R6.steps.slice(7, 10).every(s => s.lv <= 520)
  && R6.steps.slice(10).every(s => s.lv <= 580),
  '全程不越档：卷一七图 ≤420，卷二三图 ≤520，卷三四图 ≤580', R6.steps.map(s => s.lv));

console.log('\n--------------------------------');
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
if (errors.length) console.log('页面错误:', errors.join(' | '));
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
