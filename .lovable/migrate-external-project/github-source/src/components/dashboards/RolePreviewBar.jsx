import React, { useState, useEffect } from "react";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLES, ROLE_LABELS, isSystemOwner } from "@/lib/rbac";

const STORAGE_KEY = "base44_role_preview";
const PREVIEW_ROLES = [
  ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN,
  ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.PLATFORM_DIRECTOR, ROLES.BOOKKEEPER,
  ROLES.PROJECT_MANAGER, ROLES.COACH, ROLES.TEAM_MANAGER,
  ROLES.PARENT_GUARDIAN, ROLES.PLAYER,
];

export function getPreviewRole() {
  try { return sessionStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
}
export function setPreviewRole(role) {
  try {
    if (role) sessionStorage.setItem(STORAGE_KEY, role);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
export function clearPreviewRole() { setPreviewRole(null); }

export default function RolePreviewBar({ currentUser, onRolePreview }) {
  const [previewRole, setPreviewRoleState] = useState(() => getPreviewRole());

  useEffect(() => {
    onRolePreview?.(previewRole);
  }, [previewRole, onRolePreview]);

  const handleChange = (role) => {
    setPreviewRoleState(role);
    setPreviewRole(role);
  };

  const handleExit = () => {
    setPreviewRoleState(null);
    setPreviewRole(null);
  };

  // Available to the platform master admin role, and to system owners (full
  // cross-tenant access) who need to preview any club-scoped dashboard.
  if (!currentUser || (currentUser.custom_role !== ROLES.MASTER_ADMIN && !isSystemOwner(currentUser))) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-3 flex-wrap">
      <Eye className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
      <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wide">Use as</span>
      <Select value={previewRole || ""} onValueChange={handleChange}>
        <SelectTrigger className="h-8 w-52 text-xs">
          <SelectValue placeholder="Select a role to preview" />
        </SelectTrigger>
        <SelectContent>
          {PREVIEW_ROLES.map((r) => (
            <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {previewRole && (
        <Button size="sm" variant="outline" onClick={handleExit} className="h-8 text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900">
          <X className="w-3.5 h-3.5 mr-1" /> Exit Preview
        </Button>
      )}
      <span className="text-xs text-amber-700 dark:text-amber-400 ml-auto hidden sm:block">
        {previewRole ? `Previewing ${ROLE_LABELS[previewRole]} dashboard` : "Select a role to test that dashboard"}
      </span>
    </div>
  );
}