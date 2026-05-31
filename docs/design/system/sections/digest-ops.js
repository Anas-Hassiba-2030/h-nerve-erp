/* الموجز · Digest — generate executive summary cards. */
(function(){
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2200);}
  var CARDS=[
    {icon:"↗",t:"المها تقود النموّ",b:"أسرع وحدة نموّاً بنسبة +٤٤٪. التوصية: توسّع تدريجي مشروط."},
    {icon:"⚠",t:"تنبيه التعليم",b:"هبوط إيراد جامعة عمّان ٦٤٪ يستدعي إعادة تسعير عاجلة."},
    {icon:"◆",t:"قرار بانتظارك",b:"مضاعفة إنتاج جبن المها — المجلس أوصى بثقة ٨٤٪."},
    {icon:"⊕",t:"الاستدامة بخير",b:"مؤشر ESG عند ٧٥/١٠٠ ضمن النطاق المستهدف."}
  ];
  function render(stamp){
    document.getElementById("digestCards").innerHTML='<div class="br-panel"><h2>موجز '+(stamp||"اليوم")+'</h2><div class="sub">أهمّ ما يحتاج انتباهك</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+CARDS.map(function(c){
        return '<div class="br-row" style="margin:0"><span class="br-chip info" style="font-size:18px;padding:6px 10px">'+c.icon+'</span><div class="rt"><div class="tt">'+c.t+'</div><div class="ts">'+c.b+'</div></div></div>';
      }).join("")+'</div></div>';
  }
  document.getElementById("genDigest").addEventListener("click",function(){
    var t=document.getElementById("thinking");t.style.display="inline-flex";
    setTimeout(function(){t.style.display="none";render("٣٠ أيار · ٩:٤٢");toast("ولّد الدماغ موجزاً جديداً");},1200);
  });
  render();
})();