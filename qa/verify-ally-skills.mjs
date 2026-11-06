// 第116轮 · 同伴 / 灵宠技能常驻闸门
//
// 判据分八组：
//   A 覆盖   —— 页面里真实加载的 MATES + PETS 一个不漏，源码正则再兜一道
//   B 原著   —— 技能名 / 词频 / 摘句 / 关联强度 逐条对上 canon/ally-skills.md 与已核验词频基线
//   C 数值   —— 六种释放形态齐、威力与冷却都在设计带里、四档门槛取自 rangeModel.BANDS
//   D 境界   —— 四档威力严格递增，长期修为改到哪一档，洞府就读到哪一档
//   E 实机   —— 进图逐个真实释放，直接伤害类要见敌人掉血，弹道类要见弹幕增量，全程无 JS 报错
//   F 冷却   —— 独立冷却真的挂在 updatePet / updateMate 上，不是写在数据表里当摆设
//   G 反向   —— 喂四份坏数据给同一套校验器，必须都报错（闸门有牙）
//   H 台账   —— 台账 14 段与代码表逐字段一致
//
// 用法：node qa/verify-ally-skills.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORT = 9131;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
};

// 两本原著全文检索所得词频基线（探针 qa/_out/_canon-ally-terms.mjs 固化，不依赖仓库外的 txt）
const CANON_FREQ = {
  '轮回神光': 8, '还魂术': 21, '大衍诀': 202, '摄魂神光': 6, '虫云': 168,
  '冰封': 164, '七星月体': 14, '傀儡术': 89, '寒焰': 172, '蛛网': 75,
  '风刃': 191, '黑水': 64, '神雷': 652
};
const ALLY_KINDS = ['bolt', 'fan', 'nova', 'chain', 'chill', 'drain'];
const WHITELIST_JUE = ['大衍诀'];            // canon/combat.md 第四节白名单里以「诀」收尾的
const BANDS = [36, 56, 82, 112, 200, 260, 460];  // js/skills.js window.rangeModel.BANDS

// ---------------- 校验器（真实数据与注入数据共用，才谈得上「有牙」） ----------------
function validate(list, defIds, mdText, freq) {
  const errs = [];
  const ids = new Set(list.map(x => x.id));
  for (const d of defIds) if (!ids.has(d)) errs.push('覆盖缺失：' + d);
  for (const x of list) if (!defIds.includes(x.id)) errs.push('技能挂在不存在的实体上：' + x.id);
  for (const s of list) {
    const c = s.canon || {};
    if (!s.name) errs.push(s.id + ' 缺技能名');
    if (/[斩爆]$/.test(s.name || '') || (/诀$/.test(s.name || '') && !WHITELIST_JUE.includes(s.name))) {
      errs.push(s.id + ' 疑似自造技能名：' + s.name);
    }
    if (c.term !== s.name) errs.push(s.id + ' canon.term 与技能名不一致');
    if (!(c.n > 0)) errs.push(s.id + ' 原著词频缺失');
    else if (freq[(c.term || '')] !== c.n) errs.push(s.id + ' 词频与已核验基线不符：' + c.n);
    if (!c.quote) errs.push(s.id + ' 缺原著摘句');
    if (!['direct', 'ability', 'borrowed'].includes(c.link)) errs.push(s.id + ' 关联强度非法');
    if (c.link !== 'direct' && !c.note) errs.push(s.id + ' 借用/引申未写明非原著招式');
    if (!c.src) errs.push(s.id + ' 缺出处');
    if (!(s.pow > 0)) errs.push(s.id + ' 威力非正');
    if (!(s.cd >= 6 && s.cd <= 12)) errs.push(s.id + ' 冷却越界：' + s.cd);
    if (!ALLY_KINDS.includes(s.kind)) errs.push(s.id + ' 释放形态非法：' + s.kind);
    // 台账逐条对得上
    const sec = mdText.split(/^### /m).find(b => b.startsWith(s.id + ' · '));
    if (!sec) { errs.push(s.id + ' 台账无此段'); continue; }
    if (!sec.includes('技能名：' + s.name)) errs.push(s.id + ' 台账技能名不符');
    if (!sec.includes('词频：' + c.n)) errs.push(s.id + ' 台账词频不符');
    if (c.quote && !sec.includes('摘句：「' + c.quote + '」')) errs.push(s.id + ' 台账摘句不符');
  }
  return errs;
}

// ---------------- 起服务 / 开页面 ----------------
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 430, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e) + ' || ' + ((e.stack || '').split('\n')[1] || '')));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};

