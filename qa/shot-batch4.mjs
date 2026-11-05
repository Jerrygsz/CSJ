// 第105轮 实拍：第四批 19 张逐图（arc G 11 + arc H 8，人界篇收官）+ 三类对照。
// 自带静态服务（9093），不覆盖 shot-codex-*.png 标杆样片，也不动前几批的 shot-*.png。
// 用法：cd fanren && node qa/shot-batch4.mjs
// 产出（22 张）：
//   shot-batch4-<id>.png × 19  第四批逐图，含 7 个新增 big 主景
//   shot-batch4-qixuan.png     标杆零回归（与 shot-codex-qixuan.png 同构图，只做肉眼对照）
//   shot-batch4-xuechi.png     逐图幽暗零回归（mood.signature 专属笔法仍在）
//   shot-batch4-untracked.png  未收录图（灵界篇 arc I）仍完全短路，不铺宣纸
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9093;
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
    on: i.on, mapId: i.mapId, tone: i.tone, paperPat: i.paperPat, uiSoft: i.uiSoft,
    focusKind: i.focus && i.focus.kind, focusHasSpr: i.focus && i.focus.hasSpr,
    focusNonZero: i.focusA && i.focusA.nonZero, focusSolid: i.focusA && i.focusA.solidPixels,
    layout: i.composition && i.composition.layout, breath: i.composition && i.composition.breath,
    mood: i.mood && i.mood.name, moodSignature: i.moodSignature,
    decorCount: i.decorCount, zones: i.zones, hazards: i.hazards
  }));
  return i;
};
const shot = async (name) => { const f = join(here, name); await page.screenshot({ path: f }); console.log('WROTE', f); };

// 第四批 19 张全部从真源 batch 字段取，不手写名单
const batch4 = await page.evaluate(() =>
  Object.keys(window.MAP_CODEX).filter(id => window.MAP_CODEX[id].batch === 4));
console.log('第四批:', batch4.length, batch4.join(','));
for (const id of batch4) {
  await enter(id, 'guigu');
  await probe('[' + id + ']');
  await shot('shot-batch4-' + id + '.png');
}

// 三类对照：标杆 / 逐图幽暗 / 未收录短路
await enter('qixuan', 'guigu');
await probe('[qixuan 标杆]');
await shot('shot-batch4-qixuan.png');

await enter('xuechi', 'guigu');
await probe('[xuechi 幽暗]');
await shot('shot-batch4-xuechi.png');

const untracked = await page.evaluate(() =>
  window.MAPS.map(m => m.id).find(id => !window.MAP_CODEX[id]) || null);
if (untracked) {
  await enter(untracked, 'guigu');
  await probe('[' + untracked + ' 未收录短路]');
  await shot('shot-batch4-untracked.png');
}

console.log('pageerrors:', errs.length ? errs : 'none');
await browser.close(); server.close();
process.exit(errs.length ? 1 : 0);
