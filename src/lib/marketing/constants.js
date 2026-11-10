import { addDays, format, parseISO, setHours } from "date-fns";

export const PLATFORMS = {
  instagram: { label: "Instagram", limit: 2200, dot: "bg-pink-500", chip: "bg-pink-50 text-pink-700 border-pink-200" },
  facebook: { label: "Facebook", limit: 63206, dot: "bg-blue-600", chip: "bg-blue-50 text-blue-700 border-blue-200" },
  x: { label: "X", limit: 280, dot: "bg-slate-800", chip: "bg-slate-100 text-slate-800 border-slate-300" },
  linkedin: { label: "LinkedIn", limit: 3000, dot: "bg-sky-600", chip: "bg-sky-50 text-sky-700 border-sky-200" },
  tiktok: { label: "TikTok", limit: 2200, dot: "bg-teal-500", chip: "bg-teal-50 text-teal-700 border-teal-200" },
  youtube: { label: "YouTube", limit: 5000, dot: "bg-red-600", chip: "bg-red-50 text-red-700 border-red-200" },
  club_feed: { label: "Club feed", limit: 1000, dot: "bg-primary", chip: "bg-primary/10 text-primary border-primary/20" },
};
export const COMPOSER_PLATFORMS = ["instagram", "facebook", "x", "linkedin", "tiktok"];
export const CAMPAIGN_PLATFORMS = ["instagram", "facebook", "x", "club_feed"];

export const TONES = [
  { value: "hype", label: "Hype" },
  { value: "informative", label: "Informative" },
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
];

export const EVENT_TYPES = {
  tryout: "Tryout",
  tournament: "Tournament",
  match: "Match",
  registration: "Registration",
  fundraiser: "Fundraiser",
  custom: "Other",
};

export const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  in_review: "bg-amber-100 text-amber-700",
  approved: "bg-violet-100 text-violet-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

export const STATUS_FLOW = ["draft", "in_review", "approved", "scheduled", "published", "failed"];

export const STATUS_LABELS = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
};

const C = (offset, role, label) => ({ offset, role, label });
export const CADENCES = {
  tryout: [C(-21, "teaser", "Announce"), C(-14, "reminder", "Reminder"), C(-7, "reminder", "Spots filling"), C(-2, "reminder", "Last call"), C(0, "day_of", "Day-of"), C(1, "thank_you", "Thank you"), C(3, "recap", "Results")],
  tournament: [C(-30, "teaser", "Announce"), C(-14, "reminder", "Hype"), C(-7, "reminder", "Roster reveal"), C(-1, "reminder", "Travel & logistics"), C(0, "live", "Live updates"), C(1, "recap", "Recap"), C(3, "recap", "Photo dump")],
  registration: [C(-30, "teaser", "Registration open"), C(-14, "reminder", "Reminder"), C(-7, "reminder", "Mid-point stats"), C(-2, "reminder", "Urgency"), C(0, "day_of", "Last call"), C(1, "thank_you", "Registration closed")],
  match: [C(-1, "teaser", "Preview"), C(0, "live", "Kickoff & live"), C(1, "recap", "Recap + MOTM")],
  fundraiser: [C(-14, "teaser", "Announce"), C(-7, "reminder", "Progress"), C(-3, "reminder", "Final push"), C(1, "thank_you", "Thank you")],
  custom: [C(-14, "teaser", "Announce"), C(-7, "reminder", "Reminder"), C(-1, "reminder", "Tomorrow"), C(0, "day_of", "Day-of"), C(1, "thank_you", "Thank you")],
};

export const ROLE_LEADS = {
  teaser: "Save the date!",
  reminder: "Friendly reminder:",
  day_of: "It's happening today!",
  live: "Live now:",
  recap: "Recap:",
  thank_you: "Thank you!",
};

export function buildCadence(type, preset = "standard") {
  const steps = CADENCES[type] || CADENCES.custom;
  if (preset === "light") {
    const closest = steps.reduce((a, b) => (Math.abs(b.offset) < Math.abs(a.offset) ? b : a));
    const picked = [steps[0], closest, steps[steps.length - 1]];
    return picked.filter((s, i) => picked.findIndex((p) => p.offset === s.offset) === i).sort((a, b) => a.offset - b.offset);
  }
  if (preset === "aggressive") {
    const extra = [];
    for (let i = 0; i < steps.length - 1; i++) {
      const [a, b] = [steps[i], steps[i + 1]];
      if (a.offset < 0 && b.offset <= 0 && b.offset - a.offset >= 4) extra.push(C(Math.round((a.offset + b.offset) / 2), "reminder", "Extra reminder"));
    }
    return [...steps, ...extra].sort((a, b) => a.offset - b.offset);
  }
  return steps;
}

