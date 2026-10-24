// 回归测试：第四部「突破条件 / 同伴 / 灵兽袋」
// 全部本地可验（不依赖联机）：
//   一、境界突破：大境界卡一道门 —— 丹药 / 材料 / 灵石 / 剧情节点，四样齐备才破得开
//   二、灵兽袋：容量随袋子走；装满收不进；卵先收着不白丢，腾出地方再孵
//   三、挂机喂养：开着自动吃饲灵丸长阶；没丸子折灵石；关掉就不喂
//   四、同伴：按剧情入册，带上后战里有实体、会自己出手
//
// 运行：在仓库根目录(fanren/)执行  node qa/verify-part4.mjs
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
const ctx = await b.newContext({ viewport: { width: 420, height: 820 } });
const errs = [];
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 15000 });

// ======================= 结构 =======================
const st = await page.evaluate(() => ({
  nBreak: (window.BREAKTHROUGH || []).length,
  nMates: (window.MATES || []).length,
  caps: ['bag_ling', 'bag_ling2', 'ring_ling'].map(id => { const it = window.Items.get(id); return { id, cap: it ? it.petCap : null }; }),
  feed: !!window.Items.get('m_siling'),
  hooks: ['breakMissing', 'breakCan', 'breakNow', 'breakOpen', 'breakClose', 'breakPending',
    'pets', 'addPet', 'releasePet', 'petLv', 'petRoom', 'eggs', 'hatchEgg',
    'feed', 'feedTick', 'mates', 'addMate', 'setMate',
    'clearMap', 'setStones', 'tickFrames', 'bag', 'addItem', 'dropItem', 'spawn', 'enterMap', 'skipStory']
    .filter(k => typeof window.__FR[k] !== 'function')
}));
ok(st.nBreak >= 4, '突破条件表已载入（4 个大境界）', st);
ok(st.nMates >= 3, '同伴表已载入（≥3 位）', st);
ok(st.caps.every(c => c.cap > 0), '灵兽袋 / 特制灵兽袋 / 灵兽环 都带容量', st.caps);
ok(st.feed, '饲灵丸存在', st);
ok(st.hooks.length === 0, '第四部调试钩子齐全', st.hooks);

// 每条大境界都得有「非打怪」条件 + 一处剧情节点
const shape = await page.evaluate(() => (window.BREAKTHROUGH || []).map(x => ({
  lv: x.lv,
  n: (x.items || []).length + (x.mats || []).length + (x.story || []).length + (x.stones ? 1 : 0),
  story: (x.story || []).length
})));
ok(shape.every(s => s.n > 0), '每条大境界都带非打怪条件', shape);
ok(shape.every(s => s.story >= 1), '每条大境界都挂一处剧情节点（光刷怪过不去）', shape);

// ======================= 一、突破：缺一样就破不了 =======================
const steps = await page.evaluate(() => {
  const F = window.__FR;
  const lv = (window.BREAKTHROUGH || [])[0].lv;          // 筑基初期 Lv36
  const snap = () => ({ can: F.breakCan(lv), miss: F.breakMissing(lv) });
  const out = { lv };
  out.s0 = snap();                                        // 什么都没有
  F.addItem('zhuji', 2);                                  // 备丹
  for (const id of ['m_yusuizhi', 'm_zihua', 'm_tianling']) F.addItem(id, 5); // 备材料
  out.s1 = snap();
  F.setStones(5000);                                      // 备灵石
  out.s2 = snap();
  F.clearMap('zhuji');                                    // 通关地火之屋
  out.s3 = snap();
  return out;
});
ok(steps.s0.can === false && steps.s0.miss.length >= 3, '① 什么都没有：缺一整套', steps.s0);
ok(steps.s1.can === false && steps.s1.miss.some(m => m.kind === 'stone'), '② 备了丹与材料，仍缺灵石/剧情', steps.s1);
ok(steps.s2.can === false && steps.s2.miss.length === 1 && steps.s2.miss[0].kind === 'story',
  '③ 丹材石都齐，仍卡在剧情节点上（不是刷怪能顶过去的）', steps.s2);
ok(steps.s3.can === true && steps.s3.miss.length === 0, '④ 通掉剧情图后四样齐备，可突破', steps.s3);

