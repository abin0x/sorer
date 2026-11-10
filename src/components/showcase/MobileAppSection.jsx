import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, ChevronLeft, ChevronRight, Heart, Calendar, MessageSquare, CreditCard, Trophy, ClipboardList, Bell, Users, Target, TrendingUp, MapPin, Activity, ArrowLeft } from "lucide-react";

const INDIGO = "#4f46e5";
const SKY = "#0ea5e9";

// Each slide renders a mini app screen (header + content card + list rows)
// instead of a lone icon, so the phone reads like a real app.
const USER_TYPES = [
  {
    key: "families",
    label: "Families",
    icon: Heart,
    tagline: "Everything your household needs — in your pocket",
    accent: "#ec4899",
    slides: [
      { icon: Calendar, title: "Family Calendar", desc: "See every practice, game, and event for all your players in one synced calendar.", mock: "calendar" },
      { icon: CreditCard, title: "Payments & Invoices", desc: "Pay registration fees, view invoices, and track payment history — right from your phone.", mock: "payment" },
      { icon: MessageSquare, title: "Team Messaging", desc: "Chat directly with coaches and team managers. Never miss an important update.", mock: "chat" },
      { icon: Bell, title: "Smart Notifications", desc: "RSVP reminders, schedule changes, and game-day alerts pushed straight to you.", mock: "notifications" },
    ],
  },
  {
    key: "coaches",
    label: "Coaches",
    icon: ClipboardList,
    tagline: "Run your team from the sideline",
    accent: INDIGO,
    slides: [
      { icon: Users, title: "Roster Management", desc: "View your full roster, attendance, and player profiles with a tap.", mock: "roster" },
      { icon: Target, title: "E.P.I.C. Evaluations", desc: "Score players on Explosive, Precise, Insightful, Combative tenets — live at training.", mock: "evaluation" },
      { icon: Activity, title: "Skill & Fitness Tests", desc: "Record test results and track player development trends over the season.", mock: "progress" },
      { icon: MessageSquare, title: "Team Communication", desc: "Send messages, schedule changes, and match-day info to your whole team instantly.", mock: "chat" },
    ],
  },
  {
    key: "players",
    label: "Players",
    icon: Trophy,
    tagline: "Own your development journey",
    accent: SKY,
    slides: [
      { icon: TrendingUp, title: "My Progress", desc: "Track your skill scores, fitness benchmarks, and evaluation history over time.", mock: "progress" },
      { icon: Calendar, title: "My Schedule", desc: "Never miss a session — see your upcoming practices, games, and events.", mock: "calendar" },
      { icon: Target, title: "Goals & Feedback", desc: "See coach feedback, development goals, and what to work on next.", mock: "evaluation" },
      { icon: Trophy, title: "Achievements", desc: "Celebrate milestones, test-day results, and season highlights.", mock: "notifications" },
    ],
  },
];

// Renders a mini app screen inside the phone frame, keyed by mock type.
function MockScreen({ mock, accent, slide }) {
  const Icon = slide.icon;
  const bar = (w) => <div className="h-2 rounded-full" style={{ width: w, background: "#e2e8f0" }} />;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* App header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100" style={{ background: `${accent}08` }}>
        <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-bold text-slate-700 truncate">{slide.title}</span>
      </div>

      {/* Hero card */}
      <div className="mx-3 mt-3 rounded-xl p-3 flex items-center gap-2.5" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
        <div className="w-9 h-9 rounded-lg bg-white/25 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-extrabold text-xs leading-tight">{slide.title}</p>
          <p className="text-white/80 text-[10px] mt-0.5 truncate">{slide.desc}</p>
        </div>
      </div>

      {/* Content rows — varies by mock type to feel like a real screen */}
      <div className="flex-1 px-3 pt-3 pb-2 space-y-2 overflow-hidden">
        {mock === "calendar" && (
          <>
            <div className="grid grid-cols-7 gap-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center">
                  <span className="text-[8px] text-slate-400 font-bold">{d}</span>
                  <div className={`h-5 rounded-md mt-0.5 ${[2, 4].includes(i) ? "" : "bg-slate-100"}`} style={[2, 4].includes(i) ? { background: accent } : {}} />
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-1">
              {["Tue · Practice 5:30pm", "Thu · Game 11:00am"].map((t, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                  <div className="w-6 h-6 rounded-md shrink-0" style={{ background: `${accent}20` }} />
                  <div className="flex-1"><div className="h-1.5 rounded-full mb-1" style={{ background: "#cbd5e1", width: "70%" }} /><div className="h-1.5 rounded-full" style={{ background: "#e2e8f0", width: "45%" }} /></div>
                </div>
              ))}
            </div>
          </>
        )}
        {mock === "payment" && (
          <>
            <div className="rounded-xl p-3 text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}>
              <p className="text-[9px] text-white/80 font-semibold">BALANCE DUE</p>
              <p className="text-lg font-extrabold">$485.00</p>
              <div className="h-1.5 rounded-full bg-white/25 mt-2"><div className="h-1.5 rounded-full bg-white" style={{ width: "60%" }} /></div>
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                <CreditCard className="w-4 h-4 text-slate-300" />
                <div className="flex-1"><div className="h-1.5 rounded-full mb-1" style={{ background: "#cbd5e1", width: "55%" }} /><div className="h-1.5 rounded-full" style={{ background: "#e2e8f0", width: "35%" }} /></div>
              </div>
            ))}
          </>
        )}
        {mock === "chat" && (
          <>
            {[false, true, false].map((mine, i) => (
              <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="rounded-2xl px-3 py-2 max-w-[75%]" style={mine ? { background: accent } : { background: "#f1f5f9" }}>
                  <div className="h-1.5 rounded-full mb-1" style={{ background: mine ? "rgba(255,255,255,0.5)" : "#cbd5e1", width: "60px" }} />
                  <div className="h-1.5 rounded-full" style={{ background: mine ? "rgba(255,255,255,0.35)" : "#e2e8f0", width: "40px" }} />
                </div>
              </div>
            ))}
          </>
        )}
        {mock === "notifications" && (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-lg p-2">
                <div className="w-6 h-6 rounded-full shrink-0 mt-0.5" style={{ background: `${accent}20` }} />
                <div className="flex-1 space-y-1 pt-0.5"><div className="h-1.5 rounded-full" style={{ background: "#cbd5e1", width: "65%" }} /><div className="h-1.5 rounded-full" style={{ background: "#e2e8f0", width: "40%" }} /></div>
              </div>
            ))}
          </>
        )}
        {mock === "roster" && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                <div className="w-7 h-7 rounded-full shrink-0" style={{ background: `${accent}20` }} />
                <div className="flex-1 space-y-1"><div className="h-1.5 rounded-full" style={{ background: "#cbd5e1", width: "55%" }} /><div className="h-1.5 rounded-full" style={{ background: "#e2e8f0", width: "35%" }} /></div>
                <div className="w-4 h-4 rounded-full" style={{ background: i < 3 ? "#22c55e" : "#e2e8f0" }} />
              </div>
            ))}
          </>
        )}
        {mock === "evaluation" && (
          <>
            {["Explosive", "Precise", "Insightful", "Combative"].map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 w-16 shrink-0">{t}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${70 - i * 12}%`, background: accent }} /></div>
              </div>
            ))}
          </>
        )}
        {mock === "progress" && (
          <>
            <div className="flex items-end justify-between gap-1 h-16 px-1">
              {[40, 55, 45, 70, 60, 85].map((h, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 5 ? accent : `${accent}40` }} />
              ))}
            </div>
            <div className="space-y-2 pt-1">{bar("70%")}{bar("50%")}</div>
          </>
        )}
      </div>
    </div>
  );
}

