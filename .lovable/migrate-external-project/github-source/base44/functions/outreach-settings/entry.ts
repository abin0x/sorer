import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import {
  requireSystemOwner, logAudit, ensureSettings, sanitizeSettings,
  addToSuppression, maskApiKey,
} from '../../shared/outreachAccess.ts';
import { createResendService, testResendConnection } from '../../shared/resendService.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const { action, ...params } = body;

    const { user, error } = await requireSystemOwner(base44);
    if (error) return error;

    switch (action) {
      case 'get': {
        const settings = await ensureSettings(base44);
        await logAudit(base44, user, 'settings.view', 'OutreachSettings', settings.id);
        return Response.json({ settings: sanitizeSettings(settings) });
      }

      case 'update': {
        const settings = await ensureSettings(base44);
        const updates = {};
        const fields = ['from_name', 'from_address', 'reply_to_address', 'tracking_subdomain',
          'physical_address', 'daily_send_limit', 'warmup_mode', 'notify_on_reply',
          'notification_email', 'open_tracking_enabled', 'click_tracking_enabled'];
        for (const f of fields) {
          if (params[f] !== undefined) updates[f] = params[f];
        }
        // Only update the API key if a new one is provided (not masked)
        if (params.resend_api_key && !params.resend_api_key.includes('****')) {
          updates.resend_api_key = params.resend_api_key;
        }
        // Start warmup clock if warmup_mode is being enabled
        if (params.warmup_mode === true && !settings.warmup_started_at) {
          updates.warmup_started_at = new Date().toISOString();
        }
        const updated = await base44.asServiceRole.entities.OutreachSettings.update(settings.id, updates);
        await logAudit(base44, user, 'settings.update', 'OutreachSettings', settings.id, { updates });
        return Response.json({ settings: sanitizeSettings(updated) });
      }

      case 'test_connection': {
        const settings = await ensureSettings(base44);
        const apiKey = settings.resend_api_key || secrets.get('RESEND_API_KEY');
        if (!apiKey) return Response.json({ error: 'No Resend API key configured' }, { status: 400 });
        const result = await testResendConnection(apiKey);
        await logAudit(base44, user, 'settings.test_connection', 'OutreachSettings', settings.id, { result });
        return Response.json(result);
      }

      case 'verify_domain': {
        const settings = await ensureSettings(base44);
        const apiKey = settings.resend_api_key || secrets.get('RESEND_API_KEY');
        if (!apiKey) return Response.json({ error: 'No Resend API key configured' }, { status: 400 });
        const domain = params.domain || settings.from_address?.split('@')?.[1];
        if (!domain) return Response.json({ error: 'No domain to verify' }, { status: 400 });
        const service = createResendService(apiKey);
        const domainInfo = await service.getDomainStatus(domain);
        const verified = domainInfo?.status === 'verified';
        if (verified) {
          await base44.asServiceRole.entities.OutreachSettings.update(settings.id, { domain_verified: true });
        }
        await logAudit(base44, user, 'settings.verify_domain', 'OutreachSettings', settings.id, { domain, verified });
        return Response.json({ domain: domainInfo, verified });
      }

      case 'add_suppression': {
        const email = (params.email || '').toLowerCase();
        if (!email) return Response.json({ error: 'Email required' }, { status: 400 });
        await addToSuppression(base44, email, params.reason || 'manual');
        await logAudit(base44, user, 'suppression.add', 'OutreachSettings', null, { email, reason: params.reason });
        const settings = await ensureSettings(base44);
        return Response.json({ settings: sanitizeSettings(settings) });
      }

      case 'remove_suppression': {
        const email = (params.email || '').toLowerCase();
        const settings = await ensureSettings(base44);
        const updated = await base44.asServiceRole.entities.OutreachSettings.update(settings.id, {
          suppression_list: (settings.suppression_list || []).filter(e => e !== email),
        });
        await logAudit(base44, user, 'suppression.remove', 'OutreachSettings', null, { email });
        return Response.json({ settings: sanitizeSettings(updated) });
      }

      case 'audit_log': {
        const { items } = await base44.asServiceRole.entities.OutreachAuditLog.filter(
          {}, { sort: '-created_date', limit: params.limit || 100 }
        );
        return Response.json({ items });
      }

      default:
        return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    console.error('outreach-settings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}