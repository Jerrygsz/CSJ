// 地图 / 剧情 / 境界 / 坊市 数据（按《凡人修仙传》筑基之前剧情线）

// 练气十三层：每层都给「生命上限 + 伤害 + 攻速 + 移速」四重成长，
// 每三层（四/七/十/十三）另授一门功法，保证每次突破都能立刻感到变强。
window.REALM_LAYERS = [
  { lv: 1,  name: '练气一层',   hp: 0,  dmg: 0,    atk: 0,    spd: 0,    note: '引气入体' },
  { lv: 3,  name: '练气二层',   hp: 12, dmg: 0.05, atk: 0.03, spd: 0.01, note: '气感渐稳' },
  { lv: 5,  name: '练气三层',   hp: 14, dmg: 0.05, atk: 0.03, spd: 0.01, note: '真气小成' },
  { lv: 7,  name: '练气四层',   hp: 16, dmg: 0.06, atk: 0.04, spd: 0.02, skill: 'fire',  note: '得授火蛇符' },
  { lv: 9,  name: '练气五层',   hp: 18, dmg: 0.06, atk: 0.04, spd: 0.02, note: '经脉拓宽' },
  { lv: 11, name: '练气六层',   hp: 20, dmg: 0.07, atk: 0.05, spd: 0.02, note: '灵力充盈' },
  { lv: 13, name: '练气七层',   hp: 22, dmg: 0.07, atk: 0.05, spd: 0.03, skill: 'orb',   note: '得授玄罡护体' },
  { lv: 16, name: '练气八层',   hp: 26, dmg: 0.08, atk: 0.06, spd: 0.03, note: '筋骨如铁' },
  { lv: 19, name: '练气九层',   hp: 28, dmg: 0.08, atk: 0.06, spd: 0.03, note: '神识初开' },
  { lv: 22, name: '练气十层',   hp: 32, dmg: 0.09, atk: 0.07, spd: 0.04, skill: 'nova',  note: '得授金光符' },
  { lv: 26, name: '练气十一层', hp: 36, dmg: 0.10, atk: 0.08, spd: 0.04, note: '法力浑厚' },
  { lv: 30, name: '练气十二层', hp: 40, dmg: 0.11, atk: 0.09, spd: 0.05, note: '气息绵长' },
  { lv: 35, name: '练气十三层', hp: 48, dmg: 0.13, atk: 0.10, spd: 0.05, skill: 'frost', note: '得授玄冰符' }
];

// 三档难度：怪更强、掉落更厚、灵石与修为更多
// levelScale：回刷低级图时，按「超出该图推荐等级」的差值再放大怪物强度，避免高境界碾压
window.DIFFICULTIES = [
  {
    id: 'easy', name: '凡境', tag: '寻常', color: '#9fe0c0',
    hp: 1.0, dmg: 1.0, spd: 1.0, cnt: 1.0, levelScale: 0,
    drop: 1.0, rarity: 0, stone: 1.0, xp: 1.0,
    desc: '山兽如常，正合练手。'
  },
  {
    id: 'hard', name: '险境', tag: '凶险', color: '#ffb060',
    hp: 1.75, dmg: 1.5, spd: 1.08, cnt: 1.25, levelScale: 0.02,
    drop: 1.7, rarity: 1, stone: 1.8, xp: 1.5,
    desc: '妖物壮了两分，落物也厚了两分。'
  },
  {
    id: 'nightmare', name: '死境', tag: '九死', color: '#ff6a6a',
    hp: 3.1, dmg: 2.2, spd: 1.18, cnt: 1.6, levelScale: 0.05,
    drop: 2.6, rarity: 2, stone: 3.0, xp: 2.2,
    desc: '血雾漫天，敢入者少。'
  }
];
window.diffById = function (id) {
  return DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[0];
};

