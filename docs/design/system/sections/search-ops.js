(function(){
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  var DATA=[
    {t:"أرينا سايس فرح",cat:"فندق",href:"arena.html"},{t:"أرينا البحر الميت",cat:"فندق",href:"arena.html"},
    {t:"غرفة ديلوكس ١٢٠٤",cat:"غرفة",href:"arena.html"},{t:"حجز · الاتحاد للمؤتمرات",cat:"حجز",href:"arena.html"},
    {t:"دفعة جبن فاخر د-١٠٤٢",cat:"دفعة",href:"maha.html"},{t:"المها للألبان",cat:"شركة",href:"maha.html"},
    {t:"مزرعة الأغوار",cat:"مزرعة",href:"loran.html"},{t:"محصول الطماطم",cat:"محصول",href:"loran.html"},
    {t:"لوران الزراعية",cat:"شركة",href:"loran.html"},{t:"جامعة عمّان الأهلية",cat:"شركة",href:"ahliyya.html"},
    {t:"برنامج هندسة البرمجيات",cat:"برنامج",href:"ahliyya.html"},{t:"تنبؤ توريد لوران ← أرينا",cat:"تنبؤ",href:"supply.html"}
  ];
  var cats=["الكل"].concat(DATA.map(function(d){return d.cat;}).filter(function(v,i,a){return a.indexOf(v)===i;}));
  var cat="",q="";
  document.getElementById("pills").innerHTML=cats.map(function(c,i){return '<button class="pill'+(i===0?" on":"")+'" data-c="'+(i===0?"":c)+'" style="padding:6px 13px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--ui);border:1px solid var(--line);background:'+(i===0?"linear-gradient(135deg,var(--emerald-soft),var(--emerald))":"var(--cream)")+';color:'+(i===0?"#fff":"var(--ink-muted)")+'">'+c+'</button>';}).join("");
  function render(){
    var res=DATA.filter(function(d){return (!cat||d.cat===cat)&&(!q||d.t.indexOf(q)>=0);});
    document.getElementById("results").innerHTML=q||cat? (res.length?res.map(function(d){
      return '<a class="br-row" href="'+d.href+'" style="background:var(--cream);border-color:var(--line);text-decoration:none"><span class="ops-tag info">'+d.cat+'</span><div class="rt"><div class="tt" style="color:var(--ink)">'+d.t+'</div></div><span class="go" style="color:var(--gold)">←</span></a>';
    }).join("") : '<div style="text-align:center;padding:40px;color:var(--ink-muted)">لا نتائج مطابقة</div>') : '<div style="text-align:center;padding:40px;color:var(--ink-muted);opacity:.6">اكتب للبحث عبر كل الكيانات</div>';
  }
  document.getElementById("q").addEventListener("input",function(e){q=e.target.value;render();});
  document.querySelectorAll("#pills .pill").forEach(function(p){p.addEventListener("click",function(){document.querySelectorAll("#pills .pill").forEach(function(x){x.style.background="var(--cream)";x.style.color="var(--ink-muted)";});p.style.background="linear-gradient(135deg,var(--emerald-soft),var(--emerald))";p.style.color="#fff";cat=p.dataset.c;render();});});
  render();
})();