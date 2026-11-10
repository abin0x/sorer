import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Ban, Clock, AlertTriangle } from "lucide-react";
import { MODULE_STATUS_LABELS, MODULE_STATUS_COLORS } from "@/lib/moduleAccess";
import EntitlementTimeline from "@/components/modules/EntitlementTimeline";
import {
  GrantComplimentaryDialog,
  RevokeDialog,
  ExtendGraceDialog,
} from "@/components/modules/ModuleActionDialogs";

export default function TenantModulesDrawer({ club, open, onOpenChange }) {
  const qc = useQueryClient();
  const [grantModule, setGrantModule] = useState(null);
  const [revokeModule, setRevokeModule] = useState(null);
  const [graceModule, setGraceModule] = useState(null);

  const { data: catalog = [] } = useQuery({
    queryKey: ["moduleCatalog"],
    queryFn: () => base44.entities.ModuleCatalog.list("sort_order", 50),
  });

  const { data: tenantModules = [], isLoading } = useQuery({
    queryKey: ["tenantModules", club?.id],
    queryFn: () => base44.entities.TenantModule.filter({ club_id: club?.id }, "-created_date", 200),
    enabled: !!club?.id,
  });

  if (!club) return null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tenantModules"] });
    qc.invalidateQueries({ queryKey: ["entitlementEvents"] });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{club.name} — Module Access</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Modules list */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Module Entitlements</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : tenantModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No module entitlements. Grant complimentary access below.</p>
            ) : (
              <div className="space-y-2">
                {tenantModules.map((mod) => {
                  const cat = catalog.find((c) => c.key === mod.module_key);
                  return (
                    <div key={mod.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{cat?.name || mod.module_key}</p>
                          <p className="text-xs text-muted-foreground">{mod.module_key}</p>
                        </div>
                        <Badge className={`text-xs ${MODULE_STATUS_COLORS[mod.status] || ""}`}>
                          {MODULE_STATUS_LABELS[mod.status] || mod.status}
                        </Badge>
                      </div>

                      {mod.drift_flagged && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {mod.drift_detail || "Drift detected"}
                        </div>
                      )}

                      {mod.grace_ends_at && mod.status === "past_due" && (
                        <p className="text-xs text-muted-foreground">
                          Grace ends: {new Date(mod.grace_ends_at).toLocaleDateString()}
                        </p>
                      )}
                      {mod.access_ends_at && mod.status === "canceling" && (
                        <p className="text-xs text-muted-foreground">
                          Access ends: {new Date(mod.access_ends_at).toLocaleDateString()}
                        </p>
                      )}
                      {mod.complimentary_expires_at && mod.status === "complimentary" && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(mod.complimentary_expires_at).toLocaleDateString()}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setGrantModule(mod.module_key)}>
                          <Gift className="w-3.5 h-3.5 mr-1" /> Grant
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRevokeModule(mod.module_key)}>
                          <Ban className="w-3.5 h-3.5 mr-1" /> Revoke
                        </Button>
                        {mod.status === "past_due" && (
                          <Button size="sm" variant="outline" onClick={() => setGraceModule(mod.module_key)}>
                            <Clock className="w-3.5 h-3.5 mr-1" /> Extend Grace
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grant from catalog */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Grant New Module</h3>
            <div className="flex flex-wrap gap-2">
              {catalog.filter((c) => c.is_active).map((cat) => (
                <Button key={cat.key} size="sm" variant="outline" onClick={() => setGrantModule(cat.key)}>
                  <Gift className="w-3.5 h-3.5 mr-1" /> {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Audit timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Audit Timeline</h3>
            <EntitlementTimeline clubId={club.id} />
          </div>
        </div>
      </SheetContent>

      {grantModule && (
        <GrantComplimentaryDialog
          open={!!grantModule}
          onOpenChange={(v) => { if (!v) setGrantModule(null); }}
          clubId={club.id}
          moduleKey={grantModule}
          moduleLabel={catalog.find((c) => c.key === grantModule)?.name}
          onDone={refresh}
        />
      )}
      {revokeModule && (
        <RevokeDialog
          open={!!revokeModule}
          onOpenChange={(v) => { if (!v) setRevokeModule(null); }}
          clubId={club.id}
          moduleKey={revokeModule}
          moduleLabel={catalog.find((c) => c.key === revokeModule)?.name}
          onDone={refresh}
        />
      )}
      {graceModule && (
        <ExtendGraceDialog
          open={!!graceModule}
          onOpenChange={(v) => { if (!v) setGraceModule(null); }}
          clubId={club.id}
          moduleKey={graceModule}
          moduleLabel={catalog.find((c) => c.key === graceModule)?.name}
          currentGraceEnds={tenantModules.find((m) => m.module_key === graceModule)?.grace_ends_at}
          onDone={refresh}
        />
      )}
    </Sheet>
  );
}