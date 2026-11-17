# Held back from git (SEND-FLIP-PREP-20261116)
On disk only, all listed with shas in SHA256SUMS-PREP.
- Address rule (contain sport-pack sender addresses other than hello@romrx.io, reid@romrx.io, user@example.com):
  live-source/get_edge_function-lifecycle-emails.raw, live-source/lifecycle-emails-v4/source__email.ts,
  render/live-tree/lifecycle-emails/source/email.ts, render/render-output.json.
- Out of scope after the 8:03 PM ET change (rendering stopped; Vera already passed the text): the rest of render/
  (render.ts, client-render.ts, wordcheck.py, wordcheck.json, client-quickcheck-output.json, live-tree/), and the raw live byte copies
  live-source/get_edge_function-*.raw and live-source/{lifecycle-emails-v4,unsubscribe-v14,rombot-checkin-v1}/ (their per-file shas are in
  the committed *-meta.json).
