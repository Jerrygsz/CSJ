/* 凡人·长生劫 —— pixelfx 适配层
 *
 * 上游 pixelfx（https://github.com/patch-gg/pixelfx, MIT）是一套「用代码画像素特效」的库：
 * 每帧往两个缓冲写像素 —— color（实心像素）与 light（加法发光），最后合成一张 RGBA。
 * 它的渲染模型正是我们缺的（种子化随机、有序抖动淡出、per-effect 调色板），所以接入，但不照搬：
 *
 * 三处必须改，否则接进来就是「拼凑感」——
 *   1. 加法光一律关掉（light: 0）。上游是暗场游戏，光越亮越好看；我们打斗在宣纸白底上，
 *      加法光往白里加，等于加了个寂寞。改由调色板的最暗几档自己承担轮廓。
 *   2. 调色板全部重映射到本作色阶（墨青 / 鎏金 / 血 / 魔紫），不沿用它的紫蓝原色。
 *   3. 尺寸按特效单独定档（1x 原生），不做整体缩放 —— 缩放会破坏像素网格。
 *
 * 用法（全部在世界坐标下，须在 ctx 已经 translate(-cam) 之后调用）：
 *   FX3.spawn('hit', x, y, { pal: 'jin', flip: true, seed: 7 });
 *   FX3.update(dt);
 *   FX3.draw(ctx);            // 角色之后、UI 之前
 */
