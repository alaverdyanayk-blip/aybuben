/* Карточка достижения: картинка 1080×1350 с Циро, которую можно сохранить или отправить друзьям.
   Рисуется на холсте прямо в приложении, на сервер ничего не уходит. */
const SHARE_W=1080,SHARE_H=1350;
/* SVG Циро для холста: свой xmlns и копия общих градиентов (в приложении они лежат один раз в разметке) */
function mascotSrc(mood,outfit){const defs=document.querySelector('#cg-body');const d=defs?defs.closest('defs'):null;
  let s=mascot(mood,'',outfit).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" ');
  if(d)s=s.replace(/(<svg[^>]*>)/,'$1'+d.outerHTML);
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)}
function iconSrc(ic,color){const s=(IC[ic]||IC.star).replace('<svg ',`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" color="${color}" `).replace('class="i" ','');
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)}
const loadImg=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});
/* Перенос строки по словам под ширину */
function wrapLines(x,text,w){const out=[];let line='';for(const word of String(text).split(' ')){const t=line?line+' '+word:word;if(x.measureText(t).width>w&&line){out.push(line);line=word}else line=t}if(line)out.push(line);return out}
function shareStats(){const st=Math.max(streakNow(),0),kn=LETTERS.filter(letterLearned).length,parts=[];
  if(kn)parts.push(`${kn} ${plural(kn,'буква','буквы','букв')}`);if(st>1)parts.push(`${st} ${plural(st,'день','дня','дней')} подряд`);parts.push(`${S.xp} XP`);return parts.join('  ·  ')}
async function drawAchCard(a){
  try{if(document.fonts&&document.fonts.ready)await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1500))])}catch(e){}
  const c=document.createElement('canvas');c.width=SHARE_W;c.height=SHARE_H;const x=c.getContext('2d'),W=SHARE_W,H=SHARE_H;
  const g=x.createLinearGradient(0,0,W*.6,H);g.addColorStop(0,'#B02A42');g.addColorStop(.55,'#8E1A30');g.addColorStop(1,'#5E1222');x.fillStyle=g;x.fillRect(0,0,W,H);
  /* узор из ромбов, как на главной */
  x.save();x.globalAlpha=.08;x.strokeStyle='#fff';x.fillStyle='#fff';x.lineWidth=3;
  for(let yy=-60;yy<H+60;yy+=108)for(let xx=-60;xx<W+60;xx+=108){x.beginPath();x.moveTo(xx,yy-45);x.lineTo(xx+45,yy);x.lineTo(xx,yy+45);x.lineTo(xx-45,yy);x.closePath();x.stroke();x.beginPath();x.moveTo(xx,yy-18);x.lineTo(xx+18,yy);x.lineTo(xx,yy+18);x.lineTo(xx-18,yy);x.fill()}
  x.restore();
  /* сияние за Циро */
  const rg=x.createRadialGradient(W/2,470,40,W/2,470,420);rg.addColorStop(0,'rgba(255,214,140,.55)');rg.addColorStop(1,'rgba(255,214,140,0)');x.fillStyle=rg;x.fillRect(0,0,W,H);
  x.textAlign='center';x.textBaseline='alphabetic';
  x.fillStyle='rgba(255,255,255,.85)';x.font='700 44px "Noto Serif Armenian","Noto Serif",Georgia,serif';x.fillText('Այբուբեն',W/2,110);
  try{const m=await loadImg(mascotSrc('cheer'));x.drawImage(m,W/2-280,150,560,560)}catch(e){}
  try{const r=86;x.fillStyle='#F6B24C';x.beginPath();x.arc(W/2+230,620,r,0,Math.PI*2);x.fill();x.lineWidth=10;x.strokeStyle='#fff';x.stroke();const ic=await loadImg(iconSrc(a.ic,'#6E1424'));x.drawImage(ic,W/2+230-52,620-52,104,104)}catch(e){}
  x.fillStyle='#FFD98A';x.font='800 64px "Noto Serif Armenian","Noto Serif",Georgia,serif';x.fillText('Կեցցե՛ս!',W/2,800);
  x.fillStyle='rgba(255,255,255,.75)';x.font='600 34px "Golos Text",system-ui,sans-serif';x.fillText('Достижение',W/2,860);
  x.fillStyle='#fff';x.font='800 82px "Golos Text",system-ui,sans-serif';let ty=960;
  wrapLines(x,a.t,W-140).slice(0,2).forEach(l=>{x.fillText(l,W/2,ty);ty+=92});
  x.fillStyle='#FBE0E5';x.font='500 40px "Golos Text",system-ui,sans-serif';
  wrapLines(x,a.b||a.d,W-200).slice(0,2).forEach(l=>{x.fillText(l,W/2,ty);ty+=54});
  /* плашка со статистикой */
  const sline=shareStats();x.font='700 36px "Golos Text",system-ui,sans-serif';const sw=Math.min(W-120,x.measureText(sline).width+80);
  x.fillStyle='rgba(0,0,0,.22)';x.beginPath();x.roundRect?x.roundRect(W/2-sw/2,1150,sw,76,38):x.rect(W/2-sw/2,1150,sw,76);x.fill();
  x.fillStyle='#fff';x.fillText(sline,W/2,1201);
  x.fillStyle='rgba(255,255,255,.8)';x.font='600 32px "Golos Text",system-ui,sans-serif';x.fillText('Учу армянский с Циро  ·  @'+BOT,W/2,1300);
  return c}
