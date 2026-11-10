import React from "react";
import { Panel, Stat, Pill, Row, Btn, Field, Avatar } from "@/components/walkthrough/MockUI";

/* Extra slides that round every tour out to a full workflow (6–7 steps). */
const Bar = ({ v }) => <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${v}%` }} /></div>;
const Hero = ({ eyebrow, title, sub, tone = "bg-primary text-primary-foreground" }) => (
  <div className={`rounded-xl p-3 ${tone}`}><p className="text-[10px] font-bold uppercase opacity-80">{eyebrow}</p><p className="font-bold">{title}</p>{sub && <p className="text-xs opacity-90">{sub}</p>}</div>
);
const Msg = ({ from, text, mine }) => (
  <p className={`w-fit max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>{from && <b>{from}: </b>}{text}</p>
);

/** Insert extra steps into a base list: [{ at, step }] with `at` = index in the final list. */
export const withExtras = (base, extras) => {
  const out = [...base];
  extras.forEach(({ at, step }) => out.splice(at, 0, step));
  return out;
};

/* ---- Tryouts: coach ---- */
const MySessions = () => (
  <div className="space-y-2">
    <Hero eyebrow="Tonight · 5:30 PM" title="U12 Girls tryout · Session 1" sub="North Campus · Field 1 · Bibs 101–132" />
    <Panel title="Your assignment"><Row><span>Players</span><b>24</b></Row><Row><span>Skills to score</span><b>4</b></Row><Row><span>Other evaluators</span><span>Coach Patel</span></Row></Panel>
    <Btn>Start scoring</Btn>
  </div>
);
const Compare = () => (
  <Panel title="Compare side by side">
    {[["Ball control", 4, 3], ["Passing", 5, 4], ["Speed", 3, 5], ["Game sense", 4, 3]].map(([c, a, b]) => (
      <Row key={c}><span className="w-20">{c}</span><span className="font-bold text-primary">{a}</span><span className="text-muted-foreground">vs</span><span className="font-bold">{b}</span></Row>
    ))}
    <div className="mt-2 flex justify-between text-xs"><Pill tone="green">Ava Chen 4.0</Pill><Pill>Zoe Martin 3.8</Pill></div>
  </Panel>
);
const Submit = () => (
  <div className="space-y-2">
    <div className="grid grid-cols-3 gap-2"><Stat label="Scored" value="24" /><Stat label="Notes" value="11" /><Stat label="Synced" value="✓" /></div>
    <Panel title="Ready to submit"><Row><span>Offline scores uploaded</span><Pill tone="green">Done</Pill></Row><Row><span>Recommendations</span><Pill>9 Premier · 8 Elite</Pill></Row></Panel>
    <Btn>Submit to director</Btn>
  </div>
);
export const COACH_TRYOUT_EXTRAS = [
  { at: 0, step: { short: "My session", title: "Know your session and players", path: "/tryoutdashboard", Screen: MySessions, text: "Evaluators see their field, time and bib range the moment they open the app." } },
  { at: 4, step: { short: "Compare", title: "Compare two players side by side", path: "/tryoutdashboard", Screen: Compare, text: "Stuck between two players? Put their scores next to each other before you recommend." } },
  { at: 6, step: { short: "Submit", title: "Submit with one tap", path: "/tryoutdashboard", Screen: Submit, text: "Scores saved offline upload automatically. Submit and the director sees everything on the roster board.", points: ["Nothing lost to bad signal", "Director notified instantly"] } },
];

