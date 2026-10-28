// ============================================================================
// 第三部：元婴 · 化神（天南篇 / 大晋篇 / 人界之巅）
//
// 依《凡人修仙传》原著第 5-7 卷编排，接在奇渊岛之后：
//   阴冥之地（法力尽失 / 啼魂兽）→ 无边海 → 回天南 → 落云宗 → 尸魈 → 三派试剑
//   → 银月认主 → 结婴（217 岁）→ 灭付家 → 回乡 → 天南交易会 → 苍坤洞府
//   → 掩月宗救南宫婉 → 黄龙山（从仲神师手中逃脱）
//   → 慕兰边界大战（血罗罩）→ 阴罗宗四长老 → 极西之地（大衍神君）
//   → 坠魔谷（灵烛果 / 血焰）→ 灵渺园（27 年 · 元婴中期）
//   → 慕兰草原被打残（五鬼锁魂）→ 大晋佛宗（金刚舍利）→ 昆吾山（乾老魔）
//   → 镇魔塔（银月身份）→ 小极宫 → 虚天殿闭关 80 年（元婴后期）
//   → 星宫三次出手 → 鲲鹏之羽 → 落云宗立威 → 斩六道
//   → 芥子空间 300 年（化神 · 885 岁）→ 飞升
//
// 只往表里追加，不改前两部。
// ============================================================================
(function () {

  // ========================= 一、境界：元婴 / 化神 =========================
  window.REALM_LAYERS.push(
    { lv: 82,  name: '元婴初期', hp: 420,  dmg: 0.30, atk: 0.18, spd: 0.05, skill: 'sword', note: '元婴离体，寿元千载' },
    { lv: 92,  name: '元婴中期', hp: 560,  dmg: 0.34, atk: 0.20, spd: 0.06, skill: 'nova',  note: '婴变日熟，神通渐成' },
    { lv: 102, name: '元婴后期', hp: 720,  dmg: 0.38, atk: 0.22, spd: 0.06, skill: 'frost', note: '大修士之列，一方称雄' },
    { lv: 112, name: '化神初期', hp: 1000, dmg: 0.45, atk: 0.26, spd: 0.07, skill: 'fire',  note: '可调天地元气，呼风唤雨' },
    { lv: 122, name: '化神中期', hp: 1300, dmg: 0.50, atk: 0.28, spd: 0.07, skill: 'gourd', note: '神念化虚，隔空取物' },
    { lv: 132, name: '化神后期', hp: 1700, dmg: 0.56, atk: 0.30, spd: 0.08, skill: 'nova',  note: '人界之巅，只待飞升' }
  );

  // ========================= 二、材料 =========================
  window.MATERIALS.push(
    { id: 'm_gengjing', name: '庚精',       icon: '⚙', rarity: 4, desc: '金气凝成的硬块，炼飞剑的骨。天道盟拿它当赌注。' },
    // 天南交易会（阗天城）上流通的东西：韩立此行要换庚精，换到三千年赤精芝、紫铖兜与上古傀儡
    { id: 'm_chijingzhi', name: '三千年赤精芝', icon: '🍄', rarity: 4, desc: '赤精草长到三千年才成芝，仅次于化形的九曲灵参。元婴老怪拿它当硬通货。' },
    { id: 'm_kuilei',   name: '上古傀儡核', icon: '⚫', rarity: 4, desc: '上古傀儡留下的核，附一份元婴傀儡的炼制之法。阗天城晶龙阁的拍卖品。' },
    { id: 'm_lingzhu',  name: '灵烛果',     icon: '🕯', rarity: 4, desc: '果身像一截白烛，点在暗处会自己亮。服之可预尝下一层境界。' },
    { id: 'm_yinzhi',   name: '阴芝马',     icon: '🐴', rarity: 3, desc: '长成马形的阴芝，跑得比人快。养元培元的一味好药。' },
    { id: 'm_gangyin',  name: '罡银沙',     icon: '🌪', rarity: 4, desc: '沙粒里裹着罡风，一撮能压塌半间石室。' },
    { id: 'm_huodan',   name: '火蟾兽内丹', icon: '🔥', rarity: 4, desc: '火蟾兽腹里那枚，百年才结一颗。坠魔谷的硬货。' },
    { id: 'm_hanhuo',   name: '五色寒焰',   icon: '❄', rarity: 4, desc: '五种极寒之焰各取一缕，封在玉瓶里。化神那一关就靠它。' },
    { id: 'm_jingang',  name: '金刚舍利',   icon: '🛕', rarity: 4, desc: '佛宗高僧坐化后留下的骨珠。镇煞气，也镇心神。' },
    { id: 'm_kunpeng',  name: '鲲鹏之羽',   icon: '🪶', rarity: 4, desc: '游天鲲鹏落下的一根。轻得没有重量，风一过就自己动。' },
    { id: 'm_xuanbing', name: '万年玄冰',   icon: '🧊', rarity: 4, desc: '小极宫冰窟底下凿出来的，凿一尺要烧掉半块灵石。' }
  );

  // ========================= 三、成品 =========================
  window.ITEMS.push(
    // ---- 功法 / 秘术 ----
    // 高阶功法：学会一门功法，不是加一层属性 —— 之后靠练层往上磨
    { id: 'dayan2',   name: '大衍诀·后三层', rarity: 4, icon: '📘', req: 82, teach: 'dayan2', desc: '习得《大衍诀》后三层。大衍神君亲手补全的那半卷', unique: true },
    { id: 'yuanci',   name: '元磁神光',     rarity: 4, icon: '🌌', req: 102, teach: 'yuanci', desc: '习得《元磁神光》。元磁山炼化之后的神通，近身领域的极致', unique: true },
    // ---- 丹药（剧情所得，无丹方） ----
    // 造化丹的定义与丹方统一收在 value.js（造化果炼），此处不再重复定义（曾致 id 重复）。
    { id: 'moyuan',   name: '魔元丹',       rarity: 4, icon: '😈', req: 108, desc: '伤害 +45%，上限 +160。魔陀山秘丹，原著里韩立拿玄玉换了三枚，化神那一炉的主药', effect: { dmg: 0.45, maxhp: 160 } },
    // ---- 兵器 / 护甲 ----
    { id: 'w_xuemo',  name: '血魔剑',       rarity: 4, icon: '🗡', slot: 'weapon', req: 82, desc: '伤害 +42%，重击 +10%。掩月宗大长老的佩剑，剑身有血色纹路', effect: { dmg: 0.42, crit: 0.10 }, unique: true },
    { id: 'a_xuemo',  name: '血魔甲',       rarity: 4, icon: '🥷', slot: 'armor', req: 82, desc: '上限 +130，减伤 18%。血魔剑的配套甲衣，穿上人显小一圈', effect: { maxhp: 130, armor: 0.18 }, unique: true },
    { id: 'a_jiaolong', name: '蛟龙甲',     rarity: 4, icon: '🐉', slot: 'armor', req: 92, desc: '上限 +160，减伤 20%。坠魔谷蟒兽的皮，水火都咬不穿', effect: { maxhp: 160, armor: 0.20 }, unique: true },
    { id: 'a_tiancan', name: '天蚕衣',      rarity: 4, icon: '👘', slot: 'armor', req: 102, desc: '上限 +190，减伤 22%。大晋天蚕丝织的，刀过不留痕', effect: { maxhp: 190, armor: 0.22 }, unique: true },
    // ---- 法宝 ----
    { id: 't_yanghuan', name: '阳环',       rarity: 4, icon: '💍', slot: 'trinket', req: 82, desc: '伤害 +20%，重击 +8%。两仪环的阳面，压得住北极元光', effect: { dmg: 0.20, crit: 0.08 }, unique: true },
    { id: 't_guiluo', name: '鬼罗幡',       rarity: 4, icon: '🏴', slot: 'trinket', req: 92, desc: '伤害 +24%，拾取 +30%。阴罗宗四长老的幡，幡下养着鬼', effect: { dmg: 0.24, pickup: 0.3 }, unique: true },
    { id: 't_yinluo', name: '阴罗幡',       rarity: 4, icon: '🪢', slot: 'trinket', req: 92, desc: '上限 +120，减伤 12%。阴罗宗至宝，缠上就挣不开', effect: { maxhp: 120, armor: 0.12 }, unique: true },
    { id: 't_wuzi',   name: '五子同心魔',   rarity: 4, icon: '👥', slot: 'talisman', req: 102, desc: '伤害 +30%，重击 +10%。五个元婴级魔头，认主之后只认一个', effect: { dmg: 0.30, crit: 0.10 }, unique: true },
    { id: 't_yuanci', name: '元磁山',       rarity: 4, icon: '⛰', slot: 'talisman', req: 112, desc: '减伤 20%，上限 +200。整座山炼化了收在体内，压得人喘不过气', effect: { armor: 0.20, maxhp: 200 }, unique: true },
    { id: 'fb_sanyan', name: '三焰扇',      rarity: 4, icon: '🪭', slot: 'talisman', req: 96, desc: '伤害 +34%，重击 +8%。七焰扇的仿品，三味真火轮着扇', effect: { dmg: 0.34, crit: 0.08 }, craftOnly: 'forge' },
    { id: 't_pojie',  name: '破界符',       rarity: 4, icon: '📜', slot: 'trinket', req: 112, desc: '移速 +18%，减伤 8%。玲珑留下的，撕开空间就走', effect: { spd: 0.18, armor: 0.08 }, unique: true }
  );

  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  // ========================= 四、配方 =========================
  window.RECIPES.push(
    { id: 'r_sanyan', kind: 'forge', name: '三焰扇', out: 'fb_sanyan', outN: 1, cost: 5200, req: 96, rate: 0.45,
      mats: [['m_huodan', 1], ['m_gangyin', 2], ['m_gengjing', 2], ['m_yusui', 5]],
      desc: '七焰扇的仿品。真品扇七味真火，这把只扇三味，也够烧穿元婴。' },
    { id: 'r_yuanying_kui', kind: 'forge', name: '元婴后期傀儡', out: 't_kui', outN: 1, cost: 6800, req: 102, rate: 0.35,
      mats: [['m_gangyin', 3], ['m_gengjing', 3], ['m_yanghun', 2], ['m_yaodan', 6]],
      desc: '大衍神君最后的遗作。傀儡成的那天，他连最后一点神念都用尽了。' }
  );

  // ========================= 五、灵宠 =========================
  // 都是原著里跟着韩立的：啼魂兽、六翼霜蚣、噬金虫、银月、元婴后期傀儡、冰凤
  window.PETS = [
    { id: 'p_tihun', icon: '🐾', name: '啼魂兽', spr: 'tihun', scale: 1.5, dmg: 0.5, rate: 1.0, cat: 'pet',
      desc: '阴冥之地捡的小兽，叫声能震散阴魂。', from: '阴冥之地' },
    { id: 'p_shijin', icon: '🐛', name: '噬金虫', spr: 'shijin', scale: 1.35, dmg: 0.42, rate: 0.8, cat: 'pet',
      desc: '一窝金虫，见石就啃。养到后来，连法宝都咬。', from: '海猿岛' },
    { id: 'p_liuyi', icon: '🦂', name: '六翼霜蚣', spr: 'liuyi', scale: 1.6, dmg: 0.62, rate: 1.1, cat: 'pet',
      desc: '背生六翼的霜蚣，飞过之处结霜。', from: '落云宗' },
    { id: 'p_yinyue', icon: '🌙', name: '银月', spr: 'yinyuepet', scale: 1.5, dmg: 0.7, rate: 0.9, cat: 'spirit',
      desc: '器灵之身。一只银白小狼，跟着他很多年。', from: '落云宗' },
    { id: 'p_kui', icon: '🤖', name: '元婴后期傀儡', spr: 'kui', scale: 1.7, dmg: 0.9, rate: 1.3, cat: 'puppet',
      desc: '大衍神君毕生心血。不会说话，只服从一个人。', from: '极西之地' },
    { id: 'p_bingfeng', icon: '🕊', name: '冰凤', spr: 'bingfeng', scale: 1.8, dmg: 1.0, rate: 1.2, cat: 'pet',
      desc: '十级冰凤，性子傲。肯跟着，是因为打不过。', from: '小极宫' }
  ];

  // ========================= 六、敌人 =========================
  Object.assign(window.ENEMY_TYPES, {
    guiwu:   { name: '阴雾鬼物', hp: 620, spd: 66, dmg: 40, r: 11, xp: 14, spr: 'guixiu',  drop: 0.09, tier: 0, mats: ['m_yanghun', 'm_xueyu'] },
    shixiao: { name: '尸魈',     hp: 700, spd: 58, dmg: 44, r: 12, xp: 15, spr: 'ghoul',    drop: 0.09, tier: 0, dash: true, mats: ['m_shihui', 'm_yusui'] },
    moxiu2:  { name: '魔道修士', hp: 760, spd: 62, dmg: 46, r: 11, xp: 16, spr: 'mo',       drop: 0.10, tier: 0, mats: ['m_xueyu', 'm_hantie'] },
    fashi:   { name: '慕兰法士', hp: 820, spd: 70, dmg: 50, r: 11, xp: 17, spr: 'neimen',   drop: 0.09, tier: 0, mats: ['m_yusui', 'm_xuantie'] },
    dajinxiu:{ name: '大晋修士', hp: 900, spd: 64, dmg: 52, r: 11, xp: 18, spr: 'linmo',    drop: 0.10, tier: 0, mats: ['m_xuantie', 'm_yusui'] },
    yaoshou2:{ name: '大晋妖兽', hp: 1000, spd: 60, dmg: 56, r: 13, xp: 20, spr: 'haishou', drop: 0.11, tier: 0, mats: ['m_yaodan', 'm_banyao'] },
    gui2:    { name: '古魔残躯', hp: 1200, spd: 54, dmg: 62, r: 14, xp: 24, spr: 'mo',       drop: 0.12, tier: 0, mats: ['m_xueyu', 'm_yanghun'] },
    kui2:    { name: '上古傀儡', hp: 1100, spd: 40, dmg: 58, r: 14, xp: 22, spr: 'kui',      drop: 0.12, tier: 0, mats: ['m_gangyin', 'm_xuantie'] },
    // 天南正道修士：落云宗 / 天阙堡 / 御灵宗 / 掩月宗 / 元武付家 等本土修士，
    // 与「慕兰法士」「大晋修士」区分开，免得天南地图冒出外域修士
    zhengdao:{ name: '正道修士', hp: 880, spd: 66, dmg: 48, r: 11, xp: 17, spr: 'neimen',   drop: 0.09, tier: 0, mats: ['m_yusui', 'm_xuantie'] }
  });

  // ========================= 七、洞府 =========================
  Object.assign(window.CAVES, {
    luoyun: {
      id: 'luoyun', name: '落云宗洞府', pos: '天南·云梦山 落云宗', from: 'jieying',
      desc: '云梦山半腰的一处灵脉，宗门分给长老的。石室五间，另有一眼灵泉终年不冻。',
      quote: '走了这么多年，总算有个能关门的地方。',
      capLevel: 98, restStone: 420, restXp: 0.22,
      crafts: ['alchemy', 'forge', 'talisman'],
      restTip: '云梦山灵脉甲于天南，坐一日抵得上别处十日。'
    },
    foxin: {
      id: 'foxin', name: '大晋·佛宗别院', pos: '大晋·南疆 佛宗', from: 'dajin',
      desc: '佛宗借他的一处别院，院里有口古井。井水镇煞，比什么灵药都管用。',
      quote: '煞气在身的时候，只有这里坐得住。',
      capLevel: 112, restStone: 560, restXp: 0.20,
      crafts: ['alchemy', 'forge', 'talisman'],
      restTip: '佛音入定，煞气不往上走。'
    },
    jiezi: {
      id: 'jiezi', name: '坠魔谷·芥子空间', pos: '天南·坠魔谷 内谷', from: 'jiezi',
      desc: '灵渺园改出来的芥子空间，一亩地，灵气温润得不像人界。药园里那株玄天仙藤还在长。',
      quote: '把一座园子收进袖里，天下就没有比这更静的地方。',
      capLevel: 140, restStone: 700, restXp: 0.18,
      crafts: ['alchemy', 'forge', 'talisman'],
      restTip: '芥子里的灵气温而不燥，坐多久都不伤本。'
    }
  });

  // ========================= 八、篇章 =========================
  window.MAP_ARCS.push(
    { id: 'F', name: '天南·落云', note: '重回故土，云梦山结婴' },
    { id: 'G', name: '大晋·昆吾', note: '通天灵宝，元婴纵横' },
    { id: 'H', name: '人界之巅', note: '化神飞升，去时无声' }
  );

})();

