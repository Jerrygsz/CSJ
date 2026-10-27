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
    // noDrop：破境丹只该在剧情节点给一枚，任何怪都不随机爆 ——
    // 否则人界 82 级的 Boss 就能爆出灵界的腾龙丹，等于把炼虚关的门槛提前拆了。
    { id: 'tenglong', name: '腾龙丹', rarity: 4, icon: '🐉', req: 150, noDrop: true,
      desc: '芝龙果为主药，三万年一结果。炼虚级灵药，生服也能凭空涨六十年苦修（V9C1364）。',
      effect: { xpMul: 0.2 } },
    { id: 'heti', name: '合体丹', rarity: 4, icon: '💊', req: 200, noDrop: true,
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

  // ========================= 一(2)、化神之后的境界层 =========================
  // realmName() 只查 REALM_LAYERS；不补这一段，150/200/260/330/420 会显示成「化神后期」。
  // 原著：炼虚/合体/大乘为「中境界」，渡劫为「上境界」，真仙为飞升之后（V2C127）。
  // 注：原著大乘不分初/中/后，这里按等级段给「大乘期」，不改境界名。
  window.REALM_LAYERS.push(
    { lv: 150, name: '炼虚初期', hp: 2400,  dmg: 0.66, atk: 0.36, spd: 0.09, skill: 'nova',  note: '五行合一，寿元无穷' },
    { lv: 165, name: '炼虚中期', hp: 3000,  dmg: 0.72, atk: 0.39, spd: 0.09, skill: 'gourd', note: '真元如海' },
    { lv: 180, name: '炼虚后期', hp: 3800,  dmg: 0.78, atk: 0.42, spd: 0.10, skill: 'frost', note: '灵界一方之主' },
    { lv: 200, name: '合体初期', hp: 5200,  dmg: 0.90, atk: 0.50, spd: 0.11, skill: 'sword', note: '肉身与真元合一' },
    { lv: 220, name: '合体中期', hp: 6800,  dmg: 1.00, atk: 0.56, spd: 0.12, skill: 'nova',  note: '三千年大劫' },
    { lv: 240, name: '合体后期', hp: 8600,  dmg: 1.10, atk: 0.62, spd: 0.12, skill: 'frost', note: '灵界顶层' },
    { lv: 260, name: '大乘期',   hp: 12000, dmg: 1.32, atk: 0.74, spd: 0.14, skill: 'sword', note: '大乘，渡劫前最后一步' },
    { lv: 300, name: '大乘期',   hp: 17000, dmg: 1.55, atk: 0.86, spd: 0.16, skill: 'nova',  note: '三劫已过，只待仙劫' },
    { lv: 330, name: '渡劫期',   hp: 26000, dmg: 1.85, atk: 1.00, spd: 0.18, skill: 'sword', note: '九劫压顶' },
    { lv: 420, name: '真仙',     hp: 48000, dmg: 2.40, atk: 1.30, spd: 0.20, skill: 'nova',  note: '真仙之身' }
  );

  // ========================= 二、炼虚突破关（lv150） =========================
  // 原著：进阶炼虚的关键是「五行合一」，须兼修多属性功法；单一属性难成（V7C1219）。
  // 腾龙丹为炼虚级灵药（V9C1364）。修为门槛沿用 breakLevelOk：lv-1 = 149（化神后期）。
  window.BREAKTHROUGH.push({
    lv: 150, realm: '炼虚初期', from: '化神后期',
    canonCave: 'tycave',
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
      canonCave: 'tycave',
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
    },
    {
      lv: 260, realm: '大乘期', from: '合体后期',
      canonCave: 'xlcave',
      tip: '合体之后是大乘。原著里这一步不吃丹——须过五行之劫、真雷劫、心魔之劫三关，以玄天仙藤护身、真灵之血续命（V11C2176–2186）。',
      items: [],
      mats: [['m_xuantianteng', 1], ['m_zhenlingxue', 3]],
      stones: 60000,
      chance: { min: 1 },
      story: [{ id: 'xiaoling', name: '灵界·小灵天' }],
      lines: [
        ['韩立', '（合体之上，是大乘。原著里大乘不分几层，只有一道坎。）'],
        ['旁白', '三劫自天顶压下：五行之劫裂体，真雷劫焚脉，心魔之劫照见心底最怕的东西。'],
        ['韩立', '（玄天仙藤护住肉身，真灵之血续住一口气。心魔那一关……我自己过。）'],
        ['旁白', '雷火散尽，心魔退去。丹田里的真元沉了下去，沉得像一片海。'],
        ['韩立', '（大乘。）']
      ]
    },
    {
      lv: 330, realm: '渡劫期', from: '大乘期',
      canonCave: 'xlcave',
      tip: '飞升之前最后一关是仙劫。九劫压顶，玄天仙藤护身、真灵之血续命（V12C2422 / V7C1219）。',
      items: [],
      mats: [['m_xuantianteng', 2], ['m_zhenlingxue', 4]],
      stones: 100000,
      chance: { min: 1 },
      story: [{ id: 'sanjie', name: '灵界·三劫' }],
      lines: [
        ['韩立', '（大乘之后，是渡劫。九道仙劫，一道比一道狠。）'],
        ['旁白', '九劫压顶，天光被劈成碎线。玄天仙藤在身外织成一层青网，真灵之血在经脉里烧。'],
        ['韩立', '（撑过去。）'],
        ['旁白', '第九道劫雷落下时，天地静了一瞬。'],
        ['韩立', '（渡劫。）']
      ]
    },
    {
      lv: 420, realm: '真仙', from: '渡劫期',
      canonCave: 'xlcave',
      tip: '渡过九劫，铸成真仙之身。玄天仙藤三截、真灵之血五滴，缺一样都撑不到最后（V12C2419–2422）。',
      items: [],
      mats: [['m_xuantianteng', 3], ['m_zhenlingxue', 5]],
      stones: 180000,
      chance: { min: 1 },
      story: [{ id: 'jiujie', name: '灵界·九劫现' }],
      lines: [
        ['韩立', '（渡劫之后，是铸真仙之身。）'],
        ['旁白', '玄天仙藤三截尽数化开，真灵之血五滴入骨。韩立的影子在雷光里一寸寸变了形状。'],
        ['韩立', '（这一身，不再是凡胎。）'],
        ['旁白', '雷光散尽，荒原上立着一个人。眉眼还是那眉眼，气息却已不在此界之中。'],
        ['韩立', '（真仙。）']
      ]
    }
  );

  // ========================= 三、篇章 =========================
  if (window.MAP_ARCS) {
    window.MAP_ARCS.push(
      { id: 'I', name: '灵界·初入', note: '飞升之后，五行合一' },
      { id: 'J', name: '灵界·百族', note: '风元大陆，广寒界' },
      { id: 'K', name: '灵界·魔劫', note: '圣岛，魔界之战' },
      { id: 'L', name: '真仙', note: '三劫，九劫，飞升仙界' }
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
      unlock: 'guanghan', next: 'liangzu',
      reward: { stones: 30000, mats: [['m_zhenlingxue', 1]] },
      clearTitle: '合体已成',
      clearDesc: '肉身与真元合一。灵界的第二道大关，过去了。'
    },

    // ---------------- V10 魔界之战 ----------------
    {
      // 过场：原著 C1766。天渊城长老会招人，招不动韩立；真正的消息是「魔劫数百年内降临」。
      id: 'liangzu', name: '两族大乘', pos: '灵界·天渊城', arc: 'K',
      type: 'story', tag: '剧情',
      desc: '天渊城长老会。人妖两族凑不齐十个合体长老，谁都不肯把手里的人放出来。',
      startLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'heti_guan', next: 'shengdao',
      reward: { stones: 32000, mats: [['m_zhenlinglin', 2]] },
      clearTitle: '长老会一席',
      clearDesc: '他没进长老会。可那天听到的话，比进长老会值钱——莫简离亲入真魔界，魔界在整军。'
    },
    {
      id: 'shengdao', name: '圣岛', pos: '灵界·圣岛', arc: 'K',
      type: 'story', tag: '剧情',
      desc: '人族圣地。两族大乘在此议事，灵皇大比的名分也从这里出。',
      startLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'liangzu', next: 'mojie',
      reward: { stones: 35000, mats: [['m_zhenlinglin', 3]] },
      clearTitle: '圣岛一行',
      clearDesc: '圣岛的使者只说了一句话：魔界的门，快开了。'
    },
    {
      id: 'mojie', name: '魔界之约', pos: '灵界·魔界入口', arc: 'K',
      type: 'story', tag: '剧情',
      desc: '荒原尽头裂开一道黑口。魔界的约，得有人去赴。',
      startLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'shengdao', next: 'moban',
      reward: { stones: 40000, mats: [['m_zhenlingxue', 1]] },
      clearTitle: '魔界之约',
      clearDesc: '约定了。倚天城那边，魔族已经动了。'
    },
    {
      // 过场：原著 C1869「魔斑降世」。魔斑一出，魔劫的时间表就提前了。
      id: 'moban', name: '魔斑降世', pos: '灵界·天渊城外 荒原', arc: 'K',
      type: 'story', tag: '剧情',
      desc: '荒原上空裂出一块黑斑，不散，也不动。天渊城的人还没来，懂行的人已经脸白了。',
      startLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'mojie', next: 'yitian',
      reward: { stones: 38000, mats: [['m_zhenlingxue', 1]] },
      clearTitle: '魔斑已现',
      clearDesc: '魔斑出现了，就不止这一处。半年、一年，魔界总会从这里挤进来。'
    },
    {
      id: 'yitian', name: '倚天城·人魔之战', pos: '灵界·倚天城', arc: 'K',
      type: 'boss', tag: '剧情战',
      desc: '魔族大军压到倚天城下。城墙上站满了人，也站满了不敢退的人。',
      startLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'moban', next: 'huangquan',
      diff: 3.9, bossAt: 0, intro: 'yitian', outro: 'yitian_out',
      enemies: ['gui2', 'moxiu2', 'dajinxiu'],
      elites: ['魔族魔将', '血魔卫'],
      mats: ['m_zhenlingxue', 'm_yaodan', 'm_gangyin'],
      boss: { kind: 'mo', name: '魔族魔将', hp: 85000, spd: 68, dmg: 130, r: 24, spr: 'mo', scale: 6.4 },
      reward: { stones: 50000, mats: [['m_zhenlingxue', 2]] },
      clearTitle: '倚天城守住了',
      clearDesc: '魔将伏诛，魔潮退去。城墙上的人，第一次敢坐下。'
    },
    {
      id: 'huangquan', name: '黄泉地火', pos: '灵界·魔界 黄泉地火', arc: 'K',
      type: 'boss', tag: '剧情战',
      desc: '魔界深处的地火，烧的是魂魄。镇魔锁锁着的东西，比地火更烫。',
      startLevel: 210, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'yitian', next: 'moyuan',
      diff: 4.0, bossAt: 0, intro: 'huangquan', outro: 'huangquan_out',
      enemies: ['gui2', 'moxiu2', 'guixiu'],
      elites: ['镇魔锁守灵', '黄泉鬼将'],
      mats: ['m_zhenlingxue', 'm_yaodan', 'm_gangyin'],
      boss: { kind: 'mo', name: '镇魔锁·车骑恭', hp: 95000, spd: 70, dmg: 140, r: 24, spr: 'guixiu', scale: 6.4 },
      reward: { stones: 60000, mats: [['m_xuantianteng', 1], ['m_zhenlingxue', 2]] },
      clearTitle: '黄泉火熄',
      clearDesc: '镇魔锁断了。一段玄天仙藤落在灰里，还带着地火的温度。'
    },
    {
      // 过场：原著 C2018「魔源海」。洗灵池与净灵莲在魔界最东边的岛上，三条路，都要走一次。
      id: 'moyuan', name: '魔源海', pos: '魔界·魔源海', arc: 'K',
      type: 'story', tag: '剧情',
      desc: '魔界最东边的一片海，海上没有岛，只有雾。伪魔珠压着气息，压不住海里的东西。',
      startLevel: 215, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'huangquan', next: 'xiaoling',
      reward: { stones: 65000, mats: [['m_zhenlingxue', 2], ['m_zhenlinglin', 2]] },
      clearTitle: '魔源海已过',
      clearDesc: '洗灵池没找到，净灵莲也没开。可魔源海这一趟，把合体后期的心境走实了。'
    },
    {
      id: 'xiaoling', name: '小灵天', pos: '灵界·小灵天', arc: 'K',
      type: 'boss', tag: '剧情战',
      desc: '魔界里藏着一方小世界。小灵天的主人，守着一炉不该有的火。',
      startLevel: 220, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'moyuan', next: 'sanjie',
      diff: 4.1, bossAt: 0, intro: 'xiaoling', outro: 'xiaoling_out',
      enemies: ['kui2', 'dajinxiu', 'zhengdao'],
      elites: ['小灵天守', '灵天傀'],
      mats: ['m_xuantianteng', 'm_zhenlingxue', 'm_yaodan'],
      boss: { kind: 'mo', name: '小灵天之主', hp: 105000, spd: 72, dmg: 150, r: 25, spr: 'neimen', scale: 6.6 },
      reward: { stones: 70000, mats: [['m_xuantianteng', 1], ['m_zhenlingxue', 2]] },
      clearTitle: '小灵天开',
      clearDesc: '一方小世界落到手里。合体后期到此为止，再往上，是大乘。'
    },

    // ---------------- V11 / V12 大乘 · 渡劫 · 真仙 ----------------
    {
      id: 'sanjie', name: '三劫·进阶大乘', pos: '灵界·荒原 劫云下', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '五行之劫、真雷劫、心魔之劫。三劫过尽，才是大乘。',
      startLevel: 220, endLevel: 260, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'xiaoling', next: 'jiujie',
      reward: { stones: 80000, mats: [['m_zhenlingxue', 2]] },
      clearTitle: '大乘已成',
      clearDesc: '三劫散尽，真元沉成一片海。大乘。'
    },
    {
      id: 'jiujie', name: '九劫现', pos: '灵界·荒原 劫云下', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '九道仙劫压顶。过得去，才谈得上飞升。',
      startLevel: 260, endLevel: 330, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'sanjie', next: 'zhenxian',
      reward: { stones: 120000 },
      clearTitle: '九劫已过',
      clearDesc: '第九道劫雷落下又散去。天地间，再没有什么能压住他了。'
    },
    {
      id: 'zhenxian', name: '真仙之身', pos: '灵界·荒原 雷光中', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '渡劫之后，铸真仙之身。',
      startLevel: 330, endLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'jiujie', next: 'fsjie',
      reward: { stones: 160000 },
      clearTitle: '真仙',
      clearDesc: '一身不再是凡胎。眉眼还是那眉眼，气息已不在此界。'
    },
    {
      // 独立关卡（原著 C2445）：九劫只是前奏，真正的飞升之劫在正午阳气最浓时落下。
      // 天外魔君当年放过话——「你渡那飞升之劫之时，本座一定邀遍附近界面所有魔君前来阻你飞升」。
      id: 'fsjie', name: '飞升之劫', pos: '灵界·荒原 劫云下', arc: 'L',
      type: 'boss', tag: '终局',
      desc: '正午，阳气最浓的时候。劫云压到头顶百丈，云里还有别的东西在等。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'zhenxian', next: 'xianjie',
      diff: 4.8, bossAt: 0, intro: 'fsjie', outro: 'fsjie_out',
      enemies: ['gui2', 'moxiu2', 'guixiu'],
      elites: ['魔君化影', '劫雷凝形'],
      mats: ['m_zhenlingxue', 'm_xuantianteng', 'm_zhenlinglin'],
      boss: { kind: 'mo', name: '天外魔君·化身', hp: 240000, spd: 86, dmg: 260, r: 27, spr: 'mo', scale: 7.0 },
      reward: { stones: 180000, mats: [['m_xuantianteng', 1]] },
      clearTitle: '劫已过',
      clearDesc: '魔君退去，劫雷散尽。天上裂开一道真真正正的门——那不是劫，是路。'
    },
    {
      id: 'xianjie', name: '飞升仙界', pos: '仙界·接引台', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '接引台在前。人界、灵界、魔界，都留在身后了。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'fsjie', next: null,
      reward: { stones: 200000 },
      clearTitle: '飞升仙界',
      clearDesc: '一道白光冲天而起。凡人韩立的故事，到此为止。'
    },

    // ================= 后期支线（奇遇开启，side 图） =================
    {
      id: 'linghuang', side: true, sorder: 21, name: '灵皇大比', pos: '灵界·圣岛 擂场', arc: 'K',
      type: 'boss', tag: '支线', unlockBy: 'e_linghuang',
      desc: '灵皇大比，灵界百族抢名分的地方。台上只认胜负，不认来历。',
      startLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: null, next: null,
      diff: 3.8, bossAt: 0, intro: 'linghuang', outro: 'linghuang_out',
      enemies: ['zhengdao', 'moxiu2', 'dajinxiu'],
      elites: ['他族擂主', '灵将'],
      mats: ['m_zhenlinglin', 'm_yaodan', 'm_gengjing'],
      boss: { kind: 'mo', name: '灵皇大比·擂主', hp: 80000, spd: 68, dmg: 125, r: 23, spr: 'neimen', scale: 6.2 },
      reward: { stones: 45000, mats: [['m_zhenlingxue', 1], ['m_zhenlinglin', 2]] },
      clearTitle: '擂主已下',
      clearDesc: '台上只剩他一个人。名分这种东西，打出来比求来快。'
    },
    {
      id: 'zhandacheng', side: true, sorder: 22, name: '斩大乘', pos: '灵界·荒原', arc: 'L',
      type: 'boss', tag: '支线', unlockBy: 'e_zhandacheng',
      desc: '一名大乘修士拦路，说是要试试「新晋大乘」的斤两。',
      startLevel: 260, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: null, next: 'shengshi',
      diff: 4.2, bossAt: 0, intro: 'zhandacheng', outro: 'zhandacheng_out',
      enemies: ['kui2', 'dajinxiu', 'moxiu2'],
      elites: ['大乘随侍', '护道傀儡'],
      mats: ['m_xuantianteng', 'm_zhenlingxue', 'm_yaodan'],
      boss: { kind: 'mo', name: '拦路大乘', hp: 130000, spd: 74, dmg: 175, r: 25, spr: 'mo', scale: 6.6 },
      reward: { stones: 80000, mats: [['m_xuantianteng', 1], ['m_zhenlingxue', 2]] },
      clearTitle: '大乘之血',
      clearDesc: '同为大乘，他输在准备不足。玄天仙藤落了一截。'
    },
    {
      // 斩大乘的后续：圣岛不会白看着一位大乘死在外面。只能由「斩大乘」打通后接出。
      id: 'shengshi', side: true, sorder: 28, name: '圣岛使者再来', pos: '灵界·荒原', arc: 'L',
      type: 'story', tag: '支线',
      desc: '斩了大乘的第三天，荒原上来了一位白袍使者。他没带剑，只带了一句话。',
      startLevel: 260, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: null, next: null,
      reward: { stones: 50000, mats: [['m_zhenlingxue', 1]] },
      clearTitle: '圣岛的问话',
      clearDesc: '圣岛不问对错，只问一句：「你还要往上走吗。」答了这句，飞升之劫就躲不掉了。'
    },
    {
      id: 'heihu', side: true, sorder: 23, name: '黑葫城', pos: '魔界·黑葫城', arc: 'L',
      type: 'story', tag: '支线', unlockBy: 'e_heihu',
      desc: '魔界边城，黑葫城里什么都卖，什么都不问来路。',
      startLevel: 260, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: null, next: null,
      reward: { stones: 30000, mats: [['m_xuantianteng', 1]] },
      clearTitle: '黑葫一游',
      clearDesc: '城里的规矩：付得起灵石，就没人问你从哪来。'
    },
    {
      id: 'baiguang', side: true, sorder: 24, name: '白光界', pos: '魔界·白光界', arc: 'L',
      type: 'boss', tag: '支线', unlockBy: 'e_baiguang',
      desc: '魔界夹缝里的一方白光小界，界里钉着一枚土皇钉。',
      startLevel: 260, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: null, next: null,
      diff: 4.3, bossAt: 0, intro: 'baiguang', outro: 'baiguang_out',
      enemies: ['gui2', 'guixiu', 'dajinxiu'],
      elites: ['白光守界', '土皇钉傀'],
      mats: ['m_xuantianteng', 'm_zhenlingxue', 'm_yaodan'],
      boss: { kind: 'mo', name: '白光界·土皇钉', hp: 120000, spd: 72, dmg: 165, r: 24, spr: 'guixiu', scale: 6.4 },
      reward: { stones: 85000, mats: [['m_xuantianteng', 1], ['m_zhenlingxue', 2]] },
      clearTitle: '白光已散',
      clearDesc: '土皇钉被拔出来，白光界开始塌。最后一刻退出来，手里多了一截仙藤。'
    },
    {
      id: 'tianmo', side: true, sorder: 25, name: '天魔契约', pos: '灵界·荒原', arc: 'L',
      type: 'story', tag: '支线', unlockBy: 'e_tianmo',
      desc: '荒原上摆着一纸契约。签了，力量来得快；代价写在最后一行。',
      startLevel: 330, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: null, next: null,
      reward: { stones: 90000, mats: [['m_zhenlingxue', 2]] },
      clearTitle: '契约未签',
      clearDesc: '他把契约放回案上。韩立这一路，从不拿命换捷径。'
    },
    {
      id: 'diyi', side: true, sorder: 26, name: '第一大乘', pos: '灵界·荒原', arc: 'L',
      type: 'boss', tag: '支线', unlockBy: 'e_diyi',
      desc: '灵界「第一大乘」的名号，得有人来接。来的人，不打算让。',
      startLevel: 330, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: null, next: null,
      diff: 4.5, bossAt: 0, intro: 'diyi', outro: 'diyi_out',
      enemies: ['zhengdao', 'kui2', 'dajinxiu'],
      elites: ['第一大乘护法', '大乘傀儡'],
      mats: ['m_xuantianteng', 'm_zhenlingxue', 'm_yaodan'],
      boss: { kind: 'mo', name: '第一大乘', hp: 160000, spd: 78, dmg: 200, r: 26, spr: 'neimen', scale: 6.8 },
      reward: { stones: 120000, mats: [['m_xuantianteng', 2]] },
      clearTitle: '第一大乘',
      clearDesc: '他退了半步。灵界「第一大乘」这四个字，从此换了人。'
    },
    {
      id: 'huirenjie', side: true, sorder: 27, name: '重回人界', pos: '人界·越国 山边小村', arc: 'L',
      type: 'story', tag: '支线', unlockBy: 'e_huirenjie',
      desc: '飞升之前，回一趟人界。村口那棵老树还在。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: null, next: null,
      reward: { stones: 40000 },
      clearTitle: '尘缘已了',
      clearDesc: '父母坟上添了新土。韩家如今是越国的望族，没人认得他。'
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

    tianyuan: [
      ['旁白', '天渊城的坊市没有摊子，一层层石阁往上叠，阁前挂着各家旗号。'],
      ['韩立', '（天渊城。人妖两族共守的边城，坊市里百族的货都在过手。）'],
      ['旁白', '一家阁子里摆着两片真灵鳞，标价九千灵石。掌柜是个妖族老妪，指甲是青的。'],
      ['妖族掌柜', '人族的？鳞片你拿走，血不卖。血要等大主顾。'],
      ['韩立', '（血不卖。是真没有，还是她不卖我。）'],
      ['韩立', '那功法呢。'],
      ['妖族掌柜', '有。百脉炼宝诀、惊蛰十二变，都在后头柜上。价我写在牌上，不还价。'],
      ['韩立', '（两万六、四万二。灵界的价钱，比人界狠十倍，可这些东西人界根本没有。）'],
      ['旁白', '他把灵石数出去，换来两册功法和几片鳞，出门时回头看了一眼那层石阁。'],
      ['韩立', '（灵石在这儿才算钱。往后打出来的东西，也有地方折了。）']
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
    ],

    liangzu: [
      ['旁白', '天渊城偏殿。几位合体修士围坐，桌上摊着一卷名册，空着三个名字。'],
      ['谷长老', '韩道友，长老会还差三人。你肯入城，位置给你留着。'],
      ['韩立', '（十个长老凑不齐。这城里的事，比荒原上的妖还难缠。）'],
      ['韩立', '在下一心求道，入不得会。'],
      ['金越禅师', '那老夫直说。圣岛传了预警，莫简离大人亲入真魔界走了一趟。'],
      ['韩立', '（莫简离。人族唯一的大乘。）'],
      ['金越禅师', '魔界在整军备战。用不了千年，数百年内，就要挤进来。'],
      ['旁白', '殿里静了一瞬。没人反驳，也没人接话。'],
      ['韩立', '（魔劫。灵界几万年一回的大劫，让我赶上了。）']
    ],

    shengdao: [
      ['旁白', '圣岛在海中央，白得晃眼。岛上的建筑没有一面墙是直的。'],
      ['韩立', '（人族圣地。两族大乘在这里议事，我一个初入合体的，连坐的位置都没有。）'],
      ['圣岛使者', '魔界的门要开了。倚天城挡不住。'],
      ['韩立', '（这不是请我议事，是点我的名。）'],
      ['韩立', '在下能做什么？'],
      ['圣岛使者', '去魔界。把该断的东西断掉。'],
      ['旁白', '他没答应，也没拒绝。回程的船上，海风里已经带了血腥味。']
    ],
    mojie: [
      ['旁白', '荒原尽头，空间像被谁撕开一道口子。黑气从裂缝里往外冒。'],
      ['韩立', '（魔界。进去容易，出来难。）'],
      ['旁白', '裂缝前立着一块碑，碑上刻着两个字：倚天。'],
      ['韩立', '（先去倚天城。魔界的约，得在那里赴。）'],
      ['旁白', '他抬脚跨进裂缝。身后的荒原，一下子远了。']
    ],
    moban: [
      ['旁白', '出城三日，荒原上空裂出一块黑斑。不散，也不动，像一块贴在天空上的疤。'],
      ['海大少', '魔斑！不会错的，这是魔劫降临前的魔斑！'],
      ['韩立', '（海大少。他脸都白了。）'],
      ['白果儿', '魔斑出现只是说明侵蚀刚开始。据记载，到界面之力弱到魔族能进来，起码还有半年。'],
      ['韩立', '（半年。这半年，是给人准备的，也是给魔族准备的。）'],
      ['器灵子', '是不是真的魔斑，还得等天渊城的人来正式确认。'],
      ['海大少', '不用确认。真要是魔斑，整个地域就不会只有这一处。'],
      ['旁白', '韩立抬头看了很久。那道黑斑悬着的位置，正好在倚天城的方向。'],
      ['韩立', '（倚天城。那就先去倚天城。）']
    ],

    yitian: [
      ['旁白', '倚天城的城墙有三十丈高，墙下堆着的尸首比墙还高。'],
      ['魔族魔将', '人族的援军？就这么一个？'],
      ['韩立', '（一个够了。城里有我要保的人，城外有我要断的东西。）'],
      ['旁白', '魔将提刀。刀上的血还没干。'],
      ['韩立', '（合体初期的气息。硬拼不划算，先废它的刀。）']
    ],
    yitian_out: [
      ['旁白', '魔将倒下时，魔潮退了一线。城墙上有人喊了一声，接着是成千上万声。'],
      ['韩立', '（守住了。可魔界的门还开着。）'],
      ['旁白', '城南的方向，地火冲天。那是黄泉地火。'],
      ['韩立', '（下一站。）']
    ],

    huangquan: [
      ['旁白', '黄泉地火在魔界最深处，火是青的，烧起来没有声音。'],
      ['韩立', '（这火不烧身，烧魂。合体之后，神魂才勉强扛得住。）'],
      ['旁白', '火里锁着一个人形，锁链穿过它的肩胛，另一头钉在石壁上。'],
      ['车骑恭', '……放我出去。'],
      ['韩立', '（镇魔锁。锁的是它，也是这炉火。）'],
      ['旁白', '锁链一响，青火暴涨。']
    ],
    huangquan_out: [
      ['旁白', '锁断了，人影散了。灰里落下一截青藤，还带着地火的温度。'],
      ['韩立', '（玄天仙藤。原著里，这是炼玄天之宝的东西。）'],
      ['旁白', '他把仙藤收好，转身往小灵天的方向走。']
    ],
    moyuan: [
      ['旁白', '魔界最东边是海。海上没有岛，只有雾。船是抢来的，珠是伪魔珠，压得住气息，压不住海里的东西。'],
      ['千秋圣女', '洗灵池与净灵莲，按上界灵王留下的遗言，就在魔源海的一座岛上。'],
      ['韩立', '（千秋圣女。她要的是净灵莲，我要的是那条路。）'],
      ['陇家老祖', '三条路：借魔族巨城的传送阵，沿第五魔河入海，或者穿幻啸沙漠。'],
      ['韩立', '（三条路，各有各的死法。）'],
      ['千秋圣女', '陇道友筹划多年，总有一条走得通。'],
      ['旁白', '海雾散开一线。远处的水面下，浮起一片比岛还大的背脊。'],
      ['韩立', '（先过海。路的事，活着再商量。）']
    ],

    xiaoling: [
      ['旁白', '小灵天藏在魔界的夹缝里，一方天，一口井，一炉火。'],
      ['韩立', '（小世界。这种地方，最容易藏东西。）'],
      ['旁白', '井边坐着一个人，背对着他，手里拨着一炉将熄的火。'],
      ['小灵天之主', '你来得比我算的早。'],
      ['韩立', '（他算过。这种人，最麻烦。）'],
      ['旁白', '炉火忽然亮了，映得整片小灵天一片赤红。']
    ],
    xiaoling_out: [
      ['旁白', '小灵天的主人散了，一炉火落到韩立手里。火里有两截玄天仙藤。'],
      ['韩立', '（合体后期。再往上，是大乘。）'],
      ['旁白', '他抬头看天。小灵天的天很低，低得能看见劫云在聚。']
    ],

    sanjie: [
      ['旁白', '荒原上，劫云压了三层。五行之劫先落，金木水火土轮着劈。'],
      ['韩立', '（玄天仙藤护体。真灵之血续命。三劫，一劫都不能躲。）'],
      ['旁白', '真雷劫落下时，经脉像被烧红的铁丝穿过。心魔之劫最后到，照见他这一路杀过的人、负过的人。'],
      ['韩立', '（……都过去了。我还活着。）'],
      ['旁白', '三劫散尽，丹田里的真元沉下去，沉成一片海。'],
      ['韩立', '（大乘。）']
    ],
    jiujie: [
      ['旁白', '九道仙劫，一道比一道狠。第九道落下时，天是白的，地是白的，什么都看不见。'],
      ['韩立', '（撑住。）'],
      ['旁白', '白光里，他听见自己的骨头一寸寸碎，又一寸寸长回去。'],
      ['韩立', '（再来。）'],
      ['旁白', '第九道劫雷散尽。天地静得能听见血滴在石头上的声音。']
    ],
    zhenxian: [
      ['旁白', '玄天仙藤三截化开，真灵之血五滴入骨。雷光里，他的影子变了形状。'],
      ['韩立', '（这一身，不再是凡胎。）'],
      ['旁白', '雷光散尽，荒原上立着一个人。眉眼还是那眉眼，气息却已不在此界之中。'],
      ['韩立', '（真仙。）']
    ],
    fsjie: [
      ['旁白', '正午。阳气最浓的那一刻，劫云压到头顶百丈。'],
      ['韩立', '（九劫都过了。这一劫，不一样。）'],
      ['旁白', '云里翻出一张脸。不是雷，是魔。'],
      ['天外魔君', '本座说过——你渡飞升之劫，本座必来。'],
      ['韩立', '（天外魔君。当年那句话，他记到今天。）'],
      ['韩立', '来了，就别走了。'],
      ['旁白', '劫雷与魔气一齐落下。荒原上，只剩一个人还站着。']
    ],
    fsjie_out: [
      ['旁白', '魔君的化身散了，最后一道劫雷也散了。荒原安静得不像刚打过一场。'],
      ['韩立', '（金罡灭魔神雷还剩三成。够了。）'],
      ['旁白', '天上裂开一道门。门里没有雷，也没有魔，只有光。'],
      ['韩立', '（接引台。原来在这里。）'],
      ['旁白', '他抬脚往光里走。身后，灵界的风第一次没有跟上来。']
    ],
    xianjie: [
      ['旁白', '接引台在云上，白得像一块没有字的碑。'],
      ['韩立', '（人界、灵界、魔界。走了一辈子，原来只是为了站到这里。）'],
      ['旁白', '台上没有接引的人，只有一道门。门后是光。'],
      ['韩立', '（走了。）'],
      ['旁白', '他跨进门里。身后的三界，一下子远了。']
    ],

    // ---- 后期支线对白 ----
    linghuang: [
      ['旁白', '灵皇大比的擂场，四周围着百族的旗。台上没有规矩，只有胜负。'],
      ['他族擂主', '人族？这些年人族的名分，都是靠嘴争的。'],
      ['韩立', '（台上只认胜负。那就用胜负说话。）'],
      ['旁白', '擂主先动，一道灵光直取面门。']
    ],
    linghuang_out: [
      ['旁白', '擂主倒下去的时候，四周静了一瞬，接着是压不住的议论声。'],
      ['圣岛使者', '名分，有了。'],
      ['韩立', '（名分这种东西，打出来比求来快。）'],
      ['旁白', '他把剑收回鞘里，没看台下的旗。']
    ],
    zhandacheng: [
      ['旁白', '荒原上站着一个青袍人，气息沉得像一座山。'],
      ['大乘修士', '新晋的大乘？我来试试。'],
      ['韩立', '（同为大乘。这一战，躲不过。）'],
      ['韩立', '出手吧。']
    ],
    zhandacheng_out: [
      ['旁白', '青袍人退了三步，血从袖口滴下来。他看了韩立很久，转身走了。'],
      ['韩立', '（同为大乘，他输在准备不足。）'],
      ['旁白', '地上落着一截玄天仙藤，是他随身带的。']
    ],
    shengshi: [
      ['旁白', '荒原上，白袍使者站在那具尸首旁边，看了很久那滩血。'],
      ['圣岛使者', '死的是大乘。灵界的大乘，一只手数得过来。'],
      ['韩立', '（他不是来问罪的。他是来称我的斤两。）'],
      ['韩立', '他要试我，我奉陪。'],
      ['圣岛使者', '圣岛不问对错，只问一句——你还要往上走吗。'],
      ['韩立', '（往上。往上是什么，他比我清楚。）'],
      ['韩立', '走。'],
      ['旁白', '使者点了下头，转身走进风里。走前留了一句：飞升那日，天外魔君会来。']
    ],
    heihu: [
      ['旁白', '黑葫城没有城墙，只有一圈黑石。城门口没人盘问，也没人抬眼。'],
      ['韩立', '（魔界的边城。什么都卖，什么都不问来路。）'],
      ['旁白', '他在城里走了一圈，买到一截玄天仙藤，代价是一笔不小的灵石。'],
      ['韩立', '（这地方的规矩简单：付得起，就没人问你从哪来。）']
    ],
    baiguang: [
      ['旁白', '白光界不大，天是白的，地也是白的。界心钉着一枚土黄色的长钉。'],
      ['韩立', '（土皇钉。钉住这一界的，就是它。）'],
      ['旁白', '长钉忽然自己转了一下，四周的白光凝成一个人形。'],
      ['土皇钉傀', '……出去。'],
      ['韩立', '（拔了钉子，这一界就塌。得快。）']
    ],
    baiguang_out: [
      ['旁白', '土皇钉被拔出来，白光界开始塌。韩立退出来的最后一刻，手里多了一截仙藤。'],
      ['韩立', '（险。）'],
      ['旁白', '身后的裂缝合上了，像什么都没发生过。']
    ],
    tianmo: [
      ['旁白', '荒原上，一道黑肤青年的人影从魔焰里走出来。地上一纸契约，墨还是湿的。'],
      ['天魔', '签了它，你想要的我都能给。'],
      ['韩立', '（代价在最后一行。这种字，我见过太多。）'],
      ['韩立', '不签。'],
      ['旁白', '契约自己烧了。魔焰里的笑声，很久才停。']
    ],
    diyi: [
      ['旁白', '一个白发老者拦在路中央，手里没有法宝，气息却压得荒原发沉。'],
      ['第一大乘', '灵界第一大乘。你若要往上走，先过我这关。'],
      ['韩立', '（第一大乘。这一战，是他等我。）'],
      ['韩立', '请。']
    ],
    diyi_out: [
      ['旁白', '他退了半步，抬手止住还想再上的护法。'],
      ['第一大乘', '……名号归你。'],
      ['韩立', '（他输得不服，可他不赖。）'],
      ['旁白', '荒原上的风重新吹起来。灵界第一大乘，换了人。']
    ],
    huirenjie: [
      ['旁白', '山边小村。村口那棵老树还在，树下的石墩换了新的。'],
      ['韩立', '（走了这么多年，村子反倒比记忆里小。）'],
      ['旁白', '村人只当他是过路的散修。没人认出一个姓韩的。'],
      ['韩立', '（父母坟上，添一把新土吧。）'],
      ['旁白', '他在坟前站了很久。走的时候，没有回头。']
    ]
  });

  // ========================= 五(2)、后期支线奇遇 =========================
  // 解锁条件一律卡在「对应境界已达成」，避免进支线图被 startLevel 抬级跳境界。
  window.ENCOUNTERS.push(
    {
      id: 'e_linghuang', map: 'yitian', name: '圣岛使者', spr: 'hermit', scale: 1.9,
      cond: { level: 200 },
      lines: [
        ['旁白', '倚天城的茶棚里，一个穿白袍的使者坐着，面前的茶一口没动。'],
        ['圣岛使者', '灵皇大比要开了。圣岛缺一个人。'],
        ['韩立', '（缺人，不是请人。）'],
        ['韩立', '赢了有什么？'],
        ['圣岛使者', '名分。灵界办事，名分比灵石管用。'],
        ['韩立', '带路。']
      ],
      unlock: 'linghuang', reward: { stones: 500 }
    },
    {
      id: 'e_zhandacheng', map: 'xiaoling', name: '拦路的青袍人', spr: 'rogue', scale: 1.9,
      cond: { level: 260, cleared: ['sanjie'] },
      lines: [
        ['旁白', '小灵天外的荒原上，一个青袍人负手站着，气息沉得像一座山。'],
        ['大乘修士', '新晋的大乘？我来试试。'],
        ['韩立', '（同为大乘。这一战，躲不过。）'],
        ['韩立', '出手吧。']
      ],
      unlock: 'zhandacheng', reward: { stones: 0 }
    },
    {
      id: 'e_heihu', map: 'xiaoling', name: '魔界商队', spr: 'hermit', scale: 1.9,
      cond: { level: 260, cleared: ['sanjie'] },
      lines: [
        ['旁白', '一支魔界商队停在荒原边上，领头的指了指身后的黑城。'],
        ['商队首领', '黑葫城，什么都卖。去不去？'],
        ['韩立', '（魔界的城。去看看也好。）'],
        ['韩立', '去。']
      ],
      unlock: 'heihu', reward: { stones: 300 }
    },
    {
      id: 'e_baiguang', map: 'xiaoling', name: '荒原上的白光', spr: 'grave', scale: 2.0,
      cond: { level: 260, cleared: ['sanjie'] },
      lines: [
        ['旁白', '荒原裂缝里透出一线白光，白得不像魔界的东西。'],
        ['韩立', '（白光界。原著里，土皇钉就在这种地方。）'],
        ['韩立', '进去看看。']
      ],
      unlock: 'baiguang', reward: { stones: 0 }
    },
    {
      id: 'e_tianmo', map: 'xiaoling', name: '魔焰里的来客', spr: 'mo', scale: 1.9,
      cond: { level: 330, cleared: ['jiujie'] },
      lines: [
        ['旁白', '一个没有影子的人立在荒原上，递来一纸契约。'],
        ['天魔', '契约，为你留着。'],
        ['韩立', '（天魔契约。签了，力量来得快；代价写在最后一行。）'],
        ['韩立', '不去。'],
        ['旁白', '那人笑了笑，把契约收了回去。']
      ],
      unlock: 'tianmo', reward: { stones: 0 }
    },
    {
      id: 'e_diyi', map: 'xiaoling', name: '灵界第一大乘', spr: 'neimen', scale: 2.0,
      cond: { level: 330, cleared: ['jiujie'] },
      lines: [
        ['旁白', '一个白发老者拦在路中央，手里没有法宝，气息却压得荒原发沉。'],
        ['第一大乘', '灵界第一大乘。你若要往上走，先过我这关。'],
        ['韩立', '（第一大乘。这一战，是他等我。）'],
        ['韩立', '请。']
      ],
      unlock: 'diyi', reward: { stones: 0 }
    },
    {
      id: 'e_huirenjie', map: 'xiaoling', name: '越国口音的老妇人', spr: 'rogue', scale: 1.8,
      cond: { level: 420, cleared: ['zhenxian'] },
      lines: [
        ['旁白', '一个越国口音的老妇人，说起镜州出了个韩家，如今是当地的望族。'],
        ['老妇人', '韩家？祖上出过一个修仙的，再没回来过。'],
        ['韩立', '（韩家。我家。）'],
        ['韩立', '（父母走的时候，我没在。）'],
        ['韩立', '（该回去一趟了。）']
      ],
      unlock: 'huirenjie', reward: { stones: 0 }
    }
  );

  // ========================= 五(3)、灵界功法线（V8–V12，req 150→420） =========================
  // 原著依据（均已核次数与首现章）：
  //   百脉炼宝诀 V8C1351（26 次）、惊蛰十二变 V9C1425（5）、三炼风雷翅 V9C1392（章名）、
  //   念剑诀 V10C1755（7）、金罡灭魔神雷 V10C1861（6）、忘情诀 V10C1970（47）、逆灵真阴大法 V10C1824（5）
  // 人界那 44 门功法最晚到 req112（化神）就断了；灵界这一段补 7 门，一路铺到真仙。
  window.SKILLS.push(
    { id: 'baimai', name: '百脉炼宝诀', icon: '🦴', max: 6, minLv: 150, type: 'passive',
      effect: { maxhp: 150, armor: 0.05 },
      desc: '百脉炼宝诀：把经脉、筋骨当法宝一件件炼过去。炼成的不是法术，是身子本身' },
    { id: 'jingzhe', name: '惊蛰十二变', icon: '🐛', max: 6, minLv: 165, type: 'passive',
      effect: { spd: 0.10, atkSpd: 0.05 },
      desc: '惊蛰十二变：一身可化十二形，起落之间只留一道残影。灵界顶层的遁法' },
    { id: 'fenglei3', name: '三炼风雷翅', icon: '🪽', max: 6, minLv: 200, type: 'passive',
      effect: { atkSpd: 0.10, spd: 0.06 },
      desc: '风雷翅三炼之后，翅上风雷自成一头。出手比从前快了一线，这一线就是生死' },
    { id: 'nianjian', name: '念剑诀', icon: '🗡', max: 6, minLv: 220, type: 'ranged',
      atk: { kind: 'beam', base: 60, perLv: 22, cd: 1.4, countBase: 3, countPerLv: 0.5, spread: 0.2, pierceBase: 3, piercePerLv: 1 / 3, range: 520, life: 1.3, vfx: 'swordarray' },
      desc: '念剑诀：不掐诀、不抬手，一念起处三道剑光已在人前。念有多快，剑有多快' },
    { id: 'jingang2', name: '金罡灭魔神雷', icon: '⚡', max: 6, minLv: 260, type: 'ranged_aoe',
      atk: { kind: 'thunder', base: 90, perLv: 32, cd: 2.6, countBase: 2, countPerLv: 0.34, range: 640, vfx: 'thunder' },
      desc: '金罡灭魔神雷：专克魔气的神雷。魔修挨这一下，护体魔气先散三分' },
    { id: 'wangqing', name: '忘情诀', icon: '🌙', max: 5, minLv: 330, type: 'passive',
      effect: { xpMul: 0.10, crit: 0.04 },
      desc: '忘情诀：斩的不是情，是心里那点挂碍。心静了，修为与出手都不再晃' },
    { id: 'niling', name: '逆灵真阴大法', icon: '🌀', max: 6, minLv: 420, type: 'aura',
      atk: { kind: 'field', base: 24, perLv: 10, radBase: 120, radPerLv: 14, slow: 0.35, cdHit: 0.5, vfx: 'gravity' },
      desc: '逆灵真阴大法：真阴之气倒卷成域。进了这丈许方圆，法力运转先被压住半截' }
  );

  // 法诀道具（teach 类：拿到要回洞府学，学了才进功法位）
  window.ITEMS.push(
    { id: 'sk_baimai', name: '百脉炼宝诀·法诀', rarity: 4, icon: '📕', req: 150, teach: 'baimai',
      desc: '习得《百脉炼宝诀》。V8C1351 天渊城所得，炼的是身上这一副皮囊' },
    { id: 'sk_jingzhe', name: '惊蛰十二变·法诀', rarity: 4, icon: '📕', req: 165, teach: 'jingzhe',
      desc: '习得《惊蛰十二变》。V9C1425 风元大陆所得，十二形轮转，身形如蛰虫乍醒' },
    { id: 'sk_fenglei3', name: '三炼风雷翅·炼法', rarity: 4, icon: '📕', req: 200, teach: 'fenglei3',
      desc: '风雷翅第三次重炼的法门（V9C1392）。翅上风雷合一，快过从前' },
    { id: 'sk_nianjian', name: '念剑诀·法诀', rarity: 4, icon: '📕', req: 220, teach: 'nianjian',
      desc: '习得《念剑诀》。V10C1755 魔界所得，念起剑出，不必抬手' },
    { id: 'sk_jingang2', name: '金罡灭魔神雷·雷诀', rarity: 5, icon: '📕', req: 260, teach: 'jingang2',
      desc: '习得金罡灭魔神雷（V10C1861）。原著里韩立拿来对付魔君的手段之一' },
    { id: 'sk_wangqing', name: '忘情诀·法诀', rarity: 5, icon: '📕', req: 330, teach: 'wangqing',
      desc: '习得《忘情诀》。V10C1970 银月与七星月体一线所得，斩的是心里的挂碍' },
    { id: 'sk_niling', name: '逆灵真阴大法·法诀', rarity: 5, icon: '📕', req: 420, teach: 'niling',
      desc: '习得《逆灵真阴大法》（V10C1824）。真阴倒卷成域，是韩立压箱底的那一层' }
  );

  // 灵界的功法出处：坊市买两门（入门），其余随剧情给
  const GIVE = { guanghan: 'sk_jingzhe', yitian: 'sk_fenglei3', xiaoling: 'sk_nianjian', sanjie: 'sk_jingang2', jiujie: 'sk_wangqing', fsjie: 'sk_niling' };
  for (const mid in GIVE) {
    const m = window.MAPS.find(x => x.id === mid);
    if (!m) continue;
    m.reward = m.reward || {};
    m.reward.items = (m.reward.items || []).concat([GIVE[mid]]);
  }

  // ========================= 五(4)、天渊坊市（灵界唯一的 market 图） =========================
  // 原著 V8C1333《天渊坊市》。灵界段此前「能打不能买」——灵石一路只进不出，这里给它开个口子。
  // 注意：玄天仙藤**不上货架**。260/330/420 三关要它，能买就等于把大乘之后的进度变成攒钱。
  const TY_SHOP = ['m_zhenlinglin', 'm_zhenlingxue', 'huiqi', 'qiannian', 'jipin', 'sk_baimai', 'sk_jingzhe'];
  const TY_PRICE = {
    m_zhenlinglin: 9000, m_zhenlingxue: 30000, huiqi: 800, qiannian: 3000, jipin: 45000,
    sk_baimai: 26000, sk_jingzhe: 42000
  };
  const TY_CAT = {
    m_zhenlinglin: 'cai', m_zhenlingxue: 'cai', huiqi: 'dan', qiannian: 'fu', jipin: 'dan',
    sk_baimai: 'skill', sk_jingzhe: 'skill'
  };
  for (const id of TY_SHOP) {
    if (window.SHOP_STOCK.some(s => s.id === id)) continue;   // 已被别处上架的不重复挂
    window.SHOP_STOCK.push({ id: id, price: TY_PRICE[id], cat: TY_CAT[id] });
  }

  // ========================= 五(4·2)、灵界成品（可供首领掉落的化神~大乘级物件） =========================
  // 灵界一改「小怪只掉灵物」之后，首领的成品池只剩下人界 82 级那几件旧宝 —— 太少也太低。
  // 这里按原著补五件灵界本地器物，全部 rarity 4（可随机）、不带 unique/craftOnly，专供首领掉落与坊市外的获取。
  //   w_wulongzha  五龙铡   V9C1491《阴水葵精与五龙铡》40 次
  //   w_xuejing    血晶摩诃剑 V9C1382《血晶摩诃剑》8 次
  //   t_wansen     万森法盘 V10C1800《万森法盘与擎天巨舟》2 次
  //   t_qingtian   擎天巨舟 V10C1800 15 次
  //   dan_kunpeng  鲲鹏舍利 V9C1423《鲲鹏舍利与天鹏之誓》7 次
  window.ITEMS.push(
    { id: 'w_wulongzha', name: '五龙铡', rarity: 4, icon: '🗡', slot: 'weapon', req: 150,
      desc: '阴水葵精养出来的重铡，刃上盘着五条龙纹（V9C1491）。灵气灌进去，龙纹会走。',
      effect: { dmg: 0.55, maxhp: 100 } },
    { id: 'w_xuejing', name: '血晶摩诃剑', rarity: 4, icon: '🗡', slot: 'weapon', req: 200,
      desc: '血晶凝成的长剑，出鞘带一线血色（V9C1382）。斩人不沾血，血都被剑吃了。',
      effect: { dmg: 0.70, atkSpd: 0.06 } },
    { id: 't_wansen', name: '万森法盘', rarity: 4, icon: '🧭', slot: 'trinket', req: 220,
      desc: '圣岛一线上流通的法盘，盘面刻满林木之纹（V10C1800）。护身、聚气，都是它。',
      effect: { maxhp: 180, regen: 0.9 } },
    { id: 't_qingtian', name: '擎天巨舟', rarity: 4, icon: '🛶', slot: 'trinket', req: 260,
      desc: '一整艘能缩进袖里的巨舟（V10C1800）。舟行于天，人在舟中坐，赶路比遁光还稳。',
      effect: { spd: 0.10, maxhp: 120 } },
    { id: 'dan_kunpeng', name: '鲲鹏舍利', rarity: 4, icon: '🦅', req: 260,
      desc: '鲲鹏遗下的舍利（V9C1423）。含着它吐纳，气血与真元一起长，像被一只大鸟驮着往上飞。',
      effect: { maxhp: 300, xpMul: 0.12 } }
  );

  // ========================= 五(4·3)、灵界洞府（原著地点，让灵界破境也吃得到洞府加成） =========================
  // 之前五道灵界关的 canonCave 全空，等于灵界破境永远吃不到「原著洞府 +30%」。
  // 原著里韩立飞升后先落脚天渊城，后来把小灵天收成自己的小世界 —— 这两处就是他在灵界的家。
  Object.assign(window.CAVES, {
    tycave: {
      id: 'tycave', name: '天渊城洞府', pos: '灵界·天渊城', from: 'liangzu',
      desc: '天渊城东面石壁里凿出来的一处洞府，一室一厅，窗外是人妖两族共守的城墙。',
      quote: '在灵界有个能关门的地方，比什么法宝都难得。',
      capLevel: 220, restStone: 2600, restXp: 0.14,
      crafts: ['alchemy', 'forge', 'talisman'],
      restTip: '天渊城的地脉是人族几万年经营出来的，坐一日抵荒原十日。'
    },
    xlcave: {
      id: 'xlcave', name: '小灵天洞府', pos: '灵界·小灵天', from: 'xiaoling',
      desc: '一方小世界，收在袖里。天很低，一口井，一炉火，谁也找不进来。',
      quote: '打下来的小世界，比买来的洞府踏实。',
      capLevel: 400, restStone: 5200, restXp: 0.10,
      crafts: ['alchemy', 'forge', 'talisman'],
      restTip: '小灵天的灵气自成一界，闭门坐一年，外面的事一件都不知道。'
    }
  });
  // 打通这两张图即得洞府（与其它剧情图一个机制：finishMap 认 m.cave）
  { const m = window.MAPS.find(x => x.id === 'liangzu'); if (m) m.cave = 'tycave'; }
  { const m = window.MAPS.find(x => x.id === 'xiaoling'); if (m) m.cave = 'xlcave'; }

  // ========================= 五(5)、坊市「功法」柜 =========================
  // 原来 SHOP_STOCK 里有 24 条 cat:'skill' 的法诀，但 SHOP_CATS 只有 丹药/符箓/法器/杂材 四个页签，
  // 玩家永远点不到「功法」这一柜 —— 这些法诀等于白挂。补上页签才真正买得到。
  if (!window.SHOP_CATS.some(c => c.id === 'skill')) {
    window.SHOP_CATS.push({ id: 'skill', name: '功法' });
  }

  // 灵界商店的招牌（坊市图示与副标题）
  if (!window.MAPS.some(m => m.id === 'tianyuan')) {
    window.MAPS.push({
      id: 'tianyuan', name: '天渊坊市', pos: '灵界·天渊城', arc: 'I',
      type: 'market', tag: '坊市', shop: TY_SHOP,
      desc: '天渊城的坊市。灵界的货以真灵材料与人界见不到的功法为主，灵石在这里才花得出去。',
      shopSub: '灵界百族的货都在这儿过一手。真灵鳞片、真灵之血，还有几门人界听不到名字的功法。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'anyuan', next: 'heifeng',
      reward: { stones: 0, mats: [['m_zhenlinglin', 1]] },
      clearTitle: '坊市一行',
      clearDesc: '灵石换成了鳞片与法诀。灵界的规矩，从这里才算摸着。'
    });
  }

  // 安远城 → 天渊坊市 → 黑凤族
  const ANY = window.MAPS.find(m => m.id === 'anyuan');
  const HF = window.MAPS.find(m => m.id === 'heifeng');
  if (ANY) ANY.next = 'tianyuan';
  if (HF) HF.unlock = 'tianyuan';

  // ========================= 六、场景底色 =========================
  Object.assign(window.MAP_SCENERY, {
    anyuan: { bg: { base: '#2b3348', a: '#333d55', b: '#222a3c' }, decor: [['rock', 0.22], ['tuft', 0.10]] },
    tianyuan: { bg: { base: '#31333f', a: '#3b3e4c', b: '#242631' }, decor: [['rock', 0.12], ['tuft', 0.05]] },
    heifeng: { bg: { base: '#3a2f2a', a: '#463830', b: '#2c241f' }, decor: [['rock', 0.36], ['tree', 0.10]] },
    lianxu: { bg: { base: '#26303f', a: '#2e3a4b', b: '#1d2532' }, decor: [['rock', 0.30], ['tuft', 0.08]] },
    fengyuan: { bg: { base: '#2f3a2e', a: '#384633', b: '#242e23' }, decor: [['rock', 0.28], ['tuft', 0.16]] },
    guanghan: { bg: { base: '#26343d', a: '#2e4049', b: '#1c2830' }, decor: [['rock', 0.34], ['tuft', 0.04]] },
    heti_guan: { bg: { base: '#1f2a36', a: '#273443', b: '#18212b' }, decor: [['rock', 0.30], ['tuft', 0.03]] },
    liangzu:  { bg: { base: '#2a3441', a: '#33404f', b: '#1e2731' }, decor: [['rock', 0.12], ['tuft', 0.04]] },
    shengdao: { bg: { base: '#2c3a45', a: '#354755', b: '#222d36' }, decor: [['rock', 0.18], ['tuft', 0.06]] },
    mojie:    { bg: { base: '#241f2a', a: '#2d2634', b: '#1a161f' }, decor: [['rock', 0.38], ['tuft', 0.03]] },
    moban:    { bg: { base: '#2b2733', a: '#342f3d', b: '#1d1a24' }, decor: [['rock', 0.30], ['tuft', 0.04]] },
    yitian:   { bg: { base: '#3a2a26', a: '#45322d', b: '#2b1f1c' }, decor: [['rock', 0.30], ['tuft', 0.04]] },
    huangquan:{ bg: { base: '#1d2f2c', a: '#243b37', b: '#152421' }, decor: [['rock', 0.34], ['tuft', 0.03]] },
    moyuan:   { bg: { base: '#1b2830', a: '#22333c', b: '#131d24' }, decor: [['rock', 0.14], ['tuft', 0.03]] },
    xiaoling: { bg: { base: '#3a2626', a: '#462e2e', b: '#2b1c1c' }, decor: [['rock', 0.24], ['tuft', 0.06]] },
    sanjie:   { bg: { base: '#242a36', a: '#2c3443', b: '#1a1f28' }, decor: [['rock', 0.26], ['tuft', 0.04]] },
    jiujie:   { bg: { base: '#2a2f3a', a: '#343a47', b: '#1f232c' }, decor: [['rock', 0.24], ['tuft', 0.03]] },
    zhenxian: { bg: { base: '#2f3542', a: '#3a4253', b: '#232833' }, decor: [['rock', 0.22], ['tuft', 0.03]] },
    fsjie:    { bg: { base: '#232733', a: '#2c3140', b: '#191c25' }, decor: [['rock', 0.20], ['tuft', 0.02]] },
    xianjie:  { bg: { base: '#39434f', a: '#46525f', b: '#2b333d' }, decor: [['rock', 0.10], ['tuft', 0.02]] },
    linghuang: { bg: { base: '#3a3230', a: '#463c39', b: '#2b2623' }, decor: [['rock', 0.16], ['tuft', 0.05]] },
    zhandacheng: { bg: { base: '#2b2f38', a: '#343945', b: '#1f232b' }, decor: [['rock', 0.30], ['tuft', 0.04]] },
    shengshi: { bg: { base: '#2b2f38', a: '#343945', b: '#1f232b' }, decor: [['rock', 0.30], ['tuft', 0.04]] },
    heihu:    { bg: { base: '#241f26', a: '#2d2731', b: '#1a161c' }, decor: [['rock', 0.26], ['tuft', 0.03]] },
    baiguang: { bg: { base: '#4a4f57', a: '#575d66', b: '#3a3f46' }, decor: [['rock', 0.18], ['tuft', 0.02]] },
    tianmo:   { bg: { base: '#231c26', a: '#2c2331', b: '#19131c' }, decor: [['rock', 0.28], ['tuft', 0.02]] },
    diyi:     { bg: { base: '#2d3038', a: '#373b45', b: '#21242b' }, decor: [['rock', 0.28], ['tuft', 0.04]] },
    huirenjie:{ bg: { base: '#2f3a2b', a: '#384634', b: '#243023' }, decor: [['tree', 0.20], ['tuft', 0.20]] }
  });
  // late.js 合底色时还没有这些图，这里手动补上
  for (const id of ['anyuan', 'tianyuan', 'heifeng', 'lianxu', 'fengyuan', 'guanghan', 'heti_guan',
                    'liangzu', 'shengdao', 'mojie', 'moban', 'yitian', 'huangquan', 'moyuan', 'xiaoling',
                    'sanjie', 'jiujie', 'zhenxian', 'fsjie', 'xianjie',
                    'linghuang', 'zhandacheng', 'shengshi', 'heihu', 'baiguang', 'tianmo', 'diyi', 'huirenjie']) {
    const m = window.MAPS.find(x => x.id === id);
    const sc = window.MAP_SCENERY[id];
    if (m && sc) { m.bg = sc.bg; m.decorScheme = sc.decor; }
  }

  // 灵界功法与法诀是后加的，索引要重建一次（Items.get 查的是这份快照）
  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  // 新图计入主线数
  window.MAIN_MAP_COUNT = window.MAPS.filter(m => !m.side).length;

})();
