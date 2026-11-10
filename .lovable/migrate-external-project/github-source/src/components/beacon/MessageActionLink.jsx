import React from "react";
import { CreditCard, ExternalLink } from "lucide-react";

/** Payment or registration button attached to a message. */
export default function MessageActionLink({ label, url }) {
  if (!url) return null;
  const external = /^https?:\/\//i.test(url);
  return (
    <a
      href={url}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
    >
      <CreditCard className="w-3.5 h-3.5" />
      {label || "Pay now"}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}