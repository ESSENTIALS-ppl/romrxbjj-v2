# Held back from git (SEND-FLIP-PREP-20261116)

On disk only. Files listed with sha256 in SHA256SUMS-PREP-v4 stay hashed even when they are not committed.

- Address rule (contain sport-pack sender addresses other than hello@romrx.io, reid@romrx.io, user@example.com):
  live-source/get_edge_function-lifecycle-emails.raw, live-source/lifecycle-emails-v4/source__email.ts,
  render/live-tree/lifecycle-emails/source/email.ts, render/render-output.json,
  render-v4/src/ (the local copy of the deployed function files used for the v4 template render, including
  lifecycle-emails source/email.ts pack senders). Byte proof for those files is in
  render-v4/BYTE-MATCH-DEPLOYED-SOURCE-20261116.md (hashes only, committed).

- CANARY-READONLY-20261116.md (sha256 69872749c693e8eeac0cfdb8db354820e1f2829fbc96b82be1796948a91d9655):
  on-disk investigation notes, listed in SHA256SUMS-PREP-v4, not in the v4 evidence commit.

- Out of scope after the 8:03 PM ET change (rendering stopped; Vera already passed the text): the rest of render/
  (render.ts, client-render.ts, wordcheck.py, wordcheck.json, client-quickcheck-output.json, live-tree/), and the raw live byte copies
  live-source/get_edge_function-*.raw and live-source/{lifecycle-emails-v4,unsubscribe-v14,rombot-checkin-v1}/ (their per-file shas are in
  the committed *-meta.json).

- render-v4/RENDERED-RAW.json (sha256 6247dd1de44749bb7e85a686050bb80b958c9dfb7e50fc968ade12b88e9e544a):
  the machine JSON of the same local render. Held back because JSON string-escaping puts a backslash-n
  immediately before the allowed hello@ address, which a naive address grep can misread as a different address.
  The committed markdown render-v4/RENDERED-BASE-TEXT-20261116.md has the same text with real newlines.
