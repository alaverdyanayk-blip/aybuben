/* Айбубен × Telegram Mini App: тема, вибро-отклик, кнопка «Назад», облачное сохранение прогресса */
(function(){
  var tg=window.Telegram&&window.Telegram.WebApp;
  if(!tg||!tg.initData)return;                       // открыто не в Телеграме — ничего не делаем
  tg.ready();tg.expand();
  try{if(tg.disableVerticalSwipes)tg.disableVerticalSwipes()}catch(e){}

  // Тема: светлая/тёмная как в Телеграме, цвета шапки — как у приложения
  function applyTheme(){
    var dark=tg.colorScheme==='dark',bg=dark?'#1A1416':'#EEE6E3';
    document.documentElement.setAttribute('data-theme',dark?'dark':'light');
    try{tg.setHeaderColor(bg);tg.setBackgroundColor(bg);if(tg.setBottomBarColor)tg.setBottomBarColor(dark?'#251D20':'#FBF8F7')}catch(e){}
  }
  applyTheme();tg.onEvent('themeChanged',applyTheme);

  // Вибро-отклик на ответы
  window.__haptic=function(t){try{var H=tg.HapticFeedback;if(t==='ok')H.notificationOccurred('success');else if(t==='bad')H.notificationOccurred('error');else H.impactOccurred('light')}catch(e){}};

  // Кнопка «Назад» в шапке Телеграма закрывает урок, игру или окно
  var layer=document.getElementById('layer'),BB=tg.BackButton;
  function syncBack(){layer&&layer.children.length?BB.show():BB.hide()}
  if(layer){new MutationObserver(syncBack).observe(layer,{childList:true});syncBack()}
  BB.onClick(function(){
    var sc=document.querySelectorAll('.scrim');sc=sc[sc.length-1];
    if(sc){var c=sc.querySelector('[data-close]');if(c)c.click();else sc.click();return}
    if(document.getElementById('lesson')&&window.quitLesson)return quitLesson();
    if(document.getElementById('game')&&window.closeGame)return closeGame();
  });

  // Прогресс в облаке Телеграма: виден на телефоне и компьютере, не теряется при очистке кэша
  var CS=tg.CloudStorage,P='aybuben_',CH=3800;
  if(!CS||!tg.isVersionAtLeast||!tg.isVersionAtLeast('6.9'))return;
  function put(st){
    var j=JSON.stringify(st),n=Math.ceil(j.length/CH);
    for(var i=0;i<n;i++)CS.setItem(P+i,j.slice(i*CH,(i+1)*CH));
    CS.setItem(P+'n',String(n));
  }
  var timer;window.__onSave=function(st){clearTimeout(timer);timer=setTimeout(function(){put(st)},700)};
  CS.getItem(P+'n',function(err,n){
    n=+n;if(err)return;if(!n){put(S);return}
    var keys=[];for(var i=0;i<n;i++)keys.push(P+i);
    CS.getItems(keys,function(e2,v){
      if(e2||!v)return;
      try{
        var cloud=JSON.parse(keys.map(function(k){return v[k]||''}).join(''));
        if((cloud.ts||0)>(S.ts||0)){Object.assign(S,cloud);try{localStorage.setItem(KEY,JSON.stringify(S))}catch(x){}route()}
        else if((S.ts||0)>(cloud.ts||0))put(S);
      }catch(x){}
    });
  });
})();
