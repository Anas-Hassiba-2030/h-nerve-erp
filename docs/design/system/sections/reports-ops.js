/* التقارير · Reports — executive one-pager per company + print/PDF. */
(function(){
  Ops.init();
  var C=GROUP.companies, ar=Charts.ar;
  var active=C[0];
  var NARR={
    arena:"سجّلت أرينا أداءً قوياً بإيراد <b>٨٨٬٢١٠ دينار</b> خلال الثلاثين يوماً الماضية، بنموّ <b>+١١٪</b> وإشغال ٧١٪. تقترح القراءة رفع تسعير عطلات نهاية الأسبوع تدريجياً مع الحفاظ على الإشغال.",
    ahliyya:"شهدت الأهلية تراجعاً حادّاً في الإيراد بنسبة <b>−٦٤٪</b> رغم احتفاظها بأعلى هامش في المجموعة (<b>١٠٠٪</b>). يوصي الدماغ بمعالجة تسعير برنامج العمارة بشكل عاجل.",
    maha:"حقّقت المها أسرع نموّ في المجموعة بنسبة <b>+٤٤٪</b>. التوصية النشطة: توسّع تدريجي مشروط لإنتاج الجبن الفاخر بعد تصريف الدفعات القريبة من الانتهاء.",
    loran:"نموّ مستقرّ بنسبة <b>+٨٪</b> مع تحسّن العائد بعد إدخال الري بالتنقيط (<b>+١٨٪</b>). جسر التوريد الداخلي يوفّر تكلفة الشراء الخارجي.",
    cash:"محفظة النقد والاستثمار تحافظ على أعلى مؤشّر استدامة (<b>٨٨</b>) مع خط استثمار نشط بقيمة <b>٣٩.٦ مليون دينار</b>."
  };
  function render(){
    document.getElementById("rpList").innerHTML=C.map(function(c){
      return '<div class="rp-item'+(c===active?" on":"")+'" data-id="'+c.id+'"><div class="lg">'+c.logo+'</div>'+
        '<div><div class="rt">تقرير '+c.name+'</div><div class="rd">تنفيذي · ٣٠ يوماً · ٢٠٢٦</div></div></div>';
    }).join('');
    document.querySelectorAll(".rp-item").forEach(function(el){ el.addEventListener("click",function(){ active=C.filter(function(c){return c.id===el.dataset.id;})[0]; render(); }); });
    var co=active;
    document.getElementById("report").innerHTML=
      '<div class="rp-head"><div><div class="rp-brand"><img src="../assets/logo-hnerve.svg" width="34" height="34" alt=""><span class="nm">H‑Nerve <b>ERP</b></span></div>'+
      '<h2 style="margin-top:14px">'+co.name+'</h2><div class="rp-sub">تقرير تنفيذي · مجموعة الحوراني</div></div>'+
      '<div class="rp-date">٣٠ أيار ٢٠٢٦<br>للفترة: آخر ٣٠ يوماً</div></div>'+
      '<div class="rp-kpis">'+
        '<div class="rp-kpi"><div class="v">'+ar(co.rev.toLocaleString("en-US"))+'</div><div class="k">إيراد ٣٠ي (د.أ)</div></div>'+
        '<div class="rp-kpi"><div class="v">'+ar(co.margin)+'٪</div><div class="k">الهامش</div></div>'+
        '<div class="rp-kpi"><div class="v">'+ar(co.esg)+'/١٠٠</div><div class="k">ESG</div></div>'+
        '<div class="rp-kpi"><div class="v">'+(co.growth>=0?"+":"")+ar(co.growth)+'٪</div><div class="k">النموّ</div></div>'+
      '</div>'+
      '<div class="rp-sec-t">الملخّص التنفيذي</div><div class="rp-narr">'+(NARR[co.id]||"")+'</div>'+
      '<div class="rp-sec-t">منحنى الإيراد · ١٢ شهراً</div>'+Charts.areaLine(co.months,640,160,GROUP.sectorColors[co.sector])+
      '<div class="rp-sec-t" style="margin-top:22px">المؤشّرات مقابل القطاع</div>'+
      Charts.benchBars([
        {label:"الإيراد",val:Math.min(100,co.rev/90000*100),max:100,disp:ar(co.rev.toLocaleString("en-US")),color:Charts.colors.GOLDS,color2:Charts.colors.GOLD},
        {label:"الهامش",val:co.margin,max:100,disp:ar(co.margin)+"٪",color:Charts.colors.SAGE,color2:Charts.colors.EM},
        {label:"ESG",val:co.esg,max:100,disp:ar(co.esg)+"/١٠٠",color:Charts.colors.GOLDS,color2:Charts.colors.GOLD},
      ]);
    requestAnimationFrame(function(){ Charts.play(document.getElementById("report")); });
  }
  document.getElementById("printBtn").addEventListener("click",function(){ window.print(); });
  render();
})();
