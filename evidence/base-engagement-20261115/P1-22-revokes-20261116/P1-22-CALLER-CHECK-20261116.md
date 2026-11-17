# P1-22 v2 caller check (read-only) — 2026-11-16

Author: Avery (ROMRx Product Engineer). Run 8:27 PM to 8:40 PM ET, Mon Nov 16 2026. Resumed once after a tool rate limit at about 8:33 PM ET.
Project cqzvqzwwevnflinxgnpp. Migration under check: 20261117012431 p1_22_revoke_anon_execute (rename commit 0863bb18).
Asked by Grant (CoS) after the P1-22 apply receipt. No writes of any kind. No rows inserted. Rollback NOT applied.

## VERDICT

**no authenticated callers, trigger unaffected**

- No client code (live source 29eb4fa6, r3 78dd3bf3, r4 6ddbae98) and no deployed edge function (40 of 40) names any of the 3 functions.
- No DB object (function body, policy, default, generated column, check constraint, index, view, cron job) calls product_event_kind or record_protocol_completions. pg_depend shows only trigger zz_pc_protocol_session depends on tg_protocol_session_completion.
- tg_protocol_session_completion is SECURITY DEFINER, owner postgres. Its body calls neither record_protocol_completions nor product_event_kind (it does its own INSERT into protocol_completions, which has no triggers). Postgres checks EXECUTE on a trigger function only at CREATE TRIGGER, not when it fires. So a signed-in user's protocol_sessions INSERT/UPDATE (MyProtocol.tsx upsert) still fires zz_pc_protocol_session, and the body runs as postgres.
- record_protocol_completions (SECURITY INVOKER) and product_event_kind (SECURITY INVOKER, sql) are now not executable by authenticated, but nothing reachable by a signed-in user calls them.
- Decision: change nothing. Rollback 0d839238 stays on standby, not applied.

Resume check (8:33 PM ET, after the rate limit): list_migrations last 4 = 20261117001014 p1_22_t10_completions_by_day, 20261117010651 p1_18_session_feedback, 20261117010702 p1_18_assessment_feedback, 20261117012431 p1_22_revoke_anon_execute. No rollback migration exists (grep -c rollback on the list = 0). ACLs re-read at 2026-11-16 20:33:13 ET unchanged (below).

## 1. Client grep (romrx-io-web, /workspace/p1-wt after `git fetch --all` and `git fetch origin --tags`)

Commits:
- live deploy 6afba1b9 source: 29eb4fa66f920450d71c44e6edbad123cfd38596
- r3: tag frozen-20261116/combined-p1-18-18b-26-on-29eb4fa-r3 -> 78dd3bf32653a6b02c814fbe71700eeafbc3165e (2026-11-16 20:18:26 ET)
- r4: tag frozen-20261116/combined-p1-18-18b-26-on-29eb4fa-r4 -> 6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a (2026-11-16 20:23:36 ET) = origin/feat/combined-p1-18-18b-26-on-29eb4fa-20261116 tip (ls-remote confirmed)

