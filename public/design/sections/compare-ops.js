/* مقارنة · Compare A vs B — re-animates on change. */
(function(){
  Ops.init();
  var C=GROUP.companies, ar=Charts.ar;
  var selA=document.getElementById("selA"), selB=document.getElementById("selB");
  C.forEach(function(c){ selA.add(new Option(c.name,c.id)); selB.add(new Option(c.name,c.id)); });
  selA.value="arena"; selB.value="maha";

  function metric(label,val,max,disp,color){
    return '<div class="cmp-metric"><div class="ml"><span>'+label+'</span><b>'+disp+'</b></div>'+
      '<div class="cmp-bar"><span data-w="'+Math.min(100,val/max*100)+'" style="background:linear-gradient(90deg,'+color+'b3,'+color+')"></span></div></div>';
  }
  function side(co,head,body,color){
    head.style.background="linear-gradient(135deg,"+color+","+color+"cc)";
    head.innerHTML='<div class="lg">'+co.logo+'</div><div><div class="nm">'+co.name+'</div><div class="sc">'+co.sector+'</div></div>';
    body.innerHTML=
      metric("الإيراد الشهري",co.rev,90000,ar(co.rev.toLocaleString("en-US"))+" د",color)+
      metric("الهامش",co.margin,100,ar(co.margin)+"٪",color)+
      metric("الاستدامة ESG",co.esg,100,ar(co.esg)+"/١٠٠",color)+
      metric("البصمة التشغيلية",co.footprint,100,ar(co.footprint)+" وحدة",color);
  }
  function render(){
    var a=C.filter(function(c){return c.id===selA.value;})[0], b=C.filter(function(c){return c.id===selB.value;})[0];
    side(a,document.getElementById("headA"),document.getElementById("bodyA"),Charts.colors.EM);
    side(b,document.getElementById("headB"),document.getElementById("bodyB"),Charts.colors.GOLD);
    // overlaid area lines
    document.getElementById("cmpArea").innerHTML=
      '<div style="position:relative;height:160px">'+
      '<div style="position:absolute;inset:0">'+Charts.areaLine(a.months,560,160,Charts.colors.EM)+'</div>'+
      '<div style="position:absolute;inset:0">'+Charts.areaLine(b.months,560,160,Charts.colors.GOLD)+'</div>'+
      '</div>';
    requestAnimationFrame(function(){ Charts.play(); });
  }
  selA.addEventListener("change",render); selB.addEventListener("change",render);
  render();
})();
