// 道具体系：材料 / 丹药符箓 / 装备，按《凡人修仙传》筑基前风物命名
// req = 使用或佩戴所需的最低角色等级（对应炼气层数，见 REALM_LAYERS）

window.RARITY = [
  { name: '凡品', color: '#cfd6e2', glow: 'rgba(207,214,226,0.75)' },
  { name: '良品', color: '#6fe08a', glow: 'rgba(111,224,138,0.8)' },
  { name: '上品', color: '#6db6ff', glow: 'rgba(109,182,255,0.85)' },
  { name: '珍品', color: '#c48cff', glow: 'rgba(196,140,255,0.9)' },
  { name: '至宝', color: '#ffd24a', glow: 'rgba(255,210,74,1)' },
  // 仙品：灵界之上的那一档（玄天之宝、真仙级物事）。不进随机池 —— rollRarity 封顶 4，
  // 所以这档只能靠剧情/破境固定发放，正合「玄天之宝不落凡手」的原著设定。
  { name: '仙品', color: '#8ff0e0', glow: 'rgba(143,240,224,1)' }
];

// 装备槽位
window.SLOTS = [
  { id: 'weapon',   name: '兵器', icon: '⚔', hint: '飞剑、短兵、重器' },
  { id: 'armor',    name: '护甲', icon: '🛡', hint: '道袍、软甲、寒衣' },
  { id: 'trinket',  name: '佩饰', icon: '🔮', hint: '珠玉、木牌、雷珠' },
  { id: 'talisman', name: '符宝', icon: '📜', hint: '贴身符宝，不损不耗' }
];

