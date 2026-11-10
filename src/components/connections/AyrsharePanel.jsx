import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Megaphone, CheckCircle2, XCircle, Key, Save, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Per-club Ayrshare connection. Each club admin manages their own Ayrshare
// API key + linked social accounts from the Connections page — stored in
// ClubCredential, used by the marketing module to publish posts.
export default function AyrsharePanel({ connected, accounts = [], onSynced }) {
  const { toast } = useToast();
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(connected);

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("marketingAccounts", { action: "save_key", ayrshare_api_key: key });
      toast({ title: "Ayrshare key saved", description: "Sync your accounts to confirm the connection." });
      setKey("");
      setIsConnected(true);
    } catch (e) {
      toast({ title: "Save failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const { data } = await base44.functions.invoke("marketingAccounts", { action: "sync" });
      toast({ title: "Accounts synced", description: `${data.connected} connected account(s).` });
      onSynced?.();
    } catch (e) {
      toast({ title: "Sync failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally { setSyncing(false); }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6 text-rose-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-lg">Social Accounts (Ayrshare)</h3>
                <p className="text-sm text-slate-500">Publish marketing posts to your club's Instagram, Facebook, X, LinkedIn and TikTok.</p>
              </div>
              {isConnected ? (
                <Badge className="bg-emerald-100 text-emerald-700 shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" />Key Set</Badge>
              ) : (
                <Badge variant="outline" className="shrink-0"><XCircle className="w-3 h-3 mr-1" />Not Set</Badge>
              )}
            </div>

            {isConnected && accounts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((a) => (
                  <Badge key={a.platform} variant="secondary" className={a.status === "active" ? "" : "opacity-60"}>{a.platform}{a.account_handle ? ` @${a.account_handle}` : ""}</Badge>
                ))}
              </div>
            )}

            <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-start gap-2">
                <Key className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500">
                  Create an Ayrshare Business plan profile, link your social accounts in the{" "}
                  <a href="https://app.ayrshare.com/social-accounts" target="_blank" rel="noreferrer" className="text-rose-600 underline inline-flex items-center gap-0.5">Ayrshare dashboard <ExternalLink className="w-3 h-3" /></a>, then paste your API key here.
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ayrshare-key" className="text-xs">Ayrshare API Key</Label>
                <Input id="ayrshare-key" type="password" placeholder="urr_xxxxxxxx-xxxx-xxxx" value={key} onChange={(e) => setKey(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={save} disabled={saving || !key} size="sm" variant="outline">
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} Save key
                </Button>
                {isConnected && (
                  <Button onClick={sync} disabled={syncing} size="sm" variant="outline">
                    {syncing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />} Sync accounts
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}