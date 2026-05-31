/* بحيرة الذاكرة · Memory Lake — episodic recall archive.
   Timeline of memories; hover draws emerald "recall" lines to causally
   related memories; filter pills + "اسأل الذاكرة" search highlight analogues.
   Reduced-motion safe. Light: no canvas, CSS waves only. */
(function(){
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ar(s){ return String(s).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }

  // episodic memories — id, date, year, domain, situation, decision, outcome, related[], tags
  var MEM=[
    { id:"m1", date:"٢٠٢٤ · آذار", yr:"2024", dom:"ضيافة", out:"good",
      sit:"موسم ذروة غير متوقّع في أرينا العقبة", dec:"رفعنا الأسعار ٩٪ وثبّتنا الإشغال",
      tags:["تسعير","إشغال","ذروة"], related:["m5","m8"] },
    { id:"m2", date:"٢٠٢٤ · تموز", yr:"2024", dom:"ألبان", out:"bad",
      sit:"فائض إنتاج ألبان قرب الانتهاء", dec:"لم نصرّف المخزون في الوقت — خسارة هدر",
      tags:["هدر","مخزون","ألبان"], related:["m6","m9"] },
    { id:"m3", date:"٢٠٢٤ · تشرين", yr:"2024", dom:"زراعة", out:"good",
      sit:"تذبذب رطوبة دفيئة لوران", dec:"أدخلنا ريّاً بالتنقيط — عائد +١٨٪",
      tags:["ري","عائد","دفيئة"], related:["m7"] },
    { id:"m4", date:"٢٠٢٥ · شباط", yr:"2025", dom:"تعليم", out:"bad",
      sit:"هبوط حادّ في تسجيل برنامج العمارة", dec:"تأخّرنا في إعادة التسعير — تراجع إيراد ٦٤٪",
      tags:["تسجيل","إيراد","هبوط"], related:["m8"] },
    { id:"m5", date:"٢٠٢٥ · أيار", yr:"2025", dom:"ضيافة", out:"good",
      sit:"طلب مؤتمرات صيفي على الأجبان الفاخرة", dec:"زدنا طاقة المها ٦٠٪ بشكل مشروط",
      tags:["توسّع","طلب","أجبان"], related:["m1","m6"] },
    { id:"m6", date:"٢٠٢٥ · آب", yr:"2025", dom:"ألبان", out:"good",
      sit:"ضغط على سلسلة التبريد مع التوسّع", dec:"ربطنا الإنتاج بقدرة التبريد — صفر هدر",
      tags:["تبريد","توسّع","هدر"], related:["m2","m5"] },
    { id:"m7", date:"٢٠٢٥ · تشرين", yr:"2025", dom:"زراعة", out:"good",
      sit:"توجيه محاصيل لوران لمطابخ أرينا", dec:"جسر توريد داخلي — وفّر تكلفة الشراء",
      tags:["توريد","محاصيل","تكامل"], related:["m3","m5"] },
    { id:"m8", date:"٢٠٢٦ · كانون الثاني", yr:"2026", dom:"مالية", out:"bad",
      sit:"تباطؤ نقدي مع تزامن استثمارات", dec:"وازنّا التدفّق متأخّرين — ضغط ربع كامل",
      tags:["تدفّق","استثمار","سيولة"], related:["m4","m1"] },
    { id:"m9", date:"٢٠٢٦ · آذار", yr:"2026", dom:"ألبان", out:"good",
      sit:"قرار مضاعفة جبن المها للربع الثالث", dec:"توسّع تدريجي مشروط — التقاط الطلب بأمان",
      tags:["توسّع","أجبان","مشروط","هدر"], related:["m2","m6","m5"] },
  ];
  var byId={}; MEM.forEach(function(m){ byId[m.id]=m; });

  var tl=document.getElementById("timeline"), svg=document.getElementById("recallSvg");
  var filters={ dom:"all", out:"all", yr:"all" }, query="";

  // build cards
  MEM.forEach(function(m,i){
    var side=i%2===0 ? "left":"right";
    var el=document.createElement("div"); el.className="mem "+side; el.dataset.id=m.id; m._el=el;
    var badge = m.out==="good" ? '<span class="badge good">✓ نجحت</span>' : '<span class="badge bad">△ تعثّرت</span>';
    el.innerHTML='<span class="node"></span><div class="mcard">'+
      '<div class="date">'+m.date+'</div>'+
      '<div class="sit">'+m.sit+'</div>'+
      '<div class="dec"><b>القرار:</b> '+m.dec+'</div>'+
      '<div class="foot">'+badge+'<span class="dom">'+m.dom+'</span></div></div>';
    tl.appendChild(el);
    el.addEventListener("mouseenter",function(){ recall(m); });
    el.addEventListener("mouseleave",clearRecall);
  });

  // reveal on scroll
  if(reduce || !("IntersectionObserver" in window)){
    MEM.forEach(function(m){ m._el.classList.add("in"); });
  } else {
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }); },{threshold:.2,rootMargin:"0px 0px -6% 0px"});
    MEM.forEach(function(m){ io.observe(m._el); });
    requestAnimationFrame(function(){ MEM.forEach(function(m){ var r=m._el.getBoundingClientRect(); if(r.top<innerHeight*.95){ m._el.classList.add("in"); io.unobserve(m._el); } }); });
  }

  // ── recall: draw emerald lines to related, brighten them, dim others ──
  function recall(m){
    if(!m._el.classList.contains("in")) return;
    clearRecall();
    var rel=(m.related||[]).filter(function(id){ return byId[id] && !byId[id]._el.classList.contains("hidden"); });
    MEM.forEach(function(o){ if(o!==m && rel.indexOf(o.id)<0) o._el.classList.add("dim"); });
    rel.forEach(function(id){ byId[id]._el.classList.add("related"); });
    m._el.classList.add("related");
    if(reduce) return;
    var tlRect=tl.getBoundingClientRect();
    function nodeCenter(el){ var n=el.querySelector(".node").getBoundingClientRect(); return {x:n.left+n.width/2-tlRect.left, y:n.top+n.height/2-tlRect.top}; }
    var a=nodeCenter(m._el);
    rel.forEach(function(id){
      var b=nodeCenter(byId[id]._el);
      var mx=(a.x+b.x)/2, cy1=a.y, cy2=b.y;
      var d="M"+a.x+" "+a.y+" C "+(a.x)+" "+((a.y+b.y)/2)+", "+(b.x)+" "+((a.y+b.y)/2)+", "+b.x+" "+b.y;
      var p=document.createElementNS("http://www.w3.org/2000/svg","path");
      p.setAttribute("d",d); p.setAttribute("fill","none"); p.setAttribute("stroke","#7E9B86");
      p.setAttribute("stroke-width","1.4"); p.setAttribute("opacity","0"); p.setAttribute("class","recall-ln");
      var len; svg.appendChild(p);
      try{ len=p.getTotalLength(); p.style.strokeDasharray=len; p.style.strokeDashoffset=len;
        p.animate([{strokeDashoffset:len,opacity:.2},{strokeDashoffset:0,opacity:.75}],{duration:420,easing:"cubic-bezier(.22,1,.36,1)",fill:"forwards"});
      }catch(e){ p.setAttribute("opacity",".7"); }
    });
  }
  function clearRecall(){
    [].slice.call(svg.querySelectorAll(".recall-ln")).forEach(function(n){n.remove();});
    MEM.forEach(function(o){ o._el.classList.remove("dim","related"); });
  }

  // ── filters + search ──
  function apply(){
    var q=query.trim();
    var shown=0;
    MEM.forEach(function(m){
      var ok = (filters.dom==="all"||m.dom===filters.dom)
            && (filters.out==="all"||m.out===filters.out)
            && (filters.yr==="all"||m.yr===filters.yr);
      if(ok && q){
        var hay=(m.sit+" "+m.dec+" "+m.tags.join(" ")+" "+m.dom).toLowerCase();
        ok = q.toLowerCase().split(/\s+/).some(function(w){ return w && hay.indexOf(w)>=0; });
      }
      m._el.classList.toggle("hidden", !ok);
      if(ok) shown++;
    });
    document.getElementById("empty").style.display = shown? "none":"block";
    document.getElementById("cnt").textContent = ar(shown)+" من "+ar(MEM.length)+" ذكرى";
    clearRecall();
  }

  document.querySelectorAll(".pill").forEach(function(b){
    b.addEventListener("click",function(){
      var f=b.dataset.f;
      document.querySelectorAll('.pill[data-f="'+f+'"]').forEach(function(x){x.classList.remove("on");});
      b.classList.add("on"); filters[f]=b.dataset.v; apply();
    });
  });
  var ask=document.getElementById("ask"), t=0;
  ask.addEventListener("input",function(){ query=ask.value; clearTimeout(t); t=setTimeout(apply,160); });

  apply();
})();
