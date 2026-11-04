// 特效预算实测：同屏 0 / 4 / 10 个 pixelfx 实例时的单帧耗时。
// 用法：node qa/perf-fxpix.mjs
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR);
await p.evaluate(() => {
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.skipStory(); window.__FR.muteStory(true);
  const g = window.__FR.G;
  g.enemies.length = 0; g.parts.length = 0;
  g.state = 'play';
  window.__FR.tickFrames(2, 0.05);
});

const measure = async (n) => p.evaluate((n) => {
  const g = window.__FR.G;
  FX3.clear(); g.parts.length = 0;
  // 循环补足 n 个实例（rune 是 4s 循环、其余一次性，所以每帧都补满再测）
  const keys = ['hit', 'crit', 'poof', 'pickup', 'nova', 'hit', 'crit', 'poof', 'pickup', 'nova'];
  const t0 = performance.now();
  for (let f = 0; f < 120; f++) {
    while (FX3.count() < n) FX3.spawn(keys[FX3.count() % keys.length], g.player.x + (FX3.count() * 17) % 160 - 80, g.player.y + (FX3.count() * 29) % 120 - 60, { pal: 'qi' });
    FX3.update(0.016);
    window.__FR.tickFrames(1, 0.016);
  }
  return (performance.now() - t0) / 120;
}, n);

const rows = [];
for (const n of [0, 3, 6]) rows.push([n, +(await measure(n)).toFixed(2)]);
// 纯 JS 合成耗时（不含浏览器绘制）：把 update 单独计时
const jsCost = await p.evaluate(() => {
  const g = window.__FR.G;
  FX3.clear();
  for (let i = 0; i < 6; i++) FX3.spawn(['hit','crit','poof','pickup','nova'][i % 5], g.player.x + i * 9, g.player.y, { pal: 'qi' });
  const t0 = performance.now();
  for (let f = 0; f < 300; f++) { FX3.update(0.016); if (FX3.count() < 6) FX3.spawn('rune', g.player.x, g.player.y, { pal: 'qi' }); }
  return (performance.now() - t0) / 300;
});
console.log(JSON.stringify({ 每帧毫秒: rows, 十实例仅合成耗时: +jsCost.toFixed(3) }, null, 2));
await b.close();
