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
  }

  function noise(dur, vol, cutoff) {
    if (muted) return;
    ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 1300;
    s.connect(f).connect(g).connect(ctx.destination);
    s.start(t); s.stop(t + dur);
  }

  return {
    // 基础动作
    hit() { noise(0.05, 0.04); },
    shoot() { tone(640, 0.06, 'square', 0.035, 430); },
    fire() { tone(300, 0.2, 'sawtooth', 0.05, 110); noise(0.12, 0.03, 800); },
    nova() { tone(1100, 0.22, 'sine', 0.05, 1900); setTimeout(() => tone(1500, 0.18, 'sine', 0.04, 2200), 40); },
    gem() { tone(900, 0.05, 'triangle', 0.05, 1250); },
    heal() { tone(880, 0.08, 'triangle', 0.06); setTimeout(() => tone(1320, 0.14, 'triangle', 0.06), 80); },
    buff() { tone(660, 0.08, 'square', 0.06); setTimeout(() => tone(990, 0.1, 'square', 0.06), 70); setTimeout(() => tone(1320, 0.12, 'square', 0.06), 140); },
    burst() { tone(220, 0.16, 'square', 0.05, 640); noise(0.1, 0.03, 1600); },

    // 受击 / 死亡
    hurt() { tone(190, 0.18, 'sawtooth', 0.09, 90); noise(0.1, 0.05); },
    enemyDie() { noise(0.08, 0.05); },
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
