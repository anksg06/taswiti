import { useEffect, useState } from "react";
import { api } from "../api";
import VotePanel from "../components/VotePanel";
import ResultsBars from "../components/ResultsBars";

const POLL_INTERVAL_MS = 5000;

function fmtCountdown(ms) {
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d} يوم ${h} ساعة`;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function PollDetail({ id, navigate }) {
  const [poll, setPoll] = useState(null);
  const [voted, setVoted] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api
        .getPoll(id)
        .then((p) => {
          if (!cancelled) setPoll(p);
        })
        .catch((e) => {
          if (!cancelled) setLoadError(e.message);
        });
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearInterval(clock);
    };
  }, [id]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleVoted = () => {
    setVoted(true);
    api.getPoll(id).then(setPoll).catch(() => {});
  };

  if (loadError) {
    const expired = /expired/i.test(loadError);
    return (
      <div className="mx-auto max-w-xl px-4 pt-10">
        <div className="glass animate-fade-up rounded-3xl p-8 text-center">
          <div className="mb-3 text-5xl">{expired ? "⌛" : "😕"}</div>
          <p className="font-bold text-slate-800 dark:text-slate-100">
            {expired ? "انتهى التصويت" : "عذراً، الاستطلاع غير موجود"}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {expired
              ? "انتهت مدة هذا الاستطلاع وتم حذفه من الموقع."
              : "ربما حُذف أو الرابط غير صحيح."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="btn-primary mt-5 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="glass animate-pulse space-y-4 rounded-3xl p-6 sm:p-8">
          <div className="h-8 w-3/4 rounded-xl bg-slate-200/80 dark:bg-white/10" />
          <div className="h-4 w-40 rounded-lg bg-slate-200/70 dark:bg-white/10" />
          <div className="space-y-3 pt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 rounded-2xl bg-slate-100/80 dark:bg-white/10"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const remainingMs = poll.expires_at * 1000 - now;
  const expired = remainingMs <= 0;
  const countdown = fmtCountdown(remainingMs);

  const date = new Date(poll.created_at * 1000).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-10">
      <button
        onClick={() => navigate("/")}
        className="animate-fade-up text-sm text-slate-400 transition-colors hover:accent-text dark:text-slate-500"
      >
        → العودة للاستطلاعات
      </button>

      <div className="glass animate-fade-up d-1 space-y-5 rounded-3xl p-6 shadow-xl shadow-indigo-500/5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-extrabold leading-snug text-slate-900 dark:text-white sm:text-3xl">
            {poll.title}
          </h1>
          <button
            onClick={copyLink}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
              copied
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                : "border border-slate-200 bg-white/80 text-slate-600 hover:border-[color-mix(in_srgb,var(--a1)_45%,transparent)] hover:accent-text dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300"
            }`}
          >
            {copied ? "✓ تم النسخ" : "🔗 نسخ الرابط"}
          </button>
        </div>

        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-slate-400 dark:text-slate-500">
          <span>🗓</span> {date}
          <span className="mx-1">·</span>
          <span>🗳️</span> {poll.total} صوت
          <span className="mx-1">·</span>
          <span>{poll.visibility === "private" ? "🔒 خاص" : "🌍 عام"}</span>
          {countdown && (
            <>
              <span className="mx-1">·</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  remainingMs < 3600_000
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                    : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                }`}
              >
                ⏳ متبقي {countdown}
              </span>
            </>
          )}
        </p>

        <div className="border-t border-white/70 pt-5 dark:border-white/10">
          {expired ? (
            <div className="animate-pop rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-5 text-center dark:border-amber-400/30 dark:bg-amber-500/10">
              <div className="mb-1 text-3xl">⌛</div>
              <p className="font-bold text-amber-700 dark:text-amber-300">
                انتهت مدة هذا التصويت وتم حذفه
              </p>
              <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80">
                النتائج لم تعد متاحة.
              </p>
            </div>
          ) : voted ? (
            <div className="space-y-5">
              <div className="animate-pop flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-emerald-400/30 dark:bg-emerald-500/15">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500 text-lg text-white shadow-lg shadow-emerald-500/30">
                  ✓
                </span>
                <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">
                    تم تسجيل صوتك!
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    النتائج تتحدث تلقائياً — شارك الرابط وأوصل النتيجة.
                  </p>
                </div>
              </div>
              <ResultsBars poll={poll} />
            </div>
          ) : (
            <div className="space-y-5">
              {poll.visibility === "private" && (
                <div className="animate-fade-up rounded-2xl border-2 border-dashed border-[color-mix(in_srgb,var(--a1)_35%,transparent)] bg-[color-mix(in_srgb,var(--a1)_6%,transparent)] p-4">
                  <p className="mb-2 text-sm font-semibold accent-text">
                    🔒 استطلاع خاص — أرسل الرابط لمن تريد التصويت:
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={window.location.href}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 truncate rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600 outline-none focus:border-[var(--a1)] dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300"
                    />
                    <button
                      onClick={copyLink}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white transition-all active:scale-95 ${
                        copied ? "bg-emerald-500" : "btn-primary"
                      }`}
                    >
                      {copied ? "✓ تم" : "نسخ"}
                    </button>
                  </div>
                </div>
              )}
              <VotePanel poll={poll} onVoted={handleVoted} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}