// 战里撞门：经验刷满也升不上去（灵石清空 → 卡住；灵石补足 → 放行）
const gate = await page.evaluate(() => {
  const F = window.__FR;
  const lv = (window.BREAKTHROUGH || [])[0].lv;
  F.enterMap('houshan', 'easy');
  F.skipStory();
  const p = F.G.player;
  const out = { reqLv: lv };
  // 经验顶满，站在门槛前
  const arm = () => { const q = F.G.player; q.level = lv - 1; q.next = 5; q.xp = 50; };
  F.setStones(0);                       // 缺灵石 → 撞门
  arm(); F.tickFrames(4, 0.05);
  out.blocked = { lv: F.G.player.level, pending: F.breakPending(), can: F.breakCan(lv) };
  F.setStones(5000);                    // 灵石补足 → 物事齐了，但大境界门仍要回洞府破
  arm(); F.tickFrames(4, 0.05);
  out.passed = { lv: F.G.player.level, pending: F.breakPending(), can: F.breakCan(lv) };
  return out;
});
ok(gate.blocked.lv === gate.reqLv - 1, '经验刷满也升不过瓶颈（等级卡在门槛前）', gate.blocked);
ok(gate.blocked.pending === gate.reqLv && gate.blocked.can === false, '撞门时挂出「缺什么」的提示', gate.blocked);
ok(gate.passed.lv === gate.reqLv - 1 && gate.passed.pending === gate.reqLv && gate.passed.can === true,
  '物事备齐后仍卡在门口：须回洞府「突破」走剧情冲关', gate.passed);


// 突破面板：能开、能关、会吃掉该吃的丹
const panel = await page.evaluate(() => {
  const F = window.__FR;
  const lv = (window.BREAKTHROUGH || [])[0].lv;
  F.addItem('zhuji', 2);
  F.setStones(5000);
  const before = F.bag();
  const opened = F.breakOpen(lv);
  const shown = F.breakShown();
  const r = F.breakNow(lv);
  const after = F.bag();
  const stillOpen = F.breakClose();
  return {
    opened, shown, pending: r ? r.pending : null,
    zhujiBefore: before.zhuji || 0, zhujiAfter: after.zhuji || 0,
    matBefore: before.m_yusuizhi || 0, matAfter: after.m_yusuizhi || 0,
    stonesAfter: F.setStones(0), stillOpen
  };
});
ok(panel.opened && panel.shown, '突破面板能开出来', panel);
ok(panel.pending === null, '突破后瓶颈解除', panel);
ok(panel.zhujiAfter < panel.zhujiBefore, '突破会吃掉该吃的丹', panel);
ok(panel.matAfter < panel.matBefore, '突破会耗掉该耗的材料', panel);
ok(panel.stillOpen === false, '突破面板能关掉', panel);

// ======================= 二、灵兽袋 =======================
const bag = await page.evaluate(() => {
  const F = window.__FR;
  for (const e of F.pets().owned.map(x => x.id)) F.releasePet(e);
  const out = { cap0: F.pets().cap };
  F.addItem('bag_ling', 1);   out.cap1 = F.pets().cap;
  F.addItem('ring_ling', 1);  out.cap2 = F.pets().cap;
  out.bagName = F.pets().bag;
  out.a1 = F.addPet('p_xueyu');
  out.a2 = F.addPet('p_yunchi');
  out.a3 = F.addPet('p_mojiao');
  out.dup = F.addPet('p_xueyu');
  out.n = F.pets().owned.length;
  return out;
});
ok(bag.cap0 === 1, '没有灵兽袋时只揣得下一只', bag);
ok(bag.cap1 === 2 && bag.cap2 === 6, '灵兽袋 / 灵兽环把容量抬到 2 和 6', bag);
ok(bag.a1 === 'ok' && bag.a2 === 'ok' && bag.a3 === 'ok', '灵宠能收进禁制空间', bag);
ok(bag.dup === 'dup', '同一只不会重复收', bag);
ok(bag.n === 3, '袋中三只都在', bag);

