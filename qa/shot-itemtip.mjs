// 第94轮实拍：复现 Jerry 截图场景 —— 水墨皮洞府「炼丹」页，点开「妖丹」料名，
// 看「去哪取」卡片从近黑底变成淡墨纸底后，字是否读得清。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = process.env.PORT || 8123;

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('页面错误：', e.message));
await p.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });
await p.evaluate(() => window.__FR.save.clear());
await p.waitForTimeout(200);
await p.evaluate(() => location.reload());
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

await p.evaluate(() => {
  const key = 'fanren_save_v1';
  const s = JSON.parse(localStorage.getItem(key) || '{}');
  const all = window.ALL_ITEMS || [];
  const inv = {};
  for (const it of all) if (it.mat) inv[it.id] = 3;
  s.inventory = inv; s.stones = 1155;
  s.cultivate = { level: 12, xp: 0, skills: { sword: 2, fire: 2 } };
  s.caves = ['qixuan', 'huangfeng']; s.skin = 'guigu';
  s.unlocked = ['qixuan', 'huangfeng'];
  localStorage.setItem(key, JSON.stringify(s));
});
await p.evaluate(() => location.reload());
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const info = await p.evaluate(() => {
  const FR = window.__FR;
  FR.muteStory(true);
  document.body.dataset.skin = 'guigu';
  FR.cave('huangfeng');
  FR.caveTab('alchemy');
  const mat = document.querySelector('.mat.clk');
  const label = mat ? mat.textContent.trim() : '(无料名)';
  if (mat) mat.click();
  const tip = document.getElementById('itemTip');
  const cs = tip ? getComputedStyle(tip) : null;
  return {
    label, tipShown: !!(tip && cs && cs.display !== 'none'),
    bg: cs ? cs.backgroundColor : '', color: cs ? cs.color : '',
    text: tip ? tip.textContent.trim().slice(0, 70) : '',
  };
});
console.log('点开料名：', info.label);
console.log('提示卡：', info);
await p.waitForTimeout(350);
await p.screenshot({ path: 'qa/shots/cave-itemtip-after.png' });
console.log('已保存 qa/shots/cave-itemtip-after.png');
await b.close();
