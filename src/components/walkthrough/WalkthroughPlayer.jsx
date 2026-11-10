import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router-compat";
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import usePageMeta from "@/lib/usePageMeta";
import { PhoneFrame, TabletFrame } from "@/components/walkthrough/DeviceFrames";

const AUTOPLAY_MS = 7000;

/** Step-by-step tour: big picture of the screen, plain-language caption, simple controls. */
export default function WalkthroughPlayer({ meta, eyebrow, title, intro, steps, other, device }) {
  usePageMeta(meta);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const touch = useRef(null);
  const last = steps.length - 1;
  const go = useCallback((n) => setI(Math.max(0, Math.min(last, n))), [last]);

  useEffect(() => {
    if (!playing) return;
    if (i >= last) { setPlaying(false); return; }
    const t = setTimeout(() => setI((v) => v + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, i, last]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  const step = steps[i];
  const Screen = step.Screen;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{intro}</p>

        <ol className="mt-8 flex gap-2 overflow-x-auto pb-2" aria-label="Steps">
          {steps.map((s, n) => (
            <li key={s.title}>
              <button
                onClick={() => { setPlaying(false); go(n); }}
                aria-current={n === i ? "step" : undefined}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                  n === i ? "border-primary bg-primary text-primary-foreground"
                  : n < i ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}
              >
                {n + 1}. {s.short}
              </button>
            </li>
          ))}
        </ol>

        <section className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div
            className="overflow-hidden rounded-2xl border border-border bg-muted shadow-xl"
            onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touch.current == null) return;
              const dx = e.changedTouches[0].clientX - touch.current;
              if (Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1);
              touch.current = null;
            }}
          >
            {(step.device || device) === "phone" ? (
              <div key={i} className="animate-in fade-in duration-500"><PhoneFrame title={step.bare ? null : step.title.length > 26 ? step.short : step.title}><Screen /></PhoneFrame></div>
            ) : (step.device || device) === "tablet" ? (
              <div key={i} className="animate-in fade-in duration-500"><TabletFrame title={step.short}><Screen /></TabletFrame></div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 border-b border-border bg-card px-4 py-2.5">
                  <span className="ml-3 truncate text-xs text-muted-foreground">clubrudder.com{step.path}</span>
                </div>
                <div key={i} className="animate-in fade-in duration-500 p-4 sm:p-6"><Screen /></div>
              </>
            )}
          </div>

          <aside className="flex flex-col rounded-2xl border border-border bg-card p-6">
            <p className="text-sm font-semibold text-primary">Step {i + 1} of {steps.length}</p>
            <h2 className="mt-1 text-2xl font-bold">{step.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{step.text}</p>
            {step.points && (
              <ul className="mt-4 space-y-2">
                {step.points.map((p) => (
                  <li key={p} className="flex gap-2 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />{p}</li>
                ))}
              </ul>
            )}
            <div className="mt-auto pt-6">
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous step"
                  className="rounded-lg border border-border p-3 disabled:opacity-40 hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
                {i < last ? (
                  <button onClick={() => go(i + 1)} className="flex-1 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90">
                    Next <ChevronRight className="inline h-4 w-4" />
                  </button>
                ) : (
                  <Link to="/request-access" className="flex-1 rounded-lg bg-primary px-4 py-3 text-center font-semibold text-primary-foreground hover:opacity-90">
                    Get started
                  </Link>
                )}
                <button onClick={() => (i === last ? (go(0), setPlaying(true)) : setPlaying((p) => !p))}
                  aria-label={playing ? "Pause" : "Play automatically"}
                  className="rounded-lg border border-border p-3 hover:bg-muted">
                  {i === last ? <RotateCcw className="h-5 w-5" /> : playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </aside>
        </section>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-lg font-semibold">{other.label}</p>
          <Link to={other.to} className="mt-3 inline-block rounded-lg border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary/10">
            {other.cta}
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
