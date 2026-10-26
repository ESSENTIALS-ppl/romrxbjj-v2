-- NOT APPLIED. LOCAL DRAFT ONLY. Needs Jim's own typed OK before any apply (prod migration). Not part of batch 1021 unless Jim adds it.
-- Capture-method marker per saved reading (Oct 22 2026). Run AFTER 20261021223000_lumbar_null_saved.sql.
-- Adds public.assessments.capture_methods jsonb, NULLABLE, no default, no backfill: old rows stay NULL (= unknown).
-- Shape: { "<assessment column, e.g. hip_er_l>": "lock" | "fallback" | "typed" }. Keys are whitelisted by the edge
-- functions (submit-assessment NUMERIC_FIELDS, submit-lead-assessment ALLOWED_FIELDS); the CHECK enforces the object
-- shape and the allowed values.
-- No row is written: ADD COLUMN (nullable, no default) is metadata only, so no INSERT / UPDATE trigger fires and no email
-- or webhook can be sent. The guard refuses if any non-internal UPDATE trigger exists on assessments, as a second line.
-- Rollback: 20261022090000_capture_methods.rollback.sql.txt.
DO $guard$
DECLARE v_bad text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assessments' AND column_name = 'capture_methods') THEN
    RAISE EXCEPTION 'capture_methods: column already exists';
  END IF;
  SELECT string_agg(t.tgname, ', ') INTO v_bad
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'assessments' AND NOT t.tgisinternal AND (t.tgtype & 16) <> 0;  -- 16 = UPDATE
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'capture_methods: UPDATE trigger(s) on assessments: %', v_bad;
  END IF;
END
$guard$;

ALTER TABLE public.assessments ADD COLUMN capture_methods jsonb;
ALTER TABLE public.assessments ADD CONSTRAINT assessments_capture_methods_check CHECK (
  capture_methods IS NULL OR (
    jsonb_typeof(capture_methods) = 'object'
    AND NOT jsonb_path_exists(capture_methods, '$.* ? (@.type() != "string" || (@ != "lock" && @ != "fallback" && @ != "typed"))')
  )
);
COMMENT ON COLUMN public.assessments.capture_methods IS
  'Per-field capture method: {column: lock|fallback|typed}. NULL = unknown (rows before Oct 22 2026 or older clients).';
