// 实拍：批次 7 · 联机闭环（共斗默契面板 + 合击 + 夹击）双皮各三张
//
// 运行：node qa/shot-coop-tie.mjs
// 输出：qa/_out/b7/*.png（qa/_out/ 在 .gitignore 里，只作自检留存，不入库）
//
// 三条踩坑记录，改这份脚本前先看一眼：
//   ① 主循环里的 Coop.update → refreshRole 每帧按「有没有连上 Net」重算 coopRole，
//      没连网时会把 G.coopRole 清成 null。所以「设 coopRole + 打两下」必须在同一个
//      page.evaluate 的同步块里做完，中间不许 await。
//   2. 摆的怪要 hpMul 5000 —— 自动开火两下就把普通狼打死了，死了会走清场结算把状态切走。
//   ③ 上一张的飘字 life 0.8 秒，拍下一张前要等它散尽，否则两张图糊在一起。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const out = join(root, 'qa', '_out', 'b7');
mkdirSync(out, { recursive: true });
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 400, height: 812 }, deviceScaleFactor: 2 });
const errs = [];

for (const skin of ['jin', 'guigu']) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(skin + ' PAGEERR ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR && !!window.Coop, { timeout: 20000 });

  // S1 联机面板：摆一个「默契」档（合击 12 次 / 并肩 4 场）
  await page.evaluate(s => {
    window.__FR.skin(s);
    window.__FR.setCoopTie(12);
    for (let i = 0; i < 4; i++) window.__FR.addCoopWin();
  }, skin);
  await page.evaluate(() => document.getElementById('coopBtn').click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, 'S1-coop-panel-' + skin + '.png') });

  // 进场
  await page.evaluate(() => { document.getElementById('coopClose').click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__FR.toTitle();
    window.__FR.enterMap('houshan', 'easy');
    window.__FR.muteStory(true);
    window.__FR.setSpawn(false);
  });
  await page.waitForTimeout(500);

  // S2 合击：摆一只高血精英（带三成护罩），直接出手一次
  const id = await page.evaluate(() => {
    const g = window.__FR.G;
    g.enemies.length = 0;
    window.__FR.spawnNear(60, -40, 'wolf', true, 5000);
    const e = g.enemies[g.enemies.length - 1];
    g.coopRole = 'host'; g.time = 50; g._tieCd = -99;
    window.__FR.setWard(e._id, 0.3);
    return e._id;
  });
  await page.evaluate(i => { window.__FR.tieFire(i); window.__FR.tickFrames(2, 0.016); }, id);
  await page.waitForTimeout(120);
  await page.screenshot({ path: join(out, 'S2-tie-hit-' + skin + '.png') });

  // S3 夹击：重新摆一只，等上一张的飘字散尽；冻住合击，这一张只看夹击
  await page.waitForTimeout(1100);
  await page.evaluate(() => {
    const g = window.__FR.G;
    g.enemies.length = 0;
    window.__FR.spawnNear(-50, -30, 'wolf', true, 5000);
    const e = g.enemies[g.enemies.length - 1];
    g.coopRole = 'host';
    g.time += 1; g._tieCd = 1e9;
    e._hitMark = { me: -99, pt: -99 }; e._cross = 0;
    window.__FR.coopMark(e._id, false);
    g.time += 0.15;
    window.__FR.coopMark(e._id, true);
    window.__FR.tickFrames(2, 0.016);
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: join(out, 'S3-cross-' + skin + '.png') });
  await page.close();
}

console.log('实拍输出：' + out);
console.log('errs =', errs.slice(0, 6));
await b.close();
