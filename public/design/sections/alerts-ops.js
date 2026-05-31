/* التنبيهات · Alerts — rule list + toggle + severity. */
(function(){
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  var RULES=[
    {id:1,t:"هبوط إيراد وحدة > ٢٠٪",sev:"crit",on:true,fired:4},
    {id:2,t:"دفعة ألبان تقترب من الانتهاء",sev:"crit",on:true,fired:12},
    {id:3,t:"إشغال فندق < ٥٠٪",sev:"warn",on:true,fired:6},
    {id:4,t:"رطوبة دفيئة خارج النطاق",sev:"warn",on:true,fired:3},
    {id:5,t:"مؤشر ESG < ٧٠",sev:"info",on:false,fired:0},
    {id:6,t:"تأخّر مرحلة برنامج تعليمي",sev:"info",on:false,fired:2}
  ];
  var rid=7;
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2200);}
  function render(){
    document.getElementById("rules").innerHTML=RULES.map(function(r){
      return '<div class="br-row"><span class="br-chip '+r.sev+'">'+({crit:"حرج",warn:"تحذير",info:"معلومة"}[r.sev])+'</span>'+
        '<div class="rt"><div class="tt">'+r.t+'</div><div class="ts">أُطلقت '+ar(r.fired)+' مرّة</div></div>'+
        '<button class="br-switch '+(r.on?"on":"")+'" data-id="'+r.id+'"></button></div>';
    }).join("");
    document.querySelectorAll(".br-switch").forEach(function(b){b.addEventListener("click",function(){var r=RULES.filter(function(x){return x.id==b.dataset.id;})[0];r.on=!r.on;render();});});
    document.getElementById("kpActive").textContent=ar(RULES.filter(function(r){return r.on;}).length);
  }
  document.getElementById("seedDefaults").addEventListener("click",function(){RULES.forEach(function(r){r.on=true;});render();toast("استُعيدت القواعد الافتراضية");});
  document.getElementById("newRule").addEventListener("click",function(){RULES.unshift({id:rid++,t:"قاعدة تنبيه جديدة",sev:"info",on:true,fired:0});render();});
  render();
})();