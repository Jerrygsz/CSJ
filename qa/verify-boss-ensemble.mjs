// 战斗内容增强闸门：薄弱区间补怪、原著同场强敌、逃亡图追兵。
// 沿用项目惯例：静态扫源码 + 沙箱实机（file://，__CSJ_QA__ 自动生效）。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

let pass = 0, fail = 0;
const fails = [];
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; fails.push(name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); console.log('  ✗ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

// ---------- 静态：配置与实现 ----------
console.log('== 静态：同场强敌配置 ==');
const g = fs.readFileSync(join(root, 'js/game.js'), 'utf8');
const late = fs.readFileSync(join(root, 'js/late.js'), 'utf8');
const late2 = fs.readFileSync(join(root, 'js/late2.js'), 'utf8');
const lj = fs.readFileSync(join(root, 'js/lingjie.js'), 'utf8');
const xj = fs.readFileSync(join(root, 'js/xianjie.js'), 'utf8');

// 生成机制：用精英承载、走 kit、不碰 G.boss 单槽
ok(/function spawnCoList\(/.test(g) && /function spawnCoBosses\(/.test(g), '同场强敌生成器就位');
ok(/elite: true, coBoss: true/.test(g), '同场强敌以精英承载（不占 G.boss 槽）');
ok(/if \(e\.kit\) updateBossKit\(e, e\.kit, dt\)/.test(g), '精英复用 Boss 招式引擎');
ok(/e\.wardMax = hp \* base; e\.ward = e\.wardMax/.test(g), '同场强敌带护罩');
ok(/CON?_?MAX|CO_MAX = 5/.test(g), '同场强敌数量有硬上限');
ok(/spawnCoBosses\(\);/.test(g) && /function spawnBoss\(\)/.test(g), '主 Boss 出场时一并请出同场强敌');
ok(/function tickChaseBosses\(/.test(g) && /tickChaseBosses\(\);/.test(g), '逃亡图追兵定时调度已接主循环');
ok(/G\.chaseBossDone = \{\}/.test(g) && /G\.chaseBossDone\[key\] = true/.test(g), '追兵一次性标记挂 G 不污染 MAPS');

// 配置：原著明确同场的图都配了 coBoss
const CO_MAP = {
  xutian: late, waihai: late, zhuimo: late2, modajie: lj,
  xisha: xj, suidian: xj, shifang: xj
};
for (const id in CO_MAP) {
  const src = CO_MAP[id];
  const at = src.indexOf("id: '" + id + "'");
  const seg = src.slice(at, at + 1600);
  ok(/coBoss:\s*\[/.test(seg), id + ' 配了同场强敌');
}
// 薄图补怪种
function enemiesOf(src, id) {
  const at = src.indexOf("id: '" + id + "'");
  const m = src.slice(at, at + 1400).match(/enemies:\s*\[([^\]]*)\]/);
  return m ? m[1].split(',').filter(Boolean).length : 0;
}
ok(enemiesOf(xj, 'shijin') >= 4, 'shijin 杂兵种类从 1 补到 ≥4', enemiesOf(xj, 'shijin'));
ok(enemiesOf(xj, 'xisha') >= 4, 'xisha 杂兵种类从 2 补到 ≥4', enemiesOf(xj, 'xisha'));
ok(enemiesOf(late2, 'huanglong') >= 4 && enemiesOf(late2, 'mulan') >= 4, '两张逃亡图杂兵补到 ≥4 种');
ok(/chaseBoss:\s*\[/.test(late2.slice(late2.indexOf("id: 'huanglong'"), late2.indexOf("id: 'huanglong'") + 1500)), 'huanglong 配了仲神师追兵');
ok(/chaseBoss:\s*\[/.test(late2.slice(late2.indexOf("id: 'mulan'"), late2.indexOf("id: 'mulan'") + 1500)), 'mulan 配了上阶仙师追兵');

// ---------- 静态：后期薄图补战斗（20261119T） ----------
console.log('\n== 静态：后期薄图补战斗 ==');
function segOf(src, id, len) {
  const at = src.indexOf("id: '" + id + "'");
  return at < 0 ? '' : src.slice(at, at + (len || 1800));
}
const TRIAL_MAP = {
  xianshi: lj, huimoyuan: lj, wumengdao: xj,
  xiedao: xj, zhanshi: xj, leihai: xj, daotian: xj
};
for (const id in TRIAL_MAP) {
  ok(/trial:\s*\{/.test(segOf(TRIAL_MAP[id], id)), id + ' 配了对白后脚本战');
}
ok(/const label = t\.label \|\| '山道'/.test(g) && /if \(m && m\.id === 'qixuan'\)/.test(g),
   '脚本战文案按图参数化，教学三句只在 qixuan 播');
const CO2 = { zhangtianping: lj, zhanxian: lj, jingong: xj };
for (const id in CO2) {
  ok(/coBoss:\s*\[/.test(segOf(CO2[id], id)), id + ' 配了原著同场强敌');
}
ok(/天阴五子·虎[\s\S]{0,600}天阴五子·鹰/.test(segOf(xj, 'jingong', 2400)),
   '独闯仙宫是五子同场（虎鹿熊猿鹰，卡满 CO_MAX=5）');
const zxCo = (segOf(lj, 'zhanxian', 1800).match(/coBoss:\s*\[([\s\S]*?)\]/) || ['', ''])[1];
ok(!!zxCo && !/梵圣魔神/.test(zxCo) && /天外魔君·化身/.test(zxCo) && /火须子/.test(zxCo),
   '斩仙同场名单里没有韩立所化的梵圣魔神', zxCo && zxCo.slice(0, 80));
ok(/window\.STORY\.push\(/.test(xj)
   && ['xs_fight', 'sj_fight', 'sd_fight', 'sf_fight'].every(k => xj.indexOf("id: '" + k + "'") >= 0),
   '四张 boss 图补了战斗内定时剧情');

// ---------- 实机：生成与数值 ----------
console.log('\n== 实机：同场强敌生成 ==');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('file://' + join(root, 'index.html') + '?test=1');
await page.waitForFunction(() => !!window.__FR, null, { timeout: 15000 });

async function enter(id, lv) {
  return page.evaluate(({ id, lv }) => {
    const F = window.__FR;
    F.clearProgress(); F.setLevel(lv || 100); F.unlockAll(); F.muteStory(true);
    const mid = F.enterMap(id, 'easy');
    for (let i = 0; i < 16 && F.G.state === 'dialog'; i++) F.skipStory();
    return mid;
  }, { id, lv });
}

// R1 虚天殿：主 Boss + 同场强敌一起在场
const r1mid = await enter('xutian', 68);
const r1 = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  F.boss();
  const co = F.coBossInfo();
  return { mid: G.mapId, boss: G.boss ? G.boss.name : null, co };
});
ok(r1mid === 'xutian' && r1.boss === '玄骨上人', '虚天殿主 Boss 正常出场', r1.boss);
ok(r1.co.length >= 2, '虚天殿同场至少 2 位元婴老怪', r1.co.length);
ok(r1.co.some(x => x.name === '蛮胡子') && r1.co.some(x => x.name === '万天明'), '同场强敌是原著老怪', r1.co.map(x => x.name));
ok(r1.co.every(x => x.kit && x.maxhp > 0 && x.dmg > 0), '同场强敌都有招式/血量/伤害', r1.co);
ok(r1.co.every(x => x.ward > 0), '同场强敌带护罩', r1.co.map(x => x.ward));

// R2 主 Boss 单击不受同场影响（守门口径）
const r2 = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  return { bossDmg: G.boss ? Math.round(G.boss.dmg) : 0, pct: G.boss ? +(G.boss.dmg / G.player.maxhp).toFixed(4) : 0,
           coDmg: F.coBossInfo().map(x => x.dmg) };
});
ok(r2.pct > 0 && r2.pct <= 0.15, '主 Boss 单击仍在守门带内（≤15%）', r2.pct);
ok(r2.coDmg.every(d => d > 0), '同场强敌伤害为正', r2.coDmg);

// R3 shijin 薄图：补怪 + 同场
const r3mid = await enter('shijin', 460);
const r3 = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  F.boss();
  return { mid: G.mapId, pool: (G.map.enemies || []).length, co: F.coBossInfo().map(x => x.name) };
});
ok(r3mid === 'shijin' && r3.pool >= 4, 'shijin 怪池 ≥4 种', r3.pool);
ok(r3.co.includes('九尾青狐·真灵') || r3.co.includes('太乙玉仙'), 'shijin 有原著同场强敌', r3.co);

// R4 逃亡图追兵：刷不出主 Boss，但追兵按时现身，脱身照走（高等级+god 避免中途升级打断 tick）
const r4mid = await enter('huanglong', 600);
const r4 = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  F.setGod(true);
  G.time = 44;   // 直接把局内时钟拨到追兵时点之后（避开升级弹窗打断 tickFrames）
  F.tickFrames(2, 0.05);
  const co = F.coBossInfo().map(x => x.name);
  return { mid: G.mapId, boss: !!G.boss, co, state: G.state, t: +G.time.toFixed(1) };
});
ok(r4mid === 'huanglong' && !r4.boss, '逃亡图不设主 Boss', r4.boss);
ok(r4.co.some(x => x.indexOf('仲神师') >= 0), '逃亡图追兵到点现身', r4.co);

// R6 独闯仙宫：五子同场，主 Boss 仍是东方白
const r6mid = await enter('jingong', 520);
const r6 = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  F.boss(); F.setGod(true); F.tickFrames(180, 0.05);
  return { mid: G.mapId, boss: G.boss ? G.boss.name : null, co: F.coBossInfo() };
});
ok(r6mid === 'jingong' && r6.boss === '东方白·金源宫主', '仙宫主 Boss 正常出场', r6.boss);
ok(r6.co.length === 5 && r6.co.every(x => /天阴五子/.test(x.name)), '天阴五子五人同场', r6.co.map(x => x.name));
ok(r6.co.every(x => x.kit && x.maxhp > 0 && x.dmg > 0), '五子都有招式/血量/伤害', r6.co.map(x => x.name));
ok(r6.co.every(x => x.coAngle != null && x.coRadius > 0)
   && new Set(r6.co.map(x => x.coAngle)).size === 5, '五子各守一个环位，不叠成一坨', r6.co.map(x => x.coAngle));

