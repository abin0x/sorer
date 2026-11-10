import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeftRight, AlertCircle, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Prominent banner shown at the top of the system console whenever one or
// more migrations are waiting for a specialist. This is the critical
// "a human needs to look at this" signal — it must be impossible to miss.

export default function MigrationsReviewBanner({ onOpenMigrations }) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await base44.functions.invoke("migrationRequests", { action: "list" });
      const reviewJobs = (data.jobs || []).filter((j) => j.status === "support_review");
      setJobs(reviewJobs);
    } catch (e) {
      // Silently fail — system owners without permission just don't see the banner.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading || jobs.length === 0) return null;

  return (
    <button
      onClick={onOpenMigrations}
      className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-shadow text-left"
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-sm">
          {jobs.length} migration{jobs.length === 1 ? "" : "s"} waiting for specialist review
        </p>
        <p className="text-xs text-white/90 truncate">
          {jobs.map((j) => j.club_name).filter(Boolean).join(", ")}
        </p>
      </div>
      <div className="flex items-center gap-1 text-sm font-bold shrink-0">
        Review now <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
}