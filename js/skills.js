// 功法（可升级技能）定义 —— 按《凡人修仙传》人界五境排列，每门都带"怎么用"的属性
//
// type 决定这门功法在战斗里怎么走（落实「该近战就近战、该远程就远程」）：
//   passive    常驻被动：学会即在身上运着，不占装配槽（回血/移速/爆发概率一类）
//   ranged     远程定向弹道（飞剑、剑气、血煞）—— 瞄准最近之敌打出去
//   ranged_aoe 远程群攻（追踪火蛇 / 中心爆发 / 扇形喷射 / 天雷）
//   aura       近身领域：环绕护体 或 踏地领域（贴身才生效，真近战）
//
// atk   = 进攻参数（只有 ranged / ranged_aoe / aura 用得上）
//   kind      beam 定向多段 | homing 追踪 | spread 扇形 | burst 中心爆发 | thunder 天落雷 | orbit 环绕 | field 领域
//   base/perLv      伤害 = base + perLv × 层数
//   cd              间隔秒数；cdBase/cdPerLv/cdMin 用于随层数缩短的间隔
//   countBase/countPerLv 弹数 / 落雷数；pierceBase/piercePerLv 穿透
//   range      锁敌范围；home 是否追踪；life 弹寿命；spread 扇形张角
//   rad        环绕轨道半径；radBase/radPerLv 爆发/领域半径
//   slow       领域减速比例（0~1）；cdHit 领域/环绕每次命中同一敌人的间隔
// effect= 被动加成（只有 passive 用得上，按「层数」累加）
//   spd atkSpd pickup regen xpMul dmg crit maxhp armor herb
//
// minLv: 入门最低境界等级 —— 境界不到，连门都入不了
// 层数上限另受境界封顶（realmSkillCap）：炼气 3、筑基 4、结丹 5、元婴 6、化神 7、炼虚/合体 8、大乘/渡劫 9、真仙 10、金仙 11、太乙 12、大罗 13
// 学过 ≠ 身上在用：ipher actives 要装到身上才起效；passive 学会即常驻。
// 大境界一破，身上的旧功法自动卸下，只留一门主力。

