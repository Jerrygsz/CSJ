// ============================================================================
// 双人联机 · 传输分层（成本约束版）
//
// 【硬约束】Metered 只负责「房间发现 + 连接协商」，绝不承载任何游戏数据：
//   ✅ Metered 承载：加入/离开房间、发现 peer、SDP offer/answer、ICE candidate
//   ✅ 自建 DataChannel 承载：角色移动、怪物状态、战斗数据、掉落/胜负等一切业务数据
//   ❌ 禁止：把 state / enemy / hit / hurt / taken / end / ack / ping / pong /
//            reward / down / revive / revived 等丢给 Metered 的 send()
//
// 为什么必须这样：
//   Metered 的 send() 是它的实时消息通道（按流量计费且会走它自己的中转），
//   战斗数据是每秒十几到几十条的高频小包，丢给它既贵又没必要。
//   正确做法是用它把两个浏览器的 RTCPeerConnection 牵上手（一次性协商），
//   之后所有高频数据都走点对点的 RTCDataChannel，不再产生中继流量。
//
// 因此这里刻意不使用 Metered 的 TURN 中继：
//   一旦收集中继候选并被采用，所有 media/data 都要过它的服务器转发，
//   等于让 Metered 传了战斗数据 —— 违规且最贵。默认只走 STUN 直连，
//   需要中继时显式调用 setRelay(true) 才会加入 TURN 候选。
//
// 设计要点：
//  - SDK 懒加载：只有点了「双人联机」才去取 CDN，单人玩法与自动化测试完全不受影响。
//  - 房主选举：房内 peerId 最小者为房主（含自己），双方算法一致，不必争抢。
//  - 发起方向：同样按 peerId 决定谁发 offer（小的一方发起），天然避免双方同时发（glare）。
//  - 全程容错：拿不到 SDK / 连不上 / 没填 key，都只是提示，绝不抛错拖垮游戏。
// ============================================================================

// Metered 后台的 Publishable key（pk_live_…），本就可公开，放静态页面没问题。
// ⚠ 后台建 key 时务必勾上 Send（publishable key 默认关闭），
//   否则 join() 会成功但 P2P 永远协商不上 —— 这是官方文档点名的第一号坑。
const METERED_APP_ID = 'pk_live_2db8ea4d328eed04fb2d2a872360c8c065de4a45';

// Metered 只允许出现的「协商类」消息类型。除此之外一律视为违规的业务数据。
const SIG_TYPE = '__sig';
// 业务数据类型清单（出现在这些类型里的数据，一律禁止走 Metered）
const GAME_TYPES = new Set([
  'state', 'enemy', 'hit', 'hurt', 'taken', 'end', 'ack',
  'ping', 'pong', 'reward', 'down', 'revive', 'revived', 'hello',
  'fx', 'dlg', 'pause', 'chat', 'enc'   // 攻击特效 / 对话同步 / 暂停同步 / 飞鸽传书 / 际遇分成
]);

// ICE：默认只有 STUN（直连）。不给 TURN 就不会产生中继候选，
// 业务数据就不会经过 Metered —— 这是「最省钱」的关键。
const STUN_SERVERS = [
  { urls: 'stun:stun.metered.ca:80' },
  { urls: 'stun:stun.l.google.com:19302' }
];
// 需要中继时（如对称 NAT 打不通）才开启；开启后请注意：此时战斗数据会经过中继。
let ALLOW_RELAY = false;
let TURN_SERVERS = [];

