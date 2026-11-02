// 老存档·万妙丹补发 回归测试
// 背景：旧版 addCultivateXp 把升级写死 lv<150，炼虚初期即封顶；合体关要 Lv199 → 永远「修为未达」。
//       而万妙丹全篇只有广寒界授一枚（noDrop），旧版又是 0.34 概率、失败即吞 → 赌输一次即永久堵死。
// 本测试验 backfillHetiPill 的六种情形：
//   1 旧档卡炼虚(lv150)+广寒界已通+无丹            → 补 1 枚，落 gift_heti
//   2 同一存档再读一次                              → 不再重复补（仍 1 枚）
//   3 卡炼虚但身上已有万妙丹                        → 不补（落标记，数量不变）
//   4 卡炼虚但广寒界未通（丹还在玉台上）            → 不补、不落标记
//   5 已过合体(lv200)                                → 不补（落标记）
//   6 全新档(lv1，无存档)                            → 不补、不落标记
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9087;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); }
};

const SAVE_KEY = 'fanren_save_v1';
// 一条「已经走到灵界炼虚」的最小旧档：广寒界已通、天渊城洞府在册
const baseOld = (over) => Object.assign({
  version: 5,
  unlocked: ['qixuan', 'guanghan', 'tianyuan', 'heti_guan'],
  cleared: ['qixuan', 'muzu', 'guanghan'],
  mapId: 'qixuan',
  stones: 50000,
  // 合体关另需真灵之血×2 + 3 万灵石；真灵之血是可刷材料（非 noDrop），测试档按广寒界所得给足
  inventory: { m_zhenlingxue: 2 },
  caves: ['tycave'],
  cultivate: { level: 150, xp: 0, skills: { sword: 6 } }
}, over || {});

// 用给定存档打开一局，返回持久化后的 save
async function boot(saveObj) {
  const { ctx, page } = await bootPage(saveObj);
  const raw = await page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
  await ctx.close();
  return raw ? JSON.parse(raw) : null;
}
// 同上，但把 page 留着，供需要继续操作的场景用
async function bootPage(saveObj) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  if (saveObj) {
    await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [SAVE_KEY, JSON.stringify(saveObj)]);
  }
  await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
  await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });
  await page.waitForTimeout(400);   // 让读档期的一揽子迁移跑完
  return { ctx, page };
}

console.log('\n【1】旧档卡炼虚(lv150) + 广寒界已通 + 无万妙丹');
{
  const s = await boot(baseOld());
  ok(s && (s.inventory || {}).heti === 1, '补发万妙丹 1 枚', s && s.inventory);
  ok(s && s.gift_heti === true, '落一次性标记 gift_heti', s && s.gift_heti);
  ok(s && s.cultivate.level === 150, '修为不动（仍 150，由玩家自己静修/冲关）', s && s.cultivate.level);
}

console.log('\n【2】同一存档再读一次（不得重复补发）');
{
  const first = await boot(baseOld());
  const twice = await boot(first);
  ok(twice && (twice.inventory || {}).heti === 1, '再读仍是 1 枚，未叠加', twice && twice.inventory);
}

console.log('\n【3】卡炼虚但身上已有万妙丹');
{
  const s = await boot(baseOld({ inventory: { heti: 1 } }));
  ok(s && (s.inventory || {}).heti === 1, '不补，数量不变', s && s.inventory);
  ok(s && s.gift_heti === true, '落标记（不再反复判定）', s && s.gift_heti);
}

console.log('\n【4】卡炼虚但广寒界未通（丹还在玉台上）');
{
  const s = await boot(baseOld({ unlocked: ['qixuan'], cleared: ['qixuan', 'muzu'] }));
  ok(s && !(s.inventory || {}).heti, '不补（正常去广寒界取）', s && s.inventory);
  ok(s && !s.gift_heti, '不落标记（日后到炼虚仍可补）', s && s.gift_heti);
}

console.log('\n【5】已过合体(lv200)');
{
  const s = await boot(baseOld({
    cleared: ['qixuan', 'muzu', 'guanghan', 'heti_guan'],
    cultivate: { level: 200, xp: 0, skills: { sword: 7 } }
  }));
  ok(s && !(s.inventory || {}).heti, '不补（当年已正常领丹破境）', s && s.inventory);
  ok(s && s.gift_heti === true, '落标记', s && s.gift_heti);
}

console.log('\n【6】全新档（无存档）');
{
  const s = await boot(null);
  ok(s && !(s.inventory || {}).heti, '不补', s && s.inventory);
  ok(s && !s.gift_heti, '不落标记', s && s.gift_heti);
}

console.log('\n【7】端到端：旧档 150 静修→199 → 服丹破关→200');
{
  const { ctx, page } = await bootPage(baseOld());
  const r = await page.evaluate(() => {
    const bag0 = window.__FR.bag().heti || 0;
    // 静修灌修为：修好后应能一路涨到 199 并顶在合体关（breakPending = 200）
    const c1 = window.__FR.addCultXp(1e9);
    // 冲合体关（必成）
    const b = window.__FR.breakNow(200);
    const info = window.__FR.info();
    return {
      bag0, before: c1.before, after: c1.after, breakPending: c1.breakPending,
      breakOk: b && b.ok, cult: b && b.cult, bag1: window.__FR.bag().heti || 0,
      unlocked: (info.unlocked || []).length
    };
  });
  ok(r.bag0 === 1, '读档补发的万妙丹在袋中', r.bag0);
  ok(r.before === 150 && r.after === 199, '静修可把修为从 150 推到 199（旧版此处恒为 150）', { before: r.before, after: r.after });
  ok(r.breakPending === 200, '顶在合体关（breakPending = 200）', r.breakPending);
  ok(r.breakOk === true, '服丹冲关成功', r.breakOk);
  ok(r.cult === 200, '进阶合体初期（Lv200）', r.cult);
  ok(r.bag1 === 0, '万妙丹已被消耗', r.bag1);
  await ctx.close();
}

console.log('\n────────────────────────');
console.log(fail === 0 ? `全绿：${pass} 通过 / 0 失败` : `${pass} 通过 / ${fail} 失败`);
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);