// ---------- 材料（不进成品掉落池，按地图 mats 配置掉落，也可用于炼制） ----------
window.MATERIALS = [
  // 灵草
  { id: 'm_chijing',  name: '赤精草',   icon: '🌾', rarity: 0, desc: '后山岩缝里长的低阶灵草，止血生肌，最寻常的一味药。' },
  { id: 'm_huangjing',name: '黄精',     icon: '🌿', rarity: 0, desc: '山阴处挖的老黄精，补气。凡人也吃，修士也吃。' },
  { id: 'm_zihua',    name: '紫猴花',   icon: '🌸', rarity: 1, desc: '花开如猴面，紫得发乌。筑基丹三味主药之一。' },
  { id: 'm_tianling', name: '天灵果',   icon: '🍒', rarity: 2, desc: '生于灵气汇聚处，果皮薄得能看见里面的光。筑基丹主药。' },
  { id: 'f_peiyuan',  name: '养精丹方', icon: '📜', rarity: 3, req: 1,
    desc: '墨大夫那本药书里夹的一页，写着养精丹的君臣佐使。有了它，炉子才认得这味药。', unique: true },
  { id: 'f_huanglong', name: '黄龙丹方', icon: '📜', rarity: 3, req: 1,
    desc: '太南小会上一个散修出手的玉简，边角已经磨花了。', unique: true },
  { id: 'f_zhuji',   name: '筑基丹方', icon: '📜', rarity: 4, req: 1,
    desc: '黄枫谷百药园里抄来的，三味主药的分量分毫不能差。筑基丹之所以金贵，一半在这张纸上。', unique: true },
  { id: 'f_jinsui',  name: '金髓丸方', icon: '📜', rarity: 4, req: 1,
    desc: '乱星海市面流出来的方子，主药是妖兽骨髓。天星城的丹师靠它吃饭。', unique: true },
  { id: 't_shengxian', name: '升仙令', icon: '🎴', rarity: 4, slot: 'trinket', req: 1,
    desc: '金光上人贴身收着的那枚。七派认令不认人——持令登门，换一个入门的名分，还配一枚筑基丹。',
    effect: { xpMul: 0.05 }, unique: true },
  { id: 'm_yusuizhi', name: '玉髓芝',   icon: '🍄', rarity: 3, desc: '数百年才成的一朵，芝心凝着精纯灵力的玉液。筑基丹三味主药之首。' },
  { id: 'm_longlin',  name: '龙鳞果',   icon: '🥭', rarity: 2, desc: '果皮层层如鳞。百年一熟，药园里也只剩三株。' },
  { id: 'm_nishang',  name: '霓裳草',   icon: '🌺', rarity: 3, desc: '叶随光变色。撒在礁盘上能引妖，凝翠岛一带最多。' },
  // 矿石
  { id: 'm_jingtie',  name: '精铁',     icon: '🪨', rarity: 0, desc: '凡矿中挑出的好铁，炼低阶法器够用。' },
  { id: 'm_chitong',  name: '赤铜',     icon: '🟤', rarity: 1, desc: '铜里带赤纹，导灵比精铁顺。' },
  { id: 'm_xuantie',  name: '玄铁',     icon: '⬛', rarity: 2, desc: '黑得沉手，寻常炉火烧不化。' },
  { id: 'm_hantie',   name: '寒铁',     icon: '🧊', rarity: 3, desc: '矿脉深处或寒潭底下才有，握久了掌心发麻。' },
  { id: 'm_yusui',    name: '玉髓',     icon: '💠', rarity: 2, desc: '玉石里凝出的一线髓，刻符最灵。' },
  // 灵物
  { id: 'm_wolfdan',  name: '妖狼内丹', icon: '🔴', rarity: 1, desc: '百年狼妖的丹丸，腥气冲鼻，入药却是好东西。' },
  { id: 'm_shedan',   name: '蛇胆',     icon: '🟢', rarity: 0, desc: '青纹毒蛇的胆，苦得舌根发麻。' },
  { id: 'm_chongjing',name: '虫母晶核', icon: '🟣', rarity: 3, desc: '噬灵虫母体内那枚晶核，捏碎了满手灵光。' },
  { id: 'm_xuesha',   name: '血煞珠',   icon: '🩸', rarity: 3, desc: '魔道修士炼的血珠，煞气未散，慎用。' },
  { id: 'm_shihui',   name: '尸傀骨粉', icon: '⚪', rarity: 1, desc: '尸傀焚后的白灰，炼器时掺一点能定形。' },
  // 符料
  { id: 'm_fuzhi',    name: '空白符纸', icon: '📄', rarity: 0, desc: '黄纸裁好，未着墨。' },
  { id: 'm_lingmo',   name: '灵墨',     icon: '🖌', rarity: 1, desc: '掺了妖血的墨，画在符纸上才能留住灵光。' }
];

