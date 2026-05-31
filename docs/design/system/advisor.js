/* ════════════════════════════════════════════════════════════════
   H-NERVE · AI ADVISOR — living void orb + chat with the brain.
   Scripted responses pull from the shared figures (canonical). The
   getResponse() seam is structured so window.claude.complete can drop
   in later with zero UI changes.
   ════════════════════════════════════════════════════════════════ */
(function(){
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── canonical figures (reconcile with group-data.js) ──
  var D={
    group:{rev:"١٩٢٬٣٣٥",net:"١٥٢٬٥١٣",margin:"٧١٪",iq:"٩٢",esg:"٧٥",growth:"+١٢٪"},
    arena:{rev:"٨٨٬٢١٠",occ:"٧١٪",growth:"+١١٪",iq:"٨٨"},
    ahliyya:{rev:"٥٥٬٢١٦",prev:"١٥٥٬٢٦٤",drop:"٦٤٪",margin:"١٠٠٪"},
    maha:{rev:"٣١٬٥٤٠",growth:"+٤٤٪",output:"١٤٬٥٠٨",iq:"٨٤"},
    loran:{rev:"١٧٬٣٦٩",growth:"+٨٪",farms:"٣"}
  };

  // ── response library (intent → editorial Arabic lines referencing real data) ──
  function getResponse(qRaw){
    var q=(qRaw||"").trim();
    function has(){ for(var i=0;i<arguments.length;i++){ if(q.indexOf(arguments[i])>=0) return true; } return false; }
    if(has("أرينا","الضيافة","الفنادق","الإشغال"))
      return ["أرينا تقود المجموعة هذا الربع. الإيراد بلغ <b>"+D.arena.rev+"</b> ديناراً خلال الثلاثين يوماً الماضية — نموٌّ قدره <b>"+D.arena.growth+"</b>.",
        "الإشغال عند <b>"+D.arena.occ+"</b>، فوق المعدل الموسمي. أوصي بمراجعة تسعير عطلات نهاية الأسبوع لالتقاط الطلب دون المساس بتجربة النزيل.",
        "ذكاء وحدة أرينا <b>"+D.arena.iq+"</b> — أداءٌ موثوق."];
    if(has("المها","الألبان","الجبن","التوسّع","دفعات"))
      return ["المها أسرع وحدة نموّاً لديك: <b>"+D.maha.growth+"</b>، بإيراد <b>"+D.maha.rev+"</b> دينار.",
        "لكن هناك إشارة حرجة: <b>"+D.maha.output+" لتر</b> في أربع دفعات تقترب من الانتهاء خلال ٧٢ ساعة. صرّفها أولاً.",
        "بعد التصريف، توسّعٌ تدريجيّ بنسبة ٦٠٪ — لا ١٠٠٪ — يلتقط معظم طلب مؤتمرات الربع الثالث مع احتواء خطر الهدر."];
    if(has("الأهلية","التعليم","الجامعة","الطلبة"))
      return ["جامعة عمّان الأهلية هي نقطة القلق الوحيدة. الإيراد تراجع <b>"+D.ahliyya.drop+"</b> — من <b>"+D.ahliyya.prev+"</b> إلى <b>"+D.ahliyya.rev+"</b> دينار.",
        "رغم ذلك تحتفظ بأعلى هامش في المجموعة (<b>"+D.ahliyya.margin+"</b>). المشكلة في الحجم لا الكفاءة.",
        "أوصي بمعالجة تسعير برنامج العمارة بشكل عاجل — هو المصدر الأكبر للتراجع."];
    if(has("لوران","الزراعة","المزارع","المحاصيل"))
      return ["لوران تنمو بثبات: <b>"+D.loran.growth+"</b> عبر <b>"+D.loran.farms+"</b> مزارع.",
        "جسر التوريد الداخلي إلى مطابخ أرينا يوفّر ١٨٪ من تكلفة الشراء الخارجي. تكاملٌ يستحقّ التوسيع."];
    if(has("المجموعة","الوضع","النبض","الإجمالي","عام","الأداء"))
      return ["الصورة الكاملة: إيراد المجموعة <b>"+D.group.rev+"</b> دينار، وصافي ربح <b>"+D.group.net+"</b> بهامش <b>"+D.group.margin+"</b>.",
        "النموّ <b>"+D.group.growth+"</b>، ومؤشّر الاستدامة <b>"+D.group.esg+"/١٠٠</b>. أرينا والمها يقودان الصعود.",
        "نقطة الخطر الوحيدة: إيراد الأهلية. القرار الأهمّ اليوم: تصريف دفعات المها قبل التوسّع."];
    if(has("المالية","الربح","الإيراد","التدفق","الهامش"))
      return ["صافي الربح الشهري <b>"+D.group.net+"</b> دينار من إيراد <b>"+D.group.rev+"</b> — هامشٌ صحّي عند <b>"+D.group.margin+"</b>.",
        "المصاريف انحسرت ٩٫٩٪. التحفّظ الوحيد: تزامن الاستثمارات يضغط التدفّق النقدي — وازِن التوقيت لا الطموح."];
    if(has("القرار","أفعل","أوصي","ماذا","رأيك","النصيحة"))
      return ["إن كان لي قرارٌ واحد اليوم: <b>صرّف دفعات المها القريبة من الانتهاء خلال ٧٢ ساعة</b>، ثم وسّع الإنتاج تدريجياً.",
        "وبالتوازي: عالِج تسعير الأهلية قبل أن يتعمّق التراجع. الباقي على مساره."];
    if(has("مرحبا","السلام","صباح","مساء","كيف حالك"))
      return ["أهلاً بك. أنا دماغ مجموعة الحوراني — أقرأ بياناتك على مدار الساعة.",
        "اسألني عن أي شركة، أو رقم، أو قرار. مثلاً: «كيف أداء أرينا؟» أو «ما القرار الأهم اليوم؟»"];
    // default
    return ["سؤالٌ وجيه. بناءً على بيانات المجموعة الحالية، إيراد المجموعة <b>"+D.group.rev+"</b> دينار بنموّ <b>"+D.group.growth+"</b>.",
      "يمكنني التفصيل في أي وحدة — جرّب أن تسألني عن أرينا، المها، الأهلية، لوران، أو الوضع المالي العام."];
    // ── SEAM: a real model drops in here ──
    // return await window.claude.complete(buildPrompt(q, D));
  }

  // ── living void orb (canvas) ──
  var cv=document.getElementById("orbCanvas"), ctx=cv.getContext("2d");
  var DPR=Math.min(devicePixelRatio||1,2), S=0;
  function sizeOrb(){ var r=cv.getBoundingClientRect(); S=Math.min(r.width,r.height); cv.width=S*DPR; cv.height=S*DPR; }
  sizeOrb(); addEventListener("resize",sizeOrb);
  var mode="idle"; // idle | think | speak
  var pulses=[]; // expanding rings when speaking
  function draw(t){
    if(!S){ sizeOrb(); }
    ctx.setTransform(DPR,0,0,DPR,0,0); ctx.clearRect(0,0,S,S);
    var c=S/2, R=S*0.40;
    var energy = mode==="think"?0.9 : mode==="speak"?1 : 0.4;
    var breath = 1 + Math.sin(t*0.0014)*(mode==="idle"?0.025:0.05)*energy;
    // outer corona glow
    var halo=ctx.createRadialGradient(c,c,R*0.6,c,c,R*1.5);
    halo.addColorStop(0,"rgba(46,107,87,"+(0.25*energy)+")"); halo.addColorStop(1,"rgba(46,107,87,0)");
    ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(c,c,R*1.5,0,6.28); ctx.fill();
    // the deep void sphere
    var sg=ctx.createRadialGradient(c-R*0.25,c-R*0.3,0,c,c,R*breath);
    sg.addColorStop(0,"#16352b"); sg.addColorStop(.45,"#0c2019"); sg.addColorStop(.8,"#070f0c"); sg.addColorStop(1,"#03070500");
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(c,c,R*breath,0,6.28); ctx.fill();
    ctx.strokeStyle="rgba(194,163,90,"+(0.4+0.3*energy)+")"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(c,c,R*breath,0,6.28); ctx.stroke();
    // inner thought currents
    if(!reduce){ ctx.globalCompositeOperation="lighter";
      for(var i=0;i<3;i++){ var a=t*0.0004*(i+1)+i*2.1; var bx=c+Math.cos(a)*R*0.4*energy, by=c+Math.sin(a*1.3)*R*0.35*energy;
        var g=ctx.createRadialGradient(bx,by,0,bx,by,R*0.5);
        g.addColorStop(0,"rgba(220,195,138,"+(0.12*energy)+")"); g.addColorStop(1,"rgba(220,195,138,0)");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,R*0.5,0,6.28); ctx.fill(); }
      ctx.globalCompositeOperation="source-over";
    }
    // breathing nucleus
    var nb=0.5+0.5*Math.sin(t*0.0022), nr=R*0.10*(1+nb*0.5*energy);
    var ng=ctx.createRadialGradient(c,c,0,c,c,nr*2.4);
    ng.addColorStop(0,"rgba(255,253,247,"+(0.7+0.3*energy)+")"); ng.addColorStop(.5,"rgba(220,195,138,"+(0.4*energy)+")"); ng.addColorStop(1,"rgba(220,195,138,0)");
    ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(c,c,nr*2.4,0,6.28); ctx.fill();
    // speak pulses (expanding rings)
    for(var p=pulses.length-1;p>=0;p--){ var P=pulses[p]; P.r+=2.2; P.a*=0.965;
      if(P.a<0.02){ pulses.splice(p,1); continue; }
      ctx.strokeStyle="rgba(220,195,138,"+P.a.toFixed(3)+")"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(c,c,P.r,0,6.28); ctx.stroke(); }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  var pulseTimer=null;
  function setMode(m){ mode=m;
    var st=document.getElementById("orbState");
    st.textContent = m==="think"?"يفكّر…" : m==="speak"?"يتحدّث" : "في انتظار سؤالك";
    clearInterval(pulseTimer);
    if(m==="speak"&&!reduce) pulseTimer=setInterval(function(){ pulses.push({r:S*0.40,a:0.5}); },700);
  }

  // ── chat ──
  var thread=document.getElementById("thread");
  function addUser(t){ var d=document.createElement("div"); d.className="msg user"; d.textContent=t; thread.appendChild(d); thread.scrollTop=thread.scrollHeight; }
  function typing(){ var d=document.createElement("div"); d.className="typing"; d.innerHTML="<span></span><span></span><span></span>"; thread.appendChild(d); thread.scrollTop=thread.scrollHeight; return d; }
  function addBrain(lines, done){
    var d=document.createElement("div"); d.className="msg brain";
    lines.forEach(function(l){ var s=document.createElement("span"); s.className="ln"; s.innerHTML=l+" "; d.appendChild(s); });
    thread.appendChild(d);
    var i=0; (function rev(){ if(i>=d.children.length){ if(done)done(); return; }
      d.children[i].classList.add("in"); thread.scrollTop=thread.scrollHeight; i++;
      setTimeout(rev, reduce?0:650);
    })();
  }
  var busy=false;
  function ask(q){
    if(busy||!q.trim()) return; busy=true;
    addUser(q); setMode("think");
    var tp=typing();
    var lines=getResponse(q);   // ← scripted now; API seam inside
    setTimeout(function(){
      tp.remove(); setMode("speak");
      addBrain(lines, function(){ setMode("idle"); busy=false; speakOut(lines); });
    }, reduce?200:1100);
  }

  // chips
  var CHIPS=["كيف أداء أرينا هذا الربع؟","ما القرار الأهمّ اليوم؟","لماذا تراجع إيراد الأهلية؟","الوضع المالي العام"];
  var chipBar=document.getElementById("chips");
  CHIPS.forEach(function(c){ var b=document.createElement("button"); b.className="chip"; b.textContent=c;
    b.addEventListener("click",function(){ ask(c); chipBar.style.display="none"; }); chipBar.appendChild(b); });

  // composer
  var input=document.getElementById("q");
  document.getElementById("sendBtn").addEventListener("click",function(){ ask(input.value); input.value=""; chipBar.style.display="none"; });
  input.addEventListener("keydown",function(e){ if(e.key==="Enter"){ ask(input.value); input.value=""; chipBar.style.display="none"; } });

  // ── voice (Web Speech), muted by default ──
  var voiceOut=false;
  function speakOut(lines){
    if(!voiceOut || !window.speechSynthesis) return;
    var txt=lines.join(" ").replace(/<[^>]+>/g,"");
    var u=new SpeechSynthesisUtterance(txt); u.lang="ar-SA"; u.rate=.95; speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  var mic=document.getElementById("micBtn");
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  mic.addEventListener("click",function(){
    if(!SR){ // no recognition → toggle voice-out instead
      voiceOut=!voiceOut; mic.style.color=voiceOut?"#9bbf9f":""; mic.title=voiceOut?"الصوت مفعّل":"الصوت مكتوم"; return;
    }
    var rec=new SR(); rec.lang="ar-SA"; rec.interimResults=false;
    mic.classList.add("rec");
    rec.onresult=function(e){ input.value=e.results[0][0].transcript; };
    rec.onend=function(){ mic.classList.remove("rec"); if(input.value){ ask(input.value); input.value=""; chipBar.style.display="none"; } };
    rec.start();
  });

  // greeting
  setTimeout(function(){ addBrain(getResponse("مرحبا"), function(){ setMode("idle"); }); setMode("speak"); }, 500);
})();
