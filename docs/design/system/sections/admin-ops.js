/* الإدارة · Admin ERP — CRUD tables + status flows for every entity. */
(function(){
  Ops.init();
  function T(v){return {ledger:"حساب",}[v]||v;}
  // LEDGER
  Ops.table({mount:"#t_ledger",title:"الحسابات",addLabel:"حساب",searchKeys:["name","code"],
    rows:[{_id:1,code:"١٠٠",name:"النقد",type:"أصول",bal:"٣٬٢٤٠٬٠٠٠"},{_id:2,code:"١٢٠",name:"الذمم المدينة",type:"أصول",bal:"٨٤٠٬٠٠٠"},{_id:3,code:"٢٠٠",name:"الذمم الدائنة",type:"خصوم",bal:"٥١٠٬٠٠٠"},{_id:4,code:"٣٠٠",name:"رأس المال",type:"حقوق ملكية",bal:"٢٨٬٦٠٠٬٠٠٠"},{_id:5,code:"٤٠٠",name:"الإيرادات",type:"إيراد",bal:"٣٩٬٥٩٠٬٠٠٠"}],
    cols:[{key:"code",label:"رمز",cls:"num",w:".6fr"},{key:"name",label:"الحساب",cls:"name",w:"1.4fr"},{key:"type",label:"النوع",w:"1fr"},{key:"bal",label:"الرصيد",cls:"num",w:"1fr"}],
    form:[{key:"code",label:"الرمز",def:"٥٠٠"},{key:"name",label:"اسم الحساب"},{key:"type",label:"النوع",def:"أصول"},{key:"bal",label:"الرصيد",def:"٠"}]});
  // JOURNAL
  Ops.table({mount:"#t_journal",title:"القيود اليومية",addLabel:"قيد",searchKeys:["desc"],
    rows:[{_id:1,date:"٣٠ أيار",desc:"إيراد حجوزات أرينا",debit:"٢٧٬٤٠٠",credit:"٢٧٬٤٠٠",st:"posted"},{_id:2,date:"٢٩ أيار",desc:"شراء أعلاف المها",debit:"٤٬٢٠٠",credit:"٤٬٢٠٠",st:"posted"},{_id:3,date:"٢٩ أيار",desc:"رواتب لوران",debit:"٨٬٦٠٠",credit:"٨٬٦٠٠",st:"draft"}],
    statusKey:"st",statusCycle:[{v:"draft",label:"مسودّة",tag:"warn"},{v:"posted",label:"مُرحّل",tag:"ok"}],
    cols:[{key:"date",label:"التاريخ",w:".8fr"},{key:"desc",label:"البيان",cls:"name",w:"1.6fr"},{key:"debit",label:"مدين",cls:"num",w:"1fr"},{key:"credit",label:"دائن",cls:"num",w:"1fr"},{key:"st",label:"الحالة",tag:true,w:".8fr"}],
    form:[{key:"date",label:"التاريخ",def:"اليوم"},{key:"desc",label:"البيان"},{key:"debit",label:"مدين",def:"٠"},{key:"credit",label:"دائن",def:"٠"},{key:"st",type:"select",options:[{v:"draft",label:"مسودّة"},{v:"posted",label:"مُرحّل"}]}]});
  // CUSTOMERS
  Ops.table({mount:"#t_customers",title:"العملاء",addLabel:"عميل",searchKeys:["name","city"],
    rows:[{_id:1,name:"شركة الاتحاد للمؤتمرات",city:"عمّان",bal:"١٢٬٤٠٠",st:"active"},{_id:2,name:"منتجع البحر الميت",city:"البحر الميت",bal:"٨٬٢٠٠",st:"active"},{_id:3,name:"مطاعم العقبة",city:"العقبة",bal:"٠",st:"inactive"}],
    statusKey:"st",statusCycle:[{v:"active",label:"نشط",tag:"ok"},{v:"inactive",label:"غير نشط",tag:"info"}],
    cols:[{key:"name",label:"العميل",cls:"name",w:"1.8fr"},{key:"city",label:"المدينة",w:"1fr"},{key:"bal",label:"الرصيد",cls:"num",w:"1fr"},{key:"st",label:"الحالة",tag:true,w:".9fr"}],
    form:[{key:"name",label:"اسم العميل"},{key:"city",label:"المدينة"},{key:"bal",label:"الرصيد",def:"٠"},{key:"st",type:"select",options:[{v:"active",label:"نشط"},{v:"inactive",label:"غير نشط"}]}]});
  // SUPPLIERS
  Ops.table({mount:"#t_suppliers",title:"المورّدون",addLabel:"مورّد",searchKeys:["name","cat"],
    rows:[{_id:1,name:"مزارع الأعلاف الوطنية",cat:"أعلاف",bal:"٤٬٢٠٠",st:"active"},{_id:2,name:"موّردو معدّات الألبان",cat:"معدّات",bal:"١١٬٠٠٠",st:"active"},{_id:3,name:"شركة التغليف الذهبي",cat:"تغليف",bal:"٢٬٤٠٠",st:"hold"}],
    statusKey:"st",statusCycle:[{v:"active",label:"نشط",tag:"ok"},{v:"hold",label:"معلّق",tag:"warn"}],
    cols:[{key:"name",label:"المورّد",cls:"name",w:"1.8fr"},{key:"cat",label:"الفئة",w:"1fr"},{key:"bal",label:"المستحق",cls:"num",w:"1fr"},{key:"st",label:"الحالة",tag:true,w:".9fr"}],
    form:[{key:"name",label:"اسم المورّد"},{key:"cat",label:"الفئة"},{key:"bal",label:"المستحق",def:"٠"},{key:"st",type:"select",options:[{v:"active",label:"نشط"},{v:"hold",label:"معلّق"}]}]});
  // PRODUCTS — adjust stock + reorder
  var products=[{_id:1,name:"جبن فاخر",sku:"CH-01",stock:340,reorder:200},{_id:2,name:"حليب مبستر",sku:"MK-02",stock:120,reorder:300},{_id:3,name:"زبادي",sku:"YG-03",stock:560,reorder:250},{_id:4,name:"أعلاف",sku:"FD-04",stock:80,reorder:400}];
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  var prodTable=Ops.table({mount:"#t_products",title:"المنتجات",addLabel:"منتج",searchKeys:["name","sku"],rows:products,
    cols:[{key:"name",label:"المنتج",cls:"name",w:"1.4fr"},{key:"sku",label:"الرمز",w:".8fr"},
      {key:"stock",label:"المخزون",cls:"num",w:"1.4fr",render:function(r){return '<span style="display:inline-flex;align-items:center;gap:6px"><button class="ops-export" style="padding:3px 9px" data-dec="'+r._id+'">−</button><b style="color:'+(r.stock<r.reorder?"#9a5648":"var(--emerald)")+'">'+ar(r.stock)+'</b><button class="ops-export" style="padding:3px 9px" data-inc="'+r._id+'">+</button></span>';}},
      {key:"reorder",label:"نقطة الطلب",cls:"num",w:".9fr",render:function(r){return ar(r.reorder);}},
      {key:"flag",label:"الحالة",w:".9fr",render:function(r){return r.stock<r.reorder?'<span class="ops-tag crit">إعادة طلب</span>':'<span class="ops-tag ok">كافٍ</span>';}}],
    form:[{key:"name",label:"المنتج"},{key:"sku",label:"الرمز"},{key:"stock",label:"المخزون",def:"0"},{key:"reorder",label:"نقطة الطلب",def:"100"}]});
  document.getElementById("t_products").addEventListener("click",function(e){
    var inc=e.target.closest("[data-inc]"),dec=e.target.closest("[data-dec]");
    if(!inc&&!dec)return; e.stopPropagation();
    var id=(inc||dec).dataset.inc||(inc||dec).dataset.dec; var p=products.filter(function(x){return x._id==id;})[0];
    p.stock=Math.max(0,p.stock+(inc?20:-20)); if(prodTable&&prodTable.rerender) prodTable.rerender();
  });
  // POs — create/send/receive/cancel
  Ops.table({mount:"#t_po",title:"أوامر الشراء",addLabel:"أمر شراء",searchKeys:["sup","item"],
    rows:[{_id:1,sup:"مزارع الأعلاف",item:"أعلاف ٢٬٤٠٠ كغ",amt:"٤٬٢٠٠",st:"sent"},{_id:2,sup:"معدّات الألبان",item:"خط تبريد",amt:"١١٬٠٠٠",st:"draft"},{_id:3,sup:"التغليف الذهبي",item:"عبوات ١٠ك",amt:"٢٬٤٠٠",st:"received"}],
    statusKey:"st",statusCycle:[{v:"draft",label:"مسودّة",tag:"info"},{v:"sent",label:"مُرسل",tag:"warn"},{v:"received",label:"مُستلم",tag:"ok"},{v:"cancelled",label:"ملغى",tag:"crit"}],
    cols:[{key:"sup",label:"المورّد",cls:"name",w:"1.4fr"},{key:"item",label:"البند",w:"1.4fr"},{key:"amt",label:"المبلغ",cls:"num",w:"1fr"},{key:"st",label:"الحالة",tag:true,w:"1fr"}],
    form:[{key:"sup",label:"المورّد"},{key:"item",label:"البند"},{key:"amt",label:"المبلغ",def:"٠"},{key:"st",type:"select",options:[{v:"draft",label:"مسودّة"},{v:"sent",label:"مُرسل"},{v:"received",label:"مُستلم"},{v:"cancelled",label:"ملغى"}]}]});
  // SOs — create/confirm/fulfill/cancel
  Ops.table({mount:"#t_so",title:"أوامر البيع",addLabel:"أمر بيع",searchKeys:["cust","item"],
    rows:[{_id:1,cust:"الاتحاد للمؤتمرات",item:"جبن فاخر ٢٢٠ كغ",amt:"١٢٬٤٠٠",st:"confirmed"},{_id:2,cust:"منتجع البحر الميت",item:"ألبان متنوّعة",amt:"٨٬٢٠٠",st:"fulfilled"},{_id:3,cust:"مطاعم العقبة",item:"زبادي ١٠٠ كغ",amt:"١٬٤٠٠",st:"draft"}],
    statusKey:"st",statusCycle:[{v:"draft",label:"مسودّة",tag:"info"},{v:"confirmed",label:"مؤكّد",tag:"warn"},{v:"fulfilled",label:"مُنفّذ",tag:"ok"},{v:"cancelled",label:"ملغى",tag:"crit"}],
    cols:[{key:"cust",label:"العميل",cls:"name",w:"1.4fr"},{key:"item",label:"البند",w:"1.4fr"},{key:"amt",label:"المبلغ",cls:"num",w:"1fr"},{key:"st",label:"الحالة",tag:true,w:"1fr"}],
    form:[{key:"cust",label:"العميل"},{key:"item",label:"البند"},{key:"amt",label:"المبلغ",def:"٠"},{key:"st",type:"select",options:[{v:"draft",label:"مسودّة"},{v:"confirmed",label:"مؤكّد"},{v:"fulfilled",label:"مُنفّذ"},{v:"cancelled",label:"ملغى"}]}]});
  // WAREHOUSES
  Ops.table({mount:"#t_warehouses",title:"المستودعات",addLabel:"مستودع",searchKeys:["name","loc"],
    rows:[{_id:1,name:"مستودع عمّان المركزي",loc:"عمّان",cap:"٨٥٪",st:"active"},{_id:2,name:"مستودع الأغوار المبرّد",loc:"وادي الأردن",cap:"٦٢٪",st:"active"},{_id:3,name:"مستودع العقبة",loc:"العقبة",cap:"٤٠٪",st:"active"}],
    statusKey:"st",statusCycle:[{v:"active",label:"نشط",tag:"ok"},{v:"maint",label:"صيانة",tag:"warn"}],
    cols:[{key:"name",label:"المستودع",cls:"name",w:"1.8fr"},{key:"loc",label:"الموقع",w:"1fr"},{key:"cap",label:"الإشغال",cls:"num",w:".9fr"},{key:"st",label:"الحالة",tag:true,w:".9fr"}],
    form:[{key:"name",label:"المستودع"},{key:"loc",label:"الموقع"},{key:"cap",label:"الإشغال",def:"٠٪"},{key:"st",type:"select",options:[{v:"active",label:"نشط"},{v:"maint",label:"صيانة"}]}]});
  // TRANSFERS (+ movements implied)
  Ops.table({mount:"#t_transfers",title:"التحويلات والحركات",addLabel:"تحويل",searchKeys:["item","from","to"],
    rows:[{_id:1,item:"جبن فاخر ١٢٠ كغ",from:"الأغوار",to:"عمّان",st:"transit"},{_id:2,item:"أعلاف ٢٤٠٠ كغ",from:"عمّان",to:"مزارع المها",st:"done"},{_id:3,item:"عبوات تغليف",from:"عمّان",to:"العقبة",st:"pending"}],
    statusKey:"st",statusCycle:[{v:"pending",label:"معلّق",tag:"info"},{v:"transit",label:"قيد النقل",tag:"warn"},{v:"done",label:"تمّ",tag:"ok"}],
    cols:[{key:"item",label:"البند",cls:"name",w:"1.6fr"},{key:"from",label:"من",w:"1fr"},{key:"to",label:"إلى",w:"1fr"},{key:"st",label:"الحالة",tag:true,w:"1fr"}],
    form:[{key:"item",label:"البند"},{key:"from",label:"من",def:"عمّان"},{key:"to",label:"إلى",def:"—"},{key:"st",type:"select",options:[{v:"pending",label:"معلّق"},{v:"transit",label:"قيد النقل"},{v:"done",label:"تمّ"}]}]});
  // MAPPINGS — toggle + delete + tester
  Ops.table({mount:"#t_mappings",title:"قواعد الربط",addLabel:"قاعدة",searchKeys:["src","dst"],
    rows:[{_id:1,src:"حجز أرينا",dst:"إيراد ٤٠٠",on:"on"},{_id:2,src:"شراء علف",dst:"مصاريف ٥١٠",on:"on"},{_id:3,src:"دفعة ألبان",dst:"مخزون ١٣٠",on:"off"}],
    statusKey:"on",statusCycle:[{v:"on",label:"مُفعّل",tag:"ok"},{v:"off",label:"موقوف",tag:"info"}],
    cols:[{key:"src",label:"المصدر",cls:"name",w:"1.4fr"},{key:"dst",label:"الوجهة",w:"1.4fr"},{key:"on",label:"الحالة",tag:true,w:"1fr"}],
    form:[{key:"src",label:"المصدر"},{key:"dst",label:"الوجهة"},{key:"on",type:"select",options:[{v:"on",label:"مُفعّل"},{v:"off",label:"موقوف"}]}]});
  // IMPORTS — clear test
  document.getElementById("t_imports").innerHTML='<div class="ops-toolbar"><h2>الاستيراد</h2><div class="ops-actions"><button class="ops-add" id="impRun">⬆ استورد ملفاً</button><button class="ops-export" id="impClear">امسح بيانات الاختبار</button></div></div>'+
    '<div class="ops-table"><div class="ops-tr head" style="grid-template-columns:1.6fr 1fr 1fr"><span class="ops-cell">الملف</span><span class="ops-cell num">السجلات</span><span class="ops-cell">الحالة</span></div>'+
    '<div class="ops-tr row" style="grid-template-columns:1.6fr 1fr 1fr"><span class="ops-cell name">عملاء_٢٠٢٦.csv</span><span class="ops-cell num">٤٢٠</span><span class="ops-cell"><span class="ops-tag ok">مكتمل</span></span></div>'+
    '<div class="ops-tr row" style="grid-template-columns:1.6fr 1fr 1fr"><span class="ops-cell name">منتجات_اختبار.csv</span><span class="ops-cell num">١٢</span><span class="ops-cell"><span class="ops-tag warn">اختبار</span></span></div></div>';
  document.getElementById("impClear").addEventListener("click",function(){ document.querySelectorAll("#t_imports .ops-tr.row").forEach(function(r,i){ if(i===1)r.remove(); }); });
  document.getElementById("impRun").addEventListener("click",function(){ var fi=document.createElement("input"); fi.type="file"; fi.click(); });
  // ADMIN BRAIN
  var insights=[{_id:1,t:"تباين في قيود لوران غير مُرحّلة",tag:"تدقيق",open:true},{_id:2,t:"منتجان تحت نقطة الطلب",tag:"مخزون",open:true},{_id:3,t:"أمر شراء معلّق منذ ٥ أيام",tag:"مشتريات",open:true}];
  function renderAB(){
    document.getElementById("t_adminbrain").innerHTML='<div class="ops-toolbar"><h2>دماغ الإدارة</h2><div class="ops-actions"><button class="ops-add" id="abRun">✦ شغّل التحليل</button></div></div>'+
      insights.map(function(g){return '<div class="br-row" style="background:var(--cream);border-color:var(--line)"'+(g.open?'':' style="opacity:.5"')+'><span class="ops-tag warn">'+g.tag+'</span><div class="rt"><div class="tt" style="color:var(--ink)">'+g.t+'</div></div>'+(g.open?'<button class="ops-export" data-res="'+g._id+'">حلّ</button><button class="ops-export" data-dis="'+g._id+'">تجاهل</button>':'<span class="ops-tag ok">مُغلق</span>')+'</div>';}).join("");
    document.querySelectorAll("#t_adminbrain [data-res],#t_adminbrain [data-dis]").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.res||b.dataset.dis;insights.filter(function(x){return x._id==id;})[0].open=false;renderAB();});});
    var run=document.getElementById("abRun"); if(run)run.addEventListener("click",function(){insights.unshift({_id:Date.now(),t:"نمط جديد: تأخّر ترحيل القيود يبطئ الإقفال",tag:"تدقيق",open:true});renderAB();});
  }
  renderAB();
})();
