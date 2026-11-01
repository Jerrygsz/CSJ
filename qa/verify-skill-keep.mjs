// 回归：洞府「研习」习得之法诀（teach 类，如百脉炼宝诀）应永久在册，
// 不被「打完一张图只留三门最精功法」的过图剪枝清掉。
// 用户反馈：功法研习后没点运起，换一张图再回洞府，功法被清掉、变回未学习态。
// 修复落点：learnSkill 标记 learnedManuals，pruneSkillsTop3 把「手动研习过的 + unique 传世」
// 纳入永久保留；地图临图功法（buildPlayerSkills 直写、不经 learnSkill）仍照旧可被剪。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 8999;
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
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:' + PORT + '/index.html?test=1');
await page.waitForTimeout(1200);

const results = [];
function check(cond, msg) { results.push((cond ? 'PASS ' : 'FAIL ') + msg); }

// 模拟真实路径：进一张带 5 门临图功法（sword/fire/orb/nova/frost，均 lv6、非手动研习）的图，
// 再用 learnSkill 研习百脉炼宝诀（teach，被动，不自动运起 → 正对应「没点运起」状态），
// 随后触发过图剪枝。临图功法应被裁，baimai 凭「手动研习」豁免存活。
const r = await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress();
  F.setLevel(149);                 // 化神后期
  F.enterMap('lianxu');            // 进图：buildPlayerSkills 把 5 门临图功法写入永久 skills（不经 learnSkill）
  const before = Object.assign({}, F.skillState().learned);
  F.learn('baimai');               // 洞府研习 / 化开手册 → 经 learnSkill，标记手动研习
  const beforeBaimai = Object.assign({}, F.skillState().learned);
  const pr = F.pruneNow();         // 模拟打完一张图触发的过图剪枝
  const after = Object.assign({}, F.skillState().learned);
  return { before, beforeBaimai, after, cut: pr.cut };
});

const mapSkills = ['sword', 'fire', 'orb', 'nova', 'frost'];
const mapBefore = mapSkills.filter(id => r.before[id]);
check(mapBefore.length >= 4, '进图后拿到 ≥4 门临图功法（非手动研习），剪枝有料可裁 (' + mapBefore.join(',') + ')');
check(r.beforeBaimai.baimai === 1, '研习百脉炼宝诀后入册 (beforeBaimai 含 baimai)');
check(r.after.baimai === 1, '研习过的百脉炼宝诀（没运起）过图剪枝后仍在册 (after=' + JSON.stringify(r.after) + ')');
check(r.cut >= 1, '剪枝确实执行了（临图功法被裁掉 ' + r.cut + ' 门，说明不是早退）');
const cutSome = mapSkills.some(id => r.before[id] && !r.after[id]);
check(cutSome, '至少有一门临图功法被清掉（sword/fire/orb/nova/frost），印证 baimai 凭「手动研习」豁免保命');

// 二次确认：从洞府「功法」页读真实 DOM，研习区不应把 baimai 当「未习法诀」显示
await page.evaluate(() => { const F = window.__FR; F.cave('tycave'); F.caveTab('skill'); });
await page.waitForTimeout(200);
const caveState = await page.evaluate(() => {
  const F = window.__FR;
  const learned = !!(F.skillState().learned || {}).baimai;
  const unlearnedBtn = [...document.querySelectorAll('#caveBody button[data-learn]')]
    .some(b => b.getAttribute('data-learn') === 'sk_baimai');
  return { learned, unlearnedBtn };
});
check(caveState.learned && !caveState.unlearnedBtn, '洞府「功法」页：baimai 仍显「已习」，不再出现「学习」按钮（没回退成未学习态）');

console.log(results.join('\n'));
console.log('\npage errors:', errors.length ? errors : 'none');
const failed = results.filter(x => x.startsWith('FAIL')).length;
console.log('\n' + (failed ? ('❌ ' + failed + ' 项失败') : '✅ 全部通过'));
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
