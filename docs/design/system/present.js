/* ════════════════════════════════════════════════════════════════
   H-NERVE · BOARD PRESENTATION MODE (self-contained, global).
   Injects a fullscreen icon into the top bar; runs an ambient reel.
   ════════════════════════════════════════════════════════════════ */
(function(){
  if(window.__hnPresent) return; window.__hnPresent=true;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mark='<svg viewBox="0 0 100 100" fill="none" width="100%" height="100%"><circle cx="50" cy="50" r="42" stroke="#C2A35A" stroke-width="2.4" opacity=".6"/><ellipse cx="50" cy="50" rx="42" ry="17" stroke="#C2A35A" stroke-width="2" opacity=".45"/><g stroke="#DCC38A" stroke-width="9" stroke-linecap="round"><line x1="31" y1="26" x2="31" y2="74"/><line x1="69" y1="26" x2="69" y2="74"/><line x1="31" y1="50" x2="69" y2="50"/></g><circle cx="50" cy="50" r="6" fill="#FBF3DC"/></svg>';

  // canonical headline figures (reconcile with group-data.js)
  var GROUPCARD={ eyebrow:"مجموعة الحوراني · النبض", title:"H‑Nerve", sub:"العقل المفكّر لمجموعة الحوراني",
    kpis:[["إيراد المجموعة","١٩٢٬٣٣٥","د.أ","+١٢٪","up"],["صافي الربح","١٥٢٬٥١٣","د.أ","+١٨٪","up"],["ذكاء الدماغ","٩٢","","",""],["مؤشر ESG","٧٥","/١٠٠","",""]] };
  var SECTORS=[
    {logo:"أ",accent:"#C2A35A",eyebrow:"قطاع الضيافة",title:"أرينا للضيافة",sub:"سبعة فنادق · ٧٠٠ غرفة",
      kpis:[["الإيراد","٨٨٬٢١٠","د.أ","+١١٪","up"],["الإشغال","٧١٪","","",""],["متوسط الغرفة","٩٦","د.أ","+٢٪","up"],["رضا النزلاء","٤٫٦","/٥","",""]]},
    {logo:"ع",accent:"#7E9B86",eyebrow:"قطاع التعليم",title:"جامعة عمّان الأهلية",sub:"خمسة برامج · ٨٬٤٢٠ طالب",
      kpis:[["الإيراد","٥٥٬٢١٦","د.أ","−٦٤٪","down"],["الهامش","١٠٠٪","","",""],["الطلبة","٨٬٤٢٠","","+٣٪","up"],["البرامج","٥","","",""]]},
    {logo:"م",accent:"#2E6B57",eyebrow:"قطاع الألبان",title:"المها للألبان",sub:"أسرع وحدة نموّاً في المجموعة",
      kpis:[["الإيراد","٣١٬٥٤٠","د.أ","+٤٤٪","up"],["الإنتاج ٣٠ي","١٤٬٥٠٨","ل","",""],["الهامش","٣٨٪","","",""],["ذكاء الوحدة","٨٤","","",""]]},
    {logo:"ل",accent:"#A88A4A",eyebrow:"قطاع الزراعة",title:"لوران الزراعية",sub:"ثلاث مزارع · توريد داخلي",
      kpis:[["الإيراد","١٧٬٣٦٩","د.أ","+٨٪","up"],["المزارع","٣","","",""],["عائد المحاصيل","+١٨٪","","",""],["ذكاء الوحدة","٧٩","","",""]]}
  ];

  function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;}

  // inject fullscreen button into the top bar
  var bar=document.getElementById("topbar");
  if(bar){
    var btn=el("button","tb-present"); btn.id="hnPresent"; btn.title="وضع العرض · Board mode"; btn.innerHTML="⛶";
    var anchorEl=bar.querySelector(".tb-lang")||bar.querySelector(".tb-user");
    if(anchorEl && anchorEl.parentNode) anchorEl.parentNode.insertBefore(btn,anchorEl); else bar.appendChild(btn);
    btn.addEventListener("click",enter);
  }

  var reel,slideHost,idx=0,timer=null,paused=false,slides=[];
  function build(){
    reel=el("div"); reel.id="hn-stage-reel";
    reel.innerHTML='<div class="reel-aura"></div><div class="reel-aura b"></div><div id="hn-reel-slidehost"></div>';
    document.body.appendChild(reel);
    document.body.appendChild(Object.assign(el("div"),{id:"hn-reel-mode",innerHTML:'<span class="pulse"></span>وضع العرض'}));
    document.body.appendChild(Object.assign(el("div"),{id:"hn-reel-status",innerHTML:'<span class="dot"></span>مباشر'}));
    document.body.appendChild(Object.assign(el("div"),{id:"hn-reel-dots"}));
    document.body.appendChild(Object.assign(el("div"),{id:"hn-reel-hint",innerHTML:'→ ← للتنقّل · مسافة للإيقاف · Esc للخروج'}));
    slideHost=reel.querySelector("#hn-reel-slidehost");
    slides=[GROUPCARD].concat(SECTORS);
    var dots=document.getElementById("hn-reel-dots");
    dots.innerHTML=slides.map(function(_,i){return '<span class="rd'+(i===0?" on":"")+'"></span>';}).join("");
  }
  function kpiHtml(k){ return '<div class="reel-kpi"><div class="v">'+k[1]+(k[2]?'<span class="u">'+k[2]+'</span>':'')+'</div><div class="k">'+k[0]+'</div>'+(k[3]?'<div class="d '+k[4]+'">'+k[3]+'</div>':'')+'</div>'; }
  function render(i){
    var s=slides[i], isGroup=(i===0);
    var head= isGroup
      ? '<div class="reel-logo">'+mark+'</div><div class="reel-eyebrow">'+s.eyebrow+'</div><div class="reel-title">'+s.title+'</div><div class="reel-sub">'+s.sub+'</div>'
      : '<div class="reel-co-logo" style="background:linear-gradient(135deg,'+s.accent+'cc,'+s.accent+')">'+s.logo+'</div><div class="reel-eyebrow" style="color:'+s.accent+'">'+s.eyebrow+'</div><div class="reel-title">'+s.title+'</div><div class="reel-sub">'+s.sub+'</div>';
    slideHost.innerHTML='<div class="reel-slide">'+head+'<div class="reel-kpis">'+s.kpis.map(kpiHtml).join("")+'</div></div>';
    var sl=slideHost.querySelector(".reel-slide");
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ sl.classList.add("show"); }); });
    document.querySelectorAll("#hn-reel-dots .rd").forEach(function(d,j){ d.classList.toggle("on",j===i); });
  }
  function go(i,manual){
    idx=(i+slides.length)%slides.length;
    var cur=slideHost.querySelector(".reel-slide");
    if(cur&&!reduce){ cur.classList.remove("show"); setTimeout(function(){ render(idx); },500); }
    else render(idx);
    if(manual) restart();
  }
  function tick(){ if(!paused) go(idx+1); }
  function restart(){ clearInterval(timer); if(!paused) timer=setInterval(tick, reduce?6000:8500); }

  function enter(){
    if(!reel) build();
    document.body.classList.add("hn-presenting");
    reel.classList.add("on");
    try{ (document.documentElement.requestFullscreen||function(){})(); }catch(e){}
    idx=0; render(0); restart();
    addEventListener("keydown",onKey);
  }
  function exit(){
    document.body.classList.remove("hn-presenting");
    if(reel) reel.classList.remove("on");
    clearInterval(timer); paused=false;
    try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(e){}
    removeEventListener("keydown",onKey);
  }
  function onKey(e){
    if(e.key==="Escape") exit();
    else if(e.key==="ArrowRight"||e.key==="ArrowLeft"){ go(idx+(e.key==="ArrowRight"?(document.dir==="rtl"?-1:1):(document.dir==="rtl"?1:-1)),true); }
    else if(e.key===" "){ e.preventDefault(); paused=!paused; document.getElementById("hn-reel-mode").innerHTML='<span class="pulse"></span>'+(paused?"موقوف":"وضع العرض"); restart(); }
  }
  // click the reel to advance
  document.addEventListener("click",function(e){ if(reel&&reel.classList.contains("on")&&e.target.closest("#hn-stage-reel")){ go(idx+1,true); } });
})();
