import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Flag, MapPin, Trophy, Eye, BellRing, ShieldAlert, Trash2, AlertTriangle, Info } from "lucide-react";
import MessageAttachment from "@/components/beacon/MessageAttachment";
import MessagePoll from "@/components/beacon/MessagePoll";
import MessageActionLink from "@/components/beacon/MessageActionLink";
import { urgencyOf, mapsLink } from "@/lib/beaconDelivery";

const QUICK_REACTIONS = ["👍", "❤️", "🎉"];
const RSVP = [
  { key: "yes", label: "Going" },
  { key: "maybe", label: "Maybe" },
  { key: "no", label: "Can't make it" },
];

function UrgencyBadge({ urgency }) {
  if (urgency === "urgent") return <Badge className="bg-destructive text-destructive-foreground gap-1"><AlertTriangle className="w-3 h-3" /> Urgent</Badge>;
  if (urgency === "important") return <Badge className="bg-amber-500 text-white gap-1"><BellRing className="w-3 h-3" /> Important</Badge>;
  return null;
}

function GameCard({ card, location }) {
  const when = card.date ? format(new Date(`${card.date}T${card.kickoff || "12:00"}`), "EEE, MMM d") : null;
  const t = (hhmm) => (hhmm ? format(new Date(`2000-01-01T${hhmm}`), "h:mm a") : null);
  return (
    <div className="rounded-xl bg-gradient-to-br from-primary to-accent p-4 text-primary-foreground">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider opacity-90"><Trophy className="w-3.5 h-3.5" /> Game day · {card.home_away}</div>
      <p className="text-lg font-bold mt-1">vs {card.opponent || "TBD"}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        {when && <div><p className="opacity-75">Date</p><p className="font-semibold">{when}</p></div>}
        {card.kickoff && <div><p className="opacity-75">Kickoff</p><p className="font-semibold">{t(card.kickoff)}</p></div>}
        {card.arrive && <div><p className="opacity-75">Arrive</p><p className="font-semibold">{t(card.arrive)}</p></div>}
      </div>
      {(card.uniform || card.notes) && <p className="mt-2 text-xs opacity-90">{[card.uniform && `Uniform: ${card.uniform}`, card.notes].filter(Boolean).join(" · ")}</p>}
      {location && <LocationPin location={location} onDark />}
    </div>
  );
}

function LocationPin({ location, onDark }) {
  const href = mapsLink(location);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`mt-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${onDark ? "bg-background/15 hover:bg-background/25" : "border border-border bg-muted/50 hover:bg-muted text-foreground"}`}>
      <MapPin className="w-4 h-4 shrink-0" />
      <span className="truncate">{[location.name, location.address].filter(Boolean).join(" · ")}</span>
      <span className="ml-auto shrink-0 underline">Directions</span>
    </a>
  );
}

