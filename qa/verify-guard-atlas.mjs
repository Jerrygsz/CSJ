// 回归测试：批次17「护体装备（原著补齐 + 掉落/自愈）+ 自动开火智能选靶 + 三界舆图」
//
// 这一批要钉住的四件事：
//   A 护体不再是「丢了就永远没有」—— 道陨不抽护体；一件都没有时读档补发；
//     老档按「这张图已经打穿」把典籍上写着从这儿得的护体补回包里。
//   B 原著里叫得出名的护体法宝全部进游戏（11 件），且每件都被 parry 载体认得出；
//     载体上写的 special 真的在跑（蚀 / 钟鸣 / 定器 / 替身 / 月华），不是死数据。
//   C 自动开火仍是全自动，但选靶从「最近」改成打分（Boss/精英/蓄力/未破罩优先，
//     刚破罩与硬直降权），并有目标滞回。
//   D 三界舆图是一张可拖动的长卷：三段山水、印章、点选详情；不是三层横排的流程图。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';
const SAVE_KEY = 'fanren_save_v1';

let pass = 0, fail = 0;
const bad = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; return true; }
  fail++; bad.push(msg + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  return false;
}

const items = fs.readFileSync(join(root, 'js', 'items.js'), 'utf8');
const parry = fs.readFileSync(join(root, 'js', 'parry.js'), 'utf8');
const game = fs.readFileSync(join(root, 'js', 'game.js'), 'utf8');
const fx = fs.readFileSync(join(root, 'js', 'fxpix.js'), 'utf8');
const sources = fs.readFileSync(join(root, 'js', 'sources.js'), 'utf8');
const atlas = fs.readFileSync(join(root, 'js', 'atlas.js'), 'utf8');
const html = fs.readFileSync(join(root, 'index.html'), 'utf8');

// ---------- A 静态：护体不再被道陨抽走 ----------
const tollBlock = (game.match(/const ids = Object\.keys\(inv\)[\s\S]{0,320}/) || [''])[0];
ok(/!isGuard\(id\)/.test(tollBlock), '道陨抽道具时排除护体法宝（slot:guard）', tollBlock.slice(0, 160));
ok(/const isGuard = \(id\) => \{ const it = Items\.get\(id\); return !!\(it && it\.slot === 'guard'\); \};/.test(game),
  'isGuard 按 slot 判定，而不是写死 id 名单');
