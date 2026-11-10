import React from "react";
import {
  Star, Target, TrendingUp, Video, CalendarClock, Wallet, CreditCard,
  Trophy, Users, BookOpen, MapPin, Clock, CheckCircle2, ArrowRight,
} from "lucide-react";
import { NAVY, GREEN, GREY } from "./slideTheme";

// Group 3 — Player (4), Parent (4)
export const group3Slides = [
  // ===== Player =====
  {
    title: "Player Dashboard",
    subtitle: "My team, upcoming games, and personal development stats",
    category: "Player",
    render: () => (
      <div className="h-full p-4 bg-slate-50 rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[11px] font-bold text-emerald-700">9</div>
            <div>
              <div className="text-xs font-bold" style={{ color: NAVY }}>Liam Anderson</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">U13 Blue · Forward</div>
            </div>
          </div>
          <div className="text-[9px] text-slate-500">Jaguars Novi</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "NEXT GAME", val: "Oct 18", color: NAVY },
            { label: "ATTENDANCE", val: "95%", color: GREEN },
            { label: "SKILL SCORE", val: "88", color: GREEN },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{s.label}</div>
              <div className="text-base font-extrabold" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3 flex-1">
          <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase mb-2">My Development</div>
          <div className="space-y-2">
            {[
              { t: "Dribbling", v: 90 },
              { t: "Passing", v: 84 },
              { t: "Shooting", v: 88 },
            ].map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-[9px] mb-0.5">
                  <span className="font-medium" style={{ color: NAVY }}>{s.t}</span>
                  <span className="font-bold" style={{ color: NAVY }}>{s.v}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.v}%`, background: GREEN }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Skill Tests",
    subtitle: "My test results with benchmarks and progress over time",
    category: "Player",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>My Skill Tests</div>
          </div>
          <div className="text-[9px] text-slate-500">Last test: Oct 5</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { t: "30m Sprint", v: "4.2s", b: "Avg 4.6s", good: true },
            { t: "Vertical Jump", v: "52cm", b: "Avg 48cm", good: true },
            { t: "Agility T", v: "9.8s", b: "Avg 9.5s", good: false },
            { t: "Passing Acc.", v: "88%", b: "Avg 82%", good: true },
          ].map((s, i) => (
            <div key={i} className="border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase">{s.t}</div>
              <div className="text-lg font-extrabold" style={{ color: s.good ? GREEN : "#F59E0B" }}>{s.v}</div>
              <div className="text-[8px] text-slate-500">{s.b}</div>
            </div>
          ))}
        </div>
        <div className="border border-slate-200 rounded-md p-3 flex-1 flex items-end gap-2">
          {[
            { m: "May", v: 70 }, { m: "Jun", v: 75 }, { m: "Jul", v: 78 }, { m: "Aug", v: 84 }, { m: "Oct", v: 88 },
          ].map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md" style={{ height: `${b.v}%`, background: `linear-gradient(to top, hsl(var(--primary) / 0.4), hsl(var(--primary)))` }} />
              <span className="text-[7px] font-bold tracking-wider text-slate-500 uppercase">{b.m}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Video Library",
    subtitle: "Training drills, position guides, and match analysis",
    category: "Player",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Video Library</div>
          </div>
          <div className="text-[9px] text-slate-500">42 videos</div>
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1">
          {[
            { t: "Finishing technique", d: "4 min", c: "from-emerald-500 to-emerald-700" },
            { t: "First touch drills", d: "6 min", c: "from-sky-500 to-sky-700" },
            { t: "Positioning: Forward", d: "8 min", c: "from-violet-500 to-violet-700" },
            { t: "Match analysis: vs Crew", d: "12 min", c: "from-amber-500 to-amber-700" },
          ].map((v, i) => (
            <div key={i} className="border border-slate-200 rounded-md overflow-hidden flex flex-col">
              <div className={`h-16 bg-gradient-to-br ${v.c} flex items-center justify-center relative`}>
                <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur flex items-center justify-center">
                  <div className="w-0 h-0 border-y-4 border-y-transparent border-l-[7px] border-l-white ml-0.5" />
                </div>
              </div>
              <div className="p-2">
                <div className="text-[10px] font-semibold" style={{ color: NAVY }}>{v.t}</div>
                <div className="text-[8px] text-slate-500">{v.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "My Team Calendar",
    subtitle: "Training and game schedule synced to my phone",
    category: "Player",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>My Schedule</div>
          </div>
          <div className="text-[9px] text-slate-500">This week</div>
        </div>
        <div className="space-y-2 flex-1">
          {[
            { d: "Tue Oct 14", t: "Training", time: "6:00 PM", loc: "Field 2 · Novi", type: "train" },
            { d: "Thu Oct 16", t: "Training", time: "6:00 PM", loc: "Field 2 · Novi", type: "train" },
            { d: "Sat Oct 18", t: "Game vs Crew Academy", time: "10:00 AM", loc: "Home · Novi HS", type: "game" },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-2 border border-slate-200 rounded-md p-2.5">
              <div className={`w-1 h-10 rounded-full ${e.type === "game" ? "bg-amber-400" : "bg-emerald-400"}`} />
              <div className="flex-1">
                <div className="text-[10px] font-semibold" style={{ color: NAVY }}>{e.t}</div>
                <div className="text-[8px] text-slate-500 uppercase tracking-wider">{e.d}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold" style={{ color: NAVY }}>{e.time}</div>
                <div className="text-[8px] text-slate-500">{e.loc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ===== Parent =====
  {
    title: "Family Account",
    subtitle: "All your players, teams, and balances in one place",
    category: "Parent",
    render: () => (
      <div className="h-full p-4 bg-slate-50 rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold" style={{ color: NAVY }}>Anderson Family</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">2 players</div>
            </div>
          </div>
          <div className="text-[9px] text-slate-500">Jaguars Novi</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: "Liam Anderson", team: "U13 Blue", num: "9" },
            { name: "Olivia Anderson", team: "U11 Girls", num: "7" },
          ].map((p, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-md p-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[11px] font-bold text-emerald-700">{p.num}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold truncate" style={{ color: NAVY }}>{p.name}</div>
                <div className="text-[8px] text-slate-500 uppercase tracking-wider">{p.team}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3 flex-1">
          <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase mb-2">Account Summary</div>
          <div className="space-y-1.5">
            {[
              { l: "Total paid this season", v: "$2,500", c: GREEN },
              { l: "Outstanding balance", v: "$350", c: "#F59E0B" },
              { l: "Next payment due", v: "Nov 1", c: NAVY },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Pay Dues",
    subtitle: "Outstanding balances with secure Stripe checkout",
    category: "Parent",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Pay Dues</div>
          </div>
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3 h-3 text-emerald-600" />
            <span className="text-[9px] font-semibold text-emerald-700">Secure</span>
          </div>
        </div>
        <div className="border border-slate-200 rounded-md overflow-hidden">
          {[
            { d: "U13 Blue · Liam · November installment", a: "$175", st: "Due" },
            { d: "U11 Girls · Olivia · November installment", a: "$175", st: "Due" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-50 text-[10px]">
              <div className="flex-1">
                <div className="font-medium" style={{ color: NAVY }}>{r.d}</div>
              </div>
              <span className="font-bold" style={{ color: NAVY }}>{r.a}</span>
              <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{r.st}</span>
            </div>
          ))}
        </div>
        <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Total due</span>
            <span className="text-base font-extrabold" style={{ color: NAVY }}>$350.00</span>
          </div>
        </div>
        <button className="mt-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2.5 text-[11px] font-bold uppercase tracking-wider">
          Pay now <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    ),
  },
  {
    title: "Event Signup",
    subtitle: "Browse and register for camps, clinics, and tryouts",
    category: "Parent",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Upcoming Events</div>
          <div className="text-[9px] text-slate-500">Jaguars Novi</div>
        </div>
        <div className="space-y-2 flex-1">
          {[
            { t: "Summer Skills Camp", d: "Jun 15-18", p: "$120", spots: "8 left", c: "from-emerald-500 to-emerald-700" },
            { t: "Goalkeeper Clinic", d: "Jul 10", p: "$45", spots: "Open", c: "from-sky-500 to-sky-700" },
            { t: "U13 Tryouts", d: "Oct 18", p: "Free", spots: "Register", c: "from-amber-500 to-amber-700" },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-2 border border-slate-200 rounded-md overflow-hidden">
              <div className={`w-12 h-12 bg-gradient-to-br ${e.c} flex items-center justify-center text-white`}>
                <Trophy className="w-5 h-5" />
              </div>
              <div className="flex-1 p-2">
                <div className="text-[10px] font-semibold" style={{ color: NAVY }}>{e.t}</div>
                <div className="text-[8px] text-slate-500">{e.d} · {e.spots}</div>
              </div>
              <div className="pr-3 text-right">
                <div className="text-[11px] font-extrabold" style={{ color: NAVY }}>{e.p}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Child's Schedule",
    subtitle: "Stay on top of games, practices, and team communications",
    category: "Parent",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Liam's Schedule</div>
          </div>
          <div className="text-[9px] text-slate-500">This week</div>
        </div>
        <div className="space-y-2 flex-1">
          {[
            { d: "Tue", t: "Training", time: "6:00 PM", loc: "Field 2", type: "train" },
            { d: "Thu", t: "Training", time: "6:00 PM", loc: "Field 2", type: "train" },
            { d: "Sat", t: "Game vs Crew", time: "10:00 AM", loc: "Novi HS", type: "game" },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-2 border border-slate-200 rounded-md p-2.5">
              <div className={`w-1 h-10 rounded-full ${e.type === "game" ? "bg-amber-400" : "bg-emerald-400"}`} />
              <div className="flex-1">
                <div className="text-[10px] font-semibold" style={{ color: NAVY }}>{e.t}</div>
                <div className="flex items-center gap-1 text-[8px] text-slate-500 uppercase tracking-wider">
                  <Clock className="w-2.5 h-2.5" /> {e.time}
                  <MapPin className="w-2.5 h-2.5 ml-1" /> {e.loc}
                </div>
              </div>
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{e.d}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span className="text-[9px] text-slate-500">Liam marked as attending Saturday's game</span>
        </div>
      </div>
    ),
  },
];