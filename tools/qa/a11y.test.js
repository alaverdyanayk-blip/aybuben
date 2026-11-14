/* Читаемость и доступность: axe-core проверяет все экраны в светлой и тёмной теме (контраст текста, вложенные кнопки, роли).
   Запуск: node tools/qa/a11y.test.js (нужен сервер на :8765 и модуль axe-core: npm i axe-core). Без модуля тест пропускается.
   Запрет масштабирования (meta viewport) не считается ошибкой: в мини-приложении Телеграма он нужен, чтобы экран не «прыгал» при письме пальцем. */
const {chromium}=require('playwright');const fs=require('fs');
let AXE;try{AXE=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')}catch(e){console.log('пропущено: нет модуля axe-core (npm i axe-core)');process.exit(0)}
const U=process.env.QA_URL||'http://localhost:8765/index.html';
(async()=>{const b=await chromium.launch();const bad={};
for(const sc of ['light','dark']){const p=await b.newPage({viewport:{width:390,height:844},colorScheme:sc});await p.route(/googleapis|gstatic|workers\.dev|telegram/,r=>r.fulfill({body:''}));
  await p.goto(U);await p.waitForTimeout(400);
  await p.evaluate(()=>{localStorage.setItem('aybuben-v2',JSON.stringify({v:SCHEMA,xp:300,done:{ab1a:2,ab1b:1,ab1w:1},lastDay:today(),streak:2,newsSeen:NEWS_ID,phr:{[PHR[0].id]:{l1:1}},games:{fall:{best:9,plays:2}}}))});await p.reload();await p.waitForTimeout(500);await p.addScriptTag({content:AXE});
  const first=await p.evaluate(()=>PHR[0].id);
  for(const v of ['learn','games','alphabet','rules','profile','phrases','phrases/'+first,'вопрос','верно','неверно','итоги урока','карточка буквы','игра','новичок']){
    await p.evaluate(async v=>{const sl=ms=>new Promise(r=>setTimeout(r,ms));document.querySelectorAll('.scrim').forEach(x=>x.remove());if(LS)closeLesson();if(document.getElementById('game'))closeGame();
      const toQ=()=>{let g=0;while(LS.cur.type!=='choice'&&g++<20)(document.getElementById('tr-skip')||document.getElementById('nxt')).click()};
      if(v==='вопрос'){startLesson(LESSONS[3],false);toQ()}
      else if(v==='верно'){startLesson(LESSONS[3],false);toQ();selectOpt(LS.opts.indexOf(LS.cur.correct));check()}
      else if(v==='неверно'){startLesson(LESSONS[3],false);toQ();selectOpt(LS.opts.findIndex(o=>o!==LS.cur.correct));check()}
      else if(v==='итоги урока'){startLesson(LESSONS[4],false);let g=0;while(LS&&LS.state!=='end'&&g++<300){const ex=LS.cur;if(ex.type==='trace'&&document.getElementById('tr-skip')){document.getElementById('tr-skip').click();continue}if(LS.state!=='answer'){document.getElementById('nxt').click();continue}
        if(ex.type==='choice'){selectOpt(LS.opts.indexOf(ex.correct));check()}else if(ex.type==='build'){const u=new Set();for(const tok of ex.answers[0]){const t=[...document.querySelectorAll('#bank .tile')].find(t=>ex.tiles[+t.dataset.i]===tok&&!u.has(t.dataset.i));u.add(t.dataset.i);t.click()}check()}
        else if(ex.type==='match'){for(let i=0;i<ex.pairs.length;i++){document.querySelector(`.mi[data-s="L"][data-i="${i}"]`).click();document.querySelector(`.mi[data-s="R"][data-i="${i}"]`).click()}}else document.getElementById('nxt').click()}}
      else if(v==='карточка буквы'){location.hash='alphabet';route();letterSheet('ա')}
      else if(v==='игра'){openGame('fall')}
      else if(v==='новичок'){localStorage.clear();S=upgrade(fresh());location.hash='learn';route()}
      else{location.hash=v;route()}await sl(450)},v);
    const r=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:['wcag2a','wcag2aa'],rules:{'meta-viewport':{enabled:false}}});
      return r.violations.flatMap(x=>x.nodes.map(n=>{const d=(n.any[0]&&n.any[0].data)||{};return x.id+(x.id==='color-contrast'?` ${d.fgColor} на ${d.bgColor} = ${d.contrastRatio} (${d.fontSize})`:'')+' — '+n.target.join(' ').slice(-60)}))});
    r.forEach(m=>{(bad[m]=bad[m]||new Set()).add((sc==='light'?'светлая':'тёмная')+': '+v)})}
  await p.close()}
const ks=Object.keys(bad);ks.forEach(k=>console.log('✗ '+k+'\n    '+[...bad[k]].slice(0,4).join(', ')));
console.log(ks.length?`\nпроблем: ${ks.length}`:'✓ все экраны в обеих темах: контраст и разметка в порядке');await b.close();process.exit(ks.length?1:0)})();
