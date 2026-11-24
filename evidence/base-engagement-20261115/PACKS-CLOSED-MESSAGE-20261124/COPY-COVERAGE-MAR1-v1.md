# COPY-COVERAGE-MAR1-v1 — live Jan 1 / Dec 31 / "free through" strings

Read-only. Nothing was deployed. No Stripe or secret writes.

Captured: 2026-11-24, about 3:28–3:35 PM ET (EST), via MCP `get_edge_function` on every live function in project `cqzvqzwwevnflinxgnpp` (42 functions; versions and ezbr match BEFORE-v2). Repo source was not used as the source of truth.

Search: `January 1` / `Jan 1` / `Jan 1, 2027` / `December 31` / `Dec 31` / `free through` / `1798822800`, case-insensitive, across every file returned for each live function.

Stacy sources: `/workspace/process/evidence/STACY-BASE-MARCH1-TRIAL-STRINGSET-20261124-1459.md` (sha256 `55c49a8c…`) and `/workspace/process/evidence/STACY-JULES-MARCH1-FE-RULINGS-20261124-1518.md` (sha256 `66272c03…`).

Set names below use Grant's list (S1, S1-rev2, D3, webhook :226 set, none) plus plan v4's D7 where that is the named home for a string. "Cleared Stacy string" is the replacement in 55c49a8c / 66272c03. Pack lines that S1 / S1-rev2 explicitly leave unchanged are marked **NO CLEARED STRING**.

Correction: live `submit-assessment` v50 carries the beta line at `functions/submit-assessment/index.ts:100`, not `:99` (the repo/inventory line). The text is the same.

## Customer-facing and code-constant hits

