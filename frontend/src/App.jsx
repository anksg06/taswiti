import { useCallback, useEffect, useState } from "react";
import Home from "./pages/Home.jsx";
import PollDetail from "./pages/PollDetail.jsx";

const ACCENTS = {
  indigo: "#6f7bd9",
  emerald: "#57b294",
  rose: "#b26f8e",
};

function parseRoute(path) {
  const m = path.match(/^\/polls\/([^/]+)$/);
  return m ? { page: "poll", id: m[1] } : { page: "home" };
}

function readTheme() {
  try {
    return JSON.parse(localStorage.getItem("voting-theme") || "{}");
  } catch {
    return {};
  }
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", !!theme.dark);
    root.setAttribute("data-accent", theme.accent || "indigo");
    localStorage.setItem("voting-theme", JSON.stringify(theme));
  }, [theme]);

  const navigate = useCallback((path) => {
    window.history.pushState(null, "", path);
    setRoute(parseRoute(path));
  }, []);

  window.onpopstate = () => setRoute(parseRoute(window.location.pathname));

  const toggleDark = () => setTheme((t) => ({ ...t, dark: !t.dark }));
  const setAccent = (a) => setTheme((t) => ({ ...t, accent: a }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/60 to-violet-50 transition-colors dark:from-slate-950 dark:via-indigo-950/40 dark:to-violet-950/60">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div
          className="animate-blob absolute -top-28 -right-24 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "color-mix(in srgb, var(--a1) 30%, transparent)" }}
        />
        <div
          className="animate-blob absolute top-1/3 -left-28 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{
            background: "color-mix(in srgb, var(--a2) 26%, transparent)",
            animationDelay: "-7s",
          }}
        />
        <div
          className="animate-blob absolute -bottom-24 left-1/4 h-80 w-80 rounded-full blur-3xl"
          style={{
            background: "color-mix(in srgb, var(--a3) 26%, transparent)",
            animationDelay: "-13s",
          }}
        />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
          <div
            onClick={() => navigate("/")}
            className="flex cursor-pointer select-none items-center gap-2.5"
          >
            <span className="logo-grad grid h-10 w-10 place-items-center rounded-2xl text-xl text-white shadow-lg transition-transform hover:rotate-6">
              ⚡
            </span>
            <span className="accent-text text-xl font-extrabold tracking-tight">
              تصويتي
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300 sm:block">
              بدون تسجيل · مجاني
            </span>

            <div className="flex items-center gap-1 rounded-full border border-white/60 bg-white/50 p-1 dark:border-white/10 dark:bg-slate-800/60">
              {Object.entries(ACCENTS).map(([name, color]) => (
                <button
                  key={name}
                  onClick={() => setAccent(name)}
                  aria-label={`اللون ${name}`}
                  className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: color,
                    boxShadow:
                      theme.accent === name
                        ? `0 0 0 2px rgba(15,23,42,.15) inset, 0 0 0 2px rgba(255,255,255,.7)`
                        : undefined,
                  }}
                />
              ))}
            </div>

            <button
              onClick={toggleDark}
              aria-label="تبديل الوضع الداكن"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-white/50 text-lg transition-all hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-slate-800/60"
            >
              {theme.dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {route.page === "home" ? (
          <Home navigate={navigate} />
        ) : (
          <PollDetail key={route.id} id={route.id} navigate={navigate} />
        )}
      </main>

      <footer className="relative z-10 border-t border-white/60 py-6 text-center text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
        صُنع بشغف ⚡ · تصويتي — صوتك يصنع الفرق
      </footer>
    </div>
  );
}