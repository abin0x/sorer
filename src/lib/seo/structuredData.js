/**
 * JSON-LD builders for the public marketing pages.
 *
 * Plain data builders (no JSX) so the very same objects are rendered by the
 * pages and validated by the schema check — one source of truth per schema.
 *
 * Rule: only facts that are visible on the page that emits them.
 */
import { DEFAULT_PRICING_CONFIG } from "../pricingCalculator.js";

export const SITE_URL = "https://clubrudder.com";
export const SITE_NAME = "Club Rudder";
export const LOGO_URL = "https://media.base44.com/images/public/690d4c6dccfb0f4e79c33a38/161f01a1f_logo.png";

const PUBLISHER = {
  "@type": "Organization",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: LOGO_URL,
};

const APP_DESCRIPTION =
  "Registration, tryouts, payments and scheduling for multi-branch soccer clubs. Families pay straight into the club's own processor (Stripe, Square, PayPal, Echelon or another gateway) and Club Rudder takes no cut of family payments.";

/** Organization — emitted once from index.html, so it is on every page. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
  };
}

/**
 * SoftwareApplication for the homepage. The homepage shows the 30-day free
 * trial but not the tier rates, so the single offer here is the trial; the
 * three tier offers live on /pricing, where the rates are on the page.
 */
export function homepageSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/`,
    description: APP_DESCRIPTION,
    publisher: PUBLISHER,
    offers: {
      "@type": "Offer",
      name: "30-day free trial",
      description: "30-day free trial, no credit card required.",
      price: 0,
      priceCurrency: "USD",
      url: `${SITE_URL}/create-club`,
    },
  };
}

/** SoftwareApplication for /pricing — one offer per tier shown on the page. */
export function pricingSoftwareApplicationSchema(config = DEFAULT_PRICING_CONFIG) {
  const tiers = config?.tiers?.length ? config.tiers : DEFAULT_PRICING_CONFIG.tiers;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/pricing`,
    description: APP_DESCRIPTION,
    publisher: PUBLISHER,
    offers: [
      ...tiers.map((tier) => ({
        "@type": "Offer",
        name: `${tier.name} tier`,
        description: `${tier.best_for}. ${config?.base_license_fee ?? 1995} USD base license per year including the first ${config?.base_players_included ?? 250} players, then ${tier.per_player_cost} USD per additional player per year. One-time onboarding fee of ${config?.setup_fee_first_branch ?? 599} USD plus ${config?.setup_fee_additional_branch ?? 199} USD per additional branch.`,
        price: tier.per_player_cost,
        priceCurrency: "USD",
        url: `${SITE_URL}/pricing`,
      })),
      {
        "@type": "Offer",
        name: "30-day free trial",
        description: "30-day free trial, no credit card required.",
        price: 0,
        priceCurrency: "USD",
        url: `${SITE_URL}/create-club`,
      },
    ],
  };
}

/**
 * Article for a /resources post. Only emitted for published articles — a draft
 * is noindex and not a published work, so it carries no Article schema.
 */
export function articleSchema({ path, title, description, author, datePublished, dateModified }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: { "@type": "Organization", name: author },
    publisher: PUBLISHER,
    datePublished,
    dateModified: dateModified || datePublished,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${path}` },
  };
}

/** FAQPage built from the questions and answers already shown on the page. */
export function faqPageSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}