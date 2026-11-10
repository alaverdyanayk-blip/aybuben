/* Айбубен × Telegram Mini App: тема, вибро-отклик, кнопка «Назад», облачное сохранение прогресса */
(function(){
  var tg=window.Telegram&&window.Telegram.WebApp;
  if(!tg||!tg.initData)return;                       // открыто не в Телеграме — ничего не делаем
  tg.ready();tg.expand();
  try{if(tg.disableVerticalSwipes)tg.disableVerticalSwipes()}catch(e){}

  // Тема: светлая/тёмная как в Телеграме, цвета шапки — как у приложения
  function applyTheme(){
    var pref='auto';try{if(S.theme==='light'||S.theme==='dark')pref=S.theme}catch(e){}
    var dark=pref==='auto'?tg.colorScheme==='dark':pref==='dark',bg=dark?'#1C1416':'#F1E4DE';
    document.documentElement.setAttribute('data-theme',dark?'dark':'light');
    try{tg.setHeaderColor(bg);tg.setBackgroundColor(bg);if(tg.setBottomBarColor)tg.setBottomBarColor(bg)}catch(e){}
  }
  window.__applyTheme=applyTheme;
  applyTheme();tg.onEvent('themeChanged',applyTheme);

  // Вибро-отклик на ответы
  window.__haptic=function(t){try{var H=tg.HapticFeedback;if(t==='ok')H.notificationOccurred('success');else if(t==='bad')H.notificationOccurred('error');else H.impactOccurred('light')}catch(e){}};

  // Свежая версия: если на сайте уже новая сборка, а Телеграм показал старую из кэша — перезагрузиться на новую
  function checkFresh(){
    if(!window.BUILD_ID)return;
    fetch('version.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(v){
      if(v&&v.build&&v.build!==window.BUILD_ID&&!(window.LS||document.getElementById('lesson')||document.getElementById('game'))){
        var k='aybuben_reload_'+v.build;try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(e){}
        location.replace(location.pathname+'?v='+v.build+location.hash)}
    }).catch(function(){});
  }
  checkFresh();document.addEventListener('visibilitychange',function(){if(!document.hidden)checkFresh()});

  // Ссылки на t.me открываем внутри Телеграма, а не во внешнем браузере
  document.addEventListener('click',function(e){var l=e.target.closest&&e.target.closest('a[href^="https://t.me/"]');if(!l)return;try{e.preventDefault();tg.openTelegramLink(l.href)}catch(x){window.open(l.href,'_blank')}},true);

  // Кнопка «Назад» в шапке Телеграма закрывает урок, игру или окно
  var layer=document.getElementById('layer'),BB=tg.BackButton;
  var subPage=function(){return /^#phrases\/./.test(location.hash)};
  function syncBack(){(layer&&layer.children.length)||subPage()?BB.show():BB.hide()}
  if(layer){new MutationObserver(syncBack).observe(layer,{childList:true});syncBack()}
  window.addEventListener('hashchange',syncBack);
  BB.onClick(function(){
    var sc=document.querySelectorAll('.scrim');sc=sc[sc.length-1];
    if(sc){var c=sc.querySelector('[data-close]');if(c)c.click();else sc.click();return}
    if(document.getElementById('lesson')&&window.quitLesson)return quitLesson();
    if(document.getElementById('game')&&window.closeGame)return closeGame();
    if(subPage())location.hash='phrases';
  });

  // Прогресс в облаке Телеграма: виден на телефоне и компьютере, не теряется при очистке кэша
  var CS=tg.CloudStorage,P='aybuben_',CH=3800;
  if(!CS||!tg.isVersionAtLeast||!tg.isVersionAtLeast('6.9'))return;
  function put(st,done){
    var j=JSON.stringify(st),n=Math.ceil(j.length/CH),left=n+1,fin=function(){if(--left===0&&done)done()};
    for(var i=0;i<n;i++)CS.setItem(P+i,j.slice(i*CH,(i+1)*CH),fin);
    CS.setItem(P+'n',String(n),fin);
  }
  var timer;window.__onSave=function(st){if(wiped)return;clearTimeout(timer);timer=setTimeout(function(){put(st)},700)};
  // Сброс прогресса: в облако кладётся чистое сохранение с отметкой сброса — остальные устройства тоже сбросятся
  var wiped=false;
  window.__resetCloud=function(done,st){
    wiped=true;clearTimeout(timer);
    try{put(st||{},done)}catch(x){done()}
  };
  // При входе: копия из облака сливается с копией на устройстве (ничего не теряется), результат сохраняется в обе стороны
  window.__cloudPending=true;
  var ready=function(){window.__cloudPending=false};
  setTimeout(ready,5000);                              // облако молчит — работаем с локальной копией
  CS.getItem(P+'n',function(err,n){
    n=+n;if(err){ready();return}
    if(!n){ready();put(S);return}
    var keys=[];for(var i=0;i<n;i++)keys.push(P+i);
    CS.getItems(keys,function(e2,v){
      if(e2||!v){ready();return}
      try{
        var cloud=JSON.parse(keys.map(function(k){return v[k]||''}).join(''));
        var push=window.syncFromCloud?syncFromCloud(cloud):false;
        ready();if(push)put(S);
      }catch(x){ready()}
    });
  });
})();
