-- DRAFT, NOT APPLIED. Hip scan item #23, Stacy's verdict (Oct 5 2026): retitle the ROMBot reference entry
-- "Hip Flexor Tightness and Guard Posture" to "Hip Flexor Length and Guard Posture" and swap "tight" for
-- "limited hip extension range". Text only; nothing else about the row changes.
-- The live row was read with a SELECT on 2026-10-05 (id 8f559b04-9bd5-4183-8f05-2ac391adf7b9, sport bjj).
-- The WHERE guard on the old topic makes this a no-op if the row was already edited or removed.
-- embedding is set to NULL so the row is re-embedded from the new text: after applying, run the
-- embed-knowledge function once with body {"sport":"bjj"} (it embeds rows whose embedding is NULL;
-- one OpenAI text-embedding-ada-002 call). Until that runs, ROMBot cannot retrieve this one row.
-- Rollback: 20261005200000_rombot_hip_flexor_length_wording.rollback.sql.txt (restores the old text; re-embed again).

UPDATE public.rombot_knowledge
SET topic = 'Hip Flexor Length and Guard Posture',
    chunk = $chunk$Limited hip extension range at the hip flexors, particularly the iliopsoas and rectus femoris, alters pelvic positioning in ways that degrade both standing posture and guard-play mechanics in BJJ. Anterior pelvic tilt resulting from limited hip extension range reduces glute activation during bridging and explosive hip escape movements. A cross-sectional study of BJJ practitioners found that athletes with a positive Thomas test (indicating limited hip extension range) had significantly weaker hip extension force and less effective bridge-and-roll escapes. Regular hip flexor stretching and posterior chain strengthening are essential components of a BJJ mobility program, especially for practitioners who sit at desks outside of training.$chunk$,
    embedding = NULL
WHERE id = '8f559b04-9bd5-4183-8f05-2ac391adf7b9'
  AND topic = 'Hip Flexor Tightness and Guard Posture';
