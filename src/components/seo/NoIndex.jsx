import { useEffect } from "react";

/**
 * Marks the current page noindex while it is mounted.
 *
 * Used by pages that are built but deliberately not published yet — the
 * comparison pages, whose [VERIFY: …] facts still need checking. The URL stays
 * reachable for review, but the page never enters search results and is not
 * linked from the navigation or the sitemap.
 */
export default function NoIndex() {
  useEffect(() => {
    const el = document.createElement("meta");
    el.setAttribute("name", "robots");
    el.setAttribute("content", "noindex,nofollow");
    document.head.appendChild(el);
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  return null;
}