// 常驻验收：地图场景「分得开」指标（度量脚本，只报数、不改退出码）。
//
// ★ 第113轮改造原则：闸门只读实现跑出来的数据，不复刻实现。
//   上一版这里自带一份「目标算法」guiguTierNew(i,N) 自己算墨阶，于是它报 98% 达标，
//   而真实的 m.inkBg 里仙界篇 34 张（linghuan…feiyu）全是同一个 #c5bca8 ——
//   尺子量的是设想，不是画面。现在一律读 js/xianjie.js 补丁实际写进 MAPS 的字段。
//
// ★ 另一条：判据要量玩家看得见的层。
//   bg.base 在 sc3 上线后已被 m.inkBg 取代（buildGrass / 整屏填充都优先取 inkBg），
//   实测 bg.base 明度差 15.7 时屏幕平均亮度只差 0.77，等于不显示；它只在
//   23 张无 inkBg 的支线图上才落到地面纹理里。装饰物同理：decorScheme 只有
//   tree/rock/tuft 三种粗分类，玩家看到的来自 MAP_CODEX[id].decor（12 种）。
//
// 指标：
//   spineGap       主线图不在推进链上的张数（目标 0；非 0 说明 next 链断，会整段同档）
//   missingBg      缺 m.bg 的地图数（目标 0）
//   inkDistinct    真实 m.inkBg.base 种数（目标 ≥5）
//   inkAdjDiff     相邻主线图 inkBg 不同的占比（目标 ≥80%）
//   inkAdjSame     相邻主线图 inkBg 完全相同的对数（目标 0）
//   jinAdjPassRate 相邻主线图 bg.base 明度差 ≥18 的占比（目标 ≥80%，P0-3 原目标）
//   jinAdjZero     相邻主线图 bg.base 明度差 = 0 的对数（目标 0）
//   decorTypes     装饰物类型数（目标 ≥12，量 MAP_CODEX 而非废弃的 decorScheme）
// 参考数据（不判定）：legDecorTypes / bgDeltaNoInk
//
import fs from 'fs';
import vm from 'vm';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dir = ROOT + 'js/';
const files = ['utils.js','audio.js','sprites.js','skills.js','enemies.js','story.js','items.js','maps.js','recipes.js','encounters.js','late.js','late2.js','late3.js','lingjie.js','xianjie.js','mapCodex.js'];
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
const CDX = ctx.MAP_CODEX || {};
const SC = ctx.MAP_SCENERY || {};
const byId = new Map(MAPS.map(m => [m.id, m]));
const hexY = h => { const n = parseInt(h.slice(1),16); return 0.2126*((n>>16)&255)+0.7152*((n>>8)&255)+0.0722*(n&255); };

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
const inSpine = new Set(spine.map(m => m.id));
const spineGapIds = MAPS.filter(m => !m.side && !inSpine.has(m.id));

// 0) 链完整性哨兵：非 0 说明 next 链断了，实现侧会把漏网图当支线取同一墨档
const spineGap = spineGapIds.length;

// 1) 缺背景
const missing = MAPS.filter(m => !m.bg || !m.bg.base);

// 2) 真实墨阶（读实现写进 MAPS 的 m.inkBg，不自己算）
const inkOf = m => (m.inkBg && m.inkBg.base) || null;
const inkTally = new Map();
for (const m of MAPS) { const k = inkOf(m); if (k) inkTally.set(k, (inkTally.get(k)||0)+1); }

// 3) 相邻主线图：inkBg 相同/不同 · bg.base 明度差
const inkAdjDiff = [], inkAdjSameIds = [], jinDiffs = [];
for (let i = 1; i < spine.length; i++) {
  const p = spine[i-1], q = spine[i];
  const a = inkOf(p), b = inkOf(q);
  const same = !!(a && b && a === b);
  inkAdjDiff.push(same ? 0 : 1);
  if (same) inkAdjSameIds.push(p.id + '→' + q.id + ' (' + a + ')');
  jinDiffs.push(Math.abs(hexY(q.bg?.base || '#36532f') - hexY(p.bg?.base || '#36532f')));
}
const inkAdjPairs = inkAdjDiff.length;
const inkAdjPass = inkAdjDiff.filter(x => x).length;
const jinPass = jinDiffs.filter(d => d >= 18).length;
const jinZero = jinDiffs.filter(d => d === 0).length;

// 4) 装饰类型：主路径读 MAP_CODEX[id].decor；decorScheme 是 sc3 之前的粗分类，已不进主路径
const decorTypes = new Set();
for (const id in CDX) for (const d of (CDX[id].decor || [])) decorTypes.add(d[0]);
const legDecorTypes = new Set();
for (const m of MAPS) for (const d of (m.decorScheme || [])) legDecorTypes.add(d[0]);
// 无 inkBg 的图仍靠 bg.base 铺地面纹理，单独报一下它们的明度跨度作参考
const noInk = MAPS.filter(m => !inkOf(m) && m.bg && m.bg.base);
const noInkSpan = noInk.length
  ? (() => { const ys = noInk.map(m => hexY(m.bg.base)); return (Math.max(...ys) - Math.min(...ys)).toFixed(1); })()
  : '0';

