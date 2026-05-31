(function(){
  Ops.init();
  Ops.table({mount:"#p_audit",title:"سجلّ التدقيق",searchKeys:["entity","action","user"],
    rows:[
      {_id:1,entity:"حجز · أرينا سايس فرح",action:"إنشاء",user:"سامر العقل",time:"٩:٤٢"},
      {_id:2,entity:"دفعة · د-١٠٤٢",action:"تغيير حالة → جاهز",user:"رزان نبيل",time:"٩:٣٠"},
      {_id:3,entity:"برنامج · العمارة",action:"تقديم مرحلة",user:"رامي خليل",time:"٨:٥٥"},
      {_id:4,entity:"إشارة · هبوط إيراد",action:"حلّ",user:"ليان حسيبة",time:"٨:٤٠"},
      {_id:5,entity:"شركة · المها",action:"تحديث",user:"أنس الحوراني",time:"٨:١٢"},
      {_id:6,entity:"تنبؤ · توريد لوران",action:"اعتماد",user:"خالد فرح",time:"أمس"}
    ],
    cols:[{key:"entity",label:"الكيان",cls:"name",w:"1.8fr"},{key:"action",label:"الإجراء",w:"1.4fr"},{key:"user",label:"المستخدم",w:"1.2fr"},{key:"time",label:"الوقت",cls:"num",w:".8fr"}]});
  Ops.table({mount:"#p_activity",title:"سجلّ النشاط",searchKeys:["action","user","type"],
    rows:[
      {_id:1,type:"إنشاء",action:"حجز جديد · أرينا",user:"سامر",time:"٩:٤٢"},
      {_id:2,type:"تحديث",action:"تعديل دفعة ألبان",user:"رزان",time:"٩:٣٠"},
      {_id:3,type:"حذف",action:"إزالة قاعدة تنبيه",user:"فادي",time:"٩:١٠"},
      {_id:4,type:"استعادة",action:"استرجاع مشروع",user:"أنس",time:"٨:٥٠"},
      {_id:5,type:"دخول",action:"تسجيل دخول",user:"ليان",time:"٨:٠٠"},
      {_id:6,type:"تصدير",action:"تصدير تقرير ESG",user:"هدى",time:"أمس"}
    ],
    cols:[{key:"type",label:"النوع",w:".8fr",render:function(r){var m={"إنشاء":"ok","تحديث":"info","حذف":"crit","استعادة":"warn","دخول":"info","تصدير":"ok"};return '<span class="ops-tag '+(m[r.type]||"info")+'">'+r.type+'</span>';}},{key:"action",label:"الإجراء",cls:"name",w:"2fr"},{key:"user",label:"المستخدم",w:"1fr"},{key:"time",label:"الوقت",cls:"num",w:".8fr"}]});
})();