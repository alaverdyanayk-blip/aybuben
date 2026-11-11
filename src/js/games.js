/* Мини-игры. */
const ABC=['ա','բ','գ','դ','ե','զ','է','ը','թ','ժ','ի','լ','խ','ծ','կ','հ','ձ','ղ','ճ','մ','յ','ն','շ','ո','չ','պ','ջ','ռ','ս','վ','տ','ր','ց','ու','փ','ք','և','օ','ֆ'];
const GAMES=[
 {id:'fall',t:'Буквопад',d:'Буква или слово падает сверху — ответьте, пока не коснулось земли. Каждые 10 верных — золотой абрикос и лишняя жизнь.',g:'Ք',c:'--b0',unit:'очков',modes:[['letters','Буквы'],['words','Слова']]},
 {id:'sprint',t:'Спринт',d:'60 секунд: верно ли переведено слово? 5 верных подряд — очки ×2, 10 подряд — ×3.',g:'Ճ',c:'--b1',unit:'очков'},
 {id:'echo',t:'Эхо',d:'Циро произносит слово — выберите, как оно пишется. 10 слов, можно переслушать и включить медленно.',g:'Լս',c:'--b2',unit:'из 10',audio:true},
 {id:'memo',t:'Найди пары',d:'Переворачивайте карточки и собирайте пары. Чем меньше ходов, тем больше звёзд.',g:'Զ',c:'--b3',low:true,unit:'ходов',modes:[['w6','6 пар'],['w8','8 пар'],['letters','Буквы и звуки']]},
 {id:'odd',t:'Лишнее слово',d:'Три слова из одной темы, одно — чужое. Найдите лишнее. 10 раундов.',g:'Թե',c:'--gold-deep',unit:'из 10'},
 {id:'spell',t:'Слово по буквам',d:'Угадайте слово по переводу, нажимая армянские буквы. 6 ошибок на слово, есть подсказка.',g:'Գր',c:'--b1',unit:'слов из 5'}
];
let G=null;
function gameMax(){if(S.unlockAll)return 6;let m=1;for(let n=1;n<=6;n++){const i=LESSONS.findIndex(l=>l.id===`ab${n}a`);if(i>=0&&unlocked(i))m=n}return m}
function recKey(id,mode){if(id==='memo')return mode&&mode!=='w6'?'memo_'+mode:'memo';if(id==='fall')return mode==='words'?'fall_words':'fall';return id}
function defMode(g){return g.modes?(((S.gameMode||{})[g.id])||g.modes[0][0]):null}
/* наборы слов */
function setLabel(st){return st.k==='abc'?`буквы 1–${st.lvl}`:st.k==='all'?'все слова':(THEMES.find(t=>t.id===st.id)||{t:'тема'}).t}
function gWords(){const st=G.set;if(st.k==='abc')return wordsUpTo(st.lvl);if(st.k==='all')return WORDS;const th=THEMES.find(t=>t.id===st.id);return th?th.words:WORDS}
function gLetters(){return G.set.k==='abc'?lettersUpTo(G.set.lvl):LETTERS}
function usesWords(){const g=G.g;return !((g.id==='fall'||g.id==='memo')&&G.mode==='letters')}
function distinctMeanings(ws){const ms=[];ws.forEach(w=>{if(!ms.some(m=>clash(m,w.m)))ms.push(w.m)});return ms.length}
function oddThemes(){const st=G.set;const ok=w=>st.k!=='abc'||w.L<=st.lvl;return THEMES.map(t=>({t,ws:t.words.filter(ok)})).filter(x=>distinctMeanings(x.ws)>=3)}
function poolCheck(){const id=G.g.id;
  if(!usesWords())return gLetters().length>=4?null:'Для этой игры нужно хотя бы 4 буквы.';
  const ws=gWords();
  if(id==='echo'){const a=ws.filter(w=>hasAudio(w.a));return a.length>=4?null:`В этом наборе пока мало озвученных слов (${a.length}). Выберите другой набор.`}
  if(id==='odd'){const th=oddThemes();if(G.set.k==='theme'&&!th.some(x=>x.t.id===G.set.id))return 'В этой теме мало слов.';return th.length>=2?null:'Откройте больше букв или выберите «Все слова» — для этой игры нужны слова из разных тем.'}
  if(id==='spell'){return ws.filter(w=>w.u.length<=9).length>=5?null:'В этом наборе мало слов для игры.'}
  return distinctMeanings(ws)>=(id==='memo'?(G.mode==='w8'?8:6):4)?null:'В этом наборе мало слов. Выберите другой набор или «Все слова».'}