// ---------- 成品：丹药 / 符箓 / 秘籍 / 装备 ----------
// effect 字段：healPct / maxhp / dmg / atkSpd / spd / pickup / regen / armor / xpMul / crit / xp
// slot 存在 = 装备（不立即生效，需在洞府佩上）
// req 存在 = 最低角色等级，不足则看得见用不上
window.ITEMS = [
  // ==== 丹药：服下即见功效。限时增益，时辰一过自行散去 ====
  // craftOnly: 'alchemy' = 须开炉炼丹才得，绝不直接掉落（掉落池见 Items.dropPool）
  // 只掉材料，丹要自己炼 —— 筑基丹如此，止血丹亦如此
  { id: 'huiqi',    name: '止血丹',   rarity: 0, icon: '🔴', req: 1, desc: '回血 30%，其后 12 息持续回血。七玄门药庐最寻常的一味，止血生肌', craftOnly: 'alchemy',
    effect: { healPct: 0.30 }, buffs: [{ stat: 'regen', amount: 2.0, dur: 12 }] },
  { id: 'lingzhi',  name: '辟谷丹',   rarity: 0, icon: '🍄', req: 1, desc: '服下 20 息不思饮食，气血自回。赶路闭关都靠它', craftOnly: 'alchemy',
    effect: { healPct: 0.12 }, buffs: [{ stat: 'regen', amount: 1.5, dur: 20 }] },
  { id: 'lingshi',  name: '低阶灵石', rarity: 0, icon: '💎', req: 1, desc: '捏碎了吞吐灵气，得 8 点修为', effect: { xp: 8 } },
  { id: 'peiyuan',  name: '养精丹',   rarity: 2, icon: '🟠', req: 56, desc: '回血 45%，其后 15 息持续回血。结丹修士随身的家底', craftOnly: 'alchemy',
    effect: { healPct: 0.45 }, buffs: [{ stat: 'regen', amount: 2.5, dur: 15 }] },
  { id: 'huanglong',name: '黄龙丹',   rarity: 2, icon: '🟡', req: 8, desc: '30 息内所得修为 +25%。炼气期最实在的一味', craftOnly: 'alchemy',
    buffs: [{ stat: 'xpMul', amount: 0.25, dur: 30 }] },
  { id: 'jinsui',   name: '金髓丸',   rarity: 3, icon: '🟤', req: 12, desc: '25 息内伤害 +20%、出手更急。丹成色如金髓，入口滚烫', craftOnly: 'alchemy',
    buffs: [{ stat: 'dmg', amount: 0.20, dur: 25 }, { stat: 'atkSpd', amount: 0.10, dur: 25 }] },
  { id: 'zhuji',    name: '筑基丹',   rarity: 4, icon: '🟣', req: 35, desc: '伤害 +25%，上限 +60，回血 +1.2。服下可窥筑基之门', craftOnly: 'alchemy', effect: { dmg: 0.25, maxhp: 60, regen: 1.2 } },

  // ==== 符箓：催动即见效，限时增益 ====
  { id: 'qingyan',  name: '轻身符',   rarity: 1, icon: '📜', req: 1,  desc: '身轻如燕，18 息内移速 +22%', buffs: [{ stat: 'spd', amount: 0.22, dur: 18 }] },
  { id: 'xueshen',  name: '火弹符',   rarity: 1, icon: '🔥', req: 3,  desc: '催动即一团火，15 息内伤害 +28%', buffs: [{ stat: 'dmg', amount: 0.28, dur: 15 }] },
  { id: 'shenxing', name: '神行符',   rarity: 1, icon: '📜', req: 36, desc: '贴腿即走，22 息内移速 +30%。筑基修士赶路逃命都靠它', buffs: [{ stat: 'spd', amount: 0.30, dur: 22 }] },
  { id: 'jifeng',   name: '爆裂符',   rarity: 2, icon: '💥', req: 36, desc: '15 息内重击 +15%、伤害 +15%。符成带煞气', buffs: [{ stat: 'crit', amount: 0.15, dur: 15 }, { stat: 'dmg', amount: 0.15, dur: 15 }] },
  { id: 'qiannian', name: '清心符',   rarity: 3, icon: '🪷', req: 36, desc: '清心明神，20 息内减伤 +12%、缓缓回血', buffs: [{ stat: 'armor', amount: 0.12, dur: 20 }, { stat: 'regen', amount: 1.0, dur: 20 }] },
  { id: 'lianqi',   name: '破禁符',   rarity: 3, icon: '📕', req: 56, desc: '专破禁制屏障，18 息内伤害 +30%、重击 +10%', buffs: [{ stat: 'dmg', amount: 0.30, dur: 18 }, { stat: 'crit', amount: 0.10, dur: 18 }] },
  { id: 'bichen',   name: '避尘符',   rarity: 3, icon: '🛡', req: 56, desc: '尘垢不侵，25 息内减伤 +18%', buffs: [{ stat: 'armor', amount: 0.18, dur: 25 }] },
  { id: 'chuansong',name: '空间传送符', rarity: 4, icon: '🌀', req: 82, desc: '撕开空间就走，8 息内移速 +55%。元婴修士的保命底牌', buffs: [{ stat: 'spd', amount: 0.55, dur: 8 }] },
  { id: 'tishen',   name: '替身傀儡', rarity: 4, icon: '🪆', req: 82, desc: '替你挨这一下，20 息内减伤 +25%', buffs: [{ stat: 'armor', amount: 0.25, dur: 20 }] },
  { id: 'baoliebao',name: '爆裂符宝', rarity: 4, icon: '💥', req: 82, desc: '符宝催动，20 息内伤害 +40%。用一次少一次', buffs: [{ stat: 'dmg', amount: 0.40, dur: 20 }] },

  // ==== 秘籍 / 灵液：剧情所得 ====
  { id: 'changchun',name: '长春功残卷', rarity: 3, icon: '📖', req: 6,  desc: '每秒回血 +0.6，修为 +20%。墨大夫授的引气之法，只此一份', effect: { regen: 0.6, xpMul: 0.2 }, unique: true },
  { id: 'zhangtian',name: '掌天瓶绿液', rarity: 4, icon: '🍶', req: 15, desc: '伤害 +20%，上限 +30，回血 +1。瓶底积了三年的一滴，兑开能服一次', effect: { dmg: 0.2, maxhp: 30, regen: 1 }, unique: true },
  { id: 'jipin',    name: '极品灵石', rarity: 4, icon: '💎', req: 112, desc: '化开供闭关之需，30 息内修为 +50%', buffs: [{ stat: 'xpMul', amount: 0.50, dur: 30 }] },

  // ==== 兵器（装备）====
  { id: 'jingtie',  name: '精铁短剑',   rarity: 1, icon: '🗡', slot: 'weapon', req: 3,  desc: '伤害 +10%，攻速 +4%。七玄门铁匠打的制式短剑', effect: { dmg: 0.10, atkSpd: 0.04 } },
  { id: 'money_sword', name: '金钱剑',  rarity: 2, icon: '🪙', slot: 'weapon', req: 5,  desc: '伤害 +16%，攻速 +3%。一串铜钱炼成的飞剑，韩立早年第一件本命法器', effect: { dmg: 0.16, atkSpd: 0.03 } },
  { id: 'chitong',  name: '赤铜短戟',   rarity: 2, icon: '🔱', slot: 'weapon', req: 9,  desc: '伤害 +14%，上限 +10。赤铜导灵，斩妖不卷刃', effect: { dmg: 0.14, maxhp: 10 } },
  { id: 'qingzhu',  name: '青竹剑',     rarity: 2, icon: '⚔', slot: 'weapon', req: 7,  desc: '伤害 +18%，移速 +3%。竹中取青，轻而不飘', effect: { dmg: 0.18, spd: 0.03 } },
  { id: 'moyu',     name: '墨玉飞刀',   rarity: 3, icon: '🔪', slot: 'weapon', req: 12, desc: '伤害 +22%，重击 +6%。飞出无声，回手带血', effect: { dmg: 0.22, crit: 0.06 } },
  { id: 'xuantie',  name: '玄铁重剑',   rarity: 3, icon: '🗡', slot: 'weapon', req: 16, desc: '伤害 +34%。重得压手，一剑下去山石开裂', effect: { dmg: 0.34 } },

  // ==== 护甲（装备）====
  { id: 'a_bu',     name: '粗布道袍',   rarity: 0, icon: '👕', slot: 'armor', req: 1,  desc: '上限 +10，减伤 2%。杂役发的，洗得发白', effect: { maxhp: 10, armor: 0.02 } },
  { id: 'a_lupi',   name: '兽皮软甲',   rarity: 1, icon: '🥋', slot: 'armor', req: 4,  desc: '上限 +18，减伤 5%。山里猎户的手艺', effect: { maxhp: 18, armor: 0.05 } },
  { id: 'a_ruanwei',name: '金丝软甲',     rarity: 2, icon: '🥋', slot: 'armor', req: 9,  desc: '上限 +30，减伤 8%。金丝密织，轻软护身', effect: { maxhp: 30, armor: 0.08 } },
  { id: 'a_hanyu',  name: '寒玉甲',     rarity: 3, icon: '🧊', slot: 'armor', req: 14, desc: '上限 +45，减伤 11%。贴在身上，血都是凉的', effect: { maxhp: 45, armor: 0.11 } },
  { id: 'a_xuangui',name: '玄龟甲',     rarity: 4, icon: '🐢', slot: 'armor', req: 20, desc: '上限 +70，减伤 15%。龟甲磨的，压在身上像背了口井', effect: { maxhp: 70, armor: 0.15 } },

  // ==== 佩饰（装备）====
  { id: 't_mupai',  name: '旧木牌',     rarity: 0, icon: '🪵', slot: 'trinket', req: 1,  desc: '修为 +3%。三叔给的，说是保平安', effect: { xpMul: 0.03 } },
  { id: 'juling',   name: '聚灵珠',     rarity: 2, icon: '🔮', slot: 'trinket', req: 6,  desc: '拾取 +30%，修为 +8%。灵气自己往身上靠', effect: { pickup: 0.3, xpMul: 0.08 } },
  { id: 't_xuanyu', name: '玄玉珠',     rarity: 3, icon: '⚪', slot: 'trinket', req: 13, desc: '每秒回血 +0.8，上限 +20。玉里像有水在走', effect: { regen: 0.8, maxhp: 20 } },
  { id: 't_tianlei',name: '天雷子',     rarity: 4, icon: '🟣', slot: 'trinket', req: 22, desc: '重击 +12%，伤害 +15%。摸上去指尖发麻', effect: { crit: 0.12, dmg: 0.15 } },
  { id: 't_zhangtie',name: '张铁的铁牌', rarity: 2, icon: '🪙', slot: 'trinket', req: 5, desc: '上限 +22，减伤 4%。铁牌边角磨得发亮，背面刻着一个「铁」字', effect: { maxhp: 22, armor: 0.04 }, unique: true },

  // ==== 符宝（装备）====
  { id: 'fb_huo',   name: '火球符宝',   rarity: 2, icon: '🔥', slot: 'talisman', req: 5,  desc: '伤害 +12%，重击 +3%。贴在袖里，出手就是一团火', effect: { dmg: 0.12, crit: 0.03 } },
  { id: 'fb_bing',  name: '冰锥符宝',   rarity: 2, icon: '❄', slot: 'talisman', req: 8,  desc: '伤害 +10%，移速 +3%。锥出成线，落地成霜', effect: { dmg: 0.10, spd: 0.03 } },
  { id: 'huyu',     name: '护身玉符',   rarity: 3, icon: '🛡', slot: 'talisman', req: 10, desc: '减伤 10%，上限 +25。三道灵纹，替他挨过一刀', effect: { armor: 0.10, maxhp: 25 } },
  { id: 'fb_feng',  name: '风刃符宝',   rarity: 3, icon: '🌀', slot: 'talisman', req: 12, desc: '攻速 +14%，伤害 +8%。刃过之处风声先到', effect: { atkSpd: 0.14, dmg: 0.08 } }
];

