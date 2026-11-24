# Receipt: FG-12 push, io publish of r10b + WEB_PUSH_SEND on (Nov 24, 2026)
Approval: Jim in Sable's 1:1 at about 6:52 PM ET ("Why are we waiting?", about push), relayed by Grant 6:53 PM ET. Scope: publish push, set WEB_PUSH_SEND=on (only secret touched). VAPID not changed.

## 0. Does the FG-21 purge (cron job 14) remove push_subscriptions for deleted accounts? YES, two ways
- Job 14 "purge-deleted-accounts-daily" (23 4 * * *) runs public.purge_deleted_accounts('apply', interval '90 days'). Its table list has ('public', 'push_subscriptions', 'user_id', 'col') and ('public', 'push_sends', 'user_id', 'col') (live function definition, line 261 to 262; excerpt in verify/17-purge-excerpt.txt). It deletes those rows before deleting the auth row.
- Also constraint push_subscriptions_user_id_fkey: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE; the purge's final DELETE FROM auth.users cascades public.users (line 795 onward).
- Code and constraint read only. The 11:23 PM ET purge run itself is not verified here.

## 1. What sends push once WEB_PUSH_SEND is on
- Only send-push-notification reads WEB_PUSH_SEND (searched all repo branches; live source read via CLI download). Called by cron job 16 "send-push-notification-hourly" (45 * * * *). No trigger sends push (the only push_subscriptions trigger is push_subscriptions_cap_trg, BEFORE INSERT cap).
- Recipients: notification_preferences.push_reminders = true AND a push_subscriptions row (or a legacy push_subscription jsonb) AND is_test_account(email) = false. Kinds protocol (at the user's reminder hour) and retest (on the retest day, outside 9 PM to 8 AM local). One per user per kind per day (push_sends claim). No email, SMS or other channel in this function.
- At 6:58 PM ET: push_subscriptions 0, legacy jsonb subscriptions 0, push_reminders true 0, push_sends 0. So nobody can get a push until they turn it on in Settings.
- The other send flags (RENEWAL_BASE_SEND, LIFECYCLE_EMAILS_SEND, ROMBOT_CHECKIN_SEND) were already on before this and were not touched (digests unchanged).

## 2. io publish
- Cut: Jules, tag frozen-20261124/r10b-on-fg08-live-v3 (object 2058337d), tip 50b92ee37947465108be143ffd82512985cdfade, his receipt be92b488.
- verify_cut_r10b-v1.sh, all PASS: 113f1d45 (live) is an ancestor; 6 commits; only the 11 r10b push files differ from live; the 8 FG-08/chip files unchanged; SHOW_PUSH = true; My Body check on the tip PASS (dial 89, chip +4 vs Nov 10, Oct 4 -> Nov 17 +10, 10 dated trends).
- Local production build (git archive, COMMIT_REF = tip, Netlify production env; its VITE_VAPID_PUBLIC_KEY hashes to 8dcb59b6, same as AVERY-VAPID-PUBLIC-KEY-20261117.txt): dist d39eb0668cfd43e769313ef68906ec8f5f503768d86fc34a7d68a1adfc214c6b, 418 files, MATCH.
- Scans: build log 0 JWT-shaped, 0 service_role, 0 sk_live/sk_test, 0 private key, 0 copies of the VAPID public value; built files 0 of each, 0 VAPID_PRIVATE. Bundle index-ClqnSsyf.js: VAPID public 4 (public by design), Notification.requestPermission 1, pushManager 6, save-push-subscription 1, "Reminder notifications" 1, "Where you started" 1. sw.js has push and notificationclick handlers.
- Before: 6b0621cab87dcb66dccff633 (FG-08, 113f1d45), locked, stop_builds on (6:56:42 PM ET).
- Draft 6b06243dc00d349b1519723a (never --prod): /app/ 200; bundle, sw.js and legal.html sha256 equal to the local build; live unchanged while draft.
- Publish: restoreSiteDeploy 6:57:14 PM ET, lockDeploy confirmed. After: published 6b06243dc00d349b1519723a, locked true, stop_builds true.
- listSiteFiles: 416 files, 415 sha1 equal to the local build, 0 missing; netlify.toml differs (rewritten by the deploy step, as in the earlier publishes). romrx.io/app/ serves index-ClqnSsyf.js and sw.js equal to the build.

## 3. Flag
- 6:57:51 PM ET: supabase secrets set WEB_PUSH_SEND=on --yes (only this). Before: WEB_PUSH_SEND not set (off). After: set, digest equals sha256("on"). VAPID_PUBLIC_KEY 8dcb59b6, VAPID_PRIVATE_KEY 7ebfe089, VAPID_SUBJECT 5a8b650b digests unchanged. 36 secrets.
- list_edge_functions before/after: all 42 functions version +1, ezbr, verify_jwt and updated_at unchanged (secret-set bump only). Note ai-chat is now v109 with the v108 code (ezbr efb68251).

## 4. Test push: NOT SENT (blocked by design)
- ebfe4f3d has no push_subscriptions row (0 at 6:58 PM ET).
- The function has no targeted test path. It skips every test account (is_test_account(ebfe4f3d's email) = true, so skipped_test), the "test" kind produces no candidates, and calling it needs the cron caller secret. So a test push to ebfe4f3d cannot go out with the live code, even after Reid subscribes.
- Ways forward (need a decision): (a) Reid subscribes a non-test account of his own with a reminder time, and the next :45 cron run sends its protocol reminder (check push_sends and the function log); or (b) a small function change adding a single-user test send for test accounts (new deploy, needs approval).

## Rollback
1. netlify api restoreSiteDeploy site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b deploy 6b0621cab87dcb66dccff633, then lockDeploy 6b0621cab87dcb66dccff633, then getSite readback.
2. supabase secrets set WEB_PUSH_SEND=off (or unset WEB_PUSH_SEND); the function sends only on exactly "on". VAPID stays.
