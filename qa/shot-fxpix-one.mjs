// 单特效特写：一次只放一个，裁到主角附近放大，判断「它和 14px 的角色是不是一套比例」。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 3 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR);

await p.evaluate(() => {
  window.__FR.enterMap('houshan', 'easy');
  window.__FR.skipStory(); window.__FR.muteStory(true);
  const g = window.__FR.G;
  g.enemies.length = 0; g.bullets.length = 0; g.parts.length = 0; g.ebullets.length = 0;
  g.state = 'play';
  window.__FR.tickFrames(2, 0.05);
});

const rect = await p.evaluate(() => {
  const r = document.getElementById('game').getBoundingClientRect();
  return { left: r.left, top: r.top, w: r.width, h: r.height };
});
const half = 70;
const crop = { x: Math.round(rect.left + rect.w / 2 - half), y: Math.round(rect.top + rect.h / 2 - half), width: half * 2, height: half * 2 };

await p.evaluate(() => { const b = document.getElementById('skinGuigu'); if (b) b.click(); window.__FR.tickFrames(2, 0.05); });
const rows = [];
for (const [key, pal] of [['poof', 'qi'], ['hit', 'jin'], ['crit', 'xue'], ['rune', 'qi'], ['nova', 'mo'], ['pickup', 'jin']]) {
  for (const t of [0.06, 0.18]) {
    await p.evaluate(({ key, pal, t }) => {
      const g = window.__FR.G, pl = g.player;
      FX3.clear();                          // 清干净上一批
      g.parts.length = 0;
      g.state = 'pause';
      FX3.spawn(key, pl.x, pl.y - 2, { pal, seed: 5 });
      FX3.update(t);
      window.__FR.tickFrames(1, 0.016);
    }, { key, pal, t });
    const f = `qa/shots/ink-${key}-${String(t).replace('.', '')}.png`;
    await p.screenshot({ path: f, clip: crop });
    rows.push(f);
  }
}
console.log(JSON.stringify({ rows, errs }));
await b.close();
