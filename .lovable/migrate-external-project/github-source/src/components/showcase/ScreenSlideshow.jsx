import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { NAVY } from "./slides/slideTheme";

export default function ScreenSlideshow({ slides, title = "Screen Tour" }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setIndex((p) => (p + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIndex((p) => (p - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  // Reset index when the slide set changes
  useEffect(() => { setIndex(0); }, [slides]);

  const slide = slides[index];

  return (
    <div className="relative w-full">
      <div
        className="bg-white dark:bg-[#17211d] rounded-2xl border border-slate-200 dark:border-[#2a3a33] shadow-2xl overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-[#2a3a33] bg-slate-50 dark:bg-[#101614]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4 h-6 bg-white dark:bg-[#101614] rounded-md border border-slate-200 dark:border-[#2a3a33] flex items-center px-3 text-[10px] text-slate-400">
            clubrudder.com / {slide.title.toLowerCase().replace(/\s+/g, "-")}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary">{slide.category}</span>
        </div>

        {/* Slide stage */}
        <div className="relative h-[380px] sm:h-[440px] overflow-hidden bg-slate-50 dark:bg-[#101614]">
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
                  <div className="text-xs text-slate-500 dark:text-[#a9a495]">{slide.subtitle}</div>
                </div>
                <div className="text-[10px] font-bold tracking-wider text-slate-400">
                  {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={prev}
          aria-label="Previous slide"
          className="w-10 h-10 rounded-full border border-slate-200 dark:border-[#2a3a33] bg-white dark:bg-[#17211d] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#1f2b26] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: NAVY }} />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play" : "Pause"}
            className="w-9 h-9 rounded-full border border-slate-200 dark:border-[#2a3a33] bg-white dark:bg-[#17211d] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#1f2b26] transition-colors"
          >
            {paused ? <Play className="w-4 h-4 text-primary" /> : <Pause className="w-4 h-4 text-primary" />}
          </button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === index ? "w-8" : "w-2"}`}
                style={{ background: i === index ? "hsl(var(--primary))" : "#CBD5E1" }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={next}
          aria-label="Next slide"
          className="w-10 h-10 rounded-full border border-slate-200 dark:border-[#2a3a33] bg-white dark:bg-[#17211d] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#1f2b26] transition-colors"
        >
          <ChevronRight className="w-5 h-5" style={{ color: NAVY }} />
        </button>
      </div>
    </div>
  );
}