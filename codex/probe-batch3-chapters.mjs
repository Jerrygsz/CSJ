// 第三批：按「人界篇第四卷 #364-595 / 第五卷 #596-795」指定章精读
// 只取对应卷章，避免灵界篇(>1265)同名章混入；输出每章关键景物行 + 章首铺垫。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const chapters = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren.chapters;

const READ = [
  { id:'miaoyin', arc:'E', name:'妙音门·天雷竹', chapters:[399,401,410,411], words:['天雷竹','紫灵','妙音门','竹','长老','院'] },
  { id:'qingzhu', arc:'E', name:'青竹小轩·入世二十年', chapters:[411,412,413,414], words:['青竹小轩','金雷竹','绿液','铺面','丹房','竹','院'] },
  { id:'guxiu',   arc:'E', name:'古修遗址·玄骨', chapters:[418,419,429,450,493], words:['古修','遗址','残图','石壁','洪荒古宝','曲魂','玄骨','阵'] },
  { id:'xutian',  arc:'E', name:'虚天殿', chapters:[431,435,458,467,494], words:['虚天殿','玄晶','宝光阁','冰火道','极妙幻境','鼎','殿','阁','道'] },
  { id:'wuzhong', arc:'E', name:'雾中岛·外星海', chapters:[508,511,517,520], words:['雾中岛','外星海','石室','礁石','雾','岛','龟','雷劫'] },
  { id:'waihai',  arc:'E', name:'外星海·风希', chapters:[516,543,545,560], words:['伴妖草','风希','洞府','风雷翅','海','礁','岛','妖兽'] },
  { id:'yuanyao', arc:'E', name:'元瑶·还魂术', chapters:[565,566,567,576], words:['还魂术','元瑶','妍丽','天兆','鬼雾','荒岛','海'] },
  // ---- 第五卷 名震一方 ----
  { id:'yinming', arc:'F', name:'阴冥之地', chapters:[577,580,582,583,593,595], words:['阴冥之地','绝灵之气','高墙','村落','兽晶','暴风山','雾','石'] },
  { id:'bianhai', arc:'F', name:'无边海', chapters:[595,596,597], words:['无边海','黑水','海','天南','风'] },
  { id:'luoyun',  arc:'F', name:'落云宗', chapters:[597,598,599,603], words:['落云宗','云梦山','天泉峰','灵脉','山','宗','峰','弟子'] },
  { id:'luoyunyaoyuan', arc:'F', name:'天泉峰·药园', chapters:[603,604,605], words:['药园','小石山','茅屋','浓雾','洞府','石室','灵眼'] },
  { id:'shixiao', arc:'F', name:'禁地·尸魈', chapters:[606,610,612,613], words:['尸魈','青金石','石室','雪云狐','金符','银链','禁地','石台'] },
  { id:'sanjian', arc:'F', name:'三派试剑', chapters:[618,619,627,628,631], words:['试剑','剑坪','古剑门','百巧院','明清灵水','灵眼之树','云梦山'] },
  { id:'yinyue',  arc:'F', name:'银月认主', chapters:[615,616], words:['银月','器灵','玉如意','灵狐','狼族','洞府'] },
  { id:'jieying', arc:'F', name:'云梦山·结婴', chapters:[637,638,639], words:['结婴','元婴','灵脉','洞府','丹田','天泉峰'] },
  { id:'jiaoyihui', arc:'F', name:'天南交易会', chapters:[673,674,684,760], words:['交易会','阗天城','庚精','赤精芝','傀儡术','坊市','摊'] },
  { id:'cangkun', arc:'F', name:'苍坤上人洞府', chapters:[674,686,687,699,700], words:['苍坤','遗宝','洞府','南陇侯','大草原','禁制','卷轴','石门','石'] },
  { id:'yanyue',  arc:'F', name:'掩月宗', chapters:[711,714,715,720], words:['掩月宗','南宫婉','化意门','山门','血魔剑','阳环','峰','指环'] },
  { id:'huanglong', arc:'F', name:'黄龙山大战', chapters:[729,730,731], words:['黄龙山','仲神师','魔道六宗','山','阵','战'] },
  { id:'fujia',   arc:'F', name:'元武国·付家', chapters:[351,352,647,653,654,655,656], words:['付家','辛如音','齐云霄','付家堡','遗言','骨灰','堡','旧诺','灭族'] },
  { id:'huixiang',arc:'F', name:'越国·五里沟', chapters:[658,661,662,664], words:['五里沟','韩家','祠','镜州','老树','坟','村','父母','四叔祖'] },
];

const L = [];
L.push('# 第三批 · 人界篇第四卷尾～第五卷 · 指定章精读');
L.push('');
L.push('> 数据源：`fanren/raw/凡人修仙传.txt`，章号按 `novel-index.json` 的 `ren.chapters[n-1]`。');
L.push('> 人界篇边界：第四卷 #364-595「风起海外」、第五卷 #596-795「名震一方」为主体；源头章可上溯第三卷（#351/352 辛如音托付）；第八卷 #1266 起属灵界，不采。');
L.push('> 纠错：按词频排序会把「坠魔谷」#804-847 误当苍坤洞府、把灵界同名章误当人界，本表章号逐图人工核定。');
L.push('> 每章先列「关键景物行」（含该图专名，最多 14 行），再列「章首铺垫」（前 8 非空行）。');
L.push('');
for (const t of READ) {
  L.push('---');
  L.push('');
  L.push('## ' + t.arc + ' · `' + t.id + '` ' + t.name + '（精读 ' + t.chapters.length + ' 章）');
  L.push('');
  for (const n of t.chapters) {
    const c = chapters[n - 1];
    if (!c) { L.push('### #' + n + ' 缺章，跳过'); L.push(''); continue; }
    if (n < 1 || n > 1265) { L.push('### #' + n + ' 超出人界篇范围（>1265 属灵界），跳过'); L.push(''); continue; }
    L.push('### #' + n + ' ' + c.label + '《' + c.title + '》（' + c.vol + ' ' + c.volTitle + '）');
    L.push('');
    L.push('**关键景物行**');
    L.push('');
    let k = 0;
    for (let i = c.start; i <= c.end && k < 14; i++) {
      const s = (lines[i] || '').trim();
      if (!s || !t.words.some(w => s.includes(w))) continue;
      L.push('> L' + (i + 1) + '　' + s.slice(0, 300));
      k++;
    }
    if (!k) L.push('> （本章未命中专名，见章首铺垫）');
    L.push('');
    L.push('**章首铺垫**');
    L.push('');
    let k2 = 0;
    for (let i = c.start; i <= c.end && k2 < 8; i++) {
      const s = (lines[i] || '').trim();
      if (!s) continue;
      L.push('> L' + (i + 1) + '　' + s.slice(0, 240));
      k2++;
    }
    L.push('');
  }
}
fs.writeFileSync(ROOT + 'batch3-chapters.md', L.join('\n'), 'utf8');
console.log('WROTE batch3-chapters.md');
console.log('图数 =', READ.length, '｜章数 =', READ.reduce((s, t) => s + t.chapters.length, 0));
console.log('章号范围 =', Math.min(...READ.flatMap(t => t.chapters)), '~', Math.max(...READ.flatMap(t => t.chapters)));
console.log('超界章(人界篇>1265) =', READ.flatMap(t => t.chapters).filter(n => n < 1 || n > 1265).length);
console.log('第三卷源头章 =', READ.flatMap(t => t.chapters).filter(n => n >= 172 && n <= 363).join(','));
console.log('第六卷章 =', READ.flatMap(t => t.chapters).filter(n => n >= 796 && n <= 1124).join(','));
