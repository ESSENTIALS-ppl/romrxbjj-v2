\set ON_ERROR_STOP 1
SET search_path TO public;
SELECT public.recompute_user_eligibility('00000000-0000-0000-0000-000000000001');
DO $$
DECLARE exp jsonb := '{"NORULE":"GREY","MISSING":"GREY","SER_10_BELOW":"YELLOW","SER_11_BELOW":"RED","HIPER_9_BELOW":"YELLOW",
  "SFLEX_12_BELOW":"RED","ANKLE_2CM":"YELLOW","ANKLE_3CM":"RED","PASS":"GREEN","WORST_RED":"RED"}';
  k text; got text; bad text := '';
BEGIN
  FOR k IN SELECT jsonb_object_keys(exp) LOOP
    SELECT tier INTO got FROM technique_eligibility WHERE technique_code = k;
    IF got IS DISTINCT FROM exp->>k THEN bad := bad || format(' %s want %s got %s;', k, exp->>k, got); END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM technique_eligibility WHERE technique_code='MISSING' AND 'cervical_rot:not_measured(min 70)' = ANY(limiting_joints)) THEN bad := bad || ' MISSING limiting;'; END IF;
  IF NOT EXISTS (SELECT 1 FROM technique_eligibility WHERE technique_code='WORST_RED' AND limiting_joints = ARRAY['shoulder_flex:128 vs min 140']) THEN bad := bad || ' WORST_RED limiting;'; END IF;
  IF bad <> '' THEN RAISE EXCEPTION 'FAIL:%', bad; END IF;
  RAISE NOTICE 'eligibility colour SQL: all 12 checks passed';
END $$;
