// 实拍：批次12 · 重要横幅双皮 + HUD 卡门标签
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 400, height: 812 } });
const p = await ctx.newPage();
await p.goto('file:///D:/GitHub/CSJ/index.html?test=1', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 20000 });
await p.evaluate(() => {
  const F = window.__FR;
  F.muteStory && F.muteStory(true); F.skipStory && F.skipStory();
  F.enterMap && F.enterMap('houshan'); F.setSpawn && F.setSpawn(false); F.god && F.god(true);
  F.cultLevel(1);
  if (F.G.player) { F.G.player.xp = F.G.player.next - 0.2; F.G.player.level = 1; }
});
for (const skin of ['jin', 'guigu']) {
  await p.evaluate(s => { window.__FR.skin(s); window.__FR.notifyBig('成就解锁 · 道心通明'); }, skin);
  await p.waitForTimeout(200);
  await p.screenshot({ path: `qa/_out/b12/big-${skin}.png` });
}
await b.close();
console.log('done');
