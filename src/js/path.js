/* Главный экран: Циро, путь уроков, окна урока и раздела. */
const OFF=[0,48,72,48,0,-48,-72,-48];
function ciroStatus(){const st=streakNow(),tx=todayXP(),left=Math.max(0,S.goal-tx),fresh=!S.xp&&!Object.keys(S.done).length;
  if(fresh)return {mood:'happy',t:'Я — Циро, армянский абрикос. Научу тебя читать и писать на литературном армянском. Начнём с первых букв?'};
  if(tx>=S.goal)return {mood:'cheer',t:st>=3?`Цель дня выполнена! ${st} ${plural(st,'день','дня','дней')} подряд — бабушка уже рассказала соседям. Ещё урок?`:`Цель дня выполнена!${st>1?` Огонёк горит ${st} ${plural(st,'день','дня','дней')}.`:''} Можно отдохнуть… или ещё урок?`};
  if(st>0&&S.lastDay!==today())return {mood:'wow',t:`Огонёк горит ${st} ${plural(st,'день','дня','дней')}. Один урок сегодня — и он не погаснет!`};
  if(S.lastDay&&daysBetween(S.lastDay,today())>=3)return {mood:'sad',t:'Наконец-то! Мне пришлось одному доедать всю долму. Начнём с повторения?'};
  if(st===0&&(S.best||0)>0)return {mood:'sad',t:'Огонёк погас, но это не беда. Зажжём новый?'};
  const n=Math.ceil(left/10);return {mood:'happy',t:`До цели дня ${left} XP — примерно ${n} ${plural(n,'урок','урока','уроков')}.`}}
