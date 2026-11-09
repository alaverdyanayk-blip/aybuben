/* Подготовка данных: слова тем добавляются в общий список, буквы раскладываются по шагам, словам считается «шаг, с которого их можно прочитать». */
const GDESC_OLD=['Первые 7 букв — и уже читаются <b class="arm">տուն</b> (дом) и <b class="arm">սար</b> (гора).',
 'Напишете <b class="arm">բարև</b> — привет, прочитаете <b class="arm">կատու</b> — кошка и <b class="arm">Երևան</b>.',
 'Откроются <b class="arm">մայր</b> — мама, <b class="arm">հայր</b> — папа и <b class="arm">Հայաստան</b>.',
 'Звуки с придыханием и без. Прочитаете <b class="arm">հաց</b>, <b class="arm">պանիր</b> и <b class="arm">ծիրան</b>.',
 'Гортанное ղ, раскатистое ռ, дж и дз. Прочитаете <b class="arm">ջուր</b>, <b class="arm">ձուկ</b> и <b class="arm">նուռ</b>.',
 'Последние три буквы — и читается всё: <b class="arm">ընկեր</b> — друг, <b class="arm">ֆուտբոլ</b>.'];
// Слияние с базовым списком слов: новые слова добавляются, у старых появляется тема
(function(){const by={};WORDS.forEach(w=>by[w.a]=w);
  THEMES.forEach(th=>{th.words=th.w.map(([a,r,m])=>{let w=by[a];if(!w){w={a,r,m};WORDS.push(w);by[a]=w}w.th=w.th||th.id;return w})})})();
/* Порядок изучения букв (v2): сначала самые «урожайные» — из них складывается больше всего слов,
   поэтому настоящие слова появляются уже в первом уроке. Прежний порядок нужен для пересчёта прогресса. */
const OLD_GROUPS=[1,2,3,4,5,6].map(n=>LETTERS.filter(l=>l.L===n).map(l=>l.k));
{const ord=ABC_STEPS.flat();LETTERS.sort((a,b)=>ord.indexOf(a.k)-ord.indexOf(b.k));ABC_STEPS.forEach((st,i)=>st.forEach(k=>{LETTERS.find(l=>l.k===k).L=i+1}))}
const BY={};
LETTERS.forEach(l=>BY[l.k]=l);
function units(w){const s=w.toLowerCase(),o=[];for(let i=0;i<s.length;i++){if(s[i]==='ո'&&s[i+1]==='ւ'){o.push('ու');i++}else o.push(s[i])}return o}
WORDS.forEach(w=>{w.u=units(w.a);w.L=Math.max(...w.u.map(u=>BY[u]?BY[u].L:9))});
