import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9142;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 430, height: 900 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

const dump = await page.evaluate(() => {
  const E = window.ENEMY_TYPES || {};
  const enemies = Object.keys(E).map(k => ({ id: k, name: E[k].name }));
  const maps = [];
  for (const m of (window.MAPS || [])) {
    maps.push({
      id: m.id, name: m.name, type: m.type || 'combat', arc: m.arc || '',
      pos: m.pos || '', desc: m.desc || '', clearTitle: m.clearTitle || '', clearDesc: m.clearDesc || '',
      enemies: m.enemies || [], elites: m.elites || [],
      boss: m.boss ? { kind: m.boss.kind || '', name: m.boss.name, spr: m.boss.spr || '', summon: m.boss.summon } : null
    });
  }
  const enc = (window.ENCOUNTERS || []).map(e => ({ id: e.id, map: e.map, name: e.name,
    text: [e.desc || '', ...(e.lines || []).map(l => typeof l === 'string' ? l : (l.t || l.text || ''))].join(' | ') }));
  return { enemies, maps, enc };
});

fs.writeFileSync(join(here, '_npc_dump2.json'), JSON.stringify(dump, null, 1), 'utf8');
console.log('enemies', dump.enemies.length, 'maps', dump.maps.length,
  'boss', dump.maps.filter(m => m.boss).length,
  'elites', dump.maps.reduce((s, m) => s + m.elites.length, 0),
  'enc', dump.enc.length);

await b.close(); server.close();