// 索引：成品 + 材料
for (const m of MATERIALS) m.mat = true;
window.ALL_ITEMS = ITEMS.concat(MATERIALS);

// 分解：装备拆成材料（重复的、用不上的，都能回炉）
// unique 是「世上只有一件」的东西（虚天残图、大挪移令、洪荒古宝、张铁的铁牌…），不给拆
window.decomposeOf = function (item) {
  if (!item || !item.slot || item.unique) return [];
  const r = item.rarity || 0;
  const out = [];
  if (item.slot === 'weapon') {
    out.push(['m_jingtie', 2 + r]);
    if (r >= 2) out.push(['m_yusui', r - 1]);
    if (r >= 3) out.push(['m_xuantie', 1]);
  } else if (item.slot === 'armor') {
    out.push(['m_jingtie', 1 + r]);
    if (r >= 2) out.push(['m_shihui', 1]);
    if (r >= 3) out.push(['m_hantie', 1]);
  } else if (item.slot === 'trinket') {
    out.push(['m_yusui', 1 + Math.floor(r / 2)]);
    if (r >= 3) out.push(['m_chongjing', 1]);
  } else {
    out.push(['m_fuzhi', 2 + r]);
    if (r >= 1) out.push(['m_lingmo', 1]);
    if (r >= 3) out.push(['m_xuesha', 1]);
  }
  return out;
};

