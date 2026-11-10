/**
 * Content for the public /resources section.
 *
 * One object per article. `status: "draft"` keeps an article off the public
 * list, out of the sitemap and noindex; flip it to "published" to take it live.
 *
 * Per article: slug (its URL), title (the H1), meta_title (the <title>, keep it
 * under ~60 characters), description (meta description), author, published_at,
 * category, reading_minutes, then the body as structured sections.
 */

export function formatArticleDate(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

const TRYOUTS_ARTICLE = {
  slug: "how-to-run-youth-soccer-tryouts",
  status: "draft",
  title: "How to run youth soccer tryouts: a step-by-step guide for club directors",
  meta_title: "How to Run Youth Soccer Tryouts: A Guide for Club Directors",
  description:
    "A club director's step-by-step guide to running youth soccer tryouts: setting criteria, scheduling, check-in, evaluations, selection meetings and offers.",
  author: "Club Rudder Team",
  published_at: "2026-10-26",
  category: "Club operations",
  reading_minutes: 8,
  intro: [
    "Tryouts are the highest-pressure week of your club's year. Every family is watching how you run them, every coach wants a say, and the decisions made in a two-hour window shape your teams for a whole season.",
    "This is the process well-run clubs follow: decide the criteria first, keep scoring in one place, and tell every family what happens next. None of it needs new software — though the last two steps are far easier when registration, check-in and scoring already live in one system.",
  ],
  sections: [
    {
      type: "steps",
      heading: "The nine steps",
      steps: [
        {
          title: "Set the criteria before you book anything",
          body: "Age-group tryouts go wrong when the criteria are invented on the day. Before you announce dates, agree with your coaches what each age group is being evaluated on — typically technical quality, game understanding, athleticism, attitude and coachability — and write down what a strong, average and weak score looks like for each. Scores from different evaluators then mean the same thing, which is what makes the selection meeting short instead of political.",
        },
        {
          title: "Fix the dates, venues and a rain plan",
          body: "Publish tryout dates four to six weeks out, avoiding school events and the end of other sports seasons. Book your fields and a wet-weather fallback at the same time, and decide up front whether each age group gets one session or two. Two sessions give evaluators a second look and take the pressure off a single night, which matters most for the youngest age groups.",
        },
        {
          title: "Open registration early, with one form per player",
          body: "Collect everything you need at registration: player name and birth year, current team or club, guardian contacts, emergency information, and photo or video consent. One form per player, one clear deadline. The list you get is the list you check in against, so the fewer fields you improvise later, the faster tryout night runs.",
        },
        {
          title: "Build check-in before the first family arrives",
          body: "Check-in is where tryout nights stall. Decide the process in advance and make it visible:",
          bullets: [
            "Assign each player a session time and group when they register, not at the door.",
            "Check players in on a tablet or a printed list, so you know who actually attended.",
            "Give every player a numbered bib. That number is what evaluators score.",
            "Collect waivers and medical notes electronically at registration, not on a clipboard in the rain.",
            "Have a runner for late arrivals and a table families can find without asking.",
          ],
        },
        {
          title: "Structure the session so evaluators can see everyone",
          body: "Rotate players through short stations and small-sided games, and keep the same evaluator with the same group all night — swapping evaluators mid-session destroys any comparability between scores. Cap the number of players per field so nobody spends twenty minutes waiting for a turn; two smaller games show you far more than one crowded scrimmage.",
        },
        {
          title: "Score in one place, in real time",
          body: "Give each age group one scoring sheet with the agreed criteria and a simple scale, and require the scores before evaluators leave the field. Memories blur within the hour: the player who impressed at 6:15 is easily forgotten by 8:00. If the sheet is shared, nobody has to transcribe handwriting afterwards.",
        },
        {
          title: "Hold the selection meeting with the scores in front of you",
          body: "Work age group by age group, not the whole club at once. Place players by position need as well as score, because a balanced roster is not the same thing as the top twenty scores. Where two players are genuinely level, use a second opinion or a clip from the session rather than seniority. Record every decision, including the close misses — that list is how you fill gaps mid-season.",
        },
        {
          title: "Send offers with deadlines, and track every response",
          body: "Send offers the same week, with a clear response deadline and what accepting means: registration, deposit and the dues schedule. Track who has accepted, who has declined and who has not replied, then chase the non-replies directly. Families miss offers, and a silent offer is usually a lost player.",
        },
        {
          title: "Tell every family the outcome — including the players you cannot place",
          body: "This is the step clubs skip, and it costs goodwill they never win back. Send a decision to every family who attended, offer the alternative path where one exists, and keep it short and respectful. Families talk to each other, and the club that answers everyone is the club they recommend.",
        },
      ],
    },
    {
      type: "bullets",
      heading: "Mistakes that cost clubs the most",
      bullets: [
        "Announcing tryout dates before the criteria and evaluators are agreed.",
        "Scoring on paper and transcribing later — half the detail is gone by then.",
        "Letting coaches evaluate only their own players, with no second evaluator in the room.",
        "Running one crowded session instead of two smaller ones.",
        "Leaving offers open with no deadline, so the roster stays undecided for weeks.",
        "Only contacting the families whose children were placed.",
      ],
    },
    {
      type: "bullets",
      heading: "The week-before checklist",
      bullets: [
        "Registration list exported, grouped by age group and session.",
        "Evaluator packs: criteria, scale and one scoring sheet per group.",
        "Numbered bibs sorted and counted.",
        "Check-in station ready with names, bib numbers and a late-arrival process.",
        "Field plan with rotations, times and who is on which field.",
        "Medical and consent information for every registered player.",
        "The result letter drafted, ready to send the day after the last session.",
      ],
    },
    {
      type: "paragraphs",
      heading: "If you run tryouts in Club Rudder",
      paragraphs: [
        "Tryout registration, check-in, evaluator scoring, roster building and offers are one workflow: families register through a public tryout link, staff check players in on the day, evaluators score against the criteria you set, and the results land in a roster board you build teams from — then you send offers and dues links from the same place.",
        "If you would rather see it than read about it, take the tour or book a demo and we'll walk through a tryout week end to end.",
      ],
    },
  ],
};

export const ARTICLES = [TRYOUTS_ARTICLE];

/** Articles safe to show publicly — drafts stay out of the list and sitemap. */
export function publishedArticles() {
  return ARTICLES.filter((a) => a.status === "published");
}

export function findArticle(slug) {
  return ARTICLES.find((a) => a.slug === slug) || null;
}