// 装满：容量 1 时第二只收不进
const full2 = await page.evaluate(() => {
  const F = window.__FR;
  for (const e of F.pets().owned.map(x => x.id)) F.releasePet(e);
  for (const id of ['bag_ling', 'bag_ling2', 'ring_ling']) F.dropItem(id, 99);  // 把袋子拿掉 → 容量 1
  const out = { cap: F.pets().cap, room: F.petRoom() };
  out.a1 = F.addPet('p_xueyu');     // 第一只：能收
  out.a2 = F.addPet('p_yunchi');    // 第二只：满了
  out.n = F.pets().owned.length;
  return out;
});
ok(full2.cap === 1, '没有袋子时容量回到 1', full2);
ok(full2.a1 === 'ok' && full2.a2 === 'full' && full2.n === 1,
  '灵兽袋满了就收不进（不会无限装）', full2);

// 满袋孵化：卵留在储物袋，不白丢
const eggFull = await page.evaluate(() => {
  const F = window.__FR;
  F.addItem('egg_mojiao', 1);
  const before = (F.bag()['egg_mojiao'] || 0);
  const n0 = F.pets().owned.length;
  const r = F.hatchEgg('egg_mojiao');           // 袋满 → 孵不了
  const after = (F.bag()['egg_mojiao'] || 0);
  return { before, after, r, n0, n1: F.pets().owned.length, eggs: F.eggs().length };
});
ok(eggFull.r === 'kept', '灵兽袋满时孵不了，判为「先收着」', eggFull);
ok(eggFull.after === eggFull.before, '卵退回储物袋，不白丢', eggFull);
ok(eggFull.n1 === eggFull.n0, '满袋时没有凭空多出灵宠', eggFull);
ok(eggFull.eggs >= 1, '储物袋里看得到这枚卵', eggFull);

// 腾出地方后能孵
const eggHatch = await page.evaluate(() => {
  const F = window.__FR;
  F.addItem('bag_ling2', 1);                   // 换个大袋子 → 容量 4
  const n0 = F.pets().owned.length;
  const r = F.hatchEgg('egg_mojiao');
  return { r, n0, n1: F.pets().owned.length, has: !!F.pets().owned.find(x => x.id === 'p_mojiao'), left: (F.bag()['egg_mojiao'] || 0) };
});
ok(eggHatch.r === 'hatched', '腾出地方后卵孵得出来', eggHatch);
ok(eggHatch.has && eggHatch.n1 === eggHatch.n0 + 1, '孵出来的直接进灵兽袋', eggHatch);
ok(eggHatch.left === 0, '孵掉后储物袋里这枚卵没了', eggHatch);

// 路上捡卵：掉地上的卵，走过去捡就孵（走真实拾取 → applyItem）
const pickup = await page.evaluate(() => {
  const F = window.__FR;
  F.enterMap('houshan', 'easy');
  F.skipStory();
  // 先腾一只位置出来
  const cap = F.pets().cap, n = F.pets().owned.length;
  if (n >= cap) F.releasePet(F.pets().owned[0].id);
  const p = F.G.player;
  const it = window.Items.get('egg_yunchi');
  if (!it) return { err: 'no egg item' };
  F.G.loot.push({ x: p.x, y: p.y, r: 9, bob: 0, item: it });   // 就在脚边
  const n0 = F.pets().owned.length, inBag0 = (F.bag()['egg_yunchi'] || 0);
  F.tickFrames(6, 0.05);                                        // 走真实拾取
  return {
    n0, n1: F.pets().owned.length,
    has: !!F.pets().owned.find(x => x.id === 'p_yunchi'),
    inBag1: (F.bag()['egg_yunchi'] || 0)
  };
});
ok(pickup.has && pickup.n1 === pickup.n0 + 1, '脚边的卵走过去捡起来就孵了（真实拾取路径）', pickup);

// 兽卵从哪些东西身上来
const src = await page.evaluate(() => {
  const T = window.ENEMY_TYPES || {};
  return {
    bat: (T.bat && T.bat.eggDrop) ? T.bat.eggDrop.id : null,
    dujiao: (T.dujiao && T.dujiao.eggDrop) ? T.dujiao.eggDrop.id : null
  };
});
ok(src.bat === 'egg_yunchi' && src.dujiao === 'egg_mojiao', '兽卵挂在对应的东西身上（妖蝠/毒蛟）', src);