function renderGames(){const mx=gameMax();
  $('#view').innerHTML=`<div style="display:flex;flex-direction:column;gap:16px"><p class="intro">Шесть игр на буквы, слова и слух. Перед игрой выберите набор: открытые разделы алфавита (сейчас 1–${mx}), любую из ${THEMES.length} тем или все слова. Очки идут в XP, цель дня и серию.</p>
  <div class="games">${GAMES.map(g=>{const st=S.games[recKey(g.id,defMode(g))];return `<button class="gcard" data-g="${g.id}" style="--c:var(${g.c})"><span class="gart arm">${g.g}</span><span class="gtx"><b>${g.t}${g.isNew?'':''}</b><span>${g.d}</span><span class="gbest">${st?`Рекорд: ${st.best} ${g.unit} · игр: ${st.plays}`:'Ещё не играли'}</span></span></button>`}).join('')}</div></div>`;
  document.querySelectorAll('.gcard').forEach(b=>b.onclick=()=>openGame(b.dataset.g));
}
function openGame(id){if($('#game'))return;const g=GAMES.find(x=>x.id===id),mx=gameMax();
  let set=S.gameSet&&S.gameSet.k?Object.assign({},S.gameSet):{k:'abc',lvl:mx};
  if(set.k==='abc')set.lvl=Math.min(set.lvl||mx,mx);if(set.k==='theme'&&!THEMES.some(t=>t.id===set.id))set={k:'abc',lvl:mx};
  G={g,set,mode:defMode(g),timers:[],raf:0,miss:[]};
  const el=document.createElement('div');el.className='lesson';el.id='game';el.style.setProperty('--c',`var(${g.c})`);
  el.innerHTML=`<div class="l-top"><button class="x" id="gquit" aria-label="Выйти из игры">✕</button><b class="gtitle">${g.t}</b><div class="gstat" id="gstat"></div></div><div class="l-body"><div class="ex" id="gbody"></div></div><div class="l-foot" id="gfoot"></div>`;
  $('#layer').appendChild(el);document.body.classList.add('locked');$('#gquit').onclick=closeGame;gameIntro()}
function gStop(){if(!G)return;cancelAnimationFrame(G.raf);G.timers.forEach(t=>{clearTimeout(t);clearInterval(t)});G.timers=[];G.answer=null;G.key=null;G.replay=null}
function closeGame(){gStop();const el=$('#game');el&&el.remove();if(!$('#layer').children.length)document.body.classList.remove('locked');G=null;route()}
const gfoot=h=>{$('#gfoot').className='l-foot';$('#gfoot').innerHTML=`<div class="foot-in">${h}</div>`};
const gstat=h=>{$('#gstat').innerHTML=h};
const PLAY={};
function gameIntro(){gStop();const g=G.g,mx=gameMax(),rk=recKey(g.id,G.mode),st=S.games[rk];gstat('');
  const sel=(k,v)=>G.set.k===k&&(k==='abc'?G.set.lvl===v:k==='theme'?G.set.id===v:true);
  const words=usesWords();
  const err=poolCheck();
  const cnt=words?(g.id==='echo'?`${gWords().filter(w=>hasAudio(w.a)).length} озвученных слов`:`${gWords().length} ${plural(gWords().length,'слово','слова','слов')}`):`${gLetters().length} букв`;
  $('#gbody').innerHTML=`<div class="end gintro">${mascot('happy','m-idle')}<h2 style="color:var(--c)">${g.t}</h2><p style="margin:0">${g.d}</p>
   ${g.modes?`<div class="gpick"><span class="label">Режим</span><div class="chips">${g.modes.map(([v,t])=>`<button class="chip2" data-mode="${v}" aria-pressed="${G.mode===v}">${t}</button>`).join('')}</div></div>`:''}
   <div class="gpick"><span class="label">${words?'Слова из букв разделов':'Буквы разделов'}</span><div class="chips">${Array.from({length:mx},(_,i)=>i+1).map(n=>`<button class="chip2 num" data-abc="${n}" aria-pressed="${sel('abc',n)}" aria-label="Разделы 1–${n}">1–${n}</button>`).join('')}</div></div>
   ${words?`<div class="gpick"><span class="label">Или тема</span><div class="chips"><button class="chip2" data-all="1" aria-pressed="${sel('all')}">Все слова</button>${THEMES.map(t=>`<button class="chip2" data-th="${t.id}" aria-pressed="${sel('theme',t.id)}">${esc(t.t)}</button>`).join('')}</div></div>`:''}
   <p class="note">Набор: ${setLabel(G.set)} · ${cnt}${st?` · рекорд: ${st.best} ${g.unit}`:''}</p>${err?`<p class="gwarn">${err}</p>`:''}</div>`;
  const keep=()=>{S.gameSet=G.set;S.gameMode=S.gameMode||{};if(G.mode)S.gameMode[g.id]=G.mode;save();gameIntro()};
  document.querySelectorAll('#gbody [data-mode]').forEach(b=>b.onclick=()=>{G.mode=b.dataset.mode;keep()});
  document.querySelectorAll('#gbody [data-abc]').forEach(b=>b.onclick=()=>{G.set={k:'abc',lvl:+b.dataset.abc};keep()});
  document.querySelectorAll('#gbody [data-th]').forEach(b=>b.onclick=()=>{G.set={k:'theme',id:b.dataset.th};keep()});
  document.querySelectorAll('#gbody [data-all]').forEach(b=>b.onclick=()=>{G.set={k:'all'};keep()});
  gfoot(`<span></span><button class="btn" id="gplay" ${err?'disabled':''}>Играть</button>`);if(!err){$('#gplay').onclick=()=>{G.miss=[];PLAY[g.id]()};$('#gplay').focus()}}
