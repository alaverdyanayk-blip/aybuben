/* Тесты в режиме Телеграма: подменяем Telegram WebApp и сервер статистики, смотрим, что приложение просит и куда шлёт.
   Запуск: tools/qa/run.sh  или  node tools/qa/tg.test.js (нужен сервер на :8765). */
const {chromium}=require('playwright');
const U=process.env.QA_URL||'http://localhost:8765/index.html';
const T=[];const test=(name,fn)=>T.push({name,fn});

async function page(b,{st=null,search='',hash='',sp='',serverOn=false,write=true,slowFirstU=0}={}){let srv=serverOn,nU=0;
  const p=await b.newPage({viewport:{width:390,height:844}});p.errs=[];p.calls=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.route(/googleapis|gstatic/,r=>r.fulfill({body:''}));
  await p.route(/workers\.dev/,r=>{const u=r.request().url(),body=r.request().postData()||'';const path=u.split('.dev')[1].split('?')[0];let j={};try{j=JSON.parse(body)}catch(e){}p.calls.push([path,j]);
    if(path==='/r/me')return r.fulfill({contentType:'application/json',body:'{"code":"abc123def","friends":0}'});
    if(path==='/u'){nU++;const reply=JSON.stringify({ok:true,on:j.notif?(srv=!!j.notif.on):srv,hour:null,freq:1});   // сервер помнит настройку, как настоящий
      if(nU===1&&slowFirstU)return setTimeout(()=>r.fulfill({contentType:'application/json',body:reply}),slowFirstU);return r.fulfill({contentType:'application/json',body:reply})}
    r.fulfill({contentType:'application/json',body:'{"ok":true}'})});
  await p.route('**/telegram-web-app.js',r=>r.fulfill({contentType:'application/javascript',body:`window.__tg=[];window.__cloud={};
    window.Telegram={WebApp:{initData:'user=%7B%22id%22%3A1%7D&hash=x',initDataUnsafe:{user:{id:1},start_param:${JSON.stringify(sp)}},colorScheme:'dark',platform:'ios',version:'8.0',
      ready(){},expand(){},onEvent(){},offEvent(){},setHeaderColor(){},setBackgroundColor(){},setBottomBarColor(){},disableVerticalSwipes(){},isVersionAtLeast:()=>true,
      CloudStorage:{setItem(k,v,cb){__cloud[k]=v;cb&&cb(null,true)},getItem(k,cb){cb(null,__cloud[k]||'')},getItems(ks,cb){const o={};ks.forEach(k=>o[k]=__cloud[k]||'');cb(null,o)},getKeys(cb){cb(null,Object.keys(__cloud))},removeItems(ks,cb){ks.forEach(k=>delete __cloud[k]);cb&&cb(null,true)},removeItem(k,cb){delete __cloud[k];cb&&cb(null,true)}},
      BackButton:{show(){},hide(){},onClick(){},offClick(){}},HapticFeedback:{impactOccurred(){},notificationOccurred(){},selectionChanged(){}},
      openTelegramLink(u){__tg.push(['link',u])},openLink(u){__tg.push(['ext',u])},
      requestWriteAccess(cb){__tg.push(['write']);setTimeout(()=>cb(${write}),30)}}}`}));
  if(st)await p.addInitScript(s=>{if(!sessionStorage.__seeded){localStorage.setItem('aybuben-v2',JSON.stringify(s));sessionStorage.__seeded=1}},st);
  await p.goto(U+search+hash);await p.waitForTimeout(900);
  await p.evaluate(()=>{window.__solveAll=()=>{let g=0;while(LS&&LS.state!=='end'&&g++<400){const ex=LS.cur;
      if(ex.type==='trace'&&document.getElementById('tr-skip')){document.getElementById('tr-skip').click();continue}
      if(LS.state==='info'||LS.state==='checked'){const n=document.getElementById('nxt');if(n&&!n.disabled){n.click();continue}}
      if(ex.type==='teach'||ex.type==='letter'){document.getElementById('nxt').click();continue}
      if(ex.type==='choice'){selectOpt(LS.opts.indexOf(ex.correct));check();continue}
      if(ex.type==='build'){const used=new Set();for(const tok of ex.answers[0]){const t=[...document.querySelectorAll('#bank .tile')].find(t=>ex.tiles[+t.dataset.i]===tok&&!used.has(t.dataset.i));used.add(t.dataset.i);t.click()}check();continue}
      if(ex.type==='match'){for(let i=0;i<ex.pairs.length;i++){document.querySelector(`.mi[data-s="L"][data-i="${i}"]`).click();document.querySelector(`.mi[data-s="R"][data-i="${i}"]`).click()}continue}}
    return LS&&LS.state}});
  return p}
