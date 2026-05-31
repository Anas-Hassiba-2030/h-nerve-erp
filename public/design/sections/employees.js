/* الفريق · Employees / Team — org tree + roster + profile drawer. */
(function(){
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ar(n){ return String(n).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }

  // members
  var M={
    anas:{nm:"أنس الحوراني",ro:"رئيس مجلس الإدارة",sec:"المجموعة",rank:"♚",rankN:"ملك · بلاتيني",xp:2640,logins:412,last:"الآن",online:true,ach:["♚","🏆","⚡","◆"]},
    lian:{nm:"ليان حسيبة",ro:"المديرة المالية",sec:"مالية",rank:"♛",rankN:"وزير · بلاتيني",xp:1840,logins:301,last:"قبل ٥ د",online:true,ach:["♛","🏆","⚡"]},
    samer:{nm:"سامر العقل",ro:"مدير عمليات أرينا",sec:"ضيافة",rank:"♜",rankN:"قلعة · ذهبي",xp:1320,logins:256,last:"قبل ١٢ د",online:true,ach:["♜","⚡"]},
    razan:{nm:"رزان نبيل",ro:"مديرة إنتاج المها",sec:"ألبان",rank:"♞",rankN:"فارس · فضي",xp:920,logins:188,last:"قبل ١ س",online:true,ach:["♞","◆"]},
    khaled:{nm:"خالد فرح",ro:"مهندس لوران الزراعي",sec:"زراعة",rank:"♞",rankN:"فارس · فضي",xp:870,logins:164,last:"أمس",online:false,ach:["♞"]},
    dina:{nm:"دينا راشد",ro:"مسؤولة الجودة",sec:"ألبان",rank:"♝",rankN:"فيل · فضي",xp:760,logins:142,last:"قبل ٣ س",online:true,ach:["♝","◆"]},
    fadi:{nm:"فادي عمر",ro:"مدير التكامل",sec:"النظام",rank:"♝",rankN:"فيل · فضي",xp:710,logins:133,last:"أمس",online:false,ach:["♝"]},
    nour:{nm:"نور سامي",ro:"محلّلة بيانات",sec:"العقل",rank:"♟",rankN:"بيدق · برونزي",xp:540,logins:98,last:"أمس",online:false,ach:["♟","◆"]},
    rami:{nm:"رامي خليل",ro:"عميد الأهلية",sec:"تعليم",rank:"♜",rankN:"قلعة · ذهبي",xp:1180,logins:210,last:"قبل ٢ س",online:false,ach:["♜","🏆"]},
    sara:{nm:"سارة منصور",ro:"مديرة التسويق",sec:"المجموعة",rank:"♝",rankN:"فيل · فضي",xp:690,logins:120,last:"قبل ٤٠ د",online:true,ach:["♝"]},
    omar:{nm:"عمر حدّاد",ro:"مدير المشتريات",sec:"النظام",rank:"♞",rankN:"فارس · فضي",xp:830,logins:151,last:"أمس",online:false,ach:["♞"]},
    huda:{nm:"هدى الزين",ro:"مسؤولة الاستدامة",sec:"المجموعة",rank:"♟",rankN:"بيدق · برونزي",xp:480,logins:76,last:"الإثنين",online:false,ach:["♟"]},
  };
  // org structure
  var TREE={id:"anas",kids:[
    {id:"lian",kids:[{id:"nour",kids:[]},{id:"omar",kids:[]}]},
    {id:"samer",kids:[{id:"sara",kids:[]}]},
    {id:"razan",kids:[{id:"dina",kids:[]}]},
    {id:"rami",kids:[]},
    {id:"khaled",kids:[{id:"huda",kids:[]}]},
    {id:"fadi",kids:[]},
  ]};

  // build tree
  function node(n){
    var m=M[n.id];
    var el=document.createElement("div"); el.className="tnode"+(n.kids.length?" has-kids":"");
    var card=document.createElement("div"); card.className="tcard"; card.dataset.id=n.id;
    card.innerHTML='<span class="tav">'+m.nm[0]+(m.online?'<span class="pres"></span>':'')+'</span>'+
      '<span class="tinfo"><span class="tn">'+m.nm+'</span><span class="tr">'+m.ro+'</span></span><span class="tbadge">'+m.rank+'</span>';
    card.addEventListener("click",function(e){ e.stopPropagation();
      if(n.kids.length && !e.shiftKey && !card._opened){ /* first click expands toggle */ }
      openDrawer(n.id);
    });
    // toggle collapse via the caret area (click on card with kids toggles when already open handled simply): use dblclick to collapse
    if(n.kids.length){
      card.addEventListener("dblclick",function(e){ e.stopPropagation(); el.classList.toggle("collapsed"); });
      // also: clicking the caret ▾ (right part) collapses
      card.addEventListener("click",function(e){ if(e.offsetX > card.offsetWidth-26){ el.classList.toggle("collapsed"); } },true);
    }
    el.appendChild(card);
    if(n.kids.length){ var kids=document.createElement("div"); kids.className="tkids"; n.kids.forEach(function(k){ kids.appendChild(node(k)); }); el.appendChild(kids); }
    return el;
  }
  var tree=document.createElement("div"); tree.className="tree"; tree.appendChild(node(TREE));
  document.getElementById("treeView").appendChild(tree);

  // list grid
  var grid=document.getElementById("grid"), query="";
  function renderList(){
    grid.innerHTML="";
    Object.keys(M).forEach(function(id){ var m=M[id];
      if(query && (m.nm+" "+m.ro+" "+m.sec).toLowerCase().indexOf(query.toLowerCase())<0) return;
      var c=document.createElement("div"); c.className="mcard"; c.dataset.id=id;
      c.innerHTML='<div class="mhead"><span class="mav">'+m.nm[0]+(m.online?'<span class="pres"></span>':'')+'</span>'+
        '<div><div class="mn">'+m.nm+' <span class="tbadge">'+m.rank+'</span></div><div class="mr">'+m.ro+'</div></div></div>'+
        '<div class="mmeta"><span class="sector">'+m.sec+'</span><span>'+ar(m.xp)+' XP</span><span>دخول '+ar(m.logins)+'</span></div>';
      c.addEventListener("click",function(){ openDrawer(id); });
      grid.appendChild(c);
    });
  }
  document.getElementById("search").addEventListener("input",function(e){ query=e.target.value; renderList(); });

  // tabs
  document.querySelectorAll(".em-tab").forEach(function(t){
    t.addEventListener("click",function(){
      document.querySelectorAll(".em-tab").forEach(function(x){x.classList.remove("on");}); t.classList.add("on");
      var tree=t.dataset.t==="tree";
      document.getElementById("treeView").style.display=tree?"block":"none";
      document.getElementById("listView").style.display=tree?"none":"block";
      if(!tree) renderList();
    });
  });

  // drawer
  var drawer=document.getElementById("drawer"), backdrop=document.getElementById("backdrop");
  function openDrawer(id){
    var m=M[id];
    drawer.innerHTML='<button class="dr-close" id="drClose">×</button>'+
      '<div class="dr-av">'+m.nm[0]+'</div><div class="dr-nm">'+m.nm+'</div><div class="dr-ro">'+m.ro+' · '+m.sec+'</div>'+
      '<div class="dr-stats">'+
        '<div class="dr-stat"><div class="v">'+m.rank+' '+m.rankN.split(" · ")[0]+'</div><div class="k">'+m.rankN+'</div></div>'+
        '<div class="dr-stat"><div class="v">'+ar(m.xp)+'</div><div class="k">نقاط الخبرة</div></div>'+
        '<div class="dr-stat"><div class="v">'+ar(m.logins)+'</div><div class="k">إجمالي الدخول</div></div>'+
        '<div class="dr-stat"><div class="v">'+m.last+'</div><div class="k">آخر دخول</div></div>'+
      '</div>'+
      '<div class="dr-sec">آخر نشاط</div><div class="dr-act">'+
        '<div class="ev">أكمل مهمة: مراجعة أرقام الربع</div><div class="ev">شارك في نقاش المجلس</div><div class="ev">حدّث حالة دفعة إنتاج</div></div>'+
      '<div class="dr-sec">الإنجازات</div><div class="dr-ach">'+m.ach.map(function(a){return '<span class="a">'+a+'</span>';}).join('')+'</div>'+
      '<a class="dr-msg" href="messages.html">✉ ابدأ محادثة</a>';
    drawer.classList.add("open"); backdrop.classList.add("open");
    document.getElementById("drClose").addEventListener("click",close);
  }
  function close(){ drawer.classList.remove("open"); backdrop.classList.remove("open"); }
  backdrop.addEventListener("click",close);
  addEventListener("keydown",function(e){ if(e.key==="Escape") close(); });
})();
