# H-Nerve — GitHub Workflow Guide / دليل سير العمل على GitHub

owner: Anas Hasiba
last-updated: 2026-07-10

> Phase 25 of `docs/PHASES-INTELLIGENCE.md`.
>
> **A bilingual (Arabic + English) reference any team member or executive can read
> to understand exactly what we are doing in GitHub.** No prior git experience
> assumed. The English column always sits to the right of the Arabic so you can
> read either side and skip the other.

---

## 1. The mental model · النموذج الذهني

| العربية | English |
|---|---|
| GitHub هو "السحابة" التي تحتفظ بكل نسخة من الكود. | GitHub is the "cloud" that holds every version of the code. |
| كل تغيير يبدأ في فرع جانبي ثم يُدمَج في الفرع الرئيسي `main`. | Every change starts on a side branch, then merges into the main branch `main`. |
| `main` هو ما تنشره **Railway** تلقائياً. لا تُسلّم Railway شيئاً غير ما هو في `main`. | `main` is what **Railway** deploys automatically. Railway never serves anything that isn't on `main`. |
| الفروع الجانبية تجعل التجريب آمناً — يمكنك العمل دون أن تكسر النسخة المباشرة. | Side branches make experimentation safe — you can work without breaking the live version. |

**القاعدة الذهبية / Golden rule:** لا أحد يدفع مباشرة إلى `main`. كل شيء يمرّ بـ Pull Request.
*Nobody pushes directly to `main`. Everything goes through a Pull Request.*

---

## 2. The four moving parts · العناصر الأربعة

### 2.1 الالتزام · Commit

| العربية | English |
|---|---|
| الالتزام (commit) هو لقطة محفوظة من التغييرات، مع رسالة تشرحها. | A commit is a saved snapshot of changes, with a message explaining them. |
| يشبه "الحفظ مع الاسم" في برامج المعالجة، لكنه لا يستبدل النسخة السابقة — يضيف نقطة جديدة في الخط الزمني. | Like "Save As" in a document editor — except it doesn't replace the previous version; it adds a new point on the timeline. |
| كل التزام له معرّف فريد (مثل `223f6c2`) ورسالة قصيرة. | Each commit has a unique ID (like `223f6c2`) and a short message. |

**مثال / Example:**
```
feat(orrery): FAB rail + Morning Brief
```
- `feat` = ميزة جديدة / new feature
- `fix` = إصلاح خطأ / bug fix
- `docs` = توثيق / documentation
- `refactor` = تنظيف الكود دون تغيير السلوك / cleanup without behavior change

---

### 2.2 الفرع · Branch

| العربية | English |
|---|---|
| الفرع نسخة موازية من المشروع بدأت من نقطة معينة. | A branch is a parallel copy of the project that started from a given point. |
| تعمل عليه بحرية — لا يؤثر على `main` ولا على Railway. | You work on it freely — it doesn't affect `main` or Railway. |
| اسم الفرع يبدأ عادةً بـ `feat/` للميزات، `fix/` للأخطاء، `docs/` للتوثيق. | Branch names usually start with `feat/` for features, `fix/` for bug fixes, `docs/` for docs. |

**مثال / Example:** `feat/brain-trust-and-github-docs`

---

### 2.3 طلب الدمج · Pull Request (PR)

| العربية | English |
|---|---|
| طلب الدمج هو **اقتراح** بنقل تغييرات الفرع إلى `main`. | A pull request is a **proposal** to bring branch changes into `main`. |
| يحتوي على عنوان، وصف، قائمة الالتزامات، والاختلافات (diff). | It contains a title, description, list of commits, and the diff. |
| المراجعة تحدث هنا — يمكن لأي شخص التعليق سطراً سطراً. | Review happens here — anyone can comment line by line. |
| الدمج يحدث فقط بعد الموافقة. | The merge happens only after approval. |

**حالات PR / PR states:**

| الحالة | المعنى |
|---|---|
| `DRAFT` (مسودة) | عمل قيد التقدّم، لم يُطلب مراجعته بعد |
| `OPEN` (مفتوح) | جاهز للمراجعة |
| `MERGED` (مدموج) | تم دمجه في `main` — الكود الآن مباشر |
| `CLOSED` (مغلق) | رُفض، لم يُدمَج |

---

### 2.4 التعارض · Conflict