window.SKILLS = [
  // ============ 炼气期：七玄门根基 → 太南小会 → 血色禁地 → 天星城 ============
  { id: 'sword', name: '控物术', icon: '🗡', max: 6, minLv: 1, main: true, type: 'ranged',
    atk: { kind: 'beam', base: 8, perLv: 3, cd: 0.85, countBase: 1, countPerLv: 0.5, pierceBase: 1, piercePerLv: 1 / 3, range: 360, home: false, life: 1.4, vfx: 'qingmang' },
    desc: '以神念御物，一道青光直取最近的敌人。长春功所含的基础法术，韩立起步就靠它' },
  { id: 'fire', name: '火弹术', icon: '🔥', max: 5, minLv: 5, type: 'ranged_aoe',
    atk: { kind: 'beam', base: 9, perLv: 4, cd: 2.0, countBase: 1, countPerLv: 0.5, range: 520, home: false, life: 1.5, pierceBase: 1, vfx: 'fire' },
    desc: '长春功所含的基础法术：一团火球直直打出去，撞上就炸。韩立最早会的攻击手段' },
  { id: 'orb', name: '金光罩', icon: '🛡', max: 5, minLv: 8, type: 'aura',
    atk: { kind: 'orbit', base: 5, perLv: 2, rad: 36, countBase: 0, countPerLv: 1, cdHit: 0.4, vfx: 'gang' },
    desc: '金光上人那门护体金光：一层金罩绕身流转，近身者自伤。韩立夺来改成了自己的' },
  { id: 'nova', name: '定神符', icon: '✨', max: 5, minLv: 12, type: 'ranged_aoe',
    atk: { kind: 'burst', base: 10, perLv: 5, cdBase: 4.5, cdPerLv: 0.3, cdMin: 2.5, radBase: 80, radPerLv: 10, range: 9999, vfx: 'gold' },
    desc: '定神符一抖，金光炸开，震退近身邪祟。长春功中所含的安神破幻之符' },
  { id: 'frost', name: '冰冻术', icon: '❄', max: 5, minLv: 20, type: 'aura',
    atk: { kind: 'field', base: 2, perLv: 1, radBase: 60, radPerLv: 8, slow: 0.45, cdHit: 0.5, vfx: 'ice' },
    desc: '长春功所含冰冻术：身周五丈寒气凝结，踏入者行动迟滞' },
  { id: 'changchun', name: '长春功', icon: '🌱', max: 6, minLv: 1, type: 'passive',
    effect: { regen: 0.5, xpMul: 0.05 },
    desc: '墨大夫传授的引气吐纳根基，韩立炼气期的根本功法。缓缓回血，修为略进' },
  { id: 'swift', name: '罗烟步', icon: '💨', max: 5, minLv: 1, type: 'passive',
    effect: { spd: 0.09 },
    desc: '血色禁地所得身法真传，步法如烟，移速大增' },
  { id: 'haste', name: '雷遁术', icon: '⚡', max: 5, minLv: 15, type: 'passive',
    effect: { atkSpd: 0.08 },
    desc: '吐纳如雷，出手更急。所有攻击间隔随之缩短，韩立后期参悟的急攻之术' },
  { id: 'gourd', name: '灵葫诀', icon: '🍶', max: 5, minLv: 25, type: 'passive',
    effect: { maxhp: 18, herb: 0.04, drop: 0.012 },
    desc: '本命灵葫在身，生命上限提升，灵草常落' },

  // ============ 筑基期：地火之屋 → 乱星海 ============
  { id: 'qingyuan', name: '青元剑诀', icon: '⚔', max: 7, minLv: 36, type: 'passive',
    effect: { dmg: 0.05, atkSpd: 0.02 },
    desc: '青元子创立的剑道根本，韩立筑基后期补全。御剑更利、出手更疾，是刻在他一辈子里的剑法' },
  { id: 'dayan', name: '大衍诀', icon: '📘', max: 7, minLv: 36, type: 'passive',
    effect: { xpMul: 0.05, crit: 0.015 },
    desc: '元神培炼之法，前四层。神识大增，出手更狠' },

  // ============ 结丹期：乱星海 → 虚天殿 ============
  { id: 'jianfen', name: '剑影分光术', icon: '🗡', max: 6, minLv: 56, type: 'ranged',
    atk: { kind: 'beam', base: 14, perLv: 6, cd: 1.5, countBase: 2, countPerLv: 0.5, range: 460, spread: 0.26, pierceBase: 2, life: 1.3, vfx: 'swordarray' },
    desc: '青元剑诀第三层神通：一剑化数影，同出同归。影是虚的，剑是真的' },
  { id: 'shayao', name: '煞妖诀', icon: '🩸', max: 6, minLv: 56, type: 'aura',
    atk: { kind: 'orbit', base: 8, perLv: 4, rad: 42, countBase: 1, countPerLv: 1, cdHit: 0.45, vfx: 'blood' },
    desc: '玄阴经里炼煞气为攻杀的一路：煞气绕身，触者即伤。修得越深，环越宽' },
  { id: 'xueling', name: '血灵钻', icon: '🩸', max: 6, minLv: 60, type: 'ranged',
    atk: { kind: 'beam', base: 26, perLv: 10, cd: 2.4, countBase: 1, countPerLv: 0.34, range: 520, pierceBase: 3, life: 1.2, vfx: 'blood' },
    desc: '煞丹术体系的杀招：精血凝成一枚钻，指劲打出，专破护体灵光' },
  { id: 'mingwang', name: '明王诀', icon: '🧘', max: 5, minLv: 64, type: 'passive',
    effect: { armor: 0.05, maxhp: 60 },
    desc: '佛门炼体之法，借煞气淬身、化煞不伤神。痛是真痛，扛过去肉身就是一重法宝' },
  { id: 'jifeng', name: '疾风九变', icon: '🌀', max: 5, minLv: 60, type: 'passive',
    effect: { spd: 0.07, atkSpd: 0.04 },
    desc: '妖族禽修的身法：九转之间身形如风，配风雷翅可再快一线' },
  { id: 'xuelian', name: '血炼神光', icon: '🩸', max: 6, minLv: 56, type: 'ranged',
    atk: { kind: 'beam', base: 12, perLv: 5, cd: 1.8, countBase: 1, countPerLv: 0.34, range: 480, pierceBase: 2, life: 1.3, vfx: 'blood' },
    desc: '玄阴经附属的血炼之法：一道血光打出去，吞了对方的精血再回来养自己' },
  { id: 'sanyan', name: '三焰扇', icon: '🪭', max: 6, minLv: 56, type: 'ranged_aoe',
    atk: { kind: 'spread', base: 11, perLv: 4, cd: 2.6, countBase: 3, countPerLv: 0.5, range: 480, home: false, life: 1.2, spread: 0.5, pierceBase: 1, vfx: 'fan' },
    desc: '虚天殿所得古宝扇形仿法，三色火扇一扇到底，正面一片都过不去' },
  { id: 'fenglei', name: '风雷翅', icon: '🪽', max: 6, minLv: 56, type: 'passive',
    effect: { spd: 0.12 },
    desc: '乱星海炼器所得飞行翼，背生双翼，闪转腾挪都快人一线' },
  { id: 'tongbao', name: '洞漩金光', icon: '🔓', max: 6, minLv: 56, type: 'passive',
    effect: { pickup: 0.3 },
    desc: '虚天残图所藏敛财储物之术，灵石灵草自己往身上滚' },

  // ============ 元婴期：天南 → 坠魔谷 → 大晋 ============
  { id: 'dageng', name: '大庚剑阵', icon: '⚔', max: 7, minLv: 82, type: 'ranged',
    atk: { kind: 'beam', base: 20, perLv: 8, cd: 2.2, countBase: 4, countPerLv: 0.34, range: 560, spread: 0.3, pierceBase: 3, life: 1.5, vfx: 'swordarray' },
    desc: '庚精入剑，青竹蜂云剑为骨：一阵五道剑气齐出，元婴期的主杀招' },
  { id: 'tiandu', name: '天都尸火', icon: '🔥', max: 7, minLv: 82, type: 'ranged_aoe',
    atk: { kind: 'burst', base: 22, perLv: 9, cdBase: 5.0, cdPerLv: 0.3, cdMin: 3.0, radBase: 110, radPerLv: 12, range: 9999, vfx: 'fire' },
    desc: '魔道尸火，焚的是魂不是身。一点落下去，方圆十丈阴火自燃' },
  { id: 'cuigu', name: '淬骨诀', icon: '🦴', max: 5, minLv: 82, type: 'passive',
    effect: { maxhp: 130, regen: 0.6 },
    desc: '金蛟王身上夺来的炼体法：把骨头当法宝淬，淬成了，单臂举万斤' },
  { id: 'tuotian', name: '托天魔功', icon: '🐉', max: 5, minLv: 86, type: 'passive',
    effect: { armor: 0.08, maxhp: 50 },
    desc: '乱星海的防御魔功：覆一层金鳞在皮肉下，寻常法宝打上去只留一道白痕' },
  { id: 'xueying', name: '血影遁', icon: '💨', max: 5, minLv: 86, type: 'passive',
    effect: { spd: 0.12, armor: 0.03 },
    desc: '燃精血换一线生机：一遁百里，回头时只剩一道血影' },
  { id: 'dayan2', name: '大衍诀·后三层', icon: '📗', max: 7, minLv: 82, type: 'passive',
    effect: { xpMul: 0.06, crit: 0.02 },
    desc: '大衍神君亲手补全的那半卷。神识通天，看一眼就能想明白对方下一招往哪去' },
  { id: 'leishen', name: '辟邪神雷', icon: '🌩', max: 7, minLv: 82, type: 'ranged_aoe',
    atk: { kind: 'thunder', base: 14, perLv: 6, cd: 2.4, countBase: 1, countPerLv: 0.34, range: 560, vfx: 'thunder' },
    desc: '韩立专修克制魔功的神雷，以金雷竹为引，自天劈落。魔道见此雷，先矮三分' },
  { id: 'qinxian', name: '惊神刺', icon: '🎻', max: 7, minLv: 82, type: 'ranged_aoe',
    atk: { kind: 'burst', base: 16, perLv: 6, cdBase: 4.2, cdPerLv: 0.25, cdMin: 2.6, radBase: 120, radPerLv: 16, range: 9999, vfx: 'gold' },
    desc: '元婴期音攻手段，魔音化作环形波纹荡开，远近皆伤' },
  { id: 'shishen', name: '失神刺', icon: '🧠', max: 7, minLv: 102, type: 'ranged',
    atk: { kind: 'homing', base: 9, perLv: 4, cd: 2.6, countBase: 2, countPerLv: 0.34, range: 520, pierce: 1, life: 2.2, vfx: 'gold', stun: 0.65 },
    desc: '大衍诀衍生的神识之术：一缕神念扎进识海，人不伤，神先懵。中者当场僵住' },
  { id: 'huashen', name: '身外化身', icon: '👤', max: 5, minLv: 110, type: 'passive',
    effect: { dmg: 0.04 }, avatar: true,
    desc: '玄阴经里的分神之法：以曲魂养出一具化身，替你出手。它打它的，你打你的' },
  { id: 'jzhen', name: '剑阵圆满', icon: '🌀', max: 7, minLv: 112, type: 'aura',
    atk: { kind: 'orbit', base: 12, perLv: 5, rad: 78, countBase: 4, countPerLv: 0.5, cdHit: 0.35, vfx: 'swordarray' },
    desc: '青蟠剑阵成了：四柄飞剑绕身不急不缓，进圈的就挨剑。剑阵一圆，人便是一处绝地' },
  { id: 'heisha', name: '黑煞修罗功', icon: '👹', max: 7, minLv: 102, type: 'ranged_aoe',
    atk: { kind: 'burst', base: 20, perLv: 8, cdBase: 4.8, cdPerLv: 0.3, cdMin: 2.8, radBase: 100, radPerLv: 11, range: 9999, vfx: 'blood' },
    desc: '玄阴经里的修罗一路：一身黑煞鼓到极处炸开，三尺之内尽成血雾' },
  { id: 'jinshen', name: '禁神术', icon: '🔒', max: 7, minLv: 112, type: 'ranged',
    atk: { kind: 'homing', base: 10, perLv: 4, cd: 3.2, countBase: 1, countPerLv: 0.2, range: 520, life: 2.4, vfx: 'gold', stun: 1.15 },
    desc: '锁神而非伤身：一道禁制扣住对方神识，人还站着，念头动不了' },
  { id: 'lihun', name: '离魂术', icon: '👁', max: 6, minLv: 102, type: 'ranged',
    atk: { kind: 'homing', base: 11, perLv: 5, cd: 2.2, countBase: 2, countPerLv: 0.34, range: 480, life: 2.0, vfx: 'blood', stun: 0.45 },
    desc: '阴术之一：把魂往外勾一把，对方愣神的工夫，够你走完一招' },
  { id: 'mengyin', name: '梦引术', icon: '💤', max: 6, minLv: 110, type: 'ranged',
    atk: { kind: 'homing', base: 7, perLv: 3, cd: 2.0, countBase: 3, countPerLv: 0.34, range: 500, life: 2.2, vfx: 'gold', stun: 0.3 },
    desc: '一缕引梦之气渡过去，对方眼里还在打，人已经睡了一瞬' },
  { id: 'huanxing', name: '换形诀', icon: '🎭', max: 5, minLv: 112, type: 'passive',
    effect: { armor: 0.05, spd: 0.08 },
    desc: '换一副皮相行走：气息身形都改了，打起来也更容易脱身' },
  { id: 'fansheng', name: '梵圣真魔功', icon: '🕉', max: 6, minLv: 112, type: 'passive',
    effect: { armor: 0.06, maxhp: 110, dmg: 0.03 },
    desc: '明王诀走到尽头的模样：佛魔同体，肉身与法力一起压进骨头里' },
  { id: 'shadan', name: '煞丹术', icon: '🔴', max: 5, minLv: 112, type: 'passive',
    effect: { dmg: 0.07, maxhp: 60 },
    desc: '以煞凝丹的备用法门：正路走不通时，拿一身煞气硬压出一颗丹来' },
  { id: 'yuanci', name: '元磁神光', icon: '🌌', max: 7, minLv: 102, type: 'aura',
    atk: { kind: 'field', base: 10, perLv: 8, radBase: 90, radPerLv: 14, slow: 0.5, cdHit: 0.4, vfx: 'gravity' },
    desc: '元磁山炼化之后的重力神光，破化神的门。场中人动不了，还得一直挨' },
  { id: 'wuzi', name: '五子同心魔', icon: '👁', max: 7, minLv: 102, type: 'passive',
    effect: { crit: 0.05, dmg: 0.05 },
    desc: '昆吾山所得子母魔头操控法，五魔分神助战，出手更毒' },

  // ============ 化神期：人界之巅，只待飞升 ============
  { id: 'pojie', name: '破界符·空间诀', icon: '🌀', max: 7, minLv: 112, type: 'passive',
    effect: { xpMul: 0.05, pickup: 0.25 },
    desc: '玲珑所留的飞升之凭，空间之力加身。握着它，才知道什么叫界外还有界' }
];