// ============================================================================
// 第五卷 · 名震一方（元婴初期）
// ============================================================================
(function () {
  // 补一件炼器产物（元婴后期傀儡，配方在上一段）
  window.ITEMS.push({ id: 't_kui', name: '元婴后期傀儡', rarity: 4, icon: '🤖', slot: 'trinket', req: 102, desc: '伤害 +28%，上限 +100，减伤 8%。大衍神君毕生心血，不会说话', effect: { dmg: 0.28, maxhp: 100, armor: 0.08 }, unique: true });
  // 阗天城交易会/晶龙阁拍卖上的两件：紫铖兜（防御）、北极元光指环（攻防一环）
  window.ITEMS.push(
    { id: 't_zicheng', name: '紫铖兜', rarity: 4, icon: '🟣', slot: 'trinket', req: 84, desc: '减伤 12%，上限 +70。元婴修士的旧物，兜面一层暗紫流光', effect: { armor: 0.12, maxhp: 70 }, unique: true },
    { id: 't_beiji',   name: '北极元光指环', rarity: 4, icon: '💍', slot: 'trinket', req: 84, desc: '伤害 +18%，拾取 +15%。指环里锁着一缕北极元光，攻防都补上一环', effect: { dmg: 0.18, pickup: 0.15 }, unique: true }
  );
  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  window.MAPS.push(
    {
      id: 'yinming', name: '阴冥之地', pos: '阴冥之地·鬼雾深处', arc: 'F',
      type: 'combat', tag: '战斗',
      desc: '百年一遇的绝灵之气把鬼雾撕开，人被吞了进去。落地那一刻，丹田是空的。',
      startLevel: 74, startSkills: { sword: 6, fire: 5, orb: 4, nova: 4, frost: 4 },
      unlock: 'waihai', next: 'bianhai',
      diff: 2.5, bossAt: 120,
      enemies: ['guiwu', 'guixiu', 'ghoul'],
      elites: ['阴雾鬼将', '六道随从'],
      mats: ['m_yanghun', 'm_xueyu', 'm_lingmo', 'm_fuzhi'],
      boss: { kind: 'mo', name: '六道传人', hp: 12000, spd: 62, dmg: 44, r: 20, spr: 'mo', scale: 5.2 },
      reward: { stones: 2200, pets: ['p_tihun'], mats: [['m_yanghun', 2], ['m_xueyu', 3]] },
      outro: 'yinming_out',
      clearTitle: '自阴冥之地出',
      clearDesc: '法力是空的，人是活的。那只小兽跟了一路，从鬼雾里也没跑。'
    },
    {
      id: 'bianhai', name: '无边海', pos: '天南外海·无边海', arc: 'F',
      type: 'story', tag: '剧情',
      desc: '鬼雾散尽，眼前是一望无际的黑水。往西走，就是天南。',
      startLevel: 74, startSkills: { sword: 6, fire: 5, orb: 4, nova: 4, frost: 4 },
      unlock: 'yinming', next: 'luoyun',
      reward: { stones: 600, mats: [['m_yaodan', 3]] },
      clearTitle: '天南在望',
      clearDesc: '海风是咸的，和越国的风一个味道。走了这么多年，绕了一大圈又回来了。'
    },
    {
      id: 'luoyun', name: '落云宗', pos: '天南·云梦山', arc: 'F',
      type: 'story', tag: '剧情',
      desc: '天南七派之一的落云宗。他压着修为报到，只求一处灵脉。',
      startLevel: 76, startSkills: { sword: 6, fire: 5, orb: 4, nova: 4, frost: 4 },
      unlock: 'bianhai', next: 'shixiao',
      reward: { stones: 800, mats: [['m_yusui', 4], ['m_lingmo', 4]] },
      clearTitle: '入落云宗',
      clearDesc: '宗门给他一处云梦山半腰的洞府。灵脉不错，比他想的还好。'
    },
    {
      id: 'shixiao', name: '尸魈之乱', pos: '天南·云梦山 后山', arc: 'F',
      type: 'combat', tag: '战斗',
      desc: '落云宗后山养着的东西跑了出来。宗门让新来的长老去收拾。',
      startLevel: 76, startSkills: { sword: 6, fire: 5, orb: 4, nova: 4, frost: 4 },
      unlock: 'luoyun', next: 'sanjian',
      diff: 2.45, bossAt: 110,
      enemies: ['shixiao', 'ghoul', 'guiwu'],
      elites: ['百年尸魈', '养尸人'],
      mats: ['m_shihui', 'm_xueyu', 'm_yusui'],
      boss: { kind: 'blood', name: '尸魈王', hp: 11000, spd: 56, dmg: 42, r: 20, spr: 'ghoul', scale: 5.0 },
      reward: { stones: 1400, mats: [['m_shihui', 4], ['m_yusui', 3]] },
      clearTitle: '后山已清',
      clearDesc: '尸魈的头割下来了。宗门里那几个老人看他的眼神，变了。'
    },
    {
      id: 'sanjian', name: '三派试剑', pos: '天南·云梦山 剑坪', arc: 'F',
      type: 'combat', tag: '战斗',
      desc: '落云宗、天阙堡、御灵宗三派试剑。他不想露头，可有人偏要点名。',
      startLevel: 78, startSkills: { sword: 6, fire: 5, orb: 4, nova: 4, frost: 4 },
      unlock: 'shixiao', next: 'yinyue',
      diff: 2.5, bossAt: 100,
      enemies: ['zhengdao', 'moxiu2', 'assassin'],
      elites: ['天阙堡剑修', '御灵宗控虫人'],
      mats: ['m_yusui', 'm_xuantie', 'm_lingmo'],
      boss: { kind: 'mo', name: '御灵宗·魏长峰', hp: 11500, spd: 64, dmg: 44, r: 19, spr: 'neimen', scale: 5.0 },
      reward: { stones: 1600, mats: [['m_yusui', 3], ['m_xuantie', 3]] },
      clearTitle: '试剑已毕',
      clearDesc: '三派的人都记住了这个名字。他本来不想被记住。'
    },
    {
      id: 'yinyue', name: '银月认主', pos: '天南·云梦山 洞府', arc: 'F',
      type: 'story', tag: '剧情',
      desc: '虚天鼎里那道银白的身影，在洞府里第一次开口。',
      startLevel: 78, startSkills: { sword: 6, fire: 5, orb: 4, nova: 4, frost: 4 },
      unlock: 'sanjian', next: 'jieying',
      reward: { stones: 400, pets: ['p_yinyue'], mats: [['m_yanghun', 1]] },
      clearTitle: '银月相随',
      clearDesc: '她说自己记不清从前的事。名字是随口起的，一叫就是很多年。'
    },
    {
      id: 'jieying', name: '云梦山·结婴', pos: '天南·云梦山 洞府', arc: 'F',
      type: 'story', tag: '剧情', cave: 'luoyun',
      desc: '灵脉、丹药、心境，三样都齐了。这一关过了，天南就再没人能随手捏死他。',
      startLevel: 80, endLevel: 82, startSkills: { sword: 6, fire: 5, orb: 4, nova: 4, frost: 4 },
      unlock: 'yinyue', next: 'jiaoyihui',
      reward: { stones: 1200, mats: [['m_yusui', 5], ['m_yanghun', 2]] },
      clearTitle: '元婴已成',
      clearDesc: '二百一十七岁，元婴成型。丹田里那个小小的人睁开眼，和他对视了一瞬。'
    },
    {
      id: 'jiaoyihui', name: '天南交易会', pos: '天南·阗天城', arc: 'F',
      type: 'market', tag: '坊市',
      desc: '天南各派三年一次的交易日。元婴修士有元婴修士的场子。',
      startLevel: 82, startSkills: { sword: 6, fire: 4, orb: 5, nova: 4, frost: 5 },
      unlock: 'jieying', next: 'cangkun',
      reward: { stones: 0 },
      clearTitle: '交易会一游',
      clearDesc: '庚精、赤精芝、上古傀儡术。天南的东西，比乱星海讲究。'
    },
    {
      id: 'cangkun', name: '苍坤上人洞府', pos: '天南·大草原 苍坤洞府', arc: 'F',
      type: 'combat', tag: '战斗',
      desc: '南陇侯邀他探一处上古洞府。破禁的活他来干，分东西的时候再看人心。',
      startLevel: 84, startSkills: { sword: 6, fire: 5, orb: 5, nova: 4, frost: 5 },
      unlock: 'jiaoyihui', next: 'yanyue',
      diff: 2.6, bossAt: 120,
      enemies: ['kui2', 'dajinxiu', 'ghoul'],
      elites: ['守洞傀儡', '禁制灵影'],
      mats: ['m_gengjing', 'm_yusui', 'm_xuantie', 'm_gangyin'],
      boss: { kind: 'mo', name: '苍坤洞府·禁制灵影', hp: 14000, spd: 58, dmg: 48, r: 20, spr: 'guixiu', scale: 5.2 },
      reward: { stones: 2400, mats: [['m_gengjing', 2], ['m_gangyin', 1]] },
      clearTitle: '洞府已破',
      clearDesc: '南陇侯分了他一半，心里不服，脸上不显。这一趟的账，往后还要算。'
    },
    {
      id: 'yanyue', name: '掩月宗', pos: '天南·掩月宗 山门', arc: 'F',
      type: 'combat', tag: '战斗',
      desc: '南宫婉被逼嫁给化意门长老。他化形入山，只带了一柄剑。',
      startLevel: 86, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'cangkun', next: 'huanglong',
      diff: 2.7, bossAt: 0, intro: 'yanyue', outro: 'yanyue_out',
      enemies: ['zhengdao', 'moxiu2', 'assassin'],
      elites: ['掩月宗执事', '化意门护卫'],
      mats: ['m_yusui', 'm_xuantie', 'm_hanhuo'],
      boss: { kind: 'mo', name: '掩月宗大长老', hp: 16000, spd: 60, dmg: 52, r: 21, spr: 'neimen', scale: 5.4 },
      reward: { stones: 3000, items: ['w_xuemo', 'a_xuemo', 't_yanghuan'], mats: [['m_yusui', 4]] },
      clearTitle: '人已带走',
      clearDesc: '血魔剑、阳环，连人一起带下山。掩月宗的账，往后慢慢算。'
    },
    {
      id: 'huanglong', name: '黄龙山大战', pos: '天南·黄龙山', arc: 'F',
      type: 'chase', tag: '追击',
      desc: '魔道六宗的仲神师亲至。这一仗打不得——他要做的，是活着退下去。',
      startLevel: 88, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'yanyue', next: 'bianjie',
      diff: 2.8, escapeAt: 95,
      enemies: ['moxiu2', 'gui2', 'fashi'],
      elites: ['魔道长老', '仲神师随侍'],
      mats: ['m_xueyu', 'm_hantie', 'm_yusui', 'm_lingmo'],
      reward: { stones: 2600, mats: [['m_xueyu', 4], ['m_hantie', 3]] },
      outro: 'huanglong_out',
      clearTitle: '全身而退',
      clearDesc: '从仲神师手里退下来，天南就传开了。有人说是运气，有人说是本事。'
    }
  );
})();

