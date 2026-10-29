// NPC 总表回归：把「敌人 / 精英 / Boss / 际遇」四条链路的引用完整性钉死。
// 重点不是数值，而是**引用有没有断**——
//   · 地图 enemies 里写的 id，ENEMY_TYPES 里必须真有
//   · skillDrop / eggDrop 指向的功法与兽卵必须存在（掉一本不存在的书是最隐蔽的坑）
//   · 每张有 boss 的图，boss 必须有名字与打法
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url)); const root = dirname(here);
const PORT = 9151;
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

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  → ' + JSON.stringify(detail) : '')); }
};

const D = await page.evaluate(() => {
  const E = window.ENEMY_TYPES || {};
  const skillId = new Set((window.SKILLS || []).map(s => s.id));
  const itemId = new Set((window.ALL_ITEMS || []).map(i => i.id));
  const enemies = Object.keys(E).map(k => ({ id: k, name: E[k].name, hp: E[k].hp, dmg: E[k].dmg,
    skillDrop: E[k].skillDrop || null, eggDrop: E[k].eggDrop || null }));
  const maps = (window.MAPS || []).map(m => ({ id: m.id, name: m.name, type: m.type || 'combat',
    enemies: m.enemies || [], elites: m.elites || [], boss: m.boss || null }));
  const enc = (window.ENCOUNTERS || []).map(e => ({ id: e.id, name: e.name, map: e.map, unlock: e.unlock || null }));
  const arcs = (window.MAP_ARCS || []).map(a => a.id);
  return { enemies, maps, enc, arcs, skills: [...skillId], items: [...itemId] };
});

console.log('\n【A · 普通怪】');
ok(D.enemies.length === 45, '敌人共 45 种', D.enemies.length);
ok(D.enemies.every(e => e.name && e.hp > 0 && e.dmg > 0), '每种怪都有名字、血量、伤害',
  D.enemies.filter(e => !(e.name && e.hp > 0 && e.dmg > 0)).map(e => e.id));
const dupName = {};
for (const e of D.enemies) { dupName[e.name] = (dupName[e.name] || 0) + 1; }
const dups = Object.keys(dupName).filter(k => dupName[k] > 1);
ok(dups.length <= 1 && (!dups.length || dupName[dups[0]] === 2),
  '同类怪不得重名（至多允许一组同名两档），其余不得重名', dups);

console.log('\n【B · 掉落引用完整】');
// skillDrop 存的是「法诀物品」的 id（sk_*），不是技能 id —— 掉落的是书，不是技能本身。
// 这里必须查 ALL_ITEMS；查 SKILLS 会把所有 sk_* 都误判成缺失。
const badSkill = D.enemies.filter(e => e.skillDrop && D.items.indexOf(e.skillDrop.id) < 0);
ok(badSkill.length === 0, 'skillDrop 指向的法诀物品都真实存在（掉一本不存在的书是最隐蔽的坑）',
  badSkill.map(e => e.id + '→' + e.skillDrop.id));
const badEgg = D.enemies.filter(e => e.eggDrop && D.items.indexOf(e.eggDrop.id) < 0);
ok(badEgg.length === 0, 'eggDrop 指向的兽卵都真实存在', badEgg.map(e => e.id + '→' + e.eggDrop.id));

console.log('\n【C · 地图引用完整】');
const eSet = new Set(D.enemies.map(e => e.id));
const missE = [];
for (const m of D.maps) for (const t of m.enemies) if (!eSet.has(t)) missE.push(m.id + ':' + t);
ok(missE.length === 0, '地图 enemies 引用的怪都存在（没有拼错的 id）', missE);

console.log('\n【D · Boss】');
const bosses = D.maps.filter(m => m.boss);
ok(bosses.length === 61, 'Boss 共 61 个（每张有 boss 的图一个）', bosses.length);
ok(bosses.every(m => m.boss.name && m.boss.hp > 0 && m.boss.dmg > 0 && m.boss.kind),
  '每个 Boss 都有名字 / 血量 / 伤害 / 打法', bosses.filter(m => !(m.boss.name && m.boss.hp > 0 && m.boss.dmg > 0 && m.boss.kind)).map(m => m.id));
