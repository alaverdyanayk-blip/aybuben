/* ДОСТИЖЕНИЯ (данные): {id, t: название, d: условие словами, ic: значок из js/icons.js, ok: проверка}. */
const ACH=[
 {id:'first',t:'Первый шаг',d:'Пройти первый урок',ic:'star',ok:()=>Object.keys(S.done).length>0},
 {id:'abc',t:'Весь алфавит',d:'Пройти весь алфавит',ic:'book',ok:()=>LESSONS.filter(l=>UNITS[l.unit].alpha).every(l=>S.done[l.id])},
 {id:'reader',t:'Читатель',d:'Прочитать 50 слов',ic:'eye',ok:()=>S.read>=50},
 {id:'perfect',t:'Без ошибок',d:'Пройти урок без единой ошибки',ic:'target',ok:()=>S.perfect>0},
 {id:'s3',t:'Три дня подряд',d:'Серия из 3 дней',ic:'flame',ok:()=>S.best>=3},
 {id:'s7',t:'Неделя',d:'Серия из 7 дней',ic:'flame',ok:()=>S.best>=7},
 {id:'x100',t:'Сто очков',d:'Набрать 100 XP',ic:'bolt',ok:()=>S.xp>=100},
 {id:'x500',t:'Пятьсот',d:'Набрать 500 XP',ic:'bolt',ok:()=>S.xp>=500},
 {id:'gram',t:'Грамматика',d:'Пройти все грамматические разделы',ic:'crown',ok:()=>LESSONS.filter(l=>{const u=UNITS[l.unit];return !u.alpha&&!u.theme&&u.t!=='Литературный язык'}).every(l=>S.done[l.id])},
 {id:'games',t:'Игрок',d:'Сыграть во все мини-игры',ic:'star',ok:()=>GAMES.every(g=>S.games[g.id])},
 {id:'fall20',t:'Ловкие руки',d:'Набрать 20 очков в «Буквопаде»',ic:'bolt',ok:()=>((S.games.fall||{}).best||0)>=20},
 {id:'echo10',t:'Чуткое ухо',d:'Угадать все 10 слов в «Эхо»',ic:'eye',ok:()=>((S.games.echo||{}).best||0)>=10},
 {id:'memo3',t:'Отличная память',d:'Собрать «Найди пары» на три звезды',ic:'star',ok:()=>!!S.memo3},
 {id:'lit',t:'Литературная норма',d:'Пройти раздел «Литературный язык»',ic:'quill',ok:()=>LESSONS.filter(l=>UNITS[l.unit].t==='Литературный язык').every(l=>S.done[l.id])},
 {id:'vocab5',t:'Словарный запас',d:'Пройти 5 тематических разделов',ic:'book',ok:()=>THEMES.filter(th=>LESSONS.filter(l=>UNITS[l.unit].theme===th.id).every(l=>S.done[l.id])).length>=5},
 {id:'trip1',t:'В дорогу!',d:'Пройти диалог любой ситуации во «Фразах»',ic:'star',ok:()=>PHR.some(p=>phDone(p.id))},
 {id:'tripAll',t:'Свой в Ереване',d:'Пройти все ситуации во «Фразах»',ic:'crown',ok:()=>PHR.every(p=>phDone(p.id))},
 {id:'vocabAll',t:'Ходячий словарь',d:'Пройти все тематические разделы',ic:'crown',ok:()=>LESSONS.filter(l=>UNITS[l.unit].theme).every(l=>S.done[l.id])}
];
