import React from "react";
import { Panel, Stat, Pill, Row, Btn, Field, Avatar } from "@/components/walkthrough/MockUI";

const Bar = ({ v }) => <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${v}%` }} /></div>;
const Item = ({ name, price, tag }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <div className="mb-2 flex h-14 items-center justify-center rounded-lg bg-primary/10 text-2xl">{tag}</div>
    <p className="text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{price}</p>
  </div>
);

/* ---------- Payments, store & expenses ---------- */
const StoreAdmin = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3"><Stat label="Store sales (Sep)" value="$12,480" note="+18%" /><Stat label="Orders" value="214" /><Stat label="Paid out to bank" value="$11,960" /></div>
    <Panel title="Club store" right={<Btn>Add item</Btn>}>
      {[["Home jersey 2027", "$45", "182 sold"], ["Training bundle", "$85", "64 sold"], ["Winter camp", "$120", "38 spots left"]].map(([n, p, s]) => (
        <Row key={n}><span className="font-semibold">{n}</span><span>{p}</span><Pill tone="green">{s}</Pill></Row>
      ))}
    </Panel>
  </div>
);
const Shop = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2"><Item name="Home jersey" price="$45" tag="👕" /><Item name="Winter camp" price="$120" tag="⛺" /><Item name="Training ball" price="$30" tag="⚽" /><Item name="Team hoodie" price="$55" tag="🧥" /></div>
    <Panel title="Your cart"><Row><span>Jersey · Youth M · #10</span><span>$45</span></Row><Row><span>Promo FALL10</span><span className="text-status-success">−$4.50</span></Row>
      <div className="mt-2"><Btn>Pay $40.50</Btn></div></Panel>
  </div>
);
const Events = () => (
  <Panel title="Events & clinics" right={<Btn>New event</Btn>}>
    {[["Goalkeeper clinic", "Sat Oct 2 · $35", "22/24", "amber"], ["Winter camp", "Dec 20–22 · $120", "62/100", "green"], ["Parent coaching course", "Oct 9 · Free", "14/30", "green"]].map(([n, d, c, t]) => (
      <Row key={n}><span><b className="block">{n}</b><span className="text-xs text-muted-foreground">{d}</span></span><Pill tone={t}>{c} signed up</Pill></Row>
    ))}
    <Row><span>Promo codes</span><span className="flex gap-1"><Pill>FALL10</Pill><Pill>SIBLING</Pill></span></Row>
  </Panel>
);
const Expense = () => (
  <Panel title="New expense">
    <div className="mb-3 flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-xs text-primary">📷 Receipt photo added</div>
    <Field label="What for" value="Tournament referee fees" /><div className="h-2" />
    <Field label="Amount" value="$180.00" /><div className="h-2" />
    <Field label="Team" value="U14 Boys Elite" />
    <div className="mt-3"><Btn>Submit for approval</Btn></div>
  </Panel>
);
const Approvals = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3"><Stat label="Waiting" value="7" /><Stat label="Approved (Sep)" value="$4,320" /><Stat label="In QuickBooks" value="100%" note="auto-synced" /></div>
    <Panel title="Expense approvals" right={<Btn>Approve all</Btn>}>
      {[["Coach Patel", "Referee fees", "$180"], ["Coach Kim", "Cones & bibs", "$64"], ["Coach Rivera", "Hotel deposit", "$350"]].map(([n, w, a]) => (
        <Row key={n}><span className="flex items-center gap-2"><Avatar name={n} />{n}</span><span className="text-muted-foreground">{w}</span><span className="font-semibold">{a}</span><Pill tone="amber">Review</Pill></Row>
      ))}
    </Panel>
  </div>
);
export const PAYMENTS_STEPS = [
  { short: "Store", title: "Your own club store", path: "/marketplacemanager", device: "tablet", Screen: StoreAdmin, text: "Sell uniforms, gear and camps. Money goes straight to the club's own payment processor." },
  { short: "Shop", title: "Families shop from their phone", path: "/store", device: "phone", Screen: Shop, text: "Parents pick sizes and numbers, add a promo code and pay in seconds." },
  { short: "Events", title: "Clinics, camps and events", path: "/eventmanager", device: "tablet", Screen: Events, text: "Create paid or free events with spot limits and promo codes. Sign-ups and payments are tracked for you." },
  { short: "Expenses", title: "Coaches snap a receipt", path: "/staffexpenses", device: "phone", Screen: Expense, text: "Coaches photograph a receipt, pick the team and submit — no paper forms." },
  { short: "Approvals", title: "Approve and it's in QuickBooks", path: "/expenseapprovals", device: "tablet", Screen: Approvals, text: "Directors approve in one tap. Approved expenses sync to the club's QuickBooks automatically.", points: ["Weekly digest emails", "Reminders for missing receipts"] },
];

/* ---------- Tournaments ---------- */
const TSetup = () => (
  <Panel title="Demo FC Fall Classic" right={<Pill tone="green">Registration open</Pill>}>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Dates" value="Nov 6–7, 2027" /><Field label="Divisions" value="U10–U14 · Boys & Girls" /><Field label="Team fee" value="$650" /><Field label="Fields" value="North Campus 1–4, South Park 1–3" /></div>
    <div className="mt-3 grid grid-cols-3 gap-3"><Stat label="Teams registered" value="48" /><Stat label="Paid" value="45" /><Stat label="Referees" value="22" /></div>
  </Panel>
);
const TSchedule = () => (
  <Panel title="Schedule — Saturday" right={<Btn>Auto-build schedule</Btn>}>
    {[["8:00", "Field 1", "Demo FC U12 vs. Rivers SC", "Ref: Moore"], ["8:00", "Field 2", "Lakeside vs. Metro United", "Ref: Diaz"], ["9:15", "Field 1", "Hillcrest vs. Demo FC U12", "Ref: Moore"]].map(([t, f, g, r]) => (
      <Row key={g}><span className="font-semibold">{t}</span><span className="text-muted-foreground">{f}</span><span className="flex-1">{g}</span><Pill>{r}</Pill></Row>
    ))}
    <p className="mt-2 text-xs text-status-success">✓ No team plays back-to-back · ✓ No referee double-booked</p>
  </Panel>
);
const TScore = () => (
  <div className="space-y-3">
    <Panel title="Field 1 · 8:00 AM" right={<Pill tone="green">Final</Pill>}>
      <div className="flex items-center justify-around py-3 text-center"><div><p className="text-xs">Demo FC U12</p><p className="text-4xl font-black">3</p></div><span className="text-muted-foreground">–</span><div><p className="text-xs">Rivers SC</p><p className="text-4xl font-black">1</p></div></div>
      <Btn>Submit score</Btn>
    </Panel>
    <p className="text-center text-xs text-muted-foreground">Standings update the moment you submit.</p>
  </div>
);
const TStand = () => (
  <Panel title="U12 Girls · Group A" right={<Pill>Live</Pill>}>
    {[["Demo FC U12", "2-0-0", "6"], ["Hillcrest", "1-0-1", "4"], ["Rivers SC", "0-1-1", "1"], ["Lakeside", "0-1-1", "1"]].map(([n, r, p], k) => (
      <Row key={n}><span className="w-5 font-bold">{k + 1}</span><span className="flex-1">{n}</span><span className="text-muted-foreground">{r}</span><span className="font-bold">{p} pts</span></Row>
    ))}
  </Panel>
);
export const TOURNAMENT_STEPS = [
  { short: "Set up", title: "Host a tournament", path: "/tournamentmanager", device: "tablet", Screen: TSetup, text: "Set divisions, fields and fees. Outside teams register and pay online." },
  { short: "Schedule", title: "A full schedule in one click", path: "/tournamentmanager", device: "tablet", Screen: TSchedule, text: "Club Rudder builds every game across every field and assigns referees — without clashes." },
  { short: "Scores", title: "Coaches enter scores on the sideline", path: "/tournamentmanager", device: "phone", Screen: TScore, text: "Big, simple score buttons right after the whistle." },
  { short: "Standings", title: "Live standings for families", path: "/tournamentstandings", device: "phone", Screen: TStand, text: "Parents follow brackets and standings live from the stands." },
];

/* ---------- Projects, programs & reports ---------- */
const Board = () => (
  <div className="grid gap-3 md:grid-cols-3">
    {[["To do", ["Order spring uniforms", "Book hotel for State Cup"]], ["In progress", ["Hire U9 coach", "Field permit renewal"]], ["Done", ["Fall photos", "Referee course"]]].map(([c, cards]) => (
      <Panel key={c} title={c} right={<Pill>{cards.length}</Pill>}>
        {cards.map((t, k) => <div key={t} className="mb-2 rounded-lg border border-border bg-background p-2 text-sm"><p className="font-medium">{t}</p><p className="mt-1 text-[11px] text-muted-foreground">{["Due Oct 4 · JD", "Due Oct 12 · Kim"][k]}</p></div>)}
      </Panel>
    ))}
  </div>
);
const Programs = () => (
  <Panel title="Programs" right={<Btn>New from template</Btn>}>
    {[["Fall Recreational", 92, "412 players"], ["Academy pathway", 70, "128 players"], ["Summer camps", 40, "Planning"]].map(([n, v, s]) => (
      <div key={n} className="py-2 text-sm"><div className="mb-1 flex justify-between"><b>{n}</b><span className="text-muted-foreground">{s}</span></div><Bar v={v} /></div>
    ))}
  </Panel>
);
const CEO = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3"><Stat label="Revenue YTD" value="$486k" note="+12%" /><Stat label="Players" value="412" /><Stat label="Retention" value="84%" /></div>
    <Panel title="By branch">
      {[["North Campus", 88], ["South Park", 72], ["Downtown", 55]].map(([n, v]) => <div key={n} className="py-1.5 text-sm"><div className="mb-1 flex justify-between"><span>{n}</span><span>{v}% full</span></div><Bar v={v} /></div>)}
    </Panel>
  </div>
);
const Reports = () => (
  <Panel title="Scheduled reports" right={<Btn>New report</Btn>}>
    {[["Weekly money summary", "Mondays 8 AM · Board"], ["Registration by branch", "1st of month · Directors"], ["Coach attendance", "Fridays · Coaching director"]].map(([n, w]) => (
      <Row key={n}><span className="font-semibold">{n}</span><span className="text-muted-foreground">{w}</span><Pill tone="green">On</Pill></Row>
    ))}
  </Panel>
);
export const PROJECTS_STEPS = [
  { short: "Task board", title: "Every club project on one board", path: "/kanban", device: "tablet", Screen: Board, text: "Staff tasks move from To do to Done. Everyone sees who owns what and when it's due." },
  { short: "Programs", title: "Run programs from templates", path: "/programslist", device: "tablet", Screen: Programs, text: "Start each program from a proven template and track it to launch." },
  { short: "Big picture", title: "The director's dashboard", path: "/reports", device: "tablet", Screen: CEO, text: "Revenue, player numbers and retention across every branch in one view." },
  { short: "Reports", title: "Reports that send themselves", path: "/scheduledreports", device: "tablet", Screen: Reports, text: "Pick a report and a schedule. The board gets it by email — no spreadsheets." },
];

/* ---------- Marketing & website ---------- */
const Site = () => (
  <Panel title="Club website" right={<Pill tone="green">Live · democfc.com</Pill>}>
    <div className="rounded-xl bg-primary p-5 text-primary-foreground"><p className="text-xs font-bold uppercase tracking-widest opacity-80">Demo FC</p><p className="text-xl font-black">Fall tryouts are open</p><span className="mt-2 inline-block rounded-lg bg-primary-foreground px-3 py-1 text-xs font-bold text-primary">Register now</span></div>
    <div className="mt-3 flex flex-wrap gap-2"><Pill>Your logo & colors</Pill><Pill>Programs auto-listed</Pill><Pill>Sign-up links built in</Pill></div>
  </Panel>
);
const Campaign = () => (
  <Panel title="New campaign · Fall tryouts">
    <Field label="Goal" value="Get 80 tryout sign-ups" /><div className="h-2" />
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm"><p className="text-[11px] font-bold text-primary">✨ Suggested post</p>Think your player is ready for the next level? Demo FC fall tryouts start Aug 4. Spots fill fast ⚽</div>
    <div className="mt-3 flex gap-2"><Btn>Use this</Btn><Btn ghost>Try again</Btn></div>
  </Panel>
);
const Social = () => (
  <Panel title="Publishing queue" right={<Btn>Publish all</Btn>}>
    {[["Instagram", "Tryouts open!", "Mon 6 PM", "green"], ["Facebook", "Meet our new coaches", "Wed 12 PM", "blue"], ["Instagram", "Game day recap", "Sat 4 PM", "amber"]].map(([s, p, w, t]) => (
      <Row key={p}><Pill tone={t}>{s}</Pill><span className="flex-1">{p}</span><span className="text-muted-foreground">{w}</span></Row>
    ))}
    <p className="mt-2 text-xs text-muted-foreground">Last campaign: 4,200 views · 61 tryout sign-ups</p>
  </Panel>
);
export const MARKETING_STEPS = [
  { short: "Website", title: "A club website that updates itself", path: "/marketing", device: "tablet", Screen: Site, text: "Your logo and colors, with programs and sign-up links pulled straight from Club Rudder." },
  { short: "Campaigns", title: "Campaigns written for you", path: "/marketing", device: "tablet", Screen: Campaign, text: "Tell it your goal and get ready-to-post wording you can edit." },
  { short: "Social", title: "Schedule posts everywhere", path: "/marketing", device: "tablet", Screen: Social, text: "Queue posts for Instagram and Facebook and see which ones brought in sign-ups." },
];

/* ---------- Coach's day (core) ---------- */
const Today = () => (
  <div className="space-y-2">
    <div className="rounded-xl bg-primary p-3 text-primary-foreground"><p className="text-[10px] font-bold uppercase opacity-80">Today · 5:30 PM</p><p className="font-bold">U12 Girls Premier practice</p><p className="text-xs opacity-90">North Campus · Field 1</p></div>
    <Panel title="This week">
      <Row><span>Thu · Practice</span><span className="text-muted-foreground">5:30 PM</span></Row>
      <Row><span>Sat · vs. Rivers SC</span><span className="text-muted-foreground">10:00 AM</span></Row>
    </Panel>
  </div>
);
const Attendance = () => (
  <Panel title="Attendance" right={<Pill tone="green">15 / 16</Pill>}>
    {["Ava Chen", "Maya Lopez", "Sofia Reyes", "Lily Park", "Emma Davis"].map((n, k) => (
      <Row key={n}><span className="flex items-center gap-2"><Avatar name={n} />{n}</span><Pill tone={k === 4 ? "amber" : "green"}>{k === 4 ? "Excused" : "Here ✓"}</Pill></Row>
    ))}
  </Panel>
);
const RosterInfo = () => (
  <Panel title="Ava Chen">
    <Row><span>Parent</span><span>Wei Chen · Call · Text</span></Row>
    <Row><span>Medical</span><Pill tone="amber">Asthma · inhaler in bag</Pill></Row>
    <Row><span>Waivers</span><Pill tone="green">All signed</Pill></Row>
    <Row><span>Coach notes</span><span className="text-muted-foreground">3 this season</span></Row>
  </Panel>
);
const Availability = () => (
  <Panel title="Saturday vs. Rivers SC">
    <div className="grid grid-cols-3 gap-2"><Stat label="Going" value="14" /><Stat label="Not going" value="1" /><Stat label="No reply" value="1" /></div>
    <div className="mt-3"><Btn>Remind the 1 family</Btn></div>
  </Panel>
);
export const COACH_DAY_STEPS = [
  { short: "Today", title: "Your day at a glance", path: "/coach", Screen: Today, text: "Coaches open the app and see today's practice, field and the week ahead." },
  { short: "Attendance", title: "Take attendance in seconds", path: "/coach", Screen: Attendance, text: "Tap each player as they arrive. Parents who sent an excuse are already marked." },
  { short: "Player info", title: "Contacts and medical info on hand", path: "/coach", Screen: RosterInfo, text: "Parent contacts, medical notes and waiver status — right there at the field." },
  { short: "Game RSVPs", title: "Know who's coming to the game", path: "/coach", Screen: Availability, text: "Families reply Going or Not going. Nudge the rest with one tap." },
];
