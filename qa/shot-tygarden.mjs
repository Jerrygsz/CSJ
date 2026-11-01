// 截图：天渊城洞府「灵界药圃」——移栽前（空圃提示）与移栽后（芝龙果在园）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9001;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
const BASE = 'http://127.0.0.1:' + PORT + '/index.html?test=1';
const KEY = 'fanren_save_v1';
const fresh = async () => { await page.goto(BASE); await page.evaluate(k => localStorage.removeItem(k), KEY); await page.reload(); await page.waitForTimeout(900); };
const openGarden = async () => { await page.evaluate(() => window.__FR.cave('tycave')); await page.waitForTimeout(300); await page.click('[data-ctab="garden"]'); await page.waitForTimeout(400); };

await fresh();
await openGarden();
await page.screenshot({ path: join(root, 'qa', 'shot-tygarden-empty.png') });

await page.evaluate(() => { window.__FR.addBag('m_zhilongguo', 3); window.__FR.transplant(); window.__FR.setGarden('tygarden', 26); window.__FR.cave('tycave'); });
await page.waitForTimeout(300);
await page.click('[data-ctab="garden"]');
await page.waitForTimeout(400);
await page.screenshot({ path: join(root, 'qa', 'shot-tygarden-planted.png') });

await browser.close(); server.close();
console.log('shots done');
