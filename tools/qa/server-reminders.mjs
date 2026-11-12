/* Проверка напоминаний на сервере: кому и что пишет бот (plan), сохранение прогресса (/u), журнал отправок и статистика.
   Запуск: node --no-warnings tools/qa/server-reminders.mjs  (нужен Node 22+, база — в памяти, в Телеграм ничего не уходит). */
import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';
const src=fs.readFileSync(new URL('../../server/worker.js',import.meta.url),'utf8')+'\nexport {plan,MSG,runReminders,userSync,gather,statsPage,ensureSchema,collect,tgUid};';
import os from 'node:os';import path from 'node:path';const tmp=path.join(os.tmpdir(),'aybuben-worker-test.mjs');fs.writeFileSync(tmp,src);const W=await import(tmp+'?'+Date.now());
function d1(db){const mk=(sql,args=[])=>({bind:(...a)=>mk(sql,a),
  run:async()=>{const r=db.prepare(sql).run(...args.map(x=>x===undefined?null:x));return {meta:{changes:Number(r.changes)}}},
  first:async()=>db.prepare(sql).get(...args.map(x=>x===undefined?null:x))||null,
  all:async()=>({results:db.prepare(sql).all(...args.map(x=>x===undefined?null:x))})});
 return {prepare:s=>mk(s),batch:async qs=>{const out=[];for(const q of qs){try{out.push(await q.all())}catch(e){await q.run();out.push({results:[]})}}return out}}}
