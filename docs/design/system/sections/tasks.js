/* المهام · Tasks — CRUD + bulk + filters + gamification (XP, ranks, confetti). */
(function(){
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ar(n){ return String(n).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }

  var RANKS=[
    {name:"بيدق · برونزي",pc:"♟",min:0},{name:"فارس · فضي",pc:"♞",min:700},
    {name:"قلعة · ذهبي",pc:"♜",min:1100},{name:"وزير · بلاتيني",pc:"♛",min:1700},{name:"ملك · بلاتيني",pc:"♚",min:2600}
  ];
  var xp=920;

  var TASKS=[
    {id:1,title:"اعتماد توسّع إنتاج المها للربع الثالث",prio:"high",owner:"أنس",due:"اليوم",status:"doing",xp:60},
    {id:2,title:"مراجعة تسعير عطلة نهاية الأسبوع — أرينا",prio:"med",owner:"سامر",due:"غداً",status:"todo",xp:40},
    {id:3,title:"تصريف دفعات الألبان القريبة من الانتهاء",prio:"high",owner:"رزان",due:"اليوم",status:"doing",xp:80},
    {id:4,title:"إعداد تقرير ESG الفصلي",prio:"low",owner:"ليان",due:"الخميس",status:"todo",xp:30},
    {id:5,title:"توقيع عقد توريد لوران ↔ أرينا",prio:"med",owner:"خالد",due:"الأحد",status:"todo",xp:50},
    {id:6,title:"تحديث خطة إعادة تسعير برنامج العمارة",prio:"high",owner:"أنس",due:"غداً",status:"doing",xp:55},
    {id:7,title:"مراجعة تنبيهات النظام الأسبوعية",prio:"low",owner:"فادي",due:"تمّ",status:"done",xp:20},
    {id:8,title:"اعتماد موازنة المشاريع المستقبلية",prio:"med",owner:"ليان",due:"تمّ",status:"done",xp:45},
  ];
  var nextId=9, filter="all", query="", selected=new Set(), todayXp=0;

  var rowsEl=document.getElementById("rows");
  function glyph(n){ return n? n[0]:"؟"; }

  function rankFor(x){ var r=RANKS[0]; for(var i=0;i<RANKS.length;i++) if(x>=RANKS[i].min) r=RANKS[i]; return r; }
  function renderRank(animate){
    var r=rankFor(xp), idx=RANKS.indexOf(r), next=RANKS[idx+1];
    document.getElementById("rankName").textContent=r.name;
    document.getElementById("rankPiece").textContent=r.pc;
    document.getElementById("rankXp").textContent=ar(xp)+" XP";
    var pct;
    if(next){ pct=(xp-r.min)/(next.min-r.min)*100; document.getElementById("rankNext").textContent="التالي: "+ar(next.min); }
    else { pct=100; document.getElementById("rankNext").textContent="أعلى رتبة"; }
    document.getElementById("rankBar").style.width=Math.max(3,Math.min(100,pct))+"%";
  }

  function visible(t){
    if(filter==="doing"&&t.status!=="doing")return false;
    if(filter==="done"&&t.status!=="done")return false;
    if(filter==="urgent"&&t.prio!=="high")return false;
    if(filter==="mine"&&t.owner!=="أنس")return false;
    if(query&&t.title.toLowerCase().indexOf(query.toLowerCase())<0)return false;
    return true;
  }
  var STAT={todo:"قيد الانتظار",doing:"قيد التنفيذ",done:"مكتمل"};
  var PRIO={high:"عالية",med:"متوسطة",low:"منخفضة"};

  function render(){
    rowsEl.innerHTML="";
    TASKS.filter(visible).forEach(function(t){
      var d=document.createElement("div"); d.className="tk-row"+(t.status==="done"?" done":""); d.dataset.id=t.id;
      d.innerHTML='<button class="chk'+(selected.has(t.id)?" on":"")+'">'+(selected.has(t.id)?"✓":"")+'</button>'+
        '<span class="t-title">'+esc(t.title)+'</span>'+
        '<span><span class="prio '+t.prio+'">'+PRIO[t.prio]+'</span></span>'+
        '<span class="owner"><span class="oav">'+glyph(t.owner)+'</span>'+t.owner+'</span>'+
        '<span class="due">'+t.due+'</span>'+
        '<span><span class="stat '+t.status+'">'+STAT[t.status]+'</span></span>'+
        '<span class="xp">'+ar(t.xp)+'</span>'+
        '<button class="t-del" title="حذف">🗑</button>';
      // checkbox
      d.querySelector(".chk").addEventListener("click",function(e){ e.stopPropagation();
        if(selected.has(t.id))selected.delete(t.id); else selected.add(t.id); render(); updateBulk(); });
      // status cycle (click status pill) — completing fires gamification
      d.querySelector(".stat").addEventListener("click",function(e){ e.stopPropagation();
        var order=["todo","doing","done"]; var ni=(order.indexOf(t.status)+1)%3; var was=t.status; t.status=order[ni];
        if(t.status==="done"&&was!=="done") complete(t,d); else { render(); updateKpis(); }
      });
      d.querySelector(".t-del").addEventListener("click",function(e){ e.stopPropagation();
        TASKS=TASKS.filter(function(x){return x!==t;}); selected.delete(t.id); render(); updateKpis(); updateBulk(); });
      rowsEl.appendChild(d);
    });
    updateKpis();
  }
  function esc(s){ var e=document.createElement("div"); e.textContent=s; return e.innerHTML; }

  function complete(t,row){
    t.status="done";
    xp+=t.xp; todayXp+=t.xp;
    var prevRank=rankFor(xp-t.xp), newRank=rankFor(xp);
    render(); updateKpis();
    if(row){ var r=row.getBoundingClientRect(); confetti(r.left+r.width/2, r.top+r.height/2); }
    // pulse rank card + animate
    var rc=document.getElementById("rankCard"); rc.classList.add("pulse"); setTimeout(function(){rc.classList.remove("pulse");},700);
    renderRank(true);
    if(newRank!==prevRank) rankUp(newRank);
  }
  function rankUp(r){
    var pc=document.getElementById("rankPiece"); pc.classList.add("flip"); setTimeout(function(){pc.classList.remove("flip");},600);
    var t=document.getElementById("ruToast"); document.getElementById("ruPc").textContent=r.pc;
    document.getElementById("ruMsg").textContent="ترقّيت إلى "+r.name;
    t.classList.add("show"); setTimeout(function(){t.classList.remove("show");},2600);
    if(!reduce) confetti(innerWidth/2, 120, 90);
  }

  function updateKpis(){
    document.getElementById("kp_mine").textContent=ar(TASKS.filter(function(t){return t.owner==="أنس";}).length);
    document.getElementById("kp_doing").textContent=ar(TASKS.filter(function(t){return t.status==="doing";}).length);
    document.getElementById("kp_done").textContent=ar(TASKS.filter(function(t){return t.status==="done";}).length);
    document.getElementById("kp_xp").textContent=ar(todayXp);
  }

  // bulk
  function updateBulk(){
    var b=document.getElementById("bulk");
    if(selected.size){ b.classList.add("show"); document.getElementById("bulkCnt").textContent=ar(selected.size)+" محدّد"; }
    else b.classList.remove("show");
  }
  document.querySelectorAll(".tk-bulk button").forEach(function(btn){
    btn.addEventListener("click",function(){
      var act=btn.dataset.act;
      TASKS.forEach(function(t){ if(selected.has(t.id)){
        if(act==="del"){} else if(act==="done"){ if(t.status!=="done"){ xp+=t.xp; todayXp+=t.xp; } t.status="done"; }
        else if(act==="doing") t.status="doing";
      }});
      if(act==="del") TASKS=TASKS.filter(function(t){return !selected.has(t.id);});
      if(act==="done"){ renderRank(true); var rc=document.getElementById("rankCard"); rc.classList.add("pulse"); setTimeout(function(){rc.classList.remove("pulse");},700); if(!reduce) confetti(innerWidth/2,innerHeight/2,80); }
      selected.clear(); render(); updateBulk();
    });
  });

  // filters + search
  document.querySelectorAll(".tk-pills .pill").forEach(function(p){
    p.addEventListener("click",function(){ document.querySelectorAll(".tk-pills .pill").forEach(function(x){x.classList.remove("on");}); p.classList.add("on"); filter=p.dataset.f; render(); });
  });
  document.getElementById("search").addEventListener("input",function(e){ query=e.target.value; render(); });

  // add (inline composer)
  var comp=document.getElementById("composer");
  document.getElementById("addBtn").addEventListener("click",function(){
    if(comp.classList.contains("show")){ saveNew(); } else { comp.classList.add("show"); document.getElementById("c_title").focus(); }
  });
  document.getElementById("c_title").addEventListener("keydown",function(e){ if(e.key==="Enter") saveNew(); if(e.key==="Escape") comp.classList.remove("show"); });
  function saveNew(){
    var title=document.getElementById("c_title").value.trim(); if(!title){ comp.classList.remove("show"); return; }
    TASKS.unshift({id:nextId++,title:title,prio:document.getElementById("c_prio").value,owner:document.getElementById("c_owner").value||"أنس",
      due:document.getElementById("c_due").value||"—",status:"todo",xp:parseInt(document.getElementById("c_xp").value)||40});
    document.getElementById("c_title").value=""; comp.classList.remove("show"); render();
  }

  // ── confetti ──
  var cv=document.getElementById("confetti"), ctx=cv.getContext("2d"), parts=[], raf=0;
  function size(){ cv.width=innerWidth; cv.height=innerHeight; }
  size(); addEventListener("resize",size);
  var COLORS=["#DCC38A","#C2A35A","#7E9B86","#2E6B57","#FBF3DC"];
  function confetti(x,y,n){
    if(reduce) return;
    n=n||46;
    for(var i=0;i<n;i++){ var a=Math.random()*Math.PI*2, sp=Math.random()*7+3;
      parts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-4,g:0.22,r:Math.random()*4+2,
        col:COLORS[i%COLORS.length],life:1,rot:Math.random()*6,vr:(Math.random()-.5)*.4}); }
    if(!raf) raf=requestAnimationFrame(tick);
  }
  function tick(){
    ctx.clearRect(0,0,cv.width,cv.height);
    for(var i=parts.length-1;i>=0;i--){ var p=parts[i];
      p.vy+=p.g; p.x+=p.vx; p.y+=p.vy; p.life-=0.012; p.rot+=p.vr;
      if(p.life<=0||p.y>cv.height+20){ parts.splice(i,1); continue; }
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.globalAlpha=Math.max(0,p.life);
      ctx.fillStyle=p.col; ctx.fillRect(-p.r,-p.r*0.5,p.r*2,p.r); ctx.restore();
    }
    if(parts.length) raf=requestAnimationFrame(tick); else raf=0;
  }

  renderRank(); render(); updateBulk();
})();
