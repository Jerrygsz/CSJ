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
    { id: 'm_xuanhuang', name: '玄黄之气', icon: '🌀', rarity: 4, desc: '玄黄法则凝出的一缕气机（X1C65《玄黄之索》，5 次）。' }
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
      effect: { spd: 0.14, regen: 0.6 } }
  );

  // ========================= 二、仙界篇敌人（灵寰界档） =========================
  // 卷一韩立带伤藏拙，打的都是灵寰界本土的东西：化神级宗门弟子、妖修、一只天鬼。
  Object.assign(window.ENEMY_TYPES, {
    lh_xiongshou: { name: '灵寰凶兽', hp: 9000, spd: 46, dmg: 120, r: 15, xp: 40, spr: 'wolf', drop: 0.10, tier: 0, mats: ['m_xianyuanshi'] },
    lh_hanbing:   { name: '冷焰宗弟子', hp: 13000, spd: 54, dmg: 155, r: 15, xp: 55, spr: 'fashi', drop: 0.12, tier: 0, mats: ['m_xianyuanshi'] },
    lh_lingzhu:   { name: '灵寰灵族', hp: 17000, spd: 60, dmg: 185, r: 16, xp: 70, spr: 'yaoshou2', drop: 0.12, tier: 0, mats: ['m_xianyuanshi', 'm_xuanhuang'] },
    lh_baishi:    { name: '白石真人', hp: 62000, spd: 68, dmg: 230, r: 23, xp: 300, spr: 'hermit', drop: 0.5, tier: 2, mats: ['m_xianyuanshi', 'm_xuanhuang'] },
    lh_tiangui:   { name: '百目天鬼', hp: 88000, spd: 74, dmg: 268, r: 25, xp: 420, spr: 'guixiu', drop: 0.6, tier: 2, mats: ['m_xianyuanshi', 'm_xuanhuang'] }
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
      // 金仙破境图（后传 X2C93–C100）：乌蒙岛，承认身份 + 三十六仙窍 + 天人有五衰。
      // 原著里韩立是在乌蒙岛外被三人围住、对方按黑风海域规矩「承认他对乌蒙岛的控制权」，
      // 他才借这个台阶不再藏；随后三十六仙窍点亮的第三十四个，天色暗了——五衰来了。
      id: 'wumengdao', name: '乌蒙岛·承认身份', pos: '仙界·黑风海域 乌蒙岛', arc: 'M',
      type: 'story', tag: '破境',
      desc: '气泡散尽时，他已站在一片陌生的海上。岛外站着三个人，等他给一个说法。',
      startLevel: 420, endLevel: 460, startSkills: { sword: 6, fire: 6, orb: 6, nova: 6, frost: 6 },
      unlock: 'poxu', next: null,
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
    { lv: 460, name: '金仙', hp: 72000, dmg: 3.00, atk: 1.60, spd: 0.22, skill: 'nova', note: '仙界第一层，三十六仙窍' }
  );

  window.BREAKTHROUGH.push({
    lv: 460, realm: '金仙', from: '真仙期',
    tip: '从真仙到金仙，靠的是打通周身三十六仙窍，再以法则之力撑住仙窍（X2C151《重水雷珠》）。' +
      '但每逢大境界，天人都要历一次「五衰」（X2C327《天人有五衰》）——躲不掉，只能扛过去。',
    items: [],
    mats: [['m_xianyuanshi', 6], ['m_xuanhuang', 3]],
    stones: 260000,
    chance: { min: 1 },
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
      desc: '小挪移空间术：短距挪移。打不过就跑——卷一这一路，他跑得比打得多' }
  );

  window.ITEMS.push(
    { id: 'sk_niandan', name: '逆丹诀·法诀', rarity: 4, icon: '📕', req: 430, teach: 'niandan',
      desc: '习得《逆丹诀》（X1C32《逆丹诀》）。冷焰宗藏经阁里偷出来的' },
    { id: 'sk_nuoyi', name: '小挪移空间术·法诀', rarity: 4, icon: '📕', req: 440, teach: 'nuoyi',
      desc: '习得《小挪移空间术》（X1C51《小挪移空间术》）。挪一步，换个地方' }
  );

  // 功法出处：卷一通关给
  const GIVE = { lingyan: 'sk_niandan', tiangui: 'sk_nuoyi' };
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

  // 底色套到图上（合底色名单在后）
  for (const id of ['linghuan', 'suxing', 'lingyan', 'xiaoping', 'tiangui', 'poxu', 'wumengdao']) {
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

  // 仙界篇物品是后加的，索引要重建一次
  window.ALL_ITEMS = window.ITEMS.concat(window.MATERIALS);

  // 新图计入主线数
  window.MAIN_MAP_COUNT = window.MAPS.filter(m => !m.side).length;

})();