// R7 斩仙：天外魔头与火须子同场，梵圣魔神是韩立自己
const r7mid = await enter('zhanxian', 380);
const r7 = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  F.boss();
  return { mid: G.mapId, boss: G.boss ? G.boss.name : null, co: F.coBossInfo().map(x => x.name) };
});
ok(r7mid === 'zhanxian' && r7.boss === '马良·九元观真仙', '斩仙主 Boss 仍是马良', r7.boss);
ok(r7.co.includes('天外魔君·化身') && r7.co.includes('火须子'), '敌方是天外魔头与火须子', r7.co);
ok(!r7.co.some(x => /梵圣魔神/.test(x.name)), '梵圣魔神没被错配成敌人', r7.co);

// R8 对白后脚本战：雷海这种零怪池薄图也能真的打一场
const r8mid = await enter('leihai', 600);
const r8 = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  return { mid: G.mapId, state: G.state, trial: F.trialState(), n: F.enemies().n };
});
ok(r8mid === 'leihai' && r8.state === 'play', '雷海对白后进入战斗态', r8.state);
ok(!!r8.trial && r8.trial.need === 4 && r8.n >= 4, '雷海脚本战按配置刷出四道雷夔虚影', r8);

// R9 替代胜利条件（2026-11-20）：原著「打不过只能熬过去」的图，胜负不再只看清怪。
console.log('\n== R9 撑过 / 守阵 / 逃遁模式 ==');
const MODE_CFG = {
  guchuan: { kind: 'hold', ratio: [0.6, 2.0] },
  shijin: { kind: 'escape', ratio: [0.6, 4.0] },
  xiedao: { kind: 'survive', ratio: [0.6, 2.0] },
  daotian: { kind: 'survive', ratio: [0.6, 3.0] }
};
for (const id of Object.keys(MODE_CFG)) {
  const src = id === 'guchuan' ? late : xj;
  const seg = src.slice(src.indexOf("id: '" + id + "'"), src.indexOf("id: '" + id + "'") + 2600);
  ok(/mode:\s*\{/.test(seg) && new RegExp("kind:\\s*'" + MODE_CFG[id].kind + "'").test(seg),
    id + ' 配了 ' + MODE_CFG[id].kind + ' 模式');
}
ok(/G\.modeRun = m\.mode \?/.test(g), 'startMap 按配置初始化 modeRun');
ok(/if \(G\.modeRun\) return;/.test(g), '撑过模式下清怪不抢先结算');
ok(/if \(mr\.t >= mr\.sec\)/.test(g) && /G\.pendingEnding = true;/.test(g), '撑到时限走既有收尾链路');
ok(/mr\.radius > 0/.test(g) && /holdOk = U\.dist/.test(g), '守阵模式离开阵心停表');
ok(/t\.banner \|\| \(label/.test(g), '撑过图 banner 可覆盖教学腔（不再喊「清完便可下山」）');
ok(/if \(!tgt && a2\.kind !== 'burst'\)/.test(g), '自动开火选靶逻辑未动（单手底线）');

// 实机：清光脚本怪也不结算，撑到时钟才通关
for (const id of ['guchuan', 'xiedao', 'daotian']) {
  const mid = await enter(id, 600);
  const s0 = await page.evaluate(() => {
    const F = window.__FR, G = F.G;
    const before = F.modeState();
    G.enemies.length = 0;                 // 清光压力怪：原著里这一步本来就不该提前赢
    F.tickFrames(20, 0.05);
    return { before, after: F.modeState(), cleared: F.info().cleared.indexOf(G.mapId) >= 0, state: G.state };
  });
  ok(mid === id && !!s0.before && s0.before.kind === MODE_CFG[id].kind, id + ' 进了 ' + MODE_CFG[id].kind + ' 模式', s0.before);
  ok(!s0.cleared && s0.state === 'play', id + ' 清光压力怪不提前结算', s0);
  ok(s0.after && s0.after.t > s0.before.t, id + ' 撑过时钟仍在推进', { a: s0.before && s0.before.t, b: s0.after && s0.after.t });
  const s1 = await page.evaluate(() => {
    const F = window.__FR, G = F.G;
    const id0 = G.mapId;
    for (let i = 0; i < 2200 && F.info().cleared.indexOf(id0) < 0; i++) {
      if (G.state === 'dialog') F.skipStory();
      else if (G.state === 'levelup') F.insightAuto();
      else F.tickFrames(1, 0.05);
    }
    return { cleared: F.info().cleared.indexOf(id0) >= 0, state: G.state, mode: F.modeState() };
  });
  ok(s1.cleared, id + ' 撑到时限才通关', s1);
}

// shijin：Boss 与同场强敌照常在场，但多一条「甩开追猎」的脱身路
const r9mid = await enter('shijin', 520);
const r9 = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  F.boss();
  const before = F.modeState();
  for (let i = 0; i < 2200 && F.info().cleared.indexOf('shijin') < 0; i++) {
    if (G.state === 'dialog') F.skipStory();
    else if (G.state === 'levelup') F.insightAuto();
    else F.tickFrames(1, 0.05);
  }
  return { before, cleared: F.info().cleared.indexOf('shijin') >= 0, state: G.state, mode: F.modeState() };
});
ok(r9mid === 'shijin' && !!r9.before && r9.before.kind === 'escape', 'shijin 有逃遁模式且 Boss 照常出场', r9.before);
ok(r9.cleared, 'shijin 可甩开追猎脱身（不必打死太乙噬金仙）', r9);

