// 第 35 闸：人界角色 / 群众精灵库（前两批）
// 守的是「素材能用于后续剧情动画」这件事，不是某几张图长什么样：
//   ① 名字与考据口径：舞岩 / 余子童 / 曲魂等按原著，厉飞雨正名不写错，王侠 / 乌龙 / 马亮这种原著没有的不画。
//      七玄门后期（ch29–99）：金光上人 / 张袖儿 / 三位师叔 / 李长老等按原著，王绝楚 / 贾天龙 / 厉飞雨 / 曲魂复用不重画。
//   ② 两张皮都能取到：金皮原色 + 鬼谷墨化，尺寸不变、不是空白、饱和差到位。
//   ③ 路人剪影分得开：头巾 / 草帽 / 斗笠 / 方巾 / 光头 / 面甲 / 扁担各有其一，不靠纯换色。
//   ④ 构建清单收录：sprites.js 本就在主包里，但 REN_ROSTER / CROWD_ROSTER 要能运行时取到。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http'; import fs from 'node:fs';
const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9337;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, l, extra) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); } };

const src = fs.readFileSync(join(root, 'js/sprites.js'), 'utf8');
ok(src.indexOf('\r\n') < 0, 'sprites.js 保持 LF（CRLF 会让正则与 diff 失真）', null);

// ① 考据口径：只列原著真有的人物；错名 / 无据人物一律不许入库
const REN_NAMES = ['sanshu','wuyan','yuetangzhu','wanghufa','zhangjun','wumingrui','yuzitong','quhun',
  'wangjuechu','jiatianlong','sunergou','yanfuren','moyuzhu','mocaihuan','mofengwu','yange',
  'wanshanxiao','zhonglingdao','tianbuli','nieying','dongxuaner','yanyu','yanruyan','xinyin','linghu',
  'jinguangshangren','zhangxiuer','huishishu','rushishu','luosaihu','lizhanglao',
  'zhaozhanglao','marong','lanyizhifa','wangqinxin','hanxiaomei','yunchi',
  'xiangzhili','fengyue','zhongwu','yukun','songmeng','wuxuan',
  'heixiong','lieru','liuru','wangru',
  'shenzhongshan','qianjin','fanju','shensan','xiaojinzhi'];
const CROWD_NAMES = ['cunfu','cunpo','zayi','xiaofan','tanzhu','huojie','kuli','chefu','chuanfu',
  'shusheng','daoshi','heshang','tongzi','jintongzi','tiewei','peijiu1','peijiu2'];
const REN1 = REN_NAMES.slice(0, 25), REN2 = REN_NAMES.slice(25, 37), REN3 = REN_NAMES.slice(37, 43);
const REN4 = REN_NAMES.slice(43, 47), REN5 = REN_NAMES.slice(47);
ok(REN1.every(n => src.includes("name: '" + n + "'")),
   '第一批 25 位人界具名人物全部登记（按原著考据）', null);
ok(REN2.every(n => src.includes("name: '" + n + "'")) && REN2.length === 12,
   '第二批 12 位七玄门后期人物全部登记（ch29–99 考据）', null);
ok(REN3.every(n => src.includes("name: '" + n + "'")) && REN3.length === 6,
   '第三批 6 位血色试炼 / 黄枫谷同门全部登记（ch170–240 考据）', null);
// 第四批：嘉元城 / 墨府（ch100~118）。黑熊是黑水巷围杀韩立的那名散修；
// 李氏 / 刘氏 / 王氏是墨居仁另外三房妾室，与严氏同场听遗书，缺一张那场戏就少三个人。
ok(REN4.every(n => src.includes("name: '" + n + "'")) && REN4.length === 4,
   '第四批 4 位嘉元城 / 墨府人物全部登记（ch100–118 考据）', REN4);
// 第五批：四平帮（ch120~122，潇湘院）。沈重山 / 钱进 / 范沮 / 沈三 / 小金芝五个都有台词，
// 少一个包房里那场「试吃」就推不下去 —— 尤其沈三那句「慢着，胖子！」是整场的转折。
ok(REN5.every(n => src.includes("name: '" + n + "'")) && REN5.length === 5,
   '第五批 5 位四平帮 / 潇湘院人物全部登记（ch120–122 考据）', REN5);
ok(CROWD_NAMES.every(n => src.includes("name: '" + n + "'")) && CROWD_NAMES.length === 17,
   '第一批 15 类路人 / 群众 + 2 名陪酒女子全部登记', null);
