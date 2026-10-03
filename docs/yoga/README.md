# +Yoga (Range & Breath) backend draft

DRAFT. Nothing here is applied, deployed or enabled. Test mode only.

## Model (Jim)
1. List of poses: `yoga_poses` (159 poses + 10 prop variants, 4 levels Settle / Steady / Flow / Open; a level is a shelf, never a color or rank).
2. ROM requirement per pose: `yoga_pose_joints`, one row per pose and joint, like `rom_thresholds`. `required_value` is NULL until a named teacher signs it.
3. Apply the user's Base ROM to each pose: `compute-tiers/yoga_rule.ts` (pure) on top of the #74 rule. Pose color is the worst measured joint. No signed range, a joint Base cannot measure, or no joints = GREY "Not rated", never GREEN.
4. User-level features only, no coach (`has_coach_portal = false`).

## Files
| File | What |
|---|---|
| `supabase/migrations/20261003040000_yoga_poses.sql` | tables, constraints, RLS, `sport_config` row `yoga` with `is_active = false` |
| `supabase/migrations/20261003040000_yoga_poses.rollback.sql.txt` | rollback (refuses if a yoga entitlement or a signed range exists) |
| `scripts/yoga/load_yoga_poses.py` | CSV to SQL generator. Never connects to a database |
| `scripts/yoga/data/` | Quinn's CSV (515 rows) and the level map |
| `supabase/yoga-load/` | generated, UNAPPLIED load + rollback + number-free joint map + counts. Not in `migrations/`, so `db push` never sees it |
| `supabase/functions/compute-tiers/yoga_rule.ts` | pure pose color; not imported by `index.ts`, so compute-tiers v43 does not change |
| `scripts/yoga/sql_smoke.mjs` | runs migration, load, constraints, RLS and rollbacks in an in-memory Postgres (PGlite) |

## Tests
```
python3 -m unittest scripts/yoga/test_load_yoga_poses.py -v                       # loader (16)
cd supabase/functions/compute-tiers && npx esbuild test/yoga_rule.test.ts --bundle --platform=node --format=esm --outfile=/tmp/yoga_rule.test.mjs && node /tmp/yoga_rule.test.mjs
mkdir /tmp/pgl && cd /tmp/pgl && echo '{}' > package.json && npm i @electric-sql/pglite && cd - && PGLITE_BASE=/tmp/pgl/package.json node scripts/yoga/sql_smoke.mjs
```
Regenerate the load files after any CSV change: `python3 scripts/yoga/load_yoga_poses.py` (a unit test fails if the committed files are stale).

## Rules baked in
* No range number is loaded as a requirement. Quinn's 40 numeric cells are descriptive paper averages and go to `yoga_pose_evidence` (service role only), never a gate (Stacy section 10).
* DB check `yoga_pose_joints_signed_or_null`: a requirement needs a value above 0, a unit, `range_source = 'COACH-SET'`, a named signer and a date, or all five are NULL.
* DB check `yoga_pose_joints_ankle_cm`: an ankle range can only be in cm (Base stores knee-to-wall in cm, F-17).
* Reload never touches requirement columns, so a signed range survives. The load rollback refuses to run if one exists.
* Clients never read range numbers: column-level SELECT excludes `required_value` and `required_unit`; evidence has no client access.
* Disabled: read policies need `sport_config.yoga.is_active` AND an active `sport_entitlements` row for `yoga`. Both are false today.

## Order to turn it on (each step needs Jim's yes; none is done here)
1. Apply the migration (after #74 / #78 ship Thu Oct 8). 2. Apply the load. 3. Teacher signs ranges (UPDATE with signer and date). 4. Add `yoga` to the stripe-webhook `pending_sport` whitelist (lines ~377, ~586 accept only bjj and bodybuilding) and create a Stripe TEST product. 5. Flip `is_active`.
