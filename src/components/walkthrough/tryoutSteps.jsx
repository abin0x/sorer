import React from "react";
import { Panel, Stat, Pill, Row, Btn, Field, Avatar } from "@/components/walkthrough/MockUI";

const players = ["Maya Lopez", "Ava Chen", "Sofia Reyes", "Lily Park", "Emma Davis", "Zoe Martin"];

const Setup = () => (
  <Panel title="New tryout — U12 Girls" right={<Pill tone="amber">Draft</Pill>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Dates" value="Aug 4 & Aug 6, 2027" />
      <Field label="Location" value="North Campus, Fields 1–2" />
      <Field label="Tryout fee" value="$25" />
      <Field label="Teams to fill" value="Premier, Elite, Select" />
    </div>
    <div className="mt-4 flex gap-2"><Btn>Publish & share link</Btn><Btn ghost>Assign evaluators</Btn></div>
  </Panel>
);

const Signups = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <Stat label="Registered" value="64" note="+12 this week" />
      <Stat label="Fees paid" value="61" />
      <Stat label="Waivers missing" value="3" />
    </div>
    <Panel title="Player pool">
      {players.slice(0, 4).map((n, k) => (
        <Row key={n}><span className="flex items-center gap-2"><Avatar name={n} />{n}</span><span className="text-muted-foreground">#{101 + k}</span><Pill tone={k === 2 ? "amber" : "green"}>{k === 2 ? "Waiver missing" : "Ready"}</Pill></Row>
      ))}
    </Panel>
  </div>
);

const CheckIn = () => (
  <div className="space-y-3">
    <Panel title="Check-in desk" right={<Pill tone="green">48 / 64 checked in</Pill>}>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-3/4 bg-primary" /></div>
      <div className="mt-3"><Field label="Search name or bib" value="Sof|" /></div>
      <Row><span className="flex items-center gap-2"><Avatar name="Sofia Reyes" />Sofia Reyes · Bib #103</span><Btn>Check in</Btn></Row>
    </Panel>
  </div>
);

