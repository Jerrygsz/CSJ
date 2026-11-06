// 第107轮 · 第六批（arc K 19 张）逐图原著考据，幂等追加到唯一真源。
// 证据：codex/batch6-evidence.md（专名定位）、batch6-scenes.md（景物原句）。
// 纪律：只取灵界篇第十卷 #1755-2175；#2176 起属仙界篇不采。
// name / pos / type / side / arc / hasInkBg 从 map-inventory.json 直取；不改游戏数据、不碰判定、严守灰阶。
// 引用按章级给出（第十卷 + 章号 + 章标题），不杜撰全文行号。
import fs from 'fs';
const CODEX = import.meta.dirname.replace(/\\/g, '/') + '/';  // fanren/codex（唯一真源 + 原著索引）
const REPO = CODEX + '../';                                    // fanren/
const ROOT = CODEX + '../../';                                 // 工作区根（报告等）
const SRC = CODEX + 'mapCodex.json';
const doc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const inv = JSON.parse(fs.readFileSync(CODEX + 'map-inventory.json', 'utf8')).rows;
const chapters = JSON.parse(fs.readFileSync(CODEX + 'novel-index.json', 'utf8')).ren.chapters;

function cn(n) {
  const d = '零一二三四五六七八九'; let s = '';
  if (n >= 1000) { s += d[Math.floor(n / 1000)] + '千'; n %= 1000; if (n > 0 && n < 100) s += '零'; }
  if (n >= 100) { s += d[Math.floor(n / 100)] + '百'; n %= 100; if (n > 0 && n < 10) s += '零'; }
  if (n >= 10) { const t = Math.floor(n / 10); s += (t > 1 ? d[t] : '') + '十'; n %= 10; }
  if (n > 0) s += d[n];
  return s;
}
const volOf = n => n <= 1357 ? '第八卷' : n <= 1754 ? '第九卷' : '第十卷';
const refOf = (n) => volOf(n) + ' 第' + cn(n) + '章《' + chapters[n - 1].title + '》';
const q = (n, text) => ({ ref: refOf(n), text });

