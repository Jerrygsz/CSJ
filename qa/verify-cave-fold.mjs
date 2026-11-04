// 洞府分组折叠验收：
//   ① 每个页签都有分组，且同一时刻只开一组（手风琴）
//   ② 点另一组 → 原来那组自动收起
//   ③ 装备组内按珍稀度降序
//   ④ 再点同一组 → 收起（只留目录）
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('页面错误：', e.message));
await p.goto('http://127.0.0.1:8123/index.html?test=1', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

await p.evaluate(() => window.__FR.save.clear());
await p.waitForTimeout(200);
await p.evaluate(() => location.reload());
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

// 灌一套「每档都有货」的存档
await p.evaluate(() => {
  const key = 'fanren_save_v1';
  const s = JSON.parse(localStorage.getItem(key) || '{}');
  const all = window.ALL_ITEMS || [];
  const inv = {};
  for (const slot of ['weapon', 'armor', 'trinket', 'talisman']) {
    for (let r = 0; r <= 5; r++) {
      const pick = all.filter(i => i.slot === slot && i.rarity === r);
      if (pick.length) inv[pick[0].id] = 1;
    }
  }
  s.inventory = inv; s.stones = 452937;
  // 功法全学一遍：只带炼气期那几门的话，「按境界分组」根本测不出多组的情形
  const sk = {};
  for (const x of (window.SKILLS || [])) sk[x.id] = 3;
  s.cultivate = { level: 92, xp: 0, skills: sk };
  s.caves = ['qixuan', 'huangfeng']; s.skin = 'guigu';
  s.unlocked = Array.from(new Set([...(s.unlocked || []), 'qixuan', 'huangfeng']));
  localStorage.setItem(key, JSON.stringify(s));
});
await p.evaluate(() => location.reload());
await p.waitForFunction(() => !!window.__FR, { timeout: 30000 });

const res = await p.evaluate(() => {
  const FR = window.__FR;
  FR.muteStory(true);
  document.body.dataset.skin = 'guigu';
  FR.cave('huangfeng');
  const out = { tabs: {}, fails: [] };

  const body = document.getElementById('caveBody');
  const folds = () => [...body.querySelectorAll('.fold')];
  const openNames = () => folds().filter(f => f.classList.contains('open'))
    .map(f => f.querySelector('.fh-name').textContent.trim());
  const names = () => folds().map(f => f.querySelector('.fh-name').textContent.trim());

  for (const t of FR.caveTabsOf('huangfeng')) {
    FR.caveTab(t);
    const n = folds().length;
    const open = openNames();
    out.tabs[t] = { folds: n, open: open.length, first: open[0] || null };
    if (t === 'equip' || t === 'skill' || t === 'alchemy' || t === 'forge' || t === 'talisman' || t === 'break') {
      if (n < 1) out.fails.push(t + '：没有分组');
      if (open.length !== 1) out.fails.push(t + '：默认开了 ' + open.length + ' 组（应为 1）');
    }
    // 有第二组就点它，验证「开一个、收其余」
    if (n >= 2) {
      const heads = body.querySelectorAll('button[data-fold-key]');
      heads[1].click();
      const o2 = openNames();
      out.tabs[t].afterClickSecond = o2;
      if (o2.length !== 1) out.fails.push(t + '：点第二组后开了 ' + o2.length + ' 组');
      else if (o2[0] !== names()[1]) out.fails.push(t + '：点第二组后开的是「' + o2[0] + '」');
      // 再点同一组 → 全收
      body.querySelectorAll('button[data-fold-key]')[1].click();
      const o3 = openNames();
      out.tabs[t].afterClickSame = o3.length;
      if (o3.length !== 0) out.fails.push(t + '：再点同一组没有收起');
    }
  }

  // 滚动位置：点靠下的组头不能把列表弹回顶部
  FR.caveTab('break');
  const bd = document.getElementById('caveBody');
  // 滚到中间（不是顶部也不是底部）：两端会被 scrollTop 钳住，测不出补偿有没有生效
  bd.scrollTop = Math.round(bd.scrollHeight * 0.45);
  const hs = [...bd.querySelectorAll('button[data-fold-key]')];
  // 断言的是「组头在屏幕上的位置」，不是 scrollTop：
  // 展开会改变内容高度，scrollTop 本来就该跟着补偿，真正要看的是那行有没有从手指底下跑掉
  const target = hs.find(h => { const r = h.getBoundingClientRect(); return r.top > 200 && r.top < 620; });
  if (target) {
    const yBefore = target.getBoundingClientRect().top;
    target.click();
    const yAfter = target.getBoundingClientRect().top;
    out.scroll = { before: Math.round(yBefore), after: Math.round(yAfter), moved: Math.round(Math.abs(yAfter - yBefore)) };
    if (out.scroll.moved > 2) out.fails.push('点组头后该行位置跳了 ' + out.scroll.moved + 'px');
  }

  // 装备组内排序：稀有度降序
  FR.caveTab('equip');
  const sortInfo = [];
  for (const f of folds()) {
    const nm = f.querySelector('.fh-name').textContent.trim();
    const rar = [...f.querySelectorAll('.gearrow .gr-main i')].map(i => i.textContent.split('·')[0].trim());
    sortInfo.push({ group: nm, rar });
  }
  out.equipSort = sortInfo;
  const RANK = { '凡品': 0, '良品': 1, '上品': 2, '珍品': 3, '至宝': 4, '仙品': 5 };
  for (const g of sortInfo) {
    const seq = g.rar.map(x => RANK[x]);
    for (let i = 1; i < seq.length; i++) if (seq[i] > seq[i - 1]) out.fails.push('装备组「' + g.group + '」稀有度没按降序');
  }
  return out;
});

console.log('各页签分组情况：');
for (const k in res.tabs) {
  const t = res.tabs[k];
  const extra = t.afterClickSecond ? `　点第二组→[${t.afterClickSecond.join('|')}]　再点→${t.afterClickSame} 组开` : '';
  console.log(`  ${k.padEnd(9)} 组数 ${String(t.folds).padStart(2)}　默认开「${t.first || '-'}」${extra}`);
}
console.log('\n装备分组（组内稀有度顺序）：');
for (const g of res.equipSort) console.log(`  ${g.group.padEnd(8)} ${g.rar.join(' → ')}`);

if (res.scroll) console.log(`\n组头位置：点击前后屏幕 y ${res.scroll.before} → ${res.scroll.after}（位移 ${res.scroll.moved}px）`);
console.log('\n' + (res.fails.length ? '✗ ' + res.fails.join('\n✗ ') : '✓ 全部通过：手风琴开合、默认单开、组内稀有度降序、不跳动'));
await b.close();
