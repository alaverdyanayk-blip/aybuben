/* Тесты приложения: каждый тест возвращает список проблем, пустой список — тест прошёл.
   Запуск: tools/qa/run.sh (соберёт, поднимет сервер и прогонит всё) или вручную:
     python3 src/build.py && python3 -m http.server 8765 &  node tools/qa/app.test.js [фильтр]
   Нужен Playwright (npm i playwright). Код выполняется прямо в собранном index.html, с его глобальными функциями. */
const {chromium,devices}=require('playwright');
const U=process.env.QA_URL||'http://localhost:8765/index.html';
const ONLY=process.argv[2]||'';
const T=[];const test=(name,fn)=>T.push({name,fn});

/* ---------- помощники, которые кладутся в страницу ---------- */
const HELPERS=()=>{
  window.__solve=function(correct=true){const ex=LS.cur;
    if(ex.type==='trace'&&document.getElementById('tr-skip')){document.getElementById('tr-skip').click();return 'trace'}
    if(LS.state==='info'||LS.state==='checked'){const n=document.getElementById('nxt');if(n&&!n.disabled){n.click();return 'next'}}
    if(ex.type==='teach'||ex.type==='letter'){document.getElementById('nxt').click();return 'teach'}
    if(ex.type==='choice'){let i=LS.opts.indexOf(ex.correct);if(!correct)i=LS.opts.findIndex(o=>o!==ex.correct);selectOpt(i);check();return 'choice'}
    if(ex.type==='build'){let ans=ex.answers[0];if(!correct)ans=ans.slice().reverse();const used=new Set();
      for(const tok of ans){const t=[...document.querySelectorAll('#bank .tile')].find(t=>ex.tiles[+t.dataset.i]===tok&&!used.has(t.dataset.i));if(!t)return 'NO-TILE '+tok;used.add(t.dataset.i);t.click()}check();return 'build'}
    if(ex.type==='match'){for(let i=0;i<ex.pairs.length;i++){document.querySelector(`.mi[data-s="L"][data-i="${i}"]`).click();document.querySelector(`.mi[data-s="R"][data-i="${i}"]`).click()}return 'match'}
    return 'UNKNOWN '+ex.type};
  window.__runLesson=function(l,practice){if(practice)startPractice();else startLesson(l,false);let steps=0;const bad=[];
    while(LS&&LS.state!=='end'&&steps++<400){const r=__solve(true);if(/NO-TILE|UNKNOWN/.test(r))bad.push(r)}
    if(!LS||LS.state!=='end')bad.push('не дошёл до конца');if(LS&&LS.mistakes)bad.push('ошибок при верных ответах: '+LS.mistakes);return bad};
  window.__fresh=function(o={}){localStorage.clear();S=upgrade(Object.assign(fresh(),o));save();return S};
  window.__d=n=>{const x=new Date();x.setDate(x.getDate()+n);return dstr(x)};
  /* пропись: провести линию пальцем в координатах прописи */
  window.__tracer=function(key){const box=document.createElement('div');box.style.cssText='position:fixed;left:0;top:0;width:360px;z-index:9999;background:#fff';document.body.appendChild(box);
    const G=STROKES[key],st=G.s.map(d=>trSample(d)),ys=st.flatMap(s=>s.pts.map(q=>q[1])),TOP=Math.min(...ys,15)-8,BOT=Math.max(...ys,92)+8,w=G.w||70;
    const t=tracer(box,key,{demo:false});const cv=box.querySelector('canvas'),R=cv.getBoundingClientRect(),k=Math.min(R.height/(BOT-TOP),R.width/(w+24)),ox=(R.width-w*k)/2,oy=(R.height-(BOT-TOP)*k)/2;cv.setPointerCapture=()=>{};
    const fire=(type,[x,y])=>cv.dispatchEvent(new PointerEvent(type,{clientX:R.left+ox+x*k,clientY:R.top+oy+(y-TOP)*k,pointerId:1,bubbles:true}));
    return {st,draw:pts=>{fire('pointerdown',pts[0]);pts.slice(1).forEach(q=>fire('pointermove',q));fire('pointerup',pts[pts.length-1])},
      msg:()=>box.querySelector('.tr-msg').textContent,how:()=>box.querySelector('.tr-how').textContent,end:()=>{t.destroy();box.remove()}}};
  window.__jit=pts=>pts.map(([x,y],i)=>[x+Math.sin(i/4)*1.6,y+Math.cos(i/5)*1.6]);
  window.__join=list=>{const o=[];list.forEach((s,i)=>{if(i){const a=o[o.length-1],z=s.pts[0];for(let j=1;j<6;j++)o.push([a[0]+(z[0]-a[0])*j/6,a[1]+(z[1]-a[1])*j/6])}o.push(...s.pts)});return o};
};

