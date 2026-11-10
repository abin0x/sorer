import { base44 } from "@/api/base44Client";
import { resolveDelivery, getMuteLevel } from "@/lib/quietHours";

/**
 * Fans a new channel message out to its audience as Notification rows,
 * applying each recipient's mute + quiet-hours + preference settings.
 * Recipients resolved to 'digest' or 'off' are skipped for now (daily
 * digest batching is a separate scheduled job, not built yet).
 */
export async function notifyChannelAudience({ channel, message, audienceEmails, prefRows, senderEmail, clubId }) {
  const recipients = audienceEmails.filter((email) => email && email.toLowerCase() !== senderEmail?.toLowerCase());
  if (recipients.length === 0) return;

  const prefByEmail = new Map(prefRows.map((p) => [p.user_email, p]));
  const toCreate = [];

  recipients.forEach((email) => {
    const prefs = prefByEmail.get(email) || null;
    const muteLevel = getMuteLevel(prefs, channel.id, channel.team_id);
    const channelOverride = prefs?.channel_overrides?.[channel.id];
    const delivery = resolveDelivery({ isPriority: message.is_priority, isMention: false, muteLevel, prefs, channelOverride });
    if (delivery !== "push" && delivery !== "badge") return;

    toCreate.push({
      club_id: clubId,
      user_email: email,
      type: "beacon_message",
      delivery,
      is_priority: !!message.is_priority,
      channel_id: channel.id,
      channel_name: channel.name,
      title: message.is_priority ? `Priority: ${channel.name}` : channel.name,
      message: message.content?.slice(0, 140) || "New post",
      link: "/CommunicationPortal",
      read: false,
    });
  });

  if (toCreate.length > 0) await base44.entities.Notification.bulkCreate(toCreate);
}