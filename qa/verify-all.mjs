// 一键回归：把常驻验收脚本一次跑完，谁红谁绿一眼看全。
//
// 动机（第110轮）：八批下来只有 verify-scenery3 / smoke / verify-ver 是每轮必跑的，
// 其余五个全凭记忆挑着跑，结果 verify-ink-sprite 的两条断言在第102轮 UI 柔化时就已作废、
// 一直红到第109轮才被发现。闸门不进回归清单，红着也没人知道 —— 这个脚本就是那份清单。
//
// 用法：
//   node qa/verify-all.mjs            # 全跑（约 2~4 分钟）
//   node qa/verify-all.mjs --skip-hazards   # 跳过需要浏览器操作 Boss 的耗时项
//   node qa/verify-all.mjs --only scenery3,smoke
//
// 依赖：verify-hazards 需要 127.0.0.1:8123 的静态服务，本脚本会自动起、跑完自动关。
import http from 'node:http';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');            // fanren/
const PORT = 8123;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.mjs': 'text/javascript; charset=utf-8' };

// gate = 有断言、非零退出码代表失败；metric = 只打印度量，不参与判定
const ITEMS = [
  { key: 'scenery3',   file: 'verify-scenery3.mjs',   kind: 'gate',   desc: '场景视觉层十八组（含真源 / 引用自洽 / 装饰唯一性）' },
  { key: 'smoke',      file: 'smoke.mjs',             kind: 'gate',   desc: '无 DOM 桩冒烟（逻辑层 = 294 条）' },
  { key: 'ver',        file: 'verify-ver.mjs',        kind: 'gate',   desc: '版本号自洽（index.html ↔ sw.js ↔ 实际加载）' },
  { key: 'skin',       file: 'verify-skin.mjs',       kind: 'gate',   desc: '双皮配色与明度纪律' },
  { key: 'mapdeck',    file: 'verify-mapdeck.mjs',    kind: 'gate',   desc: '地图卡层级与章节印记' },
  { key: 'ink-sprite', file: 'verify-ink-sprite.mjs', kind: 'gate',   desc: '水墨精灵 / 快捷栏 / 血条笔道' },
  { key: 'story-once', file: 'verify-story-once.mjs', kind: 'gate',   desc: '剧情只演一次（定时 / 过场 / 剧情图 / 收场 / 坊市）+ 跌境界一次性' },
  { key: 'hazards',    file: 'verify-hazards.mjs',    kind: 'gate',   desc: '48 只 Boss 补表覆盖 + 持续型招式判定' },
  { key: 'mapscenery', file: 'verify-mapscenery.mjs', kind: 'gate',   desc: '地图分得开八项（读实现真实数据，不复刻算法）' },
  { key: 'ally-skills', file: 'verify-ally-skills.mjs', kind: 'gate',  desc: '同伴 / 灵宠技能：原著考据 + 覆盖 + 境界四档 + 六形态实机 + 水墨呈现 + 三类功法 + 自由行动 + 生死经济 + 遇险侧身（大衍挂机同口径、不站桩） + 双向反向注入' },
  { key: 'realm-single', file: 'repro-realm-single-source.mjs', kind: 'gate', desc: '境界唯一真源：夹逼图内外同口径（HUD/结算/道陨/通览/修行图/万灵榜/洞府/静修）+ 图内升级不暴涨 + 非夹逼图正常落盘' },
  { key: 'xianjie-order', file: 'repro-xianjie-break.mjs', kind: 'gate', desc: '仙界进阶次序：破境门按原著真仙→金仙→太乙→大罗→道祖升序 + 组头/默认展开/冲关入口都落在下一关' },
  { key: 'cutscene-qixuan', file: 'verify-cutscene-qixuan.mjs', kind: 'gate', desc: '剧情动画资产（两张图 18 拍 + 剧场入口 + 洞府剧情回顾 + 逐拍版式）：2026-11-19 取消进图强制动画——真实玩家首进改走普通 showLines 对白，动画仅在 force（闸门/剧场主动点播）时播；台词逐字同源 MAP_STORIES、人物逐像素等于当前护甲 Sprites.hanli、剧场/回顾列表跨全图点播含无洞府的后山且不写 seen、分镜互不串台、联机不建层不写 seen、双皮只读 SKIN_INK、矮视口不裁字幕、印章不裁字、场景元素避开字幕区、瀑布人物改为潭面打坐（无上举悬空剪影）、跳过/记账/回归兼容' },
  { key: 'storystage',  file: 'verify-storystage.mjs',  kind: 'gate',   desc: '主画布剧情层四段：qixuan / houshan 按原著细化——炼骨崖结绳、舞岩轻慢、神手谷田园与石室、半年把脉、赤水峰瀑布顶水、踢到小绿瓶；yelang 野狼帮之围把七玄门后期 11 张精灵当群众演员依次现身、王门主亲信归七玄门侧且赵长老/云翅鸟不入；xuesestory 血色禁地让向之礼/封岳/钟吾先上场、于坤/宋蒙/武炫收场才露面（时间线不倒错）；台词只写 li 且逐字同源 MAP_STORIES；竹林 / 岩壁 / 瀑布 / 天气真改移速，石墙真挡；剧情独占画面隐去战斗 HUD 只留跳过；洞府「回看 / 重温此段」也改在目标图回放、不写 seen 不领奖，旧 Cutscene 通道不受影响；新增动作库 28 式（礼/战/活）与道具库 17 件守门——动作以脚底为锚按精灵高度缩放、刀剑线不用浅灰、剧情用到的道具必须已登记' },
  { key: 'parry', file: 'verify-parry.mjs', kind: 'gate', desc: '弹反系统（凡人味防御）：数据层（3 件启用载体 / 六类属性矩阵 / 长按衰减 1.0·0.71·0.43 / 共用煞气池 / 联机仅房主）+ runtime 接入（parryResolve/hitPlayer 透传 sk·src / __FR 探针 / guard 槽与三件 g_* 载体 / index.html 引用与加载顺序 / #parryEdge 边缘泛红）' },
  { key: 'batch5', file: 'verify-batch5.mjs', kind: 'gate', desc: '行脚札记（考据可见层）：懒加载 / 171 图分卷 / 未至·到过·已清三档 / 与真源一致 / 发布清单收录 / 双皮站对边 + 境界压制：三档倍率与封顶 / 大境界阶梯现推 / 小怪遁速实测 / 图名尾巴与战前提示' },
  { key: 'batch6', file: 'verify-batch6.mjs', kind: 'gate', desc: '岁月纪（闭关纪年）：入道年数由境界现推（207 年结婴对得上原著）/ 大境界跨度现量 / 不落存档 / 静修页两栏 / 岁月纪只记已过的关 / 打坐真推年数 / 双皮站对边 + 性子：14 条全覆 / 四类齐全 / 洞府可见 / 补型贴身 / 守型护主' },
  { key: 'batch7', file: 'verify-batch7.mjs', kind: 'gate', desc: '联机闭环（双人合击 + 协作解锁）：夹击两秒窗口 / 超窗不续 / 夹击破罩更快 / 只对精英报字 / 合击只打硬仗 / 真伤兜底 / CD 真挡 / 单人零泄漏 + 默契三档边界与数值 / 存档落盘与老档补零账 / 面板档位与进度' },
  { key: 'batch8', file: 'verify-batch8.mjs', kind: 'gate', desc: '同行纪（随行者的往来账 + 羁绊三档）：只带出门的才记一场 / 破境关没闭成不记 / 灵宠与同伴各记各的 / 三档边界 0·8·25 / 本命绝学 CD 1·0.88·0.78 / 生死之交殒了自个儿回来 / 殒落计数 / 洞府两页标签与静修「同行」一节的排序 / 双皮字站对边' },
  { key: 'batch9', file: 'verify-batch9.mjs', kind: 'gate', desc: '放生（账本结转 + 故交册 + 告别 + 防误触）：放生清现役账 / 重获从初识起 CD 回 1 / 故交册字段齐且按放生倒序 / 老档迁移与清档 / 两段式（有账两次、空账直放、超时重算）/ 殒落欠费残留清理 / 告别词报场数与档位 / 静修故交节 DOM=数据 / 双皮字站对边' },
  { key: 'save-symmetry', file: 'verify-save-symmetry.mjs', kind: 'gate', desc: '存档字段对称（P0）：loadSave 键集不漏 defaultSave 五字段 / 道陨·炼丹·药圃真数据读回与脏数据清洗 / 转世清本世账留生涯累计 / 主循环连错进安全且干净帧自动恢复' },
  { key: 'canon-fix', file: 'verify-canon-fix.mjs', kind: 'gate', desc: '原著考据校准：道天大劫札记锚 1382 韩立渡劫（非天庭群仙战）/ 七玄山名青牛镇→彩霞山（含过场洞府）/ 啼魂·霜蚣·冰凤出处 / 发布札记与真源一致' },
  { key: 'mobile-feedback', file: 'verify-mobile-feedback.mjs', kind: 'gate', desc: '手机弹反与反馈：弹反键去 pointerleave + 捕获指针（滑出不误收招也不卡住）/ HUD 卡门显示距巅峰 N 级 / 重要事件横幅分级加粗且 900ms 宽限不被覆盖 / 回前台提示' },
  { key: 'high-polish', file: 'verify-high-polish.mjs', kind: 'gate', desc: '高级感收尾：图标槽固定 1.5em / buildVer 先认 game.js 主包 / 破境成功失败专属合成音 / 页签去系统按钮态并补双皮 hover' },
  { key: 'hit-target', file: 'verify-hit-target.mjs', kind: 'gate', desc: '手机命中精度与考据收尾：窄屏纵向热区补偿（扩命中不改视觉、相邻按钮不抢点击）/ 主线入口对齐 44 逻辑 px / 开场旁白与卷名统一彩霞山、全源码无「青牛山」残留' },
  { key: 'save-durability', file: 'verify-save-durability.mjs', kind: 'gate', desc: '存档耐久：写入失败不再静默（配额满会提示且只喊一次）/ 写新内容前留上一版备份 / 主档写坏可回滚并告知 / 清档连备份一起清' },
  { key: 'batch16', file: 'verify-batch16.mjs', kind: 'gate', desc: '战斗按钮热区（禁制 29px / 大衍 21px 补纵向 ±6 逻辑 px）· 重新开始两段式确认 · 静音跨刷新保留且清档不清 · 画面震动开关认系统减少动效 · 存档导出导入闭环且拒收异形 JSON · 暂停面板报上次存档时间 · 弹反首战提示只念一次' },
  { key: 'guard-atlas', file: 'verify-guard-atlas.mjs', kind: 'gate', desc: '护体与舆图（原著护体补齐 + 智能选靶 + 三界长卷）：道陨不抽 unique 护体 / 11 件载体与 parry.js 一一对应且 special 真生效 / 无护体自愈与按通关补发 / 打分选靶优先 Boss·精英与破罩降权 / 舆图 320 与 390 双视口可开可拖可点不溢出' },
  { key: 'eros-days', file: 'verify-eros-days.mjs', kind: 'gate', desc: '历练岁月与静修：际遇按钮演完即消失（排除 repeat 小事）· 满修为可静养不涨修为但照凝绿液 · 按行为记账（进图/扫荡/静修/洞府/坊市/开炉按原著天数）本世累计转世清零且与「入道年数」两账并存' },
  { key: 'boss-ensemble', file: 'verify-boss-ensemble.mjs', kind: 'gate', desc: '战斗内容增强（原著同场强敌）：七张原著群敌图按主 Boss 派生同场强敌（走精英 kit 引擎不占 G.boss 槽 / 带护罩 / 数量硬上限）· 薄图补怪种（shijin 1→4、xisha 2→4、两张逃亡图）· 逃亡图追兵按时现身且不设主 Boss 不破脱身 · 主 Boss 单击守门口径不变 · 同场连帧无报错' },
  { key: 'dialogue-canon', file: 'verify-dialogue-canon.mjs', kind: 'gate', desc: '全地图剧情对白守原著：人界事件因果 / 灵界法宝突破 / 仙界身份姓名共 28 类纠错，静态扫描禁绝夺舍万天明、星宫扣紫灵、八十年虚天殿、土皇钉界心钉、买下冰凤、九劫串台、渠灵太乙灰仙、厉飞羽真名错比' },
  { key: 'extraboss',  file: 'verify-extraboss.mjs',  kind: 'gate', desc: '续战 / 同场 Boss：18 张图 21 个 extraBoss 名字与字段、逐只刷出顺序、连杀后结算（模式图要等时钟走完）；名字逐条回原著核过（青龙上人 X10C1983 陨落、第一魔尊 X10C1989、柳自在 X4C1124、元魇两段称谓各按原文）' },
  { key: 'loot-band',  file: 'verify-loot-band.mjs', kind: 'gate', desc: '掉宝境界带：人界小怪/精英上限 startLevel+20、首领 -30~+20，灵界沿用 -60/+40、仙界 420；171 图带内池不空、实掉不越界；掌天瓶/虚天鼎/玄天斩灵剑/鲲鹏舍利等原著机缘不进随机池且仍挂原图 reward' },
  { key: 'breakomen', file: 'verify-breakomen.mjs', kind: 'gate', desc: '破境题款：成功时整屏收幕（地图 / 对白 / HUD / 横幅 / 飞鸽全退），题款写「进阶功成 + 境界名」，主角立绘居中在题款下方；2.6 秒后同帧收幕且对白照常回来；失败态灰墨压暗；390 / 320 双视口不出画' },
  { key: 'ren-roster', file: 'verify-ren-roster.mjs', kind: 'gate', desc: '人界角色 / 群众精灵库：43 位具名人物 + 15 类路人按原著考据登记（第一批七玄门 / 墨府 / 黄枫谷，第二批七玄门后期金光上人·张袖儿·三位师叔·李赵长老·马荣·蓝衣执法·云翅鸟，第三批血色试炼向之礼·封岳·钟吾与黄枫谷于坤·宋蒙·武炫；王侠·乌龙·马亮等无据者不画；王绝楚/贾天龙/厉飞雨/曲魂复用不重画）；禁地试炼者与黄枫谷同门身份分开标注；金皮与鬼谷墨皮都取得到、尺寸不变、非空白且墨化真降饱和；路人 / 后期 / 血色三批头肩剪影分开而非换色脸' },
];