```
== 29eb4fa66f920450d71c44e6edbad123cfd38596
$ git grep -n -I -E 'record_protocol_completions|product_event_kind|tg_protocol_session_completion' 29eb4fa66f920450d71c44e6edbad123cfd38596
exit=1
$ git grep -c -I -E '\.rpc\(' 29eb4fa66f920450d71c44e6edbad123cfd38596
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/components/ReminderOptIn.tsx:1
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/components/TermsReacceptGate.tsx:1
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/hooks/useProfile.ts:1
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/lib/jointHistory.ts:2
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/lib/reminderOptIn.test.ts:1
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/lib/termsConsent.test.ts:1
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/pages/Settings.tsx:1
== 78dd3bf32653a6b02c814fbe71700eeafbc3165e
$ git grep -n -I -E 'record_protocol_completions|product_event_kind|tg_protocol_session_completion' 78dd3bf32653a6b02c814fbe71700eeafbc3165e
exit=1
$ git grep -c -I -E '\.rpc\(' 78dd3bf32653a6b02c814fbe71700eeafbc3165e
78dd3bf32653a6b02c814fbe71700eeafbc3165e:app/src/components/ReminderOptIn.tsx:1
78dd3bf32653a6b02c814fbe71700eeafbc3165e:app/src/components/TermsReacceptGate.tsx:1
78dd3bf32653a6b02c814fbe71700eeafbc3165e:app/src/hooks/useProfile.ts:1
78dd3bf32653a6b02c814fbe71700eeafbc3165e:app/src/lib/jointHistory.ts:2
78dd3bf32653a6b02c814fbe71700eeafbc3165e:app/src/lib/reminderOptIn.test.ts:1
78dd3bf32653a6b02c814fbe71700eeafbc3165e:app/src/lib/termsConsent.test.ts:1
78dd3bf32653a6b02c814fbe71700eeafbc3165e:app/src/pages/Settings.tsx:1
== 6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a
$ git grep -n -I -E 'record_protocol_completions|product_event_kind|tg_protocol_session_completion' 6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a
exit=1
$ git grep -c -I -E '\.rpc\(' 6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/components/ReminderOptIn.tsx:1
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/components/TermsReacceptGate.tsx:1
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/hooks/useProfile.ts:1
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/lib/jointHistory.ts:2
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/lib/reminderOptIn.test.ts:1
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/lib/termsConsent.test.ts:1
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/pages/Settings.tsx:1
```

RPC names used by each client commit:

```
== 29eb4fa66f920450d71c44e6edbad123cfd38596
$ git grep -h -o -I -E "\.rpc\(\s*['\"\`][a-z_0-9]+" 29eb4fa66f920450d71c44e6edbad123cfd38596 | sort | uniq -c
      1 .rpc('get_my_profile
      1 .rpc('my_joint_history
      1 .rpc('my_joint_start_vs_now
      2 .rpc('record_terms_reaccept
$ git grep -n -I -E 'protocol_session|session_completion|protocol_completion' 29eb4fa66f920450d71c44e6edbad123cfd38596 -- app/src | wc -l
14
== 78dd3bf32653a6b02c814fbe71700eeafbc3165e
$ git grep -h -o -I -E "\.rpc\(\s*['\"\`][a-z_0-9]+" 78dd3bf32653a6b02c814fbe71700eeafbc3165e | sort | uniq -c
      1 .rpc('get_my_profile
      1 .rpc('my_joint_history
      1 .rpc('my_joint_start_vs_now
      2 .rpc('record_terms_reaccept
$ git grep -n -I -E 'protocol_session|session_completion|protocol_completion' 78dd3bf32653a6b02c814fbe71700eeafbc3165e -- app/src | wc -l
18
== 6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a
$ git grep -h -o -I -E "\.rpc\(\s*['\"\`][a-z_0-9]+" 6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a | sort | uniq -c
      1 .rpc('get_my_profile
      1 .rpc('my_joint_history
      1 .rpc('my_joint_start_vs_now
      2 .rpc('record_terms_reaccept
$ git grep -n -I -E 'protocol_session|session_completion|protocol_completion' 6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a -- app/src | wc -l
18
```

Table access that fires the trigger (protocol_sessions; upsert in MyProtocol.tsx, signed-in user JWT via the anon-key supabase-js client):

