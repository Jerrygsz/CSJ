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

// R5 连帧稳定：同场强敌在场时主循环不崩
await page.evaluate(() => { const F = window.__FR; F.tickFrames(180, 0.05); });
ok(errors.length === 0, '同场强敌在场连续 180 帧无 JS 报错', errors.slice(0, 3));

await browser.close();
console.log('\n===================================');
console.log(`  通过 ${pass}  失败 ${fail}`);
if (fail) { console.log('  失败项：'); fails.forEach(f => console.log('   - ' + f)); }
console.log('===================================\n');
process.exit(fail ? 1 : 0);
