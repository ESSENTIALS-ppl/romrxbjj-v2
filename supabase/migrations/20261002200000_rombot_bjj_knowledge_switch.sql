-- DRAFT, NOT APPLIED. ROMBot BJJ knowledge switch (Quinn BJJ follow-up, 2026-10-02).
-- Purpose: let Jim turn off retrieval of the 20 sport='bjj' rombot_knowledge chunks (uncited stats, injury wording)
-- until they are rewritten, without a deploy. Default is switch OFF (flag false) = current behavior unchanged.
-- Scope: only rows with sport = 'bjj'. The 6 'general' chunks keep working for everyone. Bodybuilding is untouched.
-- Turn the switch on:  UPDATE ops.feature_flags SET enabled = true  WHERE key = 'rombot_bjj_knowledge_disabled';
-- Turn it off again:   UPDATE ops.feature_flags SET enabled = false WHERE key = 'rombot_bjj_knowledge_disabled';
-- Rollback of this migration: re-create the two search_rombot_knowledge functions without the NOT (...) clause
-- (previous bodies: 20261001220000_fix_search_rombot_knowledge_search_path.sql lineage),
-- then DROP FUNCTION public.rombot_bjj_knowledge_off();  DELETE FROM ops.feature_flags WHERE key = 'rombot_bjj_knowledge_disabled';
-- Validated 2026-10-02 inside a transaction that was rolled back (nothing applied): flag false -> bjj=20 general=6 rows returned;
-- flag true -> bjj=0 general=6; 3-arg overload with flag true -> bjj=0.

INSERT INTO ops.feature_flags (key, enabled, note)
VALUES ('rombot_bjj_knowledge_disabled', false,
        'true = ROMBot skips the sport=bjj knowledge chunks (until rewritten). Default false = current behavior.')
ON CONFLICT (key) DO NOTHING;

-- SECURITY DEFINER because search_rombot_knowledge is executable by authenticated, which cannot read ops.feature_flags.
CREATE OR REPLACE FUNCTION public.rombot_bjj_knowledge_off()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'ops'
AS $function$
  SELECT COALESCE((SELECT f.enabled FROM ops.feature_flags f WHERE f.key = 'rombot_bjj_knowledge_disabled'), false);
$function$;
REVOKE ALL ON FUNCTION public.rombot_bjj_knowledge_off() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rombot_bjj_knowledge_off() TO authenticated, service_role;

-- 4-arg overload (the one ai-chat calls: query_embedding, p_sport, match_threshold, match_count)
CREATE OR REPLACE FUNCTION public.search_rombot_knowledge(query_embedding extensions.vector, p_sport text, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5)
 RETURNS TABLE(id uuid, topic text, chunk text, source_citation text, sport text, similarity double precision)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    rk.id, rk.topic, rk.chunk, rk.source_citation, rk.sport,
    1 - (rk.embedding <=> query_embedding) AS similarity
  FROM public.rombot_knowledge rk
  WHERE rk.embedding IS NOT NULL
    AND 1 - (rk.embedding <=> query_embedding) > match_threshold
    AND (rk.sport = 'general' OR rk.sport = p_sport)
    AND NOT (rk.sport = 'bjj' AND public.rombot_bjj_knowledge_off())
  ORDER BY rk.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

-- 3-arg overload (no sport filter; returns every sport, so the switch must cover it too)
CREATE OR REPLACE FUNCTION public.search_rombot_knowledge(query_embedding extensions.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5)
 RETURNS TABLE(id uuid, topic text, chunk text, source_citation text, similarity double precision)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    rk.id,
    rk.topic,
    rk.chunk,
    rk.source_citation,
    1 - (rk.embedding <=> query_embedding) AS similarity
  FROM public.rombot_knowledge rk
  WHERE rk.embedding IS NOT NULL
    AND 1 - (rk.embedding <=> query_embedding) > match_threshold
    AND NOT (rk.sport = 'bjj' AND public.rombot_bjj_knowledge_off())
  ORDER BY rk.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;
