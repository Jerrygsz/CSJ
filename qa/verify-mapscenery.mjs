// 常驻验收：地图场景「分得开」四项指标。
// 复刻 game.js 的 skinBg() 水墨皮映射与渲染层用到的明度口径，离线统计，不启动游戏。
// 与 game.js 的 skinBg 必须保持同步（改了 game.js 的分档要回来改这里的 guiguTier()）。
//
// 指标：
//   missingBg          缺 m.bg 的地图数（P0-1 目标 0）
//   guiguDistinct      水墨皮生效底色种数（P0-2 目标 ≥5）
//   guiguAdjDiff       相邻主线图（按 next 推进）水墨皮档位差 ≥1 的占比（P0-3 目标 ≥80%）
//   jinAdjPassRate     相邻主线图 bg.base 明度差 ≥18 档 的占比（P0-3 金皮侧目标 ≥80%）
//   jinAdjZero         相邻主线图明度差 = 0 的对数（P0-3 目标 0）
//   decorTypes         装饰物类型数（P1-3 目标 ≥12，本批只统计）
//
import fs from 'fs';
import vm from 'vm';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dir = ROOT + 'js/';
const files = ['utils.js','audio.js','sprites.js','skills.js','enemies.js','story.js','items.js','maps.js','recipes.js','encounters.js','late.js','late2.js','late3.js','lingjie.js','xianjie.js'];
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN, Set, Map, Proxy };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem(){return null;}, setItem(){}, removeItem(){} };
ctx.document = { createElement(){return {getContext(){return {};}, style:{}, appendChild(){}};}, addEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];}, getElementById(){return null;}, body:{appendChild(){}, classList:{add(){}, remove(){}}} };
ctx.requestAnimationFrame = () => 0;
vm.createContext(ctx);
for (const f of files) {
  const code = fs.readFileSync(dir+f,'utf8');
  try { vm.runInContext(code, ctx, {filename:f}); } catch(e) { console.error('!! '+f+': '+e.message); }
}

const MAPS = ctx.MAPS || [];
const SC = ctx.MAP_SCENERY || {};
const byId = new Map(MAPS.map(m => [m.id, m]));
const hexY = h => { const n = parseInt(h.slice(1),16); return 0.2126*((n>>16)&255)+0.7152*((n>>8)&255)+0.0722*(n&255); };
const lum01 = h => { const n = parseInt(h.slice(1),16); return (0.299*((n>>16)&255)+0.587*((n>>8)&255)+0.114*(n&255))/255; };

// —— 复刻 game.js 的推进序墨阶（xianjie.js 批次1 注入的 m.inkBg）——
// 当前（P0-2 之前）：两档
function guiguTierCurrent(hex) {
  return lum01(hex) > 0.42 ? '#dbd5c3' : '#cbc5b3';
}
// 目标（P0-2 之后）：7 档同色系纸/墨，按主线推进序斜坡 + 轻微交替
const PALETTE = [
  '#e9e3d4','#ddd6c3','#d1c9b6','#c5bca8','#b6ac96','#a79c84','#979075'
];
function guiguTierNew(i, N) {
  const ripple = (i % 2 === 0) ? 0.5 : -0.5;
  const t = Math.max(0, Math.min(6, 0.5 + (N ? i / N : 0.5) * 5.5 + ripple));
  return PALETTE[Math.floor(t)];
}

// 主线推进顺序：从根（unlock 为空的非支线图）沿 next 走
function buildSpine() {
  const root = MAPS.find(m => !m.side && !m.unlock);
  const seq = []; const seen = new Set();
  let cur = root;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id); seq.push(cur);
    cur = cur.next ? byId.get(cur.next) : null;
  }
  return seq;
}
const spine = buildSpine();
const mainCount = MAPS.filter(m => !m.side).length;

// 1) 缺背景（回填后）
const missing = MAPS.filter(m => !m.bg || !m.bg.base);

// 2) 水墨皮生效底色种数（当前两档 / 目标推进序墨阶）
const N = Math.max(1, spine.length - 1);
const spineIdx = new Map(spine.map((m, i) => [m.id, i]));
// 支线图按篇章取色调（与 xianjie.js 同口径）
const arcOrder = []; const arcSeen = new Set();
for (const m of spine) if (m.arc && !arcSeen.has(m.arc)) { arcSeen.add(m.arc); arcOrder.push(m.arc); }
const numArc = Math.max(1, arcOrder.length - 1);
function guiguTierOfMap(m) {
  const i = spineIdx.get(m.id);
  if (i != null) return guiguTierNew(i, N);
  const ai = arcOrder.indexOf(m.arc);
  return guiguTierNew(ai < 0 ? N * 0.5 : (ai / numArc) * N, N);
}
const gCur = new Map(), gNew = new Map();
for (const m of MAPS) {
  if (!m.bg) continue;
  gCur.set(guiguTierCurrent(m.bg.base), (gCur.get(guiguTierCurrent(m.bg.base))||0)+1);
  gNew.set(guiguTierOfMap(m), (gNew.get(guiguTierOfMap(m))||0)+1);
}

