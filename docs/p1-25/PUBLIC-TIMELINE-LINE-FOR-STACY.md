# P1-25 public timeline line — draft facts for Stacy (v3)

Not for publish. Stacy words this against RECEIPT-P1-25-PURGE-v3-20261116.md. Jim's Nov 3 rule is that Stacy checks the privacy page wording alongside the work, not as a blocker. Any privacy page text must state 90 days to match Jim's words (L1004).

Jim, verbatim (L1004, 2026-11-03 7:07 PM ET): "Purge deleted accounts after 90 days."

## Facts to word against (not public copy)

- Clock starts when a deletion request is completed, 90 days later. Open requests and completed deletions younger than 90 days are not purged.
- An unused soft-delete mark on the login row, by itself, does not start the clock (v3 removed that path).
- After that 90 days, ROMRx erases the deleted account's leftover app data, including lead rows and pre-account email-list rows that match the account, and coach-tool rows tied to that athlete.
- We keep billing terms (`billing_consents`) and consents given or withdrawn (`consent_events`) as legal proof, with no end date in this code.
- Staff and test accounts are excluded from this purge.
- Auth audit and flow logs, platform logs, and Stripe payment records are kept by those providers; this function does not touch them.
- After an erase run, a short in-database copy of what was just erased is kept for 7 days, then dropped by a later run. Official Supabase-managed backups are not included on the Free plan (see the v2 receipt); any manual or off-site dump is unknown.
- The 30-day manual completion process is unchanged.

Do not publish from this file.
