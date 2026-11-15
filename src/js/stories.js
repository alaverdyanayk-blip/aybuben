/* Вкладка «Истории»: личности и события армянской истории.
   История идёт по шагам: «Рассказ» (по-русски, с лентой дат) → «Слова» (главные слова истории) →
   «Читаем» (карточки на армянском, перевод по нажатию) → «Вопросы» (за них Циро получает костюм).
   Открыта, когда выучены все буквы (или включено «Открыть все уроки»). */
const storiesOpen=()=>S.unlockAll||LETTERS.every(letterLearned);
const stRead=id=>Math.max(0,S.stR[id]|0);
const stDone=id=>!!S.stQ[id];
const ST_KINDS=[['person','Люди'],['event','События']];
const ST_SOON={event:['Создание алфавита · 405','Аварайрская битва · 451','Сардарапатская битва · 1918','Первая Республика · 1918']};
const ST_STEPS=[['about','Рассказ'],['words','Слова'],['read','Читаем'],['quiz','Вопросы']];
let STC={id:null,i:0,all:false,step:'about'},ST_KIND='person';
const stNote=t=>{let e=$('#st-msg');if(!e){e=document.createElement('p');e.id='st-msg';e.className='note st-msg';e.setAttribute('role','status');$('.st-steps').after(e)}e.textContent=t};
const stCos=st=>HISTC.find(x=>x.st===st.id)||{};
function renderStories(sub){const ST=STORIES.find(x=>x.id===sub);
  if(!storiesOpen()){const kn=LETTERS.filter(letterLearned).length;
    $('#view').innerHTML=`<div class="stx">${ciroSay('think',`<p><b>Истории откроются, когда вы выучите все буквы.</b></p><p>Здесь — рассказы о людях и событиях армянской истории: сначала коротко по-русски, потом читаем по-армянски с переводом по нажатию. Сейчас выучено ${kn} из ${LETTERS.length} букв.</p>`)}<button class="btn" id="st-go">К урокам</button></div>`;
    $('#st-go').onclick=()=>{location.hash='learn'};return}
  if(!ST)return storyList();
  if(STC.id!==ST.id)STC={id:ST.id,i:Math.min(stRead(ST.id),ST.cards.length-1),all:false,step:stRead(ST.id)?'read':'about'};
  const n=ST.cards.length,step=STC.step;
  const body=step==='about'?stAbout(ST):step==='words'?stWords(ST):stRead_(ST);
  $('#view').innerHTML=`<div class="stx">
    <a class="ph-back" href="#stories">← Все истории</a>
    <div class="seg st-steps" role="tablist" aria-label="Шаги истории">${ST_STEPS.map(([k,t],j)=>`<button role="tab" data-s="${k}" aria-selected="${k===step}" ${k==='quiz'&&stRead(ST.id)<n&&!stDone(ST.id)?'aria-disabled="true"':''}><b>${j+1}</b>${t}</button>`).join('')}</div>
    ${body}</div>`;
  document.querySelectorAll('.st-steps button').forEach(b=>b.onclick=()=>{const k=b.dataset.s;
    if(k==='quiz'){if(stRead(ST.id)<n&&!stDone(ST.id)){stNote('Вопросы откроются, когда дочитаете карточки — осталось '+(n-stRead(ST.id))+'.');return}return storyQuiz(ST)}
    STC.step=k;renderStories(ST.id);scrollTo(0,0)});
  const nx=$('#st-to');if(nx)nx.onclick=()=>{STC.step=nx.dataset.s;renderStories(ST.id);scrollTo(0,0)};
  if(step==='read')wireRead(ST)}