// ============================================================================
// 第五卷 · 剧情与场景
// ============================================================================
(function () {
  Object.assign(window.MAP_SCENERY, {
    yinming:   { bg: { base: '#252c28', a: '#2d3531', b: '#1c221f' }, decor: [['rock', 0.34], ['tuft', 0.06]] },
    bianhai:   { bg: { base: '#141d26', a: '#1a2632', b: '#0d151c' }, decor: [['rock', 0.24], ['tuft', 0.04]] },
    luoyun:    { bg: { base: '#28362f', a: '#314238', b: '#1f2a24' }, decor: [['tree', 0.20], ['rock', 0.20], ['tuft', 0.14]] },
    shixiao:   { bg: { base: '#2f2a26', a: '#3a332e', b: '#241f1c' }, decor: [['rock', 0.40], ['tuft', 0.05]] },
    sanjian:   { bg: { base: '#343a40', a: '#3d444b', b: '#282d33' }, decor: [['rock', 0.36], ['tuft', 0.05]] },
    yinyue:    { bg: { base: '#242a3a', a: '#2c3446', b: '#1a1f2c' }, decor: [['rock', 0.26], ['tuft', 0.06]] },
    jieying:   { bg: { base: '#3a3226', a: '#463c2d', b: '#2c261c' }, decor: [['rock', 0.28], ['tuft', 0.05]] },
    jiaoyihui: { bg: { base: '#3d352b', a: '#484032', b: '#2e281f' }, decor: [['rock', 0.22], ['tuft', 0.10]] },
    cangkun:   { bg: { base: '#3a3024', a: '#463a2b', b: '#2c241a' }, decor: [['rock', 0.40], ['tuft', 0.05]] },
    yanyue:    { bg: { base: '#2a2f3a', a: '#333a46', b: '#1e222b' }, decor: [['tree', 0.14], ['rock', 0.28], ['tuft', 0.08]] },
    huanglong: { bg: { base: '#33231f', a: '#3f2b26', b: '#261a17' }, decor: [['rock', 0.38], ['tuft', 0.04]] }
  });

  Object.assign(window.MAP_STORIES, {
    yinming_out: [
      ['旁白', '鬼雾散了。喘过气来的第一件事，是摸丹田——空的。'],
      ['韩立', '（百年一遇的绝灵之气。法力被抽干，一丝也不剩。）'],
      ['旁白', '紫灵和元瑶从雾里跌出来，一个比一个狼狈。三人谁也没说话。'],
      ['韩立', '（六道传人的尸身还热着。若不是这只小兽叫了一声，震散了他的魂，死的是我。）'],
      ['旁白', '那只小兽巴掌大，毛色灰白，凑过来嗅了嗅他的袖子，没走。'],
      ['韩立', '（啼魂兽。养着吧，眼下连只野狗都打不过。）']
    ],
    bianhai: [
      ['旁白', '风暴把三人送出了鬼雾，落在无边海上。水的颜色不对，是一整片的黑。'],
      ['元瑶', '这水……一直流到天南。'],
      ['韩立', '（天南。绕了这么一大圈，从越国到乱星海，又要回去了。）'],
      ['旁白', '他站在水面上，任海风把衣裳吹得贴在身上。'],
      ['韩立', '（修为没掉，只是法力散了。回去，重新攒。）'],
      ['韩立', '（越国那些年的事，也该收个尾了。）']
    ],
    luoyun: [
      ['旁白', '天南·云梦山。落云宗的山门比黄枫谷矮，气派却不小。'],
      ['旁白', '他压着修为报了名，只肯做一个客卿长老——要的是灵气，不是名分。'],
      ['执事', '道友这根基，不像散修。'],
      ['韩立', '（他不信，也没再问。天南这地方，不问来路的人活得最久。）'],
      ['旁白', '宗门分给他半山腰的洞府，五间石室，一眼不冻的灵泉。'],
      ['韩立', '（走了这么多年，总算有个能关门的地方。）'],
      ['韩立', '（二十年内结不了婴，这地方就白住了。）']
    ],
    shixiao: [
      ['旁白', '后山养尸的洞塌了。宗门里几十个弟子围在外头，没人敢进。'],
      ['韩立', '（养尸这种事，落云宗也做。天南七派，没一个干净。）'],
      ['旁白', '洞里的东西出来了——一身青灰，指甲有三寸长。'],
      ['韩立', '（尸魈。落了这么多年的养，快成气候了。）'],
      ['韩立', '（元婴之前，这种仗打得越多越好。）']
    ],
    sanjian: [
      ['旁白', '三派试剑，剑坪上站了三百多人。落云宗这边，他是新来的长老。'],
      ['御灵宗·魏长峰', '听说落云宗来了个来历不明的。今日点到为止，如何？'],
      ['韩立', '（名字是查过的，查不出东西。他要试，那就试。）'],
      ['韩立', '点到为止。'],
      ['旁白', '三剑过后，剑坪上静得能听见风。']
    ],
    yinyue: [
      ['旁白', '洞府里，虚天鼎放在石台上。鼎口那缕乾蓝的焰，今夜动了一下。'],
      ['旁白', '一道银白的身影从鼎里浮出来，停在半空。'],
      ['银月', '你身上有股味道。上古的。'],
      ['韩立', '（器灵。她在虚天殿里睁过一次眼，没出声。）'],
      ['韩立', '你叫什么？'],
      ['银月', '不记得了。'],
      ['旁白', '他想了想，抬头看了看窗外。'],
      ['韩立', '那就叫银月。'],
      ['银月', '……随你。']
    ],
    jieying: [
      ['旁白', '云梦山洞府，石门落下。灵脉从脚底往上顶，一层一层撞在丹田上。'],
      ['韩立', '（二百一十七岁。炼气那段日子像是上辈子的事。）'],
      ['旁白', '一年，三年，七年。丹田里那团灵气越转越急，最后缩成一个点。'],
      ['韩立', '（要成了。）'],
      ['旁白', '那一点炸开的时候，一个巴掌大的小人从里面坐了起来，睁眼看他。'],
      ['韩立', '（元婴。）'],
      ['韩立', '（从今日起，天南再没人能随手捏死我。）']
    ],
    yanyue: [
      ['旁白', '掩月宗山门。他没走正门，是化形混进去的。'],
      ['韩立', '（化意门的长老要娶她。掩月宗上下都当这是一桩好买卖。）'],
      ['旁白', '后山禁地里，一个女子坐在冰上，眉眼还是当年那个样子。'],
      ['南宫婉', '……你来做什么。'],
      ['韩立', '带你走。'],
      ['南宫婉', '掩月宗大长老在山上。'],
      ['韩立', '（我知道。所以先破他的阵，再说话。）']
    ],
    yanyue_out: [
      ['旁白', '大长老倒在阵眼上。血魔剑脱手，插进石缝。'],
      ['韩立', '（血魔剑、阳环。这一趟的东西，比人值钱。）'],
      ['南宫婉', '你惹了掩月宗，也惹了化意门。'],
      ['韩立', '（她说话还是这个口气。这么多年了。）'],
      ['韩立', '那就一起惹。'],
      ['旁白', '两人下山的时候，天已经亮了。掩月宗的钟声响了十七下。']
    ],
    huanglong_out: [
      ['旁白', '仲神师没有追。他站在黄龙山顶，看着那道遁光一路往南。'],
      ['韩立', '（元婴初期，从一个化神修士手里退下来。）'],
      ['韩立', '（不是打赢了，是活下来了。这就够了。）'],
      ['旁白', '这一战之后，天南的宗门再提起落云宗，语气都不一样了。'],
      ['韩立', '（名声这东西，能挡不少麻烦，也能招不少。）']
    ]
  });
})();

