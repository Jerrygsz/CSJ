// ============================================================================
// 第四部：突破条件 / 同伴 / 灵兽袋
//
// 依《凡人修仙传》原著与「韩立完整总表」编排，只往表里追加，不改前三部。
//
//   一、境界突破条件：每个大境界都要「丹药 + 材料 + 灵石 + 剧情节点」四样齐备，
//      不是遇敌刷满经验就能过 —— 修为到顶就卡在瓶颈，得备齐东西再来破。
//   二、同伴：按剧情出现的人，跟在身边一起打。
//   三、灵宠：路上捡的卵孵出来，先养在灵兽袋 / 特制灵兽袋 / 灵兽环的禁制空间里，
//      可挂机喂养慢慢长。
// ============================================================================
(function () {

  // ========================= 一、境界突破条件 =========================
  // items：储物袋里的成品丹（突破时吃掉）　mats：材料（突破时耗掉）
  // stones：灵石　story：必须先通掉的剧情图（save.cleared）
  //
  // 依《合规审查定稿版》修正：
  //   结丹 node 小寰岛→天星城（韩立结丹在乱星海天星城，闭关约十年）；丹药降尘/补天→天火液
  //   元婴 删除培婴丹，改用九曲灵参丹+定灵丹（原著碎丹成婴正道路线）；养魂木/灵烛果/灵乳移出元婴门
  //   化神 node 坠魔谷→天星城闭关，并加元磁神山前置；金雷竹移出（降为法宝材料）；五色寒焰+元磁神山核心入料
  window.BREAKTHROUGH = [
    {
      lv: 36, realm: '筑基初期', from: '炼气期十三层',
      canonCave: 'cuiping',   // 原著：李化元赐内门洞府，韩立即在此筑基
      tip: '散修无丹，终生困于炼气。三味主药凑成一炉筑基丹，才敢坐进地火之屋。',
      items: [['zhuji', 1]],
      mats: [['m_yusuizhi', 3], ['m_zihua', 3], ['m_tianling', 3]],
      stones: 300,
      chance: { step: 0.1 },    // 筑基：原著一粒筑基丹把握不足十分之一；韩立一口气吞了八颗方成
      story: [{ id: 'zhuji', name: '黄枫谷·地火之屋' }],
      lines: [
        ['韩立', '三味主药已齐，筑基丹成。散修无丹，困死炼气；这一炉，赌的是往后百年。'],
        ['旁白', '地火之屋，岩浆翻涌。韩立盘膝于石台，将筑基丹纳入口中，一股暖流自丹田升起。'],
        ['韩立', '引气入体，冲关。'],
        ['旁白', '药力化开，经脉寸寸拓宽，灵气如潮，撞向那道横亘多年的瓶颈。'],
        ['旁白', '轰然一声，气海翻涌——筑基成。凡胎换骨，自此可期长生。']
      ]
    },
    {
      lv: 56, realm: '结丹初期', from: '筑基后期',
      canonCave: 'qingzhuxuan',   // 原著：韩立于乱星海天星城闭府数十年结丹
      tip: '原著第376章：雪灵水奇寒、天火液炙热，两味是「必须服用」的结丹灵物，各一份缺一不可。降尘丹只能「有一定几率」助结丹（韩立从古长老处得五枚），五枚押上才稳。',
      items: [['xueling', 1], ['tianhuo', 1]],
      mats: [],
      stones: 1200,
      // 结丹：雪灵水+天火液齐了是五成底子，降尘丹每枚 +10%，五枚即十成（原著正好五枚）
      chance: { min: 0.5, booster: 'jiangchen', step: 0.1 },
      story: [{ id: 'tianxing', name: '天星城·洞府闭关' }],
      lines: [
        ['韩立', '雪灵水奇寒，天火液炙热 —— 两味都服下了，才谈得上结丹。'],
        ['旁白', '天星城洞府，石门紧闭。韩立这一坐，便是数十载寒暑。'],
        ['韩立', '降尘丹也只剩几枚……灵力凝液，液凝成丹，稳住。'],
        ['旁白', '丹田之内，一点金光缓缓成形，旋了不知多少昼夜，终于凝实。'],
        ['旁白', '丹成。自此跳出炼气之列，可称一声「道友」。']
      ],
      optional: ['sanzhong']
    },
    {
      lv: 82, realm: '元婴初期', from: '结丹后期',
      canonCave: 'luoyun',   // 原著：云梦山·落云宗洞府，碎丹成婴
      tip: '碎丹成婴。九曲灵参丹增结婴几率，定灵丹安魂定神（少了它碎丹时神识溃散便是爆体而亡）；补天丹是虚天殿带出来的那一枚，提纯灵根、稳固元婴 —— 三样缺一不可。',
      items: [['jiuqu', 1], ['dianling', 1]],
      needs: [['butian', 1]],   // 补天丹：虚天殿独有的一枚，硬门槛，不参与押丹
      mats: [],
      stones: 3000,
      chance: { min: 1 },       // 元婴：九曲灵参丹（圣药）+ 定灵丹 + 补天丹三样齐备，原著里便是必成
      story: [{ id: 'jieying', name: '云梦山·结婴' }],
      lines: [
        ['韩立', '碎丹成婴。九曲灵参丹增结婴之望，定灵丹安魂；少了定灵，碎丹时神识溃散，便是爆体而亡。'],
        ['旁白', '云梦山巅，云海翻腾。韩立闭目而坐，丹田金丹寸寸龟裂。'],
        ['韩立', '神识剧痛……守住灵台。'],
        ['旁白', '金丹碎尽的一瞬，一个与他一模一样的婴孩，自碎丹中睁开双眼。'],
        ['旁白', '元婴成。自此一念千里，寿元大涨。']
      ]
    },
    {
      lv: 112, realm: '化神初期', from: '元婴后期',
      canonCave: 'qingzhuxuan',   // 原著：韩立回天星城闭府，借数十年凝元神化神
      tip: '人界之巅。元磁神山修出元磁神光为前置，五色寒焰淬炼灵力品质；魔元丹是魔陀山的秘丹，原著里韩立拿玄玉换了三枚，三枚押上才敢冲这一关。',
      items: [['moyuan', 1]],
      mats: [['m_hanhuo', 5], ['m_yuanci', 1]],
      stones: 8000,
      chance: { step: 0.34 },   // 化神：每枚魔元丹 +34%，三枚必成（原著换了三枚）
      story: [{ id: 'jixi', name: '极西之地·元磁神山' }, { id: 'tianxing', name: '天星城·洞府闭关' }],
      lines: [
        ['韩立', '元磁神光淬体，五色寒焰炼灵。人界之巅，只差这一步。'],
        ['旁白', '极西之地，元磁神山轰鸣。韩立借神山之压，将一身灵力压得愈发精纯。'],
        ['韩立', '回天星城，闭关。'],
        ['旁白', '又是数十年。灵力终于凝作一缕元神，冲开泥丸宫。'],
        ['旁白', '化神成。人界已无更高处，前路，是那传说中的灵界。']
      ]
    }
  ];

  // ========================= 二、同伴 =========================
  // 按剧情出现的人。跟在身边，自己会出手，比灵宠重，也不占灵兽袋。
  // 厉飞雨不在此列：原著他七玄门时期病逝，游戏改为「双身份化名系统」（见下方 LIFEIYU）。
  // 分类标签：companion 同伴 / puppet 傀儡 / spirit 器灵 / avatar 化身（见 P2-12 重构）
  window.MATES = [
    { id: 'm_nangongwan', icon: '🌸', name: '南宫婉', spr: 'nvxiu', scale: 1.6, dmg: 0.75, rate: 1.0, cat: 'companion',
      desc: '掩月宗结丹女修。血色禁地那一夜，是两人都不愿再提、也忘不掉的。', from: '血色禁地',
      leave: '掩月宗线后冰封期，强制离队（剧情）；解冻前不可出战。' },
    { id: 'm_yuanyao', icon: '🎐', name: '元瑶', spr: 'linmo', scale: 1.55, dmg: 0.62, rate: 1.05, cat: 'companion',
      desc: '魁星岛的小门派女修。为了师姐，什么都肯做。', from: '乱星海',
      leave: '借尸还魂修行期，强制离队（剧情）；还魂功成前不可出战。' },
    { id: 'm_dayanshenjun', icon: '📿', name: '大衍神君', spr: 'hermit', scale: 1.7, dmg: 0.95, rate: 1.35, cat: 'spirit',
      desc: '千竹教的大衍诀是他写的。如今只剩一缕神念，住在袖子里指手画脚。', from: '极西之地' }
  ];

  // 剧情给的同伴：通掉哪张图，谁就跟着走
  const MATE_GRANT = {
    xuese: ['m_nangongwan'],     // 血色禁地：与南宫婉相识
    ningcui: ['m_yuanyao'],     // 凝翠岛：乱星海遇元瑶
    jixi: ['m_dayanshenjun']     // 极西之地：大衍神君入袖
  };
  // 灵兽袋：后山先给一只粗布的，后面靠打出来 / 换出来
  const BAG_GRANT = { houshan: ['bag_ling'] };
  for (const m of (window.MAPS || [])) {
    const g = MATE_GRANT[m.id]; if (g) { m.reward = m.reward || {}; m.reward.mates = (m.reward.mates || []).concat(g); }
    const b = BAG_GRANT[m.id]; if (b) { m.reward = m.reward || {}; m.reward.items = (m.reward.items || []).concat(b); }
  }

  // ========================= 三、灵宠：路上捡的卵 =========================
  // cat 分类：pet 灵宠 / puppet 傀儡 / spirit 器灵 / avatar 化身（P2-12 重构）
  // release：到达该篇章后自动放飞（云翅鸟·追风 黄枫谷后期不告而别，P2-11）
  window.PETS.push(
    { id: 'p_xueyu', icon: '🕷', name: '血玉蜘蛛', spr: 'shijin', scale: 1.4, dmg: 0.5, rate: 0.95, cat: 'pet',
      desc: '卵壳上爬着血丝，摸上去是暖的。成对才肯进阶，蛛丝连乾蓝冰焰都不怕。', from: '灵石矿洞' },
    { id: 'p_yunchi', icon: '🐦', name: '云翅鸟', spr: 'bingfeng', scale: 1.2, dmg: 0.34, rate: 0.7, cat: 'pet',
      desc: '墨大夫养来盯人的小黄鸟。飞得快，眼睛也毒。', from: '七玄门',
      release: 'huangfeng', releaseNote: '黄枫谷后期，追风不告而别。此后不再出战，解锁纪念成就「追风的背影」。' },
    { id: 'p_mojiao', icon: '🐉', name: '墨蛟', spr: 'liuyi', scale: 1.7, dmg: 0.8, rate: 1.25, cat: 'pet',
      desc: '潭底淤泥里挖出来的卵，沉得压手。蛟性凶，得从小养。', from: '血色禁地' }
  );

  // 已有的「血玉蜘蛛卵」直接认作虫卵（第二部就有的那一味材料）
  const zz = (window.MATERIALS || []).find(x => x.id === 'm_zhizhu');
  if (zz) zz.hatch = 'p_xueyu';

  // 灵兽袋：装灵宠的容器，袋中自成一圈禁制空间
  window.ITEMS.push(
    { id: 'bag_ling', name: '灵兽袋', icon: '👝', rarity: 2, petCap: 2,
      desc: '粗布缝的袋子，里头一圈禁制。揣两只活物已是极限。' },
    { id: 'bag_ling2', name: '特制灵兽袋', icon: '🎒', rarity: 3, petCap: 4,
      desc: '乱星海的手艺。禁制叠了三层，四只灵兽各占一角，互不撕咬。' },
    { id: 'ring_ling', name: '灵兽环', icon: '💍', rarity: 4, petCap: 6,
      desc: '一枚指环，里头却是一片山水。养得再多也装得下，只是认主极慢。' },
    { id: 'egg_yunchi', name: '云翅鸟卵', icon: '🥚', rarity: 2, hatch: 'p_yunchi',
      desc: '指头大的一枚，温的。搁在怀里，几天就有动静。' },
    { id: 'egg_mojiao', name: '墨蛟卵', icon: '🥚', rarity: 4, hatch: 'p_mojiao',
      desc: '潭底淤泥里挖出来的，沉得压手。蛟性凶，得从小养。' },

    // ---- 突破系统新增丹药（依原著：可炼数枚，「押丹」越多把握越大） ----
    { id: 'tianhuo', name: '天火液', rarity: 3, icon: '🔥', req: 56, desc: '火属性妖丹为基，火灵草引火，朱果定火性。结丹主药，闭死关前服下（韩立服的是雪灵水与天火液）。', effect: { xpMul: 0.12 } },
    { id: 'jiuqu',   name: '九曲灵参丹', rarity: 4, icon: '💊', req: 82, desc: '三百年九曲灵参炼成，碎丹成婴几率大增。结婴第一圣药。', effect: { maxhp: 90, regen: 1.5 } },
    { id: 'dianling', name: '定灵丹', rarity: 4, icon: '💊', req: 82, desc: '定灵玉为核，安魂定神。碎丹成婴必备——少了它神识溃散。', effect: { maxhp: 60, regen: 1.2 } },

    // ---- 结丹可选前置功法（P1-9） ----
    { id: 'sanzhong', name: '三转重元功', rarity: 3, icon: '📗', req: 50, teach: 'sanzhong', desc: '散功重修三次，每重修回境界再结丹。结丹可选前置，修习后结丹品质更佳。', unique: true },

    // ---- 金雷竹降级为法宝材料：青竹蜂云剑（P1-8） ----
    { id: 't_qingzhu', name: '青竹蜂云剑', rarity: 4, icon: '🎍', slot: 'weapon', req: 92, desc: '伤害 +40%，攻速 +12%。金雷竹为本命剑骨，雷光绕竹。', effect: { dmg: 0.40, atk: 0.12 }, unique: true, craftOnly: 'forge' },

    // ---- 墨大夫夺舍战掉落（P0-2） ----
    { id: 'lianzhi', name: '炼尸术残卷', rarity: 3, icon: '📜', req: 7, desc: '墨大夫留下的炼尸残卷。铁奴一脉由此而来——日后凝煞丹、炼曲魂，都从这一页起。', unique: true },

    // ---- 掌天瓶（P0-3）：七玄门获得，此时只是古朴小瓶，未激活 ----
    { id: 'gupu', name: '古朴小瓶', rarity: 4, icon: '🍶', req: 1, desc: '墨大夫误认的普通小瓶。瓶底似有绿痕，却还滴不出东西 —— 炼气后期方能激活。', unique: true }
  );

  // 饲灵丸：喂灵兽的丸子（材料一类，怪物也会掉）
  window.MATERIALS.push(
    { id: 'm_siling', name: '饲灵丸', icon: '🍘', rarity: 1, desc: '古修士喂灵兽的丸子。一颗不够饱，天天喂才长得起来。' }
  );

  // 突破系统新增材料（依合规定稿：天火液/九曲灵参丹/定灵丹/元磁神光前置）
  window.MATERIALS.push(
    { id: 'm_zhuguo',  name: '朱果',     icon: '🍎', rarity: 1, desc: '火山脚下红的果，定火性，天火液辅药。' },
    { id: 'm_huoling', name: '火灵草',   icon: '🌶', rarity: 1, desc: '生于火脉旁，叶尖常年带火星。天火液主引火之草。' },
    { id: 'm_jiuqu',   name: '九曲灵参', icon: '🪵', rarity: 3, desc: '根须九转如灵蛇，三百年以上方成。九曲灵参丹主药，增结婴几率。' },
    { id: 'm_dingling', name: '定灵玉',   icon: '🧿', rarity: 4, desc: '天星城拍卖会流出的玉胎，安魂定神。定灵丹之核，碎丹必备。' },
    { id: 'm_ningshen', name: '凝神花',   icon: '🪻', rarity: 2, desc: '夜开昼合，香气镇神。定灵丹辅药。' },
    { id: 'm_lingzhi',  name: '灵芝',     icon: '🍄', rarity: 1, desc: '百年灵芝，温养神识。定灵丹/九曲灵参丹辅药。' },
    { id: 'm_yuanci',   name: '元磁神山核心', icon: '🌀', rarity: 4, desc: '元磁神山最深处的磁核，重得拿不动。化神前置——修元磁神光就靠它。' }
  );

  // ========================= 四、兽卵从哪儿来 =========================
  // 不是满地都有：这几种东西的巢里才揣着卵，杀了捡回去孵。
  // （血玉蜘蛛卵另走一条路：虚天殿那一趟的收成，本就是枚卵。）
  const EGG_DROP = {
    bat: { id: 'egg_yunchi', chance: 0.020 },   // 吸血妖蝠：倒挂在洞顶，巢里混着鸟卵
    dujiao: { id: 'egg_mojiao', chance: 0.030 } // 毒蛟：蛟卵沉在潭底淤泥里
  };
  for (const k of Object.keys(EGG_DROP)) {
    const t = (window.ENEMY_TYPES || {})[k];
    if (t) t.eggDrop = EGG_DROP[k];
  }

  // ========================= 五、新增配方 =========================
  window.RECIPES.push(
    { id: 'r_tianhuo', kind: 'alchemy', name: '天火液', out: 'tianhuo', outN: 1, cost: 600, req: 56, rate: 0.6,
      mats: [['m_huodan', 1], ['m_huoling', 2], ['m_zhuguo', 1]],
      desc: '火蟾兽内丹为基（火属性妖丹），火灵草引火，朱果定火性。结丹辅助丹，闭死关前服下。' },
    { id: 'r_jiuqu', kind: 'alchemy', name: '九曲灵参丹', out: 'jiuqu', outN: 1, cost: 2500, req: 82, rate: 0.5,
      mats: [['m_jiuqu', 1], ['m_yusui', 1], ['m_lingzhi', 3]],
      desc: '三百年九曲灵参为主，玉髓引灵，灵芝温养。碎丹成婴几率大增。' },
    { id: 'r_dianling', kind: 'alchemy', name: '定灵丹', out: 'dianling', outN: 1, cost: 2200, req: 82, rate: 0.5,
      mats: [['m_dingling', 1], ['m_ningshen', 2], ['m_lingzhi', 3]],
      desc: '定灵玉为核，凝神花镇神，灵芝辅之。碎丹时安魂定神，防神识溃散（必备）。' },
    { id: 'r_moyuan', kind: 'alchemy', name: '魔元丹', out: 'moyuan', outN: 1, cost: 3600, req: 108, rate: 0.4,
      mats: [['m_yaodan', 3], ['m_xuesha', 2]],
      desc: '魔陀山秘法：妖丹为骨，血煞凝元。原著里韩立以玄玉换丹，此处折作玄玉灵材自炼 —— 三枚押上，化神才稳。' },
    { id: 'r_t_qingzhu', kind: 'forge', name: '青竹蜂云剑', out: 't_qingzhu', outN: 1, cost: 4800, req: 92, rate: 0.45,
      mats: [['m_jinlei', 1], ['m_gengjing', 2], ['m_yusui', 4]],
      desc: '金雷竹为本命剑骨，庚精为锋，玉髓刻符。韩立本命法宝之路的开端。' }
  );

  // ========================= 五(2)、三转重元功（P1-9） =========================
  // 原著：韩立筑基后期修此功，散功重修三次，每散一次修回来都比前一次厚，是结丹关键前置。
  // 游戏里作「结丹可选前置功法」——不卡门，习得后结丹品质与后续潜力更好。
  window.SKILLS.push(
    { id: 'sanzhong', name: '三转重元功', icon: '🔁', max: 3, minLv: 50, type: 'passive',
      effect: { xpMul: 0.06, regen: 0.3 },
      desc: '散功重修三次，每转一回境界更厚。结丹可选前置，转满三次再结丹，成色自不相同。' }
  );

  // ========================= 六、厉飞雨·双身份化名系统（P0-1） =========================
  // 原著：厉飞雨七玄门时期病逝（服抽髓丸透支寿元）。游戏改为战术化名系统，不进队伍、不参战。
  // 韩立干脏活时让「厉飞雨」背锅（黑声望），做好事以「韩天尊」本尊留名（白声望）。
  // 机制层在 game.js；此处只放数据与彩蛋文案。
  window.LIFEIYU = {
    unlockArc: 'qixuan',                 // 七玄门篇章·厉飞雨病逝后自动解锁
    unlockTip: '从此世间多了一个叫厉飞雨的恶人，而韩立……还是韩立。',
    // 弹幕彩蛋（结算画面概率弹出）
    blackEgg: ['杀人放火厉飞雨', '厉飞雨又背锅了', '韩老魔：谢兄弟赴死'],
    whiteEgg: ['救苦救难韩天尊', '双标韩立，名不虚传', '好人韩立，恶人厉飞雨'],
    achievement: { id: 'heibai', name: '黑白通吃', desc: '厉飞雨与韩天尊的声望都攒到极高' },
    fadeRealm: 112                       // 化神后马甲逐渐淡出
  };

  // 前三部的老规矩：往表里推完东西，要把总表重新拼一次，
  // 否则 Items.get 认不出新加的灵兽袋与兽卵（它查的是 ALL_ITEMS 这一份快照）
  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);
})();
