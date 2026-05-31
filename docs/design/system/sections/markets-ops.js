/* الأسواق · Markets — valuation + linked stocks grouped by region. */
(function(){
  Ops.init();
  var ar=Charts.ar;
  function spk(n){ var a=[]; var v=50; for(var i=0;i<16;i++){ v+=(Math.random()*16-8); a.push(v); } return a; }
  var REGIONS=[
    {name:"آسيا",tag:"إقليمي",stocks:[
      {sym:"ARENA",nm:"أرينا للضيافة",px:"٤٢.٨٠",ch:"+٤.٢٪",up:true},
      {sym:"MAHA",nm:"المها للألبان",px:"١٨.٤٠",ch:"+٢.١٪",up:true},
      {sym:"ASE-RE",nm:"عقارات عمّان",px:"٧.٦٥",ch:"−١.٣٪",up:false},
    ]},
    {name:"أوروبا",tag:"دولي",stocks:[
      {sym:"DAIRY-EU",nm:"ألبان أوروبا القابضة",px:"١٢٤.٢",ch:"+٠.٩٪",up:true},
      {sym:"AGRI-FD",nm:"صندوق الزراعة العالمي",px:"٨٨.٧",ch:"−٠.٤٪",up:false},
      {sym:"HOSP-IDX",nm:"مؤشّر الضيافة",px:"٢١٦.٥",ch:"+١.٧٪",up:true},
    ]},
  ];
  document.getElementById("regions").innerHTML=REGIONS.map(function(r){
    return '<div class="mk-region reveal"><h2>'+r.name+' <span class="rg">'+r.tag+'</span></h2><div class="mk-grid">'+
      r.stocks.map(function(s){ return '<div class="stock" data-sym="'+s.sym+'"><div class="sk-top"><span class="sym">'+s.sym+'</span><span class="ch '+(s.up?"up":"down")+'">'+s.ch+'</span></div>'+
        '<div class="nm">'+s.nm+'</div><div class="px">'+s.px+'</div>'+Charts.sparkline(spk(),s.up?Charts.colors.EM:Charts.colors.BRICK)+'</div>'; }).join('')+
      '</div></div>';
  }).join('');
  document.querySelectorAll(".stock").forEach(function(el){
    el.addEventListener("click",function(){
      var sym=el.dataset.sym, all=[]; REGIONS.forEach(function(r){r.stocks.forEach(function(s){all.push(s);});});
      var s=all.filter(function(x){return x.sym===sym;})[0];
      Ops.openDrawer('<div class="dr-eyebrow">سهم مرتبط</div><h3>'+s.sym+'</h3><div class="dr-sub">'+s.nm+'</div>'+
        '<div style="font-family:var(--display);font-size:36px;font-weight:600;color:var(--emerald)">'+s.px+' <span style="font-size:16px;color:'+(s.up?"var(--sage)":"#9a5648")+'">'+s.ch+'</span></div>'+
        '<div class="dr-sec">٣٠ يوماً</div>'+Charts.areaLine(spk(),330,130,s.up?Charts.colors.EM:Charts.colors.BRICK)+
        '<div class="dr-stats" style="margin-top:14px"><div class="dr-stat"><div class="v">'+s.px+'</div><div class="k">السعر</div></div><div class="dr-stat"><div class="v">'+s.ch+'</div><div class="k">التغيّر اليومي</div></div></div>');
    });
  });
})();
