# RECEIPT FG-40 get-coach-roster LIVE, Tue Nov 24 2026 (ET)
Authority: Jim 3:55 PM ET "I need that list done too" (Sable 1:1 pos 12643), Grant relay 3:56 PM ET. Velvet Ops off: Sable spot-check replaces Vera.
Gate: ai-chat v102, create-checkout-session v54, stripe-webhook v60 seen before any write.
Set SUMS f685bb053e5a2235e65f368d31eb8f9d8e02c9e65bf7d893374643a7f3b69b17 re-checked 11/11 OK.
BEFORE-v2 (4:06:52 PM ET): 42 functions; get-coach-roster v26 ezbr 8945b54b verify_jwt true. Differences vs the 3:41 PM list are other-job deploys only (ai-chat v102, create-checkout-session v54, stripe-webhook v60, send-renewal-reminders v33, send-s1-welcome-email v41).
Deploy: MCP deploy_edge_function by name get-coach-roster, entrypoint source/index.ts, verify_jwt true, 1 file source/index.ts sha256 f39e7a19 (exact folder bytes).
AFTER (4:07:05 PM ET): 42 functions; get-coach-roster v27 ezbr a61ad780c7b7ca8d1b04010212db1d56d267b60b24d251469a9f44b2ef5975c0 verify_jwt true. Readback index.ts sha256 f39e7a1971116960c6f87437e56a3248b523409a1c5ebca04382abcd035f58fc MATCH.
Only other AFTER change: submit-assessment v51 (4:07:01 PM ET), the parallel job's set c, not this deploy.
Change: athlete email removed from the athletes select and the roster item. No billing fields before or after.
Rollback (not run): deploy_edge_function get-coach-roster, entrypoint source/index.ts, verify_jwt true, files from rollback/live-v26/index.ts (e05782ca = v26 ezbr 8945b54b).
FE follow-up for Jules: BJJ CoachDashboard.tsx:633 and BB CoachDashboard.tsx:534 render athlete.email; it now renders empty (no crash; search is name-only).