await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);
await page.evaluate(() => {
  const ids = window.MAPS.map(m => m.id);
  const s = {
    version: 5, unlocked: ids, cleared: ids, caves: Object.keys(window.CAVES || {}), diffClear: {},
    cultivate: { level: 1, xp: 0, skills: { sword: 6 } },
    pets: [{ id: 'p_tihun', lv: 1, xp: 0 }, { id: 'p_xiedaoren', lv: 1, xp: 0 }],
    pet: 'p_tihun', mates: ['m_nangongwan', 'm_yuanyao', 'm_dayanshenjun'], mate: 'm_nangongwan',
    inventory: {}, stones: 50000, best: { level: 1, time: 0, kills: 0 }
  };
  localStorage.setItem('fanren_save_v1', JSON.stringify(s));
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

const live = await page.evaluate(() => ({
  fr: window.__FR.allySkills(),
  defs: {
    mates: (window.MATES || []).map(m => ({ id: m.id, name: m.name })),
    pets: (window.PETS || []).map(p => ({ id: p.id, name: p.name }))
  },
  bands: (window.rangeModel && window.rangeModel.BANDS) || []
}));
const mdText = fs.readFileSync(join(ROOT, 'canon', 'ally-skills.md'), 'utf8');
const defIds = live.defs.mates.map(x => x.id).concat(live.defs.pets.map(x => x.id));
const list = live.fr.list;

console.log('\n【A · 覆盖：每个同伴 / 灵宠都有技能】');
ok(list.length === 14, '技能表 14 条（3 同伴 + 11 灵宠）', list.length);
ok(live.defs.mates.length === 3 && live.defs.pets.length === 11,
  '页面真实加载 3 位同伴 / 11 只灵宠', { m: live.defs.mates.length, p: live.defs.pets.length });
ok(defIds.every(d => list.some(x => x.id === d)), '运行时实体全被技能表覆盖',
  defIds.filter(d => !list.some(x => x.id === d)));
// 源码正则再兜一道：防止运行时被过滤掉的定义逃过检查
const srcIds = new Set();
for (const f of ['late2.js', 'late3.js', 'lingjie.js']) {
  const t = fs.readFileSync(join(ROOT, 'js', f), 'utf8');
  // 材料 id 也是 m_ 开头，必须再认「同一行带 spr 立绘字段」才是同伴/灵宠定义
  for (const m of t.matchAll(/\{\s*id:\s*'((?:m|p)_[a-z0-9_]+)'[^}\n]*?\bspr:/g)) srcIds.add(m[1]);
}
ok(defIds.every(d => srcIds.has(d)), '源码里每个实体 id 都在运行时清单里',
  defIds.filter(d => !srcIds.has(d)));
ok([...srcIds].every(d => defIds.includes(d)), '源码没有漏网的实体定义',
  [...srcIds].filter(d => !defIds.includes(d)));

console.log('\n【B · 原著：名字 / 词频 / 摘句 / 关联强度】');
const realErrs = validate(list, defIds, mdText, CANON_FREQ);
ok(realErrs.length === 0, '14 条全部通过原著校验', realErrs.slice(0, 6));
ok(list.every(s => s.canon && s.canon.term === s.name), 'canon.term 与技能名逐条一致');
ok(list.every(s => CANON_FREQ[s.canon.term] === s.canon.n), '词频与已核验基线逐条一致');
const linkCount = list.reduce((o, s) => (o[s.canon.link] = (o[s.canon.link] || 0) + 1, o), {});
ok(linkCount.direct === 10 && linkCount.ability === 2 && linkCount.borrowed === 2,
  '关联强度 10 direct / 2 ability / 2 borrowed', linkCount);
ok(list.filter(s => s.canon.link !== 'direct').every(s => !!s.canon.note),
  '4 条借用 / 引申都写明了非原著独立招式');
ok(!list.some(s => /[斩爆]$/.test(s.name)), '没有「XX斩 / XX爆」式自造名');
ok(list.filter(s => /诀$/.test(s.name)).every(s => WHITELIST_JUE.includes(s.name)),
  '以「诀」收尾的只有白名单里的大衍诀');

console.log('\n【C · 数值：六种形态 / 设计带 / 档位门槛】');
const kinds = [...new Set(list.map(s => s.kind))].sort();
ok(ALLY_KINDS.every(k => kinds.includes(k)), '六种释放形态全都有', kinds);
ok(list.every(s => s.pow >= 10 && s.pow <= 30), '基础威力落在 10~30（辅助攻击，不抢主角输出）',
  list.filter(s => s.pow < 10 || s.pow > 30).map(s => [s.id, s.pow]));
ok(list.every(s => s.cd >= 6 && s.cd <= 12), '独立冷却落在 6~12 秒');
ok(list.filter(s => ['nova', 'chill', 'drain'].includes(s.kind)).every(s => s.rad > 0), '范围类都有作用半径');
ok(list.filter(s => ['fan', 'chain'].includes(s.kind)).every(s => s.count > 0), '多目标类都有数量');
ok(BANDS.includes(36) && BANDS.includes(112) && BANDS.includes(260), '档位门槛取自 rangeModel.BANDS');
const tiers = live.fr.tiers;
ok(tiers.length === 4 && tiers.every((t, i) => i === 0 || (t.at > tiers[i - 1].at && t.mul > tiers[i - 1].mul)),
  '四档门槛与倍率都严格递增', tiers);
ok(live.bands.join(',') === BANDS.join(','), '页面里的 rangeModel.BANDS 与基线一致', live.bands);

console.log('\n【D · 境界：修为涨，技能威力跟着涨】');
const powers = await page.evaluate((ids) => ids.map(id => ({
  id, p: [1, 36, 112, 260].map(lv => window.__FR.allySkillPower(id, lv))
})), list.map(s => s.id));
ok(powers.every(x => x.p.every((v, i) => i === 0 || v > x.p[i - 1])), '14 条技能四档威力严格递增',
  powers.filter(x => !x.p.every((v, i) => i === 0 || v > x.p[i - 1])).slice(0, 3));
ok(powers.every(x => Math.abs(x.p[0] - list.find(s => s.id === x.id).pow) < 0.001), '初悟档 = 数据表基础威力');
const tierWalk = await page.evaluate(() => [1, 36, 112, 260].map(lv => {
  window.__FR.setLevel(lv);
  return { lv, label: window.__FR.allySkills().tier.label, mul: window.__FR.allySkills().tier.mul };
}));
ok(tierWalk.map(t => t.label).join('/') === '初悟/精进/圆熟/通玄', '长期修为改到哪一档，探针就读到哪一档', tierWalk);
ok(live.fr.realmMul >= 1, '战内境界倍率可读（伤害由 damageEnemy 的 dmgMul 承担，不再二次放大）', live.fr.realmMul);
await page.evaluate(() => window.__FR.setLevel(1));

console.log('\n【E · 实机：逐个真实释放，见血见弹】');
const combat = await page.evaluate((ids) => {
  const F = window.__FR, G = F.G;
  F.enterMap('houshan', 'easy');
  if (G.state === 'dialog') F.skipStory();
  if (!G.player) return { err: 'no player', state: G.state };
  // 四个不会死的靶子，放在主角身边，保证 range / chain 都够得着
  const dummies = [];
  for (let i = 0; i < 4; i++) {
    const e = {
      _id: 900000 + i, type: 'wolf', x: G.player.x + 40 + i * 22, y: G.player.y + (i - 2) * 12,
      hp: 1e9, maxhp: 1e9, r: 10, spd: 0, dmg: 0, xpVal: 0, spr: 'wolf',
      hitFlash: 0, t: 0, dashT: 0, stunT: 0, _orbCd: {}, art: null, _artCd: 0, wob: 0
    };
    G.enemies.push(e); dummies.push(e);
  }
  const out = [];
  for (const id of ids) {
    const hp0 = dummies.reduce((s, e) => s + e.hp, 0);
    const bl0 = G.bullets.length;
    const r = F.allySkillCast(id);
    const hp1 = dummies.reduce((s, e) => s + e.hp, 0);
    out.push({ id, r, dmgDealt: +(hp0 - hp1).toFixed(1), newBullets: G.bullets.length - bl0 });
  }
  // 收尾：清掉靶子与本次新加的弹，别留给 rAF 继续算
  for (const e of dummies) { const i = G.enemies.indexOf(e); if (i >= 0) G.enemies.splice(i, 1); }
  G.bullets = G.bullets.filter(x => !x.ally);
  return { state: G.state, out };
}, list.map(s => s.id));
ok(!combat.err && combat.out && combat.out.length === 14, '14 条技能全部真实释放成功', combat.err || (combat.out && combat.out.length));
if (combat.out) {
  ok(combat.out.every(x => x.r && x.r.name && x.r.dmg > 0), '每次释放都返回技能名与正威力');
  const byKind = {};
  for (const x of combat.out) { const k = (x.r && x.r.kind) || '?'; (byKind[k] = byKind[k] || []).push(x); }
  ok(ALLY_KINDS.every(k => byKind[k] && byKind[k].length), '六种形态在实机里都跑到了',
    Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, v.length])));
  const directK = ['nova', 'chain', 'chill', 'drain'];
  ok(combat.out.filter(x => directK.includes(x.r.kind)).every(x => x.dmgDealt > 0),
    '直接伤害类确实打掉了靶子的血',
    combat.out.filter(x => directK.includes(x.r.kind) && !(x.dmgDealt > 0)).map(x => x.id));
  ok(combat.out.filter(x => ['bolt', 'fan'].includes(x.r.kind)).every(x => x.newBullets > 0),
    '弹道类确实生成了己方弹幕',
    combat.out.filter(x => ['bolt', 'fan'].includes(x.r.kind) && !(x.newBullets > 0)).map(x => x.id));
  ok(combat.out.filter(x => x.r.kind === 'fan').every(x => x.r.shots >= 3), '扇形类至少三发');
  ok(combat.out.filter(x => x.r.kind === 'chain').every(x => x.r.hit <= 3), '连锁类不越过 count 上限');
}
ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 3));

