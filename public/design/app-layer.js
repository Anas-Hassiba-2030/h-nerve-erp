/* ════════════════════════════════════════════════════════════════
   H-NERVE · APP-LAYER (self-mounting). Add once: <script src=".../app-layer.js" defer>
   Resolves its own base path so it works from / and /sections/.
   ════════════════════════════════════════════════════════════════ */
(function(){
  if(window.__alMounted) return; window.__alMounted=true;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  // base path: detect whether we're in /sections/
  var inSections=/\/sections\//.test(location.pathname);
  var ROOT=inSections?"":"sections/";       // links to sections
  var UP=inSections?"":"";                   // (sections live under /sections)
  function S(p){ return (inSections?"":"sections/")+p; }     // path to a section file
  function ar(n){ return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];}); }
  function el(tag,cls,html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }

  // section registry for palette + quick-add + nav
  var SECTIONS=[
    ["لوحة المجموعة","ui_kits/dashboard/index.html","◧","المساحة"],["المدار","orrery.html","✦","المساحة"],
    ["التحليلات","analytics.html","📊","النمو"],["مقارنة","compare.html","⚖","النمو"],["الأسواق","markets.html","📈","النمو"],["التقارير","reports.html","📄","النمو"],["المالية","finance.html","💰","النمو"],
    ["أرينا","arena.html","🏨","القطاعات"],["المها","maha.html","🥛","القطاعات"],["لوران","loran.html","🌱","القطاعات"],["الأهلية","ahliyya.html","🎓","القطاعات"],["الحوراني القابضة","holding.html","⬡","القطاعات"],["سلسلة التوريد","supply.html","🔗","القطاعات"],
    ["مركز الدماغ","brain.html","🧠","العقل"],["الرسم السببي","causal.html","◈","العقل"],["ماذا لو","whatif.html","🎚","العقل"],["المجلس","council.html","⚖","العقل"],["بحيرة الذاكرة","memory.html","🌊","العقل"],["الإشارات","insights.html","✨","العقل"],["الخطط","plans.html","◆","العقل"],["التنبيهات","alerts.html","⚠","العقل"],["التعلّم","learning.html","📚","العقل"],["ذكاء الدماغ","brainiq.html","◉","العقل"],["الفيدرالية","benchmarks.html","🌐","العقل"],["الراوي","narrate.html","✍","العقل"],["الوثائق","documents.html","📁","العقل"],
    ["المراسلات","messages.html","💬","الفريق"],["المهام","tasks.html","✓","الفريق"],["صندوق الوارد","inbox.html","📥","الفريق"],["الموجز","digest.html","📰","الفريق"],["الفريق","employees.html","👥","الفريق"],
    ["الإدارة ERP","admin.html","⚙","النظام"],["مساحة العمل","workspace.html","◫","النظام"],["الأتمتة","workflows.html","⚡","النظام"],["التكاملات","integrations.html","🔌","النظام"],["التدقيق الشامل","audit.html","🔍","النظام"],["البحث","search.html","⌕","النظام"],["المثبّت","pinned.html","◆","النظام"],["سلة المحذوفات","trash.html","🗑","النظام"],["المعلومات","info.html","ℹ","النظام"],["النظام","system.html","⚙","النظام"]
  ];
  function go(href){ location.href = inSections ? (href.indexOf("/")>=0?"../"+href:href) : (href.indexOf("ui_kits")>=0||href.indexOf("orrery")>=0?href:"sections/"+href); }

  // ── mount DOM ──
  var fabs=el("div"); fabs.id="al-fabs";
  fabs.innerHTML=
    '<button class="al-fab brain" id="alBrain" title="اسأل الدماغ">✦<span class="al-fab-lbl">اسأل الدماغ</span></button>'+
    '<button class="al-fab" id="alAdd" title="إضافة سريعة">＋<span class="al-fab-lbl">إضافة سريعة</span></button>'+
    '<button class="al-fab" id="alTime" title="آلة الزمن" style="background:linear-gradient(135deg,#cf9d9d,#A86A5C);color:#fff">⏱<span class="al-fab-lbl">آلة الزمن</span></button>';
  document.body.appendChild(fabs);
  document.body.appendChild(Object.assign(el("div"),{id:"al-toasts"}));
  var timeBanner=el("div"); timeBanner.id="al-time"; timeBanner.innerHTML='⏱ تعرض البيانات كما كانت في <b id="alTimeDate"></b> <button id="alTimeExit">العودة إلى الحاضر</button>'; document.body.appendChild(timeBanner);
  var drop=el("div"); drop.id="al-drop"; drop.innerHTML='<div class="box"><div class="i">⬆</div><div class="t">أفلت الملف — سيُرسل إلى الوثائق</div></div>'; document.body.appendChild(drop);

  function scrim(content,center){ var s=el("div","al-scrim"+(center?" center":"")); s.appendChild(content); document.body.appendChild(s);
    s.addEventListener("click",function(e){ if(e.target===s) close(s); }); requestAnimationFrame(function(){ s.classList.add("open"); }); return s; }
  function close(s){ s.classList.remove("open"); setTimeout(function(){ s.remove(); },300); }

  // ── toasts + undo ──
  window.alToast=function(msg,onUndo){
    var t=el("div","al-toast","<span>"+msg+"</span>"+(onUndo?'<button class="undo">تراجع</button>':""));
    document.getElementById("al-toasts").appendChild(t); requestAnimationFrame(function(){t.classList.add("show");});
    if(onUndo) t.querySelector(".undo").addEventListener("click",function(){ onUndo(); t.remove(); });
    setTimeout(function(){ t.classList.remove("show"); setTimeout(function(){t.remove();},350); },onUndo?4500:2600);
  };

  // ── command palette ──
  var palScrim=null;
  function openPalette(){
    var box=el("div","al-pal");
    box.innerHTML='<div class="al-pal-in"><span class="k">⌘</span><input id="alPalQ" placeholder="انتقل إلى أي قسم…"></div><div class="al-pal-list" id="alPalList"></div>';
    palScrim=scrim(box);
    var q=box.querySelector("#alPalQ"), list=box.querySelector("#alPalList"), sel=0, filtered=SECTIONS.slice();
    function draw(){ list.innerHTML=filtered.map(function(s,i){return '<div class="al-pal-row'+(i===sel?" sel":"")+'" data-i="'+i+'"><span class="ri">'+s[2]+'</span><div><div class="rt">'+s[0]+'</div><div class="rg">'+s[3]+'</div></div></div>';}).join("")||'<div style="padding:20px;text-align:center;color:#6B6459">لا نتائج</div>';
      list.querySelectorAll(".al-pal-row").forEach(function(r){ r.addEventListener("click",function(){ go(filtered[+r.dataset.i][1]); }); }); }
    q.addEventListener("input",function(){ filtered=SECTIONS.filter(function(s){return (s[0]+s[3]).indexOf(q.value)>=0;}); sel=0; draw(); });
    q.addEventListener("keydown",function(e){ if(e.key==="ArrowDown"){sel=Math.min(sel+1,filtered.length-1);draw();e.preventDefault();}
      else if(e.key==="ArrowUp"){sel=Math.max(sel-1,0);draw();e.preventDefault();}
      else if(e.key==="Enter"&&filtered[sel]){ go(filtered[sel][1]); } });
    draw(); setTimeout(function(){q.focus();},50);
  }
  addEventListener("keydown",function(e){ if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); openPalette(); } });

  // ── ask the brain ──
  var REPLIES=["بناءً على بيانات المجموعة، أوصي بمراجعة هامش الضيافة أولاً.","المها تقود النموّ هذا الربع — التوسّع التدريجي هو الخيار الأكثر أماناً.","رصدتُ أربع دفعات قرب الانتهاء؛ تصريفها يحرّر ١٤٬٥٠٨ لتراً.","صافي الربح فوق المستهدف بـ ١٨٪. التدفّق النقدي يتطلّب انتباهاً.","يمكنني فتح مسرح القرار لعرض التحليل الكامل — قل لي."];
  function openBrain(){
    var p=el("div","al-brain-panel");
    p.innerHTML='<div class="al-bp-head"><span class="orb"></span><span class="t">اسأل الدماغ</span><button class="x">×</button></div>'+
      '<div class="al-bp-msgs" id="alBpMsgs"><div class="al-bp-msg brain">مرحباً أنس. أنا دماغ المجموعة — اسألني عن أي شركة أو قرار أو رقم.</div></div>'+
      '<div class="al-bp-in"><button class="al-bp-mic" id="alMic" title="إملاء صوتي">🎙</button><input id="alBpIn" placeholder="اكتب سؤالك…"><button id="alBpSend">➤</button></div>';
    document.body.appendChild(p); requestAnimationFrame(function(){p.classList.add("open");});
    var msgs=p.querySelector("#alBpMsgs"), inp=p.querySelector("#alBpIn");
    function add(cls,txt){ var m=el("div","al-bp-msg "+cls); msgs.appendChild(m); 
      if(cls==="brain"&&!reduce){ var i=0; (function tw(){ m.textContent=txt.slice(0,i); msgs.scrollTop=msgs.scrollHeight; if(i++<txt.length) setTimeout(tw,14); })(); }
      else m.textContent=txt; msgs.scrollTop=msgs.scrollHeight; }
    function send(){ var v=inp.value.trim(); if(!v)return; add("user",v); inp.value=""; setTimeout(function(){ add("brain",REPLIES[Math.floor(Math.random()*REPLIES.length)]); },500); }
    p.querySelector("#alBpSend").addEventListener("click",send);
    inp.addEventListener("keydown",function(e){ if(e.key==="Enter")send(); });
    p.querySelector(".x").addEventListener("click",function(){ p.classList.remove("open"); setTimeout(function(){p.remove();},400); });
    var mic=p.querySelector("#alMic"); mic.addEventListener("click",function(){ mic.classList.toggle("rec"); if(mic.classList.contains("rec")){ setTimeout(function(){ mic.classList.remove("rec"); inp.value="ما حالة المها اليوم؟"; },1800); } });
    setTimeout(function(){inp.focus();},80);
  }
  document.getElementById("alBrain").addEventListener("click",function(){ var inSec=/\/sections\//.test(location.pathname); location.href=(inSec?"../":"")+"advisor.html"; });

  // ── quick add ──
  document.getElementById("alAdd").addEventListener("click",function(){
    var box=el("div","al-dialog");
    var types=[["مهمة","tasks.html"],["إشارة","insights.html"],["حجز","arena.html"],["دفعة","maha.html"],["وثيقة","documents.html"],["شركة","holding.html"]];
    box.innerHTML='<h3>إضافة سريعة</h3><div class="ds">اختر ما تريد إنشاءه</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
      types.map(function(t){return '<button class="al-qa" data-h="'+t[1]+'" style="padding:14px;border-radius:12px;border:1px solid #e4dccb;background:#fff;font-family:var(--ui,sans-serif);font-weight:700;font-size:13px;color:#2A2A26;cursor:pointer">＋ '+t[0]+'</button>';}).join("")+'</div>';
    var s=scrim(box,true);
    box.querySelectorAll(".al-qa").forEach(function(b){ b.addEventListener("click",function(){ close(s); go(b.dataset.h); }); });
  });

  // ── time machine ──
  var MONTHS=["كانون الثاني","شباط","آذار","نيسان","أيار"];
  document.getElementById("alTime").addEventListener("click",function(){
    var box=el("div","al-tm-pop");
    box.innerHTML='<h3>آلة الزمن</h3><div class="ds" style="font-size:12px;color:#6B6459">اسحب لعرض المجموعة كما كانت في تاريخ سابق</div>'+
      '<div class="al-tm-cur" id="alTmCur">الحاضر · أيار ٢٠٢٦</div><input type="range" min="0" max="5" value="5" id="alTmRange"><div class="al-tm-dates"><span>كانون الثاني ٢٠٢٦</span><span>الآن</span></div>'+
      '<button style="width:100%;margin-top:18px;background:linear-gradient(135deg,var(--al-gold-s),var(--al-gold));border:0;border-radius:12px;padding:12px;font-family:var(--ui,sans-serif);font-weight:700;cursor:pointer" id="alTmApply">طبّق</button>';
    var s=scrim(box,true); var r=box.querySelector("#alTmRange"), cur=box.querySelector("#alTmCur");
    r.addEventListener("input",function(){ cur.textContent=r.value==5?"الحاضر · أيار ٢٠٢٦":(MONTHS[r.value]+" ٢٠٢٦"); });
    box.querySelector("#alTmApply").addEventListener("click",function(){
      var tb=document.getElementById("al-time");
      if(r.value==5){ tb.classList.remove("show"); document.body.style.filter=""; }
      else { document.getElementById("alTimeDate").textContent=MONTHS[r.value]+" ٢٠٢٦"; tb.classList.add("show"); document.body.style.filter="sepia(.12)"; }
      close(s);
    });
  });
  document.getElementById("alTimeExit").addEventListener("click",function(){ document.getElementById("al-time").classList.remove("show"); document.body.style.filter=""; });

  // ── notifications (bell) — hook any element with id=ph bell if present, else add to fabs? we add a top bell via existing topbar if any
  window.alNotify=function(){
    var box=el("div","al-notif");
    box.innerHTML='<h4>التنبيهات</h4>'+[["⚠","هبوط إيراد الأهلية ٦٤٪","قبل ٣ ساعات"],["🧠","المجلس أنهى نقاش توسّع المها","قبل ساعتين"],["🥛","٤ دفعات قرب الانتهاء","قبل ساعتين"],["✓","اكتملت مهمة مراجعة الربع","قبل ٤٠ د"]].map(function(n){return '<div class="al-notif-row"><span class="ni">'+n[0]+'</span><div><div class="nt">'+n[1]+'</div><div class="ns">'+n[2]+'</div></div></div>';}).join("");
    scrim(box);
  };
  // wire any topbar bell
  var bell=document.querySelector(".ph-icon [data-lucide='bell'], #bell, .al-bell"); if(bell&&bell.closest("button")) bell.closest("button").addEventListener("click",function(e){e.preventDefault();alNotify();});

  // ── global drag-drop ──
  var dragDepth=0;
  addEventListener("dragenter",function(e){ if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types,"Files")>=0){ dragDepth++; drop.classList.add("show"); } });
  addEventListener("dragover",function(e){ if(drop.classList.contains("show")) e.preventDefault(); });
  addEventListener("dragleave",function(){ dragDepth=Math.max(0,dragDepth-1); if(!dragDepth) drop.classList.remove("show"); });
  addEventListener("drop",function(e){ if(drop.classList.contains("show")){ e.preventDefault(); dragDepth=0; drop.classList.remove("show");
    var n=e.dataTransfer.files.length; if(n) alToast("استُلمت "+ar(n)+" وثيقة → الوثائق",null); } });

  // ── drill-down on KPIs ──
  window.alDrill=function(title,sub,rows){
    var box=el("div","al-dialog");
    box.innerHTML='<h3>'+title+'</h3><div class="ds">'+(sub||"")+'</div>'+
      (rows||[]).map(function(r){return '<div style="display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #f0e9da;font-family:var(--ui,sans-serif);font-size:13px"><span style="color:#6B6459">'+r[0]+'</span><b style="color:#1F4D3F">'+r[1]+'</b></div>';}).join("");
    scrim(box,true);
  };
  // auto-wire dashboard/section KPIs (work register) for drill-down
  document.addEventListener("click",function(e){
    var k=e.target.closest(".kpi-card, .ms-kpi, .tk-kpi, .br-kpi"); if(!k||k.__noDrill) return;
    var label=(k.querySelector(".kpi-label,.k")||{}).textContent||"تفصيل";
    var val=(k.querySelector(".kpi-val,.v")||{}).textContent||"";
    alDrill(label, val, [["آخر ٣٠ يوماً",val],["الفترة السابقة","—"],["التغيّر","▲"],["المصدر","الدماغ التشغيلي"]]);
  });

  // ── pin button via event delegation (any [data-pin]) ──
  document.addEventListener("click",function(e){ var p=e.target.closest("[data-pin]"); if(p){ e.preventDefault(); alToast("ثُبّت العنصر → المثبّت",function(){ alToast("أُلغي التثبيت"); }); } });

  // ── onboarding (first visit) ──
  try{ if(!localStorage.getItem("hnerve_onboarded") && !inSections){
    setTimeout(function(){
      var box=el("div","al-onb");
      box.innerHTML='<img class="logo" src="assets/logo-hnerve.svg" alt=""><h2>أهلاً بك في H‑Nerve</h2><p>هذا ليس نظام إدخال بيانات — إنه عقلٌ يفكّر تحت كل شاشة. تنقّل عبر <b style="color:#DCC38A">المدار</b>، واسأل الدماغ في أي وقت.</p><div class="dots"><span class="on"></span><span></span><span></span></div><button id="alOnbDone">ابدأ الجولة</button>';
      var s=scrim(box,true);
      box.querySelector("#alOnbDone").addEventListener("click",function(){ localStorage.setItem("hnerve_onboarded","1"); close(s); alToast("جولة سريعة: اضغط ⌘K للتنقّل، و✦ لسؤال الدماغ"); });
    }, 3600); // after the Gathering
  } }catch(e){}

  // ── states: brief loading skeleton on KPI grids at entry; error helper ──
  if(!reduce){
    var grids=document.querySelectorAll(".kpi-grid, .co-kpis, .br-kpis, .ms-kpis, .tk-kpis, .ib-kpis, .em-kpis");
    grids.forEach(function(g){
      if(g.__skel||!g.children.length) return; g.__skel=1;
      var real=[].slice.call(g.children); var h=g.offsetHeight;
      var sk=[]; real.forEach(function(c){ var s=document.createElement("div"); s.className="al-skel"; s.style.height=(c.offsetHeight||90)+"px"; sk.push(s); });
      real.forEach(function(c){ c.style.display="none"; }); sk.forEach(function(s){ g.appendChild(s); });
      setTimeout(function(){ sk.forEach(function(s){s.remove();}); real.forEach(function(c){ c.style.display=""; }); },520);
    });
  }
  window.alError=function(mount,msg,onRetry){
    var el=typeof mount==="string"?document.querySelector(mount):mount; if(!el) return;
    el.innerHTML='<div class="al-errwrap"><div class="ei">⚠</div><div class="et">تعذّر تحميل البيانات</div><div class="es">'+(msg||"حدث خطأ غير متوقّع")+'</div><button>إعادة المحاولة</button></div>';
    var b=el.querySelector("button"); if(b&&onRetry) b.addEventListener("click",onRetry);
  };
})();

