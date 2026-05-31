/* الأتمتة · Workflows — visual Studio editor: palette → drag canvas → inspector + test-run. */
(function(){
  function toast(m){var t=document.getElementById("toast");if(!t)return;t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2200);}
  var canvas=document.getElementById("canvas"), wires=document.getElementById("wires");
  var KIND={trigger:{label:"محفّز"},cond:{label:"شرط"},action:{label:"إجراء"}};
  var nodes=[], nid=0, sel=null, drag=null;
  function add(kind,x,y,title){ var n={id:nid++,kind:kind,x:x,y:y,title:title||KIND[kind].label}; nodes.push(n); render(); return n; }
  function seed(){ nodes=[]; nid=0; add("trigger",60,60,"دفعة قرب الانتهاء"); add("cond",250,60,"الكمية > ١٠٠٠ لتر"); add("action",450,60,"أرسل تنبيهاً للمدير"); }
  function render(){
    canvas.querySelectorAll(".wnode").forEach(function(e){e.remove();});
    nodes.forEach(function(n){
      var el=document.createElement("div"); el.className="wnode"+(sel===n?" sel":""); el.style.left=n.x+"px"; el.style.top=n.y+"px"; el.dataset.id=n.id;
      el.innerHTML='<div class="wt">'+n.title+'</div><div class="wk">'+KIND[n.kind].label+'</div>';
      canvas.appendChild(el);
      el.addEventListener("mousedown",function(e){ drag={n:n,dx:e.offsetX,dy:e.offsetY}; sel=n; render(); inspect(); });
    });
    drawWires();
  }
  function drawWires(){
    if(!wires) return; var s="";
    for(var i=0;i<nodes.length-1;i++){ var a=nodes[i],b=nodes[i+1]; var x1=a.x+120,y1=a.y+22,x2=b.x,y2=b.y+22,mx=(x1+x2)/2;
      s+='<path d="M'+x1+' '+y1+' C '+mx+' '+y1+','+mx+' '+y2+','+x2+' '+y2+'" fill="none" stroke="#C2A35A" stroke-width="1.6" opacity=".5"/>'; }
    wires.innerHTML=s;
  }
  canvas.addEventListener("mousemove",function(e){ if(!drag)return; var r=canvas.getBoundingClientRect();
    drag.n.x=Math.max(0,Math.min(e.clientX-r.left-drag.dx,r.width-120)); drag.n.y=Math.max(0,Math.min(e.clientY-r.top-drag.dy,r.height-50)); render(); });
  addEventListener("mouseup",function(){ drag=null; });
  function inspect(){
    var ins=document.getElementById("inspector");
    if(!sel){ins.innerHTML='<div style="font-size:12px;color:var(--mist);opacity:.55">اختر عقدة لتحرير إعداداتها.</div>';return;}
    ins.innerHTML='<div class="insp-field"><label>النوع</label><select id="ik"><option value="trigger"'+(sel.kind==="trigger"?" selected":"")+'>محفّز</option><option value="cond"'+(sel.kind==="cond"?" selected":"")+'>شرط</option><option value="action"'+(sel.kind==="action"?" selected":"")+'>إجراء</option></select></div>'+
      '<div class="insp-field"><label>العنوان</label><input id="it" value="'+sel.title.replace(/"/g,"&quot;")+'"></div>'+
      '<button class="br-btn danger" id="delNode" style="width:100%;justify-content:center">حذف العقدة</button>';
    document.getElementById("ik").addEventListener("change",function(){sel.kind=this.value;render();});
    document.getElementById("it").addEventListener("input",function(){sel.title=this.value;render();});
    document.getElementById("delNode").addEventListener("click",function(){nodes=nodes.filter(function(x){return x!==sel;});sel=null;render();inspect();toast("حُذفت العقدة");});
  }
  document.querySelectorAll(".pal-node").forEach(function(p){ p.addEventListener("click",function(){ add(p.dataset.kind, 80+Math.random()*120, 90+Math.random()*120); toast("أُضيفت عقدة"); }); });
  var addBtn=document.getElementById("addNode"); if(addBtn) addBtn.addEventListener("click",function(){ add("action",100,150); });
  var newBtn=document.getElementById("newWf"); if(newBtn) newBtn.addEventListener("click",function(){ nodes=[];sel=null;nid=0;render();inspect();toast("مسار جديد فارغ"); });
  var tmplBtn=document.getElementById("tmpl"); if(tmplBtn) tmplBtn.addEventListener("click",function(){ seed();inspect();toast("حُمّل قالب: تنبيه انتهاء الصلاحية"); });
  var testBtn=document.getElementById("testRun"); if(testBtn) testBtn.addEventListener("click",function(){
    var steps=document.querySelectorAll("#runstrip .step"); steps.forEach(function(s){s.classList.remove("on");});
    var i=0; var iv=setInterval(function(){ if(i>=steps.length){clearInterval(iv);toast("نجح التشغيل التجريبي ✓");return;} steps[i].classList.add("on"); i++; },500);
  });
  seed(); inspect();
})();