function renderLearn(){
  const curIdx=LESSONS.findIndex((l,i)=>unlocked(i)&&!S.done[l.id]);
  const g=ciroGreet(),stt=ciroStatus(),tx=todayXP(),pct=Math.min(100,Math.round(tx/S.goal*100));
  const kn=new Set(LETTERS.filter(letterLearned).map(l=>l.k)),wr=WORDS.filter(w=>hasAudio(w.a)&&readable(w,kn)),wpool=wr.length>=5?wr:WORDS.filter(w=>hasAudio(w.a)),wod=wpool.length?wpool[Math.floor(Date.now()/864e5)%wpool.length]:null;
  if(S.factI==null)S.factI=Math.floor(Math.random()*FACTS.length);
  const ctaLabel=curIdx<0?'Тренировка':(!S.xp?'Начать первый урок':`Продолжить · ${LESSONS[curIdx].t}`);
  let html=`<div class="home">${whatsNew()}<section class="hero">
    <button class="hero-ciro" id="ciro" aria-label="Циро, нажми — поздоровается">${mascot(stt.mood,'m-idle')}</button>
    <div class="bubble"><div class="hy"><span class="hy-top"><b>${g.hy}!</b>${spk(g.hy,'sm')}</span><span class="tr">${g.tr}</span></div><p>${stt.t}</p></div>
    <div class="goal"><div class="goal-top"><span>Цель дня</span><b>${tx} / ${S.goal} XP</b></div><div class="bar ${pct>=100?'good':''}"><i style="width:${pct}%"></i></div></div>
    <button class="btn cta" id="cta">${esc(ctaLabel)}</button></section>
   <div class="duo">
    ${wod?`<div class="tile2 wod"><div class="tx"><span class="lbl">Слово дня</span><span class="w">${esc(wod.a)}</span><span class="m">«${esc(wod.r)}» — ${esc(wod.m)}</span></div>${spk(wod.a)}</div>`:`<div class="tile2 wod"><div class="tx"><span class="lbl">Слово дня</span><span class="m">Появится, когда вы выучите первые буквы: здесь будут только слова, которые вы уже можете прочитать.</span></div></div>`}
    <button class="tile2 phr" id="phr-tile">${mascot('happy','','taxi')}<span class="tx"><span class="lbl">Фразы для поездки</span><span class="pt">Такси, рынок, кафе, аэропорт…</span><span class="m">${PHR.filter(p=>phDone(p.id)).length} из ${PHR.length} ситуаций · костюмы для Циро</span></span></button>
    <button class="tile2 fact" id="fact">${mascot('think')}<span class="tx"><span class="lbl">Циро знает</span><span class="ft" id="fact-t">${FACTS[S.factI%FACTS.length]}</span><span class="more">Нажми — расскажу ещё</span></span></button>
    ${Object.keys(S.done).length?`<button class="tile2 prac" id="prac"><span class="pic">${IC.bolt}</span><span class="tx"><span class="lbl">Тренировка</span><span class="pt">${(()=>{const n=dueKeys().length;return n>30?'Пора освежить пройденное':n?`${n} ${plural(n,'слово пора','слова пора','слов пора')} повторить`:'10 заданий из пройденного'})()}</span><span class="m">+5 XP и +1 сердце</span></span></button>`:''}
   </div></div>
  <div style="display:flex;flex-direction:column;gap:30px;margin-top:30px">`;
  const curUnit=curIdx<0?-1:LESSONS[curIdx].unit;
  UNITS.forEach((u,ui)=>{const dn=u.lessons.filter(l=>S.done[l.id]).length,all=dn===u.lessons.length,locked=u.lessons.every(l=>!unlocked(LESSONS.indexOf(l)));
    const compact=!EXPANDED.has(ui)&&((all&&ui!==curUnit)||(locked&&curUnit>=0&&ui>curUnit+1));
    if(compact){html+=`<section class="unit" style="--band:var(--b${ui%4})"><button class="band mini ${all?'fin':'lock'}" data-exp="${ui}" aria-expanded="false"><span class="mi-ic">${all?'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7a5 5 0 0 1 10 0v3h1v11H6V10zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>'}</span><span class="mi-tx"><span class="k">${u.k}</span><b>${esc(u.t)}</b></span><span class="mi-r">${all?'Пройден':`${u.lessons.length} ${plural(u.lessons.length,'урок','урока','уроков')}`}<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button></section>`;return}
    html+=`<section class="unit" style="--band:var(--b${ui%4})"><div class="band"><div><div class="k">${u.k}<span class="uprog">${dn}/${u.lessons.length}</span></div><h2>${u.t}</h2><p>${u.d}</p><div class="uline"><i style="width:${Math.round(dn/u.lessons.length*100)}%"></i></div></div><div class="band-side">${EXPANDED.has(ui)?`<button class="guide" data-col="${ui}" aria-label="Свернуть раздел">Свернуть</button>`:''}${u.lessons.some(l=>l.teach)?`<button class="guide" data-guide="${ui}">${IC.book.replace('class="i"','class="i" style="width:18px;height:18px;vertical-align:-4px"')} Правило</button>`:''}</div></div><div class="nodes">`;
    u.lessons.forEach((l,li)=>{const gi=LESSONS.indexOf(l),open=unlocked(gi),done=S.done[l.id]||0,cur=gi===curIdx;
      if(l.sub)html+=`<div class="path-sub ${li?'':'first'}"><span class="ps-k">Шаг ${l.sub.n} из 6</span><b>${esc(l.sub.t)}</b><span class="ps-l arm">${l.sub.letters}</span></div>`;
      const off=OFF[(gi)%OFF.length],upd=cur&&!done&&updGap(gi);
      if(upd)html+=`<div class="ciro-say upd">${mascot('happy','m-idle')}<div class="bubble"><p><b>Я обновился!</b> Здесь есть новенькое — пройдите этот урок.</p></div></div>`;
      html+=`<div class="node ${done?'done':open?'open':''} ${cur?'cur':''}" style="transform:translateX(${off}px)">${cur?`<span class="start-tag">${done?'Повтор':'Начать'}</span>${upd?'':`<span class="buddy ${off>0?'l':'r'}">${mascot('happy','m-idle')}</span>`}`:''}
        <button class="stone" data-l="${gi}" aria-label="${esc(l.t)}${open?'':' (закрыто)'}" ${l.g.length>2?'style="font-size:19px"':''}>${open||done?esc(l.g):'<svg class="i" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7a5 5 0 0 1 10 0v3h1v11H6V10zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>'}</button>
        <span class="lv">${[0,1,2].map(i=>`<b class="${i<Math.min(3,done)?'on':''}"></b>`).join('')}</span><span class="cap">${esc(l.t)}</span></div>`});
    html+='</div></section>'});
  html+=`</div><p class="homefoot">Есть идея или нашли ошибку? <a href="${CONTACT.url}" target="_blank" rel="noopener">Напишите @${CONTACT.tg}</a></p>`;
  $('#view').innerHTML=html;
  document.querySelectorAll('.stone').forEach(b=>b.onclick=()=>lessonSheet(+b.dataset.l));
  document.querySelectorAll('[data-guide]').forEach(b=>b.onclick=()=>guideSheet(+b.dataset.guide));
  $('#ciro').onclick=()=>{bounce($('#ciro .mascot'));say(g.hy)};
  $('#fact').onclick=()=>{S.factI=(S.factI+1)%FACTS.length;save();$('#fact-t').innerHTML=FACTS[S.factI];bounce($('#fact .mascot'))};
  $('#cta').onclick=()=>{if(curIdx<0)return startPractice();if(hearts()>0)startLesson(LESSONS[curIdx],false);else lessonSheet(curIdx)};
  const pr=$('#prac');if(pr)pr.onclick=startPractice;
  $('#phr-tile').onclick=()=>{location.hash='phrases'};
  wireNews();
  document.querySelectorAll('[data-exp]').forEach(b=>b.onclick=()=>{EXPANDED.add(+b.dataset.exp);const y=window.scrollY;renderLearn();window.scrollTo(0,y)});
  document.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>{EXPANDED.delete(+b.dataset.col);const y=window.scrollY;renderLearn();window.scrollTo(0,y)});
  setupJump();
  requestAnimationFrame(drawTrails);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if($('.nodes'))drawTrails()});
}
const EXPANDED=new Set();
let jumpObs=null;
function setupJump(){let fab=$('#jump');if(!fab){fab=document.createElement('button');fab.id='jump';fab.className='jump';fab.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>К уроку</span>';document.body.appendChild(fab)}
  if(jumpObs)jumpObs.disconnect();const cur=$('.node.cur');fab.hidden=true;if(!cur||!('IntersectionObserver' in window))return;
  fab.onclick=()=>cur.scrollIntoView({block:'center',behavior:'smooth'});
  let curIn=true,ctaIn=true,footIn=false;const foot=$('.homefoot');const upd=()=>{const onLearn=(location.hash.slice(1)||'learn')==='learn';fab.hidden=!onLearn||curIn||ctaIn||footIn};
  jumpObs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.target===cur){curIn=e.isIntersecting;fab.classList.toggle('up',e.boundingClientRect.top<0)}else if(e.target===foot)footIn=e.isIntersecting;else ctaIn=e.isIntersecting});upd()});jumpObs.observe(cur);const cta=$('#cta');if(cta)jumpObs.observe(cta);if(foot)jumpObs.observe(foot)}
