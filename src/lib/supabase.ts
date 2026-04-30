// ROMRx Supabase client
// Replace SUPABASE_URL + SUPABASE_ANON_KEY with your project values
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = typeof process !== 'undefined'
  ? process.env.SUPABASE_URL ?? ''
  : (window as unknown as Record<string,string>).__SUPABASE_URL ?? ''

const SUPABASE_ANON_KEY = typeof process !== 'undefined'
  ? process.env.SUPABASE_ANON_KEY ?? ''
  : (window as unknown as Record<string,string>).__SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ---- AI Chat helpers ----
export async function sendAIMessage(
  message: string,
  conversationId?: string,
  sport = 'bjj'
): Promise<{ reply: string; conversation_id: string; provider: string }> {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { message, conversation_id: conversationId, sport }
  })
  if (error) throw error
  return data
}

export async function getConversations(sport?: string) {
  let q = supabase.from('ai_conversations').select('*').order('updated_at', { ascending: false })
  if (sport) q = q.eq('sport', sport)
  return q
}

export async function getMessages(conversationId: string) {
  return supabase.from('ai_messages')
    .select('role, content, created_at, tokens_used')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
}

export async function getUserAIPrefs() {
  return supabase.from('user_ai_preferences').select('*').maybeSingle()
}

export async function setUserAIPrefs(prefs: { provider: string; model?: string; api_key_enc?: string }) {
  return supabase.from('user_ai_preferences').upsert(prefs, { onConflict: 'user_id' })
}
