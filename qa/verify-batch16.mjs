// 回归测试：批次16「战斗按钮热区 + 误触保护 + 设备偏好 + 存档迁移」
//
// 这一批修的都是「真机才会疼」的地方，逐条对应：
//   A 热区：「禁制」29px、「大衍」21px 在 320 宽机型上没有热区补偿（它们没有 .btn 类）
//   B 误触：「重新开始」就在「继续」下面 3px，内部 startMap→resetRun 清本局，原先一键到底
//   C 偏好：静音只活在内存里，刷新后自动炸响；全屏按钮进全屏后仍写「全屏」
//   D 震动：没有开关，也不认系统 prefers-reduced-motion
//   E 迁移：localStorage 单槽，换浏览器 / 清站点数据即全丢，原先无导出
//   F 教学：弹反是核心系统，剧情里一个字没提
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const URL = 'file:///' + root.split('\\').join('/') + '/index.html?test=1';

let pass = 0, fail = 0;
const bad = [];
function ok(cond, msg, extra) {
  if (cond) { pass++; return true; }
  fail++; bad.push(msg + (extra !== undefined ? '  → ' + JSON.stringify(extra) : ''));
  return false;
}

const css = fs.readFileSync(join(root, 'css', 'style.css'), 'utf8');
const game = fs.readFileSync(join(root, 'js', 'game.js'), 'utf8');
const audio = fs.readFileSync(join(root, 'js', 'audio.js'), 'utf8');
const html = fs.readFileSync(join(root, 'index.html'), 'utf8');

