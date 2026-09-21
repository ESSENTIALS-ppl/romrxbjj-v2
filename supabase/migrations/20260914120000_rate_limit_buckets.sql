-- Sprint 8 table-backed rate limits (LIVE applied 2026-09-14 on cqzvqzwwevnflinxgnpp).
-- Git sync only — do not re-apply if rate_limit_buckets / rate_limit_hit already exist.

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  hit_count int NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key text, p_limit integer, p_window_ms bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_row public.rate_limit_buckets%ROWTYPE;
  v_reset timestamptz;
  v_remaining int;
BEGIN
  v_reset := v_now + (p_window_ms || ' milliseconds')::interval;
  INSERT INTO public.rate_limit_buckets(bucket_key, hit_count, reset_at)
  VALUES (p_key, 0, v_reset)
  ON CONFLICT (bucket_key) DO NOTHING;

  SELECT * INTO v_row FROM public.rate_limit_buckets WHERE bucket_key = p_key FOR UPDATE;

  IF v_row.reset_at <= v_now THEN
    v_row.hit_count := 0;
    v_row.reset_at := v_reset;
  END IF;

  IF v_row.hit_count >= p_limit THEN
    UPDATE public.rate_limit_buckets SET hit_count = v_row.hit_count, reset_at = v_row.reset_at WHERE bucket_key = p_key;
    RETURN jsonb_build_object(
      'allowed', false,
      'limit', p_limit,
      'remaining', 0,
      'reset_at', floor(extract(epoch from v_row.reset_at)*1000)
    );
  END IF;

  v_row.hit_count := v_row.hit_count + 1;
  UPDATE public.rate_limit_buckets SET hit_count = v_row.hit_count, reset_at = v_row.reset_at WHERE bucket_key = p_key;
  v_remaining := GREATEST(0, p_limit - v_row.hit_count);
  RETURN jsonb_build_object(
    'allowed', true,
    'limit', p_limit,
    'remaining', v_remaining,
    'reset_at', floor(extract(epoch from v_row.reset_at)*1000)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer, bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, bigint) TO service_role;
