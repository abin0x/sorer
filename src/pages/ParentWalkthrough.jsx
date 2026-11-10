import React from "react";
import WalkthroughPlayer from "@/components/walkthrough/WalkthroughPlayer";
import { Panel, Pill, Row, Btn, Field, Avatar } from "@/components/walkthrough/MockUI";

const Find = () => (
  <Panel title="Demo FC — Fall 2027 programs">
    {[["Recreational (U6–U12)", "$185", "Open"], ["Select teams (U9–U14)", "$1,250", "Tryouts Aug 4"], ["Summer camp", "$240", "12 spots left"]].map(([n, p, s]) => (
      <Row key={n}><span className="font-medium">{n}</span><span>{p}</span><Pill tone="green">{s}</Pill></Row>
    ))}
    <div className="mt-3"><Btn>Register my child</Btn></div>
  </Panel>
);

const Form = () => (
  <Panel title="Player information" right={<Pill>Step 1 of 3</Pill>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Player name" value="Maya Lopez" />
      <Field label="Birth date" value="Mar 14, 2015" />
      <Field label="Program" value="U12 Girls — North Campus" />
      <Field label="Shirt size" value="Youth M" />
    </div>
    <p className="mt-3 text-sm text-muted-foreground">✓ Saved from last season — just check and continue.</p>
    <div className="mt-4"><Btn>Continue</Btn></div>
  </Panel>
);

const Waivers = () => (
  <Panel title="Waivers" right={<Pill>Step 2 of 3</Pill>}>
    {["Medical release", "Code of conduct", "Photo consent"].map((w) => (
      <Row key={w}><span>{w}</span><Pill tone="green">Signed ✓</Pill></Row>
    ))}
    <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-sm italic text-muted-foreground">Signature: Laura Lopez</div>
  </Panel>
);

const Pay = () => (
  <Panel title="Payment" right={<Pill>Step 3 of 3</Pill>}>
    <Row><span>U12 Girls registration</span><span>$185.00</span></Row>
    <Row><span>Sibling discount</span><span className="text-status-success">−$20.00</span></Row>
    <Row><span className="font-semibold">Total</span><span className="font-semibold">$165.00</span></Row>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border-2 border-primary p-3 text-sm"><b>Pay in full</b><br />$165 today</div>
      <div className="rounded-lg border border-border p-3 text-sm"><b>Payment plan</b><br />3 × $55</div>
    </div>
    <div className="mt-4"><Btn>Pay securely</Btn></div>
  </Panel>
);

const Home = () => (
  <div className="grid gap-3 md:grid-cols-2">
    <Panel title="Maya — U12 Girls Premier" right={<Pill tone="green">Registered</Pill>}>
      <Row><span>Coach</span><span>Coach Rivera</span></Row>
      <Row><span>Next practice</span><span>Tue 5:30 · Field 3</span></Row>
      <Row><span>Next game</span><span>Sat 10:00 vs. Rivers SC</span></Row>
    </Panel>
    <Panel title="Messages">
      <Row><span className="flex items-center gap-2"><Avatar name="Coach Rivera" />Picture day Saturday!</span><Pill>New</Pill></Row>
      <Row><span className="flex items-center gap-2"><Avatar name="Demo FC" />Fall schedule posted</span></Row>
    </Panel>
  </div>
);

const Offer = () => (
  <Panel title="Tryout results" right={<Pill tone="green">Offer received</Pill>}>
    <p className="text-sm">Congratulations! Maya has been offered a spot on <b>U12 Girls Premier</b> for Fall 2027.</p>
    <Row><span>Season dues</span><span>$1,250 or 5 × $250</span></Row>
    <Row><span>Reply by</span><span>Aug 12</span></Row>
    <div className="mt-3 flex gap-2"><Btn>Accept offer</Btn><Btn ghost>Decline</Btn></div>
  </Panel>
);

const Billing = () => (
  <Panel title="My invoices">
    {[["Fall registration", "Aug 1", "Paid", "green"], ["Payment plan 2 of 3", "Sep 1", "Paid", "green"], ["Payment plan 3 of 3", "Oct 1", "Due Oct 1", "amber"]].map(([n, d, s, t]) => (
      <Row key={n}><span>{n}</span><span className="text-muted-foreground">{d}</span><Pill tone={t}>{s}</Pill></Row>
    ))}
    <div className="mt-3"><Btn>Pay $55 now</Btn></div>
  </Panel>
);

const steps = [
  { short: "Find a program", title: "Find the right program", path: "/register", Screen: Find,
    text: "Families open the club's link and see every program, price and date in one place — on their phone or computer." },
  { short: "Sign up", title: "Fill in player details once", path: "/register", Screen: Form,
    text: "Returning families don't start over. Last season's details are already filled in." },
  { short: "Waivers", title: "Sign waivers in seconds", path: "/register", Screen: Waivers,
    text: "All forms are signed online with a finger or mouse. No printing, no lost paper." },
  { short: "Pay", title: "Pay in full or by installments", path: "/register", Screen: Pay,
    text: "Secure card payment with automatic sibling discounts and optional payment plans.",
    points: ["Receipts by email automatically", "Card saved for plan payments"] },
  { short: "Tryout offer", title: "Accept a team offer", path: "/tryoutstatus", Screen: Offer,
    text: "After tryouts, parents get an email and see the offer in their account. One tap to accept and finish registration." },
  { short: "My player", title: "Everything about your player in one place", path: "/parentportal", Screen: Home,
    text: "Team, coach, practice times, games and messages — all on one screen." },
  { short: "Invoices", title: "See what's paid and what's due", path: "/myinvoices", Screen: Billing,
    text: "Families check their balance and pay the next installment anytime, without calling the club." },
];

export default function ParentWalkthrough() {
  return (
    <WalkthroughPlayer
      meta={{ title: "Parent Walkthrough | Club Rudder", description: "See how families register, sign waivers, pay, accept tryout offers and follow their player's team in Club Rudder." }}
      eyebrow="Interactive tour · Parents & families"
      title="How families sign up and stay in the loop"
      intro="Click through seven short steps to see what a Demo FC parent sees. Sample data only."
      device="phone"
      steps={steps}
      other={{ label: "More tours: admins, tryouts and coaches", to: "/walkthrough", cta: "See all tours" }}
    />
  );
}
