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
  ['shiyan', '落日之墓·噬炎'], ['luanming', '鸾鸣门双修夫妇'], ['guanghan', '广寒界通灵傀儡'],
  // 三批：原著外貌最硬的 12 位。仙界篇 7 位此前全共用「魔修 mo」，
  // 反而比灵界首领更没辨识度 —— 这批的核心就是「火发/绿发/雪袍/黑须」各自站住
  ['jinguang', '金光上人'], ['xiongsiwang', '凶司王'], ['tuntian', '吞天圣祖'],
  ['guimu', '鬼木'], ['baimu', '百目天鬼'], ['guhuang', '骨皇'],
  ['xiaojinhan', '萧晋寒'], ['dongfangbai', '东方白'], ['qimozi', '奇摩子'],
  ['miaofa', '妙法仙尊'], ['donglihu', '东离虎'], ['guhuojin', '古或今'],
  // 四批：有原著硬外貌的 14 位（第二档）。查不到描写的 10 位（黑枭王/佛骨王/紫杉/
  // 大罗鬼王/第一魔尊/天外魔君/米尊者/天象尊者/古魔主魂/银阶木族）继续共用轮换图，
  // 这不是漏做，是没有依据就不画
  ['yuanyan', '元魇始祖'], ['baohua', '宝花圣祖'], ['huangyuanzi', '黄元子'],
  ['yinchiyecha', '银翅夜叉'], ['aoxiao', '敖啸老祖'], ['zhiyang', '至阳上人'],
  ['liuzizai', '柳自在'], ['bumietianzun', '不灭天尊'], ['guilingzi', '鬼灵子'],
  ['lufuren', '陆夫人'], ['maliang', '马良'], ['miaohe', '妙鹤真人'],
  ['lengyan', '冷焰老祖'], ['heitian', '黑天魔祖'],
  // 第三档兽形（16x16 画布：12x14 的 168 格装不下非人形）
  ['moyuanbeast', '魔金山脉·魔猿'], ['mingchong', '螟虫之母·元神'], ['xiuluo', '修罗蛛·族母']
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

// 这批新增的三件浅色袍：宝花是冷白裙、至阳是冷白道袍（原象牙白被 inkPixel 判成肤色，
// 和脸同色成了实心米板）、马良是淡金白。三件"白"必须还在三个档上
const whites2 = await page.evaluate((names) => {
  window.__FR.skin('guigu');
  const out = {};
  for (const n of names) {
    const c = window.Sprites[n];
    if (!c) { out[n] = null; continue; }
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const cnt = new Map();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 40) continue;
      const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2];
      cnt.set(k, (cnt.get(k) || 0) + 1);
    }
    // 袍色 = 最亮的那个高频色（脸比袍子暗一档，取最亮就跳过脸）
    let best = null, bl = -1;
    for (const [k, v] of cnt) {
      if (v < 10) continue;
      const [r, g, b] = k.split(',').map(Number);
      const l = (r + g + b) / 3;
      if (l > bl) { bl = l; best = k; }
    }
    out[n] = best;
  }
  return out;
}, ['baohua', 'zhiyang', 'maliang']);
const w2 = ['baohua', 'zhiyang', 'maliang'].map(k => whites2[k]);
ok(w2.every(Boolean), '宝花/至阳/马良 取得到袍色', whites2);
ok(new Set(w2).size === 3, '宝花冷白 / 至阳冷白 / 马良淡金白 三件白袍互不同色', w2);

// 黑袍角色最大的坑：色值明度低于 0.13 会被 inkPixel 一开始就判成浓墨，
// 整件袍子消失，只剩脸浮在黑块上（元魇第一版就是这样）。抬到 0.17 才留得住紫/青
const darkRobe = await page.evaluate(() => {
  window.__FR.skin('guigu');
  // 取袍身正中那一格（不是"最高频色"——最高频永远是浓墨描边）
  const at = (n, x, y) => {
    const c = window.Sprites[n];
    const d = c.getContext('2d').getImageData(x, y, 1, 1).data;
    return d[0] + ',' + d[1] + ',' + d[2];
  };
  return { yuanyan: at('yuanyan', 5, 10), lufuren: at('lufuren', 5, 10), heitian: at('heitian', 5, 9) };
});
// 32,29,24 就是浓墨本体。元魇/陆夫人必须比它亮，黑天则本来就该是浓墨
ok(darkRobe.yuanyan !== '32,29,24', '元魇的黑袍墨化后不是纯浓墨（墨里透紫）', darkRobe.yuanyan);
ok(darkRobe.lufuren !== '32,29,24', '陆夫人的黑袍墨化后不是纯浓墨（墨里透青）', darkRobe.lufuren);
ok(darkRobe.yuanyan !== darkRobe.lufuren, '元魇的紫与陆夫人的青在墨阶下不同色', darkRobe);

