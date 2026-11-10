export type PaymentProvider = 'stripe' | 'echelon';
export const PAYMENT_PROVIDERS: PaymentProvider[] = ['stripe', 'echelon'];

/**
 * Picks which processor a club's checkout uses: the club's own choice if that
 * account is connected, else the app-wide default if connected, else whichever
 * one is connected. Returns null when neither is connected.
 */
export function resolvePaymentProvider(
  clubPreferred: string | null | undefined,
  platformDefault: string | null | undefined,
  connected: Iterable<string>,
): PaymentProvider | null {
  const ok = new Set(connected);
  for (const p of [clubPreferred, platformDefault, ...PAYMENT_PROVIDERS]) {
    if (p && (PAYMENT_PROVIDERS as string[]).includes(p) && ok.has(p)) return p as PaymentProvider;
  }
  return null;
}

/** Echelon gateway security keys are 32 alphanumeric characters. */
export const isEchelonKey = (v: string) => /^[A-Za-z0-9]{32}$/.test(v);
