# Per-pack percent: proposal (one page). DRAFT, behind a flag, default OFF. Jim has not said yes to counting.
Oct 3 2026. Code: romrxbjj-v2 #74 (branch color-server-draft), `compute-tiers/pack_rating.ts`. Flag: env `PACK_PERCENT_ENABLED=true` (default off); nothing is persisted or shown today.

## What it is
For one sport pack: "percent of this sport's moves you can do", from the per-move colors. Output: `{pct, can_do, almost, scored, total, not_rated}` (plus `no_rule`, `needs_test`, and the text "scored 45 of 124 moves").
- can_do = moves where every needed joint is GREEN. almost = moves that are YELLOW, shown separately.
- scored (the denominator) = moves that can be fully scored: a rule exists AND every needed joint is measured. GREY moves are OUT of the denominator in both options.
- pct = can_do / scored, rounded. If scored is 0, pct is empty (no number shown).

## Two counting options (Jim picks; one constant `PACK_PERCENT_MODE`)
| | Quinn REC (default in code): `green_only` | Grant alt: `yellow_half` |
|---|---|---|
| YELLOW moves | not counted in pct, shown as "almost" | count as half |
| Why | A percent that means "can do" should only count moves where nothing is limiting. Simple to explain. | Rewards being close; the number moves sooner after a retest. Harder to explain ("half a move"). |
| Worked example (12 GREEN, 18 YELLOW, 15 RED of 45 scored) | 12 / 45 = 27% | (12 + 9) / 45 = 47% |
Third path, "not at all": show only the counts ("12 can do, 18 almost, of 45 scored") with no percent. Safest wording-wise; loses the single headline number.

## What the app shows today vs this
- Today (Base ring and sport apps): one blended 0-100 score from joint scores, labeled ELITE 85+, STRONG 70+, DEVELOPING 55+, RESTRICTED 40+, AT RISK below (MyBody/ResultsPreview/Settings). It averages joints and has nothing to do with which moves you can do. A move list shows GREEN/YELLOW/RED per move, and until v43 a move with no rule or an unmeasured joint showed GREEN.
- New (flag on): a percent plus "scored X of Y moves". Unmeasured and no-rule moves show "Not rated" instead of counting for or against you. It would sit next to the per-move chips, not replace the ring until Jim decides. No shared AT RISK / ELITE label for the whole user.

## Honest limits (from Quinn's reference run, default flat 10, after the 397 load)
- Few moves are fully scoreable today for BJJ: 45 of 124 (the rest need a test Base does not have: hip extension, cervical rotation, degree ankle, or have no rule). BB 245 of 274. Yoga: 0 real (no signed requirements). So BJJ percent is a percent of about a third of the pack.
- Same person, big swings: Typical man 40: BJJ 27%, BB 64%. Flexible woman 28: BJJ 87%, BB 88%. Tight hips man 45: BJJ 7%, BB 33%.
- A RED move that also has an unmeasured joint is not in the denominator (literal rule). Alt in Quinn's file: count it (changes the typical-man BJJ number from 27% to 18%). Open.
- Hip flexion moves take the straight-leg color (pending Jim), and sex is missing for 31 of 35 users, so with the default policy those moves are Not rated for most people and the percent is mostly "scored" moves without hip flexion.

## Questions for Jim
1. Count at all? 2. GREEN only, YELLOW half, or counts only? 3. Show "scored X of Y" always? 4. Does it replace the ring or sit beside it?
