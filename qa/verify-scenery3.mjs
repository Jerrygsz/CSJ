// 批次4 阶段二：逐图原著考据台账（window.MAP_CODEX）驱动的地图视觉层，常驻验收。
// 自带静态服务，独立于其它 QA 脚本的端口。
//
// 断言分十八组（A~Q）。第103轮起所有数量口径都从 window.MAP_CODEX 动态取，
// 不再写死 18 / 29 / 50 / 69 / 153 / 142 / 121 / 102 / 9 / 13 / 14 / 16，
// 也不再拿某张固定 id 当「未收录图」——收录一张就少一张未收录。
//   A 路线约束：白名单 = MAP_CODEX 的 key；171 张图只启用收录图，其余完全短路
//   B 三项指标：装饰类型 ≥12、地标 1~3 个且都有精灵、贴地层 pattern 存在、双皮各自烘焙
//   C 纯视觉：新层不写 G.zones / G.hazards（判定层零变化）
//   D 流畅度：同一张后山图开/关三层，A/B 量每帧绘制调用增量与帧耗
//   E 逐图一致性：收录图的 decor / landmarks / terrain / tone 逐字段等于台账，且同 arc 内不再共用一套外观
//   F 构图化：逐图 composition 等于台账、主景唯一定位且避开玩法区、装饰按 palette 收窄、聚落成丛、留白生效
//   G 纸性统一：风格基线加载、纸色等于标杆 qixuan.inkBg、缺 inkBg 的图补铺宣纸 / 原生浅纸零改动、主景浓墨不分叉
//   H UI 柔化：body.sc3-paper 只在收录图 + 水墨皮挂上；硬边/投影/饱和全部退掉，热区与元素数不变，可一键回退
//   I 逐图幽暗：mood 只落 xuechi / heisha、四项参数等于台账、积墨罩连续软边、主景更浓、标杆零回归、每帧 +1 drawImage
//   J 第二批：加台账即自动启用、白名单源码未写死图数、3 个新主景落地、纸性分组由 hasInkBg 驱动
//   K 视觉边界：mood.signature 专属笔法确实画进积墨罩、玩法层 #banner / .chat-dove / #chatInput 柔化且可回退
//   L 第三批：21 张自动启用、6 个新主景像素级非空白、形状类数动态对齐、纸性分组动态口径继续成立、标杆零回归
//   M 第四批：人界篇 69 张全篇收口、7 个新主景像素级非空白、24 类形状全覆盖、
//             剩余 83 张全属 arc K~M、真源 stage8 与交付版本对齐、标杆零回归
//   N 第五批：19 张自动启用、灵界篇前两段收口、16 类主景复用既有 24 类（sc3Bake 无需新增 case）、
//             纸性分组含 yuyang / yuyang_dou（16 张补铺宣纸 / 72 张原生浅纸）、标杆零回归
//   O 第六批：19 张自动启用、arc K 魔界之战收口、9 类主景全复用既有 24 类、24 类每类仍有用图、
//             台账零颜色字段（全灰阶纪律）、真源 stage9 与交付版本 20261106N 对齐、标杆零回归
//   P 第七批：30 张自动启用、arc L 真仙降临收口、17 类主景全复用既有 24 类、灵界篇 (n5+n6+n7) 收口、
//             剩余 34 张全落 arc M（末批）、台账零颜色字段、引用章号与原著索引自洽、标杆零回归
//   Q 第八批：34 张自动启用、arc M 仙界篇收口、18 类主景全复用既有 24 类、仙界篇章号与原著索引自洽、
//             台账零颜色字段、凡人三界考据全部收口（无未收录图）、标杆零回归
//
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9097;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });

