// Always-on CA auto-renewal consent for every Base, combo and sport unlock checkout session (live and test).
// No env flag. If Stripe rejects consent_collection, fail closed: no session is created.
export const ARL_CONSENT = { terms_of_service: "required" as const };
export const CONSENT_UNAVAILABLE_STATUS = 503;
export const CONSENT_UNAVAILABLE_MESSAGE = "Checkout is temporarily unavailable. Please try again later.";
export class ArlConsentUnavailableError extends Error {}
export function isMissingTermsUrlError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? "").toLowerCase();
  return msg.includes("terms of service");
}
// deno-lint-ignore no-explicit-any
type CreateFn<P, S> = (params: P & { consent_collection: typeof ARL_CONSENT; custom_text: any }) => Promise<S>;
/** Creates the session with the consent box and disclosure. Never retries without consent. */
export async function createConsentSession<P extends object, S>(
  create: CreateFn<P, S>, params: P, disclosure: string, consentText: string,
): Promise<S> {
  try {
    return await create({
      ...params,
      consent_collection: ARL_CONSENT,
      custom_text: {
        submit: { message: `**${disclosure}**` },
        terms_of_service_acceptance: { message: consentText },
      },
    });
  } catch (e) {
    if (isMissingTermsUrlError(e)) throw new ArlConsentUnavailableError(String((e as Error)?.message ?? e));
    throw e;
  }
}
