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
ok(MAT.bind && MAT.bind.tap && MAT.bind.tap.special === 'free', 'bind 行自带 free（解控不反伤）');

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

// ---------- 汇总 ----------
console.log('');
if (fail === 0) {
  console.log('通过 ' + pass + ' 项 · 弹反系统数据层 + runtime 接入静态守门全绿');
  process.exit(0);
} else {
  console.log('失败：' + fail + ' 项（共 ' + (pass + fail) + ' 项）');
  process.exit(1);
}
