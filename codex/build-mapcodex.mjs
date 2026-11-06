// 从 mapCodex.json（唯一真源）生成两份产物：
//   ① 人读：地图原著考据台账.md
//   ② 机读：fanren/js/mapCodex.js（window.MAP_CODEX，供 game.js 逐图渲染消费）
// 校验不过直接退出非零，不产出半成品。
import fs from 'fs';

const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（唯一真源 + 原著索引）
const REPO = CODEX + '../';                                    // fanren/
const ROOT = CODEX + '../../';                                 // 工作区根（报告等）
const SRC = CODEX + 'mapCodex.json';
const MD = REPO + 'docs/地图原著考据台账.md';
const JS = REPO + 'js/mapCodex.js';

const DECOR = new Set(['tree','rock','tuft','bamboo','pine','moss','puddle','mist','ruin','lantern','banner','bone']);
const MARKS = new Set(['gate','stele','well','bones','stair','banner','lantern']);
const TERRAIN = new Set(['water','stair','cloud','cliff']);
const SOURCES = new Set(['原著原文','游戏增补','混合']);
// 构图化：主景专属形状（sc3Bake 的 big 画布）与水墨章法
const FOCUS_CASES = new Set(['narrowgate','pool','stonehut','temple','stonering','grove','minehead','shed',
  // 批次4 第二批（第103轮）：乱星海与地火之屋新增的 3 个原著专属形状
  'furnace','ship','reef',
  // 批次4 第三批（第104轮）：虚天殿～回归天南新增的 6 个原著专属形状
  'floatingpalace','bamboostand','deadsea','stoneroom','stormpeak','clanhall',
  // 批次4 第四批（第105轮）：坠魔谷～五龙海飞升新增的 7 个原著专属形状
  'battleline','desertruin','grasscamp','pagoda','icewall','thunderhead','featherfall']);
const LAYOUTS = new Set(['axis','diagonal','corner','ring','void','frame','band']);
const SIGNATURES = new Set(['bubblingPool','bloodOverhead']);

