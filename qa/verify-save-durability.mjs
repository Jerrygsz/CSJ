// 回归测试：批次15「存档耐久」
//
// 背景：主存档只有一个 localStorage 槽，原来是
//   function writeSave(){ try{ ...setItem... }catch(e){} }
// 三个隐患叠在一起：
//   1) 写不进去（配额满 / 隐私模式）被 catch 空转，玩家打几小时以为在存，其实一条没落地；
//   2) 一次坏写就把上一版盖掉，没有回滚点；
//   3) 主档解析失败直接退回全新存档，进度静默清零。
//
// 本闸守四件事：
//   A 静态：备份键存在、写入有失败提示与重试、内容不变不重复写、清档连备份一起清
//   B 备份语义：写完新内容后，备份里是「上一版」而不是同一份
//   C 回滚：主档被写坏 → 重开 → 从备份恢复，并给出明确提示
//   D 失败提示：setItem 抛错时只喊一次、恢复后自动归零，且旧档不被破坏
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

const game = fs.readFileSync(join(root, 'js', 'game.js'), 'utf8');

// ---------- A 静态 ----------
ok(/const SAVE_BAK = 'fanren_save_v1_bak'/.test(game), '存在独立备份键 SAVE_BAK');

const wf = (game.match(/function writeSave\(\)\s*\{([\s\S]*?)\n  \}/) || [])[1] || '';
ok(!!wf, '能定位 writeSave 函数体', wf.slice(0, 60));
ok(/JSON\.stringify\(save\)/.test(wf), '写档仍序列化 save 本体');
ok(/catch \(e\) \{ noteSaveFail\(\); return false; \}/.test(wf),
  '序列化/写入失败走 noteSaveFail，不再静默空转', wf);
ok(/json === _savedRaw/.test(wf), '内容未变不重复写（省一次同步写）', wf);
ok(/localStorage\.setItem\(SAVE_BAK, _savedRaw\)/.test(wf), '写新内容前把上一版留成备份', wf);
ok(/_savedRaw = json/.test(wf), '写入成功后记住已落盘内容', wf);

