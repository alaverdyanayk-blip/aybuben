/* Урок: ход урока, виды упражнений, проверка, итоги, конфетти. */
let LS=null;
function track(ev,p){try{if(window.__stats)window.__stats(ev,p)}catch(e){}}
const lref=l=>`${LESSONS.indexOf(l)}|${l.id}|${l.t}`;
function startPractice(){let items=[];
  for(const k of dueKeys()){if(items.length>=10)break;const ex=reviewEx(k);if(ex)items.push(ex)}
  if(items.length<10){const pool=LESSONS.filter(l=>S.done[l.id]);const src=pool.length?pool:[LESSONS[0]];let more=[];
    shuffle(src).slice(0,4).forEach(l=>more.push(...l.gen().filter(x=>x.type!=='teach'&&x.type!=='letter')));items.push(...sample(more,10-items.length))}
  startLesson({id:'practice',t:'Тренировка',gen:()=>shuffle(items)},true)}
function startLesson(lesson,practice){
  const items=lesson.gen();
  if(!practice&&LESSONS.includes(lesson)){const rv=dueKeys().filter(k=>!items.some(x=>x.item===k)).slice(0,2).map(reviewEx).filter(Boolean).map(x=>({...x,review:true}));
    if(rv.length)items.splice(Math.max(1,items.length-1),0,...rv)}
  LS={lesson,practice,queue:items.slice(),total:items.filter(x=>x.type!=='teach'&&x.type!=='letter').length,done:0,mistakes:0,combo:0,best:0,start:Date.now(),cur:null,state:'answer'};
  const el=document.createElement('div');el.className='lesson';el.id='lesson';
  el.innerHTML=`<div class="l-top"><button class="x" id="lquit" aria-label="Выйти из урока">✕</button><div class="prog"><i id="lprog" style="width:0"></i></div><span class="pill heart" id="lhearts"></span></div><div class="l-body"><div class="ex" id="ex"></div></div><div class="l-foot" id="lfoot"></div>`;
  $('#layer').appendChild(el);document.body.classList.add('locked');
  $('#lquit').onclick=quitLesson;
  next();
}
function quitLesson(){
  if(LS&&LS.done>0&&LS.state!=='end'){const s=sheet(`<div class="row">${mascot('sad')}<h3 style="flex:1">Выйти из урока? Прогресс этого урока не сохранится.</h3></div><div class="row"><button class="btn bad" id="qy">Выйти</button><button class="btn plain" data-close>Остаться</button></div>`);s.el.querySelector('#qy').onclick=()=>{s.close();closeLesson()};return}
  closeLesson()}
function closeLesson(){const el=$('#lesson');el&&el.remove();if(!$('#layer').children.length)document.body.classList.remove('locked');LS=null;route()}
function hudLesson(){$('#lprog').style.width=(LS.total?LS.done/LS.total*100:0)+'%';$('#lhearts').innerHTML=LS.practice?`${IC.heart}∞`:`${IC.heart}${S.hearts}`}
function next(){
  hudLesson();
  if(!LS.queue.length)return finishLesson();
  if(!LS.practice&&S.hearts<=0)return failLesson();
  const ex=LS.queue.shift();LS.cur=ex;LS.state='answer';LS.sel=null;
  const box=$('#ex');box.innerHTML='';$('#lfoot').className='l-foot';
  box.innerHTML=`<div class="combo">${LS.combo>=3?`<span class="chipf">${IC.flame}${LS.combo} подряд</span>`:''}</div>`;
  if(ex.type==='teach')renderTeach(ex,box);
  else if(ex.type==='letter')renderLetterCard(ex.l,box,ex);
  else if(ex.type==='choice')renderChoice(ex,box);
  else if(ex.type==='build')renderBuild(ex,box);
  else if(ex.type==='match')renderMatch(ex,box);
  if(ex.review)box.querySelector('h2')&&box.querySelector('h2').insertAdjacentHTML('beforebegin','<span class="rv-tag">Повторение</span>');
  $('.l-body').scrollTop=0;
}
function foot(html){$('#lfoot').innerHTML=`<div class="foot-in">${html}</div>`}
function footCheck(enabled){foot(`<span></span><button class="btn" id="chk" ${enabled?'':'disabled'}>Проверить</button>`);$('#chk').onclick=check}
function footNext(label='Дальше'){foot(`<span></span><button class="btn" id="nxt">${label}</button>`);$('#nxt').onclick=()=>next();$('#nxt').focus();LS.state='info'}
function renderTeach(ex,box){box.insertAdjacentHTML('beforeend',`<h2>${esc(ex.title)}</h2><div class="ciro-say stack">${mascot('happy','m-idle',ex.outfit)}<div class="bubble teach">${ex.html}</div></div>`);footNext('Понятно')}
function exWord(l,ex){const a=ex?ex.a:l.w,m=ex?ex.m:l.m,w=ex||WORDS.find(x=>x.a===l.w);
  return `<div class="ex-word"><span class="lbl">Пример</span><div class="ew-top"><span class="w">${hl(a,l.k)}</span>${spk(a,'sm')}</div><div class="ew-mean"><b>${esc(m)}</b>${w?`<span>звучит «${esc(w.r)}»</span>`:''}</div>${bd(a,l.k)}</div>`}
