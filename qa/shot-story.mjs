// 剧情对白验收：按原著改过的几段，逐段截图看字与人
import { createRequire } from 'node:module';
import path from 'node:path';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const OUT = 'C:/Users/92997/WorkBuddy/2026-10-21-22-38-39/qa/shots';
const URL = 'http://127.0.0.1:8899/index.html?test=1';

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1100);

const settle = async (n = 8) => {
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => { try { window.__FR.skipStory(); } catch (e) { } });
    await page.waitForTimeout(140);
  }
};

const fresh = async (lv) => {
  await page.evaluate((lv) => {
    const F = window.__FR;
    F.clearProgress(); F.setSetting('autoSave', false); F.unlockAll(); F.setLevel(lv);
  }, lv);
  await page.waitForTimeout(260);
};

// 1. 七玄门·山门：五里沟，二愣子
await fresh(1);
await page.evaluate(() => window.__FR.enterMap('qixuan'));
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, 'st-qixuan.png') });

// 2. 墨大夫密室：尸虫丸 / 井底之蛙 / 铁奴揭面
await fresh(10);
await page.evaluate(() => window.__FR.enterMap('mishi', 'easy'));
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, 'st-mishi.png') });
await settle(6);
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'st-mishi-2.png') });

// 3. 黄枫谷山门：叶师叔来换丹
await fresh(12);
await page.evaluate(() => window.__FR.enterMap('huangfeng'));
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, 'st-huangfeng.png') });

// 4. 太南小会：金光上人的升仙令、万小山
await fresh(10);
await page.evaluate(() => { window.__FR.enterMap('tainan'); });
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(OUT, 'st-tainan.png') });

// 5. 地火之屋：地火之灵
await fresh(35);
await page.evaluate(() => window.__FR.enterMap('zhuji', 'hard'));
await page.waitForTimeout(1400);
await settle(8);
await page.evaluate(() => window.__FR.boss());
await page.waitForTimeout(1300);
await page.screenshot({ path: path.join(OUT, 'st-dihuo.png') });

// 6. 下山岔道：陆师兄
await fresh(40);
await page.evaluate(() => window.__FR.enterMap('luxiong', 'easy'));
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, 'st-luxiong.png') });
await settle(6);
await page.evaluate(() => window.__FR.boss());
await page.waitForTimeout(1300);
await page.screenshot({ path: path.join(OUT, 'st-luxiong-boss.png') });

// 7. 血色禁地收尾：李化元收记名弟子
await fresh(40);
await page.evaluate(() => window.__FR.enterMap('xuese', 'easy'));
await page.waitForTimeout(1200);
await settle(4);
const xs = await page.evaluate(async () => {
  const F = window.__FR;
  const w = ms => new Promise(r => setTimeout(r, ms));
  F.boss(); await w(600);
  F.killBoss(); await w(2200);
  for (let i = 0; i < 22; i++) { try { F.skipStory(); } catch (e) { } await w(110); }
  return { state: F.info().state, cleared: F.info().cleared.includes('xuese') };
});
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'st-xuese-out.png') });
console.log('血色禁地收尾 :', xs);

// 8. 修行图：新增的岔道支线
await page.evaluate(() => window.__FR.worldmap());
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'st-worldmap.png') });

console.log('页面错误 :', errs.length ? errs : '无');
await b.close();
