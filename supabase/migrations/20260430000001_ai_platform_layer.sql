-- ============================================================
-- ROMRx AI Platform — Schema Migration
-- Adds multi-LLM AI layer + multi-vertical support
-- ============================================================

-- 1. Add platforms array to users (e.g. ['bjj', 'bodybuilding'])
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS platforms TEXT[] NOT NULL DEFAULT ARRAY['bjj']::TEXT[];

-- 2. Add sport column to techniques (future multi-vertical)
ALTER TABLE public.techniques
  ADD COLUMN IF NOT EXISTS sport TEXT NOT NULL DEFAULT 'bjj';

CREATE INDEX IF NOT EXISTS idx_techniques_sport ON public.techniques (sport);

-- 3. user_ai_preferences — which AI provider + optional key
CREATE TABLE IF NOT EXISTS public.user_ai_preferences (
  id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL DEFAULT 'rombot'
                  CHECK (provider IN ('rombot','openai','anthropic','google','perplexity')),
  model           TEXT,
  api_key_enc     TEXT,  -- encrypted at app level; NULL = use ROMRx key
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_ai_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own AI prefs"
  ON public.user_ai_preferences
  FOR ALL USING (auth.uid() = user_id);

-- 4. ai_conversations — one per user per session/thread
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sport           TEXT NOT NULL DEFAULT 'bjj',
  title           TEXT,  -- auto-generated from first message
  provider        TEXT NOT NULL DEFAULT 'rombot',
  model           TEXT,
  context_snapshot JSONB,  -- snapshot of user's ROM data at start of convo
  message_count   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own conversations"
  ON public.ai_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations (user_id, updated_at DESC);

-- 5. ai_messages — individual turns in a conversation
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  tokens_used     INT,
  latency_ms      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own messages"
  ON public.ai_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_messages_convo ON public.ai_messages (conversation_id, created_at ASC);

-- 6. rombot_knowledge — curated ROM research chunks for RAG
CREATE TABLE IF NOT EXISTS public.rombot_knowledge (
  id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  sport           TEXT NOT NULL DEFAULT 'bjj',
  topic           TEXT NOT NULL,
  chunk           TEXT NOT NULL,
  source_citation TEXT,
  tags            TEXT[],
  embedding       VECTOR(1536),  -- requires pgvector; null OK until enabled
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS on knowledge — read-only reference data
ALTER TABLE public.rombot_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read knowledge"
  ON public.rombot_knowledge
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_rombot_knowledge_sport ON public.rombot_knowledge (sport, topic);

-- 7. ai_research_cache — dedup expensive AI research responses
CREATE TABLE IF NOT EXISTS public.ai_research_cache (
  id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  query_hash      TEXT UNIQUE NOT NULL,
  query_text      TEXT NOT NULL,
  response        TEXT NOT NULL,
  model           TEXT,
  sport           TEXT NOT NULL DEFAULT 'bjj',
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Updated_at trigger helper (reusable)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER set_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_ai_prefs_updated_at ON public.user_ai_preferences;
CREATE TRIGGER set_user_ai_prefs_updated_at
  BEFORE UPDATE ON public.user_ai_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Increment conversation message count on insert
CREATE OR REPLACE FUNCTION public.increment_message_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.ai_conversations
  SET message_count = message_count + 1, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ai_message_inserted ON public.ai_messages;
CREATE TRIGGER on_ai_message_inserted
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW EXECUTE FUNCTION public.increment_message_count();
