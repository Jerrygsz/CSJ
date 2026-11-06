// 持续型招式（光柱 / 横扫光刃 / 地刺）与 48 张补表的验收
//   · 覆盖：48 只原本走同族通用档的 Boss，是否都取到了专属表
//   · 判定：三种新招式是否真的「持续扣血 / 单次结算 / 到时间收掉」
//   · 边界：走出光柱是否立刻停止扣血（否则就是无范围的全屏伤害）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
// 实拍写进 qa/_out/（gitignore），不覆盖仓库里被跟踪的交付快照
const OUT = join(dirname(fileURLToPath(import.meta.url)), '_out');
fs.mkdirSync(OUT, { recursive: true });

const BOSSES = ['山贼头目','野狼帮帮主·贾天龙','七级妖兽','妙鹤真人','黑煞教长老','魔道执事','古魔主魂',
  '银翅夜叉','敖啸老祖','冰凤','鸾鸣门·双修夫妇','至阳上人','血云·血祭大阵','地渊·刑兽','米尊者',
  '第一魔尊','兽尊殿·魔尊','元魇始祖·化身','宝花圣祖','矿脉·磁光兽','吞天圣祖·化身','夜叉族·黑枭王',
  '元魇圣祖·化身','五光族·奕姓大乘','不灭天尊','天鼎宫·守鼎傀儡','佛骨王','灵界第一大乘','天象尊者',
  '灵将','银光仙子','大乘修士','白光界·土皇钉','虞阳城·妖修','白石真人','冷焰老祖','萧晋寒·天庭使者',
  '太乙境噬金仙','鬼木','血池·鳞犼像','东方白·金源宫主','奇摩子','黑天魔祖','柳自在','鬼灵子',
  '东离虎·道祖','紫杉','朱颜'];

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 480, height: 1040 } });
await p.goto('http://127.0.0.1:8123/index.html?test=1', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });
const SKIN = process.env.SKIN || '';
if (SKIN === 'ink') await p.evaluate(() => { const el = document.getElementById('skinGuigu'); if (el) el.click(); });

// ---------- 一、48 张补表覆盖 ----------
const cov = await p.evaluate((names) => {
  const named = window.BOSS_KITS || {}, more = window.BOSS_KIT_MORE || {};
  const res = (name) => {
    if (named[name]) return { src: 'BOSS_KITS', kit: named[name] };
    if (more[name]) return { src: 'MORE', kit: more[name] };
    for (const k in more) if (name.indexOf(k) === 0 || k.indexOf(name) === 0) return { src: '前缀→' + k, kit: more[k] };
    for (const k in named) if (name.indexOf(k) === 0 || k.indexOf(name) === 0) return { src: '前缀→' + k, kit: named[k] };
    return null;
  };
  const miss = [], bad = [], fx = {};
  const cover = names.map(n => {
    const r = res(n);
    if (!r) { miss.push(n); return { n, src: '—', skills: [], n2: 0 }; }
    const list = (r.kit.skills || []);
    if (!list.length) bad.push(n);
    list.forEach(s => { fx[s.fx] = (fx[s.fx] || 0) + 1; });
    return { n, src: r.src, tag: r.kit.tag || '', skills: list.map(s => s.n), n2: list.length };
  });
  return { cover, miss, bad, fx };
}, BOSSES);

console.log('== 补表覆盖 ==');
console.log('  48 只中命中：' + cov.cover.filter(x => x.n2 > 0).length + ' / 48，缺表 ' + cov.miss.length + '，空表 ' + cov.bad.length);
if (cov.miss.length) console.log('  缺：' + cov.miss.join('、'));
cov.cover.filter(x => x.n2 === 0).forEach(x => console.log('  ✗ ' + x.n));
const newfx = ['pillar', 'sweep', 'spike'];
console.log('  新招式分布：' + newfx.map(k => k + ' ' + (cov.fx[k] || 0)).join(' · '));
console.log('  招式总数：' + Object.values(cov.fx).reduce((a, c) => a + c, 0) +
  ' · 用到的 fx：' + Object.keys(cov.fx).sort().join(','));

