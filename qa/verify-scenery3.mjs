// 批次3（P1-2 地标 / P1-3 biome 装饰包 / P1-4 贴地明度块）常驻验收。
// 自带静态服务，独立于其它 QA 脚本的端口。
//
// 断言分四组：
//   A 路线约束：样板期白名单只含 houshan；非白名单图完全短路（on=false，不覆盖 decorScheme）
//   B 三项指标：装饰类型 ≥12、地标 1~3 个且都有精灵、贴地层 pattern 存在、双皮各自烘焙
//   C 纯视觉：新层不写 G.zones / G.hazards（判定层零变化）
//   D 流畅度：同一张后山图开/关三层，A/B 量每帧绘制调用增量与帧耗
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

const ctxp = await browser.newContext({ viewport: { width: 480, height: 900 } });
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

console.log('\n== A 路线约束：样板期白名单 ==');
await enter('houshan', 'guigu');
const sOn = await page.evaluate(() => window.__FR.scenery3());
ok(sOn.sample.length === 1 && sOn.sample[0] === 'houshan', '样板期白名单只含 houshan（后山样板图）', sOn.sample);
ok(sOn.on === true, '白名单图启用批次3 三层', { on: sOn.on, biome: sOn.biome });
await enter('qixuan', 'guigu');
const sOff = await page.evaluate(() => window.__FR.scenery3());
ok(sOff.on === false, '非白名单图完全短路（on=false）', { on: sOff.on });
ok(sOff.decorScheme === null && sOff.landmarks.length === 0 && sOff.terrainPat === false,
   '非白名单图不覆盖 decorScheme / 无地标 / 无贴地层（逐字节不变）', sOff);

console.log('\n== B 三项指标（墨皮 / 后山）==');
await enter('houshan', 'guigu');
const g = await page.evaluate(() => window.__FR.scenery3());
ok(g.types.length >= 12, 'P1-3 装饰类型 3 → ≥12', { n: g.types.length, types: g.types });
const newTypes = g.decorScheme ? g.decorScheme.map(x => x[0]) : [];
ok(newTypes.filter(t => !['tree','rock','tuft'].includes(t)).length >= 3,
   'biome 装饰权重表含 ≥3 种新装饰（不是只挂在常量里）', newTypes);
ok(g.landmarks.length >= 1 && g.landmarks.length <= 3, 'P1-2 地标每图 1~3 个', { n: g.landmarks.length });
ok(g.landmarks.every(l => l.hasSpr), 'P1-2 每个地标都烘焙出精灵（明度 0.45 + 软边罩走 blitSprOn）', g.landmarks);
ok(g.terrainPat === true, 'P1-4 贴地层 createPattern 已生成', { terrainPat: g.terrainPat });
ok(g.biome && g.skin === 'guigu', 'biome 分组与当前皮肤正确', { biome: g.biome, skin: g.skin });
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
ok(j.types.length === g.types.length && j.landmarks.length === g.landmarks.length,
   '两皮结构对等（类型数 / 地标数一致）', { guigu: g.types.length, jin: j.types.length });

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

console.log('\n== 运行期无 JS 报错 ==');
ok(errs.length === 0, '全程无 pageerror', errs);

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================\n');
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