// 七张地图：剧情 / 战斗 / 剧情战 / 坊市
window.MAPS = [
  {
    id: 'qixuan', order: 1, name: '七玄门·山门', pos: '越国·镜州 青牛山',
    type: 'story', tag: '剧情',
    desc: '入门考核。韩立与张铁都没能进内门，却被墨大夫留在药庐做了药童。',
    startLevel: 1, startSkills: { sword: 1 },
    unlock: null, next: 'houshan',
    cave: 'qixuan',
    reward: { stones: 40, items: ['changchun', 'gupu'], mats: [['m_chijing', 3], ['m_huangjing', 2]] },
    clearTitle: '入门已毕',
    clearDesc: '自此便是七玄门的人了。药庐的差事，从明日起。'
  },
  {
    id: 'houshan', order: 2, name: '七玄门·后山', pos: '青牛山北麓',
    type: 'combat', tag: '战斗',
    desc: '替药庐采药。山兽与流窜山贼都在这一带出没，是练气初期最好的练手处。',
    startLevel: 1, startSkills: { sword: 1 },
    unlock: 'qixuan', next: 'mishi',
    diff: 1.0, bossAt: 110,
    enemies: ['wolf', 'snake', 'bat', 'boar', 'bandit'],
    elites: ['百年狼王', '山贼头目'],
    mats: ['m_chijing', 'm_huangjing', 'm_jingtie', 'm_wolfdan', 'm_shedan'],
    boss: { kind: 'beast', name: '百年狼妖', hp: 1100, spd: 66, dmg: 15, r: 20, spr: 'wolf', scale: 3.4 },
    reward: { stones: 80, items: [] },
    clearTitle: '采药已毕',
    clearDesc: '赤精草够数了。只是那狼妖的骨头，比寻常野兽硬得多。'
  },
  {
    id: 'mishi', order: 3, name: '墨大夫·密室', pos: '七玄门·药庐地底',
    type: 'boss', tag: '剧情战',
    desc: '尸虫丸的期限满了一年。墨大夫不再遮掩——他要的从来不是弟子，而是一具炉鼎。',
    startLevel: 7, startSkills: { sword: 3, fire: 1 },
    unlock: 'houshan', next: 'tainan',
    diff: 1.15, bossAt: 0, intro: 'mishi',
    enemies: ['ghoul', 'assassin'],
    elites: ['炼尸·铁奴', '血尸·张铁'],
    mats: ['m_shihui', 'm_xuesha', 'm_lingmo', 'm_yusui', 'm_jingtie'],
    boss: { kind: 'mo', name: '墨大夫·墨居仁', hp: 1500, spd: 40, dmg: 18, r: 20, spr: 'mo', scale: 2.9 },
    reward: { stones: 160, items: ['qingzhu', 'lianzhi'] },
    clearTitle: '墨居仁已除',
    clearDesc: '密室空了。铁奴揭下面具，是张铁。墨大夫留了一封信，指向嘉元城。'
  },
  {
    id: 'tainan', order: 4, name: '太南小会', pos: '越国·太南山',
    type: 'market', tag: '坊市',
    desc: '散修云集的交易会。以灵石换丹药、符箓与法器，也能把用不上的东西折价出手。',
    startLevel: 7, startSkills: { sword: 3, fire: 1 },
    unlock: 'mishi', next: 'huangfeng',
    reward: { stones: 0, items: [] },
    clearTitle: '小会已散',
    clearDesc: '灵石花得干净，储物袋也换了个模样。'
  },
  {
    id: 'huangfeng', order: 5, name: '黄枫谷·山门', pos: '越国·黄枫谷',
    type: 'story', tag: '剧情',
    desc: '凭升仙令入门，本应配发一枚筑基丹。叶师叔上门来换：丹归他，换来一门自择的差事。',
    startLevel: 10, startSkills: { sword: 4, fire: 2, orb: 1 },
    unlock: 'tainan', next: 'yaoyuan',
    cave: 'huangfeng',
    reward: { stones: 100, mats: [['m_zihua', 1], ['m_tianling', 1]] },
    clearTitle: '入园为役',
    clearDesc: '丹给了叶师叔，换来青石岭百药园这个差事。灵根差，丹也没了，好在没人来扰。'
  },
  {
    id: 'yaoyuan', order: 6, name: '黄枫谷·药园', pos: '黄枫谷后山药田',
    type: 'combat', tag: '战斗',
    desc: '灵虫妖鼠啃食药苗，需在药田守夜驱除。药园灵气稀薄，夜里却不太平。',
    startLevel: 13, startSkills: { sword: 4, fire: 2, orb: 1 },
    unlock: 'huangfeng', next: 'xuese',
    diff: 1.35, bossAt: 140,
    enemies: ['bat', 'snake', 'assassin', 'ghoul', 'bandit'],
    elites: ['噬灵虫王', '妖鼠精'],
    mats: ['m_zihua', 'm_tianling', 'm_longlin', 'm_chongjing', 'm_fuzhi', 'm_huangjing'],
    boss: { kind: 'swarm', name: '噬灵虫母', hp: 2100, spd: 38, dmg: 15, r: 18, spr: 'blacklord', scale: 3.0 },
    reward: { stones: 200, items: ['qiannian'] },
    clearTitle: '守夜已毕',
    clearDesc: '药苗保住了。虫母的甲壳底下，藏着一枚聚灵的珠子。'
  },
  {
    id: 'xuese', order: 7, name: '血色禁地', pos: '越国·七派共管秘境',
    type: 'combat', tag: '战斗',
    desc: '七派试炼之地，血雾终年不散。筑基丹的主药在此，魔道修士亦在其中。',
    startLevel: 20, startSkills: { sword: 5, fire: 3, orb: 2, nova: 1 },
    unlock: 'yaoyuan', next: 'zhuji',
    diff: 1.6, bossAt: 170,
    enemies: ['assassin', 'ghoul', 'boar', 'bandit', 'assassin'],
    elites: ['魔道凶徒', '血傀儡'],
    mats: ['m_yusuizhi', 'm_tianling', 'm_zihua', 'm_longlin', 'm_xuantie', 'm_xuesha', 'm_yusui'],
    boss: { kind: 'mo', name: '灵兽山·封岳', hp: 3600, spd: 52, dmg: 19, r: 19, spr: 'bandit', scale: 4.2 },
    reward: { stones: 320, items: ['zhangtian'] },
    clearTitle: '禁地已出',
    clearDesc: '封岳倒了，药草从他储物袋里撒出来。主药凑齐了，活着走出来的人不足半数。李化元赢了那一场赌，把他收作记名弟子。'
  },

  // ==================== 支线：因缘所至，另行成图 ====================
  // 只有在该图遇到「正确的人或事」并谈完，才出现在修行图上（见 js/encounters.js）
  {
    id: 'mkuang', side: true, sorder: 1, name: '后山·废弃矿洞', pos: '青牛山北麓 旧矿脉',
    type: 'combat', tag: '支线', unlockBy: 'e_zhou',
    desc: '山塌了半边，铁矿石露在外头。洞里住进了石魈，把矿道当成了自己的窝。',
    startLevel: 3, startSkills: { sword: 1 },
    unlock: null, next: null,
    diff: 1.05, bossAt: 95,
    enemies: ['bat', 'snake', 'shigui', 'bandit'],
    elites: ['矿洞石魈'],
    mats: ['m_jingtie', 'm_chitong', 'm_xuantie', 'm_yusui'],
    boss: { kind: 'beast', name: '石魈王', hp: 980, spd: 52, dmg: 14, r: 20, spr: 'shigui', scale: 3.2 },
    reward: { stones: 70, items: [], mats: [['m_jingtie', 4], ['m_chitong', 2]] },
    clearTitle: '矿洞已清',
    clearDesc: '矿道通了。碎石堆里挑出来的铁，够打两件好器。'
  },
  {
    id: 'zhangtie', side: true, sorder: 2, name: '后山·张铁的铁匠棚', pos: '青牛山北麓 松林边',
    type: 'story', tag: '支线', unlockBy: 'e_tie',
    desc: '半塌的铁匠棚，风箱、丁字锤、半截断剑。炉膛冷了半年，铁砧上还压着一块铁牌。',
    startLevel: 7, startSkills: { sword: 3, fire: 1 },
    unlock: null, next: null,
    reward: { stones: 40, items: [] },
    clearTitle: '旧物已收',
    clearDesc: '铁牌收进怀里。人被炼成了傀儡，牌子倒还留着。'
  },
  {
    id: 'yanwu', side: true, sorder: 3, name: '七玄门·演武场', pos: '七玄门 前山校场',
    type: 'combat', tag: '支线', unlockBy: 'e_li',
    desc: '木剑对木剑，点到为止。同门切磋，输赢都不伤和气，只是谁也不肯先认。',
    startLevel: 9, startSkills: { sword: 3, fire: 1 },
    unlock: null, next: null,
    diff: 1.1, bossAt: 80,
    enemies: ['disciple', 'bandit'],
    elites: ['外门弟子'],
    mats: ['m_jingtie', 'm_chitong'],
    boss: { kind: 'mo', name: '厉飞雨（切磋）', hp: 1900, spd: 58, dmg: 13, r: 18, spr: 'disciple', scale: 2.4 },
    reward: { stones: 120, items: ['jingtie'], mats: [['m_jingtie', 3]] },
    clearTitle: '演武已毕',
    clearDesc: '木剑断了三根。厉飞雨把剑一扔，只说了一句：还行。'
  },
  {
    id: 'yaopu', side: true, sorder: 4, name: '黄枫谷·灵药圃深处', pos: '黄枫谷后山 最里一畦',
    type: 'combat', tag: '支线', unlockBy: 'e_yaotong',
    desc: '田埂尽头的木门后，灵药长得比人高。啃药的东西，就伏在里面。',
    startLevel: 15, startSkills: { sword: 4, fire: 2, orb: 1 },
    unlock: null, next: null,
    diff: 1.3, bossAt: 120,
    enemies: ['snake', 'bat', 'ghoul', 'assassin'],
    elites: ['守药灵猿'],
    mats: ['m_tianling', 'm_longlin', 'm_zihua', 'm_huangjing'],
    boss: { kind: 'beast', name: '守药灵猿', hp: 2400, spd: 54, dmg: 16, r: 20, spr: 'ape', scale: 3.0 },
    reward: { stones: 180, items: [], mats: [['m_tianling', 2], ['m_longlin', 1], ['m_zihua', 2]] },
    clearTitle: '药圃已安',
    clearDesc: '灵猿伏地。最里那畦剩下的药，够炼一炉好丹。'
  },
  {
    id: 'heixiang', side: true, sorder: 5, name: '太南小会·后巷', pos: '太南山 小会后巷',
    type: 'story', tag: '支线', unlockBy: 'e_huo',
    desc: '一条窄巷，两边支着棚子。此处不问来路，只问价钱。',
    startLevel: 8, startSkills: { sword: 3, fire: 1 },
    unlock: null, next: null,
    reward: { stones: 0, items: [], mats: [['m_xuantie', 1], ['m_hantie', 1]] },
    clearTitle: '黑货已收',
    clearDesc: '玄铁沉手，寒铁握久了掌心发麻。巷口那人收了灵石，转身就没影了。'
  },
  {
    id: 'xuechi', side: true, sorder: 6, name: '血色禁地·血池', pos: '血色禁地 北侧洼地',
    type: 'combat', tag: '支线', unlockBy: 'e_moxiu',
    desc: '听不见虫叫的地方。血从石缝里渗出来，积成一池，池边长着会变色的草。',
    startLevel: 24, startSkills: { sword: 5, fire: 3, orb: 2, nova: 1 },
    unlock: null, next: null,
    diff: 1.5, bossAt: 150,
    enemies: ['assassin', 'ghoul', 'bandit'],
    elites: ['血傀儡'],
    mats: ['m_xuesha', 'm_yusuizhi', 'm_hantie', 'm_yusui'],
    boss: { kind: 'blood', name: '血傀儡', hp: 3200, spd: 46, dmg: 18, r: 19, spr: 'ghoul', scale: 3.0 },
    reward: { stones: 260, items: [], mats: [['m_xuesha', 2], ['m_yusuizhi', 1]] },
    clearTitle: '血池已涸',
    clearDesc: '池底只剩一层暗红的泥。玉髓芝长在池边的石缝里，一朵要长几百年。'
  }
];

