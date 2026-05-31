/* الخطط · Plans — step tracker + commit/abandon. */
(function(){
  var PLANS=[
    {id:1,title:"تثبيت مخزون الألبان قبل نهاية الربع",src:"من المجلس",committed:false,steps:[
      {t:"صرّف الدفعات الخمس القريبة من الانتهاء خلال ٧٢ ساعة",st:"done"},
      {t:"ارفع طاقة جبن المها ٦٠٪",st:"todo"},
      {t:"أعد التفاوض على عقود التوريد",st:"todo"},
      {t:"راجع الأثر على الهامش بعد أسبوعين",st:"todo"}
    ]}
  ];
  var pid=2;
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2200);}
  function render(){
    document.getElementById("plans").innerHTML=PLANS.map(function(p){
      var done=p.steps.filter(function(s){return s.st==="done";}).length;
      return '<div class="br-panel"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px">'+
        '<div><h2 style="margin:0">'+p.title+'</h2><div class="sub" style="margin:2px 0 0">'+p.src+' · '+done+'/'+p.steps.length+' مكتمل'+(p.committed?' · مُعتمدة':'')+'</div></div>'+
        '<div style="display:flex;gap:8px">'+(p.committed?'<span class="br-chip ok">مُعتمدة</span>':'<button class="br-btn br-btn-primary" data-commit="'+p.id+'">اعتمد</button><button class="br-btn danger" data-abandon="'+p.id+'">تخلَّ</button>')+'</div></div>'+
        '<div style="margin-top:12px">'+p.steps.map(function(s,i){
          return '<div class="plan-step '+s.st+'"><span class="pnum">'+(s.st==="done"?"✓":s.st==="blocked"?"!":(i+1))+'</span><span class="pt">'+s.t+'</span>'+
            '<div class="pacts"><button class="pa done" data-p="'+p.id+'" data-s="'+i+'" data-act="done">تمّ</button><button class="pa block" data-p="'+p.id+'" data-s="'+i+'" data-act="blocked">عُلّق</button></div></div>';
        }).join("")+'</div></div>';
    }).join("");
    document.querySelectorAll("[data-act]").forEach(function(b){b.addEventListener("click",function(){
      var p=PLANS.filter(function(x){return x.id==b.dataset.p;})[0];var s=p.steps[b.dataset.s];s.st=s.st===b.dataset.act?"todo":b.dataset.act;render();});});
    document.querySelectorAll("[data-commit]").forEach(function(b){b.addEventListener("click",function(){PLANS.filter(function(x){return x.id==b.dataset.commit;})[0].committed=true;render();toast("اعتُمدت الخطة");});});
    document.querySelectorAll("[data-abandon]").forEach(function(b){b.addEventListener("click",function(){PLANS=PLANS.filter(function(x){return x.id!=b.dataset.abandon;});render();toast("تُخلّي عن الخطة");});});
  }
  document.getElementById("genPlan").addEventListener("click",function(){
    PLANS.unshift({id:pid++,title:"خطة جديدة مولّدة من إشارة",src:"من الإشارات",committed:false,steps:[{t:"تحليل السبب الجذري",st:"todo"},{t:"تحديد الإجراءات",st:"todo"},{t:"التنفيذ والمتابعة",st:"todo"}]});render();toast("ولّد الدماغ خطة");
  });
  render();
})();