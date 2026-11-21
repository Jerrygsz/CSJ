// 调试桥：仅在被嵌入 iframe 或带 ?test=1 时启用
// 测试页面通过 postMessage 调用 window.__FR，绕过 file:// 的同源限制
(function () {
  const embedded = window.self !== window.top;
  const paramTest = location.search.indexOf('test') >= 0;
  if (!embedded && !paramTest) return;

  function post(msg) {
    try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (e) {}
  }

  window.addEventListener('message', function (e) {
    const d = e.data;
    if (!d || d.__fr !== 1) return;
    const api = window.__FR;
    let res = null, ok = true;
    try {
      if (!api) throw new Error('__FR 未就绪');
      // 支持 'a.b' 形式，如 save.clear
      const parts = String(d.cmd).split('.');
      let fn = api, ctx = api;
      for (let i = 0; i < parts.length; i++) { ctx = fn; fn = fn[parts[i]]; }
      if (typeof fn !== 'function') throw new Error('未知命令: ' + d.cmd);
      res = fn.apply(ctx, d.args || []);
      // 序列化安全检查
      try { res = res === undefined ? null : JSON.parse(JSON.stringify(res)); } catch (se) { res = String(res); }
    } catch (err) {
      ok = false; res = String((err && err.message) || err);
    }
    post({ __fr: 1, id: d.id, ok: ok, res: res });
  });

  function announce() { post({ __fr: 1, ready: !!window.__FR }); }
  setTimeout(announce, 80);
  setTimeout(announce, 600);
})();
