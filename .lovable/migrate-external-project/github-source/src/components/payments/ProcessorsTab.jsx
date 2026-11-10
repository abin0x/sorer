import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, Star, Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import ProcessorDialog from "./ProcessorDialog";

const TYPE_LABELS = {
  stripe: "Stripe", square: "Square", payment_depot: "Payment Depot", stax: "Stax", manual: "Manual / Other",
};

const STATUS_BADGE = {
  connected: { label: "Connected", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", icon: XCircle, className: "bg-rose-50 text-rose-700 border-rose-200" },
  untested: { label: "Untested", icon: MinusCircle, className: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function ProcessorsTab({ canManage }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: processors = [], isLoading } = useQuery({
    queryKey: ["payment-processors"],
    queryFn: () => base44.entities.PaymentProcessor.list("-created_date", 50),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["payment-processors"] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Connect the club to Stripe, Square, or Payment Depot. Add your API credentials below and use
          <span className="font-medium text-foreground"> Test Connection</span> to verify before going live.
          Credentials are stored securely and visible to admin staff only.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Add Processor
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : processors.length === 0 ? (
        <Card className="adisal-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">
          No payment processors configured yet. Add Stripe, Square, or Payment Depot to start collecting payments.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {processors.map((p) => {
            const status = STATUS_BADGE[p.connection_status] || STATUS_BADGE.untested;
            const StatusIcon = status.icon;
            const hasCreds = !!p.secret_key;
            return (
              <Card
                key={p.id}
                className={`adisal-card ${canManage ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
                onClick={() => canManage && (setEditing(p), setDialogOpen(true))}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><CreditCard className="w-4 h-4 text-primary" /></div>
                      <p className="font-semibold text-sm">{p.display_name}</p>
                    </div>
                    {p.is_default && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{TYPE_LABELS[p.processor_type] || p.processor_type}{p.account_label ? ` · ${p.account_label}` : ""}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={`text-[10px] capitalize ${p.environment === "live" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{p.environment}</Badge>
                    <Badge variant={p.is_active ? "default" : "outline"} className="text-[10px]">{p.is_active ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />{status.label}
                    </Badge>
                  </div>
                  {!hasCreds && p.processor_type !== "manual" && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">No API credentials set — click to add</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProcessorDialog open={dialogOpen} onOpenChange={setDialogOpen} processor={editing} onSaved={refresh} />
    </div>
  );
}