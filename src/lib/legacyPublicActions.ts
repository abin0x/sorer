// Actions that must work for signed-out visitors (public tryout signup pages).
// Final-registration invites are opened from an emailed link; the invite id is the family's key.
// echelon-complete is keyed by the order id and only marks paid after the gateway confirms the sale.
// getInvitationDetails is keyed by an unguessable invitation token so new invitees can open their link before signing up.
const PUBLIC_ACTIONS = new Set(["tryoutPublic", "tryout-registration", "getFinalRegistrationInvite", "submitFinalRegistration", "get-dues-offer", "getInvitationDetails", "echelon-complete"]);
// Actions where only specific sub-actions are public (the handler re-checks sign-in for the rest).
const PUBLIC_SUB_ACTIONS: Record<string, string[]> = { "tryout-offers": ["family", "respond"] };
export function isPublicLegacyAction(name: string, payload: unknown) {
  if (PUBLIC_ACTIONS.has(name)) return true;
  if (name === 'create-offer-checkout') {
    const items = payload && typeof payload === 'object' ? (payload as Record<string, unknown>)['items'] : undefined;
    return Array.isArray(items) && items.length > 0 && items.length <= 10 && items.every(item => item && typeof item === 'object' && item.type === 'dues');
  }
  const action = payload && typeof payload === "object" ? (payload as Record<string, unknown>)["action"] : undefined;
  if (typeof action === "string" && (PUBLIC_SUB_ACTIONS[name] || []).includes(action)) return true;
  // Paying a tryout final-registration invite from the emailed link (no sign-in).
  const sourceType = payload && typeof payload === "object" ? (payload as Record<string, unknown>)["source_type"] : undefined;
  return (name === "create-club-checkout" || name === "create-setup-intent") && sourceType === "tryout_final_registration";
}

