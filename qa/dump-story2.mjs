// 导出「挂在 map id 上」的剧情对话（story 图进场即播的那段）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9016;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 820 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

const out = await page.evaluate(() => {
  const W = window, story = W.MAP_STORIES || {};
  const res = [];
  for (const m of (W.MAPS || [])) {
    const lines = story[m.id];
    if (!lines) continue;
    res.push({ id: m.id, name: m.name, n: lines.length, txt: lines.map(l => '      [' + l[0] + '] ' + l[1]).join('\n') });
  }
  return res;
});

let s = '===== 剧情图进场对话（按 map id 挂载）=====\n';
for (const r of out) s += `\n### [${r.id}] ${r.name}　(${r.n} 句)\n` + r.txt + '\n';
fs.writeFileSync(join(here, 'story-dump2.txt'), s, 'utf8');
console.log('story-maps=' + out.length + ' bytes=' + s.length);
await b.close(); server.close();