window.MAIN_MAPS = function () { return window.MAPS.filter(m => !m.side); };
window.SIDE_MAPS = function () { return window.MAPS.filter(m => m.side); };
window.MAIN_MAP_COUNT = 7;

// 剧情对白：剧情地图全文，或战斗地图的开场 / 收尾
window.MAP_STORIES = {
  qixuan: [
    ['旁白', '天南·越国·镜州，青牛镇五里沟。山边一个几十户人家的小村。'],
    ['韩立', '（小名二愣子。家里七口人，靠几亩薄田。十岁这年，三叔从七玄门捎了话回来。）'],
    ['旁白', '七玄门是镜州数一数二的武林门派。三叔在门里当外门执事，托了人情，把韩立与同村的张铁一并送进了入门试。'],
    ['旁白', '摸骨、举石锁、试胆。两人都差了一口气——不够进内门。'],
    ['旁白', '正要被遣下山时，门中那位客卿药师墨大夫开了口。'],
    ['墨大夫', '这两个孩子留下罢。我药庐缺人手。'],
    ['韩立', '（一句话，便定了我往后的路。张铁站在我旁边，咧着嘴笑。）'],
    ['旁白', '墨大夫授《长春功》引气之法，命二人往后山采药。张铁无木灵根，练的是另一门象甲功。']
  ],
  mishi: [
    ['旁白', '药庐地底，一间密室。石壁上嵌着七盏油灯，灯芯是黑的。'],
    ['墨大夫', '你练到第几层了？'],
    ['韩立', '（第四层。他问过三次了，每次都挑我进境那一天。）'],
    ['墨大夫', '一年前那粒尸虫丸，你没有忘罢。'],
    ['韩立', '（毒虫在丹田里爬。他说练到第四层便给解药——可我早就明白，他要的不是我的修为，是我这具身子。）'],
    ['墨大夫', '老夫墨居仁，困在这具凡躯里三十年。凭什么仙家能够遨游天地，我却只能做一只井底之蛙？'],
    ['旁白', '七盏灯同时亮起。铁奴自阴影里踏出——那具傀儡的脸，是张铁。'],
    ['韩立', '（张铁。失踪半年，原来一直站在他脚边。）'],
    ['旁白', '墨大夫袖中探出一只漆黑的手，五指如钩。魔银手。'],
    ['韩立', '（他算我第四层。他不知道我早就到了第六层。）']
  ],
  // 黄枫谷山门：全篇最重要的一处因果 —— 升仙令 → 配丹 → 叶师叔来换 → 自择差事 → 百药园
  // 原著里叶师叔不能强抢（钟掌门有令只许商量），韩立是算过账之后主动让的。
  // 这一让，才有了能安心修炼、能接触丹方的百药园。
  huangfeng: [
    ['旁白', '黄枫谷，越国七派之一。山门前的测灵碑泛着微光。'],
    ['旁白', '四灵根，缺金，伪灵根。执事摇头，手已经抬起来要摆手了。'],
    ['韩立', '（升仙令还在袖里。七派认令不认人——这一枚令牌，换一个入门的名分。）'],
    ['旁白', '令牌一亮，执事脸色变了。按谷中旧例，持令入门者配发筑基丹一枚，另许自择一门差事。'],
    ['旁白', '丹还没到手，先来了人。'],
    ['叶师叔', '这枚丹，我侄孙正等着。你灵根如此，服了也是白费。'],
    ['韩立', '（灰衣老者，姓叶，筑基修士。他不敢抢——钟掌门有话，只许商量，不许强夺。）'],
    ['叶师叔', '一枚丹，换一批灵石、几件法器，外加任你挑一门差事。这买卖不亏。'],
    ['韩立', '（不亏？我算了三息。丹护不住，硬顶只会连命一起丢。）'],
    ['韩立', '差事我自己挑。'],
    ['旁白', '他挑了青石岭百药园。灵草娇贵，稍有差池便要赔偿，谷里弟子都躲着走。'],
    ['韩立', '（躲着走才好。药园清静，没人来扰；种什么、炼什么，也没人盯着。）'],
    ['旁白', '叶师叔许诺的灵石法器，后来只给了一半。韩立没去要。'],
    ['韩立', '（去要，就是提醒他还欠着。等我结丹再说。）']
  ],
  houtro: [
    ['旁白', '狼妖伏地，山林重归寂静。'],
    ['韩立', '（赤精草够数了。只是这山里，还有别的东西在动。）'],
    ['韩立', '（夜里回药庐，得看看墨大夫在做什么。）']
  ],
  moutro: [
    ['旁白', '墨居仁倒下时，那具傀儡也跟着软了。面具脱落，露出张铁的脸。'],
    ['韩立', '（张铁。他练的象甲功，练到最后，被人连魂魄一起抹了。）'],
    ['旁白', '一缕残魂从墨居仁眉心溢出想逃，被韩立一口七毒水泼在脸上，散了。'],
    ['韩立', '（余子童。从头到尾撺掇墨居仁夺舍的，是他。）'],
    ['旁白', '密室角落压着一封信。墨大夫的字，一笔一划写得很稳。'],
    ['墨大夫', '「吾一生求道，终为井底之蛙。若你活着出去，去嘉元城墨府取暖阳宝玉——魔银手的毒，只有它能解。」'],
    ['韩立', '（人都死了，还留一条活路给我。这算什么呢。）'],
    ['旁白', '韩立把铁奴收起，改名曲魂，连夜下了青牛山。']
  ],
  yooutro: [
    ['旁白', '虫母的甲壳裂开，虫群四散。'],
    ['韩立', '（药园保住了。这一夜，倒是比在山里杀狼还累。）'],
    ['旁白', '执事难得点头，记下了一份功劳。']
  ],
  zhangtie: [
    ['旁白', '松林边上有一间半塌的铁匠棚。风箱还在，炉膛冷了半年。'],
    ['韩立', '（张铁在门里打了三年铁，替外门弟子修兵器，一文钱不收。）'],
    ['韩立', '（他说等攒够了铁，自己打一把剑。）'],
    ['旁白', '砧台上压着一块铁牌，是他随身带的那块，边角磨得发亮。'],
    ['韩立', '（墨居仁要一具尸傀，就把他从我身边拿走了。）'],
    ['旁白', '韩立把铁牌翻过来，背面刻着一个「铁」字。'],
    ['韩立', '（这牌子我收着。往后我炼出的每一件器，都算他一份。）']
  ],
  heixiang: [
    ['旁白', '后巷支着两张棚子，棚下摆的东西，明面上都不许摆。'],
    ['散修', '玄铁三块，寒铁一块。道友若识货，价钱好说。'],
    ['韩立', '（玄铁是真的。寒铁……他袖口露出来的那截，泛的是冷光。）'],
    ['旁白', '韩立把灵石推过去，东西揣进怀里，一句多余的话也没问。'],
    ['韩立', '（小会明面上不许卖这个。可筑基之前，谁不是这么过来的。）']
  ],
  xsoutro: [
    ['旁白', '血雾散去。禁地深处的灵药被采了个干净。'],
    ['韩立', '（玉髓芝、紫猴花、天灵果。三味主药，都齐了。）'],
    ['旁白', '七派在禁地口点验所得。李化元与几位长老赌了一句：谁门下采得多。'],
    ['旁白', '黄枫谷这一趟采得最多。韩立交上去的药草，压过了所有人。'],
    ['李化元', '你叫什么名字？'],
    ['韩立', '弟子韩立。'],
    ['李化元', '从今日起，你是我记名弟子。'],
    ['韩立', '（记名弟子。进谷这些年，头一回有人肯在我名字后头加两个字。）']
  ],
  // 太南小会：从七玄门到黄枫谷中间的那一段，原著里一笔带过，这里补成一句因果
  tainan: [
    ['旁白', '太南山。五年一次的散修小会，棚子从山脚一直搭到半山。'],
    ['韩立', '（下山这半年，先绕去嘉元城墨府。暖阳宝玉解了魔银手的毒，那几位夫人倒没为难我。）'],
    ['韩立', '（再回五里沟。小妹出嫁，家里连一床新被都凑不出。我把灵石留下，只说是门里赏的。）'],
    ['韩立', '（回程那一夜，野狼帮围攻七玄门。帮中供奉的金光上人是个练气修士，死在我的火弹术下。）'],
    ['韩立', '（他贴身收着的那枚升仙令，如今在我袖里。七玄门是待不下去了——修仙者的身份一露，就再没有回头路。）'],
    ['旁白', '棚下有人招呼他。一个瘦小散修，怀里抱着一摞旧书。'],
    ['万小山', '道友面生。头一回来太南？'],
    ['韩立', '头一回。'],
    ['万小山', '那这令牌你收好。七派认令不认人，持令登门，能换一个入门的名分，还配一枚筑基丹。'],
    ['韩立', '（筑基丹。这三个字，比什么名额都实在。）'],
    ['万小山', '我姓万，万小山。往后若在七派里见着，还望多照应。'],
    ['韩立', '（太南小会的规矩：不问来路，只问价钱。摆出来的东西，一半见不得光。）']
  ]
};

