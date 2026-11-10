import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Plus, Pencil } from "lucide-react";
import { billingApi, money } from "@/lib/facilityBillingApi";
import BillingEntityDialog from "./BillingEntityDialog";

export default function BillingEntitiesTab() {
  const [dialog, setDialog] = useState({ open: false, entity: null });
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["facility-billing"],
    queryFn: () => billingApi({ action: "overview" }),
  });

  const entities = data?.entities || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Outside organizations that rent your fields. Invoices are addressed and emailed to each one.
        </p>
        <Button onClick={() => setDialog({ open: true, entity: null })}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : entities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Building2 className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              No billing organizations yet. Add the clubs and groups that rent your fields.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entities.map((entity) => (
            <Card key={entity.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{entity.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{entity.contact_email}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setDialog({ open: true, entity })}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Rate {money(entity.default_hourly_rate)}/hr</span>
                  <span>{entity.payment_terms_days ?? 30} day terms</span>
                  {entity.contact_name && <span>{entity.contact_name}</span>}
                  {entity.status === "inactive" && <span className="text-status-warning-700">Inactive</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BillingEntityDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, entity: open ? dialog.entity : null })}
        entity={dialog.entity}
        onSaved={refetch}
      />
    </div>
  );
}