```
$ git grep -n -I -E "from\('protocol_session[a-z_]*'\)" 6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a 29eb4fa66f920450d71c44e6edbad123cfd38596 -- app/src | cut -c1-250
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/components/SessionFeel.tsx:77:        const { data: s, error: sErr } = await client.from('protocol_sessions').select('id')
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/components/SoloChallenge.tsx:20:    supabase.from('protocol_sessions').select('session_date').eq('user_id', userId)
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/components/WeeklyGoal.tsx:26:    supabase.from('protocol_sessions').select('session_date').eq('user_id', userId).gte('session_date', from.toISOString().slice(0, 10))
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/hooks/useProfile.ts:96:          .from('protocol_sessions')
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/pages/MyProtocol.tsx:522:      .from('protocol_sessions')
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/pages/MyProtocol.tsx:536:      .from('protocol_sessions')
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/pages/MyProtocol.tsx:551:      .from('protocol_sessions')
6ddbae98cc3ad0bc7d07f4fec6b53bc6575b019a:app/src/pages/MyProtocol.tsx:588:    supabase.from('protocol_sessions').upsert({
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/components/SoloChallenge.tsx:20:    supabase.from('protocol_sessions').select('session_date').eq('user_id', userId)
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/components/WeeklyGoal.tsx:26:    supabase.from('protocol_sessions').select('session_date').eq('user_id', userId).gte('session_date', from.toISOString().slice(0, 10))
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/hooks/useProfile.ts:96:          .from('protocol_sessions')
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/pages/MyProtocol.tsx:520:      .from('protocol_sessions')
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/pages/MyProtocol.tsx:534:      .from('protocol_sessions')
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/pages/MyProtocol.tsx:549:      .from('protocol_sessions')
29eb4fa66f920450d71c44e6edbad123cfd38596:app/src/pages/MyProtocol.tsx:586:    supabase.from('protocol_sessions').upsert({
```

Result: 0 hits for the 3 names in all 3 commits. No client rpc call to them.

## 2. Deployed edge functions (MCP list_edge_functions, then get_edge_function on each, all 40)

```
compute-tiers v54 ACTIVE "verify_jwt":false
ai-chat v96 ACTIVE "verify_jwt":true
stripe-webhook v54 ACTIVE "verify_jwt":false
submit-consent v24 ACTIVE "verify_jwt":true
submit-assessment v45 ACTIVE "verify_jwt":true
create-checkout-session v45 ACTIVE "verify_jwt":true
get-coach-roster v21 ACTIVE "verify_jwt":true
coach-actions v27 ACTIVE "verify_jwt":true
create-portal-session v23 ACTIVE "verify_jwt":true
send-protocol-reminder v21 ACTIVE "verify_jwt":false
save-push-subscription v20 ACTIVE "verify_jwt":true
embed-knowledge v23 ACTIVE "verify_jwt":false
send-push-notification v21 ACTIVE "verify_jwt":false
send-renewal-reminders v27 ACTIVE "verify_jwt":false
send-s1-welcome-email v35 ACTIVE "verify_jwt":false
send-s1-2-followup-email v23 ACTIVE "verify_jwt":false
send-s1-3-masters-email v23 ACTIVE "verify_jwt":false
send-s1-4-stilhere-email v23 ACTIVE "verify_jwt":false
notify-coach-signup v23 ACTIVE "verify_jwt":false
send-bb-s1-2-followup-email v20 ACTIVE "verify_jwt":false
send-bb-s1-3-followup-email v20 ACTIVE "verify_jwt":false
send-bb-s1-4-stilhere-email v20 ACTIVE "verify_jwt":false
submit-feedback v21 ACTIVE "verify_jwt":false
feedback-to-notion v24 ACTIVE "verify_jwt":false
send-conversion-drip v21 ACTIVE "verify_jwt":false
submit-lead-assessment v31 ACTIVE "verify_jwt":false
compute-tiers-base v11 ACTIVE "verify_jwt":false
serve-base-icon v13 ACTIVE "verify_jwt":false
unsubscribe v14 ACTIVE "verify_jwt":false
embed-general-once v10 ACTIVE "verify_jwt":false
activate-beta-base v13 ACTIVE "verify_jwt":true
request-account-deletion v11 ACTIVE "verify_jwt":true
notify-inbound-lead v10 ACTIVE "verify_jwt":false
ai-chat-claims-test v11 ACTIVE "verify_jwt":true
send-whats-new v7 ACTIVE "verify_jwt":false
join-waitlist v3 ACTIVE "verify_jwt":false
rombot-conversations v2 ACTIVE "verify_jwt":true
export-my-data v3 ACTIVE "verify_jwt":true
lifecycle-emails v4 ACTIVE "verify_jwt":false
rombot-checkin v1 ACTIVE "verify_jwt":false
```