// 太南小会货架（价格单位：灵石）——丹药 / 符箓 / 法器 / 杂材
window.SHOP_CATS = [
  { id: 'dan', name: '丹药' },
  { id: 'fu',  name: '符箓' },
  { id: 'qi',  name: '法器' },
  { id: 'cai', name: '杂材' }
];
// 坊市不卖「需要开炉才得」的成丹 —— 那几味只在你自己的丹炉里。
// 所以「丹药」柜是空柜，只留一句说明，引导去洞府开炉。
// （火弹符 / 清心符原本被错标成 cat:'dan'，挂在丹药柜里卖符箓，已改回 'fu'）
window.SHOP_STOCK = [
  { id: 'xueshen',  price: 120, cat: 'fu' },
  { id: 'qiannian', price: 420, cat: 'fu' },
  { id: 'shenxing', price: 100, cat: 'fu' },
  { id: 'qingyan',  price: 80,  cat: 'fu' },
  { id: 'jifeng',   price: 260, cat: 'fu' },
  { id: 'jingtie',  price: 140, cat: 'qi' },
  { id: 'money_sword', price: 240, cat: 'qi' },
  { id: 'qingzhu',  price: 360, cat: 'qi' },
  { id: 'juling',   price: 300, cat: 'qi' },
  { id: 'xuantie',  price: 620, cat: 'qi' },
  { id: 'huyu',     price: 640, cat: 'qi' },
  { id: 'lianqi',   price: 1200,cat: 'fu' },
  { id: 'm_fuzhi',  price: 7,   cat: 'cai' },
  { id: 'm_lingmo', price: 14,  cat: 'cai' },
  { id: 'm_chijing',price: 6,   cat: 'cai' },
  { id: 'm_huangjing',price: 8, cat: 'cai' },
  { id: 'm_jingtie',price: 11,  cat: 'cai' },
  { id: 'm_chitong',price: 30,  cat: 'cai' },
  { id: 'm_zihua',  price: 34,  cat: 'cai' },
  { id: 'm_yusui',  price: 52,  cat: 'cai' },
  { id: 'm_tianling',price: 72, cat: 'cai' }
];

