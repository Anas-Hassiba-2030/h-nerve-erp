# مجموعة الحوراني — verified entity profile

Researched 2026-07-22 from **public sources only**. Every fact below carries a
source. This document exists because the seed data was built on assumptions, and
three of them turned out to be **wrong**.

## Reading the confidence labels

- **CONFIRMED** — published by the group itself (juico.com) or the entity's own
  site. Confirmed as *the group's published claim*, not independently audited.
- **INDEPENDENT** — corroborated outside the group (Amman Stock Exchange,
  Wikipedia).
- **UNVERIFIED** — no published evidence found. Never seed these.

---

## ⚠️ Three corrections to what the system currently believes

| System said | Reality | Source |
|---|---|---|
| **لوران / Loran = crop farms** | **WRONG.** Loran (est. 2019) is an **animal-feed / fodder** company — it imports clover (برسيم), straw (قش), and silage (سيلاج), and grows *fodder* crops. There are no published Loran food-crop farms. The group's real farm asset is a **dairy-cattle farm at الحلابات، الزرقاء**, owned by a *different* entity. | [juico.com/Loran](http://juico.com/Loran%20Livestock%20Investment.php), [baladna.com.jo/farm](https://www.baladna.com.jo/index.php/index/index/farm/) |
| **حاضنة التانك / The Tank = Hourani education arm** | **UNVERIFIED — remove.** "The Tank" is **Umniah's** (telecom) incubator, est. 2014. It appears nowhere among the group's companies. AAU's own incubator is *حاضنة الأعمال* under *مركز الابتكار والريادة*. The genuine Hourani–Umniah link is an **award** ("جائزة د. أحمد الحوراني للتميّز"), not an incubator. | [umniah.com/the-tank](https://www.umniah.com/the-tank/), [juico.com/Education](http://juico.com/Education.php) |
| **Dairy = المها only** | **INCOMPLETE.** There are **two** dairy companies. The second is **شركة الألبان الدنماركية الأردنية (DJD)**, consumer brand **بلدنا / Baladna**, plant at **عين الباشا**, 60+ products. | [baladna.com.jo](https://www.baladna.com.jo/) |

Two whole verticals were also missing: **Real Estate** and **Security & Protection**.

---

## The parent

| | |
|---|---|
| Arabic | **الشركة الأردنية المتحدة للاستثمار** |
| English | **United Jordanian Company for Investment (JUICO)** |
| Trade name | مجموعة الحوراني / Hourani Group |
| Founded | **1979** (first company) |
| Employees | **3,000+** group-wide (self-reported) |
| Sectors | **7** |
| Companies | claims **14**; only ~**11** are individually named |

⚠️ The English legal name is **inconsistent on the group's own site** (four
variants). Use the Arabic as canonical.

⚠️ **Site template bug:** every company card on juico.com prints
`Location: Amman-Jordan`, *including the three Bulgarian hotels and Al-Maha
(whose real plant is in Ruseifeh, Zarqa)*. Real locations come from the prose,
not that field. Our seed data must not inherit this bug.

---

## 1 · Hospitality — 5 hotels, 3 of them in Bulgaria

| Hotel | Location | ★ | Rooms |
|---|---|---|---|
| فندق موفنبيك عمان — Mövenpick Hotel Amman | West Amman | 5 | **218** (200 + 18 suites) |
| فندق أرينا سبيس — Arena Space Hotel | Gardens St., Amman | 4 | **142** |
| فندق سموليان — Smolyani Hotel | **Smolyan, Bulgaria** | 5 | ~**102** |
| فندق أتلانتيك — Atlantic Hotel | **Varna, Bulgaria** (beachfront) | 4 | **97** (89 + 8 apts) |
| زدرافيتس — Zdravets Wellness & Spa | **Velingrad, Bulgaria** | 4 | **85** |

**Owning entities** (the companies, not the hotels):
شركة الشرق للفنادق والمشاريع السياحية (owns Mövenpick Amman) ·
شركة الأرينا للاستثمار الفندقي والسياحي (Arena Space) ·
شركة فنادق الأرينا المحدودة، صوفيا (the three Bulgarian hotels).

> **Modelling note:** the group owns the **property company**. *Mövenpick* is
> the Accor operator brand — never seed "Mövenpick" as a Hourani subsidiary.

## 2 · Dairy & food — two companies

**شركة الألبان الأردنية (المها) — The Jordanian Dairy Company, brand Al-Maha**
Founded **1968**. Plant at **الرصيفة، الزرقاء**. **Public shareholding company
listed on the Amman Stock Exchange, ticker `JODA`** — INDEPENDENT. ~12% market
share, 39 distribution vehicles, 3,500+ Holstein Friesian.
Three plants: **dairy**, **plastics** (polystyrene packaging — first in Jordan
with printed SLIF film), **water bottling** (Al-Maha brand).
Catalogue: **~68 SKUs** — cheeses 19, dairy 14, labaneh 12, diet 9, mineral
water 5, flavoured milk 4, shaneena 2, milk 1, yoghurt 1, sheep's laban 1.

