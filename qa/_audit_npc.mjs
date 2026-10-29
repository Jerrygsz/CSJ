import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9141;
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
  const enemies = Object.keys(E).map(k => {
    const t = E[k];
    return { id: k, name: t.name, hp: t.hp, spd: t.spd, dmg: t.dmg, r: t.r, tier: t.tier,
      drop: t.drop, flag: [t.wob ? 'wob' : '', t.charge ? 'charge' : '', t.dash ? 'dash' : ''].filter(Boolean).join(','),
      mats: t.mats || [], skillDrop: t.skillDrop || null, eggDrop: t.eggDrop || null };
  });
  const maps = [];
  for (const m of (window.MAPS || [])) {
    maps.push({ id: m.id, name: m.name, type: m.type || 'combat', arc: m.arc || '',
      enemies: m.enemies || [], boss: m.boss || null, side: !!m.side });
  }
  const enc = (window.ENCOUNTERS || []).map(e => ({ id: e.id, map: e.map, name: e.name, spr: e.spr, unlock: e.unlock || null, repeat: !!e.repeat, cond: e.cond || null }));
  // 地图里引用但没定义的敌人 id
  const missing = [];
  for (const m of maps) for (const t of m.enemies) if (!E[t]) missing.push(m.id + ':' + t);
  // 定义但从未被任何图引用的敌人
  const used = new Set(); for (const m of maps) for (const t of m.enemies) used.add(t);
  const unused = Object.keys(E).filter(k => !used.has(k));
  return { enemies, maps, enc, missing, unused };
});

fs.writeFileSync(join(here, '_npc_dump.json'), JSON.stringify(dump, null, 1), 'utf8');

console.log('=== ENEMY_TYPES 共 ' + dump.enemies.length + ' 种 ===');
for (const e of dump.enemies) {
  console.log([e.id, e.name, 'hp' + e.hp, 'dmg' + e.dmg, 'tier' + e.tier, e.flag,
    'mats:' + e.mats.map(x => (Array.isArray(x) ? x.join('x') : x)).join('/'),
    e.skillDrop ? 'skill:' + e.skillDrop.id : '', e.eggDrop ? 'egg:' + e.eggDrop.id : ''].filter(Boolean).join(' | '));
}
console.log('\n=== 有 boss 的地图 ===');
for (const m of dump.maps) if (m.boss) console.log(m.id + ' | ' + m.name + ' | ' + (m.boss.name || '?') + ' | kind:' + (m.boss.kind || '?') + ' hp' + m.boss.hp + ' dmg' + m.boss.dmg + ' spr:' + (m.boss.spr || ''));
console.log('\n=== 地图敌人挂载（' + dump.maps.length + ' 张）===');
for (const m of dump.maps) console.log(m.id + ' | ' + m.name + ' | ' + (m.type || '') + ' | ' + m.enemies.join(','));
console.log('\n=== 际遇 ' + dump.enc.length + ' 条 ===');
for (const e of dump.enc) console.log(e.id + ' | ' + e.name + ' | ' + e.map + ' | unlock:' + (e.unlock || '-') + ' | ' + (e.repeat ? '可反复' : '一次性'));
console.log('\n=== 缺失定义 ===', dump.missing);
console.log('=== 未被任何图引用 ===', dump.unused);

await b.close(); server.close();