// 3) 相邻主线图：水墨皮档位差 ≥1 / 金皮明度差 ≥18（金皮 bg.base 已被批次1微调）
const gAdjDiff = [], jinDiffs = [];
for (let i=1;i<spine.length;i++){
  const p = spine[i-1], q = spine[i];
  gAdjDiff.push(guiguTierOfMap(p) !== guiguTierOfMap(q) ? 1 : 0);
  jinDiffs.push(Math.abs(hexY(q.bg?.base || '#36532f') - hexY(p.bg?.base || '#36532f')));
}
const gAdjPass = gAdjDiff.filter(x=>x).length;
const jinPass = jinDiffs.filter(d=>d>=18).length;
const jinZero = jinDiffs.filter(d=>d===0).length;

// 4) 装饰类型
const decorTypes = new Set();
for (const m of MAPS) for (const d of (m.decorScheme||[])) decorTypes.add(d[0]);
const orphan = Object.keys(SC).filter(k => !MAPS.some(m=>m.id===k));

const out = {
  totalMaps: MAPS.length, mainMaps: mainCount, spineLen: spine.length,
  missingBg: missing.length,
  missingIds: missing.map(m=>m.id+(m.arc?'('+m.arc+')':'')).join(', ')||'无',
  guiguDistinctCurrent: gCur.size, guiguDistinctNew: gNew.size,
  guiguTiersNew: [...gNew.entries()].map(([k,v])=>k+'×'+v).join(', '),
  guiguAdjPairs: gAdjDiff.length, guiguAdjDiffRate: (gAdjDiff.length?(gAdjPass/gAdjDiff.length*100).toFixed(1):0)+'%',
  jinAdjPairs: jinDiffs.length, jinAdjPassRate: (jinDiffs.length?(jinPass/jinDiffs.length*100).toFixed(1):0)+'%',
  jinAdjZero: jinZero,
  decorTypes: decorTypes.size, decorTypeList: [...decorTypes].join(', '),
  orphanScenery: orphan.length, orphanIds: orphan.join(', ')||'无'
};
console.log(JSON.stringify(out, null, 2));

// 列出相邻差过小的对，方便定位
const bad = [];
for (let i=1;i<spine.length;i++){
  const d = jinDiffs[i-1];
  if (d < 18) bad.push(`${spine[i-1].id}→${spine[i].id} (Δ${d.toFixed(0)})`);
}
if (bad.length) console.log('\n金皮相邻差 <18 的对：\n  ' + bad.join('\n  '));
const gbad = [];
for (let i=1;i<spine.length;i++){
  if (!gAdjDiff[i-1]) gbad.push(`${spine[i-1].id}→${spine[i].id}`);
}
if (gbad.length) console.log('\n水墨皮相邻同档的对：\n  ' + gbad.join('\n  '));

// ---- 目标判定（第110轮补）----
// 本脚本一直只打印不判定，于是「有目标却不达标」也能一路绿灯跑过八批。
// 这里把脚本头注释里写下的目标逐条算成达标 / 未达标，只报数、不改退出码
// （度量脚本不阻断回归；哪条长期不达标，应单独拍板改判据或改实现，不能靠沉默放行）。
const pct = (s) => parseFloat(String(s));
const TARGETS = [
  ['missingBg',        out.missingBg === 0,                       '缺 m.bg 的地图数 = 0'],
  ['guiguDistinct',    out.guiguDistinctNew >= 5,                 '水墨皮生效底色种数 ≥ 5'],
  ['guiguAdjDiff',     pct(out.guiguAdjDiffRate) >= 80,           '水墨皮相邻档位差 ≥1 的占比 ≥ 80%'],
  ['jinAdjZero',       out.jinAdjZero === 0,                      '金皮相邻明度差 = 0 的对数 = 0'],
  ['jinAdjPass',       pct(out.jinAdjPassRate) >= 80,             '金皮相邻明度差 ≥18 的占比 ≥ 80%（P0-3 原目标）'],
  ['decorTypes',       out.decorTypes >= 12,                      '装饰物类型数 ≥ 12（P1-3 目标）'],
];
const miss = [];
for (const [k, pass, desc] of TARGETS) {
  const val = out[k] !== undefined ? out[k] : ({ guiguDistinct: out.guiguDistinctNew, guiguAdjDiff: out.guiguAdjDiffRate, jinAdjPass: out.jinAdjPassRate }[k]);
  console.log((pass ? '  达标   ' : '  未达标 ') + desc + ' → ' + val);
  if (!pass) miss.push(k + '=' + val);
}
console.log(miss.length
  ? '\n未达标 ' + miss.length + ' 项：' + miss.join(' ／ ') + '（判据见脚本头注释，需单独拍板）'
  : '\n目标全部达标');
