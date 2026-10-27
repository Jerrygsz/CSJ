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

// 全链：卷一六图 + 金仙/太乙/大罗/道祖四道破境图 + 卷二卷三 + 卷四卷五（X1–X5）
const IDS = ['linghuan', 'suxing', 'lingyan', 'xiaoping', 'tiangui', 'poxu', 'wumengdao',
  'chulong', 'huijie', 'taiyi', 'dijiang', 'xingqi', 'dadi',
  'xiedao', 'jingong', 'taisui', 'chongchao', 'suidian', 'daluo', 'wubao', 'jiuyuan',
  'zaimiao', 'zhanshi', 'youming', 'leihai', 'fuyao', 'shifang', 'daotian', 'daoyi', 'feiyu'];

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
ok(M1.maps.length === 30 && M1.maps.every(m => m.arc === 'M'), '仙界篇三十图已注册且都在 arc M（X1–X5 全卷）', M1.maps.length);
ok(M1.prevNext === 'linghuan', '前传终点「飞升仙界」接上灵寰界（不再是终点）', M1.prevNext);
const chain = M1.maps.map(m => m.next);
const WANT = ['suxing', 'lingyan', 'xiaoping', 'tiangui', 'poxu', 'wumengdao', 'chulong', 'huijie', 'taiyi',
  'dijiang', 'xingqi', 'dadi', 'xiedao', 'jingong', 'taisui', 'chongchao', 'suidian', 'daluo', 'wubao', 'jiuyuan',
  'zaimiao', 'zhanshi', 'youming', 'leihai', 'fuyao', 'shifang', 'daotian', 'daoyi', 'feiyu', null];
ok(chain.length === WANT.length && chain.every((v, i) => v === WANT[i]),
  '链条完整：卷一→乌蒙岛→烛龙道→灰界→太乙→帝江坊→五城会武→大墟→卷四《大罗之争》→卷五《大道归一》→飞羽', chain);
ok(M1.maps.every(m => !m.unlock || M1.maps.some(x => x.id === m.unlock) || m.unlock === 'xianjie'),
  '每张图的解锁前驱都存在', M1.maps.map(m => m.unlock));

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
ok(T2.types.join(',') === 'story,story,boss,story,boss,story,story,boss,story,story,market,story,boss,'
  + 'story,boss,story,boss,boss,story,market,boss,boss,story,boss,story,story,boss,story,boss,story',
  '仙界篇都是波形（卷一藏、卷二最密、卷三峰后有谷、卷四最密、卷五收一场）', T2.types);
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

  // ④ 积鳞空境·天变了（X3C989 卷三收尾：蟹道人的道天大劫，lv520 剧情图）
  F.enterMap('xiedao');
  for (let k = 0; k < 24; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }

  const g580 = W.BREAKTHROUGH.find(x => x.lv === 580) || {};
  const g640 = W.BREAKTHROUGH.find(x => x.lv === 640) || {};
  const rl = W.REALM_LAYERS.filter(r => r.lv <= 580).pop() || {};
  const djText = (W.MAP_STORIES['dijiang'] || []).map(x => x[1]).join('');
  const xqText = (W.MAP_STORIES['xingqi'] || []).map(x => x[1]).join('');
  const ddText = (W.MAP_STORIES['dadi'] || []).map(x => x[1]).join('');
  const dtText = (W.MAP_STORIES['xiedao'] || []).map(x => x[1]).join('');
  const dzText = (W.MAP_STORIES['daotian'] || []).map(x => x[1]).join('');
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
    dt: { type: M('xiedao').type, endLevel: M('xiedao').endLevel, unlock: M('xiedao').unlock,
      next: M('xiedao').next, text: dtText },
    dz: { type: M('daotian').type, endLevel: M('daotian').endLevel, unlock: M('daotian').unlock,
      next: M('daotian').next, text: dzText },
    g580: { realm: g580.realm, mats: g580.mats, story: (g580.story || []).map(s2 => s2.id),
      text: (g580.lines || []).map(x => x[1]).join('') },
    g640: { realm: g640.realm, from: g640.from, mats: g640.mats, story: (g640.story || []).map(s2 => s2.id),
      text: (g640.lines || []).map(x => x[1]).join('') },
    layer640: (W.REALM_LAYERS.find(r => r.lv === 640) || {}).name,
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
ok(V3.dd.type === 'boss' && V3.dd.lv === 520 && V3.dd.unlock === 'xingqi' && V3.dd.next === 'xiedao',
  '大墟串在五城会武与积鳞空境之间（X3C917–C943）', V3.dd);
