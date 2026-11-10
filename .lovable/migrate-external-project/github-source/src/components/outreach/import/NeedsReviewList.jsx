import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NeedsReviewList({ refreshKey }) {
  const [items, setItems] = useState([]);

  const load = async () => {
    const res = await base44.entities.Prospect.filter({ needs_review: true }, { sort: "-created_date", limit: 50 });
    setItems(Array.isArray(res) ? res : (res?.items || []));
  };
  useEffect(() => { load(); }, [refreshKey]);

  const approve = async (p) => {
    await base44.functions.invoke("outreach-prospects", { action: "update", id: p.id, needs_review: false, email_verified: true });
    load();
  };

  if (!items.length) return null;
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-slate-900">Needs Review ({items.length})</h3>
        <p className="text-xs text-slate-500">Role-based or unverified addresses. They are excluded from all sends until you approve them.</p>
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 text-sm border-t border-slate-100 pt-2">
            <span className="truncate">{p.first_name} {p.last_name} · {p.email} · {p.club_name}</span>
            <Button size="sm" variant="outline" onClick={() => approve(p)}>Approve</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}