const doc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const maps = doc.maps;
const errs = [];
const seen = new Set();
for (const m of maps) {
  const p = m.id + ': ';
  if (seen.has(m.id)) errs.push(p + 'id 重复'); seen.add(m.id);
  if (!SOURCES.has(m.source)) errs.push(p + '非法 source ' + m.source);
  if (!Array.isArray(m.refs) || !m.refs.length) errs.push(p + '缺 refs');
  if (!m.canon || m.canon.length < 40) errs.push(p + 'canon 过短');
  if (!m.quotes || !m.quotes.length) errs.push(p + '缺原文摘引');
  for (const q of m.quotes) if (!q.ref || !q.text) errs.push(p + '摘引字段不全');
  for (const k of ['terrain','sky','architecture','flora','ground','atmosphere'])
    if (!m.scene || !m.scene[k]) errs.push(p + 'scene 缺字段 ' + k);
  if (!(m.inkTone >= 1 && m.inkTone <= 7)) errs.push(p + 'inkTone 越界');
  if (!(m.tone >= 0.7 && m.tone <= 1.2)) errs.push(p + 'tone 越界');
  if (!Array.isArray(m.decor) || m.decor.length < 3) errs.push(p + 'decor 少于 3 种');
  else {
    const sum = m.decor.reduce((s, d) => s + d[1], 0);
    if (Math.abs(sum - 1) > 0.001) errs.push(p + 'decor 权重和 = ' + sum.toFixed(3) + '（应为 1.000）');
    for (const [k, w] of m.decor) {
      if (!DECOR.has(k)) errs.push(p + '未知 decor 类型 ' + k);
      if (!(w > 0 && w <= 1)) errs.push(p + 'decor 权重越界 ' + k);
    }
  }
  if (!Array.isArray(m.landmarks) || m.landmarks.length < 1 || m.landmarks.length > 3)
    errs.push(p + '地标数不在 1~3');
  else for (const l of m.landmarks) {
    if (!MARKS.has(l.kind)) errs.push(p + '未知地标 case ' + l.kind);
    if (!l.name) errs.push(p + '地标缺 name');
  }
  if (!Array.isArray(m.terrain) || !m.terrain.length) errs.push(p + '缺 terrain');
  else for (const t of m.terrain) if (!TERRAIN.has(t)) errs.push(p + '未知 terrain 类型 ' + t);
  if (!m.art) errs.push(p + '缺 art（理想专属形状）');
  const c = m.composition;
  if (!c) { errs.push(p + '缺 composition（逐图原著构图）'); }
  else {
    if (!c.focus || c.focus.length < 8) errs.push(p + 'composition.focus 过短');
    if (!FOCUS_CASES.has(c.focusCase)) errs.push(p + '未知主景形状 ' + c.focusCase);
    if (!LAYOUTS.has(c.layout)) errs.push(p + '未知章法 ' + c.layout);
    if (!(Number.isInteger(c.breath) && c.breath >= 1 && c.breath <= 3)) errs.push(p + 'breath 不在 1~3');
    if (!(Number.isInteger(c.clusters) && c.clusters >= 1 && c.clusters <= 3)) errs.push(p + 'clusters 不在 1~3');
    if (!Array.isArray(c.palette) || c.palette.length < 1 || c.palette.length > 3) errs.push(p + 'palette 应 1~3 种');
    else for (const k of c.palette) {
      if (!DECOR.has(k)) errs.push(p + 'palette 未知类型 ' + k);
      if (!m.decor.some(d => d[0] === k)) errs.push(p + 'palette 类型 ' + k + ' 不在本图 decor 里');
    }
    if (!(c.focusScale >= 1.2 && c.focusScale <= 2.2)) errs.push(p + 'focusScale 越界');
  }
  // 第102轮：mood 是可选字段，只给「需要单独调幽暗」的图用；有就必须四项数值齐全 + 原著依据 + 灰阶纪律
  if (m.mood) {
    const mo = m.mood;
    for (const k of ['gloom','vignette','haze','focusInk'])
      if (!(typeof mo[k] === 'number' && isFinite(mo[k]))) errs.push(p + 'mood.' + k + ' 非数值');
    if (!(mo.gloom >= 0 && mo.gloom <= 0.4)) errs.push(p + 'mood.gloom 越界 0~0.4');
    if (!(mo.vignette >= 0 && mo.vignette <= 1)) errs.push(p + 'mood.vignette 越界 0~1');
    if (!(mo.haze >= 0 && mo.haze <= 1)) errs.push(p + 'mood.haze 越界 0~1');
    if (!(mo.focusInk >= 0.6 && mo.focusInk <= 1)) errs.push(p + 'mood.focusInk 越界 0.6~1');
    if (!mo.basis || !mo.note) errs.push(p + 'mood 缺 basis / note（原著依据与灰阶纪律）');
    if (mo.signature && !SIGNATURES.has(mo.signature)) errs.push(p + 'mood.signature 未知 ' + mo.signature);
  }
  if (!(Number.isInteger(m.batch) && m.batch >= 1 && m.batch <= 12)) errs.push(p + '缺 batch 或取值非法（正整数 1~12；批次归属是真源字段，不许留空）');
  if (typeof m.hasInkBg !== 'boolean') errs.push(p + '缺 hasInkBg（纸性分组真源字段）');
}
// 风格基线（Jerry 2026-11-05 定调）：标杆样片 + 纸性 + 量化参数必须齐，否则不许出图
const STYLE = doc.meta && doc.meta.style;
if (!STYLE) errs.push('meta: 缺 style（风格基线）');
else {
  if (!STYLE.benchmark || !STYLE.benchmarkMap) errs.push('meta.style: 缺标杆样片');
  if (!maps.some(m => m.id === STYLE.benchmarkMap)) errs.push('meta.style: 标杆图不在本批里');
  if (!Array.isArray(STYLE.principles) || STYLE.principles.length < 6) errs.push('meta.style.principles 少于 6 条');
  const pp = STYLE.paper || {};
  for (const k of ['base', 'a', 'b'])
    if (!/^#[0-9a-fA-F]{6}$/.test(pp[k] || '')) errs.push('meta.style.paper.' + k + ' 非法色值');
  if (!STYLE.quant || !(STYLE.quant.decorMax > 0)) errs.push('meta.style.quant 缺字段');
  if (!STYLE.conformance || !STYLE.conformance.native || !STYLE.conformance.patched)
    errs.push('meta.style.conformance 缺分组');
  // 第104轮：meta 里的散文数字曾经停留在上一批（29 张 / 19+10 / 142 张），
  // 这里统一改成动态校验——再追加一批时不更新真源文案会直接校验失败，不许出半成品。
  const nNative = maps.filter(m => m.hasInkBg).length;
  const nPatched = maps.filter(m => !m.hasInkBg).length;
  if (!String(pp.scope || '').includes(nNative + ' 张有 inkBg') ||
      !String(pp.scope || '').includes(nPatched + ' 张无 inkBg'))
    errs.push('meta.style.paper.scope 的纸性分组数字与真源不符（应为 ' + nNative + ' / ' + nPatched + '）');
  const pPaper = (STYLE.principles || []).find(x => x.startsWith('纸性统一'));
  if (!pPaper || !pPaper.includes(maps.length + ' 张'))
    errs.push('meta.style.principles 的收录图数与真源不符（应为 ' + maps.length + ' 张）');
  if (STYLE.quant && STYLE.quant.focusKinds !== FOCUS_CASES.size)
    errs.push('meta.style.quant.focusKinds 与 FOCUS_CASES 不一致（应为 ' + FOCUS_CASES.size + '）');
  if (STYLE.quant && STYLE.quant.layouts !== LAYOUTS.size)
    errs.push('meta.style.quant.layouts 与 LAYOUTS 不一致（应为 ' + LAYOUTS.size + '）');
  const C = doc.meta.counts || {};
  for (const [k, v] of Object.entries({
    maps: maps.length,
    batch1: maps.filter(m => m.batch === 1).length,
    batch2: maps.filter(m => m.batch === 2).length,
    batch3: maps.filter(m => m.batch === 3).length,
    batch4: maps.filter(m => m.batch === 4).length,
    batch5: maps.filter(m => m.batch === 5).length,
    batch6: maps.filter(m => m.batch === 6).length,
    batch7: maps.filter(m => m.batch === 7).length,
    batch8: maps.filter(m => m.batch === 8).length,
    withDiff: maps.filter(m => m.diff && m.diff.length).length
  })) if (C[k] !== v) errs.push('meta.counts.' + k + ' 与真源不符（应为 ' + v + '）');
}
if (!doc.meta.stage5) errs.push('meta: 缺 stage5（UI 柔化 / 逐图幽暗落地口径）');
if (!doc.meta.stage6) errs.push('meta: 缺 stage6（第二批考据与视觉边界收口口径）');
if (!doc.meta.stage7) errs.push('meta: 缺 stage7（第三批考据口径）');
if (!doc.meta.stage8) errs.push('meta: 缺 stage8（第四批人界篇收官口径）');
// 第105轮追加：把「当前状态」类散文数字也纳入动态校验，追加下一批忘改文案会直接失败。
const TOTAL_MAPS = 171;
const offNow = TOTAL_MAPS - maps.length;
const nMood = maps.filter(m => m.mood).length;
if (!String(doc.meta.stage2?.untracked || '').includes('未收录的 ' + offNow + ' 张图'))
  errs.push('meta.stage2.untracked 的未收录数与真源不符（应为 ' + offNow + ' 张）');
if (STYLE && STYLE.conformance && !String(STYLE.conformance.outOfScope || '').includes('未收录 ' + offNow + ' 张'))
  errs.push('meta.style.conformance.outOfScope 的未收录数与真源不符（应为 ' + offNow + ' 张）');
if (!String(doc.meta.stage5?.discipline || '').includes('其余 ' + (maps.length - nMood) + ' 张无 mood'))
  errs.push('meta.stage5.discipline 的无 mood 图数与真源不符（应为 ' + (maps.length - nMood) + ' 张）');
// 纸性分组必须与真源逐图字段一致，不能再靠手写名单
const nativeIds = maps.filter(m => m.hasInkBg).map(m => m.id).join(' / ');
const patchedIds = maps.filter(m => !m.hasInkBg).map(m => m.id).join(' / ');
if (STYLE && STYLE.conformance) {
  if (!STYLE.conformance.native.startsWith(nativeIds)) errs.push('meta.style.conformance.native 与真源 hasInkBg 不一致');
  if (!STYLE.conformance.patched.startsWith(patchedIds)) errs.push('meta.style.conformance.patched 与真源 hasInkBg 不一致');
}
// —— 引用自洽闸门（第108轮新增）——
// 起因：refOf 早期把「数组下标」当成「第X章」写入 refs / quotes[].ref，
// 全库 119 处章号偏移 5~8 章，而当时的强校验照样 0 错误放行。
// 现在要求：凡写进台账的「第X章《标题》」必须与 novel-index 自洽（卷内同标题多解按就近匹配）。
const IDXP = CODEX + 'novel-index.json';
let refChecked = 0;
if (fs.existsSync(IDXP)) {
  const idxRaw = JSON.parse(fs.readFileSync(IDXP, 'utf8'));
  const renChapters = idxRaw.ren.chapters;
  const xianChapters = idxRaw.xian.chapters;
  const byTitleRen = new Map();
  for (const c of renChapters) { if (!byTitleRen.has(c.title)) byTitleRen.set(c.title, []); byTitleRen.get(c.title).push(c); }
  const byTitleXian = new Map();
  for (const c of xianChapters) { if (!byTitleXian.has(c.title)) byTitleXian.set(c.title, []); byTitleXian.get(c.title).push(c); }
  const DIG = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const c2n = (s) => {
    let t = 0, c = 0;
    for (const ch of String(s)) {
      if (DIG[ch] !== undefined) c = DIG[ch];
      else if (ch === '十') { c = (c || 1) * 10; t += c; c = 0; }
      else if (ch === '百') { c = (c || 1) * 100; t += c; c = 0; }
      else if (ch === '千') { c = (c || 1) * 1000; t += c; c = 0; }
      else if (ch === '万') { t = (t + c) * 10000; c = 0; }
    }
    return t + c;
  };
  const numOf = (l) => c2n(String(l).replace(/^第/, '').replace(/章$/, ''));
  const checkRef = (p, slot, ref) => {
    const mm = String(ref || '').match(/^(.*?)第([一二三四五六七八九十百千零两]+)章(?:《(.+?)》)?/);
    if (!mm || !mm[3]) return; // 无章号或无标题（文档引用）→ 不归本闸门管
    refChecked++;
    const prefix = mm[1], written = c2n(mm[2]), title = mm[3];
    const useXian = prefix.includes('仙界篇');
    const byTitle = useXian ? byTitleXian : byTitleRen;
    const chapters = useXian ? xianChapters : renChapters;
    const cands = byTitle.get(title);
    if (!cands) {
      const lm = String(ref).match(/L(\d+)/);
      if (lm) {
        const line = parseInt(lm[1], 10);
        const hit = chapters.find(c => line >= c.start && line <= c.end);
        errs.push(p + slot + ' 章标题《' + title + '》全库查无' + (hit ? '，行号所指实为《' + hit.title + '》' : ''));
      }
      return;
    }
    const scored = cands
      .map(c => ({ c, n: numOf(c.label), d: Math.abs(numOf(c.label) - written), sameVol: prefix.includes(c.vol) }))
      .sort((a, b) => (a.sameVol !== b.sameVol ? (a.sameVol ? -1 : 1) : a.d - b.d));
    if (scored[0].d !== 0)
      errs.push(p + slot + ' 章号 ' + written + ' 与《' + title + '》实际第 ' + scored[0].n + ' 章不符');
  };
  for (const m of maps) {
    const p = m.id + ': ';
    m.refs.forEach((r, i) => checkRef(p, 'refs[' + i + ']', r));
    (m.quotes || []).forEach((q, i) => checkRef(p, 'quotes[' + i + '].ref', q.ref));
  }
}
if (errs.length) {
  console.error('校验失败 ' + errs.length + ' 项：');
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}

// ---------- 机读产物 ----------
const slim = {};
for (const m of maps) slim[m.id] = {
  decor: m.decor,
  marks: [...new Set(m.landmarks.map(l => l.kind))],
  landmarks: m.landmarks,
  terrain: m.terrain,
  tone: m.tone,
  composition: m.composition,
  batch: m.batch,
  hasInkBg: m.hasInkBg,
  ...(m.mood ? { mood: m.mood } : {})
};
const styleSlim = {
  name: STYLE.name, benchmark: STYLE.benchmark, benchmarkMap: STYLE.benchmarkMap,
  paper: STYLE.paper, quant: STYLE.quant, conformance: STYLE.conformance,
  principles: STYLE.principles.length
};
const n1 = maps.filter(m => m.batch === 1).length;
const n2 = maps.filter(m => m.batch === 2).length;
const n3 = maps.filter(m => m.batch === 3).length;
const n4 = maps.filter(m => m.batch === 4).length;
const n5 = maps.filter(m => m.batch === 5).length;
const n6 = maps.filter(m => m.batch === 6).length;
const n7 = maps.filter(m => m.batch === 7).length;
const n8 = maps.filter(m => m.batch === 8).length;
const jsBody = '// 自动生成，请勿手改。唯一真源：../../mapCodex.json\n' +
  '// 生成器：codex/build-mapcodex.mjs ｜ 批次8 共 ' + maps.length + ' 张（首批 ' + n1 + ' + 第二批 ' + n2 + ' + 第三批 ' + n3 + ' + 第四批 ' + n4 + ' + 第五批 ' + n5 + ' + 第六批 ' + n6 + ' + 第七批 ' + n7 + ' + 第八批 ' + n8 + '，人界篇 + 灵界篇 + 仙界篇收官）\n' +
  '// 只含渲染所需字段（含逐图 composition 构图章法）；考据正文 / 原文摘引 / 差异标注见《地图原著考据台账.md》。\n' +
  '// 风格基线：Jerry 定调，标杆 ' + STYLE.benchmark + '；后续每批沿用，不按 arc 分组。\n' +
  'window.MAP_CODEX_STYLE = ' + JSON.stringify(styleSlim, null, 2) + ';\n' +
  '\n' +
  'window.MAP_CODEX = ' + JSON.stringify(slim, null, 2) + ';\n';
fs.writeFileSync(JS, jsBody, 'utf8');

// ---------- 人读产物 ----------
const bySource = {};
for (const m of maps) bySource[m.source] = (bySource[m.source] || 0) + 1;
const diffMaps = maps.filter(m => m.diff && m.diff.length);
const markTotal = maps.reduce((s, m) => s + m.landmarks.length, 0);
const quoteTotal = maps.reduce((s, m) => s + m.quotes.length, 0);
const shortRef = r => r.replace(/^仙界篇\s*/, '').replace(/^人界篇\s*/, '').replace(/^第[一二三四五六七八九十百千两零〇0-9]+卷\s*/, '');
const esc = s => String(s).replace(/\|/g, '\\|');

const L = [];
L.push('# 《凡人·长生劫》地图原著考据台账 · 全八批（首批 + 第二～第八批）');
L.push('');
L.push('> 范围：' + doc.meta.scope);
L.push('> 依据：' + doc.meta.novelSources.map(s => s.split('（')[0].split('/').pop()).join('、') + '（两篇全文，UTF-8）');
L.push('> 方法：' + doc.meta.method);
L.push('> 真源：`mapCodex.json` ｜ 生成：`codex/build-mapcodex.mjs` ｜ 索引：`codex/novel-index.mjs`');
L.push('> 参照：' + doc.meta.reference);
L.push('');
L.push('---');
L.push('');
L.push('## 一、为什么先做台账');
L.push('');
L.push('批次3 用 `SC3_ARC2BIOME` 把 `arc` 机械映射到 6 组 biome：`luoyun`（落云宗·云梦山，山门药园）与 `bianhai`（天南外海·无边海）同属 `arc F` 共用一套装饰；`jiayuan`（嘉元城墨府，宅院）与 `xuese`（血色禁地，秘境）同属 `arc B` 共用一套竹林松树。这不叫按原著编写。');
L.push('');
L.push('本台账按篇章**逐批逐图回查原文**（当前 ' + maps.length + ' 张，剩余 ' + (171 - maps.length) + ' 张不铺开），先把「这地方在原著里长什么样」写清楚，再把外观要素翻译成渲染参数。**JSON 是唯一真源**：人读的这份 MD 与游戏侧 `fanren/js/mapCodex.js` 都由它生成，不存在两份手工维护、互相打架的配置。第二批证据留档在 `codex/batch2-evidence.md` / `batch2-chapters.md`；第三批证据链是 `batch3-evidence.md`（专名定位）→ `batch3-chapters.md`（按卷剔除后期同名章后精读 87 章）→ `batch3-scenes.md`（景物原句摘引池）；第四批证据链是 `batch4-evidence.md` + `batch4-pin.md`（专名定位并分列越界命中）→ `batch4-chapters.md`（按卷核定 97 章精读）→ `batch4-scenes.md`（297 条景物原句）→ `batch4-facts.md`（游戏文案量化/事件断言逐条核实）。第五批证据链是 `batch5-evidence.md`（专名定位并显式分列灵界篇内/越界命中）→ `batch5-chapters.md`（按卷核定 97 章精读，0 超界）→ `batch5-scenes.md`（1286 行景物原句）→ `batch5-facts.mjs`（游戏文案断言逐条核实）。');
L.push('');
L.push('### 依据类型');
L.push('');
L.push('| 类型 | 含义 | 本批数量 |');
L.push('|---|---|---|');
L.push('| 原著原文 | 地名、事件、景物均可回查到具体卷章与原文 | ' + (bySource['原著原文'] || 0) + ' |');
L.push('| 游戏增补 | 原著无此专名，但有对应人物 / 事件 / 动线可挂靠 | ' + (bySource['游戏增补'] || 0) + ' |');
L.push('| 混合 | 核心物事有原文依据，节点名或局部分区为增补 | ' + (bySource['混合'] || 0) + ' |');
L.push('');
L.push('### 硬约束');
L.push('');
for (const d of doc.meta.discipline) L.push('- ' + d);
L.push('');
L.push('### 字段说明');
L.push('');
L.push('| 字段 | 用途 |');
L.push('|---|---|');
L.push('| `id / order / arc / name / pos / type / side` | 从游戏 `window.MAPS` 直取，不改写 |');
L.push('| `source / refs / canon / quotes` | 依据类型、卷章行号出处、核心描述摘记、原文短引 |');
L.push('| `scene` | 外观六要素：地形 / 天象 / 建筑 / 植被 / 地面 / 氛围 |');
L.push('| `inkTone` | 1–7 档墨阶建议，仅作美术参考，本批**不落地** |');
L.push('| `decor / landmarks / terrain / tone` | 逐图渲染参数，直接驱动 `ensureScenery3()` |');
L.push('| `art` | 理想专属形状描述，本轮已落地为 `composition.focusCase` |');
L.push('| `composition` | 逐图构图：主景景物 / 主景形状 / 章法 / 留白等级 / 聚落数 / 收窄后的装饰 / 主景倍率 |');
L.push('| `mood` | 可选。逐图幽暗：整纸积墨 / 四角墨晕 / 雾带 / 主景浓墨倍率，附原著依据与灰阶纪律；`signature` 为第103轮追加的原著专属笔法（冒泡水坑 / 压顶血光）；本批仅 2 图 |');
L.push('| `batch` / `hasInkBg` | 批次归属与纸性分组真源字段；生成器据此动态算「原生浅纸 / 补铺宣纸」，不再手写名单 |');
L.push('| `diff` | 与原著（及与差异核对报告）的偏差，只标注不改数据 |');
L.push('');
L.push('### 构图章法（本轮落地）');
L.push('');
L.push('阶段二只把考据翻译成「装饰种类 + 墨色浓淡」，首批 18 张图仍共用同一套逐格均匀随机撒点：实拍显示装饰铺满全屏、原著主景被埋、方形实心笔触像散落图标。本轮把每图 `art` 里早已写好的**原著理想画面**结构化成 `composition`，按水墨章法重排：');
L.push('');
L.push('| 项 | 口径 |');
L.push('|---|---|');
L.push('| `focus` / `focusCase` | 全图只立 **1 个主景**，取自原著景物（`art` / `canon`），用专属形状画在 big 画布，不新编设定 |');
L.push('| `layout` | 7 种章法：`axis` 中轴、`diagonal` 斜势、`corner` 压角、`ring` 环抱、`void` 空灵、`frame` 夹景、`band` 横带；决定主景构图位与贴地块摆法 |');
L.push('| `breath` | 留白等级 1~3，越大装饰越稀。`tainan`（高山雾）、`mishi`（密闭石屋）、`xuechi`（听不见虫叫）取 3 |');
L.push('| `palette` | 装饰种类从 6 种收窄到 1~3 种，且必须已在本图 `decor` 里；组内同种成丛，不混搭 |');
L.push('| `clusters` | 聚落数 1~3。聚落由低频连续相位判定、**成片连通**，不逐格独立采样 |');
L.push('| 次景 | 原 `landmarks` 退到纸后（极淡），不与主景争视线；主景一律避开中央玩法区 |');
L.push('');
L.push('一句话：**不是继续加装饰，而是让原著景物当主角，其余按「疏可走马、密不透风」收掉。** 新层仍严守低饱和灰阶、不碰 `G.zones` / `G.hazards`。');
L.push('');
L.push('### 风格基线（Jerry 定调 · 后续每批沿用）');
L.push('');
L.push('> 标杆样片：`' + STYLE.benchmark + '`（`' + STYLE.benchmarkMap + '`）。Jerry 原话：「比改造前要高级，就是这种风格的，是中国山水水墨画水彩画的感觉，高级简约，又能表达出原著小说的地图意境」。');
L.push('');
L.push('**一句话定义**：' + STYLE.definition + '。');
L.push('');
L.push('| # | 纪律 |');
L.push('|---|---|');
STYLE.principles.forEach((p, i) => L.push('| ' + (i + 1) + ' | ' + esc(p) + ' |'));
L.push('');
L.push('**纸性**：`' + STYLE.paper.base + ' / ' + STYLE.paper.a + ' / ' + STYLE.paper.b + '`（' + esc(STYLE.paper.source) + '）。' + esc(STYLE.paper.scope) + '。' + esc(STYLE.paper.deepInk) + '。回退：' + esc(STYLE.paper.rollback) + '。');
L.push('');
L.push('| 分组 | 图 | 处理 |');
L.push('|---|---|---|');
L.push('| 原生浅纸 ' + maps.filter(m => m.hasInkBg).length + ' 张 | ' + STYLE.conformance.native.split('（')[0].replace(/\//g, ' / ') + ' | 数据层已有 `inkBg`，`buildGrass` 直接出纸，本轮零改动 |');
L.push('| 补铺宣纸 ' + maps.filter(m => !m.hasInkBg).length + ' 张 | ' + STYLE.conformance.patched.split('（')[0].replace(/\//g, ' / ') + ' | 视觉层 `sc3BakePaper()` 铺同款 tile，**不改 `m.bg` / `m.inkBg`** |');
L.push('');
L.push('**量化口径**：装饰峰值 ≤ ' + STYLE.quant.decorMax + ' ｜ 同种最近邻 ' + STYLE.quant.nearestNeighborPx + ' ｜ 次景 alpha ' + STYLE.quant.landmarkAlpha + ' ｜ 主景 alpha ' + STYLE.quant.focusAlpha + ' ｜ 贴地 `maxAlpha` ≤ ' + STYLE.quant.terrainMaxAlpha + '、`solidPixels` = ' + STYLE.quant.terrainSolidPixels + ' ｜ 主景 ' + STYLE.quant.focusKinds + ' 类 / 章法 ' + STYLE.quant.layouts + ' 种 / `palette` ≤ ' + STYLE.quant.paletteMax + ' 种。');
L.push('');
L.push('**HUD / 玩法层（第102轮已柔化）**：' + esc(STYLE.conformance.outOfScope) + '。');
L.push('');
L.push('**下一批**：' + esc(STYLE.nextBatches) + '。');
L.push('');
L.push('### 自检结论');
L.push('');
L.push('`' + maps.length + ' 张图 / ' + quoteTotal + ' 条原文摘引 / ' + markTotal + ' 个地标 / ' + diffMaps.length + ' 张带差异标注 / ' + new Set(maps.map(m => m.composition.layout)).size + ' 种章法 / ' + new Set(maps.map(m => m.composition.focusCase)).size + ' 类主景形状；decor 权重和全部 = 1.000；全部 decor / landmarks / terrain / composition 枚举合法；校验 0 错误。`');
L.push('');
L.push('---');
L.push('');
L.push('## 二、总览');
L.push('');
L.push('| # | 批 | id | 名称 | arc | 依据 | 核心出处 | 墨阶 | 地标 | 贴地 | 差异 |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
maps.forEach((m, i) => L.push('| ' + (i + 1) + ' | ' + (m.batch === 8 ? '八' : m.batch === 7 ? '七' : m.batch === 6 ? '六' : m.batch === 5 ? '五' : m.batch === 4 ? '四' : m.batch === 3 ? '三' : m.batch === 2 ? '二' : '一') + ' | `' + m.id + '` | ' + esc(m.name) + ' | ' + m.arc + ' | ' + m.source + ' | ' + esc(shortRef(m.refs[0])) + ' | ' + m.inkTone + ' | ' + m.landmarks.length + ' | ' + m.terrain.join('/') + ' | ' + (m.diff && m.diff.length ? m.diff.length + ' 条' : '—') + ' |'));
L.push('');
L.push('---');
L.push('');
L.push('## 三、逐图考据');
L.push('');

for (let i = 0; i < maps.length; i++) {
  const m = maps[i];
  L.push('### ' + (i + 1) + '. `' + m.id + '` ' + m.name);
  L.push('');
  L.push('`' + m.arc + '` ｜ ' + (m.side ? '支线' : '主线') + ' ｜ ' + m.type + ' ｜ ' + esc(m.pos) + ' ｜ 依据：' + m.source + ' ｜ 墨阶建议 ' + m.inkTone + '/7');
  L.push('');
  L.push('**原著核心描述**');
  L.push('');
  L.push(m.canon);
  L.push('');
  L.push('**原文摘引**');
  L.push('');
  for (const q of m.quotes) L.push('> ' + q.text + '  ' + '\n> —— ' + q.ref);
  L.push('');
  L.push('| 外观要素 | 内容 |');
  L.push('|---|---|');
  const labels = { terrain: '地形', sky: '天象', architecture: '建筑', flora: '植被', ground: '地面', atmosphere: '氛围' };
  for (const k of Object.keys(labels)) L.push('| ' + labels[k] + ' | ' + esc(m.scene[k]) + ' |');
  L.push('');
  L.push('**渲染参数**');
  L.push('');
  L.push('- `decor`：' + m.decor.map(([k, w]) => '`' + k + '` ' + w.toFixed(2)).join(' ／ '));
  L.push('- `landmarks`：' + m.landmarks.map(l => '`' + l.kind + '` ' + l.name).join(' ／ '));
  L.push('- `terrain`：' + m.terrain.map(t => '`' + t + '`').join(' ／ ') + ' ｜ `tone` ' + m.tone.toFixed(2));
  L.push('');
  const c = m.composition;
  L.push('**构图（本轮落地）**');
  L.push('');
  L.push('- 主景：' + c.focus);
  L.push('- 形状 `' + c.focusCase + '` ｜ 章法 `' + c.layout + '` ｜ 留白 ' + c.breath + '/3 ｜ 聚落 ' + c.clusters + ' 处 ｜ 主景倍率 ' + c.focusScale.toFixed(1));
  L.push('- 收窄装饰：' + c.palette.map(k => '`' + k + '`').join(' ／ '));
  L.push('');
  L.push('**理想专属形状**：' + m.art);
  L.push('');
  if (m.diff && m.diff.length) {
    L.push('**与原著差异**');
    L.push('');
    for (const d of m.diff) L.push('- ' + d);
    L.push('');
  }
  L.push('---');
  L.push('');
}

L.push('## 四、差异汇总与两处报告校正');
L.push('');
L.push('| 图 | 差异 |');
L.push('|---|---|');
for (const m of diffMaps) for (const d of m.diff) L.push('| `' + m.id + '` | ' + esc(d) + ' |');
L.push('');
L.push('**校正一（重要）**：`CSJ_原著差异核对报告.html` 第 5.2 节判定血色禁地「五年 / 五天 / 六十年 / 二十五人」四个数值在原文 0 命中。回查 **人界篇第二卷 第一百六十章《血禁试炼》L6080**：「这禁法每过五年时间就会有五天的衰弱期」、L6083「七大修仙派每五年，就派一批筑基期以下的弟子进入禁地」——**「五年」「五天」有明确原文依据**。该节检索范围取 177–209 章，漏掉了第 160 章的背景段。「六十年」「二十五人」仍无据。');
L.push('');
L.push('**校正二**：同报告 4.2 节写「张铁确为铁匠出身（第 5 章）」，回查第 5 章原文只有张铁与韩立同期被收作记名弟子，未见铁匠出身表述；与铁匠相关的原文是第 41 章韩立找门内铁匠打造短剑与铁铃。本台账不采信该条。');
L.push('');
L.push('**地名口径**：`qixuan / houshan / yelang / mkuang / zhangtie` 五张图的 `pos` 含「青牛山」，原著第 2–3 章中「青牛」是镇名，七玄门所在为**彩霞山**（主峰落日峰）。台账按原著记录，游戏数据不改。');
L.push('');
L.push('---');
L.push('');
L.push('## 五、复现与阶段二接入口径');
L.push('');
L.push('```bash');
L.push('node codex/export-map-inventory.mjs      # 导出 171 张图清单 → codex/map-inventory.json');
L.push('node codex/novel-index.mjs build         # 建两篇原文卷/章索引 → codex/novel-index.json');
L.push('node codex/probe-batch2.mjs              # 第二批：11 张图关键词命中 + 原文上下文');
L.push('node codex/probe-chapters.mjs            # 第二批：专名定位 + 23 章章内精读');
L.push('node codex/append-batch2.mjs             # 幂等追加第二批考据到唯一真源');
L.push('node codex/probe-batch3.mjs              # 第三批：21 张图专名命中章（人界篇 12 卷 2451 章）');
L.push('node codex/probe-batch3-chapters.mjs     # 第三批：按卷核定 87 章精读（剔除灵界同名章）');
L.push('node codex/probe-batch3-scenes.mjs       # 第三批：逐图景物原句摘引池（每章各取 3 条）');
L.push('node codex/append-batch3.mjs             # 幂等追加第三批 21 张考据到唯一真源');
L.push('node codex/probe-batch4.mjs              # 第四批：19 张专名定位，显式分列人界篇内 / 越界命中');
L.push('node codex/probe-batch4-pin.mjs          # 第四批：独特专名定点命中（防止按词频串章）');
L.push('node codex/probe-batch4-chapters.mjs     # 第四批：按卷核定 97 章精读（第五卷尾 / 第六卷 / 第七卷）');
L.push('node codex/probe-batch4-scenes.mjs       # 第四批：逐图景物原句摘引池（297 条）');
L.push('node codex/probe-batch4-facts.mjs        # 第四批：逐条核实游戏文案的量化与事件断言');
L.push('node codex/append-batch4.mjs             # 幂等追加第四批 19 张考据到唯一真源');
L.push('node codex/probe-batch5.mjs              # 第五批：19 张专名定位，显式分列灵界篇内/越界命中');
L.push('node codex/probe-batch5-chapters.mjs     # 第五批：按卷核定 97 章精读（0 超界）');
L.push('node codex/probe-batch5-scenes.mjs       # 第五批：逐图景物原句摘引池（1286 条）');
L.push('node codex/probe-batch5-facts.mjs        # 第五批：逐条核实游戏文案的量化与事件断言');
L.push('node codex/append-batch5.mjs             # 幂等追加第五批 19 张考据到唯一真源');
L.push('node codex/build-mapcodex.mjs            # 校验 + 生成 MD 与 fanren/js/mapCodex.js');
L.push('cd fanren && node qa/smoke.mjs                # 冒烟 294/0');
L.push('cd fanren && node qa/verify-scenery3.mjs     # 逐图验收（J/K/L/M 组含分批自动启用与视觉边界，自带 9097）');
L.push('cd fanren && node qa/shot-scenery3.mjs       # 实拍 + 后山 on/off/jin 对照（自带 9098）');
L.push('cd fanren && node qa/shot-stage5.mjs         # 第102轮 UI A/B + 幽暗实拍（自带 9096）');
L.push('cd fanren && node qa/shot-batch2.mjs         # 第103轮第二批 11 张逐图实拍（自带 9095）');
L.push('cd fanren && node qa/shot-batch3.mjs         # 第104轮第三批 21 张逐图实拍（自带 9094）');
L.push('cd fanren && node qa/shot-batch4.mjs         # 第105轮第四批 19 张逐图实拍（自带 9093）');
L.push('```');
L.push('');
L.push('索引自检：人界篇 2451 条章标题（第一章 山边小村 → 第两千四百四十六章 飞升仙界（大结局））、仙界篇 1394 章（第一章 狐女 → 第一千三百九十四章 飞羽（大结局）），与差异核对报告的卷章量级一致。');
L.push('');
L.push('### 阶段二：台账如何进入游戏（' + doc.meta.stage2.status + '）');
L.push('');
L.push('| 项 | 口径 |');
L.push('|---|---|');
const stage2Labels = { entry:'加载', route:'路线', untracked:'未收录图', tone:'tone', darkBase:'深底适配', inkTone:'inkTone', qa:'验收' };
for (const k of Object.keys(stage2Labels)) L.push('| ' + stage2Labels[k] + ' | ' + esc(doc.meta.stage2[k]) + ' |');
L.push('');
L.push('### 阶段三：构图化改造（' + doc.meta.composition.status + '）');
L.push('');
L.push('| 项 | 口径 |');
L.push('|---|---|');
L.push('| 真源 | `composition` 逐图写在 `mapCodex.json`；生成器校验 8 类主景形状 / 7 种章法 / `palette ⊆ decor` / 留白与倍率范围 |');
L.push('| 主景 | `sc3Bake` big 画布新增 8 个原著专属形状，放大 `focusScale` 倍；**专用浓墨色板 CF**（统一比配景更黑）+ 连续实笔 + 全 alpha，按 `layout` 定构图位、避开中央玩法区 |');
L.push('| 聚散 | `genChunk` 用低频连续相位判「聚落 / 留白」，组内同种成丛且大小浓淡错落；留白等级 1/2/3 对应不同密度，不再逐格独立采样 |');
L.push('| 笔法 | 实心 `rect()` 直角块全部清除，改成断续笔线 / 没骨墨团 / 石棱皴擦；**配景虚笔、主景实笔**，去掉「散落方形图标」感 |');
L.push('| 次景 | 原 `landmarks` alpha 压到 0.20 并缩小，退到纸后，不与主景争视线 |');
L.push('| 实拍自查 | 13 张亲眼看，两轮修：① 主景沿用配景 0.72 折扣太淡、山门读成散线、小寺读成牌坊；② 石屋读成「相框里的镜子」、深底主景与装饰同亮度不分主次 |');
L.push('| 贴地 | `sc3BakeTerrain` 按章法摆软边墨块（环抱 / 横带 / 夹景 / 只留一角），仍守四角摆块与中央低明度 |');
L.push('| 边界 | 未收录图仍完全短路、逐字节不变（第101轮当时 153 张；第103轮第二批后 142 张；第104轮第三批后 121 张；第105轮第四批后 102 张，均为灵界篇）；不改判定、不引彩色、不动纸底数据 |');
L.push('');
L.push('### 阶段四：纸性统一（' + STYLE.status + '）');
L.push('');
L.push('用标杆 `' + STYLE.benchmarkMap + '` 这把尺子量第101轮当时的其余 17 张，发现**风格只在 9 张图上成立**：批次1 给 9 张主线图算了 `inkBg` 墨阶（浅宣纸），另 9 张游戏增补图没有 `inkBg`，`buildGrass` 退回 `m.bg.base` 的深墨绿 / 暗红棕底。这些图是「暗底 + 浅灰线稿」，远山层次被吞、还带棕红彩色，与宣纸水彩不是一套。');
L.push('');
L.push('| 项 | 口径 |');
L.push('|---|---|');
L.push('| 真源 | `meta.style` 写进 `mapCodex.json`，生成器校验纸色三元组 / 标杆 / 纪律条数 / 量化参数 / 符合度分组，并导出 `window.MAP_CODEX_STYLE` |');
L.push('| 补铺 | 仅对无 `inkBg` 的原深底图 `sc3BakePaper()` 烘焙 96×96 无缝宣纸 tile，`render()` 在 `grassPat` 之后铺 1 次 `fillRect`；每帧 +1 次填充，未收录图完全不执行 |');
L.push('| 幽暗 | 不再靠「把纸涂黑」：纸底统一，改由淡墨积染（纸底 tile 叠软边墨晕）+ 配景墨色略加重表达，主景仍是浓墨实笔 |');
L.push('| 色板 | 废止第99轮「深底把淡墨层抬到浅灰」的临时方案；`sc3Colors` 与 `CF` 统一回淡墨 / 浓墨，不再按底色分叉 |');
L.push('| 收益 | 深底图上原本被吞掉的 `parallax` 远山 / 暗角层次重新可见，与标杆的远中近章法对齐 |');
L.push('| 边界 | 不改 `m.bg` / `m.inkBg`、不碰判定、不引彩色；`__FR.scenery3Enable(false)` 可一键回退原深底 |');
L.push('');
const S5 = doc.meta.stage5;
if (S5) {
  L.push('### 阶段五：UI 柔化 + 逐图幽暗（' + S5.status + '）');
  L.push('');
  L.push('| 项 | 口径 |');
  L.push('|---|---|');
  const s5Labels = { hudSoft:'UI 柔化', ringSoft:'圆形提示圈', gloom:'逐图幽暗', discipline:'纪律', qa:'验收' };
  for (const k of Object.keys(s5Labels)) L.push('| ' + s5Labels[k] + ' | ' + esc(S5[k]) + ' |');
  L.push('');
  const moodMaps = maps.filter(m => m.mood);
  L.push('**本批带 `mood` 的图**：' + (moodMaps.length ? moodMaps.map(m => '`' + m.id + '` ' + m.mood.name + '（gloom ' + m.mood.gloom + ' / vignette ' + m.mood.vignette + ' / haze ' + m.mood.haze + ' / focusInk ' + m.mood.focusInk + '）').join(' ／ ') : '无') + '。');
  L.push('');
  for (const m of moodMaps) L.push('- `' + m.id + '` 原著依据：' + esc(m.mood.basis) + ' ' + esc(m.mood.note));
  L.push('');
}
const S6 = doc.meta.stage6;
if (S6) {
  L.push('### 阶段六：第二批考据 + 视觉边界收口（' + S6.status + '）');
  L.push('');
  L.push('| 项 | 口径 |');
  L.push('|---|---|');
  const s6Labels = { batch2:'第二批考据', focusCases:'主景形状', discipline:'纪律', vision:'视觉边界', qa:'验收' };
  for (const k of Object.keys(s6Labels)) L.push('| ' + s6Labels[k] + ' | ' + esc(S6[k]) + ' |');
  L.push('');
  L.push('**第二批 11 张**（arc C 5 + arc D 6）：' + maps.filter(m => m.batch === 2).map(m => '`' + m.id + '` ' + m.name).join(' ／ ') + '。每张都带卷章行号出处、原文摘引、外观六要素与差异标注。');
  L.push('');
  const sigMaps = maps.filter(m => m.mood && m.mood.signature);
  L.push('**新增 `mood.signature` 专属笔法**：' + (sigMaps.length ? sigMaps.map(m => '`' + m.id + '` ' + m.mood.signature).join(' ／ ') : '无') + '；画在积墨罩上，全灰阶软边、不引红色、不碰判定。');
  L.push('');
}
const S7 = doc.meta.stage7;
if (S7) {
  L.push('### 阶段七：第三批考据（' + S7.status + '）');
  L.push('');
  L.push('| 项 | 口径 |');
  L.push('|---|---|');
  const s7Labels = { batch3:'第三批考据', evidence:'证据链', focusCases:'主景形状', discipline:'纪律', tuning:'实拍复盘与调参', qa:'验收' };
  for (const k of Object.keys(s7Labels)) L.push('| ' + s7Labels[k] + ' | ' + esc(S7[k]) + ' |');
  L.push('');
  L.push('**第三批 ' + n3 + ' 张**（arc E 7 + arc F 14，人界篇第四卷尾～第五卷）：' + maps.filter(m => m.batch === 3).map(m => '`' + m.id + '` ' + m.name).join(' ／ ') + '。每张都带卷章行号出处、原文摘引、外观六要素与差异标注。');
  L.push('');
  L.push('**卷次纪律**：`ren` 索引含 2451 章，但人界篇只到第七卷 #1265，第八卷 #1266 起属灵界。第三批主体为第四卷 #364-595 / 第五卷 #596-795，源头章上溯第三卷 #351/352；按词频排序会把「坠魔谷」#804-847 误当苍坤洞府，故 87 个精读章逐图人工核定。');
  L.push('');
}
const S8 = doc.meta.stage8;
const nHist = maps.filter(m => m.batch <= 4).length; // 历史口径：第四批收官时人界篇 69 张，不受后续批次影响
if (S8) {
  L.push('### 阶段八：第四批考据 · 人界篇收官（' + S8.status + '）');
  L.push('');
  L.push('| 项 | 口径 |');
  L.push('|---|---|');
  const s8Labels = { batch4:'第四批考据', evidence:'证据链', focusCases:'主景形状', discipline:'纪律', tuning:'实拍复盘与调参', qa:'验收' };
  for (const k of Object.keys(s8Labels)) L.push('| ' + s8Labels[k] + ' | ' + esc(S8[k]) + ' |');
  L.push('');
  L.push('**第四批 ' + n4 + ' 张**（arc G 11 + arc H 8，人界篇第五卷尾～第七卷）：' + maps.filter(m => m.batch === 4).map(m => '`' + m.id + '` ' + m.name).join(' ／ ') + '。每张都带卷章行号出处、原文摘引、外观六要素与差异标注。');
  L.push('');
  L.push('**篇章边界**：第四批按完整 arc 边界收 `G+H`，不半途截断、不越篇章。至此人界篇 ' + nHist + ' 张（第一卷～第七卷）全部收录；剩余 ' + (171 - nHist) + ' 张全属第八卷之后的灵界篇，另起批次。本批 `game.js` 白名单逻辑一字段未改，第三次实证「加一张台账自动启用一张」。');
  L.push('');
  L.push('**三处明确冲突（只标注不改游戏数据）**：`liudao` 六道夺舍万天明（原著是天星双圣自爆元磁神光同归于尽、万天明自己进阶当盟主）、`zijian` 紫灵被星宫扣着赎价一枚妖丹（原著是魔陀山魔宫以寒髓加硬接一击换回）、`xutian2` 虚天殿八十年后才开（原著开启周期三百年，传送来自小极宫虚灵殿单向阵）。详见第四节差异汇总。');
  L.push('');
}
const S9 = doc.meta.stage9;
if (S9) {
  L.push('### 阶段九：第五批考据 · 灵界篇前两段（' + S9.status + '）');
  L.push('');
  L.push('| 项 | 口径 |');
  L.push('|---|---|');
  const s9Labels = { batch5:'第五批考据', evidence:'证据链', focusCases:'主景形状', discipline:'纪律', tuning:'实拍复盘与调参', qa:'验收' };
  for (const k of Object.keys(s9Labels)) L.push('| ' + s9Labels[k] + ' | ' + esc(S9[k]) + ' |');
  L.push('');
  L.push('**第五批 ' + n5 + ' 张**（arc I 13 + arc J 6，灵界篇第八卷～第十卷前两段）：' + maps.filter(m => m.batch === 5).map(m => '`' + m.id + '` ' + m.name).join(' ／ ') + '。每张都带卷章出处、原文摘引、外观六要素与差异标注。');
  L.push('');
  L.push('**第六批 ' + n6 + ' 张**（arc K 19，灵界篇第十卷魔界之战）：' + maps.filter(m => m.batch === 6).map(m => '`' + m.id + '` ' + m.name).join(' ／ ') + '。每张都带卷章出处、原文摘引、外观六要素与差异标注。');
  L.push('');
  L.push('**第七批 ' + n7 + ' 张**（arc L 30，灵界篇收尾段 #2176–#2451，跨 V11 真仙降世与 V12 真仙降临直到大结局）：' + maps.filter(m => m.batch === 7).map(m => '`' + m.id + '` ' + m.name).join(' ／ ') + '。每张都带卷章出处、原文摘引、外观六要素与差异标注；引用章号一律按章标题反查索引，由生成器引用自洽闸门校验。');
  L.push('');
  L.push('**主景形状**：第五批 19 张全部复用既有 24 类 sc3Bake 主景（desertruin / narrowgate / stonering / thunderhead / clanhall / pagoda / grove / pool / floatingpalace / deadsea / minehead / stonehut / battleline / stormpeak / reef / icewall 等），逐图 `composition` 各不相同，**sc3Bake 无需新增 case**；主景形状仍 24 类。');
  L.push('');
  L.push('**灰阶纪律**：赤日热浪 / 两色雷劫 / 冥河黑雾 / 玄天血云 / 五色灵云 / 广寒寒气 / 真蟾灵血只取明度不落彩；不改游戏 name / pos / desc、不碰判定。');
  L.push('');
}
const S11 = doc.meta.stage11;
if (S11) {
  L.push('### 阶段十一：第八批考据 · 仙界篇收官（arc M，' + S11.status + '）');
  L.push('');
  L.push('| 项 | 口径 |');
  L.push('|---|---|');
  const s11Labels = { batch8:'第八批考据', evidence:'证据链', focusCases:'主景形状', discipline:'纪律', tuning:'实拍复盘与调参', qa:'验收' };
  for (const k of Object.keys(s11Labels)) L.push('| ' + s11Labels[k] + ' | ' + esc(S11[k]) + ' |');
  L.push('');
  L.push('**第八批 ' + n8 + ' 张**（arc M，仙界篇第一卷～第五卷 #1–#1394，风起灵寰 → 重回仙界 → 时空迷踪 → 大罗之争 → 大道归一）：' + maps.filter(m => m.batch === 8).map(m => '`' + m.id + '` ' + m.name).join(' ／ ') + '。每张都带卷章出处、原文摘引、外观六要素与差异标注；引用章号按章标题反查 `novel-index.json` 的 `xian.chapters`，由生成器引用自洽闸门校验（前缀 `仙界篇 ` 派发到仙界篇索引）。');
  L.push('');
  L.push('**主景形状**：第八批 ' + n8 + ' 张全部复用既有 24 类 sc3Bake 主景，逐图 `composition` 各不相同，同批单类封顶 4 张且章法互异，**sc3Bake 无需新增 case**；主景形状仍 24 类。');
  L.push('');
  L.push('**灰阶纪律**：赤金仙宫 / 浣骨金雷 / 紫金电弧 / 青竹蜂云剑金光 / 岁月神灯金焰 / 雷夔金目只取明度不落彩；不改游戏 name / pos / desc、不碰判定。');
  L.push('');
}
L.push('---');
L.push('');
L.push('## 六、收官与白名单');
L.push('');
L.push('首批 18 张是格式样板，第二~第七批 119 张、第八批（arc M 仙界篇）' + n8 + ' 张八次实证了同一条流水线：`导出清单 → 定关键词 → 回查原文 → 按卷剔后期同名章 → 精读环境描写 → 核实游戏文案断言 → 追加 mapCodex.json → 重跑生成器`。人界篇 ' + nHist + ' 张 + 灵界篇 ' + (n5 + n6 + n7) + ' 张（arc I~L）+ 仙界篇 ' + n8 + ' 张（arc M）已全部收口，累计 ' + maps.length + ' 张。阶段二的白名单直接取 `window.MAP_CODEX` 的 key，**第八批 ' + n8 + ' 张同样没有改 `game.js` 白名单逻辑就全部自动启用**（第八次实证）；主景形状仍 24 类、无需新增 case。批次3 的 `SC3_ARC2BIOME` / 6 组 biome 已整体删除，不再有按 arc 批量套外观的路径。arc M 为最后一批，凡人三界（人界 / 灵界 / 仙界）地图考据全部落口，无剩余图。');
L.push('');

fs.writeFileSync(MD, L.join('\n'), 'utf8');
console.log('校验通过：' + maps.length + ' 张 / ' + quoteTotal + ' 条摘引 / ' + markTotal + ' 个地标 / ' + diffMaps.length + ' 张带差异 / ' + refChecked + ' 条引用与索引自洽 / 0 错误');
console.log('WROTE', MD);
console.log('WROTE', JS, '(' + Object.keys(slim).length + ' entries)');
