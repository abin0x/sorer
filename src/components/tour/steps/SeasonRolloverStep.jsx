import React, { useState, useEffect, useRef } from "react";
import { CalendarClock, Loader2, CheckCircle2, GitBranch, Users, ClipboardCheck, Calendar, Activity, Wallet, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

const BATCH_LABELS = [
  { key: "season", label: "Creating season & age groups", icon: CalendarClock },
  { key: "branches", label: "Setting up branches", icon: GitBranch },
  { key: "teams", label: "Creating teams & coaches", icon: Users },
  { key: "players", label: "Rostering players & guardians", icon: Users },
  { key: "events", label: "Generating 8-week schedule", icon: Calendar },
  { key: "attendance", label: "Recording attendance", icon: CheckCircle2 },
  { key: "assessments", label: "Adding E.P.I.C. assessments", icon: Activity },
  { key: "evaluations", label: "Writing evaluations & feedback", icon: ClipboardCheck },
  { key: "payments", label: "Setting up payment records", icon: Wallet },
];

export default function SeasonRolloverStep({ tourState, onComplete, isLive }) {
  const [phase, setPhase] = useState("idle"); // idle | running | done | error
  const [activeBatch, setActiveBatch] = useState(0);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  // Simulated progress for unauthenticated viewers
  useEffect(() => {
    if (!isLive && phase === "idle") {
      // Auto-start the simulated rollover immediately
      setPhase("running");
    }
    if (!isLive && phase === "running") {
      const interval = setInterval(() => {
        setActiveBatch((prev) => {
          if (prev >= BATCH_LABELS.length - 1) {
            clearInterval(interval);
            setPhase("done");
            setSummary({ teams: 24, players: 288, coaches: 24, events: 576, evaluations: 288, payments: 288, branches: 3 });
            return prev;
          }
          return prev + 1;
        });
      }, 600);
      return () => clearInterval(interval);
    }
  }, [isLive, phase]);

  // Auto-start in live mode
  useEffect(() => {
    if (isLive && phase === "idle" && !startedRef.current) {
      startedRef.current = true;
      startRollover();
    }
  }, [isLive, phase]);

  const startRollover = async () => {
    setPhase("running");
    setActiveBatch(0);
    setError("");
    try {
      // Step through batches visually while the single backend call runs
      const batchInterval = setInterval(() => {
        setActiveBatch((prev) => Math.min(prev + 1, BATCH_LABELS.length - 1));
      }, 500);

      const res = await base44.functions.invoke("rollover-beta-season", {
        branchNames: tourState.branchNames.filter((n) => n?.trim()),
        platforms: tourState.platforms,
        sport: tourState.sport,
      });

      clearInterval(batchInterval);
      setActiveBatch(BATCH_LABELS.length);
      setSummary(res.data?.summary || {});
      setPhase("done");
      onComplete?.(res.data?.summary || {});
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to generate your season.");
      setPhase("error");
    }
  };

  if (phase === "idle" && !isLive) {
    // Auto-start the simulated rollover for unauthenticated viewers
    return (
      <div className="space-y-5">
        <StepHeader
          icon={CalendarClock}
          title="Create your season"
          subtitle="We'll roll over a rich, curated season with teams, players, coaches, schedules, attendance, evaluations, and payments — so you can explore every module in action."
        />
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: p() }} />
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="space-y-4">
        <StepHeader icon={AlertCircle} title="Something went wrong" subtitle={error} />
        <button onClick={startRollover} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-bold text-white min-h-[44px]" style={{ background: p() }}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepHeader
        icon={phase === "done" ? CheckCircle2 : CalendarClock}
        title={phase === "done" ? "Your season is ready!" : "Building your season…"}
        subtitle={phase === "done" ? "Everything has been created. Explore the full dashboard next." : "Rolling over a curated season with all the data you need."}
      />

      <div className="space-y-2.5">
        {BATCH_LABELS.map((batch, i) => {
          const status = i < activeBatch ? "done" : i === activeBatch && phase === "running" ? "active" : phase === "done" ? "done" : "pending";
          const Icon = batch.icon;
          return (
            <div key={batch.key} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${status === "done" ? "bg-white border border-slate-200" : status === "active" ? "border-2" : "opacity-40"}`} style={status === "active" ? { borderColor: p(), background: p(0.06) } : {}}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: status === "done" ? p(0.12) : status === "active" ? p() : "hsl(220 14% 94%)" }}>
                {status === "done" ? (
                  <CheckCircle2 className="w-4 h-4" style={{ color: p() }} />
                ) : status === "active" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Icon className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <span className={`text-sm font-semibold ${status === "active" ? "" : status === "done" ? "text-slate-800" : "text-slate-400"}`} style={status === "active" ? { color: p() } : {}}>
                {batch.label}
              </span>
              {status === "done" && summary && summary[batch.key] != null && (
                <span className="ml-auto text-xs font-bold text-slate-500">{summary[batch.key]}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: p(0.12) }}>
        <Icon className="w-5 h-5" style={{ color: p() }} />
      </div>
      <div>
        <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}