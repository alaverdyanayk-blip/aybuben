/* Звук: сигналы интерфейса и озвучка слов. */
let AC=null;
function tone(seq){if(!S.sound)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state!=='running'&&AC.resume)AC.resume();let t=AC.currentTime;seq.forEach(([f,d])=>{const o=AC.createOscillator(),g=AC.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.09,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d);t+=d*.8})}catch(e){}}
const akey=t=>String(t).replace(/։/g,'').trim().toLowerCase();
function fnv(t){let h=0x811C9DC5;for(const ch of t){h^=ch.codePointAt(0);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')}
const hasAudio=t=>t!=null&&AUDIO_KEYS.has(akey(t));
let curAud=null;
const PLAYER=new Audio();
PLAYER.preload='auto';
let audioReady=false;
function unlockAudio(){if(audioReady){try{if(AC&&AC.state!=='running')AC.resume()}catch(e){}return}audioReady=true;
  try{PLAYER.src='data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAABAAAAlgAenp6enp6enp6enp6enp6enp6enp6enp6pqampqampqampqampqampqampqampqamptPT09PT09PT09PT09PT09PT09PT09PT09P/////////////////////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQCcQAAAAAAAAJY+/rsqgAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';PLAYER.play().then(()=>PLAYER.pause()).catch(()=>{})}catch(e){}
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}catch(e){}}
document.addEventListener('pointerdown',unlockAudio,{capture:true,once:false});
/* на сайте бота записи лежат рядом; в превью (claude.ai) берём их с сайта, при ошибке — из файлов превью */
let AUD_BASE=/github\.io|localhost|127\.0\.0\.1/.test(location.hostname)?'audio/':'https://alaverdyanayk-blip.github.io/aybuben/audio/';
let AUD_PACK=null;
if(AUD_BASE!=='audio/')fetch('audio-pack.json').then(r=>r.ok?r.json():null).then(j=>{AUD_PACK=j}).catch(()=>{});
function say(t,rate=1){if(!hasAudio(t))return false;try{if(curAud){curAud.pause();curAud.dispatchEvent(new Event('ended'))}const a=PLAYER;a.pause();const f=fnv(akey(t))+'.mp3';a.src=AUD_PACK&&AUD_PACK[f]?'data:audio/mpeg;base64,'+AUD_PACK[f]:AUD_BASE+f;a.onerror=()=>{if(AUD_BASE!=='audio/'){AUD_BASE='audio/';a.src=AUD_BASE+f;a.play().catch(()=>{})}};a.playbackRate=rate;a.defaultPlaybackRate=rate;curAud=a;
  const btns=[...document.querySelectorAll('.spk')].filter(b=>b.dataset.say===t);btns.forEach(b=>b.classList.add('playing'));
  const off=()=>btns.forEach(b=>b.classList.remove('playing'));a.onended=off;a.onpause=off;
  a.play().catch(()=>btns.forEach(b=>b.classList.remove('playing')));return true}catch(e){return false}}
const SPK_SVG='<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" focusable="false"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function spk(t,cls=''){return hasAudio(t)?`<button class="spk ${cls}" data-say="${esc(t)}" aria-label="Послушать">${SPK_SVG}</button>`:''}
function spkSlow(t){return hasAudio(t)?`<button class="spk slow" data-say="${esc(t)}" data-rate="0.7" aria-label="Послушать медленно"><b>0,7×</b><span>медленно</span></button>`:''}
document.addEventListener('click',e=>{const b=e.target.closest('.spk');if(!b)return;e.stopPropagation();say(b.dataset.say,+(b.dataset.rate||1))},true);
const autoSay=(t,ms=120)=>{if(S.voice!==false)setTimeout(()=>say(t),ms)};
const haptic=t=>{if(window.__haptic)window.__haptic(t)};
const sGood=()=>{tone([[660,.12],[990,.2]]);haptic('ok')},sBad=()=>{tone([[220,.18],[180,.25]]);haptic('bad')},sWin=()=>tone([[523,.14],[659,.14],[784,.14],[1046,.35]]);