ok(!REN_NAMES.concat(CROWD_NAMES).some(n => ['wangxia','wulong','maliang'].includes(n))
   && !/\bwangxia['"]|\byulong['"]/i.test(src),
   '原著无据的「王侠 / 乌龙 / 马亮」不做成精灵（既有库 maliang 不属本批）', null);
ok(/name: 'jinguangshangren'/.test(src) && /name: 'zhangxiuer'/.test(src)
   && /name: 'lizhanglao'/.test(src) && /name: 'yunchi'/.test(src),
   '金光上人 / 张袖儿 / 李长老 / 云翅鸟按原著独立成精灵', null);
ok(/name: 'huishishu'/.test(src) && /name: 'rushishu'/.test(src) && /name: 'luosaihu'/.test(src),
   '落日峰三位师叔（灰衣剑客 / 儒衫 / 络腮胡）各自成形', null);
ok(!/name: 'wangjuechu2'|name: 'jiatianlong2'|name: 'lifeiyu2'|name: 'quhun2'/.test(src),
   '王绝楚 / 贾天龙 / 厉飞雨 / 曲魂复用既有精灵，不重画', null);
ok(/name: 'lifeiyu'/.test(src) && !/name: 'lifeiyu2'/.test(src),
   '厉飞雨沿用既有精灵，正名口径不重画（原著无「厉飞羽」）', null);
ok(/name: 'quhun'/.test(src) && /name: 'yuzitong'/.test(src),
   '曲魂（张铁尸身）与余子童都有独立精灵', null);

// ② 浏览器实测：两张皮都能取、尺寸一致、非空白、墨化有差
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?t=${Date.now()}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.REN_ROSTER && !!window.CROWD_ROSTER && !!window.__FR);
const probe = await page.evaluate(() => {
  const all = window.REN_ROSTER.concat(window.CROWD_ROSTER);
  const mean = (cv) => {
    const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
    let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const mx = Math.max(d[i], d[i+1], d[i+2]), mn = Math.min(d[i], d[i+1], d[i+2]);
      s += mx === 0 ? 0 : (mx - mn) / mx; n++;
    }
    return n ? s / n : 0;
  };
  window.__FR.skin('jin');
  const jin = all.map(x => ({ n: x.name, cv: window.Sprites[x.name] }));
  const jinSat = jin.map(o => mean(o.cv)), dimJin = jin.map(o => o.cv.width + 'x' + o.cv.height);
  window.__FR.skin('guigu');
  const inks = all.map(x => window.Sprites[x.name]);
  const inkSat = inks.map(mean), dimInk = inks.map(s => s.width + 'x' + s.height);
  const same = jin.filter((o, i) => o.cv === inks[i]).map(o => o.n);
  const blanks = all.filter((x, i) => !jin[i].cv.width || !jin[i].cv.height || inkSat[i] === 0).map(x => x.name);
  window.__FR.skin('jin');
  const meanDrop = jinSat.reduce((a, b) => a + b, 0) / jinSat.length - inkSat.reduce((a, b) => a + b, 0) / inkSat.length;
  return { count: all.length, same, blanks, dimSame: JSON.stringify(dimJin) === JSON.stringify(dimInk), meanDrop };
});
ok(probe.count === 69, '图鉴 69 项（52 具名 + 17 路人）', probe.count);
ok(probe.same.length === 0, '金皮 / 墨皮取到两份不同画布', probe.same.slice(0, 4));
ok(probe.blanks.length === 0, '69 张全部非空白（墨皮也画得出）', probe.blanks.slice(0, 6));
ok(probe.dimSame, '墨化不改像素尺寸', null);
ok(probe.meanDrop > 0.04, '墨皮平均饱和度显著下降（墨阶重绘真生效）', probe.meanDrop.toFixed(3));

// ③ 路人剪影差异：头部与肩部字符行不能十张全一样
const shapes = await page.evaluate(() => {
  const names = ['cunfu','cunpo','zayi','xiaofan','tanzhu','huojie','kuli','chefu','chuanfu','shusheng','daoshi','heshang','tiewei'];
  const rows = names.map(n => window.REN_SPRITES.concat(window.CROWD_SPRITES).find(d => d.name === n).rows.slice(0, 7).join('|'));
  return { uniq: new Set(rows).size, total: rows.length };
});
ok(shapes.uniq >= 9, '路人头部 / 肩部剪影至少 9 种（不是十张换色脸）', shapes);
const late = await page.evaluate(() => {
  const names = ['jinguangshangren','zhangxiuer','huishishu','rushishu','luosaihu',
    'lizhanglao','zhaozhanglao','marong','lanyizhifa','wangqinxin','hanxiaomei','yunchi'];
  const all = window.REN_SPRITES.concat(window.CROWD_SPRITES);
  const rows = names.map(n => {
    const d = all.find(x => x.name === n);
    return d.rows.slice(0, 7).join('|') + '|' + Object.keys(d.pal).sort().join(',');
  });
  return { uniq: new Set(rows).size, total: rows.length };
});
ok(late.uniq >= 10, '七玄门后期 12 张剪影 / 调色至少 10 种（侏儒 / 双辫 / 宽袖 / 袒胸 / 黄鸟各不同）', late);
// 第三批考据：向之礼 / 封岳 / 钟吾是禁地同场试炼者，于坤 / 宋蒙 / 武炫是李化元门下同门，
// 两类身份在精灵 label 上分清，不把黄枫谷师兄误标成试炼者。
ok(/向之礼·黄枫谷滑头/.test(src) && /封岳·天阙堡狂人/.test(src) && /钟吾·灵兽山丑汉/.test(src),
   '禁地三人按原著标注门派与身份（滑头 / 狂人 / 丑汉）', null);
ok(/于坤·黄枫谷大师兄/.test(src) && /宋蒙·黄枫谷四师兄/.test(src) && /武炫·黄枫谷六弟子/.test(src),
   '黄枫谷三师兄按原著排序标注（大师兄 / 四师兄 / 六弟子），非禁地试炼者', null);
ok(/弱者联盟/.test(src) && /鹰勾鼻/.test(src) && /大小麻子/.test(src),
   '原著辨识特征入库（弱者联盟 / 鹰勾鼻 / 大小麻子）', null);
const third = await page.evaluate(() => {
  const names = ['xiangzhili','fengyue','zhongwu','yukun','songmeng','wuxuan'];
  const all = window.REN_SPRITES.concat(window.CROWD_SPRITES);
  const rows = names.map(n => {
    const d = all.find(x => x.name === n);
    return d.rows.slice(0, 7).join('|') + '|' + Object.keys(d.pal).sort().join(',');
  });
  return { uniq: new Set(rows).size, total: rows.length };
});
ok(third.uniq === 6, '血色试炼 6 张头肩剪影 / 调色各不相同（白须 / 疤脸 / 麻子 / 方巾 / 宽肩 / 红唇）', third);
ok(errs.length === 0, '全程零报错', errs.slice(0, 4));

console.log(`\n通过 ${pass}  失败 ${fail}`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