// R10 第二批（2026-11-20）：守阵 / 潜入 / 三魔同场
console.log('\n== R10 守阵 · 潜入 · 三魔同场 ==');
const M2 = {
  muzu2: { kind: 'hold', src: lj },
  lingyan: { kind: 'stealth', src: xj },
  tianpeng: { kind: 'stealth', src: lj }
};
for (const id of Object.keys(M2)) {
  const s = M2[id].src;
  const at = s.indexOf("id: '" + id + "'");
  const seg = s.slice(at, at + 3400);
  ok(at >= 0 && /mode:\s*\{/.test(seg) && new RegExp("kind:\\s*'" + M2[id].kind + "'").test(seg),
    id + ' 配了 ' + M2[id].kind + ' 模式');
}
ok(/kind === 'stealth' && mr\.seenR > 0/.test(g) && /mr\.seen \+ \(near > 0/.test(g), '主循环有 stealth 侦测段');
ok(/mr\.caught = 1/.test(g) && /mr\.sec = Math\.min\(mr\.sec, mr\.t \+ mr\.escapeSec\)/.test(g), '侦测满百转限时硬闯');
ok(/const winTxt = mr\.caught \? mr\.winCaught : mr\.win/.test(g), '暴露与未暴露走两套收场文案');

// huangquan：原著《激战三魔》，力尊者 / 米尊者 / 蓝尊者同场，不是逃遁
{
  const at = lj.indexOf("id: 'huangquan'");
  const seg = lj.slice(at, at + 2400);
  ok(/coBoss:\s*\[/.test(seg) && /米尊者/.test(seg) && /蓝尊者/.test(seg), 'huangquan 三魔同场（米尊者 / 蓝尊者）');
  ok(!/extraBoss:[\s\S]{0,200}米尊者/.test(seg), 'huangquan 米尊者不再是续战出场');
}

// 实机：muzu2 守阵——在阵心计时推进，离阵停表
const m2mid = await enter('muzu2', 400);
const holdIn = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  const a = F.modeState();
  F.tickFrames(40, 0.05);
  const b = F.modeState();
  return { a, b, cx: (G.modeRun || {}).cx, cy: (G.modeRun || {}).cy, r: (G.modeRun || {}).radius };
});
ok(m2mid === 'muzu2' && holdIn.a && holdIn.a.kind === 'hold', 'muzu2 进图即守阵计时', holdIn.a);
ok(holdIn.b.t > holdIn.a.t, 'muzu2 在阵心内计时推进', { a: holdIn.a.t, b: holdIn.b.t });
const holdOut = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  const mr = G.modeRun;
  const before = mr.t;
  G.player.x = mr.cx + mr.radius + 420; G.player.y = mr.cy + 240;   // 走出阵心
  F.tickFrames(40, 0.05);
  const after = F.modeState();
  return { before, after };
});
ok(holdOut.after.out === 1 && holdOut.after.t - holdOut.before < 0.4, 'muzu2 离阵即停表', holdOut);