ok(/function ensureGuardCarriers|\(function ensureGuardCarriers\(\)/.test(game), '读档自愈函数存在');
ok(/gift_guardAll/.test(game), '有「按通关记录补发一次」的标记');
ok(/save\.gift_guardAll = true;/.test(game) && /gift_guardAll: !!s\.gift_guardAll/.test(game) && /gift_guardAll: false/.test(game),
  'gift_guardAll 三处（默认 / 读档 / 重置）字段对称');

// ---------- B 静态：护体装备与载体一一对应 ----------
const guardIds = [...items.matchAll(/\{ id: '(g_[a-z_]+)',\s*name: '([^']+)'[^}]*slot: 'guard'/g)].map(m => ({ id: m[1], name: m[2] }));
ok(guardIds.length === 11, '护体法宝共 11 件（原著逐条补齐）', guardIds.map(g => g.name));
for (const g of guardIds) ok(new RegExp("id: '" + g.id + "'[^}]*unique: true").test(items), g.name + ' 是 unique（不可卖不可拆）');
ok(!/slot: 'guard'[^}]*noDrop: false/.test(items), '护体仍不进随机池（件件有旧主，只能打下来）');
const carrierBlock = parry.slice(parry.indexOf('const CARRIERS'), parry.indexOf('// special 键语义'));
const enabledItems = [...carrierBlock.matchAll(/enabled: true, itemId: '([a-z_]+)'/g)].map(m => m[1]);
ok(enabledItems.length === 11, '11 个载体全部 enabled', enabledItems);
for (const id of enabledItems) ok(guardIds.some(g => g.id === id), '载体 itemId 有对应装备：' + id);
ok(/special: 'knock'/.test(carrierBlock) && /special: 'seal1s'/.test(carrierBlock) &&
   /special: 'moonSlow'/.test(carrierBlock) && /special: 'proxy'/.test(carrierBlock) && /special: 'etch'/.test(carrierBlock),
  '五种 special 都写在载体上（钟鸣/定器/月华/替身/蚀）');
ok(/const sp = c\.special \|\| mat\.tap\.special \|\| null;/.test(game),
  'parryResolve 真的读载体 special（原先只读招式属性那条，载体上的 special 全是死数据）');
ok(/tap\.reduce/.test(game) && /baseReduce/.test(game), '载体可以钉死单击减伤（狼首玉如意一挡即免伤）');
ok(/tap\.cd/.test(game) && /gpr\.state = 'cd'/.test(game), '载体的 tap.cd 真的进 CD');
ok(/c\.hold && c\.hold\.mul/.test(game), '载体的 hold.mul 真的改长按减伤');
ok(/proxyAt/.test(game) && /would >= p\.maxhp \* 0\.25/.test(game), '元罡盾替身有 CD、且只替「重手」');

// ---------- 出处：每条护体都挂在某张图的首通奖励上 ----------
const srcGuard = [...sources.matchAll(/addTo\('([a-z0-9_]+)', \{ items: \['(g_[a-z_]+)'\] \}\)/g)].map(m => ({ map: m[1], id: m[2] }));
ok(srcGuard.length === 9, '9 件靠打下来的护体各有出处（另 2 件是入门随身的老三件）', srcGuard.map(x => x.map + ':' + x.id));
ok(/未在随机池/.test(sources) || /不进随机池/.test(sources), '出处段写明了为什么不进随机池');

// ---------- 其余槽位：这一轮补的三件 ----------
for (const [id, name] of [['qingjiao', '青蛟旗'], ['t_tayun', '踏云靴'], ['fb_jinguang', '金光砖符宝']]) {
  ok(new RegExp("id: '" + id + "',\\s*name: '" + name + "'").test(items), '补齐原著装备：' + name);
}
ok(/addTo\('luxiong', \{ items: \['qingjiao'\] \}\)/.test(sources), '青蛟旗出自下山岔道（陆师兄那面旗）');
ok(/addTo\('yanjia', \{ items: \['t_tayun'\] \}\)/.test(sources), '踏云靴出自燕家堡（封岳的靴子）');
ok(/addShop\('tainan', \['fb_jinguang'\]\)/.test(sources), '金光砖符宝在太南小会货架上');
ok(/id: 'fb_jinguang', price: 560/.test(fs.readFileSync(join(root, 'js', 'maps.js'), 'utf8')), '货架有价，否则买不了');

// ---------- C 静态：智能选靶 ----------
ok(/function targetScore\(e, d, cur\)/.test(game), '有打分函数 targetScore');
ok(/if \(e === G\.boss\) s \+= 260; else if \(e\.elite\) s \+= 150;/.test(game), 'Boss / 精英优先');
ok(/e\.castT > 0 && e\.castT < 0\.9\) s \+= 110/.test(game), '正在蓄力的先打断');
ok(/e\.wardMax > 0 && e\.ward > 0\) s \+= 60/.test(game), '护罩没破的优先磨');
ok(/e\.wardMax > 0 && e\.ward <= 0 && G\.time < \(e\.wardT \|\| 0\)\) s -= 90/.test(game), '刚破罩的降权');
ok(/e === cur\) s \+= 30/.test(game), '当前目标有滞回（+30），不来回抖');
ok(/const tgt = pickTargetIn\(ax2\.ax, ax2\.ay\)/.test(game), '自动开火改走 pickTargetIn');
ok(/function drawAimMark\(\)/.test(game) && /drawAimMark\(\);/.test(game), '锁定目标画在场上（不然玩家只看见乱打）');
ok(/if \(G\.aimE\) G\.aimE = tgt;/.test(game) || /if \(tgt\) G\.aimE = tgt;/.test(game), '锁定目标每帧更新');
// 标记要「隐约」：Jerry 明确说金色准星 + 呼吸收放出戏。
// 这两条钉住「淡」这件事本身 —— 不透明度一旦回到 0.4 以上、或重新加上呼吸，
// 就又变回射击游戏的锁定框了。
{
  const aimFn = (game.match(/function drawAimMark\(\)[\s\S]*?\n  \}/) || [''])[0];
  const alphas = [...aimFn.matchAll(/rgba\([^)]*,\s*([0-9.]+)\)/g)].map(m => +m[1]);
  ok(alphas.length > 0 && Math.max(...alphas) <= 0.20, '锁定标记再收淡一半（不透明度 > 0.2 就还能读成准星了）', alphas);
  ok(!/Math\.sin\(/.test(aimFn), '锁定标记不呼吸（会动的标记最像 UI）');
  ok(!/drawAllyName\((md|pd)\.name/.test(game), '同伴与灵宠不再显示名字（脚下一行字就是单位标签）');
  ok(!/fillStyle = 'rgba\(10,20,30,0\.6\)'/.test(game), '随行之人不再画不透明底名条（那是 UI 标签）');
  ok(/ring: true, ally: 1/.test(game) && /pt\.ally \? 0\.056 : 1/.test(game), '同伴/灵宠技能圈再淡 80%（0.28 → 0.056）');
  ok(/rgba\(143,47,36,' \+ \(0\.07 \+ 0\.07 \* gk\)/.test(game), '同伴/灵宠护体罩朱砂圈淡到隐约（主圈 ≤ 0.14）');
  ok(/rgba\(255,86,86,' \+ \(0\.04 \+ k \* 0\.07\)/.test(game), '同伴/灵宠受击红圈淡到隐约（≤ 0.11）');
  ok(!/rgba\(255,86,86,' \+ \(0\.04 \+ k \* 0\.07\)[\s\S]{0,400}p\.hurtFlash/.test(game), '主角自己的受击红圈没被一起淡掉（保位置可读）');
  ok((game.match(/FX3\.spawn\('rune'[^;]*dim: 0\.20/g) || []).length === 4, '同伴/灵宠的像素法阵也淡 80%（FX3 dim=0.2，共 4 处）');
  ok(/it\.tag \? prevA \* ha : prevA\) \* it\.dim/.test(fx), 'FX3 支持逐实例 dim，主角特效不被动');
}

// ---------- D 静态：舆图 ----------
ok(/js\/atlas\.js/.test(html), 'index.html 引入 atlas.js');
ok(/id="wmAtlas"/.test(html), '修行图上有「三界舆图」入口');
ok(/const SEGS = \[/.test(atlas) && /人界/.test(atlas) && /灵界/.test(atlas) && /仙界/.test(atlas), '三段：人界/灵界/仙界');
ok(/linearGradient/.test(atlas), '山用渐变墨面（不是纯色块，也不是一根细线）');
ok(!/at-link/.test(atlas) && !/stroke-dasharray:.*at-path/.test(atlas), '不画节点连线（前三版就是栽在流程图上）');
ok(/pointerdown/.test(atlas) && /scrollLeft/.test(atlas), '长卷可拖动');
ok(/data-id=/.test(atlas) && /function detail\(/.test(atlas), '印章可点，点了出详情');

// ==================== 运行时 ====================
const browser = await chromium.launch({ channel: 'chrome' });
const allErrs = [];

async function bootPage(saveObj, opts) {
  const o = opts || {};
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 390, height: 844 } });
  const page = await ctx.newPage();
  if (saveObj) await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [SAVE_KEY, JSON.stringify(saveObj)]);
  page.on('pageerror', e => allErrs.push(e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { ctx, page };
}

// 【1】新档：护体槽默认佩上，三件随身
{
  const { ctx, page } = await bootPage(null);
  const r = await page.evaluate(() => window.__FR.guardState());
  ok(r.equip === 'g_xt_ftd', '新档默认佩玄铁飞天盾', r.equip);
  ok(r.carrier === '玄铁飞天盾', '弹反载体认得出它', r.carrier);
  ok(r.all.length === 11, '洞府里能看到 11 件护体的名目', r.all.length);
  await ctx.close();
}

// 【2】11 件都能被载体认出来，且各自的 special 真的在跑
{
  const { ctx, page } = await bootPage(null);
  const r = await page.evaluate(() => {
    const F = window.__FR;
    F.enterMap('houshan', 'easy');
    F.muteStory(true);
    const ids = F.guardState().all.map(x => x.id);
    const out = {};
    for (const id of ids) {
      F.clearEnemies();
      const e = F.allySpawnElite(F.G.player.x + 90, F.G.player.y, { id: 9100, hp: 5e5 });
      const en = F.G.enemies[F.G.enemies.length - 1];
      en.wardMax = 0; en.ward = 0; en.castT = 1.2;
      const x0 = en.x;
      F.guardGive(id); F.parryEquip(id);
      F.G.player.hp = F.G.player.maxhp; F.G.player.iv = 0;
      F.G.parry.state = 'idle'; F.G.parry.cd = 0; F.G.parry.proxyAt = 0;
      F.etchState().length = 0; F.G.etch = [];
      F.parryPress();
      const before = F.G.parry.state;
      const hit = F.hurtFrom(40, e.id);
      out[id] = {
        carrier: (F.parryCarrier() || {}).name, before: before, stun: hit.eStun,
        castT: hit.eCastT, moved: Math.round(Math.abs(hit.eX - x0)), hp: hit.hp,
        etch: F.etchState().length, cd: +(F.parryState().cd || 0).toFixed(2),
        state: F.parryState().state, proxy: F.proxyState().at
      };
    }
    return out;
  });
  for (const id of Object.keys(r)) ok(!!r[id].carrier, '载体认得出 ' + id, r[id].carrier);
  ok(r.g_jg_huan.state === 'cd' && r.g_jg_huan.cd >= 0.3, '精钢环：格开后强制短 CD（快接下一个）', r.g_jg_huan);
  ok(r.g_lsy_ruyi.cd >= 3.4, '狼首玉如意：一挡之后 3.5 秒 CD', r.g_lsy_ruyi);
  ok(r.g_yg_dun.hp >= 99 && r.g_yg_dun.proxy > 0, '元罡盾：傀儡替身替他吃了这一记，并进了 18 秒 CD', r.g_yg_dun);
  ok(r.g_qn_jing.castT >= 1.5, '青凝镜：定器把对方起手打断（castT 被推后）', r.g_qn_jing);
  ok(r.g_zt_zhong.moved > r.g_bl_dun.moved + 30, '遮天钟：钟鸣把来敌推得比普通盾远', [r.g_zt_zhong.moved, r.g_bl_dun.moved]);
  ok(r.g_bl_dun.etch > 0, '白磷盾：格开带上「蚀」', r.g_bl_dun);
  ok(r.g_mt_zhuo.stun >= 0.7, '弥天镯：月华凝滞（硬直比常规 0.62 长）', r.g_mt_zhuo.stun);
  ok(r.g_jg_fu.before === 'hold' && r.g_jg_fu.hp < 99, '金刚符：不支持单击，只能长按（掉了一点血）', r.g_jg_fu);
  await ctx.close();
}

// 【3】道陨不抽护体
{
  const s = {
    version: 5, cleared: ['qixuan'], unlocked: ['qixuan'], mapId: 'qixuan',
    cultivate: { level: 20, xp: 0, skills: { sword: 3 } },
    inventory: { g_xt_ftd: 1, g_bl_dun: 1, m_jingtie: 40, m_yusui: 40, m_hantie: 40 },
    stones: 1000
  };
  const { ctx, page } = await bootPage(s);
  const r = await page.evaluate(() => { window.__FR.parryEquip(''); return window.__FR.deathTollTest(); });
  const lostGuards = Object.keys(r.lost).filter(k => k.indexOf('g_') === 0);
  ok(lostGuards.length === 0, '道陨一件护体都不抽', r.lost);
  ok(r.out && r.out.items > 0, '别的东西照抽（不是把整条规则关掉）', r.out);
  await ctx.close();
}

// 【4】一件护体都没有 → 读档自愈
{
  const { ctx, page } = await bootPage({ version: 5, cultivate: { level: 20, xp: 0, skills: { sword: 3 } }, inventory: { m_jingtie: 5 }, cleared: ['qixuan'], unlocked: ['qixuan'], mapId: 'qixuan' });
  const r = await page.evaluate(() => window.__FR.guardState());
  ok(r.bag.indexOf('g_xt_ftd') >= 0, '补发玄铁飞天盾', r.bag);
  ok(r.equip === 'g_xt_ftd' && r.carrier === '玄铁飞天盾', '补发的同时就佩上（不然键在、按不动）', r.equip);
  await ctx.close();
}

// 【5】老档：已经打穿的图，护体照典籍补回包里
{
  const { ctx, page } = await bootPage({
    version: 5, cultivate: { level: 40, xp: 0, skills: { sword: 3 } },
    inventory: { g_xt_ftd: 1 }, cleared: ['qixuan', 'luxiong', 'xuese', 'xuechi', 'yanjia'],
    unlocked: ['qixuan'], mapId: 'qixuan'
  });
  const r = await page.evaluate(() => window.__FR.guardState());
  for (const id of ['g_jg_huan', 'g_bl_dun', 'g_zt_zhong', 'g_hl_san']) ok(r.bag.indexOf(id) >= 0, '按通关记录补回 ' + id, r.bag);
  ok(r.equip === 'g_hl_san', '顺手换成现在能戴的最强一件（黄罗伞 r30）', r.equip);
  await ctx.close();
}

// 【6】智能选靶：远处的精英优先于贴脸的杂兵
{
  const { ctx, page } = await bootPage(null);
  const r = await page.evaluate(() => {
    const F = window.__FR;
    F.enterMap('houshan', 'easy');
    F.muteStory(true);
    F.clearEnemies();
    const P = F.G.player;
    const near = F.allySpawnElite(P.x + 40, P.y, { id: 9201, hp: 1e5, name: '杂兵' });
    const far = F.allySpawnElite(P.x + 150, P.y, { id: 9202, hp: 1e5, name: '精英' });
    const en1 = F.G.enemies[F.G.enemies.length - 2], en2 = F.G.enemies[F.G.enemies.length - 1];
    en1.elite = false; en2.elite = true;
    const pickElite = F.aimPick();
    // 精英刚破罩 → 该换回杂兵
    en2.wardMax = 100; en2.ward = 0; en2.wardT = F.G.time + 3;
    const pickBroken = F.aimPick();
    // Boss 在更远处也优先（仍要落在射程椭圆内，ax = 舞台宽/2 − 20）
    en2.wardT = 0;
    F.allySetBoss(P.x + 195, P.y);
    const pickBoss = F.aimPick();
    return { near: near.id, far: far.id, pickElite: pickElite, pickBroken: pickBroken, pickBoss: pickBoss, boss: !!F.G.boss };
  });
  ok(r.pickElite && r.pickElite.elite === true, '贴脸杂兵 + 150px 精英：选精英', r.pickElite);
  ok(r.pickBroken && r.pickBroken.elite === false, '精英刚破罩：降权，换回近处杂兵', r.pickBroken);
  ok(r.pickBoss && r.pickBoss.boss === true, 'Boss 在场：优先 Boss', r.pickBoss);
  await ctx.close();
}

// 【7】舆图：能开、能拖、能点，320 宽也不出界
for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
  const { ctx, page } = await bootPage({
    version: 5, skin: 'jin', cleared: ['qixuan', 'houshan', 'xuese'], unlocked: ['qixuan', 'huangfeng'],
    mapId: 'xuese', cultivate: { level: 30, xp: 0, skills: { sword: 3 } }, inventory: { g_xt_ftd: 1 }
  }, { viewport: vp });
  await page.evaluate(() => { window.__FR.worldmap(); document.getElementById('wmAtlas').click(); });
  await page.waitForTimeout(350);
  const r = await page.evaluate(() => {
    const v = document.getElementById('atView');
    const seals = [...document.querySelectorAll('#atlas .at-seal')];
    const segs = [...document.querySelectorAll('#atlas .at-seg')];
    const host = document.getElementById('atlas');
    return {
      display: host && getComputedStyle(host).display,
      n: seals.length, done: document.querySelectorAll('#atlas .at-seal.done').length,
      cur: document.querySelectorAll('#atlas .at-seal.cur').length,
      wm: [...document.querySelectorAll('#atlas .at-wm')].map(x => x.textContent),
      scrollW: v.scrollWidth, clientW: v.clientWidth, sl: v.scrollLeft,
      segW: segs.map(s => Math.round(s.getBoundingClientRect().width)),
      overflowX: document.documentElement.scrollWidth <= window.innerWidth + 2,
      foot: document.getElementById('atFoot').textContent.slice(0, 40)
    };
  });
  ok(r.display === 'flex', vp.width + ' 宽：舆图打开', r.display);
  ok(r.n > 150, vp.width + ' 宽：印章全都在（' + r.n + '）', r.n);
  ok(r.done === 3, vp.width + ' 宽：已了的图变朱砂印（3 枚）', r.done);
  ok(r.cur === 1, vp.width + ' 宽：当前所在只有一枚「此刻」', r.cur);
  ok(r.wm.length === 3 && r.wm.join(',') === '人界,灵界,仙界', vp.width + ' 宽：三段水印齐全', r.wm);
  ok(r.scrollW > r.clientW * 3, vp.width + ' 宽：长卷确实比屏宽得多（可拖）', [r.scrollW, r.clientW]);
  ok(r.overflowX, vp.width + ' 宽：页面本身不被长卷撑破');
  // 点印章 → 底部出详情
  await page.evaluate(() => { document.querySelectorAll('#atlas .at-seal')[3].click(); });
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => document.getElementById('atFoot').textContent);
  ok(d.indexOf('越国') >= 0 || d.indexOf('灵界') >= 0 || d.length > 12, vp.width + ' 宽：点印章出详情', d.slice(0, 40));
  await ctx.close();
}

ok(allErrs.length === 0, '全程没有 JS 报错', allErrs.slice(0, 3));

await browser.close();
console.log('\n护体 / 选靶 / 舆图 回归：' + pass + ' 通过，' + fail + ' 失败');
if (fail) { console.log('\n失败项：'); for (const b of bad) console.log(' · ' + b); process.exit(1); }
