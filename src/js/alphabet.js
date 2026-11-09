/* Подготовка данных: слова тем добавляются в общий список, буквы раскладываются по шагам, словам считается «шаг, с которого их можно прочитать». */
// Слияние с базовым списком слов: новые слова добавляются, у старых появляется тема
(function(){const by={};WORDS.forEach(w=>by[w.a]=w);
  THEMES.forEach(th=>{th.words=th.w.map(([a,r,m])=>{let w=by[a];if(!w){w={a,r,m};WORDS.push(w);by[a]=w}w.th=w.th||th.id;return w})})})();
const BY={};
LETTERS.forEach(l=>BY[l.k]=l);
function units(w){const s=w.toLowerCase(),o=[];for(let i=0;i<s.length;i++){if(s[i]==='ո'&&s[i+1]==='ւ'){o.push('ու');i++}else o.push(s[i])}return o}
WORDS.forEach(w=>{w.u=units(w.a);w.L=Math.max(...w.u.map(u=>BY[u]?BY[u].L:9))});
