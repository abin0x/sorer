import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MousePointerClick, Cog, UserCheck, Rocket, Check, Calendar } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import BookDemoDialog from "@/components/public/BookDemoDialog";
import usePageMeta from "@/lib/usePageMeta";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Click migrate.",
    desc: "Upload your export from any platform — a CSV or Excel file is all we need to start.",
  },
  {
    icon: Cog,
    title: "We do the heavy lifting.",
    desc: "Our automated system maps, cleans, and imports your data for you. No manual re-entry, no technical setup on your side.",
  },
  {
    icon: UserCheck,
    title: "A human reviews it.",
    desc: "A Club Rudder support specialist checks every migration before you go live, so nothing lands in the wrong place.",
  },
  {
    icon: Rocket,
    title: "You confirm.",
    desc: "Review the migration report and approve it. If anything is off, we fix it — free.",
  },
];

const CARRIED_OVER = [
  "Players",
  "Guardians & family accounts",
  "Teams & rosters",
  "Coaches & staff",
  "Schedules & calendars",
  "Payment history",
];

const SOURCES = [
  {
    id: "teamsnap",
    title: "Switching from TeamSnap",
    body: [
      "Send us your export and your players and their guardians, teams and rosters, coaches, schedules and payment history all come across in one pass. We map each record into Club Rudder's structure, then clean up duplicates and missing family links before a specialist reviews the result.",
      "Nothing is deleted from your old system, and you keep exporting from it while we work — most clubs keep both running until you confirm the migration report looks right.",
    ],
  },
  {
    id: "sportsengine",
    title: "Switching from SportsEngine",
    body: [
      "We take your players and guardians, teams and rosters, coaches, schedules and payment history, and map them into one club-wide system — so every branch ends up on the same roster and the same payment ledger.",
      "Your history comes with you: past registrations and payment records stay on each family's account, so you are not starting from a blank ledger in your first season.",
    ],
  },
  {
    id: "sprocket",
    title: "Switching from Sprocket Sports",
    body: [
      "Players, guardians, teams, coaches, schedules and payment history export out of your current setup and import into Club Rudder, with our automated mapping doing the field-by-field work.",
      "Add-on modules are yours to switch on after the import, so you can migrate first and expand later without re-importing anything.",
    ],
  },
  {
    id: "spreadsheet",
    title: "Switching from a spreadsheet or CSV",
    body: [
      "If your club runs on a spreadsheet, upload it as CSV or Excel. Columns for players, guardians, teams, coaches, schedules and payment history are all mapped for you, and we flag anything that needs a human decision — like a missing guardian or a duplicate name.",
      "You do not need a perfect file to start. We clean up dates, phone numbers and name formats during the import, and you review the result before anything goes live.",
    ],
  },
];

export default function Migration() {
  const [demoOpen, setDemoOpen] = useState(false);

  usePageMeta({
    title: "Free Club Data Migration from Any Platform | Club Rudder",
    description: "Switch to Club Rudder with free, human-verified data migration. Players, guardians, teams, coaches, schedules and payment history come across in a day.",
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#101614] text-slate-900 dark:text-[#F5F1E8]">
      <PublicNav />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="pub-eye mb-3">The Migration Guarantee</div>
        <h1 className="pub-display text-3xl sm:text-4xl md:text-6xl mb-5">
          Switch to Club Rudder: free, human-verified data migration
        </h1>
        <p className="text-lg pub-muted max-w-2xl mx-auto mb-8">
          Switching platforms shouldn't feel like a gamble. Every Club Rudder migration starts with a single
          click — and ends with a member of our support team personally verifying that your data landed
          exactly where it should.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/create-club" className="pub-btn">
            Start free trial <ArrowRight className="w-4 h-4" />
          </Link>
          <button onClick={() => setDemoOpen(true)} className="pub-btn gh">
            <Calendar className="w-4 h-4" />
            Book a demo
          </button>
        </div>
        <p className="mt-6 text-sm font-semibold pub-muted">
          No migration fee. Data imports in a day, and most founding clubs are fully live in about 3 days.
        </p>
      </section>

      {/* How it works */}
      <section className="py-12 md:py-16 bg-slate-50 dark:bg-[#0d1311]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="pub-display text-3xl md:text-5xl text-slate-900 dark:text-[#F5F1E8]">
              How the migration works
            </h2>
            <p className="pub-muted max-w-2xl mx-auto mt-3">
              Four steps, one of which is ours to carry — and a specialist checks every record before you go live.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="pub-card p-6 text-center">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-xs font-extrabold uppercase tracking-wider mb-1.5 text-primary">Step {i + 1}</div>
                  <h3 className="pub-display text-lg mb-1.5 text-slate-900 dark:text-[#F5F1E8]">{s.title}</h3>
                  <p className="text-sm pub-muted">{s.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="pub-card p-6 mt-8 max-w-3xl mx-auto">
            <h3 className="pub-display text-lg mb-4 text-slate-900 dark:text-[#F5F1E8]">What comes over</h3>
            <ul className="grid sm:grid-cols-2 gap-2.5">
              {CARRIED_OVER.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm pub-muted mt-4">
              Whatever you are running today, the same data comes across — and we fix anything we miss at no cost.
            </p>
          </div>
        </div>
      </section>

      {/* Per-platform sections */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="pub-display text-3xl md:text-4xl mb-10 text-center text-slate-900 dark:text-[#F5F1E8]">
            What switching looks like
          </h2>
          <div className="space-y-10">
            {SOURCES.map((src) => (
              <div key={src.id} className="pub-card p-6 md:p-8">
                <h2 className="pub-display text-xl md:text-2xl mb-3 text-slate-900 dark:text-[#F5F1E8]">{src.title}</h2>
                {src.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 30)} className="text-sm md:text-base pub-muted mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-3xl p-10 md:p-14 text-center" style={{ background: "#F5F1E8", color: "#101614" }}>
            <h2 className="pub-display text-3xl md:text-4xl mb-4">Bring your club across.</h2>
            <p className="mb-8 max-w-xl mx-auto pub-muted">
              Start a 30-day free trial — no credit card required — and we'll migrate your data with a specialist
              verifying every record.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/create-club" className="pub-btn">Start free trial <ArrowRight className="w-4 h-4" /></Link>
              <button onClick={() => setDemoOpen(true)} className="pub-btn gh">Book a demo</button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}