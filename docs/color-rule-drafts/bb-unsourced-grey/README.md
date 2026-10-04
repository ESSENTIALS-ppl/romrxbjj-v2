# BB unsourced grey (DRAFT, not applied, Jim has not decided)
- `bb-unsourced-grey-list.csv` all 499 BB numbers from Quinn's per-number file with action grey|keep (449 grey = 442 unsourced + 7 contradicted; 50 keep).
- `gen_bb_unsourced_grey.py <quinn-per-number-499.csv>` regenerates the list, `supabase/migrations/20261004010000_bb_unsourced_grey.sql` and its rollback. Idempotent output.
- `IMPACT.md` plain-English impact, decisions, risks. `quinn-bb-peer-review-report-20261003.md` Quinn's report.
- Engine: `supabase/functions/compute-tiers/rule.ts` (UNSOURCED_GREY_SWITCH, UNSOURCED_MARK_BEATS_SLR_OVERRIDE), tests in `test/unsourced_grey.test.ts`.
