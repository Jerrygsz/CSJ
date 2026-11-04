// 凡人长生劫 · 敌人功法总表（依《凡人修仙传》原著设定整理）
//
// 三道：
//   1. TRASH_ARTS   小怪 48 种：每种一门「手法」+ 形体签名。绝大多数只在贴身命中时
//                   显形（爪痕 / 剑光 / 毒雾 / 阴气…），少数本就该远程的才带一招。
//   2. ELITE_KITS   精英：按「族」12 套（尸道 / 剑修 / 傀儡 / 鬼道 / 妖兽 / 魔修 /
//                   血道 / 寒 / 灵族 / 虫 / 法士 / 护卫），每族 2~3 招，走 Boss 同一套
//                   招式引擎（有前摇、有预警圈、头顶报招名）。
//      ELITE_NAMED  原著里出过场、值得单独写的精英，按名精确覆盖。
//   3. BOSS_KIT_MORE  Boss 专属表补充（js/bosskit.js 里那 32 张之外，缺表的按原著补）
//
// 口径：
//   · 招名一律取原著语汇（「尸气」「血煞」「金光罩」「元磁神光」），不生造。
//   · 原著没写过具体战况的，只给「族」共用的招，不假装它有独门绝学。
//   · 小怪的远程招 k 只在 0.30~0.38，且 cd ≥ 5.5s —— 加的是「有招式」，不是「更难」。
//     整体威胁仍由 BALANCE.THREAT 总闸控制。
//
// 形体 f：claw 爪痕 / blade 剑光 / fang 毒牙 / mist 毒雾 / ghost 阴气 /
//         stone 岩力 / puppet 机关 / blood 血光 / frost 寒霜 / wind 妖风 /
//         bone 骨刺 / beam 灵光