ok(/昏黄/.test(V3.dd.text) && /戈壁/.test(V3.dd.text) && /鳞犼/.test(V3.dd.text) && /埋骨/.test(V3.dd.text),
  '大墟对白用原著实词：昏黄戈壁/鳞犼/埋骨之地', V3.dd.text.slice(0, 24));
ok(!!V3.boss && V3.dd.cleared, '大墟首领能刷出来且能通关', { boss: V3.boss, cleared: V3.dd.cleared });
// X3C989《道天大劫》是蟹道人的劫，韩立只是站在边上——不能写成他自己的破境。
ok(V3.dt.type === 'story' && !V3.dt.endLevel && V3.dt.unlock === 'dadi' && V3.dt.next === 'jingong',
  '积鳞空境·天变了是剧情图，不是破境图（X3C989：劫是蟹道人的）', V3.dt);
ok(/高如皇天/.test(V3.dt.text) && /灰黑/.test(V3.dt.text) && /蟹道人/.test(V3.dt.text),
  '卷三收尾用原著实词：高如皇天/灰黑/蟹道人', V3.dt.text.slice(0, 24));
ok(V3.g580.realm === '大罗' && V3.g580.story[0] === 'suidian', '大罗破境关已立（lv580），前置岁月殿（X4C1194）', V3.g580);
ok(/云雾龙卷/.test(V3.g580.text) && /花枝空间/.test(V3.g580.text) && /大罗境界/.test(V3.g580.text),
  '大罗关演出用 X4C1194 口径（不再借用 X3C989）', V3.g580.text.slice(0, 20));
ok(V3.g640.realm === '道祖' && V3.g640.from === '大罗期' && V3.g640.story[0] === 'shifang',
  '道祖破境关已立（lv640），前置十方万仙之宴（X5C1382）', V3.g640);
ok(/归墟/.test(V3.g640.text) && /大五行幻世诀/.test(V3.g640.text) && /全新境界/.test(V3.g640.text),
  '道祖关演出用 X5C1382 原句口径', V3.g640.text.slice(0, 20));
ok(V3.layer640 === '道祖', '道祖档已进境界层（lv640）', V3.layer640);
ok(V3.dz.type === 'story' && V3.dz.endLevel === 640 && V3.dz.unlock === 'shifang' && V3.dz.next === 'daoyi',
  '道天大劫是道祖破境图（580→640，X5C1382）', V3.dz);
// 两场同名的《道天大劫》不许串台：卷五这张不能有卷三那场的词。
ok(/蟹道人/.test(V3.dz.text) === false && /大五行幻世诀/.test(V3.dz.text),
  '两场《道天大劫》不串台：卷五这张只属于韩立', V3.dz.text.slice(0, 24));
ok(V3.realm === '大罗' && V3.slots === 11 && V3.cap === 13, '大罗档已进境界层（功法位 11 / 上限 13）', V3);
ok(V3.skills.indexOf('dawuxing') >= 0 && V3.skills.indexOf('zhenyan') >= 0, '卷三两门功法已入库', V3.skills);
ok(V3.stock.length === 3, '帝江坊货架上架了时间法则之物与两门卷三功法', V3.stock);