const Score = () => (
  <Panel title="Ava Chen · Bib #102" right={<Pill>Session 1</Pill>}>
    {[["Ball control", 4], ["Passing", 5], ["Speed", 3], ["Game sense", 4]].map(([c, v]) => (
      <Row key={c}><span>{c}</span>
        <span className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold ${n === v ? "bg-primary text-primary-foreground" : "border border-border"}`}>{n}</span>
        ))}</span>
      </Row>
    ))}
    <div className="mt-3 flex flex-wrap gap-2"><Pill tone="green">Recommend: Premier</Pill><Pill>Saved offline ✓</Pill></div>
  </Panel>
);

const Progress = () => (
  <Panel title="My players to score" right={<Pill>18 of 24 done</Pill>}>
    {players.map((n, k) => (
      <Row key={n}><span className="flex items-center gap-2"><Avatar name={n} />{n}</span><Pill tone={k < 4 ? "green" : "amber"}>{k < 4 ? `Avg ${(4.5 - k * 0.3).toFixed(1)}` : "To score"}</Pill></Row>
    ))}
  </Panel>
);

const Rosters = () => (
  <div className="grid gap-3 md:grid-cols-3">
    <Panel title="Pool">
      {["Lily Park · 3.6", "Emma Davis · 3.4", "Zoe Martin · 3.1"].map((p) => (
        <div key={p} className="mb-2 rounded-lg border border-border bg-background p-2 text-sm">{p}</div>
      ))}
    </Panel>
    <Panel title="Premier" right={<Pill tone="green">14/16</Pill>}>
      {["Ava Chen · 4.6", "Maya Lopez · 4.4"].map((p) => (
        <div key={p} className="mb-2 rounded-lg border border-primary/40 bg-primary/10 p-2 text-sm">{p}</div>
      ))}
    </Panel>
    <Panel title="Elite" right={<Pill>9/16</Pill>}>
      <div className="mb-2 rounded-lg border border-primary/40 bg-primary/10 p-2 text-sm">Sofia Reyes · 3.9</div>
      <div className="rounded-lg border border-dashed border-border p-2 text-center text-xs text-muted-foreground">Drag a player here</div>
    </Panel>
  </div>
);

const Offers = () => (
  <Panel title="Offers — U12 Girls" right={<Btn>Send offers</Btn>}>
    {[["Ava Chen", "Premier", "Accepted", "green"], ["Maya Lopez", "Premier", "Accepted", "green"], ["Sofia Reyes", "Elite", "Waiting", "amber"], ["Lily Park", "Select", "Sent", "blue"]].map(([n, t, s, tone]) => (
      <Row key={n}><span>{n}</span><span className="text-muted-foreground">{t}</span><Pill tone={tone}>{s}</Pill></Row>
    ))}
  </Panel>
);

const Register = () => (
  <Panel title="U12 Girls tryouts — Demo FC">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Player" value="Maya Lopez" />
      <Field label="Birth year" value="2015" />
      <Field label="Choose a session" value="Aug 4 · 5:30 PM" />
      <Field label="Tryout fee" value="$25 — pay now" />
    </div>
    <div className="mt-4"><Btn>Register & pay</Btn></div>
  </Panel>
);

const Day = () => (
  <Panel title="You're all set for tryouts" right={<Pill tone="green">Confirmed</Pill>}>
    <Row><span>Bib number</span><span className="text-2xl font-bold">#101</span></Row>
    <Row><span>When</span><span>Aug 4 · arrive 5:15 PM</span></Row>
    <Row><span>Where</span><span>North Campus, Field 1</span></Row>
    <Row><span>Bring</span><span>Shin guards, water, cleats</span></Row>
  </Panel>
);

const Offer = () => (
  <Panel title="Tryout results" right={<Pill tone="green">Offer received</Pill>}>
    <p className="text-sm">Congratulations! Maya has been offered a spot on <b>U12 Girls Premier</b>.</p>
    <Row><span>Season dues</span><span>$1,250 or 5 × $250</span></Row>
    <Row><span>Reply by</span><span>Aug 12</span></Row>
    <div className="mt-3 flex gap-2"><Btn>Accept offer</Btn><Btn ghost>Decline</Btn></div>
  </Panel>
);

const Final = () => (
  <Panel title="Finish team registration">
    {["Medical release", "Code of conduct"].map((w) => <Row key={w}><span>{w}</span><Pill tone="green">Signed ✓</Pill></Row>)}
    <Row><span>First payment</span><span>$250.00</span></Row>
    <div className="mt-3"><Btn>Pay & join team</Btn></div>
    <p className="mt-3 text-sm text-status-success">Maya is now on the Premier roster 🎉</p>
  </Panel>
);


const Evaluators = () => (
  <Panel title="Evaluators — U12 Girls" right={<Btn>Invite evaluator</Btn>}>
    {[["Coach Rivera", "Fields 1 · Bibs 101–132", "green", "Accepted"], ["Coach Patel", "Field 2 · Bibs 133–164", "green", "Accepted"], ["Guest: J. Moore", "Floater", "amber", "Invite sent"]].map(([n, a, t, st]) => (
      <Row key={n}><span className="flex items-center gap-2"><Avatar name={n.replace("Guest: ", "")} />{n}</span><span className="text-muted-foreground">{a}</span><Pill tone={t}>{st}</Pill></Row>
    ))}
    <p className="mt-3 text-xs text-muted-foreground">Guest evaluators get a scoring link only — no access to fees or family details.</p>
  </Panel>
);

const Results = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3"><Stat label="Players scored" value="62 / 64" /><Stat label="Avg score" value="3.7" /><Stat label="Coach agreement" value="88%" /></div>
    <Panel title="Rankings — U12 Girls">
      {[["1", "Ava Chen", "4.6", "Premier"], ["2", "Maya Lopez", "4.4", "Premier"], ["3", "Sofia Reyes", "3.9", "Elite"], ["4", "Lily Park", "3.6", "Select"]].map(([r, n, a, t]) => (
        <Row key={n}><span className="w-6 font-bold">{r}</span><span className="flex-1">{n}</span><span className="font-semibold">{a}</span><Pill>{t}</Pill></Row>
      ))}
    </Panel>
  </div>
);

const Waitlist = () => (
  <Panel title="Declines & waitlist" right={<Pill tone="amber">1 spot open on Premier</Pill>}>
    <Row><span>Maya Lopez declined Premier</span><Pill tone="red">Declined</Pill></Row>
    <Row><span className="flex items-center gap-2"><Avatar name="Sofia Reyes" />Next on list: Sofia Reyes · 3.9</span><Btn>Offer spot</Btn></Row>
    <Row><span>Emma Davis · 3.4</span><Pill>Waitlist #2</Pill></Row>
  </Panel>
);

const Notes = () => (
  <Panel title="Ava Chen · notes" right={<Pill>Private to evaluators</Pill>}>
    <Field label="Your note" value="Strong left foot, great vision. Could play up an age group." />
    <div className="mt-3 flex flex-wrap gap-2"><Pill tone="green">Top pick</Pill><Pill>Center mid</Pill><Pill>Leader</Pill></div>
  </Panel>
);

const PayPlan = () => (
  <Panel title="Choose how to pay dues">
    {[["Pay in full", "$1,250 today", "green"], ["Monthly plan", "5 × $250", "blue"], ["Need help?", "Request financial aid", "amber"]].map(([a, b, t]) => (
      <Row key={a}><span className="font-semibold">{a}</span><Pill tone={t}>{b}</Pill></Row>
    ))}
    <p className="mt-3 text-xs text-muted-foreground">Automatic reminders before each payment — no surprises.</p>
  </Panel>
);

export const ADMIN_TRYOUT_STEPS = [
  { short: "Set up", title: "Create a tryout in minutes", path: "/tryoutdashboard", Screen: Setup, text: "Pick dates, fields, fee and which teams you're filling, then share one sign-up link." },
  { short: "Sign-ups", title: "Watch the player pool grow", path: "/tryoutdashboard", Screen: Signups, text: "Every registered player lands in one pool, with fee and waiver status so nothing slips through." },
  { short: "Evaluators", title: "Assign coaches and guest evaluators", path: "/tryoutdashboard", Screen: Evaluators, text: "Give each evaluator their fields and bib range. Guests only see the scoring screen.", points: ["No full accounts needed for guests", "Family details stay private"] },
  { short: "Check-in", title: "Fast check-in on tryout day", path: "/tryoutdashboard", Screen: CheckIn, text: "Volunteers type a name or bib number and tap once. The counter shows who's still missing." },
  { short: "Results", title: "See rankings the moment scoring ends", path: "/tryoutdashboard", Screen: Results, text: "Scores from every evaluator are averaged into one ranked list, with each coach's team recommendation." },
  { short: "Rosters", title: "Move players from pool to teams", path: "/tryoutdashboard", Screen: Rosters, text: "Coach scores appear next to every player. Drag them onto a team — or tap on a phone — and see each roster fill up." },
  { short: "Offers", title: "Send offers and track replies", path: "/tryoutdashboard", Screen: Offers, text: "One click emails every family their offer. See who accepted, who's waiting and resend if needed." },
  { short: "Waitlist", title: "Fill open spots from the waitlist", path: "/tryoutdashboard", Screen: Waitlist, text: "When a family declines, the next-best player is right there. Offer the spot in one tap." },
];

export const COACH_TRYOUT_STEPS = [
  { short: "My players", title: "See who you need to score", path: "/tryoutdashboard", Screen: Progress, text: "Coaches and evaluators only see the sessions they were assigned, with a clear count of who's left." },
  { short: "Score", title: "Score with big, simple buttons", path: "/tryoutdashboard", Screen: Score, text: "Tap 1–5 for each skill and add a team recommendation. Works on a phone at the field.", points: ["Saves even with bad signal", "Other coaches' scores stay private"] },
  { short: "Notes", title: "Add quick notes and tags", path: "/tryoutdashboard", Screen: Notes, text: "Jot down what you saw and tag positions. Notes are only shared with other evaluators and the director." },
  { short: "Recommend", title: "Your input shapes the rosters", path: "/tryoutdashboard", Screen: Rosters, text: "Your averages and recommendations show up on the roster board the director uses to build teams." },
];

export const PLAYER_TRYOUT_STEPS = [
  { short: "Register", title: "Sign up for tryouts", path: "/tryouts", Screen: Register, text: "Families pick a session and pay the tryout fee online in about two minutes." },
  { short: "Tryout day", title: "Know exactly where to go", path: "/tryoutstatus", Screen: Day, text: "Bib number, time, field and what to bring — all on one screen and in the confirmation email." },
  { short: "Offer", title: "Get the news and accept", path: "/tryoutstatus", Screen: Offer, text: "When the club sends offers, families get an email and can accept or decline with one tap." },
  { short: "Pay plan", title: "Pick a payment option that works", path: "/finalregistration", Screen: PayPlan, text: "Pay in full, spread dues monthly, or ask for financial aid — all online." },
  { short: "Join team", title: "Finish registration and join", path: "/finalregistration", Screen: Final, text: "Sign the team forms, make the first payment, and the player is added to the roster automatically." },
];
