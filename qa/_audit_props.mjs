// 全道具明细导出 + 原著命中统计（丹药/符箓/法器/杂材/功法）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9053;
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
  const slim = x => ({
    id: x.id, name: x.name, rarity: x.rarity, req: x.req, desc: x.desc,
    effect: x.effect, buffs: x.buffs, slot: x.slot, teach: x.teach,
    craftOnly: x.craftOnly, unique: x.unique, noDrop: x.noDrop,
    type: x.type, max: x.max, minLv: x.minLv, atk: x.atk, kind: x.kind,
    mat: x.mat, price: x.price, cat: x.cat, icon: x.icon
  });
  const out = { items: (W.ITEMS || []).map(slim), mats: (W.MATERIALS || []).map(slim), skills: (W.SKILLS || []).map(slim) };
  // 坊市（各城 shop 清单）
  const towns = {};
  for (const k of Object.keys(W)) {
    const v = W[k];
    if (v && typeof v === 'object' && Array.isArray(v.shop) && (v.name || v.town)) towns[k] = { name: v.name || v.town, shop: v.shop.slice(), sell: v.sell || null };
  }
  out.towns = towns;
  out.recipes = (W.RECIPES || []).map(r => ({ id: r.id, kind: r.kind, name: r.name, out: r.out, outN: r.outN, cost: r.cost, req: r.req, rate: r.rate, mats: r.mats }));
  return out;
});
await b.close(); server.close();

const raw = fs.readFileSync(join(root, 'raw/凡人修仙传.txt'), 'utf8') + '\n' + fs.readFileSync(join(root, 'raw/凡人修仙传-仙界篇.txt'), 'utf8');
function count(s) { if (!s) return 0; let n = 0, i = 0; while ((i = raw.indexOf(s, i)) !== -1) { n++; i += s.length; } return n; }
function baseName(n) {
  let s = (n || '').replace(/[（(【\[].*?[)）】\]]/g, '').trim();
  const i = s.indexOf('·'); if (i > 0) s = s.slice(0, i);
  return s;
}
function ctx(term, len = 46) {
  const out = []; let i = -1;
  while ((i = raw.indexOf(term, i + 1)) !== -1 && out.length < 3) out.push(raw.slice(Math.max(0, i - len), i + term.length + len).replace(/\s+/g, ' '));
  return out;
}

fs.writeFileSync(join(here, '_props.json'), JSON.stringify(dump, null, 1), 'utf8');

function report(title, arr) {
  console.log(`\n${'='.repeat(78)}\n${title}  (${arr.length})\n${'='.repeat(78)}`);
  for (const x of arr) {
    const full = count(x.name), base = baseName(x.name), bc = (base && base !== x.name) ? count(base) : full;
    const flag = (full === 0 && bc === 0) ? '  <<< 0命中' : (full === 0 ? `  (base ${base}:${bc})` : '');
    console.log(`${(x.id || '').padEnd(16)} ${(x.name || '').padEnd(14)} r${x.rarity ?? '-'} req${String(x.req ?? '-').padEnd(4)} ${full}/${bc}${flag}`);
    if (x.desc) console.log(`    desc: ${x.desc}`);
    if (x.effect) console.log(`    effect: ${JSON.stringify(x.effect)}`);
    if (x.buffs) console.log(`    buffs: ${JSON.stringify(x.buffs)}`);
    if (x.teach) console.log(`    teach: ${x.teach}`);
    if (x.type) console.log(`    type: ${x.type} max:${x.max} minLv:${x.minLv}`);
    if (x.atk) console.log(`    atk: ${JSON.stringify(x.atk)}`);
  }
}

const elixirs = dump.items.filter(i => !i.slot);
report('丹药 / 符箓 / 秘籍（无 slot 的成品）', elixirs);
report('法器（有 slot 的装备）', dump.items.filter(i => i.slot));
report('杂材（MATERIALS）', dump.mats);
report('功法（SKILLS）', dump.skills);
console.log('\n=== 坊市 ===');
for (const [k, v] of Object.entries(dump.towns)) console.log(`${k} ${v.name}: ${v.shop.length} 件`);
console.log('\n=== 配方（炼丹/炼器/制符） ===');
for (const r of dump.recipes) console.log(`${r.id} [${r.kind}] ${r.name} -> ${r.out} x${r.outN} cost${r.cost} req${r.req} rate${r.rate} mats=${JSON.stringify(r.mats)}`);