// 卖价：货架物品四折，其余按稀有度
window.SELL_PRICE = [6, 14, 30, 70, 160];
window.sellPriceOf = function (item) {
  if (!item) return 0;
  const s = SHOP_STOCK.find(x => x.id === item.id);
  if (s) return Math.floor(s.price * 0.4);
  return SELL_PRICE[item.rarity] || 6;
};

// 洞府（安全屋）：剧情图通关后开启，不再有妖物，可静修、整备、炼丹炼器
window.CAVES = {
  qixuan: {
    id: 'qixuan', name: '药庐草舍', pos: '七玄门·青牛山 后山药庐',
    from: 'qixuan',
    desc: '墨大夫留下的药庐。药炉、药碾、几架旧书，墙角那口缸从不干。',
    quote: '药理是从这里学的。如今药庐无人，炉子还是热的。',
    capLevel: 16, restStone: 30, restXp: 0.34,
    crafts: ['alchemy', 'talisman'],
    restTip: '以灵石催动药庐地脉，闭关一夜，修为自涨。'
  },
  huangfeng: {
    id: 'huangfeng', name: '百药园草庐', pos: '黄枫谷·青石岭 百药园',
    from: 'huangfeng',
    desc: '药田尽头一间草庐，屋里一半是药架，一半是一张窄榻。窗外就是最里头那几畦。',
    quote: '灵根差，便用别的东西来补。',
    capLevel: 26, restStone: 60, restXp: 0.30,
    crafts: ['alchemy', 'forge', 'talisman'],
    restTip: '百药园地脉不算厚，好在无人来扰，一炉灵石能换一夜清净。'
  }
};
window.caveByMap = function (mapId) {
  const m = MAPS.find(x => x.id === mapId);
  return (m && m.cave && CAVES[m.cave]) || null;
};

