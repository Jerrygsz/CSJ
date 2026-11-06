// 第四批：定点核实游戏 desc 里的量化/事件断言，避免把游戏文案误当原著写进 canon
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（真源与证据同目录）
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const chapters = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren.chapters;

const CHECKS = [
  { tag:'虚天殿·八十年', range:[1124,1135], words:['八十年','八十','三百年','开启','出去','传送'], max:18 },
  { tag:'芥子空间·二百多年闭关', range:[1251,1258], words:['二百','二百年','闭关','化神','芥子空间'], max:20 },
  { tag:'六道夺舍万天明', range:[1204,1222], words:['夺舍','肉身','万天明','六道极圣','逆星盟'], max:20 },
  { tag:'鲲鹏羽毛来源', range:[1163,1166], words:['羽毛','灵羽','鲲鹏','罗睺','死敌','落下','掉'], max:22 },
  { tag:'落云宗立威·两个元婴后期', range:[1174,1179], words:['元婴后期','两宗','压服','威震','大殿'], max:18 },
  { tag:'紫灵赎身', range:[1241,1245], words:['紫灵','寒髓','回阳水','妖丹','灵宝','一击','放'], max:22 },
  { tag:'五龙海空间节点出处', range:[1237,1240,1258,1260,1261], words:['空间节点','银月','资料','逆行通道','封印'], max:20 },
  { tag:'阴罗宗四长老·战书', range:[784,788], words:['战书','石碑','留言','四长老','阴罗宗','冰壁'], max:18 },
  { tag:'慕兰边界赌战', range:[756,759], words:['赌战','挑战书','生死','三场','边界'], max:16 },
  { tag:'金刚舍利镇煞气', range:[915,923], words:['金刚舍利','煞气','明王诀','佛宗','别院'], max:16 },
  { tag:'灵渺园名字', range:[824,826,857,1226,1251], words:['灵缈园','灵渺园','残骸','药园','空间裂缝'], max:20 },
  { tag:'小极宫玄冰', range:[1079,1082,1091,1093], words:['万年玄冰','冰墙','冰梯','玄玉洞','月光石'], max:18 },
];
const out = ['# 第四批 · 游戏文案关键断言核实', '', '> 逐条回查原文，输出章号 / 行号 / 原句；`canon` 只写原文支持的，`diff` 标注冲突。', ''];
for (const c of CHECKS) {
  out.push('## ' + c.tag + '（#' + c.range.join(' / #') + '）', '');
  let k = 0;
  for (const n of c.range) {
    const ch = chapters[n - 1]; if (!ch) continue;
    for (let i = ch.start; i <= ch.end && k < c.max; i++) {
      const s = (lines[i] || '').trim();
      if (!s || !c.words.some(w => s.includes(w))) continue;
      out.push('- `#' + n + ' L' + (i + 1) + '`　' + s.slice(0, 230));
      k++;
    }
  }
  if (!k) out.push('- （未命中）');
  out.push('');
}
fs.writeFileSync(ROOT + 'batch4-facts.md', out.join('\n'), 'utf8');
console.log('WROTE batch4-facts.md');
console.log('检查项 =', CHECKS.length, '｜行数 =', out.length);
