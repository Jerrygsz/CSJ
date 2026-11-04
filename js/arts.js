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
      { n: '蛟尾横扫', fx: 'ring', cd: 5.4, tele: 0.42, num: 13, spd: 185, k: 0.42 }
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
    ] }
  };
})();
