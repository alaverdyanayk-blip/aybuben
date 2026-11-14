/* Состояние и прогресс: сохранение, XP, серия, сердца, уровни. */
const KEY='aybuben-v2',REGEN=30*60*1000,MAXH=5;
/* Версия схемы прогресса. Меняется, когда меняется устройство сохранения; тогда в MIGRATIONS добавляется шаг
   «с версии N на N+1». Обновления приложения не сбрасывают прогресс: старое сохранение проходит все шаги по порядку.
     1 — первая версия (уроки алфавита a1a…a6w)
     2 — новый порядок букв (уроки ab1a…ab6w) и память повторений mem
     3 — номер версии v, слияние с облаком, отметка сброса resetAt */
const SCHEMA=3;
const S0={v:SCHEMA,xp:0,daily:{},streak:0,lastDay:null,best:0,hearts:MAXH,heartsTs:0,done:{},goal:20,ach:{},sound:true,unlockAll:false,read:0,perfect:0,games:{},phr:{},mem:{},memV:0};
const fresh=()=>Object.assign(JSON.parse(JSON.stringify(S0)),{heartsTs:Date.now()});
const OLD_GROUPS=[['ա','ն','մ','ր','տ','ու','ս'],['ե','բ','վ','և','ի','կ','լ'],['հ','դ','գ','յ','ո','օ','շ'],['ք','թ','պ','փ','չ','ճ','ց','ծ'],['ժ','խ','ղ','ռ','ջ','ձ','զ'],['է','ը','ֆ']];   // шаги алфавита в схеме 1
const MIGRATIONS={
  1:st=>migrateAbc(st),   // отметки уроков алфавита переносятся на новый порядок букв; только добавляются
  2:st=>{}                // поле v и resetAt появляются сами
};
/* Приводит любое сохранение (старое, повреждённое, из облака) к текущей схеме. Ничего не удаляет. */
function upgrade(st){
  if(!st||typeof st!=='object'||Array.isArray(st))st={};
  for(const k in S0){if(k==='v')continue;const v=st[k],d=S0[k];   // неверные типы возвращаем к значениям по умолчанию
    if(d!==null&&(v==null||typeof v!==typeof d||Array.isArray(v)!==Array.isArray(d)||(typeof d==='number'&&!isFinite(v))))st[k]=JSON.parse(JSON.stringify(d))}
  st.hearts=Math.max(0,Math.min(MAXH,st.hearts|0));st.xp=Math.max(0,st.xp|0);if(!st.heartsTs)st.heartsTs=Date.now();
  if(st.outfit!=null&&typeof st.outfit!=='string')st.outfit=null;
  if(!(st.goal>0))st.goal=S0.goal;st.streak=Math.max(0,st.streak|0);
  let v=+st.v;if(!isFinite(v)||v<1)v=1;
  // Если шаг не удался, версия не повышается: шаг повторится при следующем запуске, а не пропадёт молча
  for(;v<SCHEMA;v++){try{MIGRATIONS[v]&&MIGRATIONS[v](st)}catch(e){console.error('миграция '+v,e);break}}
  st.v=v;   // сохранение из более новой версии приложения не понижаем
  return st}
let S=fresh();
try{const r=localStorage.getItem(KEY);if(r)S=upgrade(JSON.parse(r))}catch(e){S=fresh()}   // сохранение без поля v считается версией 1
/* Прежнее имя: вызывается после восстановления из облака */
function fixState(){try{S=upgrade(S);try{seedMem()}catch(e){}}catch(e){}}
/* Пересчёт прогресса алфавита из прежнего порядка букв: по старым отметкам (a1a…a6w) узнаём,
   какие буквы человек уже прошёл, и отмечаем новые уроки, где все буквы ему знакомы. Отметки только добавляются. */
function migrateAbc(st){const d=st.done;const old=Object.keys(d).filter(k=>/^a[1-6][abw]$/.test(k));if(!old.length)return;
  const known=new Set();old.forEach(id=>{const g=OLD_GROUPS[+id[1]-1];let ks=g;if(g.length>3&&id[2]!=='w'){const [a,b]=half(g);ks=id[2]==='a'?a:b}ks.forEach(k=>known.add(k))});
  LESSONS.forEach(l=>{if(l.abc&&!d[l.id]&&l.abc.every(k=>known.has(k)))d[l.id]=1})}
/* старый пользователь, которому после смены порядка букв надо допройти урок: дальше по пути уже есть пройденные уроки алфавита */
const updGap=gi=>!!LESSONS[gi].abc&&Object.keys(S.done).some(k=>/^a[1-6][abw]$/.test(k))&&LESSONS.slice(gi+1).some(l=>l.abc&&S.done[l.id]);

/* Слияние двух копий прогресса (это устройство и облако Телеграма). Ничего не теряется:
   пройденное объединяется, из чисел берётся большее, настройки — из более свежей копии.
   Исключение — сброс: копия, сохранённая раньше чужого сброса, отбрасывается целиком. */