console.log('\n【F · 冷却：真的挂在两个 update 上】');
const gsrc = fs.readFileSync(join(ROOT, 'js', 'game.js'), 'utf8');
const tickInPet = /function updatePet\(dt\)[\s\S]{0,900}?tickAllySkill\(pt, def\.id, dt\)/.test(gsrc);
const tickInMate = /function updateMate\(dt\)[\s\S]{0,900}?tickAllySkill\(mt, def\.id, dt\)/.test(gsrc);
ok(tickInPet && tickInMate, 'updatePet / updateMate 各接了一次独立冷却');
ok(/ent\.skCd = sk\.cd \|\| 8/.test(gsrc), '释放后冷却被重置为数据表 cd');
ok(/if \(G\.state !== 'play'\) return;[\s\S]{0,160}?tickAllySkill\(/.test(gsrc), '技能只在战斗中跑，且不受普攻 early return 影响');
ok(/function allyDamage[\s\S]{0,400}?reportHit/.test(gsrc), '联机客机的直接伤害走房主上报，不本地扣权威怪');

console.log('\n【G · 反向注入：闸门得有牙】');
const bad = [];
bad.push({ label: '自造技能名', data: list.map((s, i) => i === 0 ? { ...s, name: '九霄裂天斩', canon: { ...s.canon, term: '九霄裂天斩' } } : s) });
bad.push({ label: '覆盖缺失', data: list.filter((_, i) => i !== 3) });
bad.push({ label: '词频造假', data: list.map((s, i) => i === 2 ? { ...s, canon: { ...s.canon, n: 9999 } } : s) });
bad.push({ label: '摘句查无', data: list.map((s, i) => i === 5 ? { ...s, canon: { ...s.canon, quote: '此句原著里根本没有' } } : s) });
for (const x of bad) {
  const e = validate(x.data, defIds, mdText, CANON_FREQ);
  ok(e.length > 0, '注入「' + x.label + '」会被拦下', e.slice(0, 2));
}

console.log('\n【H · 台账与代码表一致】');
const secs = (mdText.match(/^### [mp]_[a-z0-9_]+ · /gm) || []);
ok(secs.length === 14, '台账正好 14 段', secs.length);
ok(list.every(s => mdText.includes('### ' + s.id + ' · ')), '每段都能按实体 id 定位');
ok(mdText.includes('没有一条是自造词') && mdText.includes('D:\\Games\\CSJ\\raw'), '台账写明了数据源与自造词结论');

console.log('\n===================================');
console.log('  ' + pass + ' 通过 / ' + fail + ' 失败');
console.log('===================================');
if (errs.length) console.log('  页面报错：' + errs.slice(0, 3).join(' ｜ '));
await b.close();
server.close();
process.exit(fail ? 1 : 0);
