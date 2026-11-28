// ============================================================================
// 飞鸽传书 · 联机聊天
//
// 左下角一枚鸽子按钮：点开后横条输入框从按钮处向左延展，可调输入法输入，
// 再点鸽子即发送；聊天记录陆续向上延展。记录框背景压到 10% 半透明，
// 只衬出聊天内容本身。发送后 3 秒自动收起记录框。
//
// 传输：与战斗数据一样走自建 DataChannel（Net.sendGame），
//       —— Metered 只跑房间发现与协商，聊天绝不占用它。
// 可用时机：战斗 / 暂停 / 选择地图（修行图），由 setVisible 控制显隐。
// ============================================================================
(function () {
  const $ = id => document.getElementById(id);
  const wrap = $('chatWrap'), log = $('chatLog'), input = $('chatInput'), btn = $('chatBtn');
  if (!wrap || !log || !input || !btn) return;

  const HIDE_MS = 3000;          // 发送后多久自动隐藏记录框
  let hideTimer = 0;
  let visible = false;           // 当前场景是否允许聊天（战斗/暂停/选图）

  // 鸽子图标：直接用游戏自己的像素精灵（js/sprites.js 的 'dove'），
  // 与画面同一套描边配色，比 emoji 更贴合；放大时保持硬边不糊。
  function paintDove() {
    const src = window.Sprites && window.Sprites.dove;
    if (!src) { btn.textContent = '🕊'; return; }   // 拿不到精灵时兜底
    const scale = 2;
    const c = document.createElement('canvas');
    c.width = src.width * scale; c.height = src.height * scale;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, c.width, c.height);
    btn.innerHTML = '';
    btn.appendChild(c);
  }
  paintDove();

  function scrollBottom() { log.scrollTop = log.scrollHeight; }

  function appendEl(el) {
    log.appendChild(el);
    while (log.children.length > 40) log.removeChild(log.firstChild);
    log.classList.add('show');
    scrollBottom();
  }
  function addLine(text, cls) {
    const d = document.createElement('div');
    d.className = 'chat-line' + (cls ? ' ' + cls : '');
    d.textContent = text;
    appendEl(d);
  }
  function addWho(who, text, mine, isEmoji) {
    const d = document.createElement('div');
    d.className = 'chat-line' + (mine ? ' me' : '') + (isEmoji ? ' big' : '');
    const w = document.createElement('span');
    w.className = 'who'; w.textContent = who + '：';
    d.appendChild(w);
    d.appendChild(document.createTextNode(text));
    appendEl(d);
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { log.classList.remove('show'); }, HIDE_MS);
  }

  function openBar() {
    wrap.classList.add('open');
    log.classList.add('show');
    clearTimeout(hideTimer);
    // 移动端要用户手势内 focus 才弹得出输入法
    setTimeout(() => { try { input.focus(); } catch (e) {} }, 60);
  }
  function closeBar() {
    wrap.classList.remove('open');
    try { input.blur(); } catch (e) {}
    input.value = '';
    scheduleHide();
  }

  function send() {
    const txt = (input.value || '').trim();
    if (!txt) { closeBar(); return; }
    const okSend = window.Net && window.Net.sendGame ? window.Net.sendGame({ t: 'chat', m: txt }) : false;
    if (okSend) addWho('我', txt, true);
    else addLine('（未连通，飞鸽没飞出去）', 'sys');
    input.value = '';
    try { input.blur(); } catch (e) {}
    wrap.classList.remove('open');
    scheduleHide();               // 发送后 3 秒自动隐藏记录框
  }

  // 表情包：点一下就放出去（走数据通道，不占 Metered）
  function sendEmoji(emo) {
    const okSend = window.Net && window.Net.sendGame ? window.Net.sendGame({ t: 'chat', m: emo, e: 1 }) : false;
    if (okSend) addWho('我', emo, true, true);
    else addLine('（未连通，表情没飞出去）', 'sys');
    log.classList.add('show');
    scheduleHide();
  }
  const emojiBar = $('chatEmoji');
  if (emojiBar) emojiBar.addEventListener('click', e => {
    const b = e.target.closest('button[data-emoji]');
    if (!b) return;
    e.stopPropagation();
    sendEmoji(b.getAttribute('data-emoji'));
  });

  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (wrap.classList.contains('open')) {
      if ((input.value || '').trim()) send();
      else closeBar();
    } else openBar();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); send(); }
    e.stopPropagation();          // 别让 WASD / 空格之类的战斗按键吃掉输入
  });
  input.addEventListener('keyup', e => e.stopPropagation());
  // 输入时不要让画布抢走点击
  input.addEventListener('pointerdown', e => e.stopPropagation());

  // 收到对方来信
  window.Net.on('message', m => {
    const d = m && m.data;
    if (!d || d.t !== 'chat') return;
    const who = '道友';
    addWho(who, String(d.m || '').slice(0, 60), false, !!d.e);
    if (!wrap.classList.contains('open')) {
      log.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { log.classList.remove('show'); }, HIDE_MS + 2500);  // 收到消息多留一会儿
    }
  });

  // 场景显隐：战斗 / 暂停 / 选图才给用，标题与结算收起来
  window.Chat = {
    setVisible(v) {
      const nv = !!v;
      if (nv === visible) return;      // 每帧都会调，去重免得反复写 DOM
      visible = nv;
      wrap.style.display = visible ? '' : 'none';
      if (!visible) { wrap.classList.remove('open'); log.classList.remove('show'); clearTimeout(hideTimer); }
    },
    isVisible() { return visible; },
    open: openBar, close: closeBar, send: send,
    // 测试用：直接收一条 / 查记录
    _recv(text) { addWho('道友', text, false, false); },
    _recvEmoji(e) { addWho('道友', e, false, true); },
    _sendEmoji(e) { sendEmoji(e); return (window.__meteredLog || []).length; },
    _hasEmojiBar() { return !!document.getElementById('chatEmoji'); },
    _lines() { return Array.from(log.children).map(c => c.textContent); },
    _open() { return wrap.classList.contains('open'); },
    _logShown() { return log.classList.contains('show'); }
  };
})();
