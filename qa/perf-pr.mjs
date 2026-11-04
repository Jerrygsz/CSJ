// 三档渲染精度的开销对比：pr=1 / 2 / 3 下，空载、怪群、怪群+6特效 的同步渲染耗时
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const rows = [];

for (const pr of [1, 2, 3]) {
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1&pr=${pr}`, { waitUntil: 'load' });
  await p.waitForFunction(() => !!window.__FR && !!window.FX3, { timeout: 30000 });

  const r = await p.evaluate(() => {
    const FR = window.__FR, FX = window.FX3, G = FR.G;
    FR.skipStory(); FR.muteStory(true);
    FR.enterMap('houshan', 'easy');
    if (G.state !== 'play') G.state = 'play';
    FR.tickFrames(180, 1 / 60);

    const flush = () => { try { document.getElementById('game').getContext('2d').getImageData(0, 0, 1, 1); } catch (e) {} };
    const measure = (n, each) => {
      for (let i = 0; i < 30; i++) FR.render();     // 预热
      flush();
      const t0 = performance.now();
      for (let i = 0; i < n; i++) { if (each) each(i); FR.render(); }
      flush();
      return (performance.now() - t0) / n;
    };

    // A 空载
    FX.clear(); G.enemies.length = 0; G.parts.length = 0;
    const A = measure(60);

    // B 怪群
    FR.tickFrames(400, 1 / 60);
    const crowd = G.enemies.length;
    FX.clear();
    const B = measure(60);

    // C 怪群 + 6 特效
    const KEYS = ['hit', 'crit', 'poof', 'pickup', 'nova'];
    let sp = 0;
    const fill = () => {
      const p2 = G.player || { x: 0, y: 0 };
      while (FX.count() < 6) {
        const i = sp++;
        FX.spawn(KEYS[i % KEYS.length], p2.x + ((i * 37) % 150) - 75, p2.y + ((i * 53) % 120) - 60, { pal: 'qi' });
      }
    };
    FX.clear();
    const C = measure(60, () => { fill(); FX.update(1 / 60); });

    const cv = document.getElementById('game');
    return { A: +A.toFixed(2), B: +B.toFixed(2), C: +C.toFixed(2), crowd, w: cv.width, h: cv.height };
  });

  rows.push({ pr, 画布: r.w + '×' + r.h, 像素倍: +((r.w / 480) ** 2).toFixed(2), 空载: r.A, 怪群: r.B, 特效增量: +(r.C - r.B).toFixed(2), 合计: r.C });
  await p.close();
}

console.table(rows);
const base = rows[0];
console.log('\n相对 pr=1 的开销倍数：');
rows.forEach(r => console.log(`  pr=${r.pr}  空载 ×${(r.空载 / base.空载).toFixed(2)}  特效增量 ×${(r.特效增量 / base.特效增量).toFixed(2)}  合计 ×${(r.合计 / base.合计).toFixed(2)}`));
await b.close();
