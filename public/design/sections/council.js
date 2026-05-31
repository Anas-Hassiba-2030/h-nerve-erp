/* المجلس · Council Debate — live choreographed debate.
   Seats around a round table speak in turn (thinking → gold line → tile slides in),
   tension lines connect opposing stances, moderator fills a confidence ring.
   One rAF-free timeline (setTimeout chain), reduced-motion safe. */
(function(){
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS="http://www.w3.org/2000/svg";

  var AGENTS=[
    { id:"hosp", nm:"خبير الضيافة", ro:"أرينا", glyph:"ض", stance:"support",
      text:"مؤتمرات أرينا في الربع الثالث ترفع الطلب على الأجبان الفاخرة بأكثر من الثلث. <b>الطلب مضمون</b>." },
    { id:"agri", nm:"خبير الزراعة", ro:"لوران", glyph:"ز", stance:"qualify",
      text:"العائد يتحسّن، لكن أوصي بربط التوسّع بقدرة التبريد. <b>تدرّج قبل الالتزام الكامل.</b>" },
    { id:"dairy", nm:"خبير الألبان", ro:"المها", glyph:"ل", stance:"support",
      text:"خطوط الإنتاج جاهزة وهامش الجبن الفاخر ٣٨٪. <b>نملك الطاقة الفعلية للمضاعفة.</b>" },
    { id:"edu", nm:"خبير التعليم", ro:"الأهلية", glyph:"ع", stance:"qualify",
      text:"رأس المال المطلوب قد يزاحم استثمارات أخرى. <b>وازِن التدفق النقدي أولاً.</b>" },
    { id:"risk", nm:"ضابط المخاطر", ro:"المجموعة", glyph:"خ", stance:"oppose",
      text:"خمس وحدات قرب الانتهاء. المضاعفة الآن <b>تضخّم خطر الهدر</b> قبل تصريف المخزون." },
  ];
  // tension pairs (opposing stances that "argue")
  var TENSION=[["risk","hosp"],["risk","dairy"],["agri","dairy"]];

  var table=document.getElementById("table"), svg=document.getElementById("coSvg"), feed=document.getElementById("feed");
  var seatEls={};

  // place 5 seats around the ring
  function layoutSeats(){
    var r=table.getBoundingClientRect(), cx=r.width/2, cy=r.height/2;
    var rad=Math.min(r.width,r.height)*0.42;
    AGENTS.forEach(function(a,i){
      var ang=(-90 + i*(360/AGENTS.length))*Math.PI/180;
      var x=cx+Math.cos(ang)*rad, y=cy+Math.sin(ang)*rad*0.82;
      var s=seatEls[a.id];
      if(!s){
        s=document.createElement("div"); s.className="seat "+a.stance; s.dataset.id=a.id;
        s.innerHTML='<div class="av">'+a.glyph+'<div class="think"><span></span><span></span><span></span></div></div>'+
          '<div class="nm">'+a.nm+'</div><div class="ro">'+a.ro+'</div>';
        table.appendChild(s); seatEls[a.id]=s;
      }
      s.style.left=x+"px"; s.style.top=y+"px";
      s._pos={x:x,y:y};
    });
  }
  layoutSeats();
  addEventListener("resize", function(){ layoutSeats(); drawTension(); });

  function centerPt(){ var r=table.getBoundingClientRect(); return {x:r.width/2,y:r.height/2}; }

  function line(x1,y1,x2,y2,cls){
    var l=document.createElementNS(SVGNS,"line");
    l.setAttribute("x1",x1); l.setAttribute("y1",y1); l.setAttribute("x2",x2); l.setAttribute("y2",y2);
    l.setAttribute("class",cls); svg.appendChild(l); return l;
  }
  // gold line seat→center when an agent speaks
  function speakLine(a){
    var p=seatEls[a.id]._pos, c=centerPt();
    var l=line(p.x,p.y,p.x,p.y,"");
    l.setAttribute("stroke","#DCC38A"); l.setAttribute("stroke-width","1.4"); l.setAttribute("opacity","0.8");
    if(reduce){ l.setAttribute("x2",c.x); l.setAttribute("y2",c.y); setTimeout(function(){l.remove();},600); return; }
    var t0=null,dur=420;
    function step(now){ if(!t0)t0=now; var k=Math.min((now-t0)/dur,1);
      l.setAttribute("x2",p.x+(c.x-p.x)*k); l.setAttribute("y2",p.y+(c.y-p.y)*k);
      if(k<1) requestAnimationFrame(step); else { l.style.transition="opacity .5s"; l.setAttribute("opacity","0.15"); setTimeout(function(){l.remove();},1200); }
    }
    requestAnimationFrame(step);
  }
  // faint persistent tension lines between opposing seats
  function drawTension(){
    [].slice.call(svg.querySelectorAll(".tension")).forEach(function(n){n.remove();});
    TENSION.forEach(function(pair){
      var a=seatEls[pair[0]], b=seatEls[pair[1]]; if(!a||!b) return;
      if(!a.classList.contains("spoke")||!b.classList.contains("spoke")) return;
      var l=line(a._pos.x,a._pos.y,b._pos.x,b._pos.y,"tension");
      l.setAttribute("stroke","#A86A5C"); l.setAttribute("stroke-width","0.8"); l.setAttribute("opacity","0.3");
      l.setAttribute("stroke-dasharray","3 4");
    });
  }

  function tile(a){
    var d=document.createElement("div"); d.className="dbt "+a.stance;
    var stanceLbl=a.stance==="support"?"يؤيّد":a.stance==="oppose"?"يعارض":"يتحفّظ";
    d.innerHTML='<div class="dav">'+a.glyph+'</div><div class="dbody">'+
      '<div class="dhead"><span class="dnm">'+a.nm+'</span><span class="stance">'+stanceLbl+'</span></div>'+
      '<div class="dtext">'+a.text+'</div></div>';
    feed.appendChild(d);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ d.classList.add("in"); }); });
  }

  var timers=[];
  function clearTimers(){ timers.forEach(clearTimeout); timers=[]; }
  function after(ms,fn){ timers.push(setTimeout(fn,ms)); }

  function runDebate(){
    clearTimers();
    feed.innerHTML=""; 
    [].slice.call(svg.children).forEach(function(n){n.remove();});
    Object.values(seatEls).forEach(function(s){ s.classList.remove("thinking","spoke"); });
    document.getElementById("mod").classList.remove("in");
    setRing(0);
    document.querySelector(".co-center .ttl").innerHTML='الدماغ<b>يستمع</b>';

    var step = reduce ? 250 : 1150;
    AGENTS.forEach(function(a,i){
      var base=i*step;
      after(base, function(){ seatEls[a.id].classList.add("thinking"); });
      after(base + (reduce?100:520), function(){
        seatEls[a.id].classList.remove("thinking");
        seatEls[a.id].classList.add("spoke");
        speakLine(a); tile(a); drawTension();
      });
    });
    // moderator synthesis
    var end=AGENTS.length*step + (reduce?200:600);
    after(end, function(){
      document.querySelector(".co-center .ttl").innerHTML='الدماغ<b>يوازن</b>';
      document.getElementById("mod").classList.add("in");
      animateRing(84);
    });
  }

  // confidence ring
  var CIRC=289;
  function setRing(p){ document.getElementById("confRing").setAttribute("stroke-dashoffset", CIRC*(1-p/100)); document.getElementById("confVal").textContent=toAr(Math.round(p)); }
  function toAr(n){ return String(n).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }
  function animateRing(target){
    if(reduce){ setRing(target); return; }
    var t0=null,dur=1100;
    function step(now){ if(!t0)t0=now; var k=Math.min((now-t0)/dur,1); var e=1-Math.pow(1-k,3);
      setRing(target*e); if(k<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  document.getElementById("replayBtn").addEventListener("click", runDebate);

  // run on load + pause-aware (don't start choreography while hidden)
  if(document.hidden){ document.addEventListener("visibilitychange", function once(){ if(!document.hidden){ runDebate(); document.removeEventListener("visibilitychange",once);} }); }
  else runDebate();
})();
