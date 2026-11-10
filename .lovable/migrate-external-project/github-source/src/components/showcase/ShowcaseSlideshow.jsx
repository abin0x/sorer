import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Calendar, Clock, MapPin, Users, DollarSign, ListTodo, Target, TrendingUp } from "lucide-react";

const NAVY = "#0B162B";
const GREEN = "#399F7D";
const GREY = "#94A3B8";
const LIGHT = "#E5E7EB";

const slides = [
  {
    title: "Kanban Board",
    subtitle: "Drag-and-drop program management with RACI assignments",
    render: () => (
      <div className="flex gap-3 h-full p-4 bg-slate-50 rounded-lg">
        {[
          { name: "TO DO", color: GREY, items: ["Field Allocation", "Tournament Planning"] },
          { name: "IN PROGRESS", color: "#3B82F6", items: ["Registration Drive", "Marketing Campaign"] },
          { name: "IN REVIEW", color: "#F59E0B", items: ["Coach Onboarding"] },
          { name: "DONE", color: GREEN, items: ["Uniform Ordering"] },
        ].map((col) => (
          <div key={col.name} className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-[10px] font-bold tracking-wider" style={{ color: NAVY }}>{col.name}</span>
              <span className="text-[10px] text-slate-400 ml-auto">{col.items.length}</span>
            </div>
            {col.items.map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-md p-2 shadow-sm">
                <div className="text-[10px] font-semibold" style={{ color: NAVY }}>{item}</div>
                <div className="flex items-center gap-1 mt-1.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[7px] font-bold text-emerald-700">JD</div>
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${40 + i * 20}%`, background: GREEN }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Registration & Teams",
    subtitle: "From inquiry to roster — manage the full player lifecycle",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Team Roster</div>
          <div className="text-[9px] text-slate-500">Jaguars Novi · U13 Boys Blue</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: "Liam Anderson", pos: "Forward", num: "9" },
            { name: "Noah Martinez", pos: "Midfielder", num: "8" },
            { name: "Ethan Clark", pos: "Defender", num: "4" },
            { name: "Lucas Wright", pos: "Goalkeeper", num: "1" },
            { name: "Mason Hill", pos: "Winger", num: "11" },
            { name: "Logan Scott", pos: "Defender", num: "5" },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-2 border border-slate-200 rounded-md p-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">{p.num}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold truncate" style={{ color: NAVY }}>{p.name}</div>
                <div className="text-[8px] text-slate-500 uppercase tracking-wider">{p.pos}</div>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider">Roster 11/22 · 50% full</div>
          <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "50%", background: GREEN }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Player Detail",
    subtitle: "E.P.I.C. evaluations, skill tests, and full player profile",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-[10px] font-bold">LA</div>
            <div>
              <div className="text-xs font-bold" style={{ color: NAVY }}>Liam Anderson</div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">U13 Boys Blue · Forward</div>
            </div>
          </div>
          <div className="flex gap-1">
            {["E", "P", "I", "C"].map((t, i) => (
              <div key={t} className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: i === 0 ? GREEN : i === 1 ? "#3B82F6" : i === 2 ? "#F59E0B" : "#8B5CF6" }}>{t}</div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 flex-1">
          {[
            { label: "SPEED", val: 85 },
            { label: "TECHNIQUE", val: 72 },
            { label: "AGILITY", val: 78 },
            { label: "POWER", val: 68 },
            { label: "VISION", val: 80 },
            { label: "COMPOSURE", val: 75 },
          ].map((m) => (
            <div key={m.label} className="border border-slate-200 rounded-md p-2 flex flex-col justify-center">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 mb-1">{m.label}</div>
              <div className="text-lg font-extrabold" style={{ color: NAVY }}>{m.val}</div>
              <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${m.val}%`, background: GREEN }} />
              </div>
            </div>
          ))}
        </div>
        <div className="border border-slate-200 rounded-md p-2">
          <div className="text-[8px] font-bold tracking-wider text-slate-500 mb-1">RECENT EVALUATION</div>
          <div className="text-[10px] text-slate-600">"Strong first touch and improving decision-making in transition. Focus on weak-foot passing."</div>
        </div>
      </div>
    ),
  },
  {
    title: "Program Details",
    subtitle: "Click any program card to open a full details popup",
    render: () => (
      <div className="h-full p-3 bg-slate-900/40 rounded-lg flex items-center justify-center">
        {/* Mock dialog popup */}
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Dialog header — ADISAL clean white */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between">
            <div>
              <div className="text-sm font-bold" style={{ color: NAVY }}>Fall Registration Drive 2026</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">In Progress</span>
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">High Priority</span>
              </div>
            </div>
            <div className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
          {/* Dialog body — ADISAL metric tiles */}
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: ListTodo, label: "TASKS", val: "8/12", color: NAVY },
                { icon: DollarSign, label: "BUDGET", val: "$15K", color: NAVY },
                { icon: Users, label: "STAFF", val: "4", color: NAVY },
                { icon: Target, label: "DONE", val: "67%", color: GREEN },
              ].map((s) => (
                <div key={s.label} className="border border-slate-200 rounded-md p-2 text-center">
                  <s.icon className="w-3.5 h-3.5 mx-auto text-slate-400 mb-1" />
                  <div className="text-xs font-extrabold" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-[7px] font-bold tracking-wider text-slate-500 uppercase">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center gap-1.5 text-slate-600"><Calendar className="w-3 h-3 text-slate-400" /> <span className="font-medium">Season:</span> 2026-2027</div>
              <div className="flex items-center gap-1.5 text-slate-600"><MapPin className="w-3 h-3 text-slate-400" /> <span className="font-medium">Branches:</span> Novi, Northville</div>
              <div className="flex items-center gap-1.5 text-slate-600"><Clock className="w-3 h-3 text-slate-400" /> <span className="font-medium">Due:</span> Oct 15, 2026</div>
            </div>
            <div>
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">Tasks</div>
              <div className="space-y-1">
                {["Design registration form", "Set up payment portal", "Email blast to families"].map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <div className={`w-3 h-3 rounded-full border ${i < 2 ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`} />
                    <span className={i < 2 ? "text-slate-400 line-through" : "text-slate-700"}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function ShowcaseSlideshow() {
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const next = () => { setIndex((prev) => (prev + 1) % slides.length); setAutoPlay(false); };
  const prev = () => { setIndex((prev) => (prev - 1 + slides.length) % slides.length); setAutoPlay(false); };

  const slide = slides[index];

  return (
    <div className="relative w-full">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4 h-6 bg-white rounded-md border border-slate-200 flex items-center px-3 text-[10px] text-slate-400">
            jaguars-kanban.app / {slide.title.toLowerCase().replace(/\s+/g, "-")}
          </div>
        </div>
        <div className="relative h-[360px] sm:h-[400px] overflow-hidden bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="flex-1 p-4">{slide.render()}</div>
              <div className="px-4 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold" style={{ color: NAVY }}>{slide.title}</div>
                  <div className="text-xs text-slate-500">{slide.subtitle}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={prev}
          className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: NAVY }} />
        </button>
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); setAutoPlay(false); }}
              className={`h-2 rounded-full transition-all ${i === index ? "w-8" : "w-2"}`}
              style={{ background: i === index ? GREEN : "#CBD5E1" }}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ChevronRight className="w-5 h-5" style={{ color: NAVY }} />
        </button>
      </div>
    </div>
  );
}