/* Конструкторы упражнений и генераторы уроков алфавита и словарных тем. */
const CH=(prompt,big,correct,wrong,o={})=>({type:'choice',prompt,big,correct,options:uniq([correct,...wrong]).slice(0,4),...o});
const PR=(word,correct,wrong,explain)=>CH('Как это читается?',word,correct,wrong,{bigCls:'word',explain});
const FL=(sent,ru,correct,wrong,explain)=>CH('Вставьте пропуск',sent,correct,wrong,{bigCls:'sent',sub:ru,optArm:true,explain});
const BD=(ru,ans,extra,alts=[],explain)=>({type:'build',prompt:'Переведите на армянский',sub:ru,tiles:[...ans.split(' '),...extra],answers:[ans,...alts].map(s=>s.split(' ')),joiner:' ',explain,show:ans});
const MT=pairs=>({type:'match',pairs});
const LIT=(col,lit,ru,wrong)=>CH('Как сказать на литературном языке?',col,lit,[col,...wrong],{bigCls:'word',sub:ru,optArm:true,explain:`Разговорное <span class="a">${esc(col)}</span> → литературное <span class="a">${esc(lit)}</span>`});
const lettersUpTo=n=>LETTERS.filter(l=>l.L<=n);
const wordsUpTo=n=>WORDS.filter(w=>w.L<=n);
function sndOpts(l,pool,strict){const out=[];if(l.p&&BY[l.p]&&(!strict||pool.includes(BY[l.p])))out.push(BY[l.p].s);for(const x of shuffle(strict||pool.length>=4?pool:LETTERS))if(x.s!==l.s&&!out.includes(x.s))out.push(x.s);return out.slice(0,3)}
function letOpts(l,pool,strict){const out=[];if(l.p&&BY[l.p]&&(!strict||pool.includes(BY[l.p])))out.push(BY[l.p]);for(const x of shuffle(strict||pool.length>=4?pool:LETTERS))if(x!==l&&!out.includes(x)&&x.s!==l.s)out.push(x);return out.slice(0,3)}
function qL2S(l,pool,strict){const up=l.U!==l.k&&l.U.length===1&&Math.random()<.5;return CH('Как читается эта буква?',up?l.U:l.k,l.s,sndOpts(l,pool,strict),{item:'#'+l.k,bigCls:'glyph',explain:esc(tipOf(l))})}
function qS2L(l,pool,strict){const up=Math.random()<.5&&l.U!=='և';const d=x=>up&&x.U!=='և'?x.U:x.k;return CH('Какая буква даёт этот звук?',l.s,d(l),letOpts(l,pool,strict).map(d),{item:'#'+l.k,bigCls:'snd',optArm:true,explain:`<span class="a">${l.U}${l.U!==l.k?' '+l.k:''}</span> — «${esc(l.s)}»`})}
/* Заглавная ↔ строчная: многие пары выглядят по-разному (Ք/ք, Ե/ե, Ղ/ղ), их надо узнавать в обе стороны */
const caseable=l=>l.U!==l.k&&l.k!=='և';
function qCase(l,pool){const up=Math.random()<.5,src=(pool.filter(caseable).length>=4?pool:LETTERS).filter(x=>caseable(x)&&x!==l);
  const wr=shuffle(src).slice(0,3);
  return CH(up?'Найдите строчную пару':'Найдите заглавную пару',up?l.U:l.k,up?l.k:l.U,wr.map(x=>up?x.k:x.U),{item:'#'+l.k,bigCls:'glyph',optArm:true,explain:`<span class="a">${l.U} ${l.k}</span> — одна и та же буква, «${esc(l.s)}»`})}
function caseMatch(group,pool){const g=group.filter(caseable),rest=shuffle(pool.filter(x=>caseable(x)&&!g.includes(x)));const ls=[...g,...rest].slice(0,4);
  return ls.length>=3?MT(ls.map(l=>[l.U,l.k])):null}