/* ════════ Mini-Orrery (top-bar radial nav) + Constellation Rail ════════ */
(function(){
  if(window.__alNav) return; window.__alNav=true;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var inSections=/\/sections\//.test(location.pathname);
  function path(href){ // href is "sections/x.html" / "ui_kits/..." / "orrery.html" (root-relative)
    if(inSections){
      // we are inside /sections/ : strip a leading "sections/" (same dir), else go up one level
      if(href.indexOf("sections/")===0) return href.slice("sections/".length);
      return "../"+href;
    }
    return href;
  }
  // GROUPS: anchor → children [label, file(relative-to-root)]
  var GROUPS=[
    {id:"overview",name:"لوحة المجموعة",file:"ui_kits/dashboard/index.html",kids:[["لوحة المجموعة","ui_kits/dashboard/index.html"],["العرض","orrery.html"]]},
    {id:"sectors",name:"القطاعات",kids:[["أرينا","sections/arena.html"],["المها","sections/maha.html"],["لوران","sections/loran.html"],["الأهلية","sections/ahliyya.html"],["الحوراني القابضة","sections/holding.html"],["سلسلة التوريد","sections/supply.html"]]},
    {id:"intel",name:"العقل",kids:[["مركز الدماغ","sections/brain.html"],["الرسم السببي","sections/causal.html"],["ماذا لو","sections/whatif.html"],["المجلس","sections/council.html"],["بحيرة الذاكرة","sections/memory.html"],["الإشارات","sections/insights.html"],["الخطط","sections/plans.html"],["التنبيهات","sections/alerts.html"],["التعلّم","sections/learning.html"],["المعايير","sections/benchmarks.html"],["ذكاء الدماغ","sections/brainiq.html"],["الراوي","sections/narrate.html"],["الوثائق","sections/documents.html"]]},
    {id:"finance",name:"المالية",kids:[["المركز المالي","sections/finance.html"],["التحليلات","sections/analytics.html"],["مقارنة","sections/compare.html"],["الأسواق","sections/markets.html"],["التقارير","sections/reports.html"]]},
    {id:"team",name:"الفريق",kids:[["المراسلات","sections/messages.html"],["المهام","sections/tasks.html"],["صندوق الوارد","sections/inbox.html"],["الموجز","sections/digest.html"],["الفريق","sections/employees.html"]]},
    {id:"system",name:"النظام",kids:[["الإدارة ERP","sections/admin.html"],["مساحة العمل","sections/workspace.html"],["الأتمتة","sections/workflows.html"],["التكاملات","sections/integrations.html"],["التدقيق","sections/audit.html"],["البحث","sections/search.html"],["المثبّت","sections/pinned.html"],["المحذوفات","sections/trash.html"],["المعلومات","sections/info.html"],["النظام","sections/system.html"]]}
  ];
  function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;}
  var curFile=location.pathname.split("/").pop();

  // ── Mini-Orrery: inject button into top bar ──
  var tb=document.getElementById("topbar");
  if(tb){
    var brand=tb.querySelector(".tb-brand")||tb;
    var btn=el("button"); btn.id="al-mini-btn"; btn.title="المدار المصغّر"; btn.innerHTML='<span class="mb-ring"></span><span class="mb-core"></span>';
    brand.appendChild(btn);
    btn.addEventListener("click",function(e){ e.stopPropagation(); openMini(btn); });
  }
  function openMini(anchorBtn){
    closeMini();
    var r=anchorBtn.getBoundingClientRect();
    var scrim=el("div","al-mini-scrim"); document.body.appendChild(scrim);
    var wrap=el("div","al-mini"); document.body.appendChild(wrap);
    // Anchor as a fixed viewport popover just below the top bar, horizontally near the
    // button but always fully on-screen (robust against scaled/transformed ancestors).
    var bx = (r && r.width) ? (r.left + r.width/2) : innerWidth/2;
    var cx = Math.min(Math.max(bx, 190), innerWidth-190);
    wrap.style.left = (cx-180)+"px";
    wrap.style.top  = Math.max(64, Math.min((r&&r.bottom?r.bottom:60)+8, innerHeight-380)) + "px";
    var core=el("div","al-mini-core","المدار"); wrap.appendChild(core);
    core.addEventListener("click",function(){ bloom(null); });
    var state=null;
    function clearNodes(){ [].slice.call(wrap.querySelectorAll(".mini-node")).forEach(function(n){n.remove();}); }
    function ring(items,radius,onPick,curName){
      clearNodes();
      items.forEach(function(it,i){
        var ang=(-90 + i*(360/items.length))*Math.PI/180;
        var x=180+Math.cos(ang)*radius, y=180+Math.sin(ang)*radius;
        var node=el("div","mini-node"+(it.name===curName?" sel":"")); 
        node.innerHTML='<span class="mn-star"></span><span class="mn-lbl">'+it.name+'</span>';
        wrap.appendChild(node);
        requestAnimationFrame(function(){ node.style.transform="translate(-50%,-50%) translate("+(x-180)+"px,"+(y-180)+"px) scale(1)"; node.classList.add("in"); });
        node.addEventListener("click",function(ev){ ev.stopPropagation(); onPick(it); });
      });
    }
    function bloom(g){
      state=g;
      if(!g){ core.textContent="المدار"; ring(GROUPS.map(function(x){return {name:x.name,g:x};}),120,function(it){ if(it.g.kids&&it.g.kids.length>1) bloom(it.g); else dive(it.g.file); }); }
      else { core.textContent=g.name; ring(g.kids.map(function(k){return {name:k[0],file:k[1]};}),140,function(it){ dive(it.file); }, curArabicName()); }
    }
    function dive(file){ closeMini(); if(reduce){ location.href=path(file); return; }
      var orb=el("div"); orb.style.cssText="position:fixed;left:50%;top:50%;width:120px;height:120px;border-radius:50%;z-index:230;transform:translate(-50%,-50%) scale(0);background:radial-gradient(circle at 40% 35%,#2E6B57,#1F4D3F 55%,#0c2019);box-shadow:0 0 80px rgba(31,77,63,.7)";
      document.body.appendChild(orb);
      var cover=(Math.max(innerWidth,innerHeight)*2.6)/120;
      orb.animate([{transform:"translate(-50%,-50%) scale(0)",opacity:1},{transform:"translate(-50%,-50%) scale("+cover+")",opacity:1}],{duration:300,easing:"cubic-bezier(.5,0,.5,1)",fill:"forwards"});
      setTimeout(function(){ location.href=path(file); },300);
    }
    bloom(null);
    scrim.addEventListener("click",closeMini);
    document.addEventListener("keydown",escClose);
  }
  function escClose(e){ if(e.key==="Escape") closeMini(); }
  function closeMini(){ [].slice.call(document.querySelectorAll(".al-mini,.al-mini-scrim")).forEach(function(n){n.remove();}); document.removeEventListener("keydown",escClose); }

  // ── current group detection ──
  function curGroup(){ for(var i=0;i<GROUPS.length;i++){ if(GROUPS[i].kids.some(function(k){return k[1].split("/").pop()===curFile;})) return GROUPS[i]; } return null; }
  function curArabicName(){ var g=curGroup(); if(!g)return ""; var k=g.kids.filter(function(k){return k[1].split("/").pop()===curFile;})[0]; return k?k[0]:""; }

  // ── Constellation Rail ──
  var g=curGroup();
  if(g && inSections){
    var host=document.querySelector(".wrap, .br-wrap, .ms-wrap, .tk-wrap, .ib-wrap, .em-wrap, .ml-wrap, .co-wrap, .wi-wrap");
    if(host){
      var night=/data-living="night"/.test(document.documentElement.outerHTML)|| document.documentElement.getAttribute("data-living")==="night";
      var rail=el("div"); rail.id="al-rail"; if(!night) rail.className="light";
      var head=host.querySelector(".sec-head, .br-ribbon, .ms-ribbon, .tk-top, .ib-top, .em-top, .ml-ribbon, .co-ribbon, .wi-ribbon");
      rail.innerHTML='<span class="rail-grp">'+g.name+'</span>'+g.kids.map(function(k){var cur=k[1].split("/").pop()===curFile; return '<span class="rail-item'+(cur?" cur":"")+'" data-h="'+k[1]+'">'+k[0]+'</span>';}).join("")+'<button class="rail-toggle" title="طيّ/توسيع">⇆</button>';
      if(head&&head.parentNode) head.parentNode.insertBefore(rail,head.nextSibling); else host.insertBefore(rail,host.firstChild);
      rail.addEventListener("click",function(e){
        var item=e.target.closest(".rail-item"); var tog=e.target.closest(".rail-toggle");
        if(tog){ rail.classList.toggle("collapsed"); return; }
        if(item && !item.classList.contains("cur")){ hop(item.dataset.h); }
      });
    }
  }
  function hop(file){
    if(reduce){ location.href=path(file); return; }
    var w=el("div"); w.style.cssText="position:fixed;inset:0;z-index:240;pointer-events:none;transform:translateX(-120%);background:linear-gradient(108deg,transparent 0 40%,rgba(226,201,140,.92) 49%,rgba(194,163,90,.55) 57%,transparent 66% 100%)";
    document.body.appendChild(w);
    w.animate([{transform:"translateX(-120%)"},{transform:"translateX(120%)"}],{duration:380,easing:"cubic-bezier(.5,0,.5,1)",fill:"forwards"});
    setTimeout(function(){ location.href=path(file); },240);
  }

  // ── Sector / subsystem Intro Moment (once per session per section) ──
  var INTRO={
    arena:["القطاعات · الضيافة","أرينا","ضيافةٌ تُصنع لحظةً بلحظة عبر سبعة فنادق."],
    maha:["القطاعات · الألبان","المها","حليبٌ يحفظ ذاكرة الأرض في كل قطرة."],
    loran:["القطاعات · الزراعة","لوران","أرضٌ تُنبت، وعقلٌ يوجّه الحصاد."],
    ahliyya:["القطاعات · التعليم","الأهلية","عقولٌ تُبنى اليوم لتقود الغد."],
    holding:["القطاعات · الحوكمة","الحوراني القابضة","إمبراطوريةٌ تُدار بحكمة الأجيال."],
    supply:["القطاعات · اللوجستيات","سلسلة التوريد","كل تدفّقٍ يتنبّأ به الدماغ قبل أن يحدث."],
    causal:["العقل · الرسم السببي","الرسم السببي","كل قرارٍ خيطٌ في شبكةٍ أوسع."],
    whatif:["العقل · المحاكاة","ماذا لو","حرّك رافعةً، وشاهد المجموعة تتنفّس."],
    council:["العقل · المجلس","المجلس","خمسة عقولٍ تتناظر ليطمئنّ عقلٌ واحد."],
    memory:["العقل · الذاكرة","بحيرة الذاكرة","النظام يتذكّر كل موقفٍ مرّ به."],
    brain:["العقل · المركز","العقل المفكّر","ذكاءٌ يقرأ، يوازن، ثم يروي."],
    finance:["النمو ورأس المال · المالية","المالية","حيث تلتقي الأرقام بالحكمة."],
    analytics:["النمو ورأس المال · التحليلات","التحليلات","اثنا عشر شهراً تُروى في لمحة."],
    messages:["الأفراد · التواصل","المراسلات","حيث تُتّخذ القرارات بين السطور."],
    tasks:["الأفراد · المهام","المهام","كل إنجازٍ خطوةٌ نحو الإتقان."],
    admin:["النظام · المكتب الخلفي","الإدارة","حيث تُمسك الخيوط كلّها."]
  };
  var seg=curFile.replace(".html",""); var intro=INTRO[seg];
  if(intro && inSections && !reduce){
    var key="hnerve_intro_"+seg;
    try{ if(!sessionStorage.getItem(key)){
      sessionStorage.setItem(key,"1");
      var night=document.documentElement.getAttribute("data-living")==="night";
      var ov=el("div"); ov.id="al-intro"+(night?"":""); ov.className=(night?"night ":"")+"in"; ov.id="al-intro";
      ov.innerHTML='<div class="ie">'+intro[0]+'</div><div class="ih">'+intro[1]+'</div><div class="irule"></div><div class="is">'+intro[2]+'</div><div class="iskip">انقر للتخطّي</div>';
      document.body.appendChild(ov);
      var done=false;
      function endIntro(){ if(done)return; done=true; ov.classList.remove("in"); ov.classList.add("out"); setTimeout(function(){ ov.remove(); },600); cleanup(); }
      function cleanup(){ ov.removeEventListener("click",endIntro); removeEventListener("keydown",keyEsc); removeEventListener("wheel",endIntro); }
      function keyEsc(e){ if(e.key==="Escape"||e.key===" ") endIntro(); }
      ov.addEventListener("click",endIntro); addEventListener("keydown",keyEsc); addEventListener("wheel",endIntro,{passive:true,once:true});
      setTimeout(endIntro, 2100);
    } }catch(e){}
  }
})();

