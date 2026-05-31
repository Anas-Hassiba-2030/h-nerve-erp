/* الراوي · Narrate — numbers → editorial Arabic prose. */
(function(){
  var TOPICS=[
    {k:"المجموعة",title:"حالة المجموعة",body:"تمضي مجموعة الحوراني في ربعٍ متباين الإيقاع. تتألّق <b>أرينا</b> بإشغالٍ يقارب ثلاثة أرباع طاقتها، بينما تنهض <b>المها</b> بأسرع نموٍّ في المحفظة — أربعةٌ وأربعون بالمئة. في الجهة المقابلة، تتعثّر <b>جامعة عمّان</b> بهبوطٍ حادّ يستدعي إعادة تسعيرٍ عاجلة. الدماغ يرى صورةً واحدة: نموٌّ قويّ تحدّه جيوبُ خطرٍ يجب احتواؤها قبل التوسّع."},
    {k:"الألبان",title:"وحدة الألبان",body:"تقف <b>المها</b> عند مفترقٍ مثمر. الطلب على الأجبان الفاخرة يتصاعد مع اقتراب مؤتمرات الربع الثالث، والخطوط جاهزةٌ للمضاعفة. لكنّ خمس دفعاتٍ تقترب من الانتهاء، تحمل في طيّاتها <b>أربعة عشر ألف لتر</b> معرّضةً للهدر. الحكمة أن نصرّف أوّلاً، ثمّ نتوسّع تدريجياً."},
    {k:"المالية",title:"الصورة المالية",body:"بلغ صافي ربح المجموعة <b>سبعةً وتسعين ألف دينار</b> هذا الشهر، بهامشٍ يناهز الواحد والسبعين بالمئة. الإيراد يصعد، والمصاريف تنحسر بتسعةٍ ونصف بالمئة. غير أنّ تزامن الاستثمارات يضغط التدفّق النقدي — توصية الدماغ: توازنٌ في التوقيت لا في الطموح."}
  ];
  document.getElementById("topics").innerHTML=TOPICS.map(function(t,i){return '<button class="br-btn '+(i===0?"br-btn-primary":"br-btn-ghost")+'" data-i="'+i+'">'+t.k+'</button>';}).join("");
  function show(i){
    var t=TOPICS[i];document.getElementById("narrTitle").textContent=t.title;document.getElementById("narrSub").textContent="بقلم الدماغ · نثر تحريري";
    var body=document.getElementById("narrBody");
    document.querySelectorAll("#topics .br-btn").forEach(function(b,j){b.className="br-btn "+(j===i?"br-btn-primary":"br-btn-ghost");});
    if(matchMedia("(prefers-reduced-motion: reduce)").matches){body.innerHTML=t.body;return;}
    // typewriter-ish fade reveal by sentence
    body.innerHTML="";var html=t.body;var tmp=document.createElement("div");tmp.innerHTML=html;
    body.style.opacity="0";body.innerHTML=html;requestAnimationFrame(function(){body.style.transition="opacity .6s";body.style.opacity="1";});
  }
  document.querySelectorAll("#topics .br-btn").forEach(function(b){b.addEventListener("click",function(){show(+b.dataset.i);});});
  show(0);
})();