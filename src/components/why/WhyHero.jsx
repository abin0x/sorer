import React, { useState, useEffect, useCallback } from "react";
import { Link } from '@/lib/router-compat';
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ArrowDown, ArrowRight, Shield, LayoutDashboard, Users } from "lucide-react";

const ROLE_VIEWS = [
  {
    label: "Club Admin",
    icon: Shield,
    color: "#4f47e6",
    title: "clubrudder.com/admin",
    render: () => <AdminMock />,
  },
  {
    label: "Club Director",
    icon: LayoutDashboard,
    color: "#2563EB",
    title: "clubrudder.com/programs",
    render: () => <ProgramMock />,
  },
  {
    label: "Coach",
    icon: Users,
    color: "#059669",
    title: "clubrudder.com/coach",
    render: () => <CoachMock />,
  },
];

function BrowserChrome({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white">
      <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="ml-3 text-xs font-semibold text-slate-400 truncate">{title}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AdminMock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-slate-900">Club Overview</div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fall 2026</div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Players", value: "247", tone: "up", trend: "+12" },
          { label: "Teams", value: "18", tone: "up", trend: "+2" },
          { label: "Branches", value: "6", tone: "neutral", trend: "—" },
        ].map((s) => (
          <div key={s.label} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70">
            <div className="text-[9px] font-bold tracking-wider uppercase text-slate-400">{s.label}</div>
            <div className="text-lg font-extrabold text-slate-900">{s.value}</div>
            <div className="text-[9px] font-semibold text-emerald-600">{s.trend}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {["North Branch", "South Branch", "East Branch", "West Branch"].map((b, i) => (
          <div key={b} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50">
            <div className="w-6 h-6 rounded-lg shrink-0 bg-indigo-100" />
            <div className="flex-1 space-y-1">
              <div className="h-2 rounded-full bg-slate-200" style={{ width: `${75 - i * 10}%` }} />
              <div className="h-1.5 rounded-full bg-slate-100" style={{ width: "50%" }} />
            </div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgramMock() {
  return (
    <div className="space-y-3">
      <div className="text-sm font-extrabold text-slate-900">Programs & Tasks</div>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { title: "To Do", count: 5, color: "#94a3b8" },
          { title: "In Progress", count: 3, color: "#4f47e6" },
          { title: "Done", count: 8, color: "#10b981" },
        ].map((col) => (
          <div key={col.title} className="rounded-xl bg-slate-50 p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{col.title}</span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white text-slate-500">{col.count}</span>
            </div>
            <div className="space-y-1.5">
              {Array.from({ length: 2 }).map((_, ii) => (
                <div key={ii} className="p-1.5 rounded-lg bg-white shadow-sm border border-slate-100">
                  <div className="h-1.5 w-5 rounded-full mb-1" style={{ background: col.color }} />
                  <div className="h-1.5 rounded-full bg-slate-200 mb-1" style={{ width: "85%" }} />
                  <div className="h-1.5 rounded-full bg-slate-100" style={{ width: "60%" }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachMock() {
  return (
    <div className="space-y-3">
      <div className="text-sm font-extrabold text-slate-900">U14 Girls — Roster</div>
      <div className="grid grid-cols-2 gap-2">
        {["Emma R.", "Sofia M.", "Ava T.", "Olivia K."].map((p, i) => (
          <div key={p} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/70">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
              {p[0]}
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-bold text-slate-800">{p}</div>
              <div className="text-[9px] text-slate-400">#{10 + i} · MF</div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100">
        <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Next Session</div>
        <div className="text-xs font-semibold text-slate-700">Tue 6:30 PM · Field 3</div>
      </div>
    </div>
  );
}

export default function WhyHero({ onBookDemo }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const next = useCallback(() => {
    setActiveIdx((i) => (i + 1) % ROLE_VIEWS.length);
  }, []);

  useEffect(() => {
    const t = setInterval(next, 3500);
    return () => clearInterval(t);
  }, [next]);

  const active = ROLE_VIEWS[activeIdx];
  const Icon = active.icon;

  return (
    <section className="relative overflow-hidden bg-slate-50 dark:bg-[#101614]">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.14), transparent 70%)" }} />
      <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.3]" style={{ backgroundImage: "radial-gradient(hsl(var(--primary) / 0.15) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-28 md:pt-24 md:pb-32">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-primary text-primary bg-white/70 dark:bg-[#101614]/60 backdrop-blur-sm mb-7 pub-rise">
              <span className="text-xs font-extrabold tracking-wider uppercase">Why Clubs Choose Club Rudder</span>
            </div>
            <h1 className="pub-display text-4xl sm:text-5xl md:text-6xl mb-6 pub-rise" style={{ animationDelay: "0.2s" }}>
              You didn't sign up
              <span className="block text-primary" style={{ textShadow: "0 0 50px hsl(var(--primary) / 0.4)" }}>to run spreadsheets.</span>
            </h1>
            <p className="text-base md:text-lg leading-relaxed max-w-xl mb-8 text-slate-600 dark:text-[#cfcabd] pub-rise" style={{ animationDelay: "0.4s" }}>
              Club Rudder is the operations layer for multi-branch soccer clubs, and it works for any club sport. One shared system across every branch, every age group, and every team, so your club runs on decisions, not data entry.
            </p>
            <div className="flex items-center gap-3 flex-wrap pub-rise" style={{ animationDelay: "0.6s" }}>
              <button onClick={onBookDemo} className="pub-btn">
                <Calendar className="w-4 h-4" /> Book Demo
              </button>
              <a href="#workflows" className="pub-btn gh">
                See the Workflows <ArrowDown className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right — cycling role views */}
          <div className="pub-rise" style={{ animationDelay: "0.5s" }}>
            <div className="relative">
              {/* Role selector pills */}
              <div className="flex justify-center gap-2 mb-4">
                {ROLE_VIEWS.map((r, i) => {
                  const RIcon = r.icon;
                  const isActive = i === activeIdx;
                  return (
                    <button
                      key={r.label}
                      onClick={() => setActiveIdx(i)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all ${
                        isActive ? "text-white shadow-lg scale-105" : "bg-white dark:bg-[#17211d] text-slate-500 dark:text-[#a9a495] border-slate-200 dark:border-[#2a3a33] hover:border-slate-300"
                      }`}
                      style={isActive ? { background: r.color, borderColor: r.color } : undefined}
                    >
                      <RIcon className="w-3.5 h-3.5" />
                      {r.label}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdx}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.4 }}
                >
                  <BrowserChrome title={active.title}>
                    {active.render()}
                  </BrowserChrome>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mt-4">
                {ROLE_VIEWS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === activeIdx ? "w-6" : "w-1.5 bg-slate-300 dark:bg-[#3a4d44]"}`}
                    style={i === activeIdx ? { background: active.color } : undefined}
                    aria-label={`View ${i + 1}`}
                  />
                ))}
              </div>

              <p className="text-center text-xs font-semibold text-slate-400 dark:text-[#a9a495] mt-2">
                Same club. Three seats. One system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}