/* ════════ inject Board Presentation Mode (global) ════════ */
(function(){
  var inSec=/\/sections\//.test(location.pathname);
  var base=inSec?"../":"";
  if(!window.HN_STRINGS && !document.querySelector('script[src$="i18n.js"]')){
    var i18=document.createElement("script"); i18.src=base+"i18n.js"; document.head.appendChild(i18);
  }
  if(!document.querySelector('link[href$="present.css"]')){
    var lk=document.createElement("link"); lk.rel="stylesheet"; lk.href=base+"present.css"; document.head.appendChild(lk);
  }
  if(!document.querySelector('script[src$="present.js"]')){
    var sc=document.createElement("script"); sc.src=base+"present.js"; sc.defer=true; document.body.appendChild(sc);
  }
})();
(function(){
  if(window.__hnTopbar) return; window.__hnTopbar=true;
  var bar=document.getElementById("topbar"); if(!bar) return;
  var onOrrery=!!document.getElementById("center-pick") || /orrery\.html/.test(location.pathname);
  var inSec=/\/sections\//.test(location.pathname);
  var I18N={ ar:{name:"أ. الحوراني",role:"الرئيس · مجموعة الحوراني",orbit:"↺ العودة إلى المدار"},
             en:{name:"A. Al-Hourani",role:"Chairman · Hourani Group",orbit:"↺ Back to Orbit"} };
  var lang=localStorage.getItem("hnerve_lang")||"ar";

  // 1. clean the user chip (fix garbled/overlapping role text) — skip orrery (its own chip+menu)
  if(!onOrrery){
    var chip=bar.querySelector(".tb-user");
    if(chip){
      var info=chip.querySelector(".tb-uinfo");
      if(info){ info.innerHTML='<span class="tb-uname" data-i18n="chrome.user.name"></span><span class="tb-urole" data-i18n="chrome.user.role"></span>'; }
      var orbA=bar.querySelector(".tb-orbit"); if(orbA) orbA.setAttribute("data-i18n","chrome.backToOrbit");
      if(!chip.querySelector(".tb-caret")){ var cv=document.createElement("span"); cv.className="tb-caret"; cv.textContent="▾"; chip.appendChild(cv); }
      // working profile dropdown (every section page)
      if(!chip.querySelector(".tb-menu")){
        var menu=document.createElement("div"); menu.className="tb-menu";
        menu.innerHTML='<div class="mi" data-act="profile"><span class="ic">◔</span><span data-i18n="menu.profile"></span></div>'+
          '<div class="mi" data-act="role"><span class="ic">⇅</span><span data-i18n="menu.role"></span> · <b id="hnRoleNow"></b></div>'+
          '<div class="mi" data-act="lang"><span class="ic">⚐</span><span data-i18n="menu.lang"></span></div>'+
          '<div class="sep"></div>'+
          '<div class="mi" data-act="settings"><span class="ic">⚙</span><span data-i18n="menu.settings"></span></div>'+
          '<div class="mi" data-act="logout"><span class="ic">⏻</span><span data-i18n="menu.logout"></span></div>';
        chip.appendChild(menu);
        chip.style.position="relative";
        chip.addEventListener("click",function(e){ if(e.target.closest(".tb-menu"))return; chip.classList.toggle("open"); });
        document.addEventListener("click",function(e){ if(!chip.contains(e.target)) chip.classList.remove("open"); });
        var ROLES=[["ceo","الرئيس"],["cfo","المالي"],["manager","المدير"],["staff","الموظف"]];
        var ri=0; try{ var sr=localStorage.getItem("hnerve_role"); if(sr) ri=Math.max(0,ROLES.map(function(r){return r[0];}).indexOf(sr)); }catch(e){}
        function paintRole(){ var n=document.getElementById("hnRoleNow"); if(n)n.textContent=ROLES[ri][1]; var rl=bar.querySelector(".tb-urole"); }
        paintRole();
        menu.addEventListener("click",function(e){ var mi=e.target.closest(".mi"); if(!mi)return; var act=mi.dataset.act; chip.classList.remove("open");
          if(act==="role"){ ri=(ri+1)%ROLES.length; try{localStorage.setItem("hnerve_role",ROLES[ri][0]);}catch(x){} paintRole(); if(window.alToast)alToast("الدور: "+ROLES[ri][1]+" · "+(I18N[lang].role)); }
          else if(act==="lang"){ var L=document.getElementById("hnLang"); if(L)L.click(); }
          else if(act==="settings"){ location.href=(inSec?"":"sections/")+"system.html"; }
          else if(act==="profile"){ location.href=(inSec?"":"sections/")+"employees.html"; }
          else if(act==="logout"){ if(window.alToast)alToast("تم تسجيل الخروج (عرض تجريبي)"); }
        });
      }
    }
    // 2. inject language toggle before the chip if missing
    if(!bar.querySelector(".tb-lang")){
      var lt=document.createElement("button"); lt.className="tb-lang"; lt.id="hnLang"; lt.title="Language / اللغة";
      lt.innerHTML='<span class="lang-opt" data-l="ar">عربي</span><span class="lang-opt" data-l="en">EN</span>';
      if(chip) bar.insertBefore(lt,chip); else bar.appendChild(lt);
    }
  }
  // apply persisted lang to chrome (delegates to the global i18n engine)
  function applyLang(l){
    if(window.HNi18n){ HNi18n.set(l); return; }
    try{ localStorage.setItem("hnerve_lang",l); }catch(e){}
    document.documentElement.setAttribute("lang",l);
    if(!onOrrery) document.documentElement.setAttribute("dir", l==="ar"?"rtl":"ltr");
  }
  // wait for i18n.js then apply stored lang
  function whenI18n(fn){ if(window.HNi18n) fn(); else { var n=0,iv=setInterval(function(){ if(window.HNi18n||n++>40){ clearInterval(iv); fn(); } },50); } }
  whenI18n(function(){ if(window.HNi18n){ HNi18n.apply(document); HNi18n.set(lang); } });
  var btn=document.getElementById("hnLang");
  if(btn) btn.addEventListener("click",function(){ if(window.HNi18n){ HNi18n.toggle(); lang=HNi18n.lang(); } else { applyLang(lang==="ar"?"en":"ar"); lang=lang==="ar"?"en":"ar"; } });
})();
