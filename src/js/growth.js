/* Друзья, «Что нового», напоминания. */
const TGW=(window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initData)?Telegram.WebApp:null;
const BOT='aybubenHAY_bot';
function streakMile(){const n=streakNow();S.miles=S.miles||{};if(!MILES[n]||S.miles[n])return '';S.miles[n]=today();
  return `<div class="unlock mile"><b>🔥 ${n} ${plural(n,'день','дня','дней')} подряд!</b><p style="margin:0">${MILES[n]}</p></div>`}
function api(path,data){return window.__api?window.__api(path,data||{}):Promise.reject(new Error('offline'))}
/* приглашения */
function refMe(){return api('/r/me').then(j=>{if(!j||!j.code)return;const before=S.friends||0;S.refCode=j.code;
  if(j.friends>before){S.friends=j.friends;save();const got=REFC.filter(c=>c.n>before&&c.n<=j.friends);if(got.length)friendSheet(got[got.length-1]);else if(location.hash.slice(1)==='profile')renderProfile()}else save()}).catch(()=>{})}
function refClaim(){api('/r/claim',{code:S.refBy}).then(j=>{if(j&&(j.ok||j.reason)){S.refClaimed=1;save()}}).catch(()=>{})}
function friendSheet(c){const s=sheet(`<div class="end" style="padding:0">${mascot('cheer','m-jump',c.id)}<h2>Друг прошёл первый урок!</h2><div class="bubble">Циро получил костюм <b>«${esc(c.t)}»</b>. ${esc(c.d)}.</div><div class="btns two" style="width:100%"><button class="btn" data-wear2="${c.id}">Надеть</button><button class="btn plain" data-close>Потом</button></div></div>`);
  s.el.querySelector('[data-wear2]').onclick=()=>{S.outfit=c.id;save();s.close();route()};confetti()}
