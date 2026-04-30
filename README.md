# ROMRxBJJ v2

Supabase-native rebuild of ROMRxBJJ. Migrating from Google Apps Script (v1) to Supabase + Edge Functions + AI layer.

**Supabase project:** `cqzvqzwwevnflinxgnpp` (romrxbjj-v2, us-east-1)
**v1 status:** Live at romrxbjj.com — 2 paying users, 16 assessments
**v2 status:** Schema deployed, AI layer added, seed data pending

## Stack
- **Database:** Supabase PostgreSQL 17 + RLS
- **Auth:** Supabase Auth (magic link)
- **Edge Functions:** Deno (compute-tiers, ai-chat, stripe-webhook)
- **AI:** Multi-provider — ROMBot (default), OpenAI, Anthropic, Google, Perplexity
- **Payments:** Stripe

## Setup
```bash
npm install -g supabase
supabase login
supabase link --project-ref cqzvqzwwevnflinxgnpp
supabase db push                          # applies pending migrations
supabase functions deploy compute-tiers
supabase functions deploy ai-chat
supabase functions deploy stripe-webhook
```

## Schema
| Table | Purpose |
|-------|---------|
| users | Athletes + coaches + admins, belt, platforms[], stripe_customer_id |
| assessments | ROM measurement log, all 14 joints bilateral |
| joint_scores | Per-joint GREEN/YELLOW/RED with asymmetry |
| technique_eligibility | Computed GREEN/YELLOW/RED per technique |
| techniques | 124 BJJ techniques with ROM thresholds |
| exercises | 84 prescribed exercises with video URLs |
| protocols | User's priority protocol linked to assessment |
| coaches / schools | Organizational hierarchy |
| **ai_conversations** | AI chat session per user per sport |
| **ai_messages** | Individual turns (user/assistant/system) |
| **user_ai_preferences** | Provider choice: rombot/openai/anthropic/google/perplexity |
| **rombot_knowledge** | Curated ROM research chunks for RAG |

## Views
| View | Purpose |
|------|---------|
| rombot_context | Full user context JSON for LLM injection — latest assessment + joint scores + technique summary + protocol |

## AI Architecture
See `supabase/functions/ai-chat/index.ts` for the full provider routing logic.