function PhoneSlideshow({ slides, accent }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), [slides.length]);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(next, 3500);
    return () => clearInterval(t);
  }, [playing, next]);

  const slide = slides[index];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phone frame */}
      <div className="relative w-[240px] h-[480px] bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-b-2xl z-10" />
        <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden flex flex-col">
          {/* Status bar */}
          <div className="h-8 bg-slate-50 flex items-center justify-between px-5 text-[9px] font-semibold text-slate-400 shrink-0">
            <span>9:41</span>
            <span>Club Rudder</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="flex-1 flex flex-col"
            >
              <MockScreen mock={slide.mock} accent={accent} slide={slide} />
            </motion.div>
          </AnimatePresence>
          {/* Bottom nav dots */}
          <div className="h-12 flex items-center justify-center gap-1.5 border-t border-slate-100 shrink-0">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); setPlaying(false); }}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === index ? 20 : 6, background: i === index ? accent : "#CBD5E1" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button onClick={() => { prev(); setPlaying(false); }} className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <span className="text-xs font-bold text-slate-400">{index + 1} / {slides.length}</span>
        <button onClick={() => { next(); setPlaying(false); }} className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
}

export default function MobileAppSection() {
  const [activeKey, setActiveKey] = useState(USER_TYPES[0].key);
  const active = USER_TYPES.find((u) => u.key === activeKey);

  return (
    <section id="mobile-app" className="py-16 md:py-20 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 dark:border-[#2a3a33] mb-4">
            <Smartphone className="w-4 h-4 text-primary" />
            <span className="text-xs font-extrabold tracking-wider uppercase pub-muted">Companion Mobile App</span>
          </div>
          <h2 className="pub-display text-3xl md:text-5xl mb-3 text-slate-900 dark:text-[#F5F1E8]">
            Your whole club, on every phone
          </h2>
          <p className="pub-muted max-w-2xl mx-auto">
            The Club Rudder companion app keeps families, coaches, and players connected to the club
            wherever they are — schedules, messaging, payments, and player development, all in your pocket.
          </p>
        </div>

        {/* User type tabs */}
        <div className="flex justify-center gap-3 mb-10 flex-wrap">
          {USER_TYPES.map((u) => {
            const TabIcon = u.icon;
            const isActive = u.key === activeKey;
            return (
              <button
                key={u.key}
                onClick={() => setActiveKey(u.key)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  isActive ? "text-white shadow-lg" : "bg-white dark:bg-[#17211d] border border-slate-200 dark:border-[#2a3a33] pub-muted hover:bg-slate-50 dark:hover:bg-[#1c2a25]"
                }`}
                style={isActive ? { background: u.accent } : {}}
              >
                <TabIcon className="w-4 h-4" />
                {u.label}
              </button>
            );
          })}
        </div>

        {/* Active slideshow + features */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="flex justify-center">
            <PhoneSlideshow key={active.key} slides={active.slides} accent={active.accent} />
          </div>
          <div>
            <h3 className="pub-display text-2xl mb-2 text-slate-900 dark:text-[#F5F1E8]">
              {active.label}
            </h3>
            <p className="pub-muted mb-6">{active.tagline}</p>
            <div className="space-y-3">
              {active.slides.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="flex items-start gap-3 pub-card p-4"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${active.accent}15` }}>
                      <Icon className="w-5 h-5" style={{ color: active.accent }} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-[#F5F1E8]">{s.title}</div>
                      <div className="text-xs pub-muted mt-0.5">{s.desc}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}