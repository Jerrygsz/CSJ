// 第106轮 · 第五批（arc I 13 + arc J 6 = 19 张）逐图原著考据，幂等追加到唯一真源。
// 证据：codex/batch5-evidence.md（专名定位）、batch5-chapters.md（97 章精读）、
//       batch5-scenes.md（1286 行景物原句）、batch5-facts.md（游戏文案断言核实）。
// 纪律：只取灵界篇第八卷 #1266-1357 / 第九卷 #1358-1754 / 第十卷 #1755-2175；#2176 起属仙界篇不采。
// name / pos / type / side / arc / hasInkBg 从 map-inventory.json 直取；不改游戏数据、不碰判定、严守灰阶。
// 引用按章级给出（第八/九/十卷 + 章号 + 章标题），不杜撰全文行号。
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

const B5 = [
// ================= arc I：初入灵界 → 天元境 → 天渊城 → 风元/飞灵/地渊 =================
{
  id:'qinluo', arc:'I', source:'原著原文', inkTone:3, tone:1.0,
  refs:[refOf(1266), refOf(1368)],
  canon:'韩立被空间节点抛入一片青灰色沙砾之地，寸草未生，大半身子被沙掩埋，只能静伏待变。此地是通往木族最容易过的南艮大沙漠（又名青罗沙漠），其下本是一片火山口，被当年天凤与火鳄大战招来的无尽风沙淹没而成，温度远胜寻常沙漠。',
  quotes:[
    q(1266,'心中默默思量着，他费尽地将头颅略微偏动一下，入目的全是一望无际的青灰色沙砾，寸草未生。'),
    q(1266,'片刻间，这片青灰色沙地上，仍只剩下韩立孤零零的一人了。'),
    q(1368,'「这里虽然环境恶劣了一些，但可比其余两条道安稳多了……这片沙漠两侧。一边是有名的太兽山脉……另一侧却是更加凶险的蛟渊大峡谷」')
  ],
  scene:{terrain:'青灰色沙砾荒原 / 远处沙丘线',sky:'赤日当空、沙地上方热浪',architecture:'无（仅沙下半掩的残柱与兽骨）',flora:'寸草未生',ground:'青灰色沙砾、风蚀纹',atmosphere:'荒凉、空旷、孤身一人'},
  decor:[['tuft',0.34],['rock',0.3],['mist',0.2],['bone',0.16]],
  landmarks:[{kind:'stele',name:'沙海残碑'}],
  terrain:['cloud'],
  art:'以几道断续沙丘线铺底，一角半掩的没骨石柱与一丛散落兽骨当配景，主景留白当无垠沙面；不画赤日与热浪颜色，只取明度。',
  diff:['游戏 desc「灵气浓得压人，身上却连一丝法力都提不起来」：原著 #1266 韩立确被抛入沙漠、半身陷沙无法动弹，但「灵气浓压人」为游戏增写氛围，原著未提。仅标注不改数据。'],
  composition:{focus:'青灰色沙面上半掩的残柱与一丛兽骨',focusCase:'desertruin',layout:'diagonal',breath:3,clusters:2,palette:['rock','mist','tuft'],focusScale:1.7}
},
{
  id:'anyuan', arc:'I', source:'原著原文', inkTone:4, tone:0.96,
  refs:[refOf(1268), refOf(1273)],
  canon:'安远城是青罗沙漠边缘一座气势不凡的石城，城墙足有三十余丈之高，每隔百余丈便有一座十丈小城楼，城上铭印陌生符文；墙头有统一铁甲的高大士兵巡视，城楼架设体积惊人的巨弩。韩立随天东商号车队入城，方知此城正重金订购兵甲灵具以应大兽潮。',
  quotes:[
    q(1268,'这片青罗沙漠面积并不算小，光是从一头穿过另一头，车队就需要疾行月许时间的。'),
    q(1273,'石城城墙足有三十余丈之高，再加上每隔百余丈就一处十丈高的小城楼，让石城看起来雄伟之极。'),
    q(1273,'而在如此高大的城墙上……所有城楼之上还架设着一具具体积惊人的巨弩，上面全都搭着一根根金属弩箭。')
  ],
  scene:{terrain:'石城城墙 / 城楼 / 城外草原',sky:'草原长风',architecture:'三十余丈石城墙、十丈小城楼、巨弩、陌生符文',flora:'城外草原',ground:'石地与车辙',atmosphere:'雄伟、戒备、兽潮将至'},
  decor:[['rock',0.3],['banner',0.26],['mist',0.22],['tuft',0.22]],
  landmarks:[{kind:'gate',name:'安远城城门'},{kind:'banner',name:'城楼巨弩旗'}],
  terrain:['cliff'],
  art:'双柱收窄的城门配一段断续城墙线，城楼上一具没骨巨弩斜挑；不画铁甲士兵与符文颜色，城墙只勾淡墨边。',
  diff:['游戏 clear「他背着一个半妖的小女孩从西门出去——那孩子额上有一道黑羽纹」：原著 #1273 仅写安远城订购兵甲应兽潮，半妖小女孩与黑羽纹均系游戏增写。仅标注不改数据。'],
  composition:{focus:'安远城城门与一段断续城墙、城楼巨弩',focusCase:'narrowgate',layout:'diagonal',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.8}
},
{
  id:'luori', arc:'I', source:'原著原文', inkTone:5, tone:0.9,
  refs:[refOf(1295), refOf(1299)],
  canon:'落日之墓是落日城外一处极广大的试炼古墓，纵有上千万修士入墓也如水中入海转瞬消失；墓旁紧挨着修士自建的巨型城市「落日城」，中高阶修士之多足以排进天元境前三。妖族一方在墓另一端也有一座更大的落日城。两族修士皆以此墓为机缘与战场。',
  quotes:[
    q(1295,'故而纵然有上千万修士进入这落日之墓，也如同水入大海一般，立刻消失不见的。'),
    q(1295,'此城紧挨着落日之墓修建……城中出现的中高阶修士之多，却是足以在天元境域中排进前三之列的。')
  ],
  scene:{terrain:'落日城外荒原 / 半塌古墓',sky:'荒原落日（只取明度）',architecture:'半塌古墓、墓前残碑',flora:'荒原寸草',ground:'黄土与断石',atmosphere:'苍茫、沉寂、千年不休'},
  decor:[['rock',0.36],['mist',0.3],['ruin',0.2],['bone',0.14]],
  landmarks:[{kind:'stele',name:'落日之墓残碑'}],
  terrain:['cloud'],
  art:'一座只勾淡墨边的半塌墓丘居中，四周大片留白当荒原；不画墓中火光，火只靠纸白与极淡墨晕示意。',
  diff:['游戏 desc「墓里的火，三千年没灭」与 clear「噬灵天火 太阴真火吞了太阳精火」：落日之墓本身是试炼古墓，墓中火与太阴/太阳精火之争属后续情节，游戏将后期事件前置为墓之固有景象。仅标注不改数据。'],
  composition:{focus:'落日城外一座半塌的古墓丘',focusCase:'stonering',layout:'void',breath:3,clusters:1,palette:['rock','mist'],focusScale:1.9}
},
{
  id:'shanku', arc:'I', source:'原著原文', inkTone:5, tone:0.92,
  refs:[refOf(1313), refOf(1314)],
  canon:'韩立在远离人烟的高大巍峨巨山山腹中闭关，山腹漆黑如墨，唯见盘坐人影身绕金光。此地先后招来比小天劫更猛烈的两色雷劫——既非寻常雷劫，也异于妖兽化形那一律银白的雷劫；山腹中霹雳狂暴，犹胜山顶天雷。',
  quotes:[
    q(1313,'在远离人烟的一处高大巍峨巨山的山腹中，一个四周漆黑如墨的空间中，一个人影静静的盘坐里面，身上金光微微闪动着不停。'),
    q(1314,'随即山腹中也马上霹雳声大响，沉闷爆裂声似乎犹比山顶处的天雷还狂暴几分的样子。')
  ],
  scene:{terrain:'高山山腹 / 漆黑石窟',sky:'山腹外两色雷云',architecture:'无（天然石腹，仅闭关石台）',flora:'无',ground:'山岩与碎石',atmosphere:'漆黑、雷鸣、金光盘坐'},
  decor:[['rock',0.34],['mist',0.32],['pine',0.2],['tuft',0.14]],
  landmarks:[{kind:'stele',name:'山腹闭关石额'}],
  terrain:['cliff'],
  art:'画面顶部横压一抹乌云没骨团块，云下一束断续金线垂入山腹；山腹只勾淡墨边、中间留白当漆黑空间，不画雷光彩色。',
  diff:['游戏 desc「口子窄，进去却宽敞，正好闭关」与 clear「两色雷云散尽，荒山上站着两个穿青袍的人……跟我们回天渊城」：与原著 #1313-1314 山腹闭关、两色雷劫、天渊卫接引基本吻合；「两个穿青袍的人」即天渊卫。仅标注不改数据。'],
  composition:{focus:'山腹之上横压的两色雷云与一束垂入的金线',focusCase:'thunderhead',layout:'frame',breath:2,clusters:1,palette:['rock','mist'],focusScale:1.8}
},
{
  id:'tianyuan', arc:'I', source:'原著原文', inkTone:3, tone:0.98,
  refs:[refOf(1315), refOf(1317), refOf(1333)],
  canon:'天渊城是人妖两族共守的边城，金庭舟与天渊卫出没其间，专司接引与守护飞升修士。城中一层层叠上去的石阁坊市、青冥卫营房、玉阙阁灵地皆在城墙之内；韩立在此受青冥卫身份、领青冥甲、得洞府，灵界规矩自此算起。',
  quotes:[
    q(1315,'「金庭舟，天渊卫！」火老的声音都一下尖利起来。'),
    q(1315,'「天渊卫！是来自天渊神城的前辈？」黄袍修士闻言，脸色也一下雪白，满是难以置信的表情。')
  ],
  scene:{terrain:'边城石基 / 层层石阁',sky:'边城上空风云',architecture:'天渊城城墙、石阁坊市、青冥卫营房、玉阙阁',flora:'无',ground:'石阶与城基',atmosphere:'雄城、肃穆、两族共守'},
  decor:[['rock',0.3],['banner',0.24],['mist',0.24],['ruin',0.22]],
  landmarks:[{kind:'gate',name:'天渊城城门'},{kind:'banner',name:'天渊卫旗'}],
  terrain:['cliff'],
  art:'以层层退晕的没骨石阁当主景，一侧一杆天渊卫旗幡断续挑出；不画金庭舟与法阵颜色，城只取石阶明度。',
  diff:['游戏 desc「青冥卫的营房、玉阙阁的灵地、一层层叠上去的石阁坊市」与原著 #1315-1319 天渊城、青冥卫、玉阙阁灵地一致。仅标注不改数据。'],
  composition:{focus:'天渊城层层退晕的石阁与一杆天渊卫旗',focusCase:'clanhall',layout:'band',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.9}
},
{
  id:'lingdi', arc:'I', source:'原著原文', inkTone:3, tone:1.0,
  refs:[refOf(1318), refOf(1319), refOf(1320)],
  canon:'韩立飞升后先得青冥卫身份，再往玉阙阁确定洞府——每一个元婴以上修士在天渊城都有自己的专门洞府，好坏大小靠自己争取。玉阙阁是发放洞府与灵地之所，山腰灵地需争得；他在此布下监视法阵，静修不辍。',
  quotes:[
    q(1318,'每一个元婴以上修士，在天渊城都有自己的专门洞府。不过，洞府的好坏以及大小，要靠你自己争取了。具体的事宜，你去玉阙阁一问就知。'),
    q(1319,'从刚刚默记的地图上找到了玉阙阁的位置后，他当即化为一道青光的离开了飞灵殿。')
  ],
  scene:{terrain:'天渊城山腰灵地 / 玉阙阁',sky:'城中山岚',architecture:'玉阙阁、洞府石垣、灵地围栏',flora:'灵地苔点与新栽灵植',ground:'石垣与苔地',atmosphere:'清修、静默、争而得之'},
  decor:[['rock',0.3],['moss',0.24],['mist',0.24],['tree',0.22]],
  landmarks:[{kind:'stele',name:'玉阙阁灵地石额'}],
  terrain:['cloud'],
  art:'一座三层收窄的没骨阁檐居中，周匝淡墨苔点与几丛矮木；不画灵光与玉色，只留白当山腰灵地。',
  diff:['游戏 clear「金阙玉书 七十二页炼器外页拼起来」：金阙玉书/七十二页炼器外页实出青元子黑隐山脉（见 lianxu 条 #1517），游戏将之并入玉阙阁灵地情节。仅标注不改数据。'],
  composition:{focus:'玉阙阁三层收窄的阁檐与周匝苔点',focusCase:'pagoda',layout:'frame',breath:3,clusters:1,palette:['rock','moss','mist'],focusScale:1.7}
},
{
  id:'muzu', arc:'I', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refOf(1376), refOf(1377), refOf(1378)],
  canon:'木族领地位于蛮荒，韩立奉命侦察木族，来到一处丘陵，立于半焦古树之前接头——人妖两族卧底或亲至交代不便记录之事，或把情报存放树下。此树焦立，木族气息与卧底暗线皆系于此。',
  quotes:[
    q(1376,'韩立本人早已站在了丘陵上，并且就身处那颗半焦古树之前了。'),
    q(1376,'据他们所说，若是可能的话，人妖两族卧底会有人亲自和接情报之人见上一面，好交代一些不便记录的内容。但若是实在太危险，无法亲到的话，则自会将情报全部存放留下的。')
  ],
  scene:{terrain:'蛮荒丘陵 / 半焦古树',sky:'丘陵天光',architecture:'无（仅接头古树）',flora:'半焦古树、零星草木',ground:'丘陵土坡',atmosphere:'隐秘、焦立、暗线交汇'},
  decor:[['tree',0.3],['pine',0.24],['moss',0.24],['rock',0.22]],
  landmarks:[{kind:'bones',name:'木族卧底接头古树下'}],
  terrain:['cloud'],
  art:'以几株没骨古树（其一焦立）作主景，树下淡墨苔点与矮木点缀；不画木族法相，只取树形明度。',
  diff:['游戏 clear「银阶木族伏地，噬金虫从它的孔窍里钻出来，芝龙果与丹方都在袋里」：银阶木族、噬金虫、芝龙果皆原著后续情节，游戏将侦察任务与收获一并写入。仅标注不改数据。'],
  composition:{focus:'蛮荒丘陵上几株半焦古树',focusCase:'grove',layout:'void',breath:3,clusters:2,palette:['tree','pine','moss'],focusScale:1.6}
},
{
  id:'zhenchan', arc:'I', source:'原著原文', inkTone:4, tone:0.96,
  refs:[refOf(1334), refOf(1341)],
  canon:'碧眼真蟾是蛮荒世界一种古兽，其灵血为真蟾液主料，乃化神后期修士适合服用的灵液；玉清丹则主要对化神初期有用。韩立为炼体，与一群飞升修士合力收取一窝碧眼真蟾，真蟾之血是炼体的好东西。',
  quotes:[
    q(1334,'真蟾液，玉清丹！……这种灵液最主要的一种材料，竟是来自蛮荒世界一种叫做碧眼真蟾的古兽灵血……'),
    q(1334,'而真蟾液药性强的多，是化神后期修士适合服用的，中期服用的话，则会因药性过与霸道，大有风险的。')
  ],
  scene:{terrain:'荒谷水潭 / 碧眼真蟾巢',sky:'谷中薄雾',architecture:'无（仅水潭与岩窝）',flora:'珍稀灵草（两三千年药龄）',ground:'水边岩地与苔',atmosphere:'幽谷、灵血、潜收'},
  decor:[['puddle',0.32],['rock',0.26],['moss',0.22],['tuft',0.2]],
  landmarks:[{kind:'well',name:'碧眼真蟾栖息水潭'}],
  terrain:['water'],
  art:'一汪只勾淡墨边的静水居中，水面几道断续涟漪，岸侧一丛灵草苔点；不画真蟾与灵草颜色，水只靠纸白。',
  diff:['游戏 desc「荒谷里聚了一群飞升修士，要合力收一窝碧眼真蟾。真蟾的血，是炼体的好东西」与原著 #1334 真蟾液/碧眼真蟾灵血、化神后期服用吻合。仅标注不改数据。'],
  composition:{focus:'荒谷中一汪只勾淡边的静水与岸侧灵草',focusCase:'pool',layout:'void',breath:3,clusters:1,palette:['puddle','rock','moss'],focusScale:1.7}
},
{
  id:'tianpeng', arc:'I', source:'原著原文', inkTone:4, tone:0.97,
  refs:[refOf(1412), refOf(1413), refOf(1416)],
  canon:'天鹏圣地在飞灵族腹地，半岛附近海域与大片陆地皆属带翅异族飞灵族统治；天鹏族只是飞灵族数十支中较弱小的一支，除背部一对鹏翅、战时变化巨鹏外，其余与人族极似。韩立借风雷翅上鲲鹏真羽气息混入圣地外围，终得《惊蛰十二诀》与真血。',
  quotes:[
    q(1412,'半岛附近海域以及连接半岛的大片陆地，似乎都属于一种叫做飞灵族的带翅异族统治的区域。而天鹏族只是飞灵族的一支而已，还是数十支中较弱小的一支。'),
    q(1412,'这些天鹏族除了背部一对鹏翅外，和可以借助神通在战斗时能变化成各种巨鹏外，其他一切都和人族极其相似。')
  ],
  scene:{terrain:'飞灵族腹地 / 天鹏圣地殿',sky:'海域长风',architecture:'天鹏圣地殿门、供奉台',flora:'无',ground:'石台与海崖',atmosphere:'异族圣地、翅影、较弱一支'},
  decor:[['rock',0.32],['mist',0.3],['pine',0.2],['tuft',0.18]],
  landmarks:[{kind:'gate',name:'天鹏圣地殿门'}],
  terrain:['cliff'],
  art:'一组悬浮感的没骨殿檐当主景，下接断续石台；不画翅影与真羽金光，只留白当圣地空间。',
  diff:['游戏 clear「真血入体，胸前浮起一尊巨鹏法相。《惊蛰十二诀》到手」与原著 #1413-1416 天鹏真血、惊蛰诀吻合。仅标注不改数据。'],
  composition:{focus:'天鹏圣地一组悬浮感的殿檐与石台',focusCase:'floatingpalace',layout:'band',breath:2,clusters:1,palette:['rock','mist','tuft'],focusScale:2.0}
},
{
  id:'minghe', arc:'I', source:'原著原文', inkTone:6, tone:0.86,
  refs:[refOf(1474), refOf(1476), refOf(1478)],
  canon:'冥河之地是地渊中一处险地，以辟邪神雷可破其禁制；六足、木青等以韩立不惧神雷反噬为借，要他助破冥河禁制、入冥河之地办一件事。冥河黑雾弥漫，雾中伸着手，是幽冥般的险境。',
  quotes:[
    q(1474,'「虽然还有些不太纯熟，但是威力毋庸置疑的，可破冥河禁制的。……我倒也看出了韩道友不被神雷反噬的些许眉目来。」'),
    q(1474,'「现在也到该向你讲明一些事情的时候……我可以回答你三个想知道的问题……进入冥河之地后，帮我做一件事情。」')
  ],
  scene:{terrain:'冥河黑水 / 浮雾岸',sky:'幽冥黑雾',architecture:'无（仅禁制石碑）',flora:'无',ground:'黑水与浮雾',atmosphere:'幽冥、伸手、神雷反噬'},
  decor:[['puddle',0.34],['mist',0.3],['rock',0.2],['bone',0.16]],
  landmarks:[{kind:'stele',name:'冥河禁制石碑'}],
  terrain:['water'],
  art:'一汪近黑的静水居中，水上一抹横拉的黑雾带，雾中几道断续手影；全图压低明度，不画神雷金白光。',
  diff:['游戏 desc「冥河上没有船，只有一层浮着的黑雾。雾里伸着手」与原著 #1474 冥河之地、黑雾、辟邪神雷破禁吻合；明度压低以表幽冥，不落黑彩。仅标注不改数据。'],
  composition:{focus:'冥河一汪近黑静水与横拉的黑雾带',focusCase:'deadsea',layout:'void',breath:3,clusters:1,palette:['puddle','mist','rock'],focusScale:1.8}
},
{
  id:'lianxu', arc:'I', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refOf(1517), refOf(1520), refOf(1524)],
  canon:'黑隐山脉中，青元子洞府内花木高不尺许却草木气息逼人，令人如处密林大山。韩立体内七十二口青竹蜂云剑（以金雷竹为主材炼成）在此自行飞出盘旋；青元子现身，点明剑诀来历，授其种剑之法，以图灵界第一道大关。',
  quotes:[
    q(1517,'这些花木，高不过尺许的，但是远远就可闻到从上面散发而出的草木气息。只是寥寥数盆花木，竟然让人仿佛置身于密林大山之中。'),
    q(1517,'韩立尚未明白对方是何意时，就觉体内七十二口青竹蜂云剑同时一颤，被一股巨大吸力一催，就自行飞出体外，围着身体盘旋不定起来。')
  ],
  scene:{terrain:'黑隐山脉洞府 / 石洞',sky:'洞外山色',architecture:'青元子洞府口、石室',flora:'尺许花木、草木气息',ground:'洞府石地与苔',atmosphere:'幽洞、种剑、剑诀自鸣'},
  decor:[['rock',0.3],['moss',0.26],['tree',0.24],['tuft',0.2]],
  landmarks:[{kind:'gate',name:'黑隐山脉洞府口'}],
  terrain:['cliff'],
  art:'一处只勾淡墨边的洞府口斜挑，洞前几丛矮木与苔点；不画金雷竹金光与飞剑，只留白当幽洞。',
  diff:['游戏 clear「金阙玉书 七十二页炼器外页」实属此处青元子授剑诀/种剑情节（#1517），游戏将金阙玉书误挂到玉阙阁灵地（lingdi 条）。仅标注不改数据。'],
  composition:{focus:'黑隐山脉青元子洞府口与洞前矮木',focusCase:'minehead',layout:'corner',breath:2,clusters:2,palette:['rock','moss','tree'],focusScale:1.7}
},
{
  id:'yuyang', arc:'I', source:'原著原文', inkTone:5, tone:0.9,
  refs:[refOf(1276), refOf(1292), refOf(1293)],
  canon:'虞阳城是天元境中第一批建立的上古之城，距当年安远城极远；天元圣皇曾在此将炼体术修至极致。此城又是天元境有名的灵具制造之地，每年大批灵具在城中诞生，被炼体士与商号采买。韩立在此隐修数十年，暗中发展起一间拍卖行。',
  quotes:[
    q(1292,'虞阳城就是一座从三境初立时，第一批在天元境中建立的上古之城。'),
    q(1292,'除此之外，虞阳城还是天元城中有名的灵具制造之地，每年都有大批灵具在城中诞生，又被城中的炼体士或者大小商号纷纷采购而走。'),
    q(1293,'虞阳城离那昔年的安远城相隔极远。……他的目标自然就是最近几座城市之一的虞阳城。这可是炼体士极其向往之地。')
  ],
  scene:{terrain:'上古石城 / 妖族坊市',sky:'城上长天',architecture:'虞阳城兽骨城门、灵具坊肆',flora:'无',ground:'石街与兽骨夯墙',atmosphere:'上古、妖族、灵具之地'},
  decor:[['rock',0.32],['banner',0.24],['mist',0.24],['bone',0.2]],
  landmarks:[{kind:'gate',name:'虞阳城兽骨城门'}],
  terrain:['cliff'],
  art:'以一组石砌屋宇块面当主景，转角一具兽骨门框断续勾出；不画妖族与人族坊市颜色，只取石质明度（本图 hasInkBg=false，由视觉层补铺同款宣纸）。',
  diff:['游戏 desc「墙是兽骨夯的，坊市里卖的货和人族坊市不是一路——伴妖草论把抓，妖丹按颗数」：原著 #1292-1293 虞阳城是上古之城、灵具制造地，韩立在此隐修并发展拍卖行；「兽骨夯墙」「伴妖草论把抓」系游戏增写氛围。仅标注不改数据。'],
  composition:{focus:'虞阳城一组石砌屋宇与兽骨门框',focusCase:'stonehut',layout:'band',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.8}
},
{
  id:'yuyang_dou', arc:'I', source:'原著原文', inkTone:5, tone:0.9,
  refs:[refOf(1292), refOf(1293), refOf(1310)],
  canon:'虞阳城斗场是城中比斗之所，规矩只认下场人的输赢。韩立曾以炼体士身份下场，压了外乡人彩头；魁首认输后围观妖族哄散，输赢比人族更讲规矩。此图是妖族城中的斗场一隅。',
  quotes:[
    q(1292,'虞阳城就是一座从三境初立时，第一批在天元境中建立的上古之城。'),
    q(1292,'除此之外，虞阳城还是天元城中有名的灵具制造之地，每年都有大批灵具在城中诞生……')
  ],
  scene:{terrain:'斗场空场 / 围观众影',sky:'场地上方天光',architecture:'斗场围栏、彩头石桌',flora:'无',ground:'夯土场与兽骨碎',atmosphere:'比斗、彩头、妖族围观'},
  decor:[['banner',0.3],['rock',0.28],['mist',0.24],['ruin',0.18]],
  landmarks:[{kind:'banner',name:'城斗场彩头旗'}],
  terrain:['cloud'],
  art:'两道断续阵线横贯画面当对峙双方，中间留白当空场，一侧一杆彩头旗幡；不画妖族与人影颜色，只取旗幡明度（本图 hasInkBg=false，由视觉层补铺同款宣纸）。',
  diff:['游戏 desc「规矩只有一条：下场的人，输赢自己认」「魁首认了输……没人赖账——妖族城里，输赢比人族讲规矩」与原著虞阳城斗场氛围吻合；「彩头堆得比石桌还高」为游戏增写。仅标注不改数据。'],
  composition:{focus:'斗场两道断续阵线之间的彩头旗幡',focusCase:'battleline',layout:'band',breath:2,clusters:2,palette:['banner','rock','mist'],focusScale:1.8}
},
// ================= arc J：风元边缘 → 雷鸣海域 → 天云十三族 → 魔金山脉 → 广寒界 → 进阶合体 =================
{
  id:'fengyuan', arc:'J', source:'原著原文', inkTone:4, tone:0.95,
  refs:[refOf(1530), refOf(1535), refOf(1749)],
  canon:'黑隐山脉在风元大陆边缘半岛，韩立在此种剑百年。四妖（牛首小兽、金猿等）在一处破损上古遗址中寻得换血炼体奇物，特来献宝，求韩立援手。玄天果实将熟之夜，天顶压下一大片血云，终以空间缝隙将他抛往雷鸣大陆。',
  quotes:[
    q(1530,'「这东西是我们四人在黑隐山脉的一处破损上古遗址中找到的。如今特来想献给前辈！」'),
    q(1530,'「前辈慧眼如炬，一眼就看出此物来历了。……具有换血炼体奇效，是你们妖兽进阶时难得的辅助灵药，算是千年难得一见的奇物。」')
  ],
  scene:{terrain:'黑隐山脉峰峦 / 破损上古遗址',sky:'峰顶天风、玄天血云',architecture:'遗址残柱、石台',flora:'山岩稀木',ground:'山岩与碎石',atmosphere:'种剑百年、献宝、血云将至'},
  decor:[['rock',0.32],['mist',0.28],['pine',0.22],['bone',0.18]],
  landmarks:[{kind:'stele',name:'黑隐山脉上古遗址残碑'}],
  terrain:['cliff'],
  art:'几座没骨峰峦叠出远近层次，峰间一处遗址残柱断续；不画玄天血云与金猿，只留白当山风。',
  diff:['游戏 desc「玄天果实熟的那夜，天顶压下来一片血云」「身后裂开一道空间缝隙，把他扔去了雷鸣大陆」与原著 #1530 种剑、#1749 玄天血云、空间抛送吻合。仅标注不改数据。'],
  composition:{focus:'黑隐山脉几座叠出的峰峦与遗址残柱',focusCase:'stormpeak',layout:'void',breath:3,clusters:2,palette:['rock','mist','pine'],focusScale:2.0}
},
{
  id:'huohu', arc:'J', source:'原著原文', inkTone:4, tone:0.96,
  refs:[refOf(1542), refOf(1543), refOf(1552)],
  canon:'火瑚群岛是雷鸣大陆外海域的数百里大岛，岛上火阳族以女性蛇人居多，由大祭司主事；岛上亦有蜥蜴类兽与乌黑车子。火阳族正被乌罗族逼至最后一岛，韩立卷入其间。',
  quotes:[
    q(1542,'海岛足有数百里大，这几名蛇女纵然动作奇快，但若这般步行走到岛中心处，恐怕不是一时半刻的事情。'),
    q(1542,'韩立也注意到，这个火阳族中显然女性蛇人比男性蛇人数量多得多。')
  ],
  scene:{terrain:'火瑚群岛礁岸 / 蛇人棚',sky:'海天',architecture:'茶棚式简易建筑、乌黑车子',flora:'无',ground:'礁石与海浪',atmosphere:'海岛、蛇人、被逼至绝岛'},
  decor:[['rock',0.3],['puddle',0.28],['mist',0.24],['tuft',0.18]],
  landmarks:[{kind:'bones',name:'火瑚群岛蛇人祭石'}],
  terrain:['water'],
  art:'一组没骨礁石斜挑出海面，浪线以断续笔触横拉；不画蛇人与乌黑车子颜色，只取礁石明度。',
  diff:['游戏 desc「火瑚群岛上的火阳族，正被乌罗族逼到最后一岛」与原著 #1542-1552 火阳族/乌罗族吻合；「火瑚」之彩色不落，只取礁石明度。仅标注不改数据。'],
  composition:{focus:'火瑚群岛一组斜挑出海的礁石',focusCase:'reef',layout:'corner',breath:3,clusters:2,palette:['rock','puddle','mist'],focusScale:1.7}
},
{
  id:'shisan', arc:'J', source:'原著原文', inkTone:4, tone:0.97,
  refs:[refOf(1565), refOf(1583), refOf(1584)],
  canon:'天云十三族是雷鸣大陆上十三个族群结成的盟，天云城为共用中枢，城里什么都卖，包括破损的天外魔甲。韩立受托将一匣对十三族极重要的东西送往万古族，可换通灵级傀儡；若被角蚩族追上则须毁匣。',
  quotes:[
    q(1565,'「这匣子有几件对我们天云十三族极其重要的东西……若是几位道友被角蚩族的追上，最好在被抓之前，将此匣立刻毁掉。」'),
    q(1565,'「……单凭此物可以向我们万古族几位长老换取一件通灵级傀儡或者同阶的其他宝物。」')
  ],
  scene:{terrain:'天云城中枢 / 族盟厅',sky:'城上云',architecture:'天云城中枢门、万古族长老殿',flora:'无',ground:'石阶与城基',atmosphere:'十三族盟、通灵傀儡、角蚩追逼'},
  decor:[['rock',0.3],['banner',0.26],['mist',0.24],['ruin',0.2]],
  landmarks:[{kind:'gate',name:'天云城中枢门'}],
  terrain:['cliff'],
  art:'一组退晕的族盟厅阁当主景，一侧一杆族旗断续；不画通灵傀儡与天外魔甲颜色，只取石阁明度。',
  diff:['游戏 desc「天云城是他们共用的中枢……包括一件破损的天外魔甲」与原著 #1565 天云十三族、天云城、天外魔甲吻合；clear「广寒令 从旧货堆翻出」系后续情节并入。仅标注不改数据。'],
  composition:{focus:'天云城一组退晕的族盟厅阁与族旗',focusCase:'clanhall',layout:'band',breath:2,clusters:2,palette:['rock','banner','mist'],focusScale:1.9}
},
{
  id:'mojin', arc:'J', source:'原著原文', inkTone:5, tone:0.9,
  refs:[refOf(1588), refOf(1613), refOf(1615)],
  canon:'魔金山脉在雷鸣大陆，云城拍卖行将拍一颗圣阶荆棘魔兽魔核，引韩立留意；山脉深处更盘踞一头合体级魔猿，身怀山岳巨猿真血，怀里还揣半截来路不明的残刃。韩立入山取真血。',
  quotes:[
    q(1588,'在三个月后，云城拍卖行之一的云祥拍卖行，将会有一颗圣阶荆棘魔兽的魔核拍卖。'),
    q(1588,'「魔金山脉！我只知道有这么一个地方，但是具体的情形，还真不清楚的。」')
  ],
  scene:{terrain:'魔金山脉深谷 / 魔猿巢',sky:'山谷阴云',architecture:'无（天然山脉与巢穴）',flora:'山岩稀木',ground:'山岩与兽骨',atmosphere:'魔兽、真血、残刃微鸣'},
  decor:[['rock',0.34],['mist',0.28],['pine',0.2],['bone',0.18]],
  landmarks:[{kind:'bones',name:'魔金山脉魔猿巢骨'}],
  terrain:['cliff'],
  art:'几座没骨峰峦夹一幽谷，谷口散落兽骨；不画魔猿与赤金真血颜色，只取山岩明度。',
  diff:['游戏 desc「一头合体级的魔猿盘踞多年。它身上有山岳巨猿的真血，怀里还揣着半截来路不明的残刃」与原著 #1588/#1613 魔金山脉、圣阶魔核、山岳巨猿真血吻合；「半截残刃……远处有人醒了」系后续伏笔。仅标注不改数据。'],
  composition:{focus:'魔金山脉几座夹谷峰峦与散落兽骨',focusCase:'minehead',layout:'void',breath:3,clusters:2,palette:['rock','mist','pine'],focusScale:2.0}
},
{
  id:'guanghan', arc:'J', source:'原著原文', inkTone:5, tone:0.88,
  refs:[refOf(1594), refOf(1595), refOf(1596)],
  canon:'广寒界是灵界有名的大秘境，寒气三千年不散，界中守着的傀儡比寒气更难缠。韩立持广寒令，被千机子等长老邀入；入界后傀儡碎地，玉台上静卧一枚万妙丹，殿后满界灵药与太乙青山。',
  quotes:[
    q(1594,'随后，韩立就跟着胖老者离开了客栈，而那枚被称为「广寒令」的令牌，就这般在无数甲士看守下，仍留在了客栈中。'),
    q(1594,'「韩道友也坐吧。因为广寒令牵扯较大，我已经去请族中的另两位长老到此了……现在的云城，万古族一切事情都是我三人做主的。」')
  ],
  scene:{terrain:'广寒界玉台 / 冰洁殿',sky:'寒雾',architecture:'玉台门、傀儡廊、太乙青山',flora:'无（灵药在殿后）',ground:'冰洁石地与寒雾',atmosphere:'大秘境、寒气、傀儡难缠'},
  decor:[['rock',0.32],['mist',0.3],['moss',0.22],['pine',0.16]],
  landmarks:[{kind:'gate',name:'广寒界玉台门'}],
  terrain:['cloud'],
  art:'一面剔透冰墙（只勾淡墨边、中间留白）当主景，墙前几道寒雾横笔；明度略压以表幽寒，不落冰蓝彩。',
  diff:['游戏 desc「寒气三千年不散。界里守着的傀儡，比寒气更难缠」与原著 #1594-1596 广寒令、广寒界、傀儡吻合；明度压低表寒而不把纸涂黑。仅标注不改数据。'],
  composition:{focus:'广寒界一面剔透冰墙与横笔寒雾',focusCase:'icewall',layout:'frame',breath:3,clusters:1,palette:['rock','mist','moss'],focusScale:1.8}
},
{
  id:'heti_guan', arc:'J', source:'原著原文', inkTone:4, tone:0.97,
  refs:[refOf(1764), refOf(1765), refOf(1766)],
  canon:'韩立回天渊城闭关，进阶合体。巨猿虚影深吸吐出大片金光，将四散电弧卷入大口；所喷金光化为一根光柱没入五色灵云，各色符文被巨力吸入腹中。炼神术第一层在识海立住，三千年一次的大天劫压顶，他一步未退。',
  quotes:[
    q(1764,'巨猿却猛然一抬头颅的深吸一口气，大嘴一张，大片金光一喷而出。顿时四散的电弧在金光一散中，纷纷被包裹其中的吸入了金猿大口中……'),
    q(1764,'灵云中闷响之声一下连绵不绝，五色灵云竟以金色光柱为中心的旋转起来。……各色符文在巨大吸力之下，纷纷从灵云中一飞而出，再被金色光狂闪的卷入其中，最终被巨猿虚影全吸入了腹中。')
  ],
  scene:{terrain:'天渊城闭关殿 / 五色灵云',sky:'五色灵云、金光光柱',architecture:'闭关殿、合体典礼台',flora:'无',ground:'殿基石地',atmosphere:'进阶合体、金光、大天劫'},
  decor:[['rock',0.3],['mist',0.28],['banner',0.24],['tuft',0.18]],
  landmarks:[{kind:'banner',name:'合体典礼金云旗'}],
  terrain:['cloud'],
  art:'一组悬浮殿檐当主景，上方一道断续金线光柱没入淡墨灵云团；不画五色与金光彩色，只取光柱明度与云形。',
  diff:['游戏 clear「炼神术第一层在识海里立住了。三千年一次的大天劫压下来，他一步没退」与原著 #1764-1766 进阶合体、五色灵云、金光光柱吻合。仅标注不改数据。'],
  composition:{focus:'合体典礼一组悬浮殿檐与没入灵云的金线光柱',focusCase:'floatingpalace',layout:'band',breath:2,clusters:1,palette:['rock','mist','banner'],focusScale:2.1}
}
];

