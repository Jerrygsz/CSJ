// 一次性探针（不入回归）：实证 bg.base 的明度差是否落到屏幕上。
// 做法：jin 皮下依次进若干张主线图，截图后算整屏平均亮度，
//      与 verify-mapscenery 算出的 bg.base 明度差并列对比。
// 判据：若 bg.base Δ 与屏幕 Δ 无相关性，说明该字段已不参与渲染（被 inkBg/grassPat 取代）。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9103;
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
  const s = { unlocked: ids, cleared: ids, caves: Object.keys(window.CAVES || {}), diffClear: dc, cultivate: { level: 200, xp: 0, skills: {} }, inventory: {}, stones: 50000, best: { level: 200, time: 0, kills: 0 }, skin: 'jin' };
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
  await page.waitForTimeout(600);
  await page.evaluate(() => { const d = document.getElementById('dialog'); if (d) d.style.display = 'none'; });
  await page.waitForTimeout(200);
};

// 取整屏平均亮度：把 canvas 读回，降采样统计
const screenLum = async () => page.evaluate(() => {
  const cv = document.querySelector('canvas');
  if (!cv) return null;
  const c = document.createElement('canvas'); c.width = 96; c.height = 180;
  const x = c.getContext('2d'); x.drawImage(cv, 0, 0, 96, 180);
  const d = x.getImageData(0, 0, 96, 180).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  r /= n; g /= n; b /= n;
  return { r: +r.toFixed(1), g: +g.toFixed(1), b: +b.toFixed(1), y: +(0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(2) };
});
const mapBg = async (id) => page.evaluate((id) => {
  const m = window.MAPS.find(x => x.id === id);
  return m ? { base: m.bg && m.bg.base, inkBase: m.inkBg && m.inkBg.base } : null;
}, id);

const lumY = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };

// 选 6 张主线图：含 Δ 大 / Δ 小的对
const ids = ['suxing', 'lingyan', 'xiaoping', 'tiangui', 'zhenling', 'mojie'];
const rows = [];
for (const id of ids) {
  await enter(id, 'jin');
  const scr = await screenLum();
  const bg = await mapBg(id);
  rows.push({ id, scr, bg });
  console.log(id.padEnd(10), 'screenY=' + String(scr && scr.y).padStart(6),
    ' bg.base=' + (bg && bg.base), 'bgY=' + (bg ? lumY(bg.base).toFixed(1) : '?'),
    ' inkBg=' + (bg && bg.inkBase), 'inkY=' + (bg && bg.inkBase ? lumY(bg.inkBase).toFixed(1) : '?'));
}
console.log('\n--- 相邻对：bg.base Δ vs 屏幕 Δ ---');
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1], b = rows[i];
  const dBg = Math.abs(lumY(b.bg.base) - lumY(a.bg.base));
  const dScr = Math.abs(b.scr.y - a.scr.y);
  const dInk = Math.abs(lumY(b.bg.inkBase) - lumY(a.bg.inkBase));
  console.log(`${a.id}→${b.id}   bgΔ=${dBg.toFixed(1)}  inkΔ=${dInk.toFixed(1)}  屏幕Δ=${dScr.toFixed(2)}`);
}
console.log('\n页面错误:', errs.length ? errs.join(' | ') : '无');
await browser.close(); server.close();
