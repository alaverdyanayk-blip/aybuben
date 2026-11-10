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
function renderAlphabet(){const nL=LETTERS.filter(letterLearned).length,st=LETTERS.map(letterStrength),cnt=[0,1,2,3].map(v=>st.filter(x=>x===v).length),weak=weakLetters();
  $('#view').innerHTML=`<div style="display:flex;flex-direction:column;gap:22px">
  <div class="abc-head"><div class="ah-top"><b>Изучено ${nL} из ${LETTERS.length}</b><span>${nL===LETTERS.length?'Весь алфавит! <span class="arm">Կեցցե՛ս!</span>':'буквы отмечаются после урока'}</span></div><div class="bar ${nL===LETTERS.length?'good':''}"><i style="width:${Math.round(nL/LETTERS.length*100)}%"></i></div>
   ${nL?`<div class="mem-sum"><span class="ms s3"><b>${cnt[3]}</b>помню крепко</span><span class="ms s2"><b>${cnt[2]}</b>помню</span><span class="ms s1"><b>${cnt[1]}</b>пора повторить</span></div>
   ${weak.length?`<div class="weak"><span class="arm">${weak.slice(0,10).map(l=>l.U).join(' ')}${weak.length>10?' …':''}</span><button class="btn" id="weak-go">Повторить слабые буквы</button></div>`:`<p class="mem-ok">Слабых букв нет — Циро доволен.</p>`}`:''}</div>
  <p class="intro">Все 39 букв восточноармянского алфавита в реформированной орфографии. Нажмите на букву, чтобы увидеть подсказку и прописать её. Полоска под буквой — насколько крепко вы её помните.</p>
  ${GROUPS.map((g,i)=>{const ls=LETTERS.filter(l=>l.L===i+1),k=ls.filter(letterLearned).length;return `<div class="grp"><h3>${i+1}. ${g} <span>· ${k===ls.length?'все изучены':`${k} из ${ls.length}`}</span></h3><div class="agrid">${ls.map(l=>{const v=letterStrength(l);return `<button class="at ${v?'learned':''} s${v}" data-k="${l.k}" aria-label="${l.U}, ${esc(l.s)}: ${STR_T[v]}"><span class="gl">${l.U}${l.U!==l.k?`<small>${l.k}</small>`:''}</span><span class="sd">${esc(l.s)}</span><span class="str" aria-hidden="true"><i></i><i></i><i></i></span></button>`}).join('')}</div></div>`}).join('')}</div>`;
  document.querySelectorAll('.at').forEach(b=>b.onclick=()=>letterSheet(b.dataset.k));
  const wg=$('#weak-go');if(wg)wg.onclick=startWeak;
}
let traceCase='U';
function letterSheet(k){const l=BY[k];
  const s=sheet(`<div class="sheet-top"><span class="chip">${GROUPS[l.L-1]}</span><button class="x" data-close aria-label="Закрыть">✕</button></div>
   <div class="lc-hero" style="border:0;padding:0"><div class="gl">${l.U}${l.U!==l.k?`<small>${l.k}</small>`:''}</div><div class="info"><span class="snd-row"><span class="chip lg">${esc(l.s)}</span>${spk(letterSnd(l))}</span><span class="nm-row">Название: «${esc(l.nm)}» <span class="arm">${esc(l.hn)}</span>${spk(l.hn,'sm')}</span></div></div>
   <p style="margin:0">${esc(tipOf(l))}</p>${exWord(l)}
   <div class="row" style="justify-content:space-between"><b>Пропишите букву</b><div class="seg">${l.U!==l.k&&l.U!=='Ու'?`<button data-c="U" aria-pressed="${traceCase==='U'}" class="arm">${l.U}</button><button data-c="l" aria-pressed="${traceCase==='l'}" class="arm">${l.k}</button>`:''}<button id="clr">Стереть</button></div></div>
   <canvas id="cv" aria-label="Поле для письма"></canvas>`);
  setupCanvas(l);
  s.el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{traceCase=b.dataset.c;s.el.querySelectorAll('[data-c]').forEach(x=>x.setAttribute('aria-pressed',x===b));setupCanvas(l)});
}
/* Если для буквы есть школьная пропись по штрихам — показываем её, иначе свободное поле поверх печатной буквы */
function setupCanvas(l){const ch0=(l.U!==l.k&&traceCase==='l')?l.k:l.U,cv0=$('#cv');
  if(cv0&&STROKES[ch0]){const d=document.createElement('div');d.id='cv-tr';cv0.replaceWith(d);const c=$('#clr');if(c)c.hidden=true;tracer(d,ch0,{});return}
  const tb=$('#cv-tr');if(tb){const c=document.createElement('canvas');c.id='cv';c.setAttribute('aria-label','Поле для письма');tb.replaceWith(c);const b=$('#clr');if(b)b.hidden=false}
  const cv=$('#cv');if(!cv)return;const ctx=cv.getContext('2d');const ch=(l.U!==l.k&&traceCase==='l')?l.k:l.U;
  function guide(){const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;cv.width=r.width*d;cv.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);const cs=getComputedStyle(document.documentElement);
    ctx.clearRect(0,0,r.width,r.height);ctx.strokeStyle=cs.getPropertyValue('--line');ctx.lineWidth=1;ctx.setLineDash([4,6]);[.22,.5,.78].forEach(y=>{ctx.beginPath();ctx.moveTo(10,r.height*y);ctx.lineTo(r.width-10,r.height*y);ctx.stroke()});ctx.setLineDash([]);
    ctx.font=`500 ${r.height*.62}px "Noto Sans Armenian", sans-serif`;ctx.textAlign='center';ctx.fillStyle=cs.getPropertyValue('--sunk');const m=ctx.measureText(ch);ctx.fillText(ch,r.width/2,r.height/2+((m.actualBoundingBoxAscent||0)-(m.actualBoundingBoxDescent||0))/2);
    ctx.strokeStyle=cs.getPropertyValue('--accent');ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round'}
  (document.fonts?document.fonts.load('100px "Noto Sans Armenian"',ch).catch(()=>{}):Promise.resolve()).then(guide);
  let dr=false,last=null;const pos=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
  cv.onpointerdown=e=>{dr=true;last=pos(e);cv.setPointerCapture(e.pointerId);ctx.beginPath();ctx.arc(last[0],last[1],3.5,0,7);ctx.fill()};
  cv.onpointermove=e=>{if(!dr)return;const p=pos(e);ctx.beginPath();ctx.moveTo(...last);ctx.lineTo(...p);ctx.stroke();last=p};
  cv.onpointerup=cv.onpointercancel=()=>{dr=false};$('#clr').onclick=guide}
