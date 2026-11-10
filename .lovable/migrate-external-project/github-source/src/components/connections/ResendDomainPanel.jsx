import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, CheckCircle2, XCircle, RefreshCw, Globe, Copy, Key, Eye, EyeOff, Save, AlertTriangle } from "lucide-react";

export default function ResendDomainPanel({ club }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [domainInput, setDomainInput] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

  // API key form
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyBusy, setApiKeyBusy] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("resend-domain-status", {});
      setStatus(res.data);
      // If status loaded without the "API key not configured" error, a key exists
      const hasKey = !res.data?.error || (res.data?.setup !== false && !res.data?.error?.includes('API key'));
      setHasApiKey(res.data?.setup === true || hasKey);
    } catch {
      setStatus({ setup: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveApiKey = async () => {
    if (!apiKeyInput || !apiKeyInput.startsWith("re_")) {
      toast({ title: "Invalid key", description: "Resend API key must start with re_", variant: "destructive" });
      return;
    }
    setApiKeyBusy(true);
    try {
      await base44.functions.invoke("saveResendApiKey", { apiKey: apiKeyInput });
      toast({ title: "Resend API key saved", description: "You can now register your sending domain." });
      setApiKeyInput("");
      setHasApiKey(true);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally { setApiKeyBusy(false); }
  };

  const handleSetup = async () => {
    if (!domainInput) { toast({ title: "Enter a domain name", variant: "destructive" }); return; }
    setSetupBusy(true);
    try {
      const res = await base44.functions.invoke("resend-domain-setup", { domainName: domainInput });
      toast({ title: "Domain registered", description: "Add the DNS records below, then click Verify." });
      setStatus({ setup: true, domainName: domainInput, status: "pending", records: res.data?.records || [] });
    } catch (e) {
      toast({ title: "Setup failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally { setSetupBusy(false); }
  };

  const handleVerify = async () => {
    setVerifyBusy(true);
    try {
      const res = await base44.functions.invoke("resend-domain-verify", {});
      const newStatus = res.data?.status;
      setStatus((s) => ({ ...s, status: newStatus, records: res.data?.records || s?.records }));
      if (newStatus === "verified") {
        toast({ title: "Domain verified!", description: "You can now send email from this domain." });
      } else {
        toast({ title: "Verification pending", description: "DNS records not found yet. Check your DNS configuration and try again.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Verify failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally { setVerifyBusy(false); }
  };

  const copyRecord = (value) => {
    navigator.clipboard.writeText(value);
    toast({ title: "Copied to clipboard" });
  };

  const isVerified = status?.status === "verified";
  const isSetup = status?.setup;
  const needsApiKey = !hasApiKey && !isSetup;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6 text-rose-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-lg">Resend Email Domain</h3>
                <p className="text-sm text-slate-500">Connect your club's Resend.com API key and sending subdomain for branded email.</p>
              </div>
              {isVerified ? (
                <Badge className="bg-emerald-100 text-emerald-700 shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>
              ) : isSetup ? (
                <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0"><Globe className="w-3 h-3 mr-1" />Pending</Badge>
              ) : hasApiKey ? (
                <Badge variant="outline" className="shrink-0"><Globe className="w-3 h-3 mr-1" />No Domain</Badge>
              ) : (
                <Badge variant="outline" className="shrink-0"><XCircle className="w-3 h-3 mr-1" />No API Key</Badge>
              )}
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            )}

            {status?.error && !needsApiKey && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{status.error}</p>
              </div>
            )}

            {/* API Key Entry */}
            {needsApiKey && !loading && (
              <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div className="flex items-start gap-2">
                  <Key className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500">
                    Enter your Resend.com API key from the <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-rose-600 underline">Resend Dashboard → API Keys</a>. Each club uses its own API key.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="resend-api-key" className="text-xs">Resend API Key</Label>
                  <div className="relative">
                    <Input
                      id="resend-api-key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="re_..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={saveApiKey} disabled={apiKeyBusy} size="sm" className="bg-rose-600 hover:bg-rose-700">
                  {apiKeyBusy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Save API Key
                </Button>
              </div>
            )}

            {/* Domain Registration */}
            {!loading && hasApiKey && !isSetup && (
              <div className="space-y-2">
                <Label htmlFor="resend-domain">Sending Domain (e.g. mail.yourclub.com)</Label>
                <div className="flex gap-2">
                  <Input
                    id="resend-domain"
                    placeholder="mail.yourclub.com"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                  />
                  <Button onClick={handleSetup} disabled={setupBusy} className="bg-rose-600 hover:bg-rose-700 shrink-0">
                    {setupBusy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Globe className="w-4 h-4 mr-1.5" />}
                    Register Domain
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Use a subdomain of your club's domain (e.g. mail.yourclub.com). You'll need DNS access to add the records below.
                </p>
              </div>
            )}

            {/* Domain Status + DNS Records */}
            {!loading && isSetup && (
              <>
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <p>Domain: <b>{status.domainName}</b></p>
                </div>

                {status.records?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">DNS Records to Add</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {status.records.map((rec, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <Badge variant="outline" className="shrink-0 font-mono">{rec.record || rec.type}</Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-slate-600 truncate">{rec.name} → {rec.value}</p>
                          </div>
                          <button onClick={() => copyRecord(rec.value)} className="p-1 rounded hover:bg-slate-200 shrink-0">
                            <Copy className="w-3 h-3 text-slate-500" />
                          </button>
                          {rec.status === "verified" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isVerified && (
                  <Button onClick={handleVerify} disabled={verifyBusy} variant="outline">
                    {verifyBusy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                    Verify Domain
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}