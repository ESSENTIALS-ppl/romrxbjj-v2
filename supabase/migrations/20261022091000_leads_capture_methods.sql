-- NOT APPLIED. LOCAL DRAFT ONLY. Needs Jim's own typed OK before any apply (prod migration). Not part of batch 1021.
-- Capture-method marker for anonymous leads (Oct 22 2026). Run AFTER 20261022090000_capture_methods.sql.
-- Adds public.leads.capture_methods jsonb, NULLABLE, no default, no backfill (old leads stay NULL = unknown).
-- Same shape and CHECK as assessments.capture_methods. Keys whitelisted by submit-lead-assessment (ALLOWED_FIELDS).
-- Metadata only: no row is written, so no INSERT / UPDATE trigger fires and no email is sent. Refuses if an UPDATE
-- trigger exists on leads. Rollback: 20261022091000_leads_capture_methods.rollback.sql.txt.
DO $guard$
DECLARE v_bad text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'capture_methods') THEN
    RAISE EXCEPTION 'leads capture_methods: column already exists';
  END IF;
  SELECT string_agg(t.tgname, ', ') INTO v_bad
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'leads' AND NOT t.tgisinternal AND (t.tgtype & 16) <> 0;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'leads capture_methods: UPDATE trigger(s) on leads: %', v_bad;
  END IF;
END
$guard$;

ALTER TABLE public.leads ADD COLUMN capture_methods jsonb;
ALTER TABLE public.leads ADD CONSTRAINT leads_capture_methods_check CHECK (
  capture_methods IS NULL OR (
    jsonb_typeof(capture_methods) = 'object'
    AND NOT jsonb_path_exists(capture_methods, '$.* ? (@.type() != "string" || (@ != "lock" && @ != "fallback" && @ != "typed"))')
  )
);
COMMENT ON COLUMN public.leads.capture_methods IS
  'Per-field capture method: {field: lock|fallback|typed}. NULL = unknown (leads before Oct 22 2026 or older clients).';
