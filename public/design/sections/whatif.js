/* ماذا لو · What-If Simulator — live causal model + "soul".
   Levers → weighted causal graph → outputs + brain narration.
   Causal wave (lever→hub→KPI) makes each KPI flinch on arrival.
   The room reacts: risk vignette, reward glow, brain-spin intensity.
   Auto-solve animates levers to an optimal config. Reset reverses. */
(function(){
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ar(n){ return String(n).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }
  function grp(n){ return ar(Math.round(n).toLocaleString("en-US")); }
  function pct(n){ return (n>=0?"+":"−")+ar(Math.abs(n).toFixed(1))+"٪"; }

  var BASE = { net:97643, rev:137465, iq:92, risk:31 };

  var LEVERS = [
    { id:"arenaPrice", name:"سعر غرفة أرينا", unit:"د.أ", min:60, max:140, base:96, step:1,
      w:{ rev:0.9, net:1.3, risk:0.5 } },
    { id:"mahaOutput", name:"إنتاج المها", unit:"ألف لتر", min:8, max:26, base:14.5, step:0.5,
      w:{ rev:0.5, net:0.4, risk:0.35, iq:0.1 } },
    { id:"newInvest", name:"استثمار جديد", unit:"مليون د.أ", min:0, max:20, base:4, step:0.5,
      w:{ net:-0.6, rev:0.3, risk:0.7, iq:0.25 } },
    { id:"annualReturn", name:"العائد السنوي المستهدف", unit:"٪", min:4, max:24, base:12, step:0.5,
      w:{ net:0.8, risk:0.9 } },
    { id:"students", name:"عدد طلبة الأهلية", unit:"", min:6000, max:12000, base:8420, step:100,
      w:{ rev:0.6, net:0.5, risk:-0.15 } },
  ];

  var leversEl=document.getElementById("levers"), flowIn=document.getElementById("flowIn"), flowOut=document.getElementById("flowOut");
  var hub=document.getElementById("hub");
  var state={}, prevOut=Object.assign({},BASE);
  var OUTS=[{id:"rev",lbl:"الإيراد"},{id:"net",lbl:"صافي الربح"},{id:"iq",lbl:"ذكاء الدماغ"},{id:"risk",lbl:"المخاطرة"}];

  LEVERS.forEach(function(L,idx){
    state[L.id]=L.base;
    var wrap=document.createElement("div"); wrap.className="lever"; wrap.id="lever_"+L.id;
    wrap.innerHTML='<div class="lever-top"><span class="lever-name">'+L.name+'</span>'+
      '<span class="lever-val"><span id="v_'+L.id+'"></span>'+(L.unit?'<span style="font-size:11px;opacity:.6"> '+L.unit+'</span>':'')+
      '<span class="delta zero" id="d_'+L.id+'">●</span></span></div>'+
      '<input type="range" id="r_'+L.id+'" min="'+L.min+'" max="'+L.max+'" step="'+L.step+'" value="'+L.base+'">';
    leversEl.appendChild(wrap);
    var n=document.createElement("div"); n.className="node"; n.id="fin_"+L.id; n.innerHTML='<span class="nd"></span>'+L.name;
    flowIn.appendChild(n);
  });
  OUTS.forEach(function(o){
    var n=document.createElement("div"); n.className="node out"; n.id="fout_"+o.id;
    n.innerHTML='<span class="nlbl">'+o.lbl+'</span><span class="nval" id="fv_'+o.id+'">—</span>';
    flowOut.appendChild(n);
  });

  function fmtVal(L,v){ if(L.id==="students") return grp(v); if(L.step<1) return ar(v.toFixed(1)); return ar(Math.round(v)); }

  function compute(st){
    var d={rev:0,net:0,iq:0,risk:0};
    LEVERS.forEach(function(L){ var dev=((st[L.id]-L.base)/(L.max-L.min)); for(var k in L.w) d[k]+=dev*L.w[k]; });
    return { rev:BASE.rev*(1+d.rev*0.5), net:BASE.net*(1+d.net*0.5),
      iq:Math.max(40,Math.min(99,BASE.iq+d.iq*22)), risk:Math.max(2,Math.min(98,BASE.risk+d.risk*46)), d:d };
  }

  // which levers are "active" (moved from base) → causal path highlighting
  function activity(L){ return Math.abs(state[L.id]-L.base)/(L.max-L.min); }

  function narrate(o){
    var revD=(o.rev/BASE.rev-1)*100, netD=(o.net/BASE.net-1)*100, riskD=o.risk-BASE.risk;
    var lead=null,la=0; LEVERS.forEach(function(L){ var a=activity(L); if(a>la){la=a;lead=L;} });
    if(!lead||la<0.01) return "حرّك أيّ رافعة لتبدأ المحاكاة — أو دع الدماغ يحسب الأفضل.";
    var dir=state[lead.id]>=lead.base?"رفعت":"خفضت";
    var s="لو <b>"+dir+" "+lead.name+"</b> إلى <b>"+fmtVal(lead,state[lead.id])+(lead.unit?" "+lead.unit:"")+"</b>، ";
    s+="صافي الربح <span class='"+(netD>=0?"up":"down")+"'>"+pct(netD)+"</span>";
    s+=" والإيراد <span class='"+(revD>=0?"up":"down")+"'>"+pct(revD)+"</span>";
    if(Math.abs(riskD)>1.5) s+="، "+(riskD>0?"لكن":"و")+" المخاطرة <span class='"+(riskD>=0?"down":"up")+"'>"+pct(riskD)+"</span>";
    s+=".";
    return s;
  }

  var svg=document.getElementById("wires");
  function buildWires(){
    var inN=LEVERS.length, outN=OUTS.length, parts=[];
    for(var i=0;i<inN;i++){ var y=(i+0.5)/inN*100; parts.push(path("win_"+i,2,y,46,50)); }
    for(var j=0;j<outN;j++){ var y2=(j+0.5)/outN*100; parts.push(path("wout_"+j,54,50,98,y2)); }
    svg.innerHTML=parts.join("");
  }
  function path(id,x1,y1,x2,y2){
    var mx=(x1+x2)/2, d="M"+x1+" "+y1+" C "+mx+" "+y1+", "+mx+" "+y2+", "+x2+" "+y2;
    return '<path id="'+id+'" data-d="'+d+'" d="'+d+'" fill="none" stroke="#C2A35A" stroke-width="0.6" opacity="0.16" vector-effect="non-scaling-stroke"/>';
  }
  function styleWires(){
    for(var i=0;i<LEVERS.length;i++){ var a=activity(LEVERS[i]); var p=document.getElementById("win_"+i);
      if(p){ p.setAttribute("stroke-width",(0.4+a*1.3).toFixed(2)); p.setAttribute("opacity",(a>0.02?0.2+a*0.6:0.12).toFixed(2)); } }
    var anyActive=LEVERS.some(function(L){return activity(L)>0.02;});
    for(var j=0;j<OUTS.length;j++){ var po=document.getElementById("wout_"+j);
      if(po){ po.setAttribute("opacity",(anyActive?0.5:0.16).toFixed(2)); po.setAttribute("stroke-width",anyActive?"0.9":"0.6"); } }
  }

  // ── the causal wave: gold pulse lever→hub→outputs; KPI flinches on arrival ──
  function fireWave(){
    if(reduce){ flinchAll(); return; }
    // pulse along each active input wire into the hub
    var fired=false;
    LEVERS.forEach(function(L,i){
      if(activity(L)<0.02) return; fired=true;
      pulseAlong("win_"+i, 380, null);
      document.getElementById("fin_"+L.id).classList.add("lit");
    });
    // hub flares, then pulses out to each KPI which flinches on arrival
    setTimeout(function(){
      hub.classList.add("intense");
      OUTS.forEach(function(o,j){
        pulseAlong("wout_"+j, 360, function(){ flinch(o.id); });
      });
      setTimeout(function(){ if(!solving) hub.classList.remove("intense"); }, 500);
    }, fired?380:0);
  }
  function pulseAlong(pathId, dur, onArrive){
    var p=document.getElementById(pathId); if(!p) return;
    var d=p.getAttribute("data-d");
    var c=document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("r","1.3"); c.setAttribute("fill","#FBF3DC");
    var am=document.createElementNS("http://www.w3.org/2000/svg","animateMotion");
    am.setAttribute("dur",(dur/1000)+"s"); am.setAttribute("repeatCount","1"); am.setAttribute("path",d); am.setAttribute("fill","freeze");
    c.appendChild(am); svg.appendChild(c);
    if(am.beginElement) try{am.beginElement();}catch(e){}
    setTimeout(function(){ c.remove(); if(onArrive) onArrive(); }, dur);
  }
  function flinch(id){
    var k=document.getElementById("kpi_"+id), f=document.getElementById("fout_"+id);
    if(k){ k.classList.remove("flinch"); void k.offsetWidth; k.classList.add("flinch"); }
    if(f){ f.classList.remove("flinch"); void f.offsetWidth; f.classList.add("flinch"); }
  }
  function flinchAll(){ OUTS.forEach(function(o){ flinch(o.id); }); }

  // ── render ──
  function render(opts){
    opts=opts||{};
    var o=compute(state);
    document.getElementById("k_net").textContent=grp(o.net);
    document.getElementById("k_rev").textContent=grp(o.rev);
    document.getElementById("k_iq").textContent=ar(Math.round(o.iq));
    document.getElementById("k_risk").textContent=ar(Math.round(o.risk));
    document.getElementById("b_net").style.width=Math.max(4,Math.min(100,o.net/BASE.net*71))+"%";
    document.getElementById("b_rev").style.width=Math.max(4,Math.min(100,o.rev/BASE.rev*68))+"%";
    document.getElementById("b_iq").style.width=o.iq+"%";
    document.getElementById("b_risk").style.width=o.risk+"%";
    document.getElementById("hubIQ").textContent=ar(Math.round(o.iq));
    // ghost deltas vs baseline
    ghost("net",o.net,BASE.net,true); ghost("rev",o.rev,BASE.rev,true);
    ghost("iq",o.iq,BASE.iq,false); ghost("risk",o.risk,BASE.risk,false,true);
    // flow out values
    setOut("rev",pct((o.rev/BASE.rev-1)*100),o.rev>=BASE.rev?"up":"down");
    setOut("net",pct((o.net/BASE.net-1)*100),o.net>=BASE.net?"up":"down");
    setOut("iq",ar(Math.round(o.iq)),"");
    setOut("risk",ar(Math.round(o.risk)),o.risk>BASE.risk?"down":"up");
    document.getElementById("narr").innerHTML=narrate(o);
    styleWires();
    roomReacts(o);
    prevOut=o;
  }
  function ghost(id,val,base,money,invert){
    var g=document.getElementById("g_"+id); if(!g) return;
    var diff=val-base, eps=base*0.005+0.5;
    if(Math.abs(diff)<eps){ g.className="ghost zero"; g.innerHTML=""; return; }
    var good=invert? diff<0 : diff>0;
    g.className="ghost "+(good?"up":"down");
    g.innerHTML=(diff>0?"▲":"▼")+" <span class='base'>"+(money?grp(base):ar(Math.round(base)))+"</span>";
  }
  function setOut(id,txt,cls){ var e=document.getElementById("fv_"+id); e.textContent=txt; e.className="nval "+(cls||""); }

  // ── the room reacts ──
  var vig=document.getElementById("wi-vignette"), rew=document.getElementById("wi-reward");
  function roomReacts(o){
    var riskOver=Math.max(0,(o.risk-BASE.risk)/(98-BASE.risk));      // 0..1
    var netOver=Math.max(0,(o.net/BASE.net-1));                       // 0..~
    vig.style.opacity=Math.min(0.85,riskOver*1.1).toFixed(2);
    rew.style.opacity=Math.min(0.9,netOver*2.2).toFixed(2);
    // brain thinks harder the further levers are pushed
    var push=LEVERS.reduce(function(a,L){return a+activity(L);},0)/LEVERS.length; // 0..1
    hub.style.setProperty("--spin",(24-push*17).toFixed(1)+"s");
    if(push>0.04) hub.classList.add("intense"); else if(!solving) hub.classList.remove("intense");
  }

  // ── lever wiring ──
  var raf=0;
  function syncLever(L,fireWaveOnChange){
    var r=document.getElementById("r_"+L.id), vEl=document.getElementById("v_"+L.id), dEl=document.getElementById("d_"+L.id);
    state[L.id]=parseFloat(r.value);
    r.style.setProperty("--fill",((r.value-L.min)/(L.max-L.min)*100)+"%");
    vEl.textContent=fmtVal(L,state[L.id]);
    var diff=state[L.id]-L.base;
    if(Math.abs(diff)<(L.step/2)){ dEl.textContent="●"; dEl.className="delta zero"; }
    else { dEl.textContent=(diff>0?"▲ ":"▼ ")+fmtVal(L,Math.abs(diff)); dEl.className="delta "+(diff>0?"up":"down"); }
  }
  LEVERS.forEach(function(L){
    var r=document.getElementById("r_"+L.id);
    r.addEventListener("input",function(){
      syncLever(L); if(!raf) raf=requestAnimationFrame(function(){ raf=0; render(); });
      if(!solving) fireWaveDebounced();
    });
    syncLever(L);
  });
  var waveT=0;
  function fireWaveDebounced(){ clearTimeout(waveT); waveT=setTimeout(fireWave,90); }

  // ── auto-solve: the Brain animates levers to an optimal config ──
  var solving=false;
  function solve(){
    if(solving) return; solving=true;
    hub.classList.add("intense");
    document.getElementById("narr").innerHTML="<b>الدماغ يحسب…</b> يبحث عن أعلى صافي ربح ضمن نطاق مخاطرة مقبول.";
    LEVERS.forEach(function(L){ document.getElementById("lever_"+L.id).classList.add("brain-moving"); });
    // target = profit-maximizing within risk band: push rev/net levers up, keep risk lever moderate
    var targets={ arenaPrice:124, mahaOutput:21, newInvest:7, annualReturn:14, students:10800 };
    var start={}; LEVERS.forEach(function(L){ start[L.id]=state[L.id]; });
    if(reduce){
      LEVERS.forEach(function(L){ document.getElementById("r_"+L.id).value=targets[L.id]; syncLever(L); });
      finishSolve(); return;
    }
    var t0=null, dur=2200;
    function ease(x){ return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2; }
    function step(now){
      if(!t0)t0=now; var p=Math.min((now-t0)/dur,1), e=ease(p);
      LEVERS.forEach(function(L){
        // a little exploratory wobble while searching, settling at the end
        var wob=(1-p)*Math.sin(p*22+L.base)* (L.max-L.min)*0.04;
        var v=start[L.id]+(targets[L.id]-start[L.id])*e+wob;
        v=Math.max(L.min,Math.min(L.max,v));
        document.getElementById("r_"+L.id).value=v; syncLever(L);
      });
      render();
      if(p<1) requestAnimationFrame(step); else finishSolve();
    }
    requestAnimationFrame(step);
  }
  function finishSolve(){
    LEVERS.forEach(function(L){ document.getElementById("lever_"+L.id).classList.remove("brain-moving"); });
    render(); fireWave();
    var o=compute(state);
    setTimeout(function(){
      document.getElementById("narr").innerHTML="وجدتُ الأمثل: <b>صافي ربح "+grp(o.net)+" د.أ</b> "+
        "(<span class='up'>"+pct((o.net/BASE.net-1)*100)+"</span>) عند مخاطرة <b>"+ar(Math.round(o.risk))+"</b> — ضمن النطاق المقبول.";
      hub.classList.remove("intense"); solving=false;
    }, 700);
  }

  // ── reset: animate levers back to baseline, wave in reverse ──
  function reset(){
    if(solving) return;
    if(reduce){ LEVERS.forEach(function(L){ document.getElementById("r_"+L.id).value=L.base; syncLever(L); }); render(); return; }
    var start={}; LEVERS.forEach(function(L){ start[L.id]=state[L.id]; });
    var t0=null,dur=900;
    function ease(x){ return 1-Math.pow(1-x,3); }
    function step(now){ if(!t0)t0=now; var p=Math.min((now-t0)/dur,1),e=ease(p);
      LEVERS.forEach(function(L){ var v=start[L.id]+(L.base-start[L.id])*e; document.getElementById("r_"+L.id).value=v; syncLever(L); });
      render(); if(p<1) requestAnimationFrame(step); else { document.getElementById("narr").innerHTML=narrate(compute(state)); }
    }
    requestAnimationFrame(step);
  }

  document.getElementById("solveBtn").addEventListener("click",solve);
  document.getElementById("resetBtn").addEventListener("click",reset);
  document.getElementById("saveBtn").addEventListener("click",function(){
    var o=compute(state); var b=document.getElementById("saveBtn"); var t=b.textContent;
    b.textContent="✓ حُفظ السيناريو"; setTimeout(function(){ b.textContent=t; },1600);
  });

  buildWires(); render();
  addEventListener("resize", buildWires);
})();