Sources saved from get_edge_function to /tmp/p122-edge/<slug>.txt (full text, following the tools Full text pointer where the result was long). embed-general-once, ai-chat-claims-test and send-whats-new are one-file 410 stubs.

```
$ grep -l -E "record_protocol_completions|product_event_kind|tg_protocol_session_completion" /tmp/p122-edge/*.txt
exit=1
$ cd /tmp/p122-edge && grep -o -h -E "\.rpc\(\s*[\\\\]?['\"\`][a-z_0-9]+" *.txt | sort | uniq -c
      4 .rpc(\"add_sport_access
      1 .rpc(\"compute_joint_scores
      1 .rpc(\"erase_backup_copies_for_user
      1 .rpc(\"export_my_backup_page
      1 .rpc(\"export_my_data_gate
      1 .rpc(\"get_my_profile
      5 .rpc(\"is_test_account
      9 .rpc(\"rate_limit_hit
      1 .rpc(\"recompute_user_eligibility
      3 .rpc(\"remove_sport_access
      1 .rpc(\"search_rombot_knowledge
      3 .rpc(\"verify_webhook_secret
```

Result: 0 hits in 40 of 40 functions, so there's no service-role vs user-JWT question to answer. None of the RPCs above call the 3 functions inside the DB (section 3, prosrc grep = 0 rows).

## 3. DB reads (MCP execute_sql, read-only)

### 3a. Definitions, security, owner, config