| العربية | English |
|---|---|
| التعارض يحدث عندما يُعدّل شخصان نفس السطر في نفس الملف. | A conflict happens when two people edit the same line in the same file. |
| Git لا يستطيع تخمين أيّ نسخة هي الصحيحة، فيتوقف ويسألك. | Git can't guess which version is correct, so it stops and asks you. |
| يضع علامات في الملف: `<<<<<<<`, `=======`, `>>>>>>>`. | It marks the file with: `<<<<<<<`, `=======`, `>>>>>>>`. |
| الحلّ: تختار يدوياً السطور الصحيحة، تحذف العلامات، تحفظ، ثم تُلزم وتدفع. | The fix: manually pick the correct lines, delete the markers, save, then commit and push. |

**شكل التعارض / What a conflict looks like:**

```
<<<<<<< HEAD
const greeting = "مرحبا";
=======
const greeting = "Hello";
>>>>>>> feat/english-greeting
```

أحد الجانبين هو ما عليه `main` الآن، والآخر هو ما يضيفه الفرع. أنت تختار النسخة (أو تدمج الاثنتين) وتحذف علامات `<<<` و `===` و `>>>`.

*One side is what's currently on `main`, the other is what the branch adds. You pick the right version (or merge them), then delete the `<<<`, `===`, and `>>>` markers.*

---

## 3. The flow we use · سير العمل عندنا

```
┌─────────┐    1. branch    ┌──────────────────┐    3. push    ┌──────────┐
│  main   │ ──────────────▶ │  feat/my-change  │ ────────────▶ │  GitHub  │
└─────────┘                 └──────────────────┘                └──────────┘
     ▲                              │                                │
     │                              │ 2. commit                      │
     │                              ▼                                │
     │                       ┌──────────────────┐                    │
     │ 6. merge              │  edit + commit   │                    │
     │                       │  edit + commit   │                    │
     │                       └──────────────────┘                    │
     │                                                               │
     │           5. review/approve              4. open PR            │
     └────────────────────────────────────────────────────◀──────────┘
```

**الخطوات / The steps:**

1. **افتح فرعاً جديداً من `main`** / Branch from `main`
2. **عدّل واحفظ بـ التزامات (commits)** / Edit and save as commits
3. **ادفع الفرع إلى GitHub** / Push the branch to GitHub
4. **افتح طلب دمج (PR)** / Open a PR
5. **راجع وعدّل بناءً على التعليقات** / Review + revise based on comments
6. **ادمج في `main` → Railway تنشر تلقائياً** / Merge into `main` → Railway auto-deploys

---

## 4. How Railway hooks in · كيف تعمل Railway

| العربية | English |
|---|---|
| Railway مشتركة مع مستودع GitHub الخاص بنا. | Railway is wired to our GitHub repository. |
| في اللحظة التي يُدمَج فيها PR في `main`، تبدأ Railway في بناء النسخة الجديدة. | The instant a PR merges into `main`, Railway starts building the new version. |
| البناء يستغرق ٢-٥ دقائق. الموقع المباشر يتحدّث بعدها مباشرة. | The build takes 2–5 minutes. The live site updates immediately after. |
| إذا كسر التحديث الموقع، Railway تحتفظ بآخر بناء ناجح يمكن العودة إليه. | If the update breaks the site, Railway keeps the last successful build and you can roll back. |

**يمكنك مشاهدة كل عمليات النشر في:** `railway.app/project/<our-project>/deployments`
*You can watch every deployment at:* `railway.app/project/<our-project>/deployments`

---

## 5. Reading a diff · قراءة الاختلافات

| العربية | English |
|---|---|
| الـ diff يُظهر ما تغيّر بين نسختين. | A diff shows what changed between two versions. |
| السطور التي بدأت بـ `+` خضراء — مضافة. | Lines beginning with `+` are green — added. |
| السطور التي بدأت بـ `-` حمراء — محذوفة. | Lines beginning with `-` are red — removed. |
| الباقي سياق لمساعدتك على الفهم. | The rest is context to help you understand. |

**مثال / Example:**

```diff
 export function score(input: ConfidenceInput): ConfidenceScore {
-  const raw = verification * 0.5 + freshness * 0.5;
+  const raw =
+    verification * 0.45 +
+    freshness * 0.25 +
+    density * 0.2 +
+    graph * 0.1;
   return { score: raw, label: "..." };
 }
```

سطر واحد محذوف (الصيغة القديمة)، أربعة أسطر مضافة (الصيغة الجديدة بأربعة محاور).
*One line removed (old formula), four lines added (new four-axis formula).*

---

## 6. Common questions · أسئلة متكررة

### "لماذا أحياناً يخبرني الذكاء الاصطناعي بأن هناك تعارضاً؟ / Why does the AI sometimes tell me there's a conflict?"

