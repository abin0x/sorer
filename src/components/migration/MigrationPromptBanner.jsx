import React from "react";
import { useNavigate } from '@/lib/router-compat';
import { Button } from "@/components/ui/button";
import { UploadCloud, ArrowRight } from "lucide-react";

/**
 * Gradient banner shown to club directors/admins when their club has no data
 * (no teams or players) and no completed migration. Pushes them toward the
 * step-by-step MigrationWizard. Hidden on the wizard/setup pages themselves.
 */
export default function MigrationPromptBanner({ clubHasData, migrationJob, user, pathname }) {
  const navigate = useNavigate();
  if (!user?.club_id) return null;
  if (!["club_director", "club_admin"].includes(user?.custom_role)) return null;
  if (clubHasData !== false) return null;
  if (migrationJob?.status === "completed") return null;
  if (pathname.startsWith("/ClubSetupWizard") || pathname.startsWith("/MigrationWizard")) return null;

  const migrationStarted = !!migrationJob;

  return (
    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2.5 flex items-center gap-3">
      <UploadCloud className="w-5 h-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{migrationStarted ? "Continue your data migration" : "Bring your data into Club Rudder"}</p>
        <p className="text-xs text-white/80 leading-tight">{migrationStarted ? "Pick up where you left off — your migration is in progress." : "Your club has no teams or players yet. Use the step-by-step wizard to import them."}</p>
      </div>
      <Button size="sm" className="bg-white text-violet-700 hover:bg-white/90 shrink-0 gap-1.5" onClick={() => navigate("/MigrationWizard")}>
        {migrationStarted ? "Continue" : "Start Migration"} <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}