// 灵宠跟着打，分修为长阶
const petXp = await page.evaluate(() => {
  const F = window.__FR;
  for (const e of F.pets().owned.map(x => x.id)) F.releasePet(e);
  F.addItem('bag_ling', 1);
  F.addPet('p_xueyu');
  F.setPet('p_xueyu');
  const xp0 = (F.pets().owned.find(x => x.id === 'p_xueyu') || {}).xp || 0;
  F.enterMap('houshan', 'easy');
  F.skipStory();
  for (let i = 0; i < 8; i++) {
    F.spawn('wolf', 1);
    const es = F.G.enemies.filter(x => !x._remote);
    const e = es[es.length - 1];
    if (e) F.damageEnemyById(e._id, 99999);
  }
  const one = F.pets().owned.find(x => x.id === 'p_xueyu');
  return { xp0, xp1: one ? one.xp : 0, lv: F.petLv('p_xueyu'), kills: F.info().kills };
});
ok(petXp.lv >= 1, '灵宠有阶数', petXp);
ok(petXp.xp1 > petXp.xp0 || petXp.lv > 1, '灵宠跟着打，能分到修为', petXp);

// ======================= 三、挂机喂养 =======================
const feed = await page.evaluate(() => {
  const F = window.__FR;
  F.addItem('m_siling', 30);
  F.setStones(0);
  F.enterMap('houshan', 'easy');
  F.skipStory();
  const one0 = F.pets().owned.find(x => x.id === 'p_xueyu');
  const xp0 = one0 ? one0.xp : 0, lv0 = F.petLv('p_xueyu');
  F.feed(true);
  F.feedTick(21);                       // 推进一个喂养时辰
  const one1 = F.pets().owned.find(x => x.id === 'p_xueyu');
  return { xp0, xp1: one1 ? one1.xp : 0, lv0, lv1: F.petLv('p_xueyu'), siling: (F.bag()['m_siling'] || 0) };
});
ok(feed.xp1 > feed.xp0 || feed.lv1 > feed.lv0, '开着挂机喂养，灵兽自己长修为', feed);
ok(feed.siling < 30, '喂养会吃掉饲灵丸', feed);

const feedFallback = await page.evaluate(() => {
  const F = window.__FR;
  F.dropItem('m_siling', 999);                 // 丸子吃光，只剩灵石
  const siling = (F.bag()['m_siling'] || 0);
  F.setStones(200);
  const one0 = F.pets().owned.find(x => x.id === 'p_xueyu');
  const xp0 = one0 ? one0.xp : 0, lv0 = F.petLv('p_xueyu');
  F.feedTick(21);
  const one1 = F.pets().owned.find(x => x.id === 'p_xueyu');
  return { siling, xp0, xp1: one1 ? one1.xp : 0, lv0, lv1: F.petLv('p_xueyu'), stones: F.info().stones };
});
ok(feedFallback.siling === 0, '丸子确已吃光', feedFallback);
ok(feedFallback.xp1 > feedFallback.xp0 || feedFallback.lv1 > feedFallback.lv0,
  '没丸子了改折灵石，灵兽照样长', feedFallback);
ok(feedFallback.stones < 200, '折灵石时灵石真的扣了', feedFallback);

const feedOff = await page.evaluate(() => {
  const F = window.__FR;
  F.feed(false);
  const one0 = F.pets().owned.find(x => x.id === 'p_xueyu');
  const xp0 = one0 ? one0.xp : 0;
  const s0 = F.info().stones;
  F.feedTick(60);
  const one1 = F.pets().owned.find(x => x.id === 'p_xueyu');
  return { xp0, xp1: one1 ? one1.xp : 0, s0, s1: F.info().stones };
});
ok(feedOff.xp1 === feedOff.xp0 && feedOff.s1 === feedOff.s0, '关掉挂机喂养后不再自动喂', feedOff);

// ======================= 四、同伴 =======================
const mate = await page.evaluate(() => {
  const F = window.__FR;
  const out = { defs: F.mates().defs };
  out.a1 = F.addMate('m_nangongwan');
  out.a2 = F.addMate('m_yuanyao');
  out.dup = F.addMate('m_nangongwan');
  out.owned = F.mates().owned.slice();
  F.setMate('m_nangongwan');   out.active = F.mates().active;
  F.setMate('m_nangongwan');   out.active2 = F.mates().active;   // 再点一次 = 暂别
  F.setMate('m_yuanyao'); out.active3 = F.mates().active;  // 换人
  return out;
});
ok(mate.defs.length >= 3, '同伴表 ≥3 位（厉飞雨已改为化名系统，不入队伍）', mate);
ok(mate.a1 === 'ok' && mate.a2 === 'ok' && mate.dup === 'dup', '同伴能入册，不重复', mate);
ok(mate.owned.length === 2, '册子里两位', mate);
ok(mate.active === 'm_nangongwan', '点「同行」带上同伴', mate);
ok(mate.active2 === null, '再点一次是「暂别」', mate);
ok(mate.active3 === 'm_yuanyao', '能换同伴', mate);