export const stepDate = (eventDate, offset) => setHours(addDays(parseISO(eventDate), offset), 10);

export const SYSTEM_TEMPLATES = [
  { id: "sys-tryout", name: "Tryout announcement", event_type: "tryout", platform: "any", tone: "hype", body_template: "🚨 TRYOUTS! {club_name} is looking for {age_group} players. {date} at {location}. Register: {link}", hashtags: ["tryouts", "youthsoccer", "soccertryouts"], image_prompt_template: "Energetic youth soccer tryout, players on a green field at golden hour" },
  { id: "sys-tournament", name: "Tournament hype", event_type: "tournament", platform: "any", tone: "hype", body_template: "🏆 {event_name} is coming! {date} at {location}. Teams, families and fans: get ready. Details: {link}", hashtags: ["tournament", "soccer", "gameday"], image_prompt_template: "Soccer tournament with multiple fields, banners and cheering crowd" },
  { id: "sys-registration", name: "Registration reminder", event_type: "registration", platform: "any", tone: "friendly", body_template: "⏳ Registration for {event_name} closes soon. Reserve your spot today: {link}", hashtags: ["registration", "youthsports"], image_prompt_template: "Happy kids in soccer jerseys with a registration sign" },
  { id: "sys-match", name: "Match preview", event_type: "match", platform: "any", tone: "hype", body_template: "⚽ Match day! {event_name} on {date} at {time}, {location}. Come cheer us on!", hashtags: ["matchday", "soccer"], image_prompt_template: "Youth soccer match kickoff under stadium lights" },
  { id: "sys-match-recap", name: "Match recap", event_type: "match", role: "recap", platform: "any", tone: "friendly", body_template: "Full time! Great effort from the team in {event_name}. Thank you to every parent and fan who came out. 👏", hashtags: ["fulltime", "soccer"], image_prompt_template: "Youth soccer team celebrating after a match" },
  { id: "sys-fundraiser", name: "Fundraiser", event_type: "fundraiser", platform: "any", tone: "friendly", body_template: "💚 Help us support our players! {event_name} is on {date} at {location}. Every bit helps: {link}", hashtags: ["fundraiser", "community"], image_prompt_template: "Community fundraiser event for a youth soccer club" },
  { id: "sys-custom", name: "General event", event_type: "custom", platform: "any", tone: "friendly", body_template: "📣 {event_name}: {date} at {location}. Learn more: {link}", hashtags: ["soccer", "community"], image_prompt_template: "Youth soccer club community event" },
];

export function getBestTemplate(templates, { eventType, platform, tone, role }) {
  const scored = templates
    .filter((t) => t.event_type === eventType || t.event_type === "custom")
    .map((t) => ({
      t,
      score: (t.event_type === eventType ? 4 : 0) + (role && t.role === role ? 2 : 0) + (t.role && t.role !== role ? -3 : 0) + (t.platform === platform ? 1 : 0) + (t.tone === tone ? 1 : 0) + (t.is_system ? 0 : 0.5),
    }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.t || SYSTEM_TEMPLATES[SYSTEM_TEMPLATES.length - 1];
}

export function fillTemplate(str = "", vars = {}) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "").replace(/[ \t]{2,}/g, " ").trim();
}

export function buildVars(event, clubName) {
  const date = event?.date ? format(parseISO(event.date), "EEE, MMM d") : "";
  return { club_name: clubName || "", event_name: event?.title || "", team_name: event?.team_name || clubName || "", age_group: event?.age_group || "", date, time: event?.time || "", location: event?.location || "", link: event?.url || "" };
}

export function addUtm(url, platform, campaign) {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", platform);
    u.searchParams.set("utm_medium", "social");
    if (campaign) u.searchParams.set("utm_campaign", campaign);
    return u.toString();
  } catch {
    return url;
  }
}