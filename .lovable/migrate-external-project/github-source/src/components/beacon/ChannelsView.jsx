import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, BellOff, Loader2, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import useBeaconData from "@/components/beacon/useBeaconData";
import ChannelSidebar from "@/components/beacon/ChannelSidebar";
import ChannelMessageItem from "@/components/beacon/ChannelMessageItem";
import SocialFeedCard from "@/components/beacon/SocialFeedCard";
import ChannelComposer from "@/components/beacon/ChannelComposer";
import PriorityConfirmDialog from "@/components/beacon/PriorityConfirmDialog";
import MuteDialog from "@/components/beacon/MuteDialog";
import { CHANNEL_TYPES, canPostInChannel, canSendPriority as canSendPriorityFn } from "@/lib/beaconChannels";
import { notifyChannelAudience } from "@/lib/beaconNotify";
import { getMuteLevel } from "@/lib/quietHours";

export default function ChannelsView({ user }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const data = useBeaconData(user);
  const [pendingSend, setPendingSend] = useState(null); // { payload } awaiting priority confirmation
  const [muteOpen, setMuteOpen] = useState(false);

  // The open channel lives in the URL (?channel=<id>), so opening one is a real
  // navigation: the system back button returns to the channel list instead of
  // leaving the portal, and a channel can be linked to directly.
  const [searchParams, setSearchParams] = useSearchParams();
  const allChannels = [
    ...(data.clubChannels || []),
    ...(data.teamGroups || []).flatMap((g) => g.channels || []),
  ];
  const openChannelId = searchParams.get("channel");
  const selected = openChannelId ? allChannels.find((c) => c.id === openChannelId) || null : null;
  const channel = selected || data.clubChannels[0] || data.teamGroups[0]?.channels[0] || null;

  const openChannel = (ch) => {
    const next = new URLSearchParams(searchParams);
    next.set("channel", ch.id);
    setSearchParams(next);
  };
  const closeChannel = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("channel");
    setSearchParams(next, { replace: true });
  };

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["beacon-messages", channel?.id],
    queryFn: () => base44.entities.ChannelMessage.filter({ channel_id: channel.id }, "-created_date", 200),
    enabled: !!channel,
    refetchInterval: 8000,
  });

  const { data: todaysAudit = [] } = useQuery({
    queryKey: ["beacon-priority-audit", user?.email],
    queryFn: () => base44.entities.PriorityAuditLog.filter({ sender_email: user?.email }, "-created_date", 50),
    enabled: !!user,
  });
  const priorityToday = todaysAudit.filter((a) => new Date(a.created_date).toDateString() === new Date().toDateString()).length;
  const priorityLimit = 3;

  const sorted = useMemo(() => {
    const visible = messages.filter((m) => !m.soft_deleted && (channel?.type !== CHANNEL_TYPES.SOCIAL_FEED || m.moderation_status !== "rejected"));
    return [...visible].sort((a, b) => {
      if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
      return new Date(b.created_date) - new Date(a.created_date);
    });
  }, [messages, channel]);

  const audienceEmails = channel ? data.audienceFor(channel) : [];

  const createMessage = useMutation({
    mutationFn: (payload) => base44.entities.ChannelMessage.create({
      club_id: user.club_id,
      channel_id: channel.id,
      channel_type: channel.type,
      team_id: channel.team_id,
      author_email: user.email,
      author_name: user.full_name || user.email,
      author_role: user.custom_role || user.role,
      moderation_status: channel.type === CHANNEL_TYPES.SOCIAL_FEED && channel.moderation_mode === "pre_approve" ? "pending" : "approved",
      ...payload,
    }),
    onMutate: async (payload) => {
      const key = ["beacon-messages", channel.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key) || [];
      const tempId = `tmp-${Date.now()}`;
      // Show the post straight away, with a syncing state, while it saves.
      queryClient.setQueryData(key, [
        ...previous,
        {
          id: tempId,
          __pending: true,
          club_id: user.club_id,
          channel_id: channel.id,
          channel_type: channel.type,
          team_id: channel.team_id,
          author_email: user.email,
          author_name: user.full_name || user.email,
          author_role: user.custom_role || user.role,
          created_date: new Date().toISOString(),
          ...payload,
        },
      ]);
      return { key, previous, tempId };
    },
    onError: (error, payload, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous);
      toast({ title: "Couldn't save, please try again.", description: error?.message, variant: "destructive" });
    },
    onSuccess: async (created, payload, ctx) => {
      // Swap the temporary entry for the record the server returned.
      if (ctx) queryClient.setQueryData(ctx.key, (old = []) => old.map((m) => (m.id === ctx.tempId ? created : m)));
      queryClient.invalidateQueries({ queryKey: ["beacon-messages", channel.id] });
      if (created.is_priority) {
        await base44.entities.PriorityAuditLog.create({
          club_id: user.club_id, channel_id: channel.id, channel_name: channel.name,
          message_id: created.id, sender_email: user.email, sender_name: user.full_name,
          audience_size: audienceEmails.length,
        });
        queryClient.invalidateQueries({ queryKey: ["beacon-priority-audit", user.email] });
      }
      await notifyChannelAudience({ channel, message: created, audienceEmails, prefRows: data.prefRows, senderEmail: user.email, clubId: user.club_id });
    },
  });

  const handleSend = (payload) => {
    if (payload.is_priority) {
      if (priorityToday >= priorityLimit) {
        return Promise.reject(new Error(`Daily priority limit reached (${priorityLimit}/day). Ask an admin to override.`));
      }
      setPendingSend(payload);
      return Promise.resolve();
    }
    return createMessage.mutateAsync(payload);
  };

  const confirmPrioritySend = () => {
    if (pendingSend) createMessage.mutate(pendingSend);
    setPendingSend(null);
  };

  const handleReact = (message, emoji) => {
    const reactions = { ...(message.reactions || {}) };
    const list = new Set(reactions[emoji] || []);
    if (list.has(user.email)) list.delete(user.email); else list.add(user.email);
    reactions[emoji] = [...list];
    base44.entities.ChannelMessage.update(message.id, { reactions }).then(() => queryClient.invalidateQueries({ queryKey: ["beacon-messages", channel.id] }));
  };

  const handleAcknowledge = (message) => {
    const acknowledged_by = [...new Set([...(message.acknowledged_by || []), user.email])];
    base44.entities.ChannelMessage.update(message.id, { acknowledged_by }).then(() => queryClient.invalidateQueries({ queryKey: ["beacon-messages", channel.id] }));
  };

  const handleVote = (message, optionId) => {
    const votes = {};
    Object.entries(message.poll_votes || {}).forEach(([key, emails]) => {
      const remaining = (emails || []).filter((email) => email !== user.email);
      if (remaining.length) votes[key] = remaining;
    });
    votes[optionId] = [...(votes[optionId] || []), user.email];
    base44.entities.ChannelMessage.update(message.id, { poll_votes: votes }).then(() => queryClient.invalidateQueries({ queryKey: ["beacon-messages", channel.id] }));
  };

  const handleMuteSave = (mute) => {
    const prefs = data.myPrefs;
    const mutes = (prefs?.mutes || []).filter((m) => !(m.scope === mute.scope && m.target_id === mute.target_id));
    mutes.push(mute);
    if (prefs) {
      base44.entities.NotificationPreference.update(prefs.id, { mutes }).then(() => queryClient.invalidateQueries({ queryKey: ["beacon-prefs", user.club_id] }));
    } else {
      base44.entities.NotificationPreference.create({ club_id: user.club_id, user_id: user.id, user_email: user.email, mutes: [mute] }).then(() => queryClient.invalidateQueries({ queryKey: ["beacon-prefs", user.club_id] }));
    }
  };

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground text-sm">
        {data.channelsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "No channels available yet."}
      </div>
    );
  }

  const myMuteLevel = getMuteLevel(data.myPrefs, channel.id, channel.team_id);
  const canPost = canPostInChannel(user, channel);
  const canPrioritize = canSendPriorityFn(user);
  const isSocialFeed = channel.type === CHANNEL_TYPES.SOCIAL_FEED;
  const likedPost = (post) => post.reactions?.["❤️"]?.includes(user.email);

  return (
    <div className="flex gap-3 h-[calc(100vh-220px)] min-h-[460px]">
      <div className={`w-full sm:w-64 shrink-0 rounded-2xl border border-border/60 bg-card p-3 ${selected ? "hidden sm:block" : "block"}`}>
        <ChannelSidebar
          clubChannels={data.clubChannels}
          teamGroups={data.teamGroups}
          selectedId={channel.id}
          onSelect={openChannel}
        />
      </div>

      <div className={`flex-1 flex-col rounded-2xl border border-border/60 bg-card overflow-hidden ${selected ? "flex" : "hidden sm:flex"}`}>
        <div className="p-3 border-b border-border flex items-center gap-2 bg-card">
          <Button variant="ghost" size="icon" className="sm:hidden shrink-0 -ml-1" onClick={closeChannel} aria-label="Back to channels">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shrink-0">
            <Hash className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-foreground text-sm truncate">{channel.name}</h2>
            {myMuteLevel && <p className="text-[11px] text-muted-foreground">Muted{myMuteLevel === "mentions" ? " (mentions only)" : ""}</p>}
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setMuteOpen(true)}>
            <BellOff className={`w-4 h-4 ${myMuteLevel ? "text-amber-500" : "text-muted-foreground"}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {messagesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No posts yet.</p>
          ) : isSocialFeed ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-4xl mx-auto">
              {sorted.map((post) => (
                <SocialFeedCard key={post.id} post={post} onLike={(p) => handleReact(p, "❤️")} liked={likedPost(post)} commentCount={messages.filter((m) => m.parent_id === post.id).length} />
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
              {sorted.map((m) => (
                <div key={m.id} className={m.__pending ? "opacity-60" : undefined}>
                  {m.__pending && (
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Syncing…
                    </p>
                  )}
                  <ChannelMessageItem
                    message={{ ...m, __viewerEmail: user.email }}
                    channel={channel}
                    isOwn={m.author_email === user.email}
                    onReact={handleReact}
                    onAcknowledge={handleAcknowledge}
                    onVote={handleVote}
                    canSeeAckCount={canPrioritize}
                    audienceSize={audienceEmails.length}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {canPost && (
          <ChannelComposer channel={channel} canSendPriority={canPrioritize} onSend={handleSend} isSocialFeed={isSocialFeed} clubId={user.club_id} />
        )}
      </div>

      <PriorityConfirmDialog
        open={!!pendingSend}
        onOpenChange={(v) => !v && setPendingSend(null)}
        audienceSize={audienceEmails.length}
        remainingToday={priorityLimit - priorityToday}
        onConfirm={confirmPrioritySend}
      />
      <MuteDialog open={muteOpen} onOpenChange={setMuteOpen} channel={channel} onSave={handleMuteSave} />
    </div>
  );
}