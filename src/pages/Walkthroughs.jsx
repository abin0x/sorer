import React from "react";
import { Link } from "@/lib/router-compat";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Star,
  UserRound,
  Download,
  PlayCircle,
  MapPin,
  TrendingUp,
  Radio,
  DollarSign,
  Trophy,
  KanbanSquare,
  Megaphone,
  Timer,
  X,
} from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import usePageMeta from "@/lib/usePageMeta";
import toursVideo from "@/assets/videos/club-rudder-hype-90s.mp4.asset.json";

const GROUPS = [
  {
    title: "Running your club",
    tours: [
      {
        to: "/walkthrough/admin",
        Icon: LayoutDashboard,
        who: "Club admin",
        title: "How a director runs the season",
        text: "Seasons, registration, teams, schedules, payments and messages.",
        steps: 7,
      },
      {
        to: "/walkthrough/parent",
        Icon: Users,
        who: "Parents & families",
        title: "How families sign up and stay in the loop",
        text: "Register, sign waivers, pay and follow your player's team.",
        steps: 7,
      },
      {
        to: "/walkthrough/coach",
        Icon: Timer,
        who: "Coaches",
        title: "A coach's day on the phone",
        text: "Today's practice, attendance, player info and game RSVPs.",
        steps: 7,
      },
    ],
  },
  {
    title: "Tryouts",
    tours: [
      {
        to: "/walkthrough/tryouts-admin",
        Icon: ClipboardList,
        who: "Club admin",
        title: "Run tryouts start to finish",
        text: "Set up, check-in, build rosters and send offers.",
        steps: 7,
      },
      {
        to: "/walkthrough/tryouts-coach",
        Icon: Star,
        who: "Coach & evaluator",
        title: "Score players from the field",
        text: "Simple 1–5 scoring on a phone that works offline.",
        steps: 7,
      },
      {
        to: "/walkthrough/tryouts-player",
        Icon: UserRound,
        who: "Players & families",
        title: "From sign-up to joining the team",
        text: "Register, get your bib, accept an offer and join.",
        steps: 7,
      },
    ],
  },
  {
    title: "Add-on modules",
    tours: [
      {
        to: "/walkthrough/facilities",
        Icon: MapPin,
        who: "Facilities & fields",
        title: "Run every field at every location",
        text: "Field calendars, booking requests, closures and usage.",
        steps: 7,
      },
      {
        to: "/walkthrough/development",
        Icon: TrendingUp,
        who: "Player development & support",
        title: "Help every player grow",
        text: "Profiles, evaluations, goals, support and pathways.",
        steps: 7,
      },
      {
        to: "/walkthrough/beacon",
        Icon: Radio,
        who: "Beacon communication",
        title: "Keep everyone informed",
        text: "Channels, per-channel notifications and urgency levels.",
        steps: 7,
      },
      {
        to: "/walkthrough/payments",
        Icon: DollarSign,
        who: "Payments & store",
        title: "Sell, collect and approve",
        text: "Club store, paid events, promo codes and expenses synced to QuickBooks.",
        steps: 7,
      },
      {
        to: "/walkthrough/tournaments",
        Icon: Trophy,
        who: "Tournaments",
        title: "Host a tournament",
        text: "Registration, auto-built schedules, sideline scores and live standings.",
        steps: 7,
      },
      {
        to: "/walkthrough/projects",
        Icon: KanbanSquare,
        who: "Projects & reports",
        title: "Keep staff on the same page",
        text: "Task boards, programs, director dashboard and scheduled reports.",
        steps: 7,
      },
      {
        to: "/walkthrough/marketing",
        Icon: Megaphone,
        who: "Marketing & website",
        title: "Grow your club",
        text: "Club website, suggested campaigns and scheduled social posts.",
        steps: 7,
      },
    ],
  },
];

const CLIPS = import.meta.glob("@/assets/videos/clips/*.mp4.asset.json", { eager: true, import: "default" });
const clipFor = (to) => {
  const slug = to.split("/").pop();
  const hit = Object.entries(CLIPS).find(([p]) => p.endsWith(`/${slug}.mp4.asset.json`));
  return hit ? hit[1].url : null;
};

export default function Walkthroughs() {
  const [playing, setPlaying] = React.useState(null);
  usePageMeta({
    title: "Interactive Tours | Club Rudder",
    description:
      "Click-through tours of Club Rudder for club admins, coaches, parents and players — no sign-up needed.",
  });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Interactive tours</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">See Club Rudder in action</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Pick a tour and click through at your own pace. Each takes about two minutes, no sign-up needed.
        </p>
        <section className="mt-10 grid gap-6 rounded-3xl border border-border bg-card p-5 shadow-sm lg:grid-cols-[1.6fr_1fr] lg:p-8">
          <video
            src={`${toursVideo.url}#t=2`}
            controls
            preload="metadata"
            className="w-full rounded-2xl border border-border bg-muted"
          />
          <div className="flex flex-col justify-center">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <PlayCircle className="h-4 w-4" /> Club Rudder in 90 seconds
            </p>
            <h2 className="mt-2 text-2xl font-bold">The best of Club Rudder - Greatest hits</h2>
            <p className="mt-2 text-muted-foreground">
              Registration, tryouts, rosters, Beacon, payments and more in one quick video. Download it to share with
              your club.
            </p>
            <a
              href={toursVideo.url}
              download="club-rudder-hype-90s.mp4"
              className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Download className="h-5 w-5" /> Download video (39 MB)
            </a>
          </div>
        </section>
        {GROUPS.map((g) => (
          <section key={g.title} className="mt-12">
            <h2 className="text-2xl font-bold">{g.title}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.tours.map(({ to, Icon, who, title, text, steps }) => {
                const clip = clipFor(to);
                return (
                  <div
                    key={to}
                    className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-primary">{who}</p>
                    <h3 className="mt-1 text-xl font-bold">{title}</h3>
                    <p className="mt-2 flex-1 text-muted-foreground">{text}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        to={to}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                      >
                        Start slideshow →
                      </Link>
                      {clip && (
                        <button
                          type="button"
                          onClick={() => setPlaying({ url: clip, title })}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                        >
                          <PlayCircle className="h-4 w-4" /> Watch video
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>
      {playing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={playing.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
          onClick={() => setPlaying(null)}
        >
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between text-background">
              <p className="font-semibold">{playing.title}</p>
              <button
                type="button"
                onClick={() => setPlaying(null)}
                aria-label="Close video"
                className="rounded-full bg-background/20 p-2 hover:bg-background/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <video src={playing.url} controls autoPlay playsInline className="w-full rounded-2xl bg-foreground" />
          </div>
        </div>
      )}
      <PublicFooter />
    </div>
  );
}
