// pixelfx 接入的整屏验收：闪身（散形/现形）与 Boss 起手法阵，在两种皮下各截一张。
// 用法：node qa/shot-fxpix.mjs   （需先起本地服务，默认 8123）
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

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

const shot = async (name) => { await p.screenshot({ path: `qa/shots/${name}.png` }); return name; };
const out = [];

for (const [skin, tag] of [['jin', 'jin'], ['guigu', 'ink']]) {
  await p.evaluate((skin) => {
    const btn = document.getElementById(skin === 'guigu' ? 'skinGuigu' : 'skinJin');
    if (btn) btn.click();
    const g = window.__FR.G;
    if (window.FX3) FX3.clear();
    g.enemies.length = 0; g.parts.length = 0;
    g.state = 'play';
    g.player.hp = g.player.maxhp;
    window.__FR.tickFrames(2, 0.05);
  }, skin);

  // 闪身：起点散形 + 终点现形
  await p.evaluate(() => {
    const g = window.__FR.G;
    window.__FR.dash();
    window.__FR.tickFrames(7, 0.016);
    g.state = 'pause';
    window.__FR.tickFrames(1, 0.016);
  });
  out.push(await shot(`fx-dash-${tag}`));

  // Boss 起手法阵
  await p.evaluate(() => {
    const g = window.__FR.G;
    if (window.FX3) FX3.clear();
    g.state = 'play';
    g.boss = { x: g.player.x, y: g.player.y - 90, r: 26, hp: 999, maxhp: 999, name: '通灵傀儡', lv: 20, _dead: false };
    window.__FR.tickFrames(1, 0.016);
    if (window.FX3) FX3.spawn('rune', g.boss.x, g.boss.y + 14, { pal: 'mo' });
    if (window.FX3) FX3.update(0.5);
    g.state = 'pause';
    window.__FR.tickFrames(1, 0.016);
  });
  out.push(await shot(`fx-rune-${tag}`));
}

console.log(JSON.stringify({ out, errs }, null, 2));
await b.close();
