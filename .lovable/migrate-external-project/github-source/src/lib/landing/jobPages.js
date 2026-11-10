/**
 * Content for the solutions pages.
 *
 * These pages mirror the platform's own feature set: the detail on each page
 * comes from src/components/features/moduleData.js (the same modules, feature
 * titles, descriptions and highlights shown on /features), so nothing here is
 * written copy that the app doesn't actually do. Each page declares which
 * modules it covers; every other module is listed by PlatformModules.
 *
 * Per page: slug (its URL), navLabel (nav, footer, cross-links), gridLine (one
 * line for the link grid), eyebrow, h1, metaTitle, metaDescription, intro,
 * modules [{ key, features? }] and faqs. Module prices quoted match /features.
 */

const TRYOUTS = {
  slug: "soccer-tryout-management-software",
  navLabel: "Tryout Management",
  gridLine: "Tryout planning, public signup, check-in, scoring, team placement and offers.",
  eyebrow: "Tryouts",
  h1: "Soccer tryout management software, from planning to offers",
  metaTitle: "Soccer Tryout Management Software | Club Rudder",
  metaDescription:
    "Youth soccer tryouts in one system: public signup pages, check-in, evaluation scoring, team placement and offers — part of the core platform.",
  intro: [
    "Club Rudder runs tryout week on one record per player: a public signup page for each session, check-in on the day, evaluations scored on the field, and offers that carry through to final registration.",
    "Tryout planning, registration and team placement are part of the core platform — included in every plan.",
  ],
  modules: [
    {
      key: "club_nexus",
      features: [
        "Public Registration & Tryouts",
        "Team Placement & Rosters",
        "Season Rollover & Tryout Planning",
      ],
    },
  ],
  faqs: [
    {
      q: "Is tryout management included or an add-on?",
      a: "Included. Tryout planning, public tryout registration and team placement are part of the core platform in every plan. Player Development & Support is a separate add-on if you also want evaluations, skill tests and video between tryouts.",
    },
    {
      q: "Do families need an account to register for a tryout?",
      a: "No login is needed for the signup itself. The public form creates the guardian and player records, and the guardian's email is what links the family together. Families can be invited into the family portal later for schedules, messages and dues.",
    },
    {
      q: "How do offers and acceptances work?",
      a: "The player is placed on a team, an offer is sent to the family, and acceptance is tracked against that player — alongside the waiver and the payment step — instead of in a spreadsheet.",
    },
    {
      q: "Can we run tryouts for several branches at once?",
      a: "Yes. Tryout plans, sessions and rosters sit per branch and age group, and club staff can see every branch in one view.",
    },
  ],
};

const REGISTRATION = {
  slug: "youth-club-registration-software",
  navLabel: "Club Registration",
  gridLine: "Registration, family records, rosters, seasons, messages and dues.",
  eyebrow: "Registration",
  h1: "Youth club registration software with family records built in",
  metaTitle: "Youth Club Registration Software | Club Rudder",
  metaDescription:
    "Youth club registration software for multi-branch clubs: age eligibility, waitlists, digital waivers, family profiles, team placement and dues in one system.",
  intro: [
    "Registration, family records, team placement and dues sit on one family record at Club Rudder, and that record follows the family across seasons and branches.",
    "Everything on this page is part of the core platform, included in every plan.",
  ],
  modules: [
    {
      key: "club_nexus",
      features: [
        "Public Registration & Tryouts",
        "Family Profiles",
        "Team Placement & Rosters",
        "Season Rollover & Tryout Planning",
      ],
    },
    {
      key: "communication",
      features: ["Targeted Messaging", "Connected Calendars", "Automated Alerts"],
    },
  ],
  faqs: [
    {
      q: "Can we charge fees in installments?",
      a: "Yes. A family can complete registration with a waiver and choose to pay in full or spread the fee over installments, with autopay available when they save a card.",
    },
    {
      q: "Where do registration payments land?",
      a: "Straight into your club's own Stripe account. Club Rudder charges no transaction fee on family payments, and Stripe's standard processing fees still apply.",
    },
    {
      q: "Can families register players at different branches?",
      a: "Yes. Programs, age groups and teams sit per branch while the family record stays single, so a household with players at two locations is one family in the system.",
    },
    {
      q: "How do waivers and family details get collected?",
      a: "Age eligibility rules, capacity limits and waitlists are set by the club, and the waiver is accepted as part of registration, so it arrives with the record rather than on paper.",
    },
  ],
};

const MULTIBRANCH = {
  slug: "multi-branch-club-management-software",
  navLabel: "Multi-Branch Clubs",
  gridLine: "Club-wide scheduling and messaging, with per-branch teams, staff, facilities and books.",
  eyebrow: "Multi-branch",
  h1: "Multi-branch club management software: one club, every branch",
  metaTitle: "Multi-Branch Club Management Software | Club Rudder",
  metaDescription:
    "Manage every branch in one system: club-wide schedules and messaging with per-branch teams, staff, facilities and books, plus roll-up reporting.",
  intro: [
    "Records carry their branch and every role works from the slice it needs, with the club office holding the roll-up across all of them.",
    "Below is the club-wide side of the platform; the rest of Club Rudder runs on the same families, teams and ledgers.",
  ],
  modules: [
    { key: "facilities" },
    { key: "communication" },
  ],
  faqs: [
    {
      q: "Do branch staff and the club office see the same thing?",
      a: "Every record carries its branch, and role dashboards are branch-aware: branch directors and admins work from their branch's teams, facilities and schedule, while the club office sees the roll-up. Who can do what is set by role.",
    },
    {
      q: "Does each branch need its own registration pages?",
      a: "No. Registration and the public pages are built once for the club, and programs, age groups and teams are filtered by branch, so families pick their location as part of registering.",
    },
    {
      q: "Can two branches share one venue?",
      a: "Yes. Fields sit under a facility and bookings are club-wide, so a shared venue shows one grid for both branches and conflicts are caught before a slot is confirmed.",
    },
    {
      q: "How is pricing structured for more than one branch?",
      a: "Pricing is per player, with a one-time setup fee per branch, and founding clubs have the setup fee waived. Add-on modules are bought once for the club, not per branch.",
    },
  ],
};

