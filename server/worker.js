/**
 * Айбубен — сервер статистики (Cloudflare Worker + D1).
 *
 * Принимает события из Mini App и показывает страницу статистики с паролем.
 * Привязки (Settings → Bindings / Variables and Secrets):
 *   DB              — база D1 (обязательно)
 *   ADMIN_PASSWORD  — пароль страницы статистики (секрет, обязательно)
 *   BOT_TOKEN       — токен бота (секрет, желательно): проверка, что события пришли из настоящего Телеграма
 *   SALT            — необязательно: соль для обезличивания id (по умолчанию выводится из BOT_TOKEN)
 * Имена и ники пользователей не сохраняются: только обезличенный хэш id.
 */
const EVENTS = new Set(['open', 'lesson', 'lesson_first', 'practice', 'fail', 'game']);
const SCHEMA = `
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, day TEXT NOT NULL, uid TEXT NOT NULL, ev TEXT NOT NULL, p TEXT, src TEXT);
CREATE INDEX IF NOT EXISTS ev_day ON events(day, ev);
CREATE INDEX IF NOT EXISTS ev_uid ON events(uid, day);
CREATE TABLE IF NOT EXISTS users(uid TEXT PRIMARY KEY, first_day TEXT NOT NULL, last_day TEXT NOT NULL, src TEXT, lang TEXT);
CREATE INDEX IF NOT EXISTS users_first ON users(first_day);
`;
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  for (const q of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(q).run();
  schemaReady = true;
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(data));
}
async function sha(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
function safeEq(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

/** Проверка initData по документации Telegram Mini Apps. Возвращает объект user или null. */
async function verifyInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash'); if (!hash) return null;
    params.delete('hash');
    const dcs = [...params.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = await hmac('WebAppData', botToken);
    const calc = hex(await hmac(secret, dcs));
    if (!safeEq(calc, hash)) return null;
    return JSON.parse(params.get('user') || 'null');
  } catch (e) { return null; }
}
function unsafeUser(initData) { try { return JSON.parse(new URLSearchParams(initData).get('user') || 'null'); } catch (e) { return null; } }

const today = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const dayShift = (d, n) => today(Date.parse(d + 'T00:00:00Z') + n * 864e5);

async function collect(req, env) {
  let body; try { body = JSON.parse(await req.text()); } catch (e) { return new Response('bad json', { status: 400, headers: CORS }); }
  const ev = String(body.ev || ''); if (!EVENTS.has(ev)) return new Response('bad event', { status: 400, headers: CORS });
  const p = body.p == null ? null : String(body.p).slice(0, 160);
  const salt = env.SALT || (env.BOT_TOKEN ? hex(await hmac(env.BOT_TOKEN, 'aybuben-salt-v1')) : 'aybuben-default-salt');
  let uid = null, src = 'web', lang = null;
  if (body.init) {
    const user = env.BOT_TOKEN ? await verifyInitData(String(body.init), env.BOT_TOKEN) : unsafeUser(String(body.init));
    if (env.BOT_TOKEN && !user) return new Response('bad signature', { status: 403, headers: CORS });
    if (user && user.id) { uid = 'tg:' + (await sha(salt + ':' + user.id)).slice(0, 20); src = 'tg'; lang = user.language_code ? String(user.language_code).slice(0, 8) : null; }
  }
  if (!uid) { const a = String(body.anon || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40); if (a.length < 8) return new Response('no id', { status: 400, headers: CORS }); uid = 'web:' + (await sha(salt + ':' + a)).slice(0, 20); }
  await ensureSchema(env.DB);
  const ts = Date.now(), d = today(ts);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO events(ts,day,uid,ev,p,src) VALUES(?,?,?,?,?,?)').bind(ts, d, uid, ev, p, src),
    env.DB.prepare('INSERT INTO users(uid,first_day,last_day,src,lang) VALUES(?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET last_day=excluded.last_day').bind(uid, d, d, src, lang)
  ]);
  return new Response('ok', { headers: CORS });
}

/* ---------- страница статистики ---------- */
async function sessionToken(env) { return hex(await hmac(env.ADMIN_PASSWORD, 'aybuben-admin-session-v1')); }
function cookie(req, name) { const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)')); return m ? m[1] : null; }
async function authed(req, env) { const c = cookie(req, 'ays'); return !!(c && env.ADMIN_PASSWORD && safeEq(c, await sessionToken(env))); }