// 各地图的底色与景物构成（让场景与剧情贴合：密室是地底石室，禁地是血色荒野）
window.MAP_SCENERY = {
  qixuan:   { bg: { base: '#36532f', a: '#3c5c34', b: '#30492a' }, decor: [['tree', 0.18], ['rock', 0.16], ['tuft', 0.26]] },
  houshan:  { bg: { base: '#36532f', a: '#3c5c34', b: '#30492a' }, decor: [['tree', 0.18], ['rock', 0.16], ['tuft', 0.26]] },
  mishi:    { bg: { base: '#262232', a: '#2e2940', b: '#1d1a26' }, decor: [['rock', 0.42], ['tuft', 0.10]] },
  tainan:   { bg: { base: '#3a352c', a: '#454032', b: '#2f2b23' }, decor: [['rock', 0.22], ['tuft', 0.20], ['tree', 0.06]] },
  huangfeng:{ bg: { base: '#33472e', a: '#3a5234', b: '#2b3d27' }, decor: [['tree', 0.20], ['rock', 0.14], ['tuft', 0.24]] },
  yaoyuan:  { bg: { base: '#2f4a33', a: '#37573b', b: '#273e2b' }, decor: [['tuft', 0.30], ['tree', 0.12], ['rock', 0.14]] },
  xuese:    { bg: { base: '#3a2224', a: '#452a2c', b: '#2e1a1c' }, decor: [['rock', 0.34], ['tuft', 0.12]] },
  // 支线
  mkuang:   { bg: { base: '#2b2722', a: '#35302a', b: '#211e1a' }, decor: [['rock', 0.52], ['tuft', 0.06]] },
  zhangtie: { bg: { base: '#2c3a2c', a: '#334433', b: '#232e23' }, decor: [['tree', 0.30], ['tuft', 0.20], ['rock', 0.08]] },
  yanwu:    { bg: { base: '#4a4032', a: '#554a3a', b: '#3b3327' }, decor: [['rock', 0.18], ['tuft', 0.14]] },
  yaopu:    { bg: { base: '#2f4a33', a: '#3a5c40', b: '#263d2a' }, decor: [['tuft', 0.40], ['tree', 0.16]] },
  heixiang: { bg: { base: '#332b26', a: '#3d342e', b: '#28221e' }, decor: [['rock', 0.26], ['tree', 0.10], ['tuft', 0.10]] },
  xuechi:   { bg: { base: '#3d1e20', a: '#4a2427', b: '#301618' }, decor: [['rock', 0.30], ['tuft', 0.10]] }
};
for (const m of window.MAPS) {
  const sc = window.MAP_SCENERY[m.id];
  if (sc) { m.bg = sc.bg; m.decorScheme = sc.decor; }
}
