// ---------------------------------------------------------------------------
// 兜底：半径绝不能是负数。
// 收缩/外扩类特效的时间参数一旦算过界（-0.5、-16、-19 都出现过），
// ctx.arc 会直接抛 DOMException，整帧渲染中断 —— 画面就卡住。
// 与其在每个特效里各钳一次（已经漏过三回），不如在 canvas 层统一钳。
// ---------------------------------------------------------------------------
(function () {
  if (typeof CanvasRenderingContext2D === 'undefined') return;
  const proto = CanvasRenderingContext2D.prototype;
  const arc0 = proto.arc;
  proto.arc = function (x, y, r, a0, a1, ccw) {
    return arc0.call(this, x, y, (r > 0 ? r : 0), a0, a1, ccw);
  };
  const ellipse0 = proto.ellipse;
  if (ellipse0) proto.ellipse = function (x, y, rx, ry, rot, a0, a1, ccw) {
    return ellipse0.call(this, x, y, (rx > 0 ? rx : 0), (ry > 0 ? ry : 0), rot, a0, a1, ccw);
  };
})();

// 《凡人·长生劫》—— 主逻辑（多地图 / 炼气期十三层 / 太南小会坊市）
(function () {
  'use strict';

  const BASE_W = 480, BASE_H = 864;
  let W = BASE_W, H = BASE_H;   // 逻辑视口：高度随设备比例伸展，手机长屏可铺满
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 渲染分辨率倍率。逻辑坐标永远是 480×H，像素密度由 PR 决定：
  //   1 = 历史行为（画布 480 宽，靠 CSS 放大上屏）；2/3 = 提高采样密度换清晰度。
  // 手机上 480 宽会被拉伸到 DPR 倍，墨线与像素特效都会糊，所以给一个可实测的开关。
  let PR = 1;
  function renderPR() {
    try {
      const q = new URLSearchParams(location.search).get('pr');
      if (q === 'auto') return Math.min(3, Math.max(1, devicePixelRatio || 1));
      const n = parseFloat(q);
      if (n > 0) return Math.min(3, Math.max(1, n));
    } catch (e) {}
    return 1;
  }

  // ---------- 鬼谷水墨 · 特效调色（墨痕剑气 / 枯笔闪电） ----------
  // 只拦主画布这一个 ctx 实例的 strokeStyle / fillStyle：
  // 鬼谷皮开启时，把战斗特效的暖色画笔（火/金/伤红）映射为墨色系（朱砂/赭石/枯墨金），
  // 冷色（青/紫/绿）映射为黛青/墨紫/竹青；低饱和中性色（白闪、灰）原样放行。
  // 离屏精灵烘焙画布不受影响（金皮零开销，切皮即时生效）。
  const FX_INK = { on: false };
  function inkify(c) {
    if (typeof c !== 'string') return c;   // CanvasGradient 等对象原样放行
    let m;
    if ((m = c.match(/^#([0-9a-f]{6})$/i))) {
      const n = parseInt(m[1], 16);
      return inkRgba((n >> 16) & 255, (n >> 8) & 255, n & 255, 1, c);
    }
    if ((m = c.match(/^rgba?\(([^)]+)\)$/i))) {
      const p = m[1].split(',').map(s => parseFloat(s));
      return inkRgba(p[0], p[1], p[2], p.length > 3 ? p[3] : 1, c);
    }
    return c;   // 命名色等其它写法原样放行
  }
  function inkRgba(r, g, b, a, orig) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (s < 0.22) return orig;   // 白闪/灰等低饱和色：原样放行
    let h = 0;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
      if (h < 0) h += 360;
    }
    let ink;
    // 砍色纪律：全场只留「赭石（攻击）+ 花青（法术）」两个主色，朱砂留给点睛（伤红/濒死），其余归墨阶
    if (h < 18)       ink = [186, 55, 40];   // 朱砂·点睛
    else if (h < 42)  ink = [172, 100, 46];  // 赭石·攻击
    else if (h < 72)  ink = [104, 98, 80];   // 金 → 枯墨（归墨阶，不抢色）
    else if (h < 252) ink = [66, 100, 118];  // 绿/青 → 花青·法术
    else if (h < 330) ink = [58, 84, 100];   // 紫 → 花青深
    else              ink = [186, 55, 40];
    // 亮芯只轻轻压一档，保留「一点惊艳」的高光
    if (l > 0.72) ink = ink.map(v => Math.round(v * 0.9 + 46 * 0.1));
    return 'rgba(' + ink[0] + ',' + ink[1] + ',' + ink[2] + ',' + a + ')';
  }
  // pixelfx 那层走的是逐像素写缓冲，绕过了 ctx 的 strokeStyle/fillStyle 拦截，
  // 所以把同一套砍色规则开一个 hex 出口给它，保证水墨皮里特效也是墨色系。
  window.INK_HEX = function (hex) {
    if (typeof hex !== 'string' || hex[0] !== '#' || hex.length !== 7) return hex;
    const out = inkify(hex);
    if (out === hex) return hex;
    const p = out.match(/\d+/g);
    if (!p || p.length < 3) return hex;
    return '#' + [p[0], p[1], p[2]].map(v => (+v).toString(16).padStart(2, '0')).join('');
  };
  // ---------- HTML 里的稀有度字色 ----------
  // RARITY 的颜色是给深色皮设计的亮色：#ffd24a 在宣纸底上只有 1.22:1，
  // 凡品 #cfd6e2 只有 1.20:1 —— 水墨皮里等于看不见。
  // 所以 HTML 不再直接写色值，统一换成 var(--rar-N)，由皮肤决定具体颜色。
  // 只认这 6 个已知色值，其它 color: 原样放行，不会误伤。
  const RAR_BY_HEX = {};
  for (let _i = 0; _i < (window.RARITY || []).length; _i++) {
    RAR_BY_HEX[String(window.RARITY[_i].color).toLowerCase()] = _i;
  }
  function rarize(html) {
    return String(html == null ? '' : html).replace(
      /(^|[;"'\s])color:\s*(#[0-9a-f]{6})/gi,
      (m, pre, hex) => {
        const i = RAR_BY_HEX[hex.toLowerCase()];
        return i == null ? m : pre + 'color:var(--rar-' + i + ')';
      });
  }
  (function () {
    if (typeof CanvasRenderingContext2D === 'undefined') return;   // smoke 的 DOM 垫片没有真实画布
    const proto = CanvasRenderingContext2D.prototype;
    ['strokeStyle', 'fillStyle'].forEach(prop => {
      const desc = Object.getOwnPropertyDescriptor(proto, prop);
      if (!desc || !desc.set) return;
      Object.defineProperty(ctx, prop, {
        get() { return desc.get.call(this); },
        set(v) { desc.set.call(this, FX_INK.on ? inkify(v) : v); },
        configurable: true, enumerable: true
      });
    });
  })();

  // 角落版本水印：取实际加载的 game.js 的 ?v= 缓存串写入 #ver，确保显示「当前这份构建」的版本
  try {
    const _gm = document.querySelector('script[src*="js/game.js"]');
    const _vv = _gm && (_gm.getAttribute('src').match(/[?&]v=([^&]+)/) || [])[1];
    const _verEl = document.getElementById('ver');
    if (_verEl && _vv) _verEl.textContent = 'v' + _vv;
  } catch (e) {}

  // ---------- 存档 ----------
  const SAVE_KEY = 'fanren_save_v1';
  // 转世重修：独立于主存档的「轮回余荫」池，删档也保留，代代叠加。
  // 只炼「人物属性值」——本世超出凡胎初始的属性（生命/伤害/攻速/移速等）各取 1/81，
  // 叠加进新生角色的属性面板；功法、法器、灵石、洞府等一律清零、从头再来。
  const REBIRTH_KEY = 'fanren_rebirth_v1';
  const REBIRTH_DIV = 81;   // 九九归一轮回：每世只取超出凡胎属性的 1/81
  const REBIRTH_KEYS = ['maxhp', 'dmg', 'atkSpd', 'spd', 'regen', 'crit', 'armor', 'pickup', 'xpMul'];
  function rebirthPool() {
    try {
      const raw = localStorage.getItem(REBIRTH_KEY);
      if (raw) { const p = JSON.parse(raw) || {}; return { cycles: p.cycles | 0, stats: (p.stats && typeof p.stats === 'object') ? p.stats : {} }; }
    } catch (e) {}
    return { cycles: 0, stats: {} };
  }
  function writeRebirthPool(p) { try { localStorage.setItem(REBIRTH_KEY, JSON.stringify(p)); } catch (e) {} }
  let REBIRTH = rebirthPool();           // 常驻内存的轮回余荫，删档不清
  function rb(k) { return (REBIRTH.stats && REBIRTH.stats[k]) || 0; }
  // 永久加成上限：留出后期成长空间，避免一次刷满
  // 上限只卡「永久丹药/剧情」给的加成（装备走 passiveSum，另一套）。
  // maxhp 原来封在 300：可灵界之后那几味丹（蚀仙丹 380、广灵道果 400、真魂丹 420）
  // 单项就超了，吃下去也拿不满 —— 故抬到 500，让每一味丹上写的数真能到手。
  const BONUS_CAP = { dmg: 1.2, atkSpd: 0.6, spd: 0.4, pickup: 1.5, regen: 3, armor: 0.35, xpMul: 0.5, crit: 0.25, maxhp: 500 };
  const BONUS_KEYS = ['dmg', 'atkSpd', 'spd', 'pickup', 'regen', 'armor', 'xpMul', 'crit'];

  function defaultSave() {
    return {
      version: 5,
      settings: { autoSave: true, manualSave: true },
      best: { time: 0, kills: 0, level: 1 },
      wins: 0, seen: [],
      // 剧情只演一次：intro / scene / outro 三类节点键也记在 seen 里（见 storySeen）。
      // 古传送阵跌境界是「一次性剧情代价」——重修把修为补回来时 save.wounded 会被清空，
      // 只靠 !save.wounded 判断，第二次进这张图就会再跌一回，故单独立一个不回退的标志。
      woundedDone: false,
      // 生涯累计（跨局、跨图、跨轮回都不清零）：首页报的是这些，不是单局最高
      totalKills: 0, playTime: 0,
      inventory: {}, bonuses: {}, totalItems: 0,
      stones: 0, cleared: [], unlocked: ['qixuan'], mapId: 'qixuan',
      // 道陨代价：stoneBurned = 历次被天地收走的灵石总数（只增不减，永不退还）；
      // deathLost = {地图id: {items:{道具id:件数}}} —— 掉的道具挂在这里，把那张图再打穿一次就原物取回
      stoneBurned: 0, deathLost: {},
      // 跨地图永久修为：等级与功法只增不减，回刷低级图也不会退回去
      cultivate: { level: 1, xp: 0, skills: { sword: 1 } },
      // 在洞府「研习」/ 化开法诀而习得的功法（手写册子、掉落所得都走 learnSkill）：
      // 一旦研习便永久在册，过图剪枝不清。与「地图临图功法（buildPlayerSkills 直写）」区分开。
      learnedManuals: {},
      // 已装备的槽位（id 需仍在储物袋中）
      equip: { weapon: null, armor: null, trinket: null, talisman: null },
      caves: [], diffClear: {}, lastDiff: 'easy',
      // 药圃：按地块各记一份（{地块id: 已长成次数}），在战斗图里待 1 秒每块各长 1 次，满 99 停；
      // gardenTick 是所有地块共用的、不足 1 秒的零头
      gardenCharge: {}, gardenTick: 0,
      // 移栽品种：{地块id: [材料id]} —— 原著里韩立拿绿液把灵药移进药园、此后定期采收；
      // 基础品种仍写在 CAVES[].gardens[].pool，这里只记「玩家自己移栽进来的」那几味
      gardenSeed: {},
      // 已遇过的际遇（一世只遇一次）；可重复的小事不入此列
      met: [],
      // 灵宠：拥有的（养在灵兽袋里）与出战的
      pets: [], pet: null,
      // 灵兽袋挂机喂养：{ on, t }
      petFeed: { on: false, t: 0 },
      // 同伴：按剧情出现的，跟着一起打
      mates: [], mate: null,
      // 战斗右侧快捷栏：三格，每格 { kind:'pet'|'item', id }
      quick: [null, null, null],
      // 修为被封印（五鬼锁魂这类）：{ name, dmg, hp, note }
      sealed: null,
      // 厉飞雨·双身份化名系统（P0-1）：韩立干脏活让「厉飞雨」背锅（黑），好事以「韩天尊」留名（白）
      repBlack: 0, repWhite: 0, identity: 'han', liUnlocked: false,
      ach: {}, greenLiquid: 0,
      // 炼丹炉数：原著「炼丹次数越多，成丹几率越大」——每开一炉 +0.4%，至多 +12%
      alchemy: { n: 0 },
      // 天人有五衰（后传 X2C327，24 次）：n = 还压在身上的衰有几层；
      // log[境界] = { early: 衰提前降临过几次, taken: 累计扛过几道 }
      wushuai: { n: 0, log: {} }
    };
  }
  // 厉飞雨·双身份化名系统（P0-1）辅助函数
  function lifCfg() { return window.LIFEIYU || { blackEgg: [], whiteEgg: [], achievement: {}, fadeRealm: 112, unlockTip: '' }; }
  function lifEgg(kind) {
    const c = lifCfg(); const arr = (kind === 'black' ? c.blackEgg : c.whiteEgg) || [];
    if (!arr.length) return;
    banner(arr[(Math.random() * arr.length) | 0]);
    Sfx.buff();
  }
  function setIdentity(id) {
    if (id !== 'li' && id !== 'han') return;
    if (id === 'li' && G.player && G.player.level >= (lifCfg().fadeRealm || 112)) {
      notify('化神之后，厉飞雨这马甲早没人信了。'); return;
    }
    save.identity = id;
    notify(id === 'li' ? '切换身份 · 厉飞雨（马甲）' : '切换身份 · 韩天尊（本尊）');
    writeSave();
  }
  function checkLiUnlock() {
    if (save.liUnlocked) return;
    if ((save.cleared || []).indexOf(lifCfg().unlockArc || 'qixuan') >= 0) {
      save.liUnlocked = true;
      notify(lifCfg().unlockTip || '从此世间多了一个叫厉飞雨的恶人。');
      Sfx.levelup();
    }
  }
  // 云翅鸟·追风 放飞节点（P2-11）：到达该篇章即不告而别，解锁纪念成就
  function checkPetRelease(m) {
    if (!m || !m.id) return;
    let released = false;
    for (const p of (save.pets || []).slice()) {
      const def = petDefOf(p.id || p);
      if (def && def.release === m.id) {
        if (save.pet === (p.id || p)) save.pet = null;
        save.pets = (save.pets || []).filter(x => (x.id || x) !== (p.id || p));
        released = true;
      }
    }
    if (released) {
      save.ach = save.ach || {}; save.ach['zhuifeng'] = true;
      notify('云翅鸟·追风 不告而别。解锁成就「追风的背影」。');
      Sfx.levelup();
    }
  }
  // 同伴离队：原著里有些人是会走的 —— 曲魂被玄骨夺身、南宫婉回掩月宗。
  // leaveAt 指「通掉哪张图之后不再跟随」，人还在册上，只是不出战。
  function checkMateLeave(m) {
    if (!m || !m.id) return;
    let left = null;
    for (const id of (save.mates || []).slice()) {
      const d = (window.MATES || []).find(x => x.id === id);
      if (d && d.leaveAt === m.id) {
        save.mates = (save.mates || []).filter(x => x !== id);
        if (save.mate === id) { save.mate = null; G.mate = null; }
        left = d;
      }
    }
    if (left) {
      if (G.player) { G.gear = gearBonus(); recalcMaxhp(true); }
      notify(left.name + ' · 离队' + (left.leaveNote ? '（' + left.leaveNote + '）' : ''));
      Sfx.warn();
    }
  }
  function checkHeibaiAch() {
    const c = lifCfg().achievement; if (!c || !c.id) return;
    if (save.ach && save.ach[c.id]) return;
    if ((save.repBlack || 0) >= 15 && (save.repWhite || 0) >= 15) {
      save.ach = save.ach || {}; save.ach[c.id] = true;
      notify('成就解锁 · ' + (c.name || '黑白通吃'));
      Sfx.levelup();
    }
  }
  let save = defaultSave();
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) || {};
      const d = defaultSave();
      const unlocked = Array.isArray(s.unlocked) && s.unlocked.length
        ? s.unlocked.filter(id => MAPS.some(m => m.id === id))
        : ['qixuan'];
      const cult = s.cultivate || {};
      const cultSkills = {};
      if (cult.skills && typeof cult.skills === 'object') for (const k in cult.skills) cultSkills[k] = cult.skills[k] | 0;
      if (!Object.keys(cultSkills).length) cultSkills.sword = 1;
      const eq = Object.assign({ weapon: null, armor: null, trinket: null, talisman: null }, s.equip || {});
      for (const k in eq) { const it = eq[k] && Items.get(eq[k]); if (!it || !it.slot || it.slot !== k) eq[k] = null; }
      save = {
        version: 5,
        settings: Object.assign({}, d.settings, s.settings || {}),
        best: Object.assign({}, d.best, s.best || {}),
        wins: s.wins || 0,
        totalKills: Math.max(0, s.totalKills | 0),
        playTime: Math.max(0, +s.playTime || 0),
        seen: Array.isArray(s.seen) ? s.seen : [],
        inventory: s.inventory || {},
        bonuses: Object.assign({}, s.bonuses || {}),
        totalItems: s.totalItems || 0,
        stones: Math.round(s.stones || 0),
        cleared: Array.isArray(s.cleared) ? s.cleared.filter(id => typeof id === 'string') : [],
        unlocked: unlocked.length ? unlocked : ['qixuan'],
        mapId: (typeof s.mapId === 'string' && MAPS.some(m => m.id === s.mapId)) ? s.mapId : 'qixuan',
        cultivate: {
          level: Math.max(1, cult.level || (s.best && s.best.level) || 1),
          xp: Math.max(0, cult.xp || 0),
          skills: cultSkills
        },
        // 读档即带「手册研习标记」：旧档若没有这个字段，下面会按 cultivate.skills 回填
        learnedManuals: (s.learnedManuals && typeof s.learnedManuals === 'object') ? s.learnedManuals : {},
        equip: eq,
        caves: Array.isArray(s.caves) ? s.caves.filter(id => CAVES[id]) : [],
        diffClear: (s.diffClear && typeof s.diffClear === 'object') ? s.diffClear : {},
        lastDiff: s.lastDiff || 'easy',
        met: Array.isArray(s.met) ? s.met.filter(x => typeof x === 'string') : [],
        // 灵宠 / 同伴 / 快捷栏 / 封印：以前这里漏了，读档就丢，一并补回来
        pets: Array.isArray(s.pets) ? s.pets.filter(x => x && (typeof x === 'string' || typeof x === 'object')) : [],
        pet: (typeof s.pet === 'string') ? s.pet : null,
        petFeed: (s.petFeed && typeof s.petFeed === 'object') ? { on: !!s.petFeed.on, t: 0 } : { on: false, t: 0 },
        mates: Array.isArray(s.mates) ? s.mates.filter(x => typeof x === 'string') : [],
        mate: (typeof s.mate === 'string') ? s.mate : null,
        quick: Array.isArray(s.quick) ? s.quick.slice(0, 3) : [null, null, null],
        sealed: (s.sealed && typeof s.sealed === 'object') ? s.sealed : null,
        repBlack: s.repBlack || 0,
        repWhite: s.repWhite || 0,
        identity: (s.identity === 'li' || s.identity === 'han') ? s.identity : 'han',
        liUnlocked: !!s.liUnlocked,
        ach: (s.ach && typeof s.ach === 'object') ? s.ach : {},
        greenLiquid: s.greenLiquid || 0,
        gift_zhuji: !!s.gift_zhuji,
        gift_tenglong: !!s.gift_tenglong,
        gift_zhilongguo: !!s.gift_zhilongguo,
        gift_heti: !!s.gift_heti,
        // 外观皮肤：'jin' 鎏金古卷（默认）| 'guigu' 鬼谷水墨
        skin: (s.skin === 'guigu') ? 'guigu' : 'jin',
        // 移栽品种老存档：没有这个字段就补成空账
        gardenSeed: (s.gardenSeed && typeof s.gardenSeed === 'object') ? s.gardenSeed : {},
        wounded: (s.wounded && typeof s.wounded === 'object') ? s.wounded : null,
        // 古传送阵只跌一次：旧档按「已通关 guchuan」认账，免得老玩家再跌一遍
        woundedDone: !!s.woundedDone || (Array.isArray(s.cleared) && s.cleared.indexOf('guchuan') >= 0),
        // 天人有五衰：老存档没有这个字段，读进来补成空账（压在身上的衰为 0）
        wushuai: (s.wushuai && typeof s.wushuai === 'object')
          ? { n: Math.max(0, (s.wushuai.n || 0) | 0), log: (s.wushuai.log && typeof s.wushuai.log === 'object') ? s.wushuai.log : {} }
          : { n: 0, log: {} }
      };
      // 老存档：已通关的剧情图自动补成洞府
      for (const id of save.cleared) { const m = MAPS.find(x => x.id === id); if (m && m.cave && save.caves.indexOf(m.cave) < 0) save.caves.push(m.cave); }
      normalizePets();
      // 旧档迁移：修复前学到的「手册功法」只写进 cultivate.skills、没有 learnedManuals 标记，
      // 与新剪枝逻辑不兼容（读档就会被当成临图功法清掉）。这里把「已拥有的手册功法」一次性补进 learnedManuals，
      // 旧存档立即生效：学习了就永久在册，不再切图被清。
      const _taughtSet = {};
      for (const it of (window.ALL_ITEMS || [])) if (it && it.teach) _taughtSet[it.teach] = true;
      for (const id in (save.cultivate.skills || {})) {
        if ((save.cultivate.skills[id] || 0) > 0 && _taughtSet[id]) save.learnedManuals[id] = true;
      }
      // 养过的灵宠 / 同伴，若名字已不在表里就清掉（改过数据的老存档）
      if (save.pet && !petDefOf(save.pet)) save.pet = null;
      if (save.mate && !(window.MATES || []).some(m => m.id === save.mate)) save.mate = null;
      save.mates = (save.mates || []).filter(id => (window.MATES || []).some(m => m.id === id));
    } catch (e) {}
  }
  function writeSave() { try { save.stones = Math.round(save.stones || 0); localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  loadSave();
  // 旧档迁移：原来那张「黑凤族领地」已经并进「木族领地」——
  // 原著里芝龙果、腾龙丹方都出在木族之行（黑凤族筱虹只是同行者）。
  // 打通过旧图的老存档按「木族已了」对待，不让人在白丢一张图之后又卡在门外。
  (function migrateArc1() {
    const cl = save.cleared || [], un = save.unlocked || [];
    let changed = false;
    if (cl.indexOf('heifeng') >= 0) {
      if (cl.indexOf('muzu') < 0) { cl.push('muzu'); changed = true; }
      if (un.indexOf('muzu') < 0) { un.push('muzu'); changed = true; }
    }
    // 已经破了炼虚的存档：这一段是按原著后补的（青罗沙漠 / 落日之墓 / 山腹 / 灵地 /
    // 木族 / 碧眼真蟾 / 天鹏圣地 / 冥河），人早就走过去了。整段记为已了，
    // 免得行迹图上留下「后面的图开了、中间这张还锁着」的窟窿；想重看重打随时能进。
    if (cl.indexOf('lianxu') >= 0) {
      for (const id of ['qinluo', 'anyuan', 'luori', 'shanku', 'tianyuan', 'lingdi', 'muzu', 'zhenchan', 'tianpeng', 'minghe']) {
        if (cl.indexOf(id) < 0) { cl.push(id); changed = true; }
        if (un.indexOf(id) < 0) { un.push(id); changed = true; }
      }
    }
    if (changed) writeSave();
  })();
  // 旧档迁移：灵界「合体 → 大乘」这一段（arc K）按原著重排成 19 图，
  // 原来只有 9 图且顺序不对（倚天城写成守住了、车骑恭写成敌人、小灵天错放在魔劫里）。
  // 已经进阶大乘的存档，人早就把这一段走完了 —— 整段记为已了，免得行迹图上留下
  // 「后面的图开了、中间九张还锁着」的窟窿；想重看重打随时能进。
  // 旧档迁移：人界四段按原著补了七张图 —— 野狼帮之围 / 嘉元城墨府（第一卷末到第二卷初）、
  // 妙音门天雷竹 / 青竹小轩入世二十年 / 古修遗址玄骨 / 雾中岛外星海 / 元瑶还魂术（结丹期）。
  // 旧档里这些图压根不存在，链一补就会卡在中间；按「他已经走到哪儿」逐段判定，
  // 走过哪一段就把那一段的新图整段记为已了，绝不留一串锁着的窟窿。
  (function migrateHumanArc() {
    const cl = save.cleared || [], un = save.unlocked || [];
    // 已经过了太南小会 → 野狼帮与嘉元城必已走过；已经结丹 → 妙音门必已走过；
    // 已过虚天殿 → 青竹小轩与古修遗址必已走过；已过外星海 / 阴冥之地 → 雾中岛 / 元瑶护法必已走过
    const gates = [
      ['tainan', ['yelang', 'jiayuan']],
      ['jiedan', ['miaoyin']],
      ['xutian', ['qingzhu', 'guxiu']],
      ['waihai', ['wuzhong']],
      ['yinming', ['yuanyao']]
    ];
    let changed = false;
    for (const [gate, ids] of gates) {
      if (cl.indexOf(gate) < 0) continue;
      for (const id of ids) {
        if (cl.indexOf(id) < 0) { cl.push(id); changed = true; }
        if (un.indexOf(id) < 0) { un.push(id); changed = true; }
      }
    }
    if (changed) writeSave();
  })();
  (function migrateArcK() {
    const cl = save.cleared || [], un = save.unlocked || [];
    if (cl.indexOf('sanjie') < 0) return;
    let changed = false;
    // 旧图改名（黄泉地火→镇魔锁、魔界大劫→苦灵岛）与新增图一并补上
    const arcK = ['liangzu', 'jiuxian', 'heiyu', 'longjia', 'shengdao', 'zhenling', 'mojie', 'diyuan2',
      'moban', 'huangquan', 'yitian', 'tianzhan', 'xueya', 'huanxiao', 'moyuan', 'modajie', 'lanpu', 'muzu2'];
    for (const id of arcK) {
      if (cl.indexOf(id) < 0) { cl.push(id); changed = true; }
      if (un.indexOf(id) < 0) { un.push(id); changed = true; }
    }
    if (changed) writeSave();
  })();
  // 旧档迁移：灵界「大乘」（arc L）这一段按原著补齐 10 张（大乘圣典 / 始印之地 / 灵族 / 小修罗界 /
  // 青元宫 / 冥河青元子 / 赫连商盟 / 天鼎宫 / 血天大陆 / 强者之战），并把终局段重新排了序。
  // 已经走到终局（围杀马良之后）的存档，人早把这一段走完了 —— 整段记为已了，免得中间留一串锁着的窟窿。
  (function migrateArcL() {
    const cl = save.cleared || [], un = save.unlocked || [];
    const L_ALL = ['sanjie', 'dashengdian', 'shiyin', 'lingzu', 'xiaoxiuluo', 'qingyuangong', 'minghe2', 'helian',
      'tiandinggong', 'xuetian', 'qiangzhe', 'xiaoling', 'qunqiang', 'xianshi', 'zhangtianping', 'zhanxian',
      'diyi', 'huimoyuan', 'daoguo', 'renzu', 'jiujie', 'zhenxian', 'fsjie', 'xianjie'];
    const DEEP = ['qunqiang', 'xianshi', 'zhangtianping', 'zhanxian', 'huimoyuan', 'daoguo', 'renzu', 'jiujie', 'fsjie', 'xianjie'];
    const hasDeep = DEEP.some(id => cl.indexOf(id) >= 0);
    if (!hasDeep) return;
    let changed = false;
    for (const id of L_ALL) {
      if (cl.indexOf(id) < 0) { cl.push(id); changed = true; }
      if (un.indexOf(id) < 0) { un.push(id); changed = true; }
    }
    if (changed) writeSave();
  })();
  // 老存档不必重开：读档即补，只补一次，且只在还卡在筑基门前（Lv36 之前）时才补。
  let pendingZhujiGift = false;
  (function backfillZhujiGift() {
    if (save.gift_zhuji) return;
    if ((save.cleared || []).indexOf('xuese') < 0) return;
    save.gift_zhuji = true;
    if (((save.cultivate && save.cultivate.level) || 1) < 36) {
      save.inventory.zhuji = (save.inventory.zhuji || 0) + 1;
      save.totalItems = (save.totalItems || 0) + 1;
      pendingZhujiGift = true;
    }
    writeSave();
  })();

  // 老存档补发：木族（旧版叫黑凤族领地）已通关，但旧版没在 boss 奖励里给《腾龙丹方》，
  // 导致化神→炼虚缺方、冲关无门、也找不到丹方去哪领。读档即补，只补一次：
  // 只要木族已清、且身上没有丹方，就发还一枚（丹方不毁、可反复开炉，多给无害）。
  // 新存档走正常 boss 奖励拿方，不会重复触发；已领过（gift_tenglong）或已持有也不重复补。
  let pendingTenglongGift = false;
  (function backfillTenglongRecipe() {
    if (save.gift_tenglong) return;
    save.gift_tenglong = true;
    if ((save.cleared || []).indexOf('muzu') < 0) { writeSave(); return; }
    if ((save.inventory.f_tenglong || 0) > 0) { writeSave(); return; }
    save.inventory.f_tenglong = 1;
    save.totalItems = (save.totalItems || 0) + 1;
    pendingTenglongGift = true;
    writeSave();
  })();

  // 老存档兜底：木族已清、天渊城洞府已在，但药圃里始终没芝龙果、袋里也一枚不剩
  // （旧版 boss 直接给成品丹、或后来两炉都炼废了）。那就直接往药圃补种一株 ——
  // 芝龙果全游戏只有木族之行那一枚，不补这一下，腾龙丹这条线就永远断在这里。
  // 只补一次；手里还有存果的走正常移栽（见 autoTransplant），不重复给。
  let pendingZhilongPlant = false;
  (function backfillZhilongSeed() {
    if (save.gift_zhilongguo) return;
    save.gift_zhilongguo = true;
    if ((save.cleared || []).indexOf('muzu') < 0) { writeSave(); return; }
    if (save.caves.indexOf('tycave') < 0) { writeSave(); return; }
    save.gardenSeed = save.gardenSeed || {};
    const seeded = save.gardenSeed.tygarden || [];
    if (seeded.indexOf('m_zhilongguo') >= 0) { writeSave(); return; }
    if ((save.inventory.m_zhilongguo || 0) > 0) { writeSave(); return; }
    save.gardenSeed.tygarden = seeded.concat(['m_zhilongguo']);
    pendingZhilongPlant = true;
    writeSave();
  })();

  // 老存档补发：万妙丹（heti）。
  // 旧版的修为引擎把升级循环写死在「lv < 150」，一到炼虚初期就再涨不上去；
  // 而合体关要修为 ≥ Lv199，于是永远判「修为未达」。偏偏这一关的万妙丹全篇只有广寒界授一枚
  // 且 noDrop、不可再得，旧版又是三成四的概率冲关、失败即被吞 —— 那一枚一旦赌输了，
  // 这个存档就再也拿不到第二枚，永久堵在天渊城。引擎的那两处已修（见 addCultivateXp 与 lingjie 的合体关），
  // 但已经被吞掉的丹补不回来，故读档兜底补发一枚。
  // 只补一次（gift_heti）：仅当「已到炼虚、未过合体、广寒界已通（丹的来路已走过）、身上一枚都没有」时才补。
  // 新档 / 正常档不受影响 —— 去广寒界正常领，或早已服丹破境（lv ≥ 200），都不重复给。
  let pendingHetiGift = false;
  (function backfillHetiPill() {
    if (save.gift_heti) return;
    const cl = save.cleared || [];
    const lv = (save.cultivate && save.cultivate.level) || 1;
    // 已过合体那一步：当年是正常领丹冲关的，本就不缺，只落标记不再补
    if (lv >= 200 || cl.indexOf('heti_guan') >= 0) { save.gift_heti = true; writeSave(); return; }
    // 还没到炼虚（未打到广寒界）：让他自己正常取丹，先不判定、也不落标记，日后读到再说
    if (lv < 150) return;
    // 广寒界还没通：丹还搁在玉台上，正常去取即可
    if (cl.indexOf('guanghan') < 0) return;
    save.inventory = save.inventory || {};
    // 身上还有万妙丹：不缺这一枚（合体关现已必成，留着就能过）
    if ((save.inventory.heti || 0) > 0) { save.gift_heti = true; writeSave(); return; }
    save.inventory.heti = (save.inventory.heti || 0) + 1;
    save.totalItems = (save.totalItems || 0) + 1;
    save.gift_heti = true;
    pendingHetiGift = true;
    writeSave();
  })();

  // 老存档：灵界「炼虚→合体」这一段按原著补了火瑚群岛、魔金山脉两张图，
  // 并把广寒界之后那一关挪到了元合岛。已经打到后头的存档不该被新图卡在门口：
  // 只要后继图已经开着或已经通关，就先把本图解出来（对正常存档是空操作）。
  (function backfillLingjieChain() {
    const cl = save.cleared || [], un = save.unlocked || [];
    let changed = false;
    for (const m of (window.MAPS || [])) {
      if (!m.next || un.indexOf(m.id) >= 0) continue;
      if (cl.indexOf(m.next) >= 0 || un.indexOf(m.next) >= 0) { un.push(m.id); changed = true; }
    }
    if (changed) writeSave();
  })();

  // 老存档：在两张既有的图之间插了新图（青罗沙漠 / 落日之墓 / 山腹 / 灵地 / 木族 / 碧眼真蟾 / 天鹏圣地 / 冥河），
  // 新图的 unlock 是「上一张图」，而上一张老档早已通关 —— 但 unlocked 里没有它，就会白锁着。
  // 这里按同一口径补开：上一张已通关，这张就该开着（对正常存档是空操作）。
  (function backfillUnlockByPrev() {
    const cl = save.cleared || [], un = save.unlocked || [];
    let changed = false;
    for (const m of (window.MAPS || [])) {
      if (!m.unlock || un.indexOf(m.id) >= 0) continue;
      if (cl.indexOf(m.unlock) >= 0) { un.push(m.id); changed = true; }
    }
    if (changed) writeSave();
  })();

  // ---------- 游戏状态 ----------
  const G = {
    state: 'title',
    time: 0, kills: 0,
    player: null,
    partner: null,            // 双人联机：远程队友实体（P2 互相同步移动）
    coopRole: null,           // 联机角色：'host'（房主权威）/ 'client' / null（单人）—— 每帧按数据通路重算
    coopShared: false,        // 是否真的在共斗：同图 + 双方都在战斗/倒地。不同图就各打各的
    _coopDmgs: [],            // 房主侧：本周期对敌伤害飘字，随敌人快照发给客机
    _claimedDrops: null,      // 双人联机·客机：已领取的掉落 id（防重复拾取）
    _hostVacuum: false,       // 双人联机·客机：房主正自动收取战利品（Boss 战后）——暂停拾取瓜分
    _endSent: false,          // 双人联机：胜负广播是否已发（防重复）
    downT: 0, rescueT: 0,     // P6 倒地观战：倒了多久 / 队友救援进度（秒）
    mapId: null, map: null, diff: null,
    enemies: [], bullets: [], ebullets: [], fxBullets: [], gems: [], herbs: [], parts: [], texts: [], loot: [],
    tells: [],                // Boss 出招预警圈（画在地上，随前摇淡出）
    zones: [],                // 地面持续区：困阵 / 冰面 / 漩涡（招式落下后留在地上的那片「地方」）
    hazards: [],              // 持续型招式：光柱 / 横扫光刃 / 地刺。与 zones 不同，它们**真吃伤害**（按 tick 结算）
    spawnT: 0, nextEliteT: 100, eliteIdx: 0,
    boss: null, bossActive: false, bossSpawned: false, bossWarned: false,
    frostR: 0, shake: 0, flash: 0, god: false, ts: 1,
    bonus: {}, realm: { dmg: 0, atk: 0, spd: 0 }, realmIdx: 0, realmHp: 0, gear: {},
    combo: 0, comboT: 0, hitStop: 0, lastCombo: -1, comboTier: 0,
    dashCd: 0,                 // 闪身冷却（秒）
    vacuumT: 0, pendingEnding: false, runLoot: [], lastAutoSave: 0, pickLeft: 0,
    shopTab: 'buy', shopCat: 'dan',
    caveId: null, caveTab: 'stat', diffPick: null,
    npcs: [], encT: 8,
    cam: { x: -W / 2, y: -H / 2 },
    decor: [], chunkMap: {},
    orbPos: [],
    activeDialog: null, dialogIdx: 0, dialogLines: null, dialogEnd: null, dialogId: null,
    dialogSynced: false, coopFrozen: false,   // 联机：镜像对话标记 / 等房主时的冻结
    settle: null,                             // 结算小舞台：两人在这儿自由走动、头顶飘表情
  };

  // ---------- 装备加成 ----------
  function gearBonus() {
    const out = {};
    for (const slot in save.equip) {
      const id = save.equip[slot];
      if (!id) continue;
      const it = Items.get(id);
      if (!it || !it.slot || !it.effect) continue;
      for (const k in it.effect) out[k] = (out[k] || 0) + it.effect[k];
    }
    // 同伴同行时的独有特性：人走了就没有，换人不叠加
    const mate = (window.MATES || []).find(m => m.id === save.mate);
    if (mate && mate.perk && mate.perk.stat) {
      out[mate.perk.stat] = (out[mate.perk.stat] || 0) + mate.perk.amount;
    }
    return out;
  }
  function equippedCount() { let n = 0; for (const k in save.equip) if (save.equip[k]) n++; return n; }

  // ---------- 玩家 ----------
  function newPlayer() {
    return {
      x: 0, y: 0, hp: 100, maxhp: 100, r: 9, spd: 96, level: 1, xp: 0, next: 6,
      iv: 0, dir: 1, skills: {}, t_sword: 0, t_fire: 0, t_nova: 0, orbAng: 0, hurtFlash: 0,
      moving: false, gait: 0, atkAnim: 0, atkCd: 0
    };
  }
  function skillLv(id) { return (G.player && G.player.skills[id]) || 0; }

  // ---------- 功法装配：学过不等于身上在用 ----------
  // c.skills  = 已习得（门 : 层数）
  // c.equipped = 已装配（真正在身上运转的，上限随境界）
  function cultObj() {
    if (!save.cultivate) save.cultivate = { level: 1, xp: 0, skills: {} };
    const c = save.cultivate;
    if (!c.skills) c.skills = {};
    if (!c.equipped) c.equipped = [];
    return c;
  }
  function slotCapOf(lv) { return window.skillSlots ? window.skillSlots(lv) : 3; }
  function equippedOf() {
    const c = cultObj();
    return (c.equipped || []).filter(id => (c.skills[id] || 0) > 0);
  }
  function equipSkill(id) {
    const c = cultObj();
    if (!(c.skills[id] > 0)) { notify('这门尚未习得'); Sfx.warn(); return 'none'; }
    const eq = c.equipped || (c.equipped = []);
    if (eq.indexOf(id) >= 0) { notify('这门已在身上'); return 'on'; }
    const cap = slotCapOf(Math.max(c.level || 1, save.best.level || 1));
    if (eq.length >= cap) { notify('身上只能同时运 ' + cap + ' 门'); Sfx.warn(); return 'full'; }
    eq.push(id); writeSave(); Sfx.buff();
    const d = window.skillById ? window.skillById(id) : null;
    notify('运起 · ' + (d ? d.name : id));
    return 'ok';
  }
  function unequipSkill(id) {
    const c = cultObj();
    const eq = c.equipped || [];
    const i = eq.indexOf(id);
    if (i < 0) { notify('这门不在身上'); return 'off'; }
    eq.splice(i, 1); writeSave(); Sfx.gem();
    const d = window.skillById ? window.skillById(id) : null;
    notify('卸下 · ' + (d ? d.name : id));
    return 'ok';
  }
  // 主力：优先保住攻击类的，其次看层数
  function mainSkillOf() {
    const c = cultObj();
    let best = null, bs = -1;
    for (const k in c.skills) {
      const d = window.skillById ? window.skillById(k) : null;
      const v = (c.skills[k] || 0) + ((d && d.main) ? 100 : 0);
      if (v > bs) { bs = v; best = k; }
    }
    return best;
  }
  // 境界一破：旧功法全卸下，只留一门主力。要不要重新戴上，自己说了算
  function trimSkillsToMain() {
    const c = cultObj();
    const best = mainSkillOf();
    c.equipped = best ? [best] : [];
    writeSave();
    return c.equipped.slice();
  }
  // 剧情一次性所授的传世功法（unique 法诀）：失而不可复得，永不入「清掉」之列
  let _uniqueTaught = null;
  function isUniqueTaught(id) {
    if (!_uniqueTaught) {
      _uniqueTaught = {};
      for (const it of (window.ALL_ITEMS || [])) if (it && it.teach && it.unique) _uniqueTaught[it.teach] = true;
    }
    return !!_uniqueTaught[id];
  }
  // 玩家「手动研习」过的法诀（洞府研习 / 化开掉落手册，皆走 learnSkill）：一旦研习便永久在册，
  // 过图剪枝不清。与 unique-taught 同级豁免 —— 这正是「学习了就永久习得、随时可运起」的落点。
  // 注意：只豁免「手动研习」的，地图临图功法（buildPlayerSkills 直写，从不经 learnSkill）仍照旧可被剪。
  function isManualLearned(id) {
    const m = (save && save.learnedManuals) || {};
    return !!m[id];
  }
  // 地图打完：只留三门练得最精的功法（等级原样带去下张图），余者散去。
  // 同层随机留 —— 「随机保留三个升级最高的」；剧情传世功法不在此列。
  // 进图前运哪几门，照旧走「战前运功」自选，等级沿用。
  function pruneSkillsTop3() {
    const c = cultObj();
    const ids = Object.keys(c.skills).filter(id => (c.skills[id] || 0) > 0);
    const keep = [];
    const rest = [];
    for (const id of ids) ((isUniqueTaught(id) || isManualLearned(id)) ? keep : rest).push(id);
    if (rest.length + keep.length <= 3 || rest.length <= 3) {
      // 总共不过三门（或可留的不过三门），无需收敛
      return { kept: ids.length, cut: 0 };
    }
    rest.sort((a, b) => (c.skills[b] || 0) - (c.skills[a] || 0) || (Math.random() - 0.5));
    for (const id of rest.slice(0, 3)) keep.push(id);
    const cut = ids.length - keep.length;
    const next = {};
    for (const id of keep) next[id] = c.skills[id];
    c.skills = next;
    c.equipped = (c.equipped || []).filter(id => next[id]);
    return { kept: keep.length, cut };
  }
  function buildPlayerSkills(lv, m) {
    const c = cultObj();
    // 地图给的起手功法只记进「已习得」，装不装由自己决定
    if (m && m.startSkills) for (const k in m.startSkills) c.skills[k] = Math.max(c.skills[k] || 0, m.startSkills[k]);
    let eq = (c.equipped || []).filter(id => (c.skills[id] || 0) > 0);
    const cap = slotCapOf(lv);
    if (eq.length > cap) { eq = eq.slice(0, cap); c.equipped = eq.slice(); }
    if (!eq.length) {
      const best = mainSkillOf();
      if (best) { eq = [best]; c.equipped = [best]; }
    }
    const out = {};
    for (const id of eq) out[id] = Math.min(c.skills[id], window.skillCapById ? window.skillCapById(id, lv) : 99);
    return out;
  }
  function gb(k) { return (G.gear && G.gear[k]) || 0; }
  // 本局顿悟被动（C 卡）：只在当前这一局有效，不落盘。
  // 必须与永久加成 G.bonus 分开：共用会互相截断——
  // 永久加成封顶后，本局再叠的卡会被 Math.min 削平；本局叠高后吃一颗永久丹药也会被砍回上限。
  function rp(k) { return (G.runP && G.runP[k]) || 0; }
  // 一屏要多大半径才算「全屏拾取」：视口半对角线再放一点余量。
  // W/H 是逻辑视口且随设备伸展（480×864 起，长屏可到 480×1120），故实时算，不写死。
  function viewPickR() { return Math.sqrt(W * W + H * H) / 2 + 24; }
  // 视野判定：以镜头实际可视矩形为准（硬跟随下就是玩家身边这一屏）。
  // Boss 战后的自动收取只认这一屏之内的掉落；视野外的留在原地，不再全图扫荡。
  const VIEW_EDGE = 6;   // 四边余量：正好卡在屏幕边缘的那件，玩家看得见就该捡得到
  function inView(o) {
    if (!o) return false;
    const p = G.player || { x: 0, y: 0 };
    const cx = (G.cam && G.cam.x != null) ? G.cam.x : p.x - W / 2;
    const cy = (G.cam && G.cam.y != null) ? G.cam.y : p.y - H / 2;
    return o.x >= cx - VIEW_EDGE && o.x <= cx + W + VIEW_EDGE &&
           o.y >= cy - VIEW_EDGE && o.y <= cy + H + VIEW_EDGE;
  }
  // ---------- 驱物术的第二个功用：神念拾取 ----------
  // 顿悟池里「拾取范围 +30%」那张卡在上一轮被删了（它和「变强打怪」无关，属于噪音），
  // 但拾取本身不能没着落 —— 宝石飞不进来，玩家就得靠脚一个个去踩，走位压力反而变形。
  // 所以把它挂到驱物术上：御剑的同一条神念，顺手把四周的灵物摄过来。
  //
  // 曲线按「面积等分」而不是半径等分：每升一重多覆盖同样一片地，
  // 否则 1→2 重半径直接翻倍（体感突兀），5→6 重几乎没有变化（升级没回报）。
  //   1 重 20.4%  2 重 28.9%  3 重 35.4%  4 重 40.8%  5 重 45.6%  6 重 50.0%
  // 满级 50% 是相对「全屏拾取半径」（视口半对角线 +24）而言：
  // 480×864 上即 259px，比半屏宽（240）还多一点，左右两侧的掉落基本都能吸到。
  const SWORD_PICK_FULL = 0.50;   // 满级占全屏拾取半径的比例
  function swordPickupR() {
    // 局内读本局运转的驱物术（buildPlayerSkills 保证它一定在），局外（洞府面板）读修炼层数
    const p = G.player;
    const lv = (p && p.skills && p.skills.sword)
      || ((save.cultivate && save.cultivate.skills && save.cultivate.skills.sword) || 0);
    if (lv <= 0) return 0;
    const s = SKILLS.find(x => x.id === 'sword');
    const cap = (s && s.max) || 6;
    return viewPickR() * SWORD_PICK_FULL * Math.sqrt(Math.min(lv, cap) / cap);
  }
  // 驱物术升了一重：把神念圈再露一下，告诉玩家「御剑」确实让拾取范围变大了。
  // talk 为真才补一句 banner —— 境界授功那条有统一 banner，这里只闪圈不抢话。
  function bumpSwordPick(talk) {
    G.pickPulseAt = G.time;
    if (talk) banner('神念更广 · 拾取 ' + Math.round(pickupR()) + 'px');
  }
  // 被动加成全部走「功法属性」聚合：新旧被动功法一起算，练到几层就给几层的力
  function hasteMul() { return Math.pow(0.92, (passiveSum('atkSpd') + buffSum('atkSpd')) / 0.08); }
  function spdMul() { return 1 + rb('spd') + passiveSum('spd') + buffSum('spd') + G.realm.spd + gb('spd') + rp('spd'); }
  function atkMul() { return 1 / (1 + rb('atkSpd') + (G.bonus.atkSpd || 0) + gb('atkSpd') + G.realm.atk); }
  function dmgMul() { return (1 + rb('dmg') + (G.bonus.dmg || 0) + gb('dmg')) * (1 + G.realm.dmg) * (1 + passiveSum('dmg') + buffSum('dmg')); }
  // 拾取半径原始值（不封顶）：装备/丹药/顿悟卡的加成可以一直往上叠
  // 基础值不再写死 46：驱物术练过就用它的神念半径当底子（见 swordPickupR），
  // 没练驱物术的走位才全靠脚。装备的 pickup 加成仍在这个底子上乘，不与技能冲突。
  function pickupBase() { return Math.max(46, swordPickupR()); }
  function pickupRaw() {
    return pickupBase() * (1 + passiveSum('pickup') + buffSum('pickup')) * (1 + rb('pickup') + (G.bonus.pickup || 0) + gb('pickup') + rp('pickup'));
  }
  // 实际拾取半径：叠到覆盖整屏就锁在「全屏」不再涨（再大也只是白算距离）
  function pickupR() { const r = pickupRaw(), full = viewPickR(); return r >= full ? full : r; }
  // 是否已能拾取整屏（含四角）
  function pickupFull() { return pickupRaw() >= viewPickR(); }
  function critChance() { return 0.05 + rb('crit') + (G.bonus.crit || 0) + gb('crit') + passiveSum('crit') + buffSum('crit'); }
  function armorRate() { return Math.min(0.62, rb('armor') + (G.bonus.armor || 0) + gb('armor') + passiveSum('armor') + buffSum('armor') + rp('armor')); }
  // 生命上限 = 基础 + 永久道具 + 境界累计 + 装备 + 葫芦功法
  // 形象跟着人走：袍色看境界，甲色看身上穿的护甲，封印了人就灰下去
  function heroTierOf(lv) {
    if (lv >= 112) return 4;
    if (lv >= 82) return 3;
    if (lv >= 56) return 2;
    if (lv >= 36) return 1;
    return 0;
  }
  function heroLook() {
    const lv = G.player ? G.player.level : ((save.cultivate && save.cultivate.level) || 1);
    const tier = heroTierOf(lv);
    const base = (window.HERO_ROBE || [])[tier] || { robe: '#3e8e4f', shade: '#27613a', belt: '#8a6a2a' };
    const armorId = save.equip ? save.equip.armor : null;
    const look = (window.ARMOR_LOOK && armorId && window.ARMOR_LOOK[armorId]) || base;
    // 修为被封印的这些年，人是灰的
    if (save.sealed) return { robe: '#4a4a4a', shade: '#343434', belt: '#6a5a3a' };
    return look;
  }
  function applyHeroSprite() {
    if (!window.buildHeroSprite) return;
    const look = heroLook();
    Sprites.hanli = window.buildHeroSprite(look);
    // 四类手绘帧一起换色：只换立绘不换帧，人一跑起来袍子就闪一下回炼气期的绿
    for (const action of ['run', 'idle', 'strike', 'hurt']) {
      const fr = window.buildHeroFrames ? window.buildHeroFrames(look, action) : null;
      if (fr) for (let i = 0; i < fr.length; i++) Sprites['hanli_' + action + i] = fr[i];
    }
  }

  function recalcMaxhp(keepPct) {
    const p = G.player; if (!p) return;
    const old = p.maxhp || 1;
    const ratio = keepPct ? U.clamp(p.hp / old, 0, 1) : -1;
    p.maxhp = 100 + rb('maxhp') + (G.bonus.maxhp || 0) + (G.realmHp || 0) + gb('maxhp') + passiveSum('maxhp') + rp('maxhp');
    // 五鬼锁魂这类封印：人被压着，气血也翻不上去
    if (save.sealed) p.maxhp = Math.round(p.maxhp * (save.sealed.hp || 0.5));
    // 天人有五衰：扛过来的衰还压在身上，气血先削一截
    const wu = wuPenalty();
    if (wu) p.maxhp = Math.round(p.maxhp * wu.hp);
    if (ratio >= 0) p.hp = p.maxhp * ratio;
    else p.hp = Math.min(p.hp, p.maxhp);
  }

  function xpNeed(level) { return Math.floor(5 + level * 2.6 + level * level * 0.14); }
  function realmName(lv) {
    let n = REALM_LAYERS[0].name;
    for (const r of REALM_LAYERS) { if (lv >= r.lv) n = r.name; else break; }
    return n;
  }

  // 永久加成：首局带入 save.bonuses，本局所得同时写回 save（跨地图不清零）
  function resetRunBonus() {
    G.bonus = {};
    G.runP = {};   // 本局顿悟被动，每局清零（不落盘、无上限）
    G._pickFullTold = 0;
    for (const k of BONUS_KEYS) G.bonus[k] = Math.min(BONUS_CAP[k], save.bonuses[k] || 0);
    G.bonus.maxhp = Math.min(BONUS_CAP.maxhp, save.bonuses.maxhp || 0);
  }
  function addBonus(k, v) {
    G.bonus[k] = Math.min(BONUS_CAP[k] || 99, (G.bonus[k] || 0) + v);
    save.bonuses[k] = Math.min(BONUS_CAP[k] || 99, (save.bonuses[k] || 0) + v);
  }
  function addRunBonus(k, v) { G.bonus[k] = Math.min(BONUS_CAP[k] || 99, (G.bonus[k] || 0) + v); }
  // 修为受创（古传送阵被南宫婉吸走修为）之后有一段重修期：经验翻倍，修回原层即止
  function clearWoundedIfDone() {
    if (save.wounded && (save.cultivate.level || 1) >= (save.wounded.to || 0)) {
      save.wounded = null;
      writeSave();
      try { banner('重修已毕 · ' + realmName(save.cultivate.level)); } catch (e) {}
    }
  }
  function gainXp(v) {
    if (!G.player) return;
    let mult = 1;
    if (save.wounded) {
      if ((save.cultivate.level || 1) >= (save.wounded.to || 0)) save.wounded = null;
      else mult = save.wounded.mult || 2;
    }
    G.player.xp += v * mult * (1 + rb('xpMul') + (G.bonus.xpMul || 0) + gb('xpMul') + passiveSum('xpMul') + buffSum('xpMul'));
  }

  // ---------- 限时增益：符箓 / 丹药服下，一段时间内属性见长，到点自行散去 ----------
  function buffSum(k) {
    let v = 0;
    for (const b of (G.buffs || [])) if (b.stat === k && b.t > 0) v += b.amount;
    return v;
  }
  function addBuff(stat, amount, dur, name, icon) {
    if (!G.buffs) G.buffs = [];
    // 同名增益只续时间、不叠数值，免得连吃几颗就失控
    const same = G.buffs.find(b => b.stat === stat && b.name === name);
    if (same) { same.t = Math.max(same.t, dur || 15); same.amount = Math.max(same.amount, amount); }
    else G.buffs.push({ stat: stat, amount: amount, t: dur || 15, dur: dur || 15, name: name || '', icon: icon || '✨' });
    renderBuffs();
  }
  function tickBuffs(dt) {
    if (!G.buffs || !G.buffs.length) return;
    for (let i = G.buffs.length - 1; i >= 0; i--) {
      G.buffs[i].t -= dt;
      if (G.buffs[i].t <= 0) G.buffs.splice(i, 1);
    }
    // 秒数变了才重绘，别每帧都动 DOM
    const sig = G.buffs.map(b => b.name + b.stat + Math.ceil(b.t)).join('|');
    if (sig !== G._buffSig) { G._buffSig = sig; renderBuffs(); }
  }
  function renderBuffs() {
    if (!elBuffrow) return;
    const bs = (G.buffs || []).filter(b => b.t > 0);
    if (!bs.length) { elBuffrow.innerHTML = ''; elBuffrow.style.display = 'none'; return; }
    elBuffrow.style.display = 'flex';
    elBuffrow.innerHTML = bs.map(b => {
      const nm = { dmg: '伤', spd: '速', crit: '暴', armor: '御', regen: '回', pickup: '拾', xpMul: '修', atkSpd: '急', drop: '落' }[b.stat] || '益';
      const amt = b.stat === 'drop' ? ('+' + b.amount) : ('+' + Math.round(b.amount * 100) + '%');
      return '<div class="bpip" title="' + b.name + '　' + nm + amt + '"><span>' + (b.icon || '✨') + '</span><b>' + nm + ' ' + Math.ceil(b.t) + 's</b></div>';
    }).join('');
  }
  function curDiff() { return G.diff || DIFFICULTIES[0]; }
  // 当前修为（战斗中取角色等级，否则取存档长期修为）
  function curLevel() { return G.player ? G.player.level : (save.cultivate.level || 1); }
  // req 存的是等级值，对外显示成境界。判定也按「那一层的起始等级」算，
  // 否则会出现「需炼气期二层」而人已在炼气期二层却按不动的情况。
  function reqLv(n) {
    if (!n) return 1;
    let lv = 1;
    for (const r of REALM_LAYERS) { if (r.lv <= n) lv = r.lv; else break; }
    return lv;
  }
  function canUse(item) { return !item || !item.req || curLevel() >= reqLv(item.req); }

  function addToBag(item, opts) {
    // 世上只此一件的东西（大衍诀、青元剑诀、虚天残图、血玉蜘蛛卵、噬金虫袋…）：
    // 有了就不再有第二件。掉落的池子里本来就没有，这里再拦一道 —— 捡、买、换、炼都得过这道门。
    if (item.unique && (save.inventory[item.id] || 0) > 0) {
      if (!opts || !opts.silent) {
        notify('此物只此一件 · 身上已有');
        Sfx.warn();
      }
      return false;
    }
    save.inventory[item.id] = (save.inventory[item.id] || 0) + 1;
    save.totalItems = (save.totalItems || 0) + 1;
    if (!opts || !opts.silent) {
      itemToast(item);
      if (item.rarity >= 2) Sfx.buff(); else Sfx.gem();
    }
    return true;
  }

  // 道具入袋 / 生效。装备类只入袋（需到洞府佩上），境界不足则看得见用不上
  function applyItem(item, opts) {
    if (!item) return;
    // 虫卵 / 兽卵：孵出来进灵兽袋（装不下就先收着，不白丢）
    if (item.hatch) {
      const d = petDefOf(item.hatch);
      const r = addPet(item.hatch);
      if (r === 'ok') { notify('孵出一只 · ' + (d ? d.name : item.hatch) + '　已入灵兽袋'); Sfx.buff(); return; }
      if (r === 'full') {
        save.inventory[item.id] = (save.inventory[item.id] || 0) + 1;
        save.totalItems = (save.totalItems || 0) + 1;
        notify('灵兽袋装不下 · 卵先收着'); Sfx.warn(); return;
      }
      return;   // 已有一只，或表里没这只宠
    }
    const silent = opts && opts.silent;
    const noRun = opts && opts.noRun;
    const p = G.player, e = item.effect || {};
    // 法诀 / 功法类：化开就学会一门功法，不入储物袋（章节奖励、怪物掉落都走这里）
    if (item.teach) {
      const d = window.skillById ? window.skillById(item.teach) : null;
      if (!d) return;
      if (cultObj().skills[item.teach]) { if (!silent) { notify('这门已学过'); Sfx.warn(); } return; }
      learnSkill(item.teach);
      return;
    }
    // 同伴类（炼尸术残卷 → 曲魂）：用掉就入册，不入储物袋，和法诀一个规矩
    if (item.grantsMate) {
      const r = addMate(item.grantsMate);
      const md = (window.MATES || []).find(x => x.id === item.grantsMate);
      if (r === 'ok') {
        if (!silent) { notify('入册 · ' + (md ? md.name : item.grantsMate)); Sfx.buff(); }
      } else {
        // 已在册：从储物袋里拿出来的那份还回去，别白瞎一张残卷
        if (opts && opts.fromBag) {
          save.inventory[item.id] = (save.inventory[item.id] || 0) + 1;
          save.totalItems = (save.totalItems || 0) + 1;
        }
        if (!silent) { notify('此人已在册'); Sfx.warn(); }
      }
      return;
    }
    if (item.mat) { if (p) G.matGain = (G.matGain || 0) + 1; }
    else if (!noRun && p) G.runLoot.push(item.id);

    if (item.slot) {
      addToBag(item, opts);
      if (!silent) spawnText(p ? p.x : 0, p ? p.y - 30 : 0, '需至洞府佩戴', '#c9b27a', 12);
      return;
    }
    if (!canUse(item)) {
      addToBag(item, { silent: true });
      if (!silent) {
        itemToast(item);
        Sfx.warn();
      }
      return;
    }

    if (e.maxhp) {
      const room = Math.max(0, BONUS_CAP.maxhp - (save.bonuses.maxhp || 0));
      const add = Math.min(e.maxhp, room);
      save.bonuses.maxhp = (save.bonuses.maxhp || 0) + add;
      if (p) { recalcMaxhp(); p.hp += add; }
    }
    for (const k of BONUS_KEYS) if (e[k]) addBonus(k, e[k]);
    // 限时增益：符箓催动、丹药服下，一段时间属性见长，时辰一过自行散去
    if (item.buffs) for (const bf of item.buffs) addBuff(bf.stat, bf.amount, bf.dur, item.name, item.icon);
    if (p) {
      if (e.healPct) p.hp = Math.min(p.maxhp, p.hp + p.maxhp * e.healPct);
      if (e.xp) gainXp(e.xp);
    }
    // fromBag：从储物袋里拿出来用的（快捷栏、洞府服用），不再往回加一件
    const fromBag = opts && opts.fromBag;
    if (!fromBag) {
      save.inventory[item.id] = (save.inventory[item.id] || 0) + 1;
      save.totalItems = (save.totalItems || 0) + 1;
    }
    if (!silent) {
      itemToast(item);
      if (item.rarity >= 2) Sfx.buff(); else Sfx.gem();
    }
  }
  // 灵界（V8 之后的四篇）：战利品池要与灵界的「修为段」对齐。
  // 不这么分的话，炼虚修士在魔界砍死一头魔兽，地上能躺一把精铁短剑 —— 这是硬伤。
  const LINGJIE_ARCS = ['I', 'J', 'K', 'L'];
  const XIANJIE_ARCS = ['M'];
  function inLingjie() { return !!(G.map && LINGJIE_ARCS.indexOf(G.map.arc) >= 0); }
  // 仙界篇（arc M）：卷一在灵寰界，韩立带伤藏拙，成品只出真仙级往上的东西。
  function inXianjie() { return !!(G.map && XIANJIE_ARCS.indexOf(G.map.arc) >= 0); }
  // 灵界成品池最低门槛：跟着地图修为段走 —— 初入灵界（木族/黑凤旧账）72（化神旧宝），越往魔界/魔源海越往上抬，
  // 到小灵天之后封顶 160。这样渡劫前后掉的是飞升带下来的旧宝，魔界深处掉的才是灵界本地器物。
  function lootMinReq() {
    if (inXianjie()) return 420;          // 仙界档：真仙级往上，灵寰界的破烂一件不出
    if (!inLingjie()) return 0;
    const base = (G.map && G.map.startLevel) || 132;
    // 420 段（真仙关）封顶抬到 360：此前封在 160，终局首领只能掉化神旧宝。
    // 前提是先补足 360+ 的可掉成品（元合五极山/净灵莲/两仪微尘阵/万年金桑液），
    // 否则这一档的池子会空、只剩材料掉。
    return Math.min(360, Math.max(72, base - 60));
  }

  function dropLoot(x, y, tier) {
    const d = curDiff();
    if (inLingjie() || inXianjie()) {
      // 灵界的小怪身上没有法器，只有灵物 —— 这不是数值妥协，是原著逻辑：
      // 灵界讲族、讲灵物、讲灵石，修士之间靠换与抢，不靠杀怪爆装备。
      if (tier < 2) { dropMat(x, y, 1); return; }
      // 首领才带得动法宝级的旧物；且绝不降到元婴以下的破烂
      const floor = lootMinReq();
      const cap = ((G.map && G.map.startLevel) || 132) + 40;   // 上限：别提前爆出高一个大境界的东西
      const item = Items.roll(2, d.rarity || 0, { minReq: floor, hardMinReq: floor, maxReq: cap });
      if (item) G.loot.push({ x, y, r: 9, bob: Math.random() * 6.28, item });
      else dropMat(x, y, 1);
      return;
    }
    const item = Items.roll(tier, d.rarity || 0);
    if (item) G.loot.push({ x, y, r: 9, bob: Math.random() * 6.28, item });
  }
  // 材料掉落：优先按「这只怪身上该有什么」，没有才退回地图物产
  function dropMat(x, y, cnt, src) {
    const pool = (src && src.length) ? src : ((G.map && G.map.mats) || []);
    if (!pool.length) return 0;
    // 霓裳草撒下去，妖气顺着水走：时辰内每只妖多落一份材料
    const bait = buffSum('drop') > 0 ? 1 : 0;
    let n = 0;
    for (let i = 0; i < (cnt || 1) + bait; i++) {
      const m = Items.get(U.pick(pool));
      if (!m) continue;
      const a = Math.random() * 6.28, dd = U.rand(6, 26);
      G.loot.push({ x: x + Math.cos(a) * dd, y: y + Math.sin(a) * dd, r: 8, bob: Math.random() * 6.28, mat: true, item: m });
      n++;
    }
    return n;
  }
  // ---------- 破境药材保底 ----------
  // 破境丹成算低（原著口径：宗师炼拿手的那味也只有一半，筑基丹这里定到一成），
  // 若还靠零散掉率一粒粒凑料，一炉的料要刷好几遍图，玩着只剩耗时间。
  // 所以按 sources.js 里的 ALCH_ZONES 发配额：一趟图按难度匀出 3/5/8 套丹料，
  // 边打边落，Boss 倒时把剩下的补齐 —— 走一趟就够开几炉。
  function dropOneMat(x, y, id) {
    const m = Items.get(id);
    if (!m) return false;
    const a = Math.random() * 6.28, dd = U.rand(8, 30);
    G.loot.push({ x: x + Math.cos(a) * dd, y: y + Math.sin(a) * dd, r: 8, bob: Math.random() * 6.28, mat: true, item: m });
    return true;
  }
  function alchLeft() {
    const a = G.alch; if (!a) return 0;
    return a.plan.reduce((s, c) => s + c[1], 0);
  }
  // 破境药材的「基础配额」：按「本图 → 丹方」表算这一趟该有多少味料。
  // 这个数就是保底 —— 随机增幅只往上走，从不往下扣。
  function buildAlchPlan(mapId, diff, wet) {
    const zones = (window.ALCH_ZONES || []).filter(z => z.map === mapId);
    if (!zones.length || !window.Recipes) return null;
    const di = Math.max(0, DIFFICULTIES.indexOf(diff || DIFFICULTIES[0]));
    const plan = [];
    for (const z of zones) {
      const sn = ((z.sets && z.sets[Math.min(di, z.sets.length - 1)]) || 0) + (wet || 0);
      if (sn <= 0) continue;
      const r = Recipes.get(z.rec);
      if (!r || !r.mats) continue;
      for (const mm of r.mats) {
        if (z.only && z.only.indexOf(mm[0]) < 0) continue;
        plan.push([mm[0], Math.max(1, Math.round(mm[1] * sn))]);
      }
    }
    return plan.length ? plan : null;
  }
  // 随机增幅：1.0 ~ 3.0 倍（下界就是「基础配额」本身，永远不会低于保底），
  // 再按进入难度叠一层：凡境 ×1.00、险境 ×1.25、死境 ×1.50。
  // 也就是最差手气：凡 1.0× / 险 1.25× / 死 1.5×；最好手气：3.0 / 3.75 / 4.5。
  const ALCH_DIFF_BONUS = [1.0, 1.25, 1.5];
  function alchBonus(d) {
    const di = Math.max(0, DIFFICULTIES.indexOf(d || DIFFICULTIES[0]));
    const dm = ALCH_DIFF_BONUS[Math.min(di, ALCH_DIFF_BONUS.length - 1)];
    return (1 + Math.random() * 2) * dm;
  }
  function setupAlchQuota() {
    G.alch = null;
    G.alchWet = false;
    // 绿液区（百药园西北角）：进门先滴一滴绿液，这一畦进「灵润」，高年份药多催一套。
    // 原著里绿液就是这么用的 —— 滴一次，草木一夜变样。
    let wet = 0;
    if (G.mapId === 'yaopu' && (save.greenLiquid || 0) > 0) { save.greenLiquid--; wet = 1; G.alchWet = true; }
    const base = buildAlchPlan(G.mapId, curDiff(), wet);
    if (!base) return;
    const bonus = alchBonus(curDiff());
    const plan = base.map(c => [c[0], Math.max(1, Math.round(c[1] * bonus))]);
    const total = plan.reduce((a, x) => a + x[1], 0);
    // 匀在一局的时长里（Boss 出来之前大致落完），Boss 一倒再补尾数
    const span = Math.max(40, (G.map && G.map.bossAt) || 120);
    G.alch = { plan: plan, idx: 0, every: span / total, t: 0, given: 0, total: total, bonus: bonus, base: base.reduce((a, x) => a + x[1], 0) };
  }
  // 从配额里轮转着取 n 份：几味药交替落，不会一局下来全是一种
  function alchGrant(n) {
    const a = G.alch;
    if (!a || !n) return 0;
    let got = 0;
    for (let k = 0; k < n; k++) {
      let picked = false;
      for (let g = 0; g < a.plan.length; g++) {
        if (a.idx >= a.plan.length) a.idx = 0;
        const cell = a.plan[a.idx];
        a.idx++;
        if (cell[1] > 0) {
          cell[1]--; a.given++; got++;
          if (G.player) dropOneMat(G.player.x, G.player.y, cell[0]);
          picked = true;
          break;
        }
      }
      if (!picked) break;
    }
    return got;
  }
  function tickAlchQuota(dt) {
    const a = G.alch;
    if (!a || alchLeft() <= 0) return;
    a.t += dt;
    while (a.t >= a.every && alchLeft() > 0) { a.t -= a.every; alchGrant(1); }
  }
  function dropStone(x, y, n) {
    const d = curDiff();
    const cnt = Math.max(1, Math.round((n || 1) * (d.stone || 1)));
    for (let i = 0; i < cnt; i++) {
      const a = Math.random() * 6.28, dd = U.rand(0, 16);
      G.gems.push({ x: x + Math.cos(a) * dd, y: y + Math.sin(a) * dd, r: 5, val: 1, kind: 'stone' });
    }
  }

  let enemySeq = 0;
  function allEnemies() { return G.boss ? G.enemies.concat([G.boss]) : G.enemies; }
  function nearestEnemy(maxd) {
    let best = null, bd = maxd * maxd;
    for (const e of allEnemies()) {
      const d = U.dist2(G.player.x, G.player.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  // 椭圆内最近之敌：射程是一条内切屏幕的椭圆（见 skills.js 的 rangeModel），不是圆。
  // 判定归一化距离 ≤1，但挑目标仍按真实欧氏距离 —— 否则纵向的怪会因为「归一化上更近」被优先选中。
  function nearestEnemyIn(ax, ay) {
    const p = G.player;
    if (!p || !ax || !ay) return null;
    let best = null, bd = Infinity;
    for (const e of allEnemies()) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const nx = dx / ax, ny = dy / ay;
      if (nx * nx + ny * ny > 1) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  // 椭圆在某个方向上的半径：弹道活多久，就看它能飞到这个方向的边缘为止
  function ellipseR(ang, ax, ay) {
    if (!ax || !ay) return 0;
    const c = Math.cos(ang), s = Math.sin(ang);
    return 1 / Math.sqrt((c * c) / (ax * ax) + (s * s) / (ay * ay));
  }
  // 弹道寿命 = 飞到椭圆边界为止，超出的部分截掉。
  // 这是「不超出屏幕」真正落地的地方：旧 life 写死 1.4 秒 × 360 速度 = 504px，
  // 比屏幕半高 432 还远，子弹出了画面还在判定。
  function bulletLife(ang, a, spd, fallback) {
    const rEnd = ellipseR(ang, a._ax, a._ay);
    if (!rEnd) return fallback;
    return Math.min(fallback, rEnd / spd + 0.04);
  }
  // 追踪弹的初始方向是随机的，不能按一开始那个角度算半径（可能正好朝着短轴）。
  // 按长轴给，再乘 1.5 抵掉转弯多走的路 —— 追踪弹的路径是弯的，不是直线。
  function homingLife(a, spd, fallback) {
    const ax = a._ax, ay = a._ay;
    if (!ax || !ay) return fallback;
    return Math.min(fallback, Math.max(ax, ay) / spd * 1.5);
  }
  function offscreen(o, m) {
    return o.x < G.cam.x - m || o.x > G.cam.x + W + m || o.y < G.cam.y - m || o.y > G.cam.y + H + m;
  }

  // ---------- 功法发射：全按功法自身属性走，近战 / 远程 / 领域各归其位 ----------
  // 身上装配了谁，谁才出手 —— 学过不等于在用
  function equippedEntries() {
    const p = G.player; if (!p || !p.skills) return [];
    const out = [];
    for (const k in p.skills) {
      const lv = p.skills[k] || 0; if (lv <= 0) continue;
      const s = window.skillById(k); if (!s) continue;
      out.push({ id: k, s: s, lv: lv });
    }
    return out;
  }
  // 真正参与战斗的是「进攻型」功法：ranged / ranged_aoe / aura
  function equippedActives() { return equippedEntries().filter(e => e.s.type !== 'passive' && e.s.atk); }
  // 被动加成：从身上装配的被动功法里按层数累加
  function passiveSum(field) {
    let v = 0;
    for (const e of equippedEntries()) if (e.s.effect && e.s.effect[field]) v += e.s.effect[field] * e.lv;
    return v;
  }

  // ---------- 闪身（罗烟步）：战斗里唯一的主动操作 ----------
  // 为什么要加它：这个游戏里玩家能按的只有方向键，被十几只怪围住时唯一的选择是「继续挨打」。
  // 一个 200px 的瞬移 + 0.3 秒无敌，把「我只能跑」变成「我能脱身」—— 成本极低，体感差别极大。
  // 位移距离约七个身位，几乎能直接跳出密集怪群；冷却 2.5 秒，逼玩家挑时机而不是无脑连闪。
  const DASH_CD = 2.5;      // 冷却（秒）
  const DASH_DIST = 200;    // 位移距离
  const DASH_IV = 0.30;     // 无敌帧：够穿过一圈怪，但不够硬吃 Boss 连招
  // dir 可选：双击屏幕时传入（已归一化的方向），优先用；否则走方向键/摇杆/背对敌人
  function dashPlayer(dir) {
    const p = G.player;
    if (!p || G.state !== 'play') return false;
    if ((G.dashCd || 0) > 0) {
      spawnText(p.x, p.y - 34, '回气中 · ' + Math.ceil(G.dashCd), '#9aa7b8', 12);
      return false;
    }
    let dx = 0, dy = 0;
    if (dir && (Math.abs(dir.dx) > 0.01 || Math.abs(dir.dy) > 0.01)) {
      dx = dir.dx; dy = dir.dy;
    } else {
      // 方向：当前输入方向；没有输入就朝「背对最近之敌」的方向（被围时的本能反应）
      if (keys.left) dx--; if (keys.right) dx++; if (keys.up) dy--; if (keys.down) dy++;
      if (jx !== 0 || jy !== 0) { dx = jx; dy = jy; }
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
        const near = nearestEnemy(460);
        if (near) { dx = p.x - near.x; dy = p.y - near.y; }
        else { dx = p.dir || 1; dy = 0; }
      }
    }
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    let nx = p.x + dx * DASH_DIST, ny = p.y + dy * DASH_DIST;
    // 不许闪进 Boss 身体里（闪过去等于送脸）；撞上就原地闪，无敌帧照样给
    if (G.boss && U.dist(nx, ny, G.boss.x, G.boss.y) < (G.boss.r || 24) + 22) { nx = p.x; ny = p.y; }
    // 记下「从哪出发」：镜头是硬跟随（每帧把玩家钉在屏幕中心），只改坐标的话角色在屏幕上
    // 纹丝不动，玩家根本感觉不到自己闪了。得在起点留一条光带 + 残影，把「位移」画出来。
    const sx = p.x, sy = p.y, ang = Math.atan2(dy, dx);
    p.x = nx; p.y = ny;
    p.iv = DASH_IV;              // 复用受击无敌帧：hitPlayer 里 iv>0 直接免伤
    p.dashFx = 0.22;
    G.dashCd = DASH_CD;
    // 镜头滞后：硬跟随每帧把玩家钉在中心，只改坐标画面纹丝不动。这里给镜头记一个「反方向偏移」，
    // 让它在闪身瞬间先停在原地（玩家相对中心滑出 90px，位移一眼可见），再平滑追上去恢复硬跟随。
    // 偏移量 = 旧位置 - 新位置：原地闪（撞 Boss）时自动为 0，不产生镜头晃动。
    G.camLag = { x: sx - p.x, y: sy - p.y, hold: 0.05 };
    // 起点扩散环 + 一条从起点射向终点的光带：光带是「闪」最直观的视觉语言
    G.parts.push({ ring: true, x: sx, y: sy, r: 6, maxr: 40, life: 0.24, maxlife: 0.24, color: '#bfe9ff' });
    G.parts.push({ ray: true, x: sx, y: sy, ang: ang, len: DASH_DIST, life: 0.22, maxlife: 0.22, color: '#bfe9ff' });
    // 路径上两个残影，接住「从 A 到 B」的连贯感
    for (let k = 1; k <= 2; k++) {
      G.parts.push({ ring: true, x: sx + dx * DASH_DIST * k / 3, y: sy + dy * DASH_DIST * k / 3, r: 5, maxr: 16, life: 0.18, maxlife: 0.18, color: '#9ad8ff' });
    }
    // 终点落地环：比起点更亮更大，收束在落脚点
    G.parts.push({ ring: true, x: p.x, y: p.y, r: 8, maxr: 56, life: 0.32, maxlife: 0.32, color: '#bfe9ff' });
    // 身法：pixelfx 的 poof 在起点「散形」、终点「现形」。位移感靠这一对，不靠光带
    if (window.FX3) {
      FX3.spawn('poof', sx, sy, { pal: 'qi' });
      FX3.spawn('poof', p.x, p.y, { pal: 'qi', seed: (Math.random() * 997) | 0 });
    }
    spawnText(p.x, p.y - 30, '闪', '#cfefff', 16);
    Sfx.dodge();
    return true;
  }

  function fireWeapons(dt) {
    const p = G.player;
    const RM = window.rangeModel;
    if (!RM) return;   // 数据层没加载就干脆不出手：宁可不打，也别用旧的死值打屏幕外
    const ri = RM.realmIdx(p.level || 1);
    const hw = W / 2, hh = H / 2;
    for (const e of equippedActives()) {
      const a = e.s.atk;
      if (a.kind === 'orbit' || a.kind === 'field') continue;  // 近身领域交给 updateAuras
      const key = 't_' + e.id;
      p[key] = (p[key] || 0) - dt;
      if (p[key] > 0) continue;
      // 本局顿悟/祭炼对本门功法的加成，只改这一次出手用的配置
      const a2 = insightAtk(e.id, a);
      // 射程按「玩家境界 + 本门功法层数」现算，满进度正好内切屏幕四边
      const ax2 = RM.axes(e.lv, e.s.max, ri, hw, hh, a2.rangeK || 1);
      a2._ax = ax2.ax; a2._ay = ax2.ay;
      const tgt = nearestEnemyIn(ax2.ax, ax2.ay);
      if (!tgt && a2.kind !== 'burst') { p[key] = 0.2; continue; }
      fireActive(e.s, a2, e.lv, tgt);
      p[key] = window.skillAtk.cd(a2, e.lv) * hasteMul() * atkMul();
      if (tgt) p.dir = tgt.x >= p.x ? 1 : -1;
    }
  }
  // 玩家攻击入口：入本地弹幕的同时，把「我在出手」广播给队友（只走 DataChannel，纯视觉）
  function pushBullet(o) {
    G.bullets.push(o);
    if (window.Coop && typeof window.Coop.queueFx === 'function') window.Coop.queueFx(o);
  }
  // 出手这件事本身也要看得见：手臂动不了（只有一张网格），但身体可以先缩再甩、身前拉一道剑光。
  // 节流 0.42 秒一次 —— 功法会自动连发，不节流的话主角会一直抽搐，像触电。
  // 返回 true 表示「这一次真的动了」，剑光/符文也跟着这一次出，不许身体没动而刃在挥。
  function playerStrike() {
    const p = G.player;
    if (!p || p.atkCd > 0) return false;
    p.atkAnim = ATK_TOTAL; p.atkCd = 0.42;
    return true;
  }
  function fireActive(s, a, lv, tgt) {
    const p = G.player;
    const dmg = window.skillAtk.dmg(a, lv);
    const cnt = window.skillAtk.count(a, lv);
    const pierce = window.skillAtk.pierce(a, lv);
    const struck = playerStrike();
    if (a.kind === 'beam') {
      // 远程定向：飞剑 / 青元剑芒 / 血煞剑气，朝最近之敌齐发
      const base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
      for (let i = 0; i < cnt; i++) {
        const ang = base + (i - (cnt - 1) / 2) * (a.spread || 0.18);
        pushBullet({ x: p.x, y: p.y, vx: Math.cos(ang) * 360, vy: Math.sin(ang) * 360, r: 6, dmg, life: bulletLife(ang, a, 360, a.life || 1.4), pierce, hit: new Set(), home: false, fx: a.vfx || 'sword', vfx: a.vfx || 'sword', ang: ang, stun: a.stun || 0, leech: a.leech || 0 });
      }
      // 剑系出手：身前一道弯月。法术系不出刃，改成脚下起一圈符文（读作「在运气」）
      const vfx = a.vfx || 'sword';
      if (vfx === 'sword' || vfx === 'qingmang' || vfx === 'blood' || vfx === 'gold') {
        if (struck) spawnSlash(p.x + Math.cos(base) * 13, p.y - 5 + Math.sin(base) * 13,
          base, VFX_HIT_COLOR[vfx] || '#eafcff', 22, 1.9);
      } else if (struck) spawnRune(p.x, p.y, 24, VFX_HIT_COLOR[vfx] || '#ffe98a');
      Sfx.shoot();
    } else if (a.kind === 'homing') {
      // 远程追踪：火蛇一类，放出去自己找目标
      for (let i = 0; i < cnt; i++) {
        const ang = Math.random() * Math.PI * 2;
        pushBullet({ x: p.x, y: p.y, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160, r: 7, dmg, life: homingLife(a, 160, a.life || 3), pierce: 1, hit: new Set(), home: true, fx: a.vfx || 'snake', vfx: a.vfx || 'snake', ang: ang, phase: Math.random() * 6.28, stun: a.stun || 0 });
      }
      if (struck) spawnRune(p.x, p.y, 22, VFX_HIT_COLOR[a.vfx || 'snake']);
      Sfx.fire();
    } else if (a.kind === 'spread') {
      // 远程扇形：三焰扇一类，正面一片都过不去（三色火轮着扇）
      const ang0 = Math.atan2(tgt.y - p.y, tgt.x - p.x);
      for (let i = 0; i < cnt; i++) {
        const ang = ang0 + (i - (cnt - 1) / 2) * (a.spread || 0.5);
        pushBullet({ x: p.x, y: p.y, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, r: 7, dmg, life: bulletLife(ang, a, 300, a.life || 1.2), pierce: 1, hit: new Set(), home: false, fx: a.vfx || 'fan', vfx: a.vfx || 'fan', ang: ang, hue: i % 3 });
      }
      if (struck) spawnRune(p.x, p.y, 26, VFX_HIT_COLOR[a.vfx || 'fan']);
      Sfx.fire();
    } else if (a.kind === 'burst') {
      // 中心爆发：定神符的金光一炸 / 其它以己身为心的爆发
      if (struck) spawnRune(p.x, p.y, 30, VFX_HIT_COLOR[a.vfx || 'gold']);
      novaBlast(p.x, p.y, window.skillAtk.rad(a, lv), dmg, a.vfx || 'gold');
    } else if (a.kind === 'thunder') {
      // 天落雷：辟邪神雷劈当面数敌，每一道都要看得见是从天上打下来的
      // 天雷只在射程椭圆内落雷：看得见的地方才劈得到
      const pool = allEnemies().filter(x => {
        const nx = (x.x - p.x) / (a._ax || 560), ny = (x.y - p.y) / (a._ay || 560);
        return nx * nx + ny * ny <= 1;
      });
      for (let i = 0; i < Math.min(cnt, pool.length); i++) {
        thunderStrike(pool[i].x, pool[i].y, dmg, pool[i]);
      }
      if (struck) spawnRune(p.x, p.y, 28, '#ffe08a');
      Sfx.nova();
    }
  }
  // 天雷：先画一道自天而降的折线，再在落点炸开一圈雷光
  // 魔道 / 血道之敌：辟邪神雷见之先矮三分（韩立专修克制魔功的神雷，以金雷竹为引）
  function isEvil(e) { return !!(e && (e.kind === 'mo' || e.kind === 'blood' || e.spr === 'mo' || e.evil === true)); }
  // 雷网：落点处一圈交错的金白电网，魔道身上网更密
  function spawnWeb(x, y, rad, color, evil) {
    const n = evil ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const a0 = U.rand(0, 6.28), a1 = a0 + U.rand(0.7, 1.9);
      G.parts.push({ web: true, x, y, a0, a1, rad: rad * U.rand(0.6, 1), seed: U.rand(0, 6.28), life: 0.3, maxlife: 0.3, color });
    }
  }
  function thunderStrike(x, y, dmg, target) {
    const evil = isEvil(target);
    const glow = '#ffe08a', core = '#fff6d8';
    G.parts.push({ bolt: true, x: x, y0: y - 240, y: y, life: 0.42, maxlife: 0.42, color: glow, seed: Math.random() * 100 });
    G.parts.push({ ring: true, x: x, y, r: 6, maxr: 40, life: 0.38, maxlife: 0.38, color: glow });
    G.parts.push({ ring: true, x: x, y, r: 2, maxr: 22, life: 0.22, maxlife: 0.22, color: core });
    for (let i = 0; i < 10; i++) G.parts.push({ x: x + U.rand(-8, 8), y: y + U.rand(-8, 8), vx: U.rand(-170, 170), vy: U.rand(-180, 50), life: 0.34, maxlife: 0.34, size: 3, color: i % 2 ? core : glow });
    spawnHit(x, y - 10, '#ffe98a');
    spawnWeb(x, y, evil ? 40 : 26, '#ffe9a8', evil);
    if (target) damageEnemy(target, evil ? dmg * 1.6 : dmg);
  }
  function novaBlast(x, y, rad, dmg, vfx) {
    G.parts.push({ ring: true, x, y, r: 10, maxr: rad, life: 0.4, maxlife: 0.4,
      color: vfx === 'qingmang' ? '#9df0d0' : vfx === 'corpsefire' ? '#5fe08a'
        : vfx === 'soul' ? '#c9a6ff' : vfx === 'shasha' ? '#4a3252' : '#ffe98a' });
    // 金光爆发：环之外再放一圈放射光条，像光从身上炸开
    if (vfx === 'gold') {
      for (let i = 0; i < 12; i++) {
        const ang = i * Math.PI / 6;
        G.parts.push({ ray: true, x, y, ang, len: rad * 0.92, life: 0.3, maxlife: 0.3, color: i % 2 ? '#fff6c8' : '#ffd76a' });
      }
    }
    // 黑煞修罗功：「一身黑煞鼓到极处炸开，三尺之内尽成血雾」——
    // 黑气环外放放射状煞条，黑红相间：黑是主调，血雾只占一半。
    // 第一版 0.34s 太短，280ms 后实拍已经散尽 —— 玩家根本来不及看清，拉到 0.5s。
    if (vfx === 'shasha') {
      for (let i = 0; i < 12; i++) {
        const ang = i * Math.PI / 6;
        G.parts.push({ ray: true, x, y, ang, len: rad * 0.88, life: 0.45, maxlife: 0.45, color: i % 2 ? '#2e2038' : '#7a1626' });
      }
    }
    for (const e of allEnemies()) if (U.dist(x, y, e.x, e.y) < rad + e.r) damageEnemy(e, dmg);
    Sfx.nova();
  }
  // 近身领域 / 环绕护体：贴身才生效 —— 这才是真近战
  function updateAuras(dt) {
    const p = G.player;
    G.orbPos = []; G.fieldSlow = [];
    let fieldRune = null;   // 本帧是否有领域类功法在开（决定脚下要不要常驻法阵）
    for (const e of equippedActives()) {
      const a = insightAtk(e.id, e.s.atk);
      if (a.kind === 'orbit') {
        p.orbAng = (p.orbAng || 0) + dt * 2.4;
        const rad = window.skillAtk.rad(a, e.lv);
        const dmg = window.skillAtk.dmg(a, e.lv);
        const cnt = Math.max(1, Math.floor((a.countBase || 0) + (a.countPerLv || 1) * e.lv));
        for (let i = 0; i < cnt; i++) {
          const ang = p.orbAng + i * (Math.PI * 2 / cnt);
          const ox = p.x + Math.cos(ang) * rad, oy = p.y + Math.sin(ang) * rad;
          // 带上是哪门功法的环绕（玄罡金环 / 大庚剑阵的青碧飞剑，长得不一样）
          G.orbPos.push({ x: ox, y: oy, vfx: a.vfx || 'gang', ang: ang, i: i });
          for (const en of allEnemies()) {
            if (!en._orbCd) en._orbCd = {};
            if ((en._orbCd[e.id] || 0) > 0) continue;
            if (U.dist(ox, oy, en.x, en.y) < 8 + en.r) { damageEnemy(en, dmg); en._orbCd[e.id] = a.cdHit || 0.4; spawnHit(en.x, en.y, VFX_HIT_COLOR[a.vfx] || '#bfe'); }
          }
        }
      } else if (a.kind === 'field') {
        // 领域：踏入即被拖慢，还得持续挨打（冰冻术 / 元磁神光）
        const rad = window.skillAtk.rad(a, e.lv);
        const dmg = window.skillAtk.dmg(a, e.lv);
        G.fieldSlow.push({ rad: rad, slow: a.slow || 0.4, vfx: a.vfx || 'ice' });
        // 领域是靠脚下那圈东西「说」出来的：没有阵纹，玩家只看到一个无形的减速区。
        // 法阵要跟着人走，所以用 hold（常驻 + 每帧跟位），而不是 spawn。
        fieldRune = { pal: (a.vfx === 'gravity') ? 'mo' : 'qi' };
        for (const en of allEnemies()) {
          if (U.dist(p.x, p.y, en.x, en.y) < rad + en.r) {
            if (!en._fieldCd) en._fieldCd = {};
            if ((en._fieldCd[e.id] || 0) <= 0) { damageEnemy(en, dmg); en._fieldCd[e.id] = a.cdHit || 0.5; spawnHit(en.x, en.y, VFX_HIT_COLOR[a.vfx] || '#9ad8ff'); }
          }
        }
      }
    }
    // 命中间隔计时
    for (const en of allEnemies()) {
      if (en._orbCd) for (const k in en._orbCd) if (en._orbCd[k] > 0) en._orbCd[k] = Math.max(0, en._orbCd[k] - dt);
      if (en._fieldCd) for (const k in en._fieldCd) if (en._fieldCd[k] > 0) en._fieldCd[k] = Math.max(0, en._fieldCd[k] - dt);
    }
    // 领域法阵：开着就一直亮、跟着人走；功法卸下立刻收
    if (window.FX3) {
      if (fieldRune) FX3.hold('field', 'rune', () => (G.player ? { x: G.player.x, y: G.player.y + 6 } : null), fieldRune);
      else FX3.release('field');
    }
  }

  // ---------- 伤害 / 死亡 ----------
  function damageEnemy(e, dmg) {
    if (e._dead) return;
    let d = dmg * dmgMul();
    const crit = Math.random() < critChance();
    if (crit) d *= 1.8;
    e.hp -= d; e.hitFlash = 0.12;
    // 单挑型剧情战：煞气靠「打掉的血」给，不靠小怪
    if (e === G.boss && G.map && G.map.type === 'boss' && e.maxhp > 0) {
      gainSha(d / e.maxhp * SHA_BOSS_DUEL);
    }
    // 吸血（顿悟被动）：打出去多少，按比例回一点气血
    // 吸血：顿悟被动的 leech + 血炼神光（每层 0.4%，满层 2.4%）
    const lc = (G.bonus.leech || 0) + rp('leech') + ((G.player && G.player.skills && (G.player.skills.xuelian || 0)) * 0.004);
    if (lc > 0 && G.player && G.player.hp > 0) {
      G.player.hp = Math.min(G.player.maxhp, G.player.hp + d * Math.min(0.2, lc));
    }
    // 飘字配色要分皮：白字在宣纸上等于隐形（纸底亮度 220+），墨皮下必须换成深墨。
    // 暴击走朱砂 —— 画布画笔那边还会把暖红统一映射成印泥朱（FX_INK），落笔就是真朱砂。
    const ink = save.skin === 'guigu';
    spawnText(e.x, e.y - e.r - 4, Math.round(d),
      crit ? (ink ? '#cf3a22' : '#ffd24a') : (ink ? '#3a332a' : '#fff'),
      crit ? (ink ? 21 : 18) : 13);
    if (G.coopRole === 'host' && window.Coop) window.Coop.queueDmg(e.x, e.y - e.r - 4, Math.round(d), crit);
    if (crit) {
      // 暴击：pixelfx 的 crit-hit 顶替原来的两圈印泥环 —— 一次性把「这一下很重」说清楚
      if (window.FX3) FX3.spawn('crit', e.x, e.y - e.r * 0.3, { pal: save.skin === 'guigu' ? 'xue' : 'jin' });
      G.hitStop = Math.max(G.hitStop, 0.018);
      flashCritInk();
      // 水墨皮：朱砂爆点落在怪身上（不是只有全屏泛红 —— 那看着像自己挨打）。
      // 两圈印泥 + 几粒碎朱，颜色会被 FX_INK 统一映射成真朱砂。
      if (ink) {
        G.parts.push({ ring: true, x: e.x, y: e.y, r: 3, maxr: e.r * 3.4, life: 0.30, maxlife: 0.30, color: '#c0352a' });
        G.parts.push({ ring: true, x: e.x, y: e.y, r: 1.5, maxr: e.r * 1.7, life: 0.20, maxlife: 0.20, color: '#e0573a' });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * 6.283 + Math.random() * 0.5;
          G.parts.push({
            x: e.x, y: e.y, vx: Math.cos(a) * U.rand(80, 150), vy: Math.sin(a) * U.rand(80, 150) - 40,
            life: 0.32, maxlife: 0.32, size: 3, color: i % 2 ? '#e0573a' : '#a8281e'
          });
        }
      }
    }
    // Boss 二阶段触发
    if (e === G.boss && !e.phase2 && e.hp <= e.maxhp * 0.6 && e.hp > 0) startPhase2();
    if (e.hp <= 0) killEnemy(e);
  }
  function killEnemy(e) {
    if (e._dead) return; e._dead = true;
    G.kills++;
    save.totalKills = (save.totalKills || 0) + 1;   // 生涯累计（首页用），与单局 G.kills 各记各的
    // 煞气：小怪 3~5、精英 50、Boss 100 —— 3 分钟一局的燃料
    gainSha(e === G.boss ? 100 : (e.elite ? 50 : U.rand(3, 5)));
    // 厉飞雨·双身份化名系统（P0-1）：干脏活让「厉飞雨」背锅，好事以「韩天尊」留名
    if (save.liUnlocked && !e.isBossAlly) {
      if (save.identity === 'li') {
        save.repBlack++;
        if (Math.random() < 0.35) lifEgg('black');
      } else {
        save.repWhite++;
        if (Math.random() < 0.35) lifEgg('white');
      }
      checkHeibaiAch();
    }
    // 跟着的灵宠分一点修为：打得多，长得快
    if (save.pet) petGainXp(save.pet, Math.max(1, (e.xpVal || 1) * 0.3));
    addCombo();
    dropGems(e.x, e.y, Math.max(1, Math.round((e.xpVal || 1) * (curDiff().xp || 1))));
    const dr = curDiff().drop || 1;
    if (Math.random() < (0.02 + passiveSum('herb'))) dropHerb(e.x, e.y);
    if (Math.random() < 0.16 * dr) dropStone(e.x, e.y, 1);
    const edef = ENEMY_TYPES[e.type];
    const emats = (edef && edef.mats) || null;
    // 打怪杀人也能得法诀：有些人身上就揣着自家功法，掉了走过去捡
    if (edef && edef.skillDrop) {
      const sd = edef.skillDrop;
      const chSkill = (sd.chance || 0.012) * (dr || 1) * (e.elite ? 4 : 1) * (e === G.boss ? 8 : 1);
      if (Math.random() < chSkill) {
        const it = Items.get(sd.id);
        if (it) G.loot.push({ x: e.x, y: e.y, r: 9, bob: Math.random() * 6.28, item: it });
      }
    }
    // 兽卵：有些东西巢里就揣着卵，杀了捡回去，搁灵兽袋里孵
    if (edef && edef.eggDrop) {
      const ed = edef.eggDrop;
      const chEgg = (ed.chance || 0.02) * (dr || 1) * (e === G.boss ? 3 : 1);
      if (Math.random() < chEgg) {
        const it = Items.get(ed.id);
        if (it) G.loot.push({ x: e.x, y: e.y, r: 9, bob: Math.random() * 6.28, item: it });
      }
    }
    if (e === G.boss) { onBossDead(); }
    else if (e.elite) {
      if (Math.random() < Math.min(1, 0.55 * dr)) dropLoot(e.x, e.y, 1);
      dropMat(e.x, e.y, 3 + (G.diff && G.diff.rarity ? 1 : 0), emats);
      dropStone(e.x, e.y, 3);
      G.hitStop = Math.max(G.hitStop, 0.04); G.shake = Math.max(G.shake, 7);
      banner('斩 ' + (e.name || '精英'));
    } else {
      const ch = (((edef && edef.drop) || 0.03) + passiveSum('drop')) * dr;
      if (Math.random() < ch) dropLoot(e.x, e.y, 0);
      if (Math.random() < 0.18 * dr) dropMat(e.x, e.y, 1, emats);
    }
    spawnShatter(e);   // 先把它自己劈碎（复用它的精灵切 3×3，不用另画碎尸）
    spawnDeath(e.x, e.y);
    Sfx.enemyDie();
  }
  function dropGems(x, y, val) {
    if (val >= 20) { for (let i = 0; i < val; i++) { const a = Math.random() * 6.28, dd = U.rand(0, 42); G.gems.push({ x: x + Math.cos(a) * dd, y: y + Math.sin(a) * dd, r: 5, val: 1 }); } }
    else G.gems.push({ x, y, r: 5, val });
  }
  function dropHerb(x, y) { G.herbs.push({ x, y, r: 6 }); }

  // ---------- 连斩 ----------
  const COMBO_TIERS = [
    { n: 5, name: '初显锋芒' }, { n: 15, name: '势如破竹' },
    { n: 30, name: '杀伐果断' }, { n: 60, name: '剑气如潮' }, { n: 100, name: '一夫当关' }
  ];
  function comboRank(c) { let r = ''; for (const t of COMBO_TIERS) if (c >= t.n) r = t.name; return r; }
  function addCombo() {
    G.combo++; G.comboT = 2.6;
    if (G.combo % 25 === 0) {
      dropStone(G.player.x + U.rand(-30, 30), G.player.y + U.rand(-30, 30), 3);
      spawnText(G.player.x, G.player.y - 26, '连斩 ' + G.combo + ' · 灵石入袋', '#ffd24a', 14);
      Sfx.buff();
    }
    showCombo();
  }
  function showCombo() {
    if (!elCombo) return;
    const c = G.combo;
    if (c === G.lastCombo) return;
    G.lastCombo = c;
    if (c < 3) { elCombo.style.display = 'none'; return; }
    const rank = comboRank(c);
    let tier = 0;
    for (const t of COMBO_TIERS) if (c >= t.n) tier++;
    elCombo.innerHTML = '<b>×' + c + '</b><span>连斩' + (rank ? '　' + rank : '') + '</span>';
    // 只在跨过档位时重放动画，避免每杀一只都强制重排
    if (tier !== G.comboTier) {
      G.comboTier = tier;
      elCombo.classList.remove('pop');
      void elCombo.offsetWidth;
      elCombo.classList.add('pop');
    }
    elCombo.style.display = 'block';
  }
  function resetCombo() {
    G.combo = 0; G.comboT = 0; G.lastCombo = -1; G.comboTier = 0;
    if (elCombo) elCombo.style.display = 'none';
  }

  function hitPlayer(dmg) {
    const p = G.player; if (p.iv > 0 || G.god) return;
    if (G.state === 'down') return;          // P6：已经躺着了，别再挨打（免得重复触发倒地）
    const taken = dmg * (1 - armorRate());
    p.hp -= taken; p.iv = 0.55; p.hurtFlash = 0.2; G.shake = 8; G.flash = Math.max(G.flash, 0.45); Sfx.hurt();
    spawnText(p.x, p.y - p.r - 6, '-' + Math.round(taken), '#ff7676', 16);
    if (G.combo >= 5) resetCombo();
    if (p.hp <= 0) { p.hp = 0; coopDown(); }
  }

  // ---------- P6 倒地观战 / 救援复活 ----------
  const DOWN_AUTO = 30;      // 没人来救，自己缓过来要多久（秒）
  const RESCUE_NEED = 1.2;   // 队友贴身站着多久算救起来
  const RESCUE_R = 46;       // 救援判定半径

  // 血空了：单人照旧判负；联机则先躺下观战，等队友来拉
  function coopDown() {
    if (G.state === 'down' || G.state === 'gameover') return;
    const linked = !!(window.Net && window.Net.self());
    // 两个人都在地上 → 没人救得动，判负收场
    if (!linked || (G.partner && G.partner.down)) { gameOver(); return; }
    G.state = 'down'; G.downT = 0; G.rescueT = 0;
    if (window.Coop) window.Coop.sendDown();
    banner('你倒下了 · 等队友靠近救援'); Sfx.lose();
  }

  // 被队友拉起来（pct：起来后剩多少血）
  function revivePlayer(pct) {
    const p = G.player; if (!p) return;
    p.hp = Math.max(1, Math.round(p.maxhp * (pct || 0.5)));
    p.iv = 1.6; p.hurtFlash = 0.2;
    G.state = 'play'; G.downT = 0; G.rescueT = 0; last = performance.now();
    spawnText(p.x, p.y - 30, '重新站起', '#7fe0a0', 16);
    Sfx.levelup();
    if (window.Coop) window.Coop.sendRevived();
  }

  // 倒地期间的轻量更新：世界照转，但自己不能动、不能打
  function updateDown(dt) {
    G.time += dt;
    // 房主倒了也得继续算怪，否则队友那边的怪会集体卡住
    if (G.coopRole !== 'client') { updateEBullets(dt); updateEnemies(dt); }
    updateParts(dt);
    // 镜头跟着活着的队友，好歹能看戏
    const pt = G.partner;
    if (pt && pt.shown) { G.cam.x = pt.x - W / 2; G.cam.y = pt.y - H / 2; }
    ensureDecor();
    // 倒地也要继续发心跳与状态（带 down 标记），不然队友会当成掉线
    if (window.Coop) { window.Coop.tickSend(dt); window.Coop.update(dt); }
    G.downT += dt;
    if (G.downT >= DOWN_AUTO) { revivePlayer(0.3); banner('缓过这口气 · 自行起身'); }
  }

  // 队友倒了：凑过去站着就能把他拉起来（res 为 true 表示这一帧在救援范围内）
  function tickRescue(dt, near) {
    if (near) {
      G.rescueT += dt;
      if (G.rescueT >= RESCUE_NEED) {
        G.rescueT = 0;
        if (window.Coop) window.Coop.sendRevive();
      }
    } else if (G.rescueT > 0) G.rescueT = 0;
  }

  // ---------- 子弹 ----------
  // 队友的攻击特效：只走动画，不参与命中判定。
  // 伤害归房主权威（客机命中走 hit 上报），这边纯粹是「让你看得见队友在打」。
  function updateFxBullets(dt) {
    const arr = G.fxBullets;
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) arr.splice(i, 1);
    }
    if (arr.length > 160) arr.splice(0, arr.length - 160);
  }
  function updateBullets(dt) {
    const arr = G.bullets;
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      if (b.home) {
        const t = nearestEnemy(420);
        if (t) {
          const a = Math.atan2(t.y - b.y, t.x - b.x);
          const cur = Math.atan2(b.vy, b.vx);
          let na = cur + U.clamp(((a - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -2.5 * dt, 2.5 * dt);
          const sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let hit = false;
      for (const e of allEnemies()) {
        if (b.hit.has(e)) continue;
        if (U.dist(b.x, b.y, e.x, e.y) < b.r + e.r) {
          if (e._remote && G.coopRole === 'client') {
            // 客机子弹命中房主权威怪：只上报命中，不本地扣血；一发一报后立即消失
            if (window.Coop) window.Coop.reportHit(e._id, b.dmg);
            b.hit.add(e); spawnHit(b.x, b.y); b.life = 0; continue;
          }
          damageEnemy(e, b.dmg); b.hit.add(e);
          if (b.stun) e.stunT = Math.max(e.stunT || 0, b.stun);   // 失神刺：硬直
          // 血炼神光：血光吞了对方的精血，按伤害的定比回补己身（原著「伤人亦自补」）
          if (b.leech && G.player && G.player.hp > 0) G.player.hp = Math.min(G.player.maxhp, G.player.hp + b.dmg * b.leech);
          // 命中处溅出的火花沿着子弹来向的反面飞：一眼看得出是从哪边打过来的
          spawnHit(b.x, b.y, VFX_HIT_COLOR[b.vfx || b.fx] || '#fff', Math.atan2(b.vy, b.vx));
          if (b.pierce <= 0) { hit = true; break; }
          b.pierce--;
        }
      }
      if (b.life <= 0 || hit || offscreen(b, 80)) arr.splice(i, 1);
    }
  }
  function updateEBullets(dt) {
    const p = G.player;
    // P6：队友躺着就别再追他、别再撞他（倒地的人不再吃伤）
    const pt = (G.coopRole === 'host' && G.partner && G.partner.shown && !G.partner.down) ? G.partner : null;
    for (let i = G.ebullets.length - 1; i >= 0; i--) {
      const b = G.ebullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (U.dist(p.x, p.y, b.x, b.y) < b.r + p.r) { hitPlayer(b.dmg); G.ebullets.splice(i, 1); continue; }
      if (pt && U.dist(pt.x, pt.y, b.x, b.y) < b.r + (pt.r || 9)) { if (window.Coop) window.Coop.addPartnerHurt(b.dmg); G.ebullets.splice(i, 1); continue; }
      // 天降物砸到地面：炸开再消失。没有这一下，它会径直穿过地面继续往下飞，
      // 玩家看到的是"东西掉进了地底"，而不是"砸在地上"。
      if (b.landY !== undefined && b.y >= b.landY) {
        G.parts.push({ ring: true, x: b.x, y: b.landY, r: 3, maxr: b.r * 2.4, life: 0.26, maxlife: 0.26, color: '#ffb060' });
        for (let k = 0; k < 3; k++) {
          const a = Math.random() * 6.28;
          G.parts.push({ x: b.x, y: b.landY, vx: Math.cos(a) * 70, vy: Math.sin(a) * 40 - 30, life: 0.22, maxlife: 0.22, size: 3, color: '#ffb060' });
        }
        G.ebullets.splice(i, 1); continue;
      }
      if (b.life <= 0 || offscreen(b, 60)) G.ebullets.splice(i, 1);
    }
    if (G.ebullets.length > 420) G.ebullets.splice(0, G.ebullets.length - 420);
    // 预警圈只做视觉，不吃伤害；前摇走完自己消失
    for (let i = G.tells.length - 1; i >= 0; i--) {
      G.tells[i].t -= dt;
      if (G.tells[i].t <= 0) G.tells.splice(i, 1);
    }
    // 地面持续区：只承载「看得见的范围 + 减速」，伤害仍在落招那一瞬一次性结算，
    // 所以加视觉不会改变任何一张图的难度（这一点是刻意守住的）。
    for (let i = G.zones.length - 1; i >= 0; i--) {
      const z = G.zones[i];
      z.t -= dt; z.age = (z.age || 0) + dt;
      if (z.t <= 0) { G.zones.splice(i, 1); continue; }
      if (!G.player) continue;
      if (U.dist(G.player.x, G.player.y, z.x, z.y) < z.r + G.player.r * 0.5) {
        if (z.slow) {
          G.player.slowT = Math.max(G.player.slowT || 0, 0.18);
          G.player.slowK = Math.min(G.player.slowK || 1, z.slow);
        }
        if (z.pull) {
          // 漩涡：每帧往中心拽一点，力度很小，只是让「被缠住」有手感
          const dx = z.x - G.player.x, dy = z.y - G.player.y, dd = Math.hypot(dx, dy) || 1;
          G.player.x += dx / dd * z.pull * dt; G.player.y += dy / dd * z.pull * dt;
        }
      }
    }
    updateHazards(dt);
  }

  // ---------- 敌人 ----------
  function mapDiff() { return (G.map && G.map.diff) || 1; }
  // 回刷低级图时：境界超出该图推荐值越多，怪物加成越高，避免一路平推
  function levelPad() {
    const d = curDiff();
    if (!d.levelScale || !G.player) return 1;
    const rec = (G.map && G.map.startLevel) || 1;
    const over = Math.max(0, G.player.level - rec);
    return 1 + over * d.levelScale;
  }
  // 小怪强度的「等级锚」：按本图推荐等级取，不看玩家当前等级。
  // 原先只有 mapDiff（每图手写的 1.0~7.0），它跟等级正相关，却远跟不上玩家输出——
  // 结果 640 级的小怪还是 lv80 的硬度。现在由 js/balance.js 的 ANCHOR 表统一给。
  function mapLv() { return (G.map && G.map.startLevel) || (G.player && G.player.level) || 1; }
  function hpMulBase() {
    const d = curDiff();
    const B = window.BALANCE;
    const k = B ? B.trashHpK(mapLv()) : mapDiff();
    return (1 + G.time / 70 * 0.4) * k * (d.hp || 1) * levelPad();
  }
  function dmgMulBase() {
    const d = curDiff();
    const B = window.BALANCE;
    const k = B ? B.trashDmgK(mapLv()) : (1 + (mapDiff() - 1) * 0.55);
    const mapK = (G.map && G.map.trashDmgMul) || 1;   // 教学关可单独压低小怪伤害（map.trashDmgMul）
    return (1 + G.time / 120 * 0.15) * k * (d.dmg || 1) * mapK;
  }
  function spawnPos() {
    const a = Math.random() * Math.PI * 2;
    const d = Math.max(W, H) / 2 + 50;
    return { x: G.player.x + Math.cos(a) * d, y: G.player.y + Math.sin(a) * d };
  }
  // 本图怪物的「硬度基准」：敌人表里的 def.hp 从狼 12 一路写到幽奴 28 万，
  // 本身就是一条跨图成长曲线；hpMulBase 又按等级标了一条。两条曲线相乘 = 双重复利，
  // 结果 lv36 的小怪血量是设计意图的 11 倍（实测鬼灵门弟子 765 血 / 玩家秒伤 70 = 一只打 11 秒），
  // lv460 更是 1000 倍以上 —— 中后期全线「打不动」。这里把 def.hp 压成「相对本图平均的硬度」：
  // 同一张图里该厚的仍然厚，但不再跨图复利。
  const ENEMY_BASE_HP = 12;   // lv1 基准怪（狼）的设计血量
  // 同理，敌人表里的 def.dmg 也是一条跨图曲线（狼 6 → 幽奴 322），而 trashDmgK 又按等级
  // 标了一条。两条相乘的下场是：lv1 小怪单击 3.1% 气血，lv36 变 17%，lv80 直接 36% —— 
  // 后期不是「有危机感」，是一碰就死，中间没有任何过渡。
  // 这里把 def.dmg 压成「同图内的相对凶悍度」（开方压缩），绝对量统一由 ENEMY_BASE_DMG 定，
  // 于是全游戏小怪单击都落在同一档：约占该级气血 trashDmgK 所标的比例。
  const ENEMY_BASE_DMG = 6;   // lv1 基准怪（恶狼 dmg 6）的单击
  function refHpOfMap() {
    if (G._refHp != null) return G._refHp;
    const list = (G.map && G.map.enemies) || [];
    let sum = 0, n = 0;
    for (const t of list) { const d = ENEMY_TYPES[t]; if (d && d.hp > 0) { sum += d.hp; n++; } }
    G._refHp = n ? sum / n : ENEMY_BASE_HP;
    return G._refHp;
  }
  // 本图怪物的「凶悍基准」：与 refHpOfMap 同一套思路，只用于把伤害归一化到同图平均
  function refDmgOfMap() {
    if (G._refDmg != null) return G._refDmg;
    const list = (G.map && G.map.enemies) || [];
    let sum = 0, n = 0;
    for (const t of list) { const d = ENEMY_TYPES[t]; if (d && d.dmg > 0) { sum += d.dmg; n++; } }
    G._refDmg = n ? sum / n : ENEMY_BASE_DMG;
    return G._refDmg;
  }
  // ---------- 追击档：越往后，没有远程手段的怪越追得上人 ----------
  // 改之前全场最快的小怪 90，玩家 96 —— 没有一只追得上你，「越往后越危险」只是纸面数字。
  //
  // 每张图指定一只「猎手」：本图里本来就会追人的怪（base≥55 或带冲刺）中最快的那个。
  // 它的目标速度随境界从自身原值爬到 98（玩家 96 × 1.02）—— 跑不掉，只能靠打。
  // 其余怪按档位小幅靠拢且封顶 92：绝不越过玩家，留出「主动走位能拉开」的空间。
  // 远程怪完全不动：它们靠弹幕施压，再给速度就是双重惩罚。
  //
  // 为什么猎手不能用「本图最快」来选：虚天殿 / 昆吾山这类图最快只有 26，
  // 一选就把 26 速的尸傀拉到 80（+208%），肉盾定位直接垮掉。猎手必须本来就快。
  const HUNTER_MAX = 98, NON_HUNTER_CAP = 92, HUNTER_MIN_BASE = 55;
  function isRangedTrash(type) {
    const art = (window.TRASH_ARTS || {})[type];
    return !!(art && art.t === 'cast');
  }
  function hunterOfMap() {
    if (G._hunterType !== undefined) return G._hunterType;
    const list = (G.map && G.map.enemies) || [];
    let best = null, bs = 0;
    for (const ty of list) {
      if (isRangedTrash(ty)) continue;
      const d = ENEMY_TYPES[ty]; if (!d) continue;
      const sp = d.spd || 0;
      if (d.dash) { best = ty; break; }              // 带冲刺的优先当猎手
      if (sp >= HUNTER_MIN_BASE && sp > bs) { bs = sp; best = ty; }
    }
    G._hunterType = best;
    return best;
  }
  function chaseSpd(type, def) {
    const base = def.spd || 0;
    if (isRangedTrash(type)) return base;
    const ri = window.rangeModel ? window.rangeModel.realmIdx(mapLv()) : 0;
    if (ri <= 0) return base;   // 炼气期原样，不改早期手感
    const t = Math.pow(ri / 7, 0.5);   // 开方：前期先把差距拉掉大半，别等到金仙才摸得到人
    if (hunterOfMap() === type) return Math.max(base, base + (HUNTER_MAX - base) * t);
    const tgt = base >= 70 ? 83 : (base >= 45 ? 71 : 0);
    if (!tgt) return base * (1 + 0.22 * t);          // 肉盾只微涨：拉它等于把肉盾定位抹掉
    return Math.max(base, Math.min(NON_HUNTER_CAP, base + (tgt - base) * t));
  }
  function makeEnemy(type, x, y, hpMul, dmgMul) {
    const def = ENEMY_TYPES[type];
    // 同图内相对硬度。默认沿用 def.hp 开方（旧口径）；若本图写了 hulMap，则按「角色硬度」重标，
    // 并按本图平均归一 —— 既恢复肉盾/快攻的硬度性格，又不改变整图平均强度。
    // （后期图 def.hp 都挤在 25~42 万的窄带里，开方后几乎全 1.0，性格被压平；hulMap 专治这个。）
    let rel;
    const hm = G.map && G.map.hulMap;
    if (hm && hm[type] != null) {
      if (G._hulAvg == null) { const v = Object.keys(hm).map(k => hm[k]); G._hulAvg = v.reduce((a, c) => a + c, 0) / v.length || 1; }
      rel = hm[type] / G._hulAvg;
    } else {
      rel = Math.pow(def.hp / refHpOfMap(), 0.5);
    }
    // 同图内的相对凶悍度：幽灵比妖兽脆、幽奴比修士狠，这个性格保留；
    // 但不再跨图复利（绝对量由 ENEMY_BASE_DMG × dmgMul 统一）。
    const relDmg = Math.pow((def.dmg || ENEMY_BASE_DMG) / refDmgOfMap(), 0.5);
    const e = {
      _id: ++enemySeq,
      type, x, y, hp: ENEMY_BASE_HP * hpMul * rel, maxhp: ENEMY_BASE_HP * hpMul * rel,
      spd: chaseSpd(type, def) * (curDiff().spd || 1), dmg: ENEMY_BASE_DMG * dmgMul * relDmg,
      r: def.r, xpVal: def.xp, spr: def.spr, wob: def.wob, charge: def.charge, dash: def.dash,
      hitFlash: 0, t: 0, dashT: U.rand(1, 3), _orbCd: {},
      // 功法（js/arts.js）：每种小怪一门手法，贴身命中时按形体显形
      art: (window.TRASH_ARTS || {})[type] || null, _artCd: 0
    };
    return e;
  }
  function spawnEnemy(type) {
    const pos = spawnPos();
    G.enemies.push(makeEnemy(type, pos.x, pos.y, hpMulBase(), dmgMulBase()));
  }
  function spawnEliteWolf(x, y) {
    G.enemies.push(makeEnemy('wolf', x, y, hpMulBase(), dmgMulBase()));
  }
  function spawnElite(idx) {
    const pos = spawnPos();
    const names = (G.map && G.map.elites) || ['精英·狼王', '精英·厉无极'];
    const k = 1 + idx * 0.22;
    const dm = curDiff();
    // 精英血量按「该级玩家 6 秒输出」定，不吃 mapDiff：
    // 原先 300 + 时间×2.4 是绝对数，到元婴期就只是一只稍胖的狼。
    const B = window.BALANCE;
    const baseHp = B ? B.eliteHp(mapLv()) : (300 + G.time * 2.4);
    const baseDmg = B ? B.eliteDmg(mapLv()) : (11 + G.time * 0.06);
    const dHp = (dm.hp || 1) * levelPad() * (1 + G.time / 150 * 0.3);
    const dDmg = dm.dmg || 1;
    if (idx % 2 === 0) {
      const hp = baseHp * k * dHp;
      const e = {
        type: 'wolfking', x: pos.x, y: pos.y, hp, maxhp: hp,
        spd: 66 * (dm.spd || 1), dmg: baseDmg * k * dDmg, r: 15, xpVal: 30, spr: 'wolf', scale: 2,
        wob: false, charge: true, dash: false, hitFlash: 0, t: 0, howlT: 7, _orbCd: {}, elite: true, name: names[idx] || names[0] || '头狼'
      };
      applyEliteKit(e, e.name); G.enemies.push(e); banner('⚠ 精英 · ' + e.name); Sfx.warn();
    } else {
      const hp = baseHp * k * 1.12 * dHp;
      const e = {
        type: 'blacklord', x: pos.x, y: pos.y, hp, maxhp: hp, spd: 44 * (dm.spd || 1), dmg: baseDmg * k * 0.9 * dDmg, r: 14,
        xpVal: 45, spr: 'blacklord', scale: 1.4, wob: false, charge: false, dash: false, hitFlash: 0,
        t: 0, shootT: 1.5, _orbCd: {}, elite: true, name: names[idx] || names[1] || '厉无极', ranged: true
      };
      applyEliteKit(e, e.name); G.enemies.push(e); banner('⚠ 精英 · ' + e.name); Sfx.warn();
    }
  }
  // ---------- 灵宠 ----------
  // ---------- 战斗右侧快捷栏（三格） ----------
  const QUICK_CD = { pet: 12, item: 10 };
  function quickSlot(i) { const q = save.quick || (save.quick = [null, null, null]); return q[i] || null; }
  function setQuick(i, kind, id) {
    const q = save.quick || (save.quick = [null, null, null]);
    q[i] = (kind && id) ? { kind: kind, id: id } : null;
    writeSave();
    renderQuickBar();
  }
  function quickLabel(slot) {
    if (!slot) return { icon: '·', name: '空', kind: null };
    if (slot.kind === 'pet') {
      const p = (window.PETS || []).find(x => x.id === slot.id);
      return { icon: (p && p.icon) || '🐾', name: (p && p.name) || slot.id, kind: 'pet', has: !!p };
    }
    const it = Items.get(slot.id);
    return { icon: (it && it.icon) || '🍶', name: (it && it.name) || slot.id, kind: 'item', has: !!it, count: (save.inventory[slot.id] || 0) };
  }
  function renderQuickBar() {
    if (!elQuick) return;
    const fight = G.map && (G.map.type === 'combat' || G.map.type === 'boss' || G.map.type === 'chase');
    const show = !!fight && (G.state === 'play' || G.state === 'dialog');
    elQuick.classList.toggle('on', !!show);
    for (let i = 0; i < elQuickBtns.length; i++) {
      const b = elQuickBtns[i], slot = quickSlot(i), lab = quickLabel(slot);
      const ic = b.querySelector('.qb-icon');
      if (ic) ic.textContent = lab.icon;
      // 用尽的格子也压暗：一眼看出这格暂时指望不上
      const gone = !!(slot && slot.kind === 'item' && (lab.count || 0) <= 0);
      b.classList.toggle('empty', !slot || gone);
      b.classList.toggle('pet', !!(slot && slot.kind === 'pet'));
      b.title = !slot ? '空着 · 洞府里装配'
        : lab.name + (slot.kind === 'item' ? '（余 ' + (lab.count || 0) + (gone ? ' · 已用尽' : '') + '）' : '')
          + '　按 ' + (i + 1) + ' 或点一下';
    }
    for (let i = 0; i < elQuickBtns.length; i++) paintQuickCd(i);
  }
  function paintQuickCd(i) {
    const b = elQuickBtns[i]; if (!b) return;
    const t = G.quickCd ? (G.quickCd[i] || 0) : 0;
    if (t > 0) { b.classList.add('cooling'); const cd = b.querySelector('.qb-cd'); if (cd) cd.textContent = Math.ceil(t); }
    else b.classList.remove('cooling');
  }
  // 点/按一下就放。战斗中（含战斗里弹出的际遇对话）都能用，其余局面没有这栏
  function useQuick(i) {
    if (!(G.state === 'play' || G.state === 'dialog')) return false;
    const pl = G.player;
    const slot = quickSlot(i);
    if (!slot) {
      if (pl) spawnText(pl.x, pl.y - 34, '此格空着 · 洞府装配', '#c9b27a', 12);
      notify('此格空着 · 去洞府装'); Sfx.warn(); return false;
    }
    if ((G.quickCd[i] || 0) > 0) {
      // 间隔中给个明确回音，否则玩家以为又坏了
      const t = Math.ceil(G.quickCd[i]);
      if (pl) spawnText(pl.x, pl.y - 34, '回气中 · ' + t, '#9aa7b8', 12);
      Sfx.warn(); return false;
    }
    if (slot.kind === 'pet') {
      const p = (window.PETS || []).find(x => x.id === slot.id);
      if (!p) { notify('这只灵宠不在身边'); Sfx.warn(); return false; }
      const rad = 270;
      const dmg = (((G.realm && G.realm.dmg) || 1) * 90 + 30) * (p.dmg || 0.6) * 3.2;
      let hitN = 0;
      for (const e of allEnemies()) {
        if (U.dist(pl.x, pl.y, e.x, e.y) > rad) continue;
        damageEnemy(e, dmg);
        const a = Math.atan2(e.y - pl.y, e.x - pl.x);
        e.x += Math.cos(a) * 26; e.y += Math.sin(a) * 26;
        hitN++;
      }
      G.parts.push({ ring: true, x: pl.x, y: pl.y, r: 10, maxr: rad, life: 0.5, maxlife: 0.5, color: '#9ad8ff' });
      banner(p.name + ' · 扑击' + (hitN ? '（' + hitN + ' 敌）' : ''));
      Sfx.nova();
      G.quickCd[i] = QUICK_CD.pet;
    } else {
      const it = Items.get(slot.id);
      if (!it) { notify('此物已不存在 · 去洞府重装'); Sfx.warn(); return false; }
      // 装备不能凭空"用掉"，它得在洞府穿在身上
      if (it.slot) { notify(it.name + ' 得在洞府佩戴'); Sfx.warn(); return false; }
      // 破境要带在身上的至宝（补天丹之类），别当补药吃了
      if (isGateNeed(it.id)) { notify(it.name + ' 另有他用 · 破境时要带在身上'); Sfx.warn(); return false; }
      if ((save.inventory[slot.id] || 0) <= 0) {
        if (pl) spawnText(pl.x, pl.y - 34, '袋中没有了', '#c9b27a', 12);
        notify('袋中没有了'); Sfx.warn(); return false;
      }
      save.inventory[slot.id]--;
      if (save.inventory[slot.id] <= 0) delete save.inventory[slot.id];
      save.totalItems = Math.max(0, (save.totalItems || 1) - 1);
      // noRun：这是"用掉"，不是"本局捡到"，别混进结算的收获清单
      applyItem(it, { fromBag: true, noRun: true });
      G.quickCd[i] = QUICK_CD.item;
    }
    writeSave();
    refreshTitle();
    renderQuickBar();
    return true;
  }
  // 洞府「储物袋其他」里消耗品的「用」：服用丹药 / 催动符箓 / 捏碎灵石 —— 与 useQuick 的物品分支同口径，
  // 只是不进快捷栏、不限回气，在洞府直接吃（破境要带在身上的至宝不让当补药吞）。
  function useItemFromBag(id) {
    const it = Items.get(id);
    if (!it) return;
    if (it.slot) { notify(it.name + ' 得在洞府佩戴'); Sfx.warn(); return; }
    if (isGateNeed(it.id)) { notify(it.name + ' 另有他用 · 破境时要带在身上'); Sfx.warn(); return; }
    if ((save.inventory[id] || 0) <= 0) { notify('袋中没有了'); Sfx.warn(); return; }
    if (!canUse(it)) { notify('境界不足 · 需' + realmName(it.req)); Sfx.warn(); return; }
    save.inventory[id]--;
    if (save.inventory[id] <= 0) delete save.inventory[id];
    save.totalItems = Math.max(0, (save.totalItems || 1) - 1);
    applyItem(it, { fromBag: true, noRun: true });
    writeSave();
    renderCave(); refreshTitle();
  }
  function tickQuickCd(dt) {
    if (!G.quickCd) return;
    let dirty = false;
    for (let i = 0; i < 3; i++) {
      if (G.quickCd[i] > 0) { G.quickCd[i] = Math.max(0, G.quickCd[i] - dt); dirty = true; }
    }
    if (dirty) for (let i = 0; i < 3; i++) paintQuickCd(i);
  }

  function petDef() {
    if (!save.pet || !window.PETS) return null;
    return window.PETS.find(p => p.id === save.pet) || null;
  }
  function nearestEnemyFrom(x, y, maxd) {
    let best = null, bd = maxd * maxd;
    for (const e of allEnemies()) {
      const d = U.dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function updatePet(dt) {
    if (!G.pet || !G.player) return;
    const def = petDef(); if (!def) return;
    const p = G.player, pt = G.pet;
    const dir = p.dir || 1;
    // 跟在身后半步，不挡视线
    const tx = p.x - 24 * dir, ty = p.y + 10;
    // 真的在挪才迈步：灵宠是追着主人跑的，站定的时候腿得停下
    pt.moving = Math.abs(tx - pt.x) + Math.abs(ty - pt.y) > 2;
    if (pt.moving) pt.gait = (pt.gait || 0) + dt * 9.5;
    pt.x += (tx - pt.x) * Math.min(1, dt * 6.5);
    pt.y += (ty - pt.y) * Math.min(1, dt * 6.5);
    pt.bob = (pt.bob || 0) + dt;
    if (G.state !== 'play') return;
    pt.cd -= dt;
    if (pt.cd > 0) return;
    const t = nearestEnemyFrom(pt.x, pt.y, 430);
    if (!t) { pt.cd = 0.25; return; }
    const a = Math.atan2(t.y - pt.y, t.x - pt.x);
    // 灵宠出手比主人轻，胜在不停
    const dmg = (G.realm.dmg * 70 + 10) * (def.dmg || 0.55);
    G.bullets.push({
      x: pt.x, y: pt.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
      r: 5, dmg: dmg, life: 1.2, pierce: 1, hit: new Set(), home: true, pet: true
    });
    pt.cd = (def.rate || 1.1) * petRateMul(def.id);
  }

  // ==========================================================================
  // 灵兽袋 · 灵宠喂养（第四部）
  // 灵宠不再只是一个 id：路上捡的卵孵出来，先养进灵兽袋的禁制空间，喂食长阶。
  // ==========================================================================
  const PET_BAGS = ['bag_ling', 'bag_ling2', 'ring_ling'];
  const FEED_SEC = 20, FEED_XP = 12, FEED_STONE = 4;

  // 老存档的 pets 是 id 字符串数组，统一成 { id, lv, xp }
  function normalizePets() {
    if (!Array.isArray(save.pets)) save.pets = [];
    save.pets = save.pets.filter(Boolean).map(x => (typeof x === 'string') ? { id: x, lv: 1, xp: 0 } : x);
    for (const e of save.pets) { if (typeof e !== 'object') continue; if (!e.lv) e.lv = 1; if (!e.xp) e.xp = 0; }
  }
  function petEntry(id) { if (!Array.isArray(save.pets)) return null; return save.pets.find(x => x && x.id === id) || null; }
  function petDefOf(id) { return (window.PETS || []).find(x => x.id === id) || null; }
  function petCap() {
    let cap = 1;                                   // 没袋子的时候，怀里只揣得下一只
    for (const bid of PET_BAGS) {
      if ((save.inventory[bid] || 0) <= 0) continue;
      const it = Items.get(bid);
      if (it && it.petCap) cap = Math.max(cap, it.petCap);
    }
    return cap;
  }
  function petBagName() {
    for (let i = PET_BAGS.length - 1; i >= 0; i--) {
      if ((save.inventory[PET_BAGS[i]] || 0) > 0) { const it = Items.get(PET_BAGS[i]); if (it) return it.name; }
    }
    return null;
  }
  function petLv(id) { const e = petEntry(id); return e ? (e.lv || 1) : 1; }
  function petXpNeed(lv) { return Math.floor(24 + (lv - 1) * 16); }
  function petDmgMul(id) { return 1 + 0.07 * (petLv(id) - 1); }
  function petRateMul(id) { return 1 / (1 + 0.03 * (petLv(id) - 1)); }
  function petRoom() { normalizePets(); return Math.max(0, petCap() - (save.pets || []).length); }

  // 储物袋里待孵的卵（灵兽袋满时不白丢，先收着，腾出地方再孵）
  function eggRows() {
    const out = [];
    for (const id of Object.keys(save.inventory || {})) {
      if ((save.inventory[id] || 0) <= 0) continue;
      const it = Items.get(id);
      if (!it || !it.hatch) continue;
      out.push({ id: id, name: it.name, icon: it.icon, n: save.inventory[id], to: it.hatch });
    }
    return out;
  }
  // 孵一枚卵：成则入袋，装不下 applyItem 会自己把卵还回来
  function hatchEgg(itemId) {
    const it = Items.get(itemId);
    if (!it || !it.hatch) return 'nope';
    if ((save.inventory[itemId] || 0) <= 0) return 'none';
    save.inventory[itemId]--;
    if (save.inventory[itemId] <= 0) delete save.inventory[itemId];
    if (save.totalItems > 0) save.totalItems--;
    applyItem(it);
    writeSave();
    if (G.state === 'cave') renderCave(); else if (G.state === 'shop') renderShop();
    return (save.inventory[itemId] || 0) > 0 ? 'kept' : 'hatched';
  }

  // 收一只灵宠：装不下就收不了（得先放生一只）
  function addPet(id) {
    normalizePets();
    if (!petDefOf(id)) return 'nope';
    if (petEntry(id)) return 'dup';
    if (save.pets.length >= petCap()) return 'full';
    save.pets.push({ id: id, lv: 1, xp: 0 });
    writeSave();
    return 'ok';
  }
  function releasePet(id) {
    normalizePets();
    const i = save.pets.findIndex(x => x && x.id === id);
    if (i >= 0) save.pets.splice(i, 1);
    if (save.pet === id) { save.pet = null; G.pet = null; }
    for (let k = 0; k < 3; k++) { const s = quickSlot(k); if (s && s.kind === 'pet' && s.id === id) setQuick(k, null, null); }
    writeSave();
  }
  function petGainXp(id, v) {
    const e = petEntry(id); if (!e) return;
    e.xp = (e.xp || 0) + v;
    let need = petXpNeed(e.lv), up = false;
    let guard = 0;
    while (e.xp >= need && guard++ < 50) { e.xp -= need; e.lv = (e.lv || 1) + 1; need = petXpNeed(e.lv); up = true; }
    if (up) { writeSave(); const d = petDefOf(id); notify((d ? d.name : '灵宠') + ' 长进 · 第 ' + e.lv + ' 阶'); }
  }

  // 挂机喂养：一段时辰喂一颗饲灵丸（没有就折成灵石）。开着就不用守着。
  function tickPetFeed(dt) {
    if (!save.petFeed || !save.petFeed.on) return;
    if (G.state !== 'play' && G.state !== 'down') return;
    save.petFeed.t = (save.petFeed.t || 0) + dt;
    if (save.petFeed.t < FEED_SEC) return;
    save.petFeed.t = 0;
    normalizePets();
    let fed = 0, starved = 0;
    for (const e of save.pets) {
      if ((save.inventory['m_siling'] || 0) > 0) {
        save.inventory['m_siling']--;
        if (save.inventory['m_siling'] <= 0) delete save.inventory['m_siling'];
        petGainXp(e.id, FEED_XP); fed++;
      } else if ((save.stones || 0) >= FEED_STONE) {
        save.stones -= FEED_STONE;
        petGainXp(e.id, Math.floor(FEED_XP * 0.6)); fed++;
      } else starved++;
    }
    if (fed && G.state === 'play' && G.player) spawnText(G.player.x, G.player.y - 44, '灵兽进食 ×' + fed, '#9ad8ff', 12);
    if (starved && G.state === 'play') notify('饲灵丸没了 · 灵兽饿着');
    if (fed) { writeSave(); refreshTitle(); }
  }

  // ==========================================================================
  // 同伴：按剧情出现的人，跟在身边一起打（第四部）
  // ==========================================================================
  function mateDef() { return (window.MATES || []).find(m => m.id === save.mate) || null; }
  function hasMate(id) { return (save.mates || []).indexOf(id) >= 0; }
  function addMate(id) {
    if (!save.mates) save.mates = [];
    if (save.mates.indexOf(id) < 0) { save.mates.push(id); writeSave(); return 'ok'; }
    return 'dup';
  }
  function setMate(id) {
    if (id && !hasMate(id)) return;
    save.mate = (save.mate === id) ? null : id;
    G.mate = save.mate ? { id: save.mate, x: G.player ? G.player.x - 34 : 0, y: G.player ? G.player.y + 12 : 0, cd: 0.8, bob: 0 } : null;
    // 同伴特性走装备加成那一路：换人就要重算，否则上限和减伤还挂在上一个人身上
    if (G.player) { G.gear = gearBonus(); recalcMaxhp(true); }
    const d = mateDef();
    if (save.mate) { notify('同伴同行 · ' + (d ? d.name : id)); Sfx.buff(); }
    else { notify('同伴暂别'); Sfx.warn(); }
    writeSave();
    renderCave();
  }
  function updateMate(dt) {
    if (!G.mate || !G.player) return;
    const def = mateDef(); if (!def || def.id !== G.mate.id) return;
    const p = G.player, mt = G.mate;
    const dir = p.dir || 1;
    // 站在另一侧，别和灵宠挤在一块
    const tx = p.x + 30 * dir, ty = p.y + 12;
    mt.moving = Math.abs(tx - mt.x) + Math.abs(ty - mt.y) > 2;
    if (mt.moving) mt.gait = (mt.gait || 0) + dt * 9.5;
    mt.x += (tx - mt.x) * Math.min(1, dt * 6);
    mt.y += (ty - mt.y) * Math.min(1, dt * 6);
    mt.bob = (mt.bob || 0) + dt;
    if (G.state !== 'play') return;
    mt.cd -= dt;
    if (mt.cd > 0) return;
    const t = nearestEnemyFrom(mt.x, mt.y, 470);
    if (!t) { mt.cd = 0.3; return; }
    const a = Math.atan2(t.y - mt.y, t.x - mt.x);
    // 同伴比灵宠重得多，出手慢一拍
    const dmg = (G.realm.dmg * 90 + 16) * (def.dmg || 0.6);
    G.bullets.push({
      x: mt.x, y: mt.y, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330,
      r: 6, dmg: dmg, life: 1.3, pierce: 1, hit: new Set(), home: true, mate: true
    });
    mt.cd = def.rate || 1.1;
  }

  // ==========================================================================
  // 境界突破：不是刷满经验就能过（第四部）
  // 大境界卡一道门：丹药 + 材料 + 灵石 + 剧情节点，四样齐备才破得开。
  // ==========================================================================
  function breakReqFor(nextLv) {
    for (const b of (window.BREAKTHROUGH || [])) if (b.lv === nextLv) return b;
    return null;
  }
  // 修为是否已达「下一道门的前一层」（当前境界巅峰）：筑基需炼气期十三层(35)、结丹需筑基后期(55)…
  function breakLevelOk(b) { return !b || (save.cultivate.level || 1) >= ((b.lv || 0) - 1); }
  function breakMissing(b) {
    if (!b) return [];
    const miss = [];
    // 修为门槛：须达当前境界巅峰（即下一道门的前一层），否则即便破境之物齐了也冲不动
    const needLv = (b.lv || 0) - 1;
    if ((save.cultivate.level || 1) < needLv) miss.push({ kind: 'level', name: b.from, need: needLv, have: save.cultivate.level || 1 });
    for (const it of (b.items || [])) {
      const have = save.inventory[it[0]] || 0;
      if (have < it[1]) miss.push({ kind: 'item', id: it[0], need: it[1], have: have });
    }
    // needs：一次性的硬门槛（虚天殿独有之类的至宝），不参与「押丹」算把握
    for (const it of (b.needs || [])) {
      const have = save.inventory[it[0]] || 0;
      if (have < it[1]) miss.push({ kind: 'need', id: it[0], need: it[1], have: have });
    }
    for (const mt of (b.mats || [])) {
      const have = save.inventory[mt[0]] || 0;
      if (have < mt[1]) miss.push({ kind: 'mat', id: mt[0], need: mt[1], have: have });
    }
    const st = b.stones || 0;
    if ((save.stones || 0) < st) miss.push({ kind: 'stone', need: st, have: save.stones || 0 });
    for (const s of (b.story || [])) {
      // 破境剧情图自身不算「前置」：这道门就落在它里面，没打通它当然没 cleared。
      // 只要这张图已经解锁（人进得去），就不该被算成「还差一样」把人拦在洞府门口
      // （地火之屋、云梦山结婴、芥子空间这几道门都是这种形状）。
      if ((save.unlocked || []).indexOf(s.id) >= 0) continue;
      if ((save.cleared || []).indexOf(s.id) < 0) miss.push({ kind: 'story', id: s.id, name: s.name });
    }
    // 功法：五行合一须兼修一门多属性功法（如百脉炼宝诀），未习得则差这一样
    if (b.skill) {
      const have = (cultObj().skills || {})[b.skill] ? 1 : 0;
      if (have < 1) miss.push({ kind: 'skill', id: b.skill, need: 1, have: have });
    }
    return miss;
  }
  // 把「还差什么」翻译成人话（入口横幅 / 调试口共用），避免一句「差1样」让人摸不着头脑
  function missLabels(b) {
    return breakMissing(b).map(m => {
      if (m.kind === 'level') return '修为未达' + (b.from || '') + '·巅峰(Lv' + m.need + ')';
      if (m.kind === 'stone') return '灵石×' + m.need;
      if (m.kind === 'skill') { const sk = window.skillById ? window.skillById(m.id) : null; return (sk ? sk.name : m.id); }
      if (m.kind === 'story') return '先通关·' + (m.name || m.id);
      const it = Items.get(m.id);
      return (it ? it.name : m.id) + '×' + m.need;
    });
  }
  // 对话分流用：当前这张破境图「正在通关」，剧情节点天然算通过；
  // 看「修为是否已达当前境界巅峰」且「丹 / 材 / 石」是否齐，用来判断玩家此刻是否已具备筑基条件（决定地火之屋结局台词）。
  function breakReadyNow(b) {
    if (!b) return true;
    if (!breakLevelOk(b)) return false;   // 修为未到门槛（如尚未炼气期十三层），即便物事齐了也不能算「备齐」
    for (const it of (b.items || [])) if ((save.inventory[it[0]] || 0) < it[1]) return false;
    for (const it of (b.needs || [])) if ((save.inventory[it[0]] || 0) < it[1]) return false;
    for (const mt of (b.mats || [])) if ((save.inventory[mt[0]] || 0) < mt[1]) return false;
    if ((save.stones || 0) < (b.stones || 0)) return false;
    if (b.skill && !((cultObj().skills || {})[b.skill])) return false;
    return true;
  }
  function canBreak(b) { return !b || breakMissing(b).length === 0; }
  // 冲关「结算前料还在不在」：只查会被 payBreak 焚毁的实物（丹/材/石），
  // 不查 story（破境图正被你此刻打通，自然还没进 save.cleared）。
  // 用于 breakSceneThen 片尾兜底；完整门槛（含 story）仍由 enterBreakMap 等前置把关。
  function breakMissingGoods(b) {
    if (!b) return [];
    const miss = [];
    for (const it of (b.items || [])) {
      const have = save.inventory[it[0]] || 0;
      if (have < it[1]) miss.push({ kind: 'item', id: it[0], need: it[1], have: have });
    }
    for (const mt of (b.mats || [])) {
      const have = save.inventory[mt[0]] || 0;
      if (have < mt[1]) miss.push({ kind: 'mat', id: mt[0], need: mt[1], have: have });
    }
    const st = b.stones || 0;
    if ((save.stones || 0) < st) miss.push({ kind: 'stone', need: st, have: save.stones || 0 });
    return miss;
  }
  // 破境丹药（筑基丹 / 天火液 …）：是「冲关的钥匙」，不是路上的补药。
  // 奖励到手只入储物袋，绝不立地服下 —— 否则还没冲关先把丹药的增益吃了。
  function isGatePill(id) {
    for (const b of (window.BREAKTHROUGH || [])) {
      for (const it of (b.items || [])) if (it[0] === id) return true;
    }
    return false;
  }
  // 冲关必须「带在身上」的一次性至宝（如虚天殿的补天丹）：不能被当成普通丹药吃掉
  function isGateNeed(id) {
    for (const b of (window.BREAKTHROUGH || [])) {
      for (const it of (b.needs || [])) if (it[0] === id) return true;
    }
    return false;
  }
  // 「押丹冲关」：破境不是凑够一样就必成 —— 原著里韩立四属性伪灵根，
  // 一粒筑基丹不足十分之一把握；他是炼了二十余颗、一颗颗嗑下去才筑基的。
  // 这里每枚破境丹 +8%（十三枚必成），只带一枚也只是赌一把。
  const BREAK_RATE_PER_PILL = 0.08;
  function breakGatePills(b) {
    if (!b || !b.items || !b.items.length) return 0;
    let n = Infinity;
    for (const it of b.items) {
      const need = Math.max(1, it[1] || 1);
      n = Math.min(n, Math.floor((save.inventory[it[0]] || 0) / need));
    }
    return n === Infinity ? 0 : n;
  }
  // ---- 煞丹术：正路走不通时的备用结丹法 ----
  // 原著里这是玄阴经的旁门：拿一身煞气硬压出一颗丹。丹能成，根基却不纯 ——
  // 所以这里给它三重代价：耗一大笔灵石、记一笔「煞丹」，此后每次破境都更险。
  function shaDanCost(b) { return Math.round(1200 + (b && b.lv ? b.lv : 50) * 30); }
  function shaDanReady(b) {
    if (!b) return false;
    if (!((save.cultivate && save.cultivate.skills && save.cultivate.skills.shadan) > 0)) return false;
    return (save.stones || 0) >= shaDanCost(b);
  }
  function applyShaDan(b) {
    if (!shaDanReady(b)) return false;
    save.stones -= shaDanCost(b);
    save.shaDan = (save.shaDan || 0) + 1;
    const newLv = Math.max(save.cultivate.level || 1, b.lv);
    save.cultivate.level = newLv;
    save.cultivate.xp = 0;
    syncBestLevel();
    if (G.player) {
      G.player.level = Math.max(G.player.level || 1, newLv);
      G.player.next = xpNeed(newLv);
      checkRealm(true); recalcMaxhp();
      G.player.hp = G.player.maxhp;
    }
    G.breakPending = null;
    writeSave();
    banner('煞丹术 · 以煞凝丹，丹成但根基不纯');
    Sfx.levelup();
    return true;
  }
  // 吃过几颗煞丹，破境就多险几分（最多扣三成）
  function shaDanPenalty() { return Math.min(0.3, (save.shaDan || 0) * 0.15); }

  // ==========================================================================
  // 天人有五衰（后传 X2C327《天人有五衰》，24 次）——仙界四道大境界关独有
  //
  // 原著口径：每逢大境界，天人都要历一次五衰；且「前面两衰的降临与修行时间有关」
  // （X2C328）——**躲不掉，只能扛**。
  //
  // 所以这条不是概率题，是一道取舍题。破境前先问「押多少」：
  //   押得越多 → 仙窍稳得住（把握越高），但 **能避开的衰越少**（力气都用在稳住上了）。
  // 失败不写「运气不好」，写「五衰提前降临」；扛过来的衰压在身上，通关一张图消一层。
  // ==========================================================================
  function wuState() {
    if (!save.wushuai || typeof save.wushuai !== 'object') save.wushuai = { n: 0, log: {} };
    if (typeof save.wushuai.n !== 'number') save.wushuai.n = 0;
    if (!save.wushuai.log || typeof save.wushuai.log !== 'object') save.wushuai.log = {};
    return save.wushuai;
  }
  function wuLayers() { return Math.max(0, wuState().n || 0); }
  function wuRec(lv) {
    const st = wuState();
    if (!st.log[lv]) st.log[lv] = { early: 0, taken: 0 };
    return st.log[lv];
  }
  function wuEarly(lv) { return (wuRec(lv).early || 0); }
  // 可避开的衰：五道里前两道与修行时间有关，天生躲不掉，只剩三道谈得上「避」。
  // 每提前降临过一次，可避的就再少一道——衰只会来得更早，不会更晚。
  function wuCanAvoid(b) {
    if (!b || !b.wushuai) return 0;
    const cap = (b.wushuai.canAvoid != null) ? b.wushuai.canAvoid : 3;
    return Math.max(0, cap - wuEarly(b.lv));
  }
  function wuMaxStake(b) { return wuCanAvoid(b); }          // 最多押到「一道也避不开」
  function wuRate(b, k) {
    const w = (b && b.wushuai) || {};
    const base = (w.base != null) ? w.base : 0.55;
    const step = (w.step != null) ? w.step : 0.15;
    return Math.max(0, Math.min(1, base + (k || 0) * step));
  }
  function wuTake(b, k) { return 5 - Math.max(0, wuCanAvoid(b) - (k || 0)); }   // 这一炉要扛几道
  function wuPayId(b) { return ((b && b.wushuai) && b.wushuai.pay) || 'm_xianyuanshi'; }
  function wuStakeCost(b, k) { return (k || 0) * (((b && b.wushuai) && b.wushuai.per) || 4); }
  function wuHave(b) { return save.inventory[wuPayId(b)] || 0; }
  function wuName(b) { return (Items.get(wuPayId(b)) || {}).name || wuPayId(b); }
  function payWuStake(b, k) {
    const id = wuPayId(b), n = Math.min(wuHave(b), wuStakeCost(b, k));
    if (n <= 0) return 0;
    save.inventory[id] -= n;
    save.totalItems = Math.max(0, (save.totalItems || 1) - n);
    if (save.inventory[id] <= 0) delete save.inventory[id];
    return n;
  }
  // 压在身上的衰：每道削一截气血、出手与遁速（不降等级——修为只增不减是硬线）
  function wuPenalty() {
    const n = wuLayers();
    if (n <= 0) return null;
    return { hp: Math.max(0.65, 1 - n * 0.05), dmg: Math.max(0.70, 1 - n * 0.05), spd: Math.max(0.82, 1 - n * 0.02) };
  }
  // 破境成败之后各有一段：败 → 衰提前降临；成 → 该扛的一道都少不了
  function settleWushuai(b, ok, k) {
    if (!b || !b.wushuai) return 0;
    const rec = wuRec(b.lv);
    if (!ok) { rec.early = (rec.early || 0) + 1; return 0; }
    const take = wuTake(b, k);
    rec.taken = (rec.taken || 0) + take;
    const id = wuPayId(b), per = (b.wushuai.cost != null) ? b.wushuai.cost : 3;
    const burn = Math.min(save.inventory[id] || 0, take * per);
    if (burn > 0) {
      save.inventory[id] -= burn;
      save.totalItems = Math.max(0, (save.totalItems || 1) - burn);
      if (save.inventory[id] <= 0) delete save.inventory[id];
    }
    const st = wuState();
    st.n = Math.min(5, (st.n || 0) + take);
    return take;
  }

  function breakSuccessRate(b) {
    // 天人有五衰的关：把握由「押了几档」决定，不走丹药那套（押注取舍见 wuRate）
    if (b && b.wushuai) return wuRate(b, G.wuStake || 0);
    const raw = breakSuccessRate0(b);
    if (raw <= 0) return 0;                        // 没丹就是没丹，不给保底
    let r = Math.max(0.05, raw * (1 - shaDanPenalty()));
    // 原著洞府加成：在小说点名的那座洞府突破（如筑基→内门洞府），成功率额外 +30%；
    // 在其它地方（别的洞府 / 地火之屋当场冲关等）按正常标准计算。
    if (b && G.breakCaveId && b.canonCave && G.breakCaveId === b.canonCave) {
      r = Math.min(1, r + 0.3);
    }
    return r;
  }
  function breakSuccessRate0(b) {
    if (!b || !b.items || !b.items.length) return 1;
    const c = b.chance || {};
    // 助丹型（结丹：雪灵水+天火液打底，降尘丹每枚加一点 —— 原著「有一定几率」）
    if (c.booster) {
      const base = (c.min != null) ? c.min : 0.4;
      const n = save.inventory[c.booster] || 0;
      return Math.min(1, base + n * (c.step || 0.1));
    }
    // 主丹型（筑基：原著就是靠嗑丹数往上堆）
    if (c.step != null) return Math.min(1, breakGatePills(b) * c.step);
    return Math.min(1, (c.min != null) ? c.min : 1);
  }
  function breakStepOf(b) { return (b && b.chance && b.chance.step) || BREAK_RATE_PER_PILL; }
  // 小境界（中期 / 后期 / 大圆满）的门槛：原著点名的就摆上，没点名的不臆造
  // 碧焰酒：原著「韩立借此突破了结丹中期瓶颈」—— 卡在中期、破的是进后期这一道，
  // 所以门摆在 72（结丹后期），不是 64（进中期）。
  window.MINOR_BREAKS = window.MINOR_BREAKS || [
    { lv: 72, realm: '结丹后期', item: 'biyanjiu', tip: '原著里韩立卡在结丹中期瓶颈，是借裂风兽一族酿的碧焰酒冲过去的。' },
    // 化神三道小门槛，皆按原著点名处设关；道具只取可重复获取者，避开「元磁神山核心」这种一次性剧情物，免得卡死进度。
    // 化神初期(lv112)是大破境，走「进阶」冲关；这里只管中期/后期/圆满三道小关。
    { lv: 122, realm: '化神中期', item: 'm_hanhuo', tip: '原著里韩立化神中期一关，靠自己修出的五色寒焰压住极寒煞气，才再往前推一截。' },
    { lv: 132, realm: '化神后期', item: 'moyuan', tip: '原著里韩立以万年玄玉换得魔元丹，化神后期这一关多得它一分底气。' },
    { lv: 149, realm: '化神圆满', item: 'm_hanhuo', tip: '化神圆满是化神一境的顶，仍须五色寒焰收束周身极寒，才压得住这道巅峰。' }
  ];
  // 修为受创后的重修：原著里韩立在小寰岛闭关、大量服食丹药——
  // 一年回到炼气期九层，再一年重回筑基，又六年修成大衍诀第二层与身外化身，51 岁筑基后期。
  window.REBUILD_STAGES = window.REBUILD_STAGES || [
    { lv: 19, label: '闭关一年', to: '炼气期九层', stones: 600, canon: '一年，丹药不断，气感一层层接回来。' },
    { lv: 36, label: '再闭关一年', to: '筑基初期', stones: 1600, canon: '又一年。灵液重新凝作真元，筑基那道坎第二次跨过去。' },
    { lv: 48, label: '闭关六年', to: '筑基后期', stones: 3600, canon: '六年。大衍诀第二层成了，身外化身也立住了。' }
  ];
  function rebuildStageNext() {
    if (!save.wounded) return null;
    const lv = save.cultivate.level || 1;
    for (const s of (window.REBUILD_STAGES || [])) if (s.lv > lv) return s;
    return null;
  }
  function rebuildTo(lv) {
    if (!save.wounded) { notify('修为未损 · 不必重修'); return false; }
    const st = (window.REBUILD_STAGES || []).find(x => x.lv === lv);
    if (!st) return false;
    if ((save.cultivate.level || 1) >= st.lv) { notify('这一层已经修回来了'); return false; }
    if ((save.stones || 0) < st.stones) { notify('灵石不足 · 需 ' + st.stones); Sfx.warn(); return false; }
    save.stones -= st.stones;
    save.cultivate.level = st.lv;
    save.cultivate.xp = 0;
    syncBestLevel();
    if (G.player) {
      G.player.level = st.lv; G.player.next = xpNeed(st.lv);
      checkRealm(true); recalcMaxhp(); G.player.hp = G.player.maxhp;
    }
    clearWoundedIfDone();
    writeSave();
    banner(st.canon);
    Sfx.levelup();
    if (G.state === 'cave') renderCave();
    return true;
  }
  function minorReqFor(nextLv) {
    for (const m of (window.MINOR_BREAKS || [])) if (m.lv === nextLv) return m;
    return null;
  }
  function minorHave(m) { return m ? (save.inventory[m.item] || 0) : 1; }
  function payMinor(m) {
    if (!m) return;
    save.inventory[m.item] = (save.inventory[m.item] || 0) - 1;
    if (save.inventory[m.item] <= 0) delete save.inventory[m.item];
    save.totalItems = Math.max(0, (save.totalItems || 1) - 1);
  }
  // 下一级是否撞上瓶颈：撞上就返回那条突破要求，没撞上返回 null
  function breakBlock(nextLv) {
    const b = breakReqFor(nextLv);
    if (!b) return null;
    return canBreak(b) ? null : b;
  }
  function breakNameOf(id) {
    const it = Items.get(id);
    return it ? it.name : id;
  }
  // 真正突破：吃掉该吃的东西，然后放行升级。
  // 「押丹」：身上这门破境丹有几枚，这一炉就押几枚 —— 多一枚多一分把握（见 breakSuccessRate）。
  function payBreak(b) {
    for (const it of (b.items || [])) {
      const have = save.inventory[it[0]] || 0;
      if (have > 0) {
        save.totalItems = Math.max(0, (save.totalItems || 1) - have);
        delete save.inventory[it[0]];
      }
    }
    // 助丹（降尘丹）：手上有几枚就押几枚，全数入炉
    if (b.chance && b.chance.booster) {
      const bid = b.chance.booster;
      const have = save.inventory[bid] || 0;
      if (have > 0) {
        save.totalItems = Math.max(0, (save.totalItems || 1) - have);
        delete save.inventory[bid];
      }
    }
    // needs（虚天殿独有之类的一次性至宝）只「出示」，不焚毁 —— 带上就行，破了还在
    for (const mt of (b.mats || [])) {
      save.inventory[mt[0]] = (save.inventory[mt[0]] || 0) - mt[1];
      if (save.inventory[mt[0]] <= 0) delete save.inventory[mt[0]];
      save.totalItems = Math.max(0, (save.totalItems || 1) - mt[1]);
    }
    save.stones = Math.max(0, (save.stones || 0) - (b.stones || 0));
    writeSave();
  }

  // ---------- 敌人功法（数据在 js/arts.js） ----------
  // Boss 招式表：先查 js/bosskit.js 的专属表，再查 arts.js 的补表，
  // 最后按前缀兜一层 —— 「墨大夫」那张表要对得上「墨大夫·墨居仁」，否则白写。
  function namedKitOf(name) {
    if (!name) return null;
    const a = window.BOSS_KITS || {}, b = window.BOSS_KIT_MORE || {};
    if (a[name]) return a[name];
    if (b[name]) return b[name];
    for (const k in b) { if (name.indexOf(k) === 0 || k.indexOf(name) === 0) return b[k]; }
    for (const k in a) { if (name.indexOf(k) === 0 || k.indexOf(name) === 0) return a[k]; }
    return null;
  }
  // 精英按名找专属表，找不到按「族」兜底（尸道 / 剑修 / 傀儡 / 鬼道…），
  // 再找不到才落到护卫族 —— 保证任何一只精英都有招式，不会有哑巴。
  function eliteKitOf(name) {
    const named = (window.ELITE_NAMED || {})[name];
    if (named && named.skills) return { kit: named, named: true };
    const fams = window.ELITE_KITS || {};
    const rules = window.ELITE_FAMILY_RULES || [];
    for (let i = 0; i < rules.length; i++) {
      if (rules[i][0].test(name) && fams[rules[i][1]]) return { kit: fams[rules[i][1]], named: false };
    }
    return { kit: fams.guard || null, named: false };
  }
  function applyEliteKit(e, name) {
    const r = eliteKitOf(name);
    if (!r.kit || !r.kit.skills || !r.kit.skills.length) return;
    e.kit = r.kit; e.kitNamed = r.named; e.cds = {};
    e.threatKind = 'elite';   // 招式伤害吃精英档，不是 Boss 档
    // 起手错开：不然一现身就把两三招同时亮出来
    r.kit.skills.forEach((sk, i) => { e.cds[i] = (sk.cd || 8) * (0.7 + i * 0.34); });
  }
  // 功法显形：不同形体的笔触不一样，一眼能分出「这是爪子 / 剑 / 毒 / 尸气」。
  // 不用图片资源，全部用现有粒子件（爪痕用弯月、剑光用射线、毒用散点…）。
  function artBurst(x, y, art, ang) {
    if (!art) return;
    const c = art.c || '#e8e0d0';
    const a = (ang == null ? Math.random() * 6.28 : ang);
    const P = G.parts;
    switch (art.f) {
      case 'claw':   // 三道平行弯爪
        for (let k = -1; k <= 1; k++) P.push({ slash: true, x, y, ang: a + k * 0.42, arc: 1.05, rad: 20, color: c, life: 0.22, maxlife: 0.22 });
        break;
      case 'blade':  // 一道剑光 + 收势弯月
        P.push({ ray: true, x, y, ang: a, len: 46, color: c, life: 0.15, maxlife: 0.15 });
        P.push({ slash: true, x, y, ang: a, arc: 0.9, rad: 25, color: c, life: 0.2, maxlife: 0.2 });
        break;
      case 'fang':   // 两颗毒牙 + 溅毒
        for (let k = -1; k <= 1; k += 2) P.push({ ray: true, x, y, ang: a + k * 0.3, len: 26, color: c, life: 0.14, maxlife: 0.14 });
        for (let k = 0; k < 4; k++) P.push({ x, y, vx: Math.cos(a + U.rand(-0.5, 0.5)) * U.rand(40, 110), vy: Math.sin(a + U.rand(-0.5, 0.5)) * U.rand(40, 110), life: 0.4, maxlife: 0.4, size: 2, color: c });
        break;
      case 'mist':   // 慢慢铺开的雾
        for (let k = 0; k < 7; k++) { const aa = Math.random() * 6.28; P.push({ x, y, vx: Math.cos(aa) * U.rand(8, 34), vy: Math.sin(aa) * U.rand(8, 34), life: 0.7, maxlife: 0.7, size: 4, color: c }); }
        break;
      case 'ghost':  // 一圈阴气环 + 往上飘
        P.push({ ring: true, x, y, r: 6, maxr: 30, life: 0.3, maxlife: 0.3, color: c });
        for (let k = 0; k < 5; k++) P.push({ x, y, vx: U.rand(-50, 50), vy: U.rand(-70, -20), life: 0.5, maxlife: 0.5, size: 2, color: c });
        break;
      case 'stone':  // 碎石四溅 + 地上一圈
        for (let k = 0; k < 5; k++) P.push({ x, y, vx: Math.cos(a + U.rand(-0.9, 0.9)) * U.rand(50, 120), vy: Math.sin(a + U.rand(-0.9, 0.9)) * U.rand(50, 120), life: 0.34, maxlife: 0.34, size: 3, color: c });
        P.push({ ring: true, x, y, r: 5, maxr: 26, life: 0.24, maxlife: 0.24, color: c });
        break;
      case 'puppet': // 机关：环 + 两道硬直射线
        P.push({ ring: true, x, y, r: 4, maxr: 24, life: 0.26, maxlife: 0.26, color: c });
        for (let k = -1; k <= 1; k += 2) P.push({ ray: true, x, y, ang: a + k * 0.5, len: 30, color: c, life: 0.18, maxlife: 0.18 });
        break;
      case 'blood':  // 血点喷溅
        for (let k = 0; k < 6; k++) P.push({ x, y, vx: Math.cos(a + U.rand(-0.7, 0.7)) * U.rand(60, 150), vy: Math.sin(a + U.rand(-0.7, 0.7)) * U.rand(60, 150), life: 0.3, maxlife: 0.3, size: 3, color: c });
        break;
      case 'frost':  // 寒环 + 冰屑
        P.push({ ring: true, x, y, r: 6, maxr: 28, life: 0.3, maxlife: 0.3, color: c });
        for (let k = 0; k < 4; k++) P.push({ x, y, vx: U.rand(-40, 40), vy: U.rand(-40, 40), life: 0.45, maxlife: 0.45, size: 2, color: c });
        break;
      case 'wind':   // 妖风：两道反向弧
        for (let k = 0; k < 2; k++) P.push({ slash: true, x, y, ang: a + k * 1.6, arc: 1.5, rad: 26, color: c, life: 0.26, maxlife: 0.26 });
        break;
      case 'bone':   // 三根骨刺
        for (let k = -1; k <= 1; k++) P.push({ ray: true, x, y, ang: a + k * 0.26, len: 34, color: c, life: 0.16, maxlife: 0.16 });
        break;
      default:
        P.push({ ray: true, x, y, ang: a, len: 40, color: c, life: 0.16, maxlife: 0.16 });
    }
  }

  function updateEnemies(dt) {
    const p = G.player;
    // P6：队友躺着就别再追他、别再撞他（倒地的人不再吃伤）
    const pt = (G.coopRole === 'host' && G.partner && G.partner.shown && !G.partner.down) ? G.partner : null;
    for (let i = G.enemies.length - 1; i >= 0; i--) {
      const e = G.enemies[i];
      if (e._dead) { G.enemies.splice(i, 1); continue; }
      e.t += dt; if (e.hitFlash > 0) e.hitFlash -= dt;
      // 失神刺：识海被扎，这一小会儿不动也不出手
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      let spd = e.spd;
      // 房主模式：怪追「本地玩家与队友中较近者」
      let tx = p.x, ty = p.y;
      if (pt) {
        const dP = U.dist2(p.x, p.y, e.x, e.y), dT = U.dist2(pt.x, pt.y, e.x, e.y);
        if (dT < dP) { tx = pt.x; ty = pt.y; }
      }
      const ang = Math.atan2(ty - e.y, tx - e.x);
      let px = Math.cos(ang), py = Math.sin(ang);
      if (e.charge && U.dist(p.x, p.y, e.x, e.y) < 260) spd *= 1.7;
      if (e.dash) { e.dashT -= dt; if (e.dashT <= 0) { e.dashing = 0.25; e.dashT = U.rand(2, 4); } if (e.dashing > 0) { spd *= 2.4; e.dashing -= dt; } }
      if (e.wob) { const perp = ang + Math.PI / 2; const w = Math.sin(e.t * 6) * 0.5; px += Math.cos(perp) * w; py += Math.sin(perp) * w; }
      let sm = 1;
      // 近身领域（冰冻术 / 元磁神光）：踏进场中就被拖住
      for (const f of (G.fieldSlow || [])) {
        if (U.dist(p.x, p.y, e.x, e.y) < f.rad + (e.r || 0)) sm *= (1 - f.slow);
      }
      if (sm < 0.2) sm = 0.2;
      e.x += px * spd * sm * dt; e.y += py * spd * sm * dt;

      // 有招式表的精英：走 Boss 同一套引擎（前摇 + 预警圈 + 头顶报招名）
      if (e.kit) updateBossKit(e, e.kit, dt);
      if (e.type === 'wolfking' && !e.kit) {
        e.howlT -= dt;
        if (e.howlT <= 0) { e.howlT = 7; for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28; spawnEliteWolf(e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30); } }
      }
      if (e.ranged && !e.kit) {
        const d = U.dist(p.x, p.y, e.x, e.y);
        if (d < 140) { e.x -= px * spd * sm * dt; e.y -= py * spd * sm * dt; }
        else if (d > 200) { e.x += px * spd * 0.6 * sm * dt; e.y += py * spd * 0.6 * sm * dt; }
        e.shootT -= dt;
        if (e.shootT <= 0) {
          e.shootT = 2.1;
          const base = Math.atan2(p.y - e.y, p.x - e.x);
          for (let k = -1; k <= 1; k++) { const a = base + k * 0.25; G.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, r: 6, dmg: e.dmg, life: 4 }); }
        }
      }
      // ---- 功法 ----
      // 贴身命中时按形体显形（爪痕 / 剑光 / 毒雾 / 阴气…）；本来就该远程的另带一招。
      // 招式不改原来那套接触伤害，只换一副"出手的样子"，所以整体难度不被重新洗一遍。
      if (e._artCd > 0) e._artCd -= dt;
      const art = e.art;
      if (art && art.t === 'cast') {
        if (e.castT == null) e.castT = U.rand(1.6, 4.2);
        e.castT -= dt;
        if (e.castT <= 0) {
          e.castT = (art.cd || 6) * U.rand(0.85, 1.25);
          const base = Math.atan2(p.y - e.y, p.x - e.x);
          G.ebullets.push({
            x: e.x, y: e.y, vx: Math.cos(base) * 210, vy: Math.sin(base) * 210, r: 6,
            dmg: Math.max(1, Math.round(e.dmg * (art.k || 0.34))), life: 4, color: art.c
          });
          artBurst(e.x, e.y, art, base); Sfx.shoot();
        }
      }
      if (U.dist(p.x, p.y, e.x, e.y) < e.r + p.r) {
        hitPlayer(e.dmg);
        if (art && e._artCd <= 0) {
          artBurst(e.x, e.y, art, Math.atan2(p.y - e.y, p.x - e.x));
          e._artCd = 0.55;
          // 一类怪第一次打到你时，报一次它的功法名 —— 全程只报一次，不刷屏
          if (G.artSeen && !G.artSeen[e.type]) {
            G.artSeen[e.type] = 1;
            const nm = (window.ENEMY_TYPES[e.type] || {}).name || '';
            spawnText(e.x, e.y - e.r - 14, (nm ? nm + ' · ' : '') + art.n, art.c || '#ffe9a8', 11);
          }
        }
      }
      if (pt && U.dist(pt.x, pt.y, e.x, e.y) < e.r + (pt.r || 9)) { if (window.Coop) window.Coop.addPartnerHurt(e.dmg); }
      e._flip = tx < e.x;
    }
  }

  // ---------- Boss（按地图配置，四种打法） ----------
  function spawnBossFrom(cfg, isExtra) {
    const p = G.player;
    const dm = curDiff();
    // Boss 单独吃一档倍率：凡境不变，险境 ×1.5，死境 ×2（Jerry 定：中高难度 Boss 要更硬）
    // 基准血量与单击伤害来自 js/balance.js 的 BOSS 表（按该图推荐等级的玩家战力推导）；
    // 表里没有的图（新图还没标定）退回地图上写的绝对值。
    const bal = (window.BALANCE && window.BALANCE.BOSS[G.mapId]) || null;
    const hpk = bal ? (isExtra ? window.BALANCE.extraHp : 1) : 1;
    const dpk = bal ? (isExtra ? window.BALANCE.extraDmg : 1) : 1;
    const baseHp = bal ? bal[0] * hpk : cfg.hp;
    const baseDmg = bal ? bal[1] * dpk : cfg.dmg;
    const bhp = Math.round(baseHp * (dm.hp || 1) * (dm.bossHp || 1) * levelPad());
    const bdmg = baseDmg * (dm.dmg || 1) * (dm.bossDmg || 1);
    G.boss = {
      _id: ++enemySeq,
      type: cfg.kind, kind: cfg.kind, name: cfg.name,
      x: p.x, y: p.y - H / 2 + 262,
      hp: bhp, maxhp: bhp, spd: cfg.spd * (dm.spd || 1), dmg: bdmg, r: cfg.r,
      spr: cfg.spr, scale: cfg.scale || 1.8,
      hitFlash: 0, t: 0, ang: 0, shootT: 1.4, teleT: 5.5, sumT: 8, burstT: 2.4,
      dashT: 2.2, dashAng: 0, dashing: 0, _orbCd: {},
      // 妖兽系 boss 召哪种小怪：图里没写就还是狼；写空串表示这一只不召群
      summon: cfg.summon === undefined ? 'wolf' : cfg.summon,
      noSummon: !!cfg.noSummon,   // 显式关掉召群（仅教学关用；不影响其它 Boss 的既有召群）
      phase2: false, phaseT: 0
    };
    // 招式表：先按 Boss 名找原著专属招式（js/bosskit.js），找不到就按同族通用招式。
    // 都没有（理论上不会）则退回下面 updateBoss 里的旧四系打法，保证任何配置不空转。
    const kindKits = window.BOSS_KIT_KIND || null;
    const namedKit = namedKitOf(cfg.name);
    const kit = namedKit || (kindKits && kindKits[cfg.kind]) || null;
    if (kit && kit.skills && kit.skills.length) {
      G.boss.kit = kit;
      G.boss.kitNamed = !!namedKit;   // 专属招式表 vs 同族通用表（召群时口径不同）
      G.boss.cds = {};
      G.boss.pending = null;
      // 起手错开：不然一现身七八招同时亮，第一秒就把玩家埋了
      kit.skills.forEach((sk, i) => { G.boss.cds[i] = (sk.cd || 6) * (0.5 + i * 0.16); });
    }
    G.bossActive = true; G.bossSpawned = true;
    G.enemies = G.enemies.filter(e => !e.elite);
    G.flash = Math.max(G.flash, 0.5); G.shake = 12;
    banner('⚔ ' + cfg.name + ' 现身' + (dm.id !== 'easy' ? '　·　' + dm.name : '')); Sfx.boss();
  }
  function spawnBoss() {
    const cfg = (G.map && G.map.boss) || { kind: 'mo', name: '墨大夫', hp: 1800, spd: 40, dmg: 18, r: 20, spr: 'mo2', scale: 1.8 };
    spawnBossFrom(cfg);
  }

  // 二阶段演出：定身 + 冲击波 + 屏幕血光
  function startPhase2() {
    const b = G.boss;
    b.phase2 = true; b.phaseT = 1.5;
    b.shootT = 1.2; b.teleT = 4.5; b.sumT = 6; b.burstT = 1.6;
    G.flash = 1; G.shake = 14; G.hitStop = 0.08;
    Sfx.bossPhase();
    banner('⚠ 二阶段 · ' + (b.kind === 'mo' ? '夺舍狂暴' : b.kind === 'beast' ? '妖血沸腾' : b.kind === 'swarm' ? '虫群暴走' : '血煞缠身'));
    for (const e of G.enemies.slice()) {
      if (U.dist(b.x, b.y, e.x, e.y) < 220) { damageEnemy(e, e.maxhp * 0.5); knock(e, b.x, b.y, 220); }
    }
  }
  function knock(e, fx, fy, force) {
    const a = Math.atan2(e.y - fy, e.x - fx);
    e.x += Math.cos(a) * (force * 0.2); e.y += Math.sin(a) * (force * 0.2);
  }
  // 弹幕伤害 = Boss 单击伤害 × 系数。
  // 别再写死 12/14：这两个数从第一版留到现在，lv520 的 Boss 单击已经 4.6 万，
  // 弹幕还在打 14 点 —— 后期法师系 Boss 等于不会伤人，危机感直接归零。
  // 散射单发低一些（一轮打出去十几发），环形再低一档（贴身会被套好几圈）。
  // Boss 一切伤害的共同出口：招式弹幕、旧四系弹幕、贴身碰撞都从这里取倍率。
  // THREAT.boss 在 js/balance.js（第 80 轮统一抬高，一处调全场生效）。
  // Boss 这一档按地图等级渐进：前 6 级的 Boss 完全不吃倍率（教学关万一因为全局抬伤变难，
  // 劝退成本最高），之后线性爬到满额 —— lv46 起才是完整的 1.35。
  function threatK(kind) {
    const T = window.BALANCE && window.BALANCE.THREAT;
    if (!T) return 1;
    if (kind === 'boss') {
      const t = Math.min(1, Math.max(0, (mapLv() - 6) / 40));
      return 1 + (T.boss - 1) * t;
    }
    return T[kind] || 1;
  }
  function bShot(b, k) { return Math.max(1, Math.round((b && b.dmg || 0) * k * threatK('boss'))); }
  // k = 弹体形体（见 drawEBullet）。招式不同、形体必须不同：
  // 之前所有招式共用一张 5×5 紫红圆点，185 条 Boss 招式里 109 条在画面上长得一模一样。
  function ringBurst(x, y, n, spd, dmg, kind) {
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.28;
      G.ebullets.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7, dmg: dmg || 12, life: 4, k: kind || 'orb', a: a });
    }
  }
  function aimFan(x, y, base, n, spread, spd, dmg, kind) {
    for (let k = 0; k < n; k++) {
      const a = base + (k - (n - 1) / 2) * spread;
      G.ebullets.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7, dmg, life: 5, k: kind || 'shard', a: a });
    }
  }
  function summonAt(b, type, cnt, cap) {
    const live = G.enemies.filter(e => e.type === type).length;
    if (live >= cap) return false;
    for (let k = 0; k < cnt; k++) {
      const a = Math.random() * 6.28;
      G.enemies.push(makeEnemy(type, b.x + Math.cos(a) * 46, b.y + Math.sin(a) * 46, hpMulBase(), dmgMulBase()));
    }
    return true;
  }

  // ---------- 招式表驱动（js/bosskit.js） ----------
  // 预警圈：画在地上的一圈，随前摇收缩/淡出。Boss 出手前必须先看得见 —— 这是"能躲"的前提。
  function tellAt(x, y, r, dur, color) {
    G.tells.push({ x, y, r: r || 120, t: dur || 0.5, dur: dur || 0.5, color: color || '#ff7a52' });
  }
  // 地面持续区：招式「落在地上」的那一片。三型各有专属画法（见 drawZone），
  // 只做视觉 + 减速，不追加伤害 —— 加视觉不该顺手改难度。
  function addZone(x, y, r, dur, kind, opt) {
    const z = Object.assign({ x, y, r, t: dur, dur: dur, kind: kind, age: 0 }, opt || {});
    G.zones.push(z);
    if (G.zones.length > 12) G.zones.shift();   // 同屏最多 12 片，多了就是糊
    return z;
  }
  function bossDmgOf(b, sk) { return Math.max(1, Math.round((b.dmg || 1) * (sk.k || 0.5) * threatK(b.threatKind || 'boss'))); }

  // ---------- 持续型招式（光柱 / 横扫光刃 / 地刺）----------
  // 与 G.zones 的分工：zones 只做「看得见的范围 + 减速」，一伤害也不结算；
  // hazards 是**真判定**——站里面每隔 tick 秒扣一次。这是本轮唯一会动难度的东西，
  // 所以三条纪律必须守住：
  //   ① 起手先有预警圈（updateBossKit 提前 tele 秒画好），有兆头才谈得上「躲」；
  //   ② tick ≥ 0.4s，且玩家自带 0.55s 无敌帧，所以「站在里面」最多 1.8 下/秒，不会瞬秒；
  //   ③ 单跳 k 只给 0.28~0.34，整段吃完约等于一次普攻的 1 倍上下。
  function addHazard(o) {
    const h = Object.assign({ t: 1, dur: 1, age: 0, tick: 0.4, tickT: 0, hit: false }, o);
    G.hazards.push(h);
    if (G.hazards.length > 8) G.hazards.shift();   // 同屏上限：再多就是糊，也打不动人
    return h;
  }
  // 点到线段距离：横扫光刃的判定不是圆，是「这条光带本身」，用圆去比会漏判贴边的玩家
  function distToSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const L = dx * dx + dy * dy;
    let t = L > 0 ? ((px - x1) * dx + (py - y1) * dy) / L : 0;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    const qx = x1 + dx * t, qy = y1 + dy * t;
    return Math.hypot(px - qx, py - qy);
  }
  function updateHazards(dt) {
    const p = G.player;
    // 联机：队友站进光柱也得掉血，否则两人里总有一个可以站着不动白嫖
    const pt = (G.coopRole === 'host' && G.partner && G.partner.shown && !G.partner.down) ? G.partner : null;
    for (let i = G.hazards.length - 1; i >= 0; i--) {
      const h = G.hazards[i];
      h.age += dt; h.t -= dt;
      if (h.kind === 'sweep') h.ang += (h.rate || 0) * dt;
      if (h.t <= 0) { G.hazards.splice(i, 1); continue; }
      if (!p || G.state !== 'play') continue;

      if (h.kind === 'spike') {
        // 地刺是一串点位，各自错开 delay 依次破土 —— 形成一道「追着你冒」的土浪。
        // 每个点位只结算一次（hit 标记），不像光柱那样反复扣。
        for (let j = 0; j < h.pts.length; j++) {
          const q = h.pts[j];
          if (q.hit) continue;
          q.age += dt;
          if (q.age < q.d) continue;
          const near = U.dist(p.x, p.y, q.x, q.y) < q.r + p.r * 0.4;
          const nearPt = pt && U.dist(pt.x, pt.y, q.x, q.y) < q.r + (pt.r || 9) * 0.4;
          if (near) { q.hit = true; hitPlayer(h.dmg); }
          if (nearPt && window.Coop) window.Coop.addPartnerHurt(h.dmg);
          if (q.hit || (q.age > q.d + 0.28 && !nearPt)) q.hit = true;   // 破土瞬间没踩上就作废
        }
        continue;
      }

      let inside;
      if (h.kind === 'sweep') {
        inside = distToSeg(p.x, p.y, h.x, h.y, h.x + Math.cos(h.ang) * h.len, h.y + Math.sin(h.ang) * h.len) < h.r + p.r * 0.4;
      } else {
        inside = U.dist(p.x, p.y, h.x, h.y) < h.r + p.r * 0.4;
      }
      const insidePt = pt && (h.kind === 'sweep'
        ? distToSeg(pt.x, pt.y, h.x, h.y, h.x + Math.cos(h.ang) * h.len, h.y + Math.sin(h.ang) * h.len) < h.r + (pt.r || 9) * 0.4
        : U.dist(pt.x, pt.y, h.x, h.y) < h.r + (pt.r || 9) * 0.4);
      if (!inside) { h.tickT = 0; continue; }   // 走出去就重置：再进来立刻挨一下，符合直觉
      h.tickT -= dt;
      if (h.tickT <= 0) {
        h.tickT = h.tick; hitPlayer(h.dmg);
        if (insidePt && window.Coop) window.Coop.addPartnerHurt(h.dmg);
      }
    }
  }

  // ---------- 敌方弹体与地面区的「形」 ----------
  // 评审结论：185 条 Boss 招式里 109 条共用同一张 5×5 紫红圆点，只改缩放。
  // 于是扇形齐射、环射、贯刺、天降、毒雾在画面上是一个东西 —— 玩家读不出"这一招是什么"。
  // 纪律：**形由招式语义决定（这是剑还是毒），色才由来源决定（谁放的）**。
  // 所有笔触沿用现有粒子语言：多层 alpha 叠加、lineCap round、1px 起线，不引新图。
  const BULLET_COLOR = {
    orb: '#ff6a4a',    // 环射 · 饱满珠
    shard: '#ffd08a',  // 扇形齐射 · 碎刃
    blade: '#cfe8ff',  // 贯刺 · 剑光
    drop: '#ffb060',   // 天降 · 坠物
    mist: '#d9f58a',   // 毒雾 · 必须比草地亮一档，绿色雾压在绿草上是隐形的
    heavy: '#ff8a3a'   // 爆发 · 重珠
  };
  function drawEBullet(bb) {
    const k = bb.k || 'orb';
    const r = bb.r || 7;
    const col = BULLET_COLOR[k] || BULLET_COLOR.orb;

    if (k === 'blade') {
      // 贯刺：沿速度方向拉成细长光带，前端尖、尾部收细，三节首尾相衔就是一道剑气
      const len = r * 7.5, wid = r * 0.6;
      const ang = Math.atan2(bb.vy, bb.vx);
      ctx.save(); ctx.translate(bb.x, bb.y); ctx.rotate(ang);
      ctx.globalAlpha = 0.30; ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, 0, len * 0.58, wid * 1.9, 0, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.moveTo(len * 0.52, 0); ctx.lineTo(-len * 0.34, wid);
      ctx.lineTo(-len * 0.52, 0); ctx.lineTo(-len * 0.34, -wid);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(len * 0.32, 0, len * 0.10, wid * 0.40, 0, 0, 6.28); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }

    if (k === 'shard') {
      // 碎刃：菱形锐片 + 身后一道短尾 —— 和珠子的区别是「有方向」
      const len = r * 2.5, wid = r * 0.95;
      const ang = Math.atan2(bb.vy, bb.vx);
      ctx.save(); ctx.translate(bb.x, bb.y); ctx.rotate(ang);
      ctx.globalAlpha = 0.26; ctx.strokeStyle = col; ctx.lineWidth = wid * 1.0; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-len * 0.4, 0); ctx.lineTo(-len * 2.0, 0); ctx.stroke();
      ctx.globalAlpha = 0.95; ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(len * 0.78, 0); ctx.lineTo(0, wid);
      ctx.lineTo(-len * 0.42, 0); ctx.lineTo(0, -wid);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(len * 0.18, 0, len * 0.20, wid * 0.32, 0, 0, 6.28); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }

    if (k === 'drop') {
      // 天降：尖端朝下、拖尾在上 —— 尖朝上就成了「往上飞的箭」，方向感全反
      const len = r * 2.2;
      ctx.save(); ctx.translate(bb.x, bb.y);
      ctx.globalAlpha = 0.24; ctx.strokeStyle = col; ctx.lineWidth = r * 0.7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -len * 0.4); ctx.lineTo(0, -len * 2.8); ctx.stroke();
      ctx.globalAlpha = 0.95; ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, len);                                        // 尖端在下
      ctx.quadraticCurveTo(r * 0.92, -len * 0.10, 0, -len * 0.55); // 右侧收上顶
      ctx.quadraticCurveTo(-r * 0.92, -len * 0.10, 0, len);        // 左侧回尖
      ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(0, -len * 0.10, r * 0.22, r * 0.34, 0, 0, 6.28); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }

    if (k === 'mist') {
      // 毒雾：判定半径 16~18 是「碰到就中毒」的范围，不能直接拿来画 ——
      // 10 团实心叠上去就是一堵绿墙，Boss 和玩家全被埋。视觉压到 0.72，
      // 且整体做稀，让下面的东西透得出来：雾要「薄」，才读得出范围。
      const s = bb.seed || 0;
      // 视觉半径刻意大于判定半径（0.78→1.12）：10 团分布在半径 30 的环上、间距只有 19px，
      // 半径 19 的团才叠得成「一片云」；小一档就是一串珠子，雾就没了。
      const vr = r * 1.12;
      // 四层、由外到内递浓：外圈 0.05 几乎透明，边界才软得下来。
      // 三层等浓时会看得出一个个圆瓣（"花椰菜"），那是 alpha 断层的痕迹。
      for (let i = 0; i < 4; i++) {
        const a = s + i * 1.65;
        const ox = Math.cos(a) * vr * 0.34, oy = Math.sin(a) * vr * 0.34;
        ctx.globalAlpha = 0.050 + i * 0.024;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(bb.x + ox, bb.y + oy, vr * (1.00 - i * 0.16), 0, 6.28); ctx.fill();
      }
      // 极淡的边缘线：交代「雾到哪儿为止」，不指望它形成硬边
      ctx.globalAlpha = 0.13; ctx.strokeStyle = col; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(bb.x, bb.y, vr * 0.99, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    if (k === 'heavy') {
      // 重珠：珠体外多一圈呼吸环，撞上来之前就有「这一下很沉」的预感
      const pul = 1 + Math.sin((G.time || 0) * 13) * 0.07;
      ctx.globalAlpha = 0.16; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bb.x, bb.y, r * 1.85 * pul, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.72; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bb.x, bb.y, r * 1.28 * pul, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bb.x, bb.y, r * 0.88, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(bb.x, bb.y, r * 0.36, 0, 6.28); ctx.fill();
      return;
    }

    // orb：三层同心 —— 外光晕 / 珠体 / 白芯
    ctx.globalAlpha = 0.16; ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(bb.x, bb.y, r * 1.70, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 0.92;
    ctx.beginPath(); ctx.arc(bb.x, bb.y, r * 0.85, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(bb.x, bb.y, r * 0.34, 0, 6.28); ctx.fill();
  }

  // 地面持续区：贴在纸面上的一层，按 0.42 压扁才是「画在地上」（与 rune 同一口径）
  function drawZone(z) {
    const fade = Math.min(1, (z.age || 0) / 0.14) * Math.min(1, z.t / 0.45);
    if (fade <= 0.01) return;
    const R = z.r * (z.kind === 'bind' ? 0.35 + 0.65 * Math.min(1, (z.age || 0) / 0.4) : 1);
    ctx.save();
    ctx.translate(z.x, z.y); ctx.scale(1, 0.42);

    if (z.kind === 'ice') {
      // 冰面：压扁的冷色面 + 六角冰晶
      ctx.globalAlpha = fade * 0.16; ctx.fillStyle = '#8fd8ff';
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.28); ctx.fill();
      ctx.globalAlpha = fade * 0.85; ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = fade * 0.55; ctx.lineWidth = 1.4;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.0472;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.24, Math.sin(a) * R * 0.24);
        ctx.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92);
        ctx.stroke();
        // 每根主枝上挑两根支晶，像结出来的冰刺
        const mx = Math.cos(a) * R * 0.58, my = Math.sin(a) * R * 0.58;
        for (const s of [-0.7, 0.7]) {
          ctx.beginPath(); ctx.moveTo(mx, my);
          ctx.lineTo(mx + Math.cos(a + s) * R * 0.20, my + Math.sin(a + s) * R * 0.20);
          ctx.stroke();
        }
      }
    } else if (z.kind === 'vortex') {
      // 漩涡：三道螺旋，随时间转 —— 有旋转才像「在吸」
      const rot = (z.age || 0) * 4.2;
      ctx.globalAlpha = fade * 0.14; ctx.fillStyle = '#c98aff';
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.28); ctx.fill();
      ctx.globalAlpha = fade * 0.8; ctx.strokeStyle = '#c98aff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (let s2 = 0; s2 < 3; s2++) {
        ctx.beginPath();
        const a0 = rot + s2 * 2.094;
        for (let i = 0; i <= 16; i++) {
          const a = a0 + i * 0.22;
          const rr = R * (0.18 + i / 16 * 0.78);
          const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = fade * 0.9; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.16, 0, 6.28); ctx.stroke();
    } else {
      // 困阵：阵纹环 + 四向锁链，链条由外朝内收紧
      ctx.globalAlpha = fade * 0.15; ctx.fillStyle = '#ff7ab0';
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.28); ctx.fill();
      ctx.globalAlpha = fade * 0.9; ctx.strokeStyle = '#ff7ab0'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = fade * 0.6; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.74, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = fade * 0.85; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = i * 1.5708 + 0.785;
        const tip = R * (0.62 + 0.30 * Math.min(1, (z.age || 0) / 0.35));
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 1.02, Math.sin(a) * R * 1.02);
        ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
        ctx.stroke();
        // 链条末端的钩
        ctx.beginPath(); ctx.arc(Math.cos(a) * tip, Math.sin(a) * tip, R * 0.07, 0, 6.28); ctx.stroke();
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // ---------- 持续型招式的绘制 ----------
  // 分两层画：
  //   drawHazardGround  贴地那层（光环 / 焦痕 / 破土圈）—— 和 zones 一起先铺，压在角色脚下
  //   drawHazardBody    立起来那层（柱身 / 光刃 / 刺尖）—— 在角色之后画，才有"我从光里穿过去"的层次
  // 一个必须守住的原则：**柱身半透明**。不透明的话玩家被自己的躲避特效糊住，看不见脚下站位。
  // 颜色加 alpha：渐变色里要逐 stop 控制透明度（光柱顶部必须真的淡到 0），
  // 只靠 globalAlpha 压整块是不行的。返回 rgba 字符串，仍然会走 inkify 的砍色规则。
  function withAlpha(c, a) {
    if (typeof c !== 'string') return c;
    let m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const n = parseInt(m[1], 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    m = c.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
      const q = m[1].split(',').map(v => parseFloat(v));
      return 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',' + a + ')';
    }
    return c;
  }
  function drawHazardGround(h) {
    const fade = Math.min(1, h.age / 0.12) * Math.min(1, h.t / 0.35);
    if (fade <= 0.01) return;
    const col = h.color || '#ffe6a0';
    ctx.save();
    if (h.kind === 'pillar') {
      ctx.translate(h.x, h.y); ctx.scale(1, 0.42);
      const R = h.r, rot = (G.time || 0) * 0.9;
      ctx.globalAlpha = fade * 0.20; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, 6.28); ctx.fill();
      ctx.globalAlpha = fade * 0.85; ctx.strokeStyle = col; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = fade * 0.50; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, 6.28); ctx.stroke();
      // 八根短刻痕绕着转：一眼看出「这是布在地上的一座阵」，不是随手一圈
      ctx.globalAlpha = fade * 0.75; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = rot + i * 0.7854;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72);
        ctx.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95);
        ctx.stroke();
      }
    } else if (h.kind === 'sweep') {
      // 地面焦痕：跟着光刃走的一道压扁的亮带，让人看出"光是从地面削过去的"
      ctx.translate(h.x, h.y); ctx.scale(1, 0.42);
      const x2 = Math.cos(h.ang) * h.len, y2 = Math.sin(h.ang) * h.len;
      ctx.globalAlpha = fade * 0.16; ctx.strokeStyle = col; ctx.lineWidth = h.r * 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.globalAlpha = fade * 0.52; ctx.lineWidth = h.r * 0.7;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function drawHazardBody(h) {
    const fade = Math.min(1, h.age / 0.10) * Math.min(1, h.t / 0.30);
    if (fade <= 0.01) return;
    const col = h.color || '#ffe6a0';
    const now = G.time || 0;

    if (h.kind === 'pillar') {
      // 柱身：上宽下窄的锥形光带（光从高处压下来，越往上越散）。
      // 关键做法：**用带 alpha 的渐变色一次铺满**，而不是"整块实色 + globalAlpha"。
      // 后者无论怎么调，顶部都是一条硬横边 —— 那是梯形路径的边缘，不是光该有的收束。
      const H = h.h || 200, R = h.r;
      const wB = R * 0.95, wT = R * 1.52;
      const flick = 0.88 + 0.12 * Math.sin(now * 19 + h.x * 0.1);
      // 注意：砍色规则拦的是 ctx.fillStyle 这个 setter，而 createLinearGradient 里的颜色
      // 在 addColorStop 那一刻就定死了，绕过了拦截。所以渐变的每个 stop 必须显式过一遍
      // inkify —— 否则水墨皮里光柱还是橙的（第一版就踩了这个坑）。
      const A = (a) => inkify(withAlpha(col, a * fade * flick));
      const trap = (wb, wt) => {
        ctx.beginPath();
        ctx.moveTo(h.x - wt, h.y - H); ctx.lineTo(h.x + wt, h.y - H);
        ctx.lineTo(h.x + wb, h.y); ctx.lineTo(h.x - wb, h.y);
        ctx.closePath();
      };
      ctx.save();
      // 外晕：一路淡到 0
      // 【提亮一档】柱身是玩家读「这根柱有多高」的主要依据，但深色地图上外晕
      // 只有 0.35→0.13，混色后和底色明度差太小，柱身整段读不出来。三档各抬约 32%。
      // 内核只抬 6~17%：内核与外晕是叠乘的（0.46 与 0.55 叠后 ≈ 0.76），
      // 两个都提一档会直接糊成实心亮块，把脚下的站位盖掉。
      const g = ctx.createLinearGradient(0, h.y, 0, h.y - H);
      g.addColorStop(0, A(0.46)); g.addColorStop(0.28, A(0.37));
      g.addColorStop(0.62, A(0.18)); g.addColorStop(1, A(0));
      ctx.fillStyle = g; trap(wB, wT); ctx.fill();
      // 内核：窄一半、亮一档，柱子才有"能量的中心"
      const g2 = ctx.createLinearGradient(0, h.y, 0, h.y - H);
      g2.addColorStop(0, A(0.55)); g2.addColorStop(0.34, A(0.40));
      g2.addColorStop(0.70, A(0.14)); g2.addColorStop(1, A(0));
      ctx.fillStyle = g2; trap(wB * 0.42, wT * 0.40); ctx.fill();
      // 两侧界线：同样走渐变描边，顶部跟着淡 —— 否则就是两根竖到底的"轨道"
      // 界线是「柱子的边」，抬得最痕（×1.31~1.5）：高度差异最先从这两条斜边读出来。
      const gs = ctx.createLinearGradient(0, h.y, 0, h.y - H);
      gs.addColorStop(0, A(0.72)); gs.addColorStop(0.45, A(0.45));
      gs.addColorStop(0.85, A(0.09)); gs.addColorStop(1, A(0));
      ctx.strokeStyle = gs; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(h.x - wT * 0.995, h.y - H); ctx.lineTo(h.x - wB * 0.995, h.y);
      ctx.moveTo(h.x + wT * 0.995, h.y - H); ctx.lineTo(h.x + wB * 0.995, h.y);
      ctx.stroke();
      // 落点亮斑：光压到地上，脚下那一块必须最亮
      // 这一块几乎不提（×1.06）：它已经是最亮的一层，再抬会把玩家小人烫掉。
      const gb = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, wB * 1.5);
      gb.addColorStop(0, A(0.58)); gb.addColorStop(0.55, A(0.20)); gb.addColorStop(1, A(0));
      ctx.fillStyle = gb;
      ctx.save(); ctx.translate(h.x, h.y); ctx.scale(1, 0.42);
      ctx.beginPath(); ctx.arc(0, 0, wB * 1.5, 0, 6.28); ctx.fill();
      ctx.restore();
      // 上升的碎光：静止的柱子会像贴图
      for (let i = 0; i < 7; i++) {
        const t = ((now * (0.55 + i * 0.07) + i * 0.19) % 1);
        const yy = h.y - t * H * 0.95;
        const spread = (wB * 0.55) * (1 - t * 0.35) + wT * 0.22 * t;
        const xx = h.x + Math.sin(i * 2.4 + now * 1.6) * spread;
        ctx.globalAlpha = 0.70 * fade * Math.sin(t * 3.14);
        ctx.fillStyle = col;
        ctx.fillRect(xx - 1.2, yy - 1.2, 2.4, 2.4);
      }
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }

    if (h.kind === 'sweep') {
      // 光刃：从 Boss 身上扫出去的一道扁刃。
      // 动感不能靠"再画一条错开的刀"——两条细杆并排落在画面上就是两根杆，不是残影。
      // 正确做法是同一把刃按极小角度差连画六层、一层比一层淡，叠成一条被拉长的拖影。
      const x2 = h.x + Math.cos(h.ang) * h.len, y2 = h.y + Math.sin(h.ang) * h.len;
      const drawBand = (ang, alpha, wmul) => {
        const ex = h.x + Math.cos(ang) * h.len, ey = h.y + Math.sin(ang) * h.len;
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        const gc = inkify(col);            // 同上：渐变 stop 不过 setter，必须显式砍色
        const g = ctx.createLinearGradient(h.x, h.y, ex, ey);
        g.addColorStop(0, gc); g.addColorStop(0.22, gc);
        g.addColorStop(0.78, gc); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = alpha; ctx.fillStyle = g;
        // 宽 → 更宽 → 收尖：像刀削出去的一道刃，中段最厚
        const w0 = h.r * 0.60 * wmul, w1 = h.r * 1.65 * wmul;
        const mx = h.x + Math.cos(ang) * h.len * 0.38, my = h.y + Math.sin(ang) * h.len * 0.38;
        ctx.beginPath();
        ctx.moveTo(h.x + nx * w0 * 0.18, h.y + ny * w0 * 0.18);
        ctx.quadraticCurveTo(mx + nx * w1, my + ny * w1, ex, ey);
        ctx.quadraticCurveTo(mx - nx * w1, my - ny * w1, h.x - nx * w0 * 0.18, h.y - ny * w0 * 0.18);
        ctx.closePath(); ctx.fill();
      };
      ctx.save(); ctx.lineCap = 'round';
      const N = 6;
      for (let i = 0; i < N; i++) {
        const q = i / (N - 1);                       // 0 = 最早的一层
        const off = -0.058 * (1 - q);
        // alpha 用「保底 + 上浮」而不是纯幂次：幂次会让中间几层几乎为 0，
        // 层与层之间就露出缝，看着仍像两根分开的杆。
        const al = 0.40 * (0.12 + 0.88 * Math.pow(q, 1.6)) * fade;
        drawBand(h.ang + off, i === N - 1 ? 0.42 * fade : al, i === N - 1 ? 1 : 0.86);
      }
      // 刃线：中心一条细亮线，方向感全靠它
      ctx.globalAlpha = 0.85 * fade; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
      // 刃头：圆形亮斑，让"扫到哪儿了"一清二楚
      ctx.globalAlpha = 0.75 * fade;
      ctx.beginPath(); ctx.arc(x2, y2, h.r * 0.85, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x2, y2, h.r * 0.38, 0, 6.28); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }

    if (h.kind === 'spike') {
      for (let j = 0; j < h.pts.length; j++) {
        const q = h.pts[j];
        if (q.age <= 0) continue;                     // 还没破土
        const local = q.age - q.d;
        if (local < -0.16) continue;
        // 破土 0.10s 起 → 停 0.26s → 收回去
        const rise = Math.min(1, Math.max(0, (local + 0.16) / 0.10));
        const out = Math.min(1, Math.max(0, (h.t - 0.20) / 0.16));   // 整体快结束时缩回
        const k = rise * (0.35 + 0.65 * out);
        if (k <= 0.02) continue;
        const R = q.r, H = R * (1.55 + 0.35 * ((j % 3) - 1) * 0.4) * k;
        ctx.save();
        // 破土时的地裂圈
        if (rise < 1 || local < 0.05) {
          ctx.globalAlpha = 0.5 * (1 - Math.min(1, rise)) * fade;
          ctx.strokeStyle = col; ctx.lineWidth = 2;
          ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, 0.42);
          ctx.beginPath(); ctx.arc(0, 0, R * (1.5 + rise * 0.9), 0, 6.28); ctx.stroke();
          ctx.restore();
        }
        // 落地阴影：没有它，刺是"浮在地上"的
        ctx.globalAlpha = 0.30 * fade; ctx.fillStyle = '#000000';
        ctx.save(); ctx.translate(q.x, q.y + 2); ctx.scale(1, 0.34);
        ctx.beginPath(); ctx.arc(0, 0, R * 1.15, 0, 6.28); ctx.fill();
        ctx.restore();
        // 三根错开高度的尖刺，中间那根最高 —— 一根会像钉子，三根才像"地从底下裂开"。
        // 用**实心**填充（不再往顶部渐隐）：渐隐会把刺尖化成一缕白烟，
        // 看着是光点不是石头。立体感靠"受光面 + 暗面"两块拼，不靠透明度。
        for (let s = 0; s < 3; s++) {
          const off = (s - 1) * R * 0.54;
          const hh = H * (s === 1 ? 1 : 0.62);
          const wd = R * (s === 1 ? 0.50 : 0.38);
          const tx = q.x + off, ty = q.y - hh;
          ctx.globalAlpha = 0.95 * fade; ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(tx - wd, q.y + 2);
          ctx.lineTo(tx + wd * 0.16, ty);
          ctx.lineTo(tx + wd, q.y + 2);
          ctx.closePath(); ctx.fill();
          // 受光面（左半边）：亮一档，刺才有厚度
          ctx.globalAlpha = 0.34 * fade; ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(tx - wd, q.y + 2);
          ctx.lineTo(tx + wd * 0.16, ty);
          ctx.lineTo(tx - wd * 0.22, q.y + 2);
          ctx.closePath(); ctx.fill();
          // 棱线：一条从尖到底的亮线，尖刺的"尖"全靠它
          ctx.globalAlpha = 0.80 * fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(tx + wd * 0.16, ty); ctx.lineTo(tx - wd * 0.05, q.y + 2); ctx.stroke();
        }
        ctx.restore(); ctx.globalAlpha = 1;
      }
      return;
    }
  }

  // 柱高兜底：Boss 体型越大，光柱越高 —— 但**不做等比放大**。
  // 逻辑屏 480×864、相机把玩家放在画面中部，从玩家脚底往上的可用高度只有 400 上下；
  // 真按体型等比推到 500+，柱顶直接出画 —— 玩家看不到顶端那道收束，
  // 柱子就退化成"从屏幕外插进来的光条"，丢掉"这一片地被一座光柱占了"的形体。
  // 所以区间夹在 185~300：底座拿 r（体型）+ scale（视觉体量）双算，
  // 两者都算是因为有反例 —— 磁光兽 r=26 但 scale 只有 5.6，是本作唯一「碰撞大、看着小」的 Boss。
  function pillarHOf(b) {
    const r = (b && b.r) || 22, sc = (b && b.scale) || 6;
    const h = 200 + (r - 21) * 3.6 + (sc - 5.4) * 2.4;
    return Math.round(Math.max(185, Math.min(300, h)) / 5) * 5;
  }

  function castBossSkill(b, sk, tgt) {
    const p = G.player; if (!p || !b) return;
    const ang = Math.atan2(p.y - b.y, p.x - b.x);
    const dmg = bossDmgOf(b, sk);
    // 起手法阵：Boss 一出手，脚下先亮一圈阵纹 —— 比只有一圈预警环更像"在结印"
    if (window.FX3) FX3.spawn('rune', b.x, b.y + b.r * 0.55, { pal: 'mo', scale: 1 });
    switch (sk.fx) {
      case 'fan':
        // 扇形齐射 = 碎刃：小而快的菱形，沿速度方向拉出短尾，和环射一眼分得开
        aimFan(b.x, b.y, ang, sk.num || 5, sk.spread || 0.2, sk.spd || 220, dmg, 'shard');
        Sfx.shoot(); break;
      case 'ring':
        // 环射 = 完整珠：四面八方都有一颗，形状要「饱满」才对得上「一圈打出来」
        ringBurst(b.x, b.y, sk.num || 14, sk.spd || 175, dmg, 'orb');
        G.shake = Math.max(G.shake, 5); Sfx.burst(); break;
      case 'beam': {
        const sd = sk.spd || 760, r = sk.r || 11;
        // 贯刺不做成一发子弹：沿射线铺三节，射速够快时看上去就是一道剑光。
        // k:'blade' 让每一节都画成沿速度方向拉长的光带，三节首尾相衔成一道贯刺。
        for (let k = 0; k < 3; k++) {
          G.ebullets.push({ x: b.x + Math.cos(ang) * k * 26, y: b.y + Math.sin(ang) * k * 26, vx: Math.cos(ang) * sd, vy: Math.sin(ang) * sd, r: r - k * 2, dmg: dmg, life: 1.5, k: 'blade', a: ang });
        }
        G.shake = Math.max(G.shake, 5); Sfx.shoot(); break;
      }
      case 'rain': {
        const n = sk.num || 6, rad = sk.rad || 160;
        for (let k = 0; k < n; k++) {
          const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * rad;
          const tx = p.x + Math.cos(a) * rr, ty = p.y + Math.sin(a) * rr;
          G.ebullets.push({ x: tx, y: ty - 300, vx: 0, vy: 430 + Math.random() * 130, r: sk.r || 10, dmg: dmg, life: 2.2, k: 'drop', a: 1.5708, landY: ty });
          tellAt(tx, ty, (sk.r || 10) + 18, 0.55, '#ffb060');
        }
        Sfx.burst(); break;
      }
      case 'mist': {
        const n = sk.num || 10;
        for (let k = 0; k < n; k++) {
          const a = k / n * 6.28 + Math.random() * 0.4;
          G.ebullets.push({
            x: b.x + Math.cos(a) * 30, y: b.y + Math.sin(a) * 30,
            vx: Math.cos(a) * (sk.spd || 46), vy: Math.sin(a) * (sk.spd || 46),
            r: sk.r || 17, dmg: dmg, life: sk.dur || 2.6, k: 'mist', a: a, seed: Math.random() * 6.28
          });
        }
        Sfx.shoot(); break;
      }
      case 'pillar': {
        // 光柱：定桩持续招。柱子落在「前摇开始时玩家站的地方」，所以看见预警圈就得走开。
        // 这是本轮唯一真正持续扣血的招式——不是打一发就走，是"这一片地被占了"。
        // 柱高 sk.h 已按 Boss 体型分档填好（道祖 280 / 大乘 220 / 元婴 200 / 磁光兽 185）；
        // 没填的新 Boss 走 pillarHOf 兜底，不许再回到"所有 Boss 一样高"。
        const tx = (tgt && tgt.x !== undefined) ? tgt.x : p.x;
        const ty = (tgt && tgt.y !== undefined) ? tgt.y : p.y;
        const rad = sk.rad || 46, dur = sk.dur || 1.7;
        // 阶段加高：**同一个 Boss，打到最后柱子更高** —— 不用盯血条也知道它变强了。
        // 二阶段（血量 60%，startPhase2 那条线）+10%；狂暴（血量 30%，和 updateBossKit 的
        // enrage 同一条线）在二阶段基础上再抬，累计 ×1.18。
        // 上限压到 320：道祖原本 280，×1.18=330 会顶进血条。柱高再高也不能压 UI。
        const hBase = sk.h || pillarHOf(b);
        const hMul = (b.hp < b.maxhp * 0.3) ? 1.18 : (b.phase2 ? 1.10 : 1);
        const hFinal = Math.round(Math.min(320, hBase * hMul) / 5) * 5;
        addHazard({
          kind: 'pillar', x: tx, y: ty, r: rad, t: dur, dur: dur, dmg: dmg,
          tick: sk.tick || 0.40, color: sk.c || '#ffe6a0', h: hFinal
        });
        G.parts.push({ ring: true, x: tx, y: ty, r: rad * 0.35, maxr: rad * 2.3, life: 0.40, maxlife: 0.40, color: '#ffe6a0' });
        G.parts.push({ ring: true, x: tx, y: ty, r: rad * 1.5, maxr: rad * 0.7, life: 0.30, maxlife: 0.30, color: '#fff4d0' });
        G.shake = Math.max(G.shake, 6); Sfx.burst(); break;
      }
      case 'sweep': {
        // 横扫光刃：一道长光带从 Boss 身上扫过去，判定是「线段」不是圆。
        // 玩家能做的只有两件事——绕到背后，或者趁它扫过来之前跑到射程外。
        const len = sk.len || 440, dur = sk.dur || 2.2;
        const half = (sk.arc || 2.0) / 2;
        const a0 = ang - half, a1 = ang + half;
        addHazard({
          kind: 'sweep', x: b.x, y: b.y, r: sk.r || 15, len: len,
          ang: a0, rate: (a1 - a0) / dur, t: dur, dur: dur, dmg: dmg,
          tick: sk.tick || 0.45, color: sk.c || '#ffb060'
        });
        Sfx.warn(); G.shake = Math.max(G.shake, 5); break;
      }
      case 'spike': {
        // 地刺：从 Boss 脚下朝玩家方向连成一排，按 delay 依次破土 —— 是「追着你冒」的土浪。
        // 每个点位只结算一次，不是持续区：踩中就一下，躲开就没事。
        const dd = U.dist(b.x, b.y, p.x, p.y);
        const total = Math.min(sk.len || 430, dd + 70);
        const n = sk.num || 5, gap = total / n;
        const pts = [];
        for (let k = 0; k < n; k++) {
          const d = gap * (k + 1);
          pts.push({
            x: b.x + Math.cos(ang) * d, y: b.y + Math.sin(ang) * d,
            r: sk.r || 26, d: k * (sk.step || 0.10), age: 0, hit: false
          });
        }
        addHazard({ kind: 'spike', x: b.x, y: b.y, r: 0, t: (sk.dur || 1.3), dur: (sk.dur || 1.3), dmg: dmg, pts: pts, color: sk.c || '#e8c88a' });
        Sfx.warn(); break;
      }
      case 'dash':
        // 起势先炸一圈尘：冲撞是「Boss 动了」最强的信号，之前只有一点点零星粒子，压根看不出要冲
        G.parts.push({ ring: true, x: b.x, y: b.y + b.r * 0.45, r: 5, maxr: b.r * 2.2, life: 0.30, maxlife: 0.30, color: '#d8b078' });
        G.parts.push({ ring: true, x: b.x, y: b.y + b.r * 0.45, r: b.r * 1.6, maxr: b.r * 0.8, life: 0.24, maxlife: 0.24, color: '#ffb060' });
        b.dashing = 0.44; b.dashAng = ang; b.dashDist = sk.dist || 4.6; b._dashGap = 0; Sfx.warn(); break;
      case 'blink': {
        const a = Math.random() * 6.28, dd = sk.dist || 190;
        const ox = b.x, oy = b.y;
        b.x = p.x + Math.cos(a) * dd; b.y = p.y + Math.sin(a) * dd;
        // 原地炸开 + 落点收拢：让「消失—出现」被看见。只抖屏的话，Boss 只是忽然换了位置。
        // 这里不用 pixelfx 的 poof：它是像素风放射爆炸，放大到 Boss 尺寸就是一颗发光球，
        // 和 Boss 自己的笔触不是一套。改用同心环，同源、也看得懂。
        G.parts.push({ ring: true, x: ox, y: oy, r: b.r * 1.9, maxr: 5, life: 0.36, maxlife: 0.36, color: '#b98aff' });
        G.parts.push({ ring: true, x: ox, y: oy, r: b.r * 1.2, maxr: 3, life: 0.30, maxlife: 0.30, color: '#f2dcff' });
        G.parts.push({ ring: true, x: b.x, y: b.y, r: 4, maxr: b.r * 2.1, life: 0.36, maxlife: 0.36, color: '#b98aff' });
        G.parts.push({ ring: true, x: b.x, y: b.y, r: 3, maxr: b.r * 1.1, life: 0.30, maxlife: 0.30, color: '#f2dcff' });
        G.shake = Math.max(G.shake, 6); Sfx.burst(); break;
      }
      case 'summon': {
        // 地图上写了 summon:'' 或 noSummon 的 Boss 一律不召群（教学关靠这个关掉添兵）。
        // 招式表不能绕过这条：否则「山贼头目不召群」会被通用魔修招式重新打开。
        if (b.noSummon || b.summon === '') break;
        // 专属招式表：召什么由招式定（虫母召虫、蛛母召子）；
        // 通用同族表：沿用地图上配的召唤物，别把"海兽"改成"狼"。
        const st = b.kitNamed ? (sk.type || 'ghoul') : ((b.summon && b.summon !== '') ? b.summon : (sk.type || 'ghoul'));
        if (summonAt(b, st, sk.num || 2, sk.cap || 4)) banner(b.name + ' · ' + sk.n);
        break;
      }
      case 'trap':
        // 困阵：地上升起一圈阵纹，人站里面挪不动 —— 之前只扣血弹一行字，玩家完全看不出被打
        if (sk.dur) p.rootT = Math.max(p.rootT || 0, sk.dur);
        hitPlayer(dmg);
        addZone(p.x, p.y, sk.rad || 58, Math.max(1.2, (sk.dur || 1.2) + 0.5), 'bind', { slow: 0.34 });
        spawnText(p.x, p.y - 34, sk.n, '#ff7ab0', 13); Sfx.warn(); break;
      case 'chill':
        if (sk.dur) { p.slowT = Math.max(p.slowT || 0, sk.dur); p.slowK = sk.slow || 0.45; }
        hitPlayer(dmg);
        addZone(p.x, p.y, sk.rad || 88, 2.4, 'ice', { slow: sk.slow || 0.45 });
        spawnText(p.x, p.y - 34, sk.n, '#8fd8ff', 13); Sfx.warn(); break;
      case 'pull': {
        const dd = U.dist(p.x, p.y, b.x, b.y) || 1;
        const mv = Math.min(sk.dist || 80, Math.max(0, dd - 70));
        p.x += (b.x - p.x) / dd * mv; p.y += (b.y - p.y) / dd * mv;
        // 漩涡：画在「被拽向的地方」，看得见"有东西在吸我"
        addZone(b.x, b.y, sk.rad || 108, 1.15, 'vortex', { pull: 62 });
        hitPlayer(dmg); G.shake = Math.max(G.shake, 5); Sfx.warn(); break;
      }
      case 'nova':
        // 爆发 = 重珠：珠子更大、带一圈脉动外环，撞上来有「这一下很重」的预感
        ringBurst(b.x, b.y, sk.num || 18, sk.spd || 190, dmg, 'heavy');
        G.parts.push({ ring: true, x: b.x, y: b.y, r: 10, maxr: (sk.rad || 150) * 0.9, life: 0.42, maxlife: 0.42, color: '#ff9a4a' });
        if (U.dist(p.x, p.y, b.x, b.y) < (sk.rad || 150)) hitPlayer(Math.round(dmg * 1.4));
        G.shake = Math.max(G.shake, 10); Sfx.burst(); break;
      case 'heal': {
        const add = Math.round(b.maxhp * (sk.pct || 0.04));
        b.hp = Math.min(b.maxhp, b.hp + add);
        spawnText(b.x, b.y - b.r - 26, sk.n + ' · 回气 ' + add, '#ffdd66', 12);
        Sfx.buff(); break;
      }
    }
  }
  // 招式轮转：每招各算各的冷却，同一时刻只出一招（pending 是前摇）。
  // 前摇期间头顶报招式名 + 地上亮预警圈 —— 原著里高手出招也有兆头，玩家该有那半秒反应。
  function updateBossKit(b, kit, dt) {
    const list = kit.skills;
    const pl = G.player;          // updateBossKit 是独立函数，本作用域里没有 p
    if (b.pending) {
      b.pending.t -= dt;
      if (b.pending.t <= 0) { const s = b.pending.sk, tg = b.pending.tgt; b.pending = null; castBossSkill(b, s, tg); }
    }
    if (b.dashing > 0) {
      b.dashing -= dt;
      b.x += Math.cos(b.dashAng) * b.spd * (b.dashDist || 4.6) * dt;
      b.y += Math.sin(b.dashAng) * b.spd * (b.dashDist || 4.6) * dt;
      if (Math.random() < 0.6) G.parts.push({ x: b.x + U.rand(-10, 10), y: b.y + U.rand(-10, 10), vx: 0, vy: 0, life: 0.3, maxlife: 0.3, size: 5, color: '#9a8360' });
      // 沿途留残影环：单靠零星灰尘，一帧就看不出「它刚扫过去一条线」
      b._dashGap = (b._dashGap || 0) - dt;
      if (b._dashGap <= 0) {
        b._dashGap = 0.055;
        G.parts.push({ ring: true, x: b.x, y: b.y + b.r * 0.35, r: b.r * 0.95, maxr: b.r * 1.3, life: 0.26, maxlife: 0.26, color: '#a89060' });
      }
    }
    for (let i = 0; i < list.length; i++) {
      const sk = list[i];
      b.cds[i] = (b.cds[i] || 0) - dt;
      if (b.cds[i] > 0 || b.pending) continue;
      b.cds[i] = (sk.cd || 6) * (b.phase2 ? 0.72 : 1);   // 二阶段整体加快，跟旧版节奏一致
      const tele = sk.tele === undefined ? 0.5 : sk.tele;
      if (tele > 0.02) {
        // 定桩类（光柱/地刺）的落点是"前摇开始那一刻玩家站的地方"，预警圈就必须画在落点上，
        // 而不是画在 Boss 脚下 —— 画错了玩家根本不知道该躲哪儿。
        const needTgt = (sk.fx === 'pillar' || sk.fx === 'spike');
        if (needTgt && pl) {
          const tg = { x: pl.x, y: pl.y };
          b.pending = { sk: sk, t: tele, tgt: tg };
          tellAt(tg.x, tg.y, sk.fx === 'spike' ? (sk.r || 26) * 1.6 : (sk.rad || 46) + 12, tele, '#ff7a52');
        } else {
          b.pending = { sk: sk, t: tele };
          tellAt(b.x, b.y, sk.fx === 'rain' ? 0 : (sk.rad || 130), tele, '#ff7a52');
        }
        spawnText(b.x, b.y - b.r * 1.6 - 16, sk.n, '#ffc46a', 12);
      } else {
        castBossSkill(b, sk);
      }
      break;   // 一帧只起一招，别让两招前摇叠在一起
    }
  }
  function updateBoss(dt) {
    const b = G.boss, p = G.player;
    // 兜底：active 为真却没有 Boss 实体时（联机进度同步的边界情况）直接收摊，别崩
    if (!b) { G.bossActive = false; return; }
    b.t += dt; if (b.hitFlash > 0) b.hitFlash -= dt;

    // 二阶段演出期间：定身、不攻击、不吃碰撞
    if (b.phaseT > 0) { b.phaseT -= dt; return; }

    const phase2 = b.phase2;
    const enrage = b.hp < b.maxhp * 0.3;
    const mul = phase2 ? (enrage ? 1.75 : 1.5) : (enrage ? 1.4 : 1);
    const spd = b.spd * mul;
    const ang = Math.atan2(p.y - b.y, p.x - b.x);
    const d = U.dist(p.x, p.y, b.x, b.y);
    let mv = 0; if (d > 180) mv = 1; else if (d < 120) mv = -0.6;
    b.x += Math.cos(ang) * spd * mv * dt; b.y += Math.sin(ang) * spd * mv * dt;

    if (b.kit) {
      // 有招式表就走招式表（原著招式 + 前摇 + 伤害系数），下面四系只作没有表的兜底
      updateBossKit(b, b.kit, dt);
    } else if (b.kind === 'beast') {
      // 冲撞突进
      b.dashT -= dt;
      if (b.dashT <= 0) { b.dashing = 0.42; b.dashT = phase2 ? 2.3 : 3.6; b.dashAng = ang; Sfx.warn(); }
      if (b.dashing > 0) {
        b.dashing -= dt;
        b.x += Math.cos(b.dashAng) * spd * 4.4 * dt;
        b.y += Math.sin(b.dashAng) * spd * 4.4 * dt;
        if (Math.random() < 0.6) G.parts.push({ x: b.x + U.rand(-10, 10), y: b.y + U.rand(-10, 10), vx: 0, vy: 0, life: 0.3, maxlife: 0.3, size: 5, color: '#9a8360' });
      }
      // 嚎叫召群：召什么由地图的 boss.summon 决定，横幅用 boss 自己的名字
      // （原先是写死的「狼妖」，于是石人、墨蛟、灵猿全都在「嚎叫召狼」）
      b.sumT -= dt;
      if (b.sumT <= 0) {
        b.sumT = phase2 ? 7.5 : 10.5;
        if (b.summon && summonAt(b, b.summon, phase2 ? 3 : 2, phase2 ? 9 : 6)) banner(b.name + ' · 嚎叫召群');
      }
      if (phase2) {
        b.burstT -= dt;
        if (b.burstT <= 0) { b.burstT = 3.4; ringBurst(b.x, b.y, 14, 185, bShot(b, 0.28)); G.shake = 6; Sfx.burst(); }
      }
    } else if (b.kind === 'mo') {
      // 散射
      const shootInt = phase2 ? (enrage ? 0.9 : 1.1) : (enrage ? 1.3 : 1.8);
      const n = phase2 ? (enrage ? 11 : 9) : (enrage ? 7 : 5);
      b.shootT -= dt;
      if (b.shootT <= 0) {
        b.shootT = shootInt;
        aimFan(b.x, b.y, Math.atan2(p.y - b.y, p.x - b.x), n, phase2 ? 0.26 : 0.18, 190, bShot(b, 0.42));
        Sfx.shoot();
      }
      // 瞬移 + 环形弹幕
      b.teleT -= dt;
      if (b.teleT <= 0) {
        b.teleT = phase2 ? 4 : 6;
        const a = Math.random() * 6.28;
        b.x = p.x + Math.cos(a) * 180; b.y = p.y + Math.sin(a) * 180;
        ringBurst(b.x, b.y, phase2 ? 14 : 10, 150, bShot(b, 0.28));
        G.shake = 6; Sfx.burst();
      }
      // 召唤尸傀（boss.summon 为空串表示「这一只不召群」，与 beast 分支口径一致；教学关靠这个关掉召群）
      b.sumT -= dt;
      if (b.sumT <= 0) {
        b.sumT = phase2 ? 7 : 9;
        if (!b.noSummon) summonAt(b, 'ghoul', phase2 ? 3 : 2, phase2 ? 5 : 4);
      }
      if (phase2) {
        b.burstT -= dt;
        if (b.burstT <= 0) { b.burstT = 3.2; ringBurst(b.x, b.y, 16, 170, bShot(b, 0.28)); G.shake = 5; Sfx.burst(); }
      }
    } else if (b.kind === 'swarm') {
      // 螺旋弹幕
      b.ang += dt * (phase2 ? 2.7 : 1.9);
      b.shootT -= dt;
      if (b.shootT <= 0) {
        b.shootT = phase2 ? 0.22 : 0.32;
        const arms = phase2 ? 4 : 3;
        for (let k = 0; k < arms; k++) {
          const a = b.ang + k * Math.PI * 2 / arms;
          G.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 155, vy: Math.sin(a) * 155, r: 6, dmg: bShot(b, 0.8), life: 4.5 });
        }
      }
      // 躲远、召虫
      if (d < 150) { b.x -= Math.cos(ang) * spd * 0.9 * dt; b.y -= Math.sin(ang) * spd * 0.9 * dt; }
      b.sumT -= dt;
      if (b.sumT <= 0) { b.sumT = phase2 ? 6.5 : 9.5; summonAt(b, 'bat', phase2 ? 4 : 3, phase2 ? 12 : 9); }
      if (phase2) {
        b.burstT -= dt;
        if (b.burstT <= 0) { b.burstT = 3.8; ringBurst(b.x, b.y, 18, 165, bShot(b, 0.26)); G.shake = 5; Sfx.burst(); }
      }
    } else {
      // blood：瞬移 + 交错弹幕 + 血环
      b.shootT -= dt;
      if (b.shootT <= 0) {
        b.shootT = phase2 ? 0.85 : 1.25;
        const base = Math.atan2(p.y - b.y, p.x - b.x);
        if (Math.random() < 0.5) aimFan(b.x, b.y, base, phase2 ? 9 : 7, 0.2, 210, bShot(b, 0.42));
        else ringBurst(b.x, b.y, phase2 ? 16 : 12, 165, bShot(b, 0.28));
        Sfx.shoot();
      }
      b.teleT -= dt;
      if (b.teleT <= 0) {
        b.teleT = phase2 ? 3.6 : 5.4;
        const a = Math.random() * 6.28;
        b.x = p.x + Math.cos(a) * 190; b.y = p.y + Math.sin(a) * 190;
        G.shake = 7; Sfx.burst();
      }
      b.sumT -= dt;
      if (b.sumT <= 0) { b.sumT = phase2 ? 8 : 11; summonAt(b, 'assassin', phase2 ? 3 : 2, phase2 ? 6 : 4); }
      if (phase2) {
        b.burstT -= dt;
        if (b.burstT <= 0) { b.burstT = 2.8; ringBurst(b.x, b.y, 18, 190, bShot(b, 0.28)); G.shake = 6; Sfx.burst(); }
      }
    }

    // 贴身碰撞与招式同档：突进扑到人身上也必须真疼，否则「躲突进」没有意义
    if (U.dist(p.x, p.y, b.x, b.y) < b.r + p.r) hitPlayer(bShot(b, 1));
    b._flip = p.x < b.x;
  }
  function onBossDead() {
    const name = G.boss ? G.boss.name : '妖首';
    G.bossActive = false; G.boss = null;
    // 多 Boss：本图还有 extraBoss 未出场，先洒一小波灵石，再续战下一只（不结算）
    const eb = (G.map && G.map.extraBoss) || null;
    if (eb && (G.extraIdx || 0) < eb.length) {
      const cfg = eb[G.extraIdx++];
      G.shake = 16; G.flash = 0.7; G.hitStop = 0.1;
      for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, dd = U.rand(20, 140); G.gems.push({ x: G.player.x + Math.cos(a) * dd, y: G.player.y + Math.sin(a) * dd, r: 5, val: 4 }); }
      banner(name + ' 已伏诛 · ' + cfg.name + ' 现身');
      spawnBossFrom(cfg, true);
      return;
    }
    G.shake = 18; G.flash = 0.85; G.hitStop = 0.14;
    // 灵石与道具洒落，稍后随结局对话自动收取
    for (let i = 0; i < 34; i++) { const a = Math.random() * 6.28, dd = U.rand(20, 150); G.gems.push({ x: G.player.x + Math.cos(a) * dd, y: G.player.y + Math.sin(a) * dd, r: 5, val: 5 }); }
    for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, dd = U.rand(30, 180); dropStone(G.player.x + Math.cos(a) * dd, G.player.y + Math.sin(a) * dd, 4); }
    // 灵界抢的是灵物，不是法器：成品洒落减半，材料相应补上
    const ling = inLingjie();
    const lootN = Math.round((8 + (G.diff && G.diff.rarity ? G.diff.rarity * 2 : 0)) * (ling ? 0.5 : 1));
    for (let i = 0; i < lootN; i++) { const a = Math.random() * 6.28, dd = U.rand(30, 190); dropLoot(G.player.x + Math.cos(a) * dd, G.player.y + Math.sin(a) * dd, 2); }
    dropMat(G.player.x, G.player.y, Math.round((6 + (G.diff && G.diff.rarity ? 2 : 0)) * (ling ? 1.8 : 1)));
    // 破境药材：这一趟没落完的，Boss 一倒全补齐 —— 打完就够开炉
    if (alchLeft() > 0) alchGrant(alchLeft());
    G.enemies.length = 0;
    G.vacuumT = 1.7; G.pendingEnding = true;
    banner(name + ' 已伏诛 · 收取战利品'); Sfx.levelup();
  }

  // ---------- 生成调度 ----------
  // 旧逻辑是「按时间硬刷」：1 只/秒起步，110 秒时 3 只/秒，跟玩家打得快慢无关。
  // 实测（qa/pacing.mjs）：玩家每秒只能清 0.4~1.3 只，刷怪 1~3 只/秒，缺口只增不减，
  // 几十秒后场上堆到 77~126 只（开无敌测的上限）—— 那不是「怪多」，是「被淹」。
  // 现在改成缺口驱动：场上少于目标就补，补到目标就停。怪的数量跟着玩家清场能力走，
  // 玩家变强 → 场上自动变挤 → 压力回到「打得爽」而不是「被围死」。
  const PACK_MIN = 8;      // 开局让玩家看到的量（够打，又不至于一进来就被围）
  const PACK_MAX = 26;     // 单屏同时压多少只：再多就只剩躲，没有打
  const PACK_GROW = 0.16;  // 每秒抬高多少目标（110 秒的图正好爬到上限）
  const PACK_HARD = 44;    // 硬顶：难度系数叠上去也不许超过这个数（性能与可读性）
  function budget() {
    const t = G.time;
    const interval = Math.max(0.30, 0.9 - t * 0.0032);
    const cnt = curDiff().cnt || 1;
    // 教学关可单独压低同屏上限（map.packMax）：首关不靠数量堆压力，先让新手站得住
    const cap = (G.map && G.map.packMax) || PACK_MAX;
    const want = Math.min(PACK_HARD, Math.min(cap, PACK_MIN + t * PACK_GROW) * cnt);
    const gap = want - G.enemies.length;
    // 只补缺口的一半、单拍最多 6 只：一次灌满会把画面瞬间糊住
    const batch = Math.max(0, Math.min(6, Math.round(gap * 0.5)));
    return { interval, batch };
  }
  function pickType() {
    const pool = (G.map && G.map.enemies && G.map.enemies.length) ? G.map.enemies : ['wolf', 'snake', 'bat'];
    let n = 2 + Math.floor(G.time / 55);
    n = Math.min(pool.length, Math.max(2, n));
    return U.pick(pool.slice(0, n));
  }
  function spawnDirector(dt) {
    G.spawnT -= dt;
    if (G.spawnT <= 0) {
      if (G.enemies.length < 140) { const b = budget(); for (let i = 0; i < b.batch; i++) spawnEnemy(pickType()); }
      G.spawnT = budget().interval;
    }
    if (G.time >= G.nextEliteT) { spawnElite(G.eliteIdx); G.eliteIdx++; G.nextEliteT = G.time + 105; }
  }

  // ---------- 拾取 ----------
  // 双人联机：掉落由房主权威拥有。客机镜像是 _remote 掉落，靠近即本地入袋（奖励落到自己存档），
  // 同时上报 {t:'taken'} 让房主移除，避免双方重复拾取。房主收本地掉落时也会上报，避免客机重复捡。
  function coopClaimed(id) {
    if (id == null) return true;
    if (!G._claimedDrops) return false;
    return G._claimedDrops.has(id);
  }
  function coopClaim(id) {
    if (id == null) return;
    if (!G._claimedDrops) G._claimedDrops = new Set();
    G._claimedDrops.add(id);
    if (window.Coop) window.Coop.reportTaken(id);
  }
  function updatePickups(dt) {
    const p = G.player, pr = pickupR();
    const vac = G._hostVacuum;   // 房主 Boss 战后自动收取战利品期间，客机暂停拾取，不瓜分房主掉落
    for (let i = G.gems.length - 1; i >= 0; i--) {
      const g = G.gems[i]; const d = U.dist(p.x, p.y, g.x, g.y);
      if (d < pr) { const a = Math.atan2(p.y - g.y, p.x - g.x); const pull = U.lerp(120, 360, 1 - d / pr); g.x += Math.cos(a) * pull * dt; g.y += Math.sin(a) * pull * dt; }
      if (g._remote) {
        if (vac || coopClaimed(g._id)) continue;
        if (d < 14) {
          if (g.kind === 'stone') { save.stones = (save.stones || 0) + (g.val || 1); spawnText(g.x, g.y - 12, '+' + (g.val || 1) + ' 灵石', '#ffd24a', 12); }
          else gainXp(g.val);
          Sfx.gem(); coopClaim(g._id);
        }
        continue;
      }
      if (d < 14) {
        if (g.kind === 'stone') { save.stones = (save.stones || 0) + (g.val || 1); spawnText(g.x, g.y - 12, '+' + (g.val || 1) + ' 灵石', '#ffd24a', 12); }
        else gainXp(g.val);
        Sfx.gem(); G.gems.splice(i, 1);
        if (g._id != null && G.coopRole === 'host' && window.Coop) window.Coop.reportTaken(g._id);
      }
    }
    if (G.gems.length > 260) G.gems.splice(0, G.gems.length - 260);
    for (let i = G.herbs.length - 1; i >= 0; i--) {
      const h = G.herbs[i]; const d = U.dist(p.x, p.y, h.x, h.y);
      if (d < pr) { const a = Math.atan2(p.y - h.y, p.x - h.x); h.x += Math.cos(a) * 240 * dt; h.y += Math.sin(a) * 240 * dt; }
      if (h._remote) {
        if (vac || coopClaimed(h._id)) continue;
        if (d < 16) { p.hp = Math.min(p.maxhp, p.hp + 14); spawnText(p.x, p.y - 20, '+14', '#7dff7d', 14); Sfx.heal(); coopClaim(h._id); }
        continue;
      }
      if (d < 16) {
        p.hp = Math.min(p.maxhp, p.hp + 14); spawnText(p.x, p.y - 20, '+14', '#7dff7d', 14); Sfx.heal(); G.herbs.splice(i, 1);
        if (h._id != null && G.coopRole === 'host' && window.Coop) window.Coop.reportTaken(h._id);
      }
    }
    // 道具：靠近吸附，接触后入袋
    for (let i = G.loot.length - 1; i >= 0; i--) {
      const l = G.loot[i]; const d = U.dist(p.x, p.y, l.x, l.y);
      if (d < pr) { const a = Math.atan2(p.y - l.y, p.x - l.x); const pull = U.lerp(160, 460, 1 - d / pr); l.x += Math.cos(a) * pull * dt; l.y += Math.sin(a) * pull * dt; }
      if (l._remote) {
        if (vac || coopClaimed(l._id) || !l.item) continue;
        if (d < 18) { applyItem(l.item); spawnText(l.x, l.y - 14, l.item.name, (RARITY[l.item.rarity] || {}).color || '#fff', 13); coopClaim(l._id); }
        continue;
      }
      if (d < 18) {
        applyItem(l.item);
        spawnText(l.x, l.y - 14, l.item.name, RARITY[l.item.rarity].color, 13);
        G.loot.splice(i, 1);
        if (l._id != null && G.coopRole === 'host' && window.Coop) window.Coop.reportTaken(l._id);
      }
    }
  }
  function takeGem(o) {
    if (o.kind === 'stone') save.stones = (save.stones || 0) + (o.val || 1);
    else gainXp(o.val);
    Sfx.gem();
  }
  // Boss 战后：一屏之内的掉落自动飞向角色（配合结局对话）
  // 视野外的不施加吸力 —— 隔着半张图的材料不会自己长腿跑过来。
  function vacuumPickups(dt, speed) {
    const p = G.player, sp = speed || 900;
    const pull = (arr) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const o = arr[i];
        if (!inView(o)) continue;
        const d = U.dist(p.x, p.y, o.x, o.y);
        const a = Math.atan2(p.y - o.y, p.x - o.x);
        o.x += Math.cos(a) * sp * dt; o.y += Math.sin(a) * sp * dt;
        if (d < 20) {
          if (arr === G.gems) takeGem(o);
          else if (arr === G.herbs) { G.player.hp = Math.min(G.player.maxhp, G.player.hp + 14); }
          else if (arr === G.loot) { applyItem(o.item); }
          arr.splice(i, 1);
        }
      }
    };
    pull(G.gems); pull(G.herbs); pull(G.loot);
  }
  // inViewOnly：只收当前一屏之内的掉落（Boss 战后的自动收取走这条）。
  // 视野外的留在原地 —— 该走过去捡的东西，得玩家自己走过去。
  function collectAllPickups(inViewOnly) {
    let n = 0, left = 0;
    // P6：房主把 Boss 战利品全数收走时，给队友留一份——修为 / 灵石 / 回血各半，
    // 掉落道具也给同款一份（只此一件的东西 addToBag 自己会拦，不会一式两份）。
    const share = (G.coopRole === 'host' && window.Coop) ? { xp: 0, stones: 0, hp: 0, items: [] } : null;
    const drain = (arr, onTake) => {
      const rest = [];
      for (const o of arr) {
        if (inViewOnly && !inView(o)) { rest.push(o); left++; continue; }
        onTake(o); n++;
      }
      arr.length = 0;
      for (const o of rest) arr.push(o);
    };
    drain(G.gems, g => {
      if (share) { if (g.kind === 'stone') share.stones += (g.val || 1); else share.xp += (g.val || 0); }
      takeGem(g);
    });
    drain(G.herbs, () => {
      G.player.hp = Math.min(G.player.maxhp, G.player.hp + 14);
      if (share) share.hp += 14;
    });
    drain(G.loot, l => {
      if (share && l.item) share.items.push(l.item.id);
      applyItem(l.item, { silent: true });
    });
    G.pickLeft = left;   // 结算面板要报「视野外没捡到几件」
    if (n > 0) spawnText(G.player.x, G.player.y - 30, '收获 ' + n + ' 件', '#ffd24a', 16);
    if (left > 0) spawnText(G.player.x, G.player.y - 52, '视野外 ' + left + ' 件未及拾取', '#8b96a6', 12);
    if (share) {
      share.xp *= 0.5; share.stones *= 0.5; share.hp *= 0.5;
      if (share.stones) share.stones = Math.max(1, Math.round(share.stones));
      window.Coop.sendReward(share);
    }
    return n;
  }

  // ---------- 粒子 / 文字 ----------
  // ---------- 施法表现：按功法分发 ----------
  // 原著里各门手段本来就不是一个样子：青元剑诀是青碧剑芒、血魔剑是通红剑芒带血雾、
  // 火弹术是真的窜出一条蛇、三焰扇是三色火、辟邪神雷是从天上劈下来的雷。
  // 所以这里不再"一律画剑、一律画火"，而是各自一套。
  const vfxGradCache = new Map();
  function vfxTrail(x, y, ang, len, color, alpha) {
    // 一段由粗到细的拖尾。不建渐变（每帧每个弹都建一次太浪费），
    // 用两段纯色三角叠出“越往后越淡”的意思，视觉几乎一样。
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.globalAlpha = (alpha == null ? 0.55 : alpha) * 0.55;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-len, 5); ctx.lineTo(-len * 0.95, -5); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = (alpha == null ? 0.55 : alpha) * 0.35;
    ctx.beginPath(); ctx.moveTo(-len * 0.35, 0); ctx.lineTo(-len * 1.35, 3.6); ctx.lineTo(-len * 1.3, -3.6); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawBulletVfx(b, alpha) {
    const vfx = b.vfx || b.spr || 'sword';
    const ang = b.ang != null ? b.ang : Math.atan2(b.vy || 0, b.vx || 0);
    const a0 = alpha == null ? 1 : alpha;
    ctx.globalAlpha = a0;
    if (vfx === 'sword') {
      drawSpr('sword', b.x, b.y, 1.3, false);
      ctx.globalAlpha = 1; return;
    }
    if (vfx === 'qingmang') {
      // 青元剑芒：青碧色细长光刃，中间一道白芯
      vfxTrail(b.x, b.y, ang, 26, 'rgba(90,230,180,0.75)', a0 * 0.6);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(120,240,196,0.9)';
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, 4.2); ctx.lineTo(-11, 0); ctx.lineTo(-8, -4.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(235,255,247,0.95)';
      ctx.fillRect(-7, -1.1, 20, 2.2);
      ctx.restore();
    } else if (vfx === 'blood') {
      // 血魔剑：通红的剑芒，外面裹一层暗红血雾
      const pl = 0.5 + 0.5 * Math.sin((G.time || 0) * 14 + (b.phase || 0));
      ctx.globalAlpha = a0 * (0.18 + pl * 0.14);
      ctx.fillStyle = '#7a0f1e';
      ctx.beginPath(); ctx.arc(b.x, b.y, 13 + pl * 3, 0, 6.28); ctx.fill();
      ctx.globalAlpha = a0;
      vfxTrail(b.x, b.y, ang, 30, 'rgba(255,60,80,0.7)', a0 * 0.6);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(235,52,72,0.95)';
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-9, 5); ctx.lineTo(-12, 0); ctx.lineTo(-9, -5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,190,190,0.9)';
      ctx.fillRect(-8, -1.2, 22, 2.4);
      ctx.restore();
    } else if (vfx === 'snake') {
      // 火蛇：蛇身按相位左右扭，从尾到头由粗到细；外面裹一层暗红火焰
      const ph = (b.phase || 0) + (G.time || 0) * 13;
      const N = 8, gap = 6.0;
      const pts = [];
      for (let k = 0; k < N; k++) {
        const off = Math.sin(ph - k * 0.85) * (7.5 - k * 0.55);
        pts.push([
          b.x - Math.cos(ang) * (k * gap) - Math.sin(ang) * off,
          b.y - Math.sin(ang) * (k * gap) + Math.cos(ang) * off
        ]);
      }
      const path = () => {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) {
          const mx = (pts[k - 1][0] + pts[k][0]) / 2, my = (pts[k - 1][1] + pts[k][1]) / 2;
          ctx.quadraticCurveTo(pts[k - 1][0], pts[k - 1][1], mx, my);
        }
        ctx.stroke();
      };
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(190,60,20,0.34)'; ctx.lineWidth = 11; path();   // 外焰
      ctx.strokeStyle = 'rgba(255,140,55,0.95)'; ctx.lineWidth = 5.2; path(); // 蛇身
      ctx.strokeStyle = 'rgba(255,224,150,0.85)'; ctx.lineWidth = 2.0; path();// 亮芯
      ctx.lineCap = 'butt';
      // 蛇头
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(b.x, b.y, 5.2, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#fff3c8';
      ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, 6.28); ctx.fill();
    } else if (vfx === 'fan') {
      // 三焰扇：三色火轮着来（赤 / 橙 / 紫），越靠里越亮
      const cols = [['#ff4a2e', '#ffd05a'], ['#ff9a2e', '#fff0b0'], ['#a45cff', '#e6ccff']];
      const c = cols[(b.hue || 0) % 3];
      ctx.globalAlpha = a0 * 0.9;
      ctx.fillStyle = c[0];
      ctx.beginPath(); ctx.arc(b.x, b.y, 8.5, 0, 6.28); ctx.fill();
      ctx.fillStyle = c[1];
      ctx.beginPath(); ctx.arc(b.x, b.y, 4.4, 0, 6.28); ctx.fill();
      vfxTrail(b.x, b.y, ang, 20, c[0], a0 * 0.5);
    } else if (vfx === 'gold') {
      ctx.fillStyle = 'rgba(255,225,120,0.95)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, 6.28); ctx.fill();
    } else if (vfx === 'fire') {
      // 火弹术：一团直射的火球（外焰暗红、内芯亮黄），拖一道火星
      ctx.fillStyle = 'rgba(255,96,32,0.55)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(255,214,110,1)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 6.28); ctx.fill();
      for (let i = 0; i < 2; i++) {
        const t = i / 2;
        G.parts.push({ x: b.x - b.vx * 0.012 * (1 + t), y: b.y - b.vy * 0.012 * (1 + t),
          vx: -b.vx * 0.05, vy: -b.vy * 0.05, life: 0.22, maxlife: 0.22, r: 2.4 - t, color: '#ff8a3c' });
      }
    } else if (vfx === 'corpsefire') {
      // 天都尸火：原著“被绿焰迎头一罩”“黑色尸火”，极阴至寒的绿黑阴火 —— 不是寻常红火
      ctx.fillStyle = 'rgba(40,200,110,0.5)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(20,30,26,0.85)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(170,255,200,0.95)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, 6.28); ctx.fill();
      for (let i = 0; i < 2; i++) {
        const t = i / 2;
        G.parts.push({ x: b.x - b.vx * 0.012 * (1 + t), y: b.y - b.vy * 0.012 * (1 + t),
          vx: -b.vx * 0.05, vy: -b.vy * 0.05, life: 0.24, maxlife: 0.24, r: 2.6 - t, color: '#5fe08a' });
      }
    } else if (vfx === 'drill') {
      // 血灵钻：原著「将体内的真元慢慢凝练压缩数十倍，暗藏体内出其不意杀人用」——
      // 一次性暗器，不是剑芒。第一版小锥体+旋纹+血雾，实拍读成「红色飞溅」——
      // 三种红色元素叠在 10px 里互相打架。钻的读法是「螺纹」：一个宽根尖头的锥体，
      // 身上两道同向螺纹斜线（不是交叉线），随飞行微微前移出旋转感。别的全砍。
      const spin = (G.time || 0) * 14 + (b.phase || 0);
      ctx.globalAlpha = a0;
      vfxTrail(b.x, b.y, ang, 12, 'rgba(255,60,80,0.45)', a0 * 0.35);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(146,20,36,0.96)';                        // 锥体（暗血）
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-7, 5.5); ctx.lineTo(-7, -5.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,120,140,0.85)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, 0);         // 中芯亮线：密度感
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,150,160,0.95)'; ctx.lineWidth = 1.4;
      const th = (spin % 4) - 2;                                     // 螺纹沿轴前移，转起来（收在锥体内部，不出缘）
      ctx.beginPath();
      ctx.moveTo(-1 + th, 3.4); ctx.lineTo(3 + th, 0.8);             // 螺纹一
      ctx.moveTo(-5 + th, 2.8); ctx.lineTo(-1 + th, 0.5);            // 螺纹二
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,225,225,0.95)';                      // 钻尖一点亮，指明杀伤方向
      ctx.beginPath(); ctx.arc(14.5, 0, 1.6, 0, 6.28); ctx.fill();
      ctx.restore();
    } else if (vfx === 'seal') {
      // 禁神术：原著「施下禁神术」「禁制扣住神识」—— 是一道符禁，不是一颗金珠。
      // 弹体画成竖置金符：符身 + 三道横纹（箓纹）+ 四角短须。锁的是神，
      // 所以符外再罩一圈很淡的青白灵光（神识的冷色），金在里、冷在外，别画反。
      vfxTrail(b.x, b.y, ang, 20, 'rgba(255,225,120,0.55)', a0 * 0.5);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang);
      ctx.globalAlpha = a0 * 0.3; ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = a0;
      ctx.fillStyle = '#e8c44a';
      ctx.fillRect(-4.6, -6.2, 9.2, 12.4);                           // 符身
      ctx.strokeStyle = '#7a5a12'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2.8, -3); ctx.lineTo(2.8, -3);
      ctx.moveTo(-2.8, 0); ctx.lineTo(2.8, 0);
      ctx.moveTo(-2.8, 3); ctx.lineTo(2.8, 3);                       // 三道箓纹
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,180,0.9)';
      ctx.fillRect(-1, -8.4, 2, 2.2); ctx.fillRect(-1, 6.2, 2, 2.2); // 上下符头
      ctx.restore();
    } else if (vfx === 'dream') {
      // 梦引术：原著施法时「脸上青气一闪」—— 引梦之气是青的，
      // 不是惊神刺那一门的紫。青魂光 + 更缓的波动（梦是缠上去的，不是扎进去的）
      const pl = 0.5 + 0.5 * Math.sin((G.time || 0) * 5 + (b.phase || 0));
      ctx.fillStyle = `rgba(120,230,200,${0.28 + pl * 0.12})`;
      ctx.beginPath(); ctx.arc(b.x, b.y, 7.5 + pl * 1.5, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(225,255,245,0.9)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, 6.28); ctx.fill();
      vfxTrail(b.x, b.y, ang, 24, 'rgba(120,230,200,0.5)', a0 * 0.5);
    } else if (vfx === 'soul') {
      // 神识类（惊神刺/失神刺/离魂术）：原著里全是无形神念，
      // 没有实体弹道 —— 半透明的紫魂光，核小影淡，像一眼看过去就“进了脑子”
      ctx.fillStyle = 'rgba(190,150,255,0.4)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(232,220,255,0.9)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 2.6, 0, 6.28); ctx.fill();
      vfxTrail(b.x, b.y, ang, 26, 'rgba(190,150,255,0.55)', a0 * 0.55);
    } else {
      drawSpr('sword', b.x, b.y, 1.25, false);
    }
    ctx.globalAlpha = 1;
  }
  // 地上领域：玄冰是一片寒域 + 冰晶，元磁是一圈圈压下去的重力波纹
  function drawField(fd) {
    const p = G.player; if (!p) return;
    const t = (G.time || 0);
    if (fd.vfx === 'magnet') {
      // 元磁神光：克尽天下五行的磁域 —— 灰金重波一圈圈压下去，压得金属发沉
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.55 + i / 3) % 1;
        const r = fd.rad * (0.35 + ph * 0.65);
        ctx.globalAlpha = (1 - ph) * 0.3;
        ctx.strokeStyle = '#e0d49a'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.28); ctx.stroke();
      }
      ctx.globalAlpha = 0.09; ctx.fillStyle = '#8a8050';
      ctx.beginPath(); ctx.arc(p.x, p.y, fd.rad, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (fd.vfx === 'gravity') {
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.6 + i / 3) % 1;
        const r = fd.rad * (0.35 + ph * 0.65);
        ctx.globalAlpha = (1 - ph) * 0.34;
        ctx.strokeStyle = '#b49cff'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.28); ctx.stroke();
      }
      ctx.globalAlpha = 0.1; ctx.fillStyle = '#6a4fd0';
      ctx.beginPath(); ctx.arc(p.x, p.y, fd.rad, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (fd.vfx === 'gold') {
      // 洞漩金光：原著“掌心一团金色涋涡，四周空气一紧”——
      // 一圈圈向内收的金弧 + 中心一颗亮金涡心，读作“在往里吸”
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.globalAlpha = 0.10; ctx.fillStyle = '#ffe98a';
      ctx.beginPath(); ctx.arc(0, 0, fd.rad, 0, 6.28); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.85 + i / 4) % 1;
        const r = fd.rad * (1 - ph * 0.85);
        const a0 = t * 1.6 + i * 1.9;
        ctx.globalAlpha = 0.55 * ph + 0.12;
        ctx.strokeStyle = i % 2 ? '#fff3c0' : '#ffd76a'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(0, 0, r, a0, a0 + 1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r, a0 + 3.14, a0 + 4.34); ctx.stroke();
      }
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff6d0';
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#ffe98a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, fd.rad * 0.98, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1; ctx.restore();
    } else {
      // 冰霜：冷色地盘 + 内圈冷雾，边缘一圈慢慢转的冰晶（不要白边，不然像个气泡）
      // 第102轮 UI 柔化：浅宣纸上这枚 r≈92 的青蓝盘是「圆形法阵」里最实的一块，
      //   退成淡墨软边晕（去彩、alpha 减半、断续细环），常驻范围仍读得出；深底 / 鎏金皮保持冷色。
      // 渐变按半径缓存、并且画在「以玩家为原点」的坐标系里 —— 否则每帧都要新建一个渐变对象
      const soft = SC3_SOFT_RING;
      const key = Math.round(fd.rad) + (soft ? '|soft' : '');
      let grad = vfxGradCache.get(key);
      ctx.save(); ctx.translate(p.x, p.y);
      if (!grad) {
        grad = ctx.createRadialGradient(0, 0, fd.rad * 0.15, 0, 0, fd.rad);
        if (soft) {
          grad.addColorStop(0, 'rgba(74,70,60,0.10)');
          grad.addColorStop(0.72, 'rgba(74,70,60,0.05)');
          grad.addColorStop(1, 'rgba(74,70,60,0)');
        } else {
          grad.addColorStop(0, 'rgba(140,215,255,0.20)');
          grad.addColorStop(0.72, 'rgba(120,200,255,0.10)');
          grad.addColorStop(1, 'rgba(120,200,255,0)');
        }
        vfxGradCache.set(key, grad);
      }
      ctx.globalAlpha = 1; ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, fd.rad, 0, 6.28); ctx.fill();
      if (soft) ctx.setLineDash([6, 8]);
      ctx.globalAlpha = soft ? 0.12 : 0.28;
      ctx.strokeStyle = soft ? 'rgba(74,70,60,0.7)' : '#a8e2ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, fd.rad * 0.97, 0, 6.28); ctx.stroke();
      if (soft) ctx.setLineDash([]);
      for (let i = 0; i < 10; i++) {
        const ang = t * 0.3 + i * (6.28 / 10);
        const rr = fd.rad * (0.55 + ((i * 37) % 40) / 100);
        const rx = Math.cos(ang) * rr;
        const ry = Math.sin(ang) * rr;
        const s = 2.6 + Math.sin(t * 2.2 + i) * 1.2;
        ctx.globalAlpha = (0.55 + Math.sin(t * 2 + i) * 0.25) * (soft ? 0.45 : 1);
        ctx.fillStyle = soft ? 'rgba(74,70,60,0.85)' : '#e2f8ff';
        ctx.beginPath(); ctx.moveTo(rx, ry - s * 1.5); ctx.lineTo(rx + s * 0.62, ry + s * 0.5); ctx.lineTo(rx - s * 0.62, ry + s * 0.5); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  // 环绕物：玄罡是金色罡气团，大庚剑阵是一柄柄青碧短剑
  function drawOrb(o) {
    if (o.vfx === 'swordarray') {
      const ang = (o.ang || 0) + Math.PI / 2;
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(120,240,200,0.95)';
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-6, 3.4); ctx.lineTo(-8, 0); ctx.lineTo(-6, -3.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(240,255,250,0.9)'; ctx.fillRect(-5, -0.9, 13, 1.8);
      ctx.restore();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#8ef0cc'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(o.x, o.y, 9, 0, 6.28); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (o.vfx === 'gold') {
      // 金光罩：原著“金光绕体”，罩体是一层亮金气泡般的护光，不是淡绿的罡气
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#ffe98a';
      ctx.beginPath(); ctx.arc(o.x, o.y, 10, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#fff3c0';
      ctx.beginPath(); ctx.arc(o.x, o.y, 4.4, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ffe98a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(o.x, o.y, 9.5, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (o.vfx === 'shasha') {
      // 煞妖诀：原著是「炼煞气为攻杀」「煞气绕身」—— 黑煞，不是血红。
      // 深黑紫气团 + 暗红细环：黑为主体（煞），红只留一线（妖），比例别画反。
      const pl = 0.5 + 0.5 * Math.sin((G.time || 0) * 7 + (o.i || 0) * 1.7);
      ctx.globalAlpha = 0.5 + pl * 0.2;
      ctx.fillStyle = '#241a2e';
      ctx.beginPath(); ctx.arc(o.x, o.y, 7 + pl * 1.6, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#4a3252';
      ctx.beginPath(); ctx.arc(o.x, o.y, 4, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#8a2438'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(o.x, o.y, 9 + pl, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // 庚金玄罡：金青色的气团，外面一圈细光
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#dfefc0';
      ctx.beginPath(); ctx.arc(o.x, o.y, 6, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.45; ctx.strokeStyle = '#eaf6d0'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(o.x, o.y, 9.5, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // 天雷：自天而降的折线，三层描边（蓝辉 / 冷白 / 亮芯），落点炸一圈
  function drawBolt(pt) {
    const a = Math.max(0, pt.life / pt.maxlife);
    const seg = 8;
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const ny = pt.y0 + (pt.y - pt.y0) * (i / seg);
      const amp = 16 * (1 - Math.pow(i / seg, 2) * 0.35);
      pts.push([pt.x + Math.sin(pt.seed + i * 2.7) * amp, ny]);
    }
    const stroke = (w, col, al) => {
      ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };
    stroke(9, 'rgba(255,200,90,0.55)', 0.4);   // 外围金辉，让雷“亮”出来
    stroke(4.5, '#fff3c8', 0.95);
    stroke(1.8, '#ffffff', 1);
    // 落点一道短光柱（纯色叠加，不建渐变）
    ctx.globalAlpha = a * 0.16; ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(pt.x - 9, pt.y - 46, 18, 52);
    ctx.globalAlpha = a * 0.10;
    ctx.fillRect(pt.x - 15, pt.y - 30, 30, 36);
    ctx.globalAlpha = 1;
  }
  // ---------- 打击特效（零素材，全靠画） ----------
  // 每一门功法的命中颜色不一样：剑气青碧、血魔红、火蛇橙、法术金。
  // 以前所有命中都是白方块，打谁都一样；颜色一分开，不用看飘字也知道是哪门功法打中的。
  const VFX_HIT_COLOR = {
    sword: '#ffffff', qingmang: '#9df0d0', blood: '#ff6a7a',
    snake: '#ffb347', fan: '#ffd05a', gold: '#ffe98a', ice: '#9ad8ff',
    gravity: '#b49cff', gang: '#dfefc0', thunder: '#ffe08a',
    corpsefire: '#7dff9e', soul: '#c9a6ff', magnet: '#e0d49a',
    swordarray: '#9df0d0',
    shasha: '#6a4a78', drill: '#ff8090', seal: '#ffd76a', dream: '#8ae8cc'
  };

  // 火花：沿来向拖一道细线。比方块贵一点（多一次 stroke），
  // 但 3~4px 的方块放大后像撒了一把纸屑，细长火花才像被打出来的火星。
  function spawnSpark(x, y, ang, color, n, spd, spread) {
    const k = n == null ? 3 : n, sd = spread == null ? 1.4 : spread;
    for (let i = 0; i < k; i++) {
      const a = ang + U.rand(-sd / 2, sd / 2);
      const sp = (spd || 170) * U.rand(0.5, 1.3);
      G.parts.push({
        spark: true, x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        len: U.rand(6, 13), w: U.rand(1.1, 2.0),
        life: 0.22, maxlife: 0.22, color: color || '#fff'
      });
    }
  }
  // ang 不传 = 四面炸开；传了 = 沿来向反面溅（打哪儿、从哪边打来，一眼看出来）
  function spawnHit(x, y, c, ang) {
    const col = c || '#fff';
    if (ang == null) spawnSpark(x, y, Math.random() * 6.28, col, 3, 170, 6.28);
    else {
      spawnSpark(x, y, ang + Math.PI, col, 4, 210, 1.5);
      spawnSpark(x, y, ang, col, 2, 110, 1.0);
    }
    // 留两个方块：火花是线，缩小时会先消失，方块补一点碎屑感
    for (let i = 0; i < 2; i++) G.parts.push({ x, y, vx: U.rand(-60, 60), vy: U.rand(-60, 60), life: 0.25, maxlife: 0.25, size: 3, color: col });
  }
  function spawnDeath(x, y) { for (let i = 0; i < 8; i++) G.parts.push({ x, y, vx: U.rand(-90, 90), vy: U.rand(-90, 90), life: 0.4, maxlife: 0.4, size: 4, color: '#c9b27a' }); }

  // 剑光弧：出手那一下在身前拉出一道弯月。
  // 这是画面里唯一"看得见刀刃"的东西 —— 角色只有一张网格，不出这道弧，
  // 玩家根本分不清他刚才是挥了一剑还是站着没动。
  function spawnSlash(x, y, ang, color, rad, arc) {
    G.parts.push({
      slash: true, x, y, ang,
      rad: rad || 21, arc: arc == null ? 1.9 : arc,
      life: 0.2, maxlife: 0.2, color: color || '#eafcff'
    });
  }
  // 起手符文：脚下一圈刻痕，铺在地上（所以要按 0.42 压扁，才像贴地而不是立着的环）
  function spawnRune(x, y, r, color) {
    G.parts.push({ rune: true, x, y, r: r || 24, life: 0.34, maxlife: 0.34, color: color || '#ffe98a' });
  }
  // 击杀碎裂：把精灵切成 3×3 炸开。比撒一把金粉更像"这东西被劈了"，
  // 而且用的就是它自己的样子 —— 不用多画一帧碎尸。
  function spawnShatter(e) {
    if (!e) return;
    // 抓死亡这一帧真正显示的那张图：跑/浮/受击有手绘帧时 tf.frame 指到 spr_run0 之类，
    // 否则回退到 e.spr（程序化切片的怪整图就是 idle 姿态）。不抓当前帧的话，
    // 敌人跑动中死会碎出 idle 站姿，差一两像素一眼假。
    const tf = enemyTf(e);
    const name = (tf && tf.frame && Sprites[tf.frame]) ? tf.frame : e.spr;
    if (!Sprites[name]) return;
    const n = 3, tiles = [];
    for (let i = 0; i < n * n; i++) {
      tiles.push({
        cx: i % n, cy: (i / n) | 0,
        vx: U.rand(-52, 52), vy: U.rand(-92, -16), rot: U.rand(-1.6, 1.6)
      });
    }
    G.parts.push({
      shatter: true, spr: name, x: e.x, y: e.y,
      sc: e.scale || 1, flip: !!e._flip, n, tiles,
      life: 0.4, maxlife: 0.4
    });
  }
  function spawnText(x, y, text, color, size) { G.texts.push({ x, y, vy: -30, life: 0.8, maxlife: 0.8, text: String(text), color, size }); }
  // 重击的「惊艳一刻」：纸面透一层朱砂晕，0.32 秒散尽。
  // 节流 300ms —— 攻速拉起来后几乎每刀都暴击，不节流就成了"一直泛红"，反而不惊艳。
  const elCritFlash = document.getElementById('critFlash');
  let _critFlashAt = 0;
  function flashCritInk() {
    if (!elCritFlash || !save || save.skin !== 'guigu') return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - _critFlashAt < 300) return;
    _critFlashAt = now;
    try {
      elCritFlash.classList.remove('go');
      void elCritFlash.offsetWidth;   // 强制重排，同一段动画才能连着播
      elCritFlash.classList.add('go');
    } catch (e) {}
  }
  // 进图仪式：宣纸从上往下展开，铺满即化开（0.66s）。原来是硬切，没有"翻开一页"的感觉。
  const elScrollOpen = document.getElementById('scrollOpen');
  let _scrollAt = 0;
  function openScroll() {
    if (!elScrollOpen || !save) return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - _scrollAt < 400) return;   // 连点两个图时不要叠成两层纸
    _scrollAt = now;
    try {
      elScrollOpen.classList.remove('play');
      void elScrollOpen.offsetWidth;
      elScrollOpen.classList.add('play');
    } catch (e) {}
  }
  function updateParts(dt) {
    if (window.FX3) FX3.update(dt);   // pixelfx 特效推进（顿帧里也跟着冻，手感才一致）
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i]; p.life -= dt;
      if (p.life <= 0) { G.parts.splice(i, 1); continue; }
      // ring / bolt / ray / slash / rune / shatter 是纯视觉特效：不走物理位移
      //（否则 bolt 会被当成粒子加速，y 变 NaN；碎裂自带弹道，也不能再吃一次重力）
      if (!p.ring && !p.bolt && !p.ray && !p.slash && !p.rune && !p.shatter && !p.web) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; }
    }
    for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y += t.vy * dt; if (t.life <= 0) G.texts.splice(i, 1); }
  }

  // ---------- 装饰（按地图换底色与景物构成） ----------
  const CH = 240;
  const DEFAULT_DECOR = [['tree', 0.18], ['rock', 0.16], ['tuft', 0.26]];
  function genChunk(cx, cy) {
    let seed = ((cx * 73856093) ^ (cy * 19349663)) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967295; };
    const sc3 = ensureScenery3();
    const co = (sc3.on && sc3.composition) ? sc3.composition : null;
    if (co) {
      // ---- 构图化：连通聚落 + 大片留白（不是逐格独立随机撒点）----
      // 低频连续相位判「聚落成片」：同族装饰按连通区域一致化，跟 Wang 集里
      // 「不逐格随机选变体」是同一条纪律。clusters 调频率，breath 调阈值与组内数量。
      const f = 0.55 + co.clusters * 0.18;
      const ph = sc3.phase;
      const v = Math.sin(cx * f + ph * 6.2832) * Math.cos(cy * f * 0.74 + ph * 3.1416)
              + 0.35 * Math.sin((cx + cy) * f * 0.45 + ph * 9.4248);
      const thr = [-0.10, 0.20, 0.45][co.breath - 1];
      if (v <= thr) return;                       // 留白 chunk：一个装饰都不放
      const n = [5, 4, 3][co.breath - 1];
      const pal = co.palette;
      const kind = pal[(seed >>> 5) % pal.length];  // 组内同种成丛，不混搭 6 种笔法
      const ox = cx * CH + CH * (0.28 + rnd() * 0.44);
      const oy = cy * CH + CH * (0.28 + rnd() * 0.44);
      for (let i = 0; i < n; i++) {
        const ang = rnd() * 6.2832, r = rnd() * CH * 0.20;
        // 同组内大小、浓淡错落（水墨的「浓淡干湿」）；a 为 alpha 系数，未收录图无此字段故逐字节不变
        G.decor.push({ type: kind, x: ox + Math.cos(ang) * r, y: oy + Math.sin(ang) * r,
                       s: 0.6 + rnd() * 0.8, a: 0.5 + rnd() * 0.5 });
      }
      return;
    }
    // ---- 原逻辑：未收录图（当前 102 张，全属灵界篇；随台账逐批追加递减）/ 构图缺失降级，逐字节保持批次3 口径 ----
    const scheme = (sc3.on && sc3.decor) ? sc3.decor : ((G.map && G.map.decorScheme) || DEFAULT_DECOR);
    for (let i = 0; i < 6; i++) {
      const x = cx * CH + rnd() * CH, y = cy * CH + rnd() * CH, t = rnd();
      let acc = 0, type = null;
      for (let k = 0; k < scheme.length; k++) { acc += scheme[k][1]; if (t < acc) { type = scheme[k][0]; break; } }
      if (!type) continue;
      G.decor.push({ type, x, y, s: type === 'tuft' ? 1 : 0.8 + rnd() * 0.6 });
    }
  }
  function ensureDecor() {
    const cx0 = Math.floor(G.cam.x / CH) - 1, cx1 = Math.floor((G.cam.x + W) / CH) + 1;
    const cy0 = Math.floor(G.cam.y / CH) - 1, cy1 = Math.floor((G.cam.y + H) / CH) + 1;
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const k = cx + '_' + cy;
      if (!G.chunkMap[k]) { G.chunkMap[k] = true; genChunk(cx, cy); }
    }
    if (G.decor.length > 900) {
      G.decor = G.decor.filter(d => d.x > G.cam.x - 200 && d.x < G.cam.x + W + 200 && d.y > G.cam.y - 200 && d.y < G.cam.y + H + 200);
      for (const k in G.chunkMap) { const a = k.split('_'); if (+a[0] < cx0 - 2 || +a[0] > cx1 + 2 || +a[1] < cy0 - 2 || +a[1] > cy1 + 2) delete G.chunkMap[k]; }
    }
  }

  // ==========================================================================
  // 结算小舞台：结算界面左下角那块空白，两人的角色可以在里头自由走动，
  // 聊天里丢出去的表情会飘到自己 / 队友的头顶。位置走数据通道同步。
  // ==========================================================================
  const STAGE = { x0: 26, x1: 188, y0: 604, y1: 836 };   // 画布坐标（480×864），聊天栏在右下角，这块正好空着
  const STAGE_SPD = 118;
  function settleInit() {
    G.settle = {
      x: (STAGE.x0 + STAGE.x1) / 2 - 26, y: (STAGE.y0 + STAGE.y1) / 2, d: 1,
      mx: (STAGE.x0 + STAGE.x1) / 2 + 26, my: (STAGE.y0 + STAGE.y1) / 2, md: -1, mShown: false,
      myBub: [], mateBub: [], acc: 0
    };
  }
  function updateSettle(dt) {
    const s = G.settle; if (!s) return;
    // 用和战斗同一套输入（WASD / 摇杆），结算态也认
    let dx = 0, dy = 0;
    if (keys.left) dx--; if (keys.right) dx++; if (keys.up) dy--; if (keys.down) dy++;
    if (jx !== 0 || jy !== 0) { dx = jx; dy = jy; }
    const len = Math.hypot(dx, dy);
    if (len > 0.001) {
      s.x += (dx / len) * STAGE_SPD * dt;
      s.y += (dy / len) * STAGE_SPD * dt;
      if (dx !== 0) s.d = dx > 0 ? 1 : -1;
      s.x = U.clamp(s.x, STAGE.x0, STAGE.x1);
      s.y = U.clamp(s.y, STAGE.y0, STAGE.y1);
    }
    // 头顶表情倒计时
    for (const arr of [s.myBub, s.mateBub]) {
      for (let i = arr.length - 1; i >= 0; i--) { arr[i].t -= dt; if (arr[i].t <= 0) arr.splice(i, 1); }
    }
    // 位置同步（低频即可，反正是走动不是战斗）
    s.acc += dt * 1000;
    if (s.acc >= 90) {
      s.acc = 0;
      if (window.Coop && window.Coop.sendStage) window.Coop.sendStage(Math.round(s.x), Math.round(s.y), s.d);
    }
  }
  // 表情飘到头顶：side = 'me' 自己 / 'mate' 队友
  function settleBubble(side, emo) {
    const s = G.settle; if (!s || !emo) return false;
    const arr = side === 'me' ? s.myBub : s.mateBub;
    arr.push({ emo: String(emo), t: 2.8, max: 2.8 });
    if (arr.length > 4) arr.shift();
    return true;
  }
  // 队友走动的镜像位置
  function settleMate(x, y, d) {
    const s = G.settle; if (!s) return false;
    s.mx = x; s.my = y; if (d) s.md = d < 0 ? -1 : 1; s.mShown = true;
    return true;
  }
  function drawSettleStage() {
    const s = G.settle; if (!s) return;
    ctx.save();
    ctx.setTransform(PR, 0, 0, PR, 0, 0);
    // 台面：一圈淡光，暗示「这块可以走动」
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse((STAGE.x0 + STAGE.x1) / 2, (STAGE.y0 + STAGE.y1) / 2,
      (STAGE.x1 - STAGE.x0) / 2 + 6, (STAGE.y1 - STAGE.y0) / 2 - 8, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,74,0.22)'; ctx.lineWidth = 1;
    ctx.stroke();
    // 队友（先画，自己的压在上层）
    if (s.mShown) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(s.mx, s.my + 8, 9, 4, 0, 0, 6.28); ctx.fill();
      drawSpr('hanli', s.mx, s.my, 1.7, s.md < 0);
      ctx.fillStyle = 'rgba(150,220,255,0.85)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('道友', s.mx, s.my + 22);
      drawBubbles(s.mateBub, s.mx, s.my);
    }
    // 自己
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 8, 9, 4, 0, 0, 6.28); ctx.fill();
    drawSpr('hanli', s.x, s.y, 1.7, s.d < 0);
    ctx.fillStyle = 'rgba(255,233,168,0.9)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('我', s.x, s.y + 22);
    drawBubbles(s.myBub, s.x, s.y);
    ctx.restore();
  }
  function drawBubbles(arr, x, y) {
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      const k = b.t / b.max;                       // 快消失时淡出
      const rise = (1 - k) * 16;                   // 缓缓上飘
      ctx.globalAlpha = Math.min(1, k * 2.2);
      ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(b.emo, x + (i - (arr.length - 1) / 2) * 15, y - 26 - rise);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 通用对话 ----------
  function showLines(lines, onEnd, id) {
    if (!lines || !lines.length) { if (onEnd) onEnd(); return; }
    G.state = 'dialog';
    G.dialogLines = lines; G.dialogIdx = 0; G.dialogEnd = onEnd || null; G.dialogId = id || null;
    G.dialogSynced = false;
    showDialog(lines[0]);
    // 联机：房主起了对话就广播出去，客机镜像同一段对话（含后续逐句推进）
    // 带上 id —— 客机要靠它把触发源（定时剧情 / 际遇）标记为已消费，
    // 否则客机本地的 checkStory 会凭「时间已到 + done 仍为 false」把同一段对话再弹一遍。
    if (window.Coop && window.Coop.sendDlg) window.Coop.sendDlg({ on: 1, lines: lines, i: 0, id: id || null });
  }
  function showDialog(line) {
    elDialogSpeaker.textContent = line[0];
    elDialogText.textContent = line[1];
    // 说话人有登记就出小像（旁白/路人不出）。drawFace 的元素引用在文件后段声明，
    // 这里用 try 兜住「初始化早期就被调用」的极端情况。
    try { drawFace(line[0]); } catch (e) { }
    elDialog.style.display = 'flex';
    Sfx.dialog(line[0]);
  }
  function advanceDialog() {
    const lines = G.dialogLines; if (!lines) return;
    if (G.dialogIsChoice) return;   // 抉择未选前，点击不推进剧情
    G.dialogIdx++;
    if (G.dialogIdx >= lines.length) {
      elDialog.style.display = 'none';
      const f = G.dialogEnd, meta = G.dialogMeta;
      // 客机先点掉的是「房主镜像过来的对话」→ 场上静止，等房主点完再恢复
      const waitedHost = !!G.dialogSynced;
      G.dialogEnd = null; G.dialogLines = null; G.dialogMeta = null; G.dialogSynced = false;
      // 联机（房主）：对话走完 → 通知客机收摊恢复战斗
      if (window.Coop && window.Coop.sendDlg && !waitedHost) window.Coop.sendDlg({ off: 1 });
      if (f) f(meta); else { G.state = 'play'; last = performance.now(); }
      if (waitedHost) G.coopFrozen = true;   // 怪物 / 功法特效 / 掉落一律静止
    } else {
      showDialog(lines[G.dialogIdx]);
      // 联机（房主）：推进到第几句 → 客机同步跳到同一句
      if (window.Coop && window.Coop.sendDlg) window.Coop.sendDlg({ i: G.dialogIdx });
    }
  }
  // 抉择：在对话界面弹两个按钮，让玩家自己选（不替玩家做主）。
  // 仅在单人/房主出现；共斗客机的收尾对白会被 startOutro 提前拦截、直接走 finishMap。
  function showChoice(prompt, options, onPick) {
    if (!elDialog || !elDialogText) { if (onPick) onPick(options[0] ? options[0].v : null); return; }
    G.state = 'dialog';
    G.dialogIsChoice = true;
    G.dialogChoiceCb = onPick;
    G.dialogChoiceOpts = options;
    elDialogSpeaker.textContent = '抉择';
    elDialogText.textContent = prompt;
    try { drawFace(null); } catch (e) { }   // 抉择不是人，撤掉小像
    let row = document.getElementById('dialogChoices');
    if (!row) {
      row = document.createElement('div');
      row.id = 'dialogChoices';
      elDialog.appendChild(row);
    }
    row.style.cssText = 'margin-top:14px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap';
    row.innerHTML = '';
    for (const o of options) {
      const b = document.createElement('button');
      b.className = 'btn small';
      b.textContent = o.t;
      b.addEventListener('click', (e) => { e.stopPropagation(); pickChoice(o.v); });
      row.appendChild(b);
    }
    elDialog.style.display = 'flex';
    Sfx.dialog('抉择');
  }
  function pickChoice(v) {
    if (!G.dialogIsChoice || !G.dialogChoiceCb) return false;
    const cb = G.dialogChoiceCb;
    G.dialogIsChoice = false; G.dialogChoiceCb = null; G.dialogChoiceOpts = null;
    const row = document.getElementById('dialogChoices');
    if (row && row.parentNode) row.parentNode.removeChild(row);
    if (elDialog) elDialog.style.display = 'none';
    cb(v);
    return true;
  }

  // 客机镜像了房主的对话 → 把它的触发源一并消费掉。
  // 不这么做的话：房主点完发 off，客机解冻回到战斗，本地 checkStory 一看
  // 「时间早过了、s.done 还是 false」→ 立刻又把刚才那整段对话重新弹一遍，
  // 逼客机再点一次才恢复战斗 —— 这正是之前那个「对话重复弹出」的根因。
  function consumeDialogSource(id) {
    if (!id) return;
    if (window.STORY) {
      const s = window.STORY.find(x => x.id === id);
      if (s) {
        s.done = true;
        if ((save.seen || []).indexOf(id) < 0) { Array.isArray(save.seen) ? save.seen.push(id) : (save.seen = [id]); }
      }
    }
    // 际遇对白：同样按「已遇过」记账，免得客机走过去又触发一次
    if (id.indexOf('enc:') === 0) {
      const eid = id.slice(4);
      if (eid && (save.met || []).indexOf(eid) < 0) { Array.isArray(save.met) ? save.met.push(eid) : (save.met = [eid]); }
      if (window.ENCOUNTERS) { const d = window.ENCOUNTERS.find(x => x.id === eid); if (d) d._consumed = true; }
    }
    writeSave();
  }

  // 队友接了际遇，随机分过来的那一份：本地入袋（道具 / 材料），支线图同步解锁
  function grantEncShare(p) {
    if (!p) return;
    if (p.mats) for (const mm of p.mats) {
      const it = Items.get(mm[0]);
      if (it) for (let k = 0; k < mm[1]; k++) addToBag(it, { silent: true });
    }
    if (p.items) for (const id of p.items) {
      const it = Items.get(id);
      if (it) applyItem(it, { noRun: true });
    }
    if (p.unlock) {
      const sm = MAPS.find(m => m.id === p.unlock);
      if (sm && (save.unlocked || []).indexOf(sm.id) < 0) {
        save.unlocked.push(sm.id);
        banner('队友开了支线 · ' + sm.name);
      }
    }
    writeSave();
  }

  // 联机（客机）：房主那边的对话走到第 i 句 / 收摊
  function coopApplyDlg(data) {
    if (!data) return;
    if (data.off) {
      if (G.dialogLines) { elDialog.style.display = 'none'; G.dialogEnd = null; G.dialogLines = null; }
      G.coopFrozen = false;                 // 解冻：立刻恢复刚才的战斗状态
      if (G.state !== 'play' && G.state !== 'down') G.state = 'play';
      last = performance.now();
      return;
    }
    if (data.on && Array.isArray(data.lines) && data.lines.length) {
      G.state = 'dialog';
      G.dialogLines = data.lines; G.dialogIdx = 0; G.dialogEnd = null; G.dialogSynced = true;
      consumeDialogSource(data.id);      // 关键：把触发源标记为已消费，防本地再把同一段弹出来
      showDialog(data.lines[0]);
      return;
    }
    if (data.i != null && G.dialogLines) {
      G.dialogIdx = data.i;
      if (G.dialogIdx >= G.dialogLines.length) {
        // 房主点完了，客机这边也收摊（但仍等 off 才解冻，避免抢跑）
        elDialog.style.display = 'none'; G.dialogEnd = null; G.dialogLines = null;
        G.state = 'play'; G.coopFrozen = true;      // 场上静止，等房主
        last = performance.now();
      } else showDialog(G.dialogLines[G.dialogIdx]);
    }
  }

  // ---------- 剧情只演一次 ----------
  // 剧情是「经历」，不是地图附件：同一张图刷第二遍时，开场过场、剧情图整场、
  // 收场台词都不该再念一遍；古传送阵那种必跌境界的更是只能发生一次。
  // 记法统一落在 save.seen（跨局、跨读档都在）：
  //   战斗内定时剧情 → 原始节点 id（历史存档已经在用这个字段，保持兼容）
  //   地图开场过场   → 'intro:<图id>'
  //   剧情图整场     → 'scene:<剧情键>'（破境图的 _lock 变体单独记账）
  //   收场台词       → 'outro:<收场键>'
  // 只在「真的演完」时记账：看到一半退出、关页面都不算 —— 剧情不能因为意外而丢。
  function storySeen(key) {
    return !!key && Array.isArray(save.seen) && save.seen.indexOf(key) >= 0;
  }
  function storyMarkSeen(key) {
    if (!key) return;
    if (!Array.isArray(save.seen)) save.seen = [];
    if (save.seen.indexOf(key) < 0) { save.seen.push(key); writeSave(); }
  }

  // ---------- 战斗内定时剧情 ----------
  function checkStory() {
    if (!G.map || G.storyMute) return;   // 调试/体检时可静音剧情对白
    for (const s of STORY) {
      if (s.map !== G.mapId) continue;
      if (s.done) continue;
      if (storySeen(s.id)) continue;   // 这一世已经演过：重刷同图不再重播，奖励也不再重复给
      if (s.t != null && G.time >= s.t) {
        s.done = true;
        showLines(s.lines, () => {
          storyMarkSeen(s.id);
          applyStoryReward(s);
          G.state = 'play'; last = performance.now();
          G.coopRole = (window.Net && window.Net.self() && window.Net.isHost()) ? 'host' : (window.Net && window.Net.self() ? 'client' : null);
        }, s.id);
        return;
      }
    }
  }
  function applyStoryReward(s) {
    const p = G.player;
    if (!p) return;
    if (s.reward === 'sword') {
      const sw = SKILLS.find(x => x.id === 'sword');
      p.skills.sword = Math.min(sw.max, (p.skills.sword || 0) + 1);
      banner('习得 眨眼剑法 +1'); Sfx.buff();
    } else if (s.reward === 'herbs') {
      for (let i = 0; i < 3; i++) dropHerb(p.x + U.rand(-30, 30), p.y + U.rand(-30, 30));
      for (let i = 0; i < 6; i++) G.gems.push({ x: p.x + U.rand(-40, 40), y: p.y + U.rand(-40, 40), r: 5, val: 2 });
    } else if (s.reward === 'stones') {
      dropStone(p.x + U.rand(-40, 40), p.y + U.rand(-40, 40), 6);
    } else if (s.reward === 'heal') {
      p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.4);
      dropStone(p.x + U.rand(-30, 30), p.y + U.rand(-30, 30), 4);
      spawnText(p.x, p.y - 24, '气血回流', '#7dff7d', 14);
    }
  }

  // ---------- 际遇：随机遇到人与事，走近触碰即开口 ----------
  // 触发条件之外，只有「正确的人或事」才会把支线地图推到修行图上。
  const ENC_GAP = 15;
  function encListOnMap() { return encountersOf(G.mapId); }
  function encCondOk(e) {
    const c = e.cond || {};
    if (c.level && curLevel() < c.level) return false;
    if (c.cleared) for (const id of c.cleared) if (save.cleared.indexOf(id) < 0) return false;
    if (c.notCleared) for (const id of c.notCleared) if (save.cleared.indexOf(id) >= 0) return false;
    if (!e.repeat && (save.met || []).indexOf(e.id) >= 0) return false;
    if (G.npcs.some(x => x.def.id === e.id)) return false;
    return true;
  }
  // 坊市 / 洞府这类「走不动」的地方：把本图的际遇做成菜单按钮，
  // 有就显示、点进去就演，没有就整个隐藏（见 renderShop / renderCaveRest）
  // 这里不查「场上是否已有 NPC」——坊市刷出的人走不近，按钮得照样给
  function encCondOkNoNpc(e) {
    const c = e.cond || {};
    if (c.level && curLevel() < c.level) return false;
    if (c.cleared) for (const id of c.cleared) if (save.cleared.indexOf(id) < 0) return false;
    if (c.notCleared) for (const id of c.notCleared) if (save.cleared.indexOf(id) >= 0) return false;
    if (!e.repeat && (save.met || []).indexOf(e.id) >= 0) return false;
    return true;
  }
  function pendingEncOf(mapId) {
    if (!mapId) return null;
    const list = (window.encountersOf ? window.encountersOf(mapId) : []).filter(encCondOkNoNpc);
    return list[0] || null;
  }
  function menuEncounter(def) {
    if (!def) return false;
    if (!encCondOk(def)) { notify('此事已了'); return false; }
    const back = (G.state === 'shop') ? 'shop' : (G.state === 'cave' ? 'cave' : 'play');
    G.state = 'dialog';
    showLines(def.lines, () => {
      meetEncounter(def);
      G.state = back;
      if (back === 'shop') renderShop();
      else if (back === 'cave') renderCave();
      last = performance.now();
    }, 'enc:' + def.id);
    Sfx.dialog(def.name);
    return true;
  }
  function pickEncounter() {    const pool = encListOnMap().filter(encCondOk);
    if (!pool.length) return null;
    const opens = pool.filter(e => e.unlock && save.unlocked.indexOf(e.unlock) < 0);
    if (opens.length) return U.pick(opens);
    return U.pick(pool);
  }
  function spawnEncounter(def) {
    const p = G.player;
    if (!p || !def) return null;
    const a = Math.random() * 6.283;
    const d = U.rand(230, 360);
    const npc = {
      def: def, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d,
      r: 13, t: 0, bob: Math.random() * 6.28, done: false
    };
    G.npcs.push(npc);
    if (!G.storyMute) { banner('际遇 · ' + def.name); Sfx.warn(); }
    return npc;
  }
  function updateEncounters(dt) {
    const p = G.player;
    if (!p) return;
    for (const npc of G.npcs) {
      npc.t += dt; npc.bob += dt * 2.2;
      if (npc.retryT > 0) npc.retryT -= dt;   // 客机被支线挡下后的间隔，别一直弹提示
    }
    if (G.vacuumT > 0 || G.pendingEnding) return;
    // 触碰即开口
    for (let i = 0; i < G.npcs.length; i++) {
      const npc = G.npcs[i];
      if (npc.retryT > 0) continue;
      if (U.dist(p.x, p.y, npc.x, npc.y) < npc.r + p.r + 9) { talkEncounter(npc); return; }
    }
    if (G.storyMute) return;
    if (G.npcs.length >= 2) return;
    G.encT -= dt;
    if (G.encT > 0) return;
    const def = pickEncounter();
    if (def) { spawnEncounter(def); G.encT = ENC_GAP + Math.random() * 7; }
    else G.encT = 9;
  }
  function talkEncounter(npc) {
    if (!npc || npc.done) return;
    const def = npc.def;
    G._encGuard = { id: def && def.id, unlock: def && def.unlock, role: G.coopRole, shared: !!G.coopShared, sig: window.Net && window.Net.isHost ? !!window.Net.isHost() : null };
    // 联机：开支线的际遇只有房主接得下（支线归属以房主为准），客机走近只给个提示，
    // 际遇原样留着给房主，不消耗。
    if (def && def.unlock && G.coopRole === 'client' && G.coopShared) {
      npc.retryT = 2.5;
      banner('此支线须由房主接取'); Sfx.warn();
      return;
    }
    npc.done = true;
    const i = G.npcs.indexOf(npc);
    if (i >= 0) G.npcs.splice(i, 1);
    G.state = 'dialog';
    showLines(def.lines, () => {
      meetEncounter(def);
      G.state = 'play'; last = performance.now();
    G.coopRole = (window.Net && window.Net.self() && window.Net.isHost()) ? 'host' : (window.Net && window.Net.self() ? 'client' : null);
    }, 'enc:' + def.id);
    Sfx.dialog(def.name);
  }
  function meetEncounter(def) {
    if (!def) return;
    if (!def.repeat) {
      save.met = save.met || [];
      if (save.met.indexOf(def.id) < 0) save.met.push(def.id);
    }
    const rw = def.reward || {};
    const p = G.player;
    if (rw.stones) {
      save.stones = (save.stones || 0) + rw.stones;
      if (p) spawnText(p.x, p.y - 32, '+' + rw.stones + ' 灵石', '#ffd24a', 13);
    }
    if (rw.heal && p) {
      p.hp = Math.min(p.maxhp, p.hp + p.maxhp * rw.heal);
      spawnText(p.x, p.y - 26, '气血回流', '#7dff7d', 13);
    }
    // 联机：际遇所得道具随机分给两个人（谁接的都一样，一人一半随机，
    // 分给队友的那份发过去由他入袋），避免"谁碰到谁全拿"
    const sharing = !!(window.Coop && window.Coop.sendEncShare && !!(G.coopRole === 'host' || G.coopRole === 'client') && G.coopShared);
    const split = list => {
      if (!sharing) return { mine: list, theirs: [] };
      const mine = [], theirs = [];
      for (const one of list) (Math.random() < 0.5 ? theirs : mine).push(one);
      return { mine: mine, theirs: theirs };
    };
    // 材料要按「数量」拆，不能按条目整份给一个人 ——
    // 否则 reward 写成 [['某某', 20]] 时 20 份全归一方，看着跟没分一样。
    const splitMats = list => {
      if (!sharing) return { mine: list, theirs: [] };
      const mine = [], theirs = [];
      for (const mm of list) {
        const n = mm[1] | 0;
        if (n >= 2) {
          const a = Math.max(1, Math.min(n - 1, Math.round(n * (0.35 + Math.random() * 0.3))));
          mine.push([mm[0], a]); theirs.push([mm[0], n - a]);
        } else {
          (Math.random() < 0.5 ? theirs : mine).push([mm[0], n || 1]);
        }
      }
      return { mine: mine, theirs: theirs };
    };
    if (rw.mats) {
      const s = splitMats(rw.mats);
      for (const mm of s.mine) {
        const it = Items.get(mm[0]);
        if (it) for (let k = 0; k < mm[1]; k++) addToBag(it, { silent: true });
      }
      if (s.theirs.length) window.Coop.sendEncShare({ mats: s.theirs });
    }
    if (rw.items) {
      const s = split(rw.items);
      for (const id of s.mine) {
        const it = Items.get(id);
        if (!it) continue;
        if (isGatePill(it.id)) addToBag(it, { silent: true });   // 破境丹药只收着，不当场吃
        else applyItem(it, { noRun: true });
      }
      if (s.theirs.length) window.Coop.sendEncShare({ items: s.theirs });
    }
    // 开图
    let opened = null;
    if (def.unlock) {
      const sm = MAPS.find(m => m.id === def.unlock);
      if (sm && save.unlocked.indexOf(sm.id) < 0) { save.unlocked.push(sm.id); opened = sm; }
      // 支线只由房主接，但开了的图要同步给队友，否则两个人没法一起去打
      if (opened && sharing && window.Coop.sendEncShare) window.Coop.sendEncShare({ unlock: sm.id });
    }
    writeSave();
    if (opened) {
      Sfx.buff();
      banner('支线已开 · ' + opened.name);
      // 横幅与右上的拾取提示会撞在同一个高度，错开一拍再弹
      setTimeout(() => {
        itemToast({ id: 'sideopen_' + opened.id, name: '支线 · ' + opened.name, rarity: 3 });
      }, 2400);
    } else if (rw.stones || rw.mats) Sfx.gem();
    renderWorldMap();
  }

  // ---------- 境界（炼气一至十三层，每层都有实感提升） ----------
  function checkRealm(silent) {
    const p = G.player; if (!p) return null;
    let fired = null;
    for (let i = G.realmIdx; i < REALM_LAYERS.length; i++) {
      const r = REALM_LAYERS[i];
      if (p.level < r.lv) break;
      G.realmIdx = i + 1;
      applyRealm(r, silent);
      fired = r;
    }
    if (fired) syncCultivate();
    return fired;
  }
  function applyRealm(r, silent) {
    const p = G.player;
    // 跨大境界（筑基 / 结丹 / 元婴 / 化神）：旧功法自动卸下，只留一门主力。
    // 想戴回来的，去洞府自己动手 —— 身上同时运得了几门，看境界。
    if (/筑基|结丹|元婴|化神/.test(r.name || '')) {
      const kept = trimSkillsToMain();
      const d = kept.length && window.skillById ? window.skillById(kept[0]) : null;
      if (!silent && d) setTimeout(function () { notify('旧功法已卸 · 只留 ' + d.name); }, 1200);
    }
    G.realmHp = (G.realmHp || 0) + r.hp;
    G.realm.dmg += r.dmg; G.realm.atk += r.atk; G.realm.spd += r.spd;
    recalcMaxhp();
    p.hp = Math.min(p.maxhp, p.hp + r.hp + p.maxhp * 0.16);

    if (!silent) {
      // 突破冲击波：清身周小怪 + 震退
      const rad = 220 + r.lv * 4;
      G.parts.push({ ring: true, x: p.x, y: p.y, r: 8, maxr: rad, life: 0.6, maxlife: 0.6, color: '#ffe98a' });
      G.parts.push({ ring: true, x: p.x, y: p.y, r: 8, maxr: rad * 0.66, life: 0.44, maxlife: 0.44, color: '#fff6c8' });
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * 6.28;
        G.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, maxlife: 0.5, size: 4, color: '#ffe98a' });
      }
      for (const e of allEnemies()) {
        if (U.dist(p.x, p.y, e.x, e.y) < rad) {
          damageEnemy(e, (10 + r.lv * 6) * dmgMul());
          if (!e._dead && e !== G.boss) knock(e, p.x, p.y, 280);
        }
      }
      G.flash = Math.max(G.flash, 0.55); G.shake = 11; G.hitStop = Math.max(G.hitStop, 0.05);
      Sfx.levelup();
    }

    let text = '境界进阶 · ' + r.name;
    if (r.skill) {
      const s = SKILLS.find(x => x.id === r.skill);
      if (s) {
        p.skills[s.id] = Math.min(s.max, (p.skills[s.id] || 0) + 1);
        text += '　得授 ' + s.name;
        if (s.id === 'sword' && !silent) bumpSwordPick(false);
        if (!silent) Sfx.buff();
      }
    } else if (r.note) text += '　' + r.note;
    if (!silent) banner(text);
  }
  // 收尾阶段静默升级（避免打断 Boss 战后的收取演出）
  function autoLevelUp() {
    const p = G.player;
    while (p.xp >= p.next) {
      p.xp -= p.next; p.level++;
      p.next = xpNeed(p.level);
      checkRealm();
    }
  }

  // ---------- 升级三选一 ----------
  // ==================== 煞气 · 顿悟 · 祭炼（3 分钟单局循环） ====================
  // 单局里的成长不再只靠升级：煞气攒满就弹一次三选一，选完立刻变强；
  // 灵石可以当场祭炼，把某门功法再推一档。出图/重开即清空，下一局重新滚雪球。
  const SHA_NEED = 120;
  const REFINE_COST = [3, 5, 8, 12, 18];
  const TIER_WORDS = ['小成', '大成', '圆满'];
  const INSIGHT_SAY = [
    '灵力由散入凝，始有脉络可循。', '丹田如潭，静水流深。', '气行一周天，骨缝里都是凉的。',
    '神识外放数十丈，虫蚁动静皆知。', '法力覆体，凡铁难伤。', '心念一动，法与身合。',
    '周天运转，浊气自去。', '闭目即见山河，睁眼仍是洞府。', '灵气如潮，一浪比一浪高。',
    '经脉里跑的不是血，是光。', '念头起处，符已成。', '手中无剑，心里有剑。',
    '天地有隙，法力可乘。', '打坐三年，不如一场生死。', '杀意收得住，才算入了门。',
    '越往上走，路越窄，也越静。', '一身修为，抵不过一句「再来」。', '境界是墙，悟性是门。',
    '灵气入体，化作星屑。', '不争一时，只争那一线。', '这道坎，早晚要自己迈。',
    '若无今日之苦，何来他年之远。', '心静则气顺，气顺则法成。', '一息尚存，便未到头。'
  ];
  // 段位：炼气期照旧「炼气X层」；筑基以上换成「境界·小成/大成/圆满」
  function stageLabel(p) {
    if (!p) return '';
    const base = realmName(p.level);
    if (p.level < 36) return base;
    const ratio = p.next > 0 ? U.clamp(p.xp / p.next, 0, 1) : 0;
    return base + '·' + TIER_WORDS[Math.min(2, Math.floor(ratio * 3))];
  }
  function shaSt() {
    if (!G.sha) G.sha = { v: 0, need: SHA_NEED, dmgT: 0, x2T: 0, sayT: 26 };
    return G.sha;
  }
  function insSt() {
    if (!G.insight) G.insight = { skills: {}, n: 0, refine: 0 };
    return G.insight;
  }
  // 每局开始时把上一局的顿悟与祭炼清干净
  function resetRunBuffs() {
    G.sha = { v: 0, need: SHA_NEED, dmgT: 0, x2T: 0, sayT: 24 + Math.random() * 12 };
    G.insight = { skills: {}, n: 0, refine: 0 };
    G.summon = null;
    G.dashCd = 0;
  }
  // 每顿悟一次，下一次门槛抬 6%：抬太多的话清怪慢的图一局撑不到 9 次
  // （120 → 127 → 135 → 143 → 151…，第 9 次约需 1380 点，一局正好在 9~13 次之间）
  const SHA_GROW = 1.06;
  // 灵气自然汇聚：站着也在攒（每秒 5 点）。这一条是「每张战图至少 9 次顿悟」的保底 ——
  // 只靠击杀的话，清怪慢的图会卡在 5~6 次
  const SHA_DRIP = 5;
  // boss 型剧情战（单挑）没有小怪可刷，一局只有 40~60 秒：
  // 改用「打掉的气血」换煞气，一场打完约 1200 点，照样够 9 次
  const SHA_BOSS_DUEL = 250;
  const SHA_DRIP_BOSS = 2;
  function ownSkills() { return SKILLS.filter(s => (G.player.skills[s.id] || 0) > 0); }
  function newSkills() { return SKILLS.filter(s => !(G.player.skills[s.id] || 0) && (!s.minLv || G.player.level >= s.minLv)); }

  // 顿悟抽卡：A 技能升级 45% / B 新神通 20% / C 被动 20% / D 灵石 8% / E 特殊 7%
  // 旧配比是 40/25/20/10/5，但实测截到的卡里近一半是「灵石 +30」「移速 +10%」这类
  // 与「打得更狠」无关的东西 —— 玩家停下来选一张，选完屏幕上什么都没变。
  // 现在把 A 提到 45%、灵石压到 8%，并且 A 内部按「看得见程度」加权（见 w）。
  const SKILL_MODS = [
    { k: 'count', v: 1, name: '多打一发', w: 3 },     // 唯一一眼看得见的成长：出手变多
    { k: 'dmg', v: 0.30, name: '伤害 +30%', w: 3 },   // 飘字变大，也算看得见
    { k: 'cd', v: 0.25, name: '攻速 +25%', w: 2 },    // 出手术肉眼可感
    { k: 'range', v: 0.30, name: '范围 +30%', w: 1 }, // 锁敌变远，画面上不明显，降权
    { k: 'dur', v: 0.50, name: '持续 +50%', w: 0.5 }  // 弹道多飞一会儿，最不可感，压到最低
  ];
  const PASSIVE_MODS = [
    { k: 'spd', v: 0.10, cap: 0.6, name: '移速 +10%' },
    { k: 'leech', v: 0.04, cap: 0.2, name: '吸血 +4%' },
    { k: 'armor', v: 0.08, cap: 0.35, name: '减伤 +8%' },
    { k: 'maxhp', v: 15, cap: 300, name: '气血上限 +15' },
    { k: 'shaGain', v: 0.15, cap: 1.2, name: '煞气 +15%' }
  ];
  // 加权抽：w 越大概率越高。拾取范围那张卡已经删了 —— 它归装备管，占一次顿悟纯属浪费
  function pickWeighted(arr) {
    let tot = 0;
    for (const m of arr) tot += (m.w || 1);
    let r = Math.random() * tot;
    for (const m of arr) { r -= (m.w || 1); if (r <= 0) return m; }
    return arr[arr.length - 1];
  }
  // 只抽「这门功法真吃得下」的加成：被动没有 atk，抽伤害是空转；
  // burst/field 没有弹数与弹寿命，抽「多打一发 / 持续」也是空转。
  function skillModsFor(s) {
    const a = (s && s.atk) || null;
    if (!a) return [];   // 被动没有施展参数：一张都不给，避免“伤害 +25%”空转
    return SKILL_MODS.filter(m => {
      if (m.k === 'count') return !!a && (a.kind === 'beam' || a.kind === 'homing' || a.kind === 'spread' || a.kind === 'thunder' || a.kind === 'orbit');
      if (m.k === 'dur') return !!a && !!a.life;
      return true;
    });
  }
  function optSkillUp() {
    // 被动功法没有施展参数，不该出现在「技能升级」牌里（否则“伤害 +25%”空转）
    const own = ownSkills().filter(s => s.atk); if (!own.length) return optNewSkill();
    const s = U.pick(own), m = pickWeighted(skillModsFor(s));
    return { key: 'A' + s.id + m.k, kind: 'A', id: s.id, icon: s.icon || '⚔', mod: m,
      name: s.name + ' · ' + m.name, desc: '本局内永久生效' };
  }
  function optNewSkill() {
    // 顿悟能「悟」出的新神通，只能是：① 原著明言可不凭典籍自行参悟的功法；
    // ② 在已习功法基础上、原著描述可顿悟进阶的功法（见 skills.js 的 enlighten / prereq 标注）。
    // 没学过、又无原著铺垫的功法，绝不会莫名其妙顿悟出来。
    const pool = newSkills().filter(s => s.enlighten && (!s.prereq || (G.player.skills[s.prereq] || 0) > 0));
    if (!pool.length) return optPassive();
    const s = U.pick(pool);
    const passive = s.type === 'passive';
    return { key: 'B' + s.id, kind: 'B', id: s.id, icon: s.icon || '📜',
      name: '悟得「' + s.name + '」', desc: passive ? '新功法 · 学了就运在身上' : '新神通 · 立刻就跟着打' };
  }
  function optPassive() {
    // 拾取已覆盖全屏后再抽到它是空卡（半径已到顶、再大也没用），从卡池里让掉，不白占一次顿悟
    const pool = PASSIVE_MODS.filter(p => !(p.k === 'pickup' && pickupFull()));
    const p = U.pick(pool.length ? pool : PASSIVE_MODS);
    return { key: 'C' + p.k, kind: 'C', icon: '🌀', mod: p, name: p.name,
      desc: p.cap == null ? '本局被动 · 叠加无上限' : '本局被动，可叠加' };
  }
  function optStone() {
    const pick = U.pick([
      { v: 30, name: '灵石 +30', desc: '立刻揣进袋里，能马上祭炼' },
      { v: 60, name: '灵石 +60', desc: '一大把，够祭炼两次' },
      { v: 0.2, name: '煞气门槛 −20%', desc: '此后每次顿悟都来得更快' }
    ]);
    return { key: 'D' + pick.name, kind: 'D', icon: '💎', pick: pick, name: pick.name, desc: pick.desc };
  }
  function optSpecial() {
    const pick = U.pick([
      { k: 'x2sha', name: '煞气翻倍 · 10 秒', desc: '趁现在多杀几只' },
      { k: 'x2dmg', name: '伤害翻倍 · 15 秒', desc: '这一口气够狠' },
      { k: 'heal', name: '气血全满', desc: '一口气吊回来' },
      { k: 'summon', name: '召灵宠助战 · 30 秒', desc: '跟在另一侧，替你打半分钟' },
      { k: 'clear', name: '清场 · 屏内小怪尽灭', desc: '屏内小怪一并抹去（这一下不计煞气）' }
    ]);
    return { key: 'E' + pick.k, kind: 'E', icon: '⚡', pick: pick, name: pick.name, desc: pick.desc };
  }
  function rollInsight() {
    const out = [], seen = {};
    const push = c => { if (!c || seen[c.key]) return; seen[c.key] = 1; out.push(c); };
    let guard = 0;
    while (out.length < 3 && guard++ < 80) {
      const r = Math.random() * 100;
      if (r < 45) push(optSkillUp());
      else if (r < 65) push(optNewSkill());
      else if (r < 85) push(optPassive());
      else if (r < 93) push(optStone());
      else push(optSpecial());
    }
    while (out.length < 3) push(optStone());
    return out;
  }
  // 通用的三选一面板（顿悟 / 祭炼共用，也是升级选卡那套 UI）
  function showCards(title, cards) {
    G.state = 'levelup';
    G.cardsNow = cards;
    const t = document.querySelector('#levelup .lu-title'); if (t) t.textContent = title;
    elCards.innerHTML = '';
    for (const c of cards) {
      const el = document.createElement('div'); el.className = 'card';
      el.innerHTML = '<div class="cicon">' + (c.icon || '◆') + '</div><div class="cname">' + c.name +
        '</div><div class="cdesc">' + (c.desc || '') + '</div>';
      el.addEventListener('click', () => { elLevelup.style.display = 'none'; onPick(c); });
      elCards.appendChild(el);
    }
    elLevelup.style.display = 'flex';
  }
  function resumePlay() { G.state = 'play'; last = performance.now(); }
  function onPick(c) {
    const ins = insSt();
    if (c.kind === 'A') {
      const cur = ins.skills[c.id] || (ins.skills[c.id] = {});
      cur[c.mod.k] = (cur[c.mod.k] || 0) + c.mod.v;
      banner(c.name + ' · 本局生效'); Sfx.buff();
    } else if (c.kind === 'B') {
      G.player.skills[c.id] = Math.max(1, G.player.skills[c.id] || 0);
      syncCultivate(); recalcMaxhp();
      banner(c.name + ' · 已运起'); Sfx.levelup();
    } else if (c.kind === 'C') {
      const p = c.mod;
      // 本局被动写 runP（不与永久加成共用），cap 为 null 表示不封顶
      G.runP[p.k] = (G.runP[p.k] || 0) + p.v;
      if (p.cap != null && G.runP[p.k] > p.cap) G.runP[p.k] = p.cap;
      if (p.k === 'maxhp') recalcMaxhp(true);
      banner(p.name + ' · 本局生效'); Sfx.buff();
      // 拾取范围刚跨过整屏时给一次明确反馈，否则玩家看不见“已经满了”
      if (p.k === 'pickup' && pickupFull() && !G._pickFullTold) { G._pickFullTold = 1; banner('拾取范围已覆盖全屏'); }
    } else if (c.kind === 'D') {
      const st = shaSt();
      if (c.pick.v <= 1) { save.stones = (save.stones || 0) + c.pick.v; banner('灵石 +' + c.pick.v); }
      // 下限锁在首档 120：否则被反复 -20% 削平，一局能顿悟二十次
      else { st.need = Math.max(SHA_NEED, Math.round(st.need * (1 - c.pick.v))); banner('煞气门槛 → ' + st.need); }
      Sfx.nova();
    } else if (c.kind === 'E') {
      const st = shaSt(), k = c.pick.k;
      if (k === 'x2sha') { st.x2T = 10; banner('煞气翻倍 · 10 秒'); }
      else if (k === 'x2dmg') { st.dmgT = 15; banner('伤害翻倍 · 15 秒'); }
      else if (k === 'heal') { G.player.hp = G.player.maxhp; banner('气血全满'); Sfx.heal(); }
      else if (k === 'summon') { spawnSummon(); }
      else {
        // 清场：屏内小怪尽灭。这一下不再回煞气 —— 否则「清场→回煞气→更快顿悟→再清场」自我滚雪球
        let n = 0;
        G.noSha = true;
        for (const en of allEnemies()) {
          if (en === G.boss || en.isBossAlly) continue;
          if (U.dist(G.player.x, G.player.y, en.x, en.y) < 420) { killEnemy(en); n++; }
        }
        G.noSha = false;
        banner('清场 · ' + n + ' 只'); Sfx.nova();
      }
    } else if (c.kind === 'R') {
      const cost = REFINE_COST[ins.refine];
      if ((save.stones || 0) < cost) { notify('灵石不足 · 需 ' + cost); Sfx.warn(); resumePlay(); return; }
      save.stones -= cost; ins.refine++;
      writeSave();
      const cur = ins.skills[c.id] || (ins.skills[c.id] = {});
      const m = U.pick(skillModsFor(window.skillById(c.id)));
      cur[m.k] = (cur[m.k] || 0) + m.v;
      banner('祭炼 ' + c.name + ' · ' + m.name); Sfx.forge ? Sfx.forge() : Sfx.buff();
    }
    insSt().n++;
    resumePlay();
  }

  // ==================== 自动战斗（站桩挂机） ====================
  // 点「自动」之后人就站着不动，剩下全交给它：
  //   怪进范围就开火（fireWeapons 本来就是自动索敌，不必另写一套），
  //   对白一句句自己点过去，煞气满 / 升级的三选一自己选第一张，
  //   进了结算画面就收工 —— 一张图一趟，不跨图。
  // 两件它不做的事：不替玩家花灵石（祭炼面板直接收掉），不替客机点房主的对白。
  const AUTO_LINE_MIN = 1.0;   // 一句对白至少停这么久，让人看得见
  const AUTO_LINE_MAX = 2.6;
  const AUTO_PICK = 0.75;      // 选卡 / 抉择落手前停一下，别像抢的
  // 这些状态一出现就说明这一趟结束了（或人不在战场上），自动收工
  const AUTO_OFF_STATES = {
    victory: 1, gameover: 1, title: 1, map: 1, cave: 1, shop: 1,
    wanling: 1, diff: 1, sweep: 1, prefight: 1
  };

  // 按钮该不该露面：只在能打的图上，且人还在这一趟里（对话 / 选卡 / 暂停时也得留着）
  function autoBtnAllowed() {
    const fightMap = G.map && (G.map.type === 'combat' || G.map.type === 'boss' || G.map.type === 'chase');
    const onStage = G.state === 'play' || G.state === 'dialog' || G.state === 'levelup' || G.state === 'pause' || G.state === 'down';
    return !!(fightMap && onStage);
  }
  // 一句对白停多久：字数越多停越久，但两头都夹住 —— 太短看不清，太长像卡住
  function autoLineDelay(line) {
    const n = (line && line[1] ? line[1] : '').length;
    return U.clamp(AUTO_LINE_MIN + n * 0.028, AUTO_LINE_MIN, AUTO_LINE_MAX);
  }
  // 自动选卡：点面板上的第一张。走的是玩家自己点卡那条 click handler ——
  // 煞气顿悟（onPick）、升级/突破三选一（chooseCard）、灵石祭炼（onPick）共用同一块面板，
  // 以前只认 G.cardsNow，于是「升级/突破」那种把卡放在 elCards 上的面板选不动，
  // 一升级就卡在那儿等人点。改成直接点 DOM，三条路一次全管上，以后再加卡也自动跟上。
  function autoPickCard() {
    if (G.state !== 'levelup') return false;
    // 祭炼卡要花灵石：挂机不替人花钱，把面板收掉就回战场
    if (G.cardsNow && G.cardsNow.length && G.cardsNow.every(c => c.kind === 'R')) {
      G.cardsNow = null;
      if (elLevelup) elLevelup.style.display = 'none';
      resumePlay();
      banner('自动 · 祭炼面板已收起（不替你花灵石）');
      return true;
    }
    const el = elCards && elCards.querySelector('.card');
    G.cardsNow = null;
    if (el) { el.click(); return true; }   // click 里自己会藏面板、onPick/chooseCard 自己会回 play
    if (elLevelup) elLevelup.style.display = 'none';
    if (G.state === 'levelup') resumePlay();
    return false;
  }
  function setAuto(on, silent) {
    on = !!on;
    if (!!G.autoOn === on) return G.autoOn;
    G.autoOn = on;
    G.autoT = on ? 0.6 : 0;   // 开起来先停半拍，别一开就把第一句对白点掉
    // 锚点 = 开自动时脚下这一块：躲开之后还会自己走回来，不至于一路漂到天涯
    G.autoAnchor = (on && G.player) ? { x: G.player.x, y: G.player.y } : null;
    G.autoDodge = null; G.autoDodgePrev = null;
    if (elAutoBtn) elAutoBtn.classList.toggle('on', on);
    if (!silent) {
      if (on) { banner('自动战斗 · 开启（站桩，遇险侧身）'); Sfx.buff(); }
      else banner('自动战斗 · 关闭');
    }
    return G.autoOn;
  }
  // ---------- 自动战斗的「躲」 ----------
  // 站桩不等于站着挨打。但也不能做成「贴脸就退」——那样会被一群怪推着满场跑，
  // 反倒成了另一种失控。这里的做法是：只把「眼前这几秒真的会撞上」的东西当成威胁，
  // 试一圈方向，哪边最不疼就往哪边让半步，让开就立刻站住。
  const DODGE_DIRS = 12;      // 顺时针试这么多方向（含原地不动）
  const DODGE_STEP = 0.18;    // 一步探多远（秒），只探半步，不是逃
  const DODGE_T = [0.1, 0.24, 0.4];   // 按这几个时间点预测威胁位置
  const DODGE_NEAR = 140;     // 小怪只在这个半径内才算威胁
  const DODGE_NEAREST = 22;   // 最多只看最近这么多条威胁（虫群图一屏几百发，看不过来也不必看）
  const DODGE_HOME = 14;      // 回到锚点这个范围内就站住（留一点死区，免得来回抖）
  const DODGE_HOME_R = 40;    // 锚点周围这么一圈算「原地」，不收不罚
  const DODGE_HOME_W = 0.55;  // 往家走的拉力：要压得住「随便走哪边都一样」的平局，压不住要命的弹幕

  // 把眼前会撞上的东西列出来：弹幕 / 贴身的小怪 / 正在冲的 Boss
  // 只留最近的一小撮：虫群那类图一屏能有两三百发，全算一遍是白花力气，
  // 而真正决定往哪躲的本来就是最近那几发。
  function autoThreats(p) {
    const out = [];
    const R = 300, R2 = R * R;
    for (const b of G.ebullets) {
      const dx = b.x - p.x, dy = b.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > R2) continue;
      out.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: (b.r || 6) + p.r + 10, w: 1, d2 });
    }
    for (const e of G.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > DODGE_NEAR * DODGE_NEAR) continue;
      // 小怪是朝人走的，预测要带上它的速度，否则永远只在「已经贴上」才算威胁
      const dd = Math.sqrt(d2) || 1;
      out.push({ x: e.x, y: e.y, vx: -dx / dd * e.spd, vy: -dy / dd * e.spd, r: e.r + p.r + 14, w: 0.55, d2 });
    }
    if (out.length > DODGE_NEAREST) {
      out.sort((a, b) => a.d2 - b.d2);
      out.length = DODGE_NEAREST;
    }
    const b = G.boss;
    if (b && G.bossActive) {
      const dash = (b.dashing || 0) > 0;
      out.push({
        x: b.x, y: b.y,
        vx: dash ? Math.cos(b.dashAng || 0) * b.spd * 4.4 : 0,
        vy: dash ? Math.sin(b.dashAng || 0) * b.spd * 4.4 : 0,
        r: b.r + p.r + 16, w: 1.2
      });
    }
    return out;
  }
  // 返回这一帧该往哪迈（单位向量）；null = 站住
  function autoDodgeDir(p) {
    const th = autoThreats(p);
    const anch = G.autoAnchor;
    const hx = anch ? anch.x - p.x : 0, hy = anch ? anch.y - p.y : 0;
    const homeD = Math.hypot(hx, hy);
    // 眼前干净：躲开了就走回原来站着的地方，走到附近就停
    if (!th.length) return (anch && homeD > DODGE_HOME) ? { x: hx / homeD, y: hy / homeD, back: 1 } : null;
    const sp = p.spd * spdMul() * (1 + (G.bonus.spd || 0));
    const step = sp * DODGE_STEP;
    const score = (qx, qy) => {
      let s = 0;
      for (let k = 0; k < DODGE_T.length; k++) {
        const t = DODGE_T[k];
        for (let i = 0; i < th.length; i++) {
          const x = th[i];
          const ddx = x.x + x.vx * t - qx, ddy = x.y + x.vy * t - qy;
          const d = Math.hypot(ddx, ddy);
          if (d >= x.r) continue;
          const k2 = 1 - d / x.r;
          s += k2 * k2 * x.w;
        }
      }
      if (anch) {
        // 离家越远越想回去。不是「不许走远」，只是在同样能躲开的几条路里，挑更靠家的一条：
        // 否则一场架下来一步一步往边上挪，最后人跑到半屏外，就不叫站桩了。
        const od = Math.hypot(qx - anch.x, qy - anch.y);
        s += Math.max(0, od - DODGE_HOME_R) / DODGE_HOME_R * DODGE_HOME_W;
      }
      return s;
    };
    const stay = score(p.x, p.y);
    // 上一帧往哪边让的：同样的好坏，宁可接着往原来那个方向走，免得两帧一换来原地抖
    const prev = G.autoDodgePrev;
    let best = stay, bx = 0, by = 0;
    for (let i = 0; i < DODGE_DIRS; i++) {
      const a = i / DODGE_DIRS * Math.PI * 2;
      const ux = Math.cos(a), uy = Math.sin(a);
      let s = score(p.x + ux * step, p.y + uy * step);
      if (prev) s += (1 - (ux * prev.x + uy * prev.y)) * 0.08;
      if (s < best - 0.02) { best = s; bx = ux; by = uy; }
    }
    if (!bx && !by) return null;   // 让不出更好的位置：站住（被围住的时候本来就无处可躲）
    return { x: bx, y: by };
  }

  // 每帧一次：只处理「停在 play 之外、本来等人点一下」的地方；打仗本身仍归 update
  function tickAuto(dt) {
    if (!G.autoOn) return;
    if (AUTO_OFF_STATES[G.state]) { setAuto(false, true); return; }
    if (G.state === 'dialog') {
      // 客机不替房主点对白：联机节奏以房主为准，否则两边各点各的，镜像会乱
      if (G.coopRole === 'client' && G.coopShared) return;
      G.autoT -= dt;
      if (G.autoT > 0) return;
      if (G.dialogIsChoice) {
        if (G.dialogChoiceOpts && G.dialogChoiceOpts.length) {
          pickChoice(G.dialogChoiceOpts[0].v);   // 抉择一律取第一项
          G.autoT = AUTO_PICK;
        } else G.autoT = 0.3;
        return;
      }
      if (!G.dialogLines) { G.autoT = 0.2; return; }
      const line = G.dialogLines[G.dialogIdx];
      advanceDialog();
      G.autoT = autoLineDelay(line);
      return;
    }
    if (G.state === 'levelup') {
      G.autoT -= dt;
      if (G.autoT > 0) return;
      G.autoT = autoPickCard() ? AUTO_PICK : 0.3;
    }
  }

  function openInsight() {
    const st = shaSt();
    // 这一次顿悟用掉的门槛，用掉之后抬一档
    st.need = Math.max(SHA_NEED, Math.round(st.need * SHA_GROW));
    st.done = (st.done || 0) + 1;
    showCards('煞气顿悟 · 择一', rollInsight());
    Sfx.levelup();
  }
  // 灵石祭炼：花的是全局灵石，次数越多越贵
  function openRefine() {
    if (!G.player) return;
    const ins = insSt(), cost = REFINE_COST[ins.refine];
    const own = ownSkills().filter(s => s.atk);
    if (!own.length) { notify('还没有可祭炼的进攻功法'); Sfx.warn(); return; }
    if (cost == null) { notify('本局祭炼已到顶'); Sfx.warn(); return; }
    if ((save.stones || 0) < cost) { notify('灵石不足 · 需 ' + cost); Sfx.warn(); return; }
    const cards = own.slice(0, 6).map(s => ({
      key: 'R' + s.id, kind: 'R', id: s.id, icon: s.icon || '⚔', name: s.name,
      desc: '祭炼 ' + cost + ' 灵石 · 伤害/范围/攻速/多发/持续，随机一条'
    }));
    showCards('灵石祭炼 · 择一功法', cards);
  }
  // 召灵宠：借身上那只的皮相；没有就召一只灵体（啼魂兽的形）
  function spawnSummon() {
    const pd = petDef();
    const spr = (pd && pd.spr && Sprites[pd.spr]) ? pd.spr : 'tihun';
    const p = G.player;
    G.summon = {
      t: 0, max: 30, x: p.x - 26, y: p.y - 6, cd: 0.3, bob: 0,
      dmg: (G.realm.dmg * 70 + 10) * 0.9, rate: 0.7,
      spr: spr, scale: (pd && pd.scale) || 1.15, name: (pd && pd.name) || '灵体'
    };
    banner((pd ? pd.name : '灵体') + ' 助战 · 30 秒'); Sfx.levelup();
  }
  // 身外化身：玄阴经分神之法。学到就常驻，不占「召灵宠」那一个位置
  function spawnAvatar() {
    const p = G.player; if (!p) return;
    G.avatar = {
      x: p.x + 30, y: p.y + 4, cd: 0.6, bob: 0, spr: 'tihun', scale: 1.1,
      dmg: (G.realm.dmg * 70 + 10) * 1.15, rate: 0.9
    };
    banner('身外化身 · 现');
  }
  function updateAvatar(dt) {
    const a = G.avatar;
    if (!a || !G.player) return;
    const p = G.player, tx = p.x + 30 * (p.dir || 1), ty = p.y + 4;
    a.x += (tx - a.x) * Math.min(1, dt * 5);
    a.y += (ty - a.y) * Math.min(1, dt * 5);
    a.bob = (a.bob || 0) + dt;
    if (G.state !== 'play') return;
    a.cd -= dt;
    if (a.cd > 0) return;
    const t = nearestEnemyFrom(a.x, a.y, 440);
    if (!t) { a.cd = 0.25; return; }
    const ang = Math.atan2(t.y - a.y, t.x - a.x);
    G.bullets.push({
      x: a.x, y: a.y, vx: Math.cos(ang) * 330, vy: Math.sin(ang) * 330,
      r: 6, dmg: a.dmg, life: 1.2, pierce: 1, hit: new Set(), home: true, pet: true, summon: true
    });
    a.cd = a.rate;
  }

  function updateSummon(dt) {
    const s = G.summon;
    if (!s || !G.player) return;
    s.t += dt;
    if (s.t >= s.max) { G.summon = null; banner('灵宠散去'); return; }
    // 站主人另一侧，和真灵宠对称
    const p = G.player, tx = p.x - 26 * -(p.dir || 1), ty = p.y - 6;
    s.x += (tx - s.x) * Math.min(1, dt * 6);
    s.y += (ty - s.y) * Math.min(1, dt * 6);
    s.bob = (s.bob || 0) + dt;
    if (G.state !== 'play') return;
    s.cd -= dt;
    if (s.cd > 0) return;
    const t = nearestEnemyFrom(s.x, s.y, 420);
    if (!t) { s.cd = 0.25; return; }
    const a = Math.atan2(t.y - s.y, t.x - s.x);
    G.bullets.push({
      x: s.x, y: s.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340,
      r: 6, dmg: s.dmg, life: 1.2, pierce: 1, hit: new Set(), home: true, pet: true, summon: true
    });
    s.cd = s.rate;
  }

  // 每帧：特殊效果的倒计时 + 修炼感悟 + 把攒满的顿悟排上
  function tickInsight(dt) {
    const st = shaSt();
    // 自然汇聚只认「真正在打」的图，别让坊市/洞府里也飘煞气
    if (G.state === 'play' && G.map && (G.map.type === 'combat' || G.map.type === 'boss' || G.map.type === 'chase') && !G.paused) {
      // 保底：过了 100 秒还没吃满 9 次，汇聚加速追一下 —— 清怪慢的图也不会只给七八次
      const base = G.map.type === 'boss' ? SHA_DRIP_BOSS : SHA_DRIP;
      const catchUp = ((st.done || 0) < 9 && G.time > 100) ? 2.5 : 1;
      gainSha(base * catchUp * dt);
    }
    if (st.x2T > 0) st.x2T = Math.max(0, st.x2T - dt);
    if (st.dmgT > 0) st.dmgT = Math.max(0, st.dmgT - dt);
    // 攒满的顿悟等回到 play 再弹（击杀/清场途中不打断结算）
    if (st.pending > 0 && G.state === 'play' && !G.pendingEnding && G.vacuumT <= 0) { st.pending--; openInsight(); return; }
    st.sayT -= dt;
    if (st.sayT <= 0) {
      st.sayT = 30 + Math.random() * 10;
      if (G.state === 'play') banner(U.pick(INSIGHT_SAY));
    }
  }
  function gainSha(n) {
    if (G.noSha) return;   // 清场这类「一次性收走」不算击杀产出
    const st = shaSt();
    // 已经吃过 11 / 14 次之后，煞气来得慢一点：高密度图不至于变成十几次连弹
    const damp = (st.done || 0) >= 14 ? 0.35 : ((st.done || 0) >= 11 ? 0.65 : 1);
    const k = (1 + (G.bonus.shaGain || 0) + rp('shaGain')) * (st.x2T > 0 ? 2 : 1) * damp;
    st.v += n * k;
    while (st.v >= st.need) { st.v -= st.need; st.pending = (st.pending || 0) + 1; }
  }
  // 顿悟/祭炼对某门功法的加成（改的是这次出手用的那份配置，不动全局表）
  // 必须按「施法形态」分派字段，否则会抽到空转的卡：
  //   远程/追踪/扇形/天雷 → range 锁敌距、cd 出手间隔、count 弹数、life 持续
  //   爆发 burst           → 范围是 radBase/rad，间隔是 cdBase
  //   环绕 orbit           → 范围是 rad，命中间隔是 cdHit，count 是绕身器数
  //   领域 field           → 范围是 rad，命中间隔是 cdHit，没有弹数/持续
  function insightAtk(id, a) {
    const ins = G.insight, st = G.sha;
    const m = (ins && ins.skills[id]) || null;
    const dmgT = st && st.dmgT > 0 ? 2 : 1;
    if (!m && dmgT === 1) return a;
    const o = Object.assign({}, a);
    const dm = (1 + ((m && m.dmg) || 0)) * dmgT;
    if (dm !== 1) { o.base = (a.base || 0) * dm; o.perLv = (a.perLv || 0) * dm; }
    // 范围：锁敌距离 / 爆发与领域的半径，各自归位
    if (m && m.range) {
      if (a.rad != null) o.rad = a.rad * (1 + m.range);
      if (a.radBase != null) o.radBase = a.radBase * (1 + m.range);
      // 射程不再是像素值，改成往「进度」上乘（见 rangeModel.axes 的 k 参数）。
      // 乘像素没有意义：射程已经硬顶在内切屏幕的椭圆上，乘多少都会被 clamp 回 240/432。
      if (a.range != null) o.rangeK = (a.rangeK || 1) * (1 + m.range);
    }
    // 攻速：出手间隔 / 爆发间隔 / 领域命中间隔
    if (m && m.cd) {
      if (a.cd != null) o.cd = a.cd * (1 - m.cd);
      if (a.cdBase != null) o.cdBase = a.cdBase * (1 - m.cd);
      if (a.cdHit != null) o.cdHit = a.cdHit * (1 - m.cd);
    }
    if (m && m.count) o.countBase = (a.countBase == null ? 1 : a.countBase) + m.count;
    if (m && m.dur && a.life) o.life = a.life * (1 + m.dur);
    return o;
  }

  function queueLevelUp() { G.state = 'levelup'; buildChoicesAndShow(); }
  function buildChoices() {
    const pool = [];
    const capOf = (s) => window.skillCapById ? window.skillCapById(s.id, G.player.level) : s.max;
    for (const s of SKILLS) {
      const lv = G.player.skills[s.id] || 0;
      if (s.minLv && G.player.level < s.minLv) continue;  // 境界不到，这门功法连门都入不了
      if (lv < capOf(s)) pool.push({ kind: 'skill', id: s.id, name: s.name, icon: s.icon, desc: s.desc + (lv > 0 ? ('（' + lv + '→' + (lv + 1) + ' 重）') : '（新功法）') });
    }
    pool.sort(() => Math.random() - 0.5);
    const picks = pool.slice(0, 3);
    const fillers = [
      { kind: 'heal', name: '止血丹', icon: '❤', desc: '立即回复50%生命' },
      { kind: 'rain', name: '灵石雨', icon: '💎', desc: '散落一把灵石与修为' },
      { kind: 'fortune', name: '福缘', icon: '🍀', desc: '随机功法+1级' }
    ];
    while (picks.length < 3) picks.push(U.pick(fillers));
    return picks;
  }
  function buildChoicesAndShow() {
    const t = document.querySelector('#levelup .lu-title'); if (t) t.textContent = '进阶 · 择一功法';
    const choices = buildChoices();
    elCards.innerHTML = '';
    for (const c of choices) {
      const el = document.createElement('div'); el.className = 'card';
      el.innerHTML = '<div class="cicon">' + c.icon + '</div><div class="cname">' + c.name + '</div><div class="cdesc">' + c.desc + '</div>';
      el.addEventListener('click', () => chooseCard(c));
      elCards.appendChild(el);
    }
    elLevelup.style.display = 'flex';
  }
  function chooseCard(c) {
    if (c.kind === 'skill') {
      G.player.skills[c.id] = (G.player.skills[c.id] || 0) + 1;
      if (c.id === 'sword') bumpSwordPick(true);
      syncCultivate();
    } else if (c.kind === 'heal') G.player.hp = Math.min(G.player.maxhp, G.player.hp + G.player.maxhp * 0.5);
    else if (c.kind === 'rain') {
      for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28, dd = U.rand(20, 120); G.gems.push({ x: G.player.x + Math.cos(a) * dd, y: G.player.y + Math.sin(a) * dd, r: 5, val: 2 }); }
      dropStone(G.player.x, G.player.y, 4);
    } else if (c.kind === 'fortune') {
      const capNow = (s) => window.skillCapById ? window.skillCapById(s.id, G.player.level) : s.max;
      const own = SKILLS.filter(s => (!s.minLv || G.player.level >= s.minLv) && (G.player.skills[s.id] || 0) > 0 && (G.player.skills[s.id] || 0) < capNow(s));
      if (own.length) { const s = U.pick(own); G.player.skills[s.id]++; if (s.id === 'sword') bumpSwordPick(true); }
      else { const ns = SKILLS.find(s => !(G.player.skills[s.id])); if (ns) { G.player.skills[ns.id] = 1; if (ns.id === 'sword') bumpSwordPick(true); } }
      recalcMaxhp(); syncCultivate();
    }
    elLevelup.style.display = 'none';
    Sfx.levelup();
    if (c.kind === 'skill') Sfx.buff();
    else if (c.kind === 'heal') Sfx.heal();
    else if (c.kind === 'rain') Sfx.nova();
    if (G.player.xp >= G.player.next) {
      G.player.xp -= G.player.next; G.player.level++; G.player.next = xpNeed(G.player.level);
      checkRealm();
      buildChoicesAndShow();
    } else { G.state = 'play'; last = performance.now(); }
  }

  // ---------- 主更新 ----------
  function update(dt) {
    G.time += dt;
    save.playTime = (save.playTime || 0) + dt;   // 生涯累计时长（游戏内时间，与 G.time 同源）
    tickGarden(dt);
    tickBuffs(dt);
    tickInsight(dt);

    // 联机：等房主把对话点完（客机已先点掉 / 房主还在对话）
    // 场上怪物、功法特效、掉落一律静止；仍保留联机收发与队友插值，聊天与暂停不受影响
    if (G.coopFrozen) {
      if (window.Coop) { window.Coop.tickSend(dt); window.Coop.update(dt); }
      if (G.shake > 0) G.shake -= dt * 40;
      if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.1);
      return;
    }

    // 打击停顿（顿帧）：极短冻结，只为手感
    if (G.hitStop > 0) {
      G.hitStop -= dt;
      updateParts(dt);
      if (window.Coop) window.Coop.update(dt);   // 顿帧里也让队友位置平滑
      if (G.shake > 0) G.shake -= dt * 40;
      if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.1);
      return;
    }

    const p = G.player;
    if (!p) return;   // 进图过渡帧：state 已切到 play，人还没立起来
    let dx = 0, dy = 0;
    // 自动战斗：站桩 —— 键与摇杆一律不认，脚下生根，剩下的交给自动索敌；
    // 只有「马上要撞上」的时候才侧身让半步（躲的是弹幕和冲刺，不是躲怪）
    if (!G.autoOn) {
      if (keys.left) dx--; if (keys.right) dx++; if (keys.up) dy--; if (keys.down) dy++;
      if (jx !== 0 || jy !== 0) { dx = jx; dy = jy; }
    } else {
      const dv = autoDodgeDir(p);
      G.autoDodge = dv || null;
      if (dv) { dx = dv.x; dy = dv.y; G.autoDodgePrev = dv.back ? null : { x: dv.x, y: dv.y }; }
      else G.autoDodgePrev = null;
    }
    const len = Math.hypot(dx, dy) || 1;
    // 定身（夺舍 / 禁制 / 蛛丝）与冻缓（极寒之气）：Boss 招式里"控"的那一半
    const ctrlK = (p.rootT > 0) ? 0 : (p.slowT > 0 ? (p.slowK || 0.5) : 1);
    const sp = p.spd * spdMul() * (1 + (G.bonus.spd || 0)) * ctrlK;
    p.x += (dx / len) * sp * dt; p.y += (dy / len) * sp * dt;
    if (dx !== 0) p.dir = dx > 0 ? 1 : -1;
    // 迈步相位只在真的走的时候推进：站着的时候腿不该还在摆
    p.moving = (dx !== 0 || dy !== 0);
    if (p.moving) p.gait = (p.gait || 0) + dt * 9.5;
    const rg = rb('regen') + passiveSum('regen') + buffSum('regen') + (G.bonus.regen || 0) + gb('regen');
    if (rg > 0 && p.hp < p.maxhp) p.hp = Math.min(p.maxhp, p.hp + rg * dt);
    if (p.iv > 0) p.iv -= dt;
    if (p.rootT > 0) p.rootT -= dt;
    if (p.slowT > 0) p.slowT -= dt;
    if (p.dashFx > 0) p.dashFx -= dt;
    if (G.dashCd > 0) G.dashCd -= dt;
    if (p.hurtFlash > 0) p.hurtFlash -= dt;
    if (p.atkAnim > 0) p.atkAnim -= dt;
    if (p.atkCd > 0) p.atkCd -= dt;
    G.fieldSlow = G.fieldSlow || [];

    // 连斩衰减
    if (G.comboT > 0) {
      G.comboT -= dt;
      if (G.comboT <= 0) resetCombo();
    }

    fireWeapons(dt);
    updateAuras(dt);
    tickAlchQuota(dt);

    // 硬跟随 + 闪身镜头滞后：先停一拍（hold），再按指数平滑追上，帧率无关、不掉帧
    if (G.camLag) {
      if (G.camLag.hold > 0) {
        G.camLag.hold -= dt;
      } else {
        const ease = 1 - Math.exp(-dt * 18);
        G.camLag.x -= G.camLag.x * ease;
        G.camLag.y -= G.camLag.y * ease;
        if (Math.abs(G.camLag.x) < 0.5 && Math.abs(G.camLag.y) < 0.5) G.camLag = null;
      }
      G.cam.x = p.x - W / 2 + (G.camLag ? G.camLag.x : 0);
      G.cam.y = p.y - H / 2 + (G.camLag ? G.camLag.y : 0);
    } else {
      G.cam.x = p.x - W / 2; G.cam.y = p.y - H / 2;
    }
    ensureDecor();

    // 双人联机 P2：发本地位置 + 插值队友
    if (window.Coop) { window.Coop.tickSend(dt); window.Coop.update(dt); }
    // P6：队友倒了就凑过去站着救人（站满 RESCUE_NEED 秒才算救起）
    if (G.partner && G.partner.down && G.partner.shown) {
      tickRescue(dt, U.dist(p.x, p.y, G.partner.x, G.partner.y) < RESCUE_R);
    } else if (G.rescueT > 0) G.rescueT = 0;

    updateBullets(dt);
    updateFxBullets(dt);   // 队友攻击特效（纯视觉，不判伤害）
    // 共斗中（同图 + 双方都在战斗/倒地）才由房主权威；不在同一张图时各打各的，本地照常遇敌
    if (G.coopRole === 'client' && G.coopShared) {
      // 客机：怪 / 弹幕由房主权威驱动，本地不跑 AI 与碰撞（伤害判定全在房主侧）
    } else {
      updateEBullets(dt);
      updateEnemies(dt);
    }
    updatePet(dt);
    updateSummon(dt);
    updateAvatar(dt);
    updateMate(dt);
    tickQuickCd(dt);
    tickPetFeed(dt);
    // 共斗时客机只渲染 Boss（走房主快照镜像），不替房主跑 Boss 的 AI 与出招
    if (G.bossActive && !(G.coopRole === 'client' && G.coopShared)) updateBoss(dt);

    // Boss 登场调度（共斗时客机不自己刷：进度已对齐房主，Boss 走房主快照的镜像，避免两个 Boss）
    if (G.map && G.map.boss && !G.bossSpawned && !(G.coopRole === 'client' && G.coopShared)) {
      // 战斗图写了 Boss 却漏写 bossAt，在这里会静默变成「永远不刷」——at 恒为 0，条件是 at > 0。
      // 掩月宗就是这么卡了一个版本：小怪滚滚来，Boss 到不了，玩家一直打空场。
      // 所以给一个兜底时点：战斗图漏填一律 120s 登场，「有 Boss 就一定会来」。
      // type:'boss' 不吃这条 —— 它是开场回调里直接 spawnBoss()，不靠时钟。
      const at = (G.map.bossAt > 0) ? G.map.bossAt
        : (G.map.type !== 'boss' ? 120 : 0);
      if (at > 0 && G.time >= at - 3 && !G.bossWarned) { G.bossWarned = true; banner('⚠ 妖气逼近'); Sfx.warn(); }
      if (at > 0 && G.time >= at) spawnBoss();
    }

    // 追逃图：打不过就跑。撑到时辰，自然脱身
    if (G.map && G.map.type === 'chase' && G.map.escapeAt && !G.chaseDone && G.time >= G.map.escapeAt
        && !(G.coopRole === 'client' && G.coopShared)) {   // 共斗时脱身由房主广播 end，客机不自行结算
      G.chaseDone = true; G.bossSpawned = true;
      G.enemies.length = 0; G.ebullets.length = 0;
      banner('追兵已远 · 脱身'); Sfx.win();
      G.vacuumT = 0.9; G.pendingEnding = true;
    }

    if (!G.bossActive && G.vacuumT <= 0 && !G.bossSpawned && !(G.coopRole === 'client' && G.coopShared)) spawnDirector(dt);
    // Boss 战后收取战利品（演出 + 自动入袋）
    if (G.vacuumT > 0) {
      G.vacuumT -= dt;
      vacuumPickups(dt, 900);
      if (G.vacuumT <= 0) {
        collectAllPickups(true);   // 只收一屏之内：视野外的留在原地
        autoSave();
        if (G.pendingEnding) {
          G.pendingEnding = false;
          // 共斗中的客机不自己走收尾：结尾由房主驱动（收尾对话同步 + end 广播）。
          // 否则客机会在镜像完房主的收尾对话后，又凭本地 pendingEnding 再播一遍整段对话，
          // 逼人点第二次才进结算 —— 这就是「打完 Boss 客机还要再点一遍」的根因。
          if (G.coopRole === 'client' && G.coopShared) return;
          startOutro(); return;
        }
      }
    }
    updatePickups(dt);
    updateParts(dt);
    if (G.shake > 0) G.shake -= dt * 40;
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.1);

    if (G.state === 'play') checkStory();
    if (G.state === 'play') updateEncounters(dt);

    if (G.state === 'play' && p.xp >= p.next) {
      // 大境界卡一道门：材料齐了也不再自动破关 —— 得回洞府「进阶」走那段剧情才破
      const req = breakReqFor(p.level + 1);
      if (req) { p.xp = Math.min(p.xp, p.next - 0.5); markBlocked(req); }
      else {
        // 小境界（原著点名的那几处，如结丹中期的碧焰酒）：没备物事就过不去
        const mn = minorReqFor(p.level + 1);
        if (mn && minorHave(mn) <= 0) {
          p.xp = Math.min(p.xp, p.next - 0.5);
          if (G.minorHint !== p.level + 1) {
            G.minorHint = p.level + 1;
            const mi = Items.get(mn.item);
            banner('修为已至 ' + mn.realm + ' 关口 · 须服「' + (mi ? mi.name : mn.item) + '」');
          }
        } else if (G.vacuumT > 0 || G.pendingEnding) { autoLevelUp(); }
        else {
          if (mn) payMinor(mn);
          p.xp -= p.next; p.level++; p.next = xpNeed(p.level);
          checkRealm();
          queueLevelUp();
        }
      }
    }
  }

  // ---------- 渲染 ----------
  let grassPat = null;
  // 皮肤 · 场景底色：鬼谷水墨皮把各地图的绿底/彩底统一晕染成宣纸淡墨调（JS 端与 CSS 滤镜配合）
  function skinBg(bg) {
    if (!save || save.skin !== 'guigu') return bg;
    // 按原底色亮度分两档：亮地图（野外/雪原）用宣纸暖白晕染，暗地图（魔域/深渊）用淡墨灰晕染
    let lum = 0.3;
    try {
      const hex = (bg && bg.base) || '#36532f';
      const n = parseInt(hex.slice(1), 16);
      lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    } catch (e) {}
    return lum > 0.42
      ? { base: '#dbd5c3', a: '#e3ddcb', b: '#cdc7b5' }   // 宣纸暖白（a 为晕染亮部）
      : { base: '#cbc5b3', a: '#d5cfbd', b: '#bcb6a4' };  // 旧纸（暗地图也留纸感，只是略沉一档）
    // 之前的暗地图走 #8f8a79，整屏成了土黄褐 —— 国画要的是"纸"，纸本来是亮的。
    // 暗地图的区别只该是"纸旧一点"，不是"纸脏了"。
    // 纸底刻意比精灵的纸白（239,233,219）压一档：白衣/白骨在纸上才浮得出来，否则白对白一片糊。
  }
  // 一角构图晕墨层（鬼谷水墨皮专用）：四角淡墨 + 底部平远远山，中央留白。
  // 离屏画布一次性烘焙，随皮肤/视口尺寸重建；每帧只多一次 drawImage。
  // ---------- 视差背景：远山/寒林/近景 分层随相机横移；屏幕固定框景保留 ----------
  // 原 wash 是一张整屏合成、钉死在屏幕上（D3：相机一动，纸纹和远山浮在原地）。
  // 现拆成：框景(屏幕固定) + 远(0.18)/中(0.45)/近(0.8) 三层随相机横移 + 世界肌理(1:1)。
  // 约束：仍「四角淡墨/暗角 + 中央留白」，横移幅度小（系数<1），不产生眩晕。两皮各一套。
  let pxCache = null;
  function parallaxLayers() {
    const skin = (save && save.skin === 'guigu') ? 'guigu' : 'jin';
    if (pxCache && pxCache.w === W && pxCache.h === H && pxCache.skin === skin) return pxCache;
    const jin = (skin !== 'guigu');
    // 调色：水墨用墨/纸；鎏金用暗金+暗角（暗部皮不纸化，保留深色噪点底 + 高对比特效）
    const C = jin
      ? { corner: 'rgba(16,10,4,', fog: 'rgba(22,16,8,', mtn: 'rgba(44,32,16,', ridge: 'rgba(82,60,28,',
          tree: 'rgba(26,20,12,', stone: 'rgba(34,26,14,', bank: 'rgba(64,48,24,', cun: 'rgba(92,68,32,' }
      : { corner: 'rgba(60,56,48,', fog: 'rgba(62,58,48,', mtn: 'rgba(60,56,48,', ridge: 'rgba(52,48,40,',
          tree: 'rgba(46,42,34,', stone: 'rgba(58,54,46,', bank: 'rgba(52,48,40,', cun: 'rgba(46,42,34,' };
    const mk = (fn) => { const c = document.createElement('canvas'); c.width = W; c.height = H; fn(c.getContext('2d')); return c; };

    // 笔形/石/坡岸/树/皴：与原有 wash 同一套笔法，仅多收一个 g（每层独立离屏画布）
    const brush = (g, x0, y0, cx, cy, x1, y1, w0, w1, a) => {
      const N = 14, at = (t) => { const u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]; };
      const L = [], Rr = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, p0 = at(t), pa = at(Math.max(0, t - 0.02)), pb = at(Math.min(1, t + 0.02));
        const dx = pb[0] - pa[0], dy = pb[1] - pa[1], len = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * t) / 2;
        L.push([p0[0] - dy / len * w, p0[1] + dx / len * w]); Rr.push([p0[0] + dy / len * w, p0[1] - dx / len * w]);
      }
      g.beginPath(); g.moveTo(L[0][0], L[0][1]);
      for (let i = 1; i < L.length; i++) g.lineTo(L[i][0], L[i][1]);
      for (let i = Rr.length - 1; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1]);
      g.closePath(); g.fillStyle = C.tree + a.toFixed(3) + ')'; g.fill();
    };
    const cun = (g, cx, cy, w, n, seed) => {
      let sd = seed; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < n; i++) {
        const x = cx + (rnd() - 0.5) * w, y = cy + (rnd() - 0.5) * w * 0.26, len = w * (0.06 + rnd() * 0.05);
        brush(g, x, y, x + len * 0.42, y - len * 0.32, x + len * 0.95, y - len * 0.72, 2.0, 0.5, 0.16);
      }
    };
    const bank = (g, x0, x1, yb, amp, a) => {
      g.beginPath();
      for (let px = x0; px <= x1; px += 8) {
        const t = (px - x0) / (x1 - x0), y = yb - amp * Math.sin(t * Math.PI) * (0.7 + 0.3 * Math.sin(t * 7.5));
        if (px === x0) g.moveTo(px, y); else g.lineTo(px, y);
      }
      g.strokeStyle = C.bank + a + ')'; g.lineWidth = 1.15; g.lineCap = 'round'; g.stroke();
    };
    const tree = (g, bx, by, h, lean, a, seed) => {
      let sd = seed; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
      const topX = bx + lean, topY = by - h;
      brush(g, bx, by, bx + lean * 0.30 - lean * 0.16, by - h * 0.55, topX, topY, Math.max(2.8, h * 0.029), Math.max(0.5, h * 0.0038), a);
      brush(g, bx, by - h * 0.022, bx - h * 0.048, by - h * 0.004, bx - h * 0.086, by - h * 0.014, Math.max(1.2, h * 0.0075), 0.35, a * 0.72);
      brush(g, bx, by - h * 0.022, bx + h * 0.052, by - h * 0.002, bx + h * 0.092, by - h * 0.012, Math.max(1.2, h * 0.0075), 0.35, a * 0.72);
      for (let k = 0; k < 3; k++) {
        const t = 0.09 + k * 0.17 + rnd() * 0.05, tx = bx + (topX - bx) * t, ty = by - h * t, w = Math.max(1.8, h * 0.020 * (1 - t));
        g.beginPath(); g.ellipse(tx + (rnd() - 0.5) * w * 0.6, ty, w * 0.60, w * 0.22, (rnd() - 0.5) * 0.6, 0, 6.29);
        g.fillStyle = C.tree + Math.min(1, a * 1.2).toFixed(3) + ')'; g.fill();
      }
      const tips = [];
      for (let k = 0; k < 5; k++) {
        const t = 0.34 + k * 0.132 + rnd() * 0.028, sx = bx + (topX - bx) * t - lean * 0.10 * Math.sin(t * 3), sy = by - h * t;
        const dir = (k % 2) ? 1 : -1, len = h * (0.34 - k * 0.046) * (0.85 + rnd() * 0.3), ex = sx + dir * len, ey = sy - len * (0.34 + rnd() * 0.26);
        brush(g, sx, sy, sx + dir * len * 0.62, sy - len * 0.06, ex, ey, Math.max(1.6, h * 0.013), Math.max(0.45, h * 0.0028), a * 0.96);
        tips.push([ex, ey]);
        if (k < 4) {
          const mx = sx + (ex - sx) * 0.58, my = sy + (ey - sy) * 0.58, l2 = len * (0.44 + rnd() * 0.2), t2x = mx + dir * l2 * 0.42, t2y = my - l2 * 0.92;
          brush(g, mx, my, mx + dir * l2 * 0.34, my - l2 * 0.30, t2x, t2y, Math.max(0.9, h * 0.0075), Math.max(0.35, h * 0.0016), a * 0.82);
          tips.push([t2x, t2y]);
          if (k % 2 === 0) { brush(g, t2x, t2y, t2x + dir * l2 * 0.20, t2y - l2 * 0.22, t2x + dir * l2 * 0.30, t2y - l2 * 0.50, Math.max(0.6, h * 0.004), 0.3, a * 0.7); tips.push([t2x + dir * l2 * 0.30, t2y - l2 * 0.50]); }
        }
      }
      for (let k = 0; k < tips.length; k++) {
        if (rnd() > 0.55) continue;
        const tx = tips[k][0], ty = tips[k][1];
        for (let m = 0, n = 2 + ((rnd() * 3) | 0); m < n; m++) {
          const px = tx + (rnd() - 0.5) * h * 0.085, py = ty + (rnd() - 0.5) * h * 0.06;
          g.beginPath(); g.ellipse(px, py, h * (0.009 + rnd() * 0.006), h * (0.005 + rnd() * 0.004), (rnd() - 0.5) * 1.4, 0, 6.29);
          g.fillStyle = C.tree + (a * 0.62).toFixed(3) + ')'; g.fill();
        }
      }
    };
    const stone = (g, cx, cy, sw, sh, alpha) => {
      g.beginPath();
      g.moveTo(cx - sw / 2, cy + sh);
      g.quadraticCurveTo(cx - sw * 0.44, cy - sh * 0.2, cx - sw * 0.16, cy - sh * 0.52);
      g.quadraticCurveTo(cx + sw * 0.04, cy - sh * 0.78, cx + sw * 0.24, cy - sh * 0.36);
      g.quadraticCurveTo(cx + sw * 0.44, cy - sh * 0.08, cx + sw / 2, cy + sh);
      g.closePath(); g.fillStyle = C.stone + alpha + ')'; g.fill();
    };

    // 屏幕固定框景：四角 + 整屏竖向明暗（锁住「四角淡墨/暗角 + 中央留白」）
    const frame = mk((g) => {
      const corner = (cx, cy, r, a) => { const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, C.corner + a + ')'); rg.addColorStop(1, C.corner + '0)'); g.fillStyle = rg; g.fillRect(cx - r, cy - r, r * 2, r * 2); };
      const R = Math.max(W, H) * 0.46;
      const vg = g.createLinearGradient(0, 0, 0, H);
      vg.addColorStop(0, C.fog + '0.055)'); vg.addColorStop(0.55, C.fog + '0.015)'); vg.addColorStop(1, C.fog + '0.085)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      corner(0, 0, R, jin ? 0.22 : 0.14); corner(W, 0, R * 0.85, jin ? 0.18 : 0.11);
      corner(0, H, R, jin ? 0.24 : 0.15); corner(W, H, R, jin ? 0.20 : 0.12);
    });
    // 远山：底部两叠剪影，周期整除 W → 横向无缝平铺；横移系数最小（0.18）
    const far = mk((g) => {
      const mountain = (baseY, amp, alpha, k, phase) => {
        const fillPath = () => { g.beginPath(); g.moveTo(-4, H + 4); for (let px = 0; px <= W + 8; px += 8) { const t = px / W, y = baseY - amp * (0.55 + 0.45 * Math.sin(t * Math.PI * 2 * k + phase)) * Math.sin(t * Math.PI); g.lineTo(px, y); } g.lineTo(W + 4, H + 4); g.closePath(); };
        fillPath(); g.fillStyle = C.mtn + alpha + ')'; g.fill();
        g.beginPath(); for (let px = 0; px <= W + 8; px += 8) { const t = px / W, y = baseY - amp * (0.55 + 0.45 * Math.sin(t * Math.PI * 2 * k + phase)) * Math.sin(t * Math.PI); if (px === 0) g.moveTo(px, y); else g.lineTo(px, y); }
        g.strokeStyle = C.ridge + (alpha * 1.4).toFixed(3) + ')'; g.lineWidth = 1.25; g.lineJoin = 'round'; g.stroke();
      };
      mountain(H * 0.94, H * 0.10, jin ? 0.16 : 0.12, 3, 0.8);
      mountain(H * 0.97, H * 0.06, jin ? 0.10 : 0.07, 5, 2.3);
    });
    // 中景：坡岸 + 皴 + 两株远树（横移 0.45）
    const mid = mk((g) => {
      bank(g, 0, W * 0.32, H * 0.900, H * 0.022, jin ? 0.22 : 0.165);
      bank(g, W * 0.70, W, H * 0.912, H * 0.017, jin ? 0.18 : 0.135);
      cun(g, W * 0.10, H * 0.955, W * 0.30, 10, 11);
      cun(g, W * 0.90, H * 0.970, W * 0.22, 8, 23);
      tree(g, W * 0.285, H * 0.920, H * 0.140, W * 0.030, jin ? 0.30 : 0.21, 31);
      tree(g, W * 0.752, H * 0.934, H * 0.120, -W * 0.024, jin ? 0.24 : 0.17, 43);
    });
    // 近景：左右两株近树 + 两角坡石（横移 0.8，近世界速）
    const near = mk((g) => {
      stone(g, W * 0.06, H * 0.975, W * 0.46, H * 0.070, jin ? 0.16 : 0.10);
      stone(g, W * 0.94, H * 0.988, W * 0.40, H * 0.055, jin ? 0.12 : 0.075);
      tree(g, W * 0.150, H * 0.958, H * 0.240, W * 0.056, jin ? 0.62 : 0.46, 7);
      tree(g, W * 0.868, H * 0.985, H * 0.180, -W * 0.046, jin ? 0.50 : 0.36, 19);
    });
    // 世界坐标极淡肌理（随相机 1:1 移动，治「地面浮在原地」）
    const grainTile = (() => { const s = 256, c = document.createElement('canvas'); c.width = s; c.height = s; const g = c.getContext('2d'); for (let i = 0; i < 150; i++) { const x = Math.random() * s, y = Math.random() * s, r = 1 + Math.random() * 2.4; g.fillStyle = (Math.random() < 0.5 ? C.fog : C.mtn) + (jin ? 0.06 : 0.045) + ')'; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); } return c; })();
    const grain = ctx.createPattern(grainTile, 'repeat');

    pxCache = { w: W, h: H, skin, frame, far, mid, near, grain };
    return pxCache;
  }

  // ==========================================================================
  // 批次3（P1-2 地标 / P1-3 biome 装饰包 / P1-4 贴地明度块）
  //
  // 路线判断（先于动手）：本游戏是 480×H 无限滚动割草场地，没有瓦片、没有世界边界、
  // 没有地形数据。所以「贴图式地形」不做 PNG 贴图、不做逐格瓦片、不做 16 掩码 Wang 集 ——
  // 那些要么硬边方块（一地马赛克），要么每屏几千次 drawImage（掉帧）。正解是：
  //   ① 全部程序化离屏烘焙一次，按 skin/W/H/mapId/tone 缓存（换皮 / resize / 进图自动重建）；
  //   ② 贴地层 = 一张可无缝平铺的软边明度块 tile，createPattern 后每帧 1 次 fillRect；
  //   ③ 装饰 / 地标 = 小尺寸离屏 canvas，靠 blitSprOn 复用同一出口，视锥裁剪沿用 drawDecor；
  //   ④ 软边用 radialGradient 模拟宣纸洇染，绝不用硬边矩形；笔法与 parallaxLayers 同源；
  //   ⑤ 不引入彩色：墨皮用墨/纸灰阶，金皮用暗金暗部，全部低饱和；不碰 any 判定。
  //
  // 批次4：逐图原著考据驱动。Jerry 明确「不能全量铺开、不能按 arc/biome 机械分组」。
  //   · 唯一真源：mapCodex.json → codex/build-mapcodex.mjs → js/mapCodex.js（window.MAP_CODEX）；
  //   · 收录一张启用一张：白名单直接取台账 key，后续补台账无需再改本文件；
  //   · 装饰权重 / 地标（数量·类型·名称）/ 贴地类型 / 墨色浓淡，一律按 map.id 查台账；
  //   · 未收录的 153 张图 ensureScenery3() 返回 {on:false}，装饰与绘制走原逻辑，逐字节不变；
  //   · 台账未加载时白名单为空（全部短路），并在 __FR.scenery3().codexLoaded 暴露，绝不静默出图。
  // ==========================================================================
  const SC3_CODEX = (typeof window !== 'undefined' && window.MAP_CODEX && typeof window.MAP_CODEX === 'object') ? window.MAP_CODEX : null;
  // 第101轮 风格基线（Jerry 定调，标杆 shot-codex-qixuan.png）：纸色三元组与量化口径来自台账，
  // 缺 style 时 SC3_PAPER = null，sc3BakePaper 直接降级不铺纸 —— 缺字段不猜，绝不静默出图。
  const SC3_STYLE = (typeof window !== 'undefined' && window.MAP_CODEX_STYLE && typeof window.MAP_CODEX_STYLE === 'object') ? window.MAP_CODEX_STYLE : null;
  const SC3_PAPER = (SC3_STYLE && SC3_STYLE.paper && SC3_STYLE.paper.base) ? SC3_STYLE.paper : null;
  const SC3_SAMPLE = new Set(SC3_CODEX ? Object.keys(SC3_CODEX) : []);
  let SC3_ENABLED = true;   // 验收 A/B 探针：同一张图开/关三层，量每帧绘制增量（不影响正式运行）
  let SC3_UI_FLAG = null;   // 第102轮 UI 柔化：body.sc3-paper 挂/摘标记，只在状态翻转时动一次 DOM
  let SC3_SOFT_RING = false; // 第102轮：浅纸图上「圆形法阵」柔化总开关，每帧由 render 统一刷新
  let SC3_MOOD_DRAWS = 0;   // 第102轮验收探针：积墨罩累计绘制次数，证明每帧只贴 1 次
  let SC3_SIG = null;       // 第103轮验收探针：最后一次积墨罩实际画出的 mood.signature（只在烘焙路径赋值）
  const SC3_ON = (m) => !!(SC3_ENABLED && m && SC3_SAMPLE.has(m.id));
  const sc3CodexOf = (m) => (SC3_CODEX && m && SC3_CODEX[m.id]) || null;
  // 全量装饰类型：原 3 种 + 新增 9 种 = 12（P1-3 目标 ≥12）
  const SC3_TYPES = ['tree', 'rock', 'tuft', 'bamboo', 'pine', 'moss', 'puddle', 'mist', 'ruin', 'lantern', 'banner', 'bone'];
  function sc3Hash(str) { let h = 2166136261; str = String(str || ''); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return h >>> 0; }
  // 双皮调色：全部低饱和，墨皮墨/纸灰阶，金皮暗金暗部（金皮不纸化）
  // 批次4：tone 来自逐图台账（0.7~1.2），只缩放「新层墨色」的 RGB 通道 ——
  //   不改 alpha 结构、不改纸底 buildGrass / inkBg、不引入彩色、不碰判定。
  //   tone 小（矿洞 / 血池 / 黑煞）→ 墨更浓更幽；tone 大（太南雾山 / 药园）→ 墨更淡更亮。
  //   tone = 1 时输出与批次3 完全一致，保证已有观感零回归。
  // 第99轮「深底把淡墨层抬到浅灰」的临时方案已废止：那种白墨只适合黑底，
  //   在浅宣纸上会几乎看不见，且让 18 张图分成两套笔法。
  // 第101轮：纸底统一到浅宣纸后，dark 只表示「原深底图 → 需补铺宣纸 + 积墨」，
  //   墨色回归淡墨，仅略压深一档（×0.88）表达幽暗；色相不变、仍是低饱和灰阶。
  //   中国水墨画夜景 / 幽谷靠积墨，不靠把纸涂黑。
  function sc3Colors(jin, tone, dark) {
    const t = (typeof tone === 'number' && isFinite(tone)) ? Math.max(0.7, Math.min(1.2, tone)) : 1;
    const k = 1 + (t - 1) * 1.5;   // 适度放大逐图差异，仍锁在淡墨灰阶内
    const pal = jin
      ? { ink:[78,68,52], deep:[64,56,42], lite:[140,128,106], line:[96,84,64], water:[108,100,84], fog:[88,80,64] }
      : { ink:[84,80,70], deep:[66,62,54], lite:[140,134,120], line:[96,92,80], water:[112,110,100], fog:[92,88,76] };
    const C = {};
    for (const key in pal) {
      const rgb = pal[key].map(v => {
        const q = Math.max(24, Math.min(220, Math.round(v * k)));
        return dark ? Math.max(20, Math.round(q * 0.88)) : q;
      });
      C[key] = 'rgba(' + rgb.join(',') + ',';
    }
    return C;
  }
  // 与 buildGrass 完全同款取底：m.inkBg || m.bg，再看 base 亮度。
  // 亮度 < 110 判为「原生深墨底」（实测 9 张无 inkBg 的增补图 base 全在 #26~#4a 区间）。
  // 第101轮起该返回值驱动「是否补铺宣纸」，不再驱动墨色反相；判据不变，便于 QA 逐图核对。
  function sc3DarkBase(m) {
    const src = (m && (m.inkBg || m.bg)) || null;
    const hex = src && src.base;
    if (typeof hex !== 'string') return false;
    let h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    if (h.length !== 6) return false;
    const n = parseInt(h, 16);
    if (!isFinite(n)) return false;
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299*r + 0.587*g + 0.114*b) < 110;
  }
  // 离屏画一笔的程序化精灵：所有新装饰 / 地标共用这一处，风格统一、无外部资源
  function sc3Bake(kind, C, big, strong) {
    let c;
    try { c = document.createElement('canvas'); } catch (e) { return null; }
    if (!c || !c.getContext) return null;
    const S = big ? 88 : 40, Hh = big ? 92 : 48;
    c.width = S; c.height = Hh;
    const g = c.getContext('2d');
    if (!g || !g.beginPath) return null;              // smoke 垫片无真实绘图 API：降级
    // 整体 alpha 再压一档：装饰/地标是「退到纸后面的远景」，不能跟主角同亮度（第83轮 L1/L2 口径）
    // strong = 逐图主景：它现在是画面主角，不再「退到纸后」，用实笔与全 alpha；
    // 配景仍压 0.72，保持不与角色/法阵抢视线的旧纪律。
    const P = (col, a) => col + (a * (strong ? 1.0 : 0.72)).toFixed(3) + ')';
    const rect = (x,y,w,h,col,a) => { g.fillStyle = P(col,a); g.fillRect(x,y,w,h); };
    const line = (x0,y0,x1,y1,col,a,w) => { g.strokeStyle = P(col,a); g.lineWidth = w||1.4; g.lineCap='round'; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); };
    const ell = (x,y,rx,ry,col,a) => { g.fillStyle = P(col,a); g.beginPath(); g.ellipse(x,y,rx,ry,0,0,6.2832); g.fill(); };
    const cx = S/2;
    // 水墨笔法原语：断续笔线（带提按、段间留白）与没骨墨团（错位椭圆叠出不规则块）。
    // 用来替掉实心 rect() 直角块——那东西在画面上读起来像散落的方形图标，不是笔触。
    const brush = (x0,y0,x1,y1,col,a,w) => {
      for (let i=0;i<3;i++) {
        const t0=i/3, t1=strong ? (i+1)/3 : (i+0.72)/3;   // 主景连续实笔，配景断续虚笔
        line(x0+(x1-x0)*t0, y0+(y1-y0)*t0, x0+(x1-x0)*t1, y0+(y1-y0)*t1,
             col, a*(strong ? 1 : 1-i*0.18), w);
      }
    };
    const blob = (x,y,rx,ry,col,a) => {
      ell(x,y,rx,ry,col,a);
      ell(x-rx*0.35,y-ry*0.25,rx*0.62,ry*0.70,col,a*0.60);
      ell(x+rx*0.38,y+ry*0.22,rx*0.55,ry*0.62,col,a*0.50);
    };
    try {
      switch (kind) {
        // 第101轮 风格基线：收录图的原 3 种 tree / rock / tuft 也改用灰阶新层，
        // 不再走带绿色的 window.Sprites —— 标杆 qixuan 的纯灰阶必须覆盖全部 12 种装饰。
        case 'tree': // 杂树：斜干 + 疏枝 + 三两没骨叶团（与 pine 的横层点叶区分）
          brush(cx+2,Hh-3, cx-4,14, C.ink,0.58,2.4);
          brush(cx-1,32, cx-12,20, C.ink,0.42,1.5);
          brush(cx,26, cx+10,16, C.ink,0.40,1.5);
          brush(cx-2,20, cx-8,10, C.line,0.30,1.1);
          blob(cx-11,18,6,4,C.ink,0.26); blob(cx+9,15,6,4,C.ink,0.24); blob(cx-4,11,5,3,C.deep,0.20);
          break;
        case 'rock': // 孤石：三笔石棱 + 淡墨块面，无苔点（与 moss 区分）
          blob(cx,Hh-14,11,8,C.ink,0.22);
          brush(cx-11,Hh-10, cx-6,Hh-26, C.ink,0.46,1.8);
          brush(cx-6,Hh-26, cx+4,Hh-28, C.ink,0.40,1.5);
          brush(cx+4,Hh-28, cx+11,Hh-16, C.ink,0.34,1.4);
          brush(cx-9,Hh-7, cx+9,Hh-7, C.deep,0.24,1.2);
          break;
        case 'tuft': // 草簇：五笔斜出短草 + 根部一点淡墨
          ell(cx,Hh-4,9,2.5,C.deep,0.16);
          for(let i=0;i<5;i++){
            const bx=cx+(i-2)*3.4, h=14+((i*7)%6), lean=(i-2)*2.2;
            brush(bx,Hh-5, bx+lean,Hh-5-h, C.ink,0.34,1.3);
          }
          break;
        case 'bamboo': // 竹：两三根略带弧度的竿 + 点叶簇（不画横节/对称斜叶，避免笔直交叉成井字栅栏）
          for (let k=0;k<3;k++){
            const bx=cx-9+k*9, top=8+k*4, lean=(k-1)*3;
            g.strokeStyle=P(C.ink,0.6); g.lineWidth=2.0; g.lineCap='round';
            g.beginPath(); g.moveTo(bx,Hh-3); g.quadraticCurveTo(bx+lean*0.4,Hh*0.5,bx+lean,top); g.stroke();
            for(let l=0;l<4;l++){ const yy=top+3+l*6, d=(l%2?1:-1); ell(bx+lean+d*(3+l*1.2),yy-2,3.4,1.5,C.ink,0.42); }
          }
          break;
        case 'pine': // 松：斜干 + 三层点叶墨团（不画横展针线，避免横竖交叉成网格）
          line(cx+6,Hh-3,cx-5,12,C.ink,0.66,2.8);
          for(let l=0;l<3;l++){ const yy=16+l*11, w=15-l*2; for(let n=0;n<6;n++){ const px=cx-3-w/2+n*(w/5); ell(px,yy+Math.sin(n*1.7)*2,3.2,1.9,C.ink,0.38); } }
          break;
        case 'moss': // 苔石：皴笔勾石棱 + 淡墨块面 + 顶部苔点（成丛时不再是「一坨圆灰球」）
          blob(cx,Hh-15,13,9,C.ink,0.30);
          line(cx-13,Hh-12, cx-7,Hh-27, C.ink,0.48,1.6);
          line(cx-7,Hh-27, cx+5,Hh-30, C.ink,0.42,1.4);
          line(cx+5,Hh-30, cx+13,Hh-18, C.ink,0.38,1.4);
          line(cx-11,Hh-8, cx+11,Hh-8, C.deep,0.28,1.2);
          for(let i=0;i<5;i++) ell(cx-8+i*4,Hh-27+((i*5)%4),1.5,1.1,C.deep,0.40);
          break;
        case 'puddle': // 水洼：浅椭圆 + 波纹
          ell(cx,Hh-12,17,6,C.water,0.30); ell(cx,Hh-12,17,6,C.lite,0.08);
          line(cx-9,Hh-13,cx+6,Hh-13,C.line,0.4,1); line(cx-6,Hh-10,cx+9,Hh-10,C.line,0.3,0.9);
          break;
        case 'mist': // 云气：三道横向柔带
          for(let l=0;l<3;l++){ g.strokeStyle=P(C.fog,0.22-l*0.04); g.lineWidth=3.4-l*0.6; g.beginPath(); const yy=Hh-14-l*8; g.moveTo(3,yy); g.quadraticCurveTo(cx,yy-5,S-3,yy); g.stroke(); }
          break;
        case 'ruin': // 残垣：两段断墙笔 + 一道横断缝（不画实心方块）
          brush(cx-11,Hh-3, cx-11,Hh-28, C.ink,0.52,2.8);
          brush(cx+9,Hh-3, cx+9,Hh-21, C.ink,0.44,2.4);
          brush(cx-13,Hh-30, cx+2,Hh-27, C.deep,0.40,1.8);
          brush(cx+2,Hh-23, cx+12,Hh-21, C.line,0.30,1.2);
          blob(cx-11,Hh-29,5,3,C.deep,0.28);
          break;
        case 'lantern': // 石灯：笔柱 + 没骨灯室 + 一笔顶盖
          brush(cx,Hh-4, cx,Hh-21, C.ink,0.60,2.6);
          brush(cx-8,Hh-4, cx+8,Hh-4, C.deep,0.55,2.4);
          blob(cx,Hh-26,7,5,C.ink,0.50);
          ell(cx,Hh-26,3.4,2.4,C.lite,0.30);
          brush(cx-10,Hh-32, cx+10,Hh-32, C.deep,0.60,2.2);
          brush(cx,Hh-32, cx,Hh-36, C.deep,0.45,1.4);
          break;
        case 'banner': // 经幡：竖杆 + 没骨下垂旗
          brush(cx-6,Hh-3, cx-6,6, C.ink,0.65,2.0);
          blob(cx+2,18,6,10,C.ink,0.38);
          brush(cx-6,7, cx+9,7, C.deep,0.52,1.6);
          brush(cx+1,12, cx+1,26, C.line,0.26,1.0);
          break;
        case 'bone': // 骨殖：两根长骨 + 一个颅骨
          line(cx-11,Hh-6,cx+7,Hh-22,C.lite,0.5,3); line(cx+8,Hh-8,cx-9,Hh-24,C.lite,0.45,2.6);
          ell(cx-8,Hh-24,3,3,C.lite,0.5); ell(cx+8,Hh-22,3,3,C.lite,0.45); ell(cx+2,Hh-12,5,4,C.lite,0.45);
          ell(cx+0.5,Hh-13,1,1.1,C.deep,0.5); ell(cx+3.5,Hh-13,1,1.1,C.deep,0.5);
          break;
        // ---- 地标（big）----
        case 'gate': // 山门：双柱笔 + 断续横梁 + 压低檐角
          brush(cx-22,86, cx-22,26, C.ink,0.52,3.0);
          brush(cx+22,86, cx+22,26, C.ink,0.52,3.0);
          brush(cx-30,22, cx+30,22, C.deep,0.60,2.8);
          brush(cx-34,14, cx+34,14, C.ink,0.48,2.2);
          brush(cx-30,40, cx+30,40, C.line,0.30,1.4);
          brush(cx-34,14, cx-24,7, C.deep,0.38,1.8);
          brush(cx+34,14, cx+24,7, C.deep,0.38,1.8);
          break;
        case 'stele': // 断碑：没骨碑身 + 断续刻痕（不画实心矩形）
          blob(cx,52,13,30,C.ink,0.46);
          brush(cx-13,24, cx-5,16, C.deep,0.44,2.0);
          brush(cx-3,20, cx+5,15, C.deep,0.44,2.0);
          brush(cx+7,18, cx+13,13, C.deep,0.44,2.0);
          for(let i=0;i<4;i++) brush(cx-7,38+i*11, cx+6,38+i*11, C.deep,0.34,1.1);
          brush(cx-20,84, cx+20,84, C.deep,0.50,2.4);
          break;
        case 'well': // 枯井：双环 + 笔线辘轳架
          ell(cx,60,24,10,C.ink,0.46); ell(cx,60,17,6.5,C.deep,0.56);
          brush(cx-22,60, cx-22,28, C.deep,0.52,2.0);
          brush(cx+22,60, cx+22,28, C.deep,0.52,2.0);
          brush(cx-23,28, cx+23,28, C.ink,0.48,2.2);
          brush(cx+8,28, cx+8,44, C.line,0.30,1.2);
          break;
        case 'bones': // 骨堆：多根骨 + 颅骨
          for(let i=0;i<5;i++) line(cx-24+i*3,80-i*4,cx+18-i*2,68+i*2,C.lite,0.42,2.6);
          ell(cx-4,62,9,8,C.lite,0.5); ell(cx-7,61,1.8,2.2,C.deep,0.55); ell(cx-1,61,1.8,2.2,C.deep,0.55);
          break;
        case 'stair': // 石阶：几道断续横笔，斜向错开（不画笔直井字）
          for(let i=0;i<4;i++){ const y=52+i*9, w=18+i*6, ox=i*3;
            brush(cx-w+ox,y, cx+w+ox,y, C.ink,0.40-i*0.05,2.2);
          }
          break;
        case 'lanternmark': // 幡杆地标：高杆 + 没骨长幡
          brush(cx,Hh-3, cx,8, C.ink,0.60,2.6);
          blob(cx+7,29,7,17,C.ink,0.34);
          brush(cx,8, cx+18,8, C.deep,0.50,1.6);
          brush(cx+7,18, cx+7,42, C.line,0.26,1.0);
          break;
        case 'lanternbig': // 大石灯：笔柱 + 没骨灯室 + 一笔飞檐
          brush(cx-20,Hh-8, cx+20,Hh-8, C.deep,0.52,2.8);
          brush(cx-14,Hh-14, cx+14,Hh-14, C.ink,0.46,2.4);
          brush(cx,Hh-16, cx,Hh-42, C.ink,0.50,3.0);
          blob(cx,Hh-50,13,9,C.ink,0.46);
          ell(cx,Hh-50,6,4,C.lite,0.28);
          brush(cx-20,Hh-62, cx+20,Hh-62, C.deep,0.56,2.6);
          brush(cx,Hh-62, cx,Hh-69, C.deep,0.46,2.0);
          ell(cx,Hh-71,3,3,C.lite,0.36);
          break;
        // ---- 批次4 构图化：逐图原著专属主景（big 画布，只画 1 个）----
        // 全部由 mapCodex.json 的 composition.focusCase 指定，focus 文字即原著景物。
        case 'narrowgate': // 彩霞山 / 黄枫谷山门：双柱收窄、檐角压低，石阶斜向
          brush(cx-20,82, cx-20,30, C.ink,0.66,3.8);
          brush(cx+20,82, cx+20,30, C.ink,0.66,3.8);
          brush(cx-28,30, cx+28,30, C.deep,0.70,3.4);
          brush(cx-32,23, cx+32,23, C.ink,0.56,2.6);
          brush(cx-30,23, cx-22,17, C.deep,0.46,2.0);
          brush(cx+30,23, cx+22,17, C.deep,0.46,2.0);
          brush(cx-23,82, cx+23,82, C.deep,0.40,2.0);   // 门槛，把两根柱子收成一座门
          for(let i=0;i<4;i++) brush(cx-24-i*3, 60+i*6, cx-8+i*5, 62+i*6, C.line,0.30-i*0.04,1.6);
          break;
        case 'pool': // 乌龙潭 / 赤水峰石潭：不闭合岸线围出一汪水 + 水纹 + 水边短苇
          // 不再用三层实心椭圆（会读成「一个石盘」），也不再画两根长斜杆（会读成支架）。
          ell(cx,60,28,10,C.water,0.12);
          try {
            g.strokeStyle=P(C.ink,0.48); g.lineWidth=2.2; g.lineCap='round';
            g.beginPath(); g.ellipse(cx,60,28,11,0,0.30,2.85); g.stroke();   // 前岸（留缺口）
            g.beginPath(); g.ellipse(cx,60,28,11,0,3.40,6.00); g.stroke();   // 后岸（留缺口）
          } catch (e) { /* 垫片降级 */ }
          for(let i=0;i<3;i++) brush(cx-18+i*3,57+i*3, cx+10-i*4,57+i*3, C.line,0.16,1.0);
          brush(cx-30,70, cx-19,76, C.deep,0.28,1.6);
          brush(cx+18,75, cx+30,69, C.deep,0.28,1.6);
          for(let i=0;i<5;i++){                       // 岸边短苇：几笔斜出，不抢主笔
            const px=cx-26+i*13, py=44+(i%2)*5, d=(i%2?1:-1);
            brush(px,py+10, px+d*4,py, C.ink,0.32,1.3);
            brush(px+d*4,py, px+d*7,py-5, C.line,0.22,0.9);
          }
          break;
        case 'stonehut': // 墨大夫无窗石屋：草草粉刷的石墙略带欹斜，石缝皴擦，只一道石门（无窗）
          ell(cx-7,48,17,11,C.ink,0.12);                // 偏一侧的墙面阴影，不居中，避免读成「镜子」
          for(let i=0;i<3;i++) brush(cx-21,43+i*8, cx+17,42+i*8, C.line,0.16,1.0);  // 石料垒缝
          brush(cx-27,66, cx-25,33, C.deep,0.62,2.8);   // 左墙略斜
          brush(cx+26,66, cx+28,31, C.deep,0.62,2.8);   // 右墙略斜
          brush(cx-30,32, cx+30,30, C.deep,0.66,3.2);   // 平顶略斜（非三角，与太南寺区分）
          brush(cx-28,67, cx+28,66, C.ink,0.50,2.4);
          brush(cx-5,67, cx-5,50, C.deep,0.58,2.2);     // 门洞留白
          brush(cx+5,67, cx+5,50, C.deep,0.58,2.2);
          brush(cx-5,50, cx+5,50, C.deep,0.52,1.8);
          try {
            g.strokeStyle=P(C.line,0.28); g.lineWidth=1.2;
            g.beginPath(); g.ellipse(cx,76,26,8,0,0,6.2832); g.stroke();
            g.beginPath(); g.ellipse(cx,76,17,5,0,0,6.2832); g.stroke();
          } catch (e) { /* 垫片降级 */ }
          for(let i=0;i<8;i++){ const a=i/8*6.2832; ell(cx+Math.cos(a)*30,76+Math.sin(a)*9,2.2,2.2,C.lite,0.46); }
          break;
        case 'temple': // 太南山顶小寺：三角屋顶 + 塔身 + 台基（与石屋的平顶明确区分），下衬山脊云带
          brush(cx-26,40, cx,22, C.deep,0.62,3.2);
          brush(cx,22, cx+26,40, C.deep,0.62,3.2);
          brush(cx-30,41, cx+30,41, C.ink,0.56,2.8);
          brush(cx-14,43, cx-13,72, C.ink,0.52,2.8);
          brush(cx+14,43, cx+13,72, C.ink,0.52,2.8);
          brush(cx-18,73, cx+18,73, C.deep,0.50,2.6);
          brush(cx-8,56, cx+8,56, C.line,0.30,1.4);
          for(let i=0;i<3;i++) brush(cx-40+i*4,82+i*4, cx+38-i*6,82+i*4, C.fog,0.17-i*0.04,3.2);
          break;
        case 'stonering': // 中心区石墙大圆圈 + 四道铜门 + 环形迷雾山脉
          try {
            g.strokeStyle=P(C.ink,0.48); g.lineWidth=2.6; g.lineCap='round';
            for(let i=0;i<8;i++){ const a0=i/8*6.2832+0.06, a1=(i+0.82)/8*6.2832;
              g.beginPath(); g.ellipse(cx,52,34,20,0,a0,a1); g.stroke(); }
            for(let i=0;i<2;i++){ g.strokeStyle=P(C.fog,0.16-i*0.05); g.lineWidth=3.2-i;
              g.beginPath(); g.ellipse(cx,52,42+i*4,26+i*3,0,3.4,6.0); g.stroke(); }
          } catch (e) { /* 垫片降级 */ }
          for(let i=0;i<4;i++){
            const a=i/4*6.2832+0.785, px=cx+Math.cos(a)*34, py=52+Math.sin(a)*20;
            brush(px-3,py+4, px-3,py-5, C.deep,0.58,2.0);
            brush(px+3,py+4, px+3,py-5, C.deep,0.58,2.0);
            brush(px-5,py-5, px+5,py-5, C.deep,0.48,1.6);
          }
          break;
        case 'grove': // 皇城小竹林：竹竿带节 + 披针点叶；取消压顶横墨（那会把竹林读成栅栏）
          for(let k=0;k<5;k++){
            const bx=cx-30+k*15, top=18+(k%3)*8, lean=(k%2?5:-5);
            brush(bx,86, bx+lean,top, C.ink,0.52-k*0.05,2.4);
            for(let j=0;j<2;j++){ const yy=44+j*22; brush(bx-3,yy, bx+3,yy, C.deep,0.30,1.2); }  // 竹节
            for(let l=0;l<3;l++){                       // 披针叶：斜出短笔，不是小圆点
              const yy=top+6+l*9, d=(l%2?1:-1);
              brush(bx+lean,yy, bx+lean+d*9,yy-4, C.ink,0.36,1.6);
              brush(bx+lean,yy+2, bx+lean+d*7,yy+3, C.line,0.24,1.2);
            }
          }
          for(let i=0;i<2;i++) brush(cx-40,84+i*4, cx+38,84+i*4, C.fog,0.12-i*0.04,2.4);  // 地面淡雾
          break;
        case 'minehead': // 塌方斜坡 + 笔线围出的半掩洞口（不画大圆墨团）+ 阵旗 + 钟乳
          brush(cx-40,72, cx-16,32, C.ink,0.54,2.8);
          brush(cx-32,76, cx-10,40, C.deep,0.40,2.2);
          brush(cx-8,52, cx+2,44, C.deep,0.56,2.6);
          brush(cx+2,44, cx+16,48, C.deep,0.56,2.6);
          brush(cx+16,48, cx+20,74, C.ink,0.50,2.4);
          brush(cx-8,52, cx-10,74, C.ink,0.50,2.4);
          ell(cx+5,62,9,7,C.fog,0.08);                // 洞里一点微光，仍留白
          brush(cx+26,84, cx+24,34, C.ink,0.58,2.4);
          brush(cx+24,36, cx+38,36, C.deep,0.48,1.6);
          blob(cx+33,46,7,11,C.ink,0.36);
          for(let i=0;i<3;i++) brush(cx-6+i*8,32, cx-6+i*8,42+(i%2)*5, C.lite,0.28,1.6);
          break;
        case 'shed': // 歪斜棚檐：斜顶 + 檐口垂草 + 一角木案（去掉居中椭圆，避免与 pool 雷同）
          brush(cx-28,82, cx-24,44, C.ink,0.54,2.6);
          brush(cx+26,82, cx+30,42, C.ink,0.50,2.6);
          brush(cx-30,44, cx+34,36, C.deep,0.56,2.6);   // 棚顶斜势（与山门平横梁区分）
          brush(cx-34,38, cx+38,30, C.ink,0.40,2.0);    // 二重檐
          for(let i=0;i<6;i++) brush(cx-26+i*11,43+i*0.6, cx-26+i*11,49+i*0.6, C.line,0.26,1.0); // 垂草
          brush(cx-16,82, cx+14,82, C.deep,0.44,2.2);   // 木案台面
          brush(cx-12,82, cx-12,70, C.ink,0.36,1.4);
          brush(cx+10,82, cx+10,70, C.ink,0.36,1.4);
          break;
        // ---- 第103轮 · 第二批 3 个原著专属主景（big 画布）----
        case 'furnace': // 地火之屋：扁平坞石圆敦 + 八枚龙首 + 八道细火托起银丝鼎
          ell(cx,64,30,9,C.ink,0.10);
          try {
            g.strokeStyle=P(C.deep,0.58); g.lineWidth=2.4; g.lineCap='round';
            g.beginPath(); g.ellipse(cx,64,30,10,0,0.15,3.00); g.stroke();   // 前缘留缺口，不画成石盘
            g.beginPath(); g.ellipse(cx,64,30,10,0,3.30,6.05); g.stroke();
          } catch (e) { /* 垫片降级 */ }
          for(let i=0;i<8;i++){                       // 八枚龙首沿椭圆外缘斜出，口部对准圆心
            const a=i/8*6.2832, px=cx+Math.cos(a)*30, py=64+Math.sin(a)*9;
            brush(px,py, px+(cx-px)*0.22, py+(44-py)*0.22, C.deep,0.50,2.0);
            ell(px,py,3.4,2.8,C.ink,0.44);
          }
          for(let i=0;i<8;i++){                       // 八道细火：双笔成簇，只取斜势，不落紫火颜色
            const a=i/8*6.2832, px=cx+Math.cos(a)*24, py=64+Math.sin(a)*7;
            const tx=cx+(i%2?3:-3), ty=44+(i%3)*2;
            brush(px,py-1, tx,ty, C.ink,0.42,1.3);
            brush(px+2,py-2, tx-1,ty+6, C.line,0.26,0.9);
          }
          brush(cx-12,40, cx+12,40, C.deep,0.62,2.6); // 银丝鼎：鼎口 + 两耳 + 斜腹 + 三足
          brush(cx-12,40, cx-9,50, C.deep,0.50,2.0);
          brush(cx+12,40, cx+9,50, C.deep,0.50,2.0);
          brush(cx-9,50, cx+9,50, C.ink,0.44,1.8);
          brush(cx-15,38, cx-17,34, C.ink,0.40,1.5);
          brush(cx+15,38, cx+17,34, C.ink,0.40,1.5);
          brush(cx-6,50, cx-7,55, C.line,0.30,1.2);
          brush(cx+6,50, cx+7,55, C.line,0.30,1.2);
          ell(cx-38,34,4,6,C.fog,0.16); ell(cx+38,34,4,6,C.fog,0.16);  // 四壁火星砂葫芦，退到纸后
          break;
        case 'ship': // 魁星岛巨舟：翘首船身 + 桅杆淡墨帆 + 远帆退入海雾横带
          for(let i=0;i<3;i++) brush(cx-42,70+i*7, cx+40-i*5,70+i*7, C.fog,0.16-i*0.04,2.0);
          brush(cx-34,64, cx+32,64, C.deep,0.62,3.0);
          brush(cx-34,64, cx-29,55, C.deep,0.52,2.4);
          brush(cx+32,64, cx+28,55, C.deep,0.52,2.4);
          brush(cx-36,64, cx-30,68, C.ink,0.44,1.8);
          brush(cx+34,64, cx+28,68, C.ink,0.44,1.8);
          brush(cx-4,62, cx-4,14, C.deep,0.66,2.6);
          // 淡墨帆：三边笔线 + 一道鼓风弧，不用实心墨团（实拍里会读成一颗球）
          brush(cx-3,18, cx+18,24, C.deep,0.50,1.8);   // 上桁
          brush(cx-3,18, cx-3,50, C.line,0.30,1.4);    // 前缘贴桅
          brush(cx+18,24, cx+4,50, C.deep,0.46,1.8);   // 斜后缘
          brush(cx-3,50, cx+4,50, C.ink,0.38,1.6);     // 下缘
          try {
            g.strokeStyle=P(C.fog,0.26); g.lineWidth=1.2;
            g.beginPath(); g.moveTo(cx+1,26); g.quadraticCurveTo(cx+14,34,cx+3,46); g.stroke();
          } catch (e) { /* 垫片降级 */ }
          for(let i=0;i<3;i++){                       // 远帆：三点淡墨，横带层次
            const px=cx-32+i*27, py=44+(i%2)*6;
            brush(px,py, px,py-9, C.fog,0.22,1.2);
            brush(px,py-9, px+5,py-6, C.fog,0.18,1.0);
          }
          break;
        case 'reef': // 红瑚岛：不闭合环形珊瑚礁围静水 + 环心孤礁一株卷叶霓裳草
          try {
            g.strokeStyle=P(C.deep,0.52); g.lineWidth=2.4; g.lineCap='round';
            g.beginPath(); g.ellipse(cx,60,36,17,0,0.35,2.80); g.stroke();
            g.beginPath(); g.ellipse(cx,60,36,17,0,3.45,5.95); g.stroke();
            g.strokeStyle=P(C.fog,0.18); g.lineWidth=2.0;
            g.beginPath(); g.ellipse(cx,60,42,21,0,3.6,5.8); g.stroke();
          } catch (e) { /* 垫片降级 */ }
          ell(cx,60,26,11,C.water,0.10);
          for(let i=0;i<3;i++) brush(cx-20+i*5,58+i*4, cx+14-i*6,58+i*4, C.line,0.14,1.0);
          ell(cx,62,9,4,C.ink,0.16);
          brush(cx,60, cx,38, C.deep,0.58,1.8);        // 单茎
          for(let i=0;i<5;i++){                        // 卷曲圆筒叶：浓墨斜笔 + 卷口小椭圆，不画圆点
            const d=(i%2?1:-1), yy=42+i*4;
            brush(cx,yy, cx+d*13,yy-7, C.deep,0.48,1.6);
            ell(cx+d*14,yy-8,3.4,2.4,C.ink,0.34);
          }
          for(let i=0;i<5;i++){                        // 环外零星礁石：石棱皴笔，不是灰球
            const a=i/5*6.2832, px=cx+Math.cos(a)*36, py=60+Math.sin(a)*17;
            brush(px-3,py+2, px+2,py-4, C.deep,0.34,1.6);
            brush(px+2,py-4, px+5,py-2, C.line,0.20,1.0);
          }
          break;
        // ---- 第104轮 · 第三批 6 个原著专属主景（big 画布）----
        // 纪律沿用第103轮实拍复盘：不用实心圆球当帆、不用通长竖线当竹林、
        // 不用实心 rect 当石壁；全部断续笔线 / 没骨墨团 / 石棱皴擦 + 软边淡出罩。
        case 'floatingpalace': // 虚天殿：悬在千丈云海上的百丈白玉琼楼，重檐玉柱，下方大片留白
          for(let i=0;i<3;i++) brush(cx-40,70+i*6, cx+38-i*4,70+i*6, C.fog,0.18-i*0.045,2.2);
          brush(cx-34,26, cx+34,26, C.ink,0.50,2.2);          // 上重檐
          brush(cx-34,26, cx-26,19, C.deep,0.42,1.8);           // 两端翘角
          brush(cx+34,26, cx+26,19, C.deep,0.42,1.8);
          brush(cx-30,34, cx+30,34, C.deep,0.62,2.8);           // 下重檐
          for(let i=0;i<4;i++){                                  // 玉柱断续，门洞留白
            const px=cx-22+i*15;
            brush(px,36, px,58, C.ink,0.46,2.0);
          }
          brush(cx-32,58, cx+32,58, C.deep,0.54,2.4);           // 台基
          brush(cx-36,62, cx+36,62, C.line,0.30,1.4);
          ell(cx,42,26,16,C.lite,0.06);                          // 莹光只取明度，不引金色
          brush(cx-8,20, cx+8,20, C.fog,0.14,1.2);              // 檐上极淡云气
          break;
        case 'bamboostand': // 妙音门/青竹小轩：茶旗幡铺面檐角 + 三竿带弧度的金雷竹与点叶
          brush(cx-38,44, cx+6,36, C.deep,0.52,2.2);             // 铺面斜檐
          brush(cx-38,44, cx-36,58, C.ink,0.44,1.8);
          brush(cx-26,58, cx-26,14, C.ink,0.56,2.0);             // 幡杆
          blob(cx-19,24,6,9,C.ink,0.30);                          // 没骨下垂旗，不用实心矩形
          brush(cx-26,15, cx-14,15, C.deep,0.44,1.6);
          for(let i=0;i<3;i++){                                  // 竹竿两段成弧，斜叶打断竖势
            const bx=cx+6+i*11, lean=(i%2?4:-3);
            brush(bx,78, bx+lean*0.5,48, C.deep,0.52,2.0);
            brush(bx+lean*0.5,48, bx+lean,26+i*3, C.ink,0.44,1.6);
            for(let j=0;j<3;j++){
              const yy=34+j*11, ex=bx+lean*0.7+(j%2?9:-8);
              brush(bx+lean*0.7,yy, ex,yy-5, C.deep,0.34,1.3);
              ell(ex,yy-5,2.4,1.6,C.line,0.24);
            }
          }
          brush(cx-36,76, cx-14,76, C.deep,0.44,1.8);            // 案上玉盒与两寸枯竹
          brush(cx-30,76, cx-22,73, C.ink,0.34,1.2);
          break;
        case 'deadsea': // 无边海：无风无浪的死水横带 + 水下浮起的一道软边墨雾，海面大片留白
          for(let i=0;i<4;i++){
            const yy=50+i*10, w=40-i*3;
            brush(cx-w,yy, cx+w-6,yy, C.fog,0.13+i*0.025,1.6);
          }
          for(let i=0;i<4;i++){                                  // 错叠淡墨团，不涂实心黑块
            const px=cx-14+i*9, py=42+(i%2)*3;
            ell(px,py,12-i*1.5,6,C.ink,0.07+i*0.02);
          }
          ell(cx,40,20,8,C.deep,0.10);
          brush(cx+18,72, cx+34,72, C.line,0.18,1.6);            // 一角舟影
          brush(cx+24,72, cx+25,66, C.line,0.14,1.2);
          break;
        case 'stoneroom': // 青金石空石室 / 结婴静室：三面粗糙石壁 + 一座低石台 + 悬垂符线
          brush(cx-34,78, cx-32,24, C.ink,0.50,2.6);             // 左壁
          brush(cx+34,78, cx+32,22, C.ink,0.48,2.6);             // 右壁
          brush(cx-30,32, cx-24,40, C.line,0.26,1.2);            // 斧劈皴
          brush(cx-31,52, cx-26,58, C.line,0.22,1.2);
          brush(cx+30,36, cx+25,44, C.line,0.24,1.2);
          brush(cx-32,22, cx-12,20, C.deep,0.44,2.0);            // 顶壁中间留口
          brush(cx+14,20, cx+32,22, C.deep,0.42,2.0);
          brush(cx-14,70, cx+14,70, C.deep,0.56,2.4);            // 低石台
          brush(cx-14,70, cx-11,62, C.ink,0.42,1.8);
          brush(cx+14,70, cx+11,62, C.ink,0.42,1.8);
          brush(cx,20, cx,52, C.line,0.22,1.1);                   // 一道悬垂符线
          ell(cx,54,3,2,C.deep,0.34);
          for(let i=0;i<4;i++) brush(cx-28+i*18,44+(i%2)*8, cx-24+i*18,48+(i%2)*8, C.fog,0.14,1.0);
          break;
        case 'stormpeak': // 阴冥之地暴风山：半截黑石巨山插进阴云。实拍两轮后定稿：
          // 不画左右对称的两条长斜线（那会读成 A 字三角架），改「没骨墨团做体积 + 左侧一道断续陡崖 + 斜皴」。
          for(let i=0;i<3;i++) brush(cx-38,14+i*7, cx+36-i*5,14+i*7, C.fog,0.20-i*0.05,2.4);
          ell(cx-8,32,24,6,C.fog,0.10);                          // 云带把山尖吞掉，上端不收口
          blob(cx-12,54,15,24,C.deep,0.13);                      // 竖长暗部：山体是块面不是线框
          blob(cx-20,68,11,14,C.ink,0.11);                       // 向左下延展的山脚
          ell(cx-4,42,9,13,C.deep,0.09);                         // 右肩
          brush(cx-20,34, cx-23,49, C.deep,0.56,3.0);            // 左崖断续三段，近竖略斜
          brush(cx-24,52, cx-27,66, C.deep,0.48,2.6);
          brush(cx-28,69, cx-30,80, C.ink,0.40,2.0);
          brush(cx-4,36, cx+2,48, C.ink,0.40,2.0);              // 右肩只收一小段，不画对应长边
          brush(cx+3,52, cx+7,60, C.line,0.26,1.4);
          for(let i=0;i<5;i++) brush(cx-22+i*5,44+i*7, cx-17+i*5,49+i*7, C.line,0.26-i*0.025,1.2);
          brush(cx-38,80, cx-18,80, C.ink,0.44,2.2);             // 山脚高墙，中间断开
          brush(cx+16,80, cx+38,80, C.ink,0.42,2.2);
          brush(cx-34,80, cx-34,72, C.line,0.24,1.4);
          brush(cx+34,80, cx+34,72, C.line,0.24,1.4);
          break;
        case 'clanhall': // 韩家祠 / 阗天城 / 付家堡：收窄门框 + 只勾边框的匾 + 断续院墙与斜树
          brush(cx-18,80, cx-18,32, C.ink,0.60,3.0);
          brush(cx+18,80, cx+18,32, C.ink,0.58,3.0);
          brush(cx-24,32, cx+24,32, C.deep,0.62,2.8);
          brush(cx-28,24, cx+28,24, C.ink,0.48,2.0);
          brush(cx-10,36, cx+10,36, C.deep,0.46,1.6);            // 匾只勾三边，中间留白
          brush(cx-10,36, cx-10,46, C.line,0.30,1.2);
          brush(cx+10,36, cx+10,46, C.line,0.30,1.2);
          brush(cx-10,46, cx+10,46, C.line,0.26,1.2);
          brush(cx-40,58, cx-20,58, C.ink,0.38,2.0);             // 院墙断续，不成通长栅栏
          brush(cx+20,58, cx+40,58, C.ink,0.36,2.0);
          brush(cx-38,58, cx-38,72, C.line,0.22,1.2);
          brush(cx+30,80, cx+34,52, C.deep,0.46,2.0);            // 一株斜树压角
          brush(cx+34,58, cx+24,50, C.line,0.28,1.3);
          brush(cx+34,64, cx+42,58, C.line,0.24,1.3);
          blob(cx+30,48,6,4,C.fog,0.16);
          break;
        // 第105轮 第四批（人界篇收官）7 个新主景。
        // 实拍复修（第105轮第二轮）：初版全是细线线稿，jixi 读成脚手架、zhenmo 读成货架、
        // xiaoji 读成墙角、bianjie 读成路牌。标杆 qixuan 的牌坊虽也有直边，但靠石棱皴擦、
        // 云带托底与浓淡层次撑住体积。故本轮一律改为「没骨墨团块面打底 + 短断续笔线提骨」，
        // 删掉通长横杠、Γ 形直角、层间等宽的对称横线；体积靠 blob 叠，不靠线框。
        case 'battleline': // 慕兰边界：两侧淡墨阵旗成丛，中间大片无人地带留白
          blob(cx-27,52,15,13,C.fog,0.20);                    // 左阵旗影成丛（没骨块面）
          blob(cx-34,46,9,9,C.ink,0.14);
          blob(cx+28,58,12,9,C.fog,0.13);                     // 右阵更远更淡，不镜像对称
          blob(cx+35,53,7,6,C.line,0.10);
          brush(cx-32,58, cx-30,40, C.deep,0.46,2.0);         // 幡杆只露几截短斜笔，不立通长竖杆
          brush(cx-30,40, cx-26,37, C.line,0.30,1.3);
          blob(cx-23,43,6,8,C.ink,0.30);                      // 旗面用墨团而非方形
          brush(cx-27,34, cx-17,34, C.deep,0.34,1.5);
          brush(cx-18,64, cx-8,63, C.line,0.24,1.2);          // 阵前断续短笔，不成通长横杠
          brush(cx+8,67, cx+16,66, C.line,0.20,1.1);
          brush(cx+22,61, cx+30,62, C.fog,0.18,1.0);
          for(let i=0;i<3;i++) ell(cx+22+i*6,50+i*4,3.5,1.8,C.line,0.12); // 极淡人马影
          ell(cx,26,26,6,C.fog,0.06);                         // 上方极淡天光
          break;
        case 'desertruin': // 极西之地：沙丘没骨横带里半埋的几截斜断柱，不成门框
          blob(cx-26,66,20,9,C.fog,0.20);                       // 三团沙丘错落，不排成直线
          blob(cx+8,70,22,8,C.fog,0.16);
          blob(cx+32,62,12,6,C.fog,0.11);
          brush(cx-34,62, cx-28,44, C.ink,0.48,2.4);            // 左断柱：斜、只有一截
          brush(cx-28,44, cx-25,40, C.line,0.26,1.4);
          brush(cx+14,68, cx+11,55, C.deep,0.40,2.2);           // 右断柱：更短、反向倾
          blob(cx-30,65,9,4,C.fog,0.16);                        // 柱脚沙埋
          blob(cx+13,67,8,3,C.fog,0.13);
          brush(cx-6,70, cx+4,66, C.line,0.32,2.0);             // 一截横躺的断柱，不接任何竖柱
          brush(cx-2,72, cx+2,70, C.fog,0.20,1.2);
          for(let i=0;i<4;i++) brush(cx-38+i*17,78+i%2*3, cx-28+i*17,77+i%2*3, C.fog,0.14,1.0); // 沙纹短笔
          ell(cx+8,24,22,5,C.fog,0.07);                         // 上方天光留白
          break;
        case 'grasscamp': // 天澜草原：草浪墨团横带 + 两顶只画一边的帐顶
          blob(cx-24,64,18,8,C.fog,0.18);                       // 草浪靠块面，不靠四条平行横线
          blob(cx+12,68,20,7,C.fog,0.15);
          blob(cx+32,60,10,5,C.fog,0.11);
          brush(cx-30,64, cx-22,48, C.ink,0.44,2.2);            // 主帐只画一侧斜边 + 弧顶一小段
          brush(cx-22,48, cx-14,51, C.deep,0.34,1.6);
          blob(cx-22,58,9,6,C.fog,0.14);
          brush(cx+3,66, cx+9,56, C.deep,0.30,1.7);             // 次帐更偏更小
          brush(cx+9,56, cx+13,58, C.line,0.22,1.2);
          blob(cx+9,62,6,4,C.fog,0.10);
          brush(cx-36,78, cx-24,76, C.line,0.18,1.2);           // 两道车辙短斜笔
          brush(cx-33,82, cx-21,80, C.line,0.14,1.0);
          for(let i=0;i<6;i++){ const x=cx+16+i*4, y=56+(i%3)*4;
            brush(x,y, x+1,y-7-(i%2)*3, C.fog,0.16,1.0); }    // 草簇短笔，不成栅栏
          break;
        case 'pagoda': { // 镇魔塔：淡墨塔身块面 + 三层错位的短檐（不等宽、不居中对称）
          blob(cx-2,54,15,26,C.fog,0.16);                       // 塔身没骨块面，上窄下宽
          blob(cx+1,38,10,13,C.fog,0.13);
          brush(cx-24,32, cx+8,31, C.deep,0.52,2.4);            // 三层檐 x / y 都错开，不读成货架
          brush(cx-24,32, cx-21,27, C.ink,0.34,1.6);
          brush(cx-16,50, cx+14,49, C.deep,0.46,2.2);
          brush(cx+14,49, cx+17,45, C.ink,0.30,1.5);
          brush(cx-10,68, cx+12,67, C.ink,0.42,2.0);
          brush(cx-10,68, cx-13,64, C.line,0.28,1.3);
          brush(cx-8,36, cx-7,46, C.line,0.26,1.2);             // 柱线只两截短笔，不连成栅栏
          brush(cx+6,53, cx+5,63, C.line,0.22,1.1);
          brush(cx-22,77, cx-8,76, C.ink,0.34,1.8);             // 塔基断续两段，非通长横杠
          brush(cx+2,78, cx+20,77, C.ink,0.30,1.8);
          ell(cx+4,42,10,14,C.lite,0.05);
          break;
        }
        case 'icewall': // 小极宫：一整片横向冰壁 + 断续冰棱，不成三个圆轮、不勾 Γ 直角
          blob(cx-18,48,26,13,C.fog,0.15);                      // 横向拉长的整片冰壁
          blob(cx+14,52,20,11,C.fog,0.12);                      // 右侧略低略淡，叠出层次
          blob(cx-30,58,14,8,C.fog,0.10);
          brush(cx-38,34, cx-20,33, C.line,0.32,1.8);           // 上沿只三段短笔，不通长
          brush(cx-12,33, cx+6,34, C.line,0.26,1.6);
          brush(cx+16,35, cx+34,34, C.line,0.20,1.4);
          brush(cx-28,40, cx-24,60, C.line,0.22,1.2);           // 冰棱：长短不一的斜短笔
          brush(cx-6,38, cx-2,54, C.line,0.18,1.0);
          brush(cx+18,42, cx+14,58, C.line,0.16,1.0);
          brush(cx-32,46, cx-20,42, C.lite,0.20,1.2);           // 反光用短斜笔，不用圆点
          brush(cx+4,40, cx+14,38, C.lite,0.16,1.0);
          brush(cx-6,72, cx+14,82, C.ink,0.36,1.9);             // 斜下冰梯
          brush(cx+2,70, cx+20,80, C.line,0.24,1.2);
          blob(cx-16,78,16,6,C.fog,0.12);                       // 厚雪软边
          break;
        case 'thunderhead': // 天澜圣兽雷劫：横压乌云靠墨团叠出，不用三条通长横杠
          blob(cx-26,24,18,8,C.deep,0.20);
          blob(cx-6,20,20,9,C.deep,0.17);
          blob(cx+18,26,17,7,C.ink,0.14);
          blob(cx+32,20,10,6,C.fog,0.11);
          brush(cx-36,32, cx-18,31, C.fog,0.20,1.6);            // 云脚断续短笔
          brush(cx-4,33, cx+10,32, C.fog,0.17,1.4);
          brush(cx+20,34, cx+36,33, C.fog,0.14,1.2);
          brush(cx-14,36, cx-9,48, C.ink,0.44,2.0);             // 雷线折而不断
          brush(cx-9,50, cx-4,58, C.line,0.28,1.4);
          brush(cx+12,34, cx+7,44, C.deep,0.34,1.6);
          brush(cx+7,46, cx+10,54, C.line,0.22,1.2);
          try {                                                 // 法阵残环：两段断续弧，不连成一整道「笑脸」
            g.strokeStyle=P(C.ink,0.30); g.lineWidth=1.8; g.lineCap='round';
            g.beginPath(); g.ellipse(cx,66,24,9,0,0.55,1.25); g.stroke();
            g.beginPath(); g.ellipse(cx,66,24,9,0,1.90,2.55); g.stroke();
            g.strokeStyle=P(C.line,0.18); g.lineWidth=1.1;
            g.beginPath(); g.ellipse(cx,66,16,6,0,0.75,1.15); g.stroke();
            g.beginPath(); g.ellipse(cx,66,16,6,0,2.00,2.40); g.stroke();
          } catch(e) { /* 垫片降级 */ }
          break;
        case 'featherfall': // 鲲鹏之战：断续浪线之间一片斜落的羽影，不画规则锯齿梯子
          for(let i=0;i<3;i++){
            const yy=50+i*10;
            brush(cx-38,yy, cx-16,yy-3, C.fog,0.13,1.6);        // 三段错开，不成通长横条
            brush(cx-8,yy+1, cx+12,yy-1, C.fog,0.11,1.4);
            brush(cx+20,yy+2, cx+38,yy, C.fog,0.10,1.3);
          }
          blob(cx-8,30,5,10,C.fog,0.14);                        // 先有羽面块面，再落羽轴
          blob(cx-1,40,6,12,C.fog,0.13);
          blob(cx+6,50,5,10,C.fog,0.11);
          brush(cx-12,20, cx-1,42, C.deep,0.48,2.2);           // 羽轴两段不同斜率，略带弧
          brush(cx-1,42, cx+13,66, C.ink,0.40,2.0);
          brush(cx+13,66, cx+16,72, C.line,0.24,1.3);
          for(let i=0;i<5;i++){                                 // 羽枝长短错落，不成对称锯齿
            const px=cx-10+20*(i/5), py=26+36*(i/5);
            brush(px,py, px+7-i*0.8, py+3, C.ink,0.26-i*0.03,1.1);
            if(i%2===0) brush(px,py, px-5, py+5, C.line,0.20,1.0);
          }
          break;
        default: return null;
      }
      // 软边淡出罩：destination-in 径向渐变，把精灵四周 alpha 渐隐到 0，像墨洇进宣纸。
      // 这一步是「不像硬边贴片 / 不马赛克」的关键——尤其断碑、石阶、山门这类带直边的地标。
      if (g.globalCompositeOperation !== undefined && g.createRadialGradient) {
        const rg = g.createRadialGradient(cx, Hh*0.5, Math.min(S,Hh)*0.18, cx, Hh*0.5, Math.max(S,Hh)*0.60);
        rg.addColorStop(0, 'rgba(0,0,0,1)');
        rg.addColorStop(strong ? 0.76 : 0.62, strong ? 'rgba(0,0,0,0.96)' : 'rgba(0,0,0,0.82)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalCompositeOperation = 'destination-in'; g.fillStyle = rg; g.fillRect(0,0,S,Hh);
        g.globalCompositeOperation = 'source-over';
      }
    } catch (e) { return null; }
    return c;
  }
  // 贴地层 tile：软边明度块（radialGradient 洇染），3×3 偏移保证无缝平铺；四角摆块、中央留白
  function sc3BakeTerrain(C, kinds, layout) {
    let c;
    try { c = document.createElement('canvas'); } catch (e) { return null; }
    if (!c || !c.getContext) return null;
    const tw = Math.max(240, W), th = Math.max(400, H);
    c.width = tw; c.height = th;
    const g = c.getContext('2d');
    if (!g || !g.createRadialGradient) return null;   // smoke 垫片：降级
    try {
      // 软边椭圆明度块：中心浓、边缘透，跨边界按 3×3 偏移补画 → pattern 平铺无硬接缝
      const blot = (bx, by, rx, ry, col, a) => {
        for (let ox=-1; ox<=1; ox++) for (let oy=-1; oy<=1; oy++) {
          const x=bx+ox*tw, y=by+oy*th;
          if (x < -rx || x > tw+rx || y < -ry || y > th+ry) continue;
          g.save(); g.translate(x,y); g.scale(1, ry/rx);
          const rg = g.createRadialGradient(0,0,0,0,0,rx);
          rg.addColorStop(0, col + a + ')'); rg.addColorStop(0.55, col + (a*0.45).toFixed(3) + ')'); rg.addColorStop(1, col + '0)');
          g.fillStyle = rg; g.beginPath(); g.arc(0,0,rx,0,6.2832); g.fill(); g.restore();
        }
      };
      const has = (k) => kinds.indexOf(k) >= 0;
      // 四角 + 边缘构图，正中央（角色/法阵区）保持极低明度，守「中央留白」
      if (has('water')) { blot(tw*0.16, th*0.80, tw*0.30, th*0.10, C.water, 0.13); blot(tw*0.86, th*0.30, tw*0.22, th*0.08, C.water, 0.10); }
      if (has('cloud')) { blot(tw*0.10, th*0.20, tw*0.34, th*0.09, C.fog, 0.10); blot(tw*0.90, th*0.74, tw*0.30, th*0.08, C.fog, 0.09); }
      if (has('cliff')) { blot(tw*0.02, th*0.52, tw*0.18, th*0.20, C.deep, 0.12); blot(tw*0.98, th*0.12, tw*0.16, th*0.16, C.deep, 0.10); }
      if (has('stair')) {  // 石阶是几条淡横向带，不是硬矩形：用扁椭圆软边叠出来
        for (let i=0;i<3;i++) blot(tw*0.72, th*(0.62+i*0.075), tw*0.20, th*0.016, C.ink, 0.055);
      }
      // 构图章法摆块：贴地层也参与逐图构图，仍是软边淡墨块、中央保持低明度
      if (layout === 'ring') {
        for (let i=0;i<8;i++){ const a=i/8*6.2832;
          blot(tw*0.50+Math.cos(a)*tw*0.34, th*0.50+Math.sin(a)*th*0.30, tw*0.16, th*0.055, C.deep, 0.06); }
      } else if (layout === 'band') {
        blot(tw*0.50, th*0.10, tw*0.46, th*0.045, C.fog, 0.09);
        blot(tw*0.50, th*0.90, tw*0.40, th*0.030, C.deep, 0.05);
      } else if (layout === 'frame') {
        blot(tw*0.03, th*0.50, tw*0.13, th*0.28, C.deep, 0.09);
        blot(tw*0.97, th*0.50, tw*0.13, th*0.28, C.deep, 0.09);
      } else if (layout === 'diagonal') {
        for(let i=0;i<3;i++) blot(tw*(0.22+i*0.24), th*(0.24+i*0.22), tw*0.16, th*0.045, C.ink, 0.05);
      } else if (layout === 'void') {
        blot(tw*0.12, th*0.16, tw*0.20, th*0.055, C.fog, 0.05);
      } else if (layout === 'corner') {
        blot(tw*0.88, th*0.16, tw*0.18, th*0.09, C.deep, 0.08);
        blot(tw*0.08, th*0.84, tw*0.16, th*0.07, C.deep, 0.06);
      }
      // 一道极淡的坡皴，跟视差层 bank 呼应，避免纯色块发闷
      g.strokeStyle = C.line + '0.06)'; g.lineWidth = 1.2; g.beginPath();
      for (let x=0; x<=tw; x+=8) { const y = th*0.90 - 10*Math.sin(x/tw*Math.PI*2)*Math.sin(x/tw*Math.PI); if(x===0) g.moveTo(x,y); else g.lineTo(x,y); }
      g.stroke();
    } catch (e) { return null; }
    return c;
  }
  // 第101轮 纸性统一：把 9 张无 inkBg 的深底图补铺成标杆 qixuan 的同款浅宣纸。
  //   · 与 buildGrass 水墨皮完全同款：96×96 无缝纸纹，每点 3×3 偏移画一遍，平铺不见接缝；
  //   · 确定性伪随机（sc3Hash 派生），同版本逐字节可复现，不引 Math.random；
  //   · dark 图额外叠几团 radialGradient 软边墨晕 = 淡墨积染，幽暗靠积墨而非黑底；
  //   · 返回 canvas 交 createPattern，每帧仅 1 次 fillRect；风格基线缺失则 null 安全降级。
  function sc3BakePaper(dark) {
    if (!SC3_PAPER) return null;
    let c;
    try { c = document.createElement('canvas'); } catch (e) { return null; }
    if (!c || !c.getContext) return null;
    c.width = c.height = 96;
    const x = c.getContext('2d');
    if (!x || !x.fillRect || !x.beginPath || !x.arc) return null;   // smoke 垫片降级
    const S = 96;
    let sd = sc3Hash('paper');
    const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    x.fillStyle = SC3_PAPER.base; x.fillRect(0, 0, S, S);
    const blot = (cx, cy, r, col, a) => {
      x.globalAlpha = a; x.fillStyle = col;
      for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) {
        x.beginPath(); x.arc(cx + ox, cy + oy, r, 0, 6.2832); x.fill();
      }
    };
    for (let i=0;i<26;i++) blot(rnd()*S, rnd()*S, 5+rnd()*11, SC3_PAPER.b, 0.030);
    for (let i=0;i<20;i++) blot(rnd()*S, rnd()*S, 1.5+rnd()*3, SC3_PAPER.a, 0.055);
    x.globalAlpha = 1;
    if (dark && x.createRadialGradient) {
      for (let i=0;i<5;i++) {
        const px=(i*37+13)%S, py=(i*53+29)%S, r=22+(i%3)*8;
        let rg = null;
        try { rg = x.createRadialGradient(px, py, 0, px, py, r); } catch (e) { break; }
        if (!rg || !rg.addColorStop) break;
        rg.addColorStop(0, 'rgba(96,90,78,0.055)');
        rg.addColorStop(1, 'rgba(96,90,78,0)');
        x.fillStyle = rg;
        for (let ox=-S; ox<=S; ox+=S) for (let oy=-S; oy<=S; oy+=S) x.fillRect(px+ox-r, py+oy-r, r*2, r*2);
      }
    }
    return c;
  }
  // 第102轮 逐图幽暗：血池 / 黑煞教「不够阴森」，单独调。
  //   · 中国水墨画夜景靠积墨，不靠把纸涂黑：整纸一层暖灰 + 四角软边浓墨晕 + 横向雾带，
  //     全是 radialGradient 软边，中央留白不封死，主景 / 装饰 / 角色照常压在其上；
  //   · W×H 全屏离屏烘焙一次，按 mapId 缓存，每帧只多 1 次 drawImage；
  //   · 只有台账带 mood 的图才烘焙，其余 27 张 mood=null 完全短路；
  //   · 严守灰阶：仍是纸 + 暖墨，不引红色、不改 m.bg / inkBg、不碰判定。
  function sc3BakeMood(mo) {
    SC3_SIG = null;         // 每次重烘重置，切图不会把上一张的专属笔法带过来
    let c;
    try { c = document.createElement('canvas'); } catch (e) { return null; }
    if (!c || !c.getContext) return null;
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    if (!g || !g.fillRect || !g.createRadialGradient || !g.arc) return null;   // smoke 垫片降级
    const num = (v, lo, hi) => (typeof v === 'number' && isFinite(v)) ? Math.max(lo, Math.min(hi, v)) : 0;
    const gloom = num(mo.gloom, 0, 0.4), vig = num(mo.vignette, 0, 1), haze = num(mo.haze, 0, 1);
    const INK = '46,42,36';   // 暖墨灰阶，与纸性同源，不带色相
    try {
      // ① 整纸压一层极淡暖灰：从「晴天宣纸」变成「阴天宣纸」，仍是纸不是黑底
      if (gloom > 0) { g.fillStyle = 'rgba(' + INK + ',' + (gloom * 0.58).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
      // ①b 压顶墨云交给下面的横向软边雾带（中心 y≈0.16H），刻意避开顶部 HUD 区：
      //     最上一行文字必须读得出，幽暗不能靠把整屏连 HUD 一起压黑。
      // ② 四角积墨：中心透明、边缘浓的软边径向罩 + 四枚错位墨团，避免完美圆形的「镜头暗角」感
      if (vig > 0) {
        const R = Math.max(W, H) * 0.78;
        let rg = g.createRadialGradient(W*0.5, H*0.46, H*0.16, W*0.5, H*0.46, R);
        rg.addColorStop(0, 'rgba(' + INK + ',0)');
        rg.addColorStop(0.55, 'rgba(' + INK + ',' + (vig * 0.14).toFixed(3) + ')');
        rg.addColorStop(1, 'rgba(' + INK + ',' + (vig * 0.55).toFixed(3) + ')');
        g.fillStyle = rg; g.fillRect(0, 0, W, H);
        const corners = [[-0.06,-0.04],[1.06,-0.02],[-0.04,1.04],[1.04,1.06]];
        for (let i=0;i<4;i++) {
          const cx = corners[i][0]*W, cy = corners[i][1]*H, r = W*(0.44 + (i%2)*0.10);
          let cg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
          cg.addColorStop(0, 'rgba(' + INK + ',' + (vig * 0.20).toFixed(3) + ')');
          cg.addColorStop(1, 'rgba(' + INK + ',0)');
          g.fillStyle = cg; g.fillRect(cx-r, cy-r, r*2, r*2);
        }
      }
      // ③ 横向雾带：血池的腐雾 / 黑煞的压顶血光，只取明度不落成红色
      if (haze > 0) {
        const bands = [[0.16, 0.11], [0.80, 0.045]];
        for (let i=0;i<bands.length;i++) {
          const by = H*bands[i][0], bh = H*bands[i][1], rad = W*0.62;
          g.save(); g.translate(W*0.5, by); g.scale(1, bh/rad);
          let hg = g.createRadialGradient(0,0,0,0,0,rad);
          hg.addColorStop(0, 'rgba(' + INK + ',' + (haze * (i ? 0.16 : 0.42)).toFixed(3) + ')');
          hg.addColorStop(1, 'rgba(' + INK + ',0)');
          g.fillStyle = hg; g.beginPath(); g.arc(0,0,rad,0,6.2832); g.fill(); g.restore();
        }
      }
    } catch (e) { return null; }
    // ④ 第103轮：mood.signature 原著专属笔法。只取形状与明度，全灰阶软边、不引红色、不写判定。
    //    实拍复盘后收过一轮：初版把气泡撒成「一地椭圆」、把竹林画成「通长竖线栅栏」，
    //    都往用户最在意的「杂乱」方向走。现在一图只留一处主景，配景成丛、大片留白。
    //    单独 try：垫片缺 ellipse 时只跳过这一层，不让整张积墨罩降级为 null。
    if (mo.signature && g.ellipse) {
      try {
        if (mo.signature === 'bubblingPool') {
          // 「灰黑色的腐烂地面，不停冒着气泡的浑浊水坑」：
          // 收成画面一侧的一处主坑（避开中央玩法区），坑内聚泡、坑外只留两枚远泡。
          const px = W*0.30, py = H*0.70, rx = W*0.20, ry = H*0.055;
          g.strokeStyle = 'rgba(' + INK + ',0.17)'; g.lineWidth = 1.6; g.lineCap = 'round';
          g.beginPath(); g.ellipse(px,py,rx,ry,0,0.20,2.55); g.stroke();
          g.beginPath(); g.ellipse(px,py,rx,ry,0,3.45,5.90); g.stroke();
          // 坑面浑浊：软边径向墨晕，中心略重，四周洇进纸里，不落实心块
          g.save(); g.translate(px,py); g.scale(1, ry/rx);
          const pg = g.createRadialGradient(0,0,0,0,0,rx);
          pg.addColorStop(0, 'rgba(' + INK + ',0.11)');
          pg.addColorStop(1, 'rgba(' + INK + ',0)');
          g.fillStyle = pg; g.beginPath(); g.arc(0,0,rx,0,6.2832); g.fill(); g.restore();
          // 坑内气泡：大小不一、聚在坑心，一律空泡圈 + 一道高光缺口
          for (let i=0;i<7;i++) {
            const bx = px + ((i*13)%17-8)*rx*0.085, by = py + ((i*7)%11-5)*ry*0.30;
            const r = 3 + (i%3)*2.2;
            g.strokeStyle = 'rgba(' + INK + ',' + (0.14+(i%2)*0.05).toFixed(3) + ')';
            g.lineWidth = 1.0;
            g.beginPath(); g.arc(bx,by,r,0.35,5.75); g.stroke();
            g.beginPath(); g.arc(bx-r*0.30,by-r*0.30,r*0.28,3.40,6.00); g.stroke();
          }
          for (let i=0;i<2;i++) {   // 坑外远泡：只留两点，大片留白
            const bx = W*(0.72+i*0.12), by = H*(0.42+i*0.22), r = W*0.022;
            g.strokeStyle = 'rgba(' + INK + ',0.08)'; g.lineWidth = 0.9;
            g.beginPath(); g.ellipse(bx,by,r,r*0.42,0,0.30,2.70); g.stroke();
          }
        } else if (mo.signature === 'bloodOverhead') {
          // 「血光一闪……将这竹林的上空全部笼罩」：上方软边浓墨压顶（避开顶部 HUD），
          // 下半两侧短斜笔竹影成丛；不画贯穿全屏的长竖线。
          for (let i=0;i<3;i++) {
            const by = H*(0.13+i*0.055), rad = W*0.72;
            g.save(); g.translate(W*0.5,by); g.scale(1,0.13);
            const og = g.createRadialGradient(0,0,0,0,0,rad);
            og.addColorStop(0, 'rgba(' + INK + ',' + (0.26-i*0.055).toFixed(3) + ')');
            og.addColorStop(1, 'rgba(' + INK + ',0)');
            g.fillStyle = og; g.beginPath(); g.arc(0,0,rad,0,6.2832); g.fill(); g.restore();
          }
          const xs = [0.10,0.17,0.25,0.75,0.83,0.90];
          for (let i=0;i<xs.length;i++) {
            const bx = W*xs[i], lean = (i%2?1:-1)*W*0.035, top = H*(0.62+(i%3)*0.05);
            g.strokeStyle = 'rgba(' + INK + ',' + (0.11+(i%3)*0.02).toFixed(3) + ')';
            g.lineWidth = 2.0+(i%2); g.lineCap = 'round';
            g.beginPath(); g.moveTo(bx,H*0.94); g.lineTo(bx+lean,top); g.stroke();
            for (let j=0;j<2;j++) {
              const yy = top + H*(0.06+j*0.07);
              g.lineWidth = 1.0;
              g.beginPath(); g.moveTo(bx+lean*0.6,yy);
              g.lineTo(bx+lean*0.6+((j%2)?1:-1)*W*0.045, yy-H*0.025); g.stroke();
            }
          }
        }
        SC3_SIG = mo.signature;   // 专属笔法确实画进这张积墨罩了，供 __FR.scenery3() 断言
      } catch (e) { /* 专属笔法降级，不影响积墨罩本体 */ }
    }
    return c;
  }
  // 主景构图位（世界坐标系数，相对 W/H）。G.cam 起点 (-W/2,-H/2)，故屏幕 y = 世界 y + H/2，
  // 下列位置一律落在屏幕上半：避开中央法阵/角色玩法区，也不压底部远山视差层。
  const SC3_FOCUS_POS = {
    axis:     [ 0.00, -0.20],
    diagonal: [-0.20, -0.16],
    corner:   [ 0.22, -0.14],
    ring:     [ 0.00, -0.18],
    void:     [-0.22, -0.18],
    frame:    [-0.24, -0.12],
    band:     [ 0.00, -0.22]
  };
  let sc3Cache = null;
  function ensureScenery3() {
    const m = G.map;
    if (!SC3_ON(m)) { sc3Cache = null; return { on:false }; }
    const codex = sc3CodexOf(m);
    if (!codex) { sc3Cache = null; return { on:false }; }   // 台账缺条目：宁可短路，不套用别的图外观
    const skin = (save && save.skin === 'guigu') ? 'guigu' : 'jin';
    const tone = (typeof codex.tone === 'number') ? codex.tone : 1;
    const co = codex.composition || null;
    // 第102轮：mood 是可选字段，只给「需要单独调幽暗」的图用；无字段则完全短路
    const mood = (codex.mood && typeof codex.mood === 'object') ? codex.mood : null;
    const phase = (sc3Hash(m.id) % 997) / 997;
    const dark = sc3DarkBase(m);
    const key = skin + '|' + W + '|' + H + '|' + m.id + '|' + tone + '|' + (dark ? 'd' : 'p');
    if (sc3Cache && sc3Cache.key === key) return sc3Cache;   // 热路径命中时只是一次字符串比较
    const C = sc3Colors(skin !== 'guigu', tone, dark);
    // 纸性统一：仅对无 inkBg 的增补图（当前 14 张，由真源 hasInkBg 驱动）补铺宣纸；浅纸图沿用 buildGrass 的原生纸底，零改动。
    // 铺在 grassPat 之后、parallax 之前，于是被深底吞掉的远山 / 暗角层次重新可见。
    let paperPat = null, paperTile = null;
    if (dark) {
      paperTile = sc3BakePaper(true);
      if (paperTile) { try { paperPat = ctx.createPattern(paperTile, 'repeat'); } catch (e) { paperPat = null; } }
    }
    // 逐图幽暗：全屏软边积墨罩，只烘一次；无 mood 的图（当前 67 张）为 null，render 里整行不执行
    const moodTile = mood ? sc3BakeMood(mood) : null;
    // 主景专用浓墨：纸底已统一，不再分浅底/深底两套，一律比配景更黑。
    // 仍是同一组低饱和灰阶通道，只挪明度，不引彩色、不动纸底数据。
    const CF = {};
    // mood.focusInk：幽暗图的主景再压一档浓墨（0.6~1），其余图 fi=1 逐字节不变
    const fi = mood ? Math.max(0.6, Math.min(1, (typeof mood.focusInk === 'number' ? mood.focusInk : 1))) : 1;
    for (const k in C) {
      const mm = /rgba\((\d+),(\d+),(\d+),/.exec(C[k]);
      if (!mm) { CF[k] = C[k]; continue; }
      const v = [+mm[1], +mm[2], +mm[3]].map(n => Math.max(22, Math.round(n * 0.60 * fi)));
      CF[k] = 'rgba(' + v.join(',') + ',';
    }
    // 精灵：12 种装饰全部用灰阶新层烘焙（含原 3 种 tree/rock/tuft），注入局部表；
    // 收录图从此完全不碰 window.Sprites 的带彩色老精灵，未收录图仍走原路径、逐字节不变。
    const spr = {};
    for (const k of SC3_TYPES) spr[k] = sc3Bake(k, C, false);
    // 地标名 → 大画布 case 的规范映射：避免把小装饰 case 画到大画布上（坐标系按 40×48 写死会缩成一团）
    const SC3_MARK2CASE = { gate:'gate', stele:'stele', well:'well', bones:'bones', stair:'stair', banner:'lanternmark', lantern:'lanternbig' };
    const marks = {};
    for (const k of (codex.marks || [])) marks[k] = sc3Bake(SC3_MARK2CASE[k] || k, C, true);
    // 地标：数量 / 类型 / 名称全部取自逐图台账（原著景物），坐标按 map.id 确定性散列、横向分扇区防重叠
    const sd = sc3Hash(m.id), rnd = (n) => ((sd >>> (n*3)) % 1000) / 1000;
    const list = Array.isArray(codex.landmarks) ? codex.landmarks : [];
    const n = list.length;
    const landmarks = [];
    for (let i=0;i<n;i++) {
      const lm = list[i];
      landmarks.push({
        kind: lm.kind, name: lm.name || '', spr: marks[lm.kind],
        x: -W*0.30 + ((i + 0.5) / n) * W * 0.60 + (rnd(i+1) - 0.5) * W * 0.06,
        y: -H*0.26 + rnd(i+4) * H * 0.52,
        s: 0.9 + rnd(i+7) * 0.3
      });
    }
    // 主景：全图只立 1 个原著景物，big 画布专属形状，放大提亮、按章法定构图位
    let focus = null;
    if (co) {
      const pos = SC3_FOCUS_POS[co.layout] || SC3_FOCUS_POS.axis;
      focus = { kind: co.focusCase, name: co.focus, layout: co.layout,
                spr: sc3Bake(co.focusCase, CF, true, true),  // 浓墨 + 实笔全 alpha：主景不再退到纸后
                x: pos[0]*W, y: pos[1]*H, s: co.focusScale };
    }
    // 贴地层：按台账 terrain + 章法烘焙 tile → createPattern（每帧 1 次 fillRect）
    const terrain = Array.isArray(codex.terrain) ? codex.terrain : [];
    let terrainPat = null;
    const tile = sc3BakeTerrain(C, terrain, co && co.layout);
    if (tile) { try { terrainPat = ctx.createPattern(tile, 'repeat'); } catch (e) { terrainPat = null; } }
    sc3Cache = { on:true, key, skin, mapId:m.id, tone, dark, phase, composition:co, focus,
                 paperPat, paperTile, mood, moodTile, spr, marks, landmarks, terrain,
                 terrainPat, terrainTile: tile, decor:codex.decor, C, CF };
    return sc3Cache;
  }
  // 装饰绘制出口：收录图 12 种全部用 blitSprOn 画局部表里的灰阶离屏 canvas（沿用同一变换与 alpha 纪律）
  function sc3DrawDecor(d, sc3, alpha) {
    const c = sc3.spr[d.type];
    if (c) blitSprOn(ctx, c, d.x, d.y, d.s, false, null, alpha);
  }
  function sc3DrawLandmarks(sc3) {
    const inView = (x, y, pad) => !(x < G.cam.x - pad || x > G.cam.x + W + pad || y < G.cam.y - pad || y > G.cam.y + H + pad);
    // 次景：原 landmarks 退到纸后，极淡、缩小，不与主景争视线
    for (const lm of sc3.landmarks) {
      if (!lm.spr || !inView(lm.x, lm.y, 120)) continue;
      blitSprOn(ctx, lm.spr, lm.x, lm.y, lm.s * 0.8, false, null, 0.20);
    }
    // 主景：唯一主角，放大提亮；void 章法（高山雾 / 密林）刻意更淡更远
    const f = sc3.focus;
    if (f && f.spr && inView(f.x, f.y, 200))
      blitSprOn(ctx, f.spr, f.x, f.y, f.s, false, null, f.layout === 'void' ? 0.70 : 0.92);
  }
  // 验收探针：量贴地 tile 的 alpha 分布，证明是「连续渐变的软边淡墨块」而非硬边 0/255 二值贴片。
  // 只在 QA 调试口调用（scenery3()），不在渲染热路径里。垫片无真实像素时安全返回 null。
  function sc3TerrainAlpha(tile) {
    if (!tile || !tile.getContext) return null;
    try {
      const g = tile.getContext('2d');
      if (!g || !g.getImageData) return null;
      const d = g.getImageData(0, 0, tile.width, tile.height).data;
      if (!d || d.length < 4) return null;
      let nz = 0, maxA = 0, solid = 0; const seen = new Set();
      for (let i = 3; i < d.length; i += 4) {
        const a = d[i];
        if (a > 2) nz++;
        if (a > maxA) maxA = a;
        if (a >= 250) solid++;
        seen.add(a);
      }
      return { w: tile.width, h: tile.height, nonZero: nz, maxAlpha: maxA, solidPixels: solid, distinctAlpha: seen.size };
    } catch (e) { return null; }
  }
  function buildGrass(m) {
    // 水墨皮走按推进序预算的同色系墨阶（m.inkBg，已由数据层算好）；其余皮肤走原底色。
    const isGuigu = save && save.skin === 'guigu';
    // 接受三种入参：带 inkBg 的地图 / 带 bg 的地图 / 直接 {base,a,b} 原始底色对象
    // （换皮 applySkin、resize 重铺时走 buildGrass(buildGrass._bg)，可能是地图也可能是底色，都要认）。
    let src;
    if (m && m.inkBg) src = m.inkBg;
    else if (m && m.bg) src = m.bg;
    else if (m && m.base) src = m;
    else src = { base: '#36532f' };
    buildGrass._bg = m;   // 存原始入参（地图或底色），重铺时原样复用，水墨皮墨阶不丢
    const base = src.base || '#36532f';
    const ca = src.a || base;
    const cb = src.b || base;
    const c = document.createElement('canvas'); c.width = 96; c.height = 96;
    const x = c.getContext('2d');
    if (save && save.skin === 'guigu') {
      // 无缝纸纹：整块平涂，只撒极淡的墨点，且每个点都在 3×3 偏移位画一遍 —— 平铺接缝看不见。
      // （之前这里是一张 48px 的竖向渐变，每 48px 循环一次，在地上形成等间距暗带，
      //   "斑驳/假"的根源就在这条带子上。竖向明暗改到 washLayer 里整屏做一次，见 washLayerOf。）
      x.fillStyle = base; x.fillRect(0, 0, 96, 96);
      const S = 96;
      const blot = (cx, cy, r, col, a) => {
        x.globalAlpha = a; x.fillStyle = col;
        for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) {
          x.beginPath(); x.arc(cx + ox, cy + oy, r, 0, 6.2832); x.fill();
        }
      };
      for (let i = 0; i < 26; i++) blot(Math.random() * S, Math.random() * S, 5 + Math.random() * 11, cb, 0.030);
      for (let i = 0; i < 20; i++) blot(Math.random() * S, Math.random() * S, 1.5 + Math.random() * 3, ca, 0.055);
      x.globalAlpha = 1;
    } else {
      x.fillStyle = base; x.fillRect(0, 0, 96, 96);
      for (let i = 0; i < 240; i++) { x.fillStyle = Math.random() < 0.5 ? ca : cb; x.fillRect((Math.random() * 96) | 0, (Math.random() * 96) | 0, 2, 2); }
    }
    buildGrass._tile = c;   // 暴露出来给回归脚本量 tile（有没有循环渐变就是看这里）
    grassPat = ctx.createPattern(c, 'repeat');
  }
  // ---------- 精灵变换（让一张静态网格看起来在动） ----------
  // 角色全是同一张字符网格，一个像素都不会自己变。所以「动感」只能在画的时候施加变换，
  // 四个动作：待机呼吸 / 跑（下半身按列切腿）/ 出手（后收→前冲→弹性回弹）/ 受击（后仰压扁）。
  //
  // 支点必须落在脚底（-h），不能落在中心。以中心为支点做竖向 squash 会「上下同时张开」，
  // 看起来像原地抽搐；以脚底为支点缩放才是「蹲下去」，脚不离地才站得住。
  // 且 sx=sy=1、rot=dx=dy=0 时，结果与改造前那句 drawImage(-w/2,-h/2) 逐像素一致 —— 老画面不会漂。

  // 没有腿、或者腿不是用来站的：只给悬浮式的上下浮动，别切片（切了就是抖）
  // 没有腿可切的：蛇 / 蝙蝠 / 火灵 / 冰凤 / 海兽 / 鸽子（振翅帧各自出），
  // 以及尸傀 —— 它是飘着的，底下那截是袍角不是腿，按列切只会把袍子锯成两半
  const NO_LEG = new Set(['snake', 'bat', 'huoling', 'bingfeng', 'haishou', 'dove', 'shigui',
    'grave', 'bag', 'gem', 'herb', 'tree', 'rock', 'tuft', 'sword', 'ebullet']);

  // 纯白剪影：命中白闪用。以前是 fillRect 一个白方块——那是个方块，不是被打白的形状。
  // 按画布逐张预烘一次、缓存起来，之后每帧只是多画一张图。
  // 键是画布而不是名字：手绘跑步帧每一帧形状都不一样，白闪必须是「你正看着的那一帧」的剪影。
  const whiteCache = new Map();
  function whiteSpriteOf(c) {
    if (!c) return null;
    let w = whiteCache.get(c);
    if (w !== undefined) return w;
    const cv = document.createElement('canvas');
    cv.width = c.width; cv.height = c.height;
    const g = cv.getContext('2d');
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'source-in';   // 只把不透明的那些像素刷白，形状留着
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    whiteCache.set(c, cv);
    return cv;
  }
  function whiteSprite(name) { return whiteSpriteOf(Sprites[name]); }

  // g 显式传：验收脚本要能把它画到一张离屏画布上量尺寸，
  // 而不是只能靠整个游戏画面的截图去猜角色有没有被挪位。
  function blitSprOn(g, c, x, y, sc, flip, tf, alpha) {
    if (!c) return;
    const w = c.width * sc, h = c.height * sc;
    const dx = (tf && tf.dx) || 0, dy = (tf && tf.dy) || 0;
    if (alpha != null) g.globalAlpha = alpha;
    g.save();
    g.translate(x + dx, y + h / 2 + dy);
    if (flip) g.scale(-1, 1);
    if (tf && tf.rot) g.rotate(tf.rot);
    g.scale((tf && tf.sx) || 1, (tf && tf.sy) || 1);
    if (tf && tf.sliceAmp > 0.01) {
      // 跑步：把下半身按列切成左右两条腿，各自沿竖直方向反向抬起。
      // 按行切片只会左右错位，看起来是「抖」；按列切才是迈步——
      // 正面朝向的角色只有这一条路能迈腿，因为网格里根本没有侧面。
      const legTop = Math.floor(c.height * 0.72);
      const half = Math.floor(c.width / 2);
      const legH = c.height - legTop;
      const swing = Math.sin(tf.sliceFreq) * tf.sliceAmp;
      // 只能往上抬，不能往下压：腿区域正好贴着精灵画布底边，
      // 往下偏移的部分会被裁掉 —— 看起来就是「一条腿凭空没了」。
      const lLift = Math.max(0, swing) * sc;
      const rLift = Math.max(0, -swing) * sc;
      g.drawImage(c, 0, 0, c.width, legTop, -w / 2, -h, w, legTop * sc);
      g.drawImage(c, 0, legTop, half, legH,
        -w / 2, -h + legTop * sc - lLift, half * sc, legH * sc);
      g.drawImage(c, half, legTop, c.width - half, legH,
        -w / 2 + half * sc, -h + legTop * sc - rLift, (c.width - half) * sc, legH * sc);
    } else {
      g.drawImage(c, -w / 2, -h, w, h);
    }
    g.restore();
    if (alpha != null) g.globalAlpha = 1;
  }
  function blitSpr(c, x, y, sc, flip, tf, alpha) { blitSprOn(ctx, c, x, y, sc, flip, tf, alpha); }
  // 这一帧该画哪张图：手绘跑步帧挂在 tf 上，没有就退回原精灵
  function pickSpr(name, tf) {
    const f = tf && tf.frame;
    return (f && Sprites[f]) || Sprites[name];
  }
  function drawSpr(name, x, y, sc, flip, tf) {
    blitSpr(pickSpr(name, tf), x, y, sc, flip, tf, null);
  }

  // ---- 四个动作的变换曲线 ----
  // 相位里掺进坐标，满屏敌人不会同频呼吸（同一个 sin 一起起伏，像一支训练过的合唱团）
  function tfIdle(x, y, t, spr) {
    // 有待机帧就不做程序化呼吸：一呼一吸是形状在变（肩胸收进 2px / 挺出 2px），
    // 再叠一层整体胀缩就是两条动画打架，退化成抖。
    const fr = frameName('idle', spr, t);
    if (fr) return { sx: 1, sy: 1, dy: 0, rot: 0, dx: 0, sliceAmp: 0, frame: fr };
    const br = Math.sin(t * 2.1 + (x * 0.013 + y * 0.021));
    return { sx: 1 - br * 0.012, sy: 1 + br * 0.022, dy: -br * 0.5, rot: 0, dx: 0, sliceAmp: 0 };
  }
  // ---- 手绘帧：相位 / 时间 → 这一帧该用哪张图 ----
  // 帧库在 sprites.js（window.FRAME_SETS），每个动作的选帧规则不一样，所以分开写。
  const frameCache = new Map();
  function framesOf(action, spr) {
    if (!spr) return null;
    const key = action + '|' + spr;
    let f = frameCache.get(key);
    if (f !== undefined) return f;
    const set = (window.FRAME_SETS || {})[action];
    const want = set && set[spr] ? set[spr].rows.length : 0;
    const arr = [];
    for (let i = 0; i < want; i++) { const nm = spr + '_' + action + i; if (Sprites[nm]) arr.push(nm); }
    f = want > 0 && arr.length === want ? arr : null;
    frameCache.set(key, f);
    return f;
  }
  // 跑：sin(2·gait) 的四个象限正好四帧：左提膝 / 并步 / 右提膝 / 蹬开。
  // gait 每走 π 就是一整轮（两条腿各抬一次），所以一帧占 π/4。
  // 除跑之外的动作按时间选帧（跑按相位）。默认快慢写在这是游戏手感，不写进精灵数据；
  // 飞行类的 hz 逐精灵给（鸟扇得快，蛇和海兽游得慢），在 sprites.js 的 FRAME_SETS 里。
  const FRAME_HZ = { idle: 2.4, flap: 6 };
  function frameName(action, spr, phase) {
    const f = framesOf(action, spr);
    if (!f) return null;
    let q;
    if (action === 'run') q = Math.floor(phase / (Math.PI / 4));
    else {
      const spec = window.FRAME_SETS[action][spr];
      q = Math.floor(phase * (spec.hz || FRAME_HZ[action] || 6));
    }
    return f[((q % f.length) + f.length) % f.length];
  }
  // 出手三帧对齐时间轴：抬手（后收）→ 挥（前冲）→ 收（回弹）
  function strikeFrameName(spr, el) {
    const f = framesOf('strike', spr);
    if (!f) return null;
    return el < ATK_WIND ? f[0] : (el < ATK_WIND + ATK_STRIKE ? f[1] : f[2]);
  }
  // 受击两帧：砸实（闪白那一下）→ 仰（缓过来）
  function hurtFrameName(spr, hp) {
    const f = framesOf('hurt', spr);
    return f ? (hp > 0.06 ? f[0] : f[1]) : null;
  }
  function tfRun(x, y, gait, amp, spr) {
    const a = amp == null ? 1 : amp;
    const framed = framesOf('run', spr);
    // 有手绘帧时把起伏峰值挪半个象限（π/8）：并步那两帧才是人离地最高的时刻，
    // 不挪的话最高点落在提膝帧上，看着像「抬腿时往上蹦」。
    const g = gait + (framed ? Math.PI / 8 : 0);
    const bob = Math.abs(Math.sin(g));
    const tf = {
      sx: 1 + bob * 0.030 * a, sy: 1 - bob * 0.045 * a,
      dy: -bob * 1.9 * a, rot: Math.sin(g) * 0.016 * a,
      // 1.6 是量出来的：主角 12×14 的网格里腿只有 4 行高，
      // 抬 1.1 像素在 1.7 倍缩放下约等于屏幕上的一个点，看不出在迈步。
      sliceAmp: 1.6 * a, sliceFreq: gait * 2, dx: 0
    };
    // 有手绘帧的精灵不再切片：帧里腿的形状已经画好了，再切就是两条动画打架
    if (framed) { tf.frame = frameName('run', spr, gait); tf.sliceAmp = 0; }
    return tf;
  }
  function tfHover(x, y, t, amp, spr) {
    const a = amp == null ? 1 : amp;
    // 有振翅帧就只留浮沉：翅膀自己会扇，再让整体一胀一缩是多余的
    const fr = frameName('flap', spr, t);
    if (fr) return { sx: 1, sy: 1, dy: -1.6 * a, rot: 0, dx: 0, sliceAmp: 0, frame: fr };
    const s = Math.sin(t * 3.4 + x * 0.02);
    return { sx: 1 + s * 0.02 * a, sy: 1 - s * 0.02 * a, dy: -1.6 * a + s * 0.9 * a, rot: 0, dx: 0, sliceAmp: 0 };
  }
  // 出手：0.28 秒拆成 后收 / 前冲 / 弹性回弹。上半身先缩再甩出去，
  // 收势用阻尼余弦做一次过冲 —— 少了过冲，动作会像被贴纸贴上去，收得毫无惯性。
  const ATK_WIND = 0.07, ATK_STRIKE = 0.05, ATK_RECOV = 0.16;
  const ATK_TOTAL = ATK_WIND + ATK_STRIKE + ATK_RECOV;
  function tfStrike(el, dir, spr) {
    const s = dir >= 0 ? 1 : -1;
    let tf;
    if (el < ATK_WIND) {
      const p = el / ATK_WIND, e = 1 - (1 - p) * (1 - p);
      tf = { sx: 1 - 0.04 * e, sy: 1 + 0.04 * e, dx: -3.0 * e * s, rot: -0.05 * e * s, dy: 0, sliceAmp: 0 };
    } else if (el < ATK_WIND + ATK_STRIKE) {
      const p = (el - ATK_WIND) / ATK_STRIKE;
      tf = {
        sx: 0.96 + 0.22 * p, sy: 1.04 - 0.16 * p,
        dx: (-3.0 + 10.0 * p) * s, rot: (-0.05 + 0.10 * p) * s, dy: 0, sliceAmp: 0
      };
    } else {
      const q = Math.min(1, (el - ATK_WIND - ATK_STRIKE) / ATK_RECOV);
      const damp = Math.exp(-4.6 * q) * Math.cos(q * 10);
      tf = {
        sx: 1 + 0.18 * damp, sy: 1 - 0.12 * damp,
        dx: 7.0 * damp * s, rot: 0.05 * damp * s, dy: 0, sliceAmp: 0
      };
    }
    // 手绘三帧管形状（含胸 / 挺胸探臂 / 收势），曲线管位移与拉伸，两者相加
    const fr = strikeFrameName(spr, el);
    if (fr) tf.frame = fr;
    return tf;
  }
  // 受击：挨了一下先扁、再往后仰，0.12 秒内恢复。dir 是「被打飞的方向」
  function tfHurt(hp, dir, spr) {
    const k = Math.min(1, hp / 0.12), e = k * k;
    const s = dir >= 0 ? 1 : -1;
    const tf = { sx: 1 + 0.10 * e, sy: 1 - 0.12 * e, dx: -4.5 * e * s, rot: -0.09 * e * s, dy: 0.6 * e, sliceAmp: 0 };
    const fr = hurtFrameName(spr, hp);
    if (fr) tf.frame = fr;
    return tf;
  }
  function drawDecor() {
    const list = G.decor;
    const sc3 = ensureScenery3();   // 命中缓存时只是一次 key 比较，非白名单图直接 {on:false}
    for (const d of list) {
      if (d.x < G.cam.x - 60 || d.x > G.cam.x + W + 60 || d.y < G.cam.y - 60 || d.y > G.cam.y + H + 60) continue;
      // 近浓远淡：屏幕纵向做大气透视——远景减透明度退后（墨皮融纸成淡、金皮融暗底成退），近景满墨。
      // 廉价、不改判定，两皮都正确。
      const dr = Math.max(0, Math.min(1, (d.y - G.cam.y) / H)); // 0 顶(远) → 1 底(近)
      const alpha = (0.55 + 0.45 * dr) * (d.a || 1);   // 聚落内浓淡错落；未收录图无 a 字段，逐字节不变
      const prevA = ctx.globalAlpha;
      ctx.globalAlpha = alpha;
      // 第101轮 风格基线：收录图 12 种装饰一律走灰阶新层，杜绝老精灵里的绿色小树。
      // 未收录 153 张 sc3.on=false，仍原样走 window.Sprites，逐字节不变。
      if (sc3.on) sc3DrawDecor(d, sc3, alpha);
      else if (d.type === 'tree') drawSpr('tree', d.x, d.y, d.s, false);
      else if (d.type === 'rock') drawSpr('rock', d.x, d.y, d.s, false);
      else drawSpr('tuft', d.x, d.y, 1.4, false);
      ctx.globalAlpha = prevA;
    }
  }
  function drawNpc(npc) {
    const def = npc.def;
    const pulse = 0.5 + 0.5 * Math.sin(npc.bob * 1.7);
    ctx.fillStyle = 'rgba(255,214,110,' + (0.08 + pulse * 0.08) + ')';
    ctx.beginPath(); ctx.arc(npc.x, npc.y, 24 + pulse * 8, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,110,' + (0.30 + pulse * 0.28) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(npc.x, npc.y, 17 + pulse * 5, 0, 6.28); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(npc.x, npc.y + 11, 11, 5, 0, 0, 6.28); ctx.fill();
    drawSpr(def.spr || 'hermit', npc.x, npc.y - 4, def.scale || 1.8, false,
      tfIdle(npc.x, npc.y, npc.bob || 0, def.spr || 'hermit'));
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    const label = def.name;
    const w = (ctx.measureText(label).width || 40) + 14;
    ctx.fillStyle = 'rgba(10,13,19,0.74)';
    ctx.fillRect(npc.x - w / 2, npc.y - 48, w, 16);
    ctx.fillStyle = '#ffd98a';
    ctx.fillText(label, npc.x, npc.y - 36);
  }
  function drawEncArrow(npc) {
    const sx = npc.x - G.cam.x, sy = npc.y - G.cam.y;
    const m = 22, top = 128, bot = H - 130;
    if (sx > m && sx < W - m && sy > top && sy < bot) return;
    const cx = U.clamp(sx, m, W - m), cy = U.clamp(sy, top, bot);
    const a = Math.atan2(sy - H / 2, sx - W / 2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(255,214,110,0.92)';
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, 6); ctx.lineTo(-6, -6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // 一个怪这一帧该是什么姿态：挨打 > 跑 > 浮
  function enemyTf(e) {
    if (e.hitFlash > 0) {
      const p = G.player;
      const away = p ? (Math.sign(e.x - p.x) || 1) : 1;
      return tfHurt(e.hitFlash, away, e.spr);
    }
    if (NO_LEG.has(e.spr)) return tfHover(e.x, e.y, e.t || 0, 1, e.spr);
    return tfRun(e.x, e.y, (e.t || 0) * 9.5, 1, e.spr);
  }
  // 主角：挨打 > 出手 > 跑 > 待机
  function playerTf(p) {
    if (p.hurtFlash > 0) return tfHurt(p.hurtFlash, -(p.dir || 1), 'hanli');
    if (p.atkAnim > 0) return tfStrike(ATK_TOTAL - p.atkAnim, p.dir || 1, 'hanli');
    if (p.moving) return tfRun(p.x, p.y, p.gait || 0, 1, 'hanli');
    return tfIdle(p.x, p.y, G.time || 0, 'hanli');
  }

  function drawEnemy(e) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.9, e.r * 0.4, 0, 0, 6.28); ctx.fill();
    const tf = enemyTf(e);
    drawSpr(e.spr, e.x, e.y, e.scale || 1, e._flip, tf);
    if (e.hitFlash > 0) {
      // 白闪跟着同一个姿态走，不然闪出来的是没在动的那一帧，一眼假
      blitSpr(whiteSpriteOf(pickSpr(e.spr, tf)), e.x, e.y, e.scale || 1, e._flip, tf, Math.min(0.9, e.hitFlash * 3));
    }
    if (e.elite) {
      const bw = e.r * 2.2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw, 4);
      ctx.fillStyle = '#ffce4a'; ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw * U.clamp(e.hp / e.maxhp, 0, 1), 4);
    }
  }
  function drawLoot(l) {
    const r = RARITY[l.item.rarity];
    const bob = Math.sin(G.time * 3 + l.bob) * 2;
    ctx.save();
    ctx.globalAlpha = 0.28; ctx.fillStyle = r.glow;
    ctx.beginPath(); ctx.arc(l.x, l.y + bob, 13, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(l.x, l.y + 9, 7, 3, 0, 0, 6.28); ctx.fill();
    ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(l.item.icon, l.x, l.y + bob);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
  function drawStone(g) {
    const bob = Math.sin(G.time * 4 + g.x * 0.1) * 1.5;
    ctx.save();
    ctx.globalAlpha = 0.3; ctx.fillStyle = 'rgba(255,210,74,1)';
    ctx.beginPath(); ctx.arc(g.x, g.y + bob, 9, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - 5 + bob); ctx.lineTo(g.x + 4, g.y + bob);
    ctx.lineTo(g.x, g.y + 5 + bob); ctx.lineTo(g.x - 4, g.y + bob);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // 粒子/特效的唯一出口。原先分成「先画环、再画方块」两个循环，
  // 每加一种特效要同时改两处条件，漏一处就会被当成方块画出来；合成一条 else-if 链不再漏。
  function drawPart(pt) {
    const life = Math.max(0, pt.life / pt.maxlife);
    // 第102轮：浅宣纸上把「环形 / 放射」这类跟着人走的持续特效退到纸后（去彩、降 alpha），
    // 命中 / 暴击 / 拾取等一次性反馈不受影响；深底图 / 鎏金皮完全不变。
    const softRingFx = SC3_SOFT_RING && (pt.ring || pt.ray);
    const kFx = softRingFx ? 0.26 : 1;
    const inkFx = 'rgba(74,70,60,0.8)';
    // 粒子半径一律不许为负：收缩/外扩类特效算过头就会喂给 arc 一个负数，直接抛错
    if (pt.r < 0) pt.r = 0;
    if (pt.maxr < 0) pt.maxr = 0;
    if (pt.rad < 0) pt.rad = 0;
    if (pt.len < 0) pt.len = 0;

    if (pt.ring) {
      // 半径可能是负的（收缩类特效算出来 -16 这种），arc 会直接抛错，钳一下
      const t = 1 - life; const r = Math.max(0, U.lerp(pt.r, pt.maxr, t));
      ctx.strokeStyle = softRingFx ? inkFx : pt.color; ctx.lineWidth = 4 * life + 1; ctx.globalAlpha = life * kFx;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, 6.28); ctx.stroke(); ctx.globalAlpha = 1;
      return;
    }
    if (pt.bolt) { drawBolt(pt); return; }
    if (pt.ray) {
      ctx.globalAlpha = life * 0.9 * kFx; ctx.strokeStyle = softRingFx ? inkFx : pt.color; ctx.lineWidth = 3 * life + 1;
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + Math.cos(pt.ang) * pt.len, pt.y + Math.sin(pt.ang) * pt.len);
      ctx.stroke(); ctx.globalAlpha = 1; return;
    }
    if (pt.slash) {
      // 弯月：前 31% 张开，之后一边变细一边淡。三层叠出「外焰 / 刃 / 白芯」。
      const t = 1 - life;
      const open = pt.arc * Math.min(1, t * 3.2);
      const fd = t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.55);
      const a0 = pt.ang - open / 2, a1 = pt.ang + open / 2;
      const r = Math.max(0, pt.rad * (0.82 + t * 0.32));   // 弯月的半径也要钳，负数会让 arc 抛错
      ctx.save(); ctx.lineCap = 'round';
      ctx.globalAlpha = fd * 0.30; ctx.strokeStyle = pt.color; ctx.lineWidth = 9 * fd + 2;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, a0, a1); ctx.stroke();
      ctx.globalAlpha = fd * 0.85; ctx.lineWidth = 3.4 * fd + 0.8;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, a0, a1); ctx.stroke();
      ctx.globalAlpha = fd; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4 * fd + 0.4;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, a0, a1); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }
    if (pt.rune) {
      // 贴地的环：按 0.42 压扁才是「画在地上」，不压就成了立着的铁圈
      const t = 1 - life;
      const rr = pt.r * Math.min(1, 0.35 + t * 1.6);
      const al = (t < 0.22 ? t / 0.22 : 1 - (t - 0.22) / 0.78);
      const rot = t * 1.5;
      ctx.save(); ctx.translate(pt.x, pt.y); ctx.scale(1, 0.42);
      ctx.globalAlpha = al * 0.10; ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, 6.28); ctx.fill();
      ctx.strokeStyle = pt.color;
      ctx.globalAlpha = al * 0.95; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = al * 0.5; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, rr * 0.76, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = al; ctx.lineWidth = 2.2;
      for (let i = 0; i < 12; i++) {
        const a = rot + i * (6.28 / 12);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * rr * 0.80, Math.sin(a) * rr * 0.80);
        ctx.lineTo(Math.cos(a) * rr * 0.99, Math.sin(a) * rr * 0.99);
        ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }
    if (pt.shatter) {
      const c = Sprites[pt.spr];
      if (!c) return;
      const t = 1 - life, sc = pt.sc * (1 + t * 0.18), n = pt.n;
      const tw = c.width / n, th = c.height / n, h = c.height * sc;
      ctx.save(); ctx.globalAlpha = Math.min(1, life * 1.7) * 0.95;
      for (const tl of pt.tiles) {
        // 往外飞 + 落回地面：竖直方向给一个下坠，碎片才不会一直往上飘
        const px = pt.x + tl.vx * t * 0.75;
        const py = pt.y - h / 2 + (tl.cy * th + th / 2) * sc + tl.vy * t * 0.75 + 110 * t * t;
        ctx.save();
        ctx.translate(px, py); ctx.rotate(tl.rot * t);
        if (pt.flip) ctx.scale(-1, 1);
        ctx.drawImage(c, tl.cx * tw, tl.cy * th, tw, th,
          -tw * sc / 2, -th * sc / 2, tw * sc, th * sc);
        ctx.restore();
      }
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }
    if (pt.spark) {
      // 细长火花：尾巴永远朝速度的反面拖，速度被重力改向时尾巴也跟着往下垂
      const m = Math.hypot(pt.vx, pt.vy) || 1;
      const len = pt.len * (0.35 + life * 0.65);
      ctx.globalAlpha = life; ctx.strokeStyle = pt.color;
      ctx.lineWidth = pt.w * (0.5 + life * 0.5); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x - pt.vx / m * len, pt.y - pt.vy / m * len);
      ctx.stroke(); ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
      return;
    }
    if (pt.web) {
      // 雷网：落点处一圈交错的金白电网，魔道身上网更密更亮
      const a = Math.max(0, pt.life / pt.maxlife);
      ctx.globalAlpha = a; ctx.strokeStyle = pt.color; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      const seg = 5;
      ctx.beginPath();
      for (let s = 0; s <= seg; s++) {
        const ang = U.lerp(pt.a0, pt.a1, s / seg);
        const rr = pt.rad * (0.7 + 0.3 * Math.sin(pt.seed + s * 1.7));
        const px = pt.x + Math.cos(ang) * rr, py = pt.y + Math.sin(ang) * rr;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
      return;
    }
    // 兜底：普通方块粒子
    ctx.globalAlpha = life; ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    ctx.globalAlpha = 1;
  }
  function render() {
    let sx = 0, sy = 0;
    if (G.shake > 0) { sx = U.rand(-G.shake, G.shake); sy = U.rand(-G.shake, G.shake); }
    ctx.setTransform(PR, 0, 0, PR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sc3 = ensureScenery3();   // 带缓存；下方贴地层与地标绘制复用同一份，不重复烘焙
    // 第102轮：浅纸作用域一处定，CSS HUD / 神念圈 / 冰域 / 常驻法阵全部复用，避免各处口径打架
    SC3_SOFT_RING = !!(sc3.on && save && save.skin === 'guigu');
    // 只在「收录图 + 水墨皮」的浅宣纸上挂 body.sc3-paper；深底 153 张 / 鎏金皮不挂。
    // 状态翻转时才动一次 DOM，热路径不产生布局抖动。
    if (typeof document !== 'undefined' && document.body && document.body.classList) {
      if (SC3_SOFT_RING !== SC3_UI_FLAG) { SC3_UI_FLAG = SC3_SOFT_RING; document.body.classList.toggle('sc3-paper', SC3_SOFT_RING); }
    }
    if (grassPat) { ctx.fillStyle = grassPat; ctx.fillRect(0, 0, W, H); }
    else {
      const m = G.map;
      const fill = (save && save.skin === 'guigu' && m && m.inkBg) ? m.inkBg.base : (skinBg(m && m.bg).base || '#36532f');
      ctx.fillStyle = fill; ctx.fillRect(0, 0, W, H);
    }
    // 第101轮 纸性统一：仅原生深底的收录图补铺一层浅宣纸（每帧 +1 fillRect）。
    // 铺在 parallax 之前，远山 / 暗角照常叠在纸上，与标杆 qixuan 完全同序。
    // 未收录 153 张 sc3.on=false，这一行完全不执行，逐字节不变。
    if (sc3.on && sc3.paperPat) { ctx.fillStyle = sc3.paperPat; ctx.fillRect(0, 0, W, H); }
    // 一角构图：四角淡墨/暗角 + 中央留白（框景锁屏幕边），远/中/近三层随相机横移，地面加 1:1 世界肌理
    const px = parallaxLayers();
    if (px) {
      const drawLayer = (layer, f) => { const offX = ((G.cam.x * f) % W + W) % W; for (let xx = -offX; xx < W; xx += W) ctx.drawImage(layer, xx, 0); };
      drawLayer(px.far, 0.18);
      drawLayer(px.mid, 0.45);
      drawLayer(px.near, 0.8);
      ctx.drawImage(px.frame, 0, 0);
    }
    // 第102轮 逐图幽暗：仅 xuechi / heisha 带 mood。铺在视差之后、贴地/装饰/角色之前，
    // 于是远山与暗角一起被压成夜色，而主景与角色仍在罩之上保持清晰（每帧 +1 drawImage）。
    if (sc3.on && sc3.moodTile) { ctx.drawImage(sc3.moodTile, 0, 0); SC3_MOOD_DRAWS++; }
    ctx.save();
    ctx.translate(-G.cam.x + sx, -G.cam.y + sy);
    if (px && px.grain) { ctx.fillStyle = px.grain; ctx.fillRect(G.cam.x, G.cam.y, W, H); }
    // 批次3 P1-4：贴地明度块，离屏烘焙一次 → 每帧仅 1 次 fillRect（世界坐标锚定，随相机 1:1 走）。
    // 与 px.grain 同款 createPattern，纯视觉，不进 G.zones / G.hazards。
    // sc3 已在纸底阶段取得并复用（ensureScenery3 带缓存，热路径只是一次字符串比较）
    if (sc3.on && sc3.terrainPat) { ctx.fillStyle = sc3.terrainPat; ctx.fillRect(G.cam.x, G.cam.y, W, H); }

    drawDecor();
    // P1-2 地标：画在装饰之上、地面特效之下（满屏特效也不会盖住），明度 0.55，不参与碰撞
    if (sc3.on) sc3DrawLandmarks(sc3);
    // 地面特效先铺：符文环是画在地上的，等角色都画完再画就成呼啦圈了
    for (const pt of G.parts) if (pt.rune) drawPart(pt);
    for (const g of G.gems) { if (g.kind === 'stone') drawStone(g); else drawSpr('gem', g.x, g.y, 1.6, false); }
    for (const h of G.herbs) drawSpr('herb', h.x, h.y, 1.6, false);
    for (const l of G.loot) drawLoot(l);
    // 地面持续区先铺（贴地），预警圈与弹体压在上面
    for (const z of G.zones) drawZone(z);
    for (const h of G.hazards) drawHazardGround(h);
    // Boss 出招预警：地上圈随前摇收拢、颜色由暗转亮 —— 给玩家那半秒反应
    for (const t of G.tells) {
      const k = Math.max(0, Math.min(1, t.t / t.dur));      // 1 → 0
      ctx.save();
      ctx.globalAlpha = 0.20 + 0.45 * (1 - k);
      ctx.strokeStyle = t.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(6, t.r * (0.35 + 0.65 * (1 - k))), 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 0.10 + 0.16 * (1 - k);
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(6, t.r * (0.35 + 0.65 * (1 - k))), 0, 6.28); ctx.fill();
      ctx.restore();
    }
    for (const b of G.ebullets) drawEBullet(b);

    const es = G.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of es) drawEnemy(e);
    if (G.boss) {
      const b = G.boss;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r * 0.9, b.r * 0.9, b.r * 0.4, 0, 0, 6.28); ctx.fill();
      const gg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.8);
      gg.addColorStop(0, 'rgba(255,150,110,0.20)'); gg.addColorStop(1, 'rgba(255,150,110,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.8, 0, 6.28); ctx.fill();
      const btf = enemyTf(b);
      drawSpr(b.spr, b.x, b.y, b.scale, b._flip, btf);
      if (b.hitFlash > 0) {
        blitSpr(whiteSpriteOf(pickSpr(b.spr, btf)), b.x, b.y, b.scale, b._flip, btf, Math.min(0.9, b.hitFlash * 3));
      }
      // 二阶段血气环绕
      if (b.phase2) {
        const pulse = Math.sin(b.t * 6) * 3;
        ctx.strokeStyle = 'rgba(255,50,50,0.55)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 10 + pulse, 0, 6.28); ctx.stroke();
        ctx.fillStyle = 'rgba(255,40,40,0.16)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 6 + pulse, 0, 6.28); ctx.fill();
      }
      // 二阶段演出：三重冲击波
      if (b.phaseT > 0) {
        const prog = 1 - b.phaseT / 1.5;
        for (let k = 0; k < 3; k++) {
          const tt = U.clamp(prog + k * 0.16, 0, 1);
          const r = 20 + tt * 280;
          ctx.strokeStyle = 'rgba(255,60,60,' + ((1 - tt) * 0.9) + ')';
          ctx.lineWidth = 7 * (1 - tt) + 1;
          ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 6.28); ctx.stroke();
        }
      }
      // 冲撞方向预告：由粗到细、由亮到暗的一段轨道。
      // 原来是一条等宽 5px、200px 的硬直线 —— 看着像 UI 占位符，不像"要冲过来"。
      // 而且只对 kind==='beast' 画，人形 Boss 冲撞时完全没有提示。
      if (b.dashing > 0) {
        const L = 200, ca = Math.cos(b.dashAng), sa = Math.sin(b.dashAng), seg = 9;
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#ff5a3c';
        for (let i = 0; i < seg; i++) {
          const t0 = i / seg, t1 = (i + 1) / seg;
          ctx.globalAlpha = 0.60 * (1 - t0) * (1 - t0);
          ctx.lineWidth = 6.5 * (1 - t0 * 0.80);
          ctx.beginPath();
          ctx.moveTo(b.x + ca * L * t0, b.y + sa * L * t0);
          ctx.lineTo(b.x + ca * L * t1, b.y + sa * L * t1);
          ctx.stroke();
        }
        ctx.restore(); ctx.globalAlpha = 1;
      }
    }

    // 灵宠：跟在身后半步，小一号
    if (G.pet && save.pet) {
      const pd = petDef();
      if (pd && pd.spr && Sprites[pd.spr]) {
        const pt = G.pet;
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(pt.x, pt.y + 9, 7, 3, 0, 0, 6.28); ctx.fill();
        // 跑起来走手绘帧，站着待机帧 —— 上下颠由 tf 出，不再另加 bob（会弹两次）
        const ptf = pt.moving ? tfRun(pt.x, pt.y, pt.gait || 0, 1, pd.spr)
          : tfIdle(pt.x, pt.y, pt.bob || 0, pd.spr);
        drawSpr(pd.spr, pt.x, pt.y, pd.scale || 1.3, G.player && G.player.dir < 0, ptf);
      }
    }

    // 召唤灵宠（顿悟 E 类）：另一侧，半透明一点，看得出是灵体
    if (G.summon) {
      const s = G.summon;
      const alpha = s.t > s.max - 3 ? Math.max(0.15, (s.max - s.t) / 3) : 1;   // 最后三秒渐隐
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 9, 7, 3, 0, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.85 * alpha;
      if (Sprites[s.spr]) drawSpr(s.spr, s.x, s.y, s.scale, G.player && G.player.dir < 0, tfIdle(s.x, s.y, s.bob || 0, s.spr));
      ctx.globalAlpha = 1;
    }

    // 身外化身：和本体一个样，略淡，看得出是分出来的
    if (G.avatar) {
      const a = G.avatar;
      ctx.fillStyle = 'rgba(0,0,0,0.20)'; ctx.beginPath(); ctx.ellipse(a.x, a.y + 9, 7, 3, 0, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.8;
      if (Sprites[a.spr]) drawSpr(a.spr, a.x, a.y, a.scale, G.player && G.player.dir < 0, tfIdle(a.x, a.y, a.bob || 0, a.spr));
      ctx.globalAlpha = 1;
    }

    // 同伴：站在另一侧，画个名牌好认
    if (G.mate && save.mate) {
      const md = mateDef();
      if (md && md.spr && Sprites[md.spr]) {
        const mt = G.mate;
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(mt.x, mt.y + 10, 8, 3.5, 0, 0, 6.28); ctx.fill();
        const mtf = mt.moving ? tfRun(mt.x, mt.y, mt.gait || 0, 1, md.spr)
          : tfIdle(mt.x, mt.y, mt.bob || 0, md.spr);
        drawSpr(md.spr, mt.x, mt.y, md.scale || 1.5, G.player && G.player.dir < 0, mtf);
        const nm = (md.icon || '·') + ' ' + md.name;
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        const tw = ctx.measureText(nm).width + 10;
        ctx.fillStyle = 'rgba(10,20,30,0.6)';
        ctx.fillRect(mt.x - tw / 2, mt.y - 38, tw, 14);
        ctx.fillStyle = '#ffe0a8';
        ctx.fillText(nm, mt.x, mt.y - 28);
      }
    }

    for (const npc of G.npcs) drawNpc(npc);

    const p = G.player;
    if (p) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 9, 4, 0, 0, 6.28); ctx.fill();
      drawSpr('hanli', p.x, p.y, 1.7, p.dir < 0, playerTf(p));
      if (p.hurtFlash > 0) {
        // 受击提示只描一圈红边，不糊一层红饼：打起来最需要看清的就是自己站在哪，
        // 一层不透明红圆盖上去，人是被提示了，但位置也看不见了。
        const k = Math.min(1, p.hurtFlash / 0.2);
        ctx.strokeStyle = 'rgba(255,86,86,' + (0.20 + k * 0.34) + ')';
        ctx.lineWidth = 1.4 + k * 1.8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.45 + (1 - k) * 7, 0, 6.28); ctx.stroke();
        ctx.globalAlpha = 0.10 * k; ctx.fillStyle = '#ff4646';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.5, 0, 6.28); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // 神念拾取圈：进图头 1.2 秒露一下，让玩家看见驱物术的拾取范围到哪
      // 拾取本身每帧都在生效，圈只是提示，不常驻 —— 常驻会跟受击红边、境界光环打架
      // 第102轮 UI 柔化：浅宣纸上这枚 r≈267 的青蓝亮圈是整屏最出戏的「几何圆」，
      //   退成断续淡墨笔线（无彩、低 alpha、去实心蓝盘）；深底图 / 鎏金皮保持原提示强度，
      //   免得深色场上反而读不出范围。ctx.save/restore 保证 setLineDash 不外泄。
      const softRing = SC3_SOFT_RING;
      if (G.pickPulseAt != null && G.time - G.pickPulseAt < 1.3) {
        const k = 1 - (G.time - G.pickPulseAt) / 1.3;
        const rr = pickupR();
        ctx.save();
        if (softRing) ctx.setLineDash([9, 11]);
        ctx.strokeStyle = softRing ? 'rgba(74,70,60,' + (0.10 * k).toFixed(3) + ')' : 'rgba(140,220,255,' + (0.28 * k) + ')';
        ctx.lineWidth = softRing ? 1 : 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.28); ctx.stroke();
        ctx.fillStyle = softRing ? 'rgba(74,70,60,' + (0.016 * k).toFixed(3) + ')' : 'rgba(140,220,255,' + (0.06 * k) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.28); ctx.fill();
        ctx.restore();
      }
      // 境界光环：层数越高越亮（浅纸上同款退成淡墨细环）
      if (G.realmIdx > 1) {
        const pw = softRing ? Math.min(0.16, 0.015 * G.realmIdx) : Math.min(0.5, 0.05 * G.realmIdx);
        ctx.strokeStyle = softRing ? 'rgba(74,70,60,' + pw + ')' : 'rgba(255,220,120,' + pw + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 8, 0, 6.28); ctx.stroke();
      }
    }

    // 持续型招式立起来那层：压在角色之上、粒子之下。
    // 放这个位置是为了「人从光柱里穿过去」有前后层次；再往下压会被角色挡成半截。
    for (const h of G.hazards) drawHazardBody(h);

    // 双人联机 P2：把远程队友画出来（青色光环 + 名牌区分本地金环）
    if (window.Coop) window.Coop.draw(ctx);

    // 领域先铺在地上（玄冰的寒域 / 元磁的重力场），弹道再压上去
    for (const fd of (G.fieldSlow || [])) drawField(fd);
    // 弹道：每门功法长得不一样
    for (const b of G.bullets) drawBulletVfx(b, 1);
    // 队友打出来的攻击：画出来，让你看得见他在出手（不参与命中判定）
    for (const b of G.fxBullets) drawBulletVfx(b, 0.78);
    // 环绕：玄罡的金环 / 大庚剑阵的青碧飞剑
    for (const o of G.orbPos) drawOrb(o);
    // pixelfx 像素特效层：角色之后、飘字之前。关掉加法光（见 fxpix.js 文件头），否则在宣纸白底上等于没画
    // 第102轮：浅纸上只把常驻领域法阵（hold）压到 0.42，一次性命中 / 暴击特效不受影响
    if (window.FX3) FX3.draw(ctx, SC3_SOFT_RING ? 0.42 : 1);
    for (const pt of G.parts) if (!pt.rune) drawPart(pt);
    for (const t of G.texts) { ctx.globalAlpha = Math.max(0, t.life / t.maxlife); ctx.fillStyle = t.color; ctx.font = 'bold ' + t.size + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.text, t.x, t.y); ctx.globalAlpha = 1; }

    ctx.restore();

    // 双人联机 P2：联机状态角标（屏幕空间，永远在最上层）
    if (window.Coop) window.Coop.drawHud(ctx);
    // P6 倒地观战：自己躺着时压一层暗色，明说现在只能看
    if (G.state === 'down') drawDownVeil();

    // 屏幕外际遇：边缘小箭头指路，免得满地图乱找
    for (const npc of G.npcs) drawEncArrow(npc);

    // 屏幕血光（二阶段演出 / 受击）
    if (G.flash > 0) { ctx.fillStyle = 'rgba(255,45,45,' + Math.min(0.42, G.flash * 0.42) + ')'; ctx.fillRect(0, 0, W, H); }

    // 结算小舞台（屏幕空间，最上层）
    if (G.state === 'victory' && G.settle) drawSettleStage();
  }

  // P6 倒地观战画面：暗色压屏 + 一句话说清怎么起来
  function drawDownVeil() {
    ctx.save();
    ctx.fillStyle = 'rgba(28,8,8,0.36)'; ctx.fillRect(0, 0, W, H);
    const left = Math.max(0, Math.ceil(DOWN_AUTO - G.downT));
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#ff9a9a';
    ctx.fillText('倒 下', W / 2, H / 2 - 30);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#e8dfc8';
    ctx.fillText('队友走到身边，站一下就能把你拉起', W / 2, H / 2);
    ctx.fillStyle = '#c9b27a';
    ctx.fillText(left > 0 ? (left + ' 秒后自行起身') : '正在起身…', W / 2, H / 2 + 26);
    ctx.restore();
  }

  // ---------- HUD ----------
  function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  // 生涯累计时长：单局用 mm:ss，几小时的累计再那么写就成了「327:00」，读不出量级
  function fmtSpan(t) {
    t = Math.max(0, t || 0);
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60);
    if (h > 0) return h + ' 时 ' + m + ' 分';
    if (m > 0) return m + ' 分';
    return Math.floor(t) + ' 秒';
  }
  function updateHUD() {
    const p = G.player; if (!p) return;
    elHpfill.style.width = U.clamp(p.hp / p.maxhp, 0, 1) * 100 + '%';
    // 第二条是「煞气」：攒满就顿悟。修为本身不再用 Lv 数字露脸，只显示段位
    const sst = shaSt();
    elXpfill.style.width = U.clamp(sst.v / sst.need, 0, 1) * 100 + '%';
    // 条上补「当前 / 上限」：只有比例看不出还差多少，也没法判断一颗丹够不够
    if (elHpval) elHpval.textContent = Math.max(0, Math.ceil(p.hp)) + '/' + Math.ceil(p.maxhp);
    if (elXpval) elXpval.textContent = Math.floor(sst.v) + '/' + Math.ceil(sst.need);
    elLevel.textContent = stageLabel(p) + (sst.dmgT > 0 ? '　·　杀意' : '');
    elTime.textContent = fmtTime(G.time);
    elKills.textContent = '斩 ' + G.kills;
    if (elBag) elBag.textContent = '袋 ' + (G.runLoot ? G.runLoot.length : 0);
    if (elStones) elStones.textContent = '灵石 ' + Math.round(save.stones || 0);
    if (elMapName) {
      const d = G.diff;
      elMapName.textContent = (G.map ? G.map.name : '') + (d && d.id !== 'easy' ? '　·　' + d.name : '');
      elMapName.style.color = d && d.id !== 'easy' ? d.color : '';
    }
    // 快捷栏只在能打的图里露面（每帧同步，不依赖进图那一刻的状态）
    if (elQuick) {
      const fightMap = G.map && (G.map.type === 'combat' || G.map.type === 'boss' || G.map.type === 'chase');
      elQuick.classList.toggle('on', !!fightMap && (G.state === 'play' || G.state === 'dialog'));
    }
    elSkillrow.innerHTML = '';
    for (const s of SKILLS) { const lv = skillLv(s.id); if (lv > 0) { const d = document.createElement('div'); d.className = 'pip'; d.innerHTML = '<span>' + s.icon + '</span><b>' + lv + '</b>'; elSkillrow.appendChild(d); } }
    if (G.boss) {
      // 血条永远贴着顶栏下沿走：顶栏在窄屏会换行变高，写死 96px 会把 Boss 名压到地图名上（Jerry 实测）
      const stackTop = (elTopbar && elTopbar.offsetHeight > 40) ? (elTopbar.offsetHeight + 8) : 96;
      elBosswrap.style.top = stackTop + 'px';
      elBosswrap.style.display = 'block'; elBossname.textContent = G.boss.name;
      elBossfill.style.width = U.clamp(Math.max(0, G.boss.hp) / G.boss.maxhp, 0, 1) * 100 + '%';
      // 血条底色是每帧写内联的（阶段二还要变色），所以皮肤的配色得在这儿分叉 ——
      // 只改 CSS 会被这行内联盖掉（踩过一次：#bossfill 的墨条规则写了却从不生效）。
      // 水墨皮：一阶段浓墨一道，二阶段墨里透朱砂（红了 = 要拼命了）。
      const p2 = !!G.boss.phase2;
      elBossfill.style.background = (save.skin === 'guigu')
        ? (p2 ? 'linear-gradient(90deg,#241c14,#7a2f22)' : 'linear-gradient(90deg,#3a352a,#4a4438 58%,#6b6353)')
        : (p2 ? 'linear-gradient(90deg,#ff1f1f,#ff9a4a)' : 'linear-gradient(90deg,#b03a3a,#ff5a4a)');
      if (elBossbar) elBossbar.classList.toggle('p2', !!G.boss.phase2);
    }
    else elBosswrap.style.display = 'none';
    // 鬼谷水墨 · 异兽卷轴插画：boss 出场时"展卷"浮起，约 2.6 秒后自己退成背景淡痕
    // （一直保持高透明度会和屏上的像素怪抢主体，两者都不是主角了）。金皮由 CSS 兜底强隐。
    if (elBossArt) {
      const artOn = !!(G.boss && save.skin === 'guigu');
      if (artOn && !elBossArt.classList.contains('on')) {
        elBossArt.classList.remove('fade');
        elBossArt.classList.add('on');
        clearTimeout(elBossArt._fadeT);
        elBossArt._fadeT = setTimeout(() => elBossArt.classList.add('fade'), 2600);
      } else if (!artOn && elBossArt.classList.contains('on')) {
        clearTimeout(elBossArt._fadeT);
        elBossArt.classList.remove('on', 'fade');
      }
    }
    if (elBossSeal) {
      const sealOn = !!(G.boss && save.skin === 'guigu');
      // 盖章动画只在「从无到有」那一次播：先摘类再下一帧戴上，避免每帧重播
      if (sealOn && !elBossSeal.classList.contains('on')) {
        elBossSeal.classList.remove('on');
        requestAnimationFrame(() => elBossSeal.classList.add('on'));
      } else if (!sealOn) elBossSeal.classList.remove('on');
    }
    const playing = G.state === 'play' || G.state === 'dialog' || G.state === 'levelup' || G.state === 'pause';
    elHud.style.display = playing ? 'block' : 'none';
    // 暂停键用 flex 居中两根竖条（图标是 CSS 画的，不是字体字形）
    elPauseBtn.style.display = G.state === 'play' ? 'flex' : 'none';
    // 自动战斗只出现在能打的图里；对话 / 选卡 / 暂停时也留着，否则一进对白按钮就没了
    if (elAutoBtn) {
      elAutoBtn.style.display = autoBtnAllowed() ? 'flex' : 'none';
      elAutoBtn.classList.toggle('on', !!G.autoOn);
    }
    if (elCombo && !playing) elCombo.style.display = 'none';
  }

  // ---------- 地图流程 ----------
  function hideAllOverlays() {
    if (elBanner) { elBanner.style.display = 'none'; clearTimeout(banner._t); }
    if (elItemToast) elItemToast.classList.remove('below');
    elTitle.style.display = 'none';
    elGameover.style.display = 'none';
    elVictory.style.display = 'none';
    elPause.style.display = 'none';
    elLevelup.style.display = 'none';
    elDialog.style.display = 'none';
    if (elWorldmap) elWorldmap.style.display = 'none';
    if (elShop) elShop.style.display = 'none';
    if (elDifficulty) elDifficulty.style.display = 'none';
    if (elCave) elCave.style.display = 'none';
    if (elPf) elPf.style.display = 'none';
    if (elRebirth) elRebirth.style.display = 'none';
    if (elWanling) elWanling.style.display = 'none';
    if (elSweep) elSweep.style.display = 'none';
    hideItemTip();
  }
  function resetRun() {
    if (window.Coop) window.Coop.reset();
    G.player = newPlayer();
    G.enemies = []; G.bullets = []; G.ebullets = []; G.gems = []; G.herbs = []; G.parts = []; G.texts = []; G.loot = []; G.tells = []; G.zones = []; G.hazards = [];
    G.reclaimedLost = null;   // 上一张图"寻回失落"的结算提示不带到这张图
    G.time = 0; G.kills = 0; G.spawnT = 1; G.nextEliteT = 100; G.eliteIdx = 0; G.artSeen = {};
    G.pickPulseAt = 0;   // 进图头 1.2 秒展示一次神念拾取圈
    G.fxBullets.length = 0; G.coopFrozen = false; G.dialogSynced = false;
    G.boss = null; G.bossActive = false; G.bossSpawned = false; G.bossWarned = false; G.extraIdx = 0;
    G.fieldSlow = []; G.shake = 0; G.flash = 0; G.hitStop = 0;
    G.decor = []; G.chunkMap = {}; G.cam = { x: -W / 2, y: -H / 2 }; G.orbPos = []; G.camLag = null;
    G.vacuumT = 0; G.pendingEnding = false; G.runLoot = []; G.matGain = 0; G.lastAutoSave = 0; G.pickLeft = 0;
    G.alch = null; G.alchWet = false;   // 破境药材配额，进图时按图重算
    G.breakHinted = false;   // 瓶颈弹幕每图只提一次
    G.minorHint = 0;         // 小境界关口弹幕也每图只提一次
    G.victoryNote = '';
    G.victoryTitle = '';     // 结局标题/描述的临时覆盖（破境图分三种结局：石门未闭 / 冲关失败 / 成了）
    G.victoryDesc = '';
    G.woundedNote = '';
    G.npcs = []; G.encT = 8;
    // 自动战斗只管这一趟：进新图一律复位，得重新点一次（「到结算为止」的边界就在这儿）
    G.autoOn = false; G.autoT = 0; G.autoAnchor = null; G.autoDodge = null; G.autoDodgePrev = null;
    G.realmIdx = 0; G.realm = { dmg: 0, atk: 0, spd: 0 }; G.realmHp = 0;
    resetCombo();
    for (const s of STORY) s.done = false;
    // 带入永久进度（跨地图不清零）：道具加成 + 装备加成
    resetRunBonus();
    // 单局循环：煞气清零、上一局的顿悟与祭炼不带进来；局时与「未竟」也归零
    resetRunBuffs();
    G.gear = gearBonus();
    recalcMaxhp();
    G.player.hp = G.player.maxhp;
  }

  // 把本局的等级与功法写回永久修为（只增不减）
  function syncCultivate() {
    const p = G.player; if (!p) return;
    if (!save.cultivate) save.cultivate = { level: 1, xp: 0, skills: {} };
    const c = save.cultivate;
    if (!c.skills) c.skills = {};
    // 破境图（地火之屋等）设有 startLevel 下限：进图会把战斗等级 p.level 抬到底线（如炼气期十三层），
    // 这只为战斗平衡，不代表玩家真修到了这一层。若把这条「夹逼」回写进存档修为，
    // 突破门槛就会只认被地图抬高的 level、而不是玩家真实修为 —— 即「以 level 论、不以修为论」。
    // 故：p.level 恰好等于本图下限、且存档修为本就低于该下限时，视为夹逼，不回写存档修为。
    const floor = (G.map && G.map.startLevel) || 0;
    const clampedOnly = (p.level === floor && (c.level || 1) < floor);
    if (p.level > (c.level || 1) && !clampedOnly) { c.level = p.level; c.xp = 0; }
    for (const k in p.skills) if ((p.skills[k] || 0) > (c.skills[k] || 0)) c.skills[k] = p.skills[k];
    if (c.level > (save.best.level || 1)) save.best.level = c.level;
  }

  // ================= 战前运功：进要动手的图之前，先把功法运起 / 卸下 =================
  // 记住上一张战斗图的运起结果；下一张战斗图仍会弹出，并默认照上一张先运起
  function pfTierGroups() {
    const c = cultObj();
    const out = [];
    for (const t of REALM_TIERS) {
      const list = SKILLS.filter(s => (c.skills[s.id] || 0) > 0 && skillTierOf(s).id === t.id);
      if (list.length) out.push({ tier: t, list: list });
    }
    return out;
  }
  function beginMap(id, diffId) {
    const m = MAPS.find(x => x.id === id);
    // 只有要动手的图才先问功法；剧情、坊市、洞府直接进
    if (!m || (m.type !== 'combat' && m.type !== 'boss')) { startMap(id, diffId); return; }
    G.pf = { id: id, diff: diffId };
    openPreFight();
  }
  function openPreFight() {
    const pend = G.pf; if (!pend) return;
    const m = MAPS.find(x => x.id === pend.id);
    const lv = Math.max(save.cultivate.level || 1, save.best.level || 1);
    // 记住的选择：照上一张战斗图运起的结果先运上
    const last = save.pfLast;
    if (last && last.length) {
      const c = cultObj();
      c.equipped = last.filter(k => (c.skills[k] || 0) > 0).slice(0, slotCapOf(lv));
      writeSave();
    }
    const cur = realmTierOf(lv);
    G.pfExp = {}; G.pfExp[cur.id] = true;
    G.state = 'prefight';
    hideAllOverlays();
    if (elPfName && m) elPfName.textContent = m.name;
    if (elPfSub && m) elPfSub.textContent = (m.pos || '') + '　·　择定身上要运的功法，再入山。';
    if (elPfRealm) elPfRealm.textContent = realmName(lv);
    renderPreFight();
    if (elPf) elPf.style.display = 'flex';
  }
  function pfTierBlock(tier, items, isCur, eq) {
    const open = !!(G.pfExp && G.pfExp[tier.id]);
    let h = '<div class="pf-tier' + (open ? ' open' : '') + (isCur ? ' cur' : '') + '" data-pftier="' + tier.id + '">' +
      '<div class="pf-tier-hd"><span class="caret">▸</span><span>' + tier.name + '</span>' +
      '<span class="pf-count">' + items.length + ' 门' + (isCur ? '　·　本境' : '') + '</span></div>' +
      '<div class="pf-list">';
    if (!items.length) h += '<div class="pf-note">这一档暂时没有可运的。</div>';
    for (const it of items) {
      const s = it.s, lv2 = cultObj().skills[s.id] || 0;
      const on = eq.indexOf(s.id) >= 0;
      h += '<div class="recrow' + (on ? ' can' : '') + '">' +
        '<div class="rr-main"><b>' + ico(s.icon) + s.name + '　' + lv2 + ' 重' +
        (it.tier.id === G.pfCurTier ? '' : '　<span class="pf-count">' + it.tier.name + '</span>') +
        '　[' + skillTypeLabel(s) + ']</b><em>' + s.desc + '</em></div>' +
        '<div class="rr-right"><button class="sr-btn' + (on ? ' ghost' : ' buy') + '" data-pfskill="' + s.id + '">' +
        (on ? '卸下' : '运起') + '</button></div></div>';
    }
    h += '</div></div>';
    return h;
  }
  function renderPreFight() {
    if (!elPfBody) return;
    const c = cultObj();
    const lv = Math.max(save.cultivate.level || 1, save.best.level || 1);
    const cap = slotCapOf(lv);
    const eq = (c.equipped || []).slice();
    const curTier = realmTierOf(lv);
    G.pfCurTier = curTier.id;
    const groups = pfTierGroups();
    if (elPfSlots) elPfSlots.textContent = '已运 ' + eq.length + ' / ' + cap;
    let html = '<div class="pf-note">身上同时运 <b>' + eq.length + ' / ' + cap + '</b> 门　·　本境（'
      + curTier.name + '）这一档摊开着；低境界的收在各自档里，点档名才展开。'
      + '低境界里已经运起的，会提到本境这一档并排列着 —— 要卸直接在这儿卸，不必回低境界去翻。</div>';
    // 本境这一档 = 本境功法 + 低境界里已运起的（提到一起，方便卸）
    const curGroup = groups.find(g => g.tier.id === curTier.id);
    const curList = (curGroup ? curGroup.list : []).map(s => ({ s: s, tier: curTier }));
    const promoted = [];
    for (const g of groups) {
      if (g.tier.id === curTier.id) continue;
      for (const s of g.list) if (eq.indexOf(s.id) >= 0) promoted.push({ s: s, tier: g.tier });
    }
    html += pfTierBlock(curTier, curList.concat(promoted), true, eq);
    // 其余各档：默认收起，点开才能挑
    for (const g of groups) {
      if (g.tier.id === curTier.id) continue;
      const rest = g.list.filter(s => eq.indexOf(s.id) < 0).map(s => ({ s: s, tier: g.tier }));
      if (!rest.length) continue;
      html += pfTierBlock(g.tier, rest, false, eq);
    }
    elPfBody.innerHTML = rarize(html);
  }
  function startMap(id, diffId) {
    const m = MAPS.find(x => x.id === id);
    if (!m) return;
    if (save.unlocked.indexOf(id) < 0) { notify('此路尚未开启'); return; }
    // 修为受创期间：比自身高出太多的战图不放行（原著里是闭完关、筑基后期才出海）
    if (save.wounded && (m.type === 'combat' || m.type === 'boss') && (m.startLevel || 1) > (save.cultivate.level || 1) + 12) {
      notify('修为未复 · 此图太凶，先回洞府闭关重修');
      Sfx.warn();
      return;
    }

    G.mapId = id; G.map = m;
    G._refHp = null;   // 本图怪物的硬度基准要重算（见 refHpOfMap）
    if (window.FX3) FX3.clear();   // 换图：上一张图的残留特效不许跟着带过来
    G._refDmg = null;  // 本图怪物的凶悍基准要重算（见 refDmgOfMap）
    G._hulAvg = null;  // 本图 hulMap 的平均值缓存在此（见 makeEnemy）
    G._hunterType = undefined;  // 本图的猎手要重新指定（见 hunterOfMap）
    G.diff = diffById(diffId || save.lastDiff || 'easy');
    if (diffId) save.lastDiff = G.diff.id;
    save.mapId = id;
    openScroll();       // 墨皮才有：宣纸展开一页，替代硬切
    resetRun();
    setupAlchQuota();   // 破境药材：按本图 + 本难度定这一趟的产量

    // 境界继承：取「存档永久修为」与「本图起点」的较高者 —— 回刷低级图不会倒退
    // 但「修为受创」期间不吃图的下限：跌回炼气期四层，就是炼气期四层，得自己修回来
    const p = G.player;
    const cult = save.cultivate || { level: 1, skills: {} };
    // 记下「进来之前」的境界：有些人进图就会被图的下限抬上去（筑基 / 结丹）
    const realmBefore = realmName(Math.max(1, cult.level || 1));
    p.level = Math.max(1, cult.level || 1, save.wounded ? 0 : (m.startLevel || 1));
    p.next = xpNeed(p.level);
    // 身上运转哪几门功法，由「已装配」决定；没装任何一门时自动运起主力
    p.skills = buildPlayerSkills(p.level, m);
    // 身外化身：学到就常驻（不看槽位，它是被动）
    if ((save.cultivate.skills || {}).huashen) spawnAvatar();
    if (!p.skills.sword) p.skills.sword = Math.min(cult.skills.sword || 1, window.skillCapById ? window.skillCapById('sword', p.level) : 99);
    checkRealm(true);
    recalcMaxhp();
    // 修为被封印的那些年，出手也弱一截
    if (save.sealed) {
      const k = save.sealed.dmg || 0.45;
      G.realm.dmg *= k; G.realm.atk *= k; G.realm.spd *= 0.7;
    }
    // 天人有五衰：出手、遁速同样要打折，通关一张图消一层（见 finishMap）
    const wu = wuPenalty();
    if (wu) { G.realm.dmg *= wu.dmg; G.realm.atk *= wu.dmg; G.realm.spd *= wu.spd; }
    applyHeroSprite();
    // 灵宠：有就带出来
    G.pet = save.pet ? { id: save.pet, x: p.x - 24, y: p.y + 10, cd: 0.6, bob: 0 } : null;
    // 同伴：剧情里跟来的人，站在另一侧
    G.mate = save.mate ? { id: save.mate, x: p.x + 34, y: p.y + 12, cd: 0.8, bob: 0 } : null;
    G.chaseDone = false;
    G.quickCd = [0, 0, 0];
    renderQuickBar();
    p.hp = p.maxhp;

    hideAllOverlays();
    buildGrass(m);
    G.state = 'play'; last = performance.now();
    G.coopRole = (window.Net && window.Net.self() && window.Net.isHost()) ? 'host' : (window.Net && window.Net.self() ? 'client' : null);
    G._claimedDrops = new Set(); G._hostVacuum = false; G._endSent = false;
    // 一进门就跨了大境界（筑基 / 结丹）：这一声得给，别让人不知道自己现在在哪一层
    if (realmName(p.level) !== realmBefore) banner('境界 · ' + realmName(p.level));
    // 绿液区：进门那一滴绿液已经入土，这一畦「灵润」，草木正催
    if (G.alchWet) setTimeout(function () { if (G.state === 'play') banner('灵润 · 绿液入土，这一畦可采高年份'); }, 700);
    // 破境图：物事未齐时进门就提醒一句 —— 此图可打可拾，破不了境
    if (m.endLevel) {
      const g = breakReqFor(m.endLevel);
      const missGate = g ? breakMissing(g) : [];
      if (g && missGate.length) {
        const lvMiss = missGate.some(mm => mm.kind === 'level');
        let text;
        if (lvMiss) {
          const others = missGate.filter(mm => mm.kind !== 'level').map(m => {
            if (m.kind === 'stone') return '灵石×' + m.need;
            if (m.kind === 'skill') { const sk = window.skillById ? window.skillById(m.id) : null; return sk ? sk.name : m.id; }
            if (m.kind === 'story') return '先通关·' + (m.name || m.id);
            const it = Items.get(m.id);
            return (it ? it.name : m.id) + '×' + m.need;
          });
          text = '修为未达 ' + (g.from || '') + '·巅峰（须达 Lv' + ((g.lv || 0) - 1) + '）· 先厚实根基'
            + (others.length ? ('；另须备：' + others.join('、')) : '') + '，再来此图冲关';
        } else {
          text = '破境之物未齐（还差 ' + missGate.length + ' 样：' + missLabels(g).join('、') + '）· 此图可打可拾，集齐了再来冲关';
        }
        setTimeout(function () {
          if (G.state === 'play' || G.state === 'dialog') banner(text);
        }, 1400);
      }
    }
    // 修为被封着：进图先提醒一句，别让人以为自己变弱了
    if (save.sealed) setTimeout(function () { if (G.state === 'play') banner('修为被封 · ' + (save.sealed.name || '煞气')); }, 900);

    if (m.type === 'story') {
      // 破境剧情图（闭府结丹 / 云梦山结婴…）的开场要按「门开不开得了」分流：
      // 物事没备齐，就不能演「丹成」那一版，否则对话说成了、结算却说没成（自相矛盾）。
      const sc = storySceneOf(m, id);
      if (storySeen(sc.key)) { onStoryMapDone(m); return; }   // 演过就不再念，后果照走（奖励/破境判定不受影响）
      G.state = 'dialog';
      showLines(sc.lines, () => { storyMarkSeen(sc.key); onStoryMapDone(m); }, 'map:' + id);
      return;
    }
    if (m.type === 'market') {
      // 坊市里走不动路，所以「遇人」改成进门那一下：有未了的因缘，先被拉到一边说话，谈完再摆摊
      const openShop = () => {
        G.state = 'shop'; G.shopTab = 'buy';
        renderShop();
        if (elShop) elShop.style.display = 'flex';
        if (save.settings.autoSave) writeSave();
      };
      const meetThenShop = () => {
        const pending = encListOnMap().filter(encCondOk).filter(e => !e.repeat)[0];
        if (pending) {
          G.state = 'dialog';
          showLines(pending.lines, () => { meetEncounter(pending); openShop(); }, 'enc:' + pending.id);
          return;
        }
        openShop();
      };
      // 坊市也有它自己的开场白（太南小会：金光上人的升仙令、万小山）
      // 只讲一次 —— 坊市可以反复进出；原先按「是否通关」判断，没通关时每进一次就把整段开场重念一遍。
      // 现在与其它剧情统一走「已看节点」记账，进过一次就再不念。
      const mktKey = 'intro:' + m.id;
      const mktLines = MAP_STORIES[m.id];
      if (mktLines && mktLines.length && !storySeen(mktKey)) {
        G.state = 'dialog';
        showLines(mktLines, () => { storyMarkSeen(mktKey); meetThenShop(); }, 'map:' + m.id);
        return;
      }
      meetThenShop();
      return;
    }
    // 战斗 / 剧情战
    if (m.intro && MAP_STORIES[m.intro]) {
      const afterIntro = () => {
        G.state = 'play'; last = performance.now();
        G.coopRole = (window.Net && window.Net.self() && window.Net.isHost()) ? 'host' : (window.Net && window.Net.self() ? 'client' : null);
        // 剧情战（type:'boss'）：开门即 Boss，无小怪阶段，过场播完直接放 Boss。
        // 战斗图（type:'combat'）：intro 只是过场，播完必须回到正常战斗循环——
        //   先刷小怪、到点（bossAt）再放 Boss；在此直接 spawnBoss() 会把整个小怪阶段跳过（peak=0）。
        if (m.type === 'boss') spawnBoss();
      };
      const introKey = 'intro:' + m.id;
      if (storySeen(introKey)) { afterIntro(); return; }   // 过场看过就直接开打，别再念一遍
      G.state = 'dialog';
      showLines(MAP_STORIES[m.intro], () => { storyMarkSeen(introKey); afterIntro(); }, 'map:' + id);
      return;
    }
    if (save.settings.autoSave) writeSave();
  }

  function onStoryMapDone(m) {
    finishMap(m);
  }
  // 破境剧情图的开场台词：备齐了演正剧（jiedan），没备齐演「点检行囊、石门不落」（jiedan_lock）。
  // 判定口径与破境门完全一致（修为 + 丹药 + 主药 + 灵石），不另立一套标准。
  // 没写专属 lock 台词的破境图（灵界 / 仙界那几张）走中性兜底 —— 宁可少说一句，也绝不能
  // 让「料都没齐」的开场先替玩家把「成了」说出口。
  function storyKeyOf(m, id) {
    if (!m || !m.endLevel) return id;
    const g = breakReqFor(m.endLevel);
    if (!g) return id;
    const lockKey = id + '_lock';
    if (!MAP_STORIES[lockKey]) return id;
    return breakReadyNow(g) ? id : lockKey;
  }
  function storyLinesOf(m, id) {
    if (!m || !m.endLevel) return MAP_STORIES[id];
    const g = breakReqFor(m.endLevel);
    if (!g || breakReadyNow(g)) return MAP_STORIES[storyKeyOf(m, id)];
    const lock = MAP_STORIES[id + '_lock'];
    if (lock) return lock;
    return [
      ['旁白', '他把该备的东西在石台上又点了一遍。'],
      ['韩立', '（还差着。' + (g.from || '') + ' → ' + (g.realm || '') + '，这一步不能这么走。）'],
      ['旁白', '东西一样样收了回去，他转身退回原处。']
    ];
  }
  // 剧情图这一场「到底是哪一版」+ 该不该记账。
  // 口径必须和 storyLinesOf 完全一致，否则会出现「记了 A 版的账、播的却是 B 版」。
  // 料没齐时那段中性兜底（「还差着…」）不是正剧，不记账 —— 备齐了还要再演一次正剧。
  function storySceneOf(m, id) {
    const lines = storyLinesOf(m, id);
    if (!m || !m.endLevel) return { lines: lines, key: 'scene:' + id };
    const g = breakReqFor(m.endLevel);
    if (!g || breakReadyNow(g)) return { lines: lines, key: 'scene:' + id };
    const lockKey = id + '_lock';
    return MAP_STORIES[lockKey] ? { lines: lines, key: 'scene:' + lockKey } : { lines: lines, key: null };
  }
  function startOutro() {
    const m = G.map; if (!m) return;
    let key = m.outro || (m.id === 'houshan' ? 'houtro' : m.id === 'mishi' ? 'moutro' : m.id === 'yaoyuan' ? 'yooutro' : m.id === 'xuese' ? 'xsoutro' : null);
    // 地火之屋：击败 Boss 后的台词按「是否已具备筑基条件」分流。
    // 原著里地火之屋是筑基门槛，玩家到此未必真到了筑基 —— 不能一概说「筑基已成」。
    // 已具备筑基之物（或早已筑基）→ 正常结局台词；否则 → 勉励台词，且下一章依旧锁着。
    if (m.id === 'zhuji' && MAP_STORIES['zhuji_out']) {
      const bg = m.endLevel ? breakReqFor(m.endLevel) : null;
      if ((save.cultivate.level || 1) >= 36) {
        // 提前已筑基：省略进阶剧情，直接进「被发现已筑基」的对白（原著里李化元当场点破）
        key = 'zhuji_out_ready';
      } else if (breakReadyNow(bg)) {
        // 已备齐（修为已达炼气期十三层 + 破境之物齐）：先问玩家是否就此突破（成败各凭把握）
        key = 'zhuji_out_ask';
      } else if (bg && !breakLevelOk(bg)) {
        // 修为未达当前境界巅峰（如尚未炼气期十三层）：丹药齐了也冲不动 → 勉励厚实根基 + 锁后章
        key = 'zhuji_out_lock_lv';
      } else {
        // 修为到了但破境之物不齐：勉励备齐 + 锁后章
        key = 'zhuji_out_lock';
      }
    }
    const lines = key && MAP_STORIES[key];
    // 共斗中的客机不再自己播一遍收尾对话：房主那段已经通过对话同步过来了。
    // （onEnd 收到 'win' 会走到这里；若再 showLines 一次，客机就得在房主点完之后
    //  再点第二遍才进结算 —— 这正是用户报的那个 bug。）
    // 奖励与结算照常走 finishMap，一样不少。
    if (lines && G.coopRole === 'client' && G.coopShared) { finishMap(m); return; }
    if (lines) {
      // 收场台词同样只念一次：重刷已通过的图，直接进结算。
      // 例外：zhuji_out_ask 是「要不要就此破境」的抉择，跳过去等于替玩家做了决定，故每次都问。
      const askBreak = (key === 'zhuji_out_ask');
      const outroKey = 'outro:' + key;
      if (!askBreak && storySeen(outroKey)) { finishMap(m); return; }
      G.state = 'dialog';
      // 「已备齐破境之物」分支：播完询问对白后，让玩家自己选「进阶 / 暂不进阶」
      const onEnd = askBreak
        ? () => zhujiAskBreak(m)
        : () => { storyMarkSeen(outroKey); finishMap(m); };
      showLines(lines, onEnd, 'outro:' + m.id);
    } else finishMap(m);
  }
  // 地火之屋·已备齐破境之物：让玩家自行决定是否突破
  function zhujiAskBreak(m) {
    const gate = m.endLevel ? breakReqFor(m.endLevel) : null;
    const rate = gate ? Math.round(breakSuccessRate(gate) * 100) : 0;
    showChoice(
      '丹药、主药、灵石皆已备齐，冲关把握约 ' + pctCheng(rate) + '。是否就此借地火之屋的火脉冲关？',
      [{ t: '就此进阶', v: 'yes' }, { t: '暂不进阶·回洞府', v: 'no' }],
      (v) => {
        if (v === 'yes') zhujiCommitBreak(m, gate);
        else gotoZhujiCave();   // 不突破 → 回洞府继续修行打怪备取破境之物
      }
    );
  }
  // 地火之屋·玩家选择突破：跑真实破境（含成败），成败分别走不同对白与去处
  function zhujiCommitBreak(m, gate) {
    if (!gate) { finishMap(m); return; }
    breakSceneThen(gate, (g, ok) => {
      if (ok) {
        // 成功：播「筑基已成」对白，再结算并解锁下一章
        showLines(MAP_STORIES['zhuji_out'], () => finishMap(m), 'zhuji:success');
      } else {
        // 失败：勉励玩家厚实根基，为下次破境做准备，然后退回洞府
        showLines(MAP_STORIES['zhuji_out_fail'], () => gotoZhujiCave(), 'zhuji:fail');
      }
      G.breakCaveId = null;   // 破境结算后清空「出关洞府」上下文
    });
  }
  // 退回内门洞府（地火之屋的归属洞府）；若尚未开启则一并开通，保证「回到洞府界面」可达
  function gotoZhujiCave() {
    const c = 'cuiping';
    if ((save.caves || []).indexOf(c) < 0) { save.caves.push(c); writeSave(); }
    openCave(c);
  }
  function isFirstClear(m) { return save.cleared.indexOf(m.id) < 0; }
  function unlockNext(m) {
    if (!m || !m.next) return null;
    if (save.unlocked.indexOf(m.next) >= 0) return null;
    save.unlocked.push(m.next);
    const nm = MAPS.find(x => x.id === m.next);
    return nm || null;
  }
  function finishMap(m) {
    if (!m) return;
    // 天人有五衰：每打通一张图，压在身上的衰消一层（X2C327「只能扛」——扛完才过去）
    if (wuLayers() > 0) {
      const st = wuState();
      st.n = Math.max(0, st.n - 1);
      if (st.n === 0) banner('五衰尽去 · 这一层总算熬过去了');
      writeSave();
    }
    syncCultivate();
    // 这张图是不是「大境界破境图」：endLevel 恰好是一道大境界门（地火之屋筑基 / 天星城结丹 …）
    const breakGate = m.endLevel ? breakReqFor(m.endLevel) : null;
    // 有些图通关本身就是一次境界跃迁（地火之屋炼丹筑基 / 洞府闭府结丹）。
    // 这类突破必须落在「图打通之后」，不能一进门就把人抬上去 —— 门还没进就筑基，说不过去。
    // 但若这张图正是大境界破境图，则境界不在此刻落地，改为「先演一段剧情、演完再破」，见文末。
    let realmUp = null;
    if (m.endLevel && m.endLevel > (save.cultivate.level || 1) && !breakGate) {
      const prevName = realmName(save.cultivate.level || 1);
      save.cultivate.level = m.endLevel;
      save.cultivate.xp = 0;
      if (G.player) {
        G.player.level = m.endLevel;
        G.player.next = xpNeed(m.endLevel);
        checkRealm(true);
        recalcMaxhp();
        if (G.player.hp > G.player.maxhp) G.player.hp = G.player.maxhp;
      }
      if (m.endLevel > (save.best.level || 1)) save.best.level = m.endLevel;
      if (realmName(m.endLevel) !== prevName) realmUp = realmName(m.endLevel);
    }
    const first = isFirstClear(m);
    if (first) save.cleared.push(m.id);
    // 再战把这张图打穿了：上一次道陨掉的道具原物奉还。灵石不在此列。
    const reclaimed = reclaimLost(m.id);
    G.reclaimedLost = reclaimed;
    // 黄枫谷·山门：升仙令配发的筑基丹，当场被叶师叔换走（原著因果）。
    // 对话白纸黑字写「配发筑基丹一枚」又「丹归叶师叔」，储物袋必须真的收到、又真的失去；
    // 一次结清，且记入 save.met，重进此图绝不重复给/拿（不会凭空多/少一枚）。
    if (m.id === 'huangfeng' && first && (save.met || []).indexOf('hf_zhuji') < 0) {
      const zj = Items.get('zhuji');
      if (zj) {
        addToBag(zj, { silent: true });                                          // 配发一枚
        save.inventory.zhuji = Math.max(0, (save.inventory.zhuji || 0) - 1);     // 叶师叔当场换走
        save.totalItems = Math.max(0, (save.totalItems || 0) - 1);
        (save.met = save.met || []).push('hf_zhuji');
      }
    }
    checkLiUnlock();
    checkPetRelease(m);
    checkMateLeave(m);
    // 剧情图与坊市不吃难度加成
    const isFight = m.type === 'combat' || m.type === 'boss';
    const d = isFight ? (G.diff || DIFFICULTIES[0]) : DIFFICULTIES[0];
    // 难度记录（仅战斗类）
    let newDiff = false;
    if (isFight) {
      if (!save.diffClear[m.id]) save.diffClear[m.id] = {};
      if (!save.diffClear[m.id][d.id]) { save.diffClear[m.id][d.id] = true; newDiff = true; }
    }
    const nr = m.reward || {};
    const gained = { stones: 0, items: [], mats: [], pets: [], mates: [] };
    if (first) {
      const st = Math.round((nr.stones || 0) * (d.stone || 1));
      if (st) { save.stones = (save.stones || 0) + st; gained.stones = st; }
      if (nr.items) for (const id of nr.items) {
        const it = Items.get(id);
        if (!it) continue;
        if (isGatePill(it.id)) addToBag(it, { silent: true });
        else applyItem(it, { silent: true, noRun: true });
        gained.items.push(it);
      }
      // 剧情给的灵宠
      if (nr.pets) for (const pid of nr.pets) { if (addPet(pid) === 'ok') gained.pets.push(pid); }
      // 剧情给的同伴：走到哪儿，跟到哪儿
      if (nr.mates) for (const mid of nr.mates) { if (addMate(mid) === 'ok') (gained.mates = gained.mates || []).push(mid); }
      // 剧情给的封印（被人打残、封了修为）
      if (nr.seal) save.sealed = Object.assign({}, nr.seal);
      if (nr.unseal) save.sealed = null;
      // 章节只赠药材，不赠成丹 —— 丹要自己开炉
      if (nr.mats) for (const mm of nr.mats) {
        const it = Items.get(mm[0]);
        if (!it) continue;
        save.inventory[it.id] = (save.inventory[it.id] || 0) + mm[1];
        save.totalItems = (save.totalItems || 0) + mm[1];
        gained.mats.push({ item: it, n: mm[1] });
      }
      // 批量成品（古长老袖里那五枚降尘丹之类）：只入袋，不当场服下
      if (nr.grants) for (const g of nr.grants) {
        const it = Items.get(g[0]);
        if (!it) continue;
        const n = g[1] || 1;
        save.inventory[it.id] = (save.inventory[it.id] || 0) + n;
        save.totalItems = (save.totalItems || 0) + n;
        gained.mats.push({ item: it, n: n });
      }
    } else if (newDiff && nr.stones) {
      // 重刷时首次拿下更高难度：补一份灵石
      const st = Math.round((nr.stones || 0) * 0.35 * (d.stone || 1));
      save.stones = (save.stones || 0) + st; gained.stones = st;
    }
    // 剧情图通关 → 成为洞府（安全屋，此后不再有妖物）
    let cave = null;
    if (m.cave && CAVES[m.cave] && save.caves.indexOf(m.cave) < 0) {
      save.caves.push(m.cave);
      cave = CAVES[m.cave];
    }
    // 拿到可移栽的灵药，当场留一株作种入园（原著：绿液移药，此后定期可采）
    {
      const _tr = autoTransplant(true);
      if (_tr.length) gained.transplants = _tr;
    }
    // 古传送阵：为南宫婉疗伤，修为被吸干 —— 原著第403章左右：跌回「炼气期四层」。
    // 照原著照抄：真跌到炼气期四层。恢复不走打怪，走「回洞府闭关 + 大量服食丹药」，见 REBUILD_STAGES。
    if (m.id === 'guchuan' && !save.wounded && !save.woundedDone) {
      const lv0 = save.cultivate.level || 1;
      if (lv0 > 7) {
        save.wounded = { to: lv0, mult: 1 };
        save.woundedDone = true;   // 一次性代价：重修补回修为后再进这张图，不会再跌第二回
        // 炼气期四层在境界表里是 Lv7（Lv4 只是「炼气期二层」），别按数字直觉写 4
        save.cultivate.level = 7;
        save.cultivate.xp = 0;
        // 「历史最高」也一并压下去：洞府与属性面板都是取 max(修为, 最高) 显示境界，
        // 不压的话跌了也看不出来，还会被当成本境去算功法位与装配。
        save.best.level = 7;
        if (G.player) { G.player.level = 7; G.player.next = xpNeed(7); checkRealm(true); recalcMaxhp(); G.player.hp = G.player.maxhp; }
        G.woundedNote = '修为受创 · 跌回炼气期四层（原著如此）。回小寰岛洞府闭关重修，方能一层层补回';
      }
    }
    // 太南小会散场后，后巷才会有人（原著那两个散修际遇挂在小会上，坊市里刷不出人）
    if (m.id === 'tainan' && save.unlocked.indexOf('heixiang') < 0) save.unlocked.push('heixiang');
    // 入落云宗（只是领了差事、分到天泉峰）后，药园那段支线才开；药园通关即成本命洞府（原著第 603-604 章）
    if (m.id === 'luoyun' && save.unlocked.indexOf('luoyunyaoyuan') < 0) save.unlocked.push('luoyunyaoyuan');
    // 结婴在洞府里进行：若玩家跳过了药园支线，这里兜底把洞府补开，免得无洞府可归
    if (m.id === 'jieying' && save.caves.indexOf('luoyun') < 0) save.caves.push('luoyun');
    // 破境图：物事齐了才谈冲关；冲关还可能失败 —— 解锁下一图要等「真的破了」才给
    // alreadyPast：早已站在这道门之后（如重打这张破境图），不再重复冲关，也不因「没带丹」被反锁
    const alreadyPast = !!(m.endLevel && (save.cultivate.level || 1) >= m.endLevel);
    const isGate = !!(breakGate && !alreadyPast);
    const missGate = isGate ? breakMissing(breakGate) : [];
    const breakReady = isGate ? missGate.length === 0 : true;
    const blocked = !!(isGate && !breakReady);
    save.wins++;
    // 打完一张图：只留三门最精的功法带去下一张，余者散去（剧情传世功法除外）
    G.lastPrune = pruneSkillsTop3();
    if (isGate) {
      const lvMiss = missGate.some(m => m.kind === 'level');
      G.victoryNote = blocked
        ? (lvMiss
            ? ('修为未达 ' + (breakGate.from || '') + ' · 先厚实根基，再回此图冲关')
            : ('破境之物未齐（还差 ' + missGate.length + ' 样）· 集齐了再来此图冲关'))
        : ('破境之物已齐 · 就地冲关（持丹 ' + breakGatePills(breakGate) + ' 枚 · 把握 ' + pctCheng(breakSuccessRate(breakGate) * 100) + '）');
    } else {
      G.victoryNote = '';
    }
    if (blocked) {
      G.breakPending = breakGate;
      save.mapId = m.id;
      // 关没闭成：结局标题不能还写「结丹已成」。图里配了专用文案就用，没配则给中性兜底。
      G.victoryTitle = m.clearTitleLock || (m.name + ' · 未了');
      G.victoryDesc = m.clearDescLock || '这一趟没走到那一步 —— 该备的还没备齐。';
      writeSave();
      showVictory(m, gained, null, cave, newDiff, realmUp);
      return;
    }
    if (!isGate) {
      const newly = unlockNext(m);
      save.mapId = m.next || m.id;
      writeSave();
      showVictory(m, gained, newly, cave, newDiff, realmUp);
      return;
    }
    // 冲关演出 → 成则破境并解锁下一图；败则丹药散尽、原地再来
    writeSave();
    breakSceneThen(breakGate, (g, ok) => {
      // 先诚实地把这一炉的结果说完，再进结算界面。
      // 结丹：结成了播 jiedan_win，散了播 jiedan_fail（第386章两种都有）；没配结尾台的图照旧直接结算。
      const after = () => {
        let newly = null;
        if (ok) {
          newly = unlockNext(m); save.mapId = m.next || m.id;
          // 有专属结局台词的图（结丹），结局已经说清了，别再叠一句「持丹 1 枚 · 把握五成」的旁注
          if (MAP_STORIES[m.id + '_win']) G.victoryNote = '';
        } else {
          G.breakPending = g; save.mapId = m.id;
          // 冲关未成：标题同样不许留「已成」。配了专用文案就用，没配则给中性兜底。
          G.victoryTitle = m.clearTitleFail || (m.name + ' · 冲关未成');
          G.victoryDesc = m.clearDescFail || '这一炉没成。';
          // 失败时更不能留着「破境之物已齐 · 就地冲关」那句 —— 刚才那一炉已经散了
          G.victoryNote = m.clearTitleFail ? '' : '冲关失败 · 丹药散尽，另备丹药再来此图';
        }
        writeSave();
        showVictory(m, gained, newly, cave, newDiff, ok ? realmName(g.lv) : null);
      };
      const tail = MAP_STORIES[m.id + (ok ? '_win' : '_fail')];
      if (tail && tail.length) {
        G.state = 'dialog';
        showLines(tail, after, 'break:' + m.id + ':' + (ok ? 'win' : 'fail'));
      } else after();
    });
  }
  function showVictory(m, gained, newly, cave, newDiff, realmUp) {
    G.state = 'victory';
    settleInit();   // 结算小舞台：两人可以在左下角这块自由走动
    // 双人联机：房主通关 = 共享胜利，把战果（击杀/时长）广播给客机，让双方结算界面一致
    if (G.coopRole === 'host' && window.Coop && !G._endSent) { G._endSent = true; window.Coop.sendEnd('win'); }
    Sfx.win();
    // 破境图有三种结局（石门未闭 / 冲关未成 / 成了），标题与描述按实际结果走，不搞一律「已成」
    const vTitle = G.victoryTitle || m.clearTitle || (m.name + ' · 已了');
    const vDesc = G.victoryDesc || m.clearDesc || '所得已入储物袋。';
    if (elVictoryTitle) elVictoryTitle.textContent = vTitle;
    if (elVictoryDesc) {
      const base = vDesc;
      // 剧情图 / 坊市没有「打完一场收功法」这回事，别把注脚塞进结局文气里
      const pruneNote = ((m.type === 'story' || m.type === 'market') ? '' : ((G.lastPrune && G.lastPrune.cut > 0) ? '　功法已敛 · 只留三门最精' : ''));
      const bn = G.victoryNote ? ('　' + G.victoryNote) : '';
      const wn = G.woundedNote ? ('　' + G.woundedNote) : '';
      elVictoryDesc.textContent = (realmUp ? ('境界已进 · ' + realmUp + '　') : '') + base + pruneNote + bn + wn;
    }
    G.victoryTitle = ''; G.victoryDesc = '';   // 一张图一套结局，用过即清，别带到下一张
    if (elVictoryStats) elVictoryStats.style.display = (m.type === 'story' || m.type === 'market') ? 'none' : 'flex';
    elVTime.textContent = fmtTime(G.time); elVKills.textContent = G.kills; elVLevel.textContent = realmName(G.player.level);
    renderVictoryLoot(gained, newly, cave, newDiff);
    elVictory.style.display = 'flex';
    refreshTitle();
  }
  function renderVictoryLoot(gained, newly, cave, newDiff) {
    if (!elVictoryLoot) return;
    const counts = {};
    for (const id of G.runLoot) counts[id] = (counts[id] || 0) + 1;
    let rows = Object.keys(counts).map(id => {
      const it = Items.get(id); if (!it) return '';
      const r = RARITY[it.rarity];
      return '<div class="lootrow"><b style="color:' + r.color + '">[' + r.name + '] ' + it.name + '</b><span>×' + counts[id] + '</span></div>';
    }).join('');
    if (G.matGain) rows += '<div class="lootrow"><b style="color:#9fe0c0">杂材 · 草药矿石灵物</b><span>×' + G.matGain + '</span></div>';
    let extra = '';
    if (gained) {
      if (gained.stones) extra += '<div class="lootrow reward"><b>灵石入袋</b><span>+' + gained.stones + '</span></div>';
      for (const it of gained.items) {
        const r = RARITY[it.rarity];
        extra += '<div class="lootrow reward"><b style="color:' + r.color + '">' + it.name + '</b><span>章节赠予</span></div>';
      }
      const trIds = (gained.transplants || []).map(x => x.id);
      for (const mm of (gained.mats || [])) {
        const r = RARITY[mm.item.rarity];
        const planted = trIds.indexOf(mm.item.id) >= 0;
        extra += '<div class="lootrow reward"><b style="color:' + r.color + '">' + mm.item.name + '</b><span>药材 ×' + mm.n +
          (planted ? ' · 留种入药圃 ×1' : '') + '</span></div>';
      }
      for (const tm of (gained.transplants || [])) {
        // 战利品里当场留种的，已在上面那行标过，不重复列
        if ((gained.mats || []).some(x => x.item.id === tm.id)) continue;
        extra += '<div class="lootrow reward"><b style="color:#9fe0c0">移栽 · ' + tm.name + '</b><span>留种 ×1 入药圃</span></div>';
      }
    }
    const dm = (G.map && (G.map.type === 'combat' || G.map.type === 'boss')) ? (G.diff || DIFFICULTIES[0]) : DIFFICULTIES[0];
    if (G.pickLeft > 0) {
      extra += '<div class="lootrow"><b style="color:#8b96a6">视野外未及拾取</b><span>' + G.pickLeft + ' 件 · 留在原地</span></div>';
    }
    if (G.reclaimedLost && G.reclaimedLost.items > 0) {
      extra += '<div class="lootrow reward"><b style="color:#ffd24a">寻回前番失落</b><span>道具 ×'
        + G.reclaimedLost.items + '（' + G.reclaimedLost.kinds + ' 味）· 原物奉还</span></div>';
    }
    if (dm.id !== 'easy') {
      extra += '<div class="lootrow reward"><b style="color:' + dm.color + '">' + dm.name + '</b><span>难度加成已并入</span></div>';
    }
    let nextLine = '';
    if (cave) nextLine += '<div class="loottotal newmap">洞府已开 · ' + cave.name + '（' + cave.pos + '）可静修、炼丹、炼器</div>';
    if (newly) nextLine += '<div class="loottotal newmap">新图解锁 · ' + newly.name + '（' + newly.pos + '）</div>';
    else if (G.map && !G.map.next && !G.map.side) nextLine += '<div class="loottotal newmap">乱星海已尽 · 回天南的那条路，留待下一部</div>';
    // 计数要把「章节赠予」也算进去，不然剧情图会显示「所得 0 件」却列着四行
    const giftN = gained
      ? ((gained.items ? gained.items.length : 0) + (gained.mats || []).reduce((a, x) => a + (x.n || 0), 0))
      : 0;
    elVictoryLoot.innerHTML =
      '<div class="loottitle">此行所得 ' + (G.runLoot.length + G.matGain + giftN) + ' 件'
        + (dm.id !== 'easy' ? '　<span class="dl-tag" style="color:' + dm.color + '">' + dm.name + '</span>' : '') + '</div>' +
      (rows || (extra ? '' : '<div class="lootrow muted">未拾得道具</div>')) +
      extra +
      '<div class="loottotal">储物袋累计 ' + (save.totalItems || 0) + ' 件 · 灵石 ' + (save.stones || 0) + '</div>';
    if (elVictoryNext) elVictoryNext.innerHTML = nextLine;
  }
  // 标题页统计：原来十一项用「·」串成两行长句，在 393 宽上要折三到四行，读起来是流水账。
  // 改成两列 key-value：字段名与数值各占一边，扫一眼就能对上，行数也固定。
  function tsRow(k, v, wide) {
    return '<div class="ts-row' + (wide ? ' wide' : '') + '"><i>' + k + '</i><b>' + v + '</b></div>';
  }
  // 首页只报「生涯累计」与「收集进度」——玩家真正关心的是这一世走到哪了，
  // 不是上一局打了多少。单局最高（best）留在结算页，不再占首页。
  function refreshTitle() {
    if (elBest) {
      const rp = rebirthPool();
      elBest.innerHTML =
        '<div class="ts-hd">生涯</div><div class="ts-grid">' +
        tsRow('累计斩敌', (save.totalKills || 0).toLocaleString('en-US')) +
        tsRow('修行时长', fmtSpan(save.playTime || 0)) +
        tsRow('通关', save.wins + ' 次') +
        tsRow('最高境界', realmName(save.best.level || 1)) +
        (rp.cycles ? tsRow('轮回余荫', '第 ' + rp.cycles + ' 世 · 已加成', true) : '') +
        '</div>';
    }
    if (elTitleBag) {
      const m = MAPS.find(x => x.id === (save.mapId || 'qixuan')) || MAPS[0];
      const main = MAPS.filter(x => !x.side);
      const clearedMain = main.filter(x => (save.cleared || []).indexOf(x.id) >= 0).length;
      const cs = save.cultivate.skills || {};
      const skillN = Object.keys(cs).filter(k => (cs[k] || 0) > 0).length;
      const skillAll = (window.SKILLS || []).length;
      const caveAll = Object.keys(CAVES || {}).length;
      const wanAll = (window.ALL_ITEMS || []).filter(i => i && i.rarity === 5 && i.unique);
      const inv = save.inventory || {};
      const wanN = wanAll.filter(i => inv[i.id]).length;
      elTitleBag.innerHTML =
        '<div class="ts-hd">道途</div><div class="ts-grid">' +
        tsRow('当前境界', realmName(save.cultivate.level || 1)) +
        tsRow('破关', clearedMain + '/' + main.length) +
        tsRow('功法', skillN + '/' + skillAll) +
        tsRow('洞府', (save.caves || []).length + '/' + caveAll) +
        tsRow('万灵榜', wanN + '/' + wanAll.length) +
        tsRow('法器', equippedCount() + '/4') +
        tsRow('灵石', (save.stones || 0).toLocaleString('en-US')) +
        tsRow('储物袋', (save.totalItems || 0) + ' 件') +
        tsRow('现处', m.name, true) +
        '</div>';
    }
  }
  function autoSave() {
    if (!save.settings.autoSave) return;
    if (G.time - (G.lastAutoSave || 0) < 2) return;
    G.lastAutoSave = G.time;
    writeSave();
  }
  function manualSave() {
    if (!save.settings.manualSave) { notify('手动存档已关闭'); return false; }
    writeSave();
    if (elSaveHint) elSaveHint.textContent = '已存档 ' + new Date().toTimeString().slice(0, 8);
    notify('已手动存档');
    return true;
  }
  function syncSettingsUI() {
    if (elAutoSaveChk) elAutoSaveChk.checked = !!save.settings.autoSave;
    if (elManualSaveChk) elManualSaveChk.checked = !!save.settings.manualSave;
    if (elSaveNowBtn) { elSaveNowBtn.disabled = !save.settings.manualSave; elSaveNowBtn.style.opacity = save.settings.manualSave ? 1 : 0.45; }
  }
  // 图标位：把 emoji 包进固定宽度的槽再跟文字
  // 依据：同为 17px 字号，各 emoji 墨迹宽实测 9–24px（🗡 9 / 🗺 24，差 2.67 倍）。
  // 不固定宽度时，同一列里每一行的名字左边缘会差出一个字符，整列看起来是斜的。
  function ico(x) { return '<i class="ico">' + (x || '·') + '</i>'; }
  function notify(text) { banner(text); }
  function banner(text) {
    if (!elBanner) return;
    // 落点按「HUD 在不在」决定，而不是枚举状态名（规格 §2.11）：
    // 152 这个高度本来就是为了让开顶栏与 boss 气血；HUD 不在时它纯属浪费，
    // 还会砸在面板上部 —— 坊市里正好压住页签，两秒多里看不见自己在点哪。
    // 判断必须看真实可见性：#hud 的隐藏写在 CSS 里，内联 style.display 是空串，
    // 拿 '' !== 'none' 去比会恒为真，等于永远走战斗态（已实测踩过）。
    const hudOn = !!(elHud && elHud.getClientRects().length);
    elBanner.classList.toggle('at-combat', hudOn);
    elBanner.textContent = text; elBanner.style.display = 'block';
    clearTimeout(banner._t);
    banner._t = setTimeout(() => {
      elBanner.style.display = 'none';
    }, 2200);
    return true;
  }
  // 拾取提示：只报道具名（Jerry：提示道具名即可，别糊屏）——同名合并、最多三条
  const TOAST_KEEP = 3;
  const toastRows = [];
  function toastRender() {
    if (!elItemToast) return;
    const rows = toastRows.slice(-TOAST_KEEP);
    const more = toastRows.length - rows.length;
    let html = '';
    if (more > 0) html += '<div class="itoast more">另 ' + more + ' 种已入袋</div>';
    for (const r of rows) {
      const rar = RARITY[r.item.rarity] || RARITY[0];
      html += '<div class="itoast" style="border-color:' + rar.color + '">' +
        '<b style="color:' + rar.color + '">' + r.item.name + (r.n > 1 ? '<i>×' + r.n + '</i>' : '') + '</b>' +
        '</div>';
    }
    elItemToast.innerHTML = rarize(html);
  }
  function toastTick() {
    const now = Date.now();
    let changed = false;
    for (let i = toastRows.length - 1; i >= 0; i--) {
      if (now - toastRows[i].at > 1700) { toastRows.splice(i, 1); changed = true; }
    }
    if (changed) toastRender();
    toastTick._t = toastRows.length ? setTimeout(toastTick, 500) : 0;
  }
  function itemToast(item) {
    if (!elItemToast || !item) return;
    const key = item.id;
    const hit = toastRows.find(r => r.key === key);
    if (hit) { hit.n++; hit.at = Date.now(); }
    else toastRows.push({ key: key, item: item, n: 1, at: Date.now() });
    while (toastRows.length > 8) toastRows.shift();
    toastRender();
    if (!toastTick._t) toastTick._t = setTimeout(toastTick, 500);
  }
  // 主线编号：一二三……十八（篇章变长以后写死七个不够用了）
  const CN_DIGIT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  function cnNum(n) {
    if (n <= 0) return String(n);
    if (n < 10) return CN_DIGIT[n];
    if (n === 10) return '十';
    if (n < 20) return '十' + CN_DIGIT[n - 10];
    if (n < 100) {
      const a = Math.floor(n / 10), b = n % 10;
      return CN_DIGIT[a] + '十' + (b ? CN_DIGIT[b] : '');
    }
    return String(n);
  }
  function openWorldMap() {
    if (G.player) { syncCultivate(); writeSave(); }
    G.state = 'map';
    hideAllOverlays();
    renderWorldMap();
    if (elWorldmap) elWorldmap.style.display = 'flex';
    refreshTitle();
  }

  // ---------- 混沌万灵榜（图鉴 / 收藏系统） ----------
  // 榜上诸物 = 全部 仙品 / 玄天之宝（rarity===5 && unique）。按 req 排「榜序」，
  // 已入储物袋者标「已收录」，未见者存位以待。数据直接取自 window.ALL_ITEMS，
  // 灵界/仙界两线宝物自动同榜，新增宝物无需再改这里。
  function renderWanling() {
    if (!elWanlingList) return;
    const all = (window.ALL_ITEMS || []).filter(i => i && i.rarity === 5 && i.unique);
    all.sort((a, b) => (a.req || 9999) - (b.req || 9999) || (a.name || '').localeCompare(b.name || ''));
    const inv = (save && save.inventory) || {};
    const total = all.length;
    let collected = 0;
    const rows = all.map((it, idx) => {
      const got = !!inv[it.id];
      if (got) collected++;
      const reqTxt = it.req ? ('修为·' + realmName(it.req)) : '无门槛';
      const note = got ? (it.desc || '（无备注）') : '尚未入手，榜上留位以待。';
      return '<div class="wl-row' + (got ? ' got' : '') + '">' +
        '<div class="wl-rank">' + (idx + 1) + '</div>' +
        '<div class="wl-icon">' + (it.icon || '◆') + '</div>' +
        '<div class="wl-main"><div class="wl-name">' + it.name +
          (got ? '' : '<span class="wl-lock">· 未见</span>') + '</div>' +
          '<div class="wl-note">' + note + '</div></div>' +
        '<div class="wl-meta"><span class="wl-req">' + reqTxt + '</span>' +
          '<span class="wl-status">' + (got ? '已收录' : '待收录') + '</span></div>' +
        '</div>';
    }).join('');
    elWanlingList.innerHTML = total ? rows : '<div class="wl-empty">榜上暂无名录。</div>';
    if (elWlCollected) elWlCollected.textContent = '已收录 ' + collected + ' / ' + total;
    if (elWlRealm) elWlRealm.textContent = realmName(Math.max(save.cultivate.level || 1, save.best.level || 1));
  }
  function openWanling() {
    G.state = 'wanling';
    hideAllOverlays();
    renderWanling();
    if (elWanling) elWanling.style.display = 'flex';
    if (Sfx && Sfx.buff) Sfx.buff();
  }
  // 篇章印记（P0-5）：每张地图卡按所属 arc 盖一枚单字闲章，一眼分辨属于哪一卷。
  // 单色（金皮走 accent、墨皮走朱砂），不引入彩色；14 个 arc 各一字，互不重复。
  const ARC_SEAL = {
    A: '玄', B: '越', C: '魔', D: '星', E: '丹', F: '云', G: '昆', H: '神',
    I: '灵', J: '族', K: '劫', L: '乘', M: '仙', X: '缘'
  };
  function arcSealHtml(m) {
    const a = m.arc || 'X';
    const g = ARC_SEAL[a];
    if (!g) return '';
    const meta = (window.MAP_ARCS || []).find(x => x.id === a);
    return '<span class="mc-seal" title="篇章 · ' + (meta ? meta.name : a) + '">' + g + '</span>';
  }
  function mapCardHtml(m, numTxt) {
    const unlocked = save.unlocked.indexOf(m.id) >= 0;
    const done = save.cleared.indexOf(m.id) >= 0;
    const isCave = !!(m.cave && save.caves.indexOf(m.cave) >= 0);
    const cls = ['mapcard'];
    if (!unlocked) cls.push('locked');
    if (done) cls.push('done');
    if (isCave) cls.push('home');
    if (m.side) cls.push('side');
    if (m.id === save.mapId) cls.push('current');
    let state = unlocked ? (done ? '已了' : '可入') : '未至';
    if (isCave) state = '可静修 · 可炼制';
    else if (m.id === save.mapId) state = '当前所在';
    // 行脚折：默认只露两行（名/地点/状态），点「详」章才展开全文 ——
    // 一屏能看七八处地名，才有「从青牛山一路走到五龙海」的大地图感。
    const open = !!(G.wmOpen && G.wmOpen[m.id]);
    cls.push(open ? 'open' : 'fold');
    const tagCls = isCave ? 'home' : m.side ? 'side' : m.type === 'story' ? 'story' : m.type === 'market' ? 'market' : m.type === 'boss' ? 'bossfight' : 'fight';
    const tagTxt = isCave ? '洞府' : m.tag;
    const caveDef = isCave ? CAVES[m.cave] : null;
    const mainDesc = caveDef ? caveDef.desc : m.desc;

    let extra = '';
    if (m.type === 'combat' || m.type === 'boss') {
      extra += '<div class="mc-meta">起始 ' + realmName(m.startLevel || 1) + '　·　' + (m.enemies || []).map(t => (ENEMY_TYPES[t] ? ENEMY_TYPES[t].name : t)).join(' · ') + '</div>';
      const dc = save.diffClear[m.id] || {};
      extra += '<div class="mc-diffs">' + DIFFICULTIES.map(d =>
        '<span class="dchip' + (dc[d.id] ? ' on' : '') + '" style="--dc:' + d.color + '">' + d.name + (dc[d.id] ? ' ✓' : '') + '</span>'
      ).join('') + '</div>';
    } else if (isCave) {
      extra += '<div class="mc-cave">可 ' + caveDef.crafts.map(k => RECIPE_KINDS[k].name).join(' · ') + ' · 静修（至' + realmName(caveDef.capLevel) + '）</div>';
    } else if (m.type === 'market') {
      extra += '<div class="mc-meta">以灵石买丹药 / 符箓 / 法器，也可折价卖出储物袋杂物</div>';
    } else {
      extra += '<div class="mc-meta">纯剧情，无战斗　·　起始 ' + realmName(m.startLevel || 1) + '</div>';
    }
    const bossLine = m.boss && !isCave ? '<div class="mc-boss">首领 · ' + m.boss.name + '</div>' : '';
    let go = '<span class="mc-go">入 →</span>';
    if (isCave) go = '<span class="mc-go home">入洞 →</span>';
    return '<div class="' + cls.join(' ') + '" data-map="' + m.id + '">' +
      '<div class="mc-top"><b class="mc-num">' + numTxt + '</b>' +
      arcSealHtml(m) +
      '<span class="mc-name">' + m.name + '</span>' +
      '<span class="mc-tag ' + tagCls + '">' + tagTxt + '</span>' +
      '<span class="mc-info" data-info="' + m.id + '">' + (open ? '收' : '详') + '</span></div>' +
      '<div class="mc-row2"><span class="mc-pos">' + m.pos + (caveDef ? '　·　' + caveDef.name : '') + '</span>' +
      '<span class="mc-mini ' + (unlocked ? 'on' : 'off') + '">' + state + '</span></div>' +
      '<div class="mc-body"><div class="mc-desc">' + mainDesc + '</div>' +
      extra + bossLine +
      '<div class="mc-foot"><span class="mc-state ' + (unlocked ? 'on' : 'off') + '">' + state + '</span>' +
      (unlocked ? go : '<span class="mc-lock">前图未了</span>') + '</div></div>' +
      '</div>';
  }
  // ================= 大境界分组：功法按境界收纳 =================
  window.REALM_TIERS = [
    { id: 'lianqi',   name: '炼气', min: 1,   max: 35 },
    { id: 'zhuji',    name: '筑基', min: 36,  max: 55 },
    { id: 'jiedan',   name: '结丹', min: 56,  max: 81 },
    { id: 'yuanying', name: '元婴', min: 82,  max: 111 },
    { id: 'huashen',  name: '化神', min: 112, max: 99999 }
  ];
  function realmTierOf(lv) {
    for (const t of REALM_TIERS) if (lv >= t.min && lv <= t.max) return t;
    return REALM_TIERS[REALM_TIERS.length - 1];
  }
  function skillTierOf(s) { return realmTierOf(s.minLv || 1); }

  // 支线图由哪张主线图的「际遇」引出：side.unlockBy → 际遇 → 际遇所在图
  function sideTriggerOf(sideMap) {
    // 显式挂靠优先：一张支线「在地理上属于哪」和「际遇在哪触发」是两回事。
    // 例：下山岔道在黄枫谷山门外，就该挂在山门那张卡下；
    // 但陆师兄这个际遇是在百药园遇上的（山门通关后成了洞府，进去就是洞府面板，际遇根本刷不出来）。
    if (sideMap && sideMap.sideOf) return sideMap.sideOf;
    const eid = sideMap && (sideMap.unlockBy || sideMap.unlock);
    if (!eid) return null;
    const enc = (window.ENCOUNTERS || []).find(x => x.id === eid);
    if (enc && enc.map) return enc.map;
    return MAPS.some(x => !x.side && x.id === eid) ? eid : null;
  }
  // 主线卡 + 挂在它后面的支线牌：默认收起，点主线展开，主线支线一起挑。
  // 支线也可以再挂支线（如城斗场挂在虞阳城那张支线卡下），展开层层嵌套。
  function deckHtml(m, numTxt, sideList, sidesBySide) {
    if (!sideList || !sideList.length) return mapCardHtml(m, numTxt);
    const open = !!(G.wmDeck && G.wmDeck[m.id]);
    return '<div class="mapdeck' + (open ? ' open' : '') + '" data-deck="' + m.id + '">' +
      mapCardHtml(m, numTxt) +
      '<div class="deck-toggle" data-decktog="' + m.id + '">' +
      '<span class="caret">' + (open ? '▾' : '▸') + '</span>' +
      '<span>' + (open ? '收起' : '展开') + '　其下 ' + sideList.length + ' 段因缘</span>' +
      '<span class="deck-peek">' + sideList.map(() => '<i></i>').join('') + '</span>' +
      '</div>' +
      '<div class="deck-side">' + sideList.map((s, i) => sideDeckHtml(s, '缘' + (i + 1), sidesBySide)).join('') + '</div>' +
      '</div>';
  }
  // 支线卡本身也可能有下一层支线（sideOf 指向支线），有就包一层可展开的牌堆
  function sideDeckHtml(s, label, sidesBySide) {
    const kids = (sidesBySide && sidesBySide[s.id]) || [];
    if (!kids.length) return mapCardHtml(s, label);
    const open = !!(G.wmDeck && G.wmDeck[s.id]);
    return '<div class="mapdeck mapdeck-nest' + (open ? ' open' : '') + '" data-deck="' + s.id + '">' +
      mapCardHtml(s, label) +
      '<div class="deck-toggle" data-decktog="' + s.id + '">' +
      '<span class="caret">' + (open ? '▾' : '▸') + '</span>' +
      '<span>' + (open ? '收起' : '展开') + '　其下 ' + kids.length + ' 段因缘</span>' +
      '<span class="deck-peek">' + kids.map(() => '<i></i>').join('') + '</span>' +
      '</div>' +
      '<div class="deck-side">' + kids.map((k, i) => mapCardHtml(k, '缘' + (i + 1))).join('') + '</div>' +
      '</div>';
  }

  function renderWorldMap() {
    if (!elWmList) return;
    if (elWmStones) elWmStones.textContent = '灵石 ' + (save.stones || 0);
    if (elWmRealm) elWmRealm.textContent = realmName(Math.max(save.cultivate.level || 1, save.best.level || 1));
    if (elWmBag) elWmBag.textContent = '储物袋 ' + (save.totalItems || 0) + ' 件';
    const mains = MAPS.filter(m => !m.side);
    const sides = MAPS.filter(m => m.side && save.unlocked.indexOf(m.id) >= 0).sort((a, b) => (a.sorder || 0) - (b.sorder || 0));
    // 按篇章分组：越往后越靠下，一眼看得出走到哪一步了
    const arcs = window.MAP_ARCS || [];
    const groups = [];
    for (const m of mains) {
      const aid = m.arc || '_';
      let g = groups.find(x => x.id === aid);
      if (!g) { g = { id: aid, maps: [] }; groups.push(g); }
      g.maps.push(m);
    }
    const arcIdx = id => { const i = arcs.findIndex(a => a.id === id); return i < 0 ? 99 : i; };
    groups.sort((x, y) => arcIdx(x.id) - arcIdx(y.id));

    // 支线不再挤在最后：按「引出它的那张主线卡」归堆，像叠牌一样挂在主线卡后。
    // 支线挂支线（sideOf 指向另一张已解锁支线）则收进宿主支线的展开层。
    const sidesByMain = {}, sidesBySide = {}, orphans = [];
    for (const s of sides) {
      const host = sideTriggerOf(s);
      if (host && mains.some(x => x.id === host)) (sidesByMain[host] = sidesByMain[host] || []).push(s);
      else if (host && sides.some(x => x.id === host)) (sidesBySide[host] = sidesBySide[host] || []).push(s);
      else orphans.push(s);
    }
    let rows = '';
    for (const g of groups) {
      const meta = arcs.find(a => a.id === g.id);
      const doneN = g.maps.filter(m => save.cleared.indexOf(m.id) >= 0).length;
      rows += '<div class="wm-sec"><b>❖ ' + (meta ? meta.name : '其余行迹') + '</b><span>' +
        (meta ? meta.note + '　' : '') + doneN + ' / ' + g.maps.length + '</span></div>';
      // 行程线：一卷一销金线，节点就是这一路的地名
      rows += '<div class="wm-route">' + g.maps.map(m => deckHtml(m, cnNum(mains.indexOf(m) + 1), sidesByMain[m.id] || [], sidesBySide)).join('') + '</div>';
    }
    if (orphans.length) {
      rows += '<div class="wm-sec"><b>❖ 支线 · 因缘</b><span>遇人遇事而开　' + orphans.length + ' / ' + MAPS.filter(m => m.side).length + '</span></div>';
      rows += '<div class="wm-route">' + orphans.map((m, i) => mapCardHtml(m, '支' + (i + 1))).join('') + '</div>';
    } else if (!sides.length) {
      rows += '<div class="wm-sec empty">行迹之间，或遇旧人旧事。走近了，自会开口。</div>';
    }
    elWmList.innerHTML = rarize(rows);
  }

  // ---------- 难度选择 ----------
  function openDiffPick(mapId) {
    const m = MAPS.find(x => x.id === mapId); if (!m) return;
    G.diffPick = mapId; G.state = 'diff';
    hideAllOverlays();
    renderDiffPick();
    if (elDifficulty) elDifficulty.style.display = 'flex';
  }
  function renderDiffPick() {
    if (!elDiffList) return;
    const m = MAPS.find(x => x.id === G.diffPick); if (!m) return;
    if (elDiffMapName) elDiffMapName.textContent = m.name;
    if (elDiffMapSub) elDiffMapSub.textContent = m.pos + '　·　' + (m.desc || '');
    const dc = save.diffClear[m.id] || {};
    elDiffList.innerHTML = DIFFICULTIES.map(d => {
      const cleared = !!dc[d.id];
      return '<div class="diffcard" data-diff="' + d.id + '" style="--dc:' + d.color + '">' +
        '<div class="dc-top"><b>' + d.name + '</b><span class="dc-tag">' + d.tag + '</span>' +
        (cleared ? '<span class="dc-done">已破</span>' : '') + '</div>' +
        '<div class="dc-desc">' + d.desc + '</div>' +
        '<div class="dc-mul">' +
        '<span>敌血 ×' + d.hp.toFixed(2) + '</span>' +
        '<span>敌伤 ×' + d.dmg.toFixed(2) + '</span>' +
        '<span>数量 ×' + d.cnt.toFixed(2) + '</span>' +
        '<span>掉落 ×' + d.drop.toFixed(1) + '</span>' +
        '<span>灵石 ×' + d.stone.toFixed(1) + '</span>' +
        '<span>修为 ×' + d.xp.toFixed(1) + '</span>' +
        '</div>' +
        '<div class="dc-foot">' +
        (cleared ? '<span class="dc-sweep" data-sweep="' + d.id + '" title="连走 ' + SWEEP_N +
          ' 趟，费用按身上总灵石的 9% 抽，保底 ' + SWEEP_FLOOR + '">扫荡 ×' + SWEEP_N +
          '<b>' + sweepCost().toLocaleString('en-US') + ' 灵石</b></span>' : '') +
        '<span class="dc-go">入山 →</span></div>' +
        '</div>';
    }).join('');
  }

  // ---------- 扫荡：已破之境，一键连走 9 趟 ----------
  // 破境丹的成算压到了原著口径（筑基丹一成、九曲灵参丹不足一成），一炉一炉去刷，
  // 玩家只感到耗，不感到「修仙」。所以给已破之境开个口子：花一笔灵石，九趟收成一次算清。
  // 费用按身上总灵石的 9% 抽，但保底 9999 —— 家底薄的时候也别想白拿。
  const SWEEP_N = 9;
  const SWEEP_RATE = 0.09;
  const SWEEP_FLOOR = 9999;
  function sweepCost() {
    return Math.max(SWEEP_FLOOR, Math.round((save.stones || 0) * SWEEP_RATE));
  }
  let sweepLockT = 0;                        // 防连点：一秒多内只认一次
  function sweepMap(mapId, diffId) {
    const now = Date.now();
    if (now - sweepLockT < 1200) return null;
    const m = MAPS.find(x => x.id === mapId);
    if (!m) return null;
    const d = diffById(diffId);
    const dc = save.diffClear[m.id] || {};
    if (!dc[d.id]) { notify('此境未破 · 先亲自走一趟'); Sfx.warn(); return null; }
    const cost = sweepCost();
    if ((save.stones || 0) < cost) { notify('灵石不足 · 扫荡须 ' + cost + ' 灵石'); Sfx.warn(); return null; }
    sweepLockT = now;
    const stonesBefore = save.stones || 0;
    save.stones -= cost;

    const di = Math.max(0, DIFFICULTIES.indexOf(d));
    const nr = m.reward || {};
    // 杂材池：世上只此一件的东西不进扫荡（与野外掉落同一条规矩）
    const pool = (m.mats || []).filter(id => { const it = Items.get(id); return it && !it.unique; });
    const got = {};
    let stoneGot = 0, bMin = 99, bMax = 0;
    for (let k = 0; k < SWEEP_N; k++) {
      stoneGot += Math.round((nr.stones || 0) * (d.stone || 1));
      // 破境药材：每趟各掷一次手气（1.0~3.0 倍 × 难度），保底仍是不低于基础配额
      const base = buildAlchPlan(m.id, d, 0);
      if (base) {
        const b = alchBonus(d);
        bMin = Math.min(bMin, b); bMax = Math.max(bMax, b);
        for (const c of base) got[c[0]] = (got[c[0]] || 0) + Math.max(1, Math.round(c[1] * b));
      }
      // 杂材：小怪、精英、首领一路的零碎
      if (pool.length) {
        const n = Math.round((10 + 6 * di) * (0.8 + Math.random() * 0.8) * (d.drop || 1));
        for (let i = 0; i < n; i++) {
          const id = pool[Math.floor(Math.random() * pool.length)];
          got[id] = (got[id] || 0) + 1;      // 别用 ++ ：首次出现时 undefined++ 会变 NaN
        }
      }
    }
    save.stones += stoneGot;
    let matN = 0;
    for (const id in got) {
      save.inventory[id] = (save.inventory[id] || 0) + got[id];
      save.totalItems = (save.totalItems || 0) + got[id];
      matN += got[id];
    }
    save.wins = (save.wins || 0) + SWEEP_N;
    writeSave();
    renderSweepResult(m, d, cost, stoneGot, got, matN, bMin === 99 ? 0 : bMin, bMax, stonesBefore);
    return { cost: cost, stone: stoneGot, mats: got, matN: matN, stonesBefore: stonesBefore, stonesAfter: save.stones,
             bMin: bMin === 99 ? 0 : bMin, bMax: bMax };
  }
  // 结果面板：扣了多少、拿回多少，一次摆清
  function renderSweepResult(m, d, cost, stoneGot, got, matN, bMin, bMax, stonesBefore) {
    if (!elSweep) return;
    G.state = 'sweep';
    if (elSweepTitle) elSweepTitle.textContent = '扫荡 · ' + m.name;
    if (elSweepDesc) {
      elSweepDesc.innerHTML = d.name + ' · 连走 ' + SWEEP_N + ' 趟' +
        (bMax ? '　<span class="sw-bonus">药料手气 ×' + bMin.toFixed(1) + '~' + bMax.toFixed(1) + '</span>' : '');
    }
    const rows = Object.keys(got).map(id => {
      const it = Items.get(id); if (!it) return '';
      const r = RARITY[it.rarity] || RARITY[0];
      return '<div class="lootrow"><b style="color:' + r.color + '">' + it.name + '</b><span>×' + got[id] + '</span></div>';
    }).join('');
    if (elSweepLoot) {
      elSweepLoot.innerHTML =
        (rows || '<div class="lootrow muted">此行未得药材</div>') +
        '<div class="lootrow reward"><b>灵石入袋</b><span>+' + stoneGot + '</span></div>' +
        '<div class="lootrow cost"><b>扫荡开销</b><span>−' + cost + '</span></div>' +
        '<div class="loottotal">药材 ' + matN + ' 味　·　灵石 ' +
        (stonesBefore || 0).toLocaleString('en-US') + ' → ' + (save.stones || 0).toLocaleString('en-US') +
        '　·　储物袋累计 ' + (save.totalItems || 0) + ' 件</div>';
    }
    if (elSweep) elSweep.style.display = 'flex';
    if (Sfx && Sfx.buff) Sfx.buff();
  }

  // ---------- 洞府（安全屋） ----------
  function caveTabs(c) {
    const t = [{ id: 'stat', name: '属性' }, { id: 'equip', name: '装备' }, { id: 'skill', name: '功法' },
               { id: 'pet', name: '灵宠' }, { id: 'mate', name: '同伴' }, { id: 'break', name: '进阶' },
               { id: 'quick', name: '快捷' }];
    for (const k of c.crafts) t.push({ id: k, name: RECIPE_KINDS[k].name });
    if (c.gardens && c.gardens.length) t.push({ id: 'garden', name: '药圃' });
    t.push({ id: 'rest', name: '静修' });
    return t;
  }
  function openCave(caveId) {
    const c = CAVES[caveId]; if (!c) return;
    G.caveId = caveId; G.breakCaveId = caveId; G.state = 'cave';
    const tabs = caveTabs(c);
    if (!tabs.some(t => t.id === G.caveTab)) G.caveTab = 'stat';
    hideAllOverlays();
    renderCave();
    if (elCave) elCave.style.display = 'flex';
    Sfx.buff();
  }
  function realmSum(level) {
    const o = { hp: 0, dmg: 0, atk: 0, spd: 0 };
    for (const r of REALM_LAYERS) { if (level >= r.lv) { o.hp += r.hp; o.dmg += r.dmg; o.atk += r.atk; o.spd += r.spd; } else break; }
    return o;
  }
  function renderCave() {
    const c = CAVES[G.caveId]; if (!c || !elCaveBody) return;
    hideItemTip();   // 换页签/重画面板，旧的「去哪取」卡片一并收起
    // 进洞府先看一眼有没有该移栽的灵药（原著：得药先留一株作种入园，此后定期可采）
    autoTransplant();
    const lv = Math.max(save.cultivate.level || 1, save.best.level || 1);
    if (elCaveName) elCaveName.textContent = c.name;
    if (elCaveDesc) elCaveDesc.textContent = c.quote;
    if (elCavePos) elCavePos.textContent = c.pos + '　·　' + c.desc;
    if (elCaveStones) elCaveStones.textContent = '灵石 ' + Math.round(save.stones || 0);
    if (elCaveRealm) elCaveRealm.textContent = realmName(lv);
    if (elCaveBag) elCaveBag.textContent = '储物袋 ' + (save.totalItems || 0) + ' 件';
    // tabs
    if (elCaveTabs) {
      elCaveTabs.innerHTML = caveTabs(c).map(t =>
        '<button class="tab' + (G.caveTab === t.id ? ' active' : '') + '" data-ctab="' + t.id + '">' + t.name + '</button>'
      ).join('');
    }
    const tab = G.caveTab;
    let html = '';
    if (tab === 'stat') html = renderCaveStat(lv);
    else if (tab === 'equip') html = renderCaveEquip(lv);
    else if (tab === 'skill') html = renderCaveSkill(lv);
    else if (tab === 'quick') html = renderCaveQuick(lv);
    else if (tab === 'pet') html = renderCavePet(lv);
    else if (tab === 'mate') html = renderCaveMate(lv);
    else if (tab === 'break') html = renderCaveBreak(lv);
    else if (tab === 'garden') html = renderCaveGarden(c, lv);
    else if (tab === 'rest') html = renderCaveRest(c, lv);
    else html = renderCaveCraft(c, tab, lv);
    elCaveBody.innerHTML = rarize(html);
  }

  // ==================== 洞府分组折叠（手风琴） ====================
  // 列表一长，「找那一件」就变成「往下滚」。按类收起来，一次只开一组。
  // 大境界：境界名有「炼气期一层」「筑基初期」「大乘期」三种写法，不能靠切后缀，
  // 用关键词表取第一个命中项。
  const BIG_REALM_KEYS = ['炼气', '筑基', '结丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫', '真仙', '金仙', '太乙', '大罗', '道祖'];
  function bigRealmOf(lv) {
    const nm = realmName(Math.max(1, lv | 0));
    for (const k of BIG_REALM_KEYS) if (nm.indexOf(k) >= 0) return k;
    return '其他';
  }
  function bigRealmIdx(name) { const i = BIG_REALM_KEYS.indexOf(name); return i < 0 ? BIG_REALM_KEYS.length : i; }
  // 组头怎么写：「炼气」要念成「炼气期」，「真仙」「大罗」本身已经是一个完整的说法
  const REALM_NO_QI = ['真仙', '金仙', '太乙', '大罗', '道祖', '其他'];
  function realmGroupName(k) { return REALM_NO_QI.indexOf(k) >= 0 ? k : k + '期'; }
  // 当前页签开着哪一组：没选过就默认「玩家当前所在的大境界」，找不到就第一组。
  // 这样点进功法/炼制，先看到的就是自己这一档，不用先翻。
  function foldOpenOf(tab, keys, prefer) {
    if (!G.caveFold) G.caveFold = {};
    let k = G.caveFold[tab];
    if (k === undefined) k = (prefer && keys.indexOf(prefer) >= 0) ? prefer : keys[0];
    if (k && keys.indexOf(k) < 0) k = (prefer && keys.indexOf(prefer) >= 0) ? prefer : keys[0];
    G.caveFold[tab] = k || '';
    return G.caveFold[tab];
  }
  function foldGroup(tab, key, title, count, bodyHtml, openKey) {
    const open = openKey === key;
    return '<div class="fold' + (open ? ' open' : '') + '">' +
      '<button class="fold-h" data-fold-tab="' + tab + '" data-fold-key="' + key + '">' +
      '<span class="fh-name">' + title + '</span>' +
      '<span class="fh-n">' + count + '</span>' +
      '<span class="fh-ar">▾</span></button>' +
      '<div class="fold-b">' + bodyHtml + '</div></div>';
  }
  // 依大境界把条目分桶（桶按境界先后排，桶内由调用方排）
  function bucketByRealm(items, lvOf) {
    const m = {};
    for (const it of items) {
      const k = bigRealmOf(lvOf(it));
      (m[k] = m[k] || []).push(it);
    }
    return Object.keys(m).sort((a, b) => bigRealmIdx(a) - bigRealmIdx(b)).map(k => ({ realm: k, list: m[k] }));
  }

  // 把 0~100 的百分数念成修仙口吻的「成」：一成=10%，五成多=五成出头，不足一成=不到一成
  const CHENG_CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  function pctCheng(p) {
    p = Math.round(p || 0);
    if (p <= 0) return '无';
    if (p >= 100) return '十成';
    const whole = Math.floor(p / 10), rem = p - whole * 10;
    if (whole === 0) return '不足一成';
    return rem === 0 ? (CHENG_CN[whole] + '成') : (CHENG_CN[whole] + '成多');
  }
  // 增量：+10% → 加一成；+8% → 加不足一成
  function pctChengDelta(d) {
    d = Math.round(d || 0);
    if (d <= 0) return '';
    if (d >= 100) return '加十成';
    const whole = Math.floor(d / 10), rem = d - whole * 10;
    if (whole === 0) return '加不足一成';
    return rem === 0 ? ('加' + CHENG_CN[whole] + '成') : ('加' + CHENG_CN[whole] + '成多');
  }
  function pct(v) { return (v >= 0 ? '+' : '') + Math.round(v * 100) + '%'; }
  function renderCaveStat(lv) {
    const g = gearBonus();
    const rs = realmSum(lv);
    const maxhp = 100 + rb('maxhp') + (save.bonuses.maxhp || 0) + rs.hp + (g.maxhp || 0);
    const dmg = (1 + rb('dmg') + (save.bonuses.dmg || 0) + (g.dmg || 0)) * (1 + rs.dmg);
    const atk = 1 / (1 + rb('atkSpd') + (save.bonuses.atkSpd || 0) + (g.atkSpd || 0) + rs.atk);
    const spd = 1 + rb('spd') + (save.bonuses.spd || 0) + (g.spd || 0) + rs.spd;
    const crit = 0.05 + rb('crit') + (save.bonuses.crit || 0) + (g.crit || 0);
    const armor = Math.min(0.62, rb('armor') + (save.bonuses.armor || 0) + (g.armor || 0));
    const rows = [
      ['境界', realmName(lv)],
      ['生命上限', Math.round(maxhp)],
      ['伤害倍率', '×' + dmg.toFixed(2)],
      ['出手间隔', '×' + atk.toFixed(2)],
      ['移动速度', '×' + spd.toFixed(2)],
      ['重击', Math.round(crit * 100) + '%'],
      ['减伤', Math.round(armor * 100) + '%'],
      ['每秒回血', ((0.7 * ((save.cultivate.skills || {}).regen || 0)) + rb('regen') + (save.bonuses.regen || 0) + (g.regen || 0)).toFixed(1)],
      // 底子由驱物术的神念决定（练得越深越广），装备与丹药的加成在其上乘
      ['拾取范围', Math.round(Math.max(46, swordPickupR()) * (1 + rb('pickup') + (save.bonuses.pickup || 0) + (g.pickup || 0))) + 'px'],
      ['修为加成', pct(rb('xpMul') + (save.bonuses.xpMul || 0) + (g.xpMul || 0))],
      ['已佩法器', equippedCount() + ' / 4']
    ];
    const grid = rows.map(r => '<div class="statcell"><i>' + r[0] + '</i><b>' + r[1] + '</b></div>').join('');
    // 功法
    const sk = save.cultivate.skills || {};
    const skRow = SKILLS.map(s => {
      const n = sk[s.id] || 0;
      return '<div class="skipill' + (n ? ' on' : '') + '"><span>' + s.icon + '</span><b>' + s.name + '</b><i>' + (n ? (n + ' / ' + s.max + ' 重') : '未习') + '</i></div>';
    }).join('');
    // 进度
    const mainMaps = MAPS.filter(x => !x.side), sideMaps = MAPS.filter(x => x.side);
    const clearedN = mainMaps.filter(x => save.cleared.indexOf(x.id) >= 0).length;
    const sideOpen = sideMaps.filter(x => save.unlocked.indexOf(x.id) >= 0).length;
    const sideDone = sideMaps.filter(x => save.cleared.indexOf(x.id) >= 0).length;
    const caveN = save.caves.length;
    const diffN = Object.keys(save.diffClear).reduce((a, k) => a + Object.keys(save.diffClear[k]).length, 0);
    return '<div class="cave-sec"><div class="cs-title">修为</div><div class="statgrid">' + grid + '</div></div>' +
      '<div class="cave-sec"><div class="cs-title">功法</div><div class="skipills">' + skRow + '</div></div>' +
      '<div class="cave-sec"><div class="cs-title">行迹</div><div class="statgrid">' +
      '<div class="statcell"><i>已了地图</i><b>' + clearedN + ' / ' + mainMaps.length + '</b></div>' +
      '<div class="statcell"><i>支线</i><b>' + sideDone + ' / ' + sideOpen + ' 已开 ' + sideMaps.length + '</b></div>' +
      '<div class="statcell"><i>洞府</i><b>' + caveN + '</b></div>' +
      '<div class="statcell"><i>难度首破</i><b>' + diffN + '</b></div>' +
      '<div class="statcell"><i>累计通关</i><b>' + (save.wins || 0) + '</b></div>' +
      '</div></div>';
  }

  function renderCaveEquip(lv) {
    const slots = SLOTS.map(s => {
      const id = save.equip[s.id];
      const it = id ? Items.get(id) : null;
      const r = it ? RARITY[it.rarity] : null;
      return '<div class="eqslot' + (it ? ' filled' : '') + '" data-slot="' + s.id + '">' +
        '<span class="es-ico">' + s.icon + '</span>' +
        '<div class="es-body"><b>' + s.name + '</b>' +
        '<i style="color:' + (it ? r.color : 'var(--text-4)') + '">' + (it ? it.name : '未佩') + '</i></div>' +
        (it ? '<span class="es-off">卸</span>' : '') +
        '</div>';
    }).join('');
    // 背包里可佩的
    const ids = Object.keys(save.inventory).filter(id => (save.inventory[id] || 0) > 0 && Items.isGear(id));
    let list = '';
    if (!ids.length) list = '<div class="shopempty">储物袋里没有可佩之物。山里的妖兽与魔修身上倒常见。</div>';
    else {
      // 按槽位收进折叠组：兵器 / 护甲 / 佩饰 / 符宝。
      // 组内仍按珍稀度降序 —— 同类的物件摆在一起，「这件比身上那把强多少」才比得出来。
      const bySlot = {};
      for (const id of ids) { const it = Items.get(id); (bySlot[it.slot] = bySlot[it.slot] || []).push(id); }
      const slotKeys = SLOTS.map(s => s.id).filter(k => bySlot[k]);
      const openSlot = foldOpenOf('equip', slotKeys);
      for (const k of slotKeys) {
        const sd = SLOTS.find(x => x.id === k) || { name: k, icon: '◆' };
        const rows = bySlot[k]
          .sort((a, b) => (Items.get(b).rarity - Items.get(a).rarity) || (Items.get(a).name < Items.get(b).name ? -1 : 1))
          .map(id => {
            const it = Items.get(id), r = RARITY[it.rarity], s = SLOTS.find(x => x.id === it.slot);
            const on = save.equip[it.slot] === id;
            const ok = lv >= reqLv(it.req || 1);
            return '<div class="gearrow' + (ok ? '' : ' locked') + (on ? ' equipped' : '') + '" data-equip="' + id + '">' +
              '<div class="gr-main"><b style="color:' + r.color + '">' + it.name + '</b>' +
              '<i>' + r.name + ' · ' + (s ? s.name : '') + '　' + it.desc + '</i></div>' +
              '<div class="gr-right">' +
              (ok ? (on ? '<span class="gr-on">已佩</span>' : '<span class="sr-btn buy">佩上</span>')
                : '<span class="gr-need">需' + realmName(it.req) + '</span>') +
              '<span class="sr-own">×' + save.inventory[id] + '</span>' +
              (sellableCount(id) > 0 && !it.unique ? '<button class="sr-btn ghost" data-decomp="' + id + '">拆</button>' : '') +
              '</div></div>';
          }).join('');
        list += foldGroup('equip', k, sd.icon + ' ' + sd.name, bySlot[k].length + ' 件', rows, openSlot);
      }
    }
    // 储物袋其他：装备之外的所有物（丹药 / 符箓 / 灵物 / 丹方 / 材料）
    const bookIds = new Set((window.RECIPES || []).filter(r => r.book).map(r => r.book));
    const recipesByBook = {};
    for (const r of (window.RECIPES || [])) if (r.book) (recipesByBook[r.book] = recipesByBook[r.book] || []).push(r);
    function catOf(it) {
      if (!it) return 'misc';
      if (it.slot) return 'gear';
      if (it.craftOnly === 'alchemy') return 'pill';
      if (it.buffs && !it.mat) return 'talisman';
      if (it.mat) return bookIds.has(it.id) ? 'book' : 'mat';
      if (it.effect) return 'elixir';
      return 'misc';
    }
    const groups = { pill: [], talisman: [], elixir: [], book: [], mat: [] };
    for (const id of Object.keys(save.inventory)) {
      const n = save.inventory[id] || 0; if (n <= 0) continue;
      const it = Items.get(id); if (!it) continue;
      const c = catOf(it);
      if (c === 'gear' || c === 'misc' || !groups[c]) continue;
      groups[c].push(id);
    }
    const groupMeta = [
      ['pill', '丹药', '服下即见效，限时增益'],
      ['talisman', '符箓', '催动即生效，限时增益'],
      ['elixir', '灵物', '灵石 / 灵液等，捏碎吞吐灵气'],
      ['book', '丹方', '未用的丹方 · 持方方可开炉炼此药'],
      ['mat', '材料', '炼丹 / 炼器 / 制符之料，也可折价卖出']
    ];
    let other = '';
    for (const [key, title, note] of groupMeta) {
      const ids = groups[key]; if (!ids.length) continue;
      // 「用」按钮按类别换字眼：丹药曰服、符箓曰催、灵物曰捏
      const useLabel = key === 'pill' ? '服' : key === 'talisman' ? '催' : '捏';
      ids.sort((a, b) => (Items.get(b).rarity - Items.get(a).rarity) || (a < b ? -1 : 1));
      let rows = '';
      for (const id of ids) {
        const it = Items.get(id), r = RARITY[it.rarity], n = save.inventory[id];
        const consumable = (key === 'pill' || key === 'talisman' || key === 'elixir')
          && !isGateNeed(id) && canUse(it);
        const d = (key === 'book' && recipesByBook[id])
          ? ('可炼：' + recipesByBook[id].map(x => x.name).join('、'))
          : (it.desc.length > 42 ? it.desc.slice(0, 42) + '…' : it.desc);
        rows += '<div class="bagrow" data-item="' + id + '">' +
          '<div class="gr-main"><b style="color:' + r.color + '">' + it.icon + ' ' + it.name + '</b>' +
          '<i>' + r.name + '　' + d + '</i></div>' +
          '<div class="gr-right">' +
          (consumable ? '<button class="sr-btn buy" data-use="' + id + '">' + useLabel + '</button>' : '') +
          '<span class="sr-own">×' + n + '</span></div></div>';
      }
      other += '<div class="baggrp"><div class="cs-sub">' + title + '</div>' +
        '<div class="cs-note">' + note + '</div>' +
        '<div class="baglist">' + rows + '</div></div>';
    }
    if (!other) other = '<div class="shopempty">储物袋其他空空如也。</div>';

    return '<div class="cave-sec"><div class="cs-title">身上法器</div><div class="equipgrid">' + slots + '</div>' +
      '<div class="cs-note">佩上即生效，可随时更换；境界不足者佩不动。</div></div>' +
      '<div class="cave-sec"><div class="cs-title">储物袋 · 可佩之物</div><div class="gearlist">' + list + '</div></div>' +
      '<div class="cave-sec"><div class="cs-title">储物袋 · 其他</div>' + other + '</div>';
  }

  function renderCaveCraft(c, kind, lv) {
    const kd = RECIPE_KINDS[kind];
    if (!kd) return '<div class="cave-sec empty"><div class="cs-empty">此地并无这般工坊。</div></div>';
    const list = Recipes.of(kind);
    let html = '<div class="cave-sec"><div class="cs-title">' + kd.icon + ' ' + kd.name + '</div>' +
      '<div class="cs-note">' + kd.tip + '　材料可在战斗中获得，也可在坊市买入。</div>' +
      '<div class="cs-note brk-hint">缺哪一味，点料名就写它去哪儿取。方子按境界收着，点开哪一档看哪一档。</div>';
    // 按境界收起来：一路列下来有十几二十条，翻到后面就找不着自己在哪一档了
    const buckets = bucketByRealm(list, r => r.req || 1);
    const openRealm = foldOpenOf('craft:' + kind, buckets.map(b => b.realm), bigRealmOf(lv));
    for (const bk of buckets) {
      let rows = '';
      for (const r of bk.list) {
        const outItem = Items.get(r.out);
        const rar = outItem ? RARITY[outItem.rarity] : RARITY[0];
        const okReq = lv >= reqLv(r.req || 1);
        const okBook = hasFormula(r);
        const okStone = (save.stones || 0) >= r.cost;
        let okMat = true;
        const mats = r.mats.map(m => {
          const have = save.inventory[m[0]] || 0;
          if (have < m[1]) okMat = false;
          const it = Items.get(m[0]);
          // 料名可点：缺的、够的都点得，点一下就知道去哪儿取
          return '<span class="mat clk' + (have >= m[1] ? ' ok' : '') + '" data-mat="' + m[0] + '">' +
            (it ? it.name : m[0]) + ' ' + Math.min(have, 99) + '/' + m[1] + '</span>';
        }).join('');
        const can = okReq && okBook && okStone && okMat;
        // 火候几成，先让人看见。炼坏了材料是不退的
        const effRate = craftRateOf(r);
        const ratePct = Math.round(effRate * 100);
        const profTip = (r.kind === 'alchemy' && alchemyCount() > 0) ? '（含熟手 ' + Math.round(alchemyProf() * 100) + '%）' : '';
        rows += '<div class="recrow' + (can ? ' can' : '') + '">' +
          '<div class="rr-main"><b style="color:' + rar.color + '">' + r.name + (r.outN > 1 ? ' ×' + r.outN : '') + '</b>' +
          '<span class="rr-rate">成算 ' + ratePct + '%' + profTip + (ratePct < 100 ? ' · 败则料尽' : '') + '</span>' +
          '<div class="rr-mats">' + mats + '<span class="mat stone' + (okStone ? ' ok' : '') + '">灵石 ' + r.cost + '</span></div>' +
          '<em>' + r.desc + '</em></div>' +
          '<div class="rr-right">' +
          (!okBook ? '<span class="gr-need">缺丹方</span>'
            : okReq ? '<button class="sr-btn buy" data-craft="' + r.id + '"' + (can ? '' : ' disabled') + '>炼制</button>'
            : '<span class="gr-need">需' + realmName(r.req) + '</span>') +
          '</div></div>';
      }
      html += foldGroup('craft:' + kind, bk.realm, realmGroupName(bk.realm), bk.list.length + ' 方', rows, openRealm);
    }
    html += '</div>';
    return html;
  }

  // 这门功法怎么用：近战 / 远程 / 领域 / 常驻，写在面板上省得猜
  function skillTypeLabel(s) {
    if (s.type === 'passive') return '常驻';
    if (s.type === 'ranged') return '远程';
    if (s.type === 'ranged_aoe') return '远程群攻';
    if (s.type === 'aura') return '近身领域';
    return '近战';
  }
  function renderCaveSkill(lv) {
    const c = cultObj();
    const cap = slotCapOf(lv);
    const eq = equippedOf();
    let html = '<div class="cave-sec"><div class="cs-title">功法</div>' +
      '<div class="cs-note">学过的不等于身上在用。身上同时运 <b>' + eq.length + ' / ' + cap + '</b> 门 —— 境界越高，运得越多。' +
      '境界一破，旧功法自动卸下只留一门主力；要不要戴回来，自己动手。</div>';
    let any = false;
    // 按所授境界收起来：炼气期一口气授五门，往上一路还有十几门，
    // 平铺下来找一门要滚半屏。组头就是目录，点哪档开哪档。
    const learned = SKILLS.filter(s => (c.skills[s.id] || 0) > 0);
    const buckets = bucketByRealm(learned, s => s.minLv || 1);
    const openSk = foldOpenOf('skill', buckets.map(b => b.realm), bigRealmOf(lv));
    for (const bk of buckets) {
      let rows = '';
      for (const s of bk.list) {
        any = true;
        const lv2 = c.skills[s.id] || 0;
        const on = eq.indexOf(s.id) >= 0;
        const top = window.skillCapById ? window.skillCapById(s.id, lv) : s.max;
        const okLv = lv >= (s.minLv || 1);
        rows += '<div class="recrow' + (on ? ' can' : '') + '">' +
          '<div class="rr-main"><b>' + ico(s.icon) + s.name + '　' + lv2 + ' 重' + (s.main ? '　· 主力' : '') + '　[' + skillTypeLabel(s) + ']' + '</b>' +
          '<em>' + s.desc + '　此境可至 ' + top + ' 重' + (okLv ? '' : '　· 境界不足') + '</em></div>' +
          '<div class="rr-right"><button class="sr-btn' + (on ? ' ghost' : ' buy') + '" data-skill="' + s.id + '">' +
          (on ? '卸下' : '运起') + '</button></div></div>';
      }
      html += foldGroup('skill', bk.realm, realmGroupName(bk.realm), bk.list.length + ' 门', rows, openSk);
    }
    // 未习法诀（藏经）：储物袋里的法诀，点「学习」才记入已习得；书留架上，日后被清可重学
    const manualItems = (window.ALL_ITEMS || []).filter(it => it.teach && (save.inventory[it.id] || 0) > 0);
    if (manualItems.length) {
      html += '<div class="cave-sec"><div class="cs-title">未习法诀（藏经）</div>' +
        '<div class="cs-note">袋里这些法诀还没研习。点「学习」即化开此册、永久习得这门功法，手册随之用掉；' +
        '习得后再不会因切图被清。储物袋里「化开」也是同一回事（掉落/奖励所得法诀不入袋，直接化开）。</div>';
      for (const it of manualItems) {
        const tid = it.teach;
        const d = window.skillById ? window.skillById(tid) : null;
        const learned = !!(c.skills[tid]);
        const okLv = d && lv >= (d.minLv || 1);
        html += '<div class="recrow">' +
          '<div class="rr-main"><b>' + ico(it.icon) + (d ? d.name : it.name) + (learned ? '　· 已习' : '') + '</b>' +
          '<em>' + (d ? d.desc : it.desc) + (okLv ? '' : '　· 境界不足，学了也运不起') + '</em></div>' +
          '<div class="rr-right">' + (learned
            ? '<button class="sr-btn ghost" data-discard="' + it.id + '">弃</button>'
            : '<button class="sr-btn buy" data-learn="' + it.id + '">学习</button>') + '</div></div>';
      }
      html += '</div>';
    }
    if (!any) html += '<div class="cs-empty">一门都还没学过。</div>';
    html += '</div>';
    return html;
  }
  function learnSkill(id) {
    const c = cultObj();
    const d = window.skillById ? window.skillById(id) : null;
    if (!d) return false;
    if (c.skills[id]) { notify('这门已学过'); return false; }
    c.skills[id] = 1;
    // 标记「手动研习」：过图剪枝豁免，永久在册（书留架上、日后被清也可重学）
    save.learnedManuals[id] = true;
    // 新学的进攻型功法：槽位还空着就先戴上，省一趟洞府（旧功法不会被带回来）
    if (d.type !== 'passive') {
      const eqNow = c.equipped || (c.equipped = []);
      if (eqNow.indexOf(id) < 0) {
        const lvNow = Math.max(c.level || 1, save.best.level || 1);
        if (eqNow.length < slotCapOf(lvNow)) eqNow.push(id);
      }
    }
    writeSave(); Sfx.buff();
    notify('习得 · ' + d.name);
    return true;
  }

  // 能装进快捷栏的消耗品：袋里有、且是即食即用的那类
  function quickItems() {
    // 能装进快捷栏的：丹药 / 符箓 / 灵石 —— 有即时功效或有「限时增益」的都算
    return ITEMS.filter(i => !i.slot && !i.mat && !i.unique && (i.effect || i.buffs) && (save.inventory[i.id] || 0) > 0);
  }
  function renderCaveQuick(lv) {
    const slots = save.quick || [null, null, null];
    let html = '<div class="cave-sec"><div class="cs-title">战斗快捷栏</div>' +
      '<div class="cs-note">战斗画面右边那三格。装灵宠或消耗道具，点一下就放，也能按键盘 1 / 2 / 3 —— 灵宠回气 ' + QUICK_CD.pet + ' 息，丹药符箓 ' + QUICK_CD.item + ' 息。</div>';
    for (let i = 0; i < 3; i++) {
      const slot = slots[i], lab = quickLabel(slot);
      html += '<div class="cave-sec"><div class="cs-title">第 ' + (i + 1) + ' 格　' + lab.icon + ' ' + lab.name +
        (slot && slot.kind === 'item' ? '（余 ' + (lab.count || 0) + '）' : '') + '</div><div class="qb-picks">';
      html += '<button class="sr-btn ghost" data-qset="' + i + '|none">空着</button>';
      for (const p of (window.PETS || [])) {
        if ((save.pets || []).indexOf(p.id) < 0) continue;
        const on = slot && slot.kind === 'pet' && slot.id === p.id;
        html += '<button class="sr-btn' + (on ? '' : ' ghost') + '" data-qset="' + i + '|pet|' + p.id + '">' +
          (p.icon || '🐾') + ' ' + p.name + '</button>';
      }
      for (const it of quickItems()) {
        const on = slot && slot.kind === 'item' && slot.id === it.id;
        html += '<button class="sr-btn' + (on ? '' : ' ghost') + '" data-qset="' + i + '|item|' + it.id + '">' +
          it.icon + ' ' + it.name + '（' + (save.inventory[it.id] || 0) + '）</button>';
      }
      html += '</div></div>';
    }
    return html;
  }

  function renderCavePet(lv) {
    normalizePets();
    const owned = save.pets || [];
    const cap = petCap(), bag = petBagName();
    let html = '<div class="cave-sec"><div class="cs-title">灵兽袋</div>' +
      '<div class="cs-note">' + (bag ? ('用的是「' + bag + '」，袋中自成禁制空间，养 ' + owned.length + ' / ' + cap + ' 只。')
                                     : ('还没有灵兽袋 —— 怀里只揣得下一只。')) + '</div>';
    // 挂机喂养
    const feedOn = !!(save.petFeed && save.petFeed.on);
    html += '<div class="recrow' + (feedOn ? ' can' : '') + '">' +
      '<div class="rr-main"><b>挂机喂养 · ' + (feedOn ? '开着' : '关着') + '</b>' +
      '<em>每段时辰自动喂一颗饲灵丸（没有就折四块灵石），灵兽自己长阶，不必守着。</em></div>' +
      '<div class="rr-right"><button class="sr-btn' + (feedOn ? ' ghost' : ' buy') + '" data-feed="1">' +
      (feedOn ? '关掉' : '开') + '</button></div></div>';
    if (feedOn) html += '<div class="cs-note">饲灵丸存量 ' + (save.inventory['m_siling'] || 0) + ' 颗　灵石 ' + (save.stones || 0) + '</div>';
    html += '</div>';

    // 掌天瓶·催熟（P0-3）：绿液催熟灵草/灵宠，噬金虫养成全靠它
    const hasBottle = (save.inventory['zhangtian'] || 0) > 0 || (save.inventory['gupu'] || 0) > 0;
    const gl = save.greenLiquid || 0;
    html += '<div class="cave-sec" style="border-top:1px dashed #2a5a4a"><div class="cs-title">掌天瓶 · 催熟</div>' +
      '<div class="cs-note">掌天瓶是韩立的金手指。绿液催熟灵草、加速灵宠成长 —— 噬金虫一脉尤其离不开它。' +
      (hasBottle ? '' : '（需先得掌天瓶）') + '　绿液存量 ' + gl + ' 滴。</div>';
    if (hasBottle) {
      const canCu = gl > 0 && !!save.pet;
      html += '<div class="rr-right" style="justify-content:flex-start">' +
        '<button class="sr-btn' + (canCu ? ' buy' : ' ghost') + '" data-cul>' + (canCu ? '催熟灵宠（耗 1 绿液）' : (gl > 0 ? '放出一只灵宠再催' : '绿液不足')) + '</button></div>';
    }
    html += '</div>';

    // 待孵的卵：灵兽袋满时卵会退回来，搁这儿等腾地方
    const eggs = eggRows();
    if (eggs.length) {
      html += '<div class="cave-sec"><div class="cs-title">待孵的卵</div>' +
        '<div class="cs-note">路上捡的、打出来的，先收在储物袋里。灵兽袋腾出地方了再孵 —— 孵出来直接进袋。</div>';
      for (const g of eggs) {
        const d = petDefOf(g.to);
        const full = petRoom() <= 0;
        html += '<div class="recrow' + (full ? '' : ' can') + '">' +
          '<div class="rr-main"><b>' + ico(g.icon || '🥚') + g.name + ' ×' + g.n + '</b>' +
          '<em>孵出「' + (d ? d.name : g.to) + '」' + (full ? '　灵兽袋已满，先放生一只再说' : '') + '</em></div>' +
          '<div class="rr-right"><button class="sr-btn' + (full ? ' ghost' : ' buy') + '" data-hatch="' + g.id + '"' +
          (full ? ' disabled' : '') + '>孵化</button></div></div>';
      }
      html += '</div>';
    }

    if (!owned.length) {
      html += '<div class="cave-sec"><div class="cs-title">灵宠</div>' +
        '<div class="cs-empty">还没有灵宠。<br>有些是路上捡的卵孵的，有些是打出来的 —— 遇到了才有的带。</div></div>';
      return html;
    }
    html += '<div class="cave-sec"><div class="cs-title">灵宠</div>' +
      '<div class="cs-note">带一只出门。它跟在后头，自己会出手，打得不重但不停。喂得勤，长得快。</div>';
    for (const e of owned) {
      const id = e.id;
      const p = petDefOf(id);
      if (!p) continue;
      const on = save.pet === id;
      const need = petXpNeed(e.lv || 1);
      const dmgUp = Math.round((petDmgMul(id) - 1) * 100);
      const catLabel = { pet: '灵宠', puppet: '傀儡', spirit: '器灵', avatar: '化身' }[p.cat] || '灵宠';
      html += '<div class="recrow' + (on ? ' can' : '') + '">' +
        '<div class="rr-main"><b>' + ico(p.icon || '🐾') + p.name + '　第 ' + (e.lv || 1) + ' 阶' + (on ? ' · 随行' : '') + '　<span class="pet-cat">' + catLabel + '</span></b>' +
        '<em>' + p.desc + '　（' + p.from + '）　威势 +' + dmgUp + '%　修为 ' + Math.floor(e.xp || 0) + ' / ' + need + '</em></div>' +
        '<div class="rr-right">' +
        '<button class="sr-btn' + (on ? ' ghost' : ' buy') + '" data-pet="' + id + '">' + (on ? '收回' : '放出') + '</button> ' +
        '<button class="sr-btn ghost" data-release="' + id + '">放生</button></div></div>';
    }
    html += '</div>';
    return html;
  }

  function renderCaveMate(lv) {
    const owned = save.mates || [];
    let html = '<div class="cave-sec"><div class="cs-title">同伴</div>' +
      '<div class="cs-note">按剧情出现的人。带一个出门，他站你另一侧，出手比灵宠重，也比灵宠慢。</div>';
    // 厉飞雨·双身份化名系统（P0-1）：七玄门篇章后解锁，不进队伍、不参战
    if (save.liUnlocked) {
      const faded = G.player && G.player.level >= (lifCfg().fadeRealm || 112);
      html += '<div class="cave-sec" style="border-top:1px dashed #5a4a2a">' +
        '<div class="cs-title">化名系统 · 厉飞雨 / 韩天尊</div>' +
        '<div class="cs-note">干脏活让「厉飞雨」背锅（黑声望 ' + (save.repBlack || 0) + '），好事以「韩天尊」本尊留名（白声望 ' + (save.repWhite || 0) + '）。' +
        (faded ? '化神之后马甲无人信，已锁回本尊。' : '') + '</div>' +
        '<div class="rr-right" style="justify-content:flex-start">' +
        '<button class="sr-btn ' + (save.identity === 'li' ? 'buy' : 'ghost') + '" data-identity="li"' + (faded ? ' disabled' : '') + '>厉飞雨（马甲）</button> ' +
        '<button class="sr-btn ' + (save.identity === 'han' ? 'buy' : 'ghost') + '" data-identity="han"' + (faded ? ' disabled' : '') + '>韩天尊（本尊）</button></div></div>';
    }
    if (!owned.length) {
      html += '<div class="cs-empty">还没有同伴。<br>走剧情，人自会来 —— 该遇上的，躲不掉。</div></div>';
      return html;
    }
    for (const id of owned) {
      const m = (window.MATES || []).find(x => x.id === id);
      if (!m) continue;
      const on = save.mate === id;
      const perk = m.perkText || (m.perk && m.perk.label) || '';
      html += '<div class="recrow' + (on ? ' can' : '') + '">' +
        '<div class="rr-main"><b>' + ico(m.icon || '🙂') + m.name + (on ? ' · 同行' : '') + '</b>' +
        '<em>' + m.desc + (perk ? '　【' + perk + '】' : '') + '　（' + m.from + '）</em></div>' +
        '<div class="rr-right"><button class="sr-btn' + (on ? ' ghost' : ' buy') + '" data-mate="' + id + '">' +
        (on ? '暂别' : '同行') + '</button></div></div>';
    }
    html += '</div>';
    return html;
  }

  function renderCaveBreak(lv) {
    const list = window.BREAKTHROUGH || [];
    let html = '';
    // 修为受创：原著里跌回炼气期四层，靠在小寰岛闭关、大量服食丹药一层层修回来
    if (save.wounded) {
      html += '<div class="cave-sec"><div class="cs-title">重修 · 修为受创</div>' +
        '<div class="cs-note">被南宫婉吸干修为，跌回 <b>炼气期四层</b>（原著如此）。' +
        '原著里他在小寰岛闭府，大量服食丹药：<b>一年</b>回到炼气期九层，<b>再一年</b>重回筑基，' +
        '<b>又六年</b>修成大衍诀第二层与身外化身，五十一岁筑基后期。眼下修到 <b>' + realmName(lv) + '</b>。</div>';
      for (const st of (window.REBUILD_STAGES || [])) {
        const done = lv >= st.lv;
        const can = !done && (save.stones || 0) >= st.stones;
        html += '<div class="cs-note">' + (done ? '✔ ' : '') + st.label + ' · 归 <b>' + st.to + '</b>' +
          '（灵石 ' + st.stones + '）　' + st.canon + '</div>';
        if (!done) {
          html += '<button class="btn small' + (can ? '' : ' off') + '" data-rebuild="' + st.lv + '">' +
            st.label + ' · 归' + st.to + '</button>';
        }
      }
      html += '</div>';
    }
    html += '<div class="cave-sec"><div class="cs-title">进阶</div>' +
      '<div class="cs-note">大境界不是刷满修为就能过。丹药、材料、灵石、剧情，四样齐备才谈得上冲关；' +
      '而冲关有成败 —— 破境丹押得越多把握越大（各境每枚的加成都不同），只带一枚，也只是赌一把。缺什么这里都写着。</div>';
    let pending = null;
    // 先算一遍状态：折叠组的开/关要靠「当前该破哪一关」定，不能边渲染边定
    const steps = list.map(b => {
      const done = lv >= b.lv;
      const miss = breakMissing(b);
      if (!done && !pending) pending = b;
      return { b, done, miss };
    });
    // 一关一组，默认开「当前这一关」：进来先看到自己在哪，其余全收着
    const stepKeys = steps.map(s => String(s.b.lv));
    const openStep = foldOpenOf('break', stepKeys, pending ? String(pending.lv) : (stepKeys[stepKeys.length - 1] || ''));
    for (const { b, done, miss } of steps) {
      let body = '<div class="cs-note">' + (b.tip || '') + '</div>';
      // 物事齐了：「闭门冲关」按钮顶在最上面，不用往下翻就能点
      if (!done && !miss.length) {
        const bm = MAPS.find(x => x.endLevel === b.lv);
        const c = b.chance || {};
        const pills = breakGatePills(b), rate = breakSuccessRate(b);
        let odds;
        if (b.wushuai) {
          // 五衰关：把握不是这里定的 —— 押几档、扛几道衰，进图之后才问
          odds = '天人有五衰 · 可避开 <b>' + wuCanAvoid(b) + '</b> 道（前两道躲不掉）· ' +
            wuName(b) + ' <b>' + wuHave(b) + '</b> 枚 · 每押一档 <b>' + wuStakeCost(b, 1) + '</b> 枚换 +' +
            pctCheng(((b.wushuai.step != null) ? b.wushuai.step : 0.15) * 100) + ' 把握，可避开的衰少一道';
        } else if (c.booster) {
          const bn = Items.get(c.booster) || { name: '助丹' };
          const n = save.inventory[c.booster] || 0;
          odds = '持丹 <b>' + pills + '</b> 套 · ' + bn.name + ' <b>' + n + '</b> 枚 · 冲关把握 <b>' + pctCheng(rate * 100) + '</b>'
            + (rate >= 1 ? '（十成把握）' : '（每枚 ' + pctChengDelta((c.step || 0.1) * 100) + '；败则丹药尽毁）');
        } else {
          odds = '持丹 <b>' + pills + '</b> 枚 · 冲关把握 <b>' + pctCheng(rate * 100) + '</b>'
            + (rate >= 1 ? '（十成把握）' : '（每枚 ' + pctChengDelta(breakStepOf(b) * 100) + '，' + Math.ceil(1 / breakStepOf(b)) + ' 枚必成；败则丹药尽毁）');
        }
        body += '<div class="cs-note">' + odds + '</div>';
        body += '<button class="btn small" data-breaknow="' + b.lv + '">入' + (bm ? '「' + bm.name + '」' : '洞府') + '冲关 · ' + b.realm + '</button>';
      }
      body += '<div class="brk-list">' + renderBreakList(b) + '</div>';
      // 组头只写「从哪到哪」，状态放右侧小字 —— 两处都写会变成「已过 已过」
      const cnt = done ? '已过'
        : (miss.length && miss.every(m => m.kind === 'level')) ? '差修为'
          : miss.length ? ('差 ' + miss.length + ' 样') : '齐了';
      html += foldGroup('break', String(b.lv), (done ? '✔ ' : '') + b.from + ' → ' + b.realm, cnt, body, openStep);
    }
    html += '</div>';
    return html;
  }
  function renderBreakList(b) {
    let h = '';
    for (const it of (b.items || [])) {
      const have = save.inventory[it[0]] || 0;
      h += breakRow(have >= it[1], '丹', breakNameOf(it[0]) + '　' + have + ' / ' + it[1], it[0]);
    }
    for (const it of (b.needs || [])) {
      const have = save.inventory[it[0]] || 0;
      h += breakRow(have >= it[1], '宝', breakNameOf(it[0]) + '　' + have + ' / ' + it[1] + (it[1] === 1 ? '（天下独一份）' : ''), it[0]);
    }
    for (const mt of (b.mats || [])) {
      const have = save.inventory[mt[0]] || 0;
      h += breakRow(have >= mt[1], '材', breakNameOf(mt[0]) + '　' + have + ' / ' + mt[1], mt[0]);
    }
    if (b.stones) h += breakRow((save.stones || 0) >= b.stones, '石', '灵石　' + (save.stones || 0) + ' / ' + b.stones);
    if (b.skill) {
      const learned = !!((cultObj().skills || {})[b.skill]);
      const sk = window.skillById ? window.skillById(b.skill) : null;
      h += breakRow(learned, '功', (sk ? sk.name : b.skill) + (learned ? '（已习）' : '（须先习得 · 随剧情得法诀·洞府研习）'), 'sk_' + b.skill);
    }
    for (const s of (b.story || [])) {
      const ok = (save.cleared || []).indexOf(s.id) >= 0;
      h += breakRow(ok, '剧', (s.name || s.id) + '（' + (ok ? '已通' : '须先通关') + '）');
    }
    return h;
  }
  function setPet(id) {
    if (!petEntry(id)) return;
    if (save.pet === id) { save.pet = null; G.pet = null; notify('灵宠已收回'); }
    else {
      save.pet = id;
      G.pet = G.player ? { id: id, x: G.player.x - 24, y: G.player.y + 10, cd: 0.6, bob: 0 } : G.pet;
      const p = petDefOf(id);
      notify('灵宠随行 · ' + (p ? p.name : id) + '（第 ' + petLv(id) + ' 阶）'); Sfx.buff();
    }
    writeSave();
    renderCave();
  }

  // ==========================================================================
  // 进阶面板：修为到了顶，缺什么摆出来，齐了才破
  // ==========================================================================
  // 进阶清单的一行。可点击的行不再挂「?」—— 点行上的字就出「去哪取」
  function breakRow(ok, tag, text, itemId) {
    const click = itemId ? ' data-item="' + itemId + '"' : '';
    return '<div class="brk-row' + (ok ? ' ok' : '') + (itemId ? ' click' : '') + '"' + click + '>' +
      '<i>' + tag + '</i><span>' + text + '</span><b>' + (ok ? '齐' : '缺') + '</b></div>';
  }
  function renderBreakBody(b) {
    if (!b) return '<div class="cs-empty">眼前没有要破的关。<br>修为满了，自然会来。</div>';
    let html = '<div class="cs-title">' + (b.from || '') + ' → ' + b.realm + '</div>' +
      '<div class="cs-note">' + (b.tip || '') + '</div>';
    // 天人有五衰：这一关不是凑齐就必成，先把「躲不掉的那两道」摆出来
    if (b.wushuai) {
      html += '<div class="cs-note">天人有五衰（X2C327）：此番可避开 <b>' + wuCanAvoid(b) + '</b> 道，' +
        '余下 <b>' + wuTake(b, 0) + '</b> 道只能扛 —— 押' + wuName(b) + '越多，把握越高，可避开的衰越少。</div>';
    }
    html += '<div class="cs-note brk-hint">缺哪一样，点那一行就写它去哪儿取。</div>';
    html += '<div class="brk-list">';
    for (const it of (b.items || [])) {
      const have = save.inventory[it[0]] || 0;
      html += breakRow(have >= it[1], '丹', breakNameOf(it[0]) + '　' + have + ' / ' + it[1], it[0]);
    }
    for (const mt of (b.mats || [])) {
      const have = save.inventory[mt[0]] || 0;
      html += breakRow(have >= mt[1], '材', breakNameOf(mt[0]) + '　' + have + ' / ' + mt[1], mt[0]);
    }
    // 硬门槛（补天丹之类一次性至宝）：原先漏渲染了，这里补上「需」行，让它也可见可点
    for (const nd of (b.needs || [])) {
      const have = save.inventory[nd[0]] || 0;
      html += breakRow(have >= nd[1], '需', breakNameOf(nd[0]) + '　' + have + ' / ' + nd[1], nd[0]);
    }
    if (b.stones) html += breakRow((save.stones || 0) >= b.stones, '石', '灵石　' + (save.stones || 0) + ' / ' + b.stones);
    if (b.skill) {
      const learned = !!((cultObj().skills || {})[b.skill]);
      const sk = window.skillById ? window.skillById(b.skill) : null;
      html += breakRow(learned, '功', (sk ? sk.name : b.skill) + (learned ? '（已习）' : '（须先习得 · 天渊坊市购法诀·洞府研习）'), 'sk_' + b.skill);
    }
    for (const s of (b.story || [])) {
      const done = (save.cleared || []).indexOf(s.id) >= 0;
      html += breakRow(done, '剧', (s.name || s.id) + '（' + (done ? '已通' : '须先通关') + '）');
    }
    html += '</div>';
    return html;
  }
  function openBreak(b) {
    if (!elBreak) return;
    G.breakCur = b || G.breakCur;
    if (!G.breakCur) return;
    if (elBreakBody) elBreakBody.innerHTML = renderBreakBody(G.breakCur);
    const miss = breakMissing(G.breakCur);
    if (elBreakGo) {
      elBreakGo.disabled = miss.length > 0;
      elBreakGo.textContent = miss.length ? ('还差 ' + miss.length + ' 样') : ('进阶 · ' + G.breakCur.realm);
    }
    hideAllOverlays();
    elBreak.style.display = 'flex';
  }
  function closeBreak() { if (elBreak) elBreak.style.display = 'none'; hideItemTip(); }
  // 道具「去哪取」提示：进阶清单与炼丹/炼器/制符的材料共用同一张卡。
  // 先认原著写好的条目（BREAK_ITEM_HINTS），没写过的按数据层现算：
  // 坊市有售 → 哪张图掉 → 药圃可种 → 自家能炼。四样都没有就直说「暂无定处」，不瞎编。
  let elItemTip = null;
  function ensureItemTip() {
    if (elItemTip) return elItemTip;
    elItemTip = document.createElement('div');
    elItemTip.id = 'itemTip';
    elItemTip.className = 'item-tip';
    elItemTip.style.display = 'none';
    document.body.appendChild(elItemTip);
    return elItemTip;
  }
  const ITEM_HINT_CACHE = {};
  function itemHintOf(id) {
    if (id in ITEM_HINT_CACHE) return ITEM_HINT_CACHE[id];
    let out = (window.BREAK_ITEM_HINTS || {})[id] || '';
    if (!out) {
      const bits = [];
      // 坊市：哪家铺子有卖、几钱
      const stock = (window.SHOP_STOCK || []).find(s => s.id === id);
      if (stock) {
        const where = [];
        for (const m of (window.MAPS || [])) {
          if (m.shop && m.shop.indexOf(stock.id) >= 0 && where.indexOf(m.name) < 0) where.push(m.name);
        }
        if (where.length) bits.push('坊市有售：' + where.slice(0, 2).join('、') + (where.length > 2 ? ' 等处' : '') + '（' + stock.price + ' 灵石）');
      }
      // 掉落：哪张图的妖兽、矿脉会出（含通关奖励里的那份）
      const drops = [];
      for (const m of (window.MAPS || [])) {
        let hit = (m.mats || []).indexOf(id) >= 0;
        if (!hit && m.reward && m.reward.mats) hit = m.reward.mats.some(x => x[0] === id);
        if (!hit && m.enemies) {
          for (const k of m.enemies) {
            const e = (window.ENEMY_TYPES || {})[k];
            if (e && e.mats && e.mats.indexOf(id) >= 0) { hit = true; break; }
          }
        }
        if (hit && drops.indexOf(m.name) < 0) drops.push(m.name);
      }
      if (drops.length) bits.push('掉落：' + drops.slice(0, 2).join('、') + (drops.length > 2 ? ' 等处' : ''));
      // 药圃：自家洞府里种的（基础品种 + 移栽进来的品种都算）
      const grows = [];
      for (const cid in (window.CAVES || {})) {
        for (const g of (((window.CAVES[cid] || {}).gardens) || [])) {
          const seeded = ((save.gardenSeed || {})[g.id]) || [];
          if (((g.pool || []).indexOf(id) >= 0 || seeded.indexOf(id) >= 0) && grows.indexOf(g.name) < 0) grows.push(g.name);
        }
      }
      if (grows.length) bits.push('药圃可种：' + grows.slice(0, 2).join('、') + (grows.length > 2 ? ' 等处' : ''));
      // 自炼：哪张方子出这件东西
      const rec = (window.RECIPES || []).find(r => r.out === id);
      if (rec) {
        const kd = (window.RECIPE_KINDS || {})[rec.kind] || { name: '炼制' };
        bits.push('可自炼：' + kd.name + '「' + rec.name + '」');
      }
      out = bits.length ? bits.join(' · ') : '暂无定处 · 寻常打不着，须另寻机缘';
    const _ti = Items.get(id);
    if (_ti && _ti.teach) out += '　·　法诀：购 / 得后至洞府「功法」页点「学习」方才习得（书留架上，日后被清可重学）';
    }
    ITEM_HINT_CACHE[id] = out;
    return out;
  }
  function showItemHint(id, anchor) {
    const t = itemHintOf(id);
    const item = Items.get(id);
    const tip = ensureItemTip();
    if (!t) { tip.style.display = 'none'; return; }
    tip.innerHTML = '<b>' + (item ? item.name : id) + '</b><span>' + t + '</span>';
    tip.style.display = 'block';
    // 就地把卡片插到点的那一行下面 —— 不遮按钮、不盖列表
    const row = (anchor && anchor.closest) ? anchor.closest('.recrow, .brk-row') : null;
    if (row && row.parentNode) {
      tip.classList.add('inline'); tip.classList.remove('float');
      row.insertAdjacentElement('afterend', tip);
    } else {
      tip.classList.add('float'); tip.classList.remove('inline');
      document.body.appendChild(tip);
    }
  }
  function hideItemTip() { if (elItemTip) elItemTip.style.display = 'none'; }
  // 撞上瓶颈：修为卡住。战斗里不弹全屏面板遮挡画面 ——
  // 每张图进门只弹幕提示一次：料不齐说缺什么；料齐了叫回洞府走「进阶」剧情。
  function markBlocked(b) {
    G.breakPending = b || null;
    if (!b) return;
    if (!G.breakHinted) {
      G.breakHinted = true;
      const lvOk = breakLevelOk(b);
      banner((lvOk && canBreak(b))
        ? ('物事已齐 · 回任一洞府选「进阶」冲关 · ' + b.realm)
        : (lvOk
            ? ('修为已至 ' + (b.from || '') + ' · 缺 ' + b.realm + ' 的物事')
            : ('修为未达 ' + (b.from || '') + ' · 先厚实根基再来')));
    }
  }
  // 进阶剧情演出：按原著演一段，演完押上这一炉丹搏一把 —— 成则破境，败则丹药散尽、可再来。
  // onDone(gate, ok)
  function breakSceneThen(gate, onDone) {
    if (!gate) { if (onDone) onDone(null, true); return; }
    G.breakCur = gate;
    const scene = (gate.story && gate.story[0] && gate.story[0].name) || '洞府';
    const lines = [['　' + scene + '　', (gate.from || '') + ' → ' + gate.realm]];
    const novel = (gate.lines && gate.lines.length) ? gate.lines : [['旁白', gate.tip || '']];
    for (const l of novel) lines.push(l);
    // 天人有五衰的关：先演原文，再问「这一炉押几档」——把握与要扛的衰都在那一刻定下来
    if (gate.wushuai) {
      G.breakScene = gate.lv;
      if (elDialog) elDialog.classList.add('break-scene');
      showLines(lines, () => {
        if (elDialog) elDialog.classList.remove('break-scene');
        askWushuai(gate, onDone);
      }, 'break:' + gate.lv);
      return;
    }
    // 幕落之前把这一炉的底牌摆明：押几枚丹、几分把握
    const pills = breakGatePills(gate);
    const rate = breakSuccessRate(gate);
    const itemNames = (gate.items || []).map(it => (Items.get(it[0]) || {}).name).filter(Boolean).join(' + ') || '破境丹';
    if (gate.chance && gate.chance.booster) {
      const bn = Items.get(gate.chance.booster) || { name: '助丹' };
      const n = save.inventory[gate.chance.booster] || 0;
      lines.push(['旁白', '（' + itemNames + ' 已入炉，' + bn.name + ' ' + n + ' 枚尽数服下 —— 冲关把握约 ' + pctCheng(rate * 100) + '。）']);
    } else {
      lines.push(['旁白', '（囊中' + itemNames + ' ' + pills + ' 枚，尽数入炉 —— 冲关把握约 ' + pctCheng(rate * 100) + '。）']);
    }
    // 手里还留着煞丹术这一手的，提前说一声（这是原著里那条旁门）
    if (shaDanReady(gate)) lines.push(['旁白', '（另外 —— 这一炉真炸了，你还有煞丹术可走，只是根基要脏一分。）']);
    G.breakScene = gate.lv;
    if (elDialog) elDialog.classList.add('break-scene');
    showLines(lines, () => {
      if (elDialog) elDialog.classList.remove('break-scene');
      settleBreakScene(gate, onDone, null);
    }, 'break:' + gate.lv);
  }
  // 天人有五衰：破境前先问押几档。
  // 押得越多 → 仙窍越稳（把握越高），**能避开的衰却越少**——力气都用在稳住上了。
  // 五道衰里前两道与修行时间有关，天生躲不掉（X2C328），所以最多只能避三道。
  function askWushuai(gate, onDone) {
    const maxK = wuMaxStake(gate);
    const nm = wuName(gate), have = wuHave(gate);
    const opts = [];
    for (let k = 0; k <= maxK; k++) {
      const cost = wuStakeCost(gate, k);
      const t = (k === 0 ? '不押' : ('押 ' + cost + ' 枚'))
        + ' · 把握 ' + pctCheng(wuRate(gate, k) * 100)
        + ' / 扛 ' + wuTake(gate, k) + ' 衰'
        + (cost > have ? '（' + nm + '不够）' : '');
      opts.push({ v: String(k), t: t });
    }
    const avoid = wuCanAvoid(gate);
    const prompt = '天人有五衰（X2C327《天人有五衰》，24 次）：五道衰里，前两道与修行时间有关，躲不掉，只能扛。'
      + '押得越多，仙窍越稳，能避开的衰就越少。此刻可避开 ' + avoid + ' 道，手上有' + nm + ' ' + have + ' 枚 —— 这一炉押几档？';
    showChoice(prompt, opts, function (v) {
      const k = Math.max(0, Math.min(maxK, parseInt(v, 10) || 0));
      G.wuStake = k;
      const paid = payWuStake(gate, k);          // 押注：仙元石当场烧掉，不够就烧到见底
      const rate = wuRate(gate, k), take = wuTake(gate, k);
      const lines2 = [
        ['旁白', '（' + (k === 0 ? '不押 —— 仙窍由它自己稳。' : ('押' + nm + ' ' + paid + ' 枚，压住' + (k * 1) + '重仙窍。'))
          + '冲关把握 ' + pctCheng(rate * 100) + '，可避开的衰还剩 ' + Math.max(0, avoid - k) + ' 道 —— 这一趟要扛 ' + take + ' 道。）'],
        ['旁白', '（躲不掉的那两道，跟修行时间有关。修得越久，来得越早。）']
      ];
      settleBreakScene(gate, onDone, lines2);
    });
  }
  // 破境结算：押丹（押注已在前一步付过）→ 掷一次 → 成则抬境界，败则衰提前降临
  function settleBreakScene(gate, onDone, extra) {
    if (breakMissingGoods(gate).length) {              // 结算前料被别处吃掉：不硬破
      G.breakPending = gate; G.breakCur = null; G.breakScene = null;
      if (onDone) onDone(gate, false);
      return;
    }
    // 把握必须在押丹「之前」算：押丹是按「手上有几枚」算把握的，丹一入炉就没了。
    // （这行放错位置会让 rate 永远算成 0 —— 破境必定失败。）
    const isWu = !!gate.wushuai, k = isWu ? (G.wuStake || 0) : 0;
    const rate = breakSuccessRate(gate);
    payBreak(gate);                                        // 押丹：手上几枚全押
    const ok = (G.breakForce != null) ? !!G.breakForce : (Math.random() < rate);
    G.breakCur = null; G.breakScene = null;
    if (!ok) {
      if (isWu) {
        // 失败不是「运气不好」——是衰提前降临。这次没扛住，下次衰只会来得更早。
        settleWushuai(gate, false, k);
        G.breakPending = gate;
        writeSave();
        Sfx.warn();
        showLines([['旁白', '仙窍没稳住。'],
          ['旁白', '天空暗了一下，又亮回来——那不是天在变，是衰提前来了。'],
          ['旁白', '（五衰提前降临。下一次再来，可避开的衰又少一道。）']], function () {
          banner('五衰提前降临 · 可避开的衰少了一道');
          if (onDone) onDone(gate, false);
        }, 'break:wu:fail:' + gate.lv);
        return;
      }
      if (applyShaDan(gate)) { if (onDone) onDone(gate, true); return; }
      G.breakPending = gate;
      writeSave();
      banner('冲关失败 · 丹药散尽，另备丹药再来');
      Sfx.warn();
      if (onDone) onDone(gate, false);
      return;
    }
    const newLv = Math.max(save.cultivate.level || 1, gate.lv);
    save.cultivate.level = newLv;
    save.cultivate.xp = 0;
    syncBestLevel();
    const take = isWu ? settleWushuai(gate, true, k) : 0;
    if (G.player) {
      G.player.level = Math.max(G.player.level || 1, newLv);
      G.player.next = xpNeed(newLv);
      checkRealm(true); recalcMaxhp();
      G.player.hp = G.player.maxhp;
    }
    G.breakPending = null;
    writeSave();
    if (isWu) {
      const tail = [['旁白', '境界是上去了。可天上那几道还没走完。'],
        ['旁白', '（这一炉扛了 ' + take + ' 道衰，压在身上：气血、出手、遁速都削一截。每打通一张图消一层。）']];
      showLines((extra || []).concat(tail), function () {
        banner('破境 · ' + gate.realm + ' · 扛衰 ' + take + ' 道');
        Sfx.levelup();
        if (onDone) onDone(gate, true);
      }, 'break:wu:ok:' + gate.lv);
      return;
    }
    if (onDone) onDone(gate, true);
  }
  // 洞府「进阶」按钮：物事齐了 → 进这张门对应的破境地图，走完剧情/打完，就地在剧情里破境
  function enterBreakMap(gate) {
    if (!gate) return;
    const miss = breakMissing(gate);
    if (miss.length) {
      const lvMiss = miss.some(m => m.kind === 'level');
      notify(lvMiss ? ('修为未达 ' + (gate.from || '') + ' · 先厚实根基再来') : '物事不齐 · 备齐了再来');
      Sfx.warn(); return;
    }
    // 破境图 = endLevel 恰好等于这道门的剧情图（地火之屋 / 天星城闭府 / 云梦山结婴 / 芥子空间…）
    const bm = MAPS.find(x => x.endLevel === gate.lv)
      || (gate.story && MAPS.find(x => x.id === gate.story[0].id))
      || null;
    if (!bm) {
      // 没有对应的剧情地图：就地演一段破境（退路）
      if (elCave) elCave.style.display = 'none';
      breakSceneThen(gate, (g, ok) => {
        G.state = 'cave'; if (elCave) elCave.style.display = 'flex'; renderCave();
        banner(ok ? ('破境 · ' + g.realm) : '冲关失败 · 另备丹药再来');
      });
      return;
    }
    if (save.unlocked.indexOf(bm.id) < 0) save.unlocked.push(bm.id);
    G.breakCur = gate;
    G.breakCaveId = G.caveId;   // 从原著洞府进来冲关：把「出关的洞府」带进破境图，便于判定 +30%
    beginMap(bm.id);
  }
  // 直接冲关（无剧情地图 / 调试口）：同样要过这一炉丹的成败
  function doBreakNow() {
    const b = G.breakCur; if (!b) return false;
    const miss = breakMissing(b);
    if (miss.length) {
      const lvMiss = miss.some(m => m.kind === 'level');
      notify(lvMiss ? ('修为未达 ' + (b.from || '') + ' · 先厚实根基再来') : '物事不齐 · 备齐了再来');
      Sfx.warn(); return false;
    }
    const rate = breakSuccessRate(b);
    const isWu = !!b.wushuai, k = isWu ? (G.wuStake || 0) : 0;
    // keepOnFail：冲关失利时把押进去的破境丹原数退回（灵石照扣，丹药不没收）
    const keep = b.keepOnFail ? (b.items || []).map(([id]) => [id, save.inventory[id] || 0]) : null;
    if (isWu) payWuStake(b, k);     // 五衰关的押注（仙元石）在此扣，与押丹分开
    payBreak(b);
    G.breakCur = null;
    closeBreak();
    const ok = (G.breakForce != null) ? !!G.breakForce : (Math.random() < rate);
    if (!ok) {
      if (isWu) {                    // 败的不是运气，是衰提前降临
        settleWushuai(b, false, k);
        G.breakPending = b;
        banner('五衰提前降临 · 可避开的衰少了一道'); Sfx.warn();
        writeSave(); renderCave(); refreshTitle();
        return false;
      }
      if (applyShaDan(b)) { renderCave(); refreshTitle(); return true; }
      if (keep) for (const [id, had] of keep) { const it = Items.get(id); if (it && had > 0) for (let i = 0; i < had; i++) addToBag(it, { silent: true }); }
      G.breakPending = b;
      banner(b.keepOnFail ? '冲关失败 · 灵压反噬，丹药退回，再备料重来' : '冲关失败 · 丹药散尽，另备丹药再来'); Sfx.warn();
      writeSave(); renderCave(); refreshTitle();
      return false;
    }
    const take = isWu ? settleWushuai(b, true, k) : 0;
    G.breakPending = null;
    banner(isWu ? ('冲关 · ' + b.realm + ' · 扛衰 ' + take + ' 道') : ('冲关 · ' + b.realm)); Sfx.levelup();
    if (G.player && (G.state === 'play' || G.state === 'down')) {
      const p = G.player;
      p.xp = Math.max(p.xp, p.next);
      if (G.state === 'play') { p.xp -= p.next; p.level++; p.next = xpNeed(p.level); checkRealm(); queueLevelUp(); }
    } else {
      // 洞府冲关：丹料即丹，服下便破 —— 直接把境界推到这道门后那一层（b.lv）。
      // 旧写法走 addCultivateXp，料刚吃完又会被 breakReqFor 卡住，破了个寂寞。
      const newLv = Math.max(save.cultivate.level || 1, b.lv);
      save.cultivate.level = newLv;
      save.cultivate.xp = 0;
      syncBestLevel();
      if (G.player) {
        G.player.level = newLv; G.player.next = xpNeed(newLv);
        checkRealm(true); recalcMaxhp();
        G.player.hp = G.player.maxhp;
      }
      writeSave(); refreshTitle(); renderCave();
    }
    G.breakCaveId = null;   // 破境结算后清空「出关洞府」上下文
    return true;
  }

  // ---------- 药圃：一块地一畦，各长各的 ----------
  // 旧园、绿液区、小寰岛、落云宗天泉峰、芥子空间 —— 原著里韩立确实开过药园的那几处。
  // 规则：在战斗地图里每待 1 秒，每块地各长 1 次；每块地各自封顶 99；采收按地块分开，收哪块清哪块。
  // 所以打一局能把几块地一起攒满，回来一趟全收 —— 这是「爽感」的来源。
  const GARDEN_CAP = 99;
  function gardenList() {
    const out = [];
    for (const k in CAVES) {
      const c = CAVES[k];
      if (!c || !c.gardens || !c.gardens.length) continue;
      for (const g of c.gardens) out.push({ cave: c, g: g });
    }
    return out;
  }
  function gardenCapOf(g) { return (g && g.cap) || GARDEN_CAP; }
  function gardenChargeOf(g) { return Math.min(gardenCapOf(g), Math.floor(((save.gardenCharge || {})[g.id]) || 0)); }
  // 一块地实际能长哪些药：数据里的基础品种 + 存档里移栽进来的品种（去重、顺序稳定）
  function gardenPoolOf(g) {
    if (!g) return [];
    const out = [];
    const push = (id) => {
      if (id && out.indexOf(id) < 0 && (window.MATERIALS || []).some(m => m.id === id)) out.push(id);
    };
    for (const id of (g.pool || [])) push(id);
    for (const id of (((save.gardenSeed || {})[g.id]) || [])) push(id);
    return out;
  }
  // 移栽：材料上带 transplant:'<地块id>' 的，一旦手里有 ≥1，就自动留一株作种移进那块地。
  // 原著里绿液就是这么用的——灵药到手不急着全用掉，先移进药园，此后定期采收。
  // 返回本次新移栽的材料（供提示 / 验收）。silent=true 时不弹提示（读档、后台巡检用）。
  function autoTransplant(silent) {
    const list = gardenList();
    if (!list.length) return [];
    save.gardenSeed = save.gardenSeed || {};
    const planted = [];
    for (const m of (window.MATERIALS || [])) {
      if (!m.transplant) continue;
      const owner = list.find(x => x.g.id === m.transplant);
      if (!owner) continue;                                   // 目标药圃不在数据里
      if (save.caves.indexOf(owner.cave.id) < 0) continue;    // 洞府还没到手，先不移
      const seed = save.gardenSeed[m.transplant] = save.gardenSeed[m.transplant] || [];
      if (seed.indexOf(m.id) >= 0) continue;                  // 已经移栽过
      if ((save.inventory[m.id] || 0) <= 0) continue;         // 手里还没有这味
      save.inventory[m.id]--;                                 // 留一株作种
      if (save.inventory[m.id] <= 0) delete save.inventory[m.id];
      save.totalItems = Math.max(0, (save.totalItems || 0) - 1);
      seed.push(m.id);
      // 这味的「去哪取」缓存要重算：多了一条「药圃可种」
      try { delete ITEM_HINT_CACHE[m.id]; } catch (e) {}
      planted.push(m);
    }
    if (planted.length) {
      writeSave();
      if (!silent) {
        notify('已移栽 ' + planted.map(m => m.name).join('、') + ' ×1 至药圃 · 此后定期可采');
        Sfx.gem();
      }
    }
    return planted;
  }
  function tickGarden(dt) {
    // 只有真在打的图才算：坊市、洞府、结算界面里不长
    if (!(G.map && (G.map.type === 'combat' || G.map.type === 'boss' || G.map.type === 'chase'))) return;
    // 尚未移栽的空圃不累计（否则「已长成」白涨，收出来却什么都没有）
    const list = gardenList().filter(x => gardenPoolOf(x.g).length > 0);
    if (!list.length) { save.gardenTick = 0; return; }
    // 全部地块都长满了就不必再累计零头
    if (list.every(x => gardenChargeOf(x.g) >= gardenCapOf(x.g))) { save.gardenTick = 0; return; }
    save.gardenCharge = save.gardenCharge || {};
    save.gardenTick = (save.gardenTick || 0) + dt;
    while (save.gardenTick >= 1) {
      save.gardenTick -= 1;
      for (const x of list) {
        const id = x.g.id, cap = gardenCapOf(x.g), cur = save.gardenCharge[id] || 0;
        if (cur < cap) save.gardenCharge[id] = cur + 1;
      }
    }
    if (save.gardenTick > 1) save.gardenTick = 0;
  }
  // 按稀有度给权重：常见药多，越稀有越少 —— 99 次不至于全落在贵重货上
  function gardenWeight(m) {
    const r = (m && m.rarity) || 1;
    if (r >= 4) return 0.2;
    if (r === 3) return 1;
    return r === 2 ? 3 : 6;
  }
  function pickGarden(c, gid) {
    if (!c || !c.gardens || !c.gardens.length) return;
    const g = c.gardens.find(x => x.id === gid) || c.gardens[0];
    const ids = gardenPoolOf(g);
    if (!ids.length) { notify('这块地还空着 · 得灵药后会自动移栽进来'); Sfx.warn(); return; }
    const n = gardenChargeOf(g);
    if (n <= 0) { notify('这块地还空着 · 先去图里打一场'); Sfx.warn(); return; }
    const pool = ids.map(id => (window.MATERIALS || []).find(x => x.id === id)).filter(Boolean);
    if (!pool.length) return;
    const totalW = pool.reduce((s, m) => s + gardenWeight(m), 0);
    const got = {};
    for (let i = 0; i < n; i++) {
      let r = Math.random() * totalW, pick = pool[pool.length - 1];
      for (const m of pool) { r -= gardenWeight(m); if (r <= 0) { pick = m; break; } }
      got[pick.id] = (got[pick.id] || 0) + 1;
      save.inventory[pick.id] = (save.inventory[pick.id] || 0) + 1;
    }
    save.totalItems = (save.totalItems || 0) + n;
    save.gardenCharge = save.gardenCharge || {};
    save.gardenCharge[g.id] = 0;   // 只清这一块，别的地照旧
    writeSave();
    const order = Object.keys(got).sort((a, b) => got[b] - got[a]);
    const brief = order.slice(0, 3).map(id => { const m = pool.find(x => x.id === id); return (m ? m.name : id) + '×' + got[id]; }).join('、');
    notify(g.name + ' 采收 ' + n + ' 株 · ' + order.length + ' 味：' + brief + (order.length > 3 ? ' 等' : ''));
    Sfx.gem();
    renderCave();
  }
  function renderCaveGarden(c) {
    return c.gardens.map(g => {
      const n = gardenChargeOf(g), cap = gardenCapOf(g), full = n >= cap;
      const ids = gardenPoolOf(g);
      const names = ids.map(id => { const m = (window.MATERIALS || []).find(x => x.id === id); return m ? (m.icon || '🌿') + m.name : ''; }).filter(Boolean).join('　') || '（尚无移栽灵药）';
      const emptyNote = (g.transplant && !ids.length)
        ? '<div class="cs-note">灵界灵药到手后，会自动留一株作种移入此地，此后定期可采。</div>' : '';
      return '<div class="cave-sec"><div class="cs-title">' + g.name + '</div>' +
        '<div class="cs-note">' + g.tip + '</div>' +
        '<div class="restbox"><div class="statgrid">' +
        '<div class="statcell"><i>已长成</i><b>' + n + ' / ' + cap + '</b></div>' +
        '<div class="statcell"><i>长势</i><b>' + (ids.length ? (full ? '已长满' : '每秒 +1') : '待移栽') + '</b></div>' +
        '<div class="statcell"><i>园中品种</i><b>' + ids.length + ' 味</b></div>' +
        '</div>' +
        '<div class="cs-note">园里：' + names + '</div>' + emptyNote +
        '<div class="restbtns"><button class="btn small" data-pickg="' + c.id + '|' + g.id + '"' + (n > 0 && ids.length ? '' : ' disabled') + '>' +
          (ids.length ? (n > 0 ? '采收 ' + n + ' 株' : '这块地空着') : '待移栽') + '</button></div>' +
        '</div></div>';
    }).join('');
  }

  function renderCaveRest(c, lv) {
    const capped = lv >= c.capLevel;
    const xp = Math.floor(save.cultivate.xp || 0), need = xpNeed(lv);
    // 这座洞府来历那张图上若还有没遇的人/事，给个按钮直接演（洞府里走不动）
    // 一间草庐可能由多张图并来（百药园旧园 + 绿液区），逐张查，别漏了后并进来那张
    const encSrc = (c && c.froms && c.froms.length) ? c.froms : ((c && c.from) ? [c.from] : []);
    let encBtn = '';
    for (const src of encSrc) {
      const pend = pendingEncOf(src);
      if (pend) encBtn += '<button class="btn small" data-enc="' + pend.id + '">际遇 · ' + pend.name + '</button>';
    }
    return (encBtn ? '<div class="cave-sec">' + encBtn + '</div>' : '') +
      '<div class="cave-sec"><div class="cs-title">闭关静修</div>' +
      '<div class="cs-note">' + c.restTip + '</div>' +
      '<div class="restbox">' +
      '<div class="statgrid">' +
      '<div class="statcell"><i>当前境界</i><b>' + realmName(lv) + '</b></div>' +
      '<div class="statcell"><i>此地可修至</i><b>' + realmName(c.capLevel) + '</b></div>' +
      '<div class="statcell"><i>修为积累</i><b>' + xp + ' / ' + need + '</b></div>' +
      '<div class="statcell"><i>每次所得</i><b>' + Math.round(need * c.restXp) + ' 修为</b></div>' +
      '<div class="statcell"><i>每次耗灵石</i><b>' + c.restStone + '</b></div>' +
      '<div class="statcell"><i>袋中灵石</i><b>' + (save.stones || 0) + '</b></div>' +
      '</div>' +
      (capped
        ? '<div class="resttip warn">此地灵气已尽，再坐也是空耗。须往更远处去。</div>'
        : '<div class="resttip">按现下灵石，可坐 ' + Math.floor((save.stones || 0) / c.restStone) + ' 次。</div>') +
      '<div class="restbtns">' +
      '<button class="btn small" data-rest="1"' + (capped ? ' disabled' : '') + '>闭关一次</button>' +
      '<button class="btn small" data-rest="5"' + (capped ? ' disabled' : '') + '>闭关五次</button>' +
      '</div></div></div>';
  }

  // ---------- 太南小会 ----------
  function openShop(tab) {
    G.state = 'shop';
    G.shopTab = tab || G.shopTab || 'buy';
    renderShop();
    hideAllOverlays();
    if (elShop) elShop.style.display = 'flex';
  }
  function renderShop() {
    if (!elShopList) return;
    const lv = Math.max(save.cultivate.level || 1, save.best.level || 1);
    // 坊市门口挂谁的招牌，就看此刻在哪张图
    if (elShopTitle) elShopTitle.textContent = (G.map && G.map.name) || '坊市';
    if (elShopSub) elShopSub.textContent = (G.map && (G.map.shopSub || G.map.pos)) || '散修云集，灵石为凭。买所得，卖所余。';
    if (elShopStones) elShopStones.textContent = '灵石 ' + (save.stones || 0);
    if (elShopBag) elShopBag.textContent = '储物袋 ' + (save.totalItems || 0) + ' 件';
    if (elShopBuyTab) elShopBuyTab.classList.toggle('active', G.shopTab !== 'sell');
    if (elShopSellTab) elShopSellTab.classList.toggle('active', G.shopTab === 'sell');
    if (elShopCats) {
      if (G.shopTab === 'sell') elShopCats.innerHTML = '';
      else elShopCats.innerHTML = SHOP_CATS.map(c =>
        '<button class="tab mini' + (G.shopCat === c.id ? ' active' : '') + '" data-cat="' + c.id + '">' + c.name + '</button>'
      ).join('');
    }
    // 本图还有没遇的人/事 → 顶上给一个「际遇」按钮；没有就整个藏掉
    if (elEncBtn) {
      const pend = pendingEncOf(G.map && G.map.id);
      if (pend) {
        elEncBtn.style.display = '';
        elEncBtn.textContent = '际遇 · ' + pend.name;
        elEncBtn.setAttribute('data-enc', pend.id);
      } else {
        elEncBtn.style.display = 'none';
        elEncBtn.removeAttribute('data-enc');
      }
    }
    const rows = [];
    if (G.shopTab === 'sell') {
      const ids = Object.keys(save.inventory).filter(id => (save.inventory[id] || 0) > 0 && Items.get(id));
      if (!ids.length) rows.push('<div class="shopempty">储物袋里空空的，先去打些东西。</div>');
      else rows.push('<div class="shopempty tip">同名之物可叠加。佩在身上的那份不动，其余可卖、可拆成材料。</div>');
      // 一键卖出材料：扫一遍储物袋里所有可卖之料，一次清空换灵石
      {
        let mk = 0, mt = 0;
        for (const id of ids) {
          const it = Items.get(id); if (!it || !it.mat || it.unique) continue;
          const k = sellableCount(id); if (k <= 0) continue;
          mk++; mt += sellPriceOf(it) * k;
        }
        if (mk > 0) rows.push('<div class="shoprow sellall-mat">' +
          '<div class="sr-main"><b>一键卖出材料</b><i>共 ' + mk + ' 种 · 估 ' + mt + ' 灵石（不含佩带中与仅此一件的料）</i></div>' +
          '<div class="sr-right"><button class="sr-btn buy" data-sellmat="1">卖出</button></div></div>');
      }
      for (const id of ids) {
        const it = Items.get(id), r = RARITY[it.rarity], price = sellPriceOf(it);
        const own = save.inventory[id], free = sellableCount(id), eq = equippedCountOf(id);
        const tag = it.slot ? '<span class="sr-gear">装备</span>' : it.mat ? '<span class="sr-mat">材料</span>' : '';
        const bits = [];
        // 只此一件的东西：不卖、不拆。卖掉就再没有第二次机缘了
        if (free > 0 && !it.unique) bits.push('<button class="sr-btn" data-sell="' + id + '">卖 ' + price + '</button>');
        if (free > 1 && !it.unique) bits.push('<button class="sr-btn ghost" data-sellall="' + id + '">卖尽</button>');
        if (it.slot && free > 0 && !it.unique) bits.push('<button class="sr-btn ghost" data-decomp="' + id + '">拆</button>');
        if (it.slot && free > 1 && !it.unique) bits.push('<button class="sr-btn ghost" data-decompall="' + id + '">拆尽</button>');
        rows.push('<div class="shoprow">' +
          '<div class="sr-main"><b style="color:' + r.color + '">' + it.name + tag + '</b><i>' + r.name + ' · ' + it.desc + '</i></div>' +
          '<div class="sr-right"><span class="sr-own">×' + own + (eq ? '<i class="sr-eq">佩' + eq + '</i>' : '') + '</span>' +
          (bits.length ? '<span class="sr-btns">' + bits.join('') + '</span>' : '<span class="sr-eq">' + (it.unique ? '只此一件' : '全在佩上') + '</span>') +
          '</div></div>');
      }
    } else {
      // 每张图各卖各的：太南小会是炼气散修的摊子，天星城是乱星海的市面
      const stock = (G.map && G.map.shop) ? SHOP_STOCK.filter(s => G.map.shop.indexOf(s.id) >= 0) : SHOP_STOCK;
      // 晶龙阁拍卖（原著：阗天城交易会期间，天晶真人主持，入场赠面具掩身份）
      if (G.map && G.map.auction && G.map.auction.length) {
        rows.push('<div class="shopauc">晶龙阁 · 拍卖会<span>天晶真人主持，入场赠面具掩身份。百年一届，过了这村没这店。</span></div>');
        for (const a of G.map.auction) {
          const it = Items.get(a.id); if (!it) continue;
          const r = RARITY[it.rarity];
          const afford = (save.stones || 0) >= a.price;
          rows.push('<div class="shoprow' + (afford ? '' : ' poor') + '">' +
            '<div class="sr-main"><b style="color:' + r.color + '">' + it.name + '</b><i>' + (a.note || it.desc) + '</i></div>' +
            '<div class="sr-right"><button class="sr-btn buy" data-auc="' + it.id + '"' +
            (afford ? '' : ' data-cant="1"') + '>' + a.price + '</button></div></div>');
        }
      }
      for (const s of stock) {
        if (s.cat !== G.shopCat) continue;
        const it = Items.get(s.id); if (!it) continue;
        const r = RARITY[it.rarity], own = save.inventory[s.id] || 0;
        const okReq = lv >= reqLv(it.req || 1);
        const afford = (save.stones || 0) >= s.price && okReq;
        // 功法是一次性的：学过的门不再报价，免得让人对着已在本上的口诀反复掏钱
        const learned = !!(it.teach && (cultObj().skills || {})[it.teach]);
        const buyable = afford && !learned;
        const tag = it.slot ? '<span class="sr-gear">装备</span>' : '';
        rows.push('<div class="shoprow' + (buyable ? '' : ' poor') + '">' +
          '<div class="sr-main"><b style="color:' + r.color + '">' + it.name + tag + '</b><i>' + r.name + ' · ' + it.desc + (own ? '　已有 ' + own : '') + '</i></div>' +
          '<div class="sr-right">' + (okReq ? '' : '<span class="gr-need">需' + realmName(it.req) + '</span>') +
          // 不设 disabled：disabled 会把点击整个吞掉，连「灵石不足」都说不出口。
          // 也不用 aria-disabled：那是「控件不可操作」的语义，而这里恰恰要它可操作 —— 点一下才知道差什么。
          // 用 data-cant 只承载样式，语义交给点击后的提示。
          '<button class="sr-btn ' + (learned ? 'ghost' : 'buy') + '" data-buy="' + s.id + '"' +
          (buyable ? '' : ' data-cant="1"') + '>' + (learned ? '已学' : s.price) + '</button></div></div>');
      }
      // 丹药柜有货了（黄龙丹/金髓丸/养精丹/昊元丹 这些原著里真在坊市流通的），
      // 空柜时只留一句通用说明，不再断言「坊市不售丹」—— 原著里明明卖。
      if (!rows.length) {
        rows.push(G.shopCat === 'dan'
          ? '<div class="shopempty">此柜今日无货。<br>筑基丹这类大门派把持的东西，坊市上从来见不到一颗 —— 只能自家开炉。</div>'
          : '<div class="shopempty">此柜今日无货。</div>');
      }
    }
    elShopList.innerHTML = rarize(rows.join(''));
  }
  function isEquipped(id) { for (const k in save.equip) if (save.equip[k] === id) return true; return false; }
  function equippedCountOf(id) { let n = 0; for (const k in save.equip) if (save.equip[k] === id) n++; return n; }
  // 能卖 / 能拆的数量 = 袋中数量 − 正佩在身上的那件
  function sellableCount(id) { return Math.max(0, (save.inventory[id] || 0) - equippedCountOf(id)); }
  function buyItem(id) {
    // 拍卖品不在常备货架上，按当前坊市挂的拍卖单取价
    let s = SHOP_STOCK.find(x => x.id === id);
    if (!s && G.map && G.map.auction) s = G.map.auction.find(x => x.id === id);
    const it = Items.get(id);
    if (!it) { notify('架上已无此物'); Sfx.warn(); return; }
    if (!s) { notify('此处不卖这件'); Sfx.warn(); return; }
    const lv = Math.max(save.cultivate.level || 1, save.best.level || 1);
    // 提示按「玩家最该先知道的那条」排：已学过 → 境界 → 灵石
    // 这三句原先都有，但按钮是 disabled，浏览器根本不发点击事件，于是全成了死代码。
    if (it.teach && ((cultObj().skills || {})[it.teach] || (save.inventory[it.id] || 0) > 0)) {
      notify('这门已在册 · 去洞府「功法」页研习 / 重学');
      Sfx.warn(); return;
    }
    if (it.req && lv < reqLv(it.req)) { notify('境界不足 · 需' + realmName(it.req)); Sfx.warn(); return; }
    if ((save.stones || 0) < s.price) {
      notify('灵石不足 · 还差 ' + (s.price - (save.stones || 0)));
      Sfx.warn(); return;
    }
    // 法诀买回去是「手册」：入储物袋，去洞府「功法」页点「学习」才习得（书留架上，被清可重学）
    if (it.teach) {
      save.stones -= s.price;
      addToBag(it, { silent: true });
      writeSave(); renderShop(); refreshTitle();
      notify('买入 · ' + it.name + '（储物袋 · 至洞府「功法」研习）');
      Sfx.buff();
      return;
    }
    save.stones -= s.price;
    addToBag(it, {});
    if (it.slot) notify('买入 · ' + it.name + '（至洞府佩上）');
    else notify('买入 · ' + it.name);
    writeSave();
    Sfx.buff();
    renderShop();
    refreshTitle();
  }
  function sellItem(id, all) {
    const it = Items.get(id);
    if (!it) return;
    if (it.unique) { notify('此物有旧主 · 卖不得'); Sfx.warn(); return; }
    const free = sellableCount(id);
    const k = all ? free : Math.min(1, free);
    if (k <= 0) { notify('此物正佩在身上 · 先卸下再卖'); Sfx.warn(); return; }
    const price = sellPriceOf(it) * k;
    save.inventory[id] -= k;
    if (save.inventory[id] <= 0) delete save.inventory[id];
    save.totalItems = Math.max(0, (save.totalItems || 0) - k);
    save.stones = (save.stones || 0) + price;
    writeSave();
    Sfx.gem();
    notify('卖出 · ' + it.name + (k > 1 ? ' ×' + k : '') + '　+' + price + ' 灵石');
    if (G.state === 'shop') renderShop(); else if (G.state === 'cave') renderCave();
    refreshTitle();
  }
  // 一键卖出材料：把储物袋里所有可卖之料（非装备、非仅此一件）一次清空换灵石
  function sellAllMaterials() {
    const toSell = [];
    for (const id of Object.keys(save.inventory)) {
      const n = save.inventory[id] || 0; if (n <= 0) continue;
      const it = Items.get(id); if (!it || !it.mat || it.unique) continue;
      const k = sellableCount(id); if (k <= 0) continue;
      toSell.push({ it, k });
    }
    if (!toSell.length) { notify('没有可卖的材料'); Sfx.warn(); return; }
    let total = 0, count = 0, kinds = 0;
    for (const { it, k } of toSell) {
      total += sellPriceOf(it) * k; count += k; kinds++;
      save.inventory[it.id] -= k;
      if (save.inventory[it.id] <= 0) delete save.inventory[it.id];
      save.totalItems = Math.max(0, (save.totalItems || 0) - k);
    }
    save.stones = (save.stones || 0) + total;
    writeSave(); Sfx.gem();
    notify('卖出材料 ' + kinds + ' 种 ' + count + ' 件　+' + total + ' 灵石');
    // 哪块面板正亮着就刷哪块——不依赖 G.state（坊市进场剧情期间 state 仍是 dialog，但面板已展开）
    if (elShop && elShop.style.display === 'flex') renderShop();
    else if (elCave && elCave.style.display === 'flex') renderCave();
    refreshTitle();
  }
  // 分解：重复的、用不上的装备拆回材料
  function decomposeItem(id, all) {
    const it = Items.get(id);
    if (!it) return;
    if (!it.slot) { notify('此物拆不得'); Sfx.warn(); return; }
    if (it.unique) { notify('此物有旧主 · 拆不得'); Sfx.warn(); return; }
    const free = sellableCount(id);
    const k = all ? free : Math.min(1, free);
    if (k <= 0) { notify('正佩在身上的那件拆不得'); Sfx.warn(); return; }
    const got = {};
    for (let i = 0; i < k; i++) for (const mm of decomposeOf(it)) got[mm[0]] = (got[mm[0]] || 0) + mm[1];
    save.inventory[id] -= k;
    if (save.inventory[id] <= 0) delete save.inventory[id];
    save.totalItems = Math.max(0, (save.totalItems || 0) - k);
    const names = [];
    for (const mid in got) {
      const mi = Items.get(mid);
      save.inventory[mid] = (save.inventory[mid] || 0) + got[mid];
      save.totalItems = (save.totalItems || 0) + got[mid];
      names.push((mi ? mi.name : mid) + '×' + got[mid]);
      if (mi) itemToast(mi);
    }
    writeSave(); Sfx.buff();
    notify('拆解 · ' + it.name + (k > 1 ? ' ×' + k : '') + ' → ' + names.join(' '));
    if (G.state === 'cave') renderCave(); else if (G.state === 'shop') renderShop();
    refreshTitle();
  }

  // ---------- 洞府操作 ----------
  function curCultLevel() { return Math.max(save.cultivate.level || 1, save.best.level || 1); }
  function syncBestLevel() {
    if ((save.cultivate.level || 1) > (save.best.level || 1)) save.best.level = save.cultivate.level;
  }
  function equipGear(id) {
    const it = Items.get(id); if (!it || !it.slot) return;
    const lv = curCultLevel();
    if (it.req && lv < reqLv(it.req)) { notify('境界不足 · 需' + realmName(it.req)); Sfx.warn(); return; }
    if ((save.inventory[id] || 0) <= 0) { notify('储物袋里没有此物'); return; }
    save.equip[it.slot] = id;
    writeSave(); Sfx.buff();
    notify('佩上 · ' + it.name);
    if (G.player) { G.gear = gearBonus(); recalcMaxhp(); }
    applyHeroSprite();
    renderCave();
  }
  function unequipSlot(slot) {
    if (!slot || !save.equip[slot]) return;
    const it = Items.get(save.equip[slot]);
    save.equip[slot] = null;
    writeSave(); Sfx.gem();
    notify('卸下 · ' + (it ? it.name : ''));
    if (G.player) { G.gear = gearBonus(); recalcMaxhp(); }
    applyHeroSprite();
    renderCave();
  }
  // 有没有这张丹方：没有方子，炉子不认这味药（原著里丹方是要「得到」的）
  function hasFormula(r) {
    if (!r || !r.book) return true;
    return (save.inventory[r.book] || 0) > 0;
  }
  // ---------------- 炼丹成功率（按原著设定） ----------------
  // 原著口径（第 x 卷「筑基丹」一节）：就是当世最盛名的几位炼丹宗师亲自出手，
  // 成丹的概率也不会太高，约只有一半；而且炼的还得是他们最拿手的那味丹。
  // 另：炼丹次数越多，成丹几率越大；地火比先天真火成丹率高许多（同一节）。
  // 所以：丹方基准率（data.rate，扮「丹师火候」）+ 熟练加成（炼得越多越高）+ 地火加成（洞府药炉）
  // 三者相加，但总封顶五成半——再熟的手也不该把丹炉当成聚宝盆。
  const ALCHEMY_CAP = 0.55;
  const ALCHEMY_FIRE = 0.04;      // 洞府引地火／药炉，比野修真火稳
  function alchemyCount() { return (save.alchemy && save.alchemy.n) || 0; }
  function alchemyProf() { return Math.min(0.12, alchemyCount() * 0.004); }   // 每开一炉 +0.4%，至多 +12%
  function craftRateOf(r) {
    const base = (typeof r.rate === 'number') ? r.rate : 0.85;
    if (r.kind !== 'alchemy') return base;                 // 炼器／制符另有一套火候，不并进这套
    return Math.min(ALCHEMY_CAP, base + alchemyProf() + ALCHEMY_FIRE);
  }
  function craftRecipe(rid) {
    const r = Recipes.get(rid), c = CAVES[G.caveId];
    if (!r || !c || c.crafts.indexOf(r.kind) < 0) return;
    const lv = curCultLevel();
    if (!hasFormula(r)) { notify('缺丹方 · 这味药炉子不认得'); Sfx.warn(); return; }
    if (lv < reqLv(r.req || 1)) { notify('境界不足 · 需' + realmName(r.req)); Sfx.warn(); return; }
    if ((save.stones || 0) < r.cost) { notify('灵石不足'); Sfx.warn(); return; }
    for (const m of r.mats) if ((save.inventory[m[0]] || 0) < m[1]) { notify('材料不足 · ' + ((Items.get(m[0]) || {}).name || m[0])); return; }
    save.stones -= r.cost;
    for (const m of r.mats) {
      save.inventory[m[0]] -= m[1];
      if (save.inventory[m[0]] <= 0) delete save.inventory[m[0]];
      save.totalItems = Math.max(0, (save.totalItems || 1) - m[1]);
    }
    // 火候不会每次都听话。材料进了炉，出不出得来是另一回事 ——
    // 这才是「必须炼制」的分量：筑基丹这种，宗师也只有几成把握。
    const rate = craftRateOf(r);
    if (r.kind === 'alchemy') { save.alchemy = save.alchemy || { n: 0 }; save.alchemy.n = (save.alchemy.n || 0) + 1; }
    if (Math.random() >= rate) {
      const back = Math.round(r.cost * 0.5);
      save.stones += back;
      writeSave();
      Sfx.warn();
      notify('炸炉 · ' + r.name + '废了' + (back ? '（退回灵石 ' + back + '）' : ''));
      renderCave();
      refreshTitle();
      return;
    }
    const out = Items.get(r.out);
    let made = 0;
    if (out) for (let i = 0; i < (r.outN || 1); i++) if (addToBag(out, { silent: true })) made++;
    writeSave();
    if (!made) {
      notify('此物只此一件 · 不必再炼');
      Sfx.warn(); renderCave(); return;
    }
    Sfx.buff(); Sfx.levelup();
    notify('炼成 · ' + r.name + (made > 1 ? ' ×' + made : ''));
    if (out) itemToast(out);
    renderCave();
  }
  function addCultivateXp(amount) {
    if (!save.cultivate) save.cultivate = { level: 1, xp: 0, skills: {} };
    const c = save.cultivate;
    c.xp = (c.xp || 0) + amount;
    let lv = c.level || 1;
    let guard = 0;
    // 这两道「卡在关口」信号只代表上一次灌修为的结果；本次重新算，避免残留旧值误导 UI / 调试口
    G.minorPending = null;
    G.breakPending = null;
    // 上界（灵界/仙界）的境界层全在 150 以上：炼虚150 → 合体200 → 大乘260 → 渡劫330 → 真仙420
    //   → 金仙460 → 太乙520 → 大罗580 → 道祖640。
    // 早先此处置死「lv < 150」，炼虚初期(150)之后修为便再不进一分（静修/战斗经验全白攒），
    // 而合体关要求「修为达 lv-1 = 199」，于是永远堵在 150 —— 后续整条上界主线（天渊城来客起）都推不动。
    // 故上限改到最高境界 640，各道大境界门仍由下方 breakReqFor(lv+1) 卡住，不会跳级。
    while (lv < 640 && guard++ < 1000) {
      const need = xpNeed(lv);
      if (c.xp < need) break;
      // 大境界门：丹药材料剧情齐了也得回洞府「进阶」冲关，打坐/遇敌过不去
      const blk = breakReqFor(lv + 1);
      if (blk) { c.xp = Math.min(c.xp, need - 1); G.breakPending = blk; break; }
      // 小境界门（原著点名处）：物事没备齐就顶在关口
      const mn = minorReqFor(lv + 1);
      if (mn && minorHave(mn) <= 0) { c.xp = Math.min(c.xp, need - 1); G.minorPending = mn; break; }
      if (mn) payMinor(mn);
      c.xp -= need; lv++;
    }
    c.level = lv;
    syncBestLevel();
    clearWoundedIfDone();
    return lv;
  }
  function doRest(times) {
    const c = CAVES[G.caveId]; if (!c) return;
    let n = 0, gated = false;
    for (let i = 0; i < times; i++) {
      const lv = save.cultivate.level || 1;
      if (lv >= c.capLevel) break;
      if ((save.stones || 0) < c.restStone) break;
      save.stones -= c.restStone;
      addCultivateXp(Math.max(1, Math.round(xpNeed(lv) * c.restXp)));
      n++;
      // 撞上大境界门：修为顶在门口，再坐也是白烧灵石 —— 立刻停下，催他去「进阶」页
      if ((save.cultivate.level || 1) === lv && (save.cultivate.xp || 0) >= xpNeed(lv) - 1) { gated = true; break; }
      // 筑基后掌天瓶日产绿液 —— 前提是瓶子在手上（七玄门那一趟就该拿到了）
      const hasBottle = (save.inventory['gupu'] || 0) > 0 || (save.inventory['zhangtian'] || 0) > 0;
      if (lv >= 36 && hasBottle) save.greenLiquid = (save.greenLiquid || 0) + 1;
    }
    if (n) { writeSave(); }
    if (gated) {
      const nextLv = (save.cultivate.level || 1) + 1;
      const mn = minorReqFor(nextLv);
      if (mn && minorHave(mn) <= 0) {
        const mi = Items.get(mn.item);
        notify('修为已至 ' + mn.realm + ' 关口 · 须服「' + (mi ? mi.name : mn.item) + '」');
      } else {
        notify('修为已至瓶颈 · 回「进阶」页备料冲关');
      }
      Sfx.warn();
    } else if (!n) {
      const lv = save.cultivate.level || 1;
      notify(lv >= c.capLevel ? '此地灵气已尽，须往更远处去' : '灵石不足');
      Sfx.warn();
    } else {
      Sfx.levelup();
      notify('闭关 ' + n + ' 次　今在 ' + realmName(save.cultivate.level));
    }
    renderCave();
    refreshTitle();
  }

  // ---------- 输入 ----------
  const keys = { left: false, right: false, up: false, down: false };
  let jx = 0, jy = 0; const joy = { active: false, id: -1, ox: 0, oy: 0 };
  window.addEventListener('keydown', e => {
    // 飞鸽传书、房间名里打字时，数字该进输入框，不能顺手把丹药吃了
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keys.left = true;
    else if (k === 'arrowright' || k === 'd') keys.right = true;
    else if (k === 'arrowup' || k === 'w') keys.up = true;
    else if (k === 'arrowdown' || k === 's') keys.down = true;
    else if (k === '1' || k === '2' || k === '3') {
      // 战斗快捷栏：按 1/2/3 用第 1/2/3 格（小键盘同键位）
      if (G.state === 'play' || G.state === 'dialog') { e.preventDefault(); useQuick(+k - 1); }
    }
    else if (k === ' ' || k === 'spacebar' || k === 'shift') {
      // 闪身：空格或 Shift，桌面端不用去点右下角那颗按钮
      if (G.state === 'play' || G.state === 'dialog') { e.preventDefault(); dashPlayer(); }
    }
    else if (k === 'escape' || k === 'p') { if (G.state === 'play') doPause(); else if (G.state === 'pause') doResume(); }
  });
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keys.left = false;
    else if (k === 'arrowright' || k === 'd') keys.right = false;
    else if (k === 'arrowup' || k === 'w') keys.up = false;
    else if (k === 'arrowdown' || k === 's') keys.down = false;
  });
  cv.addEventListener('touchstart', e => {
    if (G.state !== 'play') return;
    const t = e.changedTouches[0]; joy.id = t.identifier; joy.ox = t.clientX; joy.oy = t.clientY; joy.active = true; jx = 0; jy = 0; e.preventDefault();
  }, { passive: false });
  cv.addEventListener('touchmove', e => {
    if (!joy.active) return;
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) { let dx = t.clientX - joy.ox, dy = t.clientY - joy.oy; const m = Math.hypot(dx, dy); const R = 60; if (m > R) { dx = dx / m * R; dy = dy / m * R; } jx = dx / R; jy = dy / R; }
    }
    e.preventDefault();
  }, { passive: false });
  function endTouch(e) { for (const t of e.changedTouches) if (t.identifier === joy.id) { joy.active = false; jx = 0; jy = 0; } }
  cv.addEventListener('touchend', endTouch);
  cv.addEventListener('touchcancel', endTouch);

  // ---------- DOM 引用 ----------
  const elTitle = document.getElementById('title');
  const elHud = document.getElementById('hud');
  const elHpfill = document.getElementById('hpfill');
  const elXpfill = document.getElementById('xpfill');
  const elHpval = document.getElementById('hpval');
  const elXpval = document.getElementById('xpval');
  const elLevel = document.getElementById('level');
  const elTime = document.getElementById('time');
  const elKills = document.getElementById('kills');
  const elStones = document.getElementById('stones');
  const elMapName = document.getElementById('mapName');
  const elTopbar = document.getElementById('topbar');
  const elCombo = document.getElementById('combo');
  const elSkillrow = document.getElementById('skillrow');
  const elBuffrow = document.getElementById('buffrow');
  const elQuick = document.getElementById('quickbar');
  const elQuickBtns = elQuick ? Array.prototype.slice.call(elQuick.querySelectorAll('.qb')) : [];
  // 战斗右侧三格：按下即放。之前这三颗按钮只画了图标，一个监听都没挂，
  // 所以丹药符箓摆上去点不出任何反应 —— 这里把「点」和「按 1/2/3」都接上。
  elQuickBtns.forEach((btn, i) => {
    btn.setAttribute('data-key', i + 1);   // 角上的键位号
    btn.addEventListener('pointerdown', ev => {
      ev.preventDefault(); ev.stopPropagation();
      useQuick(i);
    });
    // 键盘 Enter / 读屏软件走这条；pointerdown 已经处理过的，这里不再重复触发
    btn.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); });
  });
  const elPauseBtn = document.getElementById('pauseBtn');
  const elAutoBtn = document.getElementById('autoBtn');
  const elBosswrap = document.getElementById('bosswrap');
  const elBossname = document.getElementById('bossname');
  const elBossfill = document.getElementById('bossfill');
  const elBossbar = document.getElementById('bossbar');
  const elBanner = document.getElementById('banner');
  const elDialog = document.getElementById('dialog');
  const elDialogSpeaker = document.getElementById('dialogSpeaker');
  const elDialogFace = document.getElementById('dialogFace');
  const elFaceCv = document.getElementById('faceCv');
  const elDialogBox = document.getElementById('dialogbox');
  // 说话人 → 精灵。没登记的人（旁白、路人、无名弟子）就不出像，框照旧。
  // 名字必须和 story/encounters 里写的那个字符串一字不差 —— 差一个字像就没了。
  const NPC_FACE = {
    '韩立': 'hanli', '墨大夫': 'mo2', '厉飞雨': 'lifeiyu', '张铁': 'zhangtie',
    '李化元': 'lihuayuan', '南宫婉': 'nangongwan', '紫灵': 'ziling', '元瑶': 'yuanyao',
    '大衍神君': 'dayan', '陆师兄': 'luxiong', '林师兄': 'linmo', '青颜真人': 'qingyan',
    '热火仙尊': 'rehuo', '景阳上人': 'jingyang', '蟹道人': 'xiedaoren',
    '金童': 'jintong', '柳乐儿': 'liuleer', '银月': 'yinyuepet', '啼魂': 'tihun',
    '王蝉': 'wangchan', '金青': 'jinqing', '柳岐老祖': 'liuqi',
    '寒骊上人': 'hanlishang', '陇家老祖': 'longjia', '付家家主': 'fujia',
    '青龙上人': 'qinglong', '力尊者': 'lizunzhe', '血光圣祖': 'xueguang',
    '兽尊殿魔尊': 'shouzun', '元刹圣祖分魂': 'yuansha', '守阵古修遗骸': 'guxiuhai',
    '噬炎': 'shiyan', '噬炎残影': 'shiyan', '通灵傀儡': 'guanghan',
    // 第二档具名首领：只挂真正在对白里说话的，没台词的挂了也没有意义
    '元魇圣祖': 'yuanyan', '元魇始祖': 'yuanyan', '元魇': 'yuanyan',
    '宝花圣祖': 'baohua', '宝花': 'baohua',
    '黄元子': 'huangyuanzi', '不灭天尊': 'bumietianzun',
    '银翅夜叉': 'yinchiyecha', '敖啸': 'aoxiao', '敖啸老祖': 'aoxiao',
    '至阳上人': 'zhiyang', '柳自在': 'liuzizai', '鬼灵子': 'guilingzi',
    '陆夫人': 'lufuren', '马良': 'maliang', '妙鹤真人': 'miaohe',
    '冷焰老祖': 'lengyan', '黑天魔祖': 'heitian',
    '金光上人': 'jinguang', '凶司王': 'xiongsiwang', '吞天圣祖': 'tuntian',
    '萧晋寒': 'xiaojinhan', '鬼木': 'guimu', '东方白': 'dongfangbai',
    '奇摩子': 'qimozi', '妙法仙尊': 'miaofa', '东离虎': 'donglihu',
    '古或今': 'guhuojin', '骨皇': 'guhuang', '百目天鬼': 'baimu',
    // 第三档兽形：只补真正有台词的。魔猿全场没说话；「螟虫之将」是另一只，别错挂到虫母身上
    '修罗蛛': 'xiuluo', '修罗蛛族母': 'xiuluo', '螟虫之母': 'mingchong',
    // 第四档：全库扫说话人扫出来的「有名字、有台词、原著还写了长相，却一直没脸」的十位。
    // 判断依据在 sprites.js 各自的注释里，一句一句对过原著。
    '轮回殿主': 'lunhui', '蛟三': 'jiaosan', '甘九真': 'ganjiuzhen',
    '寒丘': 'hanqiu', '陈如烟': 'chenruyan', '文仲': 'wenzhong',
    '青元子': 'qingyuanzi', '刘靖': 'liujing', '风希': 'fengxi', '凌玉灵': 'lingyuling',
    '老丈': 'hermit', '老汉': 'hermit', '散修': 'rogue', '魔修': 'mo',
    // ---- 第五档：无名职业的类型脸 ----
    // 这一档和前四档性质不同，必须说清楚，否则以后会被当成「某某人物的官方长相」引用：
    //   前四档是**个体肖像**（原著写了这个人长什么样，我照着画）；
    //   这一档是**类型骨架**（这个人无名，或原著一句外貌都没写，所以只给「他是什么身份」）。
    //   也就是说：金长老在这张表里得到的是「一个长老」，不是「金长老的脸」——
    //   他的长相在这套美术里仍然是留白的，由读者自己想。
    //   不给脸同样不对：宫殿门口的守卫在对话框里顶着一个魔修的白发，读到那句就出戏。
    //
    // 守卫甲 —— 原著「身穿鲜亮铠甲的侍卫，手持长矛，肃穆而立」「穿着厚厚金色铠甲，只露出半张脸」
    '大修士护卫': 'guard', '白光守卫': 'guard', '广寒界守卫': 'guard',
    '凶司王亲卫': 'guard', '始祖魔卫': 'guard', '陇家死士': 'guard',
    '金源仙宫·侍卫': 'guard', '九元观·影卫': 'guard', '青冥卫队正': 'guard',
    // 道兵 —— 原著「紫纹金甲道兵」「瘦如麻杆的金甲道兵」
    '岁月殿·金甲道兵': 'daobing',
    // 鬼将 —— 原著「白面鬼将」「十殿阎罗的红袍鬼将」
    '鬼将': 'guijiang', '阴雾鬼将': 'guijiang', '鬼阵·鬼兵': 'guijiang',
    '阴灵': 'guijiang',
    // 执事 —— 原著「执事长老令」「一块赤色令牌」，身份符号就是那块令牌
    '魔道执事': 'zhishi', '掩月宗执事': 'zhishi', '鬼灵门·执事': 'zhishi',
    '天东商号管事': 'zhishi', '冷焰宗·护法': 'zhishi', '烛龙道·长老': 'zhishi',
    '魔道长老': 'zhishi', '阴罗宗四长老': 'zhishi', '火阳族长老': 'zhishi',
    '九幽族长老': 'zhishi', '谷长老': 'zhishi', '金长老': 'zhishi',
    '九元观随从': 'zhishi', '陆师兄的随从': 'zhishi', '大乘随从': 'zhishi',
    '大乘修士': 'zhishi', '第一大乘': 'zhishi', '第一大乘护法': 'zhishi',
    '厄脍城主': 'zhishi', '慕兰法士首领': 'zhishi', '海王族祭师': 'zhishi',
    '圣岛使者': 'zhishi', '谷家使者': 'zhishi', '天庭·仙使': 'zhishi',
    // 傀儡 / 木族 / 兽 —— 复用已有骨架，不新画
    '守阵傀儡': 'kui', '天鼎宫傀儡': 'kui', '土皇钉傀儡': 'kui',
    '千竹教·傀儡': 'kui', '木族守卫': 'woodling', '化木为灵·巨人': 'woodling',
    '天澜圣兽': 'beast4big', '魔金魔兽': 'beast4big', '地渊凶兽': 'beast4big',
    '守墓阴兽': 'beast4low', '地渊阴兽': 'beast4low',
    '六级妖兽·婴鲤兽': 'beast4low', '螟虫之将': 'beast4',
    '精英·狼王': 'wolf',
    // 炼尸 / 化形妖 / 夜叉
    '大墟炼尸': 'ghoul', '炼尸·铁奴': 'ghoul',
    '化形妖': 'yecha', '血侍·冰妖': 'yecha', '夜叉族战将': 'yecha',
    // 女修 / 世家 / 散修 / 老者 —— 本来就有对口的通用图，只是从来没登记过
    '樱仙子': 'nvxiu', '冰魄仙子': 'nvxiu',
    '付家修士': 'neimen', '世家子弟': 'neimen',
    '玄骨上人': 'mo', '无生道人': 'mo',
    '天南修士': 'rogue', '城中修士': 'rogue', '肖姓道友': 'rogue',
    '摊主': 'rogue', '城斗魁首': 'rogue', '黄元子门人': 'disciple',
    '谷家老者': 'hermit',
    // ---- 第六档：具名、但名字本身写明了类别的 ----
    // 这一档只收「名字里的字本身就是分类词」的（魔/尸/妖/兽/僧/凤/狼/虫/姐妹/夫人/
    //   剑修/仙师/元婴/先锋/帮众），不涉及对该角色长相或性别的任何推断。
    //   纯人名（器灵子、海大少、南陇侯、紫杉、高升…）一律不登记 ——
    //   那几个人的性别与来路我核不实，随手挂一张脸就是编造。
    //   他们说话时不出口像，这是有意的缺口，不是漏。
    '魔光': 'mo', '天外魔君': 'mo', '魔主': 'mo', '极阴祖师': 'mo',
    '魔族魔修': 'mo', '魔君化影': 'mo', '天魔': 'mo',
    '尸魈': 'ghoul', '老僧': 'hermit', '天象尊者': 'hermit',
    '头狼': 'wolf', '野狼帮好手': 'bandit', '火岁萤虫': 'beast4low',
    '万灵血龙': 'beast4big', '冰凤': 'bingfeng', '木魁': 'woodling',
    '阴天虎': 'yecha', '阴天鹿': 'yecha', '阴天熊': 'yecha', '阴天猿': 'yecha',
    '妖族先锋': 'yecha', '古剑门剑修': 'disciple', '突兀人仙师': 'zhishi',
    '叶家元婴': 'zhishi', '秦氏姐妹': 'nvxiu', '严夫人': 'nvxiu',
    '鹄骨夫人': 'nvxiu',
    // 两处是同一人的戏称：厉飞雨与韩立自己
    '杀人放火厉飞雨': 'lifeiyu', '救苦救难韩天尊': 'hanli'
  };
  let faceWho = null;   // 当前头像对应的人，切皮时要按新皮肤重画
  function drawFace(who) {
    faceWho = who || null;
    const spr = faceWho ? Sprites[NPC_FACE[faceWho]] : null;
    if (!elDialogFace || !elFaceCv || !elDialogBox) return;
    if (!spr) { elDialogBox.classList.remove('has-face'); return; }
    elDialogBox.classList.add('has-face');
    // 精灵有 12 宽也有 14 宽，canvas 尺寸跟着它走（CSS 只管放大，不管比例）
    if (elFaceCv.width !== spr.width || elFaceCv.height !== spr.height) {
      elFaceCv.width = spr.width; elFaceCv.height = spr.height;
    }
    const g = elFaceCv.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, elFaceCv.width, elFaceCv.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(spr, 0, 0);
  }
  const elDialogText = document.getElementById('dialogText');
  const elLevelup = document.getElementById('levelup');
  const elCards = document.getElementById('cards');
  const elPause = document.getElementById('pause');
  // 进阶面板
  const elBreak = document.getElementById('break');
  const elBreakBody = document.getElementById('breakBody');
  const elBreakGo = document.getElementById('breakGo');
  const elBreakLater = document.getElementById('breakLater');
  if (elBreakGo) elBreakGo.addEventListener('click', () => doBreakNow());
  if (elBreakLater) elBreakLater.addEventListener('click', () => { closeBreak(); if (G.state === 'play') last = performance.now(); });
  // 进阶道具行：点一下看「去哪取」（依原著）
  if (elBreakBody) {
    elBreakBody.addEventListener('click', (e) => {
      const row = e.target.closest && e.target.closest('.brk-row.click');
      if (row && row.getAttribute('data-item')) {
        e.stopPropagation();
        showItemHint(row.getAttribute('data-item'), row);
        return;
      }
      hideItemTip();
    });
    elBreakBody.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest && e.target.closest('.brk-row.click');
      if (row && row.getAttribute('data-item')) {
        e.preventDefault();
        showItemHint(row.getAttribute('data-item'), row);
      }
    });
  }
  const elPauseLeaveCoop = document.getElementById('pauseLeaveCoop');
  const elGameover = document.getElementById('gameover');
  const elGoTime = document.getElementById('goTime');
  const elGoKills = document.getElementById('goKills');
  const elGoLevel = document.getElementById('goLevel');
  const elGoToll = document.getElementById('goToll');
  const elVictory = document.getElementById('victory');
  const elVictoryTitle = document.getElementById('victoryTitle');
  const elVictoryDesc = document.getElementById('victoryDesc');
  const elVictoryStats = document.getElementById('vStats');
  const elVTime = document.getElementById('vTime');
  const elVKills = document.getElementById('vKills');
  const elVLevel = document.getElementById('vLevel');
  const elBest = document.getElementById('best');
  const elBag = document.getElementById('bag');
  const elItemToast = document.getElementById('itemToast');
  const elVictoryLoot = document.getElementById('victoryLoot');
  const elVictoryNext = document.getElementById('victoryNext');
  const elTitleBag = document.getElementById('titleBag');
  const elRebirth = document.getElementById('rebirth');
  const elRebirthText = document.getElementById('rebirthText');
  const elAutoSaveChk = document.getElementById('autoSaveChk');
  const elBossArt = document.getElementById('bossArt');   // 鬼谷水墨 · 异兽卷轴插画层
  const elBossSeal = document.getElementById('bossSeal'); // 鬼谷水墨 · boss 盖印
  const elManualSaveChk = document.getElementById('manualSaveChk');
  const elSaveNowBtn = document.getElementById('saveNowBtn');
  const elSaveHint = document.getElementById('saveHint');
  const elWorldmap = document.getElementById('worldmap');
  const elWmList = document.getElementById('wmList');
  const elWmCodex = document.getElementById('wmCodex');
  const elWanling = document.getElementById('wanling');
  const elWanlingList = document.getElementById('wanlingList');
  const elWlCollected = document.getElementById('wlCollected');
  const elWlRealm = document.getElementById('wlRealm');
  const elWanlingClose = document.getElementById('wanlingClose');
  const elWmStones = document.getElementById('wmStones');
  const elWmRealm = document.getElementById('wmRealm');
  const elWmBag = document.getElementById('wmBag');
  const elShop = document.getElementById('shop');
  const elShopList = document.getElementById('shopList');
  const elShopTitle = document.getElementById('shopTitle');
  const elShopSub = document.getElementById('shopSub');
  const elShopStones = document.getElementById('shopStones');
  const elShopBag = document.getElementById('shopBag');
  const elShopBuyTab = document.getElementById('shopBuyTab');
  const elShopSellTab = document.getElementById('shopSellTab');
  const elShopCats = document.getElementById('shopCats');
  const elEncBtn = document.getElementById('encBtn');
  const elDifficulty = document.getElementById('difficulty');
  const elDiffList = document.getElementById('diffList');
  const elPf = document.getElementById('prefight');
  const elPfName = document.getElementById('pfName');
  const elPfSub = document.getElementById('pfSub');
  const elPfSlots = document.getElementById('pfSlots');
  const elPfRealm = document.getElementById('pfRealm');
  const elPfBody = document.getElementById('pfBody');
  const elDiffMapName = document.getElementById('diffMapName');
  const elDiffMapSub = document.getElementById('diffMapSub');
  const elSweep = document.getElementById('sweep');
  const elSweepTitle = document.getElementById('sweepTitle');
  const elSweepDesc = document.getElementById('sweepDesc');
  const elSweepLoot = document.getElementById('sweepLoot');
  const elCave = document.getElementById('cave');
  const elCaveName = document.getElementById('caveName');
  const elCaveDesc = document.getElementById('caveDesc');
  const elCavePos = document.getElementById('cavePos');
  const elCaveStones = document.getElementById('caveStones');
  const elCaveRealm = document.getElementById('caveRealm');
  const elCaveBag = document.getElementById('caveBag');
  const elCaveTabs = document.getElementById('caveTabs');
  const elCaveBody = document.getElementById('caveBody');

  // ---------- 流程 ----------
  // 道陨的代价（Jerry 定）：灵石折半 —— 烧了就烧了，永不见还；
  // 道具也折半 —— 但随机掉的这一半记在账上，把这张图再打穿一次就能原物取回。
  // 逻辑分开写在两个函数里，是因为"灵石不退"和"道具可赎"本来就是两条不同的规则。
  const DEATH_STONE_K = 0.5, DEATH_ITEM_K = 0.5;
  function deathToll() {
    const mapId = G.mapId || save.mapId || 'qixuan';
    const out = { stones: 0, items: 0, kinds: 0 };
    // ① 灵石：折半上缴，记进 stoneBurned 只用于展示，绝不回补
    const st = Math.round(save.stones || 0);
    out.stones = Math.floor(st * DEATH_STONE_K);
    if (out.stones > 0) {
      save.stones = st - out.stones;
      save.stoneBurned = (save.stoneBurned || 0) + out.stones;
    }
    // ② 道具：随机抽走储物袋总量的一半（穿在装备槽上的四件不动 —— 身上的东西夺不走）
    const inv = save.inventory || {};
    const equipped = {};
    for (const k in (save.equip || {})) { const v = save.equip[k]; if (v) equipped[v] = 1; }
    const ids = Object.keys(inv).filter(id => (inv[id] || 0) > 0 && !equipped[id]);
    let total = 0;
    for (const id of ids) total += inv[id];
    let target = Math.floor(total * DEATH_ITEM_K);
    if (target > 0) {
      for (let i = ids.length - 1; i > 0; i--) {   // 洗牌：掉哪几味是随机的，不是固定扣
        const j = (Math.random() * (i + 1)) | 0;
        const t = ids[i]; ids[i] = ids[j]; ids[j] = t;
      }
      const lost = {};
      for (const id of ids) {
        if (target <= 0) break;
        const take = Math.min(inv[id], target);
        if (take <= 0) continue;
        inv[id] -= take; target -= take;
        lost[id] = (lost[id] || 0) + take;
        out.items += take; out.kinds++;
      }
      // 同一张图死过多次：失落之物累加，别互相覆盖（覆盖等于白丢前一次的）
      save.deathLost = save.deathLost || {};
      const prev = save.deathLost[mapId] || { items: {} };
      for (const id in lost) prev.items[id] = (prev.items[id] || 0) + lost[id];
      prev.t = Date.now();
      save.deathLost[mapId] = prev;
    }
    writeSave();
    return out;
  }
  // 再战通关：把这张图上一次道陨掉的道具原数还回来。灵石不在此列。
  function reclaimLost(mapId) {
    const dl = save.deathLost;
    if (!dl || !dl[mapId]) return null;
    const rec = dl[mapId];
    let n = 0, kinds = 0;
    for (const id in (rec.items || {})) {
      const c = rec.items[id] | 0;
      if (c <= 0) continue;
      save.inventory[id] = (save.inventory[id] || 0) + c;
      n += c; kinds++;
    }
    delete dl[mapId];
    return n > 0 ? { items: n, kinds: kinds } : null;
  }
  function gameOver() {
    if (G.state === 'gameover') return;
    G.state = 'gameover';
    // 双人联机：任一方倒下 = 共享败北，通知对方也结束
    if (G.coopRole && window.Coop && !G._endSent) { G._endSent = true; window.Coop.sendEnd('lose'); }
    syncCultivate();
    if (G.time > save.best.time) save.best.time = G.time;
    if (G.kills > save.best.kills) save.best.kills = G.kills;
    if (G.player.level > save.best.level) save.best.level = G.player.level;
    writeSave();
    Sfx.lose();
    elGoTime.textContent = fmtTime(G.time); elGoKills.textContent = G.kills; elGoLevel.textContent = realmName(G.player.level);
    // 道陨的代价：灵石折半（永退不回）＋ 道具折半（再战通关可取回）
    const toll = deathToll();
    if (elGoToll) {
      const stoneTxt = toll.stones > 0 ? ('灵石 <b>' + toll.stones + '</b> 已散于天地，追不回来') : '袋中无灵石可失';
      const itemTxt = toll.items > 0
        ? ('失落道具 <b>' + toll.items + '</b> 件（' + toll.kinds + ' 味）· 再战此图打穿，原物奉还')
        : '袋中无道具可失';
      elGoToll.innerHTML = '<span class="toll-h">道陨代价</span>' + stoneTxt + '<br>' + itemTxt;
    }
    elGameover.style.display = 'flex'; refreshTitle();
  }
  function doPause() {
    if (G.state !== 'play') return;
    G.state = 'pause'; elPause.style.display = 'flex';
    // 快捷栏压在对话层之上（战斗中要一直点得到），暂停时先收起来，别浮在菜单上
    if (elQuick) elQuick.classList.remove('on');
    // 联机时才给「离开房间」的出口，单人时别占位置
    if (elPauseLeaveCoop) elPauseLeaveCoop.style.display = (window.Net && window.Net.self()) ? '' : 'none';
    // 联机：我暂停 → 对方也一起停下（双方好说话）
    if (window.Coop) window.Coop.sendPause(true);
  }
  function doResume() {
    elPause.style.display = 'none'; G.state = 'play'; last = performance.now();
    renderQuickBar();
    if (window.Coop) window.Coop.sendPause(false);
  }
  // 联机：对方暂停 / 恢复 → 本地跟着停 / 继续（不回环广播，避免互相触发）
  function coopApplyPause(on) {
    if (on) {
      if (G.state === 'play' || G.state === 'down') {
        G.state = 'pause'; elPause.style.display = 'flex';
        if (elPauseLeaveCoop) elPauseLeaveCoop.style.display = (window.Net && window.Net.self()) ? '' : 'none';
      }
    } else {
      if (G.state === 'pause') { elPause.style.display = 'none'; G.state = 'play'; last = performance.now(); }
    }
  }
  function syncMute() { const t = Sfx.muted ? '🔇 音效：关' : '🔊 音效：开'; document.getElementById('muteTitle').textContent = t; document.getElementById('mutePause').textContent = t; }

  // 失败重来：跳过剧情、保留本局顿悟的一半、煞气进度留一半。
  // 原来的「重试此图」= 从剧情第一句重新读，再从头攒煞气，最快也要一分钟才回到刚才那一刀，
  // 代价全是「等待」而不是「难度」—— 玩家感受不到惩罚，只感到被浪费。
  // 现在失败变成「有进度的重试」：白打的那半局不算全白，但也不是满血复活。
  function retryMap() {
    const keep = G.insight && G.insight.skills ? JSON.parse(JSON.stringify(G.insight.skills)) : null;
    const keepSha = G.sha ? { v: G.sha.v || 0, done: G.sha.done || 0 } : null;
    const id = G.mapId || save.mapId || 'qixuan';
    const d = G.diff ? G.diff.id : (save.lastDiff || 'easy');
    elGameover.style.display = 'none';
    save.deaths = (save.deaths || 0) + 1;
    startMap(id, d);
    // startMap 已经把本局顿悟清干净了，这里回填一半
    if (keep) {
      const half = {};
      for (const k in keep) {
        const m = keep[k] || {}, o = {};
        for (const kk in m) o[kk] = m[kk] * 0.5;
        half[k] = o;
      }
      G.insight = { skills: half, n: 0, refine: 0 };
    }
    if (keepSha) { G.sha.done = Math.floor(keepSha.done / 2); G.sha.v = keepSha.v * 0.5; }
    // 剧情不再重放：读过一遍的人不需要再读
    let n = 0;
    const hop = () => {
      if (G.state === 'dialog') { let g = 0; while (G.state === 'dialog' && !G.dialogIsChoice && g++ < 80) advanceDialog(); }
      if (++n < 40 && G.state !== 'play') requestAnimationFrame(hop);
    };
    requestAnimationFrame(hop);
    banner('再战 · 前番顿悟留了一半');
    Sfx.buff();
  }

  document.getElementById('startBtn').addEventListener('click', openWorldMap);
  document.getElementById('goRetry').addEventListener('click', retryMap);
  document.getElementById('goBack').addEventListener('click', openWorldMap);
  document.getElementById('vRetry').addEventListener('click', () => startMap(G.mapId || save.mapId || 'qixuan'));
  document.getElementById('vBack').addEventListener('click', openWorldMap);
  document.getElementById('resumeBtn').addEventListener('click', doResume);
  document.getElementById('restartBtn').addEventListener('click', () => startMap(G.mapId || save.mapId || 'qixuan'));
  document.getElementById('pauseBack').addEventListener('click', () => { elPause.style.display = 'none'; openWorldMap(); });
  document.getElementById('wmClose').addEventListener('click', () => { hideAllOverlays(); G.state = 'title'; elTitle.style.display = 'flex'; refreshTitle(); });
  if (elWmCodex) elWmCodex.addEventListener('click', openWanling);
  if (elWanlingClose) elWanlingClose.addEventListener('click', openWorldMap);
  document.getElementById('shopClose').addEventListener('click', () => {
    const m = G.map;
    hideAllOverlays();
    if (m && m.type === 'market') { finishMap(m); }
    else openWorldMap();
  });
  // 际遇按钮（坊市 #encBtn / 洞府 data-enc）统一走代理
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('#encBtn, [data-enc]');
    if (!t) return;
    const id = t.getAttribute('data-enc');
    if (!id) return;
    const def = (window.ENCOUNTERS || []).find(e => e.id === id);
    if (def) menuEncounter(def);
  });
  // 灵石祭炼：点 HUD 上的灵石就能当场花钱变强（每局次数越多越贵）
  if (elStones) {
    elStones.style.cursor = 'pointer';
    elStones.addEventListener('click', () => {
      if (G.state !== 'play') return;
      openRefine();
    });
  }
  elDialog.addEventListener('click', () => { if (G.state === 'dialog') advanceDialog(); });
  elPauseBtn.addEventListener('click', () => { if (G.state === 'play') doPause(); });
  // 自动战斗：战斗中随时可开可关。开着的时候人不动，对白与选卡都自己走
  elAutoBtn.addEventListener('click', () => {
    if (elAutoBtn.style.display === 'none') return;
    setAuto(!G.autoOn);
  });
  // 联机：暂停菜单里给个「离开联机房间」，不用回标题就能断开（没连上时自动隐藏）
  if (elPauseLeaveCoop) {
    elPauseLeaveCoop.style.display = 'none';
    elPauseLeaveCoop.addEventListener('click', () => {
      if (window.Net) window.Net.leave();
      elPauseLeaveCoop.style.display = 'none';
    });
  }
  document.getElementById('muteTitle').addEventListener('click', () => { Sfx.toggle(); syncMute(); });
  document.getElementById('mutePause').addEventListener('click', () => { Sfx.toggle(); syncMute(); });
  // ---------- 外观皮肤：鎏金古卷 / 鬼谷水墨（存档记忆） ----------
  function applySkin(skin) {
    save.skin = (skin === 'guigu') ? 'guigu' : 'jin';
    FX_INK.on = (save.skin === 'guigu');   // 特效画笔墨化，与皮同步切换
    window.SKIN_INK = (save.skin === 'guigu');   // 精灵换墨版（sprites.js 的 Proxy 认这个开关）
    pxCache = null;                          // 视差层随皮重建（两皮各自一套）
    try { if (document.body) document.body.dataset.skin = save.skin; } catch (e) {}   // smoke 的 DOM 垫片没有 dataset
    const jin = document.getElementById('skinJin'), gg = document.getElementById('skinGuigu');
    if (jin) jin.classList.toggle('on', save.skin !== 'guigu');
    if (gg) gg.classList.toggle('on', save.skin === 'guigu');
    // 战斗中换皮：场地底纹按新皮肤重铺（滤镜/覆层由 CSS data-skin 自动接管）
    if (typeof buildGrass === 'function' && grassPat) buildGrass(buildGrass._bg);
    // 头像也要重画：Sprites 的 Proxy 已切到墨版/原版，但画进 canvas 的那一份还是旧像素，
    // 不重画就会「界面翻成纸了，头像还是彩色的」
    try { if (faceWho) drawFace(faceWho); } catch (e) {}
    writeSave();
  }
  const elSkinJin = document.getElementById('skinJin'), elSkinGuigu = document.getElementById('skinGuigu');
  if (elSkinJin) elSkinJin.addEventListener('click', () => { if (save.skin !== 'jin') { applySkin('jin'); Sfx.gem(); } });
  if (elSkinGuigu) elSkinGuigu.addEventListener('click', () => { if (save.skin !== 'guigu') { applySkin('guigu'); Sfx.gem(); } });
  applySkin(save.skin);   // 读档后按存档落皮（也覆盖老存档缺字段的情况）
  // 转世重修：先算出本次能炼出的余荫给玩家看，再确认
  function fmtRebirthVal(k, v) {
    if (k === 'maxhp') return '+' + Math.round(v);
    if (k === 'crit' || k === 'armor' || k === 'xpMul') return '+' + Math.round(v * 100) + '%';
    if (k === 'regen') return '+' + v.toFixed(1);
    return '+' + v.toFixed(2);
  }
  function openRebirth() {
    const p = rebirthPreview();
    const names = { maxhp: '生命', dmg: '伤害', atkSpd: '攻速', spd: '移速', regen: '回血', crit: '重击', armor: '减伤', pickup: '拾取', xpMul: '修为' };
    const bits = [];
    for (const k of REBIRTH_KEYS) {
      const v = (p.add[k] || 0) / REBIRTH_DIV;
      if (v > 1e-9) bits.push(names[k] + ' ' + fmtRebirthVal(k, v));
    }
    const lines = [];
    lines.push('本次可炼余荫（超出凡胎属性 × 1/81）：');
    lines.push(bits.length ? bits.join('　') : '（本世尚无超出凡胎的属性）');
    if (REBIRTH.cycles > 0) lines.push('累计余荫：已转 ' + REBIRTH.cycles + ' 世，已入属性面板');
    lines.push('功法、法器、灵石、洞府等，一律清零，从头再来');
    elRebirthText.innerHTML = lines.join('<br>');
    elRebirth.style.display = 'flex';
  }
  document.getElementById('rebirthBtn').addEventListener('click', openRebirth);
  document.getElementById('rebirthYes').addEventListener('click', () => { elRebirth.style.display = 'none'; doRebirth(); });
  document.getElementById('rebirthNo').addEventListener('click', () => { elRebirth.style.display = 'none'; });
  const fswBtn1 = document.getElementById('fullTitle');
  const fswBtn2 = document.getElementById('fullPause');
  if (fswBtn1) fswBtn1.addEventListener('click', toggleFullscreen);
  if (fswBtn2) fswBtn2.addEventListener('click', toggleFullscreen);

  if (elWmList) elWmList.addEventListener('click', e => {
    // 「详」章：展开 / 收起这张卡的详情（不改变进入逻辑 —— 点卡片其余位置照旧直接进）
    const inf = e.target.closest('[data-info]');
    if (inf) {
      e.stopPropagation();
      const iid = inf.getAttribute('data-info');
      G.wmOpen = G.wmOpen || {};
      G.wmOpen[iid] = !G.wmOpen[iid];
      renderWorldMap();
      return;
    }
    // 叠牌的展开 / 收起
    const tog = e.target.closest('[data-decktog]');
    if (tog) {
      const tid = tog.getAttribute('data-decktog');
      G.wmDeck = G.wmDeck || {};
      G.wmDeck[tid] = !G.wmDeck[tid];
      renderWorldMap();
      return;
    }
    const card = e.target.closest('.mapcard');
    if (!card) return;
    const id = card.getAttribute('data-map');
    const m = MAPS.find(x => x.id === id);
    if (!m) return;
    if (save.unlocked.indexOf(id) < 0) { notify('前图未了，此路不通'); Sfx.warn(); return; }
    // 卡片后面挂着支线牌（主线或已解锁支线下挂的都算）：先展开，展开之后点它才是进去
    {
      const deckSides = MAPS.filter(x => x.side && save.unlocked.indexOf(x.id) >= 0 && sideTriggerOf(x) === id);
      if (deckSides.length && !(G.wmDeck && G.wmDeck[id])) {
        G.wmDeck = G.wmDeck || {};
        G.wmDeck[id] = true;
        G.wmOpen = G.wmOpen || {};
        G.wmOpen[id] = true;   // 顺手把这张卡也展开，读到它自己的详情
        renderWorldMap();
        return;
      }
    }
    // 已成洞府：进去整备，而不是再走一遍剧情
    if (m.cave && save.caves.indexOf(m.cave) >= 0) { openCave(m.cave); return; }
    // 战斗图：先择难度
    if (m.type === 'combat' || m.type === 'boss') { openDiffPick(id); return; }
    startMap(id);
  });
  if (elDiffList) elDiffList.addEventListener('click', e => {
    // 扫荡按钮：先接住，别让它冒到 diffcard 上变成「入山」
    const sw = e.target.closest('[data-sweep]');
    if (sw) {
      e.stopPropagation();
      const id = G.diffPick;
      if (id) sweepMap(id, sw.getAttribute('data-sweep'));
      return;
    }
    const c = e.target.closest('.diffcard');
    if (!c) return;
    const d = c.getAttribute('data-diff');
    const id = G.diffPick;
    if (!id) return;
    beginMap(id, d);
  });
  // 扫荡结果面板：收下，回到难度面板（还想再扫一趟就再点一次）
  if (elSweep) elSweep.addEventListener('click', e => {
    if (e.target.closest('#sweepBack') || e.target === elSweep) {
      elSweep.style.display = 'none';
      // 只有「从难度面板点扫荡进来」的（state=sweep）收下之后才回难度面板。
      // 首页/世界图状态下误点到，就只是关掉 —— 以前这里无条件 state='diff' + 弹难度框，
      // 首屏又漏隐藏 #sweep，于是「进首页先看到扫荡、点一下就蹦出难度选择」。
      if (G.state === 'sweep') {
        G.state = 'diff';
        renderDiffPick();
        if (elDifficulty) elDifficulty.style.display = 'flex';
      }
    }
  });
  if (elPfBody) elPfBody.addEventListener('click', e => {
    // 点档名：展开 / 收起这一档
    const hd = e.target.closest('.pf-tier-hd');
    if (hd) {
      const box = hd.closest('[data-pftier]');
      const tid = box ? box.getAttribute('data-pftier') : null;
      if (tid) { G.pfExp = G.pfExp || {}; G.pfExp[tid] = !G.pfExp[tid]; renderPreFight(); }
      return;
    }
    const b = e.target.closest('button[data-pfskill]');
    if (!b) return;
    const sid = b.getAttribute('data-pfskill');
    if (equippedOf().indexOf(sid) >= 0) unequipSkill(sid); else equipSkill(sid);
    renderPreFight();
  });
  if (document.getElementById('pfGo')) document.getElementById('pfGo').addEventListener('click', () => {
    const pend = G.pf;
    save.pfLast = (cultObj().equipped || []).slice();   // 记住，下一张战斗图照此先运起
    writeSave();
    const id = pend ? pend.id : null, d = pend ? pend.diff : null;
    G.pf = null;
    if (id) startMap(id, d);
  });
  if (document.getElementById('pfClose')) document.getElementById('pfClose').addEventListener('click', openWorldMap);
  if (document.getElementById('diffClose')) document.getElementById('diffClose').addEventListener('click', openWorldMap);
  if (document.getElementById('caveClose')) document.getElementById('caveClose').addEventListener('click', openWorldMap);
  if (document.getElementById('caveStory')) document.getElementById('caveStory').addEventListener('click', () => {
    const c = CAVES[G.caveId]; if (!c) return;
    // 重温不能替玩家定难度：一律先弹难度面板，让人自己挑（以前直接按凡境进）
    openDiffPick(c.from);
  });
  if (elCaveTabs) elCaveTabs.addEventListener('click', e => {
    const b = e.target.closest('button[data-ctab]');
    if (!b) return;
    G.caveTab = b.getAttribute('data-ctab');
    renderCave();
  });
  if (elCaveBody) elCaveBody.addEventListener('click', e => {
    // 点到可点物件外的任何地方，先收「去哪取」提示卡（点物件时下面会重新弹）
    if (!e.target.closest('.brk-row.click') && !e.target.closest('.mat.clk')) hideItemTip();
    // 分组折叠：手风琴。点开一组，同页签其它组自动收起；
    // 再点同一组则收起（全收起来，只看目录）。
    // 这里直接切 class，不走 renderCave()：
    // 重绘会让滚动位置回到顶部 —— 在长列表里点靠下的组，等于白点。
    const fh = e.target.closest('button[data-fold-key]');
    if (fh) {
      const tab = fh.getAttribute('data-fold-tab') || G.caveTab;
      const key = fh.getAttribute('data-fold-key');
      if (!G.caveFold) G.caveFold = {};
      const willClose = (G.caveFold[tab] === key);
      G.caveFold[tab] = willClose ? '' : key;
      const mine = fh.closest('.fold');
      // 锚定组头：展开/收起会改变上方内容高度，不补偿的话点下去那行会跳走。
      // 先记下它在屏幕上的位置，切完类再把它挪回原处。
      const st0 = elCaveBody.scrollTop;
      const y0 = fh.getBoundingClientRect().top;
      for (const f of elCaveBody.querySelectorAll('.fold')) {
        f.classList.toggle('open', !willClose && f === mine);
      }
      // 折叠把内容高度一下子改掉，浏览器会顺手把滚动条推到新底部（滚动锚定 /
      // 按钮归位）。先拉回点击前的位置，y0 与 y1 才是同一基准；
      // 否则补偿量里混进浏览器自己的那次滚动，组头照样从手指底下跑掉。
      elCaveBody.scrollTop = st0;
      // flex 容器展开/收起后往往要两遍布局才稳定：读一次位置补一次，最多三轮。
      // 被 scrollTop 上下限钳住时（内容比视口还短）自动停手，不空转。
      for (let i = 0; i < 3; i++) {
        const d = fh.getBoundingClientRect().top - y0;
        if (Math.abs(d) < 1) break;
        const before = elCaveBody.scrollTop;
        elCaveBody.scrollTop += d;
        if (Math.abs(elCaveBody.scrollTop - before) < 0.5) break;
      }
      return;
    }
    // 按钮必须排在整行之前判：
    // 装备行的「拆」是嵌在 data-equip 那一行里头的 <button>，
    // 若先 closest('[data-equip]')，点「拆」会被整行抢走 —— 表现为「点拆却佩上了」。
    const dc = e.target.closest('button[data-decomp]');
    if (dc) { decomposeItem(dc.getAttribute('data-decomp')); return; }
    const da = e.target.closest('button[data-decompall]');
    if (da) { decomposeItem(da.getAttribute('data-decompall'), true); return; }
    const cr = e.target.closest('button[data-craft]');
    if (cr) { craftRecipe(cr.getAttribute('data-craft')); return; }
    // 炼丹/炼器/制符：点料名看「去哪取」（不挂问号，点字就出）
    const mt = e.target.closest('.mat.clk[data-mat]');
    if (mt) { showItemHint(mt.getAttribute('data-mat'), mt); return; }
    const rs = e.target.closest('button[data-rest]');
    if (rs) { doRest(parseInt(rs.getAttribute('data-rest'), 10) || 1); return; }
    // 药圃：按地块采收（百药园两块地、小寰岛、落云宗、芥子空间各自独立）
    const pg = e.target.closest('button[data-pickg]');
    if (pg) {
      const parts = String(pg.getAttribute('data-pickg')).split('|');
      pickGarden(CAVES[parts[0]], parts[1]);
      return;
    }
    // 整行类只认点在行体上的点击，行内按钮一律不穿透（第二道防线，防以后新增按钮再踩同一个坑）
    const eq = e.target.closest('[data-equip]');
    if (eq && !e.target.closest('button')) { equipGear(eq.getAttribute('data-equip')); return; }
    const sl = e.target.closest('[data-slot]');
    if (sl && !e.target.closest('button')) { unequipSlot(sl.getAttribute('data-slot')); return; }
    // 战斗快捷栏的装配按钮（renderCaveQuick 渲染于此面板内），必须在此处理
    const qs = e.target.closest('button[data-qset]');
    if (qs) {
      const p = String(qs.getAttribute('data-qset')).split('|');
      const i = +p[0];
      if (p[1] === 'none') setQuick(i, null, null); else setQuick(i, p[1], p[2]);
      renderCave();
      return;
    }
    // 功法 运起/卸下（renderCaveSkill 渲染于此面板内）
    const sb = e.target.closest('button[data-skill]');
    if (sb) {
      const id = sb.getAttribute('data-skill');
      if (equippedOf().indexOf(id) >= 0) unequipSkill(id); else equipSkill(id);
      renderCave();
      return;
    }
    // 未习法诀：洞府「功法」页点「学习」即化开此册，永久习得这门功法（手册随之用掉）
    // 注：研习只做「登记已习得」+ 消耗手册，不卡 minLv（minLv 只限运起/使用），避免「要学才能破境、要到破境后才能学」的循环死锁
    const lb = e.target.closest('button[data-learn]');
    if (lb) {
      const id = lb.getAttribute('data-learn');
      const it = Items.get(id);
      if (it && it.teach) {
        const d = window.skillById ? window.skillById(it.teach) : null;
        const had = save.inventory[id] || 0;
        const okLv = learnSkill(it.teach);
        if (okLv) {
          // 化开此册：消耗手中这本手册（用掉即永久习得，不留架上）
          if (had > 0) {
            save.inventory[id] = had - 1;
            if (save.inventory[id] <= 0) delete save.inventory[id];
            save.totalItems = Math.max(0, (save.totalItems || 1) - 1);
          }
          writeSave();
          notify('研习 · ' + (d ? d.name : it.teach) + '（化开此册 · 永久习得）');
        } else {
          notify('这门已学过');
        }
      }
      renderCave(); refreshTitle();
      return;
    }
    // 藏经：弃去已习的法诀手册（不再占用储物袋）
    const dbg = e.target.closest('button[data-discard]');
    if (dbg) {
      const id = dbg.getAttribute('data-discard');
      save.inventory[id] = (save.inventory[id] || 0) - 1;
      if (save.inventory[id] <= 0) delete save.inventory[id];
      save.totalItems = Math.max(0, (save.totalItems || 1) - 1);
      const it = Items.get(id);
      notify('弃去 · ' + (it ? it.name : id)); Sfx.warn();
      writeSave();
      renderCave(); refreshTitle();
      return;
    }
    // 灵宠：放出 / 收回
    const pb = e.target.closest('button[data-pet]');
    if (pb) { setPet(pb.getAttribute('data-pet')); return; }
    // 灵宠：放生
    const rl = e.target.closest('button[data-release]');
    if (rl) {
      const id = rl.getAttribute('data-release');
      const d = petDefOf(id);
      releasePet(id);
      notify((d ? d.name : '灵宠') + ' 已放生'); Sfx.warn();
      renderCave(); refreshTitle();
      return;
    }
    // 卵：就地孵化（灵兽袋装不下会自动退回去）
    const hb = e.target.closest('button[data-hatch]');
    if (hb) {
      const id = hb.getAttribute('data-hatch');
      const r = hatchEgg(id);
      const it = Items.get(id);
      if (r === 'hatched') { notify((it ? it.name : '卵') + ' 孵出来了'); }
      else if (r === 'kept') { notify('灵兽袋装不下 · 卵先收着'); Sfx.warn(); }
      renderCave(); refreshTitle();
      return;
    }
    // 挂机喂养开关
    const fd = e.target.closest('button[data-feed]');
    if (fd) {
      if (!save.petFeed) save.petFeed = { on: false, t: 0 };
      save.petFeed.on = !save.petFeed.on;
      save.petFeed.t = 0;
      writeSave();
      notify(save.petFeed.on ? '挂机喂养已开' : '挂机喂养已关');
      renderCave();
      return;
    }
    // 同伴：同行 / 暂别
    const mb = e.target.closest('button[data-mate]');
    if (mb) { setMate(mb.getAttribute('data-mate')); return; }
    // 厉飞雨·双身份化名切换
    const ib = e.target.closest('button[data-identity]');
    if (ib && !ib.disabled) { setIdentity(ib.getAttribute('data-identity')); renderCave(); return; }
    // 掌天瓶·催熟：耗 1 绿液，给随行灵宠一大截修为
    const cu = e.target.closest('button[data-cul]');
    if (cu && !cu.disabled) {
      if ((save.greenLiquid || 0) <= 0 || !save.pet) { notify('绿液不足，或先放出一只灵宠'); return; }
      save.greenLiquid--;
      petGainXp(save.pet, 120);
      notify('掌天瓶催熟 · 灵宠修为大涨'); Sfx.levelup(); renderCave();
      return;
    }
    // 重修：闭关一年/六年，把跌掉的修为补回来（原著小寰岛闭关服丹的路子）
    const rb = e.target.closest('button[data-rebuild]');
    if (rb) { rebuildTo(parseInt(rb.getAttribute('data-rebuild'), 10) || 0); return; }
    // 进阶页：物事齐了 → 进对应的剧情地图，打到关底就地在剧情里破境
    const bn = e.target.closest('button[data-breaknow]');
    if (bn) {
      const lv = parseInt(bn.getAttribute('data-breaknow'), 10) || 0;
      const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv);
      if (b) { enterBreakMap(b); }
      return;
    }
    // 储物袋其他：消耗品「用」掉（服用丹药 / 催动符箓 / 捏碎灵石）
    const ub = e.target.closest('button[data-use]');
    if (ub) { useItemFromBag(ub.getAttribute('data-use')); return; }
    // 储物袋其他：点行看物件详情
    const bt = e.target.closest('.bagrow[data-item]');
    if (bt && !e.target.closest('button')) { showItemHint(bt.getAttribute('data-item'), bt); return; }
    // 洞府进阶清单里的道具行：点一下看「去哪取」（依原著）
    const brkRow = e.target.closest('.brk-row.click');
    if (brkRow && brkRow.getAttribute('data-item')) {
      showItemHint(brkRow.getAttribute('data-item'), brkRow);
      return;
    }
  });
  if (elShopBuyTab) elShopBuyTab.addEventListener('click', () => { G.shopTab = 'buy'; renderShop(); });
  if (elShopSellTab) elShopSellTab.addEventListener('click', () => { G.shopTab = 'sell'; renderShop(); });
  if (elShopCats) elShopCats.addEventListener('click', e => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    G.shopCat = b.getAttribute('data-cat');
    renderShop();
  });
  if (elShopList) elShopList.addEventListener('click', e => {
    const qb = e.target.closest('.qb');
    if (qb) { useQuick(+(qb.getAttribute('data-q') || 0)); return; }
    const pb = e.target.closest('button[data-pet]');
    if (pb) { setPet(pb.getAttribute('data-pet')); return; }
    const b = e.target.closest('button[data-buy]');
    if (b) { buyItem(b.getAttribute('data-buy')); return; }
    const a = e.target.closest('button[data-auc]');
    if (a) { buyItem(a.getAttribute('data-auc')); return; }
    const s = e.target.closest('button[data-sell]');
    if (s) { sellItem(s.getAttribute('data-sell')); return; }
    const sa = e.target.closest('button[data-sellall]');
    if (sa) { sellItem(sa.getAttribute('data-sellall'), true); return; }
    const sm = e.target.closest('button[data-sellmat]');
    if (sm) { sellAllMaterials(); return; }
    const dc = e.target.closest('button[data-decomp]');
    if (dc) { decomposeItem(dc.getAttribute('data-decomp')); return; }
    const da = e.target.closest('button[data-decompall]');
    if (da) { decomposeItem(da.getAttribute('data-decompall'), true); return; }
  });

  // 存档开关
  if (elAutoSaveChk) elAutoSaveChk.addEventListener('change', () => {
    save.settings.autoSave = elAutoSaveChk.checked; writeSave();
    notify(save.settings.autoSave ? '自动存档：开' : '自动存档：关');
  });
  if (elManualSaveChk) elManualSaveChk.addEventListener('change', () => {
    save.settings.manualSave = elManualSaveChk.checked; writeSave(); syncSettingsUI();
    notify(save.settings.manualSave ? '手动存档：开' : '手动存档：关');
  });
  if (elSaveNowBtn) elSaveNowBtn.addEventListener('click', manualSave);

  // ---------- 适配：安全区 + 舞台 ----------
  const elWrap = document.getElementById('wrap');
  const elFit = document.getElementById('fit');
  const elStage = document.getElementById('stage') || cv.parentNode;
  const elFsHint = document.getElementById('fsHint');
  let viewScale = 1;

  function safeInsets() {
    const cs = getComputedStyle(elWrap);
    const px = v => Math.round(parseFloat(v) || 0);
    return { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
  }

  function resize() {
    const availW = elFit.clientWidth, availH = elFit.clientHeight;
    if (!availW || !availH) return;
    // 逻辑视口：宽固定 480（设计基准），高按设备比例伸展，画面铺满不留黑边。
    // 下限 768（原 864）：矮屏机型与平板/桌面窗口也能铺满宽度，不再上下留黑；
    // 上限 1180 兜住超长屏，再长就居中留边 —— 把视野拉成一条比留边更难受。
    const ratio = availH / availW;
    const wantH = Math.round(Math.min(1180, Math.max(768, BASE_W * ratio)));
    // 渲染分辨率倍率：默认 1（=历史行为，画布永远 480 宽）。
    // 手机上这块画布会被拉伸到 DPR 倍，1px 的墨线和像素特效会糊；
    // 用 ?pr=2 / ?pr=3 提高画布像素密度换清晰度，代价是填充率按平方涨 —— 由真机实测决定用哪档。
    PR = renderPR();
    const bw = Math.round(W * PR), bh = Math.round(wantH * PR);
    if (wantH !== H || cv.width !== bw || cv.height !== bh) {
      H = wantH;
      cv.width = bw; cv.height = bh;
      // 视口或倍率变了，场景装饰与分块缓存需要重建
      G.decor = []; G.chunkMap = {};
      if (grassPat) buildGrass(buildGrass._bg);
    }
    // 画布按「逻辑尺寸」上屏，多出来的像素只用于提高采样密度，不改变布局；舞台再整体 scale
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    ctx.imageSmoothingEnabled = false;   // 改 canvas.width 会重置上下文状态，这里补回来
    const scale = Math.min(availW / W, availH / H);
    viewScale = scale;
    // 舞台按逻辑尺寸布局，整体 scale：HUD / 弹窗 / 字号跟着画布一起缩，
    // 各机型看到的是同一张设计稿，只是大小不同。
    elStage.style.width = W + 'px';
    elStage.style.height = H + 'px';
    elStage.style.transform = 'translate(-50%, -50%) scale(' + (Math.round(scale * 1e5) / 1e5) + ')';
    // 触摸设备横屏：竖版画面会被压成极窄一条，与其硬塞不如请人转回来
    try {
      const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
      const rot = !!coarse && availW > availH * 1.18;
      if (document.body && document.body.classList) {
        document.body.classList.toggle('rot', rot);
        // 矮屏档：16:9 老机型（360×640 / 375×667）逻辑视口只有 854，
        // 首页那份内容会顶出去 —— 交给 CSS 收紧一档排版，别让玩家在首屏学滚动。
        document.body.classList.toggle('short', !rot && H < 1000);
      }
    } catch (e) {}
  }
  G.view = { scale: 1, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
  function refreshView() {
    resize();
    G.view = { scale: viewScale, safe: safeInsets(), vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio || 1 };
  }
  window.addEventListener('resize', refreshView);
  window.addEventListener('orientationchange', () => setTimeout(refreshView, 140));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', refreshView);
    window.visualViewport.addEventListener('scroll', refreshView);
  }
  refreshView();

  // ---------- 全屏：双击顶部 或 按钮 ----------
  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
  }
  function fsSupported() {
    const e = document.documentElement;
    return !!(e.requestFullscreen || e.webkitRequestFullscreen || e.msRequestFullscreen);
  }
  let hintTimer = 0;
  function fsHint(text, ms) {
    if (!elFsHint) return;
    elFsHint.textContent = text;
    elFsHint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => elFsHint.classList.remove('show'), ms || 900);
  }

  async function toggleFullscreen() {
    // 已全屏 → 退出
    if (fsElement()) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      } catch (e) { fsHint('无法退出全屏'); }
      return;
    }
    if (fsSupported()) {
      const el = document.documentElement;
      try {
        const r = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' })
          : el.webkitRequestFullscreen ? el.webkitRequestFullscreen()
            : el.msRequestFullscreen();
        if (r && typeof r.then === 'function') await r;
        refreshView();
        setTimeout(refreshView, 120);
        fsHint('全屏 · 双击顶部退出', 1500);
        return;
      } catch (err) {
        fsHint('全屏被浏览器拦下，再点一次试试', 1300);
        return;
      }
    }
    // iOS Safari / 内嵌 WebView：无 Fullscreen API，退化为沉浸模式
    const on = !document.body.classList.contains('immersive');
    document.body.classList.toggle('immersive', on);
    refreshView();
    setTimeout(refreshView, 120);
    if (on) {
      try { window.scrollTo(0, 1); } catch (e) { }
      fsHint('沉浸模式 · Safari 可「分享→添加到主屏幕」真全屏', 2000);
    } else {
      fsHint('已退出沉浸', 800);
    }
  }

  ['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'].forEach(ev => {
    document.addEventListener(ev, () => {
      const on = !!fsElement();
      document.body.classList.toggle('fs', on);
      refreshView();
      setTimeout(refreshView, 60);
      if (!on) fsHint('已退出全屏', 700);
    });
  });

  // 双击手势：
  // - 战斗态（play）：双击屏幕任意处 → 闪身，方向 = 双击点相对屏幕中心（硬跟随下玩家就在中心）
  // - 其他状态：双击舞台顶部（约上 9% 高度）→ 切换全屏
  let tapTime = 0, lastTapX = 0, lastTapY = 0;
  elStage.addEventListener('pointerdown', ev => {
    if (ev.isPrimary === false) return;
    if (ev.target.closest('button, input, select, label, a')) return;
    const r = elStage.getBoundingClientRect();
    const now = performance.now();
    // 战斗里双击 = 闪身：两次点击够快（380ms）且落点够近（80px）才算，避免把走位摇杆误判成双击
    if (G.state === 'play') {
      if (tapTime && now - tapTime < 380 && Math.hypot(ev.clientX - lastTapX, ev.clientY - lastTapY) < 80) {
        tapTime = 0;
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        const len = Math.hypot(dx, dy);
        // 落在屏幕正中心附近（len 太小）没有明确方向，交给 dashPlayer 背对敌人兜底
        if (len > 14) dashPlayer({ dx: dx / len, dy: dy / len });
        else dashPlayer();
      } else {
        tapTime = now; lastTapX = ev.clientX; lastTapY = ev.clientY;
      }
      return;
    }
    // 非战斗：只认顶部区域，双击切全屏
    const bandH = Math.max(58, Math.round(r.height * 0.085));
    if (ev.clientY - r.top > bandH) { tapTime = 0; return; }
    if (joy.active) { tapTime = 0; return; }          // 正在拖拽摇杆，不算点击
    if (tapTime && now - tapTime < 380 && Math.abs(ev.clientX - lastTapX) < 80) {
      tapTime = 0; lastTapX = 0; lastTapY = 0;
      toggleFullscreen();
    } else {
      tapTime = now; lastTapX = ev.clientX; lastTapY = ev.clientY;
    }
  }, { passive: true });

  // ---------- 主循环 ----------
  let last = performance.now();
  let _verShown = null;   // 版本水印：仅在标题首页显示，缓存避免每帧重复写
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (G.state === 'play') update(dt * (G.ts || 1));
    else if (G.state === 'down') updateDown(dt * (G.ts || 1));   // P6 倒地观战：世界照转，自己不能动
    // 洞府 / 坊市 / 对话 / 暂停 / 看地图这些状态下也保持联机心跳，否则队友会误报失联
    else if (window.Coop) window.Coop.tickSend(dt * (G.ts || 1));
    // 自动战斗：update 只在 play 时跑，对话与选卡这两处得单独推一把
    if (G.autoOn) tickAuto(dt);
    if (G.state !== 'title') { render(); updateHUD(); }
    // 版本水印只在首页（标题态）露脸：进图/坊市/洞府/结算等一律收起
    const _onTitle = (G.state === 'title');
    if (_onTitle !== _verShown) {
      _verShown = _onTitle;
      const _v = document.getElementById('ver');
      if (_v) _v.style.display = _onTitle ? '' : 'none';
    }
    // 结算态：小舞台自己跑（走动 / 头顶表情 / 位置同步），战斗逻辑不跑
    if (G.state === 'victory') updateSettle(dt * (G.ts || 1));
    // 飞鸽传书：战斗 / 暂停 / 选图（修行图）/ 对话时才给用，标题与结算收起来
    if (window.Chat) window.Chat.setVisible(CHAT_STATES[G.state] === 1);
    requestAnimationFrame(loop);
  }
  // 允许聊天的场景：进图打斗、倒地、暂停、看修行图、剧情对话、洞府/坊市之外都算「在图里」
  // victory 也开着：结算菜单已上移，下方留白正好让两人在图里聊两句、丢个表情再走
  // 注意 openWorldMap() 里写的是 G.state = 'map'，不是 'worldmap' —— 键名对不上就等于没开
  const CHAT_STATES = { play: 1, down: 1, pause: 1, dialog: 1, levelup: 1, map: 1, worldmap: 1, victory: 1 };

  // ---------- 转世重修（删档重来） ----------
  // 表面清档，实则以九九归一轮回之法，把本世超出凡胎的部分（境界 + 功法）
  // 各取 1/81 炼作「余荫」，叠加到新生角色的初始属性上，代代累积。
  function resetAllProgress() {
    save.inventory = {}; save.bonuses = {}; save.totalItems = 0; save.stones = 0;
    save.cleared = []; save.unlocked = ['qixuan']; save.mapId = 'qixuan';
    save.cultivate = { level: 1, skills: { sword: 1 } };
    save.equip = { weapon: null, armor: null, trinket: null, talisman: null };
    save.caves = []; save.diffClear = {}; save.lastDiff = 'easy'; save.met = [];
    save.best = { time: 0, kills: 0, level: 1 }; save.wins = 0;
    save.pets = []; save.pet = null; save.sealed = null;
    save.mates = []; save.mate = null;
    save.quick = [null, null, null];
    save.petFeed = { on: false, t: 0 };
    save.greenLiquid = 0; save.ach = {};
    save.wounded = null;      // 存档重来：修为受创一并清掉
    G.breakCaveId = null; G.breakPending = null;  // 清掉过图会话态：避免重生后误吃原著洞府 +30%
    save.gift_zhuji = false;
    save.gift_tenglong = false;
    save.gift_zhilongguo = false;
    save.gardenSeed = {};     // 洞府重开：移栽的品种一并清掉（基础品种写在数据里，会随洞府重开回来）
    save.repBlack = 0; save.repWhite = 0; save.identity = 'han'; save.liUnlocked = false;
    if (G.player) { resetRunBonus(); G.gear = {}; G.runLoot = []; }
  }

  // 本世可炼出的属性余荫：把「人物属性值」超出凡胎初始的来源（永久加成 + 境界 + 装备 + 功法回血）逐项累计
  function rebirthHarvest() {
    const lv = Math.max(1, save.cultivate.level || 1);
    const rs = realmSum(lv);
    const g = gearBonus();
    const b = save.bonuses || {};
    const sk = save.cultivate.skills || {};
    const c = {};
    c.maxhp = (b.maxhp || 0) + rs.hp + (g.maxhp || 0);
    c.dmg = (b.dmg || 0) + (g.dmg || 0) + rs.dmg;
    c.atkSpd = (b.atkSpd || 0) + (g.atkSpd || 0) + rs.atk;
    c.spd = (b.spd || 0) + (g.spd || 0) + rs.spd;
    c.regen = (b.regen || 0) + (g.regen || 0) + 0.7 * (sk.regen || 0);
    c.crit = (b.crit || 0) + (g.crit || 0);
    c.armor = (b.armor || 0) + (g.armor || 0);
    c.pickup = (b.pickup || 0) + (g.pickup || 0);
    c.xpMul = (b.xpMul || 0) + (g.xpMul || 0);
    return c;
  }

  // 预览：本次转世能炼出多少属性余荫（不落盘）
  function rebirthPreview() {
    const h = rebirthHarvest();
    const next = {};
    for (const k of REBIRTH_KEYS) next[k] = rb(k) + (h[k] || 0) / REBIRTH_DIV;
    return { cycles: REBIRTH.cycles, add: h, next };
  }

  function doRebirth() {
    const h = rebirthHarvest();
    REBIRTH.cycles = (REBIRTH.cycles || 0) + 1;
    REBIRTH.stats = REBIRTH.stats || {};
    for (const k of REBIRTH_KEYS) {
      const add = (h[k] || 0) / REBIRTH_DIV;
      if (add > 0) REBIRTH.stats[k] = (REBIRTH.stats[k] || 0) + add;
    }
    writeRebirthPool(REBIRTH);

    resetAllProgress();
    writeSave();

    hideAllOverlays();
    if (elHud) elHud.style.display = 'none';
    G.state = 'title';
    G.player = null;
    elTitle.style.display = 'flex';
    refreshTitle();

    banner('转世重修 · 第 ' + REBIRTH.cycles + ' 世 · 余荫入体');
    return { cycles: REBIRTH.cycles, stats: Object.assign({}, REBIRTH.stats) };
  }

  // ---------- 调试 API ----------
  window.__FR = {
    G: G,
    inkify: c => inkify(c),
    start: () => openWorldMap(),
    fullscreen: () => toggleFullscreen(),
    isFullscreen: () => !!fsElement(),
    view: () => ({ scale: +viewScale.toFixed(4), safe: safeInsets(), vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio || 1, stage: { w: elStage.clientWidth, h: elStage.clientHeight } }),
    safeInsets: () => safeInsets(),
    info() {
      const p = G.player;
      return {
        state: G.state, time: +G.time.toFixed(1), kills: G.kills, god: !!G.god, ts: G.ts || 1,
        mapId: G.mapId, mapName: G.map ? G.map.name : null, mapType: G.map ? G.map.type : null,
        level: p ? p.level : 0, realm: p ? realmName(p.level) : null,
        xp: p ? Math.floor(p.xp) : 0, next: p ? p.next : 0,
        hp: p ? Math.ceil(p.hp) : 0, maxhp: p ? p.maxhp : 0,
        enemies: G.enemies.length, bullets: G.bullets.length, ebullets: G.ebullets.length,
        gems: G.gems.length, herbs: G.herbs.length, parts: G.parts.length,
        loot: G.loot.length, runLoot: G.runLoot.length, totalItems: save.totalItems || 0,
        npcs: G.npcs.length, met: (save.met || []).length,
        stones: save.stones || 0, combo: G.combo,
        totalKills: save.totalKills || 0, playTime: +(save.playTime || 0).toFixed(1),
        diff: G.diff ? G.diff.id : null, diffName: G.diff ? G.diff.name : null,
        realmBonus: { dmg: +G.realm.dmg.toFixed(2), atk: +G.realm.atk.toFixed(2), spd: +G.realm.spd.toFixed(2) },
        bonus: Object.assign({}, G.bonus), settings: Object.assign({}, save.settings),
        gear: Object.assign({}, G.gear || {}), equip: Object.assign({}, save.equip),
        cultivate: { level: save.cultivate.level, skills: Object.assign({}, save.cultivate.skills) },
        inventory: Object.assign({}, save.inventory),
        gardenSeed: JSON.parse(JSON.stringify(save.gardenSeed || {})),
        caves: save.caves.slice(), matGain: G.matGain || 0,
        diffClear: JSON.parse(JSON.stringify(save.diffClear || {})),
        boss: G.boss ? { name: G.boss.name, kind: G.boss.kind, hp: Math.ceil(G.boss.hp), maxhp: G.boss.maxhp, phase2: !!G.boss.phase2, phaseT: +(G.boss.phaseT || 0).toFixed(2) } : null,
        skills: p ? Object.assign({}, p.skills) : null,
        unlocked: save.unlocked.slice(), cleared: save.cleared.slice(),
        sideOpen: save.unlocked.filter(id => { const m = MAPS.find(x => x.id === id); return m && m.side; }).length
      };
    },
    worldmap() { openWorldMap(); return 'map'; },
    toTitle() {
      hideAllOverlays();
      if (elHud) elHud.style.display = 'none';
      G.state = 'title';
      elTitle.style.display = 'flex';
      refreshTitle();
      return 'title';
    },
    caveTabsOf(id) { const c = CAVES[id]; return c ? caveTabs(c).map(t => t.id) : []; },
    // 药圃读数：不传 id 返回全部地块 {地块id: {charge, cap, cave}}
    gardenState(gid) {
      const out = {};
      for (const x of gardenList()) out[x.g.id] = { charge: gardenChargeOf(x.g), cap: gardenCapOf(x.g), cave: x.cave.id, pool: gardenPoolOf(x.g).length, ids: gardenPoolOf(x.g) };
      return gid ? (out[gid] || null) : out;
    },
    setGarden(gid, n) { save.gardenCharge = save.gardenCharge || {}; save.gardenCharge[gid] = Math.max(0, Math.min(GARDEN_CAP, n | 0)); save.gardenTick = 0; return save.gardenCharge[gid]; },
    transplant(silent) { const p = autoTransplant(!!silent); return p.map(m => m.id); },
    harvest(gid) {
      const x = gardenList().find(y => y.g.id === gid);
      if (!x) return null;
      const before = Object.assign({}, save.inventory);
      pickGarden(x.cave, gid);
      const delta = {};
      for (const k in save.inventory) if ((save.inventory[k] || 0) !== (before[k] || 0)) delta[k] = (save.inventory[k] || 0) - (before[k] || 0);
      return delta;
    },
    skipStory() { let n = 0; while (G.state === 'dialog' && !G.dialogIsChoice && n < 80) { advanceDialog(); n++; } return n; },
    muteStory(on) { G.storyMute = !!on; if (on) this.skipStory(); return !!G.storyMute; },
    storyMuted() { return !!G.storyMute; },
    enterMap(id, diff) { if (!save.unlocked.includes(id)) save.unlocked.push(id); startMap(id, diff); return G.mapId; },
    teleport(x, y) { if (G.player) { G.player.x = x; G.player.y = y; return { x: G.player.x, y: G.player.y }; } return null; },
    coop() { return G.partner ? { x: Math.round(G.partner.x), y: Math.round(G.partner.y), tx: Math.round(G.partner.tx), ty: Math.round(G.partner.ty), shown: !!G.partner.shown, map: G.partner.map, myMap: (G.mapId || (G.map && G.map.id)) || null, name: G.partner.name, level: G.partner.level } : null; },
    coopSend() { if (window.Coop) window.Coop.sendState(); return true; },
    coopTick(n) { const k = n || 1; for (let i = 0; i < k; i++) if (window.Coop) window.Coop.update(0.05); return true; },
    // ---- 联机 P3 测试钩子（房主权威共怪）----
    coopRole() { return G.coopRole; },
    // 测试用：强制走一次真实开火链路（fireWeapons → fireActive → pushBullet → Coop.queueFx）
    fireOnce() { if (G.state === 'play' && G.player) { fireWeapons(1e6); return G.bullets.length; } return -1; },
    fxCount() { return (G.fxBullets || []).length; },
    coopApplyDlg: coopApplyDlg, coopApplyPause: coopApplyPause, grantEncShare: grantEncShare,
    encCount(id) { return (save.inventory || {})[id] || 0; },
    frozen() { return !!G.coopFrozen; },
    setFrozen(v) { G.coopFrozen = !!v; return G.coopFrozen; },
    // 对话同步 / 暂停同步的测试入口
    showLines(lines, onEnd, id) { showLines(lines, onEnd || null, id || null); return G.dialogIdx; },
    advanceDialog() { advanceDialog(); return G.dialogIdx; },
    pickChoice(v) { return pickChoice(v); },
    dialogState() { return { state: G.state, idx: G.dialogIdx, n: G.dialogLines ? G.dialogLines.length : 0, synced: !!G.dialogSynced, choice: !!G.dialogIsChoice, choiceOpts: G.dialogChoiceOpts ? G.dialogChoiceOpts.map(o => o.t) : null }; },
    settleBubble: settleBubble, settleMate: settleMate,
    settle() { return G.settle ? { x: G.settle.x, y: G.settle.y, mx: G.settle.mx, my: G.settle.my, shown: G.settle.mShown, myBub: G.settle.myBub.length, mateBub: G.settle.mateBub.length } : null; },
    pause() { doPause(); return G.state; },
    resume() { doResume(); return G.state; },
    coopShared() { return !!G.coopShared; },
    mapName(id) { const m = MAPS.find(x => x.id === id); return m ? m.name : String(id); },
    setRole(r) { G.coopRole = r; return G.coopRole; },
    remoteCount() { return G.enemies.filter(e => e._remote).length; },
    localCount() { return G.enemies.filter(e => !e._remote).length; },
    firstEnemyId() { for (const e of G.enemies) if (!e._remote) return e._id; return null; },
    bossId() { return G.boss ? G.boss._id : null; },
    enemyHp(id) { const e = G.enemies.find(x => x._id === id) || (G.boss && G.boss._id === id ? G.boss : null); return e ? Math.round(e.hp) : null; },
    setEnemyHp(id, hp) { const e = G.enemies.find(x => x._id === id) || (G.boss && G.boss._id === id ? G.boss : null); if (e) { e.hp = hp; return Math.round(e.hp); } return null; },
    enemyMeta(id) { const e = G.enemies.find(x => x._id === id) || (G.boss && G.boss._id === id ? G.boss : null); return e ? { type: e.type, hp: Math.round(e.hp), maxhp: Math.round(e.maxhp), remote: !!e._remote, x: Math.round(e.x), y: Math.round(e.y) } : null; },
    damageEnemyById(id, d) { const e = G.enemies.find(x => x._id === id) || (G.boss && G.boss._id === id ? G.boss : null); if (e) { damageEnemy(e, d); return Math.round(e.hp); } return null; },
    reportHit(id, d) { if (window.Coop) window.Coop.reportHit(id, d); return true; },
    simPartnerHurt(d) { if (window.Coop) window.Coop.addPartnerHurt(d); return true; },
    playerHp() { return G.player ? Math.round(G.player.hp) : null; },
    setGod(v) { G.god = !!v; return G.god; },
    hurtSelf(d) { hitPlayer(d); return G.player ? Math.round(G.player.hp) : null; },
    forcePartner(x, y) { const g = G; if (!g) return false; if (!g.partner) g.partner = { r: 9, name: 't', level: 1, hp: 1, maxhp: 1, map: null, last: 0, shown: false, tx: 0, ty: 0, x: 0, y: 0 }; g.partner.x = x; g.partner.y = y; g.partner.tx = x; g.partner.ty = y; g.partner.shown = true; g.partner.map = (g.mapId || (g.map && g.map.id)); g.partner.last = performance.now(); return true; },
    stepEnemies(dt) { if (G.coopRole === 'host') { updateEnemies(dt || 0.1); return G.enemies.length; } return -1; },
    // ---- 联机 P4 测试钩子（共享战斗结算）----
    gameOver() { gameOver(); return G.state; },
    startOutro() { startOutro(); return G.state; },
    endSent() { return !!G._endSent; },
    // 逻辑视口：射程上限（内切屏幕的椭圆）要靠它算，验收脚本得拿得到
    viewSize() { return { W, H }; },
    // 该功法此刻的射程椭圆两轴：验收时和「实际命中距离」对账用
    rangeAxes(skillId, lv) {
      const RM = window.rangeModel; if (!RM || !G.player) return null;
      const s = window.skillById ? window.skillById(skillId) : null;
      const ri = RM.realmIdx(G.player.level || 1);
      return RM.axes(lv == null ? 1 : lv, s ? s.max : 6, ri, W / 2, H / 2, 1);
    },
    claimedCount() { return G._claimedDrops ? G._claimedDrops.size : 0; },
    hostDrops() {
      const a = G.gems.length + G.herbs.length + G.loot.length;
      return { gems: G.gems.length, herbs: G.herbs.length, loot: G.loot.length, total: a };
    },
    // 掉落池探针：验证「灵界不掉人界低阶成品」与「破境丹不进随机池」
    lootEra() { return inLingjie() ? 'lingjie' : 'renjie'; },
    lootFloor() { return lootMinReq(); },
    simDrop(tier) {
      if (!G.player) return null;
      const n0 = G.loot.length;
      dropLoot(G.player.x, G.player.y, tier == null ? 0 : tier);
      const d = G.loot[G.loot.length - 1];
      return {
        grew: G.loot.length - n0,
        mat: !!(d && d.mat),
        item: (d && d.item) ? d.item.id : null,
        req: (d && d.item) ? (d.item.req || 1) : null
      };
    },
    dropPool(r, minReq, maxReq) {
      const floor = (minReq == null) ? lootMinReq() : minReq;   // 不传就按当前地图的档位
      const cap = (maxReq == null) ? (inLingjie() ? (((G.map && G.map.startLevel) || 132) + 40) : 0) : maxReq;
      return Items.dropPool(r == null ? 4 : r, { minReq: floor, maxReq: cap })
        .map(i => ({ id: i.id, name: i.name, req: i.req || 1, rarity: i.rarity }));
    },
    dropList() {
      const out = [];
      const push = (arr, kind) => { for (const d of arr) out.push({ id: d._id != null ? d._id : null, kind, x: Math.round(d.x), y: Math.round(d.y), val: d.val, itemId: d.item ? d.item.id : null, remote: !!d._remote }); };
      push(G.gems, 'gem'); push(G.herbs, 'herb'); push(G.loot, 'loot');
      return out;
    },
    grabRemote(id) {
      const all = G.gems.concat(G.herbs, G.loot);
      const d = all.find(x => x._id === id && x._remote);
      if (!d) return 'no remote drop';
      if (d.kind === 'stone') { save.stones = (save.stones || 0) + (d.val || 1); }
      else if (G.gems.indexOf(d) >= 0) gainXp(d.val);
      else if (G.herbs.indexOf(d) >= 0) { if (G.player) G.player.hp = Math.min(G.player.maxhp, G.player.hp + 14); }
      else if (G.loot.indexOf(d) >= 0 && d.item) applyItem(d.item);
      coopClaim(id);
      return 'claimed ' + id;
    },
    // 确定性驱动拾取（绕过后台标签 rAF 节流）：客机用它在镜像掉落上跑真实 updatePickups
    tickPickups(dt) { updatePickups(dt || 0.05); return true; },
    // ---- 联机 P5 测试钩子（打磨：延迟 / 重连提示 / 战利品分成）----
    coopBanner(t) { G._lastBanner = String(t); banner(G._lastBanner); return G._lastBanner; },
    lastBanner() { return G._lastBanner || null; },
    latency() { return window.Coop ? window.Coop.latency() : 0; },
    link() { return window.Coop ? window.Coop.link() : null; },
    partnerInfo() {
      const pt = G.partner;
      return pt ? { shown: !!pt.shown, hp: Math.round(pt.hp), maxhp: Math.round(pt.maxhp), level: pt.level || 1, name: pt.name, down: !!pt.down, st: pt.st || 'play', x: Math.round(pt.x), y: Math.round(pt.y) } : null;
    },
    agePartner(ms) { if (G.partner) { G.partner.last -= (ms || 0); return true; } return false; },
    applyShare(o) {
      if (!G.player || !o) return null;
      if (o.xp) gainXp(o.xp);
      if (o.stones) save.stones = (save.stones || 0) + o.stones;
      if (o.hp) G.player.hp = Math.min(G.player.maxhp, G.player.hp + o.hp);
      // P6：Boss 收尾的道具也分一份（走与房主一致的入口：功法学会、材料计数、其余入袋）
      let nItems = 0;
      for (const id of (o.items || [])) {
        const it = window.Items ? window.Items.get(id) : null;
        if (!it) continue;
        applyItem(it, { silent: true, noRun: true });
        nItems++;
      }
      const tip = [];
      if (o.stones) tip.push('+' + o.stones + ' 灵石');
      if (nItems) tip.push('+' + nItems + ' 件道具');
      if (tip.length) spawnText(G.player.x, G.player.y - 42, '队友分成 ' + tip.join(' '), '#ffd24a', 14);
      return { stones: save.stones || 0, xp: G.player.xp, hp: Math.round(G.player.hp), items: nItems, totalItems: save.totalItems || 0 };
    },
    collectAll() { return collectAllPickups(); },
    // ---- 联机 P6 测试钩子（死亡观战 / 救援复活 / 战利品道具分成）----
    goDown() { coopDown(); return G.state; },
    revive(pct) { revivePlayer(pct); return G.state; },
    downState() { return { state: G.state, down: G.state === 'down', downT: +G.downT.toFixed(2), rescueT: +G.rescueT.toFixed(2) }; },
    partnerDown() { return !!(G.partner && G.partner.down); },
    tickDown(dt) { if (G.state === 'down') updateDown(dt || 0.05); return G.state; },
    setDownT(v) { G.downT = v; return G.downT; },
    tickRescue(dt, near) { tickRescue(dt || 0.05, !!near); return +G.rescueT.toFixed(2); },
    addBag(id, k) {
      const it = Items.get(id); if (!it) return 0;
      for (let i = 0; i < (k || 1); i++) addToBag(it, { silent: true });
      return save.inventory[id] || 0;
    },
    forcePing() { if (window.Coop) window.Coop.tickSend(1.1); return true; },
    addDrop(kind, val) {
      const px = G.player ? G.player.x + 30 : 0, py = G.player ? G.player.y : 0;
      if (kind === 'stone') G.gems.push({ x: px, y: py, r: 5, val: val || 10, kind: 'stone', _id: null });
      else if (kind === 'herb') G.herbs.push({ x: px, y: py, r: 6, _id: null });
      else G.gems.push({ x: px, y: py, r: 5, val: val || 5, _id: null });
      return G.gems.length + G.herbs.length + G.loot.length;
    },
    stats() { return { stones: save.stones || 0, xp: G.player ? G.player.xp : 0, level: G.player ? G.player.level : 0, kills: G.kills, state: G.state, totalItems: save.totalItems || 0 }; },
    pickDiff(mapId) { openDiffPick(mapId); return G.diffPick; },
    takeDiff(id) { const m = G.diffPick; if (!m) return 'no map'; startMap(m, id); return id; },
    diffs() { return DIFFICULTIES.map(d => d.id); },
    // ---- 扫荡 / 掉落增幅（qa/verify-alchdrop 用来核产量与扣费） ----
    openDiff(mapId) { openDiffPick(mapId); return G.state; },
    sweepChipText() { const el = document.querySelector('.dc-sweep'); return el ? el.innerText.replace(/\n/g, ' ') : null; },
    sweepCost() { return sweepCost(); },
    sweepFloor() { return SWEEP_FLOOR; },
    sweepTimes() { return SWEEP_N; },
    sweep(mapId, diffId) { return sweepMap(mapId, diffId); },
    alchBase(mapId, diffId) {
      const p = buildAlchPlan(mapId, diffById(diffId), 0);
      return p ? p.reduce((a, x) => a + x[1], 0) : 0;
    },
    alchBonusRange(diffId) {
      const di = Math.max(0, DIFFICULTIES.indexOf(diffById(diffId)));
      const dm = ALCH_DIFF_BONUS[Math.min(di, ALCH_DIFF_BONUS.length - 1)];
      return [dm, 3 * dm];
    },
    diffClearOf(mapId) { return Object.assign({}, save.diffClear[mapId] || {}); },
    // ---- 际遇 / 支线 ----
    encounterList() { return ENCOUNTERS.map(e => ({ id: e.id, map: e.map, name: e.name, unlock: e.unlock || null, repeat: !!e.repeat, cond: e.cond || null })); },
    encountersOnMap() { return G.npcs.map(x => ({ id: x.def.id, name: x.def.name, x: Math.round(x.x), y: Math.round(x.y) })); },
    encHere() { return encListOnMap().filter(encCondOk).map(e => e.id); },
    spawnEnc(id) {
      const d = ENCOUNTERS.find(e => e.id === id);
      if (!d) return 'no enc';
      if (G.mapId !== d.map) return 'wrong map:' + d.map;
      return spawnEncounter(d) ? d.id : 'fail';
    },
    nearestEnc() { const x = G.npcs[0]; return x ? x.def.id : null; },
    walkToEnc() { const x = G.npcs[0]; if (!x || !G.player) return 'no npc'; G.player.x = x.x; G.player.y = x.y + 1; return x.def.id; },
    talkEnc() { const x = G.npcs[0]; if (!x) return 'no npc'; talkEncounter(x); return x.def.id; },
    meetEnc(id) { const d = ENCOUNTERS.find(e => e.id === id); if (!d) return 'no enc'; meetEncounter(d); return d.id; },
    met() { return (save.met || []).slice(); },
    sideMaps() { return MAPS.filter(m => m.side).map(m => ({ id: m.id, name: m.name, on: save.unlocked.indexOf(m.id) >= 0, done: save.cleared.indexOf(m.id) >= 0 })); },
    unlockSide(id) {
      const m = MAPS.find(x => x.id === id && x.side);
      if (!m) return 'no side map';
      if (save.unlocked.indexOf(id) < 0) save.unlocked.push(id);
      writeSave(); renderWorldMap();
      return id;
    },
    // ---- 背包 / 重复装备 ----
    addItem(id, k) {
      const it = Items.get(id);
      if (!it) return 'no item';
      for (let i = 0; i < (k || 1); i++) addToBag(it, { silent: true });
      writeSave();
      if (G.state === 'cave') renderCave(); else if (G.state === 'shop') renderShop();
      return save.inventory[id] || 0;
    },
    bagCount(id) { return save.inventory[id] || 0; },
    dropItem(id, k) {
      const n = save.inventory[id] || 0; if (!n) return 0;
      const take = Math.min(n, Math.max(1, k || n));
      save.inventory[id] = n - take;
      if (save.inventory[id] <= 0) delete save.inventory[id];
      if (save.totalItems > 0) save.totalItems = Math.max(0, save.totalItems - take);
      writeSave();
      if (G.state === 'cave') renderCave(); else if (G.state === 'shop') renderShop();
      return save.inventory[id] || 0;
    },
    // ---- 灵宠 / 同伴 / 突破 / 封印 / 追逃 ----
    pets() { normalizePets(); return { owned: JSON.parse(JSON.stringify(save.pets || [])), active: save.pet || null, cap: petCap(), bag: petBagName() }; },
    setPet(id) { if (id && !petEntry(id)) return 'no pet'; setPet(id); return save.pet; },
    addPet(id) { return addPet(id); },
    releasePet(id) { releasePet(id); return (save.pets || []).length; },
    petLv(id) { return petLv(id); },
    petRoom() { return petRoom(); },
    eggs() { return eggRows(); },
    hatchEgg(id) { return hatchEgg(id); },
    feed(on) { if (!save.petFeed) save.petFeed = { on: false, t: 0 }; save.petFeed.on = !!on; save.petFeed.t = 0; writeSave(); return save.petFeed.on; },
    feedTick(dt) { tickPetFeed(dt || 20); return { on: !!(save.petFeed && save.petFeed.on), stones: save.stones || 0, siling: save.inventory['m_siling'] || 0 }; },
    mates() { return { owned: (save.mates || []).slice(), active: save.mate || null, defs: (window.MATES || []).map(m => m.id) }; },
    addMate(id) { return addMate(id); },
    setMate(id) { setMate(id); return save.mate; },
    // ---- 厉飞雨·双身份化名系统（P0-1）----
    identity() { return save.identity; },
    setIdentity(id) { setIdentity(id); return save.identity; },
    rep() { return { black: save.repBlack || 0, white: save.repWhite || 0 }; },
    setRep(black, white) { save.repBlack = black || 0; save.repWhite = white || 0; return void 0; },
    checkHeibaiAch() { checkHeibaiAch(); return (save.ach || {}).heibai === true; },
    liUnlocked() { return !!save.liUnlocked; },
    greenLiquid() { return save.greenLiquid || 0; },
    setGreen(v) { save.greenLiquid = v || 0; return save.greenLiquid; },
    cul() { const r = (save.greenLiquid || 0) > 0 && save.pet ? (save.greenLiquid--, petGainXp(save.pet, 120), true) : false; return r; },
    // ---- 境界突破 ----
    // 测试用：把一张图标成已通关（等价于打完写档），突破的剧情条件就认它
    clearMap(id) {
      if ((save.cleared || []).indexOf(id) < 0) { save.cleared = (save.cleared || []).concat(id); writeSave(); }
      checkLiUnlock();
      checkPetRelease({ id: id });   // 镜像真实通关副作用：解锁化名系统 / 放飞到期灵宠
      checkMateLeave({ id: id });    // 同伴到期离队（曲魂在古修遗址被夺身）
      return save.cleared.slice();
    },
    setStones(v) { save.stones = Math.max(0, Math.round(v || 0)); writeSave(); return save.stones; },
    bag() { return JSON.parse(JSON.stringify(save.inventory || {})); },
    // 确定性推进若干帧（后台标签 rAF 会被节流，用它代替）
    tickFrames(n, dt) {
      const k = n || 1, d = dt || 0.05;
      for (let i = 0; i < k; i++) {
        if (G.state === 'play') update(d);
        else if (G.state === 'down') updateDown(d);
      }
      return G.state;
    },
    // 同步渲染一帧（不推进世界）。真机性能验收用：直接计 render() 的耗时，
    // 不受 rAF 60Hz 封顶影响 —— 否则「60fps 就是 16.67ms」什么都测不出来。
    render() { render(); },
    // 当前同屏敌人数量（性能面板读取用）
    enemyCount() { return G.enemies ? G.enemies.length : 0; },
    // ---- 功法特效验收钩子（qa/verify-skillfx.mjs / qa/shot-skillfx.mjs 用）----
    // 暴露命中配色表，便于断言每一门功法的命中色
    VFX_HIT_COLOR: VFX_HIT_COLOR,
    // 直接拿内部函数的源码做「分支存在性」断言（跨页面边界比函数身份会比不上来）
    src(name) {
      const fns = { drawBulletVfx, drawField, drawOrb, drawBolt, thunderStrike, spawnWeb, isEvil, novaBlast };
      const f = fns[name];
      return f ? f.toString() : null;
    },
    // 魔道判定（辟邪神雷克魔逻辑会被直接断言）
    isEvil(e) { return isEvil(e); },
    // 直接劈一道辟邪神雷，返回可断言的明细（含魔道加伤倍率 ×1.6）
    thunderOnce(x, y, dmg, target) {
      const g = G;
      const evil = isEvil(target);
      const webBefore = g.parts.filter(p => p.web).length;
      const hpBefore = target && target.hp != null ? target.hp : null;
      const mult = evil ? 1.6 : 1;
      thunderStrike(x, y, dmg, target);
      const webAfter = g.parts.filter(p => p.web).length;
      const hpAfter = target && target.hp != null ? target.hp : null;
      return {
        evil,
        webCount: webAfter - webBefore,
        hpBefore, hpAfter,
        dealt: hpBefore != null && hpAfter != null ? hpBefore - hpAfter : null,
        expectedDealt: dmgMul() * dmg * mult,
        mult
      };
    },
    // 击杀碎裂：返回死亡瞬间真正被劈碎的那张图名（当前帧优先，否则回退 e.spr）。
    // 验收据它断言「碎的是当前姿态，不是 idle 整图」——这是修掉的小瑕疵。
    shatterOnce(spr, opts) {
      const o = opts || {};
      const e = {
        spr, x: 0, y: 0, scale: o.scale || 1, _flip: !!o.flip,
        hitFlash: o.hitFlash || 0, t: o.t == null ? 0.1 : o.t
      };
      const before = G.parts.length;
      spawnShatter(e);
      const parts = G.parts.slice(before);
      const s = parts.find(p => p.shatter);
      return { count: parts.length, spr: s ? s.spr : null, usedFrame: s ? s.spr !== spr : null };
    },
    // 把某一门功法的特效直接铺到画面里（暂停态下冻住那一帧截图用）
    previewVfx(name, evil) {
      const g = G, p = g.player; if (!p) return false;
      g.enemies.length = 0; g.bullets.length = 0; g.parts.length = 0;
      g.orbPos.length = 0; g.fieldSlow.length = 0; g.fxBullets.length = 0; g.texts.length = 0;
      const x = p.x, y = p.y;
      const tgt = evil ? { x, y, kind: 'mo' } : null;
      switch (name) {
        case 'qingmang': g.bullets.push({ x, y, vx: 300, vy: 0, r: 6, dmg: 0, life: 1, pierce: 1, hit: new Set(), home: false, vfx: 'qingmang', ang: 0 }); break;
        case 'blood': g.bullets.push({ x, y, vx: 300, vy: 0, r: 6, dmg: 0, life: 1, pierce: 1, hit: new Set(), home: false, vfx: 'blood', ang: 0, phase: 1 }); break;
        case 'snake': g.bullets.push({ x, y, vx: 160, vy: 0, r: 7, dmg: 0, life: 3, pierce: 1, hit: new Set(), home: true, vfx: 'snake', ang: 0, phase: 0.5 }); break;
        case 'fan': g.bullets.push({ x, y, vx: 300, vy: 0, r: 7, dmg: 0, life: 1, pierce: 1, hit: new Set(), home: false, vfx: 'fan', ang: 0, hue: 0 }); break;
        case 'gold': novaBlast(x, y, 80, 0, 'gold'); g.bullets.push({ x, y, vx: 0, vy: 0, r: 6, dmg: 0, life: 1, pierce: 1, hit: new Set(), vfx: 'gold', ang: 0 }); break;
        case 'ice': g.fieldSlow.push({ rad: 80, slow: 0.45, vfx: 'ice' }); break;
        case 'gravity': g.fieldSlow.push({ rad: 90, slow: 0.5, vfx: 'gravity' }); break;
        case 'gang': for (let i = 0; i < 2; i++) { const a = i * Math.PI; g.orbPos.push({ x: x + Math.cos(a) * 36, y: y + Math.sin(a) * 36, vfx: 'gang', ang: a, i }); } break;
        case 'thunder': thunderStrike(x, y, 14, tgt); break;
      }
      return true;
    },
    // 动作时间轴的真实参数：验收脚本据此摆姿态，不写死数字
    anim() {
      return { atkTotal: ATK_TOTAL, wind: ATK_WIND, strike: ATK_STRIKE, recov: ATK_RECOV };
    },
    // 由真实曲线算出姿态，不用测试脚本自己抄一份公式（抄的那份会和实现越改越远）
    poseTf(kind, arg, spr) {
      if (kind === 'idle') return tfIdle(0, 0, arg == null ? 0 : arg, spr || null);
      if (kind === 'run') return tfRun(0, 0, arg == null ? Math.PI / 4 : arg, 1, spr || null);
      if (kind === 'strike') return tfStrike(arg == null ? ATK_WIND + ATK_STRIKE * 0.9 : arg, 1, spr || 'hanli');
      if (kind === 'hurt') return tfHurt(arg == null ? 0.12 : arg, 1, spr || null);
      if (kind === 'hover') return tfHover(0, 0, arg == null ? 0 : arg, 1, spr || null);
      return null;
    },
    // 某个动作配了帧的精灵 → 帧名清单（没配返回 null）
    frames(action) {
      const out = {};
      const set = (window.FRAME_SETS || {})[action] || {};
      for (const k in set) out[k] = framesOf(action, k);
      return out;
    },
    // 这个相位该用哪张帧；没有帧的精灵返回 null
    frameAt(action, spr, phase) { return frameName(action, spr, phase == null ? 0 : phase); },
    // 手绘跑步帧验收：返回每个精灵的四张跑步帧模板（与 window.RUN_SET 对应），长度恒为 4
    runFrames() { const o = {}; const s = window.RUN_SET || {}; for (const k in s) o[k] = s[k][0]; return o; },
    // 给定相位返回该精灵的跑步帧名（hanli_run0..3），与内部 frameName('run', ...) 一致
    runFrame(name, phase) { return frameName('run', name, phase == null ? 0 : phase); },
    // 出手 / 受击的帧是照时间轴选的，单独给接口
    strikeFrame(spr, el) { return strikeFrameName(spr, el == null ? ATK_WIND + ATK_STRIKE * 0.5 : el); },
    hurtFrame(spr, hp) { return hurtFrameName(spr, hp == null ? 0.12 : hp); },
    // 逐像素比两张精灵：尺寸、完全相同的行数、第一个不相同的行、不同像素总数。
    // 手绘帧的验收全靠它 —— 帧只许改腿，腿以上的行必须和原图一模一样。
    spriteCmp(a, b) {
      const A = Sprites[a], B = Sprites[b];
      if (!A || !B) return null;
      const cv = document.createElement('canvas');
      const g = cv.getContext('2d');
      const grab = c => {
        cv.width = c.width; cv.height = c.height;
        g.clearRect(0, 0, c.width, c.height); g.drawImage(c, 0, 0);
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const da = grab(A), db = grab(B);
      let diff = 0, sameRows = 0, firstDiff = -1;
      for (let y = 0; y < A.height; y++) {
        let rd = 0;
        for (let x = 0; x < A.width; x++) {
          const i = (y * A.width + x) * 4;
          if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) rd++;
        }
        if (rd) { if (firstDiff < 0) firstDiff = y; diff += rd; } else sameRows++;
      }
      return { w: A.width, h: A.height, w2: B.width, h2: B.height, sameRows, diff, firstDiff };
    },
    // 一张精灵用到的所有颜色（十六进制）。用来守住占位符替换：
    // bandit 的帧里不允许出现 hanli 的袍绿，否则一整套帧都会花。
    spriteColors(name) {
      const c = Sprites[name];
      if (!c) return null;
      const cv = document.createElement('canvas');
      cv.width = c.width; cv.height = c.height;
      const g = cv.getContext('2d');
      g.drawImage(c, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const s = {};
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        s['#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')] = 1;
      }
      return Object.keys(s);
    },
    // 命中白闪用的是哪张图（必须是当前那一帧，不是原图），以及剪影尺寸对不对
    flashOf(spr, gait) {
      const tf = tfRun(0, 0, gait, 1, spr);
      const c = pickSpr(spr, tf);
      const w = whiteSpriteOf(c);
      return { frame: tf.frame, isFrame: !!tf.frame && c === Sprites[tf.frame], w: w ? [w.width, w.height] : null };
    },
    // 当前主角的袍色，以及四类帧是不是按这个袍色生成的。
    // 袍色随境界/护甲变，帧忘了跟着变，人一跑起来袍子就会闪一下回绿。
    heroLookNow() {
      const look = heroLook();
      const out = { look, actions: {} };
      for (const action of ['run', 'idle', 'strike', 'hurt']) {
        const want = window.buildHeroFrames ? window.buildHeroFrames(look, action) : null;
        out.actions[action] = {
          same: !!want && want.every((c, i) => c === Sprites['hanli_' + action + i]),
          n: want ? want.length : 0
        };
      }
      return out;
    },
    // 把一张精灵按指定变换画到离屏画布上量墨迹外框。
    // 用来守两件事：① 无变换时角色没有被挪位；② 命中白闪是剪影，不是一个白方块。
    // tf 上挂着帧名时画那一帧（和 drawSpr 走同一条 pickSpr，不然量到的是没在动的那一张）。
    spriteProbe(name, sc, tf, white) {
      const c = white ? whiteSprite(name) : (tf && tf.frame && Sprites[tf.frame] ? Sprites[tf.frame] : Sprites[name]);
      if (!c) return null;
      const SZ = 120, s = sc == null ? 1 : sc;
      const cv = document.createElement('canvas');
      cv.width = SZ; cv.height = SZ;
      const g = cv.getContext('2d');
      blitSprOn(g, c, 60, 60, s, false, tf || null, null);
      const d = g.getImageData(0, 0, SZ, SZ).data;
      let x0 = SZ, y0 = SZ, x1 = -1, y1 = -1, ink = 0, hash = 0;
      for (let y = 0; y < SZ; y++) {
        for (let x = 0; x < SZ; x++) {
          const a = d[(y * SZ + x) * 4 + 3];
          if (!(a > 8)) continue;
          ink++;
          hash = (hash + (y * SZ + x) * a) % 1000000007;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      return {
        x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1,
        cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2,
        ink, hash, box: SZ * SZ, sw: c.width, sh: c.height
      };
    },
    breakList() { return JSON.parse(JSON.stringify(window.BREAKTHROUGH || [])); },    breakMissing(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); return b ? breakMissing(b).map(m => ({ kind: m.kind, id: m.id || null, name: m.name || null, need: m.need, have: m.have })) : null; },
    breakCan(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); return b ? canBreak(b) : true; },
    breakMiss(lv) {
      const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv);
      return b ? missLabels(b) : [];
    },
    breakNow(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); if (!b) return 'no req'; G.breakCur = b; const ok = doBreakNow(); return { ok: ok, pending: G.breakPending, lv: G.player ? G.player.level : null, cult: save.cultivate.level }; },
    breakLuck(v) { G.breakForce = (v == null) ? null : !!v; return G.breakForce; },   // 调试：固定冲关成败
    breakRate(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); return b ? { pills: breakGatePills(b), rate: breakSuccessRate(b) } : null; },
    startBreak(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); if (!b) return 'no req'; enterBreakMap(b); return { map: (G.state === 'prefight' && G.pf) ? G.pf.id : (G.mapId || (G.pf && G.pf.id) || null), state: G.state }; },
    breakScene(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); if (!b) return 'no req'; breakSceneThen(b, () => { G.state = 'cave'; if (elCave) elCave.style.display = 'flex'; renderCave(); }); return { scene: G.breakScene, dialog: G.state === 'dialog', lines: G.dialogLines ? G.dialogLines.length : 0 }; },
    finishMapNow() { if (!G.map) return 'no map'; const m = G.map; finishMap(m); return { state: G.state, level: save.cultivate.level, cleared: save.cleared.slice(), unlocked: save.unlocked.slice(), caves: save.caves.slice() }; },
    breakOpen(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); openBreak(b); return !!(elBreak && elBreak.style.display === 'flex'); },
    breakShown() { return !!(elBreak && elBreak.style.display === 'flex'); },
    breakClose() { closeBreak(); return !!(elBreak && elBreak.style.display === 'flex'); },
    breakPending() { return G.breakPending ? G.breakPending.lv : null; },
    // 小境界门（原著点名处）调试口：查关、查可过、直接灌修为、看卡在哪一关
    minorList() { return JSON.parse(JSON.stringify(window.MINOR_BREAKS || [])); },
    minorAt(lv) { const m = minorReqFor(lv); return m ? { lv: m.lv, realm: m.realm, item: m.item } : null; },
    minorCan(lv) { const m = minorReqFor(lv); return m ? minorHave(m) > 0 : true; },
    addCultXp(amount) {
      const before = save.cultivate.level || 1;
      const lv = addCultivateXp(amount || 1);
      return { before, after: lv, xp: save.cultivate.xp || 0, minorPending: G.minorPending ? { lv: G.minorPending.lv, realm: G.minorPending.realm, item: G.minorPending.item } : null, breakPending: G.breakPending ? G.breakPending.lv : null };
    },
    minorPending() { return G.minorPending ? { lv: G.minorPending.lv, realm: G.minorPending.realm, item: G.minorPending.item } : null; },
    shaDan(lv) {
      const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv) || null;
      return { count: save.shaDan || 0, penalty: shaDanPenalty(), cost: b ? shaDanCost(b) : null, ready: shaDanReady(b) };
    },
    sealed() { return save.sealed ? Object.assign({}, save.sealed) : null; },
    // 天人有五衰（后传 X2C327）：查账 / 押注 / 直接结算，供测试用
    wu(lv) {
      const b = lv ? breakReqFor(lv) : null;
      const st = wuState();
      return {
        layers: wuLayers(), penalty: wuPenalty(),
        log: JSON.parse(JSON.stringify(st.log || {})),
        gate: b && b.wushuai ? {
          lv: b.lv, canAvoid: wuCanAvoid(b), maxStake: wuMaxStake(b),
          pay: wuPayId(b), have: wuHave(b),
          per: wuStakeCost(b, 1), cost: (b.wushuai.cost != null) ? b.wushuai.cost : 3,
          rates: [0, 1, 2, 3].map(k => ({ k: k, rate: wuRate(b, k), take: wuTake(b, k) }))
        } : null
      };
    },
    wuStake(lv, k) {
      const b = breakReqFor(lv); if (!b || !b.wushuai) return 'no wushuai gate';
      const maxK = wuMaxStake(b);
      G.wuStake = Math.max(0, Math.min(maxK, k | 0));
      return { k: G.wuStake, rate: wuRate(b, G.wuStake), take: wuTake(b, G.wuStake), paid: payWuStake(b, G.wuStake) };
    },
    wuSettle(lv, ok, k) {
      const b = breakReqFor(lv); if (!b || !b.wushuai) return 'no wushuai gate';
      const take = settleWushuai(b, !!ok, k | 0);
      return { take: take, layers: wuLayers(), early: wuEarly(lv) };
    },
    wuClear() { const st = wuState(); st.n = 0; st.log = {}; G.wuStake = 0; writeSave(); return wuLayers(); },
    warp(sec) { G.time += (sec || 0); return +G.time.toFixed(1); },
    skillState() { return { learned: Object.assign({}, cultObj().skills), learnedManuals: Object.assign({}, save.learnedManuals), equipped: equippedOf().slice(), slots: slotCapOf(Math.max(save.cultivate.level || 1, save.best.level || 1)) }; },
    // 身上正在生效的限时增益（服丹 / 催符所得），t 是剩余时间
    buffs() { return (G.buffs || []).map(b => ({ stat: b.stat, amount: b.amount, t: +b.t.toFixed(2), dur: b.dur, name: b.name })); },
    setSkill(id, on) { return on ? equipSkill(id) : unequipSkill(id); },
    learn(id) { return learnSkill(id); },
    trimSkills() { return trimSkillsToMain(); },
    quick() { return JSON.parse(JSON.stringify(save.quick || [null, null, null])); },
    setQuick(i, kind, id) { setQuick(i, kind, id); return JSON.parse(JSON.stringify(save.quick)); },
    useQuick(i) { const sl = quickSlot(i); useQuick(i); return { cd: (G.quickCd || []).slice(), slot: sl }; },
    givePet(id) { if ((save.pets || []).indexOf(id) < 0) (save.pets = save.pets || []).push(id); save.pet = id; writeSave(); return save.pet; },
    heroSkin() { return Object.assign({}, heroLook()); },
    equipTo(id) { equipGear(id); return Object.assign({}, save.equip); },
    grant(stones) { save.stones = Math.round((save.stones || 0) + (stones || 0)); writeSave(); return save.stones; },
    freeCount(id) { return sellableCount(id); },
    sell(id, all) { sellItem(id, !!all); return { left: save.inventory[id] || 0, stones: save.stones || 0 }; },
    sellMat() { const before = save.stones || 0; sellAllMaterials(); return { stones: save.stones || 0, gained: (save.stones || 0) - before }; },
    decomp(id, all) { decomposeItem(id, !!all); return { left: save.inventory[id] || 0 }; },
    toasts() { return toastRows.map(r => ({ id: r.item.id, name: r.item.name, n: r.n })); },
    toastCount() { return Math.min(TOAST_KEEP, toastRows.length) + (toastRows.length > TOAST_KEEP ? 1 : 0); },
    toastDemo() {
      const pool = ['m_chijing', 'm_huangjing', 'm_jingtie', 'm_fuzhi', 'm_lingmo', 'm_shedan', 'm_yusui', 'm_chitong'];
      for (const id of pool) { const it = Items.get(id); if (it) itemToast(it); }
      return { rows: toastRows.length, shown: this.toastCount() };
    },
    // 横幅压测：返回提示是否已被让位（内联 top 让到横幅实测下沿）
    banner(t) { banner(t || '测试横幅'); return !!(elBanner && elBanner.style.display === 'block'); },
    bannerDown() { return !!(elBanner && elBanner.style.display === 'block'); },
    skin(name) { if (name === undefined) return save.skin; applySkin(name === 'guigu' ? 'guigu' : 'jin'); return save.skin; },
    grassTile() { return buildGrass._tile || null; },
    wash() { return parallaxLayers().frame; },
    // 批次4 验收口：查逐图台账加载状态 / 当前图参数 / 地标 / 贴地层。不暴露 canvas（跨边界会丢属性）
    renderOnce() { if (G.state === 'play') { render(); return true; } return false; },
    scenery3Enable(v) { SC3_ENABLED = !!v; sc3Cache = null; return SC3_ENABLED; },
    scenery3() {
      const s = ensureScenery3();
      return {
        on: s.on, sample: Array.from(SC3_SAMPLE), types: SC3_TYPES.slice(),
        codexLoaded: !!SC3_CODEX, codexSize: SC3_CODEX ? Object.keys(SC3_CODEX).length : 0,
        mapId: s.on ? s.mapId : null, tone: s.on ? s.tone : null, skin: s.on ? s.skin : null,
        darkBase: s.on ? !!s.dark : null,
        styleLoaded: !!SC3_STYLE,
        paper: SC3_PAPER ? { base:SC3_PAPER.base, a:SC3_PAPER.a, b:SC3_PAPER.b } : null,
        paperPat: s.on ? !!s.paperPat : false,
        composition: (s.on && s.composition) ? { layout:s.composition.layout, breath:s.composition.breath, clusters:s.composition.clusters, palette:s.composition.palette.slice(), focusCase:s.composition.focusCase, focusScale:s.composition.focusScale } : null,
        focus: (s.on && s.focus) ? { kind:s.focus.kind, name:s.focus.name, layout:s.focus.layout, x:+s.focus.x.toFixed(1), y:+s.focus.y.toFixed(1), s:s.focus.s, hasSpr:!!s.focus.spr } : null,
        // 第104轮验收探针：主景精灵的 alpha 分布，证明新增 big case 不是空白 / 不是实心墨块
        focusA: s.on ? sc3TerrainAlpha(s.focus && s.focus.spr) : null,
        decorCount: G.decor.length,
        // 构图验收探针（只在 QA 调试口算，不进渲染热路径）：
        // decorKinds 证明装饰种类已按 palette 收窄；decorNN 是同种装饰最近邻距离中位数，
        // 聚落成丛时应远小于「逐格均匀撒点」的期望值。
        decorKinds: (() => { const o = {}; for (const d of G.decor) o[d.type] = (o[d.type] || 0) + 1; return o; })(),
        decorNN: (() => {
          const ds = G.decor; if (ds.length < 4 || ds.length > 200) return null;
          const by = {}; for (const d of ds) (by[d.type] || (by[d.type] = [])).push(d);
          const r = [];
          for (const k in by) { const a = by[k];
            for (let i = 0; i < a.length; i++) { let best = Infinity;
              for (let j = 0; j < a.length; j++) if (i !== j) {
                const q = Math.hypot(a[i].x - a[j].x, a[i].y - a[j].y); if (q < best) best = q;
              }
              if (best < Infinity) r.push(best);
            }
          }
          r.sort((a, b) => a - b);
          return r.length ? +r[Math.floor(r.length / 2)].toFixed(1) : null;
        })(),
        paletteInk: s.on ? s.C.ink : null,   // 验收探针：配景淡墨（普通字符串，跨边界不丢）
        focusInk: (s.on && s.CF) ? s.CF.ink : null,   // 主景浓墨，应恒比配景更黑；不分浅底/深底两套
        decorScheme: s.on ? s.decor.map(x => x.slice()) : null,
        landmarks: s.on ? s.landmarks.map(l => ({ kind: l.kind, name: l.name, x: +l.x.toFixed(1), y: +l.y.toFixed(1), hasSpr: !!l.spr })) : [],
        terrain: s.on ? s.terrain.slice() : null,
        terrainPat: s.on ? !!s.terrainPat : false,
        terrainA: s.on ? sc3TerrainAlpha(s.terrainTile) : null,
        spriteKinds: s.on ? Object.keys(s.spr) : [],
        // 第102轮验收探针：mood 参数 / 积墨罩是否烘出 / alpha 分布（证明软边非硬块）/ UI 柔化作用域
        mood: (s.on && s.mood) ? { name:s.mood.name, gloom:s.mood.gloom, vignette:s.mood.vignette, haze:s.mood.haze, focusInk:s.mood.focusInk, signature:s.mood.signature || null } : null,
        moodSignature: (s.on && s.mood && s.moodTile) ? SC3_SIG : null,
        moodTile: s.on ? !!s.moodTile : false,
        moodA: s.on ? sc3TerrainAlpha(s.moodTile) : null,
        moodDraws: SC3_MOOD_DRAWS,
        uiSoft: (typeof document !== 'undefined' && document.body && document.body.classList) ? document.body.classList.contains('sc3-paper') : false,
        softRing: !!(s.on && save && save.skin === 'guigu'),
        zones: G.zones.length, hazards: G.hazards.length
      };
    },
    cave(id) { if (CAVES[id] && save.caves.indexOf(id) < 0) { save.caves.push(id); writeSave(); } openCave(id); return G.caveId; },    openAllCaves() { for (const k in CAVES) if (save.caves.indexOf(k) < 0) save.caves.push(k); writeSave(); renderWorldMap(); return save.caves.length; },
    caveTab(t) { G.caveTab = t; if (G.state === 'cave') renderCave(); return G.caveTab; },
    equip(id) { equipGear(id); return save.equip; },
    unequip(slot) { unequipSlot(slot); return save.equip; },
    craft(rid) { craftRecipe(rid); return 'ok'; },
    hintOf(id) { return itemHintOf(id); },
    rest(n) { doRest(n || 1); return save.cultivate.level; },
    addMat(id, n) { const it = Items.get(id); if (!it) return 'no item'; save.inventory[id] = (save.inventory[id] || 0) + (n || 1); save.totalItems = (save.totalItems || 0) + (n || 1); writeSave(); if (G.state === 'cave') renderCave(); return save.inventory[id]; },
    addMats(n) { const pool = (G.map && G.map.mats) || ['m_chijing', 'm_jingtie', 'm_fuzhi', 'm_lingmo']; for (const id of pool) { save.inventory[id] = (save.inventory[id] || 0) + (n || 3); save.totalItems = (save.totalItems || 0) + (n || 3); } writeSave(); if (G.state === 'cave') renderCave(); return pool.length; },
    mats() { const o = {}; for (const k in save.inventory) if (Items.mat(k)) o[k] = save.inventory[k]; return o; },
    setLevel(n) { save.cultivate.level = Math.max(1, n || 1); save.cultivate.xp = 0; syncBestLevel(); clearWoundedIfDone(); writeSave(); if (G.state === 'cave') renderCave(); return save.cultivate.level; },
    // 3 分钟单局循环的调试口
    sha(n) { if (n != null) gainSha(n); return { v: G.sha ? G.sha.v : 0, need: G.sha ? G.sha.need : 0, pending: (G.sha && G.sha.pending) || 0, dmgT: (G.sha && G.sha.dmgT) || 0 }; },
    insight() { return JSON.parse(JSON.stringify(G.insight || {})); },
    insightRoll() { return rollInsight().map(c => ({ kind: c.kind, name: c.name, id: c.id || null })); },
    insightAuto() {
      if (G.state !== 'levelup' || !G.cardsNow || !G.cardsNow.length) return false;
      const c = G.cardsNow[0];
      G.cardsNow = null;
      if (elLevelup) elLevelup.style.display = 'none';
      onPick(c);
      return true;
    },
    refineCost() { const i = G.insight || {}; return REFINE_COST[i.refine || 0] == null ? null : REFINE_COST[i.refine || 0]; },
    // ---- 自动战斗（供回归：能不能开、按钮亮不亮、对白与选卡到底推没推进）----
    autoMode(on) { if (on === undefined) return !!G.autoOn; setAuto(!!on, true); return !!G.autoOn; },
    // 手动喂若干帧给自动逻辑（不走 rAF，测试能快进）
    autoTick(n, dt) {
      for (let i = 0; i < (n || 1); i++) tickAuto(dt || 0.05);
      return { on: !!G.autoOn, state: G.state, t: +(G.autoT || 0).toFixed(2), idx: G.dialogIdx || 0 };
    },
    autoPick() { return autoPickCard(); },
    // 躲的探针：这一帧看到了几个威胁、该往哪让（回归用它验「真躲开」而不是「真跑开」）
    autoDodgeInfo() {
      const p = G.player;
      if (!p) return null;
      const th = autoThreats(p);
      const dir = G.autoOn ? autoDodgeDir(p) : null;
      return {
        on: !!G.autoOn, state: G.state, threats: th.length,
        dir: dir ? { x: +dir.x.toFixed(2), y: +dir.y.toFixed(2), back: !!dir.back } : null,
        anchor: G.autoAnchor ? { x: +G.autoAnchor.x.toFixed(1), y: +G.autoAnchor.y.toFixed(1) } : null,
        px: +p.x.toFixed(1), py: +p.y.toFixed(1), hp: Math.ceil(p.hp)
      };
    },
    // 朝玩家打一发弹幕（测试「会不会侧身让开」用）
    autoShot(dist, spd, dmg) {
      const p = G.player;
      if (!p) return null;
      const d = dist || 220, a = Math.random() * 6.28;
      const sx = p.x + Math.cos(a) * d, sy = p.y + Math.sin(a) * d;
      const ang = Math.atan2(p.y - sy, p.x - sx);
      G.ebullets.push({ x: sx, y: sy, vx: Math.cos(ang) * (spd || 170), vy: Math.sin(ang) * (spd || 170), r: 6, dmg: dmg || 10, life: 5 });
      return { x: +sx.toFixed(1), y: +sy.toFixed(1), n: G.ebullets.length };
    },
    autoInfo() {
      const p = G.player;
      return {
        on: !!G.autoOn, state: G.state, t: +(G.autoT || 0).toFixed(2),
        btn: elAutoBtn ? elAutoBtn.style.display : null,
        lit: elAutoBtn ? elAutoBtn.classList.contains('on') : null,
        cards: G.cardsNow ? G.cardsNow.length : 0,
        // should = 按规则此刻该不该出现（DOM 的 display 要等下一帧渲染，断言用这个更准）
        should: autoBtnAllowed(),
        map: G.map ? G.map.id : null, mapType: G.map ? G.map.type : null,
        px: p ? +p.x.toFixed(1) : null, py: p ? +p.y.toFixed(1) : null
      };
    },
    // 直接吃一张指定的 C 卡（绕过随机），验证「卡面 → 真实落点」：应写 runP，不写永久加成 G.bonus
    insightPickC(k) {
      const p = PASSIVE_MODS.find(x => x.k === k) || PASSIVE_MODS[0];
      onPick({ key: 'C' + p.k, kind: 'C', icon: '🌀', mod: p, name: p.name, desc: '' });
      return { k: p.k, runP: rp(p.k), bonus: G.bonus[p.k] || 0, cap: p.cap == null ? null : p.cap,
        r: pickupR(), full: viewPickR(), isFull: pickupFull() };
    },
    // 顿悟加成探针：给定功法 + mod，返回这门功法「这一次出手」的真实配置
    // （用来验收「卡面描述」和「真实施法参数」是否一致）
    atkProbe(id, mods) {
      const s = window.skillById(id); if (!s || !s.atk) return null;
      const bak = G.insight;
      G.insight = { skills: {}, n: 0, refine: 0 };
      if (mods) G.insight.skills[id] = mods;
      const out = insightAtk(id, s.atk);
      G.insight = bak;
      return out;
    },
    modKeys(id) { const s = window.skillById(id); return skillModsFor(s).map(m => m.k); },
    // 顿悟的被动卡池（含数值与上限），供回归断言「卡面写的 = 实际生效的」
    passiveMods() { return PASSIVE_MODS.map(m => ({ k: m.k, v: m.v, cap: m.cap == null ? null : m.cap, name: m.name })); },
    // 当前拾取半径（px）—— 用来验证「拾取范围 +30%」确实放大了半径
    pickR() { return pickupR(); },
    // 未封顶的原始半径 / 整屏所需半径 / 是否已覆盖全屏（验证「无限叠加到全屏」）
    pickInfo() { return { raw: pickupRaw(), r: pickupR(), full: viewPickR(), isFull: pickupFull(), stacked: rp('pickup'), cap: null }; },
    // 直接叠一层本局被动（模拟抽中 C 卡，绕过随机）
    addRunPassive(k, v) { G.runP[k] = (G.runP[k] || 0) + v; if (k === 'maxhp') recalcMaxhp(true); return G.runP[k]; },
    // 真实生效的乘数快照：用来断言「卡面写的 = 实际吃到的」
    runStats() {
      return { spd: +spdMul().toFixed(3), armor: +armorRate().toFixed(3), pick: +pickupR().toFixed(2),
        maxhp: G.player ? G.player.maxhp : 0, runP: JSON.parse(JSON.stringify(G.runP || {})) };
    },
    openRefine() { openRefine(); return G.state; },
    stage() { return G.player ? stageLabel(G.player) : ''; },
    resetRunBuffs() { resetRunBuffs(); return true; },
    dash() { return dashPlayer(); },
    summon() { spawnSummon(); return G.summon ? { name: G.summon.name, spr: G.summon.spr, max: G.summon.max } : null; },
    summonState() { const s = G.summon; return s ? { t: +s.t.toFixed(2), max: s.max, name: s.name, spr: s.spr } : null; },
    summonBullets() { return G.bullets.filter(b => b.summon).length; },
    hasFormula(rid) { const r = Recipes.get(rid); return r ? hasFormula(r) : null; },
    rebuild(lv) { const ok = rebuildTo(lv); return { ok: ok, lv: save.cultivate.level, wounded: save.wounded || null }; },
    unlockAll() { for (const m of MAPS) if (save.unlocked.indexOf(m.id) < 0) save.unlocked.push(m.id); writeSave(); renderWorldMap(); return save.unlocked.length; },
    shop(tab) { openShop(tab); return G.shopTab; },
    stones(n) { save.stones = Math.max(0, Math.round((save.stones || 0) + (n == null ? 100 : n))); writeSave(); renderShop(); renderWorldMap(); refreshTitle(); return save.stones; },
    levelUp(n) { for (let i = 0; i < (n || 1); i++) { const p = G.player; p.level++; p.next = xpNeed(p.level); } },
    realm(n) {
      if (!G.player) return '未开始';
      G.player.level = Math.max(1, n || 1);
      G.realmIdx = 0; G.realm = { dmg: 0, atk: 0, spd: 0 }; G.realmHp = 0;
      checkRealm(true);
      recalcMaxhp(); G.player.hp = G.player.maxhp;
      syncCultivate();
      return realmName(G.player.level);
    },
    combo(n) { G.combo = n || 0; G.comboT = 3; showCombo(); return G.combo; },
    openLevel() { if (G.state === 'play') queueLevelUp(); },
    addSkill(id, n) {
      const def = SKILLS.find(s => s.id === id); if (!def || !G.player) return;
      const lv = Math.min(def.max, (G.player.skills[id] || 0) + (n || 1));
      G.player.skills[id] = lv;
      syncCultivate();
    },
    maxAll() {
      if (!G.player) return;
      for (const s of SKILLS) G.player.skills[s.id] = s.max;
      recalcMaxhp(); G.player.hp = G.player.maxhp;
      syncCultivate();
    },
    heal() { if (G.player) G.player.hp = G.player.maxhp; },
    god(on) { G.god = !!on; },
    timeScale(v) { G.ts = v; },
    setTime(t) { G.time = t; },
    clear() { G.enemies.length = 0; G.ebullets.length = 0; G.gems.length = 0; G.herbs.length = 0; G.tells.length = 0; G.zones.length = 0; G.hazards.length = 0; },
    spawn(type, n) {
      if (!G.player || !ENEMY_TYPES[type]) return;
      for (let i = 0; i < (n || 1); i++) {
        const a = Math.random() * 6.28, dd = U.rand(120, 240);
        G.enemies.push(makeEnemy(type, G.player.x + Math.cos(a) * dd, G.player.y + Math.sin(a) * dd, hpMulBase(), dmgMulBase()));
      }
    },
    elite(i) { if (G.player) spawnElite(i || 0); },
    boss(kind) {
      if (!G.player) return;
      if (G.boss) return '已有 Boss';
      if (kind) { G.map = Object.assign({}, G.map, { boss: Object.assign({}, (G.map && G.map.boss) || {}, { kind }) }); }
      spawnBoss(); return G.boss ? G.boss.name : 'fail';
    },
    bossDamage(pct) { if (G.boss) damageEnemy(G.boss, G.boss.maxhp * (pct || 0.25)); },
    killBoss() { let n = 0; while (G.boss && n++ < 12) damageEnemy(G.boss, G.boss.hp); },
    phase2() { if (G.boss && !G.boss.phase2) startPhase2(); },
    story(id) {
      const s = STORY.find(x => x.id === id);
      if (s) { s.done = true; showLines(s.lines, () => { applyStoryReward(s); G.state = 'play'; last = performance.now(); }, s.id); return id; }
      const l = MAP_STORIES[id];
      if (l) { showLines(l, () => { G.state = 'play'; last = performance.now(); }, id); return id; }
      return '无此剧情';
    },
    loot(rarity) {
      if (!G.player) return '未开始';
      const pool = Items.byRarity(rarity == null ? 2 : rarity);
      const it = U.pick(pool); if (!it) return '无此类道具';
      const a = Math.random() * 6.28;
      G.loot.push({ x: G.player.x + Math.cos(a) * 45, y: G.player.y + Math.sin(a) * 45, r: 9, bob: 0, item: it });
      return RARITY[it.rarity].name + '·' + it.name;
    },
    dropRandom(tier) {
      if (!G.player) return '未开始';
      dropLoot(G.player.x + U.rand(-40, 40), G.player.y + U.rand(-40, 40), tier || 0);
      return 'ok';
    },
    collect() { return G.player ? collectAllPickups() : 0; },
    bonus() { return Object.assign({}, G.bonus); },
    inventory() { return { total: save.totalItems || 0, stones: save.stones || 0, bonuses: Object.assign({}, save.bonuses), items: Object.assign({}, save.inventory) }; },
    setSetting(k, v) {
      if (k !== 'autoSave' && k !== 'manualSave') return 'unknown';
      save.settings[k] = !!v; writeSave(); syncSettingsUI(); return save.settings[k];
    },
    saveNow() { return manualSave() ? 'saved' : 'disabled'; },
    clearProgress() {
      resetAllProgress();
      writeSave();
      renderWorldMap();
      return '已清空进度（存档重来）';
    },
    // 转世重修：预览 / 执行 / 读余荫池（供守门断言）
    previewRebirth() { return rebirthPreview(); },
    rebirth() { return doRebirth(); },
    rebirthPool() {
      const p = rebirthPool();
      return { cycles: p.cycles, stats: Object.assign({}, p.stats) };
    },
    rebirthResetPool() { writeRebirthPool({ cycles: 0, stats: {} }); REBIRTH = rebirthPool(); return 'rebirth pool cleared'; },
    // 功法收敛（打图后 Top3）：供守门断言
    pruneNow() { const r = pruneSkillsTop3(); return { kept: r.kept, cut: r.cut, skills: Object.assign({}, cultObj().skills), equipped: (cultObj().equipped || []).slice() }; },
    save: {
      read: () => localStorage.getItem(SAVE_KEY),
      clear: () => { localStorage.removeItem(SAVE_KEY); return '已清除存档'; },
      wins: (v) => { save.wins = v; writeSave(); return '通关次数=' + v; }
    },
    // 修为（存档里的那一档，进阶门的门槛认它，不认本局 G.player.level）
    cultLevel(n) {
      if (n == null) return save.cultivate.level || 1;
      save.cultivate.level = Math.max(1, n | 0); writeSave(); return save.cultivate.level;
    },
    sfx(name) { if (typeof Sfx[name] === 'function') { Sfx[name](); return 'played:' + name; } return 'no such sfx'; },
    sfxList: ['hit', 'shoot', 'fire', 'nova', 'gem', 'heal', 'buff', 'burst', 'hurt', 'enemyDie', 'boss', 'warn', 'bossPhase', 'levelup', 'win', 'lose']
  };

  // 数据层补标：items.js 在加载时给 MATERIALS 打 .mat=true，
  // 但 late.js / late2.js / late3.js / value.js 是在 items.js 之后才 push 进 MATERIALS 的，
  // 那些后补材料漏了 .mat，导致杂材柜在数据层不被认作材料（无「材料」标签、不计入炼丹材料）。
  // game.js 最后加载，此刻所有 push 都已发生，统一补一次，确保数据层一致。
  for (const m of (window.MATERIALS || [])) m.mat = true;

  buildGrass();
  refreshTitle();
  syncMute();
  syncSettingsUI();
  // 老存档：手里已握着可移栽的灵药（如芝龙果），读档即留一株作种入园
  {
    const _tr = autoTransplant(true);
    if (_tr.length) setTimeout(function () { try { banner('移栽入园 · ' + _tr.map(m => m.name).join('、') + ' ×1 · 此后定期可采'); Sfx.gem(); } catch (e) {} }, 1250);
  }
  if (pendingZhujiGift) {
    pendingZhujiGift = false;
    setTimeout(function () { try { banner('宗门旧例 · 补授筑基丹一枚'); Sfx.buff(); } catch (e) {} }, 900);
  }
  if (pendingTenglongGift) {
    pendingTenglongGift = false;
    setTimeout(function () { try { banner('木族旧账 · 补授《腾龙丹方》一枚'); Sfx.buff(); } catch (e) {} }, 1100);
  }
  if (pendingZhilongPlant) {
    pendingZhilongPlant = false;
    setTimeout(function () { try { banner('旧账 · 灵界药圃补种芝龙果一株'); Sfx.gem(); } catch (e) {} }, 1500);
  }
  if (pendingHetiGift) {
    pendingHetiGift = false;
    setTimeout(function () { try { banner('旧账 · 补发万妙丹一枚（合体关已可再试）'); Sfx.buff(); } catch (e) {} }, 1700);
  }
  requestAnimationFrame(loop);
})();
