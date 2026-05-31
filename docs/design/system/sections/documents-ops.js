/* الوثائق · Documents — drag-drop upload grouped by company. */
(function(){
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2200);}
  var DOCS=[
    {co:"أرينا للضيافة",name:"تقرير الإشغال الفصلي.pdf",meta:"PDF · ٢.٤ م.ب · أمس",committed:true},
    {co:"المها للألبان",name:"سجلّ دفعات الإنتاج.xlsx",meta:"XLSX · ١.١ م.ب · قبل ٣ أيام",committed:true},
    {co:"المها للألبان",name:"شهادات الجودة.pdf",meta:"PDF · ٨٤٠ ك.ب · الأسبوع الماضي",committed:true},
    {co:"الحوراني القابضة",name:"محضر مجلس الإدارة.docx",meta:"DOCX · ٣٢٠ ك.ب · اليوم",committed:false}
  ];
  var COS=["أرينا للضيافة","المها للألبان","لوران الزراعية","جامعة عمّان الأهلية","الحوراني القابضة"];
  function ext(n){ var e=(n.split(".").pop()||"").toLowerCase(); return {pdf:"📕",docx:"📘",xlsx:"📗",png:"🖼",jpg:"🖼",jpeg:"🖼",webp:"🖼"}[e]||"📄"; }
  function render(){
    var groups={}; DOCS.forEach(function(d){ (groups[d.co]=groups[d.co]||[]).push(d); });
    document.getElementById("groups").innerHTML=Object.keys(groups).map(function(co){
      return '<div class="doc-group"><h3>'+co+' <span class="ct">'+ar(groups[co].length)+' وثيقة</span></h3>'+
        groups[co].map(function(d){
          return '<div class="doc"><span class="fic">'+ext(d.name)+'</span><div class="dt"><div class="dn">'+d.name+'</div><div class="dm">'+d.meta+(d.committed?' · مُعتمد':' · بانتظار الاعتماد')+'</div></div>'+
            (d.committed?'<button class="br-btn br-btn-ghost" data-discuss="'+d.name+'">ناقش مع الدماغ</button>':'<button class="br-btn br-btn-primary" data-commit="'+d.name+'">اعتمد</button>')+
            '<button class="br-btn danger" data-del="'+d.name+'">حذف</button></div>';
        }).join("")+'</div>';
    }).join("");
    document.querySelectorAll("[data-commit]").forEach(function(b){b.addEventListener("click",function(){DOCS.filter(function(d){return d.name==b.dataset.commit;})[0].committed=true;render();toast("اعتُمدت الوثيقة — يقرأها الدماغ");});});
    document.querySelectorAll("[data-del]").forEach(function(b){b.addEventListener("click",function(){DOCS=DOCS.filter(function(d){return d.name!=b.dataset.del;});render();toast("حُذفت الوثيقة");});});
    document.querySelectorAll("[data-discuss]").forEach(function(b){b.addEventListener("click",function(){toast("حُوّلت الوثيقة للنقاش مع الدماغ");});});
  }
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  function add(files){
    [].forEach.call(files,function(f){
      var co=COS[Math.floor(Math.random()*COS.length)];
      DOCS.unshift({co:co,name:f.name,meta:(f.name.split(".").pop()||"ملف").toUpperCase()+" · "+ar((f.size/1024|0))+" ك.ب · الآن",committed:false});
    });
    render(); toast("رُفعت "+ar(files.length)+" وثيقة");
  }
  var dz=document.getElementById("dz"), fi=document.getElementById("fileInput");
  dz.addEventListener("click",function(){fi.click();});
  fi.addEventListener("change",function(){ if(fi.files.length) add(fi.files); fi.value=""; });
  ["dragenter","dragover"].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.add("over");});});
  ["dragleave","drop"].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.remove("over");});});
  dz.addEventListener("drop",function(e){ if(e.dataTransfer.files.length) add(e.dataTransfer.files); });
  render();
})();