/* ================= Уроки ================= */
test('все уроки проходятся подряд, без ошибок, +15 XP, сердца не тратятся',()=>{const out=[];__fresh();
  for(let i=0;i<LESSONS.length;i++){const l=LESSONS[i];if(!unlocked(i)){out.push(l.id+': закрыт, хотя предыдущие пройдены');continue}
    const xp0=S.xp,h0=S.hearts,bad=__runLesson(l,false);if(S.done[l.id]!==1)bad.push('не отмечен пройденным');if(S.xp-xp0!==15)bad.push('XP +'+(S.xp-xp0));if(S.hearts!==h0)bad.push('сердца изменились');
    closeLesson();if(bad.length)out.push(l.id+': '+bad.join('; '))}
  return out});
test('уроки «Фраз» проходятся',()=>{const out=[];__fresh();PHR.forEach(P=>[1,2].forEach(k=>{const bad=__runLesson(phLesson(P,k),false);closeLesson();if(bad.length)out.push(P.id+k+': '+bad.join('; '))}));return out});
test('тренировка проходится на разных этапах',()=>{const out=[];[0,3,20,LESSONS.length].forEach(n=>{__fresh();LESSONS.slice(0,n).forEach(l=>S.done[l.id]=1);seedMem();const bad=__runLesson(null,true);closeLesson();if(bad.length)out.push(n+' уроков: '+bad.join('; '))});return out});
test('ошибка отнимает сердце; без сердец — экран «Сердца закончились»',()=>{const out=[];__fresh();startLesson(LESSONS[0],false);let g=0,lost=0;
  while(LS&&LS.state!=='end'&&g++<300){const ex=LS.cur;if(LS.state==='answer'&&['choice','build'].includes(ex.type)){const h=S.hearts;__solve(false);if(S.hearts===h-1)lost++;else out.push('ошибка не отняла сердце ('+ex.type+')');const n=document.getElementById('nxt');n&&n.click();if(S.hearts===0)break}else __solve(true)}
  if(!lost)out.push('ни разу не потеряли сердце');
  if(S.hearts===0&&!/Сердца закончились/.test(document.getElementById('lesson').textContent))out.push('нет экрана «Сердца закончились»');closeLesson();return out});
test('двойное нажатие «Начать» не открывает урок дважды',()=>{__fresh();startLesson(LESSONS[0],false);startLesson(LESSONS[0],false);const n=document.querySelectorAll('#lesson').length;closeLesson();return n===1?[]:['уроков открыто: '+n]});

/* ================= Содержание заданий ================= */
test('сгенерированные задания корректны (40 прогонов каждого урока)',()=>{const P={};const add=(k,v)=>{(P[k]=P[k]||new Set()).add(v)};
  const chk=(ex,w)=>{if(ex.type==='choice'){const o=ex.options;if(!o.includes(ex.correct))add('нет верного ответа',w+' '+ex.big);if(new Set(o).size!==o.length)add('повтор варианта',w+' '+o.join('|'));if(o.length<2)add('меньше 2 вариантов',w);if(o.some(x=>x==null||x===''))add('пустой вариант',w);if(ex.listen&&!hasAudio(ex.listen))add('«послушайте» без звука',w+' '+ex.listen)}
    else if(ex.type==='build'){ex.answers.forEach(a=>{const t=ex.tiles.slice();for(const x of a){const i=t.indexOf(x);if(i<0){add('ответ не собрать из плиток',w+' '+ex.show);break}t.splice(i,1)}});if(ex.listen&&!hasAudio(ex.listen))add('диктант без звука',w+' '+ex.listen)}
    else if(ex.type==='match'){const L=ex.pairs.map(x=>x[0]),R=ex.pairs.map(x=>x[1]);if(ex.pairs.length<2)add('меньше 2 пар',w);if(new Set(L).size!==L.length||new Set(R).size!==R.length)add('одинаковые карточки',w+' '+JSON.stringify(ex.pairs))}
    else if(ex.type==='trace'){if(!STROKES[ex.key])add('пропись без данных',ex.key)}};
  LESSONS.forEach(l=>{for(let i=0;i<40;i++){let it;try{it=l.gen()}catch(e){add('урок не собирается',l.id+': '+e.message);break}if(!it.length)add('пустой урок',l.id);it.forEach(ex=>chk(ex,l.id))}});
  PHR.forEach(Q=>[1,2].forEach(k=>{for(let i=0;i<20;i++)phLesson(Q,k).gen().forEach(ex=>chk(ex,'ph-'+Q.id+k))}));
  return Object.keys(P).map(k=>k+' ×'+P[k].size+': '+[...P[k]].slice(0,4).join(' ; '))});
