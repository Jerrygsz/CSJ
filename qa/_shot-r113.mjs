// 第113轮证据截图：仙界段相邻图在两种皮肤下是否真的能看出「换了一张图」。
// 输出到 qa/_out/（第111轮起的约定目录，不入库）。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const OUT = join(here, '_out');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 9104;
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
  await page.waitForTimeout(620);
  await page.evaluate(() => { const d = document.getElementById('dialog'); if (d) d.style.display = 'none'; });
  await page.waitForTimeout(200);
};

const shots = [
  ['guigu', 'suxing'], ['guigu', 'lingyan'],
  ['guigu', 'yinming'], ['guigu', 'bianhai'],
  ['guigu', 'moban'], ['guigu', 'huangquan'],
  ['guigu', 'diyi'], ['guigu', 'huimoyuan'],
];
for (const [skin, id] of shots) {
  await enter(id, skin);
  const f = join(OUT, `r113-${skin}-${id}.png`);
  await page.screenshot({ path: f });
  console.log('拍好', f);
}
console.log('页面错误:', errs.length ? errs.join(' | ') : '无');
await browser.close(); server.close();
