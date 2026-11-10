import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { apiError, billingApi } from "@/lib/facilityBillingApi";

export default function StripeSettingsCard() {
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["facility-billing-stripe"],
    queryFn: () => billingApi({ action: "stripe_status" }),
  });
  const stripe = data?.stripe;

  const save = async () => {
    if (!secret.trim()) return toast.error("Paste the signing secret from Stripe first.");
    setSaving(true);
    try {
      await billingApi({ action: "save_webhook_secret", webhook_secret: secret.trim() });
      toast.success("Stripe endpoint secret saved.");
      setSecret("");
      refetch();
    } catch (error) {
      toast.error(apiError(error, "Could not save that secret."));
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(stripe?.webhook_url || "");
      toast.success("Endpoint URL copied.");
    } catch {
      toast.error("Could not copy — select the URL and copy it manually.");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <p className="font-semibold">Card payments</p>
            {stripe?.secret_key_set ? (
              <Badge className="bg-status-success-50 text-status-success-700 gap-1">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-status-warning-50 text-status-warning-700">Not connected</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {stripe?.secret_key_set
              ? stripe.own_account
                ? "Card payments use your club's own Stripe account, so money settles with you. Invoices can be paid by card from the portal and recorded automatically."
                : "Card payments use the app's Stripe connection. Invoices can be paid by card and the payment is recorded automatically. Connect the club's own Stripe account in Connections to settle money directly with the club."
              : "Connect Stripe in Connections to let organizations pay invoices by card. Rentals can still be invoiced and paid by check, cash or ACH."}
          </p>
          <div>
            <Label className="text-xs">Endpoint URL for Stripe</Label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={stripe?.webhook_url || ""} className="font-mono text-xs" />
              <Button variant="outline" onClick={copy}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In Stripe, add an endpoint for <span className="font-medium">checkout.session.completed</span> and{" "}
              <span className="font-medium">invoice.paid</span> using this URL.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="font-semibold">Stripe signing secret</p>
            <p className="text-sm text-muted-foreground mt-1">
              {stripe?.own_webhook_secret_set
                ? "Your club's own endpoint secret is in use — every event is verified before an invoice is marked paid."
                : "Every event is verified before an invoice is marked paid. If the app's Stripe connection is used, that verification is already covered. Paste your own endpoint secret only when this club has its own Stripe endpoint."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <Label className="text-xs">Signing secret (whsec_…)</Label>
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="whsec_..."
                className="font-mono text-xs"
              />
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save secret"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}