async function gather(env) {
  await ensureSchema(env.DB);
  const t = today(), d7 = dayShift(t, -6), d30 = dayShift(t, -29), q = (s, ...b) => env.DB.prepare(s).bind(...b);
  const [k1, k2, k3, k4, k5, k6, daily, newDaily, lessonsDaily, funnel, fails, games, src, ret] = await env.DB.batch([
    q('SELECT COUNT(DISTINCT uid) n FROM events WHERE day=?', t),
    q('SELECT COUNT(DISTINCT uid) n FROM events WHERE day>=?', d7),
    q('SELECT COUNT(DISTINCT uid) n FROM events WHERE day>=?', d30),
    q('SELECT COUNT(*) n FROM users'),
    q('SELECT COUNT(*) n FROM users WHERE first_day=?', t),
    q("SELECT COUNT(*) n FROM events WHERE ev IN ('lesson','practice') AND day=?", t),
    q('SELECT day, COUNT(DISTINCT uid) n FROM events WHERE day>=? GROUP BY day', d30),
    q('SELECT first_day day, COUNT(*) n FROM users WHERE first_day>=? GROUP BY first_day', d30),
    q("SELECT day, COUNT(*) n FROM events WHERE ev IN ('lesson','practice') AND day>=? GROUP BY day", d30),
    q("SELECT p, COUNT(DISTINCT uid) n FROM events WHERE ev='lesson_first' GROUP BY p"),
    q("SELECT p, COUNT(*) n FROM events WHERE ev='fail' AND day>=? GROUP BY p ORDER BY n DESC LIMIT 8", d30),
    q("SELECT p, COUNT(*) n, COUNT(DISTINCT uid) u FROM events WHERE ev='game' AND day>=? GROUP BY p ORDER BY n DESC", d30),
    q('SELECT src, COUNT(*) n FROM users GROUP BY src'),
    q(`SELECT COUNT(*) total, SUM(CASE WHEN EXISTS(SELECT 1 FROM events e WHERE e.uid=u.uid AND e.day=date(u.first_day,'+1 day')) THEN 1 ELSE 0 END) back
       FROM users u WHERE u.first_day>=? AND u.first_day<?`, dayShift(t, -30), dayShift(t, -1))
  ]);
  const one = r => (r.results[0] || {}).n || 0;
  const series = (rows) => { const m = Object.fromEntries(rows.results.map(r => [r.day, r.n])); return Array.from({ length: 30 }, (_, i) => { const d = dayShift(t, i - 29); return [d, m[d] || 0]; }); };
  return {
    today: t, dau: one(k1), wau: one(k2), mau: one(k3), total: one(k4), newToday: one(k5), lessonsToday: one(k6),
    daily: series(daily), newDaily: series(newDaily), lessonsDaily: series(lessonsDaily),
    funnel: funnel.results, fails: fails.results, games: games.results, src: src.results,
    retention: ret.results[0] || { total: 0, back: 0 }
  };
}

