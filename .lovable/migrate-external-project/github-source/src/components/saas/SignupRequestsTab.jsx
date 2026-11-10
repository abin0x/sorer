import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox } from "lucide-react";
import ProvisionClubPanel from "@/components/saas/signup/ProvisionClubPanel";

const STATUS_META = {
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700" },
  provisioned: { label: "Provisioned", color: "bg-emerald-100 text-emerald-700" },
  expired: { label: "Expired", color: "bg-slate-100 text-slate-500" },
};

export default function SignupRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.ClubSignupRequest.list("-created_date", 200);
      setRequests(list);
      const firstPending = list.find((r) => r.status === "pending");
      if (!selectedId) setSelectedId(firstPending?.id || list[0]?.id || null);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const selected = requests.find((r) => r.id === selectedId);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardContent className="p-4">
        {requests.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">
            <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No signup requests yet.
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,320px)_1fr] gap-4">
            <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
              {requests.map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META.pending;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      r.id === selectedId ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{r.club_name}</span>
                      <Badge className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{r.contact_name} · {r.contact_email}</p>
                  </button>
                );
              })}
            </div>
            <div className="border-l border-slate-100 pl-4 lg:pl-6">
              {selected ? (
                selected.status === "pending" ? (
                  <ProvisionClubPanel request={selected} onProvisioned={load} />
                ) : (
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">{selected.club_name}</h3>
                    <Badge className={STATUS_META[selected.status]?.color}>{STATUS_META[selected.status]?.label}</Badge>
                    <p className="text-sm text-slate-500 mt-2">
                      {selected.status === "provisioned" ? "This club has been provisioned and the invitation was sent." : "This request is no longer actionable."}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-16 text-sm text-slate-400">Select a request to review.</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}