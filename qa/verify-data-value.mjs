// 数据价值守门：总表里每一样东西都得有来的路、也有去的处。
//
// 只测数据层（不启浏览器）：把 js 里的数据文件按 index.html 的顺序在 vm 里跑一遍，
// 然后逐条问：
//   「这件东西，玩家拿得到吗？拿到了，有地方用得上吗？」
// 任何一条答不上来，就说明表里又长出了一件只占地方的垃圾。
//
// 用法：node qa/verify-data-value.mjs
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Map, Set,
  isNaN, isFinite, parseInt, parseFloat, Infinity, NaN,
  setTimeout, clearTimeout, setInterval, clearInterval
};
ctx.window = ctx;
ctx.document = {
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, createElement: () => ({ style: {}, appendChild() {}, getContext: () => null, setAttribute() {} }),
  body: { appendChild() {} }
};
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.navigator = { userAgent: 'node' };
ctx.requestAnimationFrame = () => 0;
ctx.window.addEventListener = () => {};
vm.createContext(ctx);

// 与 index.html 同序：数据层全部加载，value.js 在最后
const FILES = ['utils.js', 'skills.js', 'enemies.js', 'story.js', 'items.js', 'maps.js',
  'recipes.js', 'encounters.js', 'late.js', 'late2.js', 'late3.js', 'value.js'];
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
}

const W = ctx;
const ITEMS = W.ITEMS;
const MATS = W.MATERIALS;
const ALL = W.ALL_ITEMS;
const MAPS = W.MAPS;
const RECIPES = W.RECIPES;
const SHOP = W.SHOP_STOCK;
const CATS = W.SHOP_CATS;
const ENC = W.ENCOUNTERS;
const BT = W.BREAKTHROUGH || [];
const PETS = W.PETS;
const MATES = W.MATES;
const SKILLS = W.SKILLS;
const ENEMIES = W.ENEMY_TYPES;
const LAYERS = W.REALM_LAYERS;

const itemById = new Map(ALL.map(i => [i.id, i]));
const SKILL_BY_ID = new Map(SKILLS.map(s => [s.id, s]));

// ---------- 索引：来源与去处 ----------
const src = new Map();   // id -> Set(来源描述)
const sink = new Map();  // id -> Set(去处描述)
const add = (m, id, why) => { if (!m.has(id)) m.set(id, new Set()); m.get(id).add(why); };

for (const r of RECIPES) {
  add(sink, r.out, '炼成·' + r.name);
  for (const [mid] of r.mats) add(sink, mid, '入炉·' + r.name);
}
for (const m of MAPS) {
  for (const id of (m.mats || [])) add(src, id, '地图物产·' + m.name);
  const rw = m.reward || {};
  for (const id of (rw.items || [])) add(src, id, '通关奖励·' + m.name);
  for (const mid of (rw.mats || [])) add(src, mid[0], '通关奖励·' + m.name);
  for (const pid of (rw.pets || [])) add(src, 'pet:' + pid, '剧情所得·' + m.name);
  for (const mid of (rw.mates || [])) add(src, 'mate:' + mid, '剧情同行·' + m.name);
}
for (const s of SHOP) add(src, s.id, '坊市有售');
for (const e of ENC) {
  const rw = e.reward || {};
  for (const id of (rw.items || [])) add(src, id, '际遇·' + e.name);
  for (const mid of (rw.mats || [])) add(src, mid[0], '际遇·' + e.name);
}
for (const k in ENEMIES) {
  const t = ENEMIES[k];
  for (const mid of (t.mats || [])) add(src, mid, '妖兽掉落·' + t.name);
  if (t.eggDrop) add(src, t.eggDrop.id, '妖兽掉卵·' + t.name);
  if (t.skillDrop) add(src, t.skillDrop.id, '击杀搜身·' + t.name);
}
for (const b of BT) {
  for (const [id] of (b.items || [])) add(sink, id, '突破·' + b.realm);
  for (const [id] of (b.mats || [])) add(sink, id, '突破·' + b.realm);
}
for (const it of ALL) {
  if (it.hatch) add(src, 'pet:' + it.hatch, '孵化·' + it.name);
  if (it.grantsMate) add(src, 'mate:' + it.grantsMate, '使用·' + it.name);
}
// 炼制出来的东西，来路就是那一炉
for (const r of RECIPES) add(src, r.out, '炼成·' + r.name);

