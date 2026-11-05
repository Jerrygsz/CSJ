// 批次3 实拍：后山样板图，墨皮 / 鎏金双皮 + 三层开/关对照。
// 目的：肉眼确认「软边明度块不是马赛克 / 中央留白 / 两皮风格统一 / 无硬切」。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const PORT = 8123;
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

  const enter = async (skin) => {
    await page.evaluate((skin) => {
      window.__FR.skin(skin);
      window.__FR.enterMap('houshan');
      window.__FR.G.state = 'play';
      window.__FR.skipStory && window.__FR.skipStory();
      window.__FR.muteStory && window.__FR.muteStory(true);
    }, skin);
    await page.waitForTimeout(520);
    await page.evaluate(() => { const d = document.getElementById('dialog'); if (d) d.style.display = 'none'; });
    await page.waitForTimeout(160);
  };

  // 墨皮：三层开 / 关对照
  await enter('guigu');
  await page.screenshot({ path: 'qa/shot-scenery3-guigu-on.png' });
  await page.evaluate(() => { window.__FR.scenery3Enable(false); window.__FR.renderOnce(); });
  await page.waitForTimeout(120);
  await page.screenshot({ path: 'qa/shot-scenery3-guigu-off.png' });
  await page.evaluate(() => { window.__FR.scenery3Enable(true); window.__FR.renderOnce(); });

  // 鎏金皮：三层开
  await enter('jin');
  await page.screenshot({ path: 'qa/shot-scenery3-jin-on.png' });

  const info = await page.evaluate(() => window.__FR.scenery3());
  console.log('scenery3 状态:', JSON.stringify({ on: info.on, biome: info.biome, skin: info.skin, types: info.types.length, landmarks: info.landmarks.map(l => l.kind), terrainPat: info.terrainPat }));
  console.log('pageerrors:', errs.length ? errs : 'none');
  await b.close();
  process.exit(0);
})().catch(e => { console.error(String(e)); process.exit(1); });
