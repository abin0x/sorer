import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const call = (action, payload = {}) =>
  base44.functions.invoke("journey-action", { action, ...payload }).then((r) => r.data);

/** Loads the club's journey (server-side, so it resumes on any device) and exposes saves. */
export function useJourney() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["setupJourney"], queryFn: () => call("open"), staleTime: 0 });
  const mutation = useMutation({
    mutationFn: ({ action, ...payload }) => call(action, payload),
    onSuccess: (data) => { if (data?.journey) qc.setQueryData(["setupJourney"], data); },
  });
  return {
    journey: query.data?.journey,
    club: query.data?.club,
    canEdit: query.data?.can_edit,
    isLoading: query.isLoading,
    error: query.error,
    save: mutation.mutateAsync,
    saving: mutation.isPending,
  };
}

export const fetchMembers = () => call("members").then((d) => d.members || []);