// ---------- A 静态：两颗常驻按钮的素签外观 + 44 物理 px 热区 ----------
// 20261122A：顶栏轻排，禁制 / 大衍从大黑胶囊收成细金线淡墨素签（宽 1.32 倍）；
// 伪元素重新分工以便真机命中补偿：#pauseBtn::before 画签身、::after 做 coarse 热区；
// #autoBtn 反过来 ::after 画签身、::before 做 coarse 热区，入定点移到 span::after。
// 热区仍走 --tap（44px / 当前舞台缩放比），任何机型都是 44 屏幕 px。
ok(/--tap:\s*calc\(44px \/ var\(--view-scale\)\)/.test(css), '触控尺寸走 --tap（44 物理 px 反算回逻辑 px）');
const duoRule = (css.match(/#pauseBtn,\s*#autoBtn\s*\{([^}]*)\}/) || [])[1] || '';
ok(/height:\s*var\(--tap\)/.test(duoRule) && /width:\s*calc\(var\(--tap\)\s*\*\s*1\.32\)/.test(duoRule),
  '禁制 / 大衍共用的签身高 44 物理 px、宽 1.32 倍（细金线素签）', duoRule.slice(0, 160));
ok(/#pauseBtn::before,\s*#autoBtn::after\s*\{[^}]*inset:\s*calc\(10px \/ var\(--view-scale\)\)/.test(css), '禁制签身由 ::before 画细金线素签、大衍由 ::after 画（避让 coarse 热区）');
ok(/#autoBtn\.on span::after\s*\{/.test(css), '#autoBtn 的入定小圆点挂在 span::after（让出伪元素画签身）');
ok(/id="autoBtn"/.test(html) && /id="autoFightChk"/.test(html), '大衍回到战斗画面，暂停面板开关仍留作兼容');

// ---------- B 静态：重开确认 ----------
ok(/RESTART_ARM_MS\s*=\s*3000/.test(game), '重新开始有 3 秒授权窗口');
ok(/本局作废/.test(game), '武装态改文案提示后果（本局作废）');
ok(/function resetRestartArm\(\)/.test(game), '有撤回函数（超时 / 重开暂停面板都会复位）');
ok(/resetRestartArm\(\);\s*\n\s*syncFullBtns\(\);/.test(game),
  'doPause 打开面板时复位，避免上一次的授权跨次复用');

// ---------- C 静态：静音持久 + 全屏状态 ----------
ok(/MUTE_KEY\s*=\s*'fanren_audio_muted'/.test(audio), '静音用独立 localStorage 键');
ok(/localStorage\.getItem\(MUTE_KEY\)/.test(audio), '音频模块加载时读回静音偏好');
ok(/localStorage\.setItem\(MUTE_KEY/.test(audio), 'toggle 时写回静音偏好');
ok(/退出全屏/.test(game) && /function syncFullBtns\(\)/.test(game), '全屏按钮有状态文案');
ok(/syncFullBtns\(\)/.test(game.slice(game.indexOf("'fullscreenchange'"), game.indexOf("'fullscreenchange'") + 500)),
  '全屏状态变化时同步文案');
ok(/syncFullBtns\(\)/.test(game.slice(game.indexOf("document.body.classList.toggle('immersive'"), game.indexOf("document.body.classList.toggle('immersive'") + 200)),
  '沉浸模式切换也同步文案');

// ---------- D 静态：震动开关 ----------
ok(/function shakeOn\(\)/.test(game), '有统一的震动判定函数');
ok(/prefers-reduced-motion: reduce/.test(game), '读取系统「减少动态效果」偏好');
ok(/shakeSet/.test(game), '玩家手动选择后固定，不再被系统覆盖');
ok(/if \(G\.shake > 0 && shakeOn\(\)\)/.test(game), '震屏在唯一应用点乘开关（不改各处 G.shake 调参）');
ok(/id="shakeChk"/.test(html), '设置面板有「画面震动」开关');

// ---------- E 静态：存档迁移 ----------
ok(/SAVE_AT_KEY\s*=\s*'fanren_save_at'/.test(game), '上次存档时间用独立键，不写进存档内容');
ok(/\bon\(SAVE_AT_KEY\)/.test(game) || /setItem\(SAVE_AT_KEY/.test(game), '落盘时记录墙钟');
ok(/function saveToCode/.test(game) && /function codeToSave/.test(game), '有可抄可粘的编码 / 解码');
ok(/'CSJ1:'/.test(game), '导出带格式前缀，便于识别而不是瞎解析');
ok(/!o\.cultivate \|\| typeof o\.cultivate\.level !== 'number'/.test(game), '导入前校验形状（别的 JSON 不该覆盖存档）');
ok(/id="saveIO"/.test(html) && /id="saveIOText"/.test(html), '存档迁移面板存在');
ok(/localStorage\.removeItem\(SAVE_AT_KEY\)/.test(game), '清档连「上次存档时间」一起清');

// ---------- F 静态：弹反教学 ----------
ok(/弹反 · 按住「护体」稳住身形/.test(game), '教学战补了弹反说明');
ok(/storySeen\('parryTip'\)/.test(game), '弹反提示只念一次（写进 save.seen）');
ok(/}, 5600\)/.test(game), '弹反提示排在既有两条之后（5.6s）');
// 防回退：Sfx.warn 这类泛音不该再出现在破境失败路径（批次13 已拆分）
ok(/Sfx\.realmFail\(\)/.test(game) && /Sfx\.realmUp\(\)/.test(game), '破境成/败仍是专属音（未被回退）');

// ---------- 浏览器实测 ----------
const browser = await chromium.launch({ channel: 'chrome' });
const allErrs = [];

try {
  // A 真渲染：320 宽战斗内，两颗按钮边界外 4px 仍命中自身
  {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => allErrs.push('A:' + e.message));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    await page.evaluate(() => { const F = window.__FR; F.muteStory(true); try { F.enterMap('xuese'); } catch (e) {} });
    await page.waitForFunction(() => window.__FR.G.state === 'play', { timeout: 15000 });
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const probe = (id) => {
        const e = document.getElementById(id);
        if (!e) return null;
        const b = e.getBoundingClientRect();
        if (!b.width) return { hidden: true };
        const cx = b.left + b.width / 2;
        const hit = (y) => {
          const t = document.elementFromPoint(cx, y);
          if (!t) return 'none';
          return t.closest('#' + id) ? 'SELF' : (t.id || t.tagName.toLowerCase());
        };
        return {
          w: Math.round(b.width), h: Math.round(b.height),
          up3: hit(b.top - 3), down3: hit(b.bottom + 3), mid: hit(b.top + b.height / 2),
        };
      };
      return { pause: probe('pauseBtn'), auto: probe('autoBtn'), autoChk: !!document.getElementById('autoFightChk') };
    });
    ok(!!m.pause && !m.pause.hidden, '禁制按钮在战斗中可见');
    ok(!!m.auto && !m.auto.hidden, '大衍按钮回到战斗中（经验条右下）');
    ok(m.autoChk, '暂停面板开关仍保留（与战斗按钮双向同步）');
    for (const [key, name] of [['pause', '禁制'], ['auto', '大衍']]) {
      const b = m[key];
      if (!b || b.hidden) continue;
      ok(b.mid === 'SELF', name + '：中心命中自身', b);
      ok(b.up3 === 'SELF' && b.down3 === 'SELF', name + '：上下边界外 3px 仍命中自身', b);
      ok(b.h >= 44 && b.w > b.h, name + '：签身 ≥44 物理 px 高、比宽更长（旧素签）', b);
    }
    await ctx.close();
  }

  // B 真渲染：重新开始两段式
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => allErrs.push('B:' + e.message));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    await page.evaluate(() => { const F = window.__FR; F.muteStory(true); try { F.enterMap('xuese'); } catch (e) {} });
    await page.waitForFunction(() => window.__FR.G.state === 'play', { timeout: 15000 });
    await page.waitForTimeout(700);
    await page.evaluate(() => document.getElementById('pauseBtn').click());
    await page.waitForSelector('#restartBtn', { state: 'visible', timeout: 6000 });
    const base = await page.evaluate(() => ({ label: window.__FR.restartLabel(), armed: window.__FR.restartArmed() }));
    ok(base.label === '重新开始' && base.armed === false, '打开暂停面板时按钮是干净态', base);
    await page.click('#restartBtn');
    await page.waitForTimeout(160);
    const armed = await page.evaluate(() => ({
      label: window.__FR.restartLabel(), armed: window.__FR.restartArmed(),
      state: window.__FR.G.state,
    }));
    ok(armed.armed === true, '第一下进入授权态（不立刻重开）', armed);
    ok(armed.label.indexOf('再按一次') >= 0, '授权态文案明确说出后果', armed.label);
    ok(armed.state === 'pause', '第一下没有重开本局', armed.state);
    await page.waitForTimeout(3300);
    const back2 = await page.evaluate(() => ({
      label: window.__FR.restartLabel(), armed: window.__FR.restartArmed(), state: window.__FR.G.state,
    }));
    ok(back2.armed === false, '超过 3 秒自动撤回授权', back2);
    ok(back2.label === '重新开始', '撤回后恢复原文案', back2.label);
    ok(back2.state === 'pause', '撤回后仍停在暂停面板（没有误重开）', back2.state);
    await ctx.close();
  }

  // C 真渲染：静音跨刷新保留
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => allErrs.push('C:' + e.message));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    const before = await page.evaluate(() => Sfx.muted);
    const toggled = await page.evaluate(() => window.__FR.muteToggle());
    ok(toggled !== before, '点击静音真的切了状态', { before, toggled });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    const after = await page.evaluate(() => ({
      muted: Sfx.muted, btn: document.getElementById('muteTitle').textContent,
    }));
    ok(after.muted === toggled, '刷新后静音仍然生效（不再自动炸响）', after);
    ok(/\u{1F507}/u.test(after.btn) || after.btn.indexOf('关') >= 0, '标题页静音按钮文案同步', after.btn);
    // 清档不该把设备级偏好带走
    await page.evaluate(() => window.__FR.save.clear());
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    ok(await page.evaluate(() => Sfx.muted) === toggled, '清档不清静音偏好（设备级，不是存档级）');
    await ctx.close();
  }

  // D 真渲染：震动开关 + 系统减少动效
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => allErrs.push('D1:' + e.message));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    const r = await page.evaluate(() => {
      const F = window.__FR;
      const def = F.shakeOn();
      const off = F.setShake(false);
      const on = F.setShake(true);
      return { def, off, on };
    });
    ok(r.def === true, '默认开启震动', r);
    ok(r.off === false, '关掉后 shakeOn=false（渲染层会跳过抖动）', r);
    ok(r.on === true, '再打开恢复', r);
    await ctx.close();

    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p2 = await ctx2.newPage();
    p2.on('pageerror', e => allErrs.push('D2:' + e.message));
    await p2.goto(URL, { waitUntil: 'load' });
    await p2.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    const r2 = await p2.evaluate(() => {
      const F = window.__FR;
      const def = F.shakeOn();
      const manual = F.setShake(true);
      return { def, manual, matched: F.shakeReduceMatch() };
    });
    ok(r2.matched === true, '能读到系统「减少动态效果」', r2);
    ok(r2.def === false, '系统要求减少动效时默认不开震屏', r2);
    ok(r2.manual === true, '玩家手动打开仍优先（不被系统覆盖）', r2);
    await ctx2.close();
  }

  // E 真渲染：存档导出 → 清档 → 导入 闭环
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => allErrs.push('E:' + e.message));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    await page.evaluate(() => { const F = window.__FR; F.save.clear(); F.save.stones(4321); });
    const landed = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').stones);
    ok(landed === 4321, '摆局：存档里确有可辨识的数值', landed);

    const code = await page.evaluate(() => {
      window.__FR.G.state = 'pause';
      document.getElementById('pause').style.display = 'flex';
      document.getElementById('saveIOBtn').click();
      document.getElementById('saveIOExport').click();
      return document.getElementById('saveIOText').value;
    });
    ok(code.indexOf('CSJ1:') === 0, '导出带 CSJ1 前缀', code.slice(0, 12));
    ok(code.length > 200, '导出内容非空', code.length);

    await page.evaluate(() => window.__FR.save.clear());
    ok(await page.evaluate(() => localStorage.getItem('fanren_save_v1')) === null, '清档后主档为空');

    await page.evaluate((c) => {
      document.getElementById('saveIOText').value = c;
      document.getElementById('saveIOImport').click();
    }, code);
    await page.waitForTimeout(1700);
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    await page.waitForTimeout(500);
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').stones);
    ok(restored === 4321, '导入后进度完整回到 4321', restored);

    // 垃圾输入必须被挡住，不能覆盖存档
    const guard = await page.evaluate(() => {
      window.__FR.G.state = 'pause';
      document.getElementById('pause').style.display = 'flex';
      document.getElementById('saveIOBtn').click();
      const t = document.getElementById('saveIOText');
      const h = document.getElementById('saveIOHint');
      t.value = '{"foo":1}';
      document.getElementById('saveIOImport').click();
      return { hint: h.textContent, before: (localStorage.getItem('fanren_save_v1') || '').length };
    });
    ok(guard.hint.indexOf('不像是本游戏') >= 0, '别的 JSON 被认出来并拒绝', guard.hint);
    await page.waitForTimeout(300);
    const stillThere = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').stones);
    ok(stillThere === 4321, '被拒绝的导入没有覆盖现有存档', stillThere);
    await ctx.close();
  }

  // F 真渲染：上次存档时间 + 弹反教学记账 + 迁移层压在暂停面板之上
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => allErrs.push('F:' + e.message));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    const hint = await page.evaluate(() => window.__FR.saveHintText());
    ok(hint.indexOf('上次存档') >= 0, '暂停面板报「上次存档」相对时间', hint);

    // 迁移面板是从暂停面板里开的：#pause 自己比 .overlay 默认层高一档，
    // 不做层级比较的话「点存档迁移」看上去毫无反应（实测踩过）。
    const layers = await page.evaluate(() => {
      window.__FR.G.state = 'pause';
      document.getElementById('pause').style.display = 'flex';
      document.getElementById('saveIOBtn').click();
      const z = (id) => +getComputedStyle(document.getElementById(id)).zIndex || 0;
      const io = document.getElementById('saveIO');
      return { pause: z('pause'), io: z('saveIO'), disp: getComputedStyle(io).display, h: Math.round(io.getBoundingClientRect().height) };
    });
    ok(layers.disp === 'flex', '点「存档迁移」确实把面板打开了', layers);
    ok(layers.io > layers.pause, '存档迁移层压在暂停面板之上（否则看不见）', layers);
    ok(layers.h > 100, '迁移面板有实际尺寸', layers);

    // 新档首战：教学要留下弹反记账
    await page.evaluate(() => window.__FR.save.clear());
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    await page.evaluate(() => {
      const F = window.__FR;
      F.muteStory(true); F.skipStory();
      try { F.enterMap('qixuan'); } catch (e) {}
    });
    // 七玄门开场是两段式剧情：跳过一次只走完前一段，要一直跳到状态落到 play
    for (let i = 0; i < 14; i++) {
      if (await page.evaluate(() => window.__FR.G.state) === 'play') break;
      await page.evaluate(() => { try { window.__FR.skipStory(); } catch (e) {} });
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
    const seen = await page.evaluate(() => (JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').seen) || []);
    ok(seen.indexOf('parryTip') >= 0, '新档首战记下「弹反已提示」，不会每局重念', seen);
    await ctx.close();
  }
} finally {
  await browser.close();
}

ok(allErrs.length === 0, '全程零 pageerror', allErrs.slice(0, 4));

console.log('批次16：' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { for (const b of bad) console.log('  ✗ ' + b); process.exit(1); }
console.log('全绿');