// ============================================================================
// 第六卷 · 通天灵宝（元婴中后期）
// ============================================================================
(function () {
  window.MAPS.push(
    {
      id: 'bianjie', name: '慕兰边界大战', pos: '天南·慕兰草原 边界', arc: 'G',
      type: 'boss', tag: '剧情战',
      desc: '慕兰法士倾族来攻。天南各派在边界立阵，赌战定输赢。',
      startLevel: 88, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'huanglong', next: 'yinluo',
      diff: 2.85, bossAt: 0, intro: 'bianjie', outro: 'bianjie_out',
      enemies: ['fashi', 'moxiu2', 'gui2'],
      elites: ['慕兰法士首领', '血罗罩阵眼'],
      mats: ['m_yusui', 'm_xuantie', 'm_gengjing', 'm_hanhuo'],
      boss: { kind: 'blood', name: '阴罗宗宗主夫人·陆夫人', hp: 18000, spd: 60, dmg: 56, r: 21, spr: 'nvxiu', scale: 5.4 },
      reward: { stones: 3600, mats: [['m_gengjing', 2], ['m_hanhuo', 1]] },
      clearTitle: '血罗罩已破',
      clearDesc: '元明灯到手，战局翻了。天南这边没人再把他当外人。'
    },
    {
      id: 'yinluo', name: '阴罗宗四长老', pos: '天南·落云宗 外山', arc: 'G',
      type: 'boss', tag: '剧情战',
      desc: '南宫婉被封魂咒，自封于冰中。下咒的人留了战书，等他赴约。',
      startLevel: 90, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'bianjie', next: 'jixi',
      diff: 2.9, bossAt: 0, intro: 'yinluo', outro: 'yinluo_out',
      enemies: ['gui2', 'moxiu2', 'dajinxiu'],
      elites: ['阴罗宗执事', '炼尸'],
      mats: ['m_xueyu', 'm_yanghun', 'm_gengjing'],
      boss: { kind: 'mo', name: '阴罗宗四长老', hp: 20000, spd: 62, dmg: 58, r: 21, spr: 'linmo', scale: 5.4 },
      reward: { stones: 3800, items: ['t_guiluo', 't_yinluo'], mats: [['m_yanghun', 3]] },
      clearTitle: '咒未解，仇先了',
      clearDesc: '鬼罗幡、阴罗蟠都到手了。可封魂咒的解药在大晋，不在天南。'
    },
    {
      id: 'jixi', name: '极西之地', pos: '极西之地·千竹教故地', arc: 'G',
      type: 'story', tag: '剧情',
      desc: '为《大衍诀》的后三层，他一路往西。千竹教的废墟里，有个东西等了一万年。',
      startLevel: 90, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'yinluo', next: 'zhuimo',
      reward: { stones: 2000, items: ['dayan2'], pets: ['p_kui'], mats: [['m_gangyin', 2], ['m_gengjing', 2]] },
      clearTitle: '后三层已得',
      clearDesc: '大衍神君把最后一点神念用完了。傀儡立在墙角，从此只听一个人的话。'
    },
    {
      id: 'zhuimo', name: '坠魔谷', pos: '天南·坠魔谷', arc: 'G',
      type: 'combat', tag: '战斗',
      desc: '天南第一凶地。灵烛果长在内谷，可谷里压着的东西，不止一颗果子。',
      startLevel: 90, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'jixi', next: 'lingmiao',
      diff: 2.95, bossAt: 130, intro: 'zhuimo', outro: 'zhuimo_out',
      enemies: ['yaoshou2', 'gui2', 'shixiao'],
      elites: ['血焰分魂', '古魔残躯'],
      mats: ['m_lingzhu', 'm_huodan', 'm_gangyin', 'm_gengjing'],
      boss: { kind: 'blood', name: '血焰主魂', hp: 24000, spd: 58, dmg: 62, r: 22, spr: 'mo', scale: 5.8 },
      reward: { stones: 4200, items: ['a_jiaolong'], mats: [['m_lingzhu', 1], ['m_huodan', 1], ['m_gangyin', 2]] },
      clearTitle: '灵烛果已摘',
      clearDesc: '果子摘到了，魔也放出来了。空间裂缝一开，人就被卷了进去。'
    },
    {
      id: 'lingmiao', name: '灵渺园', pos: '坠魔谷·灵渺园 芥子空间', arc: 'G',
      type: 'story', tag: '剧情',
      desc: '上古修士种灵草的园子，被空间裂缝封在里面。出不去，正好闭关。',
      startLevel: 90, endLevel: 92, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'zhuimo', next: 'mulan',
      reward: { stones: 2600, mats: [['m_lingzhu', 1], ['m_yusui', 6]] },
      clearTitle: '二十七年',
      clearDesc: '空间裂缝破开的那天，他已经元婴中期。外头的天南，等他去收场。'
    },
    {
      id: 'mulan', name: '慕兰草原', pos: '慕兰草原·去大晋的路上', arc: 'G',
      type: 'chase', tag: '追击',
      desc: '几个元婴法士围上来。这一仗赢不了，只能往大晋的方向跑。',
      startLevel: 92, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'lingmiao', next: 'dajin',
      diff: 3.0, escapeAt: 90,
      enemies: ['fashi', 'moxiu2', 'gui2'],
      elites: ['慕兰神师', '法士统领'],
      mats: ['m_xueyu', 'm_hanhuo', 'm_yusui'],
      reward: {
        stones: 1800, mats: [['m_xueyu', 3]],
        seal: { name: '五鬼锁魂', dmg: 0.45, hp: 0.45, note: '煞气封体，修为只剩四成' }
      },
      outro: 'mulan_out',
      clearTitle: '重伤脱身',
      clearDesc: '煞气压不住，自己把自己封了。修为只剩四成，命还在。'
    },
    {
      id: 'dajin', name: '大晋·佛宗', pos: '大晋·南疆 佛宗', arc: 'G',
      type: 'story', tag: '剧情', cave: 'foxin',
      desc: '大晋南疆一座佛宗别院。金刚舍利镇得住煞气，也镇得住他这口气。',
      startLevel: 88, startSkills: { sword: 6, fire: 4, orb: 5, nova: 4, frost: 5 },
      unlock: 'mulan', next: 'kunwu',
      reward: { stones: 2400, unseal: true, mats: [['m_jingang', 1], ['m_yusui', 5]] },
      clearTitle: '煞气已镇',
      clearDesc: '五鬼锁魂解了。修为回来的时候，比封之前还厚了一分。'
    },
    {
      id: 'kunwu', name: '昆吾山', pos: '大晋·昆吾山', arc: 'G',
      type: 'boss', tag: '剧情战',
      desc: '大晋第一名山。叶家开了封印，三十八个元婴进去，出来的没几个。',
      startLevel: 94, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'dajin', next: 'zhenmo',
      diff: 3.1, bossAt: 0, intro: 'kunwu', outro: 'kunwu_out',
      enemies: ['kui2', 'dajinxiu', 'gui2'],
      elites: ['昆吾四兽·木魁', '阴罗宗长老'],
      mats: ['m_gangyin', 'm_gengjing', 'm_xuanbing', 'm_yanghun'],
      boss: { kind: 'mo', name: '阴罗宗大长老·乾老魔', hp: 30000, spd: 60, dmg: 70, r: 22, spr: 'linmo', scale: 5.8 },
      reward: { stones: 5000, items: ['t_wuzi'], mats: [['m_gangyin', 3], ['m_gengjing', 3]] },
      clearTitle: '乾老魔已灭',
      clearDesc: '五子同心魔认了新主。封魂咒的解术，也从他脑子里搜出来了。'
    },
    {
      id: 'zhenmo', name: '镇魔塔', pos: '昆吾山·镇魔塔 第九层', arc: 'G',
      type: 'boss', tag: '剧情战',
      desc: '塔底下压着元刹圣祖的分魂。银月站在塔前，第一次不肯往前走。',
      startLevel: 96, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'kunwu', next: 'xiaoji',
      diff: 3.15, bossAt: 0, intro: 'zhenmo', outro: 'zhenmo_out',
      enemies: ['gui2', 'kui2', 'dajinxiu'],
      elites: ['叶家元婴', '元刹魔像'],
      mats: ['m_gangyin', 'm_yanghun', 'm_xuanbing'],
      boss: { kind: 'blood', name: '元刹圣祖分魂', hp: 34000, spd: 62, dmg: 76, r: 23, spr: 'guixiu', scale: 6.2 },
      reward: { stones: 6000, items: ['t_pojie'], mats: [['m_gangyin', 4], ['m_yanghun', 4]] },
      clearTitle: '塔已塌',
      clearDesc: '玲珑走了，逆星盘的光一闪就没了。破界符留在手里，沉甸甸的。'
    },
    {
      id: 'xiaoji', name: '小极宫', pos: '北夜·小极宫', arc: 'G',
      type: 'combat', tag: '战斗',
      desc: '北方冰原上的小极宫，和虚天殿是一脉。冰窟底下冻着万年玄冰。',
      startLevel: 98, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'zhenmo', next: 'xutian2',
      diff: 3.2, bossAt: 120, intro: 'xiaoji', outro: 'xiaoji_out',
      enemies: ['yaoshou2', 'kui2', 'dajinxiu'],
      elites: ['妖族先锋', '小极宫执事'],
      mats: ['m_xuanbing', 'm_hanhuo', 'm_gangyin', 'm_yusui'],
      boss: { kind: 'mo', name: '寒俪上人', hp: 32000, spd: 58, dmg: 72, r: 21, spr: 'neimen', scale: 5.6 },
      reward: { stones: 5200, pets: ['p_bingfeng'], mats: [['m_xuanbing', 3], ['m_hanhuo', 2]] },
      clearTitle: '冰凤相随',
      clearDesc: '小极宫塌了。冰凤跟出来的时候，回头看了一次，再没回头。'
    },
    {
      id: 'xutian2', name: '虚天殿·闭关', pos: '乱星海·虚天殿', arc: 'G',
      type: 'story', tag: '剧情',
      desc: '从虚天殿的传送阵进来，出去的路要八十年后才开。那就修八十年。',
      startLevel: 98, endLevel: 102, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'xiaoji', next: 'xinggong',
      reward: { stones: 4000, items: ['a_tiancan'], mats: [['m_gangyin', 4]] },
      clearTitle: '八十年',
      clearDesc: '三百六十岁，元婴后期。天南那三位大修士，如今要算上他了。'
    }
  );
})();

