import React from "react";
import { motion } from "framer-motion";
import {
  MockScreen, StatTile, ScreenLabel, MiniArea, MiniBars, MiniDonut, MiniRadar,
  ListRow, MockKanban, MockCalendar, MockBracket, PlayerCards, ProgressBar, NAVY,
} from "./RoleSlideViews";

/* Each role gets 3 dazzling slide views of their dashboard. */
export const ROLE_SLIDES = {
  club_director: [
    {
      title: "CEO Dashboard — Club Overview",
      render: (c) => (
        <MockScreen title="CEO Dashboard" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="Revenue YTD" value="$312K" trend="+18%" tone="up" color={c} />
            <StatTile label="Active Players" value="247" trend="+12" tone="up" color={c} />
            <StatTile label="Teams" value="18" trend="6 branches" tone="neutral" color={c} />
            <StatTile label="Overdue" value="3" trend="−5" tone="down" color={c} />
          </div>
          <ScreenLabel color={c}>Revenue Trend</ScreenLabel>
          <MiniArea color={c} data={[
            { x: "Jan", y: 60 }, { x: "Feb", y: 75 }, { x: "Mar", y: 68 },
            { x: "Apr", y: 92 }, { x: "May", y: 88 }, { x: "Jun", y: 110 },
            { x: "Jul", y: 124 },
          ]} />
        </MockScreen>
      ),
    },
    {
      title: "Revenue by Branch",
      render: (c) => (
        <MockScreen title="Revenue by Branch" color={c}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatTile label="Top Branch" value="Novi" trend="$82K" tone="up" color={c} />
            <StatTile label="Avg / Branch" value="$52K" trend="+9%" tone="up" color={c} />
            <StatTile label="Forecast" value="$410K" trend="On track" tone="neutral" color={c} />
          </div>
          <ScreenLabel color={c}>Revenue by Branch (YTD, $K)</ScreenLabel>
          <MiniBars color={c} data={[
            { x: "Novi", y: 82 }, { x: "Nvl", y: 64 }, { x: "Lans", y: 46 },
            { x: "Wix", y: 42 }, { x: "Liv", y: 36 }, { x: "Other", y: 42 },
          ]} />
        </MockScreen>
      ),
    },
    {
      title: "Roster Health & Development",
      render: (c) => (
        <MockScreen title="Roster Health" color={c}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ScreenLabel color={c}>Enrollment Status</ScreenLabel>
              <MiniDonut color={c} data={[
                { name: "Active", value: 198 },
                { name: "Pending", value: 22 },
                { name: "Waitlist", value: 10 },
              ]} />
            </div>
            <div className="space-y-2">
              <ScreenLabel color={c}>Branches Needing Attention</ScreenLabel>
              <ListRow title="Lansing — U12 roster" sub="3 spots open" status="Action" color={c} width="80%" />
              <ListRow title="Wixom — coach gap" sub="U14 Boys" status="Review" color={c} width="70%" />
              <ListRow title="Novi — evals due" sub="8 players" status="Overdue" color={c} width="65%" />
              <ListRow title="Livonia — payments" sub="12 invoices" status="Follow up" color={c} width="75%" />
            </div>
          </div>
        </MockScreen>
      ),
    },
  ],

  club_admin: [
    {
      title: "User Management",
      render: (c) => (
        <MockScreen title="User Management" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="Active Users" value="187" trend="+12" tone="up" color={c} />
            <StatTile label="Pending Access" value="4" trend="Review" tone="neutral" color={c} />
            <StatTile label="Roles" value="14" trend="Configured" tone="neutral" color={c} />
            <StatTile label="Logins (7d)" value="612" trend="+8%" tone="up" color={c} />
          </div>
          <ScreenLabel color={c}>Recent Users</ScreenLabel>
          <div className="space-y-2">
            <ListRow title="Sarah Mitchell" sub="Club Director · Novi" status="Active" color={c} width="65%" />
            <ListRow title="James Park" sub="Coach · U14 Boys" status="Active" color={c} width="70%" />
            <ListRow title="Dana Ellis" sub="Bookkeeper" status="Pending" color={c} width="60%" />
            <ListRow title="Mark Reyes" sub="Facility Manager" status="Active" color={c} width="68%" />
          </div>
        </MockScreen>
      ),
    },
    {
      title: "RBAC Permissions Matrix",
      render: (c) => (
        <MockScreen title="RBAC Permissions Matrix" color={c}>
          <ScreenLabel color={c}>Module Access by Role</ScreenLabel>
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <div className="grid grid-cols-6 bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              <div className="p-2">Role</div>
              {["Reg", "Sched", "Pay", "Kanban", "Dev"].map((h) => <div key={h} className="p-2 text-center">{h}</div>)}
            </div>
            {[
              ["Club Director", [1, 1, 1, 1, 1]],
              ["Branch Director", [1, 1, 1, 1, 0]],
              ["Coach", [1, 1, 0, 0, 1]],
              ["Bookkeeper", [0, 0, 1, 1, 0]],
              ["Parent", [1, 1, 0, 0, 0]],
            ].map(([role, perms], ri) => (
              <div key={ri} className="grid grid-cols-6 border-t border-slate-100 text-[10px]">
                <div className="p-2 font-semibold" style={{ color: NAVY }}>{role}</div>
                {perms.map((p, pi) => (
                  <div key={pi} className="p-2 flex justify-center">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: p ? c : "#e2e8f0" }}>
                      {p ? <span className="text-white text-[8px] font-bold">✓</span> : <span className="text-slate-300 text-[8px]">—</span>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </MockScreen>
      ),
    },
    {
      title: "Email Templates & Scheduled Reports",
      render: (c) => (
        <MockScreen title="Email Templates & Reports" color={c}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ScreenLabel color={c}>Email Templates</ScreenLabel>
              <div className="space-y-2">
                <ListRow title="Tryout Confirmation" sub="Sent 240×" status="Active" color={c} width="75%" />
                <ListRow title="Payment Reminder" sub="Sent 88×" status="Active" color={c} width="65%" />
                <ListRow title="Schedule Change" sub="Sent 36×" status="Active" color={c} width="70%" />
                <ListRow title="Welcome Email" sub="Sent 187×" status="Draft" color={c} width="60%" />
              </div>
            </div>
            <div>
              <ScreenLabel color={c}>Scheduled Reports</ScreenLabel>
              <div className="space-y-2">
                <ListRow title="Weekly Revenue" sub="Mondays 8am" status="Running" color={c} width="72%" />
                <ListRow title="Roster Health" sub="Monthly" status="Running" color={c} width="66%" />
                <ListRow title="Branch KPIs" sub="Fridays" status="Running" color={c} width="70%" />
                <ListRow title="Eval Coverage" sub="Monthly" status="Paused" color={c} width="58%" />
              </div>
            </div>
          </div>
        </MockScreen>
      ),
    },
  ],

  platform_director: [
    {
      title: "Platform Dashboard — Girls Academy",
      render: (c) => (
        <MockScreen title="Platform Dashboard · Girls Academy" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="Platform Teams" value="12" trend="Girls Academy" tone="neutral" color={c} />
            <StatTile label="Rostered" value="198" trend="Full" tone="up" color={c} />
            <StatTile label="Upcoming Games" value="6" trend="This week" tone="neutral" color={c} />
            <StatTile label="Eval Coverage" value="91%" trend="+4%" tone="up" color={c} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ScreenLabel color={c}>Attendance Rate</ScreenLabel>
              <MiniDonut color={c} data={[
                { name: "Present", value: 168 },
                { name: "Excused", value: 22 },
                { name: "Absent", value: 8 },
              ]} />
            </div>
            <div className="space-y-2">
              <ScreenLabel color={c}>Game-Day Readiness</ScreenLabel>
              <ProgressBar label="Rosters Confirmed" value={94} color={c} />
              <ProgressBar label="Referees Assigned" value={83} color={c} />
              <ProgressBar label="Fields Booked" value={100} color={c} />
              <ProgressBar label="Travel Plans" value={71} color={c} />
            </div>
          </div>
        </MockScreen>
      ),
    },
    {
      title: "Platform Roster",
      render: (c) => (
        <MockScreen title="Platform Roster · Girls Academy" color={c}>
          <ScreenLabel color={c}>Rostered Players</ScreenLabel>
          <PlayerCards color={c} players={[
            { initials: "AK", name: "Ava Klein", meta: "U16 · Forward", tag: "Eval ✓" },
            { initials: "MR", name: "Mia Rivera", meta: "U16 · Mid", tag: "Eval ✓" },
            { initials: "ZP", name: "Zoe Park", meta: "U17 · Def", tag: "Due" },
            { initials: "JC", name: "Jade Cohen", meta: "U15 · GK", tag: "Eval ✓" },
            { initials: "LS", name: "Lily Stone", meta: "U17 · Mid", tag: "Due" },
            { initials: "NB", name: "Nora Black", meta: "U15 · Def", tag: "Eval ✓" },
          ]} />
        </MockScreen>
      ),
    },
    {
      title: "Platform Calendar & Evaluations",
      render: (c) => (
        <MockScreen title="Platform Calendar" color={c}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ScreenLabel color={c}>E.P.I.C. Averages</ScreenLabel>
              <MiniRadar color={c} data={[
                { subject: "Tech", value: 8.2 },
                { subject: "Tac", value: 7.6 },
                { subject: "Phys", value: 8.4 },
                { subject: "Mental", value: 7.9 },
                { subject: "Effort", value: 8.8 },
              ]} />
            </div>
            <div>
              <ScreenLabel color={c}>This Week</ScreenLabel>
              <div className="space-y-2">
                <ListRow title="vs. Michigan Hawks" sub="Sat 3pm · Home" status="Game" color={c} width="78%" />
                <ListRow title="Training — Build-out" sub="Tue 5pm" status="Practice" color={c} width="70%" />
                <ListRow title="Travel — Indy" sub="Sun 7am" status="Travel" color={c} width="64%" />
                <ListRow title="Eval Window" sub="Open" status="Due" color={c} width="60%" />
              </div>
            </div>
          </div>
        </MockScreen>
      ),
    },
  ],

  bookkeeper: [
    {
      title: "Payments Ledger",
      render: (c) => (
        <MockScreen title="Payments Ledger" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="Collected YTD" value="$1.18M" trend="+22%" tone="up" color={c} />
            <StatTile label="Outstanding" value="$48K" trend="42 invoices" tone="down" color={c} />
            <StatTile label="Expenses (30d)" value="$31K" trend="7 pending" tone="neutral" color={c} />
            <StatTile label="QB Sync" value="Live" trend="2h ago" tone="up" color={c} />
          </div>
          <ScreenLabel color={c}>Recent Transactions</ScreenLabel>
          <div className="space-y-2">
            <ListRow title="Registration — Novi U14" sub="$1,250 · Paid" status="Revenue" color={c} width="72%" />
            <ListRow title="Referee Fees — Wknd" sub="$480 · Pending" status="Expense" color={c} width="64%" />
            <ListRow title="Coach Stipend — J. Park" sub="$2,000 · Approved" status="Payroll" color={c} width="78%" />
            <ListRow title="Vendor — Field Lining" sub="$320 · Invoice" status="Expense" color={c} width="60%" />
          </div>
        </MockScreen>
      ),
    },
    {
      title: "Revenue vs Expenses",
      render: (c) => (
        <MockScreen title="Revenue vs Expenses" color={c}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatTile label="Net (YTD)" value="+$420K" trend="Healthy" tone="up" color={c} />
            <StatTile label="Margin" value="34%" trend="+2pt" tone="up" color={c} />
            <StatTile label="AR Aging" value="$12K" trend=">30 days" tone="down" color={c} />
          </div>
          <ScreenLabel color={c}>Monthly Revenue vs Expenses ($K)</ScreenLabel>
          <MiniBars color={c} data={[
            { x: "Apr", y: 96 }, { x: "May", y: 110 }, { x: "Jun", y: 128 },
            { x: "Jul", y: 142 }, { x: "Aug", y: 134 }, { x: "Sep", y: 151 },
          ]} />
        </MockScreen>
      ),
    },
    {
      title: "QuickBooks Sync & Processors",
      render: (c) => (
        <MockScreen title="QuickBooks Sync & Processors" color={c}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ScreenLabel color={c}>Connected Processors</ScreenLabel>
              <div className="space-y-2">
                <ListRow title="Stripe" sub="Live · 1,240 charges" status="Connected" color={c} width="74%" />
                <ListRow title="Square" sub="Live · 312 charges" status="Connected" color={c} width="66%" />
                <ListRow title="QuickBooks" sub="2-way sync" status="Synced" color={c} width="70%" />
              </div>
            </div>
            <div>
              <ScreenLabel color={c}>Sync Status</ScreenLabel>
              <div className="p-3 rounded-xl bg-slate-50">
                <ProgressBar label="Invoices Pushed" value={98} color={c} />
                <div className="h-2" />
                <ProgressBar label="Expenses Pulled" value={94} color={c} />
                <div className="h-2" />
                <ProgressBar label="Payments Matched" value={91} color={c} />
              </div>
            </div>
          </div>
        </MockScreen>
      ),
    },
  ],

  facility_director: [
    {
      title: "Master Schedule — Week View",
      render: (c) => (
        <MockScreen title="Master Schedule · This Week" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="Bookings (wk)" value="118" trend="+9" tone="up" color={c} />
            <StatTile label="Conflicts" value="2" trend="Resolve" tone="down" color={c} />
            <StatTile label="Utilization" value="74%" trend="+6%" tone="up" color={c} />
            <StatTile label="Fields" value="32" trend="9 facilities" tone="neutral" color={c} />
          </div>
          <ScreenLabel color={c}>Week Grid</ScreenLabel>
          <MockCalendar color={c} days={[
            { label: "Mon", date: "14", events: { "5p": { label: "U12 Novi" }, "7p": { label: "U14 Wix" } } },
            { label: "Tue", date: "15", events: { "4p": { label: "U11 Nvl" }, "6p": { label: "U16 GA" } } },
            { label: "Wed", date: "16", events: { "5p": { label: "U13 Lans" } } },
            { label: "Thu", date: "17", events: { "3p": { label: "Camp" }, "7p": { label: "U14 Boys" } } },
            { label: "Fri", date: "18", events: { "6p": { label: "Vets" } } },
            { label: "Sat", date: "19", events: { "9a": { label: "G1" }, "11a": { label: "G2" }, "1p": { label: "G3" } } },
            { label: "Sun", date: "20", events: { "1p": { label: "Tourn" } } },
          ]} />
        </MockScreen>
      ),
    },
    {
      title: "Field Utilization",
      render: (c) => (
        <MockScreen title="Field Utilization" color={c}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ScreenLabel color={c}>Bookings by Field</ScreenLabel>
              <MiniBars color={c} data={[
                { x: "F1", y: 28 }, { x: "F2", y: 22 }, { x: "F3", y: 18 },
                { x: "F4", y: 14 }, { x: "F5", y: 10 }, { x: "F6", y: 26 },
              ]} />
            </div>
            <div>
              <ScreenLabel color={c}>Utilization Split</ScreenLabel>
              <MiniDonut color={c} data={[
                { name: "Peak", value: 74 },
                { name: "Off-peak", value: 18 },
                { name: "Dark", value: 8 },
              ]} />
            </div>
          </div>
        </MockScreen>
      ),
    },
    {
      title: "Field Grid — Drag & Drop",
      render: (c) => (
        <MockScreen title="Field Grid · Saturday" color={c}>
          <ScreenLabel color={c}>Toca Wixom — 4 Sections</ScreenLabel>
          <div className="grid grid-cols-4 gap-3">
            {["Field 1", "Field 2", "Field 3", "Field 4"].map((f, fi) => (
              <div key={fi} className="rounded-xl bg-slate-50 p-2.5">
                <div className="text-[10px] font-bold text-slate-500 mb-2">{f}</div>
                <div className="space-y-2">
                  {[0, 1, 2].map((bi) => (
                    <motion.div
                      key={bi}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * (fi + bi) }}
                      className="rounded-lg p-2 shadow-sm"
                      style={{ background: `${c}18` }}
                    >
                      <div className="text-[9px] font-bold" style={{ color: c }}>{["U12 Novi", "U14 Boys", "U16 GA"][bi]}</div>
                      <div className="text-[8px] text-slate-400">{["9–10a", "10–11a", "11a–12p"][bi]}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </MockScreen>
      ),
    },
  ],

  tournament_director: [
    {
      title: "Tournament Brackets",
      render: (c) => (
        <MockScreen title="Jaguar Invitational · U14 Bracket" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="Teams" value="16" trend="4 divisions" tone="neutral" color={c} />
            <StatTile label="Games" value="48" trend="Weekend" tone="neutral" color={c} />
            <StatTile label="Fields" value="12" trend="3 sites" tone="neutral" color={c} />
            <StatTile label="Live" value="6" trend="In play" tone="up" color={c} />
          </div>
          <ScreenLabel color={c}>U14 Division — Knockout</ScreenLabel>
          <MockBracket color={c} rounds={[
            { title: "Quarterfinals", matches: [
              { a: { name: "Jaguars", score: 3, win: true }, b: { name: "Hawks", score: 1 } },
              { a: { name: "Rovers", score: 2 }, b: { name: "United", score: 2, win: true } },
              { a: { name: "Elite", score: 4, win: true }, b: { name: "City", score: 0 } },
              { a: { name: "Academy", score: 1 }, b: { name: "Stars", score: 2, win: true } },
            ] },
            { title: "Semifinals", matches: [
              { a: { name: "Jaguars", score: 2, win: true }, b: { name: "United", score: 1 } },
              { a: { name: "Elite", score: 0 }, b: { name: "Stars", score: 2, win: true } },
            ] },
            { title: "Final", matches: [
              { a: { name: "Jaguars", score: "?", win: false }, b: { name: "Stars", score: "?", win: false } },
            ] },
          ]} />
        </MockScreen>
      ),
    },
    {
      title: "Referee Assignments",
      render: (c) => (
        <MockScreen title="Referee Assignments · Saturday" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="Assigned" value="36" trend="2 open" tone="down" color={c} />
            <StatTile label="Confirmed" value="31" trend="86%" tone="up" color={c} />
            <StatTile label="Fees" value="$3.2K" trend="Pending" tone="neutral" color={c} />
            <StatTile label="Games" value="48" trend="12 fields" tone="neutral" color={c} />
          </div>
          <ScreenLabel color={c}>Game Assignments</ScreenLabel>
          <div className="space-y-2">
            <ListRow title="F1 · Jaguars vs Hawks" sub="9am · Ref: M. Diaz" status="Confirmed" color={c} width="74%" />
            <ListRow title="F2 · Rovers vs United" sub="11am · Ref: —" status="Open" color={c} width="68%" />
            <ListRow title="F3 · Elite vs City" sub="1pm · Ref: T. Lee" status="Confirmed" color={c} width="72%" />
            <ListRow title="F4 · Academy vs Stars" sub="3pm · Ref: K. Owens" status="Pending" color={c} width="66%" />
          </div>
        </MockScreen>
      ),
    },
    {
      title: "Game-Day Task Board",
      render: (c) => (
        <MockScreen title="Game-Day Task Board" color={c}>
          <ScreenLabel color={c}>Matchday Operations</ScreenLabel>
          <MockKanban color={c} columns={[
            { title: "To Do", count: 6, items: [{}, {}, {}] },
            { title: "In Progress", count: 4, items: [{}, {}] },
            { title: "Done", count: 12, items: [{}, {}, {}] },
          ]} />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatTile label="Fields Prepped" value="10/12" trend="83%" tone="up" color={c} />
            <StatTile label="Trainers On-Site" value="6" trend="Ready" tone="up" color={c} />
            <StatTile label="Families Notified" value="92%" trend="Sent" tone="up" color={c} />
          </div>
        </MockScreen>
      ),
    },
  ],

  parent: [
    {
      title: "Family Account",
      render: (c) => (
        <MockScreen title="My Family" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="My Players" value="2" trend="2 teams" tone="neutral" color={c} />
            <StatTile label="Balance Due" value="$0" trend="Paid" tone="up" color={c} />
            <StatTile label="Next Event" value="Sat" trend="Game" tone="neutral" color={c} />
            <StatTile label="New Feedback" value="3" trend="This week" tone="up" color={c} />
          </div>
          <ScreenLabel color={c}>My Players</ScreenLabel>
          <PlayerCards color={c} players={[
            { initials: "LM", name: "Lucas M.", meta: "U14 · Forward", tag: "Active" },
            { initials: "SM", name: "Sofia M.", meta: "U12 · Mid", tag: "Active" },
          ]} />
        </MockScreen>
      ),
    },
    {
      title: "Team Calendar & RSVP",
      render: (c) => (
        <MockScreen title="Team Calendar · This Week" color={c}>
          <ScreenLabel color={c}>Upcoming Events</ScreenLabel>
          <MockCalendar color={c} days={[
            { label: "Mon", date: "14", events: { "5p": { label: "Practice" } } },
            { label: "Tue", date: "15", events: {} },
            { label: "Wed", date: "16", events: { "5p": { label: "Practice" } } },
            { label: "Thu", date: "17", events: {} },
            { label: "Fri", date: "18", events: { "6p": { label: "Team talk" } } },
            { label: "Sat", date: "19", events: { "11a": { label: "GAME" } } },
            { label: "Sun", date: "20", events: {} },
          ]} />
          <div className="mt-3 flex gap-2">
            <div className="flex-1 p-2 rounded-lg text-center" style={{ background: `${c}15` }}>
              <div className="text-[10px] font-bold" style={{ color: c }}>Going</div>
              <div className="text-lg font-extrabold" style={{ color: NAVY }}>14</div>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-slate-50 text-center">
              <div className="text-[10px] font-bold text-slate-500">Maybe</div>
              <div className="text-lg font-extrabold" style={{ color: NAVY }}>3</div>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-slate-50 text-center">
              <div className="text-[10px] font-bold text-slate-500">No reply</div>
              <div className="text-lg font-extrabold" style={{ color: NAVY }}>2</div>
            </div>
          </div>
        </MockScreen>
      ),
    },
    {
      title: "Player Development",
      render: (c) => (
        <MockScreen title="Lucas — Development" color={c}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ScreenLabel color={c}>E.P.I.C. Scores</ScreenLabel>
              <MiniRadar color={c} data={[
                { subject: "Tech", value: 8 },
                { subject: "Tac", value: 7 },
                { subject: "Phys", value: 9 },
                { subject: "Mental", value: 8 },
                { subject: "Effort", value: 9 },
              ]} />
            </div>
            <div>
              <ScreenLabel color={c}>Latest Coach Feedback</ScreenLabel>
              <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600 leading-relaxed">
                "Lucas showed excellent movement off the ball this week. Continue working on
                receiving under pressure. Goal: complete 5 wall passes under pressure in next game."
              </div>
              <div className="mt-3 space-y-2">
                <ProgressBar label="Season Goal: First Touch" value={72} color={c} />
                <ProgressBar label="Season Goal: 1v1 Duels" value={64} color={c} />
              </div>
            </div>
          </div>
        </MockScreen>
      ),
    },
  ],

  coach: [
    {
      title: "My Teams",
      render: (c) => (
        <MockScreen title="Coach Dashboard · U14 Jaguars" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="My Team" value="U14" trend="Jaguars" tone="neutral" color={c} />
            <StatTile label="Players" value="16" trend="2 new" tone="up" color={c} />
            <StatTile label="RSVPs In" value="14 / 16" trend="Sat game" tone="up" color={c} />
            <StatTile label="Evals Due" value="3" trend="This week" tone="neutral" color={c} />
          </div>
          <ScreenLabel color={c}>This Week</ScreenLabel>
          <MockCalendar color={c} days={[
            { label: "Mon", date: "14", events: { "5p": { label: "Practice" } } },
            { label: "Tue", date: "15", events: {} },
            { label: "Wed", date: "16", events: { "5p": { label: "Practice" } } },
            { label: "Thu", date: "17", events: {} },
            { label: "Fri", date: "18", events: {} },
            { label: "Sat", date: "19", events: { "11a": { label: "GAME" } } },
            { label: "Sun", date: "20", events: {} },
          ]} />
        </MockScreen>
      ),
    },
  ],
  player: [
    {
      title: "My Schedule",
      render: (c) => (
        <MockScreen title="My Schedule · U14 Jaguars" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="My Team" value="U14" trend="Jaguars" tone="neutral" color={c} />
            <StatTile label="Next Game" value="Sat" trend="Home" tone="neutral" color={c} />
            <StatTile label="Practices" value="3" trend="This week" tone="neutral" color={c} />
            <StatTile label="My RSVP" value="Going" trend="Confirmed" tone="up" color={c} />
          </div>
          <ScreenLabel color={c}>This Week</ScreenLabel>
          <MockCalendar color={c} days={[
            { label: "Mon", date: "14", events: { "5p": { label: "Practice" } } },
            { label: "Tue", date: "15", events: {} },
            { label: "Wed", date: "16", events: { "5p": { label: "Practice" } } },
            { label: "Thu", date: "17", events: { "6p": { label: "Gym" } } },
            { label: "Fri", date: "18", events: {} },
            { label: "Sat", date: "19", events: { "11a": { label: "GAME" } } },
            { label: "Sun", date: "20", events: {} },
          ]} />
        </MockScreen>
      ),
    },
    {
      title: "My Evaluations",
      render: (c) => (
        <MockScreen title="My E.P.I.C. Evaluations" color={c}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatTile label="Overall" value="8.2" trend="+0.4" tone="up" color={c} />
            <StatTile label="Top Skill" value="Effort" trend="9.1" tone="up" color={c} />
            <StatTile label="Focus" value="First Touch" trend="In progress" tone="neutral" color={c} />
            <StatTile label="Evals" value="4" trend="This season" tone="neutral" color={c} />
          </div>
          <ScreenLabel color={c}>My E.P.I.C. Profile</ScreenLabel>
          <MiniRadar color={c} data={[
            { subject: "Tech", value: 8 },
            { subject: "Tac", value: 7 },
            { subject: "Phys", value: 9 },
            { subject: "Mental", value: 8 },
            { subject: "Effort", value: 9 },
          ]} height={180} />
        </MockScreen>
      ),
    },
    {
      title: "My Goals & Training Videos",
      render: (c) => (
        <MockScreen title="My Goals & Training" color={c}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ScreenLabel color={c}>My Goals</ScreenLabel>
              <div className="space-y-3">
                <ProgressBar label="First Touch Under Pressure" value={72} color={c} />
                <ProgressBar label="1v1 Duel Win Rate" value={64} color={c} />
                <ProgressBar label="Passing Accuracy" value={81} color={c} />
              </div>
              <div className="mt-3 p-2.5 rounded-xl" style={{ background: `${c}12` }}>
                <div className="text-[10px] font-bold" style={{ color: c }}>1 Goal Completed 🎯</div>
                <div className="text-[9px] text-slate-500">Wall passes — keep it up!</div>
              </div>
            </div>
            <div>
              <ScreenLabel color={c}>Recommended Videos</ScreenLabel>
              <div className="space-y-2">
                <ListRow title="Receiving Under Pressure" sub="4 min" status="New" color={c} width="74%" />
                <ListRow title="1v1 Attacking Drills" sub="6 min" status="New" color={c} width="68%" />
                <ListRow title="Passing Patterns" sub="5 min" status="Watch" color={c} width="62%" />
              </div>
            </div>
          </div>
        </MockScreen>
      ),
    },
  ],
};