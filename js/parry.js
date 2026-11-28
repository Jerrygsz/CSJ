/* =========================================================================
 * js/parry.js — 弹反系统「可配置数据」（纯数据，不依赖 runtime）
 * -------------------------------------------------------------------------
 * 状态：数据预备，尚未接入 index.html / game.js，不发布、不触发 Pages。
 * 接入方式：在 index.html 增加 <script src="js/parry.js?v=..."></script>，
 *          并由 game.js 的 hitPlayer / useQuick / renderQuickBar / updateBoss
 *          读取本文件消费。
 *
 * 设计基调（用户定稿）：凡人味——有代价、有门槛、有破绽。
 *   越是“不该硬接”的攻击（空间/通天灵宝），弹反收益越低，逼走位而非站桩。
 *
 * 已锁定口径（2026-11-11）：
 *   1) 煞气：用同一池（G.sha.need=120），不另开护体池；costPerSec 为 need 的百分比。
 *   2) 长按衰减：第1秒=base，第2/3秒=base×0.71/0.43（非匀速）。
 *   3) 冰系：单列 ice 行（不并入 fire）。
 *   4) 前摇补偿：tele<0.45 的招式自动 +0.15s 视觉前摇（只延长预警，不改伤害结算）。
 *   5) 联机：本版仅单人/房主生效，客机不本地结算敌人伤害，预留同步位。
 * ========================================================================= */
