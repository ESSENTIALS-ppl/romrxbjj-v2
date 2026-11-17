# BYTE MATCH: local render-v4/src vs get_edge_function deployed bytes

Written for SEND-SWITCH v4. Local files are a copy of the 7:58 PM ET Mon Nov 16 2026 live extracts.
get_edge_function sha256 values are from live-source/*-meta.json, produced from get_edge_function
on project cqzvqzwwevnflinxgnpp. This turn (canary investigation and this receipt) list_edge_functions
and get_edge_function returned the same versions, ezbr values, and updated_at (lifecycle-emails v4
updated 7:29:36 PM ET; rombot-checkin v1 updated 7:35:14 PM ET).

All 18 files MATCH. ezbr MATCH for both functions.

| function | ver | file | get_edge_function sha256 | local render-v4/src sha256 | match |
|---|---|---|---|---|---|
| lifecycle-emails | v4 | `source/index.ts` | `338fb541f43c3c6a7fd04ffea6abcdeb636d9b8fb67a4e1b89d7668fe026c049` | `338fb541f43c3c6a7fd04ffea6abcdeb636d9b8fb67a4e1b89d7668fe026c049` | MATCH |
| lifecycle-emails | v4 | `source/handler.ts` | `008e19471fe0b601c41d8b6b68082d86d1e31dfc6b401d7e6988acf0b162fec1` | `008e19471fe0b601c41d8b6b68082d86d1e31dfc6b401d7e6988acf0b162fec1` | MATCH |
| lifecycle-emails | v4 | `source/logic.ts` | `eea59ae68054e0de05fef21007edce38a6d999970ce31841a9563eaeb2697733` | `eea59ae68054e0de05fef21007edce38a6d999970ce31841a9563eaeb2697733` | MATCH |
| lifecycle-emails | v4 | `source/email.ts` | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` | MATCH |
| lifecycle-emails | v4 | `source/score.ts` | `00510174f310f69c997e0c47476f0ea75985c86cf02f0c383c5640eee9caaa87` | `00510174f310f69c997e0c47476f0ea75985c86cf02f0c383c5640eee9caaa87` | MATCH |
| lifecycle-emails | v4 | `_shared/mobility/mobilityBands.ts` | `bb76634e7385bcefdda143a82589e6a387c0de0890e121c0d5ddf7602119a738` | `bb76634e7385bcefdda143a82589e6a387c0de0890e121c0d5ddf7602119a738` | MATCH |
| lifecycle-emails | v4 | `_shared/mobility/lumbarFlag.ts` | `d1845820bf98d7825f5e8a170a4ee714a7e631140ecf75312ede9822ed33870c` | `d1845820bf98d7825f5e8a170a4ee714a7e631140ecf75312ede9822ed33870c` | MATCH |
| lifecycle-emails | v4 | `_shared/email_footer.ts` | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | MATCH |
| lifecycle-emails | v4 | `_shared/unsub_token.ts` | `96f0f2e3b9e123f632febe33d9911d8db95dbe014b09398dc46573fe1f1befd9` | `96f0f2e3b9e123f632febe33d9911d8db95dbe014b09398dc46573fe1f1befd9` | MATCH |
| lifecycle-emails | v4 | `source/deletion.ts` | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | MATCH |
| rombot-checkin | v1 | `source/index.ts` | `58b9a42531d4d69e123be5fa59b0b785f80aae93702ddd923964d61f399efa4b` | `58b9a42531d4d69e123be5fa59b0b785f80aae93702ddd923964d61f399efa4b` | MATCH |
| rombot-checkin | v1 | `source/handler.ts` | `b3546c05272882040108020aff6401fc4127ee08118fdd85cd8a12809f5eff39` | `b3546c05272882040108020aff6401fc4127ee08118fdd85cd8a12809f5eff39` | MATCH |
| rombot-checkin | v1 | `source/logic.ts` | `cd0a8d915a78664801e4b8c51e31c78a8442f333ea2834daea48870408830a0f` | `cd0a8d915a78664801e4b8c51e31c78a8442f333ea2834daea48870408830a0f` | MATCH |
| rombot-checkin | v1 | `source/copy.ts` | `58e445128654cf8a9c87cce179aed887ffe87ea43579848700ee1267809b110f` | `58e445128654cf8a9c87cce179aed887ffe87ea43579848700ee1267809b110f` | MATCH |
| rombot-checkin | v1 | `source/email.ts` | `a4bfb5df0786f5c37850e97208404005724e9b65de4b7ba5e7b289f5d54fee00` | `a4bfb5df0786f5c37850e97208404005724e9b65de4b7ba5e7b289f5d54fee00` | MATCH |
| rombot-checkin | v1 | `_shared/email_footer.ts` | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | MATCH |
| rombot-checkin | v1 | `_shared/unsub_token.ts` | `26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424` | `26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424` | MATCH |
| rombot-checkin | v1 | `source/deletion.ts` | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | MATCH |

ezbr_sha256:
- lifecycle-emails v4: `6714009f4b59627011083c51807fc4e38ead1492dc9fc3344e19af56986edb41` MATCH
- rombot-checkin v1: `fbad002179ca31898451e69b0b9a34c9add02a0ed0d09de83d7659553befdd19` MATCH