// ---- 3·c) 卷四《大罗之争》/ 卷五《大道归一》 ----
console.log('\n== 3c. 卷四《大罗之争》与卷五《大道归一》 ==');
const V45 = await page.evaluate(() => {
  const W = window, F = W.__FR;
  const M = id => W.MAPS.find(m => m.id === id) || {};
  const get = id => (W.ALL_ITEMS || []).find(x => x.id === id) || null;
  F.clearProgress(); F.setLevel(579); F.god(true); F.unlockAll();

  // 鎏金城·万宝节（market）
  F.enterMap('wubao');
  for (let k = 0; k < 20; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
  const wbState = F.info().state;
  const sc = document.getElementById('shopClose');
  if (sc) sc.click();
  for (let k = 0; k < 10; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
  const wbBag = F.bag();
  const wbCleared = F.info().cleared.indexOf('wubao') >= 0;

  // 九元城·鬼阵（boss）：阎罗之鼎由此给出
  F.enterMap('jiuyuan', 'easy');
  for (let k = 0; k < 24; k++) { F.skipStory(); F.tickFrames(2); if (F.info().state === 'levelup') F.insightAuto(); }
  F.killBoss();
  for (let k = 0; k < 60; k++) { F.skipStory(); F.tickFrames(3); if (F.info().state === 'levelup') F.insightAuto(); }
  const jyBag = F.bag();

  // 说话人与旁白都要算进去（很多人名只落在说话人那一列上），outro 也算本文之内
  const T = id => [id, id + '_out'].map(k => (W.MAP_STORIES[k] || []).map(x => x[0] + '　' + x[1]).join('')).join('');
  const X4 = ['xiedao', 'jingong', 'taisui', 'chongchao', 'suidian', 'daluo', 'wubao', 'jiuyuan'];
  const X5 = ['zaimiao', 'zhanshi', 'youming', 'leihai', 'fuyao', 'shifang', 'daotian', 'daoyi', 'feiyu'];
  return {
    x4: X4.map(id => ({ id, type: M(id).type, lv: M(id).startLevel, unlock: M(id).unlock, next: M(id).next,
      lines: (W.MAP_STORIES[id] || []).length })),
    x5: X5.map(id => ({ id, type: M(id).type, lv: M(id).startLevel, unlock: M(id).unlock, next: M(id).next,
      lines: (W.MAP_STORIES[id] || []).length, boss: (M(id).boss || {}).name || null })),
    items: ['t_suiyueshendeng', 't_youmingguizhua', 't_yanluozhiding'].map(id => {
      const it = get(id); return it ? { id, name: it.name, req: it.req, noDrop: !!it.noDrop } : null; }),
    got: { deng: (wbBag.t_suiyueshendeng || 0), zhua: (wbBag.t_youmingguizhua || 0), ding: (jyBag.t_yanluozhiding || 0) },
    wbCleared, wbState,
    wbText: T('wubao'), jgText: T('jingong'), chText: T('chongchao'), sdText: T('suidian'),
    jyText: T('jiuyuan'), zmText: T('zaimiao'), zsText: T('zhanshi'), ymText: T('youming'),
    lhText: T('leihai'), fyText: T('fuyao'), sfText: T('shifang'), dyText: T('daoyi'), feText: T('feiyu'),
    // 掉落池：这三件标注 noDrop，绝不能出现在随机池里
    inPool: [0, 1, 2, 3, 4].flatMap(r => F.dropPool(r).map(i => i.id))
      .filter(id => ['t_suiyueshendeng', 't_youmingguizhua', 't_yanluozhiding'].indexOf(id) >= 0)
  };
});
ok(V45.x4.length === 8 && V45.x4.every(m => m.type), '卷四八图已落地', V45.x4.map(m => m.id));
ok(V45.x5.length === 9 && V45.x5.every(m => m.type), '卷五九图已落地', V45.x5.map(m => m.id));
ok(V45.x4.every(m => m.lv <= 580) && V45.x5.every(m => m.lv <= 640), '卷四卷五不越档', V45.x4.concat(V45.x5).map(m => m.lv));
ok(V45.items.every(Boolean) && V45.items.every(i => i.noDrop), '卷四三件仙器入库且都不进随机池', V45.items);
ok(V45.inPool.length === 0, '随机池里没有这三件专属仙器', V45.inPool);
ok(V45.wbState === 'shop' && V45.wbCleared && V45.got.zhua >= 1, '鎏金城能摆摊、能结算，幽冥鬼爪由此给出',
  { state: V45.wbState, cleared: V45.wbCleared, n: V45.got.zhua });
ok(V45.got.ding >= 1, '阎罗之鼎由九元城给出', { n: V45.got.ding });
ok(/五万七千三百/.test(V45.jgText) && /天阴五子/.test(V45.jgText) && /东方白/.test(V45.jgText),
  '独闯仙宫用原著实词：青狐族五万七千三百 / 天阴五子 / 东方白', V45.jgText.slice(0, 20));
ok(/火岁萤虫/.test(V45.chText) && /降魔杵/.test(V45.chText), '虫巢用原著实词：火岁萤虫 / 降魔杵', V45.chText.slice(0, 20));
ok(/岁月殿/.test(V45.sdText) && /五色融光/.test(V45.sdText) && /天煞镇狱功/.test(V45.sdText),
  '岁月殿用原著实词：岁月殿 / 五色融光 / 天煞镇狱功', V45.sdText.slice(0, 20));
ok(/日月盟/.test(V45.wbText) && /日月阁/.test(V45.wbText) && /鎏金城/.test(V45.wbText),
  '万宝节用原著实词：鎏金城 / 日月盟 / 日月阁', V45.wbText.slice(0, 20));
ok(/阎罗之府/.test(V45.jyText) && /青竹蜂云剑/.test(V45.jyText) && /鬼灵子/.test(V45.jyText),
  '九元城用原著实词：阎罗之府 / 青竹蜂云剑 / 鬼灵子', V45.jyText.slice(0, 20));
ok(/妙法仙尊/.test(V45.zmText) && /水晶王座/.test(V45.zmText), '再战妙法用原著实词：妙法仙尊 / 水晶王座', V45.zmText.slice(0, 20));
ok(/阴阳双鱼/.test(V45.zsText) && /膻中/.test(V45.zsText) && /恶尸/.test(V45.zsText),
  '斩尸用原著实词：阴阳双鱼 / 膻中 / 恶尸', V45.zsText.slice(0, 20));
ok(/牛首/.test(V45.ymText) && /六角轮盘/.test(V45.ymText) && /轮回大阵/.test(V45.ymText),
  '幽冥用原著实词：牛首 / 六角轮盘 / 轮回大阵', V45.ymText.slice(0, 20));
ok(/雷夔/.test(V45.lhText) && /道祖遗物/.test(V45.lhText) && /玄天剑灵/.test(V45.lhText),
  '雷海炼剑用原著实词：雷夔 / 道祖遗物 / 玄天剑灵', V45.lhText.slice(0, 20));
ok(/陈如烟/.test(V45.fyText) && /水之本源道祖/.test(V45.fyText) && /善尸/.test(V45.fyText),
  '赴约用原著实词：陈如烟 / 水之本源道祖 / 善尸', V45.fyText.slice(0, 20));
ok(/古或今/.test(V45.sfText) && /李元究/.test(V45.sfText) && /十方万仙/.test(V45.sfText),
  '十方万仙用原著实词：古或今 / 李元究 / 十方万仙', V45.sfText.slice(0, 20));
ok(/三千大道/.test(V45.dyText) && /混沌法则/.test(V45.dyText) && /轮回殿主/.test(V45.dyText),
  '大道归一用原著实词：三千大道 / 混沌法则 / 轮回殿主', V45.dyText.slice(0, 20));
ok(/无边海/.test(V45.feText) && /瓶灵/.test(V45.feText) && /大罗境巅峰/.test(V45.feText) && /厉飞雨/.test(V45.feText),
  '飞羽用原著实词：无边海 / 瓶灵 / 大罗境巅峰 / 厉飞雨', V45.feText.slice(0, 20));
ok(V45.x5.filter(m => m.boss).map(m => m.boss).join(',') === '妙法仙尊,骨皇,古或今,古或今·混沌之身',
  '卷五首领是原著人物', V45.x5.map(m => m.boss));

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
    lvs: ids.map(id => (W.MAPS.find(x => x.id === id) || {}).startLevel || 0),
    bag: { xianyuanshi: bag.m_xianyuanshi || 0, xuanhuang: bag.m_xuanhuang || 0, xuanhuangs: bag.t_xuanhuangs || 0, tianwaifeidou: bag.t_tianwaifeidou || 0 }
  };
}, IDS);
ok(R6.allCleared, '卷一六图可依次通关', R6.steps.filter(s => !s.cleared));
ok(R6.bag.xianyuanshi >= 1, '仙元石进背包（仙界关的消耗来源）', R6.bag);
ok(R6.bag.xuanhuangs >= 1 && R6.bag.tianwaifeidou >= 1, '玄黄之索 / 天外飞豆进背包', R6.bag);
ok(R6.lvs.slice(0, 7).every(v => v <= 420) && R6.lvs.slice(7, 10).every(v => v <= 520)
  && R6.lvs.slice(10, 27).every(v => v <= 580) && R6.lvs.slice(27).every(v => v <= 640),
  '全程不越档：卷一七图 ≤420，卷二三图 ≤520，卷三到卷五之宴 ≤580，道祖段 ≤640', R6.lvs);
ok(R6.lvs.indexOf(640) > R6.lvs.indexOf(580) && R6.lvs[29] === 640,
  '等级阶梯单调：大罗(580) 在前，道祖(640) 在后', R6.lvs);

console.log('\n--------------------------------');
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
if (errors.length) console.log('页面错误:', errors.join(' | '));
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