SQL:
```sql
select p.oid::regprocedure as fn, p.prosecdef, pg_get_userbyid(p.proowner) as owner, p.proconfig, p.provolatile, l.lanname, p.proacl::text as acl, pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public' and p.proname in ('product_event_kind','record_protocol_completions','tg_protocol_session_completion') order by 1;
```
Result (verbatim):
```
[{"fn":"product_event_kind(text)","prosecdef":false,"owner":"postgres","proconfig":["search_path=pg_catalog, pg_temp"],"provolatile":"i","lanname":"sql","acl":"{postgres=X/postgres,service_role=X/postgres}","def":"CREATE OR REPLACE FUNCTION public.product_event_kind(p_event text)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE\n SET search_path TO 'pg_catalog', 'pg_temp'\nAS $function$\n  SELECT CASE\n    WHEN p_event IN (\n      'email_sent',\n      'base_status_changed',\n      'base_activated',\n      'checkout_completed',\n      'checkout_packs_closed',\n      'checkout_packs_closed_sport_dropped',\n      'sport_entitlement_changed',\n      'signup_completed',\n      'lead_assessment_submitted',\n      'assessment_lead_gate_shown',\n      'unsubscribed'\n    ) THEN 'system'\n    ELSE 'user'\n  END;\n$function$\n"},{"fn":"record_protocol_completions(uuid,uuid,text,uuid[])","prosecdef":false,"owner":"postgres","proconfig":["search_path=pg_catalog, public, pg_temp"],"provolatile":"v","lanname":"plpgsql","acl":"{postgres=X/postgres,service_role=X/postgres}","def":"CREATE OR REPLACE FUNCTION public.record_protocol_completions(p_session_id uuid, p_assessment_id uuid, p_joint text, p_exercise_ids uuid[])\n RETURNS integer\n LANGUAGE plpgsql\n SET search_path TO 'pg_catalog', 'public', 'pg_temp'\nAS $function$\nDECLARE\n  uid uuid := auth.uid();\n  n integer := 0;\n  eid uuid;\n  sid uuid;\nBEGIN\n  IF uid IS NULL THEN\n    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';\n  END IF;\n  IF p_session_id IS NULL THEN\n    RETURN 0;\n  END IF;\n  SELECT s.id INTO sid\n  FROM public.protocol_sessions s\n  WHERE s.id = p_session_id AND s.user_id = uid;\n  IF sid IS NULL THEN\n    RAISE EXCEPTION 'session not found' USING ERRCODE = '42501';\n  END IF;\n\n  IF p_exercise_ids IS NULL OR cardinality(p_exercise_ids) = 0 THEN\n    IF NOT EXISTS (\n      SELECT 1 FROM public.protocol_completions c\n      WHERE c.protocol_session_id = sid AND c.exercise_id IS NULL\n    ) THEN\n      INSERT INTO public.protocol_completions (\n        user_id, assessment_id, exercise_id, joint, protocol_session_id, completed_at\n      ) VALUES (uid, p_assessment_id, NULL, p_joint, sid, now());\n      n := 1;\n    END IF;\n    RETURN n;\n  END IF;\n\n  FOREACH eid IN ARRAY p_exercise_ids LOOP\n    IF NOT EXISTS (\n      SELECT 1 FROM public.protocol_completions c\n      WHERE c.protocol_session_id = sid AND c.exercise_id = eid\n    ) THEN\n      INSERT INTO public.protocol_completions (\n        user_id, assessment_id, exercise_id, joint, protocol_session_id, completed_at\n      ) VALUES (uid, p_assessment_id, eid, p_joint, sid, now());\n      n := n + 1;\n    END IF;\n  END LOOP;\n  RETURN n;\nEND;\n$function$\n"},{"fn":"tg_protocol_session_completion()","prosecdef":true,"owner":"postgres","proconfig":["search_path=pg_catalog, public, pg_temp"],"provolatile":"v","lanname":"plpgsql","acl":"{postgres=X/postgres,service_role=X/postgres}","def":"CREATE OR REPLACE FUNCTION public.tg_protocol_session_completion()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'pg_catalog', 'public', 'pg_temp'\nAS $function$\nDECLARE\n  aid uuid;\nBEGIN\n  -- Fallback only: if the app (or RPC) already wrote rows for this session, do nothing.\n  IF EXISTS (SELECT 1 FROM public.protocol_completions c WHERE c.protocol_session_id = NEW.id) THEN\n    RETURN NEW;\n  END IF;\n  -- FK-safe: protocol_completions.user_id references public.users(id). Skip users\n  -- with no public.users row instead of failing the session save.\n  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id) THEN\n    RETURN NEW;\n  END IF;\n  BEGIN\n    -- Skip when completions already exist for this user on the session's local date\n    -- (Base web writer 41b947e7 inserts per-exercise rows with no protocol_session_id).\n    -- Local date: user's notification_preferences.timezone if valid, else America/New_York.\n    IF EXISTS (\n      SELECT 1 FROM public.protocol_completions c\n      WHERE c.user_id = NEW.user_id\n        AND (c.completed_at AT TIME ZONE COALESCE(\n              (SELECT np.timezone FROM public.notification_preferences np\n                WHERE np.user_id = NEW.user_id\n                  AND np.timezone IN (SELECT tz.name FROM pg_catalog.pg_timezone_names tz)\n                ORDER BY np.updated_at DESC NULLS LAST LIMIT 1),\n              'America/New_York'))::date = NEW.session_date\n    ) THEN\n      RETURN NEW;\n    END IF;\n    SELECT a.id INTO aid\n    FROM public.assessments a\n    WHERE a.user_id = NEW.user_id\n    ORDER BY a.assessed_at DESC NULLS LAST\n    LIMIT 1;\n    INSERT INTO public.protocol_completions (\n      user_id, assessment_id, exercise_id, joint, protocol_session_id, completed_at\n    ) VALUES (\n      NEW.user_id,\n      aid,\n      NULL,\n      NEW.protocol_day,\n      NEW.id,\n      COALESCE(NEW.logged_at, now())\n    );\n  EXCEPTION WHEN others THEN\n    -- Never block a protocol_sessions save.\n    RAISE WARNING 'zz_pc_protocol_session: completion not recorded for session % (%: %)', NEW.id, SQLSTATE, SQLERRM;\n  END;\n  RETURN NEW;\nEND;\n$function$\n"}]
```