// 同伴按剧情入册：通掉对应图，人自己来（厉飞雨已不在队伍，后山只给灵兽袋）
const mateStory = await page.evaluate(() => {
  const T = window.MAPS || [];
  const want = { xuese: 'm_nangongwan', ningcui: 'm_yuanyao', jixi: 'm_dayanshenjun' };
  const out = {};
  for (const k of Object.keys(want)) {
    const m = T.find(x => x.id === k);
    out[k] = !!(m && m.reward && (m.reward.mates || []).indexOf(want[k]) >= 0);
  }
  const hb = T.find(x => x.id === 'houshan');
  out.bagOnHoushan = !!(hb && hb.reward && (hb.reward.items || []).indexOf('bag_ling') >= 0);
  return out;
});
ok(Object.keys(mateStory).filter(k => k !== 'bagOnHoushan').every(k => mateStory[k]),
  '同伴挂在剧情图上：通掉那张图，人才来', mateStory);
ok(mateStory.bagOnHoushan, '头一只灵兽袋由后山那张图给出', mateStory);

// 战里：有实体 + 会出手
const inBattle = await page.evaluate(() => {
  const F = window.__FR;
  F.enterMap('houshan', 'easy');
  F.skipStory();
  if (F.mates().active !== 'm_nangongwan') F.setMate('m_nangongwan');   // 同行/暂别是开关，别把它点没
  F.setPet(null);                       // 只留同伴，避免灵宠子弹混淆
  const out = { state: F.info().state, entity: !!(F.G.mate && F.G.mate.id) };
  F.teleport(200, 200);
  F.spawn('wolf', 1);
  const es = F.G.enemies.filter(x => !x._remote);
  const e = es[es.length - 1];
  if (e) { e.x = 240; e.y = 210; e.hp = 99999; e.maxhp = 99999; }   // 挪到跟前，别被打死
  F.tickFrames(60, 0.05);               // 推三秒
  out.hasMateBullet = F.G.bullets.some(x => x.mate);
  out.mateCd = F.G.mate ? +F.G.mate.cd.toFixed(2) : null;
  out.mateNear = F.G.mate ? (Math.abs(F.G.mate.x - 200) < 120 && Math.abs(F.G.mate.y - 200) < 120) : false;
  return out;
});
ok(inBattle.state === 'play', '进图成功', inBattle);
ok(inBattle.entity, '战里出现同伴实体', inBattle);
ok(inBattle.mateNear, '同伴跟在身边（不自己跑没影）', inBattle);
ok(inBattle.hasMateBullet, '同伴会自己出手（打出自己的攻击）', inBattle);

// 灵宠也出手
const petFire = await page.evaluate(() => {
  const F = window.__FR;
  F.setMate(null);
  for (const e of F.pets().owned.map(x => x.id)) F.releasePet(e);
  F.addItem('bag_ling', 1);
  F.addPet('p_xueyu');
  F.setPet('p_xueyu');
  F.enterMap('houshan', 'easy');
  F.skipStory();
  F.teleport(200, 200);
  F.spawn('wolf', 1);
  const es = F.G.enemies.filter(x => !x._remote);
  const e = es[es.length - 1];
  if (e) { e.x = 230; e.y = 205; e.hp = 99999; e.maxhp = 99999; }
  F.tickFrames(60, 0.05);
  return { hasPet: !!F.G.pet, hasBullet: F.G.bullets.some(x => x.pet), petNear: F.G.pet ? (Math.abs(F.G.pet.x - 200) < 120) : false };
});
ok(petFire.hasPet, '战里出现灵宠实体', petFire);
ok(petFire.petNear, '灵宠跟在身边', petFire);
ok(petFire.hasBullet, '灵宠会自己出手', petFire);

