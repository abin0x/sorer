import React, { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";

/** SafeSport reminder shown at the top of every channel where young players may be present. */
export default function SafeChannelBanner({ channel }) {
  const storageKey = `beacon-safe-banner-${channel?.id}`;
  const [hidden, setHidden] = useState(false);
  useEffect(() => { setHidden(window.sessionStorage?.getItem(storageKey) === "1"); }, [storageKey]);
  if (!channel || hidden || channel.type === "social_feed") return null;
  const teamChat = channel.type === "team_chat";
  return (
    <div className="mx-3 mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-foreground">
      <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
      <p className="flex-1 leading-snug">
        <strong>Safe channel.</strong>{" "}
        {teamChat
          ? "Parents and club staff can see every message here. Private adult-to-player messages aren't available in Beacon."
          : "Club staff can see every message. Edits keep the original wording, and removed posts are kept for safety review."}{" "}
        Something wrong? Use <em>Report</em> on any message.
      </p>
      <button
        aria-label="Hide safety note"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => { window.sessionStorage?.setItem(storageKey, "1"); setHidden(true); }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