window.addEventListener('hashchange',()=>{const f=$('#jump');if(f&&(location.hash.slice(1)||'learn')!=='learn')f.hidden=true});
function drawTrails(){document.querySelectorAll('.nodes').forEach(n=>{const old=n.querySelector('.trail');if(old)old.remove();const r=n.getBoundingClientRect();if(!r.width)return;
  const ss=[...n.querySelectorAll('.node')].map(nd=>{const b=nd.querySelector('.stone').getBoundingClientRect(),nb=nd.getBoundingClientRect(),tg=nd.querySelector('.start-tag');const top=tg?tg.getBoundingClientRect().top:b.top;
    return {x:b.left-r.left+b.width/2,top:top-r.top-5,bot:nb.bottom-r.top+5,d:nd.classList.contains('done')}});
  let d='';for(let i=1;i<ss.length;i++){const a=ss[i-1],b=ss[i];if(b.top-a.bot<8)continue;const my=(a.bot+b.top)/2,f=v=>v.toFixed(1);d+=`<path class="${a.d&&b.d?'d':''}" d="M${f(a.x)} ${f(a.bot)}C${f(a.x)} ${f(my)} ${f(b.x)} ${f(my)} ${f(b.x)} ${f(b.top)}"/>`}
  n.insertAdjacentHTML('afterbegin',`<svg class="trail" width="${r.width}" height="${r.height}" aria-hidden="true">${d}</svg>`)})}
