import { useState } from "react";
import { api } from "../api";

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;

const DURATION_MIN_SECONDS = 30;
const DURATION_MAX_SECONDS = 2_592_000;

const PRESETS = [
  { s: 3600, label: "1 ساعة" },
  { s: 86400, label: "يوم" },
  { s: 259200, label: "3 أيام" },
  { s: 604800, label: "7 أيام" },
];

const PART_LABELS = ["أيام", "ساعات", "دقائق", "ثواني"];

const FACTORS = [86400, 3600, 60, 1];

function formatDuration(totalSec) {
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (d) parts.push(`${d} يوم`);
  if (h) parts.push(`${h} ساعة`);
  if (m) parts.push(`${m} دقيقة`);
  if (s) parts.push(`${s} ثانية`);
  return parts.join(" و ") || "0 ثانية";
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all active:scale-95 ${
        active
          ? "accent-soft accent-text shadow-sm"
          : "border border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function CreateForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [visibility, setVisibility] = useState("public");
  const [custom, setCustom] = useState(false);
  const [durationS, setDurationS] = useState(86400);
  const [customParts, setCustomParts] = useState(["0", "0", "5", "0"]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function setOption(i, value) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function addOption() {
    if (options.length < MAX_OPTIONS) setOptions((prev) => [...prev, ""]);
  }

  function removeOption(i) {
    setOptions((prev) =>
      prev.length > MIN_OPTIONS ? prev.filter((_, idx) => idx !== i) : prev
    );
  }

  function pickDuration(seconds) {
    setCustom(false);
    setDurationS(seconds);
  }

  function resolveDuration() {
    if (!custom) return durationS;
    let total = 0;
    for (let i = 0; i < customParts.length; i++) {
      const n = Number(customParts[i]);
      if (!Number.isFinite(n) || n < 0 || n > 9999) return null;
      total += n * FACTORS[i];
    }
    return Math.round(total);
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (!title.trim()) return setError("اكتب عنوان الاستطلاع أولاً");
    if (clean.length < MIN_OPTIONS)
      return setError(`تحتاج ${MIN_OPTIONS} خيارات على الأقل`);
    const seconds = resolveDuration();
    if (seconds === null) return setError("أدخل مدة صحيحة وموجبة");
    if (seconds < DURATION_MIN_SECONDS || seconds > DURATION_MAX_SECONDS)
      return setError(
        `المدة بين ${DURATION_MIN_SECONDS} ثانية و 30 يوماً`
      );
    setBusy(true);
    try {
      const poll = await api.createPoll(title.trim(), clean, visibility, seconds);
      onCreated(poll);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm outline-none transition-all focus:border-[var(--a1)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--a1)_20%,transparent)] dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder-slate-500";

  return (
    <form
      onSubmit={submit}
      className="glass dark:border-white/10 space-y-5 rounded-3xl p-6 shadow-xl shadow-indigo-500/5 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="accent-fill grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-white">
          1
        </span>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          سؤال الاستطلاع
        </h2>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="مثال: ما أفضل مشروب للمذاكرة؟"
        maxLength={120}
        className={inputCls}
      />
      <div className="-mt-2 flex justify-between text-xs">
        <span className="text-slate-400 dark:text-slate-500">
          اضغط Enter لإضافة خيار — كحد أدنى {MIN_OPTIONS} خيارات
        </span>
        <span className={title.length > 100 ? "text-red-500" : "text-slate-400 dark:text-slate-500"}>
          {title.length}/120
        </span>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <span className="accent-fill grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-white">
          2
        </span>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">الخيارات</h2>
        <span className="mr-auto text-xs text-slate-400 dark:text-slate-500">
          {options.length}/{MAX_OPTIONS}
        </span>
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="animate-fade-up flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
              {i + 1}
            </span>
            <input
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && options.length < MAX_OPTIONS) {
                  e.preventDefault();
                  addOption();
                }
              }}
              placeholder={`الخيار ${i + 1}`}
              maxLength={80}
              className={inputCls}
            />
            {options.length > MIN_OPTIONS && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                aria-label="حذف الخيار"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < MAX_OPTIONS && (
        <button
          type="button"
          onClick={addOption}
          className="accent-text w-full rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--a1)_35%,transparent)] py-2.5 font-semibold transition-all hover:bg-[color-mix(in_srgb,var(--a1)_8%,transparent)]"
        >
          + أضف خياراً
        </button>
      )}

      <div className="flex items-center gap-3 pt-1">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-sm dark:bg-white/10">
          🌍
        </span>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">نمط التصويت</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Pill active={visibility === "public"} onClick={() => setVisibility("public")}>
          🌍 عام — يظهر في القائمة للجميع
        </Pill>
        <Pill active={visibility === "private"} onClick={() => setVisibility("private")}>
          🔒 خاص — برابط يصل لمن تختار
        </Pill>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-sm dark:bg-white/10">
          ⏳
        </span>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">مدة التصويت</h2>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {PRESETS.map((d) => (
          <Pill key={d.s} active={!custom && durationS === d.s} onClick={() => pickDuration(d.s)}>
            {d.label}
          </Pill>
        ))}
        <Pill active={custom} onClick={() => setCustom(true)}>
          ⏱ مخصص
        </Pill>
      </div>
      {custom && (
        <div className="animate-fade-up space-y-2 rounded-2xl border border-slate-200 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-900/40">
          <div className="grid grid-cols-4 gap-2">
            {PART_LABELS.map((label, i) => (
              <div key={label}>
                <input
                  type="number"
                  min="0"
                  value={customParts[i]}
                  onChange={(e) =>
                    setCustomParts((prev) =>
                      prev.map((v, idx) => (idx === i ? e.target.value : v))
                    )
                  }
                  className={inputCls + " text-center"}
                />
                <p className="mt-1 text-center text-xs text-slate-400 dark:text-slate-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
          {(() => {
            const total = custom ? resolveDuration() : durationS;
            if (total === null)
              return (
                <p className="text-xs text-rose-500">أدخل أرقاماً صحيحة فقط</p>
              );
            if (total === 0)
              return (
                <p className="text-xs text-rose-500">أدخل مدة أكبر من صفر</p>
              );
            if (total < DURATION_MIN_SECONDS)
              return (
                <p className="text-xs text-rose-500">
                  أقل مدة مسموحة: {DURATION_MIN_SECONDS} ثانية
                </p>
              );
            if (total > DURATION_MAX_SECONDS)
              return (
                <p className="text-xs text-rose-500">الحد الأقصى: 30 يوماً</p>
              );
            return (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                الإجمالي: {formatDuration(total)} ({total} ثانية)
              </p>
            );
          })()}
        </div>
      )}
      <p className="text-xs text-slate-400 dark:text-slate-500">
        بعد انتهاء المدة يُحذف الاستطلاع تلقائياً من الموقع نهائياً.
      </p>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full rounded-xl py-3 font-bold text-white shadow-lg shadow-[color-mix(in_srgb,var(--a1)_35%,transparent)] transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99] disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {busy ? "جارٍ الإنشاء…" : "🚀 أنشئ الاستطلاع"}
      </button>
    </form>
  );
}