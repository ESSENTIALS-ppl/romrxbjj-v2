CREATE OR REPLACE FUNCTION public.current_terms_version()
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$ select '2026-10-19'::text $function$;