test('повторения: задание есть для каждой буквы и слова на любом этапе',()=>{const out=new Set();[3,20,LESSONS.length].forEach(n=>{__fresh();LESSONS.slice(0,n).forEach(l=>S.done[l.id]=1);
  LETTERS.forEach(l=>{for(let i=0;i<8;i++){try{const ex=reviewEx('#'+l.k);if(ex&&ex.type==='choice'&&!ex.options.includes(ex.correct))out.add('#'+l.k+': нет верного ответа')}catch(e){out.add('#'+l.k+': '+e.message)}}});
  WORDS.forEach(w=>{try{reviewEx(w.a)}catch(e){out.add(w.a+': '+e.message)}})});return [...out]});
test('данные: у букв есть прописи, звук и название; у слов — перевод и звук',()=>{const out=[];
  LETTERS.forEach(l=>{if(!STROKES[l.k])out.push('нет прописи '+l.k);if(l.U&&l.U!==l.k&&!STROKES[l.U])out.push('нет прописи '+l.U);if(!hasAudio(letterSnd(l)))out.push('нет звука буквы '+l.k);if(!hasAudio(l.hn))out.push('нет звука названия '+l.k)});
  const dup=WORDS.map(w=>w.a).filter((a,i,arr)=>arr.indexOf(a)!==i);if(dup.length)out.push('слова повторяются: '+dup.join(', '));
  WORDS.forEach(w=>{if(!w.r||!w.m)out.push('нет «как звучит» или перевода: '+w.a);if(!hasAudio(w.a))out.push('нет звука: '+w.a)});
  const ids=LESSONS.map(l=>l.id);if(new Set(ids).size!==ids.length)out.push('id уроков повторяются');
  PHR.forEach(P=>{if(!COSTUMES.find(c=>c.ph===P.id))out.push('нет костюма за ситуацию '+P.id)});return out});

/* ================= Прописи ================= */
test('прописи: правильная обводка засчитывается у всех букв',()=>{const out=[];for(const k of Object.keys(STROKES)){const t=__tracer(k);t.st.forEach(s=>t.draw(__jit(s.pts)));if(!/Готово|Отлично/.test(t.msg()))out.push(k+': '+t.msg());t.end()}return out});
test('прописи: штрих в обратную сторону ловится',()=>{const out=[];for(const k of Object.keys(STROKES)){const t=__tracer(k),s=t.st[0],a=s.pts[0],z=s.pts[31];if(s.len>=14&&Math.hypot(a[0]-z[0],a[1]-z[1])>8){t.draw(__jit([...s.pts].reverse()));if(!/другую сторону/.test(t.msg()))out.push(k+': '+t.msg())}t.end()}return out});
test('прописи: обводка всей буквы одним движением даёт понятную подсказку',()=>{const out=[];for(const k of Object.keys(STROKES)){if(STROKES[k].s.length<2)continue;const t=__tracer(k);t.draw(__jit(__join(t.st)));if(!/сразу/.test(t.msg()))out.push(k+': '+t.msg());t.end()}return out});
test('прописи: каракули не принимаются ни за букву, ни за «обвели сразу»',()=>{const out=[];for(const k of Object.keys(STROKES)){const t=__tracer(k),w=STROKES[k].w||70,sc=[];for(let i=0;i<60;i++)sc.push([5+(i*7)%w,20+((i*13)%70)]);t.draw(sc);if(/сразу|несколько|Штрих 2|Готово/.test(t.msg()))out.push(k+': '+t.msg());t.end()}return out});
test('прописи: подсказка о числе штрихов',()=>{const out=[];for(const k of Object.keys(STROKES)){const n=STROKES[k].s.length,t=__tracer(k),h=t.how();if(n>1?!h.includes(n+' штрих'):!/Один штрих/.test(h))out.push(k+': '+h);t.end()}return out});

/* ================= Сохранение и прогресс ================= */
test('серия: вчера +1, пропуск — заново, часы назад — не трогаем',()=>{const out=[],chk=(o,want,what)=>{Object.assign(S,o);addXP(5);if(S.streak!==want)out.push(what+': '+S.streak+' вместо '+want)};__fresh();
  chk({streak:3,lastDay:__d(-1)},4,'вчера');chk({streak:5,lastDay:__d(-3)},1,'пропуск');chk({streak:2,lastDay:today()},2,'сегодня');chk({streak:7,lastDay:__d(1)},7,'часы назад');chk({streak:0,lastDay:null},1,'первый раз');return out});
