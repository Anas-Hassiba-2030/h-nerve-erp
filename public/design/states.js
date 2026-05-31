/* ════════════════════════════════════════════════════════════════
   H-NERVE · STATES (shared, global, self-mounting)
   - Brief loading skeleton on entry (auto-dismisses on content ready)
   - window.HNState.empty(el, {art,title,sub,cta,onCta})
   - window.HNState.error(el, {title,sub,onRetry})
   ════════════════════════════════════════════════════════════════ */
(function(){
  if(window.HNState) return;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── loading skeleton ──
  function mountSkeleton(){
    if(document.getElementById("hn-skeleton")) return;
    var sk=document.createElement("div"); sk.id="hn-skeleton"; sk.setAttribute("aria-hidden","true");
    sk.innerHTML=
      '<div class="hn-sk hn-sk-ribbon"></div>'+
      '<div class="hn-sk-row"><div class="hn-sk hn-sk-kpi"></div><div class="hn-sk hn-sk-kpi"></div><div class="hn-sk hn-sk-kpi"></div><div class="hn-sk hn-sk-kpi"></div></div>'+
      '<div class="hn-sk hn-sk-wide"></div>';
    (document.body||document.documentElement).appendChild(sk);
    var dismiss=function(){ sk.classList.add("gone"); setTimeout(function(){ if(sk.parentNode) sk.remove(); },500); };
    // dismiss when DOM is ready + a short, dignified beat (or immediately under reduced-motion)
    var delay=reduce?120:520;
    if(document.readyState==="complete") setTimeout(dismiss,delay);
    else addEventListener("load",function(){ setTimeout(dismiss,delay); });
    // safety: never hang
    setTimeout(dismiss,2200);
  }
  // skeleton only on full section pages (those with a known content host)
  if(document.querySelector(".wrap,.br-wrap,.ms-wrap,.tk-wrap,.ib-wrap,.em-wrap,.ml-wrap,.co-wrap,.wi-wrap,#co-main")){
    if(document.body) mountSkeleton(); else addEventListener("DOMContentLoaded",mountSkeleton);
  }

  // ── empty state ──
  function empty(host, o){
    o=o||{}; if(typeof host==="string") host=document.querySelector(host); if(!host) return;
    var art=o.art||'<svg viewBox="0 0 64 64" fill="none" class="hn-emp-art"><circle cx="32" cy="32" r="26" stroke="#C2A35A" stroke-width="1.4" opacity=".5"/><path d="M22 34c4 5 16 5 20 0" stroke="#C2A35A" stroke-width="1.6" stroke-linecap="round"/><circle cx="24" cy="27" r="2" fill="#C2A35A"/><circle cx="40" cy="27" r="2" fill="#C2A35A"/></svg>';
    var html='<div class="hn-empty">'+art+
      '<div class="hn-emp-t">'+(o.title||"لا عناصر بعد")+'</div>'+
      '<div class="hn-emp-s">'+(o.sub||"ابدأ بإضافة أول عنصر — سيظهر هنا فور إنشائه.")+'</div>'+
      (o.cta?'<button class="hn-emp-cta">＋ '+o.cta+'</button>':'')+'</div>';
    host.innerHTML=html;
    if(o.cta&&o.onCta) host.querySelector(".hn-emp-cta").addEventListener("click",o.onCta);
  }

  // ── error state ──
  function error(host, o){
    o=o||{}; if(typeof host==="string") host=document.querySelector(host); if(!host) return;
    host.innerHTML='<div class="hn-error"><div class="hn-err-ic">⚠</div>'+
      '<div class="hn-err-t">'+(o.title||"تعذّر تحميل البيانات")+'</div>'+
      '<div class="hn-err-s">'+(o.sub||"حدث خطأ مؤقّت. حاول مرة أخرى.")+'</div>'+
      (o.onRetry?'<button class="hn-err-retry">إعادة المحاولة</button>':'')+'</div>';
    if(o.onRetry) host.querySelector(".hn-err-retry").addEventListener("click",o.onRetry);
  }

  window.HNState={ empty:empty, error:error };
})();
