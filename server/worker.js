/**
 * Айбубен — сервер статистики (Cloudflare Worker + D1).
 *
 * Принимает события из Mini App и показывает страницу статистики с паролем.
 * Привязки (Settings → Bindings / Variables and Secrets):
 *   DB              — база D1 (обязательно)
 *   ADMIN_PASSWORD  — пароль страницы статистики (секрет, необязательно: без него страница открыта всем, кто знает адрес)
 *   BOT_TOKEN       — токен бота (секрет, желательно): проверка, что события пришли из настоящего Телеграма
 *   SALT            — необязательно: соль для обезличивания id (по умолчанию выводится из BOT_TOKEN)
 * Имена и ники пользователей не сохраняются: только обезличенный хэш id.
 * Исключение — напоминания: для тех, кто их разрешил, хранится id чата с ботом (без него бот не может написать).
 * Ещё здесь: приглашения друзей (/r/me, /r/claim), настройки напоминаний (/u), вебхук бота (/tg/…) и расписание (scheduled).
 */
// remind — открыли приложение кнопкой под напоминанием (p — тип напоминания);
// nt_ask / nt_yes / nt_no — Циро предложил напоминания / согласились / отказались (p — какой раз спрашивал);
// channel — нажали ссылку на канал (p — откуда: news / profile)
const EVENTS = new Set(['open', 'lesson', 'lesson_first', 'practice', 'fail', 'game', 'phrase', 'remind', 'nt_ask', 'nt_yes', 'nt_no', 'channel']);
const SCHEMA = `
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, day TEXT NOT NULL, uid TEXT NOT NULL, ev TEXT NOT NULL, p TEXT, src TEXT);
CREATE INDEX IF NOT EXISTS ev_day ON events(day, ev);
CREATE INDEX IF NOT EXISTS ev_uid ON events(uid, day);
CREATE TABLE IF NOT EXISTS users(uid TEXT PRIMARY KEY, first_day TEXT NOT NULL, last_day TEXT NOT NULL, src TEXT, lang TEXT);
CREATE INDEX IF NOT EXISTS users_first ON users(first_day);
CREATE TABLE IF NOT EXISTS refcodes(code TEXT PRIMARY KEY, uid TEXT UNIQUE NOT NULL, created TEXT);
CREATE TABLE IF NOT EXISTS refs(friend TEXT PRIMARY KEY, inviter TEXT NOT NULL, day TEXT);
CREATE INDEX IF NOT EXISTS refs_inv ON refs(inviter);
CREATE TABLE IF NOT EXISTS notify(uid TEXT PRIMARY KEY, chat_id INTEGER, enabled INTEGER DEFAULT 0, tz INTEGER DEFAULT 180, hour INTEGER, auto_hour INTEGER, freq INTEGER DEFAULT 1, streak INTEGER DEFAULT 0, last_day TEXT, last_sent TEXT, ignored INTEGER DEFAULT 0, used TEXT, news TEXT, upd INTEGER, first TEXT, info TEXT);
CREATE TABLE IF NOT EXISTS sent(id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, day TEXT NOT NULL, uid TEXT NOT NULL, type TEXT);
CREATE INDEX IF NOT EXISTS sent_day ON sent(day);
CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);
`;
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  for (const q of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) await db.prepare(q).run();
  // для баз, созданных раньше: news — новости, first — день знакомства (по своему времени человека), info — краткий прогресс из приложения
  for (const col of ['news TEXT', 'first TEXT', 'info TEXT']) { try { await db.prepare('ALTER TABLE notify ADD COLUMN ' + col).run(); } catch (e) { } }
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

/* ---------- кто прислал запрос ---------- */
const SALT = env => env.SALT || 'aybuben-default-salt'; // не зависит от BOT_TOKEN: добавление токена не меняет id пользователей
const tgUid = async (env, id) => 'tg:' + (await sha(SALT(env) + ':' + id)).slice(0, 20);
async function who(body, env) {
  let uid = null, src = 'web', lang = null, tgId = null, verified = false;
  if (body.init) {
    const user = env.BOT_TOKEN ? await verifyInitData(String(body.init), env.BOT_TOKEN) : unsafeUser(String(body.init));
    if (user && user.id) { uid = await tgUid(env, user.id); src = 'tg'; tgId = user.id; verified = !!env.BOT_TOKEN; lang = user.language_code ? String(user.language_code).slice(0, 8) : null; }
    else if (env.BOT_TOKEN) return { uid: null, bad: true };
  }
  if (!uid) { const a = String(body.anon || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40); if (a.length >= 8) uid = 'web:' + (await sha(SALT(env) + ':' + a)).slice(0, 20); }
  return { uid, src, lang, tgId, verified };
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
async function readBody(req) { try { return JSON.parse(await req.text()); } catch (e) { return null; } }

async function collect(req, env) {
  let body; try { body = JSON.parse(await req.text()); } catch (e) { return new Response('bad json', { status: 400, headers: CORS }); }
  const ev = String(body.ev || ''); if (!EVENTS.has(ev)) return new Response('bad event', { status: 400, headers: CORS });
  const p = body.p == null ? null : String(body.p).slice(0, 160);
  const { uid, src, lang } = await who(body, env);
  if (!uid) return new Response('no id', { status: 400, headers: CORS });
  await ensureSchema(env.DB);
  const ts = Date.now(), d = today(ts);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO events(ts,day,uid,ev,p,src) VALUES(?,?,?,?,?,?)').bind(ts, d, uid, ev, p, src),
    env.DB.prepare('INSERT INTO users(uid,first_day,last_day,src,lang) VALUES(?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET last_day=excluded.last_day').bind(uid, d, d, src, lang)
  ]);
  return new Response('ok', { headers: CORS });
}