(function () {
  'use strict';

  // ============ 一、小怪 ============
  // n 招名 / f 形体 / c 主色 / t 触发（touch 贴身 · charge 冲撞 · dash 突进 · cast 远程） / k 伤害系数 / cd
  window.TRASH_ARTS = {
    // ---- 七玄门周边（凡俗与野兽）----
    wolf:      { n: '妖狼裂爪',   f: 'claw',  c: '#e3d6c0' },
    snake:     { n: '毒牙噬',     f: 'fang',  c: '#8ed06a' },
    bat:       { n: '扑翼吸血',   f: 'claw',  c: '#b9a7c9' },
    boar:      { n: '蛮兽冲撞',   f: 'stone', c: '#b08a5a', t: 'charge' },
    bandit:    { n: '凡俗刀法',   f: 'blade', c: '#cfc3ad' },
    assassin:  { n: '淬毒匕首',   f: 'blade', c: '#9ad3a8', t: 'dash' },
    ghoul:     { n: '尸爪裂魂',   f: 'claw',  c: '#93a08c' },
    disciple:  { n: '七玄门拳脚', f: 'stone', c: '#d8c49a' },
    shigui:    { n: '岩拳砸地',   f: 'stone', c: '#9aa0a6' },

    // ---- 鬼灵门 / 魔道 ----
    guiling:   { n: '阴煞掌',     f: 'ghost', c: '#a88adf', t: 'dash' },
    moxiu:     { n: '魔道飞剑',   f: 'blade', c: '#7fb2e8' },
    guixiu:    { n: '阴气侵体',   f: 'ghost', c: '#9c8fd0' },
    guiwu:     { n: '阴风噬体',   f: 'wind',  c: '#8f8fc4' },
    moxiu2:    { n: '魔焰焚身',   f: 'mist',  c: '#c26ad0' },
    gui2:      { n: '魔气侵蚀',   f: 'mist',  c: '#8a6ac0' },
    kui:       { n: '机关铁臂',   f: 'puppet', c: '#b9a67f' },
    kui2:      { n: '灵光炮',     f: 'beam',  c: '#a8c8d8', t: 'cast', k: 0.34, cd: 6.0 },

    // ---- 妖兽 / 海兽 ----
    haishou:   { n: '潮涌扑击',   f: 'wind',  c: '#6fb7c8' },
    yuyao:     { n: '婴鲤吐珠',   f: 'beam',  c: '#7fd6d0', t: 'cast', k: 0.33, cd: 5.8 },
    dujiao:    { n: '蛟毒喷吐',   f: 'mist',  c: '#86c95a', t: 'cast', k: 0.36, cd: 6.2 },
    yaoshou2:  { n: '妖爪裂骨',   f: 'claw',  c: '#d3b48c' },
    yaoxiu:    { n: '化形妖术',   f: 'claw',  c: '#b6d08a' },

    // ---- 尸道 ----
    shixiao:   { n: '尸爪噬血',   f: 'claw',  c: '#b4767a', t: 'dash' },

    // ---- 修士 / 法士 ----
    fashi:     { n: '慕兰咒印',   f: 'ghost', c: '#7fc4a8' },
    dajinxiu:  { n: '散修飞剑',   f: 'blade', c: '#9fd0e8' },
    zhengdao:  { n: '御剑斩',     f: 'blade', c: '#bfe0f0' },

    // ---- 仙界 ----
    xj_lunhui: { n: '轮回牵引',   f: 'ghost', c: '#9f86e0', t: 'cast', k: 0.32, cd: 6.5 },
    xj_tianwei:{ n: '天庭敕令',   f: 'beam',  c: '#e8cf7a', t: 'cast', k: 0.35, cd: 6.0 },
    xj_daozhu: { n: '烛龙焚天',   f: 'mist',  c: '#e08a5a', t: 'cast', k: 0.34, cd: 6.4 },
    xj_shimei: { n: '尸魅摄魂',   f: 'ghost', c: '#b07ac0' },
    xj_xuechi: { n: '血池血箭',   f: 'blood', c: '#d0555f', t: 'cast', k: 0.33, cd: 5.5 },
    xj_linv:   { n: '鳞甲冲撞',   f: 'stone', c: '#8fb0b8', t: 'charge' },
    xj_yizhou: { n: '灰界灵光',   f: 'beam',  c: '#9aa8c0', t: 'cast', k: 0.32, cd: 6.2 },

    // ---- 灵寰 ----
    lh_xiongshou:{ n: '凶兽扑杀', f: 'claw',  c: '#c08a72' },
    lh_hanbing:{ n: '冷焰咒',     f: 'frost', c: '#8fd8ff', t: 'cast', k: 0.33, cd: 5.8 },
    lh_lingzhu:{ n: '灵族术法',   f: 'ghost', c: '#8fe0c0' },
    lh_baishi: { n: '白石剑诀',   f: 'blade', c: '#dfe8f0', t: 'cast', k: 0.36, cd: 6.0 },
    lh_tiangui:{ n: '百目鬼光',   f: 'beam',  c: '#c07ae0', t: 'cast', k: 0.35, cd: 5.6 },

    // ---- 九元观 / 天庭 ----
    x4_yingwei:{ n: '九元观剑卫', f: 'blade', c: '#a8c8e8' },
    x4_tianyin:{ n: '金仙灵光',   f: 'beam',  c: '#e8d08a', t: 'cast', k: 0.34, cd: 6.0 },
    x4_huosui: { n: '火岁萤火',   f: 'mist',  c: '#e8a05a', t: 'cast', k: 0.32, cd: 5.6 },
    x4_daobing:{ n: '金甲枪刺',   f: 'blade', c: '#d8c88a' },

    // ---- 鬼道 ----
    x5_guiwu:  { n: '幽都鬼爪',   f: 'ghost', c: '#9a8ad0' },
    x5_guibing:{ n: '鬼兵阴刃',   f: 'blade', c: '#8a9ac8' },
    x5_huanghun:{ n: '荒魂夺魄', f: 'ghost', c: '#b08ad8', t: 'cast', k: 0.33, cd: 6.0 },

    // ---- 九幽 / 骸骨 ----
    yj_guhai:  { n: '骸骨骨刺',   f: 'bone',  c: '#d8d0bc' },
    jy_younu:  { n: '幽奴噬魂',   f: 'ghost', c: '#8f7ac0' },
    jy_xiushi:{ n: '九幽阴火',   f: 'mist',  c: '#8a6ac0', t: 'cast', k: 0.34, cd: 6.0 }
  };

  // ============ 二、精英：按族 ============
  // 走 Boss 同一套招式引擎：cd 冷却 / tele 前摇 / k 伤害系数（相对精英自身 dmg）
  // 精英只给 2~3 招、cd 比 Boss 长一档，保证「有名有姓的一招」，不是连打。
  window.ELITE_KITS = {
    beast: { tag: '妖兽', skills: [
      { n: '妖爪横扫', fx: 'fan', cd: 4.2, tele: 0.46, num: 3, spread: 0.26, spd: 260, k: 0.46 },
      { n: '扑咬突进', fx: 'dash', cd: 7.6, tele: 0.6, dist: 3.8 }
    ] },
    sword: { tag: '剑修', skills: [
      { n: '飞剑斩', fx: 'fan', cd: 3.8, tele: 0.4, num: 4, spread: 0.18, spd: 300, k: 0.44 },
      { n: '一剑贯刺', fx: 'beam', cd: 8.2, tele: 0.62, spd: 720, r: 9, k: 0.72 }
    ] },
    corpse: { tag: '尸道', skills: [
      { n: '尸爪裂空', fx: 'fan', cd: 3.4, tele: 0.38, num: 4, spread: 0.24, spd: 240, k: 0.44 },
      { n: '尸气弥漫', fx: 'mist', cd: 8.0, tele: 0.55, num: 8, spd: 44, r: 16, k: 0.28, dur: 2.4 }
    ] },
    puppet: { tag: '傀儡', skills: [
      { n: '灵光炮', fx: 'beam', cd: 4.6, tele: 0.55, spd: 640, r: 10, k: 0.6 },
      { n: '铁臂镇压', fx: 'trap', cd: 9.0, tele: 0.8, dur: 0.5, k: 0.68 }
    ] },
    ghost: { tag: '鬼道', skills: [
      { n: '阴气缠身', fx: 'chill', cd: 5.0, tele: 0.55, dur: 1.2, slow: 0.4, k: 0.42 },
      { n: '鬼爪攒射', fx: 'fan', cd: 3.6, tele: 0.36, num: 5, spread: 0.22, spd: 230, k: 0.42 }
    ] },
    fiend: { tag: '魔修', skills: [
      { n: '魔焰攒射', fx: 'fan', cd: 3.5, tele: 0.36, num: 4, spread: 0.2, spd: 260, k: 0.46 },
      { n: '魔气压顶', fx: 'trap', cd: 9.5, tele: 0.82, dur: 0.6, k: 0.72 }
    ] },
    blood: { tag: '血道', skills: [
      { n: '血箭连发', fx: 'fan', cd: 3.6, tele: 0.34, num: 5, spread: 0.2, spd: 270, k: 0.44 },
      { n: '血环荡开', fx: 'ring', cd: 6.4, tele: 0.46, num: 12, spd: 190, k: 0.32 }
    ] },
    frost: { tag: '寒', skills: [
      { n: '冷焰蚀体', fx: 'chill', cd: 5.4, tele: 0.56, dur: 1.4, slow: 0.45, k: 0.44 },
      { n: '寒芒爆射', fx: 'ring', cd: 6.0, tele: 0.44, num: 10, spd: 200, k: 0.32 }
    ] },
    spirit: { tag: '灵族', skills: [
      { n: '灵光冲霄', fx: 'beam', cd: 5.2, tele: 0.5, spd: 700, r: 10, k: 0.62 },
      { n: '灵压荡开', fx: 'ring', cd: 7.2, tele: 0.48, num: 12, spd: 185, k: 0.34 }
    ] },
    bug: { tag: '虫', skills: [
      { n: '虫群攒射', fx: 'fan', cd: 2.8, tele: 0.3, num: 5, spread: 0.3, spd: 220, k: 0.36 },
      { n: '虫海漫涌', fx: 'ring', cd: 6.0, tele: 0.44, num: 12, spd: 170, k: 0.28 }
    ] },
    daoist: { tag: '法士', skills: [
      { n: '咒术攒射', fx: 'fan', cd: 3.6, tele: 0.38, num: 4, spread: 0.2, spd: 255, k: 0.46 },
      { n: '符箓定身', fx: 'trap', cd: 10, tele: 0.85, dur: 0.55, k: 0.66 }
    ] },
    guard: { tag: '护卫', skills: [
      { n: '护道一击', fx: 'fan', cd: 3.2, tele: 0.36, num: 3, spread: 0.18, spd: 280, k: 0.5 },
      { n: '擒拿压制', fx: 'pull', cd: 9.0, tele: 0.7, dist: 70, k: 0.62 }
    ] }
  };

  // 族匹配规则：按名字关键词，先具体后泛。
  // 顺序即优先级 —— 上面一条命中就不再往下看，所以「尸魅」不会掉进「魅→鬼」之外的坑。
  window.ELITE_FAMILY_RULES = [
    [/尸|魈|骸|腐|枯/, 'corpse'],
    [/剑修|剑卫|剑诀|剑/, 'sword'],
    [/傀儡|傀|机关|铁|甲兽|甲士/, 'puppet'],
    [/血侍|血尸|血魔|血卫|血门|阵眼|血箭/, 'blood'],
    [/尸魅|鬼|魂|阴|冥|幽|魅/, 'ghost'],
    [/妖|兽|狼|蟒|蛇|蛛|蟾|蛟|犼|鲤|鹏|猿|龙|夜叉|魁/, 'beast'],
    [/冷焰|寒|冰|霜/, 'frost'],
    [/法士|真人|道士|散修|弟子|修士|长老|执事|护法|元婴|大乘|门人|门徒|祭师/, 'daoist'],
    [/卫|护卫|守卫|侍卫|随从|亲卫|供奉|死士|子弟|刺客|追兵|随侍|座下/, 'guard'],
    [/魔|分身|圣祖|混沌|六道/, 'fiend'],
    [/灵|仙|道兵|化身|劫雷|凝形|炎|火|残影/, 'spirit'],
    [/虫|螟|萤/, 'bug']
  ];

  // ============ 三、精英：按名（原著出过场、值得单独写的） ============
  window.ELITE_NAMED = {
    // 后山狼群的头狼：原著后山狼群一拥而上，狼王负责嚎叫聚群
    '头狼': { tag: '后山狼王', skills: [
      { n: '妖爪横扫', fx: 'fan', cd: 4.0, tele: 0.44, num: 3, spread: 0.24, spd: 265, k: 0.46 },
      { n: '嚎叫聚狼', fx: 'summon', cd: 12, tele: 0.75, type: 'wolf', num: 2, cap: 5 }
    ] },
    // 马贼头目：凡俗刀客，只有刀，没有法术 —— 不给它配飞剑
    '马贼头目': { tag: '凡俗马贼', skills: [
      { n: '劈山刀势', fx: 'fan', cd: 4.4, tele: 0.48, num: 2, spread: 0.3, spd: 300, k: 0.5 },
      { n: '悍勇扑击', fx: 'dash', cd: 8.0, tele: 0.62, dist: 3.6 }
    ] },
    // 张铁被墨大夫炼成血尸 —— 原著这一笔很重，单独给一张表
    '血尸·张铁': { tag: '药庐 · 血尸', skills: [
      { n: '血尸扑噬', fx: 'dash', cd: 6.0, tele: 0.5, dist: 4.2 },
      { n: '污血喷溅', fx: 'fan', cd: 3.6, tele: 0.36, num: 4, spread: 0.26, spd: 240, k: 0.46 }
    ] },
    '炼尸·铁奴': { tag: '药庐 · 炼尸', skills: [
      { n: '铁臂镇压', fx: 'trap', cd: 8.6, tele: 0.8, dur: 0.5, k: 0.72 },
      { n: '尸气弥漫', fx: 'mist', cd: 7.4, tele: 0.54, num: 8, spd: 44, r: 16, k: 0.28, dur: 2.4 }
    ] },
    // 金光上人：原著筑基修士，金光罩护体，出手是金光与金砖
    '金光上人的护法': { tag: '金光上人座下', skills: [
      { n: '金光罩体', fx: 'heal', cd: 14, tele: 0.7, pct: 0.03 },
      { n: '金砖砸落', fx: 'rain', cd: 8.4, tele: 0.62, num: 3, rad: 90, r: 11, k: 0.66 }
    ] },
    // 巨蟒 / 妖蟒：原著蟒类就是缠、咬、毒
    '巨蟒': { tag: '蟒', skills: [
      { n: '蟒口吞噬', fx: 'dash', cd: 7.0, tele: 0.6, dist: 4.4 },
      { n: '毒牙喷洒', fx: 'fan', cd: 4.0, tele: 0.4, num: 4, spread: 0.24, spd: 235, k: 0.44 }
    ] },
    '妖蟒': { tag: '蟒', skills: [
      { n: '蟒尾横扫', fx: 'ring', cd: 6.2, tele: 0.46, num: 11, spd: 195, k: 0.34 },
      { n: '毒牙喷洒', fx: 'fan', cd: 4.0, tele: 0.4, num: 4, spread: 0.24, spd: 235, k: 0.44 }
    ] },
    // 石甲兽：一身石甲，硬碰硬
    '矿洞石甲兽': { tag: '石甲兽', skills: [
      { n: '石甲冲撞', fx: 'dash', cd: 7.2, tele: 0.66, dist: 4.6 },
      { n: '岩屑迸射', fx: 'ring', cd: 6.6, tele: 0.46, num: 10, spd: 185, k: 0.34 }
    ] },
    // 灵猿：原著灵猿通灵，擅攀跃偷袭
    '灵猿': { tag: '灵猿', skills: [
      { n: '腾跃扑击', fx: 'blink', cd: 7.0, tele: 0.42, dist: 150 },
      { n: '爪影连挥', fx: 'fan', cd: 3.8, tele: 0.38, num: 4, spread: 0.22, spd: 270, k: 0.44 }
    ] },
    // 尸魈（百年）：原著青金石石室里被金符封印的那一只，尸气噬血
    '百年尸魈': { tag: '青金石石室 · 尸魈', skills: [
      { n: '尸爪裂空', fx: 'fan', cd: 3.2, tele: 0.34, num: 5, spread: 0.24, spd: 245, k: 0.46 },
      { n: '噬血扑击', fx: 'dash', cd: 6.8, tele: 0.52, dist: 4.6 },
      { n: '尸气侵蚀', fx: 'mist', cd: 8.6, tele: 0.56, num: 10, spd: 44, r: 17, k: 0.3, dur: 2.6 }
    ] },
    // 血侍：越皇座下，原著是血道爪牙
    '血侍·冰妖': { tag: '血侍', skills: [
      { n: '血冰锥', fx: 'beam', cd: 7.0, tele: 0.58, spd: 700, r: 9, k: 0.68 },
      { n: '血箭连发', fx: 'fan', cd: 3.8, tele: 0.34, num: 5, spread: 0.2, spd: 265, k: 0.42 }
    ] },
    '血侍·铁罗': { tag: '血侍', skills: [
      { n: '血甲冲撞', fx: 'dash', cd: 7.4, tele: 0.62, dist: 4.4 },
      { n: '血环荡开', fx: 'ring', cd: 6.6, tele: 0.46, num: 12, spd: 190, k: 0.32 }
    ] },
    '血侍·青纹': { tag: '血侍', skills: [
      { n: '血纹缠身', fx: 'chill', cd: 5.6, tele: 0.56, dur: 1.3, slow: 0.42, k: 0.42 },
      { n: '血箭连发', fx: 'fan', cd: 3.8, tele: 0.34, num: 5, spread: 0.2, spd: 265, k: 0.42 }
    ] },
    '血侍·叶蛇': { tag: '血侍', skills: [
      { n: '血蛇盘绕', fx: 'ring', cd: 6.2, tele: 0.44, num: 13, spd: 185, k: 0.32 },
      { n: '淬毒血牙', fx: 'fan', cd: 3.6, tele: 0.34, num: 4, spread: 0.24, spd: 250, k: 0.44 }
    ] },
    // 六级妖兽·婴鲤兽：原著凝翠岛外海所猎，吐珠伤人
    '六级妖兽·婴鲤兽': { tag: '婴鲤兽', skills: [
      { n: '婴鲤吐珠', fx: 'beam', cd: 6.4, tele: 0.55, spd: 660, r: 11, k: 0.66 },
      { n: '水浪荡开', fx: 'ring', cd: 6.8, tele: 0.46, num: 12, spd: 180, k: 0.32 }
    ] },
    '极阴岛·乌丑': { tag: '极阴岛', skills: [
      { n: '阴气侵体', fx: 'chill', cd: 5.4, tele: 0.54, dur: 1.2, slow: 0.4, k: 0.42 },
      { n: '阴风攒射', fx: 'fan', cd: 3.8, tele: 0.36, num: 4, spread: 0.22, spd: 245, k: 0.44 }
    ] },
    // 七级妖兽 / 妖蟒：原著凝翠岛只写「杀妖取丹」，不点种名 —— 只给族群招
    '七级妖兽': { tag: '凝翠岛 · 七级妖兽', skills: [
      { n: '妖爪横扫', fx: 'fan', cd: 3.6, tele: 0.4, num: 4, spread: 0.24, spd: 270, k: 0.46 },
      { n: '扑咬突进', fx: 'dash', cd: 7.0, tele: 0.58, dist: 4.2 }
    ] },
    // 守阵傀儡 / 守殿傀儡：古修留下的机关
    '守阵傀儡': { tag: '古修遗阵 · 傀儡', skills: [
      { n: '灵光炮', fx: 'beam', cd: 4.8, tele: 0.56, spd: 640, r: 10, k: 0.6 },
      { n: '阵纹镇压', fx: 'trap', cd: 9.2, tele: 0.82, dur: 0.55, k: 0.7 }
    ] },
    '守殿傀儡': { tag: '玄骨殿 · 傀儡', skills: [
      { n: '灵光炮', fx: 'beam', cd: 4.8, tele: 0.56, spd: 640, r: 10, k: 0.6 },
      { n: '铁臂镇压', fx: 'trap', cd: 9.2, tele: 0.82, dur: 0.55, k: 0.7 }
    ] },
    // 古修尸身 / 阴灵：古修遗骸化尸
    '古修尸身': { tag: '古修遗骸', skills: [
      { n: '尸气侵蚀', fx: 'mist', cd: 8.0, tele: 0.55, num: 9, spd: 44, r: 17, k: 0.3, dur: 2.5 },
      { n: '古修残术', fx: 'fan', cd: 3.6, tele: 0.36, num: 4, spread: 0.22, spd: 250, k: 0.44 }
    ] },
    '阴灵': { tag: '阴灵', skills: [
      { n: '阴气缠身', fx: 'chill', cd: 5.2, tele: 0.54, dur: 1.3, slow: 0.42, k: 0.42 },
      { n: '阴风攒射', fx: 'fan', cd: 3.6, tele: 0.34, num: 5, spread: 0.22, spd: 235, k: 0.42 }
    ] },
    // 化形妖 / 深海巨兽
    '化形妖': { tag: '化形妖', skills: [
      { n: '妖术幻形', fx: 'blink', cd: 8.0, tele: 0.44, dist: 165 },
      { n: '妖爪横扫', fx: 'fan', cd: 3.6, tele: 0.4, num: 4, spread: 0.24, spd: 265, k: 0.46 }
    ] },
    '深海巨兽': { tag: '深海巨兽', skills: [
      { n: '巨口吞噬', fx: 'dash', cd: 8.0, tele: 0.7, dist: 4.8 },
      { n: '海啸荡开', fx: 'ring', cd: 7.0, tele: 0.5, num: 14, spd: 175, k: 0.32 }
    ] },
    // 阴雾鬼将 / 六道随从
    '阴雾鬼将': { tag: '六道 · 鬼将', skills: [
      { n: '鬼爪攫魂', fx: 'pull', cd: 9.0, tele: 0.72, dist: 75, k: 0.64 },
      { n: '阴雾弥漫', fx: 'mist', cd: 8.0, tele: 0.55, num: 9, spd: 44, r: 17, k: 0.3, dur: 2.5 }
    ] },
    // 古剑门剑修：试剑大会的剑修历来夺冠
    '古剑门剑修': { tag: '古剑门 · 剑修', skills: [
      { n: '古剑斩', fx: 'fan', cd: 3.6, tele: 0.38, num: 4, spread: 0.16, spd: 310, k: 0.46 },
      { n: '一剑贯日', fx: 'beam', cd: 8.0, tele: 0.6, spd: 760, r: 10, k: 0.74 }
    ] },
    '百巧院弟子': { tag: '百巧院', skills: [
      { n: '机括连射', fx: 'fan', cd: 3.8, tele: 0.38, num: 5, spread: 0.24, spd: 250, k: 0.42 },
      { n: '机关兽扑击', fx: 'dash', cd: 8.2, tele: 0.62, dist: 3.8 }
    ] }
  };

  // ============ 四、Boss 专属表补充 ============
  // js/bosskit.js 已有 32 张；这里补的是「缺表但原著写过战况」的那些。
  // 原著没写具体战况的（如某些只点名未出手的），仍走同族通用档，不硬编。
  window.BOSS_KIT_MORE = {
    // 金光上人：原著筑基修士，护体金光罩，法宝是金砖
    '金光上人': { tag: '金光上人 · 金光罩与金砖', skills: [
      { n: '金光罩体', fx: 'heal', cd: 13, tele: 0.6, pct: 0.03 },
      { n: '金砖砸落', fx: 'rain', cd: 5.6, tele: 0.62, num: 5, rad: 150, r: 11, k: 0.64 },
      { n: '金光攒射', fx: 'fan', cd: 3.0, tele: 0.32, num: 6, spread: 0.18, spd: 255, k: 0.56 }
    ] },
    // 银色巨蟒：原著巨蟒，缠咬与毒
    '银色巨蟒': { tag: '银色巨蟒', skills: [
      { n: '蟒尾横扫', fx: 'ring', cd: 5.0, tele: 0.4, num: 12, spd: 190, k: 0.42 },
      { n: '毒牙喷洒', fx: 'fan', cd: 3.2, tele: 0.42, num: 6, spread: 0.18, spd: 225, k: 0.6 },
      { n: '巨口吞噬', fx: 'dash', cd: 7.2, tele: 0.58, dist: 5.0 }
    ] },
    // 墨蛟：原著墨蛟，喷墨迷目、水箭伤人
    '墨蛟': { tag: '墨蛟 · 墨雾与水箭', skills: [
      { n: '墨雾弥漫', fx: 'mist', cd: 6.2, tele: 0.5, num: 12, spd: 42, r: 18, k: 0.32, dur: 3.0 },
      { n: '蛟息水箭', fx: 'fan', cd: 3.0, tele: 0.4, num: 6, spread: 0.18, spd: 235, k: 0.6 },
      { n: '蛟尾横扫', fx: 'ring', cd: 5.4, tele: 0.42, num: 13, spd: 185, k: 0.52 }
    ] },
    // 石甲兽：一身石甲，硬冲硬砸
    '石甲兽': { tag: '石甲兽 · 石甲冲撞', skills: [
      { n: '石甲冲撞', fx: 'dash', cd: 6.6, tele: 0.62, dist: 5.2 },
      { n: '岩屑迸射', fx: 'ring', cd: 5.2, tele: 0.44, num: 14, spd: 180, k: 0.4 },
      { n: '石甲护体', fx: 'heal', cd: 14, tele: 0.6, pct: 0.03 }
    ] },
    // 厉飞雨（切磋）：原著同门切磋，凡俗武艺 + 粗浅法术，不下杀手
    '厉飞雨（切磋）': { tag: '七玄门 · 同门切磋', skills: [
      { n: '铁剑连斩', fx: 'fan', cd: 3.0, tele: 0.34, num: 5, spread: 0.18, spd: 280, k: 0.5 },
      { n: '进步突刺', fx: 'dash', cd: 6.4, tele: 0.5, dist: 4.2 }
    ] },
    // 灵猿：通灵善跃，偷袭为主
    '灵猿': { tag: '灵猿 · 腾跃偷袭', skills: [
      { n: '腾跃扑击', fx: 'blink', cd: 5.6, tele: 0.4, dist: 170 },
      { n: '爪影连挥', fx: 'fan', cd: 3.2, tele: 0.34, num: 5, spread: 0.2, spd: 275, k: 0.52 }
    ] },
    // 傀儡兽：机关造物，灵光炮与铁臂
    '傀儡兽': { tag: '傀儡兽 · 机关', skills: [
      { n: '灵光炮', fx: 'beam', cd: 5.0, tele: 0.56, spd: 700, r: 11, k: 0.7 },
      { n: '铁臂镇压', fx: 'trap', cd: 9.0, tele: 0.8, dur: 0.6, k: 0.8 },
      { n: '机括连射', fx: 'fan', cd: 3.2, tele: 0.34, num: 6, spread: 0.2, spd: 250, k: 0.52 }
    ] },
    // 守阵古修遗骸：古修死后残存的护阵本能
    '守阵古修遗骸': { tag: '古修遗骸 · 护阵', skills: [
      { n: '古阵镇压', fx: 'trap', cd: 9.5, tele: 0.88, dur: 0.65, k: 0.85 },
      { n: '阵纹攒射', fx: 'fan', cd: 3.0, tele: 0.32, num: 6, spread: 0.18, spd: 255, k: 0.56 },
      { n: '残阵回气', fx: 'heal', cd: 15, tele: 0.6, pct: 0.03 }
    ] },
    // 同门 陆师兄：原著同门相争，剑术为主
    '同门 陆师兄': { tag: '同门 · 陆师兄', skills: [
      { n: '飞剑连斩', fx: 'fan', cd: 2.9, tele: 0.3, num: 6, spread: 0.16, spd: 275, k: 0.56 },
      { n: '一剑贯日', fx: 'beam', cd: 6.8, tele: 0.6, spd: 760, r: 10, k: 0.92 }
    ] },
    // 千竹教·林师兄：原著千竹教傀儡术
    '千竹教·林师兄': { tag: '千竹教 · 傀儡术', skills: [
      { n: '千竹刺', fx: 'fan', cd: 2.8, tele: 0.3, num: 7, spread: 0.18, spd: 265, k: 0.56 },
      { n: '驱傀助战', fx: 'summon', cd: 9.5, tele: 0.62, type: 'ghoul', num: 2, cap: 4 },
      { n: '竹阵镇压', fx: 'trap', cd: 11, tele: 0.85, dur: 0.7, k: 0.86 }
    ] },
    // 陆夫人：原著陆师兄之妻，同出一门
    '陆夫人': { tag: '陆夫人 · 同门', skills: [
      { n: '飞剑攒刺', fx: 'fan', cd: 2.9, tele: 0.32, num: 6, spread: 0.18, spd: 265, k: 0.56 },
      { n: '护体灵光', fx: 'heal', cd: 13, tele: 0.6, pct: 0.035 }
    ] },
    // 六道·万天明：六道魔功，环环相扣
    '六道·万天明': { tag: '六道 · 万天明', skills: [
      { n: '六道轮转', fx: 'ring', cd: 4.8, tele: 0.44, num: 16, spd: 180, k: 0.38 },
      { n: '魔焰攒射', fx: 'fan', cd: 2.9, tele: 0.3, num: 7, spread: 0.2, spd: 255, k: 0.58 },
      { n: '轮回牵引', fx: 'pull', cd: 8.8, tele: 0.7, dist: 80, k: 0.8 }
    ] },
    // 付家家主：原著付家血祭
    '付家家主': { tag: '付家 · 血祭', skills: [
      { n: '血祭符阵', fx: 'rain', cd: 6.4, tele: 0.66, num: 6, rad: 150, r: 10, k: 0.62 },
      { n: '血箭连发', fx: 'fan', cd: 2.8, tele: 0.3, num: 7, spread: 0.2, spd: 250, k: 0.56 },
      { n: '血遁脱身', fx: 'blink', cd: 7.0, tele: 0.4, dist: 190 }
    ] },
    // 地渊·阴兽：地渊阴兽，阴风噬体
    '地渊·阴兽': { tag: '地渊 · 阴兽', skills: [
      { n: '阴风噬体', fx: 'chill', cd: 5.2, tele: 0.55, dur: 1.4, slow: 0.42, k: 0.5 },
      { n: '阴兽扑杀', fx: 'dash', cd: 7.0, tele: 0.58, dist: 5.0 },
      { n: '阴气弥漫', fx: 'mist', cd: 7.6, tele: 0.54, num: 12, spd: 44, r: 18, k: 0.32, dur: 2.8 }
    ] },
    // 陇家老祖：傀儡世家，以傀儡压阵
    '陇家老祖': { tag: '陇家 · 傀儡世家', skills: [
      { n: '傀儡压阵', fx: 'summon', cd: 10, tele: 0.7, type: 'kui', num: 2, cap: 4 },
      { n: '灵光炮阵', fx: 'fan', cd: 3.2, tele: 0.34, num: 6, spread: 0.18, spd: 260, k: 0.58 },
      { n: '铁臂镇压', fx: 'trap', cd: 10, tele: 0.85, dur: 0.7, k: 0.9 }
    ] },
    // 万灵台·万灵兽：万灵台豢养的凶兽
    '万灵台·万灵兽': { tag: '万灵台 · 万灵兽', skills: [
      { n: '万灵嘶吼', fx: 'ring', cd: 5.0, tele: 0.42, num: 16, spd: 185, k: 0.4 },
      { n: '凶兽扑杀', fx: 'dash', cd: 6.4, tele: 0.56, dist: 5.2 },
      { n: '妖爪横扫', fx: 'fan', cd: 3.0, tele: 0.36, num: 6, spread: 0.2, spd: 265, k: 0.58 }
    ] },
    // 黄元子：元磁神山之主，元磁神光
    '黄元子': { tag: '黄元子 · 元磁神光', skills: [
      { n: '元磁神光', fx: 'beam', cd: 6.2, tele: 0.7, spd: 820, r: 12, k: 1.0 },
      { n: '元磁牵引', fx: 'pull', cd: 9.0, tele: 0.72, dist: 90, k: 0.86 },
      { n: '磁光攒射', fx: 'fan', cd: 2.9, tele: 0.32, num: 7, spread: 0.18, spd: 270, k: 0.58 }
    ] },
    // 百目天鬼：百目齐睁
    '百目天鬼': { tag: '百目天鬼 · 百目', skills: [
      { n: '百目齐睁', fx: 'ring', cd: 5.4, tele: 0.5, num: 20, spd: 190, k: 0.4 },
      { n: '鬼光攒射', fx: 'fan', cd: 2.8, tele: 0.3, num: 7, spread: 0.2, spd: 260, k: 0.58 },
      { n: '天鬼攫魂', fx: 'pull', cd: 9.5, tele: 0.75, dist: 85, k: 0.88 }
    ] },
    // 大罗鬼王：鬼道至高
    '大罗鬼王': { tag: '大罗鬼王 · 鬼道极致', skills: [
      { n: '鬼王道印', fx: 'trap', cd: 11, tele: 0.9, dur: 0.9, k: 1.05 },
      { n: '万鬼朝宗', fx: 'ring', cd: 5.6, tele: 0.5, num: 22, spd: 185, k: 0.4 },
      { n: '阴气噬体', fx: 'mist', cd: 7.8, tele: 0.56, num: 14, spd: 46, r: 19, k: 0.34, dur: 3.0 }
    ] },
    // 骨皇：骸骨之皇，骨刺为兵
    '骨皇': { tag: '骨皇 · 骸骨', skills: [
      { n: '骨刺雨', fx: 'rain', cd: 5.8, tele: 0.62, num: 8, rad: 160, r: 10, k: 0.66 },
      { n: '白骨攒射', fx: 'fan', cd: 2.9, tele: 0.32, num: 7, spread: 0.18, spd: 265, k: 0.58 },
      { n: '骨甲护体', fx: 'heal', cd: 15, tele: 0.6, pct: 0.03 }
    ] },
    // 妙法仙尊：仙界妙法
    '妙法仙尊': { tag: '妙法仙尊 · 仙法', skills: [
      { n: '妙法敕令', fx: 'beam', cd: 6.0, tele: 0.66, spd: 800, r: 12, k: 0.98 },
      { n: '仙光普照', fx: 'ring', cd: 5.4, tele: 0.48, num: 20, spd: 190, k: 0.4 },
      { n: '法域镇压', fx: 'trap', cd: 12, tele: 0.9, dur: 0.85, k: 1.0 }
    ] },
    // 古或今·混沌之身：全书终局，混沌之道
    '古或今·混沌之身': { tag: '古或今 · 混沌', skills: [
      { n: '混沌一击', fx: 'nova', cd: 9.0, tele: 0.9, num: 24, spd: 200, rad: 170, k: 1.05 },
      { n: '混沌攒射', fx: 'fan', cd: 2.6, tele: 0.3, num: 8, spread: 0.18, spd: 275, k: 0.6 },
      { n: '法域镇压', fx: 'trap', cd: 12, tele: 0.9, dur: 0.9, k: 1.1 },
      { n: '混沌吞噬', fx: 'pull', cd: 10, tele: 0.75, dist: 95, k: 0.92 }
    ] },

    // ==================================================================
    // 四、剩余 48 只「只被点名、原著没细写战况」的 Boss 专属表
    //     上一轮它们走同族通用档（妖兽/魔修），所以打谁都一样。这一轮按原著给身份：
    //     · 有明确功法出处的（冰凤的寒气、磁光兽的磁光、佛骨王的骨、土皇钉的土）按出处写；
    //     · 只有名号的，按「门派 / 种族 / 修为层次」给一以贯之的三招，不硬编独门绝学。
    //
    //     三种新招式（持续型，需要真判定）：
    //       pillar 光柱：定桩在「预警时你站的地方」，持续扣血，k 是**每 tick** 系数
    //       sweep  横扫光刃：从 Boss 身上扫过一段弧，判定按线段算，k 是**每 tick** 系数
    //       spike  地刺：朝你方向依次破土，每个点位只结算一次，k 是**单次**系数
    //     派发原则：柱=光/火/佛/雷属性；刃=剑修/刀修/大能；刺=土/骨/金/木/冰属性。
    // ==================================================================

    // ---- 凡俗与低阶（教学区间，不给持续招，别在 1 级就把人劝退）----
    '山贼头目': { tag: '山贼头目 · 凡俗刀法', skills: [
      { n: '朴刀横斩', fx: 'fan', cd: 4.2, tele: 0.42, num: 4, spread: 0.24, spd: 200, k: 0.40 },
      { n: '蛮力冲撞', fx: 'dash', cd: 7.5, tele: 0.66, dist: 4.2, k: 0.55 }
    ] },
    '野狼帮帮主·贾天龙': { tag: '贾天龙 · 铁线拳', skills: [
      { n: '铁线拳', fx: 'fan', cd: 3.2, tele: 0.36, num: 5, spread: 0.20, spd: 215, k: 0.46 },
      { n: '横练冲撞', fx: 'dash', cd: 7.0, tele: 0.62, dist: 4.4, k: 0.62 }
    ] },
    '七级妖兽': { tag: '七级妖兽 · 妖躯', skills: [
      { n: '妖爪连抓', fx: 'fan', cd: 3.0, tele: 0.38, num: 5, spread: 0.22, spd: 218, k: 0.52 },
      { n: '扑噬', fx: 'dash', cd: 6.4, tele: 0.60, dist: 4.8, k: 0.66 },
      { n: '兽吼震地', fx: 'nova', cd: 12, tele: 0.70, num: 16, spd: 185, rad: 120, k: 0.52 }
    ] },
    '虞阳城·妖修': { tag: '虞阳城妖修 · 妖风', skills: [
      { n: '妖风刃', fx: 'fan', cd: 2.9, tele: 0.34, num: 6, spread: 0.19, spd: 235, k: 0.54 },
      { n: '妖气缠身', fx: 'mist', cd: 8.4, tele: 0.56, num: 12, spd: 48, r: 18, k: 0.32, dur: 2.8 }
    ] },

    // ---- 人界 · 道魔两道 ----
    '妙鹤真人': { tag: '妙鹤真人 · 御剑拂尘', skills: [
      { n: '鹤羽飞剑', fx: 'fan', cd: 2.7, tele: 0.32, num: 6, spread: 0.18, spd: 245, k: 0.54 },
      // 拂尘横扫：原著里道门真人近身就是这一下，扫一个扇面
      { n: '拂尘横扫', fx: 'sweep', cd: 10, tele: 0.80, len: 400, r: 14, arc: 1.9, dur: 2.0, k: 0.5, c: '#e8ddc0' }
    ] },
    '黑煞教长老': { tag: '黑煞教长老 · 黑煞气', skills: [
      { n: '黑煞掌', fx: 'fan', cd: 3.0, tele: 0.34, num: 5, spread: 0.2, spd: 230, k: 0.54 },
      { n: '阴煞缠身', fx: 'trap', cd: 11, tele: 0.80, dur: 0.8, rad: 60, k: 0.72 }
    ] },
    '魔道执事': { tag: '魔道执事 · 驱尸', skills: [
      { n: '阴风爪', fx: 'fan', cd: 3.4, tele: 0.36, num: 4, spread: 0.22, spd: 210, k: 0.48 },
      { n: '驱尸助战', fx: 'summon', cd: 12, tele: 0.75, type: 'ghoul', num: 2, cap: 3 }
    ] },
    '古魔主魂': { tag: '古魔主魂 · 古魔之气', skills: [
      { n: '魔气贯体', fx: 'beam', cd: 6.8, tele: 0.62, spd: 800, r: 10, k: 0.90 },
      { n: '血光照野', fx: 'ring', cd: 5.6, tele: 0.50, num: 18, spd: 185, k: 0.40 },
      { n: '魔威镇压', fx: 'nova', cd: 11, tele: 0.80, num: 18, spd: 190, rad: 150, k: 0.85 }
    ] },
    '银翅夜叉': { tag: '银翅夜叉 · 银翅', skills: [
      { n: '银翅斩', fx: 'fan', cd: 2.8, tele: 0.32, num: 6, spread: 0.18, spd: 250, k: 0.56 },
      { n: '夜叉扑击', fx: 'dash', cd: 6.2, tele: 0.58, dist: 5.0, k: 0.70 },
      { n: '银羽风暴', fx: 'ring', cd: 6.6, tele: 0.52, num: 18, spd: 200, k: 0.42 }
    ] },
    '敖啸老祖': { tag: '敖啸老祖 · 蛟龙之属', skills: [
      { n: '龙息喷吐', fx: 'mist', cd: 7.6, tele: 0.68, num: 13, spd: 50, r: 19, k: 0.34, dur: 3.0 },
      // 蛟尾横扫：龙属近身的大范围一扫，原著里蛟类惯用躯干
      { n: '蛟尾横扫', fx: 'sweep', cd: 9.5, tele: 0.82, len: 430, r: 17, arc: 2.0, dur: 2.1, k: 0.31, c: '#8fd0e0' },
      { n: '水龙卷', fx: 'pull', cd: 10, tele: 0.72, dist: 95, k: 0.86 }
    ] },
    '冰凤': { tag: '冰凤 · 寒冰之属', skills: [
      // 冰刺破土：寒气从地面往下结，戳上来 —— 冰属该用刺，不该用柱
      { n: '冰刺破土', fx: 'spike', cd: 9.5, tele: 0.72, num: 6, r: 26, k: 0.55, c: '#bfe9ff' },
      { n: '冰锥天降', fx: 'rain', cd: 5.8, tele: 0.62, num: 7, rad: 155, r: 10, k: 0.64 },
      { n: '寒冰封域', fx: 'chill', cd: 11, tele: 0.70, dur: 1.4, rad: 95, slow: 0.42, k: 0.60 },
      { n: '凤鸣冰爆', fx: 'nova', cd: 12, tele: 0.85, num: 20, spd: 195, rad: 155, k: 0.88 }
    ] },
    '鸾鸣门·双修夫妇': { tag: '鸾鸣门双修夫妇 · 双剑合璧', skills: [
      { n: '双剑合璧', fx: 'fan', cd: 2.6, tele: 0.30, num: 6, spread: 0.15, spd: 260, k: 0.50 },
      { n: '鸾鸣音波', fx: 'ring', cd: 6.4, tele: 0.52, num: 18, spd: 190, k: 0.40 },
      { n: '合击贯刺', fx: 'beam', cd: 8.0, tele: 0.58, spd: 820, r: 11, k: 0.92 }
    ] },
    '至阳上人': { tag: '至阳上人 · 至阳真火', skills: [
      // 火柱：至阳一脉的招牌就是"真火自地脉冲起"，这个 boss 就该有柱
      { n: '至阳火柱', fx: 'pillar', cd: 10, tele: 0.78, rad: 48, dur: 1.7, k: 0.31, c: '#ff8a3a' },
      { n: '大日金轮', fx: 'ring', cd: 5.8, tele: 0.48, num: 20, spd: 190, k: 0.40 },
      { n: '阳炎掌', fx: 'fan', cd: 2.9, tele: 0.32, num: 6, spread: 0.18, spd: 250, k: 0.57 }
    ] },

    // ---- 灵界 · 大乘与一族之主 ----
    '灵将': { tag: '灵将 · 灵族战将', skills: [
      { n: '灵光枪', fx: 'beam', cd: 6.6, tele: 0.60, spd: 780, r: 10, k: 0.88 },
      { n: '灵气环身', fx: 'ring', cd: 6.2, tele: 0.50, num: 16, spd: 190, k: 0.40 },
      { n: '灵盾护体', fx: 'heal', cd: 15, tele: 0.60, pct: 0.03 }
    ] },
    '银光仙子': { tag: '银光仙子 · 银光', skills: [
      { n: '银光落柱', fx: 'pillar', cd: 9.5, tele: 0.74, rad: 44, dur: 1.6, k: 0.29, c: '#e6f0ff' },
      { n: '银针如雨', fx: 'rain', cd: 5.6, tele: 0.60, num: 8, rad: 150, r: 9, k: 0.62 },
      { n: '银铃音波', fx: 'ring', cd: 6.4, tele: 0.50, num: 18, spd: 195, k: 0.40 }
    ] },
    '大乘修士': { tag: '大乘修士 · 御器', skills: [
      { n: '御剑攒刺', fx: 'fan', cd: 2.7, tele: 0.30, num: 6, spread: 0.18, spd: 250, k: 0.56 },
      { n: '法宝轰击', fx: 'nova', cd: 10, tele: 0.82, num: 18, spd: 190, rad: 150, k: 0.86 },
      { n: '护体灵光', fx: 'heal', cd: 16, tele: 0.60, pct: 0.025 }
    ] },
    '白光界·土皇钉': { tag: '土皇钉 · 戊土', skills: [
      // 土皇钉：土属法宝，扎地成刺 —— 这个 boss 是"刺"最正宗的出处
      { n: '土皇钉破土', fx: 'spike', cd: 8.6, tele: 0.70, num: 6, r: 28, k: 0.58, c: '#e0c88a' },
      { n: '戊土镇压', fx: 'nova', cd: 11, tele: 0.82, num: 18, spd: 185, rad: 145, k: 0.84 },
      { n: '白光贯地', fx: 'pillar', cd: 12, tele: 0.80, rad: 46, dur: 1.6, k: 0.30, c: '#f2f6ff' }
    ] },
    '白石真人': { tag: '白石真人 · 石化', skills: [
      { n: '白石巨掌', fx: 'rain', cd: 5.8, tele: 0.64, num: 6, rad: 150, r: 12, k: 0.68 },
      { n: '石化定身', fx: 'trap', cd: 12, tele: 0.85, dur: 0.9, rad: 62, k: 0.78 },
      { n: '石刺林', fx: 'spike', cd: 10, tele: 0.74, num: 7, r: 26, k: 0.56, c: '#cfcabb' }
    ] },
    '冷焰老祖': { tag: '冷焰老祖 · 冷焰', skills: [
      // 冷焰是"冷的火"，所以它既有柱（火性）又有冰面（寒性），这是它最该有的辨识度
      { n: '冷焰火柱', fx: 'pillar', cd: 9.0, tele: 0.76, rad: 46, dur: 1.7, k: 0.30, c: '#8fd8ff' },
      { n: '寒焰横扫', fx: 'sweep', cd: 10, tele: 0.80, len: 420, r: 15, arc: 2.0, dur: 2.1, k: 0.5, c: '#a8e0ff' },
      { n: '冰封千里', fx: 'chill', cd: 12, tele: 0.72, dur: 1.3, rad: 100, slow: 0.40, k: 0.58 }
    ] },
    '血云·血祭大阵': { tag: '血云血祭大阵 · 阵灵', skills: [
      // 这是"阵"，不是"人"：柱子是阵眼被激活，吸力是阵纹在收 —— 持续型招式最贴它
      { n: '血柱冲天', fx: 'pillar', cd: 8.2, tele: 0.80, rad: 50, dur: 1.8, k: 0.30, c: '#ff5a5a' },
      { n: '血雾弥漫', fx: 'mist', cd: 7.4, tele: 0.60, num: 14, spd: 44, r: 19, k: 0.32, dur: 3.0 },
      { n: '血祭吸元', fx: 'pull', cd: 9.5, tele: 0.74, dist: 100, k: 0.86 }
    ] },
    '地渊·刑兽': { tag: '地渊刑兽 · 地脉', skills: [
      { n: '地刺追魂', fx: 'spike', cd: 8.0, tele: 0.66, num: 7, r: 28, k: 0.58, c: '#d8b078' },
      { n: '刑兽冲撞', fx: 'dash', cd: 6.2, tele: 0.58, dist: 5.2, k: 0.72 },
      { n: '岩崩落石', fx: 'rain', cd: 6.4, tele: 0.64, num: 7, rad: 155, r: 11, k: 0.66 }
    ] },
    '米尊者': { tag: '米尊者 · 佛门金刚', skills: [
      { n: '佛光普照', fx: 'pillar', cd: 10, tele: 0.82, rad: 48, dur: 1.7, k: 0.30, c: '#ffd98a' },
      { n: '金刚掌', fx: 'fan', cd: 3.0, tele: 0.34, num: 6, spread: 0.18, spd: 245, k: 0.56 },
      { n: '定身咒', fx: 'trap', cd: 12, tele: 0.82, dur: 0.8, rad: 60, k: 0.72 }
    ] },
    '第一魔尊': { tag: '第一魔尊 · 魔道之巅', skills: [
      { n: '魔焰冲天', fx: 'pillar', cd: 8.8, tele: 0.80, rad: 50, dur: 1.8, k: 0.32, c: '#ff6a4a' },
      { n: '魔气横扫', fx: 'sweep', cd: 9.0, tele: 0.78, len: 440, r: 16, arc: 2.1, dur: 2.1, k: 0.54, c: '#c98aff' },
      { n: '万魔朝宗', fx: 'ring', cd: 5.6, tele: 0.50, num: 20, spd: 195, k: 0.42 },
      { n: '魔影遁形', fx: 'blink', cd: 8.0, tele: 0.40, dist: 200, k: 0.50 }
    ] },
    '兽尊殿·魔尊': { tag: '兽尊殿魔尊 · 御兽', skills: [
      { n: '兽潮冲撞', fx: 'dash', cd: 6.0, tele: 0.56, dist: 5.2, k: 0.72 },
      { n: '血口噬咬', fx: 'fan', cd: 2.9, tele: 0.32, num: 6, spread: 0.20, spd: 240, k: 0.54 },
      { n: '驱兽成军', fx: 'summon', cd: 12, tele: 0.78, type: 'wolf', num: 3, cap: 5 }
    ] },
    '元魇始祖·化身': { tag: '元魇始祖化身 · 梦魇', skills: [
      { n: '梦魇缠身', fx: 'trap', cd: 10, tele: 0.84, dur: 0.9, rad: 62, k: 0.80 },
      { n: '魇影分身', fx: 'blink', cd: 8.0, tele: 0.42, dist: 210, k: 0.50 },
      { n: '幽光贯脑', fx: 'beam', cd: 7.0, tele: 0.62, spd: 810, r: 11, k: 0.92 }
    ] },
    '宝花圣祖': { tag: '宝花圣祖 · 万花', skills: [
      { n: '宝花绽放', fx: 'nova', cd: 9.5, tele: 0.82, num: 20, spd: 195, rad: 155, k: 0.86 },
      { n: '花雨漫落', fx: 'rain', cd: 5.8, tele: 0.62, num: 8, rad: 160, r: 10, k: 0.64 },
      { n: '藤蔓缠身', fx: 'trap', cd: 11, tele: 0.80, dur: 0.85, rad: 60, k: 0.74 }
    ] },
    '矿脉·磁光兽': { tag: '矿脉磁光兽 · 磁光', skills: [
      { n: '磁光柱', fx: 'pillar', cd: 9.0, tele: 0.76, rad: 46, dur: 1.7, k: 0.30, c: '#8fd8ff' },
      { n: '磁力牵引', fx: 'pull', cd: 9.6, tele: 0.74, dist: 95, k: 0.86 },
      { n: '磁光散射', fx: 'fan', cd: 2.8, tele: 0.32, num: 7, spread: 0.18, spd: 255, k: 0.58 }
    ] },
    '吞天圣祖·化身': { tag: '吞天圣祖化身 · 吞噬', skills: [
      { n: '吞天漩涡', fx: 'pull', cd: 8.4, tele: 0.76, dist: 110, rad: 120, k: 0.88 },
      { n: '虚空吞噬', fx: 'nova', cd: 10, tele: 0.84, num: 20, spd: 190, rad: 160, k: 0.88 },
      { n: '吞噬冲击', fx: 'beam', cd: 7.2, tele: 0.64, spd: 800, r: 12, k: 0.94 }
    ] },
    '夜叉族·黑枭王': { tag: '黑枭王 · 夜叉', skills: [
      { n: '黑枭裂爪', fx: 'fan', cd: 2.8, tele: 0.32, num: 6, spread: 0.18, spd: 250, k: 0.56 },
      { n: '夜枭扑击', fx: 'dash', cd: 6.0, tele: 0.56, dist: 5.4, k: 0.74 },
      { n: '血翼风暴', fx: 'ring', cd: 6.4, tele: 0.50, num: 18, spd: 200, k: 0.42 }
    ] },
    '元魇圣祖·化身': { tag: '元魇圣祖化身 · 魇域', skills: [
      { n: '魇域封锁', fx: 'trap', cd: 9.5, tele: 0.84, dur: 1.0, rad: 66, k: 0.80 },
      { n: '梦魇穿刺', fx: 'beam', cd: 6.8, tele: 0.60, spd: 820, r: 12, k: 0.94 },
      { n: '魇影重重', fx: 'blink', cd: 7.5, tele: 0.40, dist: 215, k: 0.50 }
    ] },
    '五光族·奕姓大乘': { tag: '五光族大乘 · 五色神光', skills: [
      // 五色神光是一道扫过去的光，原著里就是这么用的
      { n: '五色神光', fx: 'sweep', cd: 8.4, tele: 0.78, len: 450, r: 16, arc: 2.2, dur: 2.2, k: 0.54, c: '#c9a8ff' },
      { n: '五光轮转', fx: 'ring', cd: 5.8, tele: 0.50, num: 20, spd: 195, k: 0.42 },
      { n: '五光攒射', fx: 'fan', cd: 2.8, tele: 0.32, num: 7, spread: 0.16, spd: 260, k: 0.56 }
    ] },
    '不灭天尊': { tag: '不灭天尊 · 不灭金身', skills: [
      { n: '灭世光柱', fx: 'pillar', cd: 9.5, tele: 0.86, rad: 52, dur: 1.9, k: 0.33, c: '#ffd98a' },
      { n: '天尊法相', fx: 'nova', cd: 11, tele: 0.86, num: 22, spd: 195, rad: 165, k: 0.92 },
      { n: '不灭金身', fx: 'heal', cd: 16, tele: 0.62, pct: 0.035 }
    ] },
    '天鼎宫·守鼎傀儡': { tag: '守鼎傀儡 · 机关', skills: [
      // 傀儡没有"功力"，只有机关：地刺是机关钉，横扫是机关臂
      { n: '机关地钉', fx: 'spike', cd: 8.2, tele: 0.70, num: 6, r: 26, k: 0.56, c: '#cfc3ad' },
      { n: '巨鼎压顶', fx: 'rain', cd: 6.2, tele: 0.66, num: 6, rad: 150, r: 13, k: 0.70 },
      { n: '机关臂横扫', fx: 'sweep', cd: 9.8, tele: 0.82, len: 400, r: 15, arc: 1.9, dur: 2.0, k: 0.48, c: '#b8ad98' }
    ] },
    '佛骨王': { tag: '佛骨王 · 佛骨', skills: [
      { n: '骨刺林', fx: 'spike', cd: 8.0, tele: 0.70, num: 7, r: 27, k: 0.58, c: '#efe6cc' },
      { n: '佛骨金身', fx: 'heal', cd: 15, tele: 0.62, pct: 0.03 },
      { n: '骨爪裂空', fx: 'fan', cd: 2.9, tele: 0.32, num: 6, spread: 0.18, spd: 250, k: 0.56 }
    ] },
    '灵界第一大乘': { tag: '灵界第一大乘 · 灵气', skills: [
      { n: '天地灵气柱', fx: 'pillar', cd: 9.0, tele: 0.82, rad: 50, dur: 1.8, k: 0.32, c: '#bfe9ff' },
      { n: '灵光贯日', fx: 'beam', cd: 6.6, tele: 0.60, spd: 830, r: 12, k: 0.96 },
      { n: '大乘威压', fx: 'nova', cd: 10, tele: 0.84, num: 20, spd: 195, rad: 160, k: 0.88 }
    ] },
    '天象尊者': { tag: '天象尊者 · 星辰', skills: [
      { n: '星辰光柱', fx: 'pillar', cd: 8.6, tele: 0.80, rad: 48, dur: 1.8, k: 0.31, c: '#cfe0ff' },
      { n: '天象轮转', fx: 'ring', cd: 5.6, tele: 0.50, num: 20, spd: 195, k: 0.42 },
      { n: '陨星坠落', fx: 'rain', cd: 5.8, tele: 0.66, num: 8, rad: 165, r: 11, k: 0.68 }
    ] },

    // ---- 仙界 ----
    '萧晋寒·天庭使者': { tag: '萧晋寒 · 天庭敕令', skills: [
      { n: '天罚雷柱', fx: 'pillar', cd: 8.4, tele: 0.78, rad: 48, dur: 1.8, k: 0.32, c: '#bfe9ff' },
      { n: '天庭敕令', fx: 'trap', cd: 11, tele: 0.84, dur: 0.95, rad: 64, k: 0.80 },
      { n: '雷光横扫', fx: 'sweep', cd: 9.4, tele: 0.80, len: 440, r: 16, arc: 2.1, dur: 2.1, k: 0.54, c: '#cfe8ff' }
    ] },
    '太乙境噬金仙': { tag: '噬金仙 · 噬金', skills: [
      // 噬金仙：以金铁为食，金气化刺
      { n: '金刺裂地', fx: 'spike', cd: 8.2, tele: 0.70, num: 7, r: 27, k: 0.58, c: '#ffd08a' },
      { n: '噬金扑咬', fx: 'dash', cd: 6.0, tele: 0.56, dist: 5.4, k: 0.76 },
      { n: '金气切割', fx: 'fan', cd: 2.7, tele: 0.30, num: 7, spread: 0.16, spd: 265, k: 0.58 }
    ] },
    '鬼木': { tag: '鬼木 · 阴木', skills: [
      { n: '鬼藤缠身', fx: 'trap', cd: 10, tele: 0.84, dur: 0.9, rad: 64, k: 0.78 },
      { n: '阴木破土', fx: 'spike', cd: 8.6, tele: 0.72, num: 6, r: 26, k: 0.56, c: '#a8c88a' },
      { n: '阴气弥漫', fx: 'mist', cd: 7.6, tele: 0.60, num: 13, spd: 46, r: 19, k: 0.32, dur: 3.0 }
    ] },
    '血池·鳞犼像': { tag: '血池鳞犼像 · 血池', skills: [
      { n: '血柱喷涌', fx: 'pillar', cd: 8.6, tele: 0.80, rad: 50, dur: 1.8, k: 0.31, c: '#ff5a5a' },
      { n: '血浪滔天', fx: 'ring', cd: 5.8, tele: 0.50, num: 20, spd: 195, k: 0.42 },
      { n: '血池牵引', fx: 'pull', cd: 9.8, tele: 0.74, dist: 100, k: 0.88 }
    ] },
    '东方白·金源宫主': { tag: '东方白 · 金源', skills: [
      { n: '金光斩', fx: 'beam', cd: 6.4, tele: 0.58, spd: 830, r: 12, k: 0.96 },
      { n: '金源光柱', fx: 'pillar', cd: 9.2, tele: 0.80, rad: 48, dur: 1.8, k: 0.31, c: '#ffd98a' },
      { n: '金锋齐射', fx: 'fan', cd: 2.7, tele: 0.30, num: 7, spread: 0.16, spd: 265, k: 0.58 }
    ] },
    '奇摩子': { tag: '奇摩子 · 魔道大能', skills: [
      { n: '魔焰横扫', fx: 'sweep', cd: 9.0, tele: 0.78, len: 440, r: 16, arc: 2.1, dur: 2.1, k: 0.52, c: '#ff8a3a' },
      { n: '魔影遁形', fx: 'blink', cd: 8.0, tele: 0.40, dist: 210, k: 0.50 },
      { n: '魔气弹幕', fx: 'ring', cd: 5.6, tele: 0.50, num: 20, spd: 195, k: 0.42 }
    ] },
    '黑天魔祖': { tag: '黑天魔祖 · 黑天魔焰', skills: [
      { n: '魔焰柱', fx: 'pillar', cd: 8.4, tele: 0.80, rad: 50, dur: 1.8, k: 0.32, c: '#ff6a4a' },
      { n: '黑天吞噬', fx: 'pull', cd: 9.4, tele: 0.76, dist: 105, rad: 115, k: 0.90 },
      { n: '魔威镇压', fx: 'nova', cd: 10, tele: 0.84, num: 20, spd: 195, rad: 160, k: 0.90 }
    ] },
    '柳自在': { tag: '柳自在 · 柳叶飞剑', skills: [
      { n: '柳叶飞剑', fx: 'fan', cd: 2.6, tele: 0.30, num: 7, spread: 0.16, spd: 265, k: 0.58 },
      { n: '柳枝缠身', fx: 'trap', cd: 11, tele: 0.84, dur: 0.9, rad: 62, k: 0.76 },
      { n: '剑光纵横', fx: 'sweep', cd: 9.2, tele: 0.78, len: 430, r: 15, arc: 2.0, dur: 2.1, k: 0.52, c: '#cfe8ff' }
    ] },
    '鬼灵子': { tag: '鬼灵子 · 御鬼', skills: [
      { n: '幽冥鬼爪', fx: 'fan', cd: 2.9, tele: 0.32, num: 6, spread: 0.18, spd: 250, k: 0.56 },
      { n: '召魂助战', fx: 'summon', cd: 12, tele: 0.76, type: 'guiling', num: 3, cap: 5 },
      { n: '鬼域封禁', fx: 'trap', cd: 10, tele: 0.84, dur: 0.9, rad: 64, k: 0.78 }
    ] },
    '东离虎·道祖': { tag: '东离虎 · 虎啸', skills: [
      { n: '道祖法域', fx: 'pillar', cd: 8.6, tele: 0.82, rad: 52, dur: 1.9, k: 0.33, c: '#ffd98a' },
      { n: '虎啸山河', fx: 'nova', cd: 9.5, tele: 0.84, num: 22, spd: 195, rad: 165, k: 0.92 },
      { n: '虎爪裂天', fx: 'fan', cd: 2.7, tele: 0.30, num: 7, spread: 0.16, spd: 265, k: 0.58 }
    ] },
    '紫杉': { tag: '紫杉 · 紫气', skills: [
      { n: '紫气东来', fx: 'pillar', cd: 8.8, tele: 0.80, rad: 48, dur: 1.8, k: 0.31, c: '#c9a8ff' },
      { n: '紫电贯空', fx: 'beam', cd: 6.6, tele: 0.60, spd: 830, r: 12, k: 0.96 },
      { n: '紫霞漫卷', fx: 'ring', cd: 5.8, tele: 0.50, num: 20, spd: 195, k: 0.42 }
    ] },
    '朱颜': { tag: '朱颜 · 朱砂符', skills: [
      { n: '朱红光柱', fx: 'pillar', cd: 9.0, tele: 0.80, rad: 48, dur: 1.8, k: 0.31, c: '#ff7a52' },
      { n: '朱砂符阵', fx: 'trap', cd: 11, tele: 0.84, dur: 0.95, rad: 64, k: 0.80 },
      { n: '符箓爆裂', fx: 'nova', cd: 10, tele: 0.84, num: 20, spd: 195, rad: 155, k: 0.86 }
    ] }
  };
})();
