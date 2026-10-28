// 校验破境药材的产地与保底产量：ALCH_ZONES 挂得对、一局发得满、非原著产地不掉
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9073;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.png':'image/png' };
const server = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p==='/') p='/index.html'; const f = join(root,p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200,{ 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
await new Promise(r => server.listen(PORT,'127.0.0.1',r));

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m, x === undefined ? '' : JSON.stringify(x)); } };

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport:{width:430,height:900} });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil:'load' });
await page.waitForFunction(() => !!window.__FR);
// 全图已开、修为 120 的测试存档
await page.evaluate(() => {
  const ids = window.MAPS.map(m => m.id);
  localStorage.setItem('fanren_save_v1', JSON.stringify({
    version: 5, unlocked: ids, cleared: ids, caves: Object.keys(window.CAVES || {}),
    cultivate: { level: 120, xp: 0, skills: {} }, inventory: {}, stones: 50000, best: { level: 120 }
  }));
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
await page.evaluate(() => { window.__FR.G.god = true; window.__FR.timeScale(12); });

// ---------- 1) 产地：筑基丹三主药只许血色禁地 / 血池产 ----------
console.log('\n【产地】');
const place = await page.evaluate(() => {
  const out = {};
  const push = (id, src) => (out[id] = out[id] || []).push(src);
  for (const m of window.MAPS) {
    for (const id of (m.mats || [])) push(id, 'map:' + m.id);
    for (const [id] of ((m.reward && m.reward.mats) || [])) push(id, 'reward:' + m.id);
  }
  for (const [eid, e] of Object.entries(window.ENEMY_TYPES || {})) for (const id of (e.mats || [])) push(id, 'mob:' + eid);
  for (const z of (window.ALCH_ZONES || [])) {
    const r = window.Recipes.get(z.rec); if (!r) continue;
    for (const [id] of r.mats) if (!z.only || z.only.indexOf(id) >= 0) push(id, 'alch:' + z.map);
  }
  return out;
});
for (const id of ['m_yusuizhi', 'm_zihua', 'm_tianling', 'm_longlin']) {
  const from = (place[id] || []).filter(s => !s.startsWith('alch:'));
  const maps = [...new Set(from.map(s => s.split(':')[1]))];
  const bad = maps.filter(m => m !== 'xuese' && m !== 'xuechi');
  ok(bad.length === 0, `${id} 只产在血色禁地/血池（实际：${maps.join(',') || '无'}）`, bad);
}
ok(!place['m_zhuguo'], '已删的「朱果」不再有任何出处', place['m_zhuguo']);
ok(!(place['m_huodan'] || []).some(s => s.startsWith('map:') && s !== 'map:zhuimo'),
  '火蟾兽内丹只在坠魔谷', place['m_huodan']);

// ---------- 2) 保底：一局凡境发满 3 套 ----------
console.log('\n【保底产量】');
const setsOf = { easy: 3, hard: 5, nightmare: 8 };
for (const [map, diff] of [['xuese', 'easy'], ['xuese', 'hard'], ['xuese', 'nightmare'], ['xutian', 'easy'], ['zhuimo', 'easy']]) {
  const plan = await page.evaluate(([m, d]) => {
    window.__FR.enterMap(m, d);
    const G = window.__FR.G;
    if (G.state === 'dialog') window.__FR.skipStory();
    return G.alch ? { total: G.alch.total, plan: G.alch.plan.map(x => [x[0], x[1]]) } : null;
  }, [map, diff]);
  if (!plan) { ok(false, `${map}/${diff} 应有配额`); continue; }
  let given = 0; const t0 = Date.now();
  while (Date.now() - t0 < 70000) {
    await page.waitForTimeout(250);
    const st = await page.evaluate(() => {
      const F = window.__FR, G = F.G;
      if (G.state === 'dialog') { if (G.dialogIsChoice) F.pickChoice(0); else F.skipStory(); }
      else if (G.state === 'levelup') { const c = document.querySelector('#levelup .card'); if (c) c.click(); else F.advanceDialog(); }
      else if (G.state === 'pause') F.resume();
      return { given: G.alch ? G.alch.given : -1, state: G.state };
    });
    given = st.given;
    if (st.given >= plan.total || ['settle', 'victory', 'over'].includes(st.state)) break;
  }
  const isZhuji = map === 'xuese';
  const expect = isZhuji ? 12 * setsOf[diff] : null;
  ok(given >= plan.total, `${map}/${diff} 配额发满（${plan.total} 份，实发 ${given}）`, { given, total: plan.total });
  if (expect) ok(plan.total === expect, `筑基丹 ${setsOf[diff]} 套 = ${expect} 味料`, plan.total);
}
ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log('\n===================================');
console.log(`  ${pass} 通过 / ${fail} 失败`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