/* ---------- приглашения друзей ---------- */
async function refMe(req, env) {
  const body = await readBody(req); if (!body) return json({ error: 'bad json' }, 400);
  const { uid } = await who(body, env); if (!uid) return json({ error: 'no id' }, 400);
  await ensureSchema(env.DB);
  let row = await env.DB.prepare('SELECT code FROM refcodes WHERE uid=?').bind(uid).first();
  if (!row) {
    const code = (await sha('ref:' + uid)).slice(0, 9);
    await env.DB.prepare('INSERT OR IGNORE INTO refcodes(code,uid,created) VALUES(?,?,?)').bind(code, uid, today()).run();
    row = { code };
  }
  const n = await env.DB.prepare('SELECT COUNT(*) n FROM refs WHERE inviter=?').bind(uid).first();
  return json({ code: row.code, friends: (n && n.n) || 0 });
}
async function refClaim(req, env, ctx) {
  const body = await readBody(req); if (!body) return json({ error: 'bad json' }, 400);
  const { uid } = await who(body, env); if (!uid) return json({ error: 'no id' }, 400);
  await ensureSchema(env.DB);
  const code = String(body.code || '').replace(/[^a-z0-9]/g, '').slice(0, 16);
  const inv = await env.DB.prepare('SELECT uid FROM refcodes WHERE code=?').bind(code).first();
  if (!inv) return json({ ok: false, reason: 'no code' });
  if (inv.uid === uid) return json({ ok: false, reason: 'self' });
  const u = await env.DB.prepare('SELECT first_day FROM users WHERE uid=?').bind(uid).first();
  if (u && u.first_day < dayShift(today(), -3)) return json({ ok: false, reason: 'not new' }); // засчитываем только новичков
  const r = await env.DB.prepare('INSERT OR IGNORE INTO refs(friend,inviter,day) VALUES(?,?,?)').bind(uid, inv.uid, today()).run();
  if (!r.meta || !r.meta.changes) return json({ ok: false, reason: 'already' });
  const n = (await env.DB.prepare('SELECT COUNT(*) n FROM refs WHERE inviter=?').bind(inv.uid).first()).n;
  const task = notifyInviter(env, inv.uid, n).catch(() => {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(task); else await task;
  return json({ ok: true });
}
const REF_TIERS = [[1, 'Семейный'], [3, 'Тамада'], [5, 'Ереванский дядя']];
async function notifyInviter(env, inviter, n) {
  if (!env.BOT_TOKEN) return;
  const row = await env.DB.prepare('SELECT chat_id FROM notify WHERE uid=? AND chat_id IS NOT NULL').bind(inviter).first();
  if (!row) return;
  const tier = REF_TIERS.find(t => t[0] === n), next = REF_TIERS.find(t => t[0] > n);
  const text = tier ? `Твой друг прошёл первый урок! 🎉\nЦиро получил костюм «${tier[1]}» — загляни в гардероб.`
    : `Ещё один друг прошёл первый урок! 🎉 Уже ${n}.` + (next ? `\nДо костюма «${next[1]}» — ${next[0] - n}.` : '');
  await tg(env, 'sendPhoto', { chat_id: row.chat_id, photo: art(env, 'cheer'), caption: text, reply_markup: { inline_keyboard: [[{ text: 'Открыть гардероб', web_app: { url: appUrl(env) + '#profile' } }]] } });
}

/* ---------- напоминания: настройки из приложения ---------- */
/** Название урока из приложения попадает в текст сообщения — оставляем только буквы, цифры и простые знаки. */
const cleanTitle = v => typeof v === 'string' ? v.replace(/[^\p{L}\p{N} .,!?«»\-—]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 48) : '';
async function userSync(req, env) {
  const body = await readBody(req); if (!body) return json({ error: 'bad json' }, 400);
  const { uid, tgId, verified } = await who(body, env); if (!uid) return json({ error: 'no id' }, 400);
  await ensureSchema(env.DB);
  const int = (v, lo, hi) => { v = parseInt(v, 10); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null; };
  const tz = int(body.tz, -720, 840) ?? 180, auto = int(body.hour, 0, 23), streak = int(body.streak, 0, 100000) || 0;
  const last = /^\d{4}-\d\d-\d\d$/.test(body.day || '') ? body.day : null, chat = verified && tgId ? tgId : null;
  await env.DB.prepare('INSERT INTO notify(uid,enabled,tz,upd,first) VALUES(?,0,?,?,?) ON CONFLICT(uid) DO NOTHING').bind(uid, tz, Date.now(), today(Date.now() + tz * 6e4)).run();
  // краткий прогресс для содержательных напоминаний: сколько букв и уроков, как называется следующий урок, сколько пора повторить
  const bi = body.info && typeof body.info === 'object' ? body.info : null;
  const info = bi ? JSON.stringify({ l: int(bi.l, 0, 39) || 0, d: int(bi.d, 0, 999) || 0, due: int(bi.due, 0, 999) || 0, nx: cleanTitle(bi.nx) }) : null;
  // ежедневные данные: часовой пояс, обычное время занятий, серия, день последнего занятия
  await env.DB.prepare(`UPDATE notify SET tz=?, auto_hour=COALESCE(?,auto_hour), streak=?,
    ignored=CASE WHEN ? IS NOT NULL AND (last_day IS NULL OR ?>last_day) THEN 0 ELSE ignored END,
    last_day=CASE WHEN last_day IS NULL OR ?>last_day THEN COALESCE(?,last_day) ELSE last_day END,
    chat_id=CASE WHEN enabled=1 AND ? IS NOT NULL THEN ? ELSE chat_id END, info=COALESCE(?,info), upd=? WHERE uid=?`)
    .bind(tz, auto, streak, last, last, last, last, chat, chat, info, Date.now(), uid).run();
  // настройки меняются, только когда человек сам их поменял в приложении (иначе кнопки «Реже» / «Не напоминать» в боте затирались бы)
  if (body.notif && typeof body.notif === 'object') {
    const n = body.notif, on = n.on ? 1 : 0;
    await env.DB.prepare('UPDATE notify SET enabled=?, hour=?, freq=?, chat_id=CASE WHEN ?=1 THEN COALESCE(?,chat_id) ELSE NULL END WHERE uid=?')
      .bind(on, int(n.hour, 0, 23), int(n.freq, 1, 7) || 1, on, chat, uid).run();
  }
  const r = await env.DB.prepare('SELECT enabled, hour, freq, chat_id FROM notify WHERE uid=?').bind(uid).first();
  return json({ ok: true, on: !!r.enabled, hour: r.hour, freq: r.freq || 1, linked: !!r.chat_id });
}

/* ---------- бот ---------- */
const appUrl = env => env.APP_URL || 'https://alaverdyanayk-blip.github.io/aybuben/';
const art = (env, mood) => appUrl(env) + 'ciro/' + mood + '.jpg';
async function tg(env, method, payload) {
  const r = await fetch(`${env.TG_API || 'https://api.telegram.org'}/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  let j = null; try { j = await r.json(); } catch (e) { }
  return j || { ok: false, error_code: r.status };
}
const hookSecret = async env => (await sha('hook:' + env.BOT_TOKEN)).slice(0, 32);
let hookOk = false;
async function ensureWebhook(env, origin, force) {
  if (!env.BOT_TOKEN || !origin || (hookOk && !force)) return;
  await ensureSchema(env.DB);
  const sec = await hookSecret(env), want = origin + '/tg/' + sec;
  const m = await env.DB.prepare("SELECT v FROM meta WHERE k='webhook'").first();
  if (m && m.v === want && !force) { hookOk = true; return; }
  const r = await tg(env, 'setWebhook', { url: want, secret_token: sec, allowed_updates: ['message', 'callback_query'] });
  if (r.ok) hookOk = true;
  if (r.ok) await env.DB.prepare("INSERT INTO meta(k,v) VALUES('webhook',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(want).run();
}
const KB = (env, type) => ({ inline_keyboard: [[{ text: 'Заниматься 2 минуты', web_app: { url: appUrl(env) + (type ? '?r=' + type : '') + '#go' } }], [{ text: 'Реже', callback_data: 'less' }, { text: 'Не напоминать', callback_data: 'off' }]] });
async function botHook(req, env, sec) {
  if (!env.BOT_TOKEN || !safeEq(sec, await hookSecret(env)) || !safeEq(req.headers.get('X-Telegram-Bot-Api-Secret-Token') || '', sec)) return new Response('no', { status: 403 });
  const up = await readBody(req); if (!up) return new Response('ok');
  await ensureSchema(env.DB);
  const setRow = async (id, sql, ...b) => {
    const uid = await tgUid(env, id);
    await env.DB.prepare('INSERT INTO notify(uid,chat_id,enabled,upd,first) VALUES(?,?,1,?,?) ON CONFLICT(uid) DO NOTHING').bind(uid, id, Date.now(), today(Date.now() + 180 * 6e4)).run();
    await env.DB.prepare('UPDATE notify SET ' + sql + ' WHERE uid=?').bind(...b, uid).run();
  };
  if (up.callback_query) {
    const q = up.callback_query, id = q.from && q.from.id, d = q.data;
    if (id && d === 'less') { await setRow(id, 'freq=3, chat_id=?', id); await tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: 'Хорошо, буду писать раз в 3 дня 🍑' }); }
    else if (id && d === 'off') {
      await setRow(id, 'enabled=0, chat_id=NULL');
      await tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: 'Больше не напоминаю. Включить можно в профиле приложения.', show_alert: true });
      if (q.message) await tg(env, 'editMessageReplyMarkup', { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: { inline_keyboard: [[{ text: 'Открыть Айбубен', web_app: { url: appUrl(env) } }]] } });
    } else await tg(env, 'answerCallbackQuery', { callback_query_id: q.id });
    return new Response('ok');
  }
  const m = up.message;
  if (m && m.chat && m.chat.type === 'private' && m.from && typeof m.text === 'string') {
    if (/^\/start/.test(m.text)) {
      await setRow(m.from.id, 'enabled=1, chat_id=?', m.chat.id);
      await tg(env, 'sendPhoto', { chat_id: m.chat.id, photo: art(env, 'cheer'), caption: 'Барев! Я Циро 🍑\nНаучу читать и писать по-армянски.\n\nИногда буду напоминать о себе — не чаще раза в день. Выключить можно кнопкой под напоминанием или командой /stop.', reply_markup: { inline_keyboard: [[{ text: 'Начать учить', web_app: { url: appUrl(env) } }], [{ text: 'Канал Циро', url: CHANNEL }]] } });
    } else if (/^\/stop/.test(m.text)) {
      await setRow(m.from.id, 'enabled=0, chat_id=NULL');
      await tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Больше не напоминаю. Включить снова — /start или в профиле приложения.' });
    }
  }
  return new Response('ok');
}

/** Состояние подключения бота — без секретов: есть ли токен, стоит ли вебхук, последняя ошибка Telegram. */
async function botStatus(env, origin) {
  if (!env.BOT_TOKEN) return json({ token: false, hint: 'Секрет BOT_TOKEN не найден. Проверьте имя (ровно BOT_TOKEN) и что изменения сохранены (Deploy).' });
  const me = await tg(env, 'getMe', {});
  if (!me.ok) return json({ token: true, valid: false, telegram: me.description || me.error_code, hint: 'Telegram не принял токен — скопируйте его заново из BotFather.' });
  let w = await tg(env, 'getWebhookInfo', {}), wi = w.result || {};
  if (!wi.url || !wi.url.startsWith(origin + '/tg/')) { await ensureWebhook(env, origin, true); w = await tg(env, 'getWebhookInfo', {}); wi = w.result || {}; }
  await ensureSchema(env.DB);
  const n = await env.DB.prepare('SELECT COUNT(*) n FROM notify WHERE enabled=1 AND chat_id IS NOT NULL').first();
  return json({ token: true, valid: true, bot: me.result && me.result.username, webhook: !!wi.url && wi.url.startsWith(origin + '/tg/'), pending: wi.pending_update_count || 0, lastError: wi.last_error_message || null, remindersOn: (n && n.n) || 0 });
}

/* ---------- напоминания по расписанию ---------- */
const MSG = {
  joke: [
    ['j1', 'think', 'Ты уже выучил армянский? Твой дядя будет недоволен 😤'],
    ['j2', 'wink', 'Бабушка спросила, умеешь ли ты читать. Я сказал «да». Не подставляй меня.'],
    ['j3', 'think', 'Тётя Ануш опять показывает всем открытку из Еревана. Ты единственный, кто не может её прочитать.'],
    ['j4', 'sad', 'Циро ждёт. Циро не обижается. Циро просто стоит у окна.'],
    ['j5', 'happy', '2 минуты армянского — это меньше, чем дядя произносит тост. Даже первый.'],
    ['j6', 'wow', 'Вай, ахпер, где ты? Буквы скучают.'],
    ['j7', 'wink', 'Мама уже сказала соседям, что ты читаешь по-армянски. Теперь это вопрос чести.'],
    ['j8', 'think', 'Дед читает газету вслух и смотрит на тебя. Следующая страница — твоя.'],
    ['j9', 'happy', 'Один урок короче, чем очередь за лавашем. И лаваш никуда не денется.'],
    ['j10', 'sad', 'Буква Ղ спрашивала про тебя. Я не знал, что ответить.'],
    ['j11', 'wow', 'На семейном застолье будут читать поздравления. Угадай, кому дадут открытку.'],
    ['j12', 'think', 'Тётя прислала в семейный чат сообщение на армянском. Все смеются. А ты?'],
    ['j13', 'wink', 'Три минуты в день — и через месяц ты читаешь вывески в Ереване. Без переводчика.'],
    ['j14', 'happy', 'Я посчитал: пока варится кофе в джезве, можно пройти целый урок.'],
    ['j15', 'sad', 'Сегодня без тебя буквы стояли в ряд и молчали. Очень тихо было.'],
    ['j16', 'think', 'Бабушка говорит: «Кто не читает, тот не ест пахлаву». Я не проверял, но рисковать бы не стал.'],
    ['j17', 'wow', 'Вай! Сегодняшний урок ещё не тронут. А я уже и чай налил.'],
    ['j18', 'wink', 'Двоюродный брат уже читает. Я ничего не говорю. Просто он уже читает.'],
    ['j19', 'happy', 'Абрикосы созревают за лето. Алфавит — за пару недель. Один урок сегодня?'],
    ['j20', 'think', 'Месроп Маштоц придумал 36 букв. От тебя прошу всего один урок.'],
    ['j21', 'sad', 'Я написал тебе записку по-армянски. Лежит, ждёт, когда ты её прочитаешь.'],
    ['j22', 'wink', 'Дядя говорит, что в его время учили без приложений. Покажи дяде, как надо.'],
    ['j23', 'wow', 'Слово дня сегодня особенно красивое. Какое — не скажу, загляни.'],
    ['j24', 'happy', 'Две минуты армянского — и можно с чистой совестью идти есть долму.'],
    ['j25', 'think', 'Бабушка на выходных спросит, как успехи. Давай, чтобы было что ответить.']
  ],
  streak: [
    ['s1', 'wow', 'Серия {n} 🔥 сгорит в полночь. Как шашлык, если отойти от мангала.'],
    ['s2', 'think', 'Если серия сгорит, я расскажу маме. Серия: {n} 🔥'],
    ['s3', 'sad', 'Ты {n} держался. Не будь как тот родственник, который «завтра точно позвонит».']
  ],
  /* Первые три дня после знакомства: вместо общей шутки — конкретика. {l} — сколько букв уже знает, {nx} — следующий урок.
     Третий элемент — текст, четвёртый — запасной, если приложение ещё не прислало название урока. По одному на день. */
  new: [
    ['n1', 'happy', 'У тебя уже {l} из 39. Следующий урок — «{nx}». Это три минуты, я засекал.', 'У тебя уже {l} из 39. Следующий урок — три минуты, я засекал.'],
    ['n2', 'wink', 'Бабушка спросила, сколько букв ты знаешь. Я сказал: {l}. Давай завтра скажу больше — урок «{nx}» ждёт.', 'Бабушка спросила, сколько букв ты знаешь. Я сказал: {l}. Давай завтра скажу больше.'],
    ['n3', 'think', 'Третий день — самый трудный. Дядя на третий день бросил зарядку. Не будь как дядя: «{nx}» — и ты снова в деле.', 'Третий день — самый трудный. Дядя на третий день бросил зарядку. Не будь как дядя.']
  ],
  /* Нажал «Старт», но первый урок так и не прошёл */
  new0: [
    ['z1', 'happy', 'Первый урок — три минуты и четыре буквы. После него ты прочитаешь своё первое слово по-армянски.'],
    ['z2', 'think', 'Я всё ещё жду у первой буквы. Она называется «айб», и с неё начинается всё.'],
    ['z3', 'wink', 'Три минуты — и ты прочитаешь первые армянские буквы. Бабушка оценит.']
  ],
  back: [
    ['b1', 'sad', 'Тебя не было {g}. Бабушка уже накрыла стол «на всякий случай».'],
    ['b2', 'think', 'Я начал забывать твоё лицо. А ты — букву Ժ.'],
    ['b3', 'sad', 'Мне пришлось одному доедать всю долму. Возвращайся.']
  ]
};
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return n + ' ' + (m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c); };
const ddiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
/** Решает, писать ли человеку сейчас. now — время UTC в мс. Возвращает {type, text, mood, id} или null. */
/** Кнопка-ссылка в новости: только на t.me — чтобы опечатка в news.json не увела людей куда попало. */
const newsLink = n => typeof n.url === 'string' && /^https:\/\/t\.me\/[A-Za-z0-9_]{4,64}\/?$/.test(n.url) ? { text: (typeof n.btn === 'string' && n.btn.trim().slice(0, 40)) || 'Открыть', url: n.url } : null;
const CHANNEL = 'https://t.me/aybubenciro';

function plan(row, now, news = []) {
  if (!row.enabled || !row.chat_id) return null;
  const loc = new Date(now + (row.tz ?? 180) * 6e4), day = loc.toISOString().slice(0, 10), h = loc.getUTCHours();
  // новость: один раз каждому, в его обычный час, вместо напоминания этого дня (лимит «одно сообщение в день» сохраняется)
  const seen = (row.news || '').split(',').filter(Boolean), nw = news.find(n => n && n.id && n.text && !seen.includes(n.id) && (!n.until || day <= n.until));
  if (nw && row.last_sent !== day && h === Math.min(22, Math.max(9, row.hour ?? row.auto_hour ?? 19)))
    return { type: 'news', id: nw.id, mood: nw.mood || 'cheer', text: nw.text, link: newsLink(nw), day, ignoredNow: row.ignored || 0, used: row.used || '', news: [nw.id, ...seen].slice(0, 30).join(',') };
  if (row.last_day === day || row.last_sent === day) return null;          // уже занимался сегодня или уже писали
  const gap = row.last_day ? ddiff(row.last_day, day) : 99, since = row.last_sent ? ddiff(row.last_sent, day) : 99;
  const ign = row.ignored || 0;
  if (ign >= 6) return null;                                               // 3 недели тишины — замолкаем до возвращения
  if (ign >= 3 && since < 7) return null;                                  // игнорирует — не чаще раза в неделю
  if ((row.freq || 1) > 1 && since < row.freq) return null;                // «Реже»
  // первые три дня после знакомства — отдельные сообщения; кто ни разу не занимался, тому «тебя не было N дней» не пишем
  const age = row.first ? ddiff(row.first, day) : 99, fresh = age >= 1 && age <= 3;
  let info = null; try { info = row.info ? JSON.parse(row.info) : null; } catch (e) { }
  const began = !!row.last_day || !!(info && info.d > 0);
  const type = !began ? (fresh ? 'new0' : 'joke') : (gap >= 3 && row.last_day) ? 'back' : (gap === 1 && (row.streak || 0) >= 3) ? 'streak' : (fresh && info && info.l > 0) ? 'new' : 'joke';
  let hour = row.hour ?? row.auto_hour ?? 19;
  if (type === 'streak') hour = Math.max(hour, 19);                        // серия под угрозой — вечером
  hour = Math.min(22, Math.max(9, hour));                                  // тихие часы 23:00–9:00
  if (h !== hour) return null;
  const used = (row.used || '').split(',').filter(Boolean), pool = MSG[type];
  const pick = type === 'new' || type === 'new0' ? pool[age - 1] : pool.find(m => !used.includes(m[0])) || pool[Math.floor(Math.random() * pool.length)];
  const nx = info && info.nx ? cleanTitle(info.nx) : '';
  const text = (nx || !pick[3] ? pick[2] : pick[3]).replace('{nx}', nx).replace('{l}', plural((info && info.l) || 0, 'буква', 'буквы', 'букв'))
    .replace('{n}', plural(row.streak || 0, 'день', 'дня', 'дней')).replace('{g}', plural(Math.min(gap, 30), 'день', 'дня', 'дней'));
  return { type, id: pick[0], mood: pick[1], text, day, ignoredNow: row.last_sent && (!row.last_day || row.last_day < row.last_sent) ? ign + 1 : ign, used: [pick[0], ...used.filter(x => x !== pick[0])].slice(0, 60).join(',') };
}
async function runReminders(env, now = Date.now()) {
  if (!env.BOT_TOKEN) return { sent: 0 };
  await ensureSchema(env.DB);
  const rows = (await env.DB.prepare('SELECT * FROM notify WHERE enabled=1 AND chat_id IS NOT NULL').all()).results;
  let news = []; // новости лежат в news.json на сайте: добавили запись и выкатили — бот разошлёт её сам
  try { const r = await fetch(appUrl(env) + 'news.json?t=' + Math.floor(now / 6e5), { cf: { cacheTtl: 300 } }); if (r.ok) { const j = await r.json(); if (Array.isArray(j)) news = j; } } catch (e) { }
  let sent = 0;
  for (const row of rows) {
    const p = plan(row, now, news); if (!p) continue;
    const r = await tg(env, 'sendPhoto', { chat_id: row.chat_id, photo: art(env, p.mood), caption: p.text, reply_markup: p.type === 'news' ? { inline_keyboard: [...(p.link ? [[p.link]] : []), [{ text: 'Открыть Айбубен', web_app: { url: appUrl(env) } }], [{ text: 'Не напоминать', callback_data: 'off' }]] } : KB(env, p.type) });
    if (r.ok) {
      sent++; await env.DB.prepare('UPDATE notify SET last_sent=?, ignored=?, used=?, news=COALESCE(?,news) WHERE uid=?').bind(p.day, p.ignoredNow, p.used, p.news || null, row.uid).run();
      try { await env.DB.prepare('INSERT INTO sent(ts,day,uid,type) VALUES(?,?,?,?)').bind(now, today(now), row.uid, p.type).run(); } catch (e) { } // журнал для статистики
    }
    else if (r.error_code === 403 || r.error_code === 400) await env.DB.prepare('UPDATE notify SET enabled=0, chat_id=NULL WHERE uid=?').bind(row.uid).run(); // заблокировал бота
  }
  return { sent };
}

/* ---------- страница статистики ---------- */
async function sessionToken(env) { return hex(await hmac(env.ADMIN_PASSWORD, 'aybuben-admin-session-v1')); }
function cookie(req, name) { const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)')); return m ? m[1] : null; }
async function authed(req, env) { const c = cookie(req, 'ays'); return !!(c && env.ADMIN_PASSWORD && safeEq(c, await sessionToken(env))); }

async function gather(env) {
  await ensureSchema(env.DB);
  const t = today(), d7 = dayShift(t, -6), d30 = dayShift(t, -29), q = (s, ...b) => env.DB.prepare(s).bind(...b);
  const [k1, k2, k3, k4, k5, k6, daily, newDaily, lessonsDaily, funnel, fails, games, src, ret, phr, remOn, rem, ask] = await env.DB.batch([
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
       FROM users u WHERE u.first_day>=? AND u.first_day<?`, dayShift(t, -30), dayShift(t, -1)),
    q("SELECT p, COUNT(*) n, COUNT(DISTINCT uid) u FROM events WHERE ev='phrase' AND day>=? GROUP BY p ORDER BY n DESC", d30),
    q('SELECT COUNT(*) n FROM notify WHERE enabled=1 AND chat_id IS NOT NULL'),
    // напоминания: сколько отправлено и что было в следующие сутки — открыл ли человек приложение, прошёл ли урок
    q(`SELECT type, COUNT(*) n,
        SUM(CASE WHEN EXISTS(SELECT 1 FROM events e WHERE e.uid=s.uid AND e.ts>=s.ts AND e.ts<s.ts+86400000) THEN 1 ELSE 0 END) opened,
        SUM(CASE WHEN EXISTS(SELECT 1 FROM events e WHERE e.uid=s.uid AND e.ev IN ('lesson','practice','phrase') AND e.ts>=s.ts AND e.ts<s.ts+86400000) THEN 1 ELSE 0 END) studied
       FROM sent s WHERE day>=? GROUP BY type ORDER BY n DESC`, d30),
    q("SELECT ev, COUNT(DISTINCT uid) n FROM events WHERE ev IN ('nt_ask','nt_yes','nt_no','remind','channel') AND day>=? GROUP BY ev", d30)
  ]);
  const one = r => (r.results[0] || {}).n || 0;
  const series = (rows) => { const m = Object.fromEntries(rows.results.map(r => [r.day, r.n])); return Array.from({ length: 30 }, (_, i) => { const d = dayShift(t, i - 29); return [d, m[d] || 0]; }); };
  return {
    today: t, dau: one(k1), wau: one(k2), mau: one(k3), total: one(k4), newToday: one(k5), lessonsToday: one(k6),
    daily: series(daily), newDaily: series(newDaily), lessonsDaily: series(lessonsDaily),
    funnel: funnel.results, fails: fails.results, games: games.results, src: src.results,
    retention: ret.results[0] || { total: 0, back: 0 }, phr: phr.results,
    remOn: one(remOn), rem: rem.results, ask: Object.fromEntries(ask.results.map(r => [r.ev, r.n]))
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
td.n{text-align:right;width:70px;white-space:nowrap}.barc{position:relative}.barc i{position:absolute;left:0;top:7px;bottom:7px;border-radius:5px;background:color-mix(in srgb,var(--accent) 22%,transparent)}.barc span{position:relative}
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
<div><h1>Айб<span>убен</span> · статистика</h1><p class="sub">Сегодня ${D.today} (UTC). Данные обезличены: хранится только хэш id пользователя (и id чата у тех, кто включил напоминания).</p></div>
<div class="kpis" id="kpis"></div>
<div class="card"><h2>Активные пользователи за 30 дней</h2><div id="ch1"></div><div class="lg"><span><i style="background:var(--b3)"></i>активные за день</span><span><i style="background:var(--good)"></i>новые</span></div></div>
<div class="grid2"><div class="card"><h2>Пройдено уроков и тренировок</h2><div id="ch2"></div></div><div class="card"><h2>Игры за 30 дней</h2><div id="games"></div></div></div>
<div class="grid2"><div class="card"><h2>Докуда доходят: уроки, пройденные впервые</h2><div class="tw" id="funnel"></div></div><div class="card"><h2>Самые трудные уроки (кончились сердца)</h2><div id="fails"></div></div></div>
<div class="card"><h2>Фразы: пройденные уроки за 30 дней</h2><div id="phr"></div></div>
<div class="card"><h2>Напоминания за 30 дней</h2><p class="sub" id="remsum" style="margin:0 0 10px"></p><div class="tw" id="rem"></div>
<p class="sub">«Открыли» и «Занимались» — в течение суток после сообщения. Считается с момента, когда появился этот блок.</p></div>
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
const PN={meet:'Знакомство',airport:'Аэропорт',taxi:'Такси',hotel:'Гостиница',street:'На улице',cafe:'Кафе',market:'Рынок',pharmacy:'Аптека и врач',help:'Экстренное'};
table($('#phr'),(D.phr||[]).map(r=>{const [id,n]=String(r.p).split('-');return {n:r.n,u:r.u,t:(PN[id]||id)+(n?' · '+(n==='2'?'диалог':'фразы'):'')}}),['Ситуация','Пройдено','Людей'],r=>r.t);
const RN={joke:'Шутка',streak:'Серия под угрозой',back:'Давно не было',new:'Новичок: первые дни',new0:'Новичок: ещё не начал',news:'Новость'},A=D.ask||{};
$('#remsum').textContent='Включены у '+D.remOn+' · Циро предложил: '+(A.nt_ask||0)+' · согласились: '+(A.nt_yes||0)+' ('+pct(A.nt_yes||0,A.nt_ask||0)+') · отказались: '+(A.nt_no||0)+' · пришли по кнопке под сообщением: '+(A.remind||0)+' · перешли в канал из приложения: '+(A.channel||0);
(function(){const r=D.rem||[],el=$('#rem');if(!r.length){el.innerHTML='<p class="empty">Пока ничего не отправлено.</p>';return}
 const tot=r.reduce((a,x)=>({n:a.n+x.n,opened:a.opened+x.opened,studied:a.studied+x.studied}),{n:0,opened:0,studied:0});
 const row=(t,x,b)=>'<tr><td>'+(b?'<b>'+t+'</b>':esc(t))+'</td><td class="n">'+x.n+'</td><td class="n">'+x.opened+' · '+pct(x.opened,x.n)+'</td><td class="n">'+x.studied+' · '+pct(x.studied,x.n)+'</td></tr>';
 el.innerHTML='<table><tr><th>Сообщение</th><th>Отправлено</th><th>Открыли</th><th>Занимались</th></tr>'+r.map(x=>row(RN[x.type]||x.type,x)).join('')+row('Всего',tot,true)+'</table>'})();
table($('#games'),D.games.map(r=>({n:r.n,u:r.u,t:(GN[String(r.p).split('-')[0]]||r.p)+(String(r.p).includes('-')?' · '+(MN[String(r.p).split('-').slice(1).join('-')]||String(r.p).split('-').slice(1).join('-')):'')})),['Игра','Партий','Игроков'],r=>r.t);
</script></body></html>`;
}

export default {
  async scheduled(ev, env, ctx) { ctx.waitUntil((async () => { await ensureWebhook(env, env.SELF_URL); await runReminders(env, ev.scheduledTime); })()); },
  async fetch(req, env, ctx) {
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
      if (env.ADMIN_PASSWORD && !(await authed(req, env))) return new Response(loginPage(false), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      return new Response(statsPage(await gather(env)), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/r/me' && req.method === 'POST') return refMe(req, env);
    if (url.pathname === '/r/claim' && req.method === 'POST') return refClaim(req, env, ctx);
    if (url.pathname === '/u' && req.method === 'POST') return userSync(req, env);
    if (url.pathname.startsWith('/tg/') && req.method === 'POST') return botHook(req, env, url.pathname.slice(4));
    if (env.BOT_TOKEN && !hookOk && ctx && ctx.waitUntil) ctx.waitUntil(ensureWebhook(env, url.origin).catch(() => {})); // бот подключается сразу после добавления токена, не дожидаясь расписания
    if (url.pathname === '/bot') return botStatus(env, url.origin);
    if (url.pathname === '/health') return new Response('ok');
    return new Response('Not found', { status: 404 });
  }
};