let pass = 0, fail = 0;
const ok = (c, l, extra) => { if (c) { pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const ctxp = await browser.newContext({ viewport: { width: 480, height: 900 }, serviceWorkers: 'block' });
const page = await ctxp.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
await page.evaluate(() => {
  const ids = window.MAPS.map(m => m.id); const dc = {}; for (const id of ids) dc[id] = { easy: true };
  const s = { unlocked: ids, cleared: ids, caves: Object.keys(window.CAVES || {}), diffClear: dc, cultivate: { level: 200, xp: 0, skills: {} }, inventory: {}, stones: 50000, best: { level: 200, time: 0, kills: 0 } };
  localStorage.setItem('fanren_save_v1', JSON.stringify(s));
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

const enter = async (id, skin) => {
  await page.evaluate(([id, skin]) => {
    window.__FR.skin(skin);
    window.__FR.enterMap(id);
    window.__FR.G.state = 'play';
    window.__FR.skipStory && window.__FR.skipStory();
    window.__FR.muteStory && window.__FR.muteStory(true);
  }, [id, skin]);
  await page.waitForTimeout(350);
  await page.evaluate(() => { const d = document.getElementById('dialog'); if (d) d.style.display = 'none'; });
};
// E 组专用：只查 scenery3() 状态，不需要等 UI 稳定
const probe = async (id) => {
  await page.evaluate((id) => {
    window.__FR.skin('guigu');
    window.__FR.enterMap(id);
    window.__FR.G.state = 'play';
    window.__FR.skipStory && window.__FR.skipStory();
    window.__FR.muteStory && window.__FR.muteStory(true);
    const d = document.getElementById('dialog'); if (d) d.style.display = 'none';
  }, id);
  await page.waitForTimeout(90);
  await page.evaluate(() => window.__FR.renderOnce());   // 确保 ensureDecor() 已铺好 chunk，构图探针才有数据
  return page.evaluate(() => window.__FR.scenery3());
};

const codexIds = await page.evaluate(() => Object.keys(window.MAP_CODEX || {}));
const codex = await page.evaluate(() => window.MAP_CODEX);
const allIds = await page.evaluate(() => window.MAPS.map(m => m.id));
const arcs = await page.evaluate(() => Object.fromEntries(window.MAPS.map(m => [m.id, m.arc || null])));
// 动态口径：收录数、未收录数、批次分组、纸性分组全部来自唯一真源，QA 不再手写名单
const N = codexIds.length;
const offIds = allIds.filter(id => !codexIds.includes(id));
const untrackedId = offIds.find(id => (arcs[id] === 'C' || arcs[id] === 'D')) || offIds[0];
const b1Ids = codexIds.filter(id => codex[id].batch === 1);
const b2Ids = codexIds.filter(id => codex[id].batch === 2);
const b3Ids = codexIds.filter(id => codex[id].batch === 3);
const b4Ids = codexIds.filter(id => codex[id].batch === 4);
const b5Ids = codexIds.filter(id => codex[id].batch === 5);
const b6Ids = codexIds.filter(id => codex[id].batch === 6);
const b7Ids = codexIds.filter(id => codex[id].batch === 7);
const b8Ids = codexIds.filter(id => codex[id].batch === 8);
const batches = [b1Ids, b2Ids, b3Ids, b4Ids, b5Ids, b6Ids, b7Ids, b8Ids];
const sumBatches = batches.reduce((n, a) => n + a.length, 0);
const expectPatched = codexIds.filter(id => codex[id].hasInkBg === false).slice().sort();
console.log('\n动态口径:', JSON.stringify({ total: allIds.length, on: N, off: offIds.length, b1: b1Ids.length, b2: b2Ids.length, b3: b3Ids.length, b4: b4Ids.length, b5: b5Ids.length, b6: b6Ids.length, b7: b7Ids.length, b8: b8Ids.length, patched: expectPatched.length, native: N - expectPatched.length, untracked: untrackedId || '（无，凡人三界全收录）' }));

console.log('\n== A 路线约束：逐图台账白名单（不全量铺开）==');
await enter('houshan', 'guigu');
const sOn = await page.evaluate(() => window.__FR.scenery3());
ok(sOn.codexLoaded === true && sOn.codexSize === N, 'mapCodex.js 已加载且含 ' + N + ' 张逐图台账', { loaded: sOn.codexLoaded, size: sOn.codexSize });
ok(sOn.sample.length === codexIds.length && sOn.sample.every(x => codexIds.includes(x)),
   '白名单严格等于 MAP_CODEX 的 key（收录一张启用一张，不必改 game.js）', { sample: sOn.sample.length, codex: codexIds.length });
ok(allIds.length === 171 && sOn.sample.length === N && offIds.length === allIds.length - N,
   '171 张图只启用 ' + N + ' 张，其余 ' + offIds.length + ' 张保持短路（Jerry 明确禁止全量铺开）', { total: allIds.length, on: sOn.sample.length, off: offIds.length });
ok(sOn.on === true && sOn.mapId === 'houshan', '收录图启用逐图视觉层', { on: sOn.on, mapId: sOn.mapId });
if (untrackedId !== undefined) {
  await enter(untrackedId, 'guigu');   // 动态挑一张真未收录图
  const sOff = await page.evaluate(() => window.__FR.scenery3());
  ok(!codexIds.includes(untrackedId) && untrackedId !== undefined, '未收录样本动态取自 allIds \\ MAP_CODEX', { untrackedId });
  ok(sOff.on === false, '未收录图完全短路（on=false）', { on: sOff.on });
  ok(sOff.decorScheme === null && sOff.landmarks.length === 0 && sOff.terrain === null && sOff.terrainPat === false,
     '未收录图不覆盖 decorScheme / 无地标 / 无贴地层（逐字节不变）', sOff);
} else {
  ok(offIds.length === 0, '凡人三界（人界 / 灵界 / 仙界）考据已全部收口，' + allIds.length + ' 张图全部启用，无未收录图（末批后常态）', { off: offIds.length });
  const sOff = await page.evaluate(() => window.__FR.scenery3());   // houshan 已被 enter，用来确认收录图仍 on
  ok(sOff.on === true, '收录图 houshan 仍逐图视觉层启用（无未收录样本可短路）', { on: sOff.on });
}

console.log('\n== B 三项指标（墨皮 / 后山）==');
await enter('houshan', 'guigu');
const g = await page.evaluate(() => window.__FR.scenery3());
ok(g.types.length >= 12, 'P1-3 装饰类型 3 → ≥12', { n: g.types.length, types: g.types });
const newTypes = g.decorScheme ? g.decorScheme.map(x => x[0]) : [];
ok(newTypes.filter(t => !['tree','rock','tuft'].includes(t)).length >= 3,
   '台账装饰权重表含 ≥3 种新装饰（不是只挂在常量里）', newTypes);
ok(g.landmarks.length >= 1 && g.landmarks.length <= 3, 'P1-2 地标每图 1~3 个', { n: g.landmarks.length });
ok(g.landmarks.every(l => l.hasSpr), 'P1-2 每个次景都烘焙出精灵（alpha 0.20 退到纸后 + 软边罩走 blitSprOn）', g.landmarks);
ok(g.landmarks.every(l => !!l.name), '地标带原著景物名（不是随机 kind）', g.landmarks.map(l => l.name));
ok(g.terrainPat === true, 'P1-4 贴地层 createPattern 已生成', { terrainPat: g.terrainPat });
ok(g.mapId === 'houshan' && g.skin === 'guigu' && g.tone === 0.98,
   '逐图参数已生效：mapId / skin / tone 来自台账，不再按 arc 分组', { mapId: g.mapId, skin: g.skin, tone: g.tone });
ok(g.terrain && g.terrain.length >= 1 && g.terrain.every(t => ['water','stair','cloud','cliff'].includes(t)),
   '贴地类型来自台账 terrain 枚举', g.terrain);
console.log('   terrainA 实测:', JSON.stringify(g.terrainA));
// 像素级证据：贴地 tile 是「连续渐变软边淡墨块」，不是硬边 0/255 二值贴片、也不是没画出来
ok(g.terrainA && g.terrainA.nonZero > 1000, 'P1-4 贴地层确实画了东西（非空白）', g.terrainA);
ok(g.terrainA && g.terrainA.distinctAlpha >= 8, 'P1-4 软边：alpha 连续渐变多档（非硬边二值）', g.terrainA);
ok(g.terrainA && g.terrainA.solidPixels === 0 && g.terrainA.maxAlpha < 90,
   'P1-4 淡墨：无实心像素、峰值 alpha 低（不盖住纸底/不马赛克）', g.terrainA);

console.log('\n== B2 双皮各自烘焙（切皮缓存隔离）==');
await page.evaluate(() => window.__FR.skin('jin'));
await page.waitForTimeout(200);
const j = await page.evaluate(() => window.__FR.scenery3());
ok(j.on === true && j.terrainPat === true && j.skin === 'jin',
   '鎏金皮也有自己的贴地层 / 地标 / 装饰（双皮对等）', { on: j.on, skin: j.skin, terrainPat: j.terrainPat });
ok(j.types.length === g.types.length && j.landmarks.length === g.landmarks.length && j.tone === g.tone,
   '两皮结构对等（类型数 / 地标数 / tone 一致）', { guigu: g.types.length, jin: j.types.length, tone: j.tone });

console.log('\n== C 纯视觉：判定层零变化 ==');
const jud = await page.evaluate(() => window.__FR.scenery3());
ok(jud.zones === 0 && jud.hazards === 0,
   '进图静态地形不写 G.zones / G.hazards（不加减速、不改碰撞）', { zones: jud.zones, hazards: jud.hazards });

console.log('\n== D 流畅度：同图开关 A/B，每帧绘制调用与帧耗 ==');
await enter('houshan', 'guigu');
const perf = await page.evaluate(() => {
  const cv = document.getElementById('game');
  const c = cv.getContext('2d');
  const origFill = c.fillRect, origDraw = c.drawImage;
  let nf = 0, nd = 0;
  c.fillRect = function (...a) { nf++; return origFill.apply(this, a); };
  c.drawImage = function (...a) { nd++; return origDraw.apply(this, a); };
  const N = 60;
  const measure = () => {
    nf = 0; nd = 0;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) window.__FR.renderOnce();
    const t1 = performance.now();
    return { fill: nf / N, draw: nd / N, ms: (t1 - t0) / N };
  };
  // 关三层：warmup 后再测（排除首次烘焙）
  window.__FR.scenery3Enable(false); window.__FR.renderOnce();
  const off = measure();
  // 开三层：warmup 让 ensureScenery3 完成烘焙，再测纯每帧增量
  window.__FR.scenery3Enable(true); window.__FR.renderOnce();
  const on = measure();
  c.fillRect = origFill; c.drawImage = origDraw;
  window.__FR.scenery3Enable(true);
  return { off, on, dFill: on.fill - off.fill, dDraw: on.draw - off.draw, dMs: +(on.ms - off.ms).toFixed(3) };
});
console.log('   A/B:', JSON.stringify(perf));
ok(perf.dFill === 1, 'P1-4 贴地层每帧恰好 +1 次 fillRect（不是逐格瓦片）', { dFill: perf.dFill });
ok(perf.dDraw >= 0 && perf.dDraw <= 5, '地标 + 主景每帧 ≤5 次 drawImage（视锥裁剪生效）', { dDraw: perf.dDraw });
ok(perf.dMs < 1.0, '帧耗增量 < 1ms/帧（对照第83轮 6 特效 1.95ms 基线）', { dMs: perf.dMs });
ok(perf.on.ms < 3.0, '开启三层后整帧耗 < 3ms/帧', { ms: +perf.on.ms.toFixed(3) });

console.log('\n== E 逐图一致性：' + N + ' 张台账 vs 运行时 ==');
const rows = [];
for (const id of codexIds) rows.push({ id, s: await probe(id) });
const mism = [];
for (const r of rows) {
  const c = codex[r.id], s = r.s;
  if (!s.on || s.mapId !== r.id) { mism.push(r.id + ': 未启用/mapId 不符'); continue; }
  if (!eq(s.decorScheme, c.decor)) mism.push(r.id + ': decor');
  if (!eq(s.landmarks.map(l => [l.kind, l.name]), c.landmarks.map(l => [l.kind, l.name]))) mism.push(r.id + ': landmarks');
  if (!eq(s.terrain, c.terrain)) mism.push(r.id + ': terrain');
  if (s.tone !== c.tone) mism.push(r.id + ': tone');
  if (!s.landmarks.every(l => l.hasSpr)) mism.push(r.id + ': 地标缺精灵');
  if (!s.terrainPat) mism.push(r.id + ': 贴地层缺失');
  if (s.zones || s.hazards) mism.push(r.id + ': 判定层被写');
  if (!s.types || s.types.length < 12) mism.push(r.id + ': 装饰类型不全');
}
ok(mism.length === 0, N + ' 张图的 decor / landmarks / terrain / tone 逐字段等于台账', mism);
const uniqDecor = new Set(rows.map(r => JSON.stringify(r.s.decorScheme))).size;
ok(uniqDecor === N, N + ' 张图装饰权重表全部不同（不是共用一套外观）', { uniqDecor });
const uniqLm = new Set(rows.map(r => JSON.stringify(r.s.landmarks.map(l => l.name)))).size;
ok(uniqLm === N, N + ' 张图地标名称全不相同（原著景物逐图指定）', { uniqLm });
const uniqTerrain = new Set(rows.map(r => JSON.stringify(r.s.terrain))).size;
ok(uniqTerrain >= 4, '贴地组合有多种（不是全图一套）', { uniqTerrain });
const tones = [...new Set(rows.map(r => r.s.tone))];
ok(tones.length >= 8, '墨色浓淡 tone 逐图有差异', { tones });
const byArc = {};
for (const r of rows) (byArc[arcs[r.id]] || (byArc[arcs[r.id]] = [])).push(r);
const arcClash = Object.keys(byArc).filter(a => {
  const v = byArc[a];
  return v.length > 1 && new Set(v.map(x => JSON.stringify(x.s.decorScheme))).size < v.length;
});
ok(arcClash.length === 0, '同一 arc 内的图不再共用一套外观（推翻批次3 的 arc→biome 分组）', arcClash);
// 第101轮：深底判定不再驱动「白墨反相」，而是驱动「是否补铺宣纸」。
const inkR = (s) => { const m = /rgba\((\d+)/.exec(s || ''); return m ? +m[1] : -1; };
const noInkBg = await page.evaluate(() => window.MAPS.filter(m => !m.inkBg).map(m => m.id));
const expectDark = codexIds.filter(id => noInkBg.includes(id)).slice().sort();
const darkIds = rows.filter(r => r.s.darkBase).map(r => r.id).slice().sort();
ok(darkIds.length === expectDark.length && eq(darkIds, expectDark),
   '深底判定与数据层一致（' + expectDark.length + ' 张无 inkBg 的增补图）', { darkIds, expectDark });
ok(rows.every(r => inkR(r.s.paletteInk) > 20 && inkR(r.s.paletteInk) < 130),
   N + ' 张配景统一回归淡墨区（废止第99轮深底白墨 >170 的临时方案）',
   rows.map(r => ({ id:r.id, ink:inkR(r.s.paletteInk) })).slice(0, 6));
ok(rows.every(r => inkR(r.s.focusInk) > 0 && inkR(r.s.focusInk) < inkR(r.s.paletteInk)),
   N + ' 张主景统一比配景更黑（浅底/深底不再分两套色板）',
   rows.map(r => ({ id:r.id, focus:inkR(r.s.focusInk), decor:inkR(r.s.paletteInk) })).slice(0, 6));
console.log('   E 组覆盖:', JSON.stringify({ maps: rows.length, arcs: Object.keys(byArc), uniqDecor, uniqLm, uniqTerrain, tones: tones.length, dark: darkIds.length }));

console.log('\n== F 构图化：主景 / 聚落 / 留白 / 笔法 ==');
const fMism = [];
for (const r of rows) {
  const c = codex[r.id].composition, s = r.s;
  if (!c) { fMism.push(r.id + ': 台账缺 composition'); continue; }
  if (!s.composition) { fMism.push(r.id + ': 运行时缺 composition'); continue; }
  if (s.composition.layout !== c.layout || s.composition.breath !== c.breath ||
      s.composition.clusters !== c.clusters || s.composition.focusCase !== c.focusCase ||
      s.composition.focusScale !== c.focusScale || !eq(s.composition.palette, c.palette))
    fMism.push(r.id + ': composition 字段不符');
  if (!s.focus || !s.focus.hasSpr) fMism.push(r.id + ': 主景精灵缺失');
  else {
    if (s.focus.kind !== c.focusCase) fMism.push(r.id + ': 主景形状不符');
    if (s.focus.s !== c.focusScale) fMism.push(r.id + ': 主景倍率不符');
    if (s.focus.y >= 0) fMism.push(r.id + ': 主景压到中央玩法区');
  }
  const kinds = Object.keys(s.decorKinds || {});
  if (kinds.length > 3) fMism.push(r.id + ': 装饰种类未收窄 (' + kinds.length + ')');
  if (kinds.some(k => !c.palette.includes(k))) fMism.push(r.id + ': 出现 palette 之外的装饰');
}
ok(fMism.length === 0, N + ' 张构图参数逐字段等于台账；主景唯一定位、装饰按 palette 收窄', fMism);
const uniqComp = new Set(rows.map(r => JSON.stringify(r.s.composition))).size;
ok(uniqComp === N, N + ' 张构图各不相同（不再是同一套均匀撒点）', { uniqComp });
const focusKinds = [...new Set(rows.map(r => r.s.focus && r.s.focus.kind))];
ok(focusKinds.length >= 8, '主景形状 ≥8 类（第二批新增 furnace / ship / reef）', focusKinds);
const counts = rows.map(r => ({ id: r.id, breath: r.s.composition.breath, n: r.s.decorCount, nn: r.s.decorNN }));
const maxN = Math.max(...counts.map(x => x.n));
// 阈值不写死 70：装饰数本身由 composition（clusters / breath）决定，每加一批就可能出新高，
// 硬编码等于每批都要跟着改数字。这里守的是「留白意图」这条不变式：
// 峰值必须仍低于旧版约 90 个均匀撒点，且全库中位数明显低于峰值（说明大多数图仍是疏的）。
const sortedN = counts.map(x => x.n).sort((a, b) => a - b);
const medN = sortedN[Math.floor(sortedN.length / 2)];
ok(maxN < 90 && medN < 55,
   '留白生效：装饰数峰值 ' + maxN + ' 仍低于旧版约 90 个均匀撒点，全库中位数 ' + medN + '（聚落成丛 + 大片空 chunk）',
   { maxN, medN, top: [...counts].sort((a, b) => b.n - a.n).slice(0, 3) });
const avg = a => a.length ? a.reduce((s, x) => s + x.n, 0) / a.length : 0;
const b3 = counts.filter(x => x.breath === 3), b2 = counts.filter(x => x.breath === 2);
ok(avg(b3) < avg(b2), 'breath=3（高山雾 / 密闭石屋）比 breath=2 更疏', { b3: +avg(b3).toFixed(1), b2: +avg(b2).toFixed(1) });
const nn = counts.map(x => x.nn).filter(x => typeof x === 'number' && isFinite(x));
ok(nn.length >= N - 4 && nn.reduce((s, x) => s + x, 0) / nn.length < 90,
   '聚落成丛：同种装饰最近邻距离中位数 < 90px（组半径 48px，非均匀撒点）',
   { maps: nn.length, avgNN: +(nn.reduce((s, x) => s + x, 0) / nn.length).toFixed(1), samples: counts.slice(0, 5) });
const layouts = [...new Set(rows.map(r => r.s.composition.layout))];
ok(layouts.length >= 6, '章法覆盖 ≥6 种（中轴/斜势/压角/环抱/空灵/夹景/横带）', layouts);
console.log('   F 组覆盖:', JSON.stringify({ uniqComp, focusKinds: focusKinds.length, layouts, maxN, avgNN: +(nn.reduce((s, x) => s + x, 0) / nn.length).toFixed(1) }));

console.log('\n== G 纸性统一：标杆 qixuan 的浅宣纸铺到 ' + N + ' 张 ==');
const qInk = await page.evaluate(() => (window.MAPS.find(m => m.id === 'qixuan') || {}).inkBg || null);
ok(rows.every(r => r.s.styleLoaded === true), '风格基线 window.MAP_CODEX_STYLE 已加载',
   rows.filter(r => !r.s.styleLoaded).map(r => r.id));
ok(!!qInk && rows.every(r => r.s.paper && r.s.paper.base === qInk.base &&
     r.s.paper.a === qInk.a && r.s.paper.b === qInk.b),
   '纸色三元组逐字等于标杆 qixuan.inkBg（不是另配一套米色）', { qInk, sample: rows[0].s.paper });
const patched = rows.filter(r => r.s.paperPat).map(r => r.id).slice().sort();
const native = rows.filter(r => !r.s.paperPat);
ok(patched.length === expectDark.length && eq(patched, expectDark),
   expectDark.length + ' 张原深底图补铺宣纸，与缺 inkBg 的数据层清单完全一致', { patched, expectDark });
ok(native.length === N - expectDark.length && native.every(r => !r.s.darkBase),
   (N - expectDark.length) + ' 张原生浅纸图零改动（不重复铺纸、不改 buildGrass）', native.map(r => r.id));
if (untrackedId !== undefined) {
  ok(sOff.paperPat === false && sOff.styleLoaded === true,
     '未收录 ' + offIds.length + ' 张不铺纸、不触发新填充（风格基线是全局只读配置）', { paperPat: sOff.paperPat });
} else {
  ok(offIds.length === 0, '凡人三界全收录：无未收录图，纸性补铺逻辑无需对短路样本生效', { off: offIds.length });
}
// 深底图每帧多 1 次 fillRect（宣纸 + 贴地），仍是整屏填充而非逐格瓦片
await enter('shiku', 'guigu');
const dFillDark = await page.evaluate(() => {
  const c = document.getElementById('game').getContext('2d');
  const orig = c.fillRect; let n = 0;
  c.fillRect = function (...a) { n++; return orig.apply(this, a); };
  window.__FR.scenery3Enable(true); window.__FR.renderOnce();
  n = 0; window.__FR.renderOnce(); const on = n;
  window.__FR.scenery3Enable(false); window.__FR.renderOnce();
  n = 0; window.__FR.renderOnce(); const off = n;
  c.fillRect = orig; window.__FR.scenery3Enable(true);
  return on - off;
});
ok(dFillDark === 2, '原深底图每帧恰好 +2 fillRect（宣纸 + 贴地），仍非逐格瓦片', { dFillDark });
console.log('   G 组覆盖:', JSON.stringify({ styleLoaded: rows[0].s.styleLoaded, paper: rows[0].s.paper,
  patched: patched.length, native: native.length, dFillDark }));

console.log('\n== H UI 柔化：只在浅宣纸上退到纸后 ==');
const softOn = rows.filter(r => r.s.uiSoft === true).map(r => r.id).sort();
ok(softOn.length === N && softOn.every(x => codexIds.includes(x)),
   N + ' 张收录图 + 水墨皮挂上 body.sc3-paper，HUD 进入柔化态', { n: softOn.length });
ok(rows.every(r => r.s.uiSoft === r.s.softRing),
   'CSS 作用域与 canvas 法阵柔化同一开关（不会只柔一半）',
   rows.filter(r => r.s.uiSoft !== r.s.softRing).map(r => r.id));
if (untrackedId !== undefined) {
  ok(sOff.uiSoft === false && sOff.softRing === false,
     '未收录 ' + offIds.length + ' 张深底图不挂 class、提示圈保持原强度', { uiSoft: sOff.uiSoft, softRing: sOff.softRing });
} else {
  ok(offIds.length === 0, '凡人三界全收录：无未收录图，HUD 柔化作用域无需验证短路样本', { off: offIds.length });
}
await enter('houshan', 'jin');
const jinSoft = await page.evaluate(() => ({ cls: document.body.classList.contains('sc3-paper'), s: window.__FR.scenery3() }));
ok(jinSoft.cls === false && jinSoft.s.uiSoft === false && jinSoft.s.softRing === false,
   '鎏金皮不柔化（作用域限定 data-skin=guigu）', { cls: jinSoft.cls, uiSoft: jinSoft.s.uiSoft });
await enter('xuechi', 'guigu');
const hud = await page.evaluate(() => {
  const q = document.querySelector('#quickbar .qb');
  const pip = document.querySelector('#skillrow .pip');
  const hp = document.getElementById('hpwrap');
  const cs = (e) => e ? getComputedStyle(e) : null;
  return {
    qbs: document.querySelectorAll('#quickbar .qb').length, pips: document.querySelectorAll('#skillrow .pip').length,
    qbW: q && Math.round(q.getBoundingClientRect().width), qbH: q && Math.round(q.getBoundingClientRect().height),
    qbShadow: cs(q) && cs(q).boxShadow, hpShadow: cs(hp) && cs(hp).boxShadow,
    pipShadow: cs(pip) && cs(pip).boxShadow,
    hpFill: cs(document.getElementById('hpfill')) && cs(document.getElementById('hpfill')).backgroundImage
  };
});
ok(hud.qbs === 3 && hud.qbW === 46 && hud.qbH === 46 && hud.pips > 0,
   '三格快捷钮与技能栏全在、点击热区 46×46 不变（只改外观不删元素）', hud);
ok(hud.qbShadow === 'none' && hud.hpShadow === 'none' && hud.pipShadow === 'none',
   '双重墨框 / 投影 / 纸签阴影全部去掉', { qb: hud.qbShadow, hp: hud.hpShadow, pip: hud.pipShadow });
ok(!/178,\s*58,\s*44/.test(hud.hpFill || ''),
   '血条不再是鲜红硬色块（改淡墨飞白）', hud.hpFill);
const hudOff = await page.evaluate(() => {
  document.body.classList.remove('sc3-paper');
  const v = getComputedStyle(document.querySelector('#quickbar .qb')).boxShadow;
  document.body.classList.add('sc3-paper');
  return v;
});
ok(hudOff !== 'none' && hudOff.length > 4,
   '摘掉 class 立即回到原硬边双框 UI（可一键回退）', hudOff);

console.log('\n== I 逐图幽暗：血池 / 黑煞教单独调 ==');
const moodIds = ['xuechi', 'heisha'];
const withMood = rows.filter(r => r.s.mood).map(r => r.id).sort();
ok(withMood.length === 2 && eq(withMood, moodIds.slice().sort()),
   'mood 只落在 xuechi / heisha，其余 ' + (N - 2) + ' 张完全短路', withMood);
ok(rows.filter(r => !r.s.mood).every(r => r.s.moodTile === false && r.s.moodA === null),
   '无 mood 的 ' + (N - 2) + ' 张不烘积墨罩、渲染层零开销',
   rows.filter(r => !r.s.mood && (r.s.moodTile || r.s.moodA)).map(r => r.id));
for (const id of moodIds) {
  const s = rows.find(r => r.id === id).s, c = codex[id].mood;
  ok(s.mood && s.mood.gloom === c.gloom && s.mood.vignette === c.vignette &&
     s.mood.haze === c.haze && s.mood.focusInk === c.focusInk,
     id + ' 四项 mood 参数逐字段等于台账', { s: s.mood, c });
  ok(s.moodTile === true && s.moodA && s.moodA.solidPixels === 0 &&
     s.moodA.distinctAlpha >= 20 && s.moodA.maxAlpha > 60 && s.moodA.maxAlpha < 170,
     id + ' 积墨罩是连续软边（无实心像素、多档 alpha、不涂黑）', s.moodA);
}
const inkOf = (s) => { const m = /rgba\((\d+),/.exec(s.focusInk || ''); return m ? +m[1] : 999; };
const qRow = rows.find(r => r.id === 'qixuan');
ok(inkOf(rows.find(r => r.id === 'xuechi').s) < inkOf(qRow.s) &&
   inkOf(rows.find(r => r.id === 'heisha').s) < inkOf(qRow.s),
   '幽暗图主景浓墨比标杆更黑（focusInk 生效）',
   { qixuan: inkOf(qRow.s), xuechi: inkOf(rows.find(r => r.id === 'xuechi').s), heisha: inkOf(rows.find(r => r.id === 'heisha').s) });
ok(qRow.s.mood === null && qRow.s.moodTile === false && qRow.s.uiSoft === true,
   '标杆 qixuan 零回归：无积墨罩，只有 HUD 柔化', { mood: qRow.s.mood, moodTile: qRow.s.moodTile });
await enter('xuechi', 'guigu');
const dMood = await page.evaluate(() => {
  const a = window.__FR.scenery3().moodDraws;
  window.__FR.renderOnce(); window.__FR.renderOnce();
  const b = window.__FR.scenery3().moodDraws;
  window.__FR.scenery3Enable(false); window.__FR.renderOnce(); window.__FR.renderOnce();
  const c = window.__FR.scenery3().moodDraws;
  window.__FR.scenery3Enable(true);
  return { on: b - a, off: c - b };
});
ok(dMood.on === 2 && dMood.off === 0,
   '积墨罩每帧恰好 1 次 drawImage；关掉三层后 0 次（不残留）', dMood);
console.log('   I 组覆盖:', JSON.stringify({ withMood, moodA: rows.find(r => r.id === 'xuechi').s.moodA, dMood }));

console.log('\n== J 分批自动启用：加一张台账就自动启用一张（白名单源码零改动）==');
const metaQ = await page.evaluate(() => ({
  total: Object.keys(window.MAP_CODEX).length,
  b1: Object.values(window.MAP_CODEX).filter(x => x.batch === 1).length,
  b2: Object.values(window.MAP_CODEX).filter(x => x.batch === 2).length,
  b3: Object.values(window.MAP_CODEX).filter(x => x.batch === 3).length,
  b4: Object.values(window.MAP_CODEX).filter(x => x.batch === 4).length,
  b5: Object.values(window.MAP_CODEX).filter(x => x.batch === 5).length,
  b6: Object.values(window.MAP_CODEX).filter(x => x.batch === 6).length,
  b7: Object.values(window.MAP_CODEX).filter(x => x.batch === 7).length,
  b8: Object.values(window.MAP_CODEX).filter(x => x.batch === 8).length,
  focusKinds: window.MAP_CODEX_STYLE.quant.focusKinds,
  layouts: window.MAP_CODEX_STYLE.quant.layouts
}));
ok(metaQ.total === N && metaQ.b1 === b1Ids.length && metaQ.b2 === b2Ids.length &&
   metaQ.b3 === b3Ids.length && metaQ.b4 === b4Ids.length && metaQ.b5 === b5Ids.length &&
   metaQ.b6 === b6Ids.length && metaQ.b7 === b7Ids.length && metaQ.b8 === b8Ids.length &&
   N === metaQ.b1 + metaQ.b2 + metaQ.b3 + metaQ.b4 + metaQ.b5 + metaQ.b6 + metaQ.b7 + metaQ.b8,
   '真源已扩到 ' + N + ' 张（' + metaQ.b1 + ' + ' + metaQ.b2 + ' + ' + metaQ.b3 + ' + ' + metaQ.b4 + ' + ' + metaQ.b5 +
   ' + ' + metaQ.b6 + ' + ' + metaQ.b7 + ' + ' + metaQ.b8 + '），batch 字段逐批进机读产物，八批加起来正好等于收录数', metaQ);
const gameSrc = fs.readFileSync(join(root, 'js/game.js'), 'utf8');
ok(/SC3_SAMPLE\s*=\s*new Set\(SC3_CODEX \? Object\.keys\(SC3_CODEX\)/.test(gameSrc) &&
   !/SC3_SAMPLE\s*=\s*new Set\(\[/.test(gameSrc),
   '白名单仍由 Object.keys(MAP_CODEX) 生成，源码里没有写死图数或图名名单');
const b2Rows = b2Ids.map(id => rows.find(r => r.id === id));
ok(b2Rows.every(r => r && r.s.on && r.s.mapId === r.id && r.s.decorScheme &&
                     r.s.landmarks.every(l => l.hasSpr) && r.s.terrainPat),
   '第二批 11 张全部自动启用并烘出装饰 / 地标精灵 / 贴地层（未改 game.js 白名单逻辑）',
   b2Rows.filter(r => !r || !r.s.on).map(r => r && r.id));
ok(eq(expectPatched, expectDark),
   '纸性分组由真源 hasInkBg 驱动，与数据层 inkBg 清单逐字一致（不再手写名单）',
   { truth: expectPatched, data: expectDark });
const b2Comp = new Set(b2Rows.map(r => JSON.stringify(r.s.composition))).size;
ok(b2Comp === b2Ids.length && b2Rows.every(r => r.s.focus && r.s.focus.hasSpr && r.s.focus.y < 0),
   '第二批 11 张构图各不相同、主景全部避开中央玩法区', { b2Comp });
for (const [id, kind] of [['zhuji', 'furnace'], ['kuixing', 'ship'], ['ningcui', 'reef']]) {
  const s = rows.find(r => r.id === id).s;
  ok(s.focus && s.focus.kind === kind && s.focus.hasSpr && s.focus.s === codex[id].composition.focusScale,
     id + ' 新主景 ' + kind + ' 已烘焙且倍率等于台账', s.focus);
}
ok(metaQ.focusKinds === focusKinds.length && metaQ.layouts === layouts.length,
   '主景形状 ' + focusKinds.length + ' 类、章法 ' + layouts.length + ' 种，风格基线量化值与运行时逐字一致',
   { metaQ, runtimeFocus: focusKinds.length, runtimeLayouts: layouts.length });
ok(qRow.s.composition.focusCase === 'narrowgate' && qRow.s.uiSoft === true && qRow.s.mood === null,
   '标杆 qixuan 零回归：构图 / 柔化 / 无积墨罩三项不变', qRow.s.composition);

console.log('\n== K 视觉边界：mood.signature 专属笔法 + 玩法层临时 UI ==');
const sigExpect = { xuechi: 'bubblingPool', heisha: 'bloodOverhead' };
for (const [id, sig] of Object.entries(sigExpect)) {
  const s = rows.find(r => r.id === id).s;
  ok(codex[id].mood.signature === sig && s.mood && s.mood.signature === sig,
     id + ' mood.signature 真源与运行时一致（' + sig + '）',
     { truth: codex[id].mood.signature, runtime: s.mood && s.mood.signature });
  ok(s.moodSignature === sig,
     id + ' 专属笔法确实画进积墨罩（烘焙探针，不只是数据里挂着）', { drawn: s.moodSignature });
  ok(s.moodA && s.moodA.solidPixels === 0 && s.moodA.distinctAlpha >= 20,
     id + ' 叠加专属笔法后仍是连续软边（无实心像素、多档 alpha）', s.moodA);
}
ok(rows.filter(r => !sigExpect[r.id]).every(r => r.s.mood === null && r.s.moodSignature === null),
   '其余 ' + (N - 2) + ' 张无专属笔法、无残留（切图不会带上一张的 signature）',
   rows.filter(r => !sigExpect[r.id] && (r.s.mood || r.s.moodSignature)).map(r => r.id));
await enter('xuechi', 'guigu');
const ui2 = await page.evaluate(() => {
  const b = document.getElementById('banner');
  const d = document.querySelector('.chat-dove');
  const i = document.querySelector('.chat-wrap #chatInput');
  const cs = e => e ? getComputedStyle(e) : null;
  return {
    hasB: !!b, hasD: !!d, hasI: !!i,
    bBg: cs(b) && cs(b).backgroundColor, bShadow: cs(b) && cs(b).boxShadow,
    dBg: cs(d) && cs(d).backgroundColor, dShadow: cs(d) && cs(d).boxShadow,
    dW: d && Math.round(d.getBoundingClientRect().width), dH: d && Math.round(d.getBoundingClientRect().height),
    iBg: cs(i) && cs(i).backgroundColor
  };
});
ok(ui2.hasB && ui2.hasD && ui2.hasI,
   '#banner / .chat-dove / #chatInput 三处元素都在（只改外观不删 DOM）',
   { b: ui2.hasB, d: ui2.hasD, i: ui2.hasI });
ok(ui2.bShadow === 'none' && ui2.dShadow === 'none',
   '剧情横幅与飞鸽圆钮的投影退掉', { banner: ui2.bShadow, dove: ui2.dShadow });
ok(/244,\s*239,\s*224/.test(ui2.bBg || '') && /244,\s*239,\s*224/.test(ui2.dBg || '') &&
   /244,\s*239,\s*224/.test(ui2.iBg || ''),
   '三处都换成同款浅宣纸半透明底', { banner: ui2.bBg, dove: ui2.dBg, input: ui2.iBg });
ok(ui2.dW === 44 && ui2.dH === 44,
   '飞鸽圆钮点击热区 44×44 不变', { w: ui2.dW, h: ui2.dH });
const ui2off = await page.evaluate(() => {
  document.body.classList.remove('sc3-paper');
  const b = getComputedStyle(document.getElementById('banner')).boxShadow;
  const d = getComputedStyle(document.querySelector('.chat-dove')).boxShadow;
  document.body.classList.add('sc3-paper');
  return { b, d };
});
ok(ui2off.b !== 'none' && ui2off.d !== 'none',
   '摘掉 class 立即回到原投影样式（可一键回退）', ui2off);
console.log('   J/K 组覆盖:', JSON.stringify({ metaQ, b2: b2Ids.length, b2Comp, sig: Object.values(sigExpect), ui2 }));

console.log('\n== L 第三批：21 张自动启用 + 6 个新主景的像素级证据 ==');
ok(N === sumBatches && offIds.length === allIds.length - N,
   '收录 ' + N + ' 张（首批 ' + b1Ids.length + ' / 第二批 ' + b2Ids.length + ' / 第三批 ' + b3Ids.length +
   ' / 第四批 ' + b4Ids.length + ' / 第五批 ' + b5Ids.length + ' / 第六批 ' + b6Ids.length +
   ' / 第七批 ' + b7Ids.length + ' / 第八批 ' + b8Ids.length + '），未收录 ' + offIds.length + ' 张仍完全短路（Jerry 禁止全量铺开）',
   { N, b1: b1Ids.length, b2: b2Ids.length, b3: b3Ids.length, b4: b4Ids.length, b5: b5Ids.length, b6: b6Ids.length, b7: b7Ids.length, b8: b8Ids.length, sum: sumBatches, off: offIds.length });
const b3Rows = b3Ids.map(id => rows.find(r => r.id === id));
ok(b3Rows.every(r => r && r.s.on && r.s.mapId === r.id && r.s.decorScheme &&
                     r.s.landmarks.every(l => l.hasSpr) && r.s.terrainPat && r.s.styleLoaded),
   '第三批 21 张全部自动启用并烘出装饰 / 地标精灵 / 贴地层（白名单逻辑零改动）',
   b3Rows.filter(r => !r || !r.s.on).map(r => r && r.id));
ok(b3Rows.every(r => typeof codex[r.id].batch === 'number' && codex[r.id].batch === 3 &&
                     typeof codex[r.id].hasInkBg === 'boolean'),
   '第三批 21 张机读产物全部带 batch=3 / hasInkBg 布尔（纸性不靠手写名单）');
const b3Comp = new Set(b3Rows.map(r => JSON.stringify(r.s.composition))).size;
ok(b3Comp === b3Ids.length && b3Rows.every(r => r.s.focus && r.s.focus.hasSpr && r.s.focus.y < 0),
   '第三批 21 张构图各不相同、主景全部避开中央玩法区（不是按 arc E/F 套同一套外观）', { b3Comp });
const NEW3 = ['floatingpalace','bamboostand','deadsea','stoneroom','stormpeak','clanhall'];
ok(NEW3.every(k => focusKinds.includes(k)) &&
   metaQ.focusKinds === focusKinds.length && new Set(rows.map(r => r.s.focus && r.s.focus.kind)).size === focusKinds.length,
   '6 个第三批新 case 全部在运行时出现，且当前 ' + focusKinds.length + ' 类形状每类都有图在用',
   { runtime: focusKinds.length, meta: metaQ.focusKinds });
// 像素级：不是「hasSpr=true 就万事大吉」，必须有可见笔触、连续 alpha、且没有实心直角墨块
for (const [id, kind] of [['xutian','floatingpalace'], ['miaoyin','bamboostand'], ['bianhai','deadsea'],
                          ['shixiao','stoneroom'], ['yinming','stormpeak'], ['fujia','clanhall']]) {
  const s = rows.find(r => r.id === id).s;
  ok(s.focus && s.focus.kind === kind && s.focus.hasSpr && s.focusA &&
     s.focusA.nonZero > 300 && s.focusA.distinctAlpha >= 6 && s.focusA.solidPixels === 0,
     id + ' 新主景 ' + kind + ' 像素级非空白：多档软 alpha、无实心直角块', s.focusA);
}
ok(rows.filter(r => r.s.focus && NEW3.includes(r.s.focus.kind))
       .every(r => r.s.focusA && r.s.focusA.nonZero > 300 && r.s.focusA.solidPixels === 0),
   '6 个新主景涉及的 ' + rows.filter(r => r.s.focus && NEW3.includes(r.s.focus.kind)).length +
   ' 张图逐张都有可见笔触（没有空白烘焙）');
ok(eq(expectPatched, expectDark) && expectPatched.length + (N - expectPatched.length) === N &&
   ['luoyunyaoyuan','fujia','huixiang'].every(id => expectPatched.includes(id)),
   '纸性分组动态口径继续成立：' + expectPatched.length + ' 张补铺宣纸 / ' + (N - expectPatched.length) +
   ' 张原生浅纸，与数据层 inkBg 清单逐字一致',
   { patched: expectPatched.length, native: N - expectPatched.length, data: expectDark.length });
ok(/SC3_SAMPLE\s*=\s*new Set\(SC3_CODEX \? Object\.keys\(SC3_CODEX\)/.test(gameSrc) &&
   !/SC3_SAMPLE\s*=\s*new Set\(\[/.test(gameSrc),
   '第三批之后白名单仍由 Object.keys(MAP_CODEX) 生成，源码里没有补写任何图名或图数');
ok(qRow.s.composition.focusCase === 'narrowgate' && qRow.s.mood === null &&
   qRow.s.focus.kind === 'narrowgate' && qRow.s.uiSoft === true,
   '标杆 qixuan 零回归：新增 6 类主景 / 21 张构图都没动它的章法与积墨', qRow.s.composition);
// 交付口径一致性：仓库外的唯一真源可读时才验，保证 fanren 单独 clone 也能跑完前 11 组
const truthPath = join(root, '..', 'mapCodex.json');
if (fs.existsSync(truthPath)) {
  const truth = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
  const t3 = truth.maps.filter(m => m.batch === 3);
  ok(t3.length === 21 && t3.every(m => m.source && m.refs && m.refs.length && m.canon &&
        m.quotes && m.quotes.length && m.diff && m.composition && m.landmarks.length),
     '真源层：第三批 21 张逐图带 source / refs / canon / quotes / diff / composition / landmarks',
     t3.filter(m => !(m.quotes && m.quotes.length)).map(m => m.id));
  ok(truth.maps.length === N && !!truth.meta.stage8 && /20261105L/.test(truth.meta.stage8.status),
     '真源 ' + N + ' 张，meta.stage8 状态与交付版本 20261105L 对齐',
     { maps: truth.maps.length, quotes: truth.maps.reduce((n, m) => n + m.quotes.length, 0), stage8: truth.meta.stage8 && truth.meta.stage8.status });
  const html = fs.readFileSync(join(root, 'index.html'), 'utf8');
  const swSrc = fs.readFileSync(join(root, 'sw.js'), 'utf8');
  // 版本号不写死：要求 index.html 与 sw.js 自洽（否则每次 bump 都要改断言，等于自废闸门）
  const htmlVer = (html.match(/sw\.js\?v=(20\d{6}[A-Z])/) || [])[1];
  const swVer = (swSrc.match(/const BUILD = '([^']+)'/) || [])[1];
  const verHits = htmlVer ? (html.match(new RegExp(htmlVer, 'g')) || []).length : 0;
  ok(!!htmlVer && htmlVer === swVer && verHits === 31,
     'index.html 31 处版本号与 sw.js BUILD 自洽（当前 ' + (htmlVer || '未找到') + '）',
     { html: verHits, sw: swVer });
} else {
  console.log('   （仓库外唯一真源不可读，跳过 3 条交付口径断言；前 12 组不受影响）');
}
console.log('   L 组覆盖:', JSON.stringify({ b3: b3Ids.length, b3Comp, newCases: NEW3,
  focusKinds: focusKinds.length, patched: expectPatched.length }));

console.log('\n== M 第四批：人界篇收官 + 7 个新主景的像素级证据 ==');
ok(b1Ids.length + b2Ids.length + b3Ids.length + b4Ids.length === 69 &&
   b1Ids.length === 18 && b2Ids.length === 11 && b3Ids.length === 21 && b4Ids.length === 19,
   '人界篇 69 张（18 + 11 + 21 + 19）＝第一卷～第七卷全篇收口；第五批另收灵界篇 I/J 19 张',
   { b1: b1Ids.length, b2: b2Ids.length, b3: b3Ids.length, b4: b4Ids.length, b5: b5Ids.length });
ok(offIds.length === allIds.length - N && offIds.every(id => arcs[id] === 'M'),
   '剩余 ' + offIds.length + ' 张全部落在 arc M（灵界篇最末一段，第七批收完 arc L 之后仅剩末批）',
   { off: offIds.length,
     bad: offIds.filter(id => arcs[id] !== 'M').slice(0, 8),
     dist: offIds.reduce((a, id) => (a[arcs[id]] = (a[arcs[id]] || 0) + 1, a), {}) });
const b4Rows = b4Ids.map(id => rows.find(r => r.id === id));
ok(b4Rows.every(r => r && r.s.on && r.s.mapId === r.id && r.s.decorScheme &&
                     r.s.landmarks.every(l => l.hasSpr) && r.s.terrainPat && r.s.styleLoaded),
   '第四批 19 张全部自动启用并烘出装饰 / 地标精灵 / 贴地层（白名单逻辑第 3 次零改动）',
   b4Rows.filter(r => !r || !r.s.on).map(r => r && r.id));
ok(b4Rows.every(r => typeof codex[r.id].batch === 'number' && codex[r.id].batch === 4 &&
                     typeof codex[r.id].hasInkBg === 'boolean'),
   '第四批 19 张机读产物全部带 batch=4 / hasInkBg 布尔（纸性仍由真源驱动，不手写名单）');
const b4Comp = new Set(b4Rows.map(r => JSON.stringify(r.s.composition))).size;
ok(b4Comp === b4Ids.length && b4Rows.every(r => r.s.focus && r.s.focus.hasSpr && r.s.focus.y < 0),
   '第四批 19 张构图各不相同、主景全部避开中央玩法区（不是按 arc G/H 套同一套外观）', { b4Comp });
const NEW4 = ['battleline', 'desertruin', 'grasscamp', 'pagoda', 'icewall', 'thunderhead', 'featherfall'];
ok(focusKinds.length === 24 && NEW4.every(k => focusKinds.includes(k)) &&
   metaQ.focusKinds === 24 && new Set(rows.map(r => r.s.focus && r.s.focus.kind)).size === 24,
   '主景形状 17→24 类，7 个新 case 全部在运行时出现且 24 类每类都有图在用',
   { runtime: focusKinds.length, meta: metaQ.focusKinds, missing: NEW4.filter(k => !focusKinds.includes(k)) });
// 像素级：新 case 光有 hasSpr 不算数，必须有可见笔触、连续 alpha、且没有实心直角墨块
for (const [id, kind] of [['bianjie','battleline'], ['jixi','desertruin'], ['mulan','grasscamp'],
                          ['zhenmo','pagoda'], ['xiaoji','icewall'], ['tianlan','thunderhead'],
                          ['kunpeng','featherfall']]) {
  const s = rows.find(r => r.id === id).s;
  ok(s.focus && s.focus.kind === kind && s.focus.hasSpr && s.focusA &&
     s.focusA.nonZero > 300 && s.focusA.distinctAlpha >= 6 && s.focusA.solidPixels === 0,
     id + ' 新主景 ' + kind + ' 像素级非空白：多档软 alpha、无实心直角块', s.focusA);
}
const new4Rows = rows.filter(r => r.s.focus && NEW4.includes(r.s.focus.kind));
ok(new4Rows.length >= 7 && new4Rows.every(r => r.s.focusA && r.s.focusA.nonZero > 300 && r.s.focusA.solidPixels === 0),
   '7 个新主景涉及的 ' + new4Rows.length + ' 张图逐张都有可见笔触（没有空白烘焙 / 没有 fallback 到旧形状）');
ok(expectPatched.length >= 16 && eq(expectPatched, expectDark),
   '纸性分组动态口径继续成立：' + expectPatched.length + ' 张补铺宣纸 / ' + (N - expectPatched.length) + ' 张原生浅纸，与数据层 inkBg 清单逐字一致',
   { patched: expectPatched.length, native: N - expectPatched.length, data: expectDark.length });
ok(/SC3_SAMPLE\s*=\s*new Set\(SC3_CODEX \? Object\.keys\(SC3_CODEX\)/.test(gameSrc) &&
   !/SC3_SAMPLE\s*=\s*new Set\(\[/.test(gameSrc),
   '第四批之后白名单仍由 Object.keys(MAP_CODEX) 生成，源码里没有补写任何图名或图数');
if (fs.existsSync(truthPath)) {
  const truth = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
  const t4 = truth.maps.filter(m => m.batch === 4);
  ok(t4.length === 19 && t4.every(m => m.source && m.refs && m.refs.length && m.canon &&
        m.quotes && m.quotes.length && m.diff && m.composition && m.landmarks.length &&
        typeof m.hasInkBg === 'boolean'),
     '真源层：第四批 19 张逐图带 source / refs / canon / quotes / diff / composition / landmarks / hasInkBg',
     t4.filter(m => !(m.quotes && m.quotes.length && m.composition)).map(m => m.id));
  ok(truth.meta.counts.maps === N && truth.meta.style.quant.focusKinds === 24 &&
     !!truth.meta.stage8 && /20261105L/.test(truth.meta.stage8.status),
     '真源 meta.counts 与运行时收录数一致、style.quant 24 类不变、stage8 仍记录第四批交付版本 20261105L',
     { counts: truth.meta.counts, runtime: N, focusKinds: truth.meta.style.quant.focusKinds, stage8: truth.meta.stage8 && truth.meta.stage8.status });
} else {
  console.log('   （仓库外唯一真源不可读，跳过 2 条真源层断言；前 12 组不受影响）');
}
ok(qRow.s.composition.focusCase === 'narrowgate' && qRow.s.mood === null &&
   qRow.s.focus.kind === 'narrowgate' && qRow.s.uiSoft === true && qRow.s.paperPat === false,
   '标杆 qixuan 零回归：新增 7 类主景 / 19 张构图都没动它的章法、积墨与原生浅纸',
   { comp: qRow.s.composition, mood: qRow.s.mood, paperPat: qRow.s.paperPat });
console.log('   M 组覆盖:', JSON.stringify({ b4: b4Ids.length, b4Comp, newCases: NEW4,
  focusKinds: focusKinds.length, patched: expectPatched.length, native: N - expectPatched.length,
  offArcs: offIds.reduce((a, id) => (a[arcs[id]] = (a[arcs[id]] || 0) + 1, a), {}) }));

console.log('\n== N 第五批：19 张自动启用 + 灵界篇前两段收口 + 16 类主景复用既有的像素级证据 ==');
ok(b5Ids.length === 19 && b5Ids.every(id => codex[id].batch === 5 && typeof codex[id].hasInkBg === 'boolean'),
   '第五批 19 张机读产物全部带 batch=5 / hasInkBg 布尔（纸性仍由真源驱动）', { b5: b5Ids.length });
const b5Rows = b5Ids.map(id => rows.find(r => r.id === id));
ok(b5Rows.every(r => r && r.s.on && r.s.mapId === r.id && r.s.decorScheme &&
                     r.s.landmarks.every(l => l.hasSpr) && r.s.terrainPat && r.s.styleLoaded),
   '第五批 19 张全部自动启用并烘出装饰 / 地标精灵 / 贴地层（白名单逻辑第 4 次零改动）',
   b5Rows.filter(r => !r || !r.s.on).map(r => r && r.id));
const b5Comp = new Set(b5Rows.map(r => JSON.stringify(r.s.composition))).size;
ok(b5Comp === b5Ids.length && b5Rows.every(r => r.s.focus && r.s.focus.hasSpr && r.s.focus.y < 0),
   '第五批 19 张构图各不相同、主景全部避开中央玩法区', { b5Comp });
const b5Kinds = [...new Set(b5Rows.map(r => r.s.focus && r.s.focus.kind))];
ok(b5Kinds.length === 16 && b5Kinds.every(k => focusKinds.includes(k)) &&
   new Set(rows.map(r => r.s.focus && r.s.focus.kind)).size === focusKinds.length && focusKinds.length === 24,
   '第五批 16 类主景全部复用既有 24 类（sc3Bake 无需新增 case）、24 类每类都有图在用',
   { b5Kinds, runtime: focusKinds.length, meta: metaQ.focusKinds });
const REP5 = [['qinluo','desertruin'],['anyuan','narrowgate'],['luori','stonering'],['shanku','thunderhead'],
              ['tianyuan','clanhall'],['lingdi','pagoda'],['muzu','grove'],['zhenchan','pool'],
              ['tianpeng','floatingpalace'],['minghe','deadsea'],['lianxu','minehead'],['yuyang','stonehut'],
              ['yuyang_dou','battleline'],['fengyuan','stormpeak'],['huohu','reef'],['guanghan','icewall']];
for (const [id, kind] of REP5) {
  const s = rows.find(r => r.id === id).s;
  ok(s.focus && s.focus.kind === kind && s.focus.hasSpr && s.focusA &&
     s.focusA.nonZero > 300 && s.focusA.distinctAlpha >= 6 && s.focusA.solidPixels === 0,
     id + ' 主景 ' + kind + ' 像素级非空白：多档软 alpha、无实心直角块', s.focusA);
}
ok(expectPatched.includes('yuyang') && expectPatched.includes('yuyang_dou') &&
   expectPatched.length >= 16 && expectPatched.length + (N - expectPatched.length) === N && eq(expectPatched, expectDark),
   '纸性分组含第五批 yuyang / yuyang_dou：' + expectPatched.length + ' 张补铺宣纸 / ' + (N - expectPatched.length) + ' 张原生浅纸，与数据层 inkBg 清单逐字一致',
   { patched: expectPatched.length, native: N - expectPatched.length, data: expectDark.length });
ok(/SC3_SAMPLE\s*=\s*new Set\(SC3_CODEX \? Object\.keys\(SC3_CODEX\)/.test(gameSrc) &&
   !/SC3_SAMPLE\s*=\s*new Set\(\[/.test(gameSrc),
   '第五批之后白名单仍由 Object.keys(MAP_CODEX) 生成，源码里没有补写任何图名或图数');
ok(qRow.s.composition.focusCase === 'narrowgate' && qRow.s.mood === null &&
   qRow.s.focus.kind === 'narrowgate' && qRow.s.uiSoft === true && qRow.s.paperPat === false,
   '标杆 qixuan 零回归：第五批新增 16 类主景 / 19 张构图都没动它的章法、积墨与原生浅纸',
   { comp: qRow.s.composition, mood: qRow.s.mood, paperPat: qRow.s.paperPat });
console.log('   N 组覆盖:', JSON.stringify({ b5: b5Ids.length, b5Comp, b5Kinds: b5Kinds.length,
  patched: expectPatched.length, native: N - expectPatched.length }));

console.log('\n== O 第六批：19 张自动启用 + arc K 魔界之战收口 + 主景全复用既有 24 类 ==');
ok(b6Ids.length === 19 && b6Ids.every(id => codex[id].batch === 6 && typeof codex[id].hasInkBg === 'boolean'),
   '第六批 19 张机读产物全部带 batch=6 / hasInkBg 布尔（纸性仍由真源驱动，未手写名单）', { b6: b6Ids.length });
const b6Rows = b6Ids.map(id => rows.find(r => r.id === id));
ok(b6Rows.every(r => r && r.s.on && r.s.mapId === r.id && r.s.decorScheme &&
                     r.s.landmarks.every(l => l.hasSpr) && r.s.terrainPat && r.s.styleLoaded),
   '第六批 19 张全部自动启用并烘出装饰 / 地标精灵 / 贴地层（白名单逻辑第 5 次零改动）',
   b6Rows.filter(r => !r || !r.s.on).map(r => r && r.id));
const b6Comp = new Set(b6Rows.map(r => JSON.stringify(r.s.composition))).size;
ok(b6Comp === b6Ids.length && b6Rows.every(r => r.s.focus && r.s.focus.hasSpr && r.s.focus.y < 0),
   '第六批 19 张构图各不相同、主景全部避开中央玩法区', { b6Comp });
const b6Kinds = [...new Set(b6Rows.map(r => r.s.focus && r.s.focus.kind))];
ok(b6Kinds.length === 13 && b6Kinds.every(k => focusKinds.includes(k)) &&
   new Set(rows.map(r => r.s.focus && r.s.focus.kind)).size === focusKinds.length && focusKinds.length === 24,
   '第六批 13 类主景全部复用既有 24 类（sc3Bake 无需新增 case）、24 类每类都有图在用',
   { b6Kinds, runtime: focusKinds.length, meta: metaQ.focusKinds });
const REP6 = [['linghuang','clanhall'],['liangzu','clanhall'],['jiuxian','stormpeak'],['heiyu','narrowgate'],
              ['longjia','stonering'],['shengdao','pagoda'],['zhenling','clanhall'],['mojie','narrowgate'],
              ['diyuan2','stoneroom'],['moban','battleline'],['yitian','battleline'],['huangquan','pool'],
              ['tianzhan','floatingpalace'],['xueya','clanhall'],['huanxiao','desertruin'],['moyuan','thunderhead'],
              ['modajie','pool'],['lanpu','shed'],['muzu2','grove']];
for (const [id, kind] of REP6) {
  const s = rows.find(r => r.id === id).s;
  ok(s.focus && s.focus.kind === kind && s.focus.hasSpr && s.focusA &&
     s.focusA.nonZero > 300 && s.focusA.distinctAlpha >= 6 && s.focusA.solidPixels === 0,
     id + ' 主景 ' + kind + ' 像素级非空白：多档软 alpha、无实心直角块', s.focusA);
}
// 全灰阶纪律：台账里没有任何颜色字段，色相只能由 inkTone 灰度推导（不落彩色）
const COLORISH = /^(r|g|b|rgb|rgba|hex|color|colors|hue|saturat|tint|fill|stroke)$/i;
const colorKeys = [];
for (const id of b6Ids) for (const k of Object.keys(codex[id])) if (COLORISH.test(k)) colorKeys.push(id + '.' + k);
for (const id of b6Ids) for (const k of Object.keys(codex[id].composition || {})) if (COLORISH.test(k)) colorKeys.push(id + '.composition.' + k);
ok(colorKeys.length === 0, '全灰阶纪律：第六批 19 张台账不含任何颜色字段，观感只由 inkTone / tone 灰度决定', colorKeys);
ok(/SC3_SAMPLE\s*=\s*new Set\(SC3_CODEX \? Object\.keys\(SC3_CODEX\)/.test(gameSrc) &&
   !/SC3_SAMPLE\s*=\s*new Set\(\[/.test(gameSrc),
   '第六批之后白名单仍由 Object.keys(MAP_CODEX) 生成，源码里没有补写任何图名或图数');
if (fs.existsSync(truthPath)) {
  const truth6 = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
  const t6 = truth6.maps.filter(m => m.batch === 6);
  ok(t6.length === 19 && t6.every(m => m.arc === 'K' && m.source && m.refs && m.refs.length && m.canon &&
        m.canon.length >= 40 && m.quotes && m.quotes.length && m.diff && m.composition && m.landmarks.length &&
        typeof m.hasInkBg === 'boolean'),
     '真源层：第六批 19 张全 arc=K，逐图带 source / refs / canon(≥40字) / quotes / diff / composition / landmarks / hasInkBg',
     t6.filter(m => !(m.quotes && m.quotes.length && m.composition && m.canon && m.canon.length >= 40)).map(m => m.id));
  ok(truth6.meta.counts.maps === N && truth6.meta.counts.batch6 === 19 && truth6.meta.style.quant.focusKinds === 24 &&
     !!truth6.meta.stage9 && /20261106N/.test(truth6.meta.stage9.status),
     '真源 meta：counts.maps / batch6 与运行时一致，style.quant 仍 24 类，stage9 记录第六批交付版本 20261106N',
     { counts: truth6.meta.counts, runtime: N, stage9: truth6.meta.stage9 && truth6.meta.stage9.status });
} else {
  console.log('   （仓库外唯一真源不可读，跳过 2 条第六批真源层断言）');
}
ok(qRow.s.composition.focusCase === 'narrowgate' && qRow.s.mood === null &&
   qRow.s.focus.kind === 'narrowgate' && qRow.s.uiSoft === true && qRow.s.paperPat === false,
   '标杆 qixuan 零回归：第六批 19 张构图没动它的章法、积墨与原生浅纸',
   { comp: qRow.s.composition, mood: qRow.s.mood, paperPat: qRow.s.paperPat });
console.log('   O 组覆盖:', JSON.stringify({ b6: b6Ids.length, b6Comp, b6Kinds: b6Kinds.length,
  focusKinds: focusKinds.length, patched: expectPatched.length, native: N - expectPatched.length }));

console.log('\n== P 第七批：30 张自动启用 + arc L 真仙降临收口 + 主景全复用既有 24 类 ==');
ok(b7Ids.length === 30 && b7Ids.every(id => codex[id].batch === 7 && typeof codex[id].hasInkBg === 'boolean'),
   '第七批 30 张机读产物全部带 batch=7 / hasInkBg 布尔（纸性仍由真源驱动，未手写名单）', { b7: b7Ids.length });
const b7Rows = b7Ids.map(id => rows.find(r => r.id === id));
ok(b7Rows.every(r => r && r.s.on && r.s.mapId === r.id && r.s.decorScheme &&
                     r.s.landmarks.every(l => l.hasSpr) && r.s.terrainPat && r.s.styleLoaded),
   '第七批 30 张全部自动启用并烘出装饰 / 地标精灵 / 贴地层（白名单逻辑第 6 次零改动）',
   b7Rows.filter(r => !r || !r.s.on).map(r => r && r.id));
const b7Comp = new Set(b7Rows.map(r => JSON.stringify(r.s.composition))).size;
ok(b7Comp === b7Ids.length && b7Rows.every(r => r.s.focus && r.s.focus.hasSpr && r.s.focus.y < 0),
   '第七批 30 张构图各不相同、主景全部避开中央玩法区', { b7Comp });
const b7Kinds = [...new Set(b7Rows.map(r => r.s.focus && r.s.focus.kind))];
ok(b7Kinds.length === 17 && b7Kinds.every(k => focusKinds.includes(k)) &&
   new Set(rows.map(r => r.s.focus && r.s.focus.kind)).size === focusKinds.length && focusKinds.length === 24,
   '第七批 17 类主景全部复用既有 24 类（sc3Bake 第七批零新增 case）、24 类每类都有图在用',
   { b7Kinds, runtime: focusKinds.length, meta: metaQ.focusKinds });
// 逐类代表图（17 类各一张，全批 30 张里同一类最多 4 张：clanhall / battleline / thunderhead / pool）
const REP7 = [['zhandacheng','stormpeak'],['heihu','pagoda'],['baiguang','icewall'],['shengshi','ship'],
              ['sanjie','thunderhead'],['dashengdian','clanhall'],['shiyin','desertruin'],['lingzu','grove'],
              ['xiaoxiuluo','floatingpalace'],['helian','temple'],['tiandinggong','narrowgate'],
              ['qiangzhe','battleline'],['zhenxian','stonering'],['xianshi','pool'],['tianmo','stoneroom'],
              ['huimoyuan','deadsea'],['huirenjie','minehead']];
for (const [id, kind] of REP7) {
  const s = rows.find(r => r.id === id).s;
  ok(s.focus && s.focus.kind === kind && s.focus.hasSpr && s.focusA &&
     s.focusA.nonZero > 300 && s.focusA.distinctAlpha >= 6 && s.focusA.solidPixels === 0,
     id + ' 主景 ' + kind + ' 像素级非空白：多档软 alpha、无实心直角块', s.focusA);
}
// 全灰阶纪律：第七批 30 张台账同样不得出现任何颜色字段
const colorKeys7 = [];
for (const id of b7Ids) for (const k of Object.keys(codex[id])) if (COLORISH.test(k)) colorKeys7.push(id + '.' + k);
for (const id of b7Ids) for (const k of Object.keys(codex[id].composition || {})) if (COLORISH.test(k)) colorKeys7.push(id + '.composition.' + k);
ok(colorKeys7.length === 0, '全灰阶纪律：第七批 30 张台账不含任何颜色字段，观感只由 inkTone / tone 灰度决定', colorKeys7);
ok(expectPatched.length === 23 && eq(expectPatched, expectDark) &&
   ['zhandacheng','heihu','baiguang','shengshi','tianmo','huirenjie'].every(id => expectPatched.includes(id)) &&
   expectPatched.length + (N - expectPatched.length) === N,
   '纸性分组含第七批 6 张缺墨底图（zhandacheng / heihu / baiguang / shengshi / tianmo / huirenjie 按 hasInkBg=false 补铺宣纸）：' + expectPatched.length + ' 张补铺宣纸 / ' + (N - expectPatched.length) + ' 张原生浅纸，与数据层 inkBg 清单逐字一致',
   { patched: expectPatched.length, native: N - expectPatched.length, data: expectDark.length });
ok(/SC3_SAMPLE\s*=\s*new Set\(SC3_CODEX \? Object\.keys\(SC3_CODEX\)/.test(gameSrc) &&
   !/SC3_SAMPLE\s*=\s*new Set\(\[/.test(gameSrc),
   '第七批之后白名单仍由 Object.keys(MAP_CODEX) 生成，源码里没有补写任何图名或图数');
if (fs.existsSync(truthPath)) {
  const truth7 = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
  const t7 = truth7.maps.filter(m => m.batch === 7);
  ok(t7.length === 30 && t7.every(m => m.arc === 'L' && m.source && m.refs && m.refs.length && m.canon &&
        m.canon.length >= 40 && m.quotes && m.quotes.length && m.diff && m.composition && m.landmarks.length &&
        typeof m.hasInkBg === 'boolean'),
     '真源层：第七批 30 张全 arc=L，逐图带 source / refs / canon(≥40字) / quotes / diff / composition / landmarks / hasInkBg',
     t7.filter(m => !(m.quotes && m.quotes.length && m.composition && m.canon && m.canon.length >= 40)).map(m => m.id));
  ok(truth7.meta.counts.maps === N && truth7.meta.counts.batch7 === 30 &&
     truth7.meta.counts.batch1 + truth7.meta.counts.batch2 + truth7.meta.counts.batch3 + truth7.meta.counts.batch4 +
     truth7.meta.counts.batch5 + truth7.meta.counts.batch6 + truth7.meta.counts.batch7 + truth7.meta.counts.batch8 === N &&
     truth7.meta.style.quant.focusKinds === 24,
     '真源 meta：counts.maps / batch7 与运行时一致，八批 counts 相加等于收录数，style.quant 仍 24 类',
     { counts: truth7.meta.counts, runtime: N });
  // 版本号同样不写死：真源记的「第七批交付版本」必须是合法 build token，且不晚于当前构建
  // （写死 /20261106P/ 的话，第八批 bump 到 Q 这条断言就得跟着改，等于自废闸门）
  const htmlVer7 = (fs.readFileSync(join(root, 'index.html'), 'utf8').match(/sw\.js\?v=(20\d{6}[A-Z])/) || [])[1];
  const stage10Tok = (String((truth7.meta.stage10 || {}).status || '').match(/(20\d{6}[A-Z])/) || [])[1];
  ok(!!truth7.meta.stage10 && !!stage10Tok && !!htmlVer7 &&
     stage10Tok.length === htmlVer7.length && stage10Tok <= htmlVer7,
     '真源 meta.stage10 记录第七批交付版本 ' + (stage10Tok || '缺失') + '，不晚于当前构建 ' + (htmlVer7 || '未找到'),
     { stage10: truth7.meta.stage10 && truth7.meta.stage10.status, build: htmlVer7 });
  // 引用自洽（第七批口径）：章号 + 卷名必须与原著索引吻合，防止「下标当章号」的老毛病回潮
  const idxPath = join(root, '..', '_scratch', 'novel-index.json');
  if (fs.existsSync(idxPath)) {
    const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    const chapters = (idx.ren && idx.ren.chapters) || [];
    const byTitle0 = new Map();
    for (const c of chapters) { if (!byTitle0.has(c.title)) byTitle0.set(c.title, []); byTitle0.get(c.title).push(c); }
    const D = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    const num = (s) => {
      let total = 0, cur = 0;
      for (const ch of s) {
        if (D[ch] !== undefined) cur = D[ch];
        else if (ch === '十') { total += (cur || 1) * 10; cur = 0; }
        else if (ch === '百') { total += (cur || 1) * 100; cur = 0; }
        else if (ch === '千') { total += (cur || 1) * 1000; cur = 0; }
      }
      return total + cur;
    };
    const bad = [];
    let checked7 = 0;
    const scan7 = (label, ref) => {
      const mm = String(ref || '').match(/^(.*?)第([一二三四五六七八九十百千零两]+)章(?:《(.+?)》)?/);
      if (!mm || !mm[3]) return;                     // 无章号或无标题（文档引用）→ 不归本闸门管
      checked7++;
      const written = num(mm[2]), title = mm[3];
      const cand = byTitle0.get(title);
      if (!cand) { bad.push(label + ' 章标题查无《' + title + '》'); return; }
      const scored = cand.map(c => ({ n: num(c.label || ''), d: Math.abs(num(c.label || '') - written) }))
                         .sort((x, y) => x.d - y.d);
      if (scored[0].d !== 0) bad.push(label + ' 章号 ' + written + ' 与《' + title + '》实际第 ' + scored[0].n + ' 章不符');
    };
    for (const m of t7) {
      (m.refs || []).forEach((r, i) => scan7(m.id + '.refs[' + i + ']', r));
      (m.quotes || []).forEach((q, i) => scan7(m.id + '.quotes[' + i + ']', q.ref));
    }
    ok(bad.length === 0 && checked7 >= 60,
       '第七批引用自洽：' + checked7 + ' 条「第X章《标题》」章号与原著索引逐条吻合（防「下标当章号」回潮）',
       { checked: checked7, bad: bad.slice(0, 6) });
  } else {
    console.log('   （原著索引不可读，跳过第七批引用自洽断言）');
  }
} else {
  console.log('   （仓库外唯一真源不可读，跳过 3 条第七批真源层断言）');
}
ok(qRow.s.composition.focusCase === 'narrowgate' && qRow.s.mood === null &&
   qRow.s.focus.kind === 'narrowgate' && qRow.s.uiSoft === true && qRow.s.paperPat === false,
   '标杆 qixuan 零回归：第七批 30 张构图没动它的章法、积墨与原生浅纸',
   { comp: qRow.s.composition, mood: qRow.s.mood, paperPat: qRow.s.paperPat });
console.log('   P 组覆盖:', JSON.stringify({ b7: b7Ids.length, b7Comp, b7Kinds: b7Kinds.length,
  focusKinds: focusKinds.length, patched: expectPatched.length, native: N - expectPatched.length,
  offArcs: offIds.reduce((a, id) => (a[arcs[id]] = (a[arcs[id]] || 0) + 1, a), {}) }));

console.log('\n== Q 第八批：34 张自动启用 + 仙界篇收口 + 主景全复用既有 24 类 ==');
ok(b8Ids.length === 34 && b8Ids.every(id => codex[id].batch === 8 &&
                     typeof codex[id].hasInkBg === 'boolean'),
   '第八批 34 张机读产物全部 batch=8 / hasInkBg 布尔（arc=M / side=false 由真源层 truth8 验收，不进渲染层 window.MAP_CODEX）',
   { b8: b8Ids.length });
const b8Rows = b8Ids.map(id => rows.find(r => r.id === id));
ok(b8Rows.every(r => r && r.s.on && r.s.mapId === r.id && r.s.decorScheme &&
                     r.s.landmarks.every(l => l.hasSpr) && r.s.terrainPat && r.s.styleLoaded),
   '第八批 34 张全部自动启用并烘出装饰 / 地标精灵 / 贴地层（白名单逻辑第 7 次零改动）',
   b8Rows.filter(r => !r || !r.s.on).map(r => r && r.id));
const b8Comp = new Set(b8Rows.map(r => JSON.stringify(r.s.composition))).size;
ok(b8Comp === b8Ids.length && b8Rows.every(r => r.s.focus && r.s.focus.hasSpr && r.s.focus.y < 0),
   '第八批 34 张构图各不相同、主景全部避开中央玩法区（不是按 arc M 套同一套外观）', { b8Comp });
const b8Kinds = [...new Set(b8Rows.map(r => r.s.focus && r.s.focus.kind))];
ok(b8Kinds.length === 18 && b8Kinds.every(k => focusKinds.includes(k)) &&
   new Set(rows.map(r => r.s.focus && r.s.focus.kind)).size === focusKinds.length && focusKinds.length === 24,
   '第八批 18 类主景全部复用既有 24 类（sc3Bake 第八批零新增 case）、24 类每类仍有图在用',
   { b8Kinds, runtime: focusKinds.length, meta: metaQ.focusKinds });
// 逐类代表图（18 类各一张）：光有 hasSpr 不算数，必须有可见笔触、连续 alpha、且没有实心直角墨块
const REP8 = [['shuiyan','bamboostand'],['xingqi','battleline'],['wumengdao','clanhall'],['linghuan','deadsea'],
              ['dadi','desertruin'],['jingong','floatingpalace'],['xianyun','grove'],['shijin','minehead'],
              ['tiangui','narrowgate'],['chulong','pagoda'],['xiaoping','pool'],['xiedao','reef'],
              ['poxu','ship'],['taisui','stonering'],['suxing','stoneroom'],['lingyan','stormpeak'],
              ['suidian','temple'],['leihai','thunderhead']];
for (const [id, kind] of REP8) {
  const s = rows.find(r => r.id === id).s;
  ok(s.focus && s.focus.kind === kind && s.focus.hasSpr && s.focusA &&
     s.focusA.nonZero > 300 && s.focusA.distinctAlpha >= 6 && s.focusA.solidPixels === 0,
     id + ' 主景 ' + kind + ' 像素级非空白：多档软 alpha、无实心直角块', s.focusA);
}
const new8Rows = rows.filter(r => r.s.focus && REP8.some(([, k]) => k === r.s.focus.kind));
ok(new8Rows.length >= 18 && new8Rows.every(r => r.s.focusA && r.s.focusA.nonZero > 300 && r.s.focusA.solidPixels === 0),
   '第八批 18 类主景涉及的 ' + new8Rows.length + ' 张图逐张都有可见笔触（没有空白烘焙 / 没有 fallback 到旧形状）');
// 全灰阶纪律：第八批 34 张台账同样不得出现任何颜色字段
const colorKeys8 = [];
for (const id of b8Ids) for (const k of Object.keys(codex[id])) if (COLORISH.test(k)) colorKeys8.push(id + '.' + k);
for (const id of b8Ids) for (const k of Object.keys(codex[id].composition || {})) if (COLORISH.test(k)) colorKeys8.push(id + '.composition.' + k);
ok(colorKeys8.length === 0, '全灰阶纪律：第八批 34 张台账不含任何颜色字段，观感只由 inkTone / tone 灰度决定', colorKeys8);
ok(eq(expectPatched, expectDark) && expectPatched.length + (N - expectPatched.length) === N,
   '纸性分组动态口径继续成立：' + expectPatched.length + ' 张补铺宣纸 / ' + (N - expectPatched.length) + ' 张原生浅纸，与数据层 inkBg 清单逐字一致',
   { patched: expectPatched.length, native: N - expectPatched.length, data: expectDark.length });
ok(/SC3_SAMPLE\s*=\s*new Set\(SC3_CODEX \? Object\.keys\(SC3_CODEX\)/.test(gameSrc) &&
   !/SC3_SAMPLE\s*=\s*new Set\(\[/.test(gameSrc),
   '第八批之后白名单仍由 Object.keys(MAP_CODEX) 生成，源码里没有补写任何图名或图数');
if (fs.existsSync(truthPath)) {
  const truth8 = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
  const t8 = truth8.maps.filter(m => m.batch === 8);
  ok(t8.length === 34 && t8.every(m => m.arc === 'M' && m.side === false && m.source && m.refs && m.refs.length && m.canon &&
        m.canon.length >= 40 && m.quotes && m.quotes.length && m.diff && m.composition && m.landmarks.length &&
        typeof m.hasInkBg === 'boolean'),
     '真源层：第八批 34 张全 arc=M / side=false，逐图带 source / refs / canon(≥40字) / quotes / diff / composition / landmarks / hasInkBg',
     t8.filter(m => !(m.quotes && m.quotes.length && m.composition && m.canon && m.canon.length >= 40 && m.side === false)).map(m => m.id));
  ok(truth8.meta.counts.maps === N && truth8.meta.counts.batch8 === 34 &&
     truth8.meta.counts.batch1 + truth8.meta.counts.batch2 + truth8.meta.counts.batch3 + truth8.meta.counts.batch4 +
     truth8.meta.counts.batch5 + truth8.meta.counts.batch6 + truth8.meta.counts.batch7 + truth8.meta.counts.batch8 === N &&
     truth8.meta.style.quant.focusKinds === 24,
     '真源 meta：counts.maps / batch8 与运行时一致，八批 counts 相加等于收录数，style.quant 仍 24 类',
     { counts: truth8.meta.counts, runtime: N });
  // 引用自洽（第八批口径）：仙界篇章号 + 标题必须与原著索引吻合，防止「下标当章号」老毛病回潮
  const idxPath8 = join(root, '..', '_scratch', 'novel-index.json');
  if (fs.existsSync(idxPath8)) {
    const idx8 = JSON.parse(fs.readFileSync(idxPath8, 'utf8'));
    const chapters8 = (idx8.xian && idx8.xian.chapters) || [];
    const byTitle8 = new Map();
    for (const c of chapters8) { if (!byTitle8.has(c.title)) byTitle8.set(c.title, []); byTitle8.get(c.title).push(c); }
    const D8 = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    const num8 = (s) => {
      let total = 0, cur = 0;
      for (const ch of s) {
        if (D8[ch] !== undefined) cur = D8[ch];
        else if (ch === '十') { total += (cur || 1) * 10; cur = 0; }
        else if (ch === '百') { total += (cur || 1) * 100; cur = 0; }
        else if (ch === '千') { total += (cur || 1) * 1000; cur = 0; }
      }
      return total + cur;
    };
    const bad8 = [];
    let checked8 = 0;
    const scan8 = (label, ref) => {
      const mm = String(ref || '').match(/^(.*?)第([一二三四五六七八九十百千零两]+)章(?:《(.+?)》)?/);
      if (!mm || !mm[3]) return;                     // 无章号或无标题（文档引用）→ 不归本闸门管
      checked8++;
      const written = num8(mm[2]), title = mm[3];
      const cand = byTitle8.get(title);
      if (!cand) { bad8.push(label + ' 章标题查无《' + title + '》'); return; }
      const scored = cand.map(c => ({ n: num8(c.label || ''), d: Math.abs(num8(c.label || '') - written) }))
                         .sort((x, y) => x.d - y.d);
      if (scored[0].d !== 0) bad8.push(label + ' 章号 ' + written + ' 与《' + title + '》实际第 ' + scored[0].n + ' 章不符');
    };
    for (const m of t8) {
      (m.refs || []).forEach((r, i) => scan8(m.id + '.refs[' + i + ']', r));
      (m.quotes || []).forEach((q, i) => scan8(m.id + '.quotes[' + i + ']', (q && q.ref) || q));
    }
    ok(bad8.length === 0 && checked8 >= 60,
       '第八批引用自洽：' + checked8 + ' 条「第X章《标题》」章号与仙界篇索引逐条吻合（防「下标当章号」回潮）',
       { checked: checked8, bad: bad8.slice(0, 6) });
  } else {
    console.log('   （原著索引不可读，跳过第八批引用自洽断言）');
  }
  // 第八批交付记录存在且 build token 合法（actual bump 由 #376 落地，这里只验格式，不卡 <= 当前构建）
  const stage11Tok = (String((truth8.meta.stage11 || {}).status || '').match(/(20\d{6}[A-Z])/) || [])[1];
  ok(!!truth8.meta.stage11 && !!stage11Tok,
     '真源 meta.stage11 记录第八批交付版本 ' + (stage11Tok || '缺失') + '（build token 合法，actual bump 由 #376 落地）',
     { stage11: truth8.meta.stage11 && truth8.meta.stage11.status });
} else {
  console.log('   （仓库外唯一真源不可读，跳过 4 条第八批真源层断言）');
}
ok(qRow.s.composition.focusCase === 'narrowgate' && qRow.s.mood === null &&
   qRow.s.focus.kind === 'narrowgate' && qRow.s.uiSoft === true && qRow.s.paperPat === false,
   '标杆 qixuan 零回归：第八批 34 张构图没动它的章法、积墨与原生浅纸',
   { comp: qRow.s.composition, mood: qRow.s.mood, paperPat: qRow.s.paperPat });
console.log('   Q 组覆盖:', JSON.stringify({ b8: b8Ids.length, b8Comp, b8Kinds: b8Kinds.length,
  focusKinds: focusKinds.length, patched: expectPatched.length, native: N - expectPatched.length }));

console.log('\n== 运行期无 JS 报错 ==');
ok(errs.length === 0, '全程无 pageerror', errs);

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
