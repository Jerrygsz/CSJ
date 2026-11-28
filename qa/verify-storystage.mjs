// 主画布剧情层守门（StoryStage 第一版）：
//   ①qixuan / houshan 两段落点按原著，台词只写 li，逐句同源 MAP_STORIES；
//   ②建筑 / 石墙 / 遗迹真挡路，石阶 / 药畦 / 山涧 / 天气真改移速；
//   ③dialog 态冻结世界但主画布照常渲染，韩立被剧情挪位、镜头随分镜走；
//   ④skip 与换图清场不残影，既有 Cutscene / 自动化对白通道不被顶掉。
// 用法：node qa/verify-storystage.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import vm from 'node:vm';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9012;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end('404'); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra === undefined ? '' : '  →  ' + JSON.stringify(extra))); }
}

const html = fs.readFileSync(join(root, 'index.html'), 'utf8');
const game = fs.readFileSync(join(root, 'js', 'game.js'), 'utf8');
const stageSrc = fs.readFileSync(join(root, 'js', 'storyStage.js'), 'utf8');

console.log('\n== 1. 结构真源 ==');
const scriptAt = html.indexOf('js/storyStage.js');
const gameAt = html.indexOf('js/game.js');
ok(scriptAt > 0 && scriptAt < gameAt && gameAt > 0, 'storyStage.js 在 game.js 之前加载', { scriptAt, gameAt });
ok(!stageSrc.includes('\r'), 'storyStage.js 保持 LF（Windows 回写不污染发布）', null);
ok(/window\.StoryStage\s*=\s*API/.test(stageSrc), '模块挂 window.StoryStage，不引入外部依赖', null);
ok(/window\.StoryStage\.start\(id, sc\.lines/.test(game) && /window\.StoryStage\.start\(id, hsLines/.test(game),
   'qixuan / houshan 首进都接进主画布剧情层', null);
ok(/var wdx = .*s\.to\[0\].*w\.x/.test(stageSrc) && /w\.dir = wdx < 0/.test(stageSrc),
   'walk 起步先朝向目标，穿门拍不再背对山门', null);
ok(!/p\.atkAnim = Math\.max/.test(stageSrc),
   '剧情动作不再借主画布错位的 atkAnim 剑弧', null);
ok(/storyStage\(\)\s*\{\s*return window\.StoryStage/.test(game) && /storyStageTick/.test(game),
   '探针只转发，状态真源仍在 StoryStage', null);
ok(/id === 'qixuan' && window\.Cutscene && window\.Cutscene\.force/.test(game)
   && /else if \(hsLines\.length && !\(window\.__CSJ_QA__ \|\| \(typeof navigator !== 'undefined' && navigator\.webdriver\)\)\)/.test(game),
   '旧 Cutscene / 自动化 showLines 分流原样保留', null);
ok(/function replayStoryLive/.test(game)
   && /replayStoryLive\(csId\)/.test(game) && /replayStoryLive\(id\)/.test(game),
   '洞府「重温此段 / 剧情回顾」都经 replayStoryLive 分流', null);
ok(/sb\.id = 'storyStageSkipBtn'/.test(stageSrc) && /sb\.addEventListener\('click'/.test(stageSrc)
   && /function placeSkip/.test(stageSrc),
   '剧情层自带可点的「跳过」，并按舞台缩放定位', null);
ok(/story-stage-on #topbar/.test(stageSrc) && /classList\.add\('story-stage-on'\)/.test(stageSrc)
   && /classList\.remove\('story-stage-on'\)/.test(stageSrc),
   '剧情层独占画面：战斗 HUD 暂隐，收层后恢复', null);

// ---- 数据真源：在 Node 里只跑数据层，不碰 DOM ----
const sandbox = { window: { addEventListener() {} }, console: { warn() {} } };
vm.runInNewContext(fs.readFileSync(join(root, 'js', 'maps.js'), 'utf8'), sandbox);
vm.runInNewContext(stageSrc, sandbox);
const stories = sandbox.window.MAP_STORIES;
const stages = sandbox.window.StoryStage.stages();
const DATA = {};
console.log('\n== 2. 原著剧情与地形数据 ==');
for (const id of ['qixuan', 'houshan', 'chuisui', 'mishi', 'wagang', 'tainan', 'jiayuan', 'mofu', 'xiaoxiang', 'yelang', 'xuesestory']) {
  const st = stages[id];
  DATA[id] = st;
  const li = st.steps.filter(s => s.t === 'say').reduce((a, s) => a.concat(s.li || []), []);
  const n = (stories[id] || []).length;
  ok(!!st && !!st.canon && /原著|第一卷|第二卷/.test(st.canon), id + ' 标注原著卷章锚', st && st.canon);
  ok(n > 0 && li.length === n && li.every((x, i) => x === i),
     id + ' 的 ' + n + ' 句按 0..' + (n - 1) + ' 顺序引用，无自写台词', { li, n });
  ok(st.steps.filter(s => s.t === 'say').every(s => s.li && s.text == null),
     id + ' say 步只有 li，没有另写正文', null);
  ok(st.zones.some(z => z.block) && st.zones.some(z => z.speed),
     id + ' 同时有阻挡区与速度区', st.zones.map(z => ({ kind: z.kind, block: !!z.block, speed: z.speed || null })));
  ok(st.steps.some(s => s.t === 'walk') && st.steps.some(s => s.t === 'act') && st.steps.some(s => s.t === 'cam'),
     id + ' 含走位 / 动作 / 镜头三类演出', null);
  const kinds = st.zones.map(z => z.kind);
  if (id === 'qixuan') {
    ok(kinds.includes('bamboo') && kinds.includes('cliff') && kinds.includes('rope'),
       'qixuan 有竹林 / 炼骨崖岩壁 / 打结麻绳', kinds);
    ok(st.steps.some(s => s.t === 'act' && s.anim === 'climb') && st.steps.some(s => s.t === 'act' && s.anim === 'taunt'),
       '舞岩轻慢与韩立攀崖都有贴身动作', null);
  } else if (id === 'houshan') {
    ok(kinds.includes('stoneDoor') && kinds.includes('waterfall'),
       'houshan 有石室青石门与赤水峰瀑布', kinds);
    ok(st.steps.some(s => s.t === 'act' && s.anim === 'pulse') && st.steps.some(s => s.t === 'act' && s.anim === 'bottle'),
       '半年把脉与踢到小绿瓶都有动作', null);
    const zt = st.steps.findIndex(s => s.t === 'walk' && s.who === 'zhangtie');
    const lift = st.steps.findIndex(s => s.t === 'act' && s.anim === 'lift');
    ok(zt > 0 && lift > zt, '张铁先走到瀑布下再演顶水冲练', { zt, lift });
  } else if (id === 'yelang') {
    const spr = st.actors.map(a => a.spr);
    ok(['jinguangshangren','jiatianlong','lanyizhifa','wangqinxin','huishishu','rushishu','luosaihu',
        'lizhanglao','marong','zhangxiuer','hanxiaomei'].every(x => spr.includes(x)),
       '七玄门后期 11 张精灵作为群众演员接入野狼帮之围（金光上人 / 三师叔 / 李长老 / 传令亲信 / 返乡小妹）', spr);
    ok(!spr.includes('zhaozhanglao') && !spr.includes('yunchi'),
       '赵长老（ch69–72）与云翅鸟（韩立肩头）未混入野狼帮之围', spr);
    ok(spr.includes('lifeiyu') && spr.includes('quhun'),
       '厉飞雨（ch77 唯一逃回的报信人）与曲魂（ch64 张铁躯壳）接入野狼帮之围', spr);
    ok(kinds.includes('stele'), '断碑用 stele 立在地上（pillar 的椭圆当碑会像一面镜子）', kinds);
    {
      const txt = (stories.yelang || []).map(l => l[1]).join('');
      ok(/加强型军用连弩/.test(txt), '厉飞雨报丧点出「加强型军用连弩」（ch77 原文）', txt.slice(0, 40));
      const fy = st.steps.findIndex(s => s.t === 'say' && s.li && s.li[0] === 2);
      const yy = st.steps.findIndex(s => s.t === 'say' && s.li && s.li[0] === 4);
      ok(fy > 0 && yy > fy, '先由厉飞雨报丧、再让贾天龙亮阵（时间线不倒错）', { fy, yy });
      const qh = st.steps.findIndex(s => s.t === 'actor' && s.who === 'quhun' && s.show);
      const at = st.steps.findIndex(s => s.t === 'act' && s.anim === 'throw');
      ok(qh > 0 && qh < at, '曲魂在韩立出手之前跟到阵前', { qh, at });
    }
    const wq = st.actors.find(a => a.id === 'wangqinxin');
    const wqStep = st.steps.find(s => s.t === 'actor' && s.who === 'wangqinxin');
    ok(wq && wq.x > 0 && wq.dir === -1 && wqStep && /七玄门/.test(wqStep.label),
       '王门主亲信归七玄门一侧，不站进野狼帮列阵', { wq, wqStep });
    ok(st.actors.filter(a => a.id !== 'hanli').every(a => a.show === false),
       '群众演员默认隐匿，按分镜依次现身，不抢开场', null);
  } else if (id === 'xuesestory') {
    const spr = st.actors.map(a => a.spr);
    ok(['xiangzhili','fengyue','zhongwu','yukun','songmeng','wuxuan'].every(x => spr.includes(x)),
       '血色试炼 6 人全部上场（禁地三人 + 黄枫谷三师兄）', spr);
    const show = st.steps.filter(s => s.t === 'actor' && s.show).map(s => s.who);
    ok(['xiangzhili','fengyue','zhongwu'].every(x => show.indexOf(x) < show.indexOf('yukun')),
       '禁地试炼者先出场，绿波洞同门收场才露面（时间线不倒错）', show);
  } else if (id === 'chuisui') {
    const spr = st.actors.map(a => a.spr);
    ok(spr.includes('hanli') && spr.includes('lifeiyu'),
       '松林小溪两人到位：韩立与厉飞雨', spr);
    ok(kinds.includes('stream') && kinds.includes('pine'),
       '溪谷用 stream + pine（松林与竹林不是一回事，别拿 bamboo 顶）', kinds);
    const txt = (stories.chuisui || []).map(l => l[1]).join('');
    ok(/抽髓丸/.test(txt) && /二十三种/.test(txt) && /十年/.test(txt),
       '台词守住抽髓丸三处硬点：药名 / 二十三种罕见物 / 十年必死', txt.slice(0, 40));
    ok(/发个毒誓/.test(txt) && /厉飞雨欠你/.test(txt),
       '「你发个毒誓」与自报姓名「我厉飞雨」两句原话都在', null);
    const wr = st.steps.findIndex(s => s.t === 'act' && s.anim === 'writhe');
    const th = st.steps.findIndex(s => s.t === 'act' && s.anim === 'threaten');
    ok(wr > 0 && th > wr, '先毒发抽搐，后刀架颈（时间线不倒错）', { wr, th });
    const vi = st.steps.findIndex(s => s.t === 'prop' && s.n === 'vial');
    const pi = st.steps.findIndex(s => s.t === 'prop' && s.n === 'pill');
    ok(vi > 0 && pi > vi, '先摸出小白玉瓶，再夹起粉红药丸', { vi, pi });
    const pink = st.steps.find(s => s.t === 'prop' && s.n === 'pill');
    ok(pink && pink.tint === 'pink', '抽髓丸是粉红丸子（原著「粉红色、奇异腥臭」，不是白丸）', pink);
    const lie = st.actors.find(a => a.id === 'lifeiyu');
    const up = st.steps.findIndex(s => s.t === 'actor' && s.who === 'lifeiyu' && s.rot === 0);
    ok(lie && typeof lie.rot === 'number' && lie.rot !== 0 && up > 0,
       '厉飞雨先横躺（rot）后站起来（rot 归零），不是站着发抖', { rot: lie && lie.rot, up });
  } else if (id === 'mishi') {
    const spr = st.actors.map(a => a.spr);
    ok(['hanli','mo','quhun','yuzitong'].every(x => spr.includes(x)),
       '墨府密谋四人到位：韩立 / 墨居仁 / 铁奴（张铁躯壳）/ 余子童元神', spr);
    ok(kinds.includes('lamp') && kinds.includes('stoneDoor'),
       'mishi 有满屋灯烛与封闭石门（原著「四壁无窗、灯烛辉煌」）', kinds);
    const txt = (stories.mishi || []).map(l => l[1]).join('');
    ok(/三十七/.test(txt) && /尸虫丸/.test(txt) && /第六层/.test(txt),
       '台词守住三处原著硬点：三十七岁 / 尸虫丸 / 第六层', txt.slice(0, 60));
    ok(!/三十年/.test(txt) && !/七盏灯/.test(txt),
       '不写「困在凡躯三十年」与「七盏油灯」这两处旧偏差', null);
    const gi = st.steps.findIndex(s => s.t === 'act' && s.anim === 'give');
    const box = st.steps.findIndex(s => s.t === 'prop' && s.n === 'box');
    const qh = st.steps.findIndex(s => s.t === 'actor' && s.who === 'quhun' && s.show);
    ok(box > 0 && gi > box, '先取檀木盒，再递到韩立面前', { box, gi });
    ok(qh > gi, '铁奴在摊牌之后才踏进石门（不提前到摊牌拍）', { qh, gi });
    const ghost = st.actors.find(a => a.id === 'yuzitong');
    ok(ghost && ghost.ghost === true, '余子童以元神的半透明幽影出现，不做成活人', ghost);
  } else if (id === 'wagang') {
    const spr = st.actors.map(a => a.spr);
    ok(spr.includes('hanli') && spr.includes('wanshanxiao'),
       '怪坡两人到位：韩立与白衣少年万小山', spr);
    ok(kinds.includes('mist') && kinds.includes('pine'),
       '谷外用 mist 白雾 + pine 松林（怪坡「常年被浓浓白雾笼罩」是这场的招牌）', kinds);
    const txt = (stories.wagang || []).map(l => l[1]).join('');
    ok(/枯崖山/.test(txt) && /万小山/.test(txt) && /通音符/.test(txt),
       '台词守住三处原著硬点：枯崖山万家 / 万小山 / 通音符', txt.slice(0, 40));
    // 考据红线：第126~128章韩立并不知道身上那块令牌叫「升仙令」，万小山也没看过它。
    // 升仙令是第141章《青溪笔录》才揭出的事，一句都不许前移到这里。
    ok(!/升仙令/.test(txt) && !/认令不认人/.test(txt),
       '怪坡段不得出现「升仙令 / 七派认令不认人」（那是 ch141 才揭出的事，时间线红线）', null);
    const md = st.steps.findIndex(s => s.t === 'act' && s.anim === 'meditate');
    const wj = st.steps.findIndex(s => s.t === 'prop' && s.n === 'warmjade');
    ok(wj > 0 && md > wj, '先取出暖阳宝玉，再盘坐拔寒毒', { wj, md });
    const arrive = st.steps.findIndex(s => s.t === 'actor' && s.who === 'wanshanxiao' && s.show);
    const lead = st.steps.findIndex(s => s.t === 'act' && s.who === 'hanli' && s.anim === 'point');
    ok(arrive > md && lead > arrive, '万小山先跑来拜门，韩立才抬手带路（原著是韩立领路）', { arrive, lead });
    const toss = st.steps.findIndex(s => s.t === 'act' && s.anim === 'throw');
    ok(toss > lead, '带路之后才抛通音符开雾', { toss, lead });
  } else if (id === 'tainan') {
    const spr = st.actors.map(a => a.spr);
    ok(['hanli','wanshanxiao','qingyan'].every(x => spr.includes(x)),
       '广场三人到位：韩立 / 万小山 / 青颜真人', spr);
    ok(kinds.includes('paved') && kinds.includes('stall') && kinds.includes('stonelamp'),
       '谷内用 paved 青砖广场 + stall 货摊 + stonelamp 灵石灯', kinds);
    ok(st.tone === 'dusk', '太南小会是入夜戏，用 dusk 场调（天光退了靠灵石灯照）', st.tone);
    const txt = (stories.tainan || []).map(l => l[1]).join('');
    ok(/青颜真人/.test(txt) && /第八层/.test(txt) && /木属性/.test(txt),
       '台词守住三处原著硬点：青颜真人 / 木属性 / 已到第八层', txt.slice(0, 40));
    ok(!/升仙令/.test(txt) && !/认令不认人/.test(txt),
       '谷内段同样不得出现「升仙令 / 认令不认人」', null);
    ok(/白石/.test(txt) && /不放油/.test(txt),
       '灯盏里不放灯油、托一块拳头大的白石（ch129 原文）', null);
    const gz = st.steps.findIndex(s => s.t === 'act' && s.anim === 'gaze');
    const lv = st.steps.findIndex(s => s.t === 'say' && s.li && s.li[0] === 8);
    ok(gz > 0 && lv > gz, '青颜真人先审视，再说破第八层', { gz, lv });
    const gone = st.steps.findIndex(s => s.t === 'walk' && s.who === 'wanshanxiao' && s.to && s.to[0] > 150);
    ok(gone > lv, '说破修为之后万小山才被带回族中长辈处', { gone, lv });
  } else if (id === 'jiayuan') {
    const spr = st.actors.map(a => a.spr);
    ok(['hanli','quhun','sunergou','heixiong'].every(x => spr.includes(x)),
       '码头上四人到位：韩立 / 曲魂 / 孙二狗 / 黑熊', spr);
    ok(kinds.includes('river') && kinds.includes('dock') && kinds.includes('shed') && kinds.includes('crate'),
       '小码头用 river 河面 + dock 木栈 + shed 竹棚 + crate 烂筐破袋（ch100 原样）', kinds);
    ok(kinds.includes('wall'), '黑水巷两岸是 wall 高墙，人贴着墙根走', kinds);
    const txt = (stories.jiayuan || []).map(l => l[1]).join('');
    ok(/四平帮/.test(txt) && /铁拳会/.test(txt) && /孙二狗/.test(txt) && /黑熊/.test(txt),
       '台词守住码头那一场的原著硬点：四平帮 / 铁拳会 / 孙二狗 / 黑熊', txt.slice(0, 40));
    ok(/腐心丸/.test(txt) && /解药/.test(txt),
       '收服的手段是那颗「腐心丸」与一月一次的解药（ch103）', null);
    ok(/杀了他们，不用留手/.test(txt), '曲魂出手是韩立亲口下的令（ch102 原话）', null);
    // 时间线红线：暖阳宝玉这会儿还在墨府，码头这一场谁都还没见着它 ——
    // 只允许「遗书说它在墨府」那一句提到名字，不许有第二处，更不许墨彩环/欧阳飞天提前登场。
    const jyLines = (stories.jiayuan || []).map(l => l[1]);
    ok(!jyLines.some(t => /墨彩环/.test(t)) && !jyLines.some(t => /欧阳飞天/.test(t))
       && jyLines.filter(t => /暖阳宝玉/.test(t)).length === 1,
       '码头段不得提前出现墨彩环 / 欧阳飞天；暖阳宝玉只在「遗书说它在墨府」那一句被提到', null);
    const palm = st.steps.findIndex(s => s.t === 'act' && s.who === 'quhun' && s.anim === 'palm');
    const thrust = st.steps.findIndex(s => s.t === 'act' && s.who === 'hanli' && s.anim === 'thrust');
    ok(palm > 0 && thrust > palm, '曲魂先屠场，韩立才一剑穿黑熊的喉咙', { palm, thrust });
    const pill = st.steps.findIndex(s => s.t === 'prop' && s.n === 'pill');
    const sw2 = st.steps.findIndex(s => s.t === 'act' && s.who === 'sunergou' && s.anim === 'swallow');
    ok(pill > thrust && sw2 > pill, '先杀黑熊、再递药丸，孙二狗最后才吞下去', { pill, sw2 });
    ok(st.steps.some(s => s.t === 'fade' && s.from === 0 && s.to === 1)
       && st.steps.some(s => s.t === 'actor' && s.who === 'hanli' && s.x === 736),
       '码头与黑水巷之间用 fade + 挪位换场（两条街不在同一个地方）', null);
    // 镜头红线：黑水巷在世界坐标的另一头（x≈700~1100），cam.dx 不离位的话，
    // 这一整场围杀都演在画外 —— 标签、动作、台词的闸门全绿，实拍出来只有一片空码头。
    const jyCams = st.steps.filter(s => s.t === 'cam');
    ok(jyCams.some(s => (s.dx || 0) >= 800),
       '有一拍 cam 把机位从码头搬到黑水巷（dx ≥ 800）', jyCams.map(s => s.dx));
  } else if (id === 'mofu') {
    const spr = st.actors.map(a => a.spr);
    ok(['hanli','yanfuren','mocaihuan','lieru','liuru','wangru'].every(x => spr.includes(x)),
       '墨府五人到位：韩立 / 严氏 / 墨彩环 / 二夫人李氏 / 三夫人刘氏 / 五夫人王氏', spr);
    ok(kinds.includes('floor') && kinds.includes('table') && kinds.includes('screen')
       && kinds.includes('candle') && kinds.includes('lamp'),
       '小楼内室用 floor 石砖 + table 案几 + screen 折屏 + candle 白蜡烛 + lamp 灯烛', kinds);
    ok(kinds.includes('herb') && kinds.includes('bamboo'),
       '后院那一片药草与竹林都在（ch108 先闻出药草香）', kinds);
    const txt = (stories.mofu || []).map(l => l[1]).join('');
    ok(/纹龙戒/.test(txt) && /弟子韩立/.test(txt),
       '认亲靠那枚纹龙戒与「弟子韩立，奉墨师之命」（ch109 原话）', txt.slice(0, 40));
    ok(/千人醉/.test(txt) && /清灵散/.test(txt),
       '蜡烛里是迷药千人醉，韩立事先吃过清灵散（ch116~117）', null);
    ok(/修仙者/.test(txt) && /欧阳飞天/.test(txt) && /吴剑鸣/.test(txt),
       '修仙者身份被叫破、要杀的是欧阳飞天、吴剑鸣是他派来的七弟子', null);
    // 考据红线：墨府早就识破吴剑鸣是冒牌货（ch108 严氏亲口），不能写成「墨府被骗了」
    ok(/冒牌货/.test(txt) && /破绽/.test(txt),
       '严氏与墨彩环那场夜谈要点明「冒牌货」与「别让他看出破绽」（墨府在做戏，不是被骗）', null);
    // 交玉的是严氏：ch126 回述「严氏确认完首级后，当场就把宝玉拿出来」
    ok(!/嫁妆/.test(txt)
       && !(stories.mofu || []).some(l => /墨彩环/.test(l[0]) && /宝玉/.test(l[1])),
       '墨彩环不得当场把宝玉当嫁妆塞给韩立（交玉的是严氏，ch126 回述）', null);
    const rg = st.steps.findIndex(s => s.t === 'prop' && s.n === 'ring');
    const thr = st.steps.findIndex(s => s.t === 'act' && s.anim === 'throw');
    ok(rg > 0 && thr > rg, '先摸出纹龙戒，再隔着窗纸扔进屋', { rg, thr });
    const fl = st.steps.findIndex(s => s.t === 'act' && s.anim === 'flame');
    const cry = st.steps.findIndex(s => s.t === 'say' && s.li && s.li[0] === 19);
    ok(fl > 0 && cry > fl, '指尖先腾起火球，李氏才叫出「修仙者！」', { fl, cry });
    const mao = st.steps.findIndex(s => s.t === 'say' && s.li && s.li[0] === 25);
    const wu = st.steps.findIndex(s => s.t === 'say' && s.li && s.li[0] === 26);
    ok(mao > 0 && wu > mao, '先点出欧阳飞天，再补一句吴剑鸣是他派来的', { mao, wu });
    ok(st.steps.some(s => s.t === 'act' && s.anim === 'sneak'),
       '夜入后院那一段用 sneak 贴着墙根走（不是大摇大摆走进去）', null);
    // 同上：小楼内室在世界坐标 x≈700~1260，机位不搬过去，整场「火弹术翻脸」都在画外
    const mfCams = st.steps.filter(s => s.t === 'cam');
    ok(mfCams.some(s => (s.dx || 0) >= 800),
       '有一拍 cam 把机位从后院搬到小楼内室（dx ≥ 800）', mfCams.map(s => s.dx));
  } else if (id === 'xiaoxiang') {
    const spr = st.actors.map(a => a.spr);
    ok(['hanli','shenzhongshan','xiaojinzhi','qianjin','fanju','shensan'].every(x => spr.includes(x)),
       '潇湘院六人到场：韩立 / 沈重山 / 小金芝 / 钱进 / 范沮 / 沈三', spr);
    ok(['pei1','pei2','pei3'].every(x => st.actors.some(a => a.id === x)),
       '三大护法身边各有一名陪酒女子（ch121 原话「怀内都有一位面貌姣好的女子坐陪着」）', null);
    ok(kinds.includes('floor') && kinds.includes('table') && kinds.includes('chair')
       && kinds.includes('screen') && kinds.includes('candle') && kinds.includes('lamp'),
       '包房用 floor 石砖 + table 矮桌 + chair 交椅 + screen 折屏 + candle 红烛 + lamp 灯烛', kinds);
    ok(kinds.includes('paved') && kinds.includes('post'),
       '檐下是青砖 + 檐柱（人要站在屋外等那一盏茶的工夫）', kinds);
    const txt = (stories.xiaoxiang || []).map(l => l[1]).join('');
    ok(/全杀了就是/.test(txt) && /引魂钟/.test(txt) && /曲魂/.test(txt),
       '定计那一截必须有「全杀了就是」、曲魂与引魂钟（ch120 原话）', null);
    ok(/李二/.test(txt), '冒名顶替的由头是替「李二」跑腿（ch122 原话，不是「小六子」之类自造）', null);
    ok(/笑魂散/.test(txt) && /清灵散/.test(txt),
       '毒是笑魂散、韩立事先吃过清灵散（ch122）', null);
    ok(/王嬷嬷/.test(txt), '小金芝抬出王嬷嬷挡驾（ch121 原话）', null);
    ok(/数百口人/.test(txt), '小金芝那句「潇湘院上上下下数百口人」，不是「几十人」', null);
    // 考据红线：本段只该是四平帮与天霸门的事，不能把欧阳飞天 / 墨府的人和这一场搅在一起
    ok(!/欧阳飞天/.test(txt) && !/墨彩环/.test(txt) && !/严氏/.test(txt),
       '潇湘院这一场不得混入欧阳飞天 / 墨彩环 / 严氏（那是墨府那一段的人物）', null);
    // 五人说话：少一个，包房里那场「试吃」的推诿就立不住
    const who = new Set((stories.xiaoxiang || []).map(l => l[0]));
    ok(['钱进','范沮','小金芝','沈重山','沈三','韩立','孙二狗'].every(x => who.has(x)),
       '七个说话人到齐（孙二狗只在客栈与收场露面）', [...who]);
    // 时序红线：先试吃、再毒发；先钱进、再沈重山；范沮与沈三最后冲到门口才倒
    const idxOf = (pred) => st.steps.findIndex(pred);
    const drink = idxOf(s => s.t === 'act' && s.anim === 'drink');
    const writhe = idxOf(s => s.t === 'act' && s.anim === 'writhe');
    const qFall = idxOf(s => s.t === 'actor' && s.who === 'qianjin' && s.rot != null);
    const sFall = idxOf(s => s.t === 'actor' && s.who === 'shenzhongshan' && s.rot != null);
    const fFall = idxOf(s => s.t === 'actor' && s.who === 'fanju' && s.rot != null);
    ok(drink > 0 && writhe > drink, '先当着满屋人的面喝下那杯酒，毒发才在门后发生', { drink, writhe });
    ok(qFall > writhe && sFall > qFall, '钱进喝得最多先倒，沈重山第二个倒（ch122 原话顺序）', { qFall, sFall });
    ok(fFall > sFall, '范沮与沈三要到门口才滑倒 —— 不能跟钱进一起倒', { fFall, sFall });
    // 镜头红线：包房 / 檐下 / 正堂分别在世界坐标 x≈1500 / 2300 / 3190，
    // 三处都得有 cam 把机位搬过去，否则整段演在画外（jiayuan / mofu 都栽过这一跤）
    const xxCams = st.steps.filter(s => s.t === 'cam').map(s => s.dx || 0);
    ok(xxCams.filter(v => v >= 800).length >= 3,
       '机位分别搬到包房 / 檐下 / 正堂（≥800 的 cam 至少三拍）', xxCams);
    ok(xxCams.indexOf(0) < 0, '第一场客栈就在开演机位上，不需要 dx:0 的归位拍（原地不动才对）', xxCams);
    // 檐下与包房之间是来回剪的：出屋、剪回屋里看毒发、再剪回檐下、再进屋察看
    let cut = 0, last = null;
    for (const s of st.steps) {
      if (s.t !== 'cam') continue;
      const v = s.dx || 0;
      if (last != null && Math.abs(v - last) > 400) cut++;
      last = v;
    }
    ok(cut >= 3, '包房与檐下之间至少三次大跨度切镜（出屋 / 看毒发 / 回檐下 / 再进屋）', cut);
    ok(st.steps.some(s => s.t === 'prop' && s.n === 'tray')
       && st.steps.some(s => s.t === 'prop' && s.n === 'flagon')
       && st.steps.some(s => s.t === 'prop' && s.n === 'silver'),
       '托盘 / 酒壶 / 二两银子三件道具都要真上场（不是只登记在 PROPS 里）', null);
  }
}

// ---- 动作库 / 道具库 ----
// 守的是「演出素材」本身：动作够不够用、道具有没有登记、挂点是不是脚底基准。
// 曾经动作偏移按 34px 人高写死，实际精灵只有 20~24px，所有线都飘到头顶上方。
const actBlock = stageSrc.slice(stageSrc.indexOf('var ACTS = {'), stageSrc.indexOf('function drawAct('));
const actNames = [...actBlock.matchAll(/^ {4}([a-zA-Z]+): function \(x, y, dir, k\)/gm)].map(m => m[1]);
const propBlock = stageSrc.slice(stageSrc.indexOf('var PROPS = {'), stageSrc.indexOf('function drawProp(n, x, y'));
const propNames = [...propBlock.matchAll(/^ {4}([a-zA-Z0-9]+): function/gm)].map(m => m[1]);

ok(actNames.length >= 24, '剧情动作库至少 24 式（礼 / 战 / 活三组）', actNames);
ok(['bow','fist','kneel','point','refuse','beckon','taunt'].every(x => actNames.includes(x)),
   '礼组齐全：作揖 / 抱拳 / 跪 / 指 / 摆手 / 招手 / 轻慢', actNames);
ok(['guard','slash','thrust','palm','seal','throw','block','fall'].every(x => actNames.includes(x)),
   '战组齐全：横剑 / 劈 / 刺 / 掌 / 掐诀 / 抛掷 / 格挡 / 跌倒', actNames);
ok(['herb','dig','carry','wipe','drink','read','pour','refine','pickup','climb','lift','pulse'].every(x => actNames.includes(x)),
   '活组齐全：采药 / 掘土 / 挑担 / 抹汗 / 饮 / 展卷 / 斟倒 / 控火 / 拾取 / 攀崖 / 顶水 / 按脉', actNames);
ok(['give','swallow','clench'].every(x => actNames.includes(x)),
   '密谋组齐全：递物 / 吞服 / 握拳（尸虫丸那段全靠这三式）', actNames);
ok(['writhe','threaten'].every(x => actNames.includes(x)),
   '溪边组齐全：毒发抽动 / 刀架颈（厉飞雨那段全靠这两式）', actNames);
ok(['meditate','gaze'].every(x => actNames.includes(x)),
   '入道组齐全：盘坐打坐 / 审视看破（太南山那两段全靠这两式）', actNames);
ok(['sneak','flame'].every(x => actNames.includes(x)),
   '嘉元城组齐全：贴墙潜行 / 指尖火弹（夜入墨府与露修仙者身份全靠这两式）', actNames);
ok(propNames.includes('ring'),
   '纹龙戒已登记（墨府认亲全靠那枚龙戒）', propNames);
ok(propNames.includes('warmjade'),
   '暖阳宝玉已登记（拔寒毒与解尸虫丸之毒全靠它）', propNames);
ok(propNames.length >= 14, '剧情道具库至少 14 件', propNames);
ok(['bottle','order','jade','map','talisman','sword','blade','token7','chest','hoe','basket','stone','pouch','cauldron','gold'].every(x => propNames.includes(x)),
   '原著关键道具齐备：小绿瓶 / 升仙令 / 玉简 / 舆图 / 符纸 / 剑 / 刀 / 铁牌 / 药箱 / 药锄 / 药篓 / 灵石 / 储物袋 / 丹炉 / 金砖', propNames);
ok(['box','pill','lamp'].every(x => propNames.includes(x)),
   '密室道具齐备：檀木盒 / 白丸 / 油灯', propNames);
ok(propNames.includes('vial'), '溪边道具齐备：小白玉瓶（装抽髓丸那只）', propNames);

// 剧情里用到的道具必须都在库里，不能写个空气名字
const usedProps = [];
for (const id of ['qixuan', 'houshan', 'chuisui', 'mishi', 'wagang', 'tainan', 'jiayuan', 'mofu', 'xiaoxiang', 'yelang', 'xuesestory']) {
  for (const s of (sandbox.window.StoryStage.steps(id) || [])) {
    if (s.t === 'prop' && s.n) usedProps.push(s.n);
  }
  for (const a of ((sandbox.window.StoryStage.stages()[id] || {}).actors || [])) {
    if (a.prop && a.prop.n) usedProps.push(a.prop.n);
  }
}
ok(usedProps.length > 0 && usedProps.every(n => propNames.includes(n)),
   '五段剧情用到的道具全部在库里登记', usedProps);

ok(/ctx\.translate\(x, y\);\s*\n\s*ctx\.scale\(dir \* K, K\)/.test(stageSrc),
   '动作线以脚底为锚并整体缩放到实际精灵高度（不再飘在头顶）', null);
ok(/var footY = y \+ ch \/ 2 \+ oy/.test(stageSrc),
   '手持道具挂在脚底基准的手位上', null);
ok(!/rgba\(208,214,220/.test(stageSrc),
   '刀剑线已改深色，不再用浅灰在米色地面上消失', null);

const twoStories = JSON.stringify({ q: stories.qixuan, h: stories.houshan });
ok(!/摸骨|举石锁|同村|按月查问|山贼脚印|药篓/.test(twoStories),
   '两段台词已去掉非原著概括', twoStories.slice(0, 120));
ok(/炼骨崖/.test(stories.qixuan[2][1]) && /麻绳/.test(stories.qixuan[3][1])
   && /赤水峰/.test(stories.houshan[4][1]) && /小绿瓶/.test(stories.houshan[7][1]),
   '炼骨崖 / 结绳 / 赤水峰 / 小绿瓶四个原著锚点进入台词', null);
ok(sandbox.window.StoryStage.blockedAt('qixuan', 45, -100) === true
   && sandbox.window.StoryStage.blockedAt('qixuan', 45, 0) === false,
   '山门石墙挡路，门洞留得出通道', null);
ok(sandbox.window.StoryStage.blockedAt('houshan', 96, -120) === true
   && sandbox.window.StoryStage.blockedAt('houshan', 245, 20) === false,
   '山径石壁挡路，山涧可走', null);

// ---- 实机 ----
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html?t=${Date.now()}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR && !!window.StoryStage);

await page.evaluate(() => {
  window.__ssRun = async function (stopKind, max) {
    const F = window.__FR;
    for (let i = 0; i < (max || 120); i++) {
      const s = F.storyStage();
      if (!s || !s.active) return F.storyStage();
      if (s.kind === stopKind) return s;
      if (s.kind === 'say') { F.advanceDialog(); await new Promise(r => setTimeout(r, 0)); }
      else { F.storyStageTick(0.05); await new Promise(r => setTimeout(r, 0)); }
    }
    return F.storyStage();
  };
});

console.log('\n== 3. qixuan 主画布演出 ==');
await page.evaluate(() => {
  const F = window.__FR;
  F.clearProgress();
  F.storyStageForce(true);
  F.enterMap('qixuan');   // 真进图才有主角落点；force 让自动化也走新层
});
await page.waitForTimeout(120);
const Q0 = await page.evaluate(() => ({
  s: window.__FR.storyStage(),
  dialog: document.getElementById('dialogSpeaker').textContent + '|' + document.getElementById('dialogText').textContent,
  want: window.MAP_STORIES.qixuan[0].join('|'),
  canvas: (() => { const c = document.getElementById('storyStage'); return !!c && getComputedStyle(c).display !== 'none'; })(),
  backdrop: !!document.getElementById('storyStageBackdrop')
}));
ok(Q0.s && Q0.s.active && Q0.s.mapId === 'qixuan' && Q0.s.gameState === 'dialog', '首拍挂主画布层，世界进 dialog 冻结', Q0.s);
ok(Q0.s.zones >= 9 && Q0.s.blockers >= 5, '地形区真挂上（石墙 / 山门 / 石阶 / 药庐）', Q0.s);
ok(Q0.dialog === Q0.want, '对白逐字等于 MAP_STORIES.qixuan[0]', { got: Q0.dialog, want: Q0.want });
ok(Q0.canvas && Q0.backdrop, '独立画布可见，且对话遮罩已撤成透明让地形透出', { canvas: Q0.canvas, backdrop: Q0.backdrop });
await page.screenshot({ path: join(here, 'shots', 'story-stage-dialog.png') });

const Q1 = await page.evaluate(async () => {
  const F = window.__FR;
  F.advanceDialog(); await new Promise(r => setTimeout(r, 0));
  const before = F.storyStage();
  await window.__ssRun('say', 120);
  return { before, after: F.storyStage() };
});
ok(Q1.before && Q1.before.kind === 'walk' && Q1.after.hero.x < -40,
   '韩立按分镜从村口往山门走（不是原地念对白）', { before: Q1.before, after: Q1.after });

const Q2 = await page.evaluate(async () => {
  const F = window.__FR;
  const trace = [];
  for (let i = 0; i < 320; i++) {
    const s = F.storyStage();
    if (i % 20 === 0) trace.push({ i, kind: s.kind, step: s.step, t: s.stepT, x: s.hero && s.hero.x, z: s.zhangtie });
    if (!s || !s.active || s.hero.x > 60) break;
    if (s.kind === 'say') { F.advanceDialog(); await new Promise(r => setTimeout(r, 0)); }
    else { F.storyStageTick(0.05); await new Promise(r => setTimeout(r, 0)); }
  }
  return { s: F.storyStage(), stairSpeed: window.StoryStage.speedAtRel(100, 0), trace };
});
ok(Q2.s.hero.x > 60 && Q2.s.hero.x < 170, '穿过山门门洞到石阶（没被两侧石墙卡住）', Q2.trace);
ok(Q2.stairSpeed > 0.6 && Q2.stairSpeed < 0.75, '石阶 + 晨雾确实减速', Q2.stairSpeed);
await page.screenshot({ path: join(here, 'shots', 'story-stage-390.png') });

const Q3 = await page.evaluate(() => {
  const F = window.__FR;
  F.storyStageSkip();
  return { s: F.storyStage(), state: F.G.state, dialog: getComputedStyle(document.getElementById('dialog')).display };
});
ok(Q3.s && !Q3.s.active && Q3.state !== 'dialog' && Q3.dialog === 'none', '跳过即收层、复原主角与镜头', Q3);

console.log('\n== 4. houshan 地形速度 ==');
const H0 = await page.evaluate(() => {
  window.__FR.storyStageStart('houshan');
  return {
    s: window.__FR.storyStage(),
    stream: window.StoryStage.speedAtRel(260, 20),
    herb: window.StoryStage.speedAtRel(40, 50),
    wall: window.StoryStage.blockedAt('houshan', 96, -120)
  };
});
ok(H0.s && H0.s.active && H0.s.mapId === 'houshan' && H0.s.zones >= 7, '后山段落点与原著药庐 / 北麓区一致', H0.s);
ok(H0.stream > 1 && H0.herb < 1, '山涧加速、药畦减速（是真的速度区，不是装饰）', { stream: H0.stream, herb: H0.herb });
ok(H0.wall === true, '山径石壁真挡路', H0.wall);
const H1 = await page.evaluate(() => { window.__FR.storyStageSkip(); return window.__FR.storyStage(); });
ok(H1 && !H1.active, '后山层也能干净收掉', H1);

console.log('\n== 4b. 野狼帮之围 / 血色禁地两段实机 ==');
const Y0 = await page.evaluate(async () => {
  window.__FR.storyStageStart('yelang');
  await new Promise(r => setTimeout(r, 30));   // weather 首拍经 setTimeout 才进 say
  const s = window.__FR.storyStage();
  return { s, first: document.getElementById('dialogText').textContent,
           want: window.MAP_STORIES.yelang[0][1],
           gate: window.StoryStage.blockedAt('yelang', -110, -100),
           gap: window.StoryStage.blockedAt('yelang', -110, 0) };
});
ok(Y0.s && Y0.s.active && Y0.s.mapId === 'yelang' && Y0.s.zones >= 7,
   '野狼帮之围段落点挂上，台词取 MAP_STORIES.yelang[0]', { s: Y0.s, first: Y0.first });
ok(Y0.first === Y0.want, '开场白逐字同源', { got: Y0.first, want: Y0.want });
ok(Y0.gate === true && Y0.gap === false, '山门左墙真挡、门洞留通道', { gate: Y0.gate, gap: Y0.gap });
const Y1 = await page.evaluate(async () => { await window.__ssRun('fade', 200); return window.__FR.storyStage(); });
ok(Y1 && Y1.step >= 20, '野狼帮之围能一路演到收场（群众演员逐拍现身不卡住）', Y1 && { step: Y1.step, total: Y1.total });
await page.evaluate(() => window.__FR.storyStageSkip());

const X0 = await page.evaluate(async () => {
  window.__FR.storyStageStart('xuesestory');
  await new Promise(r => setTimeout(r, 30));   // weather 首拍经 setTimeout 才进 say
  const s = window.__FR.storyStage();
  return { s, first: document.getElementById('dialogText').textContent,
           want: window.MAP_STORIES.xuesestory[0][1],
           pillar: window.StoryStage.blockedAt('xuesestory', 70, -20),
           herb: window.StoryStage.speedAtRel(90, 50) };
});
ok(X0.s && X0.s.active && X0.s.mapId === 'xuesestory' && X0.s.zones >= 7,
   '血色禁地段落点挂上，台词取 MAP_STORIES.xuesestory[0]', { s: X0.s, first: X0.first });
ok(X0.first === X0.want, '开场白逐字同源', { got: X0.first, want: X0.want });
ok(X0.pillar === true && X0.herb < 1, '断柱真挡、灵药凹地减速', { pillar: X0.pillar, herb: X0.herb });
const X1 = await page.evaluate(async () => { await window.__ssRun('fade', 300); return window.__FR.storyStage(); });
ok(X1 && X1.step >= 30, '血色禁地能一路演到收场（六人依次上场不卡住）', X1 && { step: X1.step, total: X1.total });
await page.evaluate(() => window.__FR.storyStageSkip());

console.log('\n== 4c. 墨府密谋实机 ==');
const M0 = await page.evaluate(async () => {
  window.__FR.storyStageStart('mishi');
  await new Promise(r => setTimeout(r, 30));   // weather 首拍经 setTimeout 才进 say
  const s = window.__FR.storyStage();
  return { s, first: document.getElementById('dialogText').textContent,
           want: window.MAP_STORIES.mishi[0][1],
           door: window.StoryStage.blockedAt('mishi', 230, -30),
           stair: window.StoryStage.speedAtRel(140, 70),
           ghost: (window.StoryStage.stages().mishi.actors.find(a => a.id === 'yuzitong') || {}).ghost };
});
ok(M0.s && M0.s.active && M0.s.mapId === 'mishi' && M0.s.zones >= 6,
   '墨府密谋段落点挂上，台词取 MAP_STORIES.mishi[0]', { s: M0.s, first: M0.first });
ok(M0.first === M0.want, '开场白逐字同源', { got: M0.first, want: M0.want });
ok(M0.door === true && M0.stair < 1, '封闭石门真挡、门内石阶减速', { door: M0.door, stair: M0.stair });
ok(M0.ghost === true, '余子童元神带 ghost 标记（半透明幽影）', M0.ghost);
const M1 = await page.evaluate(async () => { await window.__ssRun('fade', 400); return window.__FR.storyStage(); });
ok(M1 && M1.step >= 34, '墨府密谋能一路演到收场（摊牌→吞丸→一年后铁奴）', M1 && { step: M1.step, total: M1.total });
await page.evaluate(() => window.__FR.storyStageSkip());

console.log('\n== 5. 洞府回顾改走战斗地图剧情层 ==');
const seenOf = () => page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('fanren_save_v1') || '{}').seen || []));
const SEEN0 = await seenOf();
await page.evaluate(() => {
  const F = window.__FR;
  F.storyStageForce(true);
  F.cave('qixuan');
  F.caveTab('story');
  document.querySelector('#caveBody button[data-story="qixuan"]').click();
});
await page.waitForTimeout(120);
const R0 = await page.evaluate(() => {
  const F = window.__FR;
  const s = F.storyStage();
  const btn = document.getElementById('storyStageSkipBtn');
  const r = btn.getBoundingClientRect();
  const tb = document.getElementById('topbar').getBoundingClientRect();
  return {
    s, cs: window.Cutscene.active(), csHost: document.getElementById('csHost').style.display,
    cave: document.getElementById('cave').style.display, mapId: F.G.mapId,
    skip: { text: btn.textContent, display: getComputedStyle(btn).display,
            y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
            topbarBottom: Math.round(tb.bottom) },
    linesSame: (document.getElementById('dialogSpeaker').textContent + '|' + document.getElementById('dialogText').textContent)
      === window.MAP_STORIES.qixuan[0].join('|'),
    hud: ['topbar', 'quickbar', 'parryBtn', 'chatBtn', 'skillrow', 'banner', 'fsHint', 'ver'].reduce((o, id) => {
      o[id] = +getComputedStyle(document.getElementById(id)).opacity; return o;
    }, {})
  };
});
ok(R0.s && R0.s.active && R0.s.replay === true && R0.s.mapId === 'qixuan' && R0.s.gameState === 'dialog',
   '点「回看」进的是主画布层（replay 标记），不是 dialog 插画', R0.s);
ok(R0.cs === false && R0.csHost === 'none' && R0.cave === 'none' && R0.mapId === 'qixuan',
   '旧插画层没建，洞府收起，背景换成目标图', { cs: R0.cs, host: R0.csHost, cave: R0.cave, map: R0.mapId });
ok(R0.linesSame, '回放台词仍逐字来自 MAP_STORIES.qixuan', R0.linesSame);
ok(R0.skip.display === 'block' && /跳过/.test(R0.skip.text) && R0.skip.y >= R0.skip.topbarBottom + 4
   && R0.skip.w >= 44 && R0.skip.h >= 20,
   '跳过按钮可见、够点、且不压顶栏素签', R0.skip);
ok(Object.values(R0.hud).every(v => v === 0), '剧情中战斗 HUD 全隐，只留跳过', R0.hud);
ok(await seenOf() === SEEN0, '回放不写 save.seen，账本不变', null);
await page.screenshot({ path: join(here, 'shots', 'story-stage-replay.png') });

await page.click('#storyStageSkipBtn');
await page.waitForTimeout(120);
const R1 = await page.evaluate(() => ({
  s: window.__FR.storyStage(), cs: window.Cutscene.active(), state: window.__FR.G.state,
  cave: document.getElementById('cave').style.display,
  skip: getComputedStyle(document.getElementById('storyStageSkipBtn')).display,
  hud: ['topbar', 'quickbar', 'parryBtn', 'chatBtn', 'skillrow', 'banner', 'ver'].reduce((o, id) => {
    o[id] = +getComputedStyle(document.getElementById(id)).opacity; return o;
  }, {})
}));
ok(!R1.s.active && R1.cs === false && R1.state === 'cave' && R1.cave === 'flex' && R1.skip === 'none',
   '点跳过只收层并回洞府，不进战斗、不留残影', R1);
ok(Object.values(R1.hud).every(v => v === 1), '收层后战斗 HUD 原样恢复', R1.hud);
ok(await seenOf() === SEEN0, '跳过后账本仍不变', null);

const R2 = await page.evaluate(() => {
  document.getElementById('caveStory').click();
  const s = window.__FR.storyStage();
  return { s, cs: window.Cutscene.active() };
});
ok(R2.s && R2.s.active && R2.s.replay === true && R2.cs === false,
   '「重温此段」同样走主画布剧情层', R2.s);
await page.click('#storyStageSkipBtn');
await page.waitForTimeout(120);

const R3 = await page.evaluate(() => {
  const F = window.__FR;
  F.cave('qixuan'); F.caveTab('story');
  document.querySelector('#caveBody button[data-story="houshan"]').click();
  return { s: F.storyStage(), cs: window.Cutscene.active(), mapId: F.G.mapId };
});
ok(R3.s && R3.s.active && R3.s.mapId === 'houshan' && R3.s.replay === true
   && R3.mapId === 'houshan' && R3.cs === false,
   '后山回看也用后山背景演后山剧情，不叠在上一张图上', R3);
await page.click('#storyStageSkipBtn');
await page.waitForTimeout(120);

// 血色试炼剧目 id（xuesestory）与地图 id（xuese）不同名：回看要铺禁地背景、仍不写 seen。
const R4 = await page.evaluate(() => {
  const F = window.__FR;
  F.cave('xuese'); F.caveTab('story');
  const btn = document.querySelector('#caveBody button[data-story="xuesestory"]');
  if (btn) btn.click();
  return { s: F.storyStage(), cs: window.Cutscene.active(), mapId: F.G.mapId,
           names: Array.from(document.querySelectorAll('#caveBody .cs-nm')).map(x => x.textContent) };
});
ok(R4.s && R4.s.active && R4.s.replay === true && R4.s.mapId === 'xuesestory'
   && R4.mapId === 'xuese' && R4.cs === false,
   '血色试炼回看铺禁地背景（剧目 id 与地图 id 分离），不弹旧插画层', R4);
ok(R4.names.indexOf('血色禁地·中心区') >= 0, '回顾列表用中文剧目名，不裸显 xuesestory', R4.names);
await page.click('#storyStageSkipBtn');
await page.waitForTimeout(120);
ok(await seenOf() === SEEN0, '新增剧目回看仍不写账本', null);

// 太南小会：谷外 wagang → 谷内 tainan 的链式。market 分支不走 showLines 通道，
// 只有真进图才验得到「先演怪坡、再演广场、中间不弹商店」这条路径。
console.log('\n== 4d. 太南谷入谷链式（谷外 wagang → 谷内 tainan）==');
const W0 = await page.evaluate(async () => {
  const F = window.__FR;
  F.clearProgress(); F.unlockAll();
  F.storyStageForce(true);
  F.enterMap('tainan');
  await new Promise(r => setTimeout(r, 160));
  return {
    s: F.storyStage(), map: F.G.mapId, state: F.G.state,
    shop: document.getElementById('shop').style.display
  };
});
ok(W0.s && W0.s.active && W0.s.mapId === 'wagang',
   '进太南小会先在谷外演 wagang，不直接跳买入面板', W0.s);
ok(W0.shop !== 'flex' && W0.state === 'dialog',
   '剧情层占画面时不弹商店（G.state 冻结在 dialog）', { shop: W0.shop, state: W0.state });

const W1 = await page.evaluate(async () => {
  const F = window.__FR;
  for (let i = 0; i < 900; i++) {
    const s = F.storyStage();
    if (!s || !s.active || s.mapId === 'tainan') break;
    if (s.kind === 'say') F.advanceDialog();
    else F.storyStageTick(0.05);
    await new Promise(r => setTimeout(r, 0));
  }
  await new Promise(r => setTimeout(r, 60));
  // tainan 第一拍是 weather、第二拍是 fade，要再拨到第一句 say 才读得到台词
  for (let i = 0; i < 80; i++) {
    const s = F.storyStage();
    if (!s || !s.active || s.kind === 'say') break;
    F.storyStageTick(0.05);
    await new Promise(r => setTimeout(r, 0));
  }
  return {
    s: F.storyStage(),
    first: document.getElementById('dialogText').textContent,
    want: window.MAP_STORIES.tainan[0][1]
  };
});
ok(W1.s && W1.s.active && W1.s.mapId === 'tainan',
   'wagang 收场后链式接上 tainan（进谷的前后两半，中间不跳回战斗）', W1.s);
ok(W1.first === W1.want, '谷内开场白逐字同源 MAP_STORIES.tainan[0]', { got: W1.first, want: W1.want });
await page.evaluate(() => window.__FR.storyStageSkip());
await page.waitForTimeout(120);

// 嘉元城：码头 jiayuan → 墨府 mofu → 潇湘院 xiaoxiang 的链式。story 分支同样不走 showLines 通道，
// 只有真进图才验得到「先在码头收服孙二狗、再进墨府谈条件、最后去潇湘院毒杀沈重山，中间不跳回战斗」这条路径。
console.log('\n== 4e. 嘉元城三场链式（码头 jiayuan → 墨府 mofu → 潇湘院 xiaoxiang）==');
const J0 = await page.evaluate(async () => {
  const F = window.__FR;
  F.clearProgress(); F.unlockAll();
  F.storyStageForce(true);
  F.enterMap('jiayuan');
  await new Promise(r => setTimeout(r, 160));
  return {
    s: F.storyStage(), map: F.G.mapId, state: F.G.state,
    got: document.getElementById('dialogText').textContent,
    want: window.MAP_STORIES.jiayuan[0][1]
  };
});
ok(J0.s && J0.s.active && J0.s.mapId === 'jiayuan',
   '进嘉元城先演码头那一场（jiayuan），不直接跳墨府', J0.s);
ok(J0.got === J0.want, '码头开场白逐字同源 MAP_STORIES.jiayuan[0]', { got: J0.got, want: J0.want });

const J1 = await page.evaluate(async () => {
  const F = window.__FR;
  for (let i = 0; i < 1600; i++) {
    const s = F.storyStage();
    if (!s || !s.active || s.mapId === 'mofu') break;
    if (s.kind === 'say') F.advanceDialog();
    else F.storyStageTick(0.05);
    await new Promise(r => setTimeout(r, 0));
  }
  await new Promise(r => setTimeout(r, 60));
  // mofu 第一拍是 weather，要再拨到第一句 say 才读得到台词
  for (let i = 0; i < 80; i++) {
    const s = F.storyStage();
    if (!s || !s.active || s.kind === 'say') break;
    F.storyStageTick(0.05);
    await new Promise(r => setTimeout(r, 0));
  }
  return {
    s: F.storyStage(),
    got: document.getElementById('dialogText').textContent,
    want: window.MAP_STORIES.mofu[0][1]
  };
});
ok(J1.s && J1.s.active && J1.s.mapId === 'mofu',
   '码头收场后链式接上墨府（同一次进城的第二场，中间不跳回战斗）', J1.s);
ok(J1.got === J1.want, '墨府开场白逐字同源 MAP_STORIES.mofu[0]', { got: J1.got, want: J1.want });

// 第三场：墨府散场后必须接着演潇湘院。这一截最容易漏 —— 只改 game.js 的链式不做断言的话，
// 墨府演完直接进战斗，孙二狗从脚夫变帮主就没人讲了。
const J1b = await page.evaluate(async () => {
  const F = window.__FR;
  for (let i = 0; i < 2400; i++) {
    const s = F.storyStage();
    if (!s || !s.active || s.mapId === 'xiaoxiang') break;
    if (s.kind === 'say') F.advanceDialog();
    else F.storyStageTick(0.05);
    await new Promise(r => setTimeout(r, 0));
  }
  await new Promise(r => setTimeout(r, 60));
  for (let i = 0; i < 80; i++) {
    const s = F.storyStage();
    if (!s || !s.active || s.kind === 'say') break;
    F.storyStageTick(0.05);
    await new Promise(r => setTimeout(r, 0));
  }
  return {
    s: F.storyStage(),
    got: document.getElementById('dialogText').textContent,
    want: window.MAP_STORIES.xiaoxiang[0][1]
  };
});
ok(J1b.s && J1b.s.active && J1b.s.mapId === 'xiaoxiang',
   '墨府收场后链式接上潇湘院（第三场，毒杀沈重山那一夜的前半）', J1b.s);
ok(J1b.got === J1b.want, '潇湘院开场白逐字同源 MAP_STORIES.xiaoxiang[0]', { got: J1b.got, want: J1b.want });

await page.evaluate(() => window.__FR.storyStageSkip());
await page.waitForTimeout(180);
const J2 = await page.evaluate(() => {
  const s = window.__FR.storyStage();
  return { active: !!(s && s.active), state: window.__FR.G.state };
});
ok(!J2.active, '跳过之后剧情层收干净，不留残影', J2);

ok(errs.length === 0, '全程零报错', errs.slice(0, 4));
await b.close(); server.close();
console.log(`\n通过 ${pass}  失败 ${fail}`);
process.exit(fail ? 1 : 0);