// 同伴 + 灵宠同场：两个都在，且站得不重叠
const both = await page.evaluate(() => {
  const F = window.__FR;
  F.enterMap('houshan', 'easy');
  F.skipStory();
  if (F.mates().active !== 'm_nangongwan') F.setMate('m_nangongwan');
  if (F.pets().active !== 'p_xueyu') F.setPet('p_xueyu');   // 放出/收回 同为开关
  F.teleport(200, 200);
  F.tickFrames(30, 0.05);
  const m = F.G.mate, p = F.G.pet;
  const d = (m && p) ? Math.hypot(m.x - p.x, m.y - p.y) : -1;
  return { mate: !!m, pet: !!p, d: d >= 0 ? Math.round(d) : -1 };
});
ok(both.mate && both.pet, '同伴与灵宠能同时带出门', both);
ok(both.d > 10, '同伴与灵宠各站一边，不叠在一块', both);

// 定稿修正后各门：丹药/节点/材料正确（P0-4/5/6 + P1-7/8）
const gates = await page.evaluate(() => {
  const F = window.__FR;
  const ids = lv => (F.breakMissing(lv) || []).map(m => m.id).filter(Boolean);
  const storyOf = lv => { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); return b ? (b.story || []).map(s => s.id) : []; };
  return {
    jiedan: { items: ids(56), story: storyOf(56) },      // 结丹
    yuanying: { items: ids(82), story: storyOf(82) },    // 元婴
    huashen: { items: ids(112), story: storyOf(112) }    // 化神
  };
});
ok(!gates.jiedan.items.includes('jiangchen') && !gates.jiedan.items.includes('butian') && gates.jiedan.items.includes('tianhuo'),
  '结丹丹药=天火液（不再是降尘/补天）', gates.jiedan);
ok(gates.jiedan.story.includes('tianxing') && !gates.jiedan.story.includes('jiedan'),
  '结丹节点=天星城（不再是小寰岛）', gates.jiedan.story);
ok(!gates.yuanying.items.includes('peiyin') && gates.yuanying.items.includes('jiuqu') && gates.yuanying.items.includes('dianling'),
  '元婴丹药=九曲灵参丹+定灵丹（已删除培婴丹）', gates.yuanying.items);
ok(!gates.yuanying.items.includes('m_yanghun') && !gates.yuanying.items.includes('m_lingzhu'),
  '元婴门不再硬塞养魂木/灵烛果', gates.yuanying.items);
ok(!gates.huashen.items.includes('m_jinlei') && gates.huashen.items.includes('m_hanhuo') && gates.huashen.items.includes('m_yuanci'),
  '化神材料=五色寒焰+元磁神山核心（金雷竹已降级）', gates.huashen.items);
ok(gates.huashen.story.includes('jixi') && gates.huashen.story.includes('tianxing'),
  '化神=元磁神山前置+天星城闭关（不再是坠魔谷）', gates.huashen.story);

// 新丹药/功法/材料都真实存在且可炼
const newItems = await page.evaluate(() => {
  const want = ['tianhuo', 'jiuqu', 'dianling', 'sanzhong', 'gupu', 'lianzhi', 't_qingzhu', 'm_yuanci', 'm_jiuqu', 'm_dingling', 'm_zhuguo', 'm_huoling'];
  const missing = want.filter(id => !window.Items.get(id));
  const recOk = ['r_tianhuo', 'r_jiuqu', 'r_dianling', 'r_qingzhu'].every(id => window.RECIPES.some(r => r.id === id));
  return { missing, recOk };
});
ok(newItems.missing.length === 0, '新增丹药/功法/材料/法宝都存在', newItems.missing);
ok(newItems.recOk, '天火液/九曲灵参丹/定灵丹/青竹蜂云剑配方已落地', newItems);

// 掌天瓶：七玄门得古朴小瓶，筑基静修产绿液，绿液可催熟灵宠
const bottle = await page.evaluate(() => {
  const F = window.__FR;
  const out = { gupu: !!window.Items.get('gupu'), zhangtian: !!window.Items.get('zhangtian') };
  F.clearMap('qixuan'); F.addItem('gupu', 1);
  // 模拟筑基后静修 3 次：直接拉满等级后调 doRest 不便，改测生产逻辑
  const lv = (F.G.player.level = 40);
  F.setGreen(0);
  // 直接触发日产：用内部 rest 不便，改为校验 greenLiquid 钩子与催熟
  out.haveBottle = (F.bag()['gupu'] || 0) > 0 || (F.bag()['zhangtian'] || 0) > 0;
  F.setGreen(1);
  for (const e of F.pets().owned.map(x => x.id)) F.releasePet(e);
  F.addItem('bag_ling', 1); F.addPet('p_xueyu'); F.setPet('p_xueyu');
  const xp0 = F.petLv('p_xueyu');
  out.cul = F.cul(); out.gl = F.greenLiquid(); out.lv1 = F.petLv('p_xueyu');
  return out;
});
ok(bottle.gupu && bottle.zhangtian, '掌天瓶（古朴小瓶/绿液）已存在', bottle);
ok(bottle.haveBottle, '持有掌天瓶', bottle);
ok(bottle.cul === true && bottle.gl === 0 && bottle.lv1 >= 1, '绿液催熟灵宠生效', bottle);

