/* Айбубен: отправка обезличенных событий на сервер статистики */
(function(){
  var U='__SERVER__/e';
  var tg=window.Telegram&&window.Telegram.WebApp,init=(tg&&tg.initData)||'';
  var anon;try{anon=localStorage.getItem('aybuben_anon');if(!anon){anon=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'a'+Math.random().toString(36).slice(2)+Date.now();localStorage.setItem('aybuben_anon',anon)}}catch(e){anon='a'+Date.now()+Math.random().toString(36).slice(2)}
  window.__stats=function(ev,p){
    var body=JSON.stringify({ev:ev,p:p==null?null:String(p),init:init,anon:anon});
    try{if(navigator.sendBeacon&&navigator.sendBeacon(U,new Blob([body],{type:'text/plain'})))return}catch(e){}
    try{fetch(U,{method:'POST',body:body,headers:{'Content-Type':'text/plain'},keepalive:true})}catch(e){}
  };
  window.__stats('open');
})();