// 回归护栏：旧的「catch 里什么都不做」写法一旦被改回来，这里要红
ok(!/function writeSave\(\) \{ try \{ save\.stones = Math\.round/.test(game),
  '旧的静默吞错写档已移除（防回归）');

const nf = (game.match(/function noteSaveFail\(\)\s*\{([\s\S]*?)\n  \}/) || [])[1] || '';
ok(/notifyBig\(/.test(nf), '写入失败用重要横幅告知，不静默', nf);
ok(/_saveWarned/.test(nf), '失败提示只喊一次（_saveWarned 去重）', nf);

const ls = (game.match(/function loadSave\(\)\s*\{([\s\S]*?)\n  \}\n  \/\/ 上一次真正落盘/) || [])[1] || '';
ok(/localStorage\.getItem\(SAVE_BAK\)/.test(ls), '读档在主档失败时找备份', ls.slice(0, 400));
ok(/fromBak = true/.test(ls), '标记「这一份来自备份」', null);
ok(/已回滚到上一版进度/.test(ls), '回滚时明确告知玩家', null);

const clr = (game.match(/clear: \(\) => \{([\s\S]*?)\n      \},/) || [])[1] || '';
ok(/removeItem\(SAVE_BAK\)/.test(clr), '清档连备份一起清（否则备份会把进度救回来）', clr);
ok(/_savedRaw = null/.test(clr), '清档后重置已落盘内容', clr);

// 探针可用性
ok(/corrupt: \(\) =>/.test(game), '保留 corrupt 探针（闸门用它造坏档）');
ok(/backup: \(\) =>/.test(game), '保留 backup 探针（闸门用它读备份状态）');

// ---------- 浏览器行为 ----------
const browser = await chromium.launch({ channel: 'chrome' });

async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
  return { ctx, page, errs };
}

try {
  // B 备份语义
  {
    const { ctx, page, errs } = await fresh();
    const m = await page.evaluate(() => {
      const F = window.__FR;
      F.save.clear();
      F.save.stones(111);
      const a = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
      F.save.stones(222);
      const b = JSON.parse(localStorage.getItem('fanren_save_v1') || '{}');
      const bak = JSON.parse(localStorage.getItem('fanren_save_v1_bak') || '{}');
      // 同值重复写：备份不能被推成同一份
      F.save.stones(222); F.save.stones(222);
      const bak2 = JSON.parse(localStorage.getItem('fanren_save_v1_bak') || '{}');
      return { a: a.stones, b: b.stones, bak: bak.stones, bak2: bak2.stones, st: F.save.backup() };
    });
    ok(m.b === 222, '主档写入最新值', m);
    ok(m.bak === 111, '备份是上一版（111），不是同一份', m);
    ok(m.bak2 === 111, '同值重复写不改动备份', m);
    ok(m.st.done !== false && m.st.written === true, '备份探针报告已落盘', m.st);
    ok(errs.length === 0, '备份语义用例无 pageerror', errs);
    await ctx.close();
  }

  // C 主档损坏 → 回滚
  {
    const { ctx, page, errs } = await fresh();
    await page.evaluate(() => { const F = window.__FR; F.save.clear(); F.save.stones(111); F.save.stones(222); });
    await page.evaluate(() => window.__FR.save.corrupt());
    const broken = await page.evaluate(() => localStorage.getItem('fanren_save_v1'));
    ok(broken === '{"broken":', '主档已被写成坏 JSON', broken);

    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
    await page.waitForTimeout(1600);
    const r = await page.evaluate(() => {
      const t = document.getElementById('banner');
      return {
        saved: JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').stones,
        banner: t ? t.textContent : '',
      };
    });
    ok(r.saved === 111, '重开后从备份恢复到上一版（111）', r);
    ok(/已回滚到上一版进度/.test(r.banner), '回滚有明确横幅提示', r.banner);
    ok(errs.length === 0, '回滚用例无 pageerror', errs);
    await ctx.close();
  }

  // D 写入失败提示与重试
  {
    const { ctx, page, errs } = await fresh();
    const r = await page.evaluate(() => {
      const F = window.__FR;
      F.save.clear();
      F.save.stones(500);              // 先正常落一版，作为「旧档不该被破坏」的底
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = function () {
        const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e;
      };
      F.save.stones(999);
      const s1 = F.save.backup();
      const banner1 = (document.getElementById('banner') || {}).textContent || '';
      F.save.stones(1000);             // 再失败一次：不应重复喊
      const s2 = F.save.backup();
      const banner2 = (document.getElementById('banner') || {}).textContent || '';
      Storage.prototype.setItem = real;
      F.save.stones(1001);             // 恢复后应写进去
      const s3 = F.save.backup();
      return {
        s1, s2, s3, banner1, banner2,
        oldIntact: JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').stones,
      };
    });
    ok(r.s1.fails === 1 && r.s1.warned === true, '首次写入失败即计数并标记已提示', r.s1);
    ok(/存档未能写入/.test(r.banner1), '写入失败有明确横幅', r.banner1);
    ok(r.s2.fails === 2 && r.s2.warned === true, '连续失败继续计数', r.s2);
    ok(r.banner2 === r.banner1, '连续失败不重复刷屏（横幅没被重写）', { a: r.banner1, b: r.banner2 });
    ok(r.s3.fails === 0 && r.s3.warned === false, '恢复后失败计数归零', r.s3);
    ok(r.oldIntact === 1001, '恢复后新内容写进主档', r.oldIntact);
    ok(errs.length === 0, '失败提示用例无 pageerror', errs);
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log('\n批次15 存档耐久：' + pass + ' 项通过，' + fail + ' 项失败');
if (bad.length) { console.log('\n失败项：'); for (const b of bad) console.log('  ✗ ' + b); }
process.exit(fail ? 1 : 0);
