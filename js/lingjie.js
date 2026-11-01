// ============================================================================
// 第五部：灵界篇（化神之后）
//
// 依《凡人修仙传》原著：
//   V8 初入灵界（化神 → 炼虚）  V9 灵界百族（炼虚 → 合体）
//   V10 魔界之战（合体 → 大乘） V11 真仙降世  V12 真仙降临
//
// 本轮落地：① 炼虚突破关（lv150，五行合一 + 腾龙丹）
//          ② V8 全段按原著重排（11 图）：青罗沙漠 → 安远城兽潮 → 落日之墓 → 山腹两色雷劫
//             → 天渊城（青冥卫/灵地/坊市）→ 金阙玉书 → 木族领地（芝龙果/腾龙丹方）
//             → 碧眼真蟾（夜叉王）→ 天鹏圣地·地渊（惊蛰十二变）→ 冥河之地（青元子）
//             → 黑隐山脉·种剑（炼虚）
//          ③ 原著灵物：腾龙丹 / 万妙丹 / 真灵之血 / 真灵鳞片 / 玄天斩灵剑 / 玄天仙藤
//
// 依据见 canon/灵界篇-蓝图.md、canon/progression.md、canon/geography.md
// ============================================================================
(function () {

  // ========================= 一、原著灵物（已核） =========================
  // 腾龙丹 V9C1364；万妙丹（广寒界）1467 岁；真灵之血 V9C1359；真灵鳞片 V8C1341；
  // 玄天斩灵剑 V8C1328；玄天仙藤 V5C633。
  // 禁用：炼虚丹 / 大乘丹 / 渡劫丹（原著 0 次）。
  window.ITEMS.push(
    // noDrop：破境丹只该在剧情节点给一枚，任何怪都不随机爆 ——
    // 否则人界 82 级的 Boss 就能爆出灵界的腾龙丹，等于把炼虚关的门槛提前拆了。
    { id: 'tenglong', name: '腾龙丹', rarity: 4, icon: '🐉', req: 132, noDrop: true,
      desc: '芝龙果为主药，三万年一结果。炼虚级灵药，生服也能凭空涨六十年苦修（V9C1364）。',
      effect: { xpMul: 0.2 } },
    { id: 'heti', name: '万妙丹', rarity: 4, icon: '💊', req: 150, noDrop: true,
      desc: '广寒界玉台上的那一枚。灵界丹药，压得住炼虚巅峰的灵压；合体那一步，须它配着炼神术与真灵之血一起过（韩立 1467 岁入广寒界所得）。',
      effect: { maxhp: 240 } },
    { id: 't_xuantianjian', name: '玄天斩灵剑', rarity: 5, icon: '⚔', slot: 'weapon', req: 260,
      desc: '玄天之宝，风元大陆西北角出世（V8C1328）。斩灵之剑，非寻常法宝可比。伤害 +60%，出手快 +20%。',
      effect: { dmg: 0.6, atkSpd: 0.2 }, unique: true }
  );
  window.MATERIALS.push(
    { id: 'm_zhenlingxue', name: '真灵之血', icon: '🩸', rarity: 4, desc: '真灵遗血。炼虚之后淬体凝元的上品灵物（V9C1359）。' },
    { id: 'm_zhenlinglin', name: '真灵鳞片', icon: '🐲', rarity: 3, desc: '真灵身上的一片鳞，坚胜寻常法宝（V8C1341）。' },
    { id: 'm_xuantianteng', name: '玄天仙藤', icon: '🌿', rarity: 4, desc: '玄天仙藤的一截，可炼玄天之宝（V5C633）。' },
    { id: 'm_beijiyuanjing', name: '北极元晶', icon: '💎', rarity: 4, desc: '重回人界时才能取到的元晶（V12C2442《重回人界》，7 次）；据说是炼制元合五极山的必需之物' },
    { id: 'm_daopai', name: '道牌', icon: '🪧', rarity: 4, desc: '道果大会的信物。交出道牌，便是认输（V12C2440）。' }
  );

  // ========================= 一(1)、未实装原著灵物（本轮补入） =========================
  // 把《道具总表》§10.2 里列了却没做成游戏内真实物品的原著器物补上。
  // 出处逐条对过 raw 原文：V9C1364 芝龙果 / V9C1381 真灵之魄 / V10C1835 洗灵池液·伪魔珠 /
  //   V9C1522·V10C1866 噬金虫王 / V11C2229 土皇钉 / V10C1867 万灵伞 / V10C1863 蚀仙丹 / V7C1252 玄天之宝。
  // 全部 noDrop+unique（或材料），只走地图 reward，绝不进随机掉落池。
  window.MATERIALS.push(
    { id: 'm_zhilongguo', name: '芝龙果', icon: '🍄', rarity: 4,
      // 原著：木族之行途中夺得，绿液催得的灵药；游戏里让它可移栽进灵界药圃、此后定期采收
      transplant: 'tygarden',
      desc: '三万年才结一次果的灵药，腾龙丹的主药；即便生服，也能凭空添几十年苦修（V9C1364）。得手后留一株作种移入灵界药圃，此后定期可采。' },
    { id: 'm_zhenlingpo', name: '真灵之魄', icon: '🔮', rarity: 4,
      desc: '真灵陨落后凝而不散的一缕"魄"。两团之魄战到一处，声势已堪比真龙天凤（V9C1381）。' },
    { id: 'm_xilingchi', name: '洗灵池液', icon: '💧', rarity: 4,
      desc: '魔界最深处洗灵池的池水。池中一日抵外界一年，取其液可洗髓易骨（V10C1835）。' }
  );
  window.ITEMS.push(
    // 伪魔珠：叶仙子以死去古魔魔核炼化，吞入体内逼出真魔气，高阶古魔亦难看破（V10C1835）。
    { id: 't_weimozhu', name: '伪魔珠', rarity: 4, icon: '🟤', slot: 'trinket', req: 215, noDrop: true,
      desc: '以死去古魔的魔核炼化而成，吞入体内逼出藏在其中的真魔气，寻常高阶古魔绝难看破（V10C1835）。',
      effect: { dmg: 0.12, armor: 0.08 } },
    // 土皇钉：宝花用以钉住螟虫之母的乾土法则之宝（V11C2229）。
    { id: 't_tuhuangding', name: '土皇钉', rarity: 5, icon: '📌', slot: 'weapon', req: 260, unique: true, noDrop: true,
      desc: '蕴含一界乾土法则的奇宝。一旦钉中人身，被钉者一身土属性神通便再难施展分毫（V11C2229）。伤害 +18%，出手快 +10%。',
      effect: { dmg: 0.18, atkSpd: 0.10 } },
    // 万灵伞：虚灵老者以数千成熟体噬金虫炼成的渡劫之宝（V10C1867）。
    { id: 't_wanlingsan', name: '万灵伞', rarity: 5, icon: '🌂', slot: 'trinket', req: 330, unique: true, noDrop: true,
      desc: '以成熟体噬金虫（近乎金刚不坏之体）炼成的伞宝，专御飞升之劫。撑开时万虫环护，劫雷亦难破（V10C1867）。',
      effect: { armor: 0.15, maxhp: 300, dmg: 0.06 } },
    // 蚀仙丹：以早已灭绝的蚀毒仙草炼成，丹力远超寻常灵药，即将渡劫的大乘亦视若至宝（V10C1863）。
    { id: 'dan_shixian', name: '蚀仙丹', rarity: 5, icon: '🟠', req: 330, unique: true, noDrop: true,
      desc: '以早已灭绝的蚀毒仙草炼成的仙丹，丹力远超寻常灵药；即将渡劫的老怪物见了也忍不住动心（V10C1863）。',
      effect: { maxhp: 380, dmg: 0.08 } },
    // 玄天之宝：内蕴法则之力的先天灵宝，以玄天仙藤炼成，非人力所能为（V7C1252）。
    { id: 't_xuantianzhibao', name: '玄天之宝', rarity: 5, icon: '🗡', slot: 'weapon', req: 260, unique: true, noDrop: true,
      desc: '内蕴天地法则的先天灵宝，以玄天仙藤炼成，非人力所能锻造。圣岛一脉所得，与玄天斩灵剑同源而异形（V7C1252）。伤害 +24%，出手快 +12%，重击 +5%。',
      effect: { dmg: 0.24, atkSpd: 0.12, crit: 0.05 } }
  );
  // 噬金虫王：以数千成熟体噬金虫育化而成的虫王，传闻一成连真仙也要退避三尺（V9C1522 / V10C1866）。
  window.PETS.push(
    { id: 'p_shijinwang', icon: '🐛', name: '噬金虫王', spr: 'shijin', scale: 1.9, dmg: 1.2, rate: 1.4, cat: 'pet',
      desc: '以数千成熟体噬金虫育化而成的虫王（V9C1522 / V10C1866）。传闻一成，连真仙也要退避三尺。',
      from: '魔源海' }
  );

  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  // ========================= 一(2)、化神之后的境界层 =========================
  // realmName() 只查 REALM_LAYERS；不补这一段，150/200/260/330/420 会显示成「化神后期」。
  // 原著：炼虚/合体/大乘为「中境界」，渡劫为「上境界」，真仙为飞升之后（V2C127）。
  // 注：原著大乘不分初/中/后，这里按等级段给「大乘期」，不改境界名。
  window.REALM_LAYERS.push(
    { lv: 150, name: '炼虚初期', hp: 2400,  dmg: 0.66, atk: 0.36, spd: 0.09, skill: 'nova',  note: '五行合一，寿元无穷' },
    { lv: 165, name: '炼虚中期', hp: 3000,  dmg: 0.72, atk: 0.39, spd: 0.09, skill: 'baimai', note: '真元如海' },
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
  // 灵界两味破境丹的「去哪取」提示（门槛按「拿到手的那一级」写，不是按破境之后写）：
  Object.assign(window.BREAK_ITEM_HINTS, {
    tenglong: '木族领地一战得《腾龙丹方》。芝龙果全篇只有一枚（原著：木族之行途中夺得，同行诸人各分一枚），到手即留种移入天渊城洞府「灵界药圃」，此后打图就长、回洞府定期采收，取之不绝；真灵之血／鳞片另攒。携方回洞府「丹炉」自炼，方子不毁可反复开炉（V9C1364）。',
    // 丹炉里「芝龙果 0/1」点料名时给的去处：别让人以为只能等 boss，唯一的持续来源是自家药圃
    m_zhilongguo: '木族之行只得一枚（原著同行诸人各分一枚）。这一枚会当场留种移入天渊城洞府「灵界药圃」，此后在战斗图里自行生长、回洞府采收即得，取之不尽（V9C1364）。',
    heti:     '广寒界玉台上那一枚万妙丹（韩立 1467 岁持广寒令入界所得）。合体这一步不在广寒界过：自雷鸣大陆跨大陆传送回风元大陆，元合岛闭关，炼神术第一层成、万妙丹入腹，再渡三千年一次的大天劫（V10，1565 岁）。'
  });
  window.BREAKTHROUGH.push({
    lv: 150, realm: '炼虚初期', from: '化神后期',
    canonCave: 'tycave',
    tip: '进阶炼虚的关键是「五行合一」——须兼修多属性功法（《百脉炼宝诀》，天渊城灵地·金阙玉书所得），单一属性难成（V7C1219）。再以一炉腾龙丹压住灵压（V9C1364）。腾龙丹凭木族领地所得《腾龙丹方》，回天渊城洞府「丹炉」自炼；万年金雷竹种剑百年，关自会松（1430 岁）。',
    items: [['tenglong', 1]],
    mats: [],
    stones: 15000,
    keepOnFail: true,  // 腾龙丹是木族一趟一趟磨来的，冲关失利不没收，灵压反噬退回
    skill: 'baimai',   // 五行合一：须兼修一门多属性功法（百脉炼宝诀，出自金阙玉书外七十二页）
    chance: { step: 0.5 },   // 一枚腾龙丹五成；押两枚必成
    // 前置＝已过冥河（种剑百年的最后一段），场景落在黑隐山脉洞府
    story: [{ id: 'minghe', name: '灵界·黑隐山脉 洞府' }],
    lines: [
      ['韩立', '（人界之巅已过。灵界的第一道门，是五行合一。）'],
      ['旁白', '黑隐山脉的洞府里，他把万年金雷竹种进灵脉。一百年，等的就是这一日。'],
      ['韩立', '（金木水火土，缺一行，炼虚便成空谈。）'],
      ['旁白', '腾龙丹入腹，那股药力在经脉里烧成一条线，往丹田里那道关口顶。'],
      ['旁白', '轰——丹田里那团真元，第一次摸到了「无穷」的边。'],
      ['韩立', '（炼虚。寿元，终于不再是悬在头顶的刀。）']
    ]
    },
    {
      lv: 200, realm: '合体初期', from: '炼虚后期',
      canonCave: 'yuangong',
      tip: '炼虚之上是合体。原著这一步不在广寒界过：自雷鸣大陆跨大陆传送回风元大陆，元合岛闭关修成炼神术第一层，以万妙丹压住灵压、真灵之血淬体，再渡三千年一次的大天劫（V10，韩立 1565 岁）。',
      items: [['heti', 1]],
      mats: [['m_zhenlingxue', 2]],
      stones: 30000,
      chance: { step: 0.34 },   // 万妙丹一枚三成四；三枚必成
      // 前置＝已通广寒界（丹从那里带出来）；剧情场景落在元合岛青元宫
      story: [{ id: 'guanghan', name: '灵界·元合岛 青元宫' }],
      lines: [
        ['韩立', '（炼虚之后，是合体。三千年一次的大天劫，躲不过。）'],
        ['旁白', '元合岛上，青元宫的门关了三年。炼神诀第一层只有一句：神在，则形在。'],
        ['韩立', '（炼虚之后，肉身与元婴各走一条路。这一步，是把两条路拧回一条。）'],
        ['旁白', '大天劫自天顶压下，屋顶掀了，院子里的灵竹折成两截。'],
        ['旁白', '万妙丹入腹，真灵之血入骨。那一瞬间，肉身与元婴终于不再分彼此。'],
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
      story: [{ id: 'modajie', name: '魔界·苦灵岛 洗灵池' }],
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
      { id: 'J', name: '灵界·百族', note: '黑隐山脉，雷鸣大陆，广寒界' },
      { id: 'K', name: '灵界·魔劫', note: '圣岛，魔界之战' },
      { id: 'L', name: '真仙', note: '三劫，九劫，飞升仙界' }
    );
  }

  // ========================= 四、地图 =========================
  window.MAPS.push(
    {
      // 原著（1007 岁）：与冰凤联手渡空间节点入灵界，落点是「人族天元境内的青罗沙漠」。
      // 空间风暴把两人冲散，身上互下的禁制反噬 —— 只能把元婴与第二元婴的精元散入肉身，以此保命，法力尽失。
      id: 'qinluo', name: '青罗沙漠', pos: '灵界·天元境 青罗沙漠', arc: 'I',
      type: 'story', tag: '剧情',
      desc: '空间节点把他吐在一片黄沙上。灵气浓得压人，身上却连一丝法力都提不起来。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'feisheng', next: 'anyuan',
      reward: { stones: 3000 },
      clearTitle: '法力归零',
      clearDesc: '禁制反噬压了下去，代价是元婴散尽、法力归零。沙丘后过来一支商队，旗上写着天东。'
    },
    {
      // 原著（1007 岁）：随天东商号到安远城，赶上兽潮，城破。他此时法力尽失，靠金刚诀炼体撑着，
      // 从废墟里救出人族与黑凤族的混血女童黛儿；黛儿后被黑凤族接走，他赠了一方绘着南宫婉画像的手帕。
      id: 'anyuan', name: '安远城', pos: '灵界·天元境 安远城', arc: 'I',
      type: 'story', tag: '剧情',
      desc: '沙海边上的一座土城。商队进城那日，城外的兽吼一夜没停。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'qinluo', next: 'luori',
      reward: { stones: 12000, mats: [['m_zhenlinglin', 1]] },
      clearTitle: '城破',
      clearDesc: '城墙塌了半边，兽潮涌进来。他背着一个半妖的小女孩从西门出去——那孩子额上有一道黑羽纹。'
    },
    {
      // 原著（1047→1050 岁）：在虞阳城落脚（妖族坊市见支线 yuyang），回青罗沙漠取回储物袋
      // （六翼霜蚣已互相吞食进阶、遁走），掩埋虫壳，赶路数年；在落日城收银芯石炼灵具，半月后入落日之墓。
      // 墓中太阴真火吞了太阳精火与守墓灵族「噬炎」的本源，化作噬灵天火；收豹麟兽，得灵族神血，
      // 随即被两名炼虚追杀，逃入荒山山腹。
      id: 'luori', name: '落日之墓', pos: '灵界·落日城 落日之墓', arc: 'I',
      type: 'boss', tag: '剧情战',
      desc: '落日城外的荒原上塌着半座古墓。墓里的火，三千年没灭。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'anyuan', next: 'shanku',
      diff: 3.4, bossAt: 0, intro: 'luori', outro: 'luori_out',
      enemies: ['shixiao', 'guiwu', 'yaoshou2'],
      elites: ['守墓阴兽', '噬炎残影'],
      mats: ['m_yaodan', 'm_yanghun', 'm_xueyu'],
      boss: { kind: 'beast', name: '落日之墓·噬炎', hp: 46000, spd: 62, dmg: 92, r: 22, spr: 'guixiu', scale: 6.0, summon: 'guiwu' },
      reward: { stones: 8000, mats: [['m_yaodan', 2]] },
      clearTitle: '噬灵天火',
      clearDesc: '太阴真火吞了太阳精火，又吞了灵族本源，烧成一团青白。墓外两道炼虚气息正压过来——他抱起小兽，退进荒山。'
    },
    {
      // 原著（1050→1160 岁）：山腹潜修百余年，金刚诀（明王诀）大成，禁制解除；虚化的元婴借灵药重新凝成。
      // 凝成之日就是灵界第一次天劫（两色雷劫），渡劫时被赵无归等两名天渊卫出手相救，随后被引渡回天渊城。
      id: 'shanku', name: '山腹·两色雷劫', pos: '灵界·荒山 山腹', arc: 'I',
      type: 'story', tag: '剧情',
      desc: '荒山深处有个天然的石腹。口子窄，进去却宽敞，正好闭关。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'luori', next: 'tianyuan',
      reward: { stones: 6000 },
      clearTitle: '元婴重凝',
      clearDesc: '两色雷云散尽，荒山上站着两个穿青袍的人。他们看了他很久，说：跟我们回天渊城。'
    },
    {
      // 原著（1160→1220 岁）：天渊城任丙五十六小队青冥卫六十年，在玉阙阁选灵地、开辟洞府；
      // 监视灵地时追入莫名空间，经空间风暴，得金阙玉书外七十二页（炼器外页），从中参出《百脉炼宝诀》，
      // 决意法体双修，修梵圣真魔功，进阶化神中期。百脉炼宝诀的来处在此，不在坊市货架上。
      id: 'lingdi', name: '灵地·金阙玉书', pos: '灵界·天渊城 玉阙阁灵地', arc: 'I',
      type: 'story', tag: '剧情',
      desc: '山腰那片灵地，是他跟人争了半日才分到的。布下监视法阵的第三个月，阵盘响了。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'tianyuan', next: 'muzu',
      reward: { stones: 10000, mats: [['m_gengjing', 2]] },
      clearTitle: '金阙玉书',
      clearDesc: '七十二页炼器外页拼起来，是一条法体双修的路。他把青竹蜂云剑一口口拆开，往骨骼里炼。'
    },
    {
      // 原著（1220 岁）：接天渊城任务往木族一行，同行有真龙世家陇东、天凤世家叶颖、黑凤族筱虹。
      // 灵舟被变异巨蜥击毁，众人坠在山坳，坳中一株成熟芝龙果由变异巨蜥与未成年千目巨人守着；
      // 韩立以风雷翅强夺灵果，四人各分一枚。归途血战影族赤影与银阶木族，筱虹陨落，他收了她的储物镯。
      // 芝龙果是腾龙丹的主药（V9C1364）；《腾龙丹方》在这里得，不在黑凤族荒岭。
      id: 'muzu', name: '木族领地', pos: '灵界·蛮荒 木族领地', arc: 'I',
      type: 'boss', tag: '剧情战',
      desc: '任务牌上写着「侦察木族」。同行的三个世家子弟，一个都不好相与。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'lingdi', next: 'zhenchan',
      diff: 3.5, bossAt: 0, intro: 'muzu', outro: 'muzu_out',
      enemies: ['yaoshou2', 'yaoxiu', 'dajinxiu'],
      elites: ['木族守卫', '影族刺客'],
      mats: ['m_zhenlinglin', 'm_zhenlingxue', 'm_yaodan', 'm_gengjing'],
      boss: { kind: 'beast', name: '银阶木族', hp: 52000, spd: 66, dmg: 96, r: 23, spr: 'haishou', scale: 6.2, summon: 'yaoshou2' },
      // 原著口径：芝龙果「同行诸人各分一枚」——韩立手上就只有一枚，不再为爽感多发。
      // 这一枚当场留种移入灵界药圃（绿液催着，此后定期采收），持久供给靠药圃，不靠白送。
      reward: { stones: 18000, items: ['f_tenglong'], mats: [['m_zhilongguo', 1], ['m_zhenlingxue', 2], ['m_zhenlinglin', 6]] },
      clearTitle: '木族事了',
      clearDesc: '银阶木族伏地，噬金虫从它的孔窍里钻出来，一片金光。芝龙果与丹方都在袋里，炼虚那一步有着落了。'
    },
    {
      // 原著：木族事了，他到飞升修士聚集之地合力收取碧眼真蟾，遭夜叉族围攻，
      // 与肖姓道友共抗合体期的夜叉王，抢了一窝真蟾后借传送法阵遁走，
      // 落在风元大陆边缘半岛的黑隐山脉。山中一甲子苦修梵圣真魔功，三次冲化神后期瓶颈未果。
      id: 'zhenchan', name: '碧眼真蟾', pos: '灵界·风元大陆 边缘半岛', arc: 'I',
      type: 'boss', tag: '剧情战',
      desc: '荒谷里聚了一群飞升修士，要合力收一窝碧眼真蟾。真蟾的血，是炼体的好东西。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'muzu', next: 'tianpeng',
      diff: 3.6, bossAt: 0, intro: 'zhenchan', outro: 'zhenchan_out',
      enemies: ['yaoshou2', 'yaoxiu', 'kui2'],
      elites: ['夜叉族战将', '碧眼真蟾'],
      mats: ['m_yaodan', 'm_banyao', 'm_zhenlingxue'],
      boss: { kind: 'mo', name: '夜叉族·夜叉王', hp: 62000, spd: 70, dmg: 118, r: 24, spr: 'mo', scale: 6.4, summon: 'yaoxiu' },
      reward: { stones: 14000, mats: [['m_zhenlingxue', 2], ['m_yaodan', 3]] },
      clearTitle: '遁入黑隐',
      clearDesc: '传送阵的白光散尽，脚下换了一片海。风里有铁锈味，远处的山脉是黑的——黑隐山脉。'
    },
    {
      // 原著（1315 岁）：冒充天鹏族人混入天鹏圣地，风雷翅上那根鲲鹏真羽惊动了被封印的鲲鹏灵魂，
      // 身份被天鹏族大长老金悦识破；交易是「冒充天鹏圣子参加地渊测试，以保全天鹏族」。
      // 得鲲鹏真血、鲲鹏舍利与《惊蛰十二诀》，借真血之助冲破化神后期（V9C1421–C1423）。
      // 惊蛰十二变出自这里，不在广寒界，也不在坊市货架上。
      id: 'tianpeng', name: '天鹏圣地·地渊', pos: '灵界·飞灵族 天鹏圣地 地渊', arc: 'I',
      type: 'boss', tag: '剧情战',
      desc: '天鹏圣地在飞灵族腹地。他借风雷翅上那根鲲鹏真羽的气息，混进了圣地外围。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'zhenchan', next: 'minghe',
      diff: 3.6, bossAt: 0, intro: 'tianpeng', outro: 'tianpeng_out',
      enemies: ['yaoshou2', 'gui2', 'yaoxiu'],
      elites: ['地渊阴兽', '天鹏族卫士'],
      mats: ['m_yaodan', 'm_zhenlingxue', 'm_yanghun'],
      boss: { kind: 'beast', name: '地渊·阴兽', hp: 68000, spd: 64, dmg: 108, r: 24, spr: 'guixiu', scale: 6.2, summon: 'gui2' },
      reward: { stones: 16000, items: ['dan_kunpeng'], mats: [['m_zhenlingxue', 2]] },
      clearTitle: '惊蛰十二变',
      clearDesc: '真血入体，胸前浮起一尊巨鹏法相。《惊蛰十二诀》到手，化神后期那道瓶颈终于裂了。'
    },
    {
      // 原著（1316→1430 岁）：地渊中被妖王木青擒去，遇元瑶，学辟邪神雷与祭雷之术；
      // 与元瑶二女同赴冥河之地破禁取物，布转轮聚阴阵拔掉四合体老妖下的印记，
      // 逃时被鬼雾吸入姜前辈（半青元子）洞府，得青元子相助脱身，并应下替他寻材料。
      id: 'minghe', name: '冥河之地', pos: '灵界·地渊 冥河之地', arc: 'I',
      type: 'story', tag: '剧情',
      desc: '冥河上没有船，只有一层浮着的黑雾。雾里伸着手。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'tianpeng', next: 'lianxu',
      reward: { stones: 12000, mats: [['m_yanghun', 2], ['m_xueyu', 2]] },
      clearTitle: '冥河脱身',
      clearDesc: '印记像一根烧红的针被抽了出去。黑雾一卷，再睁眼是一间摆满药架的石室——青元子的洞府。'
    },
    {
      // 破境图：endLevel 必须等于炼虚关 lv150，洞府「进阶」靠它进场（同 jieying / jiezi）。
      // 原著（1430 岁）：回黑隐山脉洞府，用万年金雷竹种剑；春去秋来一百多年，进阶炼虚初期。
      id: 'lianxu', name: '黑隐山脉·种剑', pos: '灵界·风元大陆 黑隐山脉 洞府', arc: 'I',
      type: 'story', tag: '剧情',
      desc: '腾龙丹在手，万年金雷竹也埋进了灵脉。灵界的第一道大关，要等它自己长成。',
      startLevel: 132, endLevel: 150, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'minghe', next: 'fengyuan',
      reward: { stones: 20000, mats: [['m_zhenlingxue', 1]] },
      clearTitle: '炼虚已成',
      clearDesc: '五行归一，真元第一次摸到「无穷」的边。寿元不再是悬在头顶的刀。'
    },
    {
      // 原著（韩立 1461 岁）：炼虚初期在风元大陆边缘半岛的黑隐山脉种剑百年。
      // 玄天果实熟的那一日，混沌万灵榜生出感应，海王族、角蚩族以血祭召唤（V9C1531《血云》）；
      // 果实当场化剑救主，他被空间裂缝抛去亿万里外的雷鸣大陆海域 —— 炼虚之后的第一战就在这里。
      id: 'fengyuan', name: '黑隐山脉', pos: '灵界·风元大陆 边缘半岛', arc: 'J',
      type: 'boss', tag: '剧情战',
      desc: '风元大陆边缘半岛上的黑隐山脉，他在此种剑百年。玄天果实熟的那夜，天顶压下来一片血云。',
      startLevel: 150, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'lianxu', next: 'huohu',
      diff: 3.4, bossAt: 0, intro: 'heiyin', outro: 'heiyin_out',
      enemies: ['yaoshou2', 'yaoxiu', 'dajinxiu'],
      elites: ['海王族祭师', '角蚩族血卫'],
      mats: ['m_zhenlingxue', 'm_zhenlinglin', 'm_yaodan'],
      boss: { kind: 'mo', name: '血云·血祭大阵', hp: 64000, spd: 66, dmg: 100, r: 23, spr: 'neimen', scale: 6.0 },
      reward: { stones: 26000, items: ['t_xuantianjian'], mats: [['m_zhenlingxue', 2], ['m_zhenlinglin', 2]] },
      clearTitle: '玄天剑现',
      clearDesc: '血云散尽，一柄巴掌大的小剑落在掌心。身后裂开一道空间缝隙，把他扔去了雷鸣大陆。'
    },
    {
      // 原著（1461–1463 岁）：被空间裂缝抛到雷鸣大陆外海，助火阳族灭了乌罗族，得「洞旋金光」；
      // 再由火瑚群岛的传送阵上雷鸣大陆。这一段原著写得像插曲，却是他离开人妖两族后的头一站。
      id: 'huohu', name: '火瑚群岛', pos: '灵界·雷鸣大陆 海域', arc: 'J',
      type: 'story', tag: '剧情',
      desc: '空间裂缝把他扔在雷鸣大陆外的海域。火瑚群岛上的火阳族，正被乌罗族逼到最后一岛。',
      startLevel: 150, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'fengyuan', next: 'shisan',
      reward: { stones: 28000, mats: [['m_zhenlingxue', 2], ['m_zhenlinglin', 2]] },
      clearTitle: '洞旋金光',
      clearDesc: '乌罗族的战船沉进海里。火瑚群岛的传送阵亮起来，上头就是雷鸣大陆。'
    },
    {
      // 原著（1463 岁）：入雷鸣大陆天云十三族，在天云城再遇被夺舍的向之礼；
      // 无意间激发广寒令，才有了后来进广寒界的机会。城里也买到了那件破损的天外魔甲。
      id: 'shisan', name: '天云十三族', pos: '灵界·雷鸣大陆 天云城', arc: 'J',
      type: 'story', tag: '剧情',
      desc: '雷鸣大陆上十三个族群结成的盟，天云城是他们共用的中枢。城里什么都卖，包括一件破损的天外魔甲。',
      startLevel: 150, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'huohu', next: 'mojin',
      reward: { stones: 30000, mats: [['m_zhenlingxue', 2], ['m_zhenlinglin', 2]] },
      clearTitle: '广寒令',
      clearDesc: '那枚从旧货堆里翻出来的广寒令，被他无意间激发了。广寒界的门，就这么开了。'
    },
    {
      // 原著（1464 岁）：入魔金山脉，斩合体级魔猿，得山岳巨猿真血与半截玄天残刃
      // （那正是宝花圣祖自爆的如意刃碎片，被一头魔猿盗走）。宝花也由此醒来。
      id: 'mojin', name: '魔金山脉', pos: '灵界·雷鸣大陆 魔金山脉', arc: 'J',
      type: 'boss', tag: '剧情战',
      desc: '魔金山脉深处，一头合体级的魔猿盘踞多年。它身上有山岳巨猿的真血，怀里还揣着半截来路不明的残刃。',
      startLevel: 150, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'shisan', next: 'guanghan',
      diff: 3.6, bossAt: 0, intro: 'mojin', outro: 'mojin_out',
      enemies: ['kui2', 'dajinxiu', 'zhengdao'],
      elites: ['魔金魔兽', '守山魔猿'],
      mats: ['m_zhenlingxue', 'm_yaodan', 'm_zhenlinglin'],
      boss: { kind: 'beast', name: '魔金山脉·魔猿', hp: 70000, spd: 68, dmg: 108, r: 24, spr: 'haishou', scale: 6.4 },
      reward: { stones: 30000, mats: [['m_zhenlingxue', 3], ['m_zhenlinglin', 2]] },
      clearTitle: '巨猿真血',
      clearDesc: '魔猿倒下，山岳巨猿的真血凝成一滴赤金。那半截残刃在他手里震了一下——远处，有人醒了。'
    },
    {
      // 原著（1467–1468 岁）：持广寒令入广寒界，得太乙青山、万妙丹、炼神诀前两层与满界灵药；
      // 本体与第二元婴双双修到炼虚后期巅峰。合体丹不在广寒界——那一步是回到风元大陆才走的。
      id: 'guanghan', name: '广寒界', pos: '灵界·广寒界', arc: 'J',
      type: 'boss', tag: '剧情战',
      desc: '灵界有名的大秘境，寒气三千年不散。界里守着的傀儡，比寒气更难缠。',
      startLevel: 150, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'mojin', next: 'heti_guan',
      diff: 3.7, bossAt: 0, intro: 'guanghan', outro: 'guanghan_out',
      enemies: ['kui2', 'dajinxiu', 'zhengdao'],
      elites: ['广寒界守卫', '寒魄傀儡'],
      mats: ['m_zhenlingxue', 'm_zhenlinglin', 'm_yaodan'],
      boss: { kind: 'mo', name: '广寒界·通灵傀儡', hp: 68000, spd: 68, dmg: 112, r: 24, spr: 'neimen', scale: 6.2 },
      reward: { stones: 30000, items: ['heti'], mats: [['m_zhenlingxue', 2], ['m_zhenlinglin', 2]] },
      clearTitle: '广寒界开',
      clearDesc: '傀儡碎了一地。玉台上，一枚万妙丹静静躺着，殿后是满界的灵药与那座太乙青山。'
    },
    {
      // 破境图：endLevel 必须等于合体关 lv200。
      // 原著（1565 岁）：经跨大陆传送阵自雷鸣大陆回风元大陆，在元合岛闭关，炼神术第一层成，进阶合体。
      id: 'heti_guan', name: '元合岛·青元宫', pos: '灵界·风元大陆 元合岛', arc: 'J',
      type: 'story', tag: '剧情',
      desc: '跨大陆传送阵把他送回风元大陆。元合岛上，青元宫的灯还亮着；炼神术第一层，就在这里修成。',
      startLevel: 150, endLevel: 200, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'guanghan', next: 'liangzu',
      reward: { stones: 30000, mats: [['m_zhenlingxue', 1]] },
      clearTitle: '合体已成',
      clearDesc: '炼神术第一层在识海里立住了。三千年一次的大天劫压下来，他一步没退。'
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
      reward: { stones: 35000, items: ['t_xuantianzhibao'], mats: [['m_zhenlinglin', 3], ['m_zhenlingpo', 1]] },
      clearTitle: '圣岛一行',
      clearDesc: '圣岛的使者只说了一句话：魔界的门，快开了。临行，一截真灵之魄与一件玄天之宝落进了袖里。'
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
      elites: ['魔族魔修', '血魔'],
      mats: ['m_zhenlingxue', 'm_yaodan', 'm_gangyin'],
      boss: { kind: 'mo', name: '魔族魔修', hp: 85000, spd: 68, dmg: 130, r: 24, spr: 'mo', scale: 6.4 },
      extraBoss: [{ kind: 'mo', name: '青龙上人', hp: 78000, spd: 62, dmg: 138, r: 23, spr: 'neimen', scale: 6.2, summon: '' }],
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
      elites: ['镇魔锁守卫', '黄泉鬼将'],
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
      reward: { stones: 65000, items: ['t_weimozhu'], mats: [['m_xilingchi', 1], ['m_zhenlingxue', 2], ['m_zhenlinglin', 2]], pets: ['p_shijinwang'] },
      clearTitle: '魔源海已过',
      clearDesc: '洗灵池没找到，净灵莲也没开。可一枚伪魔珠、一壶洗灵池液、还有那窝育成了虫王的噬金虫，都落到了手里。'
    },
    {
      id: 'xiaoling', name: '小灵天', pos: '灵界·小灵天', arc: 'K',
      type: 'boss', tag: '剧情战',
      desc: '魔界里藏着一方小世界。守着那一炉火的人，比这方天还老。',
      startLevel: 220, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'moyuan', next: 'modajie',
      diff: 4.1, bossAt: 0, intro: 'xiaoling', outro: 'xiaoling_out',
      enemies: ['kui2', 'dajinxiu', 'zhengdao'],
      elites: ['小灵天守卫', '灵天傀儡'],
      mats: ['m_xuantianteng', 'm_zhenlingxue', 'm_yaodan'],
      // 原著小灵天是碎裂界面（诸族杂居），并无「界主/之主」之称 —— 此图为玩法原创，
      // 故只用地名 + 中性称谓，不冒充原著头衔
      boss: { kind: 'mo', name: '小灵天镇守', hp: 105000, spd: 72, dmg: 150, r: 25, spr: 'neimen', scale: 6.6 },
      reward: { stones: 70000, mats: [['m_xuantianteng', 1], ['m_zhenlingxue', 2]] },
      clearTitle: '小灵天开',
      clearDesc: '一方小世界落到手里。合体后期到此为止，再往上，是大乘。'
    },
    {
      // V10 卷的收束（原著 C2100《魔界大劫》）：苦灵岛下锁着洗灵池，
      // 元魇圣祖与宝花圣祖守在那里，等着一株炼魔草。
      // 原著里韩立打不过圣祖，靠「涅盘圣体 + 手中灵药」跟两位圣祖谈条件，换洗灵池三日。
      // 所以这一图不能编成「斩杀圣祖」——而是打穿魔族围杀、走到阵前谈成这笔交易。
      id: 'modajie', name: '魔界大劫', pos: '魔界·苦灵岛', arc: 'K',
      type: 'boss', tag: '剧情战',
      desc: '魔界深处的苦灵岛。岛下锁着洗灵池，池里一天抵外面一年；岛外守着两位圣祖，和一座岛的魔物。',
      startLevel: 220, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'xiaoling', next: 'sanjie',
      diff: 4.15, bossAt: 0, intro: 'modajie', outro: 'modajie_out',
      enemies: ['gui2', 'moxiu2', 'guixiu'],
      elites: ['圣祖魔卫', '苦灵岛守卫'],
      mats: ['m_zhenlingxue', 'm_zhenlinglin', 'm_yaodan'],
      boss: { kind: 'mo', name: '元魇圣祖·化身', hp: 118000, spd: 74, dmg: 158, r: 25, spr: 'mo', scale: 6.6 },
      extraBoss: [{ kind: 'mo', name: '宝花圣祖', hp: 105000, spd: 60, dmg: 168, r: 24, spr: 'nvxiu', scale: 6.4, summon: '' }],
      reward: { stones: 78000, items: ['t_jinglinglian'], mats: [['m_zhenlingxue', 3], ['m_zhenlinglin', 2]] },
      clearTitle: '苦灵岛·洗灵池',
      clearDesc: '三日洗灵池，抵外面三年苦修。炼魔草交出去，换一条活着离开魔界的路。'
    },

    // ---------------- V11 / V12 大乘 · 渡劫 · 真仙 ----------------
    {
      id: 'sanjie', name: '三劫·进阶大乘', pos: '灵界·荒原 劫云下', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '五行之劫、真雷劫、心魔之劫。三劫过尽，才是大乘。',
      startLevel: 220, endLevel: 260, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'modajie', next: 'jiujie',
      reward: { stones: 80000, mats: [['m_zhenlingxue', 2]] },
      clearTitle: '大乘已成',
      clearDesc: '三劫散尽，真元沉成一片海。大乘。'
    },
    {
      id: 'jiujie', name: '九劫现', pos: '灵界·荒原 劫云下', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '九道仙劫压顶。过得去，才谈得上飞升。',
      startLevel: 260, endLevel: 330, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'sanjie', next: 'qunqiang',
      reward: { stones: 120000, items: ['t_wanlingsan', 'dan_shixian'] },
      clearTitle: '九劫已过',
      clearDesc: '第九道劫雷落下又散去。撑劫的万灵伞收进袖里，一枚蚀仙丹滚落掌心——天地间，再没有什么能压住他了。'
    },
    {
      // V12C2423《群强之陨》：轩九灵以「九劫灭灵大法」的九劫真焰击杀了明尊，
      // 随后七座血玺落下，三人大乘连同四头真兽化为飞灰；银色巨人被八座金色火山困杀。
      // **原著里韩立不在现场**（C2423 全章 0 次出现「韩立」）——所以这一图是「赶到时仗已打完」，
      // 由旁白与战后现场还原，不能写成他亲自动手。
      id: 'qunqiang', name: '群强之陨', pos: '灵界·金色世界', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '他赶到的时候，仗已经打完了。金色世界塌了一半，坑底还立着一个金色巨人。',
      startLevel: 330, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'jiujie', next: 'xianshi',
      reward: { stones: 150000, items: ['t_yuanhejiwu', 't_liangyiwuchen'], mats: [['m_zhenlingxue', 3]] },
      clearTitle: '群强之陨',
      clearDesc: '赢是赢了，赢得一个都不剩。坑底只剩两样东西：元合五极山，和一座两仪微尘阵。'
    },
    {
      // V12C2424《献祭》：明尊要用整个风元大陆换一座两仪微尘阵（残品）来对付马良。
      // 云淡、月梳这两位大乘被安排在「阵眼」，其实是明尊给他们设的绝地——
      // 原著原话：「明尊根本没有在这里留下什么玄天之宝，他恐怕是想让我兄妹当玄天之宝的替代之物」。
      // 韩立这一段不是旁观者：他事先暗中吩咐噬金虫王去牵制马良，好看清那边的情形；
      // 银色法盘往下灌符文时，他也没有喊停。
      id: 'xianshi', name: '献祭·风元大陆', pos: '灵界·鸣煞之地', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '祭坛下方，一面青色古镜悬在半空。镜里是噬金虫王，正和金甲士缠斗。银色法盘还在往法阵里灌符文。',
      startLevel: 330, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'qunqiang', next: 'zhenxian',
      reward: { stones: 130000, mats: [['m_zhenlingxue', 3], ['m_xuantianteng', 1]] },
      clearTitle: '献祭',
      clearDesc: '风元大陆元气大伤。他没喊停——这一局，本来就不只是他一个人在打。'
    },
    {
      // V12C2425《掌天瓶》：两仪微尘阵自爆 → 巨大盆地 → 马良重伤显形 →
      // 韩立胸前瓶形青光浮现，马良袖中飞出墨绿小瓶。
      // **「掌天瓶」这个名字就是在这一章由马良说出来的**（原著全 13 次，首现即此章）。
      id: 'zhangtianping', name: '掌天瓶·盗天瓶', pos: '灵界·鸣煞之地 盆地', arc: 'L',
      type: 'boss', tag: '剧情战',
      desc: '两仪微尘阵炸成一个万里大坑。马良赤身裸体地立在坑心，胸口起伏。然后两只瓶子，隔着空气互相叫了起来。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'zhenxian', next: 'zhanxian',
      diff: 5.2, bossAt: 0, intro: 'zhangtianping', outro: 'zhangtianping_out',
      enemies: ['gui2', 'moxiu2', 'guixiu'],
      elites: ['九元观随从', '金色甲士'],
      mats: ['m_zhenlingxue', 'm_xuantianteng'],
      boss: { kind: 'mo', name: '马良·真仙之身', hp: 260000, spd: 86, dmg: 300, r: 27, spr: 'mo', scale: 7.0 },
      reward: { stones: 220000, items: ['t_zhangtianping', 't_daotianping'], mats: [['m_xuantianteng', 1], ['m_zhenlingxue', 3]] },
      clearTitle: '掌天瓶',
      clearDesc: '青瓶与墨绿瓶之间的嗡鸣声越来越响，像两头隔着水面互相呼唤的兽。原来它有名字。'
    },
    {
      id: 'zhenxian', name: '真仙之身', pos: '灵界·荒原 雷光中', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '渡劫之后，铸真仙之身。',
      startLevel: 330, endLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'xianshi', next: 'zhangtianping',
      reward: { stones: 160000 },
      clearTitle: '真仙',
      clearDesc: '一身不再是凡胎。眉眼还是那眉眼，气息已不在此界。'
    },
    {
      // 前传最后一战（原著 C2426–C2428《斩仙》上中下 / C2429《天魔契约》）：
      // 仙界九元观嫡传马良下界，界面之力把他压着，只能显出大乘的威压；
      // 他手上有万灵血玺（八条五爪血龙）、一支银笛，还放出了火须子。
      // 韩立化梵圣魔神（三头六臂，五件金色重兵），最后以「洞漩金光」定住他，
      // 再用玄天斩灵剑放出的墨绿细线从脖颈一闪而过——头颅滚落，元婴被毁灭之力震碎。
      // 这一战之后：收金灿灿储物镯、魔光吞了马良的神魂来投靠、火须子为回仙界认主。
      id: 'zhanxian', name: '斩仙·万灵血玺', pos: '灵界·荒原 血河', arc: 'L',
      type: 'boss', tag: '终局战',
      desc: '八条五爪血龙从血河里爬出来。仙界来的真仙，被界面之力压着，还是大乘的威压。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'zhangtianping', next: 'huimoyuan',
      diff: 5.0, bossAt: 0, intro: 'zhanxian', outro: 'zhanxian_out',
      enemies: ['gui2', 'moxiu2', 'guixiu'],
      elites: ['万灵血龙', '九元观随从'],
      mats: ['m_zhenlingxue', 'm_xuantianteng'],
      boss: { kind: 'mo', name: '马良·九元观真仙', hp: 300000, spd: 88, dmg: 320, r: 28, spr: 'mo', scale: 7.2 },
      reward: { stones: 240000, items: ['t_wanlingxueyi', 't_moguang', 't_huoxuzi', 'dan_zhihun'], mats: [['m_xuantianteng', 2], ['m_zhenlingxue', 4]] },
      clearTitle: '斩仙',
      clearDesc: '墨绿细线从脖颈一闪而过，一颗头颅滚落下来。灵界最后一场硬仗，打完了。'
    },
    {
      // V12 终局段（原著 C2434《再回魔源》/ C2435《瓶灵回归》）：鳞片传来「两年后·真龙之岛·广灵道果大会」，
      // 赴会之前先去魔界寻瓶灵 —— 魔源海苦灵谷，灵霄天柱自开，黄色小瓶要跟掌天瓶「合一」。
      // 这一图不是打，是对峙：元魇圣祖想抢，被蟹道人挡在阵前，一步没敢上来。
      id: 'huimoyuan', name: '再回魔源', pos: '魔界·魔源海 苦灵谷', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '银色鳞片浮出一行古文：两年后，真龙之岛，广灵道果大会。赴会之前，先去魔界寻瓶灵。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'zhanxian', next: 'daoguo',
      reward: { stones: 190000, mats: [['m_zhenlingxue', 2], ['m_zhenlinglin', 3]] },
      clearTitle: '瓶灵回归',
      clearDesc: '两只小瓶合成一只。元魇圣祖站在阵外看了很久，到底没敢上前。'
    },
    {
      // 原著 C2439《交易、大会》/ C2440《得果》：龙族用独有禁制圈出一整片山林，道果藏在其间，
      // 规矩只有一条——抢到手的才是你的。树化巨人、天象尊者都是真刀真枪杀过来的。
      // 终局段四张图里，只有这一张是「高密度战斗」，飞升之劫之前的一次全身活动。
      id: 'daoguo', name: '道果大会', pos: '灵界·真龙之岛 禁制中', arc: 'L',
      type: 'boss', tag: '剧情战',
      desc: '龙族用禁制圈出一整片山林，道果就藏在里面。规矩只有一条：抢到手的，才算你的。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'huimoyuan', next: 'renzu',
      diff: 4.55, bossAt: 0, intro: 'daoguo', outro: 'daoguo_out',
      enemies: ['kui2', 'yaoshou2', 'dajinxiu'],
      elites: ['化木为灵·巨人', '异界大乘'],
      mats: ['m_zhenlingxue', 'm_zhenlinglin'],   // 道牌只走通关奖励，不进材料池（信物不该被刷）
      boss: { kind: 'mo', name: '天象尊者', hp: 200000, spd: 80, dmg: 210, r: 27, spr: 'haishou', scale: 6.8 },
      reward: { stones: 210000, items: ['dan_guangling', 't_wannianjingsang', 't_zhenlinliuying'], mats: [['m_daopai', 1], ['m_zhenlingxue', 2]] },
      clearTitle: '得果',
      clearDesc: '掌天瓶一压，天象尊者认输，道牌交了出来。一百零八枚牌子换到一枚广灵道果——此果不宜久露在外，他收好了，留着配合其他灵物再服食。'
    },
    {
      // 原著 C2441《人族之变》：金长老并未当面说破，而是在韩立告辞之后才与族中长老议论——
      // 「神念之力超出我等界面生灵承受的极限，根基隐患重重，几百年内连性命都无法保住」。
      // 玩家知道，他自己不知道。这一笔才是飞升之劫真正的引信。
      id: 'renzu', name: '人族之变', pos: '灵界·真龙之岛', arc: 'L',
      type: 'story', tag: '剧情',
      desc: '道果下肚，他抱拳告辞。他不知道的是，身后的龙族长者刚刚看穿了他体内那处裂痕。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'daoguo', next: 'fsjie',
      reward: { stones: 200000, mats: [['m_zhenlingxue', 2]] },
      clearTitle: '出关·劫云已聚',
      clearDesc: '两百年闭关，外面已经换了一个人族。出关那日，天上劫云在聚——飞升之劫，来了。'
    },
    {
      // 独立关卡（原著 C2445）：九劫只是前奏，真正的飞升之劫在正午阳气最浓时落下。
      // 天外魔君当年放过话——「你渡那飞升之劫之时，本座一定邀遍附近界面所有魔君前来阻你飞升」。
      id: 'fsjie', name: '飞升之劫', pos: '灵界·荒原 劫云下', arc: 'L',
      type: 'boss', tag: '终局',
      desc: '正午，阳气最浓的时候。劫云压到头顶百丈，云里还有别的东西在等。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'renzu', next: 'xianjie',
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
      elites: ['妖修', '灵将'],
      mats: ['m_zhenlinglin', 'm_yaodan', 'm_gengjing'],
      boss: { kind: 'mo', name: '灵将', hp: 80000, spd: 68, dmg: 125, r: 23, spr: 'neimen', scale: 6.2 },
      extraBoss: [{ kind: 'mo', name: '陇家老祖', hp: 76000, spd: 62, dmg: 130, r: 23, spr: 'neimen', scale: 6.2, summon: '' }, { kind: 'mo', name: '银光仙子', hp: 68000, spd: 66, dmg: 120, r: 22, spr: 'nvxiu', scale: 6.0, summon: '' }],
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
      elites: ['大乘随从', '护道傀儡'],
      mats: ['m_xuantianteng', 'm_zhenlingxue', 'm_yaodan'],
      boss: { kind: 'mo', name: '大乘修士', hp: 130000, spd: 74, dmg: 175, r: 25, spr: 'mo', scale: 6.6 },
      reward: { stones: 80000, mats: [['m_xuantianteng', 1], ['m_zhenlingxue', 2]] },
      clearTitle: '大乘之血',
      clearDesc: '同为大乘，他输在准备不足。玄天仙藤落了一截。'
    },
    {
      // 斩大乘的后续：圣岛不会白看着一位大乘死在外面。只能由「斩大乘」打通后接出。
      id: 'shengshi', side: true, sorder: 28, name: '圣岛使者再来', pos: '灵界·荒原', arc: 'L',
      sideOf: 'zhandacheng',   // 支线挂支线：斩了大乘，圣岛才派人来问
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
      elites: ['白光守卫', '土皇钉傀儡'],
      mats: ['m_xuantianteng', 'm_zhenlingxue', 'm_yaodan'],
      boss: { kind: 'mo', name: '白光界·土皇钉', hp: 120000, spd: 72, dmg: 165, r: 24, spr: 'guixiu', scale: 6.4 },
      reward: { stones: 85000, items: ['t_tuhuangding'], mats: [['m_xuantianteng', 1], ['m_zhenlingxue', 2]] },
      clearTitle: '白光已散',
      clearDesc: '土皇钉被拔出来，白光界开始塌。最后一刻退出来，手里多了一截仙藤——还有那枚钉着一界乾土法则的土皇钉。'
    },
    {
      id: 'tianmo', side: true, sorder: 25, name: '天魔契约', pos: '灵界·荒原', arc: 'L',
      type: 'story', tag: '支线', unlockBy: 'e_tianmo',
      desc: '荒原上摆着一纸契约。签了，力量来得快；代价写在最后一行。',
      startLevel: 330, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: null, next: null,
      reward: { stones: 90000, mats: [['m_zhenlingxue', 2]] },
      clearTitle: '契约已签',
      clearDesc: '他签了。不是贪那点力量——而是这缕神魂已经吞过真仙，他不收，别的更不收。'
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
      reward: { stones: 40000, mats: [['m_beijiyuanjing', 2]] },
      clearTitle: '尘缘已了',
      clearDesc: '父母坟上添了新土。韩家如今是越国的望族，没人认得他。'
    }
  );

  // 飞升图接灵界（原 next 为 null）
  const FS = window.MAPS.find(m => m.id === 'feisheng');
  if (FS) FS.next = 'qinluo';

  // ========================= 五、对白 =========================
  Object.assign(window.MAP_STORIES, {
    // 青罗沙漠是 story 图：进场播 MAP_STORIES[id]，播完即通关（无 outro）
    qinluo: [
      ['旁白', '空间节点把他吐在青罗沙漠上。天是灰白的，风里没有土腥味，只有灵气——浓得烧喉咙。'],
      ['韩立', '（灵界。人界的天地元气跟这里比，像井水比江海。）'],
      ['旁白', '冰凤不见了。两人互下的那道禁制，正一层层往经脉深处钻。'],
      ['韩立', '（再硬扛，这具身子要炸开。）'],
      ['旁白', '他把元婴与第二元婴的精元一缕缕散进肉里。修为像退潮，退到见底。'],
      ['韩立', '（法力尽失，命还在。灵界的第一课，先学会从头做人。）'],
      ['旁白', '沙丘后过来一支商队，旗上写着「天东」。领队看了他一眼，扔过来半袋水。'],
      ['天东商号管事', '这地方没人走路。上车吧，捎你到安远城。']
    ],

    anyuan: [
      ['旁白', '安远城的城墙是黄土夯的，城门口排着队。天东商号的货卸了半日，街上忽然静了。'],
      ['韩立', '（城外有东西。很多。）'],
      ['旁白', '兽吼是从地底下翻上来的。第一波撞上城墙时，墙头的灵石炮还没响。'],
      ['城中修士', '兽潮！西墙塌了——散修都上城，不上城的别挡道！'],
      ['韩立', '（法力没回来，金刚诀还在。这具肉身，比在人界时还硬些。）'],
      ['旁白', '他在西墙的缺口处站了半个时辰，拳头上全是血。城墙终究还是塌了。'],
      ['旁白', '废墟里有个小女孩被压在梁下。额上一道黑羽纹——人族与黑凤族的混血。'],
      ['黛儿', '……我娘说，等黑凤族的人来接我。'],
      ['韩立', '（半妖的孩子，这城里养不活。）'],
      ['旁白', '他背着她出了西门，走了三日。荒岭上下来几个黑袍人，把孩子接走了。'],
      ['韩立', '（这方手帕给她。帕上的人，我也许再也见不着了。）']
    ],

    // 落日之墓：boss 图，intro 播完刷 boss
    luori: [
      ['旁白', '虞阳城歇了半月，他回青罗沙漠挖出埋着的储物袋。虫壳底下空了——六翼霜蚣互相吞食，早已遁走。'],
      ['韩立', '（神识不在，拦不住它。东西还在，就够了。）'],
      ['旁白', '往西走了数年，到落日城。银芯石、几样材料，凑出一套灵具。'],
      ['韩立', '（灵界炼器的手艺比人界细。这些得学。）'],
      ['旁白', '出城半月，荒原上塌着半座古墓。墓口石缝里透出一点火光，三千年没灭。'],
      ['韩立', '（太阴真火。这种火，人界养不出来。）']
    ],
    luori_out: [
      ['旁白', '墓室深处，太阴真火吞了太阳精火，又吞下守墓灵族「噬炎」的本源，烧成一团青白。'],
      ['韩立', '（噬灵天火。往后炼器、斗法，都靠它。）'],
      ['旁白', '一只巴掌大的豹形小兽从石缝里钻出来，绕着他的脚转了两圈。'],
      ['韩立', '（豹麟兽。灵界的东西，认人比人界快。）'],
      ['旁白', '棺后石台上凝着一滴金色的血。他刚收进瓶里，墓外两道灵压压了下来。'],
      ['韩立', '（两个炼虚。为这滴灵族神血来的。）'],
      ['旁白', '他抱起小兽，往荒山深处退。身后的遁光，越来越近。']
    ],

    // 山腹：story 图（潜修百余年、两色雷劫、天渊卫相救）
    shanku: [
      ['旁白', '荒山深处有个天然的石腹，口子窄，进去却宽敞。他把石口封了，只留一线透气。'],
      ['韩立', '（法力可以慢慢养，肉身不能等。金刚诀在人界只炼到皮毛，这里正好接着炼。）'],
      ['旁白', '一年，十年，五十年。石壁上的刻痕一道压着一道。'],
      ['韩立', '（明王诀第七层。禁制松了。）'],
      ['旁白', '第一百余年，虚化的元婴在丹田里重新凝出轮廓。凝成的那一刻，天顶压下来一片雷云。'],
      ['韩立', '（两色雷劫。灵界连天劫都比人界多一色。）'],
      ['旁白', '雷光劈开石腹。他硬接了三道，第四道落下时，两道青袍身影从雷云里穿了出来。'],
      ['天渊卫 赵无归', '散修渡劫，倒是少见。撑得住么？'],
      ['韩立', '（天渊卫。这身青袍，在人界是传说里的东西。）'],
      ['旁白', '雷云散尽。两个青袍人收了法宝，上下打量他。'],
      ['天渊卫 赵无归', '既渡过了，跟我们回天渊城。那儿缺人。']
    ],

    tianyuan: [
      ['旁白', '天渊城比安远城大出十倍。城墙是青石砌的，墙头上站着人族的甲士，也站着妖族的甲士。'],
      ['韩立', '（人妖两族共守的边城。灵界最乱的一段边界，就在城外。）'],
      ['旁白', '青冥卫的营房里，他被分到丙五十六小队：一件青袍，一面腰牌。'],
      ['青冥卫队正', '新来的？规矩三条：巡边不落单，遇族不开口，得了东西自己认。'],
      ['韩立', '（比宗门简单。也比宗门难。）'],
      ['旁白', '玉阙阁里选灵地，他跟一个吊眉的化神中期修士争了半日，最后各退一步，分到山腰那一片。'],
      ['韩立', '（有灵地，就能开洞府。有了洞府，才谈得上在灵界扎根。）'],
      ['旁白', '坊市一层层石阁往上叠，阁前挂着各家旗号。真灵鳞片、真灵之血，都在这儿过手。'],
      ['韩立', '（灵石在这儿才算钱。）']
    ],

    // 灵地·金阙玉书：story 图（莫名空间、空间风暴、金阙玉书外七十二页 → 百脉炼宝诀）
    lingdi: [
      ['旁白', '灵地布下监视法阵的第三个月，阵盘响了。有人从他的药圃边上过去，脚印一直伸进山壁。'],
      ['韩立', '（山壁后面还有路。）'],
      ['旁白', '他追进去。脚下忽然一空，再站稳时，四周是没有上下之分的灰白——空间缝隙里。'],
      ['韩立', '（空间风暴。走错一步，人就散成一片血雾。）'],
      ['旁白', '风暴眼里悬着一叠玉页，页上刻的尽是器物之形：剑、甲、鼎、舟。'],
      ['韩立', '（金阙玉书的外七十二页。人界找了几百年，原来在灵界的一处缝隙里。）'],
      ['旁白', '七十二页拼起来，讲的是一件事：把法宝炼进肉身，以肉身为炉。'],
      ['韩立', '（百脉炼宝诀。法体双修，这条路难走，可我这具身子本来就走不了纯法修的路。）'],
      ['旁白', '出关那日，他把青竹蜂云剑一口口拆开，照着玉页上的图，往骨骼里炼。']
    ],

    // 木族领地：boss 图，intro 播完刷 boss
    muzu: [
      ['旁白', '天渊城的任务牌上写着「侦察木族」。同行的三个：真龙世家陇东、天凤世家叶颖、黑凤族筱虹。'],
      ['韩立', '（三个世家子弟，一个散修出身的青冥卫。这趟差事，谁都不想吃亏。）'],
      ['旁白', '灵舟行到蛮荒上空，云里伸下一只爪子，把船脊拍成两截。'],
      ['旁白', '众人坠在山坳里。坳中央立着一株果树，果子墨绿，灵气冲得人眼睛发疼。'],
      ['叶颖', '芝龙果。三万年才结一次。'],
      ['韩立', '（守着它的是变异巨蜥，还有一头未成年的千目巨人。两头炼虚级的畜生。）'],
      ['陇东', '打不了。得让它们自己先打起来。'],
      ['韩立', '（互下禁制，谁也别想独吞。这规矩，我认。）'],
      ['旁白', '风雷翅一展，他从两只巨兽的爪缝里把果子摘了下来。四个人，一人一枚。'],
      ['筱虹', '……人族的身法，倒是不慢。'],
      ['旁白', '归途上撞见影族的赤影与一头银阶木族。筱虹替叶颖挡了一击，没再起来。'],
      ['韩立', '（她的储物镯，我替她带回黑凤族。）']
    ],
    muzu_out: [
      ['旁白', '银阶木族倒下时，噬金虫从它的孔窍里钻出来，一片金光。'],
      ['韩立', '（这一战靠的是虫，不是我。）'],
      ['旁白', '他把筱虹的储物镯收好。镯里有极品风属性灵石，还有三颗黑炎丹。'],
      ['韩立', '（芝龙果一枚，腾龙丹方一卷。炼虚那一步，就在这枚果子上。）'],
      ['旁白', '回城的灵舟上，叶颖把一根天凤之翎递过来，说是谢他替筱虹收了尸。'],
      ['韩立', '（天凤之翎，鲲鹏之羽。两样都炼进风雷翅，速度还能再快一线。）']
    ],

    // 碧眼真蟾：boss 图（夜叉王、抢蟾、传送阵遁走）
    zhenchan: [
      ['旁白', '荒谷里聚了一群飞升修士，说要合力收一窝碧眼真蟾。真蟾的血，是炼体的好东西。'],
      ['韩立', '（人一多，就有人惦记别人那一份。）'],
      ['旁白', '蟾没收拾干净，夜叉族先到了。为首那个的灵压，是合体期。'],
      ['肖姓道友', '夜叉王！散了吧——各凭本事跑！'],
      ['韩立', '（跑，也得有跑的路。）'],
      ['旁白', '他抢了一窝真蟾，退到谷底的旧传送阵上，把灵石一颗颗按进凹槽。']
    ],
    zhenchan_out: [
      ['旁白', '白光散尽时，脚下换了一片海。风里有铁锈味，远处的山脉是黑的。'],
      ['韩立', '（风元大陆，边缘半岛。黑隐山脉。）'],
      ['旁白', '山腹里有一处旧洞府，石床上还留着前人的蒲团。他把两大七小九只真蟾取出来。'],
      ['韩立', '（一甲子，够把梵圣真魔功推到第七层。）'],
      ['韩立', '（七十二口青竹蜂云剑，一口一口熔进骨头里。）'],
      ['旁白', '三十年过去。他三次撞化神后期的瓶颈，三次退回来。']
    ],

    // 天鹏圣地·地渊：boss 图（金悦识破、冒充圣子、地渊试炼、惊蛰十二变）
    tianpeng: [
      ['旁白', '天鹏圣地在飞灵族腹地。他借着风雷翅上那根鲲鹏真羽的气息，混进了圣地外围。'],
      ['韩立', '（只差一层窗户纸。天鹏族的炼体法门，是灵界最上等的。）'],
      ['旁白', '翅上的真羽忽然自己亮了。圣地深处，一道被封印的影子睁开了眼。'],
      ['天鹏族大长老 金悦', '鲲鹏的灵魂动了。你不是天鹏族的人。'],
      ['韩立', '（瞒不住。）'],
      ['天鹏族大长老 金悦', '冒充圣子，替我族去地渊走一趟。走成了，你要的东西我给。'],
      ['韩立', '（地渊。天鹏族的试炼场，也是他们的坟场。）'],
      ['旁白', '地渊底下没有光，只有阴寒。豹麟兽伏在石上，一口一口吞那些寒气。'],
      ['旁白', '试炼尽头，金悦把一滴真血与一枚舍利按在他掌心，另有一卷《惊蛰十二诀》。'],
      ['韩立', '（鲲鹏真血入体，化神后期那道瓶颈，终于裂了一缝。）']
    ],
    tianpeng_out: [
      ['旁白', '真血化开的那一夜，他胸前浮起一尊巨鹏的法相，翼展遮住了半个地渊。'],
      ['韩立', '（惊蛰十二变。变的是形，借的是真灵的天赋。）'],
      ['旁白', '出地渊时，妖王木青正等在谷口。它没动手，只把玩着手里一截金雷竹。'],
      ['妖王 木青', '跟我走一趟。你那根竹子，我有用处。'],
      ['韩立', '（打不过。那就跟着走，看它要去哪。）']
    ],

    // 冥河之地：story 图（元瑶、转轮聚阴阵、青元子）
    minghe: [
      ['旁白', '木青要去的是冥河。河上没有船，只有一层浮着的黑雾，雾里伸着手。'],
      ['韩立', '（地渊的妖王，元瑶，还有她师姐。这一趟，谁都揣着自己的算盘。）'],
      ['旁白', '元瑶在雾边等他，低声说了脱身的法子：破禁、取物、布阵，一步都不能错。'],
      ['韩立', '（转轮聚阴阵。阵成之后，四合体老妖下的印记就能拔掉。）'],
      ['旁白', '禁制一层层破开，冥河的水翻上来，把追兵隔在岸那边。'],
      ['旁白', '阵光起时，他身上的印记像一根烧红的针被抽了出去。'],
      ['韩立', '（成了。走。）'],
      ['旁白', '黑雾忽然一卷。再睁眼，是一间摆满药架的石室，架后坐着一个半透明的人影。'],
      ['青元子', '能从冥河爬出来的，不多。替我寻几样材料，我送你出去。']
    ],

    // 炼虚破境图（story + endLevel 150）：进场播完即 finishMap → 走破境结算
    lianxu: [
      ['旁白', '回到黑隐山脉的洞府，他把那根万年金雷竹削成剑胚，埋进山腹的灵脉里。'],
      ['韩立', '（种剑。一百年，等它自己长成。）'],
      ['旁白', '一年年过去。洞外的玄天果实还挂在枝上，绿得发沉。'],
      ['韩立', '（化神后期的瓶颈，压了我三十年。这一步，得靠它自己松。）'],
      ['旁白', '腾龙丹入腹，那股药力在经脉里烧成一条线，往丹田里那道关口顶。'],
      ['旁白', '第一百一十年的春天，那道一直卡着的关口，像冰面一样裂开。'],
      ['韩立', '（五行归一。）'],
      ['旁白', '轰——真元第一次摸到「无穷」的边。山腹里的灵气，被他一口气抽空。'],
      ['韩立', '（炼虚。寿元，终于不再是悬在头顶的刀。）']
    ],
    heiyin: [
      ['旁白', '黑隐山脉的风里有一股铁腥味。这片半岛他住了百年，山腹里埋着一根金雷竹。'],
      ['韩立', '（种剑百年，等的就是今日。玄天果实，该熟了。）'],
      ['旁白', '储物袋里那枚棍状的果实忽然自行飞起，悬在半空。果皮上的墨绿纹路一层层亮起来。'],
      ['韩立', '（绿液催了几百年，总算没白费。）'],
      ['旁白', '山外的天忽然压低。一片血色云气从四面聚来，云里翻着无数扭曲的影子——妖兽、异族、飞灵人。'],
      ['韩立', '（血祭。他们要用这东西，把玄天之宝唤过去。）'],
      ['旁白', '血云中央浮出一枚巨大的血色符文，缓缓落下，照着果实的顶门压来。']
    ],
    heiyin_out: [
      ['旁白', '符文碎成血雾。那枚果实已不在原处，只剩一柄巴掌长的小剑，剑身无光。'],
      ['韩立', '（玄天斩灵剑。它自己认了主。）'],
      ['旁白', '远处的血云还在聚。更多影子正从海里、从天上往这座山脉赶来。'],
      ['韩立', '（这剑一现世，灵界就没有我站的地方。走。）'],
      ['旁白', '他一步踏空，身后的空间裂开一道缝。再睁眼时，风里全是咸味。']
    ],
    huohu: [
      ['旁白', '醒来时躺在礁石上。海是热的，浪头拍上来带着火星——这里是雷鸣大陆外的火瑚群岛。'],
      ['韩立', '（空间裂缝把我扔到这儿了。倒也好，离风元大陆够远。）'],
      ['旁白', '岛上的人自称火阳族。他们的岛一座接一座沉掉，眼下只剩最后一座。'],
      ['火阳族长老', '外乡人，你身上有炼虚的气息。要走便走，别掺这趟浑水。'],
      ['韩立', '（乌罗族的战船我看了。要打沉它们，我需要一个离岛的由头。）'],
      ['韩立', '我替你们把乌罗族赶走，岛上的传送阵借我一用。'],
      ['旁白', '火阳族长老看了他很久，终于点头。当夜，海面下浮起一层金光。']
    ],
    huohu_out: [
      ['旁白', '乌罗族的战船沉了半边，剩下的掉头往深海退。火阳族的人跪了一片礁石。'],
      ['韩立', '（洞旋金光。这一趟的彩头，比传送阵值钱。）'],
      ['旁白', '传送阵亮起，光柱直冲天上。他站在光里，脚下是雷鸣大陆的方向。'],
      ['韩立', '（雷鸣大陆。十三个族结成的盟，天云城。）']
    ],

    shisan: [
      ['旁白', '天云城比天渊城还挤。十三族的旗子插满城头，街上的东西从灵药卖到傀儡。'],
      ['韩立', '（雷鸣大陆的规矩，比人族清楚：不问出身，只问灵石。）'],
      ['旁白', '旧货摊的最里头，一件甲片似的东西在发光，又像随时会碎。'],
      ['摊主', '天外魔甲，破损的。买得起，也没人修得起。'],
      ['韩立', '（天外魔甲。这东西在灵界不算买卖，算机缘。）'],
      ['旁白', '夜里他推开客栈的窗，看见街对面站着一个人。'],
      ['韩立', '（向之礼。人界的向之礼。可这具身子，不是他的了。）'],
      ['旁白', '那人朝他笑了笑，转身走进人群。他怀里那枚刚收来的旧令牌，忽然烫了一下。'],
      ['韩立', '（广寒令。原来是这么用的。）']
    ],
    mojin: [
      ['旁白', '魔金山脉的山是黑的，石缝里冒紫气。越往里走，兽吼越少——都被一样东西压住了。'],
      ['韩立', '（合体级的魔兽。整座山脉，只养得起一头。）'],
      ['旁白', '山坳里站起一头魔猿，肩高数丈，怀里抱着一截断刃，刃口泛着幽光。'],
      ['韩立', '（那截残刃，不是它该有的东西。魔界的物事。）'],
      ['旁白', '魔猿捶了一下胸口，满山的紫气都往它身上收。'],
      ['韩立', '（山岳巨猿的真血。这一趟，值。）']
    ],
    mojin_out: [
      ['旁白', '魔猿倒下时，怀里那截残刃叮的一声落在地上。紫气散尽，一滴赤金色的血浮在半空。'],
      ['韩立', '（山岳巨猿的真血。玄天残刃。）'],
      ['旁白', '他伸手去拿残刃，指尖刚碰到，刃身忽然自己颤了起来。'],
      ['韩立', '（有人在找它。很远，很重。）'],
      ['旁白', '山脉另一头，紫气重新聚起，像有人在那里睁开了眼。']
    ],

    guanghan: [
      ['旁白', '广寒界的寒气，不是冷，是往骨头缝里钻。走了半里，眉毛上已结了霜。'],
      ['韩立', '（三千年不散的寒气。广寒令只开一次门，进来就得把该拿的都拿到。）'],
      ['旁白', '寒玉台前，一具青铜色的傀儡缓缓站起，关节转动时发出干涩的响声。'],
      ['通灵傀儡', '……又有人持令而来。'],
      ['韩立', '（它还有神智。这种傀儡，比死物难缠十倍。）'],
      ['通灵傀儡', '过了我这一关，界里的东西，随你搬。'],
      ['旁白', '寒气骤然收紧，青铜傀儡的双眼亮起两点幽蓝。']
    ],
    guanghan_out: [
      ['旁白', '傀儡碎了，最后一缕神智散在寒气里。殿后是满界的灵药，玉台上躺着一枚万妙丹。'],
      ['韩立', '（万妙丹。太乙青山。还有那两卷炼神诀。）'],
      ['旁白', '他在寒玉台上坐了三年。出关时，本体与第二元婴一齐立在了炼虚的顶端。'],
      ['韩立', '（炼虚后期。再往上一步是合体——可这一步，不该在这界里过。）'],
      ['旁白', '跨大陆传送阵在白光里亮起。阵的另一头，是风元大陆。']
    ],

    heti_guan: [
      ['旁白', '元合岛的海还是那个颜色。青元宫的灯亮着，院子里那株灵竹，比走时高了一截。'],
      ['韩立', '（出去一趟，走了近百年。这里倒真像自己的地方了。）'],
      ['旁白', '他关上门，把炼神诀摊在膝上。第一层只有一句：神在，则形在。'],
      ['韩立', '（炼虚之后，肉身与元婴各走一条路。要把这两条路拧回一条。）'],
      ['旁白', '三年后，识海里那缕神魂第一次稳住了形。窗外的天，开始压云。'],
      ['韩立', '（三千年一次的大天劫。来。）'],
      ['旁白', '第一道雷落下，屋顶掀了；第二道雷落下，他连头都没抬。'],
      ['韩立', '（万妙丹入腹，真灵之血入骨。身与神，今日合一。）'],
      ['旁白', '雷云散尽。青元宫的院子里站着一个人，气息与方才已是两回事。'],
      ['韩立', '（合体。）']
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
      ['魔族魔修', '人族的援军？就这么一个？'],
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
      ['千秋圣女', '洗灵池与净灵莲，按上届灵王留下的遗言，就在魔源海的一座岛上。'],
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
      ['守炉人', '你来得比我算的早。'],
      ['韩立', '（他算过。这种人，最麻烦。）'],
      ['旁白', '炉火忽然亮了，映得整片小灵天一片赤红。']
    ],
    xiaoling_out: [
      ['旁白', '守炉人散了，一炉火落到韩立手里。火里有两截玄天仙藤。'],
      ['韩立', '（合体后期。再往上，是大乘。）'],
      ['旁白', '他抬头看天。小灵天的天很低，低得能看见劫云在聚。']
    ],

    modajie: [
      ['旁白', '苦灵岛在魔界最深处，雾是灰的，海面下透出一线青光。岛上没有草木，只有一座石阵。'],
      ['韩立', '（洗灵池就在这底下。守在这儿的，是两位圣祖。）'],
      ['旁白', '石阵前站着两个人。一个黑袍青年，气息压得四周的海都不敢起浪；一个白衣女子，始终在笑。'],
      ['元魇圣祖', '灵界的合体修士，也敢闯苦灵岛。'],
      ['韩立', '（两位圣祖。硬拼是死路——只能谈。）'],
      ['宝花圣祖', '他身上有炼魔草。'],
      ['韩立', '炼魔草在我手里。我要洗灵池三日。'],
      ['元魇圣祖', '十分之一的机会而已。你赌得起？'],
      ['韩立', '赌得起。'],
      ['旁白', '二涅变身的金光散去。石阵之上，只剩一纸口头之约，和一个不肯后退的人。']
    ],
    modajie_out: [
      ['旁白', '三日后，韩立从池中起身。经脉里的真元沉下去，沉成一片海，不再翻涌。'],
      ['韩立', '（洗灵池一天，抵外面一年。三日，够了。）'],
      ['旁白', '炼魔草交了出去。两位圣祖没有出手——不是因为心善，是因为不值当。'],
      ['韩立', '（不过这一次，是我侥幸。下次再遇上，未必还有灵药可以押。）'],
      ['旁白', '苦灵岛在身后沉进雾里。再往上，只剩大乘那一道门。']
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
    qunqiang: [
      ['旁白', '他赶到的时候，仗已经打完了。'],
      ['旁白', '金色世界的边缘还在往下塌。血雾一缕一缕挂在空中，散得很慢。'],
      ['旁白', '坑底立着一个金色巨人，身上没有一处伤。'],
      ['韩立', '（明尊。三名大乘、七头真兽，加上那头老怪，都死了。）'],
      ['旁白', '轩九灵自爆了一条手臂，代价是九劫真焰——九种火属性真灵的本命之火，掺着九种法则之力。'],
      ['韩立', '（九劫灭灵大法。一击就烧掉了一个真仙。）'],
      ['旁白', '七座血玺落下时，三人大乘连同四头真兽只来得及闪了一下，就化成了飞灰。'],
      ['旁白', '银色巨人被八座金色火山困在中心，熔岩一喷，就再没有声音了。'],
      ['韩立', '（群强赢了。赢得干净，也赢得一个都不剩。）'],
      ['旁白', '最后，那金色巨人从虚空里一把捞出个尺许高的小人：寸发不生，口鼻全无，只有一双晶莹的双眼。'],
      ['韩立', '（噬金仙。虫王一脉的？它怎么会在这里。）'],
      ['旁白', '坑底只剩两样东西：一面小小的山岳，与一座两仪微尘般的小阵。'],
      ['韩立', '（元合五极山，还有两仪微尘阵。五座极山合一的后天玄天之宝，绝不似此界能炼出的。）']
    ],
    xianshi: [
      ['旁白', '鸣煞之地外不知多少万里，祭坛下方。一面青色古镜悬在半空。'],
      ['旁白', '镜中，一头数十丈长的巨大金虫正目喷晶光，与那些面无表情的金色甲士缠斗。'],
      ['韩立', '（这只虫王是我暗中吩咐过去的。不是去帮马良，是去看清那边的情形。）'],
      ['旁白', '天上，一座昏暗的大殿里，一名端坐法阵的人影叹了口气，手腕一抖。'],
      ['旁白', '巴掌大的银色法盘光芒大放，无数银色符文从中飘出，往法阵里狂涌而入。'],
      ['旁白', '“该出手了。风元大陆算是元气大伤了，但为了整个灵界又不得不如此。”'],
      ['韩立', '（明尊要拿整个风元大陆，换一座阵。）'],
      ['旁白', '八只圆柱与巨大祭坛同时爆发法则波动，五色光柱冲天而起。高空中聚起一个直径十几里的光阵。'],
      ['旁白', '血光一闪，半圆状的血色光幕骤然形成，像一只巨碗，把云淡、月梳和上千商盟卫士全困在下面。'],
      ['云淡', '不好，从地下走！'],
      ['旁白', '金色长戈往下一扎，地表青色符文闪动不已，一副完好无损的样子。'],
      ['月梳', '怎么可能！大哥你的灵光戈，可是无坚不摧的。'],
      ['云淡', '还不明白吗，我们都上了明尊那老匹夫的大当了。这里哪是什么阵眼，分明是专门对我们兄妹设下的绝地。'],
      ['月梳', '他真敢如此做！'],
      ['旁白', '镜面那头，虫王在掉皮，甲士在碎裂。银色法盘上的符文还在往下涌。'],
      ['韩立', '（云淡、月梳……这两位大乘，是被当作玄天之宝的替代之物了。）'],
      ['旁白', '韩立没有喊停。古镜也没有灭。']
    ],
    zhangtianping: [
      ['旁白', '晶丝一闪，化为一道白炙光柱爆裂开来。滚滚白光疯狂向四面八方狂卷，淹没方圆万里。'],
      ['旁白', '金色甲士在白光里溃散而灭。被围在其中的金虫就地一滚，现出巨大甲虫本体，蜷成一颗金灿灿圆球。'],
      ['旁白', '“砰”的一声，韩立面前的青色古镜爆裂而开。'],
      ['旁白', '鸣煞之地低矮了十几丈，凭空形成一个巨大的盆地。地面平滑如镜，连一丝凹凸都没有。'],
      ['旁白', '盆地上空只剩两样东西：一颗烤得焦黑的圆球，和一枚紫金色巨晶。'],
      ['旁白', '巨晶寸寸碎裂。马良赤身裸体地显现出来，寸缕没有，脸色苍白得没有一点血色。'],
      ['韩立', '不愧为仙界之人，如此轻易看破了蟹兄的身份。不过看阁下样子，灵界的反噬之力不轻吧。'],
      ['旁白', '金色甲虫双翅一抖，化为一团金光射进韩立袖中不见了踪影。'],
      ['旁白', '忽然，韩立只觉胸前一热。一团瓶形青濛濛幽光洞穿衣物的浮现而出，一股清鸣之音从中传出，直冲九霄云外。'],
      ['旁白', '几乎同一时间，对面的马良袖中也是青光一闪，一个墨绿小瓶一飞而出，微微一颤，就要冲韩立飞来。'],
      ['马良', '掌天瓶！此瓶竟然在你手中。哈哈，这可真是踏破铁鞋无觅处，得来全不费工夫，我何必再去找那叛徒，现在竟然直接就找到了此宝！'],
      ['韩立', '掌天瓶？你在说什么！'],
      ['马良', '不要说你没有这种同样的小瓶。我这件盗天瓶虽然只是掌天瓶的仿制之物，但是互相感应之下，却绝对不会错的。'],
      ['旁白', '韩立脸色接连变化了数次，才抬手往胸前虚空一抓，另一个翠盈盈的青色小瓶凭空浮现。'],
      ['旁白', '无论式样外形，此瓶居然都和马良手中的墨绿小瓶一般无二，只是颜色稍浅一些，看起来更加的不起眼几分。'],
      ['马良', '对，就是……咦，不对。你手中的好像只是一个外壳，竟然没有瓶灵。你将瓶灵藏在何处了？'],
      ['韩立', '瓶灵？这又是什么？']
    ],
    zhangtianping_out: [
      ['旁白', '两瓶之间的嗡鸣声越来越响，像两头隔着水面互相呼唤的兽。'],
      ['韩立', '（原来它有名字。掌天瓶。）'],
      ['韩立', '（他要找的东西，就在我身上。这一战躲不过去了。）'],
      ['旁白', '盆地上空，两个人，一黑一青，谁都没有先动。']
    ],
    zhenxian: [
      ['旁白', '玄天仙藤三截化开，真灵之血五滴入骨。雷光里，他的影子变了形状。'],
      ['韩立', '（这一身，不再是凡胎。）'],
      ['旁白', '雷光散尽，荒原上立着一个人。眉眼还是那眉眼，气息却已不在此界之中。'],
      ['韩立', '（真仙。）']
    ],
    zhanxian: [
      ['旁白', '血河从天上落下来。一落地，就成了八条五爪血龙。'],
      ['马良', '你不知道瓶灵？哼，看来多半你和那叛徒没有多大关系。'],
      ['马良', '等我抓住你搜完魂后，就送你去九泉之下了。'],
      ['韩立', '（九元观。仙界下来的真仙。他找的是掌天瓶。）'],
      ['旁白', '血玺一抛，八条血龙一齐扑来，每一条都堪比大乘。'],
      ['旁白', '蟹道人就地一滚，化作一头金黄巨蟹，两颗雷球砸向血龙。'],
      ['旁白', '韩立一拍青瓶，青蟠剑阵嗡鸣，阵中冲出一条数百丈的青色蟠龙，一挑五条。'],
      ['马良', '一个手指化为赤金之色，冲此线一点而出。'],
      ['旁白', '一根手指落地。墨绿细线，是玄天斩灵剑。'],
      ['旁白', '火须子化作百余丈怪蛟，挡下五件重兵。代价是：马良得以九元道祖之名起誓，回仙界后再留他身边万年。'],
      ['旁白', '救场的却是另一个：一个肌肤黝黑如墨的青年，魔焰一卷，从梵圣魔神身上洞穿而过。'],
      ['韩立', '（天外魔头。）'],
      ['旁白', '于是韩立再化出一具三头六臂的虚影，十丈之高。'],
      ['韩立', '洞漩金光。'],
      ['旁白', '金光罩住虚空，马良动弹不得。最后一条手臂握着木剑，一道墨绿细线一卷而出，从脖颈处一闪而过。'],
      ['旁白', '骨碌碌一声，一颗头颅滚落而下。无头身躯也一下翻身栽倒。']
    ],
    zhanxian_out: [
      ['旁白', '玄天斩灵剑的毁灭之力一卷而过，元婴被震得粉碎。'],
      ['旁白', '在仙界，躯体被毁也能靠元婴逃走。可在灵界，界面之力压着，那颗元婴慢了半拍。'],
      ['旁白', '韩立从残尸上收起一只金灿灿的储物镯。'],
      ['魔光', '神魂味道果然美味至极。我可以和你签下天魔契约——此后一定时间内，做你的影子。'],
      ['魔光', '代价是：每隔一段时间，你必须贡献一份精血给我。'],
      ['魔光', '还有，你若在契约期间意外身死，你的神魂力量会全被我吸纳一空，从此成为我力量的一部分，再无轮回的可能。'],
      ['韩立', '（再无轮回。）'],
      ['旁白', '火须子在旁边一言不发。它要回仙界，得拿回被马良带走的本命晶珠——那就得认主。'],
      ['韩立', '（一个吞过真仙的，一个要回仙界的。留着，比放出去好。）'],
      ['旁白', '这一战之后，灵界再没有人敢提「人族第一修士」四个字。']
    ],
    huimoyuan: [
      ['旁白', '一片银色鳞片上浮出一行银色古文：两年后，真龙之岛，广灵道果大会。'],
      ['韩立', '（广灵道果。服下可暂时凝出广灵道体，那几门神通正缺这个。）'],
      ['旁白', '他抬手一招，一面青色古镜浮在身前，把行程划给南宫婉。'],
      ['南宫婉', '……小心。'],
      ['韩立', '（她从不劝我别去。只说小心。）'],
      ['旁白', '两个月后，魔界一片灰濛濛的荒原上，一道墨绿剑光裂开，他从缝隙里走出来。'],
      ['韩立', '（瓶子在这里有感应。瓶灵，就在这一界。）'],
      ['旁白', '一路掠过魔族城池与魔兽，直到魔源海。苦灵谷上空，一道乳白光柱自己冲了出来——灵霄天柱。'],
      ['旁白', '青瓶剧烈震颤，一团黄光从柱中激射而出，落地化作另一只淡黄小瓶，两颗豆粒大的黑眼珠直直盯着它。'],
      ['韩立', '（它想合进来。可这躯壳，如今在我手里。）'],
      ['旁白', '黄瓶冲了十几次，每一次都被青瓶表面的墨绿光纹硬生生弹开，急得在原地打转。'],
      ['元魇圣祖', '……这等异宝，竟在我苦灵岛下藏了几万年，我却不知。'],
      ['旁白', '元魇往前迈了半步。蟹道人不动声色地挪到阵前，身上银弧一阵缭绕，一言不发。'],
      ['元魇圣祖', '（合体期时他就在我手里活了下来。如今……）'],
      ['旁白', '那半步收了回去。黄瓶敛了光，缓缓沉进青瓶之中——掌天瓶，终于又全了。']
    ],
    daoguo: [
      ['旁白', '真龙一族行过一场声势浩大的仪式，禁制一开，里面是一整片看不见边的密林。'],
      ['金长老', '道果就在林中。诸位抢到手的，才算自己的。'],
      ['韩立', '（他给的那枚玉简上写着名字：丰月真君、天雀子、般若散人……都是进阶大乘几万年的老怪物。）'],
      ['旁白', '话还没落，附近几棵大树忽然一模糊，化作数头百丈高的光头巨人，十几条手臂一扬，碧绿雷火兜头砸下。'],
      ['韩立', '来得好。'],
      ['旁白', '剑光自下而上绞开雷火，三头六臂的魔神从林中冲出，六臂车轮般一舞，一圈金光把拳影尽数卷灭。'],
      ['旁白', '数里外的巨树上传来一声惊咦。魔神张口一吐，一团墨绿光球里裹着一只数寸高的小瓶。'],
      ['旁白', '万里虚空被青光压得扭曲，地面塌出一个光滑的巨大盆地。一头千丈白象从土中冲出，背生紫红火翅，雷火绕身。'],
      ['韩立', '原来是天象尊者。怪不得有这一手化木为灵。'],
      ['旁白', '瓶口青光一闪，一条墨绿锁链凭空绕上象身。巨象哀鸣，寸寸碎裂，从中露出一个身披白色袈裟的中年僧人。'],
      ['天象尊者', '住手！贫僧认输——道牌给你。'],
      ['旁白', '一枚淡银牌子飞了过来。韩立接住，连看都没多看一眼，就收进了袖中。']
    ],
    daoguo_out: [
      ['旁白', '道果只有一枚。他捏在掌心看了一眼，收入储物镯中。'],
      ['金长老', '韩道友，倒是沉得住气。'],
      ['韩立', '这等可遇不可求的东西，收好才是正理——飞升之劫前，配合他物一同服下方才稳妥。'],
      ['旁白', '龙族长老们面面相觑。远处天边破空声一响，另一道白虹正往高台来。'],
      ['韩立', '（下一场要来的是谁，与我无关了。东西已经落在我手里。）'],
      ['旁白', '青虹冲天而起，几个闪动就消失在天边。']
    ],
    renzu: [
      ['旁白', '高台上，几头真龙目送那道青虹远去。金长老捻着胡须，神色有几分古怪。'],
      ['金长老', '你们觉得，此人的神识如何？'],
      ['白袍龙族', '很强大。几乎是这次参加道果大会的人里，数一数二的存在。'],
      ['金长老', '何止如此。他展现在我等的，怕是只有真正神念的一小部分而已。'],
      ['绿袍龙族', '这怎么可能！莫非大长老用那秘术悄悄探查过他了？'],
      ['金长老', '的确如此。可惜得很——神念越强，本该对渡飞升之劫越有益处，可他的神念之力太过强大了，' +
        '甚至已经超出我等界面生灵承受的极限。根基看似稳固，实则隐患重重。'],
      ['金长老', '若无妥当的应对之策，恐怕再过几百年，连性命都无法保住。'],
      ['白袍龙族', '……不知此人自己，是否知道这隐患了。'],
      ['绿袍龙族', '就算现在不知，过些年也该有所发觉。只是到那时，怕是已经真的晚了。'],
      ['旁白', '就在这时，天边另一道蛟龙般的白虹破空而来。一名白衣玉带的少年落在台前，抱拳一礼。'],
      ['轩辕杰', '轩辕族轩辕杰，拜见诸位龙族道友。'],
      ['旁白', '一干长老目光唰地全落到少年身上，方才那番话，就此搁下了。'],
      ['旁白', '一年后，他回到人族无涯海，在青元宫交代了几件事，随即进入禁制重重的密室闭关。'],
      ['旁白', '这两百年里人族变了：冰魄仙子以大乘身份归来，木族来附，夜叉几族退入蛮荒，飞灵诸族递来结盟的文书；' +
        '顶阶功法与天材地宝一起冒出来，卡在瓶颈上的修士接连破境。'],
      ['韩立', '（我在关里坐着，外面已经换了一个人族。）'],
      ['旁白', '出关那日，天上有劫云在聚。飞升之劫，来了。']
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
      ['妖修', '人族？这些年人族的名分，都是靠嘴争的。'],
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
      ['土皇钉傀儡', '……出去。'],
      ['韩立', '（拔了钉子，这一界就塌。得快。）']
    ],
    baiguang_out: [
      ['旁白', '土皇钉被拔出来，白光界开始塌。韩立退出来的最后一刻，手里多了一截仙藤。'],
      ['韩立', '（险。）'],
      ['旁白', '身后的裂缝合上了，像什么都没发生过。']
    ],
    tianmo: [
      ['旁白', '荒原上，一道黑肤青年的人影从魔焰里走出来。他手里捏着一缕近乎透明的神魂。'],
      ['魔光', '九元观门人的神魂，味道果然美味。你要不要也尝尝？'],
      ['韩立', '（它吞了马良的神魂。这东西跟着我，比跟着别人好。）'],
      ['魔光', '签了它。此后一定时间内，我做你的影子——你要我做一些一般仙人做不到的事。'],
      ['魔光', '代价：每隔一段时间，献一份精血。还有，你若在契约期间意外身死，你的神魂力量会全被我吸纳一空，从此成为我力量的一部分。'],
      ['韩立', '（再无轮回。）'],
      ['韩立', '签。'],
      ['旁白', '契约上的墨迹亮了一下，又暗下去。它已经在生效了。']
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
    ],
    yuyang_dou: [
      ['旁白', '斗场中央立着个赤膊的妖族大汉，臂上缠着两道兽筋，脚下石砖被他踩出裂纹。'],
      ['城斗魁首', '外乡人，下场？'],
      ['韩立', '（妖族城里，拳头比名帖好使。下一回场，省的生分。）'],
      ['韩立', '下。']
    ],
    yuyang_dou_out: [
      ['旁白', '大汉被一记重拳掀翻，半天没爬起来。围观的妖族先静了一息，随即哄一声散了。'],
      ['韩立', '（没人赖账，也没人围上来——妖族城里，输赢比人族讲规矩。）'],
      ['旁白', '斗场的彩头归了他。城西的坊市还开着，伴妖草的气味顺风飘过来。']
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
      id: 'e_yuyang', map: 'liangzu', name: '妖族商客', spr: 'hermit', scale: 1.9,
      cond: { level: 132 },
      lines: [
        ['旁白', '天渊城的墙根下，一个披兽皮的妖族商客蹲着，脚边两篓伴妖草还带着土。'],
        ['妖族商客', '虞阳城，妖族自己的坊市。人族去也欢迎——只要灵石够。'],
        ['韩立', '（妖族城池，城里还有斗场，胜负说话。去看看也好。）'],
        ['韩立', '带路。']
      ],
      unlock: 'yuyang', reward: { stones: 300 }
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
    { id: 'baimai', name: '百脉炼宝诀', icon: '🫀', max: 6, minLv: 150, type: 'passive',
      effect: { maxhp: 150, armor: 0.05 },
      desc: '百脉炼宝诀：把经脉、筋骨当法宝一件件炼过去。炼成的不是法术，是身子本身' },
    { id: 'jingzhe', name: '惊蛰十二变', icon: '🐲', max: 6, minLv: 165, type: 'passive',
      effect: { spd: 0.10, atkSpd: 0.05 },
      desc: '惊蛰十二变：一身可化十二形，起落之间只留一道残影。灵界顶层的遁法' },
    { id: 'fenglei3', name: '三炼风雷翅', icon: '🪽', max: 6, minLv: 200, type: 'passive',
      effect: { atkSpd: 0.10, spd: 0.06 },
      desc: '风雷翅三炼之后，翅上风雷自成一头。出手比从前快了一线，这一线就是生死' },
    { id: 'nianjian', name: '念剑诀', icon: '💠', max: 6, minLv: 220, type: 'ranged',
      atk: { kind: 'beam', base: 60, perLv: 22, cd: 1.4, countBase: 3, countPerLv: 0.5, spread: 0.2, pierceBase: 3, piercePerLv: 1 / 3, range: 520, life: 1.3, vfx: 'gold' },
      desc: '念剑诀：不掐诀、不抬手，一念起处三道剑光已在人前。念有多快，剑有多快' },
    { id: 'jingang2', name: '金罡灭魔神雷', icon: '💥', max: 6, minLv: 260, type: 'ranged_aoe',
      atk: { kind: 'thunder', base: 90, perLv: 32, cd: 2.6, countBase: 2, countPerLv: 0.34, range: 640, vfx: 'thunder' },
      desc: '金罡灭魔神雷：专克魔气的神雷。魔修挨这一下，护体魔气先散三分' },
    { id: 'wangqing', name: '忘情诀', icon: '🌙', max: 5, minLv: 330, type: 'passive',
      effect: { xpMul: 0.10, crit: 0.04, dmg: 0.04 },
      desc: '忘情诀：斩的不是情，是心里那点挂碍。心静了，修为与出手都不再晃' },
    { id: 'niling', name: '逆灵真阴大法', icon: '🌑', max: 6, minLv: 420, type: 'aura',
      atk: { kind: 'field', base: 24, perLv: 10, radBase: 120, radPerLv: 14, slow: 0.35, cdHit: 0.5, vfx: 'ice' },
      desc: '逆灵真阴大法：真阴之气倒卷成域。进了这丈许方圆，法力运转先被压住半截' }
  );

  // 法诀道具（teach 类：拿到要回洞府学，学了才进功法位）
  window.ITEMS.push(
    { id: 'sk_baimai', name: '百脉炼宝诀·法诀', rarity: 4, icon: '📕', req: 132, teach: 'baimai',
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

  // 灵界的功法出处：全部随剧情给，坊市不卖高阶法诀
  // 《百脉炼宝诀》＝金阙玉书外七十二页（灵地图）；《惊蛰十二变》＝天鹏族地渊试炼（天鹏圣地）
  const GIVE = { lingdi: 'sk_baimai', tianpeng: 'sk_jingzhe', yitian: 'sk_fenglei3', xiaoling: 'sk_nianjian', sanjie: 'sk_jingang2', jiujie: 'sk_wangqing', fsjie: 'sk_niling' };
  for (const mid in GIVE) {
    const m = window.MAPS.find(x => x.id === mid);
    if (!m) continue;
    m.reward = m.reward || {};
    m.reward.items = (m.reward.items || []).concat([GIVE[mid]]);
  }

  // ========================= 五(4)、天渊坊市（灵界唯一的 market 图） =========================
  // 原著 V8C1333《天渊坊市》。灵界段此前「能打不能买」——灵石一路只进不出，这里给它开个口子。
  // 注意：玄天仙藤**不上货架**。260/330/420 三关要它，能买就等于把大乘之后的进度变成攒钱。
  // 原著里这两门功法都不是买来的：《百脉炼宝诀》出自金阙玉书外七十二页（灵地图），
  // 《惊蛰十二变》出自天鹏族地渊试炼（天鹏圣地）。货架上只留真灵材料与常规丹药符箓。
  const TY_SHOP = ['m_zhenlinglin', 'm_zhenlingxue', 'huiqi', 'qiannian', 'jipin'];
  const TY_PRICE = {
    m_zhenlinglin: 9000, m_zhenlingxue: 30000, huiqi: 150, qiannian: 3000, jipin: 45000
  };
  const TY_CAT = {
    m_zhenlinglin: 'cai', m_zhenlingxue: 'cai', huiqi: 'dan', qiannian: 'fu', jipin: 'dan'
  };
  for (const id of TY_SHOP) {
    if (window.SHOP_STOCK.some(s => s.id === id)) continue;   // 已被别处上架的不重复挂
    window.SHOP_STOCK.push({ id: id, price: TY_PRICE[id], cat: TY_CAT[id] });
  }

  // ========================= 五(4·1·2)、虞阳城·妖族坊市 + 城斗场（本轮回加厚，V8C1292《虞阳城》） =========================
  // 第二座坊市：妖族城池，卖的是妖族自己的货。伴妖草论把、妖丹按颗，真灵材料也收，就是价高。
  // 城斗场（yuyang_dou）挂在坊市之后——妖族城里有斗场，输赢自己认，正合「城斗」二字（蓝图：妖族城池·城斗）。
  // 注：raw 文本中「第一千二百九十二章 虞阳城」一节的字面内容与原著设定对不上（混入了天元境/炼体士等陌生设定），
  //     此处以项目 canon（geography.md 标「妖族城」、灵界篇蓝图标「妖族城池·城斗·灵界货币/材料」）为准来落地。
  const YY_SHOP = ['m_banyao', 'm_yaodan', 'm_zhenlinglin', 'm_zhenlingxue', 'sk_xueying'];
  const YY_PRICE = { m_banyao: 1500, m_yaodan: 6000, m_zhenlinglin: 9000, m_zhenlingxue: 30000, sk_xueying: 22000 };
  const YY_CAT = { m_banyao: 'cai', m_yaodan: 'cai', m_zhenlinglin: 'cai', m_zhenlingxue: 'cai', sk_xueying: 'skill' };
  for (const id of YY_SHOP) {
    if (window.SHOP_STOCK.some(s => s.id === id)) continue;   // 已被别处上架的不重复挂
    window.SHOP_STOCK.push({ id: id, price: YY_PRICE[id], cat: YY_CAT[id] });
  }
  window.MAPS.push(
    {
      // 原著（1047 岁）：安远城城破之后，他在虞阳城落脚，这才回青罗沙漠取回储物袋。
      // 原来挂在 arc L、靠 liangzu 的际遇引出，等于放到大后期才开——按原著挪回「初入灵界」。
      id: 'yuyang', side: true, sorder: 2, name: '虞阳城', pos: '灵界·天元境 虞阳城', arc: 'I',
      type: 'market', tag: '坊市',
      desc: '妖族自己的城。墙是兽骨夯的，坊市里卖的货和人族坊市不是一路——伴妖草论把抓，妖丹按颗数。',
      shopSub: '妖族坊市。伴妖草、妖丹是这里的硬通货，真灵材料也收，就是价高些。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'anyuan', next: 'yuyang_dou',
      shop: YY_SHOP,
      reward: { stones: 0 },
      clearTitle: '坊市一行',
      clearDesc: '灵石换了几把伴妖草、几颗妖丹。城西斗场还在嚷，说今日有外乡人下场。'
    },
    {
      id: 'yuyang_dou', side: true, sorder: 3, name: '虞阳城·城斗场', pos: '灵界·虞阳城 斗场', arc: 'I',
      sideOf: 'yuyang',        // 支线挂支线：斗场就在虞阳城里
      type: 'boss', tag: '支线', unlock: null, next: null,
      desc: '妖族城里的斗场，规矩只有一条：下场的人，输赢自己认。今日压了外乡人的彩头，堆得比石桌还高。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      diff: 3.6, bossAt: 0, intro: 'yuyang_dou', outro: 'yuyang_dou_out',
      enemies: ['yaoshou2', 'kui2', 'moxiu2'],
      elites: ['妖修', '妖修'],
      mats: ['m_banyao', 'm_yaodan'],
      boss: { kind: 'mo', name: '虞阳城·妖修', hp: 75000, spd: 66, dmg: 120, r: 22, spr: 'haishou', scale: 6.0 },
      reward: { stones: 50000, mats: [['m_banyao', 2], ['m_yaodan', 1]] },
      clearTitle: '城斗已了',
      clearDesc: '魁首认了输。围观的妖族哄一声散了，没人赖账——妖族城里，输赢比人族讲规矩。'
    }
  );

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
      effect: { maxhp: 300, xpMul: 0.12 } },
    // 终局段的唯一灵物（V12C2441）：服下可凝「广灵道体」，把撑得发疼的神念压回经脉里。
    // 斩仙（V12C2426–C2429）的战利品：万灵血玺是马良的宝物（从他储物镯里取的），
    // 魔光与火须子则是战后投靠/认主的两个「人」。真魂丹不给——原著里那一枚是马良自己生吞的。
    { id: 't_wanlingxueyi', name: '万灵血玺', rarity: 5, icon: '🟥', req: 420, unique: true, noDrop: true,
      desc: '九元观真仙马良的宝物（V11C2371《万灵血玺》，10 次）。一印掷出，八条五爪血龙从天而降，每一条都堪比大乘。斩仙之后，它换了主人',
      effect: { maxhp: 360, dmg: 0.12 } },
    { id: 't_moguang', name: '魔光', rarity: 5, icon: '🖤', req: 420, unique: true, noDrop: true,
      desc: '天外魔头的一缕化身（V12C2429《天魔契约》）。趁马良重伤吞了他的神魂，转头与韩立订立天魔契约',
      effect: { dmg: 0.15, crit: 0.05 } },
    { id: 't_huoxuzi', name: '火须子', rarity: 5, icon: '🦎', req: 420, unique: true, noDrop: true,
      desc: '火中之圣，本体是一条百余丈的怪蛟（V12C2418《斩鹿（下）》，27 次）。要拿回本命晶珠回仙界，只好认韩立为主',
      effect: { dmg: 0.20, atkSpd: 0.08 } },
    // 420 段（真仙级）可掉成品——此前这一段只有「化神旧宝」可掉，
    // 补足这些之后，掉落门槛才敢从 160 抬到 360。
    { id: 't_yuanhejiwu', name: '元合五极山', rarity: 4, icon: '⛰', req: 420,
      desc: '后天玄天之宝，五座极山合一炼成（V9C1663《璃水珠和元合五极山》）。据传需北极元晶方能炼制（V12C2444）',
      effect: { maxhp: 380, dmg: 0.14 } },
    { id: 't_jinglinglian', name: '净灵莲', rarity: 4, icon: '🪷', req: 380,
      desc: '洗灵池里长出来的灵物（V10C1835《洗灵池和净灵莲》，59 次）。洗灵池一日抵外面一年',
      effect: { maxhp: 300, regen: 0.8 } },
    { id: 't_liangyiwuchen', name: '两仪微尘阵', rarity: 4, icon: '🔯', req: 360,
      desc: '一座能困住大乘的小阵（V11C2412《阵眼》，11 次）。有人为它盯上过真仙的丹',
      effect: { armor: 0.12, atkSpd: 0.10 } },
    { id: 't_wannianjingsang', name: '万年金桑液', rarity: 4, icon: '🧪', req: 400,
      desc: '龙岛上的灵液，炼制数种传闻中丹药的必需品（V12C2439《交易、大会》，2 次）',
      effect: { maxhp: 260, xpMul: 0.08 } },
    { id: 't_zhenlinliuying', name: '真麟留影', rarity: 5, icon: '🐉', req: 430, unique: true, noDrop: true,
      desc: '龙族以真龙之鳞封存的渡劫留影（V12C2439《交易、大会》，1 次）。一枚只能用三次',
      effect: { maxhp: 400, crit: 0.06 } },
    { id: 'dan_zhihun', name: '真魂丹', rarity: 5, icon: '🟣', req: 420, unique: true, noDrop: true,
      desc: '凝出真仙之魂的丹药（V11C2400《法则之链》，37 次）。斩仙后从马良身上搜得余留的一颗（V12C2430）',
      effect: { maxhp: 420, crit: 0.08 } },
    // 「掌天瓶」这个名字在原著里是马良叫出来的（V12C2425《掌天瓶》）。
    // 韩立手里的青瓶只有外壳，瓶灵被他藏了起来——所以马良一眼看出「只是个外壳」。
    { id: 't_zhangtianping', name: '掌天瓶', rarity: 5, icon: '🫙', req: 430, unique: true, noDrop: true,
      desc: '翠盈盈的青色小瓶（V12C2425《掌天瓶》，13 次）。外观与马良的盗天瓶一般无二，只是颜色稍浅；瓶灵被藏了起来，只剩外壳',
      effect: { maxhp: 500, xpMul: 0.10, crit: 0.05 } },
    { id: 't_daotianping', name: '盗天瓶', rarity: 5, icon: '🍶', req: 430, unique: true, noDrop: true,
      desc: '马良袖中的墨绿小瓶（V12C2425）。「我这件盗天瓶虽然只是掌天瓶的仿制之物，但是互相感应之下，却绝对不会错的」',
      effect: { dmg: 0.18, atkSpd: 0.10 } },
    { id: 'dan_guangling', name: '广灵道果', rarity: 5, icon: '🍇', req: 420, unique: true,
      desc: '真龙之岛上的道果（V11C2190 / V12C2441）。服下可凝广灵道体，神念之力有了落脚处。',
      effect: { maxhp: 400, xpMul: 0.15 } }
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
      restTip: '天渊城的地脉是人族几万年经营出来的，坐一日抵荒原十日。',
      // 原著：韩立飞升后在灵界安顿下来，掌天瓶绿液照旧催药。得灵界灵药（如芝龙果）后
      // 自动留一株作种移进这畦，此后在战斗图里照常生长、回洞府定期采收。
      gardens: [{
        id: 'tygarden', name: '灵界药圃', from: 'liangzu',
        tip: '洞府后墙根下开出的一小畦，绿液一滴，灵界的药也能活。移栽进来的灵药，此后定期可采。',
        pool: [],          // 基础为空；品种全由「移栽」进来（见 game.js autoTransplant）
        transplant: true
      }]
    },
    yuangong: {
      id: 'yuangong', name: '元合岛·青元宫', pos: '灵界·风元大陆 元合岛', from: 'fengyuan',
      desc: '岛上一座银色宫殿，名字是韩立自己取的。殿后药园、紫竹、灵泉各有其位，弟子往来如流。',
      quote: '总算有一处，是自己的。',
      capLevel: 300, restStone: 3600, restXp: 0.12,
      crafts: ['alchemy', 'forge', 'talisman'],
      restTip: '元合岛灵脉自海眼上涌，殿中打坐，潮声都隔在外头。'
    },
    xlcave: {
      id: 'xlcave', name: '小灵天洞府', pos: '灵界·小灵天', from: 'xiaoling',
      desc: '一方小世界，收在袖里。天很低，一口井，一炉火，谁也找不进来。',
      quote: '打下来的小世界，比买来的洞府踏实。',
      capLevel: 440, restStone: 5200, restXp: 0.10,
      crafts: ['alchemy', 'forge', 'talisman'],
      restTip: '小灵天的灵气自成一界，闭门坐一年，外面的事一件都不知道。'
    }
  });
  // 灵界洞府（与其它剧情图同一机制：finishMap 认 m.cave，通关即归己有）
  // ① 天渊城洞府（tycave，cap 220）：飞升落地、灵界第一课（安远城）通关即得。
  //    原著韩立抵灵界先落脚天渊城，在灵界浓厚灵气中闭关，化神后期方能圆满、进阶炼虚；
  //    故此洞府须早于「炼虚关」到手，否则化神后期卡在 149 之前、无地可圆满（死锁）。
  // ② 元合岛·青元宫（yuangong，cap 300）、③ 小灵天洞府（xlcave，cap 440）依主线后得。
  { const m = window.MAPS.find(x => x.id === 'anyuan'); if (m) m.cave = 'tycave'; }
  { const m = window.MAPS.find(x => x.id === 'liangzu'); if (m) m.cave = 'tycave'; } // 兜底：主线推到此处亦得
  { const m = window.MAPS.find(x => x.id === 'fengyuan'); if (m) m.cave = 'yuangong'; }
  { const m = window.MAPS.find(x => x.id === 'xiaoling'); if (m) m.cave = 'xlcave'; }

  // ========================= 五(5)、坊市「功法」柜 =========================
  // 原来 SHOP_STOCK 里有 24 条 cat:'skill' 的法诀，但 SHOP_CATS 只有 丹药/符箓/法器/杂材 四个页签，
  // 玩家永远点不到「功法」这一柜 —— 这些法诀等于白挂。补上页签才真正买得到。
  if (!window.SHOP_CATS.some(c => c.id === 'skill')) {
    window.SHOP_CATS.push({ id: 'skill', name: '功法' });
  }

  // 灵界商店的招牌（坊市图示与副标题）
  // 原著（1160 岁起）：天渊城是青冥卫驻地和唯一的坊市，真灵材料在这里过手。
  // 这张 market 图必须排在「山腹·两色雷劫」之后、「灵地·金阙玉书」之前 ——
  // 因为它要等 TY_SHOP 定义好才能建，所以先 push 到最后，再整张牌挪回位。
  if (!window.MAPS.some(m => m.id === 'tianyuan')) {
    window.MAPS.push({
      id: 'tianyuan', name: '天渊城', pos: '灵界·天渊城', arc: 'I',
      type: 'market', tag: '坊市', shop: TY_SHOP,
      desc: '人妖两族共守的边城。青冥卫的营房、玉阙阁的灵地、一层层叠上去的石阁坊市，都在这道城墙里。',
      shopSub: '灵界百族的货都在这儿过一手。真灵鳞片、真灵之血，价都写在牌上。',
      startLevel: 132, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'shanku', next: 'lingdi',
      reward: { stones: 0, mats: [['m_zhenlinglin', 1]] },
      clearTitle: '青冥卫',
      clearDesc: '丙五十六小队的一件青袍、一面腰牌，山腰上一片自己的灵地。灵界的规矩，从这里才算摸着。'
    });
  }
  // 把天渊城挪回它在副本里该在的位置（山腹之后、灵地之前）
  {
    const ti = window.MAPS.findIndex(m => m.id === 'tianyuan');
    const si = window.MAPS.findIndex(m => m.id === 'shanku');
    if (ti >= 0 && si >= 0 && ti > si + 1) {
      const ty = window.MAPS.splice(ti, 1)[0];
      const at = window.MAPS.findIndex(m => m.id === 'shanku');
      window.MAPS.splice(at + 1, 0, ty);
    }
  }

  // ========================= 六、场景底色 =========================
  Object.assign(window.MAP_SCENERY, {
    qinluo:  { bg: { base: '#43392a', a: '#51452f', b: '#322a1f' }, decor: [['rock', 0.26], ['tuft', 0.04]] },
    anyuan: { bg: { base: '#2b3348', a: '#333d55', b: '#222a3c' }, decor: [['rock', 0.22], ['tuft', 0.10]] },
    luori:   { bg: { base: '#3a2b26', a: '#46342c', b: '#2b1f1b' }, decor: [['rock', 0.34], ['tree', 0.06]] },
    shanku:  { bg: { base: '#252c38', a: '#2d3644', b: '#1b2130' }, decor: [['rock', 0.40], ['tuft', 0.03]] },
    tianyuan: { bg: { base: '#31333f', a: '#3b3e4c', b: '#242631' }, decor: [['rock', 0.12], ['tuft', 0.05]] },
    lingdi:  { bg: { base: '#2a3440', a: '#34414f', b: '#1e2733' }, decor: [['rock', 0.20], ['tuft', 0.14]] },
    muzu:    { bg: { base: '#2c3a2c', a: '#354637', b: '#202b20' }, decor: [['rock', 0.20], ['tree', 0.18]] },
    zhenchan: { bg: { base: '#2a3438', a: '#334046', b: '#1e262a' }, decor: [['rock', 0.24], ['tuft', 0.06]] },
    tianpeng: { bg: { base: '#222c38', a: '#2b3846', b: '#182029' }, decor: [['rock', 0.30], ['tuft', 0.03]] },
    minghe:  { bg: { base: '#1f2b2e', a: '#273639', b: '#162021' }, decor: [['rock', 0.26], ['tuft', 0.03]] },
    lianxu: { bg: { base: '#26303f', a: '#2e3a4b', b: '#1d2532' }, decor: [['rock', 0.30], ['tuft', 0.08]] },
    fengyuan: { bg: { base: '#2f3a2e', a: '#384633', b: '#242e23' }, decor: [['rock', 0.28], ['tuft', 0.16]] },
    shisan:   { bg: { base: '#3a3d45', a: '#454952', b: '#2b2e35' }, decor: [['rock', 0.22], ['tuft', 0.06]] },
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
    modajie:  { bg: { base: '#1e2430', a: '#263040', b: '#161b24' }, decor: [['rock', 0.30], ['tuft', 0.02]] },
    sanjie:   { bg: { base: '#242a36', a: '#2c3443', b: '#1a1f28' }, decor: [['rock', 0.26], ['tuft', 0.04]] },
    jiujie:   { bg: { base: '#2a2f3a', a: '#343a47', b: '#1f232c' }, decor: [['rock', 0.24], ['tuft', 0.03]] },
    qunqiang: { bg: { base: '#4a4132', a: '#564c3a', b: '#332d23' }, decor: [['rock', 0.30], ['tuft', 0.04]] },
    xianshi:  { bg: { base: '#2b2438', a: '#342c43', b: '#1e1929' }, decor: [['rock', 0.20], ['tuft', 0.04]] },
    zhangtianping: { bg: { base: '#3c3a2c', a: '#484635', b: '#2a2920' }, decor: [['rock', 0.22], ['tuft', 0.05]] },
    zhenxian: { bg: { base: '#2f3542', a: '#3a4253', b: '#232833' }, decor: [['rock', 0.22], ['tuft', 0.03]] },
    zhanxian: { bg: { base: '#3a1f22', a: '#45262a', b: '#2a1618' }, decor: [['rock', 0.26], ['tuft', 0.02]] },
    huimoyuan:{ bg: { base: '#1b2830', a: '#22333c', b: '#131d24' }, decor: [['rock', 0.16], ['tuft', 0.03]] },
    daoguo:   { bg: { base: '#2f3d28', a: '#3b4c32', b: '#212b1d' }, decor: [['tree', 0.30], ['tuft', 0.22], ['rock', 0.06]] },
    renzu:    { bg: { base: '#2e333d', a: '#373d48', b: '#212530' }, decor: [['rock', 0.14], ['tuft', 0.05]] },
    fsjie:    { bg: { base: '#232733', a: '#2c3140', b: '#191c25' }, decor: [['rock', 0.20], ['tuft', 0.02]] },
    xianjie:  { bg: { base: '#39434f', a: '#46525f', b: '#2b333d' }, decor: [['rock', 0.10], ['tuft', 0.02]] },
    linghuang: { bg: { base: '#3a3230', a: '#463c39', b: '#2b2623' }, decor: [['rock', 0.16], ['tuft', 0.05]] },
    zhandacheng: { bg: { base: '#2b2f38', a: '#343945', b: '#1f232b' }, decor: [['rock', 0.30], ['tuft', 0.04]] },
    shengshi: { bg: { base: '#2b2f38', a: '#343945', b: '#1f232b' }, decor: [['rock', 0.30], ['tuft', 0.04]] },
    heihu:    { bg: { base: '#241f26', a: '#2d2731', b: '#1a161c' }, decor: [['rock', 0.26], ['tuft', 0.03]] },
    baiguang: { bg: { base: '#4a4f57', a: '#575d66', b: '#3a3f46' }, decor: [['rock', 0.18], ['tuft', 0.02]] },
    tianmo:   { bg: { base: '#231c26', a: '#2c2331', b: '#19131c' }, decor: [['rock', 0.28], ['tuft', 0.02]] },
    diyi:     { bg: { base: '#2d3038', a: '#373b45', b: '#21242b' }, decor: [['rock', 0.28], ['tuft', 0.04]] },
    huirenjie:{ bg: { base: '#2f3a2b', a: '#384634', b: '#243023' }, decor: [['tree', 0.20], ['tuft', 0.20]] },
    yuyang:    { bg: { base: '#3a2f24', a: '#473a2d', b: '#2b231b' }, decor: [['rock', 0.20], ['tuft', 0.10]] },
    yuyang_dou:{ bg: { base: '#3d2a22', a: '#4a3329', b: '#2c1e18' }, decor: [['rock', 0.26], ['tuft', 0.04]] }
  });
  // late.js 合底色时还没有这些图，这里手动补上
  for (const id of ['qinluo', 'anyuan', 'luori', 'shanku', 'tianyuan', 'lingdi', 'muzu', 'zhenchan', 'tianpeng', 'minghe',
                    'lianxu', 'fengyuan', 'huohu', 'shisan', 'mojin', 'guanghan', 'heti_guan',
                    'liangzu', 'shengdao', 'mojie', 'moban', 'yitian', 'huangquan', 'moyuan', 'xiaoling', 'modajie',
                    'sanjie', 'jiujie', 'qunqiang', 'xianshi', 'zhenxian', 'zhangtianping', 'zhanxian', 'huimoyuan', 'daoguo', 'renzu', 'fsjie', 'xianjie',
                    'linghuang', 'zhandacheng', 'shengshi', 'heihu', 'baiguang', 'tianmo', 'diyi', 'huirenjie', 'yuyang', 'yuyang_dou']) {
    const m = window.MAPS.find(x => x.id === id);
    const sc = window.MAP_SCENERY[id];
    if (m && sc) { m.bg = sc.bg; m.decorScheme = sc.decor; }
  }

  // 灵界功法与法诀是后加的，索引要重建一次（Items.get 查的是这份快照）
  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  // 新图计入主线数
  window.MAIN_MAP_COUNT = window.MAPS.filter(m => !m.side).length;

})();