Summary: product_event_kind prosecdef=false (INVOKER), owner postgres, search_path pinned. record_protocol_completions prosecdef=false (INVOKER), owner postgres, search_path pinned. tg_protocol_session_completion prosecdef=true (SECURITY DEFINER), owner postgres, search_path pinned. Trigger body calls: record_protocol_completions NO, product_event_kind NO. It calls only built-ins plus a direct INSERT into protocol_completions. Its own EXCEPTION WHEN others block also means a failed completion write can never fail the session save.

### 3b. Triggers, pg_depend, prosrc grep, policies, defaults/generated, check constraints, indexes, views, cron

SQL:
```sql
with f as (select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('product_event_kind','record_protocol_completions','tg_protocol_session_completion'))
select 'trigger' as kind, t.tgname as name, t.tgrelid::regclass::text as on_table, t.tgenabled::text as enabled, case when t.tgtype & 2 = 2 then 'BEFORE' when t.tgtype & 64 = 64 then 'INSTEAD OF' else 'AFTER' end || ' ' || concat_ws(' OR ', case when t.tgtype & 4=4 then 'INSERT' end, case when t.tgtype & 16=16 then 'UPDATE' end, case when t.tgtype & 8=8 then 'DELETE' end, case when t.tgtype & 32=32 then 'TRUNCATE' end) || case when t.tgtype & 1=1 then ' FOR EACH ROW' else ' FOR EACH STATEMENT' end as detail, f.proname as refs from pg_trigger t join f on f.oid=t.tgfoid where not t.tgisinternal
union all
select 'pg_depend', d.classid::regclass::text || ':' || coalesce(pg_describe_object(d.classid,d.objid,d.objsubid),'?'), null, d.deptype::text, null, f.proname from pg_depend d join f on d.refclassid='pg_proc'::regclass and d.refobjid=f.oid
union all
select 'prosrc_grep', p.oid::regprocedure::text, n.nspname, case when p.prosecdef then 'SECURITY DEFINER' else 'INVOKER' end, pg_get_userbyid(p.proowner), case when p.prosrc ~ 'product_event_kind' then 'product_event_kind ' else '' end || case when p.prosrc ~ 'record_protocol_completions' then 'record_protocol_completions ' else '' end || case when p.prosrc ~ 'tg_protocol_session_completion' then 'tg_protocol_session_completion' else '' end from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not in ('pg_catalog','information_schema') and p.prosrc ~ '(product_event_kind|record_protocol_completions|tg_protocol_session_completion)' and p.proname not in ('product_event_kind','record_protocol_completions','tg_protocol_session_completion')
union all
select 'policy', pol.polname, pol.polrelid::regclass::text, null, null, 'match' from pg_policy pol where coalesce(pg_get_expr(pol.polqual,pol.polrelid),'') || coalesce(pg_get_expr(pol.polwithcheck,pol.polrelid),'') ~ '(product_event_kind|record_protocol_completions)'
union all
select 'default/generated', a.attname, ad.adrelid::regclass::text, a.attgenerated::text, null, 'match' from pg_attrdef ad join pg_attribute a on a.attrelid=ad.adrelid and a.attnum=ad.adnum where pg_get_expr(ad.adbin, ad.adrelid) ~ '(product_event_kind|record_protocol_completions)'
union all
select 'constraint', c.conname, c.conrelid::regclass::text, c.contype::text, null, 'match' from pg_constraint c where c.conbin is not null and pg_get_expr(c.conbin, c.conrelid) ~ '(product_event_kind|record_protocol_completions)'
union all
select 'index', i.indexrelid::regclass::text, i.indrelid::regclass::text, null, null, 'match' from pg_index i where coalesce(pg_get_expr(i.indexprs,i.indrelid),'') || coalesce(pg_get_expr(i.indpred,i.indrelid),'') ~ '(product_event_kind|record_protocol_completions)'
union all
select 'view', c.oid::regclass::text, null, c.relkind::text, null, 'match' from pg_class c where c.relkind in ('v','m') and pg_get_viewdef(c.oid) ~ '(product_event_kind|record_protocol_completions)'
union all
select 'cron', j.jobid::text, j.jobname, null, null, 'match' from cron.job j where j.command ~ '(product_event_kind|record_protocol_completions|tg_protocol_session_completion)'
order by 1,2;
```
Result (verbatim; the tool returned the pg_depend description cut short as shown):
```
[{"kind":"pg_depend","name":"pg_trigger:trigger zz_pc_protocol_session on table protocol_ses","on_table":null,"enabled":"n","detail":null,"refs":"tg_protocol_session_completion"},{"kind":"trigger","name":"zz_pc_protocol_session","on_table":"protocol_sessions","enabled":"O","detail":"AFTER INSERT OR UPDATE FOR EACH ROW","refs":"tg_protocol_session_completion"}]
```
Summary: one trigger, zz_pc_protocol_session on public.protocol_sessions, AFTER INSERT OR UPDATE FOR EACH ROW, enabled (O). Nothing else depends on or calls any of the 3: 0 function bodies, 0 policies, 0 defaults/generated columns, 0 check constraints, 0 index expressions, 0 views, 0 cron jobs. (SQL-standard bodies would show in pg_depend; none do.)

