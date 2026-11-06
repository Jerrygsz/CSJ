// 第116轮 · 同伴 / 灵宠技能常驻闸门
//
// 判据分十六组：
//   A 覆盖   —— 页面里真实加载的 MATES + PETS 一个不漏，源码正则再兜一道
//   B 原著   —— 技能名 / 词频 / 摘句 / 关联强度 逐条对上 canon/ally-skills.md 与已核验词频基线
//   C 数值   —— 六种释放形态齐、威力与冷却都在设计带里、四档门槛取自 rangeModel.BANDS
//   D 境界   —— 四档威力严格递增，长期修为改到哪一档，洞府就读到哪一档
//   E 实机   —— 进图逐个真实释放，直接伤害类要见敌人掉血，弹道类要见弹幕增量，全程无 JS 报错
//   F 冷却   —— 独立冷却真的挂在 updatePet / updateMate 上，不是写在数据表里当摆设
//   G 反向   —— 喂四份坏数据给同一套校验器，必须都报错（闸门有牙）
//   H 台账   —— 台账 14 段与代码表逐字段一致
//   I 水墨   —— 第117轮：读一招真正画出来的粒子 / 印蜕 / 像素特效 / 出手动作，
//               逐条对上六种形态各自的笔势清单；色阶只认 fxpix.PAL 四档
//   J 反向   —— 第117轮：把法阵 / 像素特效 / 印蜕 / 动作 / 调色板逐个抽掉，闸门得红
//   K 三功   —— 第118轮：护体 / 近身 / 远击三类齐，CD 与韩立当前境界功法攻速同口径，
//               逐档拨 G.realm.atk 验证单调递减 + 下限钳制；三类都真实释放并数特效
//   L 自由   —— 第118轮：可视范围内自主移动追怪、不再围绕韩立，坐标永远夹在视野矩形里
//   M 生死   —— 第118轮：血量=主角满血 50%（不显血条）/ 受击 / 护体减伤 / 殒落落台账 /
//               十息时钱够才自动扣 10000 复生 / 当时钱不够记欠费，此后攒够也不起身 /
//               必须回洞府交钱 / 死亡台账与欠费台账都跨地图保留
//   N 反向   —— 第118轮：把血量比例、三类集合、CD 曲线、复活价、经济结算、欠费状态、视野边界逐个注入坏数据
//   O 侧身   —— 第119轮：遇攻击 / 碰撞时复用大衍挂机 autoDodgeDir 的三时间点 + 十二方向评分，
//               但无 autoAnchor（不站桩）；实拍验证干净场面不乱躲、弹幕逼近真侧移、
//               让完回到自由 AI、仍可被打中（不是无敌）、贴边不出可视范围
//   P 反向   —— 第119轮：把锚点、方向数、时间点、侧身方向、位移、自由 AI 恢复、受击、边界逐个注入坏数据
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
const ALLY_KINDS = ['bolt', 'fan', 'nova', 'chain', 'chill', 'drain'];  // 第116轮本命绝学六种形态
const WHITELIST_JUE = ['大衍诀'];            // canon/combat.md 第四节白名单里以「诀」收尾的
const BANDS = [36, 56, 82, 112, 200, 260, 460];  // js/skills.js window.rangeModel.BANDS
const ALLY_PALS = ['xue', 'jin', 'qi', 'mo'];     // 第117轮：只认 fxpix.js PAL 的四条六档色阶
// 第118轮：三类常规功法。cdKey 是「韩立身上对应那一类功法」的 id，不是拍脑袋定的常数。
const ART_KINDS = ['guard', 'melee', 'ranged'];
const ART_CD_KEYS = { guard: 'nova', melee: 'frost', ranged: 'sword' };
// 每种形态「至少得画出什么」：数字是粒子条数下限，来自主角功法同款原语的组合
//（起手法阵 1、像素符文 1、主特效 1、朱砂印蜕 1、主角同款弯月 / 放射 / 折线 / 网）。
const FX_NEED = {
  bolt:  { rune: 1, slash: 1,  fx3: 2, seal: 1 },
  fan:   { rune: 1, slash: 3,  fx3: 2, seal: 1 },
  nova:  { rune: 1, ray: 12, ring: 2, fx3: 2, seal: 1 },
  chain: { rune: 1, bolt: 3, web: 6,  fx3: 2, seal: 1 },
  chill: { rune: 1, web: 7,  ring: 2, fx3: 2, seal: 1 },
  drain: { rune: 2, ring: 2, fx3: 2, seal: 1 }
};

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

// 第117轮 · 水墨呈现校验器：真实产物与注入数据共用，才谈得上「有牙」。
function validateFx(list, fxById, pals) {
  const errs = [];
  for (const s of list) {
    if (!pals.includes(s.pal)) errs.push(s.id + ' 调色板非法：' + s.pal);
    const f = fxById[s.id];
    if (!f) { errs.push(s.id + ' 没读到特效产物'); continue; }
    const need = FX_NEED[s.kind] || {};
    for (const k of Object.keys(need)) {
      if (!(f[k] >= need[k])) errs.push(s.id + ' 缺 ' + k + '（要 ≥' + need[k] + '，实得 ' + f[k] + '）');
    }
    if (!(f.cast > 0)) errs.push(s.id + ' 起手动作没挂上');
    if (!(f.total >= 8)) errs.push(s.id + ' 特效粒子过少：' + f.total);
    if (f.kind !== s.kind) errs.push(s.id + ' 实机形态与数据表不符');
  }
  for (const p of pals) if (!list.some(s => s.pal === p)) errs.push('调色板 ' + p + ' 一条都没用上');
  return errs;
}