// 境界封顶：一门功法能练到第几层，看人在哪一层
window.realmSkillCap = function (lv) {
  if (lv >= 580) return 13;  // 大罗（仙界篇）
  if (lv >= 520) return 12;  // 太乙（仙界篇）
  if (lv >= 460) return 11;  // 金仙（仙界篇）
  if (lv >= 420) return 10;  // 真仙
  if (lv >= 330) return 9;   // 渡劫
  if (lv >= 260) return 9;   // 大乘
  if (lv >= 200) return 8;   // 合体
  if (lv >= 150) return 8;   // 炼虚
  if (lv >= 112) return 7;   // 化神
  if (lv >= 82) return 6;    // 元婴
  if (lv >= 56) return 5;    // 结丹
  if (lv >= 36) return 4;    // 筑基
  return 3;                  // 炼气
};
window.skillCapById = function (id, lv) {
  const s = window.SKILLS.find(x => x.id === id);
  if (!s) return 0;
  return Math.min(s.max, window.realmSkillCap(lv));
};

// 身上能同时运几门「进攻型」功法：境界越高，能同时运转的越多
// 被动功法不占槽，学会即在身上运转
window.skillSlots = function (lv) {
  if (lv >= 580) return 11;  // 大罗（仙界篇）
  if (lv >= 520) return 10;  // 太乙（仙界篇）
  if (lv >= 460) return 9;   // 金仙（仙界篇）
  if (lv >= 330) return 8;   // 渡劫
  if (lv >= 260) return 7;   // 大乘
  if (lv >= 200) return 7;   // 合体
  if (lv >= 150) return 6;   // 炼虚
  if (lv >= 112) return 5;   // 化神
  if (lv >= 82) return 4;    // 元婴
  if (lv >= 56) return 3;    // 结丹
  if (lv >= 36) return 2;    // 筑基
  return 1;                  // 炼气：只运得动一门
};
window.skillById = function (id) { return window.SKILLS.find(x => x.id === id) || null; };
window.isPassiveSkill = function (id) {
  const s = window.skillById(id);
  return !!(s && s.type === 'passive');
};

// 进攻参数换算：数值由「层数」决定，练熟练层是真能变强的
window.skillAtk = {
  dmg(a, lv) { return (a.base || 0) + (a.perLv || 0) * lv; },
  count(a, lv) { return Math.max(1, Math.floor((a.countBase == null ? 1 : a.countBase) + (a.countPerLv || 0) * lv)); },
  pierce(a, lv) { return Math.max(1, Math.floor((a.pierceBase == null ? 1 : a.pierceBase) + (a.piercePerLv || 0) * lv)); },
  rad(a, lv) { return a.rad != null ? a.rad : ((a.radBase || 60) + (a.radPerLv || 0) * lv); },
  cd(a, lv) {
    if (a.cdBase != null) return Math.max(a.cdMin == null ? 0.3 : a.cdMin, a.cdBase - (a.cdPerLv || 0) * lv);
    return a.cd || 1;
  }
};