/* ---- Tryouts: player ---- */
const Reminder = () => (
  <div className="space-y-2 pt-2">
    <div className="rounded-2xl bg-card p-3 shadow-sm"><p className="text-[10px] font-bold text-primary">🔔 BEACON · tryouts-2027</p><p className="text-sm font-semibold">Tryouts tomorrow 5:30 PM</p><p className="text-xs text-muted-foreground">Arrive 15 min early · Bib #101 · Field 1</p></div>
    <div className="rounded-2xl bg-card p-3 shadow-sm"><p className="text-[10px] font-bold text-status-danger">🚨 URGENT</p><p className="text-sm font-semibold">Session moved to Field 2 (lights)</p></div>
    <Btn>Add to calendar</Btn>
  </div>
);
const Waiting = () => (
  <Panel title="Tryout status">
    {[["Registered & paid", "green", "✓"], ["Checked in · Session 1", "green", "✓"], ["Checked in · Session 2", "green", "✓"], ["Coaches reviewing", "amber", "In progress"], ["Offers sent", "blue", "Fri 6 PM"]].map(([t, c, s]) => (
      <Row key={t}><span>{t}</span><Pill tone={c}>{s}</Pill></Row>
    ))}
  </Panel>
);
export const PLAYER_TRYOUT_EXTRAS = [
  { at: 2, step: { short: "Reminders", title: "Reminders and changes on your phone", path: "/tryoutstatus", Screen: Reminder, text: "Beacon reminds families the day before and alerts them right away if a field or time changes." } },
  { at: 3, step: { short: "Status", title: "Always know where things stand", path: "/tryoutstatus", Screen: Waiting, text: "A simple checklist shows every stage — no more emailing the club to ask what's next." } },
];

/* ---- Facilities ---- */
const GridImport = () => (
  <Panel title="Import training grid" right={<Pill tone="green">48 slots found</Pill>}>
    <div className="mb-3 flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-sm text-primary">📄 Fall_training_grid.xlsx</div>
    {[["U10 Boys", "Mon/Wed 5 PM · Field 1"], ["U12 Girls", "Tue/Thu 5 PM · Field 1"], ["U14 Boys", "Mon/Thu 6:30 PM · Field 2"]].map(([t, w]) => <Row key={t}><span>{t}</span><span className="text-muted-foreground">{w}</span><Pill tone="green">OK</Pill></Row>)}
    <div className="mt-3"><Btn>Publish to all team calendars</Btn></div>
  </Panel>
);
const Billing = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3"><Stat label="Invoiced (Sep)" value="$6,840" /><Stat label="Paid" value="$5,200" /><Stat label="Overdue" value="$640" /></div>
    <Panel title="Field rental invoices" right={<Btn>Send invoices</Btn>}>
      {[["Lakeside FC", "12 hrs · Field 3", "$1,440", "green", "Paid"], ["Adult league", "20 hrs · Field 1", "$2,400", "amber", "Due Oct 5"], ["Metro United", "6 hrs", "$640", "red", "Overdue"]].map(([n, h, a, t, s]) => (
        <Row key={n}><span className="font-semibold">{n}</span><span className="text-muted-foreground">{h}</span><span>{a}</span><Pill tone={t}>{s}</Pill></Row>
      ))}
    </Panel>
  </div>
);
export const FACILITY_EXTRAS = [
  { at: 1, step: { short: "Import grid", title: "Turn a spreadsheet into a season schedule", path: "/gridimport", Screen: GridImport, text: "Upload your training grid. Club Rudder reads it, checks for clashes and publishes every team's practices.", points: ["No retyping", "Every family's calendar updates"] } },
  { at: 6, step: { short: "Billing", title: "Bill outside groups for field time", path: "/facilitybilling", Screen: Billing, text: "Rentals turn into invoices automatically. See who paid and send reminders for the rest." } },
];

/* ---- Development ---- */
const TestDay = () => (
  <Panel title="Skill test day · U12" right={<Pill tone="green">Live</Pill>}>
    {[["Ava Chen", "7.1s", "42", "green"], ["Maya Lopez", "7.4s", "38", "green"], ["Sofia Reyes", "—", "—", "amber"]].map(([n, s, j, t]) => (
      <Row key={n}><span className="flex items-center gap-2"><Avatar name={n} />{n}</span><span>40m sprint {s}</span><span>Juggles {j}</span><Pill tone={t}>{t === "green" ? "Done" : "Next"}</Pill></Row>
    ))}
    <p className="mt-2 text-xs text-muted-foreground">Results compare against club benchmarks for each age group.</p>
  </Panel>
);
const Library = () => (
  <div className="grid gap-3 md:grid-cols-3">
    {[["🎥", "Weak-foot passing", "Video · 4 min"], ["📘", "U12 curriculum", "Season plan"], ["🧠", "Pressing basics", "Knowledge bank"]].map(([i, t, s]) => (
      <Panel key={t}><div className="mb-2 flex h-16 items-center justify-center rounded-lg bg-primary/10 text-3xl">{i}</div><p className="font-semibold">{t}</p><p className="text-xs text-muted-foreground">{s}</p><div className="mt-2"><Pill tone="green">Assigned to 18</Pill></div></Panel>
    ))}
  </div>
);
export const DEVELOPMENT_EXTRAS = [
  { at: 2, step: { short: "Test day", title: "Run skill test days", path: "/testdaymanager", Screen: TestDay, text: "Record sprints, juggling and more on test day. Results go straight onto each player's profile." } },
  { at: 5, step: { short: "Library", title: "Videos and curriculum for every age", path: "/videolibrary", Screen: Library, text: "Share drills, videos and the club curriculum so coaches teach the same way at every branch." } },
];

