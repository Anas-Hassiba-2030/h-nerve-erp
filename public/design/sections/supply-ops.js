/* سلسلة التوريد · Supply Chain — sankey flow + forecast approve/reject + AI explainer. */
(function(){
  Ops.init();
  var ar=Ops.ar;

  // ── sankey ──
  var NODES={
    sources:[{id:"loran",label:"لوران",vol:620},{id:"maha",label:"المها",vol:480}],
    hubs:[{id:"wh1",label:"مستودع عمّان",vol:700},{id:"wh2",label:"مستودع الأغوار",vol:400}],
    dests:[{id:"arena",label:"أرينا",vol:540},{id:"univ",label:"الأهلية",vol:300},{id:"ext",label:"أسواق خارجية",vol:260}]
  };
  var LINKS=[
    {s:"loran",t:"wh1",v:380},{s:"loran",t:"wh2",v:240},{s:"maha",t:"wh1",v:320},{s:"maha",t:"wh2",v:160},
    {s:"wh1",t:"arena",v:360},{s:"wh1",t:"univ",v:200},{s:"wh1",t:"ext",v:140},{s:"wh2",t:"arena",v:180},{s:"wh2",t:"univ",v:100},{s:"wh2",t:"ext",v:120}
  ];
  var svg=document.getElementById("sankey"), vol=document.getElementById("skVol");
  var W=800,H=260, colX={sources:60,hubs:380,dests:720};
  var pos={};
  function layout(col,key){ var n=NODES[key],gap=H/(n.length+1); n.forEach(function(nd,i){ pos[nd.id]={x:colX[key],y:gap*(i+1),vol:nd.vol}; }); }
  layout(0,"sources"); layout(0,"hubs"); layout(0,"dests");
  function draw(){
    var s='';
    // links first
    LINKS.forEach(function(l,i){
      var a=pos[l.s], b=pos[l.t]; var w=Math.max(2,l.v/26);
      var mx=(a.x+b.x)/2;
      var d="M"+a.x+" "+a.y+" C "+mx+" "+a.y+", "+mx+" "+b.y+", "+b.x+" "+b.y;
      s+='<path class="sk-band" data-i="'+i+'" d="'+d+'" fill="none" stroke="#C2A35A" stroke-width="'+w+'" opacity="0.28"/>';
    });
    // nodes
    Object.keys(NODES).forEach(function(key){ NODES[key].forEach(function(nd){
      var p=pos[nd.id]; var h=Math.max(26,nd.vol/9);
      s+='<g class="sk-node"><rect x="'+(p.x-7)+'" y="'+(p.y-h/2)+'" width="14" height="'+h+'" fill="#2E6B57" rx="5"/>'+
        '<text class="sk-label" x="'+(key==="dests"?p.x-16:p.x+16)+'" y="'+(p.y+4)+'" text-anchor="'+(key==="dests"?"end":"start")+'">'+nd.label+'</text></g>';
    }); });
    svg.innerHTML=s;
    svg.querySelectorAll(".sk-band").forEach(function(b){
      b.addEventListener("mouseenter",function(e){
        var l=LINKS[b.dataset.i];
        svg.querySelectorAll(".sk-band").forEach(function(x){ x.setAttribute("opacity", x===b?"0.85":"0.1"); });
        b.setAttribute("stroke","#2E6B57");
        vol.textContent=pos[l.s]&&NODES; // placeholder
        var name=function(id){ for(var k in NODES){ var f=NODES[k].filter(function(n){return n.id===id;})[0]; if(f)return f.label; } return id; };
        vol.textContent=name(l.s)+" ← "+name(l.t)+" · "+ar(l.v)+" كغ";
        var r=svg.getBoundingClientRect(), wr=svg.parentNode.getBoundingClientRect();
        vol.style.left=(e.clientX-wr.left+12)+"px"; vol.style.top=(e.clientY-wr.top-6)+"px"; vol.style.opacity="1";
      });
      b.addEventListener("mousemove",function(e){ var wr=svg.parentNode.getBoundingClientRect(); vol.style.left=(e.clientX-wr.left+12)+"px"; vol.style.top=(e.clientY-wr.top-6)+"px"; });
      b.addEventListener("mouseleave",function(){ svg.querySelectorAll(".sk-band").forEach(function(x){ x.setAttribute("opacity","0.28"); x.setAttribute("stroke","#C2A35A"); }); vol.style.opacity="0"; });
    });
  }
  draw();

  // ── forecasts ──
  var FC=[
    {id:"fc1",title:"طماطم وخيار: لوران ← مطابخ أرينا",sector:"زراعة",conf:84,qty:"٦٢٠ كغ",status:"pending",
      why:"رصد الدماغ <b>ارتفاعاً موسمياً</b> في إشغال أرينا (٧١٪) متزامناً مع نضج محصول الأغوار. التوريد الداخلي يوفّر <b>١٨٪</b> من تكلفة الشراء الخارجي ويقلّل زمن التسليم إلى أقل من يوم."},
    {id:"fc2",title:"أجبان فاخرة: المها ← منتجع البحر الميت",sector:"ألبان",conf:91,qty:"٢٢٠ كغ",status:"pending",
      why:"مؤتمرات الربع الثالث ترفع الطلب على الأجبان الفاخرة <b>أكثر من الثلث</b> تاريخياً. المخزون الحالي يكفي دون المساس بخطوط البيع الأخرى."},
    {id:"fc3",title:"أعلاف: المفرق ← مزارع المها",sector:"زراعة",conf:73,qty:"٢٬٤٠٠ كغ",status:"pending",
      why:"توقّع الدماغ زيادة إنتاج الألبان ٦٠٪، ما يرفع الطلب على الأعلاف. الثقة <b>متوسطة</b> لاعتمادها على قرار التوسّع غير المؤكّد بعد."},
    {id:"fc4",title:"حليب مبستر: المها ← أسواق خارجية",sector:"ألبان",conf:58,qty:"٣٬٠٠٠ ل",status:"pending",
      why:"دفعات قريبة من الانتهاء يمكن تصريفها خارجياً. الثقة <b>منخفضة</b> لأن الهامش الخارجي ضعيف وخطر الهدر قائم."},
  ];
  function ring(p){ var C=2*Math.PI*18,off=C*(1-p/100); return '<svg width="46" height="46"><circle cx="23" cy="23" r="18" fill="none" stroke="rgba(46,107,87,.15)" stroke-width="4.5"/><circle cx="23" cy="23" r="18" fill="none" stroke="#C2A35A" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/></svg>'; }
  var host=document.getElementById("forecasts");
  function render(){
    host.innerHTML=FC.map(function(f){
      var statusBadge = f.status==="approved"?'<span class="fc-status ok">مُعتمد</span>':f.status==="rejected"?'<span class="fc-status no">مرفوض</span>':'';
      var actions = f.status==="pending"?
        '<div class="fc-actions"><button class="fc-btn fc-approve" data-ok="'+f.id+'">يعتمد</button><button class="fc-btn fc-reject" data-no="'+f.id+'">يرفض</button></div>':statusBadge;
      return '<div class="fc-card '+(f.status==="approved"?"approved":f.status==="rejected"?"rejected":"")+'" data-id="'+f.id+'">'+
        '<div class="fc-head"><div class="fc-ring">'+ring(f.conf)+'<span class="v">'+ar(f.conf)+'٪</span></div>'+
        '<div class="fc-body"><div class="fc-title">'+f.title+'</div><div class="fc-meta"><span class="ops-tag info">'+f.sector+'</span><span>الكمية '+f.qty+'</span><span style="color:var(--gold)">▾ H‑Nerve يوضّح</span></div></div>'+
        actions+'</div>'+
        '<div class="fc-explain"><div class="fc-explain-in"><div class="eb">لماذا تنبّأ الدماغ بهذا؟</div>'+f.why+'</div></div></div>';
    }).join('');
    host.querySelectorAll(".fc-card").forEach(function(card){
      var f=FC.filter(function(x){return x.id===card.dataset.id;})[0];
      card.querySelector(".fc-head").addEventListener("click",function(e){ if(e.target.closest(".fc-btn"))return; card.classList.toggle("open"); });
      var ok=card.querySelector("[data-ok]"), no=card.querySelector("[data-no]");
      if(ok) ok.addEventListener("click",function(e){ e.stopPropagation(); f.status="approved"; card.classList.add("pulse-ok"); setTimeout(render,420); });
      if(no) no.addEventListener("click",function(e){ e.stopPropagation(); f.status="rejected"; card.classList.add("pulse-no"); setTimeout(render,420); });
    });
    document.querySelector(".sec-status").firstChild.nextSibling.textContent="مباشر · "+ar(FC.filter(function(f){return f.status==="pending";}).length)+" تنبؤات معلّقة";
  }
  render();
  document.getElementById("autoGen").addEventListener("click",function(){
    var n=FC.length+1;
    FC.unshift({id:"fc"+n,title:"توريد جديد مُقترح من الدماغ",sector:"زراعة",conf:60+(Math.random()*30|0),qty:ar((Math.random()*900+200|0))+" كغ",status:"pending",why:"اقتراح <b>مولّد تلقائياً</b> بناءً على أنماط الطلب الأخيرة عبر الوحدات."});
    render();
  });
})();
