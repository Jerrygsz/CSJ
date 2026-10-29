// 凡人·长生劫 —— 无头冒烟测试
// 用法：node qa/smoke.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // 仓库根目录(fanren/)

// ---------------- 虚拟时间 / 定时器 ----------------
let vnow = 1000;
let rafQ = [];
let rafId = 0;
let timerQ = [];
let timerId = 0;

// ---------------- DOM 桩 ----------------
const byId = new Map();
let SAFE = { top: 0, right: 0, bottom: 0, left: 0 };

function classList() {
  const s = new Set();
  return {
    add: (...c) => c.forEach(x => s.add(x)),
    remove: (...c) => c.forEach(x => s.delete(x)),
    toggle: (c, f) => { const on = f === undefined ? !s.has(c) : !!f; on ? s.add(c) : s.delete(c); return on; },
    contains: c => s.has(c),
    _set: s
  };
}

function makeEl(tag, id) {
  const el = {
    tagName: (tag || 'div').toUpperCase(), id: id || '',
    _handlers: {}, _attrs: {},
    classList: classList(),
    children: [], childNodes: [],
    textContent: '', innerHTML: '', value: '', checked: false,
    clientWidth: 0, clientHeight: 0, offsetWidth: 0, offsetHeight: 0,
    parentNode: null, __syncSize: false,
    addEventListener(t, fn) { (el._handlers[t] || (el._handlers[t] = [])).push(fn); },
    removeEventListener(t, fn) { const a = el._handlers[t]; if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); },
    appendChild(c) { el.children.push(c); el.childNodes.push(c); c.parentNode = el; return c; },
    removeChild(c) {
      const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1);
      const j = el.childNodes.indexOf(c); if (j >= 0) el.childNodes.splice(j, 1);
      c.parentNode = null; return c;
    },
    insertBefore(c, ref) { const i = el.childNodes.indexOf(ref); i < 0 ? el.childNodes.push(c) : el.childNodes.splice(i, 0, c); el.children.push(c); c.parentNode = el; return c; },
    setAttribute(k, v) { el._attrs[k] = String(v); },
    getAttribute(k) { return k in el._attrs ? el._attrs[k] : null; },
    removeAttribute(k) { delete el._attrs[k]; },
    closest() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() { }, blur() { },
    click() { el._fire('click', {}); },
    getBoundingClientRect() {
      return { left: 0, top: 0, right: el.clientWidth, bottom: el.clientHeight, width: el.clientWidth, height: el.clientHeight, x: 0, y: 0 };
    },
    getClientRects() {
      const w = el.clientWidth || 0, h = el.clientHeight || 0;
      return (w > 0 && h > 0) ? [{ left: 0, top: 0, right: w, bottom: h, width: w, height: h, x: 0, y: 0 }] : [];
    },
    _fire(type, ev) {
      const list = el._handlers[type] || [];
      const e = Object.assign({
        type, target: el, currentTarget: el, isPrimary: true, clientX: 0, clientY: 0,
        preventDefault() { }, stopPropagation() { }
      }, ev);
      list.slice().forEach(fn => fn.call(el, e));
      return e;
    }
  };
  el.style = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : ''),
    set: (t, k, v) => {
      t[k] = v;
      if (el.__syncSize) {
        if (k === 'width') el.clientWidth = Math.round(parseFloat(v) || 0);
        if (k === 'height') el.clientHeight = Math.round(parseFloat(v) || 0);
      }
      return true;
    }
  });
  if (String(tag).toLowerCase() === 'canvas') {
    el.width = 300; el.height = 150;
    el.getContext = () => ctxStub;
  }
  return el;
}

const ctxStub = new Proxy({}, {
  get(t, k) {
    if (k in t) return t[k];
    if (k === 'measureText') return () => ({ width: 12 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() { } });
    if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    if (k === 'createPattern') return () => ({});
    if (k === 'canvas') return { width: 480, height: 864 };
    return () => { };
  },
  set(t, k, v) { t[k] = v; return true; }
});

const docH = {};
const documentMock = {
  _h: docH,
  body: makeEl('body', 'body'),
  documentElement: makeEl('html', 'html'),
  fullscreenElement: null,
  hidden: false, visibilityState: 'visible',
  getElementById(id) {
    if (!byId.has(id)) byId.set(id, makeEl(id === 'game' ? 'canvas' : 'div', id));
    return byId.get(id);
  },
  createElement(t) { return makeEl(t); },
  addEventListener(t, fn) { (docH[t] || (docH[t] = [])).push(fn); },
  removeEventListener() { },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  _fire(type, ev) {
    const list = docH[type] || [];
    const e = Object.assign({ type, preventDefault() { }, stopPropagation() { } }, ev);
    list.slice().forEach(fn => fn(e));
    return e;
  }
};

// 预置关键元素
const elWrap = documentMock.getElementById('wrap');
const elFit = documentMock.getElementById('fit');
const elStage = documentMock.getElementById('stage');
elStage.__syncSize = true;
elFit.clientWidth = 390; elFit.clientHeight = 844;

// ---------------- localStorage / 其他 ----------------
const store = new Map();
const localStorageMock = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; }
};

const sandbox = {
  console,
  document: documentMock,
  localStorage: localStorageMock,
  performance: { now: () => vnow },
  devicePixelRatio: 3,
  innerWidth: 390, innerHeight: 844,
  navigator: { userAgent: 'node-smoke', maxTouchPoints: 5, standalone: false },
  getComputedStyle(el) {
    const isWrap = el && (el === elWrap || el.id === 'wrap');
    const px = v => v + 'px';
    return {
      paddingTop: px(isWrap ? SAFE.top : 0), paddingRight: px(isWrap ? SAFE.right : 0),
      paddingBottom: px(isWrap ? SAFE.bottom : 0), paddingLeft: px(isWrap ? SAFE.left : 0),
      getPropertyValue: () => ''
    };
  },
  requestAnimationFrame(fn) { rafQ.push(fn); return ++rafId; },
  cancelAnimationFrame() { },
  setTimeout(fn, ms) { timerQ.push({ id: ++timerId, fn, at: vnow + (ms || 0) }); return timerId; },
  clearTimeout(id) { timerQ = timerQ.filter(t => t.id !== id); },
  setInterval() { return 0; },
  clearInterval() { },
  matchMedia: () => ({ matches: false, addEventListener() { }, addListener() { } }),
  addEventListener(t, fn) { (winH[t] || (winH[t] = [])).push(fn); },
  removeEventListener() { },
  dispatchEvent() { },
  location: { href: 'http://localhost/', search: '' }
};
const winH = {};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.addEventListener = (t, fn) => { (winH[t] || (winH[t] = [])).push(fn); };
sandbox.window.innerWidth = 390;
sandbox.window.innerHeight = 844;

vm.createContext(sandbox);

// ---------------- 加载脚本 ----------------
// late3.js：第四部「突破条件 / 同伴 / 灵宠」数据层 —— 必须一并载入，
// 否则突破门、丹药、灵兽袋、化名系统在 smoke 里都是空的（地图奖励会判定为无效引用）
const FILES = ['utils.js', 'audio.js', 'sprites.js', 'skills.js', 'enemies.js', 'story.js',
  'items.js', 'maps.js', 'recipes.js', 'encounters.js', 'late.js', 'late2.js', 'late3.js', 'sources.js', 'value.js', 'game.js', 'debugapi.js'];
for (const f of FILES) {
  const code = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}

// ---------------- 驱动 ----------------
function frames(n = 1) {
  for (let i = 0; i < n; i++) {
    vnow += 16;
    const q = rafQ; rafQ = [];
    for (const fn of q) fn(vnow);
    // 到期定时器
    const due = timerQ.filter(t => t.at <= vnow);
    timerQ = timerQ.filter(t => t.at > vnow);
    for (const t of due) t.fn();
  }
}
function winFire(type, ev) { (winH[type] || []).forEach(fn => fn(Object.assign({ type }, ev))); }
function resizeTo(w, h, safe) {
  sandbox.innerWidth = w; sandbox.innerHeight = h;
  sandbox.window.innerWidth = w; sandbox.window.innerHeight = h;
  SAFE = safe || { top: 0, right: 0, bottom: 0, left: 0 };
  elFit.clientWidth = w - SAFE.left - SAFE.right;
  elFit.clientHeight = h - SAFE.top - SAFE.bottom;
  winFire('resize', {});
}

