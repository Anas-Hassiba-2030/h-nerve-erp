/* الرسم السببي · Causal Graph — interactive node-edge cascade. */
(function(){
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ar(n){ return String(n).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }
  var svg=document.getElementById("cg");
  var NODES=[
    {id:"arena",label:"أرينا",x:140,y:110},{id:"maha",label:"المها",x:140,y:330},
    {id:"loran",label:"لوران",x:340,y:220},{id:"ahliyya",label:"الأهلية",x:340,y:80},
    {id:"feed",label:"العلف",x:560,y:330},{id:"cheese",label:"الجبن",x:560,y:160},
    {id:"revenue",label:"الإيراد",x:680,y:240},{id:"risk",label:"المخاطرة",x:560,y:400},
    {id:"esg",label:"الاستدامة",x:680,y:90}
  ];
  // directed edges (cause → effect)
  var EDGES=[
    ["loran","feed"],["loran","cheese"],["maha","cheese"],["feed","maha"],
    ["cheese","arena"],["arena","revenue"],["cheese","revenue"],["maha","risk"],
    ["ahliyya","revenue"],["loran","esg"],["maha","esg"],["risk","revenue"]
  ];
  var posById={}; NODES.forEach(function(n){posById[n.id]=n;});

  function draw(){
    var s="";
    EDGES.forEach(function(e,i){
      var a=posById[e[0]],b=posById[e[1]];
      s+='<line class="cg-edge" data-edge="'+i+'" data-from="'+e[0]+'" data-to="'+e[1]+'" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#C2A35A" stroke-width="1.3" opacity="0.22"/>';
    });
    NODES.forEach(function(n){
      s+='<g class="cg-node" data-node="'+n.id+'" transform="translate('+n.x+','+n.y+')">'+
        '<circle r="26" fill="rgba(31,77,63,.85)" stroke="#C2A35A" stroke-width="1.5"/>'+
        '<circle class="cg-halo" r="26" fill="none" stroke="#DCC38A" stroke-width="2" opacity="0"/>'+
        '<text text-anchor="middle" dy="5" fill="#fff" font-family="Cairo,sans-serif" font-size="13" font-weight="700">'+n.label+'</text></g>';
    });
    svg.innerHTML=s;
    svg.querySelectorAll(".cg-node").forEach(function(g){ g.addEventListener("click",function(){ cascade(g.dataset.node); }); });
    document.getElementById("kpNodes").textContent=ar(NODES.length);
    document.getElementById("kpEdges").textContent=ar(EDGES.length);
  }

  function clearSel(){
    svg.querySelectorAll(".cg-edge").forEach(function(l){ l.setAttribute("opacity","0.22"); l.setAttribute("stroke","#C2A35A"); l.setAttribute("stroke-width","1.3"); });
    svg.querySelectorAll(".cg-halo").forEach(function(h){ h.setAttribute("opacity","0"); });
    svg.querySelectorAll(".cg-node circle:first-child").forEach(function(c){ c.setAttribute("fill","rgba(31,77,63,.85)"); });
    document.getElementById("readout").classList.remove("show");
  }

  // BFS cascade highlight, edge-by-edge with delay
  function cascade(start){
    clearSel();
    var adj={}; EDGES.forEach(function(e,i){ (adj[e[0]]=adj[e[0]]||[]).push({to:e[1],edge:i}); });
    var visited={}; visited[start]=true;
    var layers=[[start]], frontier=[start], affected=1;
    // light the source
    hl(start);
    var delay=reduce?0:260;
    var step=0;
    function expand(curr){
      var next=[];
      curr.forEach(function(id){
        (adj[id]||[]).forEach(function(x){
          setTimeout(function(){ lightEdge(x.edge); if(!visited[x.to]){ hl(x.to); } },0);
          if(!visited[x.to]){ visited[x.to]=true; next.push(x.to); affected++; }
        });
      });
      return next;
    }
    function run(curr){
      if(!curr.length){ readout(start,affected); return; }
      setTimeout(function(){ var nx=expand(curr); run(nx); }, delay);
    }
    run([start]);
    if(reduce){ // resolve readout immediately
      var seen={};seen[start]=1;var q=[start];while(q.length){var c=q.shift();(adj[c]||[]).forEach(function(x){if(!seen[x.to]){seen[x.to]=1;q.push(x.to);}});}
      readout(start,Object.keys(seen).length);
    }
  }
  function hl(id){ var g=svg.querySelector('.cg-node[data-node="'+id+'"]'); if(!g)return; g.querySelector(".cg-halo").setAttribute("opacity","1"); g.querySelector("circle").setAttribute("fill","rgba(46,107,87,.95)"); }
  function lightEdge(i){ var l=svg.querySelector('.cg-edge[data-edge="'+i+'"]'); if(!l)return; l.setAttribute("opacity","0.9"); l.setAttribute("stroke","#DCC38A"); l.setAttribute("stroke-width","2.4");
    if(!reduce){ // travelling pulse
      var x1=+l.getAttribute("x1"),y1=+l.getAttribute("y1"),x2=+l.getAttribute("x2"),y2=+l.getAttribute("y2");
      var c=document.createElementNS("http://www.w3.org/2000/svg","circle"); c.setAttribute("r","3.2"); c.setAttribute("fill","#FBF3DC");
      var am=document.createElementNS("http://www.w3.org/2000/svg","animate"); am.setAttribute("attributeName","cx"); am.setAttribute("from",x1); am.setAttribute("to",x2); am.setAttribute("dur","0.5s"); am.setAttribute("fill","freeze");
      var am2=document.createElementNS("http://www.w3.org/2000/svg","animate"); am2.setAttribute("attributeName","cy"); am2.setAttribute("from",y1); am2.setAttribute("to",y2); am2.setAttribute("dur","0.5s"); am2.setAttribute("fill","freeze");
      c.appendChild(am); c.appendChild(am2); svg.appendChild(c); setTimeout(function(){c.remove();},560);
    }
  }
  function readout(start,n){
    var r=document.getElementById("readout"); var nm=posById[start].label;
    r.innerHTML='تغيّر في <b>'+nm+'</b> يؤثّر على <b>'+ar(n-1)+'</b> كيانات مرتبطة عبر الرسم السببي.';
    r.classList.add("show");
  }

  document.getElementById("clearBtn").addEventListener("click",clearSel);
  document.getElementById("buildBtn").addEventListener("click",function(){
    var t=document.getElementById("thinking"); t.style.display="inline-flex"; clearSel();
    svg.style.opacity=".3";
    setTimeout(function(){ svg.style.transition="opacity .5s"; svg.style.opacity="1"; t.style.display="none"; toast("أُعيد بناء الرسم السببي · "+ar(EDGES.length)+" رابط"); }, reduce?100:1100);
  });
  function toast(msg){ var t=document.getElementById("toast"); t.textContent="✦ "+msg; t.classList.add("show"); setTimeout(function(){t.classList.remove("show");},2200); }

  draw();
})();