export default function ChannelMessageItem({
  message, channel, isOwn, onReact, onAcknowledge, onVote, canSeeAckCount, audienceSize,
  pendingCount = 0, onRsvp, onReport, onEscalate, onModerate, onDelete, viewerEmail, grouped = false, nextIsOwn = false,
}) {
  const [showTools, setShowTools] = React.useState(false);
  const isPoll = (message.poll_options?.length || 0) > 0;
  const isGame = message.kind === "game_day" && message.game_card;
  const urgency = urgencyOf(message);
  const ackCount = message.acknowledged_by?.length || 0;
  const readCount = message.read_by?.length || 0;
  const iAcked = message.acknowledged_by?.includes(viewerEmail || message.__viewerEmail);
  const held = message.moderation_status === "held";
  const myRsvp = RSVP.find((r) => message.rsvps?.[r.key]?.includes(viewerEmail))?.key;
  const lastFollowup = message.escalation_summary?.last_followup;

  const body = (
    <>
      {isGame && <GameCard card={message.game_card} location={message.location} />}
      {!isPoll && message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
      {isPoll && <MessagePoll message={message} onVote={onVote} viewerEmail={viewerEmail || message.__viewerEmail} />}
      {!isGame && message.location && <LocationPin location={message.location} />}
      {message.image_uri && <MessageAttachment uri={message.image_uri} kind="image" />}
      {message.attachment_uri && (
        <MessageAttachment uri={message.attachment_uri} kind={message.attachment_kind || "file"} name={message.attachment_name} />
      )}
      <MessageActionLink label={message.action_label} url={message.action_url} />
      {message.edited_at && <p className="text-[10px] opacity-60">Edited</p>}
    </>
  );

  const toolRow = (
    <div className="flex items-center gap-1">
      {QUICK_REACTIONS.map((emoji) => (
        <button key={emoji} onClick={() => onReact(message, emoji)} className="text-sm px-1.5 py-0.5 rounded-full hover:bg-muted">
          {emoji} {message.reactions?.[emoji]?.length > 0 && <span className="text-[11px] text-muted-foreground">{message.reactions[emoji].length}</span>}
        </button>
      ))}
      {!isOwn && onReport && (
        <button onClick={() => onReport(message)} className="text-[11px] px-1.5 py-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-muted flex items-center gap-1" aria-label="Report message">
          <Flag className="w-3 h-3" /> Report
        </button>
      )}
      {isOwn && onDelete && !message.__pending && (
        <button onClick={() => onDelete(message)} className="text-[11px] px-1.5 py-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-muted" aria-label="Remove message">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  const heldBar = held && (
    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive px-2.5 py-1.5 text-xs mb-2">
      <ShieldAlert className="w-3.5 h-3.5" />
      <span className="flex-1">Hidden from families after reports. Waiting for review.</span>
      {canSeeAckCount && onModerate && (
        <>
          <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => onModerate(message, "restore")}>Restore</Button>
          <Button size="sm" variant="destructive" className="h-6 text-[11px]" onClick={() => onModerate(message, "remove")}>Remove</Button>
        </>
      )}
    </div>
  );

  const asCard = channel.allow_replies === false || isPoll || isGame || urgency !== "info";
  if (asCard) {
    const tone = urgency === "urgent"
      ? "border-destructive/60 bg-destructive/5"
      : urgency === "important" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-border bg-card";
    return (
      <div className={`my-3 rounded-2xl border p-4 ${tone} ${urgency === "urgent" ? "shadow-[0_0_0_3px_hsl(var(--destructive)/0.12)]" : ""}`}>
        {heldBar}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <UrgencyBadge urgency={urgency} />
            <span className="font-semibold text-sm text-foreground">{message.author_name}</span>
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">{format(new Date(message.created_date), "MMM d, h:mm a")}</span>
        </div>
        <div className="space-y-2">{body}</div>

        {isGame && onRsvp && (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {RSVP.map((r) => (
              <button
                key={r.key}
                onClick={() => onRsvp(message, r.key)}
                className={`rounded-full border py-1.5 text-xs font-medium ${myRsvp === r.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
              >
                {r.label}{message.rsvps?.[r.key]?.length ? ` · ${message.rsvps[r.key].length}` : ""}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/60 flex-wrap">
          {toolRow}
          {message.ack_required && (
            <Button size="sm" variant={iAcked ? "secondary" : "outline"} className="h-7 text-xs rounded-full ml-auto" onClick={() => onAcknowledge(message)} disabled={iAcked}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {iAcked ? "Got it ✓" : "Got it"}
            </Button>
          )}
        </div>

        {canSeeAckCount && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Seen by {readCount}/{audienceSize || "?"}</span>
            {message.ack_required && <span>· {ackCount} tapped "Got it"</span>}
            {lastFollowup && <span>· Followed up {format(new Date(lastFollowup.at), "h:mm a")}</span>}
            {(urgency === "urgent" || message.ack_required) && pendingCount > 0 && onEscalate && (
              <Button size="sm" variant="outline" className="h-6 text-[11px] rounded-full ml-auto" onClick={() => onEscalate(message)}>
                <BellRing className="w-3 h-3 mr-1" /> Text & email the {pendingCount} who haven't seen it
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // iMessage-style bubble: tail corner, sender above, tapbacks below, tools on tap.
  const reacted = Object.entries(message.reactions || {}).filter(([, v]) => v?.length);
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}>
      <div className={`max-w-[78%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {heldBar}
        {!isOwn && !grouped && <p className="text-[11px] text-muted-foreground mb-0.5 ml-3">{message.author_name}</p>}
        <button type="button" onClick={() => setShowTools((v) => !v)}
          className={`text-left px-3.5 py-2 text-[16px] leading-snug rounded-[20px] ${isOwn ? "bg-primary text-primary-foreground rounded-br-[6px]" : "bg-muted text-foreground rounded-bl-[6px]"}`}>
          <div className="space-y-1.5 [&_p.text-sm]:text-[16px]">{body}</div>
        </button>
        {reacted.length > 0 && (
          <div className={`-mt-1.5 flex gap-1 ${isOwn ? "mr-2" : "ml-2"}`}>
            {reacted.map(([emoji, v]) => (
              <button key={emoji} onClick={() => onReact(message, emoji)} className="text-xs px-1.5 rounded-full bg-background border border-border shadow-sm">{emoji}{v.length > 1 ? ` ${v.length}` : ""}</button>
            ))}
          </div>
        )}
        {showTools && <div className="mt-1">{toolRow}</div>}
        {isOwn && (message.__pending || readCount > 0) && !nextIsOwn && (
          <p className="text-[11px] text-muted-foreground mt-0.5 mr-1">{message.__pending ? "Sending…" : `Read by ${readCount}`}</p>
        )}
      </div>
    </div>
  );
}
