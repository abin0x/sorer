import React from "react";
import {
  CheckCircle2, ClipboardCheck, CreditCard, BarChart3, Users, Trophy,
  CalendarClock, ArrowLeftRight, Shield, UserPlus, Wallet, Receipt,
  BookOpen, RefreshCw, AlertCircle, FileText,
} from "lucide-react";
import { NAVY, GREEN, GREY } from "./slideTheme";

// Group 1 — Club Director (4), Club Admin (4), Bookkeeper (4)
export const group1Slides = [
  // ===== Club Director =====
  {
    title: "Club Director Dashboard",
    subtitle: "Priority actions, cycle timeline, and branch oversight",
    category: "Club Director",
    render: () => (
      <div className="h-full p-4 bg-slate-50 rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Club Director</div>
          <div className="text-[9px] text-slate-500">2026-2027 Season</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "BRANCHES", val: "5", color: NAVY },
            { label: "TEAMS", val: "24", color: NAVY },
            { label: "COLLECTED", val: "$84K", color: GREEN },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{s.label}</div>
              <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3 flex-1">
          <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase mb-2">Priority Actions</div>
          <div className="space-y-1.5">
            {[
              { t: "Confirm tryout anchor dates", done: false, hot: true },
              { t: "Approve season rollover matrix", done: false, hot: false },
              { t: "Review branch director assignments", done: true, hot: false },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${a.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                  {a.done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className={`text-[10px] ${a.done ? "text-slate-400 line-through" : "font-medium"}`} style={{ color: a.done ? undefined : NAVY }}>{a.t}</span>
                {a.hot && <span className="ml-auto text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Hot</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["Prepare", "Tryouts", "Roster", "Season"].map((step, i) => (
            <div key={step} className="flex items-center gap-1 flex-1">
              <div className={`h-1.5 flex-1 rounded-full ${i <= 1 ? "bg-emerald-500" : "bg-slate-200"}`} />
              <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: i <= 1 ? GREEN : GREY }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Season Rollover",
    subtitle: "Review the team matrix and roll teams forward to the next season",
    category: "Club Director",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Rollover Review</div>
          </div>
          <div className="text-[9px] text-slate-500">2026 → 2027</div>
        </div>
        <div className="border border-slate-200 rounded-md overflow-hidden flex-1">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 text-[8px] font-bold tracking-wider text-slate-500 uppercase">
            <span className="col-span-3">Team</span><span className="col-span-2">Age</span><span className="col-span-3">Coach</span><span className="col-span-2">Roster</span><span className="col-span-2 text-right">Decision</span>
          </div>
          {[
            { t: "Novi Blue", a: "U13", c: "J. Diaz", r: "11/18", d: "Roll" },
            { t: "Novi Gold", a: "U14", c: "M. Park", r: "16/18", d: "Roll" },
            { t: "Plymouth Red", a: "U12", c: "S. Lee", r: "9/16", d: "Merge" },
            { t: "Brighton Black", a: "U15", c: "T. Rao", r: "14/18", d: "Skip" },
          ].map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-50 text-[10px] items-center">
              <span className="col-span-3 font-medium" style={{ color: NAVY }}>{r.t}</span>
              <span className="col-span-2 text-slate-500">{r.a}</span>
              <span className="col-span-3 text-slate-500">{r.c}</span>
              <span className="col-span-2 text-slate-500">{r.r}</span>
              <span className="col-span-2 text-right">
                <span className={`text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${r.d === "Roll" ? "bg-emerald-50 text-emerald-700" : r.d === "Merge" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{r.d}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-slate-500">3 of 24 teams reviewed</span>
          <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "12%", background: GREEN }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Tryout Planner",
    subtitle: "Matrix-driven tryout planning with team plans and approvals",
    category: "Club Director",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Tryout Matrix</div>
          <div className="text-[9px] text-slate-500">2026-2027</div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 flex-1">
          {["U9", "U10", "U11", "U12", "U13", "U14", "U15", "U16"].map((age, i) => (
            <div key={age} className="border border-slate-200 rounded-md p-1.5 flex flex-col">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{age}</div>
              <div className="flex gap-1">
                <div className="flex-1 h-6 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[7px] font-bold text-emerald-700">B</div>
                <div className="flex-1 h-6 rounded bg-sky-100 border border-sky-300 flex items-center justify-center text-[7px] font-bold text-sky-700">G</div>
              </div>
              <div className="mt-1 text-[7px] text-slate-400 text-center">{i % 3 === 0 ? "Planned" : i % 3 === 1 ? "Active" : "Ready"}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <div className="flex items-center gap-1.5">
            <ClipboardCheck className="w-3 h-3 text-emerald-600" />
            <span className="text-[9px] font-semibold" style={{ color: NAVY }}>16 plans · 3 pending approval</span>
          </div>
          <div className="text-[9px] text-slate-500">Anchor: Oct 18</div>
        </div>
      </div>
    ),
  },
  {
    title: "Reports & Analytics",
    subtitle: "Role-aware dashboards with server-side aggregated charts",
    category: "Club Director",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Revenue by Month</div>
          </div>
          <div className="text-[9px] text-slate-500">2026-2027</div>
        </div>
        <div className="border border-slate-200 rounded-md p-3 flex-1 flex items-end gap-2">
          {[
            { m: "Jun", v: 60 }, { m: "Jul", v: 85 }, { m: "Aug", v: 95 },
            { m: "Sep", v: 70 }, { m: "Oct", v: 80 }, { m: "Nov", v: 55 },
          ].map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md" style={{ height: `${b.v}%`, background: `linear-gradient(to top, hsl(var(--primary) / 0.4), hsl(var(--primary)))` }} />
              <span className="text-[7px] font-bold tracking-wider text-slate-500 uppercase">{b.m}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "TOTAL", val: "$84.2K", trend: "+12%" },
            { label: "AVG/PLAYER", val: "$270", trend: "+4%" },
            { label: "COLLECTION", val: "87%", trend: "+3%" },
          ].map((s) => (
            <div key={s.label} className="border border-slate-200 rounded-md p-2">
              <div className="text-[7px] font-bold tracking-wider text-slate-500 uppercase">{s.label}</div>
              <div className="text-sm font-extrabold" style={{ color: NAVY }}>{s.val}</div>
              <div className="text-[8px] font-bold text-emerald-600">{s.trend}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ===== Club Admin =====
  {
    title: "Club Admin Dashboard",
    subtitle: "Branch oversight, staff invites, and club-wide configuration",
    category: "Club Admin",
    render: () => (
      <div className="h-full p-4 bg-slate-50 rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Club Admin</div>
          </div>
          <div className="text-[9px] text-slate-500">Michigan Jaguars</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "STAFF", val: "18", color: NAVY },
            { label: "PENDING INVITES", val: "4", color: "#F59E0B" },
            { label: "BRANCHES", val: "5", color: NAVY },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{s.label}</div>
              <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3 flex-1">
          <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase mb-2">Branch Overview</div>
          <div className="space-y-1.5">
            {[
              { b: "Novi", teams: 8, players: 104 },
              { b: "Plymouth", teams: 6, players: 78 },
              { b: "Brighton", teams: 5, players: 61 },
              { b: "Howell", teams: 3, players: 42 },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">{r.b[0]}</div>
                <span className="flex-1 font-medium" style={{ color: NAVY }}>{r.b}</span>
                <span className="text-slate-500">{r.teams} teams</span>
                <span className="text-slate-500">{r.players} players</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Registration & Teams",
    subtitle: "Manage players, team rosters, and the full registration lifecycle",
    category: "Club Admin",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Players</div>
          </div>
          <div className="text-[9px] text-slate-500">312 active</div>
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1">
          {[
            { name: "Liam Anderson", pos: "Forward", num: "9", team: "U13 Blue" },
            { name: "Noah Martinez", pos: "Midfielder", num: "8", team: "U13 Blue" },
            { name: "Ethan Clark", pos: "Defender", num: "4", team: "U14 Gold" },
            { name: "Lucas Wright", pos: "Goalkeeper", num: "1", team: "U12 Red" },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-2 border border-slate-200 rounded-md p-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">{p.num}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold truncate" style={{ color: NAVY }}>{p.name}</div>
                <div className="text-[8px] text-slate-500 uppercase tracking-wider">{p.pos} · {p.team}</div>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider">Roster 11/22 · 50% full</div>
          <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "50%", background: GREEN }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Payments Ledger",
    subtitle: "Track every family payment and outstanding balance by branch",
    category: "Club Admin",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Payments</div>
          </div>
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3 h-3 text-emerald-600" />
            <span className="text-[9px] font-semibold text-emerald-700">Stripe</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "COLLECTED", val: "$84.2K", color: GREEN },
            { label: "OUTSTANDING", val: "$12.8K", color: "#F59E0B" },
            { label: "FAILED", val: "3", color: "#EF4444" },
          ].map((s) => (
            <div key={s.label} className="border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{s.label}</div>
              <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="border border-slate-200 rounded-md overflow-hidden flex-1">
          {[
            { p: "L. Anderson", t: "U13 Blue", a: "$1,250", s: "Paid" },
            { p: "N. Martinez", t: "U13 Blue", a: "$1,250", s: "Paid" },
            { p: "E. Clark", t: "U14 Gold", a: "$1,400", s: "Pending" },
          ].map((r, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-slate-50 text-[10px]">
              <span className="font-medium" style={{ color: NAVY }}>{r.p}</span>
              <span className="text-slate-500">{r.t}</span>
              <span className="text-right font-semibold" style={{ color: NAVY }}>{r.a}</span>
              <span className="text-right">
                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${r.s === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{r.s}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Staff & Invitations",
    subtitle: "Invite coaches and directors, manage roles and access",
    category: "Club Admin",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Staff Invitations</div>
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">4 pending</span>
        </div>
        <div className="border border-slate-200 rounded-md overflow-hidden flex-1">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 text-[8px] font-bold tracking-wider text-slate-500 uppercase">
            <span className="col-span-5">Name</span><span className="col-span-4">Role</span><span className="col-span-3 text-right">Status</span>
          </div>
          {[
            { n: "Maria Park", r: "Branch Director", st: "Pending" },
            { n: "Tom Rao", r: "Coach", st: "Accepted" },
            { n: "Sara Lee", r: "Team Manager", st: "Pending" },
            { n: "Jon Diaz", r: "Coach", st: "Accepted" },
          ].map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-50 text-[10px] items-center">
              <span className="col-span-5 font-medium" style={{ color: NAVY }}>{r.n}</span>
              <span className="col-span-4 text-slate-500">{r.r}</span>
              <span className="col-span-3 text-right">
                <span className={`text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${r.st === "Accepted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{r.st}</span>
              </span>
            </div>
          ))}
        </div>
        <button className="text-[10px] font-bold uppercase tracking-wider text-primary border border-primary rounded-md py-2 hover:bg-primary/5">+ Invite member</button>
      </div>
    ),
  },

  // ===== Bookkeeper =====
  {
    title: "Bookkeeper Dashboard",
    subtitle: "Finance focus — reconciliation, sync status, and expense approvals",
    category: "Bookkeeper",
    render: () => (
      <div className="h-full p-4 bg-slate-50 rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Bookkeeper</div>
          </div>
          <div className="text-[9px] text-slate-500">Oct 2026</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "RECONCILED", val: "92%", color: GREEN },
            { label: "UNMATCHED", val: "14", color: "#F59E0B" },
            { label: "QBO SYNC", val: "Live", color: GREEN },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{s.label}</div>
              <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3 flex-1">
          <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase mb-2">Today's Queue</div>
          <div className="space-y-1.5">
            {[
              { t: "Reconcile 14 unmatched payments", hot: true },
              { t: "Approve 3 expense reports", hot: false },
              { t: "Sync October transactions to QBO", hot: false },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                <span className="text-[10px] font-medium" style={{ color: NAVY }}>{a.t}</span>
                {a.hot && <span className="ml-auto text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Hot</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "QuickBooks Sync",
    subtitle: "Map teams to classes and sync transactions to QuickBooks Online",
    category: "Bookkeeper",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>QuickBooks Sync</div>
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Connected</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "SYNCED", val: "284", color: GREEN },
            { label: "PENDING", val: "14", color: "#F59E0B" },
            { label: "ERRORS", val: "0", color: GREEN },
          ].map((s) => (
            <div key={s.label} className="border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{s.label}</div>
              <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="border border-slate-200 rounded-md p-3 flex-1">
          <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase mb-2">Class Mapping</div>
          <div className="space-y-1.5">
            {[
              { t: "U13 Blue", c: "Novi:U13Blue" },
              { t: "U14 Gold", c: "Novi:U14Gold" },
              { t: "U12 Red", c: "Plymouth:U12Red" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="flex-1 font-medium" style={{ color: NAVY }}>{r.t}</span>
                <span className="text-slate-400">→</span>
                <span className="text-slate-500 font-mono">{r.c}</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Expense Approvals",
    subtitle: "Review and approve staff expense reports with receipt attachments",
    category: "Bookkeeper",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Expense Reports</div>
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">3 pending</span>
        </div>
        <div className="border border-slate-200 rounded-md overflow-hidden flex-1">
          {[
            { n: "Jon Diaz", a: "$245.00", d: "Tournament travel", st: "Pending" },
            { n: "Maria Park", a: "$120.50", d: "Field supplies", st: "Pending" },
            { n: "Sara Lee", a: "$88.00", d: "Team equipment", st: "Approved" },
          ].map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-50 text-[10px] items-center">
              <span className="col-span-4 font-medium" style={{ color: NAVY }}>{r.n}</span>
              <span className="col-span-5 text-slate-500 truncate">{r.d}</span>
              <span className="col-span-2 text-right font-semibold" style={{ color: NAVY }}>{r.a}</span>
              <span className="col-span-1 text-right">
                <span className={`text-[7px] font-bold uppercase px-1 py-0.5 rounded ${r.st === "Approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{r.st[0]}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 text-amber-500" />
          <span className="text-[9px] text-slate-500">2 reports awaiting receipts</span>
        </div>
      </div>
    ),
  },
  {
    title: "Reconciliation",
    subtitle: "Match bank deposits to payment records and resolve discrepancies",
    category: "Bookkeeper",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Reconciliation</div>
          </div>
          <div className="text-[9px] text-slate-500">Oct 1-14</div>
        </div>
        <div className="border border-slate-200 rounded-md overflow-hidden flex-1">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 text-[8px] font-bold tracking-wider text-slate-500 uppercase">
            <span className="col-span-4">Deposit</span><span className="col-span-3">Date</span><span className="col-span-3 text-right">Amount</span><span className="col-span-2 text-right">Match</span>
          </div>
          {[
            { d: "Stripe payout #1", dt: "Oct 03", a: "$12,400", m: "12/12" },
            { d: "Stripe payout #2", dt: "Oct 08", a: "$8,200", m: "8/8" },
            { d: "Stripe payout #3", dt: "Oct 12", a: "$6,150", m: "5/7" },
            { d: "Offline check", dt: "Oct 10", a: "$1,250", m: "1/1" },
          ].map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-50 text-[10px] items-center">
              <span className="col-span-4 font-medium" style={{ color: NAVY }}>{r.d}</span>
              <span className="col-span-3 text-slate-500">{r.dt}</span>
              <span className="col-span-3 text-right font-semibold" style={{ color: NAVY }}>{r.a}</span>
              <span className="col-span-2 text-right">
                <span className={`text-[7px] font-bold uppercase px-1 py-0.5 rounded ${r.m.endsWith("0") || r.m.includes("/0") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{r.m}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-slate-500">2 unmatched transactions</span>
          <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "92%", background: GREEN }} />
          </div>
        </div>
      </div>
    ),
  },
];