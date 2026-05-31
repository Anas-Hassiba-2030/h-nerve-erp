/* ════════════════════════════════════════════════════════════════
   H-NERVE · CANONICAL DATA SOURCE (single source of truth).
   Every section reads from window.GROUP. A figure here is THE figure
   everywhere it appears — dashboard, analytics, holding, workspace,
   group strip, and the company worlds all reconcile to this.
   Realistic: Arabic names, Jordanian cities, JOD figures, May 2026.
   ════════════════════════════════════════════════════════════════ */
window.GROUP = {
  asOf:"٣٠ أيار ٢٠٢٦",
  group:{ revenue:192335, expenses:39822, net:152513, margin:71, esg:75, brainIQ:92, equities:1.44, pipeline:39.6 },
  // canonical per-company figures (rev = JOD, last 30 days)
  companies:[
    {id:"arena",logo:"أ",name:"أرينا للضيافة",sector:"ضيافة",city:"عمّان",lead:"سامر العقل",
      rev:88210,prevRev:79400,margin:42,esg:78,growth:11,footprint:64,iq:88,
      months:[52,54,58,55,62,66,70,68,74,80,84,88],
      ops:{label:"الإشغال",value:"٧١٪",detail:"٤٩٧ / ٧٠٠ غرفة · ٧ فنادق"}},
    {id:"ahliyya",logo:"ع",name:"جامعة عمّان الأهلية",sector:"تعليم",city:"عمّان",lead:"د. رامي خليل",
      rev:55216,prevRev:155264,margin:100,esg:82,growth:-64,footprint:48,iq:76,
      months:[120,118,140,135,150,148,90,72,66,60,57,55],
      ops:{label:"الطلبة",value:"٨٬٤٢٠",detail:"٥ برامج · هبوط إيراد ٦٤٪"}},
    {id:"maha",logo:"م",name:"المها للألبان",sector:"ألبان",city:"إربد",lead:"رزان نبيل",
      rev:31540,prevRev:21840,margin:38,esg:71,growth:44,footprint:55,iq:84,
      months:[18,20,19,22,24,21,26,28,30,34,38,42],
      ops:{label:"الإنتاج ٣٠ي",value:"١٤٬٥٠٨ ل",detail:"٤ دفعات قرب الانتهاء"}},
    {id:"loran",logo:"ل",name:"لوران الزراعية",sector:"زراعة",city:"وادي الأردن",lead:"خالد فرح",
      rev:17369,prevRev:16080,margin:29,esg:69,growth:8,footprint:38,iq:79,
      months:[12,14,13,16,15,18,17,19,18,20,19,21],
      ops:{label:"المزارع",value:"٣",detail:"الأغوار · عمّان · المفرق"}},
    {id:"cash",logo:"خ",name:"نقد واستثمار",sector:"خزينة",city:"عمّان",lead:"ليان حسيبة",
      rev:0,prevRev:0,margin:0,esg:88,growth:12,footprint:20,iq:88,
      months:[10,11,10,12,11,13,12,14,13,15,14,16],
      ops:{label:"خط الاستثمار",value:"٣٩.٦M",detail:"فرص نشطة"}},
  ],
  // people referenced across Messages, Team, Tasks, Audit, Workspace
  people:[
    {name:"أنس الحوراني",role:"رئيس مجلس الإدارة",unit:"المجموعة",rank:"♚",xp:2640},
    {name:"ليان حسيبة",role:"المديرة المالية",unit:"مالية",rank:"♛",xp:1840},
    {name:"سامر العقل",role:"مدير عمليات أرينا",unit:"ضيافة",rank:"♜",xp:1320},
    {name:"د. رامي خليل",role:"عميد الأهلية",unit:"تعليم",rank:"♜",xp:1180},
    {name:"رزان نبيل",role:"مديرة إنتاج المها",unit:"ألبان",rank:"♞",xp:920},
    {name:"خالد فرح",role:"مهندس لوران الزراعي",unit:"زراعة",rank:"♞",xp:870},
  ],
  cities:["عمّان","إربد","الزرقاء","العقبة","البحر الميت","جرش","المفرق","وادي الأردن","مادبا","السلط"],
  // canonical brain insights — each references a real figure above
  insights:[
    {sev:"crit",sector:"تعليم",text:"هبوط إيراد جامعة عمّان الأهلية ٦٤٪ (٥٥٬٢١٦ مقابل ١٥٥٬٢٦٤ دينار)"},
    {sev:"crit",sector:"ألبان",text:"٤ دفعات ألبان قرب الانتهاء — ١٤٬٥٠٨ لتر معرّضة للهدر خلال ٧٢ ساعة"},
    {sev:"warn",sector:"ضيافة",text:"إشغال أرينا ٧١٪ فوق المعدل الموسمي — مراجعة التسعير موصى بها"},
    {sev:"info",sector:"ألبان",text:"المها أسرع وحدة نموّاً ‎+٤٤٪‎ (٣١٬٥٤٠ دينار) — توسّع تدريجي مقترح"},
    {sev:"ok",sector:"المجموعة",text:"مؤشر ESG عند ٧٥/١٠٠ ضمن النطاق المستهدف"},
  ],
  sectorColors:{"ضيافة":"#C2A35A","تعليم":"#7E9B86","ألبان":"#2E6B57","زراعة":"#A88A4A","خزينة":"#5a7d6e"},
  MONTHS:["ك٢","شب","آذ","نيس","أيا","حز","تم","آب","أيل","تش١","تش٢","ك١"]
};
