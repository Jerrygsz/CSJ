// 普通敌人基础属性（七玄门周边，按原著早期风物命名）
// mats：这具身子身上能掏出来的东西。有它就只按它掉，没有才退回地图物产。
// drop: 道具掉落概率；tier: 掉落稀有度档位（0 普通 / 1 精英 / 2 Boss）
window.ENEMY_TYPES = {
  wolf:    { name: '灰毛野狼',   hp: 9,  spd: 62, dmg: 6,  r: 9,  xp: 1, spr: 'wolf',     drop: 0.030, tier: 0, mats: ['m_wolfdan', 'm_chijing'] },
  snake:   { name: '青纹毒蛇',   hp: 6,  spd: 74, dmg: 5,  r: 7,  xp: 1, spr: 'snake',    drop: 0.028, tier: 0, wob: true, mats: ['m_shedan'] },
  bat:     { name: '吸血妖蝠',   hp: 5,  spd: 68, dmg: 4,  r: 7,  xp: 1, spr: 'bat',      drop: 0.032, tier: 0, wob: true, mats: ['m_chijing'] },
  boar:    { name: '铁背野猪',   hp: 24, spd: 42, dmg: 12, r: 11, xp: 2, spr: 'boar',     drop: 0.045, tier: 0, charge: true, mats: ['m_huangjing'] },
  bandit:  { name: '山贼喽啰',   hp: 16, spd: 48, dmg: 8,  r: 10, xp: 2, spr: 'bandit',   drop: 0.040, tier: 0, mats: ['m_jingtie', 'm_fuzhi'] },
  assassin:{ name: '黑衣杀手',   hp: 14, spd: 86, dmg: 9,  r: 9,  xp: 3, spr: 'assassin', drop: 0.055, tier: 0, dash: true, mats: ['m_lingmo', 'm_fuzhi'] },
  ghoul:   { name: '尸傀',       hp: 52, spd: 26, dmg: 15, r: 12, xp: 4, spr: 'ghoul',    drop: 0.070, tier: 0, mats: ['m_shihui'] },
  // 支线出没
  disciple:{ name: '同门陪练',   hp: 30, spd: 66, dmg: 8,  r: 9,  xp: 3, spr: 'disciple', drop: 0.050, tier: 0, mats: ['m_jingtie'] },
  shigui:  { name: '矿洞石魈',   hp: 70, spd: 30, dmg: 14, r: 12, xp: 5, spr: 'shigui',   drop: 0.080, tier: 0, mats: ['m_jingtie', 'm_chitong', 'm_xuantie', 'm_yusui'] }
};