const ev=(p,name)=>p.calls.filter(c=>c[0]==='/e'&&c[1].ev===name);
const d=n=>{const x=new Date();x.setDate(x.getDate()+n);const z=v=>String(v).padStart(2,'0');return x.getFullYear()+'-'+z(x.getMonth()+1)+'-'+z(x.getDate())};

test('после первого урока Циро спрашивает про напоминания; «Да» включает и сообщает серверу',async b=>{const out=[],p=await page(b);
  await p.evaluate(()=>{startLesson(LESSONS[0],false);return __solveAll()});await p.waitForTimeout(200);
  const ask=await p.evaluate(()=>{const x=document.getElementById('ask-nt');return x&&x.dataset.ask});if(ask!=='1')out.push('вопроса нет: '+ask);
  if(!ev(p,'nt_ask').length)out.push('нет события nt_ask');
  await p.evaluate(()=>document.querySelector('[data-nt="1"]').click());await p.waitForTimeout(400);
  const st=await p.evaluate(()=>({n:S.notif,tg:__tg}));if(!st.n||!st.n.on)out.push('напоминания не включились: '+JSON.stringify(st.n));if(!st.tg.some(x=>x[0]==='write'))out.push('Телеграм не спросил разрешение');
  if(!ev(p,'nt_yes').length)out.push('нет события nt_yes');
  const u=p.calls.filter(c=>c[0]==='/u'&&c[1].notif&&c[1].notif.on).pop();if(!u)out.push('сервер не узнал о включении');if(!u||!u[1].info||!(u[1].info.l>0)||!u[1].info.nx)out.push('в /u нет прогресса: '+JSON.stringify(u&&u[1].info));
  return out.concat(p.errs)});
test('«Да» не отменяется медленным старым ответом сервера',async b=>{const out=[],p=await page(b,{slowFirstU:2500});
  await p.waitForTimeout(800);   // первый /u (без настроек) уже ушёл и висит
  await p.evaluate(()=>{startLesson(LESSONS[0],false);return __solveAll()});await p.waitForTimeout(150);
  await p.evaluate(()=>document.querySelector('[data-nt="1"]').click());await p.waitForTimeout(3200);   // старый ответ «выключено» пришёл после «Да»
  const n=await p.evaluate(()=>S.notif);if(!n||!n.on)out.push('напоминания выключились: '+JSON.stringify(n));if(n&&n.off)out.push('помечено «выключил сам»');return out.concat(p.errs)});