// ============================================================================
// 第六卷 · 剧情与场景
// ============================================================================
(function () {
  Object.assign(window.MAP_SCENERY, {
    bianjie: { bg: { base: '#3a2c24', a: '#45342b', b: '#2c211b' }, decor: [['rock', 0.34], ['tuft', 0.08]] },
    yinluo:  { bg: { base: '#2b2429', a: '#352c32', b: '#201a1e' }, decor: [['rock', 0.36], ['tuft', 0.05]] },
    jixi:    { bg: { base: '#332c22', a: '#3e3529', b: '#26201a' }, decor: [['rock', 0.42], ['tuft', 0.04]] },
    zhuimo:  { bg: { base: '#2e1f1c', a: '#3a2723', b: '#221614' }, decor: [['rock', 0.44], ['tuft', 0.03]] },
    lingmiao:{ bg: { base: '#2c3a2a', a: '#354632', b: '#212c20' }, decor: [['tree', 0.22], ['tuft', 0.24], ['rock', 0.10]] },
    mulan:   { bg: { base: '#33342a', a: '#3d3f32', b: '#26271f' }, decor: [['tuft', 0.28], ['rock', 0.18]] },
    dajin:   { bg: { base: '#33322c', a: '#3d3c35', b: '#262520' }, decor: [['tree', 0.18], ['rock', 0.22], ['tuft', 0.10]] },
    kunwu:   { bg: { base: '#2a2a3a', a: '#333347', b: '#1e1e2b' }, decor: [['rock', 0.46], ['tuft', 0.03]] },
    zhenmo:  { bg: { base: '#231c26', a: '#2c2231', b: '#18131c' }, decor: [['rock', 0.40], ['tuft', 0.02]] },
    xiaoji:  { bg: { base: '#2a3540', a: '#334150', b: '#1e2731' }, decor: [['rock', 0.30], ['tuft', 0.03]] },
    xutian2: { bg: { base: '#2a2434', a: '#342c42', b: '#201b29' }, decor: [['rock', 0.32], ['tuft', 0.04]] }
  });

  Object.assign(window.MAP_STORIES, {
    bianjie: [
      ['旁白', '慕兰边界。法士的旗子从草原那头一直插到山脚。'],
      ['旁白', '天南各派凑不出人，只能赌战——各出三人，三场定输赢。'],
      ['韩立', '（元婴初期的名头，这时候不是好事。）'],
      ['旁白', '赌斗的场子罩着一层血罗罩，进去的人自己出不来。'],
      ['韩立', '（血罗罩。慕兰人的东西，破不了就得死在里面。）']
    ],
    bianjie_out: [
      ['旁白', '血罗罩碎了。陆夫人的尸身落在草原上，元明灯滚出去三尺。'],
      ['韩立', '（阴罗宗宗主的夫人。这一刀下去，大晋那边就记上我了。）'],
      ['旁白', '天南的修士把元明灯捡起来，看他的眼神像看一尊神。'],
      ['韩立', '（灯可以卖。人情，卖不得。）'],
      ['韩立', '（南宫婉还在冰里封着。）']
    ],
    yinluo: [
      ['旁白', '落云宗外山。一个黑袍老者站在石上，手里拿着一卷战书。'],
      ['阴罗宗四长老', '封魂咒是我下的。你若解得了，我这条命给你。'],
      ['韩立', '（南宫婉自封在冰里，一百年。这笔账，我等不到一百年。）'],
      ['韩立', '书我接了。'],
      ['旁白', '老者的黑袍鼓起来，鬼气从袖口往外涌。']
    ],
    yinluo_out: [
      ['旁白', '四长老倒在自己的鬼气里。鬼罗幡、阴罗蟠，一起落在地上。'],
      ['韩立', '（幡下养着鬼，蟠上缠着魂。阴罗宗的东西，一件比一件脏。）'],
      ['韩立', '（咒解不了。他只是下咒的人，解咒的法门在大晋。）'],
      ['旁白', '他回头看了一眼落云宗的方向。冰里的那个人，还要再等几年。'],
      ['韩立', '（大晋。）']
    ],
    jixi: [
      ['旁白', '极西之地。风里全是沙，走了三个月才看见千竹教的废墟。'],
      ['旁白', '一具通灵傀儡坐在殿中，眼睛的位置亮着两点幽光。'],
      ['大衍神君', '一个元婴小辈，敢闯到这里。'],
      ['韩立', '（大衍神君。《大衍诀》前四层在我身上，他一定看得出来。）'],
      ['大衍神君', '前四层。你练到第几层了？'],
      ['韩立', '第四层。'],
      ['大衍神君', '……你这身子骨，倒比我想的结实。'],
      ['旁白', '一具傀儡从殿后走出来，停在他面前，低下了头。'],
      ['大衍神君', '后三层给你。它也跟着你。'],
      ['韩立', '（一万年。他把最后一点神念，全填在这具傀儡里了。）']
    ],
    zhuimo: [
      ['旁白', '坠魔谷。血雾从谷口往外流，像一条活的河。'],
      ['韩立', '（灵烛果在内谷。南陇侯他们往另一边去了，说好半个时辰会合。）'],
      ['旁白', '半个时辰之后，谷里传来一声闷响。'],
      ['韩立', '（封印破了。）'],
      ['旁白', '血雾翻上来，一道人影在雾里成形，比他见过的任何东西都高。'],
      ['韩立', '（血焰主魂。古魔的分魂。）'],
      ['韩立', '（这东西不是我这个境界能打的。可它挡在出去的路上。）']
    ],
    zhuimo_out: [
      ['旁白', '血焰主魂退了，可空间也被撕开了一道口子。'],
      ['韩立', '（吸力太大，退不开。）'],
      ['旁白', '白光一闪，人没了。谷口只剩一柄插在石缝里的剑。'],
      ['韩立', '（这是什么地方……灵草，一望无际的灵草。）'],
      ['韩立', '（出不去了。那就修。）']
    ],
    lingmiao: [
      ['旁白', '灵渺园。上古修士种灵草的园子，被空间裂缝封在这里不知多少年。'],
      ['韩立', '（灵气比外头浓三倍。这地方，是关人的牢，也是最好的洞府。）'],
      ['旁白', '他盘膝坐下。第一年，第三年，第十年。'],
      ['韩立', '（元婴中期。再往上，得等裂缝自己松。）'],
      ['旁白', '第二十七年，那道裂缝终于裂开了一线。'],
      ['韩立', '（天南那边，血焰分魂还在。该回去了。）']
    ],
    mulan_out: [
      ['旁白', '慕兰草原。几个法士把他围在中间，一记闷雷砸在背上。'],
      ['韩立', '（骨头断了三根。煞气顺着伤往里钻。）'],
      ['旁白', '他咬破舌尖，把五鬼锁魂的符按在自己丹田上。'],
      ['韩立', '（封了修为，煞气就上不去。四成修为，够跑到大晋。）'],
      ['旁白', '一道血光往东去了。追的人在后面骂了一句听不懂的话。'],
      ['韩立', '（活着就好。修为，还能修回来。）']
    ],
    dajin: [
      ['旁白', '大晋南疆，一座不出名的佛宗别院。他在门口坐了三天，才有人来开门。'],
      ['旁白', '老僧看了他一眼，什么也没问，把他让进了后院。'],
      ['老僧', '施主身上的东西，比寺里所有的经都重。'],
      ['韩立', '（煞气在经脉里走。五鬼锁魂封得住一时，封不住十年。）'],
      ['旁白', '一颗金刚舍利放在他手里，凉得像水。'],
      ['韩立', '（佛门心法镇煞。这一关，绕了这么远才找到门。）'],
      ['韩立', '（解了。修为回来了，还厚了一分。）']
    ],
    kunwu: [
      ['旁白', '昆吾山。叶家开了封印，山门一开，三十八个元婴往里走。'],
      ['韩立', '（阴芝马没找到，倒被卷进这里。这山的味道，和坠魔谷一样。）'],
      ['旁白', '山腹里到处是禁制。北极元光的磁力把人的法宝一件件吸走。'],
      ['韩立', '（两仪环。阳环压得住这东西。）'],
      ['旁白', '深处传来一声闷响。有人先动了手。'],
      ['韩立', '（乾老魔。阴罗宗大长老，元婴后期。）'],
      ['韩立', '（打不过他。可这山里的禁制，不是他的。）']
    ],
    kunwu_out: [
      ['旁白', '乾老魔的元婴从躯壳里逃出来，撞在北极元光上，散成了五道。'],
      ['韩立', '（五子同心魔。五个元婴级的魔头，认了新主。）'],
      ['旁白', '搜魂之后，地上多了一段记忆。封魂咒的解术，写在一张残页上。'],
      ['韩立', '（南宫婉有救了。）'],
      ['韩立', '（塔里还有东西。银月刚才一直在看那个方向。）']
    ],
    zhenmo: [
      ['旁白', '镇魔塔第九层。祭坛上封着一团黑气，黑气里有个人形。'],
      ['银月', '……我想起来了。'],
      ['韩立', '（她的手在抖。器灵没有实体，可她在抖。）'],
      ['银月', '那是我。塔底下那个，是我。'],
      ['旁白', '祭坛裂开。一双眼睛在黑暗里睁开，看的是银月。'],
      ['元刹圣祖分魂', '玲珑。你终于回来了。'],
      ['韩立', '（玲珑。银月狼族的第一公主。）'],
      ['韩立', '（她要走。）']
    ],
    zhenmo_out: [
      ['旁白', '元刹分魂灭了。玲珑重夺肉身，站在祭坛上，衣裳是银白的。'],
      ['玲珑', '我得回去了。灵界那边，还有人在等我。'],
      ['韩立', '（她不是银月了。银月是我想出来的名字。）'],
      ['玲珑', '空间节点的位置给你。破界符也给你。'],
      ['玲珑', '飞升的时候，用得上。'],
      ['旁白', '逆星盘的光一闪。塔里只剩他一个人，和一地碎石。'],
      ['韩立', '（走了。）']
    ],
    xiaoji: [
      ['旁白', '北夜冰原。小极宫建在冰窟上头，宫门冻得发青。'],
      ['韩立', '（和虚天殿一脉的东西。冰魄仙子留在这里的，不止一处。）'],
      ['旁白', '冰窟底下，一口复制品的虚天鼎压着，鼎边是一缕乾蓝的焰。'],
      ['韩立', '（乾蓝冰焰。真品在我手里，这缕是仿的。）'],
      ['旁白', '妖族在攻山。小极宫的大长老在阵眼里，眼睛盯着他袖口。'],
      ['寒俪上人', '道友袖里那口鼎，借我一用。'],
      ['韩立', '（借。这字在修仙界，从来不还。）']
    ],
    xiaoji_out: [
      ['旁白', '小极宫塌了半边。冰窟裂开，一头十级冰凤从里头冲出来。'],
      ['旁白', '它在半空转了一圈，落在他面前，低下头。'],
      ['韩立', '（打不过，才肯跟着。这道理，妖和人都一样。）'],
      ['韩立', '（传送阵还在。通往虚天殿。）'],
      ['韩立', '（八十年。出去的时候，该是元婴后期了。）']
    ],
    xutian2: [
      ['旁白', '虚天殿。殿门在身后合上，下一次开要八十年后。'],
      ['韩立', '（八十年。正好。）'],
      ['旁白', '头十年补根基，中间三十年磨剑阵，后四十年冲后期。'],
      ['韩立', '（大庚剑阵成了。青竹蜂云剑七十二口，一口一雷。）'],
      ['旁白', '第八十年，殿门开了一线。'],
      ['韩立', '（元婴后期。三百六十岁。）'],
      ['韩立', '（乱星海那边，还有笔账没算。）']
    ]
  });
})();

