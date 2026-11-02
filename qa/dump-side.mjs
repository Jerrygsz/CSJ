// 导出全部 side 支线图：字段 + 对白，供逐条校对
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9073;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForFunction(() => !!window.__FR);
const data = await page.evaluate(() => {
  const S = window.MAP_STORIES || {};
  const lines = k => (S[k] || []);
  const side = window.MAPS.filter(m => m.side);
  const out = side.map(m => {
    const intro = lines(m.intro);
    const story = lines(m.id);
    const outro = lines(m.outro);
    const all = [].concat(intro, story, outro);
    return {
      id: m.id, name: m.name, pos: m.pos, type: m.type, tag: m.tag,
      arc: m.arc || '', side: m.side,
      unlock: m.unlock || null, next: m.next || null,
      startLevel: m.startLevel || 0, endLevel: m.endLevel || 0,
      boss: m.boss ? { name: m.boss.name, kind: m.boss.kind } : null,
      extraBoss: (m.extraBoss || []).map(b => ({ name: b.name, kind: b.kind })),
      desc: m.desc || '', clearTitle: m.clearTitle || '', clearDesc: m.clearDesc || '',
      introText: intro.map(x => x[0] + '｜' + x[1]).join('\n'),
      storyText: story.map(x => x[0] + '｜' + x[1]).join('\n'),
      outroText: outro.map(x => x[0] + '｜' + x[1]).join('\n'),
      fullText: all.map(x => x[0] + '｜' + x[1]).join('\n')
    };
  });
  return { total: window.MAPS.length, sideCount: out.length, maps: out };
});
fs.writeFileSync(join(here, '_side_dump.json'), JSON.stringify(data, null, 2), 'utf8');
console.log('total', data.total, 'side', data.sideCount);
data.maps.forEach((m, i) => console.log(String(i + 1).padStart(2), m.id.padEnd(14), (m.arc || '_').padEnd(3), '|', m.name, '|', m.pos, '|', (m.unlock || '-'), '→', (m.next || '-')));
await browser.close(); server.close();