function senses(m){const out=new Set(m.toLowerCase().split(/[,;]/).map(x=>x.replace(/\(.*?\)/g,'').trim()).filter(Boolean));for(const g of SYN)if(g.some(x=>out.has(x)))g.forEach(x=>out.add(x));return out}
function clash(a,b){if(a===b)return true;const A=senses(a);for(const x of senses(b))if(A.has(x))return true;return false}
function pairsOf(ws,n){const out=[],ms=[];for(const w of shuffle(ws)){if(out.length>=n)break;if(ms.some(m=>clash(m,w.m)))continue;ms.push(w.m);out.push([w.a,w.m])}return out}
function qRead(w,pool,strict){const wr=uniq(shuffle(strict||pool.length>=6?pool:WORDS).filter(x=>!clash(x.m,w.m)).map(x=>x.m)).slice(0,3);return CH('Что значит это слово?',w.a,w.m,wr,{item:w.a,bigCls:'word',tag:'read',explain:`читается «${esc(w.r)}»`,after:bd(w.a)})}
function qWrite(w,pool){const wr=uniq(shuffle(pool.length>=6?pool:WORDS).filter(x=>x.a!==w.a&&!clash(x.m,w.m)).map(x=>x.a)).slice(0,3);return CH(`Как пишется «${w.m}»?`,w.r,w.a,wr,{item:w.a,bigCls:'snd',optArm:true,explain:`<span class="a">${esc(w.a)}</span> — ${esc(w.m)}`})}
const sameSound=w=>{const n=x=>x.toLowerCase().replace(/\(.*?\)/g,'').replace(/[ʰ\s]/g,'').replace(/һ/g,'х').replace(/ё/g,'е').trim();return n(w.r)===n(w.m)};
function qBuildWord(w,lp){const extra=sample(lp.filter(l=>!w.u.includes(l.k)),2).map(l=>l.k);return {type:'build',prompt:'Напишите армянскими буквами',sub:sameSound(w)?w.m:`${w.m} — звучит «${w.r}»`,tiles:[...w.u,...extra],answers:[w.u],joiner:'',letters:true,show:w.a,tag:'read',item:w.a}}
/* Диктант: слышим знакомое слово и собираем его из букв — главный навык для тех, кто говорит, но не пишет */
function qDict(w,lp){const extra=sample(lp.filter(l=>!w.u.includes(l.k)),2).map(l=>l.k);return {type:'build',prompt:'Напишите, что услышали',listen:w.a,tiles:[...w.u,...extra],answers:[w.u],joiner:'',letters:true,show:w.a,tag:'read',item:w.a,explain:`<span class="a">${esc(w.a)}</span> — ${esc(w.m)}`}}
const readable=(w,known)=>w.u.every(u=>known.has(u));
function pickExample(l,known){const c=[...WORDS,...EXTRA_EX].filter(w=>w.u.includes(l.k)&&readable(w,known));
  if(!c.length)return null;const st=w=>w.u[0]===l.k?1:0,amb=w=>w.a==='մարտ'?1:0;c.sort((a,b)=>(amb(a)-amb(b))||(hasAudio(b.a)-hasAudio(a.a))||(st(b)-st(a))||(Math.abs(a.u.length-4)-Math.abs(b.u.length-4)));return c[0]}
function syllables(l,known){const V=['ա','ե','ի','ո','ու','օ','է','ը'];const kv=V.filter(v=>known.has(v)),kc=[...known].filter(c=>!V.includes(c)&&c!=='և');
  const out=[];if(V.includes(l.k)){kc.slice(0,3).forEach(c=>out.push(c+l.k))}else{kv.slice(0,2).forEach(v=>{out.push(l.k+v);out.push(v+l.k)})}
  return out.slice(0,4)}
