/* «Задания дня» на главной: три коротких задания, за все три — сундучок с XP. Каждый день новые.
   Прогресс — S.dq = {d: день, l: уроков, h: слов на слух, g: игр, c: сундучок открыт}.
   Засчитываются: конец любого урока или тренировки (lesson.js), верный ответ в задании «послушайте» (lesson.js),
   конец игры (games.js). */
const DQ_GOALS=[
 {k:'l',t:'Пройти урок',n:1,ic:'<path d="M3 11.2 12 4l9 7.2V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z" fill="currentColor"/>'},
 {k:'h',t:'Узнать 10 слов на слух',n:10,ic:'<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'},
 {k:'g',t:'Сыграть в одну игру',n:1,ic:'<path d="M7.5 7h9a5.5 5.5 0 0 1 5.2 7.3l-1 2.6a2.6 2.6 0 0 1-4.4.8L14.6 16H9.4l-1.7 1.7a2.6 2.6 0 0 1-4.4-.8l-1-2.6A5.5 5.5 0 0 1 7.5 7z" fill="currentColor"/>'}];
const DQ_XP=15;
function dq(){if(!S.dq||typeof S.dq!=='object'||S.dq.d!==today())S.dq={d:today(),l:0,h:0,g:0,c:0};return S.dq}
const dqDone=g=>(dq()[g.k]|0)>=g.n;
const dqAll=()=>DQ_GOALS.every(dqDone);
function dqAdd(k,n=1){const q=dq(),g=DQ_GOALS.find(x=>x.k===k);if(!g)return;q[k]=Math.min(g.n,(q[k]|0)+n);save()}
function dqClaim(){const q=dq();if(q.c||!dqAll())return false;q.c=1;addXP(DQ_XP);save();track('dq');return true}
function dqCard(){const q=dq(),n=DQ_GOALS.filter(dqDone).length,all=n===DQ_GOALS.length;
  return `<section class="dq" aria-label="Задания дня"><div class="dq-h"><h2>Задания дня</h2><span>${n} из ${DQ_GOALS.length}</span></div>
   ${DQ_GOALS.map(g=>{const v=Math.min(g.n,q[g.k]|0),ok=v>=g.n;return `<div class="dq-row ${ok?'ok':''}"><span class="dq-ic" aria-hidden="true">${ok?'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>':`<svg viewBox="0 0 24 24">${g.ic}</svg>`}</span><div class="dq-t"><span>${g.t}</span><span class="dq-bar"><i style="width:${Math.round(v/g.n*100)}%"></i></span></div><b>${v}/${g.n}</b></div>`}).join('')}
   ${q.c?`<div class="dq-chest open"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="11" width="18" height="9" rx="2" fill="#C2761A"/><path d="M4 9.5 7 4h10l3 5.5z" fill="#F0A23B"/><circle cx="12" cy="8" r="2" fill="#FFE3B0"/></svg><span><b>Сундучок открыт:</b> +${DQ_XP} XP. Завтра — новые задания.</span></div>`
     :all?`<button class="btn dq-claim" id="dq-claim">Открыть сундучок · +${DQ_XP} XP</button>`
     :`<div class="dq-chest"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="18" height="11" rx="2" fill="#C2761A"/><path d="M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2H3z" fill="#F0A23B"/><rect x="10.5" y="9.5" width="3" height="4" rx="1" fill="#6E1424"/></svg><span><b>Сундучок Циро:</b> +${DQ_XP} XP за все три задания</span></div>`}</section>`}
/* Мини-карта алфавита на главной: 39 клеток по силе памяти, нажатие — в «Справку» */
function abcStrip(){const st=LETTERS.map(letterStrength),n=st.filter(Boolean).length;
  return `<a class="abc-strip" href="#alphabet" aria-label="Алфавит: изучено ${n} из ${LETTERS.length} букв"><span class="as-h"><b>Алфавит</b><span>${n} из ${LETTERS.length} букв</span></span><span class="as-g" aria-hidden="true">${st.map(v=>`<i class="s${v}"></i>`).join('')}</span></a>`}
function wireDq(){const b=$('#dq-claim');if(b)b.onclick=()=>{if(dqClaim()){sWin();confetti();route()}}}
