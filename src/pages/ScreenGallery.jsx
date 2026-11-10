import React from "react";
import { Link } from '@/lib/router-compat';
import { ArrowLeft, ArrowRight, LayoutGrid } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScreenSlideshow from "@/components/showcase/ScreenSlideshow";
import { group1Slides } from "@/components/showcase/slides/group1Slides";
import { group2Slides } from "@/components/showcase/slides/group2Slides";
import { group3Slides } from "@/components/showcase/slides/group3Slides";

const SECTIONS = [
  {
    eyebrow: "Leadership and Admin",
    title: "Club Operations",
    subtitle: "Club Director, Club Admin, and Bookkeeper — the back office that runs the club.",
    slides: group1Slides,
    roles: ["Club Director", "Club Admin", "Bookkeeper"],
  },
  {
    eyebrow: "Player Development",
    title: "Platform & Coaching",
    subtitle: "Platform Director and Coach — competitive oversight and player development.",
    slides: group2Slides,
    roles: ["Platform Director", "Coach"],
  },
  {
    eyebrow: "Joyful Participation",
    title: "Family Experience",
    subtitle: "Player and Parent — the on-field and at-home view of club life.",
    slides: group3Slides,
    roles: ["Player", "Parent"],
  },
];

export default function ScreenGallery() {
  return (
    <div className="bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <PublicNav />

      <section className="relative overflow-hidden pt-16 pb-8 bg-slate-50 dark:bg-[#101614]">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.14), transparent 70%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wider uppercase text-slate-500 hover:text-primary transition-colors mb-5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-primary text-primary bg-white/70 dark:bg-[#101614]/60 backdrop-blur-sm mb-5 pub-rise">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="text-xs font-extrabold tracking-wider uppercase">Platform Tour</span>
          </div>
          <h1 className="pub-display text-3xl sm:text-5xl mb-4 pub-rise" style={{ animationDelay: "0.2s" }}>
            Every role. <span className="text-primary">One tour.</span>
          </h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-[#a9a495] max-w-xl mx-auto pub-rise" style={{ animationDelay: "0.4s" }}>
            Three slideshows walk through Club Rudder by audience — club operations, platform and coaching, and the family experience. Each advances automatically; use the controls to pause or jump ahead.
          </p>
        </div>
      </section>

      {SECTIONS.map((section, si) => (
        <section key={section.title} className={`py-10 md:py-14 ${si % 2 === 1 ? "bg-slate-50 dark:bg-[#0d1311]" : ""}`}>
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-8">
              <div className="pub-eye mb-2">{section.eyebrow}</div>
              <h2 className="pub-display text-2xl md:text-3xl mb-3 text-slate-900 dark:text-[#F5F1E8]">{section.title}</h2>
              <p className="text-sm text-slate-500 dark:text-[#a9a495] max-w-lg mx-auto mb-4">{section.subtitle}</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {section.roles.map((r) => (
                  <span key={r} className="text-[10px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full border border-slate-200 dark:border-[#2a3a33] text-slate-600 dark:text-[#a9a495] bg-white dark:bg-[#17211d]">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <ScreenSlideshow slides={section.slides} title={section.title} />
          </div>
        </section>
      ))}

      <section className="py-12 md:py-16 bg-slate-50 dark:bg-[#0d1311]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="pub-eye mb-2">Ready to see it live?</div>
          <h2 className="pub-display text-2xl md:text-4xl mb-4 text-slate-900 dark:text-[#F5F1E8]">Start your free trial</h2>
          <p className="text-sm text-slate-500 dark:text-[#a9a495] max-w-lg mx-auto mb-6">
            Spin up a sandbox club with sample data and explore every screen yourself.
          </p>
          <Link to="/demo-access" className="pub-btn">Start free trial <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}