test('испорченные сохранения не ломают приложение (300 вариантов)',async()=>{const fails={};const junk=[null,undefined,0,-1,NaN,1e12,'x','',[],{},[1,2],{a:1},true,'<b>'];const rj=()=>junk[Math.random()*junk.length|0];
  const fields=['xp','daily','streak','lastDay','best','hearts','heartsTs','done','goal','ach','sound','unlockAll','read','perfect','games','phr','mem','outfit','theme','notif','hrs','miles','friends','refCode','voice','newsSeen','resetAt','ts','v'];
  const views=['learn','games','alphabet','rules','profile','phrases'];
  for(let it=0;it<300;it++){let st=fresh();LESSONS.slice(0,25).forEach(l=>st.done[l.id]=2);st.xp=600;st.lastDay=today();st.streak=4;
    for(let j=0;j<1+(Math.random()*3|0);j++){const f=fields[Math.random()*fields.length|0];if(Math.random()<.5||!st[f]||typeof st[f]!=='object')st[f]=rj();else{st[f]['#ա']=rj();st[f][today()]=rj();st[f].zz=rj()}}
    try{st=JSON.parse(JSON.stringify(st))}catch(e){continue}
    const note=(w,e)=>{const m=w+': '+(e&&e.message||e);fails[m]=(fails[m]||0)+1};
    try{S=upgrade(st);seedMem()}catch(e){note('upgrade',e);continue}
    for(const v of views){try{location.hash=v;route()}catch(e){note('экран '+v,e)}}
    try{drawHud();mergeState(S,fresh());mergeState(fresh(),S)}catch(e){note('шапка/слияние',e)}
    try{startPractice();let g=0;while(LS&&LS.state!=='end'&&g++<80)__solve(true);if(LS)closeLesson()}catch(e){note('тренировка',e);const el=document.getElementById('lesson');el&&el.remove();LS=null}
    document.querySelectorAll('.scrim,#game').forEach(x=>x.remove())}
  return Object.keys(fails).map(k=>k+' ×'+fails[k])});
test('upgrade чинит цель 0 и отрицательную серию',()=>{const s=upgrade({goal:0,streak:-3,xp:10,done:{}});return s.goal>0&&s.streak===0?[]:['goal='+s.goal+' streak='+s.streak]});

/* ================= Игры ================= */
test('все игры открываются и играются без ошибок',async()=>{const out=[];__fresh();LESSONS.forEach(l=>S.done[l.id]=1);
  for(const g of GAMES){try{openGame(g.id);const body=document.getElementById('game');if(!body)throw new Error('не открылась');
    for(let i=0;i<30;i++){const b=[...document.querySelectorAll('#game button:not([disabled])')].filter(x=>!/закрыть|✕/i.test(x.textContent+x.getAttribute('aria-label')));if(!b.length)break;b[(i*7)%b.length].click()}
    closeGame()}catch(e){out.push(g.id+': '+e.message);const el=document.getElementById('game');el&&el.remove();G=null}}
  openGame(GAMES[0].id);openGame(GAMES[0].id);const n=document.querySelectorAll('#game').length;closeGame();if(n!==1)out.push('игра открылась дважды');return out});

/* ================= Фразы, канал, напоминания ================= */
test('«Фразы»: звёзды пройденных уроков горят',()=>{__fresh({phr:{[PHR[0].id]:{l1:1,l2:1},[PHR[1].id]:{l1:1}}});location.hash='phrases';route();
  const st=[...document.querySelectorAll('.phc')].slice(0,3).map(c=>c.querySelectorAll('.phc-st i.on').length);return st.join()==='2,1,0'?[]:['звёзды: '+st.join()]});
test('карточка «Что нового» про канал: один раз и только тем, кто занимался',()=>{const out=[];
  __fresh({xp:100,done:{ab1a:1},newsSeen:'old'});NEWS_NOW=false;NEWS_CLOSED=false;location.hash='learn';route();
  const a=document.querySelector('[data-news-ch]');if(!a||a.getAttribute('href')!=='https://t.me/aybubenciro')out.push('нет кнопки «Подписаться»');
  NEWS_NOW=false;route();if(document.querySelector('.news-card'))out.push('показалась второй раз');
  __fresh();NEWS_NOW=false;NEWS_CLOSED=false;route();if(document.querySelector('.news-card'))out.push('показалась новичку');
  location.hash='profile';route();if(!document.querySelector('[data-ch-row][href="https://t.me/aybubenciro"]'))out.push('нет строки канала в профиле');return out});
