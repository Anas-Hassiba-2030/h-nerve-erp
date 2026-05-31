/* صندوق الوارد · Inbox — unified attention feed. */
(function(){
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ar(n){ return String(n).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }

  var TYPES={ brain:{ic:"🧠",lbl:"إشارة من الدماغ"}, alert:{ic:"⚠",lbl:"تنبيه"}, task:{ic:"✅",lbl:"مهمة"}, msg:{ic:"💬",lbl:"رسالة"} };
  var ITEMS=[
    {type:"alert",t:"هبوط إيراد جامعة عمّان -٦٤٪",p:"إشارة حرجة · آخر ١٤ يوم",chip:"تعليم",tm:"٣ س",href:"ahliyya.html"},
    {type:"brain",t:"توصية: توسّع تدريجي لإنتاج المها",p:"المجلس أنهى النقاش · ثقة ٨٤٪",chip:"العقل",tm:"٢ س",href:"council.html"},
    {type:"alert",t:"٤ دفعات ألبان قرب الانتهاء (14,508 L)",p:"خلال ٧٢ ساعة",chip:"ألبان",tm:"٢ س",href:"maha.html"},
    {type:"task",t:"اعتماد توسّع إنتاج المها للربع الثالث",p:"مُسند إليك · أولوية عالية",chip:"مهامي",tm:"١ س",href:"tasks.html"},
    {type:"msg",t:"ليان حسيبة",p:"أرفقت لك ملخّص التدفّق النقدي.",chip:"مالية",tm:"٤٠ د",href:"messages.html"},
    {type:"brain",t:"توقّع: طماطم وخيار من لوران للمطابخ",p:"جسر توريد داخلي · ٦٢٠ كغ",chip:"زراعة",tm:"٣٠ د",href:"loran.html"},
    {type:"msg",t:"سامر العقل",p:"إشغال البحر الميت ٧٨٪ هذا الأسبوع.",chip:"ضيافة",tm:"١٢ د",href:"messages.html"},
  ];
  var filter="all", query="";
  var feed=document.getElementById("feed");

  function visible(it){
    if(filter!=="all"&&it.type!==filter) return false;
    if(query){ var h=(it.t+" "+it.p+" "+it.chip).toLowerCase(); if(h.indexOf(query.toLowerCase())<0) return false; }
    return true;
  }
  function render(markNew){
    feed.innerHTML="";
    var vis=ITEMS.filter(visible);
    vis.forEach(function(it,i){
      var a=document.createElement("a"); a.className="item"+(markNew&&i===0?" new":""); a.href=it.href;
      a.innerHTML='<span class="tic '+it.type+'">'+TYPES[it.type].ic+'</span>'+
        '<div class="ibody"><div class="it">'+esc(it.t)+'</div><div class="ip">'+esc(it.p)+'</div></div>'+
        '<span class="chip">'+it.chip+'</span><span class="tm">'+it.tm+'</span><span class="go">←</span>';
      feed.appendChild(a);
    });
    document.getElementById("empty").classList.toggle("show", vis.length===0);
    document.getElementById("kp_need").textContent=ar(ITEMS.filter(function(x){return x.type==="alert"||x.type==="brain";}).length+ITEMS.filter(function(x){return x.type==="task";}).length);
  }
  function esc(s){ var e=document.createElement("div"); e.textContent=s; return e.innerHTML; }

  document.querySelectorAll(".ib-pills .pill").forEach(function(p){
    p.addEventListener("click",function(){ document.querySelectorAll(".ib-pills .pill").forEach(function(x){x.classList.remove("on");}); p.classList.add("on"); filter=p.dataset.f; render(); });
  });
  document.getElementById("search").addEventListener("input",function(e){ query=e.target.value; render(); });

  render();

  // SOUL: a new brain signal arrives live after a beat, ticking the KPI up
  if(!reduce){
    setTimeout(function(){
      ITEMS.unshift({type:"brain",t:"إشارة جديدة: ارتفاع طلب الأجبان الفاخرة",p:"الدماغ رصد نمطاً موسمياً مبكراً",chip:"العقل",tm:"الآن",href:"council.html"});
      if(filter==="all"||filter==="brain"){ render(true); }
      var k=document.getElementById("kp_need"); k.style.transition="transform .3s"; k.style.transform="scale(1.2)"; k.style.color="var(--gold-soft)";
      setTimeout(function(){ k.style.transform="scale(1)"; k.style.color="#fff"; },400);
    }, 4200);
  }
})();