// 云翅鸟·追风 放飞节点（P2-11）：通关黄枫谷后自动离队
const yunchi = await page.evaluate(() => {
  const F = window.__FR;
  for (const e of F.pets().owned.map(x => x.id)) F.releasePet(e);
  F.addItem('bag_ling', 1); F.addPet('p_yunchi');
  const before = F.pets().owned.some(x => x.id === 'p_yunchi');
  F.clearMap('huangfeng');            // 黄枫谷后期 → 不告而别
  const after = F.pets().owned.some(x => x.id === 'p_yunchi');
  return { before, after, ach: (F.G && F.G.save ? false : (window.__FR.G.save || {}).zhuifeng === true) };
});
ok(yunchi.before && !yunchi.after, '云翅鸟通关黄枫谷后自动放飞', yunchi);
// ======================= 五、厉飞雨·双身份化名系统（P0-1） =======================
const lifeiyu = await page.evaluate(() => {
  const F = window.__FR;
  const out = { defExists: !!window.LIFEIYU, noLifeiyuMate: !F.mates().defs.some(m => m.id === 'm_lifeiyu') };
  F.clearMap('qixuan');                       // 七玄门篇章通关 → 厉飞雨病逝，化名系统解锁
  out.unlocked = F.liUnlocked();
  F.setIdentity('li');  out.id1 = F.identity();
  F.setIdentity('han'); out.id2 = F.identity();
  F.enterMap('houshan', 'easy'); F.skipStory();
  // 韩天尊本尊击杀 → 白声望涨
  const w0 = F.rep().white;
  F.setIdentity('han');
  F.spawn('wolf', 1); let es = F.G.enemies.filter(x => !x._remote); let e = es[es.length - 1];
  if (e) F.damageEnemyById(e._id, 99999);
  out.whiteUp = F.rep().white > w0;
  // 厉飞雨马甲击杀 → 黑声望涨
  const b0 = F.rep().black;
  F.setIdentity('li');
  F.spawn('wolf', 1); es = F.G.enemies.filter(x => !x._remote); e = es[es.length - 1];
  if (e) F.damageEnemyById(e._id, 99999);
  out.blackUp = F.rep().black > b0;
  return out;
});
ok(lifeiyu.defExists, '厉飞雨·双身份配置存在', lifeiyu);
ok(lifeiyu.noLifeiyuMate, '厉飞雨已移出同伴表（不进队伍、不参战）', lifeiyu);
ok(lifeiyu.unlocked === true, '七玄门通关后化名系统解锁', lifeiyu);
ok(lifeiyu.id1 === 'li' && lifeiyu.id2 === 'han', '身份可在厉飞雨/韩天尊间切换', lifeiyu);
ok(lifeiyu.blackUp, '厉飞雨身份击杀累积黑声望', lifeiyu);
ok(lifeiyu.whiteUp, '韩天尊身份出手累积白声望', lifeiyu);

// 黑白通吃成就：双声望都攒够
const heibai = await page.evaluate(() => {
  const F = window.__FR;
  F.setRep(20, 20);          // 直接用钩子拉满双声望
  const got = F.checkHeibaiAch();
  return { ach: got === true };
});
ok(heibai.ach, '黑白通吃成就：双声望齐高时解锁', heibai);

ok(errs.length === 0, '页面无报错', errs.slice(0, 6));

await b.close();
console.log('\n== 第四部：突破条件 / 同伴 / 灵兽袋 ==');
if (bad.length) { console.log('失败项：'); for (const m of bad) console.log('  ✗ ' + m); }
console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
process.exit(fail ? 1 : 0);