| Function | Live ver / ezbr8 | File:line | Current text | Set | Stacy string | Cleared? |
|---|---|---|---|---|---|---|
| send-s1-welcome-email | v40 / 99f5d36b | source/index.ts:167 | `betaLine: "ROMRx Base is free through December 31, 2026. Billing starts January 1, 2027."` | D7 (plan v4; not S1 / S1-rev2 / D3 / webhook :226; no deploy-set built yet) | S9 lifecycle line (55c49a8c): "ROMRx Base is free until March 1, 2027, our beta launch trial period. Then $60 a year, charged to your card on March 1, 2027 and every year until you cancel." Plus cancel how-to in the same email (66272c03 Q2 / F27 never-alone rule). Live email does not include a cancel how-to next to this line. | S9 cleared; cancel how-to required with it |
| submit-assessment | v50 / edb16eb4 | functions/submit-assessment/index.ts:100 | `betaLine: "ROMRx Base is free through December 31, 2026. Billing starts January 1, 2027."` | D7 (plan v4; same as welcome) | S9 + cancel how-to (66272c03 Q2 / F27). Live email does not include a cancel how-to next to this line. | S9 cleared; cancel how-to required with it |
| submit-lead-assessment | v36 / 48c6f464 | source/email.ts:175 | `<div style="font-size:11px;color:#64748B;margin-top:10px;">ROMRx Base is free through December 31, 2026. Billing starts January 1, 2027.</div>` | D7 (plan v4; same as welcome) | S9 + cancel how-to (66272c03 Q2 / F27). Live email does not include a cancel how-to next to this line. | S9 cleared; cancel how-to required with it |
| create-checkout-session | v52 / 36abc3ba | _shared/arl_copy.ts:39 (`disclosureBase`) | `Free through December 31, 2026. Then ${basePrice} per year, charged to your card on January 1, 2027 and every year after until you cancel. Cancel online anytime in Settings. Canceling ends your access right away. Cancel before January 1, 2027 and you pay nothing.` | S1 (deploy-set-S1-ARL-MAR1; follows the fast-track post-check) | S1, version ca-arl-3b-2027-03-01-v5 (55c49a8c) | Yes |
| create-checkout-session | v52 / 36abc3ba | _shared/arl_copy.ts:66, :67, :70 (`ackLines` Base) | `:66` "Free period: now through December 31, 2026. You will not be charged during the free period." `:67` "After the free period: ${basePrice} per year for Base…, charged to your card on file on January 1, 2027." `:70` "Cancel before January 1, 2027 and you will not be charged anything." | S1-rev2 (build only; follows the fast-track post-check) | S8, version ca-arl-3c-2027-03-01-v5 (55c49a8c). Use fixed-date v5, not templated v6. | Yes |
| stripe-webhook | v59 / 3c60342d | _shared/arl_copy.ts:68, :69, :72 (`ackLines` Base) | Same three Base ack sentences as checkout, at the webhook line numbers Grant cited. (Webhook bundles a different arl_copy byte set than live checkout: sha `6b550c27` with a POSTAL_LINE import, vs checkout live `c06bd315` with the postal line inlined. Customer ack sentences match; line numbers are +2 vs checkout.) | S1-rev2 (Grant: webhook ack is covered by S1-rev2) | S8, version ca-arl-3c-2027-03-01-v5 (55c49a8c) | Yes |
| stripe-webhook | v59 / 3c60342d | _shared/arl_copy.ts:41 (`disclosureBase`) | Same Base disclosure sentence as checkout :39 | S1 (same string as checkout disclosure; webhook also carries the file) | S1, ca-arl-3b-2027-03-01-v5 | Yes |
| create-checkout-session | v52 / 36abc3ba | _shared/arl_copy.ts:44 (combo disclosure) and :49 (sport-only disclosure) | "Free through December 31, 2026. Then … charged … on January 1, 2027 … Cancel before January 1, 2027 and you pay nothing." | none (S1 / S1-rev2 leave pack lines unchanged) | **NO CLEARED STRING.** S10 (55c49a8c) voids the Jan 1 wording. No pack replacement string was cleared in 55c49a8c or 66272c03. | NO |
| stripe-webhook | v59 / 3c60342d | _shared/arl_copy.ts:46 (combo disclosure) and :51 (sport-only disclosure) | Same pack disclosure sentences as checkout :44 / :49 | none (pack lines left unchanged) | **NO CLEARED STRING** (same as the checkout pack disclosures) | NO |
| create-checkout-session | v52 / 36abc3ba | _shared/arl_copy.ts:88, :90, :94 (`ackSportLines` while in the free period) | "Free period: now through December 31, 2026…"; "…charged … on January 1, 2027."; "Cancel before January 1, 2027…" | none (S1-rev2: pack lines stay as they are) | **NO CLEARED STRING.** S10 voids the Jan 1 wording; no pack ack replacement was cleared. | NO |
| stripe-webhook | v59 / 3c60342d | _shared/arl_copy.ts:90, :92, :96 (`ackSportLines` while in the free period) | Same three pack ack sentences as checkout :88 / :90 / :94 | none (pack lines left unchanged) | **NO CLEARED STRING** | NO |
| stripe-webhook | v59 / 3c60342d | source/index.ts:226 | `trial_end: new Date(1798822800 * 1000).toISOString(),` | webhook :226 set (plan v4: D3-webhook; folder `sets/D3-WEBHOOK-TRIALEND`) | Not a customer string. Constant must move to 1803920400 with the D3/webhook set (due live and post-checked by Mon Nov 30, 2026, 6:00 PM ET). | n/a (constant) |
| create-checkout-session | v52 / 36abc3ba | _shared/arl_copy.ts:14 | `export const BETA_TRIAL_END_UNIX = 1798822800;` JSDoc still says "(2027-01-01 12:00 ET)". | fast-track TRIALEND-MAR1 (number only; JSDoc is called out in DEPLOY-CALL as copy, not changed in that set) | JSDoc is not a customer string. S10 says inFreePeriod() keys on 1803920400. | n/a (constant). JSDoc has **no cleared replacement** in the string set. |
| create-checkout-session | v52 / 36abc3ba | source/packs_gate.ts:22 | `export const PACKS_EARLIEST_OPEN_UNIX = 1798822800;` | fast-track TRIALEND-MAR1 (must equal BETA_TRIAL_END_UNIX) | n/a (constant) | n/a |
| stripe-webhook | v59 / 3c60342d | _shared/arl_copy.ts:16 | `export const BETA_TRIAL_END_UNIX = 1798822800;` | none in the fast-track (fast-track deploys create-checkout-session only). Follow-up when webhook / S1-rev2 arl_copy is deployed. | n/a (constant) | n/a |