window.PARRY = (function () {
  'use strict';

  // —— 0. 元信息 ——
  const META = {
    version: 'runtime-20261111I',
    status: '已接入 runtime（凡人味弹反 · 长按共用煞气池 + 单击卡点反伤）',
    note: '数值为初版，需配合平衡脚本验证“长按3s+CD1s 是否导致 Boss 战站桩”。接入版见 game.js 的 parry* 系列函数。'
  };

  // —— 1. Boss 招式 → 功法属性（attr）解析 ——
  // 解析顺序（runtime 实现时照此）：
  //   SKILL_ATTR[招名]  →  KEYWORDS 关键字命中  →  FX_ATTR[fx] 兜底  →  默认 'phys'
  // 这样加新 Boss/招式无需改 runtime，只需补 KEYWORDS 或在 SKILL_ATTR 精确钉死。
  const SKILL_ATTR = {
    // 精确覆盖（招名与 fx 视觉类型冲突、或需特殊归类的样例；其余走 KEYWORDS）
    // '玄阴魔焰': 'poison',  // 已被 KEYWORDS('魔')覆盖，留空示意
  };

  // 关键字 → attr（招名含其一即归该类；冰/火分开以满足“冰系单列”）
  const KEYWORDS = {
    poison: ['魔', '煞', '阴', '血', '毒', '尸'],     // 魔功/血道/尸气/毒系
    fire:   ['炎', '火', '雷', '焰'],                 // 火/雷元素
    ice:    ['冰', '寒'],                             // 冰系（单列）
    bind:   ['木', '禁', '威压', '定', '困', '缠'],   // 困禁/定身/缠绕
  };

  // fx 视觉类型兜底（bosskit 里每招的 fx 字段）
  const FX_ATTR = {
    fan: 'phys', beam: 'phys', ring: 'phys', nova: 'phys', rain: 'phys', dash: 'phys',
    mist: 'poison',          // 毒雾类走 poison
    trap: 'bind', pull: 'bind', chill: 'bind', blink: 'bind',  // 困禁/定身/冰封/瞬移
    heal: null, summon: null // 无弹反交互
  };

  // 通天灵宝级 Boss（其招式强制走 spirit 行，无视上面归类）
  // 仅收录明显仙界/真仙 tier；其余 Boss 默认 normal。可按设计增删。
  const SPIRIT_BOSSES = new Set([
    '元刹圣祖分魂',
    '马良·真仙之身',
    '马良·九元观真仙',
    '天外魔君·化身',
    '凶司王',
    '血光圣祖·阳刹化身',
  ]);

  // —— 2. 按功法属性的 减伤/反伤/特殊 矩阵 ——
  // tap.reduce   : 单击命中窗口内的免伤比例
  // tap.counter  : 单击成功时的反伤比例（再乘载体 counterMul）
  // tap.special  : 单击成功的附加效果键（见 CARRIERS.special 说明）
  // hold.base    : 长按第1秒减伤比例（第2/3秒按 HOLD_DECAY 衰减）
  // hold.extraSha: 长按额外煞气消耗比例（叠加在 HOLD.costPerSec 上）
  // hold.shaMul  : 长按煞气消耗倍率
  // fail.stun    : 单击失败硬直秒数
  // 20261111F：把反伤抬成「主打输出」。原来 phys 反震只有来袭伤害的 24%（0.40×载体 0.6），
  // 一场 Boss 战打下来还不如平A两刀 —— 弹反就成了纯防守。现在单击格开本身即一次重击：
  // 反震 = max(来袭伤害 × counter × 载体倍率, 目标最大生命 × JUICE.counterHpPct × 连反倍率)。
  const MATRIX = {
    phys:   { tap: { reduce: 1.0,  counter: 1.20, special: null },          hold: { base: 0.70 }, fail: { stun: 0.5 } },
    fire:   { tap: { reduce: 0.80, counter: 0.85, special: null },          hold: { base: 0.55, extraSha: 0.03 }, fail: {} },
    ice:    { tap: { reduce: 0.65, counter: 0.55, special: null },          hold: { base: 0.48 }, fail: {} },
    poison: { tap: { reduce: 0.50, counter: 0.45, special: 'clearErosion1' }, hold: { base: 0.40 }, fail: {} },
    bind:   { tap: { reduce: 0.30, counter: 0.30, special: 'free' },        hold: { base: 0.25 }, fail: {} },
    spirit: { tap: { reduce: 0.10, counter: 0.20, special: null },          hold: { base: 0.15, shaMul: 2 }, fail: { stun: 0.5 } },
  };

  // —— 3. 长按衰减曲线（乘算 hold.base，第3秒末强制收招）——
  // 落地值：phys 70→50→30 / fire 55→39→24 / ice 48→34→21 / poison 40→28→17 / bind 25→18→11 / spirit 15→11→6
  const HOLD_DECAY = [
    { sec: 1, mul: 1.0 },
    { sec: 2, mul: 0.71 },
    { sec: 3, mul: 0.43 },
  ];

  // —— 4. 长按通用规则 ——
  const HOLD = {
    maxSec: 3,            // 单次最多长按 3 秒，强制结束
    cdSec: 1,             // 收招/中断后 CD 1 秒
    costPerSec: 0.03,     // 每秒消耗 = G.sha.need 的 3%（即 120×0.03=3.6/秒）
    moveSlow: 0.6,        // 长按期间移速 -60%（或不能移动）
    lowShaFallback: 0.20, // 煞气不足 3% 时长按自动失效 → 普通格挡减伤 20%
  };

  // —— 5. 单击通用规则 ——
  const TAP = {
    window: 0.25,         // 卡点窗口 0.25s（Boss 出招前摇末段）
    missStun: 0.40,       // 单击没卡准窗口：硬直 0.4s，吃满伤害
  };

  // —— 6. 前摇补偿（口径 4）——
  const TELE_BONUS = {
    threshold: 0.45,      // tele < 此值的招式
    add: 0.15,            // 自动补 +0.15s 视觉前摇（仅预警圈延长，不改伤害结算）
  };

  // —— 7. 失败 / 硬抗惩罚 ——
  const PENALTY = {
    tapMiss:    { stun: 0.40, eatFull: true },                 // 单击挥空
    holdEarly:  { cd: 1 },                                      // 长按提前松手：CD 照常 1s
    lowSha:     { fallbackReduce: 0.20 },                      // 煞气不足 → 普通格挡
    // 不弹反、硬接高阶攻击的真实代价（凡人味）：硬直 + 煞气暴涨 + 临时减属性
    hardHit:    { stun: 0.30, shaSpike: 0.06, debuffSec: 2, debuffPct: 0.10 },
  };

  // —— 8. 凡人味 UI 文案（不用“完美防御”）——
  const UI = {
    tapSuccess: ['格开', '卸力', '架开'],   // 单击成功随机一条（不用「反震」：反震是印蜕上的伤害词）
    holdStart: '护体',
    holdEnd: '收招',
    fail: '破绽',
    lowSha: '煞气不足·转格挡',
    edgeRedOnHold: true,                  // 长按防御时画面边缘泛红（煞气外溢）
  };

  // —— 9. 联机（口径 5）——
  const COOP = {
    hostOnly: true,
    note: '客机不本地结算敌人伤害；本版弹反仅单人/房主生效。预留 G.parry 状态同步位，客机侧只读渲染。',
  };

  // —— 9.5 命中的「爽感」（20261111E 建 / 20261111F 全面加倍）——
  // 口径：弹反成功必须「实」——世界停一拍、屏幕抖一下、手心里震一下、Boss 被打退半步。
  // 20261111F：用户要求「以弹反为主打战斗技巧」，所以反震伤害、美术、飘字、奖励整体翻倍。
  // 只影响观感与反震数值，不改 MATRIX 的减伤 / 长按口径。
  const JUICE = {
    hitStop: 0.18,        // 顿帧（秒）：格开那一下世界停一拍。普通暴击才 0.018
    hitStopChain: 0.03,   // 每层连反再加的顿帧（上限 +0.12 —— 连得越顺，世界停得越久）
    shakeTap: 26,         // 屏幕震动幅度（G.shake 每秒衰减 40 → 约 0.65s 散尽）
    shakeCounter: 9,      // 反震真打到身上时再补一点
    knock: 52,            // 反震把来源推开多少像素（Boss 只推 55%，推飞了就没法打）
    stun: 0.62,           // 反震造成的硬直（e.stunT；Boss 取 75%）
    vulnSec: 2.4,         // 「破绽」时长：这段时间里它挨打更疼
    vulnMul: 1.70,        // 破绽期伤害倍率
    chainWin: 2.4,        // 连反窗口：上一次成功后多久内再成功算连
    chainMax: 7,          // 连反上限层数
    chainDamage: 0.25,    // 每层连反的反震伤害加成（满 7 层 = +150%）
    counterHpPct: 0.05,   // 反震额外按「目标最大生命」的比例算（保底，Boss 才算得动）
    bossCounterMul: 1.5,  // 对 Boss 的反震再 ×1.5 —— 弹反是主打 Boss 的技巧
    shaBack: 18,          // 每次弹反成功返还的煞气（够长按护体再撑一会儿）
    healPct: 0.02,        // 卸力导引：按最大气血回一点（凡人味，回得少但要看得见）
    sparkN: 26,           // 反震溅出的火星数量
    // —— 20261111G：大爆炸清场 + 无敌帧 ——
    // 口径：弹反成功的那一圈冲击波不只是好看，它真的「炸」—— 半径内的杂兵、飞来的弹幕、
    // 地上的持续区 / 真判定光柱一起被扫掉；随后给一段无敌，连反可叠加，但封顶 2 秒。
    // Boss 不参与清场（Boss 只吃反震 + 硬直 + 破绽），精英不秒杀、按最大生命重创。
    clearR: 172,          // 清场半径（px）：与最外圈冲击波同口径，玩家看得见的就是打得到的
    clearElitePct: 0.35,  // 精英：按最大生命扣的比例（不秒杀，避免弹反变成一键清精英）
    invSec: 0.5,          // 每次弹反成功的无敌基数（实际 = 基数 × 连反层数：×1 半秒 / ×2 一秒）
    invSecMax: 2.0,       // 连反叠加的无敌上限（秒）：×4 起封顶
    hapticTap: [26, 34, 46],    // 触屏震动节奏：格开
    hapticBoss: [34, 42, 78],   // 触屏震动节奏：把 Boss 打退
  };

  // —— 10. 弹反载体（非衣物类防御法宝/符箓）——
  // tier: 'low'(法器) | 'talisman'(符箓) | 'high'(高阶法宝)
  // enabled: 是否接入本版逻辑（20261118H：原著里叫得出名的护体法宝全部接入）
  // tap.window / tap.counterMul / tap.cd / tap.reduceMul : 覆盖或缩放 MATRIX 的对应项；
  //   tap:null 表示不支持单击（只长按）
  // tap.cd : 单击成功后强制转入 CD（狼首玉如意这类「救命一挡」）
  // hold.mul : 长按减伤倍率（黄罗伞罩得远、伞面大，撑得比小盾住）
  // hold.moveSlow : 覆盖 HOLD.moveSlow
  // special : 见下方说明
  // itemId : 对应 items.js 里 slot:'guard' 的装备 id —— 两者必须一一对应，
  //          qa/verify-guard-gear.mjs 会逐条比对；对不上就等于这件法宝 Game 里摸不到手。
  const CARRIERS = {
    xt_ftd: {
      name: '玄铁飞天盾', icon: '🛡', tier: 'low', req: 1, enabled: true, itemId: 'g_xt_ftd',
      desc: '玄阴玄铁炼制，绕身全方位防御。基础弹反盾：单击窗口宽，反伤偏低。',
      tap: { window: 0.28, counterMul: 0.85 }, hold: { attr: 'phys' }, special: null,
    },
    jg_huan: {
      name: '精钢环', icon: '⭕', tier: 'low', req: 11, enabled: true, itemId: 'g_jg_huan',
      desc: '攻守兼备的上品法器。窗口窄、CD 短，反伤低 —— 靠连点接招，不靠一记打疼人。',
      tap: { window: 0.20, counterMul: 0.55, reduceMul: 0.60, cd: 0.35 },
      hold: { attr: 'phys', mul: 0.80 }, special: null,
    },
    bl_dun: {
      name: '白磷盾', icon: '🛡', tier: 'low', req: 14, enabled: true, itemId: 'g_bl_dun',
      desc: '墨蛟白磷炼制，韩立筑基期主力防具。弹反成功附加“蚀”持续伤害。',
      tap: { window: 0.26, counterMul: 1.35 }, hold: { attr: 'poison' }, special: 'etch',
    },
    zt_zhong: {
      name: '遮天钟', icon: '🔔', tier: 'low', req: 16, enabled: true, itemId: 'g_zt_zhong',
      desc: '宣乐之物，攻守兼备，罩身困敌。单击格开时把来敌连人带势推开。',
      tap: { window: 0.25, counterMul: 0.95 }, hold: { attr: 'phys', mul: 0.95 }, special: 'knock',
    },
    jg_fu: {
      name: '金刚符', icon: '📜', tier: 'talisman', req: 18, enabled: true, itemId: 'g_jg_fu',
      desc: '金色光罩挡法器攻击，身法变慢。不支援单击弹反，长按专用。',
      tap: null, hold: { attr: 'phys', moveSlow: 0.30, mul: 1.05 }, special: null,
    },
    hl_san: {
      name: '黄罗伞', icon: '🌂', tier: 'low', req: 30, enabled: true, itemId: 'g_hl_san',
      desc: '顶级防御法器：罩得远，长按比小盾住；只是笨重，反伤平平。',
      tap: { window: 0.32, counterMul: 0.60, reduceMul: 1.12 },
      hold: { attr: 'phys', mul: 1.12, moveSlow: 0.72 }, special: null,
    },
    qn_jing: {
      name: '青凝镜', icon: '🪞', tier: 'low', req: 33, enabled: true, itemId: 'g_qn_jing',
      desc: '喷青光定住法器，使敌宝暂时失灵。格开成功附带「定器」：打断对方这一手。',
      tap: { window: 0.26, counterMul: 0.80 }, hold: { attr: 'phys' }, special: 'seal1s',
    },
    lsy_ruyi: {
      name: '狼首玉如意', icon: '🐺', tier: 'high', req: 45, enabled: true, itemId: 'g_lsy_ruyi',
      desc: '红黄护罩挡元婴一击。一挡即免伤，但之后要缓很久。',
      tap: { window: 0.22, counterMul: 0.50, reduce: 1.0, cd: 3.5 },
      hold: { attr: 'phys', mul: 1.02 }, special: null,
    },
    yg_dun: {
      name: '元罡盾', icon: '🛡', tier: 'high', req: 55, enabled: true, itemId: 'g_yg_dun',
      desc: '韩立给大衍傀儡炼的防御法宝。傀儡协同：可替身挡一次。',
      tap: { window: 0.24, counterMul: 1.0 }, hold: { attr: 'phys' }, special: 'proxy',
    },
    jg_zhao: {
      name: '金刚罩', icon: '🌟', tier: 'high', req: 58, enabled: true, itemId: 'g_jg_zhao',
      desc: '佛门舍利金光，护身融入自身。本命级弹反：单击窗口极窄但反伤极高。',
      tap: { window: 0.16, counterMul: 2.0 }, hold: { attr: 'phys', mul: 1.06 }, special: null,
    },
    mt_zhuo: {
      name: '弥天镯', icon: '⭕', tier: 'high', req: 60, enabled: true, itemId: 'g_mt_zhuo',
      desc: '通天灵宝仿制，黄光护体。格开时洒下一圈月华，近处群妖凝滞。',
      tap: { window: 0.22, counterMul: 1.0 }, hold: { attr: 'phys' }, special: 'moonSlow',
    },

    // —— 占位（enabled:false）：符宝类一次性 / 与既有槽位冲突，本版不接 ——
    fjfb: {
      name: '飞剑符宝', icon: '🗡', tier: 'talisman', req: 16, enabled: false, itemId: null,
      desc: '一次性爆发符宝，耗尽威能。弹反成功时消耗 1 张，触发一次反打。',
      tap: { window: 0.24, counterMul: 1.2, consumeOnCounter: true }, hold: null, special: null,
    },
    jgzb: {
      name: '金光砖符宝', icon: '🧱', tier: 'talisman', req: 16, enabled: false, itemId: null,
      desc: '一次性爆发符宝。弹反成功时消耗 1 张，触发一次反打。',
      tap: { window: 0.24, counterMul: 1.2, consumeOnCounter: true }, hold: null, special: null,
    },
    xt_ding: {
      name: '虚天鼎', icon: '🏺', tier: 'high', req: 56, enabled: false, itemId: 't_xutianding',
      desc: '放大罩身硬抗通天灵宝攻击。虚天鼎本体已占「佩饰」槽，不与护体槽重复占位。',
      tap: { window: 0.22, counterMul: 1.0 }, hold: { shaMul: 2 }, special: 'backlash1pct',
    },
    yy_huan: {
      name: '映月环', icon: '🌙', tier: 'high', req: 120, enabled: false, itemId: null,
      desc: '通天灵宝原宝（弥天镯即其仿制）。本版只接仿制品，原宝留待灵界篇扩写。',
      tap: { window: 0.20, counterMul: 1.0 }, hold: { attr: 'phys' }, special: 'moonSlow',
    },
  };

  // special 键语义（runtime 实现时消费）：
  //   etch        : 单击反伤成功后，给攻击者附加“蚀”持续伤害（DoT）
  //   knock       : 单击成功额外震退 + 短暂硬直（遮天钟的钟鸣）
  //   seal1s      : 单击成功后打断对方这一手并短定（青凝镜的定器）
  //   clearErosion1: 单击成功清除自身 1 层煞气侵蚀（poison 行自带）
  //   free        : 单击成功仅解控，不反伤（bind 行自带）
  //   proxy       : 护体槽带着元罡盾时，每 18 秒替他硬吃一记（hitPlayer 消费）
  //   moonSlow    : 弹反成功在范围内附加「月华」凝滞（弥天镯）
  //   consumeOnCounter: 单击成功消耗 1 张对应符宝触发一次反打（fjfb/jgzb，本版未接）

  return {
    META, SKILL_ATTR, KEYWORDS, FX_ATTR, SPIRIT_BOSSES,
    MATRIX, HOLD_DECAY, HOLD, TAP, TELE_BONUS, PENALTY, UI, COOP, CARRIERS, JUICE,
  };
})();
