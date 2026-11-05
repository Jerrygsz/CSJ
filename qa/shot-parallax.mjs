// 视差 / 双皮转场 实拍：进图渲染 + 相机位移前后对比 + 鎏金进图暗角封印
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = 8123;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const page = await b.newPage({ viewport: { width: 480, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  await page.evaluate(() => {
    const ids = window.MAPS.map(m => m.id); const dc = {}; for (const id of ids) dc[id] = { easy: true };
    const s = { unlocked: ids, cleared: ids, caves: Object.keys(window.CAVES || {}), diffClear: dc, cultivate: { level: 200, xp: 0, skills: {} }, inventory: {}, stones: 50000, best: { level: 200, time: 0, kills: 0 } };
    localStorage.setItem('fanren_save_v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR);
  await page.evaluate(() => window.__FR.skin('guigu'));
  await page.waitForTimeout(150);
  await page.evaluate(() => { window.__FR.enterMap('qixuan'); window.__FR.G.state = 'play'; window.__FR.skipStory(); window.__FR.muteStory(true); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const d = document.getElementById('dialog'); if (d) d.style.display = 'none'; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'qa/shot-parallax-guigu-1.png' });
  // 相机位移：把玩家推远，让 cam 跟进，远山/寒林/近景随系数错开
  const cam1 = await page.evaluate(() => ({ x: window.__FR.G.cam.x, y: window.__FR.G.cam.y }));
  await page.evaluate(() => { window.__FR.G.player.x += 900; window.__FR.G.player.y += 0; });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'qa/shot-parallax-guigu-2.png' });
  const cam2 = await page.evaluate(() => ({ x: window.__FR.G.cam.x, y: window.__FR.G.cam.y }));
  const disp = (cam2.x - cam1.x);
  console.log('guigu cam.x 位移 =', disp.toFixed(1), '（远山≈', (disp*0.18).toFixed(1), '中景≈', (disp*0.45).toFixed(1), '近景≈', (disp*0.8).toFixed(1), '）');

  // 鎏金进图暗角暗金封印（jinSeal）截图：切皮后重新进图触发转场，立即抓
  await page.evaluate(() => window.__FR.skin('jin'));
  await page.waitForTimeout(150);
  await page.evaluate(() => { window.__FR.enterMap('houshan'); window.__FR.G.state = 'play'; });
  await page.waitForTimeout(180);   // 落在 jinSeal 0.6s 动画中部
  await page.screenshot({ path: 'qa/shot-jin-entry.png' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'qa/shot-parallax-jin.png' });
  console.log('pageerrors:', errs.length ? errs : 'none');
  await b.close();
  process.exit(0);
})().catch(e => { console.error(String(e)); process.exit(1); });
