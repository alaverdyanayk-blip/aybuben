/* Раздел «Фразы»: уроки и экран. */
const PHMAP=new Map();
PHR.forEach(P=>{P.ph.forEach(x=>PHMAP.set(x[0],x));P.dl.forEach(d=>{PHMAP.set(d.a[0],d.a);PHMAP.set(d.q[0],d.q)})});
const phSt=id=>(S.phr&&S.phr[id])||{};
const phDone=id=>!!phSt(id).l2;
const phStars=id=>{const r=phSt(id);return (r.l1?1:0)+(r.l2?1:0)};
const phToks=a=>a.replace(/[։,]/g,' ').split(/\s+/).filter(Boolean);
function phGen1(P){
  const ph=shuffle(P.ph),others=PHR.filter(x=>x!==P).flatMap(x=>x.ph),out=[];
  const mW=x=>sample(P.ph.filter(y=>y!==x&&!clash(y[2],x[2])).map(y=>y[2]),3);
  const aW=x=>sample(P.ph.filter(y=>y!==x).map(y=>y[0]),3);
  const note=x=>x[3]?'<br>'+esc(x[3]):'';
  ph.slice(0,4).forEach(x=>out.push(CH('Что значит эта фраза?',x[0],x[2],mW(x),{bigCls:'sent',sub:'звучит «'+x[1]+'»',explain:note(x).slice(4)})));
  ph.slice(4,7).forEach(x=>out.push(CH('Как сказать по-армянски?',x[2],x[0],aW(x),{bigCls:'ru',optArm:true,optR:true,explain:'«'+esc(x[1])+'»'+note(x)})));
  const short=P.ph.slice().sort((a,b)=>a[0].length-b[0].length).slice(0,6);
  out.splice(4,0,MT(sample(short,4).map(x=>[x[0].replace(/։$/,''),x[2]])));
  ph.slice(7).filter(x=>{const n=phToks(x[0]).length;return n>=2&&n<=5}).slice(0,2).forEach(x=>{const w=phToks(x[0]);
    const extra=sample(uniq(others.flatMap(y=>phToks(y[0]))).filter(t=>!w.includes(t)),2);
    out.push({type:'build',prompt:'Соберите фразу',sub:x[2],tiles:[...w,...extra],answers:[w],joiner:' ',show:x[0],explain:'«'+esc(x[1])+'»'})});
  return out}
function phGen2(P){
  const out=[{type:'teach',title:'Сцена: '+P.t.toLowerCase(),outfit:P.o,html:`<p>${esc(P.scene)}</p><p style="margin-top:8px">${esc(P.who)} обращается к вам. Выберите подходящий ответ.</p>`}];
  P.dl.forEach(d=>out.push({type:'choice',prompt:'Что ответите?',dlg:d,who:P.who,outfit:P.o,correct:d.a[0],options:[d.a[0],...d.w],optArm:true,optR:true,explain:'«'+esc(d.a[1])+'» — '+esc(d.a[2])}));
  sample(P.ph.filter(x=>!P.dl.some(d=>d.a[0]===x[0])),2).forEach(x=>out.push(CH('Как сказать по-армянски?',x[2],x[0],sample(P.ph.filter(y=>y!==x).map(y=>y[0]),3),{bigCls:'ru',optArm:true,optR:true,explain:'«'+esc(x[1])+'»'})));
  return out}
function phLesson(P,n){return {id:`ph-${P.id}-${n}`,t:`${P.t} · ${n===1?'фразы':'диалог'}`,ph:{id:P.id,n},gen:()=>n===1?phGen1(P):phGen2(P)}}
function phStart(P,n){if(hearts()<=0){const s=sheet(`<div class="row">${mascot('sleep')}<h3 style="flex:1">Сердца закончились. Сердечко восстанавливается за 30 минут — или потренируйтесь на пройденном.</h3></div><div class="row"><button class="btn" id="phpr">Тренировка</button><button class="btn plain" data-close>Позже</button></div>`);s.el.querySelector('#phpr').onclick=()=>{s.close();startPractice()};return}
  startLesson(phLesson(P,n),false)}