// ---- 幂等合并 ----
const before = doc.maps.filter(m => m.batch !== 5);
const seen = new Set(before.map(m => m.id));
const added = [];
for (let bi = 0; bi < B5.length; bi++) {
  const d = B5[bi];
  const row = inv.find(x => x.id === d.id);
  if (!row) throw new Error('地图清单里找不到 ' + d.id);
  if (seen.has(d.id)) throw new Error('id 与前几批重复：' + d.id);
  seen.add(d.id);
  const { id, arc, source, inkTone, tone, refs, canon, quotes, scene, decor, landmarks, terrain, art, diff, composition } = d;
  added.push({
    id, order: before.length + bi + 1, arc, name: row.name, pos: row.pos,
    type: row.type, side: !!row.side, batch: 5, hasInkBg: !!row.inkBg,
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

// ---- meta 口径同步（当前状态字段动态重算；历史 stage 记录保留当时数字）----
const n = doc.maps.length;
const b1 = doc.maps.filter(m => m.batch === 1), b2 = doc.maps.filter(m => m.batch === 2);
const b3 = doc.maps.filter(m => m.batch === 3), b4 = doc.maps.filter(m => m.batch === 4), b5 = doc.maps.filter(m => m.batch === 5);
const native = doc.maps.filter(m => m.hasInkBg).map(m => m.id);
const patched = doc.maps.filter(m => !m.hasInkBg).map(m => m.id);
const off = inv.length - n;
doc.meta.generated = '2026-11-06';
doc.meta.batch = '批次5 · 首批 + 第二批 + 第三批 + 第四批 + 第五批';
doc.meta.scope = '首批 18（arc A/B/X）+ 第二批 11（arc C/D）+ 第三批 21（arc E/F）+ 第四批 19（arc G/H）+ 第五批 19（arc I/J）= ' + n + ' 张；灵界篇第八卷～第十卷前两段（初入灵界 → 天元境 → 天渊城 → 风元/飞灵/地渊 → 雷鸣海域 → 天云十三族 → 魔金山脉 → 广寒界 → 进阶合体）；剩余 ' + off + ' 张（arc K~M，全属灵界篇）仍按篇章逐图原著考据推进，不全量铺开、不按 arc 分组';
doc.meta.method = '按每张图的 name / pos / desc / clearDesc 定关键词 → 全文回查命中章 → 按卷剔后期同名章 → 指定章精读环境描写 → 摘出原文短引 → 编译成外观要素与渲染参数；第五批证据见 codex/batch5-evidence.md / batch5-chapters.md（97 章精读，0 超界）/ batch5-scenes.md（1286 行景物原句）/ batch5-facts.md（游戏文案断言逐条核实）';
doc.meta.counts = {
  maps: n, batch1: b1.length, batch2: b2.length, batch3: b3.length, batch4: b4.length, batch5: b5.length,
  mainline: doc.maps.filter(m => !m.side).length,
  side: doc.maps.filter(m => m.side).length,
  withDiff: doc.maps.filter(m => m.diff && m.diff.length).length
};
doc.meta.discipline[3] = '次景 kind 限定在现有 sc3Bake 的 7 类：gate / stele / well / bones / stair / banner / lantern；art 已结构化落地为 composition.focusCase 的 24 类原著主景（首批 8 + 第二批 3 + 第三批 6 + 第四批 7 = 24 类；第五批 19 张全部复用，无新增 case）';
doc.meta.composition.cases = 'narrowgate / pool / stonehut / temple / stonering / grove / minehead / shed（首批 8 类）+ furnace / ship / reef（第二批 3 类）+ floatingpalace / bamboostand / deadsea / stoneroom / stormpeak / clanhall（第三批 6 类）+ battleline / desertruin / grasscamp / pagoda / icewall / thunderhead / featherfall（第四批 7 类，sc3Bake big 画布专属形状）+ 第五批 19 张全部复用上述 24 类既有主景，逐图 composition 差异化，sc3Bake 无需新增 case';
doc.meta.style.quant.focusKinds = 24;
doc.meta.style.conformance.native = native.join(' / ') + '（' + native.length + ' 张，数据层已有 inkBg）';
doc.meta.style.conformance.patched = patched.join(' / ') + '（' + patched.length + ' 张，视觉层补铺宣纸）';
doc.meta.style.paper.scope = native.length + ' 张有 inkBg 的图由 buildGrass 直接出纸；' + patched.length + ' 张无 inkBg 的增补图由视觉层 sc3BakePaper() 补铺同款 tile，不改 m.bg / m.inkBg；分组由真源 hasInkBg 驱动';
doc.meta.style.principles[0] = '纸性统一：' + n + ' 张一律浅宣纸底（#ddd6c3 / #e6e0cf / #d0c8b2 三色无缝纸纹）；中国水墨画幽暗靠积墨，不靠把纸涂黑';
doc.meta.style.nextBatches = '剩余 ' + off + ' 张（arc K~M，全属灵界篇第十卷之后）仍按篇章逐图原著考据推进，沿用本基线（纸性 / 一图一主笔 / 聚落留白 / 笔法 / 灰阶），不全量铺开、不按 arc 分组；人界篇 69 张 + 灵界篇前两段 19 张已收口';
doc.meta.stage9 = {
  status: '已落地（版本 bump 见第106轮收尾：index.html / sw.js → 20261106M）',
  batch5: 'Jerry「继续推进」：第五批 19 张（arc I 13 + arc J 6，灵界篇第八卷～第十卷前两段）逐图回查原文写进唯一真源 mapCodex.json；按完整 arc 边界收口，不做半截、不越篇章。至此累计 88 张（人界篇 69 + 灵界篇前两段 19），白名单仍直接取 window.MAP_CODEX 的 key，game.js 的白名单逻辑一字段未改，实证「加一张台账自动启用一张」',
  evidence: '证据链五段：probe-batch5.mjs 专名定位并显式分列「灵界篇内命中 / 越界命中」→ probe-batch5-chapters.mjs 按卷核定 97 章精读（第八卷 42 / 第九卷 49 / 第十卷 6，超界 0）→ probe-batch5-scenes.mjs 抽 1286 行景物原句 → probe-batch5-facts.mjs 逐条核实游戏文案的量化与事件断言。人工核定纠正：黑隐山脉/天渊城/虞阳城在 arc I 与 arc J 各出现一次，靠各自独特专名（种剑 vs 风元大陆 / 金阙玉书 vs 进阶合体 / 妖族 vs 城斗场）区分，结果 0 超界章',
  focusCases: '19 张全部复用既有 24 类 sc3Bake 主景（desertruin / narrowgate / stonering / thunderhead / clanhall / pagoda / grove / pool / floatingpalace / deadsea / minehead / stonehut / battleline / stormpeak / reef / icewall 等），逐图 composition（focus/layout/breath/clusters/palette/focusScale）各不相同；sc3Bake 无需新增 case，主景形状仍 24 类',
  discipline: '严守灰阶（赤日热浪 / 两色雷劫 / 冥河黑雾 / 玄天血云 / 五色灵云 / 广寒寒气 / 真蟾灵血只取明度不落彩）、不改游戏 name / pos / desc、不碰判定；19 张全部带原文摘引与差异标注。明确冲突只标注不改数据：金阙玉书实属青元子黑隐山脉（误挂玉阙阁灵地）、虞阳城兽骨墙/伴妖草为游戏增写、落日之墓火光系后期情节前置',
  qa: 'verify-scenery3 扩到 N 组（第五批自动启用 / 88 张 / 24 类形状全覆盖 / 纸性分组动态口径 / 标杆零回归）；smoke 全绿；0 pageerror；shot-batch5.mjs 逐图实拍并亲眼看'
};

// ---- 同步三个仍嵌入动态数字的散文口径（生成器会据此强校验，忘改会直接失败）----
const nMood = doc.maps.filter(m => m.mood).length;
doc.meta.stage2.untracked = (doc.meta.stage2.untracked || '').replace(/未收录的 \d+ 张图/, '未收录的 ' + off + ' 张图').replace('第二批 11 张 \+ 第三批 21 张 \+ 第四批 19 张加入后', '首批 18 \+ 第二批 11 \+ 第三批 21 \+ 第四批 19 \+ 第五批 19 张加入后');
doc.meta.style.conformance.outOfScope = (doc.meta.style.conformance.outOfScope || '').replace(/未收录 \d+ 张/, '未收录 ' + off + ' 张');
doc.meta.stage5.discipline = (doc.meta.stage5.discipline || '').replace(/其余 \d+ 张无 mood/, '其余 ' + (n - nMood) + ' 张无 mood');

fs.writeFileSync(SRC, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('合并完成：' + b1.length + ' + ' + b2.length + ' + ' + b3.length + ' + ' + b4.length + ' + ' + b5.length + ' = ' + n + ' 张；剩余 ' + off + ' 张（arc K~M）');
