/* Профиль: гардероб, статистика, достижения, настройки. */
/* гардероб по категориям: раскрывается та, где надетый костюм; выбор раскрытия помнится до перезагрузки */
const WR_OPEN={};
function wrGroup(id,title,owned,hasWorn,grid){const n=owned.filter(Boolean).length,open=WR_OPEN[id]??hasWorn;
  return `<details class="wr-cat" data-wr="${id}" ${open?'open':''}><summary><b>${title}</b><span>${n} из ${owned.length}</span></summary><div class="wr-grid">${grid}</div></details>`}
function renderProfile(){
  const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d});
  const vals=days.map(d=>S.daily[dstr(d)]||0),mx=Math.max(S.goal,...vals);
  const W=320,H=140,bw=30,gap=(W-40-bw*7)/6,yS=v=>H-24-(v/mx)*(H-44);
  const wd=['вс','пн','вт','ср','чт','пт','сб'];
  const chart=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="XP за последние 7 дней"><line x1="20" x2="${W-20}" y1="${yS(S.goal)}" y2="${yS(S.goal)}" stroke="var(--accent)" stroke-dasharray="4 4"/><text x="${W-20}" y="${yS(S.goal)-5}" text-anchor="end" font-size="10" fill="var(--accent)">цель ${S.goal}</text>
   ${vals.map((v,i)=>{const x=20+i*(bw+gap),y=yS(v);return `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(0,H-24-y)}" rx="6" fill="${v>=S.goal?'var(--good)':'var(--b3)'}" opacity="${v?1:.25}"/>${v?`<text x="${x+bw/2}" y="${y-4}" text-anchor="middle" font-size="10" fill="var(--ink)">${v}</text>`:(S.frzDays||[]).includes(dstr(days[i]))?`<text x="${x+bw/2}" y="${H-30}" text-anchor="middle" font-size="14" fill="var(--b3)">❄</text>`:''}<text x="${x+bw/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="var(--muted)">${wd[days[i].getDay()]}</text>`}).join('')}</svg>`;
  const doneL=LESSONS.filter(l=>S.done[l.id]).length;
  const lv=level(),into=S.xp%100,nL=LETTERS.filter(letterLearned).length;
  const wrOwn=[...OUTFITS.filter(o=>o.id).map(o=>lv>=o.lv),...COSTUMES.map(c=>phDone(c.ph)),...HISTC.map(c=>stDone(c.st)),...REFC.map(refOwned)];
  /* Гардероб и достижения открываются в шторке по кнопкам в профиле */
  const wrBody=()=>`<div class="wr-col">${wrGroup('lv','За уровень',OUTFITS.map(o=>level()>=o.lv),OUTFITS.some(o=>o.id&&o.id===S.outfit)||!S.outfit,`${OUTFITS.map(o=>{const op=lv>=o.lv,on=(S.outfit||null)===o.id;return `<button class="wr-item ${on?'on':''}" data-o="${o.id||''}" ${op?'':'disabled'} aria-pressed="${on}">${mascot('happy','',o.id)}<b>${o.t}</b><span>${op?o.d:`Откроется на уровне ${o.lv}`}</span></button>`}).join('')}`)}
    ${wrGroup('ph','За «Фразы»',COSTUMES.map(c=>phDone(c.ph)),COSTUMES.some(c=>c.id===S.outfit),`${COSTUMES.map(c=>{const op=phDone(c.ph),on=S.outfit===c.id;return `<button class="wr-item ${on?'on':''}" data-o="${c.id}" ${op?'':'disabled'} aria-pressed="${on}">${mascot('happy','',c.id)}<b>${c.t}</b><span>${op?c.d:`Диалог «${esc(PHR.find(p=>p.id===c.ph).t)}»`}</span></button>`}).join('')}`)}
    ${wrGroup('hs','За истории',HISTC.map(c=>stDone(c.st)),HISTC.some(c=>c.id===S.outfit),`${HISTC.map(c=>{const op=stDone(c.st),on=S.outfit===c.id,st=STORIES.find(x=>x.id===c.st);return `<button class="wr-item ${on?'on':''}" data-o="${c.id}" ${op?'':'disabled'} aria-pressed="${on}">${mascot('happy','',c.id)}<b>${c.t}</b><span>${op?c.d:`История «${esc(st.t)}»`}</span></button>`}).join('')}`)}
    ${wrGroup('fr','За друзей',REFC.map(refOwned),REFC.some(c=>c.id===S.outfit),`${REFC.map(c=>{const op=refOwned(c),on=S.outfit===c.id;return `<button class="wr-item ${on?'on':''}" data-o="${c.id}" ${op?'':'disabled'} aria-pressed="${on}">${mascot('happy','',c.id)}<b>${c.t}</b><span>${op?c.d:c.n?`${c.n} ${plural(c.n,'друг','друга','друзей')} пройдут первый урок`:'Если пришёл по приглашению'}</span></button>`}).join('')}`)}</div>`;
  const achBody=()=>`${Object.keys(S.ach).length?'<p class="note" style="margin:0 0 10px">Нажмите на полученное — Циро нарисует карточку, чтобы похвастаться.</p>':''}<div class="agrid2">${ACH.map(a=>S.ach[a.id]?`<button class="ach on" data-ach="${a.id}" aria-label="${esc(a.t)}: открыть карточку"><span class="ic">${IC[a.ic]}</span><b>${a.t}</b><span>${a.d}</span></button>`:`<div class="ach"><span class="ic">${IC[a.ic]}</span><b>${a.t}</b><span>${a.d}</span></div>`).join('')}</div>`;
  $('#view').innerHTML=`<div style="display:flex;flex-direction:column;gap:16px">
   <section class="pf-head"><span class="pf-ciro" id="wr-ciro">${mascot('happy','m-idle')}</span><div class="pf-lv"><span class="k">Уровень ${lv}</span><b>${S.xp} XP</b><span class="pf-bar"><i style="width:${into}%"></i></span><span class="n">до уровня ${lv+1} — ${100-into} XP</span></div></section>
   <div class="cards">
    <div class="card ctop"><div class="c-top"><span class="ic fl" style="color:var(--accent)">${IC.flame}</span><span class="c-fz" title="Заморозка серии: пропущенный день не гасит огонёк" aria-label="Заморозки: ${frzLeft()} из ${FRZ_MAX}">${IC.frost}${frzLeft()}/${FRZ_MAX}</span></div><div class="v">${streakNow()}</div><div class="l">${plural(streakNow(),'день','дня','дней')} подряд · рекорд ${S.best||0}</div></div>
    <div class="card ctop"><div class="c-top"><span class="ic" style="color:var(--gold-deep)">${IC.bolt}</span></div><div class="v">${S.xp}</div><div class="l">всего XP</div></div>
    <div class="card ctop"><div class="c-top"><span class="ic arm abc-ic" aria-hidden="true">Ա</span></div><div class="v">${nL}<small> из ${LETTERS.length}</small></div><div class="l">букв изучено</div></div>
    <div class="card ctop"><div class="c-top"><span class="ic" style="color:var(--b2)">${IC.book}</span></div><div class="v">${doneL}/${LESSONS.length}</div><div class="l">уроков пройдено</div></div>
   </div>
   <div class="box week"><h3>Неделя</h3>${chart}</div>
   <div class="pf-btns"><button class="pf-btn" id="pf-go-wr"><span class="pf-bi">${mascot('happy','',S.outfit)}</span><span><b>Гардероб</b><span>${wrOwn.filter(Boolean).length} из ${wrOwn.length}</span></span></button><button class="pf-btn" id="pf-go-ach"><span class="pf-bi star" aria-hidden="true">${IC.star}</span><span><b>Достижения</b><span>${Object.keys(S.ach).length} из ${ACH.length}</span></span></button></div>
   <div class="box"><h3>Цель дня</h3><div class="goals">${[[10,'Лёгкая','1 урок'],[20,'Обычная','2 урока'],[30,'Серьёзная','3 урока'],[50,'Интенсив','5 уроков']].map(([v,t,d])=>`<button data-g="${v}" aria-pressed="${S.goal===v}"><b>${t} · ${v} XP</b><span>около ${d} в день</span></button>`).join('')}</div></div>
   ${inviteBox()}
   ${contactBox()}
   <a class="box ch-row" href="${CHANNEL}" target="_blank" rel="noopener" data-ch-row><span class="ch-ico" aria-hidden="true">📣</span><span><b>Канал Циро</b><small>Обновления, новые уроки и функции</small></span><span class="ch-go" aria-hidden="true">›</span></a>
   <div class="box"><h3>Настройки</h3>
    ${notifRow()}
    <div class="toggle theme-row"><span>Тема</span><div class="seg" role="group" aria-label="Тема">${[['auto','Как в системе'],['light','Светлая'],['dark','Тёмная']].map(([v,t])=>`<button data-theme-set="${v}" aria-pressed="${(S.theme||'auto')===v}">${t}</button>`).join('')}</div></div>
    <div class="toggle"><span>Произносить слова автоматически<br><span class="note">Кнопка с динамиком работает всегда</span></span><button class="switch" role="switch" id="sw-voice" aria-checked="${S.voice!==false}" aria-label="Автоозвучка"></button></div>
    <div class="toggle"><span>Звуки в уроках</span><button class="switch" role="switch" id="sw-sound" aria-checked="${S.sound}" aria-label="Звуки"></button></div>
    <div class="toggle"><span>Тест на уровень<br><span class="note">Проверит, какие буквы вы уже знаете, и отметит их пройденными</span></span><button class="btn plain sm" id="place-p">Пройти</button></div>
    <div class="toggle"><span>Открыть все уроки<br><span class="note">Для тех, кто уже знает часть материала</span></span><button class="switch" role="switch" id="sw-all" aria-checked="${S.unlockAll}" aria-label="Открыть все уроки"></button></div>
    <div class="row"><button class="btn plain" id="reset">Сбросить прогресс</button><span id="rs-confirm"></span></div>
    <p class="note">${TGW?'Прогресс хранится в облаке Телеграма: он общий для телефона и компьютера.':'Прогресс хранится в этом браузере на этом устройстве.'}</p></div>
  </div>`;
  document.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{S.goal=+b.dataset.g;save();route()});
  document.querySelectorAll('.wr-item').forEach(b=>b.onclick=()=>{S.outfit=b.dataset.o||null;save();route()});
  document.querySelectorAll('[data-theme-set]').forEach(b=>b.onclick=()=>{S.theme=b.dataset.themeSet;save();applyThemePref();renderProfile()});
  const chr=$('[data-ch-row]');if(chr)chr.addEventListener('click',()=>track('channel','profile'));
  $('#sw-voice').onclick=()=>{S.voice=S.voice===false;save();renderProfile()};
  $('#sw-sound').onclick=()=>{S.sound=!S.sound;save();renderProfile()};
  $('#place-p').onclick=startPlacement;
  $('#sw-all').onclick=()=>{S.unlockAll=!S.unlockAll;save();renderProfile()};
  wireGrowth();
  /* У рисунков значков свой пустой отступ слева — сдвигаем каждый, чтобы край рисунка совпал с началом числа */
  document.querySelectorAll('.card.ctop .ic svg').forEach(sv=>{try{const g=sv.getBBox(),vb=sv.viewBox.baseVal,k=sv.getBoundingClientRect().width/vb.width;if(k>0)sv.style.marginLeft=(-(g.x-vb.x)*k+1).toFixed(1)+'px'}catch(e){}});
  document.querySelectorAll('[data-ach]').forEach(b=>b.onclick=()=>achShare(b.dataset.ach));
  $('#pf-go-wr').onclick=()=>{const sh=sheet(`<div class="sheet-top"><b>Гардероб Циро</b><button class="x" data-close aria-label="Закрыть">✕</button></div><div class="pf-sh">${wrBody()}</div>`);
    const wire=()=>{sh.el.querySelectorAll('.wr-item').forEach(b=>b.onclick=()=>{S.outfit=b.dataset.o||null;save();route();sh.el.querySelector('.pf-sh').innerHTML=wrBody();wire()});sh.el.querySelectorAll('.wr-cat').forEach(d=>d.ontoggle=()=>{WR_OPEN[d.dataset.wr]=d.open})};wire()};
  $('#pf-go-ach').onclick=()=>{const sh=sheet(`<div class="sheet-top"><b>Достижения</b><button class="x" data-close aria-label="Закрыть">✕</button></div><div class="pf-sh">${achBody()}</div>`);
    sh.el.querySelectorAll('[data-ach]').forEach(b=>b.onclick=()=>achShare(b.dataset.ach))};
  document.querySelectorAll('.wr-cat,.fold').forEach(d=>d.ontoggle=()=>{WR_OPEN[d.dataset.wr]=d.open});
  $('#reset').onclick=()=>{$('#rs-confirm').innerHTML='<button class="btn bad" id="rs-yes">Да, стереть всё</button>';$('#rs-yes').onclick=()=>{const b=$('#rs-yes');b.disabled=true;b.textContent='Стираю…';let gone=false;const st=resetState();const go=()=>{if(gone)return;gone=true;location.reload()};if(window.__resetCloud){window.__resetCloud(go,st);setTimeout(go,3000)}else go()}};
}
