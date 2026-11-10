import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { apiError, money, portalApi } from "@/lib/facilityBillingApi";
import InvoiceStatusBadge from "@/components/billing/InvoiceStatusBadge";

/**
 * The invoice portal for an outside organization. Its billing contact signs in with the
 * app's normal sign-in (a one-time code by email) and only ever sees that organization's
 * own invoices.
 */
export default function BillingPortal() {
  const [state, setState] = useState({ loading: true, signedIn: false, data: null });
  const [paying, setPaying] = useState("");

  const load = useCallback(async () => {
    const signedIn = await base44.auth.isAuthenticated();
    if (!signedIn) {
      setState({ loading: false, signedIn: false, data: null });
      return;
    }
    const data = await portalApi({ action: "my_invoices" });
    setState({ loading: false, signedIn: true, data });
  }, []);

  useEffect(() => {
    load().catch(() => setState({ loading: false, signedIn: false, data: null }));
  }, [load]);

  // Coming back from a card payment — record it even if the Stripe webhook is delayed.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get("invoice");
    if (params.get("paid") !== "1" || !invoiceId || !state.signedIn) return;
    portalApi({ action: "sync_stripe_payment", invoice_id: invoiceId })
      .then((res) => {
        if (res?.paid) {
          toast.success("Payment received — thank you.");
          load();
        }
      })
      .catch(() => {});
  }, [state.signedIn, load]);

  const payNow = async (invoice) => {
    setPaying(invoice.id);
    try {
      const res = await portalApi({ action: "create_checkout", invoice_id: invoice.id });
      if (res?.url) window.location.href = res.url;
      else toast.error(res?.error || "Card payment is not available right now.");
    } catch (error) {
      toast.error(apiError(error, "Card payment is not available right now."));
    } finally {
      setPaying("");
    }
  };

  if (state.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-surface-page">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const invoices = state.data?.invoices || [];

  return (
    <div className="min-h-screen bg-surface-page p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Field rental invoices</h1>
          <p className="text-sm text-muted-foreground">
            {state.signedIn && state.data?.entity
              ? `${state.data.entity.name} — invoice history and payments.`
              : "Sign in to see your organization's invoices."}
          </p>
        </div>

        {!state.signedIn ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Use the email address that receives your invoices. You will get a one-time code to sign in.
              </p>
              <Button onClick={() => base44.auth.redirectToLogin("/MyInvoices")}>Sign in</Button>
            </CardContent>
          </Card>
        ) : state.data?.linked === false ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No invoices are linked to this email address yet. Ask the facility to add this address as your billing
                contact.
              </p>
            </CardContent>
          </Card>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">You have no invoices right now.</p>
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      Invoice {invoice.invoice_number}
                      <span className="ml-2 align-middle">
                        <InvoiceStatusBadge status={invoice.status} />
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.period_label || ""} · issued {invoice.issue_date || "—"} · due {invoice.due_date || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{money(invoice.total, invoice.currency)}</p>
                    {Number(invoice.balance) > 0 && (
                      <p className="text-xs text-muted-foreground">{money(invoice.balance, invoice.currency)} due</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border divide-y divide-border">
                  {invoice.lines.map((line) => (
                    <div key={line.id} className="px-3 py-2 flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">
                          {line.booking_date} · {line.field_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {line.details}
                          {line.hours ? ` · ${line.hours} hrs` : ""}
                        </p>
                      </div>
                      <span className="whitespace-nowrap">{money(line.amount, invoice.currency)}</span>
                    </div>
                  ))}
                  {invoice.lines.length === 0 && (
                    <p className="px-3 py-3 text-sm text-muted-foreground">No bookings on this invoice.</p>
                  )}
                </div>

                {Number(invoice.balance) > 0 ? (
                  <Button onClick={() => payNow(invoice)} disabled={paying === invoice.id}>
                    {paying === invoice.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-1" /> Pay {money(invoice.balance, invoice.currency)} by card
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="text-sm text-status-success-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Paid in full
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}

        <p className="text-xs text-muted-foreground text-center">
          Questions about an invoice? Reply to the email it arrived on.
        </p>
      </div>
    </div>
  );
}