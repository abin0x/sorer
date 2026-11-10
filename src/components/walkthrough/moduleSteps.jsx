import React from "react";
import { Panel, Stat, Pill, Row, Btn, Field, Avatar } from "@/components/walkthrough/MockUI";

/* ---------- Facilities & field management ---------- */
const FieldMap = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3"><Stat label="Fields" value="9" note="3 locations" /><Stat label="Booked this week" value="82%" /><Stat label="Conflicts" value="0" /></div>
    <Panel title="Locations">
      {[["North Campus", "4 fields · lights", "green", "Open"], ["South Park", "3 fields · turf", "green", "Open"], ["Riverside", "2 fields · grass", "amber", "Field 2 resting"]].map(([n, d, t, s]) => (
        <Row key={n}><span className="font-semibold">{n}</span><span className="text-muted-foreground">{d}</span><Pill tone={t}>{s}</Pill></Row>
      ))}
    </Panel>
  </div>
);

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const grid = [["U10 B", "U12 G", "", "U10 B", "U14 B"], ["U12 G", "", "U14 B", "U12 G", ""], ["U16 G", "U16 G", "Camp", "", "U16 G"]];
const Calendar = () => (
  <Panel title="North Campus · Field 1" right={<Pill>Week of Sep 6</Pill>}>
    <div className="grid grid-cols-6 gap-1 text-xs">
      <span />{days.map((d) => <span key={d} className="text-center font-semibold">{d}</span>)}
      {grid.map((r, i) => (
        <React.Fragment key={i}>
          <span className="py-2 text-muted-foreground">{["5 PM", "6:30 PM", "8 PM"][i]}</span>
          {r.map((c, k) => <span key={k} className={`rounded-md py-2 text-center ${c ? "bg-primary/15 font-semibold text-primary" : "border border-dashed border-border text-muted-foreground"}`}>{c || "Free"}</span>)}
        </React.Fragment>
      ))}
    </div>
  </Panel>
);

const Request = () => (
  <Panel title="Field request — Coach Patel" right={<Pill tone="amber">Needs approval</Pill>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Team" value="U14 Boys Elite" /><Field label="When" value="Wed Sep 8 · 6:30 PM" />
      <Field label="Field" value="North Campus · Field 1" /><Field label="Reason" value="Extra practice before cup" />
    </div>
    <p className="mt-3 text-sm text-status-success">✓ No conflicts found</p>
    <div className="mt-3 flex gap-2"><Btn>Approve</Btn><Btn ghost>Suggest another time</Btn></div>
  </Panel>
);

const Closure = () => (
  <Panel title="Weather closure" right={<Pill tone="red">Closed today</Pill>}>
    <Row><span>Riverside · all fields</span><span className="text-muted-foreground">Lightning in area</span></Row>
    <Row><span>Practices affected</span><span className="font-semibold">6 teams · 94 families</span></Row>
    <div className="mt-3 flex gap-2"><Btn>Notify everyone</Btn><Btn ghost>Move to South Park</Btn></div>
  </Panel>
);

const Usage = () => (
  <Panel title="Field usage — September">
    {[["North Campus", 92], ["South Park", 74], ["Riverside", 48]].map(([n, v]) => (
      <div key={n} className="py-2 text-sm">
        <div className="mb-1 flex justify-between"><span>{n}</span><span className="font-semibold">{v}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${v}%` }} /></div>
      </div>
    ))}
    <p className="mt-2 text-xs text-muted-foreground">Rental income this month: $3,420 · Permit hours left: 36</p>
  </Panel>
);

export const FACILITY_STEPS = [
  { short: "Locations", title: "All your fields in one place", path: "/facilities", Screen: FieldMap, text: "Every location and field, with lights, surface and status. See at a glance what's open." },
  { short: "Calendar", title: "A weekly field calendar", path: "/facilities", Screen: Calendar, text: "See who's on each field and when. Open slots are easy to spot and fill." },
  { short: "Requests", title: "Coaches request, you approve", path: "/facilities", Screen: Request, text: "Coaches ask for extra time. The club checks for double bookings automatically before you approve.", points: ["No double bookings", "Coaches see the answer right away"] },
  { short: "Closures", title: "Close a field and tell everyone", path: "/facilities", Screen: Closure, text: "Rain or lightning? Close a field and every affected family gets a message in seconds." },
  { short: "Usage", title: "Know how your fields are used", path: "/facilities", Screen: Usage, text: "See which fields are busy, which sit empty, and track rental income and permit hours." },
];

/* ---------- Player development & support ---------- */
const Profile = () => (
  <Panel title="Ava Chen · U12 Girls Premier" right={<Pill tone="green">On track</Pill>}>
    <div className="grid grid-cols-3 gap-3"><Stat label="Attendance" value="96%" /><Stat label="Evaluations" value="4" /><Stat label="Goals set" value="3" /></div>
    <Row><span>Position</span><span>Center mid · Left foot</span></Row>
    <Row><span>Coach</span><span>Coach Rivera</span></Row>
  </Panel>
);

const Eval = () => (
  <Panel title="Fall evaluation — Ava Chen">
    {[["Technical", 4.5, "+0.5"], ["Tactical", 4.0, "+0.3"], ["Physical", 3.5, "="], ["Mindset", 4.8, "+0.4"]].map(([c, v, d]) => (
      <div key={c} className="py-2 text-sm">
        <div className="mb-1 flex justify-between"><span>{c}</span><span className="font-semibold">{v} <span className="text-status-success">{d}</span></span></div>
        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${v * 20}%` }} /></div>
      </div>
    ))}
  </Panel>
);