test('прогресс для напоминаний (progressInfo) и обычный час',()=>{const out=[];__fresh({hrs:{20:1}});LESSONS.slice(0,3).forEach(l=>S.done[l.id]=1);const i=progressInfo();
  if(!i||i.d!==3||!(i.l>0)||typeof i.nx!=='string'||!i.nx)out.push('progressInfo: '+JSON.stringify(i));if(prefHour()!==20)out.push('prefHour='+prefHour());
  S.hrs={};if(prefHour()!==null)out.push('пустые часы → '+prefHour());S.hrs={'x':3,99:2};if(prefHour()!==null)out.push('мусор в часах → '+prefHour());return out});

/* ================= Случайные нажатия ================= */
test('1500 случайных нажатий без ошибок',async()=>{__fresh({xp:300,done:{ab1a:1,ab1b:1,ab1w:1}});location.hash='learn';route();
  for(let i=0;i<1500;i++){const els=[...document.querySelectorAll('button:not([disabled]),[role=button],.tile,.opt,.mi,a[href^="#"]')].filter(e=>e.offsetParent!==null&&!/Сбросить|reset/i.test(e.textContent+(e.id||'')));
    if(!els.length){location.hash='learn';route();continue}els[(Math.random()*els.length)|0].click();if(i%200===199){const el=document.getElementById('lesson');if(el&&Math.random()<.5)closeLesson()}}
  return []});

/* ================= Вёрстка ================= */
const LAYOUT=async(b,w)=>{const p=await b.newPage({viewport:{width:w,height:760}});await p.goto(U);await p.waitForTimeout(400);await p.evaluate(HELPERS);
  return p.evaluate(async()=>{const out=[];__fresh({xp:300,done:{ab1a:1,ab1b:1}});
    for(const v of ['learn','games','alphabet','rules','profile','phrases','phrases/'+PHR[0].id]){location.hash=v;route();await new Promise(r=>setTimeout(r,120));
      if(document.documentElement.scrollWidth>innerWidth+1)out.push(v+': горизонтальная прокрутка '+document.documentElement.scrollWidth);
      const wide=[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'&&!e.closest('.scroll-x,.chips,.tabs')&&!(function(n){for(n=n.parentElement;n&&n!==document.body;n=n.parentElement){const o=getComputedStyle(n).overflowX;if(o==='auto'||o==='scroll'||o==='hidden')return true}return false})(e)}).slice(0,2);
      wide.forEach(e=>out.push(v+': вылезает '+e.tagName.toLowerCase()+'.'+[...e.classList].join('.')))}
    startLesson(LESSONS[0],false);await new Promise(r=>setTimeout(r,150));if(document.documentElement.scrollWidth>innerWidth+1)out.push('урок: горизонтальная прокрутка');closeLesson();return out})};

/* ---------- запуск ---------- */
(async()=>{const b=await chromium.launch();let fail=0,pass=0;const t0=Date.now();
  const p=await b.newPage({viewport:{width:390,height:844}});const perr=[];p.on('pageerror',e=>perr.push(e.message));
  await p.goto(U);await p.waitForTimeout(500);await p.evaluate(HELPERS);
  for(const t of T){if(ONLY&&!t.name.includes(ONLY))continue;perr.length=0;let res;
    try{res=await p.evaluate(t.fn)}catch(e){res=['тест упал: '+e.message.split('\n')[0]]}
    if(perr.length)res=(res||[]).concat([...new Set(perr)].map(m=>'ошибка на странице: '+m));
    const ok=!res||!res.length;ok?pass++:fail++;console.log((ok?'✓ ':'✗ ')+t.name+(ok?'':'\n    '+res.slice(0,8).join('\n    ')+(res.length>8?'\n    … ещё '+(res.length-8):'')))}
  if(!ONLY||'вёрстка'.includes(ONLY)||ONLY==='layout')for(const w of [360,390]){const r=await LAYOUT(b,w);const ok=!r.length;ok?pass++:fail++;console.log((ok?'✓ ':'✗ ')+'вёрстка '+w+' px'+(ok?'':'\n    '+r.slice(0,8).join('\n    ')))}
  console.log(`\n${pass} прошло, ${fail} не прошло · ${((Date.now()-t0)/1000).toFixed(0)} с`);await b.close();process.exit(fail?1:0)})();