const B6 = [
// ================= arc K：第十卷 魔界之战（#1755-2175）=================
{
  id:'linghuang', arc:'K', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refOf(1757), refOf(1767), refOf(1800)],
  canon:'天妙灵皇渡大天劫失败陨落，人族重选新灵皇；灵皇大比聚集众多同阶，新任灵皇须站抵挡古魔族第一线、死守天灵城。韩立为结交道友参加此大比，亦知灵皇之位在魔劫中九死一生。',
  quotes:[
    q(1757,'要说最近二百年中发生的大事，最重要的就莫过于三境中的天妙灵皇在数十年前没能渡过大天劫，从而陨落而亡，新的灵皇即将在整个人族中开始重新筛选的事情了。'),
    q(1767,'灵皇大比中肯定会聚集众多同阶存在，在下参加此大比，只是想顺便多和一些道友结识和交流一二的。'),
    q(1800,'所以这一次，新任灵皇必须站在抵挡古魔族的第一线，死守天灵城不能退却分毫的。')
  ],
  scene:{terrain:'灵皇圣城台 / 天灵城',sky:'城上长天',architecture:'灵皇圣城、比试台',flora:'无',ground:'城台石地',atmosphere:'大比、择皇、魔劫将至'},
  decor:[['rock',0.30],['banner',0.28],['mist',0.26],['tuft',0.16]],
  landmarks:[{kind:'banner',name:'灵皇大比旗'}],
  terrain:['cliff'],
  art:'一组城台殿基当主景，一侧一杆大比旗幡断续；不画灵皇与合体修士颜色，只取石台明度与旗幡留白。',
  diff:['原著 #1757/#1767/#1800 载天妙灵皇陨落、灵皇大比、新灵皇须死守天灵城；游戏 name/pos/type/desc 取自 map-inventory，本次仅补考据与渲染参数，不改数据、不碰判定。'],
  composition:{focus:'灵皇圣城台与一侧大比旗幡',focusCase:'clanhall',layout:'band',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.8}
},
{
  id:'liangzu', arc:'K', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refOf(1755), refOf(1768), refOf(1773)],
  canon:'天渊城是两族视若根本的重地，驻两族精锐与天渊长老会，护城有擎天石塔与楼阁建筑供外地修士落脚。韩立重返天渊，两族大乘齐聚共议魔劫，先前的异族攻城已折损不少元气。',
  quotes:[
    q(1755,'而一般修炼者不敢过于深入蛮荒地域，大都只是在离天渊城月许的路程内活动，万一真遇到什么穷凶极恶的古兽或者其他凶险，还可有机会逃回天渊城寻求庇护的。'),
    q(1768,'某片深处两座擎天石塔中间的大片楼阁建筑，是天渊城中较出名的专门供外地修士临时入住落脚的地方。'),
    q(1773,'我们天渊城在先前的异族攻城中，已经折算了不少元气，没有人员补充的话，在即将到来的魔劫中，那就只能自保的。')
  ],
  scene:{terrain:'天渊城石塔楼阁 / 蛮荒边缘',sky:'城上长天',architecture:'擎天石塔、楼阁、长老会',flora:'无',ground:'城基石地',atmosphere:'两族根本、来客、魔劫共议'},
  decor:[['rock',0.34],['banner',0.24],['mist',0.24],['bone',0.18]],
  landmarks:[{kind:'gate',name:'天渊城擎天石塔门'}],
  terrain:['cliff'],
  art:'双塔收窄的城门口配一片楼阁块面，塔身只勾淡墨边；不画青冥卫与合体修士颜色，只取石塔明度。',
  diff:['原著 #1755/#1768/#1773 载天渊城两族重地、擎天石塔楼阁、异族攻城折损元气；游戏数据不改。'],
  composition:{focus:'天渊城两座擎天石塔间的楼阁',focusCase:'clanhall',layout:'diagonal',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.9}
},
{
  id:'jiuxian', arc:'K', source:'原著原文', inkTone:4, tone:0.97,
  refs:[refOf(1783), refOf(1793), refOf(1803)],
  canon:'九仙山是合体期修士聚会之所，每座山峰下设迎仙宫接纳来客，万宝大会在峰顶云海中的万宝大殿举行。韩立携门下参加，于坊市探听消息，亦在此结识诸多同道。',
  quotes:[
    q(1783,'结果在半路上，碰到了打算去参加万宝大会的雾海观的小道士。'),
    q(1793,'而每座山峰下面都设有同样的一座迎仙宫，可接纳所有到会的合体期前辈。'),
    q(1803,'而那万宝大殿就是山峰顶部的那片广大云海中。')
  ],
  scene:{terrain:'九仙山峰顶云海 / 迎仙宫',sky:'峰顶广大云海',architecture:'迎仙宫、万宝大殿',flora:'山峰稀木',ground:'山峰石径',atmosphere:'万宝大会、合体聚会、坊市'},
  decor:[['rock',0.3],['mist',0.3],['pine',0.22],['banner',0.18]],
  landmarks:[{kind:'gate',name:'九仙山迎仙宫门'}],
  terrain:['cliff'],
  art:'一座山门殿宇没入云海横笔，峰顶留白当云海；不画万宝大会人群与宝光，只取殿宇明度。',
  diff:['原著 #1783/#1793/#1803 载九仙山迎仙宫、万宝大会在峰顶云海；游戏数据不改。'],
  composition:{focus:'九仙山峰顶云海中的迎仙宫殿宇',focusCase:'stormpeak',layout:'frame',breath:3,clusters:2,palette:['rock','mist','pine'],focusScale:1.9}
},
{
  id:'heiyu', arc:'K', source:'原著原文', inkTone:6, tone:0.78,
  refs:[refOf(1795), refOf(1818), refOf(1823)],
  canon:'黑域是一处黑暗无边的空间，巨门内毫光皆无；交换会上金面人主持，众存在会上以物易物，气氛火热。韩立携极山材料与会，换得数样宝物，亦借此探听魔劫消息。',
  quotes:[
    q(1795,'贫道已经参加过多次此交换会，倒也有些门路能够提前知道一些消息。'),
    q(1818,'只见徐徐而开的巨门内，黑乎乎的一片，丝毫光亮没有，仿佛根本就是一个黑暗无边的世界，倒真不愧为黑域之名的。'),
    q(1823,'显然这些材料，非常受参加大会的众多存在欢迎，几乎在金面人话语刚一落下的同时，当即就有不少人纷纷开口报出自己的东西来，一时间整个交换会，立刻火热异常起来。')
  ],
  scene:{terrain:'黑域黑暗空间 / 巨门',sky:'无光黑暗',architecture:'黑域入口巨门、大殿',flora:'无',ground:'黑暗虚空',atmosphere:'黑域、交换会、以物易物'},
  decor:[['rock',0.34],['mist',0.3],['ruin',0.2],['bone',0.16]],
  landmarks:[{kind:'gate',name:'黑域入口巨门'}],
  terrain:['cloud'],
  art:'一道微敞的巨门框断续勾出，门外一团浓墨当无光黑暗；不画金面人与宝物光，只取门框明度与墨团留白（纸性仍浅宣，靠积墨罩表幽暗，不涂黑）。',
  diff:['原著 #1795/#1818/#1823 载黑域无光巨门、金面人交换会火热；游戏数据不改；幽暗靠积墨不涂黑。'],
  composition:{focus:'黑域微敞的入口巨门与门外浓墨',focusCase:'narrowgate',layout:'corner',breath:2,clusters:1,palette:['rock','mist','ruin'],focusScale:1.7}
},
{
  id:'longjia', arc:'K', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refOf(1813), refOf(1832), refOf(1834)],
  canon:'陇家名列五大真灵世家，万灵台上各世家按名次排位；陇家老祖身化金毛巨猿，于万灵台与韩立切磋，金光耀眼、阵旗耀放。韩立借此立威，亦窥得金身之秘。',
  quotes:[
    q(1813,'金毛巨猿狰狞面容骤然一变，一声低吼后……金毛大手同样巨涨数倍的往紫色巨手毫不示弱的一迎而去……'),
    q(1832,'作为上一界排名第五的谷家，名列五大真灵世家之一，自然有资格排在离万灵台最近的位置，惹来后面不少中小真灵世家的羡慕和妒忌的目光。'),
    q(1834,'顿时下一刻，万灵台一阵低沉的轰鸣传来，竟在白色法阵附近浮现出一只古朴的青色石盆来。')
  ],
  scene:{terrain:'万灵台石台 / 阵旗',sky:'台上紫金大网',architecture:'万灵台、青石盆、阵旗',flora:'无',ground:'青石台与阵纹',atmosphere:'真灵世家、切磋、金毛巨猿'},
  decor:[['rock',0.32],['banner',0.26],['mist',0.24],['tuft',0.18]],
  landmarks:[{kind:'banner',name:'万灵台阵旗'}],
  terrain:['cliff'],
  art:'一台青石法阵当主景，四周断续阵旗围出，中央留白当青石盆；不画金毛巨猿与金光，只取石台明度与阵旗。',
  diff:['原著 #1813/#1832/#1834 载万灵台真灵世家排位、陇家老祖化巨猿切磋、青石盆；游戏数据不改。'],
  composition:{focus:'万灵台青石法阵与四周阵旗',focusCase:'stonering',layout:'ring',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.8}
},
{
  id:'shengdao', arc:'K', source:'原著原文', inkTone:4, tone:0.96,
  refs:[refOf(1814), refOf(1815), refOf(1840)],
  canon:'圣岛是两族圣地，合体存在非存亡大事不得离岛；岛上有迷天楼专售顶阶迷天石。韩立登岛见妖族前辈，共订潜入魔界之约，亦探得圣岛深处不知名合体修士不少。',
  quotes:[
    q(1814,'而除非事关我们两族存亡的大事，那些在圣岛生活的合体存在，轻易都不准离开圣岛一步的。'),
    q(1815,'迷天楼就是唯一一家可以大量出售顶阶迷天石的商铺，故而不少人族修士，化形妖修专门登门此商铺的。'),
    q(1840,'此事是我在贵族圣岛之上和贵族天元圣皇、玄武霸皇以及其他几名后期大成修士共同商定签约的……')
  ],
  scene:{terrain:'圣岛迷天楼 / 两族圣地',sky:'岛上长天',architecture:'迷天楼(塔)、圣岛殿',flora:'无',ground:'岛石地',atmosphere:'两族圣地、迷天石、潜入魔界之约'},
  decor:[['rock',0.3],['mist',0.28],['banner',0.24],['pine',0.18]],
  landmarks:[{kind:'gate',name:'圣岛迷天楼门'}],
  terrain:['cliff'],
  art:'一座瘦高塔楼(迷天楼)当主景，塔身只勾淡墨边、分层留白；不画迷天石宝光与妖族前辈，只取塔形明度。',
  diff:['原著 #1814/#1815/#1840 载圣岛两族圣地、迷天楼售迷天石、圣岛共订魔界之约；游戏数据不改。'],
  composition:{focus:'圣岛一座瘦高的迷天楼',focusCase:'pagoda',layout:'axis',breath:3,clusters:1,palette:['rock','mist','banner'],focusScale:1.9}
},
{
  id:'zhenling', arc:'K', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refOf(1764), refOf(1832), refOf(1839)],
  canon:'真灵世家乃人族五大世家，万灵台上按名次排位，各世家献宝于青石盆；韩立展金身法相，世家合体存在皆露忌惮敬畏。此乃真灵世家大典，亦是两族大乘齐聚之盛。',
  quotes:[
    q(1764,'他身为真灵世家谷家的分支族长，见识自然远非普通人可比的，一下认出了雾海低空处仿佛小山般的金色虚影，竟是山岳巨猿的法相……'),
    q(1832,'作为上一界排名第五的谷家，名列五大真灵世家之一，自然有资格排在离万灵台最近的位置……'),
    q(1839,'至于真灵世家中的那些合体存在，望向石台上韩立的目光，自然各种表情都有了，大部分都含有忌惮和敬畏之色……')
  ],
  scene:{terrain:'万灵台大典 / 真灵世家',sky:'台上天象',architecture:'万灵台、世家排位、青石盆',flora:'无',ground:'青石台',atmosphere:'真灵世家、献宝、金身法相'},
  decor:[['rock',0.30],['banner',0.28],['mist',0.26],['bone',0.16]],
  landmarks:[{kind:'stele',name:'真灵世家排位碑'}],
  terrain:['cliff'],
  art:'万灵台石台上几枚玉瓶(留白小柱)列于青石盆旁，台缘阵旗断续；不画金身法相与世家修士，只取石台明度。',
  diff:['原著 #1764/#1832/#1839 载真灵世家、万灵台献宝、韩立金身法相引忌惮；游戏数据不改。'],
  composition:{focus:'万灵台青石盆与世家献宝列',focusCase:'clanhall',layout:'ring',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.7}
},
{
  id:'mojie', arc:'K', source:'原著原文', inkTone:5, tone:0.85,
  refs:[refOf(1840), refOf(1842), refOf(1843)],
  canon:'魔灾爆发后古魔界与灵界交融，数名合体老怪相约潜入魔界，借魔界之约寻洗灵池与净灵莲；陇家老祖虑行迹泄露，订掩饰气息之法，方敢深入魔界腹地。',
  quotes:[
    q(1840,'老夫约诸位道友到此，就是想等魔灾爆发后，古魔界和灵界交融一体的时候，我等几人深入魔界一趟！'),
    q(1842,'哼，陇某并不是惧怕其他人来争夺灵池，而是担心万一此事被魔族提前知道了，到时再想安然潜入魔界，自然会困难数倍的。'),
    q(1843,'一旦他真应约深入魔界，万一泄露了行迹，别的古魔圣祖也许无所谓的，不一定会亲自动手对付他们。')
  ],
  scene:{terrain:'魔界入口 / 灵池通道',sky:'魔界交融天色',architecture:'魔界入口、灵池法阵',flora:'无',ground:'入口石地',atmosphere:'魔界之约、潜入、洗灵池'},
  decor:[['rock',0.32],['mist',0.3],['ruin',0.2],['bone',0.18]],
  landmarks:[{kind:'gate',name:'魔界入口'}],
  terrain:['cloud'],
  art:'一道裂隙状入口框断续勾出，内一团淡墨当魔界天色；不画古魔圣祖与掩饰法术光，只取入口明度。',
  diff:['原著 #1840/#1842/#1843 载魔界之约、潜入魔界寻洗灵池、掩饰气息；游戏数据不改。'],
  composition:{focus:'魔界入口裂隙与内里淡墨天色',focusCase:'narrowgate',layout:'void',breath:3,clusters:1,palette:['rock','mist','ruin'],focusScale:1.8}
},
{
  id:'diyuan2', arc:'K', source:'原著原文', inkTone:4, tone:0.9,
  refs:[refOf(1853), refOf(1864), refOf(1867)],
  canon:'地渊深处有青色城门，背生羽翅的守卫盘查；韩立重返冥河之地，拜会青元子与金焰候，以法器换得材料。青元子洞府金光隐现，地渊幽深，金焰候周身金焰翻滚。',
  quotes:[
    q(1853,'在青色城门处，正有十几名背生各色羽翅的地渊守卫，用警惕目光抬首打量他们。'),
    q(1864,'见韩立如此恭谨，青元子点了点头，下面却开门见山的直接问道：“你这次既然动用我给你的法器，重新返回冥河之地，看来应该收集到不少我需要的材料。”'),
    q(1867,'金焰候叹了口气，但法诀一掐，体表金光一闪下，一层金色火焰身上翻滚而出，将其身形彻底淹没了。')
  ],
  scene:{terrain:'地渊青色城门 / 洞府',sky:'地渊幽空',architecture:'青色城门、金焰候宫殿、青元子洞府',flora:'无',ground:'地渊石地',atmosphere:'地渊、青元子、冥河之地'},
  decor:[['rock',0.34],['mist',0.28],['moss',0.22],['bone',0.16]],
  landmarks:[{kind:'gate',name:'地渊青色城门'}],
  terrain:['cliff'],
  art:'一座青色城门框斜挑当主景，门后洞府只勾淡墨边留白；不画羽翅守卫与金光火焰，只取城门明度。',
  diff:['原著 #1853/#1864/#1867 载地渊青色城门守卫、青元子问冥河材料、金焰候金焰；游戏数据不改。'],
  composition:{focus:'地渊青色城门与门后洞府',focusCase:'stoneroom',layout:'corner',breath:2,clusters:2,palette:['rock','mist','moss'],focusScale:1.8}
},
{
  id:'moban', arc:'K', source:'原著原文', inkTone:6, tone:0.8,
  refs:[refOf(1875), refOf(1882), refOf(1883)],
  canon:'魔斑降世，天渊城附近魔斑广及万里、漆黑发亮，魔气翻滚；黑洞深处魔兽低吼，魔族将由此涌入灵界。韩立立于山峰望远，知洞府已非修炼之地，魔劫序幕拉开。',
  quotes:[
    q(1875,'此话不假，但是魔族同样也可从容的在魔斑处调集人手，一开始的攻击绝对凶猛异常，不知道有多少城池能在头几波攻击下幸免的。'),
    q(1882,'在天渊城附近的几处魔斑，此刻不但足有万里之广，更是变得漆黑发亮起来，近些的地方甚至可以清晰的看到里面有潦黑的魔气翻滚不定。'),
    q(1883,'更惊人的是，从已经化为巨大黑洞的魔斑深处，隐隐传出了更加骇人的低吼声，隐约间有更多的魔兽也要蜂拥进灵界之中。')
  ],
  scene:{terrain:'魔斑黑洞 / 巨树阁楼',sky:'魔斑翻滚魔气',architecture:'巨树腰部阁楼',flora:'直耸巨树',ground:'魔海边缘',atmosphere:'魔斑降世、魔气翻滚、魔兽将涌入'},
  decor:[['rock',0.3],['mist',0.28],['pine',0.24],['bone',0.18]],
  landmarks:[{kind:'stele',name:'魔斑巨树碑'}],
  terrain:['cloud'],
  art:'一棵直耸巨树斜挑，腰部一阁楼块面，树旁一团翻滚墨团当魔斑；不画魔兽与血色，只取树干明度与魔斑墨团（积墨表幽暗，不涂黑）。',
  diff:['原著 #1875/#1882/#1883 载魔斑万里、漆黑发亮、魔兽将涌入；游戏数据不改；幽暗靠积墨不涂黑。'],
  composition:{focus:'直耸巨树腰部的阁楼与翻滚魔斑墨团',focusCase:'battleline',layout:'diagonal',breath:3,clusters:2,palette:['rock','mist','pine'],focusScale:1.9}
},
{
  id:'yitian', arc:'K', source:'原著原文', inkTone:5, tone:0.85,
  refs:[refOf(1904), refOf(1905), refOf(1930)],
  canon:'倚天城巨墙上人族力士列阵，弓弩武具喷出火球冰锥迎击魔兽大军；超级魔兽逼近，蓝光破空。终魔族破禁，近半城头失守，魔骑如潮涌入，人魔之战惨烈异常。',
  quotes:[
    q(1904,'无数人族力士一排排的一下出现在倚天城的墙头上，一些弓弩状的远程武具一举之下，火球、冰锥，风刃等攻击立刻密密麻麻的攻向了魔兽大军。'),
    q(1905,'但下一刻眼看就要冲到倚天城巨墙前的超级魔兽上空，剧烈空间波动一起，上千道刺目蓝光一下从虚空中诡异的激射而出……'),
    q(1930,'倚天城处，巨墙外的所有禁制终于尽数被魔族攻破，近半城头已经失守，无数的魔族骑士和魔兽如同潮水般的涌入倚天城中。')
  ],
  scene:{terrain:'倚天城巨墙 / 墙头',sky:'城上魔海',architecture:'倚天城巨墙、墙头武具',flora:'无',ground:'墙基石地',atmosphere:'人魔之战、城破、魔兽大军'},
  decor:[['rock',0.38],['banner',0.24],['mist',0.22],['bone',0.16]],
  landmarks:[{kind:'gate',name:'倚天城巨墙门'}],
  terrain:['cliff'],
  art:'一段厚重巨墙斜贯画面，墙头断续阵线当守军武具；不画魔兽大军与火球冰锥，只取墙身明度与阵线留白。',
  diff:['原著 #1904/#1905/#1930 载倚天城巨墙守军、蓝光破空、城破魔骑涌入；游戏数据不改。'],
  composition:{focus:'倚天城一段厚重巨墙与墙头阵线',focusCase:'battleline',layout:'band',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.9}
},
{
  id:'huangquan', arc:'K', source:'原著原文', inkTone:5, tone:0.86,
  refs:[refOf(1912), refOf(1932), refOf(1944)],
  canon:'镇魔锁被血光圣祖化身所夺，韩立与之周旋，欲借黄泉地火抽镇魔锁中混沌二气；黄泉地火自九幽冒出，形似火焰而奇寒。车骑恭等三尊者因镇魔锁困于其中。',
  quotes:[
    q(1912,'你可知道在附近地域中可有‘阴阳冥池’或者‘黄泉地火’这两种天地演化的灵地！'),
    q(1932,'第一个条件，就是道友必须在脱困后，马上到附近黄泉地火之地跑上一趟，借用此天地阴火将镇魔锁中混沌二气，给吸出一些来。'),
    q(1944,'呵呵，据说此处地火乃是直接从九幽黄泉之下冒上来的，虽然形似火焰，但是奇寒之力却的确非同小可的。')
  ],
  scene:{terrain:'黄泉地火池 / 镇魔锁',sky:'地火寒雾',architecture:'无（天地灵地）',flora:'无',ground:'九幽地火池',atmosphere:'黄泉地火、奇寒、镇魔锁混沌二气'},
  decor:[['rock',0.32],['mist',0.3],['moss',0.22],['puddle',0.16]],
  landmarks:[{kind:'well',name:'黄泉地火池'}],
  terrain:['water'],
  art:'一汪地火池(只勾淡墨边、中间留白当寒雾)当主景，池边几笔枯石；不画奇寒蓝焰与石灵，只取池形明度。',
  diff:['原著 #1912/#1932/#1944 载黄泉地火天地灵地、形似火焰而奇寒、抽镇魔锁混沌二气；游戏数据不改。'],
  composition:{focus:'黄泉地火池与池边枯石',focusCase:'pool',layout:'frame',breath:2,clusters:1,palette:['rock','mist','moss'],focusScale:1.7}
},
{
  id:'tianzhan', arc:'K', source:'原著原文', inkTone:5, tone:0.85,
  refs:[refOf(1990), refOf(1997), refOf(1999)],
  canon:'魔族大军压境天渊城，巨大城墙高若山峰，岛屿般的宫殿悬于城内高空，百余石塔拔地而起；防护光幕渐不支。韩立战青龙上人，于石塔间将其斩落，天渊城大战惨烈至极。',
  quotes:[
    q(1990,'这一日，天渊城的议事大殿中，银发老者正和金越禅师在谈论着有关魔族的一件要紧的事情……'),
    q(1997,'当即一行人立刻离开了石塔，直奔魔族大军的主攻方向飞遁而去没有多久，韩立等人就远远看到了天渊城高若山峰的巨大城墙，并有一座仿佛岛屿般的巨大宫殿悬浮在城墙内的高空之中。'),
    q(1999,'眼看越来越多的魔兽都冲到了禁制附近，天渊城的防护光幕终于渐渐不支的狂闪不定起来。')
  ],
  scene:{terrain:'天渊城巨墙 / 悬浮巨殿 / 石塔',sky:'城上防护光幕',architecture:'天渊城巨墙、悬浮宫殿、石塔',flora:'无',ground:'城基石地',atmosphere:'天渊大战、斩青龙、石塔群'},
  decor:[['rock',0.36],['banner',0.22],['mist',0.24],['bone',0.18]],
  landmarks:[{kind:'banner',name:'天渊城石塔旗'}],
  terrain:['cliff'],
  art:'一座悬浮巨殿块面配数座拔地石塔，殿塔只勾淡墨边；不画青龙上人与防护光幕彩，只取殿塔明度。',
  diff:['原著 #1990/#1997/#1999 载天渊城悬浮巨殿石塔、防护光幕不支、斩青龙；游戏数据不改。'],
  composition:{focus:'天渊城悬浮巨殿与拔地石塔群',focusCase:'floatingpalace',layout:'axis',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:2.0}
},
{
  id:'xueya', arc:'K', source:'原著原文', inkTone:5, tone:0.88,
  refs:[refOf(2029), refOf(2034), refOf(2044)],
  canon:'血鸦城是魔界草原上唯一的城池，进出捕猎魔兽者皆在此逗留，城中拍卖魔兽材料换魔器丹药。韩立入城，灭血鸦城主化身，城头乱作一团，禁空禁制撤去。',
  quotes:[
    q(2029,'而且血鸦城虽然小些，但方圆千万里内只有这么一座城池，附近进出草原想要捕杀魔兽的道友，都会在本城逗留一些时日的。'),
    q(2034,'特别是有些在草原大有收获之人，更会将一些无用的魔兽材料，直接在血鸦城加拍卖掉，然后换成有用的魔器丹药……'),
    q(2044,'此刻，血鸦城中到处混乱一片，禁空禁制明显已经撤去了，各种各样的遁光在空中四下飞动……')
  ],
  scene:{terrain:'血鸦城城头 / 坊肆',sky:'魔界城上空遁光',architecture:'血鸦城城门、拍卖坊肆',flora:'无',ground:'城头石地',atmosphere:'魔界唯一城池、拍卖、灭城主'},
  decor:[['rock',0.34],['banner',0.22],['mist',0.26],['bone',0.18]],
  landmarks:[{kind:'gate',name:'血鸦城城门'}],
  terrain:['cliff'],
  art:'一座魔界城楼门框当主景，门内坊肆块面留白；不画血鸦城主与魔虫，只取城楼明度。',
  diff:['原著 #2029/#2034/#2044 载血鸦城魔界唯一城池、拍卖魔兽材料、城头混乱；游戏数据不改。'],
  composition:{focus:'血鸦城城楼门与门内坊肆',focusCase:'clanhall',layout:'frame',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.8}
},
{
  id:'huanxiao', arc:'K', source:'原著原文', inkTone:4, tone:0.96,
  refs:[refOf(2051), refOf(2063), refOf(2076)],
  canon:'幻啸沙漠风沙大作，灰蒙蒙狂风直冲天际，神念大受压制；幻夜城踞于沙漠边缘，城门数十丈高。韩立一行入沙漠寻矿，兽尊殿派魔窥伺，风沙化作飓风海洋。',
  quotes:[
    q(2051,'这时，巨舟一路飞驰下终于来到了幻夜城附近上空，并遁光一敛的往下方一落，正停在了一处数十丈高的城门前。'),
    q(2063,'在这幻啸沙漠中我等神念原本就大受压制，再加此刻身处火云石矿脉上，有众多火气干扰，神念更是无法放出太远的。'),
    q(2076,'这一日，幻啸沙漠某一异常荒凉的边缘处，风沙大作，阵阵灰蒙蒙狂风直冲天际之边，仿佛将这片区域都化作了飓风海洋……')
  ],
  scene:{terrain:'幻啸沙漠风沙 / 幻夜城',sky:'灰蒙狂风',architecture:'幻夜城数十丈城门',flora:'无',ground:'风沙砾石',atmosphere:'沙漠、神念压制、兽尊殿窥伺'},
  decor:[['tuft',0.34],['rock',0.3],['mist',0.22],['bone',0.14]],
  landmarks:[{kind:'gate',name:'幻夜城城门'}],
  terrain:['cloud'],
  art:'几道断续沙丘线铺底，一角半掩的城楼框当幻夜城；不画狂风与魔尊，只取沙面明度与城楼留白。',
  diff:['原著 #2051/#2063/#2076 载幻夜城数十丈城门、幻啸沙漠神念压制、风沙如飓风海洋；游戏数据不改。'],
  composition:{focus:'幻啸沙漠沙丘线与半掩的幻夜城楼',focusCase:'desertruin',layout:'diagonal',breath:3,clusters:2,palette:['rock','mist','tuft'],focusScale:1.8}
},
{
  id:'moyuan', arc:'K', source:'原著原文', inkTone:5, tone:0.85,
  refs:[refOf(2023), refOf(2087), refOf(2089)],
  canon:'魔源海是魔界知名海域，黑海茫茫；雷海处银色电光如瀑击海，化为无数雷电之球漂浮。陇家老祖等穿幻啸沙漠抵此，雷海岛屿上三大始祖盘踞，黑袍青年立于巨峰之巅。',
  quotes:[
    q(2023,'一条，就是沿着眼前的这片草原一直向前走，可进入冲月大平原，然后横穿几大魔族掌控的繁华地域……可轻易到达魔源海。'),
    q(2087,'只见前方漆黑海面上，一大片银色电光仿佛瀑布般的从空中狂涌而下，狠狠击在海面之上，并化为无数雷电之球在海面上漂浮晃动……'),
    q(2089,'魔源海离雷海不知多远处的一座被黑气常年笼罩的巨型岛屿上，一座几乎半耸入云的巨峰顶部……')
  ],
  scene:{terrain:'魔源海黑海 / 雷海岛屿',sky:'雷海银电瀑布',architecture:'雷海岛屿巨峰',flora:'无',ground:'黑海面',atmosphere:'魔源海、雷海电光、三大始祖'},
  decor:[['rock',0.32],['mist',0.3],['puddle',0.22],['bone',0.16]],
  landmarks:[{kind:'stele',name:'雷海岛屿巨峰碑'}],
  terrain:['water'],
  art:'远处一座半耸入云巨峰(只勾淡墨边)浮于黑海横笔，上方一束断续电光(留白)击海；不画银电彩与黑袍青年，只取峰形明度。',
  diff:['原著 #2023/#2087/#2089 载魔源海黑海、雷海银电瀑布、雷海岛屿三大始祖；游戏数据不改。'],
  composition:{focus:'魔源海黑海上的雷海岛屿巨峰与击海电光',focusCase:'thunderhead',layout:'frame',breath:3,clusters:1,palette:['rock','mist','puddle'],focusScale:2.0}
},
{
  id:'modajie', arc:'K', source:'原著原文', inkTone:3, tone:1.0,
  refs:[refOf(2105), refOf(2106), refOf(2110)],
  canon:'苦灵岛下方神秘空间藏洗灵池，池水乃精纯灵力液化而成，含数种不可辨的神奇能量；净灵莲唯此池可生。韩立借池水与净灵莲助噬金虫再变异，脱胎换骨。',
  quotes:[
    q(2105,'宝花见此并未露出异样之色……就淡淡说道：“那洗灵池在岛屿下方的一个神秘空间中，这个法阵是通往那里的唯一入口。”'),
    q(2106,'他可以清楚感应到，下方池水根本就是精纯灵力直接浓缩液化而成的，里面隐隐还含有数种根本无法分辨的神奇能量……'),
    q(2110,'没有了噬金虫的吞吸，洗灵池中的银白色水面顿时开始徐徐的上升起来。')
  ],
  scene:{terrain:'苦灵岛洗灵池 / 巨树',sky:'岛上幽空',architecture:'洗灵池法阵孔洞、巨树',flora:'巨树草木',ground:'池边石地',atmosphere:'洗灵池、净灵莲、噬金虫变异'},
  decor:[['rock',0.3],['moss',0.26],['tree',0.24],['puddle',0.2]],
  landmarks:[{kind:'well',name:'洗灵池'}],
  terrain:['water'],
  art:'一汪银水小池(只勾淡墨边、中间留白)当主景，池旁一株巨树块面；不画净灵莲与噬金虫金光，只取池形明度。',
  diff:['原著 #2105/#2106/#2110 载苦灵岛洗灵池神秘空间、灵力液化池水、净灵莲；游戏数据不改。'],
  composition:{focus:'苦灵岛洗灵池银水与池旁巨树',focusCase:'pool',layout:'corner',breath:2,clusters:1,palette:['rock','moss','tree'],focusScale:1.7}
},
{
  id:'lanpu', arc:'K', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refOf(2119), refOf(2120), refOf(2124)],
  canon:'蓝瀑湖异于魔界他处河湖，蓝瀑城依湖而建，城主府以圣祖为靠山称雄；广源斋是湖边商铺。韩立入城大肆收购异魔金，引各方注目，亦暗查魔界虚实。',
  quotes:[
    q(2119,'“果然不愧为蓝瀑湖之名，此湖的确和魔界的其他河湖大不一样的。”'),
    q(2120,'魔石多少不成问题，但关键是要快，我需要早些赶到蓝瀑城的。'),
    q(2124,'毫无疑问，以蓝瀑湖圣祖为靠山的城主府，是整个蓝瀑湖最大的势力，其他大小势力哪怕背后也有一些靠山，但绝不敢明面上对抗城主府了。')
  ],
  scene:{terrain:'蓝瀑湖 / 蓝瀑城',sky:'湖上长天',architecture:'蓝瀑城、广源斋临湖商铺',flora:'无',ground:'湖岸山石',atmosphere:'蓝瀑湖、收购异魔金、城主府称雄'},
  decor:[['rock',0.32],['mist',0.28],['puddle',0.22],['banner',0.18]],
  landmarks:[{kind:'gate',name:'蓝瀑城广源斋门'}],
  terrain:['water'],
  art:'一片湖面横笔当蓝瀑湖，岸上一座临湖商铺块面；不画异魔金与城主府威势，只取湖岸明度与商铺留白。',
  diff:['原著 #2119/#2120/#2124 载蓝瀑湖异于他处、蓝瀑城主府以圣祖为靠山、广源斋；游戏数据不改。'],
  composition:{focus:'蓝瀑湖岸的临湖商铺广源斋',focusCase:'shed',layout:'band',breath:3,clusters:1,palette:['rock','mist','puddle'],focusScale:1.8}
},
{
  id:'muzu2', arc:'K', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refOf(2155), refOf(2157), refOf(2158)],
  canon:'木族圣树原植禁地，魔族大举入侵后移植木棉城；长老会摆下木界三十六天绝阵，百余岛屿般巨物自城中升起。木棉城风云骤紧，魔族潜入圣地，惊变骤生。',
  quotes:[
    q(2155,'只可惜，木族这株圣树原本是种植在木族禁地之中，但是后来魔族大举入侵，禁地也被迫放弃下，只好将圣树本体移植到了木棉城来……'),
    q(2157,'魔族增援的消息一传来后，木族长老会似乎也知道无法将我们继续再挽留下来，所以这一次心一横，干脆将木族的三十六颗后备圣树全都拿了出来……'),
    q(2158,'这时，木棉城中轰鸣声忽然一顿，接着整座城池晃了几晃，接着百余座仿佛岛屿般的庞然大物一下从木棉城各处徐徐的冒出……')
  ],
  scene:{terrain:'木棉城 / 圣树 / 绝阵',sky:'青波风龙',architecture:'木棉城云团阁楼、木界三十六天绝阵',flora:'木族圣树、青木',ground:'城基木地',atmosphere:'木族惊变、圣树移植、绝阵杀戮'},
  decor:[['tree',0.34],['rock',0.3],['moss',0.22],['mist',0.14]],
  landmarks:[{kind:'stele',name:'木族圣树碑'}],
  terrain:['cliff'],
  art:'一株木族圣树(只勾淡墨边、冠部留白)当主景，树下城郭块面；不画风龙与魔族，只取树形明度与城郭留白。',
  diff:['原著 #2155/#2157/#2158 载木族圣树移植木棉城、木界三十六天绝阵、城中华物升起；游戏数据不改。'],
  composition:{focus:'木棉城木族圣树与树下城郭',focusCase:'grove',layout:'void',breath:3,clusters:2,palette:['tree','rock','moss'],focusScale:2.0}
}
];

