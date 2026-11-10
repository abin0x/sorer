import React from "react";
import { motion } from "framer-motion";
import { Check, Circle, ArrowRight } from "lucide-react";

/* ===== Mock visuals for each workflow ===== */

function MockFrame({ title, children }) {
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

/* 1 — Season Setup Checklist */
function SeasonSetupMock() {
  const items = [
    { label: "Registration", done: true },
    { label: "Compliance", done: true },
    { label: "Rosters", done: true },
    { label: "Coach Assignments", done: false },
    { label: "Field Permits", done: false },
  ];
  const completed = items.filter((i) => i.done).length;
  const pct = Math.round((completed / items.length) * 100);
  const circumference = 2 * Math.PI * 28;
  return (
    <MockFrame title="clubrudder.com/season-setup">
      <div className="flex items-start gap-5">
        <div className="relative shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
              cx="36" cy="36" r="28" fill="none" stroke="#4f47e6" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (pct / 100) * circumference}
              transform="rotate(-90 36 36)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-extrabold text-slate-900">{pct}%</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Season Readiness</div>
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              {item.done ? (
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-amber-300 flex items-center justify-center shrink-0">
                  <Circle className="w-1.5 h-1.5 text-amber-400" />
                </div>
              )}
              <span className={`text-xs font-semibold ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </MockFrame>
  );
}

/* 2 — Tryout Pipeline */
function TryoutPipelineMock() {
  const stages = [
    { label: "Registered", count: 184, pct: 100, color: "#4f47e6" },
    { label: "Attended", count: 142, pct: 77, color: "#2563eb" },
    { label: "Offered", count: 68, pct: 37, color: "#059669" },
    { label: "Accepted", count: 52, pct: 28, color: "#10b981" },
  ];
  return (
    <MockFrame title="clubrudder.com/tryouts/pipeline">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Tryout Pipeline · U12–U14</div>
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700">{s.label}</span>
              <span className="text-xs font-bold text-slate-900">{s.count} <span className="text-slate-400 font-normal">({s.pct}%)</span></span>
            </div>
            <div className="h-6 rounded-lg overflow-hidden bg-slate-100">
              <div
                className="h-full rounded-lg flex items-center justify-end pr-2"
                style={{ width: `${s.pct}%`, background: s.color, opacity: 0.85 }}
              />
            </div>
            {i < stages.length - 1 && (
              <div className="text-[10px] text-rose-500 font-semibold ml-1 mt-0.5">
                ↓ {stages[i].count - stages[i + 1].count} dropped ({Math.round((1 - stages[i + 1].count / stages[i].count) * 100)}%)
              </div>
            )}
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

/* 3 — Branch Health */
function BranchHealthMock() {
  const branches = [
    { name: "North", retention: "92%", reg: "+14", status: "healthy" },
    { name: "South", retention: "78%", reg: "+6", status: "watch" },
    { name: "East", retention: "65%", reg: "-3", status: "alert" },
    { name: "West", retention: "88%", reg: "+9", status: "healthy" },
    { name: "Central", retention: "71%", reg: "+2", status: "watch" },
    { name: "Lakeside", retention: "95%", reg: "+11", status: "healthy" },
  ];
  const chip = {
    healthy: "bg-emerald-50 text-emerald-600",
    watch: "bg-amber-50 text-amber-600",
    alert: "bg-rose-50 text-rose-600",
  };
  return (
    <MockFrame title="clubrudder.com/branch-health">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Branch Health · Monday Review</div>
      <div className="grid grid-cols-2 gap-2.5">
        {branches.map((b) => (
          <div key={b.name} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800">{b.name}</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${chip[b.status]}`}>
                {b.status === "healthy" ? "Healthy" : b.status === "watch" ? "Watch" : "Alert"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Retention</span>
              <span className="font-bold text-slate-700">{b.retention}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] mt-0.5">
              <span className="text-slate-400">New Reg.</span>
              <span className={`font-bold ${b.reg.startsWith("-") ? "text-rose-500" : "text-emerald-600"}`}>{b.reg}</span>
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

/* 4 — Bookkeeping & QuickBooks Sync */
function BookkeepingMock() {
  const expenses = [
    { desc: "Field Rental — Lakeside Park", amount: "$420.00", cat: "Facilities", synced: false },
    { desc: "Referee Fees — U14 Match", amount: "$85.00", cat: "Match Day", synced: true },
    { desc: "Coach Stipend — M. Torres", amount: "$1,200.00", cat: "Payroll", synced: false },
  ];
  return (
    <MockFrame title="clubrudder.com/bookkeeping">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Expense Management</div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          QBO Synced
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Club Rudder expense list */}
        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-2">Club Rudder</div>
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.desc} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-700 truncate">{e.desc}</div>
                  <div className="text-[9px] text-slate-400">{e.cat}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-slate-900">{e.amount}</div>
                  <div className={`text-[8px] font-bold ${e.synced ? "text-emerald-500" : "text-amber-500"}`}>
                    {e.synced ? "Synced" : "Pending"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* QBO matching transactions */}
        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2">QuickBooks Online</div>
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.desc} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-700 truncate">{e.cat}</div>
                  <div className="text-[9px] text-slate-400">{e.synced ? "Matched" : "Awaiting"}</div>
                </div>
                <div className="text-[10px] font-bold text-slate-900 shrink-0">{e.amount}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="text-center text-[10px] font-semibold text-slate-400 mt-3">Same amount. Same category. Two-way sync.</div>
    </MockFrame>
  );
}

