// 炼制配方：炼丹 / 炼器 / 制符
// kind: alchemy 炼丹 | forge 炼器 | talisman 制符
// mats: [[材料id, 数量], ...]   cost: 灵石
// req: 角色等级门槛（含），不足则看得见做不了

window.RECIPE_KINDS = {
  alchemy:  { name: '炼丹', icon: '⚗', tip: '以灵草入炉，取丹丸。' },
  forge:    { name: '炼器', icon: '🔨', tip: '以矿入炉，锤打成形。' },
  talisman: { name: '制符', icon: '🖌', tip: '以灵墨落纸，一笔画成。' }
};

window.RECIPES = [
  // ================= 炼丹 =================
  { id: 'r_huiqi', kind: 'alchemy', name: '回气丹', out: 'huiqi', outN: 2, cost: 8, req: 1, rate: 0.92,
    mats: [['m_chijing', 2]], desc: '最粗浅的疗伤丹。一炉出两颗，够用一路。' },
  { id: 'r_lingzhi', kind: 'alchemy', name: '灵芝', out: 'lingzhi', outN: 2, cost: 6, req: 1, rate: 0.92,
    mats: [['m_huangjing', 2], ['m_chijing', 1]], desc: '老黄精配赤精草，蒸出来的药膏。' },
  { id: 'r_peiyuan', kind: 'alchemy', name: '培元丹', out: 'peiyuan', outN: 1, cost: 34, req: 3, rate: 0.85,
    mats: [['m_chijing', 3], ['m_huangjing', 2]], desc: '药庐的看家方子，墨大夫只教过一次。' },
  { id: 'r_huanglong', kind: 'alchemy', name: '黄龙丹', out: 'huanglong', outN: 1, cost: 95, req: 8, rate: 0.78,
    mats: [['m_zihua', 2], ['m_tianling', 1], ['m_wolfdan', 1]], desc: '练气期最实在的一味，增进修为不伤本。' },
  { id: 'r_jinsui', kind: 'alchemy', name: '金髓丸', out: 'jinsui', outN: 1, cost: 170, req: 12, rate: 0.7,
    mats: [['m_tianling', 2], ['m_chongjing', 1], ['m_yusui', 1]], desc: '丹成色如金髓，入口滚烫。' },
  { id: 'r_zhuji', kind: 'alchemy', name: '筑基丹', out: 'zhuji', outN: 1, cost: 820, req: 35, rate: 0.55,
    mats: [['m_yusuizhi', 3], ['m_zihua', 3], ['m_tianling', 3], ['m_longlin', 2], ['m_xuesha', 1]],
    desc: '玉髓芝、紫猴花、天灵果，三味主药缺一不可。三味只长在血色禁地里，五年才开一次。' },

  // ================= 炼器 =================
  { id: 'r_jingtie', kind: 'forge', name: '精铁短剑', out: 'jingtie', outN: 1, cost: 22, req: 3, rate: 0.9,
    mats: [['m_jingtie', 3]], desc: '七玄门铁匠的活计，胜在趁手。' },
  { id: 'r_chitong', kind: 'forge', name: '赤铜短戟', out: 'chitong', outN: 1, cost: 75, req: 9, rate: 0.85,
    mats: [['m_chitong', 2], ['m_jingtie', 2]], desc: '赤铜导灵，戟身比剑沉，劈得开兽甲。' },
  { id: 'r_qingzhu', kind: 'forge', name: '青竹剑', out: 'qingzhu', outN: 1, cost: 130, req: 7, rate: 0.82,
    mats: [['m_jingtie', 2], ['m_yusui', 1], ['m_huangjing', 2]], desc: '以精铁为骨、玉髓为引，仿青竹之形，轻而不飘。' },
  { id: 'r_ruanwei', kind: 'forge', name: '软猬甲', out: 'a_ruanwei', outN: 1, cost: 110, req: 9, rate: 0.84,
    mats: [['m_jingtie', 2], ['m_shihui', 2]], desc: '铁片缝在软皮里，刺在外，软在内。' },
  { id: 'r_moyu', kind: 'forge', name: '墨玉飞刀', out: 'moyu', outN: 1, cost: 230, req: 12, rate: 0.74,
    mats: [['m_xuantie', 1], ['m_yusui', 2], ['m_shihui', 1]], desc: '刀薄如叶，飞出无声。' },
  { id: 'r_hanyu', kind: 'forge', name: '寒玉甲', out: 'a_hanyu', outN: 1, cost: 300, req: 14, rate: 0.72,
    mats: [['m_hantie', 2], ['m_yusui', 2]], desc: '寒铁衬玉，贴上身上，血都是凉的。' },
  { id: 'r_xuantie', kind: 'forge', name: '玄铁重剑', out: 'xuantie', outN: 1, cost: 380, req: 16, rate: 0.68,
    mats: [['m_xuantie', 3], ['m_hantie', 1], ['m_jingtie', 2]], desc: '寻常炉火烧不化，得用灵石催火。' },
  { id: 'r_xuangui', kind: 'forge', name: '玄龟甲', out: 'a_xuangui', outN: 1, cost: 560, req: 20, rate: 0.6,
    mats: [['m_hantie', 3], ['m_xuantie', 2], ['m_yusui', 3]], desc: '甲片层层压叠，穿上像背了口井。' },
  { id: 'r_tianlei', kind: 'forge', name: '天雷子', out: 't_tianlei', outN: 1, cost: 740, req: 22, rate: 0.66,
    mats: [['m_xuantie', 2], ['m_xuesha', 2], ['m_yusui', 2]], desc: '以血煞引雷气封进珠里。摸上去指尖发麻。' },

  // ================= 制符 =================
  { id: 'r_shenxing', kind: 'talisman', name: '神行符', out: 'shenxing', outN: 2, cost: 18, req: 1, rate: 0.92,
    mats: [['m_fuzhi', 2], ['m_lingmo', 1]], desc: '画一张，腿脚就快一分。' },
  { id: 'r_qingyan', kind: 'talisman', name: '轻烟符', out: 'qingyan', outN: 2, cost: 16, req: 1, rate: 0.92,
    mats: [['m_fuzhi', 2], ['m_lingmo', 1]], desc: '身轻如烟，走位不滞。' },
  { id: 'r_jifeng', kind: 'talisman', name: '疾风符', out: 'jifeng', outN: 1, cost: 65, req: 5, rate: 0.8,
    mats: [['m_fuzhi', 3], ['m_lingmo', 2], ['m_wolfdan', 1]], desc: '妖丹磨墨，符成带风。' },
  { id: 'r_fb_huo', kind: 'talisman', name: '火球符宝', out: 'fb_huo', outN: 1, cost: 140, req: 5, rate: 0.78,
    mats: [['m_fuzhi', 4], ['m_lingmo', 2], ['m_xuesha', 1]], desc: '符宝贴袖，出手就是一团火。' },
  { id: 'r_fb_bing', kind: 'talisman', name: '冰锥符宝', out: 'fb_bing', outN: 1, cost: 170, req: 8, rate: 0.76,
    mats: [['m_fuzhi', 4], ['m_lingmo', 2], ['m_hantie', 1]], desc: '寒铁屑入墨，锥出成线，落地成霜。' },
  { id: 'r_huyu', kind: 'talisman', name: '护身玉符', out: 'huyu', outN: 1, cost: 250, req: 10, rate: 0.72,
    mats: [['m_yusui', 2], ['m_fuzhi', 3], ['m_lingmo', 2]], desc: '三道灵纹刻在玉上，替他挨过一刀。' },
  { id: 'r_fb_feng', kind: 'talisman', name: '风刃符宝', out: 'fb_feng', outN: 1, cost: 310, req: 12, rate: 0.74,
    mats: [['m_fuzhi', 4], ['m_lingmo', 3], ['m_wolfdan', 2]], desc: '刃过之处风声先到。' }
];

window.Recipes = {
  of(kind) { return RECIPES.filter(r => r.kind === kind); },
  get(id) { return RECIPES.find(r => r.id === id) || null; }
};