// ---- 幂等合并 ----
const before = doc.maps.filter(m => m.batch !== 6);
const seen = new Set(before.map(m => m.id));
const added = [];
for (let bi = 0; bi < B6.length; bi++) {
  const d = B6[bi];
  const row = inv.find(x => x.id === d.id);
  if (!row) throw new Error('地图清单里找不到 ' + d.id);
  if (seen.has(d.id)) throw new Error('id 与前几批重复：' + d.id);
  seen.add(d.id);
  const { id, arc, source, inkTone, tone, refs, canon, quotes, scene, decor, landmarks, terrain, art, diff, composition } = d;
  added.push({
    id, order: before.length + bi + 1, arc, name: row.name, pos: row.pos,
    type: row.type, side: !!row.side, batch: 6, hasInkBg: !!row.inkBg,
    source, refs, canon, quotes, scene, inkTone, tone, decor, landmarks, terrain, art, diff, composition
  });
}
doc.maps = [...before, ...added];
for (const m of doc.maps) {
  const row = inv.find(x => x.id === m.id);
  if (!row) throw new Error('地图清单里找不到 ' + m.id);
  m.batch = m.batch || 1;
  m.hasInkBg = !!row.inkBg;
}

// ---- meta 口径同步 ----
const n = doc.maps.length;
const b1 = doc.maps.filter(m => m.batch === 1), b2 = doc.maps.filter(m => m.batch === 2);
const b3 = doc.maps.filter(m => m.batch === 3), b4 = doc.maps.filter(m => m.batch === 4), b5 = doc.maps.filter(m => m.batch === 5), b6 = doc.maps.filter(m => m.batch === 6);
const native = doc.maps.filter(m => m.hasInkBg).map(m => m.id);
const patched = doc.maps.filter(m => !m.hasInkBg).map(m => m.id);
const off = inv.length - n;
doc.meta.generated = '2026-11-06';
doc.meta.batch = '批次6 · 首批 + 第二批 + 第三批 + 第四批 + 第五批 + 第六批';
doc.meta.scope = '首批 18（arc A/B/X）+ 第二批 11（arc C/D）+ 第三批 21（arc E/F）+ 第四批 19（arc G/H）+ 第五批 19（arc I/J）+ 第六批 19（arc K）= ' + n + ' 张；灵界篇第八卷～第十卷魔界之战（初入灵界 → 天元境 → 天渊城 → 风元/飞灵/地渊 → 雷鸣海域 → 天云十三族 → 魔金山脉 → 广寒界 → 进阶合体 → 圣岛/魔界之约/魔斑/倚天城破/天渊大战/魔源海/木棉城惊变）；剩余 ' + off + ' 张（arc L~M，全属灵界篇）仍按篇章逐图原著考据推进，不全量铺开、不按 arc 分组';
doc.meta.method = '按每张图的 name / pos / desc / clearDesc 定关键词 → 全文回查命中章 → 按卷剔后期同名章 → 指定章精读环境描写 → 摘出原文短引 → 编译成外观要素与渲染参数；第六批证据见 codex/batch6-evidence.md（专名定位，V10内命中、仙界篇越界仅属同名词后续回响）/ batch6-scenes.md（景物原句抽取）';
doc.meta.counts = {
  maps: n, batch1: b1.length, batch2: b2.length, batch3: b3.length, batch4: b4.length, batch5: b5.length, batch6: b6.length,
  mainline: doc.maps.filter(m => !m.side).length,
  side: doc.maps.filter(m => m.side).length,
  withDiff: doc.maps.filter(m => m.diff && m.diff.length).length
};
doc.meta.discipline[3] = '次景 kind 限定在现有 sc3Bake 的 7 类：gate / stele / well / bones / stair / banner / lantern；art 已结构化落地为 composition.focusCase 的 24 类原著主景（首批 8 + 第二批 3 + 第三批 6 + 第四批 7 = 24 类；第五批 19 张 + 第六批 19 张全部复用，无新增 case）';
doc.meta.composition.cases = 'narrowgate / pool / stonehut / temple / stonering / grove / minehead / shed（首批 8 类）+ furnace / ship / reef（第二批 3 类）+ floatingpalace / bamboostand / deadsea / stoneroom / stormpeak / clanhall（第三批 6 类）+ battleline / desertruin / grasscamp / pagoda / icewall / thunderhead / featherfall（第四批 7 类，sc3Bake big 画布专属形状）+ 第五批 19 张 + 第六批 19 张全部复用上述 24 类既有主景，逐图 composition 差异化，sc3Bake 无需新增 case';
doc.meta.style.quant.focusKinds = 24;
doc.meta.style.conformance.native = native.join(' / ') + '（' + native.length + ' 张，数据层已有 inkBg）';
doc.meta.style.conformance.patched = patched.join(' / ') + '（' + patched.length + ' 张，视觉层补铺宣纸）';
doc.meta.style.paper.scope = native.length + ' 张有 inkBg 的图由 buildGrass 直接出纸；' + patched.length + ' 张无 inkBg 的增补图由视觉层 sc3BakePaper() 补铺同款 tile，不改 m.bg / m.inkBg；分组由真源 hasInkBg 驱动';
doc.meta.style.principles[0] = '纸性统一：' + n + ' 张一律浅宣纸底（#ddd6c3 / #e6e0cf / #d0c8b2 三色无缝纸纹）；中国水墨画幽暗靠积墨，不靠把纸涂黑';
doc.meta.style.nextBatches = '剩余 ' + off + ' 张（arc L~M，全属灵界篇第十卷之后）仍按篇章逐图原著考据推进，沿用本基线（纸性 / 一图一主笔 / 聚落留白 / 笔法 / 灰阶），不全量铺开、不按 arc 分组；人界篇 69 张 + 灵界篇前两段 19 张 + 第六批 19 张已收口';
doc.meta.stage9 = {
  status: '已落地（版本 bump 见第107轮收尾：index.html / sw.js → 20261106N）',
  batch6: 'Jerry「继续推进」：第六批 19 张（arc K，灵界篇第十卷魔界之战）逐图回查原文写进唯一真源 mapCodex.json；按完整 arc 边界收口，不做半截、不越篇章。至此累计 107 张（人界篇 69 + 灵界篇 38），白名单仍直接取 window.MAP_CODEX 的 key，game.js 的白名单逻辑一字段未改，实证「加一张台账自动启用一张」',
  evidence: '证据链：probe-batch6.mjs 专名定位并显式分列「V10内命中 / V8V9(<1755) / 仙界篇(>2175)」（仙界篇命中的仅属魔界/圣岛/木族等同名词在 V11/V12 的后续回响，非本批地图内容）/ probe-batch6-scenes.mjs 按 V10 章窗口抽景物原句。人工核定：黑域/圣岛/木族/魔源等跨卷高频词靠 V10 窗口隔离，结果每图均落在 #1755-2175',
  focusCases: '19 张全部复用既有 24 类 sc3Bake 主景（clanhall / pagoda / narrowgate / stoneroom / battleline / pool / desertruin / thunderhead / grove 等），逐图 composition（focus/layout/breath/clusters/palette/focusScale）各不相同；sc3Bake 无需新增 case，主景形状仍 24 类',
  discipline: '严守灰阶（黑域无光/魔斑魔气/黄泉地火/雷海银电/血鸦城魔气/倚天魔海只取明度不落彩）、不改游戏 name / pos / desc、不碰判定；19 张全部带原文摘引与差异标注。明确冲突只标注不改数据',
  qa: 'verify-scenery3 扩到 O 组（第六批自动启用 / 107 张 / 24 类形状全覆盖 / 纸性分组动态口径 / 标杆零回归）；smoke 全绿；0 pageerror；shot-batch6.mjs 逐图实拍并亲眼看'
};
doc.meta.stage2.untracked = (doc.meta.stage2.untracked || '').replace(/未收录的 \d+ 张图/, '未收录的 ' + off + ' 张图').replace('第五批 19 张加入后', '首批 18 + 第二批 11 + 第三批 21 + 第四批 19 + 第五批 19 + 第六批 19 张加入后');
doc.meta.style.conformance.outOfScope = (doc.meta.style.conformance.outOfScope || '').replace(/未收录 \d+ 张/, '未收录 ' + off + ' 张');
doc.meta.stage5.discipline = (doc.meta.stage5.discipline || '').replace(/其余 \d+ 张无 mood/, '其余 ' + (n - (doc.maps.filter(m => m.mood).length)) + ' 张无 mood');

fs.writeFileSync(SRC, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('合并完成：' + b1.length + ' + ' + b2.length + ' + ' + b3.length + ' + ' + b4.length + ' + ' + b5.length + ' + ' + b6.length + ' = ' + n + ' 张；剩余 ' + off + ' 张（arc L~M）');
