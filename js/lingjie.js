// ============================================================================
// 第五部：灵界篇（化神之后）
//
// 依《凡人修仙传》原著：
//   V8 初入灵界（化神 → 炼虚）  V9 灵界百族（炼虚 → 合体）
//   V10 魔界之战（合体 → 大乘） V11 真仙降世  V12 真仙降临
//
// 本轮落地：① 炼虚突破关（lv150，五行合一 + 腾龙丹）
//          ② V8 前两图：安远城（anyuan）、黑凤族领地（heifeng）
//          ③ 原著灵物：腾龙丹 / 合体丹 / 真灵之血 / 真灵鳞片 / 玄天斩灵剑 / 玄天仙藤
//
// 依据见 canon/灵界篇-蓝图.md、canon/progression.md、canon/geography.md
// ============================================================================
(function () {

  // ========================= 一、原著灵物（已核） =========================
  // 腾龙丹 V9C1364；合体丹 V10C1770；真灵之血 V9C1359；真灵鳞片 V8C1341；
  // 玄天斩灵剑 V8C1328；玄天仙藤 V5C633。
  // 禁用：炼虚丹 / 大乘丹 / 渡劫丹（原著 0 次）。
  window.ITEMS.push(
    { id: 'tenglong', name: '腾龙丹', rarity: 4, icon: '🐉', req: 150,
      desc: '芝龙果为主药，三万年一结果。炼虚级灵药，生服也能凭空涨六十年苦修（V9C1364）。',
      effect: { xpMul: 0.2 } },
    { id: 'heti', name: '合体丹', rarity: 4, icon: '💊', req: 200,
      desc: '炼虚后期冲击合体的丹药（V10C1770）。',
      effect: { maxhp: 240 } },
    { id: 't_xuantianjian', name: '玄天斩灵剑', rarity: 5, icon: '⚔', slot: 'weapon', req: 260,
      desc: '玄天之宝，风元大陆西北角出世（V8C1328）。斩灵之剑，非寻常法宝可比。',
      effect: { dmg: 0.6, atk: 0.2 }, unique: true }
  );
  window.MATERIALS.push(
    { id: 'm_zhenlingxue', name: '真灵之血', icon: '🩸', rarity: 4, desc: '真灵遗血。炼虚之后淬体凝元的上品灵物（V9C1359）。' },
    { id: 'm_zhenlinglin', name: '真灵鳞片', icon: '🐲', rarity: 3, desc: '真灵身上的一片鳞，坚胜寻常法宝（V8C1341）。' },
    { id: 'm_xuantianteng', name: '玄天仙藤', icon: '🌿', rarity: 4, desc: '玄天仙藤的一截，可炼玄天之宝（V5C633）。' }
  );
  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  // ========================= 二、炼虚突破关（lv150） =========================
  // 原著：进阶炼虚的关键是「五行合一」，须兼修多属性功法；单一属性难成（V7C1219）。
  // 腾龙丹为炼虚级灵药（V9C1364）。修为门槛沿用 breakLevelOk：lv-1 = 149（化神后期）。
  window.BREAKTHROUGH.push({
    lv: 150, realm: '炼虚初期', from: '化神后期',
    tip: '进阶炼虚的关键是「五行合一」——须兼修多属性功法，单一属性难成（V7C1219）。再以一炉腾龙丹压住灵压，才敢在灵界冲这一关（V9C1364）。',
    items: [['tenglong', 1]],
    mats: [],
    stones: 15000,
    chance: { step: 0.5 },   // 一枚腾龙丹五成；押两枚必成
    story: [{ id: 'heifeng', name: '灵界·黑凤族领地' }],
    lines: [
      ['韩立', '（人界之巅已过。灵界的第一道门，是五行合一。）'],
      ['旁白', '安远城外，灵气浓得化不开。韩立盘膝坐了三日，将五行之力一缕缕拧成一股。'],
      ['韩立', '（金木水火土，缺一行，炼虚便成空谈。）'],
      ['旁白', '腾龙丹入腹，六十年苦修之功在经脉里炸开。'],
      ['旁白', '轰——丹田里那团真元，第一次摸到了「无穷」的边。'],
      ['韩立', '（炼虚。寿元，终于不再是悬在头顶的刀。）']
    ]
    },
    {
      lv: 200, realm: '合体初期', from: '炼虚后期',
      tip: '炼虚之上是合体。合体丹一枚、真灵之血两滴，再渡三千年一次的大天劫，才谈得上合体（V10C1770 / V9C1359 / V7C1219）。',
      items: [['heti', 1]],
      mats: [['m_zhenlingxue', 2]],
      stones: 30000,
      chance: { step: 0.34 },   // 合体丹一枚三成四；三枚必成
      story: [{ id: 'guanghan', name: '灵界·广寒界' }],
      lines: [
        ['韩立', '（炼虚之后，是合体。三千年一次的大天劫，躲不过。）'],
        ['旁白', '广寒界深处，寒气凝作白雾。韩立盘坐在万年寒玉上，真灵之血在掌心里烧成一缕赤线。'],
        ['韩立', '（真灵之血淬体，合体丹压住灵压。成，则肉身与真元合一。）'],
        ['旁白', '大天劫自天顶压下，雷光在寒气里炸开。'],
        ['旁白', '丹入腹，血入骨。那一瞬间，肉身与元婴终于不再分彼此。'],
        ['韩立', '（合体。往后这一步，走的是真仙的路。）']
      ]
    }
  );

  // ========================= 三、篇章 =========================
  if (window.MAP_ARCS) {
    window.MAP_ARCS.push(
      { id: 'I', name: '灵界·初入', note: '飞升之后，五行合一' },
      { id: 'J', name: '灵界·百族', note: '风元大陆，广寒界' }
    );
  }

  // ========================= 四、地图 =========================
  window.MAPS.push(
    {
      id: 'anyuan', name: '安远城', pos: '灵界·安远城', arc: 'I',
      type: 'story', tag: '剧情',
      desc: '飞升灵界，落在一片陌生荒原。最近的城叫安远，城里有家天东商号。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'feisheng', next: 'heifeng',
      reward: { stones: 12000, mats: [['m_zhenlinglin', 1]] },
      clearTitle: '灵界第一课',
      clearDesc: '天东商号的掌柜收了灵石，才肯告诉他：灵界不认人界那一套，这里讲族、讲坊市、讲灵石。'
    },
    {
      id: 'heifeng', name: '黑凤族领地', pos: '灵界·黑凤族 荒岭', arc: 'I',
      type: 'boss', tag: '剧情战',
      desc: '黑凤族的荒岭上，三头妖修拦路。韩立要的，是它们守着的真灵鳞片。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'anyuan', next: 'lianxu',
      diff: 3.5, bossAt: 0, intro: 'heifeng', outro: 'heifeng_out',
      enemies: ['yaoshou2', 'shixiao', 'dajinxiu'],
      elites: ['黑凤族长老', '荒岭妖将'],
      mats: ['m_zhenlinglin', 'm_yaodan', 'm_gengjing'],
      boss: { kind: 'beast', name: '黑凤族三妖', hp: 52000, spd: 66, dmg: 96, r: 23, spr: 'haishou', scale: 6.2 },
      reward: { stones: 18000, items: ['tenglong'], mats: [['m_zhenlingxue', 1], ['m_zhenlinglin', 3]] },
      clearTitle: '荒岭已清',
      clearDesc: '三妖伏诛，鳞片与一滴真灵之血到手。腾龙丹的炉子，有着落了。'
    },
    {
      // 破境图：endLevel 必须等于炼虚关 lv150，洞府「突破」靠它进场（同 jieying / jiezi）
      id: 'lianxu', name: '安远城外·五行合一', pos: '灵界·安远城外 荒原', arc: 'I',
      type: 'story', tag: '剧情',
      desc: '腾龙丹在手，五行之力也拧成了一股。灵界的第一道大关，就在这片荒原上过。',
      startLevel: 132, endLevel: 150, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'heifeng', next: 'fengyuan',
      reward: { stones: 20000, mats: [['m_zhenlingxue', 1]] },
      clearTitle: '炼虚已成',
      clearDesc: '五行归一，真元第一次摸到「无穷」的边。寿元不再是悬在头顶的刀。'
    },
    {
      id: 'fengyuan', name: '风元大陆', pos: '灵界·风元大陆', arc: 'J',
      type: 'story', tag: '剧情',
      desc: '已知三片大陆里最小的一块，种族却最多。玄天斩灵剑的卦象，就落在这片大陆的西北角。',
      startLevel: 150, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'lianxu', next: 'guanghan',
      reward: { stones: 24000, items: ['t_xuantianjian'], mats: [['m_zhenlinglin', 2]] },
      clearTitle: '西北角',
      clearDesc: '玄天斩灵剑出世。剑身上的灵纹还未认主，却已让周围的灵气退了半尺。'
    },
    {
      id: 'guanghan', name: '广寒界', pos: '灵界·广寒界', arc: 'J',
      type: 'boss', tag: '剧情战',
      desc: '灵界有名的大秘境，寒气三千年不散。界里守着的东西，比寒气更难缠。',
      startLevel: 150, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'fengyuan', next: 'heti_guan',
      diff: 3.7, bossAt: 0, intro: 'guanghan', outro: 'guanghan_out',
      enemies: ['kui2', 'dajinxiu', 'zhengdao'],
      elites: ['广寒界守灵', '寒魄傀儡'],
      mats: ['m_zhenlingxue', 'm_zhenlinglin', 'm_yaodan'],
      boss: { kind: 'mo', name: '广寒界·千机子', hp: 68000, spd: 68, dmg: 112, r: 24, spr: 'neimen', scale: 6.2 },
      reward: { stones: 30000, items: ['heti'], mats: [['m_zhenlingxue', 2], ['m_zhenlinglin', 2]] },
      clearTitle: '广寒界开',
      clearDesc: '守界的傀儡碎了一地。寒气深处，一枚合体丹与两滴真灵之血，静静躺在玉台上。'
    },
    {
      // 破境图：endLevel 必须等于合体关 lv200
      id: 'heti_guan', name: '广寒界·合体', pos: '灵界·广寒界 寒玉台', arc: 'J',
      type: 'story', tag: '剧情',
      desc: '合体丹在手，真灵之血也够了。三千年一次的大天劫，就在这寒玉台上过。',
      startLevel: 150, endLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'guanghan', next: null,
      reward: { stones: 30000, mats: [['m_zhenlingxue', 1]] },
      clearTitle: '合体已成',
      clearDesc: '肉身与真元合一。灵界的第二道大关，过去了。'
    }
  );

  // 飞升图接灵界（原 next 为 null）
  const FS = window.MAPS.find(m => m.id === 'feisheng');
  if (FS) FS.next = 'anyuan';

  // ========================= 五、对白 =========================
  Object.assign(window.MAP_STORIES, {
    // 安远城是 story 图：进场播 MAP_STORIES[id]，播完即通关（无 outro）
    anyuan: [
      ['旁白', '白光散尽，脚下是一片陌生的荒原。风里有股说不出的灵气，浓得压人。'],
      ['韩立', '（这就是灵界。人界的天地元气，跟这里一比，像井水比江海。）'],
      ['旁白', '走了半日，荒原尽头立着一座土城。城门上两个字：安远。'],
      ['韩立', '（先找坊市，摸清这里的规矩。灵石怎么换、话怎么说，一样错不得。）'],
      ['旁白', '城里有家天东商号，掌柜是个精瘦老者，抬眼扫了他一下。'],
      ['掌柜', '初代飞升的？稀客。要换灵石，还是买灵物？'],
      ['韩立', '（初代飞升。这四个字，往后怕是会惹麻烦。）'],
      ['韩立', '先看看货。灵界的行情，我还摸不准。'],
      ['旁白', '掌柜笑了笑，把几片鳞甲摆上柜台：黑凤族荒岭上出的真灵鳞，炼虚修士抢着要。'],
      ['韩立', '（炼虚要五行合一，也得先有灵物压住灵压。腾龙丹的主药，就在那片岭上。）'],
      ['旁白', '出了城往北，荒岭的轮廓在天边压着，像一道黑色的墙。']
    ],

    // 黑凤族领地：boss 图，intro 播完刷 boss
    heifeng: [
      ['旁白', '荒岭上风硬如刀。三头妖修拦在石道中央，为首的额上有一道黑羽纹。'],
      ['黑凤族妖修', '人族的飞升修士？这片岭是黑凤族的地界，退回去。'],
      ['韩立', '（三头，都是炼虚初期的气息。硬拼不值，先看它们的阵脚。）'],
      ['旁白', '石道两侧的岩缝里，隐隐有鳞光。'],
      ['韩立', '（真灵鳞片。果然在这里。）'],
      ['黑凤族妖修', '既然不走，那就留下吧。'],
      ['旁白', '三妖散开，黑羽纹亮起，荒岭上的风忽然倒卷。']
    ],
    heifeng_out: [
      ['旁白', '三妖伏地，荒岭静下来。岩缝里的鳞片被一片片抠出来，还有一滴凝在石心上的血。'],
      ['韩立', '（真灵之血。腾龙丹的主药，有了。）'],
      ['旁白', '他把鳞片收进储物袋，回头望了一眼安远城的方向。'],
      ['韩立', '（五行合一，还差一门兼修的功法。天渊城……得去一趟。）'],
      ['旁白', '荒岭尽头，天光裂开一线。那是天渊城的方向。']
    ],

    // 炼虚破境图（story + endLevel 150）：进场播完即 finishMap → 走破境结算
    lianxu: [
      ['旁白', '安远城外的荒原，灵气浓得像雾。韩立寻了一处背风的石坳，坐了下来。'],
      ['韩立', '（五行之力，人界时只能一味一味地修。到了灵界，才谈得上合一。）'],
      ['旁白', '金、木、水、火、土，五缕灵气自经脉里升起，在丹田外绕成一个缓慢的环。'],
      ['韩立', '（差一行，环就断。断了，炼虚便是空谈。）'],
      ['旁白', '腾龙丹入腹，六十年苦修之功在经脉里炸开。那环越转越急，终于拧成一股。'],
      ['韩立', '（合。）'],
      ['旁白', '轰——丹田里那团真元，第一次摸到了「无穷」的边。荒原上的风，忽然静了。']
    ],

    fengyuan: [
      ['旁白', '风元大陆的风，带着草木与铁锈混在一起的味道。三片大陆里它最小，种族却最多。'],
      ['韩立', '（人多的地方，消息也多。玄天斩灵剑的卦象，就落在这片大陆的西北角。）'],
      ['旁白', '一路往西北，荒原上渐渐立起断壁残垣。有人在这里打过一场大仗。'],
      ['韩立', '（剑意还没散。这把剑，出世没多久。）'],
      ['旁白', '断壁中央插着一柄剑，剑身无光，周围的灵气却绕着它退开半尺。'],
      ['韩立', '（玄天斩灵剑。剑是好剑，可惜我现在的修为还压不住它。）'],
      ['旁白', '他把剑收进储物袋。西北的风里，远处浮着一座白得发冷的山谷——广寒界。']
    ],

    guanghan: [
      ['旁白', '广寒界的寒气，不是冷，是往骨头缝里钻。走了半里，眉毛上已结了霜。'],
      ['韩立', '（三千年不散的寒气。这里头压着的东西，不会小。）'],
      ['旁白', '寒玉台前，一具青铜色的傀儡缓缓站起，关节转动时发出干涩的响声。'],
      ['千机子', '……又一个来取合体丹的。'],
      ['韩立', '（它还有神智。这种傀儡，比死物难缠十倍。）'],
      ['千机子', '过了我这一关，玉台上的东西，归你。'],
      ['旁白', '寒气骤然收紧，青铜傀儡的双眼亮起两点幽蓝。']
    ],
    guanghan_out: [
      ['旁白', '傀儡碎了，最后一缕神智散在寒气里。玉台上，一枚丹、两滴血，安安静静。'],
      ['韩立', '（合体丹。真灵之血。）'],
      ['旁白', '他把东西收好，在寒玉台上坐了下来。'],
      ['韩立', '（炼虚后期。再往上，是合体。三千年一次的大天劫，得在这里过。）'],
      ['旁白', '广寒界的风停了。寒玉台外，雷云正在聚。']
    ],

    heti_guan: [
      ['旁白', '寒玉台上，雷云压得极低。三千年一次的大天劫，来了。'],
      ['韩立', '（真灵之血淬体，合体丹压住灵压。肉身与真元，今日合一。）'],
      ['旁白', '第一道雷落下，寒气被劈开；第二道雷落下，寒玉台裂了。'],
      ['韩立', '（还差最后一步。）'],
      ['旁白', '丹入腹，血入骨。雷光里，那道一直分着的身与神，终于合在一处。'],
      ['韩立', '（合体。）'],
      ['旁白', '雷云散尽。广寒界的寒气，第一次退开了。']
    ]
  });

  // ========================= 六、场景底色 =========================
  Object.assign(window.MAP_SCENERY, {
    anyuan: { bg: { base: '#2b3348', a: '#333d55', b: '#222a3c' }, decor: [['rock', 0.22], ['tuft', 0.10]] },
    heifeng: { bg: { base: '#3a2f2a', a: '#463830', b: '#2c241f' }, decor: [['rock', 0.36], ['tree', 0.10]] },
    lianxu: { bg: { base: '#26303f', a: '#2e3a4b', b: '#1d2532' }, decor: [['rock', 0.30], ['tuft', 0.08]] },
    fengyuan: { bg: { base: '#2f3a2e', a: '#384633', b: '#242e23' }, decor: [['rock', 0.28], ['tuft', 0.16]] },
    guanghan: { bg: { base: '#26343d', a: '#2e4049', b: '#1c2830' }, decor: [['rock', 0.34], ['tuft', 0.04]] },
    heti_guan: { bg: { base: '#1f2a36', a: '#273443', b: '#18212b' }, decor: [['rock', 0.30], ['tuft', 0.03]] }
  });
  // late.js 合底色时还没有这几张图，这里手动补上
  for (const id of ['anyuan', 'heifeng', 'lianxu', 'fengyuan', 'guanghan', 'heti_guan']) {
    const m = window.MAPS.find(x => x.id === id);
    const sc = window.MAP_SCENERY[id];
    if (m && sc) { m.bg = sc.bg; m.decorScheme = sc.decor; }
  }

  // 新图计入主线数
  window.MAIN_MAP_COUNT = window.MAPS.filter(m => !m.side).length;

})();
