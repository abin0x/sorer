import { useState } from "react";
import { useNavigate } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ROLE_ONBOARD_PATH } from "@/lib/onboardingRoles";

/** Shared submit handler for role onboarding pages: saves the role's data, then
 * routes to the next pending role's onboarding page, or the dashboard if done.
 * Pass `redirectUrl` to override the default post-submit destination (e.g. to
 * send a club admin to the migration wizard instead of the dashboard). */
export function useOnboardingSubmit(role) {
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const submit = async (data, redirectUrl) => {
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("completeRoleOnboarding", { role, data });
      const nextRole = res.data?.nextRole;
      toast.success("Saved — welcome aboard!");
      if (redirectUrl) {
        navigate(redirectUrl);
      } else {
        navigate(nextRole ? ROLE_ONBOARD_PATH[nextRole] : '/home');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Failed to save — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting };
}