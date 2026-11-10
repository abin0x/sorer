import React from "react";
import { GitBranch, Users, Trophy, Calendar, Wallet, ClipboardCheck, Activity, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

// Dashboard preview that fills in behind the wizard as steps complete.
// In preview mode (unauthenticated) it renders from local tour state.
// In live mode (authenticated) it renders from real DB data.
export default function TourDashboardPreview({ tourState, liveData }) {
  const { clubName, sport, branchNames, platforms, rolloverSummary, step } = tourState;
  const data = liveData || {};

  const hasClub = step >= 0 && clubName;
  const hasBranches = step >= 1 && (data.branches?.length || branchNames?.length);
  const hasPlatforms = step >= 2 && (data.platforms?.length || platforms?.length);
  const hasRollover = step >= 3 && rolloverSummary;

  const branchCount = data.branches?.length || branchNames?.filter(n => n?.trim()).length || 0;
  const platformCount = data.platforms?.length || platforms?.length || 0;
  const teamCount = rolloverSummary?.teams || 0;
  const playerCount = rolloverSummary?.players || 0;
  const coachCount = rolloverSummary?.coaches || 0;
  const eventCount = rolloverSummary?.events || 0;
  const evalCount = rolloverSummary?.evaluations || 0;
  const paymentCount = rolloverSummary?.payments || 0;

  return (
    <div className="space-y-5">
      {/* Club header */}
      <div className="bg-white rounded-2xl soft-shadow border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0" style={{ background: hasClub ? p() : "hsl(220 14% 85%)" }}>
            {hasClub ? (clubName?.[0]?.toUpperCase() || "C") : <Sparkles className="w-6 h-6 text-slate-400" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold text-slate-900 truncate">{hasClub ? clubName : "Your Club Name"}</h2>
            <p className="text-sm text-slate-600">{hasClub ? `${sport} · Club Management` : "Start by naming your club"}</p>
          </div>

        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={GitBranch} label="Branches" value={hasBranches ? branchCount : "—"} active={hasBranches} />
        <StatCard icon={Trophy} label="Platforms" value={hasPlatforms ? platformCount : "—"} active={hasPlatforms} />
        <StatCard icon={Users} label="Teams" value={hasRollover ? teamCount : "—"} active={hasRollover} />
        <StatCard icon={Users} label="Players" value={hasRollover ? playerCount : "—"} active={hasRollover} />
        <StatCard icon={ClipboardCheck} label="Coaches" value={hasRollover ? coachCount : "—"} active={hasRollover} />
        <StatCard icon={Calendar} label="Events" value={hasRollover ? eventCount : "—"} active={hasRollover} />
        <StatCard icon={Activity} label="Evaluations" value={hasRollover ? evalCount : "—"} active={hasRollover} />
        <StatCard icon={Wallet} label="Payments" value={hasRollover ? paymentCount : "—"} active={hasRollover} />
      </div>

      {/* Branch cards */}
      {hasBranches && (
        <div className="bg-white rounded-2xl soft-shadow border border-slate-200 p-5">
          <h3 className="font-extrabold mb-3 text-slate-900 flex items-center gap-2"><GitBranch className="w-4 h-4" style={{ color: p() }} /> Branches</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(data.branches?.length ? data.branches.map(b => b.name) : branchNames).filter(n => n?.trim()).map((name, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200" style={{ background: i === 0 ? p(0.06) : undefined }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: i === 0 ? p() : "hsl(220 14% 94%)" }}>
                  <GitBranch className="w-4 h-4" style={{ color: i === 0 ? "white" : "hsl(220 14% 45%)" }} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{name}</p>
                  <p className="text-xs text-slate-500">{i === 0 ? "Main Branch" : "Branch"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform badges */}
      {hasPlatforms && (
        <div className="bg-white rounded-2xl soft-shadow border border-slate-200 p-5">
          <h3 className="font-extrabold mb-3 text-slate-900 flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: p() }} /> Platforms & Leagues</h3>
          <div className="flex flex-wrap gap-2">
            {(data.platforms?.length ? data.platforms.map(pl => pl.name) : platforms).map((name, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: p(0.1), color: p() }}>
                <Trophy className="w-3 h-3" /> {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Teams preview after rollover */}
      {hasRollover && (
        <div className="bg-white rounded-2xl soft-shadow border border-slate-200 p-5">
          <h3 className="font-extrabold mb-3 text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: p() }} /> Season Overview</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl" style={{ background: p(0.06) }}>
              <p className="text-3xl font-extrabold" style={{ color: p() }}>{teamCount}</p>
              <p className="text-sm font-semibold text-slate-600">Teams across {branchCount} branches</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: "hsl(var(--accent) / 0.08)" }}>
              <p className="text-3xl font-extrabold" style={{ color: "hsl(var(--accent))" }}>{playerCount}</p>
              <p className="text-sm font-semibold text-slate-600">Players with full rosters</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Pill icon={Calendar} label={`${eventCount} scheduled events`} />
            <Pill icon={Activity} label={`${evalCount} evaluations`} />
            <Pill icon={Wallet} label={`${paymentCount} payment records`} />
            <Pill icon={ClipboardCheck} label={`${coachCount} coaches`} />
          </div>
        </div>
      )}

      {/* Empty state when nothing yet */}
      {!hasClub && (
        <div className="bg-white/60 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Your club dashboard will appear here as you build it</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, active }) {
  return (
    <div className={`bg-white rounded-xl p-4 border transition-all ${active ? "soft-shadow border-slate-200" : "border-slate-200/60 opacity-50"}`}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: active ? p(0.12) : "hsl(220 14% 94%)" }}>
        <Icon className="w-5 h-5" style={{ color: active ? p() : "hsl(220 14% 60%)" }} />
      </div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Pill({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}