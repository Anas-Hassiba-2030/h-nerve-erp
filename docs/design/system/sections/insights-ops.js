/* إشارات · Insights — CRUD + generate plan + run engine. */
(function(){
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  var SIG=[
    {id:1,t:"هبوط إيراد جامعة عمّان -٦٤٪",s:"تعليم",sev:"crit",open:true},
    {id:2,t:"٤ دفعات ألبان قرب الانتهاء",s:"ألبان",sev:"crit",open:true},
    {id:3,t:"إشغال أرينا فوق المعدل الموسمي",s:"ضيافة",sev:"warn",open:true},
    {id:4,t:"توقّع طلب أجبان فاخرة +٣٤٪",s:"ألبان",sev:"info",open:true},
    {id:5,t:"مؤشر ESG ضمن النطاق المستهدف",s:"المجموعة",sev:"ok",open:false}
  ];
  var nid=6;
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2200);}
  function render(){
    var feed=document.getElementById("feed");
    feed.innerHTML=SIG.map(function(g){
      return '<div class="br-row"'+(g.open?'':' style="opacity:.5"')+'><span class="br-chip '+g.sev+'">'+({crit:"حرج",warn:"تحذير",info:"معلومة",ok:"سليم"}[g.sev])+'</span>'+
        '<div class="rt"><div class="tt">'+g.t+'</div><div class="ts">'+g.s+(g.open?'':' · مُغلق')+'</div></div>'+
        (g.open?'<button class="br-btn br-btn-ghost" data-plan="'+g.id+'">ولّد خطة</button><button class="br-btn br-btn-ghost" data-res="'+g.id+'">حلّ</button>':'')+'</div>';
    }).join("");
    feed.querySelectorAll("[data-res]").forEach(function(b){b.addEventListener("click",function(){var g=SIG.filter(function(x){return x.id==b.dataset.res;})[0];g.open=false;render();toast("حُلّت الإشارة");});});
    feed.querySelectorAll("[data-plan]").forEach(function(b){b.addEventListener("click",function(){toast("ولّدت خطة من الإشارة → الخطط");});});
    document.getElementById("kpOpen").textContent=ar(SIG.filter(function(g){return g.open;}).length);
    document.getElementById("kpCrit").textContent=ar(SIG.filter(function(g){return g.open&&g.sev==="crit";}).length);
  }
  document.getElementById("runEngine").addEventListener("click",function(){
    var t=document.getElementById("thinking");t.style.display="inline-flex";
    setTimeout(function(){t.style.display="none";SIG.unshift({id:nid++,t:"نمط جديد: ارتفاع تكلفة العلف يسبق ضغط الهامش",s:"ألبان",sev:"warn",open:true});render();toast("اكتشف المحرك إشارة جديدة");},1300);
  });
  document.getElementById("newSignal").addEventListener("click",function(){SIG.unshift({id:nid++,t:"إشارة يدوية جديدة",s:"المجموعة",sev:"info",open:true});render();});
  document.getElementById("bulkResolve").addEventListener("click",function(){SIG.forEach(function(g){g.open=false;});render();toast("حُلّت كل الإشارات");});
  render();
})();