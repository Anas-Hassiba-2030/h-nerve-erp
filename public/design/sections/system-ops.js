(function(){
  Ops.init();
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  // status: live record counts
  document.getElementById("p_status").innerHTML=
    '<div class="kpi-grid reveal" style="grid-template-columns:repeat(4,1fr)">'+
    [["الشركات","٥"],["الفنادق","٧"],["الدفعات","٤٢"],["المزارع","٣"],["البرامج","٥"],["الإشارات","١٢"],["المستخدمون","٧٤"],["التكاملات","٤"]].map(function(k){
      return '<div class="kpi-card ix-card"><div class="kpi-label">'+k[0]+'</div><div class="kpi-val"><span>'+k[1]+'</span></div><div class="kpi-foot"><span class="kpi-hint">آخر استيراد: اليوم ٨:٠٠</span></div></div>';}).join("")+'</div>'+
    '<div class="panel" style="margin-top:14px"><div class="panel-head"><span class="panel-title">صحّة المنصّة</span><span class="panel-aside">زمن التشغيل ٩٩.٩٨٪</span></div>'+
    ['قاعدة البيانات','محرّك الدماغ','الواجهة','المزامنة الحيّة','النسخ الاحتياطي'].map(function(s){return '<div class="ws-line" style="display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--line)"><span>'+s+'</span><span class="ops-tag ok">سليم</span></div>';}).join("")+'</div>';
  // settings: preference toggles
  var PREFS=[["إظهار شريط المؤشّرات الحيّ",true],["إظهار تيار النشاط في اللوحة",true],["بطاقات الذكاء على الصفحة الرئيسية",true],["مخطّطات القطاعات في التحليلات",true],["إشعارات الدفع",false],["الوضع المضغوط للجداول",false],["تشغيل الرسوم المتحرّكة",true]];
  document.getElementById("p_settings").innerHTML=
    '<div class="panel"><div class="panel-head"><span class="panel-title">الملف الشخصي</span></div><div style="display:flex;align-items:center;gap:14px;margin-bottom:8px"><div style="width:60px;height:60px;border-radius:50%;display:grid;place-items:center;font-family:var(--display);font-size:26px;font-weight:600;color:#fff;background:linear-gradient(140deg,var(--emerald-soft),var(--emerald))">أ</div><div><div style="font-size:16px;font-weight:700;color:var(--ink)">أنس الحوراني</div><div style="font-size:12px;color:var(--ink-muted)">رئيس مجلس الإدارة · المجموعة</div></div></div></div>'+
    '<div class="panel" style="margin-top:14px"><div class="panel-head"><span class="panel-title">تفضيلات العرض</span><span class="panel-aside">ما يظهر في كل وحدة</span></div><div id="prefList"></div></div>';
  function renderPrefs(){
    document.getElementById("prefList").innerHTML=PREFS.map(function(p,i){
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)"><span style="font-size:13.5px;color:var(--ink)">'+p[0]+'</span><button class="br-switch '+(p[1]?"on":"")+'" data-i="'+i+'" style="background:'+(p[1]?"linear-gradient(135deg,#7E9B86,#2E6B57)":"rgba(46,107,87,.18)")+'"></button></div>';
    }).join("");
    document.querySelectorAll("#prefList .br-switch").forEach(function(b){b.addEventListener("click",function(){PREFS[b.dataset.i][1]=!PREFS[b.dataset.i][1];renderPrefs();});});
  }
  renderPrefs();
})();