// 实机：lingyan 潜入——贴身涨侦测、退开回落、满百转硬闯
const l2mid = await enter('lingyan', 500);
const st = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  F.boss();
  const a = F.modeState();
  G.player.x = G.boss.x + 20; G.player.y = G.boss.y + 20;
  F.tickFrames(20, 0.05);
  const b = F.modeState();
  G.player.x = G.boss.x + 2400; G.player.y = G.boss.y + 2400;
  F.tickFrames(20, 0.05);
  const c = F.modeState();
  return { a, b, c };
});
ok(l2mid === 'lingyan' && st.a && st.a.kind === 'stealth', 'lingyan 进图即潜入模式', st.a);
ok(st.b.seen > st.a.seen, 'lingyan 贴近守阁人侦测上涨', { a: st.a.seen, b: st.b.seen });
ok(st.c.seen < st.b.seen, 'lingyan 退开侦测回落', { b: st.b.seen, c: st.c.seen });
const caught = await page.evaluate(() => {
  const F = window.__FR, G = F.G;
  const mr = G.modeRun;
  mr.seen = 99.5; mr.caught = 0;
  G.player.x = G.boss.x; G.player.y = G.boss.y;
  F.tickFrames(6, 0.05);
  return F.modeState();
});
ok(caught.caught === 1 && caught.sec - caught.t <= 18.6, 'lingyan 侦测满百即暴露，转入限时硬闯', caught);

// R5 连帧稳定：同场强敌在场时主循环不崩
await page.evaluate(() => { const F = window.__FR; F.tickFrames(180, 0.05); });
ok(errors.length === 0, '同场强敌在场连续 180 帧无 JS 报错', errors.slice(0, 3));

await browser.close();
console.log('\n===================================');
console.log(`  通过 ${pass}  失败 ${fail}`);
if (fail) { console.log('  失败项：'); fails.forEach(f => console.log('   - ' + f)); }
console.log('===================================\n');
process.exit(fail ? 1 : 0);
