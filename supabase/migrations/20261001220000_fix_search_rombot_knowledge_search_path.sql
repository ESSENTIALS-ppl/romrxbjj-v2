-- ROMBot RAG fix (2026-10-01).
-- Both search_rombot_knowledge overloads were pinned to search_path=public (p5 hygiene, 2026-09-15),
-- but the pgvector <=> operator lives in schema "extensions". Every call failed with
-- "operator does not exist: extensions.vector <=> extensions.vector"; ai-chat ignores the RPC error,
-- so no knowledge chunks (including the Not Medical Advice chunk) reached the model.
-- Fix: keep the pinned search_path (hardening intact) and add the extensions schema.
-- Rollback: ALTER FUNCTION ... SET search_path = public;
ALTER FUNCTION public.search_rombot_knowledge(extensions.vector, text, double precision, integer)
  SET search_path = public, extensions;
ALTER FUNCTION public.search_rombot_knowledge(extensions.vector, double precision, integer)
  SET search_path = public, extensions;