### 3c. Role grant matrix, migration head, triggers on protocol_sessions and protocol_completions

SQL:
```sql
select 'grant' as k, f.sig as a, r.rolname::text as b, has_function_privilege(r.rolname, f.sig, 'EXECUTE')::text as c from (values ('public.product_event_kind(text)'),('public.record_protocol_completions(uuid,uuid,text,uuid[])'),('public.tg_protocol_session_completion()')) f(sig) cross join (select rolname from pg_roles where rolname in ('anon','authenticated','service_role','postgres')) r
union all select 'migration_head', version, name, null from (select version, name from supabase_migrations.schema_migrations order by version desc limit 2) m
union all select 'trigger_on_protocol_completions', t.tgname::text, p.oid::regprocedure::text, (case when p.prosecdef then 'DEFINER' else 'INVOKER' end) || ' owner=' || pg_get_userbyid(p.proowner) || ' enabled=' || t.tgenabled::text from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid='public.protocol_completions'::regclass and not t.tgisinternal
union all select 'triggers_on_protocol_sessions', t.tgname::text, p.oid::regprocedure::text, (case when p.prosecdef then 'DEFINER' else 'INVOKER' end) || ' owner=' || pg_get_userbyid(p.proowner) || ' enabled=' || t.tgenabled::text from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid='public.protocol_sessions'::regclass and not t.tgisinternal
order by 1,2,3;
```
(The first attempt failed with `ERROR: 42725: operator is not unique: text || "char"` on tgenabled. Reran with ::text casts as above.)
Result (verbatim):
```
[{"k":"grant","a":"public.product_event_kind(text)","b":"anon","c":"false"},{"k":"grant","a":"public.product_event_kind(text)","b":"authenticated","c":"false"},{"k":"grant","a":"public.product_event_kind(text)","b":"postgres","c":"true"},{"k":"grant","a":"public.product_event_kind(text)","b":"service_role","c":"true"},{"k":"grant","a":"public.record_protocol_completions(uuid,uuid,text,uuid[])","b":"anon","c":"false"},{"k":"grant","a":"public.record_protocol_completions(uuid,uuid,text,uuid[])","b":"authenticated","c":"false"},{"k":"grant","a":"public.record_protocol_completions(uuid,uuid,text,uuid[])","b":"postgres","c":"true"},{"k":"grant","a":"public.record_protocol_completions(uuid,uuid,text,uuid[])","b":"service_role","c":"true"},{"k":"grant","a":"public.tg_protocol_session_completion()","b":"anon","c":"false"},{"k":"grant","a":"public.tg_protocol_session_completion()","b":"authenticated","c":"false"},{"k":"grant","a":"public.tg_protocol_session_completion()","b":"postgres","c":"true"},{"k":"grant","a":"public.tg_protocol_session_completion()","b":"service_role","c":"true"},{"k":"migration_head","a":"20261117010702","b":"p1_18_assessment_feedback","c":null},{"k":"migration_head","a":"20261117012431","b":"p1_22_revoke_anon_execute","c":null},{"k":"triggers_on_protocol_sessions","a":"zz_pc_protocol_session","b":"tg_protocol_session_completion()","c":"DEFINER owner=postgres enabled=O"},{"k":"triggers_on_protocol_sessions","a":"zz_pe_protocol_session","b":"tg_pe_protocol_session()","c":"DEFINER owner=postgres enabled=O"}]
```
Summary: grants as intended (anon false, authenticated false, service_role true, postgres true on all 3). Head 20261117012431. protocol_completions has 0 user triggers, so the definer trigger's INSERT fires nothing nested. The other protocol_sessions trigger, zz_pe_protocol_session, is DEFINER/postgres, and its body doesn't name the 3 functions (3b prosrc grep = 0 rows).

