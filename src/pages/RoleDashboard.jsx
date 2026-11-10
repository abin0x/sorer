import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import ClubAdminDashboard from "@/components/dashboards/ClubAdminDashboard";
import ClubDirectorDashboard from "@/components/dashboards/ClubDirectorDashboard";
import BranchDirectorDashboard from "@/components/dashboards/BranchDirectorDashboard";
import CoachDashboard from "@/components/dashboards/CoachDashboard";
import PlayerDashboard from "@/components/dashboards/PlayerDashboard";
import FamilyTeamDashboard from "@/components/dashboards/FamilyTeamDashboard";
import BookkeeperDashboard from "@/components/dashboards/BookkeeperDashboard";
import ProjectManagerDashboard from "@/components/dashboards/ProjectManagerDashboard";
import PlatformDirectorDashboard from "@/components/dashboards/PlatformDirectorDashboard";
import RolePreviewBar from "@/components/dashboards/RolePreviewBar";
import ClubSwitcher from "@/components/branding/ClubSwitcher";
import { ROLES } from "@/lib/rbac";
import { personasFor } from "@/lib/gameDay";

const PERSONA_LABELS = { admin: "Admin", coach: "Coach", member: "Member" };

export default function RoleDashboard() {
  const [previewRole, setPreviewRole] = useState(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user-dashboard"],
    queryFn: () => base44.auth.me(),
  });

  const { data: links } = useQuery({
    queryKey: ["persona-links", user?.email], enabled: !!user?.email,
    queryFn: async () => {
      const [c, g] = await Promise.all([
        base44.entities.Coach.filter({ email: user.email }).catch(() => []),
        base44.entities.Guardian.filter({ email: user.email }).catch(() => []),
      ]);
      return { isCoach: c.length > 0, isGuardian: g.length > 0 };
    },
  });
  const [persona, setPersonaState] = useState(() => (typeof window === "undefined" ? null : localStorage.getItem("cr-persona")));
  const setPersona = (p) => { setPersonaState(p); localStorage.setItem("cr-persona", p); };
  const handlePreviewChange = useCallback((role) => setPreviewRole(role), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-action" />
      </div>
    );
  }

  const personas = personasFor(user, links || {});
  const activePersona = personas.includes(persona) ? persona : personas[0];
  const personaRole = personas.length > 1 && activePersona !== personas[0]
    ? (activePersona === "coach" ? ROLES.COACH : activePersona === "member" ? ROLES.PARENT_GUARDIAN : null) : null;
  const effectiveRole = previewRole || personaRole || user?.custom_role;
  const previewUser = previewRole || personaRole ? { ...user, custom_role: previewRole || personaRole } : user;

  const renderDashboard = (role, u) => {
    if (role === ROLES.CLUB_DIRECTOR) return <ClubDirectorDashboard user={u} />;
    if (role === ROLES.PLATFORM_DIRECTOR) return <PlatformDirectorDashboard user={u} />;
    if (role === ROLES.BRANCH_DIRECTOR) return <BranchDirectorDashboard user={u} />;
    // Club Admin gets the redesigned task-first dashboard
    if (role === ROLES.CLUB_ADMIN) return <ClubAdminDashboard user={u} />;
    // Merged Admin + Master Admin + Branch Admin
    if (role === ROLES.MASTER_ADMIN || role === ROLES.ADMIN || role === ROLES.BRANCH_ADMIN) return <AdminDashboard user={u} />;
    if (role === ROLES.BOOKKEEPER) return <BookkeeperDashboard user={u} />;
    if (role === ROLES.PROJECT_MANAGER) return <ProjectManagerDashboard user={u} />;
    if (role === ROLES.COACH) return <CoachDashboard user={u} />;
    // Unified Parent + Team Manager dashboard (identical layout; team manager can edit events)
    if (role === ROLES.TEAM_MANAGER || role === ROLES.PARENT_GUARDIAN) return <FamilyTeamDashboard user={u} />;
    if (role === ROLES.PLAYER) return <PlayerDashboard user={u} />;
    return <AdminDashboard user={u} />;
  };

  return (
    <div>
      <RolePreviewBar currentUser={user} onRolePreview={handlePreviewChange} />
      {personas.length > 1 && !previewRole && (
        <div className="sticky top-0 z-10 flex justify-center bg-background/90 px-4 py-2 backdrop-blur">
          <div role="tablist" aria-label="View as" className="inline-flex rounded-full border bg-muted p-1">
            {personas.map((p) => (
              <button key={p} role="tab" aria-selected={activePersona === p} onClick={() => setPersona(p)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${activePersona === p ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                {PERSONA_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      )}

      {renderDashboard(effectiveRole, previewUser)}
    </div>
  );
}