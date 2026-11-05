// 批次4 构图化实拍：逐图原著主景 + 聚落留白 + 后山三层开/关对照。
// 自带静态服务（9098），无需先起外部 server；用法：
//   node qa/shot-scenery3.mjs             拍 10 张（覆盖 8 类主景形状）+ 后山 on/off/jin 对照
//   node qa/shot-scenery3.mjs xuese       只重拍指定 mapId
// 目的：肉眼确认「一个主景立得住 / 大片留白 / 装饰成丛不铺满 / 无方形图标 / 软边不马赛克 / 两皮统一」。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9098;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
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
    window.__FR.skin(skin);
    window.__FR.enterMap(id);
    window.__FR.G.state = 'play';
    window.__FR.skipStory && window.__FR.skipStory();
    window.__FR.muteStory && window.__FR.muteStory(true);
  }, [id, skin]);
  await page.waitForTimeout(520);
  await page.evaluate(() => { const d = document.getElementById('dialog'); if (d) d.style.display = 'none'; });
  await page.waitForTimeout(160);
};
const dump = async (label) => {
  const i = await page.evaluate(() => window.__FR.scenery3());
  console.log(label, JSON.stringify({
    on: i.on, mapId: i.mapId, skin: i.skin, tone: i.tone,
    decor: (i.decorScheme || []).map(x => x[0] + ':' + x[1]),
    landmarks: i.landmarks.map(l => l.name), terrain: i.terrain, terrainPat: i.terrainPat,
    composition: i.composition, focus: i.focus && i.focus.kind + '@' + i.focus.layout,
    decorCount: i.decorCount, decorKinds: i.decorKinds, decorNN: i.decorNN
  }));
  return i;
};

const only = process.argv[2] || null;
// 10 张覆盖 8 类原著主景形状：narrowgate / stonehut / temple / stonering / pool / minehead / grove / shed
const ids = only ? [only] : ['qixuan', 'mishi', 'tainan', 'xuese', 'xuechi', 'shiku', 'heisha', 'heixiang', 'jiayuan', 'yanwu'];
const written = [];

for (const id of ids) {
  await enter(id, 'guigu');
  await dump('[' + id + ']');
  const f = join(here, 'shot-codex-' + id + '.png');
  await page.screenshot({ path: f });
  written.push(f);
}

if (!only) {
  // 后山：三层开 / 关对照（沿批次3 口径，证明逐图化后软边与留白没退化）
  await enter('houshan', 'guigu');
  await dump('[houshan on]');
  let f = join(here, 'shot-scenery3-guigu-on.png');
  await page.screenshot({ path: f }); written.push(f);
  await page.evaluate(() => { window.__FR.scenery3Enable(false); window.__FR.renderOnce(); });
  await page.waitForTimeout(120);
  f = join(here, 'shot-scenery3-guigu-off.png');
  await page.screenshot({ path: f }); written.push(f);
  await page.evaluate(() => { window.__FR.scenery3Enable(true); window.__FR.renderOnce(); });
  // 鎏金皮：三层开
  await enter('houshan', 'jin');
  await dump('[houshan jin]');
  f = join(here, 'shot-scenery3-jin-on.png');
  await page.screenshot({ path: f }); written.push(f);
}

console.log('shots:', written.length);
console.log('pageerrors:', errs.length ? errs : 'none');
await browser.close();
server.close();
process.exit(errs.length ? 1 : 0);