// ---------- 二、三种新招式的实际判定 ----------
async function trial(fx, sk, ticks, opt = {}) {
  return await p.evaluate(async ({ fx, sk, ticks, opt }) => {
    const FR = window.__FR, G = FR.G;
    FR.skipStory(); FR.muteStory(true);
    FR.enterMap(opt.map || 'fengyuan', 'easy');
    if (G.state !== 'play') G.state = 'play';
    G.god = false;
    G.enemies.length = 0; G.ebullets.length = 0; G.parts.length = 0;
    G.tells.length = 0; G.zones.length = 0; G.hazards.length = 0; G.texts.length = 0;
    if (!G.boss) { FR.boss(); FR.tickFrames(1, 1 / 60); }
    const b = G.boss;
    // 让 Boss 只带这一招，冷却归零 → 下一帧必出
    b.kit = { skills: [Object.assign({ n: '验收招', cd: 999, tele: 0.12 }, sk)] };
    b.kitNamed = true; b.cds = [0]; b.pending = null;
    // 站定：把玩家放在 Boss 正下方 90px，不移动
    const pl = G.player;
    pl.x = b.x; pl.y = b.y + 90;
    pl.hp = pl.maxhp; pl.iv = 0;
    const hits = [];
    let prev = pl.hp;
    let maxHaz = 0;
    const maxhp = pl.maxhp;
    // 保留无敌帧：这才是玩家真实的挨打节奏。清掉 iv 会测出「每 tick 必中」的假数据，
    // 而实际游戏里 p.iv = 0.55s，站在光柱里最多 1.8 下/秒。
    for (let i = 0; i < ticks; i++) {
      FR.tickFrames(1, 1 / 60);
      if (G.state !== 'play') G.state = 'play';
      if (G.hazards.length > maxHaz) maxHaz = G.hazards.length;
      const d = prev - pl.hp;
      if (d > 0.5) hits.push(Math.round(100 * d / maxhp));
      prev = pl.hp;
      if (pl.hp <= maxhp * 0.2) { pl.hp = maxhp; prev = maxhp; }   // 别打死，测完
    }
    const left = G.hazards.length;
    const kinds = G.hazards.map(h => h.kind);
    // 清场
    G.hazards.length = 0;
    return { hits, n: hits.length, total: hits.reduce((a, c) => a + c, 0), maxHaz, left, kinds };
  }, { fx, sk, ticks, opt });
}

console.log('\n== 持续型招式判定 ==');
const t1 = await trial('pillar', { fx: 'pillar', rad: 48, dur: 1.7, k: 0.31, c: '#ff8a3a' }, 140);
console.log(`  pillar 光柱：命中 ${t1.n} 次 · 每次 ${t1.hits.join('/')}% 气血 · 整段 ${t1.total}% · 1.7s 后残留 ${t1.left}`);

const t2 = await trial('sweep', { fx: 'sweep', len: 430, r: 16, arc: 2.0, dur: 2.1, k: 0.31, c: '#ffb060' }, 170);
console.log(`  sweep  横扫：命中 ${t2.n} 次 · 每次 ${t2.hits.join('/')}% 气血 · 整段 ${t2.total}% · 2.1s 后残留 ${t2.left}`);

const t3 = await trial('spike', { fx: 'spike', num: 6, r: 26, k: 0.55, c: '#e8c88a' }, 120);
console.log(`  spike  地刺：命中 ${t3.n} 次 · 每次 ${t3.hits.join('/')}% 气血 · 整段 ${t3.total}% · 结束后残留 ${t3.left}`);