// 自身带机制 = 有去处
function hasOwnUse(it) {
  return !!(it.slot || it.teach || it.buffs || it.hatch || it.grantsMate || it.petCap || it.bottle ||
    (it.effect && Object.keys(it.effect).length));
}

const fails = [];
const notes = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

// ---------- 1. 每件成品：来源 + 去处 ----------
for (const it of ITEMS) {
  const s = src.get(it.id);
  ok(!!s, '成品「' + it.name + '」(' + it.id + ') 没有任何获取途径');
  ok(hasOwnUse(it) || sink.has(it.id),
    '成品「' + it.name + '」(' + it.id + ') 拿到手也没有任何用处（无效果、无配方、无突破门槛）');
}

// ---------- 2. 每味材料：来源 + 去处 ----------
for (const m of MATS) {
  ok(m.mat === true, '材料「' + m.name + '」(' + m.id + ') 没被标成材料（漏跑 .mat 标记）');
  ok(!!src.get(m.id), '材料「' + m.name + '」(' + m.id + ') 没有任何获取途径');
  const sinkOk = sink.has(m.id) || (m.buffs && m.buffs.length) || !!m.hatch;
  ok(sinkOk, '材料「' + m.name + '」(' + m.id + ') 入不了炉、进不了门槛，也没有服用效果');
}

// ---------- 3. 每只灵宠：拿得到 + 真能打 ----------
for (const p of PETS) {
  ok(!!src.get('pet:' + p.id), '灵宠「' + p.name + '」(' + p.id + ') 没有任何获取途径');
  ok((p.dmg || 0) > 0 && (p.rate || 0) > 0, '灵宠「' + p.name + '」(' + p.id + ') 没有出力数值');
}

// ---------- 4. 每位同伴：拿得到 + 有独有本事 ----------
for (const m of MATES) {
  ok(!!src.get('mate:' + m.id), '同伴「' + m.name + '」(' + m.id + ') 没有任何出场途径');
  ok(!!(m.perk && m.perk.stat && m.perk.amount), '同伴「' + m.name + '」(' + m.id + ') 没有独有特性，只是一组数值');
  ok((m.dmg || 0) > 0, '同伴「' + m.name + '」(' + m.id + ') 没有伤害系数');
}

// ---------- 5. 配方：产出与材料都得存在 ----------
for (const r of RECIPES) {
  ok(itemById.has(r.out), '配方「' + r.name + '」产出不存在：' + r.out);
  for (const [mid, n] of r.mats) {
    ok(itemById.has(mid), '配方「' + r.name + '」材料不存在：' + mid);
    ok(n > 0, '配方「' + r.name + '」材料数量不合法：' + mid);
  }
  ok(r.outN > 0 && r.rate > 0 && r.rate <= 1, '配方「' + r.name + '」产量或成功率不合法');
}

// ---------- 6. 突破：每一味都得拿得到 ----------
for (const b of BT) {
  for (const [id] of (b.items || [])) {
    ok(itemById.has(id), '突破 ' + b.realm + ' 所需丹药不存在：' + id);
    const it = itemById.get(id);
    // 丹药本身可以靠炼制，但配方得在
    ok(!!src.get(id) || RECIPES.some(r => r.out === id), '突破 ' + b.realm + ' 所需「' + (it ? it.name : id) + '」拿不到');
  }
  for (const [id] of (b.mats || [])) {
    ok(itemById.has(id), '突破 ' + b.realm + ' 所需材料不存在：' + id);
    ok(!!src.get(id), '突破 ' + b.realm + ' 所需材料「' + (itemById.get(id) || {}).name + '」拿不到');
  }
}

// ---------- 7. 地图：引用都要落地 ----------
const mapIds = new Set(MAPS.map(m => m.id));
for (const m of MAPS) {
  if (m.unlock) ok(mapIds.has(m.unlock), '地图「' + m.name + '」的前置不存在：' + m.unlock);
  if (m.next) ok(mapIds.has(m.next), '地图「' + m.name + '」的下一步不存在：' + m.next);
  for (const e of (m.enemies || [])) ok(!!ENEMIES[e], '地图「' + m.name + '」用了不存在的怪：' + e);
  for (const id of (m.mats || [])) ok(itemById.has(id), '地图「' + m.name + '」物产不存在：' + id);
  for (const id of (m.shop || [])) ok(itemById.has(id), '地图「' + m.name + '」货架上有不存在的货：' + id);
  const rw = m.reward || {};
  for (const id of (rw.items || [])) ok(itemById.has(id), '地图「' + m.name + '」奖励物品不存在：' + id);
  for (const mid of (rw.mats || [])) ok(itemById.has(mid[0]), '地图「' + m.name + '」奖励材料不存在：' + mid[0]);
  for (const pid of (rw.pets || [])) ok(PETS.some(p => p.id === pid), '地图「' + m.name + '」奖励灵宠不存在：' + pid);
}