/* ---- Payments ---- */
const Plans = () => (
  <Panel title="Fall dues · Maya">
    <Row><span>Plan</span><span>5 × $250 · autopay</span></Row>
    {[["Aug 1", "green", "Paid"], ["Sep 1", "green", "Paid"], ["Oct 1", "blue", "Scheduled"], ["Nov 1", "blue", "Scheduled"]].map(([d, t, s]) => <Row key={d}><span>{d}</span><Pill tone={t}>{s}</Pill></Row>)}
    <div className="mt-2"><Btn ghost>Update card</Btn></div>
  </Panel>
);
const Payouts = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3"><Stat label="Collected" value="$84,250" /><Stat label="Paid to bank" value="$82,900" /><Stat label="Matched in QuickBooks" value="100%" note="auto" /></div>
    <Panel title="Recent payouts">
      {[["Sep 28", "$4,120", "48 payments"], ["Sep 21", "$6,880", "71 payments"], ["Sep 14", "$3,410", "39 payments"]].map(([d, a, n]) => <Row key={d}><span>{d}</span><span className="font-semibold">{a}</span><span className="text-muted-foreground">{n}</span><Pill tone="green">In QuickBooks</Pill></Row>)}
    </Panel>
  </div>
);
export const PAYMENTS_EXTRAS = [
  { at: 2, step: { short: "Pay plans", title: "Payment plans that collect themselves", path: "/payments", device: "phone", Screen: Plans, text: "Families choose monthly payments with autopay. Reminders go out before every charge." } },
  { at: 6, step: { short: "Payouts", title: "Every payout matched in QuickBooks", path: "/payments", device: "tablet", Screen: Payouts, text: "Money lands in the club's bank and every payment is recorded in QuickBooks — no month-end cleanup.", points: ["Each branch can have its own accounts", "No per-transaction fees from us"] } },
];

/* ---- Tournaments ---- */
const TeamReg = () => (
  <Panel title="Register for Fall Classic">
    <Field label="Club" value="Lakeside FC" /><div className="h-2" />
    <Field label="Team & division" value="U12 Girls · Gold" /><div className="h-2" />
    <Field label="Roster" value="16 players uploaded ✓" />
    <div className="mt-3"><Btn>Pay $650 & register</Btn></div>
  </Panel>
);
const Refs = () => (
  <Panel title="Referee assignments" right={<Btn>Auto-assign</Btn>}>
    {[["J. Moore", "6 games · Field 1", "green", "Confirmed"], ["L. Diaz", "5 games · Field 2", "green", "Confirmed"], ["K. Shah", "4 games · Field 3", "amber", "Awaiting reply"]].map(([n, g, t, s]) => (
      <Row key={n}><span className="flex items-center gap-2"><Avatar name={n} />{n}</span><span className="text-muted-foreground">{g}</span><Pill tone={t}>{s}</Pill></Row>
    ))}
    <p className="mt-2 text-xs text-muted-foreground">Referee pay is totaled automatically for each official.</p>
  </Panel>
);
const Bracket = () => (
  <div className="space-y-2">
    <Hero eyebrow="U12 Girls · Final" title="🏆 Demo FC U12 — Champions" sub="Beat Hillcrest 2–1" />
    <Panel title="Knockout">
      <Row><span>Semi 1</span><span>Demo FC 3–0 Lakeside</span></Row>
      <Row><span>Semi 2</span><span>Hillcrest 2–1 Rivers SC</span></Row>
      <Row><span className="font-bold">Final</span><span className="font-bold">Demo FC 2–1 Hillcrest</span></Row>
    </Panel>
  </div>
);
export const TOURNAMENT_EXTRAS = [
  { at: 1, step: { short: "Team sign-up", title: "Visiting teams register from their phone", path: "/tournaments", device: "phone", Screen: TeamReg, text: "Outside clubs pick a division, upload a roster and pay — no paper forms or checks." } },
  { at: 3, step: { short: "Referees", title: "Assign referees without the phone calls", path: "/tournamentmanager", device: "tablet", Screen: Refs, text: "Referees are assigned across fields, confirm from their phone, and their pay is totaled for you." } },
  { at: 6, step: { short: "Champions", title: "Brackets right through to the final", path: "/tournamentstandings", device: "phone", Screen: Bracket, text: "Knockout rounds fill in automatically from group results, all the way to the champions." } },
];

