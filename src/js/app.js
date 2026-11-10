/* Шапка (серия, сердца, цель дня) и переключение разделов. */
function ring(v,max){const p=Math.min(1,v/max),c=2*Math.PI*9;return `<svg class="ring" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--line)" stroke-width="3.5"/><circle cx="12" cy="12" r="9" fill="none" stroke="var(--good)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${c*p} ${c}" transform="rotate(-90 12 12)"/></svg>`}
function drawHud(){const st=streakNow();
  $('#hud').innerHTML=`<span class="pill flame ${S.lastDay===today()?'':'off'}" title="Серия дней">${IC.flame}${st}</span><span class="pill heart" title="Сердца">${IC.heart}${hearts()}</span><span class="pill" title="Цель дня: ${todayXP()} из ${S.goal} XP">${ring(todayXP(),S.goal)}<span class="gtxt">${todayXP()}/${S.goal}</span></span>`}
const VIEWS={learn:renderLearn,games:renderGames,alphabet:renderAlphabet,rules:renderRules,profile:renderProfile,phrases:renderPhrases};
/* Тема: S.theme = 'light' | 'dark' | 'auto' (или пусто) — как в системе / Телеграме. */
function applyThemePref(){if(window.__applyTheme)return window.__applyTheme();const t=S.theme,el=document.documentElement;if(t==='light'||t==='dark')el.setAttribute('data-theme',t);else el.removeAttribute('data-theme')}
function route(){applyThemePref();const [hb,hs]=location.hash.slice(1).split('/'),v=VIEWS[hb]?hb:'learn';document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.view===v));$('#logo').innerHTML=mascot('happy');drawHud();VIEWS[v](hs)}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{location.hash=b.dataset.view});
window.addEventListener('hashchange',()=>{route();window.scrollTo(0,0)});
setInterval(drawHud,60000);
