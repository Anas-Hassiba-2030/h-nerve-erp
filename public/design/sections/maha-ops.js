/* المها · Dairy — batches CRUD + status + drawer (production chart + quality gauge). */
(function(){
  Ops.init();
  var batches=[
    {_id:"b1",num:"د-١٠٤٢",product:"جبن فاخر",liters:"١٬٢٠٠",quality:"٩٦",status:"ready"},
    {_id:"b2",num:"د-١٠٤٣",product:"لبن طازج",liters:"٢٬٤٠٠",quality:"٩٢",status:"inspect"},
    {_id:"b3",num:"د-١٠٤٤",product:"زبادي",liters:"٩٨٠",quality:"٩٤",status:"production"},
    {_id:"b4",num:"د-١٠٣٨",product:"حليب مبستر",liters:"١٤٬٥٠٨",quality:"٨١",status:"delivered"},
    {_id:"b5",num:"د-١٠٤٥",product:"قشطة",liters:"٣٤٠",quality:"٨٨",status:"production"},
  ];
  var STAT=[{v:"production",label:"إنتاج",tag:"info"},{v:"inspect",label:"فحص",tag:"warn"},{v:"ready",label:"جاهز",tag:"ok"},{v:"delivered",label:"مُسلّم",tag:"info"}];

  function gauge(pct){
    var p=parseInt(String(pct).replace(/[^\d]/g,function(d){return d;}))|| (function(){var m=String(pct).replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);});return parseInt(m)||90;})();
    var C=2*Math.PI*40, off=C*(1-p/100);
    return '<div class="gauge"><svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(46,107,87,.15)" stroke-width="9"/>'+
      '<circle cx="50" cy="50" r="40" fill="none" stroke="#2E6B57" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/></svg>'+
      '<span class="gv">'+Ops.ar(p)+'٪</span><div class="gl">الجودة</div></div>';
  }
  function bars(){
    var d=[42,48,40,52,46,58,54,62,60,68,64,72]; var max=Math.max.apply(null,d);
    return '<div class="bars" style="height:120px">'+d.map(function(v){return '<div class="bar-col"><div class="bar-stack"><div class="bar rev" style="height:'+(v/max*100)+'%"></div></div></div>';}).join('')+'</div>';
  }

  Ops.table({
    mount:"#batchTable", title:"الدفعات", addLabel:"دفعة جديدة", rows:batches,
    statusKey:"status", statusCycle:STAT, searchKeys:["num","product"],
    cols:[
      {key:"num",label:"رقم الدفعة",cls:"name",w:"1fr"},
      {key:"product",label:"المنتج",w:"1.2fr"},
      {key:"liters",label:"اللترات",cls:"num",w:".9fr"},
      {key:"quality",label:"الجودة %",cls:"num",w:".8fr"},
      {key:"status",label:"الحالة",tag:true,w:"1fr"},
    ],
    form:[
      {key:"num",label:"رقم الدفعة",def:"د-١٠٤٦"},{key:"product",label:"المنتج"},
      {key:"liters",label:"اللترات",def:"٠"},{key:"quality",label:"الجودة",def:"٩٠"},
      {key:"status",type:"select",options:STAT.map(function(s){return{v:s.v,label:s.label};})},
    ],
    drawer:function(b){
      return '<div class="dr-eyebrow">دفعة · '+b.product+'</div><h3>'+Ops.esc(b.num)+'</h3>'+
        '<div class="dr-sub">'+b.liters+' لتر</div>'+
        '<div class="dr-sec">جودة الدفعة</div><div style="display:flex;justify-content:center">'+gauge(b.quality)+'</div>'+
        '<div class="dr-sec">إنتاج آخر ١٢ يوماً</div>'+bars()+
        '<a class="dr-msg" style="display:block;margin-top:18px;text-align:center;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--emerald-soft),var(--emerald));border-radius:12px;padding:12px;text-decoration:none" href="whatif.html">محاكاة أثر التوسّع</a>';
    },
  });
})();
