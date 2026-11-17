-- Rollback for P1-14 send-push-notification hourly cron. NOT APPLIED.
-- Unschedules only this job name. Does not touch job 1 or any other cron job.

select cron.unschedule('send-push-notification-hourly');