function inviteLink(){return `https://t.me/${BOT}?startapp=r${S.refCode}`}
const INV_TEXT='Учу читать по-армянски с абрикосом Циро 🍑 Присоединяйся — тебе сразу костюм для Циро!';
/* Без кода (нет связи с сервером) зовём просто в бота — друг не засчитается, но ссылка рабочая. */
function invite(btn){const go=()=>{
   const link=S.refCode?inviteLink():`https://t.me/${BOT}`;
   if(TGW&&TGW.openTelegramLink)TGW.openTelegramLink('https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent(INV_TEXT));
   else if(navigator.share)navigator.share({text:INV_TEXT,url:link}).catch(()=>{});
   else{try{navigator.clipboard.writeText(INV_TEXT+' '+link).then(()=>{if(btn)btn.textContent='Ссылка скопирована'}).catch(()=>{})}catch(e){}}};
  S.refCode?go():refMe().then(go)}
function nextTier(){return REFC.find(c=>c.n>(S.friends||0))}
function inviteBox(){const f=S.friends||0,nt=nextTier();
  return `<div class="box invite"><h3>Пригласить родственника или друга</h3><div class="ciro-say">${mascot('wink','m-idle','family')}<div class="bubble"><p>Кто в вашей семье тоже не умеет читать по-армянски? Только честно. Когда друг пройдёт первый урок, Циро получит костюм, а друг — свой сразу.</p></div></div>
   <p class="note">${f?`Пришло друзей: <b>${f}</b>. `:''}${nt?`До костюма «${esc(nt.t)}»: ${nt.n-f} ${plural(nt.n-f,'друг','друга','друзей')}.`:'Все костюмы за друзей собраны!'}</p>
   <button class="btn" data-invite>Пригласить</button></div>`}
function inviteNudge(){const nt=nextTier();if(!nt)return '';return `<button class="link" data-invite style="font-size:14px">Пригласить друга — костюм «${esc(nt.t)}» для Циро</button>`}
/* «Что нового» — один раз для тех, кто занимался до обновления */
const NEWS_ID='growth1';
/* показываем один раз: отметка ставится сразу при показе, до конца этого открытия карточка видна, потом — никогда */
let NEWS_NOW=false,NEWS_CLOSED=false;
function whatsNew(){if(NEWS_CLOSED)return '';if(S.newsSeen===NEWS_ID&&!NEWS_NOW)return '';if(!Object.keys(S.done).length&&!(S.xp>0)){S.newsSeen=NEWS_ID;return ''}
  if(!NEWS_NOW){NEWS_NOW=true;S.newsSeen=NEWS_ID;save()}
  const can=!!(TGW&&TGW.requestWriteAccess&&!(S.notif&&S.notif.on));
  return `<section class="news-card"><button class="x" data-news-x aria-label="Закрыть">✕</button><div class="ciro-say stack">${mascot('cheer','m-idle','family')}<div class="bubble"><p><b>Я обновился!</b> Пригласите родственника или друга — получите костюмы для меня. И я теперь могу напоминать о себе в Телеграме${can?'':' — включается в профиле'}.</p>
   <div class="btns">${can?'<button class="btn" data-news-nt>Включить напоминания</button>':''}<button class="btn plain" data-invite>Пригласить друга</button></div></div></div></section>`}
function wireNews(){const done=()=>{NEWS_CLOSED=true;const c=$('.news-card');c&&c.remove()};
  const x=$('[data-news-x]');if(x)x.onclick=done;
  const nt=$('[data-news-nt]');if(nt)nt.onclick=()=>enableNotif(ok=>{const b=$('.news-card .bubble');if(b)b.innerHTML=ok?'<p>Договорились! 🍑 Не чаще раза в день. Выключить можно в профиле.</p>':'<p>Хорошо, не буду. Если передумаете — включите в профиле.</p>';S.newsSeen=NEWS_ID;save();setTimeout(done,2500)});
  document.querySelectorAll('.news-card [data-invite]').forEach(b=>b.onclick=()=>{invite(b);S.newsSeen=NEWS_ID;save()})}
/* напоминания */
function askNotif(){if(!TGW||!TGW.requestWriteAccess||S.notif)return '';
  return `<div class="bubble" id="ask-nt" style="text-align:left"><p>Можно я буду иногда напоминать о себе в Телеграме? Обещаю без спама — не чаще раза в день.</p><div class="btns two"><button class="btn" data-nt="1">Да</button><button class="btn plain" data-nt="0">Не надо</button></div></div>`}
function enableNotif(done){if(!TGW||!TGW.requestWriteAccess){done&&done(false);return}
  try{TGW.requestWriteAccess(ok=>{S.notif=Object.assign({hour:null,freq:1},S.notif||{},{on:!!ok});save();syncU(true,true);done&&done(!!ok)})}catch(e){done&&done(false)}}
const NT_HOURS=[null,9,12,15,18,19,20,21];
function notifRow(){const n=S.notif||{},on=!!(TGW&&n.on),can=!!(TGW&&TGW.requestWriteAccess);
  return `<div class="toggle"><span>Напоминания в Телеграме<br><span class="note">${can?'Не чаще раза в день и только если вы ещё не занимались':'Работают, когда приложение открыто в Телеграме'}</span></span><button class="switch" role="switch" id="sw-nt" aria-checked="${on}" aria-label="Напоминания" ${can?'':'disabled'}></button></div>
   ${on?`<div class="nt-opts"><div class="label">Во сколько</div><div class="chips" style="justify-content:flex-start">${NT_HOURS.map(h=>`<button class="chip2" data-nh="${h==null?'':h}" aria-pressed="${(n.hour??null)===h}">${h==null?'Когда обычно занимаюсь':h+':00'}</button>`).join('')}</div>
   <div class="label">Как часто</div><div class="chips" style="justify-content:flex-start">${[[1,'Каждый день'],[3,'Раз в 3 дня']].map(([v,t])=>`<button class="chip2" data-nf="${v}" aria-pressed="${(n.freq||1)===v}">${t}</button>`).join('')}</div></div>`:''}`}
function wireGrowth(){
  document.querySelectorAll('[data-invite]').forEach(b=>b.onclick=()=>invite(b));
  document.querySelectorAll('[data-nt]').forEach(b=>b.onclick=()=>{const box=$('#ask-nt');
    if(b.dataset.nt==='1')enableNotif(ok=>{if(box)box.innerHTML=ok?'<p>Договорились! 🍑 Выключить можно в профиле или кнопкой под сообщением.</p>':'<p>Хорошо, не буду. Если передумаете — включите в профиле.</p>'});
    else{S.notif={on:false,freq:1,hour:null};save();syncU(true,true);if(box)box.innerHTML='<p>Хорошо, не буду. Если передумаете — включите в профиле.</p>'}});
  const sw=$('#sw-nt');if(sw)sw.onclick=()=>{if(S.notif&&S.notif.on){S.notif.on=false;save();syncU(true,true);renderProfile()}else enableNotif(()=>renderProfile())};
  document.querySelectorAll('[data-nh]').forEach(b=>b.onclick=()=>{S.notif.hour=b.dataset.nh===''?null:+b.dataset.nh;save();syncU(true,true);renderProfile()});
  document.querySelectorAll('[data-nf]').forEach(b=>b.onclick=()=>{S.notif.freq=+b.dataset.nf;save();syncU(true,true);renderProfile()});
}
function prefHour(){const h=S.hrs||{},ks=Object.keys(h);if(ks.reduce((a,k)=>a+h[k],0)<3)return null;return +ks.sort((a,b)=>h[b]-h[a])[0]}
/* explicit=true — человек сам поменял настройки в приложении; иначе сервер главнее (кнопки «Реже» / «Не напоминать» в боте) */
let syncT,syncX=false;
function syncU(now,explicit){if(!TGW)return;if(explicit)syncX=true;clearTimeout(syncT);syncT=setTimeout(()=>{const x=syncX;syncX=false;
  api('/u',Object.assign({streak:streakNow(),day:S.lastDay,tz:-new Date().getTimezoneOffset(),hour:prefHour()},x?{notif:S.notif||{on:false}}:{})).then(j=>{
   if(!j||!j.ok||!S.notif)return;const n=S.notif,ch=n.on!==j.on||(n.freq||1)!==j.freq||(n.hour??null)!==(j.hour??null);
   if(ch){n.on=j.on;n.freq=j.freq;n.hour=j.hour??null;save();if(location.hash.slice(1)==='profile')renderProfile()}}).catch(()=>{})},now?50:1500)}
/* старт: метка приглашения, «Заниматься 2 минуты» из бота */
(function(){
  const sp=(TGW&&TGW.initDataUnsafe&&TGW.initDataUnsafe.start_param)||'';
  if(/^r[a-z0-9]{6,16}$/.test(sp)&&!S.refBy&&!Object.keys(S.done).length&&(S.xp||0)<60){S.refBy=sp.slice(1);save()}
  setTimeout(()=>{refMe();syncU(true)},1500);
  if(location.hash==='#go'||sp==='go'){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
    setTimeout(()=>{if(LS)return;const i=LESSONS.findIndex((l,i)=>unlocked(i)&&!S.done[l.id]);if(i<0)startPractice();else if(hearts()>0)startLesson(LESSONS[i],false)},400)}
})();
