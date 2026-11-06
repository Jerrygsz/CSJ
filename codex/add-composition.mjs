// 一次性迁移：把 mapCodex.json 里逐图已写好的 art（原著理想画面）结构化成 composition。
// 之后 composition 就是唯一真源的一部分，本脚本不再运行。
import fs from 'node:fs';
const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex

const P = CODEX + 'mapCodex.json';
const doc = JSON.parse(fs.readFileSync(P, 'utf8'));

// focus 全部摘自各图 art / canon 里的原著景物，不新编设定。
// focusCase 是本轮在 sc3Bake 里新增/改造的主景形状（big 画布）。
// layout 是水墨章法：axis 中轴 / diagonal 斜势 / corner 压角 / ring 环抱 / void 空灵 / frame 夹景 / band 横带。
const C = {
  qixuan: {
    focus: '彩霞山山门（双柱收窄、檐角压低），石阶沿画面斜向引向落日峰',
    focusCase: 'narrowgate', layout: 'diagonal', breath: 2, clusters: 2,
    palette: ['bamboo', 'rock', 'moss'], focusScale: 1.9
  },
  houshan: {
    focus: '赤水峰瀑布下石潭；秋末落叶层里藏着一件会改命的东西，画面要静',
    focusCase: 'pool', layout: 'void', breath: 3, clusters: 1,
    palette: ['tree', 'moss', 'rock'], focusScale: 1.5
  },
  mishi: {
    focus: '药园旁石壁前新砌的无窗石屋，中央方圆数丈图案，一圈灯烛照如白昼',
    focusCase: 'stonehut', layout: 'axis', breath: 3, clusters: 1,
    palette: ['rock', 'lantern', 'moss'], focusScale: 2.0
  },
  yelang: {
    focus: '落日峰山腰哨卡，峰顶七玄殿重檐作远景，一杆连弩阵旗',
    focusCase: 'narrowgate', layout: 'corner', breath: 2, clusters: 2,
    palette: ['pine', 'rock', 'banner'], focusScale: 1.8
  },
  jiayuan: {
    focus: '乡鲁大运河穿城，水门石桥与墨府宅院门楼夹出一条水留白',
    focusCase: 'narrowgate', layout: 'frame', breath: 2, clusters: 2,
    palette: ['puddle', 'tree', 'moss'], focusScale: 1.8
  },
  tainan: {
    focus: '高三千多米、常年山雾笼罩的太南山，山顶一座不大的太南寺剪影',
    focusCase: 'temple', layout: 'void', breath: 3, clusters: 1,
    palette: ['mist', 'tree', 'moss'], focusScale: 1.4
  },
  huangfeng: {
    focus: '黄枫谷护门大阵与山门，大门派的秩序感，岳麓殿重檐在深处',
    focusCase: 'narrowgate', layout: 'axis', breath: 2, clusters: 2,
    palette: ['pine', 'bamboo', 'rock'], focusScale: 1.9
  },
  yaoyuan: {
    focus: '两丘盆地里「百药园」牌匾院门，方形沟槽药畦围住中央数间茅草屋',
    focusCase: 'narrowgate', layout: 'frame', breath: 2, clusters: 2,
    palette: ['tuft', 'bamboo', 'moss'], focusScale: 1.7
  },
  xuese: {
    focus: '中心区石墙围成的大圆圈、四道铜门，第二层是终年迷雾的环形山脉',
    focusCase: 'stonering', layout: 'ring', breath: 3, clusters: 2,
    palette: ['rock', 'mist', 'bone'], focusScale: 2.1
  },
  luxiong: {
    focus: '山门外密林剪影，一岔两道的淡墨留白，不画建筑',
    focusCase: 'grove', layout: 'void', breath: 3, clusters: 1,
    palette: ['tree', 'pine', 'moss'], focusScale: 1.3
  },
  mkuang: {
    focus: '山塌半边的斜坡与半掩矿洞口，不画规则砖墙',
    focusCase: 'minehead', layout: 'corner', breath: 3, clusters: 1,
    palette: ['rock', 'moss', 'pine'], focusScale: 1.8
  },
  zhangtie: {
    focus: '歪斜棚架与冷了半年的铁砧，人去棚空，避免画成规整房屋',
    focusCase: 'shed', layout: 'corner', breath: 3, clusters: 1,
    palette: ['pine', 'rock', 'ruin'], focusScale: 1.5
  },
  yanwu: {
    focus: '前山校场空地，一杆幡与斜插木剑，中央留白给主角',
    focusCase: 'shed', layout: 'void', breath: 3, clusters: 1,
    palette: ['rock', 'tuft', 'pine'], focusScale: 1.6
  },
  yaopu: {
    focus: '一畦疯长到比人还高的药苗，湿土里半露的旧瓶，静夜里的异象',
    focusCase: 'pool', layout: 'corner', breath: 3, clusters: 2,
    palette: ['tuft', 'moss', 'bamboo'], focusScale: 1.6
  },
  heixiang: {
    focus: '太南小会后巷，两排棚檐夹出一条窄留白，不画透视建筑群',
    focusCase: 'shed', layout: 'frame', breath: 3, clusters: 2,
    palette: ['lantern', 'mist', 'rock'], focusScale: 1.5
  },
  xuechi: {
    focus: '乌龙潭灰黑腐地上一面冒泡的浑浊水坑，四周扭曲枯枝',
    focusCase: 'pool', layout: 'ring', breath: 3, clusters: 1,
    palette: ['puddle', 'bone', 'mist'], focusScale: 1.9
  },
  heisha: {
    focus: '皇城内小竹林剪影，一道横向淡墨压顶（血光只取明度不加红）',
    focusCase: 'grove', layout: 'band', breath: 3, clusters: 2,
    palette: ['bamboo', 'bone', 'mist'], focusScale: 1.8
  },
  shiku: {
    focus: '灵石矿洞口阵旗与塌陷隧道的钟乳石剪影，无天光',
    focusCase: 'minehead', layout: 'corner', breath: 3, clusters: 1,
    palette: ['rock', 'bone', 'moss'], focusScale: 2.0
  }
};

let n = 0;
for (const m of doc.maps) {
  const c = C[m.id];
  if (!c) throw new Error('缺少 composition: ' + m.id);
  m.composition = c;
  n++;
}
if (Object.keys(C).length !== doc.maps.length) throw new Error('composition 条数与地图数不符');

doc.meta.composition = {
  status: '已落地（构图化改造）',
  principle: '逐图 art 字段写的是原著理想画面，本轮把它结构化成构图参数；主景只有 1 个原著景物，其余按水墨章法收掉',
  layouts: 'axis 中轴 / diagonal 斜势 / corner 压角 / ring 环抱 / void 空灵 / frame 夹景 / band 横带',
  breath: '留白等级 1~3，越大装饰越稀；聚落成片连通，不逐格随机',
  cases: 'narrowgate / pool / stonehut / temple / stonering / grove / minehead / shed（sc3Bake 的 big 画布专属形状）',
  discipline: '主景避中央玩法区；次景退到纸后；装饰组内同种成丛；新层仍严守低饱和灰阶、不碰判定'
};

fs.writeFileSync(P, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('注入 composition:', n, '张；meta.composition 已写入');
