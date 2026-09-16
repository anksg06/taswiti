# PROJECT_MAP — تصويتي (Quick Voting Tool)

> آخر تحديث: **2026-09-16** — الحالة: **مكتمل** ✅ (تم تنفيذ M1→M6 والتحقق منه)

## [TECH_STACK]

| الطبقة | التقنية | الإصدار | ملاحظة |
|---|---|---|---|
| Runtime | Node.js | 24.x LTS | Active LTS |
| Frontend | React + ReactDOM | 19.2.8 | npm stable |
| Build | Vite | 8.2.2 | Rolldown، مدعوم |
| Styling | Tailwind CSS | 4.3.3 | عبر `@tailwindcss/vite` |
| Backend | Python + FastAPI | 3.13.x / 0.141.1 | PyPI |
| Server | uvicorn[standard] | 0.38.0 | ASGI |
| DB | SQLite | stdlib | صفر ORM |
| Charts | Tailwind-only (CSS bars) | — | صفر مكتبة |

> ملاحظة توافق: المنفذان 8000/5173 مشغولان بمشروع الأسهم القديم → تم اعتماد **8001** (Backend) و **5174** (Frontend).

### الميزات الموسّعة (2026-09)
- **الوضع الداكن** 🌙 + **مبدّل ألوان** (3 سمات هادئة: Indigo / Emerald / Rose) عبر CSS Variables — يُحفظ في `localStorage`. العبارات بلون واحد — لا تدرجات متعددة.
- **مدة التصويت مخصصة:** `duration_seconds` (30 ثانية.. 30 يوماً) — واجهة: تصنيفات + "مخصص" (ثوانٍ/دقائق/ساعات/أيام). عند الانتهاء: `410 Gone` + **حذف نهائي** (متضمن الأصوات عبر FK).
- **عام/خاص:** `visibility` — العام في القائمة؛ الخاص برابط مباشر (الرابط بوابة الوصول، بلا حسابات).
- **عدّاد تنازلي حي** + شريط مشاركة بارز للخاص.
- **اسم الموقع: تصويتي**.

## [SYSTEM_FLOW]

```
[Home]                       [POST /api/polls]                [SQLite]
  أنشئ استطلاع (عنوان+2..10) ─────────────▶ polls(id,title,options)
        │
        ▼
[PollDetail /polls/{id}]     [GET /api/polls/{id}]  (الخيارات + العد + النسب)
  VotePanel ── client_token ─▶ [POST /api/polls/{id}/vote]
        │                        ├─ 201: تسجيل ✓
        │                        └─ 409: مكرر (UNIQUE)
        ▼
  ResultsBars ── poll كل 5 ثوانِ ─▶ [GET /api/polls/{id}] ◀─ GROUP BY
```

- **Client-Token:** `localStorage` (crypto.randomUUID) يُرسل في هيدر `X-Client-Token`.
- **الواجهة:** React Router مُصغّر يدوياً (`history.pushState` + `onpopstate`) بلا تبعيات.
- **الـ Proxy:** `vite.config.js` يعيد `/api` → `127.0.0.1:8001` (محاكاة Same-Origin).
- **تصميم واجهة احترافي (2026-09):** خلفية متحركة (blobs + Glassmorphism)، خط Tajawal، إنشاء خيارات تفاعلي (Enter لإضافة، حذف، عدّاد)، عدّادات نسب متحركة (requestAnimationFrame)، أشرطة متدرجة + تاج للمتصدّر، بطاقات تستجيب لـ hover/active، حالة تحميل Skeleton، هستيريا تبديل "صوّت → نتائج". كلها Tailwind/CSS خالصة بلا تبعيات.

## [ARCHITECTURE]

```
voting-app/
├─ backend/
│  ├─ app/
│  │  ├─ main.py          # FastAPI + CORS + lifespan(logging/init_db)
│  │  ├─ config.py        # ثوابت ومسارات، CORS_ORIGINS
│  │  ├─ database.py      # sqlite3 + schema + contextmanager
│  │  ├─ logging.py       # QueueHandler+QueueListener+RotatingFile+SensitiveFilter
│  │  └─ api/
│  │     ├─ polls.py      # POST/GET /api/polls ، GET /{id} (تجميع SQL)
│  │     └─ votes.py      # POST /{id}/vote + فحص 422/409/404
│  ├─ requirements.txt
│  └─ verify_api.py       # اختبار E2E آلي (16 حالة)
└─ frontend/
   ├─ src/
   │  ├─ main.jsx  App.jsx  api.js
   │  ├─ components/  CreateForm.jsx  VotePanel.jsx  ResultsBars.jsx
   │  └─ pages/  Home.jsx  PollDetail.jsx
   ├─ index.html  vite.config.js  package.json
└─ start.bat
```

### Schema
```sql
polls(id TEXT PK, title TEXT, options TEXT, visibility TEXT NOT NULL DEFAULT 'public',
      expires_at INTEGER NOT NULL, created_at INTEGER)
votes(id INTEGER PK, poll_id TEXT FK, option_index INT, client_token TEXT,
      created_at INT, UNIQUE(poll_id, client_token))
```

### Logging
- غير حظري (Queue) + ملف دوّار `backend/logs/app.log`.
- مستويات: INFO / WARNING / ERROR فقط.
- `SensitiveFilter` يمنع أي سطر فيه `client_token`/`x-client-token` — 0 تسريب مُتحقق منه.

## [ORPHANS & PENDING]

| # | البند | الحالة |
|---|---|---|
| 1 | M1 هيكل + `/api/health→200` | ✅ منجز |
| 2 | M2 إنشاء/قائمة/تفاصيل + SQL aggregation | ✅ منجز |
| 3 | M3 تصويت + منع تكرار 409 | ✅ منجز |
| 4 | M3 اختبار آلي `verify_api.py` — 16/16 | ✅ منجز |
| 5 | M4 واجهة (إنشاء/تصويت/تنقّل) | ✅ منجز |
| 6 | M5 نتائج بأشرطة + تحديث 5 ثوانٍ | ✅ منجز |
| 7 | M6 `npm run build` نظيف + سجل بلا تسريب | ✅ منجز |
| 8 | `start.bat` | ✅ منجز |

**لا توجد بنود معلقة.** المنتج مكتمل والتوثيق في حالة مُزامنة.

## [VERIFICATION RECORD]

- `python verify_api.py` → **25 passed, 0 failed** (يشمل: عام/خاص، مدة مخصصة بالثواني/422 للحدود، انتهاء → 410 → حذف نهائي → 404).
- `npm run build` → **built in 398ms** (0 أخطاء).
- رحلة الـ Proxy: مدة 90 ثانية مضبوطة (expires_at - created = 90)؛ خاص مخفي + قابل للتصويت بالرابط ✅.
- فحص السجل: **0** حدوث لأي نمط توكن.
- رحلة المتصفح عبر الـ Proxy: إنشاء → تصويت (201) → تفاصيل (شاي 100%) ✅.
- فحص السجل: **0** حدوث لأي نمط توكن.
- التحقق البصري الأخير من واجهة المستخدم في المتصفح على `http://localhost:5174` يُترك للمستخدم.