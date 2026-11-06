// 剧情触发盘点（只读）：把「有剧情对话 / 必跌境界」的地图全部列出来，作为改动前的账目基线。
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// 这些数据文件会对 window.MATERIALS / window.ITEMS 等未知全局直接 .push()，
// 用一个惰性自建的 Proxy 兜住，免得为了盘点去引整套游戏逻辑。
const store = {
  // 数据文件在加载期就会调的少量非数组全局，给最小桩
  Items: { get: () => null, all: [], byId: {} },
  SKILLS: [],
};
const win = new Proxy(store, {
  get(t, k) { if (!(k in t)) t[k] = []; return t[k]; },
  set(t, k, v) { t[k] = v; return true; },
  has() { return true; },
});
const sandbox = { window: win, console };
vm.createContext(sandbox);
for (const f of ['js/maps.js', 'js/late.js', 'js/late2.js', 'js/late3.js', 'js/lingjie.js', 'js/xianjie.js', 'js/story.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
const W = sandbox.window;
const MAPS = W.MAPS || [];
const MS = W.MAP_STORIES || {};
const STORY = W.STORY || [];

const intro = MAPS.filter(m => m.intro && MS[m.intro]);
const outro = MAPS.filter(m => m.outro && MS[m.outro]);
const storyType = MAPS.filter(m => m.type === 'story');
const marketStory = MAPS.filter(m => m.type === 'market' && MS[m.id]);
const timed = [...new Set(STORY.map(s => s.map))];

// 剧情图里带破境门槛（endLevel）的那批：重打会重新走冲关，不能简单跳过
const storyGate = storyType.filter(m => m.endLevel);

console.log('地图总数:', MAPS.length, '｜ MAP_STORIES 节点:', Object.keys(MS).length, '｜ 定时剧情:', STORY.length);
console.log('');
console.log('A. type=story（进门即演）      :', storyType.length, '｜其中带 endLevel 破境门槛:', storyGate.length);
console.log('B. 有 intro 过场对话           :', intro.length);
console.log('C. 有 outro 收场对话           :', outro.length);
console.log('D. 坊市开场白（已按 cleared 闸门）:', marketStory.length);
console.log('E. 战斗内定时剧情               :', timed.length, '张图 /', STORY.length, '个节点 →', timed.join(', '));
console.log('');
const ids = (arr) => arr.map(m => m.id);
console.log('A 明细:', JSON.stringify(ids(storyType)));
console.log('');
console.log('A 带破境门槛:', JSON.stringify(ids(storyGate)));
console.log('');
console.log('B 明细:', JSON.stringify(ids(intro)));
console.log('');
console.log('C 明细:', JSON.stringify(ids(outro)));
