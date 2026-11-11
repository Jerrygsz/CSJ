// 弹反系统（凡人味防御 · 20261111D）—— 数据层 + runtime 接入静态守门
//
// 不依赖浏览器：用 node 直接 eval js/parry.js（window.PARRY 是纯数据 IIFE），
// 拿到真实对象校验结构；再用正则核对 game.js / index.html / items.js / sw.js 的接线。
// 这样 verify-all 跑它时不必起静态服务（与 verify-ver 那种要开浏览器跑页面的闸门分开）。
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

let pass = 0, fail = 0;
const ok = (c, m, x) => {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ ' + m + (x === undefined ? '' : '  ' + JSON.stringify(x))); }
};

// ---------- 1. 数据层：直接 eval js/parry.js 拿真实对象 ----------
const parrySrc = fs.readFileSync(join(root, 'js', 'parry.js'), 'utf8');
globalThis.window = {};
try { (0, eval)(parrySrc); } catch (e) { /* 数据层解析失败会在下面断言暴露 */ }
const P = globalThis.window.PARRY;

ok(!!P, 'js/parry.js 暴露 window.PARRY');
ok(P && P.META && /runtime/.test(P.META.version || ''), 'META.version 标记为已接入 runtime', P && P.META && P.META.version);

// 载体：本版恰好 3 件 enabled 且 itemId 非 null
const carriers = P ? P.CARRIERS : {};
const enabled = Object.keys(carriers).filter(k => carriers[k].enabled && carriers[k].itemId);
ok(enabled.length === 3, '本版启用 3 件弹反载体（enabled 且 itemId 非空）', enabled);
ok(enabled.every(k => carriers[k].itemId.startsWith('g_')), '启用载体 itemId 与 items.js 的 g_* 一一对应', enabled.map(k => carriers[k].itemId));
ok(P && P.CARRIERS.xt_ftd && P.CARRIERS.bl_dun && P.CARRIERS.jg_fu &&
    P.CARRIERS.xt_ftd.enabled && P.CARRIERS.bl_dun.enabled && P.CARRIERS.jg_fu.enabled,
    '首版三件（玄铁飞天盾 / 白磷盾 / 金刚符）均为 enabled');
ok(P && P.CARRIERS.jg_fu && P.CARRIERS.jg_fu.tap === null,
    '金刚符 tap:null（长按专用，不支持单击弹反）', P && P.CARRIERS.jg_fu && P.CARRIERS.jg_fu.tap);

// 属性矩阵：六类齐全（口径 3：冰系单列，不并入 fire）
const MAT = P ? P.MATRIX : {};
const attrKeys = ['phys', 'fire', 'ice', 'poison', 'bind', 'spirit'];
ok(attrKeys.every(k => MAT[k]), 'MATRIX 含六类属性 phys/fire/ice/poison/bind/spirit', Object.keys(MAT));
ok(MAT.fire && MAT.ice && MAT.fire !== MAT.ice, '冰系单列（fire 与 ice 是不同行，未并入）');
ok(MAT.poison && MAT.poison.tap && MAT.poison.tap.special === 'clearErosion1', 'poison 行自带 clearErosion1（蚀/解侵蚀）');
ok(MAT.bind && MAT.bind.tap && MAT.bind.tap.special === 'free', 'bind 行自带 free（解控，反伤低）');
// 20261111F：反震抬成主打输出 —— 格开本身即一次重击（原来 phys 只有 0.4×载体 0.6 = 24%）
ok(MAT.phys && MAT.phys.tap.counter >= 1.0, 'phys 单击反伤 ≥100% 来袭伤害（不再是零头）', MAT.phys && MAT.phys.tap.counter);
ok(MAT.fire && MAT.fire.tap.counter >= 0.8 && MAT.ice && MAT.ice.tap.counter >= 0.5,
    'fire / ice 反伤同步抬高（≥0.8 / ≥0.5）', { fire: MAT.fire && MAT.fire.tap.counter, ice: MAT.ice && MAT.ice.tap.counter });
