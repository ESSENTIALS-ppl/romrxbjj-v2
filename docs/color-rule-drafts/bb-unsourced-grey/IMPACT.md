# Bodybuilding grey-out: what changes, what Jim must decide, risks (prepared branch, Oct 4 2026, 8 AM ET)

Status: DRAFT only. Nothing merged, deployed or applied to any database. Jim has not decided.
Branch: draft/bb-unsourced-grey-20261004 (built on PR #74, branch color-server-draft, head 6ca84ae).
Source: Quinn's BB peer review (Notion "BB lift ROM evidence (peer-reviewed), Oct 3" and her per-number CSV).

## What the branch does (plain English)
- Quinn checked all 499 Bodybuilding ROM numbers. 442 (88.6%) have no published support. 57 match some paper, 32 directly comparable. 15 are SUPPORTED, 7 are CONTRADICTED (the app asks for MORE hip flexion than anyone in the papers reached, 100 to 115 degrees), 35 are partial / not comparable.
- The branch marks the 442 unsourced numbers (and the 7 contradicted ones) in a new small table, `rom_number_source_status`. The engine (compute-tiers and the SQL recompute function) then shows those joints GREY "no reference range yet", using the exact mechanism PR #74 added (`no_reference_range`). A real RED on a kept joint still wins. Nothing is ever shown GREEN or RED because of an unsourced number.
- The 50 numbers that are supported or partial are NOT greyed (Quinn: keep supported ones). The 449 greyed = 442 unsourced + 7 contradicted.
- The 7 contradicted are greyed, not corrected: Quinn only gives published PEAKS people reached (about 9, 30, 75, 80, 83, 87 degrees), not a sourced minimum, so there is no sourced replacement number to put in.
- No BB number in `techniques` is changed. A mark is tied to the number: if a number is later sourced or edited, the grey drops by itself.
- Important data fact: `rom_thresholds` has NO bodybuilding rows (594 rows, all BJJ). The 499 BB numbers live in `techniques.<joint>_min` (I matched them to Quinn's file by checksum: identical, all 499). That is why the marks sit in a new side table rather than in rom_thresholds.

## How many users' BB colors change (read-only counts, prod cqzvqzwwevnflinxgnpp, Oct 4)
- 36 users total; 8 have Bodybuilding turned on; 6 of those have an assessment; 8 users have BB color rows saved (8 x 274 moves = 2,192 rows).
- 245 BB moves have numbers, 29 forearm moves have none (already GREY today). 236 of the 245 would have at least one greyed number; 209 would have every number greyed; only 9 moves keep all numbers (high-bar, low-bar, glute-focus and smith back squats, full-depth bodyweight squat, close-grip bench, bench dip, parallel-bar dip, 45-degree back extension).
- Joints where the grey really changes a color (shoulder flexion 104, lumbar flexion 99, shoulder ER 86, lumbar extension 29 unsourced numbers): 212 moves. On today's saved colors that is 481 GREEN + 153 YELLOW rows (634 rows, 7 of the 8 users) that would turn GREY, and 1,062 RED rows that could turn GREY if the red came only from an unsourced number.
- Two groups where nothing visible changes under PR #74's current settings: (1) hip flexion (90 greyed numbers incl. all 7 contradicted): PR #74 colors hip flexion on every move from the Base straight-leg-raise norm (Youdas 2005), not from the move's number, so the greyed numbers do not drive the color; (2) ankle (41 greyed numbers): PR #74 already greys every ankle degree-style bar.
- Upper bound for the whole 1,888 saved rows on greyed moves: 733 GREEN/YELLOW + 1,155 RED. Real change will be smaller (see hip flexion note) and I did not re-run the new engine on real assessments (that needs a branch DB).
- Expected end state for a BB user: up to 236 of 274 moves GREY (or RED where a kept joint is low), 29 forearm moves GREY, and only the 9 fully-kept moves plus a few hip-flexion/ankle-only moves graded as today. In practice BB would show almost no GREEN.
- IMPORTANT: this only changes the server rows (`technique_eligibility`: coach views, ROMBot context, counts). The Bodybuilding app (romrx-bodybuilding-web: MyGame, ProgramGenerator) computes its own colors in the browser from `techniques.*_min` with a 90% / 75% rule and does NOT read `technique_eligibility`. So what a BB user sees in the app would NOT change from this branch. A client change is needed too (not done here).

## What Jim must decide
1. Go / no-go on greying 442 unsourced (Quinn's decision #2: grey/hide vs keep visible flagged "not yet sourced"). The branch implements grey.
2. The 7 contradicted: grey (as built) vs lower to published peaks vs keep as "house stretch targets" (Quinn #3). Quinn gave no sourced minimum, so correcting needs Jim or Quinn to pick numbers.
3. Hip flexion: keep Base straight-leg color for moves (as in PR #74; the unsourced hip numbers then do nothing) or let the mark win and grey it (switch `UNSOURCED_MARK_BEATS_SLR_OVERRIDE`, SQL `c_unsourced_beats_slr`, default off).
4. Label the beginner / intermediate / advanced ramp as a ROMRx house rule (Quinn #1). The copy for that is NOT in this branch.
5. Ankle unit (degrees vs cm; Quinn #4): the 41 unsourced ankle marks are inert while PR #74 keeps degree-style ankle bars grey, and become active if cm is confirmed.
6. Whether to do the same grey in the BB web client (needed for users to see it) and the wording of the grey label ("No reference range yet" is Legal's wording for PR #74).
7. Kept-but-weak numbers: 35 partial / not comparable numbers stay colored (Quinn: partial). Confirm.

## Risks
- Almost every BB move goes GREY: the BB product would look empty of green/yellow/red guidance. Also hits BB program generation if the client is later switched to the same rule (ProgramGenerator ranks by readiness).
- Mismatch risk: server says GREY while the BB app still says GREEN/YELLOW/RED (client untouched) until a client PR lands.
- Depends on PR #74 (GREY tier + status_reason check + shared SQL rule). Apply order: 20261003010000, 20261003020000, then 20261004010000, then deploy compute-tiers, then re-POST latest assessments. Deploying the engine before the migration is safe (the mark read is optional and logged), but the migration without the engine does nothing.
- The new migration replaces `recompute_user_eligibility` with a copy of PR #74's version plus one join. If #74 changes before it lands, regenerate (`gen_bb_unsourced_grey.py` copies from the 20261003020000 file).
- Peak-not-minimum caveat from Quinn applies to the 57 matched numbers too (the papers are what people reached, not a requirement).
- Small user base (8 BB users) so a rollback is cheap: rollback file restores PR #74's function and drops the table; re-POST assessments to restore colors.
- Not validated here: SQL parsed with pglast (syntax OK, including the plpgsql body) but not executed (no writes allowed); the unit tests (TypeScript) pass.
