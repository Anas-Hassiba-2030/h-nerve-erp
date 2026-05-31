/* الأهلية · Education — programs (stage pipeline) + founding teams. */
(function(){
  Ops.init();
  var STAGES=["فكرة","احتضان","نمو","خروج"];
  var programs=[
    {id:"p1",name:"هندسة البرمجيات",college:"تقنية المعلومات",stage:2},
    {id:"p2",name:"إدارة الأعمال",college:"الأعمال",stage:3},
    {id:"p3",name:"الصيدلة",college:"العلوم الطبية",stage:1},
    {id:"p4",name:"القانون",college:"الحقوق",stage:1},
    {id:"p5",name:"العمارة",college:"الهندسة",stage:0},
  ];
  function pipeline(p){
    return '<div class="stages">'+STAGES.map(function(s,i){
      var cls=i<p.stage?"done":i===p.stage?"active":"";
      return '<div class="stage '+cls+'"><span class="dot"></span><span class="sl">'+s+'</span></div>';
    }).join('')+'</div>';
  }
  function renderPrograms(){
    var wrap=document.getElementById("programsWrap");
    wrap.innerHTML='<div class="ops-toolbar"><h2>البرامج</h2><div class="ops-actions"><button class="ops-add" id="addProg">＋ برنامج جديد</button></div></div>'+
      '<div style="display:flex;flex-direction:column;gap:12px">'+programs.map(function(p){
        return '<div class="panel" style="padding:18px 20px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap">'+
          '<div><div style="font-size:15px;font-weight:700;color:var(--ink)">'+p.name+'</div><div style="font-size:12px;color:var(--ink-muted)">'+p.college+'</div></div>'+
          '<button class="ops-add" data-adv="'+p.id+'" '+(p.stage>=STAGES.length-1?'style="opacity:.4;pointer-events:none"':'')+'>تقديم المرحلة →</button></div>'+
          pipeline(p)+'</div>';
      }).join('')+'</div>';
    wrap.querySelectorAll("[data-adv]").forEach(function(b){
      b.addEventListener("click",function(){
        var p=programs.filter(function(x){return x.id===b.dataset.adv;})[0];
        if(p.stage<STAGES.length-1){ p.stage++; renderPrograms();
          // gold pulse on the newly active dot
          requestAnimationFrame(function(){ var card=document.querySelector('[data-adv="'+p.id+'"]'); });
        }
      });
    });
    var add=document.getElementById("addProg");
    if(add) add.addEventListener("click",function(){ programs.push({id:"p"+(programs.length+1),name:"برنامج جديد",college:"—",stage:0}); renderPrograms(); });
  }
  renderPrograms();

  // founding teams
  var teams=[
    {n:"فريق نُهى",program:"هندسة البرمجيات",lead:"نُهى سالم",stage:"نمو"},
    {n:"فريق وائل",program:"إدارة الأعمال",lead:"وائل قاسم",stage:"خروج"},
    {n:"فريق ريم",program:"الصيدلة",lead:"ريم عادل",stage:"احتضان"},
    {n:"فريق ماجد",program:"العمارة",lead:"ماجد حسن",stage:"فكرة"},
  ];
  var tw=document.getElementById("teamsWrap");
  tw.innerHTML='<div class="ops-toolbar"><h2>الفرق المؤسِّسة</h2></div>'+
    '<div class="ops-portfolio">'+teams.map(function(t){
      return '<div class="co-tile" style="cursor:default"><div class="co-logo">'+t.lead[0]+'</div>'+
        '<div class="co-nm">'+t.n+'</div><div class="co-sec">'+t.program+'</div>'+
        '<div class="co-meta"><span>'+t.lead+'</span><span class="ops-tag info">'+t.stage+'</span></div></div>';
    }).join('')+'</div>';
})();
