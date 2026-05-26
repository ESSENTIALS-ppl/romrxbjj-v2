-- Migration: Port v1 assessment data for Jim Scott + Jennifer Oliver
-- Source: GAS profile API (romrxbjj.com), assessed Feb 2026
-- cervical_rot_l/r: combined GAS value split 50/50
-- thoracic_rot: 0 (not measured in v1)
-- compute-tiers called manually post-insert (webhook not triggered by migration inserts)
-- Date: 2026-05-26

-- Results after compute-tiers:
--   Jim Scott:      52 techniques — 25 GREEN / 11 YELLOW / 16 RED / 2 DELAY_TECHNIQUE
--   Jennifer Oliver: 52 techniques — 36 GREEN / 9 YELLOW / 7 RED / 1 DELAY_TECHNIQUE

INSERT INTO public.assessments (
  id, user_id, athlete_id,
  hip_er_l, hip_er_r, hip_ir_l, hip_ir_r,
  hip_abd_l, hip_abd_r, hip_flex_l, hip_flex_r,
  shoulder_er_l, shoulder_er_r, shoulder_flex_l, shoulder_flex_r,
  ankle_df_l, ankle_df_r,
  lumbar_flex, lumbar_ext, cervical_rot_l, cervical_rot_r, thoracic_rot,
  assessed_at, created_at
)
VALUES
  (
    'eeee0001-0001-0001-0001-000000000001'::uuid,
    'f4666e12-ab43-4182-a90e-ffb3c04bde40'::uuid,  -- Jim Scott
    '4a3fd810-3901-4556-99ed-08a9316d163f'::uuid,
    41, 40, 24, 30,
    71, 40, 62, 100,
    10, 70, 162, 150,
    12.7, 10,
    28, 16, 3, 3, 0,
    '2026-02-14T00:00:00Z', now()
  ),
  (
    'eeee0002-0002-0002-0002-000000000002'::uuid,
    '40d8c9de-7bf8-4518-98ca-2bc000c4f2fd'::uuid,  -- Jennifer Oliver
    '29a07e2b-2534-4514-9fb9-b676e99bc71d'::uuid,
    62, 50, 42, 44,
    38, 45, 134, 128,
    90, 90, 138, 140,
    10, 10,
    70, 35, 35.5, 35.5, 0,
    '2026-02-27T00:00:00Z', now()
  )
ON CONFLICT (id) DO NOTHING;
