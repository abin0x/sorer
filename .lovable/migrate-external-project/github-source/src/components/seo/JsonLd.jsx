import React from "react";

/**
 * Renders one JSON-LD block. Crawlers read the script text; nothing executes,
 * so this is safe to render straight into the page tree.
 */
export default function JsonLd({ id, data }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}