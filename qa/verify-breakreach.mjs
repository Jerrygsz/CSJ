// 进阶门「够不够得着」守门（v1）
//   A. 每一道大境界门：站在卡门前那一级（gate.lv - 1），所需丹药/材料/剧情图都必须真的拿得到；
//      够不着就是死锁 —— 玩家会永远卡在那道门口（例：结丹要天火液，天火液却要结丹后才能买）。
//   B. 进阶界面里每句「去哪取」提示：凡声称「购买 / 炼制 / 掉落 / 药圃」的，数据层必须真有那条路；
//      拿着原文查不到出处，等于骗玩家白跑。
// 用法：node qa/verify-breakreach.mjs [-v]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8992;
const VERBOSE = process.argv.indexOf('-v') >= 0;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; if (VERBOSE) console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const report = await page.evaluate(() => {
  const layerOf = n => { let lv = 1; for (const r of REALM_LAYERS) { if (r.lv <= n) lv = r.lv; else break; } return lv; };
  const realmOf = n => { let name = REALM_LAYERS[0].name; for (const r of REALM_LAYERS) { if (n >= r.lv) name = r.name; else break; } return name; };
  const itemOf = id => Items.get(id) || null;
  const nameOf = id => (itemOf(id) || {}).name || id;
  const mapOk = (m, L) => !!m && (m.startLevel || 1) <= L;

  const shopOf = id => {
    const st = (window.SHOP_STOCK || []).find(s => s.id === id);
    if (!st) return null;
    return { price: st.price, maps: (window.MAPS || []).filter(m => !m.shop || m.shop.indexOf(st.id) >= 0) };
  };
  const dropsOf = id => {
    const out = [];
    for (const m of (window.MAPS || [])) {
      let hit = (m.mats || []).indexOf(id) >= 0;
      if (!hit && m.reward && m.reward.mats) hit = m.reward.mats.some(x => x[0] === id);
      if (!hit && m.reward && m.reward.items) hit = m.reward.items.indexOf(id) >= 0;
      if (!hit && m.enemies) for (const k of m.enemies) { const e = (window.ENEMY_TYPES || {})[k]; if (e && e.mats && e.mats.indexOf(id) >= 0) { hit = true; break; } }
      if (hit) out.push(m);
    }
    return out;
  };
  const gardensOf = id => {
    const out = [];
    for (const cid in (window.CAVES || {})) {
      const c = window.CAVES[cid];
      for (const g of (c.gardens || [])) if ((g.pool || []).indexOf(id) >= 0) out.push((window.MAPS || []).find(m => m.id === g.from));
    }
    return out;
  };
  const craftsOf = id => (window.RECIPES || []).filter(r => r.out === id);

  // 递归：这件东西在 L 级能不能弄到
  const trace = (id, L, seen) => {
    const key = id + '@' + L;
    if (seen.has(key)) return { ok: true, why: '循环引用' };
    seen.add(key);
    const it = itemOf(id);
    const reqBlock = !!(it && it.req && layerOf(it.req) > L);
    const why = [];
    if (it && it.req && layerOf(it.req) > L) why.push('物品门槛 ' + realmOf(it.req) + '（Lv' + layerOf(it.req) + '）> 卡门 Lv' + L);
    let ok = false;
    const sh = shopOf(id);
    if (sh && !reqBlock && sh.maps.some(m => mapOk(m, L))) ok = true;
    if (!ok && !reqBlock && dropsOf(id).some(m => mapOk(m, L))) ok = true;
    if (!ok && !reqBlock && gardensOf(id).some(m => mapOk(m, L))) ok = true;
    if (!ok && !reqBlock) {
      for (const r of craftsOf(id)) {
        if (layerOf(r.req || 1) > L) { why.push('配方门槛 ' + realmOf(r.req) + '（Lv' + layerOf(r.req) + '）> Lv' + L); continue; }
        let all = true, sub = [];
        for (const m of (r.mats || [])) { const t = trace(m[0], L, seen); if (!t.ok) { all = false; sub.push(nameOf(m[0]) + '：' + t.why.join('；')); } }
        if (all) { ok = true; break; }
        why.push('自炼「' + r.name + '」缺：' + sub.join(' / '));
      }
    }
    if (!ok && !why.length) why.push('数据层查无任何来源');
    return { ok, why };
  };

  const gates = [];
  for (const b of (window.BREAKTHROUGH || [])) {
    const L = (b.lv || 1) - 1;
    const g = { gate: b.from + ' → ' + b.realm, L, stand: realmOf(L), bad: [] };
    const push = (kind, id) => { const t = trace(id, L, new Set()); if (!t.ok) g.bad.push(kind + ' ' + nameOf(id) + '（' + id + '）：' + t.why.join('；')); };
    for (const it of (b.items || [])) push('丹', it[0]);
    for (const it of (b.needs || [])) push('宝', it[0]);
    for (const it of (b.mats || [])) push('材', it[0]);
    for (const st of (b.story || [])) {
      const m = (window.MAPS || []).find(x => x.id === st.id);
      if (!m) g.bad.push('剧 ' + (st.name || st.id) + '：数据层查无此图');
      else if ((m.startLevel || 1) > L) g.bad.push('剧 ' + m.name + '：推荐 Lv' + m.startLevel + ' > 卡门 Lv' + L);
    }
    gates.push(g);
  }

  // 提示文案与数据层对账：说了哪条路，就得真有那条路
  const hints = [];
  for (const b of (window.BREAKTHROUGH || [])) {
    const all = [].concat(b.items || [], b.needs || [], b.mats || []);
    for (const [id] of all) {
      const h = (window.BREAK_ITEM_HINTS || {})[id];
      if (!h) continue;
      if (hints.some(x => x.id === id)) continue;
      const claims = [];
      if (/购买|可购|坊市/.test(h)) claims.push({ kind: '购买', has: !!(shopOf(id) && shopOf(id).maps.length) });
      if (/炼制|自炼|开炉/.test(h)) claims.push({ kind: '炼制', has: craftsOf(id).length > 0 });
      if (/掉落|采集|收成/.test(h)) claims.push({ kind: '掉落', has: dropsOf(id).length > 0 });
      if (/药圃|可种/.test(h)) claims.push({ kind: '药圃', has: gardensOf(id).length > 0 });
      hints.push({ id, name: nameOf(id), hint: h, claims: claims.filter(c => !c.has) });
    }
  }
  return { gates, hints };
});

console.log('\n== A. 每道门在「卡门前一级」都够得着 ==');
for (const g of report.gates) {
  ok(g.bad.length === 0, g.gate + '（' + g.stand + ' Lv' + g.L + '）物事齐备可拿', g.bad);
}

console.log('\n== B. 进阶提示不说谎：说了哪条路就真有那条路 ==');
for (const h of report.hints) {
  ok(h.claims.length === 0, h.name + ' 的提示与数据层一致', h.claims.length ? { 提示: h.hint, 查无此路: h.claims.map(c => c.kind) } : undefined);
}
ok(report.hints.length >= 14, '进阶提示覆盖面（' + report.hints.length + ' 条）', report.hints.length);
ok(errors.length === 0, '全程无 JS 报错', errors);

console.log('\n===================================');
console.log('  通过 ' + pass + '  失败 ' + fail);
console.log('===================================');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
