// 水墨皮肤实拍：装备分组 / 功法分组 / 炼丹分组 / 进阶折叠 各一张
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8123/index.html?test=1', { waitUntil: 'load' });
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
  for (const slot of ['weapon', 'armor', 'trinket', 'talisman'])
    for (let r = 0; r <= 5; r++) {
      const pick = all.filter(i => i.slot === slot && i.rarity === r);
      if (pick.length) inv[pick[0].id] = 1;
    }
  const sk = {};
  for (const x of (window.SKILLS || [])) sk[x.id] = 3;
  s.inventory = inv; s.stones = 452937;
  s.cultivate = { level: 92, xp: 0, skills: sk };
  s.caves = ['qixuan', 'huangfeng']; s.skin = 'guigu';
  s.unlocked = Array.from(new Set([...(s.unlocked || []), 'qixuan', 'huangfeng']));
  localStorage.setItem(key, JSON.stringify(s));
});
await p.evaluate(() => location.reload());
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

await p.evaluate(() => {
  const FR = window.__FR;
  FR.muteStory(true);
  document.body.dataset.skin = 'guigu';
  FR.cave('huangfeng');
});

const shots = [['equip', 'cave-equip'], ['skill', 'cave-skill'], ['alchemy', 'cave-alchemy'], ['break', 'cave-break']];
for (const [tab, name] of shots) {
  await p.evaluate(t => window.__FR.caveTab(t), tab);
  await p.waitForTimeout(180);
  await p.screenshot({ path: `qa/shots/${name}.png` });
  console.log('拍好', name);
}
await b.close();
