-- =====================================================================
-- PR #5 — Sport-aware RAG search
-- =====================================================================
-- Adds an overload of search_rombot_knowledge that filters by sport.
-- One-way model: callers pass the user's active sport; results include
-- rows where (sport = 'general' OR sport = p_sport).
--
-- The 3-arg version (existing) is unchanged for backward compat. Edge
-- functions will switch to the 4-arg version.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.search_rombot_knowledge(
  query_embedding vector,
  p_sport text,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  topic text,
  chunk text,
  source_citation text,
  sport text,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    rk.id,
    rk.topic,
    rk.chunk,
    rk.source_citation,
    rk.sport,
    1 - (rk.embedding <=> query_embedding) AS similarity
  FROM public.rombot_knowledge rk
  WHERE rk.embedding IS NOT NULL
    AND 1 - (rk.embedding <=> query_embedding) > match_threshold
    AND (rk.sport = 'general' OR rk.sport = p_sport)
  ORDER BY rk.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

-- Lock down: invoker, revoke anon, grant authenticated + service_role
ALTER FUNCTION public.search_rombot_knowledge(vector, text, double precision, integer)
  SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.search_rombot_knowledge(vector, text, double precision, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_rombot_knowledge(vector, text, double precision, integer)
  TO authenticated, service_role;

COMMIT;

-- =====================================================================
-- ROLLBACK:
--   DROP FUNCTION public.search_rombot_knowledge(vector, text, double precision, integer);
-- =====================================================================
