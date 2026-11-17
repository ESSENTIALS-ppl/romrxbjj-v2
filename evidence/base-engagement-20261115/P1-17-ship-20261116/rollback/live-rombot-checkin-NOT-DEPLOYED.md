# Live rombot-checkin before P1-17 ship: NOT DEPLOYED
- get_edge_function rombot-checkin on cqzvqzwwevnflinxgnpp, ~7:33 PM ET Mon Nov 16 2026: NotFoundException "Function not found".
- list_edge_functions 7:34 PM ET: 39 functions, no slug rombot-checkin (only rombot-conversations v2). Saved as ../deploy/pre-list-edge-functions.json.
- So there is no prior version and no rollback source to save. Rollback for a bad deploy is NOT a redeploy of older bytes; deleting the function needs Jim's own yes (no deletes rule), so a failed check is a STOP-and-report.