const orphan = Object.keys(SC).filter(k => !MAPS.some(m => m.id === k));

const pct = (a, b) => (b ? (a/b*100).toFixed(1) : '0') + '%';
const out = {
  totalMaps: MAPS.length, mainMaps: mainCount, spineLen: spine.length,
  spineGap,
  spineGapIds: spineGapIds.map(m => m.id + (m.arc ? '(' + m.arc + ')' : '')).join(', ') || '无',
  missingBg: missing.length,
  missingIds: missing.map(m => m.id + (m.arc ? '(' + m.arc + ')' : '')).join(', ') || '无',
  inkDistinct: inkTally.size,
  inkTiers: [...inkTally.entries()].sort((a,b)=>hexY(a[0])-hexY(b[0])).map(([k,v]) => k + '×' + v).join(', '),
  inkAdjPairs, inkAdjDiffRate: pct(inkAdjPass, inkAdjPairs), inkAdjSame: inkAdjSameIds.length,
  jinAdjPairs: jinDiffs.length, jinAdjPassRate: pct(jinPass, jinDiffs.length), jinAdjZero: jinZero,
  decorTypes: decorTypes.size, decorTypeList: [...decorTypes].sort().join(', '),
  legDecorTypes: legDecorTypes.size,
  noInkMaps: noInk.length, noInkBgSpan: noInkSpan,
  orphanScenery: orphan.length, orphanIds: orphan.join(', ') || '无'
};
console.log(JSON.stringify(out, null, 2));

// 列出问题对，方便定位
if (inkAdjSameIds.length) console.log('\n相邻 inkBg 完全相同的对（换图看不出区别）：\n  ' + inkAdjSameIds.join('\n  '));
const bad = [];
for (let i = 1; i < spine.length; i++) if (jinDiffs[i-1] < 18) bad.push(`${spine[i-1].id}→${spine[i].id} (Δ${jinDiffs[i-1].toFixed(0)})`);
if (bad.length) console.log('\n金皮 bg.base 相邻差 <18 的对：\n  ' + bad.join('\n  '));

// ---- 目标判定 ----
// 度量脚本只报数、不改退出码；哪条长期不达标，应单独拍板改判据或改实现，不能靠沉默放行。
const TARGETS = [
  ['spineGap',      out.spineGap === 0,                    '主线图全部落在推进链上（链断会导致整段同档）'],
  ['missingBg',     out.missingBg === 0,                   '缺 m.bg 的地图数 = 0'],
  ['inkDistinct',   out.inkDistinct >= 5,                  '真实墨阶种数 ≥ 5'],
  ['inkAdjDiff',    parseFloat(out.inkAdjDiffRate) >= 80,  '相邻主线图 inkBg 不同的占比 ≥ 80%'],
  ['inkAdjSame',    out.inkAdjSame === 0,                  '相邻主线图 inkBg 完全相同的对数 = 0'],
  ['jinAdjZero',    out.jinAdjZero === 0,                  '金皮相邻 bg.base 明度差 = 0 的对数 = 0'],
  ['jinAdjPass',    parseFloat(out.jinAdjPassRate) >= 80,  '金皮相邻 bg.base 明度差 ≥18 的占比 ≥ 80%（P0-3 原目标）'],
  ['decorTypes',    out.decorTypes >= 12,                  'codex 装饰物类型数 ≥ 12（P1-3 目标）'],
];
const miss = [];
for (const [k, pass, desc] of TARGETS) {
  const val = { spineGap: out.spineGap, missingBg: out.missingBg, inkDistinct: out.inkDistinct,
    inkAdjDiff: out.inkAdjDiffRate, inkAdjSame: out.inkAdjSame, jinAdjZero: out.jinAdjZero,
    jinAdjPass: out.jinAdjPassRate, decorTypes: out.decorTypes }[k];
  console.log((pass ? '  达标   ' : '  未达标 ') + desc + ' → ' + val);
  if (!pass) miss.push(k + '=' + val);
}
console.log(miss.length
  ? '\n失败：未达标 ' + miss.length + ' 项：' + miss.join(' ／ ')
  : '\n全绿：' + TARGETS.length + ' 项目标全部达标');

// 第113轮起本脚本从 metric 升级为 gate：八项全绿才放行。
// 之前只报数不改退出码，结果「仙界 34 张同色」这种真问题连续三轮被沉默放行。
if (miss.length) process.exitCode = 1;
