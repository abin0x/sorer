import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { ROLE_TOURS, MODULE_LABELS } from "./roleShowcaseData";
import { ROLE_SLIDES } from "./roleSlides";

export default function RoleTour() {
  const [activeKey, setActiveKey] = useState(ROLE_TOURS[0].key);
  const [slideIndex, setSlideIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const active = ROLE_TOURS.find((r) => r.key === activeKey);
  const slides = ROLE_SLIDES[activeKey] || [];

  const next = useCallback(() => {
    setSlideIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);
  const prev = () => setSlideIndex((i) => (i - 1 + slides.length) % slides.length);

  // Reset to first slide when role changes
  useEffect(() => {
    setSlideIndex(0);
  }, [activeKey]);

  // Auto-advance slideshow
  useEffect(() => {
    if (!playing || slides.length <= 1) return;
    const t = setInterval(next, 4200);
    return () => clearInterval(t);
  }, [playing, next, slides.length]);

  return (
    <div>
      {/* Role selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {ROLE_TOURS.map((role) => {
          const isActive = role.key === activeKey;
          const Icon = role.icon;
          return (
            <button
              key={role.key}
              onClick={() => setActiveKey(role.key)}
              className={`group flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-bold transition-all ${
                isActive ? "text-white shadow-lg scale-105" : "bg-white dark:bg-[#17211d] pub-muted border-slate-200 dark:border-[#2a3a33] hover:border-slate-300 dark:hover:border-[#3a4d44]"
              }`}
              style={isActive ? { background: role.color, borderColor: role.color } : undefined}
            >
              <Icon className="w-4 h-4" />
              {role.label}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8 items-start">
        {/* Left: description + capabilities */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${active.color}15` }}>
              <active.icon className="w-7 h-7" style={{ color: active.color }} />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-[#F5F1E8]">{active.label}</h3>
              <p className="text-sm font-semibold" style={{ color: active.color }}>{active.tagline}</p>
            </div>
          </div>
          <p className="pub-muted mb-6 leading-relaxed">{active.summary}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            {active.capabilities.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#2a3a33] bg-white dark:bg-[#17211d]"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${active.color}10` }}>
                  <c.icon className="w-4 h-4" style={{ color: active.color }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-[#F5F1E8]">{c.title}</div>
                  <div className="text-xs pub-muted mt-0.5 leading-snug">{c.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-[#2a3a33]">
            <div className="text-xs font-bold tracking-wider uppercase text-slate-400 dark:text-[#a9a495] mb-2">Modules this role uses</div>
            <div className="flex flex-wrap gap-2">
              {active.modules.map((m) => (
                <span key={m} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${active.color}10`, color: active.color }}>
                  {MODULE_LABELS[m] || m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: slideshow of dashboard views */}
        <div>
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeKey}-${slideIndex}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.45 }}
              >
                {slides[slideIndex]?.render(active.color)}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === slideIndex ? "w-6" : "w-1.5 bg-slate-300 dark:bg-[#3a4d44]"}`}
                  style={i === slideIndex ? { background: active.color } : undefined}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaying((p) => !p)}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-[#2a3a33] flex items-center justify-center pub-muted hover:bg-slate-50 dark:hover:bg-[#1c2a25]"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={prev}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-[#2a3a33] flex items-center justify-center pub-muted hover:bg-slate-50 dark:hover:bg-[#1c2a25]"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={next}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-[#2a3a33] flex items-center justify-center pub-muted hover:bg-slate-50 dark:hover:bg-[#1c2a25]"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-center mt-2">
            <span className="text-xs font-semibold pub-muted">{slides[slideIndex]?.title}</span>
          </div>
        </div>
      </div>
    </div>
  );
}