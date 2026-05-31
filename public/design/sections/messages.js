/* المراسلات · Messages — functional internal chat with inline photo upload. */
(function(){
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ar(n){ return String(n).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }
  function now(){ var d=new Date(); return ar(String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")); }

  // seed threads (mine = me sending; theirs = them). Each msg: {who:'me'|'them', text, img, t}
  var THREADS=[
    { id:"t1", nm:"ليان حسيبة", ro:"المديرة المالية", glyph:"ل", online:true, unread:2, t:"٩:٤٢",
      msgs:[
        {who:"them",text:"صباح الخير. راجعت أرقام الربع — صافي الربح فوق المستهدف ١٨٪.",t:"٩:٣٠"},
        {who:"me",text:"ممتاز. هل التدفّق النقدي يحتمل توسّع المها؟",t:"٩:٣٤"},
        {who:"them",text:"نعم، بشرط تصريف الدفعات القريبة من الانتهاء أولاً. أرفقت لك الملخّص.",t:"٩:٤٢"},
      ]},
    { id:"t2", nm:"سامر العقل", ro:"مدير عمليات أرينا", glyph:"س", online:true, unread:1, t:"٨:١٥",
      msgs:[
        {who:"them",text:"إشغال البحر الميت ٧٨٪ هذا الأسبوع — أعلى من المعدل.",t:"٨:١٠"},
        {who:"me",text:"رائع. لنرفع تسعير عطلة نهاية الأسبوع تدريجياً.",t:"٨:١٥"},
      ]},
    { id:"t3", nm:"مجلس الإدارة", ro:"مجموعة · ٥ أعضاء", glyph:"⬡", online:false, unread:0, t:"أمس",
      msgs:[
        {who:"them",text:"تذكير: اجتماع الربع الثالث الخميس القادم.",t:"أمس"},
        {who:"me",text:"مؤكّد. سأعرض توصية المجلس حول توسّع المها.",t:"أمس"},
      ]},
    { id:"t4", nm:"رزان نبيل", ro:"مديرة إنتاج المها", glyph:"ر", online:false, unread:0, t:"أمس",
      msgs:[
        {who:"them",text:"خطوط الجبن الفاخر جاهزة لزيادة ٦٠٪ متى صدر القرار.",t:"أمس"},
      ]},
    { id:"t5", nm:"خالد فرح", ro:"مهندس لوران الزراعي", glyph:"خ", online:false, unread:0, t:"الإثنين",
      msgs:[
        {who:"them",text:"محصول الطماطم جاهز للتوريد لمطابخ أرينا — ٣٤٠ كغ.",t:"الإثنين"},
      ]},
  ];
  var REPLIES=["تمام، مفهوم.","سأراجع وأعود إليك.","أتفق معك تماماً.","دعني أتحقّق من الأرقام.","ممتاز، شكراً لك."];

  var active=THREADS[0];
  var pendingImg=null;
  var listEl=document.getElementById("threadList"), msgsEl=document.getElementById("msgs");

  function renderThreads(){
    listEl.innerHTML="";
    THREADS.forEach(function(th){
      var last=th.msgs[th.msgs.length-1];
      var prev=(last.who==="me"?"أنت: ":"")+(last.img?"📷 صورة":last.text);
      var d=document.createElement("div"); d.className="thr"+(th===active?" active":""); d.dataset.id=th.id;
      d.innerHTML='<div class="av">'+th.glyph+(th.online?'<span class="pres"></span>':'')+'</div>'+
        '<div class="meta"><div class="row1"><span class="nm">'+th.nm+'</span><span class="tm">'+th.t+'</span></div>'+
        '<div class="ro">'+th.ro+'</div><div class="prev">'+prev+'</div></div>'+
        (th.unread?'<span class="unread">'+ar(th.unread)+'</span>':'');
      d.addEventListener("click",function(){ active=th; th.unread=0; renderThreads(); openThread(); });
      listEl.appendChild(d);
    });
  }
  function openThread(){
    document.getElementById("cv_av").textContent=active.glyph;
    document.getElementById("cv_nm").textContent=active.nm;
    document.getElementById("cv_st").textContent=active.online?"متصل الآن":"غير متصل";
    document.getElementById("cv_st").style.color=active.online?"var(--sage)":"var(--mist)";
    msgsEl.innerHTML="";
    active.msgs.forEach(function(m){ msgsEl.appendChild(bubble(m)); });
    scrollDown();
  }
  function bubble(m){
    var side=m.who==="me"?"mine":"theirs";
    var d=document.createElement("div"); d.className="msg "+side;
    var inner=""; if(m.text) inner+=esc(m.text); if(m.img) inner+='<img src="'+m.img+'" alt="صورة">';
    d.innerHTML='<div class="bub">'+inner+'</div><div class="meta">'+(m.t||now())+'</div>';
    return d;
  }
  function esc(s){ var e=document.createElement("div"); e.textContent=s; return e.innerHTML; }
  function scrollDown(){ msgsEl.scrollTop=msgsEl.scrollHeight; }

  // send
  var input=document.getElementById("input");
  function send(){
    var text=input.value.trim();
    if(!text && !pendingImg) return;
    var m={who:"me",text:text,img:pendingImg,t:now()};
    active.msgs.push(m); msgsEl.appendChild(bubble(m)); scrollDown();
    input.value=""; input.style.height="auto"; clearAttach();
    renderThreads();
    // simulated reply with typing shimmer
    if(active.online!==false || true){ replyLater(); }
  }
  function replyLater(){
    var typ=document.createElement("div"); typ.className="typing"; typ.innerHTML="<span></span><span></span><span></span>";
    msgsEl.appendChild(typ); scrollDown();
    requestAnimationFrame(function(){ typ.classList.add("show"); });
    var delay=reduce?300:1300;
    setTimeout(function(){
      typ.remove();
      var m={who:"them",text:REPLIES[Math.floor(Math.random()*REPLIES.length)],t:now()};
      active.msgs.push(m); msgsEl.appendChild(bubble(m)); scrollDown(); renderThreads();
    },delay);
  }
  document.getElementById("sendBtn").addEventListener("click",send);
  input.addEventListener("keydown",function(e){ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } });
  input.addEventListener("input",function(){ input.style.height="auto"; input.style.height=Math.min(input.scrollHeight,110)+"px"; });

  // photo upload — real FileReader → data URI
  var fileInput=document.getElementById("fileInput");
  document.getElementById("attachBtn").addEventListener("click",function(){ fileInput.click(); });
  fileInput.addEventListener("change",function(){
    var f=fileInput.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(){ pendingImg=r.result;
      document.getElementById("attachImg").src=pendingImg;
      document.getElementById("attachName").textContent=f.name;
      document.getElementById("attachPreview").classList.add("show");
    };
    r.readAsDataURL(f); fileInput.value="";
  });
  function clearAttach(){ pendingImg=null; document.getElementById("attachPreview").classList.remove("show"); }
  document.getElementById("attachRm").addEventListener("click",clearAttach);

  // new thread (prototype: starts a fresh direct thread)
  document.getElementById("newThread").addEventListener("click",function(){
    var names=[["نور سامي","محلّلة بيانات","ن"],["فادي عمر","مدير التكامل","ف"],["دينا راشد","مسؤولة الجودة","د"]];
    var pick=names[Math.floor(Math.random()*names.length)];
    var th={id:"t"+(THREADS.length+1),nm:pick[0],ro:pick[1],glyph:pick[2],online:true,unread:0,t:now(),
      msgs:[{who:"them",text:"مرحباً! كيف يمكنني المساعدة؟",t:now()}]};
    THREADS.unshift(th); active=th; renderThreads(); openThread();
    document.getElementById("kp_threads").textContent=ar(THREADS.length);
  });

  // discuss with brain (visual stub)
  document.getElementById("brainBtn").addEventListener("click",function(){
    var b=document.getElementById("brainBtn"), t=b.textContent;
    b.textContent="✦ حُوّلت المحادثة للدماغ"; setTimeout(function(){ b.textContent=t; },1800);
  });

  renderThreads(); openThread();
})();
