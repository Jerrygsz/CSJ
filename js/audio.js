// 轻量 WebAudio 音效合成（无需音频文件）
window.Sfx = (function () {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
    // 播完断开（20261111H）：连在 destination 上的源节点在部分浏览器里不会被回收，
    // 一局几百次音效下来会攒成一条长链，调度开销落在音频线程上，表现就是「越玩越卡」。
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
  }

  // 噪声源按长度缓存（20261111H）：原来每次调用都 createBuffer + 逐样本 Math.random 填充，
  // 弹反一次就要 2400 次随机数；一次清场杀十几只怪，击杀音接连触发，主线程被这些循环吃掉。
  // AudioBuffer 可以被多个 BufferSource 同时复用，缓存一份就够；按「采样数」区分，采样率变了另存。
  const noiseCache = new Map();
  function noiseBuf(len, sampleRate) {
    const key = len + '@' + sampleRate;
    let buf = noiseCache.get(key);
    if (!buf) {
      buf = ctx.createBuffer(1, len, sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      if (noiseCache.size > 24) noiseCache.clear();   // 长度种类不会多，兜一个上限
      noiseCache.set(key, buf);
    }
    return buf;
  }
  function noise(dur, vol, cutoff) {
    if (muted) return;
    ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(len, ctx.sampleRate);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 1300;
    s.connect(f).connect(g).connect(ctx.destination);
    s.start(t); s.stop(t + dur);
    // 播完断开：连接着 destination 的节点在部分浏览器上不会被回收，长局里会留下一串死节点
    s.onended = () => { try { s.disconnect(); f.disconnect(); g.disconnect(); } catch (e) {} };
  }

  // 同名音效节流（20261111H）：弹反清场一次杀十几只怪，会连着调十几次 enemyDie。
  // 每个 noise 都要在音频线程上新建 bufferSource + biquad + gain 三个节点，
  // 这些调用全是主线程同步排队 —— 6x 节流实测「一次弹反」里音频占掉近一成。
  // 60ms 内同一种只发一次：听感上反而更清楚 —— 该听到的是「一片被扫掉」，
  // 而不是十六声死亡音叠成一团噪音。
  const _lastPlay = Object.create(null);
  function gate(key, gap) {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const t = _lastPlay[key] || 0;
    if (now - t < gap) return false;
    _lastPlay[key] = now;
    return true;
  }

  return {
    // 基础动作
    hit() { if (gate('hit', 55)) noise(0.05, 0.04); },
    shoot() { if (gate('shoot', 40)) tone(640, 0.06, 'square', 0.035, 430); },
    fire() { if (gate('fire', 60)) { tone(300, 0.2, 'sawtooth', 0.05, 110); noise(0.12, 0.03, 800); } },
    nova() { if (gate('nova', 80)) { tone(1100, 0.22, 'sine', 0.05, 1900); setTimeout(() => tone(1500, 0.18, 'sine', 0.04, 2200), 40); } },
    gem() { if (gate('gem', 45)) tone(900, 0.05, 'triangle', 0.05, 1250); },
    heal() { tone(880, 0.08, 'triangle', 0.06); setTimeout(() => tone(1320, 0.14, 'triangle', 0.06), 80); },
    buff() { tone(660, 0.08, 'square', 0.06); setTimeout(() => tone(990, 0.1, 'square', 0.06), 70); setTimeout(() => tone(1320, 0.12, 'square', 0.06), 140); },
    burst() { tone(220, 0.16, 'square', 0.05, 640); noise(0.1, 0.03, 1600); },
    // 闪身：一声短促上滑的风声，比受击音更「轻」，玩家才知道自己闪过去了
    dodge() { tone(520, 0.1, 'sine', 0.05, 1180); noise(0.07, 0.03, 2600); },
    // 弹反「格开」：刃口一声金铁 + 胸口一记闷响。连反层数越高，尾音越亮（手感递进）
    parry(chain) {
      const c = Math.max(1, Math.min(5, chain || 1));
      tone(1760 + c * 60, 0.05, 'square', 0.05, 2600);
      noise(0.05, 0.05, 4200);
      setTimeout(() => tone(120, 0.16, 'sine', 0.09, 60), 12);
      if (c >= 2) setTimeout(() => tone(1320 + c * 80, 0.08, 'triangle', 0.045), 45);
    },

    // 受击 / 死亡
    hurt() { tone(190, 0.18, 'sawtooth', 0.09, 90); noise(0.1, 0.05); },
    enemyDie() { if (gate('die', 70)) noise(0.08, 0.05); },
    boss() { tone(90, 0.5, 'sawtooth', 0.12, 60); setTimeout(() => noise(0.4, 0.08), 60); },
    warn() { tone(520, 0.12, 'square', 0.07); setTimeout(() => tone(390, 0.2, 'square', 0.07), 110); },
    bossPhase() {
      tone(70, 0.7, 'sawtooth', 0.15, 45);
      setTimeout(() => noise(0.6, 0.11, 600), 80);
      setTimeout(() => tone(140, 0.5, 'sawtooth', 0.1, 280), 120);
    },

    // 成长 / 结局
    levelup() {
      tone(520, 0.1, 'triangle', 0.07);
      setTimeout(() => tone(700, 0.1, 'triangle', 0.07), 90);
      setTimeout(() => tone(980, 0.14, 'triangle', 0.07), 180);
    },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.08), i * 150)); },
    lose() { [400, 300, 200].forEach((f, i) => setTimeout(() => tone(f, 0.32, 'sawtooth', 0.08), i * 190)); },

    // 人物反应（按说话者给不同音色）
    dialog(speaker) {
      let f = 440;
      if (speaker === '墨大夫') f = 240;
      else if (speaker === '韩立') f = 520;
      else f = 360;
      tone(f, 0.04, 'square', 0.03, f * 1.1);
    },

    toggle() { muted = !muted; return muted; },
    get muted() { return muted; }
  };
})();
