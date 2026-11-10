/**
 * Content for the public comparison pages (/compare/*).
 *
 * Honesty rules for these pages:
 *  - Every Club Rudder cell is a fact we can stand behind today.
 *  - Nothing is claimed about the other platform's product. Each competitor
 *    cell is an explicit [VERIFY: …] placeholder for the builder to fact-check,
 *    and the pages stay unlisted (nav, footer, sitemap) and noindex until then.
 */

/** Club Rudder side of the comparison, shared by all three pages. */
const ROWS = [
  {
    label: "Where family payments land",
    club: "Directly in your club's own Stripe account",
    verifyLabel: "payment model",
  },
  {
    label: "Club Rudder transaction fees",
    club: "0% — Club Rudder takes no cut. Stripe's standard processing fees still apply.",
    verifyLabel: "fee structure",
  },
  {
    label: "QuickBooks",
    club: "Two-way sync built in, no CSV exports",
    verifyLabel: "accounting integrations",
  },
  {
    label: "Migrating your data in",
    club: "Free, human-verified, you confirm before import",
    verifyLabel: "data export, migration support and any fees",
  },
  {
    label: "Multi-branch support",
    club: "Branch-scoped teams, staff and reporting, with a club-wide roll-up",
    verifyLabel: "multi-branch support",
  },
  {
    label: "Built for",
    club: "Multi-branch soccer clubs",
    verifyLabel: "which organisations it is designed for",
  },
];

export const COMPARE_TABLE_ROWS = ROWS;

/** The four deep-dive sections every comparison page carries. */
export const COMPARE_SECTIONS = [
  {
    key: "payments",
    heading: "Payments",
    verifyLabel: "payment model and fee structure",
    paragraphs: [
      "Cards and ACH settle directly into your club's own Stripe account, so the money is yours from the moment it lands — no platform wallet, no payout schedule set by someone else.",
      "Club Rudder takes no cut of registration or dues payments: there are no Club Rudder transaction fees. Stripe's standard processing fees still apply, billed by Stripe, exactly as they would on any platform.",
    ],
  },
  {
    key: "accounting",
    heading: "Accounting",
    verifyLabel: "accounting integrations",
    paragraphs: [
      "Two-way QuickBooks sync is built in. Registrations, dues, facility invoices and expenses post to your books, and changes made in QuickBooks come back — so month-end is a reconciliation, not a re-entry project.",
      "There are no CSV exports to build and no spreadsheets to stitch together, and each team or branch can map to its own class in QuickBooks.",
    ],
  },
  {
    key: "migration",
    heading: "Migration",
    verifyLabel: "data export, migration support and any migration fees",
    paragraphs: [
      "Migration is free and human-verified. You click migrate and upload an export from your current platform; our system maps and cleans the records; a specialist reviews every one; you approve the report before anything goes live.",
      "Players, guardians, teams, coaches, schedules and payment history all come across. Data imports in a day, and most founding clubs are fully live in about 3 days.",
    ],
  },
  {
    key: "multi-branch",
    heading: "Multi-branch support",
    verifyLabel: "multi-branch and multi-location support",
    paragraphs: [
      "Club Rudder was built for clubs with more than one location. Teams, staff, schedules, payments and reporting are scoped by branch, and the club office gets a roll-up across all of them.",
      "Directors see every branch; branch staff see only theirs. Add a branch and it inherits the same structure, instead of becoming a second spreadsheet.",
    ],
  },
];

/** Questions answerable with Club Rudder facts only — no competitor claims. */
export const COMPARE_FAQS = [
  {
    q: "Does Club Rudder take a cut of family payments?",
    a: "No. Families pay into your club's own Stripe account and Club Rudder charges no transaction fee on those payments. Stripe's standard processing fees still apply, billed by Stripe.",
  },
  {
    q: "How long does migration take?",
    a: "Data imports in a day once your export is in, and most founding clubs are fully live in about 3 days. Migration is free, human-verified, and you approve the report before anything goes live.",
  },
  {
    q: "Do we still need to export CSVs for QuickBooks?",
    a: "No. QuickBooks sync is two-way and built in, so registrations, dues, facility invoices and expenses post to your books and come back without CSV exports.",
  },
  {
    q: "How does multi-branch access work?",
    a: "Teams, staff, schedules, payments and reporting are scoped by branch. Directors see every branch, branch staff see only theirs, and the club office gets a roll-up across all of them.",
  },
];

export const COMPARE_PAGES = {
  teamsnap: {
    key: "teamsnap",
    competitor: "TeamSnap",
    h1: "A TeamSnap alternative for multi-branch soccer clubs",
    metaTitle: "TeamSnap Alternative for Multi-Branch Clubs | Club Rudder",
    metaDescription:
      "A TeamSnap alternative for multi-branch soccer clubs: payments into your own Stripe account, no Club Rudder fees, QuickBooks sync, free migration.",
    intro: [
      "If your club runs more than one location, the question is rarely whether the app has a roster feature. It is how registrations, dues, schedules and staff permissions behave when every branch has its own teams and its own director.",
      "This page compares Club Rudder with TeamSnap on the four things that usually decide it: where family payments land, how month-end accounting works, how your data gets across, and how multi-branch access is handled. The Club Rudder column is what we do today. Anything about TeamSnap we have not fact-checked is marked [VERIFY] rather than guessed.",
    ],
  },
  sportsengine: {
    key: "sportsengine",
    competitor: "SportsEngine",
    h1: "A SportsEngine alternative for multi-branch soccer clubs",
    metaTitle: "SportsEngine Alternative for Multi-Branch Clubs | Club Rudder",
    metaDescription:
      "A SportsEngine alternative for multi-branch clubs: payments into your own Stripe account, no Club Rudder fees, QuickBooks sync, free migration.",
    intro: [
      "Clubs move off all-in-one league platforms for a simple reason: they want their own operations in one place, branch by branch, without a league or a platform sitting in the middle of their money.",
      "Below is how Club Rudder handles payments, accounting, migration and multi-branch access, next to a SportsEngine column we will fill in only with facts we have verified. Every entry there is a marked [VERIFY] placeholder on purpose.",
    ],
  },
  sprocket: {
    key: "sprocket",
    competitor: "Sprocket Sports",
    h1: "A Sprocket Sports alternative for multi-branch soccer clubs",
    metaTitle: "Sprocket Sports Alternative for Soccer Clubs | Club Rudder",
    metaDescription:
      "A Sprocket Sports alternative for soccer clubs: payments into your own Stripe account, no Club Rudder fees, QuickBooks sync, free migration.",
    intro: [
      "Moving a club off a single registration tool usually comes down to money flow and month-end work: who holds family payments, and how much of it has to be re-entered into accounting afterwards.",
      "This page puts Club Rudder next to Sprocket Sports on payments, accounting, migration and multi-branch support. We only state Club Rudder facts here; every Sprocket Sports entry is a marked [VERIFY] placeholder until it has been checked.",
    ],
  },
};