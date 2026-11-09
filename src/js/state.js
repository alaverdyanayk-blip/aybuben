/* Состояние и прогресс: сохранение, XP, серия, сердца, уровни. */
const KEY='aybuben-v2',REGEN=30*60*1000,MAXH=5;
let S={xp:0,daily:{},streak:0,lastDay:null,best:0,hearts:MAXH,heartsTs:Date.now(),done:{},goal:20,ach:{},sound:true,unlockAll:false,read:0,perfect:0,games:{},phr:{},mem:{},memV:0};
const S0=JSON.parse(JSON.stringify(S));
try{const r=localStorage.getItem(KEY);if(r)Object.assign(S,JSON.parse(r))}catch(e){}
// Защита от повреждённого сохранения: неверные типы возвращаем к значениям по умолчанию
function fixState(){try{for(const k in S0){const v=S[k],d=S0[k];if(d!==null&&(v==null||typeof v!==typeof d||Array.isArray(v)!==Array.isArray(d)||(typeof d==='number'&&!isFinite(v))))S[k]=JSON.parse(JSON.stringify(d))}
  S.hearts=Math.max(0,Math.min(MAXH,S.hearts|0));S.xp=Math.max(0,S.xp|0);
  if(S.outfit!=null&&typeof S.outfit!=='string')S.outfit=null;migrateAbc();try{seedMem()}catch(e){}}catch(e){}}
/* Пересчёт прогресса алфавита из прежнего порядка букв: по старым отметкам (a1a…a6w) узнаём,
   какие буквы человек уже прошёл, и отмечаем новые уроки, где все буквы ему знакомы. Отметки только добавляются. */
/* старый пользователь, которому после смены порядка букв надо допройти урок: дальше по пути уже есть пройденные уроки алфавита */
const updGap=gi=>!!LESSONS[gi].abc&&Object.keys(S.done).some(k=>/^a[1-6][abw]$/.test(k))&&LESSONS.slice(gi+1).some(l=>l.abc&&S.done[l.id]);
function migrateAbc(){const d=S.done;const old=Object.keys(d).filter(k=>/^a[1-6][abw]$/.test(k));if(!old.length)return;
  const known=new Set();old.forEach(id=>{const g=OLD_GROUPS[+id[1]-1];let ks=g;if(g.length>3&&id[2]!=='w'){const [a,b]=half(g);ks=id[2]==='a'?a:b}ks.forEach(k=>known.add(k))});
  LESSONS.forEach(l=>{if(l.abc&&!d[l.id]&&l.abc.every(k=>known.has(k)))d[l.id]=1})}
window.fixState=fixState;
fixState();
const save=()=>{S.ts=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}if(window.__onSave)window.__onSave(S)};
const dstr=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>dstr(new Date());
const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5);
const streakNow=()=>S.lastDay&&daysBetween(S.lastDay,today())<=1?S.streak:0;
const todayXP=()=>S.daily[today()]||0;
function hearts(){if(S.hearts>=MAXH){S.heartsTs=Date.now();return MAXH}const n=Math.floor((Date.now()-S.heartsTs)/REGEN);if(n>0){S.hearts=Math.min(MAXH,S.hearts+n);S.heartsTs+=n*REGEN;save()}return S.hearts}
function addXP(n){S.xp+=n;const t=today();S.daily[t]=(S.daily[t]||0)+n;
  if(S.lastDay!==t){S.streak=S.lastDay&&daysBetween(S.lastDay,t)===1?S.streak+1:1;S.lastDay=t}
  S.best=Math.max(S.best||0,S.streak);save()}
const level=()=>Math.floor(S.xp/100)+1;
const unlocked=i=>S.unlockAll||i===0||!!S.done[LESSONS[i].id]||LESSONS.slice(0,i).every(l=>S.done[l.id]);
function checkAch(){const n=[];ACH.forEach(a=>{if(!S.ach[a.id]&&a.ok()){S.ach[a.id]=today();n.push(a)}});save();return n}
