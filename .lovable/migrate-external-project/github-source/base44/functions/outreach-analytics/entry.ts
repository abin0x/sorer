import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireSystemOwner } from '../../shared/outreachAccess.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, ...params } = body;

    const { user, error } = await requireSystemOwner(base44);
    if (error) return error;

    const daysBack = params.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startISO = startDate.toISOString();

    switch (action) {
      case 'dashboard': {
        // KPI counts
        const totalProspects = await base44.asServiceRole.entities.Prospect.count({});
        const prevDate = new Date();
        prevDate.setDate(prevDate.getDate() - 60);
        const prevProspects = await base44.asServiceRole.entities.Prospect.filter(
          { created_date: { $lt: startISO } }, { limit: 5000 }
        );
        const prospectsDelta = totalProspects - (prevProspects?.items?.length || prevProspects?.length || 0);

        // Sends in last 30 days
        const { items: recentSends } = await base44.asServiceRole.entities.OutreachSend.filter(
          { sent_at: { $gte: startISO } }, { limit: 5000, sort: '-sent_at' }
        );
        const emailsSent = recentSends.length;
        const delivered = recentSends.filter(s => s.status === 'delivered' || s.opened_at).length;
        const opened = recentSends.filter(s => s.open_count > 0).length;
        const clicked = recentSends.filter(s => s.click_count > 0).length;
        const bounced = recentSends.filter(s => s.status === 'bounced').length;
        const complained = recentSends.filter(s => s.status === 'complained').length;
        const replied = await base44.asServiceRole.entities.Prospect.count({ status: 'replied' });
        const booked = await base44.asServiceRole.entities.Prospect.count({ status: 'booked' });

        const openRate = emailsSent > 0 ? (opened / emailsSent * 100) : 0;
        const clickRate = emailsSent > 0 ? (clicked / emailsSent * 100) : 0;
        const replyRate = emailsSent > 0 ? (replied / emailsSent * 100) : 0;
        const bounceRate = emailsSent > 0 ? (bounced / emailsSent * 100) : 0;
        const complaintRate = emailsSent > 0 ? (complained / emailsSent * 100) : 0;

        // Funnel
        const funnel = [
          { stage: 'Sent', count: emailsSent },
          { stage: 'Delivered', count: delivered },
          { stage: 'Opened', count: opened },
          { stage: 'Clicked', count: clicked },
          { stage: 'Replied', count: replied },
          { stage: 'Booked', count: booked },
        ];

        // Sends by day
        const sendsByDay = {};
        for (const s of recentSends) {
          if (s.sent_at) {
            const day = s.sent_at.slice(0, 10);
            sendsByDay[day] = (sendsByDay[day] || 0) + 1;
          }
        }
        const sendsByDayArray = Object.entries(sendsByDay)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Hot leads: clicked in last 72h, not booked
        const hotLeadDate = new Date();
        hotLeadDate.setHours(hotLeadDate.getHours() - 72);
        const { items: hotLeads } = await base44.asServiceRole.entities.Prospect.filter(
          { status: 'clicked', last_engaged_at: { $gte: hotLeadDate.toISOString() } },
          { sort: '-last_engaged_at', limit: 20 }
        );

        // Recent replies
        const { items: recentReplies } = await base44.asServiceRole.entities.Prospect.filter(
          { status: 'replied' }, { sort: '-last_engaged_at', limit: 20 }
        );

        // Needs attention: bounced, complained, or stalled
        const { items: bouncedProspects } = await base44.asServiceRole.entities.Prospect.filter(
          { status: { $in: ['bounced', 'unsubscribed'] } }, { sort: '-updated_date', limit: 20 }
        );

        return Response.json({
          kpis: {
            totalProspects, prospectsDelta, emailsSent, openRate, clickRate,
            replyRate, demosBooked: booked, bounceRate, complaintRate,
          },
          funnel,
          sendsByDay: sendsByDayArray,
          hotLeads,
          recentReplies,
          needsAttention: bouncedProspects,
        });
      }

      case 'breakdown': {
        const { items: sends } = await base44.asServiceRole.entities.OutreachSend.filter(
          { sent_at: { $gte: startISO } }, { limit: 5000 }
        );

        // By sequence
        const bySequence = {};
        for (const s of sends) {
          const key = s.sequence_name || 'One-off';
          if (!bySequence[key]) bySequence[key] = { sent: 0, opened: 0, clicked: 0, replied: 0 };
          bySequence[key].sent++;
          if (s.open_count > 0) bySequence[key].opened++;
          if (s.click_count > 0) bySequence[key].clicked++;
        }

        // By region (join prospect)
        const prospectIds = [...new Set(sends.map(s => s.prospect_id))];
        const { items: prospects } = await base44.asServiceRole.entities.Prospect.filter(
          { id: { $in: prospectIds } }, { limit: 5000 }
        );
        const prospectMap = {};
        for (const p of prospects) prospectMap[p.id] = p;

        const byRegion = {};
        const byPlatform = {};
        for (const s of sends) {
          const p = prospectMap[s.prospect_id];
          if (!p) continue;
          const region = p.region || 'Unknown';
          if (!byRegion[region]) byRegion[region] = { sent: 0, opened: 0, clicked: 0 };
          byRegion[region].sent++;
          if (s.open_count > 0) byRegion[region].opened++;
          if (s.click_count > 0) byRegion[region].clicked++;

          const platform = p.registration_platform || 'unknown';
          if (!byPlatform[platform]) byPlatform[platform] = { sent: 0, opened: 0, clicked: 0 };
          byPlatform[platform].sent++;
          if (s.open_count > 0) byPlatform[platform].opened++;
          if (s.click_count > 0) byPlatform[platform].clicked++;
        }

        return Response.json({
          bySequence: Object.entries(bySequence).map(([name, m]) => ({ name, ...m,
            openRate: m.sent > 0 ? (m.opened / m.sent * 100) : 0,
            clickRate: m.sent > 0 ? (m.clicked / m.sent * 100) : 0,
          })),
          byRegion: Object.entries(byRegion).map(([region, m]) => ({ region, ...m })),
          byPlatform: Object.entries(byPlatform).map(([platform, m]) => ({ platform, ...m })),
        });
      }

      default:
        return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    console.error('outreach-analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}