const ok=(c,m)=>{console.log((c?'✓ ':'✗ FAIL ')+m);if(!c)process.exitCode=1};
const day=(n=0)=>new Date(Date.now()+180*6e4+n*864e5).toISOString().slice(0,10);
// now such that local (tz 180) hour is 19
const at=h=>{const d=new Date();d.setUTCHours(h-3,10,0,0);return d.getTime()};
const loc=t=>new Date(t+180*6e4).toISOString().slice(0,10);
const now=at(19),D=n=>new Date(now+180*6e4+n*864e5).toISOString().slice(0,10);
const base={enabled:1,chat_id:1,tz:180,hour:null,auto_hour:19,freq:1,streak:0,last_day:null,last_sent:null,ignored:0,used:'',news:''};
const P=(o)=>W.plan({...base,...o},now);
let p=P({first:D(-1),last_day:D(-1),info:JSON.stringify({l:4,d:1,nx:'Буквы Ս Ր Ու',due:0})});
ok(p&&p.type==='new'&&p.id==='n1'&&p.text.includes('4 буквы из 39')&&p.text.includes('«Буквы Ս Ր Ու»'),'новичок, день 1: '+(p&&p.text));
p=P({first:D(-2),last_day:D(-1),info:JSON.stringify({l:7,d:2,nx:'Первые слова'})});ok(p&&p.id==='n2'&&p.text.includes('7 букв'),'день 2: '+(p&&p.text));
p=P({first:D(-3),last_day:D(-2),info:JSON.stringify({l:11,d:3,nx:''})});ok(p&&p.id==='n3'&&!p.text.includes('«»')&&!p.text.includes('{'),'день 3 без названия: '+(p&&p.text));
p=P({first:D(-4),last_day:D(-2),info:JSON.stringify({l:11,d:3})});ok(p&&p.type==='joke','день 4 → шутка: '+(p&&p.type));
p=P({first:D(-1)});ok(p&&p.type==='new0'&&p.id==='z1','нажал Старт, не начал, день 1: '+(p&&p.text));
p=P({first:D(-3)});ok(p&&p.id==='z3','не начал, день 3');
p=P({first:D(-6)});ok(p&&p.type==='joke'&&!/Тебя не было/.test(p.text),'не начал, день 6 → шутка, не «тебя не было»: '+(p&&p.text));
p=P({});ok(p&&p.type==='joke','старая запись без first и без занятий → шутка: '+(p&&p.type));
p=P({first:D(-3),last_day:D(-1),streak:3,info:JSON.stringify({l:11,d:3})});ok(p&&p.type==='streak','серия 3 важнее «новичка»: '+(p&&p.text));
p=P({first:D(-40),last_day:D(-5)});ok(p&&p.type==='back'&&p.text.indexOf('{')<0,'давно не было: '+(p&&p.text));
p=P({first:D(-1),last_day:D(0),info:JSON.stringify({l:4,d:1})});ok(p===null,'занимался сегодня → молчим');
p=P({first:D(-1),last_day:D(-1),last_sent:D(0),info:JSON.stringify({l:4,d:1})});ok(p===null,'уже писали сегодня → молчим');
p=W.plan({...base,first:D(-1),last_day:D(-1),info:JSON.stringify({l:4,d:1})},at(15));ok(p===null,'не его час → молчим');
p=P({first:D(-1),last_day:D(-1),info:JSON.stringify({l:4,d:1,nx:'<b>x</b> http://evil.ru @spam'})});ok(p&&!/[<>@\/:]/.test(p.text),'название урока очищается: '+(p&&p.text));
p=P({first:D(-1),last_day:D(-1),info:'{bad json'});ok(p&&p.type==='joke','битый info → шутка');
p=P({first:D(-2),last_day:D(-1),ignored:6,info:JSON.stringify({l:4,d:1})});ok(p===null,'6 игноров → тишина');
// сквозной прогон: старая база без новых колонок
const db=new DatabaseSync(':memory:');
db.exec("CREATE TABLE notify(uid TEXT PRIMARY KEY, chat_id INTEGER, enabled INTEGER DEFAULT 0, tz INTEGER DEFAULT 180, hour INTEGER, auto_hour INTEGER, freq INTEGER DEFAULT 1, streak INTEGER DEFAULT 0, last_day TEXT, last_sent TEXT, ignored INTEGER DEFAULT 0, used TEXT, upd INTEGER)");
db.exec("INSERT INTO notify(uid,chat_id,enabled,auto_hour,last_day) VALUES('old',111,1,19,'"+D(-1)+"')");
const env={DB:d1(db),BOT_TOKEN:'',SALT:'s'};
await W.ensureSchema(env.DB);
ok(db.prepare("SELECT first,info,news FROM notify WHERE uid='old'").get()!==undefined,'старая база дополнена колонками');
// /u без токена: init не проверяется (unsafeUser)
const init='user='+encodeURIComponent(JSON.stringify({id:42}))+'&hash=x';
const req=b=>({text:async()=>JSON.stringify(b)});
let r=await W.userSync(req({init,tz:180,hour:19,streak:1,day:D(-1),info:{l:4,d:1,nx:'Буквы Ս Ր Ու <script>',due:2},notif:{on:true,hour:null,freq:1}}),env);
const uid=await W.tgUid(env,42);let row=db.prepare('SELECT * FROM notify WHERE uid=?').get(uid);
ok(row&&row.info&&JSON.parse(row.info).nx==='Буквы Ս Ր Ու script'&&row.auto_hour===19,'/u сохраняет прогресс: '+row.info+' first='+row.first);
db.prepare('UPDATE notify SET chat_id=42, enabled=1, first=? WHERE uid=?').run(D(-1),uid);
// отправка
const calls=[];globalThis.fetch=async(u,o)=>{if(String(u).includes('news.json'))return {ok:true,json:async()=>[]};calls.push(JSON.parse(o.body));return {json:async()=>({ok:true})}};
env.BOT_TOKEN='T';env.TG_API='http://x';
const res=await W.runReminders(env,now);
const mine=calls.find(c=>c.chat_id===42),old=calls.find(c=>c.chat_id===111);
ok(res.sent===2&&mine&&/\?r=new#go$/.test(mine.reply_markup.inline_keyboard[0][0].web_app.url),'отправлено 2, кнопка новичка: '+(mine&&mine.reply_markup.inline_keyboard[0][0].web_app.url));
ok(old&&/\?r=joke#go$/.test(old.reply_markup.inline_keyboard[0][0].web_app.url),'старый пользователь → шутка: '+(old&&old.caption));
ok(db.prepare('SELECT COUNT(*) n FROM sent').get().n===2,'журнал отправок: 2 записи');
const again=await W.runReminders(env,now);ok(again.sent===0,'повторный запуск в тот же час никому не пишет');
// события и статистика
env.BOT_TOKEN='';
for(const [ev,pp] of [['open',null],['remind','new'],['lesson','1|x|y'],['nt_ask','1'],['nt_yes','1']]){const rr=await W.collect(req({init,ev,p:pp}),env);if(rr.status!==200)ok(false,'событие '+ev+' отклонено')}
const bad=await W.collect(req({init,ev:'hack'}),env);ok(bad.status===400,'незнакомое событие отклоняется');
db.prepare('UPDATE events SET ts=?').run(now+60000);
const G=await W.gather(env);
ok(G.remOn===2&&G.rem.length===2&&G.ask.nt_ask===1&&G.ask.nt_yes===1&&G.ask.remind===1,'статистика: '+JSON.stringify({on:G.remOn,rem:G.rem,ask:G.ask}));
ok(W.statsPage(G).includes('Напоминания за 30 дней'),'страница статистики собирается');
// шутки не повторяются, пока не показаны все
{const seen=[];let row={...base,first:null,last_day:D(-40),streak:0,used:''};
 for(let i=0;i<W.MSG.joke.length;i++){const q=W.plan({...row,last_day:loc(now+(i-1)*864e5-864e5*0)},now+i*864e5);if(!q||q.type!=='joke'){ok(false,'шутка '+i+': '+JSON.stringify(q));break}seen.push(q.id);row.used=q.used}
 ok(new Set(seen).size===W.MSG.joke.length&&W.MSG.joke.length===25,'25 шуток подряд без повторов: '+new Set(seen).size);
 ok(Object.values(W.MSG).flat().every(m=>m[2].length<=200&&['cheer','think','wink','sad','wow','happy'].includes(m[1])),'все тексты короткие, картинки существуют');
 const ids=Object.values(W.MSG).flat().map(m=>m[0]);ok(new Set(ids).size===ids.length,'метки текстов не повторяются')}