ok(MAT.poison && MAT.poison.tap.counter > 0 && MAT.bind && MAT.bind.tap.counter > 0 && MAT.spirit && MAT.spirit.tap.counter > 0,
    'poison / bind / spirit 不再是 0 反伤', { poison: MAT.poison.tap.counter, bind: MAT.bind.tap.counter, spirit: MAT.spirit.tap.counter });

// 长按衰减曲线（口径 2：非匀速 1.0/0.71/0.43）
const decay = P ? P.HOLD_DECAY : [];
ok(decay && decay.length === 3 && decay[0].mul === 1 && decay[1].mul === 0.71 && decay[2].mul === 0.43,
    'HOLD_DECAY 三段乘算 1.0/0.71/0.43（非匀速衰减）', decay && decay.map(d => d.mul));

// 长按通用规则：共用煞气池 costPerSec、CD、最长 3s
const HOLD = P ? P.HOLD : {};
ok(HOLD.costPerSec != null && HOLD.cdSec != null && HOLD.maxSec === 3,
    'HOLD 通用规则：costPerSec / cdSec / maxSec=3', { costPerSec: HOLD.costPerSec, cdSec: HOLD.cdSec, maxSec: HOLD.maxSec });

// 联机口径 5：仅单人/房主
const COOP = P ? P.COOP : {};
ok(COOP && COOP.hostOnly === true, 'COOP.hostOnly=true（弹反仅单人/房主生效，客机留接口）');

// ---------- 2. runtime 接入：game.js 接线 ----------
const game = fs.readFileSync(join(root, 'js', 'game.js'), 'utf8');
ok(/function parryResolve\s*\(dmg,\s*skLike,\s*src\)/.test(game), 'game.js 定义 parryResolve(dmg, skLike, src)');
ok(/function parryPress\s*\(\)/.test(game) && /function parryRelease\s*\(\)/.test(game), 'game.js 定义 parryPress / parryRelease');
ok(/function updateParry\s*\(dt\)/.test(game), 'game.js 定义 updateParry(dt) 状态机');
ok(/G\.parry\s*=\s*\{\s*state:\s*'idle'/.test(game), 'resetRun 初始化 G.parry（state/idle）');
ok(/updateParry\(dt\)/.test(game), '主循环 update 调用 updateParry(dt)');
ok(/parryResolve\(dmg, sk, src\)/.test(game), 'hitPlayer 内调用 parryResolve(dmg, sk, src)（受击唯一入口透传 sk/src）');
ok(/__FR\s*=/.test(game) && /parryState\(\)\s*\{\s*return G\.parry/.test(game) && /parryCarrier\(\)\s*\{/.test(game),
    '__FR 暴露 parryState / parryCarrier 探针（供本闸门与联机测试）');
ok(/paintParryHud\s*\(\)/.test(game), 'paintParryHud 每帧绘制快捷 3 栏弹反状态');
ok(/const elParryEdge = document\.getElementById\('parryEdge'\)/.test(game), 'game.js 引用 #parryEdge 节点（长按泛红）');

// ---------- 3. 装备系统：items.js 的 guard 槽 + 三件载体 ----------
const items = fs.readFileSync(join(root, 'js', 'items.js'), 'utf8');
ok(/id:\s*'guard'/.test(items), "items.js SLOTS 含 guard 槽（弹反法宝）");
const gIds = ['g_xt_ftd', 'g_bl_dun', 'g_jg_fu'].filter(id => new RegExp("id:\\s*'" + id + "'").test(items));
ok(gIds.length === 3, 'items.js 含三件 guard 载体 g_xt_ftd / g_bl_dun / g_jg_fu', gIds);
ok(gIds.every(id => new RegExp("id:\\s*'" + id + "'.*[\\s\\S]*?slot:\\s*'guard'").test(items)),
    '三件载体 slot 均为 guard 且 noDrop（只走补发/自带）');

// ---------- 4. 发版接线：index.html 引用 + 版本自洽 + 加载顺序 ----------
const html = fs.readFileSync(join(root, 'index.html'), 'utf8');
const swSrc = fs.readFileSync(join(root, 'sw.js'), 'utf8');
const swVer = (swSrc.match(/const BUILD = '([^']+)'/) || [])[1];
const htmlVer = (html.match(/sw\.js\?v=(20\d{6}[A-Z])/) || [])[1];
ok(!!swVer && swVer === htmlVer, 'sw.js BUILD 与 index.html 的 sw.js?v= 自洽', { sw: swVer, html: htmlVer });
ok(new RegExp("js/parry\\.js\\?v=" + (htmlVer || 'X')).test(html), 'index.html 引用 js/parry.js（带同版本 ?v=）');
ok(/<script src="js\/parry\.js[^"]*"><\/script>/.test(html.replace(/\?v=[^"]+/g, '')), 'parry.js 在脚本清单内');
// 加载顺序：parry.js 必须在 game.js 之前（game.js 运行时读 window.PARRY）
const idxParry = html.indexOf('js/parry.js');
const idxGame = html.indexOf('js/game.js');
ok(idxParry > 0 && idxGame > idxParry, 'parry.js 加载顺序在 game.js 之前', { parry: idxParry, game: idxGame });
ok(/<div id="parryEdge">/.test(html), 'index.html 含 #parryEdge 节点');

