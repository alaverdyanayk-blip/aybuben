/* Память: интервальные повторения (период полураспада для каждой буквы и слова). */
/* ================= ПАМЯТЬ: умное повторение =================
   Для каждого слова и буквы храним [период полураспада памяти в днях, время последнего ответа в секундах].
   Вероятность вспомнить p = 2^(−прошло/период). Повторять пора, когда p < 0,5.
   Верный ответ удлиняет период, ошибка — сокращает (как модель half-life regression у Duolingo, только проще). */
const nowS=()=>Date.now()/1000|0;
function memUpdate(key,ok){if(!key)return;const t=nowS(),m=S.mem[key];let h;
  if(!m)h=ok?1:0.3;else{const el=(t-m[1])/86400;h=m[0];h=ok?Math.min(180,h*(el>=h*0.5?2.2:1.2)):Math.max(0.2,h*0.4)}
  S.mem[key]=[+h.toFixed(2),t]}
const recall=m=>Math.pow(2,-((nowS()-m[1])/86400)/Math.max(0.05,m[0]));
function dueKeys(){const kn=learnedSet();return Object.keys(S.mem).filter(k=>Array.isArray(S.mem[k])&&recall(S.mem[k])<0.5&&(k[0]==='#'?kn.has(k.slice(1)):(WORDS.find(w=>w.a===k)&&readable(WORDS.find(w=>w.a===k),kn)))).sort((a,b)=>recall(S.mem[a])-recall(S.mem[b]))}
function learnedSet(){return new Set(LETTERS.filter(letterLearned).map(l=>l.k))}
function reviewEx(key){const kn=learnedSet(),lp=LETTERS.filter(x=>kn.has(x.k));
  if(key[0]==='#'){const l=BY[key.slice(1)];if(!l)return null;const st=lp.length>=4;return Math.random()<.5?qS2L(l,st?lp:LETTERS,st):qL2S(l,st?lp:LETTERS,st)}
  const w=WORDS.find(x=>x.a===key);if(!w)return null;const pool=WORDS.filter(x=>readable(x,kn)),pl=pool.length>=6?pool:WORDS;
  const f=[()=>qRead(w,pl),()=>qWrite(w,pl)];if(hasAudio(w.a)){f.push(()=>qListen(w,pl));if(w.u.length<=8)f.push(()=>qDict(w,lp.length>=4?lp:LETTERS))}
  return pick(f)()}
/* Для тех, кто учился до появления памяти: всё пройденное считаем «виденным», чтобы повторение сразу заработало */
function seedMem(){/* идемпотентно: только добавляет недостающие, старые записи не трогает (нужно и после восстановления из облака) */const t=nowS(),kn=new Set();
  LESSONS.forEach(l=>{if(l.abc&&S.done[l.id]&&!/w$/.test(l.id))l.abc.forEach(k=>kn.add(k))});
  kn.forEach(k=>{S.mem['#'+k]=S.mem['#'+k]||[+(2+Math.random()*5).toFixed(2),t-86400*(1+Math.random()*3)|0]});
  const ws=new Set();LESSONS.forEach(l=>{if(!S.done[l.id])return;if(l.abc&&/w$/.test(l.id))WORDS.filter(w=>readable(w,kn)).forEach(w=>ws.add(w));if(l.th)l.th.words.forEach(w=>ws.add(w))});
  ws.forEach(w=>{if(readable(w,kn))S.mem[w.a]=S.mem[w.a]||[+(1.5+Math.random()*6).toFixed(2),t-86400*(1+Math.random()*3)|0]});S.memV=1}
try{seedMem()}catch(e){}
