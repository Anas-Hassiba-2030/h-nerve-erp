(function(){
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2000);}
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  var CON=[
    {id:"stripe",name:"بوابة الدفع",icon:"💳",on:true,usage:1240,errors:0,last:"قبل ٣ د"},
    {id:"maps",name:"الخرائط واللوجستيات",icon:"🗺",on:true,usage:860,errors:2,last:"قبل ١٢ د"},
    {id:"email",name:"البريد والإشعارات",icon:"✉",on:true,usage:3420,errors:0,last:"الآن"},
    {id:"erpx",name:"تكامل ERP خارجي",icon:"🔗",on:false,usage:0,errors:0,last:"—"},
    {id:"bi",name:"منصّة ذكاء الأعمال",icon:"📊",on:false,usage:0,errors:0,last:"—"},
    {id:"weather",name:"خدمة الطقس الزراعي",icon:"🌦",on:true,usage:540,errors:1,last:"قبل ساعة"}
  ];
  function render(){
    document.getElementById("connectors").innerHTML=CON.map(function(c){
      return '<div class="co-tile" style="cursor:default"><div style="display:flex;align-items:center;justify-content:space-between"><div class="co-logo" style="background:rgba(194,163,90,.16);color:var(--gold)">'+c.icon+'</div><span class="ops-tag '+(c.on?"ok":"info")+'">'+(c.on?"متصل":"غير متصل")+'</span></div>'+
        '<div class="co-nm" style="margin-top:10px">'+c.name+'</div>'+
        '<div class="co-meta"><span>استخدام '+ar(c.usage)+'</span><span style="color:'+(c.errors?"#9a5648":"var(--ink-muted)")+'">أخطاء '+ar(c.errors)+'</span></div>'+
        '<div style="font-size:11px;color:var(--ink-muted);margin-top:6px">آخر نشاط: '+c.last+'</div>'+
        (c.on?'<div style="display:flex;gap:8px;margin-top:10px"><input placeholder="مفتاح API" value="sk_live_••••" style="flex:1;background:#fff;border:1px solid var(--line);border-radius:9px;padding:7px 10px;font-family:var(--font-mono,monospace);font-size:11px;outline:none"><button class="ops-export" data-dis="'+c.id+'">فصل</button></div>':'<button class="ops-add" data-con="'+c.id+'" style="width:100%;margin-top:10px;justify-content:center;border:0">اتصل</button>')+'</div>';
    }).join("");
    document.querySelectorAll("[data-con]").forEach(function(b){b.addEventListener("click",function(){CON.filter(function(c){return c.id==b.dataset.con;})[0].on=true;render();toast("تمّ الاتصال");});});
    document.querySelectorAll("[data-dis]").forEach(function(b){b.addEventListener("click",function(){var c=CON.filter(function(c){return c.id==b.dataset.dis;})[0];c.on=false;c.usage=0;render();toast("تمّ الفصل");});});
  }
  render();
})();