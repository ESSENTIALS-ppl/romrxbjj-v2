-- =====================================================================
-- Seed rombot_knowledge for sport = general (ROMRx Base)
-- =====================================================================
-- Audit: zero general rows blocked Base RAG. Sport-aware search includes
-- rows where (sport = 'general' OR sport = p_sport). Embeddings filled
-- separately via embed-knowledge (text-embedding-ada-002, 1536-d) —
-- this migration inserts text only (embedding NULL), matching BB seed
-- pattern; do NOT invent sport technique chrome here.
-- Idempotent: delete+insert only the locked Base seed topic set.
-- =====================================================================

BEGIN;

DELETE FROM public.rombot_knowledge
WHERE sport = 'general'
  AND topic IN (
    'Base Mobility Bands Needs Focus Building Steady',
    'Base Overall Band From Worst Joint',
    'Base Assessment and Retest Cadence',
    'Base Daily Plan Protocol',
    'ROMBot Not Medical Advice',
    'Base vs Sport Packs'
  );

INSERT INTO public.rombot_knowledge (sport, topic, chunk, source_citation, tags) VALUES
(
  'general',
  'Base Mobility Bands Needs Focus Building Steady',
  'ROMRx Base uses three everyday mobility bands from joint_scores only: Needs focus (score 1), Building (score 2), and Steady (score 3). Chip shorthand may say Focus · Building · Steady. These bands describe mobility progress needed — not sport Position Readiness, and not GREEN/YELLOW/RED technique tiers. Never call a Base band AT RISK, RESTRICTED, or ELITE.',
  'ROMRx Base product — My Body / joint_scores (Sep 2026)',
  ARRAY['general','base','mobility_bands']::text[]
),
(
  'general',
  'Base Overall Band From Worst Joint',
  'On Base, overall mobility band equals the worst (lowest) measured joint_scores band across joints on file. If any joint is Needs focus, overall is Needs focus. If none are Needs focus but any are Building, overall is Building. Only when every measured joint is Steady is overall Steady. If there are no joint scores yet, overall is pending until the first assessment.',
  'ROMRx Base product — My Body / ROMBot CBase (Sep 2026)',
  ARRAY['general','base','overall_band']::text[]
),
(
  'general',
  'Base Assessment and Retest Cadence',
  'Start with an assessment from My Body: first-time users see No assessment on file and Get started (not Retest). After a saved assessment, use Retest now or Retest early. My Body may show Retest available now or Next retest with a date, plus the helper Retest every 6 weeks to track progress. Cadence is about 6 weeks (42 days from last assessed_at). Retest early is available when you want an updated snapshot sooner. Assessment path: https://romrx.io/app/onboarding/assessment',
  'ROMRx Base FAQ / Avery confirm soft lines (Sep 2026)',
  ARRAY['general','base','assessment','retest']::text[]
),
(
  'general',
  'Base Daily Plan Protocol',
  'After assessment, Base builds a priority mobility daily plan (protocol) from the person''s Needs focus and Building joints. When protocol rows are present, answer daily-plan questions from those exercises, sets, reps, and cues. If the plan is still pending generation, say so honestly — do not invent exercises or sport technique drills. Base daily plan is mobility work, not a sport game plan or lift program.',
  'ROMRx Base product — protocols / ROMBot CBase (Sep 2026)',
  ARRAY['general','base','daily_plan','protocol']::text[]
),
(
  'general',
  'ROMBot Not Medical Advice',
  'ROMBot provides educational information about ROMRx, the assessment, mobility bands, and the daily plan. It is not medical advice, diagnosis, treatment, or emergency triage. It is not a coach, doctor, or therapist. If someone asks about injury treatment, icing, medication, or pain management, refuse medical instructions and steer them to a clinician or emergency services when appropriate. Product copy: Not medical advice. ROMRx is a fitness and mobility tool, not medical diagnosis or treatment.',
  'ROMRx Terms §4 / Base legal FE / ROMBot disclosure (Sep 2026)',
  ARRAY['general','base','disclaimer','not_medical']::text[]
),
(
  'general',
  'Base vs Sport Packs',
  'Base is the general mobility product. Base results use Needs focus / Building / Steady. Sport packs (for example BJJ or bodybuilding) are separate add-ons on top of Base — they are not a different grade of Base, and Base is not sport Position Readiness or GREEN/YELLOW/RED technique readiness. If someone adds a sport pack later and cancels only that pack, they keep Base. Start with Base; add a sport pack only if they want that sport layer.',
  'ROMRx Base FAQ — Base vs sport packs (Sep 2026)',
  ARRAY['general','base','sport_packs']::text[]
);

COMMIT;
