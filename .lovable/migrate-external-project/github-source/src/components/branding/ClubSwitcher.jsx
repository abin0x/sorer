import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ROLE_ONBOARD_PATH } from '@/lib/onboardingRoles';

/**
 * ClubSwitcher — shown on the dashboard when a user belongs to more than
 * one club. Switching clubs updates the user's club_id + custom_role (via
 * auth.updateMe) and reloads so the dashboard, navigation, and data all
 * re-scope to the selected club.
 */
export default function ClubSwitcher() {
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);

  const { data: { clubs = [] } = {}, isLoading } = useQuery({
    queryKey: ["user-clubs"],
    queryFn: async () => {
      const res = await base44.functions.invoke("get-user-clubs");
      return res.data;
    },
  });

  if (isLoading || clubs.length < 2) return null;

  const current = clubs.find((c) => c.is_current) || clubs[0];

  const handleSwitch = async (clubId) => {
    if (clubId === current.club_id) return;
    const target = clubs.find((c) => c.club_id === clubId);
    if (!target) return;
    setSwitching(true);
    try {
      const { data } = await base44.functions.invoke('switchClub', { club_id: target.club_id });
      sessionStorage.removeItem('viewingTenant');
      sessionStorage.setItem('club-choice-user', (await base44.auth.me()).id);
      window.location.href = ROLE_ONBOARD_PATH[data.pendingOnboarding?.[0]] || '/home';
    } catch (e) {
      toast.error(e.message || "Failed to switch clubs");
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
      <Building2 className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Active Club</p>
        <Select value={current.club_id} onValueChange={handleSwitch} disabled={switching}>
          <SelectTrigger className="h-8 text-sm font-semibold border-0 bg-transparent p-0 shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {clubs.map((c) => (
              <SelectItem key={c.club_id} value={c.club_id}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: c.primary_color }}
                  />
                  {c.club_name}
                  {c.is_current && (
                    <span className="text-xs text-muted-foreground ml-1">(current)</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {switching && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
      )}
    </div>
  );
}