window.Items = {
  byRarity(r) { return ITEMS.filter(i => i.rarity === r && !i.slot); },
  byRarityAll(r) { return ITEMS.filter(i => i.rarity === r); },
  // 掉落池：排除「必须炼制才有」的丹药、支线专属物，以及法诀 ——
  // 法诀只走「剧情奖励 / 坊市购买 / 特定身怀此功者掉落」，不进随机掉落 pool
  //
  // opt.minReq：按修为门槛过滤。灵界的怪不该掉精铁短剑/粗布道袍这类人界低阶成品，
  //            所以灵界图传 96（化神级起步）。人界图不传，行为与从前完全一致。
  // noDrop：破境丹这类「一炉只该有一枚」的东西，任何怪都不该随机爆。
  dropPool(r, opt) {
    const minReq = (opt && opt.minReq) || 0;
    const maxReq = (opt && opt.maxReq) || 0;   // 上限：别让炼虚修士在第二张灵界图就捡到大乘器物
    return ITEMS.filter(i => i.rarity === r && !i.craftOnly && !i.unique && !i.teach && !i.noDrop
      && (i.req || 1) >= minReq
      && (!maxReq || (i.req || 1) <= maxReq));
  },
  droppable(id) { const it = this.get(id); return !!(it && !it.craftOnly && !it.unique && !it.mat && !it.teach); },
  gearOfSlot(slot) { return ITEMS.filter(i => i.slot === slot); },
  get(id) { return ALL_ITEMS.find(i => i.id === id) || null; },
  isGear(id) { const it = this.get(id); return !!(it && it.slot); },
  mat(id) { return MATERIALS.find(i => i.id === id) || null; },
  // tier: 0 普通怪 / 1 精英 / 2 Boss；boost 为难度带来的稀有度加权次数
  rollRarity(tier, boost) {
    const table = [
      [72, 21, 6, 1, 0],
      [12, 33, 33, 18, 4],
      [0, 6, 24, 45, 25]
    ][tier] || [72, 21, 6, 1, 0];
    const total = table.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let out = 0;
    for (let i = 0; i < table.length; i++) { r -= table[i]; if (r <= 0) { out = i; break; } }
    for (let k = 0; k < (boost || 0); k++) if (Math.random() < 0.34) out = Math.min(4, out + 1);
    return out;
  },
  roll(tier, boost, opt) {
    // Boss 本就在高稀有度池里，难度加权减半，避免死境一掉全是至宝
    let b = boost || 0;
    if (tier >= 2) b = Math.max(0, b - 1);
    const r = this.rollRarity(tier, b);
    const o = opt || {};
    const minReq = o.minReq || 0;
    // hardMinReq：允许在门槛附近放宽，但**不许降到这条线以下**
    const hard = (o.hardMinReq != null) ? o.hardMinReq : minReq;
    for (const floor of [minReq, Math.max(hard, minReq - 24), Math.max(hard, minReq - 48)]) {
      const pool = this.dropPool(r, { minReq: floor, maxReq: o.maxReq });
      if (pool.length) return U.pick(pool);
    }
    if (minReq > 0) {
      // 有门槛时只许往**上**借一档（灵界的珍品池空着 → 借至宝池），
      // 绝不顺着往下找，否则「灵界不掉人界垃圾」立刻就破了。
      for (let k = r + 1; k <= 4; k++) {
        const p3 = this.dropPool(k, { minReq: hard, maxReq: o.maxReq });
        if (p3.length) return U.pick(p3);
      }
      return null;   // 真的没有：交回调用方（灵界那边会改掉一份灵物）
    }
    // 人界原有兜底：该稀有度全是炼制物时，往下找一件可掉的
    for (let k = r; k >= 0; k--) { const p2 = this.dropPool(k, { minReq: 0 }); if (p2.length) return U.pick(p2); }
    return ITEMS[0];
  }
};
