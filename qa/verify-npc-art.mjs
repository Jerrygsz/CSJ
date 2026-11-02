// 具名 NPC 外观回归：每个 NPC 一张专属精灵 + 对话小像按人对。
// 守的是两件事：① 别再退回「十几个人共用一张图」② 名字与精灵的对应别错位。
import { createRequire } from 'node:module';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
import http from 'node:http'; import fs from 'node:fs'; import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(9132, '127.0.0.1', r));
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:9132/index.html?test=1&t=' + Date.now());
await page.waitForFunction(() => !!window.__FR, { timeout: 20000 });

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

console.log('\n【1】具名 NPC 与首领各有专属精灵');
const WANT = [
  ['mo2', '墨大夫'], ['lifeiyu', '厉飞雨'], ['zhangtie', '张铁'], ['lihuayuan', '李化元'],
  ['nangongwan', '南宫婉'], ['ziling', '紫灵'], ['yuanyao', '元瑶'], ['dayan', '大衍神君'],
  ['luxiong', '陆师兄'], ['qingyan', '青颜真人'], ['rehuo', '热火仙尊'], ['jingyang', '景阳上人'],
  ['xiedaoren', '蟹道人'], ['jintong', '金童'], ['liuleer', '柳乐儿'],
  // 后期首领：原来 12 个 boss 共用一张「内门弟子」、9 个共用一张「魔修」
  ['yuehuang', '越皇'], ['liudao', '六道·万天明'], ['qianlaomo', '乾老魔'],
  ['xuangu', '玄骨上人'], ['yecha', '夜叉王'], ['yanyue', '掩月宗大长老'],
  // 二批：剩 12 位有名有姓的首领，也是「内门弟子 / 魔修 / 鬼修」三种轮换图的最后一批
  ['hanlishang', '寒骊上人'], ['longjia', '陇家老祖'], ['fujia', '付家家主'],
  ['qinglong', '青龙上人'], ['lizunzhe', '力尊者'], ['xueguang', '血光圣祖'],
  ['shouzun', '兽尊殿·魔尊'], ['yuansha', '元刹圣祖分魂'], ['guxiuhai', '守阵古修遗骸'],
  ['shiyan', '落日之墓·噬炎'], ['luanming', '鸾鸣门双修夫妇'], ['guanghan', '广寒界通灵傀儡']
];

// 同时抓每张图的像素指纹：两人撞图最容易发生在复制粘贴时（图一样、名字不同）
const sprites = await page.evaluate((names) => {
  const out = {};
  for (const n of names) {
    const c = window.Sprites[n];
    if (!c || !c.width) { out[n] = null; continue; }
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const cols = new Set();
    let opaque = 0, sig = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      opaque++;
      cols.add((d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3));
      sig = (sig * 31 + d[i] * 7 + d[i + 1] * 13 + d[i + 2]) % 1000000007;
    }
    out[n] = { w: c.width, h: c.height, colors: cols.size, opaque, sig };
  }
  return out;
}, WANT.map(w => w[0]));

for (const [key, label] of WANT) {
  const s = sprites[key];
  ok(s && s.w >= 12 && s.h >= 14, label + '（' + key + '）有专属精灵且尺寸够画细节', s && [s.w, s.h]);
  ok(s && s.colors >= 4, label + ' 用色 ≥4（不是空壳/单色块）', s && s.colors);
}
const sigs = WANT.map(([k]) => sprites[k] && sprites[k].sig).filter(Boolean);
ok(new Set(sigs).size === WANT.length, WANT.length + ' 张形象互不相同（无复制粘贴撞图）', { unique: new Set(sigs).size, want: WANT.length });

// 水墨皮最容易翻车的一处：四个"白袍"在墨阶下会不会并成同一档。
// 判据取每张图出现最多的非轮廓色（也就是袍色），要求四人不撞。
console.log('\n【1b】水墨皮：近中性色靠"淡彩"仍分得开');
const robeTone = await page.evaluate((names) => {
  window.__FR.skin('guigu');
  const out = {};
  for (const n of names) {
    const c = window.Sprites[n];
    if (!c) { out[n] = null; continue; }
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const cnt = new Map();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (lum < 70) continue;                     // 轮廓/浓墨不算袍色
      const k = (d[i] >> 2) + ',' + (d[i + 1] >> 2) + ',' + (d[i + 2] >> 2);
      cnt.set(k, (cnt.get(k) || 0) + 1);
    }
    let best = null, bn = -1;
    for (const [k, v] of cnt) if (v > bn) { bn = v; best = k; }
    out[n] = { tone: best, n: bn };
  }
  return out;
}, ['nangongwan', 'jingyang', 'luxiong', 'yanyue']);
const WHITES = [['nangongwan', '南宫婉'], ['jingyang', '景阳上人'], ['luxiong', '陆师兄'], ['yanyue', '掩月宗大长老']];
for (const [k, label] of WHITES) {
  ok(robeTone[k] && robeTone[k].tone, '水墨皮 ' + label + ' 取得到袍色', robeTone[k]);
}
const tones = WHITES.map(([k]) => robeTone[k] && robeTone[k].tone);
ok(new Set(tones).size === WHITES.length, '四个白袍人物在墨阶下互不同色（淡彩生效）', tones);

// 1px 识别特征不能贴最外缘：贴边会被补的浓墨轮廓整格覆盖（陇家金肩章/鸾鸣赤凤羽/元刹双角都这么丢过）
const edgeFeat = await page.evaluate(() => {
  const topLum = (n) => {
    const c = window.Sprites[n];
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let mx = 0;
    for (let x = 0; x < c.width; x++) {
      const i = x * 4;
      if (d[i + 3] < 8) continue;
      mx = Math.max(mx, (d[i] + d[i + 1] + d[i + 2]) / 3);
    }
    return mx;
  };
  return { horn: topLum('yuansha'), plain: topLum('xuangu') };
});
ok(edgeFeat.horn > 100, '元刹分魂头顶的双角在墨化后仍有亮度（没被轮廓吃掉）', edgeFeat);
ok(edgeFeat.horn > edgeFeat.plain + 50, '有角与无角两张图在头顶行上亮度不同（角真的画上去了）', edgeFeat);

