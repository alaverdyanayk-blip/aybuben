/* Мелкие помощники: поиск элементов, экранирование, перемешивание, склонение числительных. */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=a=>a[Math.random()*a.length|0];
const sample=(a,n)=>shuffle(a).slice(0,n);
const uniq=a=>[...new Set(a)];
const tipOf=l=>l.tip||`Как русское «${l.s}».`;
function bd(word,k){return '<div class="bd">'+units(word).map((u,i)=>{const L=BY[u];if(!L)return '';let s=L.s;if(u==='ե'||u==='ո')s=i===0?(u==='ե'?'йе':'во'):(u==='ե'?'е':'о');if(u==='և')s=i===0?'йев':'ев';const g=i===0&&word[0]!==word[0].toLowerCase()?L.U:u;return `<span class="${u===k?'hl':''}"><b>${esc(g)}</b><i>${esc(s)}</i></span>`}).join('')+'</div>'}
function hl(word,k){let i=0,o='';for(const u of units(word)){const raw=word.slice(i,i+u.length);i+=u.length;o+=u===k?`<mark>${esc(raw)}</mark>`:esc(raw)}return o}
function half(arr){const h=Math.ceil(arr.length/2);return [arr.slice(0,h),arr.slice(h)]}
function plural(n,a,b,c){const m=n%10,h=n%100;return m===1&&h!==11?a:m>=2&&m<=4&&(h<12||h>14)?b:c}
