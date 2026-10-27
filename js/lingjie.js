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
    },
    {
      lv: 260, realm: '大乘期', from: '合体后期',
      tip: '合体之后是大乘。原著无「大乘丹」——须过五行之劫、真雷劫、心魔之劫三关，以玄天仙藤护身、真灵之血续命（V11C2176–2186）。',
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
      unlock: 'guanghan', next: 'shengdao',
      reward: { stones: 30000, mats: [['m_zhenlingxue', 1]] },
      clearTitle: '合体已成',
      clearDesc: '肉身与真元合一。灵界的第二道大关，过去了。'
    },

    // ---------------- V10 魔界之战 ----------------
    {
      id: 'shengdao', name: '圣岛', pos: '灵界·圣岛', arc: 'K',
      type: 'story', tag: '剧情',
      desc: '人族圣地。两族大乘在此议事，灵皇大比的名分也从这里出。',
      startLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'heti_guan', next: 'mojie',
      reward: { stones: 35000, mats: [['m_zhenlinglin', 3]] },
      clearTitle: '圣岛一行',
      clearDesc: '圣岛的使者只说了一句话：魔界的门，快开了。'
    },
    {
      id: 'mojie', name: '魔界之约', pos: '灵界·魔界入口', arc: 'K',
      type: 'story', tag: '剧情',
      desc: '荒原尽头裂开一道黑口。魔界的约，得有人去赴。',
      startLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'shengdao', next: 'yitian',
      reward: { stones: 40000, mats: [['m_zhenlingxue', 1]] },
      clearTitle: '魔界之约',
      clearDesc: '约定了。倚天城那边，魔族已经动了。'
    },
    {
      id: 'yitian', name: '倚天城·人魔之战', pos: '灵界·倚天城', arc: 'K',
      type: 'boss', tag: '剧情战',
      desc: '魔族大军压到倚天城下。城墙上站满了人，也站满了不敢退的人。',
      startLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'mojie', next: 'huangquan',
      diff: 3.9, bossAt: 0, intro: 'yitian', outro: 'yitian_out',
      enemies: ['gui2', 'moxiu2', 'dajinxiu'],
      elites: ['魔族魔将', '血魔卫'],
      mats: ['m_zhenlingxue', 'm_yaodan', 'm_gangyin'],
      boss: { kind: 'mo', name: '魔族魔将·赤炎', hp: 85000, spd: 68, dmg: 130, r: 24, spr: 'mo', scale: 6.4 },
      reward: { stones: 50000, mats: [['m_zhenlingxue', 2]] },
      clearTitle: '倚天城守住了',
      clearDesc: '魔将伏诛，魔潮退去。城墙上的人，第一次敢坐下。'
    },
    {
      id: 'huangquan', name: '黄泉地火', pos: '灵界·魔界 黄泉地火', arc: 'K',
      type: 'boss', tag: '剧情战',
      desc: '魔界深处的地火，烧的是魂魄。镇魔锁锁着的东西，比地火更烫。',
      startLevel: 210, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'yitian', next: 'xiaoling',
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
      id: 'xiaoling', name: '小灵天', pos: '灵界·小灵天', arc: 'K',
      type: 'boss', tag: '剧情战',
      desc: '魔界里藏着一方小世界。小灵天的主人，守着一炉不该有的火。',
      startLevel: 220, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'huangquan', next: 'sanjie',
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
      unlock: 'jiujie', next: 'xianjie',
      reward: { stones: 160000 },
      clearTitle: '真仙',
      clearDesc: '一身不再是凡胎。眉眼还是那眉眼，气息已不在此界。'
    },
    {
      id: 'xianjie', name: '飞升仙界', pos: '仙界·接引台', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '接引台在前。人界、灵界、魔界，都留在身后了。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'zhenxian', next: null,
      reward: { stones: 200000 },
      clearTitle: '飞升仙界',
      clearDesc: '一道白光冲天而起。凡人韩立的故事，到此为止。'
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
    xianjie: [
      ['旁白', '接引台在云上，白得像一块没有字的碑。'],
      ['韩立', '（人界、灵界、魔界。走了一辈子，原来只是为了站到这里。）'],
      ['旁白', '台上没有接引的人，只有一道门。门后是光。'],
      ['韩立', '（走了。）'],
      ['旁白', '他跨进门里。身后的三界，一下子远了。']
    ]
  });

  // ========================= 六、场景底色 =========================
  Object.assign(window.MAP_SCENERY, {
    anyuan: { bg: { base: '#2b3348', a: '#333d55', b: '#222a3c' }, decor: [['rock', 0.22], ['tuft', 0.10]] },
    heifeng: { bg: { base: '#3a2f2a', a: '#463830', b: '#2c241f' }, decor: [['rock', 0.36], ['tree', 0.10]] },
    lianxu: { bg: { base: '#26303f', a: '#2e3a4b', b: '#1d2532' }, decor: [['rock', 0.30], ['tuft', 0.08]] },
    fengyuan: { bg: { base: '#2f3a2e', a: '#384633', b: '#242e23' }, decor: [['rock', 0.28], ['tuft', 0.16]] },
    guanghan: { bg: { base: '#26343d', a: '#2e4049', b: '#1c2830' }, decor: [['rock', 0.34], ['tuft', 0.04]] },
    heti_guan: { bg: { base: '#1f2a36', a: '#273443', b: '#18212b' }, decor: [['rock', 0.30], ['tuft', 0.03]] },
    shengdao: { bg: { base: '#2c3a45', a: '#354755', b: '#222d36' }, decor: [['rock', 0.18], ['tuft', 0.06]] },
    mojie:    { bg: { base: '#241f2a', a: '#2d2634', b: '#1a161f' }, decor: [['rock', 0.38], ['tuft', 0.03]] },
    yitian:   { bg: { base: '#3a2a26', a: '#45322d', b: '#2b1f1c' }, decor: [['rock', 0.30], ['tuft', 0.04]] },
    huangquan:{ bg: { base: '#1d2f2c', a: '#243b37', b: '#152421' }, decor: [['rock', 0.34], ['tuft', 0.03]] },
    xiaoling: { bg: { base: '#3a2626', a: '#462e2e', b: '#2b1c1c' }, decor: [['rock', 0.24], ['tuft', 0.06]] },
    sanjie:   { bg: { base: '#242a36', a: '#2c3443', b: '#1a1f28' }, decor: [['rock', 0.26], ['tuft', 0.04]] },
    jiujie:   { bg: { base: '#2a2f3a', a: '#343a47', b: '#1f232c' }, decor: [['rock', 0.24], ['tuft', 0.03]] },
    zhenxian: { bg: { base: '#2f3542', a: '#3a4253', b: '#232833' }, decor: [['rock', 0.22], ['tuft', 0.03]] },
    xianjie:  { bg: { base: '#39434f', a: '#46525f', b: '#2b333d' }, decor: [['rock', 0.10], ['tuft', 0.02]] }
  });
  // late.js 合底色时还没有这几张图，这里手动补上
  for (const id of ['anyuan', 'heifeng', 'lianxu', 'fengyuan', 'guanghan', 'heti_guan',
                    'shengdao', 'mojie', 'yitian', 'huangquan', 'xiaoling', 'sanjie', 'jiujie', 'zhenxian', 'xianjie']) {
    const m = window.MAPS.find(x => x.id === id);
    const sc = window.MAP_SCENERY[id];
    if (m && sc) { m.bg = sc.bg; m.decorScheme = sc.decor; }
  }

  // 新图计入主线数
  window.MAIN_MAP_COUNT = window.MAPS.filter(m => !m.side).length;

})();
