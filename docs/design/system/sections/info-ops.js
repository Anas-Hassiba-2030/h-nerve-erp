(function(){
  Ops.init();
  document.getElementById("p_changelog").innerHTML=
    '<div class="ops-toolbar"><h2>سجلّ التغييرات</h2></div>'+
    [["v1.4","ميزة","مسرح القرار بوضع ملء الشاشة","ok"],["v1.4","تحسين","تسريع الرسم السببي","info"],["v1.3","ميزة","محاكي ماذا لو السببي","ok"],["v1.3","إصلاح","معالجة تسرّب بطاقات الإشارات","crit"],["v1.2","ميزة","المجلس متعدّد الوكلاء","ok"]].map(function(c){
      return '<div class="br-row" style="background:var(--cream);border-color:var(--line)"><span class="ops-tag info">'+c[0]+'</span><span class="ops-tag '+c[3]+'">'+c[1]+'</span><div class="rt"><div class="tt" style="color:var(--ink)">'+c[2]+'</div></div></div>';}).join("");
  document.getElementById("p_roadmap").innerHTML=
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">'+
    [["الآن",["تعميق ضوابط الدماغ","لوحة الإمبراطورية متعددة المستأجرين"]],["التالي",["مساعد صوتي عربي","تصدير PDF موسّع"]],["لاحقاً",["تطبيق جوال أصلي","تكامل ERP خارجي كامل"]]].map(function(col){
      return '<div class="panel" style="margin:0"><div class="panel-title" style="font-size:18px;margin-bottom:12px">'+col[0]+'</div>'+col[1].map(function(it){return '<div class="ws-pri" style="display:flex;gap:9px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px;color:var(--ink)"><span style="color:var(--gold)">◆</span>'+it+'</div>';}).join("")+'</div>';}).join("")+'</div>';
  document.getElementById("p_help").innerHTML=
    '<div class="panel"><div class="panel-head"><span class="panel-title">اختصارات لوحة المفاتيح</span></div>'+
    [["⌘K","البحث الشامل"],["⌘B","طيّ القائمة"],["Esc","العودة إلى المدار"],["→ ←","التنقّل في مسرح القرار"],["⌘/","عرض الاختصارات"]].map(function(k){
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)"><span style="font-size:13.5px;color:var(--ink)">'+k[1]+'</span><kbd style="font-family:var(--font-mono,monospace);font-size:12px;background:var(--ivory);border:1px solid var(--line);border-radius:6px;padding:3px 9px;color:var(--emerald)">'+k[0]+'</kbd></div>';}).join("")+'</div>';
})();