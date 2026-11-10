import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const LEADER_ROLES = ["master_admin", "admin", "club_director", "club_admin", "marketing_director"];
export const canManageMarketing = (user) => user?.role === "admin" || !!user?.system_role || LEADER_ROLES.includes(user?.custom_role);

export function useMarketingData(clubId) {
  const settingsQ = useQuery({
    queryKey: ["mkt-settings", clubId],
    enabled: !!clubId,
    queryFn: async () => (await base44.entities.MarketingSettings.filter({ club_id: clubId }, { limit: 1 })).items[0] || null,
  });
  const accountsQ = useQuery({
    queryKey: ["mkt-accounts", clubId],
    enabled: !!clubId,
    queryFn: async () => (await base44.entities.SocialAccount.filter({ club_id: clubId }, { limit: 20 })).items,
  });
  const templatesQ = useQuery({
    queryKey: ["mkt-templates", clubId],
    enabled: !!clubId,
    queryFn: async () => (await base44.entities.PostTemplate.filter({ club_id: clubId }, { sort: "-created_date", limit: 100 })).items,
  });
  const accounts = accountsQ.data || [];
  return {
    settings: settingsQ.data,
    accounts,
    templates: templatesQ.data || [],
    connectedPlatforms: accounts.filter((a) => a.status === "active").map((a) => a.platform),
  };
}