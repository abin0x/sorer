import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { urgencyOf, pendingRecipients } from "@/lib/beaconDelivery";
import ReportMessageDialog from "@/components/beacon/ReportMessageDialog";
import SafeChannelBanner from "@/components/beacon/SafeChannelBanner";
import { useSearchParams } from '@/lib/router-compat';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, BellOff, Loader2, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import useBeaconData from "@/components/beacon/useBeaconData";
import ChannelSidebar from "@/components/beacon/ChannelSidebar";
import useUnreadCounts from "@/components/beacon/useUnreadCounts";
import ChannelMessageItem from "@/components/beacon/ChannelMessageItem";
import SocialFeedCard from "@/components/beacon/SocialFeedCard";
import ChannelComposer from "@/components/beacon/ChannelComposer";
import PriorityConfirmDialog from "@/components/beacon/PriorityConfirmDialog";
import MuteDialog from "@/components/beacon/MuteDialog";
import ChannelManageSheet from "@/components/beacon/ChannelManageSheet";
import { canManageChannels } from "@/lib/beaconChannelAdmin";
import { Info as InfoIcon } from "lucide-react";
import { CHANNEL_TYPES, canPostInChannel, canSendPriority as canSendPriorityFn } from "@/lib/beaconChannels";
import { getMuteLevel } from "@/lib/quietHours";

