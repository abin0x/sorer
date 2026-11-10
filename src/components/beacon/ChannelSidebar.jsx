import React, { useState } from "react";
import { Megaphone, CalendarClock, MessageCircle, Users, Images, Hash, Search, SquarePen, ChevronRight, Pencil } from "lucide-react";
import { CHANNEL_TYPES, CHANNEL_TYPE_LABELS } from "@/lib/beaconChannels";

const ICONS = {
  [CHANNEL_TYPES.CLUB_ANNOUNCEMENTS]: Megaphone,
  [CHANNEL_TYPES.SCHEDULING]: CalendarClock,
  [CHANNEL_TYPES.TEAM_CHAT]: MessageCircle,
  [CHANNEL_TYPES.PARENTS_CHAT]: Users,
  [CHANNEL_TYPES.SOCIAL_FEED]: Images,
};

/** Strip the "Team — " prefix inside a team group, like iMessage shows short names. */
const shortName = (ch) => (ch.team_name && ch.name.startsWith(`${ch.team_name} — `) ? ch.name.slice(ch.team_name.length + 3) : ch.name);

function ChannelRow({ channel, active, onClick, unread = 0, onEdit }) {
  const Icon = ICONS[channel.type] || Hash;
  return (
    <div className={`group relative flex items-center ${active ? "bg-primary/10" : ""}`}>
      <span className={`absolute left-1.5 w-2.5 h-2.5 rounded-full ${unread > 0 && !active ? "bg-primary" : "bg-transparent"}`} aria-hidden />
      <button onClick={onClick} className="flex-1 min-w-0 flex items-center gap-3 pl-5 pr-2 py-2.5 text-left">
        <span className="w-11 h-11 rounded-full bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/70 text-background grid place-items-center shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <span className="min-w-0 flex-1 border-b border-border/70 pb-2.5 -mb-2.5">
          <span className="flex items-center gap-2">
            <span className={`truncate flex-1 text-[15px] ${unread && !active ? "font-bold" : "font-semibold"} text-foreground`}>{shortName(channel)}</span>
            {unread > 0 && !active && <span className="text-[12px] font-semibold text-primary">{unread > 99 ? "99+" : unread} new</span>}
            <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          </span>
          <span className="block truncate text-[13px] text-muted-foreground">{channel.description || CHANNEL_TYPE_LABELS[channel.type] || "Channel"}</span>
        </span>
      </button>
      {onEdit && (
        <button onClick={() => onEdit(channel)} aria-label={`Edit ${channel.name}`} className="mr-2 p-2 rounded-full text-muted-foreground hover:bg-muted">
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function ChannelSidebar({ clubChannels, teamGroups, selectedId, onSelect, className = "", unread = {}, canManage, onNew, onEdit }) {
  const [q, setQ] = useState("");
  const [editMode, setEditMode] = useState(false);
  const match = (ch) => !q || ch.name.toLowerCase().includes(q.toLowerCase());
  const anyManage = !!(canManage && (canManage(null) || teamGroups.some((g) => canManage(g.teamId))));
  const editFor = (teamId) => (editMode && canManage?.(teamId) ? onEdit : undefined);
  const section = (title, channels, teamId) => {
    const list = channels.filter(match);
    if (!list.length) return null;
    return (
      <div key={teamId || "club"}>
        <p className="text-[13px] font-semibold text-muted-foreground px-4 pt-3 pb-1 truncate">{title}</p>
        {list.map((ch) => (
          <ChannelRow key={ch.id} channel={ch} active={selectedId === ch.id} unread={unread[ch.id] || 0} onClick={() => onSelect(ch)} onEdit={editFor(teamId)} />
        ))}
      </div>
    );
  };
  return (
    <div className={`flex flex-col overflow-y-auto ${className}`}>
      <div className="flex items-center justify-between px-4 pt-2">
        {anyManage ? (
          <button onClick={() => setEditMode((v) => !v)} className="text-[16px] text-primary font-medium">{editMode ? "Done" : "Edit"}</button>
        ) : <span />}
        {anyManage && (
          <button onClick={() => onNew?.()} aria-label="New channel" className="p-1 text-primary"><SquarePen className="w-6 h-6" /></button>
        )}
      </div>
      <h2 className="px-4 pt-1 text-[30px] font-bold tracking-tight text-foreground">Messages</h2>
      <div className="px-4 py-2">
        <label className="flex items-center gap-2 h-9 rounded-xl bg-muted px-3 text-muted-foreground">
          <Search className="w-4 h-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground" />
        </label>
      </div>
      {section("Club", clubChannels, null)}
      {teamGroups.map((g) => section(g.teamName, g.channels, g.teamId))}
      {clubChannels.length === 0 && teamGroups.length === 0 && (
        <p className="text-sm text-muted-foreground px-4 py-6">No channels yet.</p>
      )}
    </div>
  );
}
