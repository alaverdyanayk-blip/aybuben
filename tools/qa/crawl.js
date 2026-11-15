/* Глубокий обход (не входит в run.sh, ~5 мин): все экраны, шторки, буквы, игры и уроки в трёх состояниях
   на 360/390/1100 px в обеих темах — ошибки JS, прокрутка вбок, элементы шире экрана.
   Запуск при поднятом сервере: node tools/qa/crawl.js   (свои ширины: WS='[[320,"light"]]' node tools/qa/crawl.js) */
const {chromium}=require('playwright');
const U=process.env.QA_URL||'http://localhost:8765/index.html';
const out=[];const add=(w,m)=>out.push(w+' :: '+m);
(async()=>{const b=await chromium.launch();
for(const [W,th] of (process.env.WS?JSON.parse(process.env.WS):[[360,'light'],[360,'dark'],[390,'dark'],[1100,'light']])){
 const ctx=await b.newContext({viewport:{width:W,height:780},colorScheme:th});
 const p=await ctx.newPage();let where='load';
 p.on('pageerror',e=>add(W+th+' '+where,'JS: '+e.message));
 p.on('console',m=>{if(m.type()==='error'&&!/fonts|net::|Failed to load resource|stats|workers\.dev/.test(m.text()))add(W+th+' '+where,'console: '+m.text())});
 await p.route('**/*workers.dev/**',r=>r.fulfill({status:200,body:'{}'}));
 await p.goto(U);await p.waitForTimeout(300);
 await p.evaluate(()=>{window.__solveR=function(){const ex=LS.cur,ok=Math.random()<.7;
    if(ex.type==='trace'&&document.getElementById('tr-skip')){document.getElementById('tr-skip').click();return 'trace'}
    if(LS.state==='info'||LS.state==='checked'){const n=document.getElementById('nxt');if(n&&!n.disabled){n.click();return 'next'}}
    if(LS.state==='end')return 'end';
    if(ex.type==='teach'||ex.type==='letter'){document.getElementById('nxt').click();return 'teach'}
    if(ex.type==='choice'){let i=LS.opts.indexOf(ex.correct);if(!ok)i=LS.opts.findIndex(o=>o!==ex.correct);selectOpt(i);check();return 'choice'}
    if(ex.type==='build'){let ans=ex.answers[0];if(!ok)ans=ans.slice().reverse();const used=new Set();
      for(const tok of ans){const t=[...document.querySelectorAll('#bank .tile')].find(t=>ex.tiles[+t.dataset.i]===tok&&!used.has(t.dataset.i));if(!t)return 'NO-TILE';used.add(t.dataset.i);t.click()}check();return 'build'}
    if(ex.type==='match'){for(let i=0;i<ex.pairs.length;i++){document.querySelector(`.mi[data-s="L"][data-i="${i}"]`).click();document.querySelector(`.mi[data-s="R"][data-i="${i}"]`).click()}return 'match'}
    const n=document.getElementById('nxt');if(n&&!n.disabled){n.click();return 'next2'}
    return 'UNKNOWN '+ex.type}});
 const check=async(tag)=>{where=tag;globalThis.NC=(globalThis.NC||0)+1;if(/урок конец|игра идёт/.test(tag)){const s=await p.evaluate(()=>(LS?LS.state+' '+LS.i:'noLS')+' g:'+(document.querySelector('.game,.g-arena,#gview')?1:0));globalThis.L=(globalThis.L||[]);L.push(tag+'='+s)}await p.waitForTimeout(60);
   const r=await p.evaluate(()=>{const iw=innerWidth,bad=[];const sw=document.scrollingElement.scrollWidth;
     if(sw>iw+1)bad.push('прокрутка вбок '+sw+'>'+iw);
     for(const el of document.querySelectorAll('body *')){const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||cs.position==='fixed')continue;const R=el.getBoundingClientRect();if(!R.width)continue;
       if(R.right>iw+2&&!el.closest('[style*="overflow"],.games,.hscroll,.tracks,.seg,.chips,.abc-strip,.st-dots')){let o=el.parentElement,clip=false;while(o){const s=getComputedStyle(o);if(/(auto|scroll|hidden|clip)/.test(s.overflowX)){clip=true;break}o=o.parentElement}
         if(!clip){bad.push('шире экрана: '+(el.id?'#'+el.id:el.className||el.tagName)+' '+Math.round(R.right));break}}}
     /* текст, обрезанный многоточием или вылезающий из кнопок */
     for(const el of document.querySelectorAll('button,.chip,.pill')){if(el.offsetParent&&el.clientWidth&&el.scrollWidth>el.clientWidth+2)bad.push('текст не влезает: '+(el.id||el.className)+' «'+el.textContent.trim().slice(0,30)+'»')}
     return bad});
   r.slice(0,4).forEach(m=>add(W+th+' '+tag,m))};
 const go=async(h,tag)=>{await p.evaluate(h=>{location.hash=h;route()},h);await check(tag||h)};
 /* три состояния: новичок, середина, всё открыто */
 for(const [nm,st] of [['новичок',{}],['середина',{xp:400,streak:5,lastDay:null,done:{ab1a:1,ab1b:1,ab1w:1,ab2a:1}}],['всё',{unlockAll:true,xp:5000,streak:40,best:40}]]){
  await p.evaluate(st=>{localStorage.clear();S=upgrade(Object.assign(fresh(),st));save();route()},st);
  for(const h of ['learn','phrases','games','alphabet','rules','profile','stories'])await go(h,nm+' '+h);
  const phr=await p.evaluate(()=>PHR.map(x=>x.id));for(const id of phr)await go('phrases/'+id,nm+' phrases/'+id);
  if(nm==='всё'){for(const s of ['about','words','read']){await p.evaluate(s=>{location.hash='stories/nzhdeh';STC={id:'nzhdeh',i:0,all:false,step:s};route()},s);await check('история '+s)}
   await p.evaluate(()=>{ST_LANG='hy';route()});await check('история hy');await p.evaluate(()=>{ST_LANG='ru'});
   /* шторки */
   for(const [t,fn] of [['огонёк','streakSheet()'],['гардероб',"location.hash='profile';route();document.querySelector('#pf-go-wr').click()"],['достижения',"location.hash='profile';route();document.querySelector('#pf-go-ach').click()"]]){
     await p.evaluate(fn);await check('шторка '+t);await p.evaluate(()=>{const c=document.querySelector('.sheet [data-close]');c&&c.click()});await p.waitForTimeout(250)}
   const ks=await p.evaluate(()=>LETTERS.map(l=>l.k));
   for(const k of ks){await p.evaluate(k=>{location.hash='alphabet';route();letterSheet(k)},k);await check('буква '+k);await p.evaluate(()=>{const c=document.querySelector('.sheet [data-close]');c&&c.click()});await p.waitForTimeout(220)}
   /* игры: открыть каждую и сразу закрыть */
   const gs=await p.evaluate(()=>GAMES.map(g=>g.id));
   for(const g of gs){await p.evaluate(g=>{location.hash='games';route();openGame(g)},g);await check('игра '+g);
     await p.evaluate(()=>{const s=document.querySelector('#g-start,.g-start,[data-start]');s&&s.click()});await p.waitForTimeout(400);await check('игра идёт '+g);
     await p.evaluate(()=>{try{closeGame()}catch(e){}})}
   /* уроки: каждый тип шага, с ошибками */
   const ids=await p.evaluate(()=>LESSONS.map(l=>l.id));
   for(const id of ids.filter((_,i)=>i%3===0)){await p.evaluate(id=>{S.hearts=MAXH;startLesson(LESSONS.find(l=>l.id===id),false)},id);
     for(let s=0;s<80;s++){const st=await p.evaluate(()=>{if(!LS||LS.state==='end')return 'end';try{return __solveR?__solveR():'x'}catch(e){return 'err '+e.message}});if(st==='end')break;if(String(st).startsWith('err')){add('урок '+id,st);break}
       if(s===2)await check('урок '+id)}
     await check('урок конец '+id);await p.evaluate(()=>{try{closeLesson()}catch(e){}})}
   await p.evaluate(()=>{try{startPlacement()}catch(e){console.error('placement '+e.message)}});await check('тест на уровень');await p.evaluate(()=>{try{closeLesson()}catch(e){}});
  }
 }
 await ctx.close();
 if(W===360&&th==='light'){/* дальше — только в первом проходе подробные уроки */}
}
await b.close();
const uniq=[...new Set(out)];console.log('проверок',NC);console.log(L.slice(0,40).join(' | '));console.log(uniq.length?uniq.join('\n'):'ЧИСТО');})();