function missWord(w){if(w&&!G.miss.some(x=>x.a===w.a))G.miss.push(w)}
function missLetter(l){if(l&&!G.miss.some(x=>x.k===l.k))G.miss.push(l)}
function reviewHtml(){const m=G.miss.slice(0,10);if(!m.length)return '';
  return `<div class="review"><b>Повторим</b>${m.map(x=>x.U?`<div class="rv"><span class="rv-a gl">${x.U}${x.U!==x.k?' '+x.k:''}</span><span class="rv-m">«${esc(x.s)}»</span></div>`:`<div class="rv">${spk(x.a,'sm')}<span class="rv-a">${esc(x.a)}</span><span class="rv-m"><b>${esc(x.m)}</b> · «${esc(x.r)}»</span></div>`).join('')}</div>`}
function starsHtml(n){return `<div class="stars" aria-label="${n} из 3 звёзд">${[1,2,3].map(i=>`<span class="${i<=n?'on':''}">${IC.star}</span>`).join('')}</div>`}
function gameOver(score,xp,title,o={}){gStop();track('game',G.g.id+(G.mode?'-'+G.mode:''));const g=G.g,rk=recKey(g.id,G.mode),st=S.games[rk]||{best:null,plays:0};
  const rec=st.best==null||(g.low?score<st.best:score>st.best);if(rec)st.best=score;st.plays++;S.games[rk]=st;
  if(o.stars===3)S.memo3=true;
  const lvBefore=level();if(xp>0)addXP(xp);const newA=checkAch();save();
  if(xp>0)sWin();if(rec&&st.plays>1)confetti();
  gstat('');
  const line=rec&&st.plays>1?'Новый рекорд! <b class="arm">Կեցցե՛ս!</b>':st.plays===1?'Первая игра — и уже очки! Сыграем ещё?':xp>0?'Неплохо! Рекорд — '+st.best+'. Догонишь?':'Ничего, в следующий раз получится. Попробуем ещё?';
  $('#gbody').innerHTML=`<div class="end"><span id="go-ciro">${mascot(xp>0?(rec&&st.plays>1?'cheer':'happy'):'sad',xp>0?'m-jump':'m-shake')}</span><h2 style="color:var(--c)">${title||'Игра окончена'}</h2>${o.stars?starsHtml(o.stars):''}<div class="bubble">${line}${o.note?`<p style="margin-top:6px">${o.note}</p>`:''}</div>${levelUps(lvBefore)}
   <div class="tiles3"><div class="stat"><div class="h">Счёт</div><div class="v">${score}</div></div><div class="stat" style="--c:var(--b3)"><div class="h">Рекорд</div><div class="v">${st.best}</div></div><div class="stat" style="--c:var(--gold-deep)"><div class="h">XP</div><div class="v">+${xp}</div></div></div>
   ${reviewHtml()}
   ${newA.length?`<div><p style="margin:0 0 8px;font-weight:700">Новое достижение</p><div class="achv-new">${newA.map(a=>`<span class="chip">${IC[a.ic]} ${esc(a.t)}</span>`).join('')}</div></div>`:''}</div>`;
  gfoot(`<div class="gamefoot two"><button class="btn plain" id="gout">Выйти</button><button class="btn plain" id="gset">Настройки</button></div><button class="btn" id="gagain">Ещё раз</button>`);
  $('#gout').onclick=closeGame;$('#gset').onclick=gameIntro;$('#gagain').onclick=()=>{G.miss=[];PLAY[g.id]()};$('#gagain').focus();wireWear('#go-ciro')}