// 黄元子的白须第一版用了 #d8d0c0，hsl 正好落进"肤色"判定，墨化后和枯黄脸一模一样，
// 须整个消失。改成冷灰走淡彩才分得开
const beard = await page.evaluate(() => {
  window.__FR.skin('guigu');
  const c = window.Sprites.huangyuanzi;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const at = (x, y) => { const i = (y * c.width + x) * 4; return d[i] + ',' + d[i + 1] + ',' + d[i + 2]; };
  return { face: at(5, 4), beard: at(5, 6) };
});
ok(beard.face !== beard.beard, '黄元子的白须与枯黄脸在墨阶下不同色（须没消失）', beard);

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
  ['js/late2.js', '鸾鸣门', 'luanming'], ['js/lingjie.js', '通灵傀儡', 'guanghan'],
  // 三批：仙界篇 7 位 + 人界/灵界 5 位。仙界篇原本全挂在「mo」上 ——
  // 6 个最高境界的道祖共用一张黑魔修图，是整份名单里最不合理的撞图
  ['js/maps.js', '金光上人', 'jinguang'], ['js/lingjie.js', '凶司王', 'xiongsiwang'],
  ['js/lingjie.js', '吞天圣祖', 'tuntian'], ['js/xianjie.js', '鬼木', 'guimu'],
  ['js/xianjie.js', '百目天鬼', 'baimu'], ['js/xianjie.js', '骨皇', 'guhuang'],
  ['js/xianjie.js', '萧晋寒', 'xiaojinhan'], ['js/xianjie.js', '东方白', 'dongfangbai'],
  ['js/xianjie.js', '奇摩子', 'qimozi'], ['js/xianjie.js', '妙法仙尊', 'miaofa'],
  ['js/xianjie.js', '东离虎', 'donglihu'], ['js/xianjie.js', '古或今', 'guhuojin'],
  // 四批：14 张精灵铺到 16 个 boss 位（元魇两张化身、马良两个形态各共用一张）
  ['js/late.js', '妙鹤真人', 'miaohe'], ['js/late2.js', '陆夫人', 'lufuren'],
  ['js/late2.js', '银翅夜叉', 'yinchiyecha'], ['js/late2.js', '敖啸老祖', 'aoxiao'],
  ['js/late2.js', '至阳上人', 'zhiyang'], ['js/lingjie.js', '元魇始祖', 'yuanyan'],
  ['js/lingjie.js', '宝花圣祖', 'baohua'], ['js/lingjie.js', '元魇圣祖', 'yuanyan'],
  ['js/lingjie.js', '黄元子', 'huangyuanzi'], ['js/lingjie.js', '不灭天尊', 'bumietianzun'],
  ['js/lingjie.js', '马良·真仙之身', 'maliang'], ['js/lingjie.js', '马良·九元观真仙', 'maliang'],
  ['js/xianjie.js', '冷焰老祖', 'lengyan'], ['js/xianjie.js', '黑天魔祖', 'heitian'],
  ['js/xianjie.js', '柳自在', 'liuzizai'], ['js/xianjie.js', '鬼灵子', 'guilingzi'],
  // 五批：第三档兽形。此前 9 个 beast 型 boss 全共用 haishou（16x10 横躺的蛟龙），
  // 拿横躺的蛟去当站立的魔猿/虫母/蛛母，是形状层面的错，比撞色严重
  ['js/lingjie.js', '魔金山脉·魔猿', 'moyuanbeast'],
  ['js/lingjie.js', '螟虫之母·元神', 'mingchong'],
  ['js/lingjie.js', '修罗蛛·族母', 'xiuluo']
];
for (const [file, who, spr] of BOSS_SPR) {
  const src = fs.readFileSync(join(root, file), 'utf8').split('\n');
  const hits = src.filter(l => l.includes(who) && l.includes('spr:'));
  const okAll = hits.length > 0 && hits.every(l => l.includes("spr: '" + spr + "'"));
  ok(okAll, who + ' 出场用 ' + spr, hits.map(l => (l.match(/spr: '[^']+'/) || [''])[0]));
}

// 兽形这三张的成败全在几何关系上（肉眼看不准），直接量像素：
// ① 魔猿三只角都要立住 —— 角如果被 outline 的浓墨轮廓吃掉，头顶就成一条黑边；
// ② 螟虫之母的头要比身体宽一倍，那是「女童」唯一的读法；
// ③ 修罗蛛的蛛腹要比上身宽，剪影才不是「一个人」。
console.log('\n【2b2】兽形几何关系');
const beast = await page.evaluate(() => {
  window.__FR.skin('jin');
  const W = (n) => window.Sprites[n].width;
  const scanRow = (n, y) => {
    const c = window.Sprites[n];
    const d = c.getContext('2d').getImageData(0, y, c.width, 1).data;
    const out = [];
    for (let x = 0; x < c.width; x++) if (d[x * 4 + 3] > 40) out.push(x);
    return out;
  };
  // 魔猿：第 0 行是三个角尖，必须是三簇互不相连的像素
  const r0 = scanRow('moyuanbeast', 0);
  const groups = [];
  for (const x of r0) {
    if (groups.length && x - groups[groups.length - 1][groups[groups.length - 1].length - 1] === 1) {
      groups[groups.length - 1].push(x);
    } else groups.push([x]);
  }
  // 螟虫之母：头最宽那行 vs 身体最宽那行
  const widthAt = (n, y) => scanRow(n, y).length;
  const mc = window.Sprites.mingchong;
  const mcHead = Math.max(...[3, 4, 5].map(y => widthAt('mingchong', y)));
  const mcBody = Math.max(...[9, 10, 11].map(y => widthAt('mingchong', y)));
  // 修罗蛛：上身（r7）vs 蛛腹（r11）
  const xlUp = widthAt('xiuluo', 7);
  const xlBelly = widthAt('xiuluo', 11);
  // 螟虫之母：头高 = 从顶行到下颌（身体第一行之前那行）
  const mcH = window.Sprites.mingchong.height;
  let headRows = 0;
  for (let y = 0; y < mcH; y++) {
    if (widthAt('mingchong', y) > 6) headRows++;   // 宽过 6 的行算头部
  }
  return { hornGroups: groups.length, r0, mcHead, mcBody, headRows, mcH, xlUp, xlBelly };
});
ok(beast.hornGroups === 3, '魔猿头顶三只角在墨轮廓下各自独立（没被吃成一条黑边）', beast);
// 儿童与成人的差别主要是头占全身的比例（成人约 1/7，幼儿可到 1/2），
// 比「头宽 vs 身宽」更接近这件事本身
ok(beast.mcHead >= beast.mcBody * 1.6, '螟虫之母的头明显宽于身体', { head: beast.mcHead, body: beast.mcBody });
ok(beast.headRows / beast.mcH >= 0.5, '螟虫之母的头占全身一半以上（女童头身比，成人约 1/7）', { headRows: beast.headRows, total: beast.mcH });
ok(beast.xlBelly > beast.xlUp, '修罗蛛的蛛腹比上身宽（剪影不是「一个人」）', { up: beast.xlUp, belly: beast.xlBelly });

// 仙界篇此前 14 个首领零专属，是整份名单里覆盖率最低的一段。
// 这里只钉住「已画的必须一直在用」，避免哪天又被改回通用图。
console.log('\n【2c】仙界篇专属覆盖率');
const XJ_OWN = ['guhuojin', 'qimozi', 'miaofa', 'dongfangbai', 'donglihu',
  'xiaojinhan', 'guimu', 'guhuang', 'baimu'];
const xjLines = fs.readFileSync(join(root, 'js/xianjie.js'), 'utf8').split('\n');
let xjOwned = 0, xjTotal = 0;
for (const l of xjLines) {
  if (!/boss/i.test(l)) continue;
  for (const m of l.matchAll(/spr:\s*'([^']*)'/g)) {
    xjTotal++;
    if (XJ_OWN.includes(m[1])) xjOwned++;
  }
}
ok(xjOwned >= 9, '仙界篇已有 ' + xjOwned + '/' + xjTotal + ' 个首领用专属外观', { xjOwned, xjTotal });

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