test('не ответил — спрашивает не больше трёх раз, третий раз предупреждает; потом один шанс при серии 3 дня',async b=>{const out=[],p=await page(b);
  const res=await p.evaluate(()=>{const r=[];for(let i=0;i<5;i++){startLesson(LESSONS[i],false);__solveAll();const x=document.getElementById('ask-nt');r.push(x?x.dataset.ask+(/Больше спрашивать не буду/.test(x.textContent)?'!':''):'-');
      if(i===0){/* экран итогов перерисовался — счёт не должен удвоиться */document.getElementById('ex').insertAdjacentHTML('beforeend',askNotif())}closeLesson()}return {r:r.join(','),n:S.ntAsk}});
  if(res.r!=='1,1,1!,-,-')out.push('показы: '+res.r+' (ждали 1,1,1!,-,-)');if(res.n!==3)out.push('счётчик '+res.n);
  if(ev(p,'nt_ask').length!==3)out.push('событий nt_ask: '+ev(p,'nt_ask').length);
  const k2=await p.evaluate(()=>{S.streak=2;S.lastDay=(()=>{const x=new Date();x.setDate(x.getDate()-1);return dstr(x)})();save();const r=[];for(let i=5;i<7;i++){startLesson(LESSONS[i],false);__solveAll();const x=document.getElementById('ask-nt');r.push(x?x.dataset.ask:'-');closeLesson()}return r.join(',')});
  if(k2!=='2,-')out.push('при серии 3 дня: '+k2+' (ждали 2,-)');return out.concat(p.errs)});
test('отказался → при серии 3 дня спрашивает ещё раз, потом больше никогда',async b=>{const out=[],p=await page(b,{st:{v:3,xp:100,done:{ab1a:1},streak:2,best:2,lastDay:d(-1),notif:{on:false,freq:1,hour:null}}});
  await p.evaluate(()=>{startLesson(LESSONS[1],false);return __solveAll()});await p.waitForTimeout(200);
  const a=await p.evaluate(()=>{const x=document.getElementById('ask-nt');return x&&x.dataset.ask});if(a!=='2')out.push('второго вопроса нет: '+a);
  await p.evaluate(()=>document.querySelector('[data-nt="0"]').click());
  await p.evaluate(()=>{closeLesson();startLesson(LESSONS[2],false);return __solveAll()});await p.waitForTimeout(200);
  if(await p.evaluate(()=>!!document.getElementById('ask-nt')))out.push('спросил в третий раз');return out.concat(p.errs)});
test('кто выключил напоминания сам — того не спрашивает',async b=>{const out=[],p=await page(b,{st:{v:3,xp:100,done:{ab1a:1},streak:5,best:5,lastDay:d(-1),notif:{on:true,freq:1,hour:null}}});
  await p.evaluate(()=>{location.hash='profile';route()});await p.waitForTimeout(200);await p.evaluate(()=>document.getElementById('sw-nt').click());await p.waitForTimeout(200);
  const n=await p.evaluate(()=>S.notif);if(n.on||!n.off)out.push('выключение не запомнилось: '+JSON.stringify(n));
  await p.evaluate(()=>{startLesson(LESSONS[1],false);return __solveAll()});await p.waitForTimeout(200);if(await p.evaluate(()=>!!document.getElementById('ask-nt')))out.push('всё равно спросил');return out.concat(p.errs)});
test('кнопка под напоминанием (?r=new#go): урок сразу, событие remind, метка убрана',async b=>{const out=[],p=await page(b,{st:{v:3,xp:100,done:{ab1a:1}},search:'?r=new',hash:'#go'});
  const r=await p.evaluate(()=>({l:LS&&LS.lesson&&LS.lesson.id,url:location.search}));if(r.l!=='ab1b')out.push('урок не начался: '+r.l);if(r.url.includes('r='))out.push('метка осталась в адресе');
  const e=ev(p,'remind');if(!e.length||e[0][1].p!=='new')out.push('нет события remind:new');return out.concat(p.errs)});
