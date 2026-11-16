// ============================================================================
// 纪年卡：高光时刻的卷轴题款
//
// 为什么要有它：结丹、结婴、飞升灵界、道天大劫这四个节点，原著里是全书最重的四笔，
// 而这游戏里原来只有「一段对白 + 一个弹窗 + 结算面板」—— 十五个高光节点全有考据有名，
// 呈现却是纯文字。分镜组件（js/cutscene.js）质感在线，但它要一整套烘焙过的场景与人物帧，
// 四个节点各铺一套成本太高、也不该为它新画插画。
//
// 所以这里只做一件事：把「卷面 + 题款」这一层单独拎出来，三屏递进 ——
//   第一屏 事由（在哪、为什么坐下去）
//   第二屏 岁月（多久、付出了什么）
//   第三屏 结果（成了什么）
// 三屏全是字，没有插画，靠留白、金线、朱印撑住分量。文案一律取自已考据过的数据层
// （地图 desc / clearDesc / BREAKTHROUGH tip / 原著对白），这里不另写台词。
//
// 铁律：
//   1. 只演，不改任何游戏状态。seen 账本由 game.js 写（它才拿得到 save）。
//   2. QA / webdriver 下 available() 为 false —— 否则每跑一遍通关闸门就被这层盖住。
//      要验它请用 __FR.chronicleOpen(id)，或置 window.__CSJ_CHRONICLE_FORCE__ = true。
//   3. 动画只动 opacity / transform，不碰 box-shadow（全屏层不参与合成＝每帧重绘整屏）。
// ============================================================================
(function () {
  'use strict';

  // 四张卡，三屏。字全部有出处（见每条末尾的注）。
  var CARDS = {
    // 结丹：天星城闭死关（第 376 / 386 章）。58 岁入城，126 岁结丹。
    jiedan: {
      seal: '结丹',
      shots: [
        { k: '闭府', big: '天星城',
          sub: '外城一间租来的石室，颠倒五行阵布七处。石门一落，外头就是六十年。' },
        { k: '六十年', big: '雪灵水 · 天火液',
          sub: '雪灵水奇寒，天火液炙热 —— 两味都服下了，才谈得上结丹。' },
        { k: '结丹', big: '一枚丹',
          sub: '六十年闭门，一枚丹。出关那日，妙音门传来消息 —— 他们在找一个压得住丹火的人。' }
      ]
    },
    // 结婴：云梦山碎丹成婴，二百一十七岁（原著）。三味丹缺一不可。
    jieying: {
      seal: '结婴',
      shots: [
        { k: '碎丹', big: '云梦山',
          sub: '灵脉、丹药、心境，三样都齐了。这一关过了，天南就再没人能随手捏死他。' },
        { k: '二百一十七岁', big: '碎丹成婴',
          sub: '九曲灵参丹增结婴之望，定灵丹安魂；少了定灵，碎丹时神识溃散，便是爆体而亡。' },
        { k: '结婴', big: '小小的人',
          sub: '丹田里那个小小的人睁开眼，和他对视了一瞬。' }
      ]
    },
    // 飞升灵界：银月留下的空间节点（X 卷前的收束）。人界这一条线到此为止。
    feisheng: {
      seal: '飞升',
      shots: [
        { k: '飞升', big: '五龙海',
          sub: '银月留下的空间节点在五龙海。人界的事都了了，该走了。' },
        { k: '空间节点', big: '一道白光',
          sub: '人界再没有韩立这个人。' },
        { k: '飞升灵界', big: '人界已远',
          sub: '一道白光冲天而起。灵界多了一个青冥卫。' }
      ]
    },
    // 道天大劫：X5C1382。这一场是韩立自己的（X3C989 那场是蟹道人的，两处不可混写）。
    daotian: {
      seal: '道祖',
      shots: [
        { k: '大劫', big: '天庭',
          sub: '不是在闭关里，是在打着的中间。五感先走，然后是那一扇门。' },
        { k: '五感先走', big: '五股法则',
          sub: '大五行幻世诀的口诀从他脑海流淌而过。五股时间法则之力倒灌回来，如狂风巨浪，荡涤全身。' },
        { k: '道祖', big: '推开一扇门',
          sub: '「轰」的一声，眼前金光一片。门后面站着的东西跟他想的不太一样 —— 他想起的第一件事，是还有人在等他。' }
      ]
    }
  };

  // 每屏停留多久（毫秒）。第一屏给足人认字，末屏多留半秒收势。
  var HOLD = [2800, 3200, 3600];

  var host = null, elK = null, elBig = null, elSub = null, elSeal = null, elHint = null, elSkip = null, elScroll = null;
  var cur = null, idx = 0, timer = 0, active = false, onEnd = null;

  function build() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'chronicle';
    host.innerHTML =
      '<div class="ch-scroll">' +
        '<i class="ch-rod top"></i>' +
        '<div class="ch-body">' +
          '<div class="ch-k"></div>' +
          '<div class="ch-big"></div>' +
          '<i class="ch-rule"></i>' +
          '<div class="ch-sub"></div>' +
        '</div>' +
        '<i class="ch-rod bot"></i>' +
        '<div class="ch-seal"></div>' +
      '</div>' +
      '<div class="ch-hint">点一下 · 继续</div>' +
      '<button class="ch-skip" type="button">跳过</button>';
    // 挂在 #stage 里：跟着舞台一起 scale，与其它面板同一套坐标（#breakOmen 也在这一层）
    var stage = document.getElementById('stage');
    (stage || document.body).appendChild(host);
    elK = host.querySelector('.ch-k');
    elBig = host.querySelector('.ch-big');
    elSub = host.querySelector('.ch-sub');
    elSeal = host.querySelector('.ch-seal');
    elHint = host.querySelector('.ch-hint');
    elSkip = host.querySelector('.ch-skip');
    elScroll = host.querySelector('.ch-scroll');
    // 整层吞点击：底下的结算面板还没看，别让人误触到
    host.addEventListener('click', function (e) {
      if (e.target === elSkip) { stop(); return; }
      next();
    });
  }

  function paint() {
    var sh = cur.shots[idx];
    elK.textContent = sh.k || '';
    elBig.textContent = sh.big || '';
    elSub.textContent = sh.sub || '';
    elSeal.textContent = cur.seal || '';
    elHint.textContent = (idx < cur.shots.length - 1) ? '点一下 · 继续' : '点一下 · 收起';
    // 重播入场：改 currentTime 而不是 void offsetWidth（后者每帧重排，见性能铁律）
    elScroll.classList.remove('in');
    var anims = elScroll.getAnimations ? elScroll.getAnimations() : [];
    if (anims.length) { for (var i = 0; i < anims.length; i++) { try { anims[i].currentTime = 0; } catch (e) {} } }
    elScroll.classList.add('in');
    clearTimeout(timer);
    timer = setTimeout(next, HOLD[Math.min(idx, HOLD.length - 1)] || 3000);
  }

  function next() {
    if (!active) return;
    if (idx < cur.shots.length - 1) { idx++; paint(); return; }
    stop();
  }

  function stop() {
    if (!active) return;
    active = false;
    clearTimeout(timer); timer = 0;
    if (host) host.classList.remove('on');
    var cb = onEnd; onEnd = null; cur = null;
    if (cb) cb(true);
  }

  window.Chronicle = {
    force: false,
    ids: function () { return Object.keys(CARDS); },
    cards: function () { return JSON.parse(JSON.stringify(CARDS)); },
    // 只有真玩家看得到：QA / 自动化一律跳过，要验就置 force 或 __CSJ_CHRONICLE_FORCE__
    available: function () {
      if (this.force || window.__CSJ_CHRONICLE_FORCE__) return true;
      if (window.__CSJ_QA__) return false;
      if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
      return true;
    },
    active: function () { return active; },
    shot: function () { return active && cur ? { id: cur.id, i: idx, n: cur.shots.length } : null; },
    // 返回 true 表示真的演了（调用方据此决定要不要写 seen）。演不了就当场回调，别让流程卡住。
    play: function (id, cb) {
      var card = CARDS[id];
      if (!card || !this.available()) { if (cb) cb(false); return false; }
      build();
      // 收掉上一张没收干净的（理论上不会，兜一层）
      if (active) { active = false; clearTimeout(timer); timer = 0; onEnd = null; }
      cur = card; cur.id = id; idx = 0; active = true; onEnd = cb || null;
      host.classList.add('on');
      paint();
      return true;
    },
    stop: stop,
    // 调试/回归用：手动推进一屏（等价于点一下画面）
    step: function () { if (active) next(); return active; }
  };
})();
