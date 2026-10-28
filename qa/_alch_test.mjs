// 前置：先跑 node qa/_audit_props.mjs 生成 qa/_props.json（本脚本读它）
// 用 game.js 里的真实源码片段验证「炼丹成功率」模型
import fs from 'node:fs';
const src = fs.readFileSync('js/game.js', 'utf8');
const start = src.indexOf('const ALCHEMY_CAP');
const end = src.indexOf('function craftRecipe');
if (start < 0 || end < 0) { console.log('FAIL: 找不到源码片段'); process.exit(1); }
const code = src.slice(start, end);
let save = { alchemy: { n: 0 } };
const fn = new Function('save', code + '\nreturn { craftRateOf, alchemyProf, alchemyCount, ALCHEMY_CAP };');
const api = fn(save);

const recipes = JSON.parse(fs.readFileSync('qa/_props.json','utf8')).recipes.filter(r => r.kind === 'alchemy');
const show = (label) => {
  console.log('\n' + label + '  熟练加成 +' + (api.alchemyProf()*100).toFixed(1) + '%');
  for (const r of recipes.sort((a,b)=>a.rate-b.rate))
    console.log('  ' + String(r.name).padEnd(10) + ' base ' + (r.rate*100).toFixed(0).padStart(2) + '%  →  实得 ' + (api.craftRateOf(r)*100).toFixed(1) + '%');
};
show('【新手 · 未开过炉】');
save.alchemy.n = 30; show('【炼过 30 炉】');
save.alchemy.n = 300; show('【炼过 300 炉（封顶）】');

// 上限断言
const capOK = recipes.every(r => api.craftRateOf(r) <= api.ALCHEMY_CAP + 1e-9);
console.log('\n封顶 55% 检查：' + (capOK ? '✓ 全部不超过五成半' : '✗ 有超出'));
// 非炼丹不受影响
const forge = JSON.parse(fs.readFileSync('qa/_props.json','utf8')).recipes.find(r=>r.kind==='forge');
console.log('炼器不受炼丹熟练影响：' + (api.craftRateOf(forge) === forge.rate ? '✓' : '✗'));
