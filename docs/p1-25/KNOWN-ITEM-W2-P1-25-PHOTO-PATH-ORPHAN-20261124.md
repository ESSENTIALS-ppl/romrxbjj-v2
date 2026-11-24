# P1-25 known item W2: progress-photo-path orphan gap (recorded 2026-11-24)

Status: KNOWN, NOT FIXED in e0b34625 (by design: that fix keeps the live purge body byte-identical except the 3 storage-queue edits). Source: Vera precheck of e0b34625, item B9 (WARN W2); first noted by Avery as W1 in the purge build.

What it is:
- In public.purge_deleted_accounts(apply), the inventory loop deletes the account's public.progress_photos rows BEFORE the storage block runs.
- The storage block (now the queue INSERT) matches storage.objects by owner, by owner_id, or by name IN (progress_photos.storage_path for the qualifying accounts). By then the progress_photos rows are gone, so the photo-path clause matches nothing.
- Result: a Storage object with no owner and no owner_id, referenced only by a progress_photos.storage_path, is counted and copied to the backup schema, but is NOT queued, so the drain never deletes it.

How to see it:
- In the apply result, storage_objects_queued < table_counts['storage.objects'] for that run. Any run where that is true: tell Grant the same day.

Exposure today (read-only, Tue Nov 24 2026 2:10 PM ET): storage.objects 0, account_deletion_requests 0. Nobody is affected.

Mitigation until fixed:
- Runbook step 2 deletes the account's Storage files through the Storage API at completion, so nothing should be left for day 90.
- The drain and the daily queue check do not cover this gap (the object never enters the queue).

Fix (later version, own pin): capture the photo paths into a temp table before the inventory loop, or move the storage block ahead of the progress_photos delete. Not built here.
