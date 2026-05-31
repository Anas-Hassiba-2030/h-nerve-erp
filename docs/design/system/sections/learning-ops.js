/* التعلّم · Learning — patterns toggle/unlearn/delete + learn-now. */
(function(){
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  var PAT=[
    {id:1,t:"مؤتمرات أرينا ترفع طلب الأجبان الفاخرة",conf:88,on:true},
    {id:2,t:"الري بالتنقيط يرفع عائد المحاصيل ١٨٪",conf:81,on:true},
    {id:3,t:"دفعات قرب الانتهاء ترفع خطر الهدر",conf:92,on:true},
    {id:4,t:"تأخّر إعادة التسعير يضرّ إيراد التعليم",conf:76,on:true},
    {id:5,t:"موسم الصيف يرفع إشغال البحر الميت",conf:84,on:false}
  ];
  var pid=6;
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2200);}
  function render(){
    document.getElementById("patterns").innerHTML=PAT.map(function(p){
      return '<div class="br-row"><span class="br-chip '+(p.conf>=85?"ok":p.conf>=75?"warn":"info")+'">ثقة '+ar(p.conf)+'٪</span>'+
        '<div class="rt"><div class="tt">'+p.t+'</div><div class="ts">'+(p.on?"نشط":"مُلغى")+'</div></div>'+
        '<button class="br-switch '+(p.on?"on":"")+'" data-id="'+p.id+'"></button>'+
        '<button class="br-btn danger" data-del="'+p.id+'">حذف</button></div>';
    }).join("");
    document.querySelectorAll(".br-switch").forEach(function(b){b.addEventListener("click",function(){var p=PAT.filter(function(x){return x.id==b.dataset.id;})[0];p.on=!p.on;render();});});
    document.querySelectorAll("[data-del]").forEach(function(b){b.addEventListener("click",function(){PAT=PAT.filter(function(x){return x.id!=b.dataset.del;});render();toast("حُذف النمط");});});
    document.getElementById("kpPatterns").textContent=ar(PAT.filter(function(p){return p.on;}).length);
  }
  document.getElementById("learnNow").addEventListener("click",function(){
    var t=document.getElementById("thinking");t.style.display="inline-flex";
    setTimeout(function(){t.style.display="none";PAT.unshift({id:pid++,t:"نمط جديد: ضغط التبريد يحدّ من سرعة التوسّع",conf:79,on:true});render();toast("تعلّم الدماغ نمطاً جديداً");},1300);
  });
  render();
})();