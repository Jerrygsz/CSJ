// ============================================================================
// 出处补丁：把「没有任何获取途径」的道具，按原著挂回它该出现的地方
// ----------------------------------------------------------------------------
// 为什么要单独一个文件：这些道具散落在 items/maps/late*/enemies 里定义，
// 但要动的是「谁给、谁掉」，集中在这里一眼能看全，也方便以后审。
// 只在启动时改数据，不改任何逻辑。
// ============================================================================
(function () {
  const M = (id) => (window.MAPS || []).find(x => x.id === id);
  const E = (id) => (window.ENEMY_TYPES || {})[id];

  // 给某张图追加奖励（只加一次，重复调用不会叠加）
  function addTo(mapId, opts) {
    const m = M(mapId);
    if (!m) return;
    m.reward = m.reward || {};
    const rw = m.reward;
    if (opts.items) {
      rw.items = rw.items || [];
      for (const id of opts.items) if (rw.items.indexOf(id) < 0) rw.items.push(id);
    }
    if (opts.mats) {
      rw.mats = rw.mats || [];
      for (const [id, n] of opts.mats) if (!rw.mats.some(x => x[0] === id)) rw.mats.push([id, n]);
    }
    if (opts.eggs) {
      rw.eggs = rw.eggs || [];
      for (const id of opts.eggs) if (rw.eggs.indexOf(id) < 0) rw.eggs.push(id);
    }
  }
  // 给某种怪追加掉落材料
  function addDrop(mobId, ids) {
    const e = E(mobId);
    if (!e) return;
    e.mats = e.mats || [];
    for (const id of ids) if (e.mats.indexOf(id) < 0) e.mats.push(id);
  }
  // 给某座坊市上架（仅在原货单里没有时追加）
  function addShop(mapId, ids) {
    const m = M(mapId);
    if (!m || !m.shop) return;
    for (const id of ids) if (m.shop.indexOf(id) < 0) m.shop.push(id);
  }

  // ---------- 一、灵草：跟着「哪座山长什么草」走 ----------
  // 黄枫谷药园：韩立当药童伺弄的那片药圃，灵芝、赤精芝都是园里的常物
  addDrop('bandit', ['m_lingzhi']);
  addDrop('ghoul', ['m_chijing']);
  addTo('yaoyuan', { mats: [['m_lingzhi', 3]] });
  // 噬灵虫母：虫母体内的晶核
  addTo('yaoyuan', { items: [], mats: [['m_chongjing', 1]] });
  // 地火之屋：地肺之火边上长的火灵草
  addTo('jingu', { mats: [['m_huoling', 2]] });
  // 海猿岛：霓裳草是海岛上采的灵草（原著韩立在海岛采药）
  addTo('haian', { mats: [['m_nishang', 2]] });
  addDrop('haishou', ['m_nishang']);
  // 虚天殿：九曲灵参在殿里（玄谷拿它换韩立出手）
  addTo('xutian', { items: [], mats: [['m_jiuqu', 1]] });
  // 玛瑙角：炼九曲灵参丹的另一味主药，跟着九曲灵参一起在虚天殿一路
  addTo('xutian', { mats: [['m_manaojiao', 2]] });
  addDrop('guixiu', ['m_manaojiao']);
  // 灵渺园：上古修士的灵草园，灵烛果（造化丹的主药）就长在这里
  addTo('lingmiao', { mats: [['m_lingzhu', 2], ['m_lingzhi', 2]] });
  // 昆吾山：阴芝马、养魂木
  addTo('kunwu', { mats: [['m_yinzhi', 1], ['m_yanghun', 1]] });
  // 星宫：元磁神山的核心
  addTo('xinggong', { items: [], mats: [['m_yuanci', 1]] });

  // 上架的货得有价钱（坊市按 SHOP_STOCK 报价，缺价就上不了柜）
  window.SHOP_STOCK.push(
    { id: 'a_bu',        price: 40,   cat: 'qi' },   // 粗布道袍
    { id: 'a_lupi',      price: 120,  cat: 'qi' },   // 兽皮软甲
    { id: 't_xuanyu',    price: 260,  cat: 'qi' },   // 玄玉珠
    { id: 'bag_ling2',   price: 1800, cat: 'qi' },   // 特制灵兽袋
    { id: 'ring_ling',   price: 2600, cat: 'qi' },   // 灵兽环
    { id: 'm_siling',    price: 40,   cat: 'cai' },  // 饲灵丸
    // 丹药价：按原著里那几句实打实的数来算——
    // 一块中阶灵石换一百块低阶（原著明写的公认兑率），韩立当年身上是「两块中阶加近百块低阶」；
    // 昊元丹「每一颗都价值数千灵石」；降尘丹抵一颗丹再加一千灵石；千年灵药起拍五百。
    // 另：坊市卖成丹一定比自家开炉贵 —— 否则丹炉就白摆了。
    { id: 'lingzhi',     price: 30,   cat: 'dan' },  // 辟谷丹（几株百年草药换一瓶）
    { id: 'huanglong',   price: 400,  cat: 'dan' },  // 黄龙丹
    { id: 'jinsui',      price: 800,  cat: 'dan' },  // 金髓丸
    { id: 'peiyuan',     price: 130,  cat: 'dan' }   // 养精丹
  );

  // ---------- 二、灵兽：卵跟着「哪里孵出来的」走 ----------
  // 云翅鸟：墨大夫养来盯人的，七玄门后山就能掏到
  addTo('houshan', { items: ['egg_yunchi'] });
  // 墨蛟：血色禁地那口潭里的卵
  addTo('xuese', { items: ['egg_mojiao'] });

  // ---------- 三、器物：该谁给就谁给 ----------
  // 旧木牌：七玄门记名弟子的牌子，山门开局就有
  addTo('qixuan', { items: ['t_mupai'] });
  // 玄玉珠、粗布道袍、兽皮软甲：太南小会就能置办的散修行头（Lv1~13，炼气档）
  addShop('tainan', ['a_bu', 'a_lupi', 't_xuanyu']);
  // 灵兽袋 / 灵兽环：乱星海大城才有这种养兽的家什
  addShop('tianxing', ['bag_ling2', 'ring_ling']);
  // 饲灵丸：喂灵宠的，两座坊市都卖
  addShop('tainan', ['m_siling']);
  addShop('tianxing', ['m_siling']);
  // 丹药：原著里这两座坊市摆得出来的成丹。
  // （筑基丹不在此列 —— 原著「在外界找不到一颗」，只能自家开炉）
  addShop('tainan', ['huanglong', 'jinsui', 'peiyuan', 'lingzhi']);
  addShop('tianxing', ['huanglong', 'jinsui', 'peiyuan']);

  // ---------- 三·五、丹方：谁给的方子，就在哪里得到 ----------
  // 没有丹方，炉子不认这味药（筑基丹/养精丹/黄龙丹/金髓丸 四张）
  addTo('houshan', { items: ['f_peiyuan'] });    // 墨大夫药书里的一页
  addTo('tainan',  { items: ['f_huanglong'] });  // 散修出手的玉简
  addTo('yaoyuan', { items: ['f_zhuji'] });      // 百药园抄的筑基丹方
  addTo('tianxing', { items: ['f_jinsui'] });    // 乱星海市面的金髓丸方

  // ---------- 三·六、结丹期五门新功法：按原著出处发 ----------
  addTo('luoyun',  { items: ['sk_jianfen'] });   // 青元剑诀门内，落云宗补全第三层
  addTo('xinggong', { items: ['sk_shayao', 'sk_xueling'] });  // 玄阴经出自乱星海
  addTo('dajin',   { items: ['sk_mingwang'] });  // 大晋佛宗，佛门炼体
  addTo('waihai',  { items: ['sk_jifeng'] });    // 外星海妖修的身法

  // ---------- 三·七、结丹/元婴各门：按原著所在发放 ----------
  addTo('xinggong', { items: ['sk_xuelian', 'sk_tiandu', 'sk_tuotian'] });  // 玄阴经/乱星海魔功
  addTo('luoyun',   { items: ['sk_dageng'] });    // 落云宗炼成大庚剑阵
  addTo('waihai',   { items: ['sk_cuigu'] });     // 金蛟王身上夺来的淬骨诀
  addTo('yinluo',   { items: ['sk_xueying'] });   // 阴罗宗一带的血影遁

  // ---------- 三·八、化神两门：大衍诀出极西，化身出玄阴经 ----------
  addTo('jixi',     { items: ['sk_shishen'] });   // 极西之地千竹教，大衍诀一脉
  addTo('xinggong', { items: ['sk_huashen'] });   // 玄阴经分神之法

  // ---------- 三·九、化神余下诸门 ----------
  addTo('luoyun',   { items: ['sk_jzhen'] });                      // 青元剑诀圆满
  addTo('xinggong', { items: ['sk_heisha', 'sk_jinshen', 'sk_shadan'] });  // 玄阴经诸术
  addTo('kunwu',    { items: ['sk_lihun'] });
  addTo('yinming',  { items: ['sk_mengyin'] });
  addTo('yinluo',   { items: ['sk_huanxing'] });
  addTo('dajin',    { items: ['sk_fansheng'] });                   // 大晋佛魔同源

  // ---------- 五、破境药材：一局地图的保底产量 ----------
  // 为什么单开这一块：破境丹的成算本来就低（原著口径——宗师炼拿手的那味也只有一半，
  // 筑基丹这里定到一成），若还靠普通怪 1/5 的零散掉率凑料，一炉的料得刷好几遍图，
  // 玩着就只剩耗时间。所以给「产药图」挂一份配额：一次通关按难度匀出 3 / 5 / 8 套丹料，
  // 边打边落，Boss 倒时把剩下的补齐 —— 打完这一趟，料就够开 3~8 炉。
  // 只挂在原著写明产它的图上；原著没写产的地方，这颗药哪儿也不掉。
  //   rec  : 引用哪张丹方（用量与配方同源，配方改了这里自动跟着改）
  //   only : 只产这张方子里的某几味（一味药分两地出的场合）
  //   sets : [凡境, 险境, 死境] 各给几套
  //   why  : 原著依据，写在这儿是为了以后改的时候知道当初凭什么这么挂
  window.ALCH_ZONES = [
    // 后山采药 —— 韩立替药庐采药，人参、黄精是后山常物
    { map: 'houshan', rec: 'r_peiyuan', sets: [3, 5, 8],
      why: '原著开篇韩立在后山采药换灵石，人参、黄精皆为山中所产' },
    // 黄枫谷药园 —— 园里三十一种辅药材俱全（黄龙丹：黄精、人参配妖丹）
    { map: 'yaoyuan', rec: 'r_huanglong', sets: [3, 5, 8],
      why: '百药园一节：园内辅药材俱全，只缺玉髓芝、紫猴花、天灵果三味主药' },
    { map: 'yaopu', rec: 'r_jinsui', sets: [3, 5, 8],
      why: '灵药圃深处是同片药田，辅药更足' },
    // 血色禁地 / 血池 —— 筑基丹三主药只长在禁地里，五年一开
    { map: 'xuese', rec: 'r_zhuji', sets: [3, 5, 8],
      why: '原著：玉髓芝、紫猴花、天灵果「药园内一株都没有」，只产于血色禁地' },
    { map: 'xuechi', rec: 'r_zhuji', sets: [3, 5, 8],
      why: '血池同在血色禁地之内，池边石缝里长玉髓芝' },
    // 坠魔谷 —— 火蟾古兽只此一只，天火液的主药就在这儿
    { map: 'zhuimo', rec: 'r_tianhuo', sets: [3, 5, 8],
      why: '第 727 章：火蟾古兽栖于坠魔谷，其内丹为天火液之基' },
    // 虚天殿 —— 九曲灵参、养魂木、玛瑙角都在殿中
    { map: 'xutian', rec: 'r_jiuqu', sets: [3, 5, 8],
      why: '第 433 章：九曲灵参即在虚天殿中，会幻化成鸟兽自行逃走' },
    { map: 'xutian', rec: 'r_dianling', sets: [3, 5, 8],
      why: '第 497 章「灵乳与养魂木」：殿中藏有养魂木' },
    // 阴冥之地 / 昆吾山 / 镇魔塔 —— 阴气重处才有养魂木（定灵丹的备选产地）
    { map: 'yinming', rec: 'r_dianling', sets: [2, 4, 6], why: '阴冥之地聚阴，产养魂木' },
    { map: 'kunwu', rec: 'r_dianling', sets: [2, 4, 6], why: '昆吾山产阴芝马与养魂木' },
    { map: 'zhenmo', rec: 'r_dianling', sets: [2, 4, 6], why: '镇魔塔封魔之地，养魂木出于此' },
    // 外星海 / 六连殿 / 凝翠岛 —— 伴妖草只长在八级妖兽身畔（九曲灵参丹的辅药）
    { map: 'waihai', rec: 'r_jiuqu', only: ['m_banyao'], sets: [5, 8, 12],
      why: '第 516 章：伴妖草须生在八级妖兽身畔，外星海猎妖方得' },
    { map: 'liulian', rec: 'r_jiuqu', only: ['m_banyao'], sets: [5, 8, 12],
      why: '同上，六连殿出海捕妖' },
    { map: 'ningcui', rec: 'r_jiuqu', only: ['m_banyao'], sets: [5, 8, 12],
      why: '同上，凝翠岛杀妖取丹' },
    // 外星海 / 阴罗宗 —— 魔元丹的两味：妖丹出海取，血煞珠在魔宗血池
    { map: 'waihai', rec: 'r_moyuan', only: ['m_yaodan'], sets: [4, 6, 9],
      why: '妖丹出自海兽，外星海为原著猎妖之所' },
    { map: 'yinluo', rec: 'r_moyuan', only: ['m_xuesha'], sets: [4, 6, 9],
      why: '阴罗宗以血煞炼法，血煞珠出于魔宗' },
    { map: 'jingu', rec: 'r_moyuan', only: ['m_xuesha'], sets: [4, 6, 9],
      why: '金鼓原为魔道战场，血煞凝结成珠' }
  ];

  // ---------- 四、功法：原著里「谁传给韩立」的，就该在哪张图学 ----------
  // 长春功：墨大夫在密室里硬塞给他的（不是坊市货）
  addTo('mishi', { items: ['sk_changchun'] });
  // 三转重元功：青元剑诀第六层之后散功重修那门辅助功法，随剑诀一起得到
  addTo('jingu', { items: ['sanzhong'] });
  // 五子同心魔：昆吾山收的乾老魔魔功
  addTo('kunwu', { items: ['sk_wuzi'] });
  // 破界符：镇魔塔里玲珑留下的破界符
  addTo('zhenmo', { items: ['sk_pojie'] });
})();
