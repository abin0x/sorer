import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, RefreshCw, ExternalLink, Book, Link2 } from "lucide-react";
import { toast } from "sonner";

const CALLBACK_URL = "https://club-rudder-os.base44.app/functions/platform-qbo-callback";

export default function QuickBooksConnectionCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const test = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("test-platform-quickbooks", {});
      setStatus(res.data);
    } catch {
      setStatus({ connected: false, error: "Failed to reach test function" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-test on mount
  useEffect(() => {
    test();
  }, []);

  // Listen for OAuth callback popup message
  useEffect(() => {
    const handler = (e) => {
      if (e.origin !== window.location.origin) return; // only our own OAuth popup may signal
      if (e.data?.type === "platform-qbo-connected") {
        if (e.data.success) {
          toast.success("QuickBooks connected successfully");
        } else {
          toast.error("QuickBooks connection failed");
        }
        setConnecting(false);
        test();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      const res = await base44.functions.invoke("platform-qbo-initiate", {});
      if (res.data?.error) {
        toast.error(res.data.error);
        setConnecting(false);
        return;
      }
      window.open(res.data.authUrl, "_blank", "width=600,height=700");
    } catch {
      toast.error("Failed to start QuickBooks connection");
      setConnecting(false);
    }
  };

  const connected = status?.connected;
  const credentialsSet = status?.credentials_set !== false;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Book className="w-5 h-5 text-primary" />
          Platform QuickBooks Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect your QuickBooks account at the platform level so tenant payments
          sync to your books. Set{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">QUICKBOOKS_CLIENT_ID</code>{" "}
          and{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">QUICKBOOKS_CLIENT_SECRET</code>{" "}
          in{" "}
          <a href="/Settings" className="text-primary underline hover:text-primary/80">
            Settings → Secrets
          </a>
          .
        </p>

        {/* Status row */}
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : connected ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-700">Connected</p>
                <p className="text-xs text-muted-foreground truncate">
                  Realm: {status.realm_id}
                  {status.connected_by ? ` · by ${status.connected_by}` : ""}
                </p>
              </div>
              {status.status === "expired" && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">Token expired — reconnect</Badge>
              )}
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-rose-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-rose-700">
                  {credentialsSet ? "Not connected" : "Credentials missing"}
                </p>
                <p className="text-xs text-muted-foreground">{status?.error || "Click Connect to authorize."}</p>
              </div>
            </>
          )}
          <Button variant="outline" size="sm" onClick={test} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Test
          </Button>
        </div>

        {/* Connect / Reconnect button */}
        <Button
          onClick={connect}
          disabled={connecting || !credentialsSet}
          className="w-full gap-2"
        >
          {connecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          {connected ? "Reconnect QuickBooks" : "Connect QuickBooks"}
        </Button>

        {/* Callback URL */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Redirect URL (add to your Intuit app)
          </p>
          <code className="block text-xs bg-card border border-border rounded px-2 py-1.5 break-all">
            {CALLBACK_URL}
          </code>
          <p className="text-xs text-muted-foreground">
            In your{" "}
            <a
              href="https://developer.intuit.com/app/developer/myapps"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline inline-flex items-center gap-0.5"
            >
              Intuit Developer portal <ExternalLink className="w-3 h-3" />
            </a>
            , add this URL under your app's Redirect URIs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}