/* варианты ответов: смыслы без синонимов */
function meaningOpts(w,pool){const out=[w.m];for(const x of shuffle(pool.length>=8?pool:WORDS)){if(out.length>=4)break;if(!out.some(m=>clash(m,x.m)))out.push(x.m)}
  for(const x of shuffle(WORDS)){if(out.length>=4)break;if(!out.some(m=>clash(m,x.m)))out.push(x.m)}return shuffle(out)}
function spellingOpts(w,pool){const base=(pool.length>=8?pool:WORDS).filter(x=>x.a!==w.a&&!clash(x.m,w.m));
  const near=base.slice().sort((a,b)=>Math.abs(a.u.length-w.u.length)-Math.abs(b.u.length-w.u.length)+(Math.random()-.5)*1.5);
  const out=[w.a];for(const x of near){if(out.length>=4)break;if(!out.includes(x.a))out.push(x.a)}return shuffle(out)}
/* Буквопад */
PLAY.fall=function(){gStop();const words=G.mode==='words',lp=gLetters(),wp=gWords().filter(w=>w.a.length<=10);
  let score=0,lives=3,speed=words?26:42,cur=null,last=null,y=0,busy=true,prev=0,streak=0,mult=1,hits=0,gold=false,nextGold=false;
  $('#gbody').innerHTML=`<div class="fall-area" id="farea"><div class="faller ${words?'word':''}" id="fl"></div><div class="ground"></div><div class="ftoast" id="ftoast"></div></div>`;
  const area=$('#farea'),fl=$('#fl');
  const stat=()=>gstat(`${mult>1?`<span class="pill mult">×${mult}</span>`:''}<span class="pill">${IC.star}${score}</span><span class="pill heart">${IC.heart}${lives}</span>`);
  const toast=t=>{const e=$('#ftoast');e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on')};
  function spawn(){if(lives<=0)return gameOver(score,Math.min(20,Math.floor(score/2)),`${score} ${plural(score,'очко','очка','очков')}`,{note:hits?`Поймано: ${hits}. Лучший множитель: ×${G.bestMult||1}.`:''});
    gold=nextGold;nextGold=false;
    if(words){const c=wp.filter(w=>w!==last);cur=pick(c.length?c:wp);last=cur;fl.textContent=cur.a;G.correct=cur.m;G.opts=meaningOpts(cur,wp)}
    else{const c=lp.filter(l=>l!==last);cur=pick(c.length?c:lp);last=cur;const up=cur.U.length===1&&cur.U!==cur.k&&Math.random()<.5;fl.textContent=up?cur.U:cur.k;G.correct=cur.s;G.opts=shuffle([cur.s,...sndOpts(cur,lp)])}
    fl.className='faller'+(words?' word':'')+(gold?' gold':'');
    y=-8;fl.style.left=(words?30+Math.random()*40:14+Math.random()*72)+'%';fl.style.transform=`translateY(${y}px)`;
    gfoot(`<div class="opts gopts ${words?'wopts':''}">${G.opts.map((o,i)=>`<button class="opt" data-i="${i}"><span class="k">${i+1}</span>${esc(o)}</button>`).join('')}</div>`);
    document.querySelectorAll('#gfoot .opt').forEach(b=>b.onclick=()=>G.answer&&G.answer(+b.dataset.i));
    stat();busy=false;prev=0}
  function miss(i){busy=true;lives--;streak=0;mult=1;sBad();fl.classList.add('miss');words?missWord(cur):missLetter(cur);
    document.querySelectorAll('#gfoot .opt').forEach((b,j)=>{b.disabled=true;if(G.opts[j]===G.correct)b.classList.add('good');else if(j===i)b.classList.add('bad')});
    stat();G.timers.push(setTimeout(spawn,950))}
  G.answer=i=>{if(busy)return;if(G.opts[i]===G.correct){busy=true;hits++;streak++;mult=streak>=10?3:streak>=5?2:1;G.bestMult=Math.max(G.bestMult||1,mult);score+=mult;
      if(gold&&lives<5){lives++;toast('+1 жизнь')}else if(gold){score+=3;toast('+3 очка')}
      if(hits%10===0)nextGold=true;if(streak===5||streak===10)toast(`Серия ${streak} · ×${mult}`);
      speed+=words?2.5:4.5;tone([[560+Math.min(score,24)*22,.09]]);fl.classList.add('hit');stat();
      if(words&&S.voice!==false)say(cur.a);G.timers.push(setTimeout(spawn,words?420:260))}else miss(i)};
  function loop(t){if(!G)return;if(!busy&&!document.hidden){if(!prev)prev=t;const dt=Math.min(.05,(t-prev)/1000);prev=t;y+=speed*dt;const H=area.clientHeight-fl.offsetHeight-12;if(y>=H){y=H;miss(-1)}fl.style.transform=`translateY(${y}px)`}else prev=0;G.raf=requestAnimationFrame(loop)}
  G.bestMult=1;spawn();G.raf=requestAnimationFrame(loop)};
/* Спринт */
PLAY.sprint=function(){gStop();const pool=gWords();const T=60;let score=0,combo=0,best=0,el=0,cur,truth,answered=0,right=0;
  $('#gbody').innerHTML=`<div class="timebar"><i id="tb"></i></div><div class="sprint" id="spr"><div class="big word" id="sw"></div><div class="eq">это значит</div><div class="big ru" id="sm"></div><div class="combo" id="sc" style="text-align:center"></div></div>`;
  gfoot(`<div class="gamefoot"><button class="btn bad gbig" id="sno">✕ Неверно</button><button class="btn good gbig" id="syes">✓ Верно</button></div>`);
  const left=()=>Math.max(0,Math.ceil(T-el));
  const mult=()=>combo>=10?3:combo>=5?2:1;
  const stat=()=>gstat(`${mult()>1?`<span class="pill mult">×${mult()}</span>`:''}<span class="pill">${IC.star}${score}</span><span class="pill" style="color:var(--c)">${IC.bolt}${left()} с</span>`);
  function nextQ(){cur=pick(pool);if(S.voice!==false)setTimeout(()=>{if(G&&G.answer)say(cur.a)},260);truth=Math.random()<.5;const o=pool.filter(w=>!clash(w.m,cur.m));const o2=o.length?o:WORDS.filter(w=>!clash(w.m,cur.m));$('#sw').textContent=cur.a;$('#sm').textContent=truth?cur.m:pick(o2).m}
  G.answer=v=>{if(el>=T)return;answered++;const ok=v===truth,sp=$('#spr');
    if(ok){right++;combo++;best=Math.max(best,combo);score+=mult();tone([[700,.07]])}else{combo=0;sBad();missWord(cur)}
    sp.classList.remove('ok','no');void sp.offsetWidth;sp.classList.add(ok?'ok':'no');
    $('#sc').innerHTML=ok?(combo>=5?`Серия ${combo} · очки ×${mult()}`:''):`<span style="color:var(--bad)"><span class="arm">${esc(cur.a)}</span> — ${esc(cur.m)}</span>`;
    stat();nextQ()};
  $('#sno').onclick=()=>G.answer&&G.answer(false);$('#syes').onclick=()=>G.answer&&G.answer(true);
  const iv=setInterval(()=>{if(document.hidden)return;el+=.1;const tb=$('#tb');if(tb)tb.style.width=(Math.max(0,T-el)/T*100)+'%';stat();
    if(el>=T)gameOver(score,Math.min(20,Math.floor(score/3)),`${score} ${plural(score,'очко','очка','очков')}`,{note:`Ответов: ${answered}, верных: ${right}. Лучшая серия: ${best}.`})},100);
  G.timers.push(iv);stat();nextQ()};
/* Эхо */
PLAY.echo=function(){gStop();const all=gWords(),pool=all.filter(w=>hasAudio(w.a));const N=Math.min(10,pool.length);const words=sample(pool,N);let round=0,right=0,streak=0,best=0;
  function next(){if(round>=N)return gameOver(right,right,`Верно ${right} из ${N}`,{note:best>=3?`Лучшая серия: ${best}.`:''});
    const w=words[round],opts=spellingOpts(w,all);G.cur=w;G.opts=opts;G.done=false;
    gstat(`<span class="pill">${round+1}/${N}</span><span class="pill">${IC.star}${right}</span>`);
    $('#gbody').innerHTML=`<h2>Что сказал Циро?</h2><div class="big"><div class="listen-row">${spk(w.a,'huge')}${spkSlow(w.a)}</div></div><div class="opts">${opts.map((o,i)=>`<button class="opt arm" data-i="${i}"><span class="k">${i+1}</span>${esc(o)}</button>`).join('')}</div>`;
    gfoot(`<span style="color:var(--muted)">Пробел — послушать ещё раз</span><span></span>`);
    document.querySelectorAll('#gbody .opt').forEach(b=>b.onclick=()=>G.answer&&G.answer(+b.dataset.i));
    G.replay=()=>say(w.a);G.timers.push(setTimeout(()=>say(w.a),150))}
  G.answer=i=>{if(G.done)return;G.done=true;const w=G.cur,ok=G.opts[i]===w.a;
    document.querySelectorAll('#gbody .opt').forEach((b,j)=>{b.disabled=true;if(G.opts[j]===w.a)b.classList.add('good');else if(j===i)b.classList.add('bad')});
    if(ok){right++;streak++;best=Math.max(best,streak);sGood()}else{streak=0;sBad();missWord(w)}round++;
    $('#gfoot').className='l-foot '+(ok?'good':'bad');
    $('#gfoot').innerHTML=`<div class="foot-in"><div class="fb">${mascot(ok?'happy':'sad',ok?'m-jump':'m-shake')}<div><div class="t">${ok?pick(PRAISE)[0]:'Не совсем'}</div><div class="d">${spk(w.a,'sm')} <span class="a">${esc(w.a)}</span> — ${esc(w.m)} · «${esc(w.r)}»</div></div></div><button class="btn ${ok?'good':'bad'}" id="gnext">${round>=N?'Итоги':'Дальше'}</button></div>`;
    $('#gnext').onclick=next;$('#gnext').focus()};
  next()};
/* Найди пары */
PLAY.memo=function(){gStop();const letters=G.mode==='letters',P=G.mode==='w8'?8:6;let items=[];
  if(letters){for(const l of shuffle(gLetters())){if(items.length>=P)break;if(!items.some(x=>x.s===l.s))items.push(l)}}
  else{for(const w of shuffle(gWords())){if(items.length>=P)break;if(!items.some(x=>clash(x.m,w.m)||x.a===w.a))items.push(w)}}
  const cards=shuffle(items.flatMap((w,i)=>letters?[{p:i,t:w.U+(w.U!==w.k&&w.U.length===1?' '+w.k:''),arm:1,glyph:1},{p:i,t:w.s,arm:0}]:[{p:i,t:w.a,arm:1},{p:i,t:w.m,arm:0}]));
  let open=[],moves=0,found=0,lock=false;const t0=Date.now();
  $('#gbody').innerHTML=`<div class="memo ${P===8?'m8':''}">${cards.map((c,i)=>`<button class="mcard" data-i="${i}" aria-label="Карточка ${i+1}"><span class="mf back arm">Ա</span><span class="mf face ${c.arm?'arm':''} ${c.glyph?'glyph':''} ${c.t.length>8?'long':''}">${esc(c.t)}</span></button>`).join('')}</div>`;
  const stat=()=>{const s=Math.floor((Date.now()-t0)/1000);gstat(`<span class="pill">${IC.target}${moves}</span><span class="pill">${found}/${items.length}</span><span class="pill">${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}</span>`)};
  G.timers.push(setInterval(stat,1000));stat();
  gfoot(`<span style="color:var(--muted)">Найдите ${items.length} пар: ${letters?'буква и её звук':'слово и перевод'}</span><span></span>`);
  G.memoFlip=(b)=>{if(lock||b.classList.contains('up')||b.classList.contains('done'))return;b.classList.add('up');open.push(b);{const c=cards[b.dataset.i];if(!letters&&c.arm&&S.voice!==false&&hasAudio(c.t))say(c.t);else tone([[520,.05]])}
    if(open.length<2)return;moves++;stat();lock=true;const [a,c]=open;open=[];
    if(cards[a.dataset.i].p===cards[c.dataset.i].p){G.timers.push(setTimeout(()=>{a.classList.add('done');c.classList.add('done');found++;stat();tone([[760+found*50,.12]]);lock=false;
        if(found===items.length){const stars=moves<=items.length+2?3:moves<=Math.round(items.length*1.6)+2?2:1;
          G.timers.push(setTimeout(()=>gameOver(moves,stars===3?15:stars===2?12:8,`Все пары за ${moves} ${plural(moves,'ход','хода','ходов')}`,{stars,note:stars<3?`Для трёх звёзд — не больше ${items.length+2} ходов.`:''}),500))}},300))}
    else{const x=items[cards[a.dataset.i].p],y=items[cards[c.dataset.i].p];if(letters){missLetter(x);missLetter(y)}else{missWord(x);missWord(y)}
      G.timers.push(setTimeout(()=>{a.classList.remove('up');c.classList.remove('up');lock=false},850))}};
  document.querySelectorAll('.mcard').forEach(b=>b.onclick=()=>G.memoFlip(b));
  G.miss=[]};
PLAY.odd=function(){gStop();const th=oddThemes();const N=10;let round=0,right=0;const used=new Set();
  function makeRound(){const mains=G.set.k==='theme'?th.filter(x=>x.t.id===G.set.id):th;const M=pick(mains);
    const three=[];for(const w of shuffle(M.ws)){if(three.length>=3)break;if(!three.some(x=>clash(x.m,w.m)))three.push(w)}
    const adjM=M.t.id==='adj'||M.t.id==='colors';
    const others=th.filter(x=>x.t.id!==M.t.id&&!(adjM&&(x.t.id==='adj'||x.t.id==='colors'))).flatMap(x=>x.ws.map(w=>({w,t:x.t}))).filter(o=>!M.t.words.includes(o.w)&&!three.some(x=>clash(x.m,o.w.m))&&!(adjM&&ODD_ADJ.has(o.w.a)));
    const fresh=others.filter(o=>!used.has(o.w.a));const O=pick(fresh.length?fresh:others);if(!O||three.length<3)return null;used.add(O.w.a);
    return {M:M.t,O:O.t,odd:O.w,items:shuffle([...three.map(w=>({w,t:M.t})),{w:O.w,t:O.t}])}}
  function next(){if(round>=N)return gameOver(right,right,`Верно ${right} из ${N}`);
    let R=null;for(let i=0;i<20&&!R;i++)R=makeRound();if(!R)return gameOver(right,right,`Верно ${right} из ${round}`);G.R=R;G.done=false;
    gstat(`<span class="pill">${round+1}/${N}</span><span class="pill">${IC.star}${right}</span>`);
    $('#gbody').innerHTML=`<h2>Какое слово лишнее?</h2><p class="sub" style="margin:0;text-align:left">Три слова — из одной темы, одно — из другой.</p><div class="opts odd">${R.items.map((x,i)=>`<button class="opt arm" data-i="${i}"><span class="k">${i+1}</span><span class="ow">${esc(x.w.a)}</span><span class="om">${esc(x.w.m)}<i>${esc(x.t.t)}</i></span></button>`).join('')}</div>`;
    gfoot(`<span style="color:var(--muted)">Подсказка: подумайте, о чём три слова</span><span></span>`);
    document.querySelectorAll('#gbody .opt').forEach(b=>b.onclick=()=>G.answer&&G.answer(+b.dataset.i))}
  G.answer=i=>{if(G.done)return;G.done=true;const R=G.R,ok=R.items[i].w===R.odd;
    document.querySelectorAll('#gbody .opt').forEach((b,j)=>{b.disabled=true;b.classList.add('reveal');if(R.items[j].w===R.odd)b.classList.add('good');else if(j===i)b.classList.add('bad')});
    if(ok){right++;sGood()}else{sBad();missWord(R.odd);missWord(R.items[i].w)}round++;
    if(S.voice!==false)G.timers.push(setTimeout(()=>say(R.odd.a),420));
    $('#gfoot').className='l-foot '+(ok?'good':'bad');
    $('#gfoot').innerHTML=`<div class="foot-in"><div class="fb">${mascot(ok?'happy':'think',ok?'m-jump':'')}<div><div class="t">${ok?pick(PRAISE)[0]:'Не совсем'}</div><div class="d">Лишнее — <span class="a">${esc(R.odd.a)}</span> (${esc(R.odd.m)}), тема «${esc(R.O.t)}». Остальные — «${esc(R.M.t)}».</div></div></div><button class="btn ${ok?'good':'bad'}" id="gnext">${round>=N?'Итоги':'Дальше'}</button></div>`;
    $('#gnext').onclick=next;$('#gnext').focus()};
  next()};
/* Слово по буквам */
PLAY.spell=function(){gStop();const pool=gWords().filter(w=>w.u.length<=9);const words=sample(pool,5);
  const lvl=G.set.k==='abc'?G.set.lvl:6;const need=new Set(words.flatMap(w=>w.u));const keys=ABC.filter(k=>BY[k].L<=lvl||need.has(k));let round=0,solved=0;
  function startRound(){if(round>=words.length)return gameOver(solved,solved*3,`Угадано ${solved} из ${words.length}`);
    const w=words[round];let errs=0,done=false,hinted=0;const shown=new Set(),tried=new Set();
    gstat(`<span class="pill">${round+1}/${words.length}</span><span class="pill">${IC.star}${solved}</span>`);
    $('#gbody').innerHTML=`<h2>Напишите слово</h2><div class="big ru" style="min-height:80px">${esc(w.m)}</div><div class="sub">звучит «${esc(w.r)}»</div>
      <div class="slots" id="slots"></div><div class="tries" id="tries"></div><div class="kbd">${keys.map(k=>`<button class="key" data-k="${k}">${k}</button>`).join('')}</div>`;
    const draw=(fail)=>{$('#slots').innerHTML=w.u.map(u=>`<span class="slot ${shown.has(u)?'filled':''} ${fail&&!shown.has(u)?'miss':''}">${shown.has(u)||fail?u:''}</span>`).join('');$('#tries').innerHTML=Array.from({length:6},(_,i)=>`<b class="${i<6-errs?'':'off'}"></b>`).join('')};
    const foot=()=>gfoot(`<span style="color:var(--muted)">Ошибок осталось: ${6-errs}</span><button class="btn plain sm" id="ghint" ${errs>=5?'disabled':''}>Подсказка · −1</button>`);
    const bindHint=()=>{const h=$('#ghint');if(h)h.onclick=()=>{if(done||errs>=5)return;const rest=w.u.filter(u=>!shown.has(u));if(!rest.length)return;const k=pick(rest);errs++;hinted++;press(k,true)}};
    function press(k,hint){if(done)return;const b=$(`.key[data-k="${k}"]`);if(!hint&&(!b||b.disabled||tried.has(k)))return;tried.add(k);if(b)b.disabled=true;
      if(w.u.includes(k)){shown.add(k);if(b)b.classList.add('good');tone([[640,.07]])}else{errs++;if(b)b.classList.add('bad');sBad()}
      const win=w.u.every(u=>shown.has(u)),lose=errs>=6;draw(lose&&!win);
      if(win||lose){done=true;if(win){solved++;sGood()}else missWord(w);round++;if(S.voice!==false)G.timers.push(setTimeout(()=>say(w.a),300));
        $('#gfoot').className='l-foot '+(win?'good':'bad');
        $('#gfoot').innerHTML=`<div class="foot-in"><div class="fb">${mascot(win?'happy':'sad',win?'m-jump':'m-shake')}<div><div class="t">${win?(hinted?'Угадали с подсказкой':'Угадали!'):'Не вышло'}</div><div class="d">${spk(w.a,'sm')} <span class="a">${esc(w.a)}</span> — ${esc(w.m)}</div></div></div><button class="btn ${win?'good':'bad'}" id="gnext">${round>=words.length?'Итоги':'Дальше'}</button></div>`;
        $('#gnext').onclick=startRound;$('#gnext').focus()}
      else{foot();bindHint()}}
    G.key=k=>press(k,false);
    draw(false);foot();bindHint();
    document.querySelectorAll('.key').forEach(b=>b.onclick=()=>G.key&&G.key(b.dataset.k))}
  startRound()};
document.addEventListener('keydown',e=>{if(!G||$('.scrim'))return;const id=G.g.id;
  if(['fall','echo','odd'].includes(id)&&G.answer&&/^[1-4]$/.test(e.key)&&!G.done)G.answer(+e.key-1);
  else if(id==='echo'&&e.key===' '&&G.replay){e.preventDefault();G.replay()}
  else if(id==='sprint'&&G.answer&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();G.answer(e.key==='ArrowRight')}
  else if(id==='spell'&&G.key&&e.key.length===1&&!e.ctrlKey&&!e.metaKey)G.key(e.key.toLowerCase());
  else if(e.key==='Enter'){const b=$('#gnext')||$('#gplay')||$('#gagain');if(b&&!b.disabled&&document.activeElement!==b){e.preventDefault();b.click()}}});
