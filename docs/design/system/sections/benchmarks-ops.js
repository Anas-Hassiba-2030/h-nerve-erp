/* الفيدرالية · Benchmarks — opt in/out + refresh + viz. */
(function(){
  var joined=false;
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2200);}
  function render(){
    var bench=document.getElementById("bench");
    if(!joined){ bench.innerHTML='<div style="text-align:center;padding:30px;color:var(--mist);opacity:.6">انضمّ للفيدرالية لرؤية الأنماط المرجعية المجهّلة عبر المستأجرين.</div>'; return; }
    bench.innerHTML=Charts.benchBars([
      {label:"هامشك مقابل القطاع",val:71,max:100,disp:"+٨ نقاط",color:"#7E9B86",color2:"#2E6B57"},
      {label:"كفاءة التوريد",val:84,max:100,disp:"أعلى ١٢٪",color:"#DCC38A",color2:"#C2A35A"},
      {label:"سرعة القرار",val:67,max:100,disp:"متوسط",color:"#DCC38A",color2:"#C2A35A"},
      {label:"دقّة التنبؤ",val:88,max:100,disp:"أعلى ٢٠٪",color:"#7E9B86",color2:"#2E6B57"}
    ]);
    requestAnimationFrame(function(){ if(window.Charts)Charts.play(bench); });
  }
  document.getElementById("federToggle").addEventListener("click",function(){
    joined=!joined;this.textContent=joined?"الانسحاب من الفيدرالية":"الانضمام للفيدرالية";
    this.className="br-btn "+(joined?"danger":"br-btn-primary");render();toast(joined?"انضممت للفيدرالية":"انسحبت من الفيدرالية");
  });
  document.getElementById("refresh").addEventListener("click",function(){
    var t=document.getElementById("thinking");t.style.display="inline-flex";setTimeout(function(){t.style.display="none";render();toast("حُدّثت الأنماط المرجعية");},1100);
  });
  render();
})();