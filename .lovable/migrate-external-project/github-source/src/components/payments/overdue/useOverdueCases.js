import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";

/**
 * The club's overdue-payment resolution queue. Loading the query also refreshes
 * the cases from the payment ledger (sync), so the queue always reflects what is
 * actually late, and any payment recorded elsewhere closes its case.
 *
 * Shared query key: the Payments page tab and the bookkeeper dashboard widget
 * use the same data and trigger a single sync.
 */
export default function useOverdueCases() {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["overdue-cases", clubId],
    queryFn: async () => {
      const res = await base44.functions.invoke("overdue-payments", {
        action: "sync",
        club_id: clubId || undefined,
      });
      return res.data;
    },
    enabled: !!clubId,
    staleTime: 60 * 1000,
  });

  const runAction = async (action, payload) => {
    const res = await base44.functions.invoke("overdue-payments", {
      action,
      club_id: clubId || undefined,
      ...payload,
    });
    await queryClient.invalidateQueries({ queryKey: ["overdue-cases", clubId] });
    await queryClient.invalidateQueries({ queryKey: ["payments-ledger", clubId] });
    return res.data;
  };

  return {
    clubId,
    cases: query.data?.cases || [],
    summary: query.data?.summary || null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    runAction,
  };
}