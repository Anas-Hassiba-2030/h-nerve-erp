/* لوران · Agriculture — farms (live sensor gauges) + crops CRUD. */
(function(){
  Ops.init();
  var ar=Ops.ar;
  var farms=[
    {id:"f1",name:"مزرعة الأغوار",loc:"وادي الأردن",moist:62,temp:26,irr:78},
    {id:"f2",name:"مزرعة عمّان",loc:"ناعور",moist:48,temp:23,irr:64},
    {id:"f3",name:"مزرعة المفرق",loc:"المفرق",moist:35,temp:29,irr:52},
  ];
  function gauge(val,label,unit,color){
    var C=2*Math.PI*34, off=C*(1-val/100);
    return '<div class="gauge"><svg width="86" height="86"><circle cx="43" cy="43" r="34" fill="none" stroke="rgba(46,107,87,.14)" stroke-width="8"/>'+
      '<circle class="gring" cx="43" cy="43" r="34" fill="none" stroke="'+color+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/></svg>'+
      '<span class="gv">'+ar(val)+unit+'</span><div class="gl">'+label+'</div></div>';
  }
  function renderFarms(){
    var wrap=document.getElementById("farmsWrap");
    wrap.innerHTML='<div class="ops-toolbar"><h2>المزارع</h2><div class="ops-actions"><button class="ops-add" id="addFarm">＋ مزرعة جديدة</button></div></div>'+
      '<div class="ops-portfolio">'+farms.map(function(f){
        return '<div class="co-tile" data-id="'+f.id+'" style="cursor:default"><div class="co-nm">'+f.name+'</div><div class="co-sec">'+f.loc+'</div>'+
          '<div class="gauges">'+gauge(f.moist,"رطوبة","٪","#2E6B57")+gauge(f.temp*2.6|0,"حرارة","°","#C2A35A")+gauge(f.irr,"ري","٪","#7E9B86")+'</div>'+
          '<button class="ops-export" style="width:100%;margin-top:12px;justify-content:center" data-upd="'+f.id+'">⟳ تحديث القراءات</button></div>';
      }).join('')+'</div>';
    wrap.querySelectorAll("[data-upd]").forEach(function(b){
      b.addEventListener("click",function(){
        var f=farms.filter(function(x){return x.id===b.dataset.upd;})[0];
        f.moist=Math.max(20,Math.min(95,f.moist+(Math.random()*30-15)|0));
        f.irr=Math.max(30,Math.min(98,f.irr+(Math.random()*24-12)|0));
        f.temp=Math.max(18,Math.min(36,f.temp+(Math.random()*6-3)|0));
        renderFarms();
      });
    });
    var add=document.getElementById("addFarm");
    if(add) add.addEventListener("click",function(){
      farms.push({id:"f"+(farms.length+1),name:"مزرعة جديدة",loc:"—",moist:50,temp:24,irr:60}); renderFarms();
    });
  }
  renderFarms();

  // crops
  var crops=[
    {_id:"c1",crop:"طماطم",farm:"الأغوار",qty:"٣٤٠ كغ",dest:"أرينا سايس فرح",status:"harvest"},
    {_id:"c2",crop:"خيار",farm:"الأغوار",qty:"٢٨٠ كغ",dest:"أرينا البحر الميت",status:"harvest"},
    {_id:"c3",crop:"زيتون",farm:"عمّان",qty:"١٬٢٠٠ كغ",dest:"معصرة",status:"growth"},
    {_id:"c4",crop:"أعلاف",farm:"المفرق",qty:"٢٬٤٠٠ كغ",dest:"المها للألبان",status:"planted"},
  ];
  var CSTAT=[{v:"planted",label:"مزروع",tag:"info"},{v:"growth",label:"نمو",tag:"warn"},{v:"harvest",label:"حصاد",tag:"ok"}];
  Ops.table({
    mount:"#cropsTable", title:"المحاصيل", addLabel:"محصول جديد", rows:crops,
    statusKey:"status", statusCycle:CSTAT, searchKeys:["crop","farm","dest"],
    cols:[
      {key:"crop",label:"المحصول",cls:"name",w:"1fr"},
      {key:"farm",label:"المزرعة",w:"1fr"},
      {key:"qty",label:"الكمية",cls:"num",w:".9fr"},
      {key:"dest",label:"الوجهة",w:"1.2fr"},
      {key:"status",label:"الحالة",tag:true,w:".9fr"},
    ],
    form:[{key:"crop",label:"المحصول"},{key:"farm",label:"المزرعة",def:"الأغوار"},{key:"qty",label:"الكمية",def:"٠ كغ"},{key:"dest",label:"الوجهة",def:"—"},{key:"status",type:"select",options:CSTAT.map(function(s){return{v:s.v,label:s.label};})}],
  });
})();
