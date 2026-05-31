/* ════════════════════════════════════════════════════════════════
   H-NERVE · CHARTS helper (shared, lightweight inline-SVG).
   Heritage Luxury palette. All return SVG strings; animate via CSS.
   Charts.donut / gauge / areaLine / sparkline / benchBars / barChart
   ════════════════════════════════════════════════════════════════ */
window.Charts = (function(){
  var EM="#2E6B57", EMD="#1F4D3F", GOLD="#C2A35A", GOLDS="#DCC38A", SAGE="#7E9B86", BRICK="#A86A5C", LINE="rgba(46,107,87,.14)";
  function ar(n){ return String(n).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }

  function donut(pct,size,color){ size=size||90; color=color||GOLD; var r=size/2-7, C=2*Math.PI*r, off=C*(1-pct/100), c=size/2;
    return '<svg width="'+size+'" height="'+size+'" style="transform:rotate(-90deg)"><circle cx="'+c+'" cy="'+c+'" r="'+r+'" fill="none" stroke="'+LINE+'" stroke-width="8"/>'+
      '<circle cx="'+c+'" cy="'+c+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+C+'"><animate attributeName="stroke-dashoffset" from="'+C+'" to="'+off+'" dur="1s" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1" keyTimes="0;1"/></circle></svg>'; }

  function gauge(pct,label,unit,color){ color=color||EM; var r=34,C=Math.PI*r,off=C*(1-pct/100);
    return '<div class="ch-gauge" style="text-align:center"><svg width="92" height="56" viewBox="0 0 92 56"><path d="M12 50 A34 34 0 0 1 80 50" fill="none" stroke="'+LINE+'" stroke-width="8" stroke-linecap="round"/>'+
      '<path d="M12 50 A34 34 0 0 1 80 50" fill="none" stroke="'+color+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+C+'"><animate attributeName="stroke-dashoffset" from="'+C+'" to="'+off+'" dur="1s" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1" keyTimes="0;1"/></path></svg>'+
      '<div style="font-family:var(--display);font-size:19px;font-weight:600;color:var(--emerald);margin-top:-8px">'+ar(pct)+(unit||"")+'</div><div style="font-size:11px;color:var(--ink-muted)">'+(label||"")+'</div></div>'; }

  function areaLine(data,w,h,color){ w=w||520;h=h||150;color=color||EM; var max=Math.max.apply(null,data),min=Math.min.apply(null,data),rng=max-min||1,pad=10;
    var pts=data.map(function(v,i){return [pad+i/(data.length-1)*(w-2*pad), h-pad-((v-min)/rng)*(h-2*pad)];});
    var line=pts.map(function(p,i){return (i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1);}).join(" ");
    var area=line+" L"+pts[pts.length-1][0].toFixed(1)+" "+(h-pad)+" L"+pts[0][0].toFixed(1)+" "+(h-pad)+" Z";
    var id="ag"+Math.random().toString(36).slice(2,7);
    return '<svg width="100%" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="height:'+h+'px"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+color+'" stop-opacity=".28"/><stop offset="100%" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>'+
      '<path d="'+area+'" fill="url(#'+id+')"/><path d="'+line+'" fill="none" stroke="'+color+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.1s" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1" keyTimes="0;1"/></path></svg>'; }

  function barChart(data,labels,h){ h=h||150; var max=Math.max.apply(null,data);
    return '<div class="ch-bars" style="display:flex;align-items:flex-end;gap:6px;height:'+h+'px;padding-top:8px">'+
      data.map(function(v,i){return '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;height:100%">'+
        '<div class="ch-bar" style="width:100%;border-radius:5px 5px 0 0;background:linear-gradient(180deg,'+EM+','+EMD+');height:0;transition:height .9s cubic-bezier(.22,1,.36,1)" data-h="'+(v/max*100)+'"></div>'+
        '<span style="font-size:10px;color:var(--ink-muted)">'+(labels?labels[i]:"")+'</span></div>';}).join('')+'</div>'; }

  function benchBars(items){ // [{label,val,max,color}]
    return '<div style="display:flex;flex-direction:column;gap:11px">'+items.map(function(it){
      return '<div><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span style="color:var(--ink)">'+it.label+'</span><span style="font-family:var(--display);font-weight:600;color:var(--emerald)">'+it.disp+'</span></div>'+
        '<div style="height:8px;border-radius:999px;background:'+LINE+';overflow:hidden"><div class="ch-bench" style="height:100%;border-radius:999px;background:linear-gradient(90deg,'+(it.color||GOLDS)+','+(it.color2||GOLD)+');width:0;transition:width 1s cubic-bezier(.22,1,.36,1)" data-w="'+Math.min(100,it.val/it.max*100)+'"></div></div></div>';
    }).join('')+'</div>'; }

  function sparkline(data,color){ color=color||EM; var max=Math.max.apply(null,data),min=Math.min.apply(null,data),rng=max-min||1;
    var pts=data.map(function(v,i){return (i/(data.length-1)*100)+","+(28-((v-min)/rng)*24-2);}).join(" ");
    return '<svg viewBox="0 0 100 28" preserveAspectRatio="none" style="width:100%;height:30px"><polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }

  // call after inserting to animate bars/benches
  function play(scope){ scope=scope||document;
    scope.querySelectorAll(".ch-bar").forEach(function(b){ requestAnimationFrame(function(){ b.style.height=b.dataset.h+"%"; }); });
    scope.querySelectorAll(".ch-bench").forEach(function(b){ requestAnimationFrame(function(){ b.style.width=b.dataset.w+"%"; }); });
  }
  return { donut:donut, gauge:gauge, areaLine:areaLine, barChart:barChart, benchBars:benchBars, sparkline:sparkline, play:play, ar:ar,
    colors:{EM:EM,EMD:EMD,GOLD:GOLD,GOLDS:GOLDS,SAGE:SAGE,BRICK:BRICK} };
})();