## 4. Proof without writes (one execute_sql, rolled back, no rows inserted)

SQL:
```sql
BEGIN; SET LOCAL ROLE authenticated; SELECT current_user AS role_now, has_function_privilege('public.product_event_kind(text)','EXECUTE') AS product_event_kind, has_function_privilege('public.record_protocol_completions(uuid,uuid,text,uuid[])','EXECUTE') AS record_protocol_completions, has_function_privilege('public.tg_protocol_session_completion()','EXECUTE') AS tg_protocol_session_completion, has_table_privilege('public.protocol_sessions','INSERT') AS ps_insert, has_table_privilege('public.protocol_sessions','UPDATE') AS ps_update; ROLLBACK;
```
Result (verbatim):
```
[{"role_now":"authenticated","product_event_kind":false,"record_protocol_completions":false,"tg_protocol_session_completion":false,"ps_insert":true,"ps_update":true}]
```

## 5. Reasoning

1. Client paths: the only signed-in path that touches these functions is the protocol_sessions upsert in MyProtocol.tsx (and the r3/r4 SessionFeel select, which is read-only). That INSERT/UPDATE fires zz_pc_protocol_session. Authenticated keeps INSERT/UPDATE on protocol_sessions (section 4).
2. Postgres checks EXECUTE on the trigger function at CREATE TRIGGER, not when the trigger fires, so losing EXECUTE on tg_protocol_session_completion doesn't block the trigger.
3. The trigger function is SECURITY DEFINER, owned by postgres, so its body runs as postgres. It calls neither INVOKER function (record_protocol_completions, product_event_kind). Even if it did, it would call them as postgres, which keeps EXECUTE.
4. No RLS policy, default, generated column, check constraint, index, view or other function calls product_event_kind or record_protocol_completions, so no signed-in statement evaluates them as the invoking role.
5. No client (live, r3, r4) and no edge function (40/40) calls any of the 3 by rpc or by name. Nothing breaks for authenticated callers.

## 6. Decision

Change nothing. Rollback NOT applied. For the record, the standby rollback file `supabase/migrations/20261117012431_p1_22_revoke_anon_execute.rollback.sql.txt` at romrxbjj-v2 0863bb18 is sha256 0d839238b643b43b2c6ef97e77dcd34548b47065e19cbbae1b76f23c0fb5e363 (`git show 0863bb18:<path> | sha256sum`, matches).

## 7. Resume-check SQL (8:33 PM ET)

```sql
select now() at time zone 'America/New_York' as et_now, p.oid::regprocedure::text as fn, p.proacl::text as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('product_event_kind','record_protocol_completions','tg_protocol_session_completion') order by 2;
```
```
[{"et_now":"2026-11-16 20:33:13.431321","fn":"product_event_kind(text)","acl":"{postgres=X/postgres,service_role=X/postgres}"},{"et_now":"2026-11-16 20:33:13.431321","fn":"record_protocol_completions(uuid,uuid,text,uuid[])","acl":"{postgres=X/postgres,service_role=X/postgres}"},{"et_now":"2026-11-16 20:33:13.431321","fn":"tg_protocol_session_completion()","acl":"{postgres=X/postgres,service_role=X/postgres}"}]
```
