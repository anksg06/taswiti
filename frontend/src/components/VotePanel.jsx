import { useState } from "react";
import { api } from "../api";

export default function VotePanel({ poll, onVoted }) {
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (selected === null) return;
    setError(null);
    setBusy(true);
    try {
      await api.vote(poll.id, selected);
      onVoted();
    } catch (err) {
      if (err.message === "Already voted") {
        onVoted();
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {poll.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            className={`group flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-right transition-all active:scale-[0.99] ${
              selected === i
                ? "accent-soft shadow-lg"
                : "border-slate-200/90 bg-white/70 hover:border-[color-mix(in_srgb,var(--a1)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--a1)_6%,transparent)] dark:border-white/10 dark:bg-slate-900/60"
            }`}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                selected === i
                  ? "accent-border"
                  : "border-slate-300 group-hover:border-[color-mix(in_srgb,var(--a1)_55%,transparent)] dark:border-slate-500"
              }`}
            >
              {selected === i && (
                <span className="animate-pop accent-fill h-2.5 w-2.5 rounded-full" />
              )}
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-100">
              {opt.text}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={selected === null || busy}
        className="btn-success w-full rounded-xl py-3 font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0"
      >
        {busy ? "جارٍ الإرسال…" : "✓ صوّت الآن"}
      </button>
    </div>
  );
}