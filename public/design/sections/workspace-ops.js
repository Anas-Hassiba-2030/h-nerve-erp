/* مساحة العمل · Workspace — per-company console with 5 facets. */
(function(){
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2000);}
  var C=GROUP.companies, active=C[0];
  var sel=document.getElementById("wsSel");
  C.forEach(function(c){ sel.add(new Option(c.name,c.id)); });
  sel.addEventListener("change",function(){ active=C.filter(function(c){return c.id===sel.value;})[0]; render(); });

  var HUB=[["intel","🧠","الذكاء"],["finance","💰","المالية"],["ops","⚙","العمليات"],["pipeline","◇","المشاريع"],["team","👥","الفريق"]];
  function render(){
    document.getElementById("wsTitle").textContent="مساحة عمل · "+active.name;
    document.getElementById("hub").innerHTML=HUB.map(function(h){return '<div class="hub-tile" data-f="'+h[0]+'"><div class="hi">'+h[1]+'</div><div class="ht">'+h[2]+'</div></div>';}).join("");
    document.querySelectorAll(".hub-tile").forEach(function(t){t.addEventListener("click",function(){var el=document.getElementById("f"+t.dataset.f.charAt(0).toUpperCase()+t.dataset.f.slice(1));if(el)el.scrollIntoView({behavior:"smooth",block:"center"});});});

    // Intelligence
    document.getElementById("fIntel").innerHTML='<h3>🧠 الذكاء</h3><div class="fsub">إشارات وخطط هذه الشركة</div>'+
      '<div class="ws-line"><span>إشارات مفتوحة</span><span class="v">'+ar(active.growth<0?3:1)+'</span></div>'+
      '<div class="ws-line"><span>خطط نشطة</span><span class="v">'+ar(2)+'</span></div>'+
      '<div class="ws-line"><span>آخر توصية</span><span style="color:var(--ink-muted);font-size:12px">'+(active.growth<0?"إعادة تسعير عاجلة":"توسّع تدريجي")+'</span></div>'+
      '<a class="ws-btn" href="council.html">افتح المجلس</a>';
    // Finance
    document.getElementById("fFinance").innerHTML='<h3>💰 المالية</h3><div class="fsub">آخر ٣٠ يوماً</div>'+
      '<div class="ws-line"><span>الإيراد</span><span class="v">'+ar(active.rev.toLocaleString("en-US"))+'</span></div>'+
      '<div class="ws-line"><span>الهامش</span><span class="v">'+ar(active.margin)+'٪</span></div>'+
      '<div class="ws-line"><span>صافي تقديري</span><span class="v">'+ar(Math.round(active.rev*active.margin/100).toLocaleString("en-US"))+'</span></div>'+
      '<a class="ws-btn ghost" href="finance.html">دفتر الأستاذ</a>';
    // Operations
    document.getElementById("fOps").innerHTML='<h3>⚙ العمليات</h3><div class="fsub">أولويات اليوم</div>'+
      '<div class="ws-pri"><span class="dot" style="background:#9a5648"></span>صرّف الدفعات القريبة من الانتهاء</div>'+
      '<div class="ws-pri"><span class="dot" style="background:var(--gold)"></span>راجع توجيه التوريد الداخلي</div>'+
      '<div class="ws-pri"><span class="dot" style="background:var(--sage)"></span>حدّث قراءات المستشعرات</div>'+
      '<a class="ws-btn ghost" href="supply.html">سلسلة التوريد</a>';
    // Pipeline
    document.getElementById("fPipeline").innerHTML='<h3>◇ المشاريع</h3><div class="fsub">خط الاستثمار</div>'+
      '<div class="ws-line"><span>مشاريع نشطة</span><span class="v">'+ar(3)+'</span></div>'+
      '<div class="ws-line"><span>الموازنة</span><span class="v">'+ar((active.rev/4|0).toLocaleString("en-US"))+'</span></div>'+
      '<button class="ws-btn" id="advBtn">قدّم مرحلة مشروع</button>';
    // Team
    document.getElementById("fTeam").innerHTML='<h3>👥 الفريق</h3><div class="fsub">إسناد الملكية</div>'+
      '<div class="ws-line"><span>الأعضاء</span><span class="v">'+ar(8)+'</span></div>'+
      '<div class="ws-line"><span>متصلون</span><span class="v">'+ar(3)+'</span></div>'+
      '<button class="ws-btn ghost" id="assignBtn">أسنِد مالك مشروع</button>';
    var adv=document.getElementById("advBtn"); if(adv)adv.addEventListener("click",function(){toast("تقدّمت مرحلة المشروع");});
    var asg=document.getElementById("assignBtn"); if(asg)asg.addEventListener("click",function(){toast("أُسنِدت ملكية المشروع");});
  }
  render();
})();
