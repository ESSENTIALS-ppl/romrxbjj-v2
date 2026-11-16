# P1-27 policy-by-policy list

Generated from live `get_advisors(performance)` (75 auth_rls_initplan, 258 multiple_permissive_policies, 4 duplicate_index) and `pg_policies` on 2026-11-15 about 8:52 PM ET (America/New_York).
Unwrapped or `current_setting()` policies wrapped: **75**. Advisor count is 75 because some already-wrapped `auth.uid()` policies still have unwrapped `current_setting()`, and the linter lists each such policy.
Merge groups (same table + command + role set, permissive, 2+ policies): **15** groups covering **36** policies. The 258 advisor findings are those groups expanded across anon/authenticated (and ALL expanded to four actions).
Merges OR the existing predicates (same as today's permissive behavior). Nothing is dropped from a USING or WITH CHECK expression.

## Wrap (recreate policy, same name)

| Schema | Table | Policy | Command | Roles | Why |
|---|---|---|---|---|---|
| public | account_deletion_requests | account_deletion_requests: owner read | SELECT | authenticated | unwrapped auth.*() |
| public | alert_dismissals | alert_dismissals: service role | ALL | public | unwrapped current_setting() (then merged, see below) |
| public | alert_dismissals | alert_dismissals_own | ALL | public | unwrapped auth.*() (then merged, see below) |
| public | assessments | assessments: service role | ALL | public | unwrapped current_setting() (then merged, see below) |
| public | assessments | assessments_insert_own | INSERT | public | unwrapped auth.*() (then merged, see below) |
| public | assessments | assessments_select_own | SELECT | public | unwrapped auth.*() (then merged, see below) |
| public | assessments | assessments_service_role_all | ALL | public | unwrapped auth.*() (then merged, see below) |
| public | assessments | assessments_user_select | SELECT | public | unwrapped auth.*() (then merged, see below) |
| public | assessments | coaches_insert_assessments | INSERT | public | unwrapped auth.*() (then merged, see below) |
| public | assessments | coaches_select_assessments | SELECT | public | unwrapped auth.*() (then merged, see below) |
| public | athlete_injuries | Coaches manage athlete injuries | ALL | public | unwrapped auth.*() |
| public | athletes | athletes_select_own | SELECT | public | unwrapped auth.*() (then merged, see below) |
| public | athletes | athletes_service_role_all | ALL | public | unwrapped auth.*() |
| public | athletes | athletes_update_own | UPDATE | public | unwrapped auth.*() |
| public | athletes | coaches_select_athletes | SELECT | public | unwrapped auth.*() (then merged, see below) |
| public | attendance | attendance_athlete_read | SELECT | public | unwrapped auth.*() |
| public | attendance | attendance_coach | ALL | public | unwrapped auth.*() (then merged, see below) |
| public | attendance | attendance_service | ALL | public | unwrapped current_setting() (then merged, see below) |
| public | body_metrics | body_metrics_owner_all | ALL | public | unwrapped auth.*() |
| public | coach_assignments | assignments_athlete | SELECT | public | unwrapped auth.*() |
| public | coach_assignments | assignments_athlete_complete | UPDATE | public | unwrapped auth.*() |
| public | coach_assignments | assignments_coach | ALL | public | unwrapped auth.*() |
| public | coach_competitors | competitors_athlete_read | SELECT | public | unwrapped auth.*() |
| public | coach_competitors | competitors_coach | ALL | public | unwrapped auth.*() (then merged, see below) |
| public | coach_competitors | competitors_service | ALL | public | unwrapped current_setting() (then merged, see below) |
| public | coach_journal_notes | Coaches manage own journal | ALL | public | unwrapped auth.*() |
| public | coach_notes | coach_notes_own | ALL | public | unwrapped auth.*() |
| public | coach_teaching_log | Coaches manage own teaching log | ALL | public | unwrapped auth.*() |
| public | coach_video_feedback | video_athlete | SELECT | public | unwrapped auth.*() |
| public | coach_video_feedback | video_coach | ALL | public | unwrapped auth.*() |
| public | coaches | coaches: service role | ALL | public | unwrapped current_setting() (then merged, see below) |
| public | coaches | coaches_own | ALL | public | unwrapped auth.*() (then merged, see below) |
| public | consents | consents_insert_own | INSERT | public | unwrapped auth.*() (then merged, see below) |
| public | consents | consents_select_own | SELECT | public | unwrapped auth.*() (then merged, see below) |
| public | consents | consents_service_role_all | ALL | public | unwrapped auth.*() |
| public | drill_sessions | drill_sessions_coach | SELECT | public | unwrapped auth.*() |
| public | drill_sessions | drill_sessions_self | ALL | public | unwrapped auth.*() |
| public | exercises | exercises: service role write | ALL | public | unwrapped current_setting() |
| public | game_plans | game_plans_coach | SELECT | public | unwrapped auth.*() |
| public | game_plans | game_plans_self | ALL | public | unwrapped auth.*() |
| public | joint_scores | joint_scores: service role | ALL | public | unwrapped current_setting() |
| public | leads | leads_claim_unclaimed | UPDATE | authenticated | unwrapped auth.*() |
| public | leads | leads_select_owner_after_claim | SELECT | authenticated | unwrapped auth.*() |
| public | mesocycles | own mesocycles | ALL | public | unwrapped auth.*() |
| public | notification_preferences | notif_self | ALL | public | unwrapped auth.*() |
| public | pr_records | pr_records_owner_all | ALL | public | unwrapped auth.*() |
| public | progress_photos | progress_photos_owner_all | ALL | public | unwrapped auth.*() |
| public | protocol_completions | completions_coach_read | SELECT | public | unwrapped auth.*() |
| public | protocol_completions | completions_own | ALL | public | unwrapped auth.*() |
| public | protocol_sessions | ps_coach | SELECT | public | unwrapped auth.*() |
| public | protocol_sessions | ps_self | ALL | public | unwrapped auth.*() |
| public | protocols | protocols: service role | ALL | public | unwrapped current_setting() |
| public | rombot_knowledge | rombot_knowledge_read_sport_entitled | SELECT | authenticated | unwrapped auth.*() |
| public | schools | schools: service role | ALL | public | unwrapped current_setting() (then merged, see below) |
| public | schools | schools_admin_all | ALL | public | unwrapped auth.*() (then merged, see below) |
| public | schools | schools_authenticated_read | SELECT | public | unwrapped auth.*() |
| public | sport_config | sport_config_write_service_only | ALL | public | unwrapped auth.*() |
| public | sport_entitlements | sport_entitlements_self_select | SELECT | public | unwrapped auth.*() |
| public | technique_eligibility | technique_eligibility: service role | ALL | public | unwrapped current_setting() |
| public | technique_eligibility | technique_eligibility_user_select | SELECT | public | unwrapped auth.*() (then merged, see below) |
| public | techniques | techniques: service role write | ALL | public | unwrapped current_setting() |
| public | user_technique_competency | utc_delete_own | DELETE | public | unwrapped auth.*() |
| public | user_technique_competency | utc_insert_own | INSERT | public | unwrapped auth.*() |
| public | user_technique_competency | utc_select_own | SELECT | public | unwrapped auth.*() |
| public | user_technique_competency | utc_update_own | UPDATE | public | unwrapped auth.*() |
| public | users | users: service role full access | ALL | public | unwrapped current_setting() |
| public | workout_exercises | wex_delete | DELETE | authenticated | unwrapped auth.*() |
| public | workout_exercises | wex_insert | INSERT | authenticated | unwrapped auth.*() |
| public | workout_exercises | wex_select | SELECT | authenticated | unwrapped auth.*() |
| public | workout_exercises | wex_update | UPDATE | authenticated | unwrapped auth.*() |
| public | workout_sets | workout_sets_owner_all | ALL | public | unwrapped auth.*() |
| public | workouts | workouts_delete | DELETE | authenticated | unwrapped auth.*() |
| public | workouts | workouts_insert | INSERT | authenticated | unwrapped auth.*() |
| public | workouts | workouts_select | SELECT | authenticated | unwrapped auth.*() |
| public | workouts | workouts_update | UPDATE | authenticated | unwrapped auth.*() |

## Merge (drop originals, create one OR policy)

| Table | Command | Roles | Dropped policies | New policy |
|---|---|---|---|---|
| public.alert_dismissals | ALL | public | alert_dismissals: coach owns, alert_dismissals: service role, alert_dismissals_own | p1_27_merged_alert_dismissals_all |
| public.assessments | ALL | public | assessments: self read/write, assessments: service role, assessments_service_role_all | p1_27_merged_assessments_all |
| public.assessments | INSERT | public | assessments_insert_own, coaches_insert_assessments | p1_27_merged_assessments_insert |
| public.assessments | SELECT | public | assessments: linked coach reads, assessments_select_own, assessments_user_select, coaches_select_assessments | p1_27_merged_assessments_select |
| public.athletes | SELECT | public | athletes_select_own, coaches_select_athletes | p1_27_merged_athletes_select |
| public.attendance | ALL | public | attendance_coach, attendance_service | p1_27_merged_attendance_all |
| public.coach_competitors | ALL | public | competitors_coach, competitors_service | p1_27_merged_coach_competitors_all |
| public.coaches | ALL | public | coaches: service role, coaches_own | p1_27_merged_coaches_all |
| public.consents | INSERT | public | consents_insert_own, consents_self_insert | p1_27_merged_consents_insert |
| public.consents | SELECT | public | consents_select_own, consents_self_read | p1_27_merged_consents_select |
| public.joint_scores | SELECT | public | joint_scores: athlete reads own, joint_scores: linked coach reads | p1_27_merged_joint_scores_select |
| public.protocols | SELECT | public | protocols: linked coach reads, protocols: self read | p1_27_merged_protocols_select |
| public.schools | ALL | public | schools: admin owns, schools: service role, schools_admin_all | p1_27_merged_schools_all |
| public.technique_eligibility | SELECT | public | technique_eligibility: linked coach reads, technique_eligibility: self read, technique_eligibility_user_select | p1_27_merged_technique_eligibility_select |
| public.users | SELECT | public | users: school admin reads school users, users: self read | p1_27_merged_users_select |

## Duplicate indexes dropped

| Table | Drop | Keep | Reason |
|---|---|---|---|
| public.coach_notes | constraint `coach_notes_coach_id_athlete_id_key` | `coach_notes_coach_athlete_unique` | identical unique (coach_id, athlete_id); keep the explicit name |
| public.consents | index `consents_user_id_idx` | `idx_consents_user` | identical btree(user_id) |
| public.technique_eligibility | index `eligibility_athlete_id_idx` | `technique_eligibility_athlete_id_idx` | identical btree(athlete_id); keep table-prefixed name |
| public.techniques | index `techniques_sport_idx` | `idx_techniques_sport` | identical btree(sport) |

Not in this migration (out of scope): 13 unindexed foreign keys, 10 tables without a primary key, 21 unused indexes, `ops.feature_flags` RLS disabled, `backup_tables.product_events_cleanup16_20261020` RLS disabled, and the held `coach_roster` security definer view (P1-29 HOLD).
