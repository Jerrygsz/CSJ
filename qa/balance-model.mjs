// 解析模型：按游戏真实的结算路径算「该图推荐等级下玩家能打出多少」。
//
// 踩过的坑（第一版模型低估后期 4 倍）：
//   equippedEntries() 读的是 G.player.skills 整张表，不是存档里的「已装配」。
//   而 applyRealm 会把每个境界层奖励的功法写进 p.skills —— 也就是说
//   境界奖励的功法会一直挂在身上同时开火，槽位数只管存档里那一份。
//   所以高境界的实际输出 = 装配的几门 + 一路境界领的十几门，
//   只按「槽位数」算会严重低估。这里直接照抄真实路径。
//
// 输出：qa/balance/model.json
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const req = createRequire('C:/Users/92997/.workbuddy/binaries/node/workspace/');
const { chromium } = req('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const PORT = 9078;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'Content-Type': MIME[f.substring(f.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 420, height: 820 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__FR);

const out = await page.evaluate(() => {
  const W = window, F = W.__FR, G = F.G;

  const maps = W.MAPS.filter(m => m.type === 'combat' || m.type === 'boss' || m.type === 'chase');
  const res = [];
  for (const m of maps) {
    const L = m.startLevel || 1;
    F.clearProgress();
    F.setLevel(L);
    F.muteStory(true);
    F.enterMap(m.id, 'easy');
    for (let i = 0; i < 12 && G.state === 'dialog'; i++) F.skipStory();
    const p = G.player; if (!p) { res.push({ id: m.id, err: 'no player' }); continue; }

    // ---- 装配：从本图起手功法里按可落地秒伤取前 N 门 ----
    const sc = W.realmSkillCap(L), cap = W.skillSlots(L);
    const rank = Object.keys(m.startSkills || {}).map(id => {
      const s = W.skillById(id); if (!s || !s.atk) return null;
      const lv = Math.min(m.startSkills[id], Math.min(s.max, sc));
      const a = s.atk, d = W.skillAtk.dmg(a, lv), cnt = W.skillAtk.count(a, lv), cd = W.skillAtk.cd(a, lv);
      // 近身功法（绕身 / 踏地）只有贴脸才打得出，不能按纸面秒伤跟远程比
      const prox = (a.kind === 'orbit' || a.kind === 'field') ? 0.35 : 1;
      const raw = (a.kind === 'orbit' || a.kind === 'field' ? d * cnt / (a.cdHit || 0.45) : d * cnt / cd);
      return { id, lv, v: raw * prox };
    }).filter(Boolean).sort((x, y) => y.v - x.v);

    const skills = {};
    for (const r of rank.slice(0, cap)) skills[r.id] = r.lv;
    // 境界奖励：每层 +1 层，写进 p.skills（这就是「境界越高一路上领的功法都在开火」）
    for (const rl of W.REALM_LAYERS) {
      if (L < rl.lv || !rl.skill) continue;
      const s = W.skillById(rl.skill); if (!s) continue;
      skills[rl.skill] = Math.min(s.max, Math.min(sc, (skills[rl.skill] || 0) + 1));
    }
    p.skills = Object.assign({}, skills);

    // ---- 伤害倍率：境界 + 被动功法 ----
    let passiveDmg = 0, passiveCrit = 0, passiveAtkSpd = 0;
    for (const k in p.skills) {
      const s = W.skillById(k); if (!s || !s.effect) continue;
      if (s.effect.dmg) passiveDmg += s.effect.dmg * p.skills[k];
      if (s.effect.crit) passiveCrit += s.effect.crit * p.skills[k];
      if (s.effect.atkSpd) passiveAtkSpd += s.effect.atkSpd * p.skills[k];
    }
    const dmgMul = (1 + (G.realm.dmg || 0)) * (1 + passiveDmg);
    const critMul = 1 + Math.min(1, 0.05 + passiveCrit) * 0.8;
    // 出手频率：境界给的 atk（攻速）会直接压缩所有功法的 cd ——
    // 640 级时 realm.atk 已到 8 上下，等于每秒出手 9 次而非 1 次。
    // 第一版模型漏了这一项，导致后期低估约 7 倍（模型 1 万 / 实测 7.5 万）。
    const haste = Math.pow(0.92, passiveAtkSpd / 0.08);
    const atkMul = 1 / (1 + (G.realm.atk || 0));
    const rateMul = 1 / (haste * atkMul);

    // ---- 秒伤 ----
    let raw = 0; const detail = [];
    for (const k in p.skills) {
      const s = W.skillById(k); if (!s || !s.atk || s.type === 'passive') continue;
      const a = s.atk, lv = p.skills[k];
      const d = W.skillAtk.dmg(a, lv), cnt = W.skillAtk.count(a, lv), cd = W.skillAtk.cd(a, lv);
      const rangePenalty = (a.kind === 'orbit' || a.kind === 'field') ? 0.35 : 1;
      const v = (a.kind === 'orbit' || a.kind === 'field' ? d * cnt / (a.cdHit || 0.45) : d * cnt / cd) * rangePenalty;
      raw += v; detail.push(k + '@' + lv);
    }
    res.push({
      id: m.id, name: m.name, lv: L, type: m.type, diff: m.diff || 1, endLevel: m.endLevel || null,
      pHp: Math.round(p.maxhp), realmDmg: +(G.realm.dmg || 0).toFixed(2),
      passiveDmg: +passiveDmg.toFixed(2), passiveCrit: +passiveCrit.toFixed(3),
      dmgMul: +dmgMul.toFixed(2), critMul: +critMul.toFixed(3),
      realmAtk: +(G.realm.atk || 0).toFixed(2), passiveAtkSpd: +passiveAtkSpd.toFixed(2), rateMul: +rateMul.toFixed(2),
      rawDps: Math.round(raw), dps: Math.round(raw * rateMul * dmgMul * critMul),
      skills: detail, bossHp: m.boss ? m.boss.hp : null, bossDmg: m.boss ? m.boss.dmg : null,
    });
  }
  return res;
});

fs.mkdirSync(join(here, 'balance'), { recursive: true });
fs.writeFileSync(join(here, 'balance', 'model.json'), JSON.stringify(out, null, 1));
console.log('lv   id              pHp     dmgMul  rawDps   pDps  skills');
for (const m of out) console.log(String(m.lv).padStart(4), m.id.padEnd(14), String(m.pHp).padStart(7), String(m.dmgMul).padStart(7), String(m.rawDps).padStart(7), String(m.dps).padStart(7), m.skills.join(','));
await b.close(); server.close();