function exSyl(l,syl){const rd=t=>units(t).map(u=>(BY[u]||{}).s||u).join('').replace(/ \/ .*/,'');
  if(!syl.length)return `<div class="ex-word"><span class="lbl">Первая буква</span><div class="ew-mean"><span>С неё начинается армянский алфавит. По названиям первых двух букв, «айб» и «бен», он и называется «Айбубен». Слоги и слова начнутся со следующей буквы.</span></div></div>`;
  return `<div class="ex-word"><span class="lbl">Читаем слоги</span><div class="syls">${syl.map(t=>`<span class="syl"><b class="arm">${t}</b><small>${esc(units(t).map(u=>((BY[u]||{}).s||u).split(' / ')[0]).join(''))}</small></span>`).join('')}</div><div class="ew-mean"><span>Первые слова откроются, когда выучите ещё пару букв.</span></div></div>`}
function renderLetterCard(l,box,ex={}){box.insertAdjacentHTML('beforeend',`<h2>Новая буква</h2><div class="letter-card"><div class="lc-hero"><div class="gl">${l.U}${l.U!==l.k?`<small>${l.k}</small>`:''}</div><div class="info"><span class="chip lg">${esc(l.s)}</span><span style="color:var(--muted)">Название: «${esc(l.nm)}»</span></div></div><p style="margin:0">${esc(tipOf(l))}</p>${ex.syl?exSyl(l,ex.syl):exWord(l,ex.ex)}</div>`);footNext();if(!ex.syl)autoSay(ex.ex?ex.ex.a:l.w)}
function renderChoice(ex,box){
  const opts=shuffle(ex.options);LS.opts=opts;
  const pre=preSay(ex);
  let bigHtml=ex.bigCls==='sent'?esc(ex.big).replace('___','<span class="gap">?</span>'):esc(ex.big);
  if(ex.listen)bigHtml=`<div class="listen-row">${spk(ex.listen,'huge')}${spkSlow(ex.listen)}</div>`;else if(pre)bigHtml+=spk(pre);
  const d=ex.dlg,bigBox=d?`<div class="dlg">${mascot('happy','m-idle',ex.outfit)}<div class="bubble"><span class="who">${esc(ex.who)}</span><span class="dq">${esc(d.q[0])}${spk(d.q[0],'sm')}</span><span class="dr">«${esc(d.q[1])}»</span><span class="dm">${esc(d.q[2])}</span></div></div>`:`<div class="big ${ex.listen?'':ex.bigCls||'word'}">${bigHtml}</div>`;
  box.insertAdjacentHTML('beforeend',`<h2>${esc(ex.prompt)}</h2>${bigBox}${ex.sub?`<div class="sub">${esc(ex.sub)}</div>`:''}
   <div class="opts ${ex.optR?'one':''}">${opts.map((o,i)=>`<button class="opt ${ex.optArm?'arm':''}" data-i="${i}" aria-pressed="false"><span class="k">${i+1}</span>${esc(o)}${ex.optR&&PHMAP.has(o)?`<small class="or">${esc(PHMAP.get(o)[1])}</small>`:''}</button>`).join('')}</div>`);
  box.querySelectorAll('.opt').forEach(b=>b.onclick=()=>selectOpt(+b.dataset.i));
  footCheck(false);if(ex.listen)autoSay(ex.listen);else if(pre)autoSay(pre);else if(d&&hasAudio(d.q[0]))autoSay(d.q[0]);
}
const ARMRE=/[\u0531-\u0587]/;
function preSay(ex){if(ex.listen)return null;if(!ARMRE.test(ex.big)||ex.big.includes('___'))return null;
  if(/^Как это читается|^Как сказать на литературном|^Добавьте артикль|^Сделайте множественное|^Где ударение|^Какой знак|^Что значит знак/.test(ex.prompt))return null;
  return hasAudio(ex.big)?ex.big:null}
