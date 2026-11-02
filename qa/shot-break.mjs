import { chromium } from 'playwright-core';
import path from 'path';

const EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const base = 'file://' + path.resolve('qa/break-preview.html');

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  // 筑基面板（用户当前进度）
  await page.goto(base + '?gate=0', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'qa/break-shot3-zhuji-panel.png' });
  console.log('shot3 (筑基面板) done');

  // 点击玉髓芝行 -> 去哪取提示
  await page.goto(base + '?gate=0&click=m_yusuizhi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'qa/break-shot4-zhuji-hint.png' });
  console.log('shot4 (筑基-玉髓芝提示) done');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
