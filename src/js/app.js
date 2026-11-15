/* Шапка (серия, сердца, цель дня) и переключение разделов. */
function ring(v,max){const p=Math.min(1,v/max),c=2*Math.PI*9;return `<svg class="ring" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--line)" stroke-width="3.5"/><circle cx="12" cy="12" r="9" fill="none" stroke="var(--good)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${c*p} ${c}" transform="rotate(-90 12 12)"/></svg>`}
function drawHud(){applyFreeze();const st=streakNow(),fz=frzLeft();
  $('#hud').innerHTML=`<button class="pill flame ${S.lastDay===today()?'':'off'}" id="hud-st" aria-label="Серия: ${st} ${plural(st,'день','дня','дней')}, заморозок ${fz}">${IC.flame}${st}${fz&&st?`<i class="fz" aria-hidden="true">${IC.frost}</i>`:''}</button><span class="pill heart" title="Сердца">${IC.heart}${hearts()}</span><span class="pill" title="Цель дня: ${todayXP()} из ${S.goal} XP">${ring(todayXP(),S.goal)}<span class="gtxt">${todayXP()}/${S.goal}</span></span>`;
  $('#hud-st').onclick=streakSheet}
/* Окно серии: огонёк, рекорд, заморозки и последние две недели (занимался / заморожен / пропуск) */
function streakSheet(){const st=streakNow(),fz=frzLeft(),fd=new Set(S.frzDays||[]);
  const days=[...Array(14)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);const k=dstr(d);return {k,wd:'вспнвтсрчтптсб'.substr(d.getDay()*2,2),on:(S.daily[k]||0)>0,fz:fd.has(k),t:k===today()}});
  sheet(`<div class="sheet-top"><b>Огонёк</b><button class="x" data-close aria-label="Закрыть">✕</button></div>
   <div class="st-head"><span class="st-fl">${IC.flame}<b>${st}</b></span><div>${st?`${plural(st,'день','дня','дней')} подряд`:'Огонёк пока не горит'}<br><span class="note">Рекорд: ${S.best||0}</span></div></div>
   <div class="st-days" role="img" aria-label="Последние две недели">${days.map(d=>`<span class="${d.on?'on':d.fz?'fz':''} ${d.t?'t':''}"><i>${d.fz&&!d.on?IC.frost:d.on?IC.flame:''}</i><small>${d.wd}</small></span>`).join('')}</div>
   <div class="st-frz"><span class="fzi">${IC.frost}</span><div><b>Заморозка серии: ${fz} из ${FRZ_MAX}</b><p>Пропустил день — огонёк не погаснет, заморозка сработает сама. Новая — за каждые 7 дней подряд.</p></div></div>`)}
const VIEWS={learn:renderLearn,games:renderGames,alphabet:renderAlphabet,rules:renderRules,profile:renderProfile,phrases:renderPhrases};
/* Тема: S.theme = 'light' | 'dark' | 'auto' (или пусто) — как в системе / Телеграме. */
function applyThemePref(){if(window.__applyTheme)return window.__applyTheme();const t=S.theme,el=document.documentElement;if(t==='light'||t==='dark')el.setAttribute('data-theme',t);else el.removeAttribute('data-theme')}
function route(){applyThemePref();const [hb,hs]=location.hash.slice(1).split('/'),v=VIEWS[hb]?hb:'learn';document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.view===v));$('#logo').innerHTML=mascot('happy');drawHud();VIEWS[v](hs)}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{location.hash=b.dataset.view});
window.addEventListener('hashchange',()=>{route();window.scrollTo(0,0)});
setInterval(drawHud,60000);
