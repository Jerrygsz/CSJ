// 多 Boss（extraBoss）回归：覆盖全部 12 张挂了续战 Boss 的图（人界 + 灵界 + 仙界）。
// 验证：配置存在 → 主 Boss 与续战 Boss 逐只刷出、顺序正确 → 连杀后能结算。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9163;
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
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

const frames = (n = 1) => page.evaluate(n => new Promise(res => {
  let i = 0; const step = () => { if (++i >= n) res(); else requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), n);

let pass = 0, fail = 0;
const ok = (c, name, extra) => { if (c) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (extra !== undefined ? '   → ' + JSON.stringify(extra) : '')); } };
const eq = (a, b, name) => ok(a === b, name, a === b ? undefined : { got: a, want: b });

const TABLE = {
  houshan:  { boss: '狼妖',               extra: ['贾天龙'] },
  waihai:   { boss: '八级妖兽·毒蛟',       extra: ['妙鹤真人'] },
  heisha:   { boss: '越皇',               extra: ['令狐老祖'] },
  kunwu:    { boss: '阴罗宗大长老·乾老魔', extra: ['银翅夜叉'] },
  zhenmo:   { boss: '元刹圣祖分魂',        extra: ['敖啸老祖'] },
  xiaoji:   { boss: '寒骊上人',            extra: ['冰凤'] },
  luoyun2:  { boss: '鸾鸣门·双修夫妇',     extra: ['至阳上人'] },
  yitian:   { boss: '魔族魔修',            extra: ['青龙上人'] },
  modajie:  { boss: '元魇圣祖·化身',       extra: ['宝花圣祖'] },
  linghuang:{ boss: '灵将',               extra: ['陇家老祖', '银光仙子'] },
  lingyan:  { boss: '白石真人',            extra: ['冷焰老祖'] },
  suidian:  { boss: '奇摩子',              extra: ['黑天魔祖', '白云道祖'] },
};

console.log('\n== 静态：extraBoss 配置 ==');
const staticData = await page.evaluate(() => {
  const out = {};
  for (const m of window.MAPS) if (m.extraBoss) out[m.id] = { boss: m.boss ? m.boss.name : null, extra: m.extraBoss.map(x => x.name), fields: m.extraBoss.map(x => ({ kind: !!x.kind, hp: x.hp > 0, spd: x.spd > 0, dmg: x.dmg > 0, r: x.r > 0, spr: !!x.spr })) };
  return out;
});
let staticBad = [];
for (const id in TABLE) {
  const d = staticData[id];
  if (!d) { staticBad.push(id + ':missing'); continue; }
  if (d.boss !== TABLE[id].boss) staticBad.push(id + ':boss=' + d.boss);
  if (JSON.stringify(d.extra) !== JSON.stringify(TABLE[id].extra)) staticBad.push(id + ':extra=' + JSON.stringify(d.extra));
  for (const f of d.fields) if (!f.kind || !f.hp || !f.spd || !f.dmg || !f.r || !f.spr) staticBad.push(id + ':field');
}
ok(staticBad.length === 0, '12 张图 extraBoss 名字/字段与配置一致', staticBad);
eq(Object.keys(staticData).length, 12, '共 12 张图挂了 extraBoss');
eq(Object.values(staticData).reduce((a, d) => a + d.extra.length, 0), 14, '续战 Boss 共 14 个');

console.log('\n== 动态：逐只刷出顺序 ==');
const fightBad = [];
for (const id in TABLE) {
  const r = await page.evaluate(async (id) => {
    const F = __FR;
    F.clearProgress(); F.setLevel(600); F.unlockAll();
    const mid = F.enterMap(id, 'easy');
    if (mid !== id) return { mid, seq: [] };
    return { mid, seq: [] };
  }, id);
  if (r.mid !== id) { fightBad.push(id + ':enter=' + r.mid); continue; }
  await frames(90);
  await page.evaluate(() => { for (let k = 0; k < 16; k++) { try { __FR.skipStory(); } catch (e) {} } });
  await frames(30);
  const got = await page.evaluate(async (want) => {
    const F = __FR;
    const seq = [];
    F.boss();
    seq.push(F.info().boss ? F.info().boss.name : null);
    for (let i = 0; i < 4; i++) {
      F.bossDamage(1);
      await new Promise(res => requestAnimationFrame(res));
      const nm = F.info().boss ? F.info().boss.name : null;
      if (!nm) break;
      seq.push(nm);
    }
    return seq;
  }, [TABLE[id].boss, ...TABLE[id].extra]);
  const want = [TABLE[id].boss, ...TABLE[id].extra];
  if (JSON.stringify(got) !== JSON.stringify(want)) fightBad.push(id + ':' + JSON.stringify(got) + ' want ' + JSON.stringify(want));
}
ok(fightBad.length === 0, '12 张图逐只刷出顺序 = 主 Boss + extraBoss', fightBad);

console.log('\n== 收尾：连杀后能结算 ==');
const endBad = [];
for (const id in TABLE) {
  const st = await page.evaluate(async (id) => {
    const F = __FR;
    F.clearProgress(); F.setLevel(600); F.unlockAll();
    if (F.enterMap(id, 'easy') !== id) return 'enter-fail';
    for (let k = 0; k < 16; k++) { try { F.skipStory(); } catch (e) {} }
    F.boss();
    F.killBoss();
    for (let t = 0; t < 260; t++) { try { F.insightAuto(); } catch (e) {} await new Promise(res => requestAnimationFrame(res)); }
    for (let k = 0; k < 24; k++) { try { F.skipStory(); } catch (e) {} await new Promise(res => requestAnimationFrame(res)); }
    return F.info().state;
  }, id);
  if (!['victory', 'dialog', 'map', 'levelup'].includes(st)) endBad.push(id + ':' + st);
}
ok(endBad.length === 0, '12 张图连杀全部 Boss 后都能结算', endBad);

ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log(`\n通过 ${pass}　失败 ${fail}`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