/* ---- Projects ---- */
const TaskDetail = () => (
  <Panel title="Book hotel for State Cup" right={<Pill tone="amber">Due Oct 12</Pill>}>
    {[["Get 3 quotes", true], ["Collect deposits from families", true], ["Sign contract", false]].map(([t, d]) => <Row key={t}><span>{d ? "☑" : "☐"} {t}</span><Pill tone={d ? "green" : "blue"}>{d ? "Done" : "Open"}</Pill></Row>)}
    <Row><span>Time logged</span><span>3h 20m · Kim</span></Row>
  </Panel>
);
const Insights = () => (
  <Panel title="Project check-up · Summer camps" right={<Pill tone="blue">✨ Suggestions</Pill>}>
    <Row><span>Budget forecast</span><span className="font-semibold">$18,400 · on track</span></Row>
    <Row><span>Risk</span><Pill tone="amber">Coach sign-ups behind by 3</Pill></Row>
    <Row><span>Suggestion</span><span className="text-muted-foreground">Move Coach Adams from Rec to camps in July</span></Row>
  </Panel>
);
const Roadmap = () => (
  <Panel title="Club roadmap · 2027">
    {[["New branch: Westfield", 15, 70], ["Academy launch", 40, 45], ["Turf field upgrade", 60, 35]].map(([n, s, w]) => (
      <div key={n} className="py-2 text-sm"><p className="mb-1">{n}</p><div className="relative h-3 rounded-full bg-muted"><div className="absolute h-3 rounded-full bg-primary" style={{ left: `${s}%`, width: `${w}%` }} /></div></div>
    ))}
    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span><span>Dec</span></div>
  </Panel>
);
export const PROJECTS_EXTRAS = [
  { at: 1, step: { short: "Task detail", title: "Checklists and time on every task", path: "/kanban", Screen: TaskDetail, text: "Break a task into steps, log time and see exactly what's left." } },
  { at: 3, step: { short: "Check-up", title: "Spot budget and staffing problems early", path: "/programslist", Screen: Insights, text: "Club Rudder flags risks and forecasts budgets so you can fix problems before camp starts.", points: ["Budget forecasts", "Staffing suggestions"] } },
  { at: 4, step: { short: "Roadmap", title: "A roadmap for the whole year", path: "/roadmap", Screen: Roadmap, text: "Big projects — a new branch, an academy, a field upgrade — on one timeline the board can follow." } },
];

