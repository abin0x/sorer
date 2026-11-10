import { useEffect } from "react";

const DEFAULT_IMAGE = "https://media.base44.com/images/public/690d4c6dccfb0f4e79c33a38/161f01a1f_logo.png";
const SITE_NAME = "Club Rudder";
const SITE_URL = "https://clubrudder.com";

function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

/**
 * Unique title, description and social card for a public page.
 *
 * Note: the crawler-facing title/description for each page is configured in the
 * app dashboard (SEO & GEO → Meta tags), and the platform adds its own
 * self-referencing canonical tag — so no canonical is written here.
 */
export default function usePageMeta({ title, description, image = DEFAULT_IMAGE }) {
  useEffect(() => {
    if (!title) return undefined;
    const previous = document.title;
    const url = `${SITE_URL}${window.location.pathname}`;

    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", url);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);

    return () => {
      document.title = previous;
    };
  }, [title, description, image]);
}