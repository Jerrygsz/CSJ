/* 凡人·长生劫 —— 部署台
 * 机型预览 + 遮挡体检 + 快捷指令
 * 依赖游戏暴露的 window.__FR 调试接口 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const frame = $('frm');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---------------- 入口地址 ----------------
  const DEFAULT_CODE = 'NLXOJTX5AU';
  const FALLBACK_BASE = 'https://fanren-changshengjie.app.workbuddy.host/';
  const params = new URLSearchParams(location.search);
  const SHARE = params.get('sharecode') || DEFAULT_CODE;
  const isHttp = /^https?:$/.test(location.protocol);
  const dirPath = location.pathname.replace(/[^/]*$/, '');
  const BASE = isHttp ? location.origin + dirPath : FALLBACK_BASE;
  const GAME_URL = BASE + '?sharecode=' + SHARE;
  const DEPLOY_URL = BASE + 'deploy.html?sharecode=' + SHARE;

  // ---------------- 机型 ----------------
  const DEVICES = [
    { id: 'ip13', name: 'iPhone 13 / 14', short: '13 / 14', w: 390, h: 844, dpr: 3, notch: 'notch', safe: { top: 47, right: 0, bottom: 34, left: 0 } },
    { id: 'ip15pm', name: 'iPhone 15 Pro Max', short: '15 Pro Max', w: 430, h: 932, dpr: 3, notch: 'pill', safe: { top: 59, right: 0, bottom: 34, left: 0 } },
    { id: 'ipse', name: 'iPhone SE', short: 'SE', w: 375, h: 667, dpr: 2, notch: 'none', safe: { top: 0, right: 0, bottom: 0, left: 0 } },
    { id: 'pixel', name: 'Pixel 7', short: 'Pixel 7', w: 412, h: 915, dpr: 2.625, notch: 'punch', safe: { top: 24, right: 0, bottom: 0, left: 0 } },
    { id: 's23', name: '三星 Galaxy S23', short: 'S23', w: 360, h: 780, dpr: 3, notch: 'punch', safe: { top: 32, right: 0, bottom: 0, left: 0 } },
    { id: 'ipad', name: 'iPad mini', short: 'iPad mini', w: 744, h: 1133, dpr: 2, notch: 'none', safe: { top: 24, right: 0, bottom: 20, left: 0 } },
    { id: 'desk', name: '桌面 1280×720', short: '桌面', w: 1280, h: 720, dpr: 1, notch: 'none', safe: { top: 0, right: 0, bottom: 0, left: 0 } }
  ];

  const state = {
    dev: DEVICES[0],
    opt: { safe: true, mask: true, box: false, grid: false, slow: false },
    lastAudit: null,
    busy: false,
    qr: 'game'
  };

  // ---------------- 工具 ----------------
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1600);
  }
  function pill(el, text, cls) {
    el.textContent = text;
    el.className = 'pill' + (cls ? ' ' + cls : '');
  }
  /** 拿到 iframe 里的 __FR（同源才可用） */
  function api() {
    try {
      const w = frame.contentWindow;
      if (!w || !w.__FR) return null;
      return w.__FR;
    } catch (e) { return null; }
  }
  function doc() {
    try { return frame.contentDocument; } catch (e) { return null; }
  }
  function win() {
    try { return frame.contentWindow; } catch (e) { return null; }
  }

  // ---------------- 地址卡 ----------------
  function initAddress() {
    const url = state.qr === 'game' ? GAME_URL : DEPLOY_URL;
    $('qrImg').src = state.qr === 'game' ? 'img/qr-game.png' : 'img/qr-deploy.png';
    $('addrText').textContent = url;
    $('openBtn').href = state.qr === 'game' ? 'index.html' : 'deploy.html?sharecode=' + SHARE;
    $('playLink').href = 'index.html';
    $('qaLink').href = 'test.html?sharecode=' + SHARE;
    $('tipPlay').href = 'index.html';
  }

  $('qrSwitch').addEventListener('click', e => {
    const b = e.target.closest('[data-qr]');
    if (!b) return;
    state.qr = b.dataset.qr;
    [...$('qrSwitch').children].forEach(c => c.classList.toggle('active', c === b));
    initAddress();
  });

  $('copyBtn').addEventListener('click', async () => {
    const url = state.qr === 'game' ? GAME_URL : DEPLOY_URL;
    try {
      await navigator.clipboard.writeText(url);
      toast('链接已复制');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('链接已复制'); } catch (e2) { toast('复制失败，请手动选择'); }
      document.body.removeChild(ta);
    }
  });

  // ---------------- 机型切换 ----------------
  function renderChips() {
    const box = $('devTabs');
    box.innerHTML = '';
    DEVICES.forEach(d => {
      const b = document.createElement('button');
      b.className = 'chip' + (d.id === state.dev.id ? ' active' : '');
      b.textContent = d.short;
      b.dataset.dev = d.id;
      box.appendChild(b);
    });
  }
  $('devTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-dev]');
    if (!b) return;
    const d = DEVICES.find(x => x.id === b.dataset.dev);
    if (d) setDevice(d);
  });

  function setDevice(d, silent) {
    state.dev = d;
    const el = $('device');
    el.style.width = d.w + 'px';
    el.style.height = d.h + 'px';
    el.classList.toggle('rounded', d.w < 560);
    $('stageName').textContent = d.name;
    $('stageInfo').textContent = d.w + '×' + d.h + ' · DPR ' + d.dpr;
    $('devSize').textContent = d.w + '×' + d.h;
    $('cw').value = d.w; $('ch').value = d.h;
    renderChips();
    drawHardware();
    drawSafeGrid();
    injectSafe();
    fitDevice();
    clearBoxes();
    if (!silent) {
      state.lastAudit = null;
      $('auditTag').textContent = '未运行';
      $('report').innerHTML = '<p class="empty">已切到 ' + d.name + '。点「体检此机型」检查遮挡。</p>';
    }
    scheduleLive();
  }

  $('applyCustom').addEventListener('click', () => {
    const w = clamp(parseInt($('cw').value, 10) || 390, 240, 2000);
    const h = clamp(parseInt($('ch').value, 10) || 844, 320, 2400);
    setDevice({
      id: 'custom', name: '自定义 ' + w + '×' + h, short: '自定义',
      w, h, dpr: window.devicePixelRatio || 2, notch: 'none',
      safe: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    toast('已应用 ' + w + '×' + h);
  });

  // ---------------- 缩放适配 ----------------
  function fitDevice() {
    const box = $('stagebox'), el = $('device');
    const r = box.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const padX = 40, padY = 40;
    const s = Math.min((r.width - padX) / state.dev.w, (r.height - padY) / state.dev.h, 1);
    state.fit = clamp(s, 0.12, 1);
    el.style.transform = 'scale(' + state.fit.toFixed(4) + ')';
  }
  window.addEventListener('resize', () => { fitDevice(); });

  // ---------------- 硬件遮罩 ----------------
  function drawHardware() {
    const h = $('hardware');
    h.innerHTML = '';
    if (!state.opt.mask) return;
    const d = state.dev;
    if (d.notch === 'notch' || d.notch === 'pill') {
      const n = document.createElement('div');
      n.className = 'notch' + (d.notch === 'pill' ? ' pill' : '');
      n.style.width = (d.notch === 'pill' ? 124 : 158) + 'px';
      n.style.height = (d.notch === 'pill' ? 34 : 30) + 'px';
      h.appendChild(n);
    } else if (d.notch === 'punch') {
      const n = document.createElement('div');
      n.className = 'notch punch';
      n.style.width = '11px'; n.style.height = '11px';
      h.appendChild(n);
    }
    if (d.safe.bottom > 0) {
      const b = document.createElement('div');
      b.className = 'homebar';
      h.appendChild(b);
    }
  }

  // ---------------- 安全区参考线 ----------------
  function drawSafeGrid() {
    const g = $('safegrid');
    g.innerHTML = '';
    g.classList.toggle('on', state.opt.grid);
    if (!state.opt.grid) return;
    const s = state.opt.safe ? state.dev.safe : { top: 0, right: 0, bottom: 0, left: 0 };
    const d = state.dev;
    if (s.top) {
      const band = document.createElement('div');
      band.className = 'band';
      band.style.top = '0'; band.style.height = s.top + 'px';
      g.appendChild(band);
    }
    if (s.bottom) {
      const band = document.createElement('div');
      band.className = 'band';
      band.style.bottom = '0'; band.style.height = s.bottom + 'px';
      g.appendChild(band);
    }
    const lineTop = document.createElement('i');
    lineTop.className = 'h'; lineTop.style.top = s.top + 'px';
    g.appendChild(lineTop);
    const lineBot = document.createElement('i');
    lineBot.className = 'h'; lineBot.style.bottom = s.bottom + 'px';
    g.appendChild(lineBot);
    const lineL = document.createElement('i');
    lineL.className = 'v'; lineL.style.left = s.left + 'px';
    g.appendChild(lineL);
    const lineR = document.createElement('i');
    lineR.className = 'v'; lineR.style.right = s.right + 'px';
    g.appendChild(lineR);
  }

  // ---------------- 注入安全区 ----------------
  function injectSafe() {
    const d = doc(), w = win();
    if (!d || !w) return false;
    const s = state.opt.safe ? state.dev.safe : { top: 0, right: 0, bottom: 0, left: 0 };
    const st = d.documentElement.style;
    st.setProperty('--fr-safe-top', (s.top || 0) + 'px');
    st.setProperty('--fr-safe-right', (s.right || 0) + 'px');
    st.setProperty('--fr-safe-bottom', (s.bottom || 0) + 'px');
    st.setProperty('--fr-safe-left', (s.left || 0) + 'px');
    try {
      const F = w.__FR;
      if (F && F.view) w.dispatchEvent(new w.Event('resize'));
      else w.dispatchEvent(new w.Event('resize'));
    } catch (e) { /* 忽略 */ }
    return true;
  }

  // ---------------- 开关 ----------------
  function bindSwitch(id, key, after) {
    const el = $(id);
    el.addEventListener('change', () => {
      state.opt[key] = el.checked;
      if (after) after();
    });
  }
  bindSwitch('optSafe', 'safe', () => { injectSafe(); drawSafeGrid(); fitDevice(); });
  bindSwitch('optMask', 'mask', drawHardware);
  bindSwitch('optBox', 'box', () => { if (!state.opt.box) clearBoxes(); else if (state.lastAudit) drawBoxes(state.lastAudit.flat); });
  bindSwitch('optGrid', 'grid', drawSafeGrid);
  bindSwitch('optSlow', 'slow', () => {
    const F = api();
    if (F && F.timeScale) { F.timeScale(state.opt.slow ? 0.35 : 1); toast(state.opt.slow ? '慢放 0.35×' : '恢复正常速度'); }
  });

  // ---------------- iframe 就绪 ----------------
  function waitReady(timeout) {
    const t0 = Date.now();
    return new Promise(resolve => {
      const tick = () => {
        const F = api();
        const d = doc();
        if (F && d && d.readyState !== 'loading') return resolve(true);
        if (Date.now() - t0 > (timeout || 6000)) return resolve(false);
        setTimeout(tick, 60);
      };
      tick();
    });
  }

  frame.addEventListener('load', async () => {
    await waitReady(6000);
    injectSafe();
    fitDevice();
    updateEnv();
    scheduleLive();
  });

  function updateEnv() {
    const F = api();
    if (!isHttp) {
      pill($('envPill'), 'file:// 无法读取内页', 'err');
      $('envPill').title = '请用线上地址或本地 http 服务打开本页，才能读取 iframe 内部尺寸';
    } else if (!F) {
      pill($('envPill'), '游戏未就绪', 'warn');
    } else {
      pill($('envPill'), '已连接 · ' + SHARE, 'ok');
    }
  }

  // ---------------- 场景 ----------------
  const SCENES = [
    {
      id: 'title', name: '标题页',
      sel: ['#title .panel', '#title h1', '#title .hint'],
      enter(F) { if (F.toTitle) F.toTitle(); }
    },
    {
      id: 'battle', name: '战斗 HUD',
      sel: ['#game', '#topbar', '#hpwrap', '#stats', '#pauseBtn', '#bosswrap', '#skillrow', '#combo'],
      pairs: [['#combo', '#bosswrap'], ['#combo', '#topbar'], ['#itemToast', '#pauseBtn']],
      enter(F) {
        F.god(true);
        F.enterMap('houshan', 'easy');
        setTimeout(() => { try { F.skipStory(); } catch (e) { } }, 320);
      },
      wait: 900
    },
    {
      id: 'cave', name: '洞府面板',
      sel: ['#cave .wm-panel', '#caveTabs', '#caveBody', '#cave .cave-foot'],
      enter(F) {
        F.openAllCaves();
        F.cave('qixuan');
        F.caveTab('stat');
      },
      wait: 320
    }
  ];

  /** 地图开场对白是延迟弹出的，所以在一段时间内持续清扫，而不是看一眼就走 */
  async function settleStory(ms) {
    const until = Date.now() + (ms || 900);
    while (Date.now() < until) {
      const F = api();
      if (!F) return;
      let st = '';
      try { st = F.info().state; } catch (e) { return; }
      if (st === 'dialog') { try { F.skipStory(); } catch (e) { } }
      await sleep(120);
    }
  }

  // ---------------- 检测 ----------------
  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  function auditEl(d, sel, ctx) {
    let el;
    try { el = d.querySelector(sel); } catch (e) { return null; }
    if (!el) return { name: sel, status: 'skip', note: '元素不存在', rect: null };
    const cs = d.defaultView.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
      return { name: sel, status: 'skip', note: '当前场景未显示', rect: null };
    }
    const r = rectOf(el);
    if (r.w < 1 || r.h < 1) return { name: sel, status: 'skip', note: '尺寸为 0', rect: null };

    const vw = ctx.vw, vh = ctx.vh, s = ctx.safe;
    const over = [];
    if (r.y < s.top - 0.6) over.push(['上', s.top - r.y]);
    if (r.y + r.h > vh - s.bottom + 0.6) over.push(['下', r.y + r.h - (vh - s.bottom)]);
    if (r.x < s.left - 0.6) over.push(['左', s.left - r.x]);
    if (r.x + r.w > vw - s.right + 0.6) over.push(['右', r.x + r.w - (vw - s.right)]);

    const box = {
      x: +r.x.toFixed(1), y: +r.y.toFixed(1),
      w: +r.w.toFixed(1), h: +r.h.toFixed(1)
    };

    if (over.length) {
      return {
        name: sel, label: ctx.label(sel), status: 'fail', rect: box,
        note: '越出安全区：' + over.map(o => o[0] + ' ' + Math.round(o[1]) + 'px').join('、')
      };
    }
    const gap = Math.min(r.y - s.top, (vh - s.bottom) - (r.y + r.h), r.x - s.left, (vw - s.right) - (r.x + r.w));
    if (gap < 3 && !NO_GAP_WARN[sel]) {
      return { name: sel, label: ctx.label(sel), status: 'warn', rect: box, note: '贴着安全区边界（余量 ' + gap.toFixed(1) + 'px）' };
    }
    return {
      name: sel, label: ctx.label(sel), status: 'pass', rect: box,
      note: Math.round(r.w) + '×' + Math.round(r.h) + ' · 距边 ' + Math.round(gap) + 'px'
    };
  }

  function auditPair(d, a, b, ctx) {
    const ea = d.querySelector(a), eb = d.querySelector(b);
    if (!ea || !eb) return null;
    const ca = d.defaultView.getComputedStyle(ea), cb = d.defaultView.getComputedStyle(eb);
    if (ca.display === 'none' || cb.display === 'none') return null;
    const ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect();
    if (ra.width < 1 || rb.width < 1) return null;
    const ow = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const oh = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ow > 2 && oh > 2) {
      return {
        name: a + ' × ' + b, label: ctx.label(a) + ' 压住 ' + ctx.label(b),
        status: 'fail', rect: null,
        note: '重叠 ' + Math.round(ow) + '×' + Math.round(oh) + 'px'
      };
    }
    return { name: a + ' × ' + b, label: ctx.label(a) + ' 与 ' + ctx.label(b), status: 'pass', rect: null, note: '不重叠' };
  }

  const NO_GAP_WARN = { '#game': 1, '#topbar': 1 };   // 容器级元素本来就铺满，不报"贴边"
  const LABELS = {
    '#game': '游戏画布',
    '#title .panel': '标题面板',
    '#title h1': '标题字',
    '#title .hint': '操作提示',
    '#topbar': '顶部信息区',
    '#hpwrap': '生命条',
    '#stats': '属性行',
    '#pauseBtn': '暂停键',
    '#bosswrap': 'Boss 气血',
    '#skillrow': '技能栏',
    '#combo': '连斩提示',
    '#itemToast': '拾取提示',
    '#cave .wm-panel': '洞府面板',
    '#caveTabs': '洞府分页',
    '#caveBody': '洞府内容',
    '#cave .cave-foot': '洞府底栏'
  };
  const labelOf = sel => LABELS[sel] || sel;

  // ---------------- 体检 ----------------
  async function auditScene(scene, ctx) {
    const d = doc();
    if (!d) return [];
    const out = [];
    for (const sel of scene.sel) {
      const r = auditEl(d, sel, ctx);
      if (r) out.push(r);
    }
    if (scene.pairs) {
      for (const [a, b] of scene.pairs) {
        const r = auditPair(d, a, b, ctx);
        if (r) out.push(r);
      }
    }
    return out;
  }

  async function runAudit(opts) {
    opts = opts || {};
    if (state.busy) return null;
    state.busy = true;
    const btn = $('auditBtn');
    btn.disabled = true;
    btn.textContent = '检测中…';
    $('auditTag').textContent = '运行中';

    const F = api();
    if (!F) {
      $('report').innerHTML = '<p class="empty">读不到游戏内页。请用线上地址或本地 http 服务打开部署台（file:// 会被浏览器拦下）。</p>';
      state.busy = false; btn.disabled = false; btn.textContent = '体检此机型';
      $('auditTag').textContent = '失败';
      return null;
    }

    await waitReady(5000);
    injectSafe();
    // 体检期间静音战斗内剧情对白，否则 2 秒后弹出的旁白会盖住 HUD，影响判定
    try { F.muteStory(true); } catch (e) { }

    const scenes = [];
    for (const sc of SCENES) {
      try { sc.enter(api()); } catch (e) { }
      if (sc.id === 'battle') {
        await settleStory();
        try { const F2 = api(); F2.boss(); F2.combo(28); F2.heal(); } catch (e) { }
      }
      await sleep(sc.wait || 350);
      injectSafe();
      const ctx = {
        vw: win().innerWidth, vh: win().innerHeight,
        safe: state.dev.safe,
        label: labelOf
      };
      let checks;
      if (sc.id === 'cave') {
        // 洞府里每个分页都过一遍，取最差
        const tabs = (F.caveTabsOf && F.caveTabsOf('qixuan')) || ['stat', 'equip', 'alchemy', 'forge', 'talisman', 'rest'];
        const all = [];
        for (const t of tabs) {
          try { F.caveTab(t); } catch (e) { }
          await sleep(70);
          const cs = await auditScene(sc, ctx);
          all.push(...cs);
        }
        checks = worstOf(all);
      } else {
        checks = await auditScene(sc, ctx);
      }
      scenes.push({ id: sc.id, name: sc.name, checks });
    }

    // 体检结束回到战斗画面（主界面），只在这一屏上画边界框，避免跨场景错位
    try { api().enterMap('houshan', 'easy'); } catch (e) { }
    await settleStory();
    const battle = scenes.find(s => s.id === 'battle');
    const flat = battle ? battle.checks.filter(c => c.rect) : [];

    const res = {
      dev: state.dev, vw: win().innerWidth, vh: win().innerHeight,
      safe: state.dev.safe,
      adapted: state.opt.safe,
      scenes, flat
    };
    state.lastAudit = res;
    state.opt.box = true;
    $('optBox').checked = true;
    drawBoxes(flat);
    if (!opts.quiet) renderReport(res);

    state.busy = false;
    btn.disabled = false;
    btn.textContent = '体检此机型';
    return res;
  }

  /** 同一元素多分页合并：有 fail 取 fail，有 warn 取 warn */
  function worstOf(list) {
    const map = new Map();
    for (const c of list) {
      const k = c.name;
      const old = map.get(k);
      if (!old) { map.set(k, Object.assign({}, c)); continue; }
      const rank = { fail: 3, warn: 2, pass: 1, skip: 0 };
      if (rank[c.status] > rank[old.status]) map.set(k, Object.assign({}, c, { note: c.note }));
    }
    return [...map.values()];
  }

  // ---------------- 报告 ----------------
  function renderReport(res) {
    const el = $('report');
    let fails = 0, warns = 0, pass = 0, skip = 0;
    res.scenes.forEach(s => s.checks.forEach(c => {
      if (c.status === 'fail') fails++; else if (c.status === 'warn') warns++;
      else if (c.status === 'pass') pass++; else skip++;
    }));

    const overall = fails ? 'fail' : warns ? 'warn' : 'pass';
    $('auditTag').textContent =
      (fails ? fails + ' 处遮挡' : '无遮挡') + (warns ? ' / ' + warns + ' 处贴边' : '');

    let html = '<div class="chk ' + overall + '"><i>' + (overall === 'pass' ? '✓' : '!') + '</i>' +
      '<div class="txt"><b>' + res.dev.name + '　' + res.vw + '×' + res.vh + '</b>' +
      '<span>安全区 上' + res.safe.top + ' / 下' + res.safe.bottom + '　通过 ' + pass + ' · 贴边 ' + warns + ' · 遮挡 ' + fails + (skip ? ' · 跳过 ' + skip : '') + '</span>' +
      (res.adapted === false ? '<span style="color:#ff7a7a">已关闭安全区适配——下面是「不做适配」时的真实后果</span>' : '') +
      '</div></div>';

    res.scenes.forEach(s => {
      const sf = s.checks.filter(c => c.status === 'fail').length;
      const sw = s.checks.filter(c => c.status === 'warn').length;
      const badge = sf ? 'fail' : sw ? 'warn' : 'pass';
      html += '<div class="scene-head">' + s.name +
        '<span class="badge ' + badge + '">' + (sf ? sf + ' 遮挡' : sw ? sw + ' 贴边' : '通过') + '</span></div>';
      s.checks.forEach(c => {
        html += '<div class="chk ' + c.status + '"><i>' +
          (c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : c.status === 'fail' ? '×' : '·') +
          '</i><div class="txt"><b>' + (c.label || c.name) + '</b><span>' + c.note + '</span></div></div>';
      });
    });

    el.innerHTML = html;
  }

  const NO_PAINT = { '#game': 1, '#topbar': 1, '#cave .wm-panel': 1, '#caveBody': 1 };
  function clearBoxes() { $('uibox').innerHTML = ''; }
  function drawBoxes(list) {
    const box = $('uibox');
    box.innerHTML = '';
    for (const c of list) {
      if (!c.rect) continue;
      if (NO_PAINT[c.name]) continue;
      const d = document.createElement('div');
      d.className = 'ub ' + (c.status === 'fail' ? 'fail' : c.status === 'warn' ? 'warn' : '');
      d.style.left = c.rect.x + 'px';
      d.style.top = c.rect.y + 'px';
      d.style.width = Math.max(2, c.rect.w) + 'px';
      d.style.height = Math.max(2, c.rect.h) + 'px';
      if (c.status !== 'pass') {
        const b = document.createElement('b');
        b.textContent = c.label || c.name;
        if (c.rect.y < 16) b.style.transform = 'none';
        d.appendChild(b);
      }
      box.appendChild(d);
    }
  }

  // ---------------- 全机型巡检 ----------------
  async function inspectAll() {
    if (state.busy) return;
    const btn = $('inspectAll');
    btn.disabled = true;
    btn.textContent = '巡检中…';
    const rows = [];
    const report = $('report');
    report.innerHTML = '<div class="scene-head">全机型巡检<span class="badge pass" id="progTxt">0 / ' + DEVICES.length + '</span></div>' +
      '<div class="audit-progress"><i id="progBar"></i></div><div id="matrix"></div>';

    for (let i = 0; i < DEVICES.length; i++) {
      const d = DEVICES[i];
      $('progTxt').textContent = (i + 1) + ' / ' + DEVICES.length + ' · ' + d.short;
      $('progBar').style.width = ((i + 1) / DEVICES.length * 100) + '%';
      setDevice(d, true);
      await sleep(60);
      injectSafe();
      await sleep(60);
      const res = await runAudit({ quiet: true });
      rows.push(res);
      $('matrix').innerHTML = matrixHtml(rows);
      drawBoxes(res ? res.flat : []);
    }

    $('auditTag').textContent = '巡检完成';
    btn.disabled = false;
    btn.textContent = '全机型巡检';
    $('matrix').innerHTML = matrixHtml(rows, true);
    const bad = rows.filter(r => r && r.scenes.some(s => s.checks.some(c => c.status === 'fail'))).length;
    toast(bad ? bad + ' 个机型存在遮挡' : '全部机型无遮挡');
  }

  function matrixHtml(rows, final) {
    let h = '<table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-top:6px">' +
      '<tr style="color:#8b93a3"><th style="text-align:left;padding:3px 2px">机型</th><th>标题</th><th>战斗</th><th>洞府</th></tr>';
    rows.forEach(r => {
      if (!r) return;
      const cell = s => {
        if (!s) return '<td style="text-align:center;color:#626c7c">—</td>';
        const f = s.checks.filter(c => c.status === 'fail').length;
        const w = s.checks.filter(c => c.status === 'warn').length;
        if (f) return '<td style="text-align:center;color:#ff7a7a;font-weight:700">' + f + ' 遮挡</td>';
        if (w) return '<td style="text-align:center;color:#ffc850">' + w + ' 贴边</td>';
        return '<td style="text-align:center;color:#6fe08a">通过</td>';
      };
      h += '<tr style="border-top:1px solid rgba(255,255,255,.07)">' +
        '<td style="padding:3px 2px;color:#f0e7d4">' + r.dev.short + '</td>' +
        r.scenes.map(s => cell(s)).join('') + '</tr>';
    });
    h += '</table>';
    if (final) h += '<p class="empty" style="margin-top:8px">点单个机型可查看详细条目。</p>';
    return h;
  }

  // ---------------- 实时面板 ----------------
  let liveTimer = 0, fpsCache = { v: 0, at: 0 };
  function scheduleLive() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(updateLive, 260);
  }
  function measureFps() {
    const w = win();
    if (!w || !w.requestAnimationFrame) return;
    const t0 = performance.now();
    let n = 0;
    const step = () => {
      n++;
      if (performance.now() - t0 < 700) w.requestAnimationFrame(step);
      else fpsCache = { v: Math.round(n / ((performance.now() - t0) / 1000)), at: Date.now() };
    };
    w.requestAnimationFrame(step);
  }
  function updateLive() {
    const F = api(), w = win();
    const kv = $('liveKv');
    if (!F || !w) {
      kv.innerHTML = '<dt>状态</dt><dd class="bad">未连接</dd>';
      $('liveTag').textContent = '—';
      return;
    }
    let v, info;
    try { v = F.view(); info = F.info(); } catch (e) { return; }
    const stageW = v.stage ? v.stage.w : 0, stageH = v.stage ? v.stage.h : 0;
    if (!fpsCache.v || Date.now() - fpsCache.at > 1500) measureFps();
    const rows = [
      ['视口', w.innerWidth + '×' + w.innerHeight],
      ['DPR', (w.devicePixelRatio || 1).toFixed(2)],
      ['安全区', v.safe.top + ' / ' + v.safe.bottom],
      ['画布显示', stageW + '×' + stageH],
      ['缩放', (+v.scale).toFixed(3)],
      ['FPS', fpsCache.v || '—'],
      ['状态', stateName(info.state)],
      ['境界', info.realm || '—'],
      ['难度', info.diffName || '—'],
      ['敌数', info.enemies]
    ];
    kv.innerHTML = rows.map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('');
    $('liveTag').textContent = w.innerWidth + '×' + w.innerHeight;
  }
  function stateName(s) {
    return ({
      title: '标题页', play: '战斗中', pause: '暂停', levelup: '升级选牌',
      dialog: '剧情对话', victory: '通关结算', gameover: '道陨',
      cave: '洞府', shop: '坊市', map: '修行图', diff: '难度选择'
    })[s] || s;
  }
  setInterval(() => { if (!state.busy) updateLive(); }, 1200);

  // ---------------- 快捷指令 ----------------
  const CMDS = {
    houshan: F => { F.god(true); F.enterMap('houshan', 'easy'); toast('后山 · 凡境'); },
    xuese: F => { F.unlockAll(); F.god(true); F.enterMap('xuese', 'nightmare'); toast('血色禁地 · 死境'); },
    cave: F => { F.openAllCaves(); F.cave('qixuan'); toast('药庐草舍'); },
    diff: F => { F.pickDiff('houshan'); toast('难度面板'); },
    maxAll: F => { F.maxAll(); F.stones(9999); toast('功法满级 + 灵石 9999'); },
    mats: F => {
      F.addMats(9); ['m_chijing', 'm_huangjing', 'm_zihou', 'm_tianling', 'm_longlin', 'm_nishang'].forEach(m => F.addMat(m, 9));
      toast('材料已入库');
    },
    reset: F => {
      if (!confirm('清空全部存档进度？（不可撤销）')) return;
      F.clearProgress(); F.toTitle && F.toTitle(); toast('进度已清空');
    }
  };
  $('quickBox').addEventListener('click', async e => {
    const b = e.target.closest('[data-cmd]');
    if (!b) return;
    const F = api();
    if (!F) { toast('游戏还没加载好'); return; }
    try {
      await waitReady(3000);
      CMDS[b.dataset.cmd](api());
      scheduleLive();
    } catch (err) { toast('指令失败：' + err.message); }
  });

  // ---------------- 其他按钮 ----------------
  $('reloadBtn').addEventListener('click', () => {
    frame.src = 'index.html?t=' + Date.now();
    toast('已重载预览');
  });
  $('auditBtn').addEventListener('click', () => runAudit());
  $('inspectAll').addEventListener('click', inspectAll);

  // ---------------- 启动 ----------------
  function boot() {
    initAddress();
    renderChips();
    setDevice(state.dev);
    updateEnv();
    updateLive();
    // 手机访问提示
    const ua = navigator.userAgent;
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua) && window.innerWidth < 900) {
      $('mobileTip').hidden = false;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // 首屏后再 fit 一次，避免字体/滚动条造成的高度差
  setTimeout(() => { fitDevice(); injectSafe(); }, 400);
})();
