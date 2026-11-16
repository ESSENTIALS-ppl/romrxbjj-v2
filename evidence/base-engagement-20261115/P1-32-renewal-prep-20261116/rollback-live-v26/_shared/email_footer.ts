// _shared/email_footer.ts - one place for the postal address and unsubscribe link every lifecycle email footer uses.
// Jim's closed decision 2026-10-03 (ledger, Reid's Suite 240 mail check): the footer carries the full address
// "6605 Longshore Street, Suite 240, Dublin, OH 43017-2774" (CAN-SPAM valid physical postal address).
// Change the address HERE only. No em dashes. American spelling.

export const LEGAL_ENTITY = "ROMRx LLC";
export const POSTAL_ADDRESS = "6605 Longshore Street, Suite 240, Dublin, OH 43017-2774";
/** "ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774" */
export const POSTAL_LINE = `${LEGAL_ENTITY}, ${POSTAL_ADDRESS}`;

/**
 * Same opt-out link pattern the drip emails already use: `{base}/unsubscribe?email=...`.
 * base is the brand site origin (https://romrxbjj.com, https://romrxbodybuilding.com) or, for Base,
 * https://romrx.io/app (HQ SPA route /app/unsubscribe; romrx.io also redirects /unsubscribe to it).
 * The page calls the `unsubscribe` edge function, which sets users.marketing_opt_out.
 */
export function unsubscribeUrl(base: string, email: string): string {
  return `${base.replace(/\/$/, "")}/unsubscribe?email=${encodeURIComponent(email)}`;
}