const Goals = () => (
  <Panel title="Ava's goals this season">
    {[["Use weaker foot in games", "green", "Done"], ["Lead warm-ups", "blue", "In progress"], ["Improve sprint time", "amber", "Started"]].map(([g, t, s]) => (
      <Row key={g}><span>{g}</span><Pill tone={t}>{s}</Pill></Row>
    ))}
    <div className="mt-3"><Field label="Coach comment" value="Great progress — keep it up at home with 10 min wall passes." /></div>
  </Panel>
);

const Support = () => (
  <Panel title="Player support" right={<Pill tone="amber">2 open</Pill>}>
    {[["Emma Davis", "Returning from ankle injury", "amber", "Return-to-play plan"], ["Zoe Martin", "Financial aid approved", "green", "50% dues"], ["Lily Park", "Wants to try goalkeeper", "blue", "Extra session"]].map(([n, d, t, s]) => (
      <Row key={n}><span className="flex items-center gap-2"><Avatar name={n} />{n}</span><span className="hidden text-muted-foreground sm:inline">{d}</span><Pill tone={t}>{s}</Pill></Row>
    ))}
    <p className="mt-3 text-xs text-muted-foreground">Sensitive notes are only visible to the director and the player's coach.</p>
  </Panel>
);

const Pathway = () => (
  <Panel title="Pathway — Ava Chen">
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {["U10 Select", "U11 Elite", "U12 Premier", "ID camp", "Next: U13 Academy"].map((s, i, a) => (
        <React.Fragment key={s}>
          <span className={`rounded-lg px-3 py-2 ${i === a.length - 1 ? "border border-dashed border-primary text-primary" : "bg-primary/10 font-semibold"}`}>{s}</span>
          {i < a.length - 1 && <span className="text-muted-foreground">→</span>}
        </React.Fragment>
      ))}
    </div>
    <div className="mt-4 flex gap-2"><Btn>Share report with family</Btn><Btn ghost>Download PDF</Btn></div>
  </Panel>
);

export const DEVELOPMENT_STEPS = [
  { short: "Profile", title: "A profile for every player", path: "/players", Screen: Profile, text: "Position, coach, attendance and evaluations follow the player from team to team, year after year." },
  { short: "Evaluations", title: "See growth, not just scores", path: "/players", Screen: Eval, text: "Coaches rate four simple areas each season. Arrows show how the player improved since last time." },
  { short: "Goals", title: "Set goals together", path: "/players", Screen: Goals, text: "Coaches and players agree on a few goals and track them through the season. Families can see them too." },
  { short: "Support", title: "Look after the whole player", path: "/players", Screen: Support, text: "Track injuries, financial aid and extra help in one private place so no player falls through the cracks.", points: ["Private to the right staff", "Reminders for follow-ups"] },
  { short: "Pathway", title: "Show families the road ahead", path: "/players", Screen: Pathway, text: "A simple timeline of teams and camps, plus a progress report you can share with one click." },
];