// ============================================================================
// 第七卷 · 纵横人界（元婴后期 → 化神）
// ============================================================================
(function () {
  window.MAPS.push(
    {
      id: 'xinggong', name: '乱星海·星宫', pos: '乱星海·天星城 星宫', arc: 'H',
      type: 'story', tag: '剧情',
      desc: '天星双圣开价：三次出手，换一套功法。他答应了。',
      startLevel: 102, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'xutian2', next: 'kunpeng',
      reward: { stones: 5000, mats: [['m_gengjing', 3], ['m_gangyin', 3]] },
      clearTitle: '三次出手',
      clearDesc: '元磁神光的修炼法门到手。星宫欠他三条命，这买卖不算亏。'
    },
    {
      id: 'kunpeng', name: '鲲鹏之战', pos: '乱星海·外海', arc: 'H',
      type: 'story', tag: '剧情',
      desc: '罗睺与游天鲲鹏在外海打了一场。打完了，海上落了一根羽毛。',
      startLevel: 104, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'xinggong', next: 'luoyun2',
      reward: { stones: 3000, mats: [['m_kunpeng', 1], ['m_yaodan', 6]] },
      clearTitle: '一根羽毛',
      clearDesc: '游天鲲鹏落下的那根。炼化了它，遁速能再快一倍。'
    },
    {
      id: 'luoyun2', name: '落云宗立威', pos: '天南·云梦山 落云宗', arc: 'H',
      type: 'boss', tag: '剧情战',
      desc: '天南两个元婴后期联手压落云宗。他回来了，只站了一场。',
      startLevel: 106, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'kunpeng', next: 'tianlan',
      diff: 3.3, bossAt: 0, intro: 'luoyun2', outro: 'luoyun2_out',
      enemies: ['zhengdao', 'moxiu2', 'kui2'],
      elites: ['天南大修士护卫', '元婴后期修士'],
      mats: ['m_gengjing', 'm_gangyin', 'm_yusui'],
      boss: { kind: 'mo', name: '天南二修·合击', hp: 40000, spd: 62, dmg: 84, r: 22, spr: 'neimen', scale: 5.8 },
      reward: { stones: 7000, mats: [['m_gengjing', 4], ['m_gangyin', 4]] },
      clearTitle: '落云宗立住了',
      clearDesc: '两个元婴后期，一个走了，一个留了。落云宗从此是天南第一门。'
    },
    {
      id: 'tianlan', name: '天澜圣兽·雷劫', pos: '天澜草原·圣山', arc: 'H',
      type: 'story', tag: '剧情',
      desc: '天澜圣兽渡化形雷劫。它求了一个人替它挡三道雷。',
      startLevel: 108, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'luoyun2', next: 'liudao',
      reward: { stones: 4000, mats: [['m_hanhuo', 2], ['m_gangyin', 2]] },
      clearTitle: '三道雷',
      clearDesc: '雷劈完了，圣兽化形。草原上多了一个盟友，也多了一条去大晋的路。'
    },
    {
      id: 'liudao', name: '乱星海·斩六道', pos: '乱星海·天星城', arc: 'H',
      type: 'boss', tag: '剧情战',
      desc: '六道夺了万天明的肉身，占了星宫。天星双圣的最后一次出手，用在这里。',
      startLevel: 110, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'tianlan', next: 'jiezi',
      diff: 3.4, bossAt: 0, intro: 'liudao', outro: 'liudao_out',
      enemies: ['gui2', 'kui2', 'dajinxiu'],
      elites: ['六道分身', '星宫叛修'],
      mats: ['m_gangyin', 'm_gengjing', 'm_yanghun'],
      boss: { kind: 'mo', name: '六道·万天明之身', hp: 46000, spd: 64, dmg: 92, r: 23, spr: 'mo', scale: 6.0 },
      reward: { stones: 8000, mats: [['m_gangyin', 5], ['m_gengjing', 5]] },
      clearTitle: '六道已斩',
      clearDesc: '星宫的账清了。紫灵那边，也该有个说法了。'
    },
    {
      id: 'jiezi', name: '坠魔谷·芥子空间', pos: '天南·坠魔谷 内谷', arc: 'H',
      type: 'story', tag: '剧情', cave: 'jiezi',
      desc: '把灵渺园炼成芥子空间。石门一落，外头就是三百年。',
      startLevel: 106, endLevel: 112, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'liudao', next: 'feisheng',
      reward: { stones: 6000, items: ['yuanci', 'moyuan', 't_yuanci', 'jipin'], mats: [['m_hanhuo', 2]] },
      clearTitle: '化神',
      clearDesc: '八百八十五岁。魔元丹、极品灵石、五色寒焰，三样齐了；芥子空间里那座元磁山，也一并炼化入体。这一关过去了。'
    },
    {
      id: 'feisheng', name: '五龙海·飞升', pos: '五龙海·空间节点', arc: 'H',
      type: 'story', tag: '剧情',
      desc: '银月留下的空间节点在五龙海。人界的事都了了，该走了。',
      startLevel: 126, endLevel: 132, startSkills: { sword: 6, fire: 5, orb: 5, nova: 5, frost: 5 },
      unlock: 'jiezi', next: null,
      reward: { stones: 12000, mats: [['m_kunpeng', 1]] },
      clearTitle: '人界已远',
      clearDesc: '一道白光冲天而起。人界再没有韩立这个人，灵界多了一个青冥卫。'
    },

    // ---------------- 支线 ----------------
    {
      id: 'fujia', side: true, sorder: 11, name: '元武国·付家', pos: '元武国·付家堡',
      type: 'combat', tag: '支线', unlockBy: 'e_fujia', arc: 'F',
      desc: '辛如音临终托付的那件事。付家的嫡系，一个不留。',
      startLevel: 84, startSkills: { sword: 6, fire: 5, orb: 4, nova: 4, frost: 5 },
      unlock: null, next: null,
      diff: 2.65, bossAt: 110,
      enemies: ['zhengdao', 'moxiu2', 'kui'],
      elites: ['付家供奉', '付家嫡系'],
      mats: ['m_xuantie', 'm_gengjing', 'm_yusui'],
      boss: { kind: 'mo', name: '付家家主', hp: 15000, spd: 60, dmg: 50, r: 20, spr: 'neimen', scale: 5.2 },
      reward: { stones: 2600, pets: ['p_liuyi'], mats: [['m_gengjing', 2], ['m_yusui', 4]] },
      outro: 'fujia_out',
      clearTitle: '旧诺已了',
      clearDesc: '付家灭了。辛如音的骨灰埋在堡后的梅树下，算是还了。'
    },
    {
      id: 'huixiang', side: true, sorder: 12, name: '越国·韩家村', pos: '越国·镜州 山边小村',
      type: 'story', tag: '支线', unlockBy: 'e_huixiang', arc: 'F',
      desc: '走了这么多年，村口那棵老树还在。',
      startLevel: 82, startSkills: { sword: 6, fire: 4, orb: 4, nova: 4, frost: 4 },
      unlock: null, next: null,
      reward: { stones: 800, mats: [['m_yusui', 3]] },
      clearTitle: '尘缘已了',
      clearDesc: '父母坟上添了新土。韩家如今是越国的望族，没人认得他。'
    },
    {
      id: 'zijian', side: true, sorder: 13, name: '乱星海·紫灵', pos: '乱星海·妙音门旧地',
      type: 'story', tag: '支线', unlockBy: 'e_zijian', arc: 'H',
      desc: '妙音门早散了。紫灵被星宫扣着，赎她的价钱是一枚妖丹。',
      startLevel: 92, startSkills: { sword: 6, fire: 5, orb: 5, nova: 4, frost: 5 },
      unlock: null, next: null,
      reward: { stones: 3000, mats: [['m_yaodan', 5], ['m_gangyin', 2]] },
      clearTitle: '旧人已去',
      clearDesc: '她走了，去魔界找自己的路。这一别，是很多年以后才再见。'
    }
  );
})();

