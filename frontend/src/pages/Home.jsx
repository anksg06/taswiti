import { useEffect, useState } from "react";
import { api } from "../api";
import CreateForm from "../components/CreateForm";

const chipPalette = [
  "from-indigo-300 to-violet-300",
  "from-teal-300 to-cyan-300",
  "from-amber-200 to-orange-300",
  "from-rose-300 to-pink-300",
  "from-emerald-200 to-lime-300",
  "from-sky-300 to-blue-300",
];

const emojis = ["✍️", "🎯", "🧠", "🚀", "🎨", "📊"];

function fmtDate(ts) {
  return new Date(ts * 1000).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Home({ navigate }) {
  const [polls, setPolls] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listPolls().then(setPolls).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-10">
      <section className="animate-fade-up pt-10 text-center">
        <span className="mb-4 inline-block rounded-full border border-[color-mix(in_srgb,var(--a1)_25%,transparent)] bg-[color-mix(in_srgb,var(--a1)_10%,transparent)] px-4 py-1.5 text-xs font-bold accent-text">
          ⚡ صوّت في ثانية — بدون تسجيل
        </span>
        <h1 className="text-4xl font-black leading-[1.15] text-slate-900 dark:text-white sm:text-5xl">
          أنشئ استطلاعك واكتشف رأي الجميع
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-slate-500 dark:text-slate-400">
          عام للجميع أو خاص بمن تختار — بتوقيت تتحكم به حتى الثواني.
        </p>
      </section>

      <div className="animate-fade-up d-1">
        <CreateForm onCreated={(poll) => navigate(`/polls/${poll.id}`)} />
      </div>

      <section className="animate-fade-up d-2">
        <div className="glass dark:border-white/10 rounded-3xl p-6 shadow-xl shadow-indigo-500/5 sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
              <span className="accent-soft grid h-8 w-8 place-items-center rounded-xl">
                📋
              </span>
              آخر الاستطلاعات
            </h2>
            {polls && polls.length > 0 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                {polls.length} استطلاع
              </span>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          {!polls && !error && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-2xl bg-slate-100/80 dark:bg-white/10"
                />
              ))}
            </div>
          )}

          {polls && polls.length === 0 && !error && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center text-slate-400 dark:border-white/10 dark:text-slate-500">
              <div className="mb-2 text-4xl">🗳️</div>
              <p className="text-sm">لا توجد استطلاعات عامة بعد — أنشئ الأول أعلاه!</p>
            </div>
          )}

          {polls && polls.length > 0 && (
            <ul className="space-y-2.5">
              {polls.map((p, i) => (
                <li key={p.id}>
                  <a
                    href={`/polls/${p.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/polls/${p.id}`);
                    }}
                    className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 p-3.5 transition-all hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--a1)_40%,transparent)] hover:bg-white hover:shadow-lg hover:shadow-[color-mix(in_srgb,var(--a1)_15%,transparent)] dark:border-white/10 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                  >
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-lg ${chipPalette[i % chipPalette.length]}`}
                    >
                      {emojis[i % emojis.length]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-800 transition-colors group-hover:accent-text dark:text-slate-100">
                        {p.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                        🗳️ {p.total_votes} صوت · {fmtDate(p.created_at)}
                      </span>
                    </span>
                    <span className="text-xl text-slate-300 transition-colors group-hover:accent-text dark:text-slate-600">
                      ‹
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}