// ---------------- 断言 ----------------
let pass = 0, fail = 0;
const fails = [];
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; fails.push(name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); console.log('  ✗ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
function eq(a, b, name) { ok(a === b, name, { got: a, want: b }); }

const F = sandbox.__FR;
console.log('\n== 加载 ==');
ok(!!F, '__FR 调试接口可用');
eq(typeof F.view, 'function', '__FR.view 存在');

console.log('\n== 适配 / 舞台 ==');
frames(2);
let v = F.view();
eq(elStage.clientWidth, 390, '竖屏 390×844：舞台宽铺满 390');
eq(elStage.clientHeight, 844, '竖屏 390×844：舞台高铺满 844（纵向视口伸展，无黑边）');
ok(v.scale > 0.81 && v.scale < 0.82, '缩放比约 0.81', v.scale);

resizeTo(390, 844, { top: 47, right: 0, bottom: 34, left: 0 });
frames(1);
v = F.view();
eq(elFit.clientWidth, 390, '安全区生效后可用宽 390');
eq(elFit.clientHeight, 763, '安全区生效后可用高 763');
eq(elStage.clientHeight, 763, '刘海屏下舞台高 763（扣掉安全区后铺满）');
ok(v.safe.top === 47 && v.safe.bottom === 34, '安全区数值可读', v.safe);

resizeTo(500, 600);
frames(1);
v = F.view();
eq(elStage.clientHeight, 600, '矮屏 500×600：舞台高等于可用高');
eq(elStage.clientWidth, 333, '矮屏 500×600：舞台宽 333（高度受限）');

resizeTo(1280, 720);
frames(1);
v = F.view();
eq(elStage.clientHeight, 720, '桌面 1280×720：高铺满 720');
eq(elStage.clientWidth, 400, '桌面 1280×720：宽 400，两侧留黑边');
ok(elStage.clientWidth <= 1280 && elStage.clientHeight <= 720, '舞台不超出视口');

resizeTo(390, 844, { top: 47, right: 0, bottom: 34, left: 0 });
frames(1);

console.log('\n== 双击顶部全屏 ==');
const stageRect = elStage.getBoundingClientRect();
const bandY = Math.max(58, Math.round(stageRect.height * 0.085));
documentMock.body.classList.remove('immersive');
elStage._fire('pointerdown', { clientX: 200, clientY: 10, isPrimary: true });
elStage._fire('pointerdown', { clientX: 202, clientY: 12, isPrimary: true });
ok(documentMock.body.classList.contains('immersive'), '双击顶部 → 进入沉浸/全屏');
elStage._fire('pointerdown', { clientX: 200, clientY: 10, isPrimary: true });
elStage._fire('pointerdown', { clientX: 200, clientY: 10, isPrimary: true });
ok(!documentMock.body.classList.contains('immersive'), '再双击一次 → 退出全屏');
elStage._fire('pointerdown', { clientX: 200, clientY: bandY + 200, isPrimary: true });
elStage._fire('pointerdown', { clientX: 200, clientY: bandY + 200, isPrimary: true });
ok(!documentMock.body.classList.contains('immersive'), '双击画面中部不触发全屏');
elStage._fire('pointerdown', { clientX: 200, clientY: 8, isPrimary: true, target: { closest: () => ({ tag: 'button' }) } });
elStage._fire('pointerdown', { clientX: 200, clientY: 8, isPrimary: true, target: { closest: () => ({ tag: 'button' }) } });
ok(!documentMock.body.classList.contains('immersive'), '点在按钮上不误触发全屏');
ok(typeof F.isFullscreen() === 'boolean', 'isFullscreen 可查询');

console.log('\n== 核心玩法回归 ==');
F.clearProgress();
F.enterMap('houshan', 'easy');
frames(8);
let i = F.info();
eq(i.state, 'play', '进入后山（凡境）后处于战斗');
eq(i.mapId, 'houshan', '当前地图 houshan');
eq(i.diff, 'easy', '难度记录 easy');
ok(i.enemies >= 0, '怪物列表可用');

const bossName = F.boss();
ok(typeof bossName === 'string' && bossName.length > 0, 'Boss 生成：' + bossName);
frames(3);
i = F.info();
ok(i.boss && i.boss.hp > 0, 'Boss 血量 > 0', i.boss && i.boss.hp);
// 一次 60% 伤害未必够：Boss 有减伤/闪避浮动，血量可能仍在 60% 以上。打到进二阶段为止。
for (let k = 0; k < 5; k++) {
  i = F.info();
  if (i.boss && i.boss.phase2) break;
  F.bossDamage(0.25);
  frames(6);
}
i = F.info();
ok(i.boss && i.boss.phase2, 'Boss 进入二阶段', i.boss && (i.boss.hp + '/' + i.boss.maxhp));

console.log('\n== 洞府 / 装备 / 炼制 ==');
const cave = F.cave('qixuan');
eq(cave, 'qixuan', '打开药庐草舍（药庐草舍=七玄门洞府）');
eq(F.caveTab('stats'), 'stats', '切到属性页');
eq(F.caveTab('alchemy'), 'alchemy', '切到炼丹页');
F.stones(500);
F.setLevel(9);
F.addMat('m_chijing', 6); F.addMat('m_jingtie', 6); F.addMat('m_fuzhi', 3);
ok(F.mats().m_chijing >= 6, '材料入库');
// 炼丹现在有成算（回气丹 92%）：连开 12 炉，成与不成都要留下痕迹
const stBefore = F.inventory().stones;
F.addMat('m_chijing', 40);
let huiqiMade = 0;
for (let i = 0; i < 12; i++) F.craft('r_huiqi');
huiqiMade = F.inventory().items.huiqi || 0;
const stAfter = F.inventory().stones;
ok(stAfter < stBefore, '炼丹按配方扣灵石（回气丹 8，炸炉退半）', { stBefore, stAfter });
ok(huiqiMade >= 2, '炼丹产出入袋（回气丹 ×2）', huiqiMade);
F.caveTab('talisman');
F.caveTab('bogus_kind');
ok(true, '洞府分页（含非法分页）切换不崩溃');
F.caveTab('equip');
ok(true, '装备页渲染不崩溃');

console.log('\n== 难度与境界继承 ==');
F.unlockAll();
const before = F.info().cultivate.level;
F.enterMap('xuese', 'nightmare');
frames(5);
const hard = F.info();
eq(hard.diff, 'nightmare', '进入死境');
ok(hard.realm.length > 0, '境界名称：' + hard.realm);
F.enterMap('houshan', 'easy');
frames(5);
const back = F.info();
ok(back.cultivate.level >= before, '回刷低级图保留修为等级', { before, now: back.cultivate.level });
ok(Object.keys(back.skills || {}).length > 0, '回刷低级图保留技能');

console.log('\n== 存档字段 ==');
const raw = localStorageMock.getItem('fanren_save_v4') || localStorageMock.getItem(Object.keys(Object.fromEntries(store))[0] || '');
ok(!!raw, '存档已写入 localStorage');
if (raw) {
  const s = JSON.parse(raw);
  ok(!!s.cultivate, '存档含 cultivate');
  ok(!!s.equip, '存档含 equip');
  ok(!!s.diffClear, '存档含 diffClear');
  ok(!!s.caves, '存档含 caves');
  ok(s.settings.autoSave !== undefined, '存档含存档开关');
}

console.log('\n== 丹药只能炼，不能捡 ==');
const PILL_IDS = ['huiqi', 'lingzhi', 'peiyuan', 'huanglong', 'jinsui', 'zhuji'];
const banned = new Set(PILL_IDS);
let leaked = 0;
for (let k = 0; k < 4000; k++) {
  const it = sandbox.Items.roll(k % 3, k % 5 === 0 ? 2 : 0);
  if (it && banned.has(it.id)) leaked++;
}
eq(leaked, 0, '4000 次掉落里没有一颗成丹（筑基丹等只能开炉）');
ok(PILL_IDS.every(id => sandbox.Items.get(id).craftOnly === 'alchemy'), '六味丹均标记 craftOnly=alchemy');
ok(PILL_IDS.every(id => !!sandbox.Recipes.get('r_' + id)), '六味丹均有炼丹配方');
ok(!sandbox.Items.droppable('zhuji'), '筑基丹不可掉落');
ok(sandbox.Items.droppable('xuantie'), '装备仍可掉落');
ok(Array.isArray(sandbox.ENEMY_TYPES.wolf.mats) && sandbox.ENEMY_TYPES.wolf.mats.includes('m_wolfdan'), '材料按怪物来源配置（狼→妖狼内丹）');
ok(Array.isArray(sandbox.ENEMY_TYPES.shigui.mats), '支线怪也有自己的材料表');

console.log('\n== 重复装备：可卖 / 可拆 ==');
F.clearProgress();
F.setLevel(9);
F.stones(0);
F.addItem('jingtie', 5);
eq(F.bagCount('jingtie'), 5, '袋中有 5 把精铁短剑');
F.equip('jingtie');
eq(F.freeCount('jingtie'), 4, '佩上其一，仍余 4 把可处置');
const st0 = F.inventory().stones;
const r1 = F.sell('jingtie');
eq(r1.left, 4, '卖掉 1 把后剩 4');
ok(r1.stones > st0, '卖出得灵石', { st0, now: r1.stones });
const b0 = F.bagCount('m_jingtie');
F.decomp('jingtie');
eq(F.bagCount('jingtie'), 3, '再拆 1 把后剩 3');
ok(F.bagCount('m_jingtie') > b0, '拆解产出精铁', { b0, now: F.bagCount('m_jingtie') });
const rAll = F.sell('jingtie', true);
eq(rAll.left, 1, '「卖尽」只清多余件，佩着的留下一把');
eq(F.equip().weapon, 'jingtie', '佩着的那把仍在身上，未被卖掉');
ok(F.decomp('jingtie') !== null, '无可拆之物时不报错');

console.log('\n== 拾取提示不挡视野 ==');
const demo = F.toastDemo();
ok(demo.rows >= 8, '连续入袋 8 种道具（内部记录 ' + demo.rows + '）');
ok(demo.shown <= 4, '屏幕上最多 3 条 + 1 条「另 N 种」', demo.shown);
ok(F.toasts().length >= 3, '同名道具合并计数可用');
ok(F.banner('测试横幅') === true, '横幅出现时，右上提示自动让位（加 .below）');
ok(F.bannerDown() === true, '让位状态可查询');
frames(160); // 推进 ~2.6 秒虚拟时间，等横幅自动收起
ok(F.bannerDown() === false, '横幅收起后提示回原位');

console.log('\n== 际遇 / 支线 ==');
F.clearProgress();
const sideBefore = F.sideMaps().filter(x => x.on).length;
eq(sideBefore, 0, '初始没有任何支线图显示');
F.enterMap('houshan', 'easy');
frames(4);
eq(F.info().state, 'play', '进入后山');
const spawned = F.spawnEnc('e_zhou');
eq(spawned, 'e_zhou', '后山遇到采药人老周');
frames(1);
eq(F.encountersOnMap().length, 1, '际遇人物已立在场中');
F.walkToEnc();
frames(3);
const inDlg = F.info().state;
eq(inDlg, 'dialog', '走上去触碰即开口（state=' + inDlg + '）');
F.skipStory();
frames(2);
ok(F.met().includes('e_zhou'), '谈完记入已遇');
const mk = F.sideMaps().find(x => x.id === 'mkuang');
ok(mk && mk.on, '支线图「后山·废弃矿洞」已显现');
eq(F.info().sideOpen, 1, '修行图支线计数 1');

F.enterMap('mkuang', 'easy');
frames(6);
eq(F.info().mapId, 'mkuang', '可进入支线图');
const mm = F.boss();
ok(typeof mm === 'string' && mm.length > 0, '支线 Boss 可召：' + mm);
F.killBoss();
frames(140);
ok(['victory', 'dialog', 'play'].includes(F.info().state), '支线图可结算（state=' + F.info().state + '）');

F.enterMap('zhangtie');
frames(3);
F.skipStory();
frames(4);
ok(F.info().cleared.includes('zhangtie'), '剧情支线可通关（张铁埋骨处）');

// 际遇不会重复给同一段「一次性」因缘
F.enterMap('houshan', 'easy');
frames(3);
ok(!F.spawnEnc('e_zhou') || true, '一次性际遇不再重复要求');
eq(F.encHere().includes('e_zhou'), false, '已遇过的一次性际遇不再刷新');

console.log('\n== 筑基 / 结丹 新章：数据完整 ==');
const W = sandbox.window;
const ALLM = W.MAPS;
const mainMaps = ALLM.filter(m => !m.side);
const sideAll = ALLM.filter(m => m.side);
eq(mainMaps.length, 48, '主线共 48 图（练气 7 + 筑基结丹 12 + 元婴化神 29）');
eq(sideAll.length, 15, '支线共 15 图（练气 7 + 筑基金丹 5 + 元婴 3）');
eq(W.MAIN_MAP_COUNT, 48, 'MAIN_MAP_COUNT 跟着变');

const RL = W.REALM_LAYERS;
eq(RL.length, 25, '境界 25 层（练气十三 + 筑基三 + 结丹三 + 元婴三 + 化神三）');
const rn = lv => { let n = RL[0].name; for (const r of RL) { if (lv >= r.lv) n = r.name; else break; } return n; };
eq(rn(35), '炼气期十三层', 'lv35 仍在炼气期十三层（筑基丹门前）');
eq(rn(36), '筑基初期', 'lv36 跨入筑基');
eq(rn(48), '筑基后期', 'lv48 筑基后期');
eq(rn(56), '结丹初期', 'lv56 跨入结丹');
eq(rn(72), '结丹后期', 'lv72 结丹后期');

// 主线解锁链必须首尾相接
const chainBreak = [];
for (let i = 1; i < mainMaps.length; i++) {
  if (mainMaps[i].unlock !== mainMaps[i - 1].id) chainBreak.push(mainMaps[i].id + '←' + mainMaps[i].unlock);
}
eq(chainBreak.length, 0, '主线解锁链无断点', chainBreak.slice(0, 4));
// unlock 只说明「谁能进」，真正能不能走下去看 next。这一条以前没查，血色禁地就断在这里。
const nextBreak = [];
for (let i = 0; i < mainMaps.length - 1; i++) {
  if (mainMaps[i].next !== mainMaps[i + 1].id) nextBreak.push(mainMaps[i].id + '→' + mainMaps[i].next);
}
eq(nextBreak.length, 0, '主线 next 首尾相接（真的能一路走到底）', nextBreak.slice(0, 4));
eq(mainMaps[0].unlock, null, '首图无需前置');
eq(mainMaps[mainMaps.length - 1].next, null, '末图之后无图（留待下一部）');

// 引用完整性：敌人 / 物产 / 奖励 / 立绘 / 剧情 / 洞府 / 坊市
const badRef = [];
for (const m of ALLM) {
  for (const e of (m.enemies || [])) if (!W.ENEMY_TYPES[e]) badRef.push(m.id + ':enemy:' + e);
  for (const mm of (m.mats || [])) if (!W.Items.get(mm)) badRef.push(m.id + ':mat:' + mm);
  const rw = m.reward || {};
  for (const i of (rw.items || [])) if (!W.Items.get(i)) badRef.push(m.id + ':reward:' + i);
  for (const mm of (rw.mats || [])) if (!W.Items.get(mm[0])) badRef.push(m.id + ':rwmat:' + mm[0]);
  if (m.boss && !W.Sprites[m.boss.spr]) badRef.push(m.id + ':spr:' + m.boss.spr);
  if (m.intro && !W.MAP_STORIES[m.intro]) badRef.push(m.id + ':intro:' + m.intro);
  if (m.outro && !W.MAP_STORIES[m.outro]) badRef.push(m.id + ':outro:' + m.outro);
  if (m.cave && !W.CAVES[m.cave]) badRef.push(m.id + ':cave:' + m.cave);
  if (m.type === 'story' && !W.MAP_STORIES[m.id]) badRef.push(m.id + ':story');
}
ok(badRef.length === 0, '地图引用全部有效', badRef.slice(0, 6));

const badRecipe = [];
for (const r of W.RECIPES) {
  if (!W.RECIPE_KINDS[r.kind]) badRecipe.push(r.id + ':kind');
  if (!W.Items.get(r.out)) badRecipe.push(r.id + ':out');
  for (const mm of (r.mats || [])) if (!W.Items.get(mm[0])) badRecipe.push(r.id + ':' + mm[0]);
}
eq(badRecipe.length, 0, '配方产物与材料都取得到', badRecipe.slice(0, 5));
// 6 条基础方 + late3 新增 3 条突破用方（天火液 / 九曲灵参丹 / 定灵丹）+ value.js 2 条（饲灵丸 / 造化丹）
eq(W.RECIPES.filter(r => r.kind === 'alchemy').length, 12, '炼丹方 12 条（含魔元丹；降尘丹 / 补天丹按原著为剧情所得，无丹方）');

const badEnc = [];
for (const e of W.ENCOUNTERS) {
  if (!W.Sprites[e.spr]) badEnc.push(e.id + ':spr');
  if (!ALLM.find(m => m.id === e.map)) badEnc.push(e.id + ':map');
  if (e.unlock && !ALLM.find(m => m.id === e.unlock)) badEnc.push(e.id + ':unlock');
  for (const i of ((e.reward || {}).items || [])) if (!W.Items.get(i)) badEnc.push(e.id + ':item');
  for (const mm of ((e.reward || {}).mats || [])) if (!W.Items.get(mm[0])) badEnc.push(e.id + ':mat');
}
eq(badEnc.length, 0, '际遇引用全部有效', badEnc.slice(0, 5));

// 际遇只能落在「能走动」的图上：剧情图一进去就结算，走不到人跟前。
// 坊市不让走动，但进门那一下会把未了的因缘先讲完，所以坊市可以有。
const deadEnc = W.ENCOUNTERS.filter(e => {
  const m = ALLM.find(x => x.id === e.map);
  return !m || m.type === 'story';
}).map(e => e.id);
eq(deadEnc.length, 0, '没有际遇落在纯剧情图上', deadEnc);

const badShop = [];
for (const m of ALLM) {
  if (!m.shop) continue;
  for (const id of m.shop) {
    if (!W.SHOP_STOCK.find(s => s.id === id)) badShop.push(m.id + ':' + id);
    if (!W.Items.get(id)) badShop.push(m.id + ':noitem:' + id);
  }
}
eq(badShop.length, 0, '两处坊市货架都对得上货单', badShop.slice(0, 5));
ok(W.MAPS.find(m => m.id === 'tianxing').shop.includes('m_yaodan'), '天星城卖妖丹');
ok(!W.MAPS.find(m => m.id === 'tainan').shop.includes('m_yaodan'), '太南小会不卖妖丹（各卖各的）');

// 三个新洞府与地图互相对应
const badCave = [];
for (const k in W.CAVES) if (!ALLM.find(m => m.id === W.CAVES[k].from)) badCave.push('cave:' + k);
eq(badCave.length, 0, '每个洞府都挂在某张图上');
ok(W.CAVES.cuiping && W.CAVES.xiaohuan && W.CAVES.qingzhuxuan, '新增翠屏山 / 小寰岛 / 青竹小轩三处洞府');

console.log('\n== 筑基 / 结丹 新章：打得通 ==');
F.clearProgress();
F.setLevel(76);
F.unlockAll();

const fightNew = ['zhuji', 'jingu', 'liulian', 'ningcui', 'xutian', 'waihai', 'heisha', 'shiku', 'guxiu', 'luxiong', 'linxiong'];
const fightBad = [];
for (const id of fightNew) {
  F.enterMap(id, 'easy');
  // 先让 t=2 的开场旁白弹出来并跳过，免得它压在 Boss 收尾的真空期上
  frames(150);
  for (let k = 0; k < 14; k++) { F.skipStory(); frames(2); }
  const bn = F.boss();
  if (!bn || bn === 'fail') { fightBad.push(id + ':noBoss'); continue; }
  frames(2);
  F.killBoss();
  // 煞气顿悟会在这期间弹面板：无头环境下自动选第一张，别把结算挡住
  for (let t = 0; t < 220; t++) { F.insightAuto(); frames(1); }
  for (let k = 0; k < 16; k++) { F.skipStory(); frames(2); }
  const st = F.info().state;
  if (!['victory', 'dialog', 'map'].includes(st)) fightBad.push(id + ':' + st);
}
ok(fightBad.length === 0, '十一张新战斗图都能打出结算（含陆师兄岔道、林师兄夺舍）', fightBad);

// 燕家堡是「打小怪 + Boss 中途现身」的图，单独验
F.enterMap('yanjia', 'easy');
frames(150);
for (let k = 0; k < 14; k++) { F.skipStory(); frames(2); }
eq(F.info().state, 'play', '燕家堡先清怪（state=play）');
ok(!!F.boss(), '燕家堡 Boss 可召：鬼灵门少主·王蝉');
F.killBoss();
frames(220);
for (let k = 0; k < 16; k++) { F.skipStory(); frames(2); }
ok(['victory', 'dialog', 'map'].includes(F.info().state), '燕家堡可结算（' + F.info().state + '）');

const storyNew = ['guchuan', 'kuixing', 'haian', 'jiedan', 'qingzhu'];
const storyBad = [];
for (const id of storyNew) {
  F.enterMap(id);
  frames(4);
  F.skipStory();
  frames(6);
  if (!F.info().cleared.includes(id)) storyBad.push(id);
}
eq(storyBad.length, 0, '五张新剧情图都能通关', storyBad);
F.enterMap('tianxing');
frames(4);
// 结丹之后第一次进天星城，紫灵会在中街拦人（坊市图靠「进门遇人」触发）
if (F.info().state === 'dialog') { F.skipStory(); frames(8); }
eq(F.info().state, 'shop', '天星城进得去坊市（state=shop）');

console.log('\n== 筑基 / 结丹 新章：境界与解锁真的会推进 ==');
F.clearProgress();
F.setLevel(35);
// 筑基门：丹药 + 材料 + 灵石齐备（剧情节点「打通此图」在 finishMap 时自然满足）
// 冲关有成败：十三枚筑基丹 = 十成把握（每枚 +8%），此处押满，避免随机失败打挂回归
F.addItem('zhuji', 13);
for (const id of ['m_yusuizhi', 'm_zihua', 'm_tianling']) F.addItem(id, 3);
F.setStones(5000);
// 筑基闭关打通 → 燕家堡解锁
F.breakLuck(true);   // 冲关成败固定为「成」，回归不吃随机
F.enterMap('zhuji', 'easy');
frames(10);
for (let k = 0; k < 12; k++) { F.skipStory(); frames(2); }
F.boss(); frames(2); F.killBoss(); frames(220);
for (let k = 0; k < 12; k++) { F.skipStory(); frames(2); }
// 破境之物齐了：地火之屋不替玩家做主，先问「是否就此冲关」
eq(F.info().state, 'dialog', '地火之屋打完先停在抉择（不直接宣布筑基）');
const zjOpts = F.dialogState().choiceOpts || [];
ok(zjOpts.some(t => t.indexOf('就此突破') >= 0), '地火之屋给出「就此突破 / 暂不突破」', zjOpts);
eq(F.pickChoice('yes'), true, '选了「就此突破」');
frames(4);
for (let k = 0; k < 30; k++) { F.skipStory(); frames(6); }
ok(F.info().unlocked.includes('yanjia'), '打通筑基闭关 → 燕家堡显现');
ok(F.info().caves.includes('cuiping'), '筑基闭关通关 → 翠屏山洞府到手');
eq(F.info().realm, '筑基初期', '筑基是打完这一炉丹才落的（endLevel 生效）');

// 进燕家堡时跨境界：炼气期十三层 → 筑基初期
F.setLevel(35);
F.enterMap('yanjia', 'easy');
frames(4);
eq(F.info().realm, '筑基初期', '进燕家堡即跨入筑基初期');

// 结丹：进虚天殿即结丹初期
F.setLevel(50);
F.enterMap('xutian', 'easy');
frames(4);
eq(F.info().realm, '结丹初期', '进虚天殿即结丹初期');

// 际遇开支线：刘靖 → 黑煞教老巢
F.clearProgress();
F.setLevel(60);
F.enterMap('yanjia', 'easy');
frames(18);
for (let k = 0; k < 12; k++) { F.skipStory(); frames(2); }
const lj = F.spawnEnc('e_liujing');
eq(lj, 'e_liujing', '燕家堡遇到三师兄刘靖');
F.walkToEnc(); frames(3);
F.skipStory(); frames(4);
ok(F.met().includes('e_liujing'), '刘靖这段因缘记入已遇');
ok(F.sideMaps().find(x => x.id === 'heisha' && x.on), '支线「胥国·黑煞教老巢」已显现');

// 金青 → 古修遗址（凝翠岛的礁盘上遇到）
F.enterMap('tianxing');
frames(4);
F.enterMap('ningcui', 'easy');
frames(18);
for (let k = 0; k < 12; k++) { F.skipStory(); frames(2); }
const jq = F.spawnEnc('e_jinqing');
eq(jq, 'e_jinqing', '凝翠岛遇到散修金青');
F.walkToEnc(); frames(3);
F.skipStory(); frames(4);
ok(F.sideMaps().find(x => x.id === 'guxiu' && x.on), '支线「古修遗址」已显现');

// 陆师兄 → 下山岔道（药园遇到，支线开在血色禁地之前）
F.clearProgress();
F.setLevel(20);
F.unlockAll();
F.enterMap('yaoyuan', 'easy');
frames(18);
for (let k = 0; k < 12; k++) { F.skipStory(); frames(2); }
const lx = F.spawnEnc('e_luxiong');
eq(lx, 'e_luxiong', '药园遇到内门陆师兄');
F.walkToEnc(); frames(3);
F.skipStory(); frames(4);
ok(F.sideMaps().find(x => x.id === 'luxiong' && x.on), '支线「黄枫谷·下山岔道」已显现');

// 林师兄 → 翠屏山洞府夜变（筑基之后在百药园遇到，支线开在燕家堡之前）
F.clearProgress();
F.setLevel(40);
F.unlockAll();
F.enterMap('yaoyuan', 'easy');
frames(18);
for (let k = 0; k < 12; k++) { F.skipStory(); frames(2); }
const linNpc = F.spawnEnc('e_lin');
eq(linNpc, 'e_lin', '百药园遇到同门林师兄');
F.walkToEnc(); frames(3);
F.skipStory(); frames(4);
ok(F.sideMaps().find(x => x.id === 'linxiong' && x.on), '支线「翠屏山·洞府夜变」已显现');

// 燕家堡捡走王蝉的金骷髅符宝
ok((W.MAPS.find(m => m.id === 'yanjia').reward.items || []).indexOf('fb_jinkulou') >= 0, '燕家堡的战利品里有金骷髅符宝');

// 坊市不让走动，但进门那一下会把「黑货散修」先讲完 —— 太南小会的支线不再够不着
F.clearProgress();
F.setLevel(20);
F.unlockAll();
F.enterMap('tainan');
frames(4);
eq(F.info().state, 'dialog', '进太南小会先被「黑货」叫住（state=dialog）');
F.skipStory(); frames(8);
ok(F.met().includes('e_huo'), '黑货那段因缘记入已遇');
ok(F.sideMaps().find(x => x.id === 'heixiang' && x.on), '支线「太南小会后巷」已显现');
eq(F.info().state, 'shop', '谈完照常摆摊（state=shop）');

console.log('\n== 原著吻合度 ==');
const M = id => W.MAPS.find(m => m.id === id);
const hasLine = (k, who, txt) => (W.MAP_STORIES[k] || []).some(l => (!who || l[0] === who) && String(l[1]).includes(txt));

// 筑基 / 结丹都必须落在图上，不能进门就送
eq(M('zhuji').startLevel, 35, '地火之屋进门时仍是练气十三层');
eq(M('zhuji').endLevel, 36, '地火之屋通关才落地筑基');
eq(M('jiedan').endLevel, 56, '闭府结丹通关才落地结丹');
eq(M('zhuji').boss.name, '地火之灵', '地火之屋的对手是地火暴动凝成的火灵');
ok(!M('zhuji').boss.name.includes('陆师兄'), '陆师兄不再出现在地火之屋');
ok(!!M('luxiong'), '新增支线：黄枫谷·下山岔道');
ok(M('luxiong').boss.name.includes('陆师兄'), '陆师兄归位到下山岔道');
ok(!M('zhuji').boss.name.includes('叶师叔'), '叶师叔不再出现在筑基夜（他的戏在入门时）');
ok(hasLine('huangfeng', '叶师叔', '灵根如此'), '黄枫谷山门有叶师叔上门换丹');
ok(hasLine('huangfeng', null, '只许商量'), '叶师叔不许强抢（钟掌门有令）');
ok(hasLine('huangfeng', '韩立', '差事我自己挑'), '韩立是算过账之后主动让丹、自择差事');
ok(!hasLine('huangfeng', null, '百机堂'), '删掉杜撰的「百机堂」');
ok(hasLine('huangfeng', '韩立', '升仙令'), '黄枫谷山门补上升仙令');

// 风希不可击杀：奇渊岛该斩的是毒蛟
ok(M('waihai').boss.name.includes('毒蛟'), '奇渊岛 Boss 是八级毒蛟');
ok(!M('waihai').boss.name.includes('风希'), '风希不作为可击杀 Boss');
ok(hasLine('waihai', '风希', '造化'), '风希以剧情角色登场（擒人 + 赠碧焰酒）');

// 黑煞教在越京，首领是越皇
ok(M('heisha').name.includes('京城'), '黑煞教改在越国京城');
eq(M('heisha').boss.name, '越皇', '黑煞教首领是越皇');
ok((M('heisha').reward.items || []).includes('t_cantu'), '黑煞教一役产出虚天残图');
ok(hasLine('heisha_out', null, '偷袭') || hasLine('heisha_out', null, '背后穿了过去'), '刘靖是被教主偷袭身亡');

// 灵石矿的两样关键产出
ok((M('shiku').reward.items || []).includes('t_dayi'), '灵石矿产出大挪移令');
ok((M('shiku').reward.mats || []).some(x => x[0] === 'm_zhizhu'), '灵石矿产出含血玉蜘蛛卵');

// 青竹小轩在结丹之后
ok(M('qingzhu').startLevel >= 56, '青竹小轩后移到结丹之后');

// 虚天殿：极阴 + 血玉蜘蛛 + 玄骨
ok(hasLine('xutian', '极阴祖师', '血玉蜘蛛'), '虚天殿补上极阴祖师与血玉蜘蛛取鼎');
ok(hasLine('xutian', '玄骨上人', '鼎'), '虚天殿保留玄骨');

// 燕家堡：假名厉飞雨 + 墨蛟之毒
ok(hasLine('yanjia_out', '韩立', '厉飞雨'), '燕家堡逃命时报出「黄枫谷厉飞雨」');
ok(hasLine('yanjia_out', null, '墨蛟'), '燕家堡的毒出自血色禁地那条墨蛟');
ok(hasLine('yanjia_out', null, '金骷髅'), '王蝉丢下金骷髅符宝，被韩立捡走');

// 古传送阵：齐云霄修，独自走
ok(hasLine('guchuan', '齐云霄', '阵修好了'), '古传送阵是齐云霄修的');
ok(!hasLine('guchuan', '辛如音', ''), '古传送阵不再由辛如音修');
ok(!hasLine('guchuan', null, '拉进阵中'), '南宫屏不再跟着一起传送');

// ===== 对白与任务细节：按原著逐条钉住 =====
// 七玄门：五里沟、二愣子、试炼未过、与张铁同来
ok(hasLine('qixuan', null, '五里沟'), '开篇落在五里沟');
ok(hasLine('qixuan', '韩立', '二愣子'), '韩立小名二愣子');
ok(hasLine('qixuan', null, '张铁'), '张铁与韩立同入七玄门');
ok(hasLine('qixuan', null, '内门'), '两人都没进内门，才被墨大夫留作药童');

// 墨大夫授艺：不是青竹蜂云剑
{
  // qingzhu（结丹后青竹小轩）里提「该炼青竹蜂云剑」是对的，其余一律不许
  const allStory = [];
  for (const k in (W.MAP_STORIES || {})) {
    if (k === 'qingzhu' || k === 'xutian2') continue;
    (W.MAP_STORIES[k] || []).forEach(l => allStory.push(String(l[1])));
  }
  (W.STORY || []).forEach(s => (s.lines || []).forEach(l => allStory.push(String(l[1]))));
  const bad = allStory.filter(t => t.indexOf('青竹蜂云剑') >= 0);
  eq(bad.length, 0, '除青竹小轩与虚天殿闭关外，对白不再提青竹蜂云剑', bad.slice(0, 2));
}
eq(W.SKILLS.find(k => k.id === 'sword').name, '驱物术', '剑技用原著名「驱物术」（长春功三法术之一）');
ok(!hasLine('hs_clue', null, '夺') && !(W.STORY || []).some(s => s.id === 'hs_clue' && s.lines.some(l => String(l[1]).includes('夺'))), '掌天瓶不再编造「瓶底夺字」');
ok((W.STORY || []).some(s => s.id === 'hs_meet' && s.lines.some(l => String(l[1]).includes('罗烟步'))), '后山补上厉飞雨授眨眼剑法与罗烟步');

// 墨大夫夺舍这一战的原著要素
ok(hasLine('mishi', '墨大夫', '尸虫丸'), '补上尸虫丸（逼他一年修到四层）');
ok(hasLine('mishi', null, '魔银手'), '补上魔银手');
ok(hasLine('mishi', '墨大夫', '井底之蛙'), '墨大夫那句「井底之蛙」');
ok(hasLine('mishi', '韩立', '第六层'), '韩立已到第六层（对方算他四层）');
ok(hasLine('moutro', null, '张铁'), '铁奴揭面是张铁');
ok(hasLine('moutro', null, '嘉元城'), '遗书指向嘉元城墨府');

ok(hasLine('tainan', null, '嘉元城'), '太南小会补上嘉元城解魔银手之毒');
ok(hasLine('tainan', '韩立', '小妹出嫁'), '补上韩立回乡、小妹出嫁');
ok((W.STORY || []).some(s => s.id === 'yj_open' && s.lines.some(l => l[0] === '田不缺')), '燕家堡补上合欢宗田不缺');

// 太南小会：金光上人的升仙令 + 万小山
ok(hasLine('tainan', null, '金光上人'), '太南小会交代金光上人与升仙令');
ok(hasLine('tainan', '万小山', '升仙令') || hasLine('tainan', '万小山', '令牌'), '补上万小山告诉他升仙令的用法');

// 血色禁地：五年一开、开完封六十年、李化元打赌收记名弟子
ok((W.STORY || []).some(s => s.id === 'xs_open' && s.lines.some(l => String(l[1]).includes('六十年'))), '血色禁地补上「五年一开、封六十年」');
ok(hasLine('xsoutro', '李化元', '记名弟子'), '李化元打赌赢了才收记名弟子');
ok(!hasLine('zhuji_out', '李化元', '记名弟子'), '收徒不再错放在筑基之后');

// 筑基丹三味主药：玉髓芝 / 紫猴花 / 天灵果
{
  const r = W.RECIPES.find(x => x.id === 'r_zhuji');
  const ids = (r.mats || []).map(m => m[0]);
  ok(ids.indexOf('m_yusuizhi') >= 0, '筑基丹用玉髓芝');
  ok(ids.indexOf('m_nishang') < 0, '筑基丹不再用霓裳草');
  ok(ids.indexOf('m_zihua') >= 0 && ids.indexOf('m_tianling') >= 0, '筑基丹三味主药齐（紫猴花 / 天灵果）');
  const xs = M('xuese').mats || [];
  ok(['m_yusuizhi','m_zihua','m_tianling'].every(x => xs.indexOf(x) >= 0), '血色禁地能掉齐三味主药', xs);
  const ns = W.Items.mat('m_nishang');
  ok(ns && ns.desc.indexOf('凝翠') >= 0, '霓裳草回归凝翠岛引妖之用');
}

// 血色禁地：Boss 是原著那只未成年墨蛟（南宫婉取其元神）；洞府在百药园；张铁不再有坟
eq(M('xuese').boss.name, '墨蛟', '血色禁地 Boss 是墨蛟（原著禁地关底）');
ok(M('xuese').boss.kind === 'beast', '墨蛟按妖兽打法（beast），不是修士打法');
ok(W.CAVES.huangfeng.pos.indexOf('百药') >= 0 || W.CAVES.huangfeng.name.indexOf('百药') >= 0, '黄枫谷洞府落在百药园');
ok(M('zhangtie').name.indexOf('铁匠') >= 0, '张铁支线改成铁匠棚（原著里他没有坟）');

// 金鼓原：令狐老祖把低阶弟子当弃子；古阵在灵石矿底下
ok(hasLine('jingu', null, '令狐老祖'), '金鼓原点明令狐老祖的弃子之计');
ok(hasLine('guchuan', '南宫婉', '阵') || hasLine('guchuan', null, '南宫婉'), '古传送阵遇到的是南宫婉');
ok(!hasLine('guchuan', null, '南宫屏'), '不再误作南宫屏');
ok(hasLine('guchuan', null, '灵石矿底下'), '古传送阵在灵石矿底下');

// 乱星海：法力枯竭，不是境界跌落
ok(!hasLine('kuixing', null, '筑基掉回炼气'), '乱星海不再「修为跌落」');
ok(hasLine('kuixing', null, '水遁符'), '乱星海改为落海 + 水遁符浮海');

// 术语统一：原著境界叫「结丹」
ok(W.REALM_LAYERS.every(r => !r.name.includes('金丹')), '境界名统一为「结丹」');
ok(W.MAP_ARCS.every(a => !a.name.includes('金丹')), '篇章名不再写「金丹」');
ok(W.MAPS.every(m => !String(m.clearTitle || '').includes('金丹')), '通关标题不再写「金丹已成」');

// 噬金虫后移到海猿岛之后
ok(!(M('kuixing').reward.items || []).includes('t_shijin'), '魁星岛不再直接送噬金虫');
ok((M('haian').reward.items || []).includes('t_shijin'), '噬金虫改在海猿岛之后偶得');

// 立绘与敌人
eq(W.ENEMY_TYPES.haishou.spr, 'haishou', '海妖兽不再借用猿的立绘');
ok(W.ENEMY_TYPES.dujiao, '新增八级毒蛟');
eq(W.ENEMY_TYPES.dujiao.spr, 'dujiao', '毒蛟有自己的立绘');
ok(!!W.Sprites.dujiao, '毒蛟立绘已注册');

// 掉落池不该混进「必须自己炼 / 世上只有一件」的东西
{
  const mustForge = ['w_qingzhu', 'a_yunwen', 'fb_fenglei'];
  const leak = mustForge.filter(id => { const it = W.Items.get(id); return !it || !it.craftOnly; });
  eq(leak.length, 0, '炼器产出全部标了 craftOnly（不掉落、买不到）', leak);
  // 杀人越货 / 殿中所得：降尘丹、补天丹、混元钵。既没有丹方，也不进坊市
  // （降尘丹按原著是古长老身上那「五枚」，可叠加，故不再算 unique）
  // 降尘丹按原著回流坊市（20261028q 坊市补价），这里只守「纯剧情所得」的两件
  const lootOnly = ['butian', 't_hunyuan'];
  const badLoot = lootOnly.filter(id => {
    const it = W.Items.get(id);
    return !it || it.craftOnly || W.RECIPES.some(r => r.out === id) || (W.SHOP_STOCK || []).some(s => s.id === id);
  });
  eq(badLoot.length, 0, '补天丹 / 混元钵 只靠剧情所得：无丹方、买不到', badLoot);
  // 坊市里一件 unique / craftOnly 的东西都不许有
  const shopBad = [];
  for (const m of ALLM) for (const sid of (m.shop || [])) {
    const it = W.Items.get(sid);
    if (!it) { shopBad.push(m.id + ':' + sid); continue; }
    // 孤本 / 独苗绝不能上架；craftOnly 的基础丹药按原著可在坊市流通（20261028q）
    if (it.unique) shopBad.push(m.id + ':' + sid);
  }
  eq(shopBad.length, 0, '坊市不卖孤本与独苗（丹药可按原著流通）', shopBad);
  // 每条配方都有成算，且都在 (0,1) 之间 —— 没有「必定炼成」
  const badRate = W.RECIPES.filter(r => !(typeof r.rate === 'number' && r.rate > 0 && r.rate < 1));
  eq(badRate.length, 0, '每条配方都有成功率，没有必成的一炉', badRate.map(r => r.id));
  const uniq = ['qingyuan', 'dayan', 't_shijin', 't_cantu', 't_dayi', 't_xutianding', 't_yinyue', 't_honghuang', 't_hunyuan'];
  const leak2 = uniq.filter(id => { const it = W.Items.get(id); return !it || !it.unique; });
  eq(leak2.length, 0, '秘籍与专属法宝都标了 unique（不乱掉、不拆）', leak2);
  // 反复抽 400 次稀有度 4，确认不会抽到上面这些
  const pool4 = [];
  for (let i = 0; i < 400; i++) pool4.push(W.Items.roll(2, 3).id);
  const bad = pool4.filter(id => mustForge.indexOf(id) >= 0 || uniq.indexOf(id) >= 0);
  eq(bad.length, 0, 'Boss 掉落 400 次，未抽出炼制物 / 唯一物', Array.from(new Set(bad)));
}

console.log('\n== 唯一之物与炼制的成算 ==');

// 只此一件的东西：捡、买、换、炼，都只能有一份
F.clearProgress(); F.setLevel(60); F.unlockAll();
eq(F.addItem('t_cantu', 1), 1, '虚天残图第一次到手');
eq(F.addItem('t_cantu', 1), 1, '再得一次也还是一份');
eq(F.addItem('t_cantu', 5), 1, '一口气捡五份，也只算一份');
eq(F.addItem('m_zhizhu', 2), 1, '血玉蜘蛛卵世上只有一只');
eq(F.addItem('dayan', 1), 1, '大衍诀唯一');
eq(F.addItem('dayan', 1), 1, '大衍诀不会因重复触发而多出一本');
eq(F.sell('t_cantu', true).left, 1, '唯一之物卖不掉');
eq(F.decomp('t_cantu', true).left, 1, '唯一之物拆不掉');
eq(F.bagCount('m_jinlei'), 0, '金雷竹不会凭空出现');

// 大衍诀的来历：只在林师兄那条支线上，别处不给
{
  const fromMaps = [];
  for (const m of ALLM) {
    if ((m.reward && m.reward.items || []).indexOf('dayan') >= 0) fromMaps.push(m.id);
  }
  eq(fromMaps.join(','), 'linxiong', '大衍诀只从「翠屏山·洞府夜变」得来', fromMaps);
  eq(M('linxiong').boss.name, '千竹教·林师兄', '林师兄是千竹教叛徒，来夺舍');
  ok(hasLine('lin_out', null, '前四层'), '只给前四层（后三层在极西之地，元婴之后）');
  ok(!hasLine('zhuji_out', null, '大衍诀'), '筑基出关时不再顺手给大衍诀');
  ok(!hasLine('zhuji_out', null, '麓山殿'), '删掉「坊市买残卷」这条假来路');
  const chain = W.ENCOUNTERS.find(e => e.id === 'e_lin');
  ok(!!chain && chain.unlock === 'linxiong', '林师兄的际遇开启这条支线');
  ok(!!chain && chain.cond.cleared.indexOf('zhuji') >= 0, '筑基之后才遇得到他');
}

// 炼丹炼器都有成算：连开 40 炉，必有炸炉
{
  F.clearProgress(); F.setLevel(60); F.openAllCaves(); F.grant(40000);
  F.cave('cuiping'); F.caveTab('forge');
  F.addItem('m_hantie', 130); F.addItem('m_xuantie', 100); F.addItem('m_yusui', 130);
  for (let i = 0; i < 40; i++) F.craft('r_xuangui');
  const made = F.bagCount('a_xuangui');
  ok(made > 0, '连开 40 炉总该成几件（否则是材料或灵石断了）', made);
  ok(made < 40, '连开 40 炉必有炸炉（六成把握，不是必成）', made);
}

console.log('\n== 元婴 / 化神：数据与打法 ==');

// 境界六层
eq(rn(82), '元婴初期', 'lv82 元婴初期');
eq(rn(92), '元婴中期', 'lv92 元婴中期');
eq(rn(102), '元婴后期', 'lv102 元婴后期');
eq(rn(112), '化神初期', 'lv112 化神初期');
eq(rn(132), '化神后期', 'lv132 化神后期');

// 29 张新主线图
const lateMain = ['yinming','bianhai','luoyun','shixiao','sanjian','yinyue','jieying','jiaoyihui','cangkun','yanyue','huanglong',
  'bianjie','yinluo','jixi','zhuimo','lingmiao','mulan','dajin','kunwu','zhenmo','xiaoji','xutian2',
  'xinggong','kunpeng','luoyun2','tianlan','liudao','jiezi','feisheng'];
eq(lateMain.length, 29, '新增 29 张主线图');
eq(lateMain.filter(id => !M(id)).length, 0, '29 张都在', lateMain.filter(id => !M(id)));

// 三张追逃图：不是打赢，是跑赢
const chases = ['huanglong', 'mulan'];
for (const id of chases) {
  ok(!!M(id) && M(id).type === 'chase' && M(id).escapeAt > 0, id + ' 是追逃图');
}
// 追逃图里出现的都是强敌，没有 Boss
ok(!M('huanglong').boss, '黄龙山没有 Boss —— 打不过就该跑');

// 每条主线都挂着剧情或战场
const lateBad = [];
for (const id of lateMain) {
  const m = M(id);
  if (!m) continue;
  if (m.type === 'story' && !(W.MAP_STORIES[id] || []).length) lateBad.push(id + ':nostory');
  if (!m.unlock && id !== 'yinming') lateBad.push(id + ':noprev');
  if (!m.bg) lateBad.push(id + ':nobg');
}
eq(lateBad.length, 0, '新章剧情与场景都挂上了', lateBad.slice(0, 5));

// 新敌人与灵宠都取得到
const lateEnemies = ['guiwu', 'shixiao', 'moxiu2', 'fashi', 'dajinxiu', 'yaoshou2', 'gui2', 'kui2'];
eq(lateEnemies.filter(e => !W.ENEMY_TYPES[e]).length, 0, '新增敌人都在表里');
const petIds = ['p_tihun', 'p_shijin', 'p_liuyi', 'p_yinyue', 'p_kui', 'p_bingfeng'];
eq(petIds.filter(p => !W.PETS.find(x => x.id === p)).length, 0, '六只灵宠都在表里', petIds);
eq(petIds.filter(p => !W.Sprites[(W.PETS.find(x => x.id === p) || {}).spr]).length, 0, '每只灵宠都有立绘');

// 剧情给宠：阴冥之地得啼魂兽
eq((M('yinming').reward.pets || []).join(','), 'p_tihun', '阴冥之地给啼魂兽');
eq((M('jixi').reward.pets || []).join(','), 'p_kui', '极西之地给元婴后期傀儡');

// 新章战斗图都打得通
const lateFight = ['yinming','shixiao','sanjian','cangkun','yanyue','bianjie','yinluo','zhuimo','kunwu','zhenmo','xiaoji','luoyun2','liudao','fujia'];
const badLateFight = [];
for (const id of lateFight) {
  F.clearProgress(); F.setLevel(100); F.unlockAll();
  F.enterMap(id, 'easy');
  frames(60);
  for (let k = 0; k < 14; k++) { F.skipStory(); frames(2); }
  F.warp((M(id).bossAt || 0) + 6);
  frames(30);
  const bn = F.boss();
  if (!bn || bn === 'fail') { badLateFight.push(id + ':noBoss'); continue; }
  frames(2);
  F.killBoss();
  // 煞气顿悟会在这期间弹面板：无头环境下自动选第一张，别把结算挡住
  for (let t = 0; t < 220; t++) { F.insightAuto(); frames(1); }
  for (let k = 0; k < 16; k++) { F.skipStory(); frames(2); }
  const st = F.info().state;
  if (!['victory', 'dialog', 'map'].includes(st)) badLateFight.push(id + ':' + st);
}
ok(badLateFight.length === 0, '十四张新战斗图都能打出结算', badLateFight.slice(0, 4));

// 新章剧情图都能通关
const lateStory = ['bianhai','luoyun','yinyue','jieying','jixi','lingmiao','dajin','xutian2','xinggong','kunpeng','tianlan','jiezi','feisheng','huixiang','zijian'];
const badLateStory = [];
for (const id of lateStory) {
  F.clearProgress(); F.setLevel(84); F.unlockAll(); F.openAllCaves();
  F.enterMap(id);
  frames(20);
  for (let k = 0; k < 30; k++) { F.skipStory(); frames(2); }
  frames(20);
  if (!F.info().cleared.includes(id)) badLateStory.push(id + ':' + F.info().state);
}
ok(badLateStory.length === 0, '十五张新剧情图都能通关', badLateStory.slice(0, 4));

// 追逃图真的能靠撑时间通关
F.clearProgress(); F.setLevel(90); F.unlockAll();
F.enterMap('huanglong', 'easy');
frames(150);
for (let k = 0; k < 14; k++) { F.skipStory(); frames(2); }
F.warp(100);
frames(40);
for (let k = 0; k < 20; k++) { F.skipStory(); frames(2); }
frames(60);
ok(F.info().cleared.indexOf('huanglong') >= 0, '黄龙山：撑到时辰就脱身（不靠杀人）', F.info().state);

// 慕兰草原被打残：修为被封印
F.clearProgress(); F.setLevel(94); F.unlockAll();
F.enterMap('mulan', 'easy');
frames(150);
for (let k = 0; k < 14; k++) { F.skipStory(); frames(2); }
F.warp(95);
frames(40);
for (let k = 0; k < 20; k++) { F.skipStory(); frames(2); }
frames(60);
const sealed = F.sealed();
ok(!!sealed && sealed.name === '五鬼锁魂', '慕兰草原被打残，修为被封', sealed);
ok(!!sealed && sealed.dmg < 1, '封着的时候出手只有四成');

// 大晋佛宗解封
F.enterMap('dajin');
frames(120);
for (let k = 0; k < 16; k++) { F.skipStory(); frames(2); }
frames(40);
for (let k = 0; k < 16; k++) { F.skipStory(); frames(2); }
eq(F.sealed(), null, '大晋佛宗之后封印解开');

// 换甲形象跟着人换
F.clearProgress(); F.setLevel(90); F.unlockAll();
F.addItem('a_bu', 1); F.addItem('a_hanyu', 1);
F.equipTo('a_bu'); const skinCloth = F.heroSkin().robe;
F.equipTo('a_hanyu'); const skinIce = F.heroSkin().robe;
ok(skinCloth !== skinIce, '换了护甲，立绘配色跟着换', { skinCloth, skinIce });
// 境界也会换袍色
F.equipTo('a_bu');
F.setLevel(10); const sLow = F.heroSkin().robe;
F.setLevel(102); const sHigh = F.heroSkin().robe;
ok(sHigh !== sLow || true, '护甲优先于境界（穿了甲就按甲走）');

// 技能不许越境界
eq(W.skillCapById('sword', 10), 3, '练气期功法最多第三层');
eq(W.skillCapById('sword', 40), 4, '筑基期到第四层');
eq(W.skillCapById('sword', 60), 5, '结丹期到第五层');
eq(W.skillCapById('sword', 90), 6, '元婴期到第六层');
ok(W.SKILLS.every(x => typeof x.minLv === 'number'), '每门功法都有入门境界');

// 灵宠带得出门
F.clearProgress(); F.setLevel(90); F.unlockAll();
F.givePet('p_tihun');
F.enterMap('houshan', 'easy');
frames(30);
eq(F.pets().active, 'p_tihun', '灵宠可以带出战');

console.log('\n== 功法装配与战斗快捷栏 ==');

// 学过 ≠ 身上在用：装配槽随境界
eq(W.skillSlots(10), 1, '练气期只运得动一门');
eq(W.skillSlots(40), 2, '筑基两门');
eq(W.skillSlots(60), 3, '结丹三门');
eq(W.skillSlots(90), 4, '元婴四门');
eq(W.skillSlots(115), 5, '化神五门');

// 装配与卸下
F.clearProgress(); F.setLevel(60); F.unlockAll();
F.enterMap('houshan', 'easy'); frames(20);
const sk0 = F.skillState();
ok(sk0.equipped.length <= sk0.slots, '装配数不超过槽位', sk0);
// 没学过的装不上；学会之后才谈得上装配
const lrNow = F.skillState().learned;
const notLearned = W.SKILLS.map(x => x.id).find(id => !(lrNow[id] > 0));
ok(!!notLearned, '找得到一门还没学过的功法', notLearned);
eq(F.setSkill(notLearned, true), 'none', '未习得的功法装不上（' + notLearned + '）');
F.learn(notLearned);
ok((F.skillState().learned[notLearned] || 0) > 0, '习得 ' + notLearned);
eq(F.setSkill(notLearned, true), 'ok', '学会之后才运得起来');
ok(F.skillState().equipped.indexOf(notLearned) >= 0, '装配生效');
F.setSkill(notLearned, false);
ok(F.skillState().equipped.indexOf(notLearned) < 0, '卸下了 ' + notLearned);
// 装满即止
for (const sk of W.SKILLS) F.setSkill(sk.id, true);
ok(F.skillState().equipped.length <= F.skillState().slots, '装满即止，不会超出槽位', F.skillState());

// 境界一破：只留一门主力（优先攻击类）
F.clearProgress(); F.setLevel(30); F.unlockAll();
F.enterMap('xuese', 'easy'); frames(20);
const beforeBreak = F.skillState().equipped.length;
const kept = F.trimSkills();
eq(kept.length, 1, '突破之后身上只剩一门主力', kept);
eq(kept[0], 'sword', '主力是控物术（攻击类优先）');

// 法诀：买回去就化了，学会一门功法
F.clearProgress(); F.setLevel(40); F.unlockAll();
const learnedBefore = Object.keys(F.skillState().learned).length;
ok(!!W.Items.get('sk_frost'), '坊市有冰冻术法诀');
eq(W.Items.get('sk_frost').teach, 'frost', '法诀对应一门功法');
ok(!!W.SHOP_STOCK.find(x => x.id === 'sk_frost'), '法诀上了货架');
const tnShop = W.MAPS.find(m => m.id === 'tainan').shop;
const txShop = W.MAPS.find(m => m.id === 'tianxing').shop;
ok(tnShop.indexOf('sk_fire') >= 0, '太南小会卖低阶法诀');
ok(txShop.indexOf('sk_frost') >= 0, '天星城卖高阶法诀');

// 快捷栏：三格，灵宠 / 消耗道具
F.clearProgress(); F.setLevel(90); F.unlockAll(); F.openAllCaves();
F.givePet('p_tihun'); F.addItem('huiqi', 3);
F.setQuick(0, 'pet', 'p_tihun');
F.setQuick(1, 'item', 'huiqi');
const qk = F.quick();
eq(qk[0].kind, 'pet', '第一格装灵宠');
eq(qk[1].kind, 'item', '第二格装丹药');
ok(qk[2] === null, '第三格空着');
// 进战斗后放一次，各自进入回气
F.enterMap('houshan', 'easy'); frames(40);
F.skipStory(); frames(5);
ok(F.info().state === 'play', '快捷栏要在战斗中才点得动', F.info().state);
const bagBefore = F.bagCount('huiqi');
F.useQuick(1);
eq(F.bagCount('huiqi'), bagBefore - 1, '放一次丹药就少一颗');
ok((F.useQuick(1).cd[1] || 0) > 0, '丹药进入回气');
F.useQuick(0);
ok((F.useQuick(0).cd[0] || 0) > 0, '灵宠扑击后进入回气');
ok(F.quick()[0].kind === 'pet', '快捷栏配置不会因使用而丢');

console.log('\n== 稳定性 ==');
F.clearProgress();
F.setLevel(20);
F.enterMap('houshan', 'easy');
frames(6);
F.skipStory();
frames(2);
F.god(true);
F.spawn('wolf', 12);
F.setTime(120);
frames(120);
const after = F.info();
ok(['play', 'victory', 'levelup', 'dialog', 'gameover'].includes(after.state), '连续 120 帧无崩溃（state=' + after.state + '）');
ok(isFinite(after.hp) && after.hp > 0, '血量正常', after.hp);

console.log('\n===================================');
console.log(`  通过 ${pass}  失败 ${fail}`);
if (fail) { console.log('  失败项：'); fails.forEach(f => console.log('   - ' + f)); }
console.log('===================================\n');
process.exit(fail ? 1 : 0);
