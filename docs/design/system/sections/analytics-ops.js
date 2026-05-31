/* التحليلات · Analytics */
(function(){
  Ops.init();
  var C=GROUP.companies, ar=Charts.ar;
  var totalMonths=GROUP.MONTHS.map(function(_,i){ return C.reduce(function(s,c){return s+c.months[i];},0); });

  // revenue bars
  document.getElementById("revBars").innerHTML=Charts.barChart(totalMonths,GROUP.MONTHS,160);
  // donut: share by company
  var total=C.reduce(function(s,c){return s+c.rev;},0)||1;
  // build a multi-segment donut
  (function(){
    var size=150,r=size/2-9,C2=2*Math.PI*r,c=size/2,acc=0,segs="";
    C.forEach(function(co){ var frac=co.rev/total; var len=C2*frac;
      segs+='<circle cx="'+c+'" cy="'+c+'" r="'+r+'" fill="none" stroke="'+(GROUP.sectorColors[co.sector]||"#888")+'" stroke-width="16" stroke-dasharray="'+len+' '+(C2-len)+'" stroke-dashoffset="'+(-acc)+'"/>';
      acc+=len;
    });
    document.getElementById("donut").innerHTML='<svg width="'+size+'" height="'+size+'" style="transform:rotate(-90deg)">'+segs+'</svg>';
    document.getElementById("legend").innerHTML=C.filter(function(c){return c.rev>0;}).map(function(co){
      return '<div class="lg-row"><span class="sw" style="background:'+(GROUP.sectorColors[co.sector])+'"></span>'+co.name+' · '+ar(Math.round(co.rev/total*100))+'٪</div>';
    }).join('');
  })();
  // cumulative area
  var cum=[],run=0; totalMonths.forEach(function(v){ run+=v; cum.push(run); });
  document.getElementById("area").innerHTML=Charts.areaLine(cum,520,150);
  // benchmarks
  document.getElementById("bench").innerHTML=Charts.benchBars([
    {label:"الإيراد",val:88,max:100,disp:"١١٨٪ من المتوسط",color:Charts.colors.GOLDS,color2:Charts.colors.GOLD},
    {label:"الهامش",val:71,max:100,disp:"٧١٪",color:Charts.colors.SAGE,color2:Charts.colors.EM},
    {label:"ESG",val:75,max:100,disp:"٧٥ / ١٠٠",color:Charts.colors.GOLDS,color2:Charts.colors.GOLD},
    {label:"النموّ السنوي",val:62,max:100,disp:"+١٢٪",color:Charts.colors.SAGE,color2:Charts.colors.EM},
  ]);
  // covers
  function renderCovers(filter){
    document.getElementById("covers").innerHTML=C.filter(function(c){return !filter||c.sector===filter;}).map(function(co){
      return '<div class="cover" data-id="'+co.id+'"><div class="lg">'+co.logo+'</div><div class="cn">'+co.name+'</div>'+
        '<div class="cv">'+ar(co.rev.toLocaleString("en-US"))+'</div>'+
        '<div style="font-size:11px;color:'+(co.growth>=0?"var(--sage)":"#9a5648")+';margin-top:3px">'+(co.growth>=0?"▲ +":"▼ ")+ar(Math.abs(co.growth))+'٪</div></div>';
    }).join('');
    document.querySelectorAll("#covers .cover").forEach(function(el){ el.addEventListener("click",function(){ detail(el.dataset.id); }); });
  }
  function detail(id){
    var co=C.filter(function(c){return c.id===id;})[0];
    Ops.openDrawer('<div class="dr-eyebrow">تحليل · '+co.sector+'</div><h3>'+co.name+'</h3>'+
      '<div class="dr-sub">أداء ١٢ شهراً</div>'+Charts.areaLine(co.months,330,130,GROUP.sectorColors[co.sector])+
      '<div class="dr-stats" style="margin-top:14px"><div class="dr-stat"><div class="v">'+ar(co.rev.toLocaleString("en-US"))+'</div><div class="k">إيراد ٣٠ي</div></div>'+
      '<div class="dr-stat"><div class="v">'+ar(co.margin)+'٪</div><div class="k">الهامش</div></div>'+
      '<div class="dr-stat"><div class="v">'+ar(co.esg)+'</div><div class="k">ESG</div></div>'+
      '<div class="dr-stat"><div class="v">'+(co.growth>=0?"+":"")+ar(co.growth)+'٪</div><div class="k">النموّ</div></div></div>');
    setTimeout(function(){ Charts.play(document.querySelector(".ops-drawer")); },30);
  }
  // sector pills
  var sectors=["الكل"].concat(C.map(function(c){return c.sector;}).filter(function(v,i,a){return a.indexOf(v)===i;}));
  document.getElementById("secPills").innerHTML=sectors.map(function(s,i){return '<button class="pill'+(i===0?" on":"")+'" data-s="'+(i===0?"":s)+'" style="padding:7px 15px;border-radius:999px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--ui);border:1px solid var(--line);background:'+(i===0?"linear-gradient(135deg,var(--emerald-soft),var(--emerald))":"var(--cream)")+';color:'+(i===0?"#fff":"var(--ink-muted)")+'">'+s+'</button>';}).join('');
  document.querySelectorAll("#secPills .pill").forEach(function(p){ p.addEventListener("click",function(){
    document.querySelectorAll("#secPills .pill").forEach(function(x){x.style.background="var(--cream)";x.style.color="var(--ink-muted)";});
    p.style.background="linear-gradient(135deg,var(--emerald-soft),var(--emerald))";p.style.color="#fff";
    renderCovers(p.dataset.s);
  }); });

  renderCovers();
  setTimeout(function(){ Charts.play(); },60);
})();