// ---------- 8. 际遇 ----------
for (const e of ENC) {
  if (e.unlock) ok(mapIds.has(e.unlock), '际遇「' + e.name + '」解锁的地图不存在：' + e.unlock);
  const rw = e.reward || {};
  for (const id of (rw.items || [])) ok(itemById.has(id), '际遇「' + e.name + '」奖励物品不存在：' + id);
  for (const mid of (rw.mats || [])) ok(itemById.has(mid[0]), '际遇「' + e.name + '」奖励材料不存在：' + mid[0]);
}

// ---------- 9. 坊市：分类要有页签，货要上得了架 ----------
const catIds = new Set(CATS.map(c => c.id));
for (const s of SHOP) {
  ok(itemById.has(s.id), '货架上的「' + s.id + '」根本不存在');
  ok(catIds.has(s.cat), '货物「' + (itemById.get(s.id) || {}).name + '」挂在没有页签的分类「' + s.cat + '」下，玩家永远看不到');
}
// 秘籍这类靠坊市流通的东西，至少得在一张真坊市的货架上
const markets = MAPS.filter(m => m.shop && m.shop.length);
for (const s of SHOP.filter(x => x.cat === 'skill')) {
  ok(markets.some(m => m.shop.indexOf(s.id) >= 0), '法诀「' + (itemById.get(s.id) || {}).name + '」不在任何坊市货架上，学不到');
}

// ---------- 10. 功法：每门都得有学法 ----------
const realmGrant = new Set(LAYERS.map(l => l.skill).filter(Boolean));
for (const s of SKILLS) {
  const books = ITEMS.filter(i => i.teach === s.id);
  ok(books.length > 0 || realmGrant.has(s.id), '功法「' + s.name + '」(' + s.id + ') 没有任何学法（既无秘籍，也不在境界传授里）');
  ok(!!(s.atk || s.effect || s.type === 'passive'), '功法「' + s.name + '」没有实际效果');
}

// ---------- 11. 不许重复 ----------
const dupCheck = (arr, tag, key = 'id') => {
  const seen = new Set();
  for (const x of arr) {
    ok(!seen.has(x[key]), tag + ' 重复：' + x[key]);
    seen.add(x[key]);
  }
};
dupCheck(ALL, '道具/材料');
dupCheck(SKILLS, '功法');
dupCheck(MATES, '同伴');
dupCheck(PETS, '灵宠');
dupCheck(RECIPES, '配方');
// 同一门功法不许有两本秘籍（买第二本才发现学过）
const teachSeen = new Set();
for (const i of ITEMS) {
  if (!i.teach) continue;
  ok(!teachSeen.has(i.teach), '功法「' + i.teach + '」有两本秘籍（' + i.id + '），必有一本是废纸');
  teachSeen.add(i.teach);
}

// ---------- 12. 敌人身上不许挂着不存在的材料 ----------
for (const k in ENEMIES) {
  for (const mid of (ENEMIES[k].mats || [])) ok(itemById.has(mid), '妖兽「' + ENEMIES[k].name + '」掉不存在的材料：' + mid);
}

// ---------- 结果 ----------
const total = ALL.length;
console.log('数据条目：成品 ' + ITEMS.length + ' · 材料 ' + MATS.length + ' · 合计 ' + total);
console.log('配方 ' + RECIPES.length + ' · 功法 ' + SKILLS.length + ' · 灵宠 ' + PETS.length + ' · 同伴 ' + MATES.length +
  ' · 地图 ' + MAPS.length + ' · 际遇 ' + ENC.length + ' · 商铺货 ' + SHOP.length);

// 覆盖率面板：每一条都有来源、都有用处的比例
let srcOk = 0, sinkOk = 0;
for (const it of ALL) {
  if (src.get(it.id)) srcOk++;
  if (hasOwnUse(it) || sink.has(it.id)) sinkOk++;
}
console.log('有来源：' + srcOk + '/' + total + '　有去处：' + sinkOk + '/' + total);

if (fails.length) {
  console.log('\n✗ 失败 ' + fails.length + ' 项：');
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log('\n✓ 全部通过：表里没有只占地方的东西。');
