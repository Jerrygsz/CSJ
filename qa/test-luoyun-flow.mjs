import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve('.');
const MIME = { '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg','.ogg':'audio/ogg' };
const server = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html'; fs.readFile(path.join(ROOT,p),(e,b)=>{ if(e){res.writeHead(404);res.end('nf');return;} res.writeHead(200,{'Content-Type':MIME[path.extname(p).toLowerCase()]||'application/octet-stream'}); res.end(b); }); });
(async()=>{
  await new Promise(r=>server.listen(0,r));
  const port=server.address().port;
  const browser=await chromium.launch({executablePath:EXE,headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:430,height:880},deviceScaleFactor:2});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message)); page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
  await page.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'load'});
  await page.waitForTimeout(1000);

  const r1 = await page.evaluate(()=>{
    const F=window.__FR; if(!F) return {err:'no __FR'};
    F.enterMap('luoyun'); F.skipStory(); F.finishMapNow(); F.skipStory();
    const info=F.info();
    return { afterLuoyun:{ state:info.state, unlocked:info.unlocked, caves:info.caves } };
  });
  console.log('STEP1 入落云宗:', JSON.stringify(r1));

  const r2 = await page.evaluate(()=>{
    const F=window.__FR;
    F.enterMap('luoyunyaoyuan'); F.skipStory(); F.finishMapNow(); F.skipStory();
    const info=F.info();
    return { afterYaoyuan:{ state:info.state, unlocked:info.unlocked, caves:info.caves } };
  });
  console.log('STEP2 天泉峰药园:', JSON.stringify(r2));
  console.log('errors:', JSON.stringify(errs));
  await browser.close(); server.close();
})().catch(e=>{console.error(e);process.exit(1);});
