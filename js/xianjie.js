// ============================================================================
// 第六部：仙界篇（飞升之后）
//
// 依《凡人修仙之仙界篇》原著：
//   X1 风起灵寰  X2 重回仙界  X3 时空迷踪  X4 大罗之争  X5 大道归一
//
// 本轮落地：① 卷一《风起灵寰》六图（灵寰界 → 苏醒 → 冷焰宗 → 掌天瓶 → 天鬼 → 破碎虚空）
//          ② 金仙破境关（lv460，天人有五衰 + 三十六仙窍）
//          ③ 仙界材料与仙界功法（逆丹诀、小挪移空间术）
//
// 重要背景（原著 X1C11-C12）：韩立飞升仙界后被打落，记忆残缺、流落灵寰界，
//   化名柳石，被柳乐儿唤作「石头哥哥」。真仙的身份必须藏住——
//   所以卷一整卷他都在躲，而不是在打。
//
// 依据见 canon/仙界篇-蓝图.md、canon/progression.md、canon/plot.md
// ============================================================================
(function () {

  // ========================= 一、仙界材料与成品 =========================
  // 仙元石 627 次（X2C138《仙元石和地丹师》）—— 仙界通用之物，催傀儡、买符买丹都靠它。
  // 玄黄之气 5 次（X1C65《玄黄之索》）。
  // 玄黄之索 / 灵婴剑符 / 天外飞豆 均为卷一一次性宝物。
  window.MATERIALS.push(
    { id: 'm_xianyuanshi', name: '仙元石', icon: '💠', rarity: 4, desc: '仙界通用之物。催动仙傀儡、买符买丹都用它（X2C138，627 次）。' },
    { id: 'm_xuanhuang', name: '玄黄之气', icon: '🌀', rarity: 4, desc: '玄黄法则凝出的一缕气机（X1C65《玄黄之索》，5 次）。' },
    // 时间法则之物（X3C515《暴富》，43 次）——仙界卷三的主角：有了它，
    // 《大五行幻世诀》（198 次）才不必一点一滴慢慢磨。
    { id: 'm_shijian', name: '时间法则之物', icon: '⏳', rarity: 5, desc: '蕴含时间法则之力之物（X3C515《暴富》，43 次）。修大五行幻世诀的辅物，坊市上一枚就要天价' }
  );

  window.ITEMS.push(
    { id: 't_xuanhuangs', name: '玄黄之索', rarity: 5, icon: '🪢', req: 430, noDrop: true,
      desc: '抽自玄黄之气的一根索（X1C65《玄黄之索》）。缠上便挣不开——卷一里唯一能锁住天鬼的东西',
      effect: { maxhp: 260, armor: 0.10 } },
    { id: 't_lingyingjianfu', name: '灵婴剑符', rarity: 4, icon: '🗡', req: 430,
      desc: '一道化三道的剑符（X1C66《灵婴剑符》，3 次）。钉住退路用的',
      effect: { dmg: 0.30, atkSpd: 0.08 } },
    { id: 't_tianwaifeidou', name: '天外飞豆', rarity: 5, icon: '🫘', req: 440, noDrop: true,
      desc: '一把撒出去便能挪走的豆子（X1C70《天外飞豆》）。逃命比杀人好用',
      effect: { spd: 0.14, regen: 0.6 } },
    // 太蜚独目（X3C831《寻医问药》）：韩立在帝江坊买到的。
    // 原著原句：「这眼球绝对不是普通太蜚独目，其中蕴含的时间力量，是他最早得到的那颗的数倍都不止」。
    { id: 't_taifeidumu', name: '太蜚独目', rarity: 5, icon: '👁', req: 520, unique: true, noDrop: true,
      desc: '一枚眼球，瞳孔处有一圈极细的金环（X3C831《寻医问药》）。其中蕴含的时间力量，是他最早得到的那颗的数倍',
      effect: { xpMul: 0.20, crit: 0.08 } },
    // 星斗盾（X3C909《星器》，21 次）：六花夫人以玄城星辰之力炼制的最高级武器，
    // 原著原句：「所谓星器，是六花夫人利用此地的星辰之力，炼制出来的一种最高级别的武器」。
    { id: 't_xingqidun', name: '星斗盾', rarity: 5, icon: '🛡', req: 520, unique: true, noDrop: true,
      desc: '一件星器（X3C909《星器》）。六花夫人以星辰之力炼制，威力极强，更有增幅自身实力的效果',
      effect: { armor: 0.22, maxhp: 460 } },
    // 卷三档可随机掉的成品：仙界档（arc M）首领的池子原先只有灵界那几件，
    // 补这两件之后，520 段才掉得出「这一档该掉的东西」。
    { id: 't_zhongshuileizhu', name: '重水雷珠', rarity: 4, icon: '🔮', req: 520,
      desc: '以黑海重水凝成的雷珠（X2C151《重水雷珠》，27 次）。仙界里少见的雷属性重器',
      effect: { dmg: 0.24, atkSpd: 0.08 } },
    { id: 't_gengyuanfalian', name: '隔元法链', rarity: 4, icon: '⛓', req: 540,
      desc: '一条隔开元气的法链（X2C202《重水真轮》，50 次）。链一缠上，遁速就先去了三分',
      effect: { armor: 0.16, spd: 0.10 } }
  );

  // ---- 卷四 / 卷五 的三件仙器（后传专名，频次均已核）----
  // ① 岁月神灯 182 次：太岁仙尊一生心血所炼（X4C1042《破阵》），X4C1128《入手神灯》到付。
  // ② 幽冥鬼爪 28 次：鎏金城万宝节拍卖之物（X4C1200《竞价》），啼魂想要的两件仙器之一。
  // ③ 阎罗之鼎 25 次：通体刻着「阎罗之府」四字的铭文（X4C1214《初临九元城》），
  //    一条通往南宫婉下落的线，韩立追了很久才追到。
  window.ITEMS.push(
    { id: 't_suiyueshendeng', name: '岁月神灯', rarity: 5, icon: '🕯', req: 580, unique: true, noDrop: true,
      desc: '太岁仙尊花费一生心血炼制的仙器（X4C1042《破阵》，182 次）。灯芯一动，周围的时间就慢下来',
      effect: { dmg: 0.34, xpMul: 0.22, crit: 0.08 } },
    { id: 't_youmingguizhua', name: '幽冥鬼爪', rarity: 5, icon: '🐾', req: 584, unique: true, noDrop: true,
      desc: '一只黑色巨爪（X4C1200《竞价》，28 次）。爪过之处不只碎，连切口都在腐蚀——啼魂要的就是它',
      effect: { dmg: 0.30, armor: -0.06, crit: 0.10 } },
    { id: 't_yanluozhiding', name: '阎罗之鼎', rarity: 5, icon: '⚱', req: 596, unique: true, noDrop: true,
      desc: '一只来路不明的小鼎，鼎身铭文里写着「阎罗之府」四字（X4C1214《初临九元城》，25 次）',
      effect: { maxhp: 620, armor: 0.14 } }
  );

  // ========================= 二、仙界篇敌人（灵寰界档） =========================
  // 卷一韩立带伤藏拙，打的都是灵寰界本土的东西：化神级宗门弟子、妖修、一只天鬼。
  Object.assign(window.ENEMY_TYPES, {
    // 仙界档（卷二往后）：仙元石级的东西，量级远高于灵寰界
    xj_lunhui:   { name: '轮回殿要犯', hp: 240000, spd: 82, dmg: 300, r: 24, xp: 900, spr: 'assassin', drop: 0.4, tier: 2, mats: ['m_xianyuanshi'] },
    xj_tianwei:  { name: '天庭金仙道主', hp: 210000, spd: 86, dmg: 275, r: 23, xp: 850, spr: 'fashi', drop: 0.4, tier: 2, mats: ['m_xianyuanshi', 'm_xuanhuang'] },
    xj_daozhu:   { name: '烛龙道长老', hp: 190000, spd: 76, dmg: 260, r: 23, xp: 760, spr: 'disciple', drop: 0.35, tier: 1, mats: ['m_xianyuanshi'] },
    // 卷三档（大墟 / 五城会武 / 魔域）
    xj_shimei:   { name: '尸魅', hp: 240000, spd: 84, dmg: 290, r: 23, xp: 880, spr: 'ghost', drop: 0.35, tier: 1, mats: ['m_xianyuanshi'] },
    xj_xuechi:   { name: '血池守灵', hp: 260000, spd: 80, dmg: 305, r: 24, xp: 940, spr: 'assassin', drop: 0.4, tier: 2, mats: ['m_xianyuanshi', 'm_shijian'] },
    xj_linv:     { name: '鳞犼守门', hp: 300000, spd: 78, dmg: 330, r: 26, xp: 1100, spr: 'beast', drop: 0.45, tier: 2, mats: ['m_xianyuanshi', 'm_shijian'] },
    xj_yizhou:   { name: '灰界石傀', hp: 180000, spd: 70, dmg: 250, r: 24, xp: 700, spr: 'kui', drop: 0.35, tier: 1, mats: ['m_xianyuanshi'] },
    lh_xiongshou: { name: '灵寰凶兽', hp: 9000, spd: 46, dmg: 120, r: 15, xp: 40, spr: 'wolf', drop: 0.10, tier: 0, mats: ['m_xianyuanshi'] },
    lh_hanbing:   { name: '冷焰宗弟子', hp: 13000, spd: 54, dmg: 155, r: 15, xp: 55, spr: 'fashi', drop: 0.12, tier: 0, mats: ['m_xianyuanshi'] },
    lh_lingzhu:   { name: '灵寰灵族', hp: 17000, spd: 60, dmg: 185, r: 16, xp: 70, spr: 'yaoshou2', drop: 0.12, tier: 0, mats: ['m_xianyuanshi', 'm_xuanhuang'] },
    lh_baishi:    { name: '白石真人', hp: 62000, spd: 68, dmg: 230, r: 23, xp: 300, spr: 'hermit', drop: 0.5, tier: 2, mats: ['m_xianyuanshi', 'm_xuanhuang'] },
    lh_tiangui:   { name: '百目天鬼', hp: 88000, spd: 74, dmg: 268, r: 25, xp: 420, spr: 'guixiu', drop: 0.6, tier: 2, mats: ['m_xianyuanshi', 'm_xuanhuang'] },
    // 卷四档（太岁府 / 虫巢 / 九元城）：此时韩立仍是太乙巅峰，对手已经开始是大罗的东西。
    // 九元观影卫（X4C1035，4 次）、天阴五子（X4C1024《诛五恶》）、火岁萤虫（114 次）、
    // 金甲道兵（X4C1109《道兵阵》，10 次）。
    x4_yingwei:   { name: '九元观影卫', hp: 320000, spd: 96, dmg: 350, r: 24, xp: 1200, spr: 'assassin', drop: 0.42, tier: 2, mats: ['m_xianyuanshi'] },
    x4_tianyin:   { name: '天阴五子', hp: 300000, spd: 90, dmg: 344, r: 24, xp: 1150, spr: 'disciple', drop: 0.42, tier: 2, mats: ['m_xianyuanshi', 'm_shijian'] },
    x4_huosui:    { name: '火岁萤虫', hp: 290000, spd: 106, dmg: 330, r: 18, xp: 1080, spr: 'ghost', drop: 0.40, tier: 1, mats: ['m_xianyuanshi'] },
    x4_daobing:   { name: '金甲道兵', hp: 350000, spd: 84, dmg: 362, r: 25, xp: 1260, spr: 'kui', drop: 0.45, tier: 2, mats: ['m_xianyuanshi'] },
    // 卷五档（幽冥 / 十方万仙）：后缀都是鬼。荒魂（24 次）、鬼兵（19 次）、鬼物（225 次）。
    x5_guiwu:     { name: '幽冥鬼物', hp: 380000, spd: 92, dmg: 392, r: 24, xp: 1400, spr: 'ghost', drop: 0.45, tier: 2, mats: ['m_xianyuanshi'] },
    x5_guibing:   { name: '幽冥鬼兵', hp: 360000, spd: 88, dmg: 382, r: 24, xp: 1350, spr: 'guixiu', drop: 0.45, tier: 2, mats: ['m_xianyuanshi'] },
    x5_huanghun:  { name: '荒魂', hp: 420000, spd: 98, dmg: 412, r: 26, xp: 1500, spr: 'ghost', drop: 0.48, tier: 2, mats: ['m_xianyuanshi', 'm_shijian'] }
  });

  // ========================= 三、卷一《风起灵寰》六图 =========================
  window.MAPS.push(
    {
      id: 'linghuan', name: '灵寰界·荒地', pos: '仙界·灵寰界 荒地', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '灰白的荒地，遍地的石头和黄尘。一个六七岁的女童攥着拨浪鼓在跑，草丛里躺着一个人。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'xianjie', next: 'suxing',
      reward: { stones: 120000, mats: [['m_xianyuanshi', 2]] },
      clearTitle: '石头哥哥',
      clearDesc: '她不知道他是谁，只知道他会教她把拨浪鼓上的青光变成蛇。他也没告诉她，他连自己是谁都想不起来了。'
    },
    {
      id: 'suxing', name: '苏醒·我是韩立', pos: '仙界·灵寰界 旧屋', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '他醒过来，头疼欲裂。记忆像碎掉的镜子，一片一片自己浮上来。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'linghuan', next: 'lingyan',
      reward: { stones: 140000 },
      clearTitle: '我是韩立',
      clearDesc: '人族第一修士，灵界第一大乘。飞升过。至于为什么会躺在这里——他想不起来。'
    },
    {
      id: 'lingyan', name: '灵焰山脉·通易谷', pos: '仙界·灵寰界 冷焰宗', arc: 'M',
      type: 'boss', tag: '剧情战',
      desc: '冷焰宗的藏经阁嵌在崖壁上，禁制一层套一层。他不是来打架的，他是来偷书的。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'suxing', next: 'xiaoping',
      diff: 4.0, bossAt: 0, intro: 'lingyan', outro: 'lingyan_out',
      enemies: ['lh_hanbing', 'lh_xiongshou', 'lh_lingzhu'],
      elites: ['冷焰宗·护法', '灵寰散修'],
      mats: ['m_xianyuanshi', 'm_xuanhuang'],
      boss: { kind: 'mo', name: '白石真人', hp: 62000, spd: 68, dmg: 230, r: 23, spr: 'hermit', scale: 5.4 },
      reward: { stones: 160000, mats: [['m_xianyuanshi', 4], ['m_xuanhuang', 2]] },
      clearTitle: '瞒天过海',
      clearDesc: '典籍到手，人也全身而退。只是那一下撞上来的神念，让他明白两件事：自己伤没好，这地方藏不住多久。'
    },
    {
      id: 'xiaoping', name: '掌天瓶·失而复得', pos: '仙界·灵寰界 旧屋', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '袖中忽然一热。他摸出来一只巴掌大的青瓶，瓶身墨绿灵纹一道道亮着。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'lingyan', next: 'tiangui',
      reward: { stones: 180000, mats: [['m_xianyuanshi', 3]] },
      clearTitle: '它回来了',
      clearDesc: '一路走到这里，他把最后一点东西都丢了。原来是这个。丢了它，他连自己是谁都快忘了。'
    },
    {
      id: 'tiangui', name: '天鬼出世', pos: '仙界·灵寰界 黑雾谷', arc: 'M',
      type: 'boss', tag: '剧情战',
      desc: '黑雾里走出一个形体，每一只眼睛都在看。看一眼，魂就散一半。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'xiaoping', next: 'poxu',
      diff: 4.2, bossAt: 0, intro: 'tiangui', outro: 'tiangui_out',
      enemies: ['lh_lingzhu', 'lh_hanbing', 'lh_xiongshou'],
      elites: ['天鬼·分魂', '灵寰凶王'],
      mats: ['m_xianyuanshi', 'm_xuanhuang'],
      boss: { kind: 'mo', name: '百目天鬼', hp: 88000, spd: 74, dmg: 268, r: 25, spr: 'guixiu', scale: 5.8 },
      reward: { stones: 200000, items: ['t_xuanhuangs', 't_lingyingjianfu'], mats: [['m_xianyuanshi', 5], ['m_xuanhuang', 3]] },
      clearTitle: '天鬼认主',
      clearDesc: '玄黄之索缠上去，百目天鬼不再挣扎。连同那具大乘傀儡，一起收进了袖里。'
    },
    {
      // 卷二《重回仙界》最密的一段（X2C315–C345）：烛龙道第一道主百里炎闭关不出，
      // 宗门实际由欧阳奎山等十位金仙道主掌控；天庭的人（银须男子萧晋寒）借内乱插手，
      // 而韩立恰好站在白玉峰顶。轮回殿要犯、烛龙道、天庭三股势力挤在一处。
      id: 'chulong', name: '烛龙道·第一道主', pos: '仙界·烛龙道 白玉峰', arc: 'M',
      type: 'boss', tag: '剧情战',
      desc: '白玉峰顶站着十位金仙道主。峰外又来了一位银须男子——天庭的人，比道主更讲规矩。',
      startLevel: 460, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'wumengdao', next: 'huijie',
      diff: 5.1, bossAt: 0, intro: 'chulong', outro: 'chulong_out',
      enemies: ['xj_lunhui', 'xj_tianwei', 'xj_daozhu'],
      elites: ['烛龙道·长老', '轮回殿·影卫'],
      mats: ['m_xianyuanshi', 'm_xuanhuang'],
      boss: { kind: 'mo', name: '萧晋寒·天庭使者', hp: 330000, spd: 92, dmg: 360, r: 28, spr: 'mo', scale: 7.4 },
      reward: { stones: 320000, mats: [['m_xianyuanshi', 8], ['m_xuanhuang', 4]] },
      clearTitle: '烛龙道',
      clearDesc: '第一道主还在，天庭与道主们还在互相掣肘。他从峰顶退出去时，谁也没多看他一眼。'
    },
    {
      // 灰界（X2C454 噬金仙 / X2C464《天纵之才》）：一界皆石，尽是雕像；
      // 最深处坐着一位寸发不生的金色小人——噬金仙。
      id: 'huijie', name: '灰界·石中坐客', pos: '仙界·灰界', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '灰界里没有风，也没有光。到处是石头雕像，最深处坐着一位寸发不生的小人。',
      startLevel: 460, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'chulong', next: 'taiyi',
      reward: { stones: 340000, mats: [['m_xianyuanshi', 8], ['m_xuanhuang', 5]] },
      clearTitle: '灰界',
      clearDesc: '整座灰界静得能听见石头的声音。那位小人说，它等了很久。'
    },
    {
      // 太乙破境图（后传 X3C775《进阶太乙》）：青黑山谷遍地铁兽残尸，血汇成湖；
      // 湖心漂着精纯仙灵力凝成的白色莲苞，里面的人要拿它硬扛一劫。
      id: 'taiyi', name: '进阶太乙', pos: '仙界·青黑山谷', arc: 'M',
      type: 'story', tag: '破境',
      desc: '遍地异兽残尸，血液汇成近百里的湖。湖心漂着一朵合拢的白色莲苞。',
      startLevel: 460, endLevel: 520, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'huijie', next: 'dijiang',
      reward: { stones: 400000, mats: [['m_xianyuanshi', 10], ['m_xuanhuang', 6]] },
      clearTitle: '太乙',
      clearDesc: '莲苞开的时候，谷外最后一只雪蟾也倒下了。这一关不是打出来的，是熬出来的。'
    },
    {
      // 卷三《时空迷踪》前半（X3C776–C831）：韩立入魔域，入夜阳城。
      // 帝江坊是摩诃区内八座最大的坊市之一；城内所有坊市都不许驾车入内（大皇子定的规矩）。
      // 仙灵阁的采购目录上记的东西，十有八九都是时间法则之物——他在为《大五行幻世诀》备料。
      // 原著原句：「这眼球绝对不是普通太蜚独目，其中蕴含的时间力量，是他最早得到的那颗的数倍都不止」。
      id: 'dijiang', name: '帝江坊·夜阳城', pos: '仙界·魔域 摩诃区 夜阳城', arc: 'M',
      type: 'market', tag: '坊市',
      // shop 列表必须显式给：没有它 renderShop 会回退到全局 SHOP_STOCK，
      // 玩家在仙界坊市里就能买到人界的精铁短剑。
      shop: ['m_xianyuanshi', 'm_shijian', 'm_xuanhuang', 'jipin', 'huiqi', 'qiannian', 'sk_dawuxing', 'sk_zhenyan'],
      desc: '魔域最大的一座坊市。城里的坊市不许驾车入内，十四分岔的街，全是丹药灵材与法则之物。',
      shopSub: '时间法则之物在这儿论价论斤地摆着。魔域的货，比烛龙道宗门坊市还杂。',
      startLevel: 520, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'taiyi', next: 'xingqi',
      reward: { stones: 0, items: ['t_taifeidumu'] },
      clearTitle: '帝江坊',
      clearDesc: '一枚独目到手。魔域的规矩多，但货也真。'
    },
    {
      // 卷三中段（X3C892–C913）：五城会武、玄城、修罗场。
      // 厄脍城主停下五城会武，带进入十六强的人同探积鳞空境深处的秘境。
      // 风无尘手中有一对星器；韩立拿到的星斗盾还要用精血祭炼才认得了。
      id: 'xingqi', name: '星器·五城会武', pos: '仙界·玄城 玄斗场', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '玄斗场上的号角响过三遍。厄脍城主叫停了会武，宣布带人进积鳞空境深处的秘境。',
      startLevel: 520, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'dijiang', next: 'dadi',
      reward: { stones: 460000, items: ['t_xingqidun'], mats: [['m_xianyuanshi', 10], ['m_shijian', 2]] },
      clearTitle: '星器',
      clearDesc: '星器认主要用精血。刀还在鞘里，得先祭炼几天。'
    },
    {
      // 卷三高潮（X3C917–C943）：大墟。
      // 厄脍城主带队进的秘境：一进去就是无边无际的昏黄戈壁，遍地黑黄碎石。
      // 往里有血门、五角深坑、埋骨之地、泣血阵图，还有守门的鳞犼。
      id: 'dadi', name: '大墟', pos: '仙界·积鳞空境 大墟', arc: 'M',
      type: 'boss', tag: '秘境战',
      desc: '一脚踏进去，五感全失，眼前漆黑。等恢复过来，脚下已是无边无际的昏黄戈壁。',
      startLevel: 520, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'xingqi', next: 'xiedao',
      diff: 5.4, bossAt: 0, intro: 'dadi', outro: 'dadi_out',
      enemies: ['xj_shimei', 'xj_xuechi', 'xj_linv'],
      elites: ['大墟尸修', '血门守者'],
      mats: ['m_xianyuanshi', 'm_shijian'],
      boss: { kind: 'mo', name: '鳞犼·守门', hp: 420000, spd: 94, dmg: 400, r: 29, spr: 'beast', scale: 7.8 },
      reward: { stones: 560000, mats: [['m_xianyuanshi', 14], ['m_shijian', 4]] },
      clearTitle: '大墟',
      clearDesc: '埋骨之地的白骨里，还埋着上一个进来的人。'
    },
    {
      // 卷三收尾（X3C989《道天大劫》）——注意：这一场劫是蟹道人的，不是韩立的。
      // 原著里蟹道人在积鳞空境的地底大殿主动迎劫，韩立只是站在看得见的地方，
      // 连近九百个玄窍都开满了，还是被余威一冲就昏迷过去。
      // 「道天大劫」这四个字在卷五还会出现一次（X5C1382），那一次才是韩立自己的。
      id: 'xiedao', name: '积鳞空境·天变了', pos: '仙界·积鳞空境 地底大殿', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '殿里金光正盛。蟹道人忽然仰起头——他好像一直在等这一刻。',
      startLevel: 520, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'dadi', next: 'jingong',
      reward: { stones: 620000, mats: [['m_xianyuanshi', 12], ['m_shijian', 4]] },
      clearTitle: '别人的劫',
      clearDesc: '这是别人的劫。他站在最近的边上，替自己记住了那个天色——灰黑是从上面压下来的，不是从地上长出来的。'
    },

    // ========================= 三(2)、卷四《大罗之争》 =========================
    // 原著密度：X4 是全书最密的一卷（全面开战）。但「密」不等于一路平推——
    // 这一卷的波形是：杀进别人的家 → 千人破阵看戏 → 退无可退 → 抢灯 → 闭关 → 买东西 → 再钻下去。
    {
      // 卷四开篇（X4C1019–C1025）：东方白以青狐族五万七千三百条人命设局，被韩立反手踩住。
      // 原著原句：「你日前无故屠戮青狐一族，全族上下五万七千三百人全部罹难，罪恶滔天，
      // 今日便是你的死期！」（X4C1022《独闯仙宫》）
      // 天阴五子各戴一枚黑玉戒指，戒面上分刻虎、鹿、熊、猿、鹰五字（X4C1024《诛五恶》）。
      id: 'jingong', name: '独闯仙宫·诛五恶', pos: '仙界·大金源仙域 金源仙宫', arc: 'M',
      type: 'boss', tag: '剧情战',
      desc: '宫门大开着。他一个人走进去，像走进自己家的院子。',
      startLevel: 520, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'xiedao', next: 'taisui',
      diff: 5.6, bossAt: 0, intro: 'jingong', outro: 'jingong_out',
      enemies: ['x4_yingwei', 'x4_tianyin', 'xj_tianwei'],
      elites: ['金源仙宫·侍卫', '天阴五子·影'],
      mats: ['m_xianyuanshi', 'm_shijian'],
      boss: { kind: 'mo', name: '东方白·金源宫主', hp: 520000, spd: 98, dmg: 440, r: 30, spr: 'mo', scale: 8.2 },
      reward: { stones: 720000, mats: [['m_xianyuanshi', 16], ['m_shijian', 3]] },
      clearTitle: '诛五恶',
      clearDesc: '五枚戒指上刻着五个字。五个人的账，他一笔一笔算完，然后推开里面那扇门。'
    },
    {
      // 太岁府（X4C1033–C1042）：秘境出世，各方云集。
      // 通天剑派副掌门雷玉策与文仲在塔前画出黑白双生的阴阳双鱼法阵，每阵需五十人催动，
      // 塔前群修千余。他们要的是岁月神灯——太岁仙尊一生心血炼出的仙器（X4C1042《破阵》）。
      id: 'taisui', name: '太岁府·各方云集', pos: '仙界·大金源仙域 太岁府', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '灰色巨塔立在秘境正中。塔前聚了一千多人，没有一个人肯站到第一排。',
      startLevel: 520, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'jingong', next: 'chongchao',
      reward: { stones: 760000, mats: [['m_xianyuanshi', 16], ['m_shijian', 5]] },
      clearTitle: '千人破阵',
      clearDesc: '黑白两个法阵转起来的时候，站在阵里的那五十个人并不知道自己在替谁开门。'
    },
    {
      // 虫巢（X4C1056–C1065）：火岁萤虫一路追到底，虫群却停在洞口一步不进；
      // 里面是赤红岩浆湖、天王塑像与降魔杵，再往下是十八层囚塔和大罗鬼王。
      id: 'chongchao', name: '虫巢·大罗鬼王', pos: '仙界·大金源仙域 虫巢', arc: 'M',
      type: 'boss', tag: '秘境战',
      desc: '身后是铺天盖地的虫群，前面是一片赤红的岩浆湖。没有第三个方向。',
      startLevel: 520, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'taisui', next: 'suidian',
      diff: 5.8, bossAt: 0, intro: 'chongchao', outro: 'chongchao_out',
      enemies: ['x4_huosui', 'x4_yingwei', 'x5_guiwu'],
      elites: ['火岁萤虫·母虫', '十八层守卒'],
      mats: ['m_xianyuanshi', 'm_shijian'],
      boss: { kind: 'mo', name: '大罗鬼王', hp: 620000, spd: 100, dmg: 470, r: 32, spr: 'guixiu', scale: 8.6 },
      reward: { stones: 840000, mats: [['m_xianyuanshi', 18], ['m_shijian', 5]] },
      clearTitle: '虫巢',
      clearDesc: '虫群停在洞口，一步也不敢进。他回头看了一眼，把这件事记住了。'
    },
    {
      // 岁月殿（X4C1104–C1130）：三十六柄石剑堵门 → 金甲道兵借祭坛之力 → 双灵域重合断其联系
      // → 五色融光把奇摩子从大罗一路打回太乙 → 入手神灯。天煞镇狱功正是在这一役里动用的。
      id: 'suidian', name: '岁月殿·夺灯', pos: '仙界·大金源仙域 岁月殿', arc: 'M',
      type: 'boss', tag: '剧情战',
      desc: '殿门半掩，缝里透出耀眼金光。门前立着三十六柄石剑，剑尖一律朝上。',
      startLevel: 520, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'chongchao', next: 'daluo',
      diff: 6.0, bossAt: 0, intro: 'suidian', outro: 'suidian_out',
      enemies: ['x4_daobing', 'x4_yingwei', 'x5_guiwu'],
      elites: ['岁月殿·金甲道兵', '石剑残影'],
      mats: ['m_xianyuanshi', 'm_shijian'],
      boss: { kind: 'mo', name: '奇摩子', hp: 780000, spd: 104, dmg: 500, r: 32, spr: 'mo', scale: 9.0 },
      reward: { stones: 980000, items: ['t_suiyueshendeng'], mats: [['m_xianyuanshi', 20], ['m_shijian', 8]] },
      clearTitle: '入手神灯',
      clearDesc: '五色融光散尽的时候，一个大罗从头开始，一点一点跌回太乙。'
    },
    {
      // 大罗破境图（后传 X4C1194《进阶大罗》/ X4C1195《天人境》）：
      // 蛮荒界域，花枝洞天。银色光门二十年一动不动，一朝打开，万里云海被搅成云雾龙卷倒灌进来。
      // 重申：X3C989 那一场「道天大劫」是蟹道人的（见 xiedao），不是韩立的，两处不可混写。
      id: 'daluo', name: '进阶大罗·天人境', pos: '仙界·蛮荒界域 花枝洞天', arc: 'M',
      type: 'story', tag: '破境',
      desc: '花枝洞天的银色光门外，万里云海被搅成一道巨龙卷，从高天上垂落下来。',
      startLevel: 520, endLevel: 580, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'suidian', next: 'wubao',
      reward: { stones: 1100000, mats: [['m_xianyuanshi', 18], ['m_shijian', 8]] },
      clearTitle: '大罗',
      clearDesc: '二十年时间不够解释这件事。他推开的那扇门后面，是另一层东西。'
    },
    {
      // 万宝节（X4C1198–C1200）：鎏金城。与大金源仙域另外三座巨城（九元城、百造城、金源城）不同，
      // 鎏金城背后没有庞大势力，由日月盟（36 次）辖下的一批中小势力凑成的联盟自保。
      // 拍卖由日月阁（20 次）主持，规矩是：但凡攻击性仙器，一律当场试演。
      // 幽冥鬼爪（28 次）在这一场登场——啼魂想要的两件仙器之一。
      id: 'wubao', name: '鎏金城·万宝节', pos: '仙界·大金源仙域 鎏金城', arc: 'M',
      type: 'market', tag: '坊市',
      // shop 必须显式给：没有它 renderShop 会回退全局 SHOP_STOCK，仙界玩家会买到前传的东西。
      shop: ['m_xianyuanshi', 'm_shijian', 'm_xuanhuang', 'jipin', 'huiqi', 'qiannian', 'sk_tiansha', 'sk_zhenyan'],
      desc: '鎏金城没有主人。九层酒楼的雅间里坐着三个人，一个是他，另外两个不太像人。',
      shopSub: '万宝节这一个月，日月阁把仙器摆上拍卖台。攻击性仙器一律当场试演——台上那块黑石就是试的。',
      startLevel: 580, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'daluo', next: 'jiuyuan',
      reward: { stones: 0, items: ['t_youmingguizhua'] },
      clearTitle: '万宝节',
      clearDesc: '日月盟的地盘上没有九元观的人。所以这一个月，他过得挺像普通人。'
    },
    {
      // 卷四收尾（X4C1214–C1239）：阎罗之鼎上的「阎罗之府」四字，是他找了很久的一条线。
      // 一路追到九元城底下，是鬼阵、巨大鬼脸和鬼灵子（X4C1236–C1239）。
      // 原著细节：那张鬼脸的犬齿牙缝间，隐隐嵌着他的青竹蜂云剑。
      id: 'jiuyuan', name: '九元城·鬼阵', pos: '仙界·大金源仙域 九元城', arc: 'M',
      type: 'boss', tag: '秘境战',
      desc: '鼎身上的铭文只有四个字。为了这四个字，他一路追到了九元城的底下。',
      startLevel: 580, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'wubao', next: 'zaimiao',
      diff: 6.2, bossAt: 0, intro: 'jiuyuan', outro: 'jiuyuan_out',
      enemies: ['x5_guiwu', 'x5_guibing', 'x4_yingwei'],
      elites: ['鬼阵·阴卒', '九元城守卫'],
      mats: ['m_xianyuanshi', 'm_shijian'],
      boss: { kind: 'mo', name: '鬼灵子', hp: 880000, spd: 106, dmg: 540, r: 33, spr: 'guixiu', scale: 9.4 },
      reward: { stones: 1300000, items: ['t_yanluozhiding'], mats: [['m_xianyuanshi', 22], ['m_shijian', 10]] },
      clearTitle: '阎罗之府',
      clearDesc: '墙上那张脸笑起来的时候很像人。笑完，把他的青竹蜂云剑也一起笑进去了。'
    },

    // ========================= 三(3)、卷五《大道归一》 =========================
    // 波形反过来用：X5 只有一场定生死，所以前面四张都得收着写——
    // 甩不掉的人 → 拆一半的自己 → 替别人抢轮回 → 收剑 → 赴约 → 然后才是宴。
    {
      // 再战妙法（X5C1250–C1258）：妙法仙尊以灵域封锁百里，端坐在形如莲花的水晶王座上追来。
      // 这一役代表着：跑了几百年的那个人，终于有一次不跑了。
      id: 'zaimiao', name: '再战妙法', pos: '仙界·大金源仙域 林间凉亭', arc: 'M',
      type: 'boss', tag: '剧情战',
      desc: '银色光门在同伴身后合上。门外，方圆百里已经冻成了一片冰雪。',
      startLevel: 580, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'jiuyuan', next: 'zhanshi',
      diff: 6.4, bossAt: 0, intro: 'zaimiao', outro: 'zaimiao_out',
      enemies: ['x4_yingwei', 'xj_xuechi', 'x5_guiwu'],
      elites: ['九元观·影卫', '妙法座下'],
      mats: ['m_xianyuanshi', 'm_shijian'],
      boss: { kind: 'mo', name: '妙法仙尊', hp: 960000, spd: 108, dmg: 560, r: 33, spr: 'mo', scale: 9.6 },
      reward: { stones: 1500000, mats: [['m_xianyuanshi', 22], ['m_shijian', 10]] },
      clearTitle: '不留情面',
      clearDesc: '这一回他没有跑。跑了几百年，总得有一次把话说清楚。'
    },
    {
      // 斩尸（X5C1273）：恶尸占着地仙之躯，韩立用阴阳双鱼符阵加虚光锁链把它拆出来。
      // 膻中、百汇、丹田——这些正是恶尸改造那具躯壳的重要关隘。
      id: 'zhanshi', name: '斩尸', pos: '仙界·荒岛 祭坛', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '坛上有两个人面对面坐着。其中一个，坐的是他的旧躯壳。',
      startLevel: 580, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'zaimiao', next: 'youming',
      reward: { stones: 1600000, mats: [['m_xianyuanshi', 22], ['m_shijian', 10]] },
      clearTitle: '斩尸',
      clearDesc: '一半留在这里做人，一半放出去做别的。从此往后，账才终于算得清楚。'
    },
    {
      // 幽冥（X5C1279–C1308）：探幽冥 → 桥上石雕 → 转轮王 → 三王 → 奈何竹 → 刑兽之怒
      // → 岛中鬼殿 → 轮回 → 骨皇 → 轮回之争 → 殿主现身。整整三十章的东西压在这一张上。
      id: 'youming', name: '幽冥·骨皇', pos: '仙界·幽冥 岛中鬼殿', arc: 'M',
      type: 'boss', tag: '秘境战',
      desc: '门楣上没有匾额，只有两扇紧闭的门。门前站着两个不太像人的东西。',
      startLevel: 580, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'zhanshi', next: 'leihai',
      diff: 6.6, bossAt: 0, intro: 'youming', outro: 'youming_out',
      enemies: ['x5_guiwu', 'x5_guibing', 'x5_huanghun'],
      elites: ['幽冥鬼将', '骨海卫士'],
      mats: ['m_xianyuanshi', 'm_shijian'],
      boss: { kind: 'mo', name: '骨皇', hp: 1150000, spd: 110, dmg: 600, r: 34, spr: 'guixiu', scale: 10.0 },
      reward: { stones: 1800000, mats: [['m_xianyuanshi', 24], ['m_shijian', 12]] },
      clearTitle: '轮回之争',
      clearDesc: '轮回大阵顶得住骨皇，不是因为阵有多强——是阵里站的那两个人，谁也没打算先走。'
    },
    {
      // 雷海炼剑（X5C1323–C1326）：雷夔巨兽被天道吞噬之前留下的最后一枚雷电之眼（道祖遗物）；
      // 青竹蜂云剑一柄一柄沉进雷海——后世口中玄天剑灵的开头，就在这无人看的几天里。
      id: 'leihai', name: '雷海炼剑', pos: '仙界·无尽雷海', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '雷夔的影像散尽时，天上有门。门没开，只从里面漏出来一点威势。',
      startLevel: 580, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'youming', next: 'fuyao',
      reward: { stones: 1900000, mats: [['m_xianyuanshi', 24], ['m_shijian', 12]] },
      clearTitle: '雷海',
      clearDesc: '上一任雷之道祖被天道吞了，留下这枚眼。眼还在，人没了。'
    },
    {
      // 赴约 / 仙界大劫（X5C1327–C1332）：轮回殿主的判断是「他已斩去善尸，从大罗中期突破了后期」；
      // 水之本源道祖陈如烟（59 次）头顶生着两只龙角，把他的道侣先带走、再送回来。
      id: 'fuyao', name: '赴约·仙界大劫', pos: '仙界·龙渊仙域', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '约的地方很远。来的人，比约定的多了一个。',
      startLevel: 580, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'leihai', next: 'shifang',
      reward: { stones: 2000000, mats: [['m_xianyuanshi', 26], ['m_shijian', 14]] },
      clearTitle: '赴约',
      clearDesc: '她把人送回来了。送去又送回这件事本身，就是一句威胁。'
    },
    {
      // 十方万仙之宴（X5C1354–C1374）：只身赴宴 → 十方万仙 → 群英荟萃 → 宴起。
      // 天道七君在场：赤融、陈如烟、隐明、九元观观主李元究；古或今坐在轮椅上，毫无慌乱。
      // 四面银镜射出的十方万仙阵封死了方圆百万里海域。
      id: 'shifang', name: '十方万仙·宴起', pos: '仙界·天庭 十方万仙之宴', arc: 'M',
      type: 'boss', tag: '剧情战',
      desc: '宴摆在天庭。四面八方都有座位，只有他的名字写在请帖最下面一行。',
      startLevel: 580, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'fuyao', next: 'daotian',
      diff: 6.8, bossAt: 0, intro: 'shifang', outro: 'shifang_out',
      enemies: ['x5_huanghun', 'x5_guibing', 'x4_daobing'],
      elites: ['天庭·仙使', '天道七君座下'],
      mats: ['m_xianyuanshi', 'm_shijian'],
      boss: { kind: 'mo', name: '古或今', hp: 1400000, spd: 112, dmg: 640, r: 35, spr: 'mo', scale: 10.6 },
      reward: { stones: 2400000, mats: [['m_xianyuanshi', 30], ['m_shijian', 16]] },
      clearTitle: '宴起',
      clearDesc: '碎镜一样的光幕落下来的时候，那片海就成了绝地。他也没打算从门口出去。'
    },
    {
      // 道祖破境图（后传 X5C1382《道天大劫》）——这才是韩立自己的那一劫，与 X3C989 那场同名而不同事。
      // 原著：不是在闭关里，是在打的过程中。五股时间法则之力化为金色洪流倒灌回来，
      // 「轰」的一声，眼前金光一片，像是推开某扇大门，迈入了一个全新境界。
      // 之后他会亲手把这一层放回去（X5C1392《自由》：修为回落到大罗境巅峰）。
      id: 'daotian', name: '道天大劫', pos: '仙界·天庭', arc: 'M',
      type: 'story', tag: '破境',
      desc: '不是在闭关里，是在打着的中间。五感先走，然后是那一扇门。',
      startLevel: 580, endLevel: 640, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'shifang', next: 'daoyi',
      reward: { stones: 2600000, mats: [['m_xianyuanshi', 30], ['m_shijian', 16]] },
      clearTitle: '道祖',
      clearDesc: '门后面站着的东西跟他想的不太一样。他想起的第一件事，是还有人在等他。'
    },
    {
      // 大道归一 / 夺瓶 / 伏诛（X5C1385–C1390）：三千大道居然都在掌天瓶里。
      // 混沌法则从中牵出千丝万缕的丝线，把三千大道连成一张网；韩立与时间法则相连，
      // 成了这张网里的一份子。外面古或今正在炼化那只瓶子。
      id: 'daoyi', name: '大道归一·夺瓶', pos: '仙界·天庭 小瓶世界', arc: 'M',
      type: 'boss', tag: '剧情战',
      desc: '小瓶世界里一共有三千团光。他只有一个人在里面走。',
      startLevel: 640, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'daotian', next: 'feiyu',
      diff: 7.0, bossAt: 0, intro: 'daoyi', outro: 'daoyi_out',
      enemies: ['x5_huanghun', 'x5_guiwu', 'x4_daobing'],
      elites: ['天道残影', '混沌化身'],
      mats: ['m_xianyuanshi', 'm_shijian'],
      boss: { kind: 'mo', name: '古或今·混沌之身', hp: 1800000, spd: 116, dmg: 700, r: 36, spr: 'mo', scale: 11.2 },
      reward: { stones: 3200000, mats: [['m_xianyuanshi', 36], ['m_shijian', 20]] },
      clearTitle: '大道归一',
      clearDesc: '三千大道拧成一股的时候，站在正中间的那个人，开始不太像人了。'
    },
    {
      // 大结局（X5C1391–C1394）：弃道 → 自由 → 无憾 → 飞羽。
      // 掌天瓶碎，瓶灵脱困；他的修为由道祖回落至大罗境巅峰——这是他自己松的手。
      // 最后一站是天南无边海与彩霞山七玄门，看一眼还在练刀的童年好友。
      id: 'feiyu', name: '飞羽', pos: '人界·天南 无边海', arc: 'M',
      type: 'story', tag: '结局',
      desc: '海风很咸。这片地方灵气匮乏，他的神魂却异常舒坦。',
      startLevel: 640, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'daoyi', next: null,
      reward: { stones: 0 },
      clearTitle: '飞羽',
      clearDesc: '瓶子没有了，境界也放回去了。他用一辈子换来的，是想在回的时候还能回来。'
    },
    {
      // 金仙破境图（后传 X2C93–C100）：乌蒙岛，承认身份 + 三十六仙窍 + 天人有五衰。
      // 原著里韩立是在乌蒙岛外被三人围住、对方按黑风海域规矩「承认他对乌蒙岛的控制权」，
      // 他才借这个台阶不再藏；随后三十六仙窍点亮的第三十四个，天色暗了——五衰来了。
      id: 'wumengdao', name: '乌蒙岛·承认身份', pos: '仙界·黑风海域 乌蒙岛', arc: 'M',
      type: 'story', tag: '破境',
      desc: '气泡散尽时，他已站在一片陌生的海上。岛外站着三个人，等他给一个说法。',
      startLevel: 420, endLevel: 460, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'poxu', next: 'chulong',
      reward: { stones: 260000, mats: [['m_xianyuanshi', 6], ['m_xuanhuang', 3]] },
      clearTitle: '金仙',
      clearDesc: '三十六仙窍尽亮，五衰扛过去了。从今往后，他不叫柳石。'
    },
    {
      id: 'poxu', name: '破碎虚空·神秘气泡', pos: '仙界·灵寰界 界壁', arc: 'M',
      type: 'story', tag: '剧情',
      desc: '北斗异象。天空裂开一道缝，缝里不是星，是一层薄薄的膜。这方世界留不住了。',
      startLevel: 420, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'tiangui', next: 'wumengdao',
      reward: { stones: 220000, items: ['t_tianwaifeidou'], mats: [['m_xianyuanshi', 6], ['m_xuanhuang', 2]] },
      clearTitle: '气泡',
      clearDesc: '气泡从虚空里浮出来，裹住一个人，慢慢往上。他还不知道，外面等着他的是什么。'
    }
  );

  // ========================= 四、境界层与破境关 =========================
  // 金仙：仙界第一层。原著口径是「打通周身三十六仙窍」，且每次大境界要历「天人有五衰」。
  window.REALM_LAYERS.push(
    { lv: 460, name: '金仙', hp: 72000, dmg: 3.00, atk: 1.60, spd: 0.22, skill: 'nova', note: '仙界第一层，三十六仙窍' },
    { lv: 520, name: '太乙', hp: 118000, dmg: 3.60, atk: 1.90, spd: 0.24, skill: 'sword', note: '法则入门，仙灵莲苞护体' },
    { lv: 580, name: '大罗', hp: 186000, dmg: 4.30, atk: 2.30, spd: 0.26, skill: 'nova', note: '时间法则成形，天地之间有了一处属于自己的位置（X4C1194《进阶大罗》）' },
    // 道祖：后传最后一层。原著里这一层是「借来的」——X5C1382《道天大劫》在决战中途推开，
    // X5C1392《自由》又亲手松了手，修为回落至大罗境巅峰。
    { lv: 640, name: '道祖', hp: 300000, dmg: 5.20, atk: 2.90, spd: 0.28, skill: 'nova', note: '三千大道归一，也是他最后放回原地的一层（X5C1382 / X5C1392）' }
  );

  // 天人有五衰（X2C327，24 次）：仙界四道大境界关不是凑齐就必成 —— 每逢大境界都要历一次五衰，
  // 且「前面两衰的降临与修行时间有关」（X2C328），躲不掉，只能扛。
  // 参数口径：五道衰里最多能避开 3 道（canAvoid）；每押一档仙元石，把握 +step，可避开的衰少一道。
  // 押到顶 = 必成但五道全扛；不押 = 只扛两道却要赌一把。字段含义见 game.js 的 wuRate / wuTake。
  window.BREAKTHROUGH.push({
    lv: 640, realm: '道祖', from: '大罗期',
    tip: '从大罗到道祖，不是修炼出来的，是在打的过程中被推过去的（X5C1382《道天大劫》）。' +
      '原著里五感先走，然后五股时间法则之力倒灌回来，「轰」的一声推开某扇门，迈入一个全新境界。' +
      '要提前说清楚的是：这一层他最后会亲手放回去（X5C1392《自由》）——所以这一关的衰，扛得比谁都狠。',
    items: [],
    mats: [['m_xianyuanshi', 30], ['m_shijian', 16]],
    stones: 2400000,
    chance: { min: 1 },
    // 终局关：把握给得高一点（那时他已无退路），但代价也重
    wushuai: { pay: 'm_xianyuanshi', per: 8, base: 0.60, step: 0.14, canAvoid: 3, cost: 6 },
    story: [{ id: 'shifang', name: '仙界·天庭 十方万仙之宴' }],
    lines: [
      ['韩立', '（这是怎么回事……莫非我即将归墟，融入这世界了吗？）'],
      ['韩立', '（这一生自踏入修仙之途伊始，谨小慎微，不敢有一丝懈怠，到头来，终究难逃这一劫……）'],
      ['韩立', '（婉儿，对不起……）'],
      ['韩立', '（如果有来世……不如为俗世一介凡人，虽无缘长生，但却可图得天伦，又何须羡仙？）'],
      ['旁白', '周围虚空中泛起一道道金光，正是一缕缕时间法则之力，迅疾无比地朝着他的身体汇聚而来。'],
      ['旁白', '这五股时间法则之力，是他苦修多年的大五行幻世诀。失去的，重新得来。'],
      ['旁白', '五股时间法则之力在他体内疯狂运转，如狂风巨浪，荡涤全身。'],
      ['旁白', '大五行幻世诀的口诀从他脑海流淌而过，对于这门功法的认知，前所未有的深刻。'],
      ['旁白', '"轰"的一声，眼前金光一片，仿佛推开某扇大门，迈入了一个全新境界。']
    ]
  });

  window.BREAKTHROUGH.push({
    lv: 580, realm: '大罗', from: '太乙期',
    tip: '从太乙到大罗，靠的是「时间法则」——不是把力量堆上去，是让力量成形。' +
      '原著里这一关是闷出来的：花枝洞天的银色光门二十年不响，一响就把万里云海搅成了龙卷（X4C1194《进阶大罗》）。' +
      '注意：X3C989 那一场《道天大劫》是蟹道人的，不是韩立的，两处不可混写。',
    items: [],
    mats: [['m_xianyuanshi', 18], ['m_shijian', 8]],
    stones: 980000,
    chance: { min: 1 },
    wushuai: { pay: 'm_xianyuanshi', per: 6, base: 0.55, step: 0.15, canAvoid: 3, cost: 4 },
    story: [{ id: 'suidian', name: '仙界·岁月殿' }],
    lines: [
      ['旁白', '蛮荒界域，一片浓雾缭绕的山脉上空，一道道五彩惊雷炸裂不停，天地之间轰鸣不断。'],
      ['旁白', '天幕高处的万里云海被一股强大无比的力量搅动，化作一道巨大的云雾龙卷从高空垂落。'],
      ['旁白', '银色光门大开，汹涌而来的天地元气如蛟龙过境，发出阵阵龙吟般的巨大声响。'],
      ['小白', '这才不过区区二十年，就要突破到大罗境界了，这也太厉害了……'],
      ['旁白', '花枝空间内也是风云激变。空间竹林"簌簌"抖动，根根灵竹之上亮起光芒。'],
      ['旁白', '灵药园里，久未出苗的灵种破土而出，尚未开花的灵药绽放花瓣。'],
      ['旁白', '种着金莲的水池如同沸腾一般剧烈起伏，表面冒出一个个硕大的水泡。'],
      ['韩立', '（二十年前连想都不敢想的东西，今天就在门里面。）'],
      ['旁白', '"轰"的一声。云龙散了，山门还是那座山门。']
    ]
  });

  window.BREAKTHROUGH.push({
    lv: 520, realm: '太乙', from: '金仙期',
    tip: '从金仙到太乙，靠的是「法则」二字——不是把力量堆上去，是让力量有形（X2C464 灰界《天纵之才》）。' +
      '原著里这一关是熬出来的：精纯仙灵力凝成的白色莲苞裹着人身，谷外几百头异兽轮番冲击（X3C775《进阶太乙》）。' +
      '天人有五衰（X2C327）：前两道衰与修行时间有关，躲不掉；能避的只有后三道，且押得越多避得越少。',
    items: [],
    mats: [['m_xianyuanshi', 10], ['m_xuanhuang', 6]],
    stones: 420000,
    chance: { min: 1 },
    wushuai: { pay: 'm_xianyuanshi', per: 5, base: 0.60, step: 0.14, canAvoid: 3, cost: 3 },
    story: [{ id: 'huijie', name: '仙界·灰界' }],
    lines: [
      ['旁白', '青黑山谷里，遍地是支离破碎的异兽残尸。'],
      ['旁白', '乌黑的血液到处横流，汇成一片方圆近百里的血湖，浮尸无数。'],
      ['旁白', '湖心漂着一朵白色莲苞，叶瓣合拢。精纯的仙灵力在瓣上流转。'],
      ['韩立', '（要用它硬扛一劫。扛过去，就是太乙。）'],
      ['旁白', '谷外，蟹道人的长刀还滴着血。石穿空浑身浴血，符箓与阵盘都已耗尽。'],
      ['石穿空', '（还能撑多久。）'],
      ['旁白', '一只百丈之巨的白色雪蟾跃入高空，螺旋状的极寒风暴喷涌而出。'],
      ['旁白', '莲苞一瓣一瓣地开。血湖在抖，山谷在响。'],
      ['韩立', '（这一关不是打出来的，是熬出来的。）'],
      ['旁白', '莲苞完全绽开时，谷外最后一只雪蟾也倒了下去。']
    ]
  });

  window.BREAKTHROUGH.push({
    lv: 460, realm: '金仙', from: '真仙期',
    tip: '从真仙到金仙，靠的是打通周身三十六仙窍，再以法则之力撑住仙窍（X2C151《重水雷珠》）。' +
      '但每逢大境界，天人都要历一次「五衰」（X2C327《天人有五衰》）——躲不掉，只能扛过去。',
    items: [],
    mats: [['m_xianyuanshi', 6], ['m_xuanhuang', 3]],
    stones: 260000,
    chance: { min: 1 },
    // 金仙是仙界第一道大境界，也是他第一次历完整的五衰（原著就写在这一段：三十六仙窍亮到
    // 第三十四个时天色暗了）。给得宽松些：把握起点高、代价轻。
    wushuai: { pay: 'm_xianyuanshi', per: 3, base: 0.65, step: 0.12, canAvoid: 3, cost: 2 },
    story: [{ id: 'poxu', name: '灵寰界·破碎虚空' }],
    lines: [
      ['韩立', '（三十六仙窍，一个一个亮。亮到第三十四个，天色暗了。）'],
      ['旁白', '五衰。第一道衰来时，他听见了自己牙齿的声音。'],
      ['韩立', '（扛过去。飞升过来那一次，我都扛过来了。）'],
      ['旁白', '第二道衰落下时，海面上的水幕一寸寸碎成白沫。'],
      ['旁白', '五衰尽处，仙窍圆满。金仙二字，落在他身上。'],
      ['韩立', '（灵寰界也好，仙界也罢——从今往后，我不叫柳石。）']
    ]
  });

  // ========================= 五、仙界功法（卷一两门） =========================
  // 逆丹诀 X1C32（4 次）、小挪移空间术 X1C51（2 次）。
  window.SKILLS.push(
    { id: 'niandan', name: '逆丹诀', icon: '🔄', max: 6, minLv: 430, type: 'passive',
      effect: { dmg: 0.16, crit: 0.05 },
      desc: '逆丹诀：把丹力倒着逼回经脉。在灵寰界偷来的这一门，救过一次命' },
    { id: 'nuoyi', name: '小挪移空间术', icon: '🌀', max: 6, minLv: 440, type: 'passive',
      effect: { spd: 0.14, armor: 0.05 },
      desc: '小挪移空间术：短距挪移。打不过就跑——卷一这一路，他跑得比打得多' },
    // 大五行幻世诀（X3C642，198 次）：卷三主角功法。有时间法则之物相助，修炼速度能快上数倍。
    { id: 'dawuxing', name: '大五行幻世诀', icon: '☯', max: 6, minLv: 520, type: 'passive',
      effect: { dmg: 0.22, maxhp: 260 },
      desc: '大五行幻世诀：以五行演幻化万象。没有时间法则之物相助时，磨上千年也未必能进一层' },
    // 真言化轮经（X2C197，1218 次）：仙界最常见也最重的根本经文。
    { id: 'zhenyan', name: '真言化轮经', icon: '📿', max: 6, minLv: 540, type: 'passive',
      effect: { maxhp: 340, armor: 0.12 },
      desc: '真言化轮经：一字一句都能转成法则。修得越深，经文越难念' },
    // 天煞镇狱功（150 次）：五件时间法则具象之物融成一记五色融光之后，
    // 韩立就是凭着它与真灵血脉同转，变作三头六臂的神魔形态，一拳一爪取了奇摩子（X4C1128）。
    { id: 'tiansha', name: '天煞镇狱功', icon: '🔥', max: 6, minLv: 560, type: 'passive',
      effect: { dmg: 0.26, maxhp: 320 },
      desc: '天煞镇狱功：真灵血脉与它同时运转，人身便化作三头六臂的神魔之相' }
  );

  window.ITEMS.push(
    { id: 'sk_niandan', name: '逆丹诀·法诀', rarity: 4, icon: '📕', req: 430, teach: 'niandan',
      desc: '习得《逆丹诀》（X1C32《逆丹诀》）。冷焰宗藏经阁里偷出来的' },
    { id: 'sk_nuoyi', name: '小挪移空间术·法诀', rarity: 4, icon: '📕', req: 440, teach: 'nuoyi',
      desc: '习得《小挪移空间术》（X1C51《小挪移空间术》）。挪一步，换个地方' }
  );

  window.ITEMS.push(
    { id: 'sk_dawuxing', name: '大五行幻世诀·法诀', rarity: 5, icon: '📜', req: 520, teach: 'dawuxing',
      desc: '习得《大五行幻世诀》（X3C642《不凑热闹》，198 次）。卷三魔域之行的目标' },
    { id: 'sk_zhenyan', name: '真言化轮经·法诀', rarity: 5, icon: '📕', req: 540, teach: 'zhenyan',
      desc: '习得《真言化轮经》（X2C197《真言化轮经》，1218 次）。仙界人人都念的那部经' },
    { id: 'sk_tiansha', name: '天煞镇狱功·法诀', rarity: 5, icon: '📕', req: 560, teach: 'tiansha',
      desc: '习得《天煞镇狱功》（X4C1128《入手神灯》，150 次）。岁月殿那一拳，靠的就是它' }
  );

  // 功法出处：卷一通关给；天煞镇狱功从岁月殿（X4C1128）出来
  const GIVE = { lingyan: 'sk_niandan', tiangui: 'sk_nuoyi', suidian: 'sk_tiansha' };
  for (const mid in GIVE) {
    const m = window.MAPS.find(x => x.id === mid);
    if (!m) continue;
    m.reward = m.reward || {};
    m.reward.items = (m.reward.items || []).concat([GIVE[mid]]);
  }

  // ========================= 六、对白 =========================
  window.MAP_STORIES.linghuan = [
    ['旁白', '灰白的荒地。遍地石头，漫天黄尘。骄阳悬空，炙烤着大地。'],
    ['旁白', '一个六七岁的女童在跑。鹅黄罗衣，头上两个小髻，右手攥着一只巴掌大的拨浪鼓。'],
    ['旁白', '鼓面一转，一线青光飞出，落在草丛上。草丛动了动，射出五六条青蛇。'],
    ['旁白', '后方十余丈，尘土飞扬，一个提朴刀的虬髯大汉追了上来。'],
    ['柳乐儿', '妖孽，哪里跑！'],
    ['旁白', '草丛深处还躺着一个人，身上盖着破布，一动不动。他醒着，只是不想动。'],
    ['旁白', '带刀的人搜了一圈，只找到一地青蛇，没有再往深处看。'],
    ['柳乐儿', '（石头哥哥今天不能被找到。）'],
    ['旁白', '远处的号角响了起来。不是一个人，是一整支队伍。'],
    ['柳乐儿', '（不好。族里出事了。）'],
    ['旁白', '她回头看了一眼草丛，还是走了。破布底下的人，一直没睁眼。']
  ];

  window.MAP_STORIES.suxing = [
    ['旁白', '他醒过来的时候，头疼得像被人从后面敲过。'],
    ['韩立', '（我是谁。灵寰界。冷焰宗。都不是我的东西。）'],
    ['旁白', '记忆像碎掉的镜子，一片一片自己浮上来。'],
    ['韩立', '（我想起来了……）'],
    ['韩立', '（是了，我想起来……我……我是韩立，人族第一修士，灵界第一大乘！）'],
    ['旁白', '话一出口，他自己先愣住了。这句话，好像不是第一次在心里说。'],
    ['韩立', '（飞升过。我飞升过。可我怎么会躺在这里。）'],
    ['韩立', '（……不。先想清楚我是谁，再说旁的。）'],
    ['旁白', '屋外，拨浪鼓的声音又响起来了。一下，两下。'],
    ['柳乐儿', '石头哥哥，你醒了吗？'],
    ['韩立', '（石头哥哥。她叫我石头哥哥。）'],
    ['韩立', '（这个名字，先用着。）']
  ];

  window.MAP_STORIES.lingyan = [
    ['旁白', '灵焰山脉，通易谷。冷焰宗的藏经阁嵌在崖壁上，禁制一层套一层。'],
    ['韩立', '（逆丹诀，先天紫气。要拿，就一次拿够。）'],
    ['旁白', '瞒天过海，偷梁换柱。阁里的玉简被换成废石，等禁制被人碰过，人才发觉少了东西。'],
    ['旁白', '一团金光从崖顶压下来。是冷焰老祖的神念所化虚影。'],
    ['冷焰老祖', '这些都是本宗的秘传功法玉简，怎会都落在你手里！大胆，也敢和老夫平辈论交！'],
    ['韩立', '（一具虚影而已。撞上去，先碎的是它。）'],
    ['旁白', '金色光柱撞在无形波纹上，层层碎裂。虚空晃了晃，又平了。'],
    ['冷焰老祖', '怎……怎么可能？阁下是谪仙？'],
    ['韩立', '韩某因为一些缘故，偶然流落到这灵寰界，对于贵宗并无恶意。'],
    ['韩立', '不过我此刻有伤在身，手中又没有合适的丹药，才到贵宗拿了一些典籍，想要参详一二的。'],
    ['冷焰老祖', '流落？有伤在身？'],
    ['韩立', '（伤是真的。谪仙的身份也是真的。但有伤在身的谪仙，和一个元婴修士，价钱差得很远。）'],
    ['旁白', '这件事没有下文。冷焰宗要的只是台阶，他给的也正是台阶。'],
    ['韩立', '（得走了。这地方藏不住多久。）']
  ];
  window.MAP_STORIES.lingyan_out = [
    ['旁白', '典籍到手，他一步没停地往谷外退。白石真人的护法追了半程，撞上那道无形的界壁，闷哼着退了回去。'],
    ['韩立', '（一具虚影能撞碎，十几个真人呢？不知道。）'],
    ['旁白', '他不知道的是，那道光柱撞碎之后，冷焰老祖在祖殿里坐了整整一夜。']
  ];

  window.MAP_STORIES.xiaoping = [
    ['旁白', '袖中忽然一热。'],
    ['韩立', '（什么——）'],
    ['旁白', '他摸出来的是一只巴掌大的青瓶。瓶身墨绿灵纹，一道道亮着。'],
    ['韩立', '（掌天瓶。）'],
    ['韩立', '（它回来了。）'],
    ['旁白', '瓶口朝上，一片青光升起又落下。三滴绿色液体凝在瓶底。'],
    ['韩立', '（一路走到这里，我把最后一点东西都丢了。原来是这个。）'],
    ['韩立', '（丢了它，我连自己是谁都快忘了。）'],
    ['旁白', '他把瓶子贴额收好。这东西不能让任何人看见——在灵寰界，它比他的命值钱。'],
    ['柳乐儿', '石头哥哥，你今天捡到什么了？'],
    ['韩立', '（这丫头。）'],
    ['韩立', '（捡到一件不能告诉你的东西。）']
  ];

  window.MAP_STORIES.tiangui = [
    ['旁白', '黑雾散开一线，百目天鬼从里面走出来。每一只眼睛，都在看。'],
    ['韩立', '（不能看它的眼。看一眼，魂就散一半。）'],
    ['旁白', '玄黄之索自袖中飞出，缠上那具躯体；灵婴剑符一化为三道，钉住它的退路。'],
    ['旁白', '那东西挣了七下，第八下不动了。'],
    ['韩立', '（认主。）'],
    ['旁白', '认主之后，它缩成一只巴掌大的黑虫，落在掌心。'],
    ['旁白', '连那具大乘级的傀儡也一并收了。涅槃圣体一开，肩上的伤自己合上。'],
    ['韩立', '（伤没好，但至少不漏了。）'],
    ['旁白', '远处有人在喊：在那边！追！'],
    ['旁白', '银月那边也出了变故。消息传到一半就断了。'],
    ['韩立', '（先出去。账，留着以后算。）']
  ];
  window.MAP_STORIES.tiangui_out = [
    ['旁白', '收尾时顺手捡到的两件异宝：一件银色鳞片，一件青铜小瓶。'],
    ['旁白', '鳞片上的古文他认得——那是一句邀约。'],
    ['韩立', '（又是这玩意儿。它到底是谁的。）'],
    ['旁白', '他没时间细看。天上已经裂了。']
  ];

  window.MAP_STORIES.chulong = [
    ['旁白', '白玉峰顶，十名金仙道主分坐两侧。呼言道人与云霓站在人群里，脸色都变了。'],
    ['旁白', '一个银须男子从虚空里走了出来，身后还跟着人。'],
    ['萧晋寒', '烛龙道第一道主，百里炎。仙界的秩序，不该由你们来破。'],
    ['旁白', '百里炎被困在阵中，看着狼狈，底子却一点没伤——他只是闭关太久，出来时天庭的人已经站在峰顶。'],
    ['韩立', '（十位金仙道主，加一个天庭的。烛龙道这是内乱，被人顺手插了一脚。）'],
    ['旁白', '更远处有影卫在动，来路很杂——轮回殿的悬赏，烛龙道的人，天庭的差，最后全搅到了一座峰上。'],
    ['韩立', '（我认得这股气息。轮回殿，那伙被天庭追着跑的人。）'],
    ['旁白', '百里炎是烛龙道第一道主，修为最高，却常年闭关不管事；真正掌控宗门和资源的是那十位道主。'],
    ['萧晋寒', '今日之事，与道友无关，站远些。'],
    ['韩立', '（我站哪儿都不要紧。要紧的是——别挡我的路。）']
  ];
  window.MAP_STORIES.chulong_out = [
    ['旁白', '第一道主还在，阵还在，天庭的人还在。'],
    ['旁白', '他从峰顶退出去的时候，没有一个人多看他一眼。'],
    ['韩立', '（烛龙道欠下的账，自有人来收。我只记住谁在峰上、谁没在峰上。）'],
    ['韩立', '（灰界。该去见见那位坐客了。）']
  ];
  window.MAP_STORIES.huijie = [
    ['旁白', '灰界里没有风，也没有光。到处是石头雕像，一动不动。'],
    ['旁白', '一尊老年道士，颌下一缕山羊胡须，道袍褶皱，衣袂飘摇。'],
    ['旁白', '一尊宫装女子，身形竟比男子还高，面容不俗，只是线条硬朗，英姿勃发。'],
    ['韩立', '（换上合体甲胄，倒更衬这身段。）'],
    ['旁白', '他随手一掌，罡气把一具莹白如玉的骨架打得散架，摔在墙上。'],
    ['旁白', '越往里，雕像越静。静得能听见石头自己的声音。'],
    ['旁白', '最深处的石台上，盘膝坐着一个人。寸发不生，口鼻全无，只有双目晶莹闪动。'],
    ['噬金仙', '（你终于来了。）'],
    ['韩立', '（噬金仙。虫王一脉的那位。它在灰界里，等了多久。）'],
    ['旁白', '整座灰界一动不动。'],
    ['韩立', '（这一界没有法则之言，全靠自身悟。这才是太乙要的东西。）'],
    ['旁白', '石台上的小人站了起来，没有发出一点声音。']
  ];
  window.MAP_STORIES.dijiang = [
    ['旁白', '夜阳城的坊市不许驾车入内——这是大皇子定下的规矩，城内所有坊市全都适用。'],
    ['旁白', '帝江坊是摩诃区内八座最大的坊市之一，也是离得最近的一处。'],
    ['韩立', '（摩诃区。魔域的地界。异国他乡，先把规矩摸清。）'],
    ['旁白', '高大的石质牌楼立在坊口。往里是一条横一条纵的街，十四道岔口。'],
    ['旁白', '仙灵阁的伙计捧来一份采购目录。上头记的物件，十有八九都是时间法则之物。'],
    ['韩立', '（大五行幻世诀。若有法则之物相助，修炼速度能快上数倍。）'],
    ['旁白', '角落里一只木匣。匣中一枚眼球，瞳孔处有一圈极细的金环。'],
    ['旁白', '这眼球绝不是普通太蜚独目，其中蕴含的时间力量，是他最早得到的那颗的数倍都不止。'],
    ['韩立', '（慧眼识珠。这一枚，够用很久了。）'],
    ['旁白', '他没有再问价——问价就等于承认自己不懂。']
  ];
  window.MAP_STORIES.xingqi = [
    ['旁白', '玄斗场的号角响过三遍。厄脍城主站在高处，抬手往下压了压。'],
    ['厄脍城主', '五城会武，到此为止。'],
    ['旁白', '台下数千人一静。'],
    ['旁白', '「积鳞空境深处有一处秘境现世，秘境内珍宝无数，乃是百万年难得一遇的大机缘。厄脍城主决定停下五城会武，带领进入十六强的人一同探索此地。」'],
    ['韩立', '（百万年难得一遇。这是把刀递到我们手里，还是把刀架到脖子上。）'],
    ['旁白', '别苑偏厅里，晨阳把一枚东西推过来。'],
    ['晨阳', '此物名为星斗盾，也是一件星器。星器需要用精血长时间温养才能逐步掌握。你马上用精血祭炼，这几日好好温养一下。'],
    ['韩立', '（所谓星器，是六花夫人利用此地的星辰之力，炼制出来的一种最高级别的武器。威力极其强大，更有增幅我等实力的效果。）'],
    ['旁白', '精血滴上盾面。一道极细的星光纹路亮了起来，然后沉寂下去。'],
    ['韩立', '（刀还在鞘里，得先祭炼几天。）']
  ];
  window.MAP_STORIES.dadi = [
    ['旁白', '一脚踏进去，两耳嗡鸣乱响，无数古怪声音朝脑子里钻。五感全失，眼前漆黑。'],
    ['旁白', '等他恢复过来，身体已重重砸在一处坚硬之地，半边身子剧痛。'],
    ['旁白', '入眼的，是一片昏黄的地面。无数大大小小的黑黄碎石凌乱散落，四面八方都是一望无际的荒原。'],
    ['韩立', '（戈壁。这地方大得没有边。）'],
    ['旁白', '碎石堆里埋着白骨。有些骨头上还带着牙印，有些已经风化成了粉。'],
    ['韩立', '（埋骨之地。上一个进来的人，就埋在下面。）'],
    ['旁白', '前方地平线上立着一道血色的门。门后传来鳞片摩擦的细响。'],
    ['旁白', '守门的东西抬起头。一头鳞犼，喉间滚动，像在掂量来人的分量。'],
    ['韩立', '（这一趟不是来寻宝的。是来开路的。）']
  ];
  window.MAP_STORIES.dadi_out = [
    ['旁白', '泣血阵图的最后一笔落下，血色光幕终于合拢。'],
    ['旁白', '戈壁尽头，一座祭坛的轮廓在昏黄的天光下露出来。'],
    ['韩立', '（第二把钥匙。前面那座祭坛，是要靠它开的。）'],
    ['旁白', '天色沉下来。他抬头看了看——云是黄的，可云层深处，隐隐有灰在动。']
  ];
  // ---- X3 收尾：蟹道人的道天大劫（X3C989）——劫是别人的，他只是站在最近的边上 ----
  window.MAP_STORIES.xiedao = [
    ['旁白', '地底大殿内，随着蟹道人的身影消失，充斥整座殿内的夺目金光也随之消失无踪。'],
    ['旁白', '蟹道人此刻正双手垂于身体两侧，仰头望天，眼中透出些许激动，也带着些许期待。'],
    ['旁白', '原本明亮的天空，突然变得阴沉。原本密布的黄云也以肉眼可见速度变成了灰黑之色。'],
    ['旁白', '这股压力高如皇天，重如厚土，浩浩荡荡，无可抵挡。'],
    ['韩立', '（这是天地大劫的气息！）'],
    ['旁白', '这劫比他以前经历的任何雷劫都厉害了不知多少倍，便是方才透露出的些许征兆，便已令他无法抵御。'],
    ['旁白', '体表金色雷光闪动，他退出数百里。可千里之外，天空仍旧漆黑一片。'],
    ['旁白', '乌云剧烈翻滚着朝某处汇聚，形成一个巨大无比的漩涡，漩涡中心出现一个漆黑窟窿。'],
    ['旁白', '一股比之前庞大了不知多少倍的可怖威压从漩涡中透出，附近虚空剧烈震荡，尽数扭曲。'],
    ['韩立', '（避不开。）'],
    ['旁白', '即便此刻已经开启了近九百个玄窍，在这股巨力面前他仍旧是蝼蚁，眼前一黑，昏迷了过去。'],
    ['旁白', '昏迷之前，他眼角余光看到巨大漩涡中心飞出一片灰云，朝着蟹道人罩去。'],
    ['旁白', '同一刻，魔域夜阳城。魔主缓缓站起了身体："这是从积鳞空境那里传来的，莫非……"']
  ];

  // ---- 卷四《大罗之争》 ----
  window.MAP_STORIES.jingong = [
    ['旁白', '金源仙宫。东方白把赴援的人一一安排停当，心里还拟了几十个讨债的法子。'],
    ['旁白', '殿外的天空暗了一下。来的不是援兵。'],
    ['韩立', '东方白，你自己出来，倒是省了我的手脚！'],
    ['韩立', '你日前无故屠戮青狐一族，全族上下五万七千三百人全部罹难，罪恶滔天，今日便是你的死期！'],
    ['东方白', '（怎么会是他……金瀚仙宫的人呢？）'],
    ['旁白', '楼下站着五名容貌相似的老者，手上都戴着一枚黑玉戒指。'],
    ['韩立', '你们就是天阴五子？各自报上自己的姓名。'],
    ['阴天虎', '在下阴天虎，还望韩道友手下留情，阁下与东方宫主之事，我等其实并不知情的。'],
    ['阴天鹿', '在下阴天鹿，见过韩道友。'],
    ['阴天熊', '阴天熊。'],
    ['阴天猿', '哼！老子是阴天猿，既然技不如人，要杀要剐悉听尊便。'],
    ['旁白', '最后一人身上血光大盛，身躯骤然缩小了倍许，化为一道血影朝远处电射而去。'],
    ['旁白', '那道电弧剑芒一闪凭空出现在他身边，以比他逃遁快了数倍的速度，从其身上一划而过。'],
    ['旁白', '"砰"的一声，一团血雾炸开，什么也没剩下。'],
    ['韩立', '（跑得最快的那个，已经没了。剩下的，一个一个来。）']
  ];
  window.MAP_STORIES.jingong_out = [
    ['旁白', '五枚戒指，一枚不落。'],
    ['旁白', '宫主殿的门从里面被推开——推门的不是侍卫，是他自己。'],
    ['韩立', '东方白，受死！'],
    ['旁白', '半日之后，这座仙宫换了当家人。他走出宫门时，没人拦，也没人喊。'],
    ['韩立', '（太岁府那边有秘境现世。人多的时候，最容易藏人。）']
  ];
  window.MAP_STORIES.taisui = [
    ['旁白', '冲天异象之后，各方云集。秘境出世，宝物在前，蝇营狗苟之辈自然蜂拥而至。'],
    ['蓝颜', '哥哥，你说那韩立会在这里吗？'],
    ['蓝元子', '按照常理来说，一般人确实会想方设法躲起来。不过根据我看此人心智绝非常人。'],
    ['旁白', '灰色巨塔前，雷玉策和文仲并肩而立。'],
    ['文仲', '雷道友，你这个方法，究竟有几分把握？'],
    ['雷玉策', '就算没有九成九，六成七成还是有的。为了得到岁月神灯，哪怕只有一成机会，我也要试上一试。'],
    ['文仲', '据说岁月神灯乃是太岁仙尊花费了一生心血，炼制出的仙器。你可不要因为私情耽误了正事。'],
    ['旁白', '半日之后，巨塔前方绘刻出一黑一白两个巨大法阵，彼此协调，呈现出阴阳双鱼的情况。'],
    ['文仲', '此为盟主所设计之双生法阵，每个法阵需要五十名道友进阵催动。接下来我来遴选名单，被点到的人出列。'],
    ['旁白', '塔前约莫千余群修，闻言一阵骚动，却没有一个人敢出声，只在心里暗暗祈祷莫要点到自己。'],
    ['韩立', '（一千个人挑一百个。挑中的要进阵，挑不中的，未必就安全。）'],
    ['旁白', '名单念到一半，塔里传出了动静——不是禁制破开的声音。']
  ];
  window.MAP_STORIES.chongchao = [
    ['旁白', '身后赶来的火岁萤虫到了此处，突然尽数停下，在洞外盘旋不前，却不敢踏足洞穴半步。'],
    ['苏荌茜', '此地不宜久留，我和石道友布下的冰墙阻挡不了外面的火岁萤虫多久，快往深处去！'],
    ['旁白', '这座洞穴足有数千丈之广，一半的区域是一片赤红岩浆湖泊，不停翻滚着火红色的浆泡。'],
    ['旁白', '岩浆上方有一个红色平台，平台尽头连接着另一条通道，里面隐隐有道道暗红光芒透出。'],
    ['韩立', '（虫走到洞口就不动了。里面有什么，它比我们清楚。）'],
    ['旁白', '通道尽头立着一尊天王塑像。降魔杵已举过头顶，杵上阴煞之气凝结，尖端处凝着一团幽紫磷火。'],
    ['旁白', '一道劲风呼啸而至，巨大的降魔杵当头砸落下来。'],
    ['旁白', '他没有避让，双足一跺大地，身形直冲而上，迎着降魔杵上去。'],
    ['旁白', '他没有以力相抗，而是身形一错，双手直接环抱住那急速坠落的降魔杵，腰身骤然发力一拧。'],
    ['旁白', '看似势不可挡的降魔杵，被硬生生扭转了方向，反朝那天王塑像飞砸过去。'],
    ['韩立', '（真正的麻烦不在前面。还在更深的地方。）']
  ];
  window.MAP_STORIES.chongchao_out = [
    ['旁白', '"砰砰砰"一串闷响，天王塑像被自己的降魔杵砸得连连后退。'],
    ['旁白', '十八层的塔，从这里开始往下数。'],
    ['旁白', '走到洞口回望，虫群还在原地盘旋，一步也没敢进。'],
    ['韩立', '（神灯在前。往下。）']
  ];
  window.MAP_STORIES.suidian = [
    ['旁白', '大殿正上方悬挂着一面巨大匾额，上书"岁月殿"三个大字。'],
    ['旁白', '殿门半虚半掩，缝隙中透出耀眼金光，里面还掺杂着几股强大的气息。'],
    ['旁白', '门前广场上耸立着一柄柄土黄色石剑，剑尖向上，剑柄向下，每一柄都有百丈大小。'],
    ['旁白', '三十六柄石剑错落分布，隐隐形成一个剑阵，将岁月殿大门严严实实地堵住。'],
    ['旁白', '殿里立着一片金甲道兵，甲上的光芒正一圈一圈地变亮。'],
    ['韩立', '韩道友，这些道兵能够从祭坛借取力量，如若不设法阻隔，只会越来越麻烦。'],
    ['韩立', '我想尝试以灵域阻隔这层联系，只是单凭我的灵域恐怕不够，需要你助我一臂之力。'],
    ['旁白', '一道金色灵域骤然一收，一道暗红灵域骤然一张，两者范围几乎完全重合。'],
    ['旁白', '两种灵域重合之后，其上生出一层古怪至极的气息，光芒俱是暴涨数倍。'],
    ['旁白', '五色祭坛上，金甲道兵齐齐一滞——它们借不到力了。']
  ];
  window.MAP_STORIES.suidian_out = [
    ['旁白', '真言宝轮、光阴净瓶、幻辰沙海等时间法则具象之物尽数浮现，将那个人围在中央。'],
    ['旁白', '一根根时间法则晶丝从其中飞射而出，在虚空中相互融合，绽放出一团耀眼的五色融光。'],
    ['旁白', '五色融光中的那人神色一僵，身上的虚影一个接一个，如朽木般化作烟尘湮灭。'],
    ['旁白', '他的修为气息正在一点一滴消退，竟是从大罗境界一路跌落，变作了太乙修士。'],
    ['韩立', '老匹夫，时辰到了！'],
    ['旁白', '真灵血脉与天煞镇狱功同时运转，他变作三头六臂的神魔形象，一拳一爪同时探出。'],
    ['旁白', '五色融光彻底散尽时，殿里只剩下一盏灯。']
  ];
  window.MAP_STORIES.wubao = [
    ['旁白', '鎏金城背后没有一个庞大势力统治，由一个名叫日月盟的联盟自居，与三大势力鼎足而立。'],
    ['旁白', '九层酒楼的雅间里坐着三个人。一个黑裙少女，一个白袍少年，还有一个。'],
    ['小白', '想不到大金源仙域还有这么一个地方，既没有九元观，也没有金源仙宫的人。'],
    ['韩立', '也不要大意。谁知道九元观和金源仙宫有没有在这里安插暗眼，还是小心些好。'],
    ['旁白', '万宝节的日子里，日月阁把仙器一件一件摆上拍卖台。'],
    ['旁白', '按照日月阁的惯例，但凡拍卖攻击性仙器，都要当场试演。台边那块数十丈高的黑石就是试的。'],
    ['旁白', '"噗嗤"一声轻响，仿佛烧红的刀子斩在牛油上——黑石轻易碎裂成十几截。'],
    ['旁白', '切口呈现出腐蚀融化的趋势，还冒着青烟。台下众人倒吸一口凉气。'],
    ['旁白', '一旁的啼魂双眸泛起阵阵异彩，娇躯也一下绷紧了。'],
    ['韩立', '（她想要的东西不多，想要的时候也从不掩饰。）'],
    ['旁白', '他没有再问价——问价就等于承认自己不懂。']
  ];
  window.MAP_STORIES.jiuyuan = [
    ['韩立', '这阎罗之鼎，你是从何处得的？'],
    ['灰袍老者', '禀前辈，此鼎是晚辈在天殇仙域的一处遗迹内得到的。'],
    ['韩立', '（天殇仙域？以我对仙界诸多仙域的了解，并没有听说过这个地方。）'],
    ['灰袍老者', '那是一个小仙域，灵力稀薄，物产也少，所以罕有人知晓。'],
    ['韩立', '我在鼎身上的铭文中看到了阎罗之府这个地名，你可知道这个地方？'],
    ['旁白', '自从上次穿梭时空返回，他四处寻找关于阎罗之府的消息，可惜怎么打探都找不到。'],
    ['灰袍老者', '阎罗之府？或许是天殇仙域的某个地方吧。那里据说靠近九幽阎罗之地。'],
    ['旁白', '地下深处，一道金光雷柱迸发，在被禁锢的鬼物当中轰开一条数十丈的通道。'],
    ['旁白', '透过通道，他看清了墙上那张巨大的鬼脸——头戴古怪冠冕，前后珠玉垂帘，像凡俗帝王的顶冠。'],
    ['旁白', '血口上下各有两对尖锐犬齿。犬齿的牙缝之间，隐约可见点点金光。'],
    ['韩立', '（不对。那不是光。）'],
    ['旁白', '那是一柄柄金色小剑，上面还闪着雷光——那是他的青竹蜂云剑。'],
    ['鬼灵子', '桀桀……正等着你呢。']
  ];
  window.MAP_STORIES.jiuyuan_out = [
    ['旁白', '剑镇判官，一记绝杀。地上的鬼阵散得像被人踩过的蛛网。'],
    ['旁白', '手里多了一只鼎。鼎身上的字他一个都不认识——可这一次，他知道该去哪儿问。'],
    ['旁白', '身后追来的人比想象中快。还没出九元城，四周的灵气就变了味。']
  ];

  // ---- 卷五《大道归一》 ----
  window.MAP_STORIES.zaimiao = [
    ['旁白', '小白刚一脚踏入光门，身后一声爆鸣，银色光门未等人进来便直接关闭了。'],
    ['金童', '（怎么回事。）'],
    ['旁白', '与此同时，林间凉亭之外方圆百里的空间已经被寒冰封锁，化作一片冰雪皑皑的世界。'],
    ['旁白', '地面上早已被一层厚厚的坚冰覆盖，上面更有一根根寒冰尖锥冲天而起，直刺苍穹。'],
    ['金童', '哼！这家伙真是跟狗皮膏药一样，甩不掉了……'],
    ['韩立', '是祸躲不过，看来免不了一战了。'],
    ['旁白', '参天古木尽数冻结成冰晶，纷纷崩碎成晶粉，中间让出一条宽敞通道。'],
    ['旁白', '一道绿衫女子身影端坐在形如莲花的水晶王座上，一路前冲而至，速度快若迅雷。'],
    ['妙法仙尊', '贼子，我已经以灵域封锁了四周，这次看你还在怎么逃？'],
    ['韩立', '（逃。逃了这么多年，账一分没少。）']
  ];
  window.MAP_STORIES.zaimiao_out = [
    ['旁白', '这一仗打完，天边颜色都变了。'],
    ['旁白', '他没有追。他从来不追已经躺下去的人。'],
    ['韩立', '（接下来那件事，得回到祭坛上去做。）']
  ];
  window.MAP_STORIES.zhanshi = [
    ['旁白', '他将盘膝而坐的地仙之躯移到法阵正中央的阴鱼图中，位置稍稍与图中的阳眼错开来。'],
    ['旁白', '他自己则相对坐在阳鱼图这边，同样与阴眼错开了些许位置。'],
    ['旁白', '静坐之后，他开始平缓心境，所有气息尽数沉寂，几乎与那具地仙之躯一般无二。'],
    ['旁白', '祭坛最外层的环形符阵最先亮起一片金光，佛家真言一枚枚浮现，撑开一道半球状光幕。'],
    ['旁白', '中层回形符纹上的七八种宝物同时亮起，升起或结冰、或腾焰、或缠电的通天光柱。'],
    ['旁白', '虚光锁链从光柱上射出，一根一根刺入地仙之躯的膻中、百汇、丹田等大穴。'],
    ['旁白', '这些地方，都是恶尸改造地仙之躯的重要关隘。'],
    ['旁白', '等第三层把那具躯壳钉满锁链，最中央的阴阳双鱼符阵才亮起一层薄薄的光芒。'],
    ['韩立', '（留了这么久的东西，今天一次性用完。）'],
    ['韩立', '（再来。）']
  ];
  window.MAP_STORIES.youming = [
    ['旁白', '宫殿正门前，烟波浩渺。除了随处可见的大批鬼兵，还站着两个身形极高的魁梧鬼将。'],
    ['旁白', '一个虽有人身，却生着一颗硕大无比的狰狞牛首，手中一根镌有骷髅鬼纹的镔铁棍。'],
    ['旁白', '另一个生着一张狭长丑陋的马面，一手拎红色晶石锁链，一手握白森森的剥皮鬼爪。'],
    ['旁白', '两扇巨大的门扉紧紧闭合着，门楣之上，没有挂任何匾额。'],
    ['旁白', '地下极深处有一座方圆千丈的六角石台，正中凹陷成一个六边坑池，盛满暗红色的水液。'],
    ['旁白', '水液之上悬空漂浮着一个巨大的六角轮盘，上面刻满符纹，散发出与天地相携的古怪气息。'],
    ['旁白', '一个头戴斗笠、黑纱垂面的高大男子站在石台边缘，明明气息内敛，气势却压过六角圆盘一筹。'],
    ['旁白', '一阵脚步声从远处传来，一名黑裙女子手挽着一名蓝衣宫装女子，踏上石台。'],
    ['啼魂', '（这里就是我们要找的地方。）']
  ];
  window.MAP_STORIES.youming_out = [
    ['旁白', '那轮翻滚的暗红骄阳突然疯狂颤动起来，涨缩不停，节奏越来越快。'],
    ['旁白', '骄阳表面骤然爆发出大片白光，整个骄阳瞬间裂成两半，化为道道残光飘散。'],
    ['旁白', '从里面出来的人全身毫发无损，眼中的魂火却不再如前——他已经不打算小看这两个人了。'],
    ['旁白', '他们虽然看来都只是大罗修为，但凭借轮回大阵，竟已能和对方抗衡。'],
    ['旁白', '黑纱之下的那个人始终没有说话。他只是抬了抬斗笠，看向石台的那一边。']
  ];
  window.MAP_STORIES.leihai = [
    ['旁白', '雷夔的影像消散时，天门之中传出无尽威势，让他久久没能回过神来。'],
    ['韩立', '这眼睛……竟然是道祖遗物！'],
    ['旁白', '至今世间不曾听说过有雷电道祖存在。这头雷夔巨兽天生雷体，可肆意纵横九天神雷之中。'],
    ['旁白', '可随着它与天地雷法之契合走到尽头，最终的归宿，是被天道吞噬进去，成了天地的一部分。'],
    ['旁白', '这枚雷电之眼，便是它被吞噬之前，强行留在真仙界的最后一丝遗存。'],
    ['韩立', '（若是这巨眼里还有神念残留，早该重新修炼，东山再起了。天道吞噬之下，又怎么可能留下神念。）'],
    ['旁白', '眼中没有意志，只剩磅礴到令人发麻的纯粹雷电之力。'],
    ['旁白', '他托着那枚橘黄巨眼凝视了片刻，打了一个响指。'],
    ['旁白', '青竹蜂云剑一柄一柄沉进雷海，再浮起来的时候，剑身已经不是原来的颜色。'],
    ['旁白', '很多年之后，人们会叫它玄天剑灵。眼下它还只是剑。']
  ];
  window.MAP_STORIES.fuyao = [
    ['甘九真', '他现在给我的感觉很可怕，和以前截然不同，如渊如海也不足以形容。'],
    ['轮回殿主', '如果我没有猜错的话，他已斩去了善尸，实力比起我来，已差得不多了。'],
    ['甘九真', '当真？也就是说，这么短时间，他已从大罗境中期，突破到了后期？'],
    ['轮回殿主', '至尊法则之所以被称为至尊，便是其更接近于天道本源。'],
    ['旁白', '他掐诀一招，分布在龙渊仙域各处的青竹蜂云剑尽数飞射而回，鱼贯飞入袖中。'],
    ['旁白', '可来的人不是约好的人。她头上生着两只龙角，走近了才看清那是长出来的。'],
    ['陈如烟', '小女子名叫陈如烟，忝居水之本源道祖的位置，韩道友不必客气，叫我如烟即可。'],
    ['韩立', '（道祖。这个称呼，以前只在别人的转述里听过。）'],
    ['陈如烟', '小女子虽然抓了韩道友的道侣，不过也是奉命而为，刚刚已经送还给你了。'],
    ['韩立', '据那冯清水所说，不是已经将婉儿送去天庭了吗？怎么会在你那里？'],
    ['旁白', '她嘻嘻一笑，没有回答。'],
    ['旁白', '她也不需要回答——答案写在她敢一个人站在这里这件事上。']
  ];
  window.MAP_STORIES.shifang = [
    ['旁白', '清瘦道人一步跨出，出现在东天门外。天庭众多兵将见到此人现身，顿时心神大定。'],
    ['轮回殿主', '既然是赴鸿门宴，我一人足矣。'],
    ['旁白', '他身形才现，下方的海域就已经被一片灿烂银光笼罩了进去。'],
    ['韩立', '（空间被封禁了，雷阵之术无法离开。）'],
    ['金童', '无妨，那就打穿它。'],
    ['旁白', '东南西北四个方位同时亮起刺目银光，化作四道粗壮光柱，直奔先前从天垂落的那一道。'],
    ['旁白', '无数道银色光影折射而开，重重叠加相连，遮蔽了整片天幕。'],
    ['旁白', '方圆百万里区域，顿时化作一片绝地。'],
    ['旁白', '这场宴的名字叫十方万仙。来的这些人，也都配得上这四个字。'],
    ['旁白', '宴设在高处。那人坐在一张轮椅上，右侧站着一名生着粉嫩龙角的蓝裙少女。'],
    ['旁白', '左侧的红衣老妇与她身上很不和睦——两条大道，天然厌恶彼此。'],
    ['旁白', '还有一名肩背佝偻的清瘦老者，今日换了一件紫金道袍，那是九元观观主李元究。'],
    ['旁白', '另一边那道裹在黑袍里的人影连面容也不露，只露出一双幽深的紫色眼眸，瞳孔内似有万千星辰。'],
    ['韩立', '（七个道祖。这桌上没有一道菜是能放心吃的。）']
  ];
  window.MAP_STORIES.shifang_out = [
    ['旁白', '七股蕴含无上法则的洪流从四面八方朝古或今席卷而至。'],
    ['旁白', '他坐在轮椅上，除了面上多了一分凝重之外，并未有丝毫慌乱。'],
    ['旁白', '就在洪流即将淹没他的时候，他整个人只是略一模糊，便已现身于万里之外。'],
    ['旁白', '暗红巨掌之上，轮回殿主的身形浮现。他比之前瘦削了不少，衣袍迎风，有些空空荡荡。'],
    ['轮回殿主', '诸位，古或今已被我暂时困住，别再吝惜你们的法则了，成败在此一举！'],
    ['旁白', '这句话说完之后，天就开始不对了。']
  ];
  window.MAP_STORIES.daoyi = [
    ['韩立', '三千大道，竟然都在这掌天瓶中……'],
    ['旁白', '意念化作微尘，在小瓶世界里遨游。他发现周围的光团并非静止，而是各自以轨迹上下浮动。'],
    ['旁白', '那种各自运行的状态，便是天道轮回的纲常。'],
    ['旁白', '一番飞掠之后，他心里有些焦急起来：这大道三千，自己如何能够炼化？'],
    ['旁白', '越往中心，光团越少，其中蕴含的法则之力却越浓郁，直到最中心处是一团巨大的混沌云团。'],
    ['旁白', '四周还悬浮着金、银、暗红三团最大的光团，分别是时间，空间和轮回法则。'],
    ['旁白', '其中时间法则与他最是亲近。方一靠近，就有丝丝缕缕时间法则之力涌入神念。'],
    ['旁白', '混沌法则之中延伸出千丝万缕的隐约丝线，将三千大道连成一张巨大无比的网。'],
    ['旁白', '他与时间法则相连，成了这张网里的一份子。'],
    ['韩立', '（外面那只瓶子，有人正伸手过来。）'],
    ['韩立', '不好，他这是想要炼化掌天瓶，得马上阻止他！'],
    ['魔主', '他的混沌法则已经成事，肉身近乎不死不灭，要如何阻止？'],
    ['轮回殿主', '我还有一法可以试试，如若不成，那便无计了……'],
    ['旁白', '轮回殿主说完，脸上多了几分洒脱笑意，身形蓦地一纵，主动迎了上去。'],
    ['轮回殿主', '先前你笑我不知道祖境界的风光，今日我便窥一窥这上面的风光。']
  ];
  window.MAP_STORIES.daoyi_out = [
    ['旁白', '数十个金色漩涡骤然合而为一，化为遮天蔽日的巨大漩涡，朝着所有人罩下。'],
    ['旁白', '一股庞大无匹的时间法则笼罩了所有人，他们的身体尽数动弹不得。'],
    ['旁白', '这只是一瞬。金色漩涡泡沫般飘散而开，天空恢复清朗，碎裂的虚空也飞快恢复如初。'],
    ['旁白', '在场众人却没法把刚刚发生的一切，真当成梦幻一场。'],
    ['旁白', '那似乎就是最本源的天道。李元究等道祖看向他的眼神，已带着一种由衷的敬畏。'],
    ['韩立', '你们各自带着自己的人离开吧。']
  ];
  window.MAP_STORIES.feiyu = [
    ['旁白', '最后一团金光从他掌心射出，身上剧烈波动的金光陡然消散。'],
    ['韩立', '瓶灵前辈，多谢相助。'],
    ['旁白', '气息骤降的同时，其修为也跌落到了大罗境巅峰。'],
    ['旁白', '"砰"的一声，掌天瓶爆裂而开，化为无数墨绿光团缓缓飘散。'],
    ['旁白', '光团汇聚成人形，是一名八岁模样的绿发童子，眉清目秀，却看不出性别。'],
    ['瓶灵', '哈哈，多少年了，终于摆脱了那该死的瓶子，恢复了自由之身。'],
    ['韩立', '前辈身为掌天瓶瓶灵，之前却时常沉寂于修行，我便猜到前辈有所图。'],
    ['旁白', '灵界雷鸣大陆，雷光一闪，他的身形浮现。神识瞬间覆盖了整个灵界。'],
    ['旁白', '这里正是天南附近的无边海，当年他和紫灵从一头罗睺腹中飞出，便是来到了这里。'],
    ['旁白', '此处灵气非常匮乏，但他的神魂却异常舒坦，好像离家多年的游子终于回到了家乡。'],
    ['旁白', '彩霞山，七玄门。一座小山谷中，一个面容冷峻的黑衣少年正挥着长刀练一门刀法。'],
    ['旁白', '这个少年，正是厉飞雨。'],
    ['旁白', '掌天瓶已失，他趁着这最后的机会，返回过去，看一眼这个童年好友。'],
    ['旁白', '刀风呼啸，寒光四起，隐有风雷之声。'],
    ['旁白', '他看了很久，什么也没说，也没有上去打招呼。']
  ];

  // 道祖破境图（X5C1382《道天大劫》）——这一场才是韩立自己的，X3C989 那场是蟹道人的（见 xiedao）。
  window.MAP_STORIES.daotian = [
    ['韩立', '（这是怎么回事……莫非我即将归墟，融入这世界了吗？）'],
    ['韩立', '（没想到，这一生自踏入修仙之途伊始，谨小慎微，不敢有一丝懈怠，到头来，终究难逃这一劫……）'],
    ['韩立', '（既然如此，与那些由于各种缘故早早陨灭于修行途中的修士们相比，我不过也就是虚增了些岁月罢了……）'],
    ['韩立', '（婉儿，对不起……）'],
    ['韩立', '（如果有来世……不如为俗世一介凡人，虽无缘长生，但却可图得天伦，又何须羡仙？）'],
    ['旁白', '就在此刻，周围虚空中泛起一道道金光，正是一缕缕时间法则之力，迅疾无比地朝着他的身体汇聚而来。'],
    ['旁白', '金光化为五道金色洪流，融入他的体内。'],
    ['旁白', '这五股时间法则之力他再熟悉不过，正是他苦修多年的大五行幻世诀。'],
    ['旁白', '失去的，重新得来。他体内的时间法则之力再次飞快变得充盈，五感之能也恢复过来。'],
    ['旁白', '五股时间法则之力在他体内疯狂运转，如狂风巨浪，荡涤全身。'],
    ['旁白', '大五行幻世诀的口诀从他脑海流淌而过，对于这门功法的认知，前所未有的深刻。'],
    ['旁白', '"轰"的一声，眼前金光一片，仿佛推开某扇大门，迈入了一个全新境界。']
  ];
  window.MAP_STORIES.wumengdao = [
    ['旁白', '气泡散尽时，他已站在一片陌生的海上。海风很咸，天很低。'],
    ['旁白', '乌蒙岛。岛外水幕垂下，站着三个人——陆坤老祖、鹄骨夫人、寒丘。'],
    ['鹄骨夫人', '道友既有此等实力，按照黑风海域规矩，我们愿意承认阁下对乌蒙岛的控制权。'],
    ['寒丘', '今日之争斗也算是一场误会，再继续下去对谁都没好处。'],
    ['韩立', '（柳石。这是这具身体的名字。）'],
    ['韩立', '（原来灵寰界叫灵寰界，这边叫黑风海域。）'],
    ['寒丘', '道友年纪轻轻就修炼到如此境界，日后大有希望能突破金仙境界，对法则之力也需要多加了解才行。'],
    ['韩立', '（法则之力。三位道友倒是提醒了我。）'],
    ['旁白', '三人一拱手，退回岛上。他没有追。'],
    ['韩立', '（承认了身份，反而松了口气——从今往后，不用再躲了。）'],
    ['旁白', '三十六仙窍，一个一个亮起来。亮到第三十四个时，天色暗了。'],
    ['旁白', '五衰。来了。']
  ];
  window.MAP_STORIES.wumengdao_out = [
    ['旁白', '五衰尽处，海面重新平静。'],
    ['韩立', '（金仙。）'],
    ['旁白', '他站在乌蒙岛上，脚下是别人的岛，头顶是自己的天。'],
    ['韩立', '（接下来该去见见那些人了。轮回殿、天庭、烛龙道……名字我都听过。）']
  ];

  window.MAP_STORIES.poxu = [
    ['旁白', '北斗异象。天空裂开一道缝，缝里不是星，是一层薄薄的膜。'],
    ['韩立', '（界壁在收。这方世界留不住了。）'],
    ['旁白', '灵寰界的修士们疯了一样往裂缝里冲。冲进去的，没一个回来。'],
    ['韩立', '（他们不知道膜的另一头是什么。我也不知道。）'],
    ['旁白', '他把最后一点力气压进那一击。虚空碎开，碎片像倒流的雨。'],
    ['旁白', '破碎虚空。'],
    ['旁白', '一个气泡从虚空里浮出来，裹住一个人，慢慢往上。'],
    ['韩立', '（总有一天，我会回来把这条路走完。）'],
    ['旁白', '气泡里，韩立闭上眼。'],
    ['旁白', '他还不知道，外面等着他的是另一片海，和一整个叫「仙界」的地方。']
  ];

  // ========================= 七、场景底色 =========================
  window.MAP_SCENERY.linghuan = { bg: { base: '#3a3a2c', a: '#454536', b: '#2b2b20' }, decor: [['rock', 0.30], ['tuft', 0.16]] };
  window.MAP_SCENERY.suxing   = { bg: { base: '#2f2c26', a: '#3a362e', b: '#232019' }, decor: [['rock', 0.14], ['tuft', 0.08]] };
  window.MAP_SCENERY.lingyan  = { bg: { base: '#3a2a24', a: '#45332c', b: '#2b1f1a' }, decor: [['rock', 0.28], ['tuft', 0.05]] };
  window.MAP_SCENERY.xiaoping = { bg: { base: '#26303a', a: '#2f3a46', b: '#1b2229' }, decor: [['rock', 0.10], ['tuft', 0.06]] };
  window.MAP_SCENERY.tiangui  = { bg: { base: '#221d28', a: '#2b2532', b: '#17131c' }, decor: [['rock', 0.24], ['tuft', 0.04]] };
  window.MAP_SCENERY.poxu     = { bg: { base: '#1c2430', a: '#242e3c', b: '#131a23' }, decor: [['rock', 0.08], ['tuft', 0.02]] };
  window.MAP_SCENERY.wumengdao= { bg: { base: '#1f2c38', a: '#283744', b: '#161f28' }, decor: [['rock', 0.12], ['tuft', 0.04]] };
  window.MAP_SCENERY.chulong  = { bg: { base: '#2a3040', a: '#343b4d', b: '#1d222e' }, decor: [['rock', 0.16], ['tuft', 0.06]] };
  window.MAP_SCENERY.huijie   = { bg: { base: '#2e2f2c', a: '#383935', b: '#20211f' }, decor: [['rock', 0.24], ['tuft', 0.02]] };
  window.MAP_SCENERY.taiyi    = { bg: { base: '#3a2020', a: '#452727', b: '#2a1616' }, decor: [['rock', 0.20], ['tuft', 0.02]] };
  window.MAP_SCENERY.dijiang  = { bg: { base: '#39323f', a: '#443c4b', b: '#28222d' }, decor: [['rock', 0.10], ['tuft', 0.08]] };
  window.MAP_SCENERY.xingqi   = { bg: { base: '#2b3340', a: '#353e4d', b: '#1e242e' }, decor: [['rock', 0.14], ['tuft', 0.06]] };
  window.MAP_SCENERY.dadi     = { bg: { base: '#3f3527', a: '#4b4030', b: '#2c251b' }, decor: [['rock', 0.30], ['tuft', 0.03]] };
  window.MAP_SCENERY.daotian  = { bg: { base: '#2a2a30', a: '#33333a', b: '#1d1d21' }, decor: [['rock', 0.18], ['tuft', 0.03]] };
  // 卷三收尾 / 卷四 / 卷五
  window.MAP_SCENERY.xiedao   = { bg: { base: '#2b2b33', a: '#34343e', b: '#1e1e24' }, decor: [['rock', 0.26], ['tuft', 0.02]] };
  window.MAP_SCENERY.jingong  = { bg: { base: '#3a2f2a', a: '#453a33', b: '#291f1c' }, decor: [['rock', 0.14], ['tuft', 0.03]] };
  window.MAP_SCENERY.taisui   = { bg: { base: '#33322b', a: '#3d3c33', b: '#23221d' }, decor: [['rock', 0.20], ['tuft', 0.04]] };
  window.MAP_SCENERY.chongchao= { bg: { base: '#3a2320', a: '#472b27', b: '#281614' }, decor: [['rock', 0.30], ['tuft', 0.02]] };
  window.MAP_SCENERY.suidian  = { bg: { base: '#3b3524', a: '#474028', b: '#2a2518' }, decor: [['rock', 0.22], ['tuft', 0.02]] };
  window.MAP_SCENERY.daluo    = { bg: { base: '#25323a', a: '#2e3d47', b: '#192328' }, decor: [['rock', 0.10], ['tuft', 0.14]] };
  window.MAP_SCENERY.wubao    = { bg: { base: '#3a3040', a: '#463a4d', b: '#28212d' }, decor: [['rock', 0.08], ['tuft', 0.08]] };
  window.MAP_SCENERY.jiuyuan  = { bg: { base: '#22262e', a: '#2b303a', b: '#171a20' }, decor: [['rock', 0.24], ['tuft', 0.02]] };
  window.MAP_SCENERY.zaimiao  = { bg: { base: '#26333a', a: '#2f3e47', b: '#1a2329' }, decor: [['rock', 0.12], ['tuft', 0.10]] };
  window.MAP_SCENERY.zhanshi  = { bg: { base: '#2b2b30', a: '#34343a', b: '#1d1d21' }, decor: [['rock', 0.16], ['tuft', 0.03]] };
  window.MAP_SCENERY.youming  = { bg: { base: '#1f2626', a: '#272f2f', b: '#151a1a' }, decor: [['rock', 0.28], ['tuft', 0.02]] };
  window.MAP_SCENERY.leihai   = { bg: { base: '#232a3a', a: '#2b3448', b: '#181d28' }, decor: [['rock', 0.10], ['tuft', 0.02]] };
  window.MAP_SCENERY.fuyao    = { bg: { base: '#2d2f3a', a: '#373947', b: '#1f2129' }, decor: [['rock', 0.14], ['tuft', 0.06]] };
  window.MAP_SCENERY.shifang  = { bg: { base: '#3c3430', a: '#483f3a', b: '#2a2421' }, decor: [['rock', 0.12], ['tuft', 0.04]] };
  window.MAP_SCENERY.daoyi    = { bg: { base: '#2d2a34', a: '#373340', b: '#1f1d24' }, decor: [['rock', 0.18], ['tuft', 0.02]] };
  window.MAP_SCENERY.feiyu    = { bg: { base: '#27333b', a: '#313f49', b: '#1a232a' }, decor: [['rock', 0.10], ['tuft', 0.12]] };

  // 底色套到图上
  for (const id of ['linghuan', 'suxing', 'lingyan', 'xiaoping', 'tiangui', 'poxu', 'wumengdao', 'chulong', 'huijie', 'taiyi', 'dijiang', 'xingqi', 'dadi', 'daotian',
    'xiedao', 'jingong', 'taisui', 'chongchao', 'suidian', 'daluo', 'wubao', 'jiuyuan', 'zaimiao', 'zhanshi', 'youming', 'leihai', 'fuyao', 'shifang', 'daoyi', 'feiyu']) {
    const m = window.MAPS.find(x => x.id === id);
    const sc = window.MAP_SCENERY[id];
    if (m && sc) { m.bg = sc.bg; m.decorScheme = sc.decor; }
  }

  // 前传终点接上仙界篇：飞升仙界之后不是结束，是跌落
  const xj = window.MAPS.find(x => x.id === 'xianjie');
  if (xj) {
    xj.next = 'linghuan';
    xj.clearTitle = '飞升';
    xj.clearDesc = '门开了。他一脚迈过去，脚下不是仙界——是灵寰界的一片荒地。他连自己是谁，都还没记起来。';
  }

  // ========================= 七(2)、仙界坊市「帝江坊」货架 =========================
  // 后传的坊市与前传不同：这里卖的是「法则之物」与魔族特有的灵材丹药，
  // 计价用仙元石（X2C138，627 次）。
  // 天东商号是前传的（安远城），后传 0 次——这里的商号叫仙灵阁（X3C829）。
  const DJ_SHOP = ['m_xianyuanshi', 'm_shijian', 'm_xuanhuang', 'jipin', 'huiqi', 'qiannian', 'sk_dawuxing', 'sk_zhenyan'];
  // 地图上的 shop 列表与货架常量必须一致（地图那处是硬编码的同一份内容）
  const DJ_PRICE = {
    m_xianyuanshi: 80000, m_shijian: 260000, m_xuanhuang: 90000,
    jipin: 120000, huiqi: 26000, qiannian: 95000, sk_dawuxing: 380000, sk_zhenyan: 420000
  };
  const DJ_CAT = {
    m_xianyuanshi: 'cai', m_shijian: 'cai', m_xuanhuang: 'cai',
    jipin: 'dan', huiqi: 'dan', qiannian: 'fu', sk_dawuxing: 'skill', sk_zhenyan: 'skill'
  };
  for (const id of DJ_SHOP) {
    if (window.SHOP_STOCK.some(s => s.id === id)) continue;   // 已被别处上架的不重复挂
    window.SHOP_STOCK.push({ id: id, price: DJ_PRICE[id], cat: DJ_CAT[id] });
  }

  // ========================= 七(3)、鎏金城万宝节（X4C1200）货架 =========================
  // 第二处仙界坊市：万宝节由日月阁（20 次）主持，一个月里什么东西都能摆上台。
  // 天煞镇狱功（150 次）的法诀在这里有价——岁月殿那一役之后懂得这门功法的人，比想象中多。
  const WB_SHOP = ['m_xianyuanshi', 'm_shijian', 'm_xuanhuang', 'jipin', 'huiqi', 'qiannian', 'sk_tiansha', 'sk_zhenyan'];
  const WB_PRICE = {
    m_xianyuanshi: 80000, m_shijian: 260000, m_xuanhuang: 90000,
    jipin: 120000, huiqi: 26000, qiannian: 95000, sk_tiansha: 460000, sk_zhenyan: 420000
  };
  const WB_CAT = {
    m_xianyuanshi: 'cai', m_shijian: 'cai', m_xuanhuang: 'cai',
    jipin: 'dan', huiqi: 'dan', qiannian: 'fu', sk_tiansha: 'skill', sk_zhenyan: 'skill'
  };
  for (const id of WB_SHOP) {
    if (window.SHOP_STOCK.some(s => s.id === id)) continue;
    window.SHOP_STOCK.push({ id: id, price: WB_PRICE[id], cat: WB_CAT[id] });
  }

  // 仙界篇物品是后加的，索引要重建一次
  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  // 新图计入主线数
  window.MAIN_MAP_COUNT = window.MAPS.filter(m => !m.side).length;

})();
