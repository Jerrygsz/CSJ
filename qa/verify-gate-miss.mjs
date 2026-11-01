import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = 'C:/Users/92997/WorkBuddy/2026-10-21-22-38-39/fanren';
const PORT = 9123;
const MIME = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8' };
const server = http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const f=join(root,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){rs.writeHead(404);rs.end('404');return;}rs.writeHead(200,{'Content-Type':MIME[f.substring(f.lastIndexOf('.'))]||'application/octet-stream'});fs.createReadStream(f).pipe(rs);});
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
const browser = await chromium.launch({ channel:'chrome' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:'+PORT+'/index.html?test=1');
await page.waitForTimeout(1000);

let pass = 0, fail = 0;
function check(c, m) { if (c) { pass++; console.log('✓', m); } else { fail++; console.log('✗', m); } }

// 进「安远城外·五行合一(lianxu, endLevel=150)」后读真实横幅文案
async function enterAndBanner(setupFn) {
  await page.evaluate(setupFn);
  await page.evaluate(() => window.__FR.enterMap('lianxu'));
  await page.waitForTimeout(1700); // 等入口横幅 setTimeout(1400) 触发
  return await page.evaluate(() => (document.getElementById('banner') || {}).textContent || '');
}

// 场景 A：化神后期·小成（lv140），功法/灵石/丹/剧情都齐 —— 缺口应为「修为」，横幅须说修为未达，而非「物未齐」
const bannerA = await enterAndBanner(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(140); F.learn('baimai'); F.clearMap('minghe');
  F.addItem('tenglong', 1); F.setStones(2230942);
});
console.log('A·横幅:', bannerA);
check(/修为未达\s*化神后期·巅峰/.test(bannerA), 'A·化神后期·小成进门：横幅报「修为未达·巅峰」，不再谎称「物未齐」');
check(!/破境之物未齐/.test(bannerA), 'A·横幅不含误导文案「破境之物未齐」');
const missA = await page.evaluate(() => window.__FR.breakMiss(150));
check(missA.length === 1 && /修为未达/.test(missA[0]), 'A·breakMiss 仅 1 项且为修为（功法/丹/石/剧情均齐）');

// 场景 B：已到化神后期·巅峰（lv149）—— 全部齐，不应再有「未齐/未达」横幅
const bannerB = await enterAndBanner(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(149); F.learn('baimai'); F.clearMap('minghe');
  F.addItem('tenglong', 1); F.setStones(2230942);
});
console.log('B·横幅:', bannerB);
check(!/未齐|未达/.test(bannerB), 'B·化神后期·巅峰进门：无「未齐/未达」横幅（已齐全，可冲关）');

// 场景 C：lv149 但缺腾龙丹 + 冥河未通 —— 横幅须具体列出缺的物
const bannerC = await enterAndBanner(() => {
  const F = window.__FR;
  F.clearProgress(); F.setLevel(149); F.learn('baimai'); F.setStones(2230942);
  // 不 clearMap minghe、不 addItem tenglong
});
console.log('C·横幅:', bannerC);
check(/破境之物未齐（还差 2 样：腾龙丹×1、先通关·灵界·黑隐山脉 洞府）/.test(bannerC), 'C·缺丹+缺剧情：横幅具体列出「腾龙丹×1、先通关·灵界·黑隐山脉 洞府」');

console.log('\n结果: ' + pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
