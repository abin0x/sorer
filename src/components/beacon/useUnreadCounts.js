import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { unreadByChannel } from "@/lib/beaconUnread";

/** Unread counts for the channels this person can already see (reads stay under the database rules). */
export default function useUnreadCounts(user, channelIds = []) {
  const ids = [...new Set(channelIds.filter(Boolean))].sort();
  const { data = [] } = useQuery({
    queryKey: ["beacon-unread", user?.email, ids.join(",")],
    queryFn: () => base44.entities.ChannelMessage.filter({ channel_id: { $in: ids } }, "-created_date", 400).catch(() => []),
    enabled: !!user?.email && ids.length > 0,
    refetchInterval: 30000,
  });
  return useMemo(() => {
    const byChannel = unreadByChannel(data, user?.email);
    return { messages: data, byChannel, total: Object.values(byChannel).reduce((s, n) => s + n, 0) };
  }, [data, user?.email]);
}

/** Mark every unread post in the given list as read by this person. */
export async function markChannelsRead(messages, email) {
  if (!email) return;
  const todo = (messages || []).filter((m) => m?.id && m.author_email !== email && !(m.read_by || []).includes(email));
  await Promise.all(todo.map((m) => base44.entities.ChannelMessage.update(m.id, { read_by: [...(m.read_by || []), email] }).catch(() => null)));
}
