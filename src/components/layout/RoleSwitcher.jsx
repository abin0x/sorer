import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Repeat } from "lucide-react";
import { ROLE_LABELS } from "@/lib/rbac";

/** Shown only when the user has more than one active role — lets them switch context. */
export default function RoleSwitcher({ user }) {
  const { data: activeRoles = [] } = useQuery({
    queryKey: ["activeUserRoles", user?.id],
    queryFn: () => base44.entities.UserRoles.filter({ user_id: user.id, status: "active" }).catch(() => []),
    enabled: !!user?.id,
  });

  if (activeRoles.length < 2) return null;

  const handleSwitch = async (role) => {
    if (role === user.custom_role) return;
    await base44.auth.updateMe({ custom_role: role });
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1.5 px-1">
      <Repeat className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <Select value={user.custom_role} onValueChange={handleSwitch}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Switch role" />
        </SelectTrigger>
        <SelectContent>
          {activeRoles.map((r) => (
            <SelectItem key={r.id} value={r.role} className="text-xs">
              {r.role_label || ROLE_LABELS[r.role] || r.role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}