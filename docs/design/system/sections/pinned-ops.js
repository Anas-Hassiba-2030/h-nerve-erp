(function(){
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2000);}
  var PINS=[
    {t:"أرينا سايس فرح",cat:"فندق",href:"arena.html"},{t:"دفعة جبن فاخر د-١٠٤٢",cat:"دفعة",href:"maha.html"},
    {t:"توصية: توسّع المها",cat:"خطة",href:"plans.html"},{t:"تقرير الأهلية التنفيذي",cat:"تقرير",href:"reports.html"},
    {t:"إشارة: هبوط إيراد التعليم",cat:"إشارة",href:"insights.html"},{t:"مساحة عمل المها",cat:"مساحة",href:"workspace.html"}
  ];
  function render(){
    var el=document.getElementById("pinned");
    if(!PINS.length){el.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:50px;color:var(--ink-muted)"><div style="font-size:40px;opacity:.4">◆</div><div style="font-family:var(--display);font-size:20px;color:var(--ink);margin-top:8px">لا عناصر مثبّتة</div></div>';return;}
    el.innerHTML=PINS.map(function(p,i){
      return '<a class="co-tile" href="'+p.href+'" style="text-decoration:none;position:relative"><span class="ops-tag info">'+p.cat+'</span><div class="co-nm" style="margin-top:10px">'+p.t+'</div><button class="ops-export" data-un="'+i+'" style="margin-top:10px;width:100%;justify-content:center">إلغاء التثبيت</button></a>';
    }).join("");
    el.querySelectorAll("[data-un]").forEach(function(b){b.addEventListener("click",function(e){e.preventDefault();PINS.splice(+b.dataset.un,1);render();toast("أُلغي التثبيت");});});
  }
  render();
})();