/* Тест на уровень: для тех, кто уже знает часть букв. Идёт по шагам алфавита (6 шагов), на каждом
   три вопроса по буквам и одно слово. Шаг засчитан, если ошибок не больше одной; на первом незачтённом шаге тест
   заканчивается. Засчитанные шаги отмечаются пройденными (только добавляются — прогресс не стирается).
   Сердца не тратятся, память повторений не трогается. */
const PL_STEP=4,PL_MISS=2;
function placeItems(){const items=[];
  GROUPS.forEach((g,i)=>{const n=i+1,grp=LETTERS.filter(l=>l.L===n),lp=lettersUpTo(n),pool=wordsUpTo(n),fresh=pool.filter(w=>w.L===n);
    const ls=sample(grp,3);while(ls.length<3)ls.push(pick(grp));
    const q=[qL2S(ls[0],lp,true),qS2L(ls[1],lp,true),qL2S(ls[2],lp,true)];
    const w=pick(fresh.length?fresh:pool);if(w)q.push(qSay(w));else q.push(qS2L(pick(grp),lp,true));
    q.forEach(x=>{x.step=n;delete x.item;items.push(x)})});
  return items}
function startPlacement(){if($('#lesson'))return;track('place','start');
  const items=[{type:'teach',title:'Проверим, что вы уже знаете',html:`<p>Покажу буквы и слова — от простых к сложным. Ошибки не страшны: сердца не тратятся.</p><p>Где начнёте путаться, там и остановимся. Всё, что вы уже знаете, отмечу пройденным — учиться начнёте с нового.</p><p class="note">Около 3–5 минут, до ${GROUPS.length*PL_STEP} вопросов.</p>`},...placeItems()];
  startLesson({id:'place',t:'Тест на уровень',place:{res:{}},gen:()=>items},true);
  LS.total=items.length-1}
/* Ответ в тесте: ошибка не повторяется в конце, а второй промах на шаге завершает тест */
function placeAnswer(ex,ok){const r=LS.lesson.place.res,st=r[ex.step]=r[ex.step]||{ok:0,bad:0};ok?st.ok++:st.bad++;LS.done++;
  if(st.bad>=PL_MISS)LS.queue=[]}
function placeLevel(res){let k=0;for(let n=1;n<=GROUPS.length;n++){const r=res[n];if(r&&r.bad<PL_MISS&&r.ok+r.bad>=PL_STEP)k=n;else break}return k}
function finishPlacement(){LS.state='end';const k=placeLevel(LS.lesson.place.res);
  let marked=0;
  LESSONS.forEach(l=>{const m=/^ab(\d)[abw]$/.exec(l.id);if(m&&+m[1]<=k&&!S.done[l.id]){S.done[l.id]=1;marked++}});
  S.placed=Math.max(S.placed||0,k);if(marked){seedMem()}
  addXP(10);const newA=checkAch();save();syncU();track('place',String(k));
  const nL=LETTERS.filter(l=>l.L<=k).length,nxt=LESSONS.find((l,i)=>unlocked(i)&&!S.done[l.id]);
  const head=k===GROUPS.length?'Весь алфавит — ваш!':k?`Знаете ${nL} ${plural(nL,'букву','буквы','букв')} из ${LETTERS.length}`:'Начнём с самого начала';
  const line=k===GROUPS.length?'Ни одна буква вас не смутила. Дальше — правила чтения: там прячутся звуки, которых нет на письме.':
    k?`Шаги 1–${k} алфавита засчитаны${marked?`, отметил пройденными ${marked} ${plural(marked,'урок','урока','уроков')}`:''}. Дальше — новые буквы.`:
    'Ничего страшного: первые буквы займут пару минут, а дальше пойдёт быстрее.';
  $('#lprog').style.width='100%';
  $('#ex').innerHTML=`<div class="end"><span id="end-ciro">${mascot(k?'cheer':'happy','m-jump')}</span><h2>${head}</h2>
   <div class="bubble">${line}${nxt?`<p style="margin-top:6px;font-weight:700">Следующий урок: ${esc(nxt.t)}</p>`:''}</div>
   <div class="pl-steps" role="img" aria-label="Засчитано шагов: ${k} из ${GROUPS.length}">${GROUPS.map((g,i)=>`<span class="${i<k?'on':''}"><b>${i+1}</b><small>${esc(g)}</small></span>`).join('')}</div>
   ${newA.length?`<div class="achv-new">${newA.map(a=>`<button class="chip ach-sh" data-ach="${a.id}">${IC[a.ic]} ${esc(a.t)} <u>Поделиться</u></button>`).join('')}</div>`:''}</div>`;
  $('#lfoot').className='l-foot';foot(`<span></span><button class="btn" id="nxt">${nxt?'К урокам':'Продолжить'}</button>`);
  tapNext($('#nxt'),()=>{location.hash='learn';closeLesson()});$('#nxt').focus();
  document.querySelectorAll('.ach-sh').forEach(b=>b.onclick=()=>achShare(b.dataset.ach));
  if(k)sWin();if(k)confetti()}
