// 全库名词 × 原著命中统计：在真实页面里读 window 全局，再回两份 raw 文本计数
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9051;
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

const dump = await page.evaluate(() => {
  const W = window;
  const out = [];
  const add = (kind, arr, nameKey = 'name') => {
    for (const x of (arr || [])) if (x && x[nameKey]) out.push({ kind, id: x.id || '', name: x[nameKey] });
  };
  add('skill', W.SKILLS);
  add('item', W.ITEMS);
  add('mat', W.MATERIALS);
  add('pet', W.PETS);
  add('mate', W.MATES);
  add('map', W.MAPS);
  add('enc', W.ENCOUNTERS);
  return out;
});
await b.close(); server.close();

const raw = fs.readFileSync('raw/凡人修仙传.txt', 'utf8') + '\n' + fs.readFileSync('raw/凡人修仙传-仙界篇.txt', 'utf8');
function count(s) { if (!s) return 0; let n = 0, i = 0; while ((i = raw.indexOf(s, i)) !== -1) { n++; i += s.length; } return n; }

// 去结构化后缀：·xxx / （xxx） / 【xxx】
function baseName(n) {
  let s = n.replace(/[（(【\[].*?[)）】\]]/g, '').trim();
  const i = s.indexOf('·');
  if (i > 0) s = s.slice(0, i);
  return s;
}

const seen = new Set();
const rows = [];
for (const d of dump) {
  const key = d.kind + '|' + d.name;
  if (seen.has(key)) continue; seen.add(key);
  const full = count(d.name);
  const base = baseName(d.name);
  const bc = base && base !== d.name ? count(base) : full;
  rows.push({ ...d, full, base, bc });
}

const zero = rows.filter(r => r.full === 0 && r.bc === 0);
const zeroFullOnly = rows.filter(r => r.full === 0 && r.bc > 0);

console.log(`总名词 ${rows.length}  |  完全0命中 ${zero.length}  |  全名0但基名有 ${zeroFullOnly.length}`);
console.log('\n=== 完全0命中（疑似自造）===');
for (const r of zero.sort((a, b) => a.kind.localeCompare(b.kind))) console.log(`${r.kind.padEnd(6)} ${r.id.padEnd(16)} ${r.name}`);
console.log('\n=== 全名0命中 / 基名有（多为结构化后缀，通常可留）===');
for (const r of zeroFullOnly.sort((a, b) => a.kind.localeCompare(b.kind))) console.log(`${r.kind.padEnd(6)} ${r.id.padEnd(16)} ${r.name}  (base=${r.base}:${r.bc})`);
fs.writeFileSync(join(here, '_audit_all.json'), JSON.stringify(rows, null, 1), 'utf8');
