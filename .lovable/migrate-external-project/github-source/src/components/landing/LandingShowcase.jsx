import React from "react";
import { CheckCircle2 } from "lucide-react";
import LandingModuleGrid from "./LandingModuleGrid";

export default function LandingShowcase() {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-gradient-to-br from-primary/8 via-amber-50/20 to-slate-50 p-12 items-center justify-center">
      {/* Ambient glow accents */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative max-w-xl space-y-8">
        <div>
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary mb-4">
            Club Operating System
          </span>
          <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-4">
            One Platform. Every Team.
            <br />
            Every Player. <span className="text-accent">One Club.</span>
          </h1>
          <p className="text-slate-600 text-lg">
            A connected operating system for registration, scheduling, finance,
            communication, and player development — built on one shared record for
            every player, team, and payment.
          </p>
        </div>

        <LandingModuleGrid />

        <div className="border-l-4 border-accent bg-white/60 rounded-r-lg pl-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">
            One person. One team. One calendar. One financial record.
            One continuous player-development history.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {[
            "Reduce admin hours with automation",
            "Improve retention with better family experience",
            "Gain real-time visibility across the club",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 text-slate-700">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}