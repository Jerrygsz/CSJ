// 炼制配方补充（第四部·灵兽/丹道）：饲灵丸 / 造化丹
// 说明：本文件随 game.js 一并载入，向 window.RECIPES 增补 2 条炼丹方，
// 并登记其对应的成品丹药与材料，使「炼丹方 11 条」成立。
// 注：原备份中本文件内容已丢失（仅余空快照），此处按原著设定重建其结构与效果。
(function () {
  // 1) 材料
  window.MATERIALS = window.MATERIALS || [];
  window.MATERIALS.push(
    { id: 'm_silingcao', name: '饲灵草', icon: '🌿', rarity: 1, desc: '叶脉流光，喂灵兽最养神的一味。饲灵丸主药。' },
    { id: 'm_zaohuacao', name: '造化果', icon: '🍇', rarity: 2, desc: '生于灵脉尽头，三百年一结。造化丹主引果。' }
  );

  // 2) 成品丹药
  window.ITEMS = window.ITEMS || [];
  window.ITEMS.push(
    { id: 'siling', name: '饲灵丸', rarity: 2, icon: '💊', req: 12, desc: '以饲灵草炼成，喂灵宠可短时增其神识。', craftOnly: true },
    { id: 'zaohua', name: '造化丹', rarity: 3, icon: '💊', req: 24, desc: '造化果为核，辅以灵草，丹成有造化之机。', craftOnly: true }
  );

  // 3) 刷新索引（items.js 在载入时已将 ALL_ITEMS 固化为快照，追加后需重建）
  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  // 4) 配方
  window.RECIPES = window.RECIPES || [];
  window.RECIPES.push(
    { id: 'r_siling', kind: 'alchemy', name: '饲灵丸', out: 'siling', outN: 1, cost: 120, req: 12, rate: 0.78,
      mats: [['m_silingcao', 2], ['m_chijing', 1]], desc: '饲灵草配赤精草，喂灵宠提神。' },
    { id: 'r_zaohua', kind: 'alchemy', name: '造化丹', out: 'zaohua', outN: 1, cost: 400, req: 24, rate: 0.6,
      mats: [['m_zaohuacao', 2], ['m_zihua', 1]], desc: '造化果辅以紫猴花，丹成有造化之机。' }
  );
})();
