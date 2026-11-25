# Receipt: one manual test push to test account ebfe4f3d (Nov 24, 2026)
Order: Grant 6:59 PM ET, route (a). No deploy, no change to the test-account skip, no flag or secret change, nobody else.
Key source: /home/box/.romrx-secrets/vapid-20261117.env, the mode-600 file from the original VAPID setup (RECEIPT-P1-14-VAPID-SET-20261117.md; file sha256 41e32715, unchanged). Hashes only: public 8dcb59b6, private 7ebfe089, subject 5a8b650b, each equal to the live Supabase secret digests. Nothing printed.
Subscription: 1 push_subscriptions row for ebfe4f3d (disabled_at null), 1 row in the table overall (7:01:43 PM ET). Row read by the script from a query result file, never displayed; the file was zeroed and removed after the send.
Sender: send_one_test_push-v1.mjs (web-push 3.6.7, same as the live function). Refuses 0 or more than 1 rows and any other user (refusal checks run before the send: 0 rows, other user, 2 rows all REFUSED). Payload {"title":"ROMRx Base","body":"Test reminder"}, TTL 600.
Result: push service HTTP 201 (accepted) at 7:01:53 PM ET. Exactly one send. On-screen display on Reid's device to be confirmed by Reid.
After (7:02:00 PM ET): push_subscriptions 1 (ebfe4f3d only), push_sends 0 (manual send, not written), reminders on for 1 user (ebfe4f3d only).
Note: ebfe4f3d is a test account, so the hourly cron (:45) skips it; no further push goes to it.
Not touched: functions, flags, secrets, VAPID, crons, the test-account skip.
