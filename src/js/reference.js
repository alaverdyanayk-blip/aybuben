/* «Буквы» (справочник и пропись) и «Справка» (словарь и правила). */
function letterLearned(l){return LESSONS.some(x=>x.abc&&x.abc.includes(l.k)&&!/w$/.test(x.id)&&S.done[x.id])}
/* Сила памяти по букве: 3 — помню крепко, 2 — помню, 1 — пора повторить, 0 — ещё не учили */
function letterStrength(l){if(!letterLearned(l))return 0;const m=S.mem['#'+l.k];if(!Array.isArray(m))return 2;const p=recall(m);return p<0.5?1:(p>=0.75&&m[0]>=4)?3:2}
const STR_T=['ещё не учили','пора повторить','помню','помню крепко'];
function weakLetters(){return LETTERS.filter(l=>letterStrength(l)===1).sort((a,b)=>recall(S.mem['#'+a.k])-recall(S.mem['#'+b.k]))}
function startWeak(){const ws=weakLetters().slice(0,8),kn=learnedSet(),lp=LETTERS.filter(x=>kn.has(x.k)),pool=lp.length>=4?lp:LETTERS,items=[];
  ws.forEach(l=>{items.push(qL2S(l,pool,lp.length>=4));items.push(caseable(l)&&Math.random()<.5?qCase(l,pool):qS2L(l,pool,lp.length>=4))});
  const cm=caseMatch(ws,pool);if(cm)items.push(cm);
  startLesson({id:'practice',t:'Слабые буквы',gen:()=>shuffle(items)},true)}
/* «Справка» — одна вкладка: буквы, словарь и правила */
function refTabs(cur){return `<div class="seg reftabs" role="group" aria-label="Раздел справки">${[['abc','Буквы'],['words',`Словарь · ${WORDS.length}`],['rules','Правила']].map(([k,t])=>`<button data-t="${k}" aria-pressed="${k===cur}">${t}</button>`).join('')}</div>`}
function wireRefTabs(){document.querySelectorAll('.reftabs button').forEach(b=>b.onclick=()=>{const t=b.dataset.t;if(t==='abc'){location.hash='alphabet';return}REF.tab=t;if(location.hash==='#rules')renderRules();else location.hash='rules'})}
function renderAlphabet(){const nL=LETTERS.filter(letterLearned).length,N=LETTERS.length,st=LETTERS.map(letterStrength),weak=weakLetters(),C=2*Math.PI*28;
  $('#view').innerHTML=`<div style="display:flex;flex-direction:column;gap:16px">${refTabs('abc')}
  <section class="abc-map-h"><svg class="st-ring sm" viewBox="0 0 68 68" role="img" aria-label="Изучено ${nL} из ${N}"><circle cx="34" cy="34" r="28" class="bg"/><circle cx="34" cy="34" r="28" class="fg" stroke-dasharray="${(C*nL/N).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 34 34)"/><text x="34" y="40" class="n">${nL}</text></svg>
   <div><b>${nL===N?'Весь алфавит! <span class="arm">Կեցցե՛ս!</span>':`Изучено ${nL} из ${N}`}</b><div class="abc-leg"><span><i class="s3"></i>помню крепко</span><span><i class="s2"></i>помню</span><span><i class="s1"></i>пора повторить</span></div></div></section>
  <div class="abc-map">${LETTERS.map((l,i)=>{const v=st[i];return `<button class="at map s${v}" data-k="${l.k}" aria-label="${l.U}, ${esc(l.s)}: ${STR_T[v]}"><span class="gl">${l.U}</span><span class="sd">${esc(l.s)}</span></button>`}).join('')}</div>
  ${weak.length?`<button class="btn" id="weak-go">Повторить ${weak.length} ${plural(weak.length,'слабую букву','слабые буквы','слабых букв')}</button>`:nL?`<p class="mem-ok">Слабых букв нет — Циро доволен.</p>`:''}
  <p class="intro">Все 39 букв восточноармянского алфавита в порядке уроков. Нажмите на букву — подсказка, звук и пропись.</p></div>`;
  document.querySelectorAll('.at').forEach(b=>b.onclick=()=>letterSheet(b.dataset.k));
  const wg=$('#weak-go');if(wg)wg.onclick=startWeak;wireRefTabs();
}
let traceCase='U';
function letterSheet(k){const l=BY[k];
  const s=sheet(`<div class="sheet-top"><span class="chip">${GROUPS[l.L-1]}</span><button class="x" data-close aria-label="Закрыть">✕</button></div>
   <div class="lc-hero" style="border:0;padding:0"><div class="gl">${l.U}${l.U!==l.k?`<small>${l.k}</small>`:''}</div><div class="info"><span class="snd-row"><span class="chip lg">${esc(l.s)}</span>${spk(letterSnd(l))}</span><span class="nm-row">Название: «${esc(l.nm)}» <span class="arm">${esc(l.hn)}</span>${spk2(l.hn)}</span></div></div>
   <p style="margin:0">${esc(tipOf(l))}</p>${exWord(l)}
   <div class="row" style="justify-content:space-between"><b>Пропишите букву</b>${l.U!==l.k&&l.U!=='Ու'?`<div class="seg"><button data-c="U" aria-pressed="${traceCase==='U'}" class="arm">${l.U}</button><button data-c="l" aria-pressed="${traceCase==='l'}" class="arm">${l.k}</button></div>`:''}</div>
   <div id="cv-tr"></div>`,()=>{if(_tr){_tr.destroy();_tr=null}});
  setupCanvas(l);
  s.el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{traceCase=b.dataset.c;s.el.querySelectorAll('[data-c]').forEach(x=>x.setAttribute('aria-pressed',x===b));setupCanvas(l)});
}
let _tr=null;
/* Пропись в карточке буквы. Данные штрихов есть у всех букв (проверяется тестом), свободного рисования больше нет. */
function setupCanvas(l){const ch=(l.U!==l.k&&traceCase==='l')?l.k:l.U,box=$('#cv-tr');
  if(_tr){_tr.destroy();_tr=null}
  if(box&&STROKES[ch])_tr=tracer(box,ch,{})}
