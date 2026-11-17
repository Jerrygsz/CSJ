// 实拍：批次 9 · 放生（两段式确认按钮 + 静修页「故交」一节）双皮各三张
//
// 运行：node qa/shot-release.mjs
// 输出：qa/_out/b9/*.png（qa/_out/ 在 .gitignore 里，只作自检留存，不入库）
//
// 沿用批次 8 的两条铁律：
//   ① 洞府页签靠 G.caveTab 切，先写 caveTab 再 __FR.cave(id)；
//   ② 换皮后再 __FR.cave(id) 一次，否则量到的是换皮前的 DOM。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const out = join(root, 'qa', '_out', 'b9');
mkdirSync(out, { recursive: true });
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 400, height: 812 }, deviceScaleFactor: 2 });
const errs = [];
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR && !!window.ALLY_SKILLS, { timeout: 20000 });

// 摆局：先把六翼（25 场生死之交）真放生，让它进故交册；啼魂兽留在工作账（12 场相熟）。
// 注意 requestRelease 探针只改状态、不重绘（真实点击处理里才 renderCave），
// 所以「上膛」那张必须走 page.click，不能靠探针。
const stage = (page, skin, gone) => page.evaluate(([s, g]) => {
  const F = window.__FR;
  F.skin(s);
  F.setLevel(82);
  F.clearAlly(); F.clearReleaseArm();
  F.givePet('p_tihun'); F.givePet('p_liuyi');
  F.addItem('bag_ling2', 1);
  F.setTogether('p_tihun', 12, 0, 'xutian');
  F.setTogether('p_liuyi', 25, 2, 'kunwu');
  if (g) { F.requestRelease('p_liuyi'); F.requestRelease('p_liuyi'); }  // 真放，进故交册
  F.G.caveTab = g ? 'rest' : 'pet';
  F.cave('jiezi');
  return { gone: F.goneRows().length };
}, [skin, gone]);

for (const skin of ['jin', 'guigu']) {
  // S1 灵宠页：啼魂兽那一行「再按一次」朱砂态 —— 走真实点击，才会触发重绘
  await stage(page, skin, false);
  await page.waitForTimeout(400);
  await page.click('button[data-release="p_tihun"]');
  await page.waitForTimeout(200);
  const armed = await page.evaluate(() => !!window.__FR.releaseArm());
  await page.evaluate(() => {
    const r = [...document.querySelectorAll('#caveBody .recrow')].find(x =>
      ((x.querySelector('.rr-main b') || {}).textContent || '').indexOf('啼魂兽') >= 0);
    if (r) r.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(out, 'S1-release-arm-' + skin + '.png') });
  console.log(skin, 'S1 arm=', armed);

  // S2 静修页整页：同行一节 + 故交一节
  const s2 = await stage(page, skin, true);
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, 'S2-rest-page-' + skin + '.png') });
  console.log(skin, 'S2 gone=', s2.gone);

  // S3 故交节细看
  await stage(page, skin, true);
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const secs = [...document.querySelectorAll('#caveBody .cave-sec')];
    const sec = secs.find(s => ((s.querySelector('.cs-title') || {}).textContent || '') === '故交');
    if (sec) sec.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, 'S3-gone-zoom-' + skin + '.png') });
}
console.log('errors', errs.slice(0, 5));
await b.close();
