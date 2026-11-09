const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.route(/telegram\.org|workers\.dev/,r=>r.fulfill({body:''}));
await p.goto('http://127.0.0.1:8765/index.html');await p.waitForTimeout(600);
const data=await p.evaluate(()=>({w:WORDS.map(w=>[w.a,w.r,w.m]),ex:EXTRA_EX.map(w=>[w.a,w.r,w.m]),ph:PHR.flatMap(P=>P.ph.map(x=>[x[0],x[1],x[2]]))}));
const M={'ա':'а','բ':'б','գ':'г','դ':'д','ե':'е','զ':'з','է':'э','ը':'ы','թ':'тʰ','ժ':'ж','ի':'и','լ':'л','խ':'х','ծ':'ц','կ':'к','հ':'һ','ձ':'дз','ղ':'гъ','ճ':'ч','մ':'м','յ':'й','ն':'н','շ':'ш','ո':'о','չ':'чʰ','պ':'п','ջ':'дж','ռ':'рр','ս':'с','վ':'в','տ':'т','ր':'р','ց':'цʰ','փ':'пʰ','ք':'кʰ','և':'ев','օ':'о','ֆ':'ф'};
const COP=new Set(['եմ','ես','ենք','եք','են']);
function tr(word){let s=word.toLowerCase().replace(/ու/g,'U');let o='';for(let i=0;i<s.length;i++){const c=s[i];
  if(c==='U'){o+='у';continue}
  if(i===0&&c==='ե'&&!COP.has(word.toLowerCase())){o+='йе';continue}
  if(i===0&&c==='ո'&&!/^ով(քեր)?$/.test(word.toLowerCase())){o+='во';continue}
  if(i===0&&c==='և'){o+='йев';continue}
  o+=(M[c]!==undefined?M[c]:c)}return o}
const norm=s=>s.toLowerCase().replace(/я/g,'йа').replace(/ю/g,'йу').replace(/ё/g,'йо').replace(/ы/g,'').replace(/[«»"՞՛՜։:,.!?…\-–—]/g,' ').replace(/\s+/g,' ').trim();
const out=[];const chk=(a,r,m,src)=>{const exp=a.split(/\s+/).map(w=>w.replace(/[՞՛՜։:,.!?…«»]/g,'')).filter(Boolean).map(tr).join(' ');if(norm(exp)!==norm(r))out.push(src+' | '+a+' | есть: '+r+' | по буквам: '+exp+' | '+m)};
data.w.forEach(x=>chk(...x,'W'));data.ex.forEach(x=>chk(...x,'X'));data.ph.forEach(x=>chk(...x,'P'));
console.log('слов',data.w.length,'примеров',data.ex.length,'фраз',data.ph.length,'расхождений',out.length);console.log(out.join('\n'));await b.close()})();
