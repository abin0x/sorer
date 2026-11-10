import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, RefreshCw, ExternalLink, Copy, CreditCard } from "lucide-react";
import { toast } from "sonner";

const WEBHOOK_URL = "https://club-rudder-os.base44.app/functions/module-webhook";

export default function StripeConnectionCard() {
  const [status, setStatus] = useState(null); // null = not tested yet
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const test = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("test-platform-stripe", {});
      setStatus(res.data);
    } catch (e) {
      setStatus({ connected: false, error: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { test(); }, []);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Webhook URL copied");
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="w-5 h-5 text-primary" />
          Platform Stripe Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your platform Stripe account receives tenant subscription payments, independently of tenant payment accounts. Create or sign in to your Stripe account below. Linking a different account requires replacing the platform STRIPE_SECRET_KEY in the app dashboard’s Secrets, not tenant Settings.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button asChild><a href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer">Create Stripe account <ExternalLink /></a></Button>
          <Button asChild variant="outline"><a href="https://dashboard.stripe.com/login" target="_blank" rel="noreferrer">Sign in to Stripe <ExternalLink /></a></Button>
        </div>
        <p className="text-xs text-muted-foreground">Signing in to Stripe does not automatically link that account to this app. The check below identifies the account actually used by platform billing.</p>
        {/* Status row */}
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : status?.connected ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{status.ready_for_live_payments ? 'Live account verified · charges enabled' : status.live_mode ? 'Live account · charges not enabled' : 'Test / sandbox account only · no real payments'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {status.account_name} · {status.account_id}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-xs">
                  {status.country} · {status.default_currency?.toUpperCase()}
                </Badge>
                {status.charges_enabled ? (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">Charges on</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 text-xs">Charges off</Badge>
                )}
              </div>
            </>
          ) : status ? (
            <>
              <XCircle className="w-5 h-5 text-rose-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-rose-700">Not connected</p>
                <p className="text-xs text-muted-foreground">{status.error}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
              <p className="text-sm text-muted-foreground flex-1">Not tested yet</p>
            </>
          )}
          <Button variant="outline" size="sm" onClick={test} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Verify connection
          </Button>
        </div>

        {status?.connected && <p className="text-xs text-muted-foreground">Payouts: {status.payouts_enabled ? 'Enabled' : 'Not enabled'}. Last checked: {new Date(status.checked_at).toLocaleString()}. This verifies account access, not a completed payment or webhook delivery.</p>}
        {/* Webhook URL */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Webhook Endpoint (register in Stripe)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-card border border-border rounded px-2 py-1.5 truncate">
              {WEBHOOK_URL}
            </code>
            <Button variant="ghost" size="icon" onClick={copyWebhookUrl} title="Copy">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Subscribe to <code>invoice.paid</code>, <code>customer.subscription.updated</code>,{" "}
            <code>customer.subscription.deleted</code>, and{" "}
            <code>invoice.payment_failed</code>. Use the signing secret as{" "}
            <code className="text-xs bg-card px-1 py-0.5 rounded">MODULE_STRIPE_WEBHOOK_SECRET</code>.
          </p>
        </div>

        <a
          href="https://dashboard.stripe.com/webhooks"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"
        >
          Open Stripe webhook settings <ExternalLink className="w-3 h-3" />
        </a>
      </CardContent>
    </Card>
  );
}