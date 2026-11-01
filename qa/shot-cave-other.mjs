// 截图：洞府·装备页「储物袋 · 其他」分区
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9001;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 460, height: 2400 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const FR = window.__FR;
  const give = (id, k) => FR.addBag(id, k);
  give('huiqi', 3); give('lingzhi', 2); give('zhuji', 1);
  give('qingyan', 4); give('lingshi', 5); give('zhangtian', 1);
  give('f_peiyuan', 1); give('f_zhuji', 1);
  give('m_chijing', 8); give('m_jingtie', 6); give('m_yusuizhi', 2);
  FR.setLevel(200); FR.cave('qixuan');
  const tab = document.querySelector('[data-ctab="equip"]'); if (tab) tab.click();
});
await page.waitForTimeout(300);
await page.evaluate(() => { const b = document.getElementById('caveBody'); if (b) b.scrollTop = b.scrollHeight; });
await page.waitForTimeout(150);
const body = await page.$('#caveBody');
await body.screenshot({ path: join(here, 'shot-cave-other.png') });
await browser.close(); server.close();
console.log('saved qa/shot-cave-other.png');