window.Net = (function () {
  const L = { message: [], status: [], peers: [], log: [] };
  let peer = null, room = null, selfId = null, host = false;
  const remotes = new Map();   // peerId -> RemotePeer（Metered 发现的房间成员）
  const conns = new Map();     // peerId -> { pc, dc, open, making, pending[], restart }  自建 P2P

  function sdk() {
    const ns = window.MeteredPeer;
    if (!ns) return null;
    return ns.MeteredPeer || ns;   // UMD 全局：window.MeteredPeer.MeteredPeer
  }

  function on(kind, fn) { if (L[kind]) L[kind].push(fn); return fn; }
  function emit(kind, p) {
    (L[kind] || []).forEach(fn => { try { fn(p); } catch (e) { /* 监听者出错不影响联机 */ } });
  }
  function setStatus(text, tone) { emit('status', { text: text, tone: tone || 'info' }); }
  function say(line) { emit('log', { line: line }); }
  const short = id => String(id || '').slice(0, 8);

  // 懒加载 SDK：不点联机就不发这个请求
  function loadSdk() {
    if (sdk()) return Promise.resolve(true);
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@metered-ca/realtime/dist/index.umd.js';
      s.async = true;
      let done = false;
      const fin = v => { if (!done) { done = true; resolve(v); } };
      s.onload = () => fin(!!sdk());
      s.onerror = () => fin(false);
      document.head.appendChild(s);
      setTimeout(() => fin(!!sdk()), 8000);   // 兜底超时，别把界面卡死
    });
  }

  function iceConfig() {
    const servers = STUN_SERVERS.slice();
    if (ALLOW_RELAY && TURN_SERVERS.length) servers.push.apply(servers, TURN_SERVERS);
    return { iceServers: servers };
  }

  // 房主 = 房内（含自己）peerId 最小者。双方各算各的，结果必然一致。
  function recomputeHost() {
    const ids = [selfId].concat(Array.from(remotes.keys())).filter(Boolean).sort();
    host = !!selfId && ids.length > 0 && ids[0] === selfId;
    emit('peers', {
      host: host, count: remotes.size + (selfId ? 1 : 0), selfId: selfId,
      peers: Array.from(remotes.keys()), game: gameReady()
    });
  }

  // ======================= 自建 P2P：业务数据专用通道 =======================
  function gameReady() {
    for (const c of conns.values()) if (c.open && c.dc && c.dc.readyState === 'open') return true;
    return false;
  }

  // 由 peerId 决定谁发 offer：小的一方发起，双方算出来必然一致，不会同时发（glare）
  function weInitiate(id) {
    return !!selfId && !!id && String(selfId) < String(id);
  }

  // SDP / candidate 必须是「能过序列化」的纯对象：
  // RTCSessionDescription、RTCIceCandidate 是宿主对象，直接交给 Metered 的 send()
  // 会克隆失败（真实环境报 "could not be cloned"），协商就永远走不完。
  function plainDesc(d) {
    if (!d) return null;
    return { type: d.type, sdp: d.sdp };
  }
  function plainCand(c) {
    if (!c) return null;
    if (typeof c.toJSON === 'function') { try { return c.toJSON(); } catch (e) {} }
    return { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex, usernameFragment: c.usernameFragment };
  }

  function ensureConn(id) {
    let c = conns.get(id);
    if (c) return c;
    let pc = null;
    try { pc = new RTCPeerConnection(iceConfig()); } catch (e) { return null; }
    c = { pc: pc, dc: null, open: false, making: false, pending: [], restart: 0 };
    pc.onicecandidate = ev => {
      if (ev && ev.candidate) { const c2 = plainCand(ev.candidate); if (c2) sendSig(id, { k: 'ice', c: c2 }); }
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'failed') {
        say('链路断开（' + short(id) + '）· 正在重连');
        // 一次 ICE 重启；仍不通就是网络实在打不通，提示用户别干等
        if (c.restart < 1 && weInitiate(id)) { c.restart++; try { startNegotiation(id, true); } catch (e) {} }
        else if (!ALLOW_RELAY) say('提示：对称 NAT 下直连会失败，可 Net.setRelay(true) 开中继（中继会承载战斗数据）');
      }
    };
    pc.ondatachannel = ev => { if (ev && ev.channel) attachDc(id, ev.channel); };
    conns.set(id, c);
    return c;
  }

  function attachDc(id, dc) {
    const c = conns.get(id); if (!c) return;
    c.dc = dc;
    dc.onopen = () => {
      c.open = true;
      say('业务通道已通 · ' + short(id) + '（此后战斗数据直连，不经 Metered）');
      setStatus('已连接 · 战斗数据直连', 'ok');
      recomputeHost();
    };
    dc.onclose = () => { c.open = false; setStatus('业务通道已断', 'warn'); if (window.Coop) window.Coop.clearPartner(); };
    dc.onerror = () => {};
    dc.onmessage = ev => {
      let d = null;
      try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (!d) return;
      emit('message', { from: id, data: d, via: 'dc' });
    };
  }

  async function flushPending(c) {
    if (!c.pc || !c.pc.remoteDescription) return;
    const q = c.pending; c.pending = [];
    for (const cand of q) { try { await c.pc.addIceCandidate(cand); } catch (e) {} }
  }

  async function startNegotiation(id, force) {
    const c = ensureConn(id);
    if (!c) return;
    if (c.making && !force) return;
    if (!weInitiate(id)) return;      // 不是发起方就等着收 offer
    if (c.pc && c.pc.connectionState === 'connected' && !force) return;
    c.making = true;
    try {
      if (!c.dc || c.dc.readyState === 'closed') attachDc(id, c.pc.createDataChannel('frgame', { ordered: true }));
      const off = await c.pc.createOffer();
      await c.pc.setLocalDescription(off);
      sendSig(id, { k: 'offer', s: plainDesc(c.pc.localDescription) });
    } catch (e) { c.making = false; say('协商失败（' + short(id) + '）：' + (e && e.message ? e.message : e)); }
  }

  // 协商载荷：唯一允许交给 Metered 的东西
  // 用广播而不是 sendTo：Metered SDK 的 sendTo 未必可靠（旧代码也只用过 broadcast send），
  // 协商消息一次就几条，广播成本可忽略；带上 to 字段，只让目标 peer 处理，避免错配。
  function sendSig(to, body) {
    if (!peer) return false;
    try { peer.send({ t: SIG_TYPE, to: to, b: body }); return true; } catch (e) { return false; }
  }

  async function onSig(from, body) {
    if (!body) return;
    const c = ensureConn(from); if (!c) return;
    try {
      if (body.k === 'offer') {
        await c.pc.setRemoteDescription(new RTCSessionDescription(body.s));
        await flushPending(c);
        const ans = await c.pc.createAnswer();
        await c.pc.setLocalDescription(ans);
        sendSig(from, { k: 'answer', s: plainDesc(c.pc.localDescription) });
      } else if (body.k === 'answer') {
        await c.pc.setRemoteDescription(new RTCSessionDescription(body.s));
        c.making = false;
        await flushPending(c);
      } else if (body.k === 'ice') {
        if (c.pc.remoteDescription && body.c) { try { await c.pc.addIceCandidate(new RTCIceCandidate(body.c)); } catch (e) {} }
        else if (body.c) c.pending.push(body.c);
      }
    } catch (e) { say('协商处理异常：' + (e && e.message ? e.message : e)); }
  }

  // 给每个已知的 peer 补一次协商（谁先发起取决于 peerId，与进房先后无关）
  function negotiateAll(force) {
    if (!selfId) return;
    for (const id of remotes.keys()) startNegotiation(id, !!force);
  }

  function dropConn(id) {
    const c = conns.get(id);
    if (!c) return;
    try { if (c.dc) c.dc.close(); } catch (e) {}
    try { if (c.pc) c.pc.close(); } catch (e) {}
    conns.delete(id);
  }

  // ======================= Metered：只做房间发现与协商 =======================
  async function join(roomId) {
    roomId = (roomId || '').trim();
    if (!roomId) { setStatus('先填一个房间号', 'bad'); return false; }
    if (!METERED_APP_ID) { setStatus('未填 Metered App ID', 'bad'); return false; }

    setStatus('正在载入联机模块…', 'info');
    const okSdk = await loadSdk();
    if (!okSdk) { setStatus('联机模块载入失败（检查网络 / CDN）', 'bad'); say('✗ SDK 没下来：cdn.jsdelivr.net 可能被网络挡了，换个网络试试'); return false; }
    say('联机模块已载入 · WebRTC ' + (typeof RTCPeerConnection !== 'undefined' ? '可用' : '不可用'));
    const P = sdk();
    if (!P) { setStatus('联机模块不可用', 'bad'); return false; }

    try {
      room = roomId;
      peer = new P({ apiKey: METERED_APP_ID });

      peer.on('connected', e => {
        selfId = (e && e.peerId) || peer.peerId || peer.id || selfId || null;
        say('已连上信令（仅用于找人与协商），我的 ID：' + short(selfId));
        recomputeHost();
        negotiateAll(false);
      });
      peer.on('peer-joined', ev => {
        const r = ev && ev.peer;
        if (!r) return;
        remotes.set(r.id, r);
        if (r.on) r.on('state-change', s2 => say('队友链路：' + (s2 && s2.to)));
        say('队友进入：' + short(r.id) + ' · 开始协商');
        recomputeHost();
        // 协商由 peerId 小的一方发起，先后进房都不会重复发
        startNegotiation(r.id, false);
        setStatus('房内 ' + (remotes.size + 1) + ' 人 · 正在协商数据通道', 'ok');
      });
      peer.on('peer-left', ev => {
        const r = ev && ev.peer;
        if (!r) return;
        remotes.delete(r.id);
        dropConn(r.id);
        say('队友离开：' + short(r.id));
        if (window.Coop) window.Coop.clearPartner();
        recomputeHost();
        setStatus(remotes.size ? '房内剩 ' + (remotes.size + 1) + ' 人' : '队友已离开', 'warn');
      });
      // Metered 的数据回调只允许出现协商消息；出现业务数据一律拦下
      // （防御性：防止以后改代码时顺手又把高频数据丢回 Metered）
      peer.on('data', ev => {
        const from = ev && ev.senderPeerId, data = ev && ev.data;
        if (data && data.t === SIG_TYPE) {
          // 广播来的协商包：只有 to 是自己才处理（to 为空则一律处理）
          if (data.to == null || data.to === selfId) onSig(from, data.b);
          return;
        }
        if (data && data.t && GAME_TYPES.has(data.t)) {
          say('⚠ 已拦截：业务数据「' + data.t + '」不得走 Metered，请改用 Net.sendGame()');
          return;
        }
        say('收到 ' + short(from) + '：' + JSON.stringify(data).slice(0, 90));
        emit('message', { from: from, data: data, via: 'metered' });
      });

      // 信令无响应也不能干等：15 秒没进去就按失败处理（WebRTC 被网络挡住时最常见）
      say('正在加入房间 ' + roomId + ' …');
      await Promise.race([
        peer.join(roomId),
        new Promise((_, rej) => setTimeout(() => rej(new Error('加入超时（15 秒无响应，多半是信令被网络挡住）')), 15000))
      ]);
      selfId = selfId || peer.peerId || peer.id || null;
      recomputeHost();
      negotiateAll(false);
      setStatus('已进房间 · ' + roomId + ' · 正在协商数据通道', 'ok');
      say('房间发现完成。之后战斗数据走直连，Metered 不再参与。');
      return true;
    } catch (e) {
      // 顺序很关键：先清理再报错 —— 不然 leave 的「已退出房间」会把真实原因顶掉，
      // 用户（尤其手机上）就只能看到一句没头没尾的「已退出房间」，查无可查。
      const msg = String((e && e.message) || e || '未知错误');
      try { leave(); } catch (e2) {}
      const low = msg.toLowerCase();
      let hint = '';
      if (low.includes('auth') || low.includes('permission') || low.includes('key') || low.includes('401')) {
        hint = '（像是 key/权限问题：检查 Metered 后台 key 是否勾了 Send）';
      } else if (low.includes('timeout') || low.includes('websocket') || low.includes('network') || low.includes('fetch') || low.includes(' signaling')) {
        hint = '（信令连不上：换 Wi-Fi/流量试试，关掉「省流量模式」和广告拦截）';
      } else if (low.includes('webrtc') || low.includes('rtc') || low.includes('candidate')) {
        hint = '（P2P 打洞失败：常见于运营商 NAT，试试开热点互连）';
      }
      setStatus('连接失败：' + msg + hint, 'bad');
      say('✗ 加入失败：' + msg + hint);
      // 环境自检：一眼分清「手机不支持」「断网」「SDK 没下来」三类问题
      say('诊断：WebRTC ' + (typeof RTCPeerConnection !== 'undefined' ? '可用' : '不可用（浏览器太旧/被禁）') +
        ' · 网络' + (navigator.onLine ? '在线' : '离线') +
        ' · 联机模块' + (sdk() ? '已载入' : '未载入'));
      return false;
    }
  }

  function leave() {
    try { if (peer && typeof peer.leave === 'function') peer.leave(); } catch (e) {}
    try { if (peer && typeof peer.close === 'function') peer.close(); } catch (e) {}
    for (const id of Array.from(conns.keys())) dropConn(id);
    peer = null; remotes.clear(); room = null; selfId = null; host = false;
    if (window.Coop) window.Coop.clearPartner();
    setStatus('已退出房间', 'info');
    emit('peers', { host: false, count: 0, selfId: null, peers: [], game: false });
  }

  // ---------- 出口①：业务数据只能走 DataChannel ----------
  // 所有高频战斗数据（移动 / 怪物 / 命中 / 掉落 / 胜负）的唯一出口。
  // 通道没就绪时安静返回 false，调用方自然降级（跟单机一样），不抛错。
  function sendGame(obj) {
    if (!obj) return false;
    let n = 0;
    for (const c of conns.values()) {
      if (c.dc && c.dc.readyState === 'open') {
        try { c.dc.send(JSON.stringify(obj)); n++; } catch (e) {}
      }
    }
    return n > 0;
  }
  function sendGameTo(id, obj) {
    const c = conns.get(id);
    if (!c || !c.dc || c.dc.readyState !== 'open') return false;
    try { c.dc.send(JSON.stringify(obj)); return true; } catch (e) { return false; }
  }

  // ---------- 出口②：Metered 仅用于房间发现 / 协商 ----------
  // 保留 send/sendTo 给协商使用；一旦传进业务数据类型，直接拦下并留痕，
  // 这是防止将来「顺手用老接口」的最后一道闸。
  function guardMetered(obj) {
    if (obj && obj.t && (GAME_TYPES.has(obj.t) || obj._s != null)) {
      say('⚠ 已拦截：业务数据「' + obj.t + '」不得走 Metered → 已挡下，请改用 Net.sendGame()');
      return false;
    }
    return true;
  }
  // 闸刀必须跑在最前面：没连房间（peer 为 null）时也要照常拦下并留痕，
  // 否则「先判 peer 再判类型」会让违规调用在离线状态下静悄悄溜过去，无从察觉。
  async function send(obj) {
    if (!guardMetered(obj)) return false;
    if (!peer) return false;
    try { await peer.send(obj); return true; } catch (e) { return false; }
  }
  async function sendTo(id, obj) {
    if (!guardMetered(obj)) return false;
    if (!peer) return false;
    try { await peer.sendTo(id, obj); return true; } catch (e) { return false; }
  }

  return {
    on: on, join: join, leave: leave,
    // 业务数据通道（自建 DataChannel，唯一正确出口）
    sendGame: sendGame, sendGameTo: sendGameTo,
    gameReady: gameReady, gamePeers: () => Array.from(conns.keys()),
    // Metered 通道（仅限房间发现 / 协商；业务数据会被拦下）
    send: send, sendTo: sendTo, sendControl: send,
    setRelay(onRelay, servers) {
      ALLOW_RELAY = !!onRelay;
      if (servers && servers.length) TURN_SERVERS = servers;
      say('中继模式：' + (ALLOW_RELAY ? '开（注意：此时战斗数据会经过中继，Metered 会计费）' : '关（默认，直连最省）'));
      return ALLOW_RELAY;
    },
    relayOn: () => ALLOW_RELAY,
    isHost: () => host, self: () => selfId, peers: () => Array.from(remotes.keys()),
    room: () => room, loadSdk: loadSdk, appId: METERED_APP_ID
  };
})();

