-- Local-only fixture for recompute_user_eligibility tests (never run against prod).
DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; SET search_path TO public;
CREATE FUNCTION public.fmt_num(v numeric) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN v = trunc(v) THEN trunc(v)::bigint::text ELSE v::text END $$;
CREATE TABLE users (id uuid PRIMARY KEY, email text, sports_enabled text[]);
CREATE TABLE assessments (id uuid PRIMARY KEY, user_id uuid, athlete_id uuid, assessed_at timestamptz, created_at timestamptz DEFAULT now(),
  hip_er_l numeric, hip_er_r numeric, hip_ir_l numeric, hip_ir_r numeric, hip_abd_l numeric, hip_abd_r numeric, hip_flex_l numeric, hip_flex_r numeric,
  shoulder_er_l numeric, shoulder_er_r numeric, shoulder_flex_l numeric, shoulder_flex_r numeric, ankle_df_l numeric, ankle_df_r numeric,
  cervical_rot_l numeric, cervical_rot_r numeric, cervical_lat_l numeric, cervical_lat_r numeric,
  lumbar_flex numeric, lumbar_ext numeric, cervical_flex numeric, cervical_ext numeric);
CREATE TABLE techniques (id uuid PRIMARY KEY, code text, sport text, hip_er_min numeric, hip_ir_min numeric, hip_abd_min numeric, hip_flex_min numeric,
  shoulder_er_min numeric, shoulder_flex_min numeric, ankle_df_min numeric, cervical_rot_min numeric, cervical_lat_min numeric,
  lumbar_flex_min numeric, lumbar_ext_min numeric, cervical_flex_min numeric, cervical_ext_min numeric);
CREATE TABLE technique_eligibility (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, assessment_id uuid, technique_id uuid,
  tier text CONSTRAINT technique_eligibility_tier_check CHECK (tier = ANY (ARRAY['GREEN','YELLOW','RED'])), limiting_joints text[],
  created_at timestamptz DEFAULT now(), athlete_id uuid, technique_code text, computed_at timestamptz, flag text, sport text,
  UNIQUE (user_id, assessment_id, technique_id));
CREATE FUNCTION public.compute_joint_scores(p uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$; -- stub, out of scope
INSERT INTO users VALUES ('00000000-0000-0000-0000-000000000001','t@example.test',ARRAY['general','bjj']);
INSERT INTO assessments (id,user_id,assessed_at,hip_er_l,hip_er_r,shoulder_er_l,shoulder_er_r,shoulder_flex_l,shoulder_flex_r,ankle_df_l,ankle_df_r)
VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001',now(),20,40,75,90,128,150,4,7);
INSERT INTO techniques (id,code,sport,hip_er_min,shoulder_er_min,shoulder_flex_min,ankle_df_min,cervical_rot_min) VALUES
 ('00000000-0000-0000-0000-000000000101','NORULE','bjj',NULL,NULL,NULL,NULL,NULL),
 ('00000000-0000-0000-0000-000000000102','MISSING','bjj',10,NULL,NULL,NULL,70),
 ('00000000-0000-0000-0000-000000000103','SER_10_BELOW','bjj',NULL,85,NULL,NULL,NULL),
 ('00000000-0000-0000-0000-000000000104','SER_11_BELOW','bjj',NULL,86,NULL,NULL,NULL),
 ('00000000-0000-0000-0000-000000000105','HIPER_9_BELOW','bjj',29,NULL,NULL,NULL,NULL),
 ('00000000-0000-0000-0000-000000000106','SFLEX_12_BELOW','bjj',NULL,NULL,140,NULL,NULL),
 ('00000000-0000-0000-0000-000000000107','ANKLE_2CM','bjj',NULL,NULL,NULL,6,NULL),
 ('00000000-0000-0000-0000-000000000108','ANKLE_3CM','bjj',NULL,NULL,NULL,7,NULL),
 ('00000000-0000-0000-0000-000000000109','PASS','bjj',20,75,NULL,4,NULL),
 ('00000000-0000-0000-0000-000000000110','WORST_RED','bjj',20,75,140,4,NULL);
