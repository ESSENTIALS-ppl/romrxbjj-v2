// Auto-generated Supabase types
// Regenerate with: npm run types:gen
// Full types will be generated once seed data is applied

export type AIProvider = 'rombot' | 'openai' | 'anthropic' | 'google' | 'perplexity'
export type Belt = 'white' | 'blue' | 'purple' | 'brown' | 'black'
export type Tier = 'GREEN' | 'YELLOW' | 'RED'
export type PortalRole = 'athlete' | 'coach' | 'school' | 'admin'
export type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'canceled'

export interface User {
  id: string
  email: string
  full_name: string | null
  belt: Belt
  portal_role: PortalRole
  platforms: string[]
  subscription_status: SubscriptionStatus
  subscription_expiry: string | null
  stripe_customer_id: string | null
  school_id: string | null
  coach_id: string | null
  created_at: string
  updated_at: string
}

export interface AIConversation {
  id: string
  user_id: string
  sport: string
  title: string | null
  provider: AIProvider
  model: string | null
  context_snapshot: Record<string, unknown> | null
  message_count: number
  created_at: string
  updated_at: string
}

export interface AIMessage {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens_used: number | null
  latency_ms: number | null
  created_at: string
}
