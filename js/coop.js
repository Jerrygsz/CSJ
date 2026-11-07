// ============================================================================
// 双人联机 · P2「互相同步移动」+ P3「房主权威共怪」
//
// 本文件只管「游戏侧」的联机：把本地玩家状态发出去、把对方状态收进来、插值、
// 渲染；以及 P3 的「房主权威」——怪由房主生成与计算，快照发给客机，客机只渲染、
// 上报命中、接收致伤与伤害飘字。传输层（Metered / WebRTC）全在 net.js。
//
// 【传输硬约束】本文件里一切业务数据都必须用 window.Net.sendGame() 发出（走自建 DataChannel）：
//   位置 state / 怪物快照 enemy / 命中 hit / 致伤 hurt / 领取 taken / 胜负 end / 回执 ack /
//   心跳 ping-pong / 战利品 reward / 倒地 down / 救援 revive 等，无一例外。
//   window.Net.send() 是 Metered 通道，只允许跑房间发现与协商（SDP / ICE），
//   传业务数据会被 net.js 的 guardMetered() 当场拦下 —— 那既违规又要按流量计费。
//
// 协议（data 通道里跑的 JSON）：
//   { t:'state', x, y, dir, map, level, hp, maxhp, name }   P2 位置同步
//   { t:'enemy', list, eb, dmgs, drops, vac }  HOST→CLIENT 敌人快照 + 限距弹幕 + 伤害飘字 + 掉落镜像 + 房主是否收取中
//   { t:'hit',   id, dmg }             CLIENT→HOST 子弹命中远程怪的上报
//   { t:'hurt',  dmg }                 HOST→CLIENT 怪/弹幕撞到队友的致伤
//   { t:'taken', id }                  任一方领取掉落 → 对方移除（防止重复拾取）
//   { t:'end',   r:'win'|'lose' }      HOST→CLIENT 共享胜负（房主通关 / 任一方倒下）
//   { t:'ack',   s }                   关键消息（taken/end/reward/revive）的回执，没回执就重发
//   { t:'ping',  ts } / { t:'pong', ts }  P5 心跳测往返延迟（双方各发各的，1Hz）
//   { t:'reward', xp, stones, hp, items }  P5/P6 房主 Boss 收尾后给队友补一份战利品分成
//   { t:'down' }                       P6 我倒下了 → 对方立刻把队友标记为倒地（不等下一次状态包）
//   { t:'revive' }                     P6 队友站到我身边救援 → 把我拉起来
//   { t:'revived' }                    P6 我站起来了 → 对方清除倒地标记（防止救援被重复触发）
// ============================================================================

