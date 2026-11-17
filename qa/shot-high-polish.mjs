// 实拍：批次13 高级感收尾（图标槽 / 页签 hover / 双皮）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const out = join(root, 'qa', '_out', 'b13');
fs.mkdirSync(out, { recursive: true });
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 400, height: 812 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

const caveId = await page.evaluate(() => {
  const F = window.__FR;
  F.muteStory && F.muteStory(true);
  const id = Object.keys(window.CAVES || {})[0] || null;
  if (!id) return null;
  F.setTogether('m_yuanyao', 30, 2);
  F.setTogether('p_tihun', 12, 0);
  F.setTogether('p_liuyi', 3, 1);
  F.giveMate('m_yuanyao');
  F.givePet('p_tihun');
  F.givePet('p_liuyi');
  F.cave(id); F.caveTab('mate');
  return id;
});
if (!caveId) throw new Error('拿不到洞府 id，无法实拍');
await page.waitForFunction(() => {
  const c = document.getElementById('cave');
  return c && c.style.display === 'flex' && c.querySelectorAll('.ico').length > 0;
}, null, { timeout: 8000 });

await page.screenshot({ path: join(out, 'icons-jin.png') });
await page.hover('[data-ctab="pet"]');
await page.waitForTimeout(120);
await page.screenshot({ path: join(out, 'tab-hover-jin.png') });

await page.evaluate(() => { window.__FR.skin('guigu'); window.__FR.caveTab('mate'); });
await page.waitForTimeout(200);
await page.screenshot({ path: join(out, 'icons-guigu.png') });
await page.hover('[data-ctab="pet"]');
await page.waitForTimeout(120);
await page.screenshot({ path: join(out, 'tab-hover-guigu.png') });

// 灵宠页有两行，量得到「名字左边缘对齐」这个批次13真正要修的问题
await page.evaluate(() => { window.__FR.skin('jin'); window.__FR.caveTab('pet'); });
await page.waitForFunction(() => document.querySelectorAll('#cave .ico').length >= 2,
  null, { timeout: 8000 });
await page.evaluate(() => { const b = document.getElementById('caveBody'); if (b) b.scrollTop = b.scrollHeight; });
await page.screenshot({ path: join(out, 'icons-pet-jin.png') });
await page.evaluate(() => { window.__FR.skin('guigu'); window.__FR.caveTab('pet'); const b = document.getElementById('caveBody'); if (b) b.scrollTop = b.scrollHeight; });
await page.waitForTimeout(200);
await page.screenshot({ path: join(out, 'icons-pet-guigu.png') });

console.log('实拍完成：' + out + '（cave=' + caveId + '）');
await browser.close();