export default function ChannelsView({ user, teamScope = [] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const raw = useBeaconData(user);
  const data = useMemo(() => (!teamScope.length ? raw : { ...raw, teamGroups: raw.teamGroups.filter((g) => teamScope.includes(g.teamId)) }), [raw, teamScope]);
  const [pendingSend, setPendingSend] = useState(null); // { payload } awaiting priority confirmation
  const [muteOpen, setMuteOpen] = useState(false);
  const [manage, setManage] = useState(null); // { channel?: object, teamId?: string } while the sheet is open
  const scrollRef = useRef(null);

  // The open channel lives in the URL (?channel=<id>), so opening one is a real
  // navigation: the system back button returns to the channel list instead of
  // leaving the portal, and a channel can be linked to directly.
  const [searchParams, setSearchParams] = useSearchParams();
  const allChannels = [
    ...(data.clubChannels || []),
    ...(data.teamGroups || []).flatMap((g) => g.channels || []),
  ];
  const unread = useUnreadCounts(user, allChannels.map((c) => c.id));
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
    // Live updates arrive over the realtime subscription below; this is only a safety net.
    refetchInterval: 60000,
  });

  // Real-time delivery: new posts, reactions, "Got it" taps and read receipts appear instantly.
  const [live, setLive] = useState(false);
  const [typers, setTypers] = useState([]);
  const typingRef = useRef(null);
  useEffect(() => {
    if (!channel?.id) return;
    const key = ["beacon-messages", channel.id];
    const db = supabase
      .channel(`beacon-msgs-${channel.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_messages", filter: `channel_id=eq.${channel.id}` }, (payload) => {
        const row = payload.new;
        if (!row?.id) return;
        queryClient.setQueryData(key, (old = []) => {
          const idx = old.findIndex((m) => m.id === row.id);
          if (idx === -1) return [...old.filter((m) => !(m.__pending && m.author_email === row.author_email && m.content === row.content)), row];
          const next = [...old]; next[idx] = { ...old[idx], ...row }; return next;
        });
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    // Typing indicator: a shared room per channel.
    const room = supabase.channel(`beacon-typing:${channel.id}`, { config: { broadcast: { self: false } } });
    const timers = new Map();
    room.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!payload?.name) return;
      setTypers((t) => (t.includes(payload.name) ? t : [...t, payload.name]));
      clearTimeout(timers.get(payload.name));
      timers.set(payload.name, setTimeout(() => setTypers((t) => t.filter((n) => n !== payload.name)), 3500));
    }).subscribe();
    typingRef.current = room;
    return () => {
      timers.forEach(clearTimeout);
      setTypers([]); setLive(false);
      supabase.removeChannel(db);
      supabase.removeChannel(room);
      typingRef.current = null;
    };
  }, [channel?.id]);
  const lastTypingSent = useRef(0);
  const sendTyping = () => {
    if (Date.now() - lastTypingSent.current < 2000) return;
    lastTypingSent.current = Date.now();
    typingRef.current?.send({ type: "broadcast", event: "typing", payload: { name: (user.full_name || user.email || "").split(" ")[0] } });
  };

  const { data: todaysAudit = [] } = useQuery({
    queryKey: ["beacon-priority-audit", user?.email],
    queryFn: () => base44.entities.PriorityAuditLog.filter({ sender_email: user?.email }, "-created_date", 50),
    enabled: !!user,
  });
  const priorityToday = todaysAudit.filter((a) => new Date(a.created_date).toDateString() === new Date().toDateString()).length;
  const priorityLimit = 3;

  const sorted = useMemo(() => {
    const staffView = canSendPriorityFn(user);
    const visible = messages.filter((m) => !m.soft_deleted && (m.moderation_status !== "held" || staffView || m.author_email === user.email) && (channel?.type !== CHANNEL_TYPES.SOCIAL_FEED || m.moderation_status !== "rejected"));
    return [...visible].sort((a, b) => {
      const rank = (m) => ({ urgent: 2, important: 1 }[urgencyOf(m)] || 0);
      if (rank(a) !== rank(b)) return rank(b) - rank(a);
      // Conversations read top-to-bottom, newest at the bottom (like iMessage);
      // the social feed stays newest-first.
      return channel?.type === CHANNEL_TYPES.SOCIAL_FEED
        ? new Date(b.created_date) - new Date(a.created_date)
        : new Date(a.created_date) - new Date(b.created_date);
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
      const urgency = urgencyOf(created);
      if (urgency !== "info") {
        await base44.entities.PriorityAuditLog.create({
          club_id: user.club_id, channel_id: channel.id, channel_name: channel.name, urgency,
          message_id: created.id, sender_email: user.email, sender_name: user.full_name,
          audience_size: audienceEmails.length,
        }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["beacon-priority-audit", user.email] });
      }
      // Server-side fan-out: notifications for everyone, plus email and text for Urgent posts.
      try {
        const r = await base44.functions.invoke("beacon-deliver", { message_id: created.id, mode: "send" });
        const d = r?.data || {};
        if (urgency === "urgent") {
          const smsNote = d.sms_status === "not_configured" ? " Texts aren't set up for this club yet." : d.texted ? `, ${d.texted} by text` : "";
          toast({ title: "Urgent alert sent", description: `${d.notified || 0} notified, ${d.emailed || 0} by email${smsNote}` });
        }
      } catch (e) {
        toast({ title: "Posted, but alerts didn't go out", description: e?.message, variant: "destructive" });
      }
    },
  });

  const handleSend = (payload) => {
    if (payload.urgency === "urgent") {
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

  const update = (id, patch) => base44.entities.ChannelMessage.update(id, patch).catch((e) => toast({ title: "Couldn't save", description: e?.message, variant: "destructive" }));

  // Read receipts: mark what's on screen as read (a few at a time).
  useEffect(() => {
    if (!user?.email || !messages.length) return;
    const unread = messages.filter((m) => !m.__pending && m.author_email !== user.email && !(m.read_by || []).includes(user.email));
    if (unread.length) Promise.all(unread.map((m) => update(m.id, { read_by: [...(m.read_by || []), user.email] }))).then(() => queryClient.invalidateQueries({ queryKey: ["beacon-unread"] }));
  }, [messages.length, channel?.id]);

  const handleRsvp = (message, answer) => {
    const rsvps = { ...(message.rsvps || {}) };
    Object.keys(rsvps).forEach((k) => { rsvps[k] = (rsvps[k] || []).filter((e) => e !== user.email); });
    rsvps[answer] = [...(rsvps[answer] || []), user.email];
    update(message.id, { rsvps });
  };

  const [reporting, setReporting] = useState(null);
  const handleReport = async ({ reason, details }) => {
    await base44.entities.BeaconReport.create({ club_id: channel.club_id || user.club_id, message_id: reporting.id, channel_id: channel.id, reason, details, reporter_email: user.email, reporter_user_id: user.id });
    toast({ title: "Thanks — a club admin will review this.", description: "Reports are private. The author isn't told who reported." });
    setReporting(null);
  };
  const handleModerate = (message, action) => update(message.id, action === "remove" ? { soft_deleted: true } : { moderation_status: "approved" });
  const handleDelete = (message) => update(message.id, { soft_deleted: true });

  const handleEscalate = async (message) => {
    try {
      const r = await base44.functions.invoke("beacon-deliver", { message_id: message.id, mode: "escalate" });
      const d = r?.data || {};
      toast({ title: `Followed up with ${d.audience || 0}`, description: d.sms_status === "not_configured" ? `${d.emailed || 0} emailed. Texts aren't set up for this club yet.` : `${d.texted || 0} texted, ${d.emailed || 0} emailed.` });
    } catch (e) {
      toast({ title: "Follow-up failed", description: e?.message, variant: "destructive" });
    }
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

  useEffect(() => {
    const el = scrollRef.current;
    if (el && channel?.type !== CHANNEL_TYPES.SOCIAL_FEED) el.scrollTop = el.scrollHeight;
  }, [sorted.length, channel?.id]);

  const canManage = (teamId) => canManageChannels(user, teamId, data.teams);
  const onChannelSaved = (saved, op) => {
    queryClient.invalidateQueries({ queryKey: ["beacon-channels", user.club_id] });
    if (op === "delete") closeChannel();
    else if (op === "create" && saved?.id) openChannel(saved);
  };
  const manageSheet = (
    <ChannelManageSheet open={!!manage} onClose={() => setManage(null)} user={user} teams={data.teams}
      channel={manage?.channel || null} onSaved={onChannelSaved} />
  );

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground text-sm">
        {data.channelsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <div className="text-center space-y-3">
            <p>No channels available yet.</p>
            {canManage(null) && <Button className="rounded-full" onClick={() => setManage({})}>New channel</Button>}
          </div>
        )}
        {manageSheet}
      </div>
    );
  }

  const myMuteLevel = getMuteLevel(data.myPrefs, channel.id, channel.team_id);
  const canPost = canPostInChannel(user, channel);
  const canPrioritize = canSendPriorityFn(user);
  const isSocialFeed = channel.type === CHANNEL_TYPES.SOCIAL_FEED;
  const likedPost = (post) => post.reactions?.["❤️"]?.includes(user.email);

  return (
    <div className="flex gap-3 h-[calc(100dvh-220px)] min-h-[460px]">
      <div className={`w-full sm:w-80 shrink-0 sm:rounded-2xl sm:border border-border/60 bg-background ${selected ? "hidden sm:block" : "block"}`}>
        <ChannelSidebar
          clubChannels={data.clubChannels}
          teamGroups={data.teamGroups}
          selectedId={channel.id}
          unread={unread.byChannel}
          onSelect={openChannel}
          canManage={canManage}
          onNew={() => setManage({})}
          onEdit={(ch) => setManage({ channel: ch })}
          className="h-full"
        />
      </div>

      <div className={`flex-1 flex-col sm:rounded-2xl sm:border border-border/60 bg-background overflow-hidden ${selected ? "flex" : "hidden sm:flex"}`}>
        <div className="relative px-2 pt-2 pb-2 border-b border-border/70 bg-background/90 backdrop-blur flex items-start">
          <button className="sm:hidden flex items-center text-primary text-[16px] h-10 pr-2 shrink-0" onClick={closeChannel} aria-label="Back to channels">
            <ChevronLeft className="w-7 h-7 -ml-1" />{unread.total > 0 ? <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold grid place-items-center">{unread.total}</span> : null}
          </button>
          <div className="flex-1 min-w-0 flex flex-col items-center">
            <div className="w-11 h-11 rounded-full bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/70 text-background grid place-items-center">
              <Hash className="w-5 h-5" />
            </div>
            <h2 className="mt-1 text-[12px] font-medium text-foreground truncate max-w-full flex items-center gap-1">
              {channel.name}
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${live ? "bg-primary" : "bg-muted-foreground/40"}`} aria-label={live ? "Live" : "Connecting"} />
            </h2>
            {myMuteLevel && <p className="text-[11px] text-muted-foreground">Muted{myMuteLevel === "mentions" ? " (mentions only)" : ""}</p>}
          </div>
          <div className="flex shrink-0">
            {canManage(channel.scope === "team" ? channel.team_id : null) && (
              <Button variant="ghost" size="icon" className="text-primary" onClick={() => setManage({ channel })} aria-label="Channel details">
                <InfoIcon className="w-5 h-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setMuteOpen(true)} aria-label="Mute settings">
              <BellOff className={`w-5 h-5 ${myMuteLevel ? "text-primary" : "text-muted-foreground"}`} />
            </Button>
          </div>
        </div>

        <SafeChannelBanner channel={channel} />
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 sm:p-4">
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
            <div className="max-w-2xl mx-auto">
              {sorted.map((m, i) => (
                <div key={m.id} className={m.__pending ? "opacity-60" : undefined}>
                  <ChannelMessageItem
                    message={{ ...m, __viewerEmail: user.email }}
                    channel={channel}
                    isOwn={m.author_email === user.email}
                    onReact={handleReact}
                    onAcknowledge={handleAcknowledge}
                    onVote={handleVote}
                    canSeeAckCount={canPrioritize}
                    audienceSize={audienceEmails.length}
                    pendingCount={pendingRecipients(m, audienceEmails).length}
                    onRsvp={handleRsvp}
                    onReport={(msg) => setReporting(msg)}
                    onEscalate={handleEscalate}
                    onModerate={handleModerate}
                    onDelete={handleDelete}
                    viewerEmail={user.email}
                    grouped={i > 0 && sorted[i - 1].author_email === m.author_email && new Date(m.created_date) - new Date(sorted[i - 1].created_date) < 5 * 60000}
                    nextIsOwn={sorted[i + 1]?.author_email === m.author_email}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {typers.length > 0 && (
          <p className="px-4 pb-1 text-[11px] text-muted-foreground animate-pulse">{typers.slice(0, 2).join(", ")}{typers.length > 2 ? " and others" : ""} {typers.length === 1 ? "is" : "are"} typing…</p>
        )}
        {canPost && (
          <ChannelComposer onTyping={sendTyping} user={user} channel={channel} canSendPriority={canPrioritize} onSend={handleSend} isSocialFeed={isSocialFeed} clubId={user.club_id} />
        )}
      </div>

      <PriorityConfirmDialog
        open={!!pendingSend}
        onOpenChange={(v) => !v && setPendingSend(null)}
        audienceSize={audienceEmails.length}
        remainingToday={priorityLimit - priorityToday}
        onConfirm={confirmPrioritySend}
      />
      <ReportMessageDialog open={!!reporting} onOpenChange={(v) => !v && setReporting(null)} onSubmit={handleReport} />
      {manageSheet}
      <MuteDialog open={muteOpen} onOpenChange={setMuteOpen} channel={channel} onSave={handleMuteSave} />
    </div>
  );
}