let trT;
window.addEventListener('resize',()=>{clearTimeout(trT);trT=setTimeout(()=>{if($('.nodes'))drawTrails()},120)});
function sheet(inner,onClose){const root=$('#layer');const w=document.createElement('div');w.className='scrim';w.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${inner}</div>`;root.appendChild(w);document.body.classList.add('locked');
  const close=()=>{w.remove();if(!root.children.length)document.body.classList.remove('locked');document.removeEventListener('keydown',k);onClose&&onClose()};
  const k=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',k);
  w.onclick=e=>{if(e.target===w)close()};w.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
  const f=w.querySelector('.btn,[data-close]');f&&f.focus();return {el:w,close}}
function lessonSheet(i){const l=LESSONS[i],u=UNITS[l.unit],open=unlocked(i),done=S.done[l.id]||0,h=hearts();
  let body;
  if(!open)body=`<p>Этот урок откроется после предыдущих. Если вы уже уверены в этих темах, можно открыть все уроки в профиле.</p><button class="btn plain" data-close>Понятно</button>`;
  else if(h===0)body=`${ciroSay('sleep',`<p>Сердечки отдыхают. Новое появится через ${Math.ceil((REGEN-(Date.now()-S.heartsTs))/60000)} мин.</p><p>А пока давай потренируемся на пройденном — за это дам одно сердце.</p>`)}<button class="btn" id="prac">Тренировка · +1 сердце</button>`;
  else body=`${ciroSay(done?'wink':'happy',done?'<p>Повторим? Так материал запомнится надолго.</p>':'<div class="hy"><b>Սկսե՛նք!</b><span class="tr">Начнём!</span></div>')}<p style="margin:0;color:var(--muted)">${u.k} · ${esc(u.t)} · уровень урока ${Math.min(3,done)} из 3</p><p style="margin:0">${done?'Повторение тоже даёт XP.':'За прохождение: +10 XP, без ошибок ещё +5.'}</p><button class="btn" id="go">${done?'Повторить':'Начать'} · +10 XP</button>`;
  const s=sheet(`<div class="sheet-top"><h3>${esc(l.t)}</h3><button class="x" data-close aria-label="Закрыть">✕</button></div>${body}`);
  const go=s.el.querySelector('#go');if(go)go.onclick=()=>{s.close();startLesson(l,false)};
  const pr=s.el.querySelector('#prac');if(pr)pr.onclick=()=>{s.close();startPractice()};
}
function guideSheet(ui){const u=UNITS[ui];
  const content=u.alpha?`<div class="teach">${LETTERS.filter(l=>u.alpha===true||l.L===u.alpha).map(l=>`<p><b style="font-family:var(--f-display);font-size:22px">${l.U}${l.U!==l.k?' '+l.k:''}</b> — «${esc(l.s)}». ${esc(tipOf(l))}</p>`).join('')}</div>`
    :u.lessons.map(l=>`<h4 style="margin:6px 0 0">${esc(l.t)}</h4><div class="teach">${l.teach}</div>`).join('');
  sheet(`<div class="sheet-top"><h3>${esc(u.t)}</h3><button class="x" data-close aria-label="Закрыть">✕</button></div>${content}<button class="btn plain" data-close>Закрыть</button>`)}
