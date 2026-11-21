/* =========================================================================
 * js/atlas.js — 三界舆图（手绘长卷）
 * -------------------------------------------------------------------------
 * 为什么是这个形态：前三次做的是「大板块三层横排」的流程图 —— 十一个大境界
 * 各占一格、格与格之间连线，换个皮还是组织架构图。舆图不是结构图：
 * 它该像一张摊开的长卷，人在上头找「我到哪儿了、前面还有多远」。
 *
 * 所以这一版：
 *   · 一条横向长卷，人界 / 灵界 / 仙界三段首尾相接（不是上下三行）；
 *   · 每段各有一层山水：人界是三重山脊与一条水，灵界是浮岛与云，仙界是星野与淡日；
 *   · 一个地点 = 一枚印章，按行脚顺序落在山水间，纵向高度随手（不排队）；
 *   · 全卷不画一根连线 —— 顺序由左右位置与印章浓淡表达，不靠箭头；
 *   · 左右拖动阅读，点印章在底部看这一处的名号、方位与状态。
 *
 * 数据只读 MAPS（order / name / pos / type / startLevel / side）与存档状态，
 * 不改 game 的任何东西 —— 它是「看」的地方，不是「操作」的地方。
 * ========================================================================= */
window.Atlas = (function () {
  'use strict';

  // 三界的界线按境界层数切：炼虚（150）起入灵界，金仙（420）起入仙界。
  // 用层数而不是地图 id 名单：以后往中间插图，这一段不用跟着改。
  const SEGS = [
    { key: 'ren', name: '人界', sub: '炼气 → 化神', max: 150 },
    { key: 'ling', name: '灵界', sub: '炼虚 → 真仙', max: 420 },
    { key: 'xian', name: '仙界', sub: '金仙 → 道祖', max: 1e9 }
  ];

  let host = null;      // 整块 overlay
  let view = null;      // 横向滚动区
  let scroll = null;    // 长卷本体
  let foot = null;      // 底部详情
  let statLine = null;
  let built = false;
  let state = null;     // 最近一次 open 传进来的快照
  let picked = null;    // 当前点开的印章 id

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  // 稳定的伪随机：同一张图每次打开都落在同一个位置（否则第二次进来全图都挪了位，像另一张图）
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }
  function segOf(m) {
    const lv = m.startLevel || 1;
    return lv < SEGS[0].max ? 0 : (lv < SEGS[1].max ? 1 : 2);
  }
  function mapsOf(k) {
    return (window.MAPS || [])
      .filter(m => !m.cinematic && segOf(m) === k)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // ---------- 山水：三段各画自己的地势 ----------
  // 全部用 SVG 路径现算，不引素材；浓淡交给 CSS 变量，两套皮肤各自用自己的墨色。
  // 一条经验（改了四版才定）：**线是骨架、面只是衬底**。
  // 面画浓了会变成一堵横贯画面的色块（第一版像墙），线画淡了又细到看不见（第二版全白）——
  // 所以山脊线用实描边走到 1.6~2.4px，渐变填面压到 0.10~0.30，让人先看见山形，再感觉到墨。
  function washDef(k) {
    return '<defs><linearGradient id="atw' + k + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" class="at-ws1"/><stop offset="0.68" class="at-ws2"/><stop offset="1" class="at-ws0"/>' +
      '</linearGradient></defs>';
  }
  // 一道山脊：尖峰 + 圆谷，峰距与峰高都不均。
  // 早先写成等距折线，出来是一排三角波（像示波器不像山）——山要的是「主峰高、次峰矮、谷是圆的」。
  function ridge(w, h, base, amp, seed) {
    let line = 'M-24,' + base.toFixed(1);
    let x = -24, i = 0;
    while (x < w + 60) {
      const span = 132 + seedRand(seed, i * 5) * 122;                 // 一峰的跨度 132~254
      const px = x + span * 0.42;
      const py = base - (0.32 + seedRand(seed, i * 5 + 1) * 0.68) * amp;  // 峰高 0.32~1.00
      const vx = x + span;
      const vy = base - seedRand(seed, i * 5 + 2) * 0.16 * amp;       // 谷不落到底，留着起伏
      line += ' L' + px.toFixed(1) + ',' + py.toFixed(1);             // 峰：尖
      line += ' C' + (px + span * 0.20).toFixed(1) + ',' + vy.toFixed(1) +
        ' ' + (vx - span * 0.22).toFixed(1) + ',' + vy.toFixed(1) +
        ' ' + vx.toFixed(1) + ',' + vy.toFixed(1);                    // 谷：圆
      x = vx; i++;
    }
    // 面只填到山脚下一小段就收，不拉到画幅底部：
    // 三层山各自成为一条「山脉带」，带与带之间留白 —— 水墨画就是靠留白分远近的，
    // 三块实色一路拉到底只会糊成一片。
    const foot = base + Math.max(64, amp * 0.56);
    return { line: line, face: line + ' L' + (w + 60) + ',' + foot.toFixed(1) + ' L-24,' + foot.toFixed(1) + ' Z' };
  }
  // 稳定的伪随机（与 hash 分开：这里要的是「同一段每次画得一样」，不是「同一个 id 一样」）
  function seedRand(seed, i) {
    const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  function landscape(k, w, h) {
    const rnd = (i) => seedRand(k * 7 + 1, i);
    const fill = 'url(#atw' + k + ')';
    let s = '';
    if (k === 0) {
      // 人界：三重山脊（远淡近浓）+ 山脚一条水 + 几只飞鸟
      // 山要占住画面上半部：base 从 0.44 起、amp 逐层加大 —— 全压在下半幅会留下半屏空黑。
      for (let layer = 0; layer < 3; layer++) {
        const base = h * (0.44 + layer * 0.14);
        const amp = 122 + layer * 46;
        const R = ridge(w, h, base, amp, layer + 1);
        // 三层浓度必须拉开（0.26 / 0.50 / 0.62）：等差递减出来的三块几乎同色，
        // 叠在一起就成了一整片灰，远近全靠浓淡说话。近景也不给满 ——
        // 水墨的底子是纸，山压太实就把纸吃掉了。
        const op = [0.26, 0.50, 0.62][layer];
        s += '<path class="at-wash" d="' + R.face + '" fill="' + fill + '" opacity="' + op + '"/>';
        s += '<path class="at-hill at-h' + (layer + 1) + '" d="' + R.line + '"/>';
      }
      // 水：不横贯整幅（那样像一根电线穿过山腰），只在近景山脚下游走，另配几笔碎波
      const wy = h * 0.80;
      s += '<path class="at-water" d="M-10,' + wy.toFixed(0) +
        ' Q' + (w * 0.16).toFixed(0) + ',' + (wy - 26).toFixed(0) + ' ' + (w * 0.34).toFixed(0) + ',' + (wy + 4).toFixed(0) +
        ' T' + (w * 0.68).toFixed(0) + ',' + (wy - 16).toFixed(0) +
        ' T' + (w + 10) + ',' + (wy + 6).toFixed(0) + '"/>';
      // 水与飞鸟也按屏铺：段长四千多，只画七道波纹、九只鸟，一屏里摊不到一处
      const b0 = Math.max(1, Math.round(w / 600)), per0 = w / b0;
      for (let bi = 0; bi < b0; bi++) {
        for (let i = 0; i < 3; i++) {
          const wx = per0 * bi + rnd(bi * 17 + i + 11) * per0 * 0.9, wyy = wy - 34 + rnd(bi * 23 + i + 23) * 52;
          const ww = 16 + rnd(bi * 31 + i + 37) * 26;
          s += '<path class="at-ripple" d="M' + wx.toFixed(0) + ',' + wyy.toFixed(0) +
            ' q' + (ww * 0.5).toFixed(0) + ',-6 ' + ww.toFixed(0) + ',0"/>';
        }
        for (let i = 0; i < 3; i++) {
          const bx = per0 * bi + 20 + rnd(bi * 43 + i + 41) * (per0 - 60), by = h * 0.12 + rnd(bi * 59 + i + 67) * h * 0.26;
          s += '<path class="at-bird" d="M' + bx.toFixed(0) + ',' + by.toFixed(0) +
            ' q7,-8 14,0 q7,-8 14,0"/>';
        }
      }
    } else if (k === 1) {
      // 灵界：云海之上几重若隐若现的远峰。
      // 原本想画「浮岛」，试了三版都不行——椭圆+倒三角像漏斗、圆拱+斜切像扁帽、
      // 深锥像倒扣的碗。浮岛是侧视立体，塞进一条扁长的横卷里必然走形。
      // 改用「云海 + 露头的峰尖」：这是水墨画里最稳的灵界意象，也与人界的三重山脊分得开
      // （人界是实山近景，灵界是远景+大量留白云气）。
      for (let layer = 0; layer < 2; layer++) {
        const base = h * (0.56 + layer * 0.12);
        const amp = 150 + layer * 56;
        const R = ridge(w, h, base, amp, layer + 11);
        s += '<path class="at-wash" d="' + R.face + '" fill="' + fill + '" opacity="' + (layer ? 0.46 : 0.28) + '"/>';
        s += '<path class="at-hill at-h' + (layer ? 2 : 1) + '" d="' + R.line + '"/>';
      }
      // 云海：三层横带压住山脚，越往下越淡；再补几缕横云浮在半空
      const cop = [0.50, 0.32, 0.18];
      for (let layer = 0; layer < 3; layer++) {
        const by = h * (0.62 + layer * 0.11);
        let dd = 'M-24,' + by.toFixed(0);
        for (let x = -24; x <= w + 48; x += 96) {
          dd += ' Q' + (x + 48) + ',' + (by - 16 - rnd(x + layer * 19) * 18).toFixed(0) + ' ' + (x + 96) + ',' + by.toFixed(0);
        }
        s += '<path class="at-wash" d="' + dd + ' L' + (w + 48) + ',' + (h + 12) + ' L-24,' + (h + 12) + ' Z" fill="' + fill + '" opacity="' + cop[layer] + '"/>';
        s += '<path class="at-cloud" d="' + dd + '"/>';
      }
      const b1 = Math.max(1, Math.round(w / 640)), per1 = w / b1;
      for (let bi = 0; bi < b1; bi++) for (let i = 0; i < 2; i++) {
        const cx = per1 * bi + 30 + rnd(bi * 17 + i + 61) * (per1 - 140), cy = h * 0.14 + rnd(bi * 29 + i + 79) * h * 0.32;
        const cw = 90 + rnd(bi * 37 + i + 97) * 90;
        s += '<path class="at-cloud" d="M' + cx.toFixed(0) + ',' + cy.toFixed(0) +
          ' q' + (cw * 0.3).toFixed(0) + ',-14 ' + (cw * 0.55).toFixed(0) + ',-2 q' + (cw * 0.2).toFixed(0) + ',8 ' + (cw * 0.45).toFixed(0) + ',2"/>';
      }
    } else {
      // 仙界：星野 + 淡日 + 云海。
      // 装饰必须按「每屏一份」铺：段宽两千多像素、视口只有四百，整段只画一个太阳的话，
      // 滚到别处就是一片纯黑的空屏（第一版就是这样，看起来像是坏了）。
      const bandW = 660;
      const bands = Math.max(1, Math.round(w / bandW));
      const per = w / bands;
      let dots = '', suns = '';
      for (let b = 0; b < bands; b++) {
        const ox = per * b;
        const sx = ox + per * (0.34 + rnd(b + 5) * 0.32);
        const sy = h * (b % 2 ? 0.30 : 0.20);
        suns += '<circle class="at-sun" cx="' + sx.toFixed(0) + '" cy="' + sy.toFixed(0) + '" r="' + (Math.min(per, h) * 0.11).toFixed(0) + '"/>';
        for (let i = 0; i < 46; i++) {
          const cx = ox + rnd(b * 71 + i + 5) * per, cy = rnd(b * 97 + i + 51) * h * 0.56, r = 0.7 + rnd(b * 13 + i + 91) * 1.8;
          dots += '<circle cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" r="' + r.toFixed(1) + '"/>';
        }
      }
      s += '<g class="at-stars">' + dots + '</g>' + suns;
      for (let layer = 0; layer < 3; layer++) {
        const by = h * (0.60 + layer * 0.12);
        let dd = 'M-24,' + by.toFixed(0);
        for (let x = -24; x <= w + 48; x += 96) {
          dd += ' Q' + (x + 48) + ',' + (by - 26 - rnd(x + 7 + layer * 23) * 26).toFixed(0) + ' ' + (x + 96) + ',' + by.toFixed(0);
        }
        s += '<path class="at-wash" d="' + dd + ' L' + (w + 48) + ',' + (h + 12) + ' L-24,' + (h + 12) + ' Z" fill="' + fill + '" opacity="' + [0.62, 0.42, 0.26][layer].toFixed(2) + '"/>';
        s += '<path class="at-cloud" d="' + dd + '"/>';
      }
      for (let i = 0; i < 3; i++) {
        const bx = 40 + rnd(i + 71) * (w - 80), by = h * 0.52 + rnd(i + 83) * h * 0.1;
        s += '<path class="at-bird" d="M' + bx.toFixed(0) + ',' + by.toFixed(0) + ' q7,-8 14,0 q7,-8 14,0"/>';
      }
    }
    return washDef(k) + s;
  }

  // ---------- 建 DOM（只建一次）----------
  function build() {
    if (built) return;
    built = true;
    host = document.createElement('div');
    host.id = 'atlas';
    host.className = 'overlay atlas';
    host.innerHTML =
      '<div class="at-head">' +
      '<div class="at-title"><h2>三界舆图</h2><p class="at-stat" id="atStat"></p></div>' +
      '<button id="atClose" class="btn small">合卷</button>' +
      '</div>' +
      '<div class="at-view" id="atView"><div class="at-scroll" id="atScroll"></div></div>' +
      '<div class="at-foot" id="atFoot"><div class="at-foot-in"><b>点一枚印章</b><i>看看这一处在原著里是什么地方，走到没有。　朱砂已了 · 金边可往 · 虚框未至。</i></div></div>';
    // 必须挂进 #stage：整个界面的逻辑坐标（480×N）与缩放都在那一层上，
    // 挂到 body 上会得到一块「不随舞台缩放」的浮层，字号与其它面板对不上。
    const mount = document.getElementById('stage') || document.body;
    mount.appendChild(host);
    view = host.querySelector('#atView');
    scroll = host.querySelector('#atScroll');
    foot = host.querySelector('#atFoot');
    statLine = host.querySelector('#atStat');
    host.querySelector('#atClose').addEventListener('click', close);
    // 拖动：指针事件统一处理鼠标与手指
    let dragging = false, sx = 0, sl = 0, moved = 0;
    view.addEventListener('pointerdown', (e) => {
      dragging = true; moved = 0; sx = e.clientX; sl = view.scrollLeft;
      view.classList.add('drag');
    });
    view.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 6) moved = 1;
      view.scrollLeft = sl - dx;
    });
    const up = () => { dragging = false; view.classList.remove('drag'); };
    view.addEventListener('pointerup', up);
    view.addEventListener('pointercancel', up);
    view.addEventListener('pointerleave', up);
    // 拖动之后紧接着的那一次 click 不该顺带点开印章
    view.addEventListener('click', (e) => {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = 0; }
    }, true);
    view.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('.at-seal') : null;
      if (!b) return;
      picked = b.getAttribute('data-id');
      render(state);
    });
  }

  // ---------- 排布：把一处地点算成 (x, y) ----------
  function layout(w, h) {
    const segs = SEGS.map((s, k) => {
      const list = mapsOf(k);
      // 一枚印章 56 宽，左右至少留 10 的空；每处 52 步进是「能压着一点、但不叠死」的下限。
      // 段宽取 max(520, 110 + n*52) —— 长卷本来就该长，挤在一起就成表格了。
      const wSeg = Math.max(520, 110 + list.length * 52);
      const step = (wSeg - 90) / Math.max(1, list.length);
      const items = list.map((m, i) => {
        const r = hash(m.id);
        // 横向也给一点手摆的错落：完全等距排下来，一眼就是表格而不是卷。
        // 抖动幅度压在 ±0.30 步进 —— 再大就会让相邻两枚压在一起看不清字。
        const jx = ((hash(m.id + '#x') % 1000) / 1000 - 0.5) * step * 0.60;
        return {
          m: m,
          x: Math.min(wSeg - 30, Math.max(30, 45 + step * (i + 0.5) + jx)),
          // 纵向铺满整幅（从题头下方到山脚之前）：印章本来就该落在山水之间，
          // 只挤在顶上那条带，下半幅会空成一张白纸。
          y: h * 0.13 + ((r % 1000) / 1000) * Math.max(60, h * 0.70)
        };
      });
      return { k: k, meta: s, list: list, w: wSeg, items: items };
    });
    let acc = 0;
    for (const s of segs) { s.x0 = acc; acc += s.w; }
    return { segs: segs, total: acc };
  }

  function render(st) {
    if (!built) build();
    state = st || state || {};
    const W = Math.max(320, view.clientWidth || 360);
    const H = Math.max(240, view.clientHeight || 480);
    const L = layout(W, H);
    const cleared = state.cleared || [], unlocked = state.unlocked || [];
    const cur = state.mapId || '';
    let html = '';
    for (const s of L.segs) {
      html += '<div class="at-seg at-seg-' + s.meta.key + '" style="left:' + s.x0 + 'px;width:' + s.w + 'px;height:' + H + 'px">' +
        '<svg viewBox="0 0 ' + s.w + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' + landscape(s.k, s.w, H) + '</svg>' +
        '<div class="at-wm" aria-hidden="true">' + s.meta.name + '</div>';
      for (const it of s.items) {
        const m = it.m;
        const done = cleared.indexOf(m.id) >= 0;
        const here = m.id === cur;
        const open = unlocked.indexOf(m.id) >= 0;
        const cls = 'at-seal' + (done ? ' done' : '') + (here ? ' cur' : '') + (open && !done ? ' open' : '') + (!open && !done ? ' locked' : '') + (picked === m.id ? ' picked' : '');
        const rot = ((hash(m.id) % 11) - 5);
        // 印面：去掉「七玄门·」这类前缀与括号补充，最多四字，两字一行 —— 这才是印章的样子。
        // 状态不再写进印面（四字两行已经把方寸占满），改用颜色与边框：
        // 朱砂=已了、金边=可往、虚框=未至、金环=此刻。底部的详情卡里另有白字。
        let nm = String(m.name);
        if (nm.indexOf('·') >= 0) nm = nm.split('·').pop();
        nm = nm.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '');
        const chars = Array.from(nm).slice(0, 4);
        const lines = chars.length <= 2 ? [chars.join('')] : [chars.slice(0, 2).join(''), chars.slice(2).join('')];
        html += '<button class="' + cls + '" data-id="' + m.id + '" title="' + esc(m.name) + '" ' +
          'style="left:' + it.x.toFixed(0) + 'px;top:' + it.y.toFixed(0) + 'px;transform:translate(-50%,-50%) rotate(' + rot + 'deg)">' +
          lines.map(l => '<b>' + esc(l) + '</b>').join('') +
          (here ? '<u>此刻</u>' : '') +
          '</button>';
      }
      html += '</div>';
      // 段与段之间只立一道界痕（细虚线），界名交给段首那块大水印 ——
      // 早先这里还竖写一遍界名，结果和水印在同一个位置重了一遍，读起来像两个标题。
      if (s.k < L.segs.length - 1) {
        html += '<div class="at-edge" style="left:' + (s.x0 + s.w) + 'px"></div>';
      }
    }
    scroll.style.width = (L.total + 26) + 'px';
    scroll.style.height = H + 'px';
    scroll.innerHTML = html;

    const n = (window.MAPS || []).filter(m => !m.cinematic).length;
    const dn = cleared.filter(id => (window.MAPS || []).some(m => m.id === id)).length;
    if (statLine) statLine.textContent = '共 ' + n + ' 处 · 已了 ' + dn + ' 处';
    if (picked) detail(picked);
    else if (foot) foot.innerHTML = '<div class="at-foot-in"><b>点一枚印章</b><i>看看这一处在原著里是什么地方，走到没有。　朱砂已了 · 金边可往 · 虚框未至。</i></div>';
  }

  function detail(id) {
    const m = (window.MAPS || []).find(x => x.id === id);
    if (!m || !foot) return;
    const st = state || {};
    const done = (st.cleared || []).indexOf(id) >= 0;
    const open = (st.unlocked || []).indexOf(id) >= 0;
    const kind = ({ story: '剧情', combat: '战斗', boss: '强敌', market: '坊市', chase: '追逃' }[m.type] || m.type || '去处');
    foot.innerHTML = '<div class="at-foot-in">' +
      '<b>' + esc(m.name) + '</b>' +
      '<span class="at-tag">' + kind + (m.side ? '·支线' : '') + '</span>' +
      '<span class="at-tag ' + (done ? 'ok' : (open ? 'on' : '')) + '">' + (done ? '已了' : (open ? '可往' : '未至')) + '</span>' +
      '<i>' + esc(m.pos || '') + (m.desc ? '　' + esc(m.desc) : '') + '</i>' +
      '</div>';
  }

  function open(st) {
    build();
    host.style.display = 'flex';
    host.classList.add('on');
    document.body.classList.add('atlas-open');
    const cur = (st && st.mapId) || '';
    picked = cur || null;
    render(st);
    // 打开时先落在「当前所在」附近：长卷七八千像素，从头翻太费事。
    // 注意必须排在 render 之后 —— render 会重写 innerHTML，scrollLeft 会被重置成 0。
    if (cur) {
      const L = layout(view.clientWidth || 360, view.clientHeight || 480);
      for (const s of L.segs) for (const it of s.items) {
        if (it.m.id === cur) {
          view.scrollLeft = Math.max(0, s.x0 + it.x - view.clientWidth / 2);
          return;
        }
      }
    }
    view.scrollLeft = 0;
  }
  function close() {
    if (!host) return;
    host.style.display = 'none';
    host.classList.remove('on');
    document.body.classList.remove('atlas-open');
  }
  function isOpen() { return !!(host && host.style.display === 'flex'); }

  // 转屏 / 改窗口：重新排一次（长卷的位置依赖视口尺寸）
  window.addEventListener('resize', function () { if (isOpen()) { const l = view.scrollLeft; render(state); view.scrollLeft = l; } });

  return { open: open, close: close, isOpen: isOpen, segs: SEGS };
})();
