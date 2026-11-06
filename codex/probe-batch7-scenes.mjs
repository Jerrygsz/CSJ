// 第七批（arc L 30 张）：从各图章窗口抽取原著景物/场景原句
// 窗口由 probe-batch7.mjs 的专名命中 + 章标题骨架共同确定，全部落在 #2176–#2451（V10 尾～V12 大结局）。
import fs from 'fs';
const ROOT = import.meta.dirname.replace(/\\/g, '/') + '/';
const REPO = ROOT + '../';   // fanren/（原著全文在 raw/）
const lines = fs.readFileSync(REPO + 'raw/凡人修仙传.txt', 'utf8').split(/\r?\n/);
const chapters = JSON.parse(fs.readFileSync(ROOT + 'novel-index.json', 'utf8')).ren.chapters;

const byNum = new Map();
for (const c of chapters) byNum.set(c.n, c);
const refOf = n => { const c = byNum.get(n); return c ? (c.vol + ' ' + c.label + '《' + c.title + '》') : ('#' + n); };

const MAPS = [
  // ---- V10 尾 ----
  { id:'zhandacheng',  name:'斩大乘',            win:[2205,2211], words:['斩大乘','黑枭王','大乘'] },
  { id:'heihu',        name:'黑葫城',            win:[2213,2219], words:['黑葫城','黑葫','螟虫','再入魔界'] },
  { id:'baiguang',     name:'白光界·土皇钉',    win:[2216,2236], words:['白光界','土皇钉','虫母','人面虫','地宫'] },
  { id:'shengshi',     name:'圣岛使者再来',      win:[2195,2202], words:['圣岛使者','杜宇','圣岛','樊咆子'] },
  // ---- V11 三劫 → 大乘 ----
  { id:'sanjie',       name:'三劫·进阶大乘',     win:[2176,2193], words:['五行之劫','真雷劫','心魔之劫','进阶大乘','雷球','天劫'] },
  { id:'dashengdian',  name:'大乘圣典·天渊城',   win:[2202,2208], words:['庆典','大乘圣典','万修朝拜','重聚','轰动两族'] },
  { id:'shiyin',       name:'魔界·始印之地',     win:[2219,2226], words:['始印','上古封印','落星幡','小幻天镜','聚会'] },
  { id:'lingzu',       name:'灵族·灵王',         win:[2264,2272], words:['灵族','灵王','伏灵山','灵天要塞','血燃','黑鳞'] },
  { id:'xiaoxiuluo',   name:'小修罗界·寒潭',     win:[2272,2302], words:['小修罗界','修罗之战','寒潭','空鱼','冰峰','九元观'] },
  { id:'qingyuangong', name:'无涯海·青元宫',     win:[2309,2316], words:['无涯海','青元宫','元合岛','黄元子','越隆','极元晶'] },
  { id:'minghe2',      name:'冥河·青元子渡劫',   win:[2313,2325], words:['青元之劫','青元子','谷外大战','金罡风魔阵','大敌降临'] },
  { id:'helian',       name:'赫连商盟拍卖会',    win:[2329,2340], words:['赫连','商盟','拍卖','胡玉双','翻天旗','祖龙之血'] },
  { id:'tiandinggong', name:'天鼎宫',            win:[2349,2356], words:['天鼎宫','天鼎','双鼎','巨门','钥匙','现世'] },
  { id:'xuetian',      name:'血天大陆·万灵血玺', win:[2341,2346], words:['血天大陆','进入血天','血鹤城','万灵血玺','血骨门','阴司十王'] },
  { id:'qiangzhe',     name:'强者之战',          win:[2376,2383], words:['强者之战','阴司五王','大战将启','凶司王','转轮王','五魔'] },
  // ---- V12 终局 ----
  { id:'xiaoling',     name:'小灵天·南宫婉',     win:[2392,2401], words:['小灵天','南宫婉','绿灵族','古树祖灵','相见'] },
  { id:'zhenxian',     name:'真仙之身',          win:[2422,2426], words:['真仙之身','真仙','斩鹿'] },
  { id:'jiujie',       name:'九劫现',            win:[2425,2428], words:['九劫','九劫现','玺印之威'] },
  { id:'qunqiang',     name:'群强之陨',          win:[2426,2429], words:['群强之陨','群强','万灵血玺'] },
  { id:'xianshi',      name:'献祭·风元大陆',     win:[2425,2431], words:['献祭','风元大陆','明尊','法则之链'] },
  { id:'zhangtianping',name:'掌天瓶·盗天瓶',     win:[2428,2441], words:['掌天瓶','盗天瓶','瓶灵','小瓶'] },
  { id:'zhanxian',     name:'斩仙·万灵血玺',     win:[2429,2434], words:['斩仙','万灵血玺'] },
  { id:'tianmo',       name:'天魔契约',          win:[2432,2436], words:['天魔契约','天魔','本命牌'] },
  { id:'diyi',         name:'青元宫·第一大乘',   win:[2434,2437], words:['第一大乘','青元宫'] },
  { id:'huimoyuan',    name:'再回魔源·瓶灵',     win:[2437,2441], words:['再回魔源','瓶灵','魔源','下落'] },
  { id:'daoguo',       name:'广灵道果大会',      win:[2443,2446], words:['道果','广灵道果','大会','得果'] },
  { id:'renzu',        name:'人族之变',          win:[2444,2447], words:['人族之变','人族'] },
  { id:'huirenjie',    name:'重回人界',          win:[2445,2449], words:['重回人界','人界众象','人界'] },
  { id:'fsjie',        name:'飞升之劫',          win:[2447,2451], words:['飞升之劫','北极元晶','飞升'] },
  { id:'xianjie',      name:'飞升仙界',          win:[2449,2451], words:['飞升仙界','飞升台','仙界'] },
];

