import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import RequirementCard from "@/components/compliance/RequirementCard";
import UploadDialog from "@/components/compliance/UploadDialog";
import ComplianceHistory from "@/components/compliance/ComplianceHistory";
import { REQUIREMENTS, asList, reqLabel } from "@/lib/compliance";

export default function CoachCompliance() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [uploadReq, setUploadReq] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["myCompliance", user?.club_id, user?.email],
    enabled: !!user?.club_id,
    queryFn: async () => {
      const [seasons, records] = await Promise.all([
        base44.entities.Season.filter({ club_id: user.club_id, status: "active" }, { limit: 1 }),
        base44.entities.ComplianceRecord.filter({ club_id: user.club_id, coach_email: user.email }, { sort: "-created_date", limit: 200 }),
      ]);
      return { season: asList(seasons)[0], records: asList(records) };
    },
  });

  if (!user || isLoading) return <div className="flex justify-center p-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  const { season, records = [] } = data || {};
  const current = records.filter((r) => r.season_id === season?.id);
  const past = records.filter((r) => r.season_id !== season?.id);

  const done = (reqType) => {
    setUploadReq(null);
    qc.invalidateQueries({ queryKey: ["myCompliance"] });
    toast({ title: "Submitted", description: `Your ${reqLabel(reqType)} certificate has been submitted and is awaiting admin review.` });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">My Compliance</h1>
          <p className="text-sm text-slate-500">{season ? `${season.name} season` : "No active season"}</p>
        </div>
      </div>
      {!season ? <p className="text-slate-500">Your club has no active season yet.</p> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {REQUIREMENTS.map((r) => (
            <RequirementCard key={r.key} requirement={r.key} record={current.find((x) => x.requirement_type === r.key)} onUpload={setUploadReq} />
          ))}
        </div>
      )}
      <ComplianceHistory records={past} />
      {uploadReq && (
        <UploadDialog open onOpenChange={(o) => !o && setUploadReq(null)} requirement={uploadReq}
          record={current.find((x) => x.requirement_type === uploadReq)} onDone={done} />
      )}
    </div>
  );
}