// ============================================================================
// 第七卷 · 剧情、际遇与收尾
// ============================================================================
(function () {
  Object.assign(window.MAP_SCENERY, {
    xinggong: { bg: { base: '#33302a', a: '#3d3932', b: '#262420' }, decor: [['rock', 0.24], ['tuft', 0.08]] },
    kunpeng:  { bg: { base: '#131d28', a: '#192634', b: '#0c141c' }, decor: [['rock', 0.22], ['tuft', 0.03]] },
    luoyun2:  { bg: { base: '#28362f', a: '#314238', b: '#1f2a24' }, decor: [['tree', 0.20], ['rock', 0.20], ['tuft', 0.14]] },
    tianlan:  { bg: { base: '#333a2c', a: '#3d4634', b: '#262c20' }, decor: [['tuft', 0.30], ['rock', 0.16]] },
    liudao:   { bg: { base: '#2b2330', a: '#342b3a', b: '#1f1a24' }, decor: [['rock', 0.38], ['tuft', 0.04]] },
    jiezi:    { bg: { base: '#2c3a2a', a: '#354632', b: '#212c20' }, decor: [['tree', 0.24], ['tuft', 0.26], ['rock', 0.10]] },
    feisheng: { bg: { base: '#1c2438', a: '#242e46', b: '#141a28' }, decor: [['rock', 0.18], ['tuft', 0.04]] },
    fujia:    { bg: { base: '#34302a', a: '#3e3932', b: '#27241f' }, decor: [['tree', 0.20], ['rock', 0.26], ['tuft', 0.10]] },
    huixiang: { bg: { base: '#2f3a2b', a: '#374433', b: '#263023' }, decor: [['tree', 0.30], ['tuft', 0.20], ['rock', 0.06]] },
    zijian:   { bg: { base: '#2a3038', a: '#333a44', b: '#1f242a' }, decor: [['rock', 0.24], ['tuft', 0.10]] }
  });

  Object.assign(window.MAP_STORIES, {
    xinggong: [
      ['旁白', '星宫。天星双圣坐在上头，中间隔着一层看不穿的纱。'],
      ['星宫双圣', '道友要元磁神光的法门。我们给。'],
      ['韩立', '（世上没有白给的东西。）'],
      ['星宫双圣', '换三次出手。什么时候用，我们说了算。'],
      ['韩立', '（三次。星宫要的是刀，不是客。）'],
      ['韩立', '成交。']
    ],
    kunpeng: [
      ['旁白', '外海。天是黑的，云压得很低，海面上有两道影子在打。'],
      ['韩立', '（罗睺。游天鲲鹏。这两头东西打起来，半个乱星海都要翻。）'],
      ['旁白', '一道白光从天上落下来，扎进海里，溅起的水有三丈高。'],
      ['韩立', '（一根羽毛。鲲鹏的。）'],
      ['韩立', '（这东西，炼化了能换一条命。）']
    ],
    luoyun2: [
      ['旁白', '落云宗山门。两个元婴后期站在云台上，身后是十几个宗门的人。'],
      ['天南修士', '落云宗占了云梦山这么多年，也该让让了。'],
      ['韩立', '（一个守，一个攻。配合得挺熟。）'],
      ['韩立', '（他们两个加起来，不如我一个。）'],
      ['旁白', '云台上的风停了。']
    ],
    luoyun2_out: [
      ['旁白', '一个走了。另一个站着，站了很久，最后拱手。'],
      ['韩立', '（天南第一门。这个名头，落云宗担得起。）'],
      ['韩立', '（南宫婉该出来了。）'],
      ['旁白', '冰里的那个人睁开眼的时候，外头已经过了快一百年。'],
      ['南宫婉', '……你又老了。'],
      ['韩立', '（修仙的人，老得很慢。）']
    ],
    tianlan: [
      ['旁白', '天澜圣山。云层里滚着雷，一道比一道粗。'],
      ['天澜圣兽', '三道。替我挡三道，我化形之后就跟你。'],
      ['韩立', '（化形雷劫。这东西我挡得住，但不好受。）'],
      ['韩立', '站到我后面去。'],
      ['旁白', '第一道雷落下来，山石碎了一半。第二道，第三道。'],
      ['韩立', '（骨头又断了两根。值。）']
    ],
    liudao: [
      ['旁白', '天星城。城墙塌了一段，星宫的旗子倒着插在瓦砾里。'],
      ['旁白', '一个人站在城门上，穿的是万天明的衣裳，脸不是万天明的脸。'],
      ['六道', '第三次出手，用在我身上？'],
      ['韩立', '（六道。夺舍了万天明，修为比我高一线。）'],
      ['韩立', '（高一线，也是高。）'],
      ['旁白', '城门口的地砖，一块一块浮了起来。']
    ],
    liudao_out: [
      ['旁白', '六道倒了。万天明的身子终于安静下来，脸也慢慢变回原来的样子。'],
      ['韩立', '（星宫的账清了。三次出手，一次不剩。）'],
      ['旁白', '天星城的一条巷子里，一个女人站在屋檐下，看着他。'],
      ['紫灵', '这么多年，你还是这个样子。'],
      ['韩立', '（她老了些。凡人的老法。）'],
      ['韩立', '（妙音门散了。她一个人撑了这么久。）']
    ],
    jiezi: [
      ['旁白', '坠魔谷内谷。灵渺园被炼成了一方芥子，收在他袖里。'],
      ['韩立', '（魔元丹、极品灵石、五色寒焰。三样都齐了。）'],
      ['旁白', '石门落下。这一次闭关，是三百年。'],
      ['韩立', '（元磁神光要修到大成，得把整座元磁山炼化。）'],
      ['旁白', '一百年，两百年。山从外头被收进体内，人也从里头换了一层。'],
      ['韩立', '（八百八十五岁。）'],
      ['旁白', '那一天，丹田里的元婴站了起来，睁开眼，抬手推开了石门。'],
      ['韩立', '（化神。）'],
      ['韩立', '（人界到这儿，就没有更高的地方了。）']
    ],
    feisheng: [
      ['旁白', '五龙海。海面上一座古阵，阵眼对着天。'],
      ['韩立', '（银月留下的空间节点。从这里走，能偷渡到灵界。）'],
      ['旁白', '他把该留的东西留下，该带走的东西带走。'],
      ['韩立', '（落云宗、南宫婉、紫灵、银月、大衍神君……）'],
      ['韩立', '（都了了。）'],
      ['旁白', '阵纹亮起。一道白光冲天而起，海面上什么都没剩下。'],
      ['韩立', '（我叫韩立。从一个连饭都吃不饱的村子里出来的。）'],
      ['韩立', '（这一走，就再没回来过。）']
    ],
    fujia_out: [
      ['旁白', '付家堡烧了三天。嫡系的尸身摆在院子里，一个没少。'],
      ['韩立', '（辛如音。你托我的事，办到了。）'],
      ['旁白', '堡后那株梅树底下，他把骨灰坛放进去，培上新土。'],
      ['韩立', '（当年修那座古阵，你把命填进去了。我欠你一条命。）'],
      ['韩立', '（今日还了。）']
    ]
  });

  // ---------------- 际遇 ----------------
  window.ENCOUNTERS.push(
    {
      id: 'e_fujia', map: 'sanjian', name: '辛如音的旧识', spr: 'nvxiu', scale: 1.8,
      cond: { level: 80, cleared: ['jieying'] },
      lines: [
        ['旁白', '剑坪外头的茶棚里，一个女修站起来，看了他很久才敢认。'],
        ['旧识', '你是……韩立？辛师姐提过你。'],
        ['韩立', '（辛如音。修古传送阵那个。她早就不在了。）'],
        ['旧识', '她临终前留了话。付家的事，她到死都没放下。'],
        ['韩立', '（当年她把命填进那座阵里。我欠她的。）'],
        ['韩立', '付家在哪。']
      ],
      unlock: 'fujia',
      reward: { stones: 200 }
    },
    {
      id: 'e_huixiang', map: 'sanjian', name: '越国来的散修', spr: 'rogue', scale: 1.8,
      cond: { level: 82, cleared: ['jieying'] },
      lines: [
        ['旁白', '一个从越国来的散修，说起镜州出了个韩家，如今是当地的望族。'],
        ['散修', '韩家？听说祖上出过一个修仙的，再没回来过。'],
        ['韩立', '（韩家。我家。）'],
        ['韩立', '（父母走的时候，我没在。）'],
        ['韩立', '（该回去一趟了。）']
      ],
      unlock: 'huixiang',
      reward: { stones: 0 }
    },
    {
      id: 'e_zijian', map: 'zhuimo', name: '妙音门 紫灵', spr: 'nvxiu', scale: 1.8,
      cond: { level: 90, cleared: ['jixi'] },
      lines: [
        ['旁白', '坠魔谷外的石亭里，一个女修在等。纱帘后头的眼睛，还是那么静。'],
        ['紫灵', '灵烛果的事，我出消息，你出手。'],
        ['韩立', '（紫灵。妙音门如今全靠她一个人撑着。）'],
        ['韩立', '分我几成？'],
        ['紫灵', '果子归你，谷里的东西归我。'],
        ['韩立', '（她开价一向公道。公道到让人不敢信。）'],
        ['韩立', '成交。']
      ],
      unlock: 'zijian',
      reward: { stones: 300 }
    }
  );
})();

// ============================================================================
// 收尾：把场景底色挂到地图上，重算主线数
// ============================================================================
(function () {
  for (const m of window.MAPS) {
    const sc = window.MAP_SCENERY[m.id];
    if (sc) { m.bg = sc.bg; m.decorScheme = sc.decor; }
    if (!m.arc) m.arc = m.side ? 'X' : 'B';
  }
  window.MAIN_MAP_COUNT = window.MAPS.filter(m => !m.side).length;
  window.SIDE_MAP_COUNT = window.MAPS.filter(m => m.side).length;
})();

// ============================================================================
// 支线剧情（回乡 / 紫灵）
// ============================================================================
(function () {
  Object.assign(window.MAP_STORIES, {
    huixiang: [
      ['旁白', '越国·镜州。青牛山下的村子，比记忆里小了一圈。'],
      ['韩立', '（村口那棵老树还在。树底下那块石头，是我小时候坐过的。）'],
      ['旁白', '祠堂里挂着两块牌位。坟头的草，被人割过。'],
      ['韩立', '（父母走的时候，我在乱星海。那时候连一封信都送不回来。）'],
      ['旁白', '他把灵石交给村里管事的，只说是门里发的赏。'],
      ['韩立', '（韩家如今是这一带的望族。没人认得我。）'],
      ['韩立', '（不认得，也好。）']
    ],
    zijian: [
      ['旁白', '乱星海。妙音门的旧地现在是一片荒滩，只剩几根烧黑的门柱。'],
      ['旁白', '紫灵站在滩上，衣裳旧了，人还是那个样子。'],
      ['紫灵', '星宫扣了我三十年。说是保护，其实是拿我当筹码。'],
      ['韩立', '（她撑了这么多年，一句话都没求过。）'],
      ['紫灵', '如今六道死了，星宫也不行了。我该走了。'],
      ['韩立', '去哪。'],
      ['紫灵', '魔界。有些路，只能自己走。'],
      ['旁白', '她把一枚玉简放在他手里，转身走进浪里。'],
      ['韩立', '（很多年以后，还会再见。）']
    ]
  });
})();

