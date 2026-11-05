// 批次4 阶段二：逐图原著考据台账（window.MAP_CODEX）驱动的地图视觉层，常驻验收。
// 自带静态服务，独立于其它 QA 脚本的端口。
//
// 断言分十二组。第103轮起所有数量口径都从 window.MAP_CODEX 动态取，
// 不再写死 18 / 29 / 50 / 153 / 142 / 121 / 9 / 16，也不再拿某张固定 id 当「未收录图」——收录一张就少一张未收录。
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
//   L 第三批：21 张自动启用、6 个新主景像素级非空白、17 类形状全覆盖、纸性分组动态口径继续成立、标杆零回归
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
const expectPatched = codexIds.filter(id => codex[id].hasInkBg === false).slice().sort();
console.log('\n动态口径:', JSON.stringify({ total: allIds.length, on: N, off: offIds.length, b1: b1Ids.length, b2: b2Ids.length, b3: b3Ids.length, patched: expectPatched.length, untracked: untrackedId }));

console.log('\n== A 路线约束：逐图台账白名单（不全量铺开）==');
await enter('houshan', 'guigu');
const sOn = await page.evaluate(() => window.__FR.scenery3());
ok(sOn.codexLoaded === true && sOn.codexSize === N, 'mapCodex.js 已加载且含 ' + N + ' 张逐图台账', { loaded: sOn.codexLoaded, size: sOn.codexSize });
ok(sOn.sample.length === codexIds.length && sOn.sample.every(x => codexIds.includes(x)),
   '白名单严格等于 MAP_CODEX 的 key（收录一张启用一张，不必改 game.js）', { sample: sOn.sample.length, codex: codexIds.length });
ok(allIds.length === 171 && sOn.sample.length === N && offIds.length === allIds.length - N,
   '171 张图只启用 ' + N + ' 张，其余 ' + offIds.length + ' 张保持短路（Jerry 明确禁止全量铺开）', { total: allIds.length, on: sOn.sample.length, off: offIds.length });
ok(sOn.on === true && sOn.mapId === 'houshan', '收录图启用逐图视觉层', { on: sOn.on, mapId: sOn.mapId });
await enter(untrackedId, 'guigu');   // 动态挑一张真未收录图（zhuji 已在第二批收录，不能再当作短路样本）
const sOff = await page.evaluate(() => window.__FR.scenery3());
ok(!codexIds.includes(untrackedId) && untrackedId !== undefined, '未收录样本动态取自 allIds \\ MAP_CODEX', { untrackedId });
ok(sOff.on === false, '未收录图完全短路（on=false）', { on: sOff.on });
ok(sOff.decorScheme === null && sOff.landmarks.length === 0 && sOff.terrain === null && sOff.terrainPat === false,
   '未收录图不覆盖 decorScheme / 无地标 / 无贴地层（逐字节不变）', sOff);

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
ok(maxN < 70, '留白生效：装饰数远低于旧版约 90 个均匀撒点', { maxN, counts });
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
ok(sOff.paperPat === false && sOff.styleLoaded === true,
   '未收录 ' + offIds.length + ' 张不铺纸、不触发新填充（风格基线是全局只读配置）', { paperPat: sOff.paperPat });
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
ok(sOff.uiSoft === false && sOff.softRing === false,
   '未收录 ' + offIds.length + ' 张深底图不挂 class、提示圈保持原强度', { uiSoft: sOff.uiSoft, softRing: sOff.softRing });
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
  focusKinds: window.MAP_CODEX_STYLE.quant.focusKinds,
  layouts: window.MAP_CODEX_STYLE.quant.layouts
}));
ok(metaQ.total === N && metaQ.b1 === b1Ids.length && metaQ.b2 === b2Ids.length && metaQ.b3 === b3Ids.length &&
   b1Ids.length === 18 && b2Ids.length === 11 && b3Ids.length === 21,
   '真源已扩到 ' + N + ' 张（首批 18 + 第二批 11 + 第三批 21），batch 字段逐批进机读产物', metaQ);
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
ok(metaQ.focusKinds === 17 && focusKinds.length === metaQ.focusKinds && metaQ.layouts === 7 && layouts.length === metaQ.layouts,
   '主景形状 8→11→17 类、章法 7 种，风格基线量化值与运行时逐字一致',
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
ok(N === 50 && b1Ids.length === 18 && b2Ids.length === 11 && b3Ids.length === 21 && offIds.length === 121,
   '收录 50 张（首批 18 / 第二批 11 / 第三批 21），未收录 121 张仍完全短路（Jerry 禁止全量铺开）',
   { N, b1: b1Ids.length, b2: b2Ids.length, b3: b3Ids.length, off: offIds.length });
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
ok(focusKinds.length === 17 && NEW3.every(k => focusKinds.includes(k)) &&
   metaQ.focusKinds === 17 && new Set(rows.map(r => r.s.focus && r.s.focus.kind)).size === 17,
   '主景形状 11→17 类，6 个新 case 全部在运行时出现且 17 类都有图在用',
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
ok(expectPatched.length === 13 && eq(expectPatched, expectDark) &&
   ['luoyunyaoyuan','fujia','huixiang'].every(id => expectPatched.includes(id)),
   '纸性分组动态口径继续成立：13 张补铺宣纸（含第三批 3 张），与数据层 inkBg 清单逐字一致',
   { patched: expectPatched.length, data: expectDark.length });
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
  ok(truth.maps.length === 50 && truth.maps.reduce((n, m) => n + m.quotes.length, 0) === 183 &&
     !!truth.meta.stage7 && /20261105K/.test(truth.meta.stage7.status),
     '真源 50 张 / 183 条摘引，meta.stage7 状态与交付版本 20261105K 对齐',
     { maps: truth.maps.length, quotes: truth.maps.reduce((n, m) => n + m.quotes.length, 0), stage7: truth.meta.stage7 && truth.meta.stage7.status });
  const html = fs.readFileSync(join(root, 'index.html'), 'utf8');
  const swSrc = fs.readFileSync(join(root, 'sw.js'), 'utf8');
  ok((html.match(/20261105K/g) || []).length === 31 && /sw\.js\?v=20261105K/.test(html) &&
     /const BUILD = '20261105K'/.test(swSrc),
     'index.html 31 处版本号 + sw.js BUILD 均已 bump 到 20261105K',
     { html: (html.match(/20261105K/g) || []).length, sw: (swSrc.match(/const BUILD = '([^']+)'/) || [])[1] });
} else {
  console.log('   （仓库外唯一真源不可读，跳过 3 条交付口径断言；前 11 组不受影响）');
}
console.log('   L 组覆盖:', JSON.stringify({ b3: b3Ids.length, b3Comp, newCases: NEW3,
  focusKinds: focusKinds.length, patched: expectPatched.length }));

console.log('\n== 运行期无 JS 报错 ==');
ok(errs.length === 0, '全程无 pageerror', errs);

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