const PAYMENTS = {
  slug: "club-payments-stripe-quickbooks",
  navLabel: "Payments & QuickBooks",
  gridLine: "Storefront, dues, expenses and two-way QuickBooks sync in one ledger.",
  eyebrow: "Money",
  h1: "Club payments straight into your own Stripe, with QuickBooks in sync",
  metaTitle: "Club Payments with Stripe + QuickBooks Sync | Club Rudder",
  metaDescription:
    "Family payments land in your club's own Stripe account, Club Rudder takes no cut, and QuickBooks stays in sync two ways — no CSV exports.",
  intro: [
    "Dues and registration payments settle into the club's own Stripe account, and the bookkeeping connects to QuickBooks Online.",
    "Club Rudder takes no transaction fee on family payments; Stripe's standard processing fees still apply and are billed by Stripe.",
  ],
  modules: [
    { key: "payments" },
    { key: "club_nexus", features: ["QuickBooks Two-Way Sync"] },
  ],
  faqs: [
    {
      q: "Does Club Rudder take a cut of family payments?",
      a: "No. Dues and registration payments settle into your club's own Stripe account, and Club Rudder charges no transaction fee. Stripe's standard processing fees still apply.",
    },
    {
      q: "Do we still export CSVs into QuickBooks?",
      a: "No. The QuickBooks Online sync is two-way and built in: payments and expenses post across automatically with categories and classes applied, and there are no CSV exports to build.",
    },
    {
      q: "Is the online store part of this?",
      a: "Club dues payments are included in every plan. Selling spiritwear, event tickets, memberships and marketplace items is part of the Storefront & Bookkeeping add-on at $399/yr — the same ledger the rest of this page describes.",
    },
    {
      q: "How do staff expenses and invoices get into the books?",
      a: "Coaches and staff submit expense reports with receipts, a bookkeeper reviews and approves them, and invoices for staff, vendors and outside facility rentals come from the same ledger that syncs to QuickBooks.",
    },
  ],
};

const FIELDS = {
  slug: "field-scheduling-software",
  navLabel: "Field Scheduling",
  gridLine: "Every field in one grid, with bookings, conflicts, recurring season slots and utilization.",
  eyebrow: "Facilities",
  h1: "Field scheduling software for clubs that share venues across branches",
  metaTitle: "Field Scheduling Software for Soccer Clubs | Club Rudder",
  metaDescription:
    "Schedule every field across every branch: drag-and-drop bookings, conflict detection, recurring season slots, availability and utilization reporting.",
  intro: [
    "Every field across every branch sits in one grid: bookings, conflicts, recurring season slots and utilization.",
    "Games and tournaments book from the same fields and the same conflict checks.",
  ],
  modules: [
    { key: "facilities" },
    { key: "tournaments", features: ["Tournament Scheduling"] },
  ],
  faqs: [
    {
      q: "Can two branches share the same venue?",
      a: "Yes. Fields belong to a facility and bookings are club-wide, so a shared venue shows one grid for both branches and collisions are caught before a slot is confirmed.",
    },
    {
      q: "Can we import the schedule we already keep in a spreadsheet?",
      a: "Yes. An existing weekly training grid can be imported from CSV and mapped onto your fields, teams and time slots, then published to the schedule.",
    },
    {
      q: "Does it handle games and tournaments, or just training?",
      a: "All of it. Training sessions, games and tournament matches book the same fields, with field assignment and conflict-free time slots as part of the schedule.",
    },
    {
      q: "Is field scheduling an add-on?",
      a: "Facilities & Field Management is an add-on module at $199/yr and covers every branch and every field in the club. Club dues and registration stay in the core platform.",
    },
  ],
};

export const JOB_PAGES = {
  [TRYOUTS.slug]: TRYOUTS,
  [REGISTRATION.slug]: REGISTRATION,
  [MULTIBRANCH.slug]: MULTIBRANCH,
  [PAYMENTS.slug]: PAYMENTS,
  [FIELDS.slug]: FIELDS,
};

/** Display order for the link grid, footer column and cross-links. */
export const JOB_PAGE_ORDER = [TRYOUTS.slug, REGISTRATION.slug, MULTIBRANCH.slug, PAYMENTS.slug, FIELDS.slug];

/**
 * Where each module of the "rest of the platform" list points: to its own
 * solutions page where one exists, otherwise to its anchor on /features
 * (CoreSection = #core, add-on cards keep their own ids).
 */
export const MODULE_LINKS = {
  club_nexus: "/youth-club-registration-software",
  communication: "/features#core",
  payments: "/club-payments-stripe-quickbooks",
  kanban: "/features#ops",
  development: "/features#development",
  facilities: "/field-scheduling-software",
  tournaments: "/features#events",
  branding: "/features#growth",
};