// ============================================================================
// 功法秘籍：没学过的，可以买来学（学会了才谈得上装配）
// ============================================================================
(function () {
  window.ITEMS.push(
    { id: 'sk_swift',  name: '罗烟步·法诀', rarity: 1, icon: '📕', req: 1,  teach: 'swift',  desc: '习得《罗烟步》第一层。血色禁地所得身法真传，步法如烟，移速大增。' },
    { id: 'sk_fire',   name: '火弹术·法诀', rarity: 2, icon: '📕', req: 5,  teach: 'fire',   desc: '习得《火弹术》第一层。韩立早年期自炼符箓，放出追踪火蛇。' },
    { id: 'sk_orb',    name: '金光罩·法诀', rarity: 2, icon: '📕', req: 8, teach: 'orb',   desc: '习得《金光罩》第一层。庚金玄罡环绕周身，触敌即伤。' },
    { id: 'sk_regen',  name: '长春续脉术·法诀', rarity: 2, icon: '📕', req: 10, teach: 'regen',  desc: '习得《长春续脉术》第一层。韩立借灵药丹力缓缓回血。' },
    { id: 'sk_nova',   name: '定神符·法诀', rarity: 3, icon: '📕', req: 12, teach: 'nova',   desc: '习得《定神符》第一层。韩立常用的金光类符箓，周期性金光爆发。' },
    { id: 'sk_haste',  name: '雷遁术·法诀', rarity: 3, icon: '📕', req: 15, teach: 'haste',  desc: '习得《雷遁术》第一层。吐纳如雷，出手更急。' },
    { id: 'sk_frost',  name: '冰冻术·法诀', rarity: 3, icon: '📕', req: 20, teach: 'frost',  desc: '习得《冰冻术》第一层。韩立参悟的冰霜符箓，减速近身之敌。' },
    { id: 'sk_gourd',  name: '灵葫诀·炼法', rarity: 3, icon: '📕', req: 25, teach: 'gourd', desc: '习得《灵葫诀》第一层。本命灵葫在身，生命上限提升。' },
    // ---- 按原著补的各境界功法：买到或搜出来，回去逐个学 ----
    { id: 'sk_changchun', name: '长春功·法诀',     rarity: 2, icon: '📕', req: 1,   teach: 'changchun', desc: '习得《长春功》。墨大夫传授的引气吐纳根基，韩立炼气期的根本功法' },
    { id: 'sk_sanyan',    name: '三焰扇·扇法',     rarity: 4, icon: '📕', req: 82,  teach: 'sanyan',    desc: '习得《三焰扇》。仿七焰扇而制，大衍神君改制三十一种材料，韩立元婴后期才炼成' },
    { id: 'sk_jianfen',   name: '剑影分光术·法诀', rarity: 4, icon: '📕', req: 56,  teach: 'jianfen', desc: '习得《剑影分光术》。青元剑诀第三层神通，一剑化数影' },
    { id: 'sk_shayao',    name: '煞妖诀·法诀',     rarity: 4, icon: '📕', req: 56,  teach: 'shayao',  desc: '习得《煞妖诀》。玄阴经里炼煞气为攻杀的一路，煞气绕身触者即伤' },
    { id: 'sk_xueling',   name: '血灵钻·法诀',     rarity: 4, icon: '📕', req: 60,  teach: 'xueling', desc: '习得《血灵钻》。精血凝钻，指劲破体，专破护体灵光' },
    { id: 'sk_mingwang',  name: '明王诀·法诀',     rarity: 4, icon: '📕', req: 64,  teach: 'mingwang', desc: '习得《明王诀》。佛门炼体，借煞气淬身，肉身自成一重法宝' },
    { id: 'sk_jifeng',    name: '疾风九变·法诀',   rarity: 4, icon: '📕', req: 60,  teach: 'jifeng',  desc: '习得《疾风九变》。妖族禽修身法，九转身形如风' },
    { id: 'sk_xuelian', name: '血炼神光·法诀', rarity: 4, icon: '📕', req: 56,  teach: 'xuelian', desc: '习得《血炼神光》。血光吞精血以养己身，伤人亦自补' },
    { id: 'sk_dageng',  name: '大庚剑阵·法诀', rarity: 4, icon: '📕', req: 82,  teach: 'dageng',  desc: '习得《大庚剑阵》。庚精为骨、青竹蜂云剑为引，五道剑气齐出' },
    { id: 'sk_tiandu',  name: '天都尸火·法诀', rarity: 4, icon: '📕', req: 82,  teach: 'tiandu',  desc: '习得《天都尸火》。魔道阴火，焚魂不焚身' },
    { id: 'sk_cuigu',   name: '淬骨诀·法诀',   rarity: 4, icon: '📕', req: 82,  teach: 'cuigu',   desc: '习得《淬骨诀》。骨如法宝，气血与自愈俱增' },
    { id: 'sk_tuotian', name: '托天魔功·法诀', rarity: 4, icon: '📕', req: 86,  teach: 'tuotian', desc: '习得《托天魔功》。皮下覆金鳞，硬抗寻常法宝' },
    { id: 'sk_xueying', name: '血影遁·法诀',   rarity: 4, icon: '📕', req: 86,  teach: 'xueying', desc: '习得《血影遁》。燃血一遁百里，逃命第一' },
    { id: 'sk_shishen', name: '失神刺·法诀', rarity: 4, icon: '📕', req: 102, teach: 'shishen', desc: '习得《失神刺》。大衍诀衍生，神念扎识海，中者僵立' },
    { id: 'sk_huashen', name: '身外化身·法诀', rarity: 4, icon: '📕', req: 110, teach: 'huashen', desc: '习得《身外化身》。玄阴经分神之法，养出一具化身替你出手' },
    { id: 'sk_jzhen',    name: '剑阵圆满·法诀',   rarity: 4, icon: '📕', req: 112, teach: 'jzhen',    desc: '习得《剑阵圆满》。青蟠剑阵成了，飞剑绕身成绝地' },
    { id: 'sk_heisha',   name: '黑煞修罗功·法诀', rarity: 4, icon: '📕', req: 102, teach: 'heisha',   desc: '习得《黑煞修罗功》。黑煞鼓到极处炸开，三尺内成血雾' },
    { id: 'sk_jinshen',  name: '禁神术·法诀',     rarity: 4, icon: '📕', req: 112, teach: 'jinshen',  desc: '习得《禁神术》。锁神不伤身，念头动不了' },
    { id: 'sk_lihun',    name: '离魂术·法诀',     rarity: 4, icon: '📕', req: 102, teach: 'lihun',    desc: '习得《离魂术》。勾魂一把，对方愣神' },
    { id: 'sk_mengyin',  name: '梦引术·法诀',     rarity: 4, icon: '📕', req: 110, teach: 'mengyin',  desc: '习得《梦引术》。引梦入识海，人多睡一瞬' },
    { id: 'sk_huanxing', name: '换形诀·法诀',     rarity: 4, icon: '📕', req: 112, teach: 'huanxing', desc: '习得《换形诀》。换一副皮相行走，气息身形俱改' },
    { id: 'sk_fansheng', name: '梵圣真魔功·法诀', rarity: 4, icon: '📕', req: 112, teach: 'fansheng', desc: '习得《梵圣真魔功》。佛魔同体，肉身与法力压进骨里' },
    { id: 'sk_shadan',   name: '煞丹术·法诀',     rarity: 4, icon: '📕', req: 112, teach: 'shadan',   desc: '习得《煞丹术》。以煞凝丹的备用法门' },
    { id: 'sk_sanzhuan',  name: '三转重元功·法诀', rarity: 4, icon: '📕', req: 50,  teach: 'sanzhong',  desc: '习得《三转重元功》。青元剑诀附带的辅助法门，散功重修三轮，把真元压实' },
    { id: 'sk_fenglei',   name: '风雷翅·炼法',     rarity: 4, icon: '📕', req: 56,  teach: 'fenglei',   desc: '习得《风雷翅》。乱星海炼器所得飞行翼，移速大增' },
    { id: 'sk_tongbao',   name: '洞漩金光·法诀',   rarity: 4, icon: '📕', req: 82,  teach: 'tongbao',   desc: '习得《洞漩金光》。金光绕体，专伤神魂、破魔驱邪——韩立自乱星海后打磨出的金光神通' },
    { id: 'sk_leishen',   name: '辟邪神雷·雷诀',   rarity: 4, icon: '📕', req: 56,  teach: 'leishen',   desc: '习得《辟邪神雷》。青竹蜂云剑以金雷竹炼成，剑身自蕴此雷，专克魔道鬼道' },
    { id: 'sk_qinxian',   name: '大庚剑阵·阵图',   rarity: 4, icon: '📕', req: 82,  teach: 'qinxian',   desc: '习得《大庚剑阵》。青元剑诀第十层，以本命飞剑布阵，剑光成网' },
    { id: 'sk_xuanyin',   name: '玄阴经·残卷',     rarity: 4, icon: '📕', req: 56,  teach: 'xuanyin',   desc: '习得《玄阴经》。乱星海顶级魔道功法，玄骨、极阴一脉所修' },
    { id: 'sk_wuzi',      name: '五子同心魔·魔诀', rarity: 4, icon: '📕', req: 102, teach: 'wuzi',      desc: '习得《五子同心魔》。昆吾山所得子母魔头操控法' },
    { id: 'sk_pojie',     name: '破界符·空间诀',   rarity: 4, icon: '📕', req: 112, teach: 'pojie',     desc: '习得《破界符·空间诀》。玲珑所留的飞升之凭' }
  );
  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  window.SHOP_STOCK.push(
    { id: 'sk_swift',  price: 300,  cat: 'skill' },
    { id: 'sk_fire',   price: 420,  cat: 'skill' },
    { id: 'sk_orb',    price: 560,  cat: 'skill' },
    { id: 'sk_regen',  price: 900,  cat: 'skill' },
    { id: 'sk_nova',   price: 1500, cat: 'skill' },
    { id: 'sk_haste',  price: 1600, cat: 'skill' },
    { id: 'sk_frost',  price: 2200, cat: 'skill' },
    { id: 'sk_gourd',  price: 1800, cat: 'skill' },
    { id: 'sk_changchun', price: 260,  cat: 'skill' },
    { id: 'sk_sanyan',    price: 3000, cat: 'skill' },
    { id: 'sk_sanzhuan',  price: 3400, cat: 'skill' },
    { id: 'sk_fenglei',   price: 2800, cat: 'skill' },
    { id: 'sk_xuanyin',   price: 2800, cat: 'skill' },
    { id: 'sk_tongbao',   price: 4200, cat: 'skill' },
    { id: 'dayan2',       price: 6400, cat: 'skill' },
    { id: 'sk_leishen',   price: 5200, cat: 'skill' },
    { id: 'sk_qinxian',   price: 5600, cat: 'skill' },
    { id: 'sk_wuzi',      price: 7200, cat: 'skill' },
    { id: 'sk_pojie',     price: 8800, cat: 'skill' }
  );

  // 太南小会是炼气散修的摊子，只卖低阶法诀
  const TN = window.MAPS.find(m => m.id === 'tainan');
  // 散修摊子上有的是低阶法诀；**长春功不在此列**——那是墨大夫私下传给韩立的，摊子上不该有
  if (TN) TN.shop = TN.shop.concat(['sk_swift', 'sk_fire', 'sk_orb', 'sk_regen']);
  // 天星城是乱星海第一大市，中高阶法诀也上摊
  const TX = window.MAPS.find(m => m.id === 'tianxing');
  if (TX) TX.shop = TX.shop.concat(['sk_nova', 'sk_haste', 'sk_frost', 'sk_gourd', 'sk_regen']);

  // 天南交易会（九国盟·阗天城）：原著里百年一届、元婴老怪戴面具置换宝物的地方，
  // 「珍稀灵药、法宝、功法及情报」都在这流通，晶龙阁内另有拍卖（天晶真人主持，入场赠面具掩身份）。
  // 炼气期那些符箓法器，不会摆到这种台面上来。
  const JY = window.MAPS.find(m => m.id === 'jiaoyihui');
  if (JY) {
    JY.shopSub = '九国盟阗天城，百年一届。元婴老怪戴面具换物，晶龙阁里另有拍卖。';
    JY.shop = [
      // 高阶符箓与灵石（元婴身家）
      'bichen', 'chuansong', 'baoliebao', 'tishen', 'jipin', 'lianqi',   // 破禁符：太南小会撤柜后，落到这里
      // 元婴期法诀（原著：交易会是功法与情报的核心平台）
      'sk_sanyan', 'sk_sanzhuan', 'sk_fenglei', 'sk_xuanyin', 'sk_tongbao', 'sk_leishen', 'sk_qinxian',
      // 元婴级灵物与法宝料：韩立此行要换的庚精、换到的三千年赤精芝
      'm_gengjing', 'm_chijingzhi', 'm_yaodan',
      // 镇宗灵丹
      'peiyin'
    ];
    // 晶龙阁拍卖：原著里韩立在此换得赤精芝、紫铖兜、上古傀儡（元婴傀儡炼制之法）、北极元光指环
    JY.auction = [
      { id: 't_zicheng', price: 9000,  note: '紫铖兜 · 元婴修士旧物，防御一件' },
      { id: 'm_kuilei',  price: 15000, note: '上古傀儡核 · 附元婴傀儡炼制之法' },
      { id: 't_beiji',   price: 12000, note: '北极元光指环 · 完善攻防一环' },
      { id: 'm_chijingzhi', price: 16000, note: '三千年赤精芝 · 仅次于化形九曲灵参' }
    ];
  }
})();

// ============================================================================
// 高阶符箓 / 灵石：结丹以后才用得上的消耗
// 坊市买得到，服下催动是「限时增益」—— 一段时间属性见长，时辰一过自散
// ============================================================================
(function () {
  window.SHOP_STOCK.push(
    { id: 'bichen',    price: 1200, cat: 'fu' },
    { id: 'chuansong', price: 2600, cat: 'fu' },
    { id: 'baoliebao', price: 3000, cat: 'fu' },
    { id: 'tishen',    price: 2400, cat: 'fu' },   // 替身傀儡：催动即用，与避尘/传送同柜；它是消耗品，不是可佩法器
    { id: 'jipin',     price: 4200, cat: 'dan' },   // 极品灵石：化开供闭关，是「服下即用」的东西，归丹药柜；它本身不是炼器材料
    // 元婴级灵物（天南交易会才见得到）：庚精是韩立此行要换的，赤精芝是他换到的
    { id: 'm_gengjing',   price: 9000,  cat: 'cai' },
    { id: 'm_chijingzhi', price: 16000, cat: 'cai' }
  );
})();