function storyList(){const kind=ST_KIND,list=STORIES.filter(s=>(s.kind||'person')===kind);
  $('#view').innerHTML=`<div class="stx">
    <div class="st-intro">${ciroSay('happy',`<p><b>Истории.</b> Люди и события армянской истории. Сначала коротко по-русски, потом читаем по-армянски — нажмите на предложение, и появится перевод.</p><p>Дочитайте историю и ответьте на вопросы — Циро получит костюм героя.</p>`)}</div>
    <div class="seg st-kinds" role="group" aria-label="Что читать">${ST_KINDS.map(([k,t])=>`<button data-k="${k}" aria-pressed="${k===kind}">${t}</button>`).join('')}</div>
    ${list.length?`<div class="st-grid">${list.map(s=>{const n=s.cards.length,r=Math.min(stRead(s.id),n);return `<button class="st-card" data-st="${s.id}"><span class="st-art">${mascot(stDone(s.id)?'cheer':'happy','',stCos(s).id)}</span><span class="st-tx"><b>${esc(s.t)}</b><span class="arm hy">${esc(s.hy)}</span><span class="d">${esc(s.years)} · ${esc(s.d)}</span><span class="st-pr"><i style="width:${Math.round(r/n*100)}%"></i></span><em>${stDone(s.id)?'Прочитано, костюм получен':r?`Прочитано ${r} из ${n}`:'Новая история'}</em></span></button>`}).join('')}</div>`:''}
    ${(ST_SOON[kind]||[]).length?`<div class="box st-soon"><h3>Скоро</h3><div class="st-soon-l">${ST_SOON[kind].map(t=>`<span>${esc(t)}</span>`).join('')}</div></div>`:list.length?`<p class="note" style="text-align:center">Скоро — новые истории.</p>`:''}
  </div>`;
  document.querySelectorAll('.st-kinds button').forEach(b=>b.onclick=()=>{ST_KIND=b.dataset.k;storyList()});
  document.querySelectorAll('.st-card').forEach(b=>b.onclick=()=>{location.hash='stories/'+b.dataset.st})}
/* Шаг 1: рассказ по-русски — обложка, абзацы, лента дат */
function stAbout(ST){return `<section class="st-cover"><span class="st-cov-art">${mascot('happy','m-idle',stCos(ST).id)}</span><div><span class="k">${ST.kind==='event'?'Событие':'Личность'} · ${esc(ST.years)}</span><h2>${esc(ST.t)}</h2><span class="arm hy">${esc(ST.hy)}</span><p>${esc(ST.d)}</p></div></section>
   <section class="box st-about">${(ST.about||[]).map(p=>`<p>${esc(p)}</p>`).join('')}</section>
   ${ST.time?`<section class="box"><h3>Главные даты</h3><ol class="st-time">${ST.time.map(([y,t])=>`<li><b>${esc(y)}</b><span>${esc(t)}</span></li>`).join('')}</ol></section>`:''}
   <p class="note st-src">Источники: ${ST.src.map(esc).join('; ')}.</p>
   <button class="btn st-next1" id="st-to" data-s="words">Дальше: слова истории</button>`}
/* Шаг 2: главные слова — чтобы потом легче читалось */
function stWords(ST){return `<section class="box"><h3>Слова этой истории</h3><p class="note" style="margin:0">Они встретятся в карточках. Прочитайте каждое вслух.</p>
   <div class="st-words">${(ST.words||[]).map(w=>`<div class="st-w"><span class="arm">${esc(w[0])}</span>${spk2(w[0])}<span class="r">«${esc(w[1])}»</span><span class="m">${esc(w[2])}</span></div>`).join('')}</div></section>
   <button class="btn" id="st-to" data-s="read">Дальше: читаем по-армянски</button>`}