عندما يكون فرع آخر قد دُمج في `main` قبل فرعك، تختلف نقطة الانطلاق. الحلّ القياسي هو **تحديث الفرع** بآخر ما في `main` (rebase) ثم حلّ أي تعارضات يدوياً.

*When another branch has merged into `main` before yours, the starting point differs. The standard fix is to **update the branch** with the latest `main` (rebase) and resolve any conflicts manually.*

---

### "ما هو 'force push'؟ هل هو خطير؟ / What is a 'force push'? Is it dangerous?"

`git push --force` يكتب فوق تاريخ الفرع في GitHub. **خطير على `main`** — فقد يدمّر عمل الآخرين. **آمن على فرع جانبي بمفردك** — تستخدمه بعد حلّ تعارض أو إعادة كتابة تاريخ محلي. الفريق يستخدم `--force-with-lease` (نسخة محمية) بدلاً من `--force` العادية.

*`git push --force` overwrites a branch's history on GitHub. **Dangerous on `main`** — it could destroy others' work. **Safe on a solo side branch** — it's used after conflict resolution or local history rewrite. The team uses `--force-with-lease` (a safer variant) rather than raw `--force`.*

---

### "لماذا نفتح PR كـ Draft أولاً؟ / Why open PRs as Draft first?"

المسودة تعني "لست جاهزاً للمراجعة بعد". تتيح للناس رؤية ما تعمل عليه دون إزعاجك بتعليقات قبل أن تكون جاهزاً. تحوّلها إلى "Ready for review" عندما تنتهي.

*Draft means "not ready for review yet." It lets people see what you're working on without pinging them for comments before you're done. Flip it to "Ready for review" when you finish.*

---

### "ماذا أفعل إذا كسر الدمج الموقع المباشر؟ / What if a merge breaks the live site?"

1. ادخل لوحة Railway / Open the Railway dashboard
2. اختر "Deployments" / Open Deployments
3. اضغط آخر بناء ناجح ثم "Redeploy" / Click the last successful build and "Redeploy"
4. سيعود الموقع لما كان عليه خلال دقيقتين / The site returns to its prior state within two minutes
5. ثم افتح PR جديداً لإصلاح المشكلة / Then open a new PR with the fix

---

## 7. The H-Nerve commit/branch naming convention · تسمياتنا

**Branches / الفروع:**
- `feat/<short-description>` — ميزة جديدة / new feature
- `fix/<short-description>` — إصلاح خطأ / bug fix
- `docs/<short-description>` — توثيق / documentation
- `refactor/<short-description>` — إعادة هيكلة / refactoring

**Commits / الالتزامات:**
```
<type>(<scope>): <short description>

<optional longer body>
```

**Examples:**
```
feat(brain): add verifier + confidence scorer for Phase 22
fix(orrery): Admin ERP route lands non-admin on /companies
docs(github): bilingual workflow guide for team onboarding
```

---

## 8. The repository at a glance · المستودع باختصار

- **Repo:** [Anas-Hassiba-2030/h-nerve-erp](https://github.com/Anas-Hassiba-2030/h-nerve-erp)
- **Default branch:** `main`
- **Auto-deploy:** Railway watches `main`. Build script: `prisma generate && prisma db push && next build`.
- **PR list:** [/pulls](https://github.com/Anas-Hassiba-2030/h-nerve-erp/pulls)
- **Deployment status:** Railway dashboard → Deployments tab

---

## 9. Quick glossary · معجم سريع

| Term | عربي | What it means |
|---|---|---|
| Repository / Repo | المستودع | The whole project's folder + history on GitHub |
| Branch | فرع | A parallel line of work |
| Commit | التزام | A named saved snapshot |
| Push | دفع | Upload your local commits to GitHub |
| Pull | جلب | Download GitHub's commits to your local copy |
| Pull Request (PR) | طلب دمج | Proposal to merge a branch into main |
| Merge | دمج | Combine the changes from one branch into another |
| Conflict | تعارض | Two changes overlap and need manual resolution |
| Diff | اختلافات | The line-by-line change view |
| Rebase | إعادة قاعدة | Replay your commits on top of a newer base |
| Force push | دفع قسري | Overwrite a remote branch's history (use sparingly) |
| Main | الفرع الرئيسي | The branch Railway deploys |
| Draft PR | مسودة طلب | A PR that's still being worked on, not ready for review |

---

*This guide is part of Phase 25 of `docs/PHASES-INTELLIGENCE.md`. When the workflow changes, this file changes too.*
