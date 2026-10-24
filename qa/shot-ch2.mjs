// 筑基 / 结丹 新章截图验收
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const OUT = 'C:/Users/92997/WorkBuddy/2026-10-21-22-38-39/qa/shots';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto('http://127.0.0.1:8899/index.html?test=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const settle = async (n = 14) => {
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => { try { window.__FR.skipStory(); } catch (e) { } });
    await page.waitForTimeout(120);
  }
};
const fresh = async (lv) => page.evaluate(l => {
  const F = window.__FR;
  F.clearProgress(); F.setSetting('autoSave', false); F.unlockAll(); F.setLevel(l); F.god(true);
}, lv);

// 1. 修行图（分篇章）：顶、中、底
await fresh(60);
await page.evaluate(() => window.__FR.worldmap());
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'ch2-worldmap-top.png') });
await page.evaluate(() => { const el = document.getElementById('wmList'); el.scrollTop = el.scrollHeight * 0.46; });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'ch2-worldmap-mid.png') });
await page.evaluate(() => { const el = document.getElementById('wmList'); el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'ch2-worldmap-bottom.png') });

// 1.5 地火之屋：陆师兄夺丹（筑基前夜，此时仍是练气十三层）
await fresh(35);
await page.evaluate(() => window.__FR.enterMap('zhuji', 'hard'));
await page.waitForTimeout(1500);
await settle(8);
await page.waitForTimeout(400);
await page.evaluate(() => window.__FR.bossDamage(0.15));
await page.waitForTimeout(1250);
await page.screenshot({ path: path.join(OUT, 'ch2-dihuo.png') });

// 2. 燕家堡：王蝉（筑基初期）
await fresh(36);
await page.evaluate(() => window.__FR.enterMap('yanjia', 'hard'));
await page.waitForTimeout(2400);
await settle();
await page.evaluate(() => window.__FR.boss());
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, 'ch2-yanjia.png') });

// 3. 虚天殿：玄骨上人（结丹初期）
await fresh(56);
await page.evaluate(() => window.__FR.enterMap('xutian', 'hard'));
await page.waitForTimeout(1500);
await settle(8);
await page.waitForTimeout(500);
await page.evaluate(() => window.__FR.bossDamage(0.25));
await page.waitForTimeout(1250);
await page.screenshot({ path: path.join(OUT, 'ch2-xutian.png') });

// 4. 外星海：这一战打的是毒蛟（风希杀不掉）
await fresh(64);
await page.evaluate(() => window.__FR.enterMap('waihai', 'nightmare'));
await page.waitForTimeout(1500);
await settle(8);
await page.waitForTimeout(500);
await page.evaluate(() => window.__FR.bossDamage(0.2));
await page.waitForTimeout(1250);
await page.screenshot({ path: path.join(OUT, 'ch2-waihai.png') });

// 5. 天星城坊市（高阶货架 + 招牌）
await fresh(56);
await page.evaluate(() => window.__FR.enterMap('tianxing'));
await page.waitForTimeout(900);
await settle(4);
await page.evaluate(() => window.__FR.shop('buy'));
await page.waitForTimeout(500);
await page.evaluate(() => { const t = document.querySelector('#shopCats .tab[data-cat="cai"]'); if (t) t.click(); });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'ch2-tianxing-shop.png') });

// 6. 青竹小轩（洞府）
await fresh(56);
await page.evaluate(() => window.__FR.enterMap('qingzhu'));
await page.waitForTimeout(700);
await settle(6);
await page.evaluate(() => { window.__FR.cave('qingzhuxuan'); window.__FR.caveTab('alchemy'); });
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'ch2-qingzhu-cave.png') });

// 7. 凝翠岛：七级妖兽·蓝面鲛（这一图是杀妖取丹，不是结丹）
await fresh(52);
await page.evaluate(() => window.__FR.enterMap('ningcui', 'hard'));
await page.waitForTimeout(2400);
await settle();
await page.evaluate(() => window.__FR.boss());
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(OUT, 'ch2-ningcui.png') });

// 8. 闭府结丹：六十年，一枚丹
await fresh(54);
await page.evaluate(() => window.__FR.enterMap('jiedan'));
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, 'ch2-jiedan.png') });
await settle(8);
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'ch2-jiedan-done.png') });
const jd = await page.evaluate(() => ({ realm: window.__FR.info().realm, lvl: window.__FR.info().level, cleared: window.__FR.info().cleared.includes('jiedan') }));
console.log('结丹检验:', jd);

// 9. 越级进图时的境界横幅（低修为直入高境界图，一进门就该告诉你在哪一层）
await fresh(35);
await page.evaluate(() => window.__FR.enterMap('yanjia', 'easy'));
await page.waitForTimeout(760);
await page.screenshot({ path: path.join(OUT, 'ch2-zhuji-banner.png') });
const st = await page.evaluate(() => ({ realm: window.__FR.info().realm, lvl: window.__FR.info().level }));
console.log('筑基检验:', st);

console.log('页面错误:', errs.length ? errs : '无');
await b.close();