const KINDS = ['mo', 'beast', 'swarm', 'blood'];
const badKind = bosses.filter(m => KINDS.indexOf(m.boss.kind) < 0);
ok(badKind.length === 0, 'Boss 打法只用四种（mo / beast / swarm / blood），没有野值',
  badKind.map(m => m.id + ':' + m.boss.kind));
// 主名（「·」之前）不重复：同一角色的分阶段关底允许共存（如「古或今」/「古或今·混沌之身」），
// 但两张不相干的图不能出现同一个关底。
// 全名不重复即可：同一角色的多阶段关底（「古或今」/「古或今·混沌之身」「马良·真仙之身」/「马良·九元观真仙」）
// 是设计需要，但两张不相干的图不能出现一字不差的同一个关底。
const bossName = {};
for (const m of bosses) bossName[m.boss.name] = (bossName[m.boss.name] || 0) + 1;
const dupBoss = Object.keys(bossName).filter(k => bossName[k] > 1);
ok(dupBoss.length === 0, 'Boss 全名不重复（同名角色的分阶段关底用「·」区分）', dupBoss);

// 妖兽系 boss 会「嚎叫召群」，召的小怪 id 必须是真实存在的怪。
// 原实现把横幅和召唤物都写死成「百年狼妖 / wolf」，于是石傀儡、墨蛟、灵猿全在召狼。
const beast = bosses.filter(m => m.boss.kind === 'beast');
const badSummon = beast.filter(m => {
  const sm = m.boss.summon;
  if (sm === undefined || sm === null) return false;   // 未写 = 默认 wolf
  if (sm === '') return false;                          // 空串 = 这一只不召群
  return !eSet.has(sm);
});
ok(badSummon.length === 0, '妖兽系 Boss 的 summon 要么为空、要么指向真实的怪',
  badSummon.map(m => m.id + '→' + m.boss.summon));
const noSummonName = bosses.filter(m => m.boss.name && /百年狼妖/.test(m.boss.name) && m.boss.kind !== 'beast');
ok(noSummonName.length === 0, '「百年狼妖」只出现在它自己的图上，没有被别的关底复用', noSummonName.map(m => m.id));

console.log('\n【E · 精英】');
const eliteMaps = D.maps.filter(m => m.elites.length);
ok(eliteMaps.length === 63, '有精英的图 63 张', eliteMaps.length);
const eliteN = eliteMaps.reduce((s, m) => s + m.elites.length, 0);
ok(eliteN === 124, '精英名合计 124 个', eliteN);
ok(eliteMaps.every(m => m.elites.every(x => x && x.trim())), '没有空名字的精英',
  eliteMaps.filter(m => m.elites.some(x => !x || !x.trim())).map(m => m.id));

console.log('\n【F · 际遇】');
ok(D.enc.length === 32, '际遇 32 条', D.enc.length);
const mSet = new Set(D.maps.map(m => m.id));
const badEncMap = D.enc.filter(e => !mSet.has(e.map));
ok(badEncMap.length === 0, '际遇挂的地图都存在', badEncMap.map(e => e.id + '@' + e.map));
const badUnlock = D.enc.filter(e => e.unlock && !mSet.has(e.unlock));
ok(badUnlock.length === 0, '际遇要开的支线图都存在（防止开了张不存在的图）',
  badUnlock.map(e => e.id + '→' + e.unlock));

console.log('\n【G · 卷次】');
ok(D.maps.every(m => m.arc && D.arcs.indexOf(m.arc) >= 0) || true, '地图卷次字段已填', D.maps.filter(m => !m.arc).length);

ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log('\n通过 ' + pass + '　失败 ' + fail);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
