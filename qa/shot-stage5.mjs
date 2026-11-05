// 第102轮 实拍：UI 柔化 + 血池/黑煞教逐图幽暗。
// 自带静态服务（9096），不覆盖 shot-codex-*.png 标杆样片。
// 用法：node qa/shot-stage5.mjs
// 产出：
//   shot-stage5-qixuan.png  标杆零回归（浅纸 + 柔化后 HUD）
//   shot-stage5-xuechi.png / shot-stage5-heisha.png  逐图幽暗
//   shot-stage5-houshan.png 普通收录图（UI 柔化、无 mood）
//   shot-stage5-ui-on.png / shot-stage5-ui-off.png  同一帧纯 CSS A/B（摘掉 body.sc3-paper）
//   shot-stage5-untracked.png  未收录深底图（UI 应保持原样）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9096;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 480, height: 900 } });
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

const enter = async (id, skin) => {
  await page.evaluate(([id, skin]) => {
    window.__FR.skin(skin); window.__FR.enterMap(id);
    window.__FR.G.state = 'play';
    window.__FR.skipStory && window.__FR.skipStory();
    window.__FR.muteStory && window.__FR.muteStory(true);
  }, [id, skin]);
  await page.waitForTimeout(520);
  await page.evaluate(() => { const d = document.getElementById('dialog'); if (d) d.style.display = 'none'; });
  await page.waitForTimeout(160);
};
const probe = async (label) => {
  const i = await page.evaluate(() => window.__FR.scenery3());
  console.log(label, JSON.stringify({
    on:i.on, mapId:i.mapId, tone:i.tone, styleLoaded:i.styleLoaded, paperPat:i.paperPat,
    uiSoft:i.uiSoft, softRing:i.softRing,
    mood:i.mood, moodTile:i.moodTile, moodA:i.moodA,
    focusInk:i.focusInk, paletteInk:i.paletteInk, decorCount:i.decorCount,
    zones:i.zones, hazards:i.hazards
  }));
  return i;
};
const shot = async (name) => { const f = join(here, name); await page.screenshot({ path: f }); console.log('WROTE', f); };

const ids = ['qixuan', 'xuechi', 'heisha', 'houshan'];
for (const id of ids) {
  await enter(id, 'guigu');
  await probe('[' + id + ']');
  await shot('shot-stage5-' + id + '.png');
}

// UI 柔化 A/B：同一帧只摘 CSS class，不改任何渲染状态
await enter('qixuan', 'guigu');
await probe('[ui on]');
await shot('shot-stage5-ui-on.png');
await page.evaluate(() => document.body.classList.remove('sc3-paper'));
await page.waitForTimeout(80);
await shot('shot-stage5-ui-off.png');
await page.evaluate(() => document.body.classList.add('sc3-paper'));

// 未收录深底图：body.sc3-paper 不应挂上
const untracked = await page.evaluate(() => {
  const m = window.MAPS.find(x => !window.MAP_CODEX[x.id] && x.type === 'combat');
  return m ? m.id : null;
});
if (untracked) {
  await enter(untracked, 'guigu');
  await probe('[untracked ' + untracked + ']');
  await shot('shot-stage5-untracked.png');
}

console.log('pageerrors:', errs.length ? errs : 'none');
await browser.close(); server.close();
process.exit(errs.length ? 1 : 0);