console.log('\n【2】人物与精灵的对应没错位');
// 墨大夫的 boss 必须用 mo2（用回 mo 就变成魔修脸）
await page.evaluate(() => {
  window.__FR.skin('jin');
  window.__FR.enterMap('mishi');
  window.__FR.G.state = 'play';
  window.__FR.skipStory(); window.__FR.muteStory(true);
});
await page.waitForTimeout(500);
const moSpr = await page.evaluate(() => {
  window.__FR.boss();
  return window.__FR.G.boss ? window.__FR.G.boss.spr : null;
});
ok(moSpr === 'mo2', '墨大夫出场用专属精灵 mo2（不是共用的魔修 mo）', moSpr);

// 首领图是直接写在地图数据里的，光有精灵不算数 —— 数据没改就还是那张轮换图。
// 逐条扫源文件，断言"名字出现的那一行"上的 spr 就是专属的那张。
console.log('\n【2b】首领数据指向专属精灵（不是画了没用上）');
const BOSS_SPR = [
  ['js/late2.js', '寒骊上人', 'hanlishang'], ['js/lingjie.js', '陇家老祖', 'longjia'],
  ['js/late2.js', '付家家主', 'fujia'], ['js/lingjie.js', '青龙上人', 'qinglong'],
  ['js/lingjie.js', '力尊者', 'lizunzhe'], ['js/lingjie.js', '血光圣祖', 'xueguang'],
  ['js/lingjie.js', '兽尊殿', 'shouzun'], ['js/late2.js', '元刹圣祖', 'yuansha'],
  ['js/late.js', '守阵古修', 'guxiuhai'], ['js/lingjie.js', '噬炎', 'shiyan'],
  ['js/late2.js', '鸾鸣门', 'luanming'], ['js/lingjie.js', '通灵傀儡', 'guanghan']
];
for (const [file, who, spr] of BOSS_SPR) {
  const src = fs.readFileSync(join(root, file), 'utf8').split('\n');
  const hits = src.filter(l => l.includes(who) && l.includes('spr:'));
  const okAll = hits.length > 0 && hits.every(l => l.includes("spr: '" + spr + "'"));
  ok(okAll, who + ' 出场用 ' + spr, hits.map(l => (l.match(/spr: '[^']+'/) || [''])[0]));
}

console.log('\n【3】对话小像：按人对，不按人不出');
async function faceOf(who, text, skin) {
  return await page.evaluate(({ who, text, skin }) => {
    window.__FR.skin(skin);
    window.__FR.showLines([[who, text]], null, null);
    const box = document.getElementById('dialogbox');
    const cv = document.getElementById('faceCv');
    const g = cv.getContext('2d');
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, sig = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 8) { opaque++; sig = (sig * 31 + d[i] * 7 + d[i + 1] * 13 + d[i + 2]) % 1000000007; } }
    const r = {
      has: box.classList.contains('has-face'),
      disp: getComputedStyle(document.getElementById('dialogFace')).display,
      w: cv.width, h: cv.height, opaque, sig
    };
    document.getElementById('dialog').style.display = 'none';
    return r;
  }, { who, text, skin });
}

const moFace = await faceOf('墨大夫', '练不到第四层，莫来见我。', 'guigu');
ok(moFace.has && moFace.disp !== 'none', '墨大夫说话：出小像', moFace);
ok(moFace.opaque > 60, '小像真的画上了像素（不是空框）', moFace.opaque);

const ngFace = await faceOf('南宫婉', '这一次，算我欠你一个人情。', 'guigu');
ok(ngFace.has && ngFace.sig !== moFace.sig, '换一个人：小像跟着换（不是固定一张）', { mo: moFace.sig, ng: ngFace.sig });

const npFace = await faceOf('旁白', '山道那头，厉飞雨正等着。', 'guigu');
ok(!npFace.has, '旁白/路人：不出小像（框不留空位）', npFace);

// 切皮：同一人物的像要按新皮肤重画。不重画的话界面翻成纸了、头像还是彩色的
const before = await page.evaluate(() => {
  window.__FR.skin('guigu');
  window.__FR.showLines([['厉飞雨', '演武场，木剑对木剑。']], null, null);
  const cv = document.getElementById('faceCv'), g = cv.getContext('2d');
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  let s = 0; for (let i = 0; i < d.length; i += 4) s = (s * 31 + d[i] * 7 + d[i + 1] * 13 + d[i + 2]) % 1000000007;
  return s;
});
const after = await page.evaluate(() => {
  window.__FR.skin('jin');   // applySkin 内部应触发头像重画
  const cv = document.getElementById('faceCv'), g = cv.getContext('2d');
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  let s = 0; for (let i = 0; i < d.length; i += 4) s = (s * 31 + d[i] * 7 + d[i + 1] * 13 + d[i + 2]) % 1000000007;
  document.getElementById('dialog').style.display = 'none';
  return s;
});
ok(before !== after, '战斗中切皮：小像跟着重画（不会留一张彩色像在纸上）', { before, after });

console.log('\n────────────────────────');
if (fail === 0) console.log('全绿：' + pass + ' 通过 / 0 失败');
else console.log('失败：' + pass + ' 通过 / ' + fail + ' 失败');
await browser.close(); server.close();
process.exit(fail === 0 ? 0 : 1);
