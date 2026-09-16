import { useEffect, useState } from "react";

const PALETTE = [
  ["#6f7bd9", "#8a97e0"],
  ["#57b294", "#6fc0a6"],
  ["#c99642", "#d9b170"],
  ["#b26f8e", "#c485a3"],
  ["#5b9fc0", "#85bdd6"],
  ["#8a76b8", "#a895c9"],
];

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function OptionBar({ opt, i, isLeader, color, maxPct }) {
  const pct = useCountUp(opt.pct);
  const width = maxPct > 0 ? Math.max((opt.pct / maxPct) * 100, opt.pct > 0 ? 5 : 0) : 0;

  return (
    <div className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
          {isLeader && <span title="متقدم حالياً">👑</span>}
          <span className="truncate">{opt.text}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {opt.count} صوت
          </span>
          <span
            className="min-w-[3.2rem] rounded-full px-2 py-0.5 text-center text-xs font-bold text-white"
            style={{ background: `linear-gradient(90deg, ${color[0]}, ${color[1]})` }}
          >
            {pct.toFixed(1)}%
          </span>
        </span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color[1]}, ${color[0]})`,
            boxShadow: isLeader ? `0 0 12px ${color[0]}55` : undefined,
          }}
        />
      </div>
    </div>
  );
}

export default function ResultsBars({ poll }) {
  const maxPct = Math.max(...poll.options.map((o) => o.pct), 0);
  const leader =
    maxPct > 0 ? poll.options.findIndex((o) => o.pct === maxPct) : -1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span className="accent-soft grid h-8 w-8 place-items-center rounded-xl text-base">
          🗳️
        </span>
        <span className="font-bold text-slate-700 dark:text-slate-200">{poll.total}</span>{" "}
        صوت حتى الآن
      </div>

      <div className="space-y-4">
        {poll.options.map((opt, i) => (
          <OptionBar
            key={i}
            opt={opt}
            i={i}
            isLeader={i === leader}
            color={PALETTE[i % PALETTE.length]}
            maxPct={maxPct}
          />
        ))}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        يتم التحديث تلقائياً كل 5 ثوانٍ
      </p>
    </div>
  );
}