const SHARE_TEXT=a=>`Новое достижение в Айбубене: «${a.t}» 🍑 Учу читать по-армянски с абрикосом Циро.`;
/* Окно карточки: картинка, «Поделиться» (файлом, если устройство умеет, иначе ссылкой в Телеграме) и «Сохранить» */
async function achShare(id){const a=ACH.find(v=>v.id===id);if(!a||!S.ach[id])return;
  const s=sheet(`<div class="sheet-top"><b>Достижение</b><button class="x" data-close aria-label="Закрыть">✕</button></div>
   <div class="sh-card"><div class="sh-wait">Рисую карточку…</div></div>
   <div class="btns two"><button class="btn" id="sh-go" disabled>Поделиться</button><button class="btn plain" id="sh-save" disabled>Сохранить</button></div>
   <p class="note" id="sh-note" hidden></p>`);
  let blob=null,url='';
  try{const c=await drawAchCard(a);url=c.toDataURL('image/jpeg',.92);blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.92))}catch(e){}
  const box=s.el.querySelector('.sh-card');if(!box)return;
  box.innerHTML=url?`<img src="${url}" alt="Карточка достижения «${esc(a.t)}»">`:`<div class="sh-wait">Не получилось нарисовать карточку. Можно отправить ссылку.</div>`;
  const go=s.el.querySelector('#sh-go'),sv=s.el.querySelector('#sh-save'),note=s.el.querySelector('#sh-note');go.disabled=false;sv.disabled=!url;
  const file=blob?new File([blob],`aybuben-${a.id}.jpg`,{type:'image/jpeg'}):null;
  const link=S.refCode?inviteLink():`https://t.me/${BOT}`;
  go.onclick=async()=>{track('share',a.id);
    if(file&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],text:SHARE_TEXT(a)+' '+link});return}catch(e){if(e&&e.name==='AbortError')return}}
    if(TGW&&TGW.openTelegramLink)TGW.openTelegramLink('https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent(SHARE_TEXT(a)));
    else if(navigator.share)navigator.share({text:SHARE_TEXT(a),url:link}).catch(()=>{});
    else{try{await navigator.clipboard.writeText(SHARE_TEXT(a)+' '+link);go.textContent='Текст скопирован'}catch(e){}}};
  sv.onclick=()=>{if(TGW){note.hidden=false;note.textContent='Нажмите на картинку и удерживайте — появится «Сохранить изображение».';return}
    const l=document.createElement('a');l.href=url;l.download=`aybuben-${a.id}.jpg`;document.body.appendChild(l);l.click();l.remove()}}
