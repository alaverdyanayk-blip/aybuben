/* Пропись: обводка буквы по штрихам с проверкой порядка и направления.
   Данные — STROKES (data/strokes.js): для каждой буквы список штрихов, каждый штрих — SVG-путь в системе координат прописи:
   y: 15 — верх заглавных и высоких букв, 35 — линия строчных, 75 — строка, 92 — низ хвостов; x: 0…w (ширина буквы, w в данных).
   Штрих проверяется сразу после того, как палец оторвался: похож ли он на нужный, в ту ли сторону и тот ли по счёту. */
const TR_N=32;
let _trSvg=null;
function trSample(d,n=TR_N){
  if(!_trSvg){_trSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');_trSvg.setAttribute('width','0');_trSvg.setAttribute('height','0');_trSvg.style.position='absolute';document.body.appendChild(_trSvg)}
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);_trSvg.appendChild(p);
  const L=p.getTotalLength(),pts=[];for(let i=0;i<n;i++){const q=p.getPointAtLength(L*i/(n-1));pts.push([q.x,q.y])}p.remove();return {pts,len:L}}
function trResample(raw,n=TR_N){if(raw.length<2)return Array(n).fill(raw[0]||[0,0]);
  const seg=[0];for(let i=1;i<raw.length;i++)seg.push(seg[i-1]+Math.hypot(raw[i][0]-raw[i-1][0],raw[i][1]-raw[i-1][1]));
  const L=seg[seg.length-1]||1,out=[];let j=0;
  for(let i=0;i<n;i++){const t=L*i/(n-1);while(j<seg.length-2&&seg[j+1]<t)j++;const a=raw[j],b=raw[j+1],f=(t-seg[j])/((seg[j+1]-seg[j])||1);out.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f])}
  return out}
const trMean=(a,b)=>a.reduce((s,p,i)=>s+Math.hypot(p[0]-b[i][0],p[1]-b[i][1]),0)/a.length;
const trLen=a=>a.reduce((s,p,i)=>i?s+Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1]):0,0);
/* Сравнение штриха: 'ok' | 'dir' (в обратную сторону) | 'miss' */
function trJudge(user,exp,tol){const u=trResample(user),e=exp.pts,f=trMean(u,e),r=trMean(u,[...e].reverse());
  const ul=trLen(u),el=exp.len,short=el<14;
  const lenOk=short?ul<el+tol*2.2:(ul>el*0.45&&ul<el*1.9);
  if(short){const c=u.reduce((s,p)=>[s[0]+p[0]/u.length,s[1]+p[1]/u.length],[0,0]),ce=e.reduce((s,p)=>[s[0]+p[0]/e.length,s[1]+p[1]/e.length],[0,0]);
    return Math.hypot(c[0]-ce[0],c[1]-ce[1])<tol*1.3&&lenOk?'ok':'miss'}
  /* короткая перекладина: «туда» и «обратно» почти совпадают по среднему расстоянию — решает, с какого конца начали */
  const d0=Math.hypot(u[0][0]-e[0][0],u[0][1]-e[0][1]),d1=Math.hypot(u[0][0]-e[e.length-1][0],u[0][1]-e[e.length-1][1]);
  if(f<tol&&lenOk&&r<f&&d1<d0&&el>8)return 'dir';
  if(f<tol&&lenOk)return 'ok';if(r<tol&&lenOk&&r<f)return 'dir';return 'miss'}

