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
  // 山脊线放在画幅下三分之一，印章浮在它上面 —— 卷是「山水为底、印为记」，不是「框里放字」。
  // 水墨的山是「一片淡淡化开的墨」，不是一根线，也不是一块实色。
  // 所以每层山都用「上浓下透」的线性渐变填面：ridge 处最浓，落到底已经化没了 ——
  // 既不会像线描那样细到看不见，也不会像纯色块那样变成一堵墙。
  function washDef(k) {
    return '<defs><linearGradient id="atw' + k + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" class="at-ws1"/><stop offset="0.72" class="at-ws2"/><stop offset="1" class="at-ws0"/>' +
      '</linearGradient></defs>';
  }
  function landscape(k, w, h) {
    const rnd = (i) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
    const baseY = h * 0.60;
    const fill = 'url(#atw' + k + ')';
    let s = '';
    if (k === 0) {
      // 人界：三重山脊（远淡近浓），山脚一条水
      for (let layer = 0; layer < 3; layer++) {
        const base = baseY + layer * 30;
        const amp = 158 - layer * 34;
        let d = '';
        for (let x = 0; x <= w + 64; x += 64) {
          const peak = base - (0.30 + rnd(layer * 97 + x) * 0.70) * amp;
          d += (x === 0 ? 'M0,' : ' L' + x + ',') + peak.toFixed(1);
        }
        d += ' L' + w + ',' + (h + 10) + ' L0,' + (h + 10) + ' Z';
        s += '<path class="at-wash" d="' + d + '" fill="' + fill + '" opacity="' + (0.55 - layer * 0.16).toFixed(2) + '"/>';
        s += '<path class="at-hill at-h' + (layer + 1) + '" d="' + d.split(' L' + w + ',' + (h + 10))[0] + '"/>';
      }
      for (let i = 0; i < 6; i++) {
        const bx = 50 + rnd(i + 41) * (w - 100), by = h * 0.14 + rnd(i + 67) * h * 0.34;
        s += '<path class="at-bird" d="M' + bx.toFixed(0) + ',' + by.toFixed(0) +
          ' q7,-8 14,0 q7,-8 14,0"/>';
      }
      s += '<path class="at-water" d="M0,' + (baseY + 16).toFixed(0) +
        ' Q' + (w * 0.24).toFixed(0) + ',' + (baseY - 14).toFixed(0) + ' ' + (w * 0.48).toFixed(0) + ',' + (baseY + 10).toFixed(0) +
        ' T' + w + ',' + (baseY - 2).toFixed(0) + '"/>';
    } else if (k === 1) {
      // 灵界：浮岛 —— 上头一块平，下头几笔碎岩，散在云里
      for (let i = 0; i < 12; i++) {
        const cx = 30 + rnd(i + 3) * (w - 60);
        const cy = h * 0.14 + rnd(i + 17) * h * 0.50;
        const rw = 40 + rnd(i + 29) * 78;
        s += '<g class="at-isle"><ellipse cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" rx="' + rw.toFixed(0) + '" ry="' + (rw * 0.26).toFixed(0) + '"/>' +
          '<path d="M' + (cx - rw * 0.62).toFixed(0) + ',' + (cy + rw * 0.12).toFixed(0) +
          ' L' + (cx - rw * 0.2).toFixed(0) + ',' + (cy + rw * 0.78).toFixed(0) +
          ' L' + (cx + rw * 0.3).toFixed(0) + ',' + (cy + rw * 0.2).toFixed(0) + ' Z"/></g>';
      }
      for (let i = 0; i < 5; i++) {
        const cy = h * 0.12 + i * h * 0.16;
        s += '<path class="at-cloud" d="M0,' + cy.toFixed(0) + ' Q' + (w * 0.25).toFixed(0) + ',' + (cy - 22).toFixed(0) + ' ' + (w * 0.5).toFixed(0) + ',' + (cy + 6).toFixed(0) +
          ' T' + w + ',' + (cy - 10).toFixed(0) + '"/>';
      }
      // 底下一片云海
      let d2 = 'M0,' + (baseY + 40).toFixed(0);
      for (let x = 0; x <= w + 80; x += 80) {
        d2 += ' Q' + (x + 40) + ',' + (baseY + 10 + rnd(x) * 30).toFixed(0) + ' ' + (x + 80) + ',' + (baseY + 40).toFixed(0);
      }
      d2 += ' L' + w + ',' + (h + 10) + ' L0,' + (h + 10) + ' Z';
      s += '<path class="at-wash" d="' + d2 + '" fill="' + fill + '" opacity="0.30"/>';
    } else {
      // 仙界：星野 + 一轮淡日 + 底下翻起的云海
      let dots = '';
      for (let i = 0; i < 70; i++) {
        const cx = rnd(i + 5) * w, cy = rnd(i + 51) * h * 0.88, r = 0.7 + rnd(i + 91) * 1.7;
        dots += '<circle cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" r="' + r.toFixed(1) + '"/>';
      }
      s += '<g class="at-stars">' + dots + '</g>';
      for (let i = 0; i < 3; i++) {
        const bx = 40 + rnd(i + 71) * (w - 80), by = h * 0.6 + rnd(i + 83) * h * 0.2;
        s += '<path class="at-bird" d="M' + bx.toFixed(0) + ',' + by.toFixed(0) + ' q7,-8 14,0 q7,-8 14,0"/>';
      }
      s += '<circle class="at-sun" cx="' + (w * 0.52).toFixed(0) + '" cy="' + (h * 0.3).toFixed(0) + '" r="' + (Math.min(w, h) * 0.15).toFixed(0) + '"/>';
      let d3 = 'M0,' + (baseY + 44).toFixed(0);
      for (let x = 0; x <= w + 90; x += 90) {
        d3 += ' Q' + (x + 45) + ',' + (baseY + 6 + rnd(x + 7) * 36).toFixed(0) + ' ' + (x + 90) + ',' + (baseY + 44).toFixed(0);
      }
      d3 += ' L' + w + ',' + (h + 10) + ' L0,' + (h + 10) + ' Z';
      s += '<path class="at-wash" d="' + d3 + '" fill="' + fill + '" opacity="0.34"/>';
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
      // 一枚印章 60 宽、左右至少留 8 的空，所以每处 46 步进是下限；
      // 段宽取 max(460, 96 + n*46) —— 长卷本来就该长，挤在一起就成表格了。
      const wSeg = Math.max(460, 96 + list.length * 46);
      const items = list.map((m, i) => {
        const r = hash(m.id);
        return {
          m: m,
          x: 40 + (i + 0.5) * ((wSeg - 80) / Math.max(1, list.length)),
          // 纵向铺满整幅（从题头下方到山脚之前）：印章本来就该落在山水之间，
          // 只挤在顶上那条带，下半幅会空成一张白纸。
          y: h * 0.15 + ((r % 1000) / 1000) * Math.max(60, h * 0.66)
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