const argv = process.argv.slice(2);
const onlyArg = (argv.find(a => a.startsWith('--only=')) || '').split('=')[1];
const only = onlyArg ? new Set(onlyArg.split(',').map(s => s.trim())) : null;
const skipHazards = argv.includes('--skip-hazards');

let items = ITEMS.filter(it => !only || only.has(it.key));
if (skipHazards) items = items.filter(it => it.key !== 'hazards');

const needsServer = items.some(it => it.key === 'hazards');
let server = null;
if (needsServer) {
  server = http.createServer((rq, rs) => {
    let p = decodeURIComponent(rq.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
    rs.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(rs);
  });
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
}

const runOne = (it) => new Promise((resolve) => {
  const t0 = Date.now();
  const cp = spawn(process.execPath, [join(HERE, it.file)], { cwd: ROOT, env: { ...process.env } });
  let out = '';
  cp.stdout.on('data', d => { out += d; });
  cp.stderr.on('data', d => { out += d; });
  cp.on('close', (code) => {
    const lines = out.trim().split('\n');
    // 各脚本汇总行格式不同：gate 取「通过/全绿/失败」那条；metric 取目标判定那条
    const want = it.kind === 'metric' ? /未达标|目标全部达标/ : /通过|全绿|失败|命中：/;
    const summary = [...lines].reverse().find(l => want.test(l))
      || [...lines].reverse().find(l => /通过|全绿|失败|命中：/.test(l))
      || lines[lines.length - 1] || '';
    resolve({ ...it, code, sec: ((Date.now() - t0) / 1000).toFixed(1), summary: summary.trim().slice(0, 96), out });
  });
});

console.log('== 一键回归 ==');
console.log('  脚本 ' + items.length + ' 个' + (needsServer ? '（已起 127.0.0.1:' + PORT + ' 静态服务）' : ''));
console.log('');

const results = [];
for (const it of items) {
  process.stdout.write('  ' + it.key.padEnd(12) + ' 跑… ');
  const r = await runOne(it);
  results.push(r);
  const badge = r.kind === 'metric' ? (r.code === 0 ? '·' : '✗') : (r.code === 0 ? '✓' : '✗');
  console.log(badge + ' ' + r.sec + 's  ' + r.summary);
  if (r.code !== 0 && r.kind === 'gate') {
    // 失败时把该脚本的失败行摘出来，省得再翻日志；完整输出落到 _out/fail-<key>.log
    const bad = r.out.split('\n').filter(l => /❌|✗|失败：/.test(l)).slice(0, 6);
    if (bad.length) console.log('    ' + bad.map(s => s.trim()).join('\n    '));
    try {
      fs.mkdirSync(join(HERE, '_out'), { recursive: true });
      fs.writeFileSync(join(HERE, '_out', 'fail-' + r.key + '.log'), r.out, 'utf8');
      console.log('    （完整输出：qa/_out/fail-' + r.key + '.log）');
    } catch (e) {}
  }
}

if (server) await new Promise(r => server.close(r));

const gates = results.filter(r => r.kind === 'gate');
const red = gates.filter(r => r.code !== 0);
console.log('\n' + '='.repeat(52));
console.log('  闸门 ' + gates.length + ' 个：绿 ' + (gates.length - red.length) + ' / 红 ' + red.length +
            '　度量 ' + results.filter(r => r.kind === 'metric').length + ' 个');
if (red.length) {
  console.log('  红：' + red.map(r => r.summary).join(' ｜ '));
  process.exit(1);
}
console.log('  全绿');
process.exit(0);
