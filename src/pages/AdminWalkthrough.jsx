import React from "react";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { Panel, Stat, Pill, Row, Btn, Field, Avatar } from "@/components/walkthrough/MockUI";

const Dashboard = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Active players" value="412" note="+38 this season" />
      <Stat label="Teams" value="27" />
      <Stat label="Dues collected" value="$84,250" note="91% of goal" />
      <Stat label="Open tasks" value="6" />
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="This week">
        <Row><span>U12 Girls practice</span><Pill>Tue 5:30</Pill></Row>
        <Row><span>U14 Boys vs. Rivers SC</span><Pill tone="green">Sat 10:00</Pill></Row>
        <Row><span>Coaches meeting</span><Pill tone="amber">Thu 7:00</Pill></Row>
      </Panel>
      <Panel title="Branches">
        <Row><span>North Campus</span><span className="font-semibold">214 players</span></Row>
        <Row><span>South Campus</span><span className="font-semibold">143 players</span></Row>
        <Row><span>Downtown</span><span className="font-semibold">55 players</span></Row>
      </Panel>
    </div>
  </div>
);

const Season = () => (
  <Panel title="Roll over to 2027 season" right={<Pill tone="amber">Draft</Pill>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="New season name" value="Fall 2027" />
      <Field label="Start date" value="Aug 1, 2027" />
    </div>
    <p className="mt-4 mb-2 text-sm font-medium">Bring forward</p>
    {["Teams & age groups (age up automatically)", "Coaches and team managers", "Fee schedule & discounts", "Field reservations"].map((t) => (
      <Row key={t}><span>☑ {t}</span><Pill tone="green">Included</Pill></Row>
    ))}
    <div className="mt-4 flex gap-2"><Btn>Roll over season</Btn><Btn ghost>Preview changes</Btn></div>
  </Panel>
);

const Registration = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <Stat label="Registered" value="368" />
      <Stat label="Paid in full" value="311" />
      <Stat label="On payment plan" value="44" />
    </div>
    <Panel title="Recent registrations" right={<Btn>Open registration</Btn>}>
      {[["Maya Lopez", "U12 Girls", "Paid", "green"], ["Ethan Brooks", "U10 Boys", "Plan 2/4", "blue"], ["Ava Chen", "U14 Girls", "Waiver missing", "amber"], ["Noah Patel", "U9 Boys", "Paid", "green"]].map(([n, t, s, tone]) => (
        <Row key={n}><span className="flex items-center gap-2"><Avatar name={n} />{n}</span><span className="text-muted-foreground">{t}</span><Pill tone={tone}>{s}</Pill></Row>
      ))}
    </Panel>
  </div>
);

const Teams = () => (
  <div className="grid gap-3 md:grid-cols-2">
    {[["U12 Girls Premier", "Coach Rivera", 16, 18], ["U14 Boys Academy", "Coach Kim", 18, 18], ["U10 Girls Select", "Coach Adams", 12, 14], ["U9 Boys Rec", "Coach Shah", 9, 12]].map(([t, c, n, max]) => (
      <Panel key={t} title={t} right={<Pill tone={n === max ? "green" : "blue"}>{n}/{max}</Pill>}>
        <p className="text-sm text-muted-foreground">{c}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
      </Panel>
    ))}
  </div>
);

const Schedule = () => (
  <Panel title="October — North Campus">
    <div className="grid grid-cols-7 gap-1 text-center text-xs">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="font-semibold text-muted-foreground">{d}</div>)}
      {Array.from({ length: 21 }, (_, n) => (
        <div key={n} className="min-h-14 rounded-md border border-border bg-background p-1 text-left">
          <span className="text-muted-foreground">{n + 6}</span>
          {n % 3 === 1 && <div className="mt-1 truncate rounded bg-primary/15 px-1 text-primary">Practice</div>}
          {n % 7 === 5 && <div className="mt-1 truncate rounded bg-status-success/15 px-1 text-status-success">Game</div>}
        </div>
      ))}
    </div>
  </Panel>
);

const Finances = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Collected (all processors)" value="$84,250" />
      <Stat label="Outstanding" value="$7,980" />
      <Stat label="Expenses" value="$31,400" />
      <Stat label="Synced to QuickBooks" value="100%" note="2 min ago" />
    </div>
    <Panel title="Connected accounts">
      <Row><span>Stripe — Demo FC payouts</span><Pill tone="green">Connected</Pill></Row>
      <Row><span>QuickBooks Online</span><Pill tone="green">Syncing</Pill></Row>
      <Row><span>Club email (Resend)</span><Pill tone="green">Connected</Pill></Row>
    </Panel>
  </div>
);

const Messages = () => (
  <Panel title="New message">
    <div className="space-y-3">
      <Field label="To" value="All U12 families (48)" />
      <Field label="Subject" value="Picture day this Saturday" />
      <div className="rounded-lg border border-input bg-background p-3 text-sm text-muted-foreground">Hi families! Team photos are Saturday at 9:00 at North Campus. Wear your home kit…</div>
      <div className="flex gap-2"><Btn>Send email + app notice</Btn><Btn ghost>Schedule</Btn></div>
    </div>
  </Panel>
);

const steps = [
  { short: "Dashboard", title: "See your whole club at a glance", path: "/dashboard", Screen: Dashboard,
    text: "When you sign in, your dashboard shows players, teams, money collected and what's happening this week — across every branch.",
    points: ["Switch between branches in one click", "Spot problems before parents call"] },
  { short: "New season", title: "Start a new season in minutes", path: "/seasons", Screen: Season,
    text: "Roll last season forward. Teams age up, coaches and fees carry over, and you only change what's different.",
    points: ["No re-typing teams every year", "Preview before anything changes"] },
  { short: "Registration", title: "Open registration and watch it fill", path: "/registrations", Screen: Registration,
    text: "Share one link. Families sign up, sign waivers and pay online. You see who's paid, who's on a plan and who still owes paperwork.",
    points: ["Payment plans and sibling discounts", "Automatic reminders for missing waivers"] },
  { short: "Teams", title: "Build rosters and assign coaches", path: "/teams", Screen: Teams,
    text: "Place players on teams and see at a glance which rosters are full and which still have spots." },
  { short: "Schedule", title: "Schedule practices and games", path: "/calendar", Screen: Schedule,
    text: "One calendar for fields, practices and games. Families see their own team's schedule automatically." },
  { short: "Money", title: "Get paid and keep the books clean", path: "/finances", Screen: Finances,
    text: "Payments go straight to your club's own processor (Stripe, Square, PayPal, Echelon or another gateway) and sync to your QuickBooks — no spreadsheets.",
    points: ["Your money, your account", "Expenses tracked by branch and team"] },
  { short: "Messages", title: "Reach every family at once", path: "/messages", Screen: Messages,
    text: "Send an email and app notice to one team, one age group or the whole club, from your club's own email address." },
];

export default function AdminWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Club Admin Walkthrough | Club Rudder", description: "See how a club director runs seasons, registration, teams, schedules and payments in Club Rudder, step by step." }}
      eyebrow="Interactive tour · Club admin"
      title="How a club director runs the season"
      intro="Click through seven short steps to see a day in the life of a Demo FC administrator. Sample data only."
      device="tablet"
      steps={steps}
      other={{ label: "More tours: parents, tryouts and coaches", to: "/walkthrough", cta: "See all tours" }}
    />
  );
}