function postSay(ex){if(ex.listen)return ex.listen;if(ex.type==='build')return ex.show;
  if(ex.optArm&&hasAudio(ex.correct))return ex.correct;
  if(ex.big&&ex.big.includes('___')){const f=ex.big.replace('___',ex.correct);if(hasAudio(f))return f}
  if(ex.big&&hasAudio(ex.big))return ex.big;return null}
function selectOpt(i){if(LS.state!=='answer')return;LS.sel=i;document.querySelectorAll('#ex .opt').forEach((b,j)=>b.setAttribute('aria-pressed',j===i));$('#chk').disabled=false}
function renderBuild(ex,box){
  const tiles=shuffle(ex.tiles.map((t,i)=>({t,i})));LS.built=[];
  box.insertAdjacentHTML('beforeend',`<h2>${esc(ex.prompt)}</h2><div class="big ru" style="min-height:80px">${ex.listen?`<div class="listen-row">${spk(ex.listen,'huge')}${spkSlow(ex.listen)}</div>`:esc(ex.sub)}</div><div class="answer-line ${ex.letters?'letters':''}" id="aline"></div><div class="bank" id="bank">${tiles.map(o=>`<button class="tile ${ex.letters?'l':''}" data-i="${o.i}">${esc(o.t)}</button>`).join('')}</div>`);
  const draw=()=>{const a=$('#aline');a.innerHTML=LS.built.map(i=>`<button class="tile ${ex.letters?'l':''}" data-i="${i}">${esc(ex.tiles[i])}</button>`).join('');
    a.querySelectorAll('.tile').forEach(b=>b.onclick=()=>{if(LS.state!=='answer')return;const i=+b.dataset.i;LS.built=LS.built.filter(x=>x!==i);draw()});
    document.querySelectorAll('#bank .tile').forEach(b=>b.classList.toggle('ghost',LS.built.includes(+b.dataset.i)));
    const c=$('#chk');if(c)c.disabled=!LS.built.length};
  box.querySelectorAll('#bank .tile').forEach(b=>b.onclick=()=>{if(LS.state!=='answer')return;const i=+b.dataset.i;if(!LS.built.includes(i)){LS.built.push(i);draw()}});
  footCheck(false);draw();if(ex.listen)autoSay(ex.listen);
}
function renderMatch(ex,box){
  const left=shuffle(ex.pairs.map((p,i)=>({t:p[0],i}))),right=shuffle(ex.pairs.map((p,i)=>({t:p[1],i})));
  const armL=/[Ա-֏]/.test(ex.pairs[0][0]),armR=/[Ա-֏]/.test(ex.pairs[0][1]);
  const lt=ex.pairs.every(p=>[...p[0]].length<=2&&[...p[1]].length<=2);
  box.insertAdjacentHTML('beforeend',`<h2>${lt?'Заглавная и строчная':'Найдите пары'}</h2><div class="match${lt?' lt':''}"><div class="col">${left.map((o,k)=>`<button class="mi ${armL?'arm':''} ${o.t.length>11?'long':''}" style="grid-column:1;grid-row:${k+1}" data-s="L" data-i="${o.i}" aria-pressed="false">${esc(o.t)}</button>`).join('')}</div><div class="col">${right.map((o,k)=>`<button class="mi ${armR?'arm':''} ${o.t.length>11?'long':''}" style="grid-column:2;grid-row:${k+1}" data-s="R" data-i="${o.i}" aria-pressed="false">${esc(o.t)}</button>`).join('')}</div></div>`);
  let selL=null,selR=null,matched=0,errs=0;
  box.querySelectorAll('.mi').forEach(b=>b.onclick=()=>{
    if(ARMRE.test(b.textContent)&&S.voice!==false)say(b.textContent.trim());
    if(b.dataset.s==='L'){selL=b;box.querySelectorAll('.mi[data-s="L"]').forEach(x=>x.setAttribute('aria-pressed',x===b))}else{selR=b;box.querySelectorAll('.mi[data-s="R"]').forEach(x=>x.setAttribute('aria-pressed',x===b))}
    if(selL&&selR){const ok=selL.dataset.i===selR.dataset.i,a=selL,c=selR;selL=selR=null;
      [a,c].forEach(x=>x.setAttribute('aria-pressed','false'));
      if(ok){a.classList.add('ok');c.classList.add('ok');matched++;if(!(S.voice!==false&&(ARMRE.test(a.textContent)||ARMRE.test(c.textContent))))tone([[700+matched*60,.1]]);
        if(matched===ex.pairs.length){LS.state='checked';LS.done++;LS.combo++;if(errs===0){}feedback(true,errs?`Ошибок в парах: ${errs}`:'Все пары найдены')}}
      else{errs++;a.classList.add('no');c.classList.add('no');sBad();setTimeout(()=>{a.classList.remove('no');c.classList.remove('no')},450)}}
  });
  foot(`<span style="color:var(--muted)">${lt?'Нажмите букву слева, потом её пару справа':'Нажмите слово слева, потом его пару справа'}</span><span></span>`);
}
function check(){
  const ex=LS.cur;if(LS.state!=='answer')return;let ok=false;
  if(ex.type==='choice'){if(LS.sel==null)return;const val=LS.opts[LS.sel];ok=val===ex.correct;
    document.querySelectorAll('#ex .opt').forEach((b,j)=>{b.disabled=true;if(LS.opts[j]===ex.correct)b.classList.add('good');else if(j===LS.sel)b.classList.add('bad')})}
  else if(ex.type==='build'){if(!LS.built.length)return;const got=LS.built.map(i=>ex.tiles[i]).join('|');ok=ex.answers.some(a=>a.join('|')===got)}
  LS.state='checked';
  if(ex.item)memUpdate(ex.item,ok);
  if(ok){LS.done++;LS.combo++;LS.best=Math.max(LS.best,LS.combo);if(ex.tag==='read')S.read++}
  else{LS.mistakes++;LS.combo=0;if(!LS.practice){S.hearts=Math.max(0,hearts()-1);if(S.hearts===MAXH-1)S.heartsTs=Date.now()}save();LS.queue.push(ex)}
  let detail='';
  if(!ok){const ans=ex.type==='choice'?ex.correct:ex.show;detail=`Правильно: <span class="a">${esc(ans)}</span>`}
  if(ex.explain)detail+=(detail?'<br>':'')+ex.explain;
  if(ok&&ex.type==='build'&&ex.answers.length>1)detail=(detail?detail+'<br>':'')+'Можно и так: <span class="a">'+esc(ex.answers.map(a=>a.join(' ')).filter(a=>a!==LS.built.map(i=>ex.tiles[i]).join(' '))[0]||'')+'</span>';
  if(ex.after)detail+=ex.after;
  const ps=postSay(ex);if(ps){detail=`<span style="display:inline-flex;gap:8px;align-items:center;vertical-align:middle">${spk(ps,'sm')}</span> `+detail;autoSay(ps,420)}
  feedback(ok,detail);
}
function feedback(ok,detail){
  ok?sGood():sBad();hudLesson();
  $('#lfoot').className='l-foot '+(ok?'good':'bad');
  const p=pick(PRAISE),hot=ok&&LS.combo>=3;
  const title=ok?`<span class="arm">${p[0]}</span><span class="tr">${hot?`${LS.combo} подряд — ты в ударе!`:p[1]}</span>`:'Не совсем';
  foot(`<div class="fb">${mascot(ok?(hot?'cheer':'happy'):'sad',ok?'m-jump':'m-shake')}<div style="min-width:0"><div class="t">${title}</div>${ok?'':`<div class="ciro-line">${pick(OOPS)}</div>`}<div class="d">${detail||''}</div></div></div><button class="btn ${ok?'good':'bad'}" id="nxt">Дальше</button>`);
  $('#nxt').onclick=()=>next();$('#nxt').focus();
}
function finishLesson(){
  LS.state='end';const prac=LS.practice,perfect=LS.mistakes===0;
  const xp=prac?5:10+(perfect?5:0);
  const PL=LS.lesson.ph;let phFirst=false;
  if(prac)track('practice');else if(PL)track('phrase',PL.id+'-'+PL.n);else{track('lesson',lref(LS.lesson));if(!S.done[LS.lesson.id])track('lesson_first',lref(LS.lesson))}
  if(prac){S.hearts=Math.min(MAXH,hearts()+1)}else if(PL){const r=S.phr[PL.id]=S.phr[PL.id]||{},k='l'+PL.n;phFirst=!r[k];r[k]=(r[k]||0)+1;if(perfect)S.perfect++}else{S.done[LS.lesson.id]=(S.done[LS.lesson.id]||0)+1;if(perfect)S.perfect++}
  const goalBefore=todayXP()>=S.goal,lvBefore=level();addXP(xp);const goalNow=!goalBefore&&todayXP()>=S.goal;
  const newA=checkAch();save();
  const secs=Math.round((Date.now()-LS.start)/1000),acc=Math.round(LS.total/(LS.total+LS.mistakes)*100);
  $('#lprog').style.width='100%';
  const line=pick(prac?ENDLINE.prac:perfect?ENDLINE.perfect:LS.mistakes<=2?ENDLINE.good:ENDLINE.hard);
  if(!prac){S.hrs=S.hrs||{};const hh=new Date().getHours();S.hrs[hh]=(S.hrs[hh]||0)+1}
  const mile=streakMile();if(!prac&&S.refBy&&!S.refClaimed)refClaim();save();syncU();
  $('#ex').innerHTML=`<div class="end"><span id="end-ciro">${mascot('cheer','m-jump')}</span><h2>${prac?'Тренировка окончена':perfect?'Урок без ошибок!':'Урок пройден!'}</h2>
   <div class="bubble">${line}${goalNow?`<p style="margin-top:6px;font-weight:700">Цель дня выполнена! Огонёк: ${streakNow()} ${plural(streakNow(),'день','дня','дней')}.</p>`:''}</div>
   ${mile}${levelUps(lvBefore)}${PL&&PL.n===2&&phFirst?costumeUnlock(PL.id):''}
   <div class="tiles3"><div class="stat" style="--c:var(--gold-deep)"><div class="h">XP</div><div class="v">+${xp}</div></div><div class="stat" style="--c:var(--good)"><div class="h">Точность</div><div class="v">${acc}%</div></div><div class="stat" style="--c:var(--b3)"><div class="h">Время</div><div class="v">${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}</div></div></div>
   ${newA.length?`<div><p style="margin:0 0 8px;font-weight:700">Новое достижение</p><div class="achv-new">${newA.map(a=>`<span class="chip">${IC[a.ic]} ${esc(a.t)}</span>`).join('')}</div></div>`:''}${!prac?askNotif():''}${!prac&&!PL?inviteNudge():''}</div>`;
  $('#lfoot').className='l-foot';foot(`<span></span><button class="btn" id="nxt">Продолжить</button>`);$('#nxt').onclick=closeLesson;$('#nxt').focus();
  wireWear('#end-ciro');wireGrowth();sWin();confetti();
}
function failLesson(){LS.state='end';if(LS.lesson.id!=='practice')track('fail',lref(LS.lesson));
  $('#ex').innerHTML=`<div class="end">${mascot('sleep','m-idle')}<h2 style="color:var(--bad)">Сердца закончились</h2><div class="bubble">Сердечко восстанавливается за 30 минут. Или давай потренируемся на пройденном — сразу получишь одно.</div></div>`;
  $('#lfoot').className='l-foot';foot(`<button class="btn plain" id="out">Выйти</button><button class="btn" id="pr">Тренировка</button>`);
  $('#out').onclick=closeLesson;$('#pr').onclick=()=>{const el=$('#lesson');el&&el.remove();LS=null;startPractice()}}
