// 第103轮 实拍：第二批 11 张逐图 + mood.signature 专属笔法 + 玩法层 UI 柔化 A/B。
// 自带静态服务（9095），不覆盖 shot-codex-*.png 标杆样片，也不动 shot-stage5-*.png。
// 用法：cd fanren && node qa/shot-batch2.mjs
// 产出（16 张）：
//   shot-batch2-<id>.png × 11   第二批逐图（arc C 5 + arc D 6）
//   shot-batch2-qixuan.png      标杆零回归
//   shot-batch2-xuechi.png      冒泡水坑（bubblingPool）
//   shot-batch2-heisha.png      压顶血光（bloodOverhead）
//   shot-batch2-banner-on.png / -off.png  剧情横幅 + 飞鸽圆钮柔化 A/B（同一帧只摘 CSS class）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9095;
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
    mood: i.mood && i.mood.name, moodSignature: i.moodSignature,
    moodSolid: i.moodA && i.moodA.solidPixels, decorCount: i.decorCount,
    zones: i.zones, hazards: i.hazards
  }));
  return i;
};
const shot = async (name) => { const f = join(here, name); await page.screenshot({ path: f }); console.log('WROTE', f); };

// 第二批 11 张全部从真源 batch 字段取，不手写名单
const batch2 = await page.evaluate(() =>
  Object.keys(window.MAP_CODEX).filter(id => window.MAP_CODEX[id].batch === 2));
console.log('第二批:', batch2.length, batch2.join(','));
for (const id of batch2) {
  await enter(id, 'guigu');
  await probe('[' + id + ']');
  await shot('shot-batch2-' + id + '.png');
}

// 标杆 + 两张专属笔法
for (const id of ['qixuan', 'xuechi', 'heisha']) {
  await enter(id, 'guigu');
  await probe('[' + id + ']');
  await shot('shot-batch2-' + id + '.png');
}

// 玩法层 UI 柔化 A/B：强制显示剧情横幅，同一帧只摘 body.sc3-paper
await enter('qixuan', 'guigu');
await page.evaluate(() => {
  const b = document.getElementById('banner');
  if (b) { b.textContent = '韩立望着山门外的石阶，停了片刻。'; b.style.display = 'block'; }
});
await page.waitForTimeout(120);
await probe('[banner on]');
await shot('shot-batch2-banner-on.png');
await page.evaluate(() => document.body.classList.remove('sc3-paper'));
await page.waitForTimeout(80);
await shot('shot-batch2-banner-off.png');
await page.evaluate(() => {
  document.body.classList.add('sc3-paper');
  const b = document.getElementById('banner'); if (b) b.style.display = 'none';
});

console.log('pageerrors:', errs.length ? errs : 'none');
await browser.close(); server.close();
process.exit(errs.length ? 1 : 0);
