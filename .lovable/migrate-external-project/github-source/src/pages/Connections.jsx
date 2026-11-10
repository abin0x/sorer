import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Link2, CheckCircle2, XCircle, CreditCard, BookOpen, ShieldAlert, RefreshCw, Unlink, Eye, EyeOff, Key, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLES } from "@/lib/rbac";
import ResendDomainPanel from "@/components/connections/ResendDomainPanel";
import GoogleMapsPanel from "@/components/connections/GoogleMapsPanel";
import GoogleCalendarPanel from "@/components/connections/GoogleCalendarPanel";
import AyrsharePanel from "@/components/connections/AyrsharePanel";
import { useModuleAccess } from '@/lib/useModuleAccess';

const ALLOWED_ROLES = [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN];

export default function Connections() {
  const { toast } = useToast();
  const { hasModule } = useModuleAccess();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [club, setClub] = useState(null);
  const [qbConnection, setQbConnection] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [qbBusy, setQbBusy] = useState(false);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  // Credential form state
  const [qbClientId, setQbClientId] = useState("");
  const [qbClientSecret, setQbClientSecret] = useState("");
  const [qbSaving, setQbSaving] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [stripePubKey, setStripePubKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [stripeSaving, setStripeSaving] = useState(false);
  const [showQbSecret, setShowQbSecret] = useState(false);
  const [showStripeKey, setShowStripeKey] = useState(false);

  // Google Maps + Google Calendar (per-tenant integrations)
  const [gmapsConnected, setGmapsConnected] = useState(false);
  const [gcalStatus, setGcalStatus] = useState(null);
  // Ayrshare social accounts (per-tenant marketing)
  const [ayrshareConnected, setAyrshareConnected] = useState(false);
  const [ayrshareAccounts, setAyrshareAccounts] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      if (!u?.club_id) { setLoading(false); return; }
      const c = await base44.entities.Club.get(u.club_id);
      setClub(c);
      try {
        const qbRes = await base44.functions.invoke("quickbooks-connection-status", {});
        setQbConnection(qbRes.data?.connected ? qbRes.data : null);
      } catch { setQbConnection(null); }
      try {
        const res = await base44.functions.invoke("stripe-account-status", {});
        setStripeStatus(res.data);
      } catch { setStripeStatus({ connected: false }); }
      // Load per-tenant Google Maps + Ayrshare keys from ClubCredential
      try {
        const credPage = await base44.entities.ClubCredential.filter({ club_id: u.club_id }, { limit: 1 });
        const cred = credPage?.items?.[0] || credPage?.[0];
        if (cred?.google_maps_api_key) setGmapsConnected(true);
        if (cred?.ayrshare_api_key) setAyrshareConnected(true);
      } catch { /* ignore */ }
      try {
        const accPage = await base44.entities.SocialAccount.filter({ club_id: u.club_id }, { limit: 20 });
        setAyrshareAccounts(accPage?.items || []);
      } catch { /* ignore */ }
      // Load Google Calendar connection status (APP_USER)
      try {
        const gcalRes = await base44.functions.invoke("google-calendar-status", {});
        setGcalStatus(gcalRes.data);
      } catch { setGcalStatus({ connected: false }); }
    } catch (e) {
      toast({ title: "Failed to load", description: e?.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === "qb-connected") load();
      if (event.data?.type === "stripe-connected") load();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const saveQbCredentials = async () => {
    if (!qbClientId || !qbClientSecret) {
      toast({ title: "Missing fields", description: "QuickBooks Client ID and Secret are both required.", variant: "destructive" });
      return;
    }
    setQbSaving(true);
    try {
      await base44.functions.invoke("saveQuickBooksCredentials", { clientId: qbClientId, clientSecret: qbClientSecret });
      toast({ title: "QuickBooks credentials saved", description: "You can now connect your QuickBooks account." });
      setQbClientId("");
      setQbClientSecret("");
    } catch (e) {
      toast({ title: "Save failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally { setQbSaving(false); }
  };

  const connectQB = async () => {
    setQbBusy(true);
    try {
      const res = await base44.functions.invoke("quickbooks-oauth-initiate", {});
      const authUrl = res.data?.authUrl;
      if (!authUrl) throw new Error(res.data?.error || "No auth URL returned");
      window.open(authUrl, "_blank", "width=600,height=700");
    } catch (e) {
      toast({ title: "QuickBooks connect failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally { setQbBusy(false); }
  };

  const disconnectQB = async () => {
    if (!window.confirm("Disconnect QuickBooks? You'll need to reconnect to sync payments again.")) return;
    setQbBusy(true);
    try {
      await base44.functions.invoke("disconnectQuickBooks", {});
      toast({ title: "QuickBooks disconnected" });
      load();
    } catch (e) {
      toast({ title: "Disconnect failed", description: e?.message, variant: "destructive" });
    } finally { setQbBusy(false); }
  };

  const saveStripeCredentials = async () => {
    if (!stripeKey || !stripeKey.startsWith("sk_")) {
      toast({ title: "Invalid key", description: "Stripe Secret Key must start with sk_", variant: "destructive" });
      return;
    }
    setStripeSaving(true);
    try {
      const res = await base44.functions.invoke("saveStripeCredentials", { secretKey: stripeKey, publishableKey: stripePubKey, webhookSecret: stripeWebhookSecret });
      toast({ title: "Stripe connected!", description: res.data?.email ? `Account: ${res.data.email}` : "Account validated." });
      setStripeKey("");
      setStripePubKey("");
      setStripeWebhookSecret("");
      load();
    } catch (e) {
      toast({ title: "Stripe connection failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally { setStripeSaving(false); }
  };

  const disconnectStripe = async () => {
    if (!window.confirm("Disconnect Stripe? Your club will need to re-enter credentials to accept payments.")) return;
    setStripeBusy(true);
    try {
      await base44.functions.invoke("disconnectStripe", {});
      toast({ title: "Stripe disconnected" });
      load();
    } catch (e) {
      toast({ title: "Disconnect failed", description: e?.message, variant: "destructive" });
    } finally { setStripeBusy(false); }
  };

  const syncNow = async () => {
    setSyncBusy(true);
    try {
      const res = await base44.functions.invoke("syncToQuickBooks", {});
      const { synced = 0, failed = 0 } = res.data || {};
      toast({ title: "Sync complete", description: `${synced} synced, ${failed} failed.` });
    } catch (e) {
      toast({ title: "Sync failed", description: e?.message, variant: "destructive" });
    } finally { setSyncBusy(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  const role = user?.custom_role;
  const isSuperAdmin = user?.is_super_admin === true || user?.role === "admin";
  if (!isSuperAdmin && !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="font-bold text-lg">Access Restricted</h2>
        <p className="text-sm text-slate-500">Only Club Directors and Admins can manage connections. Contact your club administrator if you need access.</p>
      </div>
    );
  }

  if (!user?.club_id) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="font-bold text-lg">No Club Assigned</h2>
        <p className="text-sm text-slate-500">Your account isn't linked to a club yet. Ask a platform admin to assign you to a club first.</p>
      </div>
    );
  }

  const qbConnected = qbConnection?.connected;
  const stripeConnected = stripeStatus?.connected;
  const qbNeedsCredentials = !qbConnected;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Connections</h1>
        <p className="text-slate-500 text-sm">Connect your club's financial and payment accounts. Credentials are encrypted and isolated to <b>{club?.name}</b>.</p>
      </div>

      {/* QuickBooks */}
      {hasModule('payments') && <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-lg">QuickBooks Online</h3>
                  <p className="text-sm text-slate-500">Sync invoices, payments, and expenses with your QuickBooks company.</p>
                </div>
                {qbConnected ? (
                  <Badge className="bg-emerald-100 text-emerald-700 shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0"><XCircle className="w-3 h-3 mr-1" />Not Connected</Badge>
                )}
              </div>

              {qbConnected && qbConnection && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 space-y-0.5">
                  <p>Connected by <b>{qbConnection.connected_by || "admin"}</b></p>
                  <p className="text-xs text-slate-400">Realm ID: {qbConnection.realm_id}</p>
                  {qbConnection.status === "expired" && (
                    <p className="text-xs text-amber-600">⚠ Your QuickBooks connection has expired. Please reconnect QuickBooks.</p>
                  )}
                </div>
              )}

              {qbNeedsCredentials && (
                <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-start gap-2">
                    <Key className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500">
                      Enter your QuickBooks app credentials from the <a href="https://developer.intuit.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline">Intuit Developer Portal</a>. The redirect URL for your app is: <code className="text-xs bg-slate-100 px-1 rounded">{window.location.origin}/api/functions/quickbooks-oauth-callback</code>
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="qb-client-id" className="text-xs">Client ID</Label>
                      <Input id="qb-client-id" placeholder="AB123456789..." value={qbClientId} onChange={(e) => setQbClientId(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="qb-client-secret" className="text-xs">Client Secret</Label>
                      <div className="relative">
                        <Input id="qb-client-secret" type={showQbSecret ? "text" : "password"} placeholder="••••••••••••" value={qbClientSecret} onChange={(e) => setQbClientSecret(e.target.value)} />
                        <button type="button" onClick={() => setShowQbSecret(!showQbSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showQbSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button onClick={saveQbCredentials} disabled={qbSaving} size="sm" variant="outline">
                    {qbSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Save Credentials
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {!qbConnected && (
                  <Button onClick={connectQB} disabled={qbBusy} className="bg-emerald-600 hover:bg-emerald-700">
                    {qbBusy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Link2 className="w-4 h-4 mr-1.5" />}
                    Connect QuickBooks Online
                  </Button>
                )}
                {qbConnected && (
                  <>
                    <Button onClick={syncNow} disabled={syncBusy} variant="outline">
                      {syncBusy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                      Sync Now
                    </Button>
                    <Button onClick={disconnectQB} disabled={qbBusy} variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Unlink className="w-4 h-4 mr-1.5" />
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>}

      {/* Stripe */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-lg">Stripe Payments</h3>
                  <p className="text-sm text-slate-500">Accept payments directly to your own Stripe account.</p>
                </div>
                {stripeConnected ? (
                  <Badge className="bg-emerald-100 text-emerald-700 shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0"><XCircle className="w-3 h-3 mr-1" />Not Connected</Badge>
                )}
              </div>

              {stripeConnected && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 space-y-0.5">
                  {stripeStatus.email && <p>Account: <b>{stripeStatus.email}</b></p>}
                  {stripeStatus.business_name && <p className="text-xs text-slate-400">{stripeStatus.business_name}</p>}
                  <p className="text-xs text-slate-400">Account ID: {stripeStatus.account_id}</p>
                  {stripeStatus.charges_enabled && <p className="text-xs text-emerald-600">✓ Charges enabled</p>}
                  {!stripeStatus.details_submitted && <p className="text-xs text-amber-600">⚠ Onboarding incomplete</p>}
                </div>
              )}

              {stripeStatus?.error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{stripeStatus.error}</p>
                </div>
              )}

              {!stripeConnected && (
                <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-start gap-2">
                    <Key className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500">
                      Enter your Stripe Secret Key from the <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Stripe Dashboard → API Keys</a>. Use <code className="text-xs bg-slate-100 px-1 rounded">sk_live_...</code> for production or <code className="text-xs bg-slate-100 px-1 rounded">sk_test_...</code> for test mode.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="stripe-secret" className="text-xs">Secret Key</Label>
                      <div className="relative">
                        <Input id="stripe-secret" type={showStripeKey ? "text" : "password"} placeholder="sk_live_..." value={stripeKey} onChange={(e) => setStripeKey(e.target.value)} />
                        <button type="button" onClick={() => setShowStripeKey(!showStripeKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showStripeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="stripe-pub" className="text-xs">Publishable Key (optional)</Label>
                      <Input id="stripe-pub" placeholder="pk_live_..." value={stripePubKey} onChange={(e) => setStripePubKey(e.target.value)} />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="stripe-whsec" className="text-xs">Webhook Signing Secret (whsec_...)</Label>
                      <Input id="stripe-whsec" placeholder="whsec_..." value={stripeWebhookSecret} onChange={(e) => setStripeWebhookSecret(e.target.value)} />
                      <p className="text-xs text-slate-500">
                        Create a webhook endpoint in your Stripe Dashboard → Developers → Webhooks, listening for <code className="text-xs bg-slate-100 px-1 rounded">checkout.session.completed</code>, pointing to:
                        {" "}<code className="text-xs bg-slate-100 px-1 rounded break-all">{window.location.origin}/api/functions/club-stripe-webhook?club_id={user?.club_id}</code>. Paste the signing secret it gives you here — this is what confirms registration and event payments automatically.
                      </p>
                    </div>
                  </div>
                  <Button onClick={saveStripeCredentials} disabled={stripeSaving} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    {stripeSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Save & Validate
                  </Button>
                </div>
              )}

              {stripeConnected && (
                <Button onClick={disconnectStripe} disabled={stripeBusy} variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Unlink className="w-4 h-4 mr-1.5" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resend Email Domain */}
      {hasModule('communication') && <ResendDomainPanel club={club} />}

      {/* Google Maps API Key — per-tenant */}
      <GoogleMapsPanel connected={gmapsConnected} />

      {/* Google Calendar — per-tenant (APP_USER) */}
      <GoogleCalendarPanel status={gcalStatus} onRefresh={load} />

      {/* Ayrshare social accounts — per-tenant marketing */}
      {hasModule('branding') && <AyrsharePanel connected={ayrshareConnected} accounts={ayrshareAccounts} onSynced={load} />}
    </div>
  );
}