test('мусорная метка ?r= не принимается',async b=>{const p=await page(b,{st:{v:3,xp:100,done:{ab1a:1}},search:'?r=%3Cscript%3E'});const out=[];if(ev(p,'remind').length)out.push('событие с мусорной меткой');if(await p.evaluate(()=>!!LS))out.push('урок начался без #go');return out.concat(p.errs)});
test('ссылка на канал открывается внутри Телеграма',async b=>{const p=await page(b,{st:{v:3,xp:100,done:{ab1a:1},newsSeen:'old'}});const out=[];
  await p.evaluate(()=>document.querySelector('[data-news-ch]').click());await p.waitForTimeout(800);
  const tg=await p.evaluate(()=>__tg);if(!tg.some(x=>x[0]==='link'&&x[1]==='https://t.me/aybubenciro'))out.push('openTelegramLink не вызван: '+JSON.stringify(tg));
  if(!ev(p,'channel').length)out.push('нет события channel');if(await p.evaluate(()=>!!document.querySelector('.news-card')))out.push('карточка не закрылась');return out.concat(p.errs)});
test('прогресс сохраняется в облако Телеграма',async b=>{const p=await page(b);const out=[];await p.evaluate(()=>{startLesson(LESSONS[0],false);return __solveAll()});await p.evaluate(()=>closeLesson());await p.waitForTimeout(2500);
  const c=await p.evaluate(()=>{const k=Object.keys(__cloud);return k.map(x=>x+':'+String(__cloud[x]).length)});if(!c.length)out.push('в облако ничего не записано');
  const has=await p.evaluate(()=>Object.values(__cloud).join('').includes('ab1a'));if(!has)out.push('пройденного урока нет в облаке: '+c.join(', '));return out.concat(p.errs)});
test('приглашение: метка друга из start_param запоминается у новичка',async b=>{const p=await page(b,{sp:'rabc123def'});const r=await p.evaluate(()=>S.refBy);return (r==='abc123def'?[]:['refBy='+r]).concat(p.errs)});

test('айфон: двойное касание «Проверить» не проскакивает объяснение',async b=>{const {devices}=require('playwright');const ctx=await b.newContext({...devices['iPhone 13']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route(/googleapis|gstatic|workers\.dev|telegram-web-app/,r=>r.fulfill({body:''}));await p.goto(U);await p.waitForTimeout(700);const out=[];
  await p.evaluate(()=>startLesson(LESSONS[0],false));await p.waitForTimeout(400);
  for(let g=0;g<12;g++){const t=await p.evaluate(()=>LS.cur.type+'|'+LS.state);if(t.startsWith('choice|answer'))break;await p.tap('#nxt');await p.waitForTimeout(420)}
  if(!(await p.evaluate(()=>LS.cur.type==='choice'&&LS.state==='answer'))){await ctx.close();return ['не дошли до вопроса с выбором']}
  await p.evaluate(()=>{const i=LS.opts.indexOf(LS.cur.correct);document.querySelectorAll('#ex .opt')[i].click()});
  const bx=await (await p.$('#chk')).boundingBox(),x=bx.x+bx.width/2,y=bx.y+bx.height/2;
  await p.touchscreen.tap(x,y);await p.waitForTimeout(90);await p.touchscreen.tap(x,y);await p.waitForTimeout(150);
  const st=await p.evaluate(()=>({s:LS.state,fb:!!document.querySelector('#lfoot .fb')}));if(st.s!=='checked'||!st.fb)out.push('объяснение проскочило: '+JSON.stringify(st));
  await p.waitForTimeout(400);await p.touchscreen.tap(x,y);await p.waitForTimeout(250);if(await p.evaluate(()=>LS.state==='checked'))out.push('«Дальше» не срабатывает и после паузы');
  await ctx.close();return out.concat(errs)});

(async()=>{const b=await chromium.launch();let pass=0,fail=0;const t0=Date.now();
  for(const t of T){let res;try{res=await t.fn(b)}catch(e){res=['тест упал: '+e.message.split('\n')[0]]}const ok=!res.length;ok?pass++:fail++;
    console.log((ok?'✓ ':'✗ ')+t.name+(ok?'':'\n    '+res.slice(0,6).join('\n    ')))}
  console.log(`\n${pass} прошло, ${fail} не прошло · ${((Date.now()-t0)/1000).toFixed(0)} с`);await b.close();process.exit(fail?1:0)})();