/* ---- Marketing ---- */
const Brand = () => (
  <Panel title="Brand kit">
    <div className="flex items-center gap-3"><span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-xl font-black text-primary-foreground">DF</span><div className="flex gap-2">{["bg-primary", "bg-accent", "bg-foreground", "bg-muted"].map((c) => <span key={c} className={`h-8 w-8 rounded-full border border-border ${c}`} />)}</div></div>
    <Row><span>Font</span><span>Bold & friendly</span></Row><Row><span>Used on</span><span>Website · store · emails · app</span></Row>
  </Panel>
);
const Pages = () => (
  <Panel title="Website pages" right={<Btn>Add page</Btn>}>
    {[["Home", "Published"], ["Tryouts", "Published"], ["Programs", "Auto-updated"], ["Coaches", "Draft"]].map(([p, s]) => <Row key={p}><span className="font-semibold">{p}</span><Pill tone={s === "Draft" ? "amber" : "green"}>{s}</Pill></Row>)}
  </Panel>
);
const Accounts = () => (
  <Panel title="Connected accounts">
    {[["Instagram", "@democfc"], ["Facebook", "Demo FC Soccer"]].map(([a, h]) => <Row key={a}><span className="font-semibold">{a}</span><span className="text-muted-foreground">{h}</span><Pill tone="green">Connected</Pill></Row>)}
  </Panel>
);
const Results = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3"><Stat label="Views" value="4,200" /><Stat label="Clicks" value="380" /><Stat label="Sign-ups" value="61" note="from social" /></div>
    <Panel title="Best posts"><Row><span>Tryouts open!</span><b>34 sign-ups</b></Row><Row><span>Meet our coaches</span><b>15 sign-ups</b></Row></Panel>
  </div>
);
export const MARKETING_EXTRAS = [
  { at: 0, step: { short: "Brand kit", title: "Your brand in one place", path: "/marketing", Screen: Brand, text: "Logo, colors and style are saved once and used everywhere — website, store, emails and the app." } },
  { at: 2, step: { short: "Pages", title: "Edit pages without a web designer", path: "/marketing", Screen: Pages, text: "Add and edit pages yourself. Program and tryout pages update automatically." } },
  { at: 4, step: { short: "Accounts", title: "Connect your social accounts", path: "/marketing", Screen: Accounts, text: "Link Instagram and Facebook once, then post from Club Rudder." } },
  { at: 6, step: { short: "Results", title: "See which posts bring in players", path: "/marketing", Screen: Results, text: "Track views, clicks and actual sign-ups from each campaign.", points: ["Real sign-ups, not just likes"] } },
];

/* ---- Coach's day ---- */
const Plan = () => (
  <Panel title="Tonight's session plan">
    {[["Warm-up", "Rondos 4v1", "10 min"], ["Technical", "Weak-foot passing", "20 min"], ["Game", "6v6 small-sided", "25 min"], ["Cool-down", "Stretch & chat", "5 min"]].map(([a, b, c]) => <Row key={a}><span><b className="block">{a}</b><span className="text-xs text-muted-foreground">{b}</span></span><Pill>{c}</Pill></Row>)}
  </Panel>
);
const Feedback = () => (
  <Panel title="Feedback · Ava Chen">
    <div className="mb-2 flex flex-wrap gap-1.5"><Pill tone="green">Great effort</Pill><Pill>Leadership</Pill><Pill tone="amber">Work on: first touch</Pill></div>
    <Field label="Note to family" value="Ava led the warm-up today — awesome! Try 10 min of wall passes at home." />
    <div className="mt-3"><Btn>Share with family</Btn></div>
  </Panel>
);
const TeamMsg = () => (
  <div className="space-y-2">
    <p className="text-[10px] font-bold uppercase tracking-widest text-primary"># u12-girls-premier</p>
    <Msg mine text="Great practice tonight! Saturday: arrive 9:15, white jerseys ⚽" />
    <Msg from="Lopez family" text="👍 See you there" />
    <Msg from="Chen family" text="Can we carpool from North Campus?" />
    <p className="text-center text-[11px] text-muted-foreground">✓ Seen by 15 of 16 families</p>
  </div>
);
export const COACH_DAY_EXTRAS = [
  { at: 1, step: { short: "Session plan", title: "Tonight's plan in your pocket", path: "/coach", Screen: Plan, text: "Coaches follow a session plan from the club curriculum — drills, timings and all." } },
  { at: 4, step: { short: "Feedback", title: "Quick feedback families love", path: "/coach", Screen: Feedback, text: "Tap a few tags, add a sentence, and share it with the family in seconds." } },
  { at: 6, step: { short: "Message team", title: "Message the whole team", path: "/coach", Screen: TeamMsg, text: "Post in the team's Beacon channel and see who has read it.", points: ["Safe club channels", "Read receipts"] } },
];