(function () {
  const SEND_MS = 90;            // 发位置的频率（约 11Hz，够顺又省流量）
  const STALE_MS = 3000;         // 超过这个时间没收到对方，就当他掉线隐身
  const ENEMY_MS = 150;          // 敌人快照频率（约 6~7Hz，够顺又省）
  const PING_MS = 1000;          // P5：心跳间隔，用来测往返延迟
  let acc = SEND_MS;             // 位置节流累加器
  let lastMap = null;            // 上一次发的地图，变了立即补发
  let enemyAcc = 0;              // 敌人快照累加器
  let partnerHurtAcc = 0;        // HOST 侧累计：本周期队友被怪/弹幕撞到的致伤
  let dropSeq = 0;               // 掉落稳定 id（房主侧，随对象惰性分配）
  let pingAcc = 0;               // 心跳累加器
  let rtt = 0;                   // 平滑后的往返延迟（ms）
  let lost = false;              // 队友是否已判定为掉线（用于提示与角标）
  const heard = new Map();       // pid → 上次听到他的时间：房主选举看「真的听见谁」，不只看信令
  const HEARD_MS = 6000;         // 超过这个时间没再听到，就当他不在了（重新选举）
  // ---------- 关键消息可靠送达 ----------
  // 手机网络上丢包是常态，而 taken/end/reward/revive 这类「一次性」消息丢一条就是永久不同步
  // （东西被重复捡、一边结算一边还在打）。心跳包/快照丢了无所谓（下一帧就来），这几条不行。
  let rseq = 0;                  // 递增序号，用来配对回执
  let resendAcc = 0;             // 重发计时
  const pend = new Map();        // seq → { msg, tries }
  const seen = new Set();        // 已处理过的关键消息 seq（重发到达时别重复生效）
  const RESEND_MS = 700, RESEND_MAX = 8;
  function sendReliable(msg) {
    if (!connected()) return;
    msg._s = ++rseq;
    pend.set(msg._s, { msg: msg, tries: 0 });
    window.Net.sendGame(msg);
  }
  function tickResend(dt) {
    if (!pend.size) return;
    resendAcc += dt * 1000;
    if (resendAcc < RESEND_MS) return;
    resendAcc = 0;
    for (const p of Array.from(pend.values())) {
      p.tries++;
      window.Net.sendGame(p.msg);
      if (p.tries >= RESEND_MAX) pend.delete(p.msg._s);
    }
  }

  // 这些状态里人还在，只是不在战斗（洞府/坊市/对话/暂停/看地图…）：
  // 以前这些时候不发状态包，对方 3 秒后就误报「失联」。现在照发，只是标成「在忙」。
  const END_STATES = { title: 1, gameover: 1, victory: 1 };
  const ST_LABEL = {
    cave: '洞府', shop: '坊市', dialog: '谈话', levelup: '参悟', pause: '打坐',
    worldmap: '修行图', difficulty: '选难度', prefight: '战前准备', bag: '储物袋', down: '倒地'
  };
  function linkable(g) { return !!(g && g.player && !END_STATES[g.state]); }

  function G() { return (window.__FR && window.__FR.G) || null; }
  function connected() { return !!(window.Net && window.Net.self()); }
  function isHost() { return !!(window.Net && window.Net.isHost()); }
  function myMap() { const g = G(); return (g && (g.mapId || (g.map && g.map.id))) || null; }

  // ---------- 房主选举：看数据通路，不只看信令 ----------
  // 信令上「房里有谁」可能两边看到的不一样（先后进房、信令丢事件），结果就是两边都以为自己是房主，
  // 各自刷各自的怪 —— 表现就是「战斗不同步、各是各的」。
  // 这里改成：只认「数据通道里真的听到的 id」，谁听见谁，双方必然算出同一个房主。
  function elect() {
    const me = window.Net && window.Net.self();
    if (!me) return false;
    // 房主只认一个权威源：信令侧 Net.isHost()。
    // 早先这里改用「数据通路里听到的 id」选举，结果和 Net.isHost() 可能算出不同的人，
    // 而 game.js 又用 Net.isHost() 覆写 G.coopRole —— 两套结论打架时，
    // 「客机不得接支线」「客机不跑 Boss AI」这类按 coopRole 判断的守卫就会失效。
    // 统一到信令侧，双方结论必然一致（进房后成员集合对双方相同）。
    const bySig = window.Net && typeof window.Net.isHost === 'function' ? !!window.Net.isHost() : null;
    if (bySig !== null) return bySig;
    // 拿不到信令结论时才退回「听见谁」的旧办法
    const ids = [me];
    const now = performance.now();
    for (const [k, t] of heard) if (now - t < HEARD_MS) ids.push(k);
    ids.sort();
    return ids[0] === me;
  }

  // 断开共斗时把对面留下来的东西清干净 —— 不然这些 _remote 怪会留在场上，
  // 本地还接着当自己的怪去算（切图瞬间最常见，表现就是「对面地图的怪长在我这儿」）
  function purgeRemote(g) {
    for (const k of ['enemies', 'ebullets', 'gems', 'herbs', 'loot']) {
      const arr = g[k]; if (!Array.isArray(arr)) continue;
      for (let i = arr.length - 1; i >= 0; i--) if (arr[i] && arr[i]._remote) arr.splice(i, 1);
    }
  }

  // 还在地图里的状态（升级弹窗、暂停、对话都算「人在图里」）。
  // 只有真的离开这张图（修行图 / 洞府 / 坊市 / 战前 / 结算）才不算共斗。
  const IN_WORLD = { play: 1, down: 1, dialog: 1, levelup: 1, pause: 1 };
  // 共斗成立条件：同一张图 + 双方都还在这张图里。不同图就各打各的，免得互相镜像出鬼影怪。
  // 当场判定（不读每帧缓存）：页面卡一下、rAF 被节流时，收到快照也能照常处理。
  function sharesMap(g) {
    const pt = g.partner;
    if (!pt || pt.map == null || pt.map !== myMap()) return false;
    // 升级弹窗/暂停不应打断共斗：否则对面上个弹窗，这边就断一下镜像，看着像卡了
    return !!IN_WORLD[g.state] && !!IN_WORLD[pt.st || 'play'];
  }

  // 角色与「是否共斗」每帧重算：谁先进图、谁后进图、对方中途加入或离开，都能自动归位
  function refreshRole() {
    const g = G(); if (!g) return;
    if (!connected()) { g.coopRole = null; g.coopShared = false; return; }
    g.coopRole = elect() ? 'host' : 'client';
    const nowShared = sharesMap(g);
    if (g.coopShared && !nowShared) purgeRemote(g);
    g.coopShared = nowShared;
  }

  // ---------- 发送 ----------
  function sendState() {
    if (!connected()) return;
    // 战斗 / 倒地 / 洞府 / 对话 / 暂停…都照发（收摊了才不发），否则对方会误报失联
    const g = G(); if (!linkable(g)) return;
    const p = g.player;
    window.Net.sendGame({
      t: 'state',
      x: Math.round(p.x), y: Math.round(p.y),
      dir: p.dir > 0 ? 1 : -1,
      map: myMap(),
      level: p.level,
      hp: Math.round(p.hp), maxhp: Math.round(p.maxhp),
      down: g.state === 'down',
      st: g.state,
      pid: window.Net.self ? (window.Net.self() || null) : null,   // 选举凭据：让对方「听见」我
      name: window.Net.self() ? String(window.Net.self()).slice(-4) : '伙伴'
    });
  }

  // ---------- 攻击特效：让队友看得见你在出手 ----------
  // 只传「看得见」的部分（位置/方向/形态），伤害仍走房主权威与 hit 上报，
  // 所以这些特效纯装饰，不参与任何命中判定。
  const FX_MAX = 48;
  let fxQueue = [];
  function queueFx(o) {
    if (!connected() || !o) return;
    if (fxQueue.length >= FX_MAX) return;
    // homing 类在本地会自己追敌，发给对方就按直线飞（视觉上够用，也避免同步追踪目标）
    fxQueue.push({
      x: Math.round(o.x), y: Math.round(o.y),
      vx: Math.round(o.vx), vy: Math.round(o.vy),
      r: o.r || 6, life: o.life || 1.2, spr: o.fx || 'sword'
    });
  }
  function flushFx() {
    if (!fxQueue.length) return;
    window.Net.sendGame({ t: 'fx', list: fxQueue });
    fxQueue = [];
  }

  function tickSend(dt) {
    refreshRole();   // 菜单态也保持角色最新（update 只在战斗/倒地时跑）
    if (!connected()) { acc = SEND_MS; enemyAcc = 0; partnerHurtAcc = 0; pingAcc = 0; fxQueue = []; return; }
    // P5：心跳测延迟（与游戏状态无关，菜单里也在跑）
    pingAcc += dt * 1000;
    if (pingAcc >= PING_MS) { pingAcc = 0; window.Net.sendGame({ t: 'ping', ts: Date.now() }); }
    // 关键消息重发到对方确认为止
    tickResend(dt);
    const g = G();
    // 不在战斗/倒地/菜单里（比如已经回标题或结算完）就别发了
    if (!linkable(g)) { acc = SEND_MS; lastMap = null; enemyAcc = 0; partnerHurtAcc = 0; return; }
    // 延迟越高越要少发：链路堵着的时候，发得越密越堵（手机网络上尤其明显）
    const posMs = rtt > 1500 ? 150 : (rtt > 800 ? 120 : SEND_MS);
    const enemyMs = rtt > 1500 ? 280 : (rtt > 800 ? 220 : ENEMY_MS);
    const mid = myMap();
    if (mid !== lastMap) { sendState(); lastMap = mid; acc = 0; }
    else {
      acc += dt * 1000;
      if (acc >= posMs) { acc = 0; sendState(); }
    }
    // 本周期的攻击特效随位置包一起走（DataChannel，便宜，看着才连贯）
    flushFx();
    // 房主：周期广播敌人快照 + 本周期队友致伤
    if (g.coopRole === 'host') {
      enemyAcc += dt * 1000;
      if (enemyAcc >= enemyMs) {
        enemyAcc = 0;
        sendEnemies(g);
        if (partnerHurtAcc > 0) {
          const d = partnerHurtAcc; partnerHurtAcc = 0;
          window.Net.sendGame({ t: 'hurt', dmg: d });
        }
      }
    }
  }

  // HOST：把当前场上（含 boss）的敌人快照 + 限距弹幕 + 本周期伤害飘字发给客机
  // 这一包是联机带宽的大头，也是手机高延迟的主因：只发两人附近的东西，并按距离取前 N 个。
  // 远处的怪既看不见也打不着，全量发只会把链路堵死，结果是全队一起卡。
  const MAX_ENEMIES = 24, MAX_EB = 24, MAX_DROPS = 40;
  const NEAR_R = 900, NEAR_DROP = 1000;
  function sendEnemies(g) {
    const px = g.player ? g.player.x : 0, py = g.player ? g.player.y : 0;
    const pt = (g.partner && g.partner.shown) ? g.partner : null;
    const near = (o) => {
      const d1 = Math.hypot(px - o.x, py - o.y);
      const d2 = pt ? Math.hypot(pt.x - o.x, pt.y - o.y) : 1e9;
      return d1 < d2 ? d1 : d2;
    };
    const all = g.boss ? g.enemies.concat([g.boss]) : g.enemies;
    const cand = [];
    for (const e of all) {
      if (e._dead) continue;
      const d = near(e);
      if (d < NEAR_R || e.boss) cand.push({ e: e, d: d, b: e.boss ? 1 : 0 });
    }
    cand.sort((a, b) => (b.b - a.b) || (a.d - b.d));   // Boss 优先，其余按离人近的先发
    const list = [];
    for (const c of cand.slice(0, MAX_ENEMIES)) {
      const e = c.e;
      list.push({
        _id: e._id, type: e.type, x: Math.round(e.x), y: Math.round(e.y),
        hp: Math.round(e.hp), maxhp: Math.round(e.maxhp), r: e.r,
        spr: e.spr, scale: e.scale || 1, facing: e._flip ? -1 : 1,
        hit: e.hitFlash > 0, dashing: e.dashing || 0, wob: !!e.wob,
        elite: !!e.elite, name: e.name || '', boss: !!e.boss
      });
    }
    // 只发靠近两人、有威胁的弹幕（限距，省流量）
    const eb = [];
    for (const b of g.ebullets) {
      if (near(b) >= 700 || eb.length >= MAX_EB) continue;
      eb.push({ x: Math.round(b.x), y: Math.round(b.y), r: b.r, dmg: b.dmg });
    }
    const dmgs = g._coopDmgs || []; g._coopDmgs = [];
    // 掉落：房主权威。把场上掉落快照发给客机（含稳定 _id，便于拾取同步），客机据此渲染与领取
    const drops = [];
    if (g.vacuumT <= 0) {
      // 先按距离收集再取最近的一批：场上掉落多时，不能让「刚掉的那一件」被上限挤掉
      const nearOnes = [];
      const collect = (arr, kind) => {
        for (const d of arr) { const nd = near(d); if (nd < NEAR_DROP) nearOnes.push({ d: d, kind: kind, nd: nd }); }
      };
      collect(g.gems, 'gem'); collect(g.herbs, 'herb'); collect(g.loot, 'loot');
      nearOnes.sort((a, b) => a.nd - b.nd);
      for (const c of nearOnes.slice(0, MAX_DROPS)) {
        const d = c.d;
        if (d._id == null) d._id = ++dropSeq;
        const o = { id: d._id, kind: c.kind, x: Math.round(d.x), y: Math.round(d.y) };
        if (c.kind === 'gem') { o.val = d.val; o.stone = !!(d.kind && d.kind === 'stone'); }
        else if (c.kind === 'loot') { o.itemId = d.item ? d.item.id : null; o.rarity = d.item ? d.item.rarity : 0; o.mat = !!d.mat; }
        drops.push(o);
      }
    }
    // 带上「地图时间进度」：后进图的人据此对齐房主的进度（精英/Boss/剧情都挂在时间上），
    // 不然他本地时间从 0 起算，会和房主各刷各的怪。
    window.Net.sendGame({
      t: 'enemy', list: list, eb: eb, dmgs: dmgs, drops: drops, vac: g.vacuumT > 0 ? 1 : 0,
      tm: Math.round(g.time * 10) / 10,      // 房主当前地图时间
      sp: Math.round(g.spawnT * 10) / 10,    // 下次遇敌倒计时
      el: g.eliteIdx || 0,                   // 已出的精英数
      ne: Math.round(g.nextEliteT || 0),     // 下一个精英的时间点
      bs: g.bossSpawned ? 1 : 0,             // Boss 是否已登场
      ba: g.bossActive ? 1 : 0,
      bw: g.bossWarned ? 1 : 0
    });
  }

  // ---------- 接收 ----------
  function onData(from, data) {
    if (!data) return;
    // 关键消息先回执（哪怕下面处理时判重跳过），对方才不会再重发
    if (data._s != null) window.Net.sendGame({ t: 'ack', s: data._s });
    if (data.t === 'fx') { onFx(data); return; }
    if (data.t === 'dlg') { if (window.__FR && window.__FR.coopApplyDlg) window.__FR.coopApplyDlg(data.d); return; }
    if (data.t === 'pause') { if (window.__FR && window.__FR.coopApplyPause) window.__FR.coopApplyPause(!!data.on); return; }
    if (data.t === 'enc') { if (window.__FR && window.__FR.grantEncShare) window.__FR.grantEncShare(data.p); return; }
    if (data.t === 'stage') { if (window.__FR && window.__FR.settleMate) window.__FR.settleMate(data.x, data.y, data.d); return; }
    if (data.t === 'state') { onState(data); return; }
    if (data.t === 'enemy') { onEnemy(data); return; }
    if (data.t === 'hit') { onHit(data); return; }
    if (data.t === 'hurt') { onHurt(data); return; }
    if (data.t === 'taken') { onTaken(data); return; }
    if (data.t === 'end') { onEnd(data); return; }
    if (data.t === 'ping') { window.Net.sendGame({ t: 'pong', ts: data.ts }); return; }
    if (data.t === 'pong') {
      const r = Date.now() - data.ts;
      if (r >= 0 && r < 5000) rtt = rtt ? Math.round(rtt * 0.6 + r * 0.4) : r;   // 平滑，别跳字
      return;
    }
    if (data.t === 'reward') { onReward(data); return; }
    if (data.t === 'down') { onDown(); return; }
    if (data.t === 'revive') { onRevive(); return; }
    if (data.t === 'revived') { onRevived(); return; }
    if (data.t === 'ack') { pend.delete(data.s); return; }
  }

  // ---------- P6 倒地 / 救援 ----------
  function sendDown() { if (connected()) window.Net.sendGame({ t: 'down' }); }
  function onDown() { const g = G(); if (!g || !g.partner) return; g.partner.down = true; g.rescueT = 0; }
  function sendRevive() { if (connected()) sendReliable({ t: 'revive' }); }   // 丢了人就白躺 30 秒
  function onRevive() {
    const g = G(); if (!g) return;
    if (g.state !== 'down') return;         // 已经站起来了就别再补一刀（会掉血）
    if (window.__FR && window.__FR.revive) window.__FR.revive(0.5);
  }
  function sendRevived() { if (connected()) window.Net.sendGame({ t: 'revived' }); }
  function onRevived() { const g = G(); if (!g || !g.partner) return; g.partner.down = false; g.rescueT = 0; }

  // CLIENT→HOST 或 HOST→CLIENT：某掉落被一方领取，对方移除，避免重复拾取
  function reportTaken(id) {
    if (!connected()) return;
    sendReliable({ t: 'taken', id: id });   // 丢了会导致双方重复捡同一件
  }
  function onTaken(data) {
    const g = G(); if (!g || data.id == null) return;
    for (const arr of [g.gems, g.herbs, g.loot]) {
      const i = arr.findIndex(x => x._id === data.id);
      if (i >= 0) { arr.splice(i, 1); break; }
    }
  }

  // HOST→CLIENT：共享胜负。win=房主通关；lose=任一方倒下
  // 这条消息丢了就永远不同步（一边结算、一边还在打），所以必须重发到对方确认为止 ——
  // 手机上丢包是常态，这一条比省流量重要得多。
  function sendEnd(result) {
    if (!connected()) return;
    const g = G(); if (!g) return;
    // 丢了就是「一边在结算、一边还在打」，必须可靠送达
    sendReliable({ t: 'end', r: result, kills: g.kills, time: g.time });
  }
  function onEnd(data) {
    const g = G(); if (!g) return;
    if (g._endSent) return;   // 重发到达：已经在结算了就别再来一遍
    g._endSent = true;
    if (data.r === 'win') {
      // 躺着的人也算过关：不救起来，他会一直卡在观战态，整局白打
      if (g.state === 'play' || g.state === 'dialog' || g.state === 'down') {
        if (data.kills != null) g.kills = data.kills;
        if (data.time != null) g.time = data.time;
        if (g.state === 'down' && window.__FR && window.__FR.revive) window.__FR.revive(1);
        if (window.__FR && window.__FR.startOutro) window.__FR.startOutro();
      }
    } else if (data.r === 'lose') {
      if (g.state !== 'gameover' && g.state !== 'victory') {
        if (data.kills != null) g.kills = data.kills;
        if (data.time != null) g.time = data.time;
        if (window.__FR && window.__FR.gameOver) window.__FR.gameOver();
      }
    }
  }

  // P5：Boss 收尾战利品分成。房主自动收走全图掉落时，给客机补一份等额修为 / 灵石 / 回血
  // （道具不复制，避免装备一式两份；修为与灵石按 50% 给，客机不至于白打一场）
  function sendReward(share) {
    if (!connected() || !share) return false;
    const items = (share.items || []).slice(0, 24);   // 上限兜底，别让一个包太大
    if (!share.xp && !share.stones && !share.hp && !items.length) return false;
    // 分成丢了就白打一场，且重发到达时会被重复入袋 → 可靠 + 判重
    sendReliable({
      t: 'reward',
      xp: Math.round(share.xp || 0), stones: Math.round(share.stones || 0), hp: Math.round(share.hp || 0),
      items: items
    });
    return true;
  }
  function onReward(data) {
    const g = G(); if (!g || !g.player) return;
    if (data._s != null) {
      if (seen.has(data._s)) return;      // 重发到达：同一份分成只入袋一次
      seen.add(data._s);
      if (seen.size > 64) seen.clear();
    }
    if (window.__FR && window.__FR.applyShare) window.__FR.applyShare(data);
  }

  // ---------- 剧情 / 际遇对话同步 ----------
  // 房主起对话、逐句推进、收摊，都广播给客机；客机镜像同一段对话。
  // 客机若先点掉，则由 game.js 置 coopFrozen 冻结场上（怪物/特效/掉落静止），
  // 等房主点完发 off 才解冻，立刻恢复刚才的战斗状态。
  function sendDlg(data) {
    if (!connected()) return;
    const g = G();
    if (!g || g.coopRole !== 'host' || !g.coopShared) return;   // 只有共斗中的房主才广播
    window.Net.sendGame({ t: 'dlg', d: data });
  }

  // ---------- 际遇所得：随机分给两个人 ----------
  // 谁碰到际遇都行，但道具不归一个人独吞：随机分成两份，
  // 分给队友的那份发过去，由他本地入袋（走 DataChannel）。
  function sendEncShare(payload) {
    if (!connected() || !payload) return;
    window.Net.sendGame({ t: 'enc', p: payload });
  }

  // ---------- 结算小舞台：走动位置同步 ----------
  function sendStage(x, y, d) {
    if (!connected()) return;
    window.Net.sendGame({ t: 'stage', x: x, y: y, d: d });
  }

  // ---------- 暂停同步 ----------
  // 任一方暂停/恢复都同步给对方：双方一起停下来，好说话
  function sendPause(on) {
    if (!connected()) return;
    window.Net.sendGame({ t: 'pause', on: on ? 1 : 0 });
  }

  // 队友的攻击特效：生成本地纯视觉弹（不判伤害，伤害另走房主权威 / hit 上报）
  function onFx(data) {
    const g = G(); if (!g || !Array.isArray(data.list)) return;
    if (!Array.isArray(g.fxBullets)) g.fxBullets = [];
    for (const f of data.list) {
      if (!f || g.fxBullets.length >= 160) continue;
      g.fxBullets.push({
        x: f.x, y: f.y, vx: f.vx || 0, vy: f.vy || 0,
        r: f.r || 6, life: f.life || 1.2, maxlife: f.life || 1.2, spr: f.spr || 'sword'
      });
    }
  }

  // P2：位置同步 → 建 / 更新 G.partner
  function onState(data) {
    const g = G(); if (!g) return;
    if (data.pid) heard.set(data.pid, performance.now());   // 听见了他 → 参与房主选举
    if (!g.partner) {
      g.partner = {
        x: data.x, y: data.y, tx: data.x, ty: data.y,
        dir: data.dir > 0 ? 1 : -1, r: 9,
        name: data.name || '伙伴', level: data.level || 1,
        hp: data.hp || 1, maxhp: data.maxhp || 1,
        map: data.map || null, last: performance.now(), shown: false
      };
    } else {
      const pt = g.partner;
      pt.tx = data.x; pt.ty = data.y; pt.dir = data.dir > 0 ? 1 : -1;
      pt.level = data.level || pt.level;
      pt.hp = data.hp; pt.maxhp = data.maxhp;
      pt.map = data.map != null ? data.map : pt.map;
      pt.name = data.name || pt.name;
      pt.down = !!data.down;              // P6：倒地状态随位置包一起到（不再单独发心跳）
      pt.st = data.st || 'play';          // 队友此刻在干什么（洞府/谈话/战斗…）
      pt.last = performance.now();
    }
  }

  // P3：敌人快照 → 客机重建远程敌人 + 镜像掉落
  function onEnemy(data) {
    const g = G(); if (!g) return;
    // 不在同一张图（或有一方在菜单里）就不镜像：各打各的，别把对面的怪投到自己地图上
    if (!sharesMap(g)) return;
    // 自己是房主（怪的权威方）就绝不接受别人的快照：
    // 否则双方都以为自己是房主时，会互相用对方的快照覆盖自己的怪，场上怪直接错乱。
    if (g.coopRole === 'host') return;
    // 对齐房主的时间进度：后进图的人本地时间从 0 起算，会和房主各刷各的怪。
    // 直接采用房主的时钟与遇敌进度，双方才在同一条时间线上共同打。
    if (data.tm != null) {
      // 追进度（后进图一次性跳到房主时间）时，把已经错过的定时剧情标成已过：
      // 否则 checkStory 会按新时间把过去那些对话一次性全弹出来，人就被钉在对话里打不了。
      if (data.tm - g.time > 5 && window.STORY && g.mapId) {
        for (const s of window.STORY) {
          if (s.map === g.mapId && s.t != null && s.t <= data.tm) s.done = true;
        }
      }
      g.time = data.tm;
      if (data.sp != null) g.spawnT = data.sp;
      if (data.el != null) g.eliteIdx = data.el;
      if (data.ne != null) g.nextEliteT = data.ne;
      g.bossSpawned = !!data.bs;
      g.bossWarned = !!data.bw;
      // bossActive 必须等下面确认「本地真有 Boss 实体」再置真（见后），
      // 否则 updateBoss 会拿到 null 的 G.boss 直接崩。
    }
    const list = data.list || [];
    // 按 _id 复用旧的远程怪：位置存成目标，每帧插值过去（延迟高时才不会一格一格跳）
    const prev = new Map();
    for (const e of g.enemies) if (e._remote && e._id != null) prev.set(e._id, e);
    const next = [];
    for (const s of list) {
      const old = prev.get(s._id);
      const e = old || { _id: s._id, _remote: true, x: s.x, y: s.y, t: 0 };
      e.type = s.type; e.hp = s.hp; e.maxhp = s.maxhp; e.r = s.r; e.spr = s.spr; e.scale = s.scale || 1;
      e._flip = s.facing < 0; e.hitFlash = s.hit ? 0.12 : 0; e.dashing = s.dashing || 0;
      e.wob = s.wob; e.elite = s.elite; e.name = s.name; e.boss = s.boss;
      e.tx = s.x; e.ty = s.y;
      if (!old) { e.x = s.x; e.y = s.y; }
      next.push(e);
    }
    g.enemies = next;
    // Boss 用房主快照里的镜像：本地绝不自己再刷一个（否则场上两个 Boss）
    if (data.tm != null) {
      const mb = g.enemies.find(e => e.boss) || null;
      if (mb) g.boss = mb;
      // 只有真的有 Boss 实体才置 active：否则 updateBoss 会读 null 崩掉
      g.bossActive = !!(data.ba && mb);
    }
    g.ebullets = [];
    for (const b of (data.eb || [])) g.ebullets.push({ x: b.x, y: b.y, r: b.r, dmg: b.dmg, _remote: true, life: 1 });
    for (const d of (data.dmgs || [])) {
      if (g.texts) g.texts.push({ x: d.x, y: d.y, vy: -30, life: 0.8, maxlife: 0.8, text: String(d.d), color: d.crit ? '#ffd24a' : '#fff', size: d.crit ? 18 : 13 });
    }
    // 掉落镜像：重建客机侧的 gems/herbs/loot；已领取的 id 不再渲染，并清理离场 id
    g.gems = []; g.herbs = []; g.loot = [];
    const seen = g._claimedDrops || (g._claimedDrops = new Set());
    const live = new Set();
    for (const s of (data.drops || [])) {
      live.add(s.id);
      if (seen.has(s.id)) continue;
      if (s.kind === 'gem') g.gems.push({ _id: s.id, _remote: true, x: s.x, y: s.y, r: 5, val: s.val, kind: s.stone ? 'stone' : undefined });
      else if (s.kind === 'herb') g.herbs.push({ _id: s.id, _remote: true, x: s.x, y: s.y, r: 6 });
      else if (s.kind === 'loot') { const it = s.itemId && window.Items ? window.Items.get(s.itemId) : null; g.loot.push({ _id: s.id, _remote: true, x: s.x, y: s.y, r: 9, item: it, mat: !!s.mat }); }
    }
    for (const id of Array.from(seen)) if (!live.has(id)) seen.delete(id);
    g._hostVacuum = !!data.vac;
  }

  // P3：CLIENT→HOST 子弹命中远程怪的上报
  function reportHit(id, dmg) {
    if (!connected()) return;
    window.Net.sendGame({ t: 'hit', id: id, dmg: dmg });
  }

  // HOST 收到上报 → 在权威敌人上扣血（damageEnemy 内部会再广播飘字）
  function onHit(data) {
    if (!data || data.id == null) return;
    if (window.__FR && window.__FR.damageEnemyById) window.__FR.damageEnemyById(data.id, data.dmg);
  }

  // HOST 侧累计队友（partner）被怪/弹幕撞到的致伤，随周期下发
  function addPartnerHurt(dmg) {
    if (!connected()) return;
    const g = G();
    if (g && g.partner && g.partner.down) return;   // P6：躺着的人不再吃伤
    partnerHurtAcc += (dmg || 0);
  }

  // CLIENT 收到致伤 → 本地扣血
  function onHurt(data) {
    const g = G(); if (!g || !g.player) return;
    if (window.__FR && window.__FR.hurtSelf) window.__FR.hurtSelf(data.dmg);
  }

  // HOST 侧：收集本周期对敌伤害飘字，随敌人快照发给客机（客机据此飘字）
  function queueDmg(x, y, d, crit) {
    const g = G(); if (!g) return;
    if (!g._coopDmgs) g._coopDmgs = [];
    g._coopDmgs.push({ x: Math.round(x), y: Math.round(y), d: d, crit: !!crit });
  }

  // ---------- 每帧插值（P2）----------
  // 插值速度也随延迟走：延迟越高，追得越"缓"，看起来是顺的，而不是一格一格蹦
  function smoothK() { return Math.max(5, Math.min(14, 14 - rtt / 400)); }

  function update(dt) {
    const g = G(); if (!g) return;
    refreshRole();
    // 远程怪插值：先算好目标，再平滑过去（共斗时怪才不会瞬移）
    const ke = Math.min(1, dt * smoothK());
    if (g.enemies) for (const e of g.enemies) {
      if (!e._remote) continue;
      if (e.tx != null) { e.x += (e.tx - e.x) * ke; e.y += (e.ty - e.y) * ke; }
      e.t = (e.t || 0) + dt;
    }
    if (!g.partner) { lost = false; return; }
    const pt = g.partner;
    const k = Math.min(1, dt * smoothK());
    pt.x += (pt.tx - pt.x) * k;
    pt.y += (pt.ty - pt.y) * k;
    const stale = (performance.now() - pt.last) > STALE_MS;
    // P6：自己躺着观战时也算「在联机」，队友该照常显示
    const inWorld = g.state === 'play' || g.state === 'down';
    pt.shown = !stale && inWorld && pt.map != null && pt.map === myMap();
    // P5：掉线 / 重连提示（只在翻转时喊一次，别刷屏）
    const say = t => { if (window.__FR && window.__FR.coopBanner) window.__FR.coopBanner(t); };
    if (stale && !lost) { lost = true; say('队友暂时失联 · 等待重连'); }
    else if (!stale && lost) { lost = false; say('队友回来了'); }
  }

  // ---------- 渲染：世界空间（P2）----------
  function draw(ctx) {
    const g = G(); if (!g || !g.partner || !g.partner.shown) return;
    const pt = g.partner;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(pt.x, pt.y + 8, 9, 4, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(90,200,255,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r + 8, 0, 6.28); ctx.stroke();
    const down = (pt.hp || 0) <= 0;
    const c = window.Sprites && window.Sprites.hanli;
    if (c) {
      const sc = 1.7, w = c.width * sc, h = c.height * sc;
      ctx.save(); ctx.translate(pt.x, pt.y);
      if (down) ctx.globalAlpha = 0.42;                 // 倒下：半透明躺着，别画蛇添足做尸体动画
      if (pt.dir < 0) ctx.scale(-1, 1);
      ctx.drawImage(c, -w / 2, -h / 2, w, h); ctx.restore();
    }
    // 气血（在名牌上方，一眼看见队友还剩多少）
    const ratio = Math.max(0, Math.min(1, (pt.hp || 0) / (pt.maxhp || 1)));
    const bw = 36, bh = 4;
    ctx.fillStyle = 'rgba(10,20,30,0.72)';
    ctx.fillRect(pt.x - bw / 2 - 1, pt.y - 47, bw + 2, bh + 2);
    ctx.fillStyle = down ? '#ff6b6b' : (ratio > 0.5 ? '#7fe0a0' : (ratio > 0.25 ? '#ffd24a' : '#ff8f5a'));
    ctx.fillRect(pt.x - bw / 2, pt.y - 46, bw * (down ? 1 : ratio), bh);
    // 名牌：名字 + 等级（倒下时标出来）
    const name = '队友·' + (pt.name || '') + (down ? ' 倒下' : '');
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    const tw = ctx.measureText(name).width + 10;
    ctx.fillStyle = 'rgba(10,20,30,0.72)';
    ctx.fillRect(pt.x - tw / 2, pt.y - 40, tw, 15);
    ctx.fillStyle = down ? '#ff9a9a' : '#bfe9ff';
    ctx.fillText(name, pt.x, pt.y - 29);
    // P6 救援：站着的人凑近他，外圈进度走满就拉起来
    if (down) {
      const prog = Math.min(1, (g.rescueT || 0) / 1.2);
      ctx.strokeStyle = 'rgba(255,210,74,0.25)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r + 15, 0, 6.283); ctx.stroke();
      if (prog > 0) {
        ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r + 15, -1.5708, -1.5708 + 6.283 * prog); ctx.stroke();
      }
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = prog > 0 ? '#ffd24a' : '#ff9a9a';
      ctx.fillText(prog > 0 ? '救援中…' : '站到身边救人', pt.x, pt.y + 42);
    }
  }

  // ---------- 渲染：屏幕空间角标（P2 / P5 强化）----------
  // P5：角标原来画在 (8,8)，一直被 DOM 气血压着看不见。改为按 #hud 实际底边
  // 动态下移（换算成逻辑坐标，1 秒缓存一次，别每帧 getBoundingClientRect）。
  let hudTop = 96, hudTopAt = 0;
  function hudTopY() {
    const now = performance.now();
    if (now - hudTopAt > 1000) {
      hudTopAt = now;
      try {
        // #hud 是 inset:0 的全屏容器，量不得；要量里面的 #topbar（气血/状态那一条）
        const el = document.getElementById('topbar') || document.getElementById('hud');
        const r = el ? el.getBoundingClientRect() : null;
        const cv = document.querySelector('canvas');
        const cvTop = cv ? cv.getBoundingClientRect().top : 0;
        const sc = (window.__FR && window.__FR.view) ? (window.__FR.view().scale || 1) : 1;
        if (r && r.bottom > 0 && el.id === 'topbar') hudTop = Math.max(8, Math.round((r.bottom - cvTop) / sc) + 10);
      } catch (e) { /* 量不到就用兜底值 */ }
    }
    return hudTop;
  }
  function drawHud(ctx) {
    if (!connected()) return;
    const g = G();
    const online = !!(g && g.partner && g.partner.shown);
    const pt = g && g.partner;
    const role = g && g.coopRole === 'host' ? '房主' : (g && g.coopRole === 'client' ? '客机' : '联机');
    let txt, color;
    if (lost) { txt = '队友失联 · 等待重连…'; color = '#ffd24a'; }
    else if (pt && pt.down) { txt = '队友倒下 · 过去拉他一把'; color = '#ff8f8f'; }
    else if (pt && pt.map != null && pt.map !== myMap()) {
      // 不同图 = 不可能共斗。别让玩家猜，直接告诉他去哪张图
      const nm = (window.__FR && window.__FR.mapName) ? window.__FR.mapName(pt.map) : pt.map;
      txt = '队友在「' + nm + '」· 进同一张图才共斗'; color = '#ffd24a';
    }
    else if (pt && pt.st && pt.st !== 'play') { txt = '队友在' + (ST_LABEL[pt.st] || '忙'); color = '#ffd24a'; }
    else if (online) {
      // 把共怪数直接写在角标上：手机上瞄一眼就知道有没有真的在共斗，不用猜
      const n = (g.coopRole === 'client') ? g.enemies.filter(e => e._remote).length : g.enemies.length;
      txt = '联机 · 队友在线 · ' + role + (rtt ? ' · ' + rtt + 'ms' : '') + ' · 共怪 ' + n;
      color = '#7fe0a0';
    }
    else if (g && g.coopShared) { txt = '联机 · ' + role + ' · 共斗中'; color = '#7fe0a0'; }
    else { txt = '联机 · ' + role + ' · 等待队友'; color = '#bfe9ff'; }
    const y = hudTopY();
    ctx.save();
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const w = ctx.measureText(txt).width + 14;
    ctx.fillStyle = 'rgba(10,20,30,0.65)';
    ctx.fillRect(8, y, w, 20);
    ctx.fillStyle = color;
    ctx.fillText(txt, 15, y + 15);
    ctx.restore();
  }

  // ---------- 清理 ----------
  function reset() {
    const g = G(); if (g) g.partner = null;
    acc = SEND_MS; lastMap = null; enemyAcc = 0; partnerHurtAcc = 0;
    lost = false;
  }
  function clearPartner() {
    const g = G(); if (g) g.partner = null;
    lost = false;
  }
  function latency() { return rtt; }
  function link() { return { lost: lost, rtt: rtt, online: !!(G() && G().partner && G().partner.shown) }; }

  if (window.Net) window.Net.on('message', m => onData(m.from, m.data));

  window.Coop = {
    reset, clearPartner, update, draw, drawHud, tickSend, sendState, onData,
    reportHit, addPartnerHurt, queueDmg, reportTaken, sendEnd, sendReward,
    latency, link, sendDown, sendRevive, sendRevived,
    queueFx, onFx,   // 攻击特效互见（纯视觉；测试也用这两个）
    sendDlg, sendPause, sendEncShare, sendStage   // 对话同步 / 暂停同步 / 际遇分成 / 结算舞台
  };
})();
