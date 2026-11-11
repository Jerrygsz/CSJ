/* 支线图按原著章回插入行迹（只调整 window.MAPS 里 side 图的物理位置）
 *
 * 依据：codex/mapCodex.json 的 refs 首条 → codex/novel-index.json 章标题反查章序。
 * 落点表由 qa/_out/build-side-order.mjs 生成；改章回请先改真源再重生成，别手改这里。
 *
 * 铁律（20261111C）：
 *  ① 主线图的相对顺序、id、unlock / next 一律不动 —— spine 只收 !side，行迹推进不受影响；
 *  ② 存档 save.unlocked / save.cleared 记的是图 id，不是数组下标，老档解锁不会丢；
 *  ③ 支线的 sideOf / unlockBy 挂靠也按 id 解析，与位置无关；
 *  ④ 未登记在落点表里的新支线兜底补到末尾，绝不丢图。
 */
(function () {
  var MAPS = window.MAPS;
  if (!MAPS || !Array.isArray(MAPS)) return;

  // [支线 id, 插到哪张主线之前]；数组顺序即主锚章序升序，同一落点内保持章序。
  // 括号内为该图主锚章序，便于按原著复核。
  var PLAN = [
    ['zhangtie', 'houshan'],       // 5   第一卷《墨大夫》
    ['yanwu', 'houshan'],          // 7   第一卷《修炼难》
    ['mkuang', 'mishi'],           // 10  第一卷《神秘瓶子》后山小路
    ['yaopu', 'mishi'],            // 13  第一卷《异象起》
    ['luxiong', 'mishi'],          // 19  第一卷《江湖斗》
    ['heixiang', 'yaoyuan'],       // 128 第二卷《太南小会》
    ['xuechi', 'zhuji'],           // 180 第三卷《乌龙潭》
    ['linxiong', 'yanjia'],        // 231 第三卷《惹祸上门》
    ['shiku', 'guchuan'],          // 263 第三卷《实力》
    ['heisha', 'kuixing'],         // 302 第三卷《对策》
    ['fujia', 'kuixing'],          // 351 第三卷《齐云霄之死》
    ['luoyunyaoyuan', 'shixiao'],  // 603 第五卷《归属》
    ['huixiang', 'jiaoyihui'],     // 658 第五卷《故居灵泉》
    ['zijian', 'feisheng'],        // 1239 第七卷《魔陀山》
    ['yuyang', 'luori'],           // 1276 第八卷《兽潮》
    ['yuyang_dou', 'luori'],       // 1292 第八卷《虞阳城》
    ['linghuang', 'heti_guan'],    // 1757 第十卷《重返天渊》
    ['shengshi', 'dashengdian'],   // 2197 第十一卷《圣岛使者》
    ['zhandacheng', 'shiyin'],     // 2205 第十一卷《万修朝拜》
    ['heihu', 'shiyin'],           // 2216 第十一卷《黑葫城》
    ['baiguang', 'shiyin'],        // 2218 第十一卷《邪莲圣祖》
    ['tianmo', 'diyi'],            // 2434 第十一卷《天魔契约》
    ['huirenjie', 'fsjie']         // 2447 第十一卷《重回人界》
  ];

  var sides = {}, leftover = [];
  for (var i = MAPS.length - 1; i >= 0; i--) {
    var m = MAPS[i];
    if (m && m.side) { sides[m.id] = m; leftover.push(m); MAPS.splice(i, 1); }
  }
  leftover.reverse(); // 恢复原相对顺序，仅用于兜底

  var applied = 0, missing = [], unknownBefore = [];
  for (var j = 0; j < PLAN.length; j++) {
    var id = PLAN[j][0], before = PLAN[j][1];
    var item = sides[id];
    if (!item) { missing.push(id); continue; }
    var at = before ? MAPS.findIndex(function (x) { return x && x.id === before; }) : -1;
    if (at < 0) {
      if (before) unknownBefore.push(before);
      MAPS.push(item);
    } else {
      MAPS.splice(at, 0, item);
    }
    delete sides[id];
    applied++;
  }
  // 真源新增但落点表未登记的支线：按原相对顺序补到末尾，绝不丢图
  for (var k = 0; k < leftover.length; k++) {
    if (sides[leftover[k].id]) MAPS.push(leftover[k]);
  }

  // 只给 QA / 调试看，游戏逻辑不读
  window.MAPS_SIDE_ORDER = {
    plan: PLAN.map(function (p) { return { id: p[0], before: p[1] }; }),
    applied: applied, missing: missing, unknownBefore: unknownBefore,
    leftover: leftover.filter(function (m) { return !!sides[m.id]; }).map(function (m) { return m.id; }),
    total: MAPS.length, main: MAPS.filter(function (m) { return !m.side; }).length,
    side: MAPS.filter(function (m) { return m.side; }).length
  };
})();
