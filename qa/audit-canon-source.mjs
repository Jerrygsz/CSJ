// 功法 / 配方 / 道具来源 底稿，供对版原著
// 用法：node qa/audit-canon-source.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9046;
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

const d = await page.evaluate(() => {
  const W = window;
  const skills = (W.SKILLS || []).map(s => ({
    id: s.id, name: s.name, minLv: s.minLv || 1, max: s.max, type: s.type,
    vfx: s.atk ? s.atk.vfx : (s.effect && s.effect.vfx) || null,
    kind: s.atk ? s.atk.kind : 'passive',
    desc: s.desc || ''
  }));
  const recipes = (W.RECIPES || []).map(r => ({
    id: r.id, kind: r.kind, name: r.name, out: r.out, req: r.req || 1,
    mats: (r.mats || []).map(m => m[0]), book: r.book || r.formula || null, rate: r.rate
  }));
  // 每件道具的获取途径
  const src = {};
  const note = (id, s) => { (src[id] = src[id] || []).push(s); };
  for (const r of (W.RECIPES || [])) note(r.out, '炼:' + r.name + '(Lv' + (r.req || 1) + ')');
  for (const m of (W.MAPS || [])) {
    for (const id of (m.shop || [])) note(id, '坊:' + m.name);
    for (const a of (m.auction || [])) note(a.id, '拍:' + m.name);
    const rw = m.reward || {};
    for (const id of (rw.items || [])) note(id, '剧情:' + m.name);
    for (const g of (rw.grants || [])) note(g[0], '剧情:' + m.name);
    for (const mm of (rw.mats || [])) note(mm[0], '剧情:' + m.name);
  }
  for (const e of (W.ENCOUNTERS || [])) {
    const rw = e.reward || {};
    for (const id of (rw.items || [])) note(id, '际遇:' + e.name);
    for (const mm of (rw.mats || [])) note(mm[0], '际遇:' + e.name);
  }
  for (const k in (W.ENEMY_TYPES || {})) {
    for (const id of (W.ENEMY_TYPES[k].mats || [])) note(id, '掉落:' + W.ENEMY_TYPES[k].name);
    if (W.ENEMY_TYPES[k].skillDrop) note(W.ENEMY_TYPES[k].skillDrop.id, '掉落:' + W.ENEMY_TYPES[k].name);
  }
  const items = (W.ALL_ITEMS || []).concat(W.MATERIALS || []).map(it => ({
    id: it.id, name: it.name, req: it.req || 1, rarity: it.rarity,
    slot: it.slot || null, teach: it.teach || null,
    src: (src[it.id] || [])
  }));
  // 坊市越级：坊市所在地图的推荐等级 vs 商品 req
  const shopOver = [];
  for (const m of (W.MAPS || [])) {
    for (const id of (m.shop || [])) {
      const it = items.find(x => x.id === id);
      if (it && it.req && it.req > (m.startLevel || 1) + 8) shopOver.push({ map: m.name, lv: m.startLevel, item: it.name, req: it.req });
    }
  }
  return { skills, recipes, items, shopOver };
});

fs.writeFileSync(join(here, 'canon-source.json'), JSON.stringify(d, null, 1), 'utf8');

let md = '# 功法 / 配方 / 道具来源底稿\n\n## 一、功法（' + d.skills.length + '）\n\n| id | 名称 | 解锁 | 满层 | 类型 | 特效 |\n|---|---|---:|---:|---|---|\n';
for (const s of d.skills) md += `| ${s.id} | ${s.name} | Lv${s.minLv} | ${s.max} | ${s.kind}${s.type ? '/' + s.type : ''} | ${s.vfx || '—'} |\n`;
md += '\n## 二、配方（' + d.recipes.length + '）\n\n| 产出 | 类别 | 境界门槛 | 材料 |\n|---|---|---|---|\n';
for (const r of d.recipes) md += `| ${r.name} | ${r.kind} | Lv${r.req} | ${r.mats.join('、')} |\n`;
md += '\n## 三、没有任何获取途径的道具\n\n| 道具 | req |\n|---|---|\n';
const noSrc = d.items.filter(i => !i.src.length);
for (const i of noSrc) md += `| ${i.name}（${i.id}） | ${i.req} |\n`;
md += '\n## 四、坊市越级售卖（商品境界 > 该图推荐等级 +8）\n\n| 坊市 | 该图等级 | 商品 | 商品境界 |\n|---|---:|---|---:|\n';
for (const x of d.shopOver) md += `| ${x.map} | ${x.lv} | ${x.item} | Lv${x.req} |\n`;
fs.writeFileSync(join(here, 'canon-source.md'), md, 'utf8');

console.log('skills=' + d.skills.length + ' recipes=' + d.recipes.length + ' items=' + d.items.length +
  ' 无来源=' + noSrc.length + ' 坊市越级=' + d.shopOver.length);
for (const x of d.shopOver) console.log(' 越级: ' + x.map + '(Lv' + x.lv + ') 卖 ' + x.item + ' Lv' + x.req);
for (const i of noSrc) console.log(' 无来源: ' + i.name + '(' + i.id + ') Lv' + i.req);
await b.close(); server.close();
