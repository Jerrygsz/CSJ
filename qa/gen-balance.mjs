// 由解析模型生成 js/balance.js
//
// 只用模型，不用逐图实测：
//   实测量出来的是「打这一只 Boss 的效率」，混着 Boss 好不好打中、会不会贴脸、
//   绕身功法蹭不蹭得到 —— 同一等级段能差 30 倍。把这团噪声抄进血量，只是把
//   「有些 Boss 难打」换个地方表现成「有些 Boss 特别薄」。
//   模型只用功法表里写死的伤害/弹数/间隔 + 境界倍率，能精确复现；
//   唯一的未知是命中率，压成一个全局系数 HIT。
//
// 输入：qa/balance/model.json（由 qa/balance-model.mjs 生成）
import fs from 'node:fs';

const model = JSON.parse(fs.readFileSync('qa/balance/model.json', 'utf8'));

// 闭环校准层（qa/calibrate.mjs 产出）：实测 TTK 反推的血量覆盖模型值。
// 模型算不出的东西 —— Boss 风筝、后段召唤替死、二阶段无敌帧 —— 全部体现在实测 TTK 里，
// 用它反推的血量才对得上「实际打多久」。没有这个文件时退回纯模型值。
const CAL = fs.existsSync('qa/balance/cal.json')
  ? (JSON.parse(fs.readFileSync('qa/balance/cal.json', 'utf8')).__hp || {})
  : {};

// 命中率：模型算的是「全程都打到」的理想值。实战有走位、弹道落空、二阶段停顿。
// 它不是常数：前期一门剑慢慢打，几乎不空；后期一秒出手十几次，空放也跟着涨。
// 实测/模型：lv18 0.88、lv150 0.19、lv420 0.41、lv640 0.37（中段样本受 Boss 血量
// 影响失真，只作参考）。取两端锚定、对数插值：lv1 0.80 → lv640 0.30。
const HIT_LO = 0.80, HIT_HI = 0.30, HIT_SPAN = 640;
const HIT = lv => HIT_LO * Math.pow(HIT_HI / HIT_LO, Math.min(1, Math.log(1 + lv) / Math.log(1 + HIT_SPAN)));

// ---- 目标带（干净基准：无装备、无永久丹药）----
const T = {
  combat: { ttk: 30, pct: 0.075 },
  boss:   { ttk: 36, pct: 0.090 },
  final:  { ttk: 44, pct: 0.105 },   // 卷末 / 跨大境界守关
};
// 首关是教学局：站桩也得能赢，不然第一只怪就劝退。
// 实测 houshan 站桩 22 秒里被摸 6~8 下，按 9% 算必死；给到 5%（20 击）才留得住人。
const PCT_OVERRIDE = { houshan: 0.045 };
const tierOf = m => (m.endLevel ? T.final : (T[m.type] || T.combat));

const rows = [];
for (const m of model) {
  if (m.bossHp == null) continue;
  const t = tierOf(m);
  const modelHp = Math.round(m.dps * HIT(m.lv) * t.ttk / 100) * 100;
  const hp = CAL[m.id] || modelHp;
  const pct = PCT_OVERRIDE[m.id] || t.pct;
  const dmg = Math.max(1, Math.round(m.pHp * pct));
  rows.push({ id: m.id, lv: m.lv, tier: m.endLevel ? 'final' : m.type, oldHp: m.bossHp, oldDmg: m.bossDmg, hp, modelHp, dmg, pHp: m.pHp, hits: +(m.pHp / dmg).toFixed(1) });
}
rows.sort((a, b) => a.lv - b.lv);

// 锚定表：小怪 / 精英按等级插值，以第一图为 1.0
const ANCHOR = [];
const seen = new Set();
for (const r of rows) if (!seen.has(r.lv)) { seen.add(r.lv); ANCHOR.push([r.lv, +(r.modelHp / rows[0].modelHp).toFixed(4), r.pHp]); }
const baseDps = rows[0].modelHp / T.combat.ttk / HIT(rows[0].lv);   // 第一图的解析秒伤

const fmtHp = n => n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n);
let out = `// ============================================================================
// 数值均衡表（第 74 轮）
//
// 为什么有这个文件：83 张图的 Boss 血量是历年手写的绝对值，玩家气血却随境界
// 指数暴涨（lv1 100 → lv640 81.6 万）。两条曲线各走各的，结果三件事：
//   · 开局第一关的狼妖打不动（1100 血 / 玩家一秒 11 伤 = 100 秒起）
//   · 中期 TTK 抖 3~10 倍（108 级某一图要 105 秒，110 级下一图 60 秒）
//   · 36 级以后危机感一路归零
//
// 现在 Boss 数值分两步定：
//   1. 解析模型（qa/balance-model.mjs）算出该图「玩家大概多少秒伤」——只有功法表里的
//      伤害/弹数/间隔 + 境界倍率，可以精确复现。
//   2. 闭环校准（qa/calibrate.mjs）用实测 TTK 反推血量——模型算不出的东西（Boss 风筝、
//      后段召唤替死、二阶段无敌帧）全在实测里，同等级同血量实测能差 4 倍。
//
// 目标带（干净基准：无装备、无永久丹药）：
//   普通战斗图   TTK 30s   Boss 单击 ${(T.combat.pct*100).toFixed(1)}% 气血（裸装 ${(1/T.combat.pct).toFixed(1)} 击）
//   剧情战       TTK 36s   Boss 单击 ${(T.boss.pct*100).toFixed(1)}% 气血（裸装 ${(1/T.boss.pct).toFixed(1)} 击）
//   卷末守关     TTK 44s   Boss 单击 ${(T.final.pct*100).toFixed(1)}% 气血（裸装 ${(1/T.final.pct).toFixed(1)} 击）
//   首关（教学） 单击 4.5%（裸装 22 击）：站桩也得能赢，不然第一只怪就劝退
//
// 带装备与永久丹药的玩家输出约为基准 1.5 倍、减伤 20~55%，
// 对应实战 TTK 20~30 秒、可挨 13~25 击 —— 「打得爽，但真会掉血」。
//
// 小怪与精英不写死，按 ANCHOR 表随等级锚定（见 game.js 的 enemyAnchor）。
// Boss 弹幕伤害由 game.js 的 bShot(boss, k) 从本表派生，不许再写死常数。
//
// 表由 qa/gen-balance.mjs 生成（读 model.json + cal.json），验收：
//   node qa/balance-verify.mjs --all    # 全库实测 TTK
//   node qa/calibrate.mjs               # 出带就重算血量，再生成一轮
//   node qa/verify-balance.mjs          # 守门断言（覆盖/单击/弹幕/时长）
// ============================================================================
(function () {
  'use strict';

  // [地图 id]: [Boss 血量, Boss 单击伤害]
  var BOSS = {
`;
for (const r of rows) out += `    ${(r.id + ':').padEnd(18)} [${String(r.hp).padStart(8)}, ${String(r.dmg).padStart(6)}],  // lv${String(r.lv).padEnd(3)} ${r.tier.padEnd(6)} 裸装 ${String(r.hits).padStart(4)} 击   (原 ${fmtHp(r.oldHp)} / ${r.oldDmg})\n`;
out += `  };

  // [推荐等级, 小怪血量倍率(以第一图为 1.0), 该级玩家气血基准]
  var ANCHOR = [
`;
for (const a of ANCHOR) out += `    [${String(a[0]).padStart(3)}, ${String(a[1]).padStart(10)}, ${String(a[2]).padStart(7)}],\n`;
out += `  ];

  function interp(lv) {
    if (lv <= ANCHOR[0][0]) return { k: ANCHOR[0][1], hp: ANCHOR[0][2] };
    for (var i = 1; i < ANCHOR.length; i++) {
      if (lv <= ANCHOR[i][0]) {
        var a = ANCHOR[i - 1], b = ANCHOR[i], t = (lv - a[0]) / (b[0] - a[0] || 1);
        return { k: a[1] + (b[1] - a[1]) * t, hp: a[2] + (b[2] - a[2]) * t };
      }
    }
    var z = ANCHOR[ANCHOR.length - 1];
    return { k: z[1], hp: z[2] };
  }

  window.BALANCE = {
    BOSS: BOSS,
    ANCHOR: ANCHOR,
    hitRate: function (lv) { return ${HIT_LO} * Math.pow(${HIT_HI} / ${HIT_LO}, Math.min(1, Math.log(1 + lv) / Math.log(1 + ${HIT_SPAN}))); },

    // ---- 小怪 ----
    // 血量按「一刀一个」反推：恶狼 9 血 × 倍率 ÷ 该级秒伤 ≈ 0.3~0.45 秒一只。
    // 这个数是量出来的：倍率给到 17 倍时（lv46），单目标功法会一直咬着身边的小怪，
    // Boss 反而打不着 —— 小怪太厚不只是拖节奏，是直接抢走了输出。
    // 指数 0.94：玩家秒伤比小怪血量涨得稍快，越到后期越能「一扫一片」。
    // 0.22：中后期小怪血量原本按 k^0.94 × 0.55 标，但敌人表里的 def.hp 自带一条跨图曲线
    // （狼 12 → 幽奴 28 万），两条相乘 = 双重复利，lv36 实际血量是设计意图的 11 倍。
    // game.js 的 makeEnemy 已改成「只取 def.hp 的同图相对硬度」，这里同步把基准压到 0.22，
    // 让 lv1 的狼仍是 2.6 血（一发一个），中后期不再打不动。
    trashHpK: function (lv) { return Math.pow(interp(lv).k, 0.94) * 0.22; },
    // 单击：占该级气血 3.5%（裸装 29 击才死；一群围上来才真的掉血）
    trashDmgK: function (lv) { return interp(lv).hp / 100 * 0.583; },

    // ---- 精英 ----
    // 血量 = 该级玩家 5 秒的输出量（实战带装备约 3.5 秒）
    eliteHp: function (lv) { return ${baseDps.toFixed(2)} * interp(lv).k * 5; },
    // 单击 = 该级气血的 6.6%（介于小怪 3.5% 与 Boss 12% 之间）
    eliteDmg: function (lv) { return interp(lv).hp * 0.066; },

    // ---- 剧情战里的第二 Boss：血 72%、伤 85% ----
    extraHp: 0.72, extraDmg: 0.85,

    // 各目标带（给守门脚本读，别在两处写两份数）
    TARGET: { combat: { ttk: ${T.combat.ttk}, pct: ${T.combat.pct} }, boss: { ttk: ${T.boss.ttk}, pct: ${T.boss.pct} }, final: { ttk: ${T.final.ttk}, pct: ${T.final.pct} } },
  };
})();
`;
fs.writeFileSync('js/balance.js', out);
console.log('写成 js/balance.js：' + rows.length + ' 个 Boss，' + ANCHOR.length + ' 个锚定点  (首图解析秒伤=' + baseDps.toFixed(1) + ')');
console.log('\n抽样（旧 → 新）:');
for (const r of rows.filter((_, i) => i % 8 === 0)) console.log(`  ${String(r.lv).padStart(4)} ${r.id.padEnd(14)} hp ${String(r.oldHp).padStart(8)} → ${String(r.hp).padStart(8)}   dmg ${String(r.oldDmg).padStart(5)} → ${String(r.dmg).padStart(6)}`);
