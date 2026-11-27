/* 凡人·长生劫 —— StoryStage（主画布剧情层）
 *
 * 目标：不换引擎、不另起插画屏。人物就在战斗地图上按原著剧情走动、说话、做小动作；
 *       竹林 / 炼骨崖结绳 / 神手谷田园 / 赤水峰瀑布 / 石室 / 天气都是真实数据区，会挡路或改移速。
 *
 * 真源约束：
 *   - 台词只写 li，正文运行时从 window.MAP_STORIES.<mapId> 取，动画不另写一句；
 *   - 人物图读 window.Sprites，韩立仍由主画布 drawSpr 画，只是被本层临时挪位；
 *   - 世界冻结沿用 G.state==='dialog'（loop 只在 play 跑 update，render 照常跑）；
 *   - 镜头沿用 preview/camera-poc-runtime.js 验过的 render-time override：
 *     dialog 态每帧写 G.cam，主画布所有视差 / 裁剪 / 地标读者一起跟着走。
 *
 * 命令：weather / actor / say / walk / act / cam / wait / fade
 * 区域：zones[] 用相对进图时主角落点的坐标；block 真挡，speed 真改移速。
 */
(function () {
  'use strict';

  var STAGES = {
    qixuan: {
      canon: '第一卷·七玄门（第1~8章：彩霞山入门试、炼骨崖结绳、墨大夫带入神手谷药庐，授无名口诀〈后称长春功〉）',
      title: '彩霞山 · 炼骨崖',
      zones: [
        { kind: 'house',  x: -300, y: -120, w: 100, h: 70,  block: true,  name: '五里沟旧屋' },
        { kind: 'house',  x: -190, y: -95,  w: 80,  h: 60,  block: true,  name: '青牛镇客舍' },
        { kind: 'bamboo', x: -30,  y: -70,  w: 70,  h: 140, speed: 0.80, name: '竹林陡坡' },
        { kind: 'wall',   x: 35,   y: -200, w: 22,  h: 150, block: true,  name: '山门左墙' },
        { kind: 'wall',   x: 35,   y: 45,   w: 22,  h: 150, block: true,  name: '山门右墙' },
        { kind: 'gate',   x: 25,   y: -55,  w: 42,  h: 100, name: '彩霞山石阶口' },
        { kind: 'stair',  x: 58,   y: -105, w: 105, h: 210, speed: 0.74, name: '上山石阶' },
        { kind: 'cliff',  x: 168,  y: -100, w: 96,  h: 190, speed: 0.70, name: '炼骨崖岩壁' },
        { kind: 'rope',   x: 207,  y: -92,  w: 8,   h: 120, name: '打结麻绳' },
        { kind: 'pillar', x: 252,  y: -20,  w: 18,  h: 18,  block: true,  name: '崖顶石锁' },
        { kind: 'hut',    x: 300,  y: -85,  w: 85,  h: 62,  block: true,  name: '神手谷房舍' }
      ],
      actors: [
        { id: 'hanli',    x: 0,   y: 0,   dir: 1,  spr: 'hanli',    scale: 1.7, show: true },
        { id: 'zhangtie', x: 44,  y: 16,  dir: 1,  spr: 'zhangtie', scale: 1.6, show: true },
        { id: 'wuyan',    x: 215, y: -72, dir: -1, spr: 'neimen',   scale: 1.5, show: false },
        { id: 'mo',       x: 310, y: -30, dir: -1, spr: 'mo',       scale: 1.8, show: false }
      ],
      steps: [
        { t: 'weather', kind: 'mist', speed: 0.90, label: '彩霞山 · 晨雾' },
        { t: 'say', li: [0], label: '五里沟' },
        { t: 'walk', who: 'hanli', to: [-70, 20], speed: 72, dur: 2.6, label: '韩立随三叔上路' },
        { t: 'say', li: [1], label: '三叔捎话' },
        { t: 'walk', who: 'zhangtie', to: [-42, 26], speed: 72, dur: 1.5, label: '张铁并肩' },
        { t: 'say', li: [2], label: '彩霞山入门试' },
        { t: 'cam', dx: 110, dy: 0, dur: 1.1, label: '镜头移向石阶' },
        { t: 'walk', who: 'hanli', to: [92, 4], speed: 82, dur: 3.0, label: '踏上上山石阶' },
        { t: 'walk', who: 'zhangtie', to: [62, 12], speed: 82, dur: 3.0, label: '张铁跟进' },
        { t: 'say', li: [3], label: '炼骨崖 · 结绳攀崖' },
        { t: 'actor', who: 'wuyan', show: true, x: 215, y: -72, dir: -1, label: '舞岩先到崖顶' },
        { t: 'act', who: 'wuyan', anim: 'taunt', dir: -1, dur: 0.8, label: '小拇指轻慢' },
        { t: 'cam', dx: 215, dy: 0, dur: 0.9, label: '镜头移向炼骨崖' },
        { t: 'walk', who: 'hanli', to: [186, -8], speed: 76, dur: 2.8, label: '竹林 · 岩壁' },
        { t: 'act', who: 'hanli', anim: 'climb', dir: 1, dur: 1.2, label: '抓结绳攀崖' },
        { t: 'actor', who: 'wuyan', show: false, label: '舞岩下山' },
        { t: 'walk', who: 'hanli', to: [228, -12], speed: 66, dur: 2.2, label: '正午前登顶' },
        { t: 'say', li: [4], label: '只做记名弟子' },
        { t: 'actor', who: 'mo', show: true, x: 270, y: -25, dir: -1, label: '墨大夫开口' },
        { t: 'say', li: [5], label: '留下罢' },
        { t: 'act', who: 'hanli', anim: 'bow', dir: 1, dur: 0.9, label: '韩立行礼' },
        { t: 'walk', who: 'hanli', to: [285, -12], speed: 78, dur: 1.8, label: '随墨大夫进谷' },
        { t: 'say', li: [6], label: '神手谷' },
        { t: 'weather', kind: 'clear', speed: 1, label: '雾散' },
        { t: 'say', li: [7], label: '无名口诀 / 象甲功' },
        { t: 'fade', from: 0, to: 1, dur: 0.35, label: '收场' }
      ]
    },
    houshan: {
      canon: '第一卷·后山药庐（第5~10章：神手谷田园、半年把脉、赤水峰瀑布顶水、山谷小绿瓶）',
      title: '七玄门 · 神手谷 / 赤水峰',
      zones: [
        { kind: 'hut',       x: -155, y: -125, w: 95, h: 70,  block: true, name: '神手谷房舍' },
        { kind: 'stoneDoor', x: -120, y: -30,  w: 58, h: 46,  block: true, name: '石室青石门' },
        { kind: 'herb',      x: -20,  y: 35,   w: 120, h: 34,  speed: 0.62, name: '药草田园' },
        { kind: 'wall',      x: 90,   y: -160, w: 16, h: 95,  block: true, name: '山径石壁' },
        { kind: 'stair',     x: 130,  y: -90,  w: 90, h: 180, speed: 0.78, name: '上山石阶' },
        { kind: 'stream',    x: 235,  y: -20,  w: 55, h: 140, speed: 1.25, name: '赤水峰山径' },
        { kind: 'waterfall', x: 272,  y: -40,  w: 30, h: 130, speed: 0.72, name: '赤水峰瀑布' },
        { kind: 'wall',      x: 320,  y: -110, w: 70, h: 60,  block: true, name: '赤水峰山壁' }
      ],
      actors: [
        { id: 'hanli',    x: 0,   y: 0,   dir: 1,  spr: 'hanli',    scale: 1.7, show: true },
        { id: 'zhangtie', x: 46,  y: 18,  dir: 1,  spr: 'zhangtie', scale: 1.6, show: true },
        { id: 'mo',       x: 38,  y: -34, dir: 1,  spr: 'mo',       scale: 1.8, show: false }
      ],
      steps: [
        { t: 'weather', kind: 'mist', speed: 0.90, label: '神手谷晨雾' },
        { t: 'say', li: [0], label: '神手谷田园与房舍' },
        { t: 'walk', who: 'hanli', to: [40, 40], speed: 72, dur: 2.2, label: '穿过药园' },
        { t: 'say', li: [1], label: '只教采药炼药' },
        { t: 'actor', who: 'mo', show: true, x: 38, y: -34, dir: 1, label: '墨大夫在谷中' },
        { t: 'cam', dx: 90, dy: -8, dur: 1.0, label: '镜头移向田园' },
        { t: 'walk', who: 'hanli', to: [100, -8], speed: 78, dur: 2.6, label: '认药除草' },
        { t: 'weather', kind: 'clear', speed: 1, label: '半年后' },
        { t: 'say', li: [2], label: '半年把脉' },
        { t: 'act', who: 'mo', anim: 'pulse', dir: 1, dur: 1.1, label: '墨大夫按脉门' },
        { t: 'say', li: [3], label: '丹田里的凉气' },
        { t: 'actor', who: 'mo', show: false, label: '墨大夫回房' },
        { t: 'cam', dx: 210, dy: 0, dur: 1.0, label: '镜头上赤水峰' },
        { t: 'walk', who: 'hanli', to: [210, 0], speed: 82, dur: 2.8, label: '沿山路上赤水峰' },
        { t: 'weather', kind: 'mist', speed: 0.86, label: '瀑布水汽' },
        { t: 'walk', who: 'zhangtie', to: [282, 8], speed: 78, dur: 2.5, label: '张铁站到瀑布下' },
        { t: 'say', li: [4], label: '象甲功' },
        { t: 'act', who: 'zhangtie', anim: 'lift', dir: 1, dur: 1.2, label: '顶水冲练' },
        { t: 'say', li: [5], label: '皮糙肉厚' },
        { t: 'walk', who: 'hanli', to: [258, 6], speed: 82, dur: 2.0, label: '韩立走近看张铁' },
        { t: 'say', li: [6], label: '药汁木棒与石室' },
        { t: 'walk', who: 'hanli', to: [286, 10], speed: 66, dur: 1.4, label: '脚下一滑' },
        { t: 'act', who: 'hanli', anim: 'bottle', dir: 1, dur: 0.8, label: '踢到小绿瓶' },
        { t: 'say', li: [7], label: '小绿瓶' },
        { t: 'weather', kind: 'clear', speed: 1, label: '雾散' },
        { t: 'fade', from: 0, to: 1, dur: 0.3, label: '收场' }
      ]
    },
    yelang: {
      canon: '第一卷·七玄门后期（第74~99章：野狼帮围山门、金光上人逞威、韩立反杀得升仙令；落日峰三位师叔、李长老、马荣、蓝衣执法、王门主传令亲信、张袖儿、返乡小妹均在此时出场）',
      title: '七玄门 · 野狼帮之围',
      zones: [
        { kind: 'house',     x: -260, y: -110, w: 96, h: 74,  block: true, name: '五里沟旧屋' },
        { kind: 'wall',      x: -120, y: -150, w: 20,  h: 130, block: true, name: '山门左墙' },
        { kind: 'wall',      x: -120, y: 30,   w: 20,  h: 130, block: true, name: '山门右墙' },
        { kind: 'gate',      x: -130, y: -56,  w: 40,  h: 106, name: '七玄门山门' },
        { kind: 'pillar',    x: -20,  y: -28,  w: 22,  h: 22,  block: true, name: '断碑' },
        { kind: 'stair',     x: 60,   y: -100, w: 100, h: 200, speed: 0.76, name: '山门石阶' },
        { kind: 'house',     x: 168,  y: -96,  w: 92,  h: 70,  block: true, name: '七玄门演武堂' },
        { kind: 'bamboo',    x: 250,  y: -70,  w: 64,  h: 140, speed: 0.82, name: '山后竹林' }
      ],
      actors: [
        { id: 'hanli',      x: 0,    y: 0,    dir: 1,  spr: 'hanli',           scale: 1.7, show: true },
        // 七玄门一侧：三位师叔 + 李长老 + 马荣 + 张袖儿 + 王门主传令亲信，山门后列阵（群众演员，不抢台词）
        { id: 'huishishu',  x: 70,   y: -18,  dir: -1, spr: 'huishishu',       scale: 1.5, show: false },
        { id: 'rushishu',   x: 92,   y: -8,   dir: -1, spr: 'rushishu',        scale: 1.5, show: false },
        { id: 'luosaihu',   x: 114,  y: 2,    dir: -1, spr: 'luosaihu',        scale: 1.6, show: false },
        { id: 'lizhanglao', x: 136,  y: -12,  dir: -1, spr: 'lizhanglao',      scale: 1.5, show: false },
        { id: 'wangqinxin', x: 158,  y: 6,    dir: -1, spr: 'wangqinxin',      scale: 1.6, show: false },
        { id: 'marong',     x: 180,  y: -6,   dir: -1, spr: 'marong',          scale: 1.5, show: false },
        { id: 'zhangxiuer', x: 202,  y: 10,   dir: -1, spr: 'zhangxiuer',      scale: 1.4, show: false },
        // 野狼帮一侧：蓝衣执法 + 贾天龙（复用既有）+ 金光上人
        { id: 'lanyizhifa', x: -96,  y: -14,  dir: 1,  spr: 'lanyizhifa',      scale: 1.5, show: false },
        { id: 'jialong',    x: -60,  y: -4,   dir: 1,  spr: 'jiatianlong',     scale: 1.7, show: false },
        { id: 'jinguang',   x: -34,  y: -26,  dir: 1,  spr: 'jinguangshangren',scale: 1.4, show: false },
        // 返乡：韩家小妹嫁衣（ch99），收场闪回一列；云翅鸟在 ch98 属韩立肩头，不与此列混写
        { id: 'xiaomei',    x: 232,  y: 14,   dir: -1, spr: 'hanxiaomei',      scale: 1.4, show: false }
      ],
      steps: [
        { t: 'weather', kind: 'mist', speed: 0.90, label: '围山第三日 · 晨雾' },
        { t: 'say', li: [0], label: '山门被围三日' },
        { t: 'walk', who: 'hanli', to: [-70, 14], speed: 74, dur: 2.4, label: '韩立绕到山门侧' },
        { t: 'say', li: [1], label: '墨居仁死了半年' },
        // 野狼帮一列依次亮相（群众演员入场）
        { t: 'actor', who: 'lanyizhifa', show: true, label: '蓝衣执法列阵' },
        { t: 'actor', who: 'jialong', show: true, label: '贾天龙出阵' },
        { t: 'cam', dx: 40, dy: 0, dur: 0.9, label: '镜头扫向阵前' },
        { t: 'say', li: [2], label: '贾天龙阵前' },
        { t: 'actor', who: 'jinguang', show: true, x: -34, y: -26, dir: 1, label: '金光上人脚不沾地' },
        { t: 'act', who: 'jinguang', anim: 'pulse', dir: 1, dur: 0.8, label: '金光上人逞威' },
        { t: 'say', li: [3], label: '金光上人：一帮凡人' },
        { t: 'say', li: [4], label: '韩立认出灵气' },
        // 七玄门一列：三位师叔 / 李长老 / 王门主传令亲信 / 马荣 / 张袖儿守在石阶后
        { t: 'actor', who: 'huishishu', show: true, label: '灰衣剑客师叔守山' },
        { t: 'actor', who: 'rushishu', show: true, label: '儒衫师叔守山' },
        { t: 'actor', who: 'luosaihu', show: true, label: '络腮胡师叔守山' },
        { t: 'actor', who: 'lizhanglao', show: true, label: '李长老' },
        { t: 'actor', who: 'wangqinxin', show: true, label: '七玄门 · 王门主传令亲信现身' },
        { t: 'actor', who: 'marong', show: true, label: '马荣' },
        { t: 'actor', who: 'zhangxiuer', show: true, label: '张袖儿' },
        { t: 'cam', dx: 150, dy: 0, dur: 1.0, label: '镜头移向七玄门列阵' },
        { t: 'say', li: [5], label: '长春功第九层' },
        { t: 'say', li: [6], label: '韩立站出来' },
        // 收场：返乡一列（韩家小妹）闪过，接升仙令；云翅鸟在韩立肩头，不写进小妹队伍
        { t: 'actor', who: 'xiaomei', show: true, label: '返乡 · 小妹嫁衣' },
        { t: 'cam', dx: 235, dy: 0, dur: 0.9, label: '镜头掠返乡一列' },
        { t: 'walk', who: 'hanli', to: [-16, 2], speed: 80, dur: 2.2, label: '韩立走到石碑前' },
        { t: 'say', li: [7], label: '手心捏起火弹' },
        { t: 'fade', from: 0, to: 1, dur: 0.3, label: '收场' }
      ]
    },
    xuesestory: {
      canon: '第二卷·血色试炼（约第170~211章：七派禁地混战，向之礼攒弱者联盟、封岳黄雀、钟吾 ch193 换中心区资料；约第231~247章：出禁地后李化元收徒，于坤/宋蒙/武炫为绿波洞同门）',
      title: '血色禁地 · 中心区',
      zones: [
        { kind: 'house',     x: -250, y: -110, w: 92, h: 70,  block: true, name: '禁地口石屋' },
        { kind: 'wall',      x: -140, y: -120, w: 22, h: 150, block: true, name: '灰白迷雾石壁' },
        { kind: 'gate',      x: -150, y: -50,  w: 40, h: 100, name: '禁地入口' },
        { kind: 'herb',      x: -30,  y: 34,   w: 120, h: 38, speed: 0.64, name: '灵药凹地' },
        { kind: 'pillar',    x: 60,   y: -30,  w: 24, h: 24,  block: true, name: '断裂石柱' },
        { kind: 'stair',     x: 110,  y: -96,  w: 96, h: 190, speed: 0.74, name: '中心区石阶' },
        { kind: 'stoneDoor', x: 208,  y: -40,  w: 58, h: 50,  block: true, name: '中心区禁制门' },
        { kind: 'stream',    x: 260,  y: -20,  w: 54, h: 130, speed: 1.22, name: '山涧急流' }
      ],
      actors: [
        { id: 'hanli',      x: 0,   y: 0,   dir: 1,  spr: 'hanli',          scale: 1.7, show: true },
        // 禁地同场试炼者：向之礼 / 封岳 / 钟吾
        { id: 'xiangzhili', x: -92, y: -12, dir: 1,  spr: 'xiangzhili',    scale: 1.5, show: false },
        { id: 'fengyue',    x: 96,  y: -8,  dir: -1, spr: 'fengyue',        scale: 1.7, show: false },
        { id: 'zhongwu',    x: 168, y: 12,  dir: -1, spr: 'zhongwu',        scale: 1.6, show: false },
        // 绿波洞同门（收场才露面）：于坤 / 宋蒙 / 武炫
        { id: 'yukun',      x: 262, y: -10, dir: -1, spr: 'yukun',          scale: 1.5, show: false },
        { id: 'songmeng',   x: 284, y: 8,   dir: -1, spr: 'songmeng',       scale: 1.6, show: false },
        { id: 'wuxuan',     x: 306, y: -6,  dir: -1, spr: 'wuxuan',         scale: 1.5, show: false }
      ],
      steps: [
        { t: 'weather', kind: 'mist', speed: 0.88, label: '禁地 · 灰白迷雾' },
        { t: 'say', li: [0], label: '七派弟子各占一方' },
        { t: 'walk', who: 'hanli', to: [-44, 26], speed: 72, dur: 2.2, label: '韩立蹲下探路' },
        { t: 'say', li: [1], label: '看清地面' },
        { t: 'actor', who: 'xiangzhili', show: true, label: '向之礼凑上来' },
        { t: 'walk', who: 'xiangzhili', to: [-20, 14], speed: 66, dur: 1.4, label: '老滑头靠近' },
        { t: 'say', li: [2], label: '弱者联盟' },
        { t: 'act', who: 'xiangzhili', anim: 'bow', dir: 1, dur: 0.7, label: '笑得圆滑' },
        { t: 'say', li: [3], label: '眼睛瞟储物袋' },
        { t: 'actor', who: 'xiangzhili', show: false, label: '向之礼走开' },
        { t: 'cam', dx: 120, dy: 0, dur: 1.0, label: '镜头移向西边' },
        { t: 'actor', who: 'fengyue', show: true, label: '封岳挡路' },
        { t: 'say', li: [4], label: '疤脸蓝袍中年人' },
        { t: 'act', who: 'fengyue', anim: 'taunt', dir: -1, dur: 0.8, label: '鹰勾鼻狞笑' },
        { t: 'say', li: [5], label: '把东西留下' },
        { t: 'say', li: [6], label: '十三层狂人，先稳住' },
        { t: 'actor', who: 'fengyue', show: false, label: '封岳退场' },
        { t: 'cam', dx: 195, dy: 0, dur: 1.0, label: '镜头转向麻子丑汉' },
        { t: 'actor', who: 'zhongwu', show: true, label: '钟吾凑过来' },
        { t: 'walk', who: 'zhongwu', to: [146, 8], speed: 68, dur: 1.4, label: '大小眼滴溜溜' },
        { t: 'say', li: [7], label: '满脸麻子的丑汉' },
        { t: 'say', li: [8], label: '换图' },
        { t: 'say', li: [9], label: '各留一手' },
        { t: 'weather', kind: 'clear', speed: 1, label: '迷雾散去' },
        // 收场：镜头掠到禁地口，李化元收徒，三位同门依次露面
        { t: 'cam', dx: 285, dy: 0, dur: 1.1, label: '镜头回禁地口' },
        { t: 'actor', who: 'yukun', show: true, label: '于坤引路' },
        { t: 'actor', who: 'songmeng', show: true, label: '宋蒙冷眼' },
        { t: 'actor', who: 'wuxuan', show: true, label: '武炫别过脸' },
        { t: 'say', li: [10], label: '记名弟子韩立' },
        { t: 'say', li: [11], label: '黄枫谷的门开了' },
        { t: 'fade', from: 0, to: 1, dur: 0.3, label: '收场' }
      ]
    }
  };

  var P = null;
  var cv = null, ctx = null, styleEl = null, raf = 0, lastT = 0, nextQueued = false;

  var API = {
    force: false,
    available: function () {
      return !!(window.__FR && window.__FR.G && window.__FR.G.player);
    },
    canPlay: function (id) { return !!STAGES[id]; },
    blockedAt: function (id, x, y) {
      var st = STAGES[id]; if (!st) return false;
      for (var i = 0; i < st.zones.length; i++) if (st.zones[i].block && hitRect(x, y, 0.1, st.zones[i])) return true;
      return false;
    },
    speedAtRel: function (x, y) {
      if (!P) return 1;
      return +speedAt(x, y).toFixed(3);
    },
    stages: function () { return STAGES; },
    zones: function (id) { return (STAGES[id] && STAGES[id].zones) || []; },
    steps: function (id) { return (STAGES[id] && STAGES[id].steps) || []; },
    start: start,
    replay: replay,
    stop: stop,
    skip: skip,
    tick: tick,
    state: state
  };

  function cloneZone(z) {
    var o = {};
    for (var k in z) if (Object.prototype.hasOwnProperty.call(z, k)) o[k] = z[k];
    return o;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function actor(id) {
    if (!P) return null;
    for (var i = 0; i < P.actors.length; i++) if (P.actors[i].id === id) return P.actors[i];
    return null;
  }
  function FR() { return window.__FR || null; }
  function G() { return (FR() && FR().G) || null; }

  function mount() {
    var stage = document.getElementById('style') ? document.getElementById('style').parentNode : null;
    stage = document.getElementById('stage') || stage;
    if (!stage) return false;
    cv = document.getElementById('storyStage');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'storyStage';
      var game = document.getElementById('game');
      if (game && game.nextSibling) stage.insertBefore(cv, game.nextSibling);
      else stage.appendChild(cv);
    }
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:0;display:block;';
    ctx = cv.getContext('2d');
    // 真实玩家的收场口：旧插画层右上角有「跳过」，新层也得有，且不能穿透到战斗输入。
    // 必须挂在 body：#stage 有 transform 会自成层叠上下文，放里面会被 #dialog(z=40) 盖住点不到。
    var sb = document.getElementById('storyStageSkipBtn');
    if (!sb) {
      sb = document.createElement('button');
      sb.id = 'storyStageSkipBtn';
      sb.type = 'button';
      sb.textContent = '跳过 »';
      sb.style.cssText = 'position:fixed;z-index:9999;' +
        'border:1px solid rgba(201,162,74,.55);border-radius:5px;' +
        'background:rgba(12,14,17,.72);color:#e9dfc8;font-family:"KaiTi","STKaiti",serif;' +
        'letter-spacing:1px;cursor:pointer;-webkit-tap-highlight-color:transparent;';
      sb.addEventListener('click', function (e) { e.stopPropagation(); skip(); });
      document.body.appendChild(sb);
    }
    sb.style.display = 'block';
    placeSkip();
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'storyStageBackdrop';
      // 过场时只撤掉对话遮罩，让主画布地形透出来；破境题款有自己的类，不碰。
      styleEl.textContent = '#dialog{background:transparent !important;}' +
        'body[data-skin="guigu"] #dialog:not(.break-scene){background:transparent !important;}' +
        // 剧情层是独占演出：战斗 HUD 全退，只留「跳过」，收层后随类一并恢复。
        'body.story-stage-on #topbar,body.story-stage-on #quickbar,' +
        'body.story-stage-on #parryBtn,body.story-stage-on #chatBtn,' +
        'body.story-stage-on #skillrow,body.story-stage-on #banner,' +
        'body.story-stage-on #fsHint,body.story-stage-on #ver' +
        '{opacity:0 !important;pointer-events:none !important;}';
      document.head.appendChild(styleEl);
    }
    document.body.classList.add('story-stage-on');
    resize();
    return true;
  }

  function resize() {
    if (!cv || !P) return;
    var stage = document.getElementById('stage');
    var w = (stage && stage.clientWidth) || 480;
    var h = (stage && stage.clientHeight) || 864;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    P.view = { w: w, h: h, dpr: dpr };
    placeSkip();
  }

  // 跳过按钮跟着 #stage 的实际缩放走：逻辑坐标 right:14 / top:96 换算成屏幕 px。
  // 96 是故意压过顶栏「大衍 / 禁制」两枚素签的，真机上不跟它们叠在一起。
  function placeSkip() {
    var sb = document.getElementById('storyStageSkipBtn');
    var stage = document.getElementById('stage');
    if (!sb || !stage || sb.style.display === 'none') return;
    var r = stage.getBoundingClientRect();
    var sc = (r.width || 480) / 480;
    sb.style.top = (r.top + 96 * sc) + 'px';
    sb.style.right = Math.max(0, window.innerWidth - r.right + 14 * sc) + 'px';
    sb.style.fontSize = Math.max(10, 12 * sc) + 'px';
    sb.style.padding = (5 * sc) + 'px ' + (10 * sc) + 'px';
  }

  function applyHero() {
    if (!P || !FR()) return;
    var g = G(), p = g && g.player;
    var a = actor('hanli');
    if (!p || !a) return;
    p.x = P.origin.x + a.x; p.y = P.origin.y + a.y;
    p.dir = a.dir < 0 ? -1 : 1;
    p.moving = !!a.moving;
    if (typeof a.gait === 'number') p.gait = a.gait;
  }

  function applyCam() {
    var g = G();
    if (!P || !g) return;
    g.cam.x = P.baseCam.x + P.cam.x;
    g.cam.y = P.baseCam.y + P.cam.y;
  }

  function inRect(x, y, z) { return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h; }
  function hitRect(x, y, r, z) {
    var nx = clamp(x, z.x, z.x + z.w), ny = clamp(y, z.y, z.y + z.h);
    var dx = x - nx, dy = y - ny;
    return dx * dx + dy * dy < r * r;
  }
  function blocked(x, y, r) {
    if (!P) return false;
    for (var i = 0; i < P.zones.length; i++) {
      var z = P.zones[i];
      if (z.block && hitRect(x, y, r == null ? 12 : r, z)) return true;
    }
    return false;
  }
  function speedAt(x, y) {
    var mul = 1;
    if (!P) return mul;
    for (var i = 0; i < P.zones.length; i++) {
      var z = P.zones[i];
      if (z.speed && inRect(x, y, z)) mul *= z.speed;
    }
    if (P.weather && P.weather.speed) mul *= P.weather.speed;
    return clamp(mul, 0.35, 1.8);
  }

  function moveStep(a, s, dt) {
    var tx = s.to[0], ty = s.to[1];
    var dx = tx - a.x, dy = ty - a.y;
    var d = Math.hypot(dx, dy);
    if (d < 5) { a.moving = false; if (a.id === 'hanli') applyHero(); return true; }
    var speed = (s.speed || 76) * speedAt(a.x, a.y);
    var step = Math.min(d, speed * dt);
    var ux = dx / d, uy = dy / d;
    var nx = a.x + ux * step, ny = a.y + uy * step;
    if (!blocked(nx, ny)) { a.x = nx; a.y = ny; }
    else if (!blocked(nx, a.y)) { a.x = nx; }
    else if (!blocked(a.x, ny)) { a.y = ny; }
    a.dir = ux < -0.2 ? -1 : (ux > 0.2 ? 1 : a.dir);
    a.moving = true;
    a.gait = (a.gait || 0) + dt * 9.5;
    if (a.id === 'hanli') applyHero();
    return Math.hypot(tx - a.x, ty - a.y) < 5;
  }

  function pickLines(li, lines) {
    if (li == null) return [];
    var idx = Array.isArray(li) ? li : [li];
    var out = [];
    for (var i = 0; i < idx.length; i++) {
      var n = idx[i];
      if (lines && lines[n]) out.push(lines[n]);
    }
    return out;
  }

  function sayStep(s, i) {
    var lines = pickLines(s.li, P.lines);
    if (!lines.length) { next(); return; }
    var f = FR();
    if (!f || typeof f.showLines !== 'function') { next(); return; }
    var g = G();
    g.state = 'dialog';
    f.showLines(lines, function () { next(); }, 'stage:' + P.mapId + ':' + i);
  }

  function enterStep(i) {
    if (!P || !P.active || P.finished) return;
    if (i >= P.steps.length) { finish('normal'); return; }
    P.i = i; P.stepT = 0;
    var s = P.steps[i];
    if (s.t === 'weather') {
      P.weather = { kind: s.kind || 'clear', speed: s.speed == null ? 1 : s.speed, t: 0 };
      next();
    } else if (s.t === 'actor') {
      var a = actor(s.who);
      if (a) {
        if (s.show != null) a.show = !!s.show;
        if (s.x != null) a.x = s.x;
        if (s.y != null) a.y = s.y;
        if (s.dir != null) a.dir = s.dir;
      }
      next();
    } else if (s.t === 'say') {
      sayStep(s, i);
    } else if (s.t === 'walk') {
      var w = actor(s.who);
      if (!w) { next(); return; }
      // 起步前先朝向目标：否则上一拍往左走，下一拍「穿门向右」截出来是背对山门。
      var wdx = (s.to && s.to[0] != null) ? s.to[0] - w.x : 0;
      if (Math.abs(wdx) > 2) w.dir = wdx < 0 ? -1 : 1;
      w.moving = true;
    } else if (s.t === 'act') {
      var b = actor(s.who);
      if (b) {
        b.act = s.anim || 'bow'; b.actT = 0; b.actDur = s.dur || 0.6;
        if (s.dir != null) b.dir = s.dir;
        // 不再借主画布 atkAnim：那道剑弧按战斗朝向画，跟「行礼」对不上，会飘在人物旁边。
        // 动作全交给本层 drawAct，位置永远贴着剧情人物。
      }
    } else if (s.t === 'cam') {
      P.camFrom = { x: P.cam.x, y: P.cam.y };
      P.camTo = { x: s.dx || 0, y: s.dy || 0 };
    } else if (s.t === 'fade') {
      P.fade = s.from || 0;
    } else if (s.t === 'wait') {
      // 只有计时，没有副作用
    } else {
      console.warn('[StoryStage] 未实现的命令：', s.t);
      next();
    }
  }

  function advance(dt) {
    if (!P || !P.active || P.finished) return;
    var s = P.steps[P.i];
    if (!s) { finish('normal'); return; }
    P.stepT += dt;
    if (P.weather) P.weather.t += dt;

    var done = false;
    if (s.t === 'walk') {
      var a = actor(s.who);
      done = !a || moveStep(a, s, dt) || P.stepT >= (s.dur || 3) + 0.8;
      if (done && a) a.moving = false;
    } else if (s.t === 'act') {
      var b = actor(s.who);
      if (b) b.actT = Math.min(b.actDur || 0.6, P.stepT);
      done = P.stepT >= (s.dur || 0.6);
      if (done && b) { b.act = ''; b.actT = 0; }
    } else if (s.t === 'cam') {
      var k = ease(P.stepT / (s.dur || 1));
      P.cam.x = lerp(P.camFrom.x, P.camTo.x, k);
      P.cam.y = lerp(P.camFrom.y, P.camTo.y, k);
      done = P.stepT >= (s.dur || 1);
    } else if (s.t === 'fade') {
      var kf = ease(P.stepT / (s.dur || 0.4));
      P.fade = lerp(s.from || 0, s.to || 0, kf);
      done = P.stepT >= (s.dur || 0.4);
    } else if (s.t === 'wait') {
      done = P.stepT >= (s.dur || 0.5);
    }
    if (done) next();
  }

  function next() {
    if (!P || !P.active || P.finished || nextQueued) return;
    nextQueued = true;
    // 用一次性排队代替「忙标志丢弃」：同一拍里 onEnd 与计时完成可能都叫 next，
    // 旧写法会把后一次直接丢掉，步子就永远停在这一拍。
    setTimeout(function () {
      nextQueued = false;
      if (!P || !P.active || P.finished) return;
      enterStep(P.i + 1);
    }, 0);
  }

  function tick(dt) {
    if (!P || !P.active || P.finished) return false;
    var d = clamp(+dt || 0, 0, 0.05);
    advance(d);
    applyCam();
    draw();
    return true;
  }

  function frame(t) {
    if (!P || !P.active) return;
    var dt = 0;
    if (lastT) dt = clamp((t - lastT) / 1000, 0, 0.05);
    lastT = t;
    if (document.visibilityState !== 'hidden') advance(dt);
    applyCam();
    draw();
    raf = requestAnimationFrame(frame);
  }

  function draw() {
    if (!ctx || !P || !P.view) return;
    var g = G();
    if (!g) return;
    var w = P.view.w, h = P.view.h;
    ctx.clearRect(0, 0, w, h);
    drawZones(g);
    drawActors(g);
    drawWeather(Math.min(w, h));
    if (P.fade > 0.001) {
      ctx.globalAlpha = clamp(P.fade, 0, 1);
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  function sx(x, g) { return P.origin.x + x - g.cam.x; }
  function sy(y, g) { return P.origin.y + y - g.cam.y; }

  function drawZones(g) {
    for (var i = 0; i < P.zones.length; i++) {
      var z = P.zones[i];
      var x = sx(z.x, g), y = sy(z.y, g);
      if (x + z.w < -40 || y + z.h < -40 || x > P.view.w + 40 || y > P.view.h + 40) continue;
      drawZone(z, x, y);
    }
  }

  function drawZone(z, x, y) {
    var c = ctx;
    c.save();
    c.globalAlpha = 0.72;
    c.lineWidth = 1.2;
    c.strokeStyle = 'rgba(28,24,20,.62)';
    c.fillStyle = 'rgba(28,24,20,.30)';
    if (z.kind === 'house' || z.kind === 'hut' || z.kind === 'ruin') {
      c.fillRect(x, y + 10, z.w, z.h - 10);
      c.beginPath();
      c.moveTo(x - 8, y + 12); c.lineTo(x + z.w / 2, y - z.h * 0.34); c.lineTo(x + z.w + 8, y + 12);
      c.closePath(); c.fill(); c.stroke();
      if (z.kind === 'ruin') {
        c.globalAlpha = 0.5;
        c.beginPath(); c.moveTo(x + z.w * 0.2, y + z.h * 0.2); c.lineTo(x + z.w * 0.35, y + z.h * 0.8); c.stroke();
      }
    } else if (z.kind === 'wall') {
      c.fillStyle = 'rgba(30,26,22,.55)'; c.fillRect(x, y, z.w, z.h); c.strokeRect(x, y, z.w, z.h);
      c.globalAlpha = 0.28;
      for (var q = 12; q < z.h; q += 18) { c.beginPath(); c.moveTo(x, y + q); c.lineTo(x + z.w, y + q + 4); c.stroke(); }
    } else if (z.kind === 'gate') {
      c.globalAlpha = 0.5;
      c.beginPath(); c.moveTo(x - 10, y + z.h); c.lineTo(x + 4, y - 12); c.stroke();
      c.beginPath(); c.moveTo(x + z.w - 4, y - 12); c.lineTo(x + z.w + 10, y + z.h); c.stroke();
    } else if (z.kind === 'stair') {
      c.globalAlpha = 0.32;
      for (var t = 0; t < z.h; t += 16) { c.beginPath(); c.moveTo(x, y + t); c.lineTo(x + z.w, y + t - 5); c.stroke(); }
    } else if (z.kind === 'bamboo') {
      c.globalAlpha = 0.42;
      c.strokeStyle = 'rgba(52,66,45,.72)';
      for (var bx = 8; bx < z.w; bx += 13) {
        var lean = (bx % 3) * 2 - 2;
        c.beginPath(); c.moveTo(x + bx, y + z.h); c.lineTo(x + bx + lean, y - 6); c.stroke();
        c.beginPath(); c.moveTo(x + bx + lean, y + 18); c.lineTo(x + bx + lean + 9, y + 8); c.stroke();
      }
    } else if (z.kind === 'cliff') {
      c.globalAlpha = 0.50;
      c.fillStyle = 'rgba(44,40,35,.26)';
      c.fillRect(x, y, z.w, z.h);
      c.strokeStyle = 'rgba(28,24,20,.62)';
      for (var ry = 10; ry < z.h; ry += 22) {
        c.beginPath(); c.moveTo(x + 4 + (ry % 3) * 3, y + ry); c.lineTo(x + z.w - 6, y + ry - 7); c.stroke();
      }
    } else if (z.kind === 'rope') {
      c.globalAlpha = 0.72;
      c.strokeStyle = 'rgba(190,164,116,.9)';
      c.beginPath(); c.moveTo(x + z.w / 2, y); c.lineTo(x + z.w / 2, y + z.h); c.stroke();
      for (var ky = 14; ky < z.h; ky += 17) {
        c.beginPath(); c.arc(x + z.w / 2, y + ky, 3.2, 0, 6.283); c.stroke();
      }
    } else if (z.kind === 'stoneDoor') {
      c.globalAlpha = 0.62;
      c.fillStyle = 'rgba(34,32,29,.62)';
      c.fillRect(x, y + 8, z.w, z.h - 8);
      c.strokeRect(x, y + 8, z.w, z.h - 8);
      c.beginPath(); c.moveTo(x + z.w / 2, y + 8); c.lineTo(x + z.w / 2, y + z.h); c.stroke();
    } else if (z.kind === 'herb') {
      c.globalAlpha = 0.42;
      for (var hx = 6; hx < z.w; hx += 14) {
        c.beginPath(); c.moveTo(x + hx, y + z.h); c.lineTo(x + hx + 3, y + 6); c.stroke();
      }
    } else if (z.kind === 'stream') {
      c.globalAlpha = 0.36;
      for (var sy2 = 8; sy2 < z.h; sy2 += 18) {
        c.beginPath();
        c.moveTo(x, y + sy2);
        c.bezierCurveTo(x + z.w * 0.3, y + sy2 - 7, x + z.w * 0.7, y + sy2 + 7, x + z.w, y + sy2);
        c.stroke();
      }
    } else if (z.kind === 'waterfall') {
      c.globalAlpha = 0.38;
      c.strokeStyle = 'rgba(202,220,226,.95)';
      for (var wx = 5; wx < z.w; wx += 7) {
        c.beginPath(); c.moveTo(x + wx, y); c.lineTo(x + wx - 2, y + z.h); c.stroke();
      }
      c.globalAlpha = 0.22;
      c.fillStyle = 'rgba(226,235,236,.5)';
      c.fillRect(x - 4, y + z.h - 10, z.w + 8, 10);
    } else if (z.kind === 'pillar') {
      c.fillStyle = 'rgba(32,28,24,.55)'; c.beginPath(); c.ellipse(x + z.w / 2, y + z.h / 2, z.w / 2, z.h / 2, 0, 0, 6.283); c.fill(); c.stroke();
    }
    c.restore();
  }

  function drawActors(g) {
    for (var i = 0; i < P.actors.length; i++) {
      var a = P.actors[i];
      if (!a.show || a.id === 'hanli') continue;
      var x = sx(a.x, g), y = sy(a.y, g);
      if (x < -80 || x > P.view.w + 80 || y < -100 || y > P.view.h + 100) continue;
      var c = (window.Sprites || {})[a.spr || a.id];
      if (c) {
        var sc = a.scale || 1.6;
        var cw = c.width * sc, ch = c.height * sc;
        ctx.save();
        ctx.globalAlpha = 0.96;
        ctx.translate(x, y + ch / 2);
        if (a.dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(c, -cw / 2, -ch, cw, ch);
        ctx.restore();
      }
      if (a.act) drawAct(x, y, a);
    }
    var h = actor('hanli');
    if (h && h.act) drawAct(sx(h.x, g), sy(h.y, g), h);
  }

  function drawAct(x, y, a) {
    var k = clamp((a.actT || 0) / (a.actDur || 0.6), 0, 1);
    var dir = a.dir < 0 ? -1 : 1;
    ctx.save();
    ctx.globalAlpha = 0.82 * (1 - k * 0.35);
    ctx.strokeStyle = 'rgba(201,162,74,.95)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    if (a.act === 'bow') {
      // 俯身弧线贴着肩到膝，不飘在头顶
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 20);
      ctx.quadraticCurveTo(x, y - 5 - k * 4, x + 9, y - 20);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 24, 5 + k * 3, -0.2, Math.PI + 0.2); ctx.stroke();
    } else if (a.act === 'taunt') {
      // 舞岩的小拇指：只在肩前一点，不画大剑弧
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + dir * 6, y - 24); ctx.lineTo(x + dir * 16, y - 28 - k * 3); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + dir * 17, y - 29 - k * 3, 2.2, 0, 6.283); ctx.stroke();
    } else if (a.act === 'climb') {
      // 双手交替抓结绳，脚跟轻蹬岩壁
      ctx.strokeStyle = 'rgba(205,176,118,.95)';
      ctx.beginPath(); ctx.moveTo(x - 7, y - 12 - k * 6); ctx.lineTo(x - 2, y - 34 - k * 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 7, y - 16 + k * 6); ctx.lineTo(x + 3, y - 38 + k * 10); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - 2, y - 34 - k * 10, 2.6, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 3, y - 38 + k * 10, 2.6, 0, 6.283); ctx.stroke();
    } else if (a.act === 'pulse') {
      // 墨大夫按脉门：一条细线从指端探向韩立腕 / 丹田
      ctx.strokeStyle = 'rgba(201,162,74,.82)';
      ctx.beginPath();
      ctx.moveTo(x + dir * 8, y - 20);
      ctx.quadraticCurveTo(x + dir * 28, y - 26, x + dir * 42 - k * 6, y - 18);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x + dir * 42 - k * 6, y - 18, 3 + k * 2, 0, 6.283); ctx.stroke();
    } else if (a.act === 'lift') {
      // 两条上举手臂 + 顶上一圈水劲，落在人物身上而不是远处
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 14); ctx.lineTo(x - 11, y - 34 - k * 8);
      ctx.moveTo(x + 7, y - 14); ctx.lineTo(x + 11, y - 34 - k * 8);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 38 - k * 8, 5 + k * 3, 0, Math.PI * 2); ctx.stroke();
      // 瀑布打在肩背上的短弧，强调顶水而不是凭空举重
      ctx.strokeStyle = 'rgba(190,210,218,.72)';
      for (var wi = 0; wi < 3; wi++) {
        ctx.beginPath();
        ctx.moveTo(x - 14 + wi * 14, y - 46 - k * 6);
        ctx.quadraticCurveTo(x - 10 + wi * 14, y - 34, x - 14 + wi * 14, y - 22);
        ctx.stroke();
      }
    } else if (a.act === 'bottle') {
      // 脚边一点青光：韩立踢到小绿瓶的那一下
      ctx.strokeStyle = 'rgba(112,196,154,.95)';
      ctx.fillStyle = 'rgba(112,196,154,.30)';
      var bx = x + dir * 15, by = y - 3;
      ctx.beginPath(); ctx.ellipse(bx, by, 4 + k * 2, 3 + k, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by - 3 - k); ctx.lineTo(bx, by - 9 - k * 2); ctx.stroke();
      ctx.globalAlpha = 0.32;
      ctx.beginPath(); ctx.arc(bx, by, 9 + k * 5, 0, 6.283); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x, y - 12, 7 + k * 9, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawWeather(span) {
    if (!P.weather || P.weather.kind === 'clear') return;
    var kind = P.weather.kind, t = P.weather.t || 0;
    var n = kind === 'rain' ? 72 : 44;
    ctx.save();
    ctx.globalAlpha = kind === 'rain' ? 0.24 : 0.16;
    ctx.strokeStyle = kind === 'rain' ? 'rgba(190,208,220,.9)' : 'rgba(226,225,214,.9)';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 1;
    for (var i = 0; i < n; i++) {
      var seed = (i * 97) % 101;
      var x = ((seed * 13 + t * (kind === 'rain' ? 62 : 14)) % (span + 90)) - 45;
      var y = ((seed * 29 + t * (kind === 'rain' ? 380 : 22)) % (span + 90)) - 45;
      if (kind === 'rain') {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 15); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, 2 + (seed % 3), 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
  }

  function clearDialog() {
    var g = G();
    if (!g) return;
    var d = document.getElementById('dialog');
    if (d) d.style.display = 'none';
    g.dialogLines = null; g.dialogEnd = null; g.dialogMeta = null;
    g.dialogId = null; g.dialogIdx = 0; g.dialogSynced = false; g.dialogIsChoice = false;
  }

  function unmount() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (cv) cv.style.display = 'none';
    var sb = document.getElementById('storyStageSkipBtn');
    if (sb) sb.style.display = 'none';
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    styleEl = null;
    document.body.classList.remove('story-stage-on');
  }

  function finish(kind) {
    if (!P || !P.active || P.finished) return false;
    P.finished = kind || 'normal';
    P.active = false;
    clearDialog();
    var g = G(), p = g && g.player;
    if (p) {
      p.x = P.origin.x; p.y = P.origin.y; p.dir = P.heroDir || 1;
      p.moving = false;
    }
    if (g) { g.cam.x = P.baseCam.x; g.cam.y = P.baseCam.y; g.camLag = null; }
    unmount();
    var f = P.onDone; P.onDone = null;
    if (f) f(kind);
    else if (g) g.state = 'play';
    return true;
  }

  function stop() {
    if (!P || !P.active) return false;
    P.finished = 'stop';
    P.active = false;
    clearDialog();
    var g = G(), p = g && g.player;
    if (p) { p.x = P.origin.x; p.y = P.origin.y; p.dir = P.heroDir || 1; p.moving = false; }
    if (g) { g.cam.x = P.baseCam.x; g.cam.y = P.baseCam.y; g.camLag = null; }
    unmount();
    P.onDone = null;
    return true;
  }

  function skip() { return finish('skip'); }

  function start(mapId, lines, onDone, opts) {
    var st = STAGES[mapId];
    var f = FR(), g = G();
    if (!st || !f || !g || !g.player) { if (onDone) onDone('unavailable'); return false; }
    if (P && P.active) stop();

    opts = opts || {};
    var p = g.player;
    P = {
      mapId: mapId,
      stage: st,
      lines: lines || (window.MAP_STORIES && window.MAP_STORIES[mapId]) || [],
      steps: st.steps,
      zones: st.zones.map(cloneZone),
      actors: st.actors.map(function (a) {
        var o = {}; for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
        o.gait = 0; o.act = ''; o.actT = 0; o.actDur = 0; o.moving = false;
        return o;
      }),
      origin: { x: p.x, y: p.y },
      heroDir: p.dir || 1,
      baseCam: { x: g.cam.x, y: g.cam.y },
      cam: { x: 0, y: 0 }, camFrom: { x: 0, y: 0 }, camTo: { x: 0, y: 0 },
      weather: null, fade: 0,
      i: 0, stepT: 0, active: true, finished: null,
      onDone: onDone || null,
      replay: !!opts.replay,
      view: null
    };
    g.state = 'dialog';
    g.camLag = null; g.shake = 0; g.flash = 0;
    g.dialogLines = null; g.dialogEnd = null; g.dialogId = null; g.dialogIdx = 0;
    g.dialogSynced = false; g.dialogIsChoice = false;
    if (!mount()) { P.active = false; if (onDone) onDone('nomount'); return false; }
    applyHero(); applyCam(); draw();
    nextQueued = false; lastT = 0;
    enterStep(0);
    raf = requestAnimationFrame(frame);
    return true;
  }

  function replay(mapId, onDone) {
    return start(mapId, (window.MAP_STORIES || {})[mapId] || [], onDone, { replay: true });
  }

  function state() {
    if (!P || !P.active) return { active: false, mapId: null, step: 0, total: 0 };
    var a = actor('hanli') || {};
    var g = G();
    return {
      active: true,
      mapId: P.mapId,
      replay: !!P.replay,
      step: P.i + 1,
      total: P.steps.length,
      kind: (P.steps[P.i] || {}).t || null,
      label: (P.steps[P.i] || {}).label || '',
      hero: { x: +(a.x || 0).toFixed(1), y: +(a.y || 0).toFixed(1), dir: a.dir || 1 },
      zhangtie: (function () { var z = actor('zhangtie'); return z ? { x: +z.x.toFixed(1), y: +z.y.toFixed(1) } : null; })(),
      stepT: +P.stepT.toFixed(2),
      cam: { x: Math.round(P.cam.x), y: Math.round(P.cam.y) },
      gameCam: g ? { x: Math.round(g.cam.x), y: Math.round(g.cam.y) } : null,
      weather: P.weather ? P.weather.kind : null,
      speed: +speedAt(a.x || 0, a.y || 0).toFixed(3),
      zones: P.zones.length,
      blockers: P.zones.filter(function (z) { return !!z.block; }).length,
      fade: +P.fade.toFixed(3),
      gameState: g ? g.state : null,
      finished: P.finished
    };
  }

  window.addEventListener('resize', function () { if (P && P.active) resize(); });

  window.StoryStage = API;
})();
