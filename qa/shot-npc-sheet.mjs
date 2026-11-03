import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
import http from 'node:http'; import fs from 'node:fs'; import { join } from 'node:path';
const root = 'C:/Users/92997/WorkBuddy/2026-10-21-22-38-39/fanren';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(9130, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:9130/index.html?test=1&t=' + Date.now());
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

const LIST = [
  ['mo2', '墨大夫'], ['lifeiyu', '厉飞雨'], ['zhangtie', '张铁'], ['lihuayuan', '李化元'],
  ['nangongwan', '南宫婉'], ['ziling', '紫灵'], ['yuanyao', '元瑶'], ['dayan', '大衍神君'],
  ['luxiong', '陆师兄'], ['qingyan', '青颜真人'], ['rehuo', '热火仙尊'], ['jingyang', '景阳上人'],
  ['xiedaoren', '蟹道人'], ['jintong', '金童'], ['liuleer', '柳乐儿'],
  ['hanli', '韩立（主角）'], ['wangchan', '王蝉'], ['linmo', '林师兄'],
  ['yuehuang', '越皇'], ['liudao', '六道·万天明'], ['qianlaomo', '乾老魔'],
  ['xuangu', '玄骨上人'], ['yecha', '夜叉王'], ['yanyue', '掩月宗大长老'],
  ['hanlishang', '寒骊上人'], ['longjia', '陇家老祖'], ['fujia', '付家家主'],
  ['qinglong', '青龙上人'], ['lizunzhe', '力尊者'], ['xueguang', '血光圣祖'],
  ['shouzun', '兽尊殿·魔尊'], ['yuansha', '元刹圣祖分魂'], ['guxiuhai', '守阵古修遗骸'],
  ['shiyan', '落日之墓·噬炎'], ['luanming', '鸾鸣门双修夫妇'], ['guanghan', '广寒界通灵傀儡'],
  // 第一档补画：原著描写最硬的 12 位（此前全共用「魔修/鬼修」轮换图）
  ['jinguang', '金光上人'], ['xiongsiwang', '凶司王'], ['tuntian', '吞天圣祖'],
  ['guimu', '鬼木'], ['baimu', '百目天鬼'], ['guhuang', '骨皇'],
  ['xiaojinhan', '萧晋寒'], ['dongfangbai', '东方白'], ['qimozi', '奇摩子'],
  ['miaofa', '妙法仙尊'], ['donglihu', '东离虎'], ['guhuojin', '古或今'],
  // 第二档：原著有硬外貌的 14 位（此前共用「魔修/内门/女修/鬼修」）
  ['yuanyan', '元魇始祖'], ['baohua', '宝花圣祖'], ['huangyuanzi', '黄元子'],
  ['yinchiyecha', '银翅夜叉'], ['aoxiao', '敖啸老祖'], ['zhiyang', '至阳上人'],
  ['liuzizai', '柳自在'], ['bumietianzun', '不灭天尊'], ['guilingzi', '鬼灵子'],
  ['lufuren', '陆夫人'], ['maliang', '马良'], ['miaohe', '妙鹤真人'],
  ['lengyan', '冷焰老祖'], ['heitian', '黑天魔祖'],
  // 第三档兽形（16x16 画布：12x14 的 168 格装不下非人形）
  ['moyuanbeast', '魔金山脉·魔猿'], ['mingchong', '螟虫之母·元神'], ['xiuluo', '修罗蛛·族母'],
  // 第五档：类型骨架 + 原著写明的九尾白狐
  ['liuqi', '柳岐老祖·九尾白狐'], ['beast4', '兽骨架·中型'], ['beast4big', '兽骨架·大型'],
  ['beast4low', '兽骨架·低伏'], ['woodling', '银阶木族']
];

async function sheet(skin, out) {
  await page.evaluate(({ skin, LIST }) => {
    window.__FR.skin(skin);
    document.getElementById('dialog').style.display = 'none';
    document.getElementById('title') && (document.getElementById('title').style.display = 'none');
    document.querySelectorAll('.overlay').forEach(e => { if (e.id !== 'dialog') e.style.display = 'none'; });
    let box = document.getElementById('__sheet');
    if (!box) { box = document.createElement('div'); box.id = '__sheet'; document.body.appendChild(box); }
    box.style.cssText = 'position:absolute;top:0;left:0;right:0;z-index:99999;background:' +
      (skin === 'guigu' ? '#e8e2d0' : '#10131a') +
      ';display:flex;flex-wrap:wrap;gap:10px;padding:20px;align-content:flex-start;font-family:sans-serif';
    box.innerHTML = '';
    for (const [key, label] of LIST) {
      const spr = window.Sprites[key];
      if (!spr) continue;
      const cell = document.createElement('div');
      cell.style.cssText = 'width:96px;text-align:center';
      const c = document.createElement('canvas');
      c.width = spr.width; c.height = spr.height;
      c.style.cssText = 'width:84px;height:auto;image-rendering:pixelated';
      c.getContext('2d').drawImage(spr, 0, 0);
      const t = document.createElement('div');
      t.textContent = label;
      t.style.cssText = 'font-size:11px;margin-top:2px;color:' + (skin === 'guigu' ? '#2b261c' : '#cfd6e0');
      cell.appendChild(c); cell.appendChild(t); box.appendChild(cell);
    }
  }, { skin, LIST });
  await page.waitForTimeout(400);
  // 人物已到 62 个，fixed 布局会被视口切掉最后一行；改成整页截图
  const h = await page.evaluate(() => document.getElementById('__sheet').getBoundingClientRect().height);
  await page.setViewportSize({ width: 1100, height: Math.max(900, Math.ceil(h) + 20) });
  await page.waitForTimeout(250);
  await page.screenshot({ path: root + '/qa/' + out, fullPage: true });
}
await sheet('guigu', 'shot-npc-sheet-guigu.png');
await sheet('jin', 'shot-npc-sheet-jin.png');
await browser.close(); server.close(); process.exit(0);