function genLetters(group){
  return ()=>{const before=LETTERS.slice(0,LETTERS.indexOf(group[0])),known=new Set(before.map(l=>l.k));const pool=[...before,...group];const items=[];
    group.forEach(l=>{known.add(l.k);const ex=pickExample(l,known);items.push({type:'letter',l,ex,syl:ex?null:syllables(l,known)});items.push(qL2S(l,pool,true))});
    shuffle(group).forEach(l=>items.push(Math.random()<.5?qS2L(l,pool,true):qL2S(l,pool,true)));
    const cm=caseMatch(group,pool);if(cm)items.push(cm);const cl=group.filter(caseable);if(cl.length)items.push(qCase(pick(cl),pool));
    const okW=WORDS.filter(w=>readable(w,known)),ws=okW.filter(w=>w.u.some(u=>group.some(g=>g.k===u)));
    if(okW.length>=3){sample(ws,2).forEach(w=>items.push(qRead(w,okW,true)));
      sample(ws.filter(w=>hasAudio(w.a)),1).forEach(w=>items.push(qListen(w,okW,true)))}
    return items}
}
function qListen(w,pool,strict){const wr=uniq(shuffle(strict||pool.length>=6?pool:WORDS).filter(x=>x.a!==w.a&&!clash(x.m,w.m)).sort((a,b)=>Math.abs(a.u.length-w.u.length)-Math.abs(b.u.length-w.u.length)).slice(0,6).map(x=>x.a)).slice(0,3);
  return CH('Что вы услышали?','',w.a,wr,{item:w.a,listen:w.a,optArm:true,tag:'read',explain:`<span class="a">${esc(w.a)}</span> — ${esc(w.m)}`})}
function genWords(n){
  return ()=>{const pool=wordsUpTo(n),fresh=pool.filter(w=>w.L===n),lp=lettersUpTo(n);
    const pickW=k=>{const a=sample(fresh,Math.ceil(k*.6));return uniq([...a,...sample(pool,k)]).slice(0,k)};
    const items=[];
    items.push(MT(pairsOf(pool,4)));
    pickW(2).forEach(w=>items.push(qRead(w,pool)));
    pickW(1).forEach(w=>items.push(qWrite(w,pool)));
    sample(pool.filter(w=>hasAudio(w.a)),2).forEach(w=>items.push(qListen(w,pool)));
    const da=pickW(5).filter(w=>hasAudio(w.a)&&w.u.length<=8).slice(0,2);da.forEach(w=>items.push(qDict(w,lp)));
    pickW(3).filter(w=>w.u.length<=8&&!da.includes(w)).slice(0,2).forEach(w=>items.push(qBuildWord(w,lp)));
    items.push(MT(pairsOf(pool,5)));
    return [items[0],...shuffle(items.slice(1,-1)),items[items.length-1]]}
}
function vocabCard(ws){return `<p>Новые слова этого урока. Прочитайте каждое вслух, потом проверим.</p><div class="tw"><table class="vtab">${ws.map(w=>`<tr><td class="a">${esc(w.a)}</td><td>${spk(w.a,'sm')}</td><td class="vr">${esc(w.r)}</td><td>${esc(w.m)}</td></tr>`).join('')}</table></div>`}
function genTheme(th,part){
  return ()=>{const all=th.words,h=Math.ceil(all.length/2),mine=part===1?all.slice(0,h):part===2?all.slice(h):all;
    const pool=all.length>=6?all:WORDS,lp=LETTERS,items=[];
    const pairs=n=>pairsOf(mine,n);
    if(part!==3)items.push({type:'teach',title:`${th.t}: новые слова`,html:vocabCard(mine)});
    items.push(MT(pairs(4)));
    sample(mine,3).forEach(w=>items.push(qRead(w,pool)));
    sample(mine,1).forEach(w=>items.push(qWrite(w,pool)));
    sample(mine.filter(w=>hasAudio(w.a)),2).forEach(w=>items.push(qListen(w,pool)));
    const da=sample(mine.filter(w=>hasAudio(w.a)&&w.u.length<=9),2);da.forEach(w=>items.push(qDict(w,lp)));
    sample(mine.filter(w=>w.u.length<=9&&!da.includes(w)),1).forEach(w=>items.push(qBuildWord(w,lp)));
    items.push(MT(pairs(5)));
    const head=items[0].type==='teach'?[items[0],items[1]]:[items[0]];
    return [...head,...shuffle(items.slice(head.length,-1)),items[items.length-1]]}
}
