import React from "react";
import { Megaphone, CalendarClock, MessageCircle, Users, Images, Hash } from "lucide-react";
import { CHANNEL_TYPES } from "@/lib/beaconChannels";

const ICONS = {
  [CHANNEL_TYPES.CLUB_ANNOUNCEMENTS]: Megaphone,
  [CHANNEL_TYPES.SCHEDULING]: CalendarClock,
  [CHANNEL_TYPES.TEAM_CHAT]: MessageCircle,
  [CHANNEL_TYPES.PARENTS_CHAT]: Users,
  [CHANNEL_TYPES.SOCIAL_FEED]: Images,
};

function ChannelRow({ channel, active, onClick }) {
  const Icon = ICONS[channel.type] || Hash;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? "" : "text-muted-foreground"}`} />
      <span className="truncate flex-1">{channel.name}</span>
    </button>
  );
}

export default function ChannelSidebar({ clubChannels, teamGroups, selectedId, onSelect, className = "" }) {
  return (
    <div className={`flex flex-col gap-4 overflow-y-auto ${className}`}>
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Club</p>
        <div className="space-y-0.5">
          {clubChannels.map((ch) => (
            <ChannelRow key={ch.id} channel={ch} active={selectedId === ch.id} onClick={() => onSelect(ch)} />
          ))}
        </div>
      </div>
      {teamGroups.map((group) => (
        <div key={group.teamId}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5 truncate">{group.teamName}</p>
          <div className="space-y-0.5">
            {group.channels.map((ch) => (
              <ChannelRow key={ch.id} channel={ch} active={selectedId === ch.id} onClick={() => onSelect(ch)} />
            ))}
          </div>
        </div>
      ))}
      {clubChannels.length === 0 && teamGroups.length === 0 && (
        <p className="text-xs text-muted-foreground px-3">No channels yet.</p>
      )}
    </div>
  );
}