function phCard(P){const st=phStars(P),c=COSTUMES.find(x=>x.ph===P.id);
  return `<button class="phc" data-ph="${P.id}" style="--pc:${P.c}"><span class="phc-art">${mascot(P.mood,'',P.o)}</span><span class="phc-tx"><b>${esc(P.t)}</b><span class="arm hy">${esc(P.hy)}</span><span class="d">${P.ph.length} фраз · ${P.dl.length} диалога</span><span class="phc-st">${[0,1].map(i=>`<i class="${i<st?'on':''}"></i>`).join('')}${phDone(P.id)?`<em>костюм: ${esc(c.t.toLowerCase())}</em>`:''}</span></span></button>`}
function renderPhrases(sub){const P=PHR.find(p=>p.id===sub);
  if(!P){const n=PHR.filter(p=>phDone(p.id)).length;
    $('#view').innerHTML=`<div class="phx"><section class="ph-intro">${ciroSay('happy',`<p><b>Фразы для поездки.</b> Самые нужные слова для рынка, такси, аэропорта и других мест — с подсказкой, как это звучит.</p><p>Пройдите диалог ситуации — и Циро получит новый костюм.</p>`)}<div class="ph-prog"><b>${n} из ${PHR.length}</b><span>ситуаций пройдено</span></div></section>
      <div class="phc-grid">${PHR.map(phCard).join('')}</div>
      <p class="note" style="text-align:center">Фразы — живой разговорный язык. Где литературная норма говорит иначе, это указано рядом.</p></div>`;
    document.querySelectorAll('.phc').forEach(b=>b.onclick=()=>{location.hash='phrases/'+b.dataset.ph});return}
  const r=phSt(P.id),c=COSTUMES.find(x=>x.ph===P.id),open2=!!r.l1||S.unlockAll,worn=S.outfit===c.id;
  const step=(n,t,d,open,done)=>`<button class="ph-step ${done?'done':''}" data-n="${n}" ${open?'':'disabled'}><span class="num">${done?'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>':open?n:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7a5 5 0 0 1 10 0v3h1v11H6V10zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>'}</span><span class="tx"><b>${t}</b><span>${open?d:'Откроется после урока 1'}</span></span><span class="go">${done?'Повторить':open?'Начать':''}</span></button>`;
  $('#view').innerHTML=`<div class="phx" style="--pc:${P.c}">
    <a class="ph-back" href="#phrases">← Все ситуации</a>
    <section class="ph-head"><div class="ph-art" id="ph-art">${mascot(P.mood,'m-idle',P.o)}</div><div class="ph-ht"><span class="k">Фразы · ситуация</span><h2>${esc(P.t)}</h2><span class="arm hy">${esc(P.hy)}</span><p>${esc(P.d)}</p></div></section>
    <div class="ph-steps">${step(1,'Урок 1 · Фразы','Перевод, пары и сборка фраз',true,r.l1)}${step(2,'Урок 2 · Диалог',esc(P.who)+' говорит — вы отвечаете',open2,r.l2)}</div>
    <div class="box ph-cos"><span class="cos-art">${mascot('cheer','',c.id)}</span><div><b>Костюм «${esc(c.t)}»</b><p class="note" style="margin:2px 0 0">${phDone(P.id)?esc(c.d):'Откроется, когда пройдёте диалог.'}</p></div>${phDone(P.id)?`<button class="btn ${worn?'plain':''} sm" id="ph-wear" ${worn?'disabled':''}>${worn?'Надето':'Надеть'}</button>`:''}</div>
    <section class="box ph-list"><h3>Разговорник</h3>${P.ph.map(x=>`<div class="ph-row"><div class="ph-a"><span class="arm">${esc(x[0])}</span>${spk(x[0],'sm')}</div><div class="ph-r">«${esc(x[1])}»</div><div class="ph-m">${esc(x[2])}</div>${x[3]?`<div class="ph-n">${esc(x[3])}</div>`:''}</div>`).join('')}</section>
  </div>`;
  document.querySelectorAll('.ph-step').forEach(b=>b.onclick=()=>phStart(P,+b.dataset.n));
  const w=$('#ph-wear');if(w)w.onclick=()=>{S.outfit=c.id;save();renderPhrases(P.id)};
  $('#ph-art').onclick=()=>bounce($('#ph-art .mascot'))}
