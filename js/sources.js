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
  // 黄枫谷药园：韩立当药童伺弄的那片药圃，凝神花、灵芝都是园里的常物
  addDrop('bandit', ['m_lingzhi']);
  addDrop('ghoul', ['m_ningshen']);
  addTo('yaoyuan', { mats: [['m_lingzhi', 2], ['m_ningshen', 1]] });
  // 噬灵虫母：虫母体内的晶核
  addTo('yaoyuan', { items: [], mats: [['m_chongjing', 1]] });
  // 地火之屋：地肺之火边上长的火灵草
  addTo('jingu', { mats: [['m_huoling', 2]] });
  // 海猿岛：霓裳草是海岛上采的灵草（原著韩立在海岛采药）
  addTo('haian', { mats: [['m_nishang', 2]] });
  addDrop('haishou', ['m_nishang']);
  // 虚天殿：九曲灵参在殿里（玄谷拿它换韩立出手）
  addTo('xutian', { items: [], mats: [['m_jiuqu', 1]] });
  // 灵渺园：上古修士的灵草园，造化果就在这里
  addTo('lingmiao', { mats: [['m_zaohuacao', 1], ['m_zhuguo', 1]] });
  // 昆吾山：阴芝马、定灵玉
  addTo('kunwu', { mats: [['m_yinzhi', 1], ['m_dingling', 1]] });
  // 星宫：元磁神山的核心
  addTo('xinggong', { items: [], mats: [['m_yuanci', 1]] });

  // 上架的货得有价钱（坊市按 SHOP_STOCK 报价，缺价就上不了柜）
  window.SHOP_STOCK.push(
    { id: 'a_bu',        price: 40,   cat: 'qi' },   // 粗布道袍
    { id: 'a_lupi',      price: 120,  cat: 'qi' },   // 鹿皮软甲
    { id: 't_xuanyu',    price: 260,  cat: 'qi' },   // 玄玉珠
    { id: 'bag_ling2',   price: 1800, cat: 'qi' },   // 特制灵兽袋
    { id: 'ring_ling',   price: 2600, cat: 'qi' },   // 灵兽环
    { id: 'm_siling',    price: 40,   cat: 'cai' },  // 饲灵丸
    { id: 'm_silingcao', price: 20,   cat: 'cai' }   // 饲灵草
  );

  // ---------- 二、灵兽：卵跟着「哪里孵出来的」走 ----------
  // 云翅鸟：墨大夫养来盯人的，七玄门后山就能掏到
  addTo('houshan', { items: ['egg_yunchi'] });
  // 墨蛟：血色禁地那口潭里的卵
  addTo('xuese', { items: ['egg_mojiao'] });

  // ---------- 三、器物：该谁给就谁给 ----------
  // 旧木牌：七玄门记名弟子的牌子，山门开局就有
  addTo('qixuan', { items: ['t_mupai'] });
  // 玄玉珠、粗布道袍、鹿皮软甲：太南小会就能置办的散修行头（Lv1~13，练气档）
  addShop('tainan', ['a_bu', 'a_lupi', 't_xuanyu']);
  // 灵兽袋 / 灵兽环：乱星海大城才有这种养兽的家什
  addShop('tianxing', ['bag_ling2', 'ring_ling']);
  // 饲灵丸 / 饲灵草：喂灵宠的，两座坊市都卖
  addShop('tainan', ['m_siling', 'm_silingcao']);
  addShop('tianxing', ['m_siling', 'm_silingcao']);

  // ---------- 三·五、丹方：谁给的方子，就在哪里得到 ----------
  // 没有丹方，炉子不认这味药（筑基丹/培元丹/黄龙丹/金髓丸 四张）
  addTo('houshan', { items: ['f_peiyuan'] });    // 墨大夫药书里的一页
  addTo('tainan',  { items: ['f_huanglong'] });  // 散修出手的玉简
  addTo('yaoyuan', { items: ['f_zhuji'] });      // 百药园抄的筑基丹方
  addTo('tianxing', { items: ['f_jinsui'] });    // 乱星海市面的金髓丸方

  // ---------- 四、功法：原著里「谁传给韩立」的，就该在哪张图学 ----------
  // 长春功：墨大夫在密室里硬塞给他的（不是坊市货）
  addTo('mishi', { items: ['sk_changchun'] });
  // 三转重元功：青元剑诀第六层之后散功重修那门辅助功法，随剑诀一起得到
  addTo('jingu', { items: ['sanzhong'] });
  // 五子同心魔：昆吾山收的乾老魔魔功
  addTo('kunwu', { items: ['sk_wuzi'] });
  // 破界符·空间诀：镇魔塔里玲珑留下的破界符
  addTo('zhenmo', { items: ['sk_pojie'] });
})();
