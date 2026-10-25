// 抽取全部数值，供生成「数值总表」
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9034;
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

const data = await page.evaluate(() => {
  const W = window;
  const xpNeed = lv => Math.floor(5 + lv * 2.6 + lv * lv * 0.14);
  const realms = (W.REALM_LAYERS || []).map(r => Object.assign({}, r, { xp: xpNeed(r.lv) }));
  // 累计经验到该层（从 1 级起）
  let acc = 0;
  for (const r of realms) { for (let l = 1; l < r.lv; l++) {} }
  const enemies = Object.keys(W.ENEMY_TYPES || {}).map(id => Object.assign({ id }, W.ENEMY_TYPES[id]));
  const maps = (W.MAPS || []).map(m => ({
    id: m.id, name: m.name, pos: m.pos || '', arc: m.arc || '', side: !!m.side,
    type: m.type, startLevel: m.startLevel || 1, endLevel: m.endLevel || null,
    diff: m.diff || null, bossAt: m.bossAt != null ? m.bossAt : null,
    enemies: m.enemies || [], boss: m.boss || null,
    shop: m.shop || null, auction: m.auction || null,
    unlock: m.unlock || null, next: m.next || null, unlockBy: m.unlockBy || null,
    reward: m.reward || null
  }));
  const encs = (W.ENCOUNTERS || []).map(e => ({
    id: e.id, name: e.name, map: e.map, unlock: e.unlock || null,
    cond: e.cond || null, repeat: !!e.repeat, reward: e.reward || null, n: (e.lines || []).length
  }));
  const brk = (W.BREAKTHROUGH || []).map(b => ({
    lv: b.lv, from: b.from, realm: b.realm, items: b.items || [], mats: b.mats || [],
    stones: b.stones || 0, needs: b.needs || [], story: b.story || [], chance: b.chance || null
  }));
  const caves = Object.keys(W.CAVES || {}).map(id => {
    const c = W.CAVES[id];
    return { id, name: c.name, from: c.from, capLevel: c.capLevel, restStone: c.restStone, restXp: c.restXp };
  });
  const pets = (W.PETS || []).map(p => ({ id: p.id, name: p.name, dmg: p.dmg, rate: p.rate, from: p.from || '', desc: p.desc || '' }));
  const mates = (W.MATES || []).map(m => ({ id: m.id, name: m.name, dmg: m.dmg, rate: m.rate, from: m.from || '', leave: m.leave || '', desc: m.desc || '' }));
  const skills = (W.SKILLS || []).map(k => ({
    id: k.id, name: k.name, minLv: k.minLv || 1, max: k.max || 1, type: k.type || '',
    base: k.atk ? k.atk.base : null, perLv: k.atk ? k.atk.perLv : null, cd: k.atk ? k.atk.cd : null,
    main: !!k.main, desc: k.desc || ''
  }));
  // 全量 id→名称，供材料/道具回显中文名
  const names = {};
  for (const it of (W.ALL_ITEMS || [])) names[it.id] = it.name;
  for (const k of skills) names[k.id] = k.name;
  return { realms, enemies, maps, encs, brk, caves, pets, mates, skills, names };
});

fs.writeFileSync(join(here, 'stats-dump.json'), JSON.stringify(data, null, 1), 'utf8');
console.log('realms=' + data.realms.length + ' enemies=' + data.enemies.length + ' maps=' + data.maps.length +
  ' encs=' + data.encs.length + ' brk=' + data.brk.length + ' caves=' + data.caves.length);
await b.close(); server.close();
