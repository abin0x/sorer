import React, { useEffect, useState } from 'react';
import { Building2, Users, GitBranch, Box, CreditCard, BookOpen, Mail, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

// Shows the full tenant context for a ticket: club name, plan, modules,
// branches, player count, Stripe/QuickBooks/email connection status,
// migration status, and recent failed payments or sync errors.
// Only called for system agents.
export default function TenantContextPanel({ clubId }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    base44.functions.invoke('ticket-tenant-context', { club_id: clubId })
      .then(res => setContext(res.data.context))
      .catch(() => setContext(null))
      .finally(() => setLoading(false));
  }, [clubId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!context) {
    return <p className="text-sm text-muted-foreground text-center py-4">Unable to load tenant context.</p>;
  }

  const conn = context.connections || {};

  return (
    <div className="space-y-3 text-sm">
      {/* Club header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Building2 className="w-4 h-4 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{context.club?.name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{context.club?.slug || 'no-slug'}</p>
        </div>
        <Badge variant="outline" className="text-xs capitalize">{context.club?.subscription_plan || 'free'}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <GitBranch className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="font-bold">{context.branch_count}</p>
          <p className="text-xs text-muted-foreground">Branches</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="font-bold">{context.player_count}</p>
          <p className="text-xs text-muted-foreground">Players</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <Box className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="font-bold">{context.module_count}</p>
          <p className="text-xs text-muted-foreground">Modules</p>
        </div>
      </div>

      {/* Active modules */}
      {context.active_modules?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Active Modules</p>
          <div className="flex flex-wrap gap-1">
            {context.active_modules.map(m => (
              <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Connection status */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Connections</p>
        <div className="space-y-1">
          <ConnectionRow icon={CreditCard} label="Stripe" connected={conn.stripe?.connected} extra={conn.stripe?.has_webhook_secret ? 'webhook ✓' : 'no webhook'} />
          <ConnectionRow icon={BookOpen} label="QuickBooks" connected={conn.quickbooks?.connected} />
          <ConnectionRow icon={Mail} label="Resend Email" connected={conn.resend_email?.connected} />
          <ConnectionRow icon={Box} label="Ayrshare Social" connected={conn.ayrshare?.connected} />
        </div>
      </div>

      {/* Migration status */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Migration</p>
        <Badge variant="outline" className="text-xs capitalize">{context.migration?.status || 'none'}</Badge>
      </div>

      {/* Recent failures */}
      {(context.recent_failures?.payments?.length > 0 || context.recent_failures?.webhook_errors?.length > 0) && (
        <div>
          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Recent Failures
          </p>
          {context.recent_failures.payments.map((p, i) => (
            <div key={i} className="text-xs text-muted-foreground border-l-2 border-red-300 pl-2 mb-1">
              Payment {p.status}: {p.description || '$' + (p.amount || 0)} — {new Date(p.date).toLocaleDateString()}
            </div>
          ))}
          {context.recent_failures.webhook_errors.map((w, i) => (
            <div key={i} className="text-xs text-muted-foreground border-l-2 border-red-300 pl-2 mb-1">
              Webhook {w.event_type}: {w.error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionRow({ icon: Icon, label, connected, extra }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {connected ? (
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3 h-3" /> {extra || 'connected'}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground">
          <XCircle className="w-3 h-3" /> not connected
        </span>
      )}
    </div>
  );
}