const SCENE = ['山','峰','崖','谷','洞','渊','窟','穴','林','木','石','沙','雪','冰','河','海','湖','池','泉','瀑','城','殿','楼','塔','台','宫','阁','亭','门','碑','阵','雾','云','光','火','焰','血','魔','兽','禽','虫','旗','桥','路','金','玉','珠','花','草','水','风','雷'];

function sentencesOf(line){ return line.split(/(?<=[。！？”])/).map(s=>s.trim()).filter(s=>s.length>=12); }

function chapterOf(i) {
  let lo = 0, hi = chapters.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (chapters[mid].start <= i) lo = mid; else hi = mid - 1; }
  return lo;
}

const L = [];
L.push('# 第七批 · arc L 30 张 原著景物/场景原句抽取');
L.push('');
L.push('> 窗口由专名命中 + 章标题骨架确定，全部落在 #2176–#2451（V11 真仙降世 + V12 真仙降临）。');
L.push('> 每图取专名命中的写景/场景句，按场景词密度排序取前 12 条。');
L.push('');

for (const m of MAPS){
  const [a,b] = m.win;
  const cand = [];
  const seen = new Set();
  for (let i=0;i<lines.length;i++){
    if (i < chapters[0].start) continue;
    const ci = chapterOf(i);
    const n = chapters[ci].n; if(n<a || n>b) continue;
    const line = lines[i]; if(!line) continue;
    for (const s of sentencesOf(line)){
      let hitWord=null;
      for(const w of m.words){ if(s.includes(w)){ hitWord=w; break; } }
      let sc=0; for(const k of SCENE) if(s.includes(k)) sc++;
      // 双通道：① 命中专名；② 纯写景（场景词 ≥4，不看专名）——后段多为对话章，靠这条兜底
      if(!hitWord && sc < 4) continue;
      if(seen.has(s)) continue; seen.add(s);
      if(sc<2 && s.length<26) continue;
      cand.push({ n, s, sc, w: hitWord || '写景' });
    }
  }
  cand.sort((x,y)=> (y.sc + Math.min(y.s.length,90)/45) - (x.sc + Math.min(x.s.length,90)/45));
  const top = cand.slice(0, 12);
  L.push('### `' + m.id + '` ' + m.name + '（窗口 #' + a + '-' + b + '，候选 ' + cand.length + ' 句）');
  L.push('');
  if(!top.length){ L.push('（窗口内未命中写景句，需换专名或扩窗）'); L.push(''); continue; }
  for(const t of top) L.push('- 【' + refOf(t.n) + '】' + t.s);
  L.push('');
}

fs.writeFileSync(ROOT + 'batch7-scenes.md', L.join('\n'), 'utf8');
console.log('WROTE batch7-scenes.md ｜ 逐图候选句：');
for (const m of MAPS){
  const [a,b]=m.win; let cnt=0; const seen=new Set();
  for(let i=0;i<lines.length;i++){ if(i<chapters[0].start) continue; const ci=chapterOf(i); const n=chapters[ci].n; if(n<a||n>b) continue; const line=lines[i]; if(!line) continue;
    for(const s of sentencesOf(line)){ let hit=false; for(const w of m.words) if(s.includes(w)){hit=true;break;} let sc=0; for(const k of SCENE) if(s.includes(k)) sc++; if(!hit && sc<4) continue; if(seen.has(s)) continue; seen.add(s); if(sc<2&&s.length<26) continue; cnt++; } }
  console.log('  ', m.id.padEnd(14), String(cnt).padStart(4), '句  #'+a+'-'+b);
}