/* 5 — Player Development & Family Engagement */
function PlayerDevMock() {
  return (
    <MockFrame title="clubrudder.com · Player Development">
      <div className="grid grid-cols-2 gap-3">
        {/* Coach view — logging evaluation */}
        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2">Coach View</div>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-emerald-700">JM</span>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-800 truncate">Jordan Miles</div>
              <div className="text-[9px] text-slate-400">U14 Girls · Forward</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold uppercase text-slate-400">Session Evaluation</div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 w-14">First touch</span>
              <div className="h-2 rounded-full bg-emerald-200 flex-1" style={{ width: "85%" }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 w-14">Weak foot</span>
              <div className="h-2 rounded-full bg-emerald-200 flex-1" style={{ width: "55%" }} />
            </div>
            <div className="text-[9px] text-slate-500 italic mt-1.5">"Strong first touch. Working on weak foot."</div>
          </div>
        </div>
        {/* Parent view — player profile */}
        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-2">Parent View</div>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-indigo-700">JM</span>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-800 truncate">Jordan Miles</div>
              <div className="text-[9px] text-slate-400">Recent feedback</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="text-[9px] text-slate-600 italic">"Strong first touch. Working on weak foot."</div>
            <div className="pt-1.5 border-t border-slate-100 space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-indigo-200 shrink-0" />
                <span className="text-[9px] text-slate-500">Practice Tue 6:00 PM</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-indigo-200 shrink-0" />
                <span className="text-[9px] text-slate-500">Game Sat 10:00 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="text-center text-[10px] font-semibold text-slate-400 mt-3">Same player. Two seats. Real feedback.</div>
    </MockFrame>
  );
}

/* 6 — Your Club, Your Brand */
function BrandingMock() {
  const brands = [
    { name: "Riverside SC", primary: "#399F7D", bg: "#f0fdf4" },
    { name: "Lakeshore FC", primary: "#2563eb", bg: "#eff6ff" },
  ];
  return (
    <MockFrame title="clubrudder.com · Tenant Branding">
      <div className="grid grid-cols-2 gap-3">
        {brands.map((b) => (
          <div key={b.name} className="rounded-xl border border-slate-200 overflow-hidden" style={{ background: b.bg }}>
            <div className="px-3 py-2 flex items-center gap-2" style={{ background: b.primary }}>
              <div className="w-4 h-4 rounded bg-white/30" />
              <span className="text-[10px] font-bold text-white">{b.name}</span>
            </div>
            <div className="p-3 space-y-1.5">
              <div className="h-2 rounded-full" style={{ background: b.primary, opacity: 0.3, width: "90%" }} />
              <div className="h-2 rounded-full" style={{ background: b.primary, opacity: 0.2, width: "70%" }} />
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <div className="h-8 rounded-lg" style={{ background: b.primary, opacity: 0.15 }} />
                <div className="h-8 rounded-lg" style={{ background: b.primary, opacity: 0.1 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center text-[10px] font-semibold text-slate-400 mt-3">Your colors. Your logo. Every screen.</div>
    </MockFrame>
  );
}

/* ===== Workflow data ===== */
const WORKFLOWS = [
  {
    num: "01",
    title: "Season Setup",
    headline: "Know your season is ready before it starts.",
    body: "A live checklist across every branch shows what's complete, what's in progress, and what's blocking kickoff — registration, compliance, rosters, coach assignments, field permits. No more guessing which location is behind.",
    stop: "chasing branch directors for status updates in the last week of August.",
    mock: SeasonSetupMock,
  },
  {
    num: "02",
    title: "Tryout Pipeline",
    headline: "Every tryout. Every player. One funnel.",
    body: "Registration → attendance → offer → acceptance, tracked by branch, age group, and gender. Spot a branch that's under-registered three weeks out — not three days out. Route supplemental tryouts, elite tryouts, and main tryouts through the same pipeline without losing a single player.",
    stop: "rebuilding tryout lists in a spreadsheet the night before.",
    mock: TryoutPipelineMock,
  },
  {
    num: "03",
    title: "Branch Health",
    headline: "Six locations. One screen.",
    body: "Retention, new registrations, cost per registration, and roster status for every branch side by side — with automatic flags for the ones that need attention. This is the screen directors open every Monday morning.",
    stop: "opening six tabs to answer one question.",
    mock: BranchHealthMock,
  },
  {
    num: "04",
    title: "Bookkeeping & QuickBooks Sync",
    headline: "Your books and your club, finally in sync.",
    body: "Club Rudder handles the money that actually moves through a soccer club — registration fees, team fees, referee payments, field rentals, tournament entries, coach stipends, and reimbursements — natively, with a two-way QuickBooks Online sync. Transactions flow into QBO with the right categories, classes, and vendors already applied. Your treasurer stops reconciling in a spreadsheet. Your board sees real numbers.",
    stop: "chasing receipts in November for expenses that happened in March, and re-entering the same transactions in two systems.",
    mock: BookkeepingMock,
  },
  {
    num: "05",
    title: "Player Development & Family Engagement",
    headline: "The part families actually see.",
    body: "Player profiles, coach evaluations, development notes, and progress tracking live in one place — visible to the coach, the player, and the family at the right level. Coaches log sessions and assessments in seconds. Parents get real feedback instead of a group text. Families stay informed, players stay engaged, and your club looks organized from the first login.",
    stop: "answering \"how is my kid doing?\" with a vague answer, and losing families at the end of the season because they never felt connected to the club.",
    mock: PlayerDevMock,
  },
  {
    num: "06",
    title: "Your Club, Your Brand",
    headline: "Your colors. Your logo. Every screen.",
    body: "Club Rudder themes to each club automatically — branded, accessible, and consistent across branches. Parents and players see your club, not a generic SaaS product. Every tenant gets a clean, contrast-safe palette without a designer in the loop.",
    stop: "apologizing for the software your families have to use.",
    mock: BrandingMock,
  },
];

export default function WhyWorkflows() {
  return (
    <section id="workflows" className="py-16 md:py-20 bg-slate-50 dark:bg-[#0d1311]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="pub-eye mb-3">The Workflows</div>
          <h2 className="pub-display text-2xl md:text-4xl text-slate-900 dark:text-[#F5F1E8]">
            See the workflows that
            <span className="block text-primary">run the club.</span>
          </h2>
          <p className="max-w-2xl mx-auto mt-3 text-slate-600 dark:text-[#cfcabd]">
            Every module in Club Rudder maps to a job someone at your club actually does. Here are the ones directors open every week.
          </p>
        </div>

        <div className="space-y-16 md:space-y-20">
          {WORKFLOWS.map((wf, i) => {
            const Mock = wf.mock;
            const flip = i % 2 === 1;
            return (
              <div key={wf.num} className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* Text */}
                <div className={flip ? "lg:order-2" : ""}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-extrabold text-primary/30">{wf.num}</span>
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider text-primary">{wf.title}</div>
                    </div>
                  </div>
                  <h3 className="pub-display text-xl md:text-2xl mb-3 text-slate-900 dark:text-[#F5F1E8]">
                    {wf.headline}
                  </h3>
                  <p className="text-sm md:text-base text-slate-600 dark:text-[#cfcabd] leading-relaxed mb-4">
                    {wf.body}
                  </p>
                  <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 dark:border-[#2a3a33] bg-white dark:bg-[#17211d]">
                    <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 dark:text-[#cfcabd]">
                      <span className="font-bold uppercase tracking-wide text-[10px] text-slate-400 block mb-0.5">What you stop doing</span>
                      {wf.stop}
                    </p>
                  </div>
                </div>
                {/* Visual */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className={flip ? "lg:order-1" : ""}
                >
                  <Mock />
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}