// 通用工具函数
window.U = {
  rand(a, b) { return a + Math.random() * (b - a); },
  ri(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
  dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
  now() { return performance.now(); }
};