const PAGE_CSS = `:root{--bg:#EEE6E3;--surface:#FBF8F7;--sunk:#E3D8D4;--ink:#241A1E;--muted:#6C5C62;--line:#D6C8C3;--accent:#D06A1C;--good:#2D7A57;--b3:#4D6596;--b1:#8E3B5A;--gold:#E2A72E;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#1A1416;--surface:#251D20;--sunk:#31272B;--ink:#F2EAE7;--muted:#A8989D;--line:#3F3438;--accent:#F0A04B;--good:#6CC79C;--b3:#6680B3;--b1:#A2506F;--gold:#F2C14E;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:20px max(16px,env(safe-area-inset-right)) 40px max(16px,env(safe-area-inset-left))}
.wrap{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
h1{margin:0;font-size:26px}h1 span{color:var(--accent)}h2{margin:0 0 10px;font-size:16px}
.sub{color:var(--muted);margin:2px 0 0;font-size:14px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.kpi,.card{background:var(--surface);border:1.5px solid var(--line);border-radius:18px;box-shadow:0 3px 0 var(--line)}
.kpi{padding:14px 16px}.kpi b{display:block;font-size:30px;line-height:1.1;font-variant-numeric:tabular-nums}.kpi span{color:var(--muted);font-size:13px}
.card{padding:16px}.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
svg{display:block;width:100%;height:auto}.lg{display:flex;gap:14px;font-size:12.5px;color:var(--muted);margin-top:6px}.lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}td,th{padding:6px 4px;border-bottom:1px solid var(--line);text-align:left;font-size:14px}th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
td.n{text-align:right;width:70px}.barc{position:relative}.barc i{position:absolute;left:0;top:7px;bottom:7px;border-radius:5px;background:color-mix(in srgb,var(--accent) 22%,transparent)}.barc span{position:relative}
.empty{color:var(--muted);font-size:14px}.tw{overflow-x:auto}
form{display:flex;flex-direction:column;gap:12px;max-width:360px;margin:12vh auto 0;background:var(--surface);border:1.5px solid var(--line);border-radius:20px;padding:22px}
input{font:inherit;font-size:16px;padding:12px 14px;border-radius:12px;border:2px solid var(--line);background:var(--bg);color:var(--ink)}
button{font:inherit;font-weight:800;border:0;border-radius:12px;padding:12px;background:var(--accent);color:#fff;cursor:pointer}.err{color:#B02A43;margin:0;font-size:14px}`;