function costumeUnlock(id){const c=COSTUMES.find(x=>x.ph===id);return `<div class="unlock"><b>Новый костюм для Циро!</b><div class="unlock-item">${mascot('cheer','',c.id)}<div>Циро теперь <b>${esc(c.t.toLowerCase())}</b><br><button class="btn plain sm" data-wear="${c.id}">Надеть</button></div></div></div>`}
function levelUps(lvBefore){const lv=level();if(lv<=lvBefore)return '';const items=OUTFITS.filter(o=>o.id&&o.lv>lvBefore&&o.lv<=lv);
  return `<div class="unlock"><b>Новый уровень: ${lv}</b>${items.map(o=>`<div class="unlock-item">${mascot('cheer','',o.id)}<div>Новая вещь для Циро: <b>${o.t}</b><br><button class="btn plain sm" data-wear="${o.id}">Надеть</button></div></div>`).join('')}</div>`}
function wireWear(sel){document.querySelectorAll('[data-wear]').forEach(b=>b.onclick=()=>{S.outfit=b.dataset.wear;save();b.textContent='Надето';b.disabled=true;const host=$(sel);if(host)host.innerHTML=mascot('cheer','m-jump')})}
document.addEventListener('keydown',e=>{
  if(!LS||$('.scrim'))return;
  if(LS.state==='answer'&&LS.cur&&LS.cur.type==='choice'&&/^[1-4]$/.test(e.key)&&+e.key<=LS.opts.length){selectOpt(+e.key-1)}
  else if(e.key==='Enter'){const b=$('#chk')||$('#nxt');if(b&&!b.disabled&&document.activeElement!==b){e.preventDefault();b.click()}}
});
function confetti(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const cv=$('#confetti');cv.hidden=false;const d=devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;const x=cv.getContext('2d');x.scale(d,d);
  const cs=getComputedStyle(document.documentElement),cols=['--b0','--b1','--b2','--b3','--gold'].map(v=>cs.getPropertyValue(v).trim());
  const P=Array.from({length:110},()=>({x:innerWidth/2+(Math.random()-.5)*120,y:innerHeight*.35,vx:(Math.random()-.5)*12,vy:-Math.random()*12-4,r:Math.random()*6+4,c:pick(cols),a:Math.random()*6,s:(Math.random()-.5)*.3}));
  let t=0;(function f(){x.clearRect(0,0,innerWidth,innerHeight);P.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.vx*=.99;p.a+=p.s;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);x.restore()});if(++t<110)requestAnimationFrame(f);else{cv.hidden=true}})()}
