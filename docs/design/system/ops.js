/* ════════════════════════════════════════════════════════════════
   H-NERVE · OPERATIONS engine (shared). Generic, declarative.
   A page defines window.OPS_TABS (tab list) and calls Ops.table(cfg)
   per data table. Handles tab switching, CRUD, status-cycle, search,
   inline create form, export (CSV), and a shared detail drawer.
   ════════════════════════════════════════════════════════════════ */
window.Ops = (function(){
  function ar(n){ return String(n).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }
  function L(s){ return (window.HNi18n&&HNi18n.tr)?HNi18n.tr(s):s; }
  function esc(s){ var e=document.createElement("div"); e.textContent=(s==null?"":s); return e.innerHTML; }

  // ── tabs ──
  function tabs(){
    var bar=document.querySelector(".ops-tabs"); if(!bar) return;
    bar.addEventListener("click",function(e){
      var t=e.target.closest(".ops-tab"); if(!t) return;
      bar.querySelectorAll(".ops-tab").forEach(function(x){x.classList.remove("on");}); t.classList.add("on");
      document.querySelectorAll(".ops-panel").forEach(function(p){ p.classList.toggle("on", p.dataset.panel===t.dataset.tab); });
    });
  }

  // ── shared drawer ──
  function drawer(){
    if(document.querySelector(".ops-drawer")) return;
    var bd=document.createElement("div"); bd.className="ops-backdrop";
    var dr=document.createElement("aside"); dr.className="ops-drawer";
    document.body.appendChild(bd); document.body.appendChild(dr);
    bd.addEventListener("click",closeDrawer);
    addEventListener("keydown",function(e){ if(e.key==="Escape") closeDrawer(); });
  }
  function openDrawer(html){
    drawer();
    var dr=document.querySelector(".ops-drawer"), bd=document.querySelector(".ops-backdrop");
    dr.innerHTML='<button class="dr-close">×</button>'+html;
    dr.querySelector(".dr-close").addEventListener("click",closeDrawer);
    dr.classList.add("open"); bd.classList.add("open");
  }
  function closeDrawer(){ var dr=document.querySelector(".ops-drawer"),bd=document.querySelector(".ops-backdrop"); if(dr)dr.classList.remove("open"); if(bd)bd.classList.remove("open"); }

  // ── generic CRUD table ──
  // cfg: { mount, cols:[{key,label,cls,render,tag}], rows:[...], statusKey, statusCycle:[{v,label,tag}],
  //        searchKeys:[], form:[{key,label,type,options,def}], drawer:fn(row)->html, title, aside }
  function table(cfg){
    var mount=document.querySelector(cfg.mount); if(!mount) return;
    var rows=cfg.rows.slice(); var query="";
    var gridCols=cfg.cols.map(function(c){return c.w||"1fr";}).join(" ");

    mount.innerHTML=
      '<div class="ops-toolbar"><h2>'+esc(L(cfg.title))+'</h2><div class="ops-actions">'+
        '<input class="ops-search" placeholder="'+esc(L("بحث…"))+'">'+
        (cfg.form?'<button class="ops-add">＋ '+esc(L(cfg.addLabel||"جديد"))+'</button>':'')+
        '<button class="ops-export">⬇ تصدير</button>'+
      '</div></div>'+
      '<div class="ops-table"></div>';
    var tableEl=mount.querySelector(".ops-table");
    var searchEl=mount.querySelector(".ops-search");
    searchEl.addEventListener("input",function(){ query=searchEl.value.toLowerCase(); render(); });
    mount.querySelector(".ops-export").addEventListener("click",function(){ exportCsv(cfg,rows); });
    if(cfg.form){ mount.querySelector(".ops-add").addEventListener("click",toggleForm); }

    function header(){
      var h='<div class="ops-tr head" style="grid-template-columns:'+gridCols+'">';
      cfg.cols.forEach(function(c){ h+='<span class="ops-cell '+(c.cls||"")+'">'+esc(L(c.label))+'</span>'; });
      return h+'</div>';
    }
    function formRow(){
      if(!cfg.form) return "";
      var f='<div class="ops-form hidden" style="grid-template-columns:'+gridCols+'">';
      cfg.cols.forEach(function(c){
        var fld=cfg.form.filter(function(x){return x.key===c.key;})[0];
        if(!fld){ f+='<span></span>'; return; }
        if(fld.type==="select"){ f+='<select data-k="'+fld.key+'">'+fld.options.map(function(o){return '<option value="'+o.v+'">'+esc(o.label)+'</option>';}).join('')+'</select>'; }
        else f+='<input data-k="'+fld.key+'" placeholder="'+esc(fld.label)+'" value="'+esc(fld.def||"")+'">';
      });
      return f+'</div>';
    }
    function render(){
      var html=header()+formRow();
      var vis=rows.filter(function(r){ if(!query)return true; return (cfg.searchKeys||[]).some(function(k){ return String(r[k]||"").toLowerCase().indexOf(query)>=0; }); });
      vis.forEach(function(r){
        html+='<div class="ops-tr row" data-id="'+r._id+'" style="grid-template-columns:'+gridCols+'">';
        cfg.cols.forEach(function(c){
          var val;
          if(c.render) val=c.render(r);
          else if(c.tag){ var st=statusInfo(cfg,r); val='<span class="ops-tag ops-status '+st.tag+'" data-status>'+esc(L(st.label))+'</span>'; }
          else val=esc(r[c.key]);
          html+='<span class="ops-cell '+(c.cls||"")+'">'+val+'</span>';
        });
        html+='<button class="ops-del" title="حذف">🗑</button></div>';
      });
      if(!vis.length){ html+='<div class="ops-empty">'+(query?'<div class="oe-ic">⌕</div><div class="oe-t">لا نتائج مطابقة</div><div class="oe-s">جرّب بحثاً آخر</div>':'<div class="oe-ic">'+(cfg.emptyIcon||"◇")+'</div><div class="oe-t">'+(cfg.emptyTitle||"لا عناصر بعد")+'</div><div class="oe-s">'+(cfg.emptySub||"ابدأ بإضافة أوّل عنصر")+'</div>'+(cfg.form?'<button class="ops-add" id="oeAdd">＋ '+esc(cfg.addLabel||"جديد")+'</button>':''))+'</div>'; }
      tableEl.innerHTML=html;
      var oeAdd=tableEl.querySelector("#oeAdd"); if(oeAdd) oeAdd.addEventListener("click",toggleForm);
      // wire form
      var form=tableEl.querySelector(".ops-form");
      if(form){ form.querySelectorAll("input").forEach(function(i){ i.addEventListener("keydown",function(e){ if(e.key==="Enter")saveForm(); if(e.key==="Escape")form.classList.add("hidden"); }); }); }
      // wire rows
      tableEl.querySelectorAll(".ops-tr.row").forEach(function(tr){
        var r=byId(tr.dataset.id);
        tr.addEventListener("click",function(e){
          if(e.target.closest(".ops-del")){ rows=rows.filter(function(x){return x!==r;}); render(); return; }
          if(e.target.closest("[data-status]")){ cycle(r); render(); return; }
          if(cfg.drawer) openDrawer(cfg.drawer(r));
        });
      });
    }
    function byId(id){ return rows.filter(function(r){return String(r._id)===String(id);})[0]; }
    function cycle(r){
      if(!cfg.statusCycle) return;
      var vals=cfg.statusCycle.map(function(s){return s.v;});
      var i=vals.indexOf(r[cfg.statusKey]); r[cfg.statusKey]=vals[(i+1)%vals.length];
    }
    function toggleForm(){ var f=tableEl.querySelector(".ops-form"); if(!f)return; f.classList.toggle("hidden"); if(!f.classList.contains("hidden")){ var i=f.querySelector("input"); if(i)i.focus(); } else return; }
    function saveForm(){
      var f=tableEl.querySelector(".ops-form"); if(!f)return;
      var obj={_id:"n"+Date.now()};
      f.querySelectorAll("[data-k]").forEach(function(el){ obj[el.dataset.k]=el.value; });
      cfg.form.forEach(function(fld){ if(obj[fld.key]===undefined||obj[fld.key]==="") obj[fld.key]=fld.def||""; });
      if(cfg.onCreate) cfg.onCreate(obj);
      rows.unshift(obj); render();
    }
    render();
    if(window.HNi18n&&HNi18n.onChange) HNi18n.onChange(function(){ render(); });
    return { rerender:render, getRows:function(){return rows;} };
  }
  function statusInfo(cfg,r){
    var s=(cfg.statusCycle||[]).filter(function(x){return x.v===r[cfg.statusKey];})[0];
    return s||{label:r[cfg.statusKey]||"—",tag:"info"};
  }
  function exportCsv(cfg,rows){
    var keys=cfg.cols.map(function(c){return c.key;}).filter(Boolean);
    var lines=[keys.join(",")].concat(rows.map(function(r){return keys.map(function(k){return '"'+String(r[k]==null?"":r[k]).replace(/"/g,'""')+'"';}).join(",");}));
    var blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
    var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(cfg.title||"export")+".csv"; a.click();
  }

  function init(){ tabs(); drawer(); }
  return { init:init, table:table, openDrawer:openDrawer, ar:ar, esc:esc };
})();
