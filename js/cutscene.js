/* 凡人·长生劫 —— 剧情动画（独立过场层）
 *
 * 来源：preview/cutscene-qixuan.html 原型（9 拍 / 28.4s），演出与程序化场景原样搬入。
 *   - 已接入：qixuan 七玄门·山门（第一张）、houshan 七玄门·后山（第二张）；
 *     CUTSCENES 是分镜表，新增一张图只需加一段 shots + 一段 MAP_STORIES 台词。
 *   - Shadow DOM 挂载，CSS / id / class 与主游戏完全隔离，零冲突。
 *   - 台词不写死：play(lines, onEnd, 'map:<id>') 按 li 索引从 MAP_STORIES.<id> 逐字取用，严格同源；
 *     剧场回看用 'replay:<id>'，只播不记账。
 *   - 人物读 window.Sprites：startMap() 已调 applyHeroSprite()，Sprites.hanli 就是当前护甲，
 *     过场与随后的战斗读同一张图，衣着天然一致。
 *   - 只读 window.SKIN_INK，不改写：双皮跟主游戏走，无副作用。
 *   - 自动化回归（navigator.webdriver）走原对白通道，不影响既有闸门；
 *     新守门脚本置 force=true 即可完整验收动画链路。
 */
(function () {
  'use strict';

  var CSS = "  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }\n  html, .csBody { margin: 0; min-height: 100%; background: #0d0f12; }\n  .csBody {\n    font-family: \"KaiTi\", \"STKaiti\", \"Kaiti SC\", \"Source Han Serif SC\", \"Noto Serif SC\", serif;\n    color: #f2e8d5; -webkit-user-select: none; user-select: none;\n  }\n  button { font-family: inherit; cursor: pointer; }\n\n  .csBody {\n    --gold: #c9a24a; --gold-soft: rgba(201,162,74,.30);\n    --panel: #191d25; --panel2: #222834; --line: rgba(201,162,74,.22);\n    --t1: #f2e8d5; --t2: #cfc6b2; --t3: #9a927f;\n    --ok: #6fe08a; --warn: #ffb060;\n  }\n  header {\n    display: flex; flex-wrap: wrap; align-items: center; gap: 10px;\n    padding: 12px 18px; border-bottom: 1px solid var(--line); background: #12151b;\n  }\n  header h1 { margin: 0; font-size: 16px; font-weight: normal; letter-spacing: 1px; color: #e8d4a8; }\n  header .tag { font-size: 11px; color: #0d0f12; background: var(--gold); border-radius: 4px; padding: 2px 7px; letter-spacing: .5px; }\n  header .spacer { flex: 1; }\n  .seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }\n  .seg button {\n    border: 0; background: transparent; color: var(--t3); font-size: 12px;\n    padding: 6px 11px; letter-spacing: .5px;\n  }\n  .seg button + button { border-left: 1px solid var(--line); }\n  .seg button.on { background: var(--gold); color: #201804; }\n\n  main { display: flex; gap: 22px; padding: 20px; align-items: flex-start; justify-content: center; flex-wrap: wrap; }\n  #stageWrap { width: 480px; height: 864px; position: relative; flex: 0 0 auto; }\n  #stage {\n    position: absolute; left: 0; top: 0; width: 480px; height: 864px;\n    transform-origin: top left; overflow: hidden; background: #11141a;\n    border: 1px solid var(--line); box-shadow: 0 18px 60px rgba(0,0,0,.6);\n  }\n  #scene { position: absolute; left: 0; top: 0; width: 480px; height: 864px; transform-origin: 50% 42%; will-change: transform; }\n  #grain { position: absolute; inset: 0; pointer-events: none; opacity: .16; mix-blend-mode: overlay; }\n  #vignette { position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 130px 40px rgba(0,0,0,.55); }\n  #dim { position: absolute; inset: 0; pointer-events: none; background: rgba(8,10,14,.0); transition: background .5s ease; }\n  #wipe {\n    position: absolute; inset: 0; pointer-events: none; opacity: 0;\n    background: #14161c; clip-path: circle(150% at 50% 44%);\n  }\n  #wipe.on { animation: inkOpen .58s cubic-bezier(.22,.7,.3,1) forwards; }\n  @keyframes inkOpen {\n    0%   { opacity: 1; clip-path: circle(150% at 50% 44%); }\n    100% { opacity: 1; clip-path: circle(0% at 50% 44%); }\n  }\n  #seal { position: absolute; right: 24px; top: 112px; width: 58px; height: 50px; border: 3px solid #a8402f;\n          color: #a8402f; font-size: 15px; line-height: 44px; text-align: center; padding: 0;\n          letter-spacing: 0; white-space: nowrap; opacity: 0; transform: rotate(-8deg) scale(1.4); transition: all .5s ease; pointer-events: none; }\n  #seal.on { opacity: .88; transform: rotate(-8deg) scale(1); }\n\n  .actor { position: absolute; bottom: 214px; width: 190px; height: 320px; opacity: 0; pointer-events: none;\n           transition: opacity .62s ease, transform .72s cubic-bezier(.2,.8,.25,1); }\n  .actor canvas { width: 100%; height: 100%; display: block; }\n  #actorL { left: -8px; transform: translateX(-46px); }\n  #actorR { right: -8px; transform: translateX(46px); }\n  .actor.in { opacity: .96; transform: translateX(0); }\n  /* ID 选择器优先级高于 .actor.in，入画归位必须再显式压一次，否则人物会一直偏移被舞台裁掉 */\n  #actorL.in, #actorR.in { transform: translateX(0); }\n\n  #chapter { position: absolute; left: 0; right: 0; top: 300px; text-align: center; opacity: 0; pointer-events: none;\n             transition: opacity .7s ease; }\n  #chapter.on { opacity: 1; }\n  #chapter .ct { font-size: 34px; letter-spacing: 9px; color: #efe4cd; text-shadow: 0 3px 18px rgba(0,0,0,.8); }\n  #chapter .cs { margin-top: 14px; font-size: 15px; letter-spacing: 4px; color: #cfc6b2; }\n  #chapter .cr { margin: 22px auto 0; width: 96px; height: 1px; background: var(--gold); }\n\n  #subBox {\n    position: absolute; left: 0; right: 0; bottom: 0; height: 236px; padding: 30px 30px 26px;\n    background: linear-gradient(to bottom, rgba(10,12,16,0), rgba(10,12,16,.88) 26%, rgba(10,12,16,.97));\n    display: flex; flex-direction: column; justify-content: flex-end;\n  }\n  #spkRow { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; min-height: 34px; }\n  #face { width: 42px; height: 49px; image-rendering: pixelated; display: none; border: 1px solid var(--line); background: rgba(0,0,0,.25); }\n  #spk { font-size: 18px; color: #e0b24a; letter-spacing: 2px; }\n  #txt { font-size: 19px; line-height: 1.85; color: #f2e8d5; min-height: 105px; letter-spacing: .5px; }\n  #subBox.narration #spkRow { display: none; }\n  #subBox.narration #txt { color: #d8cfba; font-size: 18px; border-left: 2px solid var(--gold-soft); padding-left: 14px; }\n  #hint { text-align: right; font-size: 12px; color: #8f8878; margin-top: 10px; letter-spacing: 1px; }\n\n  #progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255,255,255,.08); }\n  #progress i { display: block; height: 100%; width: 0; background: var(--gold); }\n  #shotNo { position: absolute; left: 18px; top: 16px; font-size: 12px; letter-spacing: 2px; color: rgba(242,232,213,.55); }\n\n  #battleMock { position: absolute; inset: 0; display: none; background: #22301f; }\n  #battleMock.on { display: block; }\n  #battleMock canvas { width: 100%; height: 100%; display: block; }\n  #bmNote { position: absolute; left: 26px; right: 26px; top: 92px; text-align: center; color: #f7ecd7;\n            font-size: 17px; letter-spacing: 2px; padding: 9px 6px; border-radius: 6px;\n            background: rgba(8,12,8,.62); text-shadow: 0 1px 4px #000; }\n  #bmSub { position: absolute; left: 26px; right: 26px; top: 138px; text-align: center; color: #cfc6b2;\n           font-size: 12.5px; letter-spacing: 1px; padding: 6px; background: rgba(8,12,8,.48); border-radius: 6px; }\n  #bmHud { position: absolute; left: 18px; top: 18px; font-size: 12px; color: #9fe0c0; letter-spacing: 1px;\n           background: rgba(8,12,8,.55); padding: 5px 9px; border-radius: 5px; }\n\n  .csBody[data-skin=\"paper\"] #stage { background: #efe4cd; }\n  .csBody[data-skin=\"paper\"] #vignette { box-shadow: inset 0 0 120px 30px rgba(90,74,48,.30); }\n  .csBody[data-skin=\"paper\"] #wipe { background: #efe4cd; }\n  .csBody[data-skin=\"paper\"] #subBox { background: linear-gradient(to bottom, rgba(239,228,205,0), rgba(239,228,205,.94) 26%, rgba(239,228,205,.99)); }\n  .csBody[data-skin=\"paper\"] #txt { color: #2a1c06; }\n  .csBody[data-skin=\"paper\"] #subBox.narration #txt { color: #4a3c22; border-left-color: rgba(154,116,38,.5); }\n  .csBody[data-skin=\"paper\"] #spk { color: #8a5e1c; }\n  .csBody[data-skin=\"paper\"] #hint { color: #7a6f58; }\n  .csBody[data-skin=\"paper\"] #chapter .ct { color: #2a1c06; text-shadow: none; }\n  .csBody[data-skin=\"paper\"] #chapter .cs { color: #5c5240; }\n  .csBody[data-skin=\"paper\"] #shotNo { color: rgba(42,28,6,.5); }\n\n  aside { width: 346px; flex: 0 0 346px; display: flex; flex-direction: column; gap: 12px; }\n  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 13px 14px; }\n  .card h2 { margin: 0 0 10px; font-size: 13px; font-weight: normal; letter-spacing: 1px; color: #e8d4a8; }\n  .row { display: flex; gap: 7px; flex-wrap: wrap; }\n  .btn { flex: 1; min-width: 66px; padding: 9px 6px; border: 1px solid var(--line); border-radius: 8px;\n         background: var(--panel2); color: var(--t2); font-size: 12px; letter-spacing: .5px; }\n  .btn:hover { border-color: var(--gold); color: #fff; }\n  .btn.primary { background: var(--gold); color: #201804; border-color: var(--gold); }\n  .btn.primary:hover { color: #201804; filter: brightness(1.08); }\n  .kv { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; color: var(--t3); }\n  .kv b { font-weight: normal; color: var(--t2); font-family: ui-monospace, Menlo, Consolas, monospace; }\n  .kv b.g { color: var(--ok); } .kv b.w { color: var(--warn); }\n  .shots { display: flex; flex-direction: column; gap: 3px; max-height: 210px; overflow-y: auto; }\n  .shots div { display: flex; gap: 8px; align-items: baseline; font-size: 11.5px; color: var(--t3);\n               padding: 5px 7px; border-radius: 6px; cursor: pointer; line-height: 1.4; }\n  .shots div:hover { background: rgba(201,162,74,.10); color: var(--t2); }\n  .shots div.on { background: rgba(201,162,74,.20); color: #f2e8d5; }\n  .shots div span { color: var(--gold); font-family: ui-monospace, Menlo, Consolas, monospace; flex: 0 0 34px; }\n  pre { margin: 0; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; line-height: 1.55;\n        color: #9fb0a6; white-space: pre-wrap; word-break: break-all; max-height: 150px; overflow-y: auto; }\n  .note { font-size: 11.5px; line-height: 1.75; color: var(--t3); }\n  .note em { color: var(--gold); font-style: normal; }\n  @media (max-width: 900px) {\n    main { gap: 14px; padding: 12px; }\n    aside { width: 100%; flex: 1 1 100%; max-width: 480px; }\n  }\n/* ---- 主游戏内嵌态：全屏铺满、隐藏测试面板 ---- */\n.csBody { position: fixed; inset: 0; width: 100%; height: 100%; overflow: hidden;\n          display: flex; align-items: center; justify-content: center; background: #0d0f12; }\n.csBody header, .csBody aside { display: none !important; }\n.csBody main { padding: 0; margin: 0; gap: 0; width: 100%; height: 100%;\n               align-items: center; justify-content: center; }\n#csSkipBtn { position: absolute; right: 18px; top: 18px; z-index: 30;\n             background: rgba(8,11,15,.74); color: #e9dfc8;\n             border: 1px solid rgba(201,162,74,.55); border-radius: 6px;\n             padding: 7px 14px; font-size: 13px; letter-spacing: 1px; font-family: inherit; }\n.csBody[data-skin=\"paper\"] #csSkipBtn { background: rgba(239,228,205,.86); color: #2a2418; border-color: rgba(154,116,38,.6); }\n";
  var BODY = "\n<header>\n  <h1>剧情动画原型 · 七玄门·山门</h1>\n  <span class=\"tag\">本地测试页 · 不上线</span>\n  <span class=\"spacer\"></span>\n  <div class=\"seg\" id=\"segMode\"><button data-v=\"solo\" class=\"on\">单机</button><button data-v=\"coop\">联机</button></div>\n  <div class=\"seg\" id=\"segSkin\"><button data-v=\"ink\" class=\"on\">水墨·夜</button><button data-v=\"paper\">诡谷·纸</button></div>\n  <div class=\"seg\" id=\"segRate\"><button data-v=\"1\" class=\"on\">1×</button><button data-v=\"1.5\">1.5×</button><button data-v=\"2\">2×</button></div>\n  <div class=\"seg\" id=\"segSfx\"><button data-v=\"on\" class=\"on\">音效</button><button data-v=\"off\">静音</button></div>\n</header>\n\n<main>\n  <div id=\"stageWrap\">\n    <div id=\"stage\">\n      <canvas id=\"scene\" width=\"480\" height=\"864\"></canvas>\n      <canvas id=\"grain\" width=\"480\" height=\"864\"></canvas>\n      <div id=\"vignette\"></div>\n      <div id=\"dim\"></div>\n      <div id=\"wipe\"></div>\n      <div id=\"seal\">七玄</div>\n      <div class=\"actor\" id=\"actorL\"><canvas width=\"190\" height=\"320\"></canvas></div>\n      <div class=\"actor\" id=\"actorR\"><canvas width=\"190\" height=\"320\"></canvas></div>\n      <div id=\"chapter\"><div class=\"ct\">卷一 · 七玄门</div><div class=\"cs\">越国 · 镜州 青牛山</div><div class=\"cr\"></div></div>\n      <div id=\"subBox\">\n        <div id=\"spkRow\"><canvas id=\"face\" width=\"12\" height=\"14\"></canvas><span id=\"spk\"></span></div>\n        <div id=\"txt\"></div>\n        <div id=\"hint\">点击画面推进一拍 ▸</div>\n      </div>\n      <div id=\"shotNo\"></div>\n      <div id=\"progress\"><i></i></div>\n      <button id=\"csSkipBtn\" type=\"button\">跳过 ▸▸</button>\n      <div id=\"battleMock\">\n        <canvas width=\"480\" height=\"864\"></canvas>\n        <div id=\"bmHud\">共斗中 · 房主</div>\n        <div id=\"bmNote\">已跳过全部剧情对白，直接开打</div>\n        <div id=\"bmSub\">qixuan 为剧情图：此处以战斗画面示意「不建过场层」</div>\n      </div>\n    </div>\n  </div>\n\n  <aside>\n    <div class=\"card\">\n      <h2>播放控制（剧场模式 · 可随时重看）</h2>\n      <div class=\"row\" style=\"margin-bottom:7px\">\n        <button class=\"btn primary\" id=\"bPlay\">▶ 播放</button>\n        <button class=\"btn\" id=\"bNext\">下一拍</button>\n        <button class=\"btn\" id=\"bSkip\">跳过全片</button>\n        <button class=\"btn\" id=\"bReplay\">↺ 重播</button>\n      </div>\n      <div class=\"row\">\n        <button class=\"btn\" id=\"bCoop\">模拟联机进图</button>\n      </div>\n    </div>\n\n    <div class=\"card\">\n      <h2>运行状态</h2>\n      <div class=\"kv\"><span>时间轴</span><b id=\"sTime\">0.0 / 28.4s</b></div>\n      <div class=\"kv\"><span>当前拍</span><b id=\"sShot\">—</b></div>\n      <div class=\"kv\"><span>帧率</span><b id=\"sFps\">—</b></div>\n      <div class=\"kv\"><span>每帧 canvas 重绘</span><b class=\"g\" id=\"sDraw\">0</b></div>\n      <div class=\"kv\"><span>save.seen（演完才写）</span><b id=\"sSeen\">未写</b></div>\n      <div class=\"kv\"><span>剧情奖励</span><b id=\"sReward\">—</b></div>\n      <div class=\"kv\"><span>回看入口</span><b id=\"sReplay\">0 段</b></div>\n    </div>\n\n    <div class=\"card\">\n      <h2>分镜时间轴（点任意拍跳转）</h2>\n      <div class=\"shots\" id=\"shotList\"></div>\n    </div>\n\n    <div class=\"card\">\n      <h2>当前拍数据 · CUTSCENES.qixuan</h2>\n      <pre id=\"shotJson\">—</pre>\n    </div>\n\n    <div class=\"card note\">\n      <h2>这一版验证什么</h2>\n      <em>独立过场层</em>：不进主循环、不复用 showLines，自带 rAF；场景烘焙一次，每帧只改 transform 与文字。<br>\n      <em>连续时间轴</em>：镜头推拉摇、人物入画、墨迹转场、逐字字幕，数据可批量铺到 171 图。<br>\n      <em>单机 / 联机分流</em>：联机不建层、不写 seen、补发奖励、留回看入口。<br>\n      <em>人物</em>：直接调用主游戏 <code>js/sprites.js</code> 的 <code>window.Sprites</code> 精灵表（韩立 / 墨大夫 / 张铁，与 <code>NPC_FACE</code> 同一套）；内置预览沙箱取不到该文件时，用同像素镜像兜底。<br>\n      <em>双皮</em>：水墨·夜 / 诡谷·纸 各一套配色；人物随游戏原生 <code>SKIN_INK</code> 切墨版 / 原色，场景按皮重烘焙。<br>\n      零新增图片素材，除精灵表外不加载主游戏任何脚本。\n    </div>\n  </aside>\n</main>\n";
  var host = document.createElement('div');
  host.id = 'csHost';
  host.style.cssText = 'position:fixed;inset:0;z-index:99999;display:none;';
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' + CSS + '</style><div class="csBody" data-skin="ink">' + BODY + '</div>';
  var D = {
    createElement: function (t) { return document.createElement(t); },
    getElementById: function (id) {
      return (root.getElementById ? root.getElementById(id) : null) || root.querySelector('#' + id);
    },
    querySelector: function (s) { return root.querySelector(s); },
    addEventListener: function (t, f) { return document.addEventListener(t, f); },
    body: { dataset: { skin: 'ink' } }
  };
  Object.defineProperty(D, 'hidden', { get: function () { return document.hidden; } });
  var LINES = [], onDone = null, active = false;
  function applyLines(lines) {
    LINES = lines || [];
    SHOTS.forEach(function (sh) { sh.line = (sh.li == null || !LINES[sh.li]) ? null : LINES[sh.li]; });
  }

  'use strict';

  // ===================== 主题 =====================
  var THEME = {
    ink:   { paper:'#11141a', sky:'#242a33', far:'#39414b', mid:'#2c333c', near:'#1b2028',
             ink:'#e9dfc8', line:'#8b8d86', gold:'#c9a24a', red:'#a8402f', wood:'#20262e', light:'#d8cfba' },
    paper: { paper:'#efe4cd', sky:'#e3d8bd', far:'#c4bda6', mid:'#a9a38e', near:'#7e7a68',
             ink:'#2a2418', line:'#6d6755', gold:'#9a7426', red:'#9d3a2c', wood:'#5b5340', light:'#fff8e6' }
  };
  var skin = 'ink', C = THEME.ink;

  // ===================== 分镜时间轴 =====================
  // 数据结构即未来铺 171 图的模板：每张图一段 shots，t/dur 秒，cam 为连续镜头参数。
  // CUTSCENES.<mapId> 由 play(..., id) 选中；台词只写 li 索引，正文运行时从 MAP_STORIES.<mapId> 注入，
  // 动画模块绝不另写一句台词。新增一张图 = 往这里加一个 shots 段 + 往 MAP_STORIES 加台词。
  var CUTSCENES = {
    qixuan: {
      title: '卷一 · 七玄门', sub: '越国 · 镜州 青牛山', seal: '七玄',
      shots: [
        { id:0, t:0,    dur:2.4, kind:'chapter', scene:'village', fx:'unroll',
          cam:{ z:[1.00,1.05], x:[0,-8], y:[0,0] }, label:'卷一 · 七玄门' },
        { id:1, t:2.4,  dur:3.2, scene:'village', fx:'mist',
          li: 0,
          cam:{ z:[1.05,1.16], x:[-8,-18], y:[0,-10] } },
        { id:2, t:5.6,  dur:3.4, scene:'village', actors:[['hanli','L']], fx:'ink',
          li: 1,
          cam:{ z:[1.16,1.22], x:[-18,-6], y:[-10,4] } },
        { id:3, t:9.0,  dur:3.6, scene:'gate', fx:'unroll',
          li: 2,
          cam:{ z:[1.00,1.12], x:[16,-6], y:[0,-8] } },
        { id:4, t:12.6, dur:3.0, scene:'trial', actors:[['hanli','L'],['zhangtie','R']], fx:'ink',
          li: 3,
          cam:{ z:[1.02,1.15], x:[0,0], y:[0,-6] } },
        { id:5, t:15.6, dur:2.8, scene:'gate', actors:[['hanli','L'],['zhangtie','R']], fx:'dim',
          li: 4,
          cam:{ z:[1.15,1.09], x:[0,6], y:[-6,0] } },
        { id:6, t:18.4, dur:3.0, scene:'hut', actors:[['mo','R']], fx:'seal',
          li: 5,
          cam:{ z:[1.00,1.11], x:[10,0], y:[0,-4] } },
        { id:7, t:21.4, dur:3.2, scene:'hut', actors:[['hanli','L']], fx:'glow',
          li: 6,
          cam:{ z:[1.11,1.17], x:[0,-8], y:[-4,0] } },
        { id:8, t:24.6, dur:3.8, scene:'hill', fx:'roll',
          li: 7,
          cam:{ z:[1.20,1.00], x:[-10,0], y:[0,0] } }
      ]
    },
    houshan: {
      title: '卷一 · 后山采药', sub: '青牛山北麓 · 神手谷', seal: '採藥',
      shots: [
        { id:0, t:0,    dur:2.4, kind:'chapter', scene:'forest', fx:'unroll',
          cam:{ z:[1.00,1.06], x:[0,-10], y:[0,0] }, label:'卷一 · 后山采药' },
        { id:1, t:2.4,  dur:3.2, scene:'forest', fx:'mist',
          li: 0,
          cam:{ z:[1.06,1.17], x:[-10,-20], y:[0,-12] } },
        { id:2, t:5.6,  dur:3.4, scene:'forest', actors:[['hanli','L'],['zhangtie','R']], fx:'ink',
          li: 1,
          cam:{ z:[1.17,1.21], x:[-20,-6], y:[-12,4] } },
        { id:3, t:9.0,  dur:3.6, scene:'hut', actors:[['mo','R']], fx:'unroll',
          li: 2,
          cam:{ z:[1.00,1.13], x:[14,-4], y:[0,-8] } },
        { id:4, t:12.6, dur:3.0, scene:'hut', actors:[['mo','R']], fx:'dim',
          li: 3,
          cam:{ z:[1.13,1.08], x:[-4,6], y:[-8,0] } },
        { id:5, t:15.6, dur:2.8, scene:'fall', fx:'ink',
          li: 4,
          cam:{ z:[1.02,1.16], x:[0,0], y:[0,-10] } },
        { id:6, t:18.4, dur:3.0, scene:'herb', actors:[['hanli','L']], fx:'glow',
          li: 5,
          cam:{ z:[1.16,1.20], x:[0,-8], y:[-10,0] } },
        { id:7, t:21.4, dur:3.2, scene:'cave', fx:'seal',
          li: 6,
          cam:{ z:[1.00,1.14], x:[10,-6], y:[0,-6] } },
        { id:8, t:24.6, dur:3.8, scene:'hill', fx:'roll',
          li: 7,
          cam:{ z:[1.20,1.00], x:[-10,0], y:[0,0] } }
      ]
    }
  };
  var curMap = 'qixuan', SHOTS = CUTSCENES.qixuan.shots;
  function totalOf() { return SHOTS[SHOTS.length-1].t + SHOTS[SHOTS.length-1].dur; }
  var TOTAL = totalOf();
  var SCENE_KEYS = ['village','gate','trial','hut','hill','forest','fall','herb','cave'];

  // ===================== 程序化场景（烘焙一次） =====================
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function ridge(g, baseY, amp, color, seed, step) {
    var r = rnd(seed), pts = [];
    for (var x = -20; x <= 500; x += (step || 26)) {
      var y = baseY - Math.sin(x / 88 + seed) * amp * .55 - r() * amp * .45;
      pts.push([x, y]);
    }
    g.beginPath(); g.moveTo(-20, 864);
    for (var i = 0; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.lineTo(500, 864); g.closePath(); g.fillStyle = color; g.fill();
    g.strokeStyle = C.line; g.globalAlpha = .18; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
  }
  function mist(g, y, h, alpha) {
    var grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(.5, C.sky);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = alpha == null ? .5 : alpha; g.fillStyle = grd; g.fillRect(0, y, 480, h); g.globalAlpha = 1;
  }
  function house(g, x, y, w, h) {
    g.fillStyle = C.wood; g.fillRect(x, y, w, h);
    g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + w / 2, y - h * .58); g.lineTo(x + w + 10, y); g.closePath();
    g.fillStyle = C.near; g.fill();
    g.strokeStyle = C.line; g.globalAlpha = .35; g.lineWidth = 1.4; g.stroke(); g.globalAlpha = 1;
    g.fillStyle = C.gold; g.globalAlpha = .42; g.fillRect(x + w * .36, y + h * .42, w * .26, h * .34); g.globalAlpha = 1;
  }
  function pine(g, x, y, s) {
    g.strokeStyle = C.near; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3 * s, y - 66 * s); g.stroke();
    for (var i = 0; i < 3; i++) {
      var yy = y - (34 + i * 20) * s, ww = (34 - i * 8) * s;
      g.beginPath(); g.ellipse(x, yy, ww, 9 * s, 0, 0, Math.PI * 2);
      g.fillStyle = C.mid; g.globalAlpha = .9; g.fill();
    }
    g.globalAlpha = 1;
  }
  function paperGrain(g, seed) {
    var r = rnd(seed);
    g.globalAlpha = .055;
    for (var i = 0; i < 1500; i++) {
      g.fillStyle = r() > .5 ? C.ink : '#000';
      g.fillRect(r() * 480, r() * 864, 1 + r() * 1.6, 1 + r() * 1.6);
    }
    g.globalAlpha = 1;
  }
  // 场景题跋印：原画在 (410,640)，既落进 #subBox（top=628）被字幕吃掉，又会被右侧人物立绘
  // 挡掉半个字。挪到左上天空 (26,232) —— 人物区从 y=330 起、字幕区从 628 起，两处都避开。
  // 字色也不能用 C.paper —— 墨皮下它是深墨，红底深字几乎不可读，改用双皮都亮的 C.light。
  function titleSeal(g, text) {
    g.fillStyle = C.red; g.globalAlpha = .72; g.fillRect(26, 232, 34, 34); g.globalAlpha = 1;
    g.fillStyle = C.light; g.font = '15px KaiTi, serif'; g.textAlign = 'center';
    g.fillText(text, 43, 255); g.textAlign = 'left';
  }
  // 天空留白：一轮淡月 + 云带，避免上半屏空掉
  function skyMark(g) {
    g.globalAlpha = skin === 'paper' ? .10 : .14; g.fillStyle = C.ink;
    g.beginPath(); g.arc(374, 126, 40, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = C.line; g.globalAlpha = .16; g.lineWidth = 2;
    for (var i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(16, 176 + i * 28);
      g.bezierCurveTo(160, 154 + i * 28, 300, 198 + i * 28, 464, 170 + i * 28); g.stroke();
    }
    g.globalAlpha = 1;
  }
  // 地面收口：字幕区上方铺一层墨色渐隐 + 横向皴笔，章节卡时下半屏也不空
  function ground(g) {
    var grd = g.createLinearGradient(0, 552, 0, 864);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, skin === 'paper' ? 'rgba(90,74,48,.28)' : 'rgba(0,0,0,.46)');
    g.fillStyle = grd; g.fillRect(0, 552, 480, 312);
    g.strokeStyle = C.line; g.globalAlpha = .15; g.lineWidth = 1.5;
    for (var i = 0; i < 5; i++) {
      g.beginPath(); g.moveTo(-20, 636 + i * 46);
      g.quadraticCurveTo(240, 614 + i * 46, 500, 650 + i * 46); g.stroke();
    }
    g.globalAlpha = 1;
  }

  function bake(key) {
    var c = D.createElement('canvas'); c.width = 480; c.height = 864;
    var g = c.getContext('2d');
    var grd = g.createLinearGradient(0, 0, 0, 864);
    grd.addColorStop(0, C.sky); grd.addColorStop(.48, C.paper); grd.addColorStop(1, C.paper);
    g.fillStyle = grd; g.fillRect(0, 0, 480, 864);
    skyMark(g);

    if (key === 'village') {
      ridge(g, 350, 92, C.far, 7); ridge(g, 452, 68, C.mid, 19); ridge(g, 540, 44, C.near, 31, 20);
      house(g, 74, 468, 92, 66); house(g, 196, 490, 66, 48); house(g, 300, 476, 104, 60);
      pine(g, 44, 556, 1.15); pine(g, 438, 540, .85);
      g.strokeStyle = C.line; g.globalAlpha = .22; g.lineWidth = 2;
      for (var i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, 600 + i * 22); g.bezierCurveTo(160, 588 + i * 22, 320, 616 + i * 22, 480, 596 + i * 22); g.stroke(); }
      g.globalAlpha = 1; mist(g, 300, 130, .45); titleSeal(g, '青牛');
    } else if (key === 'gate') {
      ridge(g, 330, 108, C.far, 11); ridge(g, 470, 74, C.mid, 23);
      // 石阶
      g.fillStyle = C.near; g.globalAlpha = .55;
      for (var s = 0; s < 6; s++) g.fillRect(96 - s * 8, 596 + s * 26, 288 + s * 16, 12);
      g.globalAlpha = 1;
      // 牌坊
      g.fillStyle = C.wood; g.fillRect(126, 300, 22, 300); g.fillRect(332, 300, 22, 300);
      g.fillRect(104, 288, 272, 24); g.fillRect(96, 336, 288, 12);
      g.fillStyle = C.gold; g.globalAlpha = .5; g.fillRect(196, 344, 88, 40); g.globalAlpha = 1;
      g.strokeStyle = C.line; g.globalAlpha = .4; g.strokeRect(196, 344, 88, 40); g.globalAlpha = 1;
      g.fillStyle = C.ink; g.font = '22px KaiTi, serif'; g.textAlign = 'center'; g.fillText('七玄門', 240, 373); g.textAlign = 'left';
      pine(g, 52, 578, 1.3); pine(g, 430, 566, 1.0);
      mist(g, 420, 150, .4); titleSeal(g, '七玄');
    } else if (key === 'trial') {
      ridge(g, 344, 60, C.far, 13);
      g.fillStyle = C.mid; g.globalAlpha = .5; g.fillRect(0, 520, 480, 344); g.globalAlpha = 1;
      // 石锁原画在 y=470/486，正好被两位人物立绘（y≈450-630）整块挡住；
      // 上移到人物头顶上方，并按皮给高对比描边，墨皮下 C.wood 与地面同色的问题一并解决。
      var stone = skin === 'paper' ? 'rgba(74,62,42,.72)' : 'rgba(206,216,206,.40)';
      function lock(x, y, s) {
        g.fillStyle = C.wood; g.fillRect(x - 34 * s, y, 68 * s, 46 * s);
        g.strokeStyle = stone; g.lineWidth = 3 * s; g.globalAlpha = .85;
        g.strokeRect(x - 34 * s, y, 68 * s, 46 * s);
        g.beginPath(); g.arc(x, y, 26 * s, Math.PI, 0); g.stroke(); g.globalAlpha = 1;
      }
      lock(120, 348, 1.0); lock(352, 352, .78);
      g.strokeStyle = C.line; g.globalAlpha = .2; g.lineWidth = 2;
      for (var k = 0; k < 5; k++) { g.beginPath(); g.moveTo(0, 580 + k * 46); g.lineTo(480, 566 + k * 46); g.stroke(); }
      g.globalAlpha = 1; mist(g, 300, 110, .35); titleSeal(g, '入門');
    } else if (key === 'hut') {
      g.fillStyle = C.near; g.globalAlpha = .6; g.fillRect(0, 0, 480, 864); g.globalAlpha = 1;
      // 屋檐与门
      g.fillStyle = C.wood; g.fillRect(60, 250, 360, 18);
      g.beginPath(); g.moveTo(40, 250); g.lineTo(240, 196); g.lineTo(440, 250); g.closePath(); g.fill();
      g.fillRect(92, 268, 26, 330); g.fillRect(362, 268, 26, 330);
      // 窗光
      var lg = g.createRadialGradient(240, 400, 10, 240, 400, 180);
      lg.addColorStop(0, C.gold); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = .22; g.fillStyle = lg; g.fillRect(60, 220, 360, 400); g.globalAlpha = 1;
      // 窗光：原来是一块 180x220 的纯色矩形，像个贴片/关着的门板；
      // 改成半透明渐变 + 窗棂格线，让屋内层次透出来。
      var wg = g.createLinearGradient(150, 330, 330, 550);
      wg.addColorStop(0, skin === 'paper' ? 'rgba(255,250,232,.34)' : 'rgba(200,214,210,.12)');
      wg.addColorStop(1, skin === 'paper' ? 'rgba(120,100,70,.20)' : 'rgba(10,14,20,.30)');
      g.fillStyle = wg; g.fillRect(150, 330, 180, 220);
      g.strokeStyle = C.line; g.globalAlpha = .5; g.lineWidth = 3;
      g.strokeRect(150, 330, 180, 220);
      g.globalAlpha = .34; g.lineWidth = 2;
      g.beginPath(); g.moveTo(240, 330); g.lineTo(240, 550); g.moveTo(150, 440); g.lineTo(330, 440); g.stroke();
      g.globalAlpha = 1;
      // 药架
      for (var sh = 0; sh < 3; sh++) { g.fillStyle = C.wood; g.fillRect(60, 400 + sh * 54, 72, 8); }
      g.fillStyle = C.red; g.globalAlpha = .5;
      for (var b = 0; b < 6; b++) g.fillRect(70 + b * 11, 382, 7, 18);
      g.globalAlpha = 1; mist(g, 500, 180, .3); titleSeal(g, '藥廬');
    } else if (key === 'hill') {
      ridge(g, 300, 120, C.far, 5); ridge(g, 400, 96, C.mid, 17); ridge(g, 500, 70, C.near, 29, 22);
      // 山径
      g.beginPath(); g.moveTo(300, 864); g.bezierCurveTo(250, 720, 330, 640, 214, 520);
      g.strokeStyle = C.paper; g.globalAlpha = .35; g.lineWidth = 22; g.lineCap = 'round'; g.stroke(); g.globalAlpha = 1;
      // 两个背药篓的小人
      function walker(x, y, s) {
        g.fillStyle = C.wood;
        g.beginPath(); g.ellipse(x, y, 11 * s, 15 * s, 0, 0, Math.PI * 2); g.fill();
        g.fillRect(x - 9 * s, y + 12 * s, 18 * s, 30 * s);
        g.fillRect(x - 15 * s, y - 2 * s, 8 * s, 20 * s);
      }
      walker(232, 536, 1); walker(268, 552, .86);
      pine(g, 74, 590, 1.2); pine(g, 412, 570, .9);
      mist(g, 250, 170, .48); titleSeal(g, '後山');
    } else if (key === 'forest') {
      // 后山晨雾：三层远山 + 一排高对比近松。
      // 不能用 pine()：它拿 C.mid / C.near 画，墨皮下与背景同色，松林会整片消失。
      ridge(g, 320, 108, C.far, 3); ridge(g, 420, 82, C.mid, 23); ridge(g, 520, 56, C.near, 41, 18);
      var needle = skin === 'paper' ? 'rgba(58,48,30,.66)' : 'rgba(196,208,200,.40)';
      var trunk  = skin === 'paper' ? 'rgba(58,48,30,.50)' : 'rgba(206,216,206,.26)';
      function bpine(px, py, ps) {
        g.strokeStyle = trunk; g.lineWidth = 5 * ps;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px - 3 * ps, py - 78 * ps); g.stroke();
        g.fillStyle = needle;
        for (var pi = 0; pi < 4; pi++) {
          var pyy = py - (38 + pi * 22) * ps, pww = (40 - pi * 9) * ps;
          g.beginPath(); g.ellipse(px, pyy, pww, 10 * ps, 0, 0, Math.PI * 2); g.fill();
        }
      }
      bpine(46, 646, 1.5); bpine(132, 608, 1.1); bpine(358, 614, 1.25); bpine(444, 650, 1.55);
      g.strokeStyle = C.line; g.globalAlpha = .18; g.lineWidth = 2;
      for (var fi = 0; fi < 5; fi++) { g.beginPath(); g.moveTo(0, 620 + fi * 34); g.bezierCurveTo(150, 606 + fi * 34, 330, 636 + fi * 34, 480, 614 + fi * 34); g.stroke(); }
      g.globalAlpha = 1; mist(g, 280, 210, .55); mist(g, 500, 150, .35); titleSeal(g, '後山');
    } else if (key === 'fall') {
      // 赤水峰瀑布：岩壁按皮给对比色 + 分层皴笔，水帘上窄下宽带飞白。
      // 潭 / 涟漪 / 水雾原本画在 y=690-720，全落进 #subBox（top=628）被字幕吃掉；
      // 一律收进 y<610，并把「顶水冲练」的小剪影放进水帘，呼应本拍台词。
      ridge(g, 300, 96, C.far, 17);
      var cliff  = skin === 'paper' ? 'rgba(74,62,42,.78)' : 'rgba(28,34,42,.92)';
      var cliff2 = skin === 'paper' ? 'rgba(120,104,76,.42)' : 'rgba(150,166,176,.16)';
      g.fillStyle = cliff;
      g.beginPath(); g.moveTo(0, 232); g.lineTo(158, 214); g.lineTo(180, 420); g.lineTo(162, 616); g.lineTo(0, 636); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(480, 220); g.lineTo(322, 208); g.lineTo(300, 420); g.lineTo(318, 616); g.lineTo(480, 632); g.closePath(); g.fill();
      g.fillStyle = cliff2;
      g.beginPath(); g.moveTo(0, 300); g.lineTo(150, 282); g.lineTo(168, 400); g.lineTo(0, 424); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(480, 292); g.lineTo(330, 276); g.lineTo(312, 400); g.lineTo(480, 418); g.closePath(); g.fill();
      g.strokeStyle = C.line; g.globalAlpha = .30; g.lineWidth = 2;
      for (var ri = 0; ri < 7; ri++) {
        g.beginPath(); g.moveTo(8, 286 + ri * 48); g.lineTo(124 + (ri % 2) * 24, 268 + ri * 48); g.stroke();
        g.beginPath(); g.moveTo(472, 278 + ri * 48); g.lineTo(356 - (ri % 2) * 22, 262 + ri * 48); g.stroke();
      }
      g.globalAlpha = 1;
      var water  = skin === 'paper' ? 'rgba(255,253,244,.90)' : 'rgba(190,208,214,.60)';
      var water2 = skin === 'paper' ? 'rgba(176,164,132,.34)' : 'rgba(88,104,114,.34)';
      g.fillStyle = water;
      g.beginPath(); g.moveTo(168, 214); g.lineTo(312, 210); g.lineTo(326, 566); g.lineTo(154, 566); g.closePath(); g.fill();
      [[184,15],[214,7],[238,22],[272,9],[296,14]].forEach(function (f) {
        g.fillStyle = water2; g.fillRect(f[0], 222, f[1], 336);
      });
      // 张铁于瀑布底结跏趺坐、顶水冲练：坐姿剪影取代原先悬在水帘中段、上举双臂的 Y 形。
      // 先铺潭面，再让人物坐在潭中磐石上；水帘自两侧落到潭里，头顶补散开的飞白与一圈静气光晕。
      // 台词仍是原著「顶着水冲」，只改画面取境，不动 MAP_STORIES。
      var body = skin === 'paper' ? 'rgba(58,48,30,.76)' : 'rgba(10,16,22,.84)';
      var rim  = skin === 'paper' ? 'rgba(255,251,238,.72)' : 'rgba(196,214,220,.46)';
      // 潭 + 涟漪：全部落在字幕框上方（y<610）
      g.fillStyle = C.mid; g.globalAlpha = .85;
      g.beginPath(); g.ellipse(240, 572, 128, 26, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = water; g.globalAlpha = .60; g.lineWidth = 2;
      for (var wi2 = 0; wi2 < 3; wi2++) { g.beginPath(); g.ellipse(240, 572, 40 + wi2 * 36, 8 + wi2 * 5, 0, 0, Math.PI * 2); g.stroke(); }
      g.globalAlpha = 1;
      // 静气光晕：墨皮/纸皮各给对比色，避免同色糊进水帘
      var hg = g.createRadialGradient(240, 528, 6, 240, 528, 78);
      hg.addColorStop(0, skin === 'paper' ? 'rgba(255,252,238,.42)' : 'rgba(186,210,216,.24)');
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = hg; g.fillRect(162, 450, 156, 156);
      // 潭中磐石：给坐姿一个落点，不再悬空
      g.fillStyle = body; g.globalAlpha = .72;
      g.beginPath(); g.ellipse(240, 560, 44, 10, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = rim; g.globalAlpha = .65; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(240, 557, 44, 8, 0, Math.PI * 1.06, Math.PI * 1.94); g.stroke(); g.globalAlpha = 1;
      // 结跏趺坐：道髻 + 头 + 上窄下宽的坐身 + 盘腿横椭圆 + 双手搭膝（无上举笔画）
      g.fillStyle = body;
      g.beginPath(); g.ellipse(240, 498, 4, 3, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(240, 508, 10, 11, 0, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(231, 520); g.lineTo(249, 520);
      g.quadraticCurveTo(254, 534, 256, 546); g.lineTo(224, 546);
      g.quadraticCurveTo(226, 534, 231, 520); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(240, 550, 30, 10, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = body; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(231, 524); g.quadraticCurveTo(220, 536, 214, 548);
      g.moveTo(249, 524); g.quadraticCurveTo(260, 536, 266, 548);
      g.stroke(); g.lineCap = 'butt';
      g.strokeStyle = rim; g.globalAlpha = .5; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(224, 551); g.quadraticCurveTo(240, 558, 256, 551); g.stroke(); g.globalAlpha = 1;
      // 水帘本身已直落到人物头顶，不再补散水笔画：对称斜线会读成举臂，短竖线像天线，都去掉。
      mist(g, 520, 110, .45); titleSeal(g, '赤水');
    } else if (key === 'herb') {
      // 神手谷药圃：田垄 + 药苗 + 亮色药架（墨皮下 C.wood 会没进背景，这里另给对比色）
      ridge(g, 340, 70, C.far, 29);
      g.fillStyle = C.mid; g.globalAlpha = .45; g.fillRect(0, 500, 480, 364); g.globalAlpha = 1;
      g.strokeStyle = C.line; g.globalAlpha = .3; g.lineWidth = 2;
      for (var hi = 0; hi < 6; hi++) { g.beginPath(); g.moveTo(0, 540 + hi * 52); g.bezierCurveTo(160, 528 + hi * 52, 320, 552 + hi * 52, 480, 536 + hi * 52); g.stroke(); }
      g.globalAlpha = 1;
      for (var hj = 0; hj < 7; hj++) {
        var hx = 42 + hj * 66, hy = 536 + (hj % 2) * 46;
        g.fillStyle = C.near; g.fillRect(hx - 3, hy - 16, 6, 20);
        g.fillStyle = C.gold; g.globalAlpha = .52;
        g.beginPath(); g.ellipse(hx, hy - 20, 9, 6, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      }
      var hb = skin === 'paper' ? 'rgba(74,62,42,.62)' : 'rgba(206,216,206,.30)';
      g.fillStyle = hb;
      g.fillRect(346, 316, 7, 150); g.fillRect(438, 316, 7, 150);
      g.fillRect(342, 344, 100, 8); g.fillRect(342, 392, 100, 8); g.fillRect(342, 440, 100, 8);
      g.fillStyle = C.gold; g.globalAlpha = .45;
      for (var hj2 = 0; hj2 < 6; hj2++) g.fillRect(352 + hj2 * 15, 330, 9, 14);
      g.globalAlpha = 1;
      house(g, 40, 430, 88, 60);
      mist(g, 260, 160, .4); titleSeal(g, '藥圃');
    } else if (key === 'cave') {
      // 山涧石缝：岩壁分三层 + 皴笔，天光带上亮下渐隐（原来是一整条纯色矩形贯到 864）。
      // 缝底碎石与那点青绿（掌天瓶伏笔，瓶由 hs_clue 交代）原在 y=660-742，全被字幕吃掉；上移到 540-600。
      ridge(g, 380, 80, C.far, 37);
      var rock  = skin === 'paper' ? 'rgba(74,62,42,.78)' : 'rgba(8,11,16,.88)';
      var rock2 = skin === 'paper' ? 'rgba(120,104,76,.40)' : 'rgba(74,88,98,.22)';
      var lit   = skin === 'paper' ? 'rgba(255,250,232,.70)' : 'rgba(196,210,214,.32)';
      g.fillStyle = rock;
      g.beginPath(); g.moveTo(0, 196); g.lineTo(184, 166); g.lineTo(204, 400); g.lineTo(188, 620); g.lineTo(0, 636); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(480, 184); g.lineTo(296, 160); g.lineTo(282, 400); g.lineTo(296, 620); g.lineTo(480, 634); g.closePath(); g.fill();
      g.fillStyle = rock2;
      g.beginPath(); g.moveTo(0, 250); g.lineTo(170, 224); g.lineTo(192, 396); g.lineTo(0, 420); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(480, 242); g.lineTo(310, 218); g.lineTo(292, 396); g.lineTo(480, 414); g.closePath(); g.fill();
      var sg = g.createLinearGradient(0, 166, 0, 616);
      sg.addColorStop(0, lit); sg.addColorStop(.72, lit); sg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sg;
      g.beginPath(); g.moveTo(184, 166); g.lineTo(296, 160); g.lineTo(286, 616); g.lineTo(192, 616); g.closePath(); g.fill();
      g.strokeStyle = C.ink; g.globalAlpha = .26; g.lineWidth = 2;
      g.beginPath(); g.moveTo(184, 166); g.lineTo(204, 400); g.lineTo(188, 616); g.stroke();
      g.beginPath(); g.moveTo(296, 160); g.lineTo(282, 400); g.lineTo(296, 616); g.stroke();
      for (var ci = 0; ci < 6; ci++) {
        g.beginPath(); g.moveTo(6, 250 + ci * 62); g.lineTo(140 - (ci % 3) * 22, 234 + ci * 62); g.stroke();
        g.beginPath(); g.moveTo(474, 240 + ci * 62); g.lineTo(340 + (ci % 3) * 20, 226 + ci * 62); g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = rock;
      [[198,556,24],[270,578,19],[226,598,16],[284,544,13]].forEach(function (s) {
        g.beginPath(); g.ellipse(s[0], s[1], s[2], s[2] * .55, 0, 0, Math.PI * 2); g.fill();
      });
      var jg = g.createRadialGradient(244, 558, 4, 244, 558, 84);
      jg.addColorStop(0, skin === 'paper' ? 'rgba(72,150,96,.80)' : 'rgba(127,214,160,.78)');
      jg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = jg; g.fillRect(160, 474, 168, 168);
      mist(g, 430, 150, .26); titleSeal(g, '山澗');
    }
    ground(g);
    paperGrain(g, key.length * 37 + 11);
    return c;
  }

  // ===================== 人物图：直接调用主游戏 window.Sprites =====================
  // 与 js/game.js 的 NPC_FACE 一一对应：韩立→hanli、墨大夫→mo2、张铁→zhangtie。
  // js/sprites.js 是零依赖 IIFE，加载后 window.Sprites[key] 就是游戏里那张 12×14 像素精灵；
  // window.SKIN_INK = true 时其 Proxy 自动返回水墨墨版 —— 双皮直接复用游戏自己的机制。
  var ACTOR_SPRITE = { hanli: 'hanli', mo: 'mo2', zhangtie: 'zhangtie' };
  var FACE_SPRITE  = { '韩立': 'hanli', '墨大夫': 'mo2', '张铁': 'zhangtie' };
  function gameSprite(key) {
    try { var s = window.Sprites && window.Sprites[key]; return (s && s.width > 0) ? s : null; }
    catch (e) { return null; }
  }

  // 下面是旧的程序化水墨剪影，仅在精灵表没加载成功时兜底，画面不至于开天窗。
  var ACTOR_STYLE = {
    hanli:    { robe:'#5b6b70', trim:'#9fb4ae', hair:'#1d2126', skin:'#d9c7a8', tall:1.00, size:1.00 },
    mo:       { robe:'#3a3330', trim:'#8c7a5e', hair:'#20201f', skin:'#c9b797', tall:1.10, size:1.06 },
    zhangtie: { robe:'#6a5741', trim:'#a8916c', hair:'#242019', skin:'#cdb28c', tall:1.04, size:1.05 }
  };
  function bakeActorFallback(kind) {
    var st = ACTOR_STYLE[kind];
    var c = D.createElement('canvas'); c.width = 190; c.height = 320;
    var g = c.getContext('2d');
    var s = st.size, cx = 95, base = 302, top = base - 232 * st.tall * s;
    // 袍身
    g.beginPath();
    g.moveTo(cx - 40 * s, top + 62 * s);
    g.quadraticCurveTo(cx - 62 * s, base - 30, cx - 66 * s, base);
    g.lineTo(cx + 66 * s, base);
    g.quadraticCurveTo(cx + 62 * s, base - 30, cx + 40 * s, top + 62 * s);
    g.closePath();
    g.fillStyle = st.robe; g.globalAlpha = .94; g.fill(); g.globalAlpha = 1;
    g.strokeStyle = C.ink; g.globalAlpha = .28; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1;
    // 衣纹
    g.strokeStyle = st.trim; g.globalAlpha = .38; g.lineWidth = 2;
    for (var i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(cx - 34 * s + i * 6, top + 92 * s + i * 30);
      g.quadraticCurveTo(cx, top + 108 * s + i * 30, cx + 34 * s - i * 6, top + 92 * s + i * 30); g.stroke();
    }
    g.globalAlpha = 1;
    // 交领
    g.beginPath(); g.moveTo(cx - 26 * s, top + 62 * s); g.lineTo(cx, top + 96 * s); g.lineTo(cx + 26 * s, top + 62 * s);
    g.strokeStyle = st.trim; g.lineWidth = 4 * s; g.stroke();
    // 颈 / 头
    g.fillStyle = st.skin; g.fillRect(cx - 9 * s, top + 40 * s, 18 * s, 22 * s);
    g.beginPath(); g.ellipse(cx, top + 22 * s, 25 * s, 31 * s, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = C.ink; g.globalAlpha = .35; g.lineWidth = 1.6; g.stroke(); g.globalAlpha = 1;
    // 发 / 冠
    g.fillStyle = st.hair;
    g.beginPath(); g.ellipse(cx, top + 2 * s, 26 * s, 18 * s, 0, Math.PI, Math.PI * 2); g.fill();
    g.fillRect(cx - 26 * s, top - 2 * s, 7 * s, 30 * s); g.fillRect(cx + 19 * s, top - 2 * s, 7 * s, 30 * s);
    if (kind === 'mo') {
      g.fillRect(cx - 12 * s, top - 22 * s, 24 * s, 22 * s);
      g.fillStyle = st.trim; g.globalAlpha = .8; g.fillRect(cx - 3 * s, top - 24 * s, 6 * s, 26 * s); g.globalAlpha = 1;
      g.strokeStyle = st.trim; g.lineWidth = 2; g.globalAlpha = .7;
      g.beginPath(); g.moveTo(cx - 8 * s, top + 42 * s); g.quadraticCurveTo(cx, top + 82 * s, cx + 8 * s, top + 42 * s); g.stroke(); g.globalAlpha = 1;
    } else {
      g.beginPath(); g.arc(cx, top - 12 * s, 9 * s, 0, Math.PI * 2); g.fill();
    }
    // 眉眼
    g.strokeStyle = skin === 'paper' ? '#1b1a14' : '#101216';
    g.fillStyle = skin === 'paper' ? '#1b1a14' : '#101216';
    g.globalAlpha = .85; g.lineWidth = 2.1;
    g.beginPath(); g.moveTo(cx - 15 * s, top + 20 * s); g.lineTo(cx - 6 * s, top + 19 * s);
    g.moveTo(cx + 6 * s, top + 19 * s); g.lineTo(cx + 15 * s, top + 20 * s); g.stroke();
    g.fillRect(cx - 9 * s, top + 22 * s, 3 * s, 3 * s); g.fillRect(cx + 6 * s, top + 22 * s, 3 * s, 3 * s);
    g.beginPath(); g.moveTo(cx - 4 * s, top + 38 * s); g.lineTo(cx + 4 * s, top + 38 * s); g.stroke();
    g.globalAlpha = 1;
    // 墨晕底
    var bg = g.createLinearGradient(0, base - 60, 0, base);
    bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, skin === 'paper' ? 'rgba(70,60,40,.22)' : 'rgba(0,0,0,.35)');
    g.fillStyle = bg; g.fillRect(0, base - 60, 190, 60);
    return c;
  }

  // 立绘真源：把游戏精灵按整数倍放大（关插值，保留游戏原本的像素颗粒）。
  // 画布尺寸、脚底基线 302、入画 / 退场动画全部沿用原样，所以时间轴与 CSS 一行都不用动。
  function bakeActor(kind) {
    var spr = gameSprite(ACTOR_SPRITE[kind]);
    if (!spr) return bakeActorFallback(kind);
    var c = D.createElement('canvas'); c.width = 190; c.height = 320;
    var g = c.getContext('2d');
    var k = Math.floor(Math.min(176 / spr.width, 250 / spr.height)) || 1;
    var w = spr.width * k, h = spr.height * k;
    var x = Math.round((190 - w) / 2), y = 302 - h;
    // 极淡墨晕，让像素小人「站」在场景里，而不是硬贴上去
    var bg = g.createLinearGradient(0, 302 - 76, 0, 302);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(1, skin === 'paper' ? 'rgba(70,60,40,.20)' : 'rgba(0,0,0,.34)');
    g.fillStyle = bg; g.fillRect(0, 302 - 76, 190, 76);
    g.imageSmoothingEnabled = false;
    g.drawImage(spr, x, y, w, h);
    return c;
  }

  // ===================== 像素小像：直接调用主游戏 12×14 精灵 =====================
  var FACES = {
    '韩立':    ['....kkkk....','...kkkkkk...','..kssssssk..','..kssssssk..','..kswsswsk..','..kssssssk..','...kssssk...','....kssk....','...rrrrrr...','..rrwwwwrr..','.rrwwwwwwrr.','.rrwwwwwwrr.','.rrrrrrrrrr.','.rr......rr.'],
    '墨大夫':  ['....kkkk....','...kkkkkk...','..kkkkkkkk..','..kssssssk..','..kswsswsk..','..kssssssk..','...kssssk...','....kssk....','...rrrrrr...','..rrwwwwrr..','.rrwwwwwwrr.','.rrwwwwwwrr.','.rrrrrrrrrr.','.rr......rr.'],
    '张铁':    ['....kkkk....','...kkkkkk...','..kssssssk..','..kssssssk..','..kswsswsk..','..kssssssk..','...kssssk...','....kssk....','...rrrrrr...','..rrwwwwrr..','.rrwwwwwwrr.','.rrwwwwwwrr.','.rrrrrrrrrr.','.rr......rr.']
  };
  function drawFaceFallback(who) {
    var cv = D.getElementById('face'), pat = FACES[who];
    if (!pat) { cv.style.display = 'none'; return; }
    cv.style.display = 'block';
    var g = cv.getContext('2d'); g.clearRect(0, 0, 12, 14);
    var col = { k:'#22252b', s:'#d9c7a8', w:'#1b1e23', r: who === '墨大夫' ? '#3a3330' : (who === '张铁' ? '#6a5741' : '#5b6b70') };
    for (var y = 0; y < pat.length; y++) for (var x = 0; x < pat[y].length; x++) {
      var ch = pat[y][x]; if (ch === '.') continue;
      g.fillStyle = col[ch] || '#555'; g.fillRect(x, y, 1, 1);
    }
  }

  // 对话名牌左侧小像：与 game.js 的 drawFace 同一口径（canvas 尺寸跟精灵走、关平滑）。
  // CSS 的 42×49 正好是 12×14 的 3.5 倍，比例不会变形。
  function drawFace(who) {
    var cv = D.getElementById('face');
    var spr = gameSprite(FACE_SPRITE[who]);
    if (!spr) { drawFaceFallback(who); return; }
    cv.style.display = 'block';
    if (cv.width !== spr.width || cv.height !== spr.height) { cv.width = spr.width; cv.height = spr.height; }
    var g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(spr, 0, 0);
  }

  // ===================== 烘焙缓存 =====================
  var sceneCache = {}, actorCache = {}, bakedGrain = null;
  function rebake() {
    // 主游戏里只读全局 SKIN_INK：绝不改写，否则会污染主游戏自己的水墨/纸皮渲染。
    skin = window.SKIN_INK ? 'ink' : 'paper'; C = THEME[skin];
    SCENE_KEYS.forEach(function (k) { sceneCache[k] = bake(k); });   // 所有分镜的场景一次烘焙，换图零重绘
    ['hanli','mo','zhangtie'].forEach(function (k) { actorCache[k] = bakeActor(k); });
    var gc = D.createElement('canvas'); gc.width = 480; gc.height = 864;
    var gg = gc.getContext('2d'), r = rnd(991);
    for (var i = 0; i < 2600; i++) {
      gg.fillStyle = r() > .5 ? '#ffffff' : '#000000';
      gg.globalAlpha = .05 + r() * .07; gg.fillRect(r() * 480, r() * 864, 1.4, 1.4);
    }
    bakedGrain = gc;
    D.getElementById('grain').getContext('2d').clearRect(0, 0, 480, 864);
    D.getElementById('grain').getContext('2d').drawImage(gc, 0, 0);
    drawBattleMock();
    if (curShot >= 0) {
      var sh = SHOTS[curShot];
      paintScene(sh, true);
      // 人物图随 SKIN_INK 换皮，重烘焙后必须重画到屏幕；
      // 只碰立绘与小像，不重设台词，避免打断正在进行的逐字播放。
      setActors(sh);
      if (sh.line && sh.line[0] !== '旁白') drawFace(sh.line[0]);
    }
  }

  // ===================== 联机战斗示意画面 =====================
  function drawBattleMock() {
    var cv = D.querySelector('#battleMock canvas'), g = cv.getContext('2d');
    g.fillStyle = '#2c3f28'; g.fillRect(0, 0, 480, 864);
    g.globalAlpha = .28; g.fillStyle = '#1d2c1b';
    for (var i = 0; i < 9; i++) g.fillRect(0, 120 + i * 80, 480, 24);
    g.globalAlpha = 1;
    // 玩家
    g.fillStyle = '#5b6b70'; g.beginPath(); g.arc(240, 560, 18, 0, Math.PI * 2); g.fill();
    // 怪
    for (var k = 0; k < 5; k++) {
      var x = 62 + k * 88, y = 260 + (k % 2) * 76;
      g.fillStyle = '#7a3b32'; g.beginPath(); g.arc(x, y, 14 + (k % 3) * 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8d4a8'; g.fillRect(x - 6, y - 3, 4, 4); g.fillRect(x + 2, y - 3, 4, 4);
    }
    g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.globalAlpha = .7;
    g.beginPath(); g.moveTo(240, 540); g.lineTo(150, 330); g.stroke(); g.globalAlpha = 1;
  }

  // ===================== 音效（WebAudio 合成，零素材） =====================
  var AC = null, muted = false, noiseBuf = null;
  function audio() {
    if (!AC) { var K = window.AudioContext || window.webkitAudioContext; if (K) AC = new K(); }
    return AC;
  }
  function noise(c) {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function sfx(kind) {
    if (muted) return;
    var c = audio(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    var t = c.currentTime;
    if (kind === 'bell') {
      var o = c.createOscillator(), gg = c.createGain();
      o.type = 'sine'; o.frequency.value = 660;
      gg.gain.setValueAtTime(.0001, t); gg.gain.exponentialRampToValueAtTime(.13, t + .01);
      gg.gain.exponentialRampToValueAtTime(.0001, t + .8);
      o.connect(gg); gg.connect(c.destination); o.start(t); o.stop(t + .85); return;
    }
    var src = c.createBufferSource(), f = c.createBiquadFilter(), gg2 = c.createGain();
    src.buffer = noise(c);
    f.type = 'lowpass'; f.frequency.setValueAtTime(kind === 'unroll' ? 500 : 1100, t);
    f.frequency.exponentialRampToValueAtTime(kind === 'unroll' ? 2400 : 220, t + .35);
    gg2.gain.setValueAtTime(.0001, t);
    gg2.gain.exponentialRampToValueAtTime(kind === 'ink' ? .10 : .07, t + .02);
    gg2.gain.exponentialRampToValueAtTime(.0001, t + (kind === 'unroll' ? .55 : .30));
    src.connect(f); f.connect(gg2); gg2.connect(c.destination); src.start(t); src.stop(t + .6);
  }

  // ===================== 播放器 =====================
  var $ = function (id) { return D.getElementById(id); };
  var elScene = $('scene'), elSub = $('subBox'), elSpk = $('spk'), elTxt = $('txt');
  var elActorL = $('actorL'), elActorR = $('actorR'), elChapter = $('chapter'), elSeal = $('seal');
  var elWipe = $('wipe'), elDim = $('dim'), elShotNo = $('shotNo'), elBar = $('progress').firstElementChild;

  var t = 0, playing = false, rate = 1, mode = 'solo', curShot = -1, raf = null, lastTs = 0;
  var previewStatic = false;   // 点时间轴定点查看时显示完整台词，播放时才逐字
  var seen = false, reward = '—', replayCount = 0, frames = 0, fpsTs = 0, fps = 0, coopShown = false;

  function shotAt(time) {
    for (var i = SHOTS.length - 1; i >= 0; i--) if (time >= SHOTS[i].t) return i;
    return 0;
  }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function paintScene(sh, force) {
    var key = sh.scene;
    if (force || elScene.dataset.scene !== key) {
      elScene.dataset.scene = key;
      var g = elScene.getContext('2d');
      g.clearRect(0, 0, 480, 864);
      g.imageSmoothingEnabled = true;
      g.drawImage(sceneCache[key], 0, 0);
    }
  }
  function setActors(sh) {
    var wantL = null, wantR = null;
    (sh.actors || []).forEach(function (a) { if (a[1] === 'L') wantL = a[0]; else wantR = a[0]; });
    function apply(el, want) {
      if (!want) { el.classList.remove('in'); return; }
      var cv = el.firstElementChild, g = cv.getContext('2d');
      g.clearRect(0, 0, 190, 320);
      g.drawImage(actorCache[want], 0, 0);
      el.classList.add('in');
    }
    apply(elActorL, wantL); apply(elActorR, wantR);
  }
  function setLine(sh, p) {
    if (!sh.line) { elSub.style.opacity = '0'; return; }
    elSub.style.opacity = '1';
    var narration = sh.line[0] === '旁白';
    elSub.classList.toggle('narration', narration);
    if (!narration) { elSpk.textContent = sh.line[0]; drawFace(sh.line[0]); }
    var full = sh.line[1], n = full.length;
    var p2 = clamp01(p / .78);   // 切拍首帧就出字，不留空白；末尾 22% 留给读者看完整句
    elTxt.textContent = previewStatic ? full : full.slice(0, Math.floor(p2 * n));
  }
  function fireFx(name) {
    elSeal.classList.remove('on');
    if (name === 'unroll' || name === 'ink' || name === 'roll') sfx(name === 'unroll' ? 'unroll' : 'ink');
    if (name === 'seal') { elSeal.classList.add('on'); sfx('bell'); }
    if (name === 'dim') elDim.style.background = 'rgba(8,10,14,.30)';
    else elDim.style.background = 'rgba(8,10,14,0)';
    if (name === 'glow') sfx('bell');
  }
  function wipe() {
    elWipe.classList.remove('on'); void elWipe.offsetWidth; elWipe.classList.add('on');
  }

  function renderShot(idx, p, forceScene) {
    var sh = SHOTS[idx];
    if (idx !== curShot) {
      var changedScene = curShot < 0 || SHOTS[curShot].scene !== sh.scene;
      curShot = idx;
      paintScene(sh, true);
      if (changedScene && idx > 0) wipe();
      setActors(sh);
      elChapter.classList.toggle('on', sh.kind === 'chapter');
      fireFx(sh.fx);
      updateShotList();
      $('shotJson').textContent = JSON.stringify({
        id: sh.id, t: sh.t, dur: sh.dur, scene: sh.scene,
        cam: sh.cam, actors: sh.actors || [], fx: sh.fx,
        line: sh.line ? sh.line[0] + '：' + sh.line[1].slice(0, 18) + '…' : null
      }, null, 2);
      $('sShot').textContent = '#' + sh.id + ' / ' + (SHOTS.length - 1) + '  ' + (sh.label || sh.scene);
    } else if (forceScene) {
      paintScene(sh, true); setActors(sh);
    }
    var cam = sh.cam || { z: [1, 1], x: [0, 0], y: [0, 0] };
    var z = lerp(cam.z[0], cam.z[1], p) + .08;
    var x = lerp(cam.x[0], cam.x[1], p), y = lerp(cam.y[0], cam.y[1], p);
    elScene.style.transform = 'scale(' + z.toFixed(4) + ') translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    setLine(sh, p);
    elShotNo.textContent = '第 ' + (sh.id + 1) + ' 拍 / 共 ' + SHOTS.length + ' 拍';
    elBar.style.width = (t / TOTAL * 100).toFixed(2) + '%';
    $('sTime').textContent = t.toFixed(1) + ' / ' + TOTAL.toFixed(1) + 's';
  }

  function frame(ts) {
    if (!playing) return;
    if (!lastTs) lastTs = ts;
    var dt = Math.min(.05, (ts - lastTs) / 1000) * rate;
    lastTs = ts; t += dt;
    frames++;
    if (ts - fpsTs > 500) { fps = Math.round(frames * 1000 / (ts - fpsTs)); frames = 0; fpsTs = ts; $('sFps').textContent = fps + ' fps'; }
    if (t >= TOTAL) { t = TOTAL; renderShot(SHOTS.length - 1, 1); finish(); return; }
    var idx = shotAt(t), sh = SHOTS[idx];
    renderShot(idx, clamp01((t - sh.t) / sh.dur));
    raf = requestAnimationFrame(frame);
  }
  function setPlaying(v) {
    playing = v; lastTs = 0;
    $('bPlay').textContent = v ? '⏸ 暂停' : '▶ 播放';
    if (v) { if (!raf) raf = requestAnimationFrame(frame); }
    else if (raf) { cancelAnimationFrame(raf); raf = null; }
  }
  function finish() {
    setPlaying(false);
    if (!active) return;   // 自然播完 / 点跳过 / QA stop 三条路只准走一次
    active = false; host.style.display = 'none';
    var cb = onDone; onDone = null;
    if (cb) cb();
    if (mode === 'solo' && !seen) {
      seen = true; reward = '—（本图无剧情奖励）';
      $('sSeen').textContent = '演毕 · ' + curMap; $('sSeen').className = 'g';
      $('sReward').textContent = reward;
      sfx('bell');
    }
    $('hint').textContent = '演毕 · 点「↺ 重播」随时回看 ▸';
  }

  // ===================== 联机分流 =====================
  function enterCoop() {
    setPlaying(false);
    mode = 'coop'; coopShown = true;
    $('segMode').querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === 'coop'); });
    $('battleMock').classList.add('on');
    elSub.style.opacity = '0';
    elChapter.classList.remove('on');
    elActorL.classList.remove('in'); elActorR.classList.remove('in');
    // 三条补偿：不写 seen / 补发奖励 / 留回看
    $('sSeen').textContent = '未写（留给单机首演）'; $('sSeen').className = 'w';
    $('sReward').textContent = '已补发 · 幂等'; $('sReward').className = 'g';
    replayCount = SHOTS.filter(function (s) { return s.line; }).length;
    $('sReplay').textContent = '+' + replayCount + ' 段可回看'; $('sReplay').className = 'g';
    $('sShot').textContent = '—（未建过场层）';
    elShotNo.textContent = '';
    $('shotJson').textContent = '// 联机：不进入 cutscene\n// showLines 未调用，Coop.sendDlg 未广播\n// onEnd 后果照走，但 storyMarkSeen 不执行\n{ "seen": false, "reward": "granted", "replay": ' + replayCount + ' }';
    $('hint').textContent = '联机模式：直接进战斗';
    updateShotList();
  }
  function enterSolo() {
    mode = 'solo'; coopShown = false;
    $('battleMock').classList.remove('on');
    $('segMode').querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === 'solo'); });
    $('sReward').textContent = seen ? '—（本图无剧情奖励）' : '—';
    $('sReward').className = '';
    if (curShot >= 0) {
      var sh = SHOTS[curShot];
      $('shotJson').textContent = JSON.stringify({
        id: sh.id, t: sh.t, dur: sh.dur, scene: sh.scene, cam: sh.cam,
        actors: sh.actors || [], fx: sh.fx,
        line: sh.line ? sh.line[0] + '：' + sh.line[1].slice(0, 18) + '…' : null
      }, null, 2);
      previewStatic = true; renderShot(curShot, .4, true); updateShotList();
    }
  }

  // ===================== 控件 =====================
  function updateShotList(rebuild) {
    var box = $('shotList');
    if (rebuild) box.innerHTML = '';   // 换地图：分镜列表必须重建，否则还挂着上一张图的拍名
    if (!box.children.length) {
      SHOTS.forEach(function (sh) {
        var d = D.createElement('div');
        d.dataset.i = sh.id;
        d.innerHTML = '<span>' + sh.t.toFixed(1) + 's</span>' + (sh.label || (sh.line ? sh.line[0] + '｜' + sh.line[1].slice(0, 13) + '…' : sh.scene));
        d.addEventListener('click', function () { jump(sh.id); });
        box.appendChild(d);
      });
    }
    box.querySelectorAll('div').forEach(function (d) {
      d.classList.toggle('on', !coopShown && +d.dataset.i === curShot);
    });
  }
  // 切到某张图的分镜：换 shots / 总时长 / 章节卡 / 印章 / 拍序列表。
  // play() 每次都调，剧场回看与进图首演走同一条路，不会残留上一张图的分镜。
  function setCutscene(mapId) {
    var cs = CUTSCENES[mapId] || CUTSCENES.qixuan;
    curMap = CUTSCENES[mapId] ? mapId : 'qixuan';
    SHOTS = cs.shots; TOTAL = totalOf();
    root.querySelector('#chapter .ct').textContent = cs.title;
    root.querySelector('#chapter .cs').textContent = cs.sub;
    D.getElementById('seal').textContent = cs.seal;
    D.getElementById('bmSub').textContent = curMap + ' 剧情过场 · 联机不建层';
    updateShotList(true);
    $('sTime').textContent = '0.0 / ' + TOTAL.toFixed(1) + 's';
  }
  function jump(idx) {
    if (coopShown) enterSolo();
    setPlaying(false);
    previewStatic = true;
    t = SHOTS[idx].t + .001; curShot = -1;
    renderShot(idx, 0);
    $('hint').textContent = '剧情演出中 · 点右上角可跳过';
  }
  function start() {
    if (coopShown) enterSolo();
    previewStatic = false;
    if (t >= TOTAL - .01) { t = 0; curShot = -1; seen = false; $('sSeen').textContent = '未写'; $('sSeen').className = ''; }
    sfx('unroll'); setPlaying(true);
  }

  $('bPlay').addEventListener('click', function () { if (coopShown) enterSolo(); playing ? setPlaying(false) : start(); });
  $('bNext').addEventListener('click', function () {
    var n = Math.min(SHOTS.length - 1, (curShot < 0 ? 0 : curShot + 1)); jump(n);
  });
  $('bSkip').addEventListener('click', function () { previewStatic = false; t = TOTAL; renderShot(SHOTS.length - 1, 1); finish(); });
  $('bReplay').addEventListener('click', function () {
    if (coopShown) enterSolo();
    previewStatic = false;
    t = 0; curShot = -1; seen = false;
    $('sSeen').textContent = '未写'; $('sSeen').className = '';
    $('hint').textContent = '点击画面推进一拍 ▸';
    sfx('unroll'); renderShot(0, 0); setPlaying(true);
  });
  $('bCoop').addEventListener('click', enterCoop);
  $('stage').addEventListener('click', function () {
    if (coopShown) { enterSolo(); start(); return; }
    var n = Math.min(SHOTS.length - 1, (curShot < 0 ? 0 : curShot + 1));
    if (n === curShot && n === SHOTS.length - 1) { t = TOTAL; renderShot(n, 1); finish(); return; }
    jump(n);
  });

  function bindSeg(id, fn) {
    $(id).querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        $(id).querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on'); fn(b.dataset.v);
      });
    });
  }
  bindSeg('segMode', function (v) { v === 'coop' ? enterCoop() : enterSolo(); });
  bindSeg('segSkin', function (v) {
    skin = v; C = THEME[v]; D.body.dataset.skin = v; rebake(); sfx('ink');
  });
  bindSeg('segRate', function (v) { rate = +v; });
  bindSeg('segSfx', function (v) { muted = v === 'off'; if (!muted) sfx('bell'); });

  // ===================== 舞台自适应（同游戏 #stage 的 scale 口径） =====================
  function fit() {
    var wrap = $('stageWrap'), st = $('stage');
    // 舞台是 480x864 的定高竖屏：只按宽度缩放在矮窗口（1280x720 / 横屏 / 分屏）会把
    // 864 高的舞台顶出屏幕，字幕框和跳过按钮被裁掉。高度也要一起参与取最小缩放。
    var w = window.innerWidth, h = window.innerHeight;
    var s = Math.min(1, (w - 24) / 480, (h - 24) / 864);
    wrap.style.width = (480 * s) + 'px'; wrap.style.height = (864 * s) + 'px';
    st.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  D.addEventListener('visibilitychange', function () {
    if (D.hidden && playing) setPlaying(false);
  });

  // ===================== 启动 =====================
  rebake(); fit(); updateShotList(); renderShot(0, 0);
  $('sTime').textContent = '0.0 / ' + TOTAL.toFixed(1) + 's';
  $('sReplay').textContent = '0 段';

  // ===================== 对主游戏暴露的接口 =====================
  $('csSkipBtn').addEventListener('click', function () { finish(); });

  window.Cutscene = {
    root: root,
    host: host,
    get shots() { return SHOTS; },          // 当前分镜（随 mapId 切换），不是启动时那一份
    lines: function () { return LINES.slice(); },
    force: false,
    cutscenes: function () { return Object.keys(CUTSCENES); },
    // 洞府「剧情回顾」列表用：章节卡 / 地点 / 拍数 / 时长都从分镜表读，不在 UI 另写一份。
    meta: function (mapId) {
      var c = CUTSCENES[mapId];
      if (!c) return null;
      var sh = c.shots, last = sh[sh.length - 1];
      return { id: mapId, title: c.title, sub: c.sub, seal: c.seal,
               shots: sh.length, dur: +(last.t + last.dur).toFixed(1) };
    },
    mapId: function () { return curMap; },
    available: function () {
      if (this.force || window.__CSJ_CUTSCENE_FORCE__) return true;
      if (window.__CSJ_QA__) return false;
      if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
      return true;
    },
    active: function () { return active; },
    play: function (lines, onEnd, id) {
      // id 形如 'map:qixuan' / 'replay:houshan'：分镜与台词都按 mapId 取，同源不串台。
      var mapId = (String(id || '').match(/^(?:map|replay):([A-Za-z0-9_]+)$/) || [])[1] || 'qixuan';
      setCutscene(mapId);
      applyLines(lines || (window.MAP_STORIES && window.MAP_STORIES[mapId]) || []);
      onDone = onEnd || null;
      active = true;
      mode = 'solo'; coopShown = false; seen = false;
      t = 0; curShot = -1; previewStatic = false; rate = 1;
      skin = window.SKIN_INK ? 'ink' : 'paper'; C = THEME[skin];
      D.body.dataset.skin = skin;
      root.querySelector('.csBody').dataset.skin = skin;
      host.style.display = 'block';
      $('shotNo').style.display = 'none';      // 主游戏里不露测试页的「第 N 拍」调试信息
      $('hint').textContent = '剧情演出中 · 点右上角可跳过';
      rebake(); fit(); updateShotList(); renderShot(0, 0);
      $('sTime').textContent = '0.0 / ' + TOTAL.toFixed(1) + 's';
      sfx('unroll');
      setPlaying(true);
      return true;
    },
    // 剧场回看：只播、不进地图、不写 save.seen、不动奖励（由调用方保证）。
    replay: function (mapId, onEnd) {
      return this.play((window.MAP_STORIES || {})[mapId] || [], onEnd || null, 'replay:' + mapId);
    },
    stop: function () {
      if (!active) return;
      setPlaying(false);
      active = false;
      host.style.display = 'none';
      onDone = null;
    }
  };

})();
