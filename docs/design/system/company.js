/* مساحة الشركة · Company World — re-themed per-company ERP shell. */
(function(){
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ar(n){ return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];}); }
  function grp(n){ return ar(Math.round(n).toLocaleString("en-US")); }
  function $(id){ return document.getElementById(id); }

  // per-company theme + scoped data
  var CO={
    arena:{nm:"أرينا للضيافة",logo:"أ",accent:"#C2A35A",accentL:"#DCC38A",accentD:"#8a6a1f",dark:"#3a2e12",iq:88,
      ops:{title:"العمليات · الفنادق",rows:[["أرينا سايس فرح","عمّان · ١٨٠ غرفة","٨٤٪","ok"],["أرينا البحر الميت","١٤٠ غرفة","٧٨٪","ok"],["أرينا العقبة","١٢٠ غرفة","٦٩٪","ok"],["أرينا وسط البلد","٩٠ غرفة","٦٤٪","warn"]],opsLabel:"الإشغال"}},
    maha:{nm:"المها للألبان",logo:"م",accent:"#9bb2c4",accentL:"#c3d4df",accentD:"#0d7eaf",dark:"#143a4a",iq:84,
      ops:{title:"العمليات · الدفعات",rows:[["جبن فاخر د-١٠٤٢","١٬٢٠٠ لتر","جاهز","ok"],["لبن طازج د-١٠٤٣","٢٬٤٠٠ لتر","فحص","warn"],["حليب مبستر د-١٠٣٨","١٤٬٥٠٨ لتر","قرب الانتهاء","crit"]],opsLabel:"الحالة"}},
    loran:{nm:"لوران الزراعية",logo:"ل",accent:"#7E9B86",accentL:"#a7c0ad",accentD:"#3c6b4e",dark:"#1f3a2a",iq:79,
      ops:{title:"العمليات · المزارع والمحاصيل",rows:[["مزرعة الأغوار","طماطم · ٣٤٠ كغ","حصاد","ok"],["مزرعة عمّان","زيتون · ١٬٢٠٠ كغ","نمو","warn"],["مزرعة المفرق","أعلاف · ٢٬٤٠٠ كغ","مزروع","ok"]],opsLabel:"الحالة"}},
    ahliyya:{nm:"جامعة عمّان الأهلية",logo:"ع",accent:"#A8536A",accentL:"#cf8fa1",accentD:"#7a2e44",dark:"#3a1620",iq:76,
      ops:{title:"العمليات · البرامج",rows:[["هندسة البرمجيات","٢٬١٠٠ طالب","نمو","ok"],["إدارة الأعمال","١٬٩٥٠ طالب","خروج","ok"],["العمارة","٧٠٠ طالب","فكرة","crit"]],opsLabel:"المرحلة"}},
    holding:{nm:"الحوراني القابضة",logo:"ح",accent:"#C2A35A",accentL:"#DCC38A",accentD:"#8a6a1f",dark:"#1a2940",iq:90,
      ops:{title:"العمليات · الوحدات",rows:[["أرينا للضيافة","ضيافة","مستقر","ok"],["المها للألبان","ألبان","نمو","ok"],["لوران الزراعية","زراعة","مستقر","ok"]],opsLabel:"الحالة"}},
    cash:{nm:"نقد واستثمار",logo:"خ",accent:"#5a7d6e",accentL:"#8aa99b",accentD:"#2e4a3e",dark:"#16261e",iq:88,
      ops:{title:"العمليات · المحفظة",rows:[["خط الاستثمار","٣٩.٦M","نشط","ok"],["السيولة","٣.٢M","مستقر","ok"]],opsLabel:"الحالة"}}
  };
  var id=(new URLSearchParams(location.search).get("c"))||"arena";
  var co=CO[id]||CO.arena;
  var data=(window.GROUP?GROUP.companies.filter(function(c){return c.id===id;})[0]:null)||{rev:88210,margin:42,esg:78,growth:11,months:[52,54,58,55,62,66,70,68,74,80,84,88]};

  // apply theme
  var rs=document.documentElement.style;
  rs.setProperty("--co-accent",co.accent); rs.setProperty("--co-accent-l",co.accentL); rs.setProperty("--co-accent-d",co.accentD); rs.setProperty("--co-dark",co.dark);
  $("coLogo").textContent=co.logo; $("coName").textContent=co.nm; $("coCrumb").textContent=co.nm;
  $("coIqMini").textContent=ar(co.iq);
  document.title="H-Nerve · "+co.nm;

  // ascent
  $("co-ascend").addEventListener("click",function(){
    if(reduce){ location.href="orrery.html"; return; }
    var d=$("co-dive"); d.classList.remove("gone"); d.style.transition="none";
    var orb=d.querySelector(".orb");
    d.style.opacity="0"; d.style.display="grid";
    d.animate([{opacity:0},{opacity:1}],{duration:300,fill:"forwards"});
    orb.animate([{transform:"scale(8)",opacity:.6},{transform:"scale(1)",opacity:1}],{duration:420,easing:"cubic-bezier(.5,0,.5,1)",fill:"forwards"});
    setTimeout(function(){ location.href="sections/holding.html"; },480);
  });

  // dive-in intro (fall THROUGH the orb)
  function intro(){
    if(reduce){ $("co-dive").classList.add("gone"); return; }
    var d=$("co-dive"), orb=d.querySelector(".orb");
    orb.animate([{transform:"scale(1)",opacity:1},{transform:"scale(14)",opacity:0}],{duration:620,easing:"cubic-bezier(.6,0,.4,1)",fill:"forwards"});
    d.animate([{opacity:1},{opacity:0}],{duration:620,delay:120,fill:"forwards"});
    setTimeout(function(){ d.classList.add("gone"); },760);
  }

  // ── panels ──
  function dash(){
    return '<div class="co-hero"><h1>'+co.nm+'</h1><div class="sub">نبض الشركة · آخر ٣٠ يوماً · ضمن مجموعة الحوراني</div></div>'+
      '<div class="co-kpis">'+
      '<div class="co-kpi"><div class="v">'+grp(data.rev)+'</div><div class="k">الإيراد (د.أ)</div></div>'+
      '<div class="co-kpi"><div class="v">'+ar(data.margin)+'٪</div><div class="k">الهامش</div></div>'+
      '<div class="co-kpi"><div class="v">'+ar(data.esg)+'</div><div class="k">ESG</div></div>'+
      '<div class="co-kpi"><div class="v">'+(data.growth>=0?"+":"")+ar(data.growth)+'٪</div><div class="k">النموّ</div></div></div>'+
      '<div class="co-card"><h3>منحنى الإيراد · ١٢ شهراً</h3><div class="csub">أداء هذه الشركة</div>'+(window.Charts?Charts.areaLine(data.months,820,150,co.accent):"")+'</div>'+
      '<div class="co-card"><h3>تنبيهات الشركة</h3><div class="csub">ما يحتاج انتباهك في '+co.nm+'</div>'+
      '<div class="co-row"><span>'+(co.iq<80?"إشارة حرجة تتطلّب مراجعة":"الأداء ضمن المستهدف")+'</span><span class="co-tag '+(co.iq<80?"crit":"ok")+'">'+(co.iq<80?"حرج":"سليم")+'</span></div>'+
      '<div class="co-row"><span>مهام مفتوحة لهذه الشركة</span><span class="rv">'+ar(3)+'</span></div></div>';
  }
  function ops(){
    return '<div class="co-card"><h3>'+co.ops.title+'</h3><div class="csub">مقصورة على '+co.nm+'</div>'+
      co.ops.rows.map(function(r){return '<div class="co-row"><div><b style="color:var(--co-dark)">'+r[0]+'</b><div style="font-size:11.5px;color:var(--ink-muted)">'+r[1]+'</div></div><span class="co-tag '+(r[3])+'">'+r[2]+'</span></div>';}).join("")+
      '<a class="co-btn ghost" style="margin-top:14px" href="sections/'+id+'.html">العرض التفصيلي</a></div>';
  }
  function fin(){
    var net=Math.round(data.rev*data.margin/100);
    return '<div class="co-kpis"><div class="co-kpi"><div class="v">'+grp(data.rev)+'</div><div class="k">الإيراد</div></div>'+
      '<div class="co-kpi"><div class="v">'+grp(net)+'</div><div class="k">صافي تقديري</div></div>'+
      '<div class="co-kpi"><div class="v">'+ar(data.margin)+'٪</div><div class="k">الهامش</div></div>'+
      '<div class="co-kpi"><div class="v">'+grp(Math.round(data.rev*0.3))+'</div><div class="k">المصاريف</div></div></div>'+
      '<div class="co-card"><h3>دفتر الأستاذ المصغّر</h3><div class="csub">قيود هذه الشركة</div>'+
      [["إيراد مبيعات",grp(data.rev),"دائن"],["تكلفة التشغيل",grp(Math.round(data.rev*0.3)),"مدين"],["رواتب",grp(8600),"مدين"],["صافي مُرحّل",grp(net),"دائن"]].map(function(r){return '<div class="co-row"><span>'+r[0]+'</span><span class="rv">'+r[1]+' · '+r[2]+'</span></div>';}).join("")+'</div>';
  }
  function team(){
    var M=[["مدير عام",co.logo==="أ"?"سامر العقل":co.logo==="م"?"رزان نبيل":"خالد فرح","متصل"],["مسؤول مالي","ليان حسيبة","متصل"],["مسؤول جودة","دينا راشد","غير متصل"]];
    return '<div class="co-kpis"><div class="co-kpi"><div class="v">'+ar(8)+'</div><div class="k">الأعضاء</div></div><div class="co-kpi"><div class="v">'+ar(2)+'</div><div class="k">متصلون</div></div><div class="co-kpi"><div class="v">'+ar(18)+'</div><div class="k">مهام</div></div><div class="co-kpi"><div class="v">٩٢٪</div><div class="k">الإنجاز</div></div></div>'+
      '<div class="co-card"><h3>فريق '+co.nm+'</h3><div class="csub">الأعضاء المسندون لهذه الشركة</div>'+
      M.map(function(m){return '<div class="co-row"><div style="display:flex;align-items:center;gap:10px"><span style="width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;background:var(--co-accent)">'+m[1][0]+'</span><div><b style="color:var(--co-dark)">'+m[1]+'</b><div style="font-size:11px;color:var(--ink-muted)">'+m[0]+'</div></div></div><span class="co-tag '+(m[2]==="متصل"?"ok":"warn")+'">'+m[2]+'</span></div>';}).join("")+'</div>';
  }
  function brain(){
    return '<div class="co-card" style="display:flex;align-items:center;gap:22px;flex-wrap:wrap"><div class="co-iq-orb"><div><div class="n">'+ar(co.iq)+'</div><div class="l">ذكاء الشركة</div></div></div>'+
      '<div style="flex:1;min-width:240px"><h3 style="margin:0">دماغ '+co.nm+'</h3><div class="csub">عقلٌ مقصور على هذه الشركة — مستقلّ عن دماغ المجموعة (٩٢)</div>'+
      '<div class="co-row"><span>إشارات الشركة المفتوحة</span><span class="rv">'+ar(co.iq<80?3:1)+'</span></div>'+
      '<div class="co-row"><span>دقّة التوقّع</span><span class="rv">'+ar(co.iq-4)+'٪</span></div></div></div>'+
      '<div class="co-card"><h3>مجلس مصغّر</h3><div class="csub">مستشارو هذه الشركة</div>'+
      [["خبير القطاع","يؤيّد التوسّع التدريجي","ok"],["ضابط المخاطر","يحذّر من ضغط التدفّق","crit"],["دماغ المالية","الهامش يحتمل الاستثمار","ok"]].map(function(a){return '<div class="co-row"><div><b style="color:var(--co-dark)">'+a[0]+'</b><div style="font-size:12px;color:var(--ink-muted)">'+a[1]+'</div></div><span class="co-tag '+a[2]+'">'+(a[2]==="ok"?"يؤيّد":"يعارض")+'</span></div>';}).join("")+
      '<a class="co-btn" style="margin-top:14px" href="sections/council.html">المجلس الكامل</a></div>';
  }
  $("p_dash").innerHTML=dash(); $("p_ops").innerHTML=ops(); $("p_fin").innerHTML=fin(); $("p_team").innerHTML=team(); $("p_brain").innerHTML=brain();
  if(window.Charts) setTimeout(function(){ Charts.play($("p_dash")); },80);

  // tabs
  document.querySelectorAll(".co-tab").forEach(function(t){ t.addEventListener("click",function(){
    document.querySelectorAll(".co-tab").forEach(function(x){x.classList.remove("on");}); t.classList.add("on");
    document.querySelectorAll(".co-panel").forEach(function(p){ p.classList.toggle("on",p.dataset.panel===t.dataset.tab); });
    if(t.dataset.tab==="dash"&&window.Charts) setTimeout(function(){Charts.play($("p_dash"));},40);
  }); });

  intro();
})();