let REF={tab:'words',q:'',th:''};
function renderRules(){
  $('#view').innerHTML=`<div style="display:flex;flex-direction:column;gap:14px"><div class="seg reftabs" role="tablist"><button data-t="words" aria-pressed="${REF.tab==='words'}">Словарь · ${WORDS.length}</button><button data-t="rules" aria-pressed="${REF.tab==='rules'}">Правила</button></div><div id="refbody"></div></div>`;
  document.querySelectorAll('.reftabs button').forEach(b=>b.onclick=()=>{REF.tab=b.dataset.t;renderRules()});
  if(REF.tab==='rules'){const items=[];UNITS.forEach(u=>{if(u.alpha||u.theme)return;u.lessons.forEach(l=>items.push({u,l}))});
    $('#refbody').innerHTML=`<div style="display:flex;flex-direction:column;gap:14px"><p class="intro">Краткий справочник литературной нормы: всё, что объясняется в уроках, собрано здесь.</p><div class="rules">${items.map(({u,l},i)=>`<details class="rule" ${i===0?'open':''}><summary>${esc(l.t)}<span>${esc(u.t)}</span></summary><div class="teach">${l.teach}</div></details>`).join('')}</div></div>`;return}
  $('#refbody').innerHTML=`<div class="dict"><input id="dq" type="search" placeholder="Поиск: по-русски, по-армянски или как звучит" value="${esc(REF.q)}" autocomplete="off">
    <div class="thchips"><button data-th="" aria-pressed="${!REF.th}">Все</button>${THEMES.map(th=>`<button data-th="${th.id}" aria-pressed="${REF.th===th.id}">${esc(th.t)}</button>`).join('')}</div><div id="dlist"></div></div>`;
  const draw=()=>{const q=REF.q.trim().toLowerCase();
    let ws=REF.th?THEMES.find(t=>t.id===REF.th).words:WORDS;
    if(q)ws=ws.filter(w=>w.a.toLowerCase().includes(q)||w.m.toLowerCase().includes(q)||w.r.toLowerCase().replace(/ʰ/g,'').includes(q.replace(/ʰ/g,'')));
    $('#dlist').innerHTML=ws.length?`<p class="note">${ws.length} ${plural(ws.length,'слово','слова','слов')}${hasAudio?`, со звуком — ${ws.filter(w=>hasAudio(w.a)).length}`:''}</p><div class="dgrid">${ws.map(w=>`<div class="dcard"><div class="dtx"><span class="dw">${esc(w.a)}</span><span class="dr">«${esc(w.r)}»</span><span class="dm">${esc(w.m)}</span></div>${spk(w.a,'sm')}</div>`).join('')}</div>`:`<p class="note">Ничего не нашлось. Попробуйте другое слово.</p>`};
  $('#dq').oninput=e=>{REF.q=e.target.value;draw()};
  document.querySelectorAll('.thchips button').forEach(b=>b.onclick=()=>{REF.th=b.dataset.th;renderRules()});
  draw();
}
