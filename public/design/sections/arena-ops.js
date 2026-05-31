/* أرينا · Hotels operations — hotels + bookings CRUD. */
(function(){
  Ops.init();
  var ar=Ops.ar;

  // ── hotels ──
  var hotels=[
    {_id:"h1",name:"أرينا سايس فرح",city:"عمّان",rooms:"١٨٠",occ:"٨٤٪",rev:"٢٧٬٤٠٠",status:"strong",spark:[60,64,62,70,74,82,84]},
    {_id:"h2",name:"أرينا البحر الميت",city:"البحر الميت",rooms:"١٤٠",occ:"٧٨٪",rev:"٢١٬٢٠٠",status:"strong",spark:[52,58,55,62,70,74,78]},
    {_id:"h3",name:"أرينا العقبة",city:"العقبة",rooms:"١٢٠",occ:"٦٩٪",rev:"١٥٬٦٥٠",status:"good",spark:[64,60,66,62,68,67,69]},
    {_id:"h4",name:"أرينا وسط البلد",city:"عمّان",rooms:"٩٠",occ:"٦٤٪",rev:"١١٬٣٠٠",status:"watch",spark:[70,66,62,60,63,64,64]},
    {_id:"h5",name:"أرينا جرش",city:"جرش",rooms:"٧٠",occ:"٥٨٪",rev:"٧٬٤٦٠",status:"watch",spark:[64,60,58,55,57,58,58]},
  ];
  var HSTAT=[{v:"strong",label:"قوي",tag:"ok"},{v:"good",label:"جيد",tag:"info"},{v:"watch",label:"مراقبة",tag:"warn"}];

  function spark(data){
    var max=Math.max.apply(null,data),min=Math.min.apply(null,data),rng=max-min||1;
    var pts=data.map(function(v,i){return (i/(data.length-1)*100)+","+(50-((v-min)/rng)*44-3);}).join(" ");
    return '<svg class="dr-spark" viewBox="0 0 100 54" preserveAspectRatio="none"><polyline points="'+pts+'" fill="none" stroke="#2E6B57" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function heat(){ var s=""; for(var i=0;i<28;i++){ var o=(Math.random()*0.7+0.2).toFixed(2); s+='<span style="background:rgba(46,107,87,'+o+')"></span>'; } return s; }

  Ops.table({
    mount:"#hotelsTable", title:"الفنادق", addLabel:"فندق جديد", rows:hotels,
    statusKey:"status", statusCycle:HSTAT, searchKeys:["name","city"],
    cols:[
      {key:"name",label:"المنشأة",cls:"name",w:"1.4fr"},
      {key:"city",label:"المدينة",w:"1fr"},
      {key:"rooms",label:"الغرف",cls:"num",w:".7fr"},
      {key:"occ",label:"الإشغال",cls:"num",w:".8fr"},
      {key:"rev",label:"إيراد ٣٠ي",cls:"num",w:"1fr"},
      {key:"status",label:"الحالة",tag:true,w:".9fr"},
    ],
    form:[
      {key:"name",label:"اسم الفندق"},{key:"city",label:"المدينة"},
      {key:"rooms",label:"الغرف",def:"٠"},{key:"occ",label:"الإشغال",def:"٠٪"},
      {key:"rev",label:"الإيراد",def:"٠"},{key:"status",type:"select",options:HSTAT.map(function(s){return{v:s.v,label:s.label};})},
    ],
    onCreate:function(o){ o.spark=[50,52,54,56,58,60,62]; },
    drawer:function(h){
      return '<div class="dr-eyebrow">فندق · '+h.city+'</div><h3>'+Ops.esc(h.name)+'</h3>'+
        '<div class="dr-sub">'+h.rooms+' غرفة · إشغال '+h.occ+'</div>'+
        '<div class="dr-stats"><div class="dr-stat"><div class="v">'+h.occ+'</div><div class="k">الإشغال</div></div>'+
        '<div class="dr-stat"><div class="v">'+h.rev+'</div><div class="k">إيراد ٣٠ي</div></div></div>'+
        '<div class="dr-sec">أداء آخر ٧ أيام</div>'+spark(h.spark||[50,55,60,58,62,66,70])+
        '<div class="dr-sec">خريطة الإشغال</div><div class="dr-heat">'+heat()+'</div>'+
        '<a class="dr-msg" style="display:block;margin-top:18px;text-align:center;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--emerald-soft),var(--emerald));border-radius:12px;padding:12px;text-decoration:none" href="finance.html">عرض الأثر المالي</a>';
    },
  });

  // ── bookings ──
  var bookings=[
    {_id:"b1",guest:"شركة الاتحاد للمؤتمرات",hotel:"أرينا سايس فرح",dates:"١٥–١٨ أيار",status:"confirmed"},
    {_id:"b2",guest:"وفد البحر الميت السياحي",hotel:"أرينا البحر الميت",dates:"١٦–٢٠ أيار",status:"arrival"},
    {_id:"b3",guest:"مجموعة العقبة للأعمال",hotel:"أرينا العقبة",dates:"١٢–١٤ أيار",status:"departure"},
    {_id:"b4",guest:"حجز فردي · سامي خوري",hotel:"أرينا وسط البلد",dates:"١٨–١٩ أيار",status:"confirmed"},
    {_id:"b5",guest:"مؤتمر جرش الثقافي",hotel:"أرينا جرش",dates:"٢٠–٢٢ أيار",status:"cancelled"},
  ];
  var BSTAT=[{v:"confirmed",label:"مؤكد",tag:"ok"},{v:"arrival",label:"وصول",tag:"info"},{v:"departure",label:"مغادرة",tag:"warn"},{v:"cancelled",label:"ملغى",tag:"crit"}];
  Ops.table({
    mount:"#bookingsTable", title:"الحجوزات", addLabel:"حجز جديد", rows:bookings,
    statusKey:"status", statusCycle:BSTAT, searchKeys:["guest","hotel"],
    cols:[
      {key:"guest",label:"الضيف",cls:"name",w:"1.6fr"},
      {key:"hotel",label:"الفندق",w:"1.2fr"},
      {key:"dates",label:"التواريخ",cls:"num",w:"1fr"},
      {key:"status",label:"الحالة",tag:true,w:".9fr"},
    ],
    form:[
      {key:"guest",label:"اسم الضيف"},{key:"hotel",label:"الفندق",def:"أرينا سايس فرح"},
      {key:"dates",label:"التواريخ",def:"—"},{key:"status",type:"select",options:BSTAT.map(function(s){return{v:s.v,label:s.label};})},
    ],
  });
})();
