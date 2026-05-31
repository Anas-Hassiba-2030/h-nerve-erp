/* الحوراني القابضة · Holding — portfolio grid + company workspace drawer. */
(function(){
  Ops.init();
  var ar=Ops.ar;
  var COMPANIES=[
    {id:"arena",logo:"أ",name:"أرينا للضيافة",sector:"ضيافة",rev:"٨٨٬٢١٠",esg:78,batches:"٧ فنادق",programs:"٤٩٧ غرفة مشغولة"},
    {id:"ahliyya",logo:"ع",name:"جامعة عمّان الأهلية",sector:"تعليم",rev:"٥٥٬٢١٦",esg:82,batches:"٥ برامج",programs:"٨٬٤٢٠ طالب"},
    {id:"maha",logo:"م",name:"المها للألبان",sector:"ألبان",rev:"٣١٬٥٤٠",esg:71,batches:"٥ دفعات نشطة",programs:"١٤٬٥٠٨ لتر"},
    {id:"loran",logo:"ل",name:"لوران الزراعية",sector:"زراعة",rev:"١٧٬٣٦٩",esg:69,batches:"٣ مزارع",programs:"٤ محاصيل"},
    {id:"cash",logo:"خ",name:"نقد واستثمار",sector:"خزينة",rev:"٠",esg:88,batches:"خط ٣٩.٦M",programs:"فرص نشطة"},
  ];
  function donut(pct){
    var C=2*Math.PI*15, off=C*(1-pct/100);
    return '<svg width="40" height="40" style="transform:rotate(-90deg)"><circle cx="20" cy="20" r="15" fill="none" stroke="rgba(46,107,87,.15)" stroke-width="5"/>'+
      '<circle cx="20" cy="20" r="15" fill="none" stroke="#C2A35A" stroke-width="5" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/></svg>';
  }
  var grid=document.getElementById("portfolio");
  grid.className="ops-portfolio";
  grid.innerHTML=COMPANIES.map(function(c){
    return '<div class="co-tile" data-id="'+c.id+'"><div style="display:flex;align-items:center;justify-content:space-between"><div class="co-logo">'+c.logo+'</div>'+
      '<div style="display:flex;align-items:center;gap:6px">'+donut(c.esg)+'<span style="font-size:11px;color:var(--ink-muted)">ESG '+ar(c.esg)+'</span></div></div>'+
      '<div class="co-nm" style="margin-top:10px">'+c.name+'</div><div class="co-sec">'+c.sector+'</div>'+
      '<div class="co-meta"><span>إيراد '+c.rev+'</span></div>'+
      '<button class="ops-add" style="width:100%;margin-top:12px;justify-content:center" data-enter="'+c.id+'">ادخل مساحة العمل →</button></div>';
  }).join('');
  grid.querySelectorAll(".co-tile").forEach(function(t){
    function open(){ var c=COMPANIES.filter(function(x){return x.id===t.dataset.id;})[0]; workspace(c); }
    t.addEventListener("click",function(e){ if(e.target.closest("[data-enter]")||!e.target.closest("button")) open(); });
  });
  function panel(label,val){ return '<div class="dr-stat"><div class="v">'+val+'</div><div class="k">'+label+'</div></div>'; }
  function workspace(c){
    Ops.openDrawer(
      '<div class="dr-eyebrow">مساحة عمل الشركة · '+c.sector+'</div><h3>'+Ops.esc(c.name)+'</h3>'+
      '<div class="dr-sub">لقطة موحّدة من كونسول الشركة</div>'+
      '<div class="dr-sec">المالية</div><div class="dr-stats">'+panel("إيراد ٣٠ي",c.rev+" د")+panel("مؤشر ESG",ar(c.esg)+"/١٠٠")+'</div>'+
      '<div class="dr-sec">العمليات</div><div class="dr-stats">'+panel("الوحدات",c.batches)+panel("النشاط",c.programs)+'</div>'+
      '<div class="dr-sec">الحوكمة</div><div class="dr-stats">'+panel("التصنيف","أ")+panel("الحالة","مستقر")+'</div>'+
      '<a class="dr-msg" id="enterWorld" style="display:block;margin-top:18px;text-align:center;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--emerald-soft),var(--emerald));border-radius:12px;padding:12px;text-decoration:none;cursor:pointer">↡ ادخل مساحة العمل</a>'
    );
    var ew=document.getElementById("enterWorld");
    if(ew) ew.addEventListener("click",function(e){ e.preventDefault(); dive(c.id); });
  }
  function dive(cid){
    var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduce){ location.href="../company.html?c="+cid; return; }
    var o=document.createElement("div");
    o.style.cssText="position:fixed;left:50%;top:50%;width:120px;height:120px;border-radius:50%;z-index:300;transform:translate(-50%,-50%) scale(0);background:radial-gradient(circle at 40% 34%,#fff,var(--gold) 55%,var(--emerald) 80%);box-shadow:0 0 90px var(--gold)";
    document.body.appendChild(o);
    var cover=(Math.max(innerWidth,innerHeight)*2.8)/120;
    o.animate([{transform:"translate(-50%,-50%) scale(0)"},{transform:"translate(-50%,-50%) scale("+cover+")"}],{duration:520,easing:"cubic-bezier(.6,0,.4,1)",fill:"forwards"});
    setTimeout(function(){ location.href="../company.html?c="+cid; },520);
  }
})();
