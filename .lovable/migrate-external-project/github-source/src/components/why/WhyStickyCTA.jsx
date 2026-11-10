import React from "react";
import { Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function WhyStickyCTA({ visible, onBookDemo }) {
  return (
    <div
      className={`safe-bottom fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-white/95 dark:bg-[#101614]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#2a3a33] shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-extrabold text-slate-900 dark:text-[#F5F1E8] truncate">
              See Club Rudder on your club.
            </span>
            <span className="hidden sm:block text-xs text-slate-500 dark:text-[#a9a495]">
              Twenty minutes. No slide deck.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onBookDemo} className="pub-btn sm">
              <Calendar className="w-3.5 h-3.5" /> Book a demo
            </button>
            <Link to="/create-club" className="pub-btn gh sm hidden sm:inline-flex">
              Start free trial <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}