// 第118轮 · 三功 / 自由行动 / 生死经济校验器：真实产物与注入数据共用（闸门得有牙）。
function validateR118(d) {
  const errs = [];
  const A = d.arts || {}, C = d.cds || {}, S = d.state || {}, V = S.view || {};
  if ((A.kinds || []).join(',') !== ART_KINDS.join(',')) errs.push('三类功法集合不对：' + (A.kinds || []).join(','));
  for (const k of ART_KINDS) {
    const t = (A.table || {})[k];
    if (!t) { errs.push('缺功法 ' + k); continue; }
    if (!/^[护近远]$/.test(t.tag || '')) errs.push(k + ' 标签不是单字功能标记');
    if (t.cdKey !== ART_CD_KEYS[k]) errs.push(k + ' 没绑到主角对应功法 ' + ART_CD_KEYS[k]);
    if (/[诀斩爆功法术]$/.test(t.name || '')) errs.push(k + ' 疑似自造招式名：' + t.name);
    if (!(C[k] > 0)) errs.push(k + ' CD 非正');
  }
  if (!A.allKinds || !ART_KINDS.every(k => A.allKinds.includes(k))) errs.push('释放引擎没认三类新形态');
  if (Math.abs(A.hpK - 0.5) > 1e-9) errs.push('血量比例不是主角满血 50%');
  for (const key of ['pet', 'mate']) {
    const e = S[key];
    if (!e) continue;
    if (e.maxhp !== Math.round((S.playerMaxhp || 0) * 0.5)) errs.push(key + ' 血量不是主角满血一半');
    if (e.r !== A.r) errs.push(key + ' 碰撞半径不符');
    if (e.x < V.x + A.viewEdge - 0.01 || e.x > V.x + V.w - A.viewEdge + 0.01 ||
        e.y < V.y + A.viewEdge - 0.01 || e.y > V.y + V.h - A.viewEdge + 0.01) {
      errs.push(key + ' 跑出了可视范围');
    }
  }
  // CD 曲线：境界攻速涨 → CD 只能变快；极高境界被下限钳住
  const walk = d.cdWalk || [];
  for (let i = 1; i < walk.length; i++) {
    for (const k of ART_KINDS) if (walk[i][k] > walk[i - 1][k] + 1e-6) errs.push(k + ' 境界涨了 CD 反而变慢');
  }
  if (!(A.floor > 0 && A.floor <= 0.3)) errs.push('CD 下限不合理');
  if (walk.length && ART_KINDS.some(k => Math.abs(walk[walk.length - 1][k] - A.floor) > 1e-6)) {
    errs.push('极高境界没被下限钳住');
  }
  if (A.reviveT !== 10) errs.push('自动复活不是十息');
  if (A.reviveCost !== 10000) errs.push('复活价不是 10000 灵石');
  for (const s of (d.steps || [])) {
    if (s.kind === 'hurt' && !(s.after < s.before)) errs.push('受击没扣血');
    if (s.kind === 'guard' && !(s.guardTaken < s.plainTaken)) errs.push('护体没减伤');
    if (s.kind === 'dead' && (!s.dead || !s.inDeadMap)) errs.push('死亡没落台账');
    if (s.kind === 'starve' && (s.revived || s.stones !== s.stones0 || !s.deadMapKept || !s.oweMarked)) errs.push('十息钱不够却复活 / 扣钱 / 没记欠费');
    if (s.kind === 'owe' && (s.revived || s.stones !== s.stones0 || !s.oweKept)) errs.push('欠费后攒够钱却自动复生了');
    if (s.kind === 'auto' && (!s.revived || s.stones0 - s.stones !== A.reviveCost)) errs.push('钱够的自动复活没扣 10000');
    if (s.kind === 'pay' && (!s.ok || s.stones0 - s.stones !== A.reviveCost || !s.oweCleared)) errs.push('洞府交钱没扣 10000 / 没清欠费');
    if (s.kind === 'payfail' && (s.ok || s.stones !== s.stones0)) errs.push('钱不够却交钱成功');
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

console.log('\n【I · 水墨呈现：每招都画出主角同款笔势】');
// 逐招真实释放，数它到底往 G.parts / G.texts / FX3 里放了什么，不看源码里写了什么字
const fxById = await page.evaluate((ids) => {
  const o = {};
  for (const id of ids) o[id] = window.__FR.allySkillFx(id);
  return o;
}, list.map(s => s.id));
const fxRealErrs = validateFx(list, fxById, ALLY_PALS);
ok(fxRealErrs.length === 0, '14 条技能的特效产物逐条达标', fxRealErrs.slice(0, 8));
ok(Object.keys(fxById).length === 14, '14 条技能都读到了真实特效产物');
ok(live.fr.pals.join(',') === ALLY_PALS.join(','), '运行时调色板合法集与基线一致', live.fr.pals);
ok(ALLY_PALS.every(p => list.some(s => s.pal === p)), '四档水墨色阶都用上了',
  ALLY_PALS.map(p => p + ':' + list.filter(s => s.pal === p).length).join(' '));
ok(list.every(s => /^#[0-9a-f]{6}$/i.test(s.vfx)), '技能主色都是 #hex，交给 inkify 砍色',
  list.filter(s => !/^#[0-9a-f]{6}$/i.test(s.vfx)).map(s => [s.id, s.vfx]));
ok(Object.values(fxById).every(f => f.seal === 1), '每招一枚朱砂印蜕技能名，不多不少');
ok(Object.values(fxById).every(f => f.rune >= 1), '每招都有起手贴地法阵');
ok(Object.values(fxById).every(f => f.fx3 >= 2), '每招都有起手 + 主特效两层水墨像素特效');
ok(Object.values(fxById).every(f => f.cast > 0), '每招都挂上了随行实体的出手动作');
ok(list.filter(s => ['bolt', 'fan'].includes(s.kind)).every(s => fxById[s.id].slash >= 1),
  '弹道类都有弯月刃（主角 fireActive 同款）');
ok(list.filter(s => s.kind === 'nova').every(s => fxById[s.id].ray >= 12 && fxById[s.id].ring >= 2),
  '爆发类都有 12 道放射飞白 + 双环');
ok(list.filter(s => s.kind === 'chain').every(s => fxById[s.id].bolt >= 3 && fxById[s.id].web >= 6),
  '连锁类都有天雷折线 + 落点雷网');
ok(list.filter(s => s.kind === 'chill').every(s => fxById[s.id].web >= 7), '定身类都有蛛网 / 冰纹');
ok(list.filter(s => s.kind === 'drain').every(s => fxById[s.id].rune >= 2 && fxById[s.id].ring >= 2),
  '回补类都有双层法阵 + 收缩环');
// 静态再兜一道：这些原语确实写在释放段里，不是探针自己造出来的假数据
const castSeg = gsrc.slice(gsrc.indexOf('function castAllySkill'), gsrc.indexOf('function tickAllySkill'));
const startSeg = gsrc.slice(gsrc.indexOf('function allyCastFx'), gsrc.indexOf('function castAllySkill'));
ok(castSeg.length > 1000 && startSeg.length > 200, '源码里能切出释放段与起手段');
ok(/allyCastFx\(ent, sk, col\)/.test(castSeg), '六招共用同一套起手仪式');
ok(/spawnRune\(/.test(startSeg) && /FX3\.spawn\('rune'/.test(startSeg),
  '起手用贴地法阵 + 一次性像素符文（不用会被浅纸压暗的 hold）');
ok(/ent\.skCast = ALLY_CAST_T/.test(startSeg), '起手把出手动作计时挂到实体上');
ok(['spawnSlash(', 'spawnWeb(', 'allyBolt(', 'allyRays(', "FX3.spawn('nova'", 'seal: true']
  .every(k => castSeg.includes(k)), '主角同款弯月 / 雷网 / 天雷 / 飞白 / 像素爆发 / 印蜕都真在释放段里');
ok(/const ALLY_PALS = \['xue', 'jin', 'qi', 'mo'\]/.test(gsrc), '调色板合法集写死在代码里');
// 实拍教训：米白会被 inkify 判成高饱和砍成赭石，与朱砂底同色。印蜕字色必须 d=0 纯灰阶才放行。
ok(/ctx\.fillStyle = '#ffffff'; ctx\.fillText\(t\.text, t\.x, t\.y - 3\)/.test(gsrc),
  '朱砂印蜕的字色是纯白纯灰阶（inkify 放行，不会被砍成赭石糊在红底上）');
ok(/for \(const t of G\.texts\) if \(!t\.seal\) drawOneText\(t\);[\s\S]{0,120}?if \(t\.seal\) drawOneText\(t\);/.test(gsrc),
  '印蜕排在伤害数字之后画，不会被压住');
const fxsrc = fs.readFileSync(join(ROOT, 'js', 'fxpix.js'), 'utf8');
ok(/window\.INK_HEX/.test(fxsrc) && /light: 0/.test(fxsrc),
  '像素特效走 INK_HEX 砍色且关掉加法光（宣纸白底不糊）');
ok(/tfStrike\(ALLY_CAST_T - pt\.skCast/.test(gsrc) && /tfStrike\(ALLY_CAST_T - mt\.skCast/.test(gsrc),
  '灵宠 / 同伴绘制层都接了主角同款出手曲线');
const at = await page.evaluate(() => window.__FR.atkTotal());
ok(Math.abs(at.castT - at.atkTotal) < 1e-9, '起手动作时长与主角 ATK_TOTAL 一致', at);
ok(errs.length === 0, '加上特效后全程仍无 JS 报错', errs.slice(0, 3));

console.log('\n【J · 反向注入：水墨呈现闸门得有牙】');
const withPatched = (i, patch) => {
  const o = Object.assign({}, fxById);
  o[list[i].id] = Object.assign({}, o[list[i].id], patch);
  return o;
};
const badFxCases = [
  { label: '起手法阵被删', fx: withPatched(0, { rune: 0 }), ls: list },
  { label: '水墨像素特效被删', fx: withPatched(1, { fx3: 0 }), ls: list },
  { label: '朱砂印蜕被删', fx: withPatched(2, { seal: 0 }), ls: list },
  { label: '出手动作被删', fx: withPatched(3, { cast: 0 }), ls: list },
  { label: '调色板写成霓虹', fx: fxById, ls: list.map((s, i) => i === 4 ? { ...s, pal: 'neon' } : s) },
  { label: '放射飞白偷工减料', fx: withPatched(list.findIndex(s => s.kind === 'nova'), { ray: 2 }), ls: list }
];
for (const c of badFxCases) {
  const e = validateFx(c.ls, c.fx, ALLY_PALS);
  ok(e.length > 0, '注入「' + c.label + '」会被拦下', e.slice(0, 2));
}

console.log('\n【K · 第118轮：三类功法 + CD 与韩立境界攻速齐平】');
const r118 = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  const arts = F.allyArts();
  const savedAtk = G.realm.atk;
  // 手动拨 G.realm.atk（atkMul() 里唯一的境界来源），逐档读三类 CD
  const walk = [0, 1, 3, 8, 18, 1000].map(a => {
    G.realm.atk = a;
    const c = F.allyArtCds();
    return { atk: a, guard: c.guard, melee: c.melee, ranged: c.ranged, atkMul: c.atkMul };
  });
  G.realm.atk = savedAtk;
  // 独立复算：直接读 skills.js 的真实功法配置 + 主角同款两个乘数，不复用 allyArtCd
  const c = F.allyArtCds(), cdRef = {};
  for (const k of ['guard', 'melee', 'ranged']) {
    const t = arts.table[k], s = window.skillById(t.cdKey);
    const lv = (G.player && G.player.skills && G.player.skills[t.cdKey]) || 1;
    const base = k === 'melee' ? (s.atk.cdHit || 0.5) : window.skillAtk.cd(s.atk, lv);
    cdRef[k] = { cdKey: t.cdKey, base: base, expect: Math.max(arts.floor, base * c.haste * c.atkMul) };
  }
  const id = G.pet ? G.pet.id : null;
  // 清掉前面 E 组本命绝学留在实体上的起手计时，才能验证「三类功法不重置动作」
  if (id) { F.allySetPos(id, G.player.x - 24, G.player.y + 10); G.pet.guardT = 0; G.pet.skCast = 0; }
  const armor0 = F.allyArtCds().armor;
  const cast = {};
  for (const k of ['guard', 'melee', 'ranged']) {
    if (!id) break;
    G.parts.length = 0; G.texts.length = 0;
    if (window.FX3) FX3.clear();
    const b0 = G.bullets.filter(b => b.ally).length;
    const r = F.allyCastArt(id, k);
    cast[k] = {
      r: r, rune: G.parts.filter(p => p.rune).length, ring: G.parts.filter(p => p.ring).length,
      slash: G.parts.filter(p => p.slash).length, seal: G.texts.filter(t => t.seal).length,
      bullets: G.bullets.filter(b => b.ally).length - b0,
      guardT: G.pet.guardT, skCast: G.pet.skCast, total: G.parts.length
    };
  }
  const armor1 = F.allyArtCds().armor;
  G.parts.length = 0; G.texts.length = 0;
  if (window.FX3) FX3.clear();
  G.bullets = G.bullets.filter(b => !b.ally);
  if (id) G.pet.guardT = 0;
  return { arts: arts, cds: c, walk: walk, cdRef: cdRef, state: F.allyState(), cast: cast, armor0: armor0, armor1: armor1 };
});
ok(r118.arts.kinds.join(',') === ART_KINDS.join(','), '三类功法集合 = 护体 / 近身 / 远击', r118.arts.kinds);
ok(ART_KINDS.every(k => r118.arts.table[k] && /^[护近远]$/.test(r118.arts.table[k].tag)),
  '三类都用单字功能标签，不自造招式名');
ok(ART_KINDS.every(k => r118.arts.table[k].cdKey === ART_CD_KEYS[k]),
  '三类分别绑到主角 nova / frost / sword 的真实配置',
  ART_KINDS.map(k => k + ':' + r118.arts.table[k].cdKey).join(' '));
ok(ART_KINDS.every(k => r118.arts.allKinds.includes(k)), '释放引擎认得三种新形态', r118.arts.allKinds);
ok(ART_KINDS.every(k => Math.abs(r118.cdRef[k].expect - r118.cds[k]) < 1e-3),
  '三类 CD 与「skillAtk.cd × hasteMul × atkMul」主角同口径复算一致',
  ART_KINDS.map(k => k + ': ' + r118.cds[k] + ' vs ' + r118.cdRef[k].expect.toFixed(4)).join(' | '));
ok(r118.walk.every((w, i) => i === 0 || ART_KINDS.every(k => w[k] <= r118.walk[i - 1][k] + 1e-6)),
  '境界攻速涨（realm.atk 0→18），三类 CD 只降不升',
  r118.walk.map(w => w.atk + ':' + w.ranged.toFixed(3)).join(' '));
ok(ART_KINDS.every(k => Math.abs(r118.walk[r118.walk.length - 1][k] - r118.arts.floor) < 1e-6),
  '极高境界被 0.18s 下限钳住，不会一秒刷 90 发', r118.walk[r118.walk.length - 1]);
ok(r118.walk[0].ranged > r118.walk[3].ranged, '炼气到元婴，远击间隔确实变快');
ok(r118.cast.guard && r118.cast.guard.guardT > 0 && r118.cast.guard.ring >= 2 && r118.cast.guard.rune >= 2,
  '护体真实释放：罩子挂上 + 双环 + 双层贴地阵');
ok(r118.cast.melee && r118.cast.melee.slash >= 2 && r118.cast.melee.ring >= 1, '近身真实释放：两道弯月 + 身周环');
ok(r118.cast.ranged && r118.cast.ranged.bullets >= 2 && r118.cast.ranged.slash >= 1, '远击真实释放：多枚追踪弹 + 弯月');
ok(ART_KINDS.every(k => r118.cast[k] && r118.cast[k].r && r118.cast[k].r.light === true), '三类都走轻量呈现档');
ok(ART_KINDS.every(k => r118.cast[k] && r118.cast[k].seal === 0 && r118.cast[k].skCast === 0),
  '密集出手不飘印蜕、不重置起手动作（否则会一直抽）');
ok(r118.armor1 > r118.armor0, '护体罩罩到韩立时，他的减伤也涨了一截',
  { before: r118.armor0, after: r118.armor1 });

console.log('\n【L · 第118轮：视野内自由行动，不再围绕韩立】');
const move = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  if (!G.pet || !G.player) return null;
  const id = G.pet.id, v = F.allyState().view, p = G.player;
  const clamped = F.allySetPos(id, v.x - 500, v.y - 500);   // 强推到视野外，工厂会夹回来
  G.enemies.length = 0;
  const tx = v.x + v.w - 40, ty = v.y + v.h / 2;
  G.enemies.push({
    _id: 990001, type: 'wolf', x: tx, y: ty, hp: 1e9, maxhp: 1e9, r: 10, spd: 0, dmg: 0,
    xpVal: 0, spr: 'wolf', hitFlash: 0, t: 0, dashT: 0, stunT: 0, _orbCd: {}, art: null, _artCd: 0, wob: 0
  });
  const d0 = Math.hypot(G.pet.x - tx, G.pet.y - ty);
  const start = { x: G.pet.x, y: G.pet.y };
  let maxFromPlayer = 0, everOutside = false;
  for (let i = 0; i < 60; i++) {
    F.allyMoveTick(0.05);
    const e = G.pet;
    maxFromPlayer = Math.max(maxFromPlayer, Math.hypot(e.x - p.x, e.y - p.y));
    if (e.x < v.x + v.edge - 0.1 || e.x > v.x + v.w - v.edge + 0.1 ||
        e.y < v.y + v.edge - 0.1 || e.y > v.y + v.h - v.edge + 0.1) everOutside = true;
  }
  const d1 = Math.hypot(G.pet.x - tx, G.pet.y - ty);
  const end = { x: G.pet.x, y: G.pet.y };
  G.enemies.length = 0;
  G.bullets = G.bullets.filter(b => !b.ally);
  G.parts.length = 0; G.texts.length = 0;
  return { clamped: clamped, view: v, start: start, end: end, d0: +d0.toFixed(1), d1: +d1.toFixed(1),
    moved: +Math.hypot(end.x - start.x, end.y - start.y).toFixed(1),
    maxFromPlayer: +maxFromPlayer.toFixed(1), everOutside: everOutside };
});
ok(move && move.clamped.x >= move.view.x + move.view.edge - 0.01 &&
   move.clamped.y >= move.view.y + move.view.edge - 0.01,
  '强推到视野外会被夹回可视矩形', move && move.clamped);
ok(move && !move.everOutside, '连续 60 帧自主移动，一次都没跑出可视范围');
ok(move && move.d1 < move.d0 - 30, '真的自己朝敌人追过去了（不是围着韩立转）',
  move && { d0: move.d0, d1: move.d1 });
ok(move && move.maxFromPlayer > 60, '离韩立最远超过 60px，确实不再贴身跟随', move && move.maxFromPlayer);
ok(/allyMove\(pt, dt, mode\)/.test(gsrc) && /allyMove\(mt, dt, mode\)/.test(gsrc),
  'updatePet / updateMate 都接了自主移动');
ok(/tickAllyArts\(pt, def\.id, dt\)/.test(gsrc) && /tickAllyArts\(mt, def\.id, dt\)/.test(gsrc),
  '两个 update 都挂了三类功法独立冷却');
ok(/function allyClampView[\s\S]{0,300}?G\.cam\.x \+ W - ALLY_VIEW_EDGE/.test(gsrc),
  '视野边界按 G.cam 起的 W×H 矩形算，不是拍脑袋的圆形');

console.log('\n【M · 第118轮：血量 / 受击 / 殒落 / 十息复活 / 灵石经济】');
const life = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  if (!G.pet || !G.player) return null;
  const id = G.pet.id, steps = [];
  F.allySetDeadMap({}); F.allySetOweMap({}); F.setStones(0);
  F.allySetPos(id, G.player.x - 24, G.player.y + 10);
  G.pet.dead = false; G.pet.hp = G.pet.maxhp; G.pet.iv = 0; G.pet.guardT = 0;
  const s0 = F.allyState(), maxhp = s0.pet.maxhp, playerMaxhp = s0.playerMaxhp;
  // 普通一击 / 无敌帧去重 / 护体减伤
  G.pet.iv = 0; G.pet.guardT = 0;
  const b1 = F.allyState().pet.hp; F.allyHurt(id, 100); const a1 = F.allyState().pet.hp;
  steps.push({ kind: 'hurt', before: b1, after: a1 });
  const hpIv = F.allyState().pet.hp; F.allyHurt(id, 100); const hpIv2 = F.allyState().pet.hp;
  G.pet.iv = 0; F.allySetGuard(id);
  const b2 = F.allyState().pet.hp; F.allyHurt(id, 100); const a2 = F.allyState().pet.hp;
  steps.push({ kind: 'guard', plainTaken: b1 - a1, guardTaken: b2 - a2 });
  // 打到殒落
  G.pet.guardT = 0;
  for (let i = 0; i < 200 && !G.pet.dead; i++) { G.pet.iv = 0; F.allyHurt(id, 1000); }
  const ds = F.allyState();
  steps.push({ kind: 'dead', dead: ds.pet.dead, inDeadMap: !!ds.deadMap[id] });
  // 十息到点灵石不够：不复活、不扣钱、死亡台账保留，并记一笔「欠费」
  const st0 = F.allyState().stones;
  for (let i = 0; i < 12; i++) F.allyTickRevive(1);
  const sv = F.allyState();
  steps.push({ kind: 'starve', revived: !sv.pet.dead, stones0: st0, stones: sv.stones, deadMapKept: !!sv.deadMap[id], oweMarked: !!sv.oweMap[id] });
  // 欠费之后即使出去打怪攒够了钱，也不许自己起身 —— 必须回洞府交钱
  F.setStones(20000);
  const bo = F.allyState().stones;
  const ov = F.allyTickRevive(0.05);
  steps.push({ kind: 'owe', revived: !ov.petDead, stones0: bo, stones: ov.stones, oweKept: !!ov.oweMap[id] });
  // 另起一次殒落，十息时钱够 —— 这才走「自动扣 10000 复生」
  F.allySetOweMap({});
  F.allySetDeadMap({ [id]: Date.now() });
  G.pet.dead = true; G.pet.hp = 0; G.pet.deadT = 0; G.pet.starveNoted = 0;
  F.setStones(20000);
  const ba = F.allyState().stones;
  let au = null;
  for (let i = 0; i < 12; i++) au = F.allyTickRevive(1);
  steps.push({ kind: 'auto', revived: !au.petDead, stones0: ba, stones: au.stones });
  // 洞府交钱复活（欠费 + 钱够）：应当清掉欠费台账
  F.allySetDeadMap({ [id]: Date.now() });
  F.allySetOweMap({ [id]: true });
  G.pet.dead = true; G.pet.hp = 0; G.pet.deadT = 0;
  F.setStones(20000);
  const bp = F.allyState().stones, pr = F.allyPayRevive(id);
  steps.push({ kind: 'pay', ok: pr.ok, stones0: bp, stones: pr.stones, oweCleared: !pr.oweMap[id] });
  // 洞府交钱复活（钱不够）
  F.allySetDeadMap({ [id]: Date.now() });
  F.allySetOweMap({ [id]: true });
  G.pet.dead = true; G.pet.hp = 0;
  F.setStones(9999);
  const bf = F.allyState().stones, pf = F.allyPayRevive(id);
  steps.push({ kind: 'payfail', ok: pf.ok, stones0: bf, stones: pf.stones });
  // 跨地图：死亡台账与欠费台账都落 save，进图重建的实体仍是死的
  F.allySetDeadMap({ [id]: Date.now() });
  F.allySetOweMap({ [id]: true });
  F.enterMap('houshan', 'easy');
  if (G.state === 'dialog') F.skipStory();
  const cr = F.allyState();
  return { steps: steps, maxhp: maxhp, playerMaxhp: playerMaxhp, hpIvSame: hpIv === hpIv2,
    cross: { dead: cr.pet ? cr.pet.dead : null, hasMark: !!cr.deadMap[id], oweKept: !!cr.oweMap[id], maxhp: cr.pet ? cr.pet.maxhp : null },
    arts: F.allyArts(), cds: F.allyArtCds(), state: F.allyState() };
});
ok(life && life.maxhp === Math.round(life.playerMaxhp * 0.5),
  '随行者血量 = 韩立满血的 50%', life && { maxhp: life.maxhp, player: life.playerMaxhp });
ok(life && life.hpIvSame, '受击后有 0.55s 无敌帧，不会被每帧连击');
ok(life && life.steps.find(s => s.kind === 'guard').guardTaken < life.steps.find(s => s.kind === 'guard').plainTaken,
  '护体罩真的减伤了', life && life.steps.find(s => s.kind === 'guard'));
ok(life && life.steps.find(s => s.kind === 'dead').dead && life.steps.find(s => s.kind === 'dead').inDeadMap,
  '血量归零即殒落，并写进 save.allyDead 台账');
ok(life && life.steps.find(s => s.kind === 'starve').deadMapKept,
  '十息钱不够时死亡标记一直保留（能去别的图攒钱）');
ok(life && life.steps.find(s => s.kind === 'starve').oweMarked, '十息钱不够会记入欠费台账');
ok(life && !life.steps.find(s => s.kind === 'owe').revived && life.steps.find(s => s.kind === 'owe').oweKept,
  '欠费后即使攒够钱也不自动起身（必须回洞府交钱）', life && life.steps.find(s => s.kind === 'owe'));
ok(life && life.steps.find(s => s.kind === 'auto').revived, '十息时灵石够，才自动扣 10000 复生');
ok(life && life.steps.find(s => s.kind === 'pay').ok && life.steps.find(s => s.kind === 'pay').oweCleared,
  '洞府「交钱复活」可用，并清掉欠费台账');
ok(life && !life.steps.find(s => s.kind === 'payfail').ok, '9999 灵石交钱会被拒');
ok(life && life.cross.dead === true && life.cross.hasMark, '换图重建实体仍是殒落状态（台账跨地图保留）', life && life.cross);
ok(life && life.cross.oweKept === true, '欠费台账跨地图 / 跨会话保留');
ok(life && life.cross.maxhp === Math.round(life.state.playerMaxhp * 0.5), '换图后血量仍按韩立满血 50% 重算');
ok(/['"]殒['"]/.test(gsrc) && /if \(pt\.dead\)/.test(gsrc) && /if \(mt\.dead\)/.test(gsrc),
  '殒落只画一枚「殒」印，渲染段有 dead 分支');
const petDraw = gsrc.slice(gsrc.indexOf('// 灵宠：第118轮'), gsrc.indexOf('// 同伴：第118轮'));
ok(petDraw.length > 300 && !/maxhp/.test(petDraw), '灵宠绘制段没有血条（用户明确不显示）');
ok(/save\.allyDead = Date\.now\(\)/.test(gsrc) || /save\.allyDead\[a\.id\] = Date\.now\(\)/.test(gsrc),
  '死亡时间戳用绝对时间，切图不会丢');
ok(/save\.stones -= ALLY_REVIVE_COST/.test(gsrc), '复活确实扣灵石（不是免费起身）');
ok(/allyOwe:\s*\{\s*\}/.test(gsrc) && /s\.allyOwe && typeof s\.allyOwe/.test(gsrc),
  '欠费台账有默认值与旧档迁移');
ok(/if \(save\.allyOwe\[id\]\) continue/.test(gsrc) && /save\.allyOwe\[id\] = true/.test(gsrc),
  '源码里欠费者被跳过、十息钱不够才记账');
ok(/button\[data-revive\]/.test(gsrc) && /payReviveAlly\(/.test(gsrc), '洞府交钱按钮接到了点击委托');
ok(errs.length === 0, '三类功法 / 自由行动 / 生死经济全程无 JS 报错', errs.slice(0, 3));

console.log('\n【N · 反向注入：第118轮闸门得有牙】');
const realR118 = { arts: r118.arts, cds: r118.cds, cdWalk: r118.walk, state: r118.state, steps: life.steps };
ok(validateR118(realR118).length === 0, '真实产物通过第118轮校验器', validateR118(realR118).slice(0, 5));
const badR118 = [
  { label: '血量比例改成 100%', d: { ...realR118, arts: { ...realR118.arts, hpK: 1 } } },
  { label: '三类少一类', d: { ...realR118, arts: { ...realR118.arts, kinds: ['guard', 'melee'] } } },
  { label: 'cdKey 绑错功法', d: { ...realR118, arts: { ...realR118.arts, table: { ...realR118.arts.table, ranged: { ...realR118.arts.table.ranged, cdKey: 'fire' } } } } },
  { label: 'CD 不随境界变（写平）', d: { ...realR118, cdWalk: realR118.cdWalk.map(w => ({ ...w, guard: 0.5, melee: 0.5, ranged: 0.5 })) } },
  { label: '复活价改成 0', d: { ...realR118, arts: { ...realR118.arts, reviveCost: 0 } } },
  { label: '钱不够却复活', d: { ...realR118, steps: realR118.steps.map(s => s.kind === 'starve' ? { ...s, revived: true } : s) } },
  { label: '十息钱不够没记欠费', d: { ...realR118, steps: realR118.steps.map(s => s.kind === 'starve' ? { ...s, oweMarked: false } : s) } },
  { label: '欠费后攒够钱却自动起身', d: { ...realR118, steps: realR118.steps.map(s => s.kind === 'owe' ? { ...s, revived: true } : s) } },
  { label: '洞府交钱没清欠费', d: { ...realR118, steps: realR118.steps.map(s => s.kind === 'pay' ? { ...s, oweCleared: false } : s) } },
  { label: '自动复活不扣钱', d: { ...realR118, steps: realR118.steps.map(s => s.kind === 'auto' ? { ...s, stones: s.stones0 } : s) } },
  { label: '受击不扣血', d: { ...realR118, steps: realR118.steps.map(s => s.kind === 'hurt' ? { ...s, after: s.before } : s) } },
  { label: '随行者跑出视野', d: { ...realR118, state: { ...realR118.state, pet: { ...realR118.state.pet, x: -9999 } } } }
];
for (const c of badR118) {
  const e = validateR118(c.d);
  ok(e.length > 0, '注入「' + c.label + '」会被拦下', e.slice(0, 2));
}

console.log('\n【O · 第119轮：遇险侧身（大衍挂机同口径，不站桩）】');
const dodge = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  // M 组把随行者打死了、还留了欠费台账，先清干净，拿一个无威胁的战场
  F.allySetDeadMap({}); F.allySetOweMap({});
  if (!G.pet || !G.player) return null;
  for (const a of [G.pet, G.mate]) {
    if (!a) continue;
    a.dead = false; a.hp = a.maxhp; a.deadT = 0; a.iv = 0;
    a.dodgeT = 0; a.dodgePrev = null; a.dodging = false; a.dodgeThreats = 0; a.dodgeFx = 0;
  }
  G.enemies.length = 0; G.ebullets.length = 0; G.bullets.length = 0;
  G.parts.length = 0; G.texts.length = 0;
  G.boss = null; G.bossActive = false;
  if (window.FX3) FX3.clear();
  const id = G.pet.id, v = F.allyState().view;
  F.allySetPos(id, v.x + v.w / 2, v.y + v.h / 2);

  // ① 干净场面：不该乱躲
  F.allyMoveTick(0.05);
  const clean = F.allyDodgeInfo().pet;

  // ② 一发正对随行者飞来的高速弹幕：应当侧身让，而不是顺着来向跑
  F.allyClearThreats();
  const shot = F.allyThreat(id, { vx: 260, vy: 0, dist: 95, r: 7 });
  F.allyMoveTick(0.02);
  const onThreat = F.allyDodgeInfo().pet;
  const start = { x: onThreat.x, y: onThreat.y }, hp0 = onThreat.hp;
  for (let i = 0; i < 10; i++) { F.allyAdvanceThreats(0.02); F.allyMoveTick(0.02); }
  const after = F.allyDodgeInfo().pet;
  const lateral = !!onThreat.dir && Math.abs(onThreat.dir.x) <= 0.6 && Math.abs(onThreat.dir.y) >= 0.5;

  // ③ 威胁清掉、惯性走完：回到自由 AI，继续自己走（不站桩）
  F.allyClearThreats();
  for (let i = 0; i < 12; i++) F.allyMoveTick(0.05);
  const relaxed = F.allyDodgeInfo().pet;
  G.enemies.push({
    _id: 990119, type: 'wolf', x: v.x + v.w - 40, y: v.y + v.h / 2,
    hp: 1e9, maxhp: 1e9, r: 10, spd: 0, dmg: 0, xpVal: 0, spr: 'wolf',
    hitFlash: 0, t: 0, dashT: 0, stunT: 0, _orbCd: {}, art: null, _artCd: 0, wob: 0
  });
  const freeStart = { x: G.pet.x, y: G.pet.y };
  for (let i = 0; i < 10; i++) F.allyMoveTick(0.05);
  const freeMoved = Math.hypot(G.pet.x - freeStart.x, G.pet.y - freeStart.y);
  G.enemies.length = 0;

  // ④ 会躲不等于无敌：直接打一下照样掉血
  const hurtBefore = F.allyDodgeInfo().pet.hp;
  const hurt = F.allyHurt(id, 20);

  // ⑤ 贴到视野角上再给威胁：仍被夹在可视矩形里
  F.allyClearThreats();
  const edge = F.allySetPos(id, v.x + v.edge + 1, v.y + v.edge + 1);
  F.allyThreat(id, { vx: -260, vy: -260, dist: 60 });
  for (let i = 0; i < 8; i++) { F.allyAdvanceThreats(0.02); F.allyMoveTick(0.02); }
  const es = F.allyState();
  F.allyClearThreats();
  const inView = es.pet.x >= v.x + v.edge - 0.01 && es.pet.x <= v.x + v.w - v.edge + 0.01 &&
    es.pet.y >= v.y + v.edge - 0.01 && es.pet.y <= v.y + v.h - v.edge + 0.01;
  return {
    cfg: F.allyDodgeInfo(),
    clean: { threats: clean.threats, dodging: clean.dodging, dir: clean.dir },
    threat: {
      threats: onThreat.threats, dodging: onThreat.dodging, dir: onThreat.dir,
      lateral: lateral, moved: +Math.hypot(after.x - start.x, after.y - start.y).toFixed(1),
      hp0: hp0, hp1: after.hp, shot: shot
    },
    free: { moved: +freeMoved.toFixed(1), dodging: relaxed.dodging, threats: relaxed.threats },
    hurt: { before: hurtBefore, after: hurt ? hurt.hp : hurtBefore },
    edge: { inView: inView, x: es.pet.x, y: es.pet.y, set: edge }
  };
});
ok(dodge && dodge.cfg.anchorUsed === false, '随行者没有 autoAnchor 归位拉力（不站桩）');
ok(dodge && dodge.cfg.dirs === 12 && dodge.cfg.times.join(',') === '0.1,0.24,0.4',
  '侧身评分与韩立大衍挂机同口径：12 方向 + 三时间点',
  dodge && { dirs: dodge.cfg.dirs, times: dodge.cfg.times });
ok(dodge && dodge.clean.threats === 0 && !dodge.clean.dodging && !dodge.clean.dir,
  '干净场面不乱躲', dodge && dodge.clean);
ok(dodge && dodge.threat.threats > 0 && dodge.threat.dodging && !!dodge.threat.dir,
  '弹幕逼近真的触发侧身', dodge && { threats: dodge.threat.threats, dir: dodge.threat.dir });
ok(dodge && dodge.threat.lateral, '是侧身让半步，不是顺着弹幕跑', dodge && dodge.threat.dir);
ok(dodge && dodge.threat.moved > 6, '确实挪开了位置', dodge && dodge.threat.moved);
ok(dodge && dodge.free.moved > 1 && !dodge.free.dodging && dodge.free.threats === 0,
  '威胁消失后回到自由 AI，继续自己走（不站桩）', dodge && dodge.free);
ok(dodge && dodge.hurt.after < dodge.hurt.before, '会躲但不会无敌：直接命中仍掉血',
  dodge && dodge.hurt);
ok(dodge && dodge.edge.inView, '贴边躲避也没被推出可视范围', dodge && dodge.edge);

const dodgeSrc = gsrc.slice(gsrc.indexOf('function allyThreats'), gsrc.indexOf('function allyClampView'));
const moveSrc = gsrc.slice(gsrc.indexOf('function allyMove('), gsrc.indexOf('function castAllyArt('));
ok(/DODGE_DIRS/.test(dodgeSrc) && /DODGE_T/.test(dodgeSrc) && /DODGE_STEP/.test(dodgeSrc) &&
   /DODGE_NEAREST/.test(dodgeSrc) && /DODGE_NEAR/.test(dodgeSrc),
  '源码直接复用大衍挂机的常量，不是另抄一份数字');
// 只看代码行：注释里本来就要解释「为什么删掉 autoAnchor」，不能把说明文字当成实现
const dodgeCode = dodgeSrc.replace(/^\s*\/\/.*$/gm, '');
ok(!/G\.autoAnchor|DODGE_HOME_W|homeD|autoAnchor\s*[.:]/.test(dodgeCode),
  '侧身评分的代码里没有站桩锚点 / 归位拉力');
ok(/G\.ebullets/.test(dodgeSrc) && /G\.enemies/.test(dodgeSrc) && /G\.boss/.test(dodgeSrc),
  '威胁来源与主角一致：弹幕 / 贴身怪 / Boss 冲刺');
ok(/allyDodgeDir\(/.test(moveSrc) && /allyTarget\(/.test(moveSrc) && /allyClampView\(e\)/.test(moveSrc),
  '自由 AI 与侧身并存，且仍夹在可视矩形里');

console.log('\n【P · 反向注入：第119轮闸门得有牙】');
// 第119轮校验器：真实产物与注入数据共用，保证「真躲开 / 不站桩 / 不无敌」都咬得住。
function validateR119(d) {
  const errs = [];
  const C = d.cfg || {}, CL = d.clean || {}, TH = d.threat || {}, FR = d.free || {},
    H = d.hurt || {}, ED = d.edge || {};
  if (C.anchorUsed) errs.push('随行者有站桩锚点');
  if (C.dirs !== 12) errs.push('方向数不是大衍挂机的 12');
  if (!Array.isArray(C.times) || C.times.join(',') !== '0.1,0.24,0.4') errs.push('预测时间点没跟大衍挂机齐平');
  if (!(C.step > 0) || !(C.nearest > 0) || !(C.radius > 0)) errs.push('探步 / 截断 / 探测半径不对');
  if (CL.threats !== 0 || CL.dodging || CL.dir) errs.push('干净场面却在乱躲');
  if (!(TH.threats > 0) || !TH.dodging || !TH.dir) errs.push('弹幕逼近没触发侧身');
  if (!TH.lateral) errs.push('顺着弹幕跑，不是侧身让');
  if (!(TH.moved > 6)) errs.push('要躲却没挪窝');
  if (TH.hp1 !== TH.hp0) errs.push('躲避过程自己掉血了');
  if (!(FR.moved > 1) || FR.dodging || FR.threats !== 0) errs.push('威胁消失后没回到自由 AI（站桩了）');
  if (!(H.after < H.before)) errs.push('躲避变成无敌：直接打一下也不掉血');
  if (!ED.inView) errs.push('贴边躲避被推出可视范围');
  return errs;
}
const realR119 = dodge || {};
ok(validateR119(realR119).length === 0, '真实产物通过第119轮校验器', validateR119(realR119).slice(0, 5));
const badR119 = [
  { label: '偷偷加了站桩锚点', d: { ...realR119, cfg: { ...realR119.cfg, anchorUsed: true } } },
  { label: '方向数改成 4', d: { ...realR119, cfg: { ...realR119.cfg, dirs: 4 } } },
  { label: '预测时间点改成单帧', d: { ...realR119, cfg: { ...realR119.cfg, times: [0.5] } } },
  { label: '干净场面却在乱躲', d: { ...realR119, clean: { ...realR119.clean, dodging: true } } },
  { label: '弹幕逼近没触发侧身', d: { ...realR119, threat: { ...realR119.threat, dir: null } } },
  { label: '顺着弹幕跑', d: { ...realR119, threat: { ...realR119.threat, lateral: false } } },
  { label: '要躲却没挪窝', d: { ...realR119, threat: { ...realR119.threat, moved: 0 } } },
  { label: '躲完站桩不动', d: { ...realR119, free: { ...realR119.free, moved: 0 } } },
  { label: '躲避变成无敌', d: { ...realR119, hurt: { ...realR119.hurt, after: realR119.hurt.before } } },
  { label: '贴边被推出视野', d: { ...realR119, edge: { ...realR119.edge, inView: false } } }
];
for (const c of badR119) {
  const e = validateR119(c.d);
  ok(e.length > 0, '注入「' + c.label + '」会被拦下', e.slice(0, 2));
}

console.log('\n【Q · 第120轮：遇 Boss / 精英怪拉开距离（风筝），普通怪照旧】');
const kite = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  F.allySetDeadMap({}); F.allySetOweMap({});
  if (!G.pet || !G.player) return null;
  for (const a of [G.pet, G.mate]) {
    if (!a) continue;
    a.dead = false; a.hp = a.maxhp; a.deadT = 0; a.iv = 0;
    a.dodgeT = 0; a.dodgePrev = null; a.dodging = false; a.dodgeThreats = 0; a.dodgeFx = 0; a.kiting = false;
  }
  const id = G.pet.id, v = F.allyState().view;
  const cx = v.y + v.h / 2;
  const left = v.x + 70, right = v.x + v.w - 50;   // 横向拉开约 360px，远大于风筝阈值

  // ① 精英怪：从远处接近，应拉到「能打到的最远间距」停住，绝不贴脸
  G.enemies.length = 0; G.ebullets.length = 0; G.bullets.length = 0;
  G.parts.length = 0; G.texts.length = 0; G.boss = null; G.bossActive = false;
  if (window.FX3) FX3.clear();
  F.allySetPos(id, left, cx);
  const el = F.allySpawnElite(right, cx, { hp: 1e9, r: 16, spd: 0 });
  let firedBasic = false;
  for (let i = 0; i < 60; i++) {
    F.allyMoveTick(0.05);
    if (G.bullets.some(b => b.pet || b.mate)) firedBasic = true;
  }
  const elD = Math.hypot(G.pet.x - el.x, G.pet.y - el.y);
  const kiteState = F.allyDodgeInfo().pet;
  F.allyClearThreats();

  // ② 普通怪放同一位置：应走旧行为（靠近），不风筝
  G.enemies.length = 0; G.bullets.length = 0;
  F.allySetPos(id, left, cx);
  G.enemies.push({ _id: 990121, type: 'wolf', x: right, y: cx, hp: 1e9, maxhp: 1e9,
    r: 10, spd: 0, dmg: 0, xpVal: 0, spr: 'wolf', hitFlash: 0, t: 0, dashT: 0,
    stunT: 0, _orbCd: {}, art: null, _artCd: 0, wob: 0, _dead: false });
  for (let i = 0; i < 60; i++) F.allyMoveTick(0.05);
  const normD = Math.hypot(G.pet.x - right, G.pet.y - cx);
  F.allyClearThreats();

  // ③ 真 Boss：同样应风筝
  G.enemies.length = 0; G.bullets.length = 0;
  F.allySetPos(id, left, cx);
  F.allySetBoss(right, cx, { r: 26, spd: 0 });
  for (let i = 0; i < 60; i++) F.allyMoveTick(0.05);
  const bossD = Math.hypot(G.pet.x - G.boss.x, G.pet.y - G.boss.y);
  const bossKiting = F.allyDodgeInfo().pet.kiting;
  G.boss = null; G.bossActive = false; G.enemies.length = 0;

  return {
    cfg: F.allyDodgeInfo(),
    elite: { dist: +elD.toFixed(1), kiting: !!kiteState.kiting, fired: firedBasic },
    normal: { dist: +normD.toFixed(1) },
    boss: { dist: +bossD.toFixed(1), kiting: !!bossKiting }
  };
});
// 源码检查（gsrc 在 node 作用域，不在浏览器里）
const qMoveSrc = gsrc.slice(gsrc.indexOf('function allyMove('), gsrc.indexOf('function castAllyArt('));
const qSrc = {
  hasKiteConst: /ALLY_KITE_WANT = 250/.test(gsrc),
  bigCheck: /t === G\.boss/.test(qMoveSrc) && /\.elite/.test(qMoveSrc),
  modeUntouched: /mode === 'melee'\s*\?\s*30\s*:\s*132/.test(qMoveSrc)
};
const KITE_LO = 195, KITE_HI = 295;   // 风筝间距落点带（want 250，ap=280/bf=200）
ok(kite && kite.elite.dist >= KITE_LO && kite.elite.dist <= KITE_HI,
  '精英怪：拉开到能打到的远距停下（不贴脸、不跑没影）', kite && kite.elite);
ok(kite && kite.elite.kiting === true, '精英怪场景中 kiting 标记为真', kite && kite.elite.kiting);
ok(kite && kite.elite.fired, '精英怪在远距仍打得出弹道（能攻击到）', kite && kite.elite.fired);
ok(kite && kite.normal.dist < KITE_LO - 30, '普通怪走旧行为靠近、没被一起风筝', kite && kite.normal);
ok(kite && kite.boss.dist >= KITE_LO && kite.boss.dist <= KITE_HI && kite.boss.kiting,
  '真 Boss 同样被风筝', kite && kite.boss);
ok(kite && qSrc.hasKiteConst && qSrc.bigCheck && qSrc.modeUntouched,
  '源码：新增风筝常量 + 只对 Boss/精英判定 + 普通怪口径（30/132）未动', qSrc);

function validateR120(d) {
  const e = [];
  if (!d.kiteRange) e.push('Boss/精英没被拉开距离（贴脸或跑没影）');
  if (!d.firedBasic) e.push('距离够却没打出弹道');
  if (!d.normalCloser) e.push('普通怪也被一起风筝了');
  if (!d.bossKite) e.push('Boss 没被风筝');
  if (d.kiteMislabeled) e.push('普通怪被误判成风筝');
  return e;
}
const realR120 = {
  kiteRange: kite && kite.elite.dist >= KITE_LO && kite.elite.dist <= KITE_HI &&
    kite.boss.dist >= KITE_LO && kite.boss.dist <= KITE_HI,
  firedBasic: kite && kite.elite.fired,
  normalCloser: kite && kite.normal.dist < kite.elite.dist - 30,
  bossKite: kite && kite.boss.kiting,
  kiteMislabeled: false
};
ok(validateR120(realR120).length === 0, '真实产物通过第120轮校验器', validateR120(realR120).slice(0, 5));
const badR120 = [
  { label: 'Boss/精英被贴脸', d: { ...realR120, kiteRange: false } },
  { label: '距离够却打不出弹道', d: { ...realR120, firedBasic: false } },
  { label: '普通怪一起被风筝', d: { ...realR120, normalCloser: false } },
  { label: 'Boss 没被风筝', d: { ...realR120, bossKite: false } },
  { label: '普通怪误判成风筝', d: { ...realR120, kiteMislabeled: true } }
];
for (const c of badR120) {
  const e = validateR120(c.d);
  ok(e.length > 0, '注入「' + c.label + '」会被拦下', e.slice(0, 2));
}

console.log('\n===================================');
console.log('  ' + pass + ' 通过 / ' + fail + ' 失败');
console.log('===================================');
if (errs.length) console.log('  页面报错：' + errs.slice(0, 3).join(' ｜ '));
await b.close();
server.close();
process.exit(fail ? 1 : 0);
