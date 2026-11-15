/* «Истории»: короткие карточки на армянском об исторических личностях. Нажатие на предложение
   показывает перевод. В конце — несколько вопросов, за них Циро получает костюм героя.
   Раздел открыт, когда выучены все буквы (или включено «Открыть все уроки»). */
const storiesOpen=()=>S.unlockAll||LETTERS.every(letterLearned);
const stRead=id=>Math.max(0,S.stR[id]|0);
const stDone=id=>!!S.stQ[id];
let STC={id:null,i:0,all:false};
function storyTile(){const open=storiesOpen(),s=STORIES[0],n=s.cards.length,r=Math.min(stRead(s.id),n),kn=LETTERS.filter(letterLearned).length;
  return `<button class="tile2 story" id="stories">${mascot('happy','',HISTC[0].id)}<span class="tx"><span class="lbl">Истории</span><span class="ft">Читаем по-армянски о людях, которые вошли в историю</span><span class="more">${open?(stDone(s.id)?`${esc(s.t)} — прочитано`:r?`${esc(s.t)} · ${r} из ${n}`:`Первая история — ${esc(s.t)}`):`Откроется, когда выучите все буквы · ${kn} из ${LETTERS.length}`}</span></span></button>`}
function renderStories(sub){const ST=STORIES.find(x=>x.id===sub);
  if(!storiesOpen()){const kn=LETTERS.filter(letterLearned).length;
    $('#view').innerHTML=`<div class="stx">${ciroSay('think',`<p><b>Истории откроются, когда вы выучите все буквы.</b></p><p>Здесь мы читаем по-армянски о людях, которые вошли в историю: коротко, по карточкам, с переводом по нажатию. Сейчас выучено ${kn} из ${LETTERS.length} букв.</p>`)}<button class="btn" id="st-go">К урокам</button></div>`;
    $('#st-go').onclick=()=>{location.hash='learn'};return}
  if(!ST){$('#view').innerHTML=`<div class="stx">${ciroSay('happy',`<p><b>Истории.</b> Читаем по-армянски о людях, которые вошли в историю. Нажмите на предложение — появится перевод.</p><p>Дочитайте историю и ответьте на вопросы — Циро получит костюм героя.</p>`)}
      <div class="st-grid">${STORIES.map(s=>{const n=s.cards.length,r=Math.min(stRead(s.id),n),c=HISTC.find(x=>x.st===s.id);return `<button class="st-card" data-st="${s.id}"><span class="st-art">${mascot(stDone(s.id)?'cheer':'happy','',c&&c.id)}</span><span class="st-tx"><b>${esc(s.t)}</b><span class="arm hy">${esc(s.hy)}</span><span class="d">${esc(s.years)} · ${esc(s.d)}</span><span class="st-pr"><i style="width:${Math.round(r/n*100)}%"></i></span><em>${stDone(s.id)?'Прочитано, костюм получен':r?`Прочитано ${r} из ${n}`:`${n} ${plural(n,'карточка','карточки','карточек')}`}</em></span></button>`}).join('')}</div>
      <p class="note" style="text-align:center">Скоро — новые истории.</p></div>`;
    document.querySelectorAll('.st-card').forEach(b=>b.onclick=()=>{location.hash='stories/'+b.dataset.st});return}
  if(STC.id!==ST.id)STC={id:ST.id,i:Math.min(stRead(ST.id),ST.cards.length-1),all:false};
  const n=ST.cards.length,i=STC.i,c=ST.cards[i],last=i===n-1;
  S.stR[ST.id]=Math.max(stRead(ST.id),i+1);save();
  $('#view').innerHTML=`<div class="stx">
    <a class="ph-back" href="#stories">← Все истории</a>
    <div class="st-head"><span class="st-art sm">${mascot('happy','',(HISTC.find(x=>x.st===ST.id)||{}).id)}</span><div><b>${esc(ST.t)}</b><span class="arm">${esc(ST.hy)}</span></div><span class="st-n">${i+1} / ${n}</span></div>
    <div class="st-dots" aria-hidden="true">${ST.cards.map((_,k)=>`<i class="${k<i?'on':k===i?'cur':''}"></i>`).join('')}</div>
    <article class="st-page">
     <span class="chip st-when arm">${esc(c.when)}</span>
     <h2 class="arm">${esc(c.hy)}</h2><p class="st-ru">${esc(c.ru)}</p>
     <div class="st-ss">${c.s.map((x,k)=>`<button class="st-s ${STC.all?'open':''}" data-k="${k}" aria-expanded="${STC.all}"><span class="arm hy">${esc(x[0])}</span><span class="ru">${esc(x[1])}</span></button>`).join('')}</div>
     <button class="link st-all" id="st-all">${STC.all?'Скрыть перевод':'Показать весь перевод'}</button>
    </article>
    <div class="st-nav"><button class="btn plain" id="st-prev" ${i?'':'disabled'}>Назад</button><button class="btn" id="st-next">${last?(stDone(ST.id)?'Пройти вопросы ещё раз':'Ответить на вопросы'):'Дальше'}</button></div>
    ${i===0?`<p class="note st-src">Нажмите на предложение — появится перевод. Источники: ${ST.src.map(esc).join('; ')}.</p>`:''}
  </div>`;
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