function mergeState(a,b){
  a=upgrade(JSON.parse(JSON.stringify(a||{})));b=upgrade(JSON.parse(JSON.stringify(b||{})));
  const ra=a.resetAt||0,rb=b.resetAt||0;
  if(ra>rb&&(b.ts||0)<ra)return a;
  if(rb>ra&&(a.ts||0)<rb)return b;
  const [n,o]=(a.ts||0)>=(b.ts||0)?[a,b]:[b,a];   // n — более свежая копия, o — более старая
  const num=(x,y)=>Math.max(+x||0,+y||0);
  const each=(x,y,f)=>{const r={};new Set([...Object.keys(x||{}),...Object.keys(y||{})]).forEach(k=>{r[k]=f((x||{})[k],(y||{})[k],k)});return r};
  const m=Object.assign({},o,n);
  m.done=each(n.done,o.done,num);
  m.daily=each(n.daily,o.daily,num);
  m.xp=num(n.xp,o.xp);if(n.ntAsk||o.ntAsk)m.ntAsk=num(n.ntAsk,o.ntAsk);m.read=num(n.read,o.read);m.perfect=num(n.perfect,o.perfect);m.best=num(n.best,o.best);m.friends=num(n.friends,o.friends);
  const late=(n.lastDay||'')>=(o.lastDay||'')?n:o;m.lastDay=late.lastDay;m.streak=n.lastDay===o.lastDay?num(n.streak,o.streak):late.streak;
  m.ach=each(n.ach,o.ach,(x,y)=>x&&y?(x<y?x:y):x||y);
  m.miles=each(n.miles,o.miles,(x,y)=>x&&y?(x<y?x:y):x||y);
  m.hrs=each(n.hrs,o.hrs,num);
  m.phr=each(n.phr,o.phr,(x,y)=>each(x,y,num));
  m.games=each(n.games,o.games,(x,y,k)=>{if(!x||!y)return x||y;const low=gameLow(k),bx=x.best,by=y.best;
    return Object.assign({},y,x,{plays:num(x.plays,y.plays),best:bx==null?by:by==null?bx:low?Math.min(bx,by):Math.max(bx,by)})});
  m.mem=each(n.mem,o.mem,(x,y)=>!x||!y?x||y:(+y[1]||0)>(+x[1]||0)?y:x);   // по каждой букве и слову — более поздняя запись
  ['refBy','refCode','refClaimed','newsSeen','outfit','notif','gameMode'].forEach(k=>{if(m[k]==null&&o[k]!=null)m[k]=o[k]});
  m.resetAt=Math.max(ra,rb)||undefined;m.ts=num(n.ts,o.ts);m.v=Math.max(n.v,o.v);
  return m}
const gameLow=k=>{const g=GAMES.find(g=>k===g.id||k.startsWith(g.id+'_'));return !!(g&&g.low)};
/* Вызывается адаптером Телеграма, когда пришла копия из облака. Возвращает true, если облако надо обновить. */
function syncFromCloud(cloud){
  const before=JSON.stringify(S),m=mergeState(S,cloud);S=m;try{seedMem()}catch(e){}
  const now=JSON.stringify(S);try{localStorage.setItem(KEY,now)}catch(e){}
  if(now!==before)route();
  return JSON.stringify(mergeState(cloud,cloud))!==JSON.stringify(mergeState(m,m))}
/* Сброс прогресса: чистое сохранение с отметкой времени сброса — по ней другие устройства поймут, что их копия устарела */
function resetState(){S=fresh();S.resetAt=S.ts=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}return S}
window.fixState=fixState;window.syncFromCloud=syncFromCloud;window.mergeState=mergeState;
/* Пока не пришёл ответ облака, время сохранения не обновляем: иначе устаревшая копия на этом устройстве
   выглядела бы свежее облачной (так терялся прогресс при входе со второго устройства). */
const save=()=>{if(!window.__cloudPending)S.ts=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}if(window.__onSave)window.__onSave(S)};
const dstr=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>dstr(new Date());
const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5);
const streakNow=()=>S.lastDay&&daysBetween(S.lastDay,today())<=1?S.streak:0;
const todayXP=()=>S.daily[today()]||0;
function hearts(){if(S.hearts>=MAXH){S.heartsTs=Date.now();return MAXH}const n=Math.floor((Date.now()-S.heartsTs)/REGEN);if(n>0){S.hearts=Math.min(MAXH,S.hearts+n);S.heartsTs+=n*REGEN;save()}return S.hearts}
function addXP(n){S.xp+=n;const t=today();S.daily[t]=(S.daily[t]||0)+n;
  /* Часы перевели назад или сменился часовой пояс (последний день занятий «в будущем») — серию не трогаем */
  const gap=S.lastDay?daysBetween(S.lastDay,t):null;
  if(gap===null||gap>1){S.streak=1;S.lastDay=t}else if(gap===1){S.streak++;S.lastDay=t}else if(!S.streak)S.streak=1;
  S.best=Math.max(S.best||0,S.streak);save()}
const level=()=>Math.floor(S.xp/100)+1;
const unlocked=i=>S.unlockAll||i===0||!!S.done[LESSONS[i].id]||LESSONS.slice(0,i).every(l=>S.done[l.id]);
function checkAch(){const n=[];ACH.forEach(a=>{if(!S.ach[a.id]&&a.ok()){S.ach[a.id]=today();n.push(a)}});save();return n}