(function () {
  'use strict';
  const PF = window.PixelFX;
  if (!PF) { console.warn('[fxpix] bundle 未加载'); window.FX3 = { spawn(){}, update(){}, draw(){}, count(){return 0;} }; return; }
  const { createFrame, clearFrame, createFx, composite } = PF;

  // 每套色阶 6 档，从最暗到最亮。最暗两档负责轮廓 —— 保证在宣纸白底上还有边。
  const PAL = {
    qi:  ['#16262b', '#20434b', '#2f6f78', '#4e9fa6', '#93d6d3', '#f2fffd'], // 身法 / 灵力（青）
    jin: ['#2a1c06', '#5c3a0d', '#96651a', '#d0a03a', '#f4dfa6', '#fffdf2'], // 命中 / 金
    xue: ['#2a0510', '#5c0a1c', '#a3142a', '#d8352c', '#ff8a3c', '#ffe6a8'], // 暴击 / 受创
    mo:  ['#150e1c', '#2a1a36', '#472a5e', '#7a3f96', '#bb7ad8', '#f2dcff'], // 魔道
  };

  const REG = {
    hit:    PF.fx.hitSpark,
    crit:   PF.fx.critHit,
    rune:   PF.fx.runeCircle,
    nova:   PF.fx.manaBurst,
    poof:   PF.fx.poof,
    pickup: PF.fx.collectBurst,
  };

  const MAX_LIVE = 6;      // 同屏上限：超了先砍最老的，避免一场 Boss 战叠出几十个离屏画布
  const live = [];
  const pool = new Map();   // key -> [{frame,img,cv,ctx}] 复用，避免每发一次特效就新建画布

  // 皮肤联动：水墨皮开启时，六档色阶全部过一遍 game.js 的砍色规则（朱砂 / 赭石 / 花青 / 墨阶），
  // 否则白纸上会浮出一堆彩珠。按皮肤缓存，切皮只算一次。
  let palCache = { skin: null, map: {} };
  function ramp(name) {
    const skin = window.SKIN_INK ? 'guigu' : 'jin';
    if (palCache.skin !== skin) palCache = { skin, map: {} };
    let r = palCache.map[name];
    if (!r) {
      const base = PAL[name] || PAL.qi;
      r = palCache.map[name] = (skin === 'guigu' && window.INK_HEX) ? base.map(window.INK_HEX) : base.slice();
    }
    return r;
  }

  function borrow(key) {
    const mod = REG[key];
    const [w, h] = mod.meta.size;
    const arr = pool.get(key) || pool.set(key, []).get(key);
    const it = arr.pop();
    if (it) return it;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return { frame: createFrame(w, h, 0, 0), img: new ImageData(w, h), cv, c2d: cv.getContext('2d') };
  }

  function spawn(key, x, y, o) {
    o = o || {};
    const mod = REG[key];
    if (!mod) return null;
    if (live.length >= MAX_LIVE) live.shift();     // 最老的直接丢弃（它的画布不放回池，交给 GC）
    const slot = borrow(key);
    const [w, h] = mod.meta.size;
    const fx = createFx(mod, {
      x: mod.meta.origin[0], y: mod.meta.origin[1],   // 把特效原点摆在框内对应位置
      flip: !!o.flip,
      seed: o.seed ?? ((Math.random() * 997) | 0),
      palette: ramp(o.pal || 'qi'),
      light: 0,                                        // 见文件头第 1 条：宣纸底不要加法光
      ...(o.opts || {}),
    });
    const inst = { key, mod, fx, slot, w, h, x, y, ox: mod.meta.origin[0], oy: mod.meta.origin[1], scale: o.scale || 1 };
    live.push(inst);
    return inst;
  }

  let lastT = 0;
  function update(dt) {
    dt = Math.min(0.05, dt || 0);
    for (let i = live.length - 1; i >= 0; i--) {
      const it = live[i];
      if (it.follow) { const q = it.follow(); if (q) { it.x = q.x; it.y = q.y; } }
      it.fx.update(dt);
      if (it.fx.done()) { pool.get(it.key).push(it.slot); live.splice(i, 1); continue; }
      // 上游特效本身就是按 30fps 画的，没必要 60fps 重画一遍 —— 只有帧号变了才重建像素。
      // 这一条直接把同屏特效的合成开销砍掉一半（实测 10 实例 6.1ms → 3ms 量级）。
      const fps = it.mod.meta.fps || 30;
      const idx = Math.floor(it.fx.t * fps);
      if (idx === it.frameIdx) continue;
      it.frameIdx = idx;
      const { frame, img, cv, c2d } = it.slot;
      clearFrame(frame);
      it.fx.draw(frame, 'back');
      it.fx.draw(frame, 'front');
      composite(frame, img.data, null);
      c2d.putImageData(img, 0, 0);
    }
  }

  // holdAlpha：常驻特效（hold 出来的领域法阵）在浅宣纸上单独压一档 —— 那圈像素符文
  // 在白纸上比墨景还跳；一次性特效（命中 / 暴击 / 拾取）仍是原强度，玩法反馈不能一起抹掉。
  // 由 game.js 的 render() 传入，缺省 1 = 逐字节保持旧行为。
  function draw(ctx, holdAlpha) {
    if (!live.length) return;
    const ha = (typeof holdAlpha === 'number') ? Math.max(0, Math.min(1, holdAlpha)) : 1;
    // 像素放大一律最近邻：插值会把像素网格糊掉，整套就白做了
    const smooth = ctx.imageSmoothingEnabled;
    const prevA = ctx.globalAlpha;
    ctx.imageSmoothingEnabled = false;
    for (const it of live) {
      const s = it.scale;
      ctx.globalAlpha = it.tag ? prevA * ha : prevA;
      ctx.drawImage(it.slot.cv, it.x - it.ox * s, it.y - it.oy * s, it.w * s, it.h * s);
    }
    ctx.globalAlpha = prevA;
    ctx.imageSmoothingEnabled = smooth;
  }

  /** 以世界坐标 (x,y) 为原点画：调用前自己 translate。 */
  function drawAt(ctx, x, y) { if (!live.length) return; ctx.save(); ctx.translate(x, y); draw(ctx); ctx.restore(); }

  /**
   * 常驻特效（领域 / 环绕这类「只要功法开着就一直亮」的）：同一个 tag 只保留一个实例，
   * 每帧按 follow() 取当前位置跟着走；功法卸下或失效时调用 release(tag)。
   */
  function hold(tag, key, follow, o) {
    let it = live.find(x => x.tag === tag);
    if (it) { it.follow = follow; return it; }
    it = spawn(key, follow().x, follow().y, o);
    if (it) { it.tag = tag; it.follow = follow; }
    return it;
  }
  function release(tag) {
    for (let i = live.length - 1; i >= 0; i--) {
      if (live[i].tag !== tag) continue;
      const it = live[i];
      const a = pool.get(it.key); if (a) a.push(it.slot);
      live.splice(i, 1);
    }
  }

  /** 清空全部活动特效（切图 / 重生 / 截图自检用）。 */
  function clear() {
    for (const it of live) { const a = pool.get(it.key); if (a) a.push(it.slot); }
    live.length = 0;
  }

  window.FX3 = { spawn, update, draw, drawAt, hold, release, clear, count: () => live.length, PAL };
})();