## Comments only (not sent to customers)

These matched the search but are comments or JSDoc, not rendered copy.

| Function | Live ver | File:line | Text (comment) |
|---|---|---|---|
| send-s1-welcome-email | v40 | source/index.ts:18 | `//   Beta Dec 31 2026 / Jan 1 2027. BJJ keeps Position Readiness. 2026-09-08.` |
| submit-lead-assessment | v36 | source/index.ts:20 | `// - v12: Kai C lead results copy; no ambassador offer. v10: beta locks Dec 31 2026 / Jan 1 2027.` |
| create-checkout-session | v52 | source/index.ts:2, :19, :20, :32, :212 | Comments about packsCheckoutOpen / Dec 31 / Jan 1 trial_end / post-Jan-1 copy |
| create-checkout-session | v52 | source/packs_gate.ts:14–16, :30 | Comments about no pack charge on Jan 1, 2027 |
| create-checkout-session | v52 | _shared/arl_copy.ts:13, :52, :77 | JSDoc: free period ends 2027-01-01 12:00 ET; "from January 1, 2027 on"; "Jan 1, 2027+ variant" |
| stripe-webhook | v59 | _shared/arl_copy.ts:15 (JSDoc on the constant), :54, :79 | Same JSDoc family as checkout, two lines later |
| send-renewal-reminders | v32 | source/index.ts:3; source/logic.ts:5 | Comments that the Base charge date is Jan 1, 2027. No customer-facing "Jan 1" / "Dec 31" / "free through" string in index.ts, logic.ts, or email.ts. Reminder bodies use `${expiryDateStr}` / `${date}` and the word "renews". Wording change (trial-ending, not "renews") is D3, Stacy concern 15 / 66272c03, with a Vera render; not a literal hit today. |

## Live functions with no hit (36)

activate-beta-base v18, ai-chat v101, ai-chat-claims-test v16, calendar-ics v4, coach-actions v32, compute-tiers v59, compute-tiers-base v16, create-portal-session v28, embed-general-once v15, embed-knowledge v28, export-my-data v8, feedback-to-notion v29, get-coach-roster v26, join-waitlist v8, lifecycle-emails v11, notify-coach-signup v28, notify-inbound-lead v15, p1-25-storage-drain v1, request-account-deletion v16, rombot-checkin v6, rombot-conversations v7, save-push-subscription v27, send-bb-s1-2-followup-email v25, send-bb-s1-3-followup-email v25, send-bb-s1-4-stilhere-email v25, send-conversion-drip v26, send-protocol-reminder v26, send-push-notification v28, send-s1-2-followup-email v28, send-s1-3-masters-email v28, send-s1-4-stilhere-email v28, send-whats-new v12, serve-base-icon v18, submit-consent v29, submit-feedback v26, unsubscribe v19.

## Named emails — set map (Grant item 3)

| Live email / text | Set | Stacy string |
|---|---|---|
| send-s1-welcome-email v40, source/index.ts:167 | D7 (plan v4; no deploy-set built yet) | S9 (55c49a8c) + cancel how-to (66272c03 Q2 / F27) |
| webhook ack, _shared/arl_copy.ts :68, :69, :72 (and the same Base ack at checkout :66, :67, :70) | S1-rev2 | S8 ca-arl-3c-2027-03-01-v5 (55c49a8c) |
| submit-assessment v50, functions/submit-assessment/index.ts:100 (not :99) | D7 (plan v4; no deploy-set built yet) | S9 + cancel how-to |
| submit-lead-assessment v36, source/email.ts:175 | D7 (plan v4; no deploy-set built yet) | S9 + cancel how-to |

S1-rev2 still follows the fast-track post-check. D7 is not in the Nov 30 6:00 PM ET gate (that gate is D3, webhook :226, and L1487).

## Strings with no cleared Stacy replacement

- Pack disclosures and pack ack lines in live create-checkout-session and stripe-webhook `arl_copy.ts` (listed above). S10 voids the Jan 1 wording; S1 / S1-rev2 leave pack lines as they are; no pack March 1 string was cleared.
- The JSDoc above `BETA_TRIAL_END_UNIX` that still says "(2027-01-01 12:00 ET)".