/* Нарисовать пропись в box (элемент). opts: {key, onDone(mistakes), compact} */
function tracer(box,key,opts={}){const G=STROKES[key];if(!G)return null;
  const w=G.w||70,strokes=G.s.map(d=>({d,...trSample(d)}));
  const ys=strokes.flatMap(s=>s.pts.map(p=>p[1])),TR_TOP=Math.min(...ys,15)-8,TR_BOT=Math.max(...ys,92)+8;
  box.innerHTML=`<div class="tracer"><canvas aria-label="Поле для прописи: обведите букву ${esc(key)} пальцем"></canvas>
    <div class="tr-bar"><span class="tr-msg" role="status" aria-live="polite">Штрих 1 из ${strokes.length}: начните с точки</span>
    <div class="tr-btns"><button class="btn plain sm" data-tr="show">Показать</button><button class="btn plain sm" data-tr="again">Заново</button></div></div></div>`;
  const cv=box.querySelector('canvas'),ctx=cv.getContext('2d'),msg=box.querySelector('.tr-msg');
  let cur=0,mist=0,drawn=[],raw=null,anim=0,done=false,k=1,ox=0,oy=0;
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const P=([x,y])=>[ox+x*k,oy+(y-TR_TOP)*k];
  function fit(){const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;cv.width=r.width*d;cv.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);
    k=Math.min(r.height/(TR_BOT-TR_TOP),r.width/(w+24));ox=(r.width-w*k)/2;oy=(r.height-(TR_BOT-TR_TOP)*k)/2}
  function path(pts,upto=1){const n=Math.max(2,Math.round(pts.length*upto));ctx.beginPath();pts.slice(0,n).forEach((p,i)=>{const [x,y]=P(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)})}
  function arrow(st,col){const a=st.pts[0],b=st.pts[Math.min(5,st.pts.length-1)],[x,y]=P(a),[x2,y2]=P(b),ang=Math.atan2(y2-y,x2-x);
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,9,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 11px Golos Text, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(strokes.indexOf(st)+1),x,y+.5);
    const m=st.pts[Math.min(9,st.pts.length-1)],[mx,my]=P(m),m2=st.pts[Math.min(11,st.pts.length-1)],[mx2,my2]=P(m2),aa=Math.atan2(my2-my,mx2-mx);
    ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(mx2-Math.cos(aa-0.5)*8,my2-Math.sin(aa-0.5)*8);ctx.lineTo(mx2,my2);ctx.lineTo(mx2-Math.cos(aa+0.5)*8,my2-Math.sin(aa+0.5)*8);ctx.stroke()}
  function draw(prog){const r=cv.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height);
    /* линейки прописи */
    const line=(y,dash,a)=>{const [,yy]=P([0,y]);ctx.strokeStyle=css('--line');ctx.globalAlpha=a;ctx.lineWidth=1.5;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(8,yy);ctx.lineTo(r.width-8,yy);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1};
    line(15,[4,6],.8);line(35,[4,6],.9);line(75,[],1);line(92,[4,6],.8);
    ctx.lineCap='round';ctx.lineJoin='round';
    /* контур буквы */
    ctx.strokeStyle=css('--sunk');ctx.lineWidth=Math.max(14,k*9);strokes.forEach(s=>{path(s.pts);ctx.stroke()});
    /* готовые штрихи */
    ctx.strokeStyle=css('--brand');ctx.lineWidth=Math.max(6,k*4);for(let i=0;i<cur;i++){path(strokes[i].pts);ctx.stroke()}
    /* показ */
    if(prog){const i=Math.floor(prog.t),f=prog.t-i;ctx.strokeStyle=css('--apri');ctx.lineWidth=Math.max(6,k*4);
      for(let j=0;j<=Math.min(i,strokes.length-1);j++){path(strokes[j].pts,j<i?1:f);ctx.stroke()}
      if(i<strokes.length){const pt=strokes[i].pts[Math.min(TR_N-1,Math.round(f*(TR_N-1)))],[x,y]=P(pt);ctx.fillStyle=css('--apri-deep');ctx.beginPath();ctx.arc(x,y,7,0,7);ctx.fill()}}
    else if(!done&&strokes[cur])arrow(strokes[cur],css('--good'));
    /* что рисует человек */
    if(raw&&raw.length){ctx.strokeStyle=css('--ink');ctx.globalAlpha=.75;ctx.lineWidth=Math.max(5,k*3.2);ctx.beginPath();raw.forEach((p,i)=>{const [x,y]=P(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();ctx.globalAlpha=1}}
  function show(from=0,to=strokes.length,after){cancelAnimationFrame(anim);const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce){draw();after&&after();return}
    const t0=performance.now(),per=650;const step=now=>{const t=from+Math.max(0,now-t0)/per;if(t>=to){draw();after&&after();return}draw({t});anim=requestAnimationFrame(step)};anim=requestAnimationFrame(step)}
  const inv=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left-ox)/k,(e.clientY-r.top-oy)/k+TR_TOP]};
  cv.onpointerdown=e=>{if(done)return;cancelAnimationFrame(anim);cv.setPointerCapture(e.pointerId);raw=[inv(e)];draw()};
  cv.onpointermove=e=>{if(!raw)return;raw.push(inv(e));draw()};
  cv.onpointerup=cv.onpointercancel=()=>{if(!raw)return;const u=raw;raw=null;if(u.length<2&&trLen(u)<1){u.push([u[0][0]+.5,u[0][1]+.5])}
    const tol=13,res=trJudge(u,strokes[cur],tol);
    if(res==='ok'){cur++;haptic&&haptic('ok');
      if(cur>=strokes.length){done=true;draw();msg.textContent=mist?`Готово! Подсказок: ${mist}`:'Отлично, без единой ошибки!';box.querySelector('.tracer').classList.add('ok');opts.onDone&&opts.onDone(mist);return}
      msg.textContent=`Штрих ${cur+1} из ${strokes.length}`;draw();return}
    mist++;haptic&&haptic('bad');
    const later=strokes.slice(cur+1).findIndex(s=>trJudge(u,s,tol)!=='miss');
    msg.textContent=res==='dir'?'В другую сторону — начните с зелёной точки':later>=0?`Этот штрих позже — сначала штрих ${cur+1}`:'Почти — посмотрите, как он идёт';
    box.querySelector('.tracer').classList.remove('shake');void cv.offsetWidth;box.querySelector('.tracer').classList.add('shake');
    show(cur,cur+1)};
  box.querySelector('[data-tr="show"]').onclick=()=>show(0,strokes.length);
  box.querySelector('[data-tr="again"]').onclick=()=>{cancelAnimationFrame(anim);cur=0;mist=0;done=false;box.querySelector('.tracer').classList.remove('ok');msg.textContent=`Штрих 1 из ${strokes.length}: начните с точки`;draw()};
  const ro=new ResizeObserver(()=>{fit();draw()});ro.observe(cv);
  fit();draw();if(opts.demo!==false)setTimeout(()=>show(0,strokes.length),350);
  return {destroy(){ro.disconnect();cancelAnimationFrame(anim)}}}
