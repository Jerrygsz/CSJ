// 第四部验收截图：灵宠 / 同伴 / 突破 三个洞府页 + 突破面板 + 战里同场
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const OUT = path.resolve(here, 'shots');
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 15000 });
await page.waitForTimeout(700);

// 起手：全解锁 + 开洞府
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress(); F.setSetting('autoSave', false); F.unlockAll(); F.openAllCaves();
});
await page.waitForTimeout(300);

// 备一份家底：特制灵兽袋、两只灵宠、一枚待孵的卵、一把饲灵丸
await page.evaluate(() => {
  const F = window.__FR;
  F.addItem('bag_ling2', 1);
  F.addItem('m_siling', 12);
  F.givePet('p_xueyu');
  F.addPet('p_mojiao');
  F.addItem('egg_yunchi', 1);      // 储物袋里留一枚，看「待孵的卵」
  F.addMate('m_lifeiyu');
  F.addMate('m_nangongwan');
  F.addMate('m_yuanyao');
});

const openCave = async () => {
  await page.evaluate(() => { window.__FR.cave('huangfeng'); });
  await page.waitForTimeout(360);
};
const shot = async (name) => {
  await page.waitForTimeout(260);
  await page.screenshot({ path: path.join(OUT, name) });
};

// ---- 1. 灵宠页：灵兽袋 + 挂机喂养 + 待孵的卵 ----
await page.evaluate(() => { window.__FR.feed(true); });
await openCave();
await page.evaluate(() => { window.__FR.caveTab('pet'); });
await shot('p4-cave-pet.png');

// 灵宠页：把灵兽袋收掉，看「袋满 → 卵先收着」
await page.evaluate(() => {
  const F = window.__FR;
  F.dropItem('bag_ling2', 9);
  F.releasePet('p_mojiao');        // 只留一只 → 容量 1 即满
});
await shot('p4-cave-pet-full.png');

// ---- 2. 同伴页 ----
await page.evaluate(() => {
  const F = window.__FR;
  F.addItem('bag_ling2', 1);
  F.addPet('p_mojiao');
  if (F.mates().active !== 'm_lifeiyu') F.setMate('m_lifeiyu');
  F.caveTab('mate');
});
await shot('p4-cave-mate.png');

// ---- 3. 突破页：卡在筑基门口（缺灵石）----
await page.evaluate(() => {
  const F = window.__FR;
  F.setLevel(32);                  // 筑基门槛 Lv36 之前
  F.addItem('zhuji', 1);
  F.addItem('m_yusuizhi', 3);
  F.addItem('m_zihua', 3);
  F.addItem('m_tianling', 1);      // 差两味 → 缺材料
  F.setStones(120);                // 灵石也不够
  F.caveTab('break');
});
await shot('p4-cave-break.png');

// 突破页：备齐
await page.evaluate(() => {
  const F = window.__FR;
  F.addItem('m_tianling', 5);
  F.setStones(5000);
  F.clearMap('zhuji');
  F.caveTab('break');
});
await shot('p4-cave-break-ready.png');

// ---- 4. 突破面板（弹层）----
await page.evaluate(() => { window.__FR.breakOpen(36); });
await shot('p4-break-panel.png');
await page.evaluate(() => { window.__FR.breakClose(); });

// ---- 5. 战里：同伴 + 灵宠同场 ----
await page.evaluate(() => {
  const F = window.__FR;
  F.enterMap('houshan', 'easy');
  F.skipStory();
  if (F.mates().active !== 'm_lifeiyu') F.setMate('m_lifeiyu');
  if (F.pets().active !== 'p_xueyu') F.setPet('p_xueyu');
  F.teleport(320, 300);
  F.spawn('wolf', 3);
  F.tickFrames(50, 0.05);
});
await shot('p4-battle-both.png');

console.log('页面错误: ' + (errs.length ? errs.join(' | ') : '无'));
if (errs.length) { console.log(errs.slice(0, 8).join('\n')); }
await b.close();