// ============================================================================
// 联机面板接线（刻意放在这里，不去动 game.js）
// ============================================================================
(function () {
  const $ = id => document.getElementById(id);
  const panel = $('coop'), btnOpen = $('coopBtn');
  const elRoom = $('coopRoom'), elJoin = $('coopJoin'), elLeave = $('coopLeave'), elClose = $('coopClose');
  const elStatus = $('coopStatus'), elPeers = $('coopPeers'), elLog = $('coopLog');
  const elPlay = $('coopPlay');

  function show(v) { if (panel) panel.style.display = v ? 'flex' : 'none'; }
  function paint(txt, tone) {
    if (!elStatus) return;
    elStatus.textContent = txt;
    elStatus.className = 'coop-status ' + (tone || 'info');
  }
  function log(line) {
    if (!elLog) return;
    const d = document.createElement('div');
    d.textContent = line;
    elLog.appendChild(d);
    elLog.scrollTop = elLog.scrollHeight;
  }

  if (btnOpen) btnOpen.addEventListener('click', () => {
    const t = $('title'); if (t) t.style.display = 'none';
    show(true);
    paint(window.Net && window.Net.appId ? '未连接' : '未连接（App ID 未配置）', 'info');
  });
  if (elPlay) elPlay.addEventListener('click', () => {
    // 关键：只关面板、不 leave()，连接留着 —— 在世界地图上选图进图才不会断线
    show(false);
    if (window.__FR && window.__FR.worldmap) window.__FR.worldmap();
  });
  if (elClose) elClose.addEventListener('click', () => {
    window.Net.leave();
    show(false);
    const t = $('title'); if (t) t.style.display = 'flex';
  });
  if (elJoin && elRoom) elJoin.addEventListener('click', () => window.Net.join(elRoom.value));
  if (elLeave) elLeave.addEventListener('click', () => window.Net.leave());

  window.Net.on('status', s => paint(s.text, s.tone));
  window.Net.on('log', l => log(l.line));
  window.Net.on('peers', p => {
    if (!elPeers) return;
    const role = p.selfId ? (p.host ? '你是房主' : '你是客机') : '未连接';
    const chan = p.game ? '战斗数据直连' : (p.count > 1 ? '通道协商中' : '');
    elPeers.textContent = role + '　·　房内 ' + p.count + ' 人' +
      (chan ? '　·　' + chan : '') +
      (p.selfId ? '　·　我：' + String(p.selfId).slice(0, 8) : '');
  });
})();
