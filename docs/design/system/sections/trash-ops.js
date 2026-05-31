(function(){
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2000);}
  var TRASH=[
    {id:1,t:"حجز ملغى · أرينا جرش",cat:"حجز",days:3,expired:false,sel:false},
    {id:2,t:"قاعدة تنبيه قديمة",cat:"قاعدة",days:12,expired:false,sel:false},
    {id:3,t:"دفعة تالفة د-٠٩٨",cat:"دفعة",days:31,expired:true,sel:false},
    {id:4,t:"مشروع مؤجّل · توسعة العقبة",cat:"مشروع",days:8,expired:false,sel:false},
    {id:5,t:"مستخدم معطّل",cat:"مستخدم",days:33,expired:true,sel:false}
  ];
  function render(){
    var list=document.getElementById("trashList");
    document.getElementById("trashEmpty").style.display=TRASH.length?"none":"block";
    list.innerHTML=TRASH.map(function(r){
      return '<div class="br-row" style="background:var(--cream);border-color:var(--line)"><button class="chk'+(r.sel?" on":"")+'" data-sel="'+r.id+'" style="width:18px;height:18px;border-radius:6px;border:1.5px solid var(--line);background:'+(r.sel?"var(--gold)":"none")+';cursor:pointer;color:#241b06">'+(r.sel?"✓":"")+'</button><span class="ops-tag '+(r.expired?"crit":"info")+'">'+r.cat+'</span><div class="rt"><div class="tt" style="color:var(--ink)">'+r.t+'</div><div class="ts">محذوف منذ '+ar(r.days)+' يوماً'+(r.expired?' · منتهٍ':'')+'</div></div><button class="ops-add" data-res="'+r.id+'" style="border:0">استعد</button><button class="ops-export" data-purge="'+r.id+'">حذف نهائي</button></div>';
    }).join("");
    list.querySelectorAll("[data-sel]").forEach(function(b){b.addEventListener("click",function(){var r=TRASH.filter(function(x){return x.id==b.dataset.sel;})[0];r.sel=!r.sel;render();});});
    list.querySelectorAll("[data-res]").forEach(function(b){b.addEventListener("click",function(){TRASH=TRASH.filter(function(x){return x.id!=b.dataset.res;});render();toast("استُعيد العنصر");});});
    list.querySelectorAll("[data-purge]").forEach(function(b){b.addEventListener("click",function(){TRASH=TRASH.filter(function(x){return x.id!=b.dataset.purge;});render();toast("حُذف نهائياً");});});
  }
  document.getElementById("restoreAll").addEventListener("click",function(){TRASH=TRASH.filter(function(x){return !x.sel;});render();toast("استُعيد المحدّد");});
  document.getElementById("purgeSel").addEventListener("click",function(){TRASH=TRASH.filter(function(x){return !x.sel;});render();toast("حُذف المحدّد نهائياً");});
  document.getElementById("purgeExpired").addEventListener("click",function(){TRASH=TRASH.filter(function(x){return !x.expired;});render();toast("مُسحت العناصر المنتهية");});
  render();
})();