> ⚠️ Dr. Ahmad Hourani holds *the largest share*; this is a **controlling stake
> in a listed company, not a wholly-owned subsidiary**.

**شركة الألبان الدنماركية الأردنية (DJD) — brand بلدنا / Baladna**
Founded **1980** (own site) / 1981 (juico) — flag the conflict. Plant at
**عين الباشا، عمان**. **60+ products**: milk, dairy, juice, flavoured milk,
cheese, long-life milk. Named retail customers: Royal Jordanian, Safeway, Cozmo,
C-Town, Sameh Mall, Marouf Coffee.

## 3 · Agriculture & livestock — three distinct entities

| Entity | What it actually does |
|---|---|
| **شركة لوران للاستثمار الزراعي** (est. 2019, Amman) | **Fodder / animal feed** — imports clover, straw, silage; grows fodder crops. Not food farming. |
| **شركة الاتحاد الأردني للاستثمار الزراعي والحيواني** | Owns the **الحلابات dairy farm**, Zarqa |
| **شركة المها للاستثمار الحيواني والزراعي** | Cattle farm supplying Al-Maha (location UNVERIFIED) |

**مزرعة الحلابات (Al-Hallabat farm), Zarqa** — 300 dunums (juico) / 320
(baladna). 1,200 cows imported from Sweden & Australia; sheds for 3,300 head;
current herd stated 4,200. **60 tons raw milk/day**, 28,800 tons/year. Two
DeLaval automatic milking systems (58 + 28 units), 4 mixers, 4 tractors, on-site
desalination plant. Feed **30 tons/day**.

> ⚠️ Cow counts of 1,200 / 3,300 / 3,500 / 4,200 appear across the group's own
> pages for **different entities**. Keep them per-entity; never sum them.

## 4 · Education

**جامعة عمان الأهلية (AAU)** — first private university in Jordan.
Licensed **1989**, first cohort **1990**. 33 BSc + 14 MSc programmes,
~300 faculty, ~7,000 students. MBA partnership with **Heriot-Watt, Edinburgh**.
INDEPENDENT (Wikipedia).
**مجموعة مدارس الجامعة (JSS)** — est. **1979**, 3 branches (Jubeiha, Tabarbour,
Tila' Al-Ali), **5,000+ students**.
**مركز الأمن السيبراني AAUC2** — est. 2019, EC-Council partnership.
**الأرينا** — built 1998 on campus; 4,000 m² theatre seating 5,000+; 25 m
six-lane Olympic pool.
**مركز الحوراني للتعليم الإلكتروني** — est. 2007.

## 5 · Real estate (new to us)

**شركة طبقة فحل للخدمات التجارية** — commercial complex on Gardens St., Amman;
built 2005, acquired by the group 2019. Land 1,510 m², built 2,050 m², 50 m
frontage on two streets. Tenants include **Capital Bank**, Alia Central
Restaurant, Al-Maher Security, plus travel/legal/medical offices.

## 6 · Security & protection (new to us)

**شركة الماهر للأمن والحماية** — Amman; a tenant in the Tabaqet Fahel complex.
Confirmed only via the Chairman's role list; it has no dedicated page.

## 7 · Technology

**AAUC2** is the group's entire Technology sector.

---

## Leadership (published corporate roles only)

- **د. أحمد مفلح الحوراني** — Founder; founder of AAU.
- **د. ماهر الحوراني** — Chairman of the Board; chairs JUICO, AAUC2, Jordanian
  Dairy Co., Arena Hotels (JO & BG), Loran, Al-Maher, Tabaqet Fahel.
- **السيد عمر أحمد الحوراني** — Deputy Chairman; Chairman & GM of Danish
  Jordanian Dairy; Chairman of the Jordanian Union for Agricultural & Livestock
  Investment.

---

## Not related: مجموعة المناصير / Almanaseer

Founded **1999** by **Ziad Al-Manaseer**. ~10,000 employees, 16 subsidiaries,
energy/mining/construction. **Different family, different founder, zero
published overlap.** Do not model it as a Hourani affiliate. It remains a
plausible *separate tenant* for the multi-tenant story — nothing more.

---

## Known conflicts to carry as flags, not resolve silently

| Conflict | Values |
|---|---|
| DJD founding | 1980 (own site) vs 1981 (juico) |
| AAU founding | 1989 licensed vs 1990 first cohort |
| Al-Hallabat area | 300 vs 320 dunums |
| Arena capacity | theatre 5,000+ vs match hall 1,500+ |
| "14 companies" | only ~11 named — **seed only the named ones** |

## Still unknown — must come from Anas, not the web

Per-company employee counts · the group's actual chart of accounts · Al-Maha and
Baladna **SKU-level** names, pack sizes, costs, and shelf lives (only category
counts are public) · Loran's fodder supplier list · Al-Maha's farm location · the
~3 unnamed companies making up the claimed 14.
