// 渲染精度 A/B：同一帧、同一状态，分别用 pr=1 / pr=2 / pr=3 各截一张，用来判断清晰度收益
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const out = [];

for (const pr of [1, 2, 3]) {
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1&pr=${pr}`, { waitUntil: 'load' });
  await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });
  const info = await p.evaluate(() => {
    const FR = window.__FR;
    FR.skipStory(); FR.muteStory(true);
    FR.enterMap('houshan', 'easy');
    const G = FR.G;
    if (G.state !== 'play') G.state = 'play';
    FR.tickFrames(90, 1 / 60);
    const c = document.getElementById('game');
    return { cv: c.width + '×' + c.height, css: c.style.width + '×' + c.style.height, pr: c.width / 480 };
  });
  await p.waitForTimeout(260);
  await p.screenshot({ path: `qa/shots/pr-${pr}.png` });
  out.push({ pr, ...info });
  await p.close();
}
console.table(out);
await b.close();