function loginPage(err) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Статистика Айбубена</title><style>${PAGE_CSS}</style></head><body>
<form method="post" action="/login"><h1>Айб<span>убен</span> · статистика</h1><p class="sub">Введите пароль, который вы задали в Cloudflare (ADMIN_PASSWORD).</p>
<input type="password" name="pw" placeholder="Пароль" autocomplete="current-password" required autofocus>${err ? '<p class="err">Неверный пароль.</p>' : ''}<button>Войти</button></form></body></html>`;
}

function statsPage(D) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Статистика Айбубена</title><style>${PAGE_CSS}</style></head><body><div class="wrap">
<div><h1>Айб<span>убен</span> · статистика</h1><p class="sub">Сегодня ${D.today} (UTC). Данные обезличены: хранится только хэш id пользователя.</p></div>
<div class="kpis" id="kpis"></div>
<div class="card"><h2>Активные пользователи за 30 дней</h2><div id="ch1"></div><div class="lg"><span><i style="background:var(--b3)"></i>активные за день</span><span><i style="background:var(--good)"></i>новые</span></div></div>
<div class="grid2"><div class="card"><h2>Пройдено уроков и тренировок</h2><div id="ch2"></div></div><div class="card"><h2>Игры за 30 дней</h2><div id="games"></div></div></div>
<div class="grid2"><div class="card"><h2>Докуда доходят: уроки, пройденные впервые</h2><div class="tw" id="funnel"></div></div><div class="card"><h2>Самые трудные уроки (кончились сердца)</h2><div id="fails"></div></div></div>
</div>
<script>const D=${JSON.stringify(D).replace(/</g, '\\u003c')};
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
const srcN=k=>((D.src.find(x=>x.src===k)||{}).n||0);
$('#kpis').innerHTML=[[D.dau,'активных сегодня'],[D.wau,'за 7 дней'],[D.mau,'за 30 дней'],[D.total,'всего пользователей'],[D.newToday,'новых сегодня'],[D.lessonsToday,'уроков сегодня'],[pct(D.retention.back,D.retention.total),'вернулись на следующий день'],[srcN('tg')+' / '+srcN('web'),'из Телеграма / из браузера']].map(([v,l])=>'<div class="kpi"><b>'+v+'</b><span>'+l+'</span></div>').join('');
function chart(el,sets,colors,bars){const W=Math.max(300,Math.round(el.clientWidth||640)),H=W<500?170:210,P={l:30,r:22,t:12,b:26},n=sets[0].length,mx=Math.max(4,...sets.flat().map(x=>x[1]));const st=Math.pow(10,Math.floor(Math.log10(mx)));const step=[1,2,5,10].map(k=>k*st).find(s=>mx/s<=5)||st;const top=Math.ceil(mx/step)*step;
 const x=i=>P.l+(W-P.l-P.r)*(bars?(i+.5)/n:i/(n-1)),y=v=>H-P.b-(H-P.t-P.b)*v/top;let g='';
 for(let v=0;v<=top;v+=step)g+='<line x1="'+P.l+'" x2="'+(W-P.r)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(P.l-6)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="11" fill="var(--muted)">'+v+'</text>';
 const ev=W<500?7:5;sets[0].forEach(([d],i)=>{if((n-1-i)%ev===0)g+='<text x="'+x(i)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="var(--muted)">'+d.slice(8)+'.'+d.slice(5,7)+'</text>'});
 sets.forEach((s,k)=>{if(bars){const bw=(W-P.l-P.r)/n*.62;s.forEach(([d,v],i)=>{g+='<rect x="'+(x(i)-bw/2)+'" y="'+y(v)+'" width="'+bw+'" height="'+(H-P.b-y(v))+'" rx="3" fill="'+colors[k]+'"><title>'+d+': '+v+'</title></rect>'})}
  else{g+='<path d="'+s.map(([d,v],i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join('')+'" fill="none" stroke="'+colors[k]+'" stroke-width="2.6" stroke-linejoin="round"/>';const [ld,lv]=s[n-1];g+='<circle cx="'+x(n-1)+'" cy="'+y(lv)+'" r="4" fill="'+colors[k]+'"><title>'+ld+': '+lv+'</title></circle>'}});
 el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img">'+g+'</svg>'}
const draw=()=>{chart($('#ch1'),[D.daily,D.newDaily],['var(--b3)','var(--good)']);chart($('#ch2'),[D.lessonsDaily],['var(--accent)'],true)};draw();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,150)});
function table(el,rows,head,lab){if(!rows.length){el.innerHTML='<p class="empty">Пока нет данных.</p>';return}const mx=Math.max(...rows.map(r=>r.n));
 el.innerHTML='<table><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr>'+rows.map(r=>'<tr><td class="barc"><i style="width:'+(r.n/mx*100)+'%"></i><span>'+esc(lab(r))+'</span></td><td class="n">'+r.n+'</td>'+(r.u!=null?'<td class="n">'+r.u+'</td>':'')+'</tr>').join('')+'</table>'}
const parseL=p=>{const [n,id,...t]=String(p||'').split('|');return {n:+n||0,id,t:t.join('|')||id}};
const fun=D.funnel.map(r=>({p:parseL(r.p),n:r.n})).sort((a,b)=>a.p.n-b.p.n);table($('#funnel'),fun.map(r=>({n:r.n,t:(r.p.n+1)+'. '+r.p.t})),['Урок','Людей'],r=>r.t);
table($('#fails'),D.fails.map(r=>({n:r.n,t:parseL(r.p).t})),['Урок','Раз'],r=>r.t);
const GN={fall:'Буквопад',sprint:'Спринт',echo:'Эхо',memo:'Найди пары',odd:'Лишнее слово',spell:'Слово по буквам'},MN={letters:'буквы',words:'слова',w6:'6 пар',w8:'8 пар'};
table($('#games'),D.games.map(r=>({n:r.n,u:r.u,t:(GN[String(r.p).split('-')[0]]||r.p)+(String(r.p).includes('-')?' · '+(MN[String(r.p).split('-').slice(1).join('-')]||String(r.p).split('-').slice(1).join('-')):'')})),['Игра','Партий','Игроков'],r=>r.t);
</script></body></html>`;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (!env.DB) return new Response('Не подключена база D1 (привязка DB).', { status: 500 });
    if (url.pathname === '/e' && req.method === 'POST') return collect(req, env);
    if (url.pathname === '/login' && req.method === 'POST') {
      if (!env.ADMIN_PASSWORD) return new Response('Не задан ADMIN_PASSWORD.', { status: 500 });
      const pw = (await req.formData()).get('pw') || '';
      if (!safeEq(await sha(String(pw)), await sha(env.ADMIN_PASSWORD))) return new Response(loginPage(true), { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': `ays=${await sessionToken(env)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` } });
    }
    if (url.pathname === '/logout') return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': 'ays=; Path=/; Max-Age=0' } });
    if (url.pathname === '/' || url.pathname === '/stats') {
      if (!(await authed(req, env))) return new Response(loginPage(false), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      return new Response(statsPage(await gather(env)), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/health') return new Response('ok');
    return new Response('Not found', { status: 404 });
  }
};