let REF={tab:'words',q:'',th:''};
function renderRules(){
  $('#view').innerHTML=`<div style="display:flex;flex-direction:column;gap:14px">${refTabs(REF.tab)}<div id="refbody"></div></div>`;
  wireRefTabs();
  if(REF.tab==='rules'){const items=[];UNITS.forEach(u=>{if(u.alpha||u.theme)return;u.lessons.forEach(l=>items.push({u,l}))});
    $('#refbody').innerHTML=`<div style="display:flex;flex-direction:column;gap:14px"><p class="intro">Краткий справочник литературной нормы: всё, что объясняется в уроках, собрано здесь.</p><div class="rules">${items.map(({u,l},i)=>`<details class="rule" ${i===0?'open':''}><summary>${esc(l.t)}<span>${esc(u.t)}</span></summary><div class="teach">${l.teach}</div></details>`).join('')}</div></div>`;return}
  $('#refbody').innerHTML=`<div class="dict"><input id="dq" type="search" placeholder="Поиск: по-русски, по-армянски или как звучит" value="${esc(REF.q)}" autocomplete="off">
    <div class="thchips"><button data-th="" aria-pressed="${!REF.th}">Все</button>${THEMES.map(th=>`<button data-th="${th.id}" aria-pressed="${REF.th===th.id}">${esc(th.t)}</button>`).join('')}</div><div id="dlist"></div></div>`;
  const draw=()=>{const q=REF.q.trim().toLowerCase();
    let ws=REF.th?THEMES.find(t=>t.id===REF.th).words:WORDS;
    if(q)ws=ws.filter(w=>w.a.toLowerCase().includes(q)||w.m.toLowerCase().includes(q)||w.r.toLowerCase().replace(/ʰ/g,'').includes(q.replace(/ʰ/g,'')));
    $('#dlist').innerHTML=ws.length?`<p class="note">${ws.length} ${plural(ws.length,'слово','слова','слов')}${hasAudio?`, со звуком — ${ws.filter(w=>hasAudio(w.a)).length}`:''}</p><div class="dgrid">${ws.map(w=>`<div class="dcard"><div class="dtx"><span class="dw">${esc(w.a)}</span><span class="dr">«${esc(w.r)}»</span><span class="dm">${esc(w.m)}</span></div>${spk2(w.a)}</div>`).join('')}</div>`:`<p class="note">Ничего не нашлось. Попробуйте другое слово.</p>`};
  $('#dq').oninput=e=>{REF.q=e.target.value;draw()};
  document.querySelectorAll('.thchips button').forEach(b=>b.onclick=()=>{REF.th=b.dataset.th;renderRules()});
  draw();
}
