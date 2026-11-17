-- P1-27 RLS performance cleanup (UNAPPLIED)
-- Generated 2026-11-15 from live get_advisors(performance) + pg_policies on cqzvqzwwevnflinxgnpp.
-- Advisor tonight: 75 auth_rls_initplan, 258 multiple_permissive_policies, 4 duplicate_index.
-- Do not apply until Margot has a sha gate line and Vera's precheck PASS, relayed by Grant.
-- Wrapping auth.uid()/auth.role()/auth.jwt()/current_setting() as (select ...).
-- Merging is OR of existing USING / WITH CHECK expressions (already the permissive semantics).
-- Service-role predicates stay in the OR; they are not widened.

BEGIN;

-- ---------- 1. Wrap initplan-sensitive calls in existing policies ----------
DROP POLICY IF EXISTS "account_deletion_requests: owner read" ON "public"."account_deletion_requests";
CREATE POLICY "account_deletion_requests: owner read" ON "public"."account_deletion_requests" FOR SELECT TO "authenticated" USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches manage athlete injuries" ON "public"."athlete_injuries";
CREATE POLICY "Coaches manage athlete injuries" ON "public"."athlete_injuries" FOR ALL TO PUBLIC USING ((coach_id IN ( SELECT coaches.id
   FROM coaches
  WHERE (coaches.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "athletes_service_role_all" ON "public"."athletes";
CREATE POLICY "athletes_service_role_all" ON "public"."athletes" FOR ALL TO PUBLIC USING ((((select auth.jwt()) ->> 'role'::text) = 'service_role'::text));

DROP POLICY IF EXISTS "athletes_update_own" ON "public"."athletes";
CREATE POLICY "athletes_update_own" ON "public"."athletes" FOR UPDATE TO PUBLIC USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "attendance_athlete_read" ON "public"."attendance";
CREATE POLICY "attendance_athlete_read" ON "public"."attendance" FOR SELECT TO PUBLIC USING (((select auth.uid()) = athlete_user_id));

DROP POLICY IF EXISTS "body_metrics_owner_all" ON "public"."body_metrics";
CREATE POLICY "body_metrics_owner_all" ON "public"."body_metrics" FOR ALL TO PUBLIC USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "assignments_athlete" ON "public"."coach_assignments";
CREATE POLICY "assignments_athlete" ON "public"."coach_assignments" FOR SELECT TO PUBLIC USING (((select auth.uid()) = athlete_user_id));

DROP POLICY IF EXISTS "assignments_athlete_complete" ON "public"."coach_assignments";
CREATE POLICY "assignments_athlete_complete" ON "public"."coach_assignments" FOR UPDATE TO PUBLIC USING (((select auth.uid()) = athlete_user_id));

DROP POLICY IF EXISTS "assignments_coach" ON "public"."coach_assignments";
CREATE POLICY "assignments_coach" ON "public"."coach_assignments" FOR ALL TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM coaches c
  WHERE ((c.id = coach_assignments.coach_id) AND (c.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "competitors_athlete_read" ON "public"."coach_competitors";
CREATE POLICY "competitors_athlete_read" ON "public"."coach_competitors" FOR SELECT TO PUBLIC USING (((select auth.uid()) = athlete_user_id));

DROP POLICY IF EXISTS "Coaches manage own journal" ON "public"."coach_journal_notes";
CREATE POLICY "Coaches manage own journal" ON "public"."coach_journal_notes" FOR ALL TO PUBLIC USING ((coach_id IN ( SELECT coaches.id
   FROM coaches
  WHERE (coaches.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "coach_notes_own" ON "public"."coach_notes";
CREATE POLICY "coach_notes_own" ON "public"."coach_notes" FOR ALL TO PUBLIC USING ((coach_id IN ( SELECT coaches.id
   FROM coaches
  WHERE (coaches.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Coaches manage own teaching log" ON "public"."coach_teaching_log";
CREATE POLICY "Coaches manage own teaching log" ON "public"."coach_teaching_log" FOR ALL TO PUBLIC USING ((coach_id IN ( SELECT coaches.id
   FROM coaches
  WHERE (coaches.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "video_athlete" ON "public"."coach_video_feedback";
CREATE POLICY "video_athlete" ON "public"."coach_video_feedback" FOR SELECT TO PUBLIC USING (((select auth.uid()) = athlete_user_id));

DROP POLICY IF EXISTS "video_coach" ON "public"."coach_video_feedback";
CREATE POLICY "video_coach" ON "public"."coach_video_feedback" FOR ALL TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM coaches c
  WHERE ((c.id = coach_video_feedback.coach_id) AND (c.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "consents_service_role_all" ON "public"."consents";
CREATE POLICY "consents_service_role_all" ON "public"."consents" FOR ALL TO PUBLIC USING ((((select auth.jwt()) ->> 'role'::text) = 'service_role'::text));

DROP POLICY IF EXISTS "drill_sessions_coach" ON "public"."drill_sessions";
CREATE POLICY "drill_sessions_coach" ON "public"."drill_sessions" FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM (athletes a
     JOIN coaches c ON ((c.id = a.coach_id)))
  WHERE ((a.user_id = drill_sessions.user_id) AND (c.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "drill_sessions_self" ON "public"."drill_sessions";
CREATE POLICY "drill_sessions_self" ON "public"."drill_sessions" FOR ALL TO PUBLIC USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "exercises: service role write" ON "public"."exercises";
CREATE POLICY "exercises: service role write" ON "public"."exercises" FOR ALL TO PUBLIC USING (
CASE
    WHEN ((select current_setting('role'::text)) = 'service_role'::text) THEN true
    ELSE false
END) WITH CHECK (((select current_setting('role'::text)) = 'service_role'::text));

DROP POLICY IF EXISTS "game_plans_coach" ON "public"."game_plans";
CREATE POLICY "game_plans_coach" ON "public"."game_plans" FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM (athletes a
     JOIN coaches c ON ((c.id = a.coach_id)))
  WHERE ((a.user_id = game_plans.user_id) AND (c.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "game_plans_self" ON "public"."game_plans";
CREATE POLICY "game_plans_self" ON "public"."game_plans" FOR ALL TO PUBLIC USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "joint_scores: service role" ON "public"."joint_scores";
CREATE POLICY "joint_scores: service role" ON "public"."joint_scores" FOR ALL TO PUBLIC USING (((select current_setting('role'::text)) = 'service_role'::text));

DROP POLICY IF EXISTS "leads_claim_unclaimed" ON "public"."leads";
CREATE POLICY "leads_claim_unclaimed" ON "public"."leads" FOR UPDATE TO "authenticated" USING (((converted_user_id IS NULL) AND (lower(email) = lower(COALESCE(((select auth.jwt()) ->> 'email'::text), ''::text))))) WITH CHECK ((converted_user_id = (select auth.uid())));

DROP POLICY IF EXISTS "leads_select_owner_after_claim" ON "public"."leads";
CREATE POLICY "leads_select_owner_after_claim" ON "public"."leads" FOR SELECT TO "authenticated" USING ((converted_user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own mesocycles" ON "public"."mesocycles";
CREATE POLICY "own mesocycles" ON "public"."mesocycles" FOR ALL TO PUBLIC USING (((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "notif_self" ON "public"."notification_preferences";
CREATE POLICY "notif_self" ON "public"."notification_preferences" FOR ALL TO PUBLIC USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "pr_records_owner_all" ON "public"."pr_records";
CREATE POLICY "pr_records_owner_all" ON "public"."pr_records" FOR ALL TO PUBLIC USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "progress_photos_owner_all" ON "public"."progress_photos";
CREATE POLICY "progress_photos_owner_all" ON "public"."progress_photos" FOR ALL TO PUBLIC USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "completions_coach_read" ON "public"."protocol_completions";
CREATE POLICY "completions_coach_read" ON "public"."protocol_completions" FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM athletes a
  WHERE ((a.user_id = protocol_completions.user_id) AND (a.coach_id IN ( SELECT coaches.id
           FROM coaches
          WHERE (coaches.user_id = (select auth.uid()))))))));

DROP POLICY IF EXISTS "completions_own" ON "public"."protocol_completions";
CREATE POLICY "completions_own" ON "public"."protocol_completions" FOR ALL TO PUBLIC USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "ps_coach" ON "public"."protocol_sessions";
CREATE POLICY "ps_coach" ON "public"."protocol_sessions" FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM (athletes a
     JOIN coaches c ON ((c.id = a.coach_id)))
  WHERE ((a.user_id = protocol_sessions.user_id) AND (c.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "ps_self" ON "public"."protocol_sessions";
CREATE POLICY "ps_self" ON "public"."protocol_sessions" FOR ALL TO PUBLIC USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "protocols: service role" ON "public"."protocols";
CREATE POLICY "protocols: service role" ON "public"."protocols" FOR ALL TO PUBLIC USING (((select current_setting('role'::text)) = 'service_role'::text));

DROP POLICY IF EXISTS "rombot_knowledge_read_sport_entitled" ON "public"."rombot_knowledge";
CREATE POLICY "rombot_knowledge_read_sport_entitled" ON "public"."rombot_knowledge" FOR SELECT TO "authenticated" USING (((sport = 'general'::text) OR (sport = ANY (COALESCE(( SELECT users.platforms
   FROM users
  WHERE (users.id = (select auth.uid()))), ARRAY[]::text[])))));

DROP POLICY IF EXISTS "schools_authenticated_read" ON "public"."schools";
CREATE POLICY "schools_authenticated_read" ON "public"."schools" FOR SELECT TO PUBLIC USING (((select auth.role()) = 'authenticated'::text));

DROP POLICY IF EXISTS "sport_config_write_service_only" ON "public"."sport_config";
CREATE POLICY "sport_config_write_service_only" ON "public"."sport_config" FOR ALL TO PUBLIC USING (((select auth.role()) = 'service_role'::text)) WITH CHECK (((select auth.role()) = 'service_role'::text));

DROP POLICY IF EXISTS "sport_entitlements_self_select" ON "public"."sport_entitlements";
CREATE POLICY "sport_entitlements_self_select" ON "public"."sport_entitlements" FOR SELECT TO PUBLIC USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "technique_eligibility: service role" ON "public"."technique_eligibility";
CREATE POLICY "technique_eligibility: service role" ON "public"."technique_eligibility" FOR ALL TO PUBLIC USING (((select current_setting('role'::text)) = 'service_role'::text));

DROP POLICY IF EXISTS "techniques: service role write" ON "public"."techniques";
CREATE POLICY "techniques: service role write" ON "public"."techniques" FOR ALL TO PUBLIC USING (
CASE
    WHEN ((select current_setting('role'::text)) = 'service_role'::text) THEN true
    ELSE false
END) WITH CHECK (((select current_setting('role'::text)) = 'service_role'::text));

DROP POLICY IF EXISTS "utc_delete_own" ON "public"."user_technique_competency";
CREATE POLICY "utc_delete_own" ON "public"."user_technique_competency" FOR DELETE TO PUBLIC USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "utc_insert_own" ON "public"."user_technique_competency";
CREATE POLICY "utc_insert_own" ON "public"."user_technique_competency" FOR INSERT TO PUBLIC WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "utc_select_own" ON "public"."user_technique_competency";
CREATE POLICY "utc_select_own" ON "public"."user_technique_competency" FOR SELECT TO PUBLIC USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "utc_update_own" ON "public"."user_technique_competency";
CREATE POLICY "utc_update_own" ON "public"."user_technique_competency" FOR UPDATE TO PUBLIC USING (((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "users: service role full access" ON "public"."users";
CREATE POLICY "users: service role full access" ON "public"."users" FOR ALL TO PUBLIC USING (((select current_setting('role'::text)) = 'service_role'::text));

DROP POLICY IF EXISTS "wex_delete" ON "public"."workout_exercises";
CREATE POLICY "wex_delete" ON "public"."workout_exercises" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = workout_exercises.workout_id) AND (w.user_id = (select auth.uid())) AND (w.is_template = false)))));

DROP POLICY IF EXISTS "wex_insert" ON "public"."workout_exercises";
CREATE POLICY "wex_insert" ON "public"."workout_exercises" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = workout_exercises.workout_id) AND (w.user_id = (select auth.uid())) AND (w.is_template = false)))));

DROP POLICY IF EXISTS "wex_select" ON "public"."workout_exercises";
CREATE POLICY "wex_select" ON "public"."workout_exercises" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = workout_exercises.workout_id) AND ((w.is_template = true) OR (w.user_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "wex_update" ON "public"."workout_exercises";
CREATE POLICY "wex_update" ON "public"."workout_exercises" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = workout_exercises.workout_id) AND (w.user_id = (select auth.uid())) AND (w.is_template = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = workout_exercises.workout_id) AND (w.user_id = (select auth.uid())) AND (w.is_template = false)))));

DROP POLICY IF EXISTS "workout_sets_owner_all" ON "public"."workout_sets";
CREATE POLICY "workout_sets_owner_all" ON "public"."workout_sets" FOR ALL TO PUBLIC USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "workouts_delete" ON "public"."workouts";
CREATE POLICY "workouts_delete" ON "public"."workouts" FOR DELETE TO "authenticated" USING (((user_id = (select auth.uid())) AND (is_template = false)));

DROP POLICY IF EXISTS "workouts_insert" ON "public"."workouts";
CREATE POLICY "workouts_insert" ON "public"."workouts" FOR INSERT TO "authenticated" WITH CHECK (((user_id = (select auth.uid())) AND (is_template = false)));

DROP POLICY IF EXISTS "workouts_select" ON "public"."workouts";
CREATE POLICY "workouts_select" ON "public"."workouts" FOR SELECT TO "authenticated" USING (((is_template = true) OR (user_id = (select auth.uid()))));

DROP POLICY IF EXISTS "workouts_update" ON "public"."workouts";
CREATE POLICY "workouts_update" ON "public"."workouts" FOR UPDATE TO "authenticated" USING (((user_id = (select auth.uid())) AND (is_template = false))) WITH CHECK (((user_id = (select auth.uid())) AND (is_template = false)));

-- ---------- 2. Merge duplicate permissive policies (same table, command, roles) ----------
-- merge alert_dismissals: coach owns, alert_dismissals: service role, alert_dismissals_own -> p1_27_merged_alert_dismissals_all
DROP POLICY IF EXISTS "alert_dismissals: coach owns" ON "public"."alert_dismissals";
DROP POLICY IF EXISTS "alert_dismissals: service role" ON "public"."alert_dismissals";
DROP POLICY IF EXISTS "alert_dismissals_own" ON "public"."alert_dismissals";
CREATE POLICY "p1_27_merged_alert_dismissals_all" ON "public"."alert_dismissals" FOR ALL TO PUBLIC USING (((EXISTS ( SELECT 1
   FROM coaches c
  WHERE ((c.id = alert_dismissals.coach_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) OR (((select current_setting('role'::text)) = 'service_role'::text)) OR ((coach_id IN ( SELECT coaches.id
   FROM coaches
  WHERE (coaches.user_id = (select auth.uid())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM coaches c
  WHERE ((c.id = alert_dismissals.coach_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) OR (((select current_setting('role'::text)) = 'service_role'::text)) OR ((coach_id IN ( SELECT coaches.id
   FROM coaches
  WHERE (coaches.user_id = (select auth.uid()))))));

-- merge assessments: self read/write, assessments: service role, assessments_service_role_all -> p1_27_merged_assessments_all
DROP POLICY IF EXISTS "assessments: self read/write" ON "public"."assessments";
DROP POLICY IF EXISTS "assessments: service role" ON "public"."assessments";
DROP POLICY IF EXISTS "assessments_service_role_all" ON "public"."assessments";
CREATE POLICY "p1_27_merged_assessments_all" ON "public"."assessments" FOR ALL TO PUBLIC USING (((( SELECT auth.uid() AS uid) = user_id)) OR (((select current_setting('role'::text)) = 'service_role'::text)) OR ((((select auth.jwt()) ->> 'role'::text) = 'service_role'::text))) WITH CHECK (((( SELECT auth.uid() AS uid) = user_id)) OR (((select current_setting('role'::text)) = 'service_role'::text)) OR ((((select auth.jwt()) ->> 'role'::text) = 'service_role'::text)));

-- merge assessments_insert_own, coaches_insert_assessments -> p1_27_merged_assessments_insert
DROP POLICY IF EXISTS "assessments_insert_own" ON "public"."assessments";
DROP POLICY IF EXISTS "coaches_insert_assessments" ON "public"."assessments";
CREATE POLICY "p1_27_merged_assessments_insert" ON "public"."assessments" FOR INSERT TO PUBLIC WITH CHECK (((EXISTS ( SELECT 1
   FROM athletes a
  WHERE ((a.id = assessments.athlete_id) AND (a.user_id = (select auth.uid())))))) OR ((EXISTS ( SELECT 1
   FROM (athletes a
     JOIN coaches c ON ((c.id = a.coach_id)))
  WHERE ((a.id = assessments.athlete_id) AND (c.user_id = (select auth.uid())))))));

-- merge assessments: linked coach reads, assessments_select_own, assessments_user_select, coaches_select_assessments -> p1_27_merged_assessments_select
DROP POLICY IF EXISTS "assessments: linked coach reads" ON "public"."assessments";
DROP POLICY IF EXISTS "assessments_select_own" ON "public"."assessments";
DROP POLICY IF EXISTS "assessments_user_select" ON "public"."assessments";
DROP POLICY IF EXISTS "coaches_select_assessments" ON "public"."assessments";
CREATE POLICY "p1_27_merged_assessments_select" ON "public"."assessments" FOR SELECT TO PUBLIC USING ((coach_linked_to_user(user_id)) OR ((EXISTS ( SELECT 1
   FROM athletes a
  WHERE ((a.id = assessments.athlete_id) AND (a.user_id = (select auth.uid())))))) OR ((user_id = (select auth.uid()))) OR ((EXISTS ( SELECT 1
   FROM (athletes a
     JOIN coaches c ON ((c.id = a.coach_id)))
  WHERE ((a.id = assessments.athlete_id) AND (c.user_id = (select auth.uid())))))));

-- merge athletes_select_own, coaches_select_athletes -> p1_27_merged_athletes_select
DROP POLICY IF EXISTS "athletes_select_own" ON "public"."athletes";
DROP POLICY IF EXISTS "coaches_select_athletes" ON "public"."athletes";
CREATE POLICY "p1_27_merged_athletes_select" ON "public"."athletes" FOR SELECT TO PUBLIC USING ((((select auth.uid()) = user_id)) OR ((EXISTS ( SELECT 1
   FROM coaches c
  WHERE ((c.user_id = (select auth.uid())) AND (c.id = athletes.coach_id))))));

-- merge attendance_coach, attendance_service -> p1_27_merged_attendance_all
DROP POLICY IF EXISTS "attendance_coach" ON "public"."attendance";
DROP POLICY IF EXISTS "attendance_service" ON "public"."attendance";
CREATE POLICY "p1_27_merged_attendance_all" ON "public"."attendance" FOR ALL TO PUBLIC USING (((EXISTS ( SELECT 1
   FROM coaches c
  WHERE ((c.id = attendance.coach_id) AND (c.user_id = (select auth.uid())))))) OR (((select current_setting('role'::text)) = 'service_role'::text))) WITH CHECK (((EXISTS ( SELECT 1
   FROM coaches c
  WHERE ((c.id = attendance.coach_id) AND (c.user_id = (select auth.uid())))))) OR (((select current_setting('role'::text)) = 'service_role'::text)));

-- merge competitors_coach, competitors_service -> p1_27_merged_coach_competitors_all
DROP POLICY IF EXISTS "competitors_coach" ON "public"."coach_competitors";
DROP POLICY IF EXISTS "competitors_service" ON "public"."coach_competitors";
CREATE POLICY "p1_27_merged_coach_competitors_all" ON "public"."coach_competitors" FOR ALL TO PUBLIC USING (((EXISTS ( SELECT 1
   FROM coaches c
  WHERE ((c.id = coach_competitors.coach_id) AND (c.user_id = (select auth.uid())))))) OR (((select current_setting('role'::text)) = 'service_role'::text))) WITH CHECK (((EXISTS ( SELECT 1
   FROM coaches c
  WHERE ((c.id = coach_competitors.coach_id) AND (c.user_id = (select auth.uid())))))) OR (((select current_setting('role'::text)) = 'service_role'::text)));

-- merge coaches: service role, coaches_own -> p1_27_merged_coaches_all
DROP POLICY IF EXISTS "coaches: service role" ON "public"."coaches";
DROP POLICY IF EXISTS "coaches_own" ON "public"."coaches";
CREATE POLICY "p1_27_merged_coaches_all" ON "public"."coaches" FOR ALL TO PUBLIC USING ((((select current_setting('role'::text)) = 'service_role'::text)) OR ((user_id = (select auth.uid())))) WITH CHECK ((((select current_setting('role'::text)) = 'service_role'::text)) OR ((user_id = (select auth.uid()))));

-- merge consents_insert_own, consents_self_insert -> p1_27_merged_consents_insert
DROP POLICY IF EXISTS "consents_insert_own" ON "public"."consents";
DROP POLICY IF EXISTS "consents_self_insert" ON "public"."consents";
CREATE POLICY "p1_27_merged_consents_insert" ON "public"."consents" FOR INSERT TO PUBLIC WITH CHECK ((((select auth.uid()) = user_id)) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- merge consents_select_own, consents_self_read -> p1_27_merged_consents_select
DROP POLICY IF EXISTS "consents_select_own" ON "public"."consents";
DROP POLICY IF EXISTS "consents_self_read" ON "public"."consents";
CREATE POLICY "p1_27_merged_consents_select" ON "public"."consents" FOR SELECT TO PUBLIC USING ((((select auth.uid()) = user_id)) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- merge joint_scores: athlete reads own, joint_scores: linked coach reads -> p1_27_merged_joint_scores_select
DROP POLICY IF EXISTS "joint_scores: athlete reads own" ON "public"."joint_scores";
DROP POLICY IF EXISTS "joint_scores: linked coach reads" ON "public"."joint_scores";
CREATE POLICY "p1_27_merged_joint_scores_select" ON "public"."joint_scores" FOR SELECT TO PUBLIC USING (((EXISTS ( SELECT 1
   FROM assessments a
  WHERE ((a.id = joint_scores.assessment_id) AND (a.user_id = ( SELECT auth.uid() AS uid)))))) OR (coach_linked_to_assessment(assessment_id)));

-- merge protocols: linked coach reads, protocols: self read -> p1_27_merged_protocols_select
DROP POLICY IF EXISTS "protocols: linked coach reads" ON "public"."protocols";
DROP POLICY IF EXISTS "protocols: self read" ON "public"."protocols";
CREATE POLICY "p1_27_merged_protocols_select" ON "public"."protocols" FOR SELECT TO PUBLIC USING ((coach_linked_to_user(user_id)) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- merge schools: admin owns, schools: service role, schools_admin_all -> p1_27_merged_schools_all
DROP POLICY IF EXISTS "schools: admin owns" ON "public"."schools";
DROP POLICY IF EXISTS "schools: service role" ON "public"."schools";
DROP POLICY IF EXISTS "schools_admin_all" ON "public"."schools";
CREATE POLICY "p1_27_merged_schools_all" ON "public"."schools" FOR ALL TO PUBLIC USING (((( SELECT auth.uid() AS uid) = admin_id)) OR (((select current_setting('role'::text)) = 'service_role'::text)) OR ((admin_id = (select auth.uid())))) WITH CHECK (((( SELECT auth.uid() AS uid) = admin_id)) OR (((select current_setting('role'::text)) = 'service_role'::text)) OR ((admin_id = (select auth.uid()))));

-- merge technique_eligibility: linked coach reads, technique_eligibility: self read, technique_eligibility_user_select -> p1_27_merged_technique_eligibility_select
DROP POLICY IF EXISTS "technique_eligibility: linked coach reads" ON "public"."technique_eligibility";
DROP POLICY IF EXISTS "technique_eligibility: self read" ON "public"."technique_eligibility";
DROP POLICY IF EXISTS "technique_eligibility_user_select" ON "public"."technique_eligibility";
CREATE POLICY "p1_27_merged_technique_eligibility_select" ON "public"."technique_eligibility" FOR SELECT TO PUBLIC USING ((coach_linked_to_user(user_id)) OR ((( SELECT auth.uid() AS uid) = user_id)) OR ((user_id = (select auth.uid()))));

-- merge users: school admin reads school users, users: self read -> p1_27_merged_users_select
DROP POLICY IF EXISTS "users: school admin reads school users" ON "public"."users";
DROP POLICY IF EXISTS "users: self read" ON "public"."users";
CREATE POLICY "p1_27_merged_users_select" ON "public"."users" FOR SELECT TO PUBLIC USING (((EXISTS ( SELECT 1
   FROM schools s
  WHERE ((s.admin_id = ( SELECT auth.uid() AS uid)) AND (s.id = users.school_id))))) OR ((( SELECT auth.uid() AS uid) = id)));

-- ---------- 3. Drop 4 duplicate indexes (advisor duplicate_index) ----------
-- Keep coach_notes_coach_athlete_unique (named unique constraint); drop auto-named identical unique.
ALTER TABLE public.coach_notes DROP CONSTRAINT IF EXISTS coach_notes_coach_id_athlete_id_key;
-- Keep idx_consents_user; drop identical btree(user_id).
DROP INDEX IF EXISTS public.consents_user_id_idx;
-- Keep technique_eligibility_athlete_id_idx (table-prefixed name); drop identical eligibility_athlete_id_idx.
DROP INDEX IF EXISTS public.eligibility_athlete_id_idx;
-- Keep idx_techniques_sport; drop identical techniques_sport_idx.
DROP INDEX IF EXISTS public.techniques_sport_idx;

COMMIT;