/* ---------- Beacon communication app (phone screens) ---------- */
const AppBar = ({ title, sub }) => (
  <div className="mb-3 flex items-center justify-between">
    <div><p className="text-[10px] font-bold uppercase tracking-widest text-primary">Beacon</p><p className="text-base font-bold leading-tight">{title}</p>{sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}</div>
    <Avatar name="Maya Lopez" />
  </div>
);
const Ch = ({ name, last, n, tone = "blue", muted }) => (
  <div className="flex items-center gap-2 border-t border-border py-2 first:border-t-0">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">#</span>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}{muted && " 🔕"}</p><p className="truncate text-[11px] text-muted-foreground">{last}</p></div>
    {n ? <Pill tone={tone}>{n}</Pill> : null}
  </div>
);
const Section = ({ label, children }) => (<div className="mb-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><div className="rounded-xl border border-border bg-card px-3">{children}</div></div>);

const Channels = () => (
  <div>
    <AppBar title="Your channels" sub="Demo FC · North Campus" />
    <Section label="Club">
      <Ch name="club-announcements" last="Picture day is Saturday 9 AM" n="1" />
      <Ch name="north-campus-fields" last="⚠ Field 2 closed tonight" n="!" tone="red" />
    </Section>
    <Section label="My teams">
      <Ch name="u12-girls-premier" last="Coach Rivera: Great win today!" n="4" />
      <Ch name="u12-premier-parents" last="Chen family: We can drive" n="2" />
    </Section>
    <Section label="Interests">
      <Ch name="volunteers" last="Snack sign-up is open" muted />
      <Ch name="tryouts-2027" last="Results Friday 6 PM" />
    </Section>
  </div>
);

const Channel = () => (
  <div>
    <AppBar title="# u12-girls-premier" sub="18 families · 3 coaches" />
    <div className="space-y-2 text-sm">
      <div className="rounded-xl border border-border bg-card p-2.5"><p className="text-[11px] font-bold">Coach Rivera <span className="font-normal text-muted-foreground">· 4:02 PM</span></p><p>Practice tomorrow at 5:30 on Field 1. Bring both jerseys.</p><p className="mt-1 text-[11px] text-muted-foreground">👍 14 · ✓ Seen by 17</p></div>
      <div className="rounded-xl border border-border bg-card p-2.5"><p className="text-[11px] font-bold">Lopez family <span className="font-normal text-muted-foreground">· 4:10 PM</span></p><p>Thanks coach! Maya will be 10 min late.</p></div>
      <div className="rounded-xl border border-primary/40 bg-primary/10 p-2.5"><p className="text-[11px] font-bold text-primary">📌 Pinned</p><p>Season schedule & tournament hotel info</p></div>
    </div>
    <div className="mt-3 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground">Post in #u12-girls-premier…</div>
  </div>
);

const Prefs = () => (
  <div>
    <AppBar title="Notifications" sub="Choose per channel" />
    {[["club-announcements", "All posts", "green"], ["u12-girls-premier", "All posts", "green"], ["u12-premier-parents", "Mentions only", "blue"], ["volunteers", "Muted", "amber"], ["tryouts-2027", "Urgent only", "red"]].map(([c, v, t]) => (
      <div key={c} className="flex items-center justify-between border-b border-border py-2.5 text-sm"><span className="truncate"># {c}</span><Pill tone={t}>{v}</Pill></div>
    ))}
    <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs">
      <p className="font-semibold">Deliver by</p>
      <div className="mt-2 flex flex-wrap gap-1.5"><Pill tone="green">Push ✓</Pill><Pill tone="green">Email ✓</Pill><Pill>Text</Pill></div>
      <p className="mt-2 text-muted-foreground">Quiet hours 9 PM – 7 AM · urgent alerts still come through</p>
    </div>
  </div>
);

const Urgency = () => (
  <div>
    <AppBar title="New post" sub="# north-campus-fields" />
    <div className="rounded-xl border border-border bg-card p-3 text-sm">Field 2 is closed tonight due to lightning. U10 & U12 practices cancelled.</div>
    <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">How urgent is this?</p>
    {[["ℹ️ Info", "Shows in the channel, no buzz", "border-border"], ["🔔 Important", "Push to everyone following", "border-border"], ["🚨 Urgent", "Breaks through mute & quiet hours, plus text", "border-status-danger bg-status-danger/10"]].map(([l, d, c]) => (
      <div key={l} className={`mb-2 rounded-xl border-2 p-2.5 ${c}`}><p className="text-sm font-bold">{l}</p><p className="text-[11px] text-muted-foreground">{d}</p></div>
    ))}
    <div className="mt-2 rounded-full bg-status-danger py-2 text-center text-sm font-bold text-primary-foreground">Send urgent alert</div>
  </div>
);

const Alert = () => (
  <div className="pt-6">
    <p className="text-center text-4xl font-light">5:42</p>
    <p className="text-center text-xs text-muted-foreground">Tuesday, September 7</p>
    <div className="mt-6 rounded-2xl border-2 border-status-danger bg-status-danger/10 p-3">
      <p className="text-[10px] font-bold text-status-danger">🚨 URGENT · BEACON · DEMO FC</p>
      <p className="mt-1 text-sm font-semibold">Field 2 closed — lightning</p>
      <p className="text-xs text-muted-foreground">U10 & U12 practices cancelled tonight.</p>
    </div>
    <div className="mt-2 rounded-2xl bg-card p-3 shadow-sm"><p className="text-[10px] font-bold text-primary">🔔 IMPORTANT · u12-girls-premier</p><p className="text-xs">Tournament schedule posted</p></div>
    <div className="mt-2 rounded-2xl bg-card p-3 opacity-70 shadow-sm"><p className="text-[10px] font-bold text-muted-foreground">ℹ️ volunteers · muted</p><p className="text-xs">Snack sign-up is open</p></div>
    <p className="mt-3 text-center text-[11px] text-muted-foreground">Urgent breaks through. Muted stays quiet.</p>
  </div>
);

const Confirm = () => (
  <div>
    <AppBar title="Urgent alert sent" sub="# north-campus-fields · 5:42 PM" />
    <div className="grid grid-cols-2 gap-2"><Stat label="Reached" value="94" /><Stat label="Confirmed" value="88" note="in 6 min" /></div>
    <div className="mt-3 rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-semibold">Families tap "Got it ✓"</p>
      {["Davis family", "Martin family"].map((n) => <div key={n} className="flex justify-between border-t border-border py-2 text-xs first:border-t-0"><span>{n}</span><Pill tone="amber">Not yet</Pill></div>)}
    </div>
    <div className="mt-3 rounded-full bg-primary py-2 text-center text-sm font-bold text-primary-foreground">Text the 6 who haven't seen it</div>
  </div>
);

const Branches = () => (
  <div>
    <AppBar title="Coach Rivera's channels" sub="Works across every branch" />
    <Section label="Auto-joined from your teams">
      <Ch name="u12-girls-premier" last="Added when roster was set" />
      <Ch name="u14-boys-elite" last="Added when roster was set" />
    </Section>
    <Section label="Branch">
      <Ch name="north-campus-coaches" last="Staff meeting moved to 7 PM" n="1" />
      <Ch name="south-park-coaches" last="Joined as guest coach" />
    </Section>
    <p className="text-[11px] text-muted-foreground">Families join their team channels automatically when they register — no invite codes, no group texts.</p>
  </div>
);

const B = (o) => ({ path: "/communicationportal", bare: true, ...o });
export const BEACON_STEPS = [
  B({ short: "Channels", title: "Every team and topic gets a channel", Screen: Channels, text: "Beacon is channel-based messaging for your whole club. Club news, each team, each field location, volunteers — every conversation lives in its own channel, so nothing gets buried.", points: ["Families only see channels they belong to", "One app for every branch"] }),
  B({ short: "Post", title: "Post right where it belongs", Screen: Channel, text: "Coaches and staff post in the right channel. Families can reply, react and see pinned info like schedules and hotel details." }),
  B({ short: "Your settings", title: "Each person picks how loud each channel is", Screen: Prefs, text: "Every parent, player and coach sets notifications per channel: all posts, mentions only, urgent only, or muted. Plus push, email or text and quiet hours.", points: ["No more notification overload", "Quiet hours for evenings"] }),
  B({ short: "Urgency", title: "Three levels of urgency", Screen: Urgency, text: "When posting, staff choose Info, Important or Urgent. Info just appears in the channel. Important sends a push. Urgent breaks through mute and quiet hours and sends a text." }),
  B({ short: "Lock screen", title: "The right buzz at the right time", Screen: Alert, text: "On a parent's phone, urgent alerts stand out in red, important posts arrive as normal notifications, and muted channels stay silent." }),
  B({ short: "Got it ✓", title: "Know everyone got the urgent news", Screen: Confirm, text: "For urgent alerts, families tap \"Got it\". Staff see who confirmed and can text the few who haven't — in one tap.", points: ["Peace of mind on game day", "Proof that families were told"] }),
  B({ short: "Auto-join", title: "Channels set themselves up", Screen: Branches, text: "When players are placed on a team, they and their parents join the right channels automatically. Coaches join theirs too, across every branch. No invite codes or group texts." }),
];
