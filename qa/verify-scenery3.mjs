// 批次4 阶段二：逐图原著考据台账（window.MAP_CODEX）驱动的地图视觉层，常驻验收。
// 自带静态服务，独立于其它 QA 脚本的端口。
//
// 断言分五组：
//   A 路线约束：白名单 = 台账 18 张 key；171 张图只启用 18 张，未收录 153 张完全短路
//   B 三项指标：装饰类型 ≥12、地标 1~3 个且都有精灵、贴地层 pattern 存在、双皮各自烘焙
//   C 纯视觉：新层不写 G.zones / G.hazards（判定层零变化）
//   D 流畅度：同一张后山图开/关三层，A/B 量每帧绘制调用增量与帧耗
//   E 逐图一致性：18 张图的 decor / landmarks / terrain / tone 逐字段等于台账，且同 arc 内不再共用一套外观
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
  return page.evaluate(() => window.__FR.scenery3());
};

const codexIds = await page.evaluate(() => Object.keys(window.MAP_CODEX || {}));
const codex = await page.evaluate(() => window.MAP_CODEX);
const allIds = await page.evaluate(() => window.MAPS.map(m => m.id));
const arcs = await page.evaluate(() => Object.fromEntries(window.MAPS.map(m => [m.id, m.arc || null])));

console.log('\n== A 路线约束：逐图台账白名单（不全量铺开）==');
await enter('houshan', 'guigu');
const sOn = await page.evaluate(() => window.__FR.scenery3());
ok(sOn.codexLoaded === true && sOn.codexSize === 18, 'mapCodex.js 已加载且含 18 张逐图台账', { loaded: sOn.codexLoaded, size: sOn.codexSize });
ok(sOn.sample.length === codexIds.length && sOn.sample.every(x => codexIds.includes(x)),
   '白名单严格等于 MAP_CODEX 的 key（收录一张启用一张，不必改 game.js）', { sample: sOn.sample.length, codex: codexIds.length });
ok(allIds.length === 171 && sOn.sample.length === 18 && allIds.length - sOn.sample.length === 153,
   '171 张图只启用 18 张，其余 153 张保持短路（Jerry 明确禁止全量铺开）', { total: allIds.length, on: sOn.sample.length, off: allIds.length - sOn.sample.length });
ok(sOn.on === true && sOn.mapId === 'houshan', '收录图启用逐图视觉层', { on: sOn.on, mapId: sOn.mapId });
await enter('zhuji', 'guigu');   // arc C 黄枫谷·地火之屋：首批未收录
const sOff = await page.evaluate(() => window.__FR.scenery3());
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
ok(g.landmarks.every(l => l.hasSpr), 'P1-2 每个地标都烘焙出精灵（明度 0.45 + 软边罩走 blitSprOn）', g.landmarks);
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
ok(perf.dDraw >= 0 && perf.dDraw <= 3, 'P1-2 地标每帧 ≤3 次 drawImage（视锥裁剪生效）', { dDraw: perf.dDraw });
ok(perf.dMs < 1.0, '帧耗增量 < 1ms/帧（对照第83轮 6 特效 1.95ms 基线）', { dMs: perf.dMs });
ok(perf.on.ms < 3.0, '开启三层后整帧耗 < 3ms/帧', { ms: +perf.on.ms.toFixed(3) });

console.log('\n== E 逐图一致性：18 张台账 vs 运行时 ==');
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
ok(mism.length === 0, '18 张图的 decor / landmarks / terrain / tone 逐字段等于台账', mism);
const uniqDecor = new Set(rows.map(r => JSON.stringify(r.s.decorScheme))).size;
ok(uniqDecor === 18, '18 张图装饰权重表全部不同（不是共用一套外观）', { uniqDecor });
const uniqLm = new Set(rows.map(r => JSON.stringify(r.s.landmarks.map(l => l.name)))).size;
ok(uniqLm === 18, '18 张图地标名称全不相同（原著景物逐图指定）', { uniqLm });
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
// 深底适配：9 张无 inkBg 的增补图必须识别为深底，并把新层墨色抬到浅灰区（否则装饰被深底吞掉）
const darkFlags = rows.map(r => ({ id: r.id, dark: r.s.darkBase, ink: r.s.paletteInk }));
const darkIds = darkFlags.filter(x => x.dark).map(x => x.id);
const inkR = (s) => { const m = /rgba\((\d+)/.exec(s || ''); return m ? +m[1] : -1; };
const noInkBg = await page.evaluate(() => window.MAPS.filter(m => !m.inkBg).map(m => m.id));
const expectDark = codexIds.filter(id => noInkBg.includes(id));
ok(darkIds.length === 9 && eq(darkIds.slice().sort(), expectDark.slice().sort()),
   '深底判定与数据层一致（9 张无 inkBg 的增补图）', { darkIds, expectDark });
ok(darkFlags.filter(x => x.dark).every(x => inkR(x.ink) > 170),
   '深底图新层墨色已抬到浅灰区（装饰可见，不被深底吞掉）', darkFlags.filter(x => x.dark));
ok(darkFlags.filter(x => !x.dark).every(x => inkR(x.ink) < 120),
   '浅纸底图仍保持原淡墨（零回归）', darkFlags.filter(x => !x.dark).slice(0, 2));
console.log('   E 组覆盖:', JSON.stringify({ maps: rows.length, arcs: Object.keys(byArc), uniqDecor, uniqLm, uniqTerrain, tones: tones.length, dark: darkIds.length }));

console.log('\n== 运行期无 JS 报错 ==');
ok(errs.length === 0, '全程无 pageerror', errs);

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
