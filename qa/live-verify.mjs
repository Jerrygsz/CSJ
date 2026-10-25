import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 820 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('https://jerrygsz.github.io/CSJ/index.html?test=1', { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => !!window.__FR, { timeout: 60000 });

const r = await page.evaluate(() => {
  const F = window.__FR;
  F.muteStory(true); F.clearProgress(); F.setLevel(48); F.setStones(9000);
  F.enterMap('guchuan', 'easy'); F.skipStory(); F.finishMapNow();
  const afterDrop = F.info().cultivate.level;
  const s1 = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  const a = F.rebuild(19), b2 = F.rebuild(36), c = F.rebuild(48);
  const s2 = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
  return {
    ver: (document.querySelector('script[src*="game.js?v="]') || {}).getAttribute ? document.querySelector('script[src*="game.js?v="]').getAttribute('src') : '',
    afterDrop,
    woundedTo: s1.wounded ? s1.wounded.to : null,
    stages: [a.lv, b2.lv, c.lv],
    woundedAfter: s2.wounded || null,
    wanxs: ((window.MAP_STORIES || {}).tainan || []).map(x => x[1]).join('').indexOf('一个钻进林子') >= 0,
    rebuildData: (window.REBUILD_STAGES || []).length
  };
});
console.log(JSON.stringify(r, null, 1));
console.log('errors=' + (errs.length ? errs.join(' | ') : 'none'));
await b.close();
