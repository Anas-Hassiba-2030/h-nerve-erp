/* ذكاء الدماغ · Brain IQ — reflect + approve/reject meta-report. */
(function(){
  function ar(n){return String(n).replace(/[0-9]/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d];});}
  function toast(m){var t=document.getElementById("toast");t.textContent="✦ "+m;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2200);}
  document.getElementById("reflect").addEventListener("click",function(){
    var t=document.getElementById("thinking");t.style.display="inline-flex";
    setTimeout(function(){t.style.display="none";var iq=document.getElementById("iqVal");iq.textContent=ar(93);document.getElementById("pending").textContent=ar(2);toast("أنجز الدماغ تأمّلاً جديداً");},1400);
  });
  document.getElementById("approveMeta").addEventListener("click",function(){document.getElementById("pending").textContent="٠";toast("اعتُمد التقرير الذاتي");document.getElementById("metaCard").style.opacity=".6";});
  document.getElementById("rejectMeta").addEventListener("click",function(){document.getElementById("pending").textContent="٠";toast("رُفض التقرير — سيعيد الدماغ التأمّل");});
})();