// ---------- 三、走出范围必须停手 ----------
const away = await p.evaluate(async () => {
  const FR = window.__FR, G = FR.G;
  FR.enterMap('fengyuan', 'easy');
  if (G.state !== 'play') G.state = 'play';
  G.enemies.length = 0; G.hazards.length = 0; G.tells.length = 0;
  if (!G.boss) { FR.boss(); FR.tickFrames(1, 1 / 60); }
  const b = G.boss, pl = G.player;
  b.kit = { skills: [{ n: '验收招', fx: 'pillar', cd: 999, tele: 0.12, rad: 48, dur: 1.7, k: 0.31 }] };
  b.kitNamed = true; b.cds = [0]; b.pending = null;
  pl.x = b.x; pl.y = b.y + 90; pl.hp = pl.maxhp; pl.iv = 0;
  // 等光柱落地
  for (let i = 0; i < 20; i++) { FR.tickFrames(1, 1 / 60); if (G.state !== 'play') G.state = 'play'; }
  const h = G.hazards[0];
  if (!h) return { err: '光柱没生成' };
  G.hazards.length = 1;                 // 只留这一根，避免多根叠着测出假数据
  // 逐帧累计「单帧掉血 >0.5%」的事件，而不是看首尾差值：
  // 角色有被动回血，看净值会把伤害和回血抵掉，测出「站里面 1%」这种假数据。
  const M = pl.maxhp;
  const step = () => {
    const before = pl.hp;
    FR.tickFrames(1, 1 / 60);
    if (G.state !== 'play') G.state = 'play';
    const d = before - pl.hp;
    return d > M * 0.005 ? 100 * d / M : 0;
  };
  let inDmg = 0, inN = 0;
  for (let i = 0; i < 66; i++) { const d = step(); if (d) { inDmg += d; inN++; } }
  // 瞬移到光柱外 320px（应完全不掉）
  pl.x = h.x + 320; pl.y = h.y; pl.hp = pl.maxhp; pl.iv = 0;
  let outDmg = 0, outN = 0;
  for (let i = 0; i < 66; i++) { const d = step(); if (d) { outDmg += d; outN++; } }
  return { inN, inDmg: Math.round(inDmg), outN, outDmg: Math.round(outDmg) };
});
console.log(`\n== 走出光柱 ==\n  站里面 1.1s：${away.inN} 下 / ${away.inDmg}% 气血 · 挪到 320px 外 1.1s：${away.outN} 下 / ${away.outDmg}%（外圈必须为 0）`);

// ---------- 四、实拍 ----------
const shots = [];
for (const [tag, sk, frames, wait] of [
  ['haz-pillar', { fx: 'pillar', rad: 48, dur: 2.4, k: 0.31, c: '#ff8a3a' }, 30, 26],
  ['haz-sweep', { fx: 'sweep', len: 430, r: 16, arc: 2.0, dur: 2.6, k: 0.31, c: '#ffb060' }, 34, 30],
  ['haz-spike', { fx: 'spike', num: 6, r: 26, k: 0.55, c: '#e8c88a' }, 26, 22]
]) {
  await p.evaluate(async ({ sk, wait }) => {
    const FR = window.__FR, G = FR.G;
    FR.skipStory(); FR.muteStory(true);          // 别让过场对白盖住整屏（水墨皮第一版就踩了这个）
    FR.enterMap('fengyuan', 'easy');
    FR.skipStory(); FR.muteStory(true);
    if (G.state !== 'play') G.state = 'play';
    G.enemies.length = 0; G.hazards.length = 0; G.tells.length = 0; G.ebullets.length = 0; G.parts.length = 0;
    if (!G.boss) { FR.boss(); FR.tickFrames(1, 1 / 60); }
    const b = G.boss, pl = G.player;
    b.kit = { skills: [Object.assign({ n: '验收招', cd: 999, tele: 0.12 }, sk)] };
    b.kitNamed = true; b.cds = [0]; b.pending = null;
    b.x = pl.x - 150; b.y = pl.y - 40;
    pl.hp = pl.maxhp;
    for (let i = 0; i < wait; i++) { FR.tickFrames(1, 1 / 60); if (G.state !== 'play') G.state = 'play'; }
  }, { sk, wait });
  const f = join(OUT, `${SKIN ? SKIN + '-' : ''}${tag}.png`);
  await p.screenshot({ path: f });
  shots.push(f);
}

await b.close();
console.log('\n截图：' + shots.join(' '));

// 本脚本原先只打印不判定，导致「补表缺了」也不会让 CI 红。补上闸门语义：
// 48 只 Boss 必须全部取到专属表（缺表 0 / 空表 0），否则非零退出。
const hazFail = cov.miss.length + cov.bad.length;
console.log('\n' + (hazFail === 0
  ? '全绿：48 / 48 补表覆盖，缺表 0，空表 0'
  : '失败：缺表 ' + cov.miss.length + '，空表 ' + cov.bad.length));
process.exit(hazFail === 0 ? 0 : 1);