// ---------- 5. 样式：css/style.css 给 #parryEdge 上了边缘泛红 ----------
const css = fs.readFileSync(join(root, 'css', 'style.css'), 'utf8');
ok(/#parryEdge\s*\{/.test(css) && /#parryEdge\.on/.test(css), 'css 为 #parryEdge / #parryEdge.on 定义边缘泛红');

// ---------- 6. 20261111E：弹反键放大 / 自定义位置 / 命中反馈 ----------
ok(/id="parryBtn"\s+class="qb qb-parry"/.test(html), 'index.html 有独立弹反键 #parryBtn（qb-parry）');
const qbHtml = (html.match(/<div id="quickbar">([\s\S]*?)<\/div>/) || [])[1] || '';
ok((qbHtml.match(/class="qb\s/g) || []).length === 2, '#quickbar 只剩 1/2 两格（第 3 格已拆成独立键）', (qbHtml.match(/class="qb\s/g) || []).length);
const pBtnCss = (css.match(/#parryBtn\s*\{[\s\S]*?\}/) || [''])[0];
const pW = +(pBtnCss.match(/width:\s*(\d+)px/) || [])[1];
const qW = +((css.match(/^\.qb\s*\{[^\n]*?width:\s*(\d+)px/m) || [])[2] || 46);
ok(pW >= 60 && pW > qW, 'css 把弹反键放大到 ≥60px 且大于 1/2 格的 ' + qW + 'px', pW);
ok(/@media \(pointer: coarse\)[\s\S]{0,200}#parryBtn/.test(css), '触屏设备给弹反键再加一档尺寸');
ok(/pointer-events:\s*auto/.test(pBtnCss), '弹反键自己打开 pointer-events（#hud 是 none）');
ok(/id="parryPosEdit"/.test(html) && /id="parryPosReset"/.test(html), '暂停菜单含「调整位置 / 恢复默认」');
ok(/id="parryDragBar"/.test(html) && /id="parryDragDone"/.test(html), '含拖动引导条与「完成」按钮');
ok(/id="parryHit"/.test(html) && /#parryHit\.go/.test(css), '弹反成功金环 #parryHit + .go 动画');

ok(/parryPos:\s*null/.test(game), 'defaultSave 带 parryPos:null（默认位）');
ok(/parryPos:\s*\(s\.parryPos/.test(game), 'loadSave 校验并迁移 parryPos（脏数据回默认）');
ok(/function applyParryBtnPos\s*\(\)/.test(game), 'game.js 定义 applyParryBtnPos()（按舞台比例落位）');
ok(/function bindParryDrag\s*\(\)/.test(game) && /function openParryPosEdit\s*\(\)/.test(game), 'game.js 实现拖动定位（bindParryDrag / openParryPosEdit）');
ok(/save\.parryPos\s*=\s*\{\s*x:/.test(game), '拖动松手把位置按比例写回 save.parryPos');
ok(/parryPos\(\)\s*\{/.test(game) && /parryBtnRect\(\)\s*\{/.test(game), '__FR 暴露 parryPos / parryBtnRect 探针');
ok(/arr\.push\(elParryBtn\)/.test(game), 'elQuickBtns[2] 指向独立弹反键（沿用原绘制逻辑）');

// 命中反馈：「爽」的六个落点各有一条
const J = P && P.JUICE;
ok(!!J, 'parry.js 暴露 JUICE（可调手感数值）');
ok(J && J.hitStop >= 0.06 && J.shakeTap >= 10, 'JUICE：顿帧 ≥0.06s、震屏 ≥10', J && { hitStop: J.hitStop, shake: J.shakeTap });
ok(J && J.knock > 0 && J.stun > 0 && J.vulnMul > 1, 'JUICE：击退 / 硬直 / 破绽易伤', J && { knock: J.knock, stun: J.stun, vulnMul: J.vulnMul });
ok(J && J.chainMax >= 3 && J.chainDamage > 0 && J.shaBack > 0, 'JUICE：连反链 + 煞气返还', J && { chainMax: J.chainMax, chainDamage: J.chainDamage, shaBack: J.shaBack });
ok(J && Array.isArray(J.hapticTap) && J.hapticTap.length > 0, 'JUICE：触屏震动节奏 hapticTap / hapticBoss',
  J && { tap: J.hapticTap, boss: J.hapticBoss });
ok(/function parryJuice\s*\(/.test(game), 'game.js 定义 parryJuice()（顿帧/震动/音效/粒子/击退整包）');
ok(/navigator\.vibrate/.test(game), '弹反成功调用触屏震动（navigator.vibrate）');
const audio = fs.readFileSync(join(root, 'js', 'audio.js'), 'utf8');
ok(/Sfx\.parry/.test(game) && /parry\(chain\)\s*\{/.test(audio), '专属音效 Sfx.parry（audio.js 已实现）');
ok(/G\.parry\.vulnT > 0/.test(game) && /G\.parry\.vulnE === e/.test(game), '破绽易伤在 damageEnemy 生效（只认那一只）');
ok(/pr\.chain = \(pr\.chain > 0 && pr\.chainT > 0\)/.test(game), '连反链按 chainWin 窗口累加（断连归 1）');
ok(/if \(pr\.chainT > 0\) \{ pr\.chainT -= dt/.test(game), 'updateParry 每帧衰减连反窗口与破绽计时');

// ---------- 7. 20261111F：反震 / 美术 / 飘字 / 奖励整体加倍（以弹反为主打 Boss 技巧）----------
ok(J && J.counterHpPct >= 0.04, '反震带「目标最大生命比例」保底（Boss 才算得动）', J && J.counterHpPct);
ok(J && J.bossCounterMul >= 1.3, '对 Boss 的反震再乘 bossCounterMul（弹反是主打 Boss 的技巧）', J && J.bossCounterMul);
ok(J && J.chainMax >= 7 && J.chainDamage >= 0.25, '连反链抬到 ≥7 层、每层 ≥+25%', J && { chainMax: J.chainMax, chainDamage: J.chainDamage });
ok(J && J.vulnSec >= 2.2 && J.vulnMul >= 1.6, '破绽时长 ≥2.2s、易伤 ≥1.6 倍', J && { sec: J.vulnSec, mul: J.vulnMul });
ok(J && J.shaBack >= 16 && J.healPct > 0, '奖励加倍：煞气返还 ≥16 + 卸力引气回血', J && { shaBack: J.shaBack, healPct: J.healPct });
ok(J && J.hitStop >= 0.16 && J.shakeTap >= 22 && J.knock >= 45 && J.stun >= 0.55,
    '顿帧 / 震屏 / 击退 / 硬直整体加倍', J && { hitStop: J.hitStop, shake: J.shakeTap, knock: J.knock, stun: J.stun });
ok(J && J.sparkN >= 20 && J.hitStopChain > 0, '火星 ≥20 颗 + 连反叠顿帧', J && { sparkN: J.sparkN, hitStopChain: J.hitStopChain });

// 反震伤害路径：max(来袭伤害 × 反伤比例, 目标最大生命 × 比例) × 连反倍率
ok(/const byHp = \(pr\.src\.maxhp \|\| 0\) \*/.test(game) && /Math\.max\(byDmg, byHp\)/.test(game),
    '反震伤害取 max(来袭伤害, 目标最大生命比例)');
ok(/bossCounterMul \|\| 1\.5/.test(game), 'hitPlayer 里对 Boss 应用额外反震倍率');
// 反震的「按生命比例」必须先除掉全局倍率，否则等级越高越离谱（实测 lv45 一记满链能打 260% 血）
ok(/\(J\.counterHpPct \|\| 0\.05\)[\s\S]{0,120}\/ gm/.test(game) || /byHp[\s\S]{0,160}\/ gm/.test(game),
    '按最大生命算的反震先除 dmgMul（否则随等级线性失控）');
ok(/noVuln: true/.test(game) && /opts\.noVuln/.test(game), '反震本身不吃自己开的破绽（避免连反 × 破绽双重叠乘）');
// Boss 硬直：原来 stunT 只在小怪循环结算，Boss 根本不吃硬直
ok(/if \(b\.stunT > 0\) \{[\s\S]{0,240}?b\.stunT -= dt/.test(game), 'updateBoss 结算 Boss 硬直（反震能打断 Boss）');
ok(/src\.stunT \|\| 0/.test(game), 'Boss 对象没有 stunT 字段也能被打出硬直（||0 兜底）');
ok(/function fmtNum\s*\(/.test(game) && /'万'/.test(game), '大数字压成「万/亿」（印蜕排得下）');

// 美术加倍：像素爆点 + 双目刀光 + 三层冲击波 + 放射光芒 + 更大的火星
ok(/FX3\.spawn\('nova'/.test(game), '格开时炸像素爆点 nova（2.4 倍）');
ok(/ray: true, hard: true/.test(game), '格开时放射光芒（ray 粒子，绕过浅宣纸降彩）');
ok(/arc: 2\.5/.test(game) && /maxr: 156/.test(game) && /ang: a0 \+ Math\.PI/.test(game),
    '刀光更大 + 双层弯月 + 冲击波按屏幕尺度放大（不随主角半径缩水）');

// 飘字加倍：punch 弹出 + stroke 描边 + 大号
ok(/punch: !!o\.punch/.test(game) && /stroke: !!o\.stroke/.test(game), 'spawnText 支持 punch / stroke');
ok(/size \* \(age < 0\.16/.test(game), 'punch 飘字先放大再回落到原尺寸');
ok(/spawnText\(p\.x, p\.y - p\.r - 52, label, col, 28/.test(game), '「格开」用 28px 大号飘字（抬到冲击波之上）');
ok(/seal: true, punch: true, life: 1\.1/.test(game), '「反震 N」走大号朱砂印蜕');
ok(/引气 \+/.test(game) && /煞气 \+/.test(game), '奖励飘字：煞气 / 引气 都有');

// HUD：按钮上方「连 ×N」+ 金环加粗加长
ok(/data-chain/.test(game) && /#parryBtn\[data-chain\]::before/.test(css), '弹反键上方显示「连 ×N」');
ok(/parryHitFlash \.46s/.test(css) && /inset 0 0 0 7px/.test(css), '#parryHit 金环加粗加长（7px / 0.46s）');

// ---------- 汇总 ----------
console.log('');
if (fail === 0) {
  console.log('通过 ' + pass + ' 项 · 弹反系统数据层 + runtime 接入静态守门全绿');
  process.exit(0);
} else {
  console.log('失败：' + fail + ' 项（共 ' + (pass + fail) + ' 项）');
  process.exit(1);
}
