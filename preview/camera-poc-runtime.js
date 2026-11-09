/* =============================================================================
 * 主画布镜头 POC · 运行时（零侵入注入层）
 * -----------------------------------------------------------------------------
 * 位置：preview/**  —— 不在 scripts/build-site.mjs 的发布清单推导里，
 *       也不在 .github/workflows/pages.yml 的触发白名单里，线上永远 404。
 *
 * 目的：回答一个问题 ——「镜头在真实游戏地形上移动、播完直接进战斗」，
 *       是不是真的比 js/cutscene.js 的 Shadow DOM 插画更协调？
 *
 * 关键可行性（全部只读核验过，不修改任何游戏源码）：
 *   · js/game.js:12690  loop() 只在 G.state==='play' 时跑 update()
 *   · js/game.js:6439   update() 每帧把 G.cam 硬跟随成 p.x-W/2 / p.y-H/2
 *   · js/game.js:12696  render() 在 state!=='title' 下照常执行
 *   => dialog 态下 G.cam 不会被覆盖，外部每帧写 __FR.G.cam.x/y 即可让
 *      render() 的所有读者（8182 视差 / 8192 translate / 8201 视口裁剪 /
 *      7922 装饰 / 7654 地标 / 7960 NPC 箭头）一起跟着剧情镜头走。
 *      这就是「render-time camera override」的零侵入等价实现。
 *
 * 刻意与正式设计的差异（POC 只验观感，不验玩法）：
 *   · 用 dialog 态天然冻结世界，不实现 v2 的 update():6360 世界锁定短路
 *   · 不实现 capture 输入总闸；dialog 态下多数输入入口本就不响应
 *   · shake / flash / camLag 直接清零，不演示「自然衰减」策略
 *   · 淡入淡出用 DOM 层模拟主画布 screen-space fillRect，层级用 z-index 近似
 *   · 不做 once guard / 状态归属 / 注册式 API 的完整实现
 *
 * 台词严格同源：从 window.MAP_STORIES.houshan 按 li 索引运行时取，
 * 对白 UI 完全复用 __FR.showLines() -> 原生 #dialog，本文件不写任何台词、
 * 不新建任何对话框节点。
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__CAM_POC__) return;

  var cv = document.getElementById('game');
  var stage = document.getElementById('stage');
  var elDialog = document.getElementById('dialog');
  var FR = window.__FR;

  if (!cv || !FR || !FR.G || !stage) {
    console.warn('[camera-poc] 未找到 #game / #stage / window.__FR，注入失败');
    return;
  }

  // 逻辑视口：game.js:12548 把 cv.style.width/height 写成逻辑 W/H（canvas.width 是 W*PR）
  function logicalSize() {
    return {
      w: parseFloat(cv.style.width) || 480,
      h: parseFloat(cv.style.height) || 864
    };
  }

  // 9 拍分镜：step 判别式故意对齐设计文档里的 cam / focus / fade / wait / dialog DSL，
  // 台词只写 li 索引，不写文字。镜头目标用「相对玩家的偏移」，避免依赖世界尺寸。
  var STEPS = [
    { t: 'fade',   from: 1, to: 0,      dur: 0.45, label: '淡入 · 后山晨雾' },
    { t: 'cam',    dx: 150, dy: -52,    dur: 1.2,  label: '镜头右移 · 药圃方向' },
    { t: 'dialog', li: [0, 1, 2],                 label: '对白一 · 神手谷药庐' },
    { t: 'cam',    dx: -130, dy: 46,    dur: 1.1,  label: '镜头左移 · 上山小径' },
    { t: 'dialog', li: [3, 4, 5],                 label: '对白二 · 长春功 / 象甲功' },
    { t: 'cam',    dx: 0, dy: 0,        dur: 1.0,  label: '镜头归位 · 韩立' },
    { t: 'dialog', li: [6, 7],                    label: '对白三 · 上青牛山北麓' },
    { t: 'fade',   from: 0, to: 1,      dur: 0.35, label: '淡出' },
    { t: 'fade',   from: 1, to: 0,      dur: 0.35, label: '淡入 · 回到战斗' }
  ];

  var P = {
    playing: false,
    autoPlay: true,
    lineDur: 2.1,
    fadeMode: 'canvas',      // 'canvas' = 盖世界不盖 #dialog；'screen' = 全黑盖住对话框
    backdrop: 'clear',       // 'clear' = 注入 CSS 去掉 #dialog 全屏遮罩，让主画布地形透出来
    debug: false,
    i: 0,
    stepT: 0,
    dlgT: 0,
    proj: { x: 0, y: 0 },
    fade: 0,
    finished: null,          // null | 'normal' | 'skip'
    kind: '',
    switching: false,
    frozen: false,           // goto() 静态定格：只维持 G.cam 投影，不推进时间轴
    raf: 0,
    lastT: 0,
    dlgDone: false,
    activeDlg: false,
    baseCam: { x: 0, y: 0 }
  };

  var fadeEl = null, skipEl = null, tagEl = null, backdropEl = null;

  /* 实拍发现：css/style.css:438 的 #dialog{background:rgba(8,10,14,.35)} 会把主画布
     压成一层灰雾，镜头平移几乎看不出来。POC 用一条注入样式把遮罩去掉（源码 0 改动），
     用来判断「如果解决了遮罩，主画布镜头到底好不好看」。 */
  function setBackdrop(mode) {
    P.backdrop = mode === 'clear' ? 'clear' : 'normal';
    if (!backdropEl) {
      backdropEl = document.createElement('style');
      backdropEl.id = 'camPocBackdrop';
      document.head.appendChild(backdropEl);
    }
    backdropEl.textContent = P.backdrop === 'clear'
      ? '#dialog{background:transparent !important;}' +
        'body[data-skin="guigu"] #dialog:not(.break-scene){background:transparent !important;}'
      : '';
    return P.backdrop;
  }

  function G() { return window.__FR.G; }
  function lines() { return (window.MAP_STORIES && window.MAP_STORIES.houshan) || []; }
  function pick(li) { var all = lines(); return (li || []).map(function (n) { return all[n]; }).filter(Boolean); }
  function baseCam() {
    var g = G(), s = logicalSize();
    return g.player ? { x: g.player.x - s.w / 2, y: g.player.y - s.h / 2 }
                    : { x: g.cam.x, y: g.cam.y };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }

  /* ---------- 演出层：fade / 跳过按钮 / 拍号（全部挂在 #stage 内） ---------- */
  function mountLayers() {
    setBackdrop(P.backdrop);
    if (!fadeEl) {
      fadeEl = document.createElement('div');
      fadeEl.id = 'camPocFade';
      stage.appendChild(fadeEl);
    }
    fadeEl.style.cssText = 'position:fixed;inset:0;background:#000;pointer-events:none;' +
      'z-index:' + (P.fadeMode === 'screen' ? 58 : 9) + ';opacity:' + P.fade + ';';

    if (!skipEl) {
      skipEl = document.createElement('button');
      skipEl.id = 'camPocSkip';
      skipEl.type = 'button';
      skipEl.textContent = '跳过 ▸';
      skipEl.style.cssText = 'position:fixed;right:14px;top:14px;z-index:60;' +
        'padding:6px 14px;border:1px solid rgba(255,255,255,.55);border-radius:4px;' +
        'background:rgba(20,20,26,.78);color:#f3ead6;font:13px/1.4 system-ui,sans-serif;' +
        'cursor:pointer;letter-spacing:.06em;';
      skipEl.addEventListener('click', function (e) {
        e.stopPropagation(); e.preventDefault();
        window.__CAM_POC__.skip();
      });
      stage.appendChild(skipEl);
    }
    skipEl.style.display = '';

    if (!tagEl) {
      tagEl = document.createElement('div');
      tagEl.id = 'camPocTag';
      stage.appendChild(tagEl);
    }
    tagEl.style.cssText = 'position:fixed;left:14px;top:14px;z-index:60;pointer-events:none;' +
      'padding:5px 10px;border-radius:3px;background:rgba(20,20,26,.7);color:#f3ead6;' +
      'font:12px/1.5 ui-monospace,Consolas,monospace;letter-spacing:.03em;display:none;';
    syncTag();
  }

  function syncTag() {
    if (!tagEl) return;
    tagEl.style.display = P.debug ? 'block' : 'none';
    if (!P.debug) return;
    var s = STEPS[P.i] || {};
    tagEl.textContent = 'POC ' + (P.i + 1) + '/' + STEPS.length + ' · ' + (s.label || '') +
      '  cam(' + Math.round(P.proj.x) + ',' + Math.round(P.proj.y) + ')' +
      '  fade=' + P.fade.toFixed(2);
  }

  function applyFade() {
    if (fadeEl) fadeEl.style.opacity = String(P.fade);
    if (fadeEl) fadeEl.style.zIndex = P.fadeMode === 'screen' ? 58 : 9;
  }

  function applyCam() {
    var g = G();
    g.cam.x = P.proj.x;
    g.cam.y = P.proj.y;
  }

  function unmountLayers() {
    if (fadeEl) fadeEl.style.opacity = '0';
    if (skipEl) skipEl.style.display = 'none';
    if (tagEl) tagEl.style.display = 'none';
  }

  /* ---------- 对白：只走 __FR.showLines / __FR.advanceDialog ---------- */
  function openDialog(step) {
    var ls = pick(step.li);
    if (!ls.length) { P.dlgDone = true; next(); return; }
    P.dlgDone = false;
    P.activeDlg = true;
    P.dlgT = 0;
    window.__FR.showLines(ls, function () {
      if (P.dlgDone) return;
      P.dlgDone = true;
      P.activeDlg = false;
      next();                       // onEnd 原样透传一次，再推进队列
    }, 'poc:camera');
  }

  // dialog 态下玩家点原生 #dialog 也能推进；重置自动推进计时，避免紧接着又自动跳一句
  elDialog.addEventListener('click', function () { P.dlgT = 0; }, true);

  function closeDialogDom() {
    var g = G();
    if (elDialog) elDialog.style.display = 'none';
    g.dialogLines = null; g.dialogEnd = null; g.dialogMeta = null;
    g.dialogIdx = 0; g.dialogSynced = false; g.dialogIsChoice = false;
    P.activeDlg = false;
  }

  /* ---------- 队列 ---------- */
  function next() {
    if (P.switching || !P.playing || P.frozen) return;
    P.switching = true;
    // 用 setTimeout 断开同步递归：showLines() 空台词会同步回调 onEnd（game.js:5251）。
    // 刻意不占用 P.raf —— 那是 frame() 主循环的句柄，覆盖它会导致循环链断掉。
    setTimeout(function () {
      P.switching = false;
      if (!P.playing || P.frozen) return;
      enterStep(P.i + 1);
    }, 0);
  }

  function enterStep(i) {
    if (i >= STEPS.length) { finish('normal'); return; }
    P.i = i; P.stepT = 0; P.dlgT = 0;
    var s = STEPS[i];

    if (s.t === 'dialog') {
      openDialog(s);
    } else if (s.t === 'fade') {
      P.fade = s.from;
      applyFade();
    } else if (s.t === 'cam') {
      P.camFrom = { x: P.proj.x, y: P.proj.y };
      P.camTo = { x: P.baseCam.x + (s.dx || 0), y: P.baseCam.y + (s.dy || 0) };
    } else {
      // 未实现的 step 类型：POC 里也明确 abort，不静默跳过
      finish('skip');
      console.warn('[camera-poc] 未实现的 step:', s.t);
      return;
    }
    syncTag();
  }

  function advance(dt) {
    var s = STEPS[P.i];
    if (!s) { finish('normal'); return; }
    P.stepT += dt;

    if (s.t === 'fade') {
      var k = ease(P.stepT / s.dur);
      P.fade = lerp(s.from, s.to, k);
      applyFade();
      if (P.stepT >= s.dur) { P.fade = s.to; applyFade(); next(); }
    } else if (s.t === 'cam') {
      var k2 = ease(P.stepT / s.dur);
      P.proj.x = lerp(P.camFrom.x, P.camTo.x, k2);
      P.proj.y = lerp(P.camFrom.y, P.camTo.y, k2);
      applyCam();
      syncTag();
      if (P.stepT >= s.dur) { P.proj.x = P.camTo.x; P.proj.y = P.camTo.y; applyCam(); next(); }
    } else if (s.t === 'dialog') {
      if (P.autoPlay && P.activeDlg && !P.dlgDone) {
        P.dlgT += dt;
        if (P.dlgT >= P.lineDur) {
          P.dlgT = 0;
          window.__FR.advanceDialog();
        }
      }
    } else if (s.t === 'wait') {
      if (P.stepT >= s.dur) next();
    }
  }

  function frame(t) {
    if (!P.playing) return;
    var dt = Math.min(0.05, (t - P.lastT) / 1000);
    P.lastT = t;
    if (!P.frozen) advance(dt);
    applyCam();                    // dialog 态下 G.cam 无人覆盖，每帧写即生效
    P.raf = requestAnimationFrame(frame);
  }

  function finish(kind) {
    if (!P.playing && P.finished) return;
    P.playing = false;
    P.finished = kind;
    if (P.raf) { cancelAnimationFrame(P.raf); P.raf = 0; }
    closeDialogDom();
    unmountLayers();
    setBackdrop('normal');         // 把注入的对白遮罩覆盖撤掉，不污染后续正常游玩
    P.fade = 0; applyFade();

    var g = G();
    // 播完回到玩家：下一帧 update() 也会硬跟随到同一个值，这里先写一遍避免跳一帧
    var b = baseCam();
    g.cam.x = b.x; g.cam.y = b.y;
    g.camLag = null;
    g.state = 'play';              // 世界恢复：怪开始动，画面还是同一张主画布
    syncTag();
    console.log('[camera-poc] finish:', kind, '· G.state =', g.state);
  }

  /* ---------- 对外（供宿主页 / Playwright 实拍脚本调用） ---------- */
  var API = {
    /** 关掉既有 Shadow DOM 过场，避免两套演出叠台；不改任何源码 */
    prepare: function (opt) {
      opt = opt || {};
      if (window.Cutscene) {
        window.Cutscene.force = false;
        window.Cutscene.available = function () { return false; };  // game.js:8999 分支直接判掉
      }
      var g = G();
      g.coopRole = null;
      if (opt.skin && window.__FR.skin) window.__FR.skin(opt.skin);
      if (opt.equip && window.__FR.equip) window.__FR.equip(opt.equip);
      return true;
    },

    /** 进图（可选），随后启动一段主画布镜头演出 */
    start: function (opt) {
      opt = opt || {};
      if (P.playing) return false;
      if (opt.mapId && window.__FR.enterMap) window.__FR.enterMap(opt.mapId);
      if (!G().player) return false;

      P.autoPlay = opt.autoPlay !== false;
      P.lineDur = opt.lineDur || 2.1;
      P.fadeMode = opt.fadeMode === 'screen' ? 'screen' : 'canvas';
      P.backdrop = opt.backdrop === 'normal' ? 'normal' : 'clear';
      P.debug = !!opt.debug;
      P.finished = null; P.kind = 'houshan';
      P.i = 0; P.stepT = 0; P.dlgT = 0;
      P.dlgDone = false; P.activeDlg = false; P.switching = false; P.frozen = false;

      P.baseCam = baseCam();
      P.proj = { x: P.baseCam.x, y: P.baseCam.y };
      P.fade = 1;

      var g = G();
      // POC 用 dialog 态天然冻结世界（game.js:12690），不改 update()
      g.state = 'dialog';
      g.dialogLines = null; g.dialogEnd = null; g.dialogIdx = 0; g.dialogIsChoice = false;
      g.camLag = null; g.shake = 0; g.flash = 0;

      mountLayers();
      applyFade(); applyCam();
      P.playing = true;
      P.lastT = performance.now();
      enterStep(0);
      syncTag();
      P.raf = requestAnimationFrame(frame);
      return true;
    },

    /** 实拍用：把时间轴停在某一拍的静态状态，不自动推进 */
    goto: function (n, opt) {
      opt = opt || {};
      if (!P.playing) return false;
      P.autoPlay = false;
      P.frozen = true;             // 定格：不推进任何 step，只维持镜头投影
      P.debug = !!opt.debug;
      for (var j = 0; j <= n; j++) {
        var s = STEPS[j]; if (!s) break;
        if (s.t === 'fade') P.fade = s.to;
        if (s.t === 'cam') { P.proj.x = P.baseCam.x + (s.dx || 0); P.proj.y = P.baseCam.y + (s.dy || 0); }
      }
      P.i = Math.max(0, Math.min(STEPS.length - 1, n));
      P.stepT = 0; P.dlgT = 0;
      P.dlgDone = false;
      var cur = STEPS[P.i];
      if (cur.t === 'dialog') {
        closeDialogDom();
        openDialog(cur);            // 只显示首句，交给截图；不推进
      } else {
        closeDialogDom();
      }
      applyFade(); applyCam(); syncTag();
      return true;
    },

    /** 跳过整段：结清当前对白一次，再把镜头与状态一起交还玩家 */
    skip: function () {
      if (!P.playing) return false;
      if (P.activeDlg && !P.dlgDone) {
        var g = G();
        if (g.dialogLines) g.dialogIdx = g.dialogLines.length - 1;
        P.dlgDone = true; P.activeDlg = false;
        window.__FR.advanceDialog();   // 触发一次 onEnd（我们的包装只做 next）
      }
      finish('skip');
      return true;
    },

    /** 直接结束并回到战斗（实拍最后一张用） */
    end: function () { return API.skip(); },

    /** 重播：先彻底收干净再重进图 */
    reset: function () {
      if (P.playing) API.skip();
      P.finished = null;
      return true;
    },

    state: function () {
      var g = G();
      return {
        active: P.playing,
        step: P.i + 1,
        total: STEPS.length,
        label: (STEPS[P.i] || {}).label || '',
        kind: (STEPS[P.i] || {}).t || '',
        cam: { x: Math.round(P.proj.x), y: Math.round(P.proj.y) },
        gameCam: { x: Math.round(g.cam.x), y: Math.round(g.cam.y) },
        fade: +P.fade.toFixed(3),
        gameState: g.state,
        dlgIdx: g.dialogIdx,
        dlgN: g.dialogLines ? g.dialogLines.length : 0,
        finished: P.finished,
        autoPlay: P.autoPlay,
        frozen: P.frozen,
        backdrop: P.backdrop
      };
    },

    steps: function () {
      return STEPS.map(function (s, i) { return { i: i, t: s.t, label: s.label }; });
    },

    setFadeMode: function (m) { P.fadeMode = m === 'screen' ? 'screen' : 'canvas'; applyFade(); return P.fadeMode; },
    setBackdrop: setBackdrop,
    setDebug: function (v) { P.debug = !!v; syncTag(); return P.debug; }
  };

  window.__CAM_POC__ = API;
  console.log('[camera-poc] runtime ready · 0 处游戏源码改动 · 主画布镜头 POC');
})();
