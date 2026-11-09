/* Boss 登场 · 0.8s 主画布短镜头 POC（纯注入，零 game.js 改动）
 * ------------------------------------------------------------------
 * 目的：只验证一件事 —— 在 G.state === 'play'（战斗不中断）时，
 *       主画布相机做一次极短的推近/归位，观感值不值得做。
 *
 * 不入发布清单：不在 index.html 里引用，不 bump ?v=，不进 _site/。
 *
 * 关键技术（与上一轮 dialog 态 POC 不同）：
 *   play 态每帧 update() 会在 game.js:6439 把 G.cam 硬跟随覆盖成 p.x-W/2，
 *   所以「外部 rAF 每帧写 G.cam」会被下一帧冲掉。
 *   这里改成给 G.cam 套一个 Proxy：
 *     get(x|y)  -> 返回 proj（剧情镜头），render() 的视差/裁剪/translate/装饰全读它
 *     set(x|y)  -> 照常写回 real，于是 update() 的硬跟随值仍是可靠的基准
 *   每帧 proj = real + offset，offset 按 0.8s 曲线插值；结束按身份校验还原引用。
 *   这是「render-time camera override」在 play 态的最小验证形态。
 */
(function () {
  var W = window, FR = W.__FR;
  if (!FR || !FR.G) { W.__BOSS_BEAT_ERR__ = '缺少 window.__FR.G（需在真实游戏页面注入）'; return; }
  var G = FR.G;

  var P = {
    active: false, paused: false,
    dur: 0.8, amp: 110, dir: null,
    t: 0, lastT: 0, raf: 0,
    real: null, proxy: null, proj: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    boss: null, log: []
  };

  function easeOutCubic(v) { return 1 - Math.pow(1 - v, 3); }
  function easeInOutCubic(v) { return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }

  // 0.26s 推近 → 0.18s 保持 → 0.36s 归位，合计 0.8s
  function curve(t) {
    if (t <= 0) return 0;
    if (t >= P.dur) return 0;
    if (t < 0.26) return easeOutCubic(t / 0.26);
    if (t < 0.44) return 1;
    return 1 - easeInOutCubic((t - 0.44) / (P.dur - 0.44));
  }

  function syncProj() {
    if (!P.real) return;
    var k = curve(P.t);
    P.offset.x = P.dir.x * P.amp * k;
    P.offset.y = P.dir.y * P.amp * k;
    P.proj.x = P.real.x + P.offset.x;
    P.proj.y = P.real.y + P.offset.y;
  }

  function frame(ts) {
    if (!P.active) return;
    var dt = P.lastT ? Math.min(0.05, (ts - P.lastT) / 1000) : 0;
    P.lastT = ts;
    if (!P.paused) {
      P.t = Math.min(P.dur, P.t + dt);
      syncProj();
      if (P.t >= P.dur) { stop(); return; }
    } else syncProj();
    P.raf = requestAnimationFrame(frame);
  }

  function install() {
    if (P.proxy) return;
    P.real = G.cam;
    var proj = P.proj;
    P.proxy = new Proxy(P.real, {
      get: function (t, k) {
        if (k === 'x' || k === 'y') return proj[k];
        return Reflect.get(t, k);
      },
      set: function (t, k, v) { return Reflect.set(t, k, v); }
    });
    P.proj.x = P.real.x; P.proj.y = P.real.y;
    G.cam = P.proxy;
  }

  function stop() {
    if (P.raf) { cancelAnimationFrame(P.raf); P.raf = 0; }
    // 身份校验：只在 G.cam 仍是我们装进去的那个 Proxy 时才还原，
    // 否则外部（resetRun / startMap）已换过相机，不能把旧引用写回去。
    if (P.proxy && G.cam === P.proxy) G.cam = P.real;
    P.proxy = null; P.real = null;
    P.offset.x = 0; P.offset.y = 0;
    P.active = false; P.paused = false; P.t = 0; P.lastT = 0;
  }

  function pickDir() {
    var p = G.player, b = G.boss;
    if (b && p && typeof b.x === 'number' && typeof b.y === 'number') {
      var dx = b.x - p.x, dy = b.y - p.y, n = Math.hypot(dx, dy);
      if (n > 24) return { x: dx / n, y: dy / n };
    }
    return { x: 0.72, y: -0.69 };   // 无 Boss 时固定朝右上
  }

  // 进图 + 屏蔽既有演出，只留 Boss 登场那一刻
  function prepare() {
    stop();
    if (W.Cutscene) W.Cutscene.available = function () { return false; };  // 屏蔽 houshan 进图序章
    if (FR.muteStory) FR.muteStory(true);                                   // 屏蔽 checkStory / 际遇
    if (W.STORY) for (var i = 0; i < W.STORY.length; i++) W.STORY[i].done = true;
    FR.enterMap('houshan', 'easy');
    FR.setTime(110);                                                        // houshan bossAt = 110
    return true;
  }

  function play(opt) {
    opt = opt || {};
    stop();
    P.dur = Math.max(0.2, Math.min(3, opt.dur == null ? 0.8 : opt.dur));
    P.amp = opt.amp == null ? 110 : opt.amp;
    P.dir = opt.dir || pickDir();
    P.boss = !!(G.boss);
    install();
    P.active = true; P.paused = !!opt.paused; P.t = 0; P.lastT = 0;
    syncProj();
    P.raf = requestAnimationFrame(frame);
    return true;
  }

  // 实拍用：定格到任意时刻，不依赖真实墙钟
  function seek(t) {
    if (!P.active) return false;
    P.paused = true;
    P.t = Math.max(0, Math.min(P.dur, t));
    syncProj();
    return true;
  }

  W.__BOSS_BEAT__ = {
    prepare: prepare,
    play: play,
    seek: seek,
    stop: stop,
    camera: function () { return { x: P.proj.x, y: P.proj.y }; },
    state: function () {
      return {
        active: P.active, paused: P.paused, t: +P.t.toFixed(3), dur: P.dur,
        amp: P.amp, offset: { x: +P.offset.x.toFixed(1), y: +P.offset.y.toFixed(1) },
        proj: { x: +P.proj.x.toFixed(1), y: +P.proj.y.toFixed(1) },
        real: P.real ? { x: +P.real.x.toFixed(1), y: +P.real.y.toFixed(1) } : null,
        gameCam: { x: +G.cam.x.toFixed(1), y: +G.cam.y.toFixed(1) },
        overridden: !!P.proxy && G.cam === P.proxy,
        gameState: G.state, boss: !!(G.boss), mapId: G.mapId,
        enemies: G.enemies ? G.enemies.length : -1
      };
    }
  };
})();
