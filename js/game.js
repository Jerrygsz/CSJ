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
      // 生涯累计（跨局、跨图、跨轮回都不清零）：首页报的是这些，不是单局最高
      totalKills: 0, playTime: 0,
      inventory: {}, bonuses: {}, totalItems: 0,
      stones: 0, cleared: [], unlocked: ['qixuan'], mapId: 'qixuan',
      // 跨地图永久修为：等级与功法只增不减，回刷低级图也不会退回去
      cultivate: { level: 1, xp: 0, skills: { sword: 1 } },
      // 已装备的槽位（id 需仍在储物袋中）
      equip: { weapon: null, armor: null, trinket: null, talisman: null },
      caves: [], diffClear: {}, lastDiff: 'easy',
      // 药圃：按地块各记一份（{地块id: 已长成次数}），在战斗图里待 1 秒每块各长 1 次，满 99 停；
      // gardenTick 是所有地块共用的、不足 1 秒的零头
      gardenCharge: {}, gardenTick: 0,
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
        wounded: (s.wounded && typeof s.wounded === 'object') ? s.wounded : null,
        // 天人有五衰：老存档没有这个字段，读进来补成空账（压在身上的衰为 0）
        wushuai: (s.wushuai && typeof s.wushuai === 'object')
          ? { n: Math.max(0, (s.wushuai.n || 0) | 0), log: (s.wushuai.log && typeof s.wushuai.log === 'object') ? s.wushuai.log : {} }
          : { n: 0, log: {} }
      };
      // 老存档：已通关的剧情图自动补成洞府
      for (const id of save.cleared) { const m = MAPS.find(x => x.id === id); if (m && m.cave && save.caves.indexOf(m.cave) < 0) save.caves.push(m.cave); }
      normalizePets();
      // 养过的灵宠 / 同伴，若名字已不在表里就清掉（改过数据的老存档）
      if (save.pet && !petDefOf(save.pet)) save.pet = null;
      if (save.mate && !(window.MATES || []).some(m => m.id === save.mate)) save.mate = null;
      save.mates = (save.mates || []).filter(id => (window.MATES || []).some(m => m.id === id));
    } catch (e) {}
  }
  function writeSave() { try { save.stones = Math.round(save.stones || 0); localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  loadSave();
  // 旧档补发：血色禁地已经通关，宗门该赏的那一枚筑基丹却没到手（本版才补上的剧情奖励）。
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
    spawnT: 0, nextEliteT: 100, eliteIdx: 0,
    boss: null, bossActive: false, bossSpawned: false, bossWarned: false,
    frostR: 0, shake: 0, flash: 0, god: false, ts: 1,
    bonus: {}, realm: { dmg: 0, atk: 0, spd: 0 }, realmIdx: 0, realmHp: 0, gear: {},
    combo: 0, comboT: 0, hitStop: 0, lastCombo: -1, comboTier: 0,
    vacuumT: 0, pendingEnding: false, runLoot: [], lastAutoSave: 0,
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
  // 地图打完：只留三门练得最精的功法（等级原样带去下张图），余者散去。
  // 同层随机留 —— 「随机保留三个升级最高的」；剧情传世功法不在此列。
  // 进图前运哪几门，照旧走「战前运功」自选，等级沿用。
  function pruneSkillsTop3() {
    const c = cultObj();
    const ids = Object.keys(c.skills).filter(id => (c.skills[id] || 0) > 0);
    const keep = [];
    const rest = [];
    for (const id of ids) (isUniqueTaught(id) ? keep : rest).push(id);
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
  // 被动加成全部走「功法属性」聚合：新旧被动功法一起算，练到几层就给几层的力
  function hasteMul() { return Math.pow(0.92, (passiveSum('atkSpd') + buffSum('atkSpd')) / 0.08); }
  function spdMul() { return 1 + rb('spd') + passiveSum('spd') + buffSum('spd') + G.realm.spd + gb('spd') + rp('spd'); }
  function atkMul() { return 1 / (1 + rb('atkSpd') + (G.bonus.atkSpd || 0) + gb('atkSpd') + G.realm.atk); }
  function dmgMul() { return (1 + rb('dmg') + (G.bonus.dmg || 0) + gb('dmg')) * (1 + G.realm.dmg) * (1 + passiveSum('dmg') + buffSum('dmg')); }
  // 拾取半径原始值（不封顶）：顿悟卡 rp('pickup') 无上限，可以一直往上叠
  function pickupRaw() {
    return 46 * (1 + passiveSum('pickup') + buffSum('pickup')) * (1 + rb('pickup') + (G.bonus.pickup || 0) + gb('pickup') + rp('pickup'));
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
      return '<div class="bpip" title="' + b.name + '　' + nm + amt + '"><span>' + (b.icon || '✨') + '</span><b>' + nm + Math.ceil(b.t) + '</b></div>';
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
        itemToast(item, '境界不足 · 需' + realmName(item.req));
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
  // 灵界成品池最低门槛：跟着地图修为段走 —— 黑凤族 72（化神旧宝），越往魔界/魔源海越往上抬，
  // 到小灵天之后封顶 160。这样黑凤族掉的是飞升带下来的旧宝，魔界深处掉的才是灵界本地器物。
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

  function fireWeapons(dt) {
    const p = G.player;
    for (const e of equippedActives()) {
      const a = e.s.atk;
      if (a.kind === 'orbit' || a.kind === 'field') continue;  // 近身领域交给 updateAuras
      const key = 't_' + e.id;
      p[key] = (p[key] || 0) - dt;
      if (p[key] > 0) continue;
      const tgt = nearestEnemy(a.range || 420);
      if (!tgt && a.kind !== 'burst') { p[key] = 0.2; continue; }
      // 本局顿悟/祭炼对本门功法的加成，只改这一次出手用的配置
      const a2 = insightAtk(e.id, a);
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
        pushBullet({ x: p.x, y: p.y, vx: Math.cos(ang) * 360, vy: Math.sin(ang) * 360, r: 6, dmg, life: a.life || 1.4, pierce, hit: new Set(), home: false, fx: a.vfx || 'sword', vfx: a.vfx || 'sword', ang: ang, stun: a.stun || 0, leech: a.leech || 0 });
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
        pushBullet({ x: p.x, y: p.y, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160, r: 7, dmg, life: a.life || 3, pierce: 1, hit: new Set(), home: true, fx: a.vfx || 'snake', vfx: a.vfx || 'snake', ang: ang, phase: Math.random() * 6.28, stun: a.stun || 0 });
      }
      if (struck) spawnRune(p.x, p.y, 22, VFX_HIT_COLOR[a.vfx || 'snake']);
      Sfx.fire();
    } else if (a.kind === 'spread') {
      // 远程扇形：三焰扇一类，正面一片都过不去（三色火轮着扇）
      const ang0 = Math.atan2(tgt.y - p.y, tgt.x - p.x);
      for (let i = 0; i < cnt; i++) {
        const ang = ang0 + (i - (cnt - 1) / 2) * (a.spread || 0.5);
        pushBullet({ x: p.x, y: p.y, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, r: 7, dmg, life: a.life || 1.2, pierce: 1, hit: new Set(), home: false, fx: a.vfx || 'fan', vfx: a.vfx || 'fan', ang: ang, hue: i % 3 });
      }
      if (struck) spawnRune(p.x, p.y, 26, VFX_HIT_COLOR[a.vfx || 'fan']);
      Sfx.fire();
    } else if (a.kind === 'burst') {
      // 中心爆发：定神符的金光一炸 / 其它以己身为心的爆发
      if (struck) spawnRune(p.x, p.y, 30, VFX_HIT_COLOR[a.vfx || 'gold']);
      novaBlast(p.x, p.y, window.skillAtk.rad(a, lv), dmg, a.vfx || 'gold');
    } else if (a.kind === 'thunder') {
      // 天落雷：辟邪神雷劈当面数敌，每一道都要看得见是从天上打下来的
      const pool = allEnemies().filter(x => U.dist(p.x, p.y, x.x, x.y) < (a.range || 560));
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
      color: vfx === 'qingmang' ? '#9df0d0' : vfx === 'corpsefire' ? '#5fe08a' : vfx === 'soul' ? '#c9a6ff' : '#ffe98a' });
    // 金光爆发：环之外再放一圈放射光条，像光从身上炸开
    if (vfx === 'gold') {
      for (let i = 0; i < 12; i++) {
        const ang = i * Math.PI / 6;
        G.parts.push({ ray: true, x, y, ang, len: rad * 0.92, life: 0.3, maxlife: 0.3, color: i % 2 ? '#fff6c8' : '#ffd76a' });
      }
    }
    for (const e of allEnemies()) if (U.dist(x, y, e.x, e.y) < rad + e.r) damageEnemy(e, dmg);
    Sfx.nova();
  }
  // 近身领域 / 环绕护体：贴身才生效 —— 这才是真近战
  function updateAuras(dt) {
    const p = G.player;
    G.orbPos = []; G.fieldSlow = [];
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
    spawnText(e.x, e.y - e.r - 4, Math.round(d), crit ? '#ffd24a' : '#fff', crit ? 18 : 13);
    if (G.coopRole === 'host' && window.Coop) window.Coop.queueDmg(e.x, e.y - e.r - 4, Math.round(d), crit);
    if (crit) G.hitStop = Math.max(G.hitStop, 0.018);
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
      if (b.life <= 0 || offscreen(b, 60)) G.ebullets.splice(i, 1);
    }
    if (G.ebullets.length > 420) G.ebullets.splice(0, G.ebullets.length - 420);
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
  function hpMulBase() { const d = curDiff(); return (1 + G.time / 70 * 0.4) * mapDiff() * (d.hp || 1) * levelPad(); }
  function dmgMulBase() { const d = curDiff(); return (1 + G.time / 120 * 0.15) * (1 + (mapDiff() - 1) * 0.55) * (d.dmg || 1); }
  function spawnPos() {
    const a = Math.random() * Math.PI * 2;
    const d = Math.max(W, H) / 2 + 50;
    return { x: G.player.x + Math.cos(a) * d, y: G.player.y + Math.sin(a) * d };
  }
  function makeEnemy(type, x, y, hpMul, dmgMul) {
    const def = ENEMY_TYPES[type];
    const e = {
      _id: ++enemySeq,
      type, x, y, hp: def.hp * hpMul, maxhp: def.hp * hpMul, spd: def.spd * (curDiff().spd || 1), dmg: def.dmg * dmgMul,
      r: def.r, xpVal: def.xp, spr: def.spr, wob: def.wob, charge: def.charge, dash: def.dash,
      hitFlash: 0, t: 0, dashT: U.rand(1, 3), _orbCd: {}
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
    const diff = mapDiff();
    const dm = curDiff();
    const dHp = (dm.hp || 1) * levelPad(), dDmg = dm.dmg || 1;
    if (idx % 2 === 0) {
      const hp = (300 + G.time * 2.4) * k * (0.7 + diff * 0.4) * dHp;
      const e = {
        type: 'wolfking', x: pos.x, y: pos.y, hp, maxhp: hp,
        spd: 66 * (dm.spd || 1), dmg: (11 + G.time * 0.06) * diff * dDmg, r: 15, xpVal: 30, spr: 'wolf', scale: 2,
        wob: false, charge: true, dash: false, hitFlash: 0, t: 0, howlT: 7, _orbCd: {}, elite: true, name: names[idx] || names[0] || '头狼'
      };
      G.enemies.push(e); banner('⚠ 精英 · ' + e.name); Sfx.warn();
    } else {
      const hp = (380 + G.time * 2.8) * k * (0.7 + diff * 0.4) * dHp;
      const e = {
        type: 'blacklord', x: pos.x, y: pos.y, hp, maxhp: hp, spd: 44 * (dm.spd || 1), dmg: (10 + G.time * 0.05) * diff * dDmg, r: 14,
        xpVal: 45, spr: 'blacklord', scale: 1.4, wob: false, charge: false, dash: false, hitFlash: 0,
        t: 0, shootT: 1.5, _orbCd: {}, elite: true, name: names[idx] || names[1] || '厉无极', ranged: true
      };
      G.enemies.push(e); banner('⚠ 精英 · ' + e.name); Sfx.warn();
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
    return miss;
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
    { lv: 72, realm: '结丹后期', item: 'biyanjiu', tip: '原著里韩立卡在结丹中期瓶颈，是借裂风兽一族酿的碧焰酒冲过去的。' }
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

      if (e.type === 'wolfking') {
        e.howlT -= dt;
        if (e.howlT <= 0) { e.howlT = 7; for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28; spawnEliteWolf(e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30); } }
      }
      if (e.ranged) {
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
      if (U.dist(p.x, p.y, e.x, e.y) < e.r + p.r) hitPlayer(e.dmg);
      if (pt && U.dist(pt.x, pt.y, e.x, e.y) < e.r + (pt.r || 9)) { if (window.Coop) window.Coop.addPartnerHurt(e.dmg); }
      e._flip = tx < e.x;
    }
  }

  // ---------- Boss（按地图配置，四种打法） ----------
  function spawnBossFrom(cfg) {
    const p = G.player;
    const dm = curDiff();
    // Boss 单独吃一档倍率：凡境不变，险境 ×1.5，死境 ×2（Jerry 定：中高难度 Boss 要更硬）
    const bhp = Math.round(cfg.hp * (dm.hp || 1) * (dm.bossHp || 1) * levelPad());
    const bdmg = cfg.dmg * (dm.dmg || 1) * (dm.bossDmg || 1);
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
      phase2: false, phaseT: 0
    };
    G.bossActive = true; G.bossSpawned = true;
    G.enemies = G.enemies.filter(e => !e.elite);
    G.flash = Math.max(G.flash, 0.5); G.shake = 12;
    banner('⚔ ' + cfg.name + ' 现身' + (dm.id !== 'easy' ? '　·　' + dm.name : '')); Sfx.boss();
  }
  function spawnBoss() {
    const cfg = (G.map && G.map.boss) || { kind: 'mo', name: '墨大夫', hp: 1800, spd: 40, dmg: 18, r: 20, spr: 'mo', scale: 1.8 };
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
  function ringBurst(x, y, n, spd, dmg) {
    for (let k = 0; k < n; k++) { const a = k / n * 6.28; G.ebullets.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7, dmg: dmg || 12, life: 4 }); }
  }
  function aimFan(x, y, base, n, spread, spd, dmg) {
    for (let k = 0; k < n; k++) {
      const a = base + (k - (n - 1) / 2) * spread;
      G.ebullets.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7, dmg, life: 5 });
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

    if (b.kind === 'beast') {
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
        if (b.burstT <= 0) { b.burstT = 3.4; ringBurst(b.x, b.y, 14, 185, 12); G.shake = 6; Sfx.burst(); }
      }
    } else if (b.kind === 'mo') {
      // 散射
      const shootInt = phase2 ? (enrage ? 0.9 : 1.1) : (enrage ? 1.3 : 1.8);
      const n = phase2 ? (enrage ? 11 : 9) : (enrage ? 7 : 5);
      b.shootT -= dt;
      if (b.shootT <= 0) {
        b.shootT = shootInt;
        aimFan(b.x, b.y, Math.atan2(p.y - b.y, p.x - b.x), n, phase2 ? 0.26 : 0.18, 190, 14);
        Sfx.shoot();
      }
      // 瞬移 + 环形弹幕
      b.teleT -= dt;
      if (b.teleT <= 0) {
        b.teleT = phase2 ? 4 : 6;
        const a = Math.random() * 6.28;
        b.x = p.x + Math.cos(a) * 180; b.y = p.y + Math.sin(a) * 180;
        ringBurst(b.x, b.y, phase2 ? 14 : 10, 150);
        G.shake = 6; Sfx.burst();
      }
      // 召唤尸傀
      b.sumT -= dt;
      if (b.sumT <= 0) { b.sumT = phase2 ? 7 : 9; summonAt(b, 'ghoul', phase2 ? 3 : 2, phase2 ? 5 : 4); }
      if (phase2) {
        b.burstT -= dt;
        if (b.burstT <= 0) { b.burstT = 3.2; ringBurst(b.x, b.y, 16, 170, 12); G.shake = 5; Sfx.burst(); }
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
          G.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 155, vy: Math.sin(a) * 155, r: 6, dmg: b.dmg * 0.8, life: 4.5 });
        }
      }
      // 躲远、召虫
      if (d < 150) { b.x -= Math.cos(ang) * spd * 0.9 * dt; b.y -= Math.sin(ang) * spd * 0.9 * dt; }
      b.sumT -= dt;
      if (b.sumT <= 0) { b.sumT = phase2 ? 6.5 : 9.5; summonAt(b, 'bat', phase2 ? 4 : 3, phase2 ? 12 : 9); }
      if (phase2) {
        b.burstT -= dt;
        if (b.burstT <= 0) { b.burstT = 3.8; ringBurst(b.x, b.y, 18, 165, 11); G.shake = 5; Sfx.burst(); }
      }
    } else {
      // blood：瞬移 + 交错弹幕 + 血环
      b.shootT -= dt;
      if (b.shootT <= 0) {
        b.shootT = phase2 ? 0.85 : 1.25;
        const base = Math.atan2(p.y - b.y, p.x - b.x);
        if (Math.random() < 0.5) aimFan(b.x, b.y, base, phase2 ? 9 : 7, 0.2, 210, 15);
        else ringBurst(b.x, b.y, phase2 ? 16 : 12, 165, 13);
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
        if (b.burstT <= 0) { b.burstT = 2.8; ringBurst(b.x, b.y, 18, 190, 12); G.shake = 6; Sfx.burst(); }
      }
    }

    if (U.dist(p.x, p.y, b.x, b.y) < b.r + p.r) hitPlayer(b.dmg);
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
      spawnBossFrom(cfg);
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
  function budget() {
    const t = G.time;
    const interval = Math.max(0.26, 1.0 - t * 0.0032);
    const cnt = curDiff().cnt || 1;
    const batch = Math.max(1, Math.round((1 + Math.floor(t / 70)) * cnt));
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
  // Boss 战后：全图掉落自动飞向角色（配合结局对话）
  function vacuumPickups(dt, speed) {
    const p = G.player, sp = speed || 900;
    const pull = (arr) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const o = arr[i]; const d = U.dist(p.x, p.y, o.x, o.y);
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
  function collectAllPickups() {
    let n = 0;
    // P6：房主把 Boss 战利品全数收走时，给队友留一份——修为 / 灵石 / 回血各半，
    // 掉落道具也给同款一份（只此一件的东西 addToBag 自己会拦，不会一式两份）。
    const share = (G.coopRole === 'host' && window.Coop) ? { xp: 0, stones: 0, hp: 0, items: [] } : null;
    for (const g of G.gems) {
      if (share) { if (g.kind === 'stone') share.stones += (g.val || 1); else share.xp += (g.val || 0); }
      takeGem(g); n++;
    }
    for (const h of G.herbs) { G.player.hp = Math.min(G.player.maxhp, G.player.hp + 14); if (share) share.hp += 14; n++; }
    for (const l of G.loot) { if (share && l.item) share.items.push(l.item.id); applyItem(l.item, { silent: true }); n++; }
    G.gems.length = 0; G.herbs.length = 0; G.loot.length = 0;
    if (n > 0) spawnText(G.player.x, G.player.y - 30, '收获 ' + n + ' 件', '#ffd24a', 16);
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
    } else if (vfx === 'soul') {
      // 神识类（惊神刺/失神刺/离魂术/梦引术/念剑诀）：原著里全是无形神念，
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
      // 渐变按半径缓存、并且画在「以玩家为原点」的坐标系里 —— 否则每帧都要新建一个渐变对象
      const key = Math.round(fd.rad);
      let grad = vfxGradCache.get(key);
      ctx.save(); ctx.translate(p.x, p.y);
      if (!grad) {
        grad = ctx.createRadialGradient(0, 0, fd.rad * 0.15, 0, 0, fd.rad);
        grad.addColorStop(0, 'rgba(140,215,255,0.20)');
        grad.addColorStop(0.72, 'rgba(120,200,255,0.10)');
        grad.addColorStop(1, 'rgba(120,200,255,0)');
        vfxGradCache.set(key, grad);
      }
      ctx.globalAlpha = 1; ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, fd.rad, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.28; ctx.strokeStyle = '#a8e2ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, fd.rad * 0.97, 0, 6.28); ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const ang = t * 0.3 + i * (6.28 / 10);
        const rr = fd.rad * (0.55 + ((i * 37) % 40) / 100);
        const rx = Math.cos(ang) * rr;
        const ry = Math.sin(ang) * rr;
        const s = 2.6 + Math.sin(t * 2.2 + i) * 1.2;
        ctx.globalAlpha = 0.55 + Math.sin(t * 2 + i) * 0.25;
        ctx.fillStyle = '#e2f8ff';
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
    corpsefire: '#7dff9e', soul: '#c9a6ff', magnet: '#e0d49a'
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
  function updateParts(dt) {
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
    const scheme = (G.map && G.map.decorScheme) || DEFAULT_DECOR;
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
  function showDialog(line) { elDialogSpeaker.textContent = line[0]; elDialogText.textContent = line[1]; elDialog.style.display = 'flex'; Sfx.dialog(line[0]); }
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

  // ---------- 战斗内定时剧情 ----------
  function checkStory() {
    if (!G.map || G.storyMute) return;   // 调试/体检时可静音剧情对白
    for (const s of STORY) {
      if (s.map !== G.mapId) continue;
      if (s.done) continue;
      if (s.t != null && G.time >= s.t) {
        s.done = true;
        if (save.seen.indexOf(s.id) < 0) save.seen.push(s.id);
        showLines(s.lines, () => {
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
        itemToast({ id: 'sideopen_' + opened.id, name: '支线 · ' + opened.name, rarity: 3, desc: '已现于修行图' }, '因缘');
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

  // 顿悟抽卡：A 技能升级 40% / B 新神通 25% / C 被动 20% / D 灵石 10% / E 特殊 5%
  const SKILL_MODS = [
    { k: 'dmg', v: 0.25, name: '伤害 +25%' },
    { k: 'range', v: 0.30, name: '范围 +30%' },
    { k: 'cd', v: 0.20, name: '攻速 +20%' },
    { k: 'count', v: 1, name: '多打一发' },
    { k: 'dur', v: 0.50, name: '持续 +50%' }
  ];
  const PASSIVE_MODS = [
    { k: 'spd', v: 0.10, cap: 0.6, name: '移速 +10%' },
    { k: 'leech', v: 0.04, cap: 0.2, name: '吸血 +4%' },
    { k: 'armor', v: 0.08, cap: 0.35, name: '减伤 +8%' },
    { k: 'pickup', v: 0.30, cap: null, name: '拾取范围 +30%' },
    { k: 'maxhp', v: 15, cap: 300, name: '气血上限 +15' },
    { k: 'shaGain', v: 0.15, cap: 1.2, name: '煞气 +15%' }
  ];
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
    const s = U.pick(own), m = U.pick(skillModsFor(s));
    return { key: 'A' + s.id + m.k, kind: 'A', id: s.id, icon: s.icon || '⚔', mod: m,
      name: s.name + ' · ' + m.name, desc: '本局内永久生效' };
  }
  function optNewSkill() {
    const pool = newSkills(); if (!pool.length) return optPassive();
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
      if (r < 40) push(optSkillUp());
      else if (r < 65) push(optNewSkill());
      else if (r < 85) push(optPassive());
      else if (r < 95) push(optStone());
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
      if (a.range != null) o.range = a.range * (1 + m.range);
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
      syncCultivate();
    } else if (c.kind === 'heal') G.player.hp = Math.min(G.player.maxhp, G.player.hp + G.player.maxhp * 0.5);
    else if (c.kind === 'rain') {
      for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28, dd = U.rand(20, 120); G.gems.push({ x: G.player.x + Math.cos(a) * dd, y: G.player.y + Math.sin(a) * dd, r: 5, val: 2 }); }
      dropStone(G.player.x, G.player.y, 4);
    } else if (c.kind === 'fortune') {
      const capNow = (s) => window.skillCapById ? window.skillCapById(s.id, G.player.level) : s.max;
      const own = SKILLS.filter(s => (!s.minLv || G.player.level >= s.minLv) && (G.player.skills[s.id] || 0) > 0 && (G.player.skills[s.id] || 0) < capNow(s));
      if (own.length) { const s = U.pick(own); G.player.skills[s.id]++; }
      else { const ns = SKILLS.find(s => !(G.player.skills[s.id])); if (ns) G.player.skills[ns.id] = 1; }
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
    const sp = p.spd * spdMul() * (1 + (G.bonus.spd || 0));
    p.x += (dx / len) * sp * dt; p.y += (dy / len) * sp * dt;
    if (dx !== 0) p.dir = dx > 0 ? 1 : -1;
    // 迈步相位只在真的走的时候推进：站着的时候腿不该还在摆
    p.moving = (dx !== 0 || dy !== 0);
    if (p.moving) p.gait = (p.gait || 0) + dt * 9.5;
    const rg = rb('regen') + passiveSum('regen') + buffSum('regen') + (G.bonus.regen || 0) + gb('regen');
    if (rg > 0 && p.hp < p.maxhp) p.hp = Math.min(p.maxhp, p.hp + rg * dt);
    if (p.iv > 0) p.iv -= dt;
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

    G.cam.x = p.x - W / 2; G.cam.y = p.y - H / 2;
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
      const at = G.map.bossAt || 0;
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
        collectAllPickups();
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
  function buildGrass(bg) {
    buildGrass._bg = bg || null;
    const base = (bg && bg.base) || '#36532f';
    const ca = (bg && bg.a) || '#3c5c34';
    const cb = (bg && bg.b) || '#30492a';
    const c = document.createElement('canvas'); c.width = 48; c.height = 48;
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 48, 48);
    for (let i = 0; i < 60; i++) { x.fillStyle = Math.random() < 0.5 ? ca : cb; x.fillRect((Math.random() * 48) | 0, (Math.random() * 48) | 0, 2, 2); }
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
    for (const d of list) {
      if (d.x < G.cam.x - 60 || d.x > G.cam.x + W + 60 || d.y < G.cam.y - 60 || d.y > G.cam.y + H + 60) continue;
      if (d.type === 'tree') drawSpr('tree', d.x, d.y, d.s, false);
      else if (d.type === 'rock') drawSpr('rock', d.x, d.y, d.s, false);
      else drawSpr('tuft', d.x, d.y, 1.4, false);
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
    // 粒子半径一律不许为负：收缩/外扩类特效算过头就会喂给 arc 一个负数，直接抛错
    if (pt.r < 0) pt.r = 0;
    if (pt.maxr < 0) pt.maxr = 0;
    if (pt.rad < 0) pt.rad = 0;
    if (pt.len < 0) pt.len = 0;

    if (pt.ring) {
      // 半径可能是负的（收缩类特效算出来 -16 这种），arc 会直接抛错，钳一下
      const t = 1 - life; const r = Math.max(0, U.lerp(pt.r, pt.maxr, t));
      ctx.strokeStyle = pt.color; ctx.lineWidth = 4 * life + 1; ctx.globalAlpha = life;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, 6.28); ctx.stroke(); ctx.globalAlpha = 1;
      return;
    }
    if (pt.bolt) { drawBolt(pt); return; }
    if (pt.ray) {
      ctx.globalAlpha = life * 0.9; ctx.strokeStyle = pt.color; ctx.lineWidth = 3 * life + 1;
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (grassPat) { ctx.fillStyle = grassPat; ctx.fillRect(0, 0, W, H); }
    else { ctx.fillStyle = (G.map && G.map.bg && G.map.bg.base) || '#36532f'; ctx.fillRect(0, 0, W, H); }
    ctx.save();
    ctx.translate(-G.cam.x + sx, -G.cam.y + sy);

    drawDecor();
    // 地面特效先铺：符文环是画在地上的，等角色都画完再画就成呼啦圈了
    for (const pt of G.parts) if (pt.rune) drawPart(pt);
    for (const g of G.gems) { if (g.kind === 'stone') drawStone(g); else drawSpr('gem', g.x, g.y, 1.6, false); }
    for (const h of G.herbs) drawSpr('herb', h.x, h.y, 1.6, false);
    for (const l of G.loot) drawLoot(l);
    for (const b of G.ebullets) drawSpr('ebullet', b.x, b.y, 1.4, false);

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
      // 冲撞前摇：脚下的红色指向线
      if (b.kind === 'beast' && b.dashing > 0) {
        ctx.strokeStyle = 'rgba(255,90,60,0.5)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + Math.cos(b.dashAng) * 200, b.y + Math.sin(b.dashAng) * 200); ctx.stroke();
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
      // 境界光环：层数越高越亮
      if (G.realmIdx > 1) {
        const pw = Math.min(0.5, 0.05 * G.realmIdx);
        ctx.strokeStyle = 'rgba(255,220,120,' + pw + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 8, 0, 6.28); ctx.stroke();
      }
    }

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
      elBosswrap.style.display = 'block'; elBossname.textContent = G.boss.name;
      elBossfill.style.width = U.clamp(Math.max(0, G.boss.hp) / G.boss.maxhp, 0, 1) * 100 + '%';
      elBossfill.style.background = G.boss.phase2 ? 'linear-gradient(90deg,#ff1f1f,#ff9a4a)' : 'linear-gradient(90deg,#b03a3a,#ff5a4a)';
    }
    else elBosswrap.style.display = 'none';
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
    G.enemies = []; G.bullets = []; G.ebullets = []; G.gems = []; G.herbs = []; G.parts = []; G.texts = []; G.loot = [];
    G.time = 0; G.kills = 0; G.spawnT = 1; G.nextEliteT = 100; G.eliteIdx = 0;
    G.fxBullets.length = 0; G.coopFrozen = false; G.dialogSynced = false;
    G.boss = null; G.bossActive = false; G.bossSpawned = false; G.bossWarned = false; G.extraIdx = 0;
    G.fieldSlow = []; G.shake = 0; G.flash = 0; G.hitStop = 0;
    G.decor = []; G.chunkMap = {}; G.cam = { x: -W / 2, y: -H / 2 }; G.orbPos = [];
    G.vacuumT = 0; G.pendingEnding = false; G.runLoot = []; G.matGain = 0; G.lastAutoSave = 0;
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
    elPfBody.innerHTML = html;
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
    G.diff = diffById(diffId || save.lastDiff || 'easy');
    if (diffId) save.lastDiff = G.diff.id;
    save.mapId = id;
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
    buildGrass(m.bg);
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
      if (g && breakMissing(g).length) {
        const missN = breakMissing(g).length;
        setTimeout(function () {
          if (G.state === 'play' || G.state === 'dialog') banner('破境之物未齐（还差 ' + missN + ' 样）· 此图可打可拾，集齐了再来冲关');
        }, 1400);
      }
    }
    // 修为被封着：进图先提醒一句，别让人以为自己变弱了
    if (save.sealed) setTimeout(function () { if (G.state === 'play') banner('修为被封 · ' + (save.sealed.name || '煞气')); }, 900);

    if (m.type === 'story') {
      G.state = 'dialog';
      // 破境剧情图（闭府结丹 / 云梦山结婴…）的开场要按「门开不开得了」分流：
      // 物事没备齐，就不能演「丹成」那一版，否则对话说成了、结算却说没成（自相矛盾）。
      showLines(storyLinesOf(m, id), () => onStoryMapDone(m), 'map:' + id);
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
      // 只讲一次 —— 坊市是可以反复进出的，没有「已通」判断的话每进一次就把整段开场重念一遍
      if (MAP_STORIES[m.id] && MAP_STORIES[m.id].length && (save.cleared || []).indexOf(m.id) < 0) {
        G.state = 'dialog';
        showLines(MAP_STORIES[m.id], meetThenShop, 'map:' + m.id);
        return;
      }
      meetThenShop();
      return;
    }
    // 战斗 / 剧情战
    if (m.intro && MAP_STORIES[m.intro]) {
      G.state = 'dialog';
      showLines(MAP_STORIES[m.intro], () => {
        G.state = 'play'; last = performance.now();
        G.coopRole = (window.Net && window.Net.self() && window.Net.isHost()) ? 'host' : (window.Net && window.Net.self() ? 'client' : null);
        spawnBoss();
      }, 'map:' + id);
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
      G.state = 'dialog';
      // 「已备齐破境之物」分支：播完询问对白后，让玩家自己选「进阶 / 暂不进阶」
      const onEnd = (key === 'zhuji_out_ask') ? () => zhujiAskBreak(m) : () => finishMap(m);
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
    // 古传送阵：为南宫婉疗伤，修为被吸干 —— 原著第403章左右：跌回「炼气期四层」。
    // 照原著照抄：真跌到炼气期四层。恢复不走打怪，走「回洞府闭关 + 大量服食丹药」，见 REBUILD_STAGES。
    if (m.id === 'guchuan' && !save.wounded) {
      const lv0 = save.cultivate.level || 1;
      if (lv0 > 7) {
        save.wounded = { to: lv0, mult: 1 };
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
      for (const mm of (gained.mats || [])) {
        const r = RARITY[mm.item.rarity];
        extra += '<div class="lootrow reward"><b style="color:' + r.color + '">' + mm.item.name + '</b><span>药材 ×' + mm.n + '</span></div>';
      }
    }
    const dm = (G.map && (G.map.type === 'combat' || G.map.type === 'boss')) ? (G.diff || DIFFICULTIES[0]) : DIFFICULTIES[0];
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
    // 横幅居中悬着，右上角的拾取提示会压住它尾巴 —— 横幅在时把提示整体挪下一层
    if (elItemToast) elItemToast.classList.add('below');
    clearTimeout(banner._t);
    banner._t = setTimeout(() => {
      elBanner.style.display = 'none';
      if (elItemToast) elItemToast.classList.remove('below');
    }, 2200);
  }
  // 拾取提示：同名合并、最多三条、战斗中不写说明 —— 免得糊住半屏
  const TOAST_KEEP = 3;
  const toastRows = [];
  function toastSub(item, extra) {
    if (extra) return extra + (item.desc ? '　' + item.desc : '');
    if (item.slot) { const sl = SLOTS.find(x => x.id === item.slot); return '【' + (sl ? sl.name : '装备') + '】需至洞府佩戴'; }
    if (item.req && !canUse(item)) return '境界不足 · 需' + realmName(item.req);
    if (G.state === 'play' && item.rarity < 4) return '';
    return item.desc || '';
  }
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
        (r.sub ? '<span>' + r.sub + '</span>' : '') + '</div>';
    }
    elItemToast.innerHTML = html;
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
  function itemToast(item, extra) {
    if (!elItemToast || !item) return;
    const sub = toastSub(item, extra);
    const key = item.id + '|' + sub;
    const hit = toastRows.find(r => r.key === key);
    if (hit) { hit.n++; hit.at = Date.now(); }
    else toastRows.push({ key: key, item: item, sub: sub, n: 1, at: Date.now() });
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
    elWmList.innerHTML = rows;
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
    elCaveBody.innerHTML = html;
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
      ['拾取范围', '×' + (1 + rb('pickup') + (save.bonuses.pickup || 0) + (g.pickup || 0)).toFixed(2)],
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
        '<i style="color:' + (it ? r.color : '#7c7768') + '">' + (it ? it.name : '未佩') + '</i></div>' +
        (it ? '<span class="es-off">卸</span>' : '') +
        '</div>';
    }).join('');
    // 背包里可佩的
    const ids = Object.keys(save.inventory).filter(id => (save.inventory[id] || 0) > 0 && Items.isGear(id));
    let list = '';
    if (!ids.length) list = '<div class="shopempty">储物袋里没有可佩之物。山里的妖兽与魔修身上倒常见。</div>';
    else {
      for (const id of ids.sort((a, b) => (Items.get(b).rarity - Items.get(a).rarity))) {
        const it = Items.get(id), r = RARITY[it.rarity], s = SLOTS.find(x => x.id === it.slot);
        const on = save.equip[it.slot] === id;
        const ok = lv >= reqLv(it.req || 1);
        list += '<div class="gearrow' + (ok ? '' : ' locked') + (on ? ' equipped' : '') + '" data-equip="' + id + '">' +
          '<div class="gr-main"><b style="color:' + r.color + '">' + it.name + '</b>' +
          '<i>' + r.name + ' · ' + (s ? s.name : '') + '　' + it.desc + '</i></div>' +
          '<div class="gr-right">' +
          (ok ? (on ? '<span class="gr-on">已佩</span>' : '<span class="sr-btn buy">佩上</span>')
            : '<span class="gr-need">需' + realmName(it.req) + '</span>') +
          '<span class="sr-own">×' + save.inventory[id] + '</span>' +
          (sellableCount(id) > 0 && !it.unique ? '<button class="sr-btn ghost" data-decomp="' + id + '">拆</button>' : '') +
          '</div></div>';
      }
    }
    return '<div class="cave-sec"><div class="cs-title">身上法器</div><div class="equipgrid">' + slots + '</div>' +
      '<div class="cs-note">佩上即生效，可随时更换；境界不足者佩不动。</div></div>' +
      '<div class="cave-sec"><div class="cs-title">储物袋 · 可佩之物</div><div class="gearlist">' + list + '</div></div>';
  }

  function renderCaveCraft(c, kind, lv) {
    const kd = RECIPE_KINDS[kind];
    if (!kd) return '<div class="cave-sec empty"><div class="cs-empty">此地并无这般工坊。</div></div>';
    const list = Recipes.of(kind);
    let html = '<div class="cave-sec"><div class="cs-title">' + kd.icon + ' ' + kd.name + '</div>' +
      '<div class="cs-note">' + kd.tip + '　材料可在战斗中获得，也可在坊市买入。</div>' +
      '<div class="cs-note brk-hint">缺哪一味，点料名就写它去哪儿取。</div>';
    for (const r of list) {
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
      html += '<div class="recrow' + (can ? ' can' : '') + '">' +
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
    for (const s of SKILLS) {
      const lv2 = c.skills[s.id] || 0;
      if (!lv2) continue;
      any = true;
      const on = eq.indexOf(s.id) >= 0;
      const top = window.skillCapById ? window.skillCapById(s.id, lv) : s.max;
      const okLv = lv >= (s.minLv || 1);
      html += '<div class="recrow' + (on ? ' can' : '') + '">' +
        '<div class="rr-main"><b>' + ico(s.icon) + s.name + '　' + lv2 + ' 重' + (s.main ? '　· 主力' : '') + '　[' + skillTypeLabel(s) + ']' + '</b>' +
        '<em>' + s.desc + '　此境可至 ' + top + ' 重' + (okLv ? '' : '　· 境界不足') + '</em></div>' +
        '<div class="rr-right"><button class="sr-btn' + (on ? ' ghost' : ' buy') + '" data-skill="' + s.id + '">' +
        (on ? '卸下' : '运起') + '</button></div></div>';
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
    for (const b of list) {
      const done = lv >= b.lv;
      const miss = breakMissing(b);
      if (!done && !pending) pending = b;
      let status;
      if (done) status = '　已过';
      else if (miss.length && miss.every(m => m.kind === 'level')) status = '　还差修为';
      else if (miss.length) status = '　还差 ' + miss.length + ' 样';
      else status = '　齐了';
      html += '<div class="cave-sec2"><div class="cs-title">' + (done ? '✔ ' : '') + b.from + ' → ' + b.realm +
        status + '</div>' +
        '<div class="cs-note">' + (b.tip || '') + '</div>';
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
        html += '<div class="cs-note">' + odds + '</div>';
        html += '<button class="btn small" data-breaknow="' + b.lv + '">入' + (bm ? '「' + bm.name + '」' : '洞府') + '冲关 · ' + b.realm + '</button>';
      }
      html += '<div class="brk-list">' + renderBreakList(b) + '</div></div>';
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
      // 药圃：自家洞府里种的
      const grows = [];
      for (const cid in (window.CAVES || {})) {
        for (const g of (((window.CAVES[cid] || {}).gardens) || [])) {
          if ((g.pool || []).indexOf(id) >= 0 && grows.indexOf(g.name) < 0) grows.push(g.name);
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
      G.breakPending = b;
      banner('冲关失败 · 丹药散尽，另备丹药再来'); Sfx.warn();
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
  function tickGarden(dt) {
    // 只有真在打的图才算：坊市、洞府、结算界面里不长
    if (!(G.map && (G.map.type === 'combat' || G.map.type === 'boss' || G.map.type === 'chase'))) return;
    const list = gardenList();
    if (!list.length) return;
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
    const n = gardenChargeOf(g);
    if (n <= 0) { notify('这块地还空着 · 先去图里打一场'); Sfx.warn(); return; }
    const pool = g.pool.map(id => (window.MATERIALS || []).find(x => x.id === id)).filter(Boolean);
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
      const names = g.pool.map(id => { const m = (window.MATERIALS || []).find(x => x.id === id); return m ? (m.icon || '🌿') + m.name : ''; }).filter(Boolean).join('　');
      return '<div class="cave-sec"><div class="cs-title">' + g.name + '</div>' +
        '<div class="cs-note">' + g.tip + '</div>' +
        '<div class="restbox"><div class="statgrid">' +
        '<div class="statcell"><i>已长成</i><b>' + n + ' / ' + cap + '</b></div>' +
        '<div class="statcell"><i>长势</i><b>' + (full ? '已长满' : '每秒 +1') + '</b></div>' +
        '<div class="statcell"><i>园中品种</i><b>' + g.pool.length + ' 味</b></div>' +
        '</div>' +
        '<div class="cs-note">园里：' + names + '</div>' +
        '<div class="restbtns"><button class="btn small" data-pickg="' + c.id + '|' + g.id + '"' + (n > 0 ? '' : ' disabled') + '>' +
          (n > 0 ? '采收 ' + n + ' 株' : '这块地空着') + '</button></div>' +
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
    elShopList.innerHTML = rows.join('');
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
    if (it.teach && (cultObj().skills || {})[it.teach]) {
      notify('这门已学过 · 去洞府「功法」页运起');
      Sfx.warn(); return;
    }
    if (it.req && lv < reqLv(it.req)) { notify('境界不足 · 需' + realmName(it.req)); Sfx.warn(); return; }
    if ((save.stones || 0) < s.price) {
      notify('灵石不足 · 还差 ' + (s.price - (save.stones || 0)));
      Sfx.warn(); return;
    }
    // 法诀买回去就化了：学会一门功法，不入储物袋
    if (it.teach) {
      save.stones -= s.price;
      learnSkill(it.teach);
      writeSave(); renderShop(); refreshTitle();
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
      if (mi) itemToast(mi, '拆得');
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
    if (out) itemToast(out, '炼成');
    renderCave();
  }
  function addCultivateXp(amount) {
    if (!save.cultivate) save.cultivate = { level: 1, xp: 0, skills: {} };
    const c = save.cultivate;
    c.xp = (c.xp || 0) + amount;
    let lv = c.level || 1;
    let guard = 0;
    while (lv < 140 && guard++ < 400) {
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
      notify('修为已至瓶颈 · 回「进阶」页备料冲关');
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
  const elBanner = document.getElementById('banner');
  const elDialog = document.getElementById('dialog');
  const elDialogSpeaker = document.getElementById('dialogSpeaker');
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

  document.getElementById('startBtn').addEventListener('click', openWorldMap);
  document.getElementById('goRetry').addEventListener('click', () => startMap(save.mapId || 'qixuan'));
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
    // 长屏手机：纵向视口按比例伸展，画面铺满不留黑边；
    // 桌面/横屏：不低于 BASE_H，保持原来的视野
    const wantH = Math.round(Math.min(1120, Math.max(BASE_H, BASE_W * (availH / availW))));
    if (wantH !== H) {
      H = wantH;
      cv.width = W; cv.height = H;
      // 视口变了，场景装饰与分块缓存需要重建
      G.decor = []; G.chunkMap = {};
      if (grassPat) buildGrass(buildGrass._bg);
    }
    const scale = Math.min(availW / W, availH / H);
    viewScale = scale;
    elStage.style.width = Math.max(1, Math.round(W * scale)) + 'px';
    elStage.style.height = Math.max(1, Math.round(H * scale)) + 'px';
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

  // 双击舞台顶部（约上 9% 高度）切换全屏
  let tapTime = 0, tapX = 0, lastTapX = 0;
  elStage.addEventListener('pointerdown', ev => {
    if (ev.isPrimary === false) return;
    if (ev.target.closest('button, input, select, label, a')) return;
    const r = elStage.getBoundingClientRect();
    const bandH = Math.max(58, Math.round(r.height * 0.085));
    if (ev.clientY - r.top > bandH) { tapTime = 0; return; }
    if (joy.active) { tapTime = 0; return; }          // 正在拖拽摇杆，不算点击
    const now = performance.now();
    if (tapTime && now - tapTime < 380 && Math.abs(ev.clientX - lastTapX) < 80) {
      tapTime = 0; lastTapX = 0;
      toggleFullscreen();
    } else {
      tapTime = now; lastTapX = ev.clientX;
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
    save.gift_zhuji = false;
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
      for (const x of gardenList()) out[x.g.id] = { charge: gardenChargeOf(x.g), cap: gardenCapOf(x.g), cave: x.cave.id, pool: x.g.pool.length };
      return gid ? (out[gid] || null) : out;
    },
    setGarden(gid, n) { save.gardenCharge = save.gardenCharge || {}; save.gardenCharge[gid] = Math.max(0, Math.min(GARDEN_CAP, n | 0)); save.gardenTick = 0; return save.gardenCharge[gid]; },
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
    breakNow(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); if (!b) return 'no req'; G.breakCur = b; const ok = doBreakNow(); return { ok: ok, pending: G.breakPending, lv: G.player ? G.player.level : null, cult: save.cultivate.level }; },
    breakLuck(v) { G.breakForce = (v == null) ? null : !!v; return G.breakForce; },   // 调试：固定冲关成败
    breakRate(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); return b ? { pills: breakGatePills(b), rate: breakSuccessRate(b) } : null; },
    startBreak(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); if (!b) return 'no req'; enterBreakMap(b); return { map: G.mapId, state: G.state }; },
    breakScene(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); if (!b) return 'no req'; breakSceneThen(b, () => { G.state = 'cave'; if (elCave) elCave.style.display = 'flex'; renderCave(); }); return { scene: G.breakScene, dialog: G.state === 'dialog', lines: G.dialogLines ? G.dialogLines.length : 0 }; },
    finishMapNow() { if (!G.map) return 'no map'; const m = G.map; finishMap(m); return { state: G.state, level: save.cultivate.level, cleared: save.cleared.slice(), unlocked: save.unlocked.slice(), caves: save.caves.slice() }; },
    breakOpen(lv) { const b = (window.BREAKTHROUGH || []).find(x => x.lv === lv); openBreak(b); return !!(elBreak && elBreak.style.display === 'flex'); },
    breakShown() { return !!(elBreak && elBreak.style.display === 'flex'); },
    breakClose() { closeBreak(); return !!(elBreak && elBreak.style.display === 'flex'); },
    breakPending() { return G.breakPending ? G.breakPending.lv : null; },
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
    skillState() { return { learned: Object.assign({}, cultObj().skills), equipped: equippedOf().slice(), slots: slotCapOf(Math.max(save.cultivate.level || 1, save.best.level || 1)) }; },
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
    decomp(id, all) { decomposeItem(id, !!all); return { left: save.inventory[id] || 0 }; },
    toasts() { return toastRows.map(r => ({ id: r.item.id, name: r.item.name, n: r.n })); },
    toastCount() { return Math.min(TOAST_KEEP, toastRows.length) + (toastRows.length > TOAST_KEEP ? 1 : 0); },
    toastDemo() {
      const pool = ['m_chijing', 'm_huangjing', 'm_jingtie', 'm_fuzhi', 'm_lingmo', 'm_shedan', 'm_yusui', 'm_chitong'];
      for (const id of pool) { const it = Items.get(id); if (it) itemToast(it); }
      return { rows: toastRows.length, shown: this.toastCount() };
    },
    // 横幅压测：返回提示是否已被让位（.below）
    banner(t) { banner(t || '测试横幅'); return !!(elItemToast && elItemToast.classList.contains('below')); },
    bannerDown() { return !!(elItemToast && elItemToast.classList.contains('below')); },
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
    insightRoll() { return rollInsight().map(c => ({ kind: c.kind, name: c.name })); },
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
    clear() { G.enemies.length = 0; G.ebullets.length = 0; G.gems.length = 0; G.herbs.length = 0; },
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
  if (pendingZhujiGift) {
    pendingZhujiGift = false;
    setTimeout(function () { try { banner('宗门旧例 · 补授筑基丹一枚'); Sfx.buff(); } catch (e) {} }, 900);
  }
  requestAnimationFrame(loop);
})();
