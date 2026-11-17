-- Read-only count-only aggregates. Returns no endpoint, email, or user_id values.
-- Vera W2 precheck (10a5b11a) required these post-deploy / pre-WEB_PUSH_SEND counts:
--   W1: backups whose endpoint has a push_subscriptions row owned by another user
--   W2(a): endpoints in more than one backup
--   W2(b): backups whose endpoint has no push_subscriptions row and whose user has no active row
-- Plus the rest of Vera's 10:00 PM ET baseline counts, and hold checks for cron / 20261117020200.
SELECT
  (SELECT count(*) FROM notification_preferences) AS notification_preferences_rows,
  (SELECT count(*) FROM notification_preferences WHERE push_subscription IS NOT NULL) AS backups_non_null,
  (SELECT count(*) FROM notification_preferences WHERE push_subscription->>'endpoint' IS NOT NULL AND btrim(push_subscription->>'endpoint') <> '') AS backups_with_endpoint,
  (SELECT count(*) FROM (
     SELECT push_subscription->>'endpoint' AS ep
     FROM notification_preferences
     WHERE push_subscription->>'endpoint' IS NOT NULL AND btrim(push_subscription->>'endpoint') <> ''
     GROUP BY 1
     HAVING count(*) > 1
  ) s) AS endpoints_in_more_than_one_backup,
  (SELECT count(*) FROM notification_preferences np
     WHERE np.push_subscription->>'endpoint' IS NOT NULL
       AND btrim(np.push_subscription->>'endpoint') <> ''
       AND EXISTS (
         SELECT 1 FROM push_subscriptions ps
         WHERE ps.endpoint = np.push_subscription->>'endpoint'
           AND ps.user_id <> np.user_id
       )) AS backups_endpoint_owned_by_other_user,
  (SELECT count(*) FROM notification_preferences np
     WHERE np.push_subscription->>'endpoint' IS NOT NULL
       AND btrim(np.push_subscription->>'endpoint') <> ''
       AND NOT EXISTS (
         SELECT 1 FROM push_subscriptions ps
         WHERE ps.endpoint = np.push_subscription->>'endpoint'
       )) AS backups_with_no_table_row,
  (SELECT count(*) FROM notification_preferences np
     WHERE np.push_subscription->>'endpoint' IS NOT NULL
       AND btrim(np.push_subscription->>'endpoint') <> ''
       AND NOT EXISTS (
         SELECT 1 FROM push_subscriptions ps
         WHERE ps.endpoint = np.push_subscription->>'endpoint'
       )
       AND NOT EXISTS (
         SELECT 1 FROM push_subscriptions ps
         WHERE ps.user_id = np.user_id
           AND ps.disabled_at IS NULL
       )) AS backups_orphan_endpoint_and_user_has_no_active_row,
  (SELECT count(*) FROM notification_preferences np
     WHERE np.push_subscription->>'endpoint' IS NOT NULL
       AND btrim(np.push_subscription->>'endpoint') <> ''
       AND NOT EXISTS (
         SELECT 1 FROM push_subscriptions ps
         WHERE ps.user_id = np.user_id
           AND ps.disabled_at IS NULL
       )) AS current_fallback_candidates,
  (SELECT count(*) FROM push_subscriptions) AS push_subscriptions_rows,
  (SELECT count(*) FROM push_subscriptions WHERE disabled_at IS NOT NULL) AS push_subscriptions_disabled,
  (SELECT count(*) FROM cron.job) AS cron_job_count,
  (SELECT md5(command) FROM cron.job WHERE jobid = 1) AS job_1_command_md5,
  (SELECT count(*) FROM cron.job WHERE jobname ILIKE '%push%' OR command ILIKE '%send-push-notification%' OR jobname ILIKE '%20261117020200%' OR command ILIKE '%20261117020200%') AS send_push_cron_jobs,
  (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '20261117020200') AS migration_20261117020200_applied,
  now() AT TIME ZONE 'America/New_York' AS checked_at_et;
