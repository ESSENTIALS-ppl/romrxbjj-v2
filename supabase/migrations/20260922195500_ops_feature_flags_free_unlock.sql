-- TEMP Heavy audit free Unlock flag (Jim corrected 2026-09-22).
-- After cleanup residue 0: UPDATE ops.feature_flags SET enabled=false WHERE key=''free_unlock'';
CREATE TABLE IF NOT EXISTS ops.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON ops.feature_flags FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON ops.feature_flags TO service_role;
INSERT INTO ops.feature_flags (key, enabled, note)
VALUES (
  'free_unlock',
  true,
  'TEMP Heavy audit 20260922 — Avery sets false after residue 0 to restore Stripe paywall'
)
ON CONFLICT (key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    note = EXCLUDED.note,
    updated_at = now();
