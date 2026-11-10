import React, { useEffect, useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ExternalLink, Link2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from '@/lib/router-compat';
import { COMPOSER_PLATFORMS, PLATFORMS } from "@/lib/marketing/constants";
import { useMarketingData } from "@/lib/marketing/useMarketingData";
import HashtagEditor from "./HashtagEditor";

export default function SettingsTab({ clubId, canEdit }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { settings, accounts } = useMarketingData(clubId);
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ require_approval: false, brand_voice: "", default_hashtags: [], utm_enabled: true });

  useEffect(() => { if (settings) setForm({ require_approval: !!settings.require_approval, brand_voice: settings.brand_voice || "", default_hashtags: settings.default_hashtags || [], utm_enabled: settings.utm_enabled !== false }); }, [settings?.id]);

  if (!canEdit) return <p className="text-sm text-muted-foreground">Only club admins and directors can manage marketing settings.</p>;

  const saveSettings = async () => {
    setBusy("settings");
    if (settings?.id) await base44.entities.MarketingSettings.update(settings.id, form);
    else await base44.entities.MarketingSettings.create({ ...form, club_id: clubId });
    qc.invalidateQueries({ queryKey: ["mkt-settings"] });
    toast({ title: "Settings saved" });
    setBusy("");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card><CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Social accounts</h3>
            <p className="text-sm text-muted-foreground">Connect your club's Instagram, Facebook, X, LinkedIn and TikTok accounts through Ayrshare.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/Connections"><Link2 className="w-3.5 h-3.5 mr-1.5" />Manage in Connections</Link></Button>
        </div>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" disabled={busy === "sync"} onClick={async () => { setBusy("sync"); try { await base44.functions.invoke("marketingAccounts", { action: "sync" }); qc.invalidateQueries({ queryKey: ["mkt-accounts"] }); toast({ title: "Accounts synced" }); } catch (e) { toast({ title: "Sync failed", description: e?.message, variant: "destructive" }); } setBusy(""); }}>
            {busy === "sync" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />} Sync accounts
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {COMPOSER_PLATFORMS.map((p) => {
            const a = accounts.find((x) => x.platform === p);
            const daysLeft = a?.token_expires_at ? differenceInDays(parseISO(a.token_expires_at), new Date()) : null;
            const expiring = daysLeft !== null && daysLeft <= 7;
            const expired = a?.status === "expired" || a?.status === "revoked" || (daysLeft !== null && daysLeft < 0);
            return (
              <div key={p} className={`flex items-start gap-2 p-3 rounded-lg border ${expired ? "border-rose-300 bg-rose-50/50" : expiring ? "border-amber-300 bg-amber-50/50" : ""}`}>
                <span className={`w-2.5 h-2.5 rounded-full mt-1 ${PLATFORMS[p].dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{PLATFORMS[p].label}</p>
                  <p className="text-xs text-muted-foreground truncate">{a ? `Connected${a.account_handle ? ` as @${a.account_handle}` : ""}` : "Not connected"}</p>
                  {a?.last_post_at && <p className="text-[11px] text-muted-foreground">Last post {format(parseISO(a.last_post_at), "MMM d")}</p>}
                  {expiring && !expired && (
                    <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" />Token expires in {daysLeft}d</p>
                  )}
                  {expired && (
                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" />Token expired — reconnect needed</p>
                  )}
                </div>
                {a && !expired && !expiring && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1" />}
                {(expired || expiring) && <Button asChild size="sm" variant="outline" className="h-7 text-xs"><Link to="/Connections">Reconnect</Link></Button>}
              </div>
            );
          })}
        </div>
        {accounts.length === 0 && <p className="text-xs text-muted-foreground">No accounts connected yet. Add your Ayrshare API key in Connections to get started.</p>}
      </CardContent></Card>

      <Card><CardContent className="p-5 space-y-4">
        <h3 className="font-semibold">Preferences</h3>
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-medium">Require approval before posting</p><p className="text-xs text-muted-foreground">Posts from non-admins wait in "pending approval" until a club leader approves them.</p></div>
          <Switch checked={form.require_approval} onCheckedChange={(v) => setForm({ ...form, require_approval: v })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-medium">Add UTM tracking to links</p><p className="text-xs text-muted-foreground">Appends utm_source, utm_medium and utm_campaign to registration links.</p></div>
          <Switch checked={form.utm_enabled} onCheckedChange={(v) => setForm({ ...form, utm_enabled: v })} />
        </div>
        <div><Label className="text-xs">Club voice notes</Label><Textarea rows={3} value={form.brand_voice} onChange={(e) => setForm({ ...form, brand_voice: e.target.value })} placeholder="e.g. Warm, family-first, celebrate effort over wins" /></div>
        <div><Label className="text-xs">Default hashtags</Label><HashtagEditor value={form.default_hashtags} onChange={(v) => setForm({ ...form, default_hashtags: v })} /></div>
        <Button onClick={saveSettings} disabled={!!busy}>{busy === "settings" && <Loader2 className="w-4 h-4 animate-spin" />} Save preferences</Button>
      </CardContent></Card>
    </div>
  );
}