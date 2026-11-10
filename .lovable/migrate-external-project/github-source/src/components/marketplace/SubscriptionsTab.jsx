import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trash2, CreditCard, Users, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function SubscriptionsTab({ clubId }) {
  const qc = useQueryClient();
  const [toggling, setToggling] = useState(null);

  const { data: duesOffers = [], isLoading } = useQuery({
    queryKey: ["duesOffers", clubId],
    queryFn: () => base44.entities.Offer.filter({ club_id: clubId, type: "dues" }, "sort_order", 200),
  });

  const handleToggle = async (o) => {
    setToggling(o.id);
    try {
      await base44.entities.Offer.update(o.id, { status: o.status === "active" ? "archived" : "active" });
      qc.invalidateQueries({ queryKey: ["duesOffers", clubId] });
      toast.success(o.status === "active" ? "Dues link archived" : "Dues link activated");
    } catch { toast.error("Could not update dues link"); }
    setToggling(null);
  };

  const handleDelete = async (o) => {
    if (!confirm(`Delete "${o.name}"?`)) return;
    try {
      await base44.entities.Offer.delete(o.id);
      qc.invalidateQueries({ queryKey: ["duesOffers", clubId] });
      toast.success("Dues link deleted");
    } catch { toast.error("Could not delete"); }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Yearly team dues links created from the Team Plans wizard.</p>
        <Link to="/TryoutDashboard">
          <Button size="sm" variant="outline">
            Go to Team Plans <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {duesOffers.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl">
          <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No team dues yet.</p>
          <p className="text-xs mt-1">Create a Team Plan in the Tryout Planner to generate dues links.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {duesOffers.map((o) => {
            const cfg = o.config || {};
            return (
              <Card key={o.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-slate-900">{o.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {cfg.team_name && <Badge variant="outline" className="text-xs"><Users className="w-3 h-3 mr-0.5" />{cfg.team_name}</Badge>}
                      {cfg.season && <Badge variant="outline" className="text-xs"><Calendar className="w-3 h-3 mr-0.5" />{cfg.season}</Badge>}
                      {cfg.amount > 0 && <Badge variant="outline" className="text-xs">${cfg.amount}/yr</Badge>}
                      {(cfg.payment_plans || []).map((pp) => (
                        <Badge key={pp} variant="secondary" className="text-xs">{pp.replace("_", " ")}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={o.status === "active" ? "default" : "secondary"} className="text-xs">{o.status}</Badge>
                    <Button size="sm" variant="outline" className="h-7" disabled={toggling === o.id} onClick={() => handleToggle(o)}>
                      {o.status === "active" ? "Archive" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-red-500" onClick={() => handleDelete(o)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}