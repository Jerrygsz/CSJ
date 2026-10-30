// 凡人修仙传·突破界面 —— Service Worker
// 目的：每次发版后强制浏览器与中间代理重新拉取 index.html，
//       不再被「按 URL 路径缓存的旧页面」卡住。
//       JS/CSS 本身已带 ?v= 版本号（每次发版会 bump），无需此处处理。
//
// 机制：拦截顶层导航（index.html）请求，给 URL 追加 ?_sw=<BUILD> 缓存破坏参数，
//       让中间代理按「全新地址」回源取最新 index.html。
//       每次发版时同步修改下方 BUILD 与 index.html 里的 ?v= 与 sw.js?v= 三者。
const BUILD = '20261030j'; // 与 index.html 的 ?v= 同步 bump

self.addEventListener('install', () => {
  self.skipWaiting(); // 新 SW 直接激活，不等旧页面关闭
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // 立即接管已打开的页面
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 只拦截顶层导航（打开 CSJ/ 本身），给地址追加缓存破坏参数
  if (req.mode === 'navigate') {
    const url = new URL(req.url);
    if (url.origin === self.location.origin) {
      url.searchParams.set('_sw', BUILD);
      const fresh = new Request(url.toString(), { method: 'GET', cache: 'reload' });
      // 先打全新地址；若失败再退回原请求，保证页面至少能开
      event.respondWith(fetch(fresh).catch(() => fetch(req)));
    }
  }
  // 其余请求（js / css / 图片 / 数据等）交回浏览器默认处理
});
