const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/telegram|googleapis|workers/,r=>r.fulfill({body:''}));await p.goto('http://127.0.0.1:8765/index.html');await p.waitForTimeout(500);
const R=await p.evaluate(()=>{const T=[];const C=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort()):v);const ok=(n,c)=>T.push((c?'OK ':'FAIL ')+n);
 const A={v:3,ts:2000,xp:300,done:{ab1a:2,ab1b:1},daily:{'2026-11-01':30,'2026-11-02':10},streak:2,lastDay:'2026-11-02',best:4,hearts:2,heartsTs:5,ach:{first:'2026-11-01'},games:{fall:{best:10,plays:2},memo:{best:14,plays:1}},phr:{taxi:{l1:1}},mem:{'#ա':[3,100],'տուն':[1,50]},goal:30,outfit:'cap',read:5,perfect:1,friends:1};
 const B={v:3,ts:1000,xp:250,done:{ab1a:1,ab1w:1},daily:{'2026-11-02':40,'2026-11-03':20},streak:5,lastDay:'2026-11-03',best:5,hearts:5,heartsTs:9,ach:{first:'2026-10-30',perfect:'2026-11-03'},games:{fall:{best:14,plays:1},memo:{best:9,plays:4},odd:{best:3,plays:1}},phr:{taxi:{l2:1},cafe:{l1:2}},mem:{'#ա':[1,200],'սար':[2,10]},goal:10,read:9,perfect:0};
 const m=mergeState(A,B),m2=mergeState(B,A);
 ok('symmetric',C(m)===C(m2));
 ok('done union max',m.done.ab1a===2&&m.done.ab1b===1&&m.done.ab1w===1);
 ok('xp max',m.xp===300);ok('daily max',m.daily['2026-11-02']===40&&m.daily['2026-11-01']===30&&m.daily['2026-11-03']===20);
 ok('streak from later day',m.lastDay==='2026-11-03'&&m.streak===5&&m.best===5);
 ok('settings from newer',m.goal===30&&m.outfit==='cap'&&m.hearts===2);
 ok('ach union earliest',m.ach.first==='2026-10-30'&&m.ach.perfect==='2026-11-03');
 ok('games',m.games.fall.best===14&&m.games.fall.plays===2&&m.games.memo.best===9&&m.games.memo.plays===4&&m.games.odd.best===3);
 ok('phr',m.phr.taxi.l1===1&&m.phr.taxi.l2===1&&m.phr.cafe.l1===2);
 ok('mem newest per key',m.mem['#ա'][1]===200&&m.mem['տուն'][0]===1&&m.mem['սար'][0]===2);
 ok('counters',m.read===9&&m.perfect===1&&m.friends===1&&m.ts===2000);
 ok('idempotent',C(mergeState(m,m))===C(mergeState(m,A))&&C(mergeState(m,B))===C(m));
 // сброс
 const R1={v:3,ts:5000,resetAt:5000,xp:0,done:{}};const stale={v:3,ts:4000,xp:900,done:{ab1a:1}};const after={v:3,ts:6000,xp:20,done:{ab1a:1}};
 ok('reset beats stale',mergeState(R1,stale).xp===0&&mergeState(stale,R1).xp===0&&!mergeState(stale,R1).done.ab1a);
 ok('progress after reset kept',mergeState(R1,after).xp===20&&mergeState(after,R1).done.ab1a===1);
 // старые схемы
 const old=mergeState({xp:10,done:{a1a:1,a1b:1,a1w:1},ts:10},{});ok('old schema migrated',old.v===3&&old.done.a1a===1&&Object.keys(old.done).some(k=>/^ab/.test(k)));
 ok('garbage',mergeState(null,'x').v===3&&mergeState({done:null,xp:'a',mem:5},{}).xp===0);
 ok('future version kept',mergeState({v:9,ts:5,xp:1,zz:{q:1}},{}).v===9&&mergeState({v:9,ts:5,xp:1,zz:{q:1}},{}).zz.q===1);
 return T});
console.log(R.join('\n'),errs);await b.close()})();