/* Шаг 3: карточки на армянском */
function stRead_(ST){const n=ST.cards.length,i=STC.i,c=ST.cards[i],last=i===n-1;
  S.stR[ST.id]=Math.max(stRead(ST.id),i+1);save();
  return `<div class="st-head"><span class="st-n">Карточка ${i+1} из ${n}</span></div>
    <div class="st-dots" aria-hidden="true">${ST.cards.map((_,k)=>`<i class="${k<i?'on':k===i?'cur':''}"></i>`).join('')}</div>
    <article class="st-page">
     <span class="chip st-when arm">${esc(c.when)}</span>
     <h2 class="arm">${esc(c.hy)}</h2><p class="st-ru">${esc(c.ru)}</p>
     <div class="st-ss">${c.s.map((x,k)=>`<button class="st-s ${STC.all?'open':''}" data-k="${k}" aria-expanded="${STC.all}"><span class="arm hy">${esc(x[0])}</span><span class="ru">${esc(x[1])}</span></button>`).join('')}</div>
     <button class="link st-all" id="st-all">${STC.all?'Скрыть перевод':'Показать весь перевод'}</button>
    </article>
    <div class="st-nav"><button class="btn plain" id="st-prev" ${i?'':'disabled'}>Назад</button><button class="btn" id="st-next">${last?'Ответить на вопросы':'Дальше'}</button></div>
    ${i===0?`<p class="note">Нажмите на предложение — появится перевод.</p>`:''}`}
function wireRead(ST){const n=ST.cards.length,last=STC.i===n-1;
  document.querySelectorAll('.st-s').forEach(b=>b.onclick=()=>{const o=!b.classList.contains('open');b.classList.toggle('open',o);b.setAttribute('aria-expanded',o)});
  $('#st-all').onclick=()=>{STC.all=!STC.all;renderStories(ST.id)};
  $('#st-prev').onclick=()=>{if(STC.i>0){STC.i--;STC.all=false;renderStories(ST.id);scrollTo(0,0)}};
  $('#st-next').onclick=()=>{if(last)return storyQuiz(ST);STC.i++;STC.all=false;renderStories(ST.id);scrollTo(0,0)}}
function storyQuiz(st){track('story','quiz-'+st.id);
  const items=shuffle(st.quiz).map(x=>x.hy?CH('Что значит это слово?',x.hy,x.a,x.w,{bigCls:'word'}):CH('Вопрос по истории',x.q,x.a,x.w,{bigCls:'ru'}));
  startLesson({id:'story',t:st.t,story:st.id,gen:()=>items},true)}
function finishStory(){LS.state='end';const st=STORIES.find(x=>x.id===LS.lesson.story),c=HISTC.find(x=>x.st===st.id),first=!stDone(st.id);
  S.stQ[st.id]=1;if(first)addXP(10);const newA=checkAch();save();syncU();track('story','done-'+st.id);
  $('#lprog').style.width='100%';
  $('#ex').innerHTML=`<div class="end"><span id="end-ciro">${mascot('cheer','m-jump',c&&c.id)}</span><h2>${first?'История прочитана!':'Отлично, всё помните!'}</h2>
   <div class="bubble">${c?`<p><b>${first?'Новый костюм':'Костюм'}: «${esc(c.t)}».</b> ${esc(c.d)}.</p>`:''}<p>${first?'+10 XP. ':''}Скоро здесь появятся новые истории.</p></div>
   ${c?`<button class="btn sm" data-wear="${c.id}" ${S.outfit===c.id?'disabled':''}>${S.outfit===c.id?'Надето':'Надеть костюм'}</button>`:''}
   ${newA.length?`<div class="achv-new">${newA.map(a=>`<button class="chip ach-sh" data-ach="${a.id}">${IC[a.ic]} ${esc(a.t)} <u>Поделиться</u></button>`).join('')}</div>`:''}</div>`;
  $('#lfoot').className='l-foot';foot(`<span></span><button class="btn" id="nxt">К историям</button>`);
  tapNext($('#nxt'),()=>{location.hash='stories';closeLesson()});
  wireWear('#end-ciro');document.querySelectorAll('.ach-sh').forEach(b=>b.onclick=()=>achShare(b.dataset.ach));
  if(first){sWin();confetti()}}
