import React from "react";
import {
  Trophy, CalendarClock, BarChart3, Users, Target, Activity,
  ClipboardCheck, Star, TrendingUp, Video, BookOpen, ClipboardList,
} from "lucide-react";
import { NAVY, GREEN, GREY } from "./slideTheme";

// Group 2 — Platform Director (4), Coach (4)
export const group2Slides = [
  // ===== Platform Director =====
  {
    title: "Platform Director Dashboard",
    subtitle: "Platform-wide oversight across all clubs and competitive platforms",
    category: "Platform Director",
    render: () => (
      <div className="h-full p-4 bg-slate-50 rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Platform Director</div>
          </div>
          <div className="text-[9px] text-slate-500">MLS-Next · Girls Academy</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "PLATFORMS", val: "4", color: NAVY },
            { label: "CLUB TEAMS", val: "38", color: NAVY },
            { label: "GAMES", val: "126", color: GREEN },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{s.label}</div>
              <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3 flex-1">
          <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase mb-2">Platform Roster</div>
          <div className="space-y-1.5">
            {[
              { p: "MLS-Next", teams: 12, color: "bg-violet-100 text-violet-700" },
              { p: "Girls Academy", teams: 10, color: "bg-pink-100 text-pink-700" },
              { p: "ECNL", teams: 9, color: "bg-sky-100 text-sky-700" },
              { p: "NPL", teams: 7, color: "bg-emerald-100 text-emerald-700" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className={`text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${r.color}`}>{r.p}</span>
                <span className="ml-auto text-slate-500">{r.teams} teams</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Platform Dashboard",
    subtitle: "Teams grouped by competitive platform with game-day attendance",
    category: "Platform Director",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>MLS-Next · U13-U19</div>
          <div className="text-[9px] text-slate-500">12 teams</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "ROSTERED", val: "198", color: NAVY },
            { label: "AVG ATTEND", val: "91%", color: GREEN },
            { label: "GAMES LEFT", val: "24", color: NAVY },
          ].map((s) => (
            <div key={s.label} className="border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{s.label}</div>
              <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="border border-slate-200 rounded-md p-3 flex-1">
          <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase mb-2">Upcoming Game Days</div>
          <div className="space-y-1.5">
            {[
              { d: "Oct 18", h: "vs Crew Academy", v: "Home" },
              { d: "Oct 25", h: "at Vardar", v: "Away" },
              { d: "Nov 01", h: "vs Wolves", v: "Home" },
            ].map((g, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <CalendarClock className="w-3 h-3 text-slate-400" />
                <span className="font-semibold" style={{ color: NAVY }}>{g.d}</span>
                <span className="flex-1 text-slate-500">{g.h}</span>
                <span className={`text-[7px] font-bold uppercase px-1.5 py-0.5 rounded ${g.v === "Home" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{g.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Tournament Manager",
    subtitle: "Schedule, standings, and registrations for hosted tournaments",
    category: "Platform Director",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Fall Classic 2026</div>
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Open</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "TEAMS", val: "32" },
            { label: "DIVISIONS", val: "4" },
            { label: "FIELDS", val: "6" },
          ].map((s) => (
            <div key={s.label} className="border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{s.label}</div>
              <div className="text-lg font-extrabold" style={{ color: NAVY }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="border border-slate-200 rounded-md p-3 flex-1">
          <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase mb-2">Standings · U13 Bracket</div>
          <div className="space-y-1.5">
            {[
              { t: "Jaguars Novi", p: 9, w: 3, gd: "+8" },
              { t: "Liverpool MI", p: 6, w: 2, gd: "+3" },
              { t: "Northville SC", p: 3, w: 1, gd: "-1" },
              { t: "Brighton FC", p: 0, w: 0, gd: "-10" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="w-4 text-slate-400 font-bold">{i + 1}</span>
                <span className="flex-1 font-medium" style={{ color: NAVY }}>{r.t}</span>
                <span className="text-slate-500">P{r.p}</span>
                <span className="text-slate-500">W{r.w}</span>
                <span className={`font-semibold ${r.gd.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>{r.gd}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Platform Analytics",
    subtitle: "Cross-club reporting on attendance, performance, and revenue",
    category: "Platform Director",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Attendance Trend</div>
          </div>
          <div className="text-[9px] text-slate-500">Last 6 weeks</div>
        </div>
        <div className="border border-slate-200 rounded-md p-3 flex-1 flex items-end gap-2">
          {[
            { m: "W1", v: 78 }, { m: "W2", v: 84 }, { m: "W3", v: 88 },
            { m: "W4", v: 82 }, { m: "W5", v: 91 }, { m: "W6", v: 94 },
          ].map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md" style={{ height: `${b.v}%`, background: `linear-gradient(to top, hsl(var(--primary) / 0.4), hsl(var(--primary)))` }} />
              <span className="text-[7px] font-bold tracking-wider text-slate-500 uppercase">{b.m}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "AVG ATTEND", val: "91%", trend: "+5%" },
            { label: "GAMES PLAYED", val: "102", trend: "+18" },
            { label: "WIN RATE", val: "64%", trend: "+3%" },
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

  // ===== Coach =====
  {
    title: "Coach Dashboard",
    subtitle: "Your team schedule, attendance, and player development focus",
    category: "Coach",
    render: () => (
      <div className="h-full p-4 bg-slate-50 rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Coach · U13 Blue</div>
          <div className="text-[9px] text-slate-500">Jaguars Novi</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "PLAYERS", val: "18", color: NAVY },
            { label: "ATTENDANCE", val: "92%", color: GREEN },
            { label: "NEXT GAME", val: "Oct 18", color: NAVY },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-md p-2.5">
              <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase mb-1">{s.label}</div>
              <div className="text-base font-extrabold" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3 flex-1">
          <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase mb-2">This Week</div>
          <div className="space-y-1.5">
            {[
              { d: "Tue", t: "Training · 6:00 PM", at: "Field 2" },
              { d: "Thu", t: "Training · 6:00 PM", at: "Field 2" },
              { d: "Sat", t: "Game vs Crew · 10:00 AM", at: "Home" },
            ].map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">{e.d}</span>
                <span className="flex-1 font-medium" style={{ color: NAVY }}>{e.t}</span>
                <span className="text-slate-500">{e.at}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Player Roster",
    subtitle: "Your squad with positions, jersey numbers, and availability",
    category: "Coach",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Squad · U13 Blue</div>
          </div>
          <div className="text-[9px] text-slate-500">18 players</div>
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1">
          {[
            { name: "Liam Anderson", pos: "Forward", num: "9", av: true },
            { name: "Noah Martinez", pos: "Midfielder", num: "8", av: true },
            { name: "Ethan Clark", pos: "Defender", num: "4", av: false },
            { name: "Lucas Wright", pos: "Goalkeeper", num: "1", av: true },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-2 border border-slate-200 rounded-md p-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">{p.num}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold truncate" style={{ color: NAVY }}>{p.name}</div>
                <div className="text-[8px] text-slate-500 uppercase tracking-wider">{p.pos}</div>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${p.av ? "bg-emerald-500" : "bg-amber-400"}`} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Center of Excellence",
    subtitle: "Player evaluations, skill test scores, and development tracking",
    category: "Coach",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Center of Excellence</div>
          </div>
          <div className="text-[9px] text-slate-500">U13 Blue</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: "Liam Anderson", score: 88, trend: "+4" },
            { name: "Noah Martinez", score: 82, trend: "+2" },
            { name: "Ethan Clark", score: 76, trend: "+6" },
            { name: "Lucas Wright", score: 91, trend: "+1" },
          ].map((p, i) => (
            <div key={i} className="border border-slate-200 rounded-md p-2.5">
              <div className="text-[10px] font-semibold mb-1" style={{ color: NAVY }}>{p.name}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: GREEN }} />
                </div>
                <span className="text-[10px] font-bold" style={{ color: NAVY }}>{p.score}</span>
              </div>
              <div className="text-[8px] font-bold text-emerald-600 mt-0.5">{p.trend} pts</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2">
          <Target className="w-3 h-3 text-primary" />
          <span className="text-[9px] font-semibold" style={{ color: NAVY }}>Team avg 84 · Top performer: L. Wright</span>
        </div>
      </div>
    ),
  },
  {
    title: "Team Calendar",
    subtitle: "Training sessions, games, and events in one synced view",
    category: "Coach",
    render: () => (
      <div className="h-full p-4 bg-white rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>October 2026</div>
          </div>
          <div className="flex items-center gap-1.5">
            <Video className="w-3 h-3 text-emerald-600" />
            <span className="text-[9px] font-semibold text-emerald-700">Google synced</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 flex-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-[7px] font-bold tracking-wider text-slate-400 text-center uppercase">{d}</div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => {
            const day = i - 2;
            const events = {
              6: { type: "train", label: "TR" },
              8: { type: "train", label: "TR" },
              11: { type: "train", label: "TR" },
              13: { type: "train", label: "TR" },
              17: { type: "game", label: "GM" },
              20: { type: "train", label: "TR" },
              24: { type: "game", label: "GM" },
            };
            const ev = events[day];
            return (
              <div key={i} className={`border border-slate-100 rounded-md p-1 flex flex-col ${day < 1 || day > 31 ? "opacity-30" : ""}`}>
                <span className="text-[7px] text-slate-400">{day > 0 && day <= 31 ? day : ""}</span>
                {ev && (
                  <div className={`mt-auto text-[6px] font-bold text-center py-0.5 rounded ${ev.type === "game" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{ev.label}</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-[8px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-200" />Training</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-200" />Game</span>
        </div>
      </div>
    ),
  },
];