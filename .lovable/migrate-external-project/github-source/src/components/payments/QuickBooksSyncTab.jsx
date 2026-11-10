import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, UploadCloud, DownloadCloud, AlertCircle, CheckCircle2, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";

export default function QuickBooksSyncTab({ canManage }) {
  const [busy, setBusy] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [pullResult, setPullResult] = useState(null);
  const [connected, setConnected] = useState(null); // null = unknown, true/false
  const [checking, setChecking] = useState(false);

  const [connecting, setConnecting] = useState(false);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const res = await base44.functions.invoke("syncFromQuickBooks", { entity_type: "customers" });
      setConnected(true);
      setPullResult(res.data);
    } catch (e) {
      setConnected(false);
      const msg = e?.response?.data?.error || e.message || "";
      if (msg.includes("not connected") || msg.includes("not authorized") || msg.includes("connector") || msg.includes("not associated")) {
        // expected when not connected
      } else {
        toast.error("QuickBooks check failed: " + msg);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await base44.functions.invoke("quickbooks-oauth-initiate", {});
      const authUrl = res.data?.authUrl;
      if (!authUrl) throw new Error("No authorization URL returned");
      const popup = window.open(authUrl, "_blank", "width=600,height=700");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          checkConnection();
        }
      }, 800);
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      toast.error("QuickBooks connect failed: " + msg);
    } finally {
      setConnecting(false);
    }
  };

  React.useEffect(() => {
    checkConnection();
    // Listen for the postMessage from the OAuth callback popup
    const handler = (event) => {
      if (event.data?.type === "qb-connected") {
        checkConnection();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleSyncUp = async () => {
    setBusy("up");
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke("syncToQuickBooks", {});
      setSyncResult(res.data);
      if (res.data?.success) {
        toast.success(`Synced ${res.data.synced} payment(s) to QuickBooks${res.data.failed ? `, ${res.data.failed} failed` : ""}`);
      } else {
        toast.error(res.data?.error || "Sync failed");
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      toast.error("Sync failed: " + msg);
      setSyncResult({ error: msg });
    } finally {
      setBusy(null);
    }
  };

  const handlePull = async (entityType) => {
    setBusy("pull-" + entityType);
    setPullResult(null);
    try {
      const res = await base44.functions.invoke("syncFromQuickBooks", { entity_type: entityType });
      setPullResult(res.data);
      toast.success(`Pulled ${res.data?.count || 0} ${entityType} from QuickBooks`);
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      toast.error("Pull failed: " + msg);
    } finally {
      setBusy(null);
    }
  };

  const notConnected = connected === false;

  return (
    <div className="space-y-4">
      {/* Connection status banner */}
      <Card className={`adisal-card ${notConnected ? "border-amber-200 bg-amber-50/50" : connected ? "border-emerald-200 bg-emerald-50/40" : ""}`}>
        <CardContent className="p-4 flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notConnected ? "bg-amber-100" : "bg-emerald-100"}`}>
            {checking ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : connected ? <Link2 className="w-5 h-5 text-emerald-600" /> : <Unlink className="w-5 h-5 text-amber-600" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{checking ? "Checking QuickBooks connection…" : connected ? "QuickBooks Connected" : "QuickBooks Not Connected"}</p>
              {connected && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Active</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {connected
                ? "Two-way sync is ready. Push recorded payments to QuickBooks as invoices, or pull customers and accounts back."
                : "An admin must connect the QuickBooks connector before syncing. Once connected, payments flow to QuickBooks automatically."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={checkConnection} disabled={checking} className="rounded-xl shrink-0">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Recheck
          </Button>
        </CardContent>
      </Card>

      {notConnected && (
        <Card className="adisal-card border-blue-200 bg-blue-50/40">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm space-y-2 flex-1">
              <p className="font-medium text-blue-900">Connect your club's QuickBooks</p>
              <p className="text-xs text-blue-700">
                Each club connects its own QuickBooks Online company. Click below to authorize — you'll be redirected to Intuit to sign in and choose your company.
              </p>
              <Button onClick={handleConnect} disabled={connecting || !canManage} size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                {connecting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5 mr-1.5" />}
                Connect QuickBooks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="adisal-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><UploadCloud className="w-4 h-4 text-primary" /></div>
              <div>
                <p className="font-semibold text-sm">Push to QuickBooks</p>
                <p className="text-xs text-muted-foreground">Create invoices for paid payments not yet synced</p>
              </div>
            </div>
            <Button onClick={handleSyncUp} disabled={busy === "up" || !canManage || notConnected} className="w-full bg-primary hover:bg-primary/90 rounded-xl">
              {busy === "up" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Sync Paid Payments
            </Button>
            {syncResult && (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{syncResult.synced || 0} synced · {syncResult.skipped || 0} skipped · {syncResult.failed || 0} failed</span>
                </div>
                {syncResult.results?.filter((r) => r.status === "failed").slice(0, 3).map((r, i) => (
                  <p key={i} className="text-rose-600 truncate">Failed: {r.error}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="adisal-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><DownloadCloud className="w-4 h-4 text-primary" /></div>
              <div>
                <p className="font-semibold text-sm">Pull from QuickBooks</p>
                <p className="text-xs text-muted-foreground">Refresh customers, accounts, or invoices</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" disabled={busy === "pull-customers" || notConnected} onClick={() => handlePull("customers")} className="rounded-xl">
                {busy === "pull-customers" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Customers"}
              </Button>
              <Button variant="outline" size="sm" disabled={busy === "pull-accounts" || notConnected} onClick={() => handlePull("accounts")} className="rounded-xl">
                {busy === "pull-accounts" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Accounts"}
              </Button>
              <Button variant="outline" size="sm" disabled={busy === "pull-invoices" || notConnected} onClick={() => handlePull("invoices")} className="rounded-xl">
                {busy === "pull-invoices" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Invoices"}
              </Button>
            </div>
            {pullResult && (
              <p className="text-xs text-muted-foreground">Last pull: {pullResult.count} {pullResult.entity_type}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pulled data preview */}
      {pullResult?.data?.length > 0 && (
        <Card className="adisal-card">
          <CardContent className="p-4">
            <p className="font-semibold text-sm mb-2 capitalize">{pullResult.entity_type} from QuickBooks ({pullResult.count})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-muted-foreground">
                    {Object.keys(pullResult.data[0]).slice(0, 5).map((k) => (
                      <th key={k} className="py-1.5 px-2 font-medium">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pullResult.data.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      {Object.values(row).slice(0, 5).map((v, j) => (
                        <td key={j} className="py-1.5 px-2 truncate max-w-[180px]">{String(v ?? "—")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}