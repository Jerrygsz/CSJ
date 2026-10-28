// 炼制配方补充（第四部·灵兽/丹道）：饲灵丸 / 造化丹
// 说明：本文件随 game.js 一并载入，向 window.RECIPES 增补 2 条炼丹方。
// 注：原备份中本文件内容已丢失（仅余空快照），此处按原著设定重建其结构与效果。
//
// 20261028h 校对：
//   · 删「饲灵草」「造化果」两个原著作没有的材料名（前传/仙界篇 0 命中）；
//   · 饲灵丸改由灵芝配人参炼成（原著只说「炼制饲灵丸的一些药材种子」，未点名），
//     产出直接并入罐里的饲灵丸（m_siling），否则炼出来的丸子喂不了灵兽；
//   · 造化丹按原著改用灵烛果为主药——「此灵果除了可炼制造化丹外，即使生服也另有妙用」。
(function () {
  // 1) 成品丹药
  window.ITEMS = window.ITEMS || [];
  window.ITEMS.push(
    { id: 'zaohua', name: '造化丹', rarity: 4, icon: '🌠', req: 84, desc: '灵烛果为核，辅以灵草。修为 +35%，服下可先尝一口下一层境界——原著里是四族拍卖会上的「圣药」', craftOnly: true, effect: { xpMul: 0.35 } }
  );

  // 2) 刷新索引（items.js 在载入时已将 ALL_ITEMS 固化为快照，追加后需重建）
  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  // 3) 配方
  window.RECIPES = window.RECIPES || [];
  window.RECIPES.push(
    { id: 'r_siling', kind: 'alchemy', name: '饲灵丸', out: 'm_siling', outN: 1, cost: 120, req: 12, rate: 0.30,
      mats: [['m_lingzhi', 2], ['m_chijing', 1]], desc: '灵芝配人参，捣成药泥搓成丸。古修士调教灵兽，用的就是这一味。' },
    { id: 'r_zaohua', kind: 'alchemy', name: '造化丹', out: 'zaohua', outN: 1, cost: 400, req: 24, rate: 0.12,
      mats: [['m_lingzhu', 2], ['m_baihezhi', 1], ['m_huangjingzhi', 1], ['m_hualongcao', 1]], desc: '灵烛果为主，白鹤芝凉血、黄精芝补元、化龙草固本。灵烛果这